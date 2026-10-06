// Quelle: eigene Umsetzung (Differenz der Höhe zu einer gröberen Mipmap: Täler dunkler, Grate heller); CREDITS.md nennt keine fremde Vorlage.
// Baustein Kavität (Umgebungsverdunklung auf dem Land). Einhängepunkt: hook_kavitaet.
export const KAVITAET = /* wgsl */`
fn hook_kavitaet(F: Face, N: f32, lod: f32, hx: f32) -> f32 {
  let hb = texFaceLod(tHm, F, N, lod + 3.0).x;
  let cav = clamp((hx - hb) * 30.0, -1.0, 1.0);
  return clamp(1.0 + cav * 0.45, 0.45, 1.15);
}
`;

// Kavität AUS: keine Verdunklung. Wird statt KAVITAET mitkompiliert.
export const KAVITAET_AUS = /* wgsl */`
fn hook_kavitaet(F: Face, N: f32, lod: f32, hx: f32) -> f32 { return 1.0; }
`;
