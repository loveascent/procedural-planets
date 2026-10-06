// Baustein Dämmerung: Saum an der Tag-Nacht-Grenze. Drei Wahlmöglichkeiten: wie v0.4 (Streifen), weich (nach Atmosphäre), aus. Einhängepunkt: hook_daemmerung.
export const DAEMMERUNG_V04 = /* wgsl */`
fn hook_daemmerung(light0: f32, ndl: f32) -> f32 {
  var light = light0;
  light += smoothstep(0.12, -0.05, ndl) * smoothstep(-0.25, 0.0, ndl) * 0.05;
  return light;
}
`;

export const DAEMMERUNG_WEICH = /* wgsl */`
fn hook_daemmerung(light0: f32, ndl: f32) -> f32 {
  var light = light0;
  // weich: fällt nur ab, ohne Buckel (Maximum zweier steigender Kurven), Stärke nach Atmosphäre
  light = max(light, smoothstep(-0.25, 0.12, ndl) * 0.05 * U.atmo.w / 0.35);
  return light;
}
`;

export const DAEMMERUNG_AUS = /* wgsl */`
fn hook_daemmerung(light0: f32, ndl: f32) -> f32 { return light0; }
`;
