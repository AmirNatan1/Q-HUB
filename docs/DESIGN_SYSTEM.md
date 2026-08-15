# Design System

## Direction

The visual tension is **precision instrument × industrial documentary**. Premium comes from composition, material, pacing, restraint, and exact typography—not decoration. The page becomes progressively more physical as uncertainty collapses:

- **SIGNAL / FIND:** near-black, spatial, distributed, uncertain; provisional magenta carries signal and selection.
- **APERTURE / NEED:** the abstract layer opens onto a distinct field surface; density narrows and constraint appears.
- **TEST:** field heat/orange, texture, contact, boundary, time, and observation.
- **PROVE:** provisional teal, order, quiet, documentation, and stable evidence structure.

All brand-dependent values are explicitly PROVISIONAL until approved Quantum identity assets arrive.

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

## Responsive authorship

- Desktop may use pointer depth, differential parallax, and wider negative space.
- Tablet reduces scene density and reflows the evidence structure without clipping.
- Mobile uses vertical/scroll-native reveal, concise line lengths, and lighter graphics; it does not reproduce desktop pointer behavior.
- Interactive targets have a 44px minimum intent and never depend on hover.
- Primary copy, navigation, state labels, and exits remain visible at 390×844 through 1920×1080.

## Accessibility

- Ink/surface pairs and interactive states must meet WCAG AA; provisional accents are not assumed safe for body text without measurement.
- Visible focus uses --color-focus plus a non-color shape change.
- Respect semantic headings and landmarks. Decorative canvas/media is hidden from assistive technology; meaningful media uses contextual alt text.
- Forced-colors mode restores native system colors, borders, and focus.
- Reduced-motion layouts retain hierarchy and material transformation through resolved states.

## Media and placeholders

- Use only approved Quantum media in production. Never use stock factory imagery, old-site media, fake POC photography, fabricated logos, or a redrawn Quantum mark.
- Development visuals must be procedural, visibly abstract, labelled as development material where exposed, and machine-detectable.
- Approved photography/video should show real operating context, physical constraint, observation, and evidence without cosmetic futuristic overlays.
- Crops preserve the test subject and human/operational context; never crop into an unsupported claim.

## Rejected patterns

No four-industry icon grid, card graveyard, fake counter, logo marquee as credibility, generic dashboard, giant decorative gradient, constant particle wallpaper, cyberpunk treatment, identical card system, or animation applied to every paragraph.
