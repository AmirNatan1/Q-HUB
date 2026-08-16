import { readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd());
const excludedDirectories = new Set([
  '.git',
  '.astro',
  '.wrangler',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'QH_PHASE2_MARADIN_APPROVED',
  'test-results',
]);
const textExtensions = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.scss',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

function repositoryFiles(directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return [];
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return repositoryFiles(absolute);
    if (!entry.isFile() || !textExtensions.has(extname(entry.name).toLowerCase())) return [];
    return [absolute];
  });
}

function repositoryPath(file: string): string {
  return relative(root, file).replaceAll('\\', '/');
}

const allowedPolicyReferences = new Set([
  'AGENTS.md',
  'docs/MASTER_GOAL.md',
  'docs/PHASE1_ACCEPTANCE.md',
  // This immutable authority file must name the prohibited sources it forbids; implementation and public output remain scanned.
  'docs/PHASE3_PROOF_SYSTEM_GOAL.md',
  'docs/PHASE_R_STRATEGIC_REORIENTATION_GOAL.md',
  'docs/PUBLICATION_POLICY.md',
]);

describe('H1 source integrity', () => {
  it('keeps prohibited hosts and repository identifiers out of implementation source', () => {
    const prohibitedSources = [
      {
        label: 'former public website',
        value: ['www', ['quantum', 'hub'].join('-'), 'com'].join('.'),
      },
      { label: 'former repository A', value: ['AmirNatan1', ['Quantum', 'Site'].join('-')].join('/') },
      { label: 'former repository B', value: ['AmirNatan1', ['Final', 'Q', 'Hub'].join('-')].join('/') },
    ];
    const findings: string[] = [];

    for (const file of repositoryFiles()) {
      const path = repositoryPath(file);
      if (allowedPolicyReferences.has(path)) continue;
      const source = readFileSync(file, 'utf8').toLowerCase();
      for (const prohibited of prohibitedSources) {
        if (source.includes(prohibited.value.toLowerCase())) {
          findings.push(`${path}: ${prohibited.label}`);
        }
      }
    }

    expect(findings, `Prohibited source references found:\n${findings.join('\n')}`).toEqual([]);
  });

  it('does not publish prohibited historical claims or stock-media references', () => {
    const publicRoots = ['public', 'src/components', 'src/layouts', 'src/pages']
      .map((path) => resolve(root, path))
      .filter((path) => {
        try {
          readdirSync(path);
          return true;
        } catch {
          return false;
        }
      });
    const prohibitedClaims = [
      ['4', 'corporate partners'].join(' '),
      ['4', 'operating sectors'].join(' '),
      ['110', 'POCs'].join(' '),
      ['29', 'implementations'].join(' '),
    ];
    const stockHosts = [
      ['images', 'unsplash', 'com'].join('.'),
      ['pexels', 'com'].join('.'),
      ['pixabay', 'com'].join('.'),
    ];
    const findings: string[] = [];

    for (const publicRoot of publicRoots) {
      for (const file of repositoryFiles(publicRoot)) {
        const source = readFileSync(file, 'utf8').toLowerCase();
        for (const claim of prohibitedClaims) {
          if (source.includes(claim.toLowerCase())) findings.push(`${repositoryPath(file)}: prohibited claim “${claim}”`);
        }
        for (const host of stockHosts) {
          if (source.includes(host)) findings.push(`${repositoryPath(file)}: stock-media host “${host}”`);
        }
      }
    }

    expect(findings, `Unsafe public source found:\n${findings.join('\n')}`).toEqual([]);
  });
});
