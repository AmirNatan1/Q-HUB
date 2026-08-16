import { expect, test, type Locator, type Page } from '@playwright/test';

const partnerFocusSamples = [
  { id: 'vdl-group', progress: 0.31 },
  { id: 'hyundai-motor-group', progress: 0.44 },
  { id: 'bazan-group', progress: 0.57 },
  { id: 'taavura-livnat-group', progress: 0.69 },
  { id: 'talcar', progress: 0.84 },
] as const;

const methodSamples = [
  { state: 'find', progress: 0.16 },
  { state: 'test', progress: 0.5 },
  { state: 'prove', progress: 0.84 },
] as const;

const activityProgressSamples = [0.16, 0.37, 0.62, 0.84] as const;

type ExperiencePhase = 'access' | 'activity' | 'method' | 'startup';

interface InstrumentGeometry {
  coordinates: number[];
  styles: string[];
}

interface Rect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

interface ActivitySignalGeometry {
  effectiveOpacity: number;
  id: string;
  text: string;
  textRects: Rect[];
  visible: boolean;
}

async function settleRendering(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
  );
}

async function disableDecorativeTransitions(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      .phase-r-homepage *,
      .phase-r-homepage *::before,
      .phase-r-homepage *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

async function setActProgress(
  page: Page,
  phase: ExperiencePhase,
  progress: number,
): Promise<Locator> {
  const section = page.locator(`[data-experience-phase="${phase}"]`);
  await expect(section).toHaveCount(1);
  await section.evaluate((element, requestedProgress) => {
    const bounds = element.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const marker = viewportHeight * 0.48;
    const sectionTop = bounds.top + window.scrollY;
    const denominator = Math.max(bounds.height, viewportHeight);
    window.scrollTo({
      behavior: 'instant',
      top: Math.max(0, sectionTop - marker + denominator * requestedProgress),
    });
  }, progress);

  await expect
    .poll(() => page.locator('html').getAttribute('data-active-phase'))
    .toBe(phase);
  await expect
    .poll(async () => {
      const local = await section.evaluate((element) =>
        Number.parseFloat(element.style.getPropertyValue('--local-progress')),
      );
      return Math.abs(local - progress);
    })
    .toBeLessThan(0.035);
  await settleRendering(page);
  return section;
}

function rectIntersectionArea(first: Rect, second: Rect): number {
  const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
  const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
  return width * height;
}

async function readActivitySignals(page: Page): Promise<{
  container: Rect;
  containerClipsX: boolean;
  containerClipsY: boolean;
  headingRects: Rect[];
  headerBottom: number;
  signals: ActivitySignalGeometry[];
}> {
  return page.locator('[data-experience-phase="activity"]').evaluate((section) => {
    const toRect = (rect: DOMRect): Rect => ({
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    });
    const textRects = (element: Element): Rect[] => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()]
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map(toRect);
    };
    const effectiveOpacity = (element: HTMLElement): number => {
      let opacity = 1;
      let current: HTMLElement | null = element;
      while (current) {
        const style = getComputedStyle(current);
        opacity *= Number.parseFloat(style.opacity || '1');
        if (current === section) break;
        current = current.parentElement;
      }
      return opacity;
    };
    const list = section.querySelector<HTMLElement>('.activity-signals');
    const heading = section.querySelector<HTMLElement>('h2');
    if (!list || !heading) throw new Error('The Activity act requires its heading and signal field.');

    const listStyle = getComputedStyle(list);
    const signals = [...section.querySelectorAll<HTMLElement>('[data-activity-signal]')]
      .map((element, index) => {
        const style = getComputedStyle(element);
        const opacity = effectiveOpacity(element);
        const rects = textRects(element);
        const intersectsViewport = rects.some(
          (rect) => rect.bottom > 0
            && rect.top < window.innerHeight
            && rect.right > 0
            && rect.left < window.innerWidth,
        );
        return {
          effectiveOpacity: opacity,
          id: element.dataset.activitySignal || `signal-${index + 1}`,
          text: element.textContent?.trim() ?? '',
          textRects: rects,
          visible: style.display !== 'none'
            && style.visibility !== 'hidden'
            && opacity >= 0.5
            && intersectsViewport,
        };
      });

    return {
      container: toRect(list.getBoundingClientRect()),
      containerClipsX: listStyle.overflowX !== 'visible',
      containerClipsY: listStyle.overflowY !== 'visible',
      headingRects: textRects(heading),
      headerBottom: document.querySelector<HTMLElement>('body > header')
        ?.getBoundingClientRect().bottom ?? 0,
      signals,
    };
  });
}

