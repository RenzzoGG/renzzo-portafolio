import {
  LinearSRGBColorSpace,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { LedFace } from "../face/decode.ts";
import { createField } from "./displacement.ts";
import { createFaceLayer } from "./face-layer.ts";
import { createGridWall } from "./grid-wall.ts";
import { createPost } from "./post.ts";
import type { SlotRect, View, WorldStats } from "./protocol.ts";

const FOV = 30;
const MAX_DPR = 2;
const DPR_STEPS = [2, 1.5, 1.25, 1];
const ASSEMBLE_S = 0.7;
const SLOW_FRAME_MS = 24;
const SLOW_WINDOW_MS = 1200;
const MAX_YAW = 0.2;
const MAX_PITCH = 0.12;
const DISRUPT_FORCE = 3.2;

export interface SceneOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  face: LedFace;
  view: View;
  slot: SlotRect;
  onFirstFrame: () => void;
  onFailed: () => void;
  onStats?: (stats: WorldStats) => void;
}

export interface WorldScene {
  setView(view: View, slot: SlotRect): void;
  setSlot(slot: SlotRect): void;
  setPointer(x: number, y: number, inside: boolean): void;
  setActive(active: boolean): void;
  dispose(): void;
}

/** Critically damped-ish spring, stable at the frame times we clamp to. */
function spring(
  value: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
) {
  const next =
    velocity + (stiffness * (target - value) - damping * velocity) * dt;
  return { value: value + next * dt, velocity: next };
}

const easeOut = (value: number) => 1 - (1 - value) ** 4;

