#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

const execFileAsync = promisify(execFile);
const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const distIndex = path.join(rootDirectory, "dist", "index.html");
const phaseRxCandidateShaEnvironmentName = "PHASE_RX_LIGHTHOUSE_CANDIDATE_SHA";
const phaseRxMode = Boolean(process.env[phaseRxCandidateShaEnvironmentName]?.trim());
const artifactDirectory = process.env.LIGHTHOUSE_ARTIFACT_DIRECTORY
  ? path.resolve(process.env.LIGHTHOUSE_ARTIFACT_DIRECTORY)
  : path.join(rootDirectory, "artifacts", "lighthouse", phaseRxMode ? "phase-rx" : "phase-r");
const host = "127.0.0.1";
const expectedBranch = phaseRxMode
  ? "repair/phase-rx-experience-integration-scroll-fluidity"
  : "redirect/quantum-presence-startup-magnet";
const candidateShaEnvironmentName = phaseRxMode
  ? phaseRxCandidateShaEnvironmentName
  : "PHASE_R_LIGHTHOUSE_CANDIDATE_SHA";
const categories = ["performance", "accessibility", "best-practices", "seo"];
const requiredAuditCount = 6;
const routeTargets = Object.freeze([
  { name: "homepage", route: "/" },
  { name: "proof-index", route: "/proof/" },
  {
    name: "maradin-field-record",
    route: "/proof/maradin-dynamic-ground-projection/"
  }
]);

const profiles = [
  {
    name: "desktop",
    config: desktopConfig,
    thresholds: {
      performance: 0.95,
      accessibility: 0.95,
      "best-practices": 0.95,
      seo: 0.95,
      cls: 0
    }
  },
  {
    name: "mobile",
    config: undefined,
    thresholds: {
      performance: 0.95,
      accessibility: 0.95,
      "best-practices": 0.95,
      seo: 0.95,
      cls: 0
    }
  }
];

let previewProcess;
let previewLog = "";
let previewSpawnError;
let chrome;
let shutdownPromise;
let stagingDirectory;
let promotedTargets = [];
let outputCommitted = false;

function rememberPreviewOutput(chunk) {
  previewLog = `${previewLog}${chunk.toString()}`.slice(-20_000);
}

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
    maxBuffer: 8 * 1024 * 1024
  });
  return stdout.trim();
}

async function repositoryState() {
  const [head, tree, branch, status] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"])
  ]);
  if (!/^[0-9a-f]{40}$/iu.test(head) || !/^[0-9a-f]{40}$/iu.test(tree)) {
    throw new Error(`Unable to resolve full repository HEAD/tree identities (${head}/${tree}).`);
  }
  return { head, tree, branch, status };
}

async function sourceMetadata() {
  const source = await repositoryState();
  if (source.branch !== expectedBranch) {
    throw new Error(
      `Phase R Lighthouse requires branch ${expectedBranch}; received ${source.branch || "detached HEAD"}.`
    );
  }
  const initialUnexpected = unexpectedStatusLines(source.status);
  if (initialUnexpected.length) {
    throw new Error(
      `Lighthouse candidate has unexpected working changes:\n${initialUnexpected.join("\n")}`
    );
  }
  const explicitCandidate = process.env[candidateShaEnvironmentName]?.trim();
  if (!explicitCandidate) {
    throw new Error(
      `Phase R Lighthouse requires ${candidateShaEnvironmentName}=<full clean HEAD SHA>.`
    );
  }
  if (!/^[0-9a-f]{40}$/iu.test(explicitCandidate)) {
    throw new Error(`${candidateShaEnvironmentName} must be a full 40-character SHA.`);
  }
  if (explicitCandidate.toLowerCase() !== source.head.toLowerCase()) {
    throw new Error(
      `${candidateShaEnvironmentName} ${explicitCandidate} does not equal HEAD ${source.head}.`
    );
  }
  return {
    ...source,
    expectedBranch,
    candidateEnvironmentName: candidateShaEnvironmentName,
    candidateBasis: "explicit-environment-value-equal-to-clean-head"
  };
}

function reportNames() {
  return [
    ...routeTargets.flatMap((target) => profiles.flatMap((profile) => [
      `${profile.name}-${target.name}.json`,
      `${profile.name}-${target.name}.html`
    ])),
    "summary.json"
  ];
}