test('desktop Partner Field consumes partner focus as one borderless screen-scale identity', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);

  for (const sample of partnerFocusSamples) {
    const access = await setActProgress(page, 'access', sample.progress);
    await expect(page.locator('html')).toHaveAttribute('data-partner-focus', sample.id);

    const identities = await access.locator('[data-partner-id]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        const opacity = Number.parseFloat(style.opacity || '1');
        const visiblyPresent = style.display !== 'none'
          && style.visibility !== 'hidden'
          && opacity >= 0.75
          && bounds.bottom > 0
          && bounds.top < window.innerHeight
          && bounds.right > 0
          && bounds.left < window.innerWidth;
        return {
          borderWidths: [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ].map((width) => Number.parseFloat(width)),
          height: bounds.height,
          id: element.dataset.partnerId ?? '',
          screenScale: visiblyPresent
            && bounds.width >= window.innerWidth * 0.55
            && bounds.height >= window.innerHeight * 0.42,
          width: bounds.width,
        };
      }),
    );

    const focused = identities.filter((identity) => identity.screenScale);
    expect(
      focused.map(({ id }) => id),
      `${sample.id} must be the sole visibly focused screen-scale identity: ${JSON.stringify(identities)}`,
    ).toEqual([sample.id]);
    for (const identity of identities) {
      expect(
        Math.max(...identity.borderWidths),
        `${identity.id} must read as an identity territory, not a bordered card.`,
      ).toBeLessThanOrEqual(0.1);
    }
  }
});

