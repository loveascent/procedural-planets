// Baustein Atmosphärensaum: heller Rand der Tagseite, Farbe aus der Oberflächentönung.
export const SAUM = /* wgsl */`
fn hook_saum(nw: vec3f, zumAuge: vec3f, L: vec3f, staerke: f32, gas: bool, tag: f32) -> vec3f {
  let rand = pow(1.0 - clamp(dot(nw, zumAuge), 0.0, 1.0), 3.0);
  let farbe = select(vec3f(0.35, 0.55, 1.0), vec3f(0.95, 0.8, 0.6), gas);
  return farbe * rand * staerke * (0.05 + 0.95 * tag) * 0.7;
}
`;
export const SAUM_AUS = /* wgsl */`
fn hook_saum(nw: vec3f, zumAuge: vec3f, L: vec3f, staerke: f32, gas: bool, tag: f32) -> vec3f { return vec3f(0.0); }
`;
