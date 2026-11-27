// Baustein Nah-Oktaven (Bodennähe). Einhängepunkt: hook_nah. Eigene Felder U.Ne, U.Nf, U.NI, U.NF.
// Quellen (CREDITS.md):
//  - Gradient-Rauschen mit Ableitungen: I. Quilez, „Gradient Noise Derivatives“ (iquilezles.org/articles/gradientnoise), 3D-Fassung
//    noised(): quintische Glättung u, du, acht Eckgradienten, Wert + Ableitung.
//  - Hash: murmurHash33 aus simondevyoutube/Quick_Grass, public/shaders/noise.glsl (MIT, © 2023 simondevyoutube; dort nach
//    shadertoy.com/view/ttc3zr), Umwandlung in [0, 1) wie hash33 dort.
//  - Gleiche Oktaven-Summe wie feindetail.js (Grate 1 − |n|, Amplitude amp/f, Ausblenden unter ~3 Pixeln), nur feiner.
// Warum eigenes Rauschen: für Wellenlängen bis unter einen Meter (bei Erdgröße) reicht einfache Genauigkeit der Richtung d nicht
// (Schritt 6·10⁻⁸ ≈ 0,4 m). Deshalb wird je Oktave der ganzzahlige Gitterort des Kamerapunkts auf der CPU in double zerlegt
// (U.NI = ganzer Teil, U.NF = Rest), und der Shader rechnet nur den kleinen Versatz vom Kamerapunkt dazu. Das Gitter braucht
// dafür ganzzahlige Zellen und einen Hash auf ganzen Zahlen – das Simplex-Rauschen aus noise.js hat das nicht.
export const NAH = /* wgsl */`
fn nahMurmur33(s: vec3u) -> vec3u {
  let M = 0x5bd1e995u;
  var h = vec3u(1190494759u, 2147483647u, 3559788179u);
  var src = s * M; src ^= src >> vec3u(24u); src *= M;
  h *= M; h ^= vec3u(src.x); h *= M; h ^= vec3u(src.y); h *= M; h ^= vec3u(src.z);
  h ^= h >> vec3u(13u); h *= M; h ^= h >> vec3u(15u);
  return h;
}
fn nahGrad(c: vec3i, seed: u32) -> vec3f {
  let h = nahMurmur33(bitcast<vec3u>(c) ^ vec3u(seed));
  return (bitcast<vec3f>((h & vec3u(0x007fffffu)) | vec3u(0x3f800000u)) - 1.0) * 2.0 - 1.0;
}
// Quilez, noised(): Wert in .x, Ableitung in .yzw. Zelle i als ganze Zahl, f = Ort in der Zelle.
fn nahNoised(i: vec3i, f: vec3f, seed: u32) -> vec4f {
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  let ga = nahGrad(i + vec3i(0, 0, 0), seed);
  let gb = nahGrad(i + vec3i(1, 0, 0), seed);
  let gc = nahGrad(i + vec3i(0, 1, 0), seed);
  let gd = nahGrad(i + vec3i(1, 1, 0), seed);
  let ge = nahGrad(i + vec3i(0, 0, 1), seed);
  let gf = nahGrad(i + vec3i(1, 0, 1), seed);
  let gg = nahGrad(i + vec3i(0, 1, 1), seed);
  let gh = nahGrad(i + vec3i(1, 1, 1), seed);
  let va = dot(ga, f - vec3f(0.0, 0.0, 0.0));
  let vb = dot(gb, f - vec3f(1.0, 0.0, 0.0));
  let vc = dot(gc, f - vec3f(0.0, 1.0, 0.0));
  let vd = dot(gd, f - vec3f(1.0, 1.0, 0.0));
  let ve = dot(ge, f - vec3f(0.0, 0.0, 1.0));
  let vf = dot(gf, f - vec3f(1.0, 0.0, 1.0));
  let vg = dot(gg, f - vec3f(0.0, 1.0, 1.0));
  let vh = dot(gh, f - vec3f(1.0, 1.0, 1.0));
  let v = va + u.x * (vb - va) + u.y * (vc - va) + u.z * (ve - va) + u.x * u.y * (va - vb - vc + vd)
        + u.y * u.z * (va - vc - ve + vg) + u.z * u.x * (va - vb - ve + vf) + u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
  let dd = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga) + u.x * u.y * (ga - gb - gc + gd)
        + u.y * u.z * (ga - gc - ge + gg) + u.z * u.x * (ga - gb - ge + gf) + u.x * u.y * u.z * (-ga + gb + gc - gd + ge - gf - gg + gh)
        + du * (vec3f(vb - va, vc - va, ve - va) + u.yzx * vec3f(va - vb - vc + vd, va - vc - ve + vg, va - vb - ve + vf)
              + u.zxy * vec3f(va - vb - ve + vf, va - vb - vc + vd, va - vc - ve + vg) + u.yzx * u.zxy * (-va + vb + vc - vd + ve - vf - vg + vh));
  return vec4f(v, dd);
}
// Richtungsänderung gegenüber dem Kamerapunkt ê ohne Auslöschung: d − ê für d = (E·ê + q)/|E·ê + q|.
// Mit q∥ = ê·q, q⊥ = q − ê q∥, A = E + q∥, s² = |q⊥|²/A², r = √(1 + s²): d − ê = ê·(−s²/(r(1 + r))) + q⊥/(A r).
fn nahDd(q: vec3f) -> vec3f {
  let e = U.Ne.xyz;
  let qp = dot(e, q);
  let qt = q - e * qp;
  let A = U.Ne.w + qp;
  let s2 = dot(qt, qt) / (A * A);
  let r = sqrt(1.0 + s2);
  return e * (-s2 / (r * (1.0 + r))) + qt / (A * r);
}
// Oktaven k = 0 … U.Nf.y − 1 mit Frequenz U.Nf.x · 2^k (Fortsetzung von feindetail.js); q = Ort relativ zur Kamera (Planetenraum)
fn nahNoise(q: vec3f, pix: f32, amp: f32) -> vec4f {
  var acc = vec4f(0.0);
  let dd = nahDd(q);
  var f = U.Nf.x;
  let n = i32(U.Nf.y);
  for (var k = 0; k < n; k++) {
    let fade = smoothstep(2.0, 5.0, 1.0 / (f * pix));
    if (fade <= 0.0) { break; }
    let lp = U.NF[k].xyz + dd * f;
    let fl = floor(lp);
    let sn = nahNoised(vec3i(U.NI[k].xyz) + vec3i(fl), lp - fl, u32(k) * 0x9E3779B9u);
    acc += gratOktave(sn, f, amp) * fade;
    f *= 2.0;
  }
  return acc;
}
fn hook_nah(q: vec3f, pix: f32, h0: f32, g0: vec3f, gRug: vec3f, calm: f32, amp: f32) -> DetOut {
  if (amp > 0.0 && U.Nf.w > 0.5) { return mitRauheit(nahNoise(q, pix, amp * 0.9 * calm), gRug, h0, g0); }
  return DetOut(h0, g0);
}
`;

// Nah-Oktaven AUS: nichts dazu. Wird statt NAH mitkompiliert.
export const NAH_AUS = /* wgsl */`
fn hook_nah(q: vec3f, pix: f32, h0: f32, g0: vec3f, gRug: vec3f, calm: f32, amp: f32) -> DetOut { return DetOut(h0, g0); }
`;