export function createScene(options: SceneOptions): WorldScene {
  const { canvas, face, onFirstFrame, onFailed, onStats } = options;
  let { view, slot } = options;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = true;
  renderer.setClearColor(0x000000, 1);

  const field = createField(renderer);
  const wall = createGridWall();
  const faceLayer = createFaceLayer(face, field.texture);
  faceLayer.uniforms.uFieldOn.value = field.supported ? 1 : 0;
  const post = createPost();

  const scene = new Scene();
  scene.add(wall.mesh, faceLayer.mesh);
  const camera = new PerspectiveCamera(FOV, 1, 10, 20000);
  const target = new WebGLRenderTarget(1, 1, { depthBuffer: false });

  let dprLimit = MAX_DPR;
  let quality = 1;
  let handle = 0;
  let active = true;
  let disposed = false;
  let shown = false;
  let last = 0;
  let time = 0;
  let assemble = 0;
  let slowSince = 0;
  let statFrames = 0;
  let statWork = 0;
  let statStart = 0;

  const pointerTarget = new Vector2();
  const pointer = new Vector2();
  let hoverTarget = 0;
  let hover = 0;
  let aimX = 0;
  let aimY = 0;
  let yaw = { value: 0, velocity: 0 };
  let pitch = { value: 0, velocity: 0 };

  function applySize() {
    const dpr = Math.min(view.dpr, dprLimit);
    const width = Math.max(1, view.width);
    const height = Math.max(1, view.height);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    target.setSize(Math.round(width * dpr), Math.round(height * dpr));
    post.uniforms.uResolution.value.set(width * dpr, height * dpr);
    wall.uniforms.uWidth.value = width * dpr;
    camera.aspect = width / height;
    // One world unit equals one CSS pixel on the z = 0 plane.
    camera.position.z = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.far = camera.position.z * 6;
    camera.updateProjectionMatrix();
    wall.resize(width, height);
    applySlot();
  }

  function applySlot() {
    const { uniforms } = faceLayer;
    uniforms.uSize.value.set(slot.width, slot.height);
    uniforms.uCenter.value.set(
      slot.x + slot.width / 2 - view.width / 2,
      view.height / 2 - (slot.y + slot.height / 2),
    );
    const centerX = (slot.x + slot.width / 2) / view.width;
    wall.uniforms.uFocus.value.set(centerX, slot.width / view.width / 2);
    post.uniforms.uSafe.value.set(
      centerX,
      (slot.width / 2 + 8) / view.width,
      20 / view.width,
      1 - view.top / view.height,
    );
  }

  function update(dt: number) {
    time += dt;
    if (shown) assemble = Math.min(1, assemble + dt / ASSEMBLE_S);

    const follow = 1 - Math.exp(-dt * 16);
    pointer.lerp(pointerTarget, follow);
    hover += (hoverTarget - hover) * (1 - Math.exp(-dt * 7));

    // The head turns toward the cursor and drifts on its own at rest.
    const driftYaw =
      Math.sin(time * 0.43) * 0.05 + Math.sin(time * 0.19) * 0.025;
    const driftPitch = Math.sin(time * 0.31 + 1.2) * 0.028;
    yaw = spring(
      yaw.value,
      yaw.velocity,
      aimX * MAX_YAW * hoverTarget + driftYaw,
      dt,
      34,
      11,
    );
    pitch = spring(
      pitch.value,
      pitch.velocity,
      -aimY * MAX_PITCH * hoverTarget + driftPitch,
      dt,
      34,
      11,
    );

    const { uniforms } = faceLayer;
    const aspect = slot.height / slot.width;
    if (field.supported) {
      field.update(pointer, DISRUPT_FORCE * hover, dt, aspect);
      uniforms.uField.value = field.texture;
    }
    uniforms.uPointer.value.copy(pointer);
    uniforms.uHover.value = hover;
    uniforms.uTime.value = time;
    uniforms.uAssemble.value = easeOut(assemble);
    uniforms.uTilt.value.set(yaw.value, pitch.value);

    wall.uniforms.uTime.value = time;
    wall.uniforms.uShift.value.set(
      faceLayer.uniforms.uCenter.value.x * 0.2 - yaw.value * 70,
      faceLayer.uniforms.uCenter.value.y * 0.2 + pitch.value * 50,
    );
    post.uniforms.uTime.value = time;
    post.uniforms.uQuality.value = quality;
  }

  /** Lowers resolution first, then effects, when frames stay slow. */
  function adapt(now: number, frameMs: number) {
    if (frameMs < SLOW_FRAME_MS) {
      slowSince = 0;
      return;
    }
    slowSince ||= now;
    if (now - slowSince < SLOW_WINDOW_MS) return;
    slowSince = 0;
    const current = Math.min(view.dpr, dprLimit);
    const next = DPR_STEPS.find((step) => step < current);
    if (next) {
      dprLimit = next;
      applySize();
    } else {
      quality = 0;
    }
  }

  function frame(now: number) {
    handle = requestAnimationFrame(frame);
    const elapsed = last ? now - last : 16;
    last = now;
    update(Math.min(elapsed / 1000, 0.1));

    const started = performance.now();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    post.render(renderer, target.texture);
    statWork += performance.now() - started;

    if (!shown) {
      shown = true;
      // Reported one frame later, once this frame has reached the screen.
      requestAnimationFrame(() => {
        if (!disposed) onFirstFrame();
      });
    }
    adapt(now, elapsed);

    if (onStats) {
      statFrames += 1;
      statStart ||= now;
      if (now - statStart >= 500) {
        onStats({
          fps: Math.round((statFrames * 1000) / (now - statStart)),
          frameMs: Number((statWork / statFrames).toFixed(1)),
          dpr: Math.min(view.dpr, dprLimit),
          quality,
        });
        statFrames = 0;
        statWork = 0;
        statStart = now;
      }
    }
  }

  const lost = (event: Event) => {
    event.preventDefault();
    if (!disposed) onFailed();
  };
  canvas.addEventListener("webglcontextlost", lost);

  applySize();
  handle = requestAnimationFrame(frame);

  return {
    setView(nextView, nextSlot) {
      view = nextView;
      slot = nextSlot;
      applySize();
    },
    setSlot(nextSlot) {
      slot = nextSlot;
      applySlot();
    },
    setPointer(x, y, inside) {
      const px = (x - slot.x) / slot.width - 0.5;
      const py = 0.5 - (y - slot.y) / slot.height;
      pointerTarget.set(px, py);
      // The disruption acts around the face, and fades as the cursor moves away.
      const reach = Math.max(Math.abs(px), Math.abs(py));
      hoverTarget = inside
        ? 1 - Math.min(1, Math.max(0, reach - 0.56) / 0.3)
        : 0;
      aimX = Math.max(-1, Math.min(1, px * 1.5));
      aimY = Math.max(-1, Math.min(1, py * 1.5));
    },
    setActive(next) {
      if (next === active || disposed) return;
      active = next;
      cancelAnimationFrame(handle);
      handle = 0;
      if (active) {
        last = 0;
        handle = requestAnimationFrame(frame);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(handle);
      canvas.removeEventListener("webglcontextlost", lost);
      faceLayer.dispose();
      wall.dispose();
      post.dispose();
      field.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
