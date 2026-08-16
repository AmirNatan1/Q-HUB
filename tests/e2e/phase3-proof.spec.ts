import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const proofIndexPath = '/proof';
const maradinPath = '/proof/maradin-dynamic-ground-projection';
const proofChapters = [
  'field-condition',
  'technology',
  'environment',
  'test',
  'evidence',
  'next-step',
] as const;
const requiredViewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
] as const;
const axeViewports = [requiredViewports[0], requiredViewports[3]] as const;
const deniedProofIds = [
  'development-proof-single',
  'development-proof-multi-phase',
  'development-proof-no-outcome',
  'development-proof-partial',
] as const;
const protectedOutputTokens = [
  ...deniedProofIds,
  'sourceReferenceInternal',
  'internal://',
  'Exact internal KPI tables',
  'proprietary measurement data',
  'remain non-public',
] as const;
const conciseEvidenceSentence =
  'The POC produced comparative field evidence across those real-world conditions.';
const maradinDomains = ['automotive', 'mobility', 'human-machine communication'] as const;
const maradinEnvironmentTags = [
  'vehicle-mounted',
  'road surfaces',
  'lighting conditions',
  'weather conditions',
] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary ?? ''}`)
          .join('\n')}`,
    )
    .join('\n\n');
}

async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));

  expect(overflow.body, `${context}: body must not overflow horizontally.`).toBeLessThanOrEqual(1);
  expect(overflow.root, `${context}: root must not overflow horizontally.`).toBeLessThanOrEqual(1);
}

async function expectOpaqueSiteHeader(page: Page, context: string): Promise<void> {
  const header = page.locator('[data-site-header]');
  await expect(header, `${context}: fixed site header is required.`).toBeVisible();
  const background = await header.evaluate((element) => {
    const backgroundColor = getComputedStyle(element).backgroundColor;
    const functionalColor = backgroundColor.match(/^rgba?\(([^)]+)\)$/i);
    const channels = functionalColor?.[1]
      ?.split(/[\s,/]+/)
      .filter(Boolean) ?? [];
    const alpha = channels.length >= 4 ? Number.parseFloat(channels[3]!) : 1;
    return { alpha, backgroundColor };
  });

  expect(
    background.alpha,
    `${context}: ${background.backgroundColor} allows scrolled content to contaminate the fixed header.`,
  ).toBe(1);
}

