#!/usr/bin/env node

import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const distDirectory = path.join(rootDirectory, "dist");
const indexPath = path.join(distDirectory, "index.html");
const reportPath = path.join(rootDirectory, "artifacts", "bundle-report.json");

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

async function packagePresence() {
  try {
    const packageLock = JSON.parse(
      await readFile(path.join(rootDirectory, "package-lock.json"), "utf8")
    );
    const packagePaths = Object.keys(packageLock.packages ?? {}).map(normalizePath);
    return {
      three: packagePaths.some((entry) => entry.endsWith("node_modules/three")),
      r3f: packagePaths.some((entry) =>
        entry.endsWith("node_modules/@react-three/fiber")
      )
    };
  } catch {
    return { three: null, r3f: null };
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

  const installed = await packagePresence();
  const three = {
    installedInDependencyTree: installed.three,
    ...detectRuntime(searchableAssets, initialFiles, [
      /node_modules[\\/]three(?:[\\/]|\b)/i,
      /\bthree\.module(?:\.min)?\.js\b/i,
      /\bWebGLRenderer\b/,
      /\bWebGLProgram\b/
    ])
  };
  const r3f = {
    installedInDependencyTree: installed.r3f,
    ...detectRuntime(searchableAssets, initialFiles, [
      /node_modules[\\/]@react-three[\\/]fiber(?:[\\/]|\b)/i,
      /@react-three\/fiber/i,
      /react-three-fiber/i
    ])
  };

  const report = {
    generatedAt: new Date().toISOString(),
    inspectedEntry: "dist/index.html",
    initialHtml: { scripts, modulePreloads },
    totals: {
      javascriptAssets: composition.length,
      rawBytes: composition.reduce((sum, asset) => sum + asset.rawBytes, 0),
      gzipBytes: composition.reduce((sum, asset) => sum + asset.gzipBytes, 0),
      initialRawBytes: composition
        .filter((asset) => asset.tier === "initial")
        .reduce((sum, asset) => sum + asset.rawBytes, 0),
      initialGzipBytes: composition
        .filter((asset) => asset.tier === "initial")
        .reduce((sum, asset) => sum + asset.gzipBytes, 0)
    },
    composition,
    runtimeDetection: { three, r3f }
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

  for (const [label, result] of [
    ["Three.js", three],
    ["React Three Fiber", r3f]
  ]) {
    console.log(
      `${label}: dependency=${result.installedInDependencyTree ?? "unknown"}; emitted=${result.detectedInAssets}; initial-critical=${result.detectedInInitialCriticalPath}`
    );
    if (result.detectedAssets.length) {
      console.log(`  detected assets: ${result.detectedAssets.join(", ")}`);
    }
  }

  console.log(`\nMachine-readable report: ${normalizePath(path.relative(rootDirectory, reportPath))}`);

  if (three.detectedInInitialCriticalPath || r3f.detectedInInitialCriticalPath) {
    throw new Error("Three.js or React Three Fiber was detected in the initial critical JavaScript path.");
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
