# Phase R technical acceptance ledger

Phase R is technically closed against the strategic-reorientation contract, subject to the final version-control equality step recorded under R-14. This ledger does **not** make the human creative decision.

## Candidate lineage

- Canonical repository: `https://github.com/AmirNatan1/Q-HUB.git`
- Branch: `redirect/quantum-presence-startup-magnet`
- Accepted Phase 3 ancestor: `ff78e2d911960bb2c05d7404966bbf688d0764e9`
- Phase R baseline: `3a85705`
- Final implementation candidate: `65907148bafec7cfe02f6c6d73154e3269f5d0e0`
- Runtime/bundle closure: `a29d7350aaee25cfead0c4893a90c9a245363655`
- Lighthouse/evidence input candidate: `aeed95e9c0fda4fa6deaf79a1c214b4dd7be5edb`
- Evidence candidate tree: `71f34ffedfbec15eb70593f97472ae85de1b2256`

The interrupted takeover began with HEAD `f072efb...`, a deleted tracked runtime diagnostic, and three untracked but complete runtime JSON files. Those files were reconciled before modification. Candidate-bound artifacts invalidated by later source fixes were preserved locally under ignored `artifacts/recovery/` paths and remain recoverable from Git history.

## Verification summary

| Gate | Status | Primary evidence |
| --- | --- | --- |
| `npm run check` | PASS | Typecheck 0 errors/warnings/hints; lint exit 0; 50/50 unit tests; 12-page static build. |
| `npm run test:e2e` | PASS | 89/89 Chromium cases at the configured four-worker local cap. |
| `npm run release:phase-r` | PASS | Seven acts, five partners, 15 homepage-linked public files; Phase 3 2 routes / 4 media / 20 browser-facing text artifacts; bundle and secret gates passed. |
| `npm run lighthouse` | PASS | Six candidate-bound audits; every category at least 99, TBT 0 ms, CLS 0. |
| `npm run runtime:phase-r` | PASS (synthetic) | Candidate-bound desktop/mobile JSON and runtime diagnostic; no application errors or mobile WebGL. |
| `npm run evidence:phase-r` | PASS | Exactly 23 PNGs, one complete WebM, and one candidate-bound manifest. |

## R-1 — Baseline / ancestry

**Status: PASS.**

- Verification: `git remote -v`; `git merge-base --is-ancestor ff78e2d911960bb2c05d7404966bbf688d0764e9 HEAD`; Phase R commit/history inspection; historical evidence digest before/after runtime and evidence capture.
- Evidence: the canonical remote is `AmirNatan1/Q-HUB`; accepted Phase 3 is an ancestor; the Phase R baseline and implementation sequence are preserved. The 82 tracked pre-Phase-R review files remain 39,090,932 bytes with digest `9c36b1fe1606733ae08b361df674d91833414196b3583cd31cddaf43c455f1bf`.
- Limitation/disclosure: the recovery checkout was intentionally not clean because the prior session stopped mid-runtime-document rewrite. No file was discarded during reconciliation. The earlier baseline aggregate of 83 files included an ignored transient archive, so its aggregate digest is not directly comparable to the canonical 82-file tracked set.

## R-2 — Publication safety

**Status: PASS.**

- Verification: `npm run check`; `npm run release:phase-r`; `npm run release:secrets`.
- Evidence: source-integrity 2/2; placeholder boundary 2/2; publication/content unit suite included in 50/50; built-output scans reject denied records, internal provenance, Drive identifiers, unapproved metrics, internal board content, prohibited sources, and secret/token patterns. `sourceReferenceInternal` is not emitted.
- Limitation: these are repository and generated-output scans, not a review of external systems that are outside the candidate.

## R-3 — Quantum protagonist

**Status: PASS.**

- Verification: `npm run release:phase-r-output`; `npm run test:e2e`; unit tests `tests/phase-r-homepage-content.test.ts`, `tests/strategic-content.test.ts`, and `tests/content-output.test.ts` through `npm run check`.
- Evidence: built homepage order is exactly `PRESENCE → ACCESS → STARTUP → METHOD → ACTIVITY → EVIDENCE → ACTION`; homepage copy, metadata, and principal actions contain no Maradin/project-specific protagonist language; Proof-specific output remains deeper at `/proof/`.
- Limitation: whether Quantum *feels* like the protagonist is reserved for human review.

