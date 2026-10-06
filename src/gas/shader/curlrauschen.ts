// Divergenzfreies Rauschfeld (Curl-Noise nach Bridson et al. 2007) auf der Kugel.
export const CURLRAUSCHEN = /* wgsl */`
// Divergenzfreies Rauschfeld auf der Kugel: v = p × ∇ψ (ψ = FBM-Rauschen als Stromfunktion).
fn curlOnSphere(p: vec3f, freq: f32, t: f32, octaves: i32) -> vec3f {
  var g = vec3f(0.0);
  var amp = 1.0;
  var fr = freq;
  for (var o = 0; o < octaves; o++) {
    let off = vec3f(f32(o) * 17.3, t * (1.0 + 0.37 * f32(o)), f32(o) * -9.1);
    g += noised(p * fr + off).yzw * amp * fr / freq;
    amp *= 0.5;
    fr *= 2.03;
  }
  return cross(p, g);
}
`;
