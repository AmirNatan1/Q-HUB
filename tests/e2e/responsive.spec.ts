import { expect, test, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;
const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

for (const viewport of viewports) {
  test(`${viewport.width}x${viewport.height} preserves content, controls, and scroll integrity`, async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.body, 'Body must not overflow horizontally.').toBeLessThanOrEqual(1);
    expect(overflow.root, 'Document must not overflow horizontally.').toBeLessThanOrEqual(1);

    const nav = page.locator('nav[aria-label="Primary"]');
    if (!(await nav.isVisible())) {
      const disclosure = page.locator('summary[aria-label*="navigation" i]').first();
      await expect(disclosure).toBeVisible();
      await disclosure.click();
    }
    await expect(nav).toBeVisible();
    const openNavigationOverflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(openNavigationOverflow.body, 'Open navigation must not make the body overflow.').toBeLessThanOrEqual(1);
    expect(openNavigationOverflow.root, 'Open navigation must not make the document overflow.').toBeLessThanOrEqual(1);
    const navBox = await nav.boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) {
      expect(navBox.x).toBeGreaterThanOrEqual(-1);
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }

    for (const phase of phases) {
      const section = page.locator(`section[data-experience-phase="${phase}"]`);
      await section.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.getAttribute('data-active-phase') ??
              document.body.getAttribute('data-active-phase'),
          ),
        )
        .toBe(phase);
      const heading = section.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible();
      const headingBox = await heading.boundingBox();
      expect(headingBox, `${phase} heading must have a rendered box.`).not.toBeNull();
      if (headingBox) {
        expect(headingBox.width, `${phase} heading must not collapse.`).toBeGreaterThan(0);
        expect(headingBox.x, `${phase} heading is clipped off the left edge.`).toBeGreaterThanOrEqual(-1);
        expect(
          headingBox.x + headingBox.width,
          `${phase} heading is clipped off the right edge.`,
        ).toBeLessThanOrEqual(viewport.width + 1);
      }

      const phaseOverflow = await page.evaluate(() => Math.max(
        document.body.scrollWidth - document.body.clientWidth,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ));
      expect(phaseOverflow, `${phase} must not introduce horizontal overflow.`).toBeLessThanOrEqual(1);
    }

    const brokenCanvases = await page.locator('canvas').evaluateAll((canvases, viewportWidth) =>
      canvases
        .filter((canvas) => {
          const style = getComputedStyle(canvas);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = canvas.getBoundingClientRect();
          return rect.width <= 0 || rect.height <= 0 || rect.width > Number(viewportWidth) + 1;
        })
        .map((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        }), viewport.width);
    expect(brokenCanvases, `Broken visible canvas sizes: ${brokenCanvases.join(', ')}`).toEqual([]);

    const overlappingNavControls = await nav.locator('a, button').evaluateAll((controls) => {
      const boxes = controls
        .map((control) => ({
          label: control.getAttribute('aria-label') ?? control.textContent?.trim() ?? control.tagName,
          rect: control.getBoundingClientRect(),
          visible: getComputedStyle(control).visibility !== 'hidden' && getComputedStyle(control).display !== 'none',
        }))
        .filter(({ rect, visible }) => visible && rect.width > 0 && rect.height > 0);
      const overlaps: string[] = [];
      for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
          const left = boxes[leftIndex]!;
          const right = boxes[rightIndex]!;
          const xOverlap = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
          const yOverlap = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);
          if (xOverlap > 1 && yOverlap > 1) overlaps.push(`${left.label} / ${right.label}`);
        }
      }
      return overlaps;
    });
    expect(overlappingNavControls, `Overlapping primary navigation controls: ${overlappingNavControls.join(', ')}`).toEqual([]);

    if (viewport.width <= 768) {
      const undersizedTargets = await page.locator('body > header a[href], body > header button, body > header summary, nav.phase-index a[href], nav.phase-index button, main a[href], main button, main summary').evaluateAll(
        (controls) =>
          controls
            .filter((control) => {
              const style = getComputedStyle(control);
              const rect = control.getBoundingClientRect();
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight &&
                rect.right > 0 &&
                rect.left < window.innerWidth
              );
            })
            .filter((control) => {
              const rect = control.getBoundingClientRect();
              return rect.width < 44 || rect.height < 44;
            })
            .map((control) => {
              const rect = control.getBoundingClientRect();
              return `${control.getAttribute('aria-label') ?? control.textContent?.trim() ?? control.tagName} (${Math.round(rect.width)}x${Math.round(rect.height)})`;
            }),
      );
      expect(undersizedTargets, `Touch targets smaller than 44px: ${undersizedTargets.join(', ')}`).toEqual([]);
    }

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)).toBe(true);
    await expect(page.locator('section[data-experience-phase="prove"]')).toBeVisible();
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
}
