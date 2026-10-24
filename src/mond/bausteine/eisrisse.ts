import { P, type Block } from '../typen';

// Baustein Eisrisse (Europa-Lineae): Das Eis der Schale bricht durch Gezeitenspannung; Spalten öffnen sich, Wasser oder Schlamm quillt hoch
// und gefriert zu Doppelrücken mit Mittelrinne (Pappalardo 1999: Dike-Intrusion/Gezeitenpumpen). Mehrere Rissgenerationen kreuzen sich;
// Material in den Spalten ist durch Salze und Strahlung rötlich-braun. Dilatationsbänder (helle, glatte Streifen) sind auseinandergezogene Kruste.
export const EISRISSE: Block = {
  id: 'eis', de: 'Eisrisse (Lineae, Doppelrücken)', en: 'Ice fractures (lineae, double ridges)', gruppe: 'eis', an: false,
  note: ['Gekreuzte, rötlich gefärbte Risssysteme mit Doppelrücken wie auf Europa; dazu helle Dehnungsbänder.', 'Crossing, reddish fracture systems with double ridges like on Europa; plus bright dilation bands.'],
  par: [
    P('netz', 'Rissgenerationen', 'Fracture generations', 1, 4, 1, 3, 'Anzahl der sich kreuzenden Rissnetze, jedes mit eigener Richtung und Dichte. Ältere liegen unten, jüngere schneiden sie.', 'Number of crossing fracture networks, each with its own direction and density. Older ones lie below, younger ones cut them.'),
    P('frq', 'Dichte', 'Density', 0.8, 14, 0.1, 3.4, 'Wellenzahl der gröbsten Risse (größere Zahl = engmaschiger).', 'Wavenumber of the coarsest fractures (higher = denser).'),
    P('breite', 'Rissbreite', 'Fracture width', 0.0004, 0.01, 0.0001, 0.0022, 'Breite eines Risses samt Rücken (in Radien; 0,002 ≈ 3 km bei Europa).', 'Width of a fracture including ridges (in radii; 0.002 ≈ 3 km on Europa).'),
    P('tiefe', 'Relief', 'Relief', 0, 0.006, 0.0001, 0.0008, 'Höhe der Rücken und Tiefe der Rinne.', 'Height of the ridges and depth of the groove.'),
    P('doppelt', 'Doppelrücken', 'Double ridge', 0, 1, 0.01, 0.75, '0 = einfache Spalte, 1 = zwei Rücken mit Mittelrinne.', '0 = single crack, 1 = two ridges with a central groove.'),
    P('warp', 'Krümmung', 'Curvature', 0, 1.5, 0.01, 0.55, 'Wie stark die Risse gebogen sind (Zyklidenbögen entstehen durch rotierende Gezeitenspannung).', 'How strongly the fractures bend (cycloid arcs form from rotating tidal stress).'),
    P('farbe', 'Rotfärbung', 'Red tint', 0, 1, 0.01, 0.7, 'Stärke der rötlich-braunen Färbung in den Rissen (Salze, Schwefel, Strahlungsprodukte).', 'Strength of the reddish-brown colouring in the fractures (salts, sulphur, radiolysis products).'),
    P('baender', 'Dehnungsbänder', 'Dilation bands', 0, 1, 0.01, 0.35, 'Helle, glatte Streifen, in denen Kruste auseinandergezogen wurde.', 'Bright smooth strips where crust was pulled apart.'),
  ],
  wgsl: /* wgsl */`
fn h_eis(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  var h = (*s).h;
  var mask = 0.0;
  var band = 0.0;
  let n = i32($eis_netz);
  for (var j = 0; j < 4; j++) {
    if (j >= n) { break; }
    let fr = $eis_frq * (1.0 + 0.62 * f32(j));
    let o = vec3f(f32(j) * 7.7 + sd * 0.19, f32(j) * 3.1 + 1.0, f32(j) * 5.3 + 2.0);
    let wp = vec3f(snoise(d * fr * 0.9 + o), snoise(d * fr * 0.9 + o + 9.0), snoise(d * fr * 0.9 + o + 19.0));
    let ld = lineDist(d * fr + o + wp * 0.55 * $eis_warp, fr);
    let w = $eis_breite * (0.5 + 0.9 * (0.5 + 0.5 * snoise(d * fr * 2.2 + o + 4.0)));
    let seg = sstep(-0.1, 0.25, snoise(d * fr * 0.55 + o + 31.0));
    let x = ld.x / max(w, 1e-4);
    let ridge = exp(-sq2((x - 1.0) / 0.55)) * $eis_doppelt + exp(-sq2(x / 0.8)) * (1.0 - $eis_doppelt) * 0.8;
    let trough = exp(-sq2(x / 0.5));
    let age = 1.0 - 0.18 * f32(n - 1 - j);
    h = h * (1.0 - 0.5 * trough * seg) + $eis_tiefe * (ridge - 0.9 * trough * $eis_doppelt - 0.5 * trough * (1.0 - $eis_doppelt)) * seg * age;
    mask = max(mask, max(trough, 0.5 * exp(-sq2((x - 1.0) / 1.2))) * seg);
    // Dehnungsband: breiter, glatter Streifen entlang einer eigenen Nulllinie
    let lb = lineDist(d * fr * 0.55 + o + 40.0 + wp * 0.4, fr * 0.55);
    let bw = $eis_breite * 7.0;
    band = max(band, (1.0 - sstep(bw * 0.6, bw, lb.x)) * sstep(0.2, 0.5, snoise(d * fr * 0.4 + o + 50.0)));
  }
  h -= $eis_tiefe * 0.3 * band;
  (*s).h = h;
  (*s).aux.x = mask;
  (*s).aux.y = band;
}
fn c_eis(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).aux.x * $eis_farbe;
  let brown = vec3f(0.34, 0.15, 0.07) * (0.6 + 0.4 * snoise(d * 40.0));
  (*s).col = mix((*s).col, brown * length((*s).col) * 2.2, clamp(m * 0.85, 0.0, 1.0));
  (*s).col *= 1.0 + $eis_baender * (*s).aux.y * 0.45;
}
`,
  h: { eis: 'h_eis' },
  c: 'c_eis', corder: 30,
};
