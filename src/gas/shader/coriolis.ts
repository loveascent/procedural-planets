// Baustein Coriolis: Drehung des Windvektors um die Flächennormale, f = 2Ω·sin(Breite). Einhängepunkt: hook_coriolis. Aus (Ω = 0): keine Drehung.
export const CORIOLIS = /* wgsl */`
fn hook_coriolis(u0: vec3f, p: vec3f, dt: f32) -> vec3f {
  var u = u0;
  // Coriolis: Drehung des Windvektors um die Flächennormale, f = 2Ω·sin(Breite).
  let a = -2.0 * S.omega * p.y * dt;
  u = u * cos(a) + cross(p, u) * sin(a);
  return u;
}
`;

export const CORIOLIS_AUS = /* wgsl */`
fn hook_coriolis(u0: vec3f, p: vec3f, dt: f32) -> vec3f { return u0; }
`;