function reportPaths() {
  return reportNames().map((name) => path.join(artifactDirectory, name));
}

function statusPath(line) {
  const value = line.trimStart()
    .replace(/^(?:\?\?|[MADRCU]{1,2})\s+/u, "")
    .replaceAll("\\", "/");
  const renameSeparator = " -> ";
  return value.includes(renameSeparator) ? value.split(renameSeparator).at(-1) : value;
}

function unexpectedStatusLines(status, allowedAbsolutePaths = []) {
  const allowed = new Set(allowedAbsolutePaths
    .filter((filePath) => path.isAbsolute(filePath) && filePath.startsWith(rootDirectory))
    .map(relative));
  return status
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((line) => {
      const file = statusPath(line);
      if (
        phaseRxMode
        && (
          file === "artifacts/performance/phase-r.zip"
          || file.startsWith("artifacts/review/phase-rx/")
          || file.startsWith("artifacts/performance/phase-rx/")
        )
      ) return false;
      return !allowed.has(file);
    });
}

async function verifyCandidateUnchanged(source, checkpoint, allowedOutputPaths = []) {
  const current = await repositoryState();
  if (
    current.head !== source.head
    || current.tree !== source.tree
    || current.branch !== source.branch
  ) {
    throw new Error(
      `Phase R Lighthouse HEAD/tree/branch changed ${checkpoint}: `
      + `${current.head}/${current.tree}/${current.branch || "detached HEAD"}.`
    );
  }
  const unexpected = unexpectedStatusLines(current.status, allowedOutputPaths);
  if (unexpected.length) {
    throw new Error(
      `Repository changed outside the exact Lighthouse outputs ${checkpoint}:\n${unexpected.join("\n")}`
    );
  }
  return {
    head: current.head,
    tree: current.tree,
    branch: current.branch,
    statusPorcelain: current.status,
    allowedOutputPaths: allowedOutputPaths
      .filter((filePath) => filePath.startsWith(rootDirectory))
      .map(relative),
    unexpectedStatusLines: []
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

async function directoryInventory(directory) {
  const files = (await listFilesRecursively(directory)).sort((left, right) => (
    relative(left).localeCompare(relative(right))
  ));
  const inventory = await Promise.all(files.map(async (filePath) => {
    const bytes = await readFile(filePath);
    return {
      file: path.relative(directory, filePath).split(path.sep).join("/"),
      bytes: bytes.length,
      sha256: sha256(bytes)
    };
  }));
  const digestInput = inventory
    .map((entry) => `${entry.file}\0${entry.sha256}\0${entry.bytes}`)
    .join("\n");
  return {
    count: inventory.length,
    bytes: inventory.reduce((sum, entry) => sum + entry.bytes, 0),
    digestAlgorithm: "sha256(file\\0sha256\\0bytes joined by newline, sorted by file)",
    digest: sha256(Buffer.from(digestInput)),
    inventory
  };
}

function inventoriesEqual(left, right) {
  return left.digest === right.digest
    && left.count === right.count
    && left.bytes === right.bytes;
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : undefined;

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        if (!port) {
          reject(new Error("Unable to reserve a local preview port."));
          return;
        }

        resolve(port);
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
      windowsHide: true
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} exited with code ${code}.`));
    });
  });
}

function startPreview(port) {
  const options = {
    cwd: rootDirectory,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  };
  const child = process.platform === "win32"
    ? spawn(
      process.env.ComSpec ?? "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        `npm run preview -- --host ${host} --port ${port}`
      ],
      options
    )
    : spawn(
      "npm",
      ["run", "preview", "--", "--host", host, "--port", String(port)],
      options
    );

  child.stdout.on("data", rememberPreviewOutput);
  child.stderr.on("data", rememberPreviewOutput);
  child.once("error", (error) => {
    previewSpawnError = error;
    rememberPreviewOutput(error.message);
  });
  return child;
}

async function waitForPreview(url, child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (previewSpawnError) {
      throw new Error(`Unable to start Astro preview: ${previewSpawnError.message}`);
    }

    if (child && child.exitCode !== null && child.exitCode !== 0) {
      throw new Error(
        `Astro preview exited before it became ready (exit ${child.exitCode}).\n${previewLog.trim()}`
      );
    }

    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Preview startup is expected to refuse connections briefly.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}.\n${previewLog.trim()}`);
}

