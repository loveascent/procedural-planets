// Baustein Sturmfarbe: Stürme färben den Farbstoff in ihrer Farbe. Einhängepunkt: hook_sturmfarbe. Aus (Sturmfarbe = 0): keine Tönung.
export const STURMFARBE = /* wgsl */`
fn hook_sturmfarbe(c0: vec3f, p: vec3f, dt: f32) -> vec3f {
  let sm = stormMask(p, 0.55);
  return mix(c0, sm.rgb, (1.0 - exp(-S.stormTint * dt)) * sm.w);
}
`;

export const STURMFARBE_AUS = /* wgsl */`
fn hook_sturmfarbe(c0: vec3f, p: vec3f, dt: f32) -> vec3f { return c0; }
`;
