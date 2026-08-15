# Design System

## Direction

The visual tension is **precision instrument × industrial documentary**. Premium comes from composition, material, pacing, restraint, and exact typography—not decoration. The page becomes progressively more physical as uncertainty collapses:

- **SIGNAL / FIND:** near-black, spatial, distributed, uncertain; provisional magenta carries signal and selection.
- **APERTURE / NEED:** the abstract layer opens onto a distinct field surface; density narrows and constraint appears.
- **TEST:** field heat/orange, texture, contact, boundary, time, and observation.
- **PROVE:** provisional teal, order, quiet, documentation, and stable evidence structure.

All brand-dependent values are explicitly PROVISIONAL until approved Quantum identity assets arrive.

## Phase 1 repair authority

The human Phase 1 decision is **REPAIR**, not redirect. The earlier dominant thick-magenta contour/ribbon grammar is superseded. It must not be restored, enlarged, or used as a fallback. The repaired abstraction is a restrained **signal trajectory system**: fine authored paths, sparse points, controlled intersections, differentiated depth planes, one privileged signal, and materially greater negative space.

This repair preserves the accepted semantic journey, static-first architecture, publication rules, accessibility contract, and performance intent. It does not authorize Phase 2 media integration or imply that visual acceptance has been granted.

## Token contract

The global stylesheet is the single source for tokens. Components use semantic names rather than raw color, spacing, duration, or z-index values.

| Group | Required semantic tokens |
| --- | --- |
| Color | --color-void, --color-surface, --color-surface-raised, --color-ink, --color-ink-muted, --color-line, --color-signal, --color-field-heat, --color-evidence, --color-focus |
| Type | --font-display, --font-body, --font-mono, --step-display, --step-h1, --step-h2, --step-body, --step-label |
| Space | --space-1 through --space-8, --page-gutter, --content-max |
| Form | --radius-small, --radius-panel, --line-hair, --touch-target |
| Depth | --z-base, --z-scene, --z-content, --z-nav, --z-modal |
| Motion | --duration-utility, --duration-state, --duration-narrative, --ease-direct, --ease-select, --ease-resolve |

Use fluid clamp-based type and spacing. Temporary typography uses licensed system stacks and must be replaceable by changing tokens only. Body copy stays readable; technical labels are reserved for real metadata rather than decorative microcopy.

## Composition

- Keep the primary narrative in short, strongly broken statements with deliberate negative space.
- Use one continuous field composition with changing material states, not repeated full-viewport cards.
- A shared grid aligns navigation, narrative copy, field annotations, and the Proof structure while allowing controlled asymmetry.
- Reserve media and canvas dimensions before load.
- Panels are opaque/material surfaces when needed; avoid glassmorphism and indiscriminate blur.
- State colors carry meaning. Do not use magenta, orange, or teal as arbitrary decoration.
- The Proof state exposes FIELD CONDITION, TECHNOLOGY, ENVIRONMENT, TEST, EVIDENCE, and DECISION / NEXT STEP without invented values.

## Signal trajectory grammar

The enhanced desktop field uses seven analytic shader trajectories: four low-opacity far-plane paths, two mid-plane paths, and one visually privileged path. Authored points are sparse and deliberate; a generated node grid, filled topology, value-noise contours, thick ribbons, and undifferentiated magenta masses are prohibited. Shader strokes remain hairline-scale, with the privileged trajectory allowed only modest additional weight.

The DOM fallback is an authored SVG trajectory map grouped by semantic role and depth: far and near distribution, three constraint channels, candidates, selected trajectory, and sparse points. It is a designed equivalent, not a screenshot of the WebGL layer. CSS state selectors control those groups so fallback and enhanced modes communicate the same transformation.

Primary display typography owns a protected keepout region. The realtime engine derives that region from the active `.display` bounds with 32px horizontal and 24px vertical padding. Non-essential signal ink is suppressed inside the keepout; geometry must not cross a headline merely to create activity. Static SVG composition and field masks follow the same protected-area intent.

