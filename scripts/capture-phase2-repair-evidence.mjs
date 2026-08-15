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
const repairDirectory = path.join(reviewDirectory, "phase2-repair");
const priorJourneyPath = path.join(reviewDirectory, "phase2", "desktop-journey.webm");
const expectedPriorJourneySha256 = "2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7";
const expectedBranch = "phase2/maradin-field-evidence";
const host = "127.0.0.1";
const astroCliPath = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");

const desktopViewport = Object.freeze({ width: 1440, height: 900 });
const mobileViewport = Object.freeze({ width: 390, height: 844 });
const baselineDefinition = Object.freeze({
  id: "baseline-aperture-subtitle-9-40s",
  file: "baseline-aperture-subtitle-9-40s.png",
  profile: "baseline",
  mode: "prior-phase2-journey",
  phase: "aperture",
  requestedMediaSeconds: 9.4,
  viewport: desktopViewport,
});

const desktopApertureDefinitions = Object.freeze([
  ["0-17", 0.17],
  ["1-84", 1.84],
  ["2-57", 2.57],
  ["2-81", 2.81],
  ["2-95", 2.95],
  ["3-15", 3.15],
  ["3-20", 3.2],
].map(([label, requestedMediaSeconds]) => Object.freeze({
  id: `desktop-aperture-${label}s`,
  file: `desktop-aperture-${label}s.png`,
  profile: "desktop",
  mode: "normal",
  phase: "aperture",
  variant: "subtitle-band-exclusion-sequence",
  progress: 0.78,
  pointer: { x: 0.74, y: 0.53 },
  requestedMediaSeconds,
  viewport: desktopViewport,
})));

const desktopSettledDefinitions = Object.freeze([
  {
    id: "desktop-need",
    file: "desktop-need.png",
    profile: "desktop",
    mode: "normal",
    phase: "need",
    variant: "settled",
    progress: 0.68,
    viewport: desktopViewport,
  },
  {
    id: "desktop-test-0-70s",
    file: "desktop-test-0-70s.png",
    profile: "desktop",
    mode: "normal",
    phase: "test",
    variant: "physical-field-contact",
    progress: 0.56,
    requestedMediaSeconds: 0.7,
    viewport: desktopViewport,
  },
  {
    id: "desktop-prove",
    file: "desktop-prove.png",
    profile: "desktop",
    mode: "normal",
    phase: "prove",
    variant: "settled-evidence-record",
    progress: 0.16,
    viewport: desktopViewport,
  },
]);

const mobileDefinitions = Object.freeze([
  {
    id: "mobile-aperture-3-05s",
    file: "mobile-aperture-3-05s.png",
    profile: "mobile",
    mode: "normal",
    phase: "aperture",
    variant: "subtitle-band-exclusion",
    progress: 0.68,
    requestedMediaSeconds: 3.05,
    viewport: mobileViewport,
  },
  {
    id: "mobile-test-0-70s",
    file: "mobile-test-0-70s.png",
    profile: "mobile",
    mode: "normal",
    phase: "test",
    variant: "physical-field-contact",
    progress: 0.56,
    requestedMediaSeconds: 0.7,
    viewport: mobileViewport,
  },
  {
    id: "mobile-prove",
    file: "mobile-prove.png",
    profile: "mobile",
    mode: "normal",
    phase: "prove",
    variant: "settled-evidence-record",
    progress: 0.16,
    viewport: mobileViewport,
  },
]);

const fallbackDefinitions = Object.freeze([
  {
    id: "fallback-reduced-motion-aperture",
    file: "fallback-reduced-motion-aperture.png",
    profile: "fallback",
    mode: "reduced-motion",
    phase: "aperture",
    variant: "resolved-poster",
    progress: 0.68,
    query: "motion=reduce",
    viewport: desktopViewport,
  },
  {
    id: "fallback-no-webgl-aperture-3-05s",
    file: "fallback-no-webgl-aperture-3-05s.png",
    profile: "fallback",
    mode: "no-webgl",
    phase: "aperture",
    variant: "subtitle-band-exclusion",
    progress: 0.72,
    query: "webgl=off",
    requestedMediaSeconds: 3.05,
    viewport: desktopViewport,
  },
]);

const appScreenshotDefinitions = Object.freeze([
  ...desktopApertureDefinitions,
  ...desktopSettledDefinitions,
  ...mobileDefinitions,
  ...fallbackDefinitions,
]);

const journeyDefinition = Object.freeze({
  id: "desktop-complete-repair-journey",
  file: "desktop-repair-journey.webm",
  profile: "desktop",
  mode: "normal",
  viewport: desktopViewport,
  apertureMinimumDwellMs: 3_500,
  apertureRequestedDwellMs: 4_200,
  phaseSequence: [
    { phase: "signal", progress: 0.34, settleMs: 650 },
    { phase: "aperture", progress: 0.78, settleMs: 4_200 },
    { phase: "need", progress: 0.68, settleMs: 700 },
    { phase: "find", progress: 0.74, settleMs: 700 },
    { phase: "test", progress: 0.56, settleMs: 900 },
    { phase: "prove", progress: 0.16, settleMs: 900 },
  ],
});

const expectedOutputNames = Object.freeze([
  baselineDefinition.file,
  ...appScreenshotDefinitions.map((definition) => definition.file),
  journeyDefinition.file,
  "manifest.json",
]);

const workflowAuditRoutes = Object.freeze([
  "/",
  "/proof/",
  "/industry/",
  "/startups/",
  "/programs/",
  "/programs/spark/",
  "/programs/champ/",
  "/network/",
  "/about/",
  "/contact/",
]);

let previewProcess;
let previewPort;
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

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Evidence screenshot is not a decodable PNG.");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function printHelp() {
  console.log(`Q-HUB Phase 2 final visual-repair evidence capture

Usage:
  node scripts/capture-phase2-repair-evidence.mjs
  node scripts/capture-phase2-repair-evidence.mjs --plan
  node scripts/capture-phase2-repair-evidence.mjs --help

The capture is fail-closed. A final run requires the exact branch
${expectedBranch}, a clean working tree, and an empty artifacts/review/phase2-repair/.
It always builds or reuses dist/, starts an isolated Astro production preview, and
rejects any Astro dev toolbar.

Environment:
  PHASE2_REPAIR_EVIDENCE_SKIP_BUILD=1   Reuse an existing dist/index.html.
  PHASE2_REPAIR_EVIDENCE_CANDIDATE_SHA  Optional full SHA; it must equal HEAD.

--plan and --dry-run are equivalent read-only inventory modes.`);
}

function printPlan() {
  console.log(JSON.stringify({
    schemaVersion: 1,
    outputDirectory: relative(repairDirectory),
    preconditions: {
      branch: expectedBranch,
      cleanWorkingTree: true,
      candidateEnvironmentMustEqualHead: true,
      outputDirectoryMustBeEmpty: true,
    },
    screenshots: [baselineDefinition, ...appScreenshotDefinitions].map((definition) => ({
      id: definition.id,
      file: relative(path.join(repairDirectory, definition.file)),
      profile: definition.profile,
      mode: definition.mode,
      viewport: definition.viewport,
      phase: definition.phase,
      requestedMediaSeconds: definition.requestedMediaSeconds ?? null,
    })),
    journey: {
      ...journeyDefinition,
      file: relative(path.join(repairDirectory, journeyDefinition.file)),
    },
    manifest: relative(path.join(repairDirectory, "manifest.json")),
    priorEvidencePolicy:
      "Every file under artifacts/review except phase2-repair is hashed before and after; any change aborts capture.",
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
        else reject(new Error("Unable to reserve an isolated production-preview port."));
      });
    });
  });
}