async function expectHorizontalGeometry(
  locator: Locator,
  viewportWidth: number,
  context: string,
): Promise<void> {
  await expect(locator, `${context}: expected visible content.`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${context}: expected rendered geometry.`).not.toBeNull();
  if (!box) return;

  expect(box.width, `${context}: content must not collapse.`).toBeGreaterThan(0);
  expect(box.height, `${context}: content must not collapse.`).toBeGreaterThan(0);
  expect(box.x, `${context}: content is clipped off the left edge.`).toBeGreaterThanOrEqual(-1);
  expect(
    box.x + box.width,
    `${context}: content is clipped off the right edge.`,
  ).toBeLessThanOrEqual(viewportWidth + 1);
}

async function hiddenSemanticText(locator: Locator): Promise<string[]> {
  return locator.locator('h1, h2, h3, h4, p, dt, dd, figcaption, a[href]').evaluateAll((nodes) =>
    nodes
      .filter((node) => (node.textContent ?? '').trim().length > 0)
      .filter((node) => !node.closest('video, [aria-hidden="true"]'))
      .filter((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) === 0 ||
          box.width === 0 ||
          box.height === 0
        );
      })
      .map((node) => (node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)),
  );
}

async function expectVisibleFocus(locator: Locator, context: string): Promise<void> {
  await locator.evaluate((element) => (element as HTMLElement).blur());
  const before = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      color: style.color,
      outline: style.outline,
      textDecoration: style.textDecoration,
    };
  });

  await locator.focus();
  await expect(locator, `${context}: focus must land on the expected control.`).toBeFocused();
  const focused = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const outlineWidth = Number.parseFloat(style.outlineWidth);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      color: style.color,
      outline: style.outline,
      strongIndicator:
        (style.outlineStyle !== 'none' && outlineWidth > 0) ||
        style.boxShadow !== 'none' ||
        style.textDecorationLine.includes('underline'),
      textDecoration: style.textDecoration,
    };
  });
  const changed = Object.entries(before).some(
    ([property, value]) => focused[property as keyof typeof focused] !== value,
  );

  expect(
    focused.strongIndicator || changed,
    `${context}: keyboard focus needs a visible treatment.`,
  ).toBe(true);
}

async function expectTouchTarget(locator: Locator, context: string): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, `${context}: target must have rendered geometry.`).not.toBeNull();
  if (!box) return;
  expect(box.width, `${context}: target width should honor 44px intent.`).toBeGreaterThanOrEqual(43);
  expect(box.height, `${context}: target height should honor 44px intent.`).toBeGreaterThanOrEqual(43);
}

async function expectProofMedia(
  container: Locator,
  viewportWidth: number,
  context: string,
): Promise<void> {
  const figures = container.locator('figure[data-proof-media-role]');
  const figureCount = await figures.count();
  expect(figureCount, `${context}: expected documentary media.`).toBeGreaterThan(0);

  for (let index = 0; index < figureCount; index += 1) {
    const figure = figures.nth(index);
    await expectHorizontalGeometry(figure, viewportWidth, `${context}: media figure ${index + 1}`);
    const media = figure.locator('img, video');
    expect(
      await media.count(),
      `${context}: media figure ${index + 1} must contain native image or video media.`,
    ).toBeGreaterThan(0);

    for (let mediaIndex = 0; mediaIndex < (await media.count()); mediaIndex += 1) {
      const item = media.nth(mediaIndex);
      await expect(item).toBeVisible();
      const mediaState = await item.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        if (element instanceof HTMLImageElement) {
          return {
            height: bounds.height,
            kind: 'image' as const,
            intrinsicHeight:
              element.naturalHeight || Number.parseInt(element.getAttribute('height') ?? '0', 10),
            intrinsicWidth:
              element.naturalWidth || Number.parseInt(element.getAttribute('width') ?? '0', 10),
            src: element.currentSrc || element.src,
            width: bounds.width,
          };
        }

        if (!(element instanceof HTMLVideoElement)) {
          throw new Error('Proof media must use a native image or video element.');
        }
        const source = element.currentSrc || element.src || element.querySelector('source')?.src || '';
        return {
          height: bounds.height,
          kind: 'video' as const,
          intrinsicHeight: Number.parseInt(element.getAttribute('height') ?? '0', 10),
          intrinsicWidth: Number.parseInt(element.getAttribute('width') ?? '0', 10),
          src: source,
          width: bounds.width,
        };
      });

      expect(mediaState.width, `${context}: media must have non-zero width.`).toBeGreaterThan(24);
      expect(mediaState.height, `${context}: media must have non-zero height.`).toBeGreaterThan(24);
      expect(mediaState.intrinsicWidth, `${context}: media needs intrinsic width.`).toBeGreaterThan(0);
      expect(mediaState.intrinsicHeight, `${context}: media needs intrinsic height.`).toBeGreaterThan(0);
      expect(mediaState.src, `${context}: media needs a source.`).not.toBe('');
    }
  }
}

async function expectHeadingContract(page: Page, context: string): Promise<void> {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('main h1'), `${context}: exactly one H1 is required.`).toHaveCount(1);
  const levels = await page.locator('main h1, main h2, main h3, main h4, main h5, main h6').evaluateAll(
    (headings) => headings.map((heading) => Number.parseInt(heading.tagName.slice(1), 10)),
  );
  expect(levels[0], `${context}: heading structure must begin with H1.`).toBe(1);
  for (let index = 1; index < levels.length; index += 1) {
    expect(
      levels[index]! - levels[index - 1]!,
      `${context}: heading hierarchy jumps from H${levels[index - 1]} to H${levels[index]}.`,
    ).toBeLessThanOrEqual(1);
  }
}

async function expectNoStickyOverlap(target: Locator, context: string): Promise<void> {
  const overlaps = await target.evaluate((targetElement) => {
    const heading = targetElement.matches('h1, h2, h3, h4, h5, h6')
      ? targetElement
      : targetElement.querySelector('h1, h2, h3, h4, h5, h6') ?? targetElement;
    const targetBox = heading.getBoundingClientRect();

    return Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .filter((element) => element !== heading && !targetElement.contains(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.position === 'fixed' || style.position === 'sticky';
      })
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number.parseFloat(style.opacity) === 0 ||
          box.width === 0 ||
          box.height === 0
        ) {
          return false;
        }
        const overlapWidth = Math.max(
          0,
          Math.min(box.right, targetBox.right) - Math.max(box.left, targetBox.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(box.bottom, targetBox.bottom) - Math.max(box.top, targetBox.top),
        );
        return overlapWidth * overlapHeight > 1;
      })
      .map((element) => {
        const classes = [...element.classList].slice(0, 3).join('.');
        return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${classes ? `.${classes}` : ''}`;
      });
  });

  expect(overlaps, `${context}: sticky/fixed UI overlaps the target heading.`).toEqual([]);
}