async function terminatePreview(child) {
  if (!child || !child.pid || child.exitCode !== null) return;

  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const taskkill = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true }
      );
      taskkill.once("error", resolve);
      taskkill.once("exit", resolve);
    });
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000))
  ]);

  if (child.exitCode === null) child.kill("SIGKILL");
}

async function stopManagedPreview() {
  if (!previewProcess) return;

  previewProcess.stdout?.destroy();
  previewProcess.stderr?.destroy();
  await terminatePreview(previewProcess);
  previewProcess.unref();

  await new Promise((resolve) => {
    const options = {
      cwd: rootDirectory,
      stdio: "ignore",
      windowsHide: true
    };
    const child = process.platform === "win32"
      ? spawn(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "npm run preview -- stop"],
        options
      )
      : spawn("npm", ["run", "preview", "--", "stop"], options);
    const timeout = setTimeout(() => {
      child.kill();
      resolve();
    }, 10_000);
    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };

    child.once("error", finish);
    child.once("exit", finish);
  });
}

function stopChrome() {
  if (!chrome) return;

  try {
    chrome.kill();
  } finally {
    chrome.process?.unref();
  }
}

async function shutdown() {
  if (!shutdownPromise) {
    shutdownPromise = Promise.allSettled([
      Promise.resolve().then(() => stopChrome()),
      Promise.resolve().then(() => stopManagedPreview())
    ]);
  }

  await shutdownPromise;
}

