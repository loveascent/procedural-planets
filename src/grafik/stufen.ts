// Bildstufen nach dem Zeichnen (gemeinsam für alle Planeten-Seiten): Kantenglättung, Hochskalieren, Schärfen, Dithering.
// Eigene WGSL-Umsetzung beschriebener Verfahren (nur Methode und Formeln, kein fremder Quelltext). Eine Stufe wird nur
// übersetzt, wenn sie an ist. Eingabe und Ausgabe sind anzeigefertige (gamma-kodierte) Farben. Quellen: docs/GRAFIK-QUELLEN.md
import { KUBIK, LANCZOS2, VOLLBILD_VS } from './kern';

export const STUFEN_KOPF = /* wgsl */`
struct K { g: vec4f, p: vec4f };   // g: Quelle Breite/Höhe, Ziel Breite/Höhe · p: x Schärfe bzw. innerer Radius, y Übergang, z Radius
@group(0) @binding(0) var<uniform> K0: K;${VOLLBILD_VS}`;
const T = '@group(0) @binding(2) var quelle: texture_2d<f32>;\n';
const S = '@group(0) @binding(1) var glatt: sampler;\n';
const A = '@group(0) @binding(3) var hilfe: texture_2d<f32>;\n';
const LADEN = /* wgsl */`
fn lade(p: vec2i) -> vec3f { return textureLoad(quelle, clamp(p, vec2i(0), vec2i(textureDimensions(quelle)) - 1), 0).rgb; }
`;

// Bilinear (Hardware-Filter). Bei genau 2× Renderskala ist das beim Verkleinern ein exakter 2×2-Kasten (Supersampling).
const LINEAR = S + T + /* wgsl */`
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f { return vec4f(textureSampleLevel(quelle, glatt, pos.xy / K0.g.zw, 0.0).rgb, 1.0); }
`;

// Bikubisch: Catmull-Rom (kern.ts)
const KUBISCH = T + KUBIK + /* wgsl */`
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f { return vec4f(kubisch(quelle, pos.xy / K0.g.zw), 1.0); }
`;

// Lanczos-2 als 4×4-Filter, Gewichte normiert (Summe 1), wie auf der Lanczos-Seite beschrieben
const LANCZOS = T + LADEN + LANCZOS2 + /* wgsl */`
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let s = pos.xy / K0.g.zw * K0.g.xy - 0.5;
  let i = vec2i(floor(s)); let f = s - floor(s);
  var summe = vec3f(0.0); var gew = 0.0;
  for (var y = -1; y <= 2; y++) { for (var x = -1; x <= 2; x++) {
    let g = lanczos2(f32(x) - f.x) * lanczos2(f32(y) - f.y);
    summe += lade(i + vec2i(x, y)) * g; gew += g;
  } }
  return vec4f(max(summe / gew, vec3f(0.0)), 1.0);
}
`;

