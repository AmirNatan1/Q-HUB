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

async function preparePage(page: Page): Promise<void> {
  await page.goto('/');
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

test.describe('Phase 1 visual grammar repair contract', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('R2 uses a bounded, unfilled hairline trajectory system', async ({ page }) => {
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

    expect(fieldTest.fieldOpacity, 'TEST must be dominated by the physical field.').toBeGreaterThanOrEqual(0.9);
    expect(fieldTest.trajectoryOpacity, 'Very little original signal language may survive into TEST.').toBeLessThanOrEqual(0.08);
    expect(fieldTest.canvasOpacity, 'Realtime signal ink must not dominate TEST.').toBeLessThanOrEqual(0.05);
    const boundary = page.locator('.test-boundary');
    await activatePhase(page, 'test');
    await expect(boundary).toBeVisible();
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

  test('R9 has no visually rendered word-like copy hidden inside aria-hidden decoration', async ({ page }) => {
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
});
