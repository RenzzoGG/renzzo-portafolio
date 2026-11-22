import type { LedFace } from "./decode.ts";

/** Dot radius per halftone size, in grid pitches. Matches the pipeline. */
const RADII = [0.13, 0.25, 0.36, 0.48];
const ASSEMBLE_MS = 900;
const DOT_IN = 0.38; // Share of the assemble each dot spends appearing.
const SHIMMER_FRAME_MS = 1000 / 12;
const SHIMMER_DEPTH = 0.2;
const MAX_DPR = 2;

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

function makeSprite(pitch: number, radius: number, core: string, halo: string) {
  const size = Math.ceil(pitch * 2.6);
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const context = sprite.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  const center = size / 2;
  const glow = context.createRadialGradient(
    center,
    center,
    radius * pitch * 0.6,
    center,
    center,
    center,
  );
  glow.addColorStop(0, halo);
  glow.addColorStop(1, "transparent");
  context.globalAlpha = 0.3;
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);

  context.globalAlpha = 1;
  context.fillStyle = core;
  context.beginPath();
  context.arc(center, center, radius * pitch, 0, Math.PI * 2);
  context.fill();
  return sprite;
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
    phase[dot] = hash(dot + 13) * Math.PI * 2;
  }

  let sprites: HTMLCanvasElement[] = [];
  let width = 0;
  let height = 0;
  let pitchX = 0;
  let pitchY = 0;
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
    pitchX = width / face.cols;
    pitchY = height / face.rows;

    const styles = getComputedStyle(document.documentElement);
    const core = styles.getPropertyValue("--color-glow").trim();
    const halo = styles.getPropertyValue("--color-signal").trim();
    const pitch = Math.min(pitchX, pitchY);
    sprites = RADII.map((radius) => makeSprite(pitch, radius, core, halo));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const assembling = clock < ASSEMBLE_MS;
    const progress = clock / ASSEMBLE_MS;

    for (let dot = 0; dot < face.count; dot += 1) {
      const sprite = sprites[face.styled[dot] ?? 0];
      if (!sprite) continue;
      let alpha = 1;
      let scale = 1;
      if (assembling) {
        const local = (progress - (delay[dot] ?? 0)) / DOT_IN;
        if (local <= 0) continue;
        const eased = easeOut(Math.min(local, 1));
        alpha = eased;
        scale = 0.45 + eased * 0.55;
      }
      const rate = speed[dot] ?? 0;
      if (rate > 0) {
        const wave = 0.5 + 0.5 * Math.sin(clock * rate + (phase[dot] ?? 0));
        alpha *= 1 - SHIMMER_DEPTH * wave;
      }

      const size = sprite.width * scale;
      const x = ((face.column[dot] ?? 0) + 0.5) * pitchX - size / 2;
      const y = ((face.row[dot] ?? 0) + 0.5) * pitchY - size / 2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x, y, size, size);
    }
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
      sprites = [];
    },
  };
}
