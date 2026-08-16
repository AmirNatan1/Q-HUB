# Phase R runtime diagnostic

This record compares deterministic local production-preview journeys before and after the Phase R homepage reorientation. The candidate result is a **synthetic performance pass with disclosed limitations**. It is not field telemetry and does not prove that the Cloudflare branch preview will feel smooth on ordinary hardware.

## Candidate binding and method

- Accepted Phase 3 baseline HEAD: `ff78e2d911960bb2c05d7404966bbf688d0764e9`
- Phase R implementation candidate HEAD: `65907148bafec7cfe02f6c6d73154e3269f5d0e0`
- Candidate source tree: `1111b5a4fb057238fa8640fe4827ab392ca8ab44`
- Branch: `redirect/quantum-presence-startup-magnet`
- Browser: bundled Chromium `151.0.7922.34`
- Build input: fresh `npm run build`, followed by an isolated `astro preview`
- Desktop: `1440×900`, DPR 1, normal motion, full homepage journey
- Mobile: `390×844`, DPR 1, touch/mobile context, full homepage journey
- Video recording: inactive during measurement
- Candidate start state: clean committed tracked and untracked tree

Command:

```powershell
$env:PHASE_R_RUNTIME_STAGE = "candidate"
$env:PHASE_R_RUNTIME_CANDIDATE_SHA = "65907148bafec7cfe02f6c6d73154e3269f5d0e0"
npm run runtime:phase-r
```

The runner completed both profiles, shut down its isolated preview/browser processes, atomically promoted the three JSON outputs, and reverified the candidate HEAD, tree, branch, and allowed output-only status after promotion.

Machine artifacts:

- `artifacts/performance/phase-r/baseline-desktop.json`
- `artifacts/performance/phase-r/baseline-mobile.json`
- `artifacts/performance/phase-r/baseline-summary.json`
- `artifacts/performance/phase-r/candidate-desktop.json`
- `artifacts/performance/phase-r/candidate-mobile.json`
- `artifacts/performance/phase-r/candidate-summary.json`

## Baseline and candidate results

### Desktop

| Metric | Phase 3 baseline | Phase R candidate | Direction |
| --- | ---: | ---: | --- |
| Journey duration | 14,780.7 ms | 11,809.4 ms | 2,971.3 ms shorter |
| rAF samples | 202 | 529 | more observable frame opportunities |
| rAF p50 | 83.300 ms | 16.700 ms | 66.600 ms lower |
| rAF p95 | 165.865 ms | 50.000 ms | 115.865 ms lower |
| rAF p99 | 233.300 ms | 66.600 ms | 166.700 ms lower |
| Intervals >33.3 ms | 137 | 104 | 33 fewer |
| Intervals >50 ms | 124 | 11 | 113 fewer |
| Maximum interval | 233.400 ms | 133.300 ms | 100.100 ms lower |
| Long tasks | 10 | 4 | 6 fewer |
| Long-task total | 573 ms | 306 ms | 267 ms lower |
| Long-task maximum | 82 ms | 115 ms | 33 ms higher |
| Page / console errors | 0 | 0 | unchanged |
| Offscreen video playback samples | 0 | 0 | unchanged |

Duration-normalized desktop rates make the unequal six-act and seven-act journeys easier to compare: intervals over 33.3 ms fell from `9.269/s` to `8.807/s`; intervals over 50 ms fell from `8.389/s` to `0.931/s`. Long-task count density fell from `0.677/s` to `0.339/s`, and long-task time fell from `38.767 ms/s` to `25.912 ms/s`. The 33-millisecond increase in the maximum individual long task remains disclosed even though overall frame pacing and long-task density improved materially.

### Mobile

| Metric | Phase 3 baseline | Phase R candidate | Direction |
| --- | ---: | ---: | --- |
| Journey duration | 8,100.0 ms | 8,431.9 ms | 331.9 ms longer |
| rAF samples | 329 | 484 | more observable frame opportunities |
| rAF p50 | 16.700 ms | 16.700 ms | unchanged |
| rAF p95 | 50.000 ms | 16.800 ms | 33.200 ms lower |
| rAF p99 | 66.700 ms | 33.300 ms | 33.400 ms lower |
| Intervals >33.3 ms | 99 | 16 | 83 fewer |
| Intervals >50 ms | 7 | 0 | 7 fewer |
| Maximum interval | 116.700 ms | 33.400 ms | 83.300 ms lower |
| Long tasks | 0 | 0 | unchanged |
| Page / console errors | 0 | 0 | unchanged |
| WebGL draws | 0 | 0 | mobile remains DOM/CSS/SVG by default |
| Offscreen video playback samples | 0 | 0 | unchanged |

