# Phase 2 Final Visual Integration Repair — Human Review Package

## Candidate-stage status

The human returned the original Phase 2 visual integration with a **REPAIR** decision. This document is the initial candidate-stage package for that narrow repair. It does not claim that the implementation, regression gates, evidence capture, version-control closure, or visual result has passed.

- Branch: `phase2/maradin-field-evidence`
- Frozen Phase 2 implementation baseline: `d88f2020851325890e8951d88373475243ef9d1a`
- Historical Phase 2 final handoff HEAD: `1ca36be5581dd33d8230f56876580fee4a386904`
- Repair implementation candidate: `PENDING_REPAIR_CANDIDATE_SHA`
- Candidate normal push: `PENDING_REPAIR_CANDIDATE_PUSH`
- Candidate-bound evidence: `PENDING_REPAIR_EVIDENCE_MANIFEST`
- Evidence/documentation closure: `PENDING_REPAIR_EVIDENCE_CLOSURE_SHA`
- Final normal push and clean tree: `PENDING_REPAIR_FINAL_PUSH` / `PENDING_REPAIR_FINAL_CLEAN_TREE`
- P2-1–P2-10: **PENDING_REPAIR_P2_GATE_RESULT**
- H1–H15: **PENDING_REPAIR_HARD_GATE_RESULT**
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

## Before/after evidence required for human review

Every “after” item remains pending until it is bound to `PENDING_REPAIR_CANDIDATE_SHA`, hashed in the repair manifest, and inspected at original resolution.

### 1. APERTURE subtitle contamination

**Before:** the committed original [desktop journey](../artifacts/review/phase2/desktop-journey.webm) shows the baked source line containing “…embedded in the vehicle” around 9.2–9.6 seconds. The original journey is 1440×900, 2,154,513 bytes, SHA-256 `2aca51553494f9aa0a56e472c70f21c6d75404679bb07c98706fb10abda4d4c7`. The original static APERTURE screenshots did not sample this interval.

Planned extracted baseline frame: `../artifacts/review/phase2-repair/baseline-aperture-subtitle-9-40s.png`.

**After, pending:**

- desktop sequence at source times 0.17, 1.84, 2.57, 2.81, 2.95, 3.15, and 3.20 seconds;
- mobile capture at source time 3.05 seconds;
- no-WebGL capture at source time 3.05 seconds;
- poster-only reduced-motion capture; and
- a complete 1440×900 journey that visibly dwells through more than one full 3.2032-second APERTURE loop.

Result: `PENDING_R2_A_BEFORE_AFTER_REVIEW`.

### 2. TEST documentary visibility

**Before:** [original desktop TEST](../artifacts/review/phase2/desktop-test.png) and [original mobile TEST](../artifacts/review/phase2/mobile-test.png) show an opaque information surface dominating too much of the film.

**After, pending:** [repaired desktop TEST](../artifacts/review/phase2-repair/desktop-test-0-70s.png) and [repaired mobile TEST](../artifacts/review/phase2-repair/mobile-test-0-70s.png) must show the actual vehicle and physical field immediately. Desktop opaque coverage must be measured at no more than half of the active documentary frame; mobile must retain a materially meaningful inspectable region. The approved 60+ scenarios fact must remain.

Result: `PENDING_R2_B_BEFORE_AFTER_REVIEW`.

### 3. PROVE focal crops

**Before:** [original desktop PROVE](../artifacts/review/phase2/desktop-prove.png) and [original mobile PROVE](../artifacts/review/phase2/mobile-prove.png) emphasize feet in the primary still and sky/lamp post in the supporting still.

**After, pending:** [repaired desktop PROVE](../artifacts/review/phase2-repair/desktop-prove.png) and [repaired mobile PROVE](../artifacts/review/phase2-repair/mobile-prove.png) must immediately reveal the projected red stop symbol and materially show the Quantum test vehicle while retaining the quiet editorial evidence hierarchy.

Result: `PENDING_R2_C_BEFORE_AFTER_REVIEW`.

### 4. Public workflow labels

**Before:** original APERTURE, NEED, and PROVE presentation visibly says “APPROVED FIELD RECORD”, “APPROVED NEED”, and “APPROVED PUBLIC RECORD”; the PROVE caption also says “approved documentary stills”. These are internal publication-workflow concepts, not public editorial language.

Historical comparison frames:

- [original desktop APERTURE](../artifacts/review/phase2/desktop-aperture-media-reveal.png)
- [original desktop NEED](../artifacts/review/phase2/desktop-need.png)
- [original desktop PROVE](../artifacts/review/phase2/desktop-prove.png)

**After, pending:** repaired APERTURE, [NEED](../artifacts/review/phase2-repair/desktop-need.png), and PROVE captures must show user-facing editorial replacements. Automated presentation coverage must prove that visible homepage output contains no approval status, classification letter, internal provenance, publication-workflow terminology, or any of the three named phrases. The Maradin record must remain B + approved internally and deny-by-default tests must still pass.

Result: `PENDING_R2_D_BEFORE_AFTER_REVIEW`.

## Planned repair evidence inventory

All files below are pending under `artifacts/review/phase2-repair/`:

