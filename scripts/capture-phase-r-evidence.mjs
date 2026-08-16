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
const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const artifactsDirectory = path.join(rootDirectory, "artifacts");
const reviewDirectory = path.join(artifactsDirectory, "review");
const phaseRDirectory = path.join(reviewDirectory, "phase-r");
const expectedBranch = "redirect/quantum-presence-startup-magnet";
const host = "127.0.0.1";
const astroCliPath = path.join(
  rootDirectory,
  "node_modules",
  "astro",
  "bin",
  "astro.mjs",
);
const desktopViewport = Object.freeze({ width: 1440, height: 900 });
const mobileViewport = Object.freeze({ width: 390, height: 844 });
const phaseOrder = Object.freeze([
  "presence",
  "access",
  "startup",
  "method",
  "activity",
  "evidence",
  "action",
]);
const expectedPartnerRecords = Object.freeze([
  {
    id: "vdl-group",
    name: "VDL Group",
    relationship: "strategic-partner",
  },
  {
    id: "hyundai-motor-group",
    name: "Hyundai Motor Group",
    relationship: "strategic-partner",
  },
  {
    id: "bazan-group",
    name: "Bazan Group",
    relationship: "strategic-partner",
  },
  {
    id: "taavura-livnat-group",
    name: "Taavura–Livnat Group",
    relationship: "founding-partner",
  },
  {
    id: "talcar",
    name: "Talcar",
    relationship: "founding-partner",
  },
]);

const desktopScreenshotNames = Object.freeze([
  "desktop-presence-opening.png",
  "desktop-presence-resolved.png",
  "desktop-partner-field-opening.png",
  "desktop-partner-field-strategic.png",
  "desktop-partner-field-founding.png",
  "desktop-startup-desire.png",
  "desktop-method-find.png",
  "desktop-method-test.png",
  "desktop-method-prove.png",
  "desktop-activity.png",
  "desktop-evidence-handoff.png",
  "desktop-action-ending.png",
]);
const mobileScreenshotNames = Object.freeze([
  "mobile-presence.png",
  "mobile-partner-field.png",
  "mobile-startup-desire.png",
  "mobile-method.png",
  "mobile-activity.png",
  "mobile-evidence.png",
  "mobile-action.png",
]);
const accessibilityScreenshotNames = Object.freeze([
  "reduced-motion-partner-field.png",
  "no-webgl-method.png",
  "keyboard-focus-startup-action.png",
  "forced-colors-homepage.png",
]);

