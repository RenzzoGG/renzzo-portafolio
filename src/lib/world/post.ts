import {
  BufferAttribute,
  BufferGeometry,
  GLSL3,
  Mesh,
  OrthographicCamera,
  RawShaderMaterial,
  Scene,
  Vector2,
  Vector4,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * The single analog setting: 0 is clean, 1 is heavy. Medium by design.
 * It covers scanlines, grain, vignette, barrel, chroma and signal cuts.
 */
export const ANALOG_INTENSITY = 0.6;

const vertex = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uQuality;
uniform vec4 uSafe; // slot center x, slot half width, fade width, header line (all in UV)
uniform float uSafeAmount;
uniform float uCopyLine; // bottom of the hero text, in UV
uniform float uBone;
in vec2 vUv;
out vec4 color;

const vec3 BASE = vec3(0.043, 0.039, 0.047);
const vec3 BONE = vec3(0.949, 0.933, 0.918);

float random(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float amount = uIntensity;
  vec2 fromCenter = vUv - 0.5;
  vec2 uv = 0.5 + fromCenter * (1.0 + 0.16 * amount * (1.0 - uBone) * dot(fromCenter, fromCenter));

  // Occasional horizontal signal cuts: a thin band slips sideways for a moment.
  float window = floor(uTime * 7.0);
  if (random(vec2(window, 3.0)) > 0.955) {
    float center = random(vec2(window, 7.0));
    float height = 0.012 + random(vec2(window, 11.0)) * 0.05;
    float band = 1.0 - smoothstep(height * 0.6, height, abs(uv.y - center));
    float slip = (random(vec2(floor(uv.y * 90.0), window)) - 0.5) * 0.05;
    uv.x += band * slip * amount * 1.6 * (1.0 - uBone);
  }

  vec3 scene;
  if (uQuality > 0.5) {
    vec2 chroma = fromCenter * 0.009 * amount + vec2(0.0009 * amount, 0.0);
    scene = vec3(
      texture(uScene, uv + chroma).r,
      texture(uScene, uv).g,
      texture(uScene, uv - chroma).b
    );
  } else {
    scene = texture(uScene, uv).rgb;
  }
  float cover = texture(uScene, uv).a;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    scene = vec3(0.0);
    cover = 0.0;
  }

  // The ground shifts to bone behind the screens. Dark keeps the hero's look.
  vec3 ground = mix(BASE, BONE, uBone) * (1.0 - cover) + scene;
  vec3 result = mix(BASE + scene, ground, step(0.0001, uBone));
  float scan = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.5708);
  // Project screens must stay readable, so bone softens the tube effects.
  result *= 1.0 - 0.34 * amount * (1.0 - scan) * (1.0 - 0.62 * uBone);
  float vignette = smoothstep(0.92, 0.28, length(fromCenter * vec2(1.0, 1.12)));
  result *= mix(1.0, vignette, 0.9 * amount * (1.0 - 0.8 * uBone));
  result += (random(vUv * uResolution + uTime * 60.0) - 0.5) * 0.05 * amount;

  // HTML text sits over these areas, so the scene stays dark enough for AA.
  float beside = smoothstep(uSafe.y, uSafe.y + uSafe.z, abs(vUv.x - uSafe.x));
  float header = smoothstep(uSafe.w - 0.02, uSafe.w, vUv.y);
  float rows = smoothstep(uCopyLine - 0.06, uCopyLine, vUv.y);
  float safe = max(beside * rows, header) * uSafeAmount;
  result = mix(result, min(result, vec3(0.085)), safe);

  // Bone stays the exact page color, so the HTML panels sit on it with no seam.
  result = mix(result, ground, uBone * (1.0 - cover));

  color = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

export function createPost() {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  const uniforms = {
    uScene: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uIntensity: { value: ANALOG_INTENSITY },
    uQuality: { value: 1 },
    uSafe: { value: new Vector4(0.5, 0.25, 0.04, 0.92) },
    uSafeAmount: { value: 1 },
    uCopyLine: { value: 0 },
    uBone: { value: 0 },
  };
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

  return {
    uniforms,
    render(renderer: WebGLRenderer, texture: Texture) {
      uniforms.uScene.value = texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