function startPreview(port) {
  previewPort = port;
  const child = spawn(
    process.execPath,
    [astroCliPath, "preview", "--host", host, "--port", String(port)],
    {
      cwd: rootDirectory,
      // Astro backgrounds preview automatically when it detects an agent. The
      // capture harness must own the foreground process so an early CLI exit
      // cannot be mistaken for a failed or detached evidence server.
      env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
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
      // An isolated preview normally refuses connections for a short startup interval.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}.\n${previewLog}`);
}

async function stopPreview() {
  if (previewProcess?.pid && previewProcess.exitCode === null) {
    previewProcess.kill();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (previewProcess.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  if (process.platform === "win32" && previewPort) {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    const listenerPids = new Set(stdout
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/))
      .filter((fields) => fields.length >= 5
        && fields[1]?.endsWith(`:${previewPort}`)
        && fields[3]?.toUpperCase() === "LISTENING")
      .map((fields) => Number.parseInt(fields.at(-1), 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid));
    for (const pid of listenerPids) {
      try {
        process.kill(pid);
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ESRCH")) {
          throw error;
        }
      }
    }
  }

  if (previewProcess?.pid && previewProcess.exitCode === null) {
    if (process.platform !== "win32") {
      previewProcess.kill("SIGKILL");
      return;
    }
    await new Promise((resolve) => {
      const child = spawn(
        "taskkill",
        ["/pid", String(previewProcess.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true },
      );
      child.once("error", resolve);
      child.once("exit", resolve);
    });
  }
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

async function gitRequired(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: rootDirectory,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.trim();
}

async function strictSourceMetadata() {
  const [sourceHead, branch, status] = await Promise.all([
    gitRequired(["rev-parse", "HEAD"]),
    gitRequired(["branch", "--show-current"]),
    gitRequired(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  if (branch !== expectedBranch) {
    throw new Error(`Repair evidence requires branch ${expectedBranch}; received ${branch || "detached HEAD"}.`);
  }
  if (status) {
    throw new Error(`Repair evidence requires a clean working tree. Refusing these changes:\n${status}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(sourceHead)) {
    throw new Error(`Unable to resolve a full candidate HEAD SHA (${sourceHead}).`);
  }

  const explicitCandidate = process.env.PHASE2_REPAIR_EVIDENCE_CANDIDATE_SHA?.trim();
  if (explicitCandidate) {
    if (!/^[0-9a-f]{40}$/i.test(explicitCandidate)) {
      throw new Error("PHASE2_REPAIR_EVIDENCE_CANDIDATE_SHA must be a full 40-character SHA.");
    }
    if (explicitCandidate.toLowerCase() !== sourceHead.toLowerCase()) {
      throw new Error(
        `PHASE2_REPAIR_EVIDENCE_CANDIDATE_SHA ${explicitCandidate} does not equal HEAD ${sourceHead}.`,
      );
    }
  }

  return {
    branch,
    sourceHead,
    sourceCandidate: sourceHead,
    candidateBasis: explicitCandidate ? "explicit-environment-value-equal-to-head" : "clean-head",
    expectedBranch,
    workingTreeCleanAtStart: true,
    statusPorcelainAtStart: "",
    candidateEnvironmentProvided: Boolean(explicitCandidate),
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

async function priorEvidenceInventory() {
  try {
    const files = (await listFilesRecursively(reviewDirectory))
      .filter((filePath) => {
        const relativeToReview = path.relative(reviewDirectory, filePath);
        return relativeToReview !== "phase2-repair"
          && !relativeToReview.startsWith(`phase2-repair${path.sep}`);
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
  return sha256(Buffer.from(inventory
    .map((record) => `${record.file}\0${record.sha256}\0${record.bytes}`)
    .join("\n")));
}

function assertInventoryUnchanged(before, after, stage) {
  const beforeDigest = inventoryDigest(before);
  const afterDigest = inventoryDigest(after);
  if (beforeDigest !== afterDigest || JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(
      `Prior artifacts/review evidence changed ${stage} (${beforeDigest} -> ${afterDigest}).`,
    );
  }
}

async function prepareEmptyRepairDirectory() {
  try {
    const entries = await readdir(repairDirectory);
    if (entries.length) {
      throw new Error(
        `Refusing to overwrite existing repair evidence: ${relative(repairDirectory)} contains ${entries.join(", ")}.`,
      );
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
    await mkdir(repairDirectory, { recursive: true });
  }
  stagingDirectory = path.join(repairDirectory, `.staging-${process.pid}-${Date.now()}`);
  await mkdir(stagingDirectory, { recursive: true });
}

function monitorPage(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function prepareAppPage(
  page,
  url,
  { freezeTransitions = true, requireApplicationState = true } = {},
) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (requireApplicationState) {
    await page.waitForFunction(() => document.documentElement.dataset.js === "true");
  }
  if (await page.locator("astro-dev-toolbar").count()) {
    throw new Error("Astro dev toolbar detected. Repair evidence must use an isolated production preview.");
  }
  await page.addStyleTag({
    content: `html { scroll-behavior: auto !important; }
      ${freezeTransitions ? `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      ` : ""}`,
  });
}

async function positionAt(page, phase, targetProgress) {
  const scrollY = await page.evaluate(({ requestedPhase, requestedTarget }) => {
    const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
    if (!(section instanceof HTMLElement)) throw new Error(`Missing section for ${requestedPhase}.`);
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

  await waitForPhaseState(page, phase, targetProgress);
  return scrollY;
}

async function waitForPhaseState(page, phase, targetProgress) {
  await page.waitForFunction(
    ({ requestedPhase, requestedTarget }) => {
      const root = document.documentElement;
      const actual = Number.parseFloat(root.style.getPropertyValue("--active-progress") || "-1");
      return root.dataset.activePhase === requestedPhase
        && Math.abs(actual - requestedTarget) <= 0.018;
    },
    { requestedPhase: phase, requestedTarget: targetProgress },
    { timeout: 8_000 },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function setPointer(page, pointer) {
  if (!pointer) return;
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Evidence page has no viewport.");
  await page.mouse.move(
    Math.round(viewport.width * pointer.x),
    Math.round(viewport.height * pointer.y),
    { steps: 10 },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function seekDocumentarySecond(page, phase, requestedSeconds) {
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

  const media = await page.locator(selector).evaluate(async (element, requested) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected documentary video.");
    if (requested > element.duration) {
      throw new Error(`Requested ${requested}s exceeds ${element.duration}s media duration.`);
    }
    const target = Math.min(Number(requested), Math.max(element.duration - 0.001, 0));
    element.muted = true;
    element.pause();
    if (Math.abs(element.currentTime - target) > 0.001) {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Timed out seeking documentary repair-evidence frame.")),
          8_000,
        );
        element.addEventListener("seeked", () => {
          window.clearTimeout(timeout);
          resolve(undefined);
        }, { once: true });
        element.currentTime = target;
      });
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      requestedSeconds: Number(requested),
      actualSeconds: element.currentTime,
      durationSeconds: element.duration,
      videoWidth: element.videoWidth,
      videoHeight: element.videoHeight,
      paused: element.paused,
      loop: element.loop,
      readyState: element.readyState,
      currentSource: element.currentSrc,
    };
  }, requestedSeconds);

  if (Math.abs(media.actualSeconds - requestedSeconds) > 0.04) {
    throw new Error(
      `${phase} seek resolved ${media.actualSeconds}s, more than 0.04s from ${requestedSeconds}s.`,
    );
  }
  if (!media.paused || media.readyState < 2 || media.videoWidth <= 0 || media.videoHeight <= 0) {
    throw new Error(`${phase} did not resolve a decoded, paused evidence frame.`);
  }
  return {
    ...media,
    requestedSeconds: round(media.requestedSeconds, 3),
    actualSeconds: round(media.actualSeconds, 6),
    durationSeconds: round(media.durationSeconds, 6),
  };
}

async function ensureStaticPoster(page, phase) {
  const result = await page.locator(
    `video[data-documentary-video][data-media-phase="${phase}"]`,
  ).evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected documentary video.");
    if (!element.poster) throw new Error("Reduced-motion documentary video has no poster.");
    const response = await fetch(element.poster, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Unable to load documentary poster (${response.status}).`);
    const dimensions = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Unable to decode documentary poster."));
      image.src = element.poster;
    });
    return {
      loop: element.loop,
      mediaLoaded: element.dataset.mediaLoaded === "true",
      paused: element.paused,
      poster: element.poster,
      posterDimensions: dimensions,
      sourceAttribute: element.querySelector("source")?.getAttribute("src") ?? null,
    };
  });
  if (result.loop || result.mediaLoaded || !result.paused || result.sourceAttribute) {
    throw new Error(`Reduced-motion ${phase} must remain static: ${JSON.stringify(result)}.`);
  }
  return result;
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
  await page.evaluate(async () => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < window.innerHeight
        && bounds.left < window.innerWidth
        && getComputedStyle(image).visibility !== "hidden";
    });
    await Promise.all(visibleImages.map((image) => image.decode()));
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  });
}

async function captureState(page, definition) {
  const state = await page.evaluate(() => ({
    activePhase: document.documentElement.dataset.activePhase ?? "unknown",
    actualProgress: Number.parseFloat(
      document.documentElement.style.getPropertyValue("--active-progress") || "-1",
    ),
    renderMode: document.documentElement.dataset.renderMode ?? "unknown",
    mediaMode: document.documentElement.dataset.mediaMode ?? "unknown",
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }));
  if (state.activePhase !== definition.phase) {
    throw new Error(`${definition.id} resolved ${state.activePhase}, expected ${definition.phase}.`);
  }
  if (Math.abs(state.actualProgress - definition.progress) > 0.018) {
    throw new Error(
      `${definition.id} progress ${state.actualProgress} differs from ${definition.progress}.`,
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
  if (definition.profile === "desktop" && state.renderMode !== "webgl-enhanced") {
    throw new Error(`${definition.id} expected WebGL enhancement (${state.renderMode}).`);
  }
  if (definition.mode === "reduced-motion" && state.renderMode !== "reduced-motion") {
    throw new Error(`${definition.id} did not activate reduced motion (${state.renderMode}).`);
  }
  if (definition.mode === "no-webgl" && !/no-webgl|fallback/i.test(state.renderMode)) {
    throw new Error(`${definition.id} did not activate no-WebGL fallback (${state.renderMode}).`);
  }
  return state;
}

async function assertPhaseComposition(page, definition) {
  const section = page.locator(`[data-experience-phase="${definition.phase}"]`);
  if (!(await section.locator("h1, h2, h3").first().isVisible())) {
    throw new Error(`${definition.id} has no visible phase heading.`);
  }
  if (definition.phase === "aperture" && !(await page.locator(".field-media__documentary").isVisible())) {
    throw new Error(`${definition.id} has no visible APERTURE documentary plane.`);
  }
  if (definition.phase === "test" && !(await section.locator(".test-boundary").isVisible())) {
    throw new Error(`${definition.id} has no visible TEST boundary.`);
  }
  if (definition.phase === "prove" && !(await section.locator("[data-proof-record]").isVisible())) {
    throw new Error(`${definition.id} has no visible Proof Record.`);
  }
}

async function apertureCropGeometry(page, { poster = false } = {}) {
  const geometry = await page.locator(
    '.field-media__documentary video[data-documentary-video][data-media-phase="aperture"]',
  ).evaluate(async (element, posterMode) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected APERTURE video.");
    const frameElement = element.parentElement;
    if (!(frameElement instanceof HTMLElement)) throw new Error("Missing APERTURE clip frame.");
    let naturalWidth = element.videoWidth;
    let naturalHeight = element.videoHeight;
    let naturalSource = "video";
    if (posterMode) {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("Unable to decode APERTURE poster geometry."));
        image.src = element.poster;
      });
      naturalWidth = dimensions.width;
      naturalHeight = dimensions.height;
      naturalSource = "poster";
    }
    if (naturalWidth <= 0 || naturalHeight <= 0) throw new Error("APERTURE media has no natural size.");

    const frame = frameElement.getBoundingClientRect();
    const media = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const coordinates = style.objectPosition.match(/-?[\d.]+%/g)?.map(Number.parseFloat) ?? [];
    const positionX = coordinates[0] ?? 50;
    const positionY = coordinates[1] ?? 50;
    const scale = Math.max(media.width / naturalWidth, media.height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const offsetX = (media.width - renderedWidth) * positionX / 100;
    const offsetY = (media.height - renderedHeight) * positionY / 100;
    const visible = {
      left: Math.max(frame.left, media.left),
      top: Math.max(frame.top, media.top),
      right: Math.min(frame.right, media.right),
      bottom: Math.min(frame.bottom, media.bottom),
    };
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    const sourceCrop = {
      xMin: clamp((visible.left - media.left - offsetX) / scale, 0, naturalWidth),
      yMin: clamp((visible.top - media.top - offsetY) / scale, 0, naturalHeight),
      xMax: clamp((visible.right - media.left - offsetX) / scale, 0, naturalWidth),
      yMax: clamp((visible.bottom - media.top - offsetY) / scale, 0, naturalHeight),
    };
    return {
      naturalSource,
      naturalWidth,
      naturalHeight,
      frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      media: { x: media.x, y: media.y, width: media.width, height: media.height },
      objectFit: style.objectFit,
      objectPosition: style.objectPosition,
      frameOverflow: getComputedStyle(frameElement).overflow,
      scale,
      renderedSource: { width: renderedWidth, height: renderedHeight, offsetX, offsetY },
      sourceCrop,
      elementTopOffsetPx: Math.abs(media.top - frame.top),
      elementBottomExclusionRatio: (media.bottom - frame.bottom) / media.height,
      sourceBottomExclusionRatio: (naturalHeight - sourceCrop.yMax) / naturalHeight,
    };
  }, poster);

  if (geometry.frameOverflow !== "hidden") {
    throw new Error(`APERTURE crop boundary must hide overflow (${geometry.frameOverflow}).`);
  }
  if (geometry.elementTopOffsetPx > 1.1 || geometry.sourceBottomExclusionRatio < 0.12) {
    throw new Error(`APERTURE subtitle-band exclusion is insufficient: ${JSON.stringify(geometry)}.`);
  }
  return {
    ...geometry,
    scale: round(geometry.scale),
    frame: Object.fromEntries(Object.entries(geometry.frame).map(([key, value]) => [key, round(value, 3)])),
    media: Object.fromEntries(Object.entries(geometry.media).map(([key, value]) => [key, round(value, 3)])),
    renderedSource: Object.fromEntries(
      Object.entries(geometry.renderedSource).map(([key, value]) => [key, round(value, 3)]),
    ),
    sourceCrop: Object.fromEntries(
      Object.entries(geometry.sourceCrop).map(([key, value]) => [key, round(value, 3)]),
    ),
    elementTopOffsetPx: round(geometry.elementTopOffsetPx, 3),
    elementBottomExclusionRatio: round(geometry.elementBottomExclusionRatio),
    sourceBottomExclusionRatio: round(geometry.sourceBottomExclusionRatio),
  };
}

