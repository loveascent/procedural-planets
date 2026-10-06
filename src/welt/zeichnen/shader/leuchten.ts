// Leuchtflächen (Billboards, additiv): Sonnenschein, Einschlagsblitz, Druckwelle, ferne Punkte, Trümmer.
// Instanz: pos.xyz + Größe | Farbe rgba | Art, Alter(0..1), –, –.  Art 0 Schein, 1 Druckwelle, 2 Punkt (scharf), 3 Trümmerpunkt.
import { UNIFORMEN } from './gemeinsam.ts';

export const LEUCHTEN = UNIFORMEN + /* wgsl */`
struct VIn { @builtin(vertex_index) vi: u32, @location(0) pg: vec4f, @location(1) farbe: vec4f, @location(2) art: vec4f };
struct VOut { @builtin(position) pos: vec4f, @location(0) q: vec2f, @location(1) farbe: vec4f, @location(2) art: vec4f };

@vertex fn vs(i: VIn) -> VOut {
  var ecken = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(1, 1), vec2f(-1, -1), vec2f(1, 1), vec2f(-1, 1));
  let q = ecken[i.vi];
  var g = i.pg.w;
  // Mindestgröße in Pixeln: nie kleiner als ~1.6 Pixel, damit ferne Körper nicht verschwinden
  let d = max(dot(i.pg.xyz, u.vor.xyz), 0.01);
  let pixelGroesse = d / u.pix.x;
  if (i.art.x >= 2.0) { g = max(g, pixelGroesse * 1.6); }
  g = min(g, d * 0.6);   // nie größer als ein Teil des Bildes, auch wenn die Kamera im Schein steht
  let w = i.pg.xyz + (u.rechts.xyz * q.x + u.oben.xyz * q.y) * g;
  var o: VOut;
  o.pos = u.vp * vec4f(w, 1.0);
  o.q = q; o.farbe = i.farbe; o.art = i.art;
  return o;
}

@fragment fn fs(i: VOut) -> @location(0) vec4f {
  let r = length(i.q);
  if (r > 1.0) { discard; }
  var a: f32;
  let art = i.art.x;
  if (art < 0.5) { a = exp(-r * r * 5.0); }
  else if (art < 1.5) { let t = abs(r - 0.82); a = exp(-t * t * 260.0) * (1.0 - i.art.y); }
  else { a = smoothstep(1.0, 0.35, r); }
  return vec4f(i.farbe.rgb * a * i.farbe.a, 1.0);
}
`;
