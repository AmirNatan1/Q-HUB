# Phase R repair runtime diagnostic

This record compares deterministic local production-preview journeys for the accepted Phase 3 baseline, the pre-repair Phase R implementation, and the final human-repair candidate. The result is **synthetic performance evidence with disclosed regressions and limitations**. It is not field telemetry and does not prove that a Cloudflare branch preview will feel smooth on ordinary hardware.

## Candidate binding and method

- Accepted Phase 3 baseline HEAD: `ff78e2d911960bb2c05d7404966bbf688d0764e9`
- Pre-repair Phase R implementation candidate: `65907148bafec7cfe02f6c6d73154e3269f5d0e0`
- Final repaired implementation commit: `325f72d46b65376327c006c0e5d8a37c11d76e75`
- Runtime measurement candidate HEAD: `e3340ad90d1d76dc5cb6bf4b5e37d3bf31df4b19`
- Runtime candidate source tree: `bd9fe135e109cd8e8aef82c679a48d5686dc74ff`
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
$env:PHASE_R_RUNTIME_CANDIDATE_SHA = "e3340ad90d1d76dc5cb6bf4b5e37d3bf31df4b19"
npm run runtime:phase-r
```

The first repair attempt stopped before measurement because the fail-closed runner refused to overwrite the pre-repair files. Those three files were moved without byte changes to `artifacts/performance/phase-r-pre-repair-6590714/`. A first repair diagnostic bound to `b4d4471b...` was then generated and preserved at `artifacts/performance/phase-r-repair-intermediate-b4d4471/`. After visual inspection required a final Taavura territory refinement, the current runner regenerated the canonical candidate files from the final clean source. It completed both profiles, shut down its isolated processes, atomically promoted its outputs, and reverified HEAD, tree, branch, and output-only status.

Machine artifacts:

- Phase 3 baseline: `artifacts/performance/phase-r/baseline-*.json`
- Final repaired candidate: `artifacts/performance/phase-r/candidate-*.json`
- Pre-repair candidate: `artifacts/performance/phase-r-pre-repair-6590714/candidate-*.json`
- First repair diagnostic: `artifacts/performance/phase-r-repair-intermediate-b4d4471/candidate-*.json`
- Preserved pre-repair archive: `artifacts/performance/phase-r.zip`

## Desktop results

| Metric | Phase 3 baseline | Pre-repair Phase R | Final repaired Phase R | Final versus pre-repair |
| --- | ---: | ---: | ---: | --- |
| Journey duration | 14,780.7 ms | 11,809.4 ms | 11,656.3 ms | 153.1 ms shorter |
| rAF samples | 202 | 529 | 514 | 15 fewer |
| rAF p50 | 83.300 ms | 16.700 ms | 16.700 ms | unchanged |
| rAF p95 | 165.865 ms | 50.000 ms | 49.900 ms | 0.100 ms lower |
| rAF p99 | 233.300 ms | 66.600 ms | 66.700 ms | 0.100 ms higher |
| Intervals >33.3 ms | 137 | 104 | 103 | 1 fewer |
| Intervals >50 ms | 124 | 11 | 12 | 1 more |
| Maximum interval | 233.400 ms | 133.300 ms | 99.900 ms | 33.400 ms lower |
| Long tasks | 10 | 4 | 5 | 1 more |
| Long-task total | 573 ms | 306 ms | 331 ms | 25 ms higher |
| Long-task maximum | 82 ms | 115 ms | 85 ms | 30 ms lower |
| Page / console errors | 0 | 0 | 0 | unchanged |
| Offscreen video playback samples | 0 | 0 | 0 | unchanged |

Duration-normalized Phase 3 / pre-repair / final rates were:

- intervals over 33.3 ms: `9.270/s` / `8.810/s` / `8.840/s`;
- intervals over 50 ms: `8.390/s` / `0.930/s` / `1.030/s`;
- long-task count: `0.680/s` / `0.340/s` / `0.430/s`;
- long-task time: `38.770 ms/s` / `25.910 ms/s` / `28.400 ms/s`.

The final repair keeps the large Phase 3-to-Phase-R frame-pacing improvement, shortens the journey, and lowers the worst pre-repair long task from 115 ms to 85 ms. It records one additional long task, 25 ms more aggregate long-task time, one additional interval over 50 ms, and slightly higher normalized rates than the pre-repair run. Those small synthetic regressions are disclosed rather than hidden as run variance.

The first repair diagnostic recorded 11 long tasks / 652 ms total / 92 ms maximum and `10.686/s` intervals over 33.3 ms. That superseded diagnostic is retained because it motivated the narrower final refinement and rerun; it is not cited as final evidence.

## Mobile results

| Metric | Phase 3 baseline | Pre-repair Phase R | Final repaired Phase R | Final versus pre-repair |
| --- | ---: | ---: | ---: | --- |
| Journey duration | 8,100.0 ms | 8,431.9 ms | 8,456.0 ms | 24.1 ms longer |
| rAF samples | 329 | 484 | 495 | 11 more |
| rAF p50 | 16.700 ms | 16.700 ms | 16.700 ms | unchanged |
| rAF p95 | 50.000 ms | 16.800 ms | 16.800 ms | unchanged |
| rAF p99 | 66.700 ms | 33.400 ms | 33.300 ms | 0.100 ms lower |
| Intervals >33.3 ms | 99 | 16 | 9 | 7 fewer |
| Intervals >50 ms | 7 | 0 | 0 | unchanged |
| Maximum interval | 116.700 ms | 33.400 ms | 33.400 ms | unchanged |
| Long tasks | 0 | 0 | 0 | unchanged |
| Page / console errors | 0 | 0 | 0 | unchanged |
| WebGL draws | 0 | 0 | 0 | mobile remains DOM/CSS/SVG by default |
| Offscreen video playback samples | 0 | 0 | 0 | unchanged |

Duration-normalized mobile intervals over 33.3 ms were `12.220/s` for Phase 3, `1.900/s` pre-repair, and `1.060/s` final. Intervals over 50 ms remained `0/s` for both Phase R candidates.

## Runtime lifecycle findings

The final candidate initializes the optional custom WebGL engine only on desktop. The canvas measured `1440×900` at DPR 1; implementation DPR remains capped at `1.25`. Mobile did not initialize WebGL, and its hidden canvas retained the untouched `300×150` backing dimensions with a zero-sized rendered box.

| Final checkpoint | Draw delta during 280 ms settled window | Interpretation |
| --- | ---: | --- |
| PRESENCE | 11 | Continuous drawing observed and permitted while active. |
| ACCESS | 0 | No continuous rendering. |
| STARTUP | 7 | Transient event-driven draws were still arriving during the first post-scroll window. |
| METHOD | 4 | Transient one-shot draws were still arriving during the first post-scroll window. |
| ACTIVITY | 0 | No continuous rendering. |
| EVIDENCE | 0 | No continuous rendering. |
| ACTION | 0 | No continuous rendering. |

Total desktop draw calls by act were PRESENCE `88`, STARTUP `15`, and METHOD `23`; other acts recorded none. The pre-repair run recorded `76`, `14`, and `20`, respectively. Source and browser lifecycle tests continue to show that the permanent animation-frame loop is eligible only during active PRESENCE; STARTUP and METHOD use bounded one-shot draws for scroll, pointer, resize, or state changes. Inactive, hidden, and torn-down states stop rendering. The nonzero STARTUP and METHOD quiet-window deltas are therefore retained as a timing/lifecycle limitation, not relabeled as zero.

The homepage contains no video elements, so media sample sets are empty and offscreen playback remains zero. Chromium exposed coarse fixed 10 MB heap counters at start and end; the recorded zero delta is not treated as a precise memory conclusion.

## Historical evidence integrity

The runtime runner hashed 133 pre-existing files under `artifacts/review/`, totaling 68,042,804 bytes, before and after measurement. The sorted `file\0sha256\0bytes` digest remained `a3e6f488b288711758cb09a51713ada0c5ed9d42cb7c83c5ee61e616a6c275ca`.

That inventory includes the preserved pre-repair package, its archive, and the candidate-bound intermediate review package whose inspection exposed the remaining Taavura panel effect. Aggregate digests from earlier closure moments are not asserted to be equal because the preserved inventory intentionally grew. Each runner proves byte stability across its own measurement, while Git history and explicit candidate-named directories retain prior packages.

## Interpretation and limitations

The final repaired candidate preserves zero application errors, keeps mobile free of WebGL, limits permanent rendering to eligible active PRESENCE, and does not increase the JavaScript bundle. Mobile synthetic pacing improved versus pre-repair. Desktop retained the major Phase 3-to-Phase-R improvement and reduced the worst pre-repair long task, while showing the small count/total/density regressions disclosed above.

The measurement is Chromium/headless/SwiftShader lab evidence. It is not physical-GPU, Safari, Firefox, screen-reader, field-telemetry, or ordinary-device evidence. The Phase 3 baseline and Phase R candidate traverse different six-act and seven-act page shapes, so raw totals are supplemented with normalized rates rather than treated as perfectly like-for-like workloads.

> **Cloudflare branch-preview smoothness on the owner's ordinary hardware has not yet been proven. A deployed preview and manual hardware test remain required.**

No claim is made that the historical real-world Cloudflare lag is solved.
