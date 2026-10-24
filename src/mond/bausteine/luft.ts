import { P, type Block } from '../typen';

// Baustein Luft und Dunst: Einfachstreuung in einer Exponentialatmosphäre (Dichte ρ(h) = ρ₀·e^(−h/H)), Strahlverfolgung mit 14 Stichproben,
// Henyey-Greenstein-Phasenfunktion (Vorwärtsstreuung g), Planetenschatten für die Streuung am Terminator und eine optionale abgelöste Dunstschicht
// (Titan: Dunstschicht in 500 km Höhe, 0,2 Radien über der Oberfläche; Voyager 1981 sah deshalb nur eine orangefarbene Kugel ohne Oberfläche).
// Für Monde mit dünner Gashülle (Triton, Io) genügt eine kleine Dichte; Titans Oberflächendruck ist 1,45 bar.
export const LUFT: Block = {
  id: 'luft', de: 'Atmosphäre und Dunst', en: 'Atmosphere and haze', gruppe: 'luft', an: false, nurZeichnen: true,
  note: ['Streuende Gashülle: Saum am Rand, Dunstschicht, Licht hinter dem Terminator, Verschleierung der Oberfläche.', 'Scattering gas envelope: rim glow, haze layer, light behind the terminator, veiling of the surface.'],
  par: [
    P('dichte', 'Dichte', 'Density', 0, 12, 0.02, 2.2, 'Optische Dicke senkrecht durch die Atmosphäre (τ). 0,05 = hauchdünn (Triton), 1 = Mars-Dunst, 3–6 = dichter Titan-Dunst.', 'Optical thickness straight through the atmosphere (τ). 0.05 = wisp (Triton), 1 = Mars haze, 3–6 = dense Titan haze.'),
    P('hoehe', 'Skalenhöhe', 'Scale height', 0.002, 0.15, 0.001, 0.03, 'Höhe, in der die Dichte auf 1/e fällt (in Radien). Titan: 40 km = 0,016; große Skalenhöhe = weicher Saum.', 'Height at which the density falls to 1/e (in radii). Titan: 40 km = 0.016; large scale height = soft rim.'),
    P('farbton', 'Farbton', 'Hue', 0, 360, 1, 30, 'Farbe der Streuteilchen (Titan-Tholine: orange 30°; Rayleigh-blau 215°).', 'Colour of the scatterers (Titan tholins: orange 30°; Rayleigh blue 215°).', (v) => `${v.toFixed(0)}°`),
    P('saett', 'Sättigung', 'Saturation', 0, 1, 0.01, 0.75, 'Farbstärke des Dunstes.', 'Colour strength of the haze.'),
    P('vorwaerts', 'Vorwärtsstreuung', 'Forward scattering', 0, 0.95, 0.01, 0.55, 'Asymmetrie g der Phasenfunktion: 0 = Rayleigh/isotrop, 0,8 = Mie-Aerosole, die das Licht stark nach vorn lenken (Rand leuchtet im Gegenlicht).', 'Asymmetry g of the phase function: 0 = Rayleigh/isotropic, 0.8 = Mie aerosols that scatter light strongly forward (rim glows in backlight).'),
    P('schicht', 'Abgelöste Dunstschicht', 'Detached haze layer', 0, 1, 0.01, 0.4, 'Stärke einer dünnen Dunstschale hoch über der Hauptatmosphäre.', 'Strength of a thin haze shell high above the main atmosphere.'),
    P('schichthoehe', 'Schichthöhe', 'Layer altitude', 0.02, 0.4, 0.005, 0.15, 'Höhe der abgelösten Schicht über dem Boden (in Radien).', 'Altitude of the detached layer above the ground (in radii).'),
    P('schleier', 'Verschleierung', 'Veiling', 0, 1, 0.01, 1, 'Wie stark die Atmosphäre die Oberfläche verschleiert (1 = physikalisch). Titans Oberfläche ist im Sichtbaren unsichtbar.', 'How strongly the atmosphere veils the surface (1 = physical). Titan’s surface is invisible in visible light.'),
  ],
  wgsl: /* wgsl */`
fn r_luft(ro: vec3f, rd: vec3f, tHit: f32, covered: bool, col0: vec3f, sun: vec3f, sunI: f32) -> vec3f {
  let H = $luft_hoehe;
  let Ra = 1.0 + 9.0 * H + select(0.0, $luft_schichthoehe + 0.04, $luft_schicht > 0.0);
  let b = dot(ro, rd);
  let disc = b * b - (dot(ro, ro) - Ra * Ra);
  if (disc <= 0.0) { return col0; }
  let sq = sqrt(disc);
  let t0 = max(-b - sq, 0.0);
  var t1 = -b + sq;
  if (covered) { t1 = min(t1, tHit); }
  else {
    // Strahl trifft den Körper nicht: nur bis zum Austritt aus der Hülle, bei Annäherung an den Boden bricht die Dichte ohnehin ab
    let tc = -b;
    if (tc > t0 && dot(ro + rd * tc, ro + rd * tc) < 1.0) { t1 = tc; }
  }
  if (t1 <= t0) { return col0; }
  let tint = mix(vec3f(1.0), hsv2rgb($luft_farbton / 360.0, 1.0, 1.0), $luft_saett);
  let ext = $luft_dichte / (H * (1.0 - exp(-9.0)));      // Streukoeffizient: senkrechte optische Dicke = Dichte
  let N = 16;
  let dt = (t1 - t0) / f32(N);
  let cosg = dot(rd, sun);
  let ph = 0.6 * hg(cosg, $luft_vorwaerts) + 0.4 * hg(cosg, -0.1);
  var tau = 0.0;
  var S = vec3f(0.0);
  for (var i = 0; i < 16; i++) {
    let p = ro + rd * (t0 + (f32(i) + 0.5) * dt);
    let h = max(length(p) - 1.0, 0.0);
    var dens = exp(-h / H);
    dens += $luft_schicht * 3.0 * exp(-sq2((h - $luft_schichthoehe) / 0.012)) * (H * 8.0);
    let ds = dens * ext * dt;
    // Sonnenlicht bis p: Schrägweg durch die Hülle ~ 1/μ, vom Körper abgeschattet
    let mu = dot(normalize(p), sun);
    let lightT = exp(-$luft_dichte * exp(-h / H) * 0.5 / max(mu + 0.15, 0.06));
    S += exp(-tau) * ds * ph * lightT * sunVisible(p, sun) * sunI * tint * 2.4;
    tau += ds * 0.7;
  }
  return col0 * exp(-tau * $luft_schleier) + S;
}
`,
  r: { luft: 'r_luft' },
};
