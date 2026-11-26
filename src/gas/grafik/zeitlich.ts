// Zeitliche Verfahren des Gasriesen (TAA, zeitliches Hochskalieren, Schachbrett/Zeilensprung, Zwischenbilder).
// Bewegungsvektoren werden nicht geschätzt, sondern ausgerechnet: Die Szene ist analytisch (Ellipsoid, Drehung, Windfeld).
// Rückprojektion („reverse reprojection“, Yang/Liu/Salvi, „A Survey of Temporal Antialiasing Techniques“, CGF 2020, Gl. 1):
// Pixel → Sichtstrahl → Punkt q auf dem Planeten → mit dem Wind zurückverfolgen q' = normalize(q − v(q)·Δt) (Semi-Lagrange,
// Stam 1999) → mit Lage und Kamera des früheren Bildes zurück auf den Schirm.
// Näherungen: Ringe gelten als ruhend, Saum und Himmel bewegen sich nur mit der Kamera, Höhe aus Argh/Parallaxe zählt nicht.

/** Floats eines Bewegungs-Blocks (struct M). */
export const M_FLOATS = 80;

const BEWEGUNG = /* wgsl */`
struct M {
  invVP: mat4x4f, vpAlt: mat4x4f, cam: vec4f, camAlt: vec4f,
  r0: vec4f, r1: vec4f, r2: vec4f, a0: vec4f, a1: vec4f, a2: vec4f,   // Welt -> Körper (Zeilen), jetzt und früher
  g: vec4f,     // x 1−Abplattung, y Δt Simulationszeit, z Mischanteil, w Verfahren (0 TAA, 1 TAAU, 2 Schachbrett, 3 Zeilen)
  j: vec4f,     // x,y Jitter in Quellpixeln, z Phase, w Verlauf gültig
  ring: vec4f,  // x innen, y außen, z Deckkraft, w 1 = seit dem vorigen Bild hat sich nichts bewegt
  s: vec4f,     // Quelle Breite/Höhe, Ziel Breite/Höhe
};
@group(0) @binding(0) var<uniform> U: array<M, 2>;
@group(0) @binding(1) var glatt: sampler;
@group(0) @binding(2) var wind: texture_cube<f32>;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  return vec4f(f32((i << 1u) & 2u) * 2.0 - 1.0, f32(i & 2u) * 2.0 - 1.0, 0.0, 1.0);
}
fn zuKoerper(k: u32, v: vec3f) -> vec3f { return vec3f(dot(U[k].r0.xyz, v), dot(U[k].r1.xyz, v), dot(U[k].r2.xyz, v)); }
// Wo lag der Inhalt dieses Pixels im früheren Bild von Block k? xy = uv dort, z = 1 wenn dort sichtbar (2: außerdem freier Himmel)
fn bewegung(k: u32, ndc: vec2f) -> vec3f {
  let wp = U[k].invVP * vec4f(ndc, 1.0, 1.0);
  let dir = normalize(wp.xyz / wp.w - U[k].cam.xyz);
  let o = zuKoerper(k, U[k].cam.xyz); let d = zuKoerper(k, dir);
  let c = U[k].g.x;
  let st = vec3f(1.0, 1.0 / c, 1.0); let os = o * st; let ds = d * st;
  let a = dot(ds, ds); let b = dot(os, ds); let disc = b * b - a * (dot(os, os) - 1.0);
  var t = -1.0; if (disc >= 0.0) { t = (-b - sqrt(disc)) / a; }
  var punkt = vec4f(0.0); var sichtbar = true; var himmel = false;
  var rt = -1.0;
  if (U[k].ring.z > 0.0 && abs(d.y) > 1e-5) {
    let tr = -o.y / d.y; let rr = length((o + d * tr).xz);
    if (tr > 0.0 && (t < 0.0 || tr < t) && rr > U[k].ring.x && rr < U[k].ring.y) { rt = tr; }
  }
  if (rt > 0.0) { punkt = vec4f(U[k].cam.xyz + dir * rt, 1.0); }
  else if (t > 0.0) {
    let q = normalize((o + d * t) * st);
    let v = textureSampleLevel(wind, glatt, q, 0.0).xyz;
    let pk = normalize(q - v * U[k].g.y) * vec3f(1.0, c, 1.0);
    let welt = U[k].a0.xyz * pk.x + U[k].a1.xyz * pk.y + U[k].a2.xyz * pk.z;
    let nk = pk * vec3f(1.0, 1.0 / (c * c), 1.0);
    let nw = U[k].a0.xyz * nk.x + U[k].a1.xyz * nk.y + U[k].a2.xyz * nk.z;
    sichtbar = dot(nw, U[k].camAlt.xyz - welt) > 0.0;
    punkt = vec4f(welt, 1.0);
  } else {
    let tc = max(-dot(o, d), 0.0);
    // Saum (e^(−h/0,025), atmosaum.ts) bis h = 0,15 starr am Planeten, weiter außen Himmel. Breite gemessen (Kamerafahrt, 0,06/0,15/0,25/0,4):
    // 0,15 liegt am nächsten am echt gerechneten Bild. Folge: Sterne in diesem Ring wandern beim Schwenken leicht falsch.
    if (length((o + d * tc) * st) - 1.0 < 0.15) { punkt = vec4f(U[k].cam.xyz + dir * tc, 1.0); }
    else { punkt = vec4f(dir, 0.0); himmel = true; }                                               // Himmel: unendlich weit
  }
  let cl = U[k].vpAlt * punkt;
  if (cl.w <= 0.0) { return vec3f(0.0); }
  let n = cl.xy / cl.w;
  let uv = vec2f(n.x * 0.5 + 0.5, 0.5 - n.y * 0.5);
  let drin = all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0));
  return vec3f(uv, select(0.0, select(1.0, 2.0, himmel), drin && sichtbar));
}
fn lade(t: texture_2d<f32>, p: vec2i) -> vec3f { return textureLoad(t, clamp(p, vec2i(0), vec2i(textureDimensions(t)) - 1), 0).rgb; }
// Der Verlauf wird mit Catmull-Rom abgetastet: schärfer als bilinear, damit sich die Unschärfe nicht aufschaukelt (Survey 6.1.1).
// Catmull-Rom (Keys a = −0,5) mit 9 statt 16 Zugriffen: die beiden mittleren Gewichte je Achse sind positiv und werden zu einem
// linear gefilterten Zugriff zusammengefasst. Gewichte und Aufbau nach Matt Pettineo (TheRealMJP), „Tex2DCatmullRom.hlsl“,
// https://gist.github.com/TheRealMJP/c83b8c0f46b63f3a88a5986f4fa982b1, MIT-Lizenz (https://gist.github.com/TheRealMJP/bc503b0b87b643d3505d41eab8b332ae);
// Technik dort nach http://vec3.ca/bicubic-filtering-in-fewer-taps/.
fn catmull(t: texture_2d<f32>, uv: vec2f) -> vec3f {
  let n = vec2f(textureDimensions(t));
  let s = uv * n - 0.5; let i = floor(s); let f = s - i;
  if (all(abs(f - round(f)) < vec2f(0.002))) { return textureLoad(t, clamp(vec2i(round(s)), vec2i(0), vec2i(n) - 1), 0).rgb; }   // auf der Texelmitte: exakt
  let w0 = f * (-0.5 + f * (1.0 - 0.5 * f)); let w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  let w2 = f * (0.5 + f * (2.0 - 1.5 * f)); let w3 = f * f * (-0.5 + 0.5 * f);
  let w12 = w1 + w2;
  var x = array<f32, 3>(i.x - 0.5, i.x + 0.5 + w2.x / w12.x, i.x + 2.5); var y = array<f32, 3>(i.y - 0.5, i.y + 0.5 + w2.y / w12.y, i.y + 2.5);
  var gx = array<f32, 3>(w0.x, w12.x, w3.x); var gy = array<f32, 3>(w0.y, w12.y, w3.y);
  var summe = vec3f(0.0);
  for (var b = 0; b < 3; b++) { for (var a = 0; a < 3; a++) { summe += textureSampleLevel(t, glatt, vec2f(x[a], y[b]) / n, 0.0).rgb * gx[a] * gy[b]; } }
  return max(summe, vec3f(0.0));
}
`;

