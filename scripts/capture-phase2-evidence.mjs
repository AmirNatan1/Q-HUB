#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
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
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDirectory = path.join(rootDirectory, "artifacts", "review");
const phase2Directory = path.join(reviewDirectory, "phase2");
const host = "127.0.0.1";

const desktopViewport = Object.freeze({ width: 1440, height: 900 });
const mobileViewport = Object.freeze({ width: 390, height: 844 });
const desktopCaptures = Object.freeze([
  {
    id: "desktop-signal",
    file: "desktop-signal.png",
    phase: "signal",
    variant: "settled",
    progress: 0.48,
  },
  {
    id: "desktop-aperture-early-split",
    file: "desktop-aperture-early-split.png",
    phase: "aperture",
    variant: "early-split",
    progress: 0.26,
    pointer: { x: 0.62, y: 0.44 },
    mediaFrameFraction: 0.14,
  },
  {
    id: "desktop-aperture-media-reveal",
    file: "desktop-aperture-media-reveal.png",
    phase: "aperture",
    variant: "media-reveal",
    progress: 0.78,
    pointer: { x: 0.74, y: 0.53 },
    mediaFrameFraction: 0.42,
  },
  {
    id: "desktop-need",
    file: "desktop-need.png",
    phase: "need",
    variant: "settled",
    progress: 0.68,
  },
  {
    id: "desktop-find",
    file: "desktop-find.png",
    phase: "find",
    variant: "selection",
    progress: 0.74,
  },
  {
    id: "desktop-test",
    file: "desktop-test.png",
    phase: "test",
    variant: "field-contact",
    progress: 0.56,
    mediaFrameFraction: 0.48,
  },
  {
    id: "desktop-prove",
    file: "desktop-prove.png",
    phase: "prove",
    variant: "evidence-record",
    progress: 0.16,
  },
]);

const mobileCaptures = Object.freeze([
  {
    id: "mobile-signal",
    file: "mobile-signal.png",
    phase: "signal",
    variant: "settled",
    progress: 0.48,
  },
  {
    id: "mobile-aperture",
    file: "mobile-aperture.png",
    phase: "aperture",
    variant: "media-reveal",
    progress: 0.68,
    mediaFrameFraction: 0.36,
  },
  {
    id: "mobile-need",
    file: "mobile-need.png",
    phase: "need",
    variant: "settled",
    progress: 0.68,
  },
  {
    id: "mobile-find",
    file: "mobile-find.png",
    phase: "find",
    variant: "selection",
    progress: 0.74,
  },
  {
    id: "mobile-test",
    file: "mobile-test.png",
    phase: "test",
    variant: "field-contact",
    progress: 0.56,
    mediaFrameFraction: 0.48,
  },
  {
    id: "mobile-prove",
    file: "mobile-prove.png",
    phase: "prove",
    variant: "evidence-record",
    progress: 0.16,
  },
]);

const fallbackCaptures = Object.freeze([
  {
    id: "fallback-reduced-motion-aperture",
    file: "fallback-reduced-motion-aperture.png",
    phase: "aperture",
    variant: "static-media-reveal",
    progress: 0.68,
    mode: "reduced-motion",
    query: "motion=reduce",
  },
  {
    id: "fallback-reduced-motion-test",
    file: "fallback-reduced-motion-test.png",
    phase: "test",
    variant: "static-field-contact",
    progress: 0.56,
    mode: "reduced-motion",
    query: "motion=reduce",
  },
  {
    id: "fallback-no-webgl-aperture",
    file: "fallback-no-webgl-aperture.png",
    phase: "aperture",
    variant: "media-reveal",
    progress: 0.72,
    mode: "no-webgl",
    query: "webgl=off",
    mediaFrameFraction: 0.36,
  },
]);

const screenshotDefinitions = Object.freeze([
  ...desktopCaptures.map((capture) => ({
    ...capture,
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
  })),
  ...mobileCaptures.map((capture) => ({
    ...capture,
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
  })),
  ...fallbackCaptures.map((capture) => ({
    ...capture,
    profile: "fallback",
    viewport: desktopViewport,
  })),
]);

