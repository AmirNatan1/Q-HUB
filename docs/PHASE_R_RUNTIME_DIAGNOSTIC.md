# Phase R repair runtime diagnostic

This record compares deterministic local production-preview journeys for the accepted Phase 3 baseline, the pre-repair Phase R implementation, and the human-repair candidate. The repaired result is **synthetic performance evidence with disclosed regressions and limitations**. It is not field telemetry and does not prove that a Cloudflare branch preview will feel smooth on ordinary hardware.

## Candidate binding and method

- Accepted Phase 3 baseline HEAD: `ff78e2d911960bb2c05d7404966bbf688d0764e9`
- Pre-repair Phase R implementation candidate: `65907148bafec7cfe02f6c6d73154e3269f5d0e0`
- Repaired implementation commit: `6d6c97375f0c688eaa5d946cd18c429b8b21ed0b`
- Runtime measurement candidate HEAD: `b4d4471b422231dfd558381486473be2d0c23263`
- Runtime candidate source tree: `77c406637a477da17bb997a3947111b9bc602010`
- Branch: `redirect/quantum-presence-startup-magnet`
- Browser: bundled Chromium `151.0.7922.34`
- Build input: fresh `npm run build`, followed by an isolated `astro preview`
- Desktop: `1440×900`, DPR 1, normal motion, full seven-act homepage journey
- Mobile: `390×844`, DPR 1, touch/mobile context, full seven-act homepage journey
- Video recording: inactive during measurement
- Candidate start state: clean committed tracked and untracked tree

Command:

```powershell
$env:PHASE_R_RUNTIME_STAGE = "candidate"
$env:PHASE_R_RUNTIME_CANDIDATE_SHA = "b4d4471b422231dfd558381486473be2d0c23263"
npm run runtime:phase-r
```

The first repair-run attempt stopped before measurement because the fail-closed runner refused to overwrite the pre-repair candidate files. Those three files were moved without byte changes to `artifacts/performance/phase-r-pre-repair-6590714/` and committed before this run. The successful runner completed both profiles, shut down its isolated preview/browser processes, atomically promoted the new three JSON outputs, and reverified candidate HEAD, tree, branch, and output-only status.

Machine artifacts:

- Phase 3 baseline: `artifacts/performance/phase-r/baseline-*.json`
- Repaired candidate: `artifacts/performance/phase-r/candidate-*.json`
- Pre-repair candidate: `artifacts/performance/phase-r-pre-repair-6590714/candidate-*.json`
- Preserved pre-repair archive: `artifacts/performance/phase-r.zip`

## Desktop results

| Metric | Phase 3 baseline | Pre-repair Phase R | Repaired Phase R | Repair versus pre-repair |
| --- | ---: | ---: | ---: | --- |
| Journey duration | 14,780.7 ms | 11,809.4 ms | 11,884.5 ms | 75.1 ms longer |
| rAF samples | 202 | 529 | 482 | 47 fewer |
| rAF p50 | 83.300 ms | 16.700 ms | 16.700 ms | unchanged |
| rAF p95 | 165.865 ms | 50.000 ms | 50.000 ms | unchanged |
| rAF p99 | 233.300 ms | 66.600 ms | 66.700 ms | 0.100 ms higher |
| Intervals >33.3 ms | 137 | 104 | 127 | 23 more |
| Intervals >50 ms | 124 | 11 | 16 | 5 more |
| Maximum interval | 233.400 ms | 133.300 ms | 100.000 ms | 33.300 ms lower |
| Long tasks | 10 | 4 | 11 | 7 more |
| Long-task total | 573 ms | 306 ms | 652 ms | 346 ms higher |
| Long-task maximum | 82 ms | 115 ms | 92 ms | 23 ms lower |
| Page / console errors | 0 | 0 | 0 | unchanged |
| Offscreen video playback samples | 0 | 0 | 0 | unchanged |

Duration-normalized desktop rates make the unequal Phase 3 and Phase R journeys easier to compare. Phase 3 / pre-repair / repaired rates were:

- intervals over 33.3 ms: `9.269/s` / `8.807/s` / `10.686/s`;
- intervals over 50 ms: `8.389/s` / `0.931/s` / `1.346/s`;
- long-task count: `0.677/s` / `0.339/s` / `0.926/s`;
- long-task time: `38.767 ms/s` / `25.912 ms/s` / `54.861 ms/s`.

The repair run therefore keeps the large Phase 3-to-Phase-R frame-pacing improvement and lowers the worst pre-repair long task from 115 ms to 92 ms, but it does **not** reproduce the pre-repair run's lower long-task count or total. That mixed result is a disclosed local synthetic regression, not hidden as run variance or relabeled as a pass.

## Mobile results

