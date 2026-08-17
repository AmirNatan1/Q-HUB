#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
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
const outputDirectory = path.join(rootDirectory, "artifacts", "review", "phase-rx");
const phaseREvidenceDirectory = path.join(rootDirectory, "artifacts", "review", "phase-r");
const astroCliPath = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");
const host = "127.0.0.1";
const viewport = Object.freeze({ width: 1440, height: 900 });
const argumentsMap = new Map(
  process.argv.slice(2).map((argument) => {
    const [name, value = "true"] = argument.replace(/^--/u, "").split("=");
    return [name, value];
  }),
);
const stage = argumentsMap.get("stage") ?? "baseline";
const pace = argumentsMap.get("pace") ?? "continuous";
const skipBuild = argumentsMap.get("skip-build") === "true";
const supportedStages = new Set(["baseline", "candidate"]);
const supportedPaces = new Set(["continuous", "slow"]);
const expectedCandidateBranch = "repair/phase-rx-experience-integration-scroll-fluidity";

if (!supportedStages.has(stage)) {
  throw new Error(`--stage must be baseline or candidate; received ${stage}.`);
}
if (!supportedPaces.has(pace)) {
  throw new Error(`--pace must be continuous or slow; received ${pace}.`);
}
if (stage === "baseline" && pace !== "continuous") {
  throw new Error("The baseline evidence contract uses the continuous pace only.");
}

const outputStem = stage === "baseline"
  ? "baseline-continuous-scroll"
  : pace === "slow"
    ? "candidate-slow-review"
    : "candidate-continuous-scroll";
const videoPath = path.join(outputDirectory, `${outputStem}.webm`);
const diagnosticPath = path.join(outputDirectory, `${outputStem}-diagnostic.json`);
const inputPattern = pace === "slow"
  ? { deltaY: 58, intervalMs: 88, initialDwellMs: 650, finalDwellMs: 850 }
  : { deltaY: 96, intervalMs: 52, initialDwellMs: 500, finalDwellMs: 650 };

let previewProcess;
let browser;

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function statusPath(line) {
  const value = line.trimStart()
    .replace(/^(?:\?\?|[MADRCU]{1,2})\s+/u, "")
    .replaceAll("\\", "/");
  return value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
}

async function sourceMetadata() {
  const [actualHead, tree, actualBranch, status] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  const declaredHead = process.env.PHASE_RX_SOURCE_HEAD?.trim() || null;
  const declaredBranch = process.env.PHASE_RX_SOURCE_BRANCH?.trim() || null;
  if (stage === "candidate") {
    if (actualBranch !== expectedCandidateBranch) {
      throw new Error(`Candidate diagnostic requires ${expectedCandidateBranch}; received ${actualBranch}.`);
    }
    if (declaredHead !== actualHead || declaredBranch !== actualBranch) {
      throw new Error(
        `Candidate diagnostic source declaration ${declaredHead}/${declaredBranch} does not equal `
          + `${actualHead}/${actualBranch}.`,
      );
    }
    const unexpected = status.split(/\r?\n/u).filter(Boolean).filter((line) => {
      const file = statusPath(line);
      return file !== "artifacts/performance/phase-r.zip"
        && !file.startsWith("artifacts/review/phase-rx/")
        && !file.startsWith("artifacts/performance/phase-rx/");
    });
    if (unexpected.length) {
      throw new Error(`Candidate diagnostic has unexpected working changes:\n${unexpected.join("\n")}`);
    }
  }
  return {
    head: declaredHead,
    branch: declaredBranch,
    actualHead,
    actualBranch,
    tree,
    candidateVerified: stage === "candidate",
    statusAtStart: status,
    preservedPreExistingDeletion: status.includes("artifacts/performance/phase-r.zip"),
  };
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath));
    if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

