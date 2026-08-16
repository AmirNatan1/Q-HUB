# Quality Assurance

## Phase R verification contract — current

This section defines how the current seven-act homepage is verified. It is a test contract, not a result ledger. Candidate-specific totals, scores, hashes, artifact inventories, defects, preview URLs, and acceptance status belong only in the Phase R acceptance, runtime-diagnostic, and Human Review Package documents after the commands actually run against a bound candidate.

The homepage under test is:

`PRESENCE → ACCESS → STARTUP → METHOD → ACTIVITY → EVIDENCE → ACTION`

The older Phase 1–3 command results later in this file are preserved historical evidence. They must not be reused as Phase R results.

### Required command families

Run from the repository root against a production candidate. Record the exact exit code and fresh output in the Phase R acceptance ledger; do not copy historical totals.

```text
npm run check
```

This is the integrated typecheck, lint, unit-test, and production-build gate.

```text
npx vitest run tests/strategic-content.test.ts tests/phase-r-homepage-content.test.ts tests/homepage-content.test.ts tests/publication.test.ts tests/content-output.test.ts
npm run test:source-integrity
npm run release:placeholders
```

These cover the exact partner taxonomy, governed SPARK proposition, seven-act/copy-density model, publication denial and provenance stripping, homepage/Proof output intent, prohibited sources, and placeholder release boundary.

After a fresh build:

```text
npm run release:phase-r-output
npm run bundle:check
```

The built-output gate must scan the homepage and its linked public files for the exact seven-act order, five approved partners and relationships, local assets, safe actions, Maradin de-centering, denied strings, internal provenance, Drive identifiers, placeholders, and direct-record handoff. It intentionally does not treat the deeper Proof route’s approved record-specific content as a homepage leak.

The combined production-output command is:

```text
npm run release:phase-r
```

The bundle report must state the exact Phase R-versus-accepted-Phase-3 raw and
gzip deltas, split initial and lazy JavaScript, and justify any growth. Release
acceptance expects no new production dependency and rejects React, Three.js,
React Three Fiber, GSAP, or another unapproved heavy runtime. The same gate must
inventory public media and reject hidden external hotlinks.

The candidate secret scan is:

```text
npm run release:secrets
```

It scans every tracked or non-ignored candidate text file and fails closed on
recognized private-key or access-token material. Run it again after final
evidence and documentation are staged and before the closure commit.

Browser behavior is exercised with:

```text
npm run test:e2e
```

`playwright.config.ts` caps the local suite at four workers and CI at two workers. The current full release run passed `89/89` at the four-worker local cap. An earlier unconstrained ten-worker diagnostic produced resource-starvation timeouts; that run is not counted as a pass and must remain disclosed in the final ledger. Any later failure or retry must likewise be recorded rather than silently replaced by a passing total.

Candidate runtime measurement on the current Windows/PowerShell environment uses:

```powershell
$env:PHASE_R_RUNTIME_STAGE = "candidate"
$env:PHASE_R_RUNTIME_CANDIDATE_SHA = (git rev-parse HEAD).Trim()
npm run runtime:phase-r
```

The runner requires the exact `redirect/quantum-presence-startup-magnet`
branch and a clean committed tracked/untracked tree, performs a fresh production
build, and measures fixed `1440×900` desktop and `390×844` mobile profiles. The
runtime artifact must record the deterministic browser/version, viewport,
journey duration, frame intervals, long-frame counts, errors, WebGL activity,
effective canvas resolution/DPR, media activity, available memory signal, and
whether Long Task observation was actually supported. Lifecycle checkpoints
must record the settled draw delta and whether continuous drawing was observed.
Compare the six-act baseline with the seven-act candidate using normalized
rates as well as raw totals, and reject a significant regression. Synthetic
measurements are local lab evidence, not physical-device or human runtime
acceptance.

Candidate-bound Lighthouse uses a clean committed Phase R HEAD and an explicit full SHA:

```powershell
$env:PHASE_R_LIGHTHOUSE_CANDIDATE_SHA = (git rev-parse HEAD).Trim()
npm run lighthouse
```

The runner requires the exact Phase R branch and a clean committed
tracked/untracked tree. It performs six audits: `/`, `/proof/`, and
`/proof/maradin-dynamic-ground-projection/`, each on desktop and mobile. Every
Performance, Accessibility, Best Practices, and SEO score must be at least 95,
and CLS must be at most 0.05. Do not document a score until the generated Phase
R summary exists and is bound to the candidate. Lighthouse is not a substitute
for human smoothness review.

Candidate-bound review evidence must be captured from a clean committed HEAD on
`redirect/quantum-presence-startup-magnet`, with no pre-existing
`artifacts/review/phase-r/` package:

```powershell
$env:PHASE_R_EVIDENCE_CANDIDATE_SHA = (git rev-parse HEAD).Trim()
npm run evidence:phase-r
```

The capture must produce exactly 23 required PNGs, the complete 1440×900
`desktop-phase-r-journey.webm`, and the candidate-bound `manifest.json`. The
manifest must record the WebM duration, byte count, SHA-256, and candidate SHA. The
script must reject a mismatched SHA, a dirty tree, an unexpected branch, a
partial inventory, changed historical review evidence, or a journey outside
the required duration/resolution contract. Visual inspection of all PNGs and
the complete WebM remains mandatory after the automated capture passes.

### Stable homepage selector contract

Tests should observe semantic state, not private timing thresholds or incidental CSS geometry.

| Purpose | Stable selector / value |
| --- | --- |
| Experience root | `[data-experience]` |
| Seven acts | `[data-experience-phase]` with exact ordered values `presence`, `access`, `startup`, `method`, `activity`, `evidence`, `action` |
| Active act | `html[data-active-phase]` and the active section’s `[data-active]` |
| Presence reveal | `[data-presence-state="origin"]`, `[data-presence-state="resolved"]` |
| Partner choreography | `[data-partner-state="opening"]`, `[data-partner-state="strategic"]`, `[data-partner-state="founding"]`, `html[data-partner-focus]`, and `[data-partner-sequence]` |
| Partner semantics | `[data-partner-field]`, `[data-partner-id]`, `[data-partner-relationship="founding-partner"]`, `[data-partner-relationship="strategic-partner"]` |
| Field Crossing | `[data-crossing-state="outside"]`, `[data-crossing-state="threshold"]`, `[data-crossing-state="field"]` |
| Method | `[data-method-state="find"]`, `[data-method-state="test"]`, `[data-method-state="prove"]`, `[data-method-word]` |
| Activity progression | `[data-activity-state="field-testing"]`, `[data-activity-state="programs"]`, `[data-activity-state="partner-engagement"]`, `[data-activity-state="global-ecosystem"]`, and matching `[data-activity-signal]` values |
| JavaScript marker | `html[data-js="true"]`; its absence is the authored unenhanced mode |
| Rendering mode | `html[data-render-mode]` with pre-enhancement/no-JavaScript `static`, `dom-fallback-ready`, `webgl-enhanced`, `no-webgl-fallback`, or `reduced-motion`; optional canvas `[data-engine="ready"]` |
| Input mode | `html[data-input-mode="pointer"]` or `html[data-input-mode="touch-scroll"]` |
| Canvas surface | `[data-signal-canvas]` |
| Heading keepout | `[data-stage-keepout]` |
| Startup action | `[data-startup-action]` |
| Proof handoff | `[data-proof-handoff]` with `href="/proof/"` |
| Final action | `[data-work-with-quantum]` with `href="mailto:info@quantum-hub.com"` |

Internal scroll thresholds, pixel coordinates, opacity values, and generated bundle filenames are not stable public selectors. Tests may inspect them for a narrowly measured behavior, but should not make the semantic suite brittle around them.

### Required homepage behavior coverage

