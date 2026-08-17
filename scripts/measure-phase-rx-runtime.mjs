#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(rootDirectory, "artifacts", "performance", "phase-rx");
const phase3SummaryPath = path.join(rootDirectory, "artifacts", "performance", "phase-r", "baseline-summary.json");
const phaseRSummaryPath = path.join(rootDirectory, "artifacts", "performance", "phase-r", "candidate-summary.json");
const astroCli = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");
const expectedBranch = "repair/phase-rx-experience-integration-scroll-fluidity";
const candidateEnvironmentName = "PHASE_RX_RUNTIME_CANDIDATE_SHA";
const host = "127.0.0.1";
const skipBuild = process.argv.includes("--skip-build");
const profiles = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

let previewProcess;
let browser;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function quantile(values, fraction) {
  if (!values.length) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function frameSummary(intervals) {
  return {
    samples: intervals.length,
    p50Ms: round(quantile(intervals, 0.5)),
    p95Ms: round(quantile(intervals, 0.95)),
    p99Ms: round(quantile(intervals, 0.99)),
    over33_3Ms: intervals.filter((value) => value > 33.3).length,
    over50Ms: intervals.filter((value) => value > 50).length,
    maxMs: round(Math.max(0, ...intervals)),
  };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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
  const value = line.slice(3).replaceAll("\\", "/");
  return value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
}

async function sourceMetadata() {
  const [head, tree, branch, status, committedAt] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
    git(["show", "-s", "--format=%cI", "HEAD"]),
  ]);
  const declared = process.env[candidateEnvironmentName]?.trim() || null;
  if (branch !== expectedBranch) throw new Error(`Runtime requires ${expectedBranch}; received ${branch}.`);
  if (declared !== head) throw new Error(`${candidateEnvironmentName} must equal clean candidate HEAD ${head}.`);
  const unexpected = status.split(/\r?\n/u).filter(Boolean).filter((line) => {
    const file = statusPath(line);
    return file !== "artifacts/performance/phase-r.zip"
      && !file.startsWith("artifacts/review/phase-rx/")
      && !file.startsWith("artifacts/performance/phase-rx/");
  });
  if (unexpected.length) throw new Error(`Unexpected candidate working changes:\n${unexpected.join("\n")}`);
  return {
    head,
    tree,
    branch,
    committedAt,
    expectedBranch,
    candidateEnvironment: { name: candidateEnvironmentName, provided: true, equalsHead: true },
    statusAtStart: status,
    preservedPreExistingDeletion: status.includes("artifacts/performance/phase-r.zip"),
  };
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
    const commandArguments = process.platform === "win32"
      ? ["/d", "/s", "/c", ["npm", ...args].join(" ")]
      : args;
    const child = spawn(command, commandArguments, {
      cwd: rootDirectory,
      env: { ...process.env },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolve()
      : reject(new Error(`npm ${args.join(" ")} exited with ${code}.`)));
  });
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForPreview(url) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (previewProcess?.exitCode !== null) throw new Error("Production preview exited early.");
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Isolated production preview may briefly refuse connections.
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
  }
}

