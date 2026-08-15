# Phase 2 Maradin Real-Field Integration — Acceptance Ledger

## Authority and status

The human accepted the frozen Phase 1 visual grammar on **2026-08-15** and supplied the controlled Phase 2 Maradin goal and approved source pack. This ledger covers only the real-field homepage integration on `phase2/maradin-field-evidence`.

- Frozen Phase 1 implementation candidate: `3d03033d05910ee9c27c5eb050fecccbabebaaf8`
- Phase 1 evidence/documentation closure: `0bdf3631ff9f29394a25ed89fdcd745827aff52e`
- Phase 1 final accepted HEAD used to create the Phase 2 branch: `b0b56d3fa38a41d0d40d24b2a9ab443fbca91a33`
- Phase 2 branch: `phase2/maradin-field-evidence`
- Phase 2 implementation candidate SHA: `d88f2020851325890e8951d88373475243ef9d1a`
- Implementation candidate push: **CONFIRMED** — normally pushed to `origin/phase2/maradin-field-evidence` with upstream set; no force push
- Frozen source tree at evidence start: **CLEAN**
- Final evidence/documentation closure commit SHA: `939b2b3386e468dc995e70bce054bce8b7e44e4a`
- Final evidence/documentation push and clean-tree status: **CONFIRMED** — normally pushed to `origin/phase2/maradin-field-evidence`; clean tree immediately after push; no force push
- Deployment/preview: **UNAVAILABLE** — Wrangler reports expired non-interactive authentication; no remote preview or production deployment was attempted or claimed
- Technical result: **P2-1 through P2-10 PASS**
- Human creative decision: **UNDECIDED**

## Approved source and publication boundary

The Maradin Dynamic Ground Projection record is classification **B**, `publicApproved: true`, under explicit user approval dated **2026-08-15**. The public story may identify Maradin, Hyundai CRADLE TLV, SPARK, the approved field condition, MEMS-based laser-scanning technology, vehicle-mounted environment, more than 60 scenarios, the 15-person 0–5 evaluation description, comparative field evidence, and the approved EcoMotion/OI Lounge next step.

The record deliberately omits `decision`, location, and an invented full date. It does not claim deployment, adoption, signature, production, scaling, procurement, sales, or commercial success. Contracts and commercial terms, internal final-report material, proprietary KPI tables, raw measurement values, confidential technical specifications, and inferred commercial/production outcomes remain protected.

The approved source JSON and approval JSON are not copied into the public site. Internal provenance is not present in presentation code and must remain absent from `dist`.

## Imported asset ledger

Every public asset below is a byte-for-byte copy of the approved derivative. No crop, transcode, recompression, SVG rewrite, recolor, or metadata edit was performed.

| Source filename | Final public path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `brand/quantum-full-logo-colors.svg` | `public/brand/quantum-full-logo-colors.svg` | 5,837 | `3b978e3a639d38e5d869afdae02d5e01eea706829ba95f1b9ee82710ffb19196` |
| `brand/quantum-full-logo-white.svg` | `public/brand/quantum-full-logo-white.svg` | 5,834 | `244f2bb9a95af7ce6d337e1946dedac3ace6cf01feab53c1b0c2d75e58a68032` |
| `brand/quantum-icon-color.svg` | `public/brand/quantum-icon-color.svg` | 788 | `04dc37965b33587fea5f4664660f8a7f9a81ec7904d39925b41c6826b80cded9` |
| `brand/quantum-icon-white.svg` | `public/brand/quantum-icon-white.svg` | 785 | `c660ed87bc5293bfbffa662e523343a7e83bc86cb94848912494e85e0dc9d4ff` |
| `media/maradin-field-aperture-approved.mp4` | `public/media/maradin/maradin-field-aperture-approved.mp4` | 3,962,341 | `daaec510c528bd7f72a97cfce1d9ede3359ec1339e28e26f524d127f09bf247c` |
| `media/maradin-field-aperture-poster-approved.jpg` | `public/media/maradin/maradin-field-aperture-poster-approved.jpg` | 86,343 | `6afc1a69570f2541b89b4f6a5074bec04a5d607743d91670321f550b4d6364bd` |
| `media/maradin-test-contact-approved.mp4` | `public/media/maradin/maradin-test-contact-approved.mp4` | 4,133,483 | `076aecf40d9e67ac29eb0b8e2d34ffc374619862a9679a6e44bc08ccfd2c113d` |
| `media/maradin-prove-field-frame-approved.jpg` | `public/media/maradin/maradin-prove-field-frame-approved.jpg` | 169,156 | `b85f1bd5413b6fe7da235e5217e16b106ae4ff0763e8deb9db6e509dbc0b8b8c` |
| `media/maradin-real-field-still-approved.jpg` | `public/media/maradin/maradin-real-field-still-approved.jpg` | 961,699 | `49ab9aca0d2e3ef9e9ce164f43f9dbd1514ef815179626bef2bb4217827a6741` |

