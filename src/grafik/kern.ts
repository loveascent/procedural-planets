// Gemeinsame Filterkerne (WGSL-Text), nur einmal im Code.
// Kubische Faltung nach Keys; Formel und a = −0,5 (= Catmull-Rom): https://en.wikipedia.org/wiki/Bicubic_interpolation
//   W(x) = (a+2)|x|³ − (a+3)|x|² + 1           für |x| ≤ 1
//        = a|x|³ − 5a|x|² + 8a|x| − 4a         für 1 < |x| < 2, sonst 0
// Hier direkt als Summe über die 4×4 Nachbar-Texel ausgewertet (eigene Umsetzung, ohne Filter-Tricks der Hardware).
export const KUBIK = /* wgsl */`
fn keys(x0: f32) -> f32 {
  let a = -0.5; let x = abs(x0);
  if (x <= 1.0) { return (a + 2.0) * x * x * x - (a + 3.0) * x * x + 1.0; }
  if (x < 2.0) { return a * x * x * x - 5.0 * a * x * x + 8.0 * a * x - 4.0 * a; }
  return 0.0;
}
fn kubisch(t: texture_2d<f32>, uv: vec2f) -> vec3f {
  let n = vec2i(textureDimensions(t));
  let s = uv * vec2f(n) - 0.5; let i = vec2i(floor(s)); let f = s - floor(s);
  var summe = vec3f(0.0);
  for (var y = -1; y <= 2; y++) {
    let wy = keys(f32(y) - f.y);
    for (var x = -1; x <= 2; x++) { summe += textureLoad(t, clamp(i + vec2i(x, y), vec2i(0), n - 1), 0).rgb * (keys(f32(x) - f.x) * wy); }
  }
  return max(summe, vec3f(0.0));
}
`;

// Lanczos mit a = 2: L(x) = sinc(x)·sinc(x/2), sinc(x) = sin(πx)/(πx): https://en.wikipedia.org/wiki/Lanczos_resampling
export const LANCZOS2 = /* wgsl */`
fn lanczos2(x0: f32) -> f32 {
  let x = abs(x0);
  if (x < 1e-5) { return 1.0; }
  if (x >= 2.0) { return 0.0; }
  let p = 3.14159265359 * x;
  return (sin(p) / p) * (sin(p * 0.5) / (p * 0.5));
}
`;
