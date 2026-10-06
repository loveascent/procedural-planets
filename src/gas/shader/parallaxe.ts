// Baustein Parallaxe mit Eigenschatten auf gekrümmter Fläche (Parallax Occlusion Mapping, Tatarchuk 2006). Einhängepunkt: hook_parallaxe.
export const PARALLAXE = /* wgsl */`
// Höhe 0..1 für die Parallaxe: Helligkeit (wie Relief) plus Tiefe aus der Physik, falls an
fn pomHeight(q: vec3f) -> f32 {
  var h = (lumAt(q) - 0.55) * 3.0 * min(U.p0.y, 1.0);
  if (U.p5.x > 0.5) { h += depthAt(q) * U.p5.y; }
  return clamp(0.5 + 0.5 * h, 0.0, 1.0);
}
struct PomOut { q: vec3f, schatten: f32 }
fn hook_parallaxe(q0: vec3f, d: vec3f, n: vec3f, sun: vec3f, mode: i32) -> PomOut {
  var q = q0;
  var pomShadow = 1.0;
  if (mode == 0 && U.p6.x > 0.5) {
    let v0 = -d;
    let nv = max(dot(v0, n), 0.15);
    let H = U.p6.y * 0.003;
    let dirT = -(v0 - n * dot(v0, n)) / nv;
    for (var i = 1; i <= 24; i++) {
      let rd = H * f32(i) / 24.0;
      let qi = normalize(q0 + dirT * rd);
      if (rd >= H * (1.0 - pomHeight(qi))) { q = qi; break; }
    }
    // Eigenschatten: vom Treffer Richtung Sonne laufen. Der Strahl steigt mit der Sonnenhöhe (tan) UND die Kugel
    // krümmt sich unter ihm weg (t²/2 bei Radius 1). Ohne Krümmung würde nahe der Tag-Nacht-Grenze alles
    // abgeschattet (flache Scheibe statt Kugel) – das war die harte Linie. Schattenlänge höchstens H/tan.
    let nl = dot(sun, n);
    if (U.p6.z > 0.0 && nl > 0.0) {
      let sd = sun - n * nl;
      let sl = length(sd);
      if (sl > 1e-4) {
        let sT = sd / sl;
        let tanE = nl / max(sl, 1e-3);
        let maxT = min(H / max(tanE, 0.02), 0.03);
        let h0 = pomHeight(q) * H;
        var occ = 0.0;
        for (var j = 1; j <= 12; j++) {
          let t = maxT * f32(j) / 12.0;
          let ray = h0 + t * tanE + 0.5 * t * t;
          let hs = pomHeight(normalize(q + sT * t)) * H;
          // weicher Halbschatten: je tiefer der Strahl unter dem Gelände, desto dunkler
          occ = max(occ, clamp((hs - ray) / (0.25 * H), 0.0, 1.0));
        }
        pomShadow = 1.0 - 0.7 * clamp(occ * U.p6.z, 0.0, 1.0);
      }
    }
  }
  return PomOut(q, pomShadow);
}
`;

export const PARALLAXE_AUS = /* wgsl */`
struct PomOut { q: vec3f, schatten: f32 }
fn hook_parallaxe(q0: vec3f, d: vec3f, n: vec3f, sun: vec3f, mode: i32) -> PomOut { return PomOut(q0, 1.0); }
`;
