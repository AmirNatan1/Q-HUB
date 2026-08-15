# Phase 2 Final Visual Integration Repair — Acceptance Ledger

## Authority, scope, and candidate status

The human Phase 2 decision is **REPAIR**. This is a narrow visual-integration repair of the accepted Maradin homepage implementation; it is not a redesign, a Phase 1 reopening, or authorization for later work.

- Branch: `phase2/maradin-field-evidence`
- Frozen Phase 2 implementation baseline: `d88f2020851325890e8951d88373475243ef9d1a`
- Historical Phase 2 evidence/documentation closure: `939b2b3386e468dc995e70bce054bce8b7e44e4a`
- Historical Phase 2 final handoff HEAD: `1ca36be5581dd33d8230f56876580fee4a386904`
- Repair implementation candidate: `eb8ca7de932d7b52a74026b66150f1e9c215438c`
- Repair candidate normal push: **PASS** — local `HEAD` and `origin/phase2/maradin-field-evidence` both resolve to `eb8ca7de932d7b52a74026b66150f1e9c215438c`.
- Clean candidate tree at repair-evidence start: **PASS** — the manifest records `workingTreeCleanAtStart: true`, an empty `statusPorcelainAtStart`, and source candidate equal to `HEAD`.
- Repair evidence manifest: `artifacts/review/phase2-repair/manifest.json` — 54,431 bytes, SHA-256 `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124`, source candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`.
- Repair evidence/documentation closure: `PENDING_REPAIR_EVIDENCE_CLOSURE_SHA`
- Final normal push: `PENDING_REPAIR_FINAL_PUSH`
- Final clean tree/upstream equality: `PENDING_REPAIR_FINAL_CLEAN_TREE`
- Merge/deployment status: **NOT AUTHORIZED** — no merge to `main`, remote deployment, or production deployment may occur in this repair
- Technical result through H14/P2-9: **PASS** — P2-10/H15 evidence-and-documentation closure remains pending.
- Human creative judgment: **PENDING HUMAN REVIEW**

The prior Phase 2 package remains historical evidence. Its static APERTURE screenshots did not sample the contaminated source-film interval, and its statement that no subtitle contamination remained is superseded by the human **REPAIR** finding and this ledger. This ledger is bound to candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`; it is not a human acceptance decision.

## Narrow repair boundary

Only these four findings are in scope:

1. **R2-A — APERTURE subtitle contamination:** deterministically crop/scale/position the already approved APERTURE film so its baked subtitle band can never enter the authored composition.
2. **R2-B — TEST physicality:** reduce the opaque metadata surface so documentary footage becomes the dominant material while all approved facts remain.
3. **R2-C — PROVE focal crops:** position the existing approved stills so the projected stop symbol and Quantum test vehicle are immediately legible.
4. **R2-D — Public editorial language:** keep publication metadata and filtering internal while removing approval-workflow language from visible homepage presentation.

No public media replacement, generative fill, blur, arbitrary black subtitle bar, or unrelated UI cover is permitted. No new measurement, outcome, corporate fact, relationship, or commercial implication may be introduced.

## Preserved contract

The repair must preserve, without material alteration:

- `SIGNAL → APERTURE → NEED → FIND → TEST → PROVE`;
- `ENGAGE → CONSTRAIN → LOCK → DWELL → RELEASE`;
- SIGNAL composition and copy;
- the APERTURE headline and interaction concept;
- NEED pressure/rail architecture;
- FIND convergence architecture;
- the TEST outer enclosure, left-side “OUT OF ABSTRACTION. / INTO CONTACT.” statement, and core transition concept;
- the PROVE white/teal release and quiet evidence state;
- navigation architecture and phase rail;
- publication and proof schemas, except for a demonstrably necessary clean-presentation adjustment;
- the B + `publicApproved: true` Maradin record and deny-by-default filtering;
- semantic state attributes;
- reduced-motion, no-WebGL, and mobile phase architectures;
- official Quantum identity integration;
- every existing public-approved Maradin fact;
- the current production dependency boundary; and
- unresolved `FONT-001` status.

