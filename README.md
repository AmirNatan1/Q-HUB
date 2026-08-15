# Q-HUB

Greenfield Phase 1 implementation of Quantum Hub’s experiential digital system.

The homepage is a static-first Astro journey through SIGNAL → APERTURE → NEED → FIND → TEST → PROVE. A small custom WebGL field is loaded as a progressive enhancement; semantic HTML and an authored DOM/CSS experience remain complete on mobile, with reduced motion, and without WebGL.

## Local verification

```sh
npm install
npm run check
npm run test:e2e
npm run bundle:check
npm run lighthouse
```

The production host is intentionally not hardcoded. Set `SITE_URL` to a verified deployment origin when building for release.

Project rules and the Phase 1 acceptance contract live in `AGENTS.md` and `docs/PHASE1_ACCEPTANCE.md`. Do not use unapproved corporate content or media.
