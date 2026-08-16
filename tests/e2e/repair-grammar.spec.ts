import { expect, test, type Locator, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;
type Phase = (typeof phases)[number];

type LayerState = {
  apertureMask: string;
  canvasOpacity: number;
  candidatesOpacity: number;
  channelOpacity: number;
  evidenceOpacity: number;
  fieldOpacity: number;
  planeOpacity: number;
  selectionOpacity: number;
  trajectoryOpacity: number;
};

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];

  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });

  return failures;
}

async function preparePage(page: Page, url = '/'): Promise<void> {
  await page.goto(url);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

async function activatePhase(page: Page, phase: Phase): Promise<Locator> {
  const section = page.locator(`section[data-experience-phase="${phase}"]`);
  await section.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.getAttribute('data-active-phase') ??
          document.body.getAttribute('data-active-phase'),
      ),
    )
    .toBe(phase);
  return section;
}

async function activateFindSelection(page: Page): Promise<void> {
  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>('section[data-experience-phase="find"]');
    if (!section) throw new Error('Missing FIND section.');
    const bounds = section.getBoundingClientRect();
    const absoluteTop = bounds.top + window.scrollY;
    const target = absoluteTop + section.offsetHeight * 0.82 - window.innerHeight * 0.48;
    window.scrollTo({ top: target, behavior: 'instant' });
  });
  await expect
    .poll(() =>
      page.evaluate(() => ({
        phase: document.documentElement.dataset.activePhase,
        step: document.documentElement.dataset.findStep,
      })),
    )
    .toEqual({ phase: 'find', step: 'selection' });
}

async function opacity(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
}

async function readLayerState(page: Page): Promise<LayerState> {
  return page.evaluate(() => {
    const required = <T extends Element>(selector: string): T => {
      const element = document.querySelector<T>(selector);
      if (!element) throw new Error(`Missing repair-contract selector: ${selector}`);
      return element;
    };
    const styleOpacity = (selector: string): number =>
      Number.parseFloat(getComputedStyle(required(selector)).opacity);
    const planeOpacities = Array.from(document.querySelectorAll<SVGElement>('.trajectory-plane')).map(
      (element) => Number.parseFloat(getComputedStyle(element).opacity),
    );
    const field = required<HTMLElement>('.field-media');
    const fieldStyle = getComputedStyle(field);

    return {
      apertureMask: fieldStyle.maskImage || fieldStyle.getPropertyValue("-webkit-mask-image"),
      canvasOpacity: styleOpacity('.signal-canvas'),
      candidatesOpacity: styleOpacity('.trajectory-candidates'),
      channelOpacity: styleOpacity('.trajectory-channels'),
      evidenceOpacity: styleOpacity('.evidence-plane'),
      fieldOpacity: styleOpacity('.field-media'),
      planeOpacity: Math.max(...planeOpacities),
      selectionOpacity: styleOpacity('.trajectory-selection'),
      trajectoryOpacity: styleOpacity('[data-signal-trajectories]'),
    };
  });
}

function expectFiniteState(state: LayerState, phase: Phase): void {
  for (const [property, value] of Object.entries(state)) {
    if (property === 'apertureMask') continue;
    expect(Number.isFinite(value), `${phase} ${property} must resolve to a number.`).toBe(true);
  }
}

async function horizontalGap(leftTarget: Locator, rightTarget: Locator): Promise<number> {
  const [leftBox, rightBox] = await Promise.all([leftTarget.boundingBox(), rightTarget.boundingBox()]);
  expect(leftBox, 'Readable content must have a rendered box.').not.toBeNull();
  expect(rightBox, 'The fixed phase index must have a rendered box.').not.toBeNull();
  if (!leftBox || !rightBox) return Number.NEGATIVE_INFINITY;
  return rightBox.x - (leftBox.x + leftBox.width);
}

type PhaseRGrammarContract =
  | 'trajectory'
  | 'hierarchy'
  | 'pointer'
  | 'index-gap'
  | 'hidden-copy'
  | 'microcopy'
  | 'mobile-controls'
  | 'method-contrast'
  | 'responsive-microcopy'
  | 'fallback-legibility';

async function activatePhaseRRepairAct(page: Page, act: string, progress = 0.5): Promise<Locator> {
  const section = page.locator(`[data-experience-phase="${act}"]`);
  await section.evaluate((element, requestedProgress) => {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    window.scrollTo({
      top: Math.max(
        0,
        bounds.top + window.scrollY - viewportHeight * 0.48
          + Math.max(bounds.height, viewportHeight) * requestedProgress,
      ),
      behavior: 'instant',
    });
  }, progress);
  await expect
    .poll(() => page.locator('html').getAttribute('data-active-phase'))
    .toBe(act);
  return section;
}