| Metric | Phase 3 baseline | Pre-repair Phase R | Repaired Phase R | Repair versus pre-repair |
| --- | ---: | ---: | ---: | --- |
| Journey duration | 8,100.0 ms | 8,431.9 ms | 8,210.8 ms | 221.1 ms shorter |
| rAF samples | 329 | 484 | 491 | 7 more |
| rAF p50 | 16.700 ms | 16.700 ms | 16.700 ms | unchanged |
| rAF p95 | 50.000 ms | 16.800 ms | 16.800 ms | unchanged |
| rAF p99 | 66.700 ms | 33.400 ms | 16.800 ms | 16.600 ms lower |
| Intervals >33.3 ms | 99 | 16 | 1 | 15 fewer |
| Intervals >50 ms | 7 | 0 | 0 | unchanged |
| Maximum interval | 116.700 ms | 33.400 ms | 33.300 ms | 0.100 ms lower |
| Long tasks | 0 | 0 | 0 | unchanged |
| Page / console errors | 0 | 0 | 0 | unchanged |
| WebGL draws | 0 | 0 | 0 | mobile remains DOM/CSS/SVG by default |
| Offscreen video playback samples | 0 | 0 | 0 | unchanged |

Duration-normalized mobile intervals over 33.3 ms were `12.222/s` for Phase 3, `1.898/s` pre-repair, and `0.122/s` repaired. Intervals over 50 ms remained `0/s` for both Phase R candidates.

## Runtime lifecycle findings

The repaired candidate initializes the optional custom WebGL engine only on desktop. The canvas measured `1440×900` at DPR 1; implementation DPR remains capped at `1.25`. Mobile did not initialize WebGL, and its hidden canvas retained the untouched `300×150` backing dimensions with a zero-sized rendered box.

| Repaired checkpoint | Draw delta during 280 ms settled window | Interpretation |
| --- | ---: | --- |
| PRESENCE | 8 | Continuous drawing observed and permitted while active. |
| ACCESS | 0 | No continuous rendering. |
| STARTUP | 8 | Transient event-driven draws were still arriving during the first post-scroll window; the probe classifies any delta above 2 as continuous. |
| METHOD | 2 | One-shot work settled at the probe boundary; not classified as continuous. |
| ACTIVITY | 0 | No continuous rendering. |
| EVIDENCE | 0 | No continuous rendering. |
| ACTION | 0 | No continuous rendering. |

Total desktop draw calls by act were PRESENCE `77`, STARTUP `15`, and METHOD `20`; other acts recorded none. The pre-repair run recorded `76`, `14`, and `20`, respectively. The repaired Field Crossing and activity geometries therefore did not introduce a new continuous rendering system. Source and browser lifecycle tests continue to show that the permanent animation-frame loop is eligible only during active PRESENCE; STARTUP and METHOD use bounded one-shot draws for scroll, pointer, resize, or state changes. Inactive, hidden, and torn-down states stop rendering.

The homepage contains no video elements, so media sample sets are empty and offscreen playback remains zero. Chromium exposed coarse fixed 10 MB heap counters at start and end; the recorded zero delta is not treated as a precise memory conclusion.

## Historical evidence integrity

The runtime runner hashed 83 pre-existing files under `artifacts/review/`, totaling 48,205,089 bytes, before and after measurement. The sorted `file\0sha256\0bytes` digest remained `bb279d9ee2bdc1121ca73de4e2e592f6fe6430b5574742e68a1d0d424ba0ed07`.

The previous Phase R candidate runner recorded 82 files / 39,090,932 bytes / digest `9c36b1fe1606733ae08b361df674d91833414196b3583cd31cddaf43c455f1bf`. The current 83-file inventory also includes the preserved pre-repair `artifacts/review/phase-r.zip` archive. Because the aggregate inventory changed between closure moments, those aggregate digests are not asserted to be equal. The candidate runner does prove byte stability across this repair measurement, while Git history retains the earlier package.

## Interpretation and limitations

The repaired candidate preserves zero application errors, keeps mobile free of WebGL, keeps permanent rendering limited to eligible active PRESENCE, and does not increase the JavaScript bundle. Mobile synthetic pacing improved. Desktop retained the major Phase 3-to-Phase-R improvement and reduced the maximum pre-repair long task, but increased long-task count, long-task total, and normalized rates compared with the pre-repair run. Those regressions require attention during human preview testing even though the repaired visuals use CSS/SVG/DOM and state-driven compositor-friendly transitions.

The measurement is Chromium/headless/SwiftShader lab evidence. It is not physical-GPU, Safari, Firefox, screen-reader, field-telemetry, or ordinary-device evidence. The baseline and candidate also traverse different six-act and seven-act page shapes, so raw totals are supplemented with normalized rates rather than treated as perfectly like-for-like workloads.

> **Cloudflare branch-preview smoothness on the owner's ordinary hardware has not yet been proven. A deployed preview and manual hardware test remain required.**

No claim is made that the historical real-world Cloudflare lag is solved.
