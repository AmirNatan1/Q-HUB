import { expect, test, type Locator, type Page } from '@playwright/test';

const phases = ['signal', 'aperture', 'need', 'find', 'test', 'prove'] as const;
type Phase = (typeof phases)[number];

const apertureVideoPath = '/media/maradin/maradin-field-aperture-approved.mp4';
const aperturePosterPath = '/media/maradin/maradin-field-aperture-poster-approved.jpg';
const testVideoPath = '/media/maradin/maradin-test-contact-approved.mp4';
const testPosterPath = '/media/maradin/maradin-prove-field-frame-approved.jpg';

function captureRuntimeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console.error: ${message.text()}`);
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

async function activatePhase(page: Page, phase: Phase): Promise<Locator> {
  const section = page.locator(`section[data-experience-phase="${phase}"]`);
  await section.evaluate((element) => {
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await expect.poll(() => activePhase(page)).toBe(phase);
  return section;
}

async function posterPath(video: Locator): Promise<string> {
  return video.evaluate((element) => {
    const candidate = element as HTMLVideoElement;
    return candidate.poster ? new URL(candidate.poster, window.location.href).pathname : '';
  });
}

async function measureSubjectVisibility(
  image: Locator,
  region: { xMin: number; yMin: number; xMax: number; yMax: number },
) {
  return image.evaluate((element, subjectRegion) => {
    if (!(element instanceof HTMLImageElement)) throw new Error('Expected PROVE evidence image.');
    const rect = element.getBoundingClientRect();
    const figure = element.closest('figure');
    const caption = figure?.querySelector('figcaption');
    if (!(caption instanceof HTMLElement)) throw new Error('Expected PROVE evidence caption.');
    const captionRect = caption.getBoundingClientRect();
    const style = getComputedStyle(element);
    const coordinates = style.objectPosition.match(/-?[\d.]+%/g)?.map(Number.parseFloat) ?? [];
    const positionX = coordinates[0] ?? 50;
    const positionY = coordinates[1] ?? 50;
    const scale = Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight);
    const renderedWidth = element.naturalWidth * scale;
    const renderedHeight = element.naturalHeight * scale;
    const offsetX = (rect.width - renderedWidth) * positionX / 100;
    const offsetY = (rect.height - renderedHeight) * positionY / 100;
    const crop = {
      xMin: Math.max(0, -offsetX / scale),
      yMin: Math.max(0, -offsetY / scale),
      xMax: Math.min(element.naturalWidth, (rect.width - offsetX) / scale),
      yMax: Math.min(element.naturalHeight, (rect.height - offsetY) / scale),
    };
    const visible = {
      xMin: Math.max(subjectRegion.xMin, crop.xMin),
      yMin: Math.max(subjectRegion.yMin, crop.yMin),
      xMax: Math.min(subjectRegion.xMax, crop.xMax),
      yMax: Math.min(subjectRegion.yMax, crop.yMax),
    };
    const visibleWidth = Math.max(0, visible.xMax - visible.xMin);
    const visibleHeight = Math.max(0, visible.yMax - visible.yMin);
    const regionArea =
      (subjectRegion.xMax - subjectRegion.xMin) * (subjectRegion.yMax - subjectRegion.yMin);
    const projected = {
      left: rect.left + offsetX + visible.xMin * scale,
      top: rect.top + offsetY + visible.yMin * scale,
      right: rect.left + offsetX + visible.xMax * scale,
      bottom: rect.top + offsetY + visible.yMax * scale,
    };
    const projectedWidth = Math.max(0, projected.right - projected.left);
    const projectedHeight = Math.max(0, projected.bottom - projected.top);
    const captionOverlapWidth = Math.max(
      0,
      Math.min(projected.right, captionRect.right) - Math.max(projected.left, captionRect.left),
    );
    const captionOverlapHeight = Math.max(
      0,
      Math.min(projected.bottom, captionRect.bottom) - Math.max(projected.top, captionRect.top),
    );
    return {
      captionOverlapRatio:
        projectedWidth * projectedHeight > 0
          ? (captionOverlapWidth * captionOverlapHeight) / (projectedWidth * projectedHeight)
          : 1,
      naturalHeight: element.naturalHeight,
      naturalWidth: element.naturalWidth,
      projectedHeight,
      projectedWidth,
      visibleSourceRatio: regionArea > 0 ? (visibleWidth * visibleHeight) / regionArea : 0,
    };
  }, region);
}

async function expectNativeDocumentaryVideo(
  video: Locator,
  sourcePath: string,
  poster: string,
): Promise<void> {
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('data-documentary-video', '');
  await expect(video).toHaveAttribute('data-poster', poster);
  await expect(video).toHaveAttribute('muted', '');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('preload', 'none');
  expect(await video.getAttribute('controls')).toBeNull();
  await expect(video.locator('source')).toHaveAttribute('data-src', sourcePath);

  const properties = await video.evaluate((element) => {
    const candidate = element as HTMLVideoElement;
    return {
      autoplay: candidate.autoplay,
      controls: candidate.controls,
      muted: candidate.muted,
      playsInline: candidate.playsInline,
    };
  });
  expect(properties).toEqual({
    autoplay: false,
    controls: false,
    muted: true,
    playsInline: true,
  });
}

type TextSample = {
  color: [number, number, number, number];
  rect: { bottom: number; left: number; right: number; top: number };
  text: string;
};

async function expectActualPlateContrast(
  page: Page,
  selector: '.phase-copy--plate' | '.test-boundary__content',
  context: string,
): Promise<void> {
  const plate = page.locator(selector);
  await expect(plate).toBeVisible();
  await plate.scrollIntoViewIfNeeded();

  const plateState = await plate.evaluate((element) => {
    const background = getComputedStyle(element).backgroundColor;
    const components = background.match(/[\d.]+/g)?.map(Number) ?? [];
    return {
      alpha: components[3] ?? (components.length >= 3 ? 1 : 0),
      background,
    };
  });
  expect(
    plateState.alpha,
    `${context} must use a deterministic local plate over documentary media (${plateState.background}).`,
  ).toBeGreaterThanOrEqual(0.85);

  const samples = await plate.evaluate((root): TextSample[] => {
    const parsed: TextSample[] = [];
    const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

    for (const element of elements) {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const components = style.color.match(/[\d.]+/g)?.map(Number);
      if (!components || components.length < 3) continue;

      let effectiveOpacity = Number.parseFloat(style.opacity) || 0;
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.documentElement) {
        effectiveOpacity *= Number.parseFloat(getComputedStyle(ancestor).opacity) || 0;
        ancestor = ancestor.parentElement;
      }
      const color: [number, number, number, number] = [
        components[0]!,
        components[1]!,
        components[2]!,
        (components[3] ?? 1) * effectiveOpacity,
      ];

      for (const node of Array.from(element.childNodes)) {
        const text = node.nodeType === Node.TEXT_NODE ? node.textContent?.trim() ?? '' : '';
        if (!text) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.bottom <= 0 ||
            rect.right <= 0 ||
            rect.top >= window.innerHeight ||
            rect.left >= window.innerWidth
          ) {
            continue;
          }
          parsed.push({
            color,
            rect: {
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              top: rect.top,
            },
            text: text.replace(/\s+/g, ' ').slice(0, 100),
          });
        }
      }
    }

    return parsed;
  });
  expect(samples.length, `${context} needs visible text samples over its local plate.`).toBeGreaterThan(0);

  const concealText = await page.addStyleTag({
    content: `${selector}, ${selector} * { color: transparent !important; text-shadow: none !important; }`,
  });
  const background = await page.screenshot({ animations: 'disabled' });
  await concealText.evaluate((element) => element.parentNode?.removeChild(element));
  const deviceScaleFactor = await page.evaluate(() => window.devicePixelRatio);

  const readings = await page.evaluate(
    async ({ dataUrl, deviceScaleFactor: scale, samples: textSamples }) => {
      type Color = [number, number, number, number];
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const candidate = new Image();
        candidate.onload = () => resolve(candidate);
        candidate.onerror = () => reject(new Error('Unable to decode media contrast evidence.'));
        candidate.src = dataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context2d = canvas.getContext('2d', { willReadFrequently: true });
      if (!context2d) throw new Error('Unable to sample media contrast evidence.');
      context2d.drawImage(image, 0, 0);
      const pixels = context2d.getImageData(0, 0, canvas.width, canvas.height).data;

      const composite = (foreground: Color, backdrop: Color): Color => {
        const alpha = foreground[3] + backdrop[3] * (1 - foreground[3]);
        return [
          (foreground[0] * foreground[3] + backdrop[0] * backdrop[3] * (1 - foreground[3])) / alpha,
          (foreground[1] * foreground[3] + backdrop[1] * backdrop[3] * (1 - foreground[3])) / alpha,
          (foreground[2] * foreground[3] + backdrop[2] * backdrop[3] * (1 - foreground[3])) / alpha,
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

      return textSamples.map((sample) => {
        const left = Math.max(0, Math.floor(sample.rect.left * scale));
        const right = Math.min(canvas.width, Math.ceil(sample.rect.right * scale));
        const top = Math.max(0, Math.floor(sample.rect.top * scale));
        const bottom = Math.min(canvas.height, Math.ceil(sample.rect.bottom * scale));
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
            ratios.push(ratio(sample.color, backdrop));
          }
        }
        ratios.sort((leftRatio, rightRatio) => leftRatio - rightRatio);
        return {
          contrast: ratios[Math.floor(Math.max(0, ratios.length - 1) * 0.05)] ?? 0,
          samples: ratios.length,
          text: sample.text,
        };
      });
    },
    {
      dataUrl: `data:image/png;base64,${background.toString('base64')}`,
      deviceScaleFactor,
      samples,
    },
  );

  for (const reading of readings) {
    expect(reading.samples, `${context} “${reading.text}” needs actual-background samples.`).toBeGreaterThan(20);
    expect(
      reading.contrast,
      `${context} “${reading.text}” falls below effective 4.5:1 contrast over real media.`,
    ).toBeGreaterThanOrEqual(4.5);
  }
}

test.describe('Phase 2 approved field-media contract', () => {
  test('keeps all six phases ordered and reachable while SIGNAL stays Quantum-led', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const sections = page.locator('section[data-experience-phase]');
    await expect(sections).toHaveCount(phases.length);
    await expect
      .poll(() =>
        sections.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-experience-phase')),
        ),
      )
      .toEqual([...phases]);

    const signal = page.locator('section[data-experience-phase="signal"]');
    await expect(signal.locator('h1')).toHaveCount(1);
    await expect(signal).not.toContainText(/Maradin/i);

    for (const phase of phases) {
      const section = await activatePhase(page, phase);
      await expect(section.locator('h1, h2, h3').first()).toBeVisible();
      await expect(section).toContainText(/\S/);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('public presentation uses editorial labels instead of publication workflow language', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    const routes = [
      '/',
      '/proof/',
      '/industry/',
      '/startups/',
      '/programs/',
      '/programs/spark/',
      '/programs/champ/',
      '/network/',
      '/about/',
      '/contact/',
    ];
    const rejectedVisibleLanguage = /\b(?:approved|approval|classification|publicApproved|publication)\b/i;
    const rejectedNamedPhrases = /approved\s+field\s+record|approved\s+need|approved\s+public\s+record/i;

    for (const route of routes) {
      await page.goto(route);
      const visibleText = await page.locator('main').innerText();
      expect(visibleText, `${route} must not expose publication workflow terminology.`).not.toMatch(
        rejectedVisibleLanguage,
      );
      expect(await page.content(), `${route} retains a rejected workflow phrase.`).not.toMatch(
        rejectedNamedPhrases,
      );
    }

    await page.goto('/');
    const homepage = page.locator('main');
    await expect(homepage).toContainText('Field record / SPARK');
    await expect(homepage).toContainText('Field condition');
    await expect(homepage).toContainText('Proof / field record');
    await expect(homepage).toContainText('Field evidence / documentary stills');
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('APERTURE owns the approved lazy native video and does not request MP4 on first paint', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    const mp4Requests: string[] = [];
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.endsWith('.mp4')) mp4Requests.push(pathname);
    });

    await page.goto('/');
    await expect.poll(() => activePhase(page)).toBe('signal');
    await page.waitForTimeout(400);

    const apertureSection = page.locator('section[data-experience-phase="aperture"]');
    await expect(apertureSection).toHaveAttribute(
      'data-approved-media',
      'maradin-field-aperture',
    );
    const video = page.locator(
      '.field-media video[data-documentary-video][data-media-phase="aperture"]',
    );
    await expectNativeDocumentaryVideo(video, apertureVideoPath, aperturePosterPath);
    expect(
      await video.locator('source').getAttribute('src'),
      'The documentary MP4 source must remain unattached before the APERTURE threshold.',
    ).toBeNull();
    expect(
      mp4Requests,
      'No documentary MP4 may be requested while the visitor remains at initial SIGNAL.',
    ).toEqual([]);

    await activatePhase(page, 'aperture');
    await expect(video).toBeVisible();
    await expect(video.locator('source')).toHaveAttribute('src', apertureVideoPath);
    await expect.poll(() => posterPath(video)).toBe(aperturePosterPath);

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('TEST keeps its approved documentary video inside the accepted physical boundary', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');
    await activatePhase(page, 'test');

    const boundary = page.locator('.test-boundary[data-approved-media="maradin-test-contact"]');
    await expect(boundary).toBeVisible();
    const testVideo = boundary.locator(
      '> video[data-documentary-video][data-media-phase="test"]',
    );
    await expectNativeDocumentaryVideo(testVideo, testVideoPath, testPosterPath);
    await expect(testVideo).toBeVisible();
    await expect(testVideo.locator('source')).toHaveAttribute('src', testVideoPath);
    await expect.poll(() => posterPath(testVideo)).toBe(testPosterPath);

    const apertureVideo = page.locator(
      '.field-media video[data-documentary-video][data-media-phase="aperture"]',
    );
    await expectNativeDocumentaryVideo(
      apertureVideo,
      apertureVideoPath,
      aperturePosterPath,
    );

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('TEST leaves at least half of the documentary frame unobstructed on desktop and mobile', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    for (const viewport of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await activatePhase(page, 'test');

      const boundary = page.locator('.test-boundary');
      const metadata = boundary.locator('[data-test-metadata]');
      const facts = metadata.locator('[data-test-facts] > div');
      await expect(metadata).toContainText('Field test / Maradin × Hyundai CRADLE');
      await expect(facts).toHaveCount(4);
      await expect(facts.last()).toContainText('More than 60 real-world scenarios');

      const geometry = await boundary.evaluate((element) => {
        const frame = element.querySelector<HTMLVideoElement>('.test-boundary__media');
        const plate = element.querySelector<HTMLElement>('[data-test-metadata]');
        if (!frame || !plate) throw new Error('Missing TEST media or metadata surface.');
        const frameRect = frame.getBoundingClientRect();
        const plateRect = plate.getBoundingClientRect();
        const intersectionWidth = Math.max(
          0,
          Math.min(frameRect.right, plateRect.right) - Math.max(frameRect.left, plateRect.left),
        );
        const intersectionHeight = Math.max(
          0,
          Math.min(frameRect.bottom, plateRect.bottom) - Math.max(frameRect.top, plateRect.top),
        );
        return {
          opaqueCoverage:
            (intersectionWidth * intersectionHeight) / (frameRect.width * frameRect.height),
          openRegionHeight: (plateRect.top - frameRect.top) / frameRect.height,
          plateHeight: plateRect.height,
          videoHeight: frameRect.height,
        };
      });

      expect(
        geometry.opaqueCoverage,
        `${viewport.label} TEST opaque metadata may cover no more than half of the film.`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        geometry.openRegionHeight,
        `${viewport.label} TEST needs a materially meaningful uninterrupted film region.`,
      ).toBeGreaterThanOrEqual(0.45);
      expect(geometry.plateHeight).toBeLessThan(geometry.videoHeight);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('reduced motion never plays or loops documentary footage and renders approved posters', async ({ browser, baseURL }) => {
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
      await page.evaluate(() => {
        const state = window as Window & { __phase2PlayEvents?: number };
        state.__phase2PlayEvents = 0;
        document.querySelectorAll<HTMLVideoElement>('[data-documentary-video]').forEach((video) => {
          video.addEventListener('play', () => {
            state.__phase2PlayEvents = (state.__phase2PlayEvents ?? 0) + 1;
          });
        });
      });

      const apertureVideo = page.locator(
        '.field-media video[data-documentary-video][data-media-phase="aperture"]',
      );
      await activatePhase(page, 'aperture');
      await expect(apertureVideo).toBeVisible();
      await expect.poll(() => posterPath(apertureVideo)).toBe(aperturePosterPath);
      expect(
        await page.locator('.field-media__documentary').evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
        'Reduced-motion APERTURE must retain a visible, resolved documentary plane.',
      ).toBeGreaterThan(0);

      const testVideo = page.locator(
        '.test-boundary video[data-documentary-video][data-media-phase="test"]',
      );
      await activatePhase(page, 'test');
      await expect(testVideo).toBeVisible();
      await expect.poll(() => posterPath(testVideo)).toBe(testPosterPath);

      const mediaState = await page
        .locator('[data-documentary-video]')
        .evaluateAll((videos) =>
          videos.map((element) => {
            const video = element as HTMLVideoElement;
            return {
              autoplay: video.autoplay,
              currentSrc: video.currentSrc,
              loop: video.loop,
              paused: video.paused,
              source: video.querySelector('source')?.getAttribute('src') ?? null,
            };
          }),
        );
      expect(mediaState).toHaveLength(2);
      for (const [index, state] of mediaState.entries()) {
        expect(state.autoplay, `Reduced-motion video ${index + 1} must not autoplay.`).toBe(false);
        expect(state.loop, `Reduced-motion video ${index + 1} must not loop.`).toBe(false);
        expect(state.paused, `Reduced-motion video ${index + 1} must remain paused.`).toBe(true);
        expect(state.source, `Reduced-motion video ${index + 1} must not attach an MP4 source.`).toBeNull();
        expect(state.currentSrc, `Reduced-motion video ${index + 1} must remain poster-only.`).toBe('');
      }
      expect(
        await page.evaluate(
          () => (window as Window & { __phase2PlayEvents?: number }).__phase2PlayEvents,
        ),
      ).toBe(0);
      await expect(page.locator('html')).toHaveAttribute('data-media-mode', 'static-posters');
      expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('no-WebGL fallback reaches every phase with approved APERTURE media intact', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/?webgl=off');
    await expect(page.locator('html')).toHaveAttribute('data-render-mode', 'no-webgl-fallback');

    const apertureVideo = page.locator(
      '.field-media video[data-documentary-video][data-media-phase="aperture"]',
    );
    for (const phase of phases) {
      await activatePhase(page, phase);
      if (phase === 'aperture') {
        await expect(apertureVideo).toBeVisible();
        await expect(apertureVideo.locator('source')).toHaveAttribute('src', apertureVideoPath);
        await expect.poll(() => posterPath(apertureVideo)).toBe(aperturePosterPath);
      }
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('APERTURE excludes the baked subtitle band across required viewports and no-WebGL', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    const profiles = [
      { label: 'desktop-wide', width: 1920, height: 1080, query: '' },
      { label: 'desktop', width: 1440, height: 900, query: '' },
      { label: 'tablet', width: 768, height: 1024, query: '' },
      { label: 'mobile-wide', width: 430, height: 932, query: '' },
      { label: 'mobile', width: 390, height: 844, query: '' },
      { label: 'desktop-no-webgl', width: 1440, height: 900, query: '?webgl=off' },
      { label: 'mobile-no-webgl', width: 430, height: 932, query: '?webgl=off' },
    ];

    for (const profile of profiles) {
      await page.setViewportSize({ width: profile.width, height: profile.height });
      await page.goto(`/${profile.query}`);
      await activatePhase(page, 'aperture');
      const video = page.locator(
        '.field-media__documentary video[data-documentary-video][data-media-phase="aperture"]',
      );
      await expect(video.locator('source')).toHaveAttribute('src', apertureVideoPath);
      await page.waitForFunction(() => {
        const candidate = document.querySelector<HTMLVideoElement>(
          'video[data-documentary-video][data-media-phase="aperture"]',
        );
        return Boolean(candidate && candidate.readyState >= HTMLMediaElement.HAVE_METADATA);
      });

      const crop = await video.evaluate((element) => {
        if (!(element instanceof HTMLVideoElement)) throw new Error('Expected APERTURE video.');
        const frameElement = element.parentElement;
        if (!frameElement) throw new Error('Missing APERTURE documentary frame.');
        const frame = frameElement.getBoundingClientRect();
        const media = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          bottomExclusion: (media.bottom - frame.bottom) / media.height,
          objectPosition: style.objectPosition,
          overflow: getComputedStyle(frameElement).overflow,
          topOffset: Math.abs(media.top - frame.top),
          visibleSourceYMax: element.videoHeight * (frame.height / media.height),
        };
      });

      expect(crop.overflow, `${profile.label} needs a local clipping boundary.`).toBe('hidden');
      expect(
        crop.bottomExclusion,
        `${profile.label} must exclude at least 12% of the contaminated source bottom.`,
      ).toBeGreaterThanOrEqual(0.12);
      expect(crop.topOffset, `${profile.label} must anchor the approved film to the top.`).toBeLessThanOrEqual(1);
      expect(
        crop.visibleSourceYMax,
        `${profile.label} must stop before the measured subtitle onset at source y=977.`,
      ).toBeLessThanOrEqual(940);
      expect(crop.objectPosition).toBe(profile.width <= 832 ? '38% 0%' : '52% 0%');
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('uses the supplied official Quantum logo masters and icon favicon', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');

    const expectedLogoPaths = [
      '/brand/quantum-full-logo-colors.svg',
      '/brand/quantum-full-logo-white.svg',
      '/brand/quantum-icon-color.svg',
      '/brand/quantum-icon-white.svg',
    ].sort();
    const logoPaths = await page.locator('a.wordmark img.wordmark__asset').evaluateAll((images) =>
      images.map((image) => new URL((image as HTMLImageElement).src).pathname).sort(),
    );
    expect(logoPaths).toEqual(expectedLogoPaths);
    await expect(page.locator('a.wordmark')).toHaveAttribute('aria-label', 'Quantum Hub home');
    await expect(page.locator('a.wordmark')).not.toContainText(/QUANTUM\s*\/\s*HUB/i);
    await expect(page.locator('img[src="/brand/quantum-full-logo-white.svg"]')).toBeVisible();

    const favicon = page.locator('head link[rel="icon"]');
    await expect(favicon).toHaveAttribute('type', 'image/svg+xml');
    await expect
      .poll(() =>
        favicon.evaluate((element) =>
          new URL((element as HTMLLinkElement).href, window.location.href).pathname,
        ),
      )
      .toBe('/brand/quantum-icon-color.svg');

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('mobile media uses authored focal positions without horizontal overflow', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const apertureVideo = page.locator(
      '.field-media video[data-documentary-video][data-media-phase="aperture"]',
    );
    const testVideo = page.locator(
      '.test-boundary video[data-documentary-video][data-media-phase="test"]',
    );
    const desktopPositions = await Promise.all([
      apertureVideo.evaluate((element) => getComputedStyle(element).objectPosition),
      testVideo.evaluate((element) => getComputedStyle(element).objectPosition),
    ]);
    const desktopCrop = await apertureVideo.evaluate((element) => {
      const frame = element.parentElement?.getBoundingClientRect();
      const media = element.getBoundingClientRect();
      if (!frame) throw new Error('Missing APERTURE documentary frame.');
      return {
        bottomExclusion: (media.bottom - frame.bottom) / media.height,
        topOffset: Math.abs(media.top - frame.top),
      };
    });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobilePositions = await Promise.all([
      apertureVideo.evaluate((element) => getComputedStyle(element).objectPosition),
      testVideo.evaluate((element) => getComputedStyle(element).objectPosition),
    ]);
    const mobileCrop = await apertureVideo.evaluate((element) => {
      const frame = element.parentElement?.getBoundingClientRect();
      const media = element.getBoundingClientRect();
      if (!frame) throw new Error('Missing APERTURE documentary frame.');
      return {
        bottomExclusion: (media.bottom - frame.bottom) / media.height,
        topOffset: Math.abs(media.top - frame.top),
      };
    });
    expect(mobilePositions[0], 'APERTURE needs an explicit mobile focal position.').not.toBe(desktopPositions[0]);
    expect(mobilePositions[1], 'TEST needs an explicit mobile focal position.').not.toBe(desktopPositions[1]);
    for (const [profile, crop] of [
      ['desktop', desktopCrop],
      ['mobile', mobileCrop],
    ] as const) {
      expect(
        crop.bottomExclusion,
        `${profile} APERTURE must deterministically exclude the source-film subtitle band.`,
      ).toBeGreaterThanOrEqual(0.12);
      expect(crop.topOffset, `${profile} APERTURE crop must remain top-anchored.`).toBeLessThanOrEqual(1);
    }

    for (const [index, video] of [apertureVideo, testVideo].entries()) {
      const style = await video.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { objectFit: computed.objectFit, objectPosition: computed.objectPosition };
      });
      expect(style.objectFit, `Mobile documentary video ${index + 1} must use a controlled cover crop.`).toBe('cover');
      const coordinates =
        style.objectPosition.match(/[\d.]+%/g)?.map((value) => Number.parseFloat(value)) ?? [];
      expect(coordinates, `Mobile documentary video ${index + 1} needs a percentage focal position.`).toHaveLength(2);
      expect(
        coordinates.every((coordinate) => coordinate >= 0 && coordinate <= 100),
        `Mobile documentary video ${index + 1} has an invalid focal position.`,
      ).toBe(true);
      expect(style.objectPosition, `Mobile documentary video ${index + 1} must not use a default center crop.`).not.toBe('50% 50%');
    }

    for (const phase of ['aperture', 'test'] as const) {
      await activatePhase(page, phase);
      const overflow = await page.evaluate(() => ({
        body: document.body.scrollWidth - document.body.clientWidth,
        root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(overflow.body, `${phase.toUpperCase()} media must not overflow the mobile body.`).toBeLessThanOrEqual(1);
      expect(overflow.root, `${phase.toUpperCase()} media must not overflow the mobile document.`).toBeLessThanOrEqual(1);
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('PROVE uses separate authored focal crops for the stop symbol and field vehicle', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    const positions: Record<string, string[]> = {};

    for (const viewport of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'tablet', width: 768, height: 1024 },
      { label: 'tablet-boundary', width: 545, height: 900 },
      { label: 'stacked-boundary', width: 544, height: 900 },
      { label: 'mobile-large', width: 430, height: 932 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      const prove = await activatePhase(page, 'prove');
      const figure = prove.locator('.proof-record__media');
      const primary = figure.locator('[data-evidence-subject="projected-stop-symbol"]');
      const supporting = figure.locator('[data-evidence-subject="field-vehicle"]');

      await expect(primary).toHaveAttribute('alt', /stop-hand symbol/i);
      await expect(supporting).toHaveAttribute('alt', /vehicle/i);
      await Promise.all(
        [primary, supporting].map((image) =>
          image.evaluate(async (element) => {
            if (!(element instanceof HTMLImageElement)) throw new Error('Expected PROVE image.');
            await element.decode();
          }),
        ),
      );
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      );
      const state = await figure.evaluate((element) => {
        const images = Array.from(element.querySelectorAll<HTMLImageElement>('[data-evidence-subject]'));
        const figureRect = element.getBoundingClientRect();
        const caption = element.querySelector('figcaption');
        if (!(caption instanceof HTMLElement)) throw new Error('Expected PROVE evidence caption.');
        const captionRect = caption.getBoundingClientRect();
        return {
          figureWidth: figureRect.width,
          figureHeight: figureRect.height,
          caption: {
            bottom: captionRect.bottom,
            left: captionRect.left,
            right: captionRect.right,
            top: captionRect.top,
          },
          images: images.map((image) => {
            const rect = image.getBoundingClientRect();
            const objectPosition = getComputedStyle(image).objectPosition;
            const coordinates = objectPosition.match(/-?[\d.]+%/g)?.map(Number.parseFloat) ?? [];
            const positionX = coordinates[0] ?? 50;
            const positionY = coordinates[1] ?? 50;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(rect.width));
            canvas.height = Math.max(1, Math.round(rect.height));
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Expected a canvas context for PROVE crop verification.');
            const scale = Math.max(
              canvas.width / image.naturalWidth,
              canvas.height / image.naturalHeight,
            );
            const renderedWidth = image.naturalWidth * scale;
            const renderedHeight = image.naturalHeight * scale;
            const offsetX = (canvas.width - renderedWidth) * positionX / 100;
            const offsetY = (canvas.height - renderedHeight) * positionY / 100;
            context.drawImage(image, offsetX, offsetY, renderedWidth, renderedHeight);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let subjectColorPixels = 0;
            for (let index = 0; index < pixels.length; index += 4) {
              const red = pixels[index] ?? 0;
              const green = pixels[index + 1] ?? 0;
              const blue = pixels[index + 2] ?? 0;
              if (red > 130 && red > green * 1.35 && red > blue * 1.12 && red - green > 35) {
                subjectColorPixels += 1;
              }
            }
            return {
              bottom: rect.bottom,
              complete: image.complete,
              height: rect.height,
              left: rect.left,
              naturalHeight: image.naturalHeight,
              naturalWidth: image.naturalWidth,
              objectPosition,
              right: rect.right,
              subject: image.dataset.evidenceSubject,
              subjectColorRatio: subjectColorPixels / (canvas.width * canvas.height),
              top: rect.top,
              width: rect.width,
            };
          }),
        };
      });
      const primaryVisibility = await measureSubjectVisibility(
        primary,
        { xMin: 550, yMin: 600, xMax: 1320, yMax: 1070 },
      );
      const vehicleVisibility = await supporting.evaluate(
        (element, region) => {
          if (!(element instanceof HTMLImageElement)) throw new Error('Expected PROVE vehicle image.');
          const rect = element.getBoundingClientRect();
          const figure = element.closest('figure');
          const caption = figure?.querySelector('figcaption');
          if (!(caption instanceof HTMLElement)) throw new Error('Expected PROVE evidence caption.');
          const captionRect = caption.getBoundingClientRect();
          const style = getComputedStyle(element);
          const coordinates = style.objectPosition.match(/-?[\d.]+%/g)?.map(Number.parseFloat) ?? [];
          const positionX = coordinates[0] ?? 50;
          const positionY = coordinates[1] ?? 50;
          const scale = Math.max(rect.width / element.naturalWidth, rect.height / element.naturalHeight);
          const renderedWidth = element.naturalWidth * scale;
          const renderedHeight = element.naturalHeight * scale;
          const offsetX = (rect.width - renderedWidth) * positionX / 100;
          const offsetY = (rect.height - renderedHeight) * positionY / 100;
          const crop = {
            xMin: Math.max(0, -offsetX / scale),
            yMin: Math.max(0, -offsetY / scale),
            xMax: Math.min(element.naturalWidth, (rect.width - offsetX) / scale),
            yMax: Math.min(element.naturalHeight, (rect.height - offsetY) / scale),
          };
          const visible = {
            xMin: Math.max(region.xMin, crop.xMin),
            yMin: Math.max(region.yMin, crop.yMin),
            xMax: Math.min(region.xMax, crop.xMax),
            yMax: Math.min(region.yMax, crop.yMax),
          };
          const visibleWidth = Math.max(0, visible.xMax - visible.xMin);
          const visibleHeight = Math.max(0, visible.yMax - visible.yMin);
          const regionArea = (region.xMax - region.xMin) * (region.yMax - region.yMin);
          const projected = {
            left: rect.left + offsetX + visible.xMin * scale,
            top: rect.top + offsetY + visible.yMin * scale,
            right: rect.left + offsetX + visible.xMax * scale,
            bottom: rect.top + offsetY + visible.yMax * scale,
          };
          const projectedWidth = Math.max(0, projected.right - projected.left);
          const projectedHeight = Math.max(0, projected.bottom - projected.top);
          const captionOverlapWidth = Math.max(
            0,
            Math.min(projected.right, captionRect.right) - Math.max(projected.left, captionRect.left),
          );
          const captionOverlapHeight = Math.max(
            0,
            Math.min(projected.bottom, captionRect.bottom) - Math.max(projected.top, captionRect.top),
          );
          return {
            captionOverlapRatio:
              projectedWidth * projectedHeight > 0
                ? (captionOverlapWidth * captionOverlapHeight) / (projectedWidth * projectedHeight)
                : 1,
            naturalHeight: element.naturalHeight,
            naturalWidth: element.naturalWidth,
            projectedHeight,
            projectedWidth,
            visibleSourceRatio: regionArea > 0 ? (visibleWidth * visibleHeight) / regionArea : 0,
          };
        },
        { xMin: 780, yMin: 1660, xMax: 1600, yMax: 2040 },
      );
      expect(state.images).toHaveLength(2);
      expect(state.images[1]!.width / state.figureWidth).toBeGreaterThanOrEqual(0.35);
      expect(state.images.every((image) => image.height / state.figureHeight >= 0.35)).toBe(true);
      expect(state.images.every((image) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(
        state.images.every((image) => {
          const overlapWidth = Math.max(
            0,
            Math.min(image.right, state.caption.right) - Math.max(image.left, state.caption.left),
          );
          const overlapHeight = Math.max(
            0,
            Math.min(image.bottom, state.caption.bottom) - Math.max(image.top, state.caption.top),
          );
          return overlapWidth * overlapHeight <= 1;
        }),
      ).toBe(true);
      for (const image of state.images) {
        const coordinates = image.objectPosition.match(/[\d.]+%/g) ?? [];
        expect(coordinates).toHaveLength(2);
        expect(image.objectPosition).not.toBe('50% 50%');
      }
      expect(primaryVisibility.naturalWidth).toBe(1920);
      expect(primaryVisibility.naturalHeight).toBe(1080);
      expect(primaryVisibility.visibleSourceRatio).toBeGreaterThanOrEqual(0.85);
      expect(primaryVisibility.projectedWidth).toBeGreaterThanOrEqual(100);
      expect(primaryVisibility.projectedHeight).toBeGreaterThanOrEqual(40);
      expect(primaryVisibility.captionOverlapRatio).toBeLessThanOrEqual(0.01);
      expect(vehicleVisibility.naturalWidth).toBe(2160);
      expect(vehicleVisibility.naturalHeight).toBe(3840);
      expect(vehicleVisibility.visibleSourceRatio).toBeGreaterThanOrEqual(0.95);
      expect(vehicleVisibility.projectedWidth).toBeGreaterThanOrEqual(40);
      expect(vehicleVisibility.projectedHeight).toBeGreaterThanOrEqual(18);
      expect(vehicleVisibility.captionOverlapRatio).toBeLessThanOrEqual(0.01);
      expect(
        state.images.find((image) => image.subject === 'projected-stop-symbol')?.subjectColorRatio,
      ).toBeGreaterThanOrEqual(viewport.width > 544 && viewport.width <= 832 ? 0.06 : 0.1);
      expect(
        state.images.find((image) => image.subject === 'field-vehicle')?.subjectColorRatio,
      ).toBeGreaterThanOrEqual(
        viewport.width <= 544 ? 0.02 : viewport.width <= 832 ? 0.008 : 0.015,
      );
      positions[viewport.label] = state.images.map((image) => image.objectPosition);
    }

    expect(positions.mobile).not.toEqual(positions.desktop);
    expect(positions.tablet).not.toEqual(positions.mobile);
    expect(positions['tablet-boundary']).not.toEqual(positions['stacked-boundary']);
    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('APERTURE and TEST text plates retain actual-background AA contrast over real media', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);

    for (const viewport of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      await activatePhase(page, 'aperture');
      const apertureVideo = page.locator(
        '.field-media video[data-documentary-video][data-media-phase="aperture"]',
      );
      await expect(apertureVideo).toBeVisible();
      await expect(apertureVideo.locator('source')).toHaveAttribute('src', apertureVideoPath);
      await expectActualPlateContrast(
        page,
        '.phase-copy--plate',
        `${viewport.label} APERTURE text plate`,
      );

      await activatePhase(page, 'test');
      const testVideo = page.locator(
        '.test-boundary video[data-documentary-video][data-media-phase="test"]',
      );
      await expect(testVideo).toBeVisible();
      await expect(testVideo.locator('source')).toHaveAttribute('src', testVideoPath);
      await expectActualPlateContrast(
        page,
        '.test-boundary__content',
        `${viewport.label} TEST content plate`,
      );
    }

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });

  test('PROVE renders the approved evidence fields and next step without a commercial outcome claim', async ({ page }) => {
    const runtimeFailures = captureRuntimeFailures(page);
    await page.goto('/');
    const prove = await activatePhase(page, 'prove');

    const record = prove.locator('article.proof-record[data-proof-record="maradin-dynamic-ground-projection"]');
    await expect(record).toBeVisible();
    await expect(record.locator('h3')).toHaveText('Dynamic Ground Projection');
    await expect(record).toContainText('Maradin');
    await expect(record).toContainText('Hyundai CRADLE TLV');
    await expect(record).toContainText('SPARK');
    await expect(record.locator('dt')).toHaveText([
      '01Field condition',
      '02Technology',
      '03Environment',
      '04Test',
      '05Evidence',
      '06Next step',
    ]);
    await expect(record).toContainText('More than 60 real-world scenarios');
    await expect(record).toContainText('EcoMotion 2023 showcase');
    await expect(record).toContainText("Hyundai's OI Lounge exhibition in Korea");
    await expect(record).toContainText("vehicle's front grille");

    const fieldLabels = await record.locator('dt').allTextContents();
    expect(fieldLabels.some((label) => /^\s*(?:\d+)?\s*decision\s*$/i.test(label))).toBe(false);
    const publicRecordText = await record.innerText();
    expect(publicRecordText).not.toMatch(
      /\b(?:success(?:ful)?|deployed|deployment|adopted|adoption|signed|production|scaled|scaling|sales|procurement|commercialization)\b/i,
    );

    expect(runtimeFailures, runtimeFailures.join('\n')).toEqual([]);
  });
});