function installProbe() {
  const memory = () => {
    const value = performance.memory;
    return value ? {
      usedJSHeapSize: value.usedJSHeapSize,
      totalJSHeapSize: value.totalJSHeapSize,
      jsHeapSizeLimit: value.jsHeapSizeLimit,
    } : null;
  };
  const state = {
    active: false,
    startedAt: 0,
    stoppedAt: 0,
    lastFrameAt: 0,
    frameIntervals: [],
    longTasks: [],
    longTaskSupported: false,
    inputEvents: [],
    scrollSamples: [],
    wheelPrevented: 0,
    scrollEventCount: 0,
    memoryStart: null,
    memoryEnd: null,
  };
  const frame = (timestamp) => {
    if (state.active) {
      if (state.lastFrameAt > 0) state.frameIntervals.push(timestamp - state.lastFrameAt);
      state.lastFrameAt = timestamp;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  try {
    state.longTaskSupported = PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false;
    if (state.longTaskSupported) {
      const observer = new PerformanceObserver((list) => {
        if (!state.active) return;
        for (const entry of list.getEntries()) {
          state.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      });
      observer.observe({ type: "longtask", buffered: false });
    }
  } catch {
    state.longTaskSupported = false;
  }
  window.addEventListener("wheel", (event) => {
    if (!state.active) return;
    state.inputEvents.push({ type: "wheel", timestamp: performance.now(), deltaY: event.deltaY });
    setTimeout(() => {
      if (event.defaultPrevented) state.wheelPrevented += 1;
    });
  }, { capture: true, passive: true });
  window.addEventListener("touchstart", () => {
    if (state.active) state.inputEvents.push({ type: "touchstart", timestamp: performance.now() });
  }, { passive: true });
  window.addEventListener("touchmove", () => {
    if (state.active) state.inputEvents.push({ type: "touchmove", timestamp: performance.now() });
  }, { passive: true });
  window.addEventListener("scroll", () => {
    if (!state.active) return;
    state.scrollEventCount += 1;
    const root = document.documentElement;
    const phase = root.dataset.activePhase || "unknown";
    const section = document.querySelector(`[data-experience-phase="${CSS.escape(phase)}"]`);
    state.scrollSamples.push({
      timestamp: performance.now(),
      scrollY,
      phase,
      progress: Number.parseFloat(section?.getAttribute("data-progress") || "-1"),
    });
  }, { passive: true });
  state.start = () => {
    state.active = true;
    state.startedAt = performance.now();
    state.lastFrameAt = 0;
    state.frameIntervals.length = 0;
    state.longTasks.length = 0;
    state.inputEvents.length = 0;
    state.scrollSamples.length = 0;
    state.wheelPrevented = 0;
    state.scrollEventCount = 0;
    state.memoryStart = memory();
  };
  state.stop = () => {
    state.active = false;
    state.stoppedAt = performance.now();
    state.memoryEnd = memory();
  };
  window.__phaseRxRuntime = state;
}

async function desktopJourney(page, maximumScrollY) {
  const deltaY = 120;
  const requestedSteps = Math.ceil(maximumScrollY / deltaY) + 18;
  for (let step = 0; step < requestedSteps; step += 1) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(35);
  }
  return { type: "repeated-native-wheel", deltaY, intervalMs: 35, requestedSteps };
}

async function mobileJourney(page, profile, maximumScrollY) {
  const session = await page.context().newCDPSession(page);
  const x = Math.round(profile.viewport.width * 0.55);
  const startY = Math.round(profile.viewport.height * 0.8);
  const endY = Math.round(profile.viewport.height * 0.24);
  const distance = startY - endY;
  const requestedSwipes = Math.ceil(maximumScrollY / Math.max(distance, 1)) + 12;
  for (let swipe = 0; swipe < requestedSwipes; swipe += 1) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: startY }],
    });
    for (let step = 1; step <= 7; step += 1) {
      const y = Math.round(startY + (endY - startY) * (step / 7));
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y }],
      });
      await page.waitForTimeout(16);
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(64);
    if (await page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 2)) break;
  }
  await session.detach();
  return { type: "repeated-native-touch-swipe", startY, endY, requestedSwipes };
}

