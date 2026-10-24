import { P, type Block } from '../typen';

// Baustein Gelände: Grundrelief aus fraktalem Rauschen (Musgrave: Summe von Oktaven; Gratanteil für Gebirge), Domänenverzerrung gegen
// das typische Rauschmuster, dazu das „Tieflandpotenzial“: Wo es hoch ist, können später Basaltmeere (Maria) einsetzen.
// Hemisphärische Asymmetrie: Mond-Vorderseite hat dünnere Kruste und flutet häufiger (Maria-Dichotomie).
export const GELAENDE: Block = {
  id: 'gelaende', de: 'Gelände (Grundrelief)', en: 'Terrain (base relief)', gruppe: 'relief', an: true,
  note: ['Hochländer und Tiefländer unter allen Kratern: Rauschen mit Oktaven, optional Gebirgsgraten.', 'Highlands and lowlands under all craters: octave noise, optionally mountain ridges.'],
  par: [
    P('hoehe', 'Reliefhöhe', 'Relief height', 0, 0.06, 0.001, 0.012, 'Größe des Höhenrauschens in Radien (0,01 = 1 % des Mondradius, beim Erdmond 17 km). Größte Höhenunterschiede des Mondes liegen bei ±10 km, also ±0,006.', 'Size of the height noise in radii (0.01 = 1 % of the moon radius, 17 km for the Moon). The Moon’s largest height differences are about ±10 km, i.e. ±0.006.'),
    P('frq', 'Grundfrequenz', 'Base frequency', 0.4, 10, 0.05, 2.2, 'Wellenzahl der größten Strukturen. Hohe Werte = viele kleine Hügel, niedrige = wenige große Kontinente.', 'Wavenumber of the largest features. High = many small hills, low = a few big continents.'),
    P('oktaven', 'Oktaven', 'Octaves', 1, 9, 1, 6, 'Anzahl der Rauschoktaven. Jede Oktave halbiert die Wellenlänge und dämpft um den Rauheitsfaktor.', 'Number of noise octaves. Each octave halves the wavelength and is damped by the roughness gain.'),
    P('rauh', 'Rauheit', 'Roughness', 0.3, 0.85, 0.01, 0.52, 'Verstärkung je Oktave (Hurst-Exponent): hoch = zerklüftet, niedrig = glatt gerollt.', 'Gain per octave (Hurst exponent): high = rugged, low = smooth rolling.'),
    P('grat', 'Gebirgsgrat', 'Mountain ridges', 0, 1, 0.01, 0.2, 'Mischt Grat-Rauschen (1 − |n|)² ein: scharfe Kämme und breite Täler wie bei Gebirgsketten.', 'Mixes in ridged noise (1 − |n|)²: sharp crests and broad valleys like mountain chains.'),
    P('warp', 'Verzerrung', 'Warp', 0, 1.5, 0.01, 0.4, 'Domänenverzerrung: das Rauschen wird mit sich selbst verschoben, es entstehen gewundene, natürlichere Formen statt Rauschpunkten.', 'Domain warping: the noise is displaced by itself, giving winding natural shapes instead of noise blobs.'),
    P('tiefland', 'Tiefland-Variation', 'Lowland variation', 0, 1, 0.01, 0.55, 'Wie stark das großräumige Tieflandpotenzial schwankt; dort kann Lava später Becken füllen (Baustein Maria).', 'How strongly the large-scale lowland potential varies; lava can later fill basins there (Maria block).'),
    P('dichot', 'Vorder-/Rückseite', 'Near/far side', -1, 1, 0.01, 0.55, 'Hemisphärische Asymmetrie: dünnere Kruste auf einer Seite = tieferes Relief und mehr Flutung (Erdmond: Vorderseite 31 % Maria, Rückseite 1 %).', 'Hemispheric asymmetry: thinner crust on one side = deeper relief and more flooding (Moon: near side 31 % maria, far side 1 %).'),
  ],
  wgsl: /* wgsl */`
fn dichotAxis() -> vec3f { return sphPoint(hash33(vec3f(gseed() * 0.31 + 4.0, 9.1, 2.6))); }
fn h_gelaende(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  var p = d * $gelaende_frq + vec3f(sd * 0.17, 3.3, 1.9);
  if ($gelaende_warp > 0.0) {
    let w = vec3f(snoise(p * 0.7 + 11.0), snoise(p * 0.7 + 27.0), snoise(p * 0.7 + 43.0));
    p += w * $gelaende_warp * 0.7;
  }
  let oct = i32($gelaende_oktaven);
  let nf = fbmG(p, oct, $gelaende_rauh).x;
  let rg = (ridgeN(p * 0.9 + 5.0, oct) - 0.45) * 2.0;
  let n = mix(nf, rg, $gelaende_grat);
  let ax = dichotAxis();
  let dich = dot(d, ax);
  var h = $gelaende_hoehe * n;
  h -= $gelaende_hoehe * 0.7 * $gelaende_dichot * dich;
  // Tieflandpotenzial 0…1: großräumiges Rauschen, gegenüber der Höhe leicht gegenläufig, plus Vorderseitenneigung
  let low = 0.5 + 0.5 * snoise(d * 1.35 + vec3f(sd * 0.07, 8.0, 2.0)) * $gelaende_tiefland;
  (*s).low = clamp(low - 0.38 * $gelaende_dichot * dich - 0.25 * n, 0.0, 1.0);
  (*s).h += h;
}
`,
  h: { gelaende: 'h_gelaende' },
};
