# Phase R-X Acceptance Ledger

**Decision owner:** Human reviewer

**Agent decision:** Not authorized

**Starting Phase R HEAD:** `36e750ed2ae265440c5546e24deebda74db5255a`

**Candidate branch:** `repair/phase-rx-experience-integration-scroll-fluidity`

This ledger records only commands and evidence actually produced for Phase R-X. Historical Phase 3 and Phase R results are comparison sources, not new R-X passes. Failed attempts and limitations remain recorded rather than being replaced by a later success.

## Acceptance conditions

| Gate | Required result | Candidate result |
| --- | --- | --- |
| Scope | Homepage integration only; no supporting-route redesign or publication expansion | Pending final ledger |
| Native scroll | Real wheel/touch reaches natural page end; no interception, snap, custom momentum, or smooth-scroll runtime | Pending final diagnostic |
| Continuous response | ACCESS, STARTUP, METHOD, and ACTIVITY geometry changes through tightly spaced forward input; METHOD reverses immediately | Pending final browser result |
| Spatial integrity | Desktop/wide/tablet/mobile review has no text collision, crop, horizontal overflow, stale residue, or trapped sticky scene | Pending final visual ledger |
| Semantic contract | Seven ordered acts, one `h1`, exact partners/taxonomy, four Activity labels, safe actions, Proof handoff | Pending final QA |
| Publication | A/B-approved public output only; no internal provenance, Drive ID, placeholder, secret, denied project expansion, or invented fact | Pending final QA |
| Accessibility | Keyboard/focus, axe, reduced motion, forced colors, no-WebGL, no-JavaScript, and touch semantics pass | Pending final QA |
| Build health | Typecheck, lint, unit, production build, output checks, and bundle gate exit zero | Pending final QA |
| Runtime | Source-bound desktop/mobile metrics disclose frame/long-task/input/error results and historical comparison | Pending final runtime |
| Lighthouse | Six source-bound audits meet ≥95 categories and CLS ≤0.05, or an exact disclosed blocker remains | Pending final QA |
| Evidence | Baseline/candidate WebMs, stills, manifests, hashes, durations, and source identities exist | Pending final package |
| Git | Normal push; local HEAD = upstream = live branch; no unrelated user state consumed | Pending closure |

## Hard-gate mapping

The master-goal H1–H15 gates remain authoritative. For R-X, H5–H7 are evaluated against the accepted seven-act Phase R narrative and its current observable transformations rather than reviving the superseded Phase 1 homepage.

| Hard gate | R-X interpretation | Result |
| --- | --- | --- |
| H1 Source integrity | Q-HUB-only implementation; prohibited legacy sources untouched | Pending |
| H2 Required foundations | Existing Astro/content/publication/accessibility foundations preserved | Pending |
| H3 Build health | Integrated checks exit zero | Pending |
| H4 Publication safety | Public eligibility, output, placeholders, and secrets remain fail-closed | Pending |
| H5 Narrative | Exact seven ordered Phase R acts remain reachable and meaningful | Pending |
| H6 Observable transformation | Continuous and resolved states are visually distinct | Pending |
| H7 Field interface | Accepted Partner/Field Crossing/METHOD interface remains complete in DOM/CSS and optional WebGL | Pending |
| H8 Responsive integrity | Required viewport matrix and authored mobile pass | Pending |
| H9 Accessibility | Keyboard, focus, axe, reduced motion, forced colors pass | Pending |
| H10 Performance | Bundle, runtime, Lighthouse, and lifecycle are measured without fabrication | Pending |
| H11 Fallback parity | no-WebGL, no-JavaScript, reduced motion, and mobile preserve meaning/actions | Pending |
| H12 Placeholder safety | No release-visible temporary content | Pending |
| H13 Visual QA evidence | Real-browser still/video inspection and defects are recorded | Pending |
| H14 Asset readiness | No new asset claim; unresolved FONT-001 remains disclosed | Pending |
| H15 Version control/deployment | Branch discipline, equality, and no deployment | Pending |

## Attempt ledger

- Baseline production build: passed, 12 pages, 0 errors/warnings/hints.
- Baseline natural-wheel capture: passed with zero page/console errors; continuity defect reproduced.
- First R-X strict typecheck: failed only in the new test helper because a generated reduce accumulator inferred `unknown`; helper typing was corrected.
- Focused Phase R/R-X browser contracts after correction: passed `19/19`.
- First still runner attempt: stalled in the JavaScript-disabled Chromium capture context after other modes completed; the isolated runner was stopped and its staging directory removed.
- Second still runner attempt: the same no-JavaScript context remained non-terminating. R-X no-JavaScript remains a browser behavior gate rather than a new still.
- Third still runner attempt: all 42 selected captures completed with zero application errors and zero overflow; one expected duplicate pair showed normal headless DOM fallback and explicit no-WebGL METHOD were byte-identical.
- Visual inspection identified the mobile/tablet Field Crossing lane intersecting supporting copy; the lane was moved below copy/action and re-captured successfully.
- First source-bound R-X runtime attempt: failed closed before build/preview because trimming Git porcelain output removed the preserved deletion's leading status column and the runner misparsed its path. No runtime artifact was written; all three R-X runner parsers were corrected before retry.
- First source-bound candidate-video attempt: failed closed before preview because the video runner did not yet allow the already generated `artifacts/performance/phase-rx/` outputs. No video/diagnostic artifact was written; the evidence-only allow-list was narrowed to both R-X review and performance directories before retry.
- First source-bound candidate-still attempt: completed all normal responsive captures, then timed out positioning the optional reduced-motion ACCESS still at synthetic 8% progress. No staged package was promoted. The redundant still was removed; reduced-motion ACTIVITY remains in the visual package and the browser suite retains all-five-partner reduced-motion coverage.
- First integrated `release:phase-r` attempt: build, source-integrity, placeholder, Phase R output, Phase 3 output, and bundle gates passed; the final secret scan failed because `git ls-files` included the pre-existing user-deleted Phase R ZIP and `readFile` raised `ENOENT`. The scanner was corrected to report and exclude genuinely absent tracked paths while still scanning every existing tracked/non-ignored candidate text file.

Final command totals, bundle bytes, runtime metrics, Lighthouse values, hashes, git equality, and open limitations are added only after the source-bound closure runs.
