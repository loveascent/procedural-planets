import { P, type Block } from '../typen';

// Baustein Hell-Dunkel-Dichotomie (Iapetus: Cassini Regio, Hemisphären 1:10 in der Albedo; die dunkle Seite zeigt in Flugrichtung).
// Mechanismus (Spencer & Denk 2010): Dunkles Material (Staub von äußeren Monden, Phoebe) erwärmt das Eis, das verdampft und
// an den kalten hellen Gebieten wieder ausfriert – ein Rückkopplungskreis, der die Grenze fraktal und scharf macht.
// Verfahren: Skalarprodukt mit einer Achse plus fraktales Rauschen, glatter Schwellenübergang.
export const DICHOTOMIE: Block = {
  id: 'dichotomie', de: 'Hell-Dunkel-Halbkugeln (Iapetus)', en: 'Bright/dark hemispheres (Iapetus)', gruppe: 'farbe', an: false,
  note: ['Eine Halbkugel schwarz-braun, die andere schneeweiß, mit fraktalem Rand.', 'One hemisphere black-brown, the other snow white, with a fractal boundary.'],
  par: [
    P('kontrast', 'Kontrast', 'Contrast', 0, 1, 0.01, 0.85, 'Wie viel dunkler die dunkle Seite ist (Iapetus: Albedo 0,03 gegen 0,5 auf der hellen Seite).', 'How much darker the dark side is (Iapetus: albedo 0.03 vs 0.5 on the bright side).'),
    P('rand', 'Randweichheit', 'Edge softness', 0.005, 0.6, 0.005, 0.07, 'Breite des Übergangs.', 'Width of the transition.'),
    P('fraktal', 'Fraktalität', 'Fractal edge', 0, 1, 0.01, 0.65, 'Wie stark Rauschen die Grenze zerfranst (Eisinseln in der dunklen Seite).', 'How strongly noise ragged the boundary (ice islands in the dark side).'),
    P('achse', 'Achsenneigung', 'Axis tilt', -1, 1, 0.01, 0, 'Verschiebt die Grenze Richtung Pol: positiv = dunkel wird kleiner.', 'Shifts the boundary towards the pole: positive = dark becomes smaller.'),
    P('rot', 'Rotfärbung', 'Red tint', 0, 1, 0.01, 0.7, 'Rot-brauner Ton der dunklen Seite (Tholine, Phoebe-Staub).', 'Red-brown tone of the dark side.'),
  ],
  wgsl: /* wgsl */`
fn c_dichotomie(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let sd = gseed();
  let ax = normalize(vec3f(1.0, 0.0, 0.0) + 0.4 * sphPoint(hash33(vec3f(sd * 0.7 + 1.0, 2.0, 3.0))));
  let v = dot(d, ax) + $dichotomie_achse * 0.5 + $dichotomie_fraktal * 0.34 * fbmG(d * 2.6 + vec3f(sd * 0.2, 4.0, 1.0), 5, 0.6).x;
  let m = sstep(-$dichotomie_rand, $dichotomie_rand, v);
  let dark = vec3f(0.17, 0.085, 0.045);
  let col = mix((*s).col, dark * (0.55 + 0.45 * length((*s).col) * 3.0), m * $dichotomie_rot * $dichotomie_kontrast);
  (*s).col = col * mix(1.0, 1.0 - 0.88 * $dichotomie_kontrast, m);
  (*s).aux3.x = m;
}
`,
  c: 'c_dichotomie', corder: 8,
};
