# Architecture

## Phase R homepage architecture — current contract

The current homepage is a static-first Astro document whose center of gravity is Quantum, not one Proof record. Phase R supersedes the older homepage-specific six-state/method-heavy architecture described later in this file. The Phase 1–3 records remain historical evidence and continue to govern the preserved Proof subsystem and shared safety boundaries.

The implemented public sequence is one continuous seven-act document:

`PRESENCE → ACCESS → STARTUP → METHOD → ACTIVITY → EVIDENCE → ACTION`

Phase R-X keeps this topology and publication boundary intact. In normal mode the controller marks the root `data-scroll-choreography="continuous"`, publishes each active section's numeric `data-progress`, and writes the dominant ACCESS, STARTUP, METHOD, ACTIVITY, and shared-stage geometry directly from native-scroll progress on the existing animation-frame-coalesced update. Semantic state attributes remain stable landmarks; they no longer act as the sole visual switch. Reduced motion deliberately omits the continuous marker and resolves to the existing authored document flow.

`src/pages/index.astro` emits all seven `<section>` elements, their headings, partner names and relationships, activity categories, and actions before enhancement. The shared stage is decorative and `aria-hidden`. JavaScript may publish visual state, but it does not create essential content or navigation.

### Layer and module boundary

1. **Client-safe experience constants:** `src/content/experience.ts` contains only the seven public phase literals and the derived `ExperiencePhase` type. Browser runtime imports this narrow module, not governed partner, program, Proof, or provenance-bearing authoring records.
2. **Governed homepage content:** `src/content/homepage.ts` validates act copy and actions, filters all seven records through the publication layer, exposes the copy-density audit, and composes only approved values from `src/content/strategic.ts`.
3. **Governed strategic content:** `src/content/strategic.ts` validates the five approved organization records and the concise SPARK program proposition, then exports only publication-filtered public values.
4. **Semantic presentation:** `src/pages/index.astro` and `src/components/PartnerField.astro` render the seven-act reading order, exact partner taxonomy and sequence, four activity signals, and stable state hooks before enhancement. `src/components/QuantumStage.astro` supplies decorative SVG/CSS geometry and the optional canvas surface.
5. **Progressive enhancement:** `src/scripts/experience-controller.ts` converts native scroll and optional fine-pointer input into stable state attributes and CSS variables. `src/scripts/field-engine.ts` is a small, dynamically imported custom WebGL enhancement.
6. **Authored modes:** `src/styles/phase-r.css` owns desktop, mobile, no-JavaScript, reduced-motion, no-WebGL, and forced-colors presentation without changing the publication boundary.

Server/build-time presentation code may consume publication-filtered records. A browser entry must consume only client-safe constants, already-rendered DOM, and public state attributes. `sourceReferenceInternal`, raw source-pack data, Drive identifiers, and unfiltered authoring objects must never cross the client boundary.

### Stable experience contract

The seven sections expose these values in exact order:

| Act | Section selector | Authored substate selector |
| --- | --- | --- |
| PRESENCE | `[data-experience-phase="presence"]` | `data-presence-state` is `origin` or `resolved` |
| ACCESS | `[data-experience-phase="access"]` | `data-partner-state` is `opening`, `strategic`, or `founding`; root `data-partner-focus` identifies the sole active screen-scale organization; each identity carries `data-partner-sequence` |
| STARTUP | `[data-experience-phase="startup"]` | `data-crossing-state` is `outside`, `threshold`, or `field` on the section and root while active |
| METHOD | `[data-experience-phase="method"]` | `data-method-state` is `find`, `test`, or `prove` on the section and root while active |
| ACTIVITY | `[data-experience-phase="activity"]` | `data-activity-state` is `field-testing`, `programs`, `partner-engagement`, or `global-ecosystem` on the section and root while active; list items carry the matching `data-activity-signal` |
| EVIDENCE | `[data-experience-phase="evidence"]` | active phase plus `[data-proof-handoff]` |
| ACTION | `[data-experience-phase="action"]` | active phase plus `[data-work-with-quantum]` |