- Assert exactly seven semantic sections in the required order and one clear page `h1`.
- Reach every act through ordinary scrolling; navigation and actions remain usable throughout.
- Exercise all four signature state systems: Presence Reveal, Partner Field, Field Crossing, and FIND/TEST/PROVE.
- Assert exact partner membership and taxonomy: Taavura–Livnat Group and Talcar founding; VDL Group, Hyundai Motor Group, and Bazan Group strategic.
- Assert every desktop partner focus resolves as the sole borderless screen-scale identity; assert mobile renders five large sequential identity territories without overlap or overflow.
- Assert partner source paths are local, the reference composite is not rendered, and no unapproved description, metric, link, or provenance is serialized.
- Assert the concise SPARK proposition and a working startup-facing action without guarantee language.
- Assert safe activity categories without counts, event facts, unapproved company/project names, or fake feed entries; each local scroll quarter must expose exactly one complete signal and the full progression must reach all four.
- Assert Field Crossing produces three materially distinct signal shapes and material states with no repeating-gradient grid.
- Assert FIND, TEST, and PROVE are pairwise distinct in non-color instrument geometry.
- Assert the homepage public output and metadata omit the denied Maradin/project-specific string set while `/proof/` and the eligible Field Record remain functional.
- Assert the principal evidence CTA targets `/proof/`, never the direct record slug.
- Run the copy-density helper against settled public strings; do not satisfy it by visually hiding essential content.
- Assert no uncaught page exceptions or application console errors in all tested modes.

### Phase R visual-contract suite

`tests/e2e/phase-r-visual-contract.spec.ts` contains seven browser cases that make the repaired choreography measurable without snapshotting incidental pixels:

- at `1440×900`, each partner focus is the sole visible identity territory at least `55vw × 42vh`, and every identity is borderless;
- at `390×844`, all five partner territories remain at least `82vw × 38vh`, occupy ordinary vertical flow, do not overlap, and do not create horizontal overflow;
- FIND, TEST, and PROVE produce three unique geometries, with every pair changing materially beyond color; repaired PROVE must align three residual observations on a clipped registration plane and expose no checkmark-style border construction;
- desktop and mobile ACTIVITY show one high-opacity, uncropped signal and exactly one matching `[data-activity-geometry]` at a time, never overlap `QUANTUM IN MOTION`, and expose four unique geometry signatures over the deterministic progression;
- reduced motion shows all four Activity signals as ordinary, non-overlapping readable flow at desktop and mobile sizes;
- Field Crossing produces unique `outside`, `threshold`, and `field` signal/material signatures, explicitly proves round → compressed → rectilinear aspect ratios on desktop and mobile, and rejects every `repeating-linear-gradient` or `repeating-radial-gradient` descendant;
- each focused desktop Partner Field identity covers the viewport, has no border, and owns a real surface rather than a contained transparent panel.

### Mode and viewport matrix

The browser suite must cover at minimum `390×844`, `430×932`, `768×1024`, `1440×900`, and `1920×1080`, with no unintended horizontal overflow.

| Mode | Required assertions |
| --- | --- |
| Desktop/fine pointer | All acts reachable; pointer enriches only eligible moments; links/copy stay operable; lazy engine does not gate the experience. |
| Mobile/touch | Five sequential non-overlapping full-width partner identities; one contained Activity signal at a time; 44px touch-target intent; no hover-only meaning; no default canvas engine; no overflow. |
| Reduced motion | Real media query and `?motion=reduce` QA override both retain all acts, five prominent partners, both relationship groups, all four Activity signals in readable flow, and every action; no decorative loop. |
| No WebGL | `?webgl=off` retains complete DOM/CSS/SVG meaning and actions; canvas engine is absent. |
| No JavaScript | Browser context with JavaScript disabled exposes the complete reading order, resolved presence line, five partner identities/relationships, method words, all four activity categories, and actions. |
| Forced colors | Decorative stage/logo images/instruments may disappear; system text, all organization names and relationships, all four Activity labels, borders, links, actions, and visible focus remain. |
| Hidden/inactive | Visibility and phase changes stop continuous rendering outside active PRESENCE; teardown removes runtime work cleanly. |

### Accessibility assertions

- One `main`, one clear `h1`, valid section heading order, and named navigation.
- Semantic partner grouping plus textual organization names and exact relationship labels.
- Decorative canvas/SVG/field instruments hidden from assistive technology; no essential text only in canvas.
- Keyboard reachability, visible focus, no trap, conventional link behavior, and no hover-only content.
- WCAG AA contrast in settled and sampled transition states; do not assume accent colors are readable text colors.
- Axe with zero critical/serious application findings across representative desktop/mobile acts and transitions.
- Reduced-motion and forced-colors checks use actual emulated media states, not only CSS source inspection.

### Proof regression boundary

Phase R must keep `/proof/` and the current eligible Field Record behavior intact while testing only the authorized cleanup: no duplicated Evidence statement, no public internal-withholding explanation, restrained opening metadata, no header underlap, and an index-level homepage handoff. The suite must still prove the eligible record set, nested publication filtering, metadata/sitemap boundary, and absence of denied fixtures/internal provenance. It must not create or expect a second public record.

### Visual and human review

Automated screenshots must cover the required desktop/mobile acts,
reduced-motion Partner Field, no-WebGL METHOD, keyboard-focus primary startup
action, forced-colors representative state, and the complete journey required
by the Phase R review specification. Inspect original-resolution output for
hierarchy, partner scale, line breaks, clipping, overlap, fallback quality, and
the signature moments plus the authored Activity progression. Automated pass/fail does not answer the creative
questions or establish human-perceived smoothness.

# Phase 1 QA Record

## Scope and candidate

This record covers the Phase 0 foundation and the Phase 1 homepage journey through SIGNAL → APERTURE → NEED → FIND → TEST → PROVE. It covers the authored desktop, mobile/touch, reduced-motion, and no-WebGL modes. Supporting routes are reviewed only as semantic Phase 1 shells.

- **Audit date:** 2026-08-15
- **Repository:** Q-HUB
- **Branch under audit:** `phase1/field-aperture`
- **Audited implementation candidate:** `290cb217edc7236443d94df00b10739fbc795e05`
- **Environment:** Windows; Node `v24.18.0`; npm `11.16.0`; Playwright `1.62.1`; Git `2.53.0.windows.3`
- **Browsers used:** Playwright Chromium for automated gates; the Codex in-app Chromium browser for live inspection and review captures
- **Current evidence outcome:** H1–H15 pass with functional, publication, responsive, accessibility, bundle, fallback, visual, and version-control evidence. Human visual direction remains intentionally undecided.

## Exact verification commands and results

### Final build-health run

```text
npm run check
```

Exit code `0`.

- `npm run typecheck`: Astro checked 31 files; 0 errors, 0 warnings, 0 hints.
- `npm run lint`: exit code 0; no lint findings.
- `npm run test:unit`: 4 files passed, 20 tests passed.
- `npm run build`: exit code 0; 11 static pages built; Astro check again reported 0 errors, 0 warnings, 0 hints.
- Generated routes included the homepage, 404, sitemap, and all Phase 1 supporting shells.

### Focused source/publication audit

```text
npx vitest run tests/source-integrity.test.ts tests/publication.test.ts tests/content-output.test.ts
```

Exit code `0`: 3 files passed, 18 tests passed.

```text
npm run release:placeholders
```

Exit code `0`: 1 file passed, 2 tests passed. The test proves that all six structured development-record families are detected, rejected from public serialization, and safe metadata is enforced. It also proves that approved homepage narrative records contain no structured development placeholder.

### Browser suite

```text
npm run test:e2e
```

Final exit code `0`: 15 tests passed in 14.3 seconds.

Coverage in that run:

