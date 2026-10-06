// Planeten-Shader: Kugelnetz instanziert, gebackene Oberfläche (Texturfeld), Beleuchtung durch die Sonne.
// Zusätze (Atmosphärensaum, Schatten/Finsternisse, lebendige Oberfläche) sind eigene Bausteine mit Aus-Variante.
import { UNIFORMEN } from './gemeinsam.ts';

export const PLANET_KOPF = UNIFORMEN + /* wgsl */`
@group(0) @binding(1) var tex: texture_2d_array<f32>;
@group(0) @binding(2) var samp: sampler;

struct VIn { @location(0) n: vec3f, @location(1) pr: vec4f, @location(2) sp: vec4f, @location(3) tint: vec4f };
struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) nl: vec3f, @location(1) nw: vec3f, @location(2) w: vec3f,
  @location(3) @interpolate(flat) pr: vec4f, @location(4) @interpolate(flat) sp: vec4f, @location(5) @interpolate(flat) tint: vec4f,
};

@vertex fn vs(i: VIn) -> VOut {
  let c = cos(i.sp.x); let s = sin(i.sp.x);
  let ny = vec3f(i.n.x * c + i.n.z * s, i.n.y, -i.n.x * s + i.n.z * c);   // Drehung um die Achse
  let ct = cos(i.sp.y); let st = sin(i.sp.y);
  let nw = vec3f(ny.x * ct - ny.y * st, ny.x * st + ny.y * ct, ny.z);      // Achsneigung
  let w = i.pr.xyz + nw * i.pr.w;
  var o: VOut;
  o.pos = u.vp * vec4f(w, 1.0);
  o.nl = i.n; o.nw = nw; o.w = w; o.pr = i.pr; o.sp = i.sp; o.tint = i.tint;
  return o;
}

fn zuUv(nl: vec3f) -> vec2f {
  return vec2f(atan2(nl.z, nl.x) / 6.2831853 + 0.5, 0.5 - asin(clamp(nl.y, -1.0, 1.0)) / 3.1415927);
}
`;

export const PLANET_ENDE = /* wgsl */`
@fragment fn fs(i: VOut) -> @location(0) vec4f {
  let nl = normalize(i.nl);
  let nw = normalize(i.nw);
  let fw = length(fwidth(nl));
  let lod = clamp(log2(max(fw * 81.0, 1.0)), 0.0, 8.0);
  var uv = zuUv(nl);
  let flags = i.sp.w;
  let emi = (u32(flags) & 1u) != 0u;
  let gas = (u32(flags) & 4u) != 0u;
  uv = hook_bewegung(uv, nl, gas, emi, flags);
  let layer = i32(i.sp.z);
  var alb = textureSampleLevel(tex, samp, uv, layer, lod).rgb * i.tint.rgb;
  let zumAuge = -normalize(i.w);
  if (emi) {
    return vec4f(pow(clamp(hook_sonnenglut(alb, nl), vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2)), 1.0);
  }
  let zs = u.sonne.xyz - i.w;
  let ds = length(zs);
  let L = zs / ds;
  var tag = smoothstep(-0.04, 0.22, dot(nw, L));
  let hell = clamp(pow(120.0 / ds, 0.6), 0.45, 1.6);
  tag = tag * hook_schatten(i.w, L, ds, i.pr.xyz, i.pr.w);
  var c = alb * (0.012 + tag * hell * 1.15);
  c = c + hook_saum(nw, zumAuge, L, i.tint.a, gas, tag);
  return vec4f(pow(clamp(c / (1.0 + 0.15 * c), vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2)), 1.0);
}
`;
