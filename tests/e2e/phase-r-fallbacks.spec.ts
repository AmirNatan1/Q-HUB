import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const acts = [
  'presence',
  'access',
  'startup',
  'method',
  'activity',
  'evidence',
  'action',
] as const;

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
  });
  return failures;
}

async function assertSemanticJourney(page: Page): Promise<void> {
  const sections = page.locator('main[data-experience] > section[data-experience-phase]');
  await expect(sections).toHaveCount(acts.length);
  expect(
    await sections.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-experience-phase')),
    ),
  ).toEqual([...acts]);
  await expect(page.locator('main h1')).toHaveCount(1);
  for (const act of acts) {
    const section = page.locator(`[data-experience-phase="${act}"]`);
    await expect(section.locator('h1, h2').first()).toContainText(/\S/);
  }
  await expect(page.locator('[data-partner-id]')).toHaveCount(5);
  await expect(page.locator('[data-method-word]')).toHaveText(['find.', 'test.', 'prove.'], {
    ignoreCase: true,
  });
  await expect(page.locator('[data-proof-handoff]')).toHaveAttribute('href', '/proof/');
  await expect(page.locator('[data-work-with-quantum]')).toHaveAttribute(
    'href',
    'mailto:info@quantum-hub.com',
  );
}

async function visuallySuppressedMeaning(page: Page): Promise<string[]> {
  return page
    .locator(
      'main h1, main h2, .phase-r-presence__resolve, [data-partner-id] strong, '
        + '[data-method-word], [data-proof-handoff], [data-work-with-quantum]',
    )
    .evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        let current: Element | null = node;
        while (current && current.matches('main, main *')) {
          const style = getComputedStyle(current);
          if (
            style.display === 'none'
            || style.visibility === 'hidden'
            || Number.parseFloat(style.opacity || '1') <= 0.01
          ) {
            return [(node.textContent ?? node.tagName).trim()];
          }
          current = current.parentElement;
        }
        return [];
      }),
    );
}

async function close(context: BrowserContext): Promise<void> {
  await context.close();
}

