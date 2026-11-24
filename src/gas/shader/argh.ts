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
export const ARGH = /* wgsl */`
struct ArghOut { an: i32, t: f32, farbe: vec3f };   // an: 0 = Baustein aus, 1 = Haut getroffen, 2 = Strahl streift durch die Schale (Himmel/Saum)
fn arghDicht(hs: vec3f) -> f32 {
  let f = U.p8.y;
  let C = textureSampleLevel(dyeTex, samp, normalize(hs), 0.0).rgb;      // Image Texture → live Farbstoff
  return select(0.0, U.p8.z, length(hs * (1.0 - f + f * C)) <= 1.0 - f);
}
fn arghHg(cosT: f32, g: f32) -> f32 { let d = 1.0 + g * g - 2.0 * g * cosT; return (1.0 - g * g) / pow(max(d, 1e-4), 1.5); }   // 4π · Henyey-Greenstein
fn hook_argh(o: vec3f, d: vec3f, sun: vec3f, c: f32, tPlanet: f32, mode: i32) -> ArghOut {
  var r = ArghOut(0, -1.0, vec3f(0.0));
  if (mode != 0 || U.p8.x < 0.5 || tPlanet < 0.0) { return r; }
  let f = U.p8.y; let s = vec3f(1.0, 1.0 / c, 1.0);
  let os = o * s; let ds = d * s; let a = dot(ds, ds); let b = dot(os, ds);
  let rin = 1.0 - f;                                                     // innerhalb |hs| < 1 − f ist alles dicht (C ≤ 1)
  let din = b * b - a * (dot(os, os) - rin * rin);
  var tEnd = (-b + sqrt(max(b * b - a * (dot(os, os) - 1.0), 0.0))) / a;  // Austritt aus der äußeren Hülle
  if (din > 0.0) { tEnd = (-b - sqrt(din)) / a; }                         // oder Eintritt in den dichten Kern
  let N = 48; let h = (tEnd - tPlanet) / f32(N);
  var lo = tPlanet; var hi = tEnd; var hit = false;
  for (var i = 1; i <= N; i++) {
    let t = tPlanet + h * f32(i);
    if (arghDicht((o + d * t) * s) > 0.0) { hi = t; hit = true; break; }
    lo = t;
  }
  if (!hit && din <= 0.0) { r.an = 2; return r; }                         // buckelige Silhouette: vorbei
  for (var k = 0; k < 6; k++) { let m = 0.5 * (lo + hi); if (arghDicht((o + d * m) * s) > 0.0) { hi = m; } else { lo = m; } }
  let p = o + d * (hi + 0.5 / max(U.p8.z, 1.0));                          // erster Streupunkt: ½ freie Weglänge in der Haut
  // Schattenstrahl (sunT): exp(−∫σ ds) bis zur äußeren Hülle, 24 Schritte, Abbruch bei τ > 12 wie im Nachbau
  let ps = p * s; let su = sun * s; let a2 = dot(su, su); let b2 = dot(ps, su);
  let te = max((-b2 + sqrt(max(b2 * b2 - a2 * (dot(ps, ps) - 1.0), 0.0))) / a2, 0.0);
  let h2 = te / 24.0; var tau = 0.0;
  for (var j = 0; j < 24; j++) { tau += arghDicht((p + sun * (h2 * (f32(j) + 0.5))) * s) * h2; if (tau > 12.0) { break; } }
  let C = textureSampleLevel(dyeTex, samp, normalize(p * s), 0.0).rgb;    // Albedo = HSV(C), Hue/Sat/Val neutral
  let licht = exp(-tau) * arghHg(dot(-sun, d), U.p8.w) * U.sun.w;
  r.an = 1; r.t = hi; r.farbe = C * hook_ringschatten(licht, p, sun);
  return r;
}
`;

export const ARGH_AUS = /* wgsl */`
struct ArghOut { an: i32, t: f32, farbe: vec3f };
fn hook_argh(o: vec3f, d: vec3f, sun: vec3f, c: f32, tPlanet: f32, mode: i32) -> ArghOut { return ArghOut(0, -1.0, vec3f(0.0)); }
`;
