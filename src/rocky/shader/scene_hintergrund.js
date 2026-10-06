// Hintergrund: Himmel und Sonne über die Einhängepunkte hook_himmel und hook_sonne.
export const SCENE_HINTERGRUND = /* wgsl */`
// ---- Hintergrund: gemeinsamer Himmel (src/sky), dazu die Sonne
@fragment fn fsBg(vin: VO) -> @location(0) vec4f {
  let w = U.ivp * vec4f(vin.uv * 2.0 - 1.0, 1.0, 1.0);
  let dir = normalize(w.xyz / w.w - U.cam.xyz);
  let pix = max(length(fwidth(dir)), 1e-5);
  var col = hook_himmel(dir, pix, select(0.0, U.Bg.z, U.Md.w > 0.5), U.Bg.x, U.Bg.y);
  col = hook_sonne(col, dir, pix);
  return vec4f(col, 1.0);
}
`;
