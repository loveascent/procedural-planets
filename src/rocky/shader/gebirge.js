// Quellen (CREDITS.md): Musgrave, Texturing & Modeling (1994): Grat-Multifraktal für scharfe Kämme und glatte Täler; Gebirgsgürtel aus einem Rauschfeld (eigene Umsetzung).
// Baustein Gebirge: Gebirgsgürtel mit Grat-Multifraktal auf den Kontinenten. Einhängepunkt: hook_gebirge. Aus: Kontinente ohne Gebirgsgürtel (Höhe aus den Grundfeldern).
export const GEBIRGE = /* wgsl */`
// Grat-Multifraktal nach Musgrave (1994): scharfe Kämme, glatte Täler; jede Oktave gewichtet mit der vorigen
fn ridgedMF(p: vec3f, f0: f32, seed: f32) -> vec4f {
  var r = 0.0; var w = 1.0; var f = f0; var a = 1.0; var norm = 0.0;
  var g = vec3f(0.0);
  for (var i = 0; i < 10; i++) {
    if (f * 6.2832 > J.h.w) { break; }
    let sn = snoiseG(p * f + octOff(seed, i));
    let s = 1.0 - abs(sn.x);
    let gs = select(-1.0, 1.0, sn.x < 0.0) * sn.yzw * f;
    let s2 = s * s;
    r += s2 * w * a;
    g += 2.0 * s * gs * w * a;
    norm += a;
    w = clamp(s2 * 1.7, 0.0, 1.0);
    f *= 2.03;
    a *= 0.5;
  }
  return vec4f(r, g) / max(norm, 1e-3);
}
struct GebirgeOut { h: f32, gh: vec3f, gDir: vec3f, belt: f32 }
fn hook_gebirge(d: vec3f, h0: f32, gh0: vec3f, gDir0: vec3f, sea: f32, mode: f32) -> GebirgeOut {
  var h = h0;
  var gh = gh0;
  var gDir = gDir0;
  var belt = 0.0;
  let Mt = J.e;
  if (mode > 0.5) {
    // Kontinente wie im Original (untere Oktaven), Feinrauschen gedämpft, dafür Gebirgsgürtel + Erosion
    let LC = composite(d, J.a, J.b.xy, 4);
    let hL = LC.x;
    let gL = LC.yzw - d * dot(LC.yzw, d);
    let nbG = snoiseG(d * Mt.y + vec3f(J.b.y * 0.37, 5.1, 2.3));
    let nb = nbG.x;
    let gb = nbG.yzw * Mt.y;
    let bl = 1.0 - abs(nb);
    let tb = clamp((bl - 0.55) / 0.4, 0.0, 1.0);
    belt = tb * tb * (3.0 - 2.0 * tb);
    var gBelt = select(-1.0, 1.0, nb < 0.0) * gb * (6.0 * tb * (1.0 - tb) / 0.4);
    gBelt -= d * dot(gBelt, d);
    let RM = ridgedMF(d, Mt.z, J.b.y + 51.0);
    let rm = RM.x;
    let gr = RM.yzw - d * dot(RM.yzw, d);
    let landW = smoothstep(sea - 0.1, sea + 0.06, hL);
    let keep = mix(Mt.w, 0.9, belt);
    h = hL + (h - hL) * keep + landW * Mt.x * belt * (0.3 + 0.7 * rm);
    gh = gL + (gh - gL) * keep + landW * Mt.x * (gBelt * (0.3 + 0.7 * rm) + belt * 0.7 * gr);
    gDir = gL + landW * Mt.x * gBelt * 0.6;
  }
  return GebirgeOut(h, gh, gDir, belt);
}
`;

// Gebirge AUS: keine Gürtel, kein Grat-Multifraktal. Wird statt GEBIRGE mitkompiliert.
export const GEBIRGE_AUS = /* wgsl */`
struct GebirgeOut { h: f32, gh: vec3f, gDir: vec3f, belt: f32 }
fn hook_gebirge(d: vec3f, h0: f32, gh0: vec3f, gDir0: vec3f, sea: f32, mode: f32) -> GebirgeOut { return GebirgeOut(h0, gh0, gDir0, 0.0); }
`;