- all six semantic states exist in order, are reachable, and render distinct CSS and screenshot signatures;
- desktop pointer exploration changes aperture state without blocking copy or navigation;
- desktop, mobile/touch, reduced-motion, and forced no-WebGL journeys retain content and navigation;
- 390×844, 430×932, 768×1024, 1440×900, and 1920×1080 responsive checks pass;
- no horizontal overflow, clipped phase heading, broken visible canvas, overlapping navigation control, undersized tested mobile target, or broken scroll exit was detected;
- landmarks, heading order, names, semantic canvas equivalents, keyboard traversal, focus visibility, and no-trap behavior pass;
- axe reports zero critical or serious violations;
- page-error and application console-error collectors remain empty in the tested flows.

The first parallel run of the same command ended `1` with 14/15 passing because the mobile fallback test's `page.evaluate` lost its execution context immediately after navigation. It did not report an application exception or assertion failure in the page. The affected test was isolated and repeated:

```text
npx playwright test tests/e2e/fallbacks.spec.ts --grep "normal mobile/touch"
```

Exit code `0`: 1 test passed. The complete suite was then repeated and passed 15/15. This is recorded as a test-runner/navigation timing retry, not concealed as a clean first attempt.

Playwright workers emitted the environment warning that `NO_COLOR` was ignored because `FORCE_COLOR` was set. It is not generated by Q-HUB and did not affect results.

### Full-impact axe probe

The release test blocks critical and serious findings. A separate full-impact audit was also run against the production preview with `AxeBuilder` in a Playwright browser context. Its result was:

```text
node --input-type=module -e "import { chromium } from '@playwright/test'; import AxeBuilder from '@axe-core/playwright'; const browser = await chromium.launch({ headless: true }); const context = await browser.newContext({ colorScheme: 'dark', viewport: { width: 1440, height: 900 } }); const page = await context.newPage(); await page.goto('http://127.0.0.1:56650/'); const result = await new AxeBuilder({ page }).analyze(); console.log(JSON.stringify(result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length })), null, 2)); await browser.close();"
```

```json
[]
```

No minor, moderate, serious, or critical violation was reported for the 1440×900 homepage state at audit time.

### Forced-colors probe

An inline Playwright probe used a browser context with `forcedColors: "active"`. Result:

```text
node --input-type=module -e "import { chromium } from '@playwright/test'; const browser = await chromium.launch({ headless: true }); const context = await browser.newContext({ forcedColors: 'active', viewport: { width: 1440, height: 900 } }); const page = await context.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(error.message)); page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); }); await page.goto('http://127.0.0.1:56650/'); const result = await page.evaluate(() => ({ forcedColors: matchMedia('(forced-colors: active)').matches, navVisible: Boolean(document.querySelector('nav[aria-label=Primary]')?.getBoundingClientRect().width), mainHeading: document.querySelector('main h1')?.textContent?.trim(), canvasDisplay: getComputedStyle(document.querySelector('canvas')).display, errors: [] })); result.errors = errors; console.log(JSON.stringify(result, null, 2)); await browser.close();"
```

```json
{
  "forcedColors": true,
  "navVisible": true,
  "mainHeading": "Beyond the signal. Into the field.",
  "canvasDisplay": "none",
  "errors": []
}
```

This confirms that the semantic experience remains present while decorative canvas rendering is removed in forced colors.

### Bundle inspection

```text
npm run bundle:check
```

Exit code `0`.

- Total emitted JavaScript: 14.3 KiB raw / 6.0 KiB gzip.
- Initial JavaScript: 7.6 KiB raw / 3.3 KiB gzip.
- Lazy field engine: 6.6 KiB raw / 2.7 KiB gzip.
- Three.js: not installed, not emitted, not on the initial path.
- React Three Fiber: not installed, not emitted, not on the initial path.
- Machine-readable result: [`artifacts/bundle-report.json`](../artifacts/bundle-report.json).

### Lighthouse

```text
npm run lighthouse
```

The recorded production-build measurement in [`artifacts/lighthouse/summary.json`](../artifacts/lighthouse/summary.json) passed every configured threshold:

| Profile | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| Mobile | 100 | 100 | 100 | 100 | 0.9 s | 0 ms | 0 |

Targets are desktop 90/95/95/95, mobile 85/95/95/95, and CLS ≤ 0.05. INP is not available from this lab navigation; TBT is the reported interaction-blocking equivalent.

Earlier verifier invocations exposed runner-environment issues rather than page-score failures: one collided with a preview server owned by another audit; two restricted Windows launches refused Chrome's debugging connection; and one passing measurement lingered during managed-preview cleanup. The runner now limits reuse to loopback URLs, launches its local-build-only Chrome audit with the restricted-runner flag, explicitly stops the managed preview, and releases child-process handles. The exact `npm run lighthouse` command then exited `0` at `2026-08-15T10:32:26.892Z` with the stored all-100 category summary above. The earlier desktop Best Practices score of 96 was traced only to an implicit favicon request; explicitly linking the machine-marked provisional icon removed that deduction.

### Dependency inventory

```text
npm ls --depth=0
```

Exit code `0`. Resolved top-level versions are listed in the Human Review Package and match `package-lock.json`.

## Real-browser visual inspection

Visual inspection was performed on actual rendered browser output, not inferred from source or automated assertions. The audit examined composition, type, spacing, line breaks, clipping, overflow, state boundaries, material transitions, responsive translation, fallback quality, and the visibility of development labels.

### Evidence manifest

Desktop browser captures (actual JPEG dimensions 1425×891; the browser session was configured around the 1440×900 target and the captured content area excludes browser/scrollbar space):

- [SIGNAL](../artifacts/review/desktop-signal.jpg)
- [APERTURE](../artifacts/review/desktop-aperture.jpg)
- [NEED](../artifacts/review/desktop-need.jpg)
- [FIND](../artifacts/review/desktop-find.jpg)
- [TEST](../artifacts/review/desktop-test.jpg)
- [PROVE](../artifacts/review/desktop-prove.jpg)

Mobile/touch browser captures (actual JPEG dimensions 375×812; exact 390×844 coverage is supplied by the automated viewport test):

- [SIGNAL](../artifacts/review/mobile-signal.jpg)
- [APERTURE](../artifacts/review/mobile-aperture.jpg)
- [NEED](../artifacts/review/mobile-need.jpg)
- [FIND](../artifacts/review/mobile-find.jpg)
- [TEST](../artifacts/review/mobile-test.jpg)
- [PROVE](../artifacts/review/mobile-prove.jpg)

Fallback representatives (actual JPEG dimensions 1425×891):

- [Reduced motion / APERTURE](../artifacts/review/reduced-motion-aperture.jpg)
- [No WebGL / APERTURE](../artifacts/review/no-webgl-aperture.jpg)

The screenshots are viewport evidence. They are not physical-device photographs and do not capture motion over time.

### State-by-state findings

| State | Observed transformation | Result |
| --- | --- | --- |
| SIGNAL | Near-black field, distributed magenta contour traces, separated signals, large primary statement, and usable navigation establish abstraction and possibility. | DEMONSTRATED |
| APERTURE | A warm gridded field surface, environmental planes, contact geometry, and readout become visible beneath/through the signal layer. Pointer-driven CSS variables, coupled parallax, non-circular masks, and the lazy shader create depth response rather than a lone circular opacity mask. | DEMONSTRATED |
| NEED | Orange rails, pressure line, bounded center, and compressed composition visibly reduce degrees of freedom; the semantic constraint list is readable. | DEMONSTRATED |
| FIND | Landscape → adjacency → selection is expressed as a progressively emphasized sequence; one selected signal is isolated and explicitly labelled demonstrative. | DEMONSTRATED |
| TEST | The full-frame palette becomes warm and physical, field texture is unmasked, rails and framed test boundary create contact/resistance, and all pending values are visibly non-factual. | DEMONSTRATED |
| PROVE | Background, rhythm, and motion grammar resolve to a quiet paper/teal evidence plane; a structured six-field Proof Record dominates. | DEMONSTRATED |

