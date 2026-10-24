import { P, type Block } from '../typen';

// Baustein Melonenhaut (Cantaloupe-Gelände, Triton): ein Netz flacher, rundlicher Dellen von 30–50 km Durchmesser mit schmalen Graten dazwischen.
// Vermutlich Diapire: leichteres Eis steigt in schwererem auf und sinkt zellförmig wieder ab (Schenk & Jackson 2018). Verfahren: Zellrauschen.
export const MELONE: Block = {
  id: 'melone', de: 'Melonenhaut (Cantaloupe)', en: 'Cantaloupe terrain', gruppe: 'eis', an: false,
  note: ['Ein Netz runder Dellen mit schmalen Graten, wie die Haut einer Cantaloupe-Melone auf Triton.', 'A net of round dimples with narrow ridges, like the skin of a cantaloupe melon on Triton.'],
  par: [
    P('anteil', 'Anteil', 'Coverage', 0, 1, 0.01, 0.7, 'Welcher Teil der Oberfläche diese Struktur trägt.', 'What part of the surface carries this structure.'),
    P('frq', 'Zellgröße', 'Cell size', 6, 90, 0.5, 30, 'Wellenzahl der Zellen (hoch = kleine Dellen).', 'Wavenumber of the cells (high = small dimples).'),
    P('tiefe', 'Tiefe', 'Depth', 0, 0.004, 0.0001, 0.0009, 'Tiefe der Dellen.', 'Depth of the dimples.'),
    P('grat', 'Grat', 'Ridge', 0, 1, 0.01, 0.6, 'Höhe der Stege zwischen den Dellen.', 'Height of the walls between the dimples.'),
    P('rund', 'Unregelmäßigkeit', 'Irregularity', 0, 1, 0.01, 0.5, 'Verzerrung der Zellen: 0 = gleichmäßig, 1 = unregelmäßig.', 'Distortion of the cells: 0 = regular, 1 = irregular.'),
  ],
  wgsl: /* wgsl */`
fn h_melone(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  let zn = snoise(d * 1.5 + vec3f(sd * 0.3, 2.0, 1.0)) * 0.5 + 0.5;
  let zone = sstep(0.9 - $melone_anteil * 0.95, 1.0 - $melone_anteil * 0.95, zn + 0.1);
  if (zone <= 0.0) { return; }
  let wp = vec3f(snoise(d * $melone_frq * 0.4 + 3.0), snoise(d * $melone_frq * 0.4 + 13.0), snoise(d * $melone_frq * 0.4 + 23.0)) * $melone_rund * 0.5;
  let v = vor3(d * $melone_frq + wp);
  let bowl = 1.0 - sstep(0.0, 0.5, v.x);
  let wall = 1.0 - sstep(0.0, 0.16, v.w);
  (*s).h += $melone_tiefe * (-bowl * 0.8 + 0.2 + $melone_grat * wall * 0.7) * zone;
}
`,
  h: { melone: 'h_melone' },
};