The repair must not reopen Phase 1, expand supporting routes, add another Proof story, begin later homepage acts, resolve `FONT-001`, merge, or deploy.

## Content and publication boundary

The Maradin record remains classification **B** with `publicApproved: true`. Publication classification, approval state, authoring provenance, and filtering rules remain internal engineering data. The public homepage may continue to render the previously approved Maradin, Hyundai CRADLE TLV, SPARK, field-condition, technology, environment, test, comparative-evidence, and next-step facts.

The repair must continue to withhold:

- `decision`, an invented full date, and an invented location;
- contracts and commercial terms;
- internal final-report material;
- proprietary KPI tables and raw measurements;
- confidential specifications;
- source references, Drive IDs, and approval-authoring metadata; and
- inferred deployment, adoption, production, procurement, scaling, sales, or commercialization outcomes.

Visible editorial labels must no longer expose “APPROVED FIELD RECORD”, “APPROVED NEED”, “APPROVED PUBLIC RECORD”, approval status, classification letters, internal provenance, or publication-workflow terminology. The publication schema and eligibility rules must not be weakened to accomplish this presentation-only change.

## Repair acceptance ledger

The determinations below are bound to candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c` and its manifest. Automated capture, geometry, focused publication tests, manual scans, and final original-resolution visual audit pass. Only P2-10/H15 evidence-and-documentation closure and human creative judgment remain unresolved.

### R2-A — Remove APERTURE subtitle contamination

| Requirement | Status | Required evidence |
| --- | --- | --- |
| A1 — No baked subtitle or unrelated source-film editorial text is visible at any point during desktop APERTURE playback | **PASS — candidate evidence** | Seven exact desktop samples requested and reached source seconds `0.17`, `1.84`, `2.57`, `2.81`, `2.95`, `3.15`, and `3.20` of the 3.2032-second source. Crop geometry excludes the bottom `13.7931%` (`yMax 931.035`), with `overflow: hidden` and position `52% 0%`. The complete journey exposes a full loop; exact paused audit samples spanning journey seconds `9.211–9.602` are clean. |
| A2 — No baked subtitle is visible on mobile | **PASS — candidate evidence** | 390×844 sample at source second `3.05`; crop excludes the bottom `13.7923%` (`yMax 931.043`) with position `38% 0%`. |
| A3 — The crop preserves the primary vehicle, field environment, projection behavior, and physical scale | **PASS — candidate evidence** | The seven desktop samples and mobile sample retain the primary field/vehicle composition. All 16 PNGs passed original-resolution inspection; the candidate images are distinct and the exact prior-contamination interval contains no subtitle band. |
| A4 — Reduced-motion and no-WebGL APERTURE remain clean | **PASS — candidate evidence** | Reduced-motion poster crop excludes the bottom `13.7931%` (`yMax 931.034`); no-WebGL capture at source second `3.05` excludes `13.7931%` (`yMax 931.035`). Both preserve semantic DOM content. |

The historical journey is 16.84 seconds at 1440×900. Human review identified contamination around journey time 9.2–9.6 seconds; direct diagnostic inspection localized the baked subtitle to approximately source time 2.90–3.15 seconds of the 3.2032-second APERTURE MP4. Final evidence must record requested and actual source times rather than rely only on fractions.

### R2-B — Let TEST become physical

| Requirement | Status | Required evidence |
| --- | --- | --- |
| B1 — At least half of the active desktop documentary frame remains unobstructed by opaque text surfaces | **PASS — candidate evidence** | Video `630.891×574`; opaque plate `512×200.578`; opaque intersection ratio `0.283588`; unobstructed ratio `0.716412`; open-height ratio `0.615718`. |
| B2 — Mobile retains a materially meaningful documentary region | **PASS — candidate evidence** | Video `346×388`; opaque plate `322×186.219`; opaque intersection ratio `0.446654`; unobstructed ratio `0.553346`; open-height ratio `0.489127`. |
| B3 — Vehicle and physical field context are immediately visible in settled TEST | **PASS — candidate evidence** | Desktop and mobile captures at source second `0.70` visibly retain the vehicle/garage field context; object positions are `52% 50%` and `55% 50%`, respectively. |
| B4 — TEST remains more physical than FIND and less resolved than PROVE | **PASS — candidate evidence** | The 41/41 browser suite verifies the phase transition and material hierarchy; the captured TEST frame remains documentary-led while the approved “more than 60 real-world scenarios” fact and four compact metadata fields remain present. Final package-wide visual judgment remains human-owned. |

The approved “more than 60 real-world scenarios” fact and compact MOUNT, POSITIONS, CONDITIONS, and SCENARIOS metadata must remain. No new measurement may be invented.

### R2-C — Fix PROVE media focal crops

| Requirement | Status | Required evidence |
| --- | --- | --- |
| C1 — The projected stop symbol is clearly visible in the first settled desktop PROVE composition | **PASS — candidate evidence** | Decoded 1920×1080 image in a `672×209.969` frame at `50% 100%`; source crop `y=480.089–1080`; stop-symbol visibility `1.0`; projected symbol `269.5×164.5`; caption overlap `0`; direct artifact color ratio `0.133316`. |
| C2 — The projected stop symbol is clearly visible in mobile PROVE | **PASS — candidate evidence** | Decoded image in a `278×61.594` frame at `48% 90%`; source crop `y=589.144–1014.540`; stop-symbol visibility `0.881999`; projected symbol `111.49×60.022`; caption overlap `0`; direct artifact color ratio `0.158745`. |
| C3 — The supporting still materially shows the Quantum test vehicle rather than primarily sky/lamp post | **PASS — candidate evidence** | Desktop: decoded 2160×3840 image in `448×209.969` at `55% 58%`, source crop `y=1640.037–2652.387`, visibility `1.0`, projected vehicle `170.074×78.815`, overlap `0`, direct artifact ratio `0.021212`. Mobile: `278×61.594` at `50% 48%`, crop `y=1613.486–2092.056`, visibility `1.0`, projected vehicle `105.537×48.907`, overlap `0`, ratio `0.038743`. Independent crop reconstruction differed by at most `0.0017px`. |
| C4 — PROVE remains quiet, editorial, and evidence-led | **PASS — candidate evidence** | Candidate capture preserves the white/teal release and schema-derived evidence record; no caption overlaps either focal subject. Final creative acceptance remains `PENDING HUMAN REVIEW`. |

Only `maradin-prove-field-frame-approved.jpg` and `maradin-real-field-still-approved.jpg` may be used. Separate authored desktop/mobile focal positions are allowed; replacement imagery is not.

### R2-D — Remove internal publication language from public UI

| Requirement | Status | Required evidence |
| --- | --- | --- |
| D1 — The three named workflow phrases are absent from public homepage output | **PASS — candidate evidence** | Manifest workflow audit covers 10 routes: status `passed`, `0` visible workflow matches, and `0` rejected named-phrase matches. |
| D2 — Visible homepage copy exposes no approval status, classification letter, internal provenance, or publication-workflow terminology | **PASS — candidate evidence** | Ten-route audit found `0` visible workflow matches; manual scans found `0` protected/prohibited dist files and `0` authoring-only dist files; source-reference and approval metadata remain internal. |
| D3 — User-facing replacements are present and editorially consistent | **PASS — candidate evidence** | Audit found `0` missing editorial labels; APERTURE, NEED, and PROVE candidate captures contain the intended public-facing replacements. |
| D4 — Publication filtering remains deny-by-default with Maradin still B + approved | **PASS** | The complete 32/32 unit suite passes; the focused source-integrity/publication/content-output run passes 25/25; Maradin remains B + `publicApproved: true`. |

## Required repair evidence inventory

The new package must be isolated under `artifacts/review/phase2-repair/`. Existing Phase 1, Phase 1 repair, and original Phase 2 evidence must remain byte-for-byte unchanged and must be hashed before and after repair capture.

Captured candidate-bound files:

### Baseline comparison

1. `baseline-aperture-subtitle-9-40s.png` — reproducibly extracted from the committed original Phase 2 journey at 9.40 seconds, without browser controls.

### Desktop, exact 1440×900

1. `desktop-aperture-0-17s.png`
2. `desktop-aperture-1-84s.png`
3. `desktop-aperture-2-57s.png`
4. `desktop-aperture-2-81s.png`
5. `desktop-aperture-2-95s.png`
6. `desktop-aperture-3-15s.png`
7. `desktop-aperture-3-20s.png`
8. `desktop-need.png`
9. `desktop-test-0-70s.png`
10. `desktop-prove.png`

### Mobile, exact 390×844

1. `mobile-aperture-3-05s.png`
2. `mobile-test-0-70s.png`
3. `mobile-prove.png`

### Fallback, exact 1440×900

1. `fallback-reduced-motion-aperture.png`
2. `fallback-no-webgl-aperture-3-05s.png`

### Motion and manifest

1. `desktop-repair-journey.webm` — complete new 1440×900 journey with all six phases and an APERTURE dwell longer than one complete 3.2032-second source loop.
2. `manifest.json` — source candidate/branch/clean-start identity, hashes, bytes, viewport, mode, phase/progress, requested/actual media time, crop and geometry data, workflow-language audit, prior-evidence integrity, and journey metadata.

The exact repair package contract is 16 PNGs, one WebM, and one manifest: 18 files total.

Required old comparison sources remain under `artifacts/review/phase2/`: the 9.40-second interval in `desktop-journey.webm`, desktop/mobile TEST, desktop/mobile PROVE, and APERTURE/NEED/PROVE label-bearing frames. Their hashes and byte sizes must be referenced rather than silently replaced.

Candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c` produced the exact 18-file contract: 16 PNGs, one WebM, and one manifest totaling **13,789,821 bytes**. The 16 PNGs total **11,353,783 bytes**; all decoded at the recorded dimensions and all 16 hashes are unique. `manifest.json` is **54,431 bytes**, SHA-256 `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124`, and its source candidate equals the capture `HEAD`.