async function testCoverageGeometry(page) {
  const geometry = await page.locator(".test-boundary").evaluate((element) => {
    const frame = element.querySelector(".test-boundary__media");
    const plate = element.querySelector("[data-test-metadata]");
    if (!(frame instanceof HTMLVideoElement) || !(plate instanceof HTMLElement)) {
      throw new Error("Missing TEST video or metadata surface.");
    }
    const frameRect = frame.getBoundingClientRect();
    const plateRect = plate.getBoundingClientRect();
    const intersectionWidth = Math.max(
      0,
      Math.min(frameRect.right, plateRect.right) - Math.max(frameRect.left, plateRect.left),
    );
    const intersectionHeight = Math.max(
      0,
      Math.min(frameRect.bottom, plateRect.bottom) - Math.max(frameRect.top, plateRect.top),
    );
    const opaqueCoverage = (intersectionWidth * intersectionHeight)
      / (frameRect.width * frameRect.height);
    return {
      videoRect: {
        x: frameRect.x,
        y: frameRect.y,
        width: frameRect.width,
        height: frameRect.height,
      },
      plateRect: {
        x: plateRect.x,
        y: plateRect.y,
        width: plateRect.width,
        height: plateRect.height,
      },
      objectPosition: getComputedStyle(frame).objectPosition,
      plateBackground: getComputedStyle(plate).backgroundColor,
      opaqueCoverage,
      unobstructedRatio: 1 - opaqueCoverage,
      uninterruptedOpenRegionHeightRatio: (plateRect.top - frameRect.top) / frameRect.height,
    };
  });
  if (geometry.opaqueCoverage > 0.5 || geometry.uninterruptedOpenRegionHeightRatio < 0.45) {
    throw new Error(`TEST documentary coverage does not satisfy the repair gate: ${JSON.stringify(geometry)}.`);
  }
  return {
    ...geometry,
    videoRect: Object.fromEntries(
      Object.entries(geometry.videoRect).map(([key, value]) => [key, round(value, 3)]),
    ),
    plateRect: Object.fromEntries(
      Object.entries(geometry.plateRect).map(([key, value]) => [key, round(value, 3)]),
    ),
    opaqueCoverage: round(geometry.opaqueCoverage),
    unobstructedRatio: round(geometry.unobstructedRatio),
    uninterruptedOpenRegionHeightRatio: round(geometry.uninterruptedOpenRegionHeightRatio),
  };
}

