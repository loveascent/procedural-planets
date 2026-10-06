// Stable Fluids: Kräfte. Der Einstieg ruft nur die Einhängepunkte der einzelnen Kraft-Bausteine auf (jets, coriolis, sturmantrieb, turbulenz, wirbelverstaerkung, reibung).
// A = Geschwindigkeit, B = Wirbelstärke.
export const KRAEFTE = /* wgsl */`
@compute @workgroup_size(8, 8, 1)
fn forces(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let c = cell(id);
  let p = c.p;
  let dt = S.dt;
  var u = A(p).xyz;
  u = hook_jets(u, p, dt);
  u = hook_coriolis(u, p, dt);
  u = hook_sturmantrieb(u, p, dt);
  u = hook_turbulenz(u, p, dt);
  u = hook_wirbelverstaerkung(u, c, p, dt);
  u = hook_reibung(u, dt);
  put(id, vec4f(safe(tangent(p, u)), 0.0));
}
`;