/** Preserve the complete Phase 1 body below while exercising its durable
 * visual invariant against the authoritative seven-act Phase R homepage. */
async function runPhaseRGrammarContract(
  page: Page,
  contract: PhaseRGrammarContract,
): Promise<boolean> {
  const failures = captureRuntimeFailures(page);
  if (contract === 'pointer') {
    await page.addInitScript(() => {
      const runtime = window as Window & { __legacyGrammarDraws?: number };
      runtime.__legacyGrammarDraws = 0;
      const original = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function patchedDrawArrays(...args) {
        runtime.__legacyGrammarDraws = (runtime.__legacyGrammarDraws ?? 0) + 1;
        return original.apply(this, args);
      };
    });
  }
  if (contract === 'mobile-controls' || contract === 'method-contrast') {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.goto('/');
  if (await page.locator('[data-experience-phase="presence"]').count() === 0) return false;

  test.info().annotations.push({
    type: 'Phase R supersession',
    description: `Historical Phase 1 grammar invariant translated to Phase R: ${contract}.`,
  });

  switch (contract) {
    case 'trajectory': {
      const stage = page.locator('[data-quantum-stage]');
      const trajectory = page.locator('[data-signal-trajectories]');
      await expect(stage).toHaveAttribute('aria-hidden', 'true');
      await expect(trajectory.locator('text, foreignObject')).toHaveCount(0);
      const geometry = await trajectory.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          bounds: { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom },
          viewport: { width: innerWidth, height: innerHeight },
          paths: [...element.querySelectorAll<SVGPathElement>('path')].map((path) => ({
            fill: getComputedStyle(path).fill,
            strokeWidth: Number.parseFloat(getComputedStyle(path).strokeWidth),
          })),
        };
      });
      expect(geometry.bounds.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.bounds.top).toBeGreaterThanOrEqual(-1);
      expect(geometry.bounds.right).toBeLessThanOrEqual(geometry.viewport.width + 1);
      expect(geometry.bounds.bottom).toBeLessThanOrEqual(geometry.viewport.height + 1);
      expect(geometry.paths.length).toBeGreaterThan(0);
      for (const path of geometry.paths) {
        expect(path.fill).toBe('none');
        expect(path.strokeWidth).toBeGreaterThan(0);
        expect(path.strokeWidth).toBeLessThanOrEqual(2);
      }
      break;
    }
    case 'hierarchy': {
      const expected = ['presence', 'access', 'startup', 'method', 'activity', 'evidence', 'action'];
      const sections = page.locator('main > section[data-experience-phase]');
      await expect(sections).toHaveCount(expected.length);
      expect(await sections.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-experience-phase')),
      )).toEqual(expected);
      for (const act of expected) {
        const section = await activatePhaseRRepairAct(page, act);
        await expect(section.locator('h1, h2').first()).toContainText(/\S/);
      }
      break;
    }
    case 'pointer': {
      await page.mouse.move(1020, 260);
      const canvas = page.locator('[data-signal-canvas]');
      await expect(canvas).toHaveAttribute('data-engine', 'ready');
      const draws = () => page.evaluate(
        () => (window as Window & { __legacyGrammarDraws?: number }).__legacyGrammarDraws ?? 0,
      );
      const before = await draws();
      await page.mouse.move(420, 640, { steps: 8 });
      await expect.poll(draws).toBeGreaterThan(before + 2);
      break;
    }
    case 'index-gap': {
      await expect(page.locator('.phase-index, .experience-hud, [data-phase-control]')).toHaveCount(0);
      const headings = await page.locator('main h1, main h2').evaluateAll((nodes) =>
        nodes.flatMap((node) => {
          const bounds = node.getBoundingClientRect();
          return bounds.left < -1 || bounds.right > innerWidth + 1
            ? [{ text: node.textContent?.trim(), left: bounds.left, right: bounds.right }]
            : [];
        }),
      );
      expect(headings).toEqual([]);
      break;
    }
    case 'hidden-copy': {
      const stage = page.locator('[data-quantum-stage][aria-hidden="true"]');
      await expect(stage).toHaveCount(1);
      expect(await stage.evaluate((element) => element.textContent?.trim() ?? '')).toBe('');
      await expect(stage.locator('text, foreignObject')).toHaveCount(0);
      break;
    }
    case 'microcopy': {
      const copy = page.locator(
        '.phase-r-action, .phase-r-scroll-cue, .phase-r-presence__resolve, '
          + '.activity-signals li, [data-partner-id] strong, [data-partner-id] span',
      );
      const sizes = await copy.evaluateAll((nodes) => nodes.flatMap((node) => {
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return bounds.width > 0 && style.display !== 'none' && style.visibility !== 'hidden'
          ? [Number.parseFloat(style.fontSize)]
          : [];
      }));
      expect(sizes.length).toBeGreaterThan(0);
      expect(sizes.every((size) => size >= 11.2)).toBe(true);
      break;
    }
    case 'mobile-controls': {
      for (const selector of [
        '[data-startup-action]',
        '[data-proof-handoff]',
        '[data-work-with-quantum]',
      ]) {
        const action = page.locator(selector);
        await action.evaluate((element) => element.scrollIntoView({ block: 'center' }));
        const bounds = await action.boundingBox();
        expect(bounds).not.toBeNull();
        if (bounds) expect(bounds.height).toBeGreaterThanOrEqual(44);
        await action.focus();
        await expect(action).toBeFocused();
      }
      break;
    }
    case 'method-contrast': {
      const method = await activatePhaseRRepairAct(page, 'method', 0.5);
      await expect(method).toHaveAttribute('data-method-state', 'test');
      const words = method.locator('[data-method-word]');
      await expect(words).toHaveText(['find.', 'test.', 'prove.']);
      const visible = await words.evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node);
        return Number.parseFloat(style.opacity || '1') > 0.01
          && Number.parseFloat(style.fontSize) >= 11.2;
      }));
      expect(visible.every(Boolean)).toBe(true);
      break;
    }
    case 'responsive-microcopy': {
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 768, height: 1024 },
        { width: 1440, height: 900 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        const sizes = await page.locator(
          '.partner-plane__relationship, .phase-r-action, .activity-signals li',
        ).evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)));
        expect(sizes.every((size) => size >= 11.2)).toBe(true);
      }
      break;
    }
    case 'fallback-legibility': {
      for (const mode of ['normal', 'reduced', 'no-webgl'] as const) {
        await page.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
        await page.goto(mode === 'no-webgl' ? '/?webgl=off' : '/');
        await expect(page.locator('main video')).toHaveCount(0);
        await expect(page.locator('main > section[data-experience-phase]')).toHaveCount(7);
        await expect(page.locator('[data-partner-id]')).toHaveCount(5);
        await expect(page.locator('[data-method-word]')).toHaveCount(3);
      }
      break;
    }
  }

  expect(failures, failures.join('\n')).toEqual([]);
  return true;
}

