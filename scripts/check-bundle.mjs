#!/usr/bin/env node

import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const distDirectory = path.join(rootDirectory, "dist");
const indexPath = path.join(distDirectory, "index.html");
const reportPath = path.join(rootDirectory, "artifacts", "bundle-phase-r-report.json");
const acceptedPhase3Baseline = Object.freeze({
  sourceCandidate: "ff78e2d911960bb2c05d7404966bbf688d0764e9",
  implementationCandidate: "70d8b5cc193311b9548c49399dde6a014583e13a",
  totalRawBytes: 20_852,
  totalGzipBytes: 7_961,
  initialRawBytes: 9_179,
  initialGzipBytes: 3_917,
  lazyRawBytes: 11_673,
  lazyGzipBytes: 4_044
});
const forbiddenRuntimeDefinitions = Object.freeze([
  {
    key: "react",
    label: "React / React DOM",
    packages: ["react", "react-dom"],
    patterns: [
      /node_modules[\\/](?:react|react-dom)(?:[\\/]|\b)/i,
      /react(?:-dom)?\.production(?:\.min)?\.js\b/i,
      /\b__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED\b/,
      /\breact\.(?:element|fragment|portal|transitional\.element)\b/i
    ]
  },
  {
    key: "three",
    label: "Three.js",
    packages: ["three"],
    patterns: [
      /node_modules[\\/]three(?:[\\/]|\b)/i,
      /\bthree\.module(?:\.min)?\.js\b/i,
      /\bWebGLRenderer\b/,
      /\bWebGLProgram\b/
    ]
  },
  {
    key: "r3f",
    label: "React Three Fiber",
    packages: ["@react-three/fiber"],
    patterns: [
      /node_modules[\\/]@react-three[\\/]fiber(?:[\\/]|\b)/i,
      /@react-three\/fiber/i,
      /react-three-fiber/i
    ]
  },
  {
    key: "gsap",
    label: "GSAP / ScrollTrigger",
    packages: ["gsap"],
    patterns: [
      /node_modules[\\/]gsap(?:[\\/]|\b)/i,
      /\b(?:GreenSock|ScrollTrigger)\b/,
      /\bgsap(?:\.min)?\.js\b/i
    ]
  },
  {
    key: "heavyRuntimes",
    label: "heavy animation, 3D, carousel, router, or smooth-scroll runtime",
    packages: [
      "@babylonjs/core",
      "@barba/core",
      "@studio-freight/lenis",
      "@tanstack/react-router",
      "animejs",
      "babylonjs",
      "barba.js",
      "framer-motion",
      "lenis",
      "locomotive-scroll",
      "lottie-web",
      "motion",
      "pixi.js",
      "react-router",
      "react-router-dom",
      "smooth-scroll",
      "swiper"
    ],
    patterns: [
      /node_modules[\\/](?:@babylonjs[\\/]core|@barba[\\/]core|@studio-freight[\\/]lenis|@tanstack[\\/]react-router|animejs|babylonjs|barba\.js|framer-motion|lenis|locomotive-scroll|lottie-web|motion|pixi\.js|react-router(?:-dom)?|smooth-scroll|swiper)(?:[\\/]|\b)/i,
      /\b(?:LocomotiveScroll|lottie-web|framer-motion|Babylon\.js|PIXI\.Application)\b/i
    ]
  }
]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolutePath)));
    if (entry.isFile()) files.push(absolutePath);
  }

  return files;
}

function attribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function extractImports(source) {
  const staticImports = [];
  const dynamicImports = [];
  const staticPattern = /(?:import|export)\s*(?:[^"'`()]*?\bfrom\s*)?["'`]([^"'`]+)["'`]/g;
  const dynamicPattern = /import\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

  for (const match of source.matchAll(staticPattern)) staticImports.push(match[1]);
  for (const match of source.matchAll(dynamicPattern)) dynamicImports.push(match[1]);

  return { staticImports, dynamicImports };
}

function localReference(reference, fromFile, jsFiles) {
  if (!reference || /^(?:[a-z]+:|\/\/|data:)/i.test(reference)) return null;

  const withoutQuery = reference.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    decoded = withoutQuery;
  }

  const resolved = decoded.startsWith("/")
    ? decoded.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), decoded));

  if (resolved.startsWith("../") || !jsFiles.has(resolved)) return null;
  return resolved;
}

