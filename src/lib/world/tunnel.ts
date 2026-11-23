import {
  BufferAttribute,
  CustomBlending,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  Mesh,
  OneFactor,
  RawShaderMaterial,
} from "three";
import type { LedFace } from "../face/decode.ts";

/** The wall reuses the face's dots this many times, at this many per ring. */
const REPEATS = 5;
const AROUND = 180;
const RADII = [0.13, 0.25, 0.36, 0.48];

const vertex = /* glsl */ `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uRadius;
uniform float uLength;
uniform float uCameraZ;
uniform float uTravel;
uniform float uForm;
uniform float uFade;
uniform float uStretch;
uniform float uDot;
uniform float uTime;
in vec3 position;
in vec2 aCell;
in float aSize;
out vec2 vQuad;
out float vDot;
out float vStreak;
out float vLight;
out float vPulse;

void main() {
  float angle = aCell.x * 6.28318;
  float along = fract(aCell.y - uTravel);
  // The tunnel builds from its far end toward the camera.
  float show = smoothstep(0.0, 0.2, uForm * 1.2 - (1.0 - along) * 0.95);
  float ends = smoothstep(0.0, 0.07, along) * (1.0 - smoothstep(0.7, 1.0, along));
  float pulse = pow(0.5 + 0.5 * sin(along * 30.0 + uTime * 2.6), 6.0);
  float light = show * ends * uFade * (0.34 + aSize * 0.7 + pulse * 0.7);
  if (light < 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec3 point = vec3(cos(angle) * uRadius, sin(angle) * uRadius,
    uCameraZ - 60.0 - along * uLength);
  vec2 dir = vec2(cos(angle), sin(angle));
  float radius = aSize * uDot;
  float streak = uStretch * uDot * 5.0;
  vec2 half_ = vec2(radius + streak + 1.5, radius + 1.5);
  vec2 local = position.xy * half_;
  vec2 offset = dir * local.x + vec2(-dir.y, dir.x) * local.y;

  vQuad = local;
  vDot = radius;
  vStreak = streak;
  vLight = light;
  vPulse = pulse;
  gl_Position = projectionMatrix * modelViewMatrix
    * vec4(point.xy + offset, point.z, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
in vec2 vQuad;
in float vDot;
in float vStreak;
in float vLight;
in float vPulse;
out vec4 color;

const vec3 SIGNAL = vec3(0.761, 0.114, 0.227);
const vec3 GLOW = vec3(1.0, 0.231, 0.361);

void main() {
  float edge = max(fwidth(vQuad.y), 0.001) * 0.75;
  float d = length(vec2(max(abs(vQuad.x) - vStreak, 0.0), vQuad.y)) - vDot;
  float core = 1.0 - smoothstep(-edge, edge, d);
  vec3 lit = mix(SIGNAL, GLOW, vPulse) * core * min(vLight, 1.0);
  color = vec4(lit, max(lit.r, max(lit.g, lit.b)));
}
`;

export function createTunnel(face: LedFace) {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  // A full LED wall: each light takes its size from a face dot, in scan order.
  const rings = Math.floor((face.count * REPEATS) / AROUND);
  const total = rings * AROUND;
  const cells = new Float32Array(total * 2);
  const sizes = new Float32Array(total);
  for (let slot = 0; slot < total; slot += 1) {
    const around = slot % AROUND;
    const order = Math.floor(slot / AROUND);
    // Even rings come first, so low quality thins the wall evenly.
    const half = Math.ceil(rings / 2);
    const ring = order < half ? order * 2 : (order - half) * 2 + 1;
    cells[slot * 2] = (around + (ring % 2) * 0.5) / AROUND;
    cells[slot * 2 + 1] = ring / rings;
    sizes[slot] = RADII[face.styled[slot % face.count] ?? 0] ?? 0;
  }
  geometry.setAttribute("aCell", new InstancedBufferAttribute(cells, 2));
  geometry.setAttribute("aSize", new InstancedBufferAttribute(sizes, 1));
  geometry.instanceCount = total;

  const uniforms = {
    uRadius: { value: 900 },
    uLength: { value: 8000 },
    uCameraZ: { value: 1000 },
    uTravel: { value: 0 },
    uForm: { value: 0 },
    uFade: { value: 0 },
    uStretch: { value: 0 },
    uDot: { value: 14 },
    uTime: { value: 0 },
  };
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;

  return {
    mesh,
    uniforms,
    resize(width: number, height: number, cameraZ: number) {
      uniforms.uRadius.value = Math.hypot(width, height) * 0.54;
      uniforms.uLength.value = cameraZ * 4.5;
      uniforms.uDot.value = height * 0.016;
    },
    setQuality(quality: number) {
      geometry.instanceCount =
        quality > 0.5 ? total : Math.ceil(rings / 2) * AROUND;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
