#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const reviewDirectory = path.join(rootDirectory, "artifacts", "review");
const repairDirectory = path.join(reviewDirectory, "repair");
const videoStagingDirectory = path.join(repairDirectory, ".video-staging");
const host = "127.0.0.1";
const phases = ["signal", "aperture", "need", "find", "test", "prove"];

// Exact narrative positions are part of the evidence contract. FIND is far enough
// through its act to expose the selection state; PROVE keeps both heading and the
// beginning of the record in-frame.
const phaseProgressTargets = Object.freeze({
  signal: 0.48,
  aperture: 0.68,
  need: 0.68,
  find: 0.84,
  test: 0.56,
  prove: 0.38,
});

const profiles = Object.freeze({
  desktop: {
    viewport: { width: 1440, height: 900 },
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      reducedMotion: "no-preference",
      colorScheme: "dark",
    },
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
      reducedMotion: "no-preference",
      colorScheme: "dark",
    },
  },
});

let previewProcess;
let previewLog = "";
let browser;
let shutdownPromise;

function npmProcess(args, options) {
  if (process.platform === "win32") {
    return spawn(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", ["npm", ...args].join(" ")],
      { ...options, windowsHide: true },
    );
  }

  return spawn("npm", args, options);
}

async function runNpm(args) {
  await new Promise((resolve, reject) => {
    const child = npmProcess(args, {
      cwd: rootDirectory,
      env: { ...process.env },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} exited with code ${code}.`));
    });
  });
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      server.close((error) => {
        if (error) reject(error);
        else if (port) resolve(port);
        else reject(new Error("Unable to reserve a production-preview port."));
      });
    });
  });
}

function startPreview(port) {
  const child = npmProcess(
    ["run", "preview", "--", "--host", host, "--port", String(port)],
    {
      cwd: rootDirectory,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const remember = (chunk) => {
    previewLog = `${previewLog}${chunk.toString()}`.slice(-20_000);
  };
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  child.once("error", (error) => remember(error.message));
  return child;
}

async function waitForPreview(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (previewProcess?.exitCode !== null) {
      throw new Error(
        `Production preview exited early (${previewProcess?.exitCode}).\n${previewLog}`,
      );
    }

    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The isolated preview is expected to refuse connections briefly.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}.\n${previewLog}`);
}

async function stopPreview() {
  if (!previewProcess?.pid || previewProcess.exitCode !== null) return;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const child = spawn(
        "taskkill",
        ["/pid", String(previewProcess.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true },
      );
      child.once("error", resolve);
      child.once("exit", resolve);
    });
    return;
  }

  previewProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => previewProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (previewProcess.exitCode === null) previewProcess.kill("SIGKILL");
}

async function shutdown() {
  if (!shutdownPromise) {
    shutdownPromise = Promise.allSettled([
      browser?.close(),
      stopPreview(),
    ]);
  }
  await shutdownPromise;
}

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function sourceHead() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: rootDirectory,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return "unavailable";
  }
}

async function baselineRecords() {
  const names = [
    ...phases.map((phase) => `desktop-${phase}.jpg`),
    ...phases.map((phase) => `mobile-${phase}.jpg`),
    "reduced-motion-aperture.jpg",
    "no-webgl-aperture.jpg",
  ];

  return Promise.all(names.map(async (name) => {
    const filePath = path.join(reviewDirectory, name);
    const bytes = await readFile(filePath);
    return {
      file: relative(filePath),
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
  }));
}

function monitorPage(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function preparePage(page, url, { freezeTransitions = true } = {}) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.js === "true");

  if (await page.locator("astro-dev-toolbar").count()) {
    throw new Error(
      "Refusing to capture a development server: astro-dev-toolbar was detected.",
    );
  }

  await page.addStyleTag({
    content: freezeTransitions
      ? `html { scroll-behavior: auto !important; }
         *, *::before, *::after {
           animation-delay: 0s !important;
           animation-duration: 0s !important;
           transition-delay: 0s !important;
           transition-duration: 0s !important;
         }`
      : "html { scroll-behavior: auto !important; }",
  });
}

async function positionAt(page, phase, target) {
  const desiredScroll = await page.evaluate(({ requestedPhase, requestedTarget }) => {
    const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
    if (!(section instanceof HTMLElement)) {
      throw new Error(`Missing section for ${requestedPhase}.`);
    }

    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const bounds = section.getBoundingClientRect();
    const absoluteTop = bounds.top + window.scrollY;
    const denominator = Math.max(bounds.height, viewportHeight);
    const maximum = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);
    const desired = Math.min(
      maximum,
      Math.max(0, absoluteTop + requestedTarget * denominator - marker),
    );
    window.scrollTo(0, desired);
    window.dispatchEvent(new Event("scroll"));
    return desired;
  }, { requestedPhase: phase, requestedTarget: target });

  await page.waitForFunction(
    ({ requestedPhase, requestedTarget }) => {
      const root = document.documentElement;
      const actual = Number.parseFloat(
        root.style.getPropertyValue("--active-progress") || "-1",
      );
      return root.dataset.activePhase === requestedPhase
        && Math.abs(actual - requestedTarget) <= 0.012;
    },
    { requestedPhase: phase, requestedTarget: target },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  return desiredScroll;
}

