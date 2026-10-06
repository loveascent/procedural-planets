// Baustein Wirbelverstärkung (Vorticity Confinement, Fedkiw, Stam, Jensen 2001): f = ε·Δx·(N × ω). Einhängepunkt: hook_wirbelverstaerkung. Aus (ε = 0): keine Verstärkung.
export const WIRBELVERSTAERKUNG = /* wgsl */`
fn hook_wirbelverstaerkung(u0: vec3f, c: Cell, p: vec3f, dt: f32) -> vec3f {
  var u = u0;
  // Vorticity Confinement (Fedkiw 2001): f = ε·Δx·(N × ω), N = ∇|ω| / |∇|ω||
  if (S.confinement > 0.0) {
    let g = grad2(c, abs(B(c.pE).x) - abs(B(c.pW).x), abs(B(c.pN).x) - abs(B(c.pS).x));
    let gl = length(g);
    if (gl > 1e-6) {
      let nvec = (c.e1 * g.x + c.e2 * g.y) / gl;
      u += cross(nvec, p) * B(p).x * S.confinement * c.size * dt;
    }
  }
  return u;
}
`;

export const WIRBELVERSTAERKUNG_AUS = /* wgsl */`
fn hook_wirbelverstaerkung(u0: vec3f, c: Cell, p: vec3f, dt: f32) -> vec3f { return u0; }
`;
