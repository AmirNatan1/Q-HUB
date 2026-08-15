# Motion System

## Phase 2 documentary-media contract

Real media enters the accepted grammar without becoming a second animation system. SIGNAL remains abstract. During APERTURE, the procedural field scaffold recedes while the approved Maradin film gains authority inside the existing field-side mask. NEED and FIND retain the accepted constraint and convergence physics. TEST places its approved film inside the existing enclosure. PROVE uses still images and structured evidence, with less motion than TEST.

Documentary video uses native `<video>` only. Sources are held in `data-src` with `preload="none"`, prepared only in or near APERTURE/TEST, played muted and inline only while their phase is active, and paused outside it. No video-player dependency, audible track, visible decorative controls, or semantic meaning exists only in footage.

Reduced motion resolves APERTURE and TEST to approved posters/stills: the motion source is not assigned, autoplay and loop remain disabled, and semantic content remains present. Approved media is independent of WebGL, so the DOM/CSS/SVG path retains the real-field handoff when WebGL is unavailable. Mobile uses authored focal positions rather than pointer emulation. APERTURE media remains within the accepted boundary, TEST media remains within its physical enclosure, and PROVE settles to stills; none is promoted to a generic full-page background.

Motion is evidence of system state. It expresses **search → selection → convergence → entry → friction → resolution** and must reinforce FIND → TEST → PROVE.

## Phase 1 repair authority

The human Phase 1 **REPAIR** decision supersedes the earlier dominant contour/ribbon behavior. Large value-noise loops, thick magenta bands, and a visually persistent common substrate are no longer part of the motion language. The repaired system moves sparse analytic trajectories and authored SVG equivalents through a measurable loss of freedom. This is a visual-grammar repair only; it does not authorize Phase 2 or constitute final visual, performance, or evidence acceptance.

## Physics by state

| State | Behavior | Visual consequence |
| --- | --- | --- |
| SIGNAL | Seven analytic desktop trajectories use very slow deterministic drift across four far, two mid, and one privileged path | Distributed technical possibility with large negative space; no contour or particle wallpaper |
| APERTURE | Pointer or scroll produces a 98% core carve, radial retreat, tangential rim shear, controlled dropout, and differential depth response | Signal visibly gives way to a materially distinct field; the split is also legible in a static frame |
| NEED | Trajectory freedom falls from `0.58` toward `0.20`; distribution paths are replaced by three authored channels compressed between the rails | Possibility visibly loses degrees of freedom |
| FIND | Freedom falls from `0.48` toward `0.08`; selection focus rises from `0` to `1`, candidates fade, and paths converge toward one selected point | Search yields an inevitable selected signal rather than a random network |
| TEST | Signal strength is `0.035`; general paths disappear and at most one orange residual meets the bounded field structure | Physical surface, enclosure, constraint, and observation consume abstraction |
| PROVE | Signal strength and freedom are `0`; settlement rises from `0.35` to `1` and all experiential layers resolve out | Uncertainty releases into a stable evidence record with no magenta residue |

## Trajectory state contract

The controller publishes independent state variables; they must not be collapsed back into a single generic progress value.

| Variable | Meaning |
| --- | --- |
| `--signal-strength` | Total surviving abstract signal; controls whether signal ink remains materially present. |
| `--trajectory-freedom` | Path count, lane spread, and curvature amplitude. Lower values remove paths and straighten/compress survivors. |
| `--selection-focus` | Candidate convergence and selected-path emphasis. It must not be represented only by a glow. |
| `--field-exposure` | Visibility of the distinct procedural field surface. |
| `--material` | Degree to which physical-field behavior consumes abstraction. |
| `--settlement` | Final loss of signal and transition into calm evidence geometry. |

The implemented state ranges are:

