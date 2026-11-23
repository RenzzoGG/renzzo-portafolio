import {
  LinearSRGBColorSpace,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import type { LedFace } from "../face/decode.ts";
import { createField } from "./displacement.ts";
import { createDrum } from "./drum.ts";
import { createFaceLayer } from "./face-layer.ts";
import { createGridWall } from "./grid-wall.ts";
import { actAt, smoothstep } from "./journey.ts";
import { createPost } from "./post.ts";
import type { DrumLayout, SlotRect, View, WorldStats } from "./protocol.ts";
import { createSignalField } from "./signal-field.ts";
import { createTunnel } from "./tunnel.ts";

const FOV = 30;
const MAX_DPR = 2;
const DPR_STEPS = [2, 1.5, 1.25, 1];
const ASSEMBLE_S = 0.7;
const ASSEMBLE_HOLD_S = 0.12; // Waits for the poster crossfade to reveal it.
const SLOW_FRAME_MS = 24;
const SLOW_WINDOW_MS = 1200;
const MAX_YAW = 0.2;
const MAX_PITCH = 0.12;
const DISRUPT_FORCE = 3.2;
const SCREENS = 4;
const JOURNEY_FOLLOW = 8;
const PULL_BACK = 0.34;
/** Journey units per second that count as the fastest scroll. */
const FAST_SCROLL = 1.5;
const DARK_GROUND = new Vector3(0.043, 0.039, 0.047);
const BONE_GROUND = new Vector3(0.949, 0.933, 0.918);

export interface SceneOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  face: LedFace;
  view: View;
  slot: SlotRect;
  journey: number;
  drum: DrumLayout;
  onFirstFrame: () => void;
  onFailed: () => void;
  onStats?: (stats: WorldStats) => void;
}

export interface WorldScene {
  setView(view: View, slot: SlotRect): void;
  setSlot(slot: SlotRect): void;
  setJourney(value: number): void;
  setDrum(drum: DrumLayout): void;
  loadTexture(index: number, url: string): void;
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
  // Alpha 0 lets the analog pass tell covered pixels from empty ground.
  renderer.setClearColor(0x000000, 0);

  const field = createField(renderer);
  const wall = createGridWall();
  const faceLayer = createFaceLayer(face, field.texture);
  faceLayer.uniforms.uFieldOn.value = field.supported ? 1 : 0;
  const post = createPost();
  const tunnel = createTunnel(face);
  const drum = createDrum(options.drum, SCREENS);
  const signal = createSignalField(face);

  const scene = new Scene();
  scene.add(
    wall.mesh,
    faceLayer.mesh,
    tunnel.mesh,
    signal.mesh,
    ...drum.meshes,
  );
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
  let assembleClock = 0;
  let slowSince = 0;
  let statFrames = 0;
  let statWork = 0;
  let statStart = 0;