const journeyDefinition = Object.freeze({
  id: "desktop-complete-journey",
  file: "desktop-journey.webm",
  profile: "desktop",
  mode: "normal",
  viewport: desktopViewport,
  phaseSequence: [
    { phase: "signal", progress: 0.34 },
    { phase: "aperture", progress: 0.22 },
    { phase: "aperture", progress: 0.78 },
    { phase: "need", progress: 0.68 },
    { phase: "find", progress: 0.74 },
    { phase: "test", progress: 0.56 },
    { phase: "prove", progress: 0.16 },
  ],
});

const expectedOutputNames = Object.freeze([
  ...screenshotDefinitions.map((capture) => capture.file),
  journeyDefinition.file,
  "manifest.json",
]);

let previewProcess;
let previewLog = "";
let browser;
let stagingDirectory;
let shutdownPromise;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function printHelp() {
  console.log(`Q-HUB Phase 2 human-review evidence capture

Usage:
  node scripts/capture-phase2-evidence.mjs
  node scripts/capture-phase2-evidence.mjs --plan
  node scripts/capture-phase2-evidence.mjs --help

The default run builds Q-HUB, starts an isolated Astro production preview, and writes
only the Phase 2 package under artifacts/review/phase2/. It captures exactly:
  - 7 desktop PNGs at 1440x900
  - 6 mobile PNGs at 390x844
  - 3 fallback PNGs at 1440x900
  - 1 complete desktop journey WebM at 1440x900
  - manifest.json with hashes, byte sizes, phase/progress/mode, and source metadata

Environment:
  PHASE2_EVIDENCE_BASE_URL       Use an existing localhost server instead of starting preview.
  PHASE2_EVIDENCE_SKIP_BUILD=1   Reuse an existing dist/ build for the isolated preview.
  PHASE2_EVIDENCE_ALLOW_DEV=1    Permit an external Astro dev server (diagnostic only).
  PHASE2_EVIDENCE_CANDIDATE_SHA  Record an explicit Phase 2 candidate SHA in the manifest.

--plan and --dry-run are equivalent, read-only planning modes.`);
}

function printPlan() {
  console.log(JSON.stringify({
    schemaVersion: 1,
    outputDirectory: relative(phase2Directory),
    screenshots: screenshotDefinitions.map((capture) => ({
      id: capture.id,
      file: relative(path.join(phase2Directory, capture.file)),
      profile: capture.profile,
      mode: capture.mode,
      viewport: capture.viewport,
      phase: capture.phase,
      progress: capture.progress,
      variant: capture.variant,
    })),
    journey: {
      ...journeyDefinition,
      file: relative(path.join(phase2Directory, journeyDefinition.file)),
    },
    outputPolicy: "Phase 2 files are isolated under artifacts/review/phase2; all other review evidence is hashed before and after capture and must remain unchanged.",
  }, null, 2));
}

