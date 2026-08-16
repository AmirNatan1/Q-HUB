import { expect, test, type Locator, type Page } from '@playwright/test';

const acts = [
  'presence',
  'access',
  'startup',
  'method',
  'activity',
  'evidence',
  'action',
] as const;

type Act = (typeof acts)[number];

const partnerContract = {
  'taavura-livnat-group': {
    name: 'Taavura–Livnat Group',
    relationship: 'founding-partner',
  },
  talcar: { name: 'Talcar', relationship: 'founding-partner' },
  'vdl-group': { name: 'VDL Group', relationship: 'strategic-partner' },
  'hyundai-motor-group': {
    name: 'Hyundai Motor Group',
    relationship: 'strategic-partner',
  },
  'bazan-group': { name: 'Bazan Group', relationship: 'strategic-partner' },
} as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function setActProgress(page: Page, act: Act, progress: number): Promise<Locator> {
  const section = page.locator(`[data-experience-phase="${act}"]`);
  await section.evaluate((element, requestedProgress) => {
    const bounds = element.getBoundingClientRect();
    const top = bounds.top + window.scrollY;
    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const denominator = Math.max(bounds.height, viewportHeight);
    window.scrollTo({
      top: Math.max(0, top - marker + denominator * requestedProgress),
      behavior: 'instant',
    });
  }, progress);
  await expect
    .poll(() => page.locator('html').getAttribute('data-active-phase'))
    .toBe(act);
  return section;
}

