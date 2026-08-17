#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDirectory = path.join(rootDirectory, "artifacts", "review", "phase-rx");
const outputPath = path.join(evidenceDirectory, "video-review.json");
const expectedBranch = "repair/phase-rx-experience-integration-scroll-fluidity";
const candidateEnvironment = "PHASE_RX_VIDEO_REVIEW_CANDIDATE_SHA";
const playbackRate = 4;
const videos = [
  { id: "baseline", file: "baseline-continuous-scroll.webm" },
  { id: "candidate-final-continuous", file: "candidate-final-continuous-scroll.webm" },
  { id: "candidate-final-slow", file: "candidate-final-slow-review.webm" },
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

function statusPath(line) {
  const value = line.trimStart()
    .replace(/^(?:\?\?|[MADRCU]{1,2})\s+/u, "")
    .replaceAll("\\", "/");
  return value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
}

async function sourceMetadata() {
  const [head, tree, branch, status] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["rev-parse", "HEAD^{tree}"]),
    git(["branch", "--show-current"]),
    git(["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  const declaredHead = process.env[candidateEnvironment]?.trim() || null;
  if (branch !== expectedBranch) throw new Error(`Expected ${expectedBranch}; received ${branch}.`);
  if (declaredHead !== head) {
    throw new Error(`${candidateEnvironment} ${declaredHead} does not equal HEAD ${head}.`);
  }
  const unexpected = status.split(/\r?\n/u).filter(Boolean).filter((line) => {
    const file = statusPath(line);
    return file !== "artifacts/performance/phase-r.zip"
      && !file.startsWith("artifacts/review/phase-rx/")
      && !file.startsWith("artifacts/performance/phase-rx/");
  });
  if (unexpected.length) throw new Error(`Unexpected working changes:\n${unexpected.join("\n")}`);
  return {
    head,
    tree,
    branch,
    declaredCandidate: declaredHead,
    candidateVerified: true,
    statusAtStart: status,
    preservedPreExistingDeletion: status.includes("artifacts/performance/phase-r.zip"),
  };
}

async function loadVideo(page, videoPath) {
  const bytes = await readFile(videoPath);
  const dataUrl = `data:video/webm;base64,${bytes.toString("base64")}`;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#08070a"><video id="probe" muted preload="auto" src="${dataUrl}"></video></body></html>`);
  await page.waitForFunction(() => {
    const video = document.querySelector("#probe");
    return video instanceof HTMLVideoElement
      && video.readyState >= HTMLMediaElement.HAVE_METADATA
      && Number.isFinite(video.duration)
      && video.duration > 0;
  }, undefined, { timeout: 30_000 });
  return bytes;
}

async function playToEnd(page) {
  return page.locator("#probe").evaluate(async (video, rate) => {
    const eventCounts = { ended: 0, error: 0, stalled: 0, waiting: 0, seeking: 0 };
    for (const eventName of Object.keys(eventCounts)) {
      video.addEventListener(eventName, () => { eventCounts[eventName] += 1; });
    }
    let presentedFrames = 0;
    const countFrame = () => {
      presentedFrames += 1;
      if (!video.ended) video.requestVideoFrameCallback(countFrame);
    };
    video.currentTime = 0;
    video.playbackRate = rate;
    video.requestVideoFrameCallback(countFrame);
    const ended = new Promise((resolve, reject) => {
      video.addEventListener("ended", resolve, { once: true });
      video.addEventListener("error", () => reject(new Error(video.error?.message || "Media error.")), { once: true });
      setTimeout(() => reject(new Error("Timed out playing video to completion.")), 60_000);
    });
    await video.play();
    await ended;
    return {
      playedToEnd: video.ended,
      currentTime: video.currentTime,
      durationSeconds: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      playbackRate: video.playbackRate,
      presentedFrames,
      eventCounts,
      mediaError: video.error ? { code: video.error.code, message: video.error.message } : null,
    };
  }, playbackRate);
}

async function captureFilmstrip(page, outputFile) {
  await page.locator("#probe").evaluate(async (video) => {
    const columns = 3;
    const rows = 3;
    const cellWidth = 400;
    const cellHeight = 250;
    const canvas = document.createElement("canvas");
    canvas.id = "filmstrip";
    canvas.width = columns * cellWidth;
    canvas.height = rows * cellHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable.");
    document.body.replaceChildren(canvas);
    for (let index = 0; index < columns * rows; index += 1) {
      const fraction = index / (columns * rows - 1);
      const target = Math.min(video.duration - 0.001, video.duration * fraction);
      await new Promise((resolve) => {
        video.addEventListener("seeked", resolve, { once: true });
        video.currentTime = target;
      });
      const x = (index % columns) * cellWidth;
      const y = Math.floor(index / columns) * cellHeight;
      context.drawImage(video, x, y, cellWidth, cellHeight);
      context.fillStyle = "rgba(8, 7, 10, 0.78)";
      context.fillRect(x + 10, y + cellHeight - 34, 104, 24);
      context.fillStyle = "#faf8f2";
      context.font = "14px sans-serif";
      context.fillText(`${target.toFixed(2)} s`, x + 18, y + cellHeight - 17);
    }
  });
  const bytes = await page.locator("#filmstrip").screenshot({ path: outputFile, type: "png" });
  return { file: relative(outputFile), bytes: bytes.length, sha256: sha256(bytes) };
}

async function main() {
  if (await exists(outputPath)) throw new Error(`Refusing to overwrite ${relative(outputPath)}.`);
  await mkdir(evidenceDirectory, { recursive: true });
  const source = await sourceMetadata();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const definition of videos) {
      const videoPath = path.join(evidenceDirectory, definition.file);
      if (!await exists(videoPath)) throw new Error(`Missing ${relative(videoPath)}.`);
      const filmstripPath = path.join(evidenceDirectory, `${definition.id}-filmstrip.png`);
      if (await exists(filmstripPath)) throw new Error(`Refusing to overwrite ${relative(filmstripPath)}.`);
      const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
      const bytes = await loadVideo(page, videoPath);
      const playback = await playToEnd(page);
      if (!playback.playedToEnd || playback.mediaError || playback.eventCounts.error) {
        throw new Error(`${definition.id} did not decode and play to completion.`);
      }
      const filmstrip = await captureFilmstrip(page, filmstripPath);
      results.push({
        id: definition.id,
        video: { file: relative(videoPath), bytes: bytes.length, sha256: sha256(bytes) },
        playback,
        filmstrip,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source,
    playbackPolicy: "Every WebM decoded from time zero through the ended event at 4x review speed.",
    reviewScope: "Nine evenly spaced decoded frames per video, rendered as a source-hashed filmstrip.",
    counts: {
      videos: results.length,
      playedToEnd: results.filter((result) => result.playback.playedToEnd).length,
      mediaErrors: results.filter((result) => result.playback.mediaError).length,
    },
    results,
    limitations: [
      "Automated full playback verifies decoding and completion; human review remains the decision boundary.",
      "Filmstrips sample nine frames and do not replace inspection of the complete WebM motion cadence.",
    ],
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report.counts, null, 2)}\n`);
}

await main();
