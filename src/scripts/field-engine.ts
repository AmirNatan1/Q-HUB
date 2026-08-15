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

  float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 345.45));
    point += dot(point, point + 34.345);
    return fract(point.x * point.y);
  }

  float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
  }

  float lineField(vec2 point, float scale, float speed) {
    vec2 warped = point * scale;
    float drift = valueNoise(warped * 0.34 + u_time * speed);
    float trace = abs(sin(warped.x * 0.72 + warped.y * 0.48 + drift * 5.2));
    return 1.0 - smoothstep(0.015, 0.12, trace);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 centered = uv - 0.5;
    centered.x *= u_resolution.x / max(u_resolution.y, 1.0);

    vec2 pointer = u_pointer - 0.5;
    pointer.x *= u_resolution.x / max(u_resolution.y, 1.0);
    vec2 delta = centered - pointer;
    float distanceToPointer = length(delta);
    float lens = exp(-distanceToPointer * distanceToPointer * 5.8) * u_aperture;

    // The signal field retreats and shears around the aperture instead of using
    // a simple opacity circle. Two spatial frequencies move at different depth.
    vec2 retreat = normalize(delta + vec2(0.0001)) * lens * 0.13;
    vec2 nearPlane = centered + retreat;
    vec2 farPlane = centered - retreat * 0.36;
    nearPlane.x += sin(farPlane.y * 7.0 + u_time * 0.16) * 0.018;

    float broadTrace = lineField(farPlane + vec2(u_time * 0.012, 0.0), 5.2, 0.035);
    float fineTrace = lineField(nearPlane - vec2(0.0, u_time * 0.016), 11.5, -0.022);
    float topologyNoise = valueNoise(nearPlane * 7.0 + vec2(u_time * 0.025, 0.0));
    float topology = 1.0 - smoothstep(0.025, 0.095, abs(fract(topologyNoise * 3.5) - 0.5));

    vec2 nodeCell = fract(nearPlane * 5.5) - 0.5;
    float node = 1.0 - smoothstep(0.028, 0.085, length(nodeCell));
    node *= step(0.77, hash21(floor(nearPlane * 5.5)));

    float signal = broadTrace * 0.38 + fineTrace * 0.64 + topology * 0.2 + node;
    float selected = exp(-length(centered - vec2(0.19, -0.08)) * 18.0);
    selected *= smoothstep(2.5, 3.9, u_phase);

    vec3 magenta = vec3(0.94, 0.08, 0.56);
    vec3 heat = vec3(1.0, 0.32, 0.08);
    vec3 teal = vec3(0.13, 0.83, 0.71);
    vec3 color = mix(magenta, heat, smoothstep(3.4, 4.4, u_phase));
    color = mix(color, teal, smoothstep(4.6, 5.1, u_phase));
    color += selected * heat * 1.3;

    float angularCut = smoothstep(-0.35, 0.5, sin(atan(delta.y, delta.x) * 3.0 + u_progress * 3.14159));
    float reveal = lens * mix(0.72, 0.94, angularCut);
    float settled = smoothstep(4.7, 5.2, u_phase);
    float alpha = signal * (0.6 - reveal * 0.54) * (1.0 - settled * 0.9);
    alpha += selected * (1.0 - settled) * 0.62;
    alpha *= smoothstep(1.05, 0.18, length(centered));

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.86));
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

  function resize(): void {
    const mobile = window.matchMedia("(max-width: 48rem)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
    const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function readCssNumber(name: string, fallback: number): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function render(now: number): void {
    animationFrame = 0;
    if (destroyed || document.hidden) return;
    resize();

    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;
    const activePhase = document.documentElement.dataset.activePhase ?? "signal";
    const currentPhaseIndex = phaseIndex[activePhase] ?? 0;
    const aperture = readCssNumber("--aperture-open", 0.08);
    const progress = readCssNumber("--active-progress", 0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform2f(pointerLocation, pointerCurrent.x, 1 - pointerCurrent.y);
    gl.uniform1f(timeLocation, (now - startedAt) / 1000);
    gl.uniform1f(phaseLocation, currentPhaseIndex);
    gl.uniform1f(apertureLocation, aperture);
    gl.uniform1f(progressLocation, progress);
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
  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("qhub:phasechange", handlePhase);
  document.addEventListener("visibilitychange", handleVisibility);
  scheduleRender();

  return {
    destroy: () => {
      destroyed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", scheduleRender);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("qhub:phasechange", handlePhase);
      document.removeEventListener("visibilitychange", handleVisibility);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      canvas.removeAttribute("data-engine");
    },
  };
}
