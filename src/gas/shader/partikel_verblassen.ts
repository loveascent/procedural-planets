// Partikel-Schiene nach jasper-r: Weichzeichnen und langsam zu EINER Mittelfarbe verblassen (Darstellung „Partikel rein“, Rechenschritt blurFade).
export const PARTIKEL_VERBLASSEN = /* wgsl */`
// Partikel-Schiene (jasper-r): weichzeichnen und langsam zu EINER Mittelfarbe verblassen.
// Keine Rückstellung zur Bandfarbe, keine Sturmfarbe: alle Struktur kommt von den Partikeln.
@compute @workgroup_size(8, 8, 1)
fn blurFade(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  let p = texDir(id, S.dyeN);
  let tb = tangentBasis(p);
  let h = 1.6 / S.dyeN;
  let c = A(p).rgb;
  let avg = (A(stepOn(p, tb[0] * h)).rgb + A(stepOn(p, -tb[0] * h)).rgb
           + A(stepOn(p, tb[1] * h)).rgb + A(stepOn(p, -tb[1] * h)).rgb) * 0.25;
  let blurred = mix(c, avg, S.blur);
  textureStore(dst, id.xy, id.z, vec4f(mix(blurred, S.centre.rgb, 1.0 - exp(-S.centre.w * S.dt)), 1.0));
}
`;
