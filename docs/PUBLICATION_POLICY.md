# Publication policy

## Phase R homepage publication boundary — current contract

Phase R changes homepage emphasis, not the deny-by-default publication model. Every substantive homepage act, strategic organization, program proposition, and Proof record must still be sourced, classified, explicitly approved, schema-valid, publication-filtered, and stripped of internal provenance before public presentation. The four activity signals are a separately closed set of approved category-level constants, not factual activity records.

### Exact approved partner taxonomy

The Phase R Partner Field may publish exactly these organization/relationship pairs under the current approval:

| Relationship | Approved organization | Local public identity asset |
| --- | --- | --- |
| Founding Partner | Taavura–Livnat Group | `/media/partners/taavura-livnat-group.jpg` |
| Founding Partner | Talcar | `/media/partners/talcar.png` |
| Strategic Partner | VDL Group | `/media/partners/vdl-group.png` |
| Strategic Partner | Hyundai Motor Group | `/media/partners/hyundai-motor-group-white.png` |
| Strategic Partner | Bazan Group | `/media/partners/bazan-group.png` |

Each is modeled as a classification **B**, `publicApproved: true`, non-placeholder network-organization record with `kind: "industrial"` and exactly one relationship tuple: `founding-partner` or `strategic-partner`. The Phase R subtype requires an approved local logo asset and intentionally disallows a partner summary. The relationship may not be upgraded, flattened, swapped, or inferred.

The Partner Field may show the exact relationship label, organization name, and approved identity asset. It may not add partner descriptions, statistics, private metrics, invented clickthrough links, or a generic “trusted by” claim. Identity files are local production assets; they are not hotlinked. The supplied composite remains reference-only and must not be shipped as the public partner experience. Marks must not be recolored, traced, AI-recreated, distorted, or combined into an invented identity. A typographic organization name is the safe fallback when a supplied mark is unsuitable for a composition.

### Approved SPARK proposition

The concise public proposition is governed as a classification **B**, approved, non-placeholder program record:

> SPARK connects suitable startups with partners to design and execute real-world POCs.

It supports a startup-facing invitation but guarantees none of the following: acceptance, access to any particular organization, a POC, procurement, investment, deployment, adoption, scaling, commercial success, a contract, or any other outcome. The working public contact boundary is `info@quantum-hub.com`; Phase R does not authorize additional personal/private contact data or a fake form endpoint.

### Homepage-safe content

- Homepage acts are governed records and only publication-filtered A/B + approved values may render.
- Safe activity language is category-level only: FIELD TESTING, PROGRAMS, PARTNER ENGAGEMENT, and GLOBAL ECOSYSTEM.
- No internal board count, pipeline number, conversion rate, private partner metric, confidential project detail, unapproved POC/project, defense-specific material, contract language, unsupported outcome, or internal-deck image may enter public output.
- Raw source-pack files, Drive IDs, approval/provenance documents, and `sourceReferenceInternal` remain authoring-only.
- `src/content/experience.ts` is the browser-safe runtime boundary and contains only public phase literals/types. Governed partner/program records stay in server/build-time content modules and reach the browser only as filtered semantic HTML.
- Public-output scans must include linked HTML, JavaScript, metadata, and local assets, not only the visible Astro template.

### Maradin and Proof boundary

Maradin remains the current eligible deeper Proof record. It does not define the homepage. Public homepage copy, metadata, and the principal evidence action must not expose the record name, slug, project technology, scenario/team counts, or other record-specific facts. The evidence action targets `/proof/`; a visitor reaches the named record only by intentionally entering Proof.

Phase R preserves the Phase 3 Proof eligibility and factual scope. Only these presentation cleanups are authorized:

1. remove redundant Evidence copy;
2. remove public prose explaining that private/internal KPI material is withheld;
3. reduce opening metadata/tag clutter without deleting governed fields;
4. repair header/content underlap;
5. replace the direct homepage record handoff with `/proof/`.

