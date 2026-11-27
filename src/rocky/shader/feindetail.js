// Quelle (CREDITS.md): eigene Umsetzung (zusätzliche fBm-Oktaven oberhalb der Karten-Nyquistgrenze, weich ausgeblendet unter ~3 Pixeln); Rauschen siehe noise.js.
// Baustein Feindetail. Einhängepunkt: hook_feindetail. Eigenes Feld U.Fd.
export const FEINDETAIL = /* wgsl */`
// Weitere fBm-Oktaven oberhalb der Karten-Nyquistgrenze, weich ausgeblendet unter ~3 Pixeln
fn detailNoise(d: vec3f, pix: f32, f0: f32, amp: f32) -> vec4f {
  var acc = vec4f(0.0);
  var f = f0;
  for (var i = 0; i < 5; i++) {
    let fade = smoothstep(2.0, 5.0, 1.0 / (f * pix));
    if (fade <= 0.0) { break; }
    acc += gratOktave(snoiseG(d * f + f32(i) * 17.31), f, amp) * fade;
    f *= 2.0;
  }
  return acc;
}
struct DetOut { h: f32, g: vec3f }
fn hook_feindetail(d: vec3f, pix: f32, texAng: f32, h0: f32, g0: vec3f, calm: f32, amp: f32) -> DetOut {
  if (amp > 0.0) { return mitRauheit(detailNoise(d, pix, 0.16 / texAng, amp * 0.9 * calm), g0, h0, g0); }
  return DetOut(h0, g0);
}
`;

// Feindetail AUS: keine zusätzlichen Oktaven, keine detailNoise-Funktion. Wird statt FEINDETAIL mitkompiliert.
export const FEINDETAIL_AUS = /* wgsl */`
struct DetOut { h: f32, g: vec3f }
fn hook_feindetail(d: vec3f, pix: f32, texAng: f32, h0: f32, g0: vec3f, calm: f32, amp: f32) -> DetOut { return DetOut(h0, g0); }
`;