### Findings, repairs, and reinspection

| Finding | Repair | Reinspection result |
| --- | --- | --- |
| Early WebGL signal masses remained too visually dominant through APERTURE and TEST, weakening the material progression. | Changed filled topology/noise masses into contour traces. Added phase-specific canvas opacity: APERTURE 0.62, NEED 0.46, FIND 0.72, TEST 0.14, PROVE 0. | Warm grid, field surface, pressure system, and TEST boundary now dominate at the appropriate moments; all six desktop captures are materially distinct. |
| Initial Lighthouse desktop performance was 79 with roughly 490 ms TBT because the WebGL driver initialized while idle. | Deferred the field engine until intentional fine-pointer exploration or entry into APERTURE/FIND. Kept hero and navigation in static HTML/CSS. | Recorded desktop performance is 100 with 0 ms TBT; field engine remains a lazy 2.7 KiB-gzip asset. |
| An implicit favicon request produced the only observed Lighthouse Best Practices/console issue. | Added and explicitly linked `public/field-aperture-icon.svg`; it is marked `data-development-media="true"` and is not presented as a Quantum logo. | Request failure is removed. The icon remains disclosed as temporary media pending BRAND-001. |
| Restricted Windows Lighthouse launches and managed Astro preview cleanup were initially unreliable. | Constrained reuse to loopback, made the local-build Chrome launch CI-safe, explicitly stopped the managed preview, and released child handles. | The final exact `npm run lighthouse` command exits `0` after writing both passing profiles; no preview server remains. |
| The first evidence capture saved desktop and mobile SIGNAL before a long smooth scroll completed, so the images did not represent SIGNAL. | Re-captured each directly at `/`, verified `data-active-phase="signal"`, the correct heading, `scrollY=0`, and zero mobile horizontal overflow before saving. | Both SIGNAL files now show the intended opening state. This was an evidence-capture defect, not an implementation defect. |
| The first representative mobile FIND frame placed the selected-signal panel below the fold and under the fixed phase rail. | Tightened the authored mobile FIND spacing and re-captured in a browser session configured around the 390×844 target after verifying `data-active-phase="find"`; the saved content area is 375×812. | The complete selection panel and its no-claim notice are visible above the rail in the final mobile FIND evidence. |
| Mobile layouts risked becoming reduced desktop compositions at the minimum viewport. | Authored a fixed bottom phase index, compact navigation disclosure, vertical sequence layouts, touch-safe targets, lighter spatial geometry, and scroll-native aperture position. | Six 375×812 content-area captures remain readable and distinct; automated checks separately pass the exact 390×844, 430×932, and 768×1024 viewports. |

### Composition and responsive review

- Primary copy is not clipped in the reviewed desktop or mobile frames.
- Deliberate line breaks remain forceful without producing orphaned primary words.
- Fixed header and phase index stay separate from critical copy; the mobile phase index remains reachable and readable.
- The bottom of FIND and PROVE intentionally continues beyond a single viewport; browser tests verify natural scroll reaches the complete content and exits the sequence.
- The repaired representative mobile FIND frame keeps the complete selected-signal panel and its no-claim notice above the fixed phase rail. The longer state still continues naturally beyond one viewport.
- No unintended horizontal overflow was observed or detected at any required viewport.
- Canvas dimensions are valid at all required viewports and canvas failure cannot remove semantic content.
- Desktop navigation is immediately visible; mobile navigation is a conventional keyboard/touch-operable disclosure.
- Pointer exploration changes multiple spatial/material variables while the stage itself remains `pointer-events: none`, so content and navigation are not obstructed.
- Reduced motion is a resolved split abstraction/field composition with static semantic progression, not blanket content removal.
- The no-WebGL frame is composed and readable using DOM/CSS field geometry.

## Accessibility review

- One `main` landmark and one page `h1` are present; each phase has a labelled heading.
- Primary and phase navigation have accessible names.
- All tested visible controls are reachable by Tab, expose a visible focus treatment, and return control without a trap.
- The canvas and development field media are decorative/`aria-hidden`; every phase meaning and state label exists in semantic DOM.
- Essential content never depends on hover, pointer precision, WebGL, or animation.
- Mobile tested targets meet the 44px intent within the automated selector scope.
- Forced-colors CSS removes canvas/media decoration, restores system borders/focus, and preserves navigation and the main heading.
- Reduced-motion behavior is activated by the real media query and by a dedicated QA query override.
- axe found no violations at any impact in the additional desktop probe; the release suite confirms zero critical and zero serious findings.

## Runtime and fallback review

- Normal desktop, normal mobile/touch, reduced motion, and `?webgl=off` all render the six semantic sections and usable navigation.
- The browser suite recorded no application-generated console errors or uncaught page exceptions in the final pass.
- The WebGL initializer is guarded, dynamically imported, and wrapped in fallback handling.
- Rendering is continuous only for SIGNAL, APERTURE, and FIND; it pauses for inactive/settled phases and document visibility.
- DPR is capped at 1.5 desktop and 1 mobile; resize and context cleanup are implemented.
- No video or photographic media is requested in Phase 1.

## Known limitations and defects

### Visual compromises disclosed for human review

- No approved Quantum photography, POC video, logo, fonts, or final brand-color values were available. The field surface is intentionally procedural, typography uses centralized system stacks, colors are explicitly provisional, and the favicon is a provisional interface icon.
- The current field layer communicates physicality through grid, plane, texture, boundary, and heat rather than documentary evidence. P0 assets are required before this can become a truthful real-world scene.
- APERTURE, NEED, FIND, and TEST deliberately retain the signal contour substrate for continuity; the repetition still reduces material differentiation in static captures, especially before real field media replaces the development layer.
- Several development-only stage/media captions are intentionally subordinate and appear very small or low-contrast in the review JPEGs. They are not the sole carrier of essential meaning, but their review utility and legibility should be judged by the human reviewer.
- Motion is evidenced by live browser inspection, the coupled two-layer implementation, and Playwright state-change assertions; no review video was captured.
- Screenshots demonstrate browser viewports, not physical devices or GPU diversity.

### Technical defects

- No known application technical defect remains in the audited Phase 1 candidate.
- A first fully parallel e2e run required one navigation-timing retry, as recorded above.
- Deployment is unavailable because the saved Cloudflare authentication is expired and no usable non-interactive API token is present. This does not create a local application defect, but it prevents a real preview URL.
- Because no verified production host exists, the local build intentionally falls back to `http://localhost:4321` for canonical, Open Graph URL, and sitemap origins. A real release must set `SITE_URL` to the verified deployment origin and rebuild; `.env.example` records the requirement.
- Version-control closure passed: the audited implementation candidate is `290cb217edc7236443d94df00b10739fbc795e05`; staged/worktree secret scans found no high-confidence credentials; the candidate was clean after commit; and the branch was pushed normally to `origin/phase1/field-aperture`. The subsequent handoff commit changes only the H15/review documentation.

## Phase 2 boundary

No Phase 2 real-media integration was performed. The approved-asset retrieval order is maintained in [`docs/ASSET_REQUESTS.md`](ASSET_REQUESTS.md), and the current procedural/placeholder layers must remain until publication-approved replacements are supplied.

## 2026-08-15 — Phase 1 visual-grammar repair QA

This dated section supersedes earlier candidate, evidence-count, bundle, Lighthouse, video, and defect-status statements in this file. The detailed current records are [PHASE1_REPAIR_ACCEPTANCE.md](PHASE1_REPAIR_ACCEPTANCE.md) and [PHASE1_REPAIR_REVIEW_PACKAGE.md](PHASE1_REPAIR_REVIEW_PACKAGE.md).

