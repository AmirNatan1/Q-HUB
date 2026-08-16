import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
const homepageFile = resolve(dist, 'index.html');
const internalProvenanceFile = resolve(
  root,
  '.codex-input',
  'phase-r',
  'ASSET_PROVENANCE_INTERNAL.md',
);
const textAssetExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.txt',
  '.xml',
]);
const expectedActs = Object.freeze([
  {
    id: 'presence',
    anchors: ['Quantum Hub', 'Where industry meets technology.'],
  },
  { id: 'access', anchors: ['Access to the field.'] },
  {
    id: 'startup',
    anchors: ['Your technology.', 'Real industrial context.'],
  },
  { id: 'method', anchors: ['Find.', 'Test.', 'Prove.'] },
  { id: 'activity', anchors: ['Quantum in motion.'] },
  {
    id: 'evidence',
    anchors: ['Real field.', 'Documented evidence.'],
  },
  {
    id: 'action',
    anchors: ['Take your technology', 'into the field.'],
  },
]);
const expectedPartners = Object.freeze([
  {
    id: 'taavura-livnat-group',
    name: 'Taavura–Livnat Group',
    relationship: 'founding-partner',
  },
  { id: 'talcar', name: 'Talcar', relationship: 'founding-partner' },
  { id: 'vdl-group', name: 'VDL Group', relationship: 'strategic-partner' },
  {
    id: 'hyundai-motor-group',
    name: 'Hyundai Motor Group',
    relationship: 'strategic-partner',
  },
  { id: 'bazan-group', name: 'Bazan Group', relationship: 'strategic-partner' },
]);
const deniedProjectPhrases = Object.freeze([
  'Maradin',
  'Dynamic Ground Projection',
  'Hyundai CRADLE TLV',
  'MEMS-based',
  '60 real-world scenarios',
  '15-person',
  '0–5',
  'EcoMotion 2023',
  'OI Lounge',
  'front-grille integration',
]);
const protectedOutputPatterns = Object.freeze([
  { label: 'internal source key', pattern: /sourceReferenceInternal/iu },
  { label: 'internal source URI', pattern: /internal\s*:\/\//iu },
  {
    label: 'internal provenance wording',
    pattern: /(?:asset|internal)\s+provenance/iu,
  },
  {
    label: 'Google Drive source',
    pattern: /(?:drive|docs)\.google\.com/iu,
  },
  {
    label: 'Drive identifier label',
    pattern: /\bdrive\s+(?:file\s+)?id\b/iu,
  },
  {
    label: 'raw Phase R input path',
    pattern:
      /\.codex-input|QH_STRATEGIC_REORIENTATION_APPROVED_SOURCE_PACK|partner-assets[\\/]|partners-composite-reference|ASSET_PROVENANCE_INTERNAL|SOURCE_TRUTH\.md|PUBLICATION_APPROVAL\.md/iu,
  },
  {
    label: 'development placeholder',
    pattern:
      /data-development-(?:placeholder|media)|development-(?:proof|placeholder|media)|development proof record|approved content pending|field evidence pending approved media|later-phase route shell|__PLACEHOLDER__|lorem ipsum/iu,
  },
]);

function repositoryPath(file) {
  return relative(root, file).replaceAll('\\', '/');
}

function attribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'iu'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function hasAttribute(attributes, name) {
  return new RegExp(`(?:^|\\s)${name}(?=\\s|=|$)`, 'iu').test(attributes);
}

function decodeHtmlEntities(value) {
  const namedEntities = new Map([
    ['amp', '&'],
    ['apos', "'"],
    ['gt', '>'],
    ['lt', '<'],
    ['mdash', '—'],
    ['nbsp', ' '],
    ['ndash', '–'],
    ['quot', '"'],
  ]);

  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/giu, (entity, key) => {
    if (key.startsWith('#x') || key.startsWith('#X')) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (key.startsWith('#')) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return namedEntities.get(key.toLowerCase()) ?? entity;
  });
}

