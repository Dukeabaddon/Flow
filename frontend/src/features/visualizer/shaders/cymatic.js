// Multi-mode field. Prompt spec drives dir / rotate / scale / warp / texture.
export const SHADER_SOURCE = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bass;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_complexity;
uniform float u_speed;
uniform float u_mode;
uniform vec2 u_dir;
uniform float u_rotate;
uniform float u_scale;
uniform float u_warp;
uniform float u_texture;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

float plusDither(vec2 frag) {
  vec2 cell = fract(frag / 3.5);
  float arm = min(abs(cell.x - 0.5), abs(cell.y - 0.5));
  return 1.0 - smoothstep(0.02, 0.14, arm);
}

float modeContour(vec2 p, vec2 drift, float bass, float cpx) {
  float n = fbm(p * (1.4 + cpx * 0.22) + drift);
  n += bass * 0.22;
  float lines = abs(fract(n * (7.0 + cpx)) - 0.5);
  return 1.0 - smoothstep(0.0, 0.11, lines);
}

float modeChladni(float r, float a, float t, float bass, float cpx) {
  float n = 2.0 + floor(cpx);
  float m = 1.0 + floor(cpx * 0.45);
  float ch = sin(n * a + t * 0.35) * sin(m * r * 14.0 - t - bass * 5.0);
  ch += sin((n + 1.0) * r * 9.0 - t * 0.8) * 0.4;
  float rings = abs(sin(r * (10.0 + cpx * 2.0) - t * 1.2 + bass));
  return 0.45 + 0.35 * ch + 0.25 * (1.0 - rings);
}

float modeWarp(vec2 p, vec2 drift, float bass, float cpx) {
  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(5.2, 1.3) - drift));
  return fbm(p * (1.1 + cpx * 0.12) + q * (1.3 + bass));
}

float modeScan(vec2 uv, vec2 p, vec2 drift, float t, float bass, float cpx) {
  float n = fbm(p * 2.2 + drift);
  float scan = sin((uv.y + t * 0.12) * (36.0 + cpx * 10.0));
  float grain = hash(uv * 80.0 + t) * 0.35;
  return n * 0.65 + scan * 0.12 + grain + bass * 0.18;
}

float modeKaleido(float r, float a, float t, float bass, float cpx) {
  float pattern = sin(r * cpx * 10.0 - t) * cos(a * 3.0 + bass * 5.0);
  pattern += sin(r * 18.0 - t * 2.0) * 0.3;
  pattern += cos(a * 5.0 + t) * r * 0.5;
  return 0.5 + 0.5 * pattern;
}

float sampleMode(float mode, vec2 uv, vec2 p, vec2 drift, float r, float a, float t, float bass, float cpx) {
  float m = mod(mode, 5.0);
  if (m < 1.0) return modeContour(p, drift, bass, cpx);
  if (m < 2.0) return modeChladni(r, a, t, bass, cpx);
  if (m < 3.0) return modeWarp(p, drift, bass, cpx);
  if (m < 4.0) return modeScan(uv, p, drift, t, bass, cpx);
  return modeKaleido(r, a, t, bass, cpx);
}

float textureMul(float tex, vec2 frag, vec2 uv, float t, float pat) {
  float k = mod(tex, 4.0);
  float dither = plusDither(frag);
  float grain = (hash(frag + t * 11.0) - 0.5) * 0.16;
  float scan = 0.85 + 0.15 * sin((uv.y + t * 0.2) * 90.0);
  if (k < 1.0) return 0.5 + dither * (0.55 + pat * 0.35);
  if (k < 2.0) return 0.75 + grain;
  if (k < 3.0) return scan * (0.7 + dither * 0.3);
  return 0.92 + grain * 0.25;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  float t = u_time * u_speed;
  float ca = cos(u_rotate);
  float sa = sin(u_rotate);
  vec2 p0 = (uv - 0.5) * aspect * max(u_scale, 0.15);
  p0 = vec2(ca * p0.x - sa * p0.y, sa * p0.x + ca * p0.y);
  // Keep origin on screen center. Dir only phases the field.
  vec2 drift = u_dir * t * 0.35;
  vec2 warpOff = vec2(fbm(p0 + 3.1), fbm(p0 + 8.4))
    - vec2(fbm(vec2(3.1, 0.0)), fbm(vec2(8.4, 0.0)));
  vec2 p = p0 + warpOff * u_warp * 0.42;

  float r = length(p0);
  float a = atan(p0.y, p0.x);

  float m0 = floor(u_mode);
  float m1 = mod(m0 + 1.0, 5.0);
  float blend = fract(u_mode);
  float pat = mix(
    sampleMode(m0, uv, p, drift, r, a, t, u_bass, u_complexity),
    sampleMode(m1, uv, p, drift, r, a, t, u_bass, u_complexity),
    blend
  );

  vec3 color = mix(u_color1, u_color2, clamp(pat, 0.0, 1.0));

  float t0 = floor(u_texture);
  float t1 = mod(t0 + 1.0, 4.0);
  float tm = mix(
    textureMul(t0, gl_FragCoord.xy, uv, t, pat),
    textureMul(t1, gl_FragCoord.xy, uv, t, pat),
    fract(u_texture)
  );
  color *= tm;
  color += (hash(gl_FragCoord.xy + t * 3.0) - 0.5) * 0.04;

  float glow = exp(-r * 2.2) * (0.18 + u_bass * 0.4);
  color += u_color1 * glow;

  float vignette = mix(0.88, 1.0, exp(-r * r * 0.28));
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}
`;
