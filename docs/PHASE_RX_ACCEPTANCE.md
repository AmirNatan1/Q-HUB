# Phase R-X Acceptance Ledger

**Decision owner:** Human reviewer

**Agent decision:** Not authorized

**Starting Phase R HEAD:** `36e750ed2ae265440c5546e24deebda74db5255a`

**Candidate branch:** `repair/phase-rx-experience-integration-scroll-fluidity`

This ledger records only commands and evidence actually produced for Phase R-X. Historical Phase 3 and Phase R results are comparison sources, not new R-X passes. Failed attempts and limitations remain recorded rather than being replaced by a later success.

## Acceptance conditions

| Gate | Required result | Candidate result |
| --- | --- | --- |
| Scope | Homepage integration only; no supporting-route redesign or publication expansion | Pass — homepage controller/CSS plus tests, evidence tooling, release robustness, and docs only; content/routes remain frozen |
| Native scroll | Real wheel/touch reaches natural page end; no interception, snap, custom momentum, or smooth-scroll runtime | Pass — desktop/mobile reached end and all 7 acts; 125 wheel events, 0 prevented; authored touch path passed |
| Continuous response | ACCESS, STARTUP, METHOD, and ACTIVITY geometry changes through tightly spaced forward input; METHOD reverses immediately | Pass — R-X browser contract and `95/95` full matrix; aggregate diagnostic dead rate `0.3229 → 0.2021` |
| Spatial integrity | Desktop/wide/tablet/mobile review has no text collision, crop, horizontal overflow, stale residue, or trapped sticky scene | Pass — 41 final source-bound stills, zero captured issues/overflow; visual inspection complete |
| Semantic contract | Seven ordered acts, one `h1`, exact partners/taxonomy, four Activity labels, safe actions, Proof handoff | Pass — browser and built-output contracts |
| Publication | A/B-approved public output only; no internal provenance, Drive ID, placeholder, secret, denied project expansion, or invented fact | Pass — source/publication/placeholder/built-output/secret gates |
| Accessibility | Keyboard/focus, axe, reduced motion, forced colors, no-WebGL, no-JavaScript, and touch semantics pass | Pass — complete accessibility and fallback matrix included in `95/95` |
| Build health | Typecheck, lint, unit, production build, output checks, and bundle gate exit zero | Pass — zero Astro diagnostics, ESLint zero, `50/50` unit, 12-page build, integrated release zero |
| Runtime | Source-bound desktop/mobile metrics disclose frame/long-task/input/error results and historical comparison | Pass — final desktop/mobile source-bound artifacts; zero errors and natural end reached |
| Lighthouse | Six source-bound audits meet ≥95 categories and CLS ≤0.05, or an exact disclosed blocker remains | Pass — all six; homepage `100/100/100/100` desktop/mobile, lowest category 99, CLS 0 throughout |
| Evidence | Baseline/candidate WebMs, stills, manifests, hashes, durations, and source identities exist | Pass — 72 canonical files; canonical SHA-256 digest `2124215…a35a42`; 3/3 WebMs played fully |
| Git | Normal push; local HEAD = upstream = live branch; no unrelated user state consumed | Pass for normal push/equality/no unrelated consumption; inherited user deletion remains preserved and unstaged, so literal clean-tree status is unavailable |

## Hard-gate mapping

The master-goal H1–H15 gates remain authoritative. For R-X, H5–H7 are evaluated against the accepted seven-act Phase R narrative and its current observable transformations rather than reviving the superseded Phase 1 homepage.

