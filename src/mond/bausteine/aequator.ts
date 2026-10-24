import { P, type Block } from '../typen';

// Baustein Äquatorwall (Iapetus): ein 20 km hoher, 1 300 km langer Gebirgsgürtel exakt am Äquator, 200 km breit; vermutlich Rest eines
// früheren Rings, der abstürzte, oder Aufwölbung einer schnell rotierenden jungen Kruste. Verfahren: Grat entlang |d.y| = 0 mit Lücken.
export const AEQUATOR: Block = {
  id: 'aequator', de: 'Äquatorwall (Iapetus)', en: 'Equatorial ridge (Iapetus)', gruppe: 'form', an: false,
  note: ['Ein Gebirgsgürtel um den Äquator, der den Mond wie eine Walnuss aussehen lässt.', 'A mountain belt around the equator that makes the moon look like a walnut.'],
  par: [
    P('hoehe', 'Höhe', 'Height', 0, 0.03, 0.0005, 0.011, 'Höhe des Walls in Radien (Iapetus: 20 km von 735 km Radius = 0,027).', 'Height of the ridge in radii (Iapetus: 20 km of 735 km radius = 0.027).'),
    P('breite', 'Breite', 'Width', 0.01, 0.3, 0.005, 0.07, 'Breite des Walls als Bogenmaß um den Äquator.', 'Width of the ridge as an angle around the equator.'),
    P('luecken', 'Lücken', 'Gaps', 0, 1, 0.01, 0.2, 'Wie stark der Wall zerlegt und unterbrochen ist.', 'How strongly the ridge is broken up and interrupted.'),
    P('scharf', 'Schärfe', 'Sharpness', 0.3, 3, 0.05, 1.4, 'Form des Querschnitts: klein = breiter Rücken, groß = scharfer Kamm.', 'Cross-section shape: small = broad back, large = sharp crest.'),
  ],
  wgsl: /* wgsl */`
fn h_aequator(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let lat = abs(d.y + 0.01 * snoise(d * 7.0));
  let prof = pow(max(1.0 - lat / $aequator_breite, 0.0), $aequator_scharf);
  let gaps = 1.0 - $aequator_luecken * sstep(-0.1, 0.5, snoise(vec3f(atan2(d.z, d.x) * 2.6, 1.0, gseed() * 0.3)));
  let rough = 0.75 + 0.25 * snoise(d * 24.0);
  (*s).h += $aequator_hoehe * prof * gaps * rough;
}
`,
  h: { aequator: 'h_aequator' },
};
