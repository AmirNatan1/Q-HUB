# Phase 1 Acceptance Ledger

## Ledger status

This ledger applies the hard gates without substitution or numerical self-scoring. Evidence is current as of 2026-08-15.

| Gate | Status |
| --- | --- |
| H1 — Source integrity | PASS |
| H2 — Required foundations | PASS |
| H3 — Build health | PASS |
| H4 — Publication safety | PASS |
| H5 — Six-state narrative | PASS |
| H6 — Observable transformation | PASS |
| H7 — Field Aperture | PASS |
| H8 — Responsive integrity | PASS |
| H9 — Accessibility | PASS |
| H10 — Performance | PASS |
| H11 — Fallback parity | PASS |
| H12 — Placeholder safety | PASS |
| H13 — Visual QA evidence | PASS |
| H14 — Asset readiness | PASS |
| H15 — Version control / deployment | PENDING FINAL GIT AUDIT |

H1–H14 are substantiated below. H15 must not be converted to PASS until the candidate is committed, the final SHA and clean-tree intent are recorded, the secret and push audits are complete, and push status is known. No deployment URL exists at this revision. Therefore the master goal's complete-run stopping condition is not yet claimed by this ledger revision.

## H1 — Source integrity

**STATUS:** PASS

**VERIFICATION METHOD:** Repository identity, branch, remote, tracked/untracked file inventory, media inventory, and automated scans were inspected inside Q-HUB. The implementation contains only authored source, inline procedural geometry, and one explicitly provisional SVG icon. No copied photographic or legacy media is present. Corporate statements are limited to master-goal language, labelled editorial drafts, and unmistakable development placeholders.

**COMMAND / TEST:**

```text
git status --short --branch
git remote -v
git log -1 --oneline --decorate
npx vitest run tests/source-integrity.test.ts tests/publication.test.ts tests/content-output.test.ts
```

**EVIDENCE:**

- `origin` is `https://github.com/AmirNatan1/Q-HUB.git`, the canonical repository.
- Branch is `phase1/field-aperture`.
- Focused Vitest audit passed 3 files / 18 tests, including both source-integrity tests.
- `tests/source-integrity.test.ts` rejects prohibited former host/repository identifiers outside policy documentation, prohibited historical numeric claims in public presentation, and common stock-media hosts.
- `src/components/FieldMedia.astro` is procedural and visibly labelled development media; `public/field-aperture-icon.svg` is machine-marked development media.
- No external image/video asset or fabricated organization, startup, person, metric, measurement, quote, test result, or relationship appears in the Phase 1 presentation.

**KNOWN LIMITATION:** Automated inspection proves the repository state and public presentation boundary; it cannot independently prove a negative fact about activity outside the repository. The implementation audit and file/media inventory disclosed no contrary evidence.

## H2 — Required foundations

**STATUS:** PASS

**VERIFICATION METHOD:** Required-file inspection, strict type/build checks, route generation, and architecture review.

**COMMAND / TEST:**

```text
rg --files -g '!node_modules' -g '!dist'
npm run check
```