Authoring-only source records:

- `content/maradin-homepage-approved.json`: 4,428 bytes; SHA-256 `2023610b79391854ecde407154310ffdd07d08ad3c8b63cf215f81a74748f06f`; mapped into the typed/sanitized record rather than copied.
- `content/PUBLICATION_APPROVAL.json`: 511 bytes; SHA-256 `c0a6f98dee13500dfdd78c38db70cfb8a210db167701db31784f270619d219cc`; retained outside public output.
- `brand/Quantum-branding-current-2026-06-04.pdf`: 5,960,817 bytes; SHA-256 `b065e08219292daa146064c2ac2054b537bbbdb2acce30d16bd873e5a65c8083`; reviewed but not shipped.

The brand-guide filename/current-pack date is 2026-06-04, while embedded PDF creation and modification timestamps both report 2022-05-25. This provenance discrepancy is disclosed; the explicitly approved source pack remains the checkpoint authority. The pack contains no font binaries, so `FONT-001` remains narrowly unresolved.

## P0 resolution

| Request | Status | Resolution |
| --- | --- | --- |
| FIELD-001 | **RESOLVED** | Approved aperture MP4 and poster imported unchanged. |
| TEST-001 | **RESOLVED** | Approved TEST MP4 imported unchanged. |
| PROVE-001 | **RESOLVED** | Approved primary and supporting stills imported unchanged. |
| CONTENT-001 | **RESOLVED** | Approved public fields implemented through the typed Proof/publication boundary. |
| BRAND-001 | **RESOLVED** | Official full/icon SVGs, palette mapping, navigation identity, and favicon integrated. |
| FONT-001 | **UNRESOLVED — NARROW FOLLOW-UP** | Raleway/Comfortaa are tokenized, but licensed webfont binaries were not supplied; local fallbacks remain and no runtime font service is used. |

## Acceptance gates

| Gate | Required determination | Status | Evidence-backed result |
| --- | --- | --- | --- |
| P2-1 Baseline and source integrity | Correct origin/branch/ancestry; no prohibited sources; approved pack complete and hash-verified | **PASS** | Correct branch/candidate; 13/13 required pack files present; all 9 shipped derivatives hash/byte verified; scans found 0 high-confidence secrets, 0 credential assignments, 0 protected/prohibited `dist` matches, and 0 authoring-only files in `dist`. |
| P2-2 Publication safety | Maradin B+approved eligible; unapproved B/C/D/placeholders denied; internal references stripped; protected material absent | **PASS** | Vitest passes 31/31 across 5 files; public-output scans are clean; approved JSON/approval/PDF authoring sources are absent from `dist`. |
| P2-3 Homepage narrative | SIGNAL remains Quantum-led; APERTURE → NEED → FIND → TEST → PROVE uses the approved record without changing sequence | **PASS** | Playwright passes 37/37; all six ordered states remain reachable and the approved story resolves APERTURE through PROVE. |
| P2-4 Native media behavior | Near-phase loading, muted/inline playback, posters, inactive pause, static reduced motion, no-WebGL independence, responsive crops | **PASS** | Media check validates 9 assets; e2e covers native attributes/lifecycle, reduced motion, no-WebGL, mobile crops, posters, and overflow. |
| P2-5 Brand integration | Official masters and exact pink token used; provisional identity/icon removed; no four-industry taxonomy; FONT-001 disclosed | **PASS** | Official full/icon masters and palette mapping are present; source/output tests pass; FONT-001 is the sole disclosed material limitation. |
| P2-6 Placeholder boundary | Resolved homepage markers removed; unrelated route/development records remain detectable and denied | **PASS** | `npm run release:placeholders` passes 2/2 while retaining later-phase development detection. |
| P2-7 Accessibility | One H1, valid landmarks/headings, keyboard/touch, contrast over actual media, static reduced motion, zero critical/serious axe findings | **PASS** | 20 axe snapshots report 0 critical/serious findings; responsive, keyboard/touch, static-mode, transition, and actual-media-background contrast checks pass. |
| P2-8 Performance | No production dependency added; source film absent; lazy media; bundle delta within target; Lighthouse thresholds and CLS=0 | **PASS** | Total gzip 7,961 bytes; initial gzip 3,917 bytes; both raw/gzip deltas are +581/+236 bytes; Lighthouse is 100/100/100/100 desktop and mobile with CLS 0. |
| P2-9 Human-review evidence | Exactly 7 desktop, 6 mobile, 3 fallback PNGs, one 1440×900 journey WebM, manifest hashes/bytes, and visual QA | **PASS** | Candidate-bound manifest contains the exact inventory; all 16 frames were inspected at original resolution and the complete journey WebM hash/bytes verify. Human creative judgment remains undecided. |
| P2-10 Version control/release | Intentional clean tree; candidate committed and normally pushed; no secrets; no merge/main or production deployment | **PASS** | Implementation candidate `d88f2020851325890e8951d88373475243ef9d1a` and evidence/documentation closure `939b2b3386e468dc995e70bce054bce8b7e44e4a` were scanned, committed, and normally pushed without force. The tree was clean immediately after the closure push. No merge or deployment occurred. |

