import { P, type Block } from '../typen';

// Baustein Tholin (organische Krusten): Methan und Stickstoff in der Atmosphäre oder auf dem Eis zerfallen unter Ultraviolett und kosmischer Strahlung
// zu komplexen Kohlenwasserstoff- und Nitrilverbindungen („Tholine“), die rot bis braun-schwarz sind (Pluto, Triton, Titan, Charon-Pol, Arrokoth).
// Verfahren: Flecken aus Rauschen, bevorzugt in tiefen Gebieten und niedriger Breite (Pluto: Cthulhu Macula am Äquator), Farbe von Orange über Rot bis Schwarz.
export const THOLIN: Block = {
  id: 'tholin', de: 'Tholine (rote Organik)', en: 'Tholins (red organics)', gruppe: 'farbe', an: false,
  note: ['Rot- bis schwarzbraune Flecken aus organischer Kruste, wie auf Pluto, Triton oder Titan.', 'Red to black-brown patches of organic crust, as on Pluto, Triton or Titan.'],
  par: [
    P('menge', 'Menge', 'Amount', 0, 1, 0.01, 0.5, 'Wie viel der Oberfläche von Tholinen bedeckt ist.', 'How much of the surface is covered by tholins.'),
    P('farbton', 'Farbton', 'Hue', 0, 60, 1, 18, 'Farbton: 30° orange, 15° rot, 0° tiefrot.', 'Hue: 30° orange, 15° red, 0° deep red.', (v) => `${v.toFixed(0)}°`),
    P('dunkel', 'Alterung', 'Ageing', 0, 1, 0.01, 0.55, 'Je älter, desto dunkler und brauner (Strahlung kohlt aus): 1 = fast schwarz.', 'The older, the darker and browner (radiation carbonises): 1 = nearly black.'),
    P('flecken', 'Fleckigkeit', 'Patchiness', 0, 1, 0.01, 0.6, 'Verteilung: 0 = gleichmäßig, 1 = scharf begrenzte Flecken.', 'Distribution: 0 = uniform, 1 = sharply bounded patches.'),
    P('aequator', 'Äquatorbindung', 'Equator preference', 0, 1, 0.01, 0.4, 'Bevorzugt niedrige Breiten (dort wirkt die meiste Strahlung).', 'Prefers low latitudes (where most radiation acts).'),
    P('tiefe', 'Tiefenbindung', 'Low-ground preference', 0, 1, 0.01, 0.4, 'Sammelt sich in Becken und Senken.', 'Accumulates in basins and depressions.'),
  ],
  wgsl: /* wgsl */`
fn c_tholin(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let sd = gseed();
  let n = fbmG(d * 2.7 + vec3f(sd * 0.31, 6.0, 4.0), 5, 0.58).x;
  let lat = abs(d.y);
  var v = n + $tholin_aequator * (0.55 - lat * 1.1) + $tholin_tiefe * ((*s).low - 0.5) * 1.4 + ($tholin_menge - 0.5) * 1.5;
  let m = sstep(0.0 - 0.45 * (1.0 - $tholin_flecken), 0.0 + 0.45 * (1.0 - $tholin_flecken) + 0.02, v) * (1.0 - 0.7 * (*s).fresh);
  let lum = length((*s).col);
  let orange = hsv2rgb($tholin_farbton / 360.0, 0.8, 1.0);
  let c = mix(orange * 0.5, vec3f(0.07, 0.035, 0.02), $tholin_dunkel * clamp(0.5 + 0.8 * n, 0.0, 1.0));
  (*s).col = mix((*s).col, c * (0.4 + 1.2 * lum), m * 0.9);
  (*s).ice *= 1.0 - m;
}
`,
  c: 'c_tholin', corder: 36,
};
