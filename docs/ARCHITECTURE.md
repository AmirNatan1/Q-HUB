# Architecture

## Phase 3 Proof system

Phase 3 promotes `/proof` from a route shell to a static Evidence Index and generates `/proof/[slug]` pages only from the deny-by-default public Proof collection. The index, static paths, metadata, sitemap entries, and record presentation share the same filtered source. The current eligible set produces exactly one Field Record route: `/proof/maradin-dynamic-ground-projection`.

Proof pages remain semantic Astro HTML and CSS. They add no production dependency, client router, realtime engine, or required browser controller. The index inspection treatment is complete in its default state and responds to native hover/focus styling; mobile and reduced-motion modes use the same ordinary document flow. Native approved media retains intrinsic dimensions and lazy non-critical loading. The accepted homepage runtime is unchanged except for the PROVE link to the Field Record.

The reusable record renderer omits unsupported chapters rather than emitting empty UI. Nested phases and evidence items pass independent publication gates before rendering, and internal provenance is recursively removed. These rules let single-test, multi-phase, no-outcome, and partial records share one route architecture without pretending that evidence is a commercial outcome.

## Phase 2 continuation

Phase 2 preserves the accepted static-first Astro 7 / strict-TypeScript architecture. A schema-validated, publication-filtered Maradin Proof record now owns the factual homepage story. Astro renders that semantic record before enhancement; approved documentary media and the official SVG identity are presentation assets, not new application runtimes.

Native `<video>` elements use posters, `preload="none"`, muted inline playback, and source URLs held in `data-src`. The existing small controller assigns sources only near APERTURE or TEST, pauses inactive footage, and leaves reduced-motion media static. Documentary media is independent of the lazy custom WebGL layer, so no-WebGL mode retains the real-field journey. React, Three.js/R3F, GSAP, video-player frameworks, client routers, CMS runtimes, and external font/CDN dependencies remain absent.

The official brand masters are copied unmodified under `public/brand/`; approved Maradin derivatives are copied unmodified under `public/media/maradin/`. The approved source JSON is not shipped wholesale. Raleway/Comfortaa are wired as intended token families, but local fallbacks remain active because the pack contains no licensed font binaries (`FONT-001`).

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
- The field media adapter separates abstract interface material, approved documentary media, and semantic Proof content while retaining one shared stage. APERTURE and TEST media are lazy native-video layers with static fallbacks; PROVE uses approved stills.

## Route contract

Phase 1 fully authored the homepage. Phase 3 fully authors the Proof routes; other supporting routes remain semantic shells so the information architecture and navigation are testable:

- / — experiential homepage
- /proof — Evidence Index
- /proof/[slug] — public-eligible Field Records
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

Phase 2 remains limited to the accepted homepage grammar and one approved Proof story. Supporting routes remain shells; no broader Proof library, ACT 07/08/09, route redesign, deployment, or production release is authorized at this checkpoint. The Phase 2 candidate stops at its Human Review Package.
