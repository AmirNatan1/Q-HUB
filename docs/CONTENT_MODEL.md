# Content model

## Phase 3 variable Proof records

The Phase 2 Proof schema is extended, not replaced. Optional `recordCode`, `recordStructure`, `phases`, `evidenceItems`, and `environmentTags` support a reusable Evidence Index and Field Record renderer while preserving the approved Maradin record. `recordStructure` distinguishes `single-test` from `multi-phase`; missing date, location, decision, next step, metrics, media, or chapters remain genuinely absent.

Each nested phase and evidence item is substantive governed content. It independently carries classification, explicit approval, and optional internal provenance, and is filtered before the public parent is returned. Parent eligibility never publishes an ineligible child. Four unmistakable D/unapproved development fixtures validate single-test, multi-phase, no-outcome, and partial shapes without creating routes or public output.

Index dimensions are data capabilities, not current controls. A visible factual filter interface may be considered only once at least three public-eligible records exist; the current one-record index exposes no dead filtering UI.

## Phase 2 approved Proof record

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

`src/content/development.ts` contains unmistakable non-factual records for all six families. They use neutral labels such as “Development Proof Record” and “Approved content pending.” They do not contain invented organizations, people, dates, outcomes, measurements, quotes, or metrics.

Development records must always be:

- `classification: "D"`;
- `publicApproved: false`;
- `developmentPlaceholder: true`.

The schemas reject a placeholder marked with public-safe metadata. The publication layer excludes placeholders regardless, and `assertNoDevelopmentPlaceholders` is the pre-release failure mechanism.

Phase 2 resolves the homepage selection, field-test structure, Proof record, documentary-media notice, and identity placeholders only. The six deliberately non-public development-record families and later-phase supporting route shells remain machine-identifiable. Release tests distinguish those intentional future records from the now production-eligible homepage material.

## Authoring flow

1. Add only user-approved or publication-approved source material.
2. Preserve missing fields as missing; never infer a corporate fact.
3. Assign classification and approval explicitly.
4. Parse with the correct Zod schema.
5. Pass parsed records through the publication functions.
6. Pass only the returned public-safe value to presentation code.

No source may be filled from a prohibited former Quantum website or repository.