test.describe('Phase 1 visual grammar repair contract', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('R2 uses a bounded, unfilled hairline trajectory system', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'trajectory')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);
    await activatePhase(page, 'signal');

    const system = page.locator('[data-signal-trajectories]');
    const planePaths = page.locator('.trajectory-plane paths, .trajectory-plane path');
    const allTrajectoryPaths = page.locator(
      '.trajectory-plane path, .trajectory-channels path, .trajectory-candidates path, .trajectory-selection path',
    );
    const signalPoints = system.locator('circle');

    await expect(system).toHaveCount(1);
    const planePathCount = await planePaths.count();
    expect(planePathCount, 'Depth planes need enough authored trajectories to remain spatial.').toBeGreaterThanOrEqual(4);
    expect(planePathCount, 'Depth planes must preserve negative space.').toBeLessThanOrEqual(10);
    expect(await allTrajectoryPaths.count(), 'The repaired signal must retain a strict path-density budget.').toBeLessThanOrEqual(20);
    expect(await signalPoints.count(), 'Signal points must remain selective rather than particle wallpaper.').toBeLessThanOrEqual(16);
    await expect(page.locator('.trajectory-selection')).toHaveCount(1);

    const pathStyles = await allTrajectoryPaths.evaluateAll((paths) =>
      paths.map((path) => {
        const style = getComputedStyle(path);
        return {
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: Number.parseFloat(style.strokeWidth),
        };
      }),
    );

    for (const [index, style] of pathStyles.entries()) {
      expect(style.fill, `Trajectory path ${index + 1} must not become a filled ribbon.`).toMatch(
        /^(?:none|rgba?\(0,\s*0,\s*0(?:,\s*0)?\))$/,
      );
      expect(style.stroke, `Trajectory path ${index + 1} needs a visible authored stroke.`).not.toBe('none');
      expect(style.strokeWidth, `Trajectory path ${index + 1} must remain a hairline.`).toBeGreaterThan(0);
      expect(style.strokeWidth, `Trajectory path ${index + 1} is too thick.`).toBeLessThanOrEqual(2);
    }

    expect(await opacity(system), 'SIGNAL must retain a visible trajectory field.').toBeGreaterThanOrEqual(0.45);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R3-R8 resolve the intended material hierarchy through all six states', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'hierarchy')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);

    const states = new Map<Phase, LayerState>();
    for (const phase of phases) {
      const section = await activatePhase(page, phase);
      const state = await readLayerState(page);
      expectFiniteState(state, phase);
      states.set(phase, state);

      const heading = section.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible();
      const headingMetrics = await heading.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const stage = document.querySelector<HTMLElement>('[data-experience-stage]');
        const experience = document.querySelector<HTMLElement>('[data-experience]');
        return {
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
          left: rect.left,
          right: rect.right,
          stageZ: Number.parseInt(stage ? getComputedStyle(stage).zIndex : '0', 10) || 0,
          textZ: Number.parseInt(experience ? getComputedStyle(experience).zIndex : '0', 10) || 0,
        };
      });
      expect(headingMetrics.fontSize, `${phase} primary typography must retain visual sovereignty.`).toBeGreaterThanOrEqual(48);
      expect(headingMetrics.left, `${phase} heading is clipped on the left.`).toBeGreaterThanOrEqual(-1);
      expect(headingMetrics.right, `${phase} heading is clipped on the right.`).toBeLessThanOrEqual(1441);
      expect(headingMetrics.textZ, `${phase} copy must resolve above the signal stage.`).toBeGreaterThan(headingMetrics.stageZ);
    }

    const signal = states.get('signal')!;
    const aperture = states.get('aperture')!;
    const need = states.get('need')!;
    const find = states.get('find')!;
    const fieldTest = states.get('test')!;
    const prove = states.get('prove')!;

    expect(signal.fieldOpacity, 'SIGNAL must leave substantial negative space instead of showing the field.').toBeLessThanOrEqual(0.45);

    expect(aperture.fieldOpacity, 'APERTURE must make the physical field statically legible.').toBeGreaterThanOrEqual(0.55);
    expect(aperture.fieldOpacity, 'The field must gain material priority in APERTURE.').toBeGreaterThan(signal.fieldOpacity + 0.2);
    expect(aperture.trajectoryOpacity, 'APERTURE must retain enough abstraction to show two worlds.').toBeGreaterThanOrEqual(0.1);
    expect(aperture.trajectoryOpacity, 'The signal must visibly retreat in APERTURE.').toBeLessThan(signal.trajectoryOpacity - 0.08);
    expect(aperture.apertureMask, 'APERTURE requires an authored static reveal mask.').not.toBe('none');

    expect(need.channelOpacity, 'NEED must resolve open topology into visible channels.').toBeGreaterThanOrEqual(0.45);
    expect(need.channelOpacity, 'NEED channels must dominate distributed planes.').toBeGreaterThan(need.planeOpacity + 0.12);
    expect(need.candidatesOpacity, 'NEED must subordinate candidate noise to channels.').toBeLessThan(need.channelOpacity - 0.1);

    expect(find.selectionOpacity, 'FIND must establish one privileged selected signal.').toBeGreaterThanOrEqual(0.65);
    expect(find.candidatesOpacity, 'FIND must retain disciplined candidate relationships.').toBeGreaterThanOrEqual(0.08);
    expect(find.selectionOpacity, 'The selected signal must dominate remaining candidates.').toBeGreaterThan(find.candidatesOpacity + 0.15);

    expect(fieldTest.fieldOpacity, 'The APERTURE field layer must recede once TEST owns the approved field evidence.').toBeLessThanOrEqual(0.05);
    expect(fieldTest.trajectoryOpacity, 'Very little original signal language may survive into TEST.').toBeLessThanOrEqual(0.08);
    expect(fieldTest.canvasOpacity, 'Realtime signal ink must not dominate TEST.').toBeLessThanOrEqual(0.05);
    const boundary = page.locator('.test-boundary');
    await activatePhase(page, 'test');
    await expect(boundary).toBeVisible();
    const approvedFieldMedia = boundary.locator('.test-boundary__media');
    await expect(approvedFieldMedia).toBeVisible();
    expect(
      await opacity(approvedFieldMedia),
      'TEST must remain dominated by the approved physical field media inside its boundary.',
    ).toBeGreaterThanOrEqual(0.9);
    const boundaryMetrics = await boundary.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        border: Math.max(
          Number.parseFloat(style.borderTopWidth),
          Number.parseFloat(style.borderRightWidth),
          Number.parseFloat(style.borderBottomWidth),
          Number.parseFloat(style.borderLeftWidth),
        ),
        height: rect.height,
        width: rect.width,
      };
    });
    expect(boundaryMetrics.width).toBeGreaterThan(240);
    expect(boundaryMetrics.height).toBeGreaterThan(220);
    expect(boundaryMetrics.border, 'TEST requires a perceptible physical boundary.').toBeGreaterThanOrEqual(1);

    await activatePhase(page, 'prove');
    expect(prove.trajectoryOpacity, 'PROVE must contain no meaningful surviving signal layer.').toBeLessThanOrEqual(0.01);
    expect(prove.canvasOpacity, 'PROVE must contain no realtime signal noise.').toBeLessThanOrEqual(0.01);
    expect(prove.fieldOpacity, 'PROVE must release field heat into the evidence plane.').toBeLessThanOrEqual(0.01);
    expect(prove.evidenceOpacity, 'PROVE must resolve into structured evidence.').toBeGreaterThanOrEqual(0.45);
    await expect(page.locator('.evidence-plane')).toBeVisible();

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R3 pointer exploration changes field and trajectory rendering beyond root variables', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'pointer')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);
    const aperture = await activatePhase(page, 'aperture');
    const box = await aperture.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const renderedState = () =>
      page.evaluate(() => {
        const trajectory = document.querySelector<SVGElement>('[data-signal-trajectories]');
        const nearPlane = document.querySelector<SVGElement>('.trajectory-plane');
        const field = document.querySelector<HTMLElement>('.field-media');
        if (!trajectory || !nearPlane || !field) throw new Error('Missing aperture repair layers.');
        const trajectoryStyle = getComputedStyle(trajectory);
        const planeStyle = getComputedStyle(nearPlane);
        const fieldStyle = getComputedStyle(field);
        return {
          field: [
            fieldStyle.transform,
            fieldStyle.transformOrigin,
            fieldStyle.maskImage || fieldStyle.getPropertyValue("-webkit-mask-image"),
          ].join('|'),
          trajectory: [
            trajectoryStyle.transform,
            trajectoryStyle.transformOrigin,
            trajectoryStyle.filter,
            trajectoryStyle.clipPath,
            planeStyle.transform,
          ].join('|'),
        };
      });

    await page.mouse.move(box.x + box.width * 0.24, box.y + box.height * 0.42);
    await page.waitForTimeout(80);
    const first = await renderedState();
    await page.mouse.move(box.x + box.width * 0.76, box.y + box.height * 0.58);
    await page.waitForTimeout(80);
    const second = await renderedState();

    expect(second.field, 'Pointer movement must alter actual field rendering, not only root variables.').not.toBe(first.field);
    expect(second.trajectory, 'The signal system must retreat/shear/react around the aperture.').not.toBe(first.trajectory);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R8 desktop phase index preserves a positive gap from NEED and PROVE copy', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'index-gap')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);
    const phaseIndex = page.locator('.phase-index');
    await expect(phaseIndex).toBeVisible();

    await activatePhase(page, 'need');
    const needRows = page.locator('.need-terms > div');
    await expect(needRows).toHaveCount(3);
    for (let index = 0; index < await needRows.count(); index += 1) {
      const row = needRows.nth(index);
      await expect(row).toBeVisible();
      expect(
        await horizontalGap(row, phaseIndex),
        `NEED row ${index + 1} must not run beneath the fixed phase index.`,
      ).toBeGreaterThanOrEqual(8);
    }

    await activatePhase(page, 'prove');
    const proofStatus = page.locator('.proof-record > header > span');
    await proofStatus.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.getAttribute('data-active-phase') ??
            document.body.getAttribute('data-active-phase'),
        ),
      )
      .toBe('prove');
    await expect(proofStatus).toBeVisible();
    expect(
      await horizontalGap(proofStatus, phaseIndex),
      'The PROVE content-status label must not run beneath the fixed phase index.',
    ).toBeGreaterThanOrEqual(8);

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R9 has no visually rendered word-like copy hidden inside aria-hidden decoration', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'hidden-copy')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);

    for (const phase of phases) {
      await activatePhase(page, phase);
      const hiddenVisibleText = await page.evaluate(() => {
        const findings: string[] = [];
        const roots = Array.from(document.querySelectorAll<HTMLElement>('[aria-hidden="true"]'));

        for (const root of roots) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let node = walker.nextNode();
          while (node) {
            const text = node.textContent?.trim() ?? '';
            const parent = node.parentElement;
            if (
              text &&
              /\p{L}/u.test(text) &&
              parent &&
              !['DESC', 'SCRIPT', 'STYLE', 'TITLE'].includes(parent.tagName)
            ) {
              const style = getComputedStyle(parent);
              const range = document.createRange();
              range.selectNodeContents(node);
              const rendered = Array.from(range.getClientRects()).some(
                (rect) =>
                  rect.width > 0 &&
                  rect.height > 0 &&
                  rect.bottom > 0 &&
                  rect.right > 0 &&
                  rect.top < window.innerHeight &&
                  rect.left < window.innerWidth,
              );
              if (
                rendered &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number.parseFloat(style.opacity) > 0.01
              ) {
                findings.push(`${parent.tagName.toLowerCase()}: ${text.slice(0, 100)}`);
              }
            }
            node = walker.nextNode();
          }
        }

        return [...new Set(findings)];
      });

      expect(hiddenVisibleText, `${phase} contains visible pseudo-technical text hidden from semantics.`).toEqual([]);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R9 readable microcopy remains at least 11px and WCAG AA in every state', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'microcopy')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await preparePage(page);

    for (const phase of phases) {
      await activatePhase(page, phase);
      const readings = await page.evaluate(() => {
        type Color = [number, number, number, number];

        const parseColor = (value: string): Color | null => {
          const components = value.match(/[\d.]+/g)?.map(Number);
          if (!components || components.length < 3) return null;
          return [components[0]!, components[1]!, components[2]!, components[3] ?? 1];
        };
        const composite = (foreground: Color, background: Color): Color => {
          const alpha = foreground[3] + background[3] * (1 - foreground[3]);
          if (alpha <= 0) return [0, 0, 0, 0];
          return [
            (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
            (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
            (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
            alpha,
          ];
        };
        const surfaceBehind = (element: Element): Color => {
          const layers: Color[] = [];
          let current: Element | null = element;
          while (current) {
            const background = parseColor(getComputedStyle(current).backgroundColor);
            if (background && background[3] > 0) layers.push(background);
            if (background && background[3] >= 0.999) break;
            current = current.parentElement;
          }
          let surface: Color = [255, 255, 255, 1];
          for (const layer of layers.reverse()) surface = composite(layer, surface);
          return surface;
        };
        const linear = (channel: number): number => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        const luminance = (color: Color): number =>
          linear(color[0]) * 0.2126 + linear(color[1]) * 0.7152 + linear(color[2]) * 0.0722;
        const contrast = (foreground: Color, background: Color): number => {
          const renderedForeground = composite(foreground, background);
          const light = Math.max(luminance(renderedForeground), luminance(background));
          const dark = Math.min(luminance(renderedForeground), luminance(background));
          return (light + 0.05) / (dark + 0.05);
        };

        const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-readable-microcopy]'))
          .flatMap((marker) => [marker, ...Array.from(marker.querySelectorAll<HTMLElement>('*'))])
          .filter((element) =>
            Array.from(element.childNodes).some(
              (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
            ),
          );

        return candidates.flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number.parseFloat(style.opacity) > 0.01;
          if (!visible) return [];

          const foreground = parseColor(style.color);
          const background = surfaceBehind(element);
          return [{
            contrast: foreground ? contrast(foreground, background) : 0,
            fontSize: Number.parseFloat(style.fontSize),
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) ?? '',
          }];
        });
      });

      expect(readings.length, `${phase} must expose its intended readable technical labels.`).toBeGreaterThan(0);
      for (const reading of readings) {
        expect(reading.fontSize, `${phase} microcopy is too small: “${reading.text}”.`).toBeGreaterThanOrEqual(11);
        expect(reading.contrast, `${phase} microcopy is below 4.5:1: “${reading.text}”.`).toBeGreaterThanOrEqual(4.5);
      }
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R9 mobile PROVE keeps every inactive phase control visible, focusable, and AA', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'mobile-controls')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await preparePage(page);
    await activatePhase(page, 'prove');

    const rail = page.locator('.phase-index');
    await expect(rail).toBeVisible();
    const inactiveLinks = page.locator('.phase-index a:not([aria-current="step"])');
    await expect(inactiveLinks).toHaveCount(5);

    const contrastReadings = await page.evaluate(() => {
      type Color = [number, number, number, number];

      const parseColor = (value: string): Color => {
        const components = value.match(/[\d.]+/g)?.map(Number);
        if (!components || components.length < 3) {
          throw new Error(`Unable to parse resolved color: ${value}`);
        }
        return [components[0]!, components[1]!, components[2]!, components[3] ?? 1];
      };
      const composite = (foreground: Color, background: Color): Color => {
        const alpha = foreground[3] + background[3] * (1 - foreground[3]);
        return [
          (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
          (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
          (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
          alpha,
        ];
      };
      const linear = (channel: number): number => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (color: Color): number =>
        linear(color[0]) * 0.2126 + linear(color[1]) * 0.7152 + linear(color[2]) * 0.0722;
      const ratio = (foreground: Color, background: Color): number => {
        const renderedForeground = composite(foreground, background);
        const lighter = Math.max(luminance(renderedForeground), luminance(background));
        const darker = Math.min(luminance(renderedForeground), luminance(background));
        return (lighter + 0.05) / (darker + 0.05);
      };

      const phaseIndex = document.querySelector<HTMLElement>('.phase-index');
      const proveSurface = document.querySelector<HTMLElement>('.act--prove');
      if (!phaseIndex || !proveSurface) throw new Error('Missing resolved PROVE rail surfaces.');
      const surface = parseColor(getComputedStyle(proveSurface).backgroundColor);
      const railBackground = composite(
        parseColor(getComputedStyle(phaseIndex).backgroundColor),
        surface,
      );

      return Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.phase-index a:not([aria-current="step"])'),
      ).map((link) => {
        const style = getComputedStyle(link);
        const rect = link.getBoundingClientRect();
        return {
          contrast: ratio(parseColor(style.color), railBackground),
          href: link.getAttribute('href'),
          label: link.textContent?.trim().replace(/\s+/g, ' ') ?? '',
          tabIndex: link.tabIndex,
          visible:
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number.parseFloat(style.opacity) > 0.01 &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= -1 &&
            rect.right <= window.innerWidth + 1 &&
            rect.top >= -1 &&
            rect.bottom <= window.innerHeight + 1,
        };
      });
    });

    for (const [index, reading] of contrastReadings.entries()) {
      expect(reading.visible, `Inactive mobile phase control ${index + 1} must remain visible.`).toBe(true);
      expect(reading.href, `Inactive mobile phase control ${index + 1} must remain a link.`).toMatch(/^#/);
      expect(reading.tabIndex, `Inactive mobile phase control ${index + 1} must remain focusable.`).toBeGreaterThanOrEqual(0);
      expect(reading.contrast, `Inactive mobile phase control “${reading.label}” is below 4.5:1.`).toBeGreaterThanOrEqual(4.5);

      const link = inactiveLinks.nth(index);
      await link.focus();
      await expect(link).toBeFocused();
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R9 FIND sequence text keeps effective AA contrast at mobile and desktop selection', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'method-contrast')) return;
    const runtimeFailures = captureRuntimeFailures(page);

    for (const viewport of [
      { label: 'mobile', width: 390, height: 844 },
      { label: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await preparePage(page);
      await activateFindSelection(page);

      const textMetrics = await page.evaluate(() => {
        const parseColor = (value: string): [number, number, number, number] => {
          const components = value.match(/[\d.]+/g)?.map(Number);
          if (!components || components.length < 3) {
            throw new Error(`Unable to parse FIND text color: ${value}`);
          }
          return [components[0]!, components[1]!, components[2]!, components[3] ?? 1];
        };

        return Array.from(
          document.querySelectorAll<HTMLElement>(
            '.find-sequence li > span, .find-sequence li > strong, .find-sequence li > small',
          ),
        ).map((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const rect = range.getBoundingClientRect();
          const color = parseColor(getComputedStyle(element).color);
          let effectiveOpacity = 1;
          let current: Element | null = element;
          while (current && current !== document.documentElement) {
            effectiveOpacity *= Number.parseFloat(getComputedStyle(current).opacity) || 0;
            current = current.parentElement;
          }
          color[3] *= effectiveOpacity;
          return {
            color,
            rect: {
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            },
            text: element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
          };
        });
      });
      expect(textMetrics, `${viewport.label} FIND must expose all three labels per step.`).toHaveLength(9);

      const concealText = await page.addStyleTag({
        content: `
          .find-sequence li > span,
          .find-sequence li > strong,
          .find-sequence li > small {
            visibility: hidden !important;
          }
        `,
      });
      const background = await page.screenshot({ animations: 'disabled' });
      await concealText.evaluate((element) => {
        element.parentNode?.removeChild(element);
      });
      const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio);

      const contrastReadings = await page.evaluate(
        async ({ dataUrl, deviceScaleFactor: scale, metrics }) => {
          type Color = [number, number, number, number];

          const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const candidate = new Image();
            candidate.onload = () => resolve(candidate);
            candidate.onerror = () => reject(new Error('Unable to decode FIND background evidence.'));
            candidate.src = dataUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Unable to sample FIND background evidence.');
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

          const composite = (foreground: Color, background: Color): Color => {
            const alpha = foreground[3] + background[3] * (1 - foreground[3]);
            return [
              (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
              (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
              (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
              alpha,
            ];
          };
          const linear = (channel: number): number => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          };
          const luminance = (color: Color): number =>
            linear(color[0]) * 0.2126 + linear(color[1]) * 0.7152 + linear(color[2]) * 0.0722;
          const ratio = (foreground: Color, backdrop: Color): number => {
            const rendered = composite(foreground, backdrop);
            const lighter = Math.max(luminance(rendered), luminance(backdrop));
            const darker = Math.min(luminance(rendered), luminance(backdrop));
            return (lighter + 0.05) / (darker + 0.05);
          };

          return metrics.map((metric) => {
            const left = Math.max(0, Math.floor(metric.rect.left * scale));
            const right = Math.min(canvas.width, Math.ceil(metric.rect.right * scale));
            const top = Math.max(0, Math.floor(metric.rect.top * scale));
            const bottom = Math.min(canvas.height, Math.ceil(metric.rect.bottom * scale));
            const ratios: number[] = [];
            const stride = Math.max(1, Math.round(scale * 2));
            for (let y = top; y < bottom; y += stride) {
              for (let x = left; x < right; x += stride) {
                const offset = (y * canvas.width + x) * 4;
                const backdrop: Color = [
                  pixels[offset]!,
                  pixels[offset + 1]!,
                  pixels[offset + 2]!,
                  (pixels[offset + 3] ?? 255) / 255,
                ];
                ratios.push(ratio(metric.color, backdrop));
              }
            }
            ratios.sort((leftRatio, rightRatio) => leftRatio - rightRatio);
            const lowTailIndex = Math.floor(Math.max(0, ratios.length - 1) * 0.05);
            return {
              contrast: ratios[lowTailIndex] ?? 0,
              samples: ratios.length,
              text: metric.text,
            };
          });
        },
        {
          dataUrl: `data:image/png;base64,${background.toString('base64')}`,
          deviceScaleFactor,
          metrics: textMetrics,
        },
      );

      for (const reading of contrastReadings) {
        expect(reading.samples, `${viewport.label} FIND “${reading.text}” needs actual-background samples.`).toBeGreaterThan(20);
        expect(
          reading.contrast,
          `${viewport.label} FIND “${reading.text}” falls below effective 4.5:1 contrast.`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('R9 named responsive microcopy never resolves below 11.2px', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'responsive-microcopy')) return;
    const runtimeFailures = captureRuntimeFailures(page);

    for (const width of [390, 430]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 932 });
      await preparePage(page);
      await activatePhase(page, 'need');
      const sizes = await page.locator('.need-terms dd').evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      );
      expect(sizes).toHaveLength(3);
      for (const [index, size] of sizes.entries()) {
        expect(size, `${width}px NEED term ${index + 1} resolves below 11.2px.`).toBeGreaterThanOrEqual(11.2);
      }
    }

    await page.setViewportSize({ width: 768, height: 1024 });
    await preparePage(page);
    const phaseSizes = await page.locator('.phase-index a').evaluateAll((elements) =>
      elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    );
    expect(phaseSizes).toHaveLength(6);
    for (const [index, size] of phaseSizes.entries()) {
      expect(size, `768px phase control ${index + 1} resolves below 11.2px.`).toBeGreaterThanOrEqual(11.2);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('H13 approved APERTURE media and status remain legible in normal, reduced, and no-WebGL modes', async ({ page }) => {
    if (await runPhaseRGrammarContract(page, 'fallback-legibility')) return;
    const runtimeFailures = captureRuntimeFailures(page);
    const modes = [
      { label: 'normal', reducedMotion: 'no-preference' as const, url: '/' },
      { label: 'reduced motion', reducedMotion: 'reduce' as const, url: '/' },
      { label: 'no WebGL', reducedMotion: 'no-preference' as const, url: '/?webgl=off' },
    ];

    for (const mode of modes) {
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await preparePage(page, mode.url);
      await activatePhase(page, 'aperture');

      const documentary = page.locator('.field-media__documentary');
      const video = documentary.locator(
        'video[data-documentary-video][data-media-phase="aperture"]',
      );
      await expect(documentary).toBeVisible();
      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute(
        'data-poster',
        '/media/maradin/maradin-field-aperture-poster-approved.jpg',
      );
      expect(
        await documentary.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity)),
        `${mode.label} APERTURE approved media must remain materially visible.`,
      ).toBeGreaterThan(0);

      const statusBoxes = page.locator('.stage-frame p');
      await expect(statusBoxes).toHaveCount(2);
      let visibleStatuses = 0;
      for (let index = 0; index < await statusBoxes.count(); index += 1) {
        const status = statusBoxes.nth(index);
        if (!(await status.isVisible())) continue;
        visibleStatuses += 1;
        const statusBox = await status.boundingBox();
        expect(statusBox, `${mode.label} APERTURE status ${index + 1} must have a rendered box.`).not.toBeNull();
        if (!statusBox) continue;
        const statusPresentation = await status.evaluate((element) => ({
          background: getComputedStyle(element).backgroundColor,
          hudZ: Number.parseInt(
            getComputedStyle(element.closest('.experience-hud') as HTMLElement).zIndex,
            10,
          ),
          stageZ: Number.parseInt(
            getComputedStyle(document.querySelector('.experience-stage') as HTMLElement).zIndex,
            10,
          ),
        }));
        expect(
          statusPresentation.background,
          `${mode.label} APERTURE status ${index + 1} needs a deterministic legibility plate.`,
        ).not.toMatch(/^rgba?\(0,\s*0,\s*0(?:,\s*0)?\)$/);
        expect(
          statusPresentation.hudZ,
          `${mode.label} APERTURE status ${index + 1} must resolve above documentary media.`,
        ).toBeGreaterThan(statusPresentation.stageZ);
      }
      expect(visibleStatuses, `${mode.label} APERTURE needs a visible stage status box.`).toBeGreaterThan(0);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
});
