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
    let sn = snoiseG(d * f + f32(i) * 17.31);
    let s = 1.0 - abs(sn.x);                     // Grate statt Beulen
    let gs = select(-1.0, 1.0, sn.x < 0.0) * sn.yzw;
    let a = amp / f;
    acc += vec4f((s - 0.6) * a, gs * (f * a)) * fade;
    f *= 2.0;
  }
  return acc;
}
struct DetOut { h: f32, g: vec3f }
fn hook_feindetail(d: vec3f, pix: f32, texAng: f32, h0: f32, g0: vec3f, calm: f32, amp: f32) -> DetOut {
  var h = h0;
  var g = g0;
  if (amp > 0.0) {
      let det = detailNoise(d, pix, 0.16 / texAng, amp * 0.9 * calm);
      let rug = clamp(length(g) * 0.12, 0.25, 1.6);
      h += det.x * rug;
      g += det.yzw * rug;
  }
  return DetOut(h, g);
}
`;

// Feindetail AUS: keine zusätzlichen Oktaven, keine detailNoise-Funktion. Wird statt FEINDETAIL mitkompiliert.
export const FEINDETAIL_AUS = /* wgsl */`
struct DetOut { h: f32, g: vec3f }
fn hook_feindetail(d: vec3f, pix: f32, texAng: f32, h0: f32, g0: vec3f, calm: f32, amp: f32) -> DetOut { return DetOut(h0, g0); }
`;
