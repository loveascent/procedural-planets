// Quellen (CREDITS.md): Narkowicz, ACES-Filmkurve (2016); Jimenez, Bloom (2014) mit Karis-Mittel in der ersten Stufe.

// ---------------------------------------------------------------- Nachbearbeitung: Luftstreuung bzw. Leuchtsaum, Überstrahlung, Filmkurve
export const POST = /* wgsl */`
@group(1) @binding(0) var<uniform> Pp: vec4f;          // Texelgröße, Schwelle, erste Stufe
@group(1) @binding(1) var tSrc: texture_2d<f32>;
@group(1) @binding(2) var tSrc2: texture_2d<f32>;
fn tuvOf(uv: vec2f) -> vec2f { return vec2f(uv.x, 1.0 - uv.y); }
fn ign(p: vec2f) -> f32 { return fract(52.9829189 * fract(dot(p, vec2f(0.06711056, 0.00583715)))); }
@fragment fn fsComp(vin: VO) -> @location(0) vec4f {
  var col = textureSampleLevel(tSrc, samp, tuvOf(vin.uv), 0.0).rgb;
  let w = U.ivp * vec4f(vin.uv * 2.0 - 1.0, 1.0, 1.0);
  let cam = U.cam.xyz;
  let sun = U.sun.xyz;
  let dir = normalize(w.xyz / w.w - cam);
  let b = dot(cam, dir);
  let c2 = dot(cam, cam);
  col = hook_saum(col, cam, dir, b, c2, sun);
  if (U.Md.x < 0.5) { return hook_leuchtsaum_original(col, cam, dir, b, c2, sun); }
  return hook_luft_streuung(col, cam, dir, b, c2, sun, vin.pos.xy);
}
fn aces(x: vec3f) -> vec3f { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0)); }
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
@fragment fn fsFinal(vin: VO) -> @location(0) vec4f {
  let uv = tuvOf(vin.uv);
  var c = textureSampleLevel(tSrc, samp, uv, 0.0).rgb;
  c = hook_bloom(c, uv);
  c = hook_blende(c, vin.uv);
  c *= U.Fin.x;
  if (U.Fin.z > 0.5) { c = pow(aces(c), vec3f(1.0 / 2.2)); }
  else { c = clamp(c, vec3f(0.0), vec3f(1.0)); }
  c += (hash12(vin.pos.xy) - 0.5) / 255.0;
  return vec4f(c, 1.0);
}
`;
