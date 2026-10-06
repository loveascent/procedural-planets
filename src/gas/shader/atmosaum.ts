// Baustein Atmosphärensaum außerhalb der Planetenscheibe (Schimmer der Lufthülle am Rand). Einhängepunkt: hook_saum_aussen.
export const ATMOSAUM = /* wgsl */`
fn hook_saum_aussen(col0: vec3f, o: vec3f, d: vec3f, sun: vec3f, c: f32) -> vec3f {
  var col = col0;
    let tc = max(-dot(o, d), 0.0);
    let cp = o + d * tc;
    let ce = cp * vec3f(1.0, 1.0 / c, 1.0);
    let h = length(ce) - 1.0;
    let lit = smoothstep(-0.3, 0.4, dot(normalize(cp), sun));
    col += U.atmo.rgb * exp(-max(h, 0.0) / 0.025) * U.atmo.w * lit * U.sun.w;
  return col;
}
`;

export const ATMOSAUM_AUS = /* wgsl */`
fn hook_saum_aussen(col0: vec3f, o: vec3f, d: vec3f, sun: vec3f, c: f32) -> vec3f { return col0; }
`;
