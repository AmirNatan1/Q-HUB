#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const distIndex = path.join(rootDirectory, "dist", "index.html");
const artifactDirectory = process.env.LIGHTHOUSE_ARTIFACT_DIRECTORY
  ? path.resolve(process.env.LIGHTHOUSE_ARTIFACT_DIRECTORY)
  : path.join(rootDirectory, "artifacts", "lighthouse", "phase-r");
const host = "127.0.0.1";
const categories = ["performance", "accessibility", "best-practices", "seo"];
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

function rememberPreviewOutput(chunk) {
  previewLog = `${previewLog}${chunk.toString()}`.slice(-20_000);
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

async function readSourceHead() {
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    const child = spawn("git", ["rev-parse", "HEAD"], {
      cwd: rootDirectory,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      const sourceHead = output.trim();
      if (code !== 0 || !/^[0-9a-f]{40}$/u.test(sourceHead)) {
        reject(
          new Error(
            `Unable to record Lighthouse source HEAD: ${errorOutput.trim() || `exit ${code}`}`
          )
        );
        return;
      }
      resolve(sourceHead);
    });
  });
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

  const jsonPath = path.join(artifactDirectory, `${profile.name}-${target.name}.json`);
  const htmlPath = path.join(artifactDirectory, `${profile.name}-${target.name}.html`);
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
      json: path.relative(rootDirectory, jsonPath).replaceAll("\\", "/"),
      html: path.relative(rootDirectory, htmlPath).replaceAll("\\", "/")
    }
  };
}

async function main() {
  try {
    await access(distIndex);
  } catch {
    throw new Error(
      "dist/index.html is missing. This runner does not build the site; run `npm run build` first."
    );
  }

  await mkdir(artifactDirectory, { recursive: true });
  const reuseUrl = process.env.LIGHTHOUSE_REUSE_URL;
  let url;

  if (reuseUrl) {
    const parsedUrl = new URL(reuseUrl);
    const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
    if (!localHosts.has(parsedUrl.hostname) || !/^https?:$/.test(parsedUrl.protocol)) {
      throw new Error("LIGHTHOUSE_REUSE_URL must be an HTTP(S) loopback URL.");
    }

    url = parsedUrl.toString();
    await waitForPreview(url);
    console.log(`Reusing the existing local production preview at ${url}`);
  } else {
    const port = await findAvailablePort();
    url = `http://${host}:${port}/`;
    previewProcess = startPreview(port);
    await waitForPreview(url, previewProcess);
    console.log(`Measuring the existing production build at ${url}`);
  }

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

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceHead: await readSourceHead(),
    measuredBaseUrl: url,
    buildInput: "dist/index.html",
    routeTargets,
    results
  };
  await writeFile(
    path.join(artifactDirectory, "summary.json"),
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

  console.log(
    `\nLighthouse thresholds passed for all Phase R routes. Reports: ${artifactDirectory}`
  );
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void shutdown().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await shutdown();
}
