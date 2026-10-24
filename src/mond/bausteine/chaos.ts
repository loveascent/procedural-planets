import { P, type Block } from '../typen';

// Baustein Chaosgelände (Conamara Chaos auf Europa, Chaos auf Ganymed): Die Eiskruste über einem warmen Untergrund bricht in Schollen (Rafts),
// die gegeneinander verkippt und verschoben in einer dunklen, rötlichen, rauen Matrix schwimmen. Verfahren: Zellrauschen (Voronoi) mit
// Zufallshöhe und Kippung je Zelle, die Zellkanten bilden die Matrix; Bereiche kommen aus einem Rauschfeld (Anteil).
export const CHAOS: Block = {
  id: 'chaos', de: 'Chaosgelände (Eisschollen)', en: 'Chaos terrain (ice rafts)', gruppe: 'eis', an: false,
  note: ['Zerbrochene Eisschollen, verkippt und in dunkle, raue Matrix eingebettet.', 'Broken ice rafts, tilted and embedded in a dark rough matrix.'],
  par: [
    P('anteil', 'Anteil', 'Coverage', 0, 1, 0.01, 0.3, 'Welcher Teil der Oberfläche Chaos ist (Europa: ~25 %).', 'What part of the surface is chaos (Europa: ~25 %).'),
    P('frq', 'Schollengröße', 'Raft size', 4, 60, 0.5, 18, 'Wellenzahl der Schollen: groß = kleine Schollen.', 'Wavenumber of the rafts: large = small rafts.'),
    P('hoehe', 'Höhenversatz', 'Height offset', 0, 0.01, 0.0001, 0.0018, 'Zufälliger Höhenunterschied der Schollen (in Radien).', 'Random height difference of the rafts (in radii).'),
    P('kippen', 'Verkippung', 'Tilt', 0, 1, 0.01, 0.55, 'Wie stark jede Scholle verkippt ist: glatte Tafeln gegen schiefe Platten.', 'How strongly each raft is tilted: smooth tables vs. slanted plates.'),
    P('matrix', 'Matrixbreite', 'Matrix width', 0.02, 0.6, 0.01, 0.2, 'Breite der Zwischenmasse zwischen den Schollen (Zellkantenabstand).', 'Width of the infill between rafts (cell edge distance).'),
    P('farbe', 'Rotfärbung', 'Red tint', 0, 1, 0.01, 0.7, 'Rötlich-braune Farbe der Matrix.', 'Reddish-brown colour of the matrix.'),
  ],
  wgsl: /* wgsl */`
fn h_chaos(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  let zn = fbmG(d * 1.9 + vec3f(sd * 0.21, 3.0, 8.0), 4, 0.55).x;
  let zone = sstep(0.62 - $chaos_anteil * 0.75, 0.68 - $chaos_anteil * 0.75, zn + 0.0);
  (*s).aux.z = 0.0;
  if (zone <= 0.0) { return; }
  let wp = vec3f(snoise(d * $chaos_frq * 0.35 + 3.0), snoise(d * $chaos_frq * 0.35 + 13.0), snoise(d * $chaos_frq * 0.35 + 23.0)) * 0.35;
  let v = vor3(d * $chaos_frq + wp + vec3f(sd * 0.1, 0.0, 0.0));
  let rnd = hash13(vec3f(v.z * 91.7, sd, 1.0)) - 0.5;
  let rnd2 = hash13(vec3f(v.z * 17.3, sd, 2.0)) - 0.5;
  let inner = sstep($chaos_matrix * 0.5, $chaos_matrix * 0.5 + 0.12, v.w);
  // Scholle: Basishöhe + Kippung nach dem Abstand vom Zellmittelpunkt in einer Zufallsrichtung
  let tilt = $chaos_kippen * rnd2 * 2.0 * ((v.x - 0.35) * 1.5);
  let raft = $chaos_hoehe * (rnd * 2.0 + tilt) * 0.5;
  let matrixH = -$chaos_hoehe * 0.55 + $chaos_hoehe * 0.14 * snoise(d * $chaos_frq * 4.0);
  let hh = mix(matrixH, raft, inner);
  let fm = (*s).form;
  (*s).h = mix((*s).h, ((*s).h - fm) * 0.35 + hh + fm, zone);
  (*s).aux.z = zone * (1.0 - inner);
}
fn c_chaos(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).aux.z * $chaos_farbe;
  let brown = vec3f(0.30, 0.14, 0.07) * (0.7 + 0.3 * snoise(d * 60.0));
  (*s).col = mix((*s).col, brown * length((*s).col) * 2.0, clamp(m, 0.0, 1.0));
  (*s).rough = mix((*s).rough, 0.95, (*s).aux.z);
}
`,
  h: { chaos: 'h_chaos' },
  c: 'c_chaos', corder: 31,
};
