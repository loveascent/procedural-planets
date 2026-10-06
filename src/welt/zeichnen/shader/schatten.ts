// Baustein Schatten & Finsternisse: Strahl zur Sonne gegen alle anderen Kugeln, Halbschatten wächst mit dem Abstand.
export const SCHATTEN = /* wgsl */`
fn hook_schatten(w: vec3f, L: vec3f, ds: f32, mitte: vec3f, radius: f32) -> f32 {
  var licht = 1.0;
  let n = i32(u.pix.y);
  for (var k = 0; k < n; k = k + 1) {
    let s = u.kugeln[k];
    if (s.w <= 0.0) { continue; }
    let oc = s.xyz - w;
    if (length(s.xyz - mitte) < 1e-3) { continue; }
    let t = dot(oc, L);
    if (t <= 0.0 || t > ds) { continue; }
    let d = sqrt(max(dot(oc, oc) - t * t, 0.0));
    let breit = t * (u.sonne.w / ds) * 0.5 + 0.02;
    licht = licht * smoothstep(s.w - breit, s.w + breit, d);
  }
  return licht;
}
`;
export const SCHATTEN_AUS = /* wgsl */`
fn hook_schatten(w: vec3f, L: vec3f, ds: f32, mitte: vec3f, radius: f32) -> f32 { return 1.0; }
`;