test('mobile Partner Field is a sequence of large non-overlapping identity territories', async ({
  page,
}) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto('/');
  await disableDecorativeTransitions(page);
  await page.locator('[data-experience-phase="access"]').scrollIntoViewIfNeeded();
  await settleRendering(page);

  const geometry = await page.locator('[data-partner-id]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const element = node as HTMLElement;
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        display: style.display,
        height: bounds.height,
        id: element.dataset.partnerId ?? '',
        left: bounds.left,
        opacity: Number.parseFloat(style.opacity || '1'),
        position: style.position,
        right: bounds.right,
        top: bounds.top,
        visibility: style.visibility,
        width: bounds.width,
      };
    }),
  );

  expect(geometry).toHaveLength(5);
  for (const [index, identity] of geometry.entries()) {
    expect(['relative', 'static']).toContain(identity.position);
    expect(identity.display).not.toBe('none');
    expect(identity.visibility).not.toBe('hidden');
    expect(identity.opacity).toBeGreaterThanOrEqual(0.75);
    expect(identity.left, `${identity.id} escapes the mobile viewport.`).toBeGreaterThanOrEqual(-1);
    expect(identity.right, `${identity.id} escapes the mobile viewport.`).toBeLessThanOrEqual(
      viewport.width + 1,
    );
    expect(identity.width, `${identity.id} must retain full-width authority on mobile.`).toBeGreaterThanOrEqual(
      viewport.width * 0.82,
    );
    expect(identity.height, `${identity.id} is too small to read as an identity territory.`).toBeGreaterThanOrEqual(
      viewport.height * 0.38,
    );
    if (index > 0) {
      expect(
        identity.top,
        `${identity.id} overlaps the preceding mobile identity territory.`,
      ).toBeGreaterThanOrEqual(geometry[index - 1]!.bottom - 1);
    }
  }

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('FIND TEST and PROVE resolve to materially distinct instrument geometries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);

  const geometries = new Map<string, InstrumentGeometry>();
  for (const sample of methodSamples) {
    const method = await setActProgress(page, 'method', sample.progress);
    await expect(method).toHaveAttribute('data-method-state', sample.state);
    const geometry = await method.locator('.method-instrument').evaluate((instrument) => {
      const element = instrument as HTMLElement;
      const parentBounds = element.getBoundingClientRect();
      const styleProperties = [
        'display',
        'width',
        'height',
        'inset',
        'top',
        'right',
        'bottom',
        'left',
        'borderTopWidth',
        'borderRightWidth',
        'borderBottomWidth',
        'borderLeftWidth',
        'borderRadius',
        'clipPath',
        'transform',
        'transformOrigin',
        'opacity',
        'gridTemplateColumns',
        'gridTemplateRows',
      ] as const;
      const stylesFor = (target: Element, pseudo?: string): string[] => {
        const style = getComputedStyle(target, pseudo);
        return styleProperties.map((property) => style[property]);
      };
      const coordinates = [parentBounds.width, parentBounds.height];
      const styles = [
        ...stylesFor(element),
        ...stylesFor(element, '::before'),
        ...stylesFor(element, '::after'),
      ];
      for (const child of [...element.children]) {
        const bounds = child.getBoundingClientRect();
        coordinates.push(
          bounds.left - parentBounds.left,
          bounds.top - parentBounds.top,
          bounds.width,
          bounds.height,
        );
        styles.push(...stylesFor(child));
      }
      return {
        coordinates: coordinates.map((value) => Math.round(value * 10) / 10),
        styles,
      };
    });
    geometries.set(sample.state, geometry);
  }

  expect(new Set([...geometries.values()].map((geometry) => JSON.stringify(geometry))).size).toBe(3);
  for (const [first, second] of [
    ['find', 'test'],
    ['test', 'prove'],
    ['find', 'prove'],
  ] as const) {
    const firstGeometry = geometries.get(first);
    const secondGeometry = geometries.get(second);
    expect(firstGeometry).toBeDefined();
    expect(secondGeometry).toBeDefined();
    if (!firstGeometry || !secondGeometry) continue;

    const styleChanges = firstGeometry.styles.reduce(
      (total, value, index) => total + Number(value !== secondGeometry.styles[index]),
      0,
    );
    const coordinateChanges = firstGeometry.coordinates.reduce(
      (total, value, index) =>
        total + Number(Math.abs(value - (secondGeometry.coordinates[index] ?? value)) >= 4),
      0,
    );
    const coordinateDelta = firstGeometry.coordinates.reduce(
      (total, value, index) =>
        total + Math.abs(value - (secondGeometry.coordinates[index] ?? value)),
      0,
    );

    expect(
      styleChanges + coordinateChanges,
      `${first.toUpperCase()} and ${second.toUpperCase()} change only color, not geometry.`,
    ).toBeGreaterThanOrEqual(4);
    expect(
      styleChanges >= 6 || (coordinateChanges >= 2 && coordinateDelta >= 40),
      `${first.toUpperCase()} and ${second.toUpperCase()} need a materially different authored shape.`,
    ).toBe(true);
  }
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const) {
  test(`${viewport.name} Activity exposes one uncropped signal at a time without headline overlap`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await disableDecorativeTransitions(page);
    await expect(page.locator('[data-activity-signal]')).toHaveCount(4);

    const exposedSignals: string[] = [];
    for (const progress of activityProgressSamples) {
      await setActProgress(page, 'activity', progress);
      await expect
        .poll(async () => (await readActivitySignals(page)).signals.filter(({ visible }) => visible).length)
        .toBe(1);
      const activity = await readActivitySignals(page);
      const visibleSignals = activity.signals.filter(({ visible }) => visible);
      const signal = visibleSignals[0];
      expect(signal).toBeDefined();
      if (!signal) continue;

      expect(activity.headingRects.length).toBeGreaterThan(0);
      for (const rect of activity.headingRects) {
        expect(rect.left, 'QUANTUM IN MOTION is cropped at the left edge.').toBeGreaterThanOrEqual(-1);
        expect(rect.right, 'QUANTUM IN MOTION is cropped at the right edge.').toBeLessThanOrEqual(
          viewport.width + 1,
        );
        expect(rect.top, 'QUANTUM IN MOTION is clipped beneath the site header.').toBeGreaterThanOrEqual(
          activity.headerBottom - 1,
        );
        expect(rect.bottom, 'QUANTUM IN MOTION is cropped below the viewport.').toBeLessThanOrEqual(
          viewport.height + 1,
        );
      }

      exposedSignals.push(signal.id);
      expect(signal.effectiveOpacity).toBeGreaterThanOrEqual(0.75);
      expect(signal.text).toMatch(/\S/);
      expect(signal.textRects.length).toBeGreaterThan(0);

      for (const rect of signal.textRects) {
        expect(rect.left, `${signal.text} is cropped at the left edge.`).toBeGreaterThanOrEqual(-1);
        expect(rect.right, `${signal.text} is cropped at the right edge.`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
        expect(rect.top, `${signal.text} is clipped beneath the site header.`).toBeGreaterThanOrEqual(
          activity.headerBottom - 1,
        );
        expect(rect.bottom, `${signal.text} is cropped below the viewport.`).toBeLessThanOrEqual(
          viewport.height + 1,
        );
        if (activity.containerClipsX) {
          expect(rect.left).toBeGreaterThanOrEqual(activity.container.left - 1);
          expect(rect.right).toBeLessThanOrEqual(activity.container.right + 1);
        }
        if (activity.containerClipsY) {
          expect(rect.top).toBeGreaterThanOrEqual(activity.container.top - 1);
          expect(rect.bottom).toBeLessThanOrEqual(activity.container.bottom + 1);
        }
        for (const headingRect of activity.headingRects) {
          expect(
            rectIntersectionArea(rect, headingRect),
            `${signal.text} overlaps the QUANTUM IN MOTION headline.`,
          ).toBeLessThanOrEqual(1);
        }
      }

      for (const inactive of activity.signals.filter(({ id }) => id !== signal.id)) {
        expect(
          inactive.effectiveOpacity <= 0.08 || inactive.textRects.every(
            (rect) => rect.bottom <= 0
              || rect.top >= viewport.height
              || rect.right <= 0
              || rect.left >= viewport.width,
          ),
          `${inactive.text} remains visibly exposed behind ${signal.text}.`,
        ).toBe(true);
      }
    }

    expect(
      new Set(exposedSignals).size,
      `The deterministic Activity journey must reveal all four signals: ${JSON.stringify(exposedSignals)}`,
    ).toBe(4);
  });
}

