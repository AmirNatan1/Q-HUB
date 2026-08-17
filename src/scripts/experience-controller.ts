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
const partnerPlanes = Array.from(
  document.querySelectorAll<HTMLElement>("[data-partner-id]"),
);
const accessHeading = document.querySelector<HTMLElement>(".phase-r-access__heading");
const crossingSection = document.querySelector<HTMLElement>(
  '[data-experience-phase="startup"]',
);
const methodInstrument = document.querySelector<HTMLElement>(".method-instrument");
const methodLines = methodInstrument
  ? Array.from(methodInstrument.querySelectorAll<HTMLElement>(":scope > span"))
  : [];
const methodObservations = methodInstrument
  ? Array.from(methodInstrument.querySelectorAll<HTMLElement>(".method-instrument__observation"))
  : [];
const methodRegistration = methodInstrument?.querySelector<HTMLElement>(
  ".method-instrument__registration",
);
const methodWords = Array.from(
  document.querySelectorAll<HTMLElement>("[data-method-word]"),
);
const activityGeometries = Array.from(
  document.querySelectorAll<HTMLElement>("[data-activity-geometry]"),
);
const activitySignalElements = Array.from(
  document.querySelectorAll<HTMLElement>("[data-activity-signal]"),
);
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
root.dataset.scrollChoreography = "continuous";
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
  if (start === end) return value >= end ? 1 : 0;
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function centeredWeight(
  progress: number,
  center: number,
  resolvedRadius: number,
  fadeRadius: number,
): number {
  const distance = Math.abs(progress - center);
  if (distance <= resolvedRadius) return 1;
  if (distance >= fadeRadius) return 0;
  return 1 - smoothstep(resolvedRadius, fadeRadius, distance);
}

function setNumber(
  element: HTMLElement | null | undefined,
  name: string,
  value: number,
  digits = 4,
): void {
  element?.style.setProperty(name, value.toFixed(digits));
}

function setLength(
  element: HTMLElement | null | undefined,
  name: string,
  value: number,
  unit: "%" | "rem" | "deg" | "px" = "%",
): void {
  element?.style.setProperty(name, `${value.toFixed(3)}${unit}`);
}

function blendedValue(
  local: number,
  find: number,
  test: number,
  prove: number,
): number {
  if (local <= 0.04) return find;
  if (local < 0.48) return interpolate(find, test, smoothstep(0.04, 0.48, local));
  if (local < 0.78) return interpolate(test, prove, smoothstep(0.48, 0.78, local));
  return prove;
}

function methodWeights(local: number): readonly [number, number, number] {
  const findToTest = smoothstep(0.04, 0.48, local);
  const testToProve = smoothstep(0.48, 0.78, local);
  return [
    1 - findToTest,
    findToTest * (1 - testToProve),
    testToProve,
  ];
}

function setPartnerProgress(local: number): void {
  const centers = [0.18, 0.34, 0.5, 0.66, 0.82] as const;
  partnerPlanes.forEach((plane, index) => {
    const center = centers[index] ?? 0.84;
    const weight = centeredWeight(local, center, 0.035, 0.115);
    const offset = clamp((local - center) / 0.115, -1, 1);
    setNumber(plane, "--partner-opacity", weight);
    setNumber(plane, "--partner-scale", 1 + Math.abs(offset) * 0.018);
    setLength(plane, "--partner-offset", -offset * 2.4, "rem");
    setLength(plane, "--partner-texture-shift", -2 + weight * 4);
  });
  const strategicWeight = Math.max(
    ...partnerPlanes.slice(0, 3).map((plane) => (
      Number.parseFloat(plane.style.getPropertyValue("--partner-opacity")) || 0
    )),
  );
  const foundingWeight = Math.max(
    ...partnerPlanes.slice(3).map((plane) => (
      Number.parseFloat(plane.style.getPropertyValue("--partner-opacity")) || 0
    )),
  );
  setNumber(accessHeading, "--access-heading-opacity", 1 - smoothstep(0.1, 0.2, local) * 0.84);
  root.style.setProperty("--strategic-label-opacity", strategicWeight.toFixed(4));
  root.style.setProperty("--founding-label-opacity", foundingWeight.toFixed(4));
}

