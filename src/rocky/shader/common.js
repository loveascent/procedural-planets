// Grundlagen: Würfelkugel-Abbildung (gleiche Seitenbasis wie logik/wuerfel.js), Hilfsfunktionen. Verfahren nach colordodge ProceduralPlanet (WTFPL), siehe CREDITS.md.
export const COMMON = /* wgsl */`
const PI = 3.14159265359;
const QPI = 0.785398163397;
// Würfelseiten: Richtung = em + st.x·ex + st.y·ey, st = tan((2uv − 1)·π/4) (winkeltreu)
struct Basis { ex: vec3f, ey: vec3f, em: vec3f }
fn faceBasis(f: i32) -> Basis {
  switch f {
    case 0: { return Basis(vec3f(0.0, 0.0, -1.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0)); }
    case 1: { return Basis(vec3f(0.0, 0.0, 1.0), vec3f(0.0, 1.0, 0.0), vec3f(-1.0, 0.0, 0.0)); }
    case 2: { return Basis(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, -1.0), vec3f(0.0, 1.0, 0.0)); }
    case 3: { return Basis(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), vec3f(0.0, -1.0, 0.0)); }
    case 4: { return Basis(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, 1.0)); }
    default: { return Basis(vec3f(-1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(0.0, 0.0, -1.0)); }
  }
}
fn majorFace(d: vec3f) -> i32 {
  let a = abs(d);
  if (a.x >= a.y && a.x >= a.z) { return select(1, 0, d.x > 0.0); }
  if (a.y >= a.z) { return select(3, 2, d.y > 0.0); }
  return select(5, 4, d.z > 0.0);
}
fn faceDir(f: i32, uv: vec2f) -> vec3f {
  let B = faceBasis(f);
  let st = tan((uv * 2.0 - 1.0) * QPI);
  return normalize(B.em + st.x * B.ex + st.y * B.ey);
}
// Richtung -> Seite, uv, uv-Ableitungen im Bild (für saubere Mipmaps ohne Nahtlinien) und Jacobi-Zeilen
struct Face { f: i32, uv: vec2f, gx: vec2f, gy: vec2f, jx: vec3f, jy: vec3f }
fn toFace(d: vec3f, ddx: vec3f, ddy: vec3f) -> Face {
  var r: Face;
  r.f = majorFace(d);
  let B = faceBasis(r.f);
  let m = dot(d, B.em);
  let st = vec2f(dot(d, B.ex), dot(d, B.ey)) / m;
  let k = 0.5 / (QPI * (1.0 + st * st));
  r.uv = atan(st) / QPI * 0.5 + 0.5;
  r.jx = (B.ex - st.x * B.em) * (k.x / m);
  r.jy = (B.ey - st.y * B.em) * (k.y / m);
  r.gx = vec2f(dot(r.jx, ddx), dot(r.jy, ddx));
  r.gy = vec2f(dot(r.jx, ddy), dot(r.jy, ddy));
  return r;
}
// Texel-Mitten liegen exakt auf den Würfelkanten (keine Nähte)
fn faceUv(F: Face, n: f32) -> vec2f { return F.uv * ((n - 1.0) / n) + 0.5 / n; }
fn hash33(q: vec3f) -> vec3f { var p3 = fract(q * vec3f(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
fn hash13(q: vec3f) -> f32 { var p3 = fract(q * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
fn rotY(p: vec3f, a: f32) -> vec3f { let c = cos(a); let s = sin(a); return vec3f(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
fn sq(x: f32) -> f32 { return x * x; }
`;