test('reduced motion exposes all four Activity signals as a readable document flow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'reduced-motion');
    const activity = page.locator('[data-experience-phase="activity"]');
    await activity.scrollIntoViewIfNeeded();

    const signals = await activity.locator('[data-activity-signal]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return {
          bottom: bounds.bottom,
          display: style.display,
          left: bounds.left,
          opacity: Number.parseFloat(style.opacity || '1'),
          position: style.position,
          right: bounds.right,
          text: element.textContent?.trim() ?? '',
          top: bounds.top,
          transform: style.transform,
          visibility: style.visibility,
          width: bounds.width,
        };
      }),
    );

    expect(signals).toHaveLength(4);
    for (const [index, signal] of signals.entries()) {
      expect(signal.text).toMatch(/\S/);
      expect(signal.display).not.toBe('none');
      expect(signal.visibility).not.toBe('hidden');
      expect(signal.opacity).toBeGreaterThanOrEqual(0.85);
      expect(['relative', 'static']).toContain(signal.position);
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(signal.transform);
      expect(signal.width).toBeGreaterThan(0);
      expect(signal.left).toBeGreaterThanOrEqual(-1);
      expect(signal.right).toBeLessThanOrEqual(viewport.width + 1);
      if (index > 0) {
        expect(
          signal.top,
          `${signal.text} overlaps the preceding reduced-motion signal.`,
        ).toBeGreaterThanOrEqual(signals[index - 1]!.bottom - 1);
      }
    }
  }
});

