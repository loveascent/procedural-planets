// Hilfen der Beleuchtung und Farbe: GGX-Verteilung und Smith-Sichtbarkeit (Walter et al. 2007), sRGB → linear, Helligkeit, Biom-Bild nachschlagen.
export const SCENE_HILFEN = /* wgsl */`
fn ggxD(NH: f32, a: f32) -> f32 { let a2 = a * a; let d = NH * NH * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
fn smithVis(NL: f32, NV: f32, a: f32) -> f32 {
  let a2 = a * a;
  let gv = NL * sqrt(a2 + (1.0 - a2) * NV * NV);
  let gl = NV * sqrt(a2 + (1.0 - a2) * NL * NL);
  return 0.5 / max(gv + gl, 1e-5);
}
fn toLin(c: vec3f) -> vec3f { return pow(max(c, vec3f(0.0)), vec3f(2.2)); }
fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn biome(uv: vec2f) -> vec3f { return textureSampleLevel(tBiome, samp, uv, 0.0).rgb; }
// Feuchte 0 … 1 aus dem Kartenwert (Oberfläche und Gras)
fn kartenFeuchte(m: f32) -> f32 { return clamp((m - U.Mq.x) / max(U.Mq.y - U.Mq.x, 1e-3), 0.0, 1.0); }
// Klima der erdähnlichen Palette (earthBiome und Gras): (Temperatur, Feuchte mit Zirkulation); nz = Streurauschen (Gras: 0)
fn klima(d: vec3f, elev: f32, m: f32, nz: f32) -> vec2f {
  let lat = abs(d.y);
  let temp = 1.0 - 1.25 * pow(lat, 1.35) - elev * 1.6 + nz * 0.08;
  let latDeg = asin(lat) * 57.2958;
  let circ = 0.35 * exp(-sq(latDeg / 10.0)) - 0.35 * exp(-sq((latDeg - 25.0) / 9.0)) + 0.15 * exp(-sq((latDeg - 55.0) / 12.0));
  return vec2f(temp, clamp(m * 0.8 + circ + 0.08 - elev * 0.3 + nz * 0.05, 0.0, 1.0));
}
// Planetensonne (rgb, gleiche Skala wie das Gelände: Bestrahlung / π) und Himmelslicht-Stärke (a) für Gras und Spielball
fn bodenLicht(muS: f32) -> vec4f {
  let day = smoothstep(-0.12, 0.25, muS);
  return vec4f(hook_luft_sonne(U.At.x, muS) * U.sun.w / PI * U.Bd.w,
    0.25 * U.L2.y * day * U.sun.w * luma(hook_luft_durchlass(U.At.x, max(muS, 0.05))) * U.Bd.w);
}
// Himmelslicht nach Normalenhöhe, Farbe wie im Vorbild GrassGPU (warm unten, blau oben)
fn himmelAmb(staerke: f32, n: vec3f, up: vec3f) -> vec3f { return staerke * mix(vec3f(0.12, 0.10, 0.07), vec3f(0.28, 0.4, 0.62), dot(n, up) * 0.5 + 0.5) / 0.37; }
// Eine Grat-Oktave (feindetail.js und nah.js): sn = (Rauschwert, Ableitung), Frequenz f; ergibt (Höhe, Steigung)
fn gratOktave(sn: vec4f, f: f32, amp: f32) -> vec4f {
  let s = 1.0 - abs(sn.x);                     // Grate statt Beulen
  let gs = select(-1.0, 1.0, sn.x < 0.0) * sn.yzw;
  let a = amp / f;
  return vec4f((s - 0.6) * a, gs * (f * a));
}
// Oktaven-Summe det auf Höhe und Steigung addieren, stärker in rauem Gelände (rauG = Steigung davor)
fn mitRauheit(det: vec4f, rauG: vec3f, h: f32, g: vec3f) -> DetOut {
  let rug = clamp(length(rauG) * 0.12, 0.25, 1.6);
  return DetOut(h + det.x * rug, g + det.yzw * rug);
}


// Horizontverfolgung zur Sonne über die Höhenkarte (weiche Schatten)
`;
