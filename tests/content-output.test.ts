import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { maradinProofRecord } from '../src/content/proof';

const root = resolve(process.cwd());
const presentationRoots = ['public', 'src/components', 'src/layouts', 'src/pages'];
const sourceExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.mjs', '.svg', '.ts', '.tsx', '.xml']);

function filesWithin(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesWithin(absolute);
    if (!entry.isFile() || !sourceExtensions.has(extname(entry.name).toLowerCase())) return [];
    return [absolute];
  });
}

function repositoryPath(file: string): string {
  return relative(root, file).replaceAll('\\', '/');
}

describe('public-output boundary', () => {
  it('keeps the approved Maradin serialization free of private provenance', () => {
    const serialized = JSON.stringify(maradinProofRecord);
    const privateKeys = [
      ['source', 'Reference', 'Internal'].join(''),
      ['drive', 'Id'].join(''),
      'approval',
      'publicationRules',
    ];

    expect(serialized).toContain('Dynamic Ground Projection');
    expect(serialized).toContain('Hyundai CRADLE TLV');
    privateKeys.forEach((key) => expect(serialized).not.toContain(key));
  });

  it('keeps internal source metadata out of presentation code and generated artifacts', () => {
    const internalKey = ['source', 'Reference', 'Internal'].join('');
    const internalScheme = ['internal', '://'].join('');
    const presentationFiles = presentationRoots.flatMap((directory) => filesWithin(resolve(root, directory)));
    const generatedFiles = filesWithin(resolve(root, 'dist'));
    const browserFacingGeneratedFiles = generatedFiles.filter((file) => {
      const path = repositoryPath(file);
      return !path.startsWith('dist/.prerender/') && extname(file).toLowerCase() !== '.mjs';
    });
    const findings: string[] = [];

    for (const file of [...presentationFiles, ...browserFacingGeneratedFiles]) {
      const source = readFileSync(file, 'utf8');
      if (source.includes(internalKey)) findings.push(`${repositoryPath(file)}: internal source key`);
      if (source.includes(internalScheme)) findings.push(`${repositoryPath(file)}: internal source value`);
    }

    for (const file of generatedFiles) {
      const source = readFileSync(file, 'utf8');
      if (source.includes(internalScheme)) findings.push(`${repositoryPath(file)}: internal source value`);
    }

    expect(findings, `Internal provenance leaked toward public output:\n${findings.join('\n')}`).toEqual([]);
  });

  it('does not connect development content records directly to public routes', () => {
    const developmentModule = ['content', 'development'].join('/');
    const findings = presentationRoots
      .flatMap((directory) => filesWithin(resolve(root, directory)))
      .filter((file) => readFileSync(file, 'utf8').replaceAll('\\', '/').includes(developmentModule))
      .map(repositoryPath);

    expect(findings, `Development records imported by public presentation modules:\n${findings.join('\n')}`).toEqual([]);
  });

  it('requires visible temporary copy in Astro templates to carry a machine-readable marker', () => {
    const placeholderLanguage = /development|approved[^\n<]{0,80}pending|pending[^\n<]{0,80}approved|phase\s*1\s+route\s+shell/i;
    const findings = presentationRoots
      .flatMap((directory) => filesWithin(resolve(root, directory)))
      .filter((file) => extname(file).toLowerCase() === '.astro')
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return placeholderLanguage.test(source) && !/data-development-(?:placeholder|media)/.test(source);
      })
      .map(repositoryPath);

    expect(findings, `Temporary presentation copy lacks a data-development-* marker:\n${findings.join('\n')}`).toEqual([]);
  });
});
