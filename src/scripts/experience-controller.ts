import type { ExperiencePhase } from "@/content/homepage";

const root = document.documentElement;
const sections = Array.from(
  document.querySelectorAll<HTMLElement>("[data-experience-phase]"),
);
const phaseLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-phase-link]"),
);
const stageStatus = document.querySelector<HTMLElement>("[data-stage-status]");
const canvas = document.querySelector<HTMLCanvasElement>("[data-signal-canvas]");

const phases: ExperiencePhase[] = [
  "signal",
  "aperture",
  "need",
  "find",
  "test",
  "prove",
];

const statusByPhase: Record<ExperiencePhase, string> = {
  signal: "ABSTRACTION / ACTIVE",
  aperture: "FIELD / REVEALING",
  need: "CONSTRAINT / APPLIED",
  find: "SEARCH / CONVERGING",
  test: "FIELD / CONTACT",
  prove: "EVIDENCE / RESOLVED",
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");
const modeParameters = new URLSearchParams(window.location.search);
const webglDisabled = modeParameters.get("webgl") === "off";
const reducedMotionOverride = modeParameters.get("motion") === "reduce";
let controllerFrame = 0;
let activeIndex = -1;
let engineDestroy: (() => void) | undefined;
let engineLoadPromise: Promise<void> | undefined;

root.dataset.js = "true";
root.dataset.inputMode = finePointerQuery.matches ? "pointer" : "touch-scroll";
if (reducedMotionOverride) root.dataset.motionOverride = "qa-query";

function reducedMotionEnabled(): boolean {
  return reducedMotionOverride || reducedMotionQuery.matches;
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * clamp(progress);
}

function smoothstep(start: number, end: number, value: number): number {
  const progress = clamp((value - start) / Math.max(end - start, Number.EPSILON));
  return progress * progress * (3 - 2 * progress);
}

function phaseFromSection(section: HTMLElement): ExperiencePhase {
  const candidate = section.dataset.experiencePhase;
  return phases.includes(candidate as ExperiencePhase)
    ? (candidate as ExperiencePhase)
    : "signal";
}

function setActivePhase(index: number): void {
  if (index === activeIndex || !sections[index]) return;

  activeIndex = index;
  const activeSection = sections[index];
  if (!activeSection) return;
  const phase = phaseFromSection(activeSection);

  root.dataset.activePhase = phase;
  root.style.setProperty("--phase-index", String(index));
  sections.forEach((section, sectionIndex) => {
    section.toggleAttribute("data-active", sectionIndex === index);
  });
  phaseLinks.forEach((link) => {
    if (link.dataset.phaseLink === phase) {
      link.setAttribute("aria-current", "step");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (stageStatus) stageStatus.textContent = statusByPhase[phase];
  window.dispatchEvent(
    new CustomEvent("qhub:phasechange", { detail: { phase, index } }),
  );

  if (
    finePointerQuery.matches &&
    (phase === "aperture" || phase === "find") &&
    !reducedMotionEnabled()
  ) {
    void ensureFieldEngine();
  }
}

function updateStoryState(): void {
  controllerFrame = 0;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const marker = viewportHeight * 0.48;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const bounds = section.getBoundingClientRect();
    const centerDistance = Math.abs(bounds.top + bounds.height / 2 - marker);
    if (centerDistance < nearestDistance) {
      nearestDistance = centerDistance;
      nearestIndex = index;
    }

    const localProgress = clamp(
      (marker - bounds.top) / Math.max(bounds.height, viewportHeight),
    );
    section.style.setProperty("--local-progress", localProgress.toFixed(4));
  });

  setActivePhase(nearestIndex);

  const activeSection = sections[nearestIndex];
  if (!activeSection) return;
  const bounds = activeSection.getBoundingClientRect();
  const local = clamp((marker - bounds.top) / Math.max(bounds.height, viewportHeight));
  const phase = phaseFromSection(activeSection);
  const globalProgress = clamp(
    (window.scrollY || document.documentElement.scrollTop) /
      Math.max(document.documentElement.scrollHeight - viewportHeight, 1),
  );

  let apertureOpen = 0.04;
  if (phase === "signal") apertureOpen = 0.04 + local * 0.1;
  if (phase === "aperture") apertureOpen = 0.18 + local * 0.78;
  if (phase === "need") apertureOpen = 0.82 - local * 0.2;
  if (phase === "find") apertureOpen = 0.58 + local * 0.16;
  if (phase === "test") apertureOpen = 0.92;
  if (phase === "prove") apertureOpen = 0.68 - local * 0.3;

  let constraint = 0;
  if (phase === "need") constraint = 0.25 + local * 0.75;
  if (phase === "find") constraint = 0.26 - local * 0.16;
  if (phase === "test") constraint = 0.85;
  if (phase === "prove") constraint = 0.28;

  const resolution = phase === "prove" ? 0.35 + local * 0.65 : 0;

  let signalStrength = 1;
  let trajectoryFreedom = 0.95;
  let fieldExposure = interpolate(0.01, 0.025, local);
  let selectionFocus = 0;
  let material = 0.04;
  let settlement = 0;

  if (phase === "aperture") {
    signalStrength = interpolate(0.72, 0.32, local);
    trajectoryFreedom = interpolate(0.88, 0.6, local);
    fieldExposure = interpolate(0.28, 0.96, local);
    material = fieldExposure;
  }

  if (phase === "need") {
    signalStrength = interpolate(0.34, 0.16, local);
    trajectoryFreedom = interpolate(0.58, 0.2, local);
    fieldExposure = 0.62;
    selectionFocus = interpolate(0.05, 0.12, local);
    material = 0.54;
  }

  if (phase === "find") {
    signalStrength = interpolate(0.34, 0.14, local);
    trajectoryFreedom = interpolate(0.48, 0.08, local);
    fieldExposure = 0.08;
    selectionFocus = smoothstep(0.08, 0.88, local);
    material = 0.08;
  }

  if (phase === "test") {
    signalStrength = 0.035;
    trajectoryFreedom = 0;
    fieldExposure = 1;
    selectionFocus = 1;
    material = 1;
  }

  if (phase === "prove") {
    signalStrength = 0;
    trajectoryFreedom = 0;
    fieldExposure = 0;
    selectionFocus = 0;
    material = 0;
    settlement = interpolate(0.35, 1, local);
  }

  if (phase === "find") {
    root.dataset.findStep = local < 0.33 ? "landscape" : local < 0.67 ? "adjacency" : "selection";
  } else {
    delete root.dataset.findStep;
  }

  root.style.setProperty("--story-progress", globalProgress.toFixed(4));
  root.style.setProperty("--active-progress", local.toFixed(4));
  root.style.setProperty("--aperture-open", apertureOpen.toFixed(4));
  root.style.setProperty("--constraint", constraint.toFixed(4));
  root.style.setProperty("--resolution", resolution.toFixed(4));
  root.style.setProperty("--material", material.toFixed(4));
  root.style.setProperty("--field-exposure", fieldExposure.toFixed(4));
  root.style.setProperty("--signal-strength", signalStrength.toFixed(4));
  root.style.setProperty("--trajectory-freedom", trajectoryFreedom.toFixed(4));
  root.style.setProperty("--selection-focus", selectionFocus.toFixed(4));
  root.style.setProperty("--settlement", settlement.toFixed(4));
}

function queueStoryUpdate(): void {
  if (controllerFrame) return;
  controllerFrame = window.requestAnimationFrame(updateStoryState);
}

function updatePointer(event: PointerEvent): void {
  if (!finePointerQuery.matches || reducedMotionEnabled()) return;
  const x = clamp(event.clientX / Math.max(window.innerWidth, 1));
  const y = clamp(event.clientY / Math.max(window.innerHeight, 1));
  root.style.setProperty("--pointer-x", x.toFixed(4));
  root.style.setProperty("--pointer-y", y.toFixed(4));
  root.style.setProperty("--pointer-shift-x", `${((x - 0.5) * 34).toFixed(2)}px`);
  root.style.setProperty("--pointer-shift-y", `${((y - 0.5) * 24).toFixed(2)}px`);
  void ensureFieldEngine();
}

async function loadFieldEngine(): Promise<void> {
  if (!canvas || webglDisabled || reducedMotionEnabled()) return;

  try {
    const { startFieldEngine } = await import("./field-engine");
    const engine = startFieldEngine(canvas);
    engineDestroy = engine.destroy;
    root.dataset.renderMode = "webgl-enhanced";
  } catch {
    root.dataset.renderMode = "no-webgl-fallback";
    root.dataset.enhancementFailure = "field-engine";
  }
}

function ensureFieldEngine(): Promise<void> {
  if (engineDestroy || webglDisabled || reducedMotionEnabled() || !canvas) {
    return Promise.resolve();
  }
  engineLoadPromise ??= loadFieldEngine();
  return engineLoadPromise;
}

function initializeMode(): void {
  engineDestroy?.();
  engineDestroy = undefined;
  engineLoadPromise = undefined;

  if (reducedMotionEnabled()) {
    root.dataset.renderMode = "reduced-motion";
    return;
  }

  if (webglDisabled) {
    root.dataset.renderMode = "no-webgl-fallback";
    return;
  }

  // The essential hero is complete in DOM/CSS. Realtime enhancement starts on
  // intentional pointer exploration or when scrolling reaches APERTURE/FIND.
  root.dataset.renderMode = "dom-fallback-ready";
}

window.addEventListener("scroll", queueStoryUpdate, { passive: true });
window.addEventListener("resize", queueStoryUpdate, { passive: true });
window.addEventListener("pointermove", updatePointer, { passive: true });
window.addEventListener("pageshow", queueStoryUpdate, { passive: true });
reducedMotionQuery.addEventListener("change", () => {
  initializeMode();
  queueStoryUpdate();
});
finePointerQuery.addEventListener("change", () => {
  root.dataset.inputMode = finePointerQuery.matches ? "pointer" : "touch-scroll";
});

phaseLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const phase = link.dataset.phaseLink as ExperiencePhase | undefined;
    const index = phase ? phases.indexOf(phase) : -1;
    if (index >= 0) setActivePhase(index);
  });
});

updateStoryState();
initializeMode();