test('Field Crossing deforms the signal through stateful material without repeating grids', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);

  const snapshots = new Map<string, {
    material: {
      backgroundColor: string;
      backgroundImage: string;
      clipPath: string;
      filter: string;
      maskImage: string;
      opacity: number;
      transform: string;
    };
    signal: {
      borderRadius: string;
      clipPath: string;
      height: number;
      linearTransform: number[];
      width: number;
    };
  }>();

  for (const sample of [
    { progress: 0.16, state: 'outside' },
    { progress: 0.48, state: 'threshold' },
    { progress: 0.84, state: 'field' },
  ] as const) {
    const startup = await setActProgress(page, 'startup', sample.progress);
    await expect(startup).toHaveAttribute('data-crossing-state', sample.state);
    const snapshot = await startup.locator('[data-field-crossing]').evaluate((crossing) => {
      const signal = crossing.querySelector<HTMLElement>('.field-crossing__signal');
      const field = crossing.querySelector<HTMLElement>('.field-crossing__field');
      if (!signal || !field) throw new Error('Field Crossing requires signal and material elements.');
      const signalStyle = getComputedStyle(signal);
      const fieldStyle = getComputedStyle(field);
      const bounds = signal.getBoundingClientRect();
      const matrix = signalStyle.transform === 'none'
        ? new DOMMatrixReadOnly()
        : new DOMMatrixReadOnly(signalStyle.transform);
      return {
        material: {
          backgroundColor: fieldStyle.backgroundColor,
          backgroundImage: fieldStyle.backgroundImage,
          clipPath: fieldStyle.clipPath,
          filter: fieldStyle.filter,
          maskImage: fieldStyle.maskImage,
          opacity: Number.parseFloat(fieldStyle.opacity || '1'),
          transform: fieldStyle.transform,
        },
        signal: {
          borderRadius: signalStyle.borderRadius,
          clipPath: signalStyle.clipPath,
          height: Math.round(bounds.height * 10) / 10,
          linearTransform: [matrix.a, matrix.b, matrix.c, matrix.d]
            .map((value) => Math.round(value * 1000) / 1000),
          width: Math.round(bounds.width * 10) / 10,
        },
        repeatedBackgrounds: [...crossing.querySelectorAll<HTMLElement>('*')].flatMap((element) => {
          const backgrounds = [
            getComputedStyle(element).backgroundImage,
            getComputedStyle(element, '::before').backgroundImage,
            getComputedStyle(element, '::after').backgroundImage,
          ];
          return backgrounds.filter((background) => /repeating-(?:linear|radial)-gradient/i.test(background));
        }),
      };
    });

    expect(snapshot.repeatedBackgrounds, `${sample.state} reintroduces a generic repeating grid.`).toEqual([]);
    snapshots.set(sample.state, snapshot);
  }

  const shapeSignatures = [...snapshots.values()].map(({ signal }) => JSON.stringify(signal));
  expect(new Set(shapeSignatures).size, 'The signal remains the same dot through the crossing.').toBe(3);
  for (const [first, second] of [
    ['outside', 'threshold'],
    ['threshold', 'field'],
    ['outside', 'field'],
  ] as const) {
    const firstSignal = snapshots.get(first)?.signal;
    const secondSignal = snapshots.get(second)?.signal;
    expect(firstSignal).toBeDefined();
    expect(secondSignal).toBeDefined();
    if (!firstSignal || !secondSignal) continue;
    const proportionalDelta = Math.abs(Math.log(firstSignal.width / secondSignal.width))
      + Math.abs(Math.log(firstSignal.height / secondSignal.height));
    const transformDelta = firstSignal.linearTransform.reduce(
      (total, value, index) => total + Math.abs(value - (secondSignal.linearTransform[index] ?? value)),
      0,
    );
    const shapeTokenChanges = Number(firstSignal.borderRadius !== secondSignal.borderRadius)
      + Number(firstSignal.clipPath !== secondSignal.clipPath);
    expect(
      proportionalDelta + transformDelta + shapeTokenChanges,
      `${first} → ${second} moves the signal but does not materially deform it.`,
    ).toBeGreaterThan(0.15);
  }

  const materialSignatures = [...snapshots.values()].map(({ material }) => JSON.stringify(material));
  expect(
    new Set(materialSignatures).size,
    'The material region must resolve differently at outside, threshold, and field.',
  ).toBe(3);
  const resolvedMaterial = snapshots.get('field')?.material;
  expect(resolvedMaterial).toBeDefined();
  if (resolvedMaterial) {
    expect(resolvedMaterial.opacity).toBeGreaterThanOrEqual(0.35);
    expect(
      resolvedMaterial.backgroundImage !== 'none'
        || !/rgba?\(0(?:,\s*0){2}(?:,\s*0)?\)/.test(resolvedMaterial.backgroundColor),
      'The resolved field requires a visible authored material region.',
    ).toBe(true);
  }
});

test('repaired PROVE resolves TEST observations into a spatial registration plane without completion UI', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);
  const method = await setActProgress(page, 'method', 0.84);
  await expect(method).toHaveAttribute('data-method-state', 'prove');

  const repair = await method.locator('.method-instrument').evaluate((instrument) => {
    const element = instrument as HTMLElement;
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    const observations = [...element.querySelectorAll<HTMLElement>('.method-instrument__observation')]
      .map((observation) => {
        const bounds = observation.getBoundingClientRect();
        return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      });
    return {
      afterBorders: [after.borderRightWidth, after.borderBottomWidth],
      beforeClip: before.clipPath,
      observations,
      registrationOpacity: Number.parseFloat(
        getComputedStyle(element.querySelector<HTMLElement>('.method-instrument__registration')!).opacity,
      ),
    };
  });

  expect(repair.beforeClip).not.toBe('none');
  expect(repair.afterBorders).toEqual(['0px', '0px']);
  expect(repair.observations).toHaveLength(3);
  expect(Math.max(...repair.observations.map(({ x }) => x)) - Math.min(...repair.observations.map(({ x }) => x)))
    .toBeLessThanOrEqual(2);
  expect(new Set(repair.observations.map(({ y }) => Math.round(y))).size).toBe(3);
  expect(repair.registrationOpacity).toBeGreaterThanOrEqual(0.65);
});

