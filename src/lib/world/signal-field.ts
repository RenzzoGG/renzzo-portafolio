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
  Vector2,
} from "three";
import type { LedFace } from "../face/decode.ts";

/**
 * One flat grid of face dots with two looks: rows of signal that read like
 * code (About), and a full pixel curtain (Contact). Dots never pass crimson.
 */
const COLUMNS = 168;
const ROWS = 108;
const LOW_QUALITY_STRIDE = 2;
const RADII = [0.13, 0.25, 0.36, 0.48];

const vertex = /* glsl */ `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec2 uView;
uniform float uStream;
uniform float uCurtain;
uniform float uTravel;
in vec3 position;
in vec2 aCell;
in float aSize;
out vec2 vQuad;
out float vDot;
out float vStreak;
out float vLight;

const float ROWS = ${ROWS.toFixed(1)};

float hash(float n) { return fract(sin(n * 91.17) * 43758.5453); }

void main() {
  float pitch = uView.x / ${COLUMNS.toFixed(1)};
  float grid = floor(aCell.y * ROWS);
  float row = floor(grid / 2.0);
  float indent = floor(hash(row) * 5.0) * 0.045;
  float span = 0.16 + hash(row + 7.0) * 0.62;
  float token = floor(aCell.x * 34.0);
  float gap = step(0.78, hash(token + row * 3.0));
  float inLine = step(indent, aCell.x) * step(aCell.x, indent + span) * (1.0 - gap);
  float onRow = 1.0 - step(0.5, mod(grid, 2.0));
  float stream = inLine * onRow * uStream * (0.2 + aSize * 0.8);
  vec2 streamAt = vec2(aCell.x - 0.5, fract(aCell.y + uTravel) - 0.5) * uView * vec2(1.0, 1.04);

  // The curtain falls from the top, and each dot drops into its place.
  float delay = (1.0 - aCell.y) * 0.58 + hash(aCell.x * 97.0 + aCell.y * 41.0) * 0.08;
  float land = smoothstep(delay, delay + 0.34, uCurtain);
  vec2 curtainAt = (aCell - 0.5) * uView;
  curtainAt.y += (1.0 - land) * (1.0 - land) * uView.y * 0.42;

  float light = max(stream * (1.0 - land), land);
  if (light < 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec2 place = mix(streamAt, curtainAt, land);
  float radius = mix(pitch * 0.16, pitch * (0.2 + aSize * 0.58), land);
  float streak = pitch * 0.52 * (1.0 - land);
  vec2 local = position.xy * vec2(radius + streak + 1.5, radius + 1.5);

  vQuad = local;
  vDot = radius;
  vStreak = streak;
  vLight = mix(light * 0.62, 1.0, land);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(place + local, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
in vec2 vQuad;
in float vDot;
in float vStreak;
in float vLight;
out vec4 color;

const vec3 SIGNAL = vec3(0.761, 0.114, 0.227);

void main() {
  float edge = max(fwidth(vQuad.y), 0.001) * 0.75;
  float d = length(vec2(max(abs(vQuad.x) - vStreak, 0.0), vQuad.y)) - vDot;
  float core = 1.0 - smoothstep(-edge, edge, d);
  vec3 lit = SIGNAL * core * min(vLight, 1.0);
  color = vec4(lit, max(lit.r, max(lit.g, lit.b)));
}
`;

export function createSignalField(face: LedFace) {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const total = COLUMNS * ROWS;
  const cells = new Float32Array(total * 2);
  const sizes = new Float32Array(total);
  // Every other column comes first, so low quality thins the grid evenly.
  const order = Array.from({ length: COLUMNS }, (_, index) => index).sort(
    (a, b) => (a % LOW_QUALITY_STRIDE) - (b % LOW_QUALITY_STRIDE) || a - b,
  );
  let slot = 0;
  for (const column of order) {
    for (let row = 0; row < ROWS; row += 1) {
      cells[slot * 2] = (column + 0.5) / COLUMNS;
      cells[slot * 2 + 1] = (row + 0.5) / ROWS;
      sizes[slot] = RADII[face.styled[slot % face.count] ?? 0] ?? 0;
      slot += 1;
    }
  }
  geometry.setAttribute("aCell", new InstancedBufferAttribute(cells, 2));
  geometry.setAttribute("aSize", new InstancedBufferAttribute(sizes, 1));
  geometry.instanceCount = total;

  const uniforms = {
    uView: { value: new Vector2(1, 1) },
    uStream: { value: 0 },
    uCurtain: { value: 0 },
    uTravel: { value: 0 },
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
    resize(width: number, height: number) {
      uniforms.uView.value.set(width, height);
    },
    setQuality(quality: number) {
      geometry.instanceCount =
        quality > 0.5 ? total : Math.ceil(total / LOW_QUALITY_STRIDE);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