function setCrossingProgress(local: number): void {
  if (!crossingSection) return;
  const compression = smoothstep(0.18, 0.48, local);
  const release = smoothstep(0.5, 0.8, local);
  const field = smoothstep(0.3, 0.82, local);
  const constraint = smoothstep(0.18, 0.54, local);
  setNumber(crossingSection, "--crossing-position", local);
  setNumber(crossingSection, "--crossing-compression", compression);
  setNumber(crossingSection, "--crossing-release", release);
  setNumber(crossingSection, "--crossing-field", field);
  setNumber(crossingSection, "--crossing-constraint", constraint);
  setNumber(crossingSection, "--crossing-constraint-opacity", 0.46 + constraint * 0.46);
  setLength(crossingSection, "--crossing-gap", 4.2 - constraint * 3, "rem");
  setLength(crossingSection, "--crossing-constraint-offset", (1 - constraint) * 2, "rem");
  setNumber(crossingSection, "--crossing-field-opacity", 0.28 + field * 0.72);
  setLength(crossingSection, "--crossing-field-mix", field * 100);
  setNumber(crossingSection, "--crossing-glow-alpha", 0.18 + field * 0.42);
  setNumber(crossingSection, "--crossing-scale-x", 1 - compression * 0.35 + release * 0.35);
  setNumber(crossingSection, "--crossing-scale-y", 1 - compression * 0.91 - release * 0.025);
  if (release >= 0.999) {
    setLength(crossingSection, "--crossing-radius", 0, "px");
  } else {
    setLength(crossingSection, "--crossing-radius", (1 - release) * 50);
  }
  setLength(crossingSection, "--crossing-signal-mix", 6 + field * 94);
  setNumber(crossingSection, "--crossing-ring-opacity", 1 - compression);
  setNumber(crossingSection, "--crossing-frame-opacity", 0.28 + compression * 0.32 + release * 0.4);
  setLength(crossingSection, "--crossing-frame-rotation", -17 * (1 - compression), "deg");
}