async function assertStateComposition(page, phase) {
  if (phase === "find") {
    const findStep = await page.locator("html").getAttribute("data-find-step");
    if (findStep !== "selection") {
      throw new Error(`FIND capture must be at selection; received ${findStep}.`);
    }
  }

  if (phase === "prove") {
    const visibility = await page.evaluate(() => {
      const heading = document.querySelector("#prove-title");
      const record = document.querySelector(".proof-record");
      if (!(heading instanceof HTMLElement) || !(record instanceof HTMLElement)) {
        return { heading: false, record: false };
      }
      const headingBox = heading.getBoundingClientRect();
      const recordBox = record.getBoundingClientRect();
      return {
        heading: headingBox.bottom > 0 && headingBox.top < window.innerHeight,
        record: recordBox.bottom > 0 && recordBox.top < window.innerHeight,
      };
    });
    if (!visibility.heading || !visibility.record) {
      throw new Error(
        `PROVE must show headline and Proof Record: ${JSON.stringify(visibility)}.`,
      );
    }
  }
}

async function captureFrame({
  page,
  profile,
  phase,
  mode,
  sourceCommit,
}) {
  const targetProgress = phaseProgressTargets[phase];
  const scrollY = await positionAt(page, phase, targetProgress);
  await assertStateComposition(page, phase);

  const state = await page.evaluate(() => ({
    activePhase: document.documentElement.dataset.activePhase ?? "unknown",
    renderMode: document.documentElement.dataset.renderMode ?? "unknown",
    findStep: document.documentElement.dataset.findStep ?? null,
    actualProgress: Number.parseFloat(
      document.documentElement.style.getPropertyValue("--active-progress") || "0",
    ),
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }));

  const expectedViewport = profiles[profile].viewport;
  if (
    state.viewport.width !== expectedViewport.width
    || state.viewport.height !== expectedViewport.height
  ) {
    throw new Error(
      `Unexpected ${profile} viewport: ${state.viewport.width}x${state.viewport.height}; `
        + `expected ${expectedViewport.width}x${expectedViewport.height}.`,
    );
  }

  const suffix = mode === "normal" ? "" : `-${mode}`;
  const filePath = path.join(repairDirectory, `${profile}-${phase}${suffix}.png`);
  const bytes = await page.screenshot({
    path: filePath,
    type: "png",
    fullPage: false,
    animations: "disabled",
  });
  const timestamp = new Date().toISOString();

  return {
    file: relative(filePath),
    profile,
    mode,
    viewport: state.viewport,
    activePhase: state.activePhase,
    renderMode: state.renderMode,
    findStep: state.findStep,
    targetProgress,
    actualProgress: state.actualProgress,
    scrollY: Math.round(scrollY),
    sha256: sha256(bytes),
    bytes: bytes.length,
    timestamp,
    sourceHead: sourceCommit,
  };
}

function assertBaselinesUnchanged(before, after) {
  const afterByFile = new Map(after.map((record) => [record.file, record.sha256]));
  const changed = before.filter(
    (record) => afterByFile.get(record.file) !== record.sha256,
  );
  if (changed.length) {
    throw new Error(
      `Baseline evidence changed during capture: ${changed.map((item) => item.file).join(", ")}`,
    );
  }
}

async function captureNormalProfile(baseUrl, profile, sourceCommit) {
  const definition = profiles[profile];
  const context = await browser.newContext(definition.context);
  const page = await context.newPage();
  const errors = monitorPage(page);

  // A genuine touch context follows the normal URL and remains on the authored
  // DOM/CSS path because realtime enhancement is reserved for fine pointers.
  await preparePage(page, `${baseUrl}/`);

  if (profile === "desktop") {
    await page.mouse.move(
      Math.round(definition.viewport.width * 0.68),
      Math.round(definition.viewport.height * 0.46),
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.renderMode === "webgl-enhanced",
      undefined,
      { timeout: 10_000 },
    );
  }

  const captures = [];
  for (const phase of phases) {
    captures.push(await captureFrame({
      page,
      profile,
      phase,
      mode: "normal",
      sourceCommit,
    }));
  }

  await context.close();
  if (errors.length) {
    throw new Error(`Application errors during ${profile} capture:\n${errors.join("\n")}`);
  }
  return captures;
}

async function captureApertureFallback(baseUrl, mode, sourceCommit) {
  const context = await browser.newContext({
    ...profiles.desktop.context,
    ...(mode === "reduced-motion" ? { reducedMotion: "reduce" } : {}),
  });
  const page = await context.newPage();
  const errors = monitorPage(page);
  const query = mode === "reduced-motion" ? "motion=reduce" : "webgl=off";
  await preparePage(page, `${baseUrl}/?${query}`);
  const capture = await captureFrame({
    page,
    profile: "desktop",
    phase: "aperture",
    mode,
    sourceCommit,
  });
  await context.close();
  if (errors.length) {
    throw new Error(`Application errors during ${mode} capture:\n${errors.join("\n")}`);
  }
  return capture;
}

