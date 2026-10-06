// Baustein Randschimmer der Atmosphäre am Planetenrand: wie v0.4, weich (schmaler, folgt dem Sonnenlicht stetig) oder aus. Einhängepunkt: hook_randschimmer.
export const RAND_V04 = /* wgsl */`
fn hook_randschimmer(ndv: f32, ndl: f32) -> f32 {
  return pow(1.0 - ndv, 3.0) * U.atmo.w * smoothstep(-0.2, 0.3, ndl);
}
`;

export const RAND_WEICH = /* wgsl */`
fn hook_randschimmer(ndv: f32, ndl: f32) -> f32 {
  return pow(1.0 - ndv, 5.0) * U.atmo.w * sqrt(clamp(ndl + 0.1, 0.0, 1.0));
}
`;

export const RAND_AUS = /* wgsl */`
fn hook_randschimmer(ndv: f32, ndl: f32) -> f32 { return 0.0; }
`;