The document root publishes `data-active-phase`, `data-render-mode`, `data-input-mode`, and normal-mode `data-scroll-choreography`. Active sections publish `data-progress`. State/input/mode attributes are the semantic behavior/test contract; numeric progress is a narrow continuous-response diagnostic contract, while individual visual CSS variables remain implementation details. The CTA hooks `[data-startup-action]`, `[data-proof-handoff]`, and `[data-work-with-quantum]` remain stable release selectors.

The current visual contract consumes those states materially: desktop ACCESS exposes exactly one full-viewport, borderless identity territory at a time; STARTUP deforms one large round signal between constraint plates and then into a long rectilinear field probe against directed material planes; METHOD changes non-color geometry from distributed search to a hard contact threshold to aligned observation traces on a spatial registration plane; ACTIVITY exposes exactly one category signal and one unique spatial condition per scroll quarter. Reduced-motion and unenhanced modes expand sequenced content into readable normal flow instead of leaving inactive content hidden.

The old persistent textual phase rail is not part of the current presentation. Conventional site navigation, semantic document order, native scrolling, and the opening scroll cue provide orientation; runtime support for an optional `[data-phase-link]` is nonessential and does not imply a visible rail.

### Enhancement and fallback lifecycle

- Native vertical scroll is the only required progression mechanism; there is no wheel interception, scroll snap, smooth-scroll runtime, custom momentum, scroll hijack, or client router.
- Scroll and pointer work is coalesced through `requestAnimationFrame`. Pointer input is used only for fine-pointer, non-reduced modes and only in realtime phases.
- The WebGL module is imported only after intentional eligible interaction in PRESENCE, STARTUP, or METHOD. ACCESS partner choreography remains DOM/CSS/SVG.
- Default mobile/touch, reduced motion, `?webgl=off`, WebGL failure, and no JavaScript keep the canvas out of the meaning path.
- The custom engine caps DPR at `1.25`, renders continuously only while PRESENCE is active, schedules one-shot frames for other eligible state changes, stops while inactive or when the document is hidden, and releases listeners and GL resources on teardown.
- A calculated heading keepout protects active display copy from nonessential signal geometry.
- Enhancement failure sets a fallback render mode; it must not blank the page, remove an action, or block scroll.

### Authored mode behavior

| Mode | Current architecture |
| --- | --- |
| Desktop/fine pointer | Semantic document plus sparse optional pointer response and lazy custom WebGL in the three eligible acts. |
| Mobile/touch | Natural document flow, five non-overlapping full-width partner identity territories, a Field Crossing lane below readable copy/action, CSS/SVG method states, all four Activity labels in a bordered normal-flow sequence, and no default WebGL. |
| Reduced motion | Static resolved compositions, all five prominent partners and both relationships visible in normal flow, all four Activity signals expanded into readable flow, all seven acts/actions retained, and no decorative realtime loop. Low-contrast partner artwork may yield to the approved typographic organization name rather than weakening identity. |
| Forced colors | Decorative stage, partner images, and instruments are removed; system colors, textual organization identities, relationship labels, all Activity labels, borders, focus, and actions remain. |
| No JavaScript | Complete semantic reading order expands all partner identities and Activity labels in authored DOM/CSS/SVG flow. |
| No WebGL | The same scroll-driven state hooks and semantic DOM remain operative with authored CSS/SVG geometry; the canvas is absent and no essential state waits for it. |

### Proof boundary

`/proof/` and the publication-filtered `/proof/[slug]/` architecture remain Phase 3 systems. The homepage’s principal evidence action targets `/proof/`, never the current record slug. Phase R allows only narrow Proof presentation cleanup: redundant Evidence copy, public internal-withholding explanations, opening tag clutter, header underlap, and the homepage handoff. It does not authorize another record, factual expansion, a new decision/outcome, or changed eligibility.

## Historical Phase 1–3 architecture record

The sections below preserve the architecture decisions and measured context of the earlier phases. Their six-state homepage and Maradin-led homepage descriptions are superseded for the current `/` experience; their static-first, publication, accessibility, fallback, and Proof contracts remain applicable unless the Phase R contract above explicitly changes them.

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
