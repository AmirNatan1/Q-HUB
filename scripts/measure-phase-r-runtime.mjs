#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(rootDirectory, "artifacts", "performance", "phase-r");
const reviewDirectory = path.join(rootDirectory, "artifacts", "review");
const astroCliPath = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");
const host = "127.0.0.1";
const stage = process.env.PHASE_R_RUNTIME_STAGE?.trim() || "baseline";
const allowedStages = new Set(["baseline", "candidate"]);
const profiles = Object.freeze([
  {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  },
  {
    name: "mobile",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  },
]);

let previewProcess;
let browser;
let shutdownPromise;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: rootDirectory,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.trim();
}

async function listFilesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFilesRecursively(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function historicalEvidenceInventory() {
  const files = (await listFilesRecursively(reviewDirectory))
    .filter((filePath) => {
      const local = path.relative(reviewDirectory, filePath);
      return local !== "phase-r" && !local.startsWith(`phase-r${path.sep}`);
    })
    .sort((left, right) => left.localeCompare(right));
  const inventory = await Promise.all(files.map(async (filePath) => {
    const bytes = await readFile(filePath);
    return { file: relative(filePath), bytes: bytes.length, sha256: sha256(bytes) };
  }));
  const digestInput = inventory
    .map((entry) => `${entry.file}\0${entry.sha256}\0${entry.bytes}`)
    .join("\n");
  return {
    count: inventory.length,
    bytes: inventory.reduce((sum, entry) => sum + entry.bytes, 0),
    digestAlgorithm: "sha256(file\\0sha256\\0bytes joined by newline, sorted by file)",
    digest: sha256(Buffer.from(digestInput)),
    inventory,
  };
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
        else reject(new Error("Unable to reserve a local preview port."));
      });
    });
  });
}

