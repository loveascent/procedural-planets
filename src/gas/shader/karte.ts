// Baustein Kartenansicht: flache Weltkarte (equirektangulär) des ganzen Planeten. Einhängepunkt: hook_karte.
export const KARTE = /* wgsl */`
fn hook_karte(ndc: vec2f, mode: i32) -> vec4f {
  let uv = ndc * 0.5 + 0.5;
  let lon = (uv.x - 0.5) * 2.0 * PI;
  let lat = (uv.y - 0.5) * PI;
  let q = vec3f(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  var c = surface(q, mode);
  if (mode == 0) { c = aces(c * U.p2.z * 0.9); }
  return vec4f(pow(c, vec3f(1.0 / 2.2)), 1.0);
}
`;

export const KARTE_AUS = /* wgsl */`
fn hook_karte(ndc: vec2f, mode: i32) -> vec4f { return vec4f(0.0); }
`;