| Evidence | Viewport/mode | Purpose | Status |
| --- | --- | --- | --- |
| `baseline-aperture-subtitle-9-40s.png` | 1440×900 / historical journey | Exact before frame from the missed interval | `PENDING_EVIDENCE_BASELINE_SUBTITLE` |
| `desktop-aperture-0-17s.png` | 1440×900 / normal | Vehicle/garage subject preservation | `PENDING_EVIDENCE_APERTURE_017` |
| `desktop-aperture-1-84s.png` | 1440×900 / normal | Field environment/progression | `PENDING_EVIDENCE_APERTURE_184` |
| `desktop-aperture-2-57s.png` | 1440×900 / normal | Pre-subtitle projection behavior | `PENDING_EVIDENCE_APERTURE_257` |
| `desktop-aperture-2-81s.png` | 1440×900 / normal | Entry to prior contaminated source interval | `PENDING_EVIDENCE_APERTURE_281` |
| `desktop-aperture-2-95s.png` | 1440×900 / normal | Prior contaminated source interval | `PENDING_EVIDENCE_APERTURE_295` |
| `desktop-aperture-3-15s.png` | 1440×900 / normal | End of prior contaminated interval/projection | `PENDING_EVIDENCE_APERTURE_315` |
| `desktop-aperture-3-20s.png` | 1440×900 / normal | Final source-loop frame | `PENDING_EVIDENCE_APERTURE_320` |
| `desktop-need.png` | 1440×900 / normal | Repaired public NEED label | `PENDING_EVIDENCE_NEED_LABEL` |
| `desktop-test-0-70s.png` | 1440×900 / normal | TEST physicality and opaque-coverage review | `PENDING_EVIDENCE_DESKTOP_TEST` |
| `desktop-prove.png` | 1440×900 / normal | Stop-symbol and supporting-vehicle crop | `PENDING_EVIDENCE_DESKTOP_PROVE` |
| `mobile-aperture-3-05s.png` | 390×844 / normal | Mobile subtitle-safe crop at prior interval | `PENDING_EVIDENCE_MOBILE_APERTURE` |
| `mobile-test-0-70s.png` | 390×844 / normal | Mobile documentary visibility | `PENDING_EVIDENCE_MOBILE_TEST` |
| `mobile-prove.png` | 390×844 / normal | Mobile stop-symbol/supporting-vehicle crop | `PENDING_EVIDENCE_MOBILE_PROVE` |
| `fallback-reduced-motion-aperture.png` | 1440×900 / reduced motion | Clean static poster, no MP4 attachment | `PENDING_EVIDENCE_REDUCED_APERTURE` |
| `fallback-no-webgl-aperture-3-05s.png` | 1440×900 / no WebGL | Subtitle-safe real media without WebGL | `PENDING_EVIDENCE_NOWEBGL_APERTURE` |
| `desktop-repair-journey.webm` | 1440×900 / normal | Complete six-state journey and full APERTURE loop | `PENDING_EVIDENCE_JOURNEY` |
| `manifest.json` | Candidate metadata | Hashes, bytes, states, source times, geometry, comparisons, and prior-evidence integrity | `PENDING_REPAIR_EVIDENCE_MANIFEST` |

The exact planned package is 16 PNGs, one WebM, and one manifest: 18 files total. Final total bytes, every SHA-256, capture timestamp, source candidate, journey duration, and prior-evidence digest: `PENDING_REPAIR_EVIDENCE_IDENTITY`.

## Required technical verification

No final technical claim is made yet. The detailed gate ledger is [PHASE2_REPAIR_ACCEPTANCE.md](PHASE2_REPAIR_ACCEPTANCE.md).

| Verification | Candidate result |
| --- | --- |
| Build/typecheck/lint/unit/content/publication | **PENDING** — `PENDING_REPAIR_CHECK_RESULT` |
| Placeholder release | **PENDING** — `PENDING_REPAIR_PLACEHOLDER_RESULT` |
| Media integrity/native lifecycle | **PENDING** — `PENDING_REPAIR_MEDIA_RESULT` |
| Playwright behavior/responsive/console checks | **PENDING** — `PENDING_REPAIR_E2E_RESULT` |
| axe settled/transition checks | **PENDING** — `PENDING_REPAIR_AXE_RESULT` |
| Bundle/dependency boundary | **PENDING** — `PENDING_REPAIR_BUNDLE_RESULT` |
| Desktop Lighthouse, including CLS | **PENDING** — `PENDING_REPAIR_LIGHTHOUSE_DESKTOP` |
| Mobile Lighthouse, including CLS | **PENDING** — `PENDING_REPAIR_LIGHTHOUSE_MOBILE` |
| Source/protected/public-output scans | **PENDING** — `PENDING_REPAIR_PUBLIC_OUTPUT_SCAN` |
| Secrets/credential-assignment scans | **PENDING** — `PENDING_REPAIR_SECRET_SCAN` |
| Candidate-bound evidence and visual inspection | **PENDING** — `PENDING_REPAIR_VISUAL_QA` |
| Candidate/closure normal pushes and final clean tree | **PENDING** — `PENDING_REPAIR_GIT_VERIFICATION` |

Required thresholds remain: no production dependency, no material JavaScript regression, CLS `0`, and desktop/mobile Performance, Accessibility, Best Practices, and SEO each `≥95`. Existing P2-1–P2-10 and H1–H15 must all be re-proven rather than inherited.

## Human review questions

After the pending evidence and gates are complete, inspect the package for these exact decisions:

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
- Candidate defects, gate results, and visual acceptance remain pending; this document must not be presented as a completed review package until every pending token is resolved truthfully.

## Stop and decision

Do not merge or deploy. When the candidate, evidence, verification, normal pushes, and final clean-tree proof are complete, stop for exactly one human decision:

**ACCEPT / REPAIR / REDIRECT**