const proveSubjectRegions = {
  "projected-stop-symbol": { xMin: 550, yMin: 600, xMax: 1_320, yMax: 1_070 },
  "field-vehicle": { xMin: 780, yMin: 1_660, xMax: 1_600, yMax: 2_040 },
};

async function proveMediaPositions(page) {
  const result = await page.locator(".proof-record__media").evaluate((element, subjectRegions) => {
    const figure = element.getBoundingClientRect();
    const caption = element.querySelector("figcaption");
    if (!(caption instanceof HTMLElement)) throw new Error("Expected PROVE evidence caption.");
    const captionRect = caption.getBoundingClientRect();
    const images = Array.from(element.querySelectorAll("[data-evidence-subject]"));
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    const intersection = (first, second) => ({
      xMin: Math.max(first.xMin, second.xMin),
      yMin: Math.max(first.yMin, second.yMin),
      xMax: Math.min(first.xMax, second.xMax),
      yMax: Math.min(first.yMax, second.yMax),
    });
    const area = (rectangle) => (
      Math.max(0, rectangle.xMax - rectangle.xMin)
      * Math.max(0, rectangle.yMax - rectangle.yMin)
    );
    return {
      figure: { x: figure.x, y: figure.y, width: figure.width, height: figure.height },
      caption: {
        x: captionRect.x,
        y: captionRect.y,
        width: captionRect.width,
        height: captionRect.height,
      },
      images: images.map((candidate) => {
        if (!(candidate instanceof HTMLImageElement)) throw new Error("Expected PROVE image.");
        const rect = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        const coordinates = style.objectPosition.match(/-?[\d.]+%/g)?.map(Number.parseFloat) ?? [];
        const positionX = coordinates[0] ?? 50;
        const positionY = coordinates[1] ?? 50;
        const scale = Math.max(rect.width / candidate.naturalWidth, rect.height / candidate.naturalHeight);
        const renderedWidth = candidate.naturalWidth * scale;
        const renderedHeight = candidate.naturalHeight * scale;
        const offsetX = (rect.width - renderedWidth) * positionX / 100;
        const offsetY = (rect.height - renderedHeight) * positionY / 100;
        const sourceCrop = {
          xMin: clamp(-offsetX / scale, 0, candidate.naturalWidth),
          yMin: clamp(-offsetY / scale, 0, candidate.naturalHeight),
          xMax: clamp((rect.width - offsetX) / scale, 0, candidate.naturalWidth),
          yMax: clamp((rect.height - offsetY) / scale, 0, candidate.naturalHeight),
        };
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Expected a canvas context for PROVE crop verification.");
        const canvasScale = Math.max(
          canvas.width / candidate.naturalWidth,
          canvas.height / candidate.naturalHeight,
        );
        const canvasWidth = candidate.naturalWidth * canvasScale;
        const canvasHeight = candidate.naturalHeight * canvasScale;
        const canvasOffsetX = (canvas.width - canvasWidth) * positionX / 100;
        const canvasOffsetY = (canvas.height - canvasHeight) * positionY / 100;
        context.drawImage(candidate, canvasOffsetX, canvasOffsetY, canvasWidth, canvasHeight);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let subjectColorPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index] ?? 0;
          const green = pixels[index + 1] ?? 0;
          const blue = pixels[index + 2] ?? 0;
          if (red > 130 && red > green * 1.35 && red > blue * 1.12 && red - green > 35) {
            subjectColorPixels += 1;
          }
        }
        const subject = candidate.dataset.evidenceSubject ?? "unknown";
        const subjectRegion = subjectRegions[subject];
        let subjectVisibility = null;
        if (subjectRegion) {
          const visibleRegion = intersection(subjectRegion, sourceCrop);
          const projectedRegion = {
            xMin: rect.x + offsetX + visibleRegion.xMin * scale,
            yMin: rect.y + offsetY + visibleRegion.yMin * scale,
            xMax: rect.x + offsetX + visibleRegion.xMax * scale,
            yMax: rect.y + offsetY + visibleRegion.yMax * scale,
          };
          const captionRegion = {
            xMin: captionRect.left,
            yMin: captionRect.top,
            xMax: captionRect.right,
            yMax: captionRect.bottom,
          };
          subjectVisibility = {
            sourceRegion: subjectRegion,
            visibleSourceRatio: area(subjectRegion) > 0 ? area(visibleRegion) / area(subjectRegion) : 0,
            projectedRegion,
            projectedWidth: Math.max(0, projectedRegion.xMax - projectedRegion.xMin),
            projectedHeight: Math.max(0, projectedRegion.yMax - projectedRegion.yMin),
            captionOverlapRatio:
              area(projectedRegion) > 0
                ? area(intersection(projectedRegion, captionRegion)) / area(projectedRegion)
                : 1,
          };
        }
        return {
          subject,
          alt: candidate.alt,
          decoded: candidate.complete && candidate.naturalWidth > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          naturalWidth: candidate.naturalWidth,
          naturalHeight: candidate.naturalHeight,
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          figureWidthRatio: rect.width / figure.width,
          subjectColorRatio: subjectColorPixels / (canvas.width * canvas.height),
          sourceCrop,
          subjectVisibility,
        };
      }),
    };
  }, proveSubjectRegions);
  if (result.images.length !== 2) throw new Error("PROVE must expose exactly two authored evidence images.");
  const subjects = result.images.map((image) => image.subject);
  if (!subjects.includes("projected-stop-symbol") || !subjects.includes("field-vehicle")) {
    throw new Error(`PROVE evidence subjects are incomplete: ${subjects.join(", ")}.`);
  }
  if (result.images.some((image) => !image.decoded)) {
    throw new Error("PROVE evidence images must be fully decoded before capture.");
  }
  if (result.images.some((image) => image.objectPosition === "50% 50%")) {
    throw new Error("PROVE evidence media must not use default focal positions.");
  }
  const supporting = result.images.find((image) => image.subject === "field-vehicle");
  const primary = result.images.find((image) => image.subject === "projected-stop-symbol");
  const minimumVehicleColorRatio = (page.viewportSize()?.width ?? 1_440) <= 832 ? 0.02 : 0.015;
  if (
    !primary
    || primary.subjectColorRatio < 0.1
    || !primary.subjectVisibility
    || primary.subjectVisibility.visibleSourceRatio < 0.85
    || primary.subjectVisibility.projectedWidth < 100
    || primary.subjectVisibility.projectedHeight < 40
    || primary.subjectVisibility.captionOverlapRatio > 0.01
  ) {
    throw new Error(`PROVE stop-symbol crop lacks its measured subject signature: ${JSON.stringify(primary)}.`);
  }
  if (!supporting || supporting.figureWidthRatio < 0.35) {
    throw new Error("PROVE supporting vehicle still is not materially visible in the composition.");
  }
  if (
    !supporting.subjectVisibility
    || supporting.subjectVisibility.visibleSourceRatio < 0.95
    || supporting.subjectVisibility.projectedWidth < 40
    || supporting.subjectVisibility.projectedHeight < 18
    || supporting.subjectVisibility.captionOverlapRatio > 0.01
    || supporting.subjectColorRatio < minimumVehicleColorRatio
  ) {
    throw new Error(
      `PROVE vehicle subject region is cropped, undersized, or caption-obscured: ${JSON.stringify(supporting)}.`,
    );
  }
  return {
    figure: Object.fromEntries(
      Object.entries(result.figure).map(([key, value]) => [key, round(value, 3)]),
    ),
    caption: Object.fromEntries(
      Object.entries(result.caption).map(([key, value]) => [key, round(value, 3)]),
    ),
    images: result.images.map((image) => ({
      ...image,
      rect: Object.fromEntries(
        Object.entries(image.rect).map(([key, value]) => [key, round(value, 3)]),
      ),
      figureWidthRatio: round(image.figureWidthRatio),
      subjectColorRatio: round(image.subjectColorRatio),
      sourceCrop: Object.fromEntries(
        Object.entries(image.sourceCrop).map(([key, value]) => [key, round(value, 3)]),
      ),
      subjectVisibility: image.subjectVisibility
        ? {
            ...image.subjectVisibility,
            visibleSourceRatio: round(image.subjectVisibility.visibleSourceRatio),
            projectedWidth: round(image.subjectVisibility.projectedWidth, 3),
            projectedHeight: round(image.subjectVisibility.projectedHeight, 3),
            captionOverlapRatio: round(image.subjectVisibility.captionOverlapRatio),
            projectedRegion: Object.fromEntries(
              Object.entries(image.subjectVisibility.projectedRegion)
                .map(([key, value]) => [key, round(value, 3)]),
            ),
          }
        : null,
    })),
  };
}

