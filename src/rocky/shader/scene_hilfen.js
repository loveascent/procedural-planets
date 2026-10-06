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


// Horizontverfolgung zur Sonne über die Höhenkarte (weiche Schatten)
`;
