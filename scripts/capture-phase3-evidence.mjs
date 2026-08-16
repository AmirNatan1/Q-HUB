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
const phase3Directory = path.join(reviewDirectory, "phase3");
const expectedBranch = "phase3/proof-system";
const host = "127.0.0.1";
const astroCliPath = path.join(rootDirectory, "node_modules", "astro", "bin", "astro.mjs");
const desktopViewport = Object.freeze({ width: 1440, height: 900 });
const mobileViewport = Object.freeze({ width: 390, height: 844 });
const recordRoute = "/proof/maradin-dynamic-ground-projection/";

const captures = Object.freeze([
  {
    id: "desktop-proof-index-opening",
    file: "desktop-proof-index-opening.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: "/proof/",
    section: "opening",
    action: "top",
  },
  {
    id: "desktop-proof-index-active",
    file: "desktop-proof-index-active.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: "/proof/",
    section: "index-record",
    state: "inspection-active",
    action: "inspect",
  },
  {
    id: "desktop-record-opening",
    file: "desktop-record-opening.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: recordRoute,
    section: "opening",
    action: "top",
  },
  {
    id: "desktop-record-field-condition-technology",
    file: "desktop-record-field-condition-technology.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: recordRoute,
    section: "field-condition-technology",
    targetSection: "field-condition",
    action: "section",
  },
  {
    id: "desktop-record-test",
    file: "desktop-record-test.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: recordRoute,
    section: "test",
    targetSection: "test",
    action: "section",
  },
  {
    id: "desktop-record-evidence",
    file: "desktop-record-evidence.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: recordRoute,
    section: "evidence",
    targetSection: "evidence",
    action: "section",
  },
  {
    id: "desktop-record-next-step",
    file: "desktop-record-next-step.png",
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    route: recordRoute,
    section: "next-step-record-ending",
    targetSection: "next-step",
    action: "section",
  },
  {
    id: "mobile-proof-index",
    file: "mobile-proof-index.png",
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    route: "/proof/",
    section: "index",
    action: "top",
  },
  {
    id: "mobile-record-opening",
    file: "mobile-record-opening.png",
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    route: recordRoute,
    section: "opening",
    action: "top",
  },
  {
    id: "mobile-record-test",
    file: "mobile-record-test.png",
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    route: recordRoute,
    section: "test",
    targetSection: "test",
    action: "section",
  },
  {
    id: "mobile-record-evidence",
    file: "mobile-record-evidence.png",
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    route: recordRoute,
    section: "evidence",
    targetSection: "evidence",
    action: "section",
  },
  {
    id: "mobile-record-next-step",
    file: "mobile-record-next-step.png",
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    route: recordRoute,
    section: "next-step",
    targetSection: "next-step",
    action: "section",
  },
  {
    id: "reduced-motion-record",
    file: "reduced-motion-record.png",
    profile: "desktop",
    mode: "reduced-motion",
    viewport: desktopViewport,
    route: recordRoute,
    section: "evidence",
    targetSection: "evidence",
    action: "section",
  },
  {
    id: "keyboard-focus-proof-index",
    file: "keyboard-focus-proof-index.png",
    profile: "desktop",
    mode: "keyboard-focus",
    viewport: desktopViewport,
    route: "/proof/",
    section: "index-record",
    state: "keyboard-focus",
    action: "keyboard",
  },
]);

const expectedOutputNames = Object.freeze([
  ...captures.map((capture) => capture.file),
  "manifest.json",
]);