async function captureAppFrame(page, definition, source) {
  const scrollY = await positionAt(page, definition.phase, definition.progress);
  await setPointer(page, definition.pointer);
  let mediaFrame = null;
  let staticPoster = null;
  if (definition.mode === "reduced-motion") {
    staticPoster = await ensureStaticPoster(page, definition.phase);
  } else if (definition.requestedMediaSeconds !== undefined) {
    mediaFrame = await seekDocumentarySecond(
      page,
      definition.phase,
      definition.requestedMediaSeconds,
    );
  }

  await waitForVisibleImages(page);
  const state = await captureState(page, definition);
  await assertPhaseComposition(page, definition);
  const cropGeometry = definition.phase === "aperture"
    ? await apertureCropGeometry(page, { poster: definition.mode === "reduced-motion" })
    : null;
  const testCoverage = definition.phase === "test" ? await testCoverageGeometry(page) : null;
  const provePositions = definition.phase === "prove" ? await proveMediaPositions(page) : null;

  const outputPath = path.join(stagingDirectory, definition.file);
  const bytes = await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
    animations: "disabled",
  });
  const dimensions = pngDimensions(bytes);
  if (
    dimensions.width !== definition.viewport.width
    || dimensions.height !== definition.viewport.height
  ) {
    throw new Error(`${definition.file} has unexpected PNG dimensions ${dimensions.width}x${dimensions.height}.`);
  }

  return {
    id: definition.id,
    kind: "screenshot",
    file: relative(path.join(repairDirectory, definition.file)),
    profile: definition.profile,
    mode: definition.mode,
    phase: state.activePhase,
    variant: definition.variant,
    viewport: state.viewport,
    pngDimensions: dimensions,
    targetProgress: definition.progress,
    actualProgress: round(state.actualProgress),
    scrollY: Math.round(scrollY),
    renderMode: state.renderMode,
    mediaMode: state.mediaMode,
    mediaFrame,
    staticPoster,
    cropGeometry,
    testCoverage,
    provePositions,
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
    await prepareAppPage(page, `${baseUrl}/${query ? `?${query}` : ""}`);
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
      captures.push(await captureAppFrame(page, definition, source));
    }
    if (errors.length) {
      throw new Error(`Application errors during ${profile}/${mode} capture:\n${errors.join("\n")}`);
    }
    return captures;
  } finally {
    await context.close();
  }
}

