// Mipmap-Erzeugung per Compute (2×2-Mittel je Ebene); eigene Umsetzung, keine fremde Quelle.

// ---------------------------------------------------------------- Mipmaps (WebGPU hat kein generateMipmap): 2×2-Mittel
export const MIP = (fmt) => /* wgsl */`
@group(0) @binding(0) var src: texture_2d_array<f32>;
@group(0) @binding(1) var dst: texture_storage_2d_array<${fmt}, write>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) g: vec3u) {
  let n = textureDimensions(dst);
  if (g.x >= n.x || g.y >= n.y) { return; }
  let p = vec2i(g.xy) * 2;
  let l = i32(g.z);
  let c = textureLoad(src, p, l, 0) + textureLoad(src, p + vec2i(1, 0), l, 0) + textureLoad(src, p + vec2i(0, 1), l, 0) + textureLoad(src, p + vec2i(1, 1), l, 0);
  textureStore(dst, vec2i(g.xy), l, c * 0.25);
}
`;
