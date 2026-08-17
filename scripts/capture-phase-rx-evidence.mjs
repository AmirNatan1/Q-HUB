#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceRoot = path.join(rootDirectory, "artifacts", "review", "phase-rx");
const expectedBranch = "repair/phase-rx-experience-integration-scroll-fluidity";
const candidateEnvironmentName = "PHASE_RX_EVIDENCE_CANDIDATE_SHA";
const astroCli = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");
const host = "127.0.0.1";
const phaseOrder = ["presence", "access", "startup", "method", "activity", "evidence", "action"];

const argumentsList = process.argv.slice(2);
const labelArgument = argumentsList.find((argument) => argument.startsWith("--label="));
const matchArgument = argumentsList.find((argument) => argument.startsWith("--match="));
const label = labelArgument?.slice("--label=".length) || "candidate-stills";
const match = matchArgument?.slice("--match=".length) || null;
const skipBuild = argumentsList.includes("--skip-build");
const unknownArguments = argumentsList.filter(
  (argument) => argument !== "--skip-build"
    && !argument.startsWith("--label=")
    && !argument.startsWith("--match="),
);
if (unknownArguments.length) throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}.`);
if (!/^[a-z0-9][a-z0-9-]*$/u.test(label)) throw new Error(`Unsafe evidence label: ${label}.`);

const outputDirectory = path.join(evidenceRoot, label);
const definitions = [
  ["desktop-presence-resolved", "desktop", 1440, 900, "presence", 0.6, "normal"],
  ...[0.18, 0.34, 0.5, 0.66, 0.82].map((progress, index) => [
    `desktop-access-${index + 1}`, "desktop", 1440, 900, "access", progress, "normal",
  ]),
  ...[0.18, 0.48, 0.76].map((progress, index) => [
    `desktop-startup-${index + 1}`, "desktop", 1440, 900, "startup", progress, "normal",
  ]),
  ...[0.16, 0.5, 0.84].map((progress, index) => [
    `desktop-method-${index + 1}`, "desktop", 1440, 900, "method", progress, "normal",
  ]),
  ...[0.16, 0.37, 0.62, 0.84].map((progress, index) => [
    `desktop-activity-${index + 1}`, "desktop", 1440, 900, "activity", progress, "normal",
  ]),
  ["desktop-evidence", "desktop", 1440, 900, "evidence", 0.5, "normal"],
  ["desktop-action", "desktop", 1440, 900, "action", 0.5, "normal"],
  ["wide-access", "wide", 1920, 1080, "access", 0.5, "normal"],
  ["wide-startup", "wide", 1920, 1080, "startup", 0.48, "normal"],
  ["wide-method", "wide", 1920, 1080, "method", 0.5, "normal"],
  ["wide-activity", "wide", 1920, 1080, "activity", 0.62, "normal"],
  ["tablet-access", "tablet", 768, 1024, "access", 0.5, "normal"],
  ["tablet-startup", "tablet", 768, 1024, "startup", 0.5, "normal"],
  ["tablet-method", "tablet", 768, 1024, "method", 0.5, "normal"],
  ["tablet-activity", "tablet", 768, 1024, "activity", 0.5, "normal"],
  ...phaseOrder.map((phase) => [
    `mobile-390-${phase}`, "mobile", 390, 844, phase, 0.5, "normal",
  ]),
  ...["access", "startup", "method", "activity"].map((phase) => [
    `mobile-430-${phase}`, "mobile", 430, 932, phase, 0.5, "normal",
  ]),
  ["reduced-motion-access", "accessibility", 1440, 900, "access", 0.08, "reduced-motion"],
  ["reduced-motion-activity", "accessibility", 390, 844, "activity", 0.5, "reduced-motion"],
  ["no-webgl-method", "accessibility", 1440, 900, "method", 0.5, "no-webgl"],
  ["forced-colors-presence", "accessibility", 1440, 900, "presence", 0.6, "forced-colors"],
  ["keyboard-focus-startup", "accessibility", 1440, 900, "startup", 0.76, "keyboard-focus"],
].map(([id, profile, width, height, phase, progress, mode]) => ({
  id,
  file: `${id}.png`,
  profile,
  viewport: { width, height },
  phase,
  progress,
  mode,
}));
const selectedDefinitions = match
  ? definitions.filter((definition) => definition.id.includes(match))
  : definitions;
if (!selectedDefinitions.length) throw new Error(`No evidence definitions match ${match}.`);

let previewProcess;
let browser;
let stagingDirectory;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value, digits = 5) {
  return Number(Number(value).toFixed(digits));
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
  const raw = line.trimStart()
    .replace(/^(?:\?\?|[MADRCU]{1,2})\s+/u, "")
    .replaceAll("\\", "/");
  return raw.includes(" -> ") ? raw.split(" -> ").at(-1) : raw;
}

async function sourceMetadata() {
  const [head, tree, branch, status, committedAt] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
    git(["show", "-s", "--format=%cI", "HEAD"]),
  ]);
  if (branch !== expectedBranch) {
    throw new Error(`Evidence requires ${expectedBranch}; received ${branch || "detached HEAD"}.`);
  }
  const explicitCandidate = process.env[candidateEnvironmentName]?.trim() || null;
  if (explicitCandidate && explicitCandidate !== head) {
    throw new Error(`${candidateEnvironmentName} ${explicitCandidate} does not equal HEAD ${head}.`);
  }
  if (explicitCandidate) {
    const unexpected = status.split(/\r?\n/u).filter(Boolean).filter((line) => {
      const file = statusPath(line);
      return file !== "artifacts/performance/phase-r.zip"
        && !file.startsWith("artifacts/review/phase-rx/");
    });
    if (unexpected.length) {
      throw new Error(`Candidate source has unexpected working changes:\n${unexpected.join("\n")}`);
    }
  }
  return {
    head,
    tree,
    branch,
    committedAt,
    statusAtStart: status,
    candidateEnvironmentName,
    candidateEnvironmentProvided: Boolean(explicitCandidate),
    basis: explicitCandidate ? "explicit-candidate-sha-equals-head" : "qa-working-state",
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
      // Production preview may briefly refuse connections during startup.
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

function monitor(page) {
  const issues = [];
  page.on("pageerror", (error) => issues.push({ type: "pageerror", text: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push({ type: "console.error", text: message.text() });
  });
  page.on("requestfailed", (request) => issues.push({
    type: "requestfailed",
    text: `${request.method()} ${request.url()} ${request.failure()?.errorText || "unknown"}`,
  }));
  return issues;
}

function contextOptions(definition) {
  const mobile = definition.profile === "mobile" || definition.viewport.width <= 430;
  return {
    viewport: definition.viewport,
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
    javaScriptEnabled: definition.mode !== "no-js",
    reducedMotion: definition.mode === "reduced-motion" ? "reduce" : "no-preference",
    forcedColors: definition.mode === "forced-colors" ? "active" : "none",
    colorScheme: "dark",
  };
}

async function targetScrollY(page, definition) {
  return page.evaluate(({ phase, progress }) => {
    const section = document.querySelector(`[data-experience-phase="${phase}"]`);
    if (!(section instanceof HTMLElement)) throw new Error(`Missing ${phase}.`);
    const bounds = section.getBoundingClientRect();
    const top = bounds.top + window.scrollY;
    const marker = window.innerHeight * 0.48;
    const maximum = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    return Math.min(maximum, Math.max(0, top + progress * Math.max(bounds.height, innerHeight) - marker));
  }, definition);
}

async function position(page, definition) {
  if (definition.mode === "no-js") {
    await page.locator(`[data-experience-phase="${definition.phase}"]`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
    return;
  }
  const destination = await targetScrollY(page, definition);
  await page.evaluate((scrollY) => {
    window.scrollTo(0, scrollY);
    window.dispatchEvent(new Event("scroll"));
  }, destination);
  if (definition.mode !== "no-js") {
    await page.waitForFunction(({ phase, progress }) => {
      const section = document.querySelector(`[data-experience-phase="${phase}"]`);
      const value = Number.parseFloat(section?.getAttribute("data-progress") || "-1");
      return document.documentElement.dataset.activePhase === phase
        && Math.abs(value - progress) <= 0.035;
    }, definition, { timeout: 10_000 });
  }
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function focusStartupAction(page) {
  for (let index = 0; index < 48; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.matches("[data-startup-action]") ?? false)) return;
  }
  throw new Error("Keyboard traversal did not reach the startup action.");
}

async function stateSnapshot(page, definition) {
  return page.evaluate(({ phase, mode }) => {
    const root = document.documentElement;
    const section = document.querySelector(`[data-experience-phase="${phase}"]`);
    const heading = section?.querySelector("h1, h2");
    const headingBounds = heading?.getBoundingClientRect();
    const visibleActivity = [...document.querySelectorAll("[data-activity-signal]")].filter((element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight
        && style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") > 0.2;
    }).map((element) => element.getAttribute("data-activity-signal"));
    const visualVariables = {};
    for (const name of [
      "--crossing-position", "--crossing-scale-x", "--crossing-scale-y",
      "--method-surface-left", "--method-focus-left", "--method-test-weight",
      "--stage-paper-opacity", "--stage-action-glow",
    ]) {
      const owner = name.startsWith("--method")
        ? section?.querySelector(".method-instrument")
        : name.startsWith("--crossing") ? section : root;
      visualVariables[name] = owner instanceof HTMLElement ? owner.style.getPropertyValue(name) : "";
    }
    return {
      phase,
      mode,
      activePhase: root.dataset.activePhase || null,
      progress: Number.parseFloat(section?.getAttribute("data-progress") || "-1"),
      sectionState: section instanceof HTMLElement
        ? section.dataset.presenceState || section.dataset.partnerState || section.dataset.crossingState
          || section.dataset.methodState || section.dataset.activityState || null
        : null,
      partnerFocus: root.dataset.partnerFocus || null,
      renderMode: root.dataset.renderMode || "no-js",
      inputMode: root.dataset.inputMode || "no-js",
      scrollChoreography: root.dataset.scrollChoreography || null,
      viewport: { width: innerWidth, height: innerHeight },
      scrollY: Math.round(scrollY),
      documentHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      headingVisible: Boolean(headingBounds && headingBounds.width > 0 && headingBounds.height > 0
        && headingBounds.bottom > 0 && headingBounds.top < innerHeight),
      visibleActivity,
      phaseOrder: [...document.querySelectorAll("[data-experience-phase]")]
        .map((element) => element.getAttribute("data-experience-phase")),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forcedColors: matchMedia("(forced-colors: active)").matches,
      focusedStartupAction: document.activeElement?.matches("[data-startup-action]") ?? false,
      visualVariables,
    };
  }, definition);
}

async function capture(baseUrl, definition, source) {
  const context = await browser.newContext(contextOptions(definition));
  const page = await context.newPage();
  const issues = monitor(page);
  try {
    const url = new URL("/", baseUrl);
    if (definition.mode === "no-webgl") url.searchParams.set("webgl", "off");
    if (definition.mode === "reduced-motion") url.searchParams.set("motion", "reduce");
    const response = await page.goto(url.toString(), {
      waitUntil: definition.mode === "no-js" ? "load" : "networkidle",
      timeout: 30_000,
    });
    if (!response?.ok()) throw new Error(`${definition.id} returned ${response?.status()}.`);
    if (definition.mode !== "no-js") {
      await page.waitForFunction(() => document.documentElement.dataset.js === "true");
    }
    if (definition.mode !== "no-js") await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: `html { scroll-behavior: auto !important; }
        *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`,
    });
    await position(page, definition);
    if (definition.mode === "keyboard-focus") {
      await focusStartupAction(page);
      await position(page, definition);
    }
    await page.waitForTimeout(180);
    const state = await stateSnapshot(page, definition);
    if (issues.length) throw new Error(`${definition.id} emitted issues: ${JSON.stringify(issues)}`);
    if (state.horizontalOverflow) throw new Error(`${definition.id} has horizontal overflow.`);
    if (definition.mode !== "no-js") {
      if (state.activePhase !== definition.phase) throw new Error(`${definition.id} active phase mismatch.`);
      if (state.scrollChoreography !== null && state.scrollChoreography !== "continuous") {
        throw new Error(`${definition.id} has invalid scroll choreography ${state.scrollChoreography}.`);
      }
    }
    if (definition.mode === "reduced-motion" && state.scrollChoreography !== null) {
      throw new Error(`${definition.id} did not resolve the reduced-motion document flow.`);
    }
    if (definition.mode === "keyboard-focus" && !state.focusedStartupAction) {
      throw new Error(`${definition.id} does not show startup-action focus.`);
    }
    if (JSON.stringify(state.phaseOrder) !== JSON.stringify(phaseOrder)) {
      throw new Error(`${definition.id} changed the seven-act semantic order.`);
    }
    const outputPath = path.join(stagingDirectory, definition.file);
    const bytes = await page.screenshot({ path: outputPath, animations: "disabled", type: "png" });
    return {
      id: definition.id,
      file: `${label}/${definition.file}`,
      viewport: definition.viewport,
      phase: definition.phase,
      targetProgress: definition.progress,
      mode: definition.mode,
      state: { ...state, progress: round(state.progress) },
      issues: [],
      bytes: bytes.length,
      sha256: sha256(bytes),
      sourceHead: source.head,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  if (await exists(outputDirectory)) throw new Error(`Refusing to overwrite ${relative(outputDirectory)}.`);
  await mkdir(evidenceRoot, { recursive: true });
  stagingDirectory = await mkdtemp(path.join(evidenceRoot, `.${label}-staging-`));
  const source = await sourceMetadata();
  if (!skipBuild) await runNpm(["run", "build"]);
  const port = await reservePort();
  previewProcess = spawn(process.execPath, [astroCli, "preview", "--host", host, "--port", String(port)], {
    cwd: rootDirectory,
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const baseUrl = `http://${host}:${port}/`;
  await waitForPreview(baseUrl);
  browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader-webgl"],
  });
  const captures = [];
  for (const definition of selectedDefinitions) {
    process.stdout.write(`capture ${definition.id}\n`);
    captures.push(await capture(baseUrl, definition, source));
  }
  const hashGroups = Object.groupBy(captures, (captureRecord) => captureRecord.sha256);
  const duplicateGroups = Object.entries(hashGroups)
    .filter(([, records]) => records.length > 1)
    .map(([hash, records]) => ({ hash, ids: records.map((record) => record.id) }));
  const uniqueHashes = new Set(captures.map((captureRecord) => captureRecord.sha256));
  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase R-X spatial and mode evidence",
    generatedAt: new Date().toISOString(),
    output: relative(outputDirectory),
    filter: match,
    source,
    captureRuntime: {
      browserVersion: browser.version(),
      baseUrl,
      productionBuild: !skipBuild,
      isolatedProductionPreview: true,
    },
    counts: {
      screenshots: captures.length,
      zeroIssueScreenshots: captures.filter((captureRecord) => !captureRecord.issues.length).length,
      uniqueHashes: uniqueHashes.size,
      duplicateGroups: duplicateGroups.length,
    },
    duplicateGroups,
    captures,
    limitations: [
      "Headless Chromium screenshots require human confirmation on physical displays and GPUs.",
      "Local production preview evidence does not represent a Cloudflare preview deployment.",
      "Screenshots freeze time-based transitions; scroll-linked geometry is verified separately with natural-wheel diagnostics.",
      "The JavaScript-disabled Chromium context did not terminate reliably during capture; no-JS remains covered by the release behavior suite rather than a new R-X still.",
      "This headless Chromium runtime resolved normal desktop captures to the DOM/CSS fallback, so the explicit no-WebGL METHOD still is intentionally equivalent to the normal fallback still.",
    ],
  };
  await writeFile(path.join(stagingDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await browser.close();
  browser = null;
  await stopPreview();
  await rename(stagingDirectory, outputDirectory);
  stagingDirectory = null;
  process.stdout.write(`${JSON.stringify({ output: relative(outputDirectory), captures: captures.length }, null, 2)}\n`);
}

try {
  await main();
} finally {
  await Promise.allSettled([browser?.close(), stopPreview()]);
  if (stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
}