async function loadStandaloneVideo(page, bytes, id = "evidence-video") {
  const dataUrl = `data:video/webm;base64,${bytes.toString("base64")}`;
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #000; }
          video { display: block; width: 100vw; height: 100vh; object-fit: fill; }
        </style>
      </head>
      <body><video id="${id}" muted playsinline preload="auto" src="${dataUrl}"></video></body>
    </html>`, { waitUntil: "load" });
  await page.waitForFunction(
    (videoId) => {
      const video = document.getElementById(videoId);
      return video instanceof HTMLVideoElement
        && video.readyState >= HTMLMediaElement.HAVE_METADATA
        && Number.isFinite(video.duration)
        && video.duration > 0;
    },
    id,
    { timeout: 20_000 },
  );
}

async function seekStandaloneVideo(page, id, requestedSeconds) {
  return page.locator(`#${id}`).evaluate(async (element, requested) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected standalone evidence video.");
    if (requested > element.duration) {
      throw new Error(`Requested ${requested}s exceeds ${element.duration}s baseline duration.`);
    }
    element.pause();
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Timed out seeking standalone evidence video.")),
        8_000,
      );
      element.addEventListener("seeked", () => {
        window.clearTimeout(timeout);
        resolve(undefined);
      }, { once: true });
      element.currentTime = Number(requested);
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      requestedSeconds: Number(requested),
      actualSeconds: element.currentTime,
      durationSeconds: element.duration,
      videoWidth: element.videoWidth,
      videoHeight: element.videoHeight,
      readyState: element.readyState,
      paused: element.paused,
    };
  }, requestedSeconds);
}

async function captureBaselineFrame(source) {
  const journeyBytes = await readFile(priorJourneyPath);
  const journeySha256 = sha256(journeyBytes);
  if (journeySha256 !== expectedPriorJourneySha256) {
    throw new Error(
      `Prior Phase 2 journey hash ${journeySha256} does not match the accepted baseline `
        + `${expectedPriorJourneySha256}.`,
    );
  }
  const context = await browser.newContext(contextOptions("desktop", "normal"));
  const page = await context.newPage();
  const errors = monitorPage(page);
  try {
    await loadStandaloneVideo(page, journeyBytes, "baseline-video");
    const mediaFrame = await seekStandaloneVideo(
      page,
      "baseline-video",
      baselineDefinition.requestedMediaSeconds,
    );
    if (
      mediaFrame.videoWidth !== desktopViewport.width
      || mediaFrame.videoHeight !== desktopViewport.height
      || mediaFrame.readyState < 2
      || !mediaFrame.paused
    ) {
      throw new Error(`Baseline journey failed decode/dimension verification: ${JSON.stringify(mediaFrame)}.`);
    }
    if (Math.abs(mediaFrame.actualSeconds - baselineDefinition.requestedMediaSeconds) > 0.04) {
      throw new Error(`Baseline frame resolved at ${mediaFrame.actualSeconds}s instead of 9.40s.`);
    }
    const outputPath = path.join(stagingDirectory, baselineDefinition.file);
    const screenshot = await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: false,
      animations: "disabled",
    });
    const dimensions = pngDimensions(screenshot);
    if (
      dimensions.width !== desktopViewport.width
      || dimensions.height !== desktopViewport.height
    ) {
      throw new Error(`Baseline PNG dimensions are ${dimensions.width}x${dimensions.height}.`);
    }
    if (errors.length) {
      throw new Error(`Baseline extraction errors:\n${errors.join("\n")}`);
    }
    return {
      id: baselineDefinition.id,
      kind: "baseline-screenshot",
      file: relative(path.join(repairDirectory, baselineDefinition.file)),
      profile: baselineDefinition.profile,
      mode: baselineDefinition.mode,
      phase: baselineDefinition.phase,
      viewport: desktopViewport,
      pngDimensions: dimensions,
      mediaFrame: {
        ...mediaFrame,
        requestedSeconds: round(mediaFrame.requestedSeconds, 3),
        actualSeconds: round(mediaFrame.actualSeconds, 6),
        durationSeconds: round(mediaFrame.durationSeconds, 6),
      },
      sourceArtifact: {
        file: relative(priorJourneyPath),
        sha256: journeySha256,
        expectedSha256: expectedPriorJourneySha256,
        bytes: journeyBytes.length,
      },
      sourceHead: source.sourceHead,
      sourceCandidate: source.sourceCandidate,
      capturedAt: new Date().toISOString(),
      sha256: sha256(screenshot),
      bytes: screenshot.length,
    };
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

async function ensureDocumentaryPlaying(page, phase) {
  const selector = `video[data-documentary-video][data-media-phase="${phase}"]`;
  await page.waitForFunction(
    (requestedPhase) => {
      const video = document.querySelector(
        `video[data-documentary-video][data-media-phase="${requestedPhase}"]`,
      );
      return video instanceof HTMLVideoElement
        && video.dataset.mediaLoaded === "true"
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    },
    phase,
    { timeout: 20_000 },
  );
  return page.locator(selector).evaluate(async (element) => {
    if (!(element instanceof HTMLVideoElement)) throw new Error("Expected documentary video.");
    element.muted = true;
    await element.play();
    return {
      currentTime: element.currentTime,
      duration: element.duration,
      loop: element.loop,
      paused: element.paused,
    };
  });
}

async function probeVideoArtifact(videoPath, expectedViewport) {
  const bytes = await readFile(videoPath);
  const context = await browser.newContext({
    viewport: expectedViewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const errors = monitorPage(page);
  try {
    await loadStandaloneVideo(page, bytes, "probe-video");
    const result = await page.locator("#probe-video").evaluate(async (element) => {
      if (!(element instanceof HTMLVideoElement)) throw new Error("Expected probe video.");
      const target = Math.min(Math.max(element.duration * 0.5, 0.1), element.duration - 0.01);
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error("Timed out seeking video probe.")),
          8_000,
        );
        element.addEventListener("seeked", () => {
          window.clearTimeout(timeout);
          resolve(undefined);
        }, { once: true });
        element.currentTime = target;
      });
      let decodedFrame = false;
      if (typeof element.requestVideoFrameCallback === "function") {
        const framePromise = new Promise((resolve) => {
          element.requestVideoFrameCallback(() => {
            decodedFrame = true;
            resolve(undefined);
          });
        });
        await element.play();
        await Promise.race([
          framePromise,
          new Promise((resolve) => window.setTimeout(resolve, 2_000)),
        ]);
      } else {
        await element.play();
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        decodedFrame = element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
      }
      element.pause();
      return {
        durationSeconds: element.duration,
        videoWidth: element.videoWidth,
        videoHeight: element.videoHeight,
        readyState: element.readyState,
        decodedFrame,
      };
    });
    if (
      result.videoWidth !== expectedViewport.width
      || result.videoHeight !== expectedViewport.height
      || result.readyState < 2
      || !result.decodedFrame
    ) {
      throw new Error(`Journey WebM failed decode/dimension verification: ${JSON.stringify(result)}.`);
    }
    if (errors.length) throw new Error(`Journey probe errors:\n${errors.join("\n")}`);
    return {
      ...result,
      durationSeconds: round(result.durationSeconds, 6),
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
  } finally {
    await context.close();
  }
}

