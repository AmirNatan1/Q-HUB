# Publication policy

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

`tests/publication.test.ts` proves the full A–D matrix, placeholder detection and denial, nested internal-reference stripping, development schema validity, and rejection of unsafe placeholder metadata. These tests are a hard release gate; they may not be bypassed when content is incomplete.