| State | Signal strength | Freedom | Field exposure | Selection | Material | Settlement |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| SIGNAL | `1.00` | `0.95` | `0.04 → 0.08` | `0` | `0.04` | `0` |
| APERTURE | `0.72 → 0.32` | `0.88 → 0.60` | `0.28 → 0.96` | `0` | follows field exposure | `0` |
| NEED | `0.34 → 0.16` | `0.58 → 0.20` | `0.62` | `0.05 → 0.12` | `0.54` | `0` |
| FIND | `0.34 → 0.14` | `0.48 → 0.08` | `0.08` | smooth `0 → 1` | `0.08` | `0` |
| TEST | `0.035` | `0` | `1` | `1` | `1` | `0` |
| PROVE | `0` | `0` | `0` | `0` | `0` | `0.35 → 1` |

The WebGL field uses seven explicit analytic trajectories with hairline-scale antialiasing, sparse fixed points, premultiplied alpha, and a final fragment alpha cap of `0.46`. It does not use value-noise contour generation. The active display heading supplies a protected keepout rectangle with 32px horizontal and 24px vertical padding; non-essential paths are suppressed inside it.

The SVG fallback groups distribution planes, three channels, candidates, the selected path, and points by semantic role. State CSS changes group opacity and transform so the fallback performs the same loss of freedom without pretending to reproduce realtime motion.

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

The Field Aperture is a progressive enhancement. Pointer position influences several coupled properties—depth response, signal displacement/retreat, tangential shear, rim dropout, parallax differential, and field material—not merely circular opacity. Its carve removes signal from the core while the rim refracts and breaks trajectories. The effect is bounded to the scene, leaves copy/navigation operable, and starts from a static two-world composition that does not require pointer motion to be understood.

### Mobile/touch

No mouse emulation. Natural vertical scroll advances authored reveal progress; density and realtime complexity are reduced. Mobile renders no more than four visible trajectories, removes far-plane and secondary-candidate activity first, and retains the fixed APERTURE material split. Tap targets remain conventional and no essential content depends on gesture precision.

### Reduced motion

Use deliberately resolved compositions, discrete state changes, short low-distance crossfades, and optional manual controls. APERTURE resolves to a fixed diagonal signal/field split; NEED shows three compressed channels; FIND shows the selected trajectory; TEST retains only its bounded material structure; PROVE is fully settled. Do not globally zero every duration, remove states, or hide content. Continuous drift, pointer pursuit, parallax, and inertial overshoot are disabled.

### No WebGL

The authored SVG trajectory groups plus DOM/CSS field layers reproduce the material sequence with state-specific opacity, compression, convergence, masks, surface planes, and settlement. APERTURE uses the same static two-world split as reduced motion. Navigation, copy, phase reachability, and abstraction → field → evidence meaning are unchanged.

## Scroll and lifecycle

- Preserve native vertical scroll; never globally hijack it.
- Pinned movement, if used, is scene-bounded, has a clear exit, and is unnecessary to access content.
- Dynamically import realtime code after semantic content is ready.
- Start only while its scene is active; pause with IntersectionObserver, document visibility, reduced-motion changes, and quality downgrade.
- Render on demand when idle. Cap device pixel ratio by quality tier and recompute safely on resize/orientation.
- Destroy observers, listeners, and graphics resources when the scene unmounts.
- Enhancement exceptions fall back silently to the designed DOM state, with no blank hero or blocked controls.
- Documentary sources are assigned only as their phase approaches and are paused when inactive; posters reserve layout and own the reduced-motion state.
- Media lifecycle remains part of the small existing controller. It introduces no production dependency and never gates navigation, copy, or phase reachability.
- Readable technical labels do not animate below the design-system floor of `0.7rem`; the compact mobile rail keeps `0.7rem` numbered controls and exposes full phase names to assistive technology. Motion never substitutes low opacity for hierarchy.

## Accessibility and testing

- Focus, keyboard navigation, and control response are immediate; custom pointer states never replace native affordances.
- No flashing, autoplay audio, forced delay, fake loader, or mandatory “enter” gate.
- Each state has meaningful DOM content and a stable data-experience-phase contract.
- Playwright verifies all six reachable states in desktop, mobile, reduced-motion, and forced no-WebGL modes; it also checks console errors, keyboard flow, overflow, and pinned-scene exit.
- Visual QA captures representative transition boundaries, not only settled screenshots.

Repeated fade-and-rise entrances, identical scroll reveals, motion on every sentence, gratuitous horizontal scroll, and endless ambient animation are prohibited.