  const pointerTarget = new Vector2();
  const pointer = new Vector2();
  let hoverTarget = 0;
  let lookTarget = 0;
  let hover = 0;
  let aimX = 0;
  let aimY = 0;
  let yaw = { value: 0, velocity: 0 };
  let pitch = { value: 0, velocity: 0 };
  let journeyTarget = options.journey;
  let journey = options.journey;
  let speed = 0;
  let baseZ = 1000;
  const slotCenter = new Vector2();
  const wallFocus = new Vector2(0.5, 0.2);
  const ground = new Vector3();

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
    baseZ = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.position.z = baseZ;
    camera.far = baseZ * 7;
    camera.updateProjectionMatrix();
    wall.resize(width, height);
    tunnel.resize(width, height, baseZ);
    signal.resize(width, height);
    drum.resize(view);
    faceLayer.uniforms.uTunnel.value.set(
      tunnel.uniforms.uRadius.value,
      tunnel.uniforms.uLength.value,
      baseZ,
    );
    applySlot();
  }

  function applySlot() {
    const { uniforms } = faceLayer;
    uniforms.uSize.value.set(slot.width, slot.height);
    slotCenter.set(
      slot.x + slot.width / 2 - view.width / 2,
      view.height / 2 - (slot.y + slot.height / 2),
    );
    uniforms.uCenter.value.copy(slotCenter);
    const centerX = (slot.x + slot.width / 2) / view.width;
    wallFocus.set(centerX, slot.width / view.width / 2);
    post.uniforms.uSafe.value.set(
      centerX,
      (slot.width / 2 + 8) / view.width,
      20 / view.width,
      slot.headerBottom > 0 ? 1 - slot.headerBottom / view.height : 1.03,
    );
    post.uniforms.uCopyLine.value = 1 - slot.textBottom / view.height;
  }

  function update(dt: number) {
    time += dt;
    if (shown) {
      assembleClock += dt;
      assemble = Math.max(
        0,
        Math.min(1, (assembleClock - ASSEMBLE_HOLD_S) / ASSEMBLE_S),
      );
    }

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
      aimX * MAX_YAW * lookTarget + driftYaw,
      dt,
      34,
      11,
    );
    pitch = spring(
      pitch.value,
      pitch.velocity,
      -aimY * MAX_PITCH * lookTarget + driftPitch,
      dt,
      34,
      11,
    );

    // Native scroll stays in charge. The camera only eases toward it.
    const previous = journey;
    journey += (journeyTarget - journey) * (1 - Math.exp(-dt * JOURNEY_FOLLOW));
    if (Math.abs(journeyTarget - journey) < 0.0002) journey = journeyTarget;
    const rate = dt > 0 ? Math.abs(journey - previous) / dt : 0;
    speed += (rate / FAST_SCROLL - speed) * (1 - Math.exp(-dt * 10));
    const velocity = Math.min(1, speed);

    const leaving = smoothstep(0, 0.55, journey);
    const arrived = smoothstep(1.35, 1.9, journey);
    const act = actAt(journey);
    camera.position.z =
      baseZ *
      (1 + PULL_BACK * smoothstep(0, 1, journey) * (1 - arrived)) *
      act.distance;
    camera.position.x = view.width * act.pan;
    camera.rotation.x = act.tilt;

    const { uniforms } = faceLayer;
    const flow = Math.max(0, Math.min(1, (journey - 0.1) / 1));
    uniforms.uFlow.value = flow;
    uniforms.uCenter.value.copy(slotCenter).multiplyScalar(1 - leaving);
    faceLayer.mesh.visible = journey < 1.25;
    wall.mesh.visible = act.wall > 0;
    wall.uniforms.uFade.value = act.wall;
    wall.uniforms.uBands.value = act.bands;
    // Past the hero the wall's signal sweeps across the full width.
    if (journey > 2) wall.uniforms.uFocus.value.set(0.5, 1.4);
    else wall.uniforms.uFocus.value.copy(wallFocus);

    const fade = 1 - smoothstep(1.46, 1.74, journey);
    tunnel.mesh.visible = journey > 0.14 && fade > 0;
    tunnel.uniforms.uForm.value = smoothstep(0.16, 1, journey);
    tunnel.uniforms.uFade.value = fade;
    tunnel.uniforms.uTravel.value = journey * 0.55 + time * 0.012;
    tunnel.uniforms.uStretch.value = velocity;
    tunnel.uniforms.uTime.value = time;
    tunnel.uniforms.uCameraZ.value = camera.position.z;
    tunnel.setQuality(quality);
    drum.setQuality(quality);
    const { bone, curtain } = act;
    ground.copy(DARK_GROUND).lerp(BONE_GROUND, bone);
    drum.update(
      renderer,
      journey,
      velocity,
      time,
      dt,
      tunnel.uniforms.uLength.value * 0.7,
      ground,
    );
    post.uniforms.uBone.value = bone;

    signal.mesh.visible = act.stream > 0 || act.dots > 0 || curtain > 0;
    signal.uniforms.uStream.value = act.stream;
    signal.uniforms.uDots.value = act.dots;
    signal.uniforms.uCurtain.value = curtain;
    signal.uniforms.uTravel.value = journey * 0.5 + time * 0.012;
    signal.setQuality(quality);
    post.uniforms.uCurtain.value = curtain;
    post.uniforms.uStatic.value = act.noise;
    post.uniforms.uSlice.value = act.slice;
    post.uniforms.uRoll.value = act.roll;
    post.uniforms.uSqueeze.value = act.squeeze;
    post.uniforms.uCap.value = act.cap;
    // Changes with scroll, plus a slow drift well under three times a second.
    post.uniforms.uSeed.value =
      Math.floor(journey * 40) + Math.floor(time * 2) * 97;
    post.uniforms.uSafeAmount.value = 1 - smoothstep(0.78, 1, journey);

    const aspect = slot.height / slot.width;
    if (field.supported) {
      field.update(pointer, DISRUPT_FORCE * hover * (1 - leaving), dt, aspect);
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
    setJourney(value) {
      journeyTarget = value;
    },
    setDrum(next) {
      drum.setLayout(next);
    },
    loadTexture(index, url) {
      void drum.load(index, url);
    },
    setPointer(x, y, inside) {
      // Leaving isn't a cursor position, so the burst fades where it is.
      if (!inside) {
        hoverTarget = 0;
        lookTarget = 0;
        return;
      }
      const px = (x - slot.x) / slot.width - 0.5;
      const py = 0.5 - (y - slot.y) / slot.height;
      pointerTarget.set(px, py);
      if (hover < 0.01) pointer.copy(pointerTarget);
      lookTarget = 1;
      // The disruption acts around the face, and fades as the cursor moves away.
      const reach = Math.max(Math.abs(px), Math.abs(py));
      hoverTarget = 1 - Math.min(1, Math.max(0, reach - 0.56) / 0.3);
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
      tunnel.dispose();
      signal.dispose();
      drum.dispose();
      post.dispose();
      field.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