async function targetScrollY(page, phase) {
  return page.evaluate(({ requestedPhase, requestedTarget }) => {
    const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
    if (!(section instanceof HTMLElement)) throw new Error("Missing journey section.");
    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const bounds = section.getBoundingClientRect();
    return Math.min(
      document.documentElement.scrollHeight - viewportHeight,
      Math.max(
        0,
        bounds.top + window.scrollY
          + requestedTarget * Math.max(bounds.height, viewportHeight)
          - marker,
      ),
    );
  }, {
    requestedPhase: phase,
    requestedTarget: phaseProgressTargets[phase],
  });
}

async function animateScroll(page, destination, duration = 760) {
  await page.evaluate(({ destinationY, durationMs }) => new Promise((resolve) => {
    const start = window.scrollY;
    const delta = destinationY - start;
    const began = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - began) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start + delta * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  }), { destinationY: destination, durationMs: duration });
}

async function recordDesktopJourney(baseUrl, sourceCommit) {
  try {
    await mkdir(videoStagingDirectory, { recursive: true });
    const context = await browser.newContext({
      ...profiles.desktop.context,
      recordVideo: {
        dir: videoStagingDirectory,
        size: profiles.desktop.viewport,
      },
    });
    const page = await context.newPage();
    const errors = monitorPage(page);
    await preparePage(page, `${baseUrl}/`, { freezeTransitions: false });
    await page.mouse.move(979, 414);
    await page.waitForFunction(
      () => document.documentElement.dataset.renderMode === "webgl-enhanced",
      undefined,
      { timeout: 10_000 },
    );
    const video = page.video();

    for (const phase of phases) {
      const destination = await targetScrollY(page, phase);
      await animateScroll(page, destination);
      if (phase === "aperture") {
        await page.mouse.move(820, 360, { steps: 12 });
        await page.mouse.move(1080, 510, { steps: 16 });
      }
      await page.waitForTimeout(380);
    }

    await context.close();
    if (errors.length) throw new Error(errors.join("\n"));
    if (!video) throw new Error("Playwright did not provide a video artifact.");

    const stagedPath = await video.path();
    const finalPath = path.join(repairDirectory, "desktop-journey.webm");
    try {
      await unlink(finalPath);
    } catch {
      // A previous optional recording may not exist.
    }
    await rename(stagedPath, finalPath);
    const bytes = await readFile(finalPath);
    return {
      status: "captured",
      file: relative(finalPath),
      viewport: profiles.desktop.viewport,
      sha256: sha256(bytes),
      bytes: bytes.length,
      timestamp: new Date().toISOString(),
      sourceHead: sourceCommit,
    };
  } catch (error) {
    return {
      status: "skipped",
      reason: error instanceof Error ? error.message : String(error),
      sourceHead: sourceCommit,
    };
  }
}

async function main() {
  await mkdir(repairDirectory, { recursive: true });
  const sourceCommit = await sourceHead();
  const baselines = await baselineRecords();

  const externalBaseUrl = process.env.REPAIR_EVIDENCE_BASE_URL?.replace(/\/$/, "");
  let baseUrl = externalBaseUrl;
  if (!baseUrl) {
    if (process.env.REPAIR_EVIDENCE_SKIP_BUILD !== "1") {
      await runNpm(["run", "build"]);
    } else {
      await access(path.join(rootDirectory, "dist", "index.html"));
    }

    const port = await reservePort();
    baseUrl = `http://${host}:${port}`;
    previewProcess = startPreview(port);
    await waitForPreview(baseUrl);
  }

  browser = await chromium.launch({ headless: true });
  const captures = [
    ...await captureNormalProfile(baseUrl, "desktop", sourceCommit),
    ...await captureNormalProfile(baseUrl, "mobile", sourceCommit),
    await captureApertureFallback(baseUrl, "reduced-motion", sourceCommit),
    await captureApertureFallback(baseUrl, "no-webgl", sourceCommit),
  ];
  const video = process.env.REPAIR_EVIDENCE_VIDEO === "off"
    ? { status: "skipped", reason: "REPAIR_EVIDENCE_VIDEO=off", sourceHead: sourceCommit }
    : await recordDesktopJourney(baseUrl, sourceCommit);
  const baselinesAfterCapture = await baselineRecords();
  assertBaselinesUnchanged(baselines, baselinesAfterCapture);

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceHead: sourceCommit,
    source: externalBaseUrl ? "external-production-preview" : "isolated-astro-preview",
    baseUrl,
    phaseProgressTargets,
    baselinePolicy: "Original artifacts/review/*.jpg files are read and hashed only; never modified.",
    baselineIntegrity: "verified-unchanged-after-capture",
    baselines,
    captures,
    video,
  };
  await writeFile(
    path.join(repairDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`Repair evidence captured: ${captures.length} PNGs.`);
  console.log(`Manifest: ${relative(path.join(repairDirectory, "manifest.json"))}`);
  if (video.status !== "captured") console.warn(`Journey video skipped: ${video.reason}`);
}

process.once("SIGINT", () => void shutdown().finally(() => process.exit(130)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(143)));

try {
  await main();
} finally {
  await shutdown();
}
