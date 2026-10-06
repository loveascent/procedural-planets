// Wind-Profil (Jets) und Bandfarben je Breite, aus den Tabellen in Sim.
export const TABELLEN = /* wgsl */`
// ---------- Tabellen ----------

fn jetAt(lat: f32) -> f32 {
  let x = clamp((lat / PI + 0.5) * 63.0, 0.0, 63.0);
  let i = u32(floor(x));
  let j = min(i + 1u, 63u);
  let a = S.jets[i / 4u][i % 4u];
  let b = S.jets[j / 4u][j % 4u];
  return mix(a, b, fract(x)) * S.jetStrength;
}

fn bandAt(lat: f32) -> vec3f {
  let x = clamp((lat / PI + 0.5) * 63.0, 0.0, 63.0);
  let i = u32(floor(x));
  let j = min(i + 1u, 63u);
  return mix(S.bands[i].rgb, S.bands[j].rgb, fract(x));
}
`;