`desktop-repair-journey.webm` is **2,381,607 bytes**, SHA-256 `885fb328a4ac59d6f70e8d1771ebe092ed218b7538bdc0e8f583c67988b92c89`, 1440×900, and **19.28 seconds**. It reaches SIGNAL/APERTURE/NEED/FIND/TEST/PROVE in strict order at `2378.8 / 9750.5 / 11613.3 / 13510.3 / 15950.9 / 17919.4 ms`. APERTURE requested a 4200 ms dwell and recorded **4207.2 ms**, exceeding the 3500 ms requirement by 707.2 ms and the 3.2032-second source loop by 1004 ms. Playback was active at the recorded start/end; start/end source times were `2.751093 / 0.260862`, `loop` was true, and `completeLoopExposure` was true. Independent decoding at `0.10`, `9.64`, and `19.18` seconds succeeded; the three APERTURE journey samples at 5, 7, and 9 seconds are distinct.

The historical 50-file evidence set remains byte-identical at **33,528,579 bytes** with `0` mismatches; its before/after/current digest is `81b51cb6e6902fb5a3d33314f1ddac206061a86096efae21b272df57d5602b69`. The historical 1440×900 journey remains **2,154,513 bytes**, SHA-256 `2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7`, and **16.84 seconds**; the reproducible 9.40-second baseline extraction contains the superseded subtitle contamination.