let previewProcess;
let browser;
let stagingDirectory;
let shutdownPromise;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function inventoryDigest(inventory) {
  return sha256(Buffer.from(inventory
    .map((record) => `${record.file}\0${record.sha256}\0${record.bytes}`)
    .join("\n")));
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
  try {
    const files = (await listFilesRecursively(reviewDirectory))
      .filter((filePath) => {
        const local = path.relative(reviewDirectory, filePath);
        return local !== "phase3" && !local.startsWith(`phase3${path.sep}`);
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

function assertHistoricalEvidenceUnchanged(before, after, stage) {
  if (
    inventoryDigest(before) !== inventoryDigest(after)
    || JSON.stringify(before) !== JSON.stringify(after)
  ) {
    throw new Error(`Historical review evidence changed ${stage}.`);
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

async function sourceMetadata() {
  const [candidate, branch, status] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  if (branch !== expectedBranch) {
    throw new Error(`Phase 3 evidence requires ${expectedBranch}; received ${branch || "detached HEAD"}.`);
  }
  if (status) {
    throw new Error(`Phase 3 evidence requires a clean working tree:\n${status}`);
  }
  if (!/^[0-9a-f]{40}$/iu.test(candidate)) {
    throw new Error(`Unable to resolve a full candidate SHA (${candidate}).`);
  }
  const explicitCandidate = process.env.PHASE3_EVIDENCE_CANDIDATE_SHA?.trim();
  if (explicitCandidate && explicitCandidate.toLowerCase() !== candidate.toLowerCase()) {
    throw new Error(
      `PHASE3_EVIDENCE_CANDIDATE_SHA ${explicitCandidate} does not equal HEAD ${candidate}.`,
    );
  }
  return {
    candidate,
    branch,
    expectedBranch,
    workingTreeCleanAtStart: true,
    statusPorcelainAtStart: "",
    candidateBasis: explicitCandidate
      ? "explicit-environment-value-equal-to-head"
      : "clean-head",
  };
}

async function prepareOutputDirectory() {
  try {
    const entries = await readdir(phase3Directory);
    if (entries.length) {
      throw new Error(
        `Refusing to overwrite Phase 3 evidence: ${relative(phase3Directory)} contains ${entries.join(", ")}.`,
      );
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
    await mkdir(phase3Directory, { recursive: true });
  }
  stagingDirectory = path.join(phase3Directory, `.staging-${process.pid}-${Date.now()}`);
  await mkdir(stagingDirectory, { recursive: true });
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
  const child = spawn(
    process.execPath,
    [astroCliPath, "preview", "--host", host, "--port", String(port)],
    {
      cwd: rootDirectory,
      env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  return child;
}

async function waitForPreview(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (previewProcess?.exitCode !== null) {
      throw new Error(`Production preview exited before it became ready (${previewProcess?.exitCode}).`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Preview startup briefly refuses connections.
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
    shutdownPromise = Promise.allSettled([
      browser?.close(),
      stopPreview(),
      stagingDirectory ? rm(stagingDirectory, { recursive: true, force: true }) : undefined,
    ]);
  }
  await shutdownPromise;
}

function pageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function waitForVisibleImages(page) {
  await page.waitForFunction(() => Array.from(document.images).every((image) => {
    const bounds = image.getBoundingClientRect();
    const visible = bounds.bottom > 0
      && bounds.right > 0
      && bounds.top < window.innerHeight
      && bounds.left < window.innerWidth
      && getComputedStyle(image).visibility !== "hidden";
    return !visible || (image.complete && image.naturalWidth > 0);
  }), undefined, { timeout: 15_000 });
}

async function settleVisiblePaint(page) {
  await page.locator("[data-site-header]").waitFor({ state: "visible" });
  await waitForVisibleImages(page);
  await page.evaluate(async () => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.bottom > 0
        && bounds.right > 0
        && bounds.top < window.innerHeight
        && bounds.left < window.innerWidth
        && getComputedStyle(image).display !== "none"
        && getComputedStyle(image).visibility !== "hidden";
    });
    await Promise.all(visibleImages.map(async (image) => {
      if (typeof image.decode !== "function") return;
      try {
        await image.decode();
      } catch {
        if (!image.complete || image.naturalWidth === 0) {
          throw new Error(`Visible image did not decode: ${image.currentSrc || image.src}`);
        }
      }
    }));
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(250);
}

async function positionCapture(page, definition) {
  if (definition.action === "top") {
    await page.evaluate(() => window.scrollTo(0, 0));
    return;
  }
  if (definition.action === "inspect") {
    const row = page.locator("[data-proof-row]").first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    return;
  }
  if (definition.action === "keyboard") {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await page.keyboard.press("Tab");
      const withinRow = await page.evaluate(
        () => Boolean(document.activeElement?.closest("[data-proof-row]")),
      );
      if (withinRow) return;
    }
    throw new Error("Keyboard traversal did not reach the Proof record action.");
  }
  if (definition.action === "section") {
    const selector = `[data-proof-section="${definition.targetSection}"]`;
    const section = page.locator(selector);
    if (await section.count() !== 1) {
      throw new Error(`${definition.id} expected exactly one ${selector}.`);
    }
    await section.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const isCombinedOpening = element.getAttribute("data-proof-section") === "field-condition";
      const offset = isCombinedOpening
        ? Math.min(250, window.innerHeight * 0.28)
        : -Math.min(112, window.innerHeight * 0.12);
      window.scrollTo(0, Math.max(0, top + offset));
    });
  }
}

async function captureOne(baseUrl, definition, source) {
  const context = await browser.newContext({
    viewport: definition.viewport,
    deviceScaleFactor: 1,
    hasTouch: definition.profile === "mobile",
    isMobile: definition.profile === "mobile",
    colorScheme: "dark",
    reducedMotion: definition.mode === "reduced-motion" ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  const errors = pageErrors(page);
  try {
    const response = await page.goto(new URL(definition.route, baseUrl).toString(), {
      waitUntil: "networkidle",
    });
    if (!response?.ok()) {
      throw new Error(`${definition.route} returned ${response?.status() ?? "no response"}.`);
    }
    if (await page.locator("astro-dev-toolbar").count()) {
      throw new Error("Astro dev toolbar detected; evidence requires a production preview.");
    }
    await page.addStyleTag({
      content: `html { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }`,
    });
    await positionCapture(page, definition);
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    await settleVisiblePaint(page);
    const state = await page.evaluate(() => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollY: Math.round(window.scrollY),
      activeTag: document.activeElement?.tagName ?? null,
      activeHref: document.activeElement instanceof HTMLAnchorElement
        ? document.activeElement.getAttribute("href")
        : null,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    if (
      state.viewport.width !== definition.viewport.width
      || state.viewport.height !== definition.viewport.height
    ) {
      throw new Error(`${definition.id} resolved an unexpected viewport.`);
    }
    if (definition.mode === "keyboard-focus" && !state.activeHref?.includes("/proof/")) {
      throw new Error(`${definition.id} did not preserve focus on the Field Record action.`);
    }
    if (definition.mode === "reduced-motion" && !state.reducedMotion) {
      throw new Error(`${definition.id} did not activate reduced motion.`);
    }
    if (errors.length) {
      throw new Error(`${definition.id} emitted application errors:\n${errors.join("\n")}`);
    }
    const filePath = path.join(stagingDirectory, definition.file);
    const bytes = await page.screenshot({
      path: filePath,
      type: "png",
      fullPage: false,
    });
    return {
      id: definition.id,
      kind: "screenshot",
      file: relative(path.join(phase3Directory, definition.file)),
      profile: definition.profile,
      mode: definition.mode,
      viewport: state.viewport,
      route: definition.route,
      state: definition.state ?? "settled",
      section: definition.section,
      scrollY: state.scrollY,
      focusedHref: state.activeHref,
      candidate: source.candidate,
      capturedAt: new Date().toISOString(),
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
  } finally {
    await context.close();
  }
}

async function assertStagingShape() {
  const names = (await readdir(stagingDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = [...expectedOutputNames].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Incomplete Phase 3 staging set: ${names.join(", ")}.`);
  }
}

async function promoteStaging() {
  for (const name of expectedOutputNames) {
    await rename(path.join(stagingDirectory, name), path.join(phase3Directory, name));
  }
  await rm(stagingDirectory, { recursive: true, force: true });
  stagingDirectory = undefined;
}

function printPlan() {
  console.log(JSON.stringify({
    schemaVersion: 1,
    outputDirectory: relative(phase3Directory),
    preconditions: {
      branch: expectedBranch,
      cleanWorkingTree: true,
      candidateEnvironmentMustEqualHead: true,
      outputDirectoryMustBeEmpty: true,
    },
    captures,
    manifest: relative(path.join(phase3Directory, "manifest.json")),
    historicalEvidencePolicy:
      "Every existing file under artifacts/review outside phase3 is hashed before and after capture; any change aborts.",
  }, null, 2));
}

async function main() {
  if (process.argv.includes("--plan") || process.argv.includes("--dry-run")) {
    printPlan();
    return;
  }
  if (process.argv.length > 2) {
    throw new Error("Supported arguments: --plan or --dry-run.");
  }

  const source = await sourceMetadata();
  const historicalBefore = await historicalEvidenceInventory();
  await prepareOutputDirectory();
  if (process.env.PHASE3_EVIDENCE_SKIP_BUILD !== "1") {
    await runNpm(["run", "build"]);
  } else {
    await access(path.join(rootDirectory, "dist", "index.html"));
  }
  const port = await reservePort();
  const baseUrl = `http://${host}:${port}/`;
  previewProcess = startPreview(port);
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });

  const captured = [];
  for (const definition of captures) {
    captured.push(await captureOne(baseUrl, definition, source));
  }

  const historicalAfterCapture = await historicalEvidenceInventory();
  assertHistoricalEvidenceUnchanged(historicalBefore, historicalAfterCapture, "during capture");
  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase 3 Proof system human-review evidence",
    generatedAt: new Date().toISOString(),
    source,
    server: {
      type: "isolated-astro-production-preview",
      baseUrl,
      developmentServerAllowed: false,
    },
    contract: {
      desktopScreenshots: 7,
      mobileScreenshots: 5,
      reducedMotionScreenshots: 1,
      keyboardFocusScreenshots: 1,
      desktopViewport,
      mobileViewport,
    },
    historicalEvidenceIntegrity: {
      status: "verified-unchanged-after-capture",
      fileCount: historicalBefore.length,
      totalBytes: historicalBefore.reduce((sum, item) => sum + item.bytes, 0),
      digest: inventoryDigest(historicalBefore),
      files: historicalBefore,
    },
    captures: captured,
  };
  await writeFile(
    path.join(stagingDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await assertStagingShape();
  await promoteStaging();
  const historicalAfterPromotion = await historicalEvidenceInventory();
  assertHistoricalEvidenceUnchanged(historicalBefore, historicalAfterPromotion, "during promotion");
  console.log(`Captured ${captured.length} Phase 3 review screenshots.`);
  console.log(`Manifest: ${relative(path.join(phase3Directory, "manifest.json"))}`);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void shutdown().finally(() => process.exit(signal === "SIGINT" ? 130 : 143)));
}

try {
  await main();
} finally {
  await shutdown();
}