## R-4 — Copy density

**Status: PASS.**

- Verification: copy-density unit helpers and the 89-case browser suite, including settled ACCESS checks at 390×844 and 430×932.
- Evidence: settled states retain one dominant statement, at most one concise support line, essential relationship/category labels, and no restored technical HUD or explanatory paragraph blocks.
- Limitation: automated word ceilings cannot decide whether any remaining label feels visually excessive.

## R-5 — Partner Field

**Status: PASS.**

- Verification: strategic content tests, built-output scan, Phase R experience/responsive/visual-contract browser cases, and inspection of the final review captures.
- Evidence: exactly five approved organizations publish with exact taxonomy—Taavura–Livnat Group and Talcar as founding partners; VDL Group, Hyundai Motor Group, and Bazan Group as strategic partners. Assets are local. Desktop gives one identity territorial authority at a time; mobile and reduced motion use sequential territories rather than a logo wall, grid, strip, marquee, or carousel.
- Limitation/disclosure: final visual inspection exposed a reduced-motion contrast override in an earlier evidence candidate. Commit `6590714...` corrected the cascade and added an exact computed-color regression assertion; the final reduced-motion capture was re-inspected with dark names on all pale territories.

## R-6 — Startup magnet

**Status: PASS.**

- Verification: strategic/homepage content tests, built-output scan, keyboard/action browser cases, and link inspection.
- Evidence: the concise approved SPARK proposition is present; the startup action resolves to the working `mailto:info@quantum-hub.com` destination; no guarantee, fabricated result, count, or commercial-outcome language publishes.
- Limitation: whether a strong startup actually desires access is a human creative question.

## R-7 — Generalized method

**Status: PASS.**

- Verification: semantic content tests and Phase R method/visual-contract browser cases.
- Evidence: FIND, TEST, and PROVE are complete semantic DOM states, materially distinct beyond color, and understandable without Maradin or another named POC.
- Limitation: the evidence images intentionally include specific resolved and transitional compositions; memorability and pacing remain human judgments.

## R-8 — Proof handoff / Phase 3 integrity

**Status: PASS.**

- Verification: `npm run release:phase-r`; Phase 3 Proof unit/browser coverage within the 50/50 and 89/89 totals; `git diff` ancestry review.
- Evidence: the homepage evidence CTA targets `/proof/`, never the Maradin slug. `/proof/` and `/proof/maradin-dynamic-ground-projection/` remain functional; exactly the currently eligible record set publishes; no Proof Record 002 was created. The only Phase 3 presentation changes are the authorized narrow cleanup, without changing the Maradin factual boundary.
- Limitation: deeper Proof content correctly remains record-specific, so its approved Maradin language is excluded from the homepage-only leak scan rather than falsely treated as a failure.

## R-9 — Runtime performance

**Status: PASS for local synthetic evidence; human preview verdict pending.**

- Verification: `$env:PHASE_R_RUNTIME_STAGE = "candidate"`; `$env:PHASE_R_RUNTIME_CANDIDATE_SHA = "65907148bafec7cfe02f6c6d73154e3269f5d0e0"`; `npm run runtime:phase-r`; lifecycle browser tests.
- Evidence: desktop duration 11,809.4 ms, p50 16.7 ms, p95 50.0 ms, p99 66.6 ms, 104 intervals over 33.3 ms, 11 over 50 ms, four long tasks totaling 306 ms, zero page/console errors. Mobile duration 8,431.9 ms, p50 16.7 ms, p95 16.8 ms, p99 33.4 ms, 16 intervals over 33.3 ms, none over 50 ms, no long tasks, errors, or WebGL. Permanent continuous rendering is limited to active PRESENCE; the transient STARTUP post-scroll draw window is disclosed in the runtime diagnostic.
- Limitation: the maximum desktop long task was 115 ms versus the 82 ms baseline maximum even though normalized long-task count/time and overall pacing improved. Results are local headless Chromium/SwiftShader lab evidence, not Cloudflare field telemetry or ordinary-device proof. No claim is made that real Cloudflare lag is solved.

## R-10 — Responsive / mobile

**Status: PASS.**

