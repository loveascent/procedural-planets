import { P, type Block } from '../typen';

// Baustein Windstreifen (Triton): Stickstoff-Geysire (Tholine und Staub in einer 8 km hohen Fontäne) deponieren dunkle Fahnen, die der Wind am Boden
// 100 km weit nach einer Richtung zieht. Auf Mars entsprechen ihnen Staubteufel-Spuren. Verfahren: Zellgitter mit einer Quelle je Zelle, ein
// Strahl in Windrichtung (Tangente Richtung Osten) mit Gauß-Querschnitt und exponentiellem Abklingen.
export const STREIFEN: Block = {
  id: 'streifen', de: 'Windstreifen (Geysirfahnen)', en: 'Wind streaks (geyser plumes)', gruppe: 'farbe', an: false,
  note: ['Dunkle Fahnen, die von Geysir-Quellen alle in dieselbe Richtung ziehen.', 'Dark streaks drifting from geyser vents, all in the same direction.'],
  par: [
    P('dichte', 'Dichte', 'Density', 0, 1.5, 0.01, 0.6, 'Anteil der Zellen mit einer Quelle.', 'Fraction of cells with a vent.'),
    P('zellen', 'Quellenraster', 'Vent grid', 3, 30, 0.5, 11, 'Quellen pro Radius (groß = viele kleine).', 'Vents per radius (large = many small).'),
    P('laenge', 'Länge', 'Length', 0.02, 0.5, 0.005, 0.12, 'Fahnenlänge im Bogenmaß.', 'Plume length in radians.'),
    P('breite', 'Breite', 'Width', 0.002, 0.08, 0.001, 0.012, 'Fahnenbreite im Bogenmaß.', 'Plume width in radians.'),
    P('dunkel', 'Dunkelheit', 'Darkness', 0, 1, 0.01, 0.65, 'Wie dunkel die Fahnen sind.', 'How dark the streaks are.'),
    P('richtung', 'Windrichtung', 'Wind direction', 0, 360, 1, 80, 'Richtung der Fahnen auf der Oberfläche (0° = Norden, 90° = Osten).', 'Direction of the streaks on the surface (0° = north, 90° = east).', (v) => `${v.toFixed(0)}°`),
  ],
  wgsl: /* wgsl */`
fn c_streifen(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let f = $streifen_zellen;
  let q = d * f;
  let base = floor(q - 0.5);
  var m = 0.0;
  let a = radians($streifen_richtung);
  for (var c = 0; c < 8; c++) {
    let id = base + vec3f(f32(c & 1), f32((c >> 1) & 1), f32((c >> 2) & 1));
    let hv = hash33(id + vec3f(gseed() * 0.47, 41.0, 5.0));
    if (hv.x > $streifen_dichte) { continue; }
    let ctr = id + 0.5 + (hv.yzx - 0.5) * 0.6;
    let lc = length(ctr);
    if (abs(lc - f) > 0.5) { continue; }
    let v = normalize(ctr);
    let te = tangents(v);
    let wind = normalize(te[1] * cos(a) + te[0] * sin(a));
    let rel = d - v;
    let along = dot(rel, wind);
    let perp = length(rel - wind * along);
    let L = $streifen_laenge * (0.5 + hv.z);
    let w = $streifen_breite * (0.6 + hv.y * 0.8) * (1.0 + 2.0 * clamp(along / L, 0.0, 1.0));
    let fan = exp(-sq2(perp / w)) * select(0.0, exp(-along / L), along > 0.0) * sstep(-0.004, 0.004, along);
    let dot0 = exp(-sq2(length(rel) / ($streifen_breite * 0.8)));
    m = max(m, max(fan, dot0));
  }
  (*s).col *= 1.0 - $streifen_dunkel * 0.85 * m;
}
`,
  c: 'c_streifen', corder: 45,
};
