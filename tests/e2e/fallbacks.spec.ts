import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function renderMode(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document.documentElement.getAttribute('data-render-mode') ??
      document.body.getAttribute('data-render-mode'),
  );
}

async function assertNarrativeAndNavigation(page: Page): Promise<void> {
  const navigation = page.locator('nav[aria-label="Primary"]');
  if (!(await navigation.isVisible())) {
    const disclosure = page.locator('summary[aria-label*="navigation" i]').first();
    await expect(disclosure).toBeVisible();
    await disclosure.click();
  }
  await expect(navigation).toBeVisible();
  for (const phase of phases) {
    const section = page.locator(`section[data-experience-phase="${phase}"]`);
    await expect(section).toHaveCount(1);
    await expect(section.locator('h1, h2, h3').first()).toBeVisible();
    await expect(section).toContainText(/\S/);
  }

  const firstLink = navigation.locator('a[href]').first();
  await expect(firstLink).toBeVisible();
  await firstLink.click();
  await expect(page.locator('main')).toBeVisible();
}

async function close(context: BrowserContext): Promise<void> {
  await context.close();
}

test('normal desktop retains the complete semantic journey', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.goto('/');
  await expect.poll(() => renderMode(page)).not.toBeNull();
  await assertNarrativeAndNavigation(page);
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

test('normal mobile/touch retains the complete semantic journey', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const runtimeFailures = captureRuntimeFailures(page);
  try {
    await page.goto('/');
    await expect.poll(() => renderMode(page)).not.toBeNull();
    await assertNarrativeAndNavigation(page);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  } finally {
    await close(context);
  }
});

test('prefers-reduced-motion activates a designed resolved mode', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const runtimeFailures = captureRuntimeFailures(page);
  try {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await expect.poll(() => renderMode(page)).toMatch(/reduced/i);
    await assertNarrativeAndNavigation(page);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  } finally {
    await close(context);
  }
});

test('?webgl=off activates the intentional DOM/CSS fallback', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.goto('/?webgl=off');
  await expect.poll(() => renderMode(page)).toMatch(/fallback|no-webgl/i);
  await assertNarrativeAndNavigation(page);
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});