const screenshotDefinitions = Object.freeze([
  {
    id: "desktop-presence-opening",
    file: desktopScreenshotNames[0],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "presence",
    targetProgress: 0.27,
    expectedState: "origin",
    variant: "presence-opening",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-presence-resolved",
    file: desktopScreenshotNames[1],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "presence",
    targetProgress: 0.62,
    expectedState: "resolved",
    variant: "presence-resolved",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-partner-field-opening",
    file: desktopScreenshotNames[2],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "access",
    targetProgress: 0.12,
    expectedState: "opening",
    variant: "partner-field-opening",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-partner-field-strategic",
    file: desktopScreenshotNames[3],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "access",
    targetProgress: 0.48,
    expectedState: "strategic",
    variant: "partner-field-strategic",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-partner-field-founding",
    file: desktopScreenshotNames[4],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "access",
    targetProgress: 0.82,
    expectedState: "founding",
    variant: "partner-field-founding",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-startup-desire",
    file: desktopScreenshotNames[5],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "startup",
    targetProgress: 0.76,
    expectedState: "field",
    variant: "field-crossing-resolved",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-method-find",
    file: desktopScreenshotNames[6],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "method",
    targetProgress: 0.18,
    expectedState: "find",
    variant: "method-find",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-method-test",
    file: desktopScreenshotNames[7],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "method",
    targetProgress: 0.5,
    expectedState: "test",
    variant: "method-test",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-method-prove",
    file: desktopScreenshotNames[8],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "method",
    targetProgress: 0.82,
    expectedState: "prove",
    variant: "method-prove",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-activity",
    file: desktopScreenshotNames[9],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "activity",
    targetProgress: 0.5,
    expectedState: null,
    variant: "activity-field",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-evidence-handoff",
    file: desktopScreenshotNames[10],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "evidence",
    targetProgress: 0.5,
    expectedState: null,
    variant: "evidence-handoff",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "desktop-action-ending",
    file: desktopScreenshotNames[11],
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    phase: "action",
    targetProgress: 0.52,
    expectedState: null,
    variant: "action-ending",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
  },
  {
    id: "mobile-presence",
    file: mobileScreenshotNames[0],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "presence",
    targetProgress: 0.58,
    expectedState: "resolved",
    variant: "authored-mobile-presence",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-partner-field",
    file: mobileScreenshotNames[1],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "access",
    targetProgress: 0.72,
    expectedState: "founding",
    variant: "authored-mobile-partner-field",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-startup-desire",
    file: mobileScreenshotNames[2],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "startup",
    targetProgress: 0.72,
    expectedState: "field",
    variant: "authored-mobile-field-crossing",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-method",
    file: mobileScreenshotNames[3],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "method",
    targetProgress: 0.5,
    expectedState: "test",
    variant: "authored-mobile-method",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-activity",
    file: mobileScreenshotNames[4],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "activity",
    targetProgress: 0.48,
    expectedState: null,
    variant: "authored-mobile-activity",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-evidence",
    file: mobileScreenshotNames[5],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "evidence",
    targetProgress: 0.46,
    expectedState: null,
    variant: "authored-mobile-evidence",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "mobile-action",
    file: mobileScreenshotNames[6],
    profile: "mobile",
    mode: "normal",
    viewport: mobileViewport,
    phase: "action",
    targetProgress: 0.44,
    expectedState: null,
    variant: "authored-mobile-action",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
  {
    id: "reduced-motion-partner-field",
    file: accessibilityScreenshotNames[0],
    profile: "accessibility",
    mode: "reduced-motion",
    viewport: desktopViewport,
    phase: "access",
    targetProgress: 0.72,
    expectedState: "founding",
    variant: "resolved-reduced-motion-partner-field",
    expectedRenderMode: "reduced-motion",
    requireWebgl: false,
    query: "motion=reduce",
  },
  {
    id: "no-webgl-method",
    file: accessibilityScreenshotNames[1],
    profile: "accessibility",
    mode: "no-webgl",
    viewport: desktopViewport,
    phase: "method",
    targetProgress: 0.5,
    expectedState: "test",
    variant: "dom-css-method-fallback",
    expectedRenderMode: "no-webgl-fallback",
    requireWebgl: false,
    query: "webgl=off",
  },
  {
    id: "keyboard-focus-startup-action",
    file: accessibilityScreenshotNames[2],
    profile: "accessibility",
    mode: "keyboard-focus",
    viewport: desktopViewport,
    phase: "startup",
    targetProgress: 0.72,
    expectedState: "field",
    variant: "keyboard-focus-primary-startup-action",
    expectedRenderMode: "webgl-enhanced",
    requireWebgl: true,
    action: "keyboard-focus-startup-action",
  },
  {
    id: "forced-colors-homepage",
    file: accessibilityScreenshotNames[3],
    profile: "accessibility",
    mode: "forced-colors",
    viewport: desktopViewport,
    phase: "presence",
    targetProgress: 0.62,
    expectedState: "resolved",
    variant: "forced-colors-representative-homepage",
    expectedRenderMode: "dom-fallback-ready",
    requireWebgl: false,
  },
]);

const journeyDefinition = Object.freeze({
  id: "desktop-phase-r-complete-journey",
  file: "desktop-phase-r-journey.webm",
  profile: "desktop",
  mode: "normal",
  viewport: desktopViewport,
  minimumDurationSeconds: 30,
  maximumDurationSeconds: 120,
  initialDwellMs: 1_200,
  stops: Object.freeze([
    { id: "presence-resolved", phase: "presence", progress: 0.62, state: "resolved", scrollMs: 1_000, dwellMs: 1_000 },
    { id: "partner-opening", phase: "access", progress: 0.12, state: "opening", scrollMs: 1_000, dwellMs: 1_200 },
    { id: "partner-strategic", phase: "access", progress: 0.48, state: "strategic", scrollMs: 1_300, dwellMs: 1_800 },
    { id: "partner-founding", phase: "access", progress: 0.82, state: "founding", scrollMs: 1_400, dwellMs: 1_800 },
    { id: "field-crossing-outside", phase: "startup", progress: 0.18, state: "outside", scrollMs: 1_200, dwellMs: 900 },
    { id: "field-crossing-threshold", phase: "startup", progress: 0.47, state: "threshold", scrollMs: 900, dwellMs: 1_200 },
    { id: "field-crossing-field", phase: "startup", progress: 0.76, state: "field", scrollMs: 1_100, dwellMs: 1_400 },
    { id: "method-find", phase: "method", progress: 0.18, state: "find", scrollMs: 1_200, dwellMs: 1_300 },
    { id: "method-test", phase: "method", progress: 0.5, state: "test", scrollMs: 1_200, dwellMs: 1_500 },
    { id: "method-prove", phase: "method", progress: 0.82, state: "prove", scrollMs: 1_300, dwellMs: 1_500 },
    { id: "activity", phase: "activity", progress: 0.5, state: null, scrollMs: 1_200, dwellMs: 1_400 },
    { id: "evidence", phase: "evidence", progress: 0.5, state: null, scrollMs: 1_200, dwellMs: 1_500 },
    { id: "action", phase: "action", progress: 0.5, state: null, scrollMs: 1_200, dwellMs: 1_800 },
  ]),
  naturalEndScrollMs: 1_100,
  naturalEndDwellMs: 1_500,
});

const expectedScreenshotNames = Object.freeze([
  ...desktopScreenshotNames,
  ...mobileScreenshotNames,
  ...accessibilityScreenshotNames,
]);
const expectedOutputNames = Object.freeze([
  ...expectedScreenshotNames,
  journeyDefinition.file,
  "manifest.json",
]);
const knownLimitations = Object.freeze([
  "Evidence is captured from isolated local Astro production preview, not the Cloudflare branch preview.",
  "Headless Chromium evidence cannot certify smoothness on the human owner's physical hardware or GPU.",
  "The journey WebM is intentionally silent; it evaluates visual pacing and motion only.",
  "The manifest cannot self-record its final hash; every PNG, WebM, and pre-existing historical artifact is byte-counted and SHA-256 recorded.",
]);

let previewProcess;
let previewPort;
let previewLog = "";
let browser;
let browserVersion;
let stagingDirectory;
let outputPromoted = false;
let captureCompleted = false;
let shutdownPromise;

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pngDimensions(bytes) {
  const signature = "89504e470d0a1a0a";
  if (
    bytes.length < 24
    || bytes.subarray(0, 8).toString("hex") !== signature
    || bytes.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw new Error("Evidence screenshot is not a valid PNG with an IHDR header.");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function validateStaticContract() {
  if (desktopScreenshotNames.length !== 12) {
    throw new Error("Phase R requires exactly 12 named desktop screenshots.");
  }
  if (mobileScreenshotNames.length !== 7) {
    throw new Error("Phase R requires exactly 7 named mobile screenshots.");
  }
  if (accessibilityScreenshotNames.length !== 4) {
    throw new Error("Phase R requires exactly 4 named accessibility/fallback screenshots.");
  }
  const definedNames = screenshotDefinitions.map((definition) => definition.file);
  if (!jsonEqual(definedNames, expectedScreenshotNames)) {
    throw new Error("Screenshot definitions do not match the exact Phase R file inventory.");
  }
  if (new Set(expectedOutputNames).size !== expectedOutputNames.length) {
    throw new Error("Phase R evidence inventory contains duplicate filenames.");
  }
  const journeyPhases = new Set(journeyDefinition.stops.map((stop) => stop.phase));
  for (const phase of phaseOrder) {
    if (!journeyPhases.has(phase)) {
      throw new Error(`Phase R journey omits the ${phase} phase.`);
    }
  }
  const requiredJourneyStates = [
    "partner-strategic",
    "partner-founding",
    "field-crossing-threshold",
    "field-crossing-field",
    "method-find",
    "method-test",
    "method-prove",
    "evidence",
    "action",
  ];
  const journeyStopIds = new Set(journeyDefinition.stops.map((stop) => stop.id));
  for (const stopId of requiredJourneyStates) {
    if (!journeyStopIds.has(stopId)) {
      throw new Error(`Phase R journey omits required milestone ${stopId}.`);
    }
  }
}

function printHelp() {
  console.log(`Q-HUB Phase R human-review evidence capture

Usage:
  node scripts/capture-phase-r-evidence.mjs
  node scripts/capture-phase-r-evidence.mjs --plan
  node scripts/capture-phase-r-evidence.mjs --help

The real capture is fail-closed. It requires branch ${expectedBranch}, a clean
tracked/untracked working tree, and no existing artifacts/review/phase-r path.
It always runs a production build, starts an isolated Astro preview, captures
23 exact PNGs plus the mandatory complete desktop WebM, verifies every artifact,
and atomically promotes a staged package only after all checks pass.

Environment:
  PHASE_R_EVIDENCE_CANDIDATE_SHA  Optional full SHA; it must exactly equal HEAD.

--plan and --dry-run are equivalent read-only planning modes.`);
}

function printPlan() {
  console.log(JSON.stringify({
    schemaVersion: 1,
    package: "Q-HUB Phase R human-review evidence",
    outputDirectory: relative(phaseRDirectory),
    preconditions: {
      branch: expectedBranch,
      cleanTrackedAndUntrackedTree: true,
      candidateEnvironmentMustEqualHead: true,
      outputPathMustNotExist: true,
      productionBuildRequired: true,
      isolatedAstroPreviewRequired: true,
    },
    commands: {
      capture: "node scripts/capture-phase-r-evidence.mjs",
      build: "npm run build",
      preview: "node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port <isolated-port>",
    },
    screenshots: screenshotDefinitions.map((definition) => ({
      id: definition.id,
      file: relative(path.join(phaseRDirectory, definition.file)),
      profile: definition.profile,
      mode: definition.mode,
      viewport: definition.viewport,
      phase: definition.phase,
      targetProgress: definition.targetProgress,
      expectedState: definition.expectedState,
      expectedRenderMode: definition.expectedRenderMode,
      query: definition.query ?? null,
      action: definition.action ?? null,
    })),
    journey: {
      ...journeyDefinition,
      file: relative(path.join(phaseRDirectory, journeyDefinition.file)),
      beginsAtScrollY: 0,
      endsAtNaturalPageEnd: true,
    },
    manifest: relative(path.join(phaseRDirectory, "manifest.json")),
    integrity: {
      historicalEvidencePolicy:
        "Every pre-existing artifacts/review file outside phase-r is hashed before capture, after capture, and after atomic promotion; any difference aborts and rolls back.",
      refusalToOverwrite: true,
      exactPngDimensions: true,
      duplicatePngHashesRejected: true,
      videoResolutionDecodeDurationAndNaturalEndVerified: true,
      applicationConsolePageAndRequestErrorsRejected: true,
      stagingPromotion: "sibling staging directory atomically renamed to artifacts/review/phase-r",
    },
    knownLimitations,
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

async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: rootDirectory,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

async function sourceMetadata() {
  const [candidateSha, candidateTree, branch, status, committedAt] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
    git(["show", "-s", "--format=%cI", "HEAD"]),
  ]);
  if (branch !== expectedBranch) {
    throw new Error(
      `Phase R evidence requires branch ${expectedBranch}; received ${branch || "detached HEAD"}.`,
    );
  }
  if (status) {
    throw new Error(
      `Phase R evidence requires a clean tracked/untracked working tree:\n${status}`,
    );
  }
  if (!/^[0-9a-f]{40}$/iu.test(candidateSha)) {
    throw new Error(`Unable to resolve a full candidate SHA (${candidateSha}).`);
  }
  const explicitCandidate = process.env.PHASE_R_EVIDENCE_CANDIDATE_SHA?.trim();
  if (explicitCandidate) {
    if (!/^[0-9a-f]{40}$/iu.test(explicitCandidate)) {
      throw new Error("PHASE_R_EVIDENCE_CANDIDATE_SHA must be a full 40-character SHA.");
    }
    if (explicitCandidate.toLowerCase() !== candidateSha.toLowerCase()) {
      throw new Error(
        `PHASE_R_EVIDENCE_CANDIDATE_SHA ${explicitCandidate} does not equal HEAD ${candidateSha}.`,
      );
    }
  }
  return {
    branch,
    expectedBranch,
    candidateSha,
    candidateTree,
    committedAt,
    candidateBasis: explicitCandidate
      ? "explicit-environment-value-equal-to-clean-head"
      : "clean-head",
    candidateEnvironmentProvided: Boolean(explicitCandidate),
    workingTreeCleanAtStart: true,
    statusPorcelainAtStart: "",
  };
}

async function verifyCandidateUnchanged(source, stage) {
  const [candidateSha, branch, status] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  if (candidateSha !== source.candidateSha || branch !== source.branch) {
    throw new Error(`Candidate HEAD or branch changed ${stage}.`);
  }
  const allowedOutputPrefix = `${relative(phaseRDirectory)}/`;
  const allowedStagingPrefix = stagingDirectory
    ? `${relative(stagingDirectory)}/`
    : null;
  const disallowed = status
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((line) => {
      const file = line.slice(3).replaceAll("\\", "/");
      return !file.startsWith(allowedOutputPrefix)
        && !(allowedStagingPrefix && file.startsWith(allowedStagingPrefix));
    });
  if (disallowed.length) {
    throw new Error(
      `Repository changed outside the Phase R evidence output ${stage}:\n${disallowed.join("\n")}`,
    );
  }
  return {
    candidateSha,
    branch,
    statusScope: status
      ? "only-phase-r-evidence-output"
      : "phase-r-output-ignored-by-git",
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

async function historicalEvidenceInventory() {
  try {
    const stagingLocal = stagingDirectory
      ? path.relative(reviewDirectory, stagingDirectory)
      : null;
    const files = (await listFilesRecursively(reviewDirectory))
      .filter((filePath) => {
        const local = path.relative(reviewDirectory, filePath);
        const isPhaseROutput = local === "phase-r" || local.startsWith(`phase-r${path.sep}`);
        const isActiveStaging = stagingLocal
          && (local === stagingLocal || local.startsWith(`${stagingLocal}${path.sep}`));
        return !isPhaseROutput && !isActiveStaging;
      })
      .sort((left, right) => left.localeCompare(right));
    return Promise.all(files.map(async (filePath) => {
      const bytes = await readFile(filePath);
      return {
        file: relative(filePath),
        bytes: bytes.length,
        sha256: sha256(bytes),
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

function assertHistoricalEvidenceUnchanged(before, after, stage) {
  const beforeDigest = inventoryDigest(before);
  const afterDigest = inventoryDigest(after);
  if (beforeDigest !== afterDigest || !jsonEqual(before, after)) {
    throw new Error(
      `Historical review evidence changed ${stage} (${beforeDigest} -> ${afterDigest}).`,
    );
  }
}

async function prepareStagingDirectory() {
  try {
    await access(phaseRDirectory);
    throw new Error(
      `Refusing to overwrite existing Phase R evidence path: ${relative(phaseRDirectory)}.`,
    );
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  await mkdir(reviewDirectory, { recursive: true });
  stagingDirectory = path.join(
    reviewDirectory,
    `.phase-r-staging-${process.pid}-${Date.now()}`,
  );
  await mkdir(stagingDirectory);
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
      // The isolated preview normally refuses connections briefly during startup.
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
      .split(/\r?\n/u)
      .map((line) => line.trim().split(/\s+/u))
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

async function rollbackPromotion() {
  if (!outputPromoted || captureCompleted || !stagingDirectory) return;
  try {
    await rename(phaseRDirectory, stagingDirectory);
    outputPromoted = false;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

async function shutdown() {
  if (!shutdownPromise) {
    shutdownPromise = (async () => {
      const errors = [];
      try {
        await browser?.close();
      } catch (error) {
        errors.push(error);
      }
      try {
        await stopPreview();
      } catch (error) {
        errors.push(error);
      }
      try {
        await rollbackPromotion();
      } catch (error) {
        errors.push(error);
      }
      if (!captureCompleted && stagingDirectory) {
        try {
          await rm(stagingDirectory, { recursive: true, force: true });
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) {
        throw new AggregateError(errors, "Phase R evidence cleanup failed.");
      }
    })();
  }
  await shutdownPromise;
}

function monitorPage(page) {
  const issues = [];
  page.on("pageerror", (error) => {
    issues.push({ type: "pageerror", message: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.push({ type: "console.error", message: message.text() });
    }
  });
  page.on("requestfailed", (request) => {
    issues.push({
      type: "requestfailed",
      method: request.method(),
      url: request.url(),
      message: request.failure()?.errorText ?? "unknown request failure",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      issues.push({
        type: "http-error",
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
      });
    }
  });
  return issues;
}

function assertNoApplicationIssues(issues, context) {
  if (issues.length) {
    throw new Error(
      `${context} emitted application console/page/request errors:\n${JSON.stringify(issues, null, 2)}`,
    );
  }
}

function applicationIssueSummary(issues) {
  return {
    status: "verified-zero-errors",
    consoleErrors: issues.filter((issue) => issue.type === "console.error").length,
    pageErrors: issues.filter((issue) => issue.type === "pageerror").length,
    requestErrors: issues.filter((issue) => ["requestfailed", "http-error"].includes(issue.type)).length,
  };
}

function contextOptions(definition) {
  const mobile = definition.profile === "mobile";
  return {
    viewport: definition.viewport,
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
    colorScheme: "dark",
    reducedMotion: definition.mode === "reduced-motion" ? "reduce" : "no-preference",
    forcedColors: definition.mode === "forced-colors" ? "active" : "none",
  };
}

async function prepareAppPage(
  page,
  baseUrl,
  definition,
  { freezeTransitions = true } = {},
) {
  const url = new URL("/", baseUrl);
  if (definition.query) url.search = definition.query;
  const response = await page.goto(url.toString(), { waitUntil: "networkidle" });
  if (!response?.ok()) {
    throw new Error(`Homepage returned ${response?.status() ?? "no response"}.`);
  }
  await page.waitForFunction(() => document.documentElement.dataset.js === "true");
  if (await page.locator("astro-dev-toolbar").count()) {
    throw new Error("Astro dev toolbar detected; evidence requires production preview.");
  }
  await page.evaluate(() => document.fonts.ready);
  if (definition.requireWebgl) {
    await page.mouse.move(980, 414, { steps: 10 });
    await page.waitForFunction(
      () => document.documentElement.dataset.renderMode === "webgl-enhanced",
      undefined,
      { timeout: 12_000 },
    );
  }
  if (freezeTransitions) {
    await page.addStyleTag({
      content: `html { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }`,
    });
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
        && getComputedStyle(image).display !== "none"
        && getComputedStyle(image).visibility !== "hidden";
    });
    return visibleImages.every((image) => image.complete && image.naturalWidth > 0);
  }, undefined, { timeout: 15_000 });
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
      try {
        await image.decode();
      } catch {
        if (!image.complete || image.naturalWidth === 0) {
          throw new Error(`Visible image failed to decode: ${image.currentSrc || image.src}`);
        }
      }
    }));
  });
}

async function settlePaint(page, delayMs = 300) {
  await waitForVisibleImages(page);
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await page.waitForTimeout(delayMs);
}

async function targetScrollY(page, phase, targetProgress) {
  return page.evaluate(({ requestedPhase, requestedProgress }) => {
    const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
    if (!(section instanceof HTMLElement)) {
      throw new Error(`Missing ${requestedPhase} section.`);
    }
    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const bounds = section.getBoundingClientRect();
    const absoluteTop = bounds.top + window.scrollY;
    const maximum = Math.max(document.documentElement.scrollHeight - viewportHeight, 0);
    return Math.min(
      maximum,
      Math.max(
        0,
        absoluteTop
          + requestedProgress * Math.max(bounds.height, viewportHeight)
          - marker,
      ),
    );
  }, { requestedPhase: phase, requestedProgress: targetProgress });
}

async function waitForPhaseState(page, phase, targetProgress, expectedState) {
  await page.waitForFunction(
    ({ requestedPhase, requestedProgress, requestedState }) => {
      const root = document.documentElement;
      const section = document.querySelector(`[data-experience-phase="${requestedPhase}"]`);
      if (!(section instanceof HTMLElement)) return false;
      const actualProgress = Number.parseFloat(
        root.style.getPropertyValue("--active-progress") || "-1",
      );
      const substate = requestedPhase === "presence"
        ? section.dataset.presenceState
        : requestedPhase === "access"
          ? section.dataset.partnerState
          : requestedPhase === "startup"
            ? section.dataset.crossingState
            : requestedPhase === "method"
              ? section.dataset.methodState
              : null;
      return root.dataset.activePhase === requestedPhase
        && Math.abs(actualProgress - requestedProgress) <= 0.03
        && (requestedState === null || substate === requestedState);
    },
    {
      requestedPhase: phase,
      requestedProgress: targetProgress,
      requestedState: expectedState,
    },
    { timeout: 10_000 },
  );
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function positionAt(page, definition) {
  const destination = await targetScrollY(
    page,
    definition.phase,
    definition.targetProgress,
  );
  await page.evaluate((scrollY) => {
    window.scrollTo(0, scrollY);
    window.dispatchEvent(new Event("scroll"));
  }, destination);
  await waitForPhaseState(
    page,
    definition.phase,
    definition.targetProgress,
    definition.expectedState,
  );
  return destination;
}

async function focusStartupActionByKeyboard(page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let attempt = 0; attempt < 48; attempt += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(
      () => document.activeElement?.matches("[data-startup-action]") ?? false,
    );
    if (focused) return;
  }
  throw new Error("Keyboard traversal did not reach the primary startup action.");
}

async function captureSemanticState(page, definition) {
  return page.evaluate(({ expectedPhase, baseOrigin }) => {
    const root = document.documentElement;
    const activeSection = document.querySelector(
      `[data-experience-phase="${expectedPhase}"]`,
    );
    if (!(activeSection instanceof HTMLElement)) {
      throw new Error(`Missing active section ${expectedPhase}.`);
    }
    const heading = activeSection.querySelector("h1, h2");
    const headingBounds = heading?.getBoundingClientRect();
    const sticky = activeSection.querySelector(".phase-r-act__sticky");
    const stickyBounds = sticky?.getBoundingClientRect();
    const normalizedText = (value) => (value ?? "").replace(/\s+/gu, " ").trim();
    const substate = expectedPhase === "presence"
      ? activeSection.dataset.presenceState
      : expectedPhase === "access"
        ? activeSection.dataset.partnerState
        : expectedPhase === "startup"
          ? activeSection.dataset.crossingState
          : expectedPhase === "method"
            ? activeSection.dataset.methodState
            : null;
    const partnerRecords = Array.from(
      document.querySelectorAll("[data-partner-id][data-partner-relationship]"),
    ).map((element) => ({
      id: element.getAttribute("data-partner-id"),
      name: normalizedText(element.querySelector("strong")?.textContent),
      relationship: element.getAttribute("data-partner-relationship"),
      opacity: Number.parseFloat(getComputedStyle(element).opacity || "1"),
    }));
    const visiblePartnerNames = Array.from(
      activeSection.querySelectorAll("[data-partner-id] strong, .partner-territory h3"),
    ).filter((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return bounds.width > 0
        && bounds.height > 0
        && bounds.bottom > 0
        && bounds.top < window.innerHeight
        && style.display !== "none"
        && style.visibility !== "hidden";
    }).map((element) => normalizedText(element.textContent));
    const resources = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => /^https?:/iu.test(name));
    const externalResources = resources.filter(
      (name) => new URL(name).origin !== baseOrigin,
    );
    const activeElement = document.activeElement;
    const activeStyle = activeElement instanceof HTMLElement
      ? getComputedStyle(activeElement)
      : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollY: Math.round(window.scrollY),
      maximumScrollY: Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        0,
      ),
      activePhase: root.dataset.activePhase ?? "unknown",
      actualProgress: Number.parseFloat(
        root.style.getPropertyValue("--active-progress") || "-1",
      ),
      sectionLocalProgress: Number.parseFloat(
        activeSection.style.getPropertyValue("--local-progress") || "-1",
      ),
      substate,
      renderMode: root.dataset.renderMode ?? "unknown",
      inputMode: root.dataset.inputMode ?? "unknown",
      partnerFocus: root.dataset.partnerFocus ?? null,
      crossingState: root.dataset.crossingState ?? null,
      methodState: root.dataset.methodState ?? null,
      sectionActive: activeSection.hasAttribute("data-active"),
      phaseOrder: Array.from(document.querySelectorAll("[data-experience-phase]"))
        .map((section) => section.getAttribute("data-experience-phase")),
      h1Count: document.querySelectorAll("main h1").length,
      visibleHeading: Boolean(
        headingBounds
        && headingBounds.width > 0
        && headingBounds.height > 0
        && headingBounds.bottom > 0
        && headingBounds.top < window.innerHeight,
      ),
      headingText: normalizedText(heading?.textContent),
      compositionVisible: Boolean(
        stickyBounds
        && stickyBounds.width > 0
        && stickyBounds.height > 0
        && stickyBounds.bottom > 0
        && stickyBounds.top < window.innerHeight,
      ),
      partnerRecords,
      visiblePartnerNames,
      methodWords: Array.from(document.querySelectorAll("[data-method-word]"))
        .map((word) => normalizedText(word.textContent)),
      activitySignals: Array.from(document.querySelectorAll(".activity-signals li"))
        .map((signal) => normalizedText(signal.textContent)),
      startupActionHref: document.querySelector("[data-startup-action]")
        ?.getAttribute("href") ?? null,
      proofHandoffHref: document.querySelector("[data-proof-handoff]")
        ?.getAttribute("href") ?? null,
      finalActionHref: document.querySelector("[data-work-with-quantum]")
        ?.getAttribute("href") ?? null,
      activeElement: activeElement instanceof HTMLElement
        ? {
            tag: activeElement.tagName,
            href: activeElement instanceof HTMLAnchorElement
              ? activeElement.getAttribute("href")
              : null,
            startupAction: activeElement.matches("[data-startup-action]"),
            outlineStyle: activeStyle?.outlineStyle ?? null,
            outlineWidth: activeStyle?.outlineWidth ?? null,
          }
        : null,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forcedColors: matchMedia("(forced-colors: active)").matches,
      externalResources,
    };
  }, { expectedPhase: definition.phase, baseOrigin: new URL(page.url()).origin });
}

function assertSemanticState(state, definition) {
  if (
    state.viewport.width !== definition.viewport.width
    || state.viewport.height !== definition.viewport.height
  ) {
    throw new Error(
      `${definition.id} resolved ${state.viewport.width}x${state.viewport.height}, expected `
        + `${definition.viewport.width}x${definition.viewport.height}.`,
    );
  }
  if (state.activePhase !== definition.phase || !state.sectionActive) {
    throw new Error(`${definition.id} did not resolve active phase ${definition.phase}.`);
  }
  if (Math.abs(state.actualProgress - definition.targetProgress) > 0.03) {
    throw new Error(
      `${definition.id} progress ${state.actualProgress} differs from ${definition.targetProgress}.`,
    );
  }
  if (definition.expectedState !== null && state.substate !== definition.expectedState) {
    throw new Error(
      `${definition.id} state ${state.substate} differs from ${definition.expectedState}.`,
    );
  }
  if (state.renderMode !== definition.expectedRenderMode) {
    throw new Error(
      `${definition.id} render mode ${state.renderMode} differs from ${definition.expectedRenderMode}.`,
    );
  }
  if (!jsonEqual(state.phaseOrder, phaseOrder)) {
    throw new Error(`${definition.id} does not expose the exact seven homepage phases.`);
  }
  const semanticAnchorVisible = state.visibleHeading
    || (definition.phase === "access" && state.visiblePartnerNames.length > 0);
  if (state.h1Count !== 1 || !semanticAnchorVisible || !state.compositionVisible) {
    throw new Error(`${definition.id} failed semantic heading/composition visibility checks.`);
  }
  const normalizedPartners = state.partnerRecords.map(({ id, name, relationship }) => ({
    id,
    name,
    relationship,
  }));
  if (!jsonEqual(normalizedPartners, expectedPartnerRecords)) {
    throw new Error(`${definition.id} does not expose the exact approved partner taxonomy.`);
  }
  if (!jsonEqual(state.methodWords, ["find.", "test.", "prove."])) {
    throw new Error(`${definition.id} does not expose FIND / TEST / PROVE.`);
  }
  if (state.activitySignals.length !== 4 || state.activitySignals.some((value) => !value)) {
    throw new Error(`${definition.id} does not expose the four current activity signals.`);
  }
  if (!state.startupActionHref?.startsWith("mailto:")) {
    throw new Error(`${definition.id} is missing the startup action destination.`);
  }
  if (state.proofHandoffHref !== "/proof/") {
    throw new Error(`${definition.id} Proof handoff does not target /proof/.`);
  }
  if (!state.finalActionHref?.startsWith("mailto:")) {
    throw new Error(`${definition.id} is missing the final action destination.`);
  }
  if (state.externalResources.length) {
    throw new Error(
      `${definition.id} loaded non-local resources:\n${state.externalResources.join("\n")}`,
    );
  }
  if (definition.profile === "mobile" && state.inputMode !== "touch-scroll") {
    throw new Error(`${definition.id} did not resolve touch-scroll input mode.`);
  }
  if (definition.mode === "reduced-motion" && !state.reducedMotion) {
    throw new Error(`${definition.id} did not activate reduced motion.`);
  }
  if (definition.mode === "forced-colors" && !state.forcedColors) {
    throw new Error(`${definition.id} did not activate forced colors.`);
  }
  if (definition.action === "keyboard-focus-startup-action") {
    const focus = state.activeElement;
    if (
      !focus?.startupAction
      || focus.outlineStyle === "none"
      || Number.parseFloat(focus.outlineWidth ?? "0") < 2
    ) {
      throw new Error(`${definition.id} did not preserve visible keyboard focus.`);
    }
  }
  if (definition.phase === "access" && definition.expectedState !== "opening") {
    const relationship = definition.expectedState === "strategic"
      ? "strategic-partner"
      : "founding-partner";
    const maximumOpacity = Math.max(
      ...state.partnerRecords
        .filter((partner) => partner.relationship === relationship)
        .map((partner) => partner.opacity),
    );
    if (maximumOpacity < 0.75) {
      throw new Error(`${definition.id} did not visibly resolve its partner relationship.`);
    }
  }
}

async function captureScreenshot(baseUrl, definition, source) {
  const context = await browser.newContext(contextOptions(definition));
  const page = await context.newPage();
  const issues = monitorPage(page);
  try {
    await prepareAppPage(page, baseUrl, definition);
    await positionAt(page, definition);
    if (definition.action === "keyboard-focus-startup-action") {
      await focusStartupActionByKeyboard(page);
      await positionAt(page, definition);
    }
    await settlePaint(page);
    const state = await captureSemanticState(page, definition);
    assertSemanticState(state, definition);
    assertNoApplicationIssues(issues, definition.id);

    const outputPath = path.join(stagingDirectory, definition.file);
    const bytes = await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: false,
      animations: "disabled",
    });
    assertNoApplicationIssues(issues, definition.id);
    const dimensions = pngDimensions(bytes);
    if (
      dimensions.width !== definition.viewport.width
      || dimensions.height !== definition.viewport.height
    ) {
      throw new Error(
        `${definition.file} has ${dimensions.width}x${dimensions.height}, expected `
          + `${definition.viewport.width}x${definition.viewport.height}.`,
      );
    }
    return {
      id: definition.id,
      kind: "screenshot",
      file: relative(path.join(phaseRDirectory, definition.file)),
      profile: definition.profile,
      mode: definition.mode,
      variant: definition.variant,
      viewport: state.viewport,
      pngDimensions: dimensions,
      phase: state.activePhase,
      targetProgress: definition.targetProgress,
      actualProgress: round(state.actualProgress),
      sectionLocalProgress: round(state.sectionLocalProgress),
      expectedState: definition.expectedState,
      actualState: state.substate,
      scrollY: state.scrollY,
      renderMode: state.renderMode,
      inputMode: state.inputMode,
      partnerFocus: state.partnerFocus,
      crossingState: state.crossingState,
      methodState: state.methodState,
      headingText: state.headingText,
      semanticState: {
        exactPhaseOrder: true,
        singleH1: true,
        visibleHeading: state.visibleHeading,
        visiblePartnerNames: state.visiblePartnerNames,
        exactPartnerTaxonomy: true,
        findTestProvePresent: true,
        proofHandoff: state.proofHandoffHref,
        focusedHref: state.activeElement?.href ?? null,
      },
      accessibilityState: {
        reducedMotion: state.reducedMotion,
        forcedColors: state.forcedColors,
      },
      applicationMonitoring: applicationIssueSummary(issues),
      sourceCandidate: source.candidateSha,
      capturedAt: new Date().toISOString(),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  } finally {
    await context.close();
  }
}

async function animateScroll(page, destination, durationMs) {
  await page.evaluate(({ destinationY, duration }) => new Promise((resolve) => {
    const start = window.scrollY;
    const delta = destinationY - start;
    const began = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - began) / Math.max(duration, 1));
      const eased = progress < 0.5
        ? 4 * progress ** 3
        : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo(0, start + delta * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  }), { destinationY: destination, duration: durationMs });
}

async function journeySnapshot(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const phase = root.dataset.activePhase ?? "unknown";
    const section = document.querySelector(`[data-experience-phase="${phase}"]`);
    const substate = section instanceof HTMLElement
      ? phase === "presence"
        ? section.dataset.presenceState
        : phase === "access"
          ? section.dataset.partnerState
          : phase === "startup"
            ? section.dataset.crossingState
            : phase === "method"
              ? section.dataset.methodState
              : null
      : null;
    const maximumScrollY = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      0,
    );
    const ending = document.querySelector(".phase-r-ending")?.getBoundingClientRect();
    return {
      phase,
      substate,
      progress: Number.parseFloat(
        root.style.getPropertyValue("--active-progress") || "-1",
      ),
      scrollY: Math.round(window.scrollY),
      maximumScrollY: Math.round(maximumScrollY),
      naturalEnd: Math.abs(window.scrollY - maximumScrollY) <= 2,
      finalActionVisible: Boolean(
        ending
        && ending.width > 0
        && ending.height > 0
        && ending.bottom > 0
        && ending.top < window.innerHeight,
      ),
      renderMode: root.dataset.renderMode ?? "unknown",
    };
  });
}

async function loadStandaloneVideo(page, bytes, id = "phase-r-video-probe") {
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
    { timeout: 30_000 },
  );
}

async function probeVideoArtifact(videoPath, expectedViewport) {
  const bytes = await readFile(videoPath);
  const context = await browser.newContext({
    viewport: expectedViewport,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const issues = monitorPage(page);
  try {
    await loadStandaloneVideo(page, bytes);
    const result = await page.locator("#phase-r-video-probe").evaluate(
      async (element) => {
        if (!(element instanceof HTMLVideoElement)) {
          throw new Error("Expected Phase R journey video probe.");
        }
        const decodedFractions = [];
        for (const fraction of [0.1, 0.5, 0.9]) {
          const target = Math.min(
            Math.max(element.duration * fraction, 0.1),
            element.duration - 0.05,
          );
          element.pause();
          if (Math.abs(element.currentTime - target) > 0.01) {
            await new Promise((resolve, reject) => {
              const timeout = window.setTimeout(
                () => reject(new Error("Timed out seeking Phase R journey probe.")),
                10_000,
              );
              element.addEventListener("seeked", () => {
                window.clearTimeout(timeout);
                resolve(undefined);
              }, { once: true });
              element.currentTime = target;
            });
          }
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
            await new Promise((resolve) => window.setTimeout(resolve, 300));
            decodedFrame = element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
          }
          element.pause();
          decodedFractions.push({
            fraction,
            seconds: element.currentTime,
            decodedFrame,
          });
        }
        return {
          durationSeconds: element.duration,
          videoWidth: element.videoWidth,
          videoHeight: element.videoHeight,
          readyState: element.readyState,
          decodedFractions,
        };
      },
    );
    if (
      result.videoWidth !== expectedViewport.width
      || result.videoHeight !== expectedViewport.height
      || result.readyState < 2
      || result.decodedFractions.some((frame) => !frame.decodedFrame)
    ) {
      throw new Error(
        `Journey WebM failed resolution/decode verification: ${JSON.stringify(result)}.`,
      );
    }
    assertNoApplicationIssues(issues, "journey-video-probe");
    return {
      ...result,
      durationSeconds: round(result.durationSeconds),
      decodedFractions: result.decodedFractions.map((frame) => ({
        ...frame,
        seconds: round(frame.seconds),
      })),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  } finally {
    await context.close();
  }
}

async function recordDesktopJourney(baseUrl, source) {
  const videoStagingDirectory = path.join(stagingDirectory, ".video");
  await mkdir(videoStagingDirectory);
  const definition = {
    profile: "desktop",
    mode: "normal",
    viewport: desktopViewport,
    requireWebgl: true,
  };
  const context = await browser.newContext({
    ...contextOptions(definition),
    recordVideo: { dir: videoStagingDirectory, size: desktopViewport },
  });
  const page = await context.newPage();
  const issues = monitorPage(page);
  let video;
  const timeline = [];
  let journeyElapsedMs;
  let finalState;
  try {
    await prepareAppPage(page, baseUrl, definition, { freezeTransitions: false });
    video = page.video();
    if (!video) throw new Error("Playwright did not provide a Phase R journey video.");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
    const journeyStartedAt = await page.evaluate(() => performance.now());
    const initialState = await journeySnapshot(page);
    if (
      initialState.scrollY !== 0
      || initialState.phase !== "presence"
      || initialState.substate !== "origin"
    ) {
      throw new Error(`Journey must begin at scrollY 0 in PRESENCE: ${JSON.stringify(initialState)}.`);
    }
    timeline.push({
      id: "journey-opening",
      requestedPhase: "presence",
      requestedProgress: null,
      requestedState: "origin",
      requestedScrollMs: 0,
      requestedDwellMs: journeyDefinition.initialDwellMs,
      reachedAtMs: 0,
      observed: initialState,
    });
    await page.waitForTimeout(journeyDefinition.initialDwellMs);

    for (const stop of journeyDefinition.stops) {
      const destination = await targetScrollY(page, stop.phase, stop.progress);
      await animateScroll(page, destination, stop.scrollMs);
      await waitForPhaseState(page, stop.phase, stop.progress, stop.state);
      if (["presence", "startup", "method"].includes(stop.phase)) {
        const pointerX = stop.phase === "method" ? 1_050 : 970;
        const pointerY = stop.phase === "startup" ? 520 : 414;
        await page.mouse.move(pointerX, pointerY, { steps: 12 });
      }
      await page.waitForTimeout(stop.dwellMs);
      const observed = await journeySnapshot(page);
      const reachedAt = await page.evaluate(() => performance.now());
      if (
        observed.phase !== stop.phase
        || Math.abs(observed.progress - stop.progress) > 0.03
        || (stop.state !== null && observed.substate !== stop.state)
      ) {
        throw new Error(`Journey failed milestone ${stop.id}: ${JSON.stringify(observed)}.`);
      }
      timeline.push({
        id: stop.id,
        requestedPhase: stop.phase,
        requestedProgress: stop.progress,
        requestedState: stop.state,
        requestedScrollMs: stop.scrollMs,
        requestedDwellMs: stop.dwellMs,
        reachedAtMs: round(reachedAt - journeyStartedAt, 3),
        observed,
      });
    }

    const naturalEndY = await page.evaluate(
      () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 0),
    );
    await animateScroll(page, naturalEndY, journeyDefinition.naturalEndScrollMs);
    await page.waitForFunction(
      () => document.documentElement.dataset.activePhase === "action",
      undefined,
      { timeout: 8_000 },
    );
    await page.waitForTimeout(journeyDefinition.naturalEndDwellMs);
    finalState = await journeySnapshot(page);
    const journeyEndedAt = await page.evaluate(() => performance.now());
    journeyElapsedMs = journeyEndedAt - journeyStartedAt;
    if (!finalState.naturalEnd || finalState.phase !== "action" || !finalState.finalActionVisible) {
      throw new Error(`Journey did not reach the natural ACTION ending: ${JSON.stringify(finalState)}.`);
    }
    timeline.push({
      id: "natural-page-end",
      requestedPhase: "action",
      requestedProgress: null,
      requestedState: null,
      requestedScrollMs: journeyDefinition.naturalEndScrollMs,
      requestedDwellMs: journeyDefinition.naturalEndDwellMs,
      reachedAtMs: round(journeyElapsedMs, 3),
      observed: finalState,
    });
    assertNoApplicationIssues(issues, "desktop-phase-r-journey");
  } finally {
    await context.close();
  }

  assertNoApplicationIssues(issues, "desktop-phase-r-journey");
  const recordedPath = await video.path();
  const stagedPath = path.join(stagingDirectory, journeyDefinition.file);
  await rename(recordedPath, stagedPath);
  await rm(videoStagingDirectory, { recursive: true, force: true });
  const probe = await probeVideoArtifact(stagedPath, desktopViewport);
  if (
    probe.durationSeconds < journeyDefinition.minimumDurationSeconds
    || probe.durationSeconds > journeyDefinition.maximumDurationSeconds
    || probe.durationSeconds < journeyElapsedMs / 1_000 - 2
  ) {
    throw new Error(
      `Journey duration ${probe.durationSeconds}s does not match realistic ${round(journeyElapsedMs / 1_000)}s pacing.`,
    );
  }
  const observedPhases = new Set(timeline.map((entry) => entry.observed.phase));
  if (phaseOrder.some((phase) => !observedPhases.has(phase))) {
    throw new Error("Journey timeline did not observe every homepage phase.");
  }
  return {
    id: journeyDefinition.id,
    kind: "video",
    file: relative(path.join(phaseRDirectory, journeyDefinition.file)),
    profile: journeyDefinition.profile,
    mode: journeyDefinition.mode,
    viewport: journeyDefinition.viewport,
    beginsAtScrollY: 0,
    naturalEnd: finalState,
    realisticPacing: {
      status: "verified",
      elapsedSeconds: round(journeyElapsedMs / 1_000),
      minimumDurationSeconds: journeyDefinition.minimumDurationSeconds,
      maximumDurationSeconds: journeyDefinition.maximumDurationSeconds,
    },
    timeline,
    decodeVerification: {
      status: "resolution-duration-and-three-decoded-frames-verified",
      durationSeconds: probe.durationSeconds,
      videoWidth: probe.videoWidth,
      videoHeight: probe.videoHeight,
      readyState: probe.readyState,
      decodedFractions: probe.decodedFractions,
    },
    applicationMonitoring: applicationIssueSummary(issues),
    sourceCandidate: source.candidateSha,
    capturedAt: new Date().toISOString(),
    durationSeconds: probe.durationSeconds,
    bytes: probe.bytes,
    sha256: probe.sha256,
  };
}

async function verifyArtifactRecords(records, directory) {
  for (const record of records) {
    const filePath = path.join(directory, path.basename(record.file));
    const bytes = await readFile(filePath);
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
      throw new Error(`${record.file} does not match its recorded byte/hash integrity.`);
    }
    if (record.kind === "screenshot") {
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

async function assertDirectoryShape(directory, expectedNames, stage) {
  const names = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = [...expectedNames].sort();
  if (!jsonEqual(names, expected)) {
    throw new Error(
      `Incomplete Phase R evidence ${stage}. Expected ${expected.join(", ")}; received ${names.join(", ")}.`,
    );
  }
}

async function promoteStaging() {
  try {
    await access(phaseRDirectory);
    throw new Error(`Refusing to overwrite ${relative(phaseRDirectory)} during promotion.`);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
  await mkdir(reviewDirectory, { recursive: true });
  await rename(stagingDirectory, phaseRDirectory);
  outputPromoted = true;
}

async function main() {
  validateStaticContract();
  const command = parseCommandLine();
  if (command.help) {
    printHelp();
    return;
  }
  if (command.plan) {
    printPlan();
    return;
  }

  const source = await sourceMetadata();
  const historicalBefore = await historicalEvidenceInventory();
  await prepareStagingDirectory();

  const buildStartedAt = Date.now();
  await runNpm(["run", "build"]);
  const buildDurationMs = Date.now() - buildStartedAt;
  await access(path.join(rootDirectory, "dist", "index.html"));
  await verifyCandidateUnchanged(source, "during production build");

  const port = await reservePort();
  const baseUrl = `http://${host}:${port}/`;
  previewProcess = startPreview(port);
  await waitForPreview(baseUrl);
  browser = await chromium.launch({ headless: true });
  browserVersion = browser.version();

  const captures = [];
  for (const definition of screenshotDefinitions) {
    captures.push(await captureScreenshot(baseUrl, definition, source));
  }
  if (captures.length !== 23) {
    throw new Error(`Expected exactly 23 Phase R screenshots; captured ${captures.length}.`);
  }
  if (new Set(captures.map((capture) => capture.sha256)).size !== captures.length) {
    throw new Error("Phase R screenshot package contains duplicate rendered PNG frames.");
  }

  const journey = await recordDesktopJourney(baseUrl, source);
  const artifacts = [...captures, journey];
  await verifyArtifactRecords(artifacts, stagingDirectory);
  const historicalAfterCapture = await historicalEvidenceInventory();
  assertHistoricalEvidenceUnchanged(
    historicalBefore,
    historicalAfterCapture,
    "during Phase R capture",
  );
  await verifyCandidateUnchanged(source, "during Phase R capture");

  const historicalDigest = inventoryDigest(historicalBefore);
  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase R human-review evidence",
    generatedAt: new Date().toISOString(),
    source,
    commands: {
      capture: "node scripts/capture-phase-r-evidence.mjs",
      build: "npm run build",
      preview: `node ${relative(astroCliPath)} preview --host ${host} --port ${port}`,
      buildDurationMs,
    },
    server: {
      type: "isolated-astro-production-preview",
      baseUrl,
      browser: "Chromium",
      browserVersion,
      developmentServerAllowed: false,
      astroDevToolbarAllowed: false,
    },
    contract: {
      screenshotCount: 23,
      desktopScreenshots: 12,
      mobileScreenshots: 7,
      accessibilityAndFallbackScreenshots: 4,
      journeyVideos: 1,
      desktopViewport,
      mobileViewport,
      exactOutputFiles: expectedOutputNames,
      everyCaptureCandidate: source.candidateSha,
    },
    historicalEvidenceIntegrity: {
      status: "verified-unchanged-before-and-after-atomic-promotion",
      policy:
        "Every pre-existing artifacts/review file outside phase-r is byte-counted and SHA-256 hashed before capture, after capture, and after promotion.",
      fileCount: historicalBefore.length,
      totalBytes: historicalBefore.reduce((sum, item) => sum + item.bytes, 0),
      beforeDigest: historicalDigest,
      afterCaptureDigest: inventoryDigest(historicalAfterCapture),
      afterPromotionDigest: historicalDigest,
      files: historicalBefore,
    },
    captures,
    journey,
    artifactIntegrity: {
      scope: "all 23 PNG screenshots and the mandatory journey WebM",
      everyArtifactByteCountAndSha256Recorded: true,
      everyPngSignatureAndDimensionChecked: true,
      screenshotHashesUnique: true,
      videoResolutionDecodeDurationAndNaturalEndChecked: true,
      manifestSelfHashExcludedByDefinition: true,
    },
    applicationMonitoring: {
      status: "verified-zero-errors-across-every-page-and-video-capture",
      consoleErrors: 0,
      pageErrors: 0,
      requestErrors: 0,
    },
    verification: {
      cleanTrackedAndUntrackedTreeAtStart: true,
      candidateAndBranchUnchangedThroughCapture: true,
      exactStagingInventory: true,
      atomicStagingPromotion: true,
      historicalEvidenceVerifiedAfterPromotionBeforeSuccessfulExit: true,
    },
    limitations: knownLimitations,
  };
  await writeFile(
    path.join(stagingDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await assertDirectoryShape(stagingDirectory, expectedOutputNames, "staging set");
  await promoteStaging();

  const historicalAfterPromotion = await historicalEvidenceInventory();
  assertHistoricalEvidenceUnchanged(
    historicalBefore,
    historicalAfterPromotion,
    "after Phase R atomic promotion",
  );
  await assertDirectoryShape(phaseRDirectory, expectedOutputNames, "final package");
  await verifyArtifactRecords(artifacts, phaseRDirectory);
  const repositoryAfterPromotion = await verifyCandidateUnchanged(
    source,
    "after Phase R atomic promotion",
  );
  captureCompleted = true;

  console.log("Phase R evidence captured: 23 PNGs, 1 complete journey WebM, and 1 manifest.");
  console.log(`Manifest: ${relative(path.join(phaseRDirectory, "manifest.json"))}`);
  console.log(`Candidate: ${source.candidateSha}`);
  console.log(`Browser: Chromium ${browserVersion}`);
  console.log(`Journey: ${journey.durationSeconds}s / ${journey.bytes} bytes / ${journey.sha256}`);
  console.log(`Historical evidence: ${repositoryAfterPromotion.statusScope} / ${historicalDigest}`);
}

process.once("SIGINT", () => void shutdown().finally(() => process.exit(130)));
process.once("SIGTERM", () => void shutdown().finally(() => process.exit(143)));

try {
  await main();
} finally {
  await shutdown();
}