**EVIDENCE:** Substantive versions exist of:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/MOTION_SYSTEM.md`
- `docs/CONTENT_MODEL.md`
- `docs/PUBLICATION_POLICY.md`
- `docs/ASSET_REQUESTS.md`
- `docs/QA.md`
- `docs/PHASE1_ACCEPTANCE.md`

The foundation also contains:

- strict Zod schemas for proof, activity, program, network organization, person, global fact, media, and relationship labels in `src/content/schema.ts`;
- deny-by-default filtering, recursive internal-source stripping, and placeholder detection in `src/content/publication.ts`;
- centralized tokens and global CSS foundations in `src/styles/global.css`;
- static-first Astro layouts, semantic navigation, canonical/meta/Open Graph/Twitter infrastructure, robots, sitemap, and 404;
- homepage plus supporting semantic routes;
- Vitest, ESLint, Astro check/build, Playwright, axe, bundle inspection, Lighthouse, and Cloudflare Pages configuration.

`npm run build` generated 11 pages with exit code 0.

**KNOWN LIMITATION:** Supporting routes are intentionally semantic shells. `/proof/[slug]` and full subpage design remain future work and are outside Phase 1.

## H3 — Build health

**STATUS:** PASS

**VERIFICATION METHOD:** Final aggregate check plus final full browser suite; runtime error/console collectors are embedded in critical browser flows.

**COMMAND / TEST:**

```text
npm run check
npm run test:e2e
```

**EVIDENCE:**

- Typecheck: 31 files; 0 errors, 0 warnings, 0 hints.
- Lint: exit code 0.
- Unit/schema/content tests: 4 files, 20 tests passed.
- Production build: exit code 0; 11 static pages generated.
- Browser tests: final exit code 0; 15 tests passed.
- Final critical-flow error collectors: zero uncaught page exceptions and zero application-generated console errors.
- The first fully parallel e2e run had a single execution-context-destroyed navigation timing failure in the mobile fallback test. The isolated test passed, then the complete 15-test suite passed. Exact retry evidence is in `docs/QA.md`.
- The `NO_COLOR`/`FORCE_COLOR` worker warning was reviewed as a runner-environment warning, not an application warning.

**KNOWN LIMITATION:** The clean full rerun is the release result, but the initial parallel navigation retry remains disclosed rather than erased.

## H4 — Publication safety

**STATUS:** PASS

**VERIFICATION METHOD:** Unit tests exercise every eligibility combination, placeholder rules, presentation/output boundaries, and recursive sanitization.

**COMMAND / TEST:**

```text
npx vitest run tests/source-integrity.test.ts tests/publication.test.ts tests/content-output.test.ts
npm run release:placeholders
```

**EVIDENCE:**

| Case | Required result | Proven result |
| --- | --- | --- |
| A + approved | may render | allowed |
| B + approved | may render | allowed |
| B + unapproved | cannot render | denied |
| C, either approval value | cannot render | denied |
| D, either approval value | cannot render | denied |
| Development placeholder | detectable and cannot render | detected and denied |
| Internal source reference | never emitted publicly | recursively stripped; presentation and generated output scan clean |

Schemas reject a placeholder marked public-approved or classified other than D. Public pages do not import `src/content/development.ts`.

**KNOWN LIMITATION:** The Phase 1 homepage contains explicitly labelled editorial-draft copy and development UI structures; these are not production corporate content and are inventoried under H12.

## H5 — Six-state narrative

**STATUS:** PASS

**VERIFICATION METHOD:** Semantic DOM inspection, active-state polling, distinct-style hashing, screenshot hashing, and real-browser visual review.

**COMMAND / TEST:**

```text
npm run test:e2e
```

**EVIDENCE:** `tests/e2e/experience.spec.ts` proved exactly six sections in SIGNAL → APERTURE → NEED → FIND → TEST → PROVE order, one heading and meaningful DOM content per state, reachability via `data-active-phase`, six distinct computed-style signatures, and six distinct screenshot hashes. Review artifacts show distinct compositions rather than six relabelled rectangles.

**KNOWN LIMITATION:** Static captures show settled viewport states. Temporal movement is covered by live review and browser state-change assertions rather than a review video.

## H6 — Observable transformation

**STATUS:** PASS

**VERIFICATION METHOD:** Direct inspection of all desktop state captures, all mobile state captures, live browser transitions, controller/renderer behavior, and distinct-image assertions. No subjective numerical design score is used.

**COMMAND / TEST:**

```text
npm run test:e2e
```

**EVIDENCE:**

| Requirement | Determination | Evidence |
| --- | --- | --- |
| SIGNAL — abstraction/distributed possibility dominates | **DEMONSTRATED** | Near-black spatial field with distributed magenta contour traces and signal points: `artifacts/review/desktop-signal.jpg` and `mobile-signal.jpg`. |
| APERTURE — materially distinct underlying field becomes visible | **DEMONSTRATED** | Warm gridded surface, perspective planes, contact mark, parallax differential, non-circular layered mask, and semantic layer readout: desktop/mobile, reduced-motion, and no-WebGL APERTURE captures. |
| NEED — system narrows or gains constraint | **DEMONSTRATED** | Orange compression rails and pressure line, bounded central composition, and explicit constraint/requirement/selection-pressure terms. |
| FIND — relationship/search visibly converges or selects | **DEMONSTRATED** | Landscape → adjacency → selected sequence, converging geometry, stable selected signal, and explicit non-factual marker. |
| TEST — possibility enters a physical state and meets boundary/friction | **DEMONSTRATED** | Warm full-surface material, strong rail/border enclosure, contact geometry, texture, and framed observation structure. |
| PROVE — motion settles and structured evidence dominates | **DEMONSTRATED** | Magenta/orange scene resolves into paper/teal grid and a dominant six-field Proof Record. |

**KNOWN LIMITATION:** The physical layer is an unmistakably procedural development surface because approved Quantum field media is not yet available. This limits documentary truth, not the demonstrated Phase 1 grammar.

## H7 — Field Aperture

**STATUS:** PASS

**VERIFICATION METHOD:** Pointer-response test, mode-specific browser tests, source inspection of the coupled field layers, and fallback screenshots.

**COMMAND / TEST:**

```text
npm run test:e2e
```

**EVIDENCE:**

- Desktop pointer movement changes `--pointer-x/y`, differential layer translations, transform origin, non-circular radial/conic field masks, aperture geometry, signal retreat, and shader displacement; Playwright proves two pointer positions produce different material/spatial state.
- The visual stage uses `pointer-events: none`; copy and both navigation systems remain operable.
- The shader uses near/far spatial frequencies, local retreat/shear, and angle-dependent reveal, so the implementation is more than a circular cursor-opacity mask.
- The underlying field is a distinct warm gridded/perspective surface with contact geometry and a media adapter contract.
- Mobile fixes the authored reveal center, increases touch/scroll reveal range, reduces geometry density, and never requires hover or pointer precision.
- Reduced motion uses a resolved diagonal split with static field visibility and semantic progression.
- `?webgl=off` produces a designed DOM/CSS composition; engine initialization exceptions also set the no-WebGL fallback state.
- Desktop/mobile/reduced/no-WebGL browser journeys all retain semantic content and navigation without a fatal runtime exception.

**KNOWN LIMITATION:** Real approved field film is absent; FIELD-001 is the P0 replacement. No physical-device/GPU matrix was available beyond Playwright Chromium and live local Chromium.

## H8 — Responsive integrity

**STATUS:** PASS

**VERIFICATION METHOD:** Automated geometry/overflow/control/canvas/scroll assertions at every required viewport plus desktop/mobile visual inspection.

**COMMAND / TEST:**

```text
npx playwright test tests/e2e/responsive.spec.ts
```

This spec also passed in the final `npm run test:e2e` run.

**EVIDENCE:** 390×844, 430×932, 768×1024, 1440×900, and 1920×1080 each passed checks for body/root overflow, open-navigation overflow and bounds, all six visible headings and active states, canvas sizing, navigation-control overlap, tested mobile touch targets, and natural scroll exit into complete PROVE content. The six-state mobile artifact set was manually reviewed at an actual captured content area of 375×812; exact 390×844 integrity comes from the automated viewport run.

**KNOWN LIMITATION:** Browser emulation does not replace physical-device testing. Saved review content areas are 375×812 mobile and 1425×891 desktop/fallback because in-app browser chrome and scrollbars are excluded. Every exact required viewport—390×844, 430×932, 768×1024, 1440×900, and 1920×1080—is covered by automated assertions; committed screenshots do not independently evidence those exact outer dimensions.

## H9 — Accessibility

**STATUS:** PASS

**VERIFICATION METHOD:** Playwright semantic/keyboard tests, axe, full-impact standalone axe probe, reduced-motion/fallback tests, and forced-colors probe.

**COMMAND / TEST:**

```text
npx playwright test tests/e2e/accessibility.spec.ts
npm run test:e2e
```

**EVIDENCE:**

- one header, one main landmark, one primary navigation landmark, and one main `h1`;
- valid non-jumping heading progression across all six semantic sections;
- all tested controls have accessible names;
- all visible tested controls are reached through Tab, display focus, and do not trap the keyboard;
- canvas is decorative and all six meanings exist in semantic HTML;
- no essential hover-only content;
- working real `prefers-reduced-motion` mode;
- automated axe gate: zero critical, zero serious violations;
- separate full-impact axe result: empty violations array, so no lower-severity finding required remediation at audit time;
- forced-colors probe: active mode true, navigation visible, main heading present, canvas removed, error list empty;
- final tested flows generated no page exception or application console error.

**KNOWN LIMITATION:** No dedicated assistive-technology screen-reader session or physical-device audit was available. Automated semantics and browser keyboard behavior are verified.

## H10 — Performance

**STATUS:** PASS

**VERIFICATION METHOD:** Production build, Lighthouse desktop/mobile profiles, emitted-bundle graph inspection, and lifecycle/source review.

**COMMAND / TEST:**

```text
npm run build
npm run bundle:check
npm run lighthouse
```

**EVIDENCE:**

| Profile | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS | Target result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Desktop | 100 | 100 | 100 | 100 | 0.3 s | 0 ms | 0 | PASS |
| Mobile | 100 | 100 | 100 | 100 | 0.9 s | 0 ms | 0 | PASS |

- INP is unavailable in a single lab navigation; TBT is recorded as the equivalent responsiveness metric.
- Initial JavaScript is 7.6 KiB raw / 3.3 KiB gzip.
- The custom field engine is a separate lazy asset: 6.6 KiB raw / 2.7 KiB gzip.
- Three.js and R3F are absent from dependencies, emitted assets, and the initial critical path.
- Hero copy/navigation are generated semantic HTML and do not wait for JavaScript or WebGL.
- Engine load was deferred from idle startup to intentional fine-pointer input or entry into APERTURE/FIND; this removed a roughly 490 ms prior TBT observation.
- Continuous drawing is limited to SIGNAL/APERTURE/FIND and stops for settled phases and hidden documents; DPR is adaptive/capped.
- No image/video library or photographic media downloads eagerly; scene dimensions are reserved by the fixed stage.
- Machine-readable evidence: `artifacts/lighthouse/summary.json` and `artifacts/bundle-report.json`.

**KNOWN LIMITATION:** Lighthouse is a local lab result and does not supply field INP. Preview ownership, restricted Chrome startup, and managed-preview cleanup caused earlier runner retries. After runner repair, the exact `npm run lighthouse` command exited `0`; the stored run at `2026-08-15T10:32:26.892Z` scored 100 in every category. The retry history is documented in `docs/QA.md`.

## H11 — Fallback parity

**STATUS:** PASS

**VERIFICATION METHOD:** Dedicated browser contexts and visual review across the four required modes.

**COMMAND / TEST:**

```text
npx playwright test tests/e2e/fallbacks.spec.ts
npm run test:e2e
```

**EVIDENCE:** Normal desktop, normal mobile/touch, real reduced-motion preference, and `?webgl=off` each expose usable primary navigation, all six semantic headings/content blocks, and a non-null explicit render mode without application error. Reduced-motion and no-WebGL APERTURE captures show composed intentional states. SIGNAL → FIELD → EVIDENCE remains understandable in every mode.

**KNOWN LIMITATION:** The no-WebGL test uses the supported forced-disable query rather than inducing a GPU-driver crash. The actual initializer is guarded and catches context/shader failures into the same fallback.

## H12 — Placeholder safety

**STATUS:** PASS

**VERIFICATION METHOD:** Schema tests, release detection tests, presentation-source scan, visible marker inspection, and media inventory.

**COMMAND / TEST:**

```text
npm run release:placeholders
npx vitest run tests/publication.test.ts tests/content-output.test.ts tests/placeholder-release.test.ts
rg -n -i "development|approved[^\r\n<]{0,80}pending|pending[^\r\n<]{0,80}approved|editorial-draft|supportingStatus|data-development" src public -g '!*.map'
```

**EVIDENCE:**

- Six structured development families are classification D, unapproved, `developmentPlaceholder: true`, detectable, and denied public output.
- Placeholder schemas reject public approval and require `development-` IDs for development media.
- Presentation tests require visible temporary copy in Astro templates to have a `data-development-*` marker.
- Homepage FIND, TEST, and PROVE structures carry explicit development markers and disclaim any company, result, relationship, or outcome.
- SIGNAL/APERTURE/NEED/FIND supporting copy is visibly and structurally `editorial-draft`.
- All supporting route shells carry `data-development-placeholder="route-shell"`.
- The procedural field layer carries `data-development-media="true"` and an on-screen approval-pending notice.
- The provisional favicon carries `data-development-media="true"` and is not a Quantum logo.
- No fake partner, startup, test, metric, measurement, or outcome is present.
- `docs/ASSET_REQUESTS.md` states exact approved replacements.

**KNOWN LIMITATION:** Phase 1 intentionally cannot pass a zero-placeholder production release assertion because approved content/media have not been supplied. H12 requires detection and unmistakable safety at this phase, which is demonstrated; Phase 2/public release must replace or remove every item listed in the Human Review Package.

## H13 — Visual QA evidence

**STATUS:** PASS

**VERIFICATION METHOD:** Live local-browser inspection followed by committed viewport captures and reinspection after repairs.

**COMMAND / TEST:** Browser capture and direct visual review; automated support from `npm run test:e2e`.

**EVIDENCE:**

- Desktop captures: SIGNAL, APERTURE, NEED, FIND, TEST, PROVE.
- Mobile captures: complete representative six-state journey at an actual JPEG content area of 375×812; exact 390×844 is covered by automated assertions.
- Reduced-motion representative: APERTURE.
- No-WebGL representative: APERTURE.
- All 14 files are under `artifacts/review/` and linked from `docs/QA.md` and the Human Review Package.
- Review covered composition, typography, spacing, line breaking, clipping, overflow, transitions, scene boundaries, responsive changes, and fallback quality.
- Repairs documented in `docs/QA.md`: shader contour refinement, phase opacity tuning, lazy initialization after the TBT finding, explicit favicon, corrected SIGNAL evidence capture, and authored mobile layout confirmation.

**KNOWN LIMITATION:** Captures are static browser viewports; pointer/scroll motion is verified live and automatically but not delivered as a video. No approved documentary media exists to review yet.

## H14 — Asset readiness

**STATUS:** PASS

**VERIFICATION METHOD:** Field-by-field review of `docs/ASSET_REQUESTS.md` against the required manifest fields, priority order, Phase 1 replacement points, and publication concerns.

**COMMAND / TEST:** Documentation inspection.

**EVIDENCE:** Every request includes route/scene, purpose, type, ideal subject, priority, aspect ratio, minimum resolution, duration where applicable, format, mobile crop, transparency where applicable, audio relevance, fallback, and publication concern.

- **P0:** FIELD-001, TEST-001, PROVE-001, CONTENT-001, BRAND-001.
- **P1:** FIELD-002, FIELD-003, PROGRAM-001, PROGRAM-002.
- **P2:** PROOF-002, CAD-001, NETWORK-001, PEOPLE-001.

P0 requests identify a coherent real test story, exact capture qualities, crop/resolution/duration requirements, clearance needs, data approval fields, and fallback behavior so retrieval does not require guessing.

**KNOWN LIMITATION:** Asset readiness is a retrieval specification, not evidence that the approved assets already exist or have been delivered.

## H15 — Version control / deployment

**STATUS:** PENDING FINAL GIT AUDIT

**VERIFICATION METHOD:** Final status, diff, candidate commit, secret scan, remote/push verification, and optional deployment verification must occur only after every Phase 1 file—including this ledger and the Human Review Package—is final.

**COMMAND / TEST:**

```text
git status --short --branch
git remote -v
git log -1 --oneline --decorate
npx wrangler whoami
```

**CURRENT EVIDENCE:**

- Branch: `phase1/field-aperture`.
- Remote: canonical Q-HUB `origin` configured for fetch and push.
- Current pre-candidate HEAD: `6de6892` (`Initial commit`); this is **not** the final Phase 1 SHA.
- Working tree at documentation time contains the Phase 1 candidate as intentional uncommitted/untracked work and is therefore not yet clean.
- Final candidate commit SHA: **PENDING FINAL GIT AUDIT**.
- Secret scan/result: **PENDING FINAL GIT AUDIT**.
- Push status: **PENDING FINAL GIT AUDIT**.
- Deployment/preview URL: **none**.
- Cloudflare check: Wrangler `4.123.0` is installed and the Pages configuration can be read, but the saved authentication token is expired, non-interactive refresh is unavailable, and `CLOUDFLARE_API_TOKEN` is not set.
- Canonical/sitemap release configuration: no verified host exists, so the local build uses the documented `http://localhost:4321` fallback; a release must set `SITE_URL` to its verified origin and rebuild.

**KNOWN LIMITATION / UNBLOCK REQUIREMENT:** Finish the candidate files, inspect the exact final diff, scan for secrets, create the non-force Phase 1 commit, record its SHA, verify clean-tree intent, and push if repository credentials permit. A real Cloudflare preview requires renewed authentication or a valid scoped token. Never invent a deployment URL.

## Human visual quality gate

The Human Review Package exists at `docs/HUMAN_REVIEW_PACKAGE.md`. Codex does not decide ACCEPT, REPAIR, or REDIRECT and does not self-certify premium or award-level quality. No Phase 2 work is authorized by this ledger.
