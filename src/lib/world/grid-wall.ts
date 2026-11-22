import { GLSL3, Mesh, PlaneGeometry, RawShaderMaterial, Vector2 } from "three";

const vertex = /* glsl */ `
precision highp float;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform vec2 uSpan;
uniform vec2 uShift;
uniform float uBend;
in vec3 position;
out vec2 vWall;

void main() {
  vec2 wall = position.xy * uSpan;
  float theta = wall.x / uBend;
  // A concave CRT wall: its edges curve toward the viewer.
  vec3 point = vec3(uBend * sin(theta), wall.y, uBend * (1.0 - cos(theta)) - uBend * 0.42);
  point.xy += uShift;
  vWall = vec2(theta * uBend, wall.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uCell;
uniform float uWidth;
uniform vec2 uFocus; // face center and half width, in screen UV
in vec2 vWall;
out vec4 color;

float line(float value) {
  float width = fwidth(value);
  float cell = abs(fract(value - 0.5) - 0.5);
  return 1.0 - smoothstep(0.0, max(width * 1.2, 0.012), cell);
}

void main() {
  vec2 grid = vWall / uCell;
  float lines = max(line(grid.x), line(grid.y));
  // A slow band of signal travels down the wall, so it's never fully still.
  float sweep = fract(grid.y * 0.045 + uTime * 0.07);
  // It lives behind the face and dissolves before it reaches the text columns.
  float near = 1.0 - smoothstep(uFocus.y * 0.5, uFocus.y * 1.02, abs(gl_FragCoord.x / uWidth - uFocus.x));
  float pulse = smoothstep(0.7, 1.0, sweep) * near;
  vec3 tint = mix(vec3(0.15, 0.11, 0.135), vec3(0.42, 0.075, 0.14), pulse);
  color = vec4(tint * lines * (0.7 + pulse * 0.3), 1.0);
}
`;

export function createGridWall() {
  const geometry = new PlaneGeometry(1, 1, 56, 1);
  const uniforms = {
    uSpan: { value: new Vector2(1, 1) },
    uShift: { value: new Vector2() },
    uBend: { value: 1000 },
    uTime: { value: 0 },
    uCell: { value: 64 },
    uWidth: { value: 1 },
    uFocus: { value: new Vector2(0.5, 0.2) },
  };
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  return {
    mesh,
    uniforms,
    resize(width: number, height: number) {
      uniforms.uSpan.value.set(width * 1.5, height * 1.7);
      uniforms.uBend.value = width * 0.72;
      uniforms.uCell.value = Math.max(44, Math.round(width / 22));
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
