import { P, type Block } from '../typen';

// Baustein Rillen: gewundene Lavakanäle (Hadley-Rille, Schröter-Tal) und gerade Gräben (Graben durch Dehnung der Kruste).
// Linienabstand aus dem Nulldurchgang eines Rauschfelds: dist ≈ |n| / (f·|∇n|) in Radien. Rillen entstehen nur auf Maria (Lavatunnel).
export const RILLEN: Block = {
  id: 'rillen', de: 'Rillen und Gräben', en: 'Rilles and grabens', gruppe: 'relief', an: true,
  note: ['Gewundene Lavakanäle auf den Ebenen und lange, gerade Dehnungsgräben.', 'Sinuous lava channels on the plains and long straight extension grabens.'],
  par: [
    P('rille', 'Rillentiefe', 'Rille depth', 0, 0.008, 0.0001, 0.0016, 'Tiefe der gewundenen Lavakanäle (in Radien). 0 = keine.', 'Depth of the sinuous lava channels (in radii). 0 = none.'),
    P('rbreite', 'Rillenbreite', 'Rille width', 0.0005, 0.01, 0.0001, 0.0024, 'Breite der Rillen (in Radien, 0,002 ≈ 3,5 km).', 'Width of the rilles (in radii, 0.002 ≈ 3.5 km).'),
    P('rfrq', 'Rillendichte', 'Rille density', 1, 24, 0.1, 6, 'Wie viele Rillen pro Fläche (Wellenzahl des Rauschfelds).', 'How many rilles per area (wavenumber of the noise field).'),
    P('graben', 'Grabentiefe', 'Graben depth', 0, 0.008, 0.0001, 0.0011, 'Tiefe der geraden Dehnungsgräben mit flachem Boden.', 'Depth of the straight extension grabens with flat floors.'),
    P('gbreite', 'Grabenbreite', 'Graben width', 0.0005, 0.02, 0.0001, 0.005, 'Breite der Gräben (in Radien).', 'Width of the grabens (in radii).'),
    P('gfrq', 'Grabendichte', 'Graben density', 0.5, 12, 0.1, 3.2, 'Wie viele Gräben pro Fläche.', 'How many grabens per area.'),
    P('nurmaria', 'Nur auf Maria', 'Maria only', 0, 1, 1, 1, '1 = Rillen nur in überfluteten Flächen (Lavatunnel), 0 = überall.', '1 = rilles only in flooded areas (lava tubes), 0 = everywhere.'),
  ],
  wgsl: /* wgsl */`
fn h_rillen(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  var h = (*s).h;
  let sd = gseed();
  let ok = select(1.0, (*s).mare, $rillen_nurmaria > 0.5);
  if ($rillen_rille > 0.0 && ok > 0.0) {
    let fr = $rillen_rfrq;
    let wp = vec3f(snoise(d * fr * 2.1 + 3.0), snoise(d * fr * 2.1 + 17.0), snoise(d * fr * 2.1 + 31.0));
    let ld = lineDist(d * fr + vec3f(sd * 0.27, 9.0, 1.0) + wp * 0.22, fr);
    let w = $rillen_rbreite * (0.55 + 0.45 * snoise(d * fr * 3.7 + 5.0));
    let prof = exp(-sq2(ld.x / max(w, 1e-4)));
    // nur kurze Rillen: ein zweites Feld schaltet Stücke ab
    let seg = sstep(0.1, 0.45, snoise(d * fr * 0.9 + vec3f(8.0, sd * 0.3, 4.0)));
    h -= $rillen_rille * prof * seg * ok;
  }
  if ($rillen_graben > 0.0 && ok > 0.0) {
    let fr = $rillen_gfrq;
    let wp = vec3f(snoise(d * fr * 0.8 + 7.0), snoise(d * fr * 0.8 + 21.0), 0.0);
    let ld = lineDist(d * fr + vec3f(2.0, sd * 0.19, 6.0) + wp * 0.08, fr);
    let w = $rillen_gbreite;
    let floorW = 1.0 - sstep(w * 0.55, w, ld.x);
    let shoulder = exp(-sq2((ld.x - w * 1.05) / (w * 0.25)));
    let seg = sstep(0.0, 0.3, snoise(d * fr * 0.6 + vec3f(2.0, 3.0, sd * 0.3)));
    h += ($rillen_graben * (-floorW + 0.25 * shoulder)) * seg * ok;
  }
  (*s).h = h;
}
`,
  h: { rillen: 'h_rillen' },
};