test.describe('Phase R homepage contract', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('publishes seven ordered semantic acts through stable data attributes', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const sections = page.locator('main[data-experience] > section[data-experience-phase]');
    await expect(sections).toHaveCount(acts.length);
    await expect
      .poll(() =>
        sections.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-experience-phase')),
        ),
      )
      .toEqual([...acts]);

    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('.phase-index, .experience-hud')).toHaveCount(0);

    for (const act of acts) {
      const section = page.locator(`section#${act}[data-experience-phase="${act}"]`);
      await expect(section).toHaveCount(1);
      const labelledBy = await section.getAttribute('aria-labelledby');
      expect(labelledBy, `${act} requires an associated heading.`).toBeTruthy();
      await expect(section.locator(`#${labelledBy}`)).toHaveCount(1);
      await expect(section.locator('h1, h2').first()).toContainText(/\S/);
      await setActProgress(page, act, 0.5);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('exposes the resolved presence, Partner Field, Field Crossing, and method states', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const presence = await setActProgress(page, 'presence', 0.58);
    await expect(presence).toHaveAttribute('data-presence-state', 'resolved');
    await expect(presence.locator('h1')).toContainText(/quantum\s*hub/i);
    await expect(presence.locator('.phase-r-presence__resolve')).toContainText(
      /where industry meets technology/i,
    );

    const access = await setActProgress(page, 'access', 0.46);
    await expect(access).toHaveAttribute('data-partner-state', 'strategic');
    await expect(page.locator('html')).toHaveAttribute(
      'data-partner-focus',
      /^(?:vdl-group|hyundai-motor-group|bazan-group)$/,
    );
    await setActProgress(page, 'access', 0.82);
    await expect(access).toHaveAttribute('data-partner-state', 'founding');
    await expect(page.locator('html')).toHaveAttribute(
      'data-partner-focus',
      /^(?:taavura-livnat-group|talcar)$/,
    );

    const startup = await setActProgress(page, 'startup', 0.16);
    await expect(startup).toHaveAttribute('data-crossing-state', 'outside');
    const outside = await startup.locator('.field-crossing__signal').boundingBox();
    const threshold = await startup.locator('.field-crossing__threshold').boundingBox();
    expect(outside).not.toBeNull();
    expect(threshold).not.toBeNull();
    if (outside && threshold) expect(outside.x + outside.width / 2).toBeLessThan(threshold.x);

    await setActProgress(page, 'startup', 0.48);
    await expect(startup).toHaveAttribute('data-crossing-state', 'threshold');
    await setActProgress(page, 'startup', 0.84);
    await expect(startup).toHaveAttribute('data-crossing-state', 'field');
    const field = await startup.locator('.field-crossing__signal').boundingBox();
    const fieldThreshold = await startup.locator('.field-crossing__threshold').boundingBox();
    expect(field).not.toBeNull();
    expect(fieldThreshold).not.toBeNull();
    if (field && fieldThreshold) {
      expect(field.x + field.width / 2).toBeGreaterThan(fieldThreshold.x);
    }

    const method = page.locator('[data-experience-phase="method"]');
    for (const [state, progress] of [
      ['find', 0.16],
      ['test', 0.5],
      ['prove', 0.84],
    ] as const) {
      await setActProgress(page, 'method', progress);
      await expect(method).toHaveAttribute('data-method-state', state);
      await expect(method.locator(`[data-method-word="${state}"]`)).toContainText(
        new RegExp(`^${state}\\.$`, 'i'),
      );
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('renders exactly the five approved partners with exact relationship taxonomy and local assets', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');
    await setActProgress(page, 'access', 0.82);

    const field = page.locator('[data-partner-field]');
    await expect(field).toHaveCount(1);
    await expect(field.locator('h3')).toHaveText(['Strategic Partners', 'Founding Partners']);

    const partners = field.locator('[data-partner-id]');
    await expect(partners).toHaveCount(5);
    const rendered = await partners.evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-partner-id'),
        relationship: node.getAttribute('data-partner-relationship'),
        name: node.querySelector('strong')?.textContent?.trim(),
        imagePath: node.querySelector('img')?.getAttribute('src'),
        naturalWidth: (node.querySelector('img') as HTMLImageElement | null)?.naturalWidth ?? 0,
      })),
    );

    expect(Object.fromEntries(rendered.map((partner) => [partner.id, {
      name: partner.name,
      relationship: partner.relationship,
    }]))).toEqual(partnerContract);
    for (const partner of rendered) {
      expect(partner.imagePath).toMatch(/^\/media\/partners\/[a-z0-9-]+\.(?:png|jpg)$/);
      expect(partner.imagePath).not.toMatch(/composite|reference|drive/i);
      expect(partner.naturalWidth, `${partner.id} identity must decode locally.`).toBeGreaterThan(0);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('uses working Proof and startup actions without project-specific homepage language', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);

    const proof = page.locator('a[data-proof-handoff]');
    await expect(proof).toHaveCount(1);
    await expect(proof).toHaveAttribute('href', '/proof/');
    await expect(proof).toContainText(/explore proof/i);

    const action = page.locator('a[data-work-with-quantum]');
    await expect(action).toHaveCount(1);
    await expect(action).toHaveAttribute('href', 'mailto:info@quantum-hub.com');
    await expect(action).toContainText(/work with quantum/i);
    await expect(page.locator('main a[href*="maradin" i]')).toHaveCount(0);

    const browserOutput = (await page.content()).toLowerCase();
    for (const denied of [
      'maradin',
      'dynamic ground projection',
      'hyundai cradle',
      'mems',
      'more than 60',
      'qh / proof 001',
      'sourceReferenceInternal'.toLowerCase(),
      'drive id',
    ]) {
      expect(browserOutput, `Homepage output contains denied token: ${denied}`).not.toContain(denied);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('realtime rendering pauses when hidden or inactive and tears down on pagehide', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const runtime = window as Window & { __phaseRDraws?: number };
      runtime.__phaseRDraws = 0;
      const originalDrawArrays = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function patchedDrawArrays(...args) {
        runtime.__phaseRDraws = (runtime.__phaseRDraws ?? 0) + 1;
        return originalDrawArrays.apply(this, args);
      };
    });

    await page.goto('/');
    await page.mouse.move(920, 420);
    const canvas = page.locator('[data-signal-canvas]');
    await expect(canvas).toHaveAttribute('data-engine', 'ready');

    const drawCount = () => page.evaluate(
      () => (window as Window & { __phaseRDraws?: number }).__phaseRDraws ?? 0,
    );
    const activeStart = await drawCount();
    await page.waitForTimeout(300);
    expect(await drawCount()).toBeGreaterThan(activeStart + 2);

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(true);
    await page.waitForTimeout(120);
    const hiddenStart = await drawCount();
    await page.waitForTimeout(300);
    expect(await drawCount()).toBe(hiddenStart);

    await page.evaluate(() => {
      delete (document as unknown as { hidden?: boolean }).hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => page.evaluate(() => document.hidden)).toBe(false);

    await setActProgress(page, 'access', 0.5);
    await page.waitForTimeout(160);
    const inactiveStart = await drawCount();
    await page.waitForTimeout(300);
    expect(await drawCount()).toBe(inactiveStart);

    await setActProgress(page, 'method', 0.5);
    await page.mouse.move(760, 410);
    await page.waitForTimeout(180);
    const settledMethod = await drawCount();
    await page.waitForTimeout(300);
    expect(await drawCount()).toBe(settledMethod);

    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
    );
    await expect(canvas).not.toHaveAttribute('data-engine', 'ready');
    const suspendedStart = await drawCount();
    await page.waitForTimeout(220);
    expect(await drawCount()).toBe(suspendedStart);

    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
    );
    await page.mouse.move(860, 430);
    await expect(canvas).toHaveAttribute('data-engine', 'ready');

    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(canvas).not.toHaveAttribute('data-engine', 'ready');
    const destroyedStart = await drawCount();
    const destroyedState = await page.evaluate(() => ({
      active: document.documentElement.dataset.activePhase,
      pointerX: document.documentElement.style.getPropertyValue('--pointer-x'),
      story: document.documentElement.style.getPropertyValue('--story-progress'),
    }));
    await page.evaluate(() => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 80, clientY: 80 }));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow'));
    });
    await page.waitForTimeout(240);
    expect(await drawCount()).toBe(destroyedStart);
    await expect(canvas).not.toHaveAttribute('data-engine', 'ready');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          active: document.documentElement.dataset.activePhase,
          pointerX: document.documentElement.style.getPropertyValue('--pointer-x'),
          story: document.documentElement.style.getPropertyValue('--story-progress'),
        })),
      )
      .toEqual(destroyedState);
  });

  test('a pending field-engine import cannot escape a reduced-motion mode change', async ({
    page,
  }) => {
    let intercepted = false;
    let releaseImport: (() => void) | undefined;
    const importReleased = new Promise<void>((resolve) => {
      releaseImport = resolve;
    });
    await page.route(/field-engine/i, async (route) => {
      intercepted = true;
      await importReleased;
      await route.continue();
    });

    await page.goto('/');
    await page.mouse.move(920, 420);
    await expect.poll(() => intercepted).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'reduced-motion');
    releaseImport?.();
    await page.waitForTimeout(240);

    await expect(page.locator('[data-signal-canvas]')).not.toHaveAttribute(
      'data-engine',
      'ready',
    );
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'reduced-motion');
  });
});