### State composition rules

| State | Required visual grammar |
| --- | --- |
| SIGNAL | Up to seven fine desktop trajectories occupy different depth planes with broad areas of near-black negative space. One path may carry greater emphasis, but the headline remains sovereign. |
| APERTURE | A stable asymmetrical split exposes a warm, planar field surface even without pointer motion. Signal paths retreat, shear, break at the aperture rim, and are carved from its core; abstract magenta and physical field heat remain visibly different materials. |
| NEED | Distribution layers disappear. Exactly three authored channels remain between the pressure rails; their vertical spread contracts as trajectory freedom falls. Constraint is communicated by geometry, not only by copy or orange color. |
| FIND | Three channels become candidates and converge toward one selected trajectory and reticle. Candidate opacity falls as selection focus rises. No filled network mass or purposeless node cloud is permitted. |
| TEST | The field surface, enclosure, boundary, and observation structure dominate. Distribution, channels, candidates, and general points are removed. At most one faint field-heat residual trajectory preserves continuity from FIND. No meaningful magenta remains. |
| PROVE | Signal, aperture, constraint, and field layers settle to zero. Off-white, teal, evidence grid, headline, and Proof Record become the complete composition. No magenta noise survives. |

The procedural field is a development surface, not documentary evidence. Its equal grid is subordinate to large perspective planes, surface shading, bounded contact geometry, and the explicit development-media notice.

## Responsive authorship

- Desktop may use pointer depth, differential parallax, and wider negative space.
- Tablet reduces scene density and reflows the evidence structure without clipping.
- Mobile uses vertical/scroll-native reveal, concise line lengths, and lighter graphics; it does not reproduce desktop pointer behavior.
- Mobile shows no more than four visible signal trajectories at once. It removes the far-plane group and secondary candidate geometry before reducing typography or touch targets.
- Interactive targets have a 44px minimum intent and never depend on hover.
- Primary copy, navigation, state labels, and exits remain visible at 390×844 through 1920×1080.

## Accessibility

- Ink/surface pairs and interactive states must meet WCAG AA; provisional accents are not assumed safe for body text without measurement.
- Visible focus uses --color-focus plus a non-color shape change.
- Respect semantic headings and landmarks. Decorative canvas/media is hidden from assistive technology; meaningful media uses contextual alt text.
- Forced-colors mode restores native system colors, borders, and focus.
- Reduced-motion layouts retain hierarchy and material transformation through resolved states.

### Readable microcopy floor

- Technical text intended to be read uses at least `0.7rem` (11.2px at the default root size) with line-height `1.4` or greater. At compact mobile widths, the phase rail shows `0.7rem` numbered controls while preserving full phase names for assistive technology; unreadable label reductions such as `0.44rem` are prohibited.
- Normal-size text meets at least 4.5:1 contrast in its rendered context. Text over a variable field or shader receives a sufficiently opaque local backing rather than relying on a favorable frame.
- Development-media notices, stage status, phase navigation, metadata labels, and placeholder disclosures are readable content. They may not be styled as faint decorative marks.
- Purely decorative marks contain no text and remain hidden from assistive technology.

## Media and placeholders

- Use only approved Quantum media in production. Never use stock factory imagery, old-site media, fake POC photography, fabricated logos, or a redrawn Quantum mark.
- Development visuals must be procedural, visibly abstract, labelled as development material where exposed, and machine-detectable.
- Approved photography/video should show real operating context, physical constraint, observation, and evidence without cosmetic futuristic overlays.
- Crops preserve the test subject and human/operational context; never crop into an unsupported claim.

## Rejected patterns

No four-industry icon grid, card graveyard, fake counter, logo marquee as credibility, generic dashboard, giant decorative gradient, constant particle wallpaper, dominant contour/ribbon wallpaper, value-noise topology, cyberpunk treatment, identical card system, or animation applied to every paragraph.