async function assertOutputsAvailable() {
  for (const target of reportPaths()) {
    try {
      await access(target);
      throw new Error(`Refusing to overwrite existing Lighthouse evidence: ${relative(target)}.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Refusing")) throw error;
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
}

async function prepareStagingDirectory() {
  const stagingParent = path.dirname(artifactDirectory);
  await mkdir(stagingParent, { recursive: true });
  stagingDirectory = await mkdtemp(
    path.join(stagingParent, ".phase-r-lighthouse-staging-")
  );
}

async function assertStagedOutputSet() {
  if (!stagingDirectory) throw new Error("Lighthouse staging directory is unavailable.");
  const received = (await readdir(stagingDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = reportNames().sort();
  if (JSON.stringify(received) !== JSON.stringify(expected)) {
    throw new Error(
      `Lighthouse staging set is incomplete. Expected ${expected.join(", ")}; received ${received.join(", ")}.`
    );
  }
  for (const name of received.filter((name) => name.endsWith(".json"))) {
    JSON.parse(await readFile(path.join(stagingDirectory, name), "utf8"));
  }
}

async function promoteStagedOutputs() {
  if (!stagingDirectory) throw new Error("Lighthouse staging directory is unavailable.");
  await mkdir(artifactDirectory, { recursive: true });
  await assertOutputsAvailable();
  try {
    for (const name of reportNames()) {
      const target = path.join(artifactDirectory, name);
      await rename(path.join(stagingDirectory, name), target);
      promotedTargets.push(target);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const target of [...promotedTargets].reverse()) {
      try {
        await rename(target, path.join(stagingDirectory, path.basename(target)));
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    promotedTargets = [];
    if (rollbackErrors.length) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "Lighthouse output promotion failed and could not be fully rolled back.",
        { cause: error }
      );
    }
    throw error;
  }
}

async function discardUncommittedOutputs() {
  const errors = [];
  if (!outputCommitted && stagingDirectory) {
    for (const target of [...promotedTargets].reverse()) {
      try {
        await rename(target, path.join(stagingDirectory, path.basename(target)));
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
          errors.push(error);
        }
      }
    }
  }
  promotedTargets = [];
  if (stagingDirectory) {
    try {
      await rm(stagingDirectory, { recursive: true, force: true });
    } catch (error) {
      errors.push(error);
    }
    stagingDirectory = undefined;
  }
  if (errors.length) {
    throw new AggregateError(errors, "Unable to discard incomplete Lighthouse outputs.");
  }
}

function categoryScores(lhr) {
  return Object.fromEntries(
    categories.map((category) => [category, lhr.categories[category]?.score ?? null])
  );
}

function auditMetric(lhr, auditId) {
  const audit = lhr.audits[auditId];
  return {
    numericValue: audit?.numericValue ?? null,
    displayValue: audit?.displayValue ?? "not measured"
  };
}

function evaluate(profile, scores, metrics) {
  const failures = [];

  for (const category of categories) {
    const score = scores[category];
    const target = profile.thresholds[category];
    if (typeof score !== "number" || score < target) {
      failures.push(
        `${category}: ${typeof score === "number" ? Math.round(score * 100) : "not measured"} (target ${Math.round(target * 100)})`
      );
    }
  }

  if (
    typeof metrics.cls.numericValue !== "number" ||
    metrics.cls.numericValue > profile.thresholds.cls
  ) {
    failures.push(
      `CLS: ${metrics.cls.numericValue ?? "not measured"} (target <= ${profile.thresholds.cls})`
    );
  }

  return failures;
}

function printResult(result) {
  const scoreText = categories
    .map((category) => {
      const score = result.scores[category];
      return `${category}=${typeof score === "number" ? Math.round(score * 100) : "n/a"}`;
    })
    .join("  ");

  console.log(`\n${result.profile.toUpperCase()} ${result.target.name.toUpperCase()}`);
  console.log(scoreText);
  console.log(
    `LCP=${result.metrics.lcp.displayValue}  TBT=${result.metrics.tbt.displayValue}  CLS=${result.metrics.cls.displayValue}`
  );
  console.log(result.failures.length ? `FAIL: ${result.failures.join("; ")}` : "PASS");
}

async function measure(profile, target, baseUrl) {
  const url = new URL(target.route, baseUrl).toString();
  const flags = {
    port: chrome.port,
    logLevel: process.env.LIGHTHOUSE_LOG_LEVEL ?? "warn",
    output: ["json", "html"],
    onlyCategories: categories
  };
  const runnerResult = await lighthouse(url, flags, profile.config);

  if (!runnerResult) {
    throw new Error(`Lighthouse returned no ${profile.name} result.`);
  }

  const reports = Array.isArray(runnerResult.report)
    ? runnerResult.report
    : [runnerResult.report];
  const htmlReport = reports[1];
  if (!htmlReport) {
    throw new Error(`Lighthouse did not produce the ${profile.name} HTML report.`);
  }

  if (!stagingDirectory) throw new Error("Lighthouse staging directory is unavailable.");
  const jsonName = `${profile.name}-${target.name}.json`;
  const htmlName = `${profile.name}-${target.name}.html`;
  const jsonPath = path.join(stagingDirectory, jsonName);
  const htmlPath = path.join(stagingDirectory, htmlName);
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(runnerResult.lhr, null, 2)}\n`, "utf8"),
    writeFile(htmlPath, htmlReport, "utf8")
  ]);

  const scores = categoryScores(runnerResult.lhr);
  const metrics = {
    lcp: auditMetric(runnerResult.lhr, "largest-contentful-paint"),
    tbt: auditMetric(runnerResult.lhr, "total-blocking-time"),
    cls: auditMetric(runnerResult.lhr, "cumulative-layout-shift")
  };

  return {
    profile: profile.name,
    target,
    measuredUrl: url,
    scores,
    metrics,
    thresholds: profile.thresholds,
    failures: evaluate(profile, scores, metrics),
    artifacts: {
      json: relative(path.join(artifactDirectory, jsonName)),
      html: relative(path.join(artifactDirectory, htmlName))
    }
  };
}

