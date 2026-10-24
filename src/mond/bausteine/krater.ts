import { P, type Block } from '../typen';

// Baustein Krater: eine Einschlagspopulation über viele Größenstufen.
// Verfahren (eigene Umsetzung): Jede Stufe k legt ein 3D-Gitter mit f = f0·2^k Zellen pro Radius über die Kugel. Eine Zelle trägt mit Wahrscheinlichkeit p
// eine Kugel (Mittelpunkt zufällig in der Zelle, Radius Rc); die Kugel schneidet die Mondoberfläche in einem Kreis mit r = √(Rc² − w²)
// (w = Abstand des Mittelpunkts von der Oberfläche). So entstehen von selbst viele Größen und kein Gittermuster. Alle acht nächsten Zellen genügen,
// weil Rc ≤ 0,5 und die Auswurfdecke bei 3D-Abstand 0,85 ausläuft.
// Größenverteilung: gleiche Bedeckung je Oktave entspricht der kumulativen Steigung −2 (Neukum: −2 bis −3,8; „Steilheit“ verschiebt zu kleinen Kratern).
// Profil: einfache Krater sind Parabelschalen (Tiefe/Durchmesser 0,2, Wandneigung ~38°), ab dem Übergangsradius „komplex“: flacher Boden,
// Terrassenwände, Zentralberg, Tiefe/Durchmesser fällt auf ~0,06 (Pike 1977, Melosh 1989). Rand: steile Innenseite, Auswurfdecke ∝ x^-3.
// Alterung (Diffusion, Mikrometeoriten) verflacht Tiefe und Rand; junge Krater sind hell (unreifer Regolith) mit Strahlen.
export const KRATER: Block = {
  id: 'krater', de: 'Krater (Einschläge)', en: 'Craters (impacts)', gruppe: 'relief', an: true,
  note: ['Tausende Krater in allen Größen: Schüsseln, Terrassenkrater mit Zentralberg, Auswurfdecken, Alterung, helle Strahlen. Die kleinsten rechnet das Bild live, daher kein Auflösungslimit beim Zoomen.', 'Thousands of craters of all sizes: bowls, terraced craters with central peaks, ejecta blankets, ageing, bright rays. The smallest ones are computed live, so zooming has no resolution limit.'],
  par: [
    P('dichte', 'Dichte', 'Density', 0, 2, 0.01, 1, 'Anteil der Zellen mit Krater je Größenstufe. 1 ≈ Sättigung der Hochländer (Krater überlappen und löschen einander), 0,2 = junge Oberfläche wie Io oder Europa, 2 = vollständig zerhackt.', 'Fraction of cells with a crater per size step. 1 ≈ saturated highlands (craters overlap and erase each other), 0.2 = young surface like Io or Europa, 2 = completely shattered.'),
    P('steil', 'Steilheit der Verteilung', 'Size slope', -1, 2, 0.01, 0.5, 'Verschiebt die Größenverteilung: positiv = mehr kleine Krater (steile Produktionsfunktion), negativ = überwiegend große. 0 = gleiche Fläche je Größenstufe (Steigung −2).', 'Shifts the size distribution: positive = more small craters (steep production function), negative = mostly large. 0 = equal area per size step (slope −2).'),
    P('gross', 'Größte Kraterstufe', 'Largest crater step', 0.6, 8, 0.05, 1.6, 'Zellen pro Radius der gröbsten Stufe. 1,6 → größte Krater ~15° Radius; 6 → nur kleine Krater, glatte Welt.', 'Cells per radius of the coarsest step. 1.6 → largest craters ~15° radius; 6 → only small craters, smooth world.'),
    P('okt', 'Stufen', 'Steps', 2, 16, 1, 12, 'Anzahl der Größenstufen (jede halb so groß). Mehr Stufen kosten Rechenzeit, bringen aber feinere Krater.', 'Number of size steps (each half as big). More steps cost time but bring finer craters.'),
    P('alt', 'Stufen vor der Flutung', 'Steps before flooding', 0, 10, 1, 4, 'So viele der größten Stufen entstehen vor den Lavameeren (Baustein Maria): sie werden überflutet, nur ihre Ränder schauen noch heraus („Geisterkrater“). Alle kleineren sind jünger und liegen auf den Maria.', 'This many of the largest steps form before the lava seas (Maria block): they get flooded and only their rims poke out (“ghost craters”). All smaller ones are younger and sit on the maria.'),
    P('tiefe', 'Tiefe/Durchmesser', 'Depth/diameter', 0.02, 0.4, 0.005, 0.2, 'Verhältnis frischer, einfacher Krater: Mond 0,2; Merkur ~0,17; eisige Monde flacher (0,1), weil Eis fließt. Poröse Körper (Hyperion) schlucken mehr: 0,35.', 'Ratio of fresh simple craters: Moon 0.2; Mercury ~0.17; icy moons shallower (0.1) because ice flows. Porous bodies (Hyperion) swallow more: 0.35.'),
    P('rand', 'Randhöhe', 'Rim height', 0, 2.5, 0.01, 1, 'Höhe des aufgeworfenen Rands (Standard 4 % des Durchmessers). 0 = Krater ohne Wall.', 'Height of the raised rim (default 4 % of the diameter). 0 = craters without wall.'),
    P('ejekta', 'Auswurfdecke', 'Ejecta blanket', 0, 2.5, 0.01, 1, 'Dicke der Auswurfdecke außerhalb des Rands (nimmt mit x⁻³ ab, x = Abstand/Radius).', 'Thickness of the ejecta blanket outside the rim (falls off as x⁻³, x = distance/radius).'),
    P('alter', 'Alter / Verfall', 'Age / degradation', 0, 1, 0.01, 0.5, 'Mittlere Verwitterung. 0 = alle Krater frisch und scharf; 1 = alle verflacht und rund geschliffen (Diffusion durch Mikrometeoriten, Erdbeben).', 'Mean degradation. 0 = all craters fresh and sharp; 1 = all softened and rounded (diffusion by micrometeorites, quakes).'),
    P('komplex', 'Übergang einfach→komplex', 'Simple→complex transition', 0.001, 0.1, 0.001, 0.014, 'Kraterradius (im Bogenmaß) ab dem Krater flachen Boden, Terrassen und Zentralberg bekommen. Erdmond ~0,005 (15–20 km Durchmesser), Eismonde früher, kleine Körper später.', 'Crater radius (radians) from which craters get flat floors, terraces and central peaks. Moon ~0.005 (15–20 km diameter), icy moons earlier, small bodies later.'),
    P('gipfel', 'Zentralberge', 'Central peaks', 0, 1.5, 0.01, 0.7, 'Höhe des Zentralbergs (Rückfederung des Untergrunds nach dem Einschlag) in komplexen Kratern.', 'Height of the central peak (rebound of the ground after impact) in complex craters.'),
    P('terrassen', 'Terrassen', 'Terraces', 0, 1, 0.01, 0.6, 'Stufen in den Kraterwänden (Wandabrutsche) bei komplexen Kratern.', 'Steps in the crater walls (slumping) in complex craters.'),
    P('rund', 'Unrundheit', 'Irregularity', 0, 0.5, 0.01, 0.14, 'Randverformung: Krater sind keine Kreise (Rauschen auf dem Radius, Vielecke bei großen Kratern).', 'Rim deformation: craters are not circles (noise on the radius, polygons for big craters).'),
    P('loeschen', 'Löscht Altes', 'Erases old terrain', 0, 1, 0.01, 0.85, 'Wie stark ein neuer Krater das Relief darunter ausräumt. 1 = saubere Schalen, 0 = Krater liegen nur auf dem Gelände.', 'How strongly a new crater clears the relief below it. 1 = clean bowls, 0 = craters just sit on the terrain.'),
    P('frisch', 'Helligkeit junger Krater', 'Brightness of young craters', 0, 3, 0.01, 1.4, 'Unreifer Regolith ist heller (Raumverwitterung dunkelt und rötet in ~1 Mrd. Jahren): junge Krater und Auswurf leuchten.', 'Immature regolith is brighter (space weathering darkens and reddens within ~1 Gyr): young craters and ejecta glow.'),
    P('strahl', 'Strahlen', 'Rays', 0, 2, 0.01, 0.8, 'Helle Strahlen um junge Krater (Tycho, Copernicus): Auswurf in Rinnen, die vom Krater ausgehen.', 'Bright rays around young craters (Tycho, Copernicus): ejecta in lanes radiating from the crater.'),
  ],
  wgsl: /* wgsl */`
fn kraterKap() -> i32 {
  // Stufen, deren kleinster Krater noch ≥ 3 Texel misst (der Rest kommt live im Bild)
  return i32(floor(log2(max(gtexn() / (9.4 * $krater_gross), 1.0))));
}
fn craters(s: ptr<function, Surf>, d: vec3f, k0: i32, k1: i32, lv: i32) {
  let sd = gseed();
  let fm = (*s).form;
  var h = (*s).h;
  var fresh = (*s).fresh;
  var ray = (*s).ray;
  var cavAll = (*s).cav;
  for (var k = k0; k < k1; k++) {
    let f = $krater_gross * exp2(f32(k));
    let q = d * f;
    let base = floor(q - 0.5);
    let pk = clamp($krater_dichte * 0.9 * exp2($krater_steil * 0.5 * (f32(k) - 3.0)), 0.0, 2.0);
    var hs = 0.0; var cv = 0.0; var fr = 0.0; var ry = 0.0;
    for (var m = 0; m < 2; m++) {
      let pm = clamp(pk - f32(m), 0.0, 1.0);
      if (pm <= 0.0) { break; }
      for (var c = 0; c < 8; c++) {
        let id = base + vec3f(f32(c & 1), f32((c >> 1) & 1), f32((c >> 2) & 1));
        let hv = hash33(id + vec3f(31.7 * f32(k) + sd * 0.731, 17.3 * f32(m) + 2.9, 7.1));
        if (hv.x > pm) { continue; }
        let ctr = id + 0.5 + (hv.yzx - 0.5) * 0.5;
        let rc = 0.22 + 0.26 * hash14(id, 0.37 + f32(m) + f32(k) * 1.3);
        let lc = length(ctr);
        let w = lc - f;
        if (abs(w) >= rc) { continue; }
        let r = sqrt(rc * rc - w * w);
        if (r < 0.07) { continue; }
        let cp = ctr * (f / lc);
        let dv = q - cp;
        let dd = length(dv);
        let d3 = length(q - ctr);
        var x = dd / r;
        if (x > 3.2 && d3 > 0.85) { continue; }
        let rW = r / f;
        let age = clamp(hash14(id, 1.7 + f32(m)) * (0.12 + 1.8 * $krater_alter), 0.0, 1.0);
        let cx = sstep($krater_komplex, $krater_komplex * 4.0, rW);
        let ddr = mix($krater_tiefe, $krater_tiefe * 0.32, cx);
        let dep = 2.0 * ddr * (1.0 - 0.85 * age);
        let rimH = 0.08 * $krater_rand * (1.0 - 0.9 * age);
        let rwid = 1.0 + 3.0 * age;
        if ($krater_rund > 0.0 && x < 2.0) {
          let u = dv / max(dd, 1e-4);
          x *= 1.0 + $krater_rund * (0.6 * snoise(u * 1.6 + id * 0.173) + 0.4 * cx * snoise(u * 3.1 + id * 0.311 + 7.0));
        }
        var ph = crProfile(x, dep, rimH, cx, $krater_gipfel, $krater_terrassen, rwid, 6.0);
        if (x > 1.0) { ph *= $krater_ejekta * (1.0 - sstep(0.55, 0.85, d3)); }
        hs += ph * rW;
        cv = max(cv, 1.0 - sstep(0.86, 1.0, x));
        let fa = sq2(1.0 - age);
        fr = max(fr, fa * (1.0 - sstep(1.0, 2.8, x)) * (1.0 - sstep(0.6, 0.85, d3)));
        if (lv == 1 && age < 0.4 && x > 0.95 && rW > 0.0015) {
          let te = tangents(cp / f);
          let ang = atan2(dot(dv, te[1]), dot(dv, te[0]));
          let nr = 7.0 + floor(hv.z * 9.0);
          let lane = snoise(vec3f(ang * 1.7 + hv.y * 30.0, hash13(id), 0.5));
          let pat = pow(clamp(0.5 + 0.5 * sin(ang * nr + hv.y * 40.0 + 3.0 * lane), 0.0, 1.0), 3.0);
          let fall = pow(1.0 / max(x, 1.0), 1.1);
          ry = max(ry, pat * fall * sq2(1.0 - age / 0.4) * (1.0 - sstep(0.5, 0.85, d3)) * (0.4 + 0.6 * (1.0 - sstep(0.0015, 0.02, rW))));
        }
      }
    }
    h = (h - fm) * (1.0 - $krater_loeschen * cv) + fm + hs;
    fresh = max(fresh * (1.0 - cv), fr);
    ray = max(ray * (1.0 - cv), ry);
    cavAll = max(cavAll, cv);
  }
  (*s).h = h; (*s).fresh = fresh; (*s).ray = ray; (*s).cav = cavAll;
}
fn h_krater_alt(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  craters(s, d, 0, min(i32($krater_alt), min(i32($krater_okt), kraterKap() + 1)), lv);
}
fn h_krater_jung(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  craters(s, d, min(i32($krater_alt), i32($krater_okt)), min(i32($krater_okt), kraterKap() + 1), lv);
}
// Live-Detail im Zeichen-Shader: die Stufen unterhalb der Kartenauflösung, solange sie größer als ~2,5 Bildpunkte sind
fn r_krater_detail(d: vec3f, foot: f32) -> Det {
  let k0 = kraterKap() + 1;
  let k1 = min(i32(floor(log2(max(0.2 / ($krater_gross * foot), 1.0)))) + 1, min(i32($krater_okt), k0 + 5));
  if (k1 <= k0) { return Det(vec3f(0.0), 1.0); }
  var s0 = surfInit(); craters(&s0, d, k0, k1, 1);
  let tg = tangents(d);
  let eps = foot * 0.5;
  var s1 = surfInit(); craters(&s1, normalize(d + tg[0] * eps), k0, k1, 0);
  var s2 = surfInit(); craters(&s2, normalize(d + tg[1] * eps), k0, k1, 0);
  let g = ((s1.h - s0.h) / eps) * tg[0] + ((s2.h - s0.h) / eps) * tg[1];
  return Det(g, 1.0 + $krater_frisch * s0.fresh + $krater_strahl * 0.8 * s0.ray);
}
fn c_krater(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let b = 1.0 + $krater_frisch * (*s).fresh + $krater_strahl * 1.6 * (*s).ray;
  let hi = min((*s).fresh + (*s).ray * $krater_strahl, 1.0);
  (*s).col = (*s).col * b;
  (*s).col = mix((*s).col, vec3f(dot((*s).col, vec3f(0.3333))) * vec3f(0.97, 1.0, 1.04), hi * 0.4);
}
`,
  r: { detail: 'r_krater_detail' },
  h: { krater_alt: 'h_krater_alt', krater_jung: 'h_krater_jung' },
  c: 'c_krater', corder: 20,
};
