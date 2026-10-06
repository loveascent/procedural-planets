// Stable Fluids: Anfangswind (Jets, Curl-Rauschen, Stürme als Anfangswirbel) und Löschen eines Felds.
export const ANFANGSWIND = /* wgsl */`
@compute @workgroup_size(8, 8, 1)
fn initVel(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  let p = cell(id).p;
  var v = east(p) * jetAt(latitude(p)) + curlOnSphere(p, 3.0, S.seed, 3) * 0.01;
  // Stürme als Anfangswirbel einsetzen. Danach leben sie nur noch von der Physik
  // (außer "Stürme festhalten" ist aufgedreht).
  v = mix(v, stormFlow(p), stormMask(p, 1.1).w);
  put(id, vec4f(tangent(p, v), 0.0));
}

@compute @workgroup_size(8, 8, 1)
fn clear(@builtin(global_invocation_id) id: vec3u) {
  if (outside(id)) { return; }
  put(id, vec4f(0.0));
}
`;
