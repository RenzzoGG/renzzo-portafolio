import {
  CustomBlending,
  GLSL3,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  BufferAttribute,
  Mesh,
  OneFactor,
  RawShaderMaterial,
  Vector2,
  type Texture,
} from "three";
import type { LedFace } from "../face/decode.ts";

/** Halftone dot radius per styled size, in grid pitches. Matches the pipeline. */
const RADII = [0.13, 0.25, 0.36, 0.48];

export const DISRUPT_RADIUS = 0.06;

const vertex = /* glsl */ `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform vec2 uPointer;
uniform vec2 uTilt;
uniform float uHover;
uniform float uAssemble;
uniform float uTime;
uniform float uFieldOn;
uniform float uRadius;
uniform sampler2D uField;
in vec3 position;
in vec2 aGrid;
in float aStyled;
in float aFocused;
in float aDepth;
out vec2 vQuad;
out float vDot;
out float vStreak;
out float vSplit;
out float vEnergy;
out float vLight;

float hash(float n) { return fract(sin(n * 91.17) * 43758.5453); }

void main() {
  float aspect = uSize.y / uSize.x;
  vec2 fromPointer = (aGrid - uPointer) * vec2(1.0, aspect);
  float dist = length(fromPointer);

  // The GPU spring field holds the displacement. Without it, follow the cursor.
  vec2 push = texture(uField, aGrid + 0.5).rg * uFieldOn;
  if (uFieldOn < 0.5 && dist > 0.0001) {
    float falloff = dist / uRadius * exp(0.5 - dist * dist / (2.0 * uRadius * uRadius));
    push = fromPointer / dist * falloff * uHover * 0.03;
  }
  // Each dot reacts a little differently, so the burst never looks like a grid.
  float seed = hash(aGrid.x * 311.7 + aGrid.y * 173.3);
  push *= 0.58 + seed * 0.84;
  float turn = (seed - 0.5) * 0.7;
  push = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * push;
  float amount = length(push);
  vec2 dir = amount > 0.0001 ? push / amount : vec2(1.0, 0.0);
  float energy = clamp(amount * 42.0, 0.0, 1.0);

  // Just outside the disruption, dots sharpen to the focused state.
  float focus = uHover * (1.0 - energy)
    * smoothstep(uRadius * 2.4, uRadius * 3.0, dist)
    * (1.0 - smoothstep(uRadius * 3.4, uRadius * 4.4, dist));
  float focusedRadius = 0.1 + 0.39 * pow(aFocused, 0.6);
  float dotRadius = mix(aStyled, focusedRadius, focus);
  float light = mix(1.0, 0.55 + 0.45 * aFocused, focus);

  vec2 pitch = uSize / vec2(90.0, 112.0);
  float unit = min(pitch.x, pitch.y);
  // A dot thins as it stretches, keeping gaps of dark between the streaks.
  float radius = dotRadius * unit * mix(1.0, 0.44, energy);
  float streak = min(amount * uSize.x * 0.34, unit * (1.2 + seed * 1.8));
  float split = energy * unit * 0.4;
  float pad = unit * 0.2 + split;

  // The quad stretches along the push, so a dot becomes a streak.
  vec2 half_ = vec2(radius + streak + pad, radius + pad);
  vec2 local = position.xy * half_;
  vec2 offset = dir * local.x + vec2(-dir.y, dir.x) * local.y;

  vec3 point = vec3(aGrid * uSize + push * uSize.x, 0.0);
  point.z = (aDepth - 0.5) * uSize.x * 0.24 + amount * uSize.x * 2.0;

  // A short glitch assemble: rows start out of register and snap into place.
  float rest = 1.0 - uAssemble;
  if (rest > 0.0) {
    float band = floor((aGrid.y + 0.5) * 18.0);
    float tick = floor(uTime * 16.0);
    point.x += (hash(band + tick) - 0.5) * rest * rest * uSize.x * 0.42;
    point.z += (hash(band * 3.1) - 0.5) * rest * uSize.x * 0.18;
    light *= 1.0 + rest * 0.35;
  }

  float cy = cos(uTilt.x), sy = sin(uTilt.x);
  float cx = cos(uTilt.y), sx = sin(uTilt.y);
  point = vec3(cy * point.x + sy * point.z, point.y, -sy * point.x + cy * point.z);
  point = vec3(point.x, cx * point.y - sx * point.z, sx * point.y + cx * point.z);

  vQuad = local;
  vDot = radius;
  vStreak = streak;
  vSplit = split;
  vEnergy = energy;
  vLight = light;
  gl_Position = projectionMatrix * modelViewMatrix
    * vec4(uCenter + point.xy + offset, point.z, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
in vec2 vQuad;
in float vDot;
in float vStreak;
in float vSplit;
in float vEnergy;
in float vLight;
out vec4 color;

const vec3 SIGNAL = vec3(0.761, 0.114, 0.227);
const vec3 GLOW = vec3(1.0, 0.231, 0.361);
const vec3 WHITE = vec3(0.949, 0.933, 0.918);

float capsule(vec2 q, float edge) {
  float d = length(vec2(max(abs(q.x) - vStreak, 0.0), q.y)) - vDot;
  return 1.0 - smoothstep(-edge, edge, d);
}

void main() {
  float edge = max(fwidth(vQuad.y), 0.001) * 0.75;
  float core = capsule(vQuad, edge);
  vec3 lit = GLOW * core;
  if (vEnergy > 0.001) {
    // The chromatic split: crimson trails, pink holds, white leads.
    vec2 shift = vec2(vSplit * 0.6, vSplit * 0.45);
    float behind = capsule(vQuad + shift, edge);
    float ahead = capsule(vQuad - shift, edge);
    float lead = smoothstep(0.25, 0.9, vQuad.x / (vStreak + vDot));
    vec3 split = max(max(SIGNAL * behind, GLOW * core),
      WHITE * ahead * lead * 0.7 * step(0.55, vLight));
    lit = mix(lit, split, vEnergy);
  }
  color = vec4(lit * vLight, 1.0);
}
`;

export function createFaceLayer(face: LedFace, field: Texture) {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const grid = new Float32Array(face.count * 2);
  const styled = new Float32Array(face.count);
  const focused = new Float32Array(face.count);
  const depth = new Float32Array(face.count);
  for (let dot = 0; dot < face.count; dot += 1) {
    grid[dot * 2] = ((face.column[dot] ?? 0) + 0.5) / face.cols - 0.5;
    grid[dot * 2 + 1] = 0.5 - ((face.row[dot] ?? 0) + 0.5) / face.rows;
    styled[dot] = RADII[face.styled[dot] ?? 0] ?? 0;
    focused[dot] = (face.focused[dot] ?? 0) / 15;
    depth[dot] = (face.depth[dot] ?? 0) / 255;
  }
  geometry.setAttribute("aGrid", new InstancedBufferAttribute(grid, 2));
  geometry.setAttribute("aStyled", new InstancedBufferAttribute(styled, 1));
  geometry.setAttribute("aFocused", new InstancedBufferAttribute(focused, 1));
  geometry.setAttribute("aDepth", new InstancedBufferAttribute(depth, 1));
  geometry.instanceCount = face.count;

  const uniforms = {
    uCenter: { value: new Vector2() },
    uSize: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2() },
    uTilt: { value: new Vector2() },
    uHover: { value: 0 },
    uAssemble: { value: 0 },
    uTime: { value: 0 },
    uFieldOn: { value: 1 },
    uRadius: { value: DISRUPT_RADIUS },
    uField: { value: field },
  };
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // Overlapping streaks keep the brightest value instead of adding to white.
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
