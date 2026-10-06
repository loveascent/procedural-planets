// Quellen (CREDITS.md): Jimenez, Bloom (2014) mit Karis-Mittel in der ersten Stufe (CoD: Advanced Warfare).
// Baustein Überstrahlung (Bloom): Abwärts-/Aufwärtsstufen und Addition im Endbild. Einhängepunkt: hook_bloom.
export const BLOOM = /* wgsl */`
fn tp(uv: vec2f, o: vec2f) -> vec3f { return textureSampleLevel(tSrc, samp, uv + o * Pp.xy, 0.0).rgb; }
// Erste Stufe mit Karis-Mittel (Jimenez 2014, CoD: Advanced Warfare): jeder Abtastwert zählt mit 1/(1+Helligkeit).
// Einzelne superhelle Pixel (Glanzpunkte auf Wellen und Fels) flackern sonst als Lichtblitze durch die Überstrahlung.
fn karisTap(uv: vec2f, o: vec2f, k: f32, acc: ptr<function, vec4f>) {
  let s = tp(uv, o);
  let w = k / (1.0 + max(s.r, max(s.g, s.b)));
  *acc += vec4f(s * w, w);
}
@fragment fn fsDown(vin: VO) -> @location(0) vec4f {
  let uv = tuvOf(vin.uv);
  if (Pp.w > 0.5) {
    var a = vec4f(0.0);
    karisTap(uv, vec2f(0.0), 0.125, &a);
    karisTap(uv, vec2f(-2.0, 2.0), 0.03125, &a); karisTap(uv, vec2f(2.0, 2.0), 0.03125, &a);
    karisTap(uv, vec2f(-2.0, -2.0), 0.03125, &a); karisTap(uv, vec2f(2.0, -2.0), 0.03125, &a);
    karisTap(uv, vec2f(0.0, 2.0), 0.0625, &a); karisTap(uv, vec2f(-2.0, 0.0), 0.0625, &a);
    karisTap(uv, vec2f(2.0, 0.0), 0.0625, &a); karisTap(uv, vec2f(0.0, -2.0), 0.0625, &a);
    karisTap(uv, vec2f(-1.0, 1.0), 0.125, &a); karisTap(uv, vec2f(1.0, 1.0), 0.125, &a);
    karisTap(uv, vec2f(-1.0, -1.0), 0.125, &a); karisTap(uv, vec2f(1.0, -1.0), 0.125, &a);
    var c = a.rgb / max(a.w, 1e-6);
    let br = max(c.r, max(c.g, c.b));
    var soft = clamp(br - Pp.z + 0.5, 0.0, 1.0);
    soft = soft * soft * 0.5;
    c *= max(soft, br - Pp.z) / max(br, 1e-4);
    return vec4f(min(c, vec3f(60.0)), 1.0);
  }
  var c = tp(uv, vec2f(0.0)) * 0.125
    + (tp(uv, vec2f(-2.0, 2.0)) + tp(uv, vec2f(2.0, 2.0)) + tp(uv, vec2f(-2.0, -2.0)) + tp(uv, vec2f(2.0, -2.0))) * 0.03125
    + (tp(uv, vec2f(0.0, 2.0)) + tp(uv, vec2f(-2.0, 0.0)) + tp(uv, vec2f(2.0, 0.0)) + tp(uv, vec2f(0.0, -2.0))) * 0.0625
    + (tp(uv, vec2f(-1.0, 1.0)) + tp(uv, vec2f(1.0, 1.0)) + tp(uv, vec2f(-1.0, -1.0)) + tp(uv, vec2f(1.0, -1.0))) * 0.125;
  if (Pp.w > 0.5) {
    let br = max(c.r, max(c.g, c.b));
    var soft = clamp(br - Pp.z + 0.5, 0.0, 1.0);
    soft = soft * soft * 0.5;
    c *= max(soft, br - Pp.z) / max(br, 1e-4);
    c = min(c, vec3f(60.0));
  }
  return vec4f(c, 1.0);
}
@fragment fn fsUp(vin: VO) -> @location(0) vec4f {
  let uv = tuvOf(vin.uv);
  let c = tp(uv, vec2f(0.0)) * 4.0
    + (tp(uv, vec2f(-1.0, 0.0)) + tp(uv, vec2f(1.0, 0.0)) + tp(uv, vec2f(0.0, -1.0)) + tp(uv, vec2f(0.0, 1.0))) * 2.0
    + tp(uv, vec2f(-1.0, -1.0)) + tp(uv, vec2f(1.0, -1.0)) + tp(uv, vec2f(-1.0, 1.0)) + tp(uv, vec2f(1.0, 1.0));
  return vec4f(c / 16.0, 1.0);
}
fn hook_bloom(c: vec3f, uv: vec2f) -> vec3f {
  if (U.Fin.y > 0.0) { return c + textureSampleLevel(tSrc2, samp, uv, 0.0).rgb * U.Fin.y; }
  return c;
}
`;

// Bloom AUS: Bild bleibt; fsDown/fsUp gibt es nicht (die Pipelines werden nicht gebaut). Wird statt BLOOM mitkompiliert.
export const BLOOM_AUS = /* wgsl */`
fn hook_bloom(c: vec3f, uv: vec2f) -> vec3f { return c; }
`;