async function main() {
  if (process.env.LIGHTHOUSE_REUSE_URL) {
    throw new Error(
      "Phase R candidate Lighthouse refuses LIGHTHOUSE_REUSE_URL because an external preview cannot be proven to serve the fresh HEAD-bound dist build."
    );
  }

  await assertOutputsAvailable();
  const source = await sourceMetadata();
  await prepareStagingDirectory();
  const buildStartedAt = new Date().toISOString();
  await runNpm(["run", "build"]);
  const buildFinishedAt = new Date().toISOString();
  try {
    await access(distIndex);
  } catch {
    throw new Error("Fresh npm run build completed without producing dist/index.html.");
  }
  await verifyCandidateUnchanged(source, "after the fresh production build");
  const distAfterBuild = await directoryInventory(path.join(rootDirectory, "dist"));
  if (!distAfterBuild.count) throw new Error("Fresh production build produced an empty dist directory.");

  const port = await findAvailablePort();
  const url = `http://${host}:${port}/`;
  previewProcess = startPreview(port);
  await waitForPreview(url, previewProcess);
  console.log(`Measuring the fresh candidate-bound production build at ${url}`);

  const chromeFlags = [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    // This runner audits only its own loopback-served production build. Keeping
    // the flag explicit makes Chrome startup reliable in restricted CI runners.
    "--no-sandbox"
  ];

  chrome = await launch({ chromeFlags });
  const results = [];
  for (const target of routeTargets) {
    for (const profile of profiles) {
      const result = await measure(profile, target, url);
      results.push(result);
      printResult(result);
    }
  }
  if (results.length !== requiredAuditCount) {
    throw new Error(
      `Phase R Lighthouse requires exactly ${requiredAuditCount} audits; received ${results.length}.`
    );
  }

  await shutdown();
  const distAfterAudits = await directoryInventory(path.join(rootDirectory, "dist"));
  if (!inventoriesEqual(distAfterBuild, distAfterAudits)) {
    throw new Error(
      `dist changed during the six Lighthouse audits (${distAfterBuild.digest} -> ${distAfterAudits.digest}).`
    );
  }
  const repositoryBeforePromotion = await verifyCandidateUnchanged(
    source,
    "after all six audits and managed-process shutdown"
  );

  const summary = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    sourceHead: source.head,
    sourceTree: source.tree,
    branch: source.branch,
    expectedBranch: source.expectedBranch,
    candidateBasis: source.candidateBasis,
    candidateEnvironment: {
      name: source.candidateEnvironmentName,
      provided: true,
      equalsHead: true
    },
    measuredBaseUrl: url,
    buildInput: "fresh npm run build executed by this runner before preview startup",
    buildBinding: {
      startedAt: buildStartedAt,
      finishedAt: buildFinishedAt,
      sourceHead: source.head,
      sourceTree: source.tree,
      distDigestAlgorithm: distAfterBuild.digestAlgorithm,
      distDigest: distAfterBuild.digest,
      distFileCount: distAfterBuild.count,
      distBytes: distAfterBuild.bytes,
      unchangedThroughAllSixAudits: true
    },
    repositoryBinding: {
      cleanTrackedAndUntrackedTreeAtStart: true,
      headTreeBranchAndStatusUnchangedAfterBuildAndAudits: true,
      beforePromotion: repositoryBeforePromotion,
      afterPromotionVerification:
        "HEAD/tree/branch must still match and status may contain only exact promoted Lighthouse outputs before successful exit.",
      atomicOutputPolicy:
        "All twelve HTML/JSON reports and summary JSON are validated in staging and promoted as one rollback-protected set."
    },
    routeTargets,
    results
  };
  await writeFile(
    path.join(stagingDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );

  const failures = results.flatMap((result) =>
      result.failures.map(
        (failure) => `${result.profile}/${result.target.name}: ${failure}`
      )
  );
  if (failures.length) {
    throw new Error(`Lighthouse thresholds were not met:\n- ${failures.join("\n- ")}`);
  }

  await assertStagedOutputSet();
  await verifyCandidateUnchanged(source, "immediately before Lighthouse output promotion");
  const distBeforePromotion = await directoryInventory(path.join(rootDirectory, "dist"));
  if (!inventoriesEqual(distAfterBuild, distBeforePromotion)) {
    throw new Error("dist changed after audit verification and before output promotion.");
  }
  await promoteStagedOutputs();
  const repositoryAfterPromotion = await verifyCandidateUnchanged(
    source,
    "after Lighthouse output promotion",
    reportPaths()
  );
  const distAfterPromotion = await directoryInventory(path.join(rootDirectory, "dist"));
  if (!inventoriesEqual(distAfterBuild, distAfterPromotion)) {
    throw new Error("dist changed during Lighthouse output promotion.");
  }
  outputCommitted = true;
  await rm(stagingDirectory, { recursive: true, force: true });
  stagingDirectory = undefined;

  console.log(
    `\nLighthouse thresholds passed for all Phase R routes. Reports: ${artifactDirectory}`
  );
  console.log(
    `Candidate binding verified after promotion: ${repositoryAfterPromotion.head}/${repositoryAfterPromotion.tree}; dist ${distAfterBuild.digest}.`
  );
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void shutdown()
      .then(discardUncommittedOutputs)
      .finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await shutdown();
  await discardUncommittedOutputs();
}