async function runNpm(args) {
  await new Promise((resolve, reject) => {
    const command = process.platform === "win32"
      ? process.env.ComSpec ?? "cmd.exe"
      : "npm";
    const commandArgs = process.platform === "win32"
      ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
      : args;
    const child = spawn(command, commandArgs, {
      cwd: rootDirectory,
      env: { ...process.env },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} exited with code ${code}.`));
    });
  });
}

function startPreview(port) {
  return spawn(
    process.execPath,
    [astroCliPath, "preview", "--host", host, "--port", String(port)],
    {
      cwd: rootDirectory,
      env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

async function waitForPreview(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (previewProcess?.exitCode !== null) {
      throw new Error(`Production preview exited before ready (${previewProcess?.exitCode}).`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Preview startup can briefly refuse connections.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopPreview() {
  if (!previewProcess?.pid || previewProcess.exitCode !== null) return;
  previewProcess.kill();
  await Promise.race([
    new Promise((resolve) => previewProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (previewProcess.exitCode === null && process.platform === "win32") {
    await new Promise((resolve) => {
      const child = spawn("taskkill", ["/pid", String(previewProcess.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      child.once("error", resolve);
      child.once("exit", resolve);
    });
  } else if (previewProcess.exitCode === null) {
    previewProcess.kill("SIGKILL");
  }
}

async function shutdown() {
  if (!shutdownPromise) {
    shutdownPromise = Promise.allSettled([browser?.close(), stopPreview()]);
  }
  await shutdownPromise;
}

function installRuntimeProbe() {
  const state = {
    active: false,
    startedAt: 0,
    stoppedAt: 0,
    lastFrameAt: 0,
    frameIntervals: [],
    longTasks: [],
    drawCallsByPhase: {},
    mediaSamplesByPhase: {},
    offscreenPlaybackSamples: [],
    memoryStart: null,
    memoryEnd: null,
    sampler: 0,
  };

  const memory = () => {
    const value = performance.memory;
    if (!value) return null;
    return {
      jsHeapSizeLimit: value.jsHeapSizeLimit,
      totalJSHeapSize: value.totalJSHeapSize,
      usedJSHeapSize: value.usedJSHeapSize,
    };
  };

  const phase = () => document.documentElement.dataset.activePhase ?? "unknown";

  const sampleMedia = () => {
    if (!state.active) return;
    const activePhase = phase();
    state.mediaSamplesByPhase[activePhase] ??= {
      samples: 0,
      playingSamples: 0,
      offscreenPlayingSamples: 0,
    };
    const phaseRecord = state.mediaSamplesByPhase[activePhase];
    for (const video of document.querySelectorAll("video")) {
      const bounds = video.getBoundingClientRect();
      const visible = bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < innerHeight
        && bounds.left < innerWidth
        && getComputedStyle(video).display !== "none"
        && getComputedStyle(video).visibility !== "hidden";
      const playing = !video.paused && !video.ended && video.readyState >= 2;
      phaseRecord.samples += 1;
      if (playing) phaseRecord.playingSamples += 1;
      if (playing && !visible) {
        phaseRecord.offscreenPlayingSamples += 1;
        state.offscreenPlaybackSamples.push({
          at: performance.now() - state.startedAt,
          phase: activePhase,
          mediaPhase: video.dataset.mediaPhase ?? null,
          currentSrc: video.currentSrc || null,
          bounds: {
            top: Math.round(bounds.top),
            right: Math.round(bounds.right),
            bottom: Math.round(bounds.bottom),
            left: Math.round(bounds.left),
          },
        });
      }
    }
  };

  const frame = (now) => {
    if (state.active) {
      if (state.lastFrameAt) state.frameIntervals.push(now - state.lastFrameAt);
      state.lastFrameAt = now;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  try {
    const observer = new PerformanceObserver((list) => {
      if (!state.active) return;
      for (const entry of list.getEntries()) {
        state.longTasks.push({
          startTime: entry.startTime - state.startedAt,
          duration: entry.duration,
          name: entry.name,
        });
      }
    });
    observer.observe({ type: "longtask", buffered: false });
  } catch {
    // Long Task API is optional; support is recorded by the empty result.
  }

  const originalDrawArrays = WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays = function patchedDrawArrays(...args) {
    if (state.active) {
      const activePhase = phase();
      state.drawCallsByPhase[activePhase] = (state.drawCallsByPhase[activePhase] ?? 0) + 1;
    }
    return originalDrawArrays.apply(this, args);
  };

  window.__phaseRRuntime = {
    start() {
      state.active = true;
      state.startedAt = performance.now();
      state.stoppedAt = 0;
      state.lastFrameAt = 0;
      state.frameIntervals.length = 0;
      state.longTasks.length = 0;
      state.drawCallsByPhase = {};
      state.mediaSamplesByPhase = {};
      state.offscreenPlaybackSamples.length = 0;
      state.memoryStart = memory();
      state.memoryEnd = null;
      state.sampler = window.setInterval(sampleMedia, 100);
    },
    stop() {
      state.active = false;
      state.stoppedAt = performance.now();
      if (state.sampler) clearInterval(state.sampler);
      state.sampler = 0;
      state.memoryEnd = memory();
      return structuredClone(state);
    },
  };
}

function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function frameSummary(intervals) {
  const sorted = [...intervals].filter(Number.isFinite).sort((a, b) => a - b);
  const round = (value) => value === null ? null : Math.round(value * 1000) / 1000;
  return {
    samples: sorted.length,
    p50Ms: round(quantile(sorted, 0.5)),
    p95Ms: round(quantile(sorted, 0.95)),
    p99Ms: round(quantile(sorted, 0.99)),
    over33_3Ms: sorted.filter((value) => value > 33.3).length,
    over50Ms: sorted.filter((value) => value > 50).length,
    maxMs: round(sorted.at(-1) ?? null),
  };
}

async function scrollTo(page, targetY, durationMs) {
  await page.evaluate(async ({ targetY: destination, durationMs: duration }) => {
    const start = window.scrollY;
    const delta = destination - start;
    const startedAt = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, start + delta * eased);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }, { targetY, durationMs });
}

async function checkpoint(page, expectedPhase) {
  await page.waitForFunction((phaseName) => (
    document.documentElement.dataset.activePhase === phaseName
  ), expectedPhase, { timeout: 8_000 });
  await page.waitForTimeout(280);
  return page.evaluate((phaseName) => {
    const canvas = document.querySelector("[data-signal-canvas]");
    const videos = Array.from(document.querySelectorAll("video")).map((video) => {
      const bounds = video.getBoundingClientRect();
      const visible = bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < innerHeight
        && bounds.left < innerWidth
        && getComputedStyle(video).display !== "none"
        && getComputedStyle(video).visibility !== "hidden";
      return {
        mediaPhase: video.dataset.mediaPhase ?? null,
        paused: video.paused,
        ended: video.ended,
        playing: !video.paused && !video.ended && video.readyState >= 2,
        visible,
        readyState: video.readyState,
        networkState: video.networkState,
        preload: video.preload,
        hasCurrentSource: Boolean(video.currentSrc),
      };
    });
    return {
      expectedPhase: phaseName,
      activePhase: document.documentElement.dataset.activePhase ?? null,
      renderMode: document.documentElement.dataset.renderMode ?? null,
      devicePixelRatio: window.devicePixelRatio,
      scrollY: Math.round(window.scrollY),
      canvas: canvas instanceof HTMLCanvasElement ? {
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        width: canvas.width,
        height: canvas.height,
        engine: canvas.dataset.engine ?? null,
      } : null,
      videos,
    };
  }, expectedPhase);
}

async function measureProfile(baseUrl, profile, browserVersion) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    hasTouch: profile.hasTouch,
    isMobile: profile.isMobile,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  await context.addInitScript(installRuntimeProbe);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });

  try {
    const response = await page.goto(new URL("/", baseUrl).toString(), { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`Homepage returned ${response?.status() ?? "no response"}.`);
    if (await page.locator("astro-dev-toolbar").count()) {
      throw new Error("Runtime measurement requires a production preview.");
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const phases = await page.locator("[data-experience-phase]").evaluateAll((sections) => (
      sections.map((section) => ({
        phase: section.getAttribute("data-experience-phase"),
        targetY: Math.max(0, Math.round(
          section.getBoundingClientRect().top
          + window.scrollY
          + section.getBoundingClientRect().height * 0.48
          - window.innerHeight * 0.48,
        )),
      })).filter((entry) => Boolean(entry.phase))
    ));
    if (!phases.length) throw new Error("No homepage experience phases were found.");

    await page.evaluate(() => window.__phaseRRuntime.start());
    if (!profile.hasTouch) {
      await page.mouse.move(profile.viewport.width * 0.64, profile.viewport.height * 0.44, { steps: 12 });
    }

    const checkpoints = [];
    for (const [index, entry] of phases.entries()) {
      if (index > 0 || entry.targetY > 0) {
        await scrollTo(page, entry.targetY, profile.name === "desktop" ? 760 : 640);
      }
      if (!profile.hasTouch && (index === 1 || index === Math.floor(phases.length / 2))) {
        await page.mouse.move(
          profile.viewport.width * (index === 1 ? 0.76 : 0.34),
          profile.viewport.height * (index === 1 ? 0.38 : 0.62),
          { steps: 18 },
        );
      }
      checkpoints.push(await checkpoint(page, entry.phase));
    }
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (windowIsFinite(maxScroll)) await scrollTo(page, maxScroll, profile.name === "desktop" ? 760 : 640);
    await page.waitForTimeout(320);
    const probe = await page.evaluate(() => window.__phaseRRuntime.stop());
    const durationMs = probe.stoppedAt - probe.startedAt;

    return {
      profile: profile.name,
      viewport: profile.viewport,
      configuredDeviceScaleFactor: profile.deviceScaleFactor,
      measuredDevicePixelRatio: checkpoints[0]?.devicePixelRatio ?? null,
      browserVersion,
      userAgent,
      durationMs: Math.round(durationMs * 1000) / 1000,
      journeyPhases: phases.map((entry) => entry.phase),
      frames: frameSummary(probe.frameIntervals),
      longTasks: {
        supported: typeof probe.longTasks !== "undefined",
        count: probe.longTasks.length,
        totalDurationMs: Math.round(probe.longTasks.reduce((sum, task) => sum + task.duration, 0) * 1000) / 1000,
        maxDurationMs: Math.round(Math.max(0, ...probe.longTasks.map((task) => task.duration)) * 1000) / 1000,
        entries: probe.longTasks,
      },
      errors,
      webglDrawCallsByPhase: probe.drawCallsByPhase,
      mediaSamplesByPhase: probe.mediaSamplesByPhase,
      offscreenVideoPlayback: {
        sampleCount: probe.offscreenPlaybackSamples.length,
        samples: probe.offscreenPlaybackSamples,
      },
      memory: {
        exposed: Boolean(probe.memoryStart && probe.memoryEnd),
        start: probe.memoryStart,
        end: probe.memoryEnd,
        usedJSHeapDelta: probe.memoryStart && probe.memoryEnd
          ? probe.memoryEnd.usedJSHeapSize - probe.memoryStart.usedJSHeapSize
          : null,
      },
      checkpoints,
    };
  } finally {
    await context.close();
  }
}

function windowIsFinite(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

async function assertOutputAvailable() {
  const targets = [
    path.join(outputDirectory, `${stage}-desktop.json`),
    path.join(outputDirectory, `${stage}-mobile.json`),
    path.join(outputDirectory, `${stage}-summary.json`),
  ];
  for (const target of targets) {
    try {
      await access(target);
      throw new Error(`Refusing to overwrite existing runtime evidence: ${relative(target)}.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Refusing")) throw error;
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
}

async function main() {
  if (!allowedStages.has(stage)) {
    throw new Error(`PHASE_R_RUNTIME_STAGE must be baseline or candidate; received ${stage}.`);
  }
  await mkdir(outputDirectory, { recursive: true });
  await assertOutputAvailable();
  const historicalEvidence = await historicalEvidenceInventory();
  const [sourceHead, branch, statusPorcelain] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  await runNpm(["run", "build"]);
  const port = await reservePort();
  const baseUrl = `http://${host}:${port}/`;
  previewProcess = startPreview(port);
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  const results = [];
  for (const profile of profiles) {
    const result = await measureProfile(baseUrl, profile, browserVersion);
    results.push(result);
    const target = path.join(outputDirectory, `${stage}-${profile.name}.json`);
    await writeFile(target, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  const historicalEvidenceAfter = await historicalEvidenceInventory();
  if (historicalEvidence.digest !== historicalEvidenceAfter.digest) {
    throw new Error("Historical review evidence changed during runtime measurement.");
  }
  const summary = {
    schemaVersion: 1,
    stage,
    generatedAt: new Date().toISOString(),
    sourceHead,
    branch,
    statusPorcelainAtStart: statusPorcelain,
    buildInput: "fresh npm run build production output",
    measuredBaseUrl: baseUrl,
    browserVersion,
    profiles: results.map((result) => ({
      profile: result.profile,
      viewport: result.viewport,
      devicePixelRatio: result.measuredDevicePixelRatio,
      durationMs: result.durationMs,
      journeyPhases: result.journeyPhases,
      frames: result.frames,
      longTasks: result.longTasks,
      errorCount: result.errors.length,
      webglDrawCallsByPhase: result.webglDrawCallsByPhase,
      offscreenVideoPlaybackSamples: result.offscreenVideoPlayback.sampleCount,
      memory: result.memory,
    })),
    historicalReviewEvidence: {
      count: historicalEvidence.count,
      bytes: historicalEvidence.bytes,
      digestAlgorithm: historicalEvidence.digestAlgorithm,
      digest: historicalEvidence.digest,
    },
  };
  await writeFile(
    path.join(outputDirectory, `${stage}-summary.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void shutdown().finally(() => process.exit(signal === "SIGINT" ? 130 : 143)));
}

try {
  await main();
} finally {
  await shutdown();
}
