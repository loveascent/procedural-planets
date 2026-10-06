// Farbstoff: Bandfarben mit mäandernden Rändern, Konvektionsflecken, Rückstellung, Anfangsfarbe, Mitführen mit dem Wind.
export const FARBSTOFF = /* wgsl */`
// Bänder mit mäandernden Rändern: die Breite wird leicht verrauscht, bevor die
// Bandfarbe nachgeschlagen wird.
fn bandTarget(p: vec3f) -> vec3f {
  let w = noised(p * 4.0 + vec3f(S.seed, S.time * 0.01, 0.0)).x;
  let lat = latitude(p) + w * S.bandWobble * 0.04;
  return hook_streifen(lat);
}

fn relaxColor(p: vec3f, c0: vec3f) -> vec3f {
  let dt = S.dt;
  var c = hook_bandrueck(c0, p, dt);
  c = hook_sturmfarbe(c, p, dt);
  c = hook_konvektion(c, p, dt);
  return c;
}

@compute @workgroup_size(8, 8, 1)
fn initDye(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  let p = texDir(id, S.dyeN);
  if (S.mode.x > 0.5) { textureStore(dst, id.xy, id.z, vec4f(bandTarget(p), 1.0)); return; }
  let sm = stormMask(p, 0.55);
  textureStore(dst, id.xy, id.z, vec4f(mix(bandTarget(p), sm.rgb, sm.w), 1.0));
}

// Farbstoff mit dem Wind (B) mitführen, A = Farbstoff.
@compute @workgroup_size(8, 8, 1)
fn advectDye(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  let p = texDir(id, S.dyeN);
  let dt = S.dt;
  let u0 = B(p).xyz;
  var src = stepOn(p, -u0 * dt);
  src = hook_bfecc_farbe(p, src, dt);
  var c = A(src).rgb;
  if (any(c != c)) { c = bandTarget(p); }
  textureStore(dst, id.xy, id.z, vec4f(relaxColor(p, c), 1.0));
}
`;