// Kantenadaptiv nach dem Verfahren von AMD FSR 1 „EASU“ (Beschreibung: FSR-1-Vortrag SIGGRAPH 2021 und ffx_fsr1.h, gelesen):
// 12 Abtastungen (4×4 ohne Ecken), Luma r + 2g + b, Richtung des Gradienten an den inneren 2×2 Texeln. Die Abstände werden in
// das gedrehte System umgerechnet und gestreckt MULTIPLIZIERT: quer zur Kante mit 1 → 1/max(|cos|,|sin|) (1 achsparallel,
// √2 diagonal: Kern quer schmaler), längs mit 1 → 0,5 (Kern längs bis doppelt so weit). Ergebnis auf Min/Max der 2×2 geklemmt.
// Eigene Wahl statt AMDs Maßen: Kantenstärke = Kohärenz des Strukturtensors ((λ1−λ2)/(λ1+λ2))², Kern = Lanczos-2.
// Das ist NICHT AMDs FSR und liefert nicht dessen Bild.
const KANTE = T + LADEN + LANCZOS2 + /* wgsl */`
fn luma(c: vec3f) -> f32 { return c.r + 2.0 * c.g + c.b; }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let s = pos.xy / K0.g.zw * K0.g.xy - 0.5;
  let i = vec2i(floor(s)); let f = s - floor(s);
  var c: array<vec3f, 16>; var l: array<f32, 16>;
  for (var y = 0; y < 4; y++) { for (var x = 0; x < 4; x++) {
    if ((x == 0 || x == 3) && (y == 0 || y == 3)) { continue; }
    let k = y * 4 + x; c[k] = lade(i + vec2i(x - 1, y - 1)); l[k] = luma(c[k]);
  } }
  var jxx = 0.0; var jyy = 0.0; var jxy = 0.0;
  var lo = vec3f(1e4); var hi = vec3f(-1e4);
  for (var y = 1; y <= 2; y++) { for (var x = 1; x <= 2; x++) {
    let k = y * 4 + x;
    let g = vec2f(l[k + 1] - l[k - 1], l[k + 4] - l[k - 4]);
    let b = select(1.0 - f.x, f.x, x == 2) * select(1.0 - f.y, f.y, y == 2);
    jxx += b * g.x * g.x; jyy += b * g.y * g.y; jxy += b * g.x * g.y;
    lo = min(lo, c[k]); hi = max(hi, c[k]);
  } }
  let spur = jxx + jyy;
  var staerke = 0.0; var dir = vec2f(1.0, 0.0);
  if (spur > 1e-6) {
    let anteil = clamp(sqrt((jxx - jyy) * (jxx - jyy) + 4.0 * jxy * jxy) / spur, 0.0, 1.0);   // (λ1−λ2)/(λ1+λ2)
    staerke = anteil * anteil;
    let th = 0.5 * atan2(2.0 * jxy, jxx - jyy);        // Hauptrichtung = Gradient (quer zur Kante)
    dir = vec2f(cos(th), sin(th));
  }
  let streck = 1.0 / max(abs(dir.x), abs(dir.y));
  let quer = mix(1.0, streck, staerke);
  let laengs = mix(1.0, 0.5, staerke);
  var summe = vec3f(0.0); var gew = 0.0;
  for (var y = 0; y < 4; y++) { for (var x = 0; x < 4; x++) {
    if ((x == 0 || x == 3) && (y == 0 || y == 3)) { continue; }
    let o = vec2f(f32(x - 1), f32(y - 1)) - f;
    let r = length(vec2f(dot(o, dir) * quer, dot(o, vec2f(-dir.y, dir.x)) * laengs));
    let g = lanczos2(r);
    summe += c[y * 4 + x] * g; gew += g;
  } }
  return vec4f(clamp(summe / gew, lo, hi), 1.0);
}
`;

// Kontrastadaptives Schärfen nach AMD FidelityFX CAS (ffx_cas.h, gelesen; Beschreibung ohne Skalieren): Kreuz aus 5 Pixeln, nur Grün
// bestimmt das Gewicht: A = √(clamp(min(mn, 1−mx)/mx, 0, 1)), Spitzengewicht w₀ = −1/mix(8, 5, Stärke), Stärke 0 = Vorgabe
// (wenigstes Überschwingen). Ergebnis = (c + w·Σ4)/(1 + 4w), w = A·w₀. Rechnet linear, wie dort verlangt (Gamma 2,2 wie im Projekt).
const SCHARF = T + LADEN + /* wgsl */`
fn lin(p: vec2i) -> vec3f { return pow(max(lade(p), vec3f(0.0)), vec3f(2.2)); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = vec2i(pos.xy);
  let a = lin(p + vec2i(0, -1)); let b = lin(p + vec2i(-1, 0)); let c = lin(p); let d = lin(p + vec2i(1, 0)); let e = lin(p + vec2i(0, 1));
  let mn = min(c.g, min(min(a.g, b.g), min(d.g, e.g)));
  let mx = max(c.g, max(max(a.g, b.g), max(d.g, e.g)));
  let basis = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, 1e-5), 0.0, 1.0));
  let w = basis * (-1.0 / mix(8.0, 5.0, K0.p.x));
  let o = (c + w * (a + b + d + e)) / (1.0 + 4.0 * w);
  return vec4f(pow(clamp(o, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2)), 1.0);
}
`;