The manifest records byte and SHA-256 identity for all 17 media files. Independent audit matched all 17 records. All 16 PNGs passed original-resolution inspection. The complete WebM played from `0.00` to `ended: true` at 19.28 seconds; exact paused samples across `9.211–9.602` seconds are clean. Candidate identity, hashes, inventory, and prior-evidence digest all match, with zero blocking visual defects. This technical audit does not itself confer human acceptance.

## Refreshed P2-1–P2-10 ledger

The determinations below are bound to repair candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`. A **PENDING** result identifies work deliberately left for the docs-only closure; it is not waived by another passing command.

| Gate | Status | Candidate-stage determination |
| --- | --- | --- |
| P2-1 — Baseline and source integrity | **PASS** | Candidate, branch, clean capture start, unchanged prior evidence, exact media identity, and manifest provenance pass. Manual scans found `0` unexpected prohibited-source references, `0` high-confidence secret files, and `0` credential-assignment files. |
| P2-2 — Publication safety | **PASS** | Complete unit suite 32/32, focused source-integrity/publication/content-output suite 25/25, and 10-route workflow audit pass. Manual dist scans found `0` protected/prohibited files and `0` authoring-only files. |
| P2-3 — Homepage narrative | **PASS** | The 41/41 browser suite and journey manifest verify all six states in strict SIGNAL → APERTURE → NEED → FIND → TEST → PROVE order, with permitted editorial-label changes only. |
| P2-4 — Native media behavior | **PASS** | Browser coverage and candidate captures verify lazy/inactive behavior, posters, authored desktop/mobile crops, reduced motion, no-WebGL, and decoded motion evidence. |
| P2-5 — Brand integration | **PASS with disclosed limitation** | Official identity and palette roles remain. `FONT-001` remains unresolved by explicit instruction. |
| P2-6 — Placeholder boundary | **PASS** | `npm run release:placeholders` passed 2/2 checks; development placeholders remain machine-identifiable and denied from resolved public output. |
| P2-7 — Accessibility | **PASS within tested coverage** | The 41/41 browser suite covers semantic, keyboard/touch, axe, forced-colors, reduced-motion, and static modes. Physical devices, Safari, Firefox, and a dedicated screen-reader session were not tested. |
| P2-8 — Performance | **PASS** | Desktop/mobile Lighthouse are 100/100/100/100; LCP is `0.3s / 1.1s`, TBT `0 / 0 ms`, CLS `0 / 0`; bundle gate passes with no Three.js/R3F. |
| P2-9 — Human-review evidence | **PASS — package ready** | Exact candidate-bound 18-file package, prior contaminated interval, full-loop journey, hashes, geometry, and decode checks pass. All 16 PNGs and the complete 19.28-second WebM passed original-resolution inspection with zero blocking defects. Human creative judgment remains pending. |
| P2-10 — Version control/release | **PENDING** | `PENDING_P2_10_VERSION_CONTROL` — the candidate is normally pushed and upstream-equal; evidence/docs closure commit and push, final handoff commit and push, and final clean upstream equality remain pending. No force, merge, or deploy is authorized. |

## Refreshed H1–H15 ledger

| Hard gate | Status | Candidate-stage determination |
| --- | --- | --- |
| H1 — Source integrity | **PASS** | Candidate identity, clean evidence start, ancestry basis, all 17 repair-media hashes, unchanged 50-file prior-evidence digest, prohibited-source scan, and secret/credential scans pass. Counts: `0` unexpected prohibited-source references, `0` high-confidence secret files, `0` credential-assignment files. |
| H2 — Required foundations | **PASS** | `npm run check` confirms the strict Astro/TypeScript architecture, schemas, routes, documentation-linked tests, and 11-page production build remain substantive. |
| H3 — Build health | **PASS** | Astro checked 41 files with 0 diagnostics; lint passed; Vitest passed 5/5 files and 32/32 tests; build produced 11 pages; Playwright passed 41/41. |
| H4 — Publication safety | **PASS** | Full unit suite 32/32, focused publication/source/output suite 25/25, and 10-route workflow audit pass with zero visible or named workflow matches; dist scans found `0` protected/prohibited files and `0` authoring-only files. |
| H5 — Six-state narrative | **PASS** | Browser suite and 19.28-second journey record strict SIGNAL → APERTURE → NEED → FIND → TEST → PROVE order. |
| H6 — Observable transformation | **PASS — candidate evidence** | Candidate capture and browser assertions preserve the authored SIGNAL/APERTURE/NEED/FIND/TEST/PROVE distinctions and ABSTRACTION → FIELD → EVIDENCE transition. Final human creative judgment remains pending. |
| H7 — Field Aperture | **PASS — candidate evidence** | Desktop/mobile/reduced/no-WebGL captures, exact source-time samples, complete-loop dwell, and crop geometry demonstrate a subtitle-safe composition with semantic fallback. |
| H8 — Responsive integrity | **PASS within automated coverage** | The 41/41 browser suite passes required 390×844, 430×932, 768×1024, 1440×900, and 1920×1080 cases; candidate evidence includes exact 390×844 and 1440×900 captures. |
| H9 — Accessibility | **PASS within tested coverage** | Keyboard, landmarks/headings, accessible names, focus, axe, forced colors, reduced motion, and touch/static paths pass in local Chromium. Physical devices and dedicated assistive-technology sessions remain limitations. |
| H10 — Performance | **PASS** | Lighthouse desktop/mobile are 100/100/100/100 with LCP `0.3s / 1.1s`, TBT `0 / 0 ms`, and CLS `0 / 0`. Bundle is 20,852 raw / 7,961 gzip bytes total and no Three.js/R3F is present. |
| H11 — Fallback parity | **PASS** | Normal desktop/mobile, reduced-motion poster, and no-WebGL captures retain navigation, state meaning, and intentional APERTURE composition. |
| H12 — Placeholder safety | **PASS** | Release placeholder gate passed 2/2 checks. |
| H13 — Visual QA evidence | **PASS — package ready** | All 16 PNGs passed original-resolution inspection; the complete WebM played `0.00→19.28s` to `ended: true`; exact paused samples across `9.211–9.602s` are clean; candidate/hash/inventory/prior digest match; zero blocking defects. |
| H14 — Asset readiness | **PASS with disclosed limitation** | Media check passed 9 assets / 9,326,266 total bytes / 8,095,824 video bytes; no replacement media was introduced. `FONT-001` stays unresolved. |
| H15 — Version control/deployment | **PENDING** | `PENDING_H15_VERSION_CONTROL` — candidate push is verified; closure/final normal pushes and final clean upstream equality remain. Merge and deployment remain prohibited. |

## Required command ledger

Results below are fresh and bound to candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c` unless explicitly marked pending.

