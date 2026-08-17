#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const maximumTextBytes = 5 * 1024 * 1024;

const secretPatterns = Object.freeze([
  {
    label: "private key material",
    pattern: new RegExp(["-{5}BEGIN ", "(?:RSA |EC |OPENSSH |DSA )?", "PRIVATE KEY-{5}"].join(""), "u"),
  },
  {
    label: "AWS access key identifier",
    pattern: new RegExp(["(?:AKIA|ASIA)", "[0-9A-Z]{16}"].join(""), "u"),
  },
  {
    label: "GitHub access token",
    pattern: new RegExp(["gh", "[pousr]_[A-Za-z0-9]{36,}"].join(""), "u"),
  },
  {
    label: "OpenAI API key",
    pattern: new RegExp(["s", "k-(?:proj-)?[A-Za-z0-9_-]{20,}"].join(""), "u"),
  },
  {
    label: "Slack token",
    pattern: new RegExp(["xo", "x[baprs]-[A-Za-z0-9-]{20,}"].join(""), "u"),
  },
  {
    label: "Google API key",
    pattern: new RegExp(["AI", "za[0-9A-Za-z_-]{35}"].join(""), "u"),
  },
  {
    label: "Stripe live secret",
    pattern: new RegExp(["s", "k_live_[0-9A-Za-z]{16,}"].join(""), "u"),
  },
  {
    label: "credential-bearing URL",
    pattern: /\b[a-z][a-z\d+.-]*:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/iu,
  },
]);

function candidateFiles() {
  const result = spawnSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z"],
    { cwd: rootDirectory, encoding: "buffer" },
  );
  if (result.status !== 0) {
    const error = result.stderr?.toString("utf8").trim() || "git ls-files failed";
    throw new Error(error);
  }
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function lineNumberFor(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

async function run() {
  const findings = [];
  let scanned = 0;
  let skipped = 0;
  let missing = 0;

  for (const relativePath of candidateFiles()) {
    const absolutePath = path.join(rootDirectory, relativePath);
    let buffer;
    try {
      buffer = await readFile(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        missing += 1;
        continue;
      }
      throw error;
    }
    if (buffer.byteLength > maximumTextBytes || buffer.includes(0)) {
      skipped += 1;
      continue;
    }

    const text = buffer.toString("utf8");
    scanned += 1;
    for (const { label, pattern } of secretPatterns) {
      const match = pattern.exec(text);
      if (!match) continue;
      findings.push({
        file: relativePath.replaceAll("\\", "/"),
        label,
        line: lineNumberFor(text, match.index),
      });
    }
  }

  if (findings.length > 0) {
    console.error("Secret scan FAILED. Potential credentials were found (values redacted):");
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} — ${finding.label}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Secret scan PASS: ${scanned} candidate text files checked; ${skipped} binary/oversize files skipped; `
      + `${missing} absent tracked files excluded.`,
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
