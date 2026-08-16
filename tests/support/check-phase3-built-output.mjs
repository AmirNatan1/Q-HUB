import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const proofIndex = resolve(dist, 'proof', 'index.html');
const maradinRecord = resolve(dist, 'proof', 'maradin-dynamic-ground-projection', 'index.html');
const sitemapFile = resolve(dist, 'sitemap.xml');
const deniedProofIds = [
  'development-proof-single',
  'development-proof-multi-phase',
  'development-proof-no-outcome',
  'development-proof-partial',
];
const protectedOutputTokens = [
  ...deniedProofIds,
  'sourceReferenceInternal',
  'internal://',
];
const browserTextExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.mjs', '.xml']);

function filesWithin(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesWithin(absolute);
    if (!entry.isFile()) return [];
    return [absolute];
  });
}

function repositoryPath(file) {
  return relative(root, file).replaceAll('\\', '/');
}

function requireFile(file, label) {
  if (!existsSync(file)) throw new Error(`${label} is missing: ${repositoryPath(file)}`);
}

function sitemapPaths(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
}

if (!existsSync(dist)) {
  throw new Error('dist is missing. Run `npm run build` before the Phase 3 built-output check.');
}

requireFile(proofIndex, 'Evidence Index output');
requireFile(maradinRecord, 'Maradin field-record output');
requireFile(sitemapFile, 'Sitemap output');

const proofRouteFiles = filesWithin(resolve(dist, 'proof'))
  .filter((file) => file.endsWith('index.html'))
  .map((file) => repositoryPath(file))
  .sort();
const expectedProofRouteFiles = [
  'dist/proof/index.html',
  'dist/proof/maradin-dynamic-ground-projection/index.html',
].sort();

if (JSON.stringify(proofRouteFiles) !== JSON.stringify(expectedProofRouteFiles)) {
  throw new Error(
    `Unexpected generated Proof route inventory:\n${proofRouteFiles.map((file) => `- ${file}`).join('\n')}`,
  );
}

const proofIndexHtml = readFileSync(proofIndex, 'utf8');
const maradinHtml = readFileSync(maradinRecord, 'utf8');
if (!proofIndexHtml.includes('Dynamic Ground Projection')) {
  throw new Error('The built Evidence Index does not contain the approved Maradin record.');
}
if (!proofIndexHtml.includes('/proof/maradin-dynamic-ground-projection')) {
  throw new Error('The built Evidence Index does not link to the approved Maradin route.');
}
if (!maradinHtml.includes('Dynamic Ground Projection')) {
  throw new Error('The built Maradin field record is missing its approved title.');
}

const mediaPaths = [...new Set(
  [proofIndexHtml, maradinHtml].flatMap((html) =>
    [...html.matchAll(/(?:src|poster)="(\/media\/[^"?#]+)(?:[?#][^"]*)?"/g)].map(
      (match) => match[1],
    ),
  ),
)];
if (mediaPaths.length === 0) {
  throw new Error('The built Proof routes do not reference documentary media.');
}
for (const mediaPath of mediaPaths) {
  const mediaFile = resolve(dist, `.${mediaPath}`);
  requireFile(mediaFile, `Proof media ${mediaPath}`);
  if (statSync(mediaFile).size <= 0) throw new Error(`Proof media is empty: ${mediaPath}`);
}

const sitemap = readFileSync(sitemapFile, 'utf8');
const generatedProofPaths = [...new Set(sitemapPaths(sitemap))]
  .filter((pathname) => pathname === '/proof/' || pathname.startsWith('/proof/'))
  .sort();
const expectedProofPaths = ['/proof/', '/proof/maradin-dynamic-ground-projection/'].sort();
if (JSON.stringify(generatedProofPaths) !== JSON.stringify(expectedProofPaths)) {
  throw new Error(`Unexpected Proof sitemap entries:\n${generatedProofPaths.join('\n')}`);
}

const browserFacingFiles = filesWithin(dist).filter((file) =>
  browserTextExtensions.has(extname(file).toLowerCase()),
);
const findings = [];
for (const file of browserFacingFiles) {
  const source = readFileSync(file, 'utf8');
  for (const token of protectedOutputTokens) {
    if (source.includes(token)) findings.push(`${repositoryPath(file)}: ${token}`);
  }
}

if (findings.length > 0) {
  throw new Error(`Protected or denied Proof data leaked into built browser output:\n${findings.join('\n')}`);
}

console.log(
  `Phase 3 built-output gate passed: ${proofRouteFiles.length} Proof HTML routes, ${mediaPaths.length} media assets, ${browserFacingFiles.length} browser-facing text artifacts scanned.`,
);
