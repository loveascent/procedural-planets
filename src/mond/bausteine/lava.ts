import { P, type Block } from '../typen';

// Baustein Lava (Magma-Welten): Krustenplatten, zwischen denen Gesteinsschmelze durch Spalten leuchtet. Wie auf einer jungen Lavaoberfläche (Kīlauea-Lavasee)
// bricht eine dunkle, kühle Kruste in Platten, die auseinanderdriften; an den Rändern strahlt die Schmelze (T ≈ 1 400–1 900 K).
// Verfahren: Voronoi-Zellen = Platten, Zellkanten = Risse (glühende Breite), Plattenhöhe und Krustenfarbe zufällig, flüssige Seen als Flächen ohne Kruste.
// Die Strahlung folgt etwa σT⁴, daher der steile Kontrast zwischen Rissen (hell) und Kruste (nahezu schwarz).
export const LAVA: Block = {
  id: 'lava', de: 'Lava (Krustenplatten, glühende Risse)', en: 'Lava (crust plates, glowing cracks)', gruppe: 'hitze', an: false,
  note: ['Dunkle Krustenplatten mit glühender Schmelze in den Rissen, dazu offene Lavaseen: ein heißer Magma-Mond.', 'Dark crust plates with glowing melt in the cracks, plus open lava lakes: a hot magma moon.'],
  par: [
    P('frq', 'Plattengröße', 'Plate size', 1.5, 40, 0.1, 7, 'Wellenzahl der Platten.', 'Wavenumber of the plates.'),
    P('riss', 'Rissbreite', 'Crack width', 0.01, 0.4, 0.005, 0.07, 'Breite der glühenden Risse relativ zur Plattengröße.', 'Width of the glowing cracks relative to plate size.'),
    P('hitze', 'Glut', 'Glow', 0, 14, 0.1, 5, 'Leuchtdichte der Schmelze im Verhältnis zur Sonnenseite (Strahlungsdichte ∝ T⁴).', 'Radiance of the melt relative to the sunlit side (radiance ∝ T⁴).'),
    P('see', 'Offene Seen', 'Open lakes', 0, 1, 0.01, 0.2, 'Anteil der Fläche ohne Kruste: flache, hell glühende Magmaseen.', 'Fraction of area without crust: flat brightly glowing magma lakes.'),
    P('kruste', 'Krustendunkel', 'Crust darkness', 0, 1, 0.01, 0.8, 'Wie dunkel die erkaltete Kruste ist (1 = fast schwarz).', 'How dark the cooled crust is (1 = nearly black).'),
    P('relief', 'Plattenrelief', 'Plate relief', 0, 0.01, 0.0001, 0.0018, 'Höhenunterschied zwischen Platten und Rissen (in Radien).', 'Height difference between plates and cracks (in radii).'),
    P('asche', 'Asche', 'Ash', 0, 1, 0.01, 0.4, 'Graue Ascheschleier auf der Kruste.', 'Grey ash veils on the crust.'),
  ],
  wgsl: /* wgsl */`
fn h_lava(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  let wp = vec3f(snoise(d * $lava_frq * 0.5 + 3.0), snoise(d * $lava_frq * 0.5 + 13.0), snoise(d * $lava_frq * 0.5 + 23.0)) * 0.45;
  let v = vor3(d * $lava_frq + wp + vec3f(sd * 0.1, 0.0, 0.0));
  let w = $lava_riss * (0.5 + 1.1 * hash13(vec3f(v.z * 10.0, sd, 3.0)));
  let crack = 1.0 - sstep(0.0, w, v.w);
  let lakeN = snoise(d * 2.2 + vec3f(sd * 0.2, 7.0, 2.0)) * 0.5 + 0.5;
  let lake = sstep(1.0 - $lava_see, 1.02 - $lava_see + 0.06, lakeN);
  let plate = (hash13(vec3f(v.z * 7.7, sd, 1.0)) - 0.5);
  let hh = $lava_relief * (plate * 0.8 + 0.3 * (1.0 - crack) - 0.4 * crack);
  (*s).h = mix((*s).h * 0.5 + hh, $lava_relief * -0.4 + 0.0002 * snoise(d * 30.0), lake);
  let flick = 0.6 + 0.4 * snoise(d * $lava_frq * 8.0 + 4.0);
  (*s).heat = max(crack * flick, lake * (0.55 + 0.45 * snoise(d * 14.0))) * $lava_hitze;
  (*s).aux2.x = lake;
  (*s).aux2.y = crack;
}
fn c_lava(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let lake = (*s).aux2.x;
  let crust = mix(vec3f(0.5), vec3f(0.035, 0.03, 0.028), $lava_kruste);
  let ash = vec3f(0.22, 0.2, 0.19) * (0.5 + 0.5 * snoise(d * 17.0));
  var col = mix(crust * length((*s).col) * 4.0, ash, $lava_asche * sstep(-0.1, 0.5, snoise(d * 4.0)));
  col = mix(col, vec3f(0.02, 0.012, 0.008), lake);
  (*s).col = col;
  (*s).gloss = mix(0.05, 0.35, lake);
  (*s).rough = 0.9;
}
`,
  h: { vulkane: 'h_lava' },
  c: 'c_lava', corder: 35,
};
