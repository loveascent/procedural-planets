// Quellen (CREDITS.md): Clay John (2021) und Fewes (2023), Erosionsrinnen aus Shadertoy (Idee: Streifen entlang r̂ × ∇h mit Verzweigung); hier neu auf der Kugel umgesetzt.
// Baustein Erosion: Rinnen aus Gefälle. Karte (gen, beim Erzeugen) und Nahbereich (scene, beim Heranzoomen). Einhängepunkte: hook_erosion_karte, hook_erosion_nah.
export const EROSION = /* wgsl */`
// Erosionsrinnen ("Gavoronoise" nach Clay John / Fewes, 3D): Streifen quer zu dir = r̂ × ∇h laufen hangabwärts.
// Acht Zellecken mit glatter Teilung der Eins als Gewichten: stetig, und nur 8 statt 27 Zellen.
fn gullies8(q: vec3f, dir: vec3f) -> vec4f {
  let ip = floor(q);
  let fp = q - ip;
  let u = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
  var acc = vec4f(0.0);
  for (var k = 0; k < 8; k++) {
    let o = vec3f(f32(k & 1), f32((k >> 1u) & 1), f32((k >> 2u) & 1));
    let c = ip + o;
    let pp = q - c - (hash33(c) - 0.5) * 0.7;
    let wv = mix(1.0 - u, u, o);
    let w = wv.x * wv.y * wv.z;
    let ph = dot(pp, dir) * 6.2831853;
    acc += vec4f(cos(ph), -sin(ph) * 6.2831853 * dir) * w;
  }
  return acc;
}
fn octRot(o: i32) -> mat3x3f {
  let a = f32(o) * 2.39996 + 0.7;
  let b = f32(o) * 1.1 + 0.3;
  let ca = cos(a); let sa = sin(a); let cb = cos(b); let sb = sin(b);
  return mat3x3f(ca, sa, 0.0, -sa, ca, 0.0, 0.0, 0.0, 1.0) * mat3x3f(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb);
}
struct ErosionOut { h: f32, g: vec3f }
fn hook_erosion_karte(d: vec3f, h0: f32, gh0: vec3f, gDir: vec3f, belt: f32, sea: f32, Ero: vec4f, nOct: f32, mode: f32) -> ErosionOut {
  var h = h0;
  var gh = gh0;
  if (mode > 0.5 && Ero.x > 0.0) {
    // Streifen pro Zelle wachsen mit dem Gefälle, aber gesättigt (sonst werden aus Rinnen Riffel)
    let cr = cross(d, gDir);
    let sl = length(cr);
    var dir0 = vec3f(0.0);
    if (sl > 1e-5) { dir0 = cr / sl * (1.4 * tanh(sl * Ero.z * 0.25)); }
    var a = smoothstep(sea - 0.06, sea + 0.12, h) * (0.6 + 0.8 * belt);
    var f = 1.0;
    var sumA = 0.0;
    var acc = vec4f(0.0);
    for (var o = 0; o < 8; o++) {
      if (f32(o) >= nOct) { break; }
      let dir = dir0 + cross(d, acc.yzw) * (Ero.w / (6.2831853 * Ero.y));
      let R = octRot(o);
      let e = gullies8(R * (d * (Ero.y * f)) + f32(o) * 19.19, R * dir);
      acc += vec4f(e.x, transpose(R) * e.yzw * (Ero.y * f)) * a;
      sumA += a;
      a *= 0.5;
      f *= 2.0;
    }
    let depth = Ero.x * 0.03;
    h += (acc.x - sumA) * 0.5 * depth;
    let ge = acc.yzw * 0.5 * depth;
    gh += ge - d * dot(ge, d);
  }
  return ErosionOut(h, gh);
}
fn hook_erosion_nah(d: vec3f, h0: f32, g0: vec3f, sea: f32, calm: f32, pix: f32, Ero: vec2f) -> ErosionOut {
  var h = h0;
  var g = g0;
  // Erosion geht beim Heranzoomen weiter: zwei weitere Rinnen-Oktaven entlang des örtlichen Gefälles
  if (Ero.x > 0.0 && h > sea) {
    var f = Ero.y;
    var a = Ero.x * smoothstep(sea, sea + 0.08, h) * calm;
    for (var o = 0; o < 2; o++) {
      let fade = smoothstep(3.0, 7.0, 1.0 / (f * pix));
      if (fade <= 0.0) { break; }
      let cr = cross(d, g);
      let sl = length(cr);
      var dr = vec3f(0.0);
      if (sl > 1e-5) { dr = cr / sl * (1.4 * tanh(sl * 0.22)); }
      let e = gullies8(d * f + f32(o) * 7.77, dr);
      let k = a * fade * 0.5 * 0.03;
      h += (e.x - 1.0) * k;
      let ge = e.yzw * f * k;
      g += ge - d * dot(ge, d);
      a *= 0.5;
      f *= 2.0;
    }
  }
  return ErosionOut(h, g);
}
`;

// Erosion AUS: keine Rinnen, kein gullies8 und keine Oktaven-Drehung. Wird statt EROSION mitkompiliert.
export const EROSION_AUS = /* wgsl */`
struct ErosionOut { h: f32, g: vec3f }
fn hook_erosion_karte(d: vec3f, h0: f32, gh0: vec3f, gDir: vec3f, belt: f32, sea: f32, Ero: vec4f, nOct: f32, mode: f32) -> ErosionOut { return ErosionOut(h0, gh0); }
fn hook_erosion_nah(d: vec3f, h0: f32, g0: vec3f, sea: f32, calm: f32, pix: f32, Ero: vec2f) -> ErosionOut { return ErosionOut(h0, g0); }
`;
