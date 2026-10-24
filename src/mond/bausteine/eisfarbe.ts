import { P, type Block } from '../typen';

// Baustein Eisoberfläche: Wassereis (oder anderes Eis) statt Gesteinsstaub. Eis streut Licht tief in sich (Volumenstreuung) und ist daher hell, mit weichem
// Terminator und bläulichem Unterton; polierte Flächen und Frost glitzern. Albedo reiner Wassereisfelder: 0,9–1,0 (Enceladus: geometrische Albedo 1,4),
// verunreinigtes Eis 0,2–0,5 (Callisto, Ganymed dunkle Felder).
// Verfahren: Mischung der Grundfarbe zur Eisfarbe nach Anteil; Verschmutzung steigt in Tälern/Becken (Staubsammlung) und mit „Alter“; Glanzwert für GGX.
export const EISFARBE: Block = {
  id: 'eisfarbe', de: 'Eisoberfläche (Farbe, Glanz)', en: 'Ice surface (colour, gloss)', gruppe: 'farbe', an: false,
  note: ['Macht aus dem grauen Staub eine Eiswelt: hell, bläulich, glänzend, mit Verschmutzung in Senken.', 'Turns the grey dust into an ice world: bright, bluish, glossy, with contamination in depressions.'],
  par: [
    P('anteil', 'Eisanteil', 'Ice fraction', 0, 1, 0.01, 1, 'Wie viel der Oberfläche Eis ist (0 = Gestein).', 'How much of the surface is ice (0 = rock).'),
    P('hell', 'Albedo des Eises', 'Ice albedo', 0.2, 1.2, 0.01, 0.85, 'Rückstrahlung des sauberen Eises. Enceladus > 1 (die gesamte Oberfläche ist frisch beschneit).', 'Reflectance of clean ice. Enceladus > 1 (the whole surface freshly snowed).'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 205, 'Unterton des Eises: Wassereis ist leicht bläulich, Methaneis gelblich.', 'Undertone of the ice: water ice is slightly bluish, methane ice yellowish.', (v) => `${v.toFixed(0)}°`),
    P('saett', 'Sättigung', 'Saturation', 0, 0.6, 0.005, 0.07, 'Stärke der Tönung.', 'Strength of the tint.'),
    P('schmutz', 'Verschmutzung', 'Contamination', 0, 1, 0.01, 0.35, 'Dunkler Staub und Organik in Senken und alten Flächen (Callisto: fast ganz bedeckt).', 'Dark dust and organics in depressions and old terrain (Callisto: almost fully covered).'),
    P('glanz', 'Glanz', 'Gloss', 0, 1, 0.01, 0.35, 'Spiegelung des Sonnenlichts auf glattem Eis.', 'Mirror reflection of sunlight on smooth ice.'),
    P('korn', 'Raureif-Körnung', 'Frost grain', 0, 1, 0.01, 0.4, 'Feine helle Körnung, die in Schlaglichtern glitzert.', 'Fine bright grain that sparkles in glints.'),
    P('frischeis', 'Frisches Eis in Kratern', 'Fresh ice in craters', 0, 2, 0.01, 0.9, 'Junge Krater legen sauberes Eis frei und leuchten.', 'Young craters expose clean ice and glow.'),
  ],
  wgsl: /* wgsl */`
fn c_eisfarbe(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let sd = gseed();
  let tint = hsv2rgb($eisfarbe_farbton / 360.0, $eisfarbe_saett, 1.0);
  let n = fbmG(d * 3.7 + vec3f(sd * 0.23, 5.0, 3.0), 5, 0.55).x;
  let grain = snoise(d * 140.0 + vec3f(sd, 1.0, 2.0));
  var ice = tint * $eisfarbe_hell * (1.0 + 0.1 * n);
  // Verschmutzung: in Senken (s.low hoch) und mit Rauschen; frische Krater und steile Hänge bleiben sauber
  let dirt = clamp($eisfarbe_schmutz * (0.5 + 0.6 * n + 0.5 * ((*s).low - 0.5)) * (1.0 - 0.8 * (*s).fresh), 0.0, 1.0);
  let dirtC = vec3f(0.07, 0.055, 0.045) * 2.0 * (0.6 + 0.4 * sstep(-0.3, 0.5, snoise(d * 11.0)));
  ice = mix(ice, dirtC, dirt * 0.9);
  ice *= 1.0 + $eisfarbe_korn * 0.12 * grain;
  ice *= 1.0 + $eisfarbe_frischeis * 0.4 * (*s).fresh;
  let m = $eisfarbe_anteil;
  (*s).col = mix((*s).col, ice, m);
  (*s).gloss = mix((*s).gloss, $eisfarbe_glanz * (1.0 - 0.7 * dirt), m);
  (*s).ice = max((*s).ice, m * (1.0 - dirt));
  (*s).rough = mix((*s).rough, 0.35, m);
}
`,
  c: 'c_eisfarbe', corder: 5,
};
