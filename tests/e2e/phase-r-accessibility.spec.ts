import AxeBuilder from '@axe-core/playwright';
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

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function setActProgress(page: Page, act: Act, progress = 0.5): Promise<void> {
  const section = page.locator(`[data-experience-phase="${act}"]`);
  await section.evaluate((element, requestedProgress) => {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const top = bounds.top + window.scrollY;
    window.scrollTo({
      top: Math.max(
        0,
        top - viewportHeight * 0.48 + Math.max(bounds.height, viewportHeight) * requestedProgress,
      ),
      behavior: 'instant',
    });
  }, progress);
  await expect.poll(() => page.locator('html').getAttribute('data-active-phase')).toBe(act);
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  return violations
    .map((violation) =>
      `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(', ')}`,
    )
    .join('\n');
}

async function expectNoBlockingAxeViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
  expect(blocking, `${context}\n${formatViolations(blocking)}`).toEqual([]);
}

async function tabTo(page: Page, target: Locator, context: string): Promise<void> {
  const focusId = `phase-r-${context.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  await target.evaluate((element, id) => {
    (element as HTMLElement).dataset.e2eFocusId = id;
  }, focusId);
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });

  let reached = false;
  for (let index = 0; index < 32; index += 1) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate((id) =>
      (document.activeElement as HTMLElement | null)?.dataset.e2eFocusId === id,
    focusId);
    if (reached) break;
  }
  expect(reached, `${context} must be reachable through normal Tab traversal.`).toBe(true);

  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      indicator:
        (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
        || style.boxShadow !== 'none'
        || style.textDecorationLine.includes('underline'),
    };
  });
  expect(focus.focusVisible, `${context} must receive keyboard-visible focus.`).toBe(true);
  expect(focus.indicator, `${context} needs a visible focus indicator.`).toBe(true);
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`${viewport.name} settled Phase R acts have no critical or serious axe violations`, async ({
    page,
  }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.locator('body > header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('[data-quantum-stage][aria-hidden="true"]')).toHaveCount(1);

    const levels = await page.locator('main h1, main h2, main h3').evaluateAll((headings) =>
      headings.map((heading) => Number.parseInt(heading.tagName.slice(1), 10)),
    );
    expect(levels[0]).toBe(1);
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index]! - levels[index - 1]!).toBeLessThanOrEqual(1);
    }

    for (const act of acts) {
      await setActProgress(page, act);
      await expectNoBlockingAxeViolations(
        page,
        `${viewport.name} ${viewport.width}x${viewport.height} ${act}`,
      );
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
}

test('the startup, Proof, and final actions are keyboard reachable with visible focus', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await tabTo(page, page.locator('[data-startup-action]'), 'startup action');
  await tabTo(page, page.locator('[data-proof-handoff]'), 'Proof action');
  await tabTo(page, page.locator('[data-work-with-quantum]'), 'final action');

  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

test('forced colors preserves partner names, headings, and primary actions without decorative reliance', async ({
  page,
}) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => matchMedia('(forced-colors: active)').matches))
    .toBe(true);

  await setActProgress(page, 'access', 0.82);
  await expect(page.locator('[data-partner-id] strong')).toHaveCount(5);
  for (const name of await page.locator('[data-partner-id] strong').all()) {
    await expect(name).toBeVisible();
  }
  await expect(page.locator('[data-partner-id] img').first()).toBeHidden();

  await setActProgress(page, 'evidence');
  await expect(page.locator('[data-proof-handoff]')).toBeVisible();
  await setActProgress(page, 'action');
  await expect(page.locator('[data-work-with-quantum]')).toBeVisible();
  await expect(page.locator('[data-quantum-stage]')).toBeHidden();
  await expectNoBlockingAxeViolations(page, 'forced-colors ACTION');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.wordmark__asset--icon.wordmark__asset--on-light')).toBeVisible();
  await expect(page.locator('.wordmark__asset--icon.wordmark__asset--on-dark')).toBeHidden();

  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});
