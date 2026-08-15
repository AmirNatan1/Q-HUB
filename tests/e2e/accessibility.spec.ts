import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

test.describe('accessibility release gate', () => {
  test('has valid landmarks, headings, names, and non-canvas equivalents', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    await expect(page.locator('body > header')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveCount(1);

    const headingLevels = await page.locator('main h1, main h2, main h3, main h4, main h5, main h6').evaluateAll((headings) =>
      headings.map((heading) => Number.parseInt(heading.tagName.slice(1), 10)),
    );
    expect(headingLevels.length).toBeGreaterThanOrEqual(phases.length);
    expect(headingLevels[0]).toBe(1);
    for (let index = 1; index < headingLevels.length; index += 1) {
      expect(
        headingLevels[index]! - headingLevels[index - 1]!,
        `Heading level jumps from h${headingLevels[index - 1]} to h${headingLevels[index]}.`,
      ).toBeLessThanOrEqual(1);
    }

    for (const phase of phases) {
      const section = page.locator(`section[data-experience-phase="${phase}"]`);
      await expect(section.locator('h1, h2, h3').first()).toBeVisible();
      await expect(section).toContainText(/\S/);
    }

    const unnamedControls = await page.locator('body > header a[href], body > header button, body > header summary, main a[href], main button, main summary, main input, main select, main textarea, main [role="button"], nav.phase-index a[href], nav.phase-index button').evaluateAll(
      (controls) =>
        controls
          .filter((control) => {
            const element = control as HTMLElement;
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
          })
          .filter((control) => {
            const element = control as HTMLElement;
            const labelledBy = element.getAttribute('aria-labelledby');
            const referencedLabel = labelledBy
              ? labelledBy
                  .split(/\s+/)
                  .map((id) => document.getElementById(id)?.textContent ?? '')
                  .join(' ')
              : '';
            const nestedImageAlt = element.querySelector('img[alt]')?.getAttribute('alt') ?? '';
            const name = [
              element.getAttribute('aria-label'),
              referencedLabel,
              element.getAttribute('title'),
              nestedImageAlt,
              element.textContent,
            ].find((candidate) => candidate?.trim());
            return !name;
          })
          .map((control) => control.outerHTML.slice(0, 180)),
    );
    expect(unnamedControls, `Interactive controls without names:\n${unnamedControls.join('\n')}`).toEqual([]);

    const canvasWithoutEquivalent = await page.locator('canvas').evaluateAll((canvases) =>
      canvases
        .filter((canvas) => {
          const phase = canvas.closest<HTMLElement>('section[data-experience-phase]');
          if (phase) {
            const semanticContent = phase.querySelector<HTMLElement>('h1, h2, h3, p, dl, ul, ol');
            return !semanticContent || (semanticContent.textContent ?? '').trim().length < 12;
          }

          const sharedStageIsDecorative = canvas.closest('[aria-hidden="true"]') !== null;
          const semanticPhases = Array.from(document.querySelectorAll<HTMLElement>('section[data-experience-phase]'));
          const sharedEquivalentExists =
            semanticPhases.length === 6 &&
            semanticPhases.every((section) => (section.textContent ?? '').trim().length >= 12);
          return !sharedStageIsDecorative || !sharedEquivalentExists;
        })
        .map((canvas) => canvas.outerHTML),
    );
    expect(canvasWithoutEquivalent, 'Every meaningful canvas needs equivalent semantic DOM content.').toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('all visible controls are keyboard reachable with visible focus and no trap', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const focusableIds = await page.evaluate(() => {
      const selector = 'body > .skip-link, body > header a[href], body > header button:not([disabled]), body > header summary, main a[href], main button:not([disabled]), main summary, main input:not([disabled]), main select:not([disabled]), main textarea:not([disabled]), main [tabindex]:not([tabindex="-1"]), nav.phase-index a[href], nav.phase-index button:not([disabled])';
      return Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && !element.closest('[inert]');
        })
        .map((element, index) => {
          const id = `focus-${index}`;
          element.dataset.e2eFocusId = id;
          return id;
        });
    });

    expect(focusableIds.length, 'The experience must expose keyboard-operable navigation or controls.').toBeGreaterThan(0);
    await page.evaluate(() => {
      document.body.tabIndex = -1;
      document.body.focus();
    });

    const visited = new Set<string>();
    const missingIndicators: string[] = [];
    for (let index = 0; index < focusableIds.length + 3; index += 1) {
      await page.keyboard.press('Tab');
      const state = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return null;
        const style = getComputedStyle(active);
        return {
          id: active.dataset.e2eFocusId ?? null,
          hasIndicator:
            (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== 'none' ||
            style.textDecorationLine.includes('underline'),
        };
      });
      if (state?.id) {
        visited.add(state.id);
        if (!state.hasIndicator) missingIndicators.push(state.id);
      }
      if (visited.size === focusableIds.length) break;
    }

    expect([...visited].sort(), 'Tab traversal must reach every visible control without a keyboard trap.').toEqual(
      [...focusableIds].sort(),
    );
    expect([...new Set(missingIndicators)], 'Every keyboard-focused control must have a visible focus treatment.').toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('has zero critical or serious axe violations', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    );

    expect(
      blocking,
      blocking
        .map(
          (violation) =>
            `${violation.id} (${violation.impact}): ${violation.help}\n${violation.nodes
              .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary ?? ''}`)
              .join('\n')}`,
        )
        .join('\n\n'),
    ).toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
});