### Candidate and evidence identity

- Accepted baseline: `290cb217edc7236443d94df00b10739fbc795e05`.
- Prior documentation handoff: `9e10f5b2d9c70b4388933bd81bae6d2ac8747ca0`.
- Frozen repair candidate: `3d03033d05910ee9c27c5eb050fecccbabebaaf8`.
- Branch/upstream: `phase1/visual-grammar-repair` → `origin/phase1/visual-grammar-repair`; candidate push was normal, without force.
- Current gate status: R1–R12 and refreshed H1–H15 PASS.
- [Repair manifest](../artifacts/review/repair/manifest.json): generated `2026-08-15T12:58:33.900Z`, source-bound to the frozen candidate, baseline integrity verified unchanged after capture.
- [Pixel analysis](../artifacts/review/repair/analysis.json): generated `2026-08-15T12:58:42.652Z`, status PASS.
- Evidence inventory: 14 baseline records, 14 repaired PNG captures, and one 1,594,206-byte desktop WebM; all 29 recorded files match their SHA-256 and byte count.

Visual inspection covered all six baseline desktop JPEG/repaired desktop PNG pairs, all six repaired 390×844 mobile PNGs, reduced-motion and no-WebGL APERTURE PNGs, and sampled frames through the complete 1440×900 WebM. SIGNAL now has 96.522% dark space, 0.090% magenta, and 0% thick magenta core. APERTURE has 18.511% warm field, 0.002% magenta, 2 warm-dominant cells, and 9 dark-dominant cells. PROVE has 0% magenta. Desktop NEED/PROVE content clears the phase rail; mobile PROVE controls are visible, focusable, and contrast-tested.

### Fresh command results

| Command | Result |
| --- | --- |
| `npm run check` | Exit 0; Astro 34 files / 0 diagnostics; lint 0 findings; Vitest 4 files / 20 tests; build 11 pages. |
| `npm run release:placeholders` | Exit 0; 1 file / 2 tests. |
| `npm run bundle:check` | Exit 0. Total JS 20,271 bytes (19.8 KiB) raw / 7,725 (7.5 KiB) gzip; initial 8,598 (8.4 KiB) / 3,681 (3.6 KiB); lazy engine 11,673 (11.4 KiB) / 4,044 (3.9 KiB); Three/R3F absent. |
| `npm run test:e2e` | 28/28 expected; no unexpected, flaky, or skipped tests. The focused repair-grammar suite passes 10/10. The `NO_COLOR`/`FORCE_COLOR` line is a runner warning. |
| `npm run lighthouse` | Exit 0; summary generated `2026-08-15T13:00:45.959Z` with embedded source HEAD. |

Lighthouse reports desktop/mobile 100/100/100/100 for Performance/Accessibility/Best Practices/SEO. Desktop LCP is 0.3s, TBT 0ms, CLS 0. Mobile LCP is 1.0s, TBT 0ms, CLS 0. These are local initial-page lab results, not field telemetry; all-state/transition accessibility is separately evidenced below.

### Accessibility finding, repair, and reinspection

The audit found transient contrast failures under the earlier interpolated readable-UI palette and moderate `region` findings for visible HUD/notice text outside a landmark. The repair switches readable UI discretely between resolved phase palettes and makes the experience HUD an explicitly named `aside`.

- The 28-test suite scans all six settled phases at 1440×900 and 390×844. Every state has zero critical/serious axe violations, zero `region` violations, and no visible HUD text outside a named region.
- The suite samples desktop TEST → PROVE and mobile APERTURE → NEED at +0, +180, +520, and +900ms; every sample passes.
- An independent audit directly sampled APERTURE → PROVE at +24, +120, +360, +760, and +1200ms on both viewports—10 samples—with zero critical/serious and zero moderate-region findings.
- The same independent audit sampled PROVE → APERTURE at +24, +360, +760, and +1200ms on both viewports with the same clean result.
- The independent audit restored the earlier `688cb7b` declarations in-browser and reproduced the original failure, confirming that the current clean result comes from the repair rather than an insensitive probe.

H9, R1, R9, and R10 now pass. Keyboard/focus, forced colors, reduced motion, semantic canvas equivalence, stable microcopy, actual-background FIND text, and mobile PROVE controls remain green.

### Current limitations and closure

- Approved Phase 2 documentary footage/stills, factual proof data, official identity, fonts, final colors, and favicon are still unavailable. All development content/media and route shells remain machine-marked and non-factual.
- Testing remains Chromium-centric; no physical device, Safari, Firefox, broad GPU, or dedicated screen-reader session is claimed.
- `CLOUDFLARE_API_TOKEN` and `SITE_URL` are unset. Wrangler 4.123.0 reports expired non-interactive authentication; no deployment was attempted and no URL exists. Canonical/Open Graph/sitemap origins remain on the documented localhost fallback until a verified host is supplied.
- The candidate push is confirmed. Evidence/docs closure commit `0bdf3631ff9f29394a25ed89fdcd745827aff52e` was followed by a clean-tree check, 0 high-confidence secret/token matches, 0 credential-assignment matches, an independent clean source/public-output audit, and a normal push to `origin/phase1/visual-grammar-repair`. No force push was used; H15 passes.

**STOP. Do not begin Phase 2.** Return the repaired experience to human review for **ACCEPT**, **REPAIR**, or **REDIRECT**.

## 2026-08-15 — Phase 2 Maradin real-field QA

The human subsequently selected **ACCEPT** for the Phase 1 repair and authorized the supplied Phase 2 goal. This section preserves the earlier Phase 1 audit as historical evidence and records the Phase 2 verification boundary.

### Implemented review scope

- Official Quantum full/icon SVG masters replace the provisional navigation identity and favicon.
- SIGNAL remains Quantum-led; approved Maradin material enters only from APERTURE onward.
- APERTURE reveals the approved field film through the accepted boundary; TEST contains its approved film inside the enclosure; PROVE uses approved stills and a typed Proof record.
- Native media uses lazy `data-src`, `preload="none"`, muted inline playback, posters, inactive pause, a static reduced-motion path, and no-WebGL independence.
- Homepage development markers are removed only where the approved record resolves them. Later-phase route shells and non-public development families remain detectable.
- Raleway/Comfortaa are intended token families, but no font binaries were supplied; local fallbacks remain (`FONT-001`).

### Final command and browser record

Results below are source-bound to implementation candidate `d88f2020851325890e8951d88373475243ef9d1a`. Earlier Phase 1 results were not reused as Phase 2 evidence.

| Verification | Phase 2 final result |
| --- | --- |
| `npm run check` | **PASS** — Astro checked 39 files with 0 errors/warnings/hints; ESLint passed; Vitest passed 31/31 across 5 files; build emitted 11 static pages. |
| `npm run release:placeholders` | **PASS** — 2/2 tests in 1 file. |
| `npm run media:check` | **PASS** — 9 assets; 9,326,266 bytes total; 8,095,824 video bytes. |
| `npm run bundle:check` | **PASS** — total 20,852 raw / 7,961 gzip; initial 9,179 / 3,917; lazy 11,673 / 4,044; no Three/R3F. |
| `npm run test:e2e` | **PASS** — 37/37 tests. Twenty axe snapshots report 0 critical/serious findings. |
| `npm run lighthouse` | **PASS** — desktop and mobile 100/100/100/100; candidate-bound summary. |
| `npm run evidence:phase2` | **PASS** — exact required screenshot/video inventory and candidate-bound manifest. |
| Secret/prohibited-source/public-output scans | **PASS** — 0 high-confidence secrets, 0 credential assignments, 0 protected/prohibited `dist` matches, and 0 authoring-only source files in `dist`. |

