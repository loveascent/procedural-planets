import { P, type Block } from '../typen';

// Baustein Polkappe und Kältefallen: Eis und Raureif sammeln sich dort, wo es kalt ist. Pole bekommen weniger Sonne (Einfallswinkel),
// Kraterböden nahe den Polen liegen im Dauerschatten („Kältefallen“, Mond: Wassereis in Shackleton, Temperatur < 100 K).
// Charons rote Polkappe („Mordor Macula“) entsteht aus Methan, das von Pluto herüberweht und per Ultraviolett zu Tholinen reagiert.
// Verfahren: Breitengrad-Schwelle mit Rauschrand; Kältefallen dort, wo der Kraterhohlraum im hohen Breitengrad liegt.
export const POLKAPPE: Block = {
  id: 'polkappe', de: 'Polkappe und Kältefallen', en: 'Polar cap and cold traps', gruppe: 'farbe', an: false,
  note: ['Frost- oder Tholinkappen an den Polen, Eis in Kraterböden der Polarregion.', 'Frost or tholin caps at the poles, ice in crater floors of the polar regions.'],
  par: [
    P('breite', 'Kappe ab Breite', 'Cap from latitude', 20, 89, 0.5, 62, 'Ab diesem Breitengrad beginnt die Kappe.', 'From this latitude the cap begins.', (v) => `${v.toFixed(0)}°`),
    P('rand', 'Randunschärfe', 'Edge noise', 0, 1, 0.01, 0.4, 'Wie ausgefranst die Kappengrenze ist.', 'How ragged the cap boundary is.'),
    P('seiten', 'Pole', 'Poles', 0, 2, 1, 0, '0 = beide Pole, 1 = nur Nordpol, 2 = nur Südpol.', '0 = both poles, 1 = north only, 2 = south only.'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 12, 'Farbton der Kappe (Charon: rot-braun ≈ 12°; Frost: weiß/blau ≈ 210° bei niedriger Sättigung).', 'Hue of the cap (Charon: red-brown ≈ 12°; frost: white/blue ≈ 210° at low saturation).', (v) => `${v.toFixed(0)}°`),
    P('saett', 'Sättigung', 'Saturation', 0, 1, 0.01, 0.7, 'Farbintensität der Kappe.', 'Colour intensity of the cap.'),
    P('hell', 'Helligkeit', 'Brightness', 0.05, 1, 0.01, 0.35, 'Albedo der Kappe.', 'Albedo of the cap.'),
    P('kante', 'Stärke', 'Strength', 0, 1, 0.01, 1, 'Wie vollständig die Kappe die Oberfläche überdeckt.', 'How completely the cap covers the surface.'),
    P('falle', 'Kältefallen', 'Cold traps', 0, 1, 0.01, 0.6, 'Raureif in Kraterböden der Polarregion.', 'Frost in crater floors of the polar region.'),
  ],
  wgsl: /* wgsl */`
fn c_polkappe(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  var y = d.y;
  if ($polkappe_seiten > 1.5) { y = -d.y; } else if ($polkappe_seiten > 0.5) { y = d.y; } else { y = abs(d.y); }
  let lat = degrees(asin(clamp(y, -1.0, 1.0)));
  let n = fbmG(d * 4.0 + vec3f(gseed() * 0.2, 1.0, 2.0), 4, 0.55).x;
  let edge = $polkappe_breite + n * 28.0 * $polkappe_rand;
  let m = sstep(edge - 3.0 - 6.0 * $polkappe_rand, edge + 3.0, lat) * $polkappe_kante;
  let cap = hsv2rgb($polkappe_farbton / 360.0, $polkappe_saett, 1.0) * $polkappe_hell / max(dot(hsv2rgb($polkappe_farbton / 360.0, $polkappe_saett, 1.0), vec3f(0.3, 0.55, 0.15)), 0.1);
  (*s).col = mix((*s).col, cap * (0.85 + 0.15 * snoise(d * 30.0)), m);
  (*s).ice = max((*s).ice, m);
  // Kältefallen: Hohlräume in hohen Breiten
  let polar = sstep($polkappe_breite - 20.0, $polkappe_breite + 6.0, lat);
  let trap = polar * (*s).cav * (1.0 - sstep(0.0, 0.25, length(g))) * $polkappe_falle;
  (*s).col = mix((*s).col, vec3f(0.62, 0.64, 0.68), clamp(trap * 0.6, 0.0, 1.0));
  (*s).gloss = max((*s).gloss, 0.3 * (m + trap));
}
`,
  c: 'c_polkappe', corder: 40,
};