| Command | Repair result |
| --- | --- |
| `npm run check` | **PASS** — Astro checked 41 files with 0 errors, 0 warnings, and 0 hints; ESLint passed; Vitest passed 5/5 files and 32/32 tests; production build emitted 11 pages. |
| `npm run release:placeholders` | **PASS** — 2/2 checks. |
| `npm run media:check` | **PASS** — 9 assets; 9,326,266 total bytes; 8,095,824 video bytes. |
| `npm run test:e2e` | **PASS** — Playwright 41/41, including behavior, responsive modes, console-error coverage, and axe checks. |
| `npm run bundle:check` | **PASS** — total JavaScript 20,852 raw / 7,961 gzip bytes (20.4/7.8 KiB); initial 9,179 / 3,917 bytes (9.0/3.8 KiB); lazy 11,673 / 4,044 bytes; no Three.js or R3F. |
| `npm run lighthouse` | **PASS** — desktop and mobile both 100/100/100/100; LCP `0.3s / 1.1s`; TBT `0 / 0 ms`; CLS `0 / 0`. |
| `npx vitest run tests/source-integrity.test.ts tests/publication.test.ts tests/content-output.test.ts` | **PASS** — 25/25 focused source-integrity, publication, and content-output tests. |
| `npm run evidence:phase2:repair` | **PASS** — exact 18-file contract, 13,789,821 bytes; source candidate/HEAD `eb8ca7de932d7b52a74026b66150f1e9c215438c`; manifest SHA-256 `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124`; clean start; prior evidence unchanged. |
| High-confidence secret and credential-assignment scans | **PASS** — `0` high-confidence secret files; `0` credential-assignment files. |
| Prohibited-source/protected-material/public-output scans | **PASS** — `0` unexpected prohibited-source references; `0` protected/prohibited dist files; `0` authoring-only dist files. |
| `git diff --check` and staged equivalent | **PASS at candidate stage** — working-tree diff check exits 0; final staged closure verification is governed by P2-10/H15. |
| Candidate/closure `git status`, `HEAD`, upstream, log, normal-push verification | **PASS for candidate; P2-10/H15 pending for closure** — candidate `HEAD == @{u} == eb8ca7de932d7b52a74026b66150f1e9c215438c`; closure/final verification remains pending. |

