// Sternenhimmel (Vollbilddreieck): Sterne aus Zellrauschen in drei Dichten, Milchstraße als Band mit Staubmaske.
import { UNIFORMEN } from './gemeinsam.ts';

export const HIMMEL = UNIFORMEN + /* wgsl */`
struct VOut { @builtin(position) pos: vec4f, @location(0) q: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var o: VOut; o.pos = vec4f(p[vi], 0.9999, 1.0); o.q = p[vi]; return o;
}
fn h3(p: vec3f) -> vec3f {
  var q = vec3f(dot(p, vec3f(127.1, 311.7, 74.7)), dot(p, vec3f(269.5, 183.3, 246.1)), dot(p, vec3f(113.5, 271.9, 124.6)));
  return fract(sin(q) * 43758.5453);
}
fn wert(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let s = f * f * (3.0 - 2.0 * f);
  let a = mix(mix(h3(i).x, h3(i + vec3f(1, 0, 0)).x, s.x), mix(h3(i + vec3f(0, 1, 0)).x, h3(i + vec3f(1, 1, 0)).x, s.x), s.y);
  let b = mix(mix(h3(i + vec3f(0, 0, 1)).x, h3(i + vec3f(1, 0, 1)).x, s.x), mix(h3(i + vec3f(0, 1, 1)).x, h3(i + vec3f(1, 1, 1)).x, s.x), s.y);
  return mix(a, b, s.z);
}
fn sterne(d: vec3f, dichte: f32, schwelle: f32) -> f32 {
  let p = d * dichte; let c = floor(p); let h = h3(c);
  let m = fract(p) - h * 0.8 - 0.1;
  let hell = step(schwelle, h.z) * (h.z - schwelle) / (1.0 - schwelle);
  return smoothstep(0.045 * (1.0 + 1.5 * hell), 0.0, length(m)) * (0.35 + hell * 2.2);
}
@fragment fn fs(i: VOut) -> @location(0) vec4f {
  let d = normalize(u.vor.xyz + u.rechts.xyz * (i.q.x * u.rechts.w * u.oben.w) + u.oben.xyz * (i.q.y * u.rechts.w));
  var c = vec3f(0.0);
  c += vec3f(0.85, 0.9, 1.0) * sterne(d, 38.0, 0.82) * 0.9;
  c += vec3f(1.0, 0.9, 0.8) * sterne(d, 90.0, 0.9) * 0.8;
  c += vec3f(0.8, 0.85, 1.0) * sterne(d, 210.0, 0.93) * 0.6;
  let pol = normalize(vec3f(0.3, 0.9, 0.2));
  let band = exp(-pow(dot(d, pol) * 3.2, 2.0));
  let staub = 0.35 + 0.65 * wert(d * 5.0 + 3.0) * wert(d * 11.0);
  let milch = band * staub * (0.5 + 0.5 * wert(d * 3.0));
  c += mix(vec3f(0.12, 0.1, 0.16), vec3f(0.28, 0.24, 0.2), band) * milch * 0.55;
  // Dither (dreieckverteilt, ±1 Stufe): der 8-Bit-Ausgang zeigt sonst in der dunklen Milchstraße sichtbare Stufen
  let n1 = fract(52.9829189 * fract(dot(i.pos.xy, vec2f(0.06711056, 0.00583715))));
  let n2 = fract(52.9829189 * fract(dot(i.pos.xy + vec2f(17.0, 31.0), vec2f(0.06711056, 0.00583715))));
  return vec4f(max(pow(c, vec3f(1.0 / 2.2)) + (n1 + n2 - 1.0) / 255.0, vec3f(0.0)), 1.0);
}
`;