// Dithering vor der Rundung auf 8 Bit: Interleaved Gradient Noise (Formel: blog.demofox.org, nach Jimenez 2014), ±½ Stufe.
const DITHER = T + LADEN + /* wgsl */`
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let n = fract(52.9829189 * fract(dot(pos.xy, vec2f(0.06711056, 0.00583715))));
  return vec4f(lade(vec2i(pos.xy)) + (n - 0.5) / 255.0, 1.0);
}
`;

// Kantenglättung nach dem FXAA-3.11-Verfahren, wie es Simon Rodriguez beschreibt („Implementing FXAA“, 2016, gelesen):
// alle Formeln und Werte (Schwellen 0,0312 / 0,125, Gradient ×0,25, 12 Suchschritte mit den Schrittweiten unten,
// Unterpixel-Anteil 0,75) stammen aus dem Artikel; die Umsetzung ist eigen.
const FXAA = S + T + /* wgsl */`
fn hol(uv: vec2f) -> vec3f { return textureSampleLevel(quelle, glatt, uv, 0.0).rgb; }
fn hell(c: vec3f) -> f32 { return sqrt(max(dot(c, vec3f(0.299, 0.587, 0.114)), 0.0)); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = 1.0 / K0.g.xy; let uv = pos.xy * px;
  let farbe = hol(uv); let m = hell(farbe);
  let u = hell(hol(uv + vec2f(0.0, px.y))); let d = hell(hol(uv - vec2f(0.0, px.y)));
  let l = hell(hol(uv - vec2f(px.x, 0.0))); let r = hell(hol(uv + vec2f(px.x, 0.0)));
  let tief = min(m, min(min(u, d), min(l, r))); let hoch = max(m, max(max(u, d), max(l, r)));
  let spanne = hoch - tief;
  if (spanne < max(0.0312, hoch * 0.125)) { return vec4f(farbe, 1.0); }
  let dl = hell(hol(uv - px)); let ur = hell(hol(uv + px));
  let ul = hell(hol(uv + vec2f(-px.x, px.y))); let dr = hell(hol(uv + vec2f(px.x, -px.y)));
  let waagr = abs(ul - 2.0 * l + dl) + 2.0 * abs(u - 2.0 * m + d) + abs(ur - 2.0 * r + dr);
  let senkr = abs(ur - 2.0 * u + ul) + 2.0 * abs(r - 2.0 * m + l) + abs(dr - 2.0 * d + dl);
  let quer = waagr >= senkr;                                   // waagrechte Kante
  let n1 = select(l, d, quer); let n2 = select(r, u, quer);
  let erste = abs(n1 - m) >= abs(n2 - m);
  let grenze = 0.25 * max(abs(n1 - m), abs(n2 - m));
  var schritt = select(px.x, px.y, quer); if (erste) { schritt = -schritt; }
  let mittel = 0.5 * (select(n2, n1, erste) + m);
  var start = uv; if (quer) { start.y += 0.5 * schritt; } else { start.x += 0.5 * schritt; }
  let lauf = select(vec2f(0.0, px.y), vec2f(px.x, 0.0), quer);
  var weite = array<f32, 12>(1.0, 1.0, 1.0, 1.0, 1.0, 1.5, 2.0, 2.0, 2.0, 2.0, 4.0, 8.0);
  var a = start - lauf; var b = start + lauf;
  var ea = hell(hol(a)) - mittel; var eb = hell(hol(b)) - mittel;
  var fa = abs(ea) >= grenze; var fb = abs(eb) >= grenze;
  if (!fa) { a -= lauf; }
  if (!fb) { b += lauf; }
  for (var k = 2; k < 12; k++) {
    if (fa && fb) { break; }
    if (!fa) { ea = hell(hol(a)) - mittel; fa = abs(ea) >= grenze; }
    if (!fb) { eb = hell(hol(b)) - mittel; fb = abs(eb) >= grenze; }
    if (!fa) { a -= lauf * weite[k]; }
    if (!fb) { b += lauf * weite[k]; }
  }
  let da = select(uv.y - a.y, uv.x - a.x, quer); let db = select(b.y - uv.y, b.x - uv.x, quer);
  let nahA = da < db;
  var versatz = 0.5 - min(da, db) / max(da + db, 1e-6);
  if ((select(eb, ea, nahA) < 0.0) == (m < mittel)) { versatz = 0.0; }   // Ende passt nicht zur Mitte
  let schnitt = (2.0 * (u + d + l + r) + (dl + ul) + (dr + ur)) / 12.0;
  let s1 = clamp(abs(schnitt - m) / spanne, 0.0, 1.0);
  let s2 = (-2.0 * s1 + 3.0) * s1 * s1;
  versatz = max(versatz, s2 * s2 * 0.75);
  var ziel = uv; if (quer) { ziel.y += versatz * schritt; } else { ziel.x += versatz * schritt; }
  return vec4f(hol(ziel), 1.0);
}
`;