The candidate exactly matches the historical JavaScript totals: 20,852 raw / 7,961 gzip bytes total; 9,179 / 3,917 initial; 11,673 / 4,044 lazy. Candidate desktop/mobile Lighthouse also remains 100/100/100/100 with CLS 0; these are fresh candidate results, not copied baselines.

## Candidate-binding and version-control sequence

| Step | Candidate-stage status |
| --- | --- |
| 1. Complete the narrow implementation and automated tests. | **COMPLETE** — implementation candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`; complete check and browser suite pass. |
| 2. Run preliminary checks; review the exact diff and preserve unrelated/user changes. | **COMPLETE for candidate construction**. |
| 3. Stage only intentional repair implementation, test, capture-tool, and candidate-stage documentation files. | **COMPLETE for candidate commit**. |
| 4. Run staged diff, secret, credential, prohibited-source, and public-boundary scans. | **COMPLETE for candidate; PENDING final closure rerun** — candidate scans are clean; the staged evidence/docs closure will be scanned immediately before commit. |
| 5. Commit the repair candidate normally. | **COMPLETE** — `eb8ca7de932d7b52a74026b66150f1e9c215438c`; local and upstream branch tips match. |
| 6. Verify the candidate tree is clean before evidence capture. | **COMPLETE** — manifest records clean start and empty porcelain status. |
| 7. Capture the isolated repair package from the exact candidate. | **COMPLETE** — source candidate equals capture HEAD; exact 18-file contract; all prior evidence unchanged. |
| 8. Run the complete regression contract and regenerate bundle/Lighthouse/media results. | **COMPLETE** — all principal commands and the dedicated 25-test publication/source/output trio pass. |
| 9. Inspect every repair PNG at original resolution and sample the complete WebM. | **COMPLETE** — all 16 PNGs and the full 19.28-second WebM passed independent original-resolution inspection; exact subtitle-interval samples are clean. |
| 10. Normally push the repair candidate without force. | **COMPLETE** — local and upstream branch tips equal `eb8ca7de932d7b52a74026b66150f1e9c215438c`. No merge or deploy. |
| 11. Finalize this ledger, the repair review package, and `docs/QA.md`; stage and scan the evidence/documentation closure. | **PENDING docs-only closure**. |
| 12. Commit and normally push the evidence/documentation closure. | **PENDING** — `PENDING_REPAIR_EVIDENCE_CLOSURE_SHA` and `PENDING_REPAIR_FINAL_PUSH`. |
| 13. Close H15 in a docs-only handoff commit and verify upstream equality and an empty tree. | **PENDING** — `PENDING_REPAIR_FINAL_CLEAN_TREE` and `PENDING_REPAIR_GIT_VERIFICATION`; then stop. |

## Known limitations and prohibited expansion

- `FONT-001` remains unresolved by explicit instruction; no font binary or runtime font service may be added.
- Remote Cloudflare preview was unavailable at the prior checkpoint because authentication was expired and could not refresh non-interactively. This repair authorizes no deployment; only local production-preview evidence is expected.
- Browser evidence remains Chromium/local-lab rather than physical-device, Safari, Firefox, field telemetry, or a dedicated screen-reader session unless stronger evidence is actually gathered and recorded.
- Supporting routes remain later-phase shells. No broader Proof library, second story, or ACT 07/08/09 work is included.
- Candidate technical result through P2-9/H14 is **PASS**. Final P2-10/H15 closure still requires the evidence/docs commit, final handoff commit, normal pushes, staged scans, and clean-tree/upstream verification. Passing technical and visual audits are not human creative acceptance.

## Stop condition

Do not merge, deploy, expand scope, or continue into later acts. Once and only once the repair requirements, P2-1–P2-10, H1–H15, candidate-bound evidence, normal pushes, and final clean-tree verification pass, return the repair Human Review Package and stop for exactly one decision:

**ACCEPT / REPAIR / REDIRECT**
