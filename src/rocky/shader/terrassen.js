// Quelle (CREDITS.md): eigene Umsetzung; Gesteinsschichten weich (Sinus/Smoothstep statt fract), siehe Kommentar im Shader. Keine fremde Vorlage.
// Baustein Terrassen (Gesteinsschichten als Stufen). Einhängepunkt: hook_terrassen. Eigenes Feld U.Te.
export const TERRASSEN = /* wgsl */`
struct TerrOut { h: f32, g: vec3f }
fn hook_terrassen(h0: f32, g0: vec3f, mois: f32, sea: f32, st: f32) -> TerrOut {
  var h = h0;
  var g = g0;
  if (st > 0.0) {
    let T_y = mois;
    let stp = 0.022;
      let x = (h - sea) / stp + 0.25 * sin(T_y * 40.0);
      let fl = floor(x);
      let fr = x - fl;
      let w = 0.5 - 0.42 * st;
      let tt = clamp((fr - 0.5 + w) / (2.0 * w), 0.0, 1.0);
      let sm = tt * tt * (3.0 - 2.0 * tt);
      let dsm = 6.0 * tt * (1.0 - tt) / (2.0 * w);
      h = mix(h, sea + (fl + sm) * stp, st);
      g = mix(g, g * dsm, st);

  }
  return TerrOut(h, g);
}
`;

// Terrassen AUS: Gelände bleibt glatt. Wird statt TERRASSEN mitkompiliert.
export const TERRASSEN_AUS = /* wgsl */`
struct TerrOut { h: f32, g: vec3f }
fn hook_terrassen(h0: f32, g0: vec3f, mois: f32, sea: f32, st: f32) -> TerrOut { return TerrOut(h0, g0); }
`;
