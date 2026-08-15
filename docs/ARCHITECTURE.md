# Architecture

## Decision

Q-HUB is a static-first Astro + strict TypeScript site built to dist and deployed from GitHub to Cloudflare Pages. Astro owns routing, document structure, metadata, and build-time content. Essential content is server-rendered HTML; browser code only enhances it.

Phase 1 deliberately uses native DOM/CSS plus one dynamically imported custom canvas/WebGL module. React, Three.js/R3F, and GSAP are not current dependencies: the six-state grammar does not yet justify their runtime and bundle cost. Reconsider only when a concrete interaction cannot be delivered cleanly with the current stack; record the measured tradeoff here before adding one.

## Layer contract

1. **Content:** typed records for proof, activity, programs, network organizations, people, and company facts.
2. **Eligibility:** one publication function validates classification, approval, placeholder state, and public serialization.
3. **Presentation:** Astro components consume already-eligible public views; visual components never contain corporate facts.
4. **Enhancement:** small TypeScript modules attach behavior to semantic HTML. Enhancement failure leaves a complete, intentional page.

Internal source references remain in authoring records only and are stripped before any public view reaches a page or serialized payload. Development data is tagged and blocked by a pre-release detector.

## Runtime shape

- The homepage contains semantic DOM for SIGNAL, APERTURE, NEED, FIND, TEST, and PROVE in narrative order.
- A stable data-experience-phase value exposes the active state for CSS, assistive equivalence, and tests.
- Hero copy and navigation are usable before JavaScript and never wait for canvas.
- The Field Aperture enhancement is requested after the semantic shell is ready and only when WebGL, motion preference, input capability, and quality tier permit it.
- Canvas is aria-hidden and non-interactive from an accessibility-tree perspective; equivalent state meaning remains in DOM.
- The custom renderer owns a narrow lifecycle: initialize, resize, setPhase, setPointer/scrollProgress, pause, resume, destroy.
- Rendering pauses offscreen and when the document is hidden. Static frames or on-demand rendering replace continuous loops where possible.
- Assets pass through a media adapter that supports a clearly labelled procedural placeholder now and approved responsive image/video sources later.

## Route contract

Phase 1 fully authors only the homepage. Supporting routes are semantic shells so the information architecture and navigation are testable:

- / — experiential homepage
- /proof and /proof/[slug] — future evidence records
- /industry — industrial organizations
- /startups — technology companies
- /programs, /programs/spark, /programs/champ
- /network
- /about
- /contact
- /404.html — accessible not-found page

No legacy redirects or legacy route compatibility are required.

## Mode and fallback matrix

| Mode | Authored behavior |
| --- | --- |
| Desktop pointer | Spatial aperture combines layer parallax, local signal displacement/retreat, and material response; it is not a simple cursor mask. |
| Mobile/touch | Scroll progress reveals field material through a lighter composition without hover or pointer precision. |
| Reduced motion | Resolved compositions and short crossfades preserve all six states and the abstraction-to-evidence transition. |
| WebGL unavailable/failure | DOM/CSS field layers, semantic copy, navigation, and state progression remain complete and intentional. |

Normal vertical page control is preserved. Any pinned narrative must be bounded, keyboard-safe, and release immediately into natural scrolling.

## Quality and delivery

- **Build checks:** Astro production build, Astro/TypeScript check, lint, Vitest, and Playwright must all exit 0.
- **Browser checks:** five required viewports, keyboard navigation, reduced motion, forced WebGL failure, zero uncaught exceptions/application console errors, and accessibility scan with zero critical/serious application violations.
- **Performance:** dynamically load experiential code; keep realtime engines out of the initial critical bundle; reserve scene geometry; avoid eager video; use responsive sources and adaptive DPR; target CLS ≤ 0.05.
- **SEO:** shared metadata generates title, description, canonical, Open Graph/social tags; static robots, sitemap, meaningful links, and indexable copy remain independent of canvas.
- **Deployment:** Cloudflare Pages publishes dist from a verified build. Secrets never enter source. Commit, push, and preview status are reported only from evidence.

Architecture work stops at the Phase 1 candidate and Human Review Package. Approved media integration is Phase 2.
