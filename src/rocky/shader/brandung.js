// Quelle: eigene Umsetzung (Schaumlinien laufen auf den Strand, Wellenphase aus Zeit und Tiefe); CREDITS.md nennt keine fremde Vorlage.
// Baustein Brandung. Einhängepunkt: hook_brandung. Eigenes Feld U.Br.
export const BRANDUNG = /* wgsl */`
fn hook_brandung(col0: vec3f, d: vec3f, tm: f32, Esh: vec3f, muS: f32, skyAmb: vec3f, depth: f32, inland: bool, staerke: f32) -> vec3f {
  var col = col0;
    let zb = depth / 0.006;
    if (staerke > 0.0 && zb < 1.0 && !inland) {
      let band = 1.0 - smoothstep(0.0, 1.0, zb);
      let wv = 0.5 + 0.5 * sin(zb * 18.85 - tm * 1.3 + snoise(d * 900.0) * 2.5);
      var foam = band * smoothstep(0.55, 0.95, wv) * 0.8 + (1.0 - smoothstep(0.0, 0.12, zb)) * 0.7;
      foam *= staerke * (0.6 + 0.4 * snoise(d * 2500.0 + tm * 0.4));
      col = mix(col, vec3f(0.8) * Esh * max(muS, 0.0) / PI + skyAmb * 0.8, clamp(foam, 0.0, 1.0));
    }
  return col;
}
`;

// Brandung AUS: kein Schaum am Strand, keine Schaum-Rauschfunktionen. Wird statt BRANDUNG mitkompiliert.
export const BRANDUNG_AUS = /* wgsl */`
fn hook_brandung(col0: vec3f, d: vec3f, tm: f32, Esh: vec3f, muS: f32, skyAmb: vec3f, depth: f32, inland: bool, staerke: f32) -> vec3f { return col0; }
`;
