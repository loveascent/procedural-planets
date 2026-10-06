// Baustein Relief aus der Helligkeit der Wolken (helle Wolken liegen höher, dunkle tiefer): einfach oder mehrstufig (große Strukturen tief, feine Krümel schwach, Schrittweite nach Pixelgröße). Einhängepunkt: hook_relief.
export const RELIEF_MEHRSTUFIG = /* wgsl */`
// Helligkeit, über ein Kreuz der Breite s gemittelt (grobe Stufe ohne Mipmaps)
fn lumBlur(q: vec3f, tb: mat2x3f, s: f32) -> f32 {
  return 0.25 * (lumAt(normalize(q + tb[0] * s)) + lumAt(normalize(q - tb[0] * s)) + lumAt(normalize(q + tb[1] * s)) + lumAt(normalize(q - tb[1] * s)));
}
fn hook_relief(q: vec3f, d: vec3f, n0: vec3f, tPlanet: f32) -> vec3f {
  var n = n0;
    if (U.p0.y > 0.0 && U.p4.y > 0.0) {
      let tb = tangentBasis(q);
      let foot = tPlanet * U.p3.y / max(dot(-d, n), 0.2);
      let e0 = max(3.0 / U.p2.w, foot * 1.5 * U.p4.w);
      let fx = lumAt(normalize(q + tb[0] * e0)) - lumAt(normalize(q - tb[0] * e0));
      let fy = lumAt(normalize(q + tb[1] * e0)) - lumAt(normalize(q - tb[1] * e0));
      var gx = fx * U.p4.z;
      var gy = fy * U.p4.z;
      for (var k = 0; k < 2; k++) {
        let s = e0 * U.p6.w * select(16.0, 4.0, k == 0);
        // Unterschied über die breitere Strecke auf die Steigung der feinen Stufe umrechnen (×e₀/s), mit √ statt linear,
        // damit große Strukturen etwas mehr Tiefe behalten als ihre reine Steigung
        let w = U.p4.y * 0.5 * sqrt(e0 / s);
        gx += (lumBlur(normalize(q + tb[0] * s), tb, s * 0.5) - lumBlur(normalize(q - tb[0] * s), tb, s * 0.5)) * w;
        gy += (lumBlur(normalize(q + tb[1] * s), tb, s * 0.5) - lumBlur(normalize(q - tb[1] * s), tb, s * 0.5)) * w;
      }
      n = normalize(n - (tb[0] * gx + tb[1] * gy) * U.p0.y * 3.0);
    }
  return n;
}
`;

export const RELIEF_EINFACH = /* wgsl */`
fn hook_relief(q: vec3f, d: vec3f, n0: vec3f, tPlanet: f32) -> vec3f {
  var n = n0;
  if (U.p0.y > 0.0) {
      let tb = tangentBasis(q);
      let e = 3.0 / U.p2.w;
      let lx = luminance(surface(normalize(q + tb[0] * e), 0)) - luminance(surface(normalize(q - tb[0] * e), 0));
      let ly = luminance(surface(normalize(q + tb[1] * e), 0)) - luminance(surface(normalize(q - tb[1] * e), 0));
      n = normalize(n - (tb[0] * lx + tb[1] * ly) * U.p0.y * 3.0);
    }
  return n;
}
`;

export const RELIEF_AUS = /* wgsl */`
fn hook_relief(q: vec3f, d: vec3f, n0: vec3f, tPlanet: f32) -> vec3f { return n0; }
`;
