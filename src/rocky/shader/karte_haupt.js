// Einstieg der Karten-Erzeugung (Compute): pro Texel Höhe, Feuchte und Gefälle; Gebirge, Vulkane, Erosion und Flusstäler hängen an hook_*.
export const KARTE_HAUPT = /* wgsl */`
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = vec2f(gid.xy) + J.h.xy;
  if (px.x >= J.g.x || px.y >= J.g.y) { return; }
  let N = J.h.w;
  let face = i32(J.h.z);
  let uv = px / (N - 1.0);
  let B = faceBasis(face);
  let st = tan((uv * 2.0 - 1.0) * QPI);
  let P = B.em + st.x * B.ex + st.y * B.ey;
  let il = inverseSqrt(dot(P, P));
  let d = P * il;
  let sea = J.f.z;
  let mode = J.f.x;
  let HC = composite(d, J.a, J.b.xy, 16);
  let MC = composite(d, J.c, J.b.zw, 16);
  var h = HC.x;
  var gh = HC.yzw;
  let m = MC.x;
  gh -= d * dot(gh, d);
  var gDir = gh;
  let gbg = hook_gebirge(d, h, gh, gDir, sea, mode);
  h = gbg.h;
  gh = gbg.gh;
  gDir = gbg.gDir;
  let belt = gbg.belt;
  // Vulkane vor der Erosion: die Rinnen laufen dann strahlenförmig die Flanken hinab
  if (mode > 0.5 && J.v.x > 0.0) {
    let Vc = hook_vulkan_hoehe(d, J.v.x, J.v.y, J.v.z);
    h += Vc.x;
    let gv = Vc.yzw - d * dot(Vc.yzw, d);
    gh += gv;
    gDir += gv;
  }
  let er = hook_erosion_karte(d, h, gh, gDir, belt, sea, J.d, J.f.y, mode);
  h = er.h;
  gh = er.g;
  let fl = hook_fluss_tal(d, h, gh, J.r.x, mode);
  h = fl.h;
  gh = fl.g;
  // Gradient in Seitenkoordinaten (∂h/∂u, ∂h/∂v) speichern
  let dPu = (B.ex - d * dot(d, B.ex)) * il * (2.0 * QPI * (1.0 + st.x * st.x));
  let dPv = (B.ey - d * dot(d, B.ey)) * il * (2.0 * QPI * (1.0 + st.y * st.y));
  textureStore(dst, vec2u(px), face, vec4f(h, m, dot(gh, dPu), dot(gh, dPv)));
}
`;