async function assertNoHorizontalOverflow(page: Page, viewportWidth: number): Promise<void> {
  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    partners: [...document.querySelectorAll<HTMLElement>('[data-partner-id]')].map((partner) => {
      const bounds = partner.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right };
    }),
    offenders: [...document.body.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${
            element.classList.length ? `.${[...element.classList].join('.')}` : ''
          }`,
          left: Math.round(bounds.left * 10) / 10,
          right: Math.round(bounds.right * 10) / 10,
        };
      })
      .filter(({ left, right }) => left < -1 || right > document.documentElement.clientWidth + 1)
      .slice(0, 12),
  }));
  expect(
    geometry.documentWidth,
    `Horizontal overflow offenders: ${JSON.stringify(geometry.offenders)}`,
  ).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.viewportWidth).toBe(viewportWidth);
  for (const partner of geometry.partners) {
    expect(partner.left).toBeGreaterThanOrEqual(-1);
    expect(partner.right).toBeLessThanOrEqual(viewportWidth + 1);
  }
}

test('JavaScript-disabled HTML keeps every essential meaning and destination exposed', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const runtimeFailures = captureRuntimeFailures(page);
  try {
    await page.goto('/');
    await assertSemanticJourney(page);
    await expect(page.locator('html')).toHaveAttribute('data-active-phase', 'presence');
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'static');
    await expect(page.locator('[data-signal-canvas][data-engine]')).toHaveCount(0);
    expect(
      await visuallySuppressedMeaning(page),
      'Static-first fallback must not hide essential text behind enhancement-only opacity.',
    ).toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  } finally {
    await close(context);
  }
});

test('?webgl=off preserves the complete enhanced journey without a canvas engine', async ({ page }) => {
  const runtimeFailures = captureRuntimeFailures(page);
  await page.goto('/?webgl=off');
  await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'no-webgl-fallback');
  await assertSemanticJourney(page);

  for (const act of acts) {
    const section = page.locator(`[data-experience-phase="${act}"]`);
    await section.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await expect.poll(() => page.locator('html').getAttribute('data-active-phase')).toBe(act);
  }

  await expect(page.locator('[data-signal-canvas][data-engine]')).toHaveCount(0);
  await expect(page.locator('[data-signal-canvas]')).toHaveCSS('display', 'none');
  expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
});

test('reduced motion resolves all meaning and never initializes WebGL or long-running motion', async ({
  browser,
  baseURL,
}) => {
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
    await expect
      .poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
      .toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'reduced-motion');
    await assertSemanticJourney(page);
    await expect(page.locator('[data-signal-canvas][data-engine]')).toHaveCount(0);
    await expect(page.locator('[data-signal-canvas]')).toHaveCSS('display', 'none');

    const partnerOpacity = await page.locator('[data-partner-id]').evaluateAll((nodes) =>
      nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity)),
    );
    expect(
      partnerOpacity.every((opacity) => opacity > 0.01),
      'Reduced motion must resolve every partner identity rather than await choreography.',
    ).toBe(true);

    const lightTerritoryNameColors = await page
      .locator(
        '[data-partner-id="bazan-group"] strong, [data-partner-id="taavura-livnat-group"] strong, [data-partner-id="talcar"] strong',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.closest<HTMLElement>('[data-partner-id]')?.dataset.partnerId,
          color: getComputedStyle(node).color,
        })),
      );
    expect(
      lightTerritoryNameColors,
      'Reduced motion must keep partner names dark against the three pale identity territories.',
    ).toEqual([
      { id: 'bazan-group', color: 'rgb(17, 16, 20)' },
      { id: 'taavura-livnat-group', color: 'rgb(24, 60, 52)' },
      { id: 'talcar', color: 'rgb(17, 16, 20)' },
    ]);

    await page.waitForTimeout(120);
    const longRunningAnimations = await page.locator('main').evaluate((main) =>
      main.getAnimations({ subtree: true }).flatMap((animation) => {
        const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
        return animation.playState === 'running' && duration > 100
          ? [`${animation.constructor.name}:${duration}`]
          : [];
      }),
    );
    expect(longRunningAnimations).toEqual([]);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  } finally {
    await close(context);
  }
});

test('mobile touch mode uses a sequential Partner Field and never starts desktop WebGL', async ({
  browser,
  baseURL,
}) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({
    ...(baseURL ? { baseURL } : {}),
    viewport,
    hasTouch: true,
    isMobile: true,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  const runtimeFailures = captureRuntimeFailures(page);
  try {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-input-mode', 'touch-scroll');
    await assertSemanticJourney(page);
    await expect(page.locator('[data-signal-canvas][data-engine]')).toHaveCount(0);
    await expect(page.locator('[data-signal-canvas]')).toHaveCSS('display', 'none');

    const partners = await page.locator('[data-partner-id]').evaluateAll((nodes) =>
      nodes.map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          position: getComputedStyle(node).position,
          opacity: Number.parseFloat(getComputedStyle(node).opacity),
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
          bottom: bounds.bottom,
          width: bounds.width,
        };
      }),
    );
    for (const [index, partner] of partners.entries()) {
      expect(partner.position, `Mobile partner ${index + 1} must participate in document flow.`).toBe(
        'relative',
      );
      expect(partner.opacity).toBeGreaterThan(0.01);
      expect(partner.left).toBeGreaterThanOrEqual(-1);
      expect(partner.right).toBeLessThanOrEqual(viewport.width + 1);
      expect(partner.width).toBeGreaterThan(viewport.width * 0.72);
      if (index > 0) expect(partner.top).toBeGreaterThanOrEqual(partners[index - 1]!.bottom - 1);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  } finally {
    await close(context);
  }
});

test('static and reduced Partner Field bands never overflow desktop or mobile', async ({
  browser,
  baseURL,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const mode of ['static', 'reduced'] as const) {
      const context = await browser.newContext({
        ...(baseURL ? { baseURL } : {}),
        viewport,
        colorScheme: 'dark',
        ...(mode === 'static'
          ? { javaScriptEnabled: false }
          : { reducedMotion: 'reduce' as const }),
      });
      const page = await context.newPage();
      try {
        await page.goto('/');
        await assertNoHorizontalOverflow(page, viewport.width);
      } finally {
        await close(context);
      }
    }
  }
});
