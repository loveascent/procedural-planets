// Zufall und Gradientenrauschen (pcg3d-Hash nach Jarzynski & Olano 2020, Rauschen mit analytischer Ableitung nach Quilez).
export const RAUSCHEN = /* wgsl */`
// ---------- Zufall und Rauschen ----------

fn pcg3d(v0: vec3u) -> vec3u {
  var v = v0 * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> vec3u(16u);
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}

fn hash3(i: vec3f) -> vec3f {
  let h = pcg3d(bitcast<vec3u>(vec3i(i)));
  return vec3f(h) * (2.0 / 4294967295.0) - 1.0;
}

fn rand4(a: u32, b: u32) -> vec4f {
  let h = pcg3d(vec3u(a, b, 0x9e3779b9u));
  let g = pcg3d(h.zxy ^ vec3u(b, a, 7u));
  return vec4f(vec3f(h), f32(g.x)) / 4294967295.0;
}

// Gradientenrauschen mit analytischer Ableitung: x = Wert, yzw = Gradient.
fn noised(x: vec3f) -> vec4f {
  let i = floor(x);
  let f = fract(x);
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let du = 30.0 * f * f * (f * (f - 2.0) + 1.0);

  let ga = hash3(i + vec3f(0.0, 0.0, 0.0));
  let gb = hash3(i + vec3f(1.0, 0.0, 0.0));
  let gc = hash3(i + vec3f(0.0, 1.0, 0.0));
  let gd = hash3(i + vec3f(1.0, 1.0, 0.0));
  let ge = hash3(i + vec3f(0.0, 0.0, 1.0));
  let gf = hash3(i + vec3f(1.0, 0.0, 1.0));
  let gg = hash3(i + vec3f(0.0, 1.0, 1.0));
  let gh = hash3(i + vec3f(1.0, 1.0, 1.0));

  let va = dot(ga, f - vec3f(0.0, 0.0, 0.0));
  let vb = dot(gb, f - vec3f(1.0, 0.0, 0.0));
  let vc = dot(gc, f - vec3f(0.0, 1.0, 0.0));
  let vd = dot(gd, f - vec3f(1.0, 1.0, 0.0));
  let ve = dot(ge, f - vec3f(0.0, 0.0, 1.0));
  let vf = dot(gf, f - vec3f(1.0, 0.0, 1.0));
  let vg = dot(gg, f - vec3f(0.0, 1.0, 1.0));
  let vh = dot(gh, f - vec3f(1.0, 1.0, 1.0));

  let k0 = va;
  let k1 = vb - va;
  let k2 = vc - va;
  let k3 = ve - va;
  let k4 = va - vb - vc + vd;
  let k5 = va - vc - ve + vg;
  let k6 = va - vb - ve + vf;
  let k7 = -va + vb + vc - vd + ve - vf - vg + vh;

  let value = k0 + u.x * k1 + u.y * k2 + u.z * k3 + u.x * u.y * k4 + u.y * u.z * k5
            + u.z * u.x * k6 + u.x * u.y * u.z * k7;

  let grad = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga)
           + u.x * u.y * (ga - gb - gc + gd) + u.y * u.z * (ga - gc - ge + gg)
           + u.z * u.x * (ga - gb - ge + gf) + u.x * u.y * u.z * (-ga + gb + gc - gd + ge - gf - gg + gh)
           + du * (vec3f(k1, k2, k3) + u.yzx * vec3f(k4, k5, k6) + u.zxy * vec3f(k6, k4, k5)
                   + u.yzx * u.zxy * k7);
  return vec4f(value, grad);
}
`;
