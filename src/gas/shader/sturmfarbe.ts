// Baustein Sturmfarbe: Stürme färben den Farbstoff in ihrer Farbe. Einhängepunkt: hook_sturmfarbe. Aus (Sturmfarbe = 0): keine Tönung.
export const STURMFARBE = /* wgsl */`
// stormMask (stuerme.ts) nur für die Farbe, ohne den Gauß-Rand: ab d = 4·r·scale ist exp(−16) ≈ 1,1e-7, auch über 900 Schritte
// aufsummiert unter der Auflösung von rgba16float (10 Bit Mantisse, IEEE 754 binary16: relativ 2^-11 ≈ 4,9e-4); dort weder acos
// noch exp. dot(c, p) = cos d. Gemessen 26.11. (900 Schritte, gegen vorher): PSNR 72 dB, größte Abweichung 1/255.
// Nur hier, nicht im Windantrieb: dort würde jede Abweichung von der Strömung chaotisch verstärkt (Messung 26.11.: PSNR 31 dB).
fn stormMaskFarbe(p: vec3f, scale: f32) -> vec4f {
  var tint = vec3f(0.0);
  var w = 0.0;
  let n = u32(S.stormCount);
  for (var i = 0u; i < min(n, MAX_STORMS); i++) {
    let c = S.storms[i].xyz;
    let r = S.storms[i].w;
    let cosD = dot(c, p);
    if (cosD < cos(min(4.0 * r * scale, PI))) { continue; }
    let d = acos(clamp(cosD, -1.0, 1.0));
    let m = exp(-pow(d / (r * scale), 2.0)) * stormW(i);
    tint += S.stormInfo[i].yzw * m;
    w += m;
  }
  return vec4f(tint / max(w, 1e-4), min(w, 1.0));
}
fn hook_sturmfarbe(c0: vec3f, p: vec3f, dt: f32) -> vec3f {
  let sm = stormMaskFarbe(p, 0.55);
  return mix(c0, sm.rgb, (1.0 - exp(-S.stormTint * dt)) * sm.w);
}
`;

export const STURMFARBE_AUS = /* wgsl */`
fn hook_sturmfarbe(c0: vec3f, p: vec3f, dt: f32) -> vec3f { return c0; }
`;