Duration-normalized mobile intervals over 33.3 ms fell from `12.222/s` to `1.898/s`; intervals over 50 ms fell from `0.864/s` to `0/s`.

## Runtime lifecycle findings

The candidate initializes the optional custom WebGL engine only on the desktop profile. The canvas measured `1440×900` at DPR 1; implementation DPR is capped at `1.25`. Mobile did not initialize WebGL and the hidden canvas retained its untouched `300×150` backing dimensions with a zero-sized rendered box.

| Candidate checkpoint | Draw delta during 280 ms settled window | Interpretation |
| --- | ---: | --- |
| PRESENCE | 8 | Continuous drawing observed and permitted while active. |
| ACCESS | 0 | No continuous rendering. |
| STARTUP | 6 | Transient event-driven draws were still arriving during the first post-scroll window; this probe classifies any delta above 2 as continuous. |
| METHOD | 0 | No continuous rendering. |
| ACTIVITY | 0 | No continuous rendering. |
| EVIDENCE | 0 | No continuous rendering. |
| ACTION | 0 | No continuous rendering. |

The STARTUP sample is not concealed. Source inspection shows that the engine's permanent animation-frame loop is enabled only when the active phase is PRESENCE; STARTUP and METHOD use scheduled one-shot draws in response to scroll, pointer, resize, or state changes. The candidate-bound browser lifecycle case separately verifies that draws stop after METHOD settles, while inactive, while hidden, and after teardown. The six draws above therefore record short post-scroll/state-update activity, not evidence of an indefinite STARTUP loop. A future probe can add a longer quiet lead-in before labeling this window, but Phase R does not change the committed implementation merely to improve the label.

The candidate homepage contains no video elements, so media sample sets are empty and offscreen playback remains zero. The browser exposed coarse fixed 10 MB heap counters at start and end; the reported zero delta is not treated as a precise memory finding.

## Historical evidence integrity

Git tree comparison proves that the pre-Phase-R historical evidence within `artifacts/review/` is identical between accepted Phase 3 HEAD `ff78e2d...` and candidate `6590714...`: 82 tracked files totaling 39,090,932 bytes, with no name, mode, blob, or byte change.

The candidate runtime runner independently hashed the same 82-file set before and after build/measurement and recorded digest `9c36b1fe1606733ae08b361df674d91833414196b3583cd31cddaf43c455f1bf` using sorted `file\0sha256\0bytes` records.

The earlier baseline aggregate recorded 83 files / 41,764,241 bytes / digest `4dfee2bfc14e5e3e694eb4d598fe283e39f15dad0121480ef7c6c22adac2cabd`. That baseline included one ignored transient archive that was not part of the accepted Phase 3 Git tree and is no longer present. Its absence means the two aggregate digests are not directly equal; it does **not** represent a tracked historical-evidence mutation. This discrepancy remains a documented limitation rather than being rewritten or hidden.

## Release interpretation and limitations

The candidate materially improves local synthetic desktop and mobile frame pacing, preserves zero application errors, keeps mobile free of WebGL, and stops permanent rendering outside active PRESENCE. It does not show a significant overall synthetic regression. The 33-millisecond increase in the maximum desktop long task and the transient STARTUP draw window remain visible above.

The measurement is Chromium/headless/SwiftShader lab evidence. It is not physical-GPU, Safari, Firefox, screen-reader, field-telemetry, or ordinary-device evidence. The baseline and candidate also traverse different six-act and seven-act page shapes, so raw totals are supplemented with normalized rates rather than treated as perfectly like-for-like workloads.

> **Synthetic performance PASS does not constitute final runtime acceptance. Human testing of the branch Cloudflare preview on ordinary hardware remains required.**

No claim is made that the real Cloudflare lag is solved.
