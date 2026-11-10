/** Shared GLSL building blocks. Everything here is stateless and deterministic. */

export const glsl = String.raw;

export const GLSL_NOISE = glsl`
#define TAU 6.28318530718

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = m * p;
    a *= 0.5;
  }
  return s;
}
/* Distance to the nearest feature point (F1), roughly 0..1. */
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      d = min(d, length(g + o - f));
    }
  }
  return d;
}
mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}
`;

/** The saturated accent palette shared by every scene's light effects. */
export const GLSL_PALETTE = glsl`
vec3 eidolonAccent(float h) {
  h = fract(h) * 7.0;
  if (h < 1.0) return vec3(1.00, 0.42, 0.04); /* orange  */
  if (h < 2.0) return vec3(1.00, 0.80, 0.16); /* amber   */
  if (h < 3.0) return vec3(1.00, 0.12, 0.50); /* magenta */
  if (h < 4.0) return vec3(0.08, 0.80, 1.00); /* cyan    */
  if (h < 5.0) return vec3(0.50, 1.00, 0.18); /* acid    */
  if (h < 6.0) return vec3(0.52, 0.26, 1.00); /* violet  */
  return vec3(1.00, 0.96, 0.86);              /* cream   */
}
`;
