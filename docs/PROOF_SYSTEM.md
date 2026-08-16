# Proof system

## Evidence Index thesis

`/proof` is an evidence archive, not a portfolio or a success-story grid. It presents only public-eligible Field Records and treats documented field evidence as information that can support a decision, never as proof of deployment, adoption, or commercial success.

The public index is intentionally complete with one approved record. Its unit is a ruled, full-width record strip with aligned metadata and documentary media rather than a rounded card. Pointer inspection and keyboard focus may increase emphasis, but the record and its action remain complete without hover or JavaScript. Mobile uses ordinary flow and direct, visible media.

No filter interface is rendered while fewer than three public-eligible records exist. Once at least three eligible records make filtering useful, a later phase may activate factual dimensions such as domain, environment, program, record structure, and evidence or next-step availability. “Success” is never a filter.

## Field Record anatomy

Eligible records generate static `/proof/[slug]` routes from the typed public collection. The renderer is shared; it does not hard-code a Maradin-only page. A record opens with its code, program/context, title, public subject names, concise summary, and primary approved media.

Supported chapters follow this semantic order when their fields exist:

1. Field Condition
2. Technology
3. Environment
4. Test
5. Evidence
6. Decision and/or Next Step

An unsupported chapter is omitted completely. The renderer never substitutes `N/A`, `TBD`, an empty wrapper, or an invented fact. A record with evidence and no decision remains structurally valid; Maradin therefore ends with its approved Next Step and has no Decision chapter.

## Evidence and outcome

Evidence describes information produced by a test. Decision or Next Step describes what happened afterward. The public interface does not equate tested with successful, evidence with deployment, a next step with commercial adoption, or program participation with partnership. Teal indicates resolved, documented evidence—not a guaranteed positive outcome.

## Variable records and publication

The base Proof record retains optional single-test fields and adds only the Phase 3 structural capabilities: `recordCode`, `recordStructure`, `phases`, `evidenceItems`, and `environmentTags`. `recordStructure` distinguishes `single-test` and `multi-phase` records. A phase can carry its own label, summary, status, date, and media; an evidence item can carry a concise summary or value and optional media.

Every phase and evidence item independently carries classification, approval, and optional internal provenance. Publication is deny-by-default at both parent and nested levels. Only classification A or B items with explicit public approval and no development-placeholder status survive. Internal source references are stripped recursively before presentation. A public parent never makes an unapproved nested item public.

Four classification-D, unapproved development fixtures exercise single-test, multi-phase, no-outcome, and partial shapes. They use unmistakable development IDs, do not contain real organizations or claims, and can never enter the index, static route set, sitemap, or built public output.

## Media roles

Proof media reuses only publication-approved repository derivatives. Roles are explicit: hero/context establishes the field, test shows physical evaluation, evidence documents observation, and support adds context without becoming a gallery. Native images and video preserve intrinsic dimensions; non-critical media is lazy; video remains muted and optional. DOM text carries all meaning, and reduced-motion comprehension never depends on moving film.

## Route generation

The index and `getStaticPaths` consume only the filtered public Proof collection. Each eligible slug produces one route and may enter the sitemap. Denied records, denied nested items, internal provenance, and development fixtures produce no routes, metadata, related links, client payloads, or sitemap entries. The current public set contains only `/proof/maradin-dynamic-ground-projection`.