function traverse(roots, graph, includeDynamic) {
  const visited = new Set();
  const queue = [...roots];

  while (queue.length) {
    const current = queue.pop();
    if (!current || visited.has(current) || !graph.has(current)) continue;

    visited.add(current);
    const node = graph.get(current);
    queue.push(...node.staticImports);
    if (includeDynamic) queue.push(...node.dynamicImports);
  }

  return visited;
}

async function packagePresence(definitions) {
  try {
    const [packageManifest, packageLock] = await Promise.all([
      readFile(path.join(rootDirectory, "package.json"), "utf8").then(JSON.parse),
      readFile(path.join(rootDirectory, "package-lock.json"), "utf8").then(JSON.parse)
    ]);
    const directProductionDependencies = new Set(
      Object.keys(packageManifest.dependencies ?? {})
    );
    const packagePaths = Object.keys(packageLock.packages ?? {}).map(normalizePath);
    return Object.fromEntries(definitions.map((definition) => [
      definition.key,
      {
        directProductionDependency: definition.packages.some((packageName) =>
          directProductionDependencies.has(packageName)
        ),
        installedInDependencyTree: definition.packages.some((packageName) =>
          packagePaths.some((entry) => entry.endsWith(`node_modules/${packageName}`))
        ),
        packageNames: definition.packages
      }
    ]));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to inspect package.json and package-lock.json for forbidden Phase R runtimes: ${detail}`,
      { cause: error }
    );
  }
}

function detectRuntime(assets, initialFiles, patterns) {
  const detectedAssets = assets
    .filter((asset) => patterns.some((pattern) => pattern.test(asset.searchText)))
    .map((asset) => asset.file);
  const initialAssets = detectedAssets.filter((file) => initialFiles.has(file));

  return {
    detectedInAssets: detectedAssets.length > 0,
    detectedInInitialCriticalPath: initialAssets.length > 0,
    detectedAssets,
    initialAssets
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function main() {
  let html;
  try {
    html = await readFile(indexPath, "utf8");
  } catch {
    throw new Error(
      "dist/index.html is missing. This inspector does not build the site; run `npm run build` first."
    );
  }

  const allFiles = await walk(distDirectory);
  const jsPaths = allFiles.filter((file) => /\.(?:m?js)$/i.test(file));
  const jsFiles = new Set(
    jsPaths.map((file) => normalizePath(path.relative(distDirectory, file)))
  );
  const graph = new Map();
  const searchableAssets = [];

  for (const absolutePath of jsPaths) {
    const file = normalizePath(path.relative(distDirectory, absolutePath));
    const source = await readFile(absolutePath, "utf8");
    const imports = extractImports(source);
    const sourceMapPath = `${absolutePath}.map`;
    let sourceMap = "";
    try {
      sourceMap = await readFile(sourceMapPath, "utf8");
    } catch {
      // Production source maps are optional.
    }

    graph.set(file, {
      source,
      staticImports: imports.staticImports
        .map((reference) => localReference(reference, file, jsFiles))
        .filter(Boolean),
      dynamicImports: imports.dynamicImports
        .map((reference) => localReference(reference, file, jsFiles))
        .filter(Boolean)
    });
    searchableAssets.push({
      file,
      searchText: `${file}\n${source}\n${sourceMap}`
    });
  }

  const scripts = [];
  const initialRoots = new Set();
  const inlineDynamicRoots = new Set();
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const attributes = match[1];
    const body = match[2].trim();
    const src = attribute(attributes, "src");
    const type = attribute(attributes, "type") ?? "classic";

    if (src) {
      const localFile = localReference(src, "index.html", jsFiles);
      if (localFile) initialRoots.add(localFile);
      scripts.push({ kind: "external", type, src, localFile });
      continue;
    }

    if (body) {
      const imports = extractImports(body);
      const staticRoots = imports.staticImports
        .map((reference) => localReference(reference, "index.html", jsFiles))
        .filter(Boolean);
      const dynamicRoots = imports.dynamicImports
        .map((reference) => localReference(reference, "index.html", jsFiles))
        .filter(Boolean);
      staticRoots.forEach((file) => initialRoots.add(file));
      dynamicRoots.forEach((file) => inlineDynamicRoots.add(file));
      scripts.push({
        kind: "inline",
        type,
        bytes: Buffer.byteLength(body),
        staticImports: staticRoots,
        dynamicImports: dynamicRoots
      });
    }
  }

  const modulePreloads = [];
  const linkPattern = /<link\b([^>]*)>/gi;
  for (const match of html.matchAll(linkPattern)) {
    const attributes = match[1];
    const rel = attribute(attributes, "rel")?.toLowerCase() ?? "";
    const as = attribute(attributes, "as")?.toLowerCase() ?? "";
    if (!rel.split(/\s+/).includes("modulepreload") && !(rel === "preload" && as === "script")) {
      continue;
    }

    const href = attribute(attributes, "href");
    const localFile = localReference(href, "index.html", jsFiles);
    if (localFile) initialRoots.add(localFile);
    modulePreloads.push({ href, localFile });
  }

  const initialFiles = traverse(initialRoots, graph, false);
  const lazyRoots = new Set(inlineDynamicRoots);
  for (const file of initialFiles) {
    graph.get(file)?.dynamicImports.forEach((dependency) => lazyRoots.add(dependency));
  }
  const lazyFiles = traverse(lazyRoots, graph, true);
  initialFiles.forEach((file) => lazyFiles.delete(file));

  const composition = [];
  for (const absolutePath of jsPaths) {
    const file = normalizePath(path.relative(distDirectory, absolutePath));
    const source = graph.get(file)?.source ?? "";
    const fileStat = await stat(absolutePath);
    composition.push({
      file,
      tier: initialFiles.has(file) ? "initial" : lazyFiles.has(file) ? "lazy" : "other",
      rawBytes: fileStat.size,
      gzipBytes: gzipSync(source).byteLength,
      staticImports: graph.get(file)?.staticImports ?? [],
      dynamicImports: graph.get(file)?.dynamicImports ?? []
    });
  }
  composition.sort((left, right) => right.rawBytes - left.rawBytes);

  const installed = await packagePresence(forbiddenRuntimeDefinitions);
  const runtimeDetection = Object.fromEntries(
    forbiddenRuntimeDefinitions.map((definition) => [
      definition.key,
      {
        label: definition.label,
        ...installed[definition.key],
        ...detectRuntime(searchableAssets, initialFiles, definition.patterns)
      }
    ])
  );

  const rawBytes = composition.reduce((sum, asset) => sum + asset.rawBytes, 0);
  const gzipBytes = composition.reduce((sum, asset) => sum + asset.gzipBytes, 0);
  const initialRawBytes = composition
    .filter((asset) => asset.tier === "initial")
    .reduce((sum, asset) => sum + asset.rawBytes, 0);
  const initialGzipBytes = composition
    .filter((asset) => asset.tier === "initial")
    .reduce((sum, asset) => sum + asset.gzipBytes, 0);
  const lazyRawBytes = composition
    .filter((asset) => asset.tier === "lazy")
    .reduce((sum, asset) => sum + asset.rawBytes, 0);
  const lazyGzipBytes = composition
    .filter((asset) => asset.tier === "lazy")
    .reduce((sum, asset) => sum + asset.gzipBytes, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    inspectedEntry: "dist/index.html",
    initialHtml: { scripts, modulePreloads },
    totals: {
      javascriptAssets: composition.length,
      rawBytes,
      gzipBytes,
      initialRawBytes,
      initialGzipBytes,
      lazyRawBytes,
      lazyGzipBytes
    },
    composition,
    runtimeDetection
  };

  report.acceptedPhase3Baseline = acceptedPhase3Baseline;
  report.phaseRDelta = {
    totalRawBytes: report.totals.rawBytes - acceptedPhase3Baseline.totalRawBytes,
    totalGzipBytes: report.totals.gzipBytes - acceptedPhase3Baseline.totalGzipBytes,
    initialRawBytes:
      report.totals.initialRawBytes - acceptedPhase3Baseline.initialRawBytes,
    initialGzipBytes:
      report.totals.initialGzipBytes - acceptedPhase3Baseline.initialGzipBytes,
    lazyRawBytes: lazyRawBytes - acceptedPhase3Baseline.lazyRawBytes,
    lazyGzipBytes: lazyGzipBytes - acceptedPhase3Baseline.lazyGzipBytes
  };

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("Initial HTML scripts:");
  if (!scripts.length) console.log("- none");
  for (const script of scripts) {
    console.log(
      script.kind === "external"
        ? `- ${script.type}: ${script.src} -> ${script.localFile ?? "external or unresolved"}`
        : `- inline ${script.type}: ${formatBytes(script.bytes)}`
    );
  }
  for (const preload of modulePreloads) {
    console.log(`- modulepreload: ${preload.href} -> ${preload.localFile ?? "unresolved"}`);
  }

  console.log("\nJavaScript composition:");
  if (!composition.length) console.log("- no emitted JavaScript assets");
  for (const asset of composition) {
    console.log(
      `- ${asset.tier.padEnd(7)} ${formatBytes(asset.rawBytes).padStart(10)} raw  ${formatBytes(asset.gzipBytes).padStart(10)} gzip  ${asset.file}`
    );
  }
  console.log(
    `Totals: ${formatBytes(report.totals.rawBytes)} raw / ${formatBytes(report.totals.gzipBytes)} gzip; initial ${formatBytes(report.totals.initialRawBytes)} raw / ${formatBytes(report.totals.initialGzipBytes)} gzip`
  );
  console.log(
    `Phase R delta from accepted Phase 3 baseline ${acceptedPhase3Baseline.sourceCandidate}: `
      + `${report.phaseRDelta.totalRawBytes >= 0 ? "+" : ""}${report.phaseRDelta.totalRawBytes} raw / `
      + `${report.phaseRDelta.totalGzipBytes >= 0 ? "+" : ""}${report.phaseRDelta.totalGzipBytes} gzip; `
      + `initial ${report.phaseRDelta.initialRawBytes >= 0 ? "+" : ""}${report.phaseRDelta.initialRawBytes} raw / `
      + `${report.phaseRDelta.initialGzipBytes >= 0 ? "+" : ""}${report.phaseRDelta.initialGzipBytes} gzip`
  );

  for (const definition of forbiddenRuntimeDefinitions) {
    const result = runtimeDetection[definition.key];
    console.log(
      `${definition.label}: direct-production=${result.directProductionDependency ?? "unknown"}; dependency-tree=${result.installedInDependencyTree ?? "unknown"}; emitted=${result.detectedInAssets}; initial-critical=${result.detectedInInitialCriticalPath}`
    );
    if (result.detectedAssets.length) {
      console.log(`  detected assets: ${result.detectedAssets.join(", ")}`);
    }
  }

  console.log(`\nMachine-readable report: ${normalizePath(path.relative(rootDirectory, reportPath))}`);

  const forbiddenFindings = forbiddenRuntimeDefinitions.filter((definition) => {
    const result = runtimeDetection[definition.key];
    return result.directProductionDependency
      || result.installedInDependencyTree
      || result.detectedInAssets;
  });
  if (forbiddenFindings.length > 0) {
    throw new Error(
      `Phase R forbids production heavy runtimes; detected: ${forbiddenFindings.map((definition) => definition.label).join(", ")}.`
    );
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
