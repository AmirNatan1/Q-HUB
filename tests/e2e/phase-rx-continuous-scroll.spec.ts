import { expect, test, type Page } from '@playwright/test';

const targetActs = ['access', 'startup', 'method', 'activity'] as const;
type TargetAct = (typeof targetActs)[number];

interface ProgressSample {
  phase: string;
  progress: number;
  scrollY: number;
  substate: string | null;
  visual: number[];
}

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function readProgress(page: Page): Promise<ProgressSample> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const phase = root.dataset.activePhase ?? 'unknown';
    const section = document.querySelector<HTMLElement>(
      `[data-experience-phase="${CSS.escape(phase)}"]`,
    );
    const number = (element: HTMLElement | null, name: string): number => {
      const value = element?.style.getPropertyValue(name) ?? '';
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    let visual: number[] = [];
    if (phase === 'access') {
      visual = [...document.querySelectorAll<HTMLElement>('[data-partner-id]')]
        .flatMap((element) => [
          number(element, '--partner-opacity'),
          number(element, '--partner-scale'),
          number(element, '--partner-offset'),
        ]);
    } else if (phase === 'startup') {
      visual = [
        number(section, '--crossing-position'),
        number(section, '--crossing-scale-x'),
        number(section, '--crossing-scale-y'),
        number(section, '--crossing-field-opacity'),
        number(section, '--crossing-constraint-opacity'),
      ];
    } else if (phase === 'method') {
      const instrument = section?.querySelector<HTMLElement>('.method-instrument') ?? null;
      visual = [
        number(instrument, '--method-surface-left'),
        number(instrument, '--method-focus-left'),
        number(instrument, '--method-focus-width'),
        number(instrument, '--method-test-weight'),
        number(instrument, '--method-prove-weight'),
      ];
    } else if (phase === 'activity') {
      visual = [...document.querySelectorAll<HTMLElement>('[data-activity-geometry]')]
        .flatMap((element) => [
          number(element, '--activity-opacity'),
          number(element, '--activity-scale'),
        ]);
    }
    const substate = phase === 'access'
      ? section?.dataset.partnerState
      : phase === 'startup'
        ? section?.dataset.crossingState
        : phase === 'method'
          ? section?.dataset.methodState
          : phase === 'activity'
            ? section?.dataset.activityState
            : null;
    return {
      phase,
      progress: Number.parseFloat(section?.dataset.progress ?? '-1'),
      scrollY: window.scrollY,
      substate: substate ?? null,
      visual,
    };
  });
}

function vectorDelta(before: number[], after: number[]): number {
  return Array.from(
    { length: Math.max(before.length, after.length) },
    (_, index) => index,
  ).reduce(
    (total, index) => total + Math.abs((after[index] ?? 0) - (before[index] ?? 0)),
    0,
  );
}

async function wheelStep(page: Page, deltaY: number, intervalMs = 42): Promise<ProgressSample> {
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(intervalMs);
  return readProgress(page);
}

async function advanceToPhase(page: Page, target: string, maximumSteps = 220): Promise<ProgressSample> {
  for (let step = 0; step < maximumSteps; step += 1) {
    const sample = await readProgress(page);
    if (sample.phase === target) return sample;
    await wheelStep(page, 112, 28);
  }
  throw new Error(`Natural wheel input did not reach ${target} within ${maximumSteps} steps.`);
}

async function sampleContinuousResponse(page: Page, act: TargetAct): Promise<ProgressSample[]> {
  const samples = [await advanceToPhase(page, act)];
  for (let step = 0; step < 10; step += 1) {
    samples.push(await wheelStep(page, 76));
  }
  return samples.filter((sample) => sample.phase === act);
}

test('desktop native wheel input continuously advances ACCESS STARTUP METHOD and ACTIVITY', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const runtimeFailures = captureRuntimeFailures(page);
  await page.addInitScript(() => {
    window.__phaseRxPreventedWheels = 0;
    window.addEventListener('wheel', (event) => {
      window.setTimeout(() => {
        if (event.defaultPrevented) window.__phaseRxPreventedWheels += 1;
      }, 0);
    }, { capture: true, passive: true });
  });
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-scroll-choreography', 'continuous');

  for (const act of targetActs) {
    const samples = await sampleContinuousResponse(page, act);
    expect(samples.length, `${act} did not retain enough natural-scroll samples.`).toBeGreaterThanOrEqual(6);
    const pairs = samples.slice(1).map((sample, index) => ({
      before: samples[index]!,
      after: sample,
    }));
    const forward = pairs.filter(({ before, after }) => after.progress > before.progress + 0.0005);
    const visual = pairs.filter(({ before, after }) => vectorDelta(before.visual, after.visual) > 0.0005);
    expect(
      forward.length,
      `${act} ignored too much tightly spaced native wheel progress: ${JSON.stringify(samples)}`,
    ).toBeGreaterThanOrEqual(Math.ceil(pairs.length * 0.65));
    expect(
      visual.length,
      `${act} retained threshold-only visuals instead of scroll-linked interpolation.`,
    ).toBeGreaterThanOrEqual(Math.ceil(pairs.length * 0.6));

    const nextAct = ['startup', 'method', 'activity', 'evidence'][targetActs.indexOf(act)]!;
    const reached = await advanceToPhase(page, nextAct);
    expect(reached.phase).toBe(nextAct);
  }

  await page.waitForTimeout(80);
  const integrity = await page.evaluate(() => ({
    preventedWheels: window.__phaseRxPreventedWheels,
    horizontalOverflow: Math.max(
      document.body.scrollWidth - document.body.clientWidth,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    scrollSnapType: getComputedStyle(document.documentElement).scrollSnapType,
  }));
  expect(integrity.preventedWheels).toBe(0);
  expect(integrity.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(integrity.scrollSnapType).toBe('none');
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

test('METHOD responds immediately and reversibly without a pause or unlock gesture', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const runtimeFailures = captureRuntimeFailures(page);
  await page.goto('/');
  await advanceToPhase(page, 'method');

  for (let step = 0; step < 9; step += 1) await wheelStep(page, 88, 36);
  const forward = await readProgress(page);
  const reverseSamples: ProgressSample[] = [forward];
  for (let step = 0; step < 7; step += 1) reverseSamples.push(await wheelStep(page, -72, 38));
  const reversed = reverseSamples.at(-1)!;

  expect(reversed.phase).toBe('method');
  expect(reversed.progress).toBeLessThan(forward.progress - 0.02);
  expect(vectorDelta(forward.visual, reversed.visual)).toBeGreaterThan(0.02);
  expect(new Set(reverseSamples.map(({ substate }) => substate)).size).toBeGreaterThanOrEqual(1);
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

declare global {
  interface Window {
    __phaseRxPreventedWheels: number;
  }
}
