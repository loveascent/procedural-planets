import { P, type Block } from '../typen';

// Baustein Große Einschläge: einzeln gesetzte Becken (Orientale, Herschel auf Mimas, Odysseus auf Tethys, Caloris).
// Profil in Beckenradien R: Schüssel mit flachem Boden, Gipfelring bei 0,45 R, Hauptrand bei 1 R, Außenringe bei 1,5 R und 2,1 R (Stufen nach außen
// abfallend, Mehrringbecken), Auswurfdecke ∝ x⁻³ bis 3,5 R. Das Becken senkt das Tieflandpotenzial: Maria fluten später genau diese Becken (Imbrium, Serenitatis).
// Junge Becken tragen Strahlensysteme über viele Radien (Tycho, Copernicus). Positionen, Größen, Alter kommen aus dem Seed.
export const EINSCHLAEGE: Block = {
  id: 'einschlaege', de: 'Große Einschläge (Becken, Strahlen)', en: 'Large impacts (basins, rays)', gruppe: 'relief', an: true,
  note: ['Einzelne riesige Becken mit Ringen und Auswurf; die jungen haben Strahlen über die halbe Welt.', 'A few huge basins with rings and ejecta; the young ones have rays across half the world.'],
  par: [
    P('anz', 'Anzahl', 'Count', 0, 14, 1, 7, 'Wie viele große Einschläge. Der Erdmond hat ~30 Becken über 300 km, Mimas eines (Herschel), Callisto die Mehrringstruktur Valhalla.', 'How many large impacts. The Moon has ~30 basins over 300 km, Mimas one (Herschel), Callisto the multi-ring structure Valhalla.'),
    P('gross', 'Größter Radius', 'Largest radius', 0.08, 0.8, 0.005, 0.3, 'Radius des größten Beckens (Bogenmaß). 0,3 ≈ 1 700 km Durchmesser beim Mond (wie Südpol–Aitken). Herschel auf Mimas: 0,35.', 'Radius of the largest basin (radians). 0.3 ≈ 1,700 km diameter on the Moon (like South Pole–Aitken). Herschel on Mimas: 0.35.'),
    P('klein', 'Kleinster Radius', 'Smallest radius', 0.02, 0.3, 0.005, 0.07, 'Radius des kleinsten Einzeleinschlags.', 'Radius of the smallest single impact.'),
    P('tiefe', 'Tiefe', 'Depth', 0, 0.1, 0.001, 0.028, 'Tiefe des größten Beckens in Radien des Mondes (0,028 ≈ 48 km).', 'Depth of the largest basin in moon radii (0.028 ≈ 48 km).'),
    P('ringe', 'Ringe', 'Rings', 0, 1.5, 0.01, 0.8, 'Stärke der konzentrischen Ringgebirge und Steilstufen (Mehrringbecken).', 'Strength of the concentric ring mountains and scarps (multi-ring basins).'),
    P('auswurf', 'Auswurf', 'Ejecta', 0, 2.5, 0.01, 1, 'Dicke der Auswurfdecke und der Randwulst.', 'Thickness of the ejecta blanket and rim wall.'),
    P('jung', 'Junge Becken', 'Young basins', 0, 1, 0.01, 0.4, 'Anteil der Einschläge mit frischem, scharfem Relief und Strahlen.', 'Fraction of impacts with fresh sharp relief and rays.'),
    P('strahlen', 'Strahlen', 'Rays', 0, 2, 0.01, 1, 'Helligkeit der Strahlensysteme junger Einschläge.', 'Brightness of the ray systems of young impacts.'),
    P('laenge', 'Strahlenlänge', 'Ray length', 2, 14, 0.1, 8, 'Reichweite der Strahlen in Kraterradien.', 'Reach of the rays in crater radii.'),
    P('flut', 'Flutungsneigung', 'Flooding bias', 0, 1.5, 0.01, 1, 'Wie stark Becken das Tieflandpotenzial erhöhen und damit später von Lava gefüllt werden.', 'How strongly basins raise the lowland potential and are thus filled by lava later.'),
  ],
  wgsl: /* wgsl */`
struct Imp { c: vec3f, R: f32, age: f32, id: f32 }
fn impact(i: i32) -> Imp {
  let sd = gseed();
  let hv = hash33(vec3f(f32(i) * 1.731 + 0.5, sd * 0.37 + 11.0, 3.3));
  let h2 = hash33(vec3f(f32(i) * 2.917 + 4.0, sd * 0.53 + 2.0, 8.1));
  var m: Imp;
  m.c = sphPoint(hv);
  m.R = mix($einschlaege_klein, $einschlaege_gross, pow(h2.x, 2.4));
  if (i == 0) { m.R = $einschlaege_gross; }
  m.age = select(0.3 + 0.7 * h2.y, 0.25 * h2.y, h2.z < $einschlaege_jung);
  m.id = f32(i);
  return m;
}
fn h_einschlaege(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let n = i32($einschlaege_anz);
  var h = (*s).h;
  var low = (*s).low;
  var cav = (*s).cav;
  for (var i = 0; i < 14; i++) {
    if (i >= n) { break; }
    let m = impact(i);
    let th = angDist(d, m.c);
    if (th > m.R * 3.6) { continue; }
    var x = th / m.R;
    x *= 1.0 + 0.05 * snoise(d * (3.0 / m.R) + vec3f(m.id * 3.1, 1.0, 2.0));
    let rel = m.R / $einschlaege_gross;
    let dep = $einschlaege_tiefe * pow(rel, 0.7) * (1.0 - 0.45 * m.age);
    var hh = 0.0;
    if (x < 1.0) {
      let wall = sstep(0.55, 1.0, x);
      hh = -dep * (1.0 - pow(wall, 1.4));
      hh += $einschlaege_ringe * dep * 0.32 * exp(-sq2((x - 0.42) / 0.07)) * (1.0 - 0.5 * m.age);
      hh += $einschlaege_auswurf * dep * 0.18 * exp(-sq2((1.0 - x) / 0.07));
    } else {
      let fade = 1.0 - sstep(2.4, 3.5, x);
      hh = $einschlaege_auswurf * dep * 0.18 * pow(1.0 / x, 3.0) * fade * (1.0 - 0.4 * m.age);
      // Außenringe als nach außen abfallende Stufen (Cordillera, Rook)
      for (var r = 0; r < 2; r++) {
        let xr = 1.0 + 0.55 * f32(r + 1) + 0.1 * f32(r);
        let u = (x - xr) / 0.06;
        hh += $einschlaege_ringe * dep * (0.30 - 0.12 * f32(r)) * (1.0 - 0.6 * m.age) * (exp(-u * u) - 0.9 * sstep(-0.5, 2.0, u) * exp(-0.12 * u * u) * 0.0);
      }
    }
    h = (h - (*s).form) * (1.0 - 0.9 * (1.0 - sstep(0.7, 1.0, x))) + (*s).form + hh;
    low += $einschlaege_flut * 0.85 * (1.0 - sstep(0.55, 1.1, x));
    cav = max(cav, 1.0 - sstep(0.8, 1.0, x));
  }
  (*s).h = h; (*s).low = clamp(low, 0.0, 1.0); (*s).cav = cav;
}
fn c_einschlaege(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let n = i32($einschlaege_anz);
  var br = 0.0;
  for (var i = 0; i < 14; i++) {
    if (i >= n) { break; }
    let m = impact(i);
    if (m.age > 0.25) { continue; }
    let th = angDist(d, m.c);
    let x = th / m.R;
    if (x < 0.98 || x > $einschlaege_laenge) { continue; }
    let te = tangents(m.c);
    let v = d - m.c;
    let ang = atan2(dot(v, te[1]), dot(v, te[0]));
    let nr = 11.0 + floor(hash13(vec3f(m.id, gseed(), 5.0)) * 12.0);
    let lane = snoise(vec3f(ang * 2.1 + m.id * 9.0, x * 0.6, 1.0));
    let pat = pow(clamp(0.5 + 0.5 * sin(ang * nr + 2.2 * lane + m.id * 13.0), 0.0, 1.0), 4.0);
    let fall = pow(1.0 / x, 1.3) * (1.0 - sstep(0.6 * $einschlaege_laenge, $einschlaege_laenge, x));
    let rim = (1.0 - sstep(1.0, 2.2, x));
    br = max(br, (pat * fall * 1.4 + rim * 0.8) * (1.0 - m.age / 0.25 * 0.5));
  }
  (*s).col *= 1.0 + $einschlaege_strahlen * 1.4 * br;
}
`,
  h: { becken: 'h_einschlaege' },
  c: 'c_einschlaege', corder: 22,
};
