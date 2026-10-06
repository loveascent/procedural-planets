// Hilfen zum Abtasten der Würfelkarten (Texturen-Array je Seite); eigene Umsetzung, Seitenbasis wie common.js.

// Abtasten der Würfelkarten (nur in Shadern mit Sampler)
export const TEXH = /* wgsl */`
fn texFace(tx: texture_2d_array<f32>, F: Face, n: f32) -> vec4f { let s = (n - 1.0) / n; return textureSampleGrad(tx, samp, faceUv(F, n), F.f, F.gx * s, F.gy * s); }
fn texFaceLod(tx: texture_2d_array<f32>, F: Face, n: f32, lod: f32) -> vec4f { return textureSampleLevel(tx, samp, faceUv(F, n), F.f, lod); }
fn texDirLod(tx: texture_2d_array<f32>, d: vec3f, n: f32, lod: f32) -> vec4f {
  let F = toFace(d, vec3f(0.0), vec3f(0.0));
  return textureSampleLevel(tx, samp, faceUv(F, n), F.f, lod);
}
`;
