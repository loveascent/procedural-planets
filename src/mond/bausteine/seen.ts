import { P, type Block } from '../typen';

// Baustein Seen (Titan: Kraken Mare, Ligeia Mare aus flüssigem Methan und Ethan bei 94 K; auch Wasser, Lava, Schwefel als Alternative): Die Oberfläche in
// Senken (niedriger Wert der Landhöhe, polare Breiten) wird ein perfekt ebener Spiegel mit eigener Pegelhöhe, dunkel, mit Glanz (Fresnel, Glitzern der Sonne)
// und glatten Ufern mit hellem Strandsaum. Verfahren: Seemaske aus Landhöhe und Breitengradbonus; h = Pegel; Farbe schwarz-blau; Glanz = 1.
export const SEEN: Block = {
  id: 'seen', de: 'Flüssigkeitsseen (Titan)', en: 'Liquid lakes (Titan)', gruppe: 'relief', an: false,
  note: ['Ebene, spiegelnde Seen in Senken, bevorzugt in Polnähe, mit hellem Ufersaum.', 'Flat, mirror-like lakes in depressions, preferably near the poles, with a bright shore line.'],
  par: [
    P('anteil', 'Anteil', 'Coverage', 0, 1, 0.01, 0.4, 'Anteil der Oberfläche in Flüssigkeit (Titan: ~1,5 % insgesamt, 15 % im Norden).', 'Fraction of the surface under liquid (Titan: ~1.5 % overall, 15 % in the north).'),
    P('pol', 'Polnähe', 'Polar preference', 0, 1, 0.01, 0.7, 'Wie stark Seen die Polarregionen bevorzugen (Methanregen kondensiert dort).', 'How strongly lakes prefer the polar regions (methane rain condenses there).'),
    P('pegel', 'Seetiefe-Offset', 'Level offset', -0.01, 0.01, 0.0002, 0, 'Verschiebt den Seespiegel: höher füllt mehr Täler.', 'Shifts the lake level: higher fills more valleys.'),
    P('ufer', 'Ufer', 'Shore', 0, 1, 0.01, 0.5, 'Breite des hellen Uferbands (Nasszone, Evaporitkruste).', 'Width of the bright shore band (wet zone, evaporite crust).'),
    P('dunkel', 'Dunkelheit', 'Darkness', 0, 1, 0.01, 0.9, 'Wie dunkel die Flüssigkeit ist.', 'How dark the liquid is.'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 215, 'Farbton der Flüssigkeit (Methan: schwarz-blau).', 'Hue of the liquid (methane: black-blue).', (v) => `${v.toFixed(0)}°`),
  ],
  wgsl: /* wgsl */`
fn h_seen(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let lat = abs(d.y);
  let nz = snoise(d * 2.9 + vec3f(gseed() * 0.21, 3.0, 5.0)) * 0.5 + 0.5;
  let potential = nz * (1.0 - $seen_pol * 0.9 * (1.0 - lat)) + $seen_pol * 0.5 * lat + 0.0 - (*s).h * 8.0 * 0.0;
  let thr = 1.0 - $seen_anteil;
  let m = sstep(thr - 0.02, thr + 0.02, potential + 0.25 * $seen_anteil);
  let level = $seen_pegel - 0.0014;
  (*s).aux2.z = m;
  (*s).aux3.z = 0.0;
  if (m <= 0.0) { return; }
  let h0 = (*s).h - (*s).form;
  (*s).h = mix(h0, min(h0, level) - 0.0005 * (1.0 - m), m) + (*s).form;
  (*s).aux3.z = m;
  // Flachwasser in Ufernähe: Rand der Maske
  (*s).aux3.w = (1.0 - sstep(0.0, 0.5, m)) * m;
}
fn c_seen(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).aux3.z;
  if (m <= 0.0) { return; }
  let liquid = hsv2rgb($seen_farbton / 360.0, 0.55, 0.05 + 0.1 * (1.0 - $seen_dunkel));
  let shore = vec3f(0.30, 0.26, 0.2);
  var col = mix((*s).col, shore * length((*s).col) * 2.4, (1.0 - sstep(0.0, 0.4 * $seen_ufer + 0.02, m)) * m * 0.7);
  col = mix(col, liquid, sstep(0.5, 0.95, m));
  (*s).col = col;
  (*s).gloss = mix((*s).gloss, 1.0, sstep(0.5, 0.95, m));
  (*s).rough = mix((*s).rough, 0.02, sstep(0.5, 0.95, m));
}
`,
  h: { seen: 'h_seen' },
  c: 'c_seen', corder: 60,
};
