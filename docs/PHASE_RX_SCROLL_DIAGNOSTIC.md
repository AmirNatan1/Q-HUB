# Phase R-X Scroll Diagnostic

## Reproduction target

The pre-repair source is Phase R closure HEAD `36e750ed2ae265440c5546e24deebda74db5255a` on `redirect/quantum-presence-startup-magnet`.

The reproduction used a fresh Astro production build and local production preview at `1440×900`. Playwright issued repeated real `page.mouse.wheel(0, 96)` input at 52 ms intervals from the natural page start through the natural page end. The browser probe recorded each wheel event, native scroll frames, active act/local progress, semantic state changes, a computed visual vector, frame intervals, long tasks, application errors, and the recorded WebM metadata.

Artifacts:

- `artifacts/review/phase-rx/baseline-continuous-scroll.webm`
- `artifacts/review/phase-rx/baseline-continuous-scroll-diagnostic.json`

Baseline video:

- resolution: `1440×900`
- duration: `25.88 s`
- bytes: `3,092,152`
- SHA-256: `4231c2405495c1373092d6658dde3003973a512b01240341b7d6fef5c164ec98`
- page/console errors: `0`

## Measured continuity defect

Across ACCESS, STARTUP, METHOD, and ACTIVITY, 96 target scroll samples were captured. Only 62 were visually responsive while native scroll moved. 31 were classified as dead visual samples after excluding act/state handoffs, for a dead visual rate of `0.3229`.

| Act | Dead samples / target samples | Dead visual rate |
| --- | ---: | ---: |
| ACCESS | 4 / 25 | 0.1600 |
| STARTUP | 4 / 25 | 0.1600 |
| METHOD | 16 / 25 | 0.6400 |
| ACTIVITY | 7 / 21 | 0.3333 |

The video-bound baseline frame timings are intentionally not treated as product runtime truth: recording/headless overhead produced p50 `33.4 ms`, p95 `116.7 ms`, and 113 observed long tasks. The accepted non-video Phase R runtime is retained as the performance comparison source.

## Root cause

### Scroll architecture

Native scrolling itself was not blocked. The page used long sticky section runways, so scroll position advanced through large ranges while the dominant composition could remain visually unchanged. This created a perceived need for repeated input even though `scrollY` was moving.

### State thresholds

ACCESS, STARTUP, METHOD, and ACTIVITY primarily selected dominant visuals through discrete `data-*` thresholds. Local progress was calculated continuously, but the main geometry often did not consume it. METHOD was the clearest case: large parts of its sticky runway remained within one geometry until a threshold flipped.

### Sticky geometry

Desktop act heights reached 300–320 svh for ACCESS/METHOD and 210 svh for STARTUP/ACTIVITY. ACTIVITY also retained a sticky runway on mobile. The issue was not sticky positioning alone; it was the combination of runway length and low visual response inside the runway.

### Transition behavior

Threshold changes used 420–1100 ms CSS transitions. During tightly spaced input, geometry could still be catching up after the next wheel event or continue moving after the user stopped. That separated visual state from current scroll position and left stale transition residue at handoffs.

### Performance

Accepted Phase R non-video runtime showed desktop p50 `16.7 ms`, p95 `50 ms`, p99 `65.115 ms`, five long tasks, and mobile p50/p95 `16.7/16.8 ms`. The primary defect was therefore response architecture, not evidence of a globally blocked main thread. R-X still remeasures runtime because direct interpolation can change per-frame work.

## Repair model

Normal mode marks the document `data-scroll-choreography="continuous"`. The existing animation-frame-coalesced controller now writes direct progress variables for:

- five ACCESS partner identity weights, scale, offset, texture shift, relationship label, and heading fade;
- STARTUP position, compression, release, constraint gap, field authority, morphology, rings, and glow;
- METHOD FIND/TEST/PROVE weights, surface geometry, focus geometry, trajectories, observations, registration plane, and word emphasis;
- ACTIVITY geometry/signal weights, scale, offset, and heading exit;
- fixed-stage layer opacities and evidence/action tone handoffs.

Semantic thresholds remain for stable state names and review landmarks. The dominant visuals no longer wait for those thresholds and no longer use time-based catch-up transitions. Reduced motion removes the continuous marker and uses its resolved document flow.

## Candidate method

The source-bound candidate repeats the exact continuous wheel profile and also records a slower review journey. A separate non-video runtime uses real desktop wheel and mobile touch-swipe input. Candidate acceptance compares dead visual samples by act, natural end reachability, input interception, snap/momentum/runtime presence, frame intervals, long tasks, errors, and historical Phase 3/Phase R runtime sources.

Candidate values are added after the implementation commit is source-bound; they are not predicted here.
