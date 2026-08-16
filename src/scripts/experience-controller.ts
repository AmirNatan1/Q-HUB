import {
  experiencePhases,
  type ExperiencePhase,
} from "@/content/experience";

interface FieldStoryState {
  material: number;
  progress: number;
  selection: number;
  settlement: number;
  signal: number;
}

interface RuntimeFieldEngine {
  destroy: () => void;
  setPhase: (phase: ExperiencePhase) => void;
  setPointer: (x: number, y: number) => void;
  setStoryState: (state: FieldStoryState) => void;
  setVisible: (visible: boolean) => void;
}

const root = document.documentElement;
const sections = Array.from(
  document.querySelectorAll<HTMLElement>("[data-experience-phase]"),
);
const phaseLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("[data-phase-link]"),
);
const canvas = document.querySelector<HTMLCanvasElement>("[data-signal-canvas]");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");
const modeParameters = new URLSearchParams(window.location.search);
const webglDisabled = modeParameters.get("webgl") === "off";
const reducedMotionOverride = modeParameters.get("motion") === "reduce";
const realtimePhases = new Set<ExperiencePhase>([
  "presence",
  "startup",
  "method",
]);

let storyFrame = 0;
let pointerFrame = 0;
let activeIndex = -1;
let engine: RuntimeFieldEngine | undefined;
let engineLoadPromise: Promise<void> | undefined;
let engineLoadGeneration = 0;
let latestPointer = { x: 0.68, y: 0.46 };
let latestFieldState: FieldStoryState = {
  material: 0,
  progress: 0,
  selection: 0.05,
  settlement: 0,
  signal: 1,
};
let runtimeMounted = false;
let permanentlyDestroyed = false;

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

function phaseFromSection(section: HTMLElement): ExperiencePhase {
  const candidate = section.dataset.experiencePhase;
  return experiencePhases.includes(candidate as ExperiencePhase)
    ? candidate as ExperiencePhase
    : "presence";
}

function setSubstates(phase: ExperiencePhase, local: number): void {
  const presenceSection = document.querySelector<HTMLElement>(
    '[data-experience-phase="presence"]',
  );
  if (presenceSection) {
    presenceSection.dataset.presenceState = local >= 0.42 && phase === "presence"
      ? "resolved"
      : "origin";
  }

  const accessSection = document.querySelector<HTMLElement>(
    '[data-experience-phase="access"]',
  );
  if (accessSection && phase === "access") {
    const state = local < 0.26 ? "opening" : local < 0.64 ? "strategic" : "founding";
    accessSection.dataset.partnerState = state;
    const strategicIds = ["vdl-group", "hyundai-motor-group", "bazan-group"];
    const foundingIds = ["taavura-livnat-group", "talcar"];
    if (state === "opening") {
      delete root.dataset.partnerFocus;
    } else if (state === "strategic") {
      const index = Math.min(
        strategicIds.length - 1,
        Math.floor(((local - 0.26) / 0.38) * strategicIds.length),
      );
      root.dataset.partnerFocus = strategicIds[index] ?? strategicIds[0] ?? "vdl-group";
    } else {
      const index = Math.min(
        foundingIds.length - 1,
        Math.floor(((local - 0.64) / 0.36) * foundingIds.length),
      );
      root.dataset.partnerFocus = foundingIds[index] ?? foundingIds[0] ?? "taavura-livnat-group";
    }
  } else if (phase !== "access") {
    delete root.dataset.partnerFocus;
  }

  const startupSection = document.querySelector<HTMLElement>(
    '[data-experience-phase="startup"]',
  );
  if (startupSection && phase === "startup") {
    const state = local < 0.3 ? "outside" : local < 0.64 ? "threshold" : "field";
    startupSection.dataset.crossingState = state;
    root.dataset.crossingState = state;
  } else if (phase !== "startup") {
    delete root.dataset.crossingState;
  }

  const methodSection = document.querySelector<HTMLElement>(
    '[data-experience-phase="method"]',
  );
  if (methodSection && phase === "method") {
    const state = local < 0.34 ? "find" : local < 0.68 ? "test" : "prove";
    methodSection.dataset.methodState = state;
    root.dataset.methodState = state;
  } else if (phase !== "method") {
    delete root.dataset.methodState;
  }

  const activitySection = document.querySelector<HTMLElement>(
    '[data-experience-phase="activity"]',
  );
  if (activitySection && phase === "activity") {
    const activityStates = [
      "field-testing",
      "programs",
      "partner-engagement",
      "global-ecosystem",
    ] as const;
    const state = activityStates[Math.min(
      activityStates.length - 1,
      Math.floor(clamp(local) * activityStates.length),
    )] ?? activityStates[0];
    activitySection.dataset.activityState = state;
    root.dataset.activityState = state;
  } else if (phase !== "activity") {
    delete root.dataset.activityState;
  }
}