function setMethodProgress(local: number): void {
  if (!methodInstrument) return;
  const [findWeight, testWeight, proveWeight] = methodWeights(local);
  const color = [
    blendedValue(local, 216, 246, 34),
    blendedValue(local, 43, 119, 189),
    blendedValue(local, 114, 131, 165),
  ] as const;
  methodInstrument.style.setProperty(
    "--method-color",
    `${color[0].toFixed(1)} ${color[1].toFixed(1)} ${color[2].toFixed(1)}`,
  );
  setNumber(methodInstrument, "--method-find-weight", findWeight);
  setNumber(methodInstrument, "--method-test-weight", testWeight);
  setNumber(methodInstrument, "--method-prove-weight", proveWeight);
  setNumber(methodInstrument, "--method-test-alpha", testWeight * 0.12);
  setNumber(methodInstrument, "--method-prove-alpha", proveWeight * 0.09);
  setLength(methodInstrument, "--method-surface-top", blendedValue(local, 10, 0, 5));
  setLength(methodInstrument, "--method-surface-right", blendedValue(local, 4, 45.6, 3));
  setLength(methodInstrument, "--method-surface-bottom", blendedValue(local, 10, 0, 7));
  setLength(methodInstrument, "--method-surface-left", blendedValue(local, 4, 54, 7));
  setLength(methodInstrument, "--method-surface-fill", blendedValue(local, 3, 88, 18));
  setLength(methodInstrument, "--method-surface-border", blendedValue(local, 26, 72, 42));
  setLength(methodInstrument, "--method-clip-one-x", blendedValue(local, 0, 0, 9));
  setLength(methodInstrument, "--method-clip-one-y", blendedValue(local, 0, 0, 9));
  setLength(methodInstrument, "--method-clip-three-x", blendedValue(local, 100, 100, 91));
  setLength(methodInstrument, "--method-clip-three-y", blendedValue(local, 100, 100, 91));
  setLength(methodInstrument, "--method-focus-top", blendedValue(local, 50.6, 43.4, 49.9));
  setLength(methodInstrument, "--method-focus-left", blendedValue(local, 72, 49.3, 4));
  setLength(methodInstrument, "--method-focus-width", blendedValue(local, 2, 9.4, 92));
  setLength(methodInstrument, "--method-focus-height", blendedValue(local, 2.8, 13.2, 0.2));
  setLength(methodInstrument, "--method-focus-radius", blendedValue(local, 50, 3, 0));
  setLength(methodInstrument, "--method-focus-rotation", blendedValue(local, 0, 45, -6), "deg");
  setNumber(methodInstrument, "--method-focus-scale-x", blendedValue(local, 1, 0.72, 1));

  const lineKeyframes = [
    { find: [25, 5, 88, -4], test: [38, 5, 51, 5], prove: [31, 10, 80, 1.5] },
    { find: [51, 9, 72, 3], test: [50, 5, 49, 0], prove: [50, 10, 80, -0.5] },
    { find: [76, 14, 80, -2], test: [62, 5, 51, -5], prove: [69, 10, 80, 1] },
  ] as const;
  methodLines.slice(0, 3).forEach((line, index) => {
    const keyframe = lineKeyframes[index];
    if (!keyframe) return;
    setLength(line, "--method-line-top", blendedValue(local, keyframe.find[0], keyframe.test[0], keyframe.prove[0]));
    setLength(line, "--method-line-left", blendedValue(local, keyframe.find[1], keyframe.test[1], keyframe.prove[1]));
    setLength(line, "--method-line-width", blendedValue(local, keyframe.find[2], keyframe.test[2], keyframe.prove[2]));
    setLength(line, "--method-line-rotation", blendedValue(local, keyframe.find[3], keyframe.test[3], keyframe.prove[3]), "deg");
  });

  const observationKeyframes = [
    { find: [25, 22], test: [38, 47], prove: [31, 47] },
    { find: [54, 76], test: [50, 51], prove: [50, 47] },
    { find: [76, 40], test: [62, 47], prove: [69, 47] },
  ] as const;
  methodObservations.forEach((observation, index) => {
    const keyframe = observationKeyframes[index];
    if (!keyframe) return;
    setLength(observation, "--method-observation-top", blendedValue(local, keyframe.find[0], keyframe.test[0], keyframe.prove[0]));
    setLength(observation, "--method-observation-left", blendedValue(local, keyframe.find[1], keyframe.test[1], keyframe.prove[1]));
    setLength(observation, "--method-observation-size", blendedValue(local, 0.8, 0.8, 1.15), "rem");
    setNumber(observation, "--method-observation-opacity", blendedValue(local, 0.58, 0.78, 1));
  });
  setLength(methodRegistration, "--method-registration-top", blendedValue(local, 14, 12, 16));
  setLength(methodRegistration, "--method-registration-left", blendedValue(local, 54, 54, 47));
  setLength(methodRegistration, "--method-registration-height", blendedValue(local, 72, 76, 68));
  setNumber(methodRegistration, "--method-registration-opacity", blendedValue(local, 0, 0.24, 0.7));

  const wordColors = [
    [216, 43, 114],
    [246, 119, 131],
    [34, 189, 165],
  ] as const;
  methodWords.forEach((word, index) => {
    const weight = [findWeight, testWeight, proveWeight][index] ?? 0;
    const wordColor = wordColors[index] ?? wordColors[0];
    word.style.setProperty(
      "--method-word-color",
      `${wordColor[0]} ${wordColor[1]} ${wordColor[2]}`,
    );
    setNumber(word, "--method-word-opacity", 0.14 + weight * 0.86);
    setLength(word, "--method-word-shift", weight * 0.06, "rem");
  });
}

function setActivityProgress(local: number): void {
  const centers = [0.16, 0.37, 0.62, 0.84] as const;
  activityGeometries.forEach((geometry, index) => {
    const center = centers[index] ?? 0.84;
    const weight = centeredWeight(local, center, 0.055, 0.13);
    const offset = clamp((local - center) / 0.13, -1, 1);
    setNumber(geometry, "--activity-opacity", weight);
    setNumber(geometry, "--activity-scale", 1 - Math.abs(offset) * 0.025);
  });
  activitySignalElements.forEach((signal, index) => {
    const center = centers[index] ?? 0.84;
    const weight = centeredWeight(local, center, 0.055, 0.13);
    const offset = clamp((local - center) / 0.13, -1, 1);
    setNumber(signal, "--activity-opacity", weight);
    setLength(signal, "--activity-offset", -offset * 3.5, "rem");
  });
  root.style.setProperty(
    "--activity-heading-opacity",
    (1 - smoothstep(0.13, 0.29, local)).toFixed(4),
  );
}

