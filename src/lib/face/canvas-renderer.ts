import type { LedFace } from "./decode.ts";

/** Dot radius per halftone size, in grid pitches. Matches the pipeline. */
const RADII = [0.13, 0.25, 0.36, 0.48];
const ASSEMBLE_MS = 900;
const DOT_IN = 0.38; // Share of the assemble each dot spends appearing.
const SHIMMER_FRAME_MS = 1000 / 12;
const SHIMMER_DEPTH = 0.2;
const MAX_DPR = 2;
const BUCKETS = 16; // Dots that share an opacity are filled in one call.
const TAU = Math.PI * 2;

export interface FaceRenderer {
  start(): void;
  destroy(): void;
}

const easeOut = (value: number) => 1 - (1 - value) ** 3;

/** Stable pseudo-random value per dot, so the pattern never reshuffles. */
function hash(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function addDot(path: Path2D, x: number, y: number, radius: number) {
  path.moveTo(x + radius, y);
  path.arc(x, y, radius, 0, TAU);
}

/** The glow alone, cached once so neighboring halos never muddy the dots. */
function makeGlow(
  shape: Path2D,
  width: number,
  height: number,
  dpr: number,
  color: string,
) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const context = layer.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  // The shape is drawn off-canvas, so only its shadow lands on the layer.
  context.shadowColor = color;
  context.shadowBlur = 3 * dpr;
  context.shadowOffsetX = width * 2;
  context.translate(-width * 2, 0);
  context.fillStyle = "#000";
  context.fill(shape);
  return layer;
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
  face: LedFace,
): FaceRenderer {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  const ctx = context;

  const delay = new Float32Array(face.count);
  const phase = new Float32Array(face.count);
  const speed = new Float32Array(face.count);
  const xs = new Float32Array(face.count);
  const ys = new Float32Array(face.count);
  const radii = new Float32Array(face.count);
  const centerX = (face.cols - 1) / 2;
  const centerY = (face.rows - 1) * 0.42;
  const reach = Math.hypot(centerX, face.rows * 0.58);
  for (let dot = 0; dot < face.count; dot += 1) {
    const dx = (face.column[dot] ?? 0) - centerX;
    const dy = (face.row[dot] ?? 0) - centerY;
    const random = hash(dot);
    delay[dot] = Math.min(
      1 - DOT_IN,
      (Math.hypot(dx, dy) / reach) * 0.46 + random * 0.16,
    );
    // Only about one dot in four shimmers, which keeps the effect subtle.
    speed[dot] = random < 0.25 ? 0.0012 + hash(dot + 7) * 0.0022 : 0;
    phase[dot] = hash(dot + 13) * TAU;
  }

  let steady = new Path2D();
  let glow: HTMLCanvasElement | null = null;
  let core = "";
  let width = 0;
  let height = 0;
  let clock = 0;
  let last = 0;
  let lastPaint = 0;
  let frame = 0;
  let onScreen = true;
  let started = false;

  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = Math.max(1, Math.round(box.width * dpr));
    height = Math.max(1, Math.round(box.height * dpr));
    canvas.width = width;
    canvas.height = height;

    const pitchX = width / face.cols;
    const pitchY = height / face.rows;
    const pitch = Math.min(pitchX, pitchY);
    const all = new Path2D();
    steady = new Path2D();
    for (let dot = 0; dot < face.count; dot += 1) {
      const x = ((face.column[dot] ?? 0) + 0.5) * pitchX;
      const y = ((face.row[dot] ?? 0) + 0.5) * pitchY;
      const radius = (RADII[face.styled[dot] ?? 0] ?? 0) * pitch;
      xs[dot] = x;
      ys[dot] = y;
      radii[dot] = radius;
      addDot(all, x, y, radius);
      if (!speed[dot]) addDot(steady, x, y, radius);
    }

    const styles = getComputedStyle(document.documentElement);
    core = styles.getPropertyValue("--color-glow").trim();
    glow = makeGlow(all, width, height, dpr, "rgb(194 29 58 / 0.6)");
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const assembling = clock < ASSEMBLE_MS;
    const progress = Math.min(clock / ASSEMBLE_MS, 1);
    if (glow) {
      ctx.globalAlpha = easeOut(progress);
      ctx.drawImage(glow, 0, 0);
    }
    ctx.fillStyle = core;
    if (!assembling) {
      ctx.globalAlpha = 1;
      ctx.fill(steady);
    }

    const buckets: (Path2D | undefined)[] = new Array<Path2D | undefined>(
      BUCKETS,
    );
    for (let dot = 0; dot < face.count; dot += 1) {
      const rate = speed[dot] ?? 0;
      if (!assembling && !rate) continue;

      let alpha = 1;
      let scale = 1;
      if (assembling) {
        const local = (progress - (delay[dot] ?? 0)) / DOT_IN;
        if (local <= 0) continue;
        const eased = easeOut(Math.min(local, 1));
        alpha = eased;
        scale = 0.45 + eased * 0.55;
      }
      if (rate) {
        const wave = 0.5 + 0.5 * Math.sin(clock * rate + (phase[dot] ?? 0));
        alpha *= 1 - SHIMMER_DEPTH * wave;
      }

      const bucket = Math.max(0, Math.ceil(alpha * BUCKETS) - 1);
      const path = (buckets[bucket] ??= new Path2D());
      addDot(path, xs[dot] ?? 0, ys[dot] ?? 0, (radii[dot] ?? 0) * scale);
    }
    buckets.forEach((path, bucket) => {
      if (!path) return;
      ctx.globalAlpha = (bucket + 1) / BUCKETS;
      ctx.fill(path);
    });
    ctx.globalAlpha = 1;
  }

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    // A long gap (a hidden tab) must not skip the animation forward.
    clock += Math.min(now - last, 100);
    last = now;
    if (clock >= ASSEMBLE_MS && now - lastPaint < SHIMMER_FRAME_MS) return;
    lastPaint = now;
    draw();
  }

  function sync() {
    const run = started && onScreen && !document.hidden;
    if (run && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } else if (!run && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    sync();
  });
  const resizing = new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (
      Math.round(box.width * dpr) === width &&
      Math.round(box.height * dpr) === height
    ) {
      return;
    }
    resize();
    draw();
  });

  return {
    start() {
      resize();
      started = true;
      draw();
      intersection.observe(canvas);
      resizing.observe(canvas);
      document.addEventListener("visibilitychange", sync);
      sync();
    },
    destroy() {
      started = false;
      sync();
      intersection.disconnect();
      resizing.disconnect();
      document.removeEventListener("visibilitychange", sync);
      ctx.clearRect(0, 0, width, height);
      canvas.width = 0;
      canvas.height = 0;
      glow = null;
    },
  };
}
