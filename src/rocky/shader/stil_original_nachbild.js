// Quelle (CREDITS.md): colordodge ProceduralPlanet (three.js, WTFPL): Leuchtsaum (glow-Shader) und Wolkenschicht des Originals, hier 1:1 nachgebaut.
// Baustein Stil „Original 1:1“, Teil Wolken und Nachbild: Wolkendichte und -bild des Originals, Leuchtsaum I = (c − n·v)^p. Einhängepunkte: hook_wolken_orig_dichte, hook_wolken_orig_bild, hook_leuchtsaum_original.
// Wird nur im Stil Original mitkompiliert.
export const STIL_ORIGINAL_WOLKEN = /* wgsl */`
fn hook_wolken_orig_dichte(d: vec3f, lod: f32) -> f32 {
  let Cl = U.Cl;
  let Cl2 = U.Cl2;
  let Nc = U.T.y;
  let c = texDirLod(tCloud, rotY(d, Cl2.y), Nc, lod).b;
  return smoothstep(1.0 - Cl.x, 1.0 - Cl.x + 0.45, c);
}
fn hook_wolken_orig_bild(muS: f32, dens: f32) -> vec4f {
  // Original: weiße, halbtransparente Schicht mit Standardmaterial
  let NL = max(muS, 0.0);
  let a = dens * U.Cl2.z;
  let col = vec3f(1.0) * (NL * U.Mq.z * 0.9 + U.O.w);
  return vec4f(col * a, a);
}
`;

// Original-Wolken AUS (Stil „+20 % besser“): nicht mitkompiliert.
export const STIL_ORIGINAL_WOLKEN_AUS = /* wgsl */`
fn hook_wolken_orig_dichte(d: vec3f, lod: f32) -> f32 { return 0.0; }
fn hook_wolken_orig_bild(muS: f32, dens: f32) -> vec4f { return vec4f(0.0); }
`;

export const STIL_ORIGINAL_LEUCHTSAUM = /* wgsl */`
fn hook_leuchtsaum_original(col0: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f) -> vec4f {
  var col = col0;
  // Original: Leuchtsaum wie der three.js-glow-Shader, I = (c − n·v)^p
  if (b < 0.0 && U.Glow.w > 0.0) {
    let imp = sqrt(max(c2 - b * b, 0.0));
    let pc = normalize(cam - dir * b);
    let lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(pc, sun));
    var gl = pow(max(0.0, 1.0 - (imp - 1.0) / 0.09), 3.0) * 0.55;
    if (imp < 1.0) { gl = pow(imp, 10.0) * 0.55; }
    col += U.Glow.rgb * gl * lit * U.Glow.w;
  }
  return vec4f(col, 1.0);
}
`;

// Original-Leuchtsaum AUS (Stil „+20 % besser“): nicht mitkompiliert.
export const STIL_ORIGINAL_LEUCHTSAUM_AUS = /* wgsl */`
fn hook_leuchtsaum_original(col0: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f) -> vec4f { return vec4f(col0, 1.0); }
`;
