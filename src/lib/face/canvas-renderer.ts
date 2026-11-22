import type { LedFace } from "./decode.ts";

/** Dot radius per halftone size, in grid pitches. Matches the pipeline. */
const RADII = [0.13, 0.25, 0.36, 0.48];
const LAYERS = 4; // One steady layer plus three groups that twinkle.
const GLOW_SCALE = 3;
const MAX_DPR = 2;
const RESIZE_TOLERANCE = 0.08;
const DOTS_PER_FRAME = 350; // Keeps each baking task short on slow phones.
const TAU = Math.PI * 2;

export interface FaceRenderer {
  /** Resolves true once the layers are ready, false if destroyed first. */
  start(): Promise<boolean>;
  destroy(): void;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** Stable pseudo-random value per dot, so the pattern never reshuffles. */
function hash(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeLayer(width: number, height: number, name: string) {
  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  layer.dataset.layer = name;
  const context = layer.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  return { layer, context };
}

/**
 * Bakes the dots into a few static canvases, once. All motion is CSS opacity
 * and clip-path on those canvases, so no animation frame runs in JavaScript.
 */
export function createCanvasRenderer(
  host: HTMLElement,
  face: LedFace,
): FaceRenderer {
  // About 75% of dots stay steady. The rest twinkle in three random groups.
  const group = new Uint8Array(face.count);
  for (let dot = 0; dot < face.count; dot += 1) {
    const random = hash(dot);
    group[dot] = random < 0.75 ? 0 : 1 + Math.floor((random - 0.75) * 12);
  }

  let width = 0;
  let height = 0;
  let started = false;
  let build = 0; // Cancels a bake that a resize or destroy made obsolete.

  const measure = () => {
    const box = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    return {
      w: Math.max(1, Math.round(box.width * dpr)),
      h: Math.max(1, Math.round(box.height * dpr)),
    };
  };

  /** Draws one layer per frame, so no single task blocks the main thread. */
  async function bake() {
    const id = (build += 1);
    const { w, h } = measure();
    const styles = getComputedStyle(document.documentElement);
    const core = styles.getPropertyValue("--color-glow").trim();
    const halo = styles.getPropertyValue("--color-signal").trim();
    const pitchX = w / face.cols;
    const pitchY = h / face.rows;
    const pitch = Math.min(pitchX, pitchY);
    const baked: HTMLCanvasElement[] = [];

    for (let index = 0; index < LAYERS; index += 1) {
      await nextFrame();
      if (id !== build) return false;
      const { layer, context } = makeLayer(w, h, String(index));
      context.fillStyle = core;
      context.beginPath();
      let pending = 0;
      for (let dot = 0; dot < face.count; dot += 1) {
        if (group[dot] !== index) continue;
        const x = ((face.column[dot] ?? 0) + 0.5) * pitchX;
        const y = ((face.row[dot] ?? 0) + 0.5) * pitchY;
        const radius = (RADII[face.styled[dot] ?? 0] ?? 0) * pitch;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, TAU);
        pending += 1;
        if (pending === DOTS_PER_FRAME) {
          context.fill();
          context.beginPath();
          pending = 0;
          await nextFrame();
          if (id !== build) return false;
        }
      }
      context.fill();
      baked.push(layer);
    }

    await nextFrame();
    if (id !== build) return false;
    // Scaling down, then stretching with CSS, is a very cheap soft glow.
    const glow = makeLayer(
      Math.ceil(w / GLOW_SCALE),
      Math.ceil(h / GLOW_SCALE),
      "glow",
    );
    glow.context.imageSmoothingQuality = "high";
    for (const layer of baked) {
      glow.context.drawImage(layer, 0, 0, glow.layer.width, glow.layer.height);
    }
    glow.context.globalCompositeOperation = "source-in";
    glow.context.fillStyle = halo;
    glow.context.fillRect(0, 0, glow.layer.width, glow.layer.height);

    width = w;
    height = h;
    host.replaceChildren(glow.layer, ...baked);
    return true;
  }

  const intersection = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting ?? true) delete host.dataset.paused;
    else host.dataset.paused = "";
  });
  const resizing = new ResizeObserver(() => {
    if (!started) return;
    const { w, h } = measure();
    if (Math.abs(w - width) / width <= RESIZE_TOLERANCE) {
      if (Math.abs(h - height) / height <= RESIZE_TOLERANCE) return;
    }
    void bake();
  });

  return {
    async start() {
      const ready = await bake();
      if (!ready) return false;
      started = true;
      intersection.observe(host);
      resizing.observe(host);
      return true;
    },
    destroy() {
      build += 1;
      started = false;
      intersection.disconnect();
      resizing.disconnect();
      delete host.dataset.paused;
      host.replaceChildren();
    },
  };
}