async function recordDesktopJourney(baseUrl, source) {
  const videoStagingDirectory = path.join(stagingDirectory, ".video");
  await mkdir(videoStagingDirectory, { recursive: true });
  const context = await browser.newContext({
    ...contextOptions("desktop", "normal"),
    recordVideo: { dir: videoStagingDirectory, size: desktopViewport },
  });
  const page = await context.newPage();
  const errors = monitorPage(page);
  let video;
  let timeline = [];
  let apertureDwell;
  try {
    await prepareAppPage(page, `${baseUrl}/`, { freezeTransitions: false });
    await page.mouse.move(979, 414);
    await page.waitForFunction(
      () => document.documentElement.dataset.renderMode === "webgl-enhanced",
      undefined,
      { timeout: 10_000 },
    );
    video = page.video();
    if (!video) throw new Error("Playwright did not provide a repair journey video artifact.");
    const journeyStartedAt = await page.evaluate(() => performance.now());
    await page.waitForTimeout(500);

    for (const stop of journeyDefinition.phaseSequence) {
      const destination = await targetScrollY(page, stop.phase, stop.progress);
      await animateScroll(page, destination);
      await waitForPhaseState(page, stop.phase, stop.progress);
      if (stop.phase === "aperture") {
        await page.mouse.move(1080, 510, { steps: 14 });
        const mediaAtStart = await ensureDocumentaryPlaying(page, "aperture");
        const dwellStartedAt = await page.evaluate(() => performance.now());
        await page.waitForTimeout(journeyDefinition.apertureRequestedDwellMs);
        const dwellEndedAt = await page.evaluate(() => performance.now());
        const mediaAtEnd = await page.locator(
          'video[data-documentary-video][data-media-phase="aperture"]',
        ).evaluate((element) => {
          if (!(element instanceof HTMLVideoElement)) throw new Error("Expected APERTURE video.");
          return {
            currentTime: element.currentTime,
            duration: element.duration,
            loop: element.loop,
            paused: element.paused,
          };
        });
        apertureDwell = {
          requiredMinimumMs: journeyDefinition.apertureMinimumDwellMs,
          requestedMs: journeyDefinition.apertureRequestedDwellMs,
          actualMs: round(dwellEndedAt - dwellStartedAt, 3),
          startMediaSeconds: round(mediaAtStart.currentTime, 6),
          endMediaSeconds: round(mediaAtEnd.currentTime, 6),
          mediaDurationSeconds: round(mediaAtEnd.duration, 6),
          loop: mediaAtEnd.loop,
          playingAtStart: !mediaAtStart.paused,
          playingAtEnd: !mediaAtEnd.paused,
          completeLoopExposureGuaranteedByDwell:
            (dwellEndedAt - dwellStartedAt) / 1_000 >= mediaAtEnd.duration,
        };
        if (
          apertureDwell.actualMs < journeyDefinition.apertureMinimumDwellMs
          || !apertureDwell.completeLoopExposureGuaranteedByDwell
        ) {
          throw new Error(`Journey APERTURE dwell is insufficient: ${JSON.stringify(apertureDwell)}.`);
        }
      } else if (stop.phase === "test") {
        await seekDocumentarySecond(page, "test", 0.7);
        await page.locator('video[data-documentary-video][data-media-phase="test"]').evaluate(
          async (element) => {
            if (!(element instanceof HTMLVideoElement)) throw new Error("Expected TEST video.");
            await element.play();
          },
        );
        await page.waitForTimeout(stop.settleMs);
      } else {
        await page.waitForTimeout(stop.settleMs);
      }
      const reachedAt = await page.evaluate(() => performance.now());
      const actualState = await page.evaluate(() => ({
        phase: document.documentElement.dataset.activePhase ?? "unknown",
        progress: Number.parseFloat(
          document.documentElement.style.getPropertyValue("--active-progress") || "-1",
        ),
      }));
      timeline.push({
        phase: stop.phase,
        targetProgress: stop.progress,
        actualProgress: round(actualState.progress),
        reachedAtMs: round(reachedAt - journeyStartedAt, 3),
        requestedSettleMs: stop.settleMs,
      });
    }
  } finally {
    await context.close();
  }

  if (errors.length) {
    throw new Error(`Application errors during repair journey capture:\n${errors.join("\n")}`);
  }
  const recordedPath = await video.path();
  const finalStagedPath = path.join(stagingDirectory, journeyDefinition.file);
  await rename(recordedPath, finalStagedPath);
  await rm(videoStagingDirectory, { recursive: true, force: true });
  const probe = await probeVideoArtifact(finalStagedPath, desktopViewport);
  return {
    id: journeyDefinition.id,
    kind: "video",
    file: relative(path.join(repairDirectory, journeyDefinition.file)),
    profile: journeyDefinition.profile,
    mode: journeyDefinition.mode,
    viewport: journeyDefinition.viewport,
    phase: "complete-journey",
    phaseSequence: timeline,
    apertureDwell,
    decodeVerification: {
      status: "decoded-frame-and-dimensions-verified",
      durationSeconds: probe.durationSeconds,
      videoWidth: probe.videoWidth,
      videoHeight: probe.videoHeight,
      readyState: probe.readyState,
      decodedFrame: probe.decodedFrame,
    },
    sourceHead: source.sourceHead,
    sourceCandidate: source.sourceCandidate,
    capturedAt: new Date().toISOString(),
    sha256: probe.sha256,
    bytes: probe.bytes,
  };
}

function regexMatches(value, expression) {
  return Array.from(value.matchAll(expression), (match) => match[0]);
}

async function auditVisibleWorkflowLanguage(baseUrl) {
  const context = await browser.newContext(contextOptions("desktop", "normal"));
  const page = await context.newPage();
  const errors = monitorPage(page);
  const routes = [];
  try {
    for (const route of workflowAuditRoutes) {
      await prepareAppPage(page, `${baseUrl}${route}`, { requireApplicationState: false });
      const main = page.locator("main");
      const visibleText = await main.innerText();
      const html = await page.content();
      const visibleWorkflowMatches = regexMatches(
        visibleText,
        /\b(?:approved|approval|classification|publicApproved|publication)\b/gi,
      );
      const rejectedPhraseMatches = regexMatches(
        html,
        /approved\s+field\s+record|approved\s+need|approved\s+public\s+record/gi,
      );
      routes.push({
        route,
        finalUrl: page.url(),
        visibleTextSha256: sha256(Buffer.from(visibleText)),
        visibleTextBytes: Buffer.byteLength(visibleText),
        visibleWorkflowMatches,
        rejectedPhraseMatches,
      });
    }
    const homepageText = await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" })
      .then(() => page.locator("main").innerText());
    const requiredEditorialLabels = [
      "Field record / SPARK",
      "Field condition",
      "Proof / field record",
      "Field evidence / documentary stills",
    ];
    const missingEditorialLabels = requiredEditorialLabels.filter(
      (label) => !homepageText.toLowerCase().includes(label.toLowerCase()),
    );
    const violations = routes.flatMap((route) => [
      ...route.visibleWorkflowMatches.map((match) => `${route.route}: visible ${match}`),
      ...route.rejectedPhraseMatches.map((match) => `${route.route}: source ${match}`),
    ]);
    if (missingEditorialLabels.length) {
      violations.push(`Homepage missing editorial labels: ${missingEditorialLabels.join(", ")}`);
    }
    if (errors.length) violations.push(...errors);
    if (violations.length) {
      throw new Error(`Public workflow-language audit failed:\n${violations.join("\n")}`);
    }
    return {
      status: "passed",
      auditedSurface: "visible main text plus rejected named phrases in rendered HTML",
      rejectedVisiblePattern: "approved|approval|classification|publicApproved|publication",
      rejectedNamedPhrases: [
        "APPROVED FIELD RECORD",
        "APPROVED NEED",
        "APPROVED PUBLIC RECORD",
      ],
      requiredEditorialLabels,
      missingEditorialLabels,
      routes,
    };
  } finally {
    await context.close();
  }
}

