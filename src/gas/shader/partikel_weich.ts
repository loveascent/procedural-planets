// Partikel: Weichzeichnen und zur Bandfarbe zurückblenden (Darstellung „Partikel“, Rechenschritt blurRelax).
export const PARTIKEL_WEICH = /* wgsl */`
// Weichzeichnen und zur Bandfarbe zurückblenden. A = Farbstoff nach Partikeln.
@compute @workgroup_size(8, 8, 1)
fn blurRelax(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  let p = texDir(id, S.dyeN);
  let tb = tangentBasis(p);
  let h = 1.6 / S.dyeN;
  let c = A(p).rgb;
  let avg = (A(stepOn(p, tb[0] * h)).rgb + A(stepOn(p, -tb[0] * h)).rgb
           + A(stepOn(p, tb[1] * h)).rgb + A(stepOn(p, -tb[1] * h)).rgb) * 0.25;
  let blurred = mix(c, avg, S.blur);
  textureStore(dst, id.xy, id.z, vec4f(relaxColor(p, blurred), 1.0));
}
`;
