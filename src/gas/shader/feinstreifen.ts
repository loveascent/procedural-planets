// Baustein Feinstreifen: feine Farbstreifen innerhalb der Bänder, damit die Strömung sichtbare Filamente ziehen kann. Einhängepunkt: hook_streifen. Aus (Feinstreifen = 0): glatter Verlauf.
export const FEINSTREIFEN = /* wgsl */`
fn hook_streifen(lat: f32) -> vec3f {
  // Feine Streifen innerhalb der Bänder: ohne feine Farbunterschiede kann die Strömung
  // keine sichtbaren Filamente ziehen (ein gedehnter glatter Verlauf bleibt glatt).
  if (S.fineStripes <= 0.0) { return bandAt(lat); }   // spart 2 Rauschberechnungen pro Texel
  let fine = noised(vec3f(lat * 45.0, S.seed * 7.0, 0.5)).x + 0.6 * noised(vec3f(lat * 110.0, S.seed * 3.0, 2.5)).x;
  return bandAt(lat) * (1.0 + fine * S.fineStripes * 0.6);
}
`;

export const FEINSTREIFEN_AUS = /* wgsl */`
fn hook_streifen(lat: f32) -> vec3f { return bandAt(lat); }
`;
