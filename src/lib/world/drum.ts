import {
  GLSL3,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  RawShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from "three";
import type { DrumLayout, View } from "./protocol.ts";
import { smoothstep } from "./journey.ts";

const STEP = 0.74;
const SCREEN_ASPECT = 1.6;
const REVEAL_PER_SECOND = 3.2;

const vertex = /* glsl */ `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec3 uCenter;
uniform vec2 uSize;
uniform float uTilt;
uniform float uBend;
in vec3 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vec3 point = vec3(position.xy * uSize, 0.0);
  float across = position.x * 2.0;
  // A CRT bulge: the middle comes forward and the sides fall back.
  point.z = uBend * (1.0 - across * across);
  float c = cos(uTilt), s = sin(uTilt);
  point = vec3(point.x, c * point.y - s * point.z, s * point.y + c * point.z);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point + uCenter, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uAccent;
uniform vec2 uCover;
uniform float uReady;
uniform float uVelocity;
uniform float uTime;
uniform float uFocus;
uniform float uAlpha;
uniform vec3 uGround;
in vec2 vUv;
out vec4 color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

float box(vec2 p, vec2 size, float radius) {
  vec2 q = abs(p) - size + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec3 picture(vec2 uv) {
  vec2 at = vec2(uv.x, 1.0 - uv.y) * uCover;
  // Until the texture lands, the tube shows a dim test pattern in its accent.
  float bars = step(0.5, fract(uv.x * 7.0)) * 0.05 + 0.05;
  vec3 idle = vec3(0.082, 0.075, 0.09) + uAccent * bars;
  return mix(idle, texture(uMap, at).rgb, uReady);
}

void main() {
  vec2 q = (vUv - 0.5) * vec2(1.6, 1.0);
  float d = box(q, vec2(0.8, 0.5), 0.028);
  float edge = max(fwidth(d), 0.0008);
  float mask = 1.0 - smoothstep(-edge, edge, d);
  if (mask * uAlpha < 0.003) discard;

  // VHS tracking: scroll speed tears the rows sideways and splits the color.
  float v = clamp(uVelocity, 0.0, 1.0);
  float band = floor(vUv.y * 54.0);
  float tick = floor(uTime * 20.0);
  float tear = (hash(vec2(band, tick)) - 0.5) * 0.055 * v * v;
  float roll = sin(vUv.y * 11.0 + uTime * 5.0) * 0.006 * v;
  vec2 uv = vec2(vUv.x + tear + roll, vUv.y);
  float split = 0.0012 + v * 0.011;
  vec3 tube = vec3(
    picture(uv + vec2(split, 0.0)).r,
    picture(uv).g,
    picture(uv - vec2(split, 0.0)).b
  );

  tube += (hash(vUv * 900.0 + uTime) - 0.5) * (0.022 + v * 0.05);
  // A tracking line drifts down the tube, as a worn tape does.
  float drift = fract(uTime * 0.09);
  tube += smoothstep(0.018, 0.0, abs(vUv.y - (1.0 - drift))) * 0.09;
  float tubeEdge = smoothstep(0.92, 0.42, length(q / vec2(0.8, 0.5)));
  tube *= mix(0.88, 1.0, tubeEdge);
  // Neighbors recede into the ground, so the active screen always leads.
  tube = mix(uGround, tube, mix(0.42, 1.0, uFocus));

  float frame = smoothstep(-0.009, -0.003, d);
  tube = mix(tube, uAccent, frame);
  color = vec4(clamp(tube, 0.0, 1.0), mask * uAlpha);
}
`;

const smootherstep = (value: number) =>
  value * value * value * (value * (value * 6 - 15) + 10);

/** Holds on each project and turns quickly between them. */
function dwell(position: number) {
  const whole = Math.floor(position);
  return whole + smootherstep(position - whole);
}

export function createDrum(initial: DrumLayout, count: number) {
  const geometry = new PlaneGeometry(1, 1, 28, 12);
  const blank = new Texture();
  let layout = initial;
  let viewWidth = 1;
  let quality = 1;
  let disposed = false;
  const requested = new Set<number>();
  const pending: { index: number; bitmap: ImageBitmap }[] = [];

  const screens = Array.from({ length: count }, () => {
    const uniforms = {
      uMap: { value: blank },
      uCenter: { value: new Vector3() },
      uSize: { value: new Vector2(1, 1) },
      uAccent: { value: new Vector3(0.761, 0.114, 0.227) },
      uCover: { value: new Vector2(1, 1) },
      uTilt: { value: 0 },
      uBend: { value: 20 },
      uReady: { value: 0 },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uGround: { value: new Vector3() },
      uAlpha: { value: 0 },
    };
    const material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    return { mesh, material, uniforms, texture: null as Texture | null };
  });

  const applyAccents = () => {
    screens.forEach((screen, index) => {
      const accent = layout.accents[index];
      if (accent) screen.uniforms.uAccent.value.set(...accent);
    });
  };
  applyAccents();

  /** Uploads at most one texture per frame, so a landing never drops frames. */
  function upload(renderer: WebGLRenderer) {
    const next = pending.shift();
    const screen = next && screens[next.index];
    if (!next || !screen) return;
    const texture = new Texture(next.bitmap);
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.needsUpdate = true;
    renderer.initTexture(texture);
    const aspect = next.bitmap.width / next.bitmap.height;
    screen.uniforms.uCover.value.set(
      aspect > SCREEN_ASPECT ? SCREEN_ASPECT / aspect : 1,
      aspect > SCREEN_ASPECT ? 1 : aspect / SCREEN_ASPECT,
    );
    screen.uniforms.uMap.value = texture;
    screen.texture = texture;
    next.bitmap.close();
  }

  return {
    meshes: screens.map((screen) => screen.mesh),
    resize(view: View) {
      viewWidth = view.width;
    },
    setLayout(next: DrumLayout) {
      layout = next;
      applyAccents();
    },
    setQuality(next: number) {
      quality = next;
    },
    /** Fetches and decodes off the render path. A failure keeps the pattern. */
    async load(index: number, url: string) {
      if (requested.has(index) || !screens[index]) return;
      requested.add(index);
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const bitmap = await createImageBitmap(await response.blob());
        if (disposed) bitmap.close();
        else pending.push({ index, bitmap });
      } catch {
        requested.delete(index);
      }
    },
    update(
      renderer: WebGLRenderer,
      journey: number,
      velocity: number,
      time: number,
      dt: number,
      depth: number,
      ground: Vector3,
    ) {
      upload(renderer);
      const enter = smoothstep(1.42, 2, journey);
      const leave = smoothstep(5.05, 5.75, journey);
      const visible = enter > 0.001 && leave < 0.999;
      const settled = Math.max(0, Math.min(count - 1, journey - 2));
      const position =
        dwell(settled) - (1 - enter) * 0.85 + Math.max(0, journey - 5) * 1.1;

      const width = layout.width;
      const height = width / SCREEN_ASPECT;
      const radius = height * 1.46;
      const x = layout.x - viewWidth / 2;

      screens.forEach((screen, index) => {
        const theta = (index - position) * STEP;
        const show = visible && Math.abs(theta) < 1.3;
        screen.mesh.visible = show;
        const { uniforms } = screen;
        if (uniforms.uReady.value < 1 && screen.texture) {
          uniforms.uReady.value = Math.min(
            1,
            uniforms.uReady.value + dt * REVEAL_PER_SECOND,
          );
        }
        if (!show) return;
        uniforms.uSize.value.set(width, height);
        uniforms.uBend.value = width * 0.045;
        uniforms.uTilt.value = theta;
        uniforms.uCenter.value.set(
          x,
          -Math.sin(theta) * radius,
          radius * (Math.cos(theta) - 1) - (1 - enter) * depth,
        );
        uniforms.uVelocity.value = quality > 0.5 ? velocity : velocity * 0.4;
        uniforms.uTime.value = time;
        uniforms.uFocus.value = 1 - smoothstep(0.08, STEP, Math.abs(theta));
        uniforms.uAlpha.value = smoothstep(1.56, 1.72, journey) * (1 - leave);
        uniforms.uGround.value.copy(ground);
        // No depth buffer: the farthest screen draws first.
        screen.mesh.renderOrder = 10 - Math.abs(theta);
      });
    },
    dispose() {
      disposed = true;
      for (const item of pending) item.bitmap.close();
      pending.length = 0;
      for (const screen of screens) {
        screen.texture?.dispose();
        screen.material.dispose();
      }
      blank.dispose();
      geometry.dispose();
    },
  };
}
