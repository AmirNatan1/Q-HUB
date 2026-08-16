# Phase R runtime diagnostic

This record compares deterministic local production-preview journeys before and after the Phase R homepage reorientation. It is comparative synthetic evidence, not field telemetry or proof of performance on ordinary hardware.

## Measurement contract

- Baseline source HEAD: `ff78e2d911960bb2c05d7404966bbf688d0764e9`
- Baseline production implementation: unchanged accepted Phase 3 product paths
- Branch used to collect the baseline: `redirect/quantum-presence-startup-magnet`
- Build input: fresh `npm run build`, then isolated `astro preview`
- Browser: bundled Chromium `151.0.7922.34`
- Renderer limitation: headless Chromium uses SwiftShader rather than the machine's physical GPU
- Desktop journey: `1440×900`, DPR 1, normal motion, full six-act baseline
- Mobile journey: `390×844`, DPR 1, touch/mobile context, full six-act baseline
- Video recording was not active during measurement.
- Historical review evidence was hashed before and after measurement.

The reusable probe records raw request-animation-frame intervals, p50/p95/p99, intervals over 33.3 ms and 50 ms, maximum interval, Long Task API entries, page and console errors, WebGL draw calls by active act, video lifecycle and offscreen playback samples, canvas CSS/backing dimensions, DPR, memory when exposed, duration, viewport, browser version, and every reached act.

Command:

```text
npm run runtime:phase-r
```

Machine artifacts:

- `artifacts/performance/phase-r/baseline-desktop.json`
- `artifacts/performance/phase-r/baseline-mobile.json`
- `artifacts/performance/phase-r/baseline-summary.json`

## Accepted Phase 3 baseline

| Metric | Desktop 1440×900 | Mobile 390×844 |
| --- | ---: | ---: |
| Journey duration | 14,780.7 ms | 8,100.0 ms |
| rAF samples | 202 | 329 |
| rAF p50 | 83.300 ms | 16.700 ms |
| rAF p95 | 165.865 ms | 50.000 ms |
| rAF p99 | 233.300 ms | 66.700 ms |
| Frames >33.3 ms | 137 | 99 |
| Frames >50 ms | 124 | 7 |
| Maximum interval | 233.400 ms | 116.700 ms |
| Long tasks | 10 | 0 |
| Long-task total | 573 ms | 0 ms |
| Long-task maximum | 82 ms | 0 ms |
| Page / console errors | 0 | 0 |
| Offscreen video playback samples | 0 | 0 |

Desktop WebGL draw calls were observed in every act during traversal: SIGNAL 39, APERTURE 27, NEED 5, FIND 32, TEST 7, and PROVE 27. Continuous rendering is intentionally configured for SIGNAL, APERTURE, and FIND in the accepted implementation, while scroll and lifecycle events can still request one-off draws in other acts. The desktop canvas resolved to 1440×900 at DPR 1. Mobile did not initialize WebGL; its untouched canvas retained the default 300×150 backing store behind a 390×844 CSS box.

Both documentary videos remained paused outside their owning act. The probe observed zero offscreen-playing samples. Source assignment remained lazy at first use, although assigned sources stayed resident afterward. Chromium exposed memory counters, but this headless run returned coarse fixed 10 MB values at start and end; the reported zero delta is not treated as a precise heap finding.

## Baseline findings that Phase R must address

1. Desktop SwiftShader frame pacing is poor in this synthetic journey: p50 is 83.3 ms and 124 of 202 intervals exceed 50 ms.
2. The WebGL engine performs continuous draws in three acts and receives one-off work throughout the journey.
3. The accepted engine reads canvas layout and repeated root computed styles inside its render loop.
4. Pointer events currently update multiple root properties without request-animation-frame coalescing.
5. The final candidate must reduce unnecessary continuous drawing, keep mobile free of desktop shader cost, retain zero offscreen video playback, and disclose directionally comparable candidate results.

## Historical evidence integrity

The pre-Phase-R review inventory contains 83 files totaling 41,764,241 bytes. Its deterministic SHA-256 digest is `4dfee2bfc14e5e3e694eb4d598fe283e39f15dad0121480ef7c6c22adac2cabd`, computed from sorted `file\0sha256\0bytes` records joined by newlines. No historical review artifact changed during baseline capture.

## Candidate comparison

Candidate measurements are intentionally deferred until the Phase R implementation is committed. This section will record the exact candidate SHA, like-for-like metrics, deltas, lifecycle assertions, and remaining limitations without replacing or overwriting the baseline artifacts.
