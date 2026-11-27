// Farbstoff: Bandfarben mit mäandernden Rändern, Konvektionsflecken, Rückstellung, Anfangsfarbe, Mitführen mit dem Wind.
export const FARBSTOFF = /* wgsl */`
// Bänder mit mäandernden Rändern: die Breite wird leicht verrauscht, bevor die
// Bandfarbe nachgeschlagen wird.
fn bandRausch(p: vec3f) -> f32 { return noised(p * 4.0 + vec3f(S.seed, S.time * 0.01, 0.0)).x; }
fn bandTarget(p: vec3f) -> vec3f {
  let lat = latitude(p) + bandRausch(p) * S.bandWobble * 0.04;
  return hook_streifen(lat);
}
// Dasselbe aus dem Pflege-Ziel z = Z(p) und der Bandfarben-Tabelle: statt 3 Rauschberechnungen zwei Abtastungen.
fn bandTargetZ(p: vec3f, z: vec4f) -> vec3f { return bandLutAt(latitude(p) + z.x * S.bandWobble * 0.04); }

fn relaxColor(p: vec3f, c0: vec3f) -> vec3f {
  let dt = S.dt;
  let z = Z(p);
  var c = hook_bandrueck(c0, p, z, dt);
  c = hook_sturmfarbe(c, p, dt);
  c = hook_konvektion(c, p, z, dt);
  return c;
}

// Pflege-Ziel neu schreiben (Auflösung = Zielfeld, sim.ts step): das Mäander-Rauschen von bandTarget.
@compute @workgroup_size(8, 8, 1)
fn pflegeZiel(@builtin(global_invocation_id) id: vec3u) {
  let n = textureDimensions(dst).x;
  if (id.x >= n || id.y >= n) { return; }
  let p = texDir(id, f32(n));
  textureStore(dst, id.xy, id.z, vec4f(bandRausch(p), 0.0, 0.0, 1.0));
}

// Bandfarben-Tabelle: Eintrag i liegt in der Texelmitte (i + 0,5) / LUT_N, wie bandLutAt abtastet.
@compute @workgroup_size(64, 1, 1)
fn bandLut(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= LUT_N) { return; }
  let lat = ((f32(id.x) + 0.5) / LUT_N * 2.0 - 1.0) * LUT_L;
  textureStore(dst, vec2u(id.x, 0u), 0u, vec4f(hook_streifen(lat), 1.0));
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
