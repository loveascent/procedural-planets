// Quelle (CREDITS.md): Strugar, Continuous Distance-Dependent Level of Detail for Rendering Heightmaps (CDLOD, 2009), Geomorphing.
// Baustein Netz-Geomorphing (Versuch v24; Standard ist das Netz wie v23). Einhängepunkt für vsPatch: hook_geomorph.
export const GEOMORPH = /* wgsl */`
struct GeoOut { uv: vec2f, lod: f32, gl: vec2f }   // gl: Gitterort in der Kachel (0..1) nach dem Morphen
fn hook_geomorph(g: vec3f, inst: vec4f, uv0: vec2f, lod0: f32, gm: f32, dY: f32) -> GeoOut {
  var uv = uv0;
  var lod = lod0;
  var gl = g.xy;
  if (gm > 0.5) {
    let M = modelM();
    let dist = length(U.cam.xyz - M * faceDir(i32(inst.x), uv));
    let rTile = inst.w * 1.1 * dY;
    let mk = clamp((dist / rTile - 1.3) / 0.5, 0.0, 1.0);
    gl = g.xy - fract(g.xy * PATCH_G * 0.5) * (2.0 / PATCH_G) * mk;
    uv = inst.yz + gl * inst.w;
    lod = max(log2(U.T.x * dist / (1.1 * dY * PATCH_G)), 0.0);
  }
  return GeoOut(uv, lod, gl);
}
`;

// Geomorphing AUS (Standard): Netz wie v23. Wird statt GEOMORPH mitkompiliert.
export const GEOMORPH_AUS = /* wgsl */`
struct GeoOut { uv: vec2f, lod: f32, gl: vec2f }   // gl: Gitterort in der Kachel (0..1) nach dem Morphen
fn hook_geomorph(g: vec3f, inst: vec4f, uv0: vec2f, lod0: f32, gm: f32, dY: f32) -> GeoOut { return GeoOut(uv0, lod0, g.xy); }
`;