async function verifyArtifactRecords(records, outputDirectory = repairDirectory) {
  for (const record of records) {
    const filePath = path.join(outputDirectory, path.basename(record.file));
    const bytes = await readFile(filePath);
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
      throw new Error(`${record.file} does not match its recorded byte/hash integrity.`);
    }
    if (record.kind === "screenshot" || record.kind === "baseline-screenshot") {
      const dimensions = pngDimensions(bytes);
      if (
        dimensions.width !== record.viewport.width
        || dimensions.height !== record.viewport.height
      ) {
        throw new Error(`${record.file} failed final PNG dimension verification.`);
      }
    }
  }
}

async function assertStagingShape() {
  const names = (await readdir(stagingDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = expectedOutputNames.slice().sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(
      `Incomplete repair package staging. Expected ${expected.join(", ")}; received ${names.join(", ")}.`,
    );
  }
}

async function promoteStaging() {
  const existing = (await readdir(repairDirectory)).filter(
    (name) => name !== path.basename(stagingDirectory),
  );
  if (existing.length) {
    throw new Error(`Refusing to overwrite repair evidence during promotion: ${existing.join(", ")}.`);
  }
  for (const name of expectedOutputNames) {
    await rename(path.join(stagingDirectory, name), path.join(repairDirectory, name));
  }
  await rm(stagingDirectory, { recursive: true, force: true });
  stagingDirectory = undefined;

  const finalNames = (await readdir(repairDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = expectedOutputNames.slice().sort();
  if (JSON.stringify(finalNames) !== JSON.stringify(expected)) {
    throw new Error("Final repair evidence directory does not contain the exact expected file set.");
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

  const source = await strictSourceMetadata();
  const priorBefore = await priorEvidenceInventory();
  await access(priorJourneyPath);
  await prepareEmptyRepairDirectory();

  if (process.env.PHASE2_REPAIR_EVIDENCE_SKIP_BUILD !== "1") {
    await runNpm(["run", "build"]);
  } else {
    await access(path.join(rootDirectory, "dist", "index.html"));
  }

  const port = await reservePort();
  const baseUrl = `http://${host}:${port}`;
  previewProcess = startPreview(port);
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });

  const baseline = await captureBaselineFrame(source);
  const captures = [
    ...await captureGroup(
      baseUrl,
      [...desktopApertureDefinitions, ...desktopSettledDefinitions],
      "desktop",
      "normal",
      source,
    ),
    ...await captureGroup(baseUrl, mobileDefinitions, "mobile", "normal", source),
    ...await captureGroup(baseUrl, [fallbackDefinitions[0]], "fallback", "reduced-motion", source),
    ...await captureGroup(baseUrl, [fallbackDefinitions[1]], "fallback", "no-webgl", source),
  ];
  if (captures.length !== appScreenshotDefinitions.length) {
    throw new Error(`Expected ${appScreenshotDefinitions.length} application screenshots; captured ${captures.length}.`);
  }

  const allScreenshots = [baseline, ...captures];
  if (allScreenshots.length !== 16) {
    throw new Error(`Expected exactly 16 screenshots; captured ${allScreenshots.length}.`);
  }
  if (new Set(allScreenshots.map((capture) => capture.sha256)).size !== allScreenshots.length) {
    throw new Error("Repair screenshot package contains duplicate rendered frames.");
  }

  const proveCaptures = captures.filter((capture) => capture.phase === "prove");
  if (
    proveCaptures.length !== 2
    || JSON.stringify(proveCaptures[0].provePositions.images.map((image) => image.objectPosition))
      === JSON.stringify(proveCaptures[1].provePositions.images.map((image) => image.objectPosition))
  ) {
    throw new Error("Desktop and mobile PROVE evidence must record separate authored focal positions.");
  }

  const workflowAudit = await auditVisibleWorkflowLanguage(baseUrl);
  const journey = await recordDesktopJourney(baseUrl, source);
  const priorAfterCapture = await priorEvidenceInventory();
  assertInventoryUnchanged(priorBefore, priorAfterCapture, "during repair capture");

  await verifyArtifactRecords([...allScreenshots, journey], stagingDirectory);
  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase 2 / final visual integration repair evidence",
    generatedAt: new Date().toISOString(),
    source,
    server: {
      type: "isolated-astro-production-preview",
      baseUrl,
      buildSkipped: process.env.PHASE2_REPAIR_EVIDENCE_SKIP_BUILD === "1",
      externalServerAllowed: false,
      astroDevToolbarAllowed: false,
    },
    contract: {
      screenshotCount: 16,
      baselineScreenshots: 1,
      desktopApertureSequenceScreenshots: 7,
      desktopSettledScreenshots: 3,
      mobileScreenshots: 3,
      fallbackScreenshots: 2,
      journeyVideos: 1,
      desktopViewport,
      mobileViewport,
      apertureDesktopRequestedSeconds: desktopApertureDefinitions.map(
        (definition) => definition.requestedMediaSeconds,
      ),
      apertureMobileRequestedSeconds: [3.05],
      apertureNoWebglRequestedSeconds: [3.05],
      testRequestedSeconds: 0.7,
      baselineRequestedSeconds: 9.4,
      journeyApertureMinimumDwellMs: journeyDefinition.apertureMinimumDwellMs,
      exactOutputFiles: expectedOutputNames,
    },
    priorEvidencePolicy:
      "Every pre-existing artifacts/review file outside phase2-repair was read and hashed; capture and promotion abort on any difference.",
    priorEvidenceIntegrity: {
      status: "verified-unchanged-after-capture",
      fileCount: priorBefore.length,
      beforeDigest: inventoryDigest(priorBefore),
      afterCaptureDigest: inventoryDigest(priorAfterCapture),
      files: priorBefore,
    },
    visibleWorkflowAudit: workflowAudit,
    captures: allScreenshots,
    journey,
    verification: {
      exactInventoryStaged: true,
      everyScreenshotPngDecodedAndDimensionChecked: true,
      everyArtifactHashAndByteCountChecked: true,
      journeyWebmDecodedFrameChecked: true,
      journeyDimensionsChecked: true,
      priorEvidenceUnchangedBeforePromotion: true,
    },
  };
  await writeFile(
    path.join(stagingDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await assertStagingShape();
  await promoteStaging();

  const priorAfterPromotion = await priorEvidenceInventory();
  assertInventoryUnchanged(priorBefore, priorAfterPromotion, "after repair-package promotion");
  await verifyArtifactRecords([...allScreenshots, journey]);

  console.log("Phase 2 repair evidence captured: 16 PNGs, 1 complete journey WebM, and 1 manifest.");
  console.log(`Manifest: ${relative(path.join(repairDirectory, "manifest.json"))}`);
  console.log(`Candidate: ${source.sourceCandidate}`);
  console.log(`Prior-evidence digest: ${inventoryDigest(priorBefore)}`);
}

process.once("SIGINT", () => void shutdown().finally(() => process.exit(130)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(143)));

try {
  await main();
} finally {
  await shutdown();
}