function setActivePhase(index: number): void {
  const activeSection = sections[index];
  if (!activeSection) return;
  const phase = phaseFromSection(activeSection);

  if (index !== activeIndex) {
    activeIndex = index;
    root.dataset.activePhase = phase;
    sections.forEach((section, sectionIndex) => {
      section.toggleAttribute("data-active", sectionIndex === index);
    });
    phaseLinks.forEach((link) => {
      if (link.dataset.phaseLink === phase) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    window.dispatchEvent(
      new CustomEvent("qhub:phasechange", { detail: { phase, index } }),
    );
  }

  engine?.setPhase(phase);
  engine?.setVisible(!document.hidden && realtimePhases.has(phase));
}

function updateStoryState(): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  storyFrame = 0;
  const viewportHeight = Math.max(window.innerHeight, 1);
  const marker = viewportHeight * 0.48;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  const measurements = sections.map((section) => ({
    section,
    bounds: section.getBoundingClientRect(),
  }));

  measurements.forEach(({ bounds }, index) => {
    const centerDistance = Math.abs(bounds.top + bounds.height / 2 - marker);
    if (centerDistance < nearestDistance) {
      nearestDistance = centerDistance;
      nearestIndex = index;
    }
  });

  measurements.forEach(({ section, bounds }) => {
    const localProgress = clamp(
      (marker - bounds.top) / Math.max(bounds.height, viewportHeight),
    );
    section.style.setProperty("--local-progress", localProgress.toFixed(4));
  });

  setActivePhase(nearestIndex);
  const activeMeasurement = measurements[nearestIndex];
  if (!activeMeasurement) return;
  const { section: activeSection, bounds } = activeMeasurement;
  const local = clamp((marker - bounds.top) / Math.max(bounds.height, viewportHeight));
  const phase = phaseFromSection(activeSection);
  const globalProgress = clamp(
    (window.scrollY || document.documentElement.scrollTop)
      / Math.max(document.documentElement.scrollHeight - viewportHeight, 1),
  );

  let signalStrength = 0;
  let selectionFocus = 0;
  let material = 0;
  let settlement = 0;

  if (phase === "presence") {
    signalStrength = interpolate(1, 0.58, local);
    selectionFocus = interpolate(0.05, 0.46, local);
  } else if (phase === "access") {
    signalStrength = 0.22;
    selectionFocus = interpolate(0.25, 0.72, local);
    material = 0.28;
  } else if (phase === "startup") {
    signalStrength = interpolate(0.54, 0.18, local);
    selectionFocus = interpolate(0.32, 1, local);
    material = interpolate(0.08, 1, local);
  } else if (phase === "method") {
    signalStrength = interpolate(0.48, 0.04, local);
    selectionFocus = local < 0.68 ? interpolate(0.18, 1, local / 0.68) : 1;
    material = local < 0.34 ? 0.06 : local < 0.68 ? 0.84 : 0.12;
    settlement = local >= 0.68 ? interpolate(0.2, 1, (local - 0.68) / 0.32) : 0;
  } else if (phase === "activity") {
    signalStrength = 0.2;
    selectionFocus = 0.52;
    material = 0.34;
  } else if (phase === "evidence") {
    settlement = 1;
  }

  root.style.setProperty("--story-progress", globalProgress.toFixed(4));
  root.style.setProperty("--active-progress", local.toFixed(4));
  root.style.setProperty("--signal-strength", signalStrength.toFixed(4));
  root.style.setProperty("--selection-focus", selectionFocus.toFixed(4));
  root.style.setProperty("--material", material.toFixed(4));
  root.style.setProperty("--settlement", settlement.toFixed(4));
  latestFieldState = {
    material,
    progress: local,
    selection: selectionFocus,
    settlement,
    signal: signalStrength,
  };
  engine?.setStoryState(latestFieldState);
  setSubstates(phase, local);
}

function queueStoryUpdate(): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  if (!storyFrame) storyFrame = window.requestAnimationFrame(updateStoryState);
}

function applyPointer(): void {
  pointerFrame = 0;
  const { x, y } = latestPointer;
  root.style.setProperty("--pointer-x", x.toFixed(4));
  root.style.setProperty("--pointer-y", y.toFixed(4));
  root.style.setProperty("--pointer-shift-x", `${((x - 0.5) * 24).toFixed(2)}px`);
  root.style.setProperty("--pointer-shift-y", `${((y - 0.5) * 18).toFixed(2)}px`);
  engine?.setPointer(x, y);
}

function updatePointer(event: PointerEvent): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  if (!finePointerQuery.matches || reducedMotionEnabled()) return;
  const activePhase = root.dataset.activePhase as ExperiencePhase | undefined;
  if (!activePhase || !realtimePhases.has(activePhase)) return;
  latestPointer = {
    x: clamp(event.clientX / Math.max(window.innerWidth, 1)),
    y: clamp(event.clientY / Math.max(window.innerHeight, 1)),
  };
  if (!pointerFrame) pointerFrame = window.requestAnimationFrame(applyPointer);
  void ensureFieldEngine(activePhase);
}

