# Content model

## Phase R homepage model — current contract

Phase R adds a governed Quantum-led homepage layer without replacing the six established record families or the Phase 3 Proof schema. Homepage copy, partner eligibility, publication eligibility, and presentation remain separate concerns.

### Client-safe experience constants

`src/content/experience.ts` is the only homepage experience module intended for direct browser-runtime import. It contains:

```text
presence, access, startup, method, activity, evidence, action
```

and the derived `ExperiencePhase` type. It contains no governed organization/program/Proof objects, source references, approval notes, or asset provenance. Browser code discovers approved rendered content through semantic DOM and stable data attributes instead of importing authoring collections.

### Homepage acts

`homepageActSchema` validates one record for each of the seven phases. Each act carries:

- stable `id`;
- one `phase` from the client-safe seven-value enum;
- two-digit `act` from `01` through `07`;
- editorial `label`;
- one or two non-empty title lines;
- optional short support line;
- optional action with a local path or approved `mailto:` destination;
- `classification`, `publicApproved`, and `developmentPlaceholder`.

`src/content/homepage.ts` parses candidate acts, passes them through `filterPublicRecords`, freezes the resulting public collection, and fails if all seven approved acts do not survive. Presentation consumes `homepageActs`; it does not duplicate corporate facts in Astro templates.

The same module exposes the current public constants `proofIndexHref`, `workWithQuantumHref`, `methodStates`, and `activitySignals`. `activitySignals` is a closed set of category-level labels, not an activity feed or a factual record count.

The copy-density helper records the current design ceilings:

| Measure | Ceiling |
| --- | ---: |
| Primary statement | 10 words |
| Support line | 20 words |
| Public paragraph | 24 words |
| Settled narrative | 35 words |
| Mobile-visible narrative | 28 words |

These are presentation release constraints over public strings, not a mechanism for hiding required semantic content.

### Strategic partner subtype

`strategicPartnerSchema` narrows `networkOrganizationSchema` for the Phase R Partner Field:

- `contentType: "network-organization"`;
- `kind: "industrial"`;
- exactly one relationship in a one-item tuple;
- relationship limited to `founding-partner` or `strategic-partner`;
- required approved `logo` media record;
- `summary` prohibited;
- the standard classification, approval, placeholder, and optional internal provenance fields.

The approved public records are:

| Public collection | Members |
| --- | --- |
| `foundingPartners` | Taavura–Livnat Group; Talcar |
| `strategicPartners` | VDL Group; Hyundai Motor Group; Bazan Group |

All five candidates are classification B, explicitly approved, and non-placeholder. `publicPartnerOrganizations` contains only the filtered values. Relationship-specific arrays derive from the exact tuple and must not be independently hand-authored.

### SPARK program proposition

The concise startup proposition is a governed `programRecordSchema` value with `id/slug: "spark"`, family `SPARK`, audience `suitable startups`, classification B, explicit approval, and no development placeholder. `sparkProgram` is exported only after publication filtering. Homepage support copy derives from its public `summary`; the presentation layer does not create guarantee language around it.

### Publication and serialization flow

1. Map only human-approved public-safe source values into typed authoring candidates.
2. Preserve internal provenance only in authoring fields.
3. Parse with the applicable Zod schema.
4. Apply the shared A/B + approved + non-placeholder publication gate.
5. Recursively strip `sourceReferenceInternal` from the returned public value.
6. Render filtered values as semantic HTML.
7. Let browser runtime operate on client-safe phase constants and rendered data attributes only.

Raw source packs and approval/provenance files are not client payloads. Hiding an internal field with CSS, omitting it from one component, or importing an unfiltered object into a browser entry is not publication control.

### Proof continuity

The Phase 3 variable Proof model remains intact and retains its one currently eligible record. Phase R changes only the homepage handoff to `/proof/` and permits narrow presentation cleanup. It does not add a record shape, change Maradin’s facts, create a decision/outcome, or change parent/nested eligibility.

## Historical Phase 2–3 content record

The sections below preserve the earlier Proof modeling and approval history. Their Maradin-derived homepage state mapping is superseded for `/`; the schema families, optionality rules, nested filtering, missing-data discipline, development fixtures, and authoring flow remain current.

## Phase 3 variable Proof records

The Phase 2 Proof schema is extended, not replaced. Optional `recordCode`, `recordStructure`, `phases`, `evidenceItems`, and `environmentTags` support a reusable Evidence Index and Field Record renderer while preserving the approved Maradin record. `recordStructure` distinguishes `single-test` from `multi-phase`; missing date, location, decision, next step, metrics, media, or chapters remain genuinely absent.

