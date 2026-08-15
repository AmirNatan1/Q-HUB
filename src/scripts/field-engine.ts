type FieldEngine = {
  destroy: () => void;
};

const vertexSource = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform vec2 u_pointer;
  uniform float u_time;
  uniform float u_phase;
  uniform float u_aperture;
  uniform float u_progress;
  uniform float u_pixel_ratio;
  uniform float u_signal;
  uniform float u_freedom;
  uniform float u_selection;
  uniform float u_material;
  uniform float u_settlement;
  uniform vec4 u_keepout;

  float strokeAA(float distanceValue, float widthPixels) {
    float pixel = u_pixel_ratio / max(u_resolution.y, 1.0);
    float halfWidth = widthPixels * pixel * 0.5;
    return 1.0 - smoothstep(halfWidth, halfWidth + pixel * 1.15, abs(distanceValue));
  }

  float freedomGate(float threshold) {
    return smoothstep(threshold - 0.055, threshold + 0.055, u_freedom);
  }

  float selectedPathY(float x) {
    return -0.08 + sin(x * 2.35 + 0.6) * 0.018;
  }

  float trajectory(
    vec2 point,
    float lane,
    float amplitude,
    float frequency,
    float phaseOffset,
    float widthPixels
  ) {
    float freedom = clamp(u_freedom, 0.0, 1.0);
    float spread = mix(0.18, 1.0, freedom);
    float amplitudeScale = mix(0.12, 1.0, freedom);
    float drift = u_time * 0.028;
    float curve = lane * spread;
    curve += sin(point.x * frequency + phaseOffset + drift) * amplitude * amplitudeScale;
    curve += sin(point.x * frequency * 2.17 - phaseOffset * 0.7 - drift * 0.55)
      * amplitude * 0.26 * amplitudeScale;

    float convergence = clamp(u_selection, 0.0, 1.0)
      * smoothstep(-0.62, 0.18, point.x);
    curve = mix(curve, selectedPathY(point.x), convergence);
    return strokeAA(point.y - curve, widthPixels);
  }

  float pointMask(vec2 uv, vec2 center, float radiusPixels) {
    vec2 deltaPixels = (uv - center) * u_resolution / max(u_pixel_ratio, 1.0);
    float distancePixels = length(deltaPixels);
    return 1.0 - smoothstep(radiusPixels, radiusPixels + 1.15, distancePixels);
  }

  float pointRing(vec2 uv, vec2 center, float radiusPixels) {
    vec2 deltaPixels = (uv - center) * u_resolution / max(u_pixel_ratio, 1.0);
    return strokeAA(
      length(deltaPixels) * u_pixel_ratio / max(u_resolution.y, 1.0)
        - radiusPixels * u_pixel_ratio / max(u_resolution.y, 1.0),
      1.0
    );
  }

  float rectKeepout(vec2 uv, vec4 rectangle) {
    vec2 offset = abs(uv - rectangle.xy) - rectangle.zw;
    float distanceValue = length(max(offset, 0.0)) + min(max(offset.x, offset.y), 0.0);
    return 1.0 - smoothstep(0.0, 0.028, distanceValue);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 centered = uv - 0.5;
    centered.x *= u_resolution.x / max(u_resolution.y, 1.0);

    vec2 pointer = u_pointer - 0.5;
    pointer.x *= u_resolution.x / max(u_resolution.y, 1.0);
    vec2 delta = centered - pointer;
    float distanceToPointer = length(delta);
    float apertureInfluence = smoothstep(0.10, 0.55, u_aperture);
    float apertureRadius = mix(0.08, 0.42, clamp(u_aperture, 0.0, 1.0));
    float normalizedDistance = distanceToPointer / max(apertureRadius, 0.001);
    float core = (1.0 - smoothstep(0.46, 0.98, normalizedDistance)) * apertureInfluence;
    float rim = smoothstep(0.42, 0.70, normalizedDistance)
      * (1.0 - smoothstep(0.90, 1.18, normalizedDistance))
      * apertureInfluence;

    vec2 direction = normalize(delta + vec2(0.0001));
    vec2 tangent = vec2(-direction.y, direction.x);
    vec2 retreat = direction * core * 0.18;
    vec2 shear = tangent * rim * 0.045;
    vec2 nearPlane = centered + retreat + shear;
    vec2 farPlane = centered - retreat * 0.32 - shear * 0.38;

    float candidateSurvival = mix(1.0, 0.08, clamp(u_selection, 0.0, 1.0));
    float farSignal = 0.0;
    farSignal += trajectory(farPlane, -0.38, 0.036, 2.10, 0.45, 0.85)
      * 0.075 * freedomGate(0.12);
    farSignal += trajectory(farPlane, 0.36, 0.030, 2.65, 2.10, 0.85)
      * 0.070 * freedomGate(0.34);
    farSignal += trajectory(farPlane, -0.24, 0.024, 3.20, 4.15, 0.90)
      * 0.085 * freedomGate(0.62);
    farSignal += trajectory(farPlane, 0.24, 0.042, 1.85, 5.30, 0.85)
      * 0.065 * freedomGate(0.80);

    float midSignal = 0.0;
    midSignal += trajectory(nearPlane, -0.13, 0.044, 3.55, 1.30, 1.15)
      * 0.155 * freedomGate(0.16);
    midSignal += trajectory(nearPlane, 0.14, 0.034, 3.85, 3.60, 1.10)
      * 0.140 * freedomGate(0.48);

    float privileged = trajectory(nearPlane, 0.015, 0.026, 2.85, 0.05, 1.55) * 0.52;
    float trajectories = (farSignal + midSignal) * candidateSurvival + privileged;

    float sparsePoints = 0.0;
    sparsePoints += pointMask(uv, vec2(0.15, 0.22), 1.8) * 0.16 * freedomGate(0.45);
    sparsePoints += pointMask(uv, vec2(0.84, 0.27), 2.0) * 0.14 * freedomGate(0.70);
    sparsePoints += pointMask(uv, vec2(0.30, 0.74), 2.1) * 0.18 * freedomGate(0.35);
    sparsePoints += pointMask(uv, vec2(0.57, 0.64), 2.2) * 0.20 * freedomGate(0.18);

    vec2 selectedCenter = vec2(0.69, 0.42);
    float selectedCore = pointMask(uv, selectedCenter, 2.8) * clamp(u_selection, 0.0, 1.0);
    float selectedHalo = pointRing(uv, selectedCenter, 8.0)
      * 0.10 * clamp(u_selection, 0.0, 1.0);

    float typeKeepout = rectKeepout(uv, u_keepout);
    trajectories *= 1.0 - typeKeepout * 0.94;
    sparsePoints *= 1.0 - typeKeepout * 0.98;

    float dropoutWave = 0.5 + 0.5 * sin(
      centered.x * 91.0 + centered.y * 67.0 + u_progress * 19.0 + u_time * 0.08
    );
    float rimContinuity = mix(
      1.0,
      smoothstep(0.35, 0.70, dropoutWave),
      rim * 0.82
    );
    float apertureCarve = 1.0 - core * 0.98;
    float materialConsumption = mix(
      1.0,
      0.32,
      smoothstep(0.68, 1.0, clamp(u_material, 0.0, 1.0))
    );

    float signal = (trajectories + sparsePoints) * rimContinuity * apertureCarve;
    signal *= materialConsumption;
    signal += (selectedCore * 0.44 + selectedHalo) * (1.0 - core * 0.72);
    signal *= clamp(u_signal, 0.0, 1.0);
    signal *= 1.0 - clamp(u_settlement, 0.0, 1.0);

    vec3 magenta = vec3(0.94, 0.08, 0.56);
    vec3 heat = vec3(1.0, 0.32, 0.08);
    vec3 teal = vec3(0.13, 0.83, 0.71);
    vec3 color = mix(magenta, heat, smoothstep(3.4, 4.4, u_phase));
    color = mix(color, teal, clamp(u_settlement, 0.0, 1.0));
    color = mix(color, heat, clamp(selectedCore + selectedHalo * 2.0, 0.0, 0.72));

    float edgeFalloff = smoothstep(1.05, 0.18, length(centered));
    float alpha = clamp(signal * edgeFalloff, 0.0, 0.46);

    // The context uses premultiplied-alpha blending. Premultiplication here keeps
    // fine, low-alpha trajectories from turning into saturated ribbons.
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL shader allocation failed.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("WebGL shader compilation failed.");
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("WebGL program allocation failed.");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error("WebGL program link failed.");
  }
  return program;
}

function uniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`Missing WebGL uniform: ${name}`);
  return location;
}

export function startFieldEngine(canvas: HTMLCanvasElement): FieldEngine {
  const context = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  if (!context) throw new Error("WebGL is unavailable.");
  const gl: WebGLRenderingContext = context;

  const program = createProgram(gl);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = uniform(gl, program, "u_resolution");
  const pointerLocation = uniform(gl, program, "u_pointer");
  const timeLocation = uniform(gl, program, "u_time");
  const phaseLocation = uniform(gl, program, "u_phase");
  const apertureLocation = uniform(gl, program, "u_aperture");
  const progressLocation = uniform(gl, program, "u_progress");
  const pixelRatioLocation = uniform(gl, program, "u_pixel_ratio");
  const signalLocation = uniform(gl, program, "u_signal");
  const freedomLocation = uniform(gl, program, "u_freedom");
  const selectionLocation = uniform(gl, program, "u_selection");
  const materialLocation = uniform(gl, program, "u_material");
  const settlementLocation = uniform(gl, program, "u_settlement");
  const keepoutLocation = uniform(gl, program, "u_keepout");
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("WebGL geometry allocation failed.");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const phaseIndex: Record<string, number> = {
    signal: 0,
    aperture: 1,
    need: 2,
    find: 3,
    test: 4,
    prove: 5,
  };
  const pointerTarget = { x: 0.64, y: 0.44 };
  const pointerCurrent = { ...pointerTarget };
  const startedAt = performance.now();
  let animationFrame = 0;
  let destroyed = false;
  let drawContinuously = true;
  let currentPixelRatio = 1;
  let keepoutPhase = "";
  let keepoutDirty = true;
  let keepout = { x: -2, y: -2, halfWidth: 0, halfHeight: 0 };

  const visualDefaults: Record<
    string,
    { signal: number; freedom: number; selection: number; settlement: number }
  > = {
    signal: { signal: 1, freedom: 0.95, selection: 0, settlement: 0 },
    aperture: { signal: 0.52, freedom: 0.72, selection: 0, settlement: 0 },
    need: { signal: 0.24, freedom: 0.34, selection: 0.08, settlement: 0 },
    find: { signal: 0.24, freedom: 0.24, selection: 0.55, settlement: 0 },
    test: { signal: 0.035, freedom: 0, selection: 1, settlement: 0 },
    prove: { signal: 0, freedom: 0, selection: 0, settlement: 1 },
  };

  function resize(): void {
    const mobile = window.matchMedia("(max-width: 48rem)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    currentPixelRatio = pixelRatio;
    const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      keepoutDirty = true;
    }
  }

  function readCssNumber(name: string, fallback: number): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function updateKeepout(activePhase: string): void {
    const heading = document.querySelector<HTMLElement>(
      `[data-experience-phase="${activePhase}"] .display`,
    );
    if (!heading) {
      keepout = { x: -2, y: -2, halfWidth: 0, halfHeight: 0 };
      keepoutPhase = activePhase;
      keepoutDirty = false;
      return;
    }

    const bounds = heading.getBoundingClientRect();
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);
    const horizontalPadding = 32;
    const verticalPadding = 24;
    const left = Math.max(0, bounds.left - horizontalPadding);
    const right = Math.min(viewportWidth, bounds.right + horizontalPadding);
    const top = Math.max(0, bounds.top - verticalPadding);
    const bottom = Math.min(viewportHeight, bounds.bottom + verticalPadding);
    const normalizedLeft = left / viewportWidth;
    const normalizedRight = right / viewportWidth;
    const normalizedBottom = 1 - bottom / viewportHeight;
    const normalizedTop = 1 - top / viewportHeight;

    keepout = {
      x: (normalizedLeft + normalizedRight) * 0.5,
      y: (normalizedBottom + normalizedTop) * 0.5,
      halfWidth: Math.max(0, (normalizedRight - normalizedLeft) * 0.5),
      halfHeight: Math.max(0, (normalizedTop - normalizedBottom) * 0.5),
    };
    keepoutPhase = activePhase;
    keepoutDirty = false;
  }

  function render(now: number): void {
    animationFrame = 0;
    if (destroyed || document.hidden) return;
    resize();

    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;
    const activePhase = document.documentElement.dataset.activePhase ?? "signal";
    const currentPhaseIndex = phaseIndex[activePhase] ?? 0;
    const defaults = visualDefaults[activePhase] ?? visualDefaults.signal;
    if (!defaults) return;
    const aperture = readCssNumber("--aperture-open", 0.08);
    const progress = readCssNumber("--active-progress", 0);
    const signalStrength = readCssNumber("--signal-strength", defaults.signal);
    const freedom = readCssNumber("--trajectory-freedom", defaults.freedom);
    const selectionFallback =
      activePhase === "find" ? Math.min(1, 0.08 + progress * 1.08) : defaults.selection;
    const selection = readCssNumber("--selection-focus", selectionFallback);
    const material = readCssNumber("--material", activePhase === "test" ? 1 : aperture);
    const settlementFallback = readCssNumber("--resolution", defaults.settlement);
    const settlement = readCssNumber("--settlement", settlementFallback);
    if (keepoutDirty || keepoutPhase !== activePhase) updateKeepout(activePhase);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(pointerLocation, pointerCurrent.x, 1 - pointerCurrent.y);
    gl.uniform1f(timeLocation, (now - startedAt) / 1000);
    gl.uniform1f(phaseLocation, currentPhaseIndex);
    gl.uniform1f(apertureLocation, aperture);
    gl.uniform1f(progressLocation, progress);
    gl.uniform1f(pixelRatioLocation, currentPixelRatio);
    gl.uniform1f(signalLocation, signalStrength);
    gl.uniform1f(freedomLocation, freedom);
    gl.uniform1f(selectionLocation, selection);
    gl.uniform1f(materialLocation, material);
    gl.uniform1f(settlementLocation, settlement);
    gl.uniform4f(
      keepoutLocation,
      keepout.x,
      keepout.y,
      keepout.halfWidth,
      keepout.halfHeight,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas.dataset.engine = "ready";

    if (drawContinuously) animationFrame = window.requestAnimationFrame(render);
  }

  function scheduleRender(): void {
    if (!animationFrame && !destroyed && !document.hidden) {
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function handlePointer(event: PointerEvent): void {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    pointerTarget.x = event.clientX / Math.max(window.innerWidth, 1);
    pointerTarget.y = event.clientY / Math.max(window.innerHeight, 1);
    scheduleRender();
  }

  function handlePhase(event: Event): void {
    const customEvent = event as CustomEvent<{ index?: number }>;
    const index = customEvent.detail?.index ?? 0;
    keepoutDirty = true;
    drawContinuously = index === 0 || index === 1 || index === 3;
    if (!drawContinuously && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    scheduleRender();
  }

  function handleVisibility(): void {
    if (document.hidden && animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else {
      scheduleRender();
    }
  }

  window.addEventListener("resize", scheduleRender, { passive: true });
  window.addEventListener("scroll", scheduleRender, { passive: true });
  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("qhub:phasechange", handlePhase);
  document.addEventListener("visibilitychange", handleVisibility);
  scheduleRender();

  return {
    destroy: () => {
      destroyed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleRender);
      window.removeEventListener("scroll", scheduleRender);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("qhub:phasechange", handlePhase);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      canvas.removeAttribute("data-engine");
    },
  };
}
