// Quellen (CREDITS.md): colordodge ProceduralPlanet (fBm-Felder aus Simplex-Rauschen, WTFPL), Musgrave 1994 (Grat-Rauschen).
// Grundfelder der Karten: Oktavenversatz, Oktavenzahl nach Kartengröße, fBm (Original: Kontrast ×2 bzw. hoch 4) und die Mischung zweier Felder mit einer Maske.
export const KARTE_FELD = /* wgsl */`
@group(0) @binding(1) var dst: texture_storage_2d_array<rgba16float, write>;
fn octOff(seed: f32, i: i32) -> vec3f { return (hash33(vec3f(seed * 0.1373, f32(i) * 1.7311 + 3.1, seed * 0.0719 + 11.0)) - 0.5) * 120.0; }
// Original: immer 16 Oktaven. Verbessert: nur bis zur Nyquist-Grenze der Karte, der Rest kommt live im Pixel.
fn octFor(frq: f32) -> i32 {
  if (J.f.x < 0.5) { return 16; }
  return clamp(i32(floor(log2(J.h.w * frq / 6.2832))) + 1, 2, 16);
}
// baseNoise / ridgedNoise des Originals: Σ simplex(p·2ⁱ/frq)·½/2ⁱ, danach Kontrast ×2 bzw. hoch 4. Rückgabe: (Wert, Gradient)
fn fbm(p: vec3f, frq: f32, seed: f32, ridged: bool, oct: i32) -> vec4f {
  var n = 0.0;
  var gain = 1.0;
  var g = vec3f(0.0);
  for (var i = 0; i < 16; i++) {
    if (i >= oct) { break; }
    let q = p * (gain / frq) + octOff(seed, i);
    let sn = snoiseG(q);
    var s = sn.x * 0.5 + 0.5;
    var gi = sn.yzw * 0.5;
    if (ridged) { s = 1.0 - abs(sn.x); gi = sn.yzw * select(-1.0, 1.0, sn.x < 0.0); }
    n += s * 0.5 / gain;
    g += gi * (0.5 / frq);
    gain *= 2.0;
  }
  if (ridged) { let n3 = n * n * n; g *= 4.0 * n3; n *= n3; }
  else { n = (n - 0.5) * 2.0 + 0.5; g *= 2.0; }
  return vec4f(n, g);
}
fn composite(p: vec3f, prm: vec4f, px: vec2f, cap: i32) -> vec4f {
  let ty = px.x;
  let seed = px.y;
  let r1 = ty > 1.5;
  let r2 = (ty > 0.5 && ty < 1.5) || ty > 2.5;
  let A = fbm(p, prm.x, seed + 11.437, r1, min(octFor(prm.x), cap));
  let B = fbm(p, prm.y, seed + 93.483, r2, min(octFor(prm.y), cap));
  let C = fbm(p, prm.z, seed + 23.675, false, min(octFor(prm.z), min(cap, 6)));
  let k = 1.0 + 3.0 * prm.w;
  let tm = (C.x - 0.5) * k + 0.5;
  let tt = clamp(tm, 0.0, 1.0);
  let gt = select(vec3f(0.0), C.yzw * k, tm > 0.0 && tm < 1.0);
  return vec4f(mix(A.x, B.x, tt), mix(A.yzw, B.yzw, tt) + (B.x - A.x) * gt);
}
`;
