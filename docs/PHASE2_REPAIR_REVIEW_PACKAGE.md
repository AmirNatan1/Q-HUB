# Phase 2 Final Visual Integration Repair — Human Review Package

## Candidate-stage status

The human returned the original Phase 2 visual integration with a **REPAIR** decision. This package now binds the narrow repair implementation and its evidence to one exact candidate. It records candidate-stage technical results; it does **not** claim human acceptance or final version-control closure.

- Branch: `phase2/maradin-field-evidence`
- Frozen Phase 2 implementation baseline: `d88f2020851325890e8951d88373475243ef9d1a`
- Historical Phase 2 final handoff HEAD: `1ca36be5581dd33d8230f56876580fee4a386904`
- Repair implementation candidate: `eb8ca7de932d7b52a74026b66150f1e9c215438c`
- Candidate normal push: **PASS** — `origin/phase2/maradin-field-evidence` resolves to `eb8ca7de932d7b52a74026b66150f1e9c215438c`.
- Candidate-bound evidence: **PASS** — 18 files, 13,789,821 bytes; [manifest](../artifacts/review/phase2-repair/manifest.json) SHA-256 `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124`.
- Evidence/documentation closure: `e5a2f9725390377c74131c892e3358e224b1e780`
- Final normal push and clean tree: **PASS** — candidate, evidence closure, and this docs-only handoff were normally pushed without force; final local/upstream/remote equality and an empty tree were verified.
- P2-1–P2-10: **PASS**.
- H1–H15: **PASS** against the committed candidate, independently audited evidence, and verified version-control closure.
- Human creative judgment: **PENDING HUMAN REVIEW**
- Merge/deployment: **NOT AUTHORIZED**

The original [Phase 2 review package](PHASE2_REVIEW_PACKAGE.md) and [evidence manifest](../artifacts/review/phase2/manifest.json) remain historical records. Their static APERTURE captures missed the subtitle interval. The earlier technical statement that no subtitle contamination remained is superseded by the human **REPAIR** finding and must not be reused as repair acceptance evidence.

## What this repair may change

Only four presentation defects may be repaired:

- deterministically exclude the baked subtitle band from APERTURE while preserving the vehicle, field, projection, and physical scale;
- make the TEST documentary footage dominant by replacing the oversized duplicate statement/plate with compact factual metadata;
- author desktop/mobile PROVE focal positions that reveal the projected stop symbol and test vehicle; and
- replace internal approval-workflow language with public editorial labels while leaving publication filtering unchanged.

No new media, fact, measurement, result, relationship, or dependency is authorized.

## What remains fixed

The repair preserves the six-state journey and accepted trajectory grammar:

`SIGNAL → APERTURE → NEED → FIND → TEST → PROVE`

`ENGAGE → CONSTRAIN → LOCK → DWELL → RELEASE`

It also preserves SIGNAL, the APERTURE headline/interaction, NEED rails, FIND convergence, TEST enclosure/outer transition and left statement, PROVE white/teal release, navigation, phase rail, semantic state attributes, mobile, reduced motion, no-WebGL, official identity, approved Maradin facts, publication/proof schemas, dependency boundary, and unresolved `FONT-001`.

This repair does not reopen Phase 1, expand supporting routes, add another Proof story, begin later acts, merge, or deploy.

## Candidate-bound before/after evidence