Bundle growth from the frozen Phase 1 baseline is controlled: total and initial raw/gzip deltas are both `+581/+236` bytes. Total gzip remains below 10 KiB and the initial gzip delta remains below approximately 1 KiB.

Candidate-bound Lighthouse metrics:

| Profile | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop | 100 | 100 | 100 | 100 | 361.8777 ms | 0 ms | 0 |
| Mobile | 100 | 100 | 100 | 100 | 1480.38845 ms | 22 ms | 0 |

Playwright covers 390×844, 430×932, 768×1024, 1440×900, and 1920×1080. Axe coverage comprises all six settled phases on desktop and mobile plus four TEST → PROVE desktop transition samples and four APERTURE → NEED mobile samples. Actual-media-background contrast passes.

### Visual evidence and inspection

`artifacts/review/phase2/manifest.json` is bound to source HEAD/candidate `d88f2020851325890e8951d88373475243ef9d1a`, the correct branch, and a clean tree at evidence start. Capture used an Astro production preview with development mode disallowed. The package contains exactly 7 desktop 1440×900 PNGs, 6 mobile 390×844 PNGs, 3 fallback 1440×900 PNGs, and one complete 1440×900 WebM. Total package bytes including the manifest are 11,043,751.

The journey WebM is 2,154,513 bytes with SHA-256 `2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7`. Thirty-two Phase 1 evidence files were verified unchanged; inventory digest `88ffd3ca6965e0fb063d56b6e65979796c017fa3326251b729e7c4228a31f8c5`.

All 16 PNG frames were inspected at original resolution. Hierarchy, focal crops, text plates, visible marks, static reduced-motion/no-WebGL paths, TEST physicality, and PROVE stillness appear intentional. No visible subtitle contamination or blocking technical visual defect remains. This is a technical QA result; human creative judgment remains undecided.

### Phase 2 known limitations and H15 closure

- `FONT-001` remains narrowly unresolved because the approved pack contains no licensed font binaries. No runtime font service is used.
- Cloudflare remote preview is unavailable. `npx wrangler whoami` reports: “Not logged in. Your auth token has expired and could not be refreshed, and the environment is non-interactive.” Its external log write also failed with sandbox `EPERM`. No remote preview or production deployment was attempted or claimed; only local production-preview evidence exists.
- Browser evidence is Chromium/local-lab coverage rather than physical-device, Safari, Firefox, field telemetry, or dedicated screen-reader testing.
- No known application technical defect remains. Human creative judgment remains undecided.
- The implementation candidate `d88f2020851325890e8951d88373475243ef9d1a` and evidence/documentation closure `939b2b3386e468dc995e70bce054bce8b7e44e4a` were normally pushed with upstream set and no force. The tree was clean immediately after the closure push; H15 passes.
- No supporting-route redesign, broader Proof library, second story, ACT 07/08/09 work, main merge, or production deployment is part of this checkpoint.

## 2026-08-15 — Phase 2 final visual integration repair QA — candidate stage

The human Phase 2 decision is **REPAIR**. This dated section supersedes only the prior Phase 2 candidate/defect-status conclusions where they conflict with the human findings; the original Phase 2 records and artifacts remain historical evidence. Current detailed candidate-stage ledgers are [PHASE2_REPAIR_ACCEPTANCE.md](PHASE2_REPAIR_ACCEPTANCE.md) and [PHASE2_REPAIR_REVIEW_PACKAGE.md](PHASE2_REPAIR_REVIEW_PACKAGE.md).

### Superseded subtitle conclusion

The earlier Phase 2 QA stated that no subtitle contamination remained after inspecting 16 committed PNGs. That conclusion was insufficient because the static APERTURE screenshots did not sample the relevant playback interval. Human review of the committed 1440×900 journey found baked source-film text containing “…embedded in the vehicle” around journey time 9.2–9.6 seconds. Direct diagnostic inspection localized the source-film subtitle to approximately 2.90–3.15 seconds of the 3.2032-second APERTURE MP4.

The old static-frame claim is therefore superseded. Repair acceptance requires explicit desktop/mobile/no-WebGL sampling of that source interval, a clean reduced-motion poster, and visual inspection of a complete APERTURE loop inside a new candidate-bound journey WebM.

### Narrow repair scope

1. Exclude the APERTURE subtitle band with deterministic crop/scale/positioning while retaining the vehicle, field environment, projection behavior, and physical scale.
2. Reduce TEST opaque metadata dominance so real footage owns at least half of the desktop frame and remains materially inspectable on mobile.
3. Reposition the two existing PROVE stills so the projected stop symbol and Quantum test vehicle are immediately visible on desktop/mobile.
4. Remove public approval-workflow language while retaining the internal B + approved record and deny-by-default publication filter.

No source replacement, generated imagery, invented measurement, new Proof story, route expansion, later act, Phase 1 reopening, font resolution, merge, or deployment is authorized.

### Preserved system contract

The repair preserves `SIGNAL → APERTURE → NEED → FIND → TEST → PROVE`, `ENGAGE → CONSTRAIN → LOCK → DWELL → RELEASE`, SIGNAL, APERTURE interaction/headline, NEED rails, FIND convergence, TEST enclosure/left statement, PROVE white/teal release, navigation, phase rail, schemas, semantic state attributes, mobile, reduced motion, no-WebGL, official identity, approved Maradin facts, dependency boundary, and `FONT-001` status.

### Candidate and gate state

