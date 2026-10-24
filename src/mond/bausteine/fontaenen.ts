import { P, type Block } from '../typen';

// Baustein Fontänen (Geysire und Vulkanfahnen): Enceladus' „Tigerstreifen“ am Südpol schießen 250 kg Wasserdampf und Eiskörner pro Sekunde bis 500 km hoch
// (Cassini 2005), Io-Fahnen wie Pele erreichen 300–400 km mit Schirmform (ballistische Bahnen bei Fluchtgeschwindigkeit 1 km/s), Tritons Geysire 8 km.
// Verfahren: Je Fontäne ein Dichtefeld ρ(z, ρ⊥) aus Strahlkegel (Geysir) und Parabelschirm (Vulkan), integriert entlang des Sehstrahls mit 18 Stichproben,
// Streuung mit starker Vorwärtsstreuung (Mie, g ≈ 0,7: Fontänen leuchten im Gegenlicht), nur dort hell, wo die Sonne hinkommt (auch hinter dem Terminator).
export const FONTAENEN: Block = {
  id: 'fontaenen', de: 'Fontänen (Geysire, Vulkanfahnen)', en: 'Plumes (geysers, volcanic plumes)', gruppe: 'hitze', an: false, nurZeichnen: true,
  note: ['Leuchtende Eis- oder Gasfontänen über der Oberfläche, im Gegenlicht am schönsten.', 'Glowing ice or gas plumes above the surface, most beautiful in backlight.'],
  par: [
    P('anz', 'Anzahl', 'Count', 0, 8, 1, 4, 'Wie viele Fontänen.', 'How many plumes.'),
    P('hoehe', 'Höhe', 'Height', 0.01, 0.8, 0.005, 0.22, 'Höhe über der Oberfläche in Radien (Enceladus: 500 km = 2 Radien beim Südpol-Rauch; Io Pele: 0,2).', 'Height above the surface in radii (Enceladus: 500 km = 2 radii of the south-polar plume; Io Pele: 0.2).'),
    P('breite', 'Breite', 'Width', 0.002, 0.15, 0.001, 0.016, 'Breite am Boden in Radien.', 'Width at the ground in radii.'),
    P('dichte', 'Dichte', 'Density', 0, 6, 0.02, 1.4, 'Streuende Menge (Helligkeit).', 'Amount of scatterer (brightness).'),
    P('schirm', 'Schirmform', 'Umbrella shape', 0, 1, 0.01, 0.0, '0 = enger Geysirstrahl, 1 = Schirm aus ballistischen Bahnen (Io).', '0 = narrow geyser jet, 1 = umbrella of ballistic trajectories (Io).'),
    P('pol', 'Polbindung', 'Pole preference', 0, 1, 0.01, 0.8, 'Wie stark die Fontänen um den Südpol gruppiert sind (Enceladus: Tigerstreifen).', 'How strongly the plumes cluster around the south pole (Enceladus: tiger stripes).'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 205, 'Farbe: Eisfontänen bläulich-weiß (205°), Io-Schwefel blau-grau bis gelb (210°/60°).', 'Colour: ice plumes bluish-white (205°), Io sulphur blue-grey to yellow (210°/60°).', (v) => `${v.toFixed(0)}°`),
    P('saett', 'Sättigung', 'Saturation', 0, 1, 0.01, 0.25, 'Farbstärke.', 'Colour strength.'),
    P('vorwaerts', 'Vorwärtsstreuung', 'Forward scattering', 0, 0.95, 0.01, 0.72, 'Asymmetrie der Streuung der Eiskörnchen.', 'Asymmetry of scattering by the ice grains.'),
  ],
  wgsl: /* wgsl */`
fn plumeSite(i: i32) -> vec3f {
  let hv = hash33(vec3f(f32(i) * 1.913 + 2.0, gseed() * 0.41 + 6.0, 4.4));
  var p = sphPoint(hv);
  // zum Südpol hin ziehen
  let pole = vec3f(0.0, -1.0, 0.0);
  p = normalize(mix(p, pole + 0.12 * (p - dot(p, pole) * pole), $fontaenen_pol * 0.9));
  return p;
}
fn r_fontaene(ro: vec3f, rd: vec3f, tMax: f32, col0: vec3f, sun: vec3f, sunI: f32) -> vec3f {
  var col = col0;
  let tint = mix(vec3f(1.0), hsv2rgb($fontaenen_farbton / 360.0, 1.0, 1.0), $fontaenen_saett);
  let H = $fontaenen_hoehe;
  let cosg = dot(rd, sun);
  let g = $fontaenen_vorwaerts;
  let g2 = g * g;
  let ph = (1.0 - g2) / (12.566 * pow(1.0 + g2 - 2.0 * g * cosg, 1.5)) * 0.8 + 0.06;
  let n = i32($fontaenen_anz);
  for (var i = 0; i < 8; i++) {
    if (i >= n) { break; }
    let nrm = plumeSite(i);
    let c = nrm * (1.0 + H * 0.5);
    let R = H * 0.75 + $fontaenen_breite * 2.0 + 0.5 * H * $fontaenen_schirm;
    let oc = ro - c;
    let bq = dot(oc, rd);
    let disc = bq * bq - (dot(oc, oc) - R * R);
    if (disc <= 0.0) { continue; }
    let sq = sqrt(disc);
    var t0 = max(-bq - sq, 0.0);
    var t1 = -bq + sq;
    if (t0 > tMax) { continue; }
    t1 = min(t1, tMax);
    if (t1 <= t0) { continue; }
    let dtp = (t1 - t0) / 18.0;
    var acc = vec3f(0.0);
    var T = 1.0;
    let sizeVar = 0.6 + 0.8 * hash13(vec3f(f32(i), gseed(), 9.0));
    for (var k = 0; k < 18; k++) {
      let p = ro + rd * (t0 + (f32(k) + 0.5) * dtp);
      let z = dot(p, nrm) - 1.0;
      if (z < -0.002) { continue; }
      let zr = max(z, 0.0) / (H * sizeVar);
      let rho = length(p - nrm * dot(p, nrm));
      // Strahl: Kegel, Dichte fällt mit der Höhe; Schirm: Parabel ρ_env(z) = R·√(1 − z/H) gespiegelt, Dichte nahe der Hülle
      let w = $fontaenen_breite * (1.0 + 7.0 * zr);
      let jet = exp(-sq2(rho / w)) * exp(-zr * 2.2) * (1.0 - sstep(0.85, 1.0, zr));
      let envR = $fontaenen_breite + H * 0.55 * sqrt(max(zr, 0.0)) * (1.0 - sstep(0.7, 1.05, zr)) ;
      let umb = exp(-sq2((rho - envR) / (0.1 * H + $fontaenen_breite))) * (1.0 - zr * 0.5) * (1.0 - sstep(0.8, 1.1, zr)) * 0.8;
      let core = exp(-sq2(rho / ($fontaenen_breite * 1.2))) * exp(-zr * 1.4) * 1.2;
      var dens = mix(jet, max(umb, core * 0.6), $fontaenen_schirm);
      dens *= (0.8 + 0.4 * snoise(p * 90.0 + vec3f(f32(i) * 3.0, 0.0, 0.0)));
      dens *= $fontaenen_dichte;
      let ext = dens * dtp * 30.0;
      let lit = sunVisible(p, sun);
      acc += T * (1.0 - exp(-ext)) * ph * tint * sunI * lit * 4.0;
      T *= exp(-ext * 0.5);
    }
    col = col * T + acc;
  }
  return col;
}
`,
  r: { fontaene: 'r_fontaene' },
};
