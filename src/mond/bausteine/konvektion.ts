import { P, type Block } from '../typen';

// Baustein Konvektionsebene (Sputnik Planitia auf Pluto): ein riesiges, glattes Becken aus Stickstoffeis, in dem das Eis wie in einem Topf
// konvektiert. Aufsteigendes warmes Eis bildet Zellen von 10–40 km, deren Ränder als schmale Rinnen sichtbar sind; das Becken ist jung (keine Krater)
// und hell. Verfahren: Becken aus zwei verschmolzenen Kreisen (Herzform) mit Randrauschen, Voronoi-Zellen mit Kantenrinnen.
export const KONVEKTION: Block = {
  id: 'konvektion', de: 'Konvektionsebene (Sputnik)', en: 'Convection plain (Sputnik)', gruppe: 'eis', an: false,
  note: ['Ein riesiges, glattes, kraterloses Eisbecken aus Konvektionszellen, wie Sputnik Planitia.', 'A huge smooth crater-free ice basin of convection cells, like Sputnik Planitia.'],
  par: [
    P('breite', 'Größe', 'Size', 0.05, 0.9, 0.01, 0.34, 'Radius des Beckens im Bogenmaß (Sputnik: 0,3 ≈ 1 000 km Breite bei Pluto).', 'Radius of the basin in radians (Sputnik: 0.3 ≈ 1,000 km wide on Pluto).'),
    P('tiefe', 'Tiefe', 'Depth', 0, 0.03, 0.0005, 0.007, 'Absenkung des Beckens gegen die Umgebung.', 'Lowering of the basin against the surroundings.'),
    P('zellen', 'Zellgröße', 'Cell size', 3, 60, 0.5, 20, 'Wellenzahl der Konvektionszellen innerhalb des Beckens.', 'Wavenumber of the convection cells inside the basin.'),
    P('rinnen', 'Rinnentiefe', 'Trough depth', 0, 0.002, 0.00005, 0.0004, 'Tiefe der Rinnen zwischen den Zellen.', 'Depth of the troughs between the cells.'),
    P('hell', 'Helligkeit', 'Brightness', 0, 2, 0.01, 1.1, 'Aufhellung des Beckens (frisches Stickstoffeis).', 'Brightening of the basin (fresh nitrogen ice).'),
    P('herz', 'Herzform', 'Heart shape', 0, 1, 0.01, 0.7, '0 = rund, 1 = zwei verschmolzene Lappen (Herz).', '0 = round, 1 = two merged lobes (heart).'),
  ],
  wgsl: /* wgsl */`
fn konvMask(d: vec3f) -> f32 {
  let sd = gseed();
  let c0 = sphPoint(hash33(vec3f(sd * 0.29 + 5.0, 1.0, 7.0)));
  let te = tangents(c0);
  let off = (te[0] * 0.62 + te[1] * 0.35) * $konvektion_breite * 0.8;
  let c1 = normalize(c0 + off * $konvektion_herz);
  let c2 = normalize(c0 - off * $konvektion_herz * 0.6 + te[1] * 0.3 * $konvektion_breite * $konvektion_herz);
  let a = angDist(d, c1) / $konvektion_breite;
  let b = angDist(d, c2) / ($konvektion_breite * 0.8);
  let u = smin(a, b, 0.5) * (1.0 + 0.12 * snoise(d * 6.0 + vec3f(sd, 2.0, 3.0)));
  return 1.0 - sstep(0.85, 1.0, u);
}
fn h_konvektion(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let m = konvMask(d);
  (*s).aux2.x = m;
  if (m <= 0.0) { return; }
  let v = vor3(d * $konvektion_zellen / max($konvektion_breite, 0.05) * 0.3 + vec3f(gseed() * 0.1, 0.0, 0.0));
  let trough = 1.0 - sstep(0.0, 0.1, v.w);
  let dome = 0.25 * (1.0 - sstep(0.0, 0.6, v.x));
  let floorH = -$konvektion_tiefe;
  let hb = floorH - $konvektion_rinnen * (trough - dome);
  (*s).h = mix((*s).h, hb + (*s).form, m);
  (*s).cav = max((*s).cav * (1.0 - m), 0.0);
  (*s).fresh *= (1.0 - m);
}
fn c_konvektion(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).aux2.x;
  if (m <= 0.0) { return; }
  let tone = vec3f(1.0, 0.93, 0.88);
  (*s).col = mix((*s).col, max((*s).col, vec3f(0.55)) * tone * (1.0 + 0.8 * $konvektion_hell), m * 0.7);
  (*s).gloss = max((*s).gloss, 0.5 * m);
  (*s).ice = max((*s).ice, m);
}
`,
  h: { konvektion: 'h_konvektion' },
  c: 'c_konvektion', corder: 33,
};