async function expectNaturalScrollExit(page: Page, context: string): Promise<void> {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.keyboard.press('End');
  await expect
    .poll(() =>
      page.evaluate(
        () => Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2,
      ),
    )
    .toBe(true);
  expect(await page.evaluate(() => document.activeElement === document.body), `${context}: no scroll trap.`).toBe(true);
}

for (const viewport of requiredViewports) {
  test(`${viewport.name} Evidence Index remains complete without hover or overflow`, async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(proofIndexPath);

    const index = page.locator('main[data-proof-index]');
    const record = index.locator('article[data-proof-row][data-inspection-state="active"]');
    const link = record.locator('a[data-proof-record-link]');

    await expect(index).toBeVisible();
    await expectOpaqueSiteHeader(page, `${viewport.name} /proof`);
    await expectHeadingContract(page, `${viewport.name} /proof`);
    await expect(index.locator('h1')).toContainText(/evidence from the field/i);
    await expect(record).toHaveCount(1);
    await expect(record).toBeVisible();
    await expect(record).toContainText('Dynamic Ground Projection');
    await expect(record).toContainText('Maradin');
    await expect(record).toContainText('Hyundai CRADLE TLV');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', new RegExp(`^${maradinPath}/?$`));
    await expectTouchTarget(link, `${viewport.name} record action`);
    expect(
      await hiddenSemanticText(record),
      `${viewport.name}: record meaning must not depend on hover.`,
    ).toEqual([]);

    await expect(
      index.locator(
        '[data-proof-filter], form[role="search"], input[type="search"], select, [role="combobox"], button[aria-label*="filter" i]',
      ),
      `${viewport.name}: one public record must not expose dead filter UI.`,
    ).toHaveCount(0);
    await expectProofMedia(index, viewport.width, `${viewport.name} /proof`);
    await expectHorizontalGeometry(index.locator('h1'), viewport.width, `${viewport.name} index H1`);
    await expectHorizontalGeometry(
      record.locator('h2, h3').first(),
      viewport.width,
      `${viewport.name} record title`,
    );
    await expectNoHorizontalOverflow(page, `${viewport.name} /proof`);

    if (viewport.width >= 1024) {
      const before = await record.innerText();
      await record.hover();
      await expect(record).toBeVisible();
      expect(await record.innerText(), `${viewport.name}: hover must not remove record content.`).toBe(before);
      expect(
        await hiddenSemanticText(record),
        `${viewport.name}: hovered record must retain all semantic text.`,
      ).toEqual([]);
    }

    await expectVisibleFocus(link, `${viewport.name} record action`);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${maradinPath}/?$`));
    await expect(page.locator('article[data-proof-record-page]')).toBeVisible();
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test(`${viewport.name} Maradin record preserves chapters, media, and natural scrolling`, async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(maradinPath);

    const record = page.locator('article[data-proof-record-page]');
    await expect(record).toBeVisible();
    await expectOpaqueSiteHeader(page, `${viewport.name} Maradin record`);
    await expectHeadingContract(page, `${viewport.name} Maradin record`);
    await expect(record.locator('h1')).toHaveText('Dynamic Ground Projection');

    const openingTags = record.locator('.record-opening__tags li');
    await expect(openingTags).toHaveCount(maradinDomains.length);
    expect(await openingTags.allTextContents()).toEqual([...maradinDomains]);

    const environmentTags = record.locator(
      'section[data-proof-section="environment"] .descriptor-list li',
    );
    await expect(environmentTags).toHaveCount(maradinEnvironmentTags.length);
    expect(await environmentTags.allTextContents()).toEqual([...maradinEnvironmentTags]);

    const evidenceChapter = record.locator('section[data-proof-section="evidence"]');
    await expect(
      evidenceChapter.getByText(conciseEvidenceSentence, { exact: true }),
    ).toHaveCount(1);
    await expect(evidenceChapter.locator('.evidence-register')).toHaveCount(0);

    for (const chapterName of proofChapters) {
      const chapter = record.locator(`section[data-proof-section="${chapterName}"]`);
      await expect(chapter, `${viewport.name}: ${chapterName} chapter is required.`).toHaveCount(1);
      await expect(chapter).toBeVisible();
      await expect(chapter).toContainText(/\S/);
      await expectHorizontalGeometry(
        chapter.locator('h2, h3').first(),
        viewport.width,
        `${viewport.name} ${chapterName} heading`,
      );
      expect(
        await hiddenSemanticText(chapter),
        `${viewport.name}: ${chapterName} may not depend on hover.`,
      ).toEqual([]);
    }

    await expect(record.locator('section[data-proof-section="decision"]')).toHaveCount(0);
    await expect(record.locator('section[data-proof-section="next-step"]')).toHaveCount(1);
    const unsupportedLabels = (await record.locator('dt').allTextContents()).filter((label) =>
      /^\s*(?:\d+\s*)?(?:decision|date|location)\s*$/i.test(label),
    );
    expect(
      unsupportedLabels,
      `${viewport.name}: unsupported decision/date/location labels must be absent.`,
    ).toEqual([]);
    const emptyPublicText = await record.locator('[data-proof-section] p, [data-proof-section] dt, [data-proof-section] dd').evaluateAll(
      (nodes) => nodes.filter((node) => !(node.textContent ?? '').trim()).map((node) => node.outerHTML),
    );
    expect(emptyPublicText, `${viewport.name}: optional fields must not create empty containers.`).toEqual([]);

    const publicText = await record.innerText();
    for (const token of protectedOutputTokens) {
      expect(publicText, `${viewport.name}: protected token ${token} leaked.`).not.toContain(token);
    }

    await expectProofMedia(record, viewport.width, `${viewport.name} Maradin record`);
    await expectNoHorizontalOverflow(page, `${viewport.name} Maradin record`);

    const sectionIndex = record.locator('nav[data-proof-section-index]');
    if ((await sectionIndex.count()) > 0) {
      await expect(sectionIndex).toBeVisible();
      const anchors = sectionIndex.locator('a[href^="#"]');
      expect(await anchors.count(), `${viewport.name}: section index must expose the chapters.`).toBeGreaterThanOrEqual(
        proofChapters.length,
      );

      for (const anchorIndex of [0, (await anchors.count()) - 1]) {
        const anchor = anchors.nth(anchorIndex);
        await expectVisibleFocus(anchor, `${viewport.name} section-index link ${anchorIndex + 1}`);
        const href = await anchor.getAttribute('href');
        expect(href, `${viewport.name}: section-index link needs a local target.`).toMatch(/^#[a-z0-9-]+$/);
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`${href!.replace('#', '#')}$`));
        const target = page.locator(href!);
        await expect(target).toBeVisible();
        await expectNoStickyOverlap(target, `${viewport.name} ${href}`);
      }
    }

    await expectNaturalScrollExit(page, `${viewport.name} Maradin record`);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
}

for (const viewport of axeViewports) {
  for (const route of [proofIndexPath, maradinPath]) {
    test(`${viewport.name} ${route} has zero critical or serious axe violations`, async ({ page }) => {
      const runtimeFailures = captureRuntimeFailures(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await expectHeadingContract(page, `${viewport.name} ${route}`);

      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious',
      );
      expect(blocking, `${viewport.name} ${route}\n${formatViolations(blocking)}`).toEqual([]);
      expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
    });
  }
}

test('Proof routes resolve as designed while denied fixtures stay out of routes, sitemap, and browser output', async ({
  page,
  request,
}) => {
  const runtimeFailures = captureRuntimeFailures(page);
  for (const route of [proofIndexPath, maradinPath]) {
    const response = await request.get(route);
    expect(response.status(), `${route} must resolve.`).toBe(200);
    const body = await response.text();
    for (const token of protectedOutputTokens) {
      expect(body, `${route}: protected token ${token} leaked into HTML/metadata.`).not.toContain(token);
    }
    await response.dispose();
  }

  for (const id of deniedProofIds) {
    const response = await request.get(`/proof/${id}`, { maxRedirects: 0 });
    expect(response.status(), `Denied Proof fixture ${id} must not generate a route.`).toBe(404);
    await response.dispose();
  }

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  expect(sitemapResponse.headers()['content-type'] ?? '').toMatch(/(?:application|text)\/xml/i);
  const sitemap = await sitemapResponse.text();
  await sitemapResponse.dispose();
  const proofLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]!).pathname)
    .filter((pathname) => pathname === '/proof/' || pathname.startsWith('/proof/'));
  expect([...new Set(proofLocations)].sort()).toEqual(['/proof/', `${maradinPath}/`].sort());
  for (const token of protectedOutputTokens) {
    expect(sitemap, `Sitemap contains protected token ${token}.`).not.toContain(token);
  }

  for (const route of [proofIndexPath, maradinPath]) {
    await page.goto(route);
    const browserFacingSources = await page.locator('script[src]').evaluateAll((scripts) =>
      scripts.map((script) => (script as HTMLScriptElement).src),
    );
    for (const source of browserFacingSources) {
      const response = await request.get(source);
      expect(response.ok(), `${route}: browser script ${source} must resolve.`).toBe(true);
      const script = await response.text();
      for (const token of protectedOutputTokens) {
        expect(script, `${route}: protected token ${token} leaked into client JavaScript.`).not.toContain(token);
      }
      await response.dispose();
    }
  }

  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

for (const route of [proofIndexPath, maradinPath]) {
  test(`${route} resolves all meaning under reduced motion`, async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);

    await expect
      .poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
      .toBe(true);
    await expect(page.locator('main')).toBeVisible();
    expect(await hiddenSemanticText(page.locator('main')), `${route}: reduced motion keeps meaning visible.`).toEqual([]);
    const videos = page.locator('main [data-proof-media-role] video');
    for (let index = 0; index < (await videos.count()); index += 1) {
      const video = videos.nth(index);
      await expect(video).toBeVisible();
      const state = await video.evaluate((element) => {
        const media = element as HTMLVideoElement;
        return {
          autoplay: media.autoplay,
          paused: media.paused,
        };
      });
      expect(state.autoplay, `${route}: reduced-motion video must not autoplay.`).toBe(false);
      expect(state.paused, `${route}: reduced-motion video must remain resolved on its poster.`).toBe(true);
    }

    await page.waitForTimeout(120);
    const longRunningMotion = await page.locator('main').evaluate((main) =>
      main
        .getAnimations({ subtree: true })
        .filter((animation) => {
          const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
          return animation.playState === 'running' && duration > 100;
        })
        .map((animation) => `${animation.constructor.name}:${String(animation.effect?.getComputedTiming().duration)}`),
    );
    expect(longRunningMotion, `${route}: reduced motion must not leave long animations running.`).toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
}

test('Proof remains readable and keyboard-visible in forced colors', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(proofIndexPath);
  const recordLink = page.locator('a[data-proof-record-link]');
  await expect(recordLink).toBeVisible();
  await expectVisibleFocus(recordLink, 'forced-colors Proof record action');

  await page.goto(maradinPath);
  const sectionLink = page.locator('nav[data-proof-section-index] a[href^="#"]').first();
  if ((await sectionLink.count()) > 0) {
    await expect(sectionLink).toBeVisible();
    await expectVisibleFocus(sectionLink, 'forced-colors section-index action');
  }
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

test('homepage preserves its six-state journey and adds only the deliberate PROVE handoff', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  if (await page.locator('[data-experience-phase="presence"]').count()) {
    const handoff = page.locator('a[data-proof-handoff]');
    await expect(handoff).toHaveCount(1);
    await handoff.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(handoff).toHaveAttribute('href', new RegExp(`^${proofIndexPath}/?$`));
    await expect(handoff).toBeVisible();
    await expect(handoff).toContainText(/proof/i);
    await expectVisibleFocus(handoff, 'homepage Proof handoff');
    await expectNoHorizontalOverflow(page, 'homepage with Proof handoff');
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
    return;
  }

  const phases = await page.locator('main section[data-experience-phase]').evaluateAll((sections) =>
    sections.map((section) => section.getAttribute('data-experience-phase')),
  );
  expect(phases).toEqual(['signal', 'aperture', 'need', 'find', 'test', 'prove']);
  await expect(page.locator('main h1')).toHaveCount(1);

  const prove = page.locator('section[data-experience-phase="prove"]');
  await prove.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const handoff = prove.locator('a[data-proof-handoff]');
  await expect(handoff).toHaveCount(1);
  await expect(handoff).toHaveAttribute('href', new RegExp(`^${maradinPath}/?$`));
  await expect(handoff).toBeVisible();
  await expect(handoff).toContainText(/open field record/i);
  await expectVisibleFocus(handoff, 'homepage PROVE handoff');
  await expectNoHorizontalOverflow(page, 'homepage with Proof handoff');
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});
