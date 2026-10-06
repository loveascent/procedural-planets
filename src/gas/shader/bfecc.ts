// Baustein BFECC-Korrektur der Advektion (Kim et al. 2005; im mofu-Artikel 2022): ein Rückwärts-/Vorwärtsschritt mehr, schärfer. Einhängepunkte: hook_bfecc_wind (Wind, liest A), hook_bfecc_farbe (Farbstoff, liest B). Aus: einfacher Semi-Lagrange-Schritt.
export const BFECC = /* wgsl */`
fn hook_bfecc_wind(p: vec3f, src0: vec3f, dt: f32) -> vec3f {
  var src = src0;
  if (S.bfecc > 0.5) {
    let u1 = A(src).xyz;
    let back = stepOn(src, u1 * dt);
    let p3 = normalize(p - (back - p) * 0.5);
    let u2 = A(p3).xyz;
    src = stepOn(p3, -u2 * dt);
  }
  return src;
}
fn hook_bfecc_farbe(p: vec3f, src0: vec3f, dt: f32) -> vec3f {
  var src = src0;
  if (S.bfecc > 0.5) {
    let u1 = B(src).xyz;
    let back = stepOn(src, u1 * dt);
    let p3 = normalize(p - (back - p) * 0.5);
    let u2 = B(p3).xyz;
    src = stepOn(p3, -u2 * dt);
  }
  return src;
}
`;

export const BFECC_AUS = /* wgsl */`
fn hook_bfecc_wind(p: vec3f, src0: vec3f, dt: f32) -> vec3f { return src0; }
fn hook_bfecc_farbe(p: vec3f, src0: vec3f, dt: f32) -> vec3f { return src0; }
`;