function parseCommandLine() {
  const argumentsList = process.argv.slice(2);
  const supported = new Set(["--help", "-h", "--plan", "--dry-run"]);
  const unknown = argumentsList.filter((argument) => !supported.has(argument));
  if (unknown.length) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}. Use --help for usage.`);
  }
  return {
    help: argumentsList.includes("--help") || argumentsList.includes("-h"),
    plan: argumentsList.includes("--plan") || argumentsList.includes("--dry-run"),
  };
}

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
      stagingDirectory ? rm(stagingDirectory, { recursive: true, force: true }) : undefined,
    ]);
  }
  await shutdownPromise;
}

function validateLocalBaseUrl(value) {
  const parsed = new URL(value);
  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error(
      `PHASE2_EVIDENCE_BASE_URL must be local; received hostname ${parsed.hostname}.`,
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

async function gitValue(args, fallback = "unavailable") {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: rootDirectory,
      windowsHide: true,
    });
    return stdout.trim() || fallback;
  } catch {
    return fallback;
  }
}

async function sourceMetadata() {
  const sourceHead = await gitValue(["rev-parse", "HEAD"]);
  const branch = await gitValue(["branch", "--show-current"]);
  const status = await gitValue(["status", "--porcelain"], "");
  const explicitCandidate = process.env.PHASE2_EVIDENCE_CANDIDATE_SHA?.trim();
  if (explicitCandidate && !/^[0-9a-f]{7,40}$/i.test(explicitCandidate)) {
    throw new Error("PHASE2_EVIDENCE_CANDIDATE_SHA must be a 7-40 character Git SHA.");
  }
  const workingTreeDirty = status.length > 0;
  const candidate = explicitCandidate
    ?? (workingTreeDirty ? "PENDING_PHASE2_CANDIDATE" : sourceHead);
  return {
    branch,
    sourceHead,
    sourceCandidate: candidate,
    candidateBasis: explicitCandidate
      ? "explicit-environment-value"
      : workingTreeDirty
        ? "pending-commit-placeholder"
        : "clean-head",
    workingTreeDirtyAtStart: workingTreeDirty,
    workingTreeChangeCountAtStart: status ? status.split(/\r?\n/).length : 0,
  };
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

async function phase1EvidenceInventory() {
  try {
    const files = (await listFilesRecursively(reviewDirectory))
      .filter((filePath) => {
        const relativeToReview = path.relative(reviewDirectory, filePath);
        return relativeToReview !== "phase2"
          && !relativeToReview.startsWith(`phase2${path.sep}`);
      })
      .sort((left, right) => left.localeCompare(right));
    return Promise.all(files.map(async (filePath) => {
      const bytes = await readFile(filePath);
      return {
        file: relative(filePath),
        sha256: sha256(bytes),
        bytes: bytes.length,
      };
    }));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function inventoryDigest(inventory) {
  const material = inventory
    .map((record) => `${record.file}\0${record.sha256}\0${record.bytes}`)
    .join("\n");
  return sha256(Buffer.from(material));
}

function assertInventoryUnchanged(before, after) {
  const beforeDigest = inventoryDigest(before);
  const afterDigest = inventoryDigest(after);
  if (beforeDigest !== afterDigest) {
    throw new Error(
      `Phase 1 review evidence changed during capture (${beforeDigest} -> ${afterDigest}).`,
    );
  }
}

async function assertOutputDirectoryShape() {
  await mkdir(phase2Directory, { recursive: true });
  const entries = await readdir(phase2Directory, { withFileTypes: true });
  const allowed = new Set(expectedOutputNames);
  const unexpected = entries.filter((entry) => !allowed.has(entry.name));
  if (unexpected.length) {
    throw new Error(
      "Refusing to mix the Phase 2 review package with unexpected entries: "
        + unexpected.map((entry) => entry.name).join(", "),
    );
  }
}

function monitorPage(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function preparePage(page, url, { freezeTransitions = true } = {}) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.js === "true");

  const hasDevToolbar = await page.locator("astro-dev-toolbar").count() > 0;
  if (hasDevToolbar && process.env.PHASE2_EVIDENCE_ALLOW_DEV !== "1") {
    throw new Error(
      "Astro dev toolbar detected. Use a production preview for final evidence, or set PHASE2_EVIDENCE_ALLOW_DEV=1 for diagnostic capture.",
    );
  }

  await page.addStyleTag({
    content: `${hasDevToolbar ? "astro-dev-toolbar { display: none !important; }" : ""}
      html { scroll-behavior: auto !important; }
      ${freezeTransitions ? `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      ` : ""}
    `,
  });
}

async function positionAt(page, phase, targetProgress) {
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
  }, { requestedPhase: phase, requestedTarget: targetProgress });

  await page.waitForFunction(
    ({ requestedPhase, requestedTarget }) => {
      const root = document.documentElement;
      const actual = Number.parseFloat(
        root.style.getPropertyValue("--active-progress") || "-1",
      );
      return root.dataset.activePhase === requestedPhase
        && Math.abs(actual - requestedTarget) <= 0.018;
    },
    { requestedPhase: phase, requestedTarget: targetProgress },
    { timeout: 8_000 },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  return desiredScroll;
}

async function setPointer(page, pointer) {
  if (!pointer) return;
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Capture page has no viewport.");
  await page.mouse.move(
    Math.round(viewport.width * pointer.x),
    Math.round(viewport.height * pointer.y),
    { steps: 8 },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function seekDocumentaryFrame(page, phase, fraction) {
  const selector = `video[data-documentary-video][data-media-phase="${phase}"]`;
  await page.waitForFunction(
    ({ requestedPhase }) => {
      const video = document.querySelector(
        `video[data-documentary-video][data-media-phase="${requestedPhase}"]`,
      );
      return video instanceof HTMLVideoElement
        && video.dataset.mediaLoaded === "true"
        && Boolean(video.currentSrc)
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && Number.isFinite(video.duration)
        && video.duration > 0;
    },
    { requestedPhase: phase },
    { timeout: 20_000 },
  );

  await page.locator(selector).evaluate(async (element, requestedFraction) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected documentary video.");
    const target = Math.min(
      Math.max(element.duration * Number(requestedFraction), 0.05),
      Math.max(element.duration - 0.05, 0.05),
    );
    element.muted = true;
    if (Math.abs(element.currentTime - target) > 0.04) {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Timed out seeking documentary evidence frame.")),
          8_000,
        );
        element.addEventListener("seeked", () => {
          window.clearTimeout(timeout);
          resolve(undefined);
        }, { once: true });
        element.currentTime = target;
      });
    }
    element.pause();
  }, fraction);
}

async function ensureStaticPoster(page, phase) {
  const result = await page.locator(
    `video[data-documentary-video][data-media-phase="${phase}"]`,
  ).evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected documentary video.");
    if (!element.poster) throw new Error("Reduced-motion documentary video has no poster.");
    const response = await fetch(element.poster, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Unable to load documentary poster (${response.status}).`);
    return {
      loop: element.loop,
      mediaLoaded: element.dataset.mediaLoaded === "true",
      paused: element.paused,
      sourceAttribute: element.querySelector("source")?.getAttribute("src") ?? null,
    };
  });
  if (result.loop || result.mediaLoaded || !result.paused || result.sourceAttribute) {
    throw new Error(
      `Reduced-motion ${phase} must remain static: ${JSON.stringify(result)}.`,
    );
  }
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < window.innerHeight
        && bounds.left < window.innerWidth
        && getComputedStyle(image).visibility !== "hidden";
    });
    return visibleImages.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 12_000 });
}

