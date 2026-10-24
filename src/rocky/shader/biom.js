// Quellen (CREDITS.md): colordodge ProceduralPlanet (Biom-Bild: x = Feuchte, y = Höhe, WTFPL) für BIOM_CD; Klimazonen nach Temperatur, Feuchte und Hang für BIOM_ERDE sind eigene Umsetzung (Idee: Lagrange, nur Ideen).
// Zwei Bausteine für die Landfarbe, je nach Palette: Original-Biombild (cd) oder Erdähnlich (earth). Einhängepunkte: hook_biom_cd, hook_biom_erde.
export const BIOM_CD = /* wgsl */`
fn hook_biom_cd(mois: f32, h: f32, slope: f32) -> vec4f {
  var alb: vec3f;
  var rough: f32;
  alb = toLin(biome(vec2f(mois, h)));
  rough = 0.7;
  let rk = smoothstep(0.12, 0.3, slope);
  alb = mix(alb, alb * 0.7 + vec3f(0.03), rk * 0.5);
  return vec4f(alb, rough);
}
`;

// Biom Original-Biombild AUS (Standard: erdähnliche Palette): nicht mitkompiliert.
export const BIOM_CD_AUS = /* wgsl */`
fn hook_biom_cd(mois: f32, h: f32, slope: f32) -> vec4f { return vec4f(0.5, 0.5, 0.5, 0.8); }
`;

export const BIOM_ERDE = /* wgsl */`
// Klimazonen (erdähnliche Palette, lineare Albedo). Rückgabe: (Albedo, Rauigkeit)
fn earthBiome(d: vec3f, h: f32, m: f32, slope: f32, nz: f32) -> vec4f {
  // Mond (Vulkantyp 2): graue Hochländer, dunkle Maria in den Senken des Feuchtefelds, steile Hänge frisch und heller
  if (U.Vk.z > 1.5) {
    let mare = smoothstep(0.5, 0.62, m);
    let hl = vec3f(0.150, 0.145, 0.130);
    let ma = vec3f(0.062, 0.062, 0.062);
    var a = mix(hl, ma, mare) * (1.0 + 0.16 * nz);
    a *= 1.0 + 0.9 * smoothstep(0.08, 0.35, slope);
    return vec4f(a, 0.92);
  }
  let sea = U.T.z;
  let lat = abs(d.y);
  let elev = max(h - sea, 0.0);
  let temp = 1.0 - 1.25 * pow(lat, 1.35) - elev * 1.6 + nz * 0.08;
  let latDeg = asin(lat) * 57.2958;
  let circ = 0.35 * exp(-sq(latDeg / 10.0)) - 0.35 * exp(-sq((latDeg - 25.0) / 9.0)) + 0.15 * exp(-sq((latDeg - 55.0) / 12.0));
  let moist = clamp(m * 0.8 + circ + 0.08 - elev * 0.3 + nz * 0.05, 0.0, 1.0);
  let desert = mix(vec3f(0.56, 0.41, 0.25), vec3f(0.45, 0.24, 0.12), clamp(nz * 0.8 + 0.5, 0.0, 1.0));
  let steppe = vec3f(0.30, 0.26, 0.14);
  let grass = vec3f(0.12, 0.15, 0.055);
  let forest = vec3f(0.04, 0.075, 0.028);
  let jungle = vec3f(0.022, 0.055, 0.016);
  let taiga = vec3f(0.035, 0.055, 0.042);
  let tundra = vec3f(0.19, 0.18, 0.13);
  var warm = mix(desert, steppe, smoothstep(0.14, 0.3, moist));
  warm = mix(warm, grass, smoothstep(0.3, 0.46, moist));
  warm = mix(warm, forest, smoothstep(0.48, 0.64, moist));
  warm = mix(warm, jungle, smoothstep(0.66, 0.85, moist) * smoothstep(0.55, 0.85, temp));
  let cold = mix(tundra, taiga, smoothstep(0.35, 0.55, moist));
  var alb = mix(cold, warm, smoothstep(0.12, 0.38, temp));
  var rough = 0.86;
  let beach = (1.0 - smoothstep(0.002, 0.008, elev)) * smoothstep(0.1, 0.3, temp) * (1.0 - smoothstep(0.12, 0.3, slope));
  alb = mix(alb, vec3f(0.62, 0.55, 0.40), beach);
  let rk = smoothstep(0.1, 0.28, slope + elev * 0.15);
  // Gesteinsschichten weich (Sinus statt Sägezahn): die harte Kante von fract() sah aus wie Höhenlinien
  let rock = vec3f(0.21, 0.19, 0.17) * (0.9 + 0.12 * sin(6.2832 * (h * 131.0 + nz * 0.7)));
  alb = mix(alb, rock, rk);
  rough = mix(rough, 0.6, rk);
  let sn = (1.0 - smoothstep(-0.08, 0.02, temp)) * (1.0 - smoothstep(0.3, 0.55, slope));
  alb = mix(alb, vec3f(0.86, 0.88, 0.92), sn);
  rough = mix(rough, 0.32, sn);
  return vec4f(alb, rough);
}
fn hook_biom_erde(F: Face, N: f32, lod: f32, d: vec3f, h: f32, mN: f32, g: vec3f, nz: f32) -> vec4f {
  var alb: vec3f;
  var rough: f32;
  // Bewuchs und Fels nach der Hangneigung im Größeren, nicht nach jeder kleinen Rinne
  let Tb = texFaceLod(tHm, F, N, lod + 2.0);
  let kB = 0.075;                     // feste Überhöhung: Relief-Regler ändert nur das Licht, nicht den Bewuchs
  let slopeB = 1.0 - dot(normalize(d - kB * (Tb.z * F.jx + Tb.w * F.jy)), d);
  let slope0 = 1.0 - dot(normalize(d - kB * g), d);
  let eb = earthBiome(d, h, mN, mix(slope0, slopeB, 0.7), nz);
  alb = eb.rgb;
  rough = eb.a;
  return vec4f(alb, rough);
}
`;

// Biom Erdähnlich AUS (Palette Original-Biombild): keine Klimazonen. Wird statt BIOM_ERDE mitkompiliert.
export const BIOM_ERDE_AUS = /* wgsl */`
fn hook_biom_erde(F: Face, N: f32, lod: f32, d: vec3f, h: f32, mN: f32, g: vec3f, nz: f32) -> vec4f { return vec4f(0.5, 0.5, 0.5, 0.8); }
`;