- Frozen implementation baseline: `d88f2020851325890e8951d88373475243ef9d1a`.
- Historical final Phase 2 handoff: `1ca36be5581dd33d8230f56876580fee4a386904`.
- Repair implementation candidate: `eb8ca7de932d7b52a74026b66150f1e9c215438c`.
- Clean candidate tree at evidence start: **PASS** — the manifest records `workingTreeCleanAtStart: true` and an empty porcelain status.
- Candidate-bound repair manifest: `artifacts/review/phase2-repair/manifest.json`, 54,431 bytes, SHA-256 `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124`.
- P2-1–P2-10: **PASS**.
- H1–H15: **PASS**.
- Build/typecheck/lint/unit/build: **PASS** — Astro checked 41 files with 0 errors, warnings, or hints; ESLint passed; Vitest passed 32/32 across 5 files; 11 static pages built.
- Focused source/publication/output tests: **PASS** — 25/25 across `source-integrity`, `publication`, and `content-output` after the fresh production build.
- Placeholder/media/Playwright/axe/bundle/Lighthouse/source-output/secret results: **PASS** — placeholder 2/2; 9 approved assets / 9,326,266 bytes; Playwright 41/41; zero critical/serious axe findings; total JavaScript 20,852 raw / 7,961 gzip and initial JavaScript 9,179 / 3,917 with no Three.js/R3F; desktop and mobile Lighthouse 100/100/100/100 with CLS 0; zero protected/prohibited public-output, high-confidence secret, or credential-assignment matches.
- Original-resolution PNG and complete-WebM inspection: **PASS** — all 16 PNGs were inspected at original resolution; the complete 19.28-second WebM played from 0.00 seconds through `ended: true`; exact paused samples spanning journey times 9.211–9.602 seconds and source times 2.95/3.15 seconds were clean; no blocking visual defect was found.
- Version-control closure: **PASS** — candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`, evidence/docs closure `e5a2f9725390377c74131c892e3358e224b1e780`, and this final docs-only handoff were scanned, committed, and normally pushed without force. Final local/upstream/remote equality and an empty status were verified. No merge or deployment occurred.

No prior Phase 2 count, Lighthouse score, bundle metric, or PASS label is inherited by the repair candidate. All must be rerun and recorded against the committed repair candidate.

### Required repair evidence

The new package is isolated under `artifacts/review/phase2-repair/` and must preserve all prior review artifacts byte-for-byte. Its exact 18-file plan is 16 PNGs, one WebM, and one manifest: `baseline-aperture-subtitle-9-40s.png`; seven desktop APERTURE frames at source times 0.17, 1.84, 2.57, 2.81, 2.95, 3.15, and 3.20 seconds; `desktop-need.png`; `desktop-test-0-70s.png`; `desktop-prove.png`; `mobile-aperture-3-05s.png`; `mobile-test-0-70s.png`; `mobile-prove.png`; `fallback-reduced-motion-aperture.png`; `fallback-no-webgl-aperture-3-05s.png`; `desktop-repair-journey.webm`; and `manifest.json`. The journey must dwell in APERTURE longer than one full source loop, and the manifest must record hashes, bytes, exact media times, geometry, workflow-language audit, and prior-evidence integrity.

Before/after review must cover subtitle contamination, TEST media visibility, PROVE focal crops, and public workflow labels. Automated tests support but do not replace human visual inspection.

The completed candidate-bound package contains exactly 16 PNGs, one WebM, and one manifest (18 files, 13,789,821 bytes). The 16 PNGs total 11,353,783 bytes and decode at their recorded 1440×900 or 390×844 dimensions with unique hashes. The 1440×900 journey is 19.28 seconds, 2,381,607 bytes, SHA-256 `885fb328a4ac59d6f70e8d1771ebe092ed218b7538bdc0e8f583c67988b92c89`; its 4,207.2 ms APERTURE dwell exceeds the 3,203.2 ms source loop by 1,004.0 ms. All 50 prior evidence files remain byte-for-byte unchanged (33,528,579 bytes; digest `81b51cb6e6902fb5a3d33314f1ddac206061a86096efae21b272df57d5602b69`).

Measured repair results pass their deterministic boundaries: APERTURE excludes the bottom 13.792–13.793% subtitle band on desktop, mobile, reduced motion, and no-WebGL; TEST leaves 71.6412% of the desktop film and 55.3346% of the mobile film unobstructed; PROVE exposes the stop symbol and vehicle with zero caption overlap on desktop and mobile; and all 10 audited routes contain zero visible workflow-language or rejected-phrase matches.

### Limitations and stop condition

- `FONT-001` remains unresolved by instruction.
- Remote deployment and production deployment are not authorized; only local production-preview evidence is expected.
- Unless stronger evidence is actually recorded, coverage remains Chromium/local-lab rather than physical-device, Safari, Firefox, field telemetry, or dedicated screen-reader testing.
- Supporting routes and later acts remain out of scope.

R2-A through R2-D, P2-1 through P2-10, and H1 through H15 pass against the committed candidate and verified closure. The independent original-resolution visual audit also passes. No merge or deployment occurred. Stop here for **ACCEPT / REPAIR / REDIRECT**.

## 2026-08-16 — Phase 3 Proof system QA — candidate stage

The authoritative Phase 3 ledger is [PHASE3_ACCEPTANCE.md](PHASE3_ACCEPTANCE.md); the visual inventory and unanswered creative questions are in [PHASE3_REVIEW_PACKAGE.md](PHASE3_REVIEW_PACKAGE.md). This section records measured technical results only.

### Candidate and scope

- Branch: `phase3/proof-system`.
- Phase 2 final handoff ancestor: `e1a21642d0cab50a81510f934e6e7f41425fc851`.
- Phase 3 feature commit: `7af011e486c28d098467cffbed088ce55480a16e`.
- Phase 3 implementation/evidence candidate: `70d8b5cc193311b9548c49399dde6a014583e13a`.
- Public Proof routes: `/proof/` and `/proof/maradin-dynamic-ground-projection/` only.
- Public Proof records: Maradin only.
- No second story, unrelated route completion, later act, main merge, or deployment is included.

### Verification results

| Command / check | Result |
| --- | --- |
| `npm run check` | **PASS** — Astro checked 49 files with 0 errors, warnings, or hints; ESLint passed; Vitest passed 39/39 across 5 files; 12 static pages built. |
| `npm run release:placeholders` | **PASS** — 2/2 placeholder-release tests. |
| `npm run release:phase3-output` | **PASS** — exactly 2 Proof HTML routes, 4 approved media assets, and 19 browser-facing text artifacts; denied fixtures and internal provenance absent. |
| Focused publication/source/content/homepage tests | **PASS** — 37/37. |
| `npm run test:e2e -- tests/e2e/phase3-proof.spec.ts --workers=1` | **PASS** — 19/19 across both routes and all required viewport behaviors. |
| `npm run test:e2e -- --workers=1` | **PASS** — 60/60 sequential full-suite cases. |
| Phase 3 axe gates | **PASS** — zero critical/serious findings on index and record, desktop and mobile. |
| `npm run bundle:check` | **PASS** — total 20,852 raw / 7,961 gzip; initial 9,179 / 3,917; lazy 11,673 / 4,044; exact Phase 3 delta 0; no Three.js/R3F. |
| `npm run media:check` | **PASS** — 9 approved assets, 9,326,266 bytes total, 8,095,824 video bytes; source film not reintroduced. |
| `npm run lighthouse` | **PASS** — all six homepage/index/record desktop/mobile runs score 100/100/100/100; TBT 0 ms and CLS 0. |
| `npm run evidence:phase3` | **PASS** — exact 14-PNG inventory plus manifest, candidate-bound and historical-evidence preserving. |
| Secret/prohibited-source/public-output scans | **PASS** — zero high-confidence secret, credential-assignment, protected-source, denied-fixture, or internal-provenance matches. |

The first unconstrained 10-worker full Playwright diagnostic passed 50 tests and timed out 10 existing WebGL-heavy homepage cases under concurrent GPU/readback and teardown saturation. This was not hidden or counted as a release pass. The complete sequential rerun passed 60/60 and is the closure result.

### Candidate-bound Lighthouse

Source HEAD is `70d8b5cc193311b9548c49399dde6a014583e13a`. The tracked summary is `artifacts/lighthouse/phase3/summary.json`.

| Route | Profile | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | Desktop | 100 | 100 | 100 | 100 | 0.4 s | 0 ms | 0 |
| `/` | Mobile | 100 | 100 | 100 | 100 | 1.1 s | 0 ms | 0 |
| `/proof/` | Desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 |
| `/proof/` | Mobile | 100 | 100 | 100 | 100 | 1.2 s | 0 ms | 0 |
| Maradin Field Record | Desktop | 100 | 100 | 100 | 100 | 0.5 s | 0 ms | 0 |
| Maradin Field Record | Mobile | 100 | 100 | 100 | 100 | 1.9 s | 0 ms | 0 |

### Visual evidence and integrity

`artifacts/review/phase3/manifest.json` is bound to candidate `70d8b5cc193311b9548c49399dde6a014583e13a`, the correct branch, and a clean candidate tree at capture start. The package contains exactly 14 PNGs plus the manifest (15 files, 2,747,640 bytes). Nine captures are 1440×900 and five are 390×844. The manifest is 23,324 bytes with SHA-256 `ebe02fca90fdabe9af7313d32bf90f73044054fd476c2289147ec61fb3e41d98`.

All 14 PNG hashes, byte counts, and dimensions independently match the manifest. All 68 historical review files remain byte-for-byte unchanged (50,036,884 bytes; digest `eb769e01a6001bb37aadac4fc60842db819eea7a21c64e8d28b7b24dee0fc104`). Every PNG was inspected at original resolution. A capture-only paint race found in an initial uncommitted set was repaired before the final candidate-bound set; the final technical audit passes 14/14 with all headers and approved media rendered.

### Known limitations and pending closure

- Creative quality is not self-approved. The human review questions remain unanswered.
- Browser coverage is Chromium/local-lab rather than physical-device, Safari, Firefox, field telemetry, or dedicated screen-reader testing.
- Lighthouse is local production-preview lab evidence.
- The optional navigation/scroll WebM was not produced.
- `FONT-001` remains the accepted unresolved Phase 2 limitation.
- Remote preview and production deployment are not authorized. The last accepted Cloudflare authentication check reported exactly: “Not logged in. Your auth token has expired and could not be refreshed, and the environment is non-interactive.” No preview URL is claimed.
- P3-12 passes through evidence/docs closure `ca92063213e15fbf404fa5669ccb7375ffce3ef1`: it was normally pushed with upstream set, local/upstream/remote equality was exact, and the tree was empty immediately after verification. This final docs-only handoff records that result and is normally pushed before the final report. No force, merge, or deploy occurred.

## 2026-08-16 — Phase R human creative repair QA

The human disposition on Phase R implementation candidate `65907148bafec7cfe02f6c6d73154e3269f5d0e0` was **REPAIR**, not redirect. The repair was restricted to PROVE, ACTIVITY, STARTUP Field Crossing, and Partner Field. The accepted seven-act architecture, public copy/facts, Proof system, publication boundary, PRESENCE, EVIDENCE, ACTION, navigation, mobile semantics, and lightweight runtime contract remained frozen.

### Candidate chain

- Pre-repair branch HEAD: `36bbc56c9d71881fd8bc2ba63ac59e87a4dac3d7`.
- Final repaired production implementation: `8fe8f0a07199c07098dbfade6ba5d6506b249b03`.
- Runtime measurement / closure: `953881b5cc0317dda0f6751407e180fc9ef0359f` / `e1f9e8672a288f1cc0a12c01fd1d9297de645c6e`.
- Lighthouse measurement / closure: `a56362f5f359424bbbfa5682cdefe763c5d7e5d4` / `9bc1cb1a8742c1d240b5b49de3894293fc80bbae`.
- Final review capture source / tree: `a6645381b0e3cebcb050e38b8aec6a11aefbdaf3` / `3592b0b33f31230773a9d57023bb01ec46bf5924`.

### Final gate record

| Verification | Final result |
| --- | --- |
| `npm run check` | **PASS** — Astro 0 errors/warnings/hints; ESLint passed; Vitest 50/50; 12 static routes built. |
| `npm run test:e2e` | **PASS** — 93/93 Chromium cases at the configured four-worker cap. |
| `npm run release:phase-r` | **PASS** — 7 acts, 5 partners, 15 homepage-linked public files; Phase 3 output 2 routes / 4 media / 20 browser-facing text artifacts; bundle and secret gates passed. |
| Final `npm run release:secrets` | **PASS** — 135 candidate text files checked; 184 binary/oversize files skipped. |
| `npm run runtime:phase-r` | **PASS as synthetic evidence** — final desktop/mobile candidate artifacts, zero application errors, mobile WebGL off, lifecycle disclosures retained. |
| `npm run lighthouse` | **PASS** — all six route/profile audits meet category ≥95 and CLS 0. |
| `npm run evidence:phase-r` | **PASS** — exactly 23 PNGs, one 1440×900 WebM, and one manifest. |

The browser suite includes the four added repair assertions: PROVE resolves as spatial registration without completion UI; all four ACTIVITY states have unique geometry signatures; Field Crossing has round/compressed/rectilinear aspect-ratio states on desktop and mobile; and the focused partner surface is screen-scale and borderless. Existing responsive, overflow, axe, keyboard/focus, reduced-motion, no-WebGL, no-JavaScript, forced-colors, publication, Proof, and runtime lifecycle coverage remains in the 93-case total.

The first full repair browser run passed 92/93. The one failure exposed a four-pixel reduced-motion desktop Partner Field overflow from an offscreen pseudo-material layer. A temporary overflow diagnostic first used TypeScript generic syntax invalid inside page-evaluated JavaScript; it was corrected, the real source was identified and repaired, the focused case passed, and the full suite then passed 93/93. The 92/93 run is not treated as evidence of product acceptance.

### Bundle

Final JavaScript is unchanged from the pre-repair Phase R candidate: 22,400 raw / 8,299 gzip total, 10,786 / 4,290 initial, and 11,614 / 4,009 lazy. Each pre-repair delta is zero. No production dependency was added; no React, React DOM, Three.js, R3F, GSAP, or listed heavy runtime is present.

### Runtime and Lighthouse

Desktop runtime measured 11,694.0 ms, p50/p95/p99 16.7/50.0/65.115 ms, 105 intervals over 33.3 ms, 10 over 50 ms, five long tasks totaling 356 ms, 86 ms maximum, and zero application errors. Draw totals were 78 PRESENCE, 14 STARTUP, and 22 METHOD; other acts drew zero. Settled deltas were 10/0/7/1/0/0/0. Mobile measured 8,248.2 ms, p50/p95/p99 16.7/16.8/18.768 ms, four intervals over 33.3 ms, none over 50 ms, no long tasks/errors, and no WebGL.

The desktop maximum long task improved from 115 ms pre-repair to 86 ms, while long-task count and total rose from 4/306 ms to 5/356 ms and intervals over 33.3 ms rose by one. STARTUP's transient post-scroll one-shot draw window remains disclosed. The synthetic results do not establish Cloudflare-preview smoothness.

Lighthouse exact results (Performance / Accessibility / Best Practices / SEO): homepage desktop 100/100/100/100 and mobile 100/100/100/100; Proof index desktop 100/100/100/100 and mobile 99/100/100/100; Maradin record desktop 100/100/100/100 and mobile 96/100/100/100. LCP values are 0.4/1.7, 0.4/1.8, and 0.7/2.5 seconds; TBT values are 0/30, 0/0, and 0/0 ms; all CLS values are 0.

### Review evidence and inspection

The final `artifacts/review/phase-r/` package is bound to `a6645381...`, contains exactly 23 PNGs, one WebM, and one manifest, and totals 11,351,859 bytes. The 1440×900 WebM is 81.64 seconds, 6,223,307 bytes, SHA-256 `72a91a9257212e0c496de3485c295b6ecb035934de968498304d342b1729f9c1`. The 84,032-byte manifest hash is `3fa3c26c339b54c0870393b59c0257e7653b78460ee96f209bd49e98fca29abc`; it records zero console/page/request errors. All 158 historical review files remained unchanged during final capture (78,353,262 bytes; digest `e65a804806f57091891a840ba77ab2903527658948d45b3d2411ca92af6eded5`).

All 23 PNGs were inspected individually. The complete WebM played in real time from 0.00 seconds to its natural 81.64-second `ended: true` state without seeking. Decoded-frame inspection confirmed the round → compressed → rectilinear Field Crossing, edge-to-edge partner transitions, spatial PROVE resolution, ACTIVITY choreography, and complete ACTION ending. This is a technical/evidence statement, not creative acceptance.

Earlier review packages were preserved because visual inspection exposed a Taavura logo rectangle and then a reduced-motion partner contrast regression. Both were repaired before the final package. Two subsequent capture attempts completed rendering but failed final OneDrive promotion with `EPERM`; fail-closed behavior left no partial canonical package, and a narrow sibling-staging correction produced the successful final package. The historical original Phase R unconstrained ten-worker resource-starvation diagnostic also remains disclosed and is not counted as a pass.

### Limitations and boundary

- Cloudflare branch-preview smoothness on the owner's ordinary hardware has not yet been proven. No branch preview was deployed or manually tested, and no claim is made that the historical real-world lag is solved.
- Coverage remains local Chromium/headless/SwiftShader rather than physical-device, Safari, Firefox, field telemetry, or dedicated screen-reader testing.
- No merge, deployment, or later-phase work is part of this repair closure.
- Automated PASS is not human ACCEPT. The package returns to the human reviewer for the next Phase R disposition.