Each nested phase and evidence item is substantive governed content. It independently carries classification, explicit approval, and optional internal provenance, and is filtered before the public parent is returned. Parent eligibility never publishes an ineligible child. Four unmistakable D/unapproved development fixtures validate single-test, multi-phase, no-outcome, and partial shapes without creating routes or public output.

Index dimensions are data capabilities, not current controls. A visible factual filter interface may be considered only once at least three public-eligible records exist; the current one-record index exposes no dead filtering UI.

## Current approved Proof record

`src/content/proof.ts` now parses the approved Maradin record with `proofRecordSchema`, passes it through the existing deny-by-default publication filter, and exports only the eligible public value. `src/content/homepage.ts` derives NEED, FIND, TEST, PROVE, and the compact Proof fields from that filtered record; corporate facts are not duplicated in Astro presentation templates.

The record is classification **B**, `publicApproved: true`, `developmentPlaceholder: false`, with explicit user approval dated **2026-08-15**. Its public fields are title, summary, startup, operating organization, program, domains, field condition, technology, environment, test, evidence, next step, approved media references, featured state, stable ID, and slug. `decision`, location, and a full date are omitted because the approved material does not supply them at the schema's required precision. No commercial result is inferred.

The approved source JSON is not copied into the repository or public build. Only its approved public-safe values are mapped into the typed record. Internal provenance is absent from the presentation record and remains covered by recursive `sourceReferenceInternal` stripping and output scans.

Quantum content is structured, validated, and publication-controlled before presentation. Corporate facts do not belong directly in visual components.

## Record families

| Family | Schema | Purpose |
| --- | --- | --- |
| Proof | `proofRecordSchema` | Field-evidence records with optional condition, technology, environment, test, evidence, and decision fields. |
| Activity | `activityRecordSchema` | Dated first-party field activity; public-approved activity cannot validate without a date. |
| Programs | `programRecordSchema` | Program identity and approved program descriptions without forcing SPARK and CHAMP into one format. |
| Network organizations | `networkOrganizationSchema` | Organizations with explicit, non-interchangeable relationship labels. |
| People | `personRecordSchema` | Approved people, roles, biographies, affiliations, and portrait references. |
| Global facts | `globalFactRecordSchema` | Individually governed company facts and claims. |

All schemas live in `src/content/schema.ts` and use Zod. Parsing is the ingestion boundary; invalid records must fail validation before build output. `contentRecordSchema` validates a mixed collection.

## Shared governance fields

Every substantive record requires:

- `classification`: `A | B | C | D`;
- `publicApproved`: an explicit boolean;
- `developmentPlaceholder`: an explicit boolean;
- optional `sourceReferenceInternal`, retained only before the public serializer.

`classification` is the canonical implementation of the Proof architecture's publication-classification field. One field is used across every record family so eligibility cannot diverge by content type.

All records also carry a literal `contentType`, a stable `id`, and family-specific fields. Proof fields are intentionally optional after title and summary so a partially publishable evidence record can be represented without inventing missing material.

## Relationships and media

Relationship labels are a closed typed set: founding partner, strategic partner, industry partner, LP, investor, program partner, POC partner, and ecosystem collaborator. They must not be substituted for one another.

Media references accept images, video, audio, models, and documents. Every media item independently declares `developmentPlaceholder`; temporary media IDs must begin with `development-`. This allows release checks to find temporary assets nested inside otherwise valid records.

## Development content

`src/content/development.ts` contains unmistakable non-factual records for all six families. Its four structural Proof fixtures use stable `development-proof-*` identifiers and explicit development-placeholder language. They do not contain invented organizations, people, dates, outcomes, measurements, quotes, or metrics.

Development records must always be:

- `classification: "D"`;
- `publicApproved: false`;
- `developmentPlaceholder: true`.

The schemas reject a placeholder marked with public-safe metadata. The publication layer excludes placeholders regardless, and `assertNoDevelopmentPlaceholders` is the pre-release failure mechanism.

Phase 3 resolves the Evidence Index, the Maradin Field Record, and the homepage handoff while retaining the six deliberately non-public development-record families and unrelated route shells as machine-identifiable placeholders. Release tests distinguish those intentional future records from the production-eligible homepage and Proof material.

## Authoring flow

1. Add only user-approved or publication-approved source material.
2. Preserve missing fields as missing; never infer a corporate fact.
3. Assign classification and approval explicitly.
4. Parse with the correct Zod schema.
5. Pass parsed records through the publication functions.
6. Pass only the returned public-safe value to presentation code.

No source may be filled from a prohibited former Quantum website or repository.