async function measureProfile(baseUrl, profile, source) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
  });
  await context.addInitScript(installProbe);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  try {
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`${profile.name} returned ${response?.status()}.`);
    await page.waitForFunction(() => document.documentElement.dataset.js === "true");
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(profile.viewport.width * 0.68, profile.viewport.height * 0.46, { steps: 6 });
    await page.waitForTimeout(300);
    const initial = await page.evaluate(() => ({
      maximumScrollY: Math.max(document.documentElement.scrollHeight - innerHeight, 0),
      renderMode: document.documentElement.dataset.renderMode || null,
      inputMode: document.documentElement.dataset.inputMode || null,
      scrollChoreography: document.documentElement.dataset.scrollChoreography || null,
      scrollSnapType: getComputedStyle(document.documentElement).scrollSnapType,
      bodyScrollSnapType: getComputedStyle(document.body).scrollSnapType,
      externalResources: performance.getEntriesByType("resource").map((entry) => entry.name)
        .filter((name) => /^https?:/u.test(name) && new URL(name).origin !== location.origin),
    }));
    await page.evaluate(() => window.__phaseRxRuntime.start());
    const input = profile.isMobile
      ? await mobileJourney(page, profile, initial.maximumScrollY)
      : await desktopJourney(page, initial.maximumScrollY);
    await page.waitForTimeout(500);
    const final = await page.evaluate(() => {
      window.__phaseRxRuntime.stop();
      const state = window.__phaseRxRuntime;
      return {
        state: structuredClone({
          startedAt: state.startedAt,
          stoppedAt: state.stoppedAt,
          frameIntervals: state.frameIntervals,
          longTasks: state.longTasks,
          longTaskSupported: state.longTaskSupported,
          inputEvents: state.inputEvents,
          scrollSamples: state.scrollSamples,
          wheelPrevented: state.wheelPrevented,
          scrollEventCount: state.scrollEventCount,
          memoryStart: state.memoryStart,
          memoryEnd: state.memoryEnd,
        }),
        scrollY,
        maximumScrollY: Math.max(document.documentElement.scrollHeight - innerHeight, 0),
        activePhase: document.documentElement.dataset.activePhase || null,
        renderMode: document.documentElement.dataset.renderMode || null,
      };
    });
    const phases = [...new Set(final.state.scrollSamples.map((sample) => sample.phase))];
    const result = {
      schemaVersion: 1,
      stage: "candidate",
      profile: profile.name,
      viewport: profile.viewport,
      source,
      measuredAt: new Date().toISOString(),
      productionBuild: !skipBuild,
      input,
      initial,
      final: {
        scrollY: round(final.scrollY),
        maximumScrollY: round(final.maximumScrollY),
        reachedNaturalEnd: final.scrollY >= final.maximumScrollY - 2,
        activePhase: final.activePhase,
        renderMode: final.renderMode,
      },
      durationMs: round(final.state.stoppedAt - final.state.startedAt),
      phaseCoverage: phases,
      frames: frameSummary(final.state.frameIntervals),
      longTasks: {
        supported: final.state.longTaskSupported,
        count: final.state.longTasks.length,
        totalDurationMs: round(final.state.longTasks.reduce((sum, entry) => sum + entry.duration, 0)),
        maxDurationMs: round(Math.max(0, ...final.state.longTasks.map((entry) => entry.duration))),
        entries: final.state.longTasks,
      },
      inputEvents: {
        count: final.state.inputEvents.length,
        types: Object.fromEntries([...new Set(final.state.inputEvents.map((entry) => entry.type))]
          .map((type) => [type, final.state.inputEvents.filter((entry) => entry.type === type).length])),
        preventedWheelEvents: final.state.wheelPrevented,
      },
      scrollEvents: final.state.scrollEventCount,
      memory: {
        start: final.state.memoryStart,
        end: final.state.memoryEnd,
        usedHeapDelta: final.state.memoryStart && final.state.memoryEnd
          ? final.state.memoryEnd.usedJSHeapSize - final.state.memoryStart.usedJSHeapSize
          : null,
      },
      errors,
    };
    if (!result.final.reachedNaturalEnd) throw new Error(`${profile.name} did not reach the natural page end.`);
    if (errors.length) throw new Error(`${profile.name} emitted runtime errors: ${errors.join("\n")}`);
    if (initial.externalResources.length) throw new Error(`${profile.name} loaded external resources.`);
    if (initial.scrollChoreography !== "continuous") throw new Error(`${profile.name} did not enable continuous choreography.`);
    if (initial.scrollSnapType !== "none" || initial.bodyScrollSnapType !== "none") {
      throw new Error(`${profile.name} unexpectedly enabled scroll snapping.`);
    }
    if (!phaseOrderCovered(phases)) throw new Error(`${profile.name} missed phases: ${phases.join(", ")}.`);
    return result;
  } finally {
    await context.close();
  }
}