test('repaired ACTIVITY gives every approved signal a unique spatial condition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);

  const signatures = new Set<string>();
  for (const progress of activityProgressSamples) {
    const activity = await setActProgress(page, 'activity', progress);
    const state = await activity.getAttribute('data-activity-state');
    expect(state).toBeTruthy();
    const geometries = await activity.locator('[data-activity-geometry]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const element = node as HTMLElement;
        const style = getComputedStyle(element);
        const children = [...element.children].map((child) => {
          const bounds = child.getBoundingClientRect();
          const childStyle = getComputedStyle(child);
          return [
            Math.round(bounds.left),
            Math.round(bounds.top),
            Math.round(bounds.width),
            Math.round(bounds.height),
            childStyle.borderRadius,
            childStyle.clipPath,
          ];
        });
        return {
          active: style.visibility !== 'hidden' && Number.parseFloat(style.opacity) >= 0.9,
          id: element.dataset.activityGeometry,
          signature: JSON.stringify(children),
        };
      }),
    );
    const active = geometries.filter(({ active }) => active);
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe(state);
    signatures.add(active[0]?.signature ?? '');
  }
  expect(signatures.size).toBe(4);
});

test('repaired Field Crossing makes round compression and rectilinear exit unmistakable', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900, vertical: false },
    { width: 390, height: 844, vertical: true },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await disableDecorativeTransitions(page);
    const shapes: Record<string, { height: number; radius: string; width: number }> = {};
    for (const sample of [
      { progress: 0.16, state: 'outside' },
      { progress: 0.48, state: 'threshold' },
      { progress: 0.84, state: 'field' },
    ] as const) {
      const startup = await setActProgress(page, 'startup', sample.progress);
      await expect(startup).toHaveAttribute('data-crossing-state', sample.state);
      shapes[sample.state] = await startup.locator('.field-crossing__signal').evaluate((signal) => {
        const bounds = signal.getBoundingClientRect();
        return { height: bounds.height, radius: getComputedStyle(signal).borderRadius, width: bounds.width };
      });
    }
    const outside = shapes.outside!;
    const threshold = shapes.threshold!;
    const field = shapes.field!;
    expect(outside.width).toBeGreaterThanOrEqual(viewport.vertical ? 100 : 120);
    expect(Math.abs(outside.width / outside.height - 1)).toBeLessThan(0.06);
    if (viewport.vertical) {
      expect(threshold.height / threshold.width).toBeGreaterThan(5);
      expect(field.height / field.width).toBeGreaterThan(6);
    } else {
      expect(threshold.width / threshold.height).toBeGreaterThan(5);
      expect(field.width / field.height).toBeGreaterThan(8);
    }
    expect(field.radius).toBe('0px');
  }
});

test('repaired Partner Field identities own the desktop viewport instead of a contained panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await disableDecorativeTransitions(page);

  for (const sample of partnerFocusSamples) {
    await setActProgress(page, 'access', sample.progress);
    await expect(page.locator('html')).toHaveAttribute('data-partner-focus', sample.id);
    const territory = await page.locator(`[data-partner-id="${sample.id}"]`).evaluate((plane) => {
      const bounds = plane.getBoundingClientRect();
      const style = getComputedStyle(plane);
      return {
        borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
        height: bounds.height,
        surface: `${style.backgroundColor}|${style.backgroundImage}`,
        width: bounds.width,
      };
    });
    expect(territory.width).toBeGreaterThanOrEqual(1438);
    expect(territory.height).toBeGreaterThanOrEqual(880);
    expect(territory.borders).toEqual(['0px', '0px', '0px', '0px']);
    expect(territory.surface).not.toBe('rgba(0, 0, 0, 0)|none');
  }
});