async function loadFieldEngine(
  initialPhase: ExperiencePhase,
  generation: number,
): Promise<void> {
  if (
    permanentlyDestroyed
    || !runtimeMounted
    || !canvas
    || webglDisabled
    || reducedMotionEnabled()
    || !finePointerQuery.matches
  ) return;
  try {
    const { startFieldEngine } = await import("./field-engine");
    const currentPhase = root.dataset.activePhase as ExperiencePhase | undefined;
    if (
      generation !== engineLoadGeneration
      || permanentlyDestroyed
      || !runtimeMounted
      || webglDisabled
      || reducedMotionEnabled()
      || !finePointerQuery.matches
      || !currentPhase
      || !realtimePhases.has(currentPhase)
    ) return;
    engine = startFieldEngine(canvas, currentPhase ?? initialPhase);
    engine.setPointer(latestPointer.x, latestPointer.y);
    engine.setStoryState(latestFieldState);
    engine.setVisible(!document.hidden && realtimePhases.has(currentPhase));
    root.dataset.renderMode = "webgl-enhanced";
  } catch {
    if (generation !== engineLoadGeneration || !runtimeMounted || permanentlyDestroyed) return;
    root.dataset.renderMode = "no-webgl-fallback";
    root.dataset.enhancementFailure = "field-engine";
  }
}

function ensureFieldEngine(phase: ExperiencePhase): Promise<void> {
  if (
    engine
    || webglDisabled
    || reducedMotionEnabled()
    || !finePointerQuery.matches
    || !canvas
    || !realtimePhases.has(phase)
  ) {
    return Promise.resolve();
  }
  if (!engineLoadPromise) {
    const generation = engineLoadGeneration;
    engineLoadPromise = loadFieldEngine(phase, generation).finally(() => {
      if (generation === engineLoadGeneration && !engine) engineLoadPromise = undefined;
    });
  }
  return engineLoadPromise;
}

function initializeMode(): void {
  engineLoadGeneration += 1;
  engine?.destroy();
  engine = undefined;
  engineLoadPromise = undefined;
  if (reducedMotionEnabled()) {
    root.dataset.renderMode = "reduced-motion";
  } else if (webglDisabled) {
    root.dataset.renderMode = "no-webgl-fallback";
  } else {
    root.dataset.renderMode = "dom-fallback-ready";
  }
}

function handleVisibility(): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  const phase = root.dataset.activePhase as ExperiencePhase | undefined;
  engine?.setVisible(Boolean(phase && !document.hidden && realtimePhases.has(phase)));
  if (!document.hidden) queueStoryUpdate();
}

function handleReducedMotionChange(): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  initializeMode();
  queueStoryUpdate();
}

function handleFinePointerChange(): void {
  if (!runtimeMounted || permanentlyDestroyed) return;
  root.dataset.inputMode = finePointerQuery.matches ? "pointer" : "touch-scroll";
  if (!finePointerQuery.matches) initializeMode();
  queueStoryUpdate();
}

const phaseLinkHandlers = new Map<HTMLAnchorElement, () => void>();

function mountRuntime(): void {
  if (runtimeMounted || permanentlyDestroyed) return;
  runtimeMounted = true;
  window.addEventListener("scroll", queueStoryUpdate, { passive: true });
  window.addEventListener("resize", queueStoryUpdate, { passive: true });
  window.addEventListener("pointermove", updatePointer, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  finePointerQuery.addEventListener("change", handleFinePointerChange);
  phaseLinks.forEach((link) => {
    const handler = () => {
      const phase = link.dataset.phaseLink as ExperiencePhase | undefined;
      const index = phase ? experiencePhases.indexOf(phase) : -1;
      if (index >= 0) setActivePhase(index);
    };
    phaseLinkHandlers.set(link, handler);
    link.addEventListener("click", handler);
  });
  initializeMode();
  updateStoryState();
}

function unmountRuntime(): void {
  if (!runtimeMounted) return;
  runtimeMounted = false;
  if (storyFrame) window.cancelAnimationFrame(storyFrame);
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
  storyFrame = 0;
  pointerFrame = 0;
  window.removeEventListener("scroll", queueStoryUpdate);
  window.removeEventListener("resize", queueStoryUpdate);
  window.removeEventListener("pointermove", updatePointer);
  document.removeEventListener("visibilitychange", handleVisibility);
  reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
  finePointerQuery.removeEventListener("change", handleFinePointerChange);
  phaseLinkHandlers.forEach((handler, link) => link.removeEventListener("click", handler));
  phaseLinkHandlers.clear();
  engineLoadGeneration += 1;
  engine?.destroy();
  engine = undefined;
  engineLoadPromise = undefined;
}

function handlePageHide(event: PageTransitionEvent): void {
  unmountRuntime();
  if (!event.persisted) {
    permanentlyDestroyed = true;
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("pageshow", handlePageShow);
  }
}

function handlePageShow(event: PageTransitionEvent): void {
  if (event.persisted) mountRuntime();
}

window.addEventListener("pagehide", handlePageHide);
window.addEventListener("pageshow", handlePageShow);
mountRuntime();
