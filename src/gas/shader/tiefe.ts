// Baustein Tiefe aus der Physik: Hochdruck-Wirbel wölben sich, Tiefdruck-Wirbel sind Senken (Druck oder Wirbelstärke/Coriolis, geostrophisch). Einhängepunkt: hook_tiefe; Funktionen depthAt/zetaAt (auch von der Parallaxe genutzt).
export const TIEFE_FUNK = /* wgsl */`
// Wirbelstärke ζ aus dem Wind (geht in beiden Rechenmodellen)
fn zetaAt(q: vec3f, e: f32) -> f32 {
  let tb = tangentBasis(q);
  let a = dot(textureSampleLevel(velTex, samp, normalize(q + tb[0] * e), 0.0).xyz, tb[1]);
  let b = dot(textureSampleLevel(velTex, samp, normalize(q - tb[0] * e), 0.0).xyz, tb[1]);
  let c = dot(textureSampleLevel(velTex, samp, normalize(q + tb[1] * e), 0.0).xyz, tb[0]);
  let d = dot(textureSampleLevel(velTex, samp, normalize(q - tb[1] * e), 0.0).xyz, tb[0]);
  return (a - b - c + d) / (2.0 * e);
}
// Tiefe aus der Physik: Hochdruck-Wirbel wölben sich, Tiefdruck-Wirbel sind Senken.
// Druck (nur Stable Fluids) oder Wirbelstärke geteilt durch Coriolis (geostrophisch, beide Modelle).
fn depthAt(q: vec3f) -> f32 {
  let fs = U.p3.x;
  if (U.p5.z < 0.5) { return textureSampleLevel(prsTex, samp, q, 0.0).x * 60.0 * fs * fs * 0.25; }
  let f = select(-1.0, 1.0, q.y >= 0.0) * max(abs(q.y), 0.15);
  return -zetaAt(q, 1.5 / U.p5.w) * fs * 0.015 / f * 0.3;
}
`;

export const TIEFE = /* wgsl */`
fn hook_tiefe(q: vec3f, n0: vec3f) -> vec3f {
  var n = n0;
  if (U.p5.x > 0.5) {
      let tb = tangentBasis(q);
      let e = 2.0 / U.p5.w;
      let gx = depthAt(normalize(q + tb[0] * e)) - depthAt(normalize(q - tb[0] * e));
      let gy = depthAt(normalize(q + tb[1] * e)) - depthAt(normalize(q - tb[1] * e));
      n = normalize(n - (tb[0] * gx + tb[1] * gy) * U.p5.y * 0.5);
  }
  return n;
}
`;

export const TIEFE_AUS = /* wgsl */`
fn hook_tiefe(q: vec3f, n0: vec3f) -> vec3f { return n0; }
`;
