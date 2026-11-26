// Baustein Konvektion: aufsteigende Wolkentürme als helle Flecken in niedrigen und mittleren Breiten. Einhängepunkt: hook_konvektion. Aus (Konvektion = 0): keine Flecken.
export const KONVEKTION = /* wgsl */`
fn konvRausch(p: vec3f) -> f32 { return noised(p * 13.0 + vec3f(S.seed * 3.1, 0.0, S.time * 0.04)).x; }
// Direkt gerechnet, nicht aus dem Pflege-Ziel: bilinear aus Farbstoff-Auflösung/4 wurden die Türme nach 900 Schritten
// sichtbar schwächer (Lupe 26.11.), weil smoothstep(0,5; 0,66) den Interpolationsfehler des Rauschens ~9-fach verstärkt.
fn convectionSpot(p: vec3f, n: f32) -> f32 {
  // Aufsteigende Wolkentürme vor allem in niedrigen und mittleren Breiten.
  return smoothstep(0.5, 0.66, n) * smoothstep(1.15, 0.8, abs(latitude(p)));
}
fn hook_konvektion(c0: vec3f, p: vec3f, z: vec4f, dt: f32) -> vec3f {
  return mix(c0, S.cloud.rgb, (1.0 - exp(-S.convection * dt)) * convectionSpot(p, konvRausch(p)));
}
`;

export const KONVEKTION_AUS = /* wgsl */`
fn konvRausch(p: vec3f) -> f32 { return 0.0; }
fn hook_konvektion(c0: vec3f, p: vec3f, z: vec4f, dt: f32) -> vec3f { return c0; }
`;
