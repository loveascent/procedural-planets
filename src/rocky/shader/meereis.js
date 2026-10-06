// Quelle: eigene Umsetzung (Schollen mit Rinnen aus Rauschen, Polnähe); CREDITS.md nennt keine fremde Vorlage.
// Baustein Meereis in Polnähe (nur erdähnliche Palette). Einhängepunkt: hook_meereis.
export const MEEREIS = /* wgsl */`
struct EisOut { col: vec3f, alb: vec3f }
fn hook_meereis(col0: vec3f, alb0: vec3f, d: vec3f, depth: f32, pix: f32, M: mat3x3f, sun: vec3f, Esh: vec3f, skyAmb: vec3f, pal: i32) -> EisOut {
  var col = col0;
  var albOut = alb0;
  if (pal == 1) {
    let lat = abs(d.y);
    let iceN = snoise(d * 16.0) * 0.045 + snoise(d * 64.0) * 0.02;
    let ice = smoothstep(0.87, 0.9, lat + iceN - depth * 0.3);
    if (ice > 0.0) {
      let fadeL = smoothstep(2.0, 5.0, 1.0 / (140.0 * pix));
      var leads = 0.85;
      if (fadeL > 0.0) { leads = mix(0.85, smoothstep(0.02, 0.1, abs(snoise(d * 140.0 + 5.0))), fadeL); }
      let iceAlb = vec3f(0.72, 0.78, 0.84) * mix(0.55, 1.0, leads);
      let Ni = normalize(M * d);
      let NLi = max(dot(Ni, sun), 0.0);
      let iceCol = Esh * NLi * iceAlb / PI + iceAlb * skyAmb;
      col = mix(col, iceCol, ice);
      albOut = mix(albOut, iceAlb, ice);
    }
  }
  return EisOut(col, albOut);
}
`;

// Meereis AUS: offenes Wasser bis zum Pol. Wird statt MEEREIS mitkompiliert.
export const MEEREIS_AUS = /* wgsl */`
struct EisOut { col: vec3f, alb: vec3f }
fn hook_meereis(col0: vec3f, alb0: vec3f, d: vec3f, depth: f32, pix: f32, M: mat3x3f, sun: vec3f, Esh: vec3f, skyAmb: vec3f, pal: i32) -> EisOut { return EisOut(col0, alb0); }
`;
