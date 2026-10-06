// Cubemap-Abbildung der Kugel: Richtung ↔ Würfelfläche/Texel, nahtloses Abtasten, Tangentenbasis, Ost-Richtung.
export const WUERFEL = /* wgsl */`
// ---------- Cubemap-Abbildung (WebGPU-Konvention: +X −X +Y −Y +Z −Z) ----------

fn faceDir(face: u32, st: vec2f) -> vec3f {
  let a = st.x * 2.0 - 1.0;
  let b = st.y * 2.0 - 1.0;
  switch face {
    case 0u: { return normalize(vec3f(1.0, -b, -a)); }
    case 1u: { return normalize(vec3f(-1.0, -b, a)); }
    case 2u: { return normalize(vec3f(a, 1.0, b)); }
    case 3u: { return normalize(vec3f(a, -1.0, -b)); }
    case 4u: { return normalize(vec3f(a, -b, 1.0)); }
    default: { return normalize(vec3f(-a, -b, -1.0)); }
  }
}

// Richtung -> (st in [0,1]², Fläche) ohne Begrenzung.
fn cubeUV(d: vec3f) -> vec3f {
  let ad = abs(d);
  var face = 0.0; var sc = 0.0; var tc = 0.0; var ma = 1.0;
  if (ad.x >= ad.y && ad.x >= ad.z) {
    ma = ad.x;
    if (d.x > 0.0) { face = 0.0; sc = -d.z; } else { face = 1.0; sc = d.z; }
    tc = -d.y;
  } else if (ad.y >= ad.z) {
    ma = ad.y;
    if (d.y > 0.0) { face = 2.0; tc = d.z; } else { face = 3.0; tc = -d.z; }
    sc = d.x;
  } else {
    ma = ad.z;
    if (d.z > 0.0) { face = 4.0; sc = d.x; } else { face = 5.0; sc = -d.x; }
    tc = -d.y;
  }
  return vec3f(vec2f(sc, tc) / ma * 0.5 + 0.5, face);
}

// Nahtloses bilineares Abtasten der Würfelfelder.
// Gemessen: das Hardware-Abtasten über Würfelkanten weicht bis zu 500-mal stärker ab als im
// Flächeninneren. Weil die Farbe jeden Schritt neu abgetastet wird, wachsen daraus Narben.
// Darum: im Inneren tastet die Hardware ab (dort exakt); nahe der Kante werden die vier
// Nachbar-Texel einzeln geholt, Texel jenseits der Kante über ihre Richtung auf der Nachbarfläche.
fn loadDir(t: texture_2d_array<f32>, s: sampler, q: vec3f) -> vec4f {
  let u = cubeUV(q);
  return textureSampleLevel(t, s, u.xy, i32(u.z), 0.0);
}

fn sampleCube(t: texture_2d_array<f32>, s: sampler, p: vec3f) -> vec4f {
  let n = f32(textureDimensions(t).x);
  let u = cubeUV(p);
  let x = u.xy * n - 0.5;
  if (all(x >= vec2f(0.0)) && all(x <= vec2f(n - 1.0))) {
    return textureSampleLevel(t, s, u.xy, i32(u.z), 0.0);
  }
  let i0 = floor(x);
  let f = x - i0;
  let face = u32(u.z);
  var c: array<vec4f, 4>;
  for (var k = 0u; k < 4u; k++) {
    let ij = i0 + vec2f(f32(k & 1u), f32(k >> 1u));
    if (all(ij >= vec2f(0.0)) && all(ij <= vec2f(n - 1.0))) {
      c[k] = textureLoad(t, vec2i(ij), i32(face), 0);
    } else {
      c[k] = loadDir(t, s, faceDir(face, (ij + 0.5) / n));
    }
  }
  return mix(mix(c[0], c[1], f.x), mix(c[2], c[3], f.x), f.y);
}

// Richtung -> (Fläche, Texel) für Schreibzugriffe aus Partikeln.
fn dirToTexel(d: vec3f, n: u32) -> vec3u {
  let ad = abs(d);
  var face = 0u; var sc = 0.0; var tc = 0.0; var ma = 1.0;
  if (ad.x >= ad.y && ad.x >= ad.z) {
    ma = ad.x;
    if (d.x > 0.0) { face = 0u; sc = -d.z; } else { face = 1u; sc = d.z; }
    tc = -d.y;
  } else if (ad.y >= ad.z) {
    ma = ad.y;
    if (d.y > 0.0) { face = 2u; tc = d.z; } else { face = 3u; tc = -d.z; }
    sc = d.x;
  } else {
    ma = ad.z;
    if (d.z > 0.0) { face = 4u; sc = d.x; } else { face = 5u; sc = -d.x; }
    tc = -d.y;
  }
  let st = clamp(vec2f(sc, tc) / ma * 0.5 + 0.5, vec2f(0.0), vec2f(0.99999));
  let px = vec2u(st * f32(n));
  return vec3u(px, face);
}

// Orthonormale Tangentenbasis. Die Wahl darf von Punkt zu Punkt springen,
// weil Divergenz, Laplace und Gradient unabhängig von der Basisdrehung sind.
fn tangentBasis(p: vec3f) -> mat2x3f {
  let helper = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(p.y) < 0.9);
  let e1 = normalize(cross(helper, p));
  let e2 = cross(p, e1);
  return mat2x3f(e1, e2);
}

fn east(p: vec3f) -> vec3f {
  let e = cross(vec3f(0.0, 1.0, 0.0), p);
  let l = length(e);
  return select(vec3f(1.0, 0.0, 0.0), e / l, l > 1e-5);
}

fn latitude(p: vec3f) -> f32 { return asin(clamp(p.y, -1.0, 1.0)); }

fn stepOn(p: vec3f, v: vec3f) -> vec3f { return normalize(p + v); }

fn tangent(p: vec3f, v: vec3f) -> vec3f { return v - p * dot(p, v); }
`;
