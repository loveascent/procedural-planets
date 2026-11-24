// Baustein „Argh-Volumen“: der Volumen-Gasriese aus Arghanions Blender-Tutorial („Create an Epic Volumetric Gas Giant!“, YouTube CrAn6j8S1gg),
// Nodebaum als Mathematik nachgebaut in loveascent/gasriese-volumen-demo (bloecke/wgsl/medium.js, licht.js). Einhängepunkt: hook_argh.
// Unterschied zum Video: die Farbquelle C ist NICHT ein Foto, sondern der live simulierte Farbstoff dieses Gasriesen (dyeTex).
// Darum verwirbelt das Volumen mit der Strömung, statt still zu stehen.
//
// Seine Dichte (medium.js): q = mix(p, p·C, f) = p ⊙ (1 − f + f·C)  (Mix Color, Multiply, Fac f; Vektor ⊙ Farbe komponentenweise wie in Blender),
//   g = max(0,999999 − |q|, 0) (Gradient Spherical), d = [g ≥ t] (ColorRamp Constant), σ_t = Dichte · d.
// Maßstab: Die äußerste mögliche Haut (C = 0) soll auf dem Planeten-Ellipsoid liegen. Mit p = hs·(1 − t)/(1 − f) (hs = Ellipsoid-Koordinate,
//   |hs| = 1 auf der Oberfläche) wird g ≥ t  ⇔  |hs ⊙ (1 − f + f·C)| ≤ 1 − f. Die Rampenstelle t kürzt sich heraus; die Form hängt nur an f.
// Sein Licht (licht.js, trace + sunT; Cycles Standard, Volume Bounces 0):  L = ∫ T(0,s) σ_s f_HG E T_sonne ds.
//   Bei dichtem Medium (σ·Schritt ≫ 1, wie im Video: „Constant“ macht die Haut undurchsichtig) bricht seine Schleife beim ersten Schritt im Medium ab
//   (T < 0,003): L = Albedo · f_HG · E · T_sonne am ersten Streupunkt. Genau das rechnet dieser Baustein, ohne Aufsummieren über viele Bilder:
//   Treffer suchen (48 Schritte durch die Schale, 6 Halbierungen), Streupunkt eine halbe freie Weglänge (½/σ) in der Haut, Schattenstrahl zur Sonne.
//   f_HG mal 4π, damit g = 0 die Helligkeit der übrigen Darstellung behält (Lambert-Vollsonne = 1).
// Farbquelle C (Image Texture): Ansatz B = der live simulierte Farbstoff; Ansatz A = die feste Referenzkarte, abgetastet über die vom Wind mitgeführte Rückabbildung
// (Baustein Argh-Karte, sim: advectWarp). Nur eine der beiden Fassungen wird kompiliert.
export const ARGH_FARBE_DYE = /* wgsl */`
fn arghFarbeL(hs: vec3f, lod: f32) -> vec3f { return textureSampleLevel(dyeTex, samp, normalize(hs), 0.0).rgb; }
`;
export const ARGH_FARBE_KARTE = /* wgsl */`
@group(0) @binding(7) var refTex: texture_cube<f32>;
@group(0) @binding(8) var warpTex: texture_cube<f32>;
fn arghFarbeL(hs: vec3f, lod: f32) -> vec3f {
  let q = normalize(hs);
  let w = q + textureSampleLevel(warpTex, samp, q, 0.0).xyz;                 // M(q) = q + d(q), d als Abweichung gespeichert
  return textureSampleLevel(refTex, samp, normalize(w), lod).rgb;
}
`;
export const ARGH = /* wgsl */`
struct ArghOut { an: i32, t: f32, farbe: vec3f, T: f32 };   // an: 0 = Baustein aus, 1 = Haut getroffen, 2 = Strahl streift durch die Schale (Himmel/Saum); T = Resttransmission hinter der Haut
fn arghDicht(hs: vec3f) -> f32 {
  let f = U.p8.y;
  let C = arghFarbeL(hs, U.p9.z);                                         // Image Texture, Höhe geglättet (Mip-Stufe U.p9.z)
  // ColorRamp: das Demo kennt „Constant“ (Stufe) und „Linear“ (Zwischenstand im Tutorial, weich). Hier eine weiche Rampe der Breite U.p9.w (Planetenradien) ab der Hautkante:
  // Dichte σ·smoothstep(0, w, g) mit g = (1 − f) − |q|. Das ersetzt die Mittelung über viele zufällige Bilder: Kanten sind durchscheinend, ohne Rauschen.
  let g = (1.0 - f) - length(hs * (1.0 - f + f * C));
  return U.p8.z * smoothstep(0.0, max(U.p9.w, 1e-4), g);
}
fn arghHg(cosT: f32, g: f32) -> f32 { let d = 1.0 + g * g - 2.0 * g * cosT; return (1.0 - g * g) / pow(max(d, 1e-4), 1.5); }   // 4π · Henyey-Greenstein
// Schattenstrahl (sunT im Nachbau): exp(−∫σ ds) bis zur äußeren Hülle, Abbruch bei τ > 12 wie dort; Schritte: U.p9.y
fn arghSchatten(p: vec3f, sun: vec3f, s: vec3f) -> f32 {
  let ps = p * s; let su = sun * s; let a2 = dot(su, su); let b2 = dot(ps, su);
  let te = max((-b2 + sqrt(max(b2 * b2 - a2 * (dot(ps, ps) - 1.0), 0.0))) / a2, 0.0);
  let n = i32(U.p9.y);
  let h2 = te / f32(n); var tau = 0.0;
  for (var j = 0; j < n; j++) { tau += arghDicht((p + sun * (h2 * (f32(j) + 0.5))) * s) * h2; if (tau > 12.0) { break; } }
  return exp(-tau);
}
fn hook_argh(o: vec3f, d: vec3f, sun: vec3f, c: f32, tPlanet: f32, mode: i32) -> ArghOut {
  var r = ArghOut(0, -1.0, vec3f(0.0), 0.0);
  if (mode != 0 || U.p8.x < 0.5 || tPlanet < 0.0) { return r; }
  let f = U.p8.y; let s = vec3f(1.0, 1.0 / c, 1.0);
  let os = o * s; let ds = d * s; let a = dot(ds, ds); let b = dot(os, ds);
  let rin = 1.0 - f;                                                     // innerhalb |hs| < 1 − f ist alles dicht (C ≤ 1)
  let din = b * b - a * (dot(os, os) - rin * rin);
  var tEnd = (-b + sqrt(max(b * b - a * (dot(os, os) - 1.0), 0.0))) / a;  // Austritt aus der äußeren Hülle
  if (din > 0.0) { tEnd = (-b - sqrt(din)) / a; }                         // oder Eintritt in den dichten Kern
  let N = 32; let h = (tEnd - tPlanet) / f32(N);
  var lo = tPlanet; var hi = tEnd; var hit = false;
  for (var i = 1; i <= N; i++) {
    let t = tPlanet + h * f32(i);
    if (arghDicht((o + d * t) * s) > 0.0) { hi = t; hit = true; break; }
    lo = t;
  }
  if (!hit && din <= 0.0) { r.an = 2; return r; }                         // buckelige Silhouette: vorbei
  for (var k = 0; k < 6; k++) { let m = 0.5 * (lo + hi); if (arghDicht((o + d * m) * s) > 0.0) { hi = m; } else { lo = m; } }
  // Tiefe Nachtseite überspringen (exakt, kein sichtbarer Unterschied): ein Punkt der Haut liegt höchstens bei Radius 1 über dem dichten Kern (Radius 1 − f);
  // der Sonnenstrahl bleibt im Kern gefangen, sobald dot(n, Sonne) < −√(1 − (1 − f)²). Dort ist die Haut schwarz, Schattenstrahlen wären verschwendet.
  let ndl = dot(normalize((o + d * hi) * s), sun);
  if (ndl < -(sqrt(max(1.0 - rin * rin, 0.0)) + 0.03)) { r.an = 1; r.t = hi; r.farbe = vec3f(0.0); r.T = 0.0; return r; }
  let ph = arghHg(dot(-sun, d), U.p8.w) * U.sun.w;
  let K = i32(U.p9.x);
  if (K <= 0) {
    // harte Haut: ein Streupunkt eine halbe freie Weglänge unter dem Treffer
    let p = o + d * (hi + 0.5 / max(U.p8.z, 1.0));
    r.an = 1; r.t = hi; r.farbe = arghFarbeL(p * s, 0.0) * hook_ringschatten(arghSchatten(p, sun, s) * ph, p, sun);
    return r;
  }
  // weiche Haut: die Einfachstreuung des Nachbaus, L = Σ T·(1 − e^(−σ·h))·C·f_HG·E·T_sonne, entlang des Strahls ab dem Treffer in K Schritten
  // von 6/K freien Weglängen (Mittelpunktregel, ohne Zufall: kein Rauschen); die Schleife des Nachbaus (licht.js, trace) bricht bei T < 0,003 ab, hier nach K Schritten
  let sig = max(U.p8.z, 1.0); let hk = 6.0 / (sig * f32(K));
  var T = 1.0; var L = vec3f(0.0);
  for (var k = 0; k < K; k++) {
    let p = o + d * (hi + hk * (f32(k) + 0.5));
    let dd = arghDicht(p * s);
    if (dd > 0.0) {
      let a1 = exp(-dd * hk);
      L += T * (1.0 - a1) * arghFarbeL(p * s, 0.0) * hook_ringschatten(arghSchatten(p, sun, s) * ph, p, sun);
      T *= a1;
    }
  }
  r.an = 1; r.t = hi; r.farbe = L; r.T = T;
  return r;
}
// Dunstschale statt Leuchtsaum: Dichte 0,35·Stärke je Planetenradius bis zur Ellipsoid-Fläche (Radius 1) und innen konstant, außen linear auf 0 bei +6 % Radius (Form der Rampe der
// Atmosphäre im Demo), Einfachstreuung mit Sonnenlicht, tagseitig. Der Dunst reicht bis zur Haut (tHit) bzw. bei Strahlen, die die Haut verfehlen, durch die ganze Schale:
// endete er an der Ellipsoid-Fläche, entstünde ein dunkles Band dort, wo die Haut tiefer liegt. Rückgabe: rgb = Streulicht, w = Transmission.
fn hook_argh_dunst(o: vec3f, d: vec3f, sun: vec3f, c: f32, tHit: f32, mode: i32) -> vec4f {
  if (mode != 0 || U.p8.x < 0.5 || U.atmo.w <= 0.0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let hz = 0.06; let s = vec3f(1.0, 1.0 / c, 1.0);   // Schale 6 % des Radius: dünn wie eine echte Wolkenobergrenze-Atmosphäre
  let os = o * s; let ds = d * s; let a = dot(ds, ds); let b = dot(os, ds);
  let disc = b * b - a * (dot(os, os) - (1.0 + hz) * (1.0 + hz));
  if (disc <= 0.0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let sq = sqrt(disc);
  let t0 = max((-b - sq) / a, 0.0);
  var t1 = (-b + sq) / a;
  if (tHit >= 0.0) { t1 = min(t1, tHit); }
  if (t1 <= t0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let n = 6; let h = (t1 - t0) / f32(n);
  let A = 0.35 * U.atmo.w;
  var T = 1.0; var L = vec3f(0.0);
  for (var i = 0; i < n; i++) {
    let hs = (o + d * (t0 + h * (f32(i) + 0.5))) * s;
    let rho = A * clamp((1.0 + hz - length(hs)) / hz, 0.0, 1.0);
    let a1 = exp(-rho * h);
    L += T * (1.0 - a1) * U.atmo.rgb * smoothstep(-0.15, 0.45, dot(normalize(hs), sun)) * U.sun.w;
    T *= a1;
  }
  return vec4f(L, T);
}
`;

export const ARGH_AUS = /* wgsl */`
struct ArghOut { an: i32, t: f32, farbe: vec3f, T: f32 };
fn hook_argh(o: vec3f, d: vec3f, sun: vec3f, c: f32, tPlanet: f32, mode: i32) -> ArghOut { return ArghOut(0, -1.0, vec3f(0.0), 0.0); }
fn hook_argh_dunst(o: vec3f, d: vec3f, sun: vec3f, c: f32, tHit: f32, mode: i32) -> vec4f { return vec4f(0.0, 0.0, 0.0, 1.0); }
`;