// Morphologische Kantenglättung (Grundform von MLAA, wie in SMAA 1x ohne Diagonalen, Eckenschutz und U-Weichzeichnung).
// Quellen, gelesen: SMAA.hlsl (Luma 0,2126/0,7152/0,0722, Schwelle 0,1 und 16 Suchschritte = Voreinstellung HIGH, örtlicher
// Kontrast-Faktor 2) und AreaTex.py (Muster L/Z/U: Stücke von (0, ±½) über die Mitte (d/2, 0) bzw. gerade bis (d, ±½); die Fläche
// je Pixel wird integriert). Die Flächen werden hier ausgerechnet statt aus einer Textur gelesen; eigene Umsetzung.
const M_KANTEN = T + LADEN + /* wgsl */`
fn L(p: vec2i) -> f32 { return dot(lade(p), vec3f(0.2126, 0.7152, 0.0722)); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = vec2i(pos.xy); let c = L(p);
  let links = L(p - vec2i(1, 0)); let oben = L(p - vec2i(0, 1));
  let cl = abs(c - links); let ct = abs(c - oben);
  if (cl < 0.1 && ct < 0.1) { return vec4f(0.0); }
  let cr = abs(c - L(p + vec2i(1, 0))); let cb = abs(c - L(p + vec2i(0, 1)));
  // eine Kante zählt nur, wenn kein Nachbar-Kontrast mehr als doppelt so stark ist
  let maxL = max(max(ct, cr), max(cb, max(cl, abs(links - L(p - vec2i(2, 0))))));
  let maxO = max(max(cl, cr), max(cb, max(ct, abs(oben - L(p - vec2i(0, 2))))));
  return vec4f(select(0.0, 1.0, cl >= 0.1 && 2.0 * cl >= maxL), select(0.0, 1.0, ct >= 0.1 && 2.0 * ct >= maxO), 0.0, 1.0);
}
`;
const M_GEWICHTE = T + /* wgsl */`
fn KA(p: vec2i) -> vec2f { let d = vec2i(textureDimensions(quelle)); if (any(p < vec2i(0)) || any(p >= d)) { return vec2f(0.0); } return textureLoad(quelle, p, 0).rg; }
// Silhouette von (0, hl) über (len/2, 0) nach (len, hr); Rückgabe: Fläche im Pixel [x, x+1] auf der eigenen (+) und der Gegenseite (−)
fn flaeche(x: f32, len: f32, hl: f32, hr: f32) -> vec2f {
  let mitte = 0.5 * len; var f = vec2f(0.0);
  for (var k = 0; k < 2; k++) {
    let a = max(x, select(0.0, mitte, k == 1)); let b = min(x + 1.0, select(mitte, len, k == 1));
    if (b <= a) { continue; }
    let h = select(hl, hr, k == 1);
    let ya = h * abs(1.0 - 2.0 * a / len); let yb = h * abs(1.0 - 2.0 * b / len);
    let v = 0.5 * (ya + yb) * (b - a);
    f += vec2f(max(v, 0.0), max(-v, 0.0));
  }
  return f;
}
// Trennlinie zwischen Pixel p und seinem Nachbarn p − quer; längs der Linie suchen, Querkanten an beiden Enden bestimmen
fn linie(p: vec2i, laengs: vec2i, quer: vec2i, kanal: i32) -> vec2f {
  var a = 0; var b = 0;
  loop { if (a >= 16 || KA(p - laengs * (a + 1))[kanal] < 0.5) { break; } a++; }
  loop { if (b >= 16 || KA(p + laengs * (b + 1))[kanal] < 0.5) { break; } b++; }
  let andere = 1 - kanal;
  let pl = p - laengs * a; let pr = p + laengs * (b + 1);
  // Querkante in der eigenen Zeile: Silhouette läuft ins eigene Pixel (+½), in der Gegenzeile: hinaus (−½), beide oder keine: 0
  let hl = 0.5 * (step(0.5, KA(pl)[andere]) - step(0.5, KA(pl - quer)[andere]));
  let hr = 0.5 * (step(0.5, KA(pr)[andere]) - step(0.5, KA(pr - quer)[andere]));
  if (hl == 0.0 && hr == 0.0) { return vec2f(0.0); }
  return flaeche(f32(a), f32(a + b + 1), hl, hr);
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = vec2i(pos.xy); let e = KA(p);
  var o = vec4f(0.0);
  if (e.g > 0.5) { let f = linie(p, vec2i(1, 0), vec2i(0, 1), 1); o.r = f.x; o.g = f.y; }
  if (e.r > 0.5) { let f = linie(p, vec2i(0, 1), vec2i(1, 0), 0); o.b = f.x; o.a = f.y; }
  return o;
}
`;
const M_MISCHEN = T + A + LADEN + /* wgsl */`
fn G(p: vec2i) -> vec4f { let d = vec2i(textureDimensions(hilfe)); if (any(p >= d)) { return vec4f(0.0); } return textureLoad(hilfe, p, 0); }
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p = vec2i(pos.xy); let w = G(p);
  let oben = w.r; let unten = G(p + vec2i(0, 1)).g; let links = w.b; let rechts = G(p + vec2i(1, 0)).a;
  var c = lade(p);
  // nur eine Richtung je Pixel (die mit der größeren Deckung); neu = (1 − a)·alt + a·Gegenüber
  if (oben + unten >= links + rechts) { c = c * (1.0 - min(oben + unten, 1.0)) + lade(p - vec2i(0, 1)) * oben + lade(p + vec2i(0, 1)) * unten; }
  else { c = c * (1.0 - min(links + rechts, 1.0)) + lade(p - vec2i(1, 0)) * links + lade(p + vec2i(1, 0)) * rechts; }
  return vec4f(c, 1.0);
}
`;

// Foveated (fest, ohne Blickverfolgung): scharfe Mitte (quelle, nur dort gerechnet) über grobem Gesamtbild (hilfe), linearer
// Übergang zwischen innerem (p.x) und äußerem Radius (p.z), beide in halben Bildhöhen.
const FOVEA = S + T + A + /* wgsl */`
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / K0.g.zw;
  let r = length(pos.xy - 0.5 * K0.g.zw) / (0.5 * K0.g.w);
  let t = clamp((r - K0.p.x) / max(K0.p.z - K0.p.x, 1e-4), 0.0, 1.0);
  return vec4f(mix(textureSampleLevel(quelle, glatt, uv, 0.0).rgb, textureSampleLevel(hilfe, glatt, uv, 0.0).rgb, t), 1.0);
}
`;

export const STUFEN: Record<string, string> = {
  linear: LINEAR, cubic: KUBISCH, lanczos: LANCZOS, edge: KANTE, scharf: SCHARF, dither: DITHER, fxaa: FXAA,
  mKanten: M_KANTEN, mGewichte: M_GEWICHTE, mMischen: M_MISCHEN, fovea: FOVEA,
};