## Refreshed master-goal H1–H15 ledger

The master-goal hard gates remain authoritative. Phase 2 refreshes them against the Maradin candidate rather than replacing them with the Phase 2-specific gates above.

| Hard gate | Status | Phase 2 evidence |
| --- | --- | --- |
| H1 — Source integrity | **PASS** | Canonical branch/candidate verified; approved pack is complete 13/13; 9 shipped derivatives are byte-for-byte verified; prohibited/protected scans and secret scans report zero matches. |
| H2 — Required foundations | **PASS** | Existing architecture, schemas, publication boundary, navigation, metadata, 404, test foundation, and operational documentation remain substantive; Phase 2 acceptance/review ledgers are added. |
| H3 — Build health | **PASS** | `npm run check` passes: Astro 39 files / 0 diagnostics, ESLint clean, Vitest 31/31, static build 11 pages; Playwright passes 37/37 with no blocking runtime defect. |
| H4 — Publication safety | **PASS** | B+approved Maradin record is eligible; unsafe classifications/placeholders remain denied; authoring-only sources and protected/prohibited material are absent from `dist`. |
| H5 — Six-state narrative | **PASS** | SIGNAL, APERTURE, NEED, FIND, TEST, and PROVE remain ordered, present, distinct, and reachable in the 37-test browser suite. |
| H6 — Observable transformation | **PASS** | Candidate-bound desktop/mobile frames and journey video demonstrate abstraction, real-field reveal, factual constraint, approved selection, physical TEST contact, and settled structured evidence. |
| H7 — Field Aperture | **PASS** | Desktop pointer enhancement, authored field-side documentary reveal, touch/scroll translation, static reduced-motion split, and no-WebGL media path pass tests and visual inspection. |
| H8 — Responsive integrity | **PASS** | 390×844, 430×932, 768×1024, 1440×900, and 1920×1080 checks pass, including media crops, controls, overflow, copy, and scroll exit. |
| H9 — Accessibility | **PASS** | Twenty axe snapshots across settled and transition states report 0 critical/serious findings; heading/landmark, keyboard/touch, static motion, and actual-media-background contrast checks pass. |
| H10 — Performance | **PASS** | Bundle limits pass; initial gzip delta is +236 bytes, total gzip is 7,961 bytes, no Three/R3F is present, and desktop/mobile Lighthouse is 100/100/100/100 with CLS 0. |
| H11 — Fallback parity | **PASS** | Normal desktop, mobile/touch, reduced motion, and no-WebGL preserve navigation, all six semantic acts, approved media meaning, and abstraction → field → evidence. |
| H12 — Placeholder safety | **PASS** | Resolved homepage placeholders are removed; later-phase development records/shells remain machine-detectable and denied; placeholder release tests pass 2/2. |
| H13 — Visual QA evidence | **PASS** | Exact 7 desktop, 6 mobile, and 3 fallback PNGs plus one 1440×900 WebM are candidate-bound; all 16 frames were inspected at original resolution. Human creative judgment remains undecided. |
| H14 — Asset readiness | **PASS** | FIELD-001, TEST-001, PROVE-001, CONTENT-001, and BRAND-001 are resolved with exact provenance; `FONT-001` is a narrow actionable follow-up and later P1/P2 requests remain documented. |
| H15 — Version control / deployment | **PASS** | Implementation candidate `d88f2020851325890e8951d88373475243ef9d1a` and evidence/docs closure `939b2b3386e468dc995e70bce054bce8b7e44e4a` were scanned, committed, and normally pushed without force; the tree was clean immediately after the closure push. Remote preview is unavailable due expired non-interactive Cloudflare auth; no deployment was attempted. |

