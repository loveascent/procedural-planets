import { P, type Block } from '../typen';

// Baustein Dünenfelder (Titan): Lineardünen aus dunklem organischem Sand (Kohlenwasserstoffkörner aus der Atmosphäre) bedecken 17 % von Titan, fast alle
// im Äquatorgürtel (±30°), bis 100 km lang, 1–2 km breit, 100 m hoch, parallel zueinander und ungefähr ost-west gerichtet; zwischen ihnen heller Untergrund
// (Radar: „Sand-Sea“ Belet, Fensal). Verfahren: Phase = f·(Breitengrad + Rauschverschiebung); Dünenkämme sin(2πφ); Amplitude durch Zonenmaske.
export const DUENEN: Block = {
  id: 'duenen', de: 'Dünenfelder (Titan)', en: 'Dune fields (Titan)', gruppe: 'relief', an: false,
  note: ['Lange, parallele Sanddünen im Äquatorgürtel, dunkel auf hellem Grund.', 'Long parallel sand dunes in the equatorial belt, dark on bright ground.'],
  par: [
    P('breite', 'Gürtelbreite', 'Belt width', 0.1, 1.5, 0.01, 0.55, 'Breite des Dünengürtels um den Äquator (Bogenmaß; Titan ±30° = 0,52).', 'Width of the dune belt around the equator (radians; Titan ±30° = 0.52).'),
    P('frq', 'Dünenabstand', 'Dune spacing', 20, 400, 1, 140, 'Wellenzahl der Dünenkämme (hoch = enge Dünen).', 'Wavenumber of the dune crests (high = tight dunes).'),
    P('hoehe', 'Dünenhöhe', 'Dune height', 0, 0.003, 0.0001, 0.0006, 'Höhe der Kämme (in Radien).', 'Height of the crests (in radii).'),
    P('wind', 'Windwechsel', 'Wind variation', 0, 1, 0.01, 0.4, 'Wie stark die Dünen wellen und sich verzweigen (Y-Verzweigungen).', 'How strongly the dunes meander and fork (Y-junctions).'),
    P('dunkel', 'Dunkelheit', 'Darkness', 0, 1, 0.01, 0.7, 'Wie dunkel der organische Sand ist.', 'How dark the organic sand is.'),
    P('deckung', 'Deckung', 'Coverage', 0, 1, 0.01, 0.75, 'Anteil des Gürtels, der von Dünen bedeckt ist.', 'Fraction of the belt covered by dunes.'),
  ],
  wgsl: /* wgsl */`
fn duneMask(d: vec3f) -> f32 {
  let lat = asin(clamp(d.y, -1.0, 1.0));
  let edge = $duenen_breite * (1.0 + 0.45 * snoise(d * 2.3 + vec3f(gseed() * 0.3, 1.0, 2.0)));
  let band = 1.0 - sstep(edge * 0.55, edge, abs(lat));
  let patch = sstep(0.5 - 0.7 * $duenen_deckung, 0.55 - 0.7 * $duenen_deckung + 0.25, snoise(d * 3.0 + vec3f(4.0, gseed() * 0.17, 1.0)));
  return band * patch;
}
fn h_duenen(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let m = duneMask(d);
  (*s).aux2.z = m;
  if (m <= 0.0) { return; }
  let lat = asin(clamp(d.y, -1.0, 1.0));
  let sd = gseed();
  let w = $duenen_wind * (0.9 * snoise(d * 8.0 + vec3f(sd, 1.0, 2.0)) + 0.4 * snoise(d * 23.0 + 5.0)) * 0.02;
  let phi = $duenen_frq * (lat + w) / 3.14159;
  let crest = 0.5 + 0.5 * sin(6.2831853 * phi);
  (*s).h += $duenen_hoehe * pow(crest, 1.5) * m * (0.7 + 0.3 * snoise(d * 40.0));
  (*s).aux2.w = crest;
}
fn c_duenen(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).aux2.z;
  let sand = vec3f(0.05, 0.04, 0.035) * (0.8 + 0.5 * (*s).aux2.w);
  (*s).col = mix((*s).col, sand * 3.0 * length((*s).col), m * $duenen_dunkel * (0.4 + 0.6 * (*s).aux2.w));
  (*s).rough = mix((*s).rough, 0.85, m);
}
`,
  h: { duenen: 'h_duenen' },
  c: 'c_duenen', corder: 37,
};