function phaseOrderCovered(phases) {
  return ["presence", "access", "startup", "method", "activity", "evidence", "action"]
    .every((phase) => phases.includes(phase));
}

function compactHistorical(summary) {
  return {
    sourceHead: summary.sourceHead,
    generatedAt: summary.generatedAt,
    profiles: summary.profiles.map((profile) => ({
      profile: profile.profile,
      frames: profile.frames,
      longTasks: {
        count: profile.longTasks.count,
        totalDurationMs: profile.longTasks.totalDurationMs,
        maxDurationMs: profile.longTasks.maxDurationMs,
      },
    })),
  };
}

async function main() {
  const outputPaths = profiles.map((profile) => path.join(outputDirectory, `candidate-${profile.name}.json`));
  outputPaths.push(path.join(outputDirectory, "candidate-summary.json"));
  const existing = [];
  for (const filePath of outputPaths) if (await exists(filePath)) existing.push(relative(filePath));
  if (existing.length) throw new Error(`Refusing to overwrite runtime evidence: ${existing.join(", ")}.`);
  const source = await sourceMetadata();
  if (!skipBuild) await runNpm(["run", "build"]);
  await mkdir(outputDirectory, { recursive: true });
  const port = await reservePort();
  const baseUrl = `http://${host}:${port}/`;
  previewProcess = spawn(process.execPath, [astroCli, "preview", "--host", host, "--port", String(port)], {
    cwd: rootDirectory,
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });
  const results = [];
  for (const profile of profiles) {
    process.stdout.write(`measure ${profile.name}\n`);
    results.push(await measureProfile(baseUrl, profile, source));
  }
  const profileArtifacts = [];
  for (const result of results) {
    const filePath = path.join(outputDirectory, `candidate-${result.profile}.json`);
    const bytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
    await writeFile(filePath, bytes);
    profileArtifacts.push({ file: relative(filePath), bytes: bytes.length, sha256: sha256(bytes) });
  }
  const [phase3Summary, phaseRSummary] = await Promise.all([
    readFile(phase3SummaryPath, "utf8").then(JSON.parse),
    readFile(phaseRSummaryPath, "utf8").then(JSON.parse),
  ]);
  const summary = {
    schemaVersion: 1,
    stage: "candidate",
    generatedAt: new Date().toISOString(),
    source,
    buildInput: skipBuild ? "existing fresh production build" : "fresh npm run build production output",
    measuredBaseUrl: baseUrl,
    browserVersion: browser.version(),
    profiles: results.map((result) => ({
      profile: result.profile,
      viewport: result.viewport,
      durationMs: result.durationMs,
      input: result.input,
      phaseCoverage: result.phaseCoverage,
      frames: result.frames,
      longTasks: result.longTasks,
      inputEvents: result.inputEvents,
      scrollEvents: result.scrollEvents,
      memory: result.memory,
      reachedNaturalEnd: result.final.reachedNaturalEnd,
      renderMode: result.final.renderMode,
      errors: result.errors,
    })),
    comparisonSources: {
      acceptedPhase3: compactHistorical(phase3Summary),
      acceptedPhaseR: compactHistorical(phaseRSummary),
      preRxContinuousScroll: {
        file: "artifacts/review/phase-rx/baseline-continuous-scroll-diagnostic.json",
        note: "Video-bound natural-wheel diagnostic; use response metrics for continuity and disclose capture overhead for frame timing.",
      },
    },
    artifacts: profileArtifacts,
    limitations: [
      "Headless local production-preview measurements require human confirmation on physical hardware and GPUs.",
      "Frame timing varies with host load; comparisons retain source identities and measurement profiles.",
      "The accepted Phase 3 and Phase R summaries used their historical journey drivers; R-X additionally uses real wheel and touch input.",
    ],
  };
  const summaryPath = path.join(outputDirectory, "candidate-summary.json");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ output: relative(outputDirectory), profiles: summary.profiles }, null, 2)}\n`);
}

try {
  await main();
} finally {
  await Promise.allSettled([browser?.close(), stopPreview()]);
}
