import { expect, test, type Page } from '@playwright/test';

const acts = [
  'presence',
  'access',
  'startup',
  'method',
  'activity',
  'evidence',
  'action',
] as const;

const requiredViewports = [
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

async function activateAct(page: Page, act: (typeof acts)[number]): Promise<void> {
  const section = page.locator(`[data-experience-phase="${act}"]`);
  await section.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const top = bounds.top + window.scrollY;
    window.scrollTo({
      top: Math.max(
        0,
        top - viewportHeight * 0.48 + Math.max(bounds.height, viewportHeight) * 0.5,
      ),
      behavior: 'instant',
    });
  });
  await expect.poll(() => page.locator('html').getAttribute('data-active-phase')).toBe(act);
}

async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.body, `${context}: body overflow`).toBeLessThanOrEqual(1);
  expect(overflow.root, `${context}: root overflow`).toBeLessThanOrEqual(1);
}

async function expectContained(page: Page, selector: string, width: number, context: string): Promise<void> {
  const findings = await page.locator(selector).evaluateAll((nodes, viewportWidth) =>
    nodes.flatMap((node) => {
      const style = getComputedStyle(node);
      const bounds = node.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || bounds.width === 0) return [];
      return bounds.left < -1 || bounds.right > Number(viewportWidth) + 1 || bounds.width <= 0
        ? [{ text: (node.textContent ?? node.tagName).trim().slice(0, 80), left: bounds.left, right: bounds.right }]
        : [];
    }), width);
  expect(findings, `${context}: visible content escaped the viewport.`).toEqual([]);
}

for (const viewport of requiredViewports) {
  test(`${viewport.width}x${viewport.height} contains all seven acts, actions, and partner identities`, async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expectNoHorizontalOverflow(page, `${viewport.name} initial`);

    const primary = page.locator('nav[aria-label="Primary"]');
    if (!(await primary.isVisible())) {
      const disclosure = page.locator('summary[aria-label*="navigation" i]');
      await expect(disclosure).toBeVisible();
      await expectContained(page, 'summary[aria-label*="navigation" i]', viewport.width, viewport.name);
      await disclosure.click();
    }
    await expect(primary).toBeVisible();
    await expectContained(page, 'body > header', viewport.width, `${viewport.name} header`);
    await expectNoHorizontalOverflow(page, `${viewport.name} open navigation`);

    for (const act of acts) {
      await activateAct(page, act);
      const section = page.locator(`[data-experience-phase="${act}"]`);
      const heading = section.locator('h1, h2').first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/\S/);
      await expectContained(page, `[data-experience-phase="${act}"] h1, [data-experience-phase="${act}"] h2`, viewport.width, `${viewport.name} ${act} heading`);
      await expectNoHorizontalOverflow(page, `${viewport.name} ${act}`);
    }

    await expectContained(
      page,
      '[data-startup-action], [data-proof-handoff], [data-work-with-quantum]',
      viewport.width,
      `${viewport.name} actions`,
    );
    await expectContained(
      page,
      '[data-partner-id]',
      viewport.width,
      `${viewport.name} Partner Field`,
    );

    if (viewport.width <= 768) {
      const partners = await page.locator('[data-partner-id]').evaluateAll((nodes) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect();
          return {
            position: getComputedStyle(node).position,
            opacity: Number.parseFloat(getComputedStyle(node).opacity),
            top: bounds.top,
            bottom: bounds.bottom,
            width: bounds.width,
          };
        }),
      );
      for (const [index, partner] of partners.entries()) {
        expect(partner.position, `${viewport.name} partner ${index + 1}`).toBe('relative');
        expect(partner.opacity, `${viewport.name} partner ${index + 1}`).toBeGreaterThan(0.01);
        expect(partner.width, `${viewport.name} partner ${index + 1}`).toBeGreaterThan(
          viewport.width * 0.72,
        );
        if (index > 0) {
          expect(partner.top, `${viewport.name} partner sequence ${index + 1}`).toBeGreaterThanOrEqual(
            partners[index - 1]!.bottom - 1,
          );
        }
      }

      const undersizedTargets = await page
        .locator(
          'body > header a[href], body > header summary, main a[href]',
        )
        .evaluateAll((controls) =>
          controls.flatMap((control) => {
            const style = getComputedStyle(control);
            const bounds = control.getBoundingClientRect();
            if (
              style.display === 'none'
              || style.visibility === 'hidden'
              || bounds.width === 0
              || bounds.height === 0
            ) return [];
            return bounds.width < 44 || bounds.height < 44
              ? [`${(control.textContent ?? control.tagName).trim()}:${Math.round(bounds.width)}x${Math.round(bounds.height)}`]
              : [];
          }),
        );
      expect(undersizedTargets, `${viewport.name}: visible touch targets below 44px.`).toEqual([]);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
}

for (const viewport of requiredViewports.filter(({ width }) => width <= 430)) {
  test(`${viewport.width}x${viewport.height} ACCESS keeps settled viewport copy within 28 words`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    const accessRange = await page.locator('[data-experience-phase="access"]').evaluate((section) => {
      const bounds = section.getBoundingClientRect();
      const top = bounds.top + window.scrollY;
      return {
        top,
        end: Math.max(top, top + bounds.height - window.innerHeight),
        step: Math.max(120, Math.round(window.innerHeight / 4)),
      };
    });

    const samples: Array<{ scrollY: number; words: number; copy: string[] }> = [];
    for (let scrollY = accessRange.top; scrollY <= accessRange.end; scrollY += accessRange.step) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), scrollY);
      await page.waitForTimeout(20);
      samples.push(await page.locator('[data-experience-phase="access"]').evaluate((section) => {
        const visibleCopy = [
          ...section.querySelectorAll<HTMLElement>(
            'h2, h3, .partner-plane__relationship, .partner-plane strong',
          ),
        ].flatMap((element) => {
          const text = element.textContent?.trim() ?? '';
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const visibleHeight = Math.max(
            0,
            Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0),
          );
          const verticalVisibility = visibleHeight / Math.max(bounds.height, 1);
          const visible = Boolean(text)
            && verticalVisibility >= 0.5
            && bounds.right > 0
            && bounds.left < window.innerWidth
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number.parseFloat(style.opacity || '1') > 0.01;
          return visible ? [text] : [];
        });
        const words = visibleCopy.reduce(
          (total, value) => total + (value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0),
          0,
        );
        return { scrollY: window.scrollY, words, copy: visibleCopy };
      }));
    }

    const densest = samples.reduce((maximum, sample) =>
      sample.words > maximum.words ? sample : maximum,
    );
    expect(
      densest.words,
      `${viewport.name} densest ACCESS viewport: ${JSON.stringify(densest)}`,
    ).toBeLessThanOrEqual(28);
  });
}