async function directoryDigest(directory) {
  const files = (await listFiles(directory)).sort((left, right) => left.localeCompare(right));
  const entries = await Promise.all(files.map(async (filePath) => {
    const bytes = await readFile(filePath);
    return {
      file: path.relative(rootDirectory, filePath).split(path.sep).join("/"),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  }));
  return {
    count: entries.length,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    digest: sha256(Buffer.from(entries.map((entry) => (
      `${entry.file}\0${entry.bytes}\0${entry.sha256}`
    )).join("\n"))),
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
        else reject(new Error("Unable to reserve a preview port."));
      });
    });
  });
}

async function runBuild() {
  await new Promise((resolve, reject) => {
    const command = process.platform === "win32"
      ? process.env.ComSpec ?? "cmd.exe"
      : "npm";
    const argumentsList = process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run build"]
      : ["run", "build"];
    const child = spawn(command, argumentsList, {
      cwd: rootDirectory,
      env: { ...process.env },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Production build exited with code ${code}.`));
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
      throw new Error(`Production preview exited before it was ready (${previewProcess?.exitCode}).`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Preview startup may briefly refuse connections.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopPreview() {
  if (!previewProcess?.pid || previewProcess.exitCode !== null) return;
  previewProcess.kill();
  await Promise.race([
    new Promise((resolve) => previewProcess.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
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

function installPerformanceProbe() {
  const state = {
    startedAt: performance.now(),
    lastFrameAt: 0,
    frameIntervals: [],
    longTaskSupported: false,
    longTasks: [],
    wheelInputs: [],
    scrollFrames: [],
    inputStartedAt: 0,
    lastInputAt: 0,
  };
  let pendingWheelDelta = 0;
  let pendingWheelCount = 0;
  let scrollSampleFrame = 0;
  let lastScrollSnapshot;
  const number = (value) => {
    const parsed = Number.parseFloat(value || "0");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const matrixParts = (transform) => {
    if (!transform || transform === "none") return [1, 0, 0, 1, 0, 0];
    const match = transform.match(/^matrix\(([^)]+)\)$/u);
    return match ? match[1].split(",").map((part) => number(part)) : [0, 0, 0, 0, 0, 0];
  };
  const describe = (element, pseudo) => {
    if (!(element instanceof Element)) return [0, 0, 0, 0, 0, 0, 0];
    const style = getComputedStyle(element, pseudo);
    return [number(style.opacity), ...matrixParts(style.transform)];
  };
  const snapshot = () => {
    const root = document.documentElement;
    const phase = root.dataset.activePhase ?? "unknown";
    const section = document.querySelector(`[data-experience-phase="${CSS.escape(phase)}"]`);
    let visualVector = [];
    if (phase === "access") {
      visualVector = [...document.querySelectorAll("[data-partner-id]")]
        .flatMap((element) => describe(element));
    } else if (phase === "startup") {
      const signal = document.querySelector(".field-crossing__signal");
      const constraint = document.querySelector(".field-crossing__constraint--first");
      const field = document.querySelector(".field-crossing__field");
      const signalStyle = signal ? getComputedStyle(signal) : null;
      const constraintStyle = constraint ? getComputedStyle(constraint) : null;
      const fieldStyle = field ? getComputedStyle(field) : null;
      visualVector = [
        signalStyle ? number(signalStyle.left) : 0,
        signalStyle ? number(signalStyle.width) : 0,
        signalStyle ? number(signalStyle.height) : 0,
        signalStyle ? number(signalStyle.borderRadius) : 0,
        constraintStyle ? number(constraintStyle.height) : 0,
        fieldStyle ? number(fieldStyle.opacity) : 0,
      ];
    } else if (phase === "method") {
      const instrument = document.querySelector(".method-instrument");
      visualVector = [
        ...describe(instrument),
        ...describe(instrument, "::before"),
        ...describe(instrument, "::after"),
        ...[...document.querySelectorAll(".method-instrument > *")]
          .flatMap((element) => describe(element)),
        ...[...document.querySelectorAll("[data-method-word]")]
          .flatMap((element) => describe(element)),
      ];
    } else if (phase === "activity") {
      visualVector = [
        ...[...document.querySelectorAll("[data-activity-geometry]")]
          .flatMap((element) => describe(element)),
        ...[...document.querySelectorAll("[data-activity-signal]")]
          .flatMap((element) => describe(element)),
      ];
    } else if (section) {
      visualVector = describe(section.querySelector(".phase-r-display"));
    }
    const localProgress = section instanceof HTMLElement
      ? number(section.style.getPropertyValue("--local-progress"))
      : -1;
    return {
      timestamp: performance.now(),
      scrollY: window.scrollY,
      maximumScrollY: Math.max(document.documentElement.scrollHeight - innerHeight, 0),
      phase,
      localProgress,
      activeProgress: number(root.style.getPropertyValue("--active-progress")),
      substate: phase === "access"
        ? section?.getAttribute("data-partner-state")
        : phase === "startup"
          ? section?.getAttribute("data-crossing-state")
          : phase === "method"
            ? section?.getAttribute("data-method-state")
            : phase === "activity"
              ? section?.getAttribute("data-activity-state")
              : phase === "presence"
                ? section?.getAttribute("data-presence-state")
                : null,
      partnerFocus: root.dataset.partnerFocus ?? null,
      visualVector: visualVector.map((value) => Math.round(value * 1000) / 1000),
      renderMode: root.dataset.renderMode ?? null,
    };
  };
  const vectorDelta = (before, after) => {
    const length = Math.max(before.length, after.length);
    let maximum = 0;
    let total = 0;
    for (let index = 0; index < length; index += 1) {
      const delta = Math.abs((after[index] ?? 0) - (before[index] ?? 0));
      maximum = Math.max(maximum, delta);
      total += delta;
    }
    return {
      maximum: Math.round(maximum * 1000) / 1000,
      total: Math.round(total * 1000) / 1000,
    };
  };
  const frame = (timestamp) => {
    if (state.lastFrameAt > 0) state.frameIntervals.push(timestamp - state.lastFrameAt);
    state.lastFrameAt = timestamp;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  try {
    const supported = PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false;
    state.longTaskSupported = supported;
    if (supported) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
    }
  } catch {
    state.longTaskSupported = false;
  }
  window.addEventListener("wheel", (event) => {
    const timestamp = performance.now();
    if (!state.inputStartedAt) state.inputStartedAt = timestamp;
    state.lastInputAt = timestamp;
    pendingWheelDelta += event.deltaY;
    pendingWheelCount += 1;
    state.wheelInputs.push({
      timestamp,
      requestedAtMs: timestamp - state.inputStartedAt,
      deltaY: event.deltaY,
      scrollY: window.scrollY,
      phase: document.documentElement.dataset.activePhase ?? "unknown",
    });
  }, { passive: true });
  window.addEventListener("scroll", () => {
    if (scrollSampleFrame) return;
    const before = lastScrollSnapshot ?? snapshot();
    scrollSampleFrame = requestAnimationFrame(() => requestAnimationFrame(() => {
      scrollSampleFrame = 0;
      const after = snapshot();
      const visualDelta = vectorDelta(before.visualVector, after.visualVector);
      const scrollDelta = after.scrollY - before.scrollY;
      const phaseChanged = before.phase !== after.phase;
      const stateChanged = before.substate !== after.substate
        || before.partnerFocus !== after.partnerFocus;
      state.scrollFrames.push({
        step: state.scrollFrames.length,
        requestedAtMs: before.timestamp - state.inputStartedAt,
        wheelDeltaY: pendingWheelDelta,
        coalescedWheelInputs: pendingWheelCount,
        before: {
          timestamp: before.timestamp,
          scrollY: before.scrollY,
          phase: before.phase,
          substate: before.substate,
          partnerFocus: before.partnerFocus,
          localProgress: before.localProgress,
          activeProgress: before.activeProgress,
        },
        after: {
          timestamp: after.timestamp,
          scrollY: after.scrollY,
          phase: after.phase,
          substate: after.substate,
          partnerFocus: after.partnerFocus,
          localProgress: after.localProgress,
          activeProgress: after.activeProgress,
        },
        scrollDelta,
        scrollChanged: Math.abs(scrollDelta) > 1,
        activeProgressDelta: Math.abs(after.activeProgress - before.activeProgress),
        visualDelta,
        visualProgressChanged: visualDelta.maximum >= 0.5 || visualDelta.total >= 1,
        phaseChanged,
        stateChanged,
      });
      pendingWheelDelta = 0;
      pendingWheelCount = 0;
      lastScrollSnapshot = after;
    }));
  }, { passive: true });
  state.snapshot = snapshot;
  window.__phaseRxPerformance = state;
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
  const sorted = intervals.filter(Number.isFinite).sort((left, right) => left - right);
  return {
    samples: sorted.length,
    p50Ms: round(quantile(sorted, 0.5)),
    p95Ms: round(quantile(sorted, 0.95)),
    p99Ms: round(quantile(sorted, 0.99)),
    over33_3Ms: sorted.filter((value) => value > 33.3).length,
    over50Ms: sorted.filter((value) => value > 50).length,
    maxMs: round(sorted.at(-1) ?? Number.NaN),
  };
}

async function decodeVideoMetadata(page, targetPath) {
  const bytes = await readFile(targetPath);
  const dataUrl = `data:video/webm;base64,${bytes.toString("base64")}`;
  await page.setContent(`<!doctype html><html><body><video id="probe" muted preload="auto" src="${dataUrl}"></video></body></html>`);
  await page.waitForFunction(() => {
    const video = document.querySelector("#probe");
    return video instanceof HTMLVideoElement
      && video.readyState >= HTMLMediaElement.HAVE_METADATA
      && Number.isFinite(video.duration)
      && video.duration > 0;
  }, undefined, { timeout: 30_000 });
  return page.locator("#probe").evaluate((video) => ({
    durationSeconds: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
  }));
}

async function runJourney(baseUrl) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    recordVideo: { dir: outputDirectory, size: viewport },
  });
  await context.addInitScript(installPerformanceProbe);
  const page = await context.newPage();
  const video = page.video();
  if (!video) throw new Error("Playwright did not provide a journey video.");
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Homepage returned ${response?.status() ?? "no response"}.`);
  await page.waitForFunction(() => document.documentElement.dataset.activePhase === "presence");
  await page.mouse.move(viewport.width * 0.68, viewport.height * 0.46, { steps: 8 });
  await page.waitForTimeout(inputPattern.initialDwellMs);

  const journeyStartedAt = Date.now();
  const maximumScrollY = await page.evaluate(() => (
    Math.max(document.documentElement.scrollHeight - innerHeight, 0)
  ));
  const requestedSteps = Math.ceil(maximumScrollY / inputPattern.deltaY) + 16;
  for (let step = 0; step < requestedSteps; step += 1) {
    await page.mouse.wheel(0, inputPattern.deltaY);
    await page.waitForTimeout(inputPattern.intervalMs);
  }
  await page.waitForTimeout(inputPattern.finalDwellMs);
  const { finalSnapshot, performanceState } = await page.evaluate(() => {
    const runtime = window.__phaseRxPerformance;
    const snapshotNow = runtime.snapshot();
    const clone = {
      ...runtime,
      snapshot: undefined,
    };
    return {
      finalSnapshot: structuredClone(snapshotNow),
      performanceState: structuredClone(clone),
    };
  });
  const samples = performanceState.scrollFrames;
  const browserVersion = browser.version();
  const userAgent = await page.evaluate(() => navigator.userAgent);
  await page.close();
  const recordedPath = await video.path();
  await copyFile(recordedPath, videoPath);
  await context.close();

  const targetPhases = new Set(["access", "startup", "method", "activity"]);
  const targetSamples = samples.filter((sample) => targetPhases.has(sample.after.phase));
  const responsiveSamples = targetSamples.filter((sample) => (
    sample.scrollChanged && sample.visualProgressChanged
  ));
  const deadSamples = targetSamples.filter((sample) => (
    sample.scrollChanged
    && !sample.visualProgressChanged
    && !sample.phaseChanged
    && !sample.stateChanged
  ));
  const byPhase = Object.fromEntries([...targetPhases].map((phase) => {
    const phaseSamples = targetSamples.filter((sample) => sample.after.phase === phase);
    const phaseDead = phaseSamples.filter((sample) => deadSamples.includes(sample));
    return [phase, {
      inputSamples: phaseSamples.length,
      scrollResponsiveSamples: phaseSamples.filter((sample) => sample.scrollChanged).length,
      visuallyResponsiveSamples: phaseSamples.filter((sample) => sample.visualProgressChanged).length,
      deadVisualSamples: phaseDead.length,
      deadVisualRate: round(phaseDead.length / Math.max(phaseSamples.length, 1), 4),
      observedSubstates: [...new Set(phaseSamples.map((sample) => sample.after.substate).filter(Boolean))],
    }];
  }));
  return {
    browserVersion,
    userAgent,
    errors,
    wheelInputs: performanceState.wheelInputs,
    samples,
    finalSnapshot,
    performance: {
      journeyDurationMs: Date.now() - journeyStartedAt,
      frames: frameSummary(performanceState.frameIntervals),
      longTasks: {
        supported: performanceState.longTaskSupported,
        count: performanceState.longTasks.length,
        totalDurationMs: round(performanceState.longTasks.reduce((sum, entry) => sum + entry.duration, 0)),
        maxDurationMs: round(Math.max(0, ...performanceState.longTasks.map((entry) => entry.duration))),
        entries: performanceState.longTasks,
      },
    },
    response: {
      targetInputSamples: targetSamples.length,
      visuallyResponsiveSamples: responsiveSamples.length,
      visuallyResponsiveRate: round(responsiveSamples.length / Math.max(targetSamples.length, 1), 4),
      deadVisualSamples: deadSamples.length,
      deadVisualRate: round(deadSamples.length / Math.max(targetSamples.length, 1), 4),
      byPhase,
    },
  };
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const existingTargets = [];
  for (const targetPath of [videoPath, diagnosticPath]) {
    try {
      await stat(targetPath);
      existingTargets.push(path.relative(rootDirectory, targetPath));
    } catch {
      // Missing outputs are expected on the first run.
    }
  }
  if (existingTargets.length) {
    throw new Error(`Refusing to overwrite existing evidence: ${existingTargets.join(", ")}.`);
  }
  const source = await sourceMetadata();
  const phaseREvidenceBefore = await directoryDigest(phaseREvidenceDirectory);
  if (!skipBuild) await runBuild();
  const port = await reservePort();
  const baseUrl = `http://${host}:${port}/`;
  previewProcess = startPreview(port);
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });
  const journey = await runJourney(baseUrl);
  const probeContext = await browser.newContext({ viewport });
  const probePage = await probeContext.newPage();
  const video = await decodeVideoMetadata(probePage, videoPath);
  await probeContext.close();
  const phaseREvidenceAfter = await directoryDigest(phaseREvidenceDirectory);
  if (phaseREvidenceBefore.digest !== phaseREvidenceAfter.digest) {
    throw new Error("Historical Phase R review evidence changed during Phase R-X capture.");
  }
  const videoBytes = await readFile(videoPath);
  const diagnostic = {
    schemaVersion: 1,
    stage,
    pace,
    generatedAt: new Date().toISOString(),
    viewport,
    inputPattern,
    captureBasis: skipBuild ? "existing fresh production build" : "fresh production build",
    source,
    historicalPhaseREvidence: phaseREvidenceBefore,
    video: {
      file: path.relative(rootDirectory, videoPath).split(path.sep).join("/"),
      bytes: videoBytes.length,
      sha256: sha256(videoBytes),
      durationSeconds: round(video.durationSeconds, 6),
      width: video.width,
      height: video.height,
    },
    ...journey,
  };
  await writeFile(diagnosticPath, `${JSON.stringify(diagnostic, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    stage,
    pace,
    video: diagnostic.video,
    response: diagnostic.response,
    performance: diagnostic.performance,
    errors: diagnostic.errors,
  }, null, 2));
}

try {
  await main();
} finally {
  await Promise.allSettled([browser?.close(), stopPreview()]);
}
