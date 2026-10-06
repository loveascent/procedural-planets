// Baustein Reibung: lineare Dämpfung begrenzt die Energie. Einhängepunkt: hook_reibung. Aus (Reibung = 0): keine Dämpfung.
export const REIBUNG = /* wgsl */`
fn hook_reibung(u0: vec3f, dt: f32) -> vec3f {
  var u = u0;
  u /= 1.0 + S.drag * dt;
  return u;
}
`;

export const REIBUNG_AUS = /* wgsl */`
fn hook_reibung(u0: vec3f, dt: f32) -> vec3f { return u0; }
`;