Every “after” item below is bound to candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`, decoded, dimension-checked, byte-counted, and hashed in the repair manifest. Candidate and evidence audits passed. The separate independent visual audit inspected all 16 PNGs at original resolution and played the complete WebM through `ended: true`; it found no blocking visual defect. Human creative judgment remains pending.

### 1. APERTURE subtitle contamination

**Before:** the committed original [desktop journey](../artifacts/review/phase2/desktop-journey.webm) shows the baked source line containing “…embedded in the vehicle” around 9.2–9.6 seconds. The original journey is 1440×900, 2,154,513 bytes, SHA-256 `2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7`. The original static APERTURE screenshots did not sample this interval.

Extracted baseline frame: [baseline-aperture-subtitle-9-40s.png](../artifacts/review/phase2-repair/baseline-aperture-subtitle-9-40s.png), 566,790 bytes, SHA-256 `191ee6b5667645f01d8810d017bb83f1b9c256df4a2b36be20bd60453e594ec8`.

**After:**

- desktop sequence at source times 0.17, 1.84, 2.57, 2.81, 2.95, 3.15, and 3.20 seconds;
- mobile capture at source time 3.05 seconds;
- no-WebGL capture at source time 3.05 seconds;
- poster-only reduced-motion capture; and
- a complete 1440×900 journey that records a dwell through more than one full 3.2032-second APERTURE loop.

All desktop video samples use source crop `y=0–931.035` with a `0.137931` source-bottom exclusion ratio. Mobile uses `y=0–931.043` with `0.137923` exclusion. Reduced motion uses the poster at `y=0–931.034` with `0.137931` exclusion; no-WebGL uses the video at `y=0–931.035` with `0.137931` exclusion. The 19.28-second journey is 1440×900 and holds APERTURE for 4,207.2 ms, longer than the complete 3.2032-second source loop; playback is active at both dwell boundaries and complete-loop exposure is verified.

Result: **PASS** — candidate/evidence audit and independent complete-loop visual inspection. Exact paused journey samples from 9.211 through 9.602 seconds, plus source-time samples at 2.95 and 3.15 seconds, remained clean.

### 2. TEST documentary visibility

**Before:** [original desktop TEST](../artifacts/review/phase2/desktop-test.png) and [original mobile TEST](../artifacts/review/phase2/mobile-test.png) show an opaque information surface dominating too much of the film.

**After:** [repaired desktop TEST](../artifacts/review/phase2-repair/desktop-test-0-70s.png) and [repaired mobile TEST](../artifacts/review/phase2-repair/mobile-test-0-70s.png) retain the vehicle/field film and the approved “More than 60 real-world scenarios” fact. Desktop opaque coverage is `0.283588`, leaving `0.716412` unobstructed and an uninterrupted open-height ratio of `0.615718`. Mobile opaque coverage is `0.446654`, leaving `0.553346` unobstructed and an uninterrupted open-height ratio of `0.489127`.

Result: **PASS** — candidate/evidence audit and independent original-resolution visual inspection.

### 3. PROVE focal crops

**Before:** [original desktop PROVE](../artifacts/review/phase2/desktop-prove.png) and [original mobile PROVE](../artifacts/review/phase2/mobile-prove.png) emphasize feet in the primary still and sky/lamp post in the supporting still.

**After:** [repaired desktop PROVE](../artifacts/review/phase2-repair/desktop-prove.png) and [repaired mobile PROVE](../artifacts/review/phase2-repair/mobile-prove.png) use authored focal positions and separate evidence images.

- Desktop stop symbol: source visibility `1.000000`, projected size `269.5×164.5`, subject-color ratio `0.111097`, caption overlap `0`.
- Desktop vehicle: source visibility `1.000000`, projected size `170.074×78.815`, subject-color ratio `0.018420`, caption overlap `0`.
- Mobile stop symbol: source visibility `0.881999`, projected size `111.49×60.022`, subject-color ratio `0.156301`, caption overlap `0`.
- Mobile vehicle: source visibility `1.000000`, projected size `105.537×48.907`, subject-color ratio `0.038640`, caption overlap `0`.

The responsive focal audit additionally passed 1440, 768, 545, 544, 430, and 390-pixel viewport widths, including both sides of the 34rem layout boundary.

Result: **PASS** — candidate/evidence audit and independent original-resolution visual inspection.

### 4. Public workflow labels

**Before:** original APERTURE, NEED, and PROVE presentation visibly says “APPROVED FIELD RECORD”, “APPROVED NEED”, and “APPROVED PUBLIC RECORD”; the PROVE caption also says “approved documentary stills”. These are internal publication-workflow concepts, not public editorial language.

Historical comparison frames:

- [original desktop APERTURE](../artifacts/review/phase2/desktop-aperture-media-reveal.png)
- [original desktop NEED](../artifacts/review/phase2/desktop-need.png)
- [original desktop PROVE](../artifacts/review/phase2/desktop-prove.png)

**After:** repaired APERTURE, [NEED](../artifacts/review/phase2-repair/desktop-need.png), and PROVE use “Field record / SPARK”, “Field condition”, “Proof / field record”, and “Field evidence / documentary stills”. The manifest audits visible main text and rendered HTML across 10 routes. It records zero visible workflow-pattern matches, zero named-phrase matches, and no missing required editorial label. Classification B and `publicApproved` remain internal schema/publication fields.

Result: **PASS** — candidate/evidence audit, focused source/publication/output suite (25/25), and built-output scan (zero protected, prohibited, or authoring-only findings).

## Exact repair evidence inventory

All files are under `artifacts/review/phase2-repair/` and are bound by the manifest to candidate `eb8ca7de932d7b52a74026b66150f1e9c215438c`.

| Evidence | Viewport/mode | Bytes | SHA-256 | Candidate status |
| --- | --- | ---: | --- | --- |
| `baseline-aperture-subtitle-9-40s.png` | 1440×900 / historical journey | 566,790 | `191ee6b5667645f01d8810d017bb83f1b9c256df4a2b36be20bd60453e594ec8` | Verified historical extraction |
| `desktop-aperture-0-17s.png` | 1440×900 / normal | 737,933 | `353a400bee1459d4be7e8fe1f8d6c2d3a103d68b5e9cf1a4ab04d009090fcbf3` | Verified candidate capture |
| `desktop-aperture-1-84s.png` | 1440×900 / normal | 815,086 | `e54e9a54299e9461738f72a94c21ae94ea8e6b116f55fe0ab63eee3898b7729d` | Verified candidate capture |
| `desktop-aperture-2-57s.png` | 1440×900 / normal | 997,841 | `ca686496d53609cae6d637367ce17d914a60e327a2c95832efe36315550470bc` | Verified candidate capture |
| `desktop-aperture-2-81s.png` | 1440×900 / normal | 989,883 | `6a54e54ccc9b0cc39b9bc9a64e584efe36dbf21878327fb078ddf625d2b94b07` | Verified candidate capture |
| `desktop-aperture-2-95s.png` | 1440×900 / normal | 932,824 | `8d12c313a4c4da1c18648ca2e8e8686df02eb7960580e68efd5b8d339b336fe4` | Verified candidate capture |
| `desktop-aperture-3-15s.png` | 1440×900 / normal | 959,049 | `c23ea4bc6898743bf8e48dd95fa4d692b6a8a75528c1b8dd5c94e70b1e2518b2` | Verified candidate capture |
| `desktop-aperture-3-20s.png` | 1440×900 / normal | 925,172 | `861d908af124f7017cccd24d3d5b1a4a37b7bc49eb23399576e1f67704e5a06d` | Verified candidate capture |
| `desktop-need.png` | 1440×900 / normal | 846,715 | `3aa3e7877817ef7453b8a74d23757dc3fefa5f2e5dc87c425d553d309675531b` | Verified candidate capture |
| `desktop-test-0-70s.png` | 1440×900 / normal | 859,168 | `673d47da251c6613c9010e51e4752441d7aa011ee44788e2f9c016e6facc169b` | Verified candidate capture |
| `desktop-prove.png` | 1440×900 / normal | 381,457 | `564359ec50ebcb762b6b9310911421f4edc24f261bf5bdd498bc726c640783ad` | Verified candidate capture |
| `mobile-aperture-3-05s.png` | 390×844 / normal | 204,247 | `d7de7d969e1cfef158fd9d2a1a41ce2c8ba1dd849261dd12f42367d294169dd4` | Verified candidate capture |
| `mobile-test-0-70s.png` | 390×844 / normal | 254,032 | `b0c3a04fbcb46116ca94329e4ac17a11efa32e356b80a295a1e75ae64885f7a9` | Verified candidate capture |
| `mobile-prove.png` | 390×844 / normal | 105,513 | `30b2e79c0f4ac78c1442ebb1be719bfb8057bc4d1c5c95fde427560b7ed3a769` | Verified candidate capture |
| `fallback-reduced-motion-aperture.png` | 1440×900 / reduced motion | 783,907 | `7303f636d80917fe47fda04e5434e0c674e16ec295582e1b50ceb1afd138150c` | Verified candidate capture |
| `fallback-no-webgl-aperture-3-05s.png` | 1440×900 / no WebGL | 994,166 | `179a29e705de63cf2555aac7716ce4263aed3e126e13932abdc9ace278958c71` | Verified candidate capture |
| `desktop-repair-journey.webm` | 1440×900 / normal | 2,381,607 | `885fb328a4ac59d6f70e8d1771ebe092ed218b7538bdc0e8f583c67988b92c89` | Decoded 19.28-second complete journey |
| `manifest.json` | Candidate metadata | 54,431 | `033716c3b6c7b50ad774e33bc6526ac4ee92a0f8fa4c026febce0a4ac57bb124` | Verified package manifest |

The exact package is 16 PNGs, one WebM, and one manifest: **18 files and 13,789,821 bytes**. It was generated at `2026-08-15T21:10:24.921Z` from a clean tree whose HEAD and explicit candidate value both equaled `eb8ca7de932d7b52a74026b66150f1e9c215438c`. Every screenshot decoded at its contracted dimensions; every artifact hash and byte count was checked; the WebM decoded at 1440×900; and promotion verified the prior review evidence unchanged.

The prior evidence set remains **50 files and 33,528,579 bytes**, with before/after digest `81b51cb6e6902fb5a3d33314f1ddac206061a86096efae21b272df57d5602b69`.

## Candidate-stage technical verification

The detailed gate ledger is [PHASE2_REPAIR_ACCEPTANCE.md](PHASE2_REPAIR_ACCEPTANCE.md). Every technical, evidence, and version-control gate below passed. Human creative judgment remains pending.

| Verification | Candidate result |
| --- | --- |
| `npm run check` | **PASS** — Astro checked 41 files; lint passed; Vitest passed 32/32; production build emitted 11 pages. |
| Placeholder release | **PASS** — 2/2. |
| Media integrity/native lifecycle | **PASS** — 9/9 approved media assets. |
| Playwright behavior/responsive/console checks | **PASS** — 41/41; deterministic isolated in-process Astro lifecycle exits cleanly. |
| axe settled/transition checks | **PASS** — included in the 41/41 Playwright result. |
| Bundle/dependency boundary | **PASS** — total JavaScript 20.4 KiB raw / 7.8 KiB gzip; initial 9.0 KiB raw / 3.8 KiB gzip; no Three.js or R3F. |
| Desktop Lighthouse, including CLS | **PASS** — Performance / Accessibility / Best Practices / SEO `100 / 100 / 100 / 100`; CLS `0`. |
| Mobile Lighthouse, including CLS | **PASS** — Performance / Accessibility / Best Practices / SEO `100 / 100 / 100 / 100`; CLS `0`. |
| Candidate/evidence integrity audits | **PASS** — exact candidate binding, clean-start capture, decode/dimension/hash/byte checks, prior-evidence preservation, R2 geometry, and browser-harness audits passed. |
| Focused content/publication verification | **PASS** — 25/25 tests across source integrity, publication eligibility, and public output after a fresh production build. |
| Source/protected/public-output scans | **PASS** — zero unexpected prohibited-source references, zero protected/prohibited `dist` matches, and zero authoring-only files in `dist`. |
| Secrets/credential-assignment scans | **PASS** — zero high-confidence secret files and zero credential-assignment files. |
| Final independent original-resolution visual audit | **PASS** — all 16 PNGs inspected; complete 19.28-second WebM played through `ended: true`; exact repaired subtitle-interval samples were clean; no blocking visual defect. |
| Candidate push | **PASS** — remote branch equals `eb8ca7de932d7b52a74026b66150f1e9c215438c`. |
| Evidence/documentation closure | **PASS** — `e5a2f9725390377c74131c892e3358e224b1e780`, normally pushed without force. |
| Final normal push and clean tree | **PASS** — this docs-only handoff was normally pushed; local `HEAD`, upstream, and remote tip equality plus an empty status were verified afterward. |

No production dependency was added, no material JavaScript regression was measured, CLS is `0`, and every desktop/mobile Lighthouse category exceeds the required `≥95`. P2-10 and H15 pass with the scanned evidence closure, normal pushes, final clean tree, and local/upstream/remote equality recorded.

## Human review questions

The evidence and version-control closure are complete. Inspect the package for these exact decisions:

- Across the entire APERTURE loop, is all baked subtitle/editorial text excluded while the vehicle, field, projection behavior, and scale remain intact?
- Is the same true on mobile and no-WebGL, and is reduced motion a clean intentional poster composition?
- Does at least half of desktop TEST remain unobstructed by opaque metadata?
- Does mobile TEST show meaningful documentary material rather than a decorative strip?
- Is the vehicle/field context immediately visible, with TEST more physical than FIND and less resolved than PROVE?
- Is the projected stop symbol immediately visible in desktop and mobile PROVE?
- Does the supporting PROVE still materially show the Quantum test vehicle?
- Does PROVE remain quiet and evidence-led?
- Are public labels editorial rather than publication-workflow language, while filtering remains unchanged?
- Did all regression, accessibility, performance, evidence-integrity, and source-safety gates pass without a new dependency or invented fact?

## Known limitations and non-goals

- `FONT-001` deliberately remains unresolved; no licensed Raleway/Comfortaa binaries were supplied.
- No remote deployment or production deployment is authorized. Historical Cloudflare authentication was expired; local production preview is sufficient for this repair evidence.
- Unless stronger evidence is actually recorded, testing remains Chromium/local-lab rather than physical-device, Safari, Firefox, field telemetry, or a dedicated screen-reader session.
- Supporting routes remain later-phase shells. No second Proof story, broader Proof library, ACT 07/08/09 work, or Phase 1 redesign is included.
- Human creative acceptance remains pending. Technical PASS is not a human **ACCEPT** decision.

## Stop and decision

Do not merge or deploy. No merge or deployment has occurred. The repair package is complete; stop for exactly one human decision:

**ACCEPT / REPAIR / REDIRECT**
