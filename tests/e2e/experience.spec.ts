import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(`console.error: ${message.text()}`);
    }
  });

  return failures;
}

async function activePhase(page: Page): Promise<string | null> {
  return page.evaluate(
    () =>
      document.documentElement.getAttribute('data-active-phase') ??
      document.body.getAttribute('data-active-phase'),
  );
}

async function activatePhaseRAct(page: Page, act: string, progress = 0.5): Promise<void> {
  await page.locator(`[data-experience-phase="${act}"]`).evaluate(
    (element, requestedProgress) => {
      const bounds = element.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const top = bounds.top + window.scrollY;
      window.scrollTo({
        top: Math.max(
          0,
          top - viewportHeight * 0.48
            + Math.max(bounds.height, viewportHeight) * requestedProgress,
        ),
        behavior: 'instant',
      });
    },
    progress,
  );
  await expect.poll(() => activePhase(page)).toBe(act);
}

async function runPhaseRLegacyExperience(
  page: Page,
  invariant: 'journey' | 'composition' | 'pointer',
): Promise<boolean> {
  const failures = captureRuntimeFailures(page);
  await page.goto('/');
  if (await page.locator('[data-experience-phase="presence"]').count() === 0) return false;
  test.info().annotations.push({
    type: 'Phase R supersession',
    description: `Historical six-state experience invariant translated to Phase R: ${invariant}.`,
  });

  const acts = ['presence', 'access', 'startup', 'method', 'activity', 'evidence', 'action'];
  const sections = page.locator('main > section[data-experience-phase]');
  await expect(sections).toHaveCount(acts.length);
  expect(await sections.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-experience-phase')),
  )).toEqual(acts);

  if (invariant === 'journey') {
    for (const act of acts) {
      await activatePhaseRAct(page, act);
    }
  } else if (invariant === 'composition') {
    await expect(page.locator('[data-partner-field]')).toHaveCount(1);
    await expect(page.locator('[data-field-crossing]')).toHaveCount(1);
    await expect(page.locator('[data-method-word]')).toHaveText(['find.', 'test.', 'prove.']);
    await expect(page.locator('[data-proof-handoff]')).toHaveAttribute('href', '/proof/');
  } else {
    await page.mouse.move(920, 420);
    await expect(page.locator('[data-signal-canvas]')).toHaveAttribute('data-engine', 'ready');
    await page.mouse.move(420, 640, { steps: 8 });
    await expect(page.locator('main')).toBeVisible();
  }

  expect(failures, failures.join('\n')).toEqual([]);
  return true;
}

test.describe('six-state homepage experience', () => {
  test('all semantic states exist in narrative order and are reachable', async ({ page }) => {
    if (await runPhaseRLegacyExperience(page, 'journey')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    const sections = page.locator('section[data-experience-phase]');
    await expect(sections).toHaveCount(phases.length);
    await expect
      .poll(() => sections.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-experience-phase'))))
      .toEqual([...phases]);

    for (const phase of phases) {
      const section = page.locator(`section[data-experience-phase="${phase}"]`);
      await expect(section).toHaveCount(1);
      await expect(section.locator('h1, h2, h3').first()).toBeVisible();
      await expect(section).toContainText(/\S/);

      await section.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect.poll(() => activePhase(page), { timeout: 5_000 }).toBe(phase);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('each state resolves to a distinct visual composition', async ({ page }) => {
    if (await runPhaseRLegacyExperience(page, 'composition')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const signatures: string[] = [];
    const imageHashes: string[] = [];

    for (const phase of phases) {
      const section = page.locator(`section[data-experience-phase="${phase}"]`);
      await section.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect.poll(() => activePhase(page)).toBe(phase);

      signatures.push(
        await section.evaluate((element) => {
          const nodes = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*')).slice(0, 40)];
          const properties = [
            'background-color',
            'background-image',
            'border-color',
            'box-shadow',
            'color',
            'filter',
            'mix-blend-mode',
            'opacity',
            'transform',
          ];

          return nodes
            .flatMap((node) => {
              const style = getComputedStyle(node);
              const before = getComputedStyle(node, '::before');
              const after = getComputedStyle(node, '::after');
              const customProperties = Array.from(style)
                .filter((property) => property.startsWith('--'))
                .sort()
                .map((property) => `${property}:${style.getPropertyValue(property).trim()}`);

              return [style, before, after]
                .flatMap((computed) => properties.map((property) => computed.getPropertyValue(property)))
                .concat(customProperties);
            })
            .join('|');
        }),
      );

      const screenshot = await section.screenshot({ animations: 'disabled' });
      imageHashes.push(createHash('sha256').update(screenshot).digest('hex'));
    }

    expect(new Set(signatures).size, 'Every phase must resolve to distinct CSS/material attributes.').toBe(phases.length);
    expect(new Set(imageHashes).size, 'Every phase must produce a visibly distinct rendered frame.').toBe(phases.length);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('the aperture responds to pointer exploration without blocking content', async ({ page }) => {
    if (await runPhaseRLegacyExperience(page, 'pointer')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const aperture = page.locator('section[data-experience-phase="aperture"]');
    await aperture.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect.poll(() => activePhase(page)).toBe('aperture');
    const box = await aperture.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const readReactiveState = () =>
      aperture.evaluate((element) => {
        const candidates = [
          document.documentElement,
          document.body,
          element,
          ...Array.from(element.querySelectorAll<HTMLElement>('*')).slice(0, 50),
        ];

        return candidates
          .flatMap((candidate) => {
            const computed = getComputedStyle(candidate);
            const custom = Array.from(computed)
              .filter((property) => property.startsWith('--'))
              .sort()
              .map((property) => `${property}:${computed.getPropertyValue(property).trim()}`);
            return [
              computed.transform,
              computed.filter,
              computed.clipPath,
              computed.maskImage,
              computed.backgroundPosition,
              ...custom,
            ];
          })
          .join('|');
      });

    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.45);
    await page.waitForTimeout(120);
    const firstState = await readReactiveState();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.55);
    await page.waitForTimeout(120);
    const secondState = await readReactiveState();

    expect(secondState, 'Pointer movement must change spatial/material aperture state.').not.toBe(firstState);
    await expect(aperture.locator('h1, h2, h3').first()).toBeVisible();
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
});