| Hard gate | R-X interpretation | Result |
| --- | --- | --- |
| H1 Source integrity | Q-HUB-only implementation; prohibited legacy sources untouched | Pass |
| H2 Required foundations | Existing Astro/content/publication/accessibility foundations preserved | Pass |
| H3 Build health | Integrated checks exit zero | Pass |
| H4 Publication safety | Public eligibility, output, placeholders, and secrets remain fail-closed | Pass |
| H5 Narrative | Exact seven ordered Phase R acts remain reachable and meaningful | Pass |
| H6 Observable transformation | Continuous and resolved states are visually distinct | Pass |
| H7 Field interface | Accepted Partner/Field Crossing/METHOD interface remains complete in DOM/CSS and optional WebGL | Pass |
| H8 Responsive integrity | Required viewport matrix and authored mobile pass | Pass |
| H9 Accessibility | Keyboard, focus, axe, reduced motion, forced colors pass | Pass |
| H10 Performance | Bundle, runtime, Lighthouse, and lifecycle are measured without fabrication | Pass with headless/host limitations disclosed |
| H11 Fallback parity | no-WebGL, no-JavaScript, reduced motion, and mobile preserve meaning/actions | Pass |
| H12 Placeholder safety | No release-visible temporary content | Pass |
| H13 Visual QA evidence | Real-browser still/video inspection and defects are recorded | Pass |
| H14 Asset readiness | No new asset claim; unresolved FONT-001 remains disclosed | Pass with inherited `FONT-001` limitation |
| H15 Version control/deployment | Branch discipline, equality, and no deployment | Limited — commit/push/equality/no-deployment requirements pass; literal clean tree is blocked by the required preservation of the pre-existing user deletion |

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
- First complete Phase R/R-X browser matrix: `86/95` passed and `9/95` failed. Seven accessibility failures traced to low-contrast inactive METHOD words and a faded ACCESS heading persisting in forced colors; two desktop responsive failures traced to inactive full-viewport partner planes remaining `visibility: visible` while scaled outside the viewport. The repair raises METHOD's inactive baseline to AA contrast, forces ACCESS heading opacity in forced colors, and hides partner planes only when the ACCESS section itself is inactive.
- First focused accessibility/responsive verification after that repair: `28/30` passed. The two remaining mobile ACCESS failures traced to its heading inheriting the desktop light-plane ink treatment while the authored mobile layout kept the heading on the dark stage.
- Isolated accessibility verification after the mobile color correction: passed `10/10` across both release and Phase R accessibility suites.
- Final complete Phase R/R-X browser matrix after accessibility closure: passed `95/95` in `54.6s`.
- Integrated `npm run check`: passed with `69` Astro files reporting zero diagnostics, ESLint exit zero, `7/7` unit files and `50/50` unit tests passing, and `12` static pages built.
- Integrated `release:phase-r` retry: passed build, `2/2` source-integrity tests, `2/2` placeholder tests, Phase R output (`7` acts, `5` partners, `15` public files), Phase 3 output (`2` Proof routes, `4` media assets, `20` browser-facing text artifacts), bundle, and secret gates. The secret scan checked `154` candidate text files, skipped `314` binary/oversize files, and explicitly excluded the one preserved absent tracked ZIP.
- First final runtime declaration attempt rejected before build because the manually supplied full SHA did not equal HEAD; no artifact was written. The exact HEAD declaration was then used for every final source-bound run.
- Final candidate runtime: desktop and mobile both reached the natural page end and all seven acts with zero errors. Desktop recorded p50/p95/p99 `16.7/49.945/66.7 ms`, two long tasks (`214 ms` total), and 125 wheel events with zero prevented. Mobile recorded `16.7/16.8/16.8 ms`, zero long tasks, and 141 touch input events.
- Final continuous WebM: `14.32 s`, `1,607,518` bytes, SHA-256 `e9d79fcd0bfa20762c4dbe26be16613f24e1b719e0cf228ecc6976dbeb04aaf4`, zero page/console errors. Final slow WebM: `28.64 s`, `3,148,212` bytes, SHA-256 `529f268e113a884d0b73dbae4c562860c3685636d41714dd97ae40ee969ff3f1`, zero errors.
- Final visual package: 41 source-bound captures across desktop/wide/tablet/mobile/modes, all with zero captured application issues and zero horizontal overflow. Human-readable spot inspection covered ACCESS, STARTUP, METHOD, ACTIVITY, mobile translations, and forced colors.
- Final Lighthouse: all six audits passed. Desktop/mobile homepage scored `100/100/100/100` with LCP `0.4/1.7 s`, TBT `0`, CLS `0`; both Proof index profiles scored all 100; field record scored all 100 desktop and `99/100/100/100` mobile, CLS `0`.
- Full playback review: baseline, final continuous candidate, and final slow candidate all decoded and played through the `ended` event at review speed; `3/3` complete and zero media errors. Nine-frame filmstrips were visually inspected.
- Final manifest: 72 canonical files and 114 retained non-canonical QA/pre-final files; canonical digest `2124215fcd3c1a88e1de6ba88aee4f3f739eec943b49dab5249e1cc38ca35a42`.
- Post-package `npm run check`: passed with `71` Astro files at zero diagnostics, ESLint exit zero, `7/7` unit files and `50/50` unit tests passing, and 12 static pages built.
- First normal closure push created the remote branch. Local HEAD, upstream-tracking HEAD, and live `refs/heads/repair/phase-rx-experience-integration-scroll-fluidity` were independently verified equal at `7d29f67f8f385e3c4772849f95e151a4a4803756`; the final ledger-only commit is pushed and re-verified separately at handoff.

## Bundle result

- total JavaScript: `28,755` raw / `10,318` gzip bytes
- initial JavaScript: `17,141` raw / `6,309` gzip bytes
- lazy JavaScript: `11,614` raw / `4,009` gzip bytes
- accepted Phase 3 delta: `+7,903` raw / `+2,357` gzip total; `+7,962` raw / `+2,392` gzip initial
- React, React DOM, Three.js, R3F, GSAP, smooth-scroll and other heavy runtime detection: all false

## Open limitations

- Headless/local evidence cannot certify physical display, GPU, trackpad, or Cloudflare behavior; human review and any later preview remain separate decisions.
- METHOD's diagnostic computed-style vector undercounts directly written custom-property geometry. The direct-variable/reverse-scroll browser contract and videos are the METHOD continuity sources of record.
- A JavaScript-disabled Chromium screenshot context did not terminate reliably; no-JavaScript semantic/action behavior passed in the complete browser matrix instead.
- Historical `FONT-001` remains unresolved; R-X did not authorize a new external font or asset claim.
- The user-owned pre-existing deletion `artifacts/performance/phase-r.zip` remains untouched and unstaged. Consequently the local worktree cannot be literally clean without consuming unrelated user state.
- No deployment or Cloudflare preview was performed.
