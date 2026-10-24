// Gemeinsame WGSL-Grundlagen des Mond-Generators (Karten-Erzeugung und Zeichnen).
// Wiederverwendet vom Gesteinsplaneten: Würfelkugel-Abbildung (COMMON) und Simplexrauschen mit Gradient (NOISE, MIT-Lizenz, siehe dort).
// Eigene Umsetzung: Oberflächenzustand, Kraterprofil, Zellrauschen, Farbfunktionen.
import { COMMON } from '../../rocky/shader/common.js';
import { NOISE } from '../../rocky/shader/noise.js';

export const GRUND = COMMON + NOISE + /* wgsl */`
// ------------------------------------------------------------------ Oberflächenzustand eines Punkts
// h = Radiusabweichung in Radien (r = 1 + h). Die Bausteine füllen ihn in der Höhenstufe, dann in der Farbstufe.
struct Surf {
  h: f32,
  form: f32,        // Anteil von h aus der Grundform (Ellipsoid, Beulen); Krater löschen ihn nicht
  col: vec3f,       // Albedo (linear)
  gloss: f32,       // 0 staubiger Regolith … 1 Eis/Flüssigkeit (Glanz)
  heat: f32,        // Glühen (Lava), Einheiten: Strahlungsdichte relativ zur beleuchteten Fläche
  rough: f32,       // Mikrorauheit 0 glatt … 1 sehr rau
  fresh: f32,       // Frische (hell, unreif), 0 … 1
  mare: f32,        // Anteil Basaltflut 0 … 1
  ice: f32,         // Eis/Raureif-Anteil
  low: f32,         // Tieflandpotenzial (Maria-Zone), 0 … 1
  cav: f32,         // Becken-/Kraterhohlraum (für Fluten, Frostfallen)
  tint: vec3f,      // Zusatzfarbe, die Farbbausteine einmischen
  ray: f32,         // Strahlensystem frischer Krater
  aux: vec4f,       // freie Kanäle zwischen Höhen- und Farbstufe (Eisrisse, Chaos, Furchen)
  aux2: vec4f,      // weitere Kanäle (Vulkane, Lava, Konvektion, Titan)
  aux3: vec4f,      // weitere Kanäle (Kappen, Dichotomie, Streifen)
}
fn surfInit() -> Surf {
  var s: Surf;
  s.h = 0.0; s.form = 0.0; s.col = vec3f(0.2); s.gloss = 0.0; s.heat = 0.0; s.rough = 0.7; s.fresh = 0.0; s.mare = 0.0; s.ice = 0.0;
  s.low = 0.5; s.cav = 0.0; s.tint = vec3f(0.0); s.ray = 0.0; s.aux = vec4f(0.0); s.aux2 = vec4f(0.0); s.aux3 = vec4f(0.0);
  return s;
}

// ------------------------------------------------------------------ Kleinkram
fn sq2(x: f32) -> f32 { return x * x; }
fn sstep(a: f32, b: f32, x: f32) -> f32 { let t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
fn smin(a: f32, b: f32, k: f32) -> f32 { let h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
fn smax(a: f32, b: f32, k: f32) -> f32 { return -smin(-a, -b, k); }
fn hash14(q: vec3f, w: f32) -> f32 { return hash13(q + vec3f(w * 7.31, w * 3.17, w * 5.59)); }
fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3f {
  let k = fract(vec3f(h) + vec3f(0.0, 2.0 / 3.0, 1.0 / 3.0));
  let p = abs(k * 6.0 - 3.0);
  return v * mix(vec3f(1.0), clamp(p - 1.0, vec3f(0.0), vec3f(1.0)), s);
}
// Schwarzkörper-Näherung (Planck, sRGB-linear) für Lavaglühen, T in Kelvin 600 … 2500
fn blackbody(T: f32) -> vec3f {
  let t = clamp((T - 600.0) / 1900.0, 0.0, 1.0);
  let r = smoothstep(0.0, 0.25, t);
  let g = pow(smoothstep(0.12, 0.85, t), 1.6);
  let b = pow(smoothstep(0.55, 1.0, t), 2.2);
  return vec3f(r, g, b) * (0.03 + 4.0 * pow(t, 2.4));
}
// Fraktales Rauschen mit Gradient: Wert ≈ −1 … 1 (Summe der Oktaven mit Verstärkung gain), Gradient nach p
fn fbmG(p0: vec3f, oct: i32, gain: f32) -> vec4f {
  var v = 0.0; var g = vec3f(0.0); var a = 0.5; var f = 1.0; var p = p0; var norm = 0.0;
  for (var i = 0; i < 12; i++) {
    if (i >= oct) { break; }
    let n = snoiseG(p);
    v += a * n.x; g += a * f * n.yzw; norm += a;
    p = p * 2.02 + vec3f(1.7, 9.2, 3.1); f *= 2.02; a *= gain;
  }
  return vec4f(v, g) / norm;
}
// Grat-Rauschen (Musgrave): scharfe Kämme, Wert 0 … 1
fn ridgeN(p0: vec3f, oct: i32) -> f32 {
  var v = 0.0; var a = 0.5; var w = 1.0; var p = p0; var norm = 0.0;
  for (var i = 0; i < 10; i++) {
    if (i >= oct) { break; }
    let n = 1.0 - abs(snoise(p));
    let s = n * n * w;
    v += s * a; norm += a; w = clamp(s * 1.8, 0.0, 1.0);
    p = p * 2.03 + vec3f(5.1, 1.3, 7.7); a *= 0.5;
  }
  return v / norm;
}
// Zellrauschen (Voronoi) in 3D: (F1, F2, Zellkennung, Kantenabstand ≈ F2−F1)
fn vor3(p: vec3f) -> vec4f {
  let ip = floor(p); let fp = p - ip;
  var f1 = 9.0; var f2 = 9.0; var id = 0.0;
  for (var k = -1; k <= 1; k++) { for (var j = -1; j <= 1; j++) { for (var i = -1; i <= 1; i++) {
    let o = vec3f(f32(i), f32(j), f32(k));
    let h = hash33(ip + o);
    let r = o + 0.1 + 0.8 * h - fp;
    let dd = dot(r, r);
    if (dd < f1) { f2 = f1; f1 = dd; id = hash13(ip + o + 3.7); } else if (dd < f2) { f2 = dd; }
  } } }
  let a = sqrt(f1); let b = sqrt(f2);
  return vec4f(a, b, id, b - a);
}
// Abstand zur Nulllinie eines Rauschfelds p = d·fr + … in Radien (grob; der Gradient der Normierung ist nach unten begrenzt). Rückgabe: (Abstand, Feldwert)
fn lineDist(p: vec3f, fr: f32) -> vec2f {
  let n = snoiseG(p);
  return vec2f(abs(n.x) / (fr * max(length(n.yzw), 0.35)), n.x);
}
// Richtungen: zwei Tangenten zu d (stetig außer genau an den Polen der Wahlachse)
fn tangents(d: vec3f) -> mat2x3f {
  var up = vec3f(0.0, 1.0, 0.0);
  if (abs(d.y) > 0.95) { up = vec3f(1.0, 0.0, 0.0); }
  let t1 = normalize(cross(up, d));
  let t2 = cross(d, t1);
  return mat2x3f(t1, t2);
}
// Zufallspunkt auf der Kugel aus drei Zufallszahlen
fn sphPoint(h: vec3f) -> vec3f {
  let z = h.x * 2.0 - 1.0; let a = h.y * 6.2831853;
  let r = sqrt(max(1.0 - z * z, 0.0));
  return vec3f(r * cos(a), z, r * sin(a));
}
// Winkelabstand zweier Einheitsrichtungen (stabil auch für sehr kleine Winkel)
fn angDist(a: vec3f, b: vec3f) -> f32 { return 2.0 * asin(clamp(0.5 * length(a - b), 0.0, 1.0)); }

// Zusatz aus dem Zeichen-Shader: Neigung und Helligkeitsfaktor des Live-Details
struct Det { g: vec3f, br: f32 }
fn detSum(a: Det, b: Det) -> Det { return Det(a.g + b.g, a.br * b.br); }
// Henyey-Greenstein-Phasenfunktion (Asymmetrie g), normiert auf 1 über die Kugel
fn hg(c: f32, g: f32) -> f32 { let g2 = g * g; return (1.0 - g2) / (12.566371 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
// 1 = Punkt p wird von der Sonne beschienen, 0 = im Schatten des Körpers (weicher Rand von ~1 % Radius)
fn sunVisible(p: vec3f, s: vec3f) -> f32 {
  let tca = -dot(p, s);
  if (tca < 0.0) { return 1.0; }
  let dist = sqrt(max(dot(p, p) - tca * tca, 0.0));
  return sstep(0.985, 1.015, dist);
}

// ------------------------------------------------------------------ Kraterprofil
// Einheiten: x = Abstand / Kraterradius, Rückgabe in Kraterradien.
// dep = Tiefe (Radien), rimH = Randhöhe, cx = Komplexität 0 (einfache Schüssel) … 1 (flacher Boden, Terrassen, Zentralberg),
// pk = Zentralberg, terr = Terrassen, rwid = Randbreite, xmax = Ende der Auswurfdecke (in Radien)
fn crProfile(x: f32, dep: f32, rimH: f32, cx: f32, pk: f32, terr: f32, rwid: f32, xmax: f32) -> f32 {
  var h = 0.0;
  if (x < 1.0) {
    let xf = 0.52 * cx;
    var w = mix(x * x, sstep(xf, 1.0, x), cx);
    if (terr > 0.0 && cx > 0.0) {
      let u = w * 3.0;
      let st = (floor(u) + sstep(0.30, 0.70, fract(u))) / 3.0;
      w = mix(w, st, terr * cx);
    }
    h = -dep * (1.0 - w);
    h += pk * dep * cx * (exp(-sq2(x / 0.13)) + 0.25 * exp(-sq2((x - 0.3) / 0.12)));
    h += rimH * exp(-sq2((1.0 - x) / (0.12 * rwid)));
  } else {
    let fade = 1.0 - sstep(xmax * 0.55, xmax, x);
    h = rimH * pow(1.0 / x, 3.0 / max(rwid * 0.7 + 0.3, 0.3)) * fade;
  }
  return h;
}
`;
