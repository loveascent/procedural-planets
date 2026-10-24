// Einschlagkrater für den Mond (ersetzt die Vulkanformel, gleiche Einhängepunkte wie volc.js: Höhe + Gradient je Kugelpunkt).
// Aufbau wie volc.js: Gitterzellen, ein Krater je Zelle (Worley-artig), Profil mit analytischem Gradienten.
// Neu gegenüber den Vulkanen: Größenstufen (jede halb so groß, Zellen 4× so viele), Profil nach den Tiefengesetzen des Mondes
// (Pike 1977: einfache Krater d = 0,196·D bis ~15 km, komplexe d = 1,044·D^0,301 km; Randhöhe h = 0,036·D^0,399 km),
// flacher Boden + Zentralberg bei komplexen Kratern, Verfall durch Bodenkriechen (kleine Krater werden zuerst flach).
// Einheiten: Kugelradius = 1737 km; Höhe in "Reliefeinheiten" (1 = 0,018 Radien, wie bei den Vulkanen).
export const KRATER = /* wgsl */`
const MOND_KM = 1737.4;
const REL_E = 0.018;
// Profil in t = r/R (R = Kraterradius): Rückgabe (Höhe in Radien, d/dt)
fn kraterProfil(t: f32, dRad: f32, rimRad: f32, komplex: f32, peak: f32) -> vec2f {
  var h = 0.0;
  var dh = 0.0;
  if (t < 1.0) {
    // Schüssel (einfach: Parabel, komplex: breiter flacher Boden mit steilem Wandanstieg)
    let t0 = 0.55 * komplex;
    let u = clamp((t - t0) / (1.0 - t0), 0.0, 1.0);
    let w = u * u * (3.0 - 2.0 * u);
    let wq = mix(t * t, w, komplex);
    h = -dRad * (1.0 - wq);
    let dwq = mix(2.0 * t, 6.0 * u * (1.0 - u) / (1.0 - t0) * select(0.0, 1.0, t > t0), komplex);
    dh = dRad * dwq;
    // Zentralberg (nur komplexe Krater): Glockenform, Höhe ≈ 0,3 d
    let pk = komplex * peak * dRad * 0.3;
    let e = exp(-(t * t) / 0.045);
    h += pk * e;
    dh += pk * e * (-2.0 * t / 0.045);
    // Rand: scharfer Wulst bei t = 1
    let rw = 0.11;
    let er = exp(-((t - 1.0) * (t - 1.0)) / (rw * rw));
    h += rimRad * er;
    dh += rimRad * er * (-2.0 * (t - 1.0) / (rw * rw));
  } else {
    // Auswurfdecke: fällt ~ t^-3 ab, endet bei t = 1,3
    let fade = 1.0 - smoothstep(1.0, 1.3, t);
    let s = pow(1.0 / t, 3.0);
    h = rimRad * s * fade;
    dh = rimRad * (-3.0 * s / t) * fade - rimRad * s * (6.0 * (t - 1.0) * (1.3 - t) / 0.027) * select(0.0, 1.0, t < 1.3);
  }
  return vec2f(h, dh);
}
// Krater aller Größenstufen: Rückgabe (Höhe in Reliefeinheiten, Gradient 3D) – gleiche Form wie volcanoes()
fn kraterAlle(d: vec3f, dens: f32, seed: f32) -> vec4f {
  var o = vec4f(0.0);
  var frq = 3.0;
  for (var k = 0; k < 8; k++) {
    let q = d * frq;
    let base = floor(q - 0.5);
    let pk = clamp(dens * 2.2 * pow(1.2, f32(k)), 0.0, 1.0);
    for (var c = 0; c < 8; c++) {
      let id = base + vec3f(f32(c & 1), f32((c >> 1) & 1), f32((c >> 2) & 1));
      let hv = hash33(id + vec3f(31.7 * f32(k) + seed * 0.0071, 17.3, 7.1));
      if (hv.x > pk) { continue; }
      let ctr = id + 0.5 + (hv.yzx - 0.5) * 0.5;
      let rc = 0.17 + 0.22 * hash13(id * 1.7 + vec3f(f32(k), 4.0, 2.0));
      let lc = length(ctr);
      let w = lc - frq;
      if (abs(w) >= rc) { continue; }
      let rq = sqrt(rc * rc - w * w);                  // Radius des Schnitts mit der Kugelschale
      let cc = ctr / lc;                                // Mittelpunkt auf der Einheitskugel
      let dv = d - cc;
      let r = length(dv);
      let R = rq / frq;                                 // Kraterradius in Kugelradien
      let t = r / R;
      if (t >= 1.3) { continue; }
      let Dkm = 2.0 * R * MOND_KM;
      // Tiefengesetze des Mondes
      let dSimple = 0.196 * Dkm;
      let dComplex = 1.044 * pow(Dkm, 0.301);
      let komplex = smoothstep(11.0, 22.0, Dkm);
      let dKm = mix(dSimple, dComplex, komplex);
      let rimKm = 0.036 * pow(Dkm, 0.399);
      // Verfall: Bodenkriechen ~ 1/D², dazu zufälliges Alter
      let age = clamp(hash13(id * 0.77 + vec3f(5.0, f32(k), 1.0)) * 0.8 + clamp(0.3 * log2(30.0 / max(Dkm, 0.5)), 0.0, 0.9), 0.0, 1.0);
      let keep = 1.0 - 0.85 * age;
      let dRad = dKm / MOND_KM * keep;
      let rimRad = rimKm / MOND_KM * (1.0 - 0.9 * age);
      let P = kraterProfil(t, dRad, rimRad, komplex, step(0.5, hash13(id * 3.1 + 1.0)));
      let dir = dv / max(r, 1e-6);
      o += vec4f(P.x / REL_E, (P.y / R / REL_E) * dir);
    }
    frq *= 2.0;
  }
  return o;
}

// Einhängepunkte (siehe volc.js)
fn hook_vulkan_hoehe(d: vec3f, dens: f32, seed: f32, sup: f32) -> vec4f { return kraterAlle(d, dens, seed); }
fn hook_vulkan_krater(d: vec3f, dens: f32, seed: f32, sup: f32) -> f32 { return 0.0; }
`;
