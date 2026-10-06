// Baustein Konvektion: aufsteigende Wolkentürme als helle Flecken in niedrigen und mittleren Breiten. Einhängepunkt: hook_konvektion. Aus (Konvektion = 0): keine Flecken.
export const KONVEKTION = /* wgsl */`
fn convectionSpot(p: vec3f) -> f32 {
  let n = noised(p * 13.0 + vec3f(S.seed * 3.1, 0.0, S.time * 0.04)).x;
  // Aufsteigende Wolkentürme vor allem in niedrigen und mittleren Breiten.
  return smoothstep(0.5, 0.66, n) * smoothstep(1.15, 0.8, abs(latitude(p)));
}
fn hook_konvektion(c0: vec3f, p: vec3f, dt: f32) -> vec3f {
  return mix(c0, S.cloud.rgb, (1.0 - exp(-S.convection * dt)) * convectionSpot(p));
}
`;

export const KONVEKTION_AUS = /* wgsl */`
fn hook_konvektion(c0: vec3f, p: vec3f, dt: f32) -> vec3f { return c0; }
`;
