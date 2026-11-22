import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { DISRUPT_RADIUS } from "./face-layer.ts";

const SIZE = { width: 72, height: 90 };

const vertex = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// A damped spring per cell: displacement in RG, velocity in BA.
const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uPointer;
uniform float uForce;
uniform float uDt;
uniform float uAspect;
uniform float uRadius;
in vec2 vUv;
out vec4 color;

const float STIFFNESS = 90.0;
const float DAMPING = 13.0;

void main() {
  vec4 state = texture(uPrev, vUv);
  vec2 away = (vUv - 0.5 - uPointer) * vec2(1.0, uAspect);
  float dist = length(away);
  // Zero at the cursor, strongest on a ring, so the center never pinches.
  float falloff = dist / uRadius * exp(0.5 - dist * dist / (2.0 * uRadius * uRadius));
  vec2 force = dist > 0.0001 ? away / dist * falloff * uForce : vec2(0.0);
  vec2 velocity = state.ba + (force - STIFFNESS * state.rg - DAMPING * state.ba) * uDt;
  color = vec4(state.rg + velocity * uDt, velocity);
}
`;

export function createField(renderer: WebGLRenderer) {
  const supported =
    renderer.extensions.has("EXT_color_buffer_float") ||
    renderer.extensions.has("EXT_color_buffer_half_float");

  // Bound when float targets aren't renderable, so the shader always has a sampler.
  const blank = new DataTexture(new Uint8Array(4), 1, 1, RGBAFormat);
  blank.needsUpdate = true;

  const makeTarget = () =>
    new WebGLRenderTarget(SIZE.width, SIZE.height, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      depthBuffer: false,
    });

  if (!supported) {
    return {
      supported,
      texture: blank,
      update() {
        /* The face falls back to direct cursor displacement. */
      },
      dispose() {
        blank.dispose();
      },
    };
  }

  let read = makeTarget();
  let write = makeTarget();
  const uniforms = {
    uPrev: { value: read.texture },
    uPointer: { value: new Vector2() },
    uForce: { value: 0 },
    uDt: { value: 1 / 60 },
    uAspect: { value: 1.25 },
    uRadius: { value: DISRUPT_RADIUS },
  };
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const camera = new OrthographicCamera();

  for (const target of [read, write]) {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }
  renderer.setRenderTarget(null);

  const field = {
    supported,
    texture: read.texture,
    update(pointer: Vector2, force: number, dt: number, aspect: number) {
      uniforms.uPrev.value = read.texture;
      uniforms.uPointer.value.copy(pointer);
      uniforms.uForce.value = force;
      uniforms.uDt.value = Math.min(dt, 1 / 30);
      uniforms.uAspect.value = aspect;
      renderer.setRenderTarget(write);
      renderer.render(scene, camera);
      [read, write] = [write, read];
      field.texture = read.texture;
    },
    dispose() {
      read.dispose();
      write.dispose();
      geometry.dispose();
      material.dispose();
      blank.dispose();
    },
  };
  return field;
}
