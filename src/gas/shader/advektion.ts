// Stable Fluids: Semi-Lagrange-Advektion (Stam 1999), die BFECC-Korrektur steckt im Baustein BFECC (hook_bfecc_wind).
export const ADVEKTION = /* wgsl */`
// Semi-Lagrange-Advektion, optional mit BFECC-Korrektur (wie im mofu-Artikel, nur in 3D).
@compute @workgroup_size(8, 8, 1)
fn advect(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let p = cell(id).p;
  let dt = S.dt;
  let u0 = A(p).xyz;
  var src = stepOn(p, -u0 * dt);
  src = hook_bfecc_wind(p, src, dt);
  let v = A(src).xyz;
  // Paralleltransport: in die Tangentialebene bei p projizieren, Betrag erhalten.
  var vt = tangent(p, v);
  vt *= length(v) / max(length(vt), 1e-6);
  put(id, vec4f(safe(vt), 0.0));
}
`;
