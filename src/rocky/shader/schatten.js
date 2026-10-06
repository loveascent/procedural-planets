// Quelle: eigene Umsetzung (Schattenstrahl entlang der Sonnenrichtung über die Höhenkarte, weicher Rand); CREDITS.md nennt keine fremde Vorlage.
// Baustein Geländeschatten. Einhängepunkt für scene.js: hook_gelaendeschatten.
export const SCHATTEN = /* wgsl */`
fn terrainShadow(d: vec3f, Lo: vec3f, h0: f32, k: f32) -> f32 {
  let N = U.T.x;
  let sea = U.T.z;
  let sinEl = dot(Lo, d);
  if (sinEl < -0.2) { return 0.0; }
  var tv = Lo - d * sinEl;
  let tl = length(tv);
  if (tl < 1e-4) { return 1.0; }
  tv /= tl;
  let tanEl = sinEl / tl;
  let z0 = k * max(h0 - sea, 0.0);
  var sh = 1.0;
  var s = 1.5 / N;
  for (var i = 0; i < 14; i++) {
    let q = d * cos(s) + tv * sin(s);
    let lod = log2(max(s * N / 1.5708 * 0.3, 1.0));
    let zq = k * max(texDirLod(tHm, q, N, lod).x - sea, 0.0);
    let zr = z0 + s * tanEl + 0.5 * s * s;
    sh = min(sh, clamp((zr - zq) / (s * 0.035) + 0.5, 0.0, 1.0));
    if (sh <= 0.0 || zr > k * 1.2) { break; }
    s *= 1.5;
  }
  return sh;
}
fn hook_gelaendeschatten(d: vec3f, Lo: vec3f, h: f32, kN: f32, muS: f32, staerke: f32) -> f32 {
  var ts = 1.0;
  if (staerke > 0.0 && muS > -0.1) { ts = mix(1.0, terrainShadow(d, Lo, h, kN), staerke); }
  return ts;
}
`;

// Geländeschatten AUS: kein Strahl, keine Schleife. Wird statt SCHATTEN mitkompiliert.
export const SCHATTEN_AUS = /* wgsl */`
fn hook_gelaendeschatten(d: vec3f, Lo: vec3f, h: f32, kN: f32, muS: f32, staerke: f32) -> f32 { return 1.0; }
`;
