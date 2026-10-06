// Quelle: eigene Umsetzung (echte Verschiebung der Oberfläche entlang der Normalen um die Höhe über dem Meeresspiegel). Keine fremde Vorlage.
// Baustein Relief-Höhe (Verschiebung im Vertex-Shader). Einhängepunkt: hook_relief.
export const RELIEF = /* wgsl */`
fn hook_relief(d: vec3f, lod: f32, hz: f32) -> f32 {
  var disp = 0.0;
  if (hz > 0.0) { disp = hz * max(texDirLod(tHm, d, U.T.x, lod).x - U.T.z, 0.0); }
  return disp;
}
`;

// Relief AUS: Kugel bleibt glatt (Berge nur im Licht, nicht in der Silhouette). Wird statt RELIEF mitkompiliert.
export const RELIEF_AUS = /* wgsl */`
fn hook_relief(d: vec3f, lod: f32, hz: f32) -> f32 { return 0.0; }
`;
