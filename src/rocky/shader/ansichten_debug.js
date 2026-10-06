// Eigene Umsetzung (Prüf- und Arbeitsansichten: Höhe, Feuchte, Normalen, Rauigkeit, Albedo, Flusskarte). Keine fremde Vorlage.
// Baustein Debug-Ansichten des Gesteinsplaneten (Menü „Anzeige“). Einhängepunkt: hook_debug_ansicht. Aus (Anzeige = Farbe): Bild bleibt, wie es ist.
export const ANSICHTEN_DEBUG = /* wgsl */`
fn hook_debug_ansicht(col0: vec3f, view: i32, hy: vec4f, h: f32, mN: f32, nOut: vec3f, roughOut: f32, albOut: vec3f) -> vec3f {
  var col = col0;
  if (view == 6) { col = vec3f(hy.x * 20.0, select(0.0, 1.0, hy.y > h), hy.z) * 0.3; }
  if (view == 1) { col = vec3f(clamp(h, 0.0, 1.0)) * 0.3; }
  else if (view == 2) { col = vec3f(mN) * 0.3; }
  else if (view == 3) { col = (nOut * 0.5 + 0.5) * 0.3; }
  else if (view == 4) { col = vec3f(roughOut) * 0.3; }
  else if (view == 5) { col = albOut * 0.6; }
  return col;
}
`;

export const ANSICHTEN_DEBUG_AUS = /* wgsl */`
fn hook_debug_ansicht(col0: vec3f, view: i32, hy: vec4f, h: f32, mN: f32, nOut: vec3f, roughOut: f32, albOut: vec3f) -> vec3f { return col0; }
`;
