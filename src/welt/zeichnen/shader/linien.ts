// Bahnspuren als Bänder: jedes Segment ist ein Rechteck von konstanter Breite in Pixeln (kein 1-Pixel-Linienraster),
// weiche Kanten quer zur Linie, Helligkeit läuft von Anfang zu Ende des Segments.
// Instanz: Anfang xyz + Helligkeit | Ende xyz + Helligkeit | Farbe rgb + Breite (Pixel).
import { UNIFORMEN } from './gemeinsam.ts';

export const LINIEN = UNIFORMEN + /* wgsl */`
struct VIn { @builtin(vertex_index) vi: u32, @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f };
struct VOut { @builtin(position) pos: vec4f, @location(0) kante: f32, @location(1) farbe: vec4f };

@vertex fn vs(i: VIn) -> VOut {
  var ecken = array<vec2f, 6>(vec2f(0, -1), vec2f(1, -1), vec2f(1, 1), vec2f(0, -1), vec2f(1, 1), vec2f(0, 1));
  let e = ecken[i.vi];
  let c0 = u.vp * vec4f(i.a.xyz, 1.0);
  let c1 = u.vp * vec4f(i.b.xyz, 1.0);
  var o: VOut;
  // Liegt ein Ende hinter der Kamera, wird das Segment weggelassen
  if (c0.w <= 0.001 || c1.w <= 0.001) { o.pos = vec4f(2.0, 2.0, 2.0, 1.0); o.kante = 0.0; o.farbe = vec4f(0.0); return o; }
  let n0 = c0.xy / c0.w; let n1 = c1.xy / c1.w;
  let px = vec2f(0.5 / u.pix.z, 0.5 / u.pix.w);             // Pixel pro NDC-Einheit (pix.zw = NDC pro Pixel)
  var d = (n1 - n0) * px;
  let l = length(d);
  d = select(vec2f(1.0, 0.0), d / l, l > 1e-4);
  let nor = vec2f(-d.y, d.x);
  let t = e.x;
  let cl = mix(c0, c1, t);
  let ndc = cl.xy / cl.w + nor * e.y * (i.c.w * 0.5 + 0.75) * vec2f(u.pix.z, u.pix.w);
  o.pos = vec4f(ndc * cl.w, cl.z, cl.w);
  o.kante = e.y;
  o.farbe = vec4f(i.c.rgb, mix(i.a.w, i.b.w, t));
  return o;
}
@fragment fn fs(i: VOut) -> @location(0) vec4f {
  let aa = 1.0 - smoothstep(0.35, 1.0, abs(i.kante));
  return vec4f(i.farbe.rgb * i.farbe.a * aa, 1.0);
}
`;