- Verification: `npm run test:e2e` responsive coverage at 390×844, 430×932, 768×1024, 1440×900, and 1920×1080.
- Evidence: all seven acts, approved partner identities, actions, and content remain reachable without unintended horizontal overflow; mobile Partner Field and motion progression are authored as touch/scroll-native sequences; default mobile WebGL remains off.
- Limitation: no physical iOS/Android device or mobile Safari session was run.

## R-11 — Accessibility

**Status: PASS for automated/local browser evidence.**

- Verification: unit semantics; 89-case browser suite with axe, keyboard, visible focus, forced colors, reduced motion, no-WebGL, no-JavaScript, and semantic-equivalence cases.
- Evidence: zero critical/serious axe violations in tested settled states; every meaningful state has equivalent DOM content; the final focus capture is visible; forced-colors and reduced-motion captures remain meaningful; the corrected partner contrast assertion passes.
- Limitation: no manual screen-reader session or independent assistive-technology audit was performed.

## R-12 — Bundle / dependencies

**Status: PASS.**

- Verification: `npm run bundle:check` within the final `npm run release:phase-r` pass.
- Evidence: total JS 22,400 raw / 8,299 gzip; initial 10,786 / 4,290; lazy 11,614 / 4,009. Delta versus accepted Phase 3 is +1,548 raw / +338 gzip total, +1,607 / +373 initial, and −59 / −35 lazy. No React, React DOM, Three.js, R3F, GSAP, or listed heavy animation/3D/carousel/router/smooth-scroll runtime is direct, transitive, emitted, or initial-critical. No production dependency was added for the experience; partner media are local and hidden hotlinks are rejected.
- Limitation: byte measurements describe the current production build, not transfer performance across a real Cloudflare connection.

## R-13 — Visual evidence

**Status: PASS for package integrity and inspection; human creative decision pending.**

- Verification: `$env:PHASE_R_EVIDENCE_CANDIDATE_SHA = "aeed95e9c0fda4fa6deaf79a1c214b4dd7be5edb"`; `npm run evidence:phase-r`; independent byte/hash/candidate audit; individual inspection of all 23 PNGs; continuous playback of the WebM from 0.00 seconds to natural end plus 25 evenly spaced decoded-frame inspections.
- Evidence: exactly 12 desktop, 7 mobile, and 4 accessibility/fallback PNGs; one 1440×900, 48.92-second WebM; manifest candidate/tree/branch match; video is 4,616,373 bytes with SHA-256 `fc7c2ab74b00d90f3fa1b592b3f72a7da7540970d9916e2ca61f9e0ab0680f4c`; zero capture errors; historical digest unchanged.
- Limitation: local headless Chromium capture is silent and cannot certify human-perceived smoothness or creative quality on the owner’s hardware.

## R-14 — Version control

**Status: PENDING final documentation commit and normal push.**

- Verification completed so far: intentional Phase R diff reviewed from accepted Phase 3; no force operation, merge, or deploy performed; the post-evidence/documentation `npm run release:secrets` scan passed with 121 candidate text files checked and 111 binary/oversize files skipped.
- Remaining exact steps: stage only the final Phase R evidence and required documents; rerun `npm run release:secrets`; inspect the staged diff; commit; push `redirect/quantum-presence-startup-magnet` normally; verify clean worktree and `HEAD == @{u} == git ls-remote origin refs/heads/redirect/quantum-presence-startup-magnet`; update this line with the closure result.
- Limitation: R-14 cannot truthfully be marked PASS until the live remote equality check completes.

## Interrupted-run disclosures

- The first recovery invocation of `npm run release:phase-r` failed because the interrupted working tree had the tracked runtime diagnostic absent (`ENOENT docs/PHASE_R_RUNTIME_DIAGNOSTIC.md`). After reconstructing the candidate-bound document, the exact command passed; this was not hidden.
- An earlier unconstrained ten-worker Playwright diagnostic suffered host resource-starvation timeouts. It is not counted as a product pass. The controlled four-worker release run passed 89/89, including after the final contrast correction.
- Earlier candidate-bound runtime/Lighthouse/review packages were superseded when visual inspection found the reduced-motion contrast defect. They were preserved locally under ignored recovery directories and in Git history; only regenerated final-candidate artifacts are proposed for closure.

## Decision boundary

Automated PASS is not human ACCEPT. The Human Review Package asks the owner to decide:

**ACCEPT / REPAIR / REDIRECT**