async function assertCaptureState(page, definition) {
  const state = await page.evaluate(() => ({
    activePhase: document.documentElement.dataset.activePhase ?? "unknown",
    actualProgress: Number.parseFloat(
      document.documentElement.style.getPropertyValue("--active-progress") || "-1",
    ),
    renderMode: document.documentElement.dataset.renderMode ?? "unknown",
    mediaMode: document.documentElement.dataset.mediaMode ?? "unknown",
    findStep: document.documentElement.dataset.findStep ?? null,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }));

  if (state.activePhase !== definition.phase) {
    throw new Error(`${definition.id} resolved ${state.activePhase}, expected ${definition.phase}.`);
  }
  if (Math.abs(state.actualProgress - definition.progress) > 0.018) {
    throw new Error(
      `${definition.id} progress ${state.actualProgress} differs from target ${definition.progress}.`,
    );
  }
  if (
    state.viewport.width !== definition.viewport.width
    || state.viewport.height !== definition.viewport.height
  ) {
    throw new Error(
      `${definition.id} viewport ${state.viewport.width}x${state.viewport.height} differs from `
        + `${definition.viewport.width}x${definition.viewport.height}.`,
    );
  }
  if (definition.phase === "find" && state.findStep !== "selection") {
    throw new Error(`${definition.id} must capture FIND selection, received ${state.findStep}.`);
  }
  if (definition.mode === "reduced-motion" && state.renderMode !== "reduced-motion") {
    throw new Error(`${definition.id} did not activate reduced-motion mode (${state.renderMode}).`);
  }
  if (definition.mode === "no-webgl" && !/no-webgl|fallback/i.test(state.renderMode)) {
    throw new Error(`${definition.id} did not activate no-WebGL fallback (${state.renderMode}).`);
  }
  if (definition.profile === "desktop" && state.renderMode !== "webgl-enhanced") {
    throw new Error(`${definition.id} expected desktop WebGL enhancement (${state.renderMode}).`);
  }
  return state;
}

