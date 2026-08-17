#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDirectory = path.join(rootDirectory, "artifacts", "review", "phase-rx");
const manifestPath = path.join(reviewDirectory, "manifest.json");
const candidateEnvironment = "PHASE_RX_MANIFEST_CANDIDATE_SHA";
const expectedBranch = "repair/phase-rx-experience-integration-scroll-fluidity";

const canonicalTargets = [
  "artifacts/review/phase-rx/baseline-continuous-scroll-diagnostic.json",
  "artifacts/review/phase-rx/baseline-continuous-scroll.webm",
  "artifacts/review/phase-rx/candidate-final-continuous-scroll-diagnostic.json",
  "artifacts/review/phase-rx/candidate-final-continuous-scroll.webm",
  "artifacts/review/phase-rx/candidate-final-slow-review-diagnostic.json",
  "artifacts/review/phase-rx/candidate-final-slow-review.webm",
  "artifacts/review/phase-rx/candidate-stills-final",
  "artifacts/review/phase-rx/baseline-filmstrip.png",
  "artifacts/review/phase-rx/candidate-final-continuous-filmstrip.png",
  "artifacts/review/phase-rx/candidate-final-slow-filmstrip.png",
  "artifacts/review/phase-rx/video-review.json",
  "artifacts/performance/phase-rx",
  "artifacts/lighthouse/phase-rx-final",
  "artifacts/bundle-phase-r-report.json",
];

function relative(filePath) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
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

async function listFiles(targetPath) {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) return [targetPath];
  const files = [];
  for (const entry of await readdir(targetPath, { withFileTypes: true })) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

async function recordsFor(targets) {
  const filePaths = [];
  for (const target of targets) {
    const absolutePath = path.join(rootDirectory, target);
    if (!await exists(absolutePath)) throw new Error(`Missing canonical evidence ${target}.`);
    filePaths.push(...await listFiles(absolutePath));
  }
  const uniquePaths = [...new Set(filePaths.map((filePath) => path.resolve(filePath)))];
  const records = await Promise.all(uniquePaths.map(async (filePath) => {
    const bytes = await readFile(filePath);
    return { file: relative(filePath), bytes: bytes.length, sha256: sha256(bytes) };
  }));
  return records.sort((left, right) => left.file.localeCompare(right.file));
}

function digest(records) {
  return sha256(Buffer.from(records.map((record) => (
    `${record.file}\0${record.bytes}\0${record.sha256}`
  )).join("\n")));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDirectory, relativePath), "utf8"));
}

async function main() {
  if (await exists(manifestPath)) throw new Error(`Refusing to overwrite ${relative(manifestPath)}.`);
  const [head, tree, branch] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
  ]);
  const declaredHead = process.env[candidateEnvironment]?.trim() || null;
  if (branch !== expectedBranch) throw new Error(`Expected ${expectedBranch}; received ${branch}.`);
  if (declaredHead !== head) {
    throw new Error(`${candidateEnvironment} ${declaredHead} does not equal HEAD ${head}.`);
  }
  const canonical = await recordsFor(canonicalTargets);
  const allReviewFiles = (await listFiles(reviewDirectory))
    .filter((filePath) => path.resolve(filePath) !== path.resolve(manifestPath));
  const canonicalFiles = new Set(canonical.map((record) => record.file));
  const retainedPaths = allReviewFiles.filter((filePath) => !canonicalFiles.has(relative(filePath)));
  const retained = await recordsFor(retainedPaths.map(relative));
  const [baseline, continuous, slow, stills, runtime, lighthouse, videoReview] = await Promise.all([
    readJson("artifacts/review/phase-rx/baseline-continuous-scroll-diagnostic.json"),
    readJson("artifacts/review/phase-rx/candidate-final-continuous-scroll-diagnostic.json"),
    readJson("artifacts/review/phase-rx/candidate-final-slow-review-diagnostic.json"),
    readJson("artifacts/review/phase-rx/candidate-stills-final/manifest.json"),
    readJson("artifacts/performance/phase-rx/candidate-final-summary.json"),
    readJson("artifacts/lighthouse/phase-rx-final/summary.json"),
    readJson("artifacts/review/phase-rx/video-review.json"),
  ]);
  const manifest = {
    schemaVersion: 1,
    package: "Q-HUB Phase R-X human review evidence",
    generatedAt: new Date().toISOString(),
    source: {
      implementationCandidate: head,
      tree,
      branch,
      candidateEnvironment,
      candidateVerified: declaredHead === head,
      preservedPreExistingDeletion: true,
    },
    canonical: {
      count: canonical.length,
      bytes: canonical.reduce((sum, record) => sum + record.bytes, 0),
      digestAlgorithm: "sha256(file\\0bytes\\0sha256 joined by newline, sorted by file)",
      digest: digest(canonical),
      files: canonical,
    },
    retainedNonCanonical: {
      classification: "QA iterations and source-bound pre-final candidate evidence; retained, excluded from the canonical decision set.",
      count: retained.length,
      bytes: retained.reduce((sum, record) => sum + record.bytes, 0),
      digest: digest(retained),
      files: retained,
    },
    indexes: {
      baseline: { source: baseline.source, video: baseline.video, response: baseline.response },
      candidateContinuous: { source: continuous.source, video: continuous.video, response: continuous.response },
      candidateSlow: { source: slow.source, video: slow.video, response: slow.response },
      stills: { source: stills.source, counts: stills.counts },
      runtime,
      lighthouse: {
        sourceHead: lighthouse.sourceHead,
        buildBinding: lighthouse.buildBinding,
        results: lighthouse.results,
      },
      videoReview: { source: videoReview.source, counts: videoReview.counts },
    },
    limitations: [
      "Headless browser evidence requires human review on physical displays and GPUs.",
      "The diagnostic's METHOD visual-vector sampling undercounts custom-property geometry; the browser contract separately verifies direct METHOD variable changes and immediate reverse response.",
      "Video-capture timing includes encoding and headless review overhead; the dedicated runtime artifacts are the performance source of record.",
      "No Cloudflare preview or production deployment was created in Phase R-X.",
      "The pre-existing user deletion artifacts/performance/phase-r.zip was preserved and excluded from every evidence source check.",
    ],
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    file: relative(manifestPath),
    canonicalFiles: canonical.length,
    retainedFiles: retained.length,
    canonicalDigest: manifest.canonical.digest,
  }, null, 2)}\n`);
}

await main();
