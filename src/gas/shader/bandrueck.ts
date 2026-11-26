// Baustein Bandrückstellung: der Farbstoff kehrt langsam zur Bandfarbe zurück. Einhängepunkt: hook_bandrueck. Aus (Rückstellung = 0): Farbstoff bleibt, wie die Strömung ihn formt.
export const BANDRUECK = /* wgsl */`
fn hook_bandrueck(c0: vec3f, p: vec3f, z: vec4f, dt: f32) -> vec3f {
  return mix(c0, bandTargetZ(p, z), 1.0 - exp(-S.bandRelax * dt));
}
`;

export const BANDRUECK_AUS = /* wgsl */`
fn hook_bandrueck(c0: vec3f, p: vec3f, z: vec4f, dt: f32) -> vec3f { return c0; }
`;