## Final command ledger

These results are source-bound to implementation candidate `d88f2020851325890e8951d88373475243ef9d1a`.

| Command | Final result |
| --- | --- |
| `npm run check` | **PASS** — Astro checked 39 files with 0 errors, warnings, or hints; ESLint passed; Vitest passed 31/31 across 5 files; 11 static pages built. |
| `npm run release:placeholders` | **PASS** — 2/2 tests in 1 file. |
| `npm run media:check` | **PASS** — 9 public assets; 9,326,266 bytes total, including 8,095,824 video bytes. |
| `npm run bundle:check` | **PASS** — 20,852 raw / 7,961 gzip total; 9,179 / 3,917 initial; 11,673 / 4,044 lazy. No Three.js/R3F. |
| `npm run test:e2e` | **PASS** — 37/37 tests. |
| `npm run lighthouse` | **PASS** — candidate-bound desktop/mobile thresholds passed. |
| `npm run evidence:phase2` | **PASS** — exact 7 desktop, 6 mobile, 3 fallback PNGs, one WebM, and manifest. |
| High-confidence secret scan | **PASS** — 0 secret signatures and 0 credential-assignment matches. |
| Prohibited-source/public-output scan | **PASS** — 0 protected/prohibited matches and 0 authoring-only source files in `dist`. |
| `git status --short` after evidence/docs closure commit and push | **PASS** — no output immediately after the normal closure push. |

## Final metrics and evidence identity

- Build/typecheck/lint/unit: **PASS** — 39 Astro files with 0 diagnostics; lint clean; 31/31 Vitest tests; 11 static pages.
- Playwright/accessibility: **PASS** — 37/37 tests. Twenty axe snapshots cover 6 settled phases on desktop and mobile, 4 desktop TEST → PROVE transition samples, and 4 mobile APERTURE → NEED samples; 0 critical/serious findings. Required viewports and actual-media-background contrast pass.
- Desktop Lighthouse: **PASS** — Performance/Accessibility/Best Practices/SEO `100/100/100/100`; LCP `361.8777 ms`; TBT `0 ms`; CLS `0`.
- Mobile Lighthouse: **PASS** — Performance/Accessibility/Best Practices/SEO `100/100/100/100`; LCP `1480.38845 ms`; TBT `22 ms`; CLS `0`.
- JavaScript: **PASS** — total `20,852` raw / `7,961` gzip; initial `9,179` / `3,917`; lazy `11,673` / `4,044`. Frozen Phase 1 total was `20,271` / `7,725` and initial `8,598` / `3,681`, so both raw/gzip deltas are `+581/+236`. Total gzip remains below 10 KiB and the initial gzip delta below approximately 1 KiB.
- Public media: **PASS** — 9 assets, `9,326,266` bytes total; video bytes `8,095,824`.
- Evidence: **PASS** — `artifacts/review/phase2/manifest.json` is bound to candidate/source HEAD `d88f2020851325890e8951d88373475243ef9d1a`, correct branch, and a clean evidence-start tree. Package contains 7 desktop 1440×900, 6 mobile 390×844, 3 fallback 1440×900 PNGs, and one 1440×900 WebM; total package bytes including manifest are `11,043,751`.
- Journey WebM: `2,154,513` bytes; SHA-256 `2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7`.
- Phase 1 evidence integrity: **PASS** — 32 files unchanged; digest `88ffd3ca6965e0fb063d56b6e65979796c017fa3326251b729e7c4228a31f8c5`.
- Visual technical QA: **PASS** — all 16 frames inspected at original resolution; hierarchy, crops, text plates, brand/third-party marks, and static paths appear intentional; no subtitle contamination or blocking technical visual defect was observed. Human creative judgment remains undecided.
- Known application technical defects: **NONE**.
- Remaining limitations: `FONT-001`; remote preview unavailable because Wrangler reports, “Not logged in. Your auth token has expired and could not be refreshed, and the environment is non-interactive.” Its external log write also failed with sandbox `EPERM`. No remote preview or production deploy was attempted.

## Stop condition

Do not merge to main, deploy to production, expand supporting routes, add another Proof story, or begin ACT 07/08/09. After final verification, commit, and normal push, return the Phase 2 Human Review Package and stop for exactly one decision:

**ACCEPT / REPAIR / REDIRECT**