function decodeJavaScriptEscapes(value) {
  return value
    .replace(/\\u\{([0-9a-f]+)\}/giu, (sequence, codePoint) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : sequence;
    })
    .replace(/\\u([0-9a-f]{4})/giu, (sequence, codePoint) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : sequence;
    })
    .replace(/\\x([0-9a-f]{2})/giu, (sequence, codePoint) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : sequence;
    });
}

function normalizeSearchText(value) {
  return decodeJavaScriptEscapes(decodeHtmlEntities(value))
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/gu, '-')
    .replace(/\s+/gu, ' ')
    .toLowerCase();
}

function visibleText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<!--[^]*?-->/gu, ' ')
      .replace(/<(?:script|style|template|noscript)\b[^>]*>[^]*?<\/(?:script|style|template|noscript)>/giu, ' ')
      .replace(/<[^>]+>/gu, ' '),
  ).replace(/\s+/gu, ' ').trim();
}

function requireFile(file, label) {
  if (!existsSync(file)) {
    throw new Error(`${label} is missing: ${repositoryPath(file)}`);
  }
  if (!statSync(file).isFile() || statSync(file).size <= 0) {
    throw new Error(`${label} is empty or not a file: ${repositoryPath(file)}`);
  }
}

function localAsset(reference, fromFile) {
  const decoded = decodeHtmlEntities(reference).trim();
  if (!decoded || /^(?:#|data:|mailto:|tel:|javascript:)/iu.test(decoded)) {
    return { kind: 'ignored' };
  }
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(decoded)) {
    return { kind: 'external', reference: decoded };
  }

  const cleanReference = decoded.split(/[?#]/u, 1)[0];
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(cleanReference);
  } catch {
    decodedPath = cleanReference;
  }
  if (decodedPath.startsWith('#')) return { kind: 'ignored' };
  const file = decodedPath.startsWith('/')
    ? resolve(dist, `.${decodedPath}`)
    : resolve(dirname(fromFile), decodedPath);
  const withinDist = file === dist || file.startsWith(`${dist}${sep}`);
  if (!withinDist) return { kind: 'outside', reference: decoded };
  return { kind: 'local', file, reference: decoded };
}

function pushAttributeReference(references, attributes, name) {
  const value = attribute(attributes, name);
  if (value) references.push(value);
}

function assetReferences(source, extension) {
  const references = [];

  if (extension === '.html') {
    const resourceTagPattern = /<(script|img|source|video|audio|track|iframe|embed|object|input)\b([^>]*)>/giu;
    for (const match of source.matchAll(resourceTagPattern)) {
      const tag = match[1].toLowerCase();
      const attributes = match[2];
      pushAttributeReference(references, attributes, tag === 'object' ? 'data' : 'src');
      if (tag === 'video') pushAttributeReference(references, attributes, 'poster');
      if (tag === 'img' || tag === 'source') {
        const srcset = attribute(attributes, 'srcset');
        if (srcset) {
          references.push(
            ...srcset
              .split(',')
              .map((candidate) => candidate.trim().split(/\s+/u, 1)[0])
              .filter(Boolean),
          );
        }
      }
    }

    for (const match of source.matchAll(/<link\b([^>]*)>/giu)) {
      const attributes = match[1];
      const rel = (attribute(attributes, 'rel') ?? '').toLowerCase().split(/\s+/u);
      if (rel.some((value) => ['stylesheet', 'modulepreload', 'preload', 'icon', 'manifest'].includes(value))) {
        pushAttributeReference(references, attributes, 'href');
      }
    }

    for (const match of source.matchAll(/<meta\b([^>]*)>/giu)) {
      const attributes = match[1];
      const key = attribute(attributes, 'property') ?? attribute(attributes, 'name') ?? '';
      if (/^(?:og:image|twitter:image)$/iu.test(key)) {
        pushAttributeReference(references, attributes, 'content');
      }
    }
  }

  if (['.html', '.js', '.mjs'].includes(extension)) {
    const importPatterns = [
      /(?:import|export)\s*(?:[^"'`()]*?\bfrom\s*)?["'`]([^"'`]+)["'`]/gu,
      /import\(\s*["'`]([^"'`]+)["'`]\s*\)/gu,
      /new\s+URL\(\s*["'`]([^"'`]+)["'`]\s*,\s*import\.meta\.url\s*\)/gu,
    ];
    for (const pattern of importPatterns) {
      for (const match of source.matchAll(pattern)) references.push(match[1]);
    }
  }

  if (['.css', '.html', '.svg'].includes(extension)) {
    for (const match of source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/giu)) {
      references.push(match[1]);
    }
    for (const match of source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']/giu)) {
      references.push(match[1]);
    }
  }

  if (extension === '.svg') {
    for (const match of source.matchAll(/<(?:image|use)\b([^>]*)>/giu)) {
      pushAttributeReference(references, match[1], 'href');
      pushAttributeReference(references, match[1], 'xlink:href');
    }
  }

  return references;
}

function linkedHomepageFiles() {
  const visited = new Set();
  const queue = [homepageFile];
  const findings = [];

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file)) continue;
    requireFile(file, 'Homepage-linked public asset');
    visited.add(file);

    const extension = extname(file).toLowerCase();
    if (!textAssetExtensions.has(extension)) continue;
    const source = readFileSync(file, 'utf8');
    for (const reference of assetReferences(source, extension)) {
      const resolvedReference = localAsset(reference, file);
      if (resolvedReference.kind === 'external') {
        findings.push(`${repositoryPath(file)}: external public asset ${resolvedReference.reference}`);
      } else if (resolvedReference.kind === 'outside') {
        findings.push(`${repositoryPath(file)}: public asset escapes dist (${resolvedReference.reference})`);
      } else if (resolvedReference.kind === 'local') {
        queue.push(resolvedReference.file);
      }
    }
  }

  if (findings.length > 0) {
    throw new Error(`Unsafe homepage asset references found:\n${findings.join('\n')}`);
  }
  return [...visited].sort((left, right) => left.localeCompare(right));
}

function internalDriveIdentifiers() {
  if (!existsSync(internalProvenanceFile)) return [];
  const source = readFileSync(internalProvenanceFile, 'utf8');
  const identifiers = new Set();
  for (const match of source.matchAll(/\|\s*[^|\r\n]+\|\s*[^|\r\n]+\|\s*([a-z\d_-]{20,})\s*\|/giu)) {
    identifiers.add(match[1]);
  }
  for (const match of source.matchAll(/\bDrive\s+id:\s*([a-z\d_-]{20,})/giu)) {
    identifiers.add(match[1]);
  }
  return [...identifiers];
}

function scanProtectedOutput(files) {
  const findings = [];
  const driveIdentifiers = internalDriveIdentifiers();
  const normalizedDeniedPhrases = deniedProjectPhrases.map((phrase) => ({
    label: phrase,
    normalized: normalizeSearchText(phrase),
  }));

  for (const file of files) {
    const path = repositoryPath(file);
    const normalizedPath = normalizeSearchText(path);
    const extension = extname(file).toLowerCase();
    const source = textAssetExtensions.has(extension) ? readFileSync(file, 'utf8') : '';
    const normalizedSource = normalizeSearchText(source);

    for (const denied of normalizedDeniedPhrases) {
      const sourceContainsPhrase = denied.normalized === '0-5'
        ? !['.css', '.svg'].includes(extension)
          && /(?:^|[^\d])0\s*-\s*5(?:[^\d]|$)/u.test(normalizedSource)
        : normalizedSource.includes(denied.normalized);
      if (normalizedPath.includes(denied.normalized) || sourceContainsPhrase) {
        findings.push(`${path}: denied homepage project phrase “${denied.label}”`);
      }
    }
    for (const protectedPattern of protectedOutputPatterns) {
      if (protectedPattern.pattern.test(path) || protectedPattern.pattern.test(source)) {
        findings.push(`${path}: ${protectedPattern.label}`);
      }
    }
    if (driveIdentifiers.some((identifier) => source.includes(identifier))) {
      findings.push(`${path}: internal Drive identifier`);
    }
  }

  if (findings.length > 0) {
    throw new Error(`Protected data leaked into homepage output:\n${[...new Set(findings)].join('\n')}`);
  }
}

function phaseSections(html) {
  const openings = [...html.matchAll(/<section\b([^>]*)>/giu)]
    .map((match) => ({
      attributes: match[1],
      index: match.index,
      id: attribute(match[1], 'id'),
      phase: attribute(match[1], 'data-experience-phase'),
    }))
    .filter((section) => section.phase !== null);

  return openings.map((opening, index) => ({
    ...opening,
    html: html.slice(opening.index, openings[index + 1]?.index ?? html.length),
  }));
}

function assertSevenActs(html) {
  const sections = phaseSections(html);
  const actualPhases = sections.map((section) => section.phase);
  const expectedPhases = expectedActs.map((act) => act.id);
  if (JSON.stringify(actualPhases) !== JSON.stringify(expectedPhases)) {
    throw new Error(
      `Homepage act sequence must be exactly ${expectedPhases.join(' -> ')}; found ${actualPhases.join(' -> ')}.`,
    );
  }

  for (const [index, expected] of expectedActs.entries()) {
    const section = sections[index];
    if (!section || section.id !== expected.id) {
      throw new Error(`Phase R act ${expected.id} must use the matching #${expected.id} anchor.`);
    }
    const sectionText = normalizeSearchText(visibleText(section.html));
    for (const anchor of expected.anchors) {
      if (!sectionText.includes(normalizeSearchText(anchor))) {
        throw new Error(`Phase R act ${expected.id} is missing public anchor “${anchor}”.`);
      }
    }
  }

  return sections;
}

function anchorElements(html) {
  return [...html.matchAll(/<a\b([^>]*)>([^]*?)<\/a>/giu)].map((match) => ({
    attributes: match[1],
    href: attribute(match[1], 'href'),
    text: visibleText(match[2]),
  }));
}

function assertAction(anchors, dataAttribute, expectedHref, expectedLabel) {
  const candidates = anchors.filter(
    (anchor) => hasAttribute(anchor.attributes, dataAttribute),
  );
  if (candidates.length !== 1) {
    throw new Error(`Homepage must contain exactly one ${dataAttribute} action; found ${candidates.length}.`);
  }
  const [action] = candidates;
  if (action.href !== expectedHref) {
    throw new Error(`${dataAttribute} must target ${expectedHref}; found ${action.href ?? 'no href'}.`);
  }
  if (expectedLabel && !normalizeSearchText(action.text).includes(normalizeSearchText(expectedLabel))) {
    throw new Error(`${dataAttribute} must expose the label “${expectedLabel}”.`);
  }
  return action;
}

function assertCtaPlacement(sections, phase, dataAttribute) {
  const section = sections.find((candidate) => candidate.phase === phase);
  const count = section
    ? anchorElements(section.html).filter((anchor) => hasAttribute(anchor.attributes, dataAttribute)).length
    : 0;
  if (count !== 1) {
    throw new Error(`${dataAttribute} must appear exactly once in the ${phase} act; found ${count}.`);
  }
}

function assertCtaDestinations(html, sections) {
  const anchors = anchorElements(html);
  assertAction(anchors, 'data-proof-handoff', '/proof/', 'Explore Proof');
  assertAction(
    anchors,
    'data-work-with-quantum',
    'mailto:info@quantum-hub.com',
    'Work with Quantum',
  );
  assertCtaPlacement(sections, 'evidence', 'data-proof-handoff');
  assertCtaPlacement(sections, 'action', 'data-work-with-quantum');

  const startupActions = anchors.filter(
    (anchor) => hasAttribute(anchor.attributes, 'data-startup-action'),
  );
  if (startupActions.length > 1) {
    throw new Error(`Homepage may contain at most one startup action; found ${startupActions.length}.`);
  }
  if (startupActions[0]?.href !== undefined && startupActions[0].href !== 'mailto:info@quantum-hub.com') {
    throw new Error(
      `The Phase R startup action must use the approved public contact destination; found ${startupActions[0].href ?? 'no href'}.`,
    );
  }
  if (startupActions.length === 1) {
    assertCtaPlacement(sections, 'startup', 'data-startup-action');
  }

  const unapprovedMailto = anchors
    .map((anchor) => anchor.href)
    .filter((href) => href?.startsWith('mailto:') && href !== 'mailto:info@quantum-hub.com');
  if (unapprovedMailto.length > 0) {
    throw new Error('Homepage contains a mail action outside the approved public Quantum address.');
  }
  if (/\/proof\/maradin-dynamic-ground-projection\/?/iu.test(html)) {
    throw new Error('Homepage must hand off to /proof/, not directly to the Maradin record.');
  }
}

function assertPartnerTaxonomy(accessHtml) {
  const openings = [...accessHtml.matchAll(/<[^/!][^>]*\bdata-partner-id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*>/giu)]
    .map((match) => ({
      attributes: match[0],
      index: match.index,
      id: attribute(match[0], 'data-partner-id'),
      relationship: attribute(match[0], 'data-partner-relationship'),
    }));
  if (openings.length !== expectedPartners.length) {
    throw new Error(`Homepage Partner Field must contain exactly five organizations; found ${openings.length}.`);
  }

  const actualIds = openings.map((partner) => partner.id).sort();
  const expectedIds = expectedPartners.map((partner) => partner.id).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`Unexpected Partner Field organization inventory: ${actualIds.join(', ')}.`);
  }

  for (const expected of expectedPartners) {
    const index = openings.findIndex((partner) => partner.id === expected.id);
    const partner = openings[index];
    if (!partner || partner.relationship !== expected.relationship) {
      throw new Error(
        `${expected.name} must be ${expected.relationship}; found ${partner?.relationship ?? 'missing'}.`,
      );
    }
    const nextIndex = openings[index + 1]?.index ?? accessHtml.length;
    const partnerHtml = accessHtml.slice(partner.index, nextIndex);
    if (!visibleText(partnerHtml).includes(expected.name)) {
      throw new Error(`Partner Field is missing the exact approved name ${expected.name}.`);
    }
    const imageMatch = partnerHtml.match(/<img\b([^>]*)>/iu);
    const source = imageMatch ? attribute(imageMatch[1], 'src') : null;
    if (!source?.startsWith('/media/partners/')) {
      throw new Error(`${expected.name} must use a local /media/partners/ identity asset.`);
    }
    const asset = localAsset(source, homepageFile);
    if (asset.kind !== 'local') {
      throw new Error(`${expected.name} identity asset is not a local public file.`);
    }
    requireFile(asset.file, `${expected.name} identity asset`);
  }

  const text = visibleText(accessHtml);
  if (!text.includes('Founding Partners') || !text.includes('Strategic Partners')) {
    throw new Error('Partner Field must expose both exact relationship group labels semantically.');
  }
  if (/partners-composite-reference/iu.test(accessHtml)) {
    throw new Error('The reference partner composite must not ship as the public Partner Field.');
  }
}

if (!existsSync(dist)) {
  throw new Error('dist is missing. Run `npm run build` before the Phase R built-output check.');
}
requireFile(homepageFile, 'Homepage output');

const homepageHtml = readFileSync(homepageFile, 'utf8');
const sections = assertSevenActs(homepageHtml);
assertCtaDestinations(homepageHtml, sections);
const accessSection = sections.find((section) => section.phase === 'access');
if (!accessSection) throw new Error('Phase R ACCESS act is missing.');
assertPartnerTaxonomy(accessSection.html);

const linkedFiles = linkedHomepageFiles();
scanProtectedOutput(linkedFiles);

console.log(
  `Phase R homepage built-output gate passed: ${sections.length} acts, ${expectedPartners.length} approved partners, ${linkedFiles.length} homepage-linked public files scanned; Proof routes were intentionally not traversed.`,
);
