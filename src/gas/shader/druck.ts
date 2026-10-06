// Stable Fluids: Druckprojektion (Divergenz, Jacobi, Gradient abziehen) nach Stam 1999 / Harris 2004.
export const DRUCK = /* wgsl */`
// Divergenz ∇·u -> x
@compute @workgroup_size(8, 8, 1)
fn divergence(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let c = cell(id);
  let dA = A(c.pE).xyz - A(c.pW).xyz;
  let dB = A(c.pN).xyz - A(c.pS).xyz;
  let g1 = grad2(c, dot(dA, c.e1), dot(dB, c.e1));
  let g2 = grad2(c, dot(dA, c.e2), dot(dB, c.e2));
  put(id, vec4f(g1.x + g2.y, 0.0, 0.0, 0.0));
}

// Jacobi-Schritt für ∇²p = ∇·u mit kompaktem 5-Punkt-Stern. A = Druck, B = Divergenz.
@compute @workgroup_size(8, 8, 1)
fn jacobi(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let c = cell(id);
  let s = c.ax * (A(c.pE).x + A(c.pW).x) + c.ay * (A(c.pN).x + A(c.pS).x);
  let pr = (s - B(c.p).x) / (2.0 * (c.ax + c.ay));
  put(id, vec4f(pr, 0.0, 0.0, 0.0));
}

// Druckgradient abziehen -> divergenzfreier Wind. A = Geschwindigkeit, B = Druck.
@compute @workgroup_size(8, 8, 1)
fn project(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let c = cell(id);
  let g = grad2(c, B(c.pE).x - B(c.pW).x, B(c.pN).x - B(c.pS).x);
  let u = A(c.p).xyz - (c.e1 * g.x + c.e2 * g.y);
  put(id, vec4f(safe(tangent(c.p, u)), 0.0));
}
`;