async function assertPhaseComposition(page, definition) {
  const section = page.locator(`[data-experience-phase="${definition.phase}"]`);
  const heading = section.locator("h1, h2, h3").first();
  if (!(await heading.isVisible())) {
    throw new Error(`${definition.id} has no visible phase heading.`);
  }

  if (definition.phase === "aperture") {
    const media = page.locator('.field-media__documentary');
    if (!(await media.isVisible())) throw new Error(`${definition.id} has no visible aperture media.`);
  }

  if (definition.phase === "test") {
    const boundary = section.locator('.test-boundary');
    if (!(await boundary.isVisible())) throw new Error(`${definition.id} has no visible TEST boundary.`);
  }

  if (definition.phase === "prove") {
    const proofRecord = section.locator('[data-proof-record]');
    if (!(await proofRecord.isVisible())) {
      throw new Error(`${definition.id} has no visible Proof Record.`);
    }
  }
}

async function captureFrame(page, definition, source) {
  const scrollY = await positionAt(page, definition.phase, definition.progress);
  await setPointer(page, definition.pointer);

  if (definition.mode === "reduced-motion") {
    if (definition.phase === "aperture" || definition.phase === "test") {
      await ensureStaticPoster(page, definition.phase);
    }
  } else if (definition.mediaFrameFraction !== undefined) {
    await seekDocumentaryFrame(page, definition.phase, definition.mediaFrameFraction);
  }

  await waitForVisibleImages(page);
  const state = await assertCaptureState(page, definition);
  await assertPhaseComposition(page, definition);
  const filePath = path.join(stagingDirectory, definition.file);
  const bytes = await page.screenshot({
    path: filePath,
    type: "png",
    fullPage: false,
    animations: "disabled",
  });

  return {
    id: definition.id,
    kind: "screenshot",
    file: relative(path.join(phase2Directory, definition.file)),
    profile: definition.profile,
    mode: definition.mode,
    viewport: state.viewport,
    phase: state.activePhase,
    variant: definition.variant,
    targetProgress: definition.progress,
    actualProgress: state.actualProgress,
    scrollY: Math.round(scrollY),
    renderMode: state.renderMode,
    mediaMode: state.mediaMode,
    findStep: state.findStep,
    sourceHead: source.sourceHead,
    sourceCandidate: source.sourceCandidate,
    capturedAt: new Date().toISOString(),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

function contextOptions(profile, mode) {
  const viewport = profile === "mobile" ? mobileViewport : desktopViewport;
  return {
    viewport,
    deviceScaleFactor: 1,
    hasTouch: profile === "mobile",
    isMobile: profile === "mobile",
    reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference",
    colorScheme: "dark",
  };
}

async function captureGroup(baseUrl, definitions, profile, mode, source) {
  const context = await browser.newContext(contextOptions(profile, mode));
  const page = await context.newPage();
  const errors = monitorPage(page);
  try {
    const query = definitions[0]?.query;
    await preparePage(page, `${baseUrl}/${query ? `?${query}` : ""}`);
    if (profile === "desktop" && mode === "normal") {
      await page.mouse.move(979, 414);
      await page.waitForFunction(
        () => document.documentElement.dataset.renderMode === "webgl-enhanced",
        undefined,
        { timeout: 10_000 },
      );
    }

    const captures = [];
    for (const definition of definitions) {
      captures.push(await captureFrame(page, definition, source));
    }
    if (errors.length) {
      throw new Error(
        `Application errors during ${profile}/${mode} capture:\n${errors.join("\n")}`,
      );
    }
    return captures;
  } finally {
    await context.close();
  }
}

async function targetScrollY(page, phase, progress) {
  return page.evaluate(({ requestedPhase, requestedProgress }) => {
    const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
    if (!(section instanceof HTMLElement)) throw new Error(`Missing ${requestedPhase} section.`);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const bounds = section.getBoundingClientRect();
    return Math.min(
      document.documentElement.scrollHeight - viewportHeight,
      Math.max(
        0,
        bounds.top + window.scrollY
          + requestedProgress * Math.max(bounds.height, viewportHeight)
          - marker,
      ),
    );
  }, { requestedPhase: phase, requestedProgress: progress });
}

async function animateScroll(page, destination, duration = 900) {
  await page.evaluate(({ destinationY, durationMs }) => new Promise((resolve) => {
    const start = window.scrollY;
    const delta = destinationY - start;
    const began = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - began) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      window.scrollTo(0, start + delta * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  }), { destinationY: destination, durationMs: duration });
}

async function recordDesktopJourney(baseUrl, source) {
  const videoStagingDirectory = path.join(stagingDirectory, ".video");
  await mkdir(videoStagingDirectory, { recursive: true });
  const context = await browser.newContext({
    ...contextOptions("desktop", "normal"),
    recordVideo: {
      dir: videoStagingDirectory,
      size: desktopViewport,
    },
  });
  const page = await context.newPage();
  const errors = monitorPage(page);
  let video;
  try {
    await preparePage(page, `${baseUrl}/`, { freezeTransitions: false });
    await page.mouse.move(979, 414);
    await page.waitForFunction(
      () => document.documentElement.dataset.renderMode === "webgl-enhanced",
      undefined,
      { timeout: 10_000 },
    );
    video = page.video();
    if (!video) throw new Error("Playwright did not provide a journey video artifact.");
    await page.waitForTimeout(500);

    for (const stop of journeyDefinition.phaseSequence) {
      const destination = await targetScrollY(page, stop.phase, stop.progress);
      await animateScroll(page, destination);
      if (stop.phase === "aperture") {
        await page.mouse.move(
          stop.progress < 0.5 ? 840 : 1080,
          stop.progress < 0.5 ? 370 : 510,
          { steps: 14 },
        );
      }
      await page.waitForTimeout(stop.phase === "aperture" || stop.phase === "test" ? 780 : 520);
    }
  } finally {
    await context.close();
  }

  if (errors.length) {
    throw new Error(`Application errors during journey capture:\n${errors.join("\n")}`);
  }
  const recordedPath = await video.path();
  const finalStagedPath = path.join(stagingDirectory, journeyDefinition.file);
  await rename(recordedPath, finalStagedPath);
  await rm(videoStagingDirectory, { recursive: true, force: true });
  const bytes = await readFile(finalStagedPath);
  if (bytes.length === 0) throw new Error("Journey WebM is empty.");
  return {
    id: journeyDefinition.id,
    kind: "video",
    file: relative(path.join(phase2Directory, journeyDefinition.file)),
    profile: journeyDefinition.profile,
    mode: journeyDefinition.mode,
    viewport: journeyDefinition.viewport,
    phase: "complete-journey",
    phaseSequence: journeyDefinition.phaseSequence,
    sourceHead: source.sourceHead,
    sourceCandidate: source.sourceCandidate,
    capturedAt: new Date().toISOString(),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function assertStagingShape() {
  const names = (await readdir(stagingDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = expectedOutputNames.slice().sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(
      `Incomplete Phase 2 package staging. Expected ${expected.join(", ")}; received ${names.join(", ")}.`,
    );
  }
}

async function promoteStaging() {
  for (const name of expectedOutputNames) {
    const destination = path.join(phase2Directory, name);
    try {
      await unlink(destination);
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
    await rename(path.join(stagingDirectory, name), destination);
  }
  await rm(stagingDirectory, { recursive: true, force: true });
  stagingDirectory = undefined;

  const finalNames = (await readdir(phase2Directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = expectedOutputNames.slice().sort();
  if (JSON.stringify(finalNames) !== JSON.stringify(expected)) {
    throw new Error("Final Phase 2 review directory does not contain the exact expected file set.");
  }
}

async function main() {
  const command = parseCommandLine();
  if (command.help) {
    printHelp();
    return;
  }
  if (command.plan) {
    printPlan();
    return;
  }

  await assertOutputDirectoryShape();
  stagingDirectory = path.join(phase2Directory, `.staging-${process.pid}-${Date.now()}`);
  await mkdir(stagingDirectory, { recursive: true });
  const source = await sourceMetadata();
  const phase1Before = await phase1EvidenceInventory();

  const externalBaseUrl = process.env.PHASE2_EVIDENCE_BASE_URL
    ? validateLocalBaseUrl(process.env.PHASE2_EVIDENCE_BASE_URL)
    : undefined;
  let baseUrl = externalBaseUrl;
  if (!baseUrl) {
    if (process.env.PHASE2_EVIDENCE_SKIP_BUILD !== "1") {
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
    ...await captureGroup(baseUrl, desktopCaptures.map((capture) => ({
      ...capture,
      profile: "desktop",
      mode: "normal",
      viewport: desktopViewport,
    })), "desktop", "normal", source),
    ...await captureGroup(baseUrl, mobileCaptures.map((capture) => ({
      ...capture,
      profile: "mobile",
      mode: "normal",
      viewport: mobileViewport,
    })), "mobile", "normal", source),
    ...await captureGroup(baseUrl, [
      { ...fallbackCaptures[0], profile: "fallback", viewport: desktopViewport },
      { ...fallbackCaptures[1], profile: "fallback", viewport: desktopViewport },
    ], "fallback", "reduced-motion", source),
    ...await captureGroup(baseUrl, [
      { ...fallbackCaptures[2], profile: "fallback", viewport: desktopViewport },
    ], "fallback", "no-webgl", source),
  ];

  if (captures.length !== 16) {
    throw new Error(`Expected exactly 16 screenshots; captured ${captures.length}.`);
  }
  const uniqueHashes = new Set(captures.map((capture) => capture.sha256));
  if (uniqueHashes.size !== captures.length) {
    throw new Error("Phase 2 screenshot package contains duplicate rendered frames.");
  }

  const journey = await recordDesktopJourney(baseUrl, source);
  const phase1AfterCapture = await phase1EvidenceInventory();
  assertInventoryUnchanged(phase1Before, phase1AfterCapture);

  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase 2 / Maradin human-review evidence",
    generatedAt: new Date().toISOString(),
    source,
    server: {
      type: externalBaseUrl ? "external-local-server" : "isolated-astro-production-preview",
      baseUrl,
      astroDevServerAllowed: process.env.PHASE2_EVIDENCE_ALLOW_DEV === "1",
    },
    contract: {
      desktopScreenshots: 7,
      mobileScreenshots: 6,
      fallbackScreenshots: 3,
      journeyVideos: 1,
      desktopViewport,
      mobileViewport,
    },
    phase1EvidencePolicy: "Every pre-existing review artifact outside artifacts/review/phase2 is read and hashed only; capture aborts if any changes.",
    phase1EvidenceIntegrity: {
      status: "verified-unchanged-after-capture",
      fileCount: phase1Before.length,
      digest: inventoryDigest(phase1Before),
      files: phase1Before,
    },
    captures,
    journey,
  };
  await writeFile(
    path.join(stagingDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  await assertStagingShape();
  await promoteStaging();
  const phase1AfterPromotion = await phase1EvidenceInventory();
  assertInventoryUnchanged(phase1Before, phase1AfterPromotion);

  console.log("Phase 2 evidence captured: 7 desktop, 6 mobile, 3 fallback PNGs, and 1 journey WebM.");
  console.log(`Manifest: ${relative(path.join(phase2Directory, "manifest.json"))}`);
}

process.once("SIGINT", () => void shutdown().finally(() => process.exit(130)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(143)));

try {
  await main();
} finally {
  await shutdown();
}