function setStageProgress(phase: ExperiencePhase, local: number): void {
  let canvasOpacity = 0;
  let signalOpacity = 0;
  let presenceOpacity = 0;
  let territoriesOpacity = 0;
  let thresholdOpacity = 0;
  let methodOpacity = 0;
  let evidenceOpacity = 0;
  let paperOpacity = 0;
  let actionGlow = 0.08;
  if (phase === "presence") {
    const exit = smoothstep(0.72, 0.98, local);
    canvasOpacity = 0.34 * (1 - exit);
    signalOpacity = 0.76 * (1 - exit * 0.72);
    presenceOpacity = 1 - exit;
  } else if (phase === "access") {
    const envelope = smoothstep(0.02, 0.16, local) * (1 - smoothstep(0.84, 0.98, local));
    signalOpacity = 0.18 * envelope;
    territoriesOpacity = 0.72 * envelope;
  } else if (phase === "startup") {
    const envelope = smoothstep(0.02, 0.16, local) * (1 - smoothstep(0.86, 0.98, local));
    canvasOpacity = 0.24 * envelope;
    signalOpacity = 0.48 * envelope;
    thresholdOpacity = 0.7 * envelope;
  } else if (phase === "method") {
    const envelope = smoothstep(0.02, 0.14, local) * (1 - smoothstep(0.87, 0.99, local));
    canvasOpacity = 0.2 * envelope;
    signalOpacity = interpolate(0.36, 0.08, local) * envelope;
    thresholdOpacity = interpolate(0.62, 0.12, local) * envelope;
    methodOpacity = 0.85 * envelope;
  } else if (phase === "activity") {
    const envelope = smoothstep(0.02, 0.14, local) * (1 - smoothstep(0.86, 0.98, local));
    signalOpacity = 0.12 * envelope;
    territoriesOpacity = 0.46 * envelope;
  } else if (phase === "evidence") {
    const envelope = smoothstep(0.04, 0.2, local);
    evidenceOpacity = envelope;
    paperOpacity = envelope;
    actionGlow = 0;
  } else if (phase === "action") {
    paperOpacity = 1 - smoothstep(0, 0.25, local);
    actionGlow = 0.28 * smoothstep(0.02, 0.42, local);
  }
  setNumber(root, "--stage-canvas-opacity", canvasOpacity);
  setNumber(root, "--stage-signal-opacity", signalOpacity);
  setNumber(root, "--stage-presence-opacity", presenceOpacity);
  setNumber(root, "--stage-territories-opacity", territoriesOpacity);
  setNumber(root, "--stage-threshold-opacity", thresholdOpacity);
  setNumber(root, "--stage-method-opacity", methodOpacity);
  setNumber(root, "--stage-evidence-opacity", evidenceOpacity);
  setNumber(root, "--stage-paper-opacity", paperOpacity);
  setLength(root, "--stage-paper-mix", paperOpacity * 100);
  setNumber(root, "--stage-action-glow", actionGlow);
  root.dataset.stageTone = paperOpacity >= 0.5 ? "light" : "dark";
}

function phaseFromSection(section: HTMLElement): ExperiencePhase {
  const candidate = section.dataset.experiencePhase;
  return experiencePhases.includes(candidate as ExperiencePhase)
    ? candidate as ExperiencePhase
    : "presence";
}

function setSubstates(phase: ExperiencePhase, local: number): void {
  setStageProgress(phase, local);
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
    setPartnerProgress(local);
    const state = local < 0.13 ? "opening" : local < 0.58 ? "strategic" : "founding";
    accessSection.dataset.partnerState = state;
    if (state === "opening") {
      delete root.dataset.partnerFocus;
    } else {
      const centers = [0.18, 0.34, 0.5, 0.66, 0.82] as const;
      const index = centers.reduce((nearest, center, candidate) => (
        Math.abs(local - center) < Math.abs(local - centers[nearest]!)
          ? candidate
          : nearest
      ), 0);
      root.dataset.partnerFocus = partnerPlanes[index]?.dataset.partnerId ?? "vdl-group";
    }
  } else if (phase !== "access") {
    delete root.dataset.partnerFocus;
  }

  const startupSection = document.querySelector<HTMLElement>(
    '[data-experience-phase="startup"]',
  );
  if (startupSection && phase === "startup") {
    setCrossingProgress(local);
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
    setMethodProgress(local);
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
    setActivityProgress(local);
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
    section.dataset.progress = localProgress.toFixed(4);
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
    const contact = smoothstep(0.24, 0.5, local);
    const evidence = smoothstep(0.58, 0.86, local);
    material = interpolate(interpolate(0.06, 0.84, contact), 0.12, evidence);
    settlement = interpolate(0, 1, evidence);
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
    delete root.dataset.scrollChoreography;
    root.dataset.renderMode = "reduced-motion";
  } else if (webglDisabled) {
    root.dataset.scrollChoreography = "continuous";
    root.dataset.renderMode = "no-webgl-fallback";
  } else {
    root.dataset.scrollChoreography = "continuous";
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
