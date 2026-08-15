# Motion System

Motion is evidence of system state. It expresses **search → selection → convergence → entry → friction → resolution** and must reinforce FIND → TEST → PROVE.

## Physics by state

| State | Behavior | Visual consequence |
| --- | --- | --- |
| SIGNAL | Sparse, controlled stochastic drift with depth separation | Distributed possibility; no decorative particle wallpaper |
| APERTURE | Pointer or scroll produces local displacement, layer retreat, differential parallax, and material reveal | The signal becomes a materially distinct field |
| NEED | Degrees of freedom reduce; paths compress toward a constraint | Possibility visibly narrows |
| FIND | Relationships reorganize and one candidate gains stable emphasis | Search yields selection rather than random nodes |
| TEST | Selected motion crosses into texture and meets resistance, boundary, or damping | Abstraction encounters physical reality |
| PROVE | Velocity and noise decay; geometry aligns; evidence content becomes dominant | Uncertainty resolves into a stable record |

## Token ranges

- **Utility:** 120–220ms, direct easing; navigation, focus, disclosure, and controls.
- **State:** 450–900ms, selection easing; local semantic changes.
- **Narrative:** 900–1600ms or bounded scroll progress; material transitions only.
- **Search easing:** near-linear with limited deterministic variation.
- **Selection easing:** fast recognition, controlled deceleration.
- **Contact easing:** visible resistance/overshoot no greater than one restrained correction.
- **Resolution easing:** critically damped; no perpetual float.

Durations and easing curves live in global motion tokens. Randomness uses a deterministic seed in tests. Motion never communicates a measurement or result that does not exist.

## Input translations

### Desktop pointer

The Field Aperture is a progressive enhancement. Pointer position influences several coupled properties—depth response, signal displacement/retreat, parallax differential, and field material—not merely circular opacity. The effect is bounded to the scene, leaves copy/navigation operable, and has a stable keyboard/non-pointer composition.

### Mobile/touch

No mouse emulation. Natural vertical scroll advances authored reveal progress; density and realtime complexity are reduced. Tap targets remain conventional and no essential content depends on gesture precision.

### Reduced motion

Use deliberately resolved compositions, discrete state changes, short low-distance crossfades, and optional manual controls. Do not globally zero every duration, remove states, or hide content. Continuous drift, pointer pursuit, parallax, and inertial overshoot are disabled.

### No WebGL

DOM/CSS layers reproduce the material sequence with gradients, lines, masks, texture, and state classes. Navigation, copy, phase reachability, and abstraction → field → evidence meaning are unchanged.

## Scroll and lifecycle

- Preserve native vertical scroll; never globally hijack it.
- Pinned movement, if used, is scene-bounded, has a clear exit, and is unnecessary to access content.
- Dynamically import realtime code after semantic content is ready.
- Start only while its scene is active; pause with IntersectionObserver, document visibility, reduced-motion changes, and quality downgrade.
- Render on demand when idle. Cap device pixel ratio by quality tier and recompute safely on resize/orientation.
- Destroy observers, listeners, and graphics resources when the scene unmounts.
- Enhancement exceptions fall back silently to the designed DOM state, with no blank hero or blocked controls.

## Accessibility and testing

- Focus, keyboard navigation, and control response are immediate; custom pointer states never replace native affordances.
- No flashing, autoplay audio, forced delay, fake loader, or mandatory “enter” gate.
- Each state has meaningful DOM content and a stable data-experience-phase contract.
- Playwright verifies all six reachable states in desktop, mobile, reduced-motion, and forced no-WebGL modes; it also checks console errors, keyboard flow, overflow, and pinned-scene exit.
- Visual QA captures representative transition boundaries, not only settled screenshots.

Repeated fade-and-rise entrances, identical scroll reveals, motion on every sentence, gratuitous horizontal scroll, and endless ambient animation are prohibited.
