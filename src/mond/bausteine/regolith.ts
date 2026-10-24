import { P, type Block } from '../typen';

// Baustein Regolith (Grundfarbe): Albedo des Mondstaubs. Beim Erdmond ~0,12 im Mittel (Hochland 0,15–0,2, Maria 0,07). Fleckige Variation
// aus Mineralzusammensetzung und Raumverwitterung (nanophasiges Eisen dunkelt und rötet mit dem Alter), Hangaufhellung (Rutschungen legen
// frisches Material frei) und Hohlraumdunkelung (Krater-Innenseiten fangen Streulicht).
export const REGOLITH: Block = {
  id: 'regolith', de: 'Regolith (Grundfarbe)', en: 'Regolith (base colour)', gruppe: 'farbe', an: true,
  note: ['Grundfarbe und Helligkeit der Oberfläche, fleckige Mineralvariation, Raumverwitterung, Hangaufhellung.', 'Base colour and brightness of the surface, patchy mineral variation, space weathering, slope brightening.'],
  par: [
    P('hell', 'Albedo', 'Albedo', 0.02, 1, 0.005, 0.2, 'Mittlere Rückstrahlung (0 schwarz, 1 weiß). Mond 0,12; Merkur 0,09; Callisto 0,2; Eismonde 0,6–1,0.', 'Mean reflectance (0 black, 1 white). Moon 0.12; Mercury 0.09; Callisto 0.2; icy moons 0.6–1.0.'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 35, 'Grundfarbton in Grad (0 rot, 60 gelb, 120 grün, 200 blau).', 'Base hue in degrees (0 red, 60 yellow, 120 green, 200 blue).', (v) => `${v.toFixed(0)}°`),
    P('saett', 'Sättigung', 'Saturation', 0, 1, 0.005, 0.1, 'Farbintensität. Der Erdmond ist fast grau (0,05–0,15), Io intensiv gelb.', 'Colour intensity. The Moon is almost grey (0.05–0.15), Io intensely yellow.'),
    P('var', 'Flecken', 'Patchiness', 0, 1, 0.01, 0.5, 'Großräumige Helligkeitsvariation (Mineralogie, Verwitterungsgrad).', 'Large-scale brightness variation (mineralogy, degree of weathering).'),
    P('fein', 'Feinkorn', 'Fine grain', 0, 1, 0.01, 0.4, 'Kleinräumige Helligkeitsschwankung unterhalb der Kartenauflösung.', 'Small-scale brightness variation below map resolution.'),
    P('rot', 'Raumverwitterung', 'Space weathering', 0, 1, 0.01, 0.35, 'Rötliche Verfärbung und Abdunklung im Altgestein (nanophasiges Eisen). Neue Krater bleiben hell.', 'Reddish tint and darkening on old ground (nanophase iron). New craters stay bright.'),
    P('hang', 'Hangaufhellung', 'Slope brightening', 0, 2, 0.01, 0.7, 'Steile Hänge rutschen und zeigen frisches, helles Material (Kraterwände, Gipfel).', 'Steep slopes slump and expose fresh, bright material (crater walls, peaks).'),
    P('hohl', 'Hohlraum-Dunkelung', 'Cavity darkening', 0, 1, 0.01, 0.0, 'Dunkelt Kraterböden ab (Ambient Occlusion in der Karte).', 'Darkens crater floors (ambient occlusion in the map).'),
  ],
  wgsl: /* wgsl */`
// Live-Körnung: Rauschen unter Kartenauflösung (Steinchen, Kornglitzern), Wellenlänge ~6 Bildpunkte, Neigung ~0,14
fn r_regolith_detail(d: vec3f, foot: f32) -> Det {
  let fr = 1.0 / (foot * 6.0);
  if (foot > 0.0016) { return Det(vec3f(0.0), 1.0); }
  let n = snoiseG(d * fr + vec3f(gseed(), 3.0, 1.0));
  let n2 = snoise(d * fr * 0.37 + vec3f(1.0, gseed(), 8.0));
  let k = 1.0 - sstep(0.0006, 0.0016, foot);
  return Det(0.14 * k * $regolith_fein * (n.yzw - d * dot(n.yzw, d)) / max(length(n.yzw), 0.5), 1.0 + 0.16 * k * $regolith_fein * (n.x * 0.6 + n2 * 0.4));
}
fn c_regolith(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let sd = gseed();
  let n1 = fbmG(d * 3.1 + vec3f(sd * 0.41, 1.0, 3.0), 5, 0.55).x;
  let n2 = snoise(d * 83.0 + vec3f(sd, 4.0, 1.0)) * 0.6 + snoise(d * 191.0 + vec3f(1.0, sd, 5.0)) * 0.4;
  var a = $regolith_hell * (1.0 + $regolith_var * 0.7 * n1) * (1.0 + $regolith_fein * 0.35 * n2);
  let base = hsv2rgb($regolith_farbton / 360.0, $regolith_saett, 1.0);
  var col = base * a / max(dot(base, vec3f(0.3, 0.55, 0.15)), 0.2);
  // Raumverwitterung: alte, ungestörte Flächen sind dunkler und röter
  let wth = $regolith_rot * clamp(0.55 + 0.9 * n1, 0.0, 1.0) * (1.0 - (*s).fresh);
  col *= vec3f(1.0 + 0.18 * wth, 1.0 - 0.04 * wth, 1.0 - 0.22 * wth) * (1.0 - 0.22 * wth);
  let slope = length(g);
  col *= 1.0 + $regolith_hang * 0.9 * sstep(0.12, 0.7, slope);
  col *= 1.0 - $regolith_hohl * 0.5 * (*s).cav * (1.0 - sstep(0.0, 0.2, slope));
  (*s).col = col;
  (*s).rough = 0.8;
}
`,
  r: { detail: 'r_regolith_detail' },
  c: 'c_regolith', corder: 0,
};
