# Publication policy

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
