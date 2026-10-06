// Stable Fluids: Wirbelstärke ζ aus dem Wind (für Wirbelverstärkung und die Ansicht „Wirbelstärke“).
export const WIRBELSTAERKE = /* wgsl */`
// Wirbelstärke ζ = ∂v/∂x − ∂u/∂y (Normalkomponente der Rotation) -> x
@compute @workgroup_size(8, 8, 1)
fn curl(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let c = cell(id);
  let dA = A(c.pE).xyz - A(c.pW).xyz;
  let dB = A(c.pN).xyz - A(c.pS).xyz;
  let g1 = grad2(c, dot(dA, c.e1), dot(dB, c.e1));   // ∇u₁
  let g2 = grad2(c, dot(dA, c.e2), dot(dB, c.e2));   // ∇u₂
  put(id, vec4f(g2.x - g1.y, 0.0, 0.0, 0.0));
}
`;
