// Baustein Gras (nur in Bodennähe). Pipelines 'grasWahl' (csGras) und 'gras' (vsGras/fsGras, Büschel mit Index-Puffer, 3 Detailstufen).
// Quelle: Halm-Formel 1:1 aus dem eigenen WebGPU-Grasfeld demos/gras/index.html (gvs/gfs vom 26.11.2026): pcg-Hash, rnd, vn,
// Zellgitter CS, Dichte clamp(1 − (d − 22)/75, 0,06, 1), Grenze 98 m, Büschel alle 1,7 m, Höhe 0,62 m·…, Wind aus vn (Böen) + Wippen,
// Biegung D, Breite 0,045·…/√Dichte·(1 − t)^0,75, Sicht-Verdickung, gerundete Normale, Frustum je Halm; Licht: Albedo, Hohlraum-Dunkel,
// umhüllte Diffusion, Himmelslicht nach Normalenhöhe, Gegenlicht, Glanz. Angepasst an den Planeten: die Ebene xz des Vorbilds ist hier
// die Tangentialebene (Osten, Norden) am Kamerapunkt; Fußpunkte liegen im Würfelseiten-Gitter um die Kamera (Feldmitte relativ zur
// Kamera in double, RTC wie die Kacheln, genau.js), Höhe aus dem Gelände (bodenHoehe), Sonne/Himmel/Luft vom Planeten statt SUN/SC/sky/fog.
// Wo Gras wächst: erdähnliche Biomformel aus biom.js (Temperatur, Feuchte, Hang, kein Strand).
// Detailstufen: Querreihen je Halm nah / mittel / fern (nah wie bisher: 15 Ecken) und die Entfernungen in Metern dazwischen
export const GRAS_REIHEN = [7, 4, 2];
export const GRAS_GRENZEN = [9, 26];
export const GRAS = /* wgsl */`
const GRAS_REIHEN = array<u32, 3>(${GRAS_REIHEN.join('u, ')}u);
const GRAS_NAH = ${GRAS_GRENZEN[0]}.0;
const GRAS_MITTE = ${GRAS_GRENZEN[1]}.0;
const GRAS_HUB = 4.0;
fn grasAnfang(st: u32) -> u32 { return select(select(U.Gk.x + U.Gk.y, U.Gk.x, st == 1u), 0u, st == 0u); }
fn gpPcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
fn gpRnd(c: vec2i, k: u32) -> f32 { return f32(gpPcg(gpPcg(u32(c.x) ^ (k * 0x9e3779b9u)) + u32(c.y))) / 4294967296.0; }
fn gpVn(p: vec2f) -> f32 { let i = vec2i(floor(p)); let f = fract(p); let w = f * f * (3.0 - 2.0 * f);
  return mix(mix(gpRnd(i, 7u), gpRnd(i + vec2i(1, 0), 7u), w.x), mix(gpRnd(i + vec2i(0, 1), 7u), gpRnd(i + vec2i(1, 1), 7u), w.x), w.y); }
// Wächst hier Gras (0 … 1)? Erdähnliche Biomformel wie earthBiome (biom.js, gemeinsam: klima): Temperatur, Feuchte, Hang, kein Strand
fn grasErlaubt(d: vec3f) -> f32 {
  let F = toFace(d, vec3f(0.0), vec3f(0.0));
  let T = texFaceLod(tHm, F, U.T.x, 0.0);
  let sea = U.T.z;
  let elev = max(T.x - sea, 0.0);
  let kl = klima(d, elev, kartenFeuchte(T.y), 0.0);
  let gT = T.z * F.jx + T.w * F.jy;
  let slope = 1.0 - dot(normalize(d - U.L.x * 0.06 * gT), d);
  if (T.x <= sea || U.Vk.z > 1.5 || U.Md.y < 0.5) { return 0.0; }
  return smoothstep(0.3, 0.46, kl.y) * smoothstep(0.12, 0.38, kl.x) * smoothstep(0.008, 0.012, elev) * (1.0 - smoothstep(0.1, 0.28, slope));
}
// Boden unter dem Gras: wie GrassGPU bfs – nah (0,03; 0,06; 0,015), ab 50–100 m gmean·0,8 (gmean: mix((0,07; 0,16; 0,035), (0,2; 0,24; 0,06), Rauschen ~33 m)),
// sonst sieht man zwischen den Halmen den hellen Biom-Boden (gemessen: 27 % Lücke gegen 4–6 % in den Vergleichsfotos)
// Rückgabe: (Albedo, Anteil Gras 0…1) – unter dem Gras ist der Boden matt (Glanz des Geländes bei flacher Sonne machte ihn hellgrau)
fn hook_gras_boden(alb: vec3f, d: vec3f, rel: vec3f) -> vec4f {
  if (U.Bd.z < 0.5 || U.Nf.w < 0.5 || U.Gi.z <= 0.0) { return vec4f(alb, 0.0); }
  let dist = length(rel) / U.Gi.z;
  // wie GrassGPU bfs: hinter dem Halmfeld (ab 50–100 m) bleibt der Boden grasfarben (gmean·0,8); ausgeblendet erst in 3–6 km
  let nah = 1.0 - smoothstep(3000.0, 6000.0, dist);
  if (nah <= 0.0) { return vec4f(alb, 0.0); }
  let e = grasErlaubt(d);
  let gmean = mix(vec3f(0.07, 0.16, 0.035), vec3f(0.2, 0.24, 0.06), snoise(d / (U.Gi.z * 33.0)) * 0.5 + 0.5);
  let gm = mix(vec3f(0.03, 0.06, 0.015), gmean * 0.8, smoothstep(50.0, 100.0, dist));   // GrassGPU bfs: nah sehr dunkel (Halmschatten)
  return vec4f(mix(alb, gm, e * nah), e * nah);
}
// Sparverfahren wie in demos/gras/index.html (cull, mkIB, drawIndexedIndirect): ein Büschel = 2 × 2 Halme des Gitters. Der
// Rechen-Vorlauf csGras prüft je Büschel Entfernung, Dichte und Sichtfeld und schreibt nur sichtbare in drei Listen (Detailstufen);
// Böe und Farbfleck rechnet er einmal je Büschel. Die zwei Ecken einer Querreihe teilen sich die Dreiecke über einen Index-Puffer.
// Neu auf dem Planeten: Das Gelände steht still, deshalb rechnet csGras die Bodenhöhe (17 Rauschoktaven) nur einmal je Halm und hebt die
// 4 Höhen eines Büschels in einem Ringspeicher auf (Platz = Zelle modulo Feldkante, gültig bei gleicher Zelle und gleichem Stempel U.Gk.w).
// Vorher: bodenHoehe in jeder der 15 Ecken jedes Halms in jedem Bild, auch für verworfene Halme.
struct GZ { c: vec2i, k: f32, s: u32, dk: vec2u }   // Speicher: Büschelzelle, Höhe Halm 0 (Radien), Stempel << 8 | erlaubt (8 Bit), Höhen
struct GR { c: vec2i, k: f32, w: u32, dk: vec2u }   // sichtbares Büschel; w: (erlaubt, Böe, Farbfleck) als unorm8; dk: Halm 0 … 3 minus Halm 0
// dk: 4 × snorm16, Bereich ±GRAS_HUB Meter (Auflösung 0,06 mm)
struct GListe { licht: vec4f, r: array<GR> }  // licht: Sonne (rgb) und Himmelslicht-Stärke, im ganzen Feld gleich
@group(2) @binding(1) var<storage, read_write> gSpeicher: array<GZ>;
@group(2) @binding(2) var<storage, read_write> gZiel: GListe;
@group(2) @binding(3) var<storage, read_write> gArgs: array<atomic<u32>, 15>;   // 3 × drawIndexedIndirect
@group(2) @binding(4) var<storage, read> gListe: GListe;
// Kugelpunkt-Versatz zur Feldmitte aus Feldkoordinaten a, b ∈ [−½, ½] (Taylor wie die Kacheln, genau.js)
fn gpTaylor(ab: vec2f) -> vec3f { return taylorOrt(ab, U.GDs.xyz, U.GDt.xyz, U.GDss.xyz, U.GDst.xyz, U.GDtt.xyz); }
// Versatz des Halms der Gitterzelle c (mit Zufallsversatz in der Zelle)
fn gpHalmOrt(c: vec2i) -> vec3f { return gpTaylor((vec2f(c - bitcast<vec2i>(U.Gi.xy)) + vec2f(gpRnd(c, 4u), gpRnd(c, 5u))) / U.Gp.w - vec2f(0.5)); }
fn gpDichte(dist: f32) -> f32 { return clamp(1.0 - (dist - 22.0) / 75.0, 0.06, 1.0); }
@compute @workgroup_size(64) fn csGras(@builtin(global_invocation_id) id: vec3u) {
  let nH = u32(U.Gp.w);
  let nB = nH / 2u;
  let mR = U.Gi.z;
  let M = modelM();
  if (id.x == 0u) {
    // Planetensonne und -himmel, einmal je Bild (über 100 m Feld ändert sich der Sonnenstand um weniger als 0,001°)
    let muS = dot(normalize(U.Gp.xyz), transpose(M) * U.sun.xyz);
    gZiel.licht = bodenLicht(muS);
  }
  if (id.x >= nB * nB) { return; }
  let o = vec2u(id.x % nB, id.x / nB);
  let cc = bitcast<vec2i>(U.Gi.xy) / 2 + vec2i(o);          // Feldecke ist gerade (zeichnen.js)
  let ab = (vec2f(o) * 2.0 + 1.0) / f32(nH) - vec2f(0.5);
  let dl = gpTaylor(ab);
  let flach = M * dl + U.Gc.xyz;                            // Büschel auf der Kugel relativ zur Kamera
  let oben = normalize(U.cam.xyz);
  let weit = length(flach - oben * dot(flach, oben)) / mR;  // waagerechter Abstand in Metern, ohne Bodenhöhe
  if (weit > 100.0) { return; }
  let c0 = cc * 2;
  let wurf = min(min(gpRnd(c0, 3u), gpRnd(c0 + vec2i(1, 0), 3u)), min(gpRnd(c0 + vec2i(0, 1), 3u), gpRnd(c0 + vec2i(1, 1), 3u)));
  if (wurf > gpDichte(weit * 0.98 - 0.4)) { return; }       // alle 4 Halme ausgedünnt
  let n = i32(nB);
  let slot = u32(((cc.x % n) + n) % n + n * (((cc.y % n) + n) % n));
  var z = gSpeicher[slot];
  if (any(z.c != cc) || (z.s >> 8u) != U.Gk.w) {
    var h: vec4f;
    for (var i = 0u; i < 4u; i++) {
      let c = c0 + vec2i(i32(i & 1u), i32(i >> 1u));
      let hl = gpHalmOrt(c);
      h[i] = bodenHoehe(normalize(U.Gp.xyz + hl), transpose(M) * (M * hl + U.Gc.xyz), 0.0, 1e-12, U.Bd.x);
    }
    let q = (h - vec4f(h.x)) / (GRAS_HUB * mR);
    z = GZ(cc, h.x, (U.Gk.w << 8u) | u32(grasErlaubt(normalize(U.Gp.xyz + dl)) * 255.0 + 0.5), vec2u(pack2x16snorm(q.xy), pack2x16snorm(q.zw)));
    gSpeicher[slot] = z;
  }
  let erlaubt = f32(z.s & 255u) / 255.0;
  if (erlaubt <= 0.0) { return; }
  let base = rtcPunkt(dl, U.Gp.xyz, U.Gc.xyz, 1.0, z.k);
  let dist = length(base) / mR;
  if (dist > 98.5) { return; }
  let rc = U.vpRel * vec4f(base, 1.0);                      // Sichtfeld, Rand für Büschelbreite und Halmhöhe
  if (rc.w < -1.5 * mR || abs(rc.x) > rc.w * 1.35 + 1.5 * mR || abs(rc.y) > rc.w * 1.35 + 2.0 * mR) { return; }
  let p = (vec2f(c0 % vec2i(65536)) + 1.0) * U.Gc.w;        // Büschelmitte in Metern für das Rauschen
  let wd = vec2f(0.8, 0.6);
  let Tz = U.Bd.y;
  let boee = gpVn(p * 0.045 - wd * Tz * 1.3) * 0.75 + gpVn(p * 0.13 - wd * Tz * 2.1) * 0.25;
  let st = select(select(2u, 1u, dist < GRAS_MITTE), 0u, dist < GRAS_NAH);
  let k = atomicAdd(&gArgs[st * 5u + 1u], 1u);
  if (k >= U.Gk[st]) { return; }
  gZiel.r[grasAnfang(st) + k] = GR(cc, z.k, pack4x8unorm(vec4f(erlaubt, boee, gpVn(p * 0.03), 0.0)), z.dk);
}
struct GV { @builtin(position) pos: vec4f, @location(0) rel: vec3f, @location(1) n: vec3f, @location(2) c: vec4f, @location(3) d: vec3f, @location(4) @interpolate(flat) licht: vec4f }
// Eckpunktnummer = Stufe · 65536 (baseVertex) + Halm im Büschel · Ecken je Halm + Ecke
@vertex fn vsGras(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> GV {
  var o: GV;
  o.pos = vec4f(0.0, 0.0, -2.0, 1.0);                 // verworfen (außerhalb), wie "return o" im Vorbild
  let st = vi / 65536u;
  let reihen = GRAS_REIHEN[st];
  let je = 2u * reihen + 1u;
  let halm = (vi % 65536u) / je;
  let ecke = (vi % 65536u) % je;
  let R = gListe.r[grasAnfang(st) + ii];
  let w3 = unpack4x8unorm(R.w);
  let nH = U.Gp.w;
  let CS = U.Gc.w;                                   // Zellgröße in Metern (Vorbild CS = 0,13)
  let mR = U.Gi.z;                                   // Meter → Radien
  let c = R.c * 2 + vec2i(i32(halm & 1u), i32(halm >> 1u));
  let jit = vec2f(gpRnd(c, 4u), gpRnd(c, 5u));
  let p = (vec2f(c % vec2i(65536)) + jit) * CS;      // Ort in Metern für Rauschen/Büschel (wiederholt sich alle 65536 Zellen)
  let dl = gpHalmOrt(c);
  let d = normalize(U.Gp.xyz + dl);
  let M = modelM();
  // Fußpunkt relativ zur Kamera (Welt, Radien)
  let kk = R.k + vec4f(unpack2x16snorm(R.dk.x), unpack2x16snorm(R.dk.y))[halm] * GRAS_HUB * mR;
  let base = rtcPunkt(dl, U.Gp.xyz, U.Gc.xyz, 1.0, kk);
  let dist = length(base) / mR;                      // Meter
  let dens = gpDichte(dist);
  if (gpRnd(c, 3u) > dens || dist > 98.0) { return o; }
  let erlaubt = w3.x;
  // Halm nach GrassGPU (gvs)
  let cc = vec2i(floor(p / 1.7));
  let away = p - (vec2f(cc) + vec2f(gpRnd(cc, 10u), gpRnd(cc, 11u))) * 1.7;
  let cd = length(away) / 1.7;
  var height = 0.62 * (0.75 + 0.5 * gpRnd(c, 1u)) * mix(0.5, 1.25, gpRnd(cc, 12u)) * (1.1 - 0.4 * cd) * (1.0 - smoothstep(80.0, 97.0, dist)) * erlaubt;
  let a = gpRnd(c, 0u) * 6.2832;
  let f = vec2f(-sin(a), cos(a));
  let s = vec2f(cos(a), sin(a));
  let dd = normalize(mix(f, normalize(away + vec2f(1e-4)), 0.45));
  let r2 = gpRnd(c, 2u);
  let wd = vec2f(0.8, 0.6);
  let Tz = U.Bd.y;
  let gust = w3.y;                                   // Böe je Büschel aus csGras
  let bob = sin(Tz * (2.0 + gpRnd(c, 6u) * 2.5) + a * 6.0) * 0.05;
  var D = dd * (0.25 + 0.9 * r2 * r2) + wd * (gust * 0.9 + 0.12 + bob) * 0.5;
  // örtlicher Rahmen am Fußpunkt: oben = d, Osten aus der Feld-Ableitung (Planetenraum)
  let ost = normalize(U.GDs.xyz - d * dot(U.GDs.xyz, d));
  let nord = cross(d, ost);
  // Spielball: Halme weichen aus. Quelle: Quick_Grass, public/shaders/grass-lighting-model-vsh.glsl (MIT, © 2023 simondevyoutube):
  // playerFalloff = smoothstep(2.5, 1.0, Abstand Halm–Spieler in der Ebene); dort neigt sich der Halm um playerLeanAngle (0,2 rad) zum Spieler hin.
  // Hier (Auftrag): weg vom Ball, stärker: Biegung D += Richtung weg · falloff · 1,2, Höhe · (1 − 0,6 · falloff).
  if (U.Sa.w > 0.5) {
    let rb = transpose(M) * (base - U.Sp.xyz) / mR;   // Ball → Halmfuß in Metern (Planetenraum)
    let aw = vec2f(dot(rb, ost), dot(rb, nord));
    let fo = smoothstep(2.5, 1.0, length(aw));
    D += normalize(aw + vec2f(1e-6)) * fo * 1.2;
    height *= 1.0 - 0.6 * fo;
  }
  let amt = min(length(D), 0.95);
  let spitze = ecke == 2u * reihen;
  let t = select(f32(ecke / 2u) / f32(reihen), 1.0, spitze);
  let sx = select(f32(ecke % 2u) * 2.0 - 1.0, 0.0, spitze);
  let w = 0.045 * (0.8 + 0.4 * gpRnd(c, 7u)) / sqrt(dens) * pow(1.0 - t, 0.75);
  let camL = transpose(M) * (-base);                 // Kamera vom Fußpunkt aus (Planetenraum)
  let vN = normalize(vec2f(dot(camL, ost), dot(camL, nord)) + vec2f(1e-9));
  let edge = pow(1.0 - abs(dot(vN, f)), 2.0);        // Sicht-Verdickung
  let off = s * sx * w + vec2f(-vN.y, vN.x) * sx * w * 0.6 * edge + D * t * t * height;
  let up = t * height * sqrt(1.0 - amt * amt);
  let bp = (off.x * ost + off.y * nord + up * d) * mR;
  let rel = base + M * bp;
  o.pos = U.vpRel * vec4f(rel, 1.0);
  o.rel = rel;
  let nl = normalize(normalize(f.x * ost + f.y * nord + t * amt * 1.2 * d) + (s.x * ost + s.y * nord) * sx * 0.7);   // gerundete Normale
  o.n = M * nl;
  o.c = vec4f(t, gpRnd(cc, 13u), w3.z, cd);
  o.licht = gListe.licht;
  o.d = d;
  return o;
}
@fragment fn fsGras(i: GV) -> @location(0) vec4f {
  let M = modelM();
  let L = U.sun.xyz;
  let V = normalize(-i.rel);
  var n = normalize(i.n);
  if (dot(n, V) < 0.0) { n = -n; }
  let up = M * i.d;
  let t = max(i.c.x, 0.0);
  var alb = mix(vec3f(0.05, 0.14, 0.03), vec3f(0.28, 0.5, 0.1), pow(t, 0.8));
  alb = mix(alb, vec3f(0.5, 0.45, 0.1) * mix(0.3, 1.0, t), 0.3 * i.c.z * (0.5 + i.c.y));
  let ao = mix(0.2, 1.0, pow(t, 0.7)) * (1.1 - 0.3 * i.c.w);
  let diff = max((dot(n, L) + 0.4) / 1.4, 0.0);
  let tr = pow(max(dot(V, -L), 0.0), 3.0) * pow(t, 1.5);                            // Gegenlicht
  let sp = pow(max(dot(n, normalize(L + V)), 0.0), 40.0) * U.Gi.w * t;   // Glanz (Vorbild 0,12; Regler grasGlanz)
  // Planetensonne und -himmel statt SC/amb des Vorbilds (gleiche Skala wie das Gelände: Bestrahlung / π), je Bild einmal aus csGras.
  // Himmelslicht: Stärke vom Planetenhimmel, Farbe wie im Vorbild (warm unten, blau oben) – vorher rein blau → Farbton 125° statt 86–106°
  let E = i.licht.rgb;
  let amb = himmelAmb(i.licht.a, n, up);
  return vec4f(alb * (E * diff + amb + E * tr * 1.6) * ao + E * sp, 1.0);
}
`;

// Gras AUS: nicht mitkompiliert, die Pipeline wird nicht gebaut.
export const GRAS_AUS = `
fn hook_gras_boden(alb: vec3f, d: vec3f, rel: vec3f) -> vec4f { return vec4f(alb, 0.0); }
`;
