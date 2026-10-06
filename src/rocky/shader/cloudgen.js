// Quellen (CREDITS.md): Quilez, Domain Warping und analytische Rauschableitungen (Wolken und Nebel); Rauschen siehe noise.js.
import { JDECL } from './jdecl.js';


// ---------------------------------------------------------------- Wolkenkarten (Compute), a.x = Seed
export const CLOUDGEN = JDECL + /* wgsl */`
@group(0) @binding(1) var dst: texture_storage_2d_array<rgba8unorm, write>;
// Original-Stil: sin(5·n) über viele Oktaven gibt die zelligen Schlieren
fn hisCloud(p: vec3f, seed: f32) -> f32 {
  var n = 0.0;
  var gain = 1.0;
  for (var i = 0; i < 10; i++) {
    let s = sin(snoise(p * gain * 1.3 + seed + f32(i) * 10.0) * 5.0) * 0.5 + 0.5;
    n += s * 0.5 / gain;
    gain *= 2.0;
  }
  return clamp((n - 0.5) * 2.0 + 0.5, 0.0, 1.0);
}
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = vec2f(gid.xy) + J.h.xy;
  if (px.x >= J.g.x || px.y >= J.g.y) { return; }
  let seed = J.a.x;
  let face = i32(J.h.z);
  let d = faceDir(face, px / (J.h.w - 1.0));
  let p = d * vec3f(2.3, 3.8, 2.3) + seed;      // nord-süd gestaucht: Wolkenbänder ziehen sich ost-westlich
  let w = vec3f(fbmS(p + 1.3, 4), fbmS(p + 7.1, 4), fbmS(p + 3.7, 4));
  // Fronten: lange, gebogene Wolkenbänder entlang der Kammlinien eines tieffrequenten Rauschens
  let fa = pow(max(1.0 - abs(snoise(d * vec3f(1.1, 1.8, 1.1) + w * 0.7 + seed + 13.0)), 0.0), 5.0);
  let fb = pow(max(1.0 - abs(snoise(d * vec3f(1.1, 1.8, 1.1) + w.yzx * 0.7 + seed + 41.0)), 0.0), 5.0);
  // Großwetterlage: weite klare Hochdruckgebiete neben großen Wolkenfeldern
  let wa = fbmS(d * vec3f(1.3, 2.0, 1.3) + w * 0.5 + seed + 7.0, 4);
  let wb = fbmS(d * vec3f(1.3, 2.0, 1.3) + w.zxy * 0.5 + seed + 29.0, 4);
  let A = fbmS(p + w * 1.2, 8) * 0.75 + wa * 0.7 + fa * 0.2 - 0.07;
  let B = fbmS(p * 1.07 + w.zxy * 1.2 + 21.0, 8) * 0.75 + wb * 0.7 + fb * 0.2 - 0.07;
  let H = hisCloud(d, seed);
  let Dt = fbmS(d * vec3f(17.0, 26.0, 17.0) + w * 2.0 + seed * 1.3, 6) * 0.9 + 0.5;
  textureStore(dst, vec2u(px), face, clamp(vec4f(A * 0.8 + 0.5, B * 0.8 + 0.5, H, Dt), vec4f(0.0), vec4f(1.0)));
}
`;