/** TAA, zeitliches Hochskalieren und Schachbrett/Zeilensprung. */
export const AUFLOESEN = BEWEGUNG + /* wgsl */`
@group(0) @binding(3) var neu: texture_2d<f32>;
@group(0) @binding(4) var verlauf: texture_2d<f32>;
fn yc(c: vec3f) -> vec3f { return vec3f(dot(c, vec3f(0.25, 0.5, 0.25)), dot(c, vec3f(0.5, 0.0, -0.5)), dot(c, vec3f(-0.25, 0.5, -0.25))); }
fn rgb(y: vec3f) -> vec3f { return vec3f(y.x + y.y - y.z, y.x + y.z, y.x - y.y - y.z); }
// Verlauf auf der Strecke vom (in den Kasten geklemmten) neuen Wert zum alten bis an den Kasten kürzen (Survey 4.2, „clipping“)
fn kappen(alt: vec3f, jetzt: vec3f, lo: vec3f, hi: vec3f) -> vec3f {
  let a = clamp(jetzt, lo, hi); let r = alt - a; var t = 1.0;
  for (var k = 0; k < 3; k++) { if (alt[k] > hi[k]) { t = min(t, (hi[k] - a[k]) / r[k]); } if (alt[k] < lo[k]) { t = min(t, (lo[k] - a[k]) / r[k]); } }
  return a + r * t;
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / U[0].s.zw;
  let m = bewegung(0u, vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0));
  let gueltig = U[0].j.w > 0.5 && m.z > 0.5;
  let art = i32(U[0].g.w);
  if (art >= 2) {   // Schachbrett (2) bzw. Zeilensprung (3): die Hälfte der Pixel ist neu, der Rest kommt rückprojiziert (Survey 5.3)
    let p = vec2i(pos.xy); let phase = i32(U[0].j.z);
    if (art == 2) { if ((p.x & 1) == ((p.y + phase) & 1)) { return vec4f(lade(neu, vec2i(p.x >> 1u, p.y)), 1.0); } }
    else if ((p.y & 1) == phase) { return vec4f(lade(neu, vec2i(p.x, p.y >> 1u)), 1.0); }
    var lo = vec3f(1e4); var hi = vec3f(-1e4); var mittel = vec3f(0.0); var n = 0.0;
    let voll = vec2i(U[0].s.zw);
    for (var i = 0; i < 4; i++) {
      var q = p + array<vec2i, 4>(vec2i(0, -1), vec2i(0, 1), vec2i(-1, 0), vec2i(1, 0))[i];
      if (art == 3 && i >= 2) { break; }
      if (any(q < vec2i(0)) || any(q >= voll)) { continue; }
      let c = lade(neu, select(vec2i(q.x, q.y >> 1u), vec2i(q.x >> 1u, q.y), art == 2));
      lo = min(lo, c); hi = max(hi, c); mittel += c; n += 1.0;
    }
    if (!gueltig) { return vec4f(mittel / max(n, 1.0), 1.0); }
    // Stillstand (von der CPU erkannt, weil die Rückprojektion in 32 Bit dafür zu ungenau ist): Verlauf unverändert = exakt wie voll gerechnet
    if (U[0].ring.w > 0.5) { return vec4f(textureLoad(verlauf, p, 0).rgb, 1.0); }
    return vec4f(clamp(catmull(verlauf, m.xy), lo, hi), 1.0);
  }
  // TAA / zeitliches Hochskalieren: Farbbereich der 3×3-Nachbarschaft als Mittel ± 1σ in YCoCg („variance clipping“, Salvi 2016)
  let ein = U[0].s.xy;
  let jit = U[0].j.xy;
  var mitte = vec2i(pos.xy);
  if (art == 1) { mitte = vec2i(round(uv * ein - 0.5 - jit)); }
  var m1 = vec3f(0.0); var m2 = vec3f(0.0); var summe = vec3f(0.0); var gew = 0.0; var beta = 0.0;
  for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let k = mitte + vec2i(x, y);
    let c = lade(neu, k); let q = yc(c); m1 += q; m2 += q * q;
    if (art == 1) {   // Survey Gl. 7–10: Gewicht nach Abstand der verschobenen Quell-Probe zum Zielpixel (Zelt, 1 Zielpixel breit)
      let o = pos.xy - (vec2f(k) + 0.5 + jit) / ein * U[0].s.zw;
      let w = max(0.0, 1.0 - abs(o.x)) * max(0.0, 1.0 - abs(o.y));
      summe += c * w; gew += w; beta = max(beta, w);
    }
  } }
  let mu = m1 / 9.0; let sigma = sqrt(max(m2 / 9.0 - mu * mu, vec3f(0.0)));
  var jetzt: vec3f;
  if (art == 1) { if (gew > 0.0) { jetzt = summe / gew; } else { jetzt = textureSampleLevel(neu, glatt, uv - jit / ein, 0.0).rgb; } }
  else { jetzt = lade(neu, mitte); beta = 1.0; }
  if (!gueltig) {
    if (art == 1) { return vec4f(textureSampleLevel(neu, glatt, uv - jit / ein, 0.0).rgb, 1.0); }
    return vec4f(jetzt, 1.0);
  }
  var bezug = jetzt; if (art == 1 && gew <= 0.0) { bezug = rgb(mu); }
  var alt = rgb(kappen(yc(catmull(verlauf, m.xy)), yc(bezug), mu - sigma, mu + sigma));
  // Freier Himmel bei ruhender Kamera: nichts kann etwas verdecken, also nicht kappen – sonst verblassen Sterne (ein Pixel groß)
  if (m.z > 1.5 && length((m.xy - uv) * U[0].s.zw) < 0.05) { alt = textureLoad(verlauf, vec2i(pos.xy), 0).rgb; }
  return vec4f(mix(alt, jetzt, U[0].g.z * beta), 1.0);   // Survey Gl. 2 und 9
}
`;

/** Zwischenbild: ein oder zwei echte Bilder auf den gewünschten Zeitpunkt verschieben („reprojection warping“).
 *  Block 0 = älteres Bild (Gewicht 1 − α), Block 1 = neueres (α). Extrapolation: α = 1. */
export const VERSCHIEBEN = BEWEGUNG + /* wgsl */`
@group(0) @binding(3) var bildA: texture_2d<f32>;
@group(0) @binding(4) var bildB: texture_2d<f32>;
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let uv = pos.xy / U[1].s.zw; let ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let alpha = U[1].g.z;
  let mb = bewegung(1u, ndc);
  var wb = alpha * min(mb.z, 1.0); var wa = 0.0; var a = vec3f(0.0);
  if (alpha < 1.0) { let ma = bewegung(0u, ndc); wa = (1.0 - alpha) * min(ma.z, 1.0); if (wa > 0.0) { a = catmull(bildA, ma.xy); } }
  if (wa + wb <= 0.0) { return vec4f(catmull(bildB, select(uv, mb.xy, mb.z > 0.5)), 1.0); }
  var b = vec3f(0.0); if (wb > 0.0) { b = catmull(bildB, mb.xy); }
  return vec4f((a * wa + b * wb) / (wa + wb), 1.0);
}
`;