This boundary does not authorize a second public record, a changed Maradin fact, an invented decision or outcome, or altered publication eligibility.

## Historical Phase 2–3 publication record

The sections below preserve prior approval applications and test history. Their Maradin-led homepage application is superseded for `/`; their A–D eligibility matrix, recursive provenance stripping, placeholder denial, and nested Proof governance remain fully operative.

## Phase 3 nested Proof boundary

Public Proof routing uses only records returned by the publication layer. The same eligible collection owns `/proof`, generated `/proof/[slug]` paths, sitemap entries, metadata, and related-record links. A denied parent therefore cannot leak through an alternate output surface.

Proof phases and evidence items are filtered independently with the same A/B + explicit approval rule as their parent. An eligible parent does not confer eligibility on a child. Ineligible nested items are removed, eligible nested items are recursively stripped of `sourceReferenceInternal`, and empty nested collections are omitted from the public value. Development fixtures remain D, unapproved, and route-ineligible.

Production-output verification scans generated HTML, JavaScript, metadata, and the sitemap for denied fixture IDs, denied test sentinels, and internal provenance keys. The current public Proof set contains only the approved Maradin record.

## Phase 2 approved-public application

The Maradin Dynamic Ground Projection record is a concrete **B + approved** case. Explicit user approval is dated **2026-08-15**. It is parsed and filtered before homepage presentation; changing `publicApproved` to false, changing classification to C/D, or marking it as a development placeholder must deny it.

Only approved public fields are mapped into Q-HUB authoring code. The supplied source JSON and approval JSON are not copied into `public/`, emitted as client payloads, or serialized wholesale. Public-output tests scan for internal provenance as well as disallowed source identifiers. Protected material remains excluded: contracts and commercial terms, internal final-report material, proprietary KPI tables, raw measurement values, confidential technical specifications, and inferred sales, production, deployment, procurement, or commercialization outcomes. The approved next step is not represented as commercial success.

Public output is deny-by-default. Classification and explicit approval are separate controls, and both are evaluated in code.

## Eligibility matrix

| Classification | Meaning | `publicApproved` | Public output |
| --- | --- | --- | --- |
| A | Explicitly publishable | `true` | Allowed |
| A | Explicitly publishable | `false` | Denied |
| B | Public candidate | `true` | Allowed |
| B | Public candidate | `false` | Denied |
| C | Internal / confidential | either | Denied |
| D | Unverified / ambiguous | either | Denied |

A development placeholder is denied under every combination. Placeholder schemas additionally require classification D and `publicApproved: false`.

## Required boundary

Presentation code must not decide eligibility itself. It must consume records returned by `toPublicRecord` or `filterPublicRecords` from `src/content/publication.ts`.

The boundary performs two operations:

1. allow only A or B records with `publicApproved: true` that are not development placeholders;
2. recursively remove every `sourceReferenceInternal` key before returning a value.

Filtering and stripping are both required. A record must never be made public by hiding a field in CSS, omitting it from one component, or relying on author discipline.

## Internal references

`sourceReferenceInternal` may identify an approved internal source during authoring and review. It must never enter public serialized data, HTML, client props, metadata, logs, or feeds. Recursive stripping covers nested structures as defense in depth.

## Placeholder release control

Temporary content and media must set `developmentPlaceholder: true`. Use `findDevelopmentPlaceholders` for a report and `assertNoDevelopmentPlaceholders` for a release-blocking check. A production candidate must contain zero findings in all data passed toward public output.

## Verification

Phase 2 adds coverage for the eligible Maradin B record, a rejected unapproved variant, public-field serialization, and generated-output scanning. Final pass counts and exact command output belong in `PHASE2_ACCEPTANCE.md` only after the root verification run completes.

`tests/publication.test.ts` proves the full A–D matrix, placeholder detection and denial, nested internal-reference stripping, development schema validity, and rejection of unsafe placeholder metadata. These tests are a hard release gate; they may not be bypassed when content is incomplete.
