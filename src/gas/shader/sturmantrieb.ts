// Baustein Sturm-Antrieb: Windfeld im Sturmgebiet zum Drehprofil ziehen (Stürme als Massenpulse im Sinn von Showman 2007). Einhängepunkt: hook_sturmantrieb. Aus: keine Stürme treiben.
export const STURMANTRIEB = /* wgsl */`
fn hook_sturmantrieb(u0: vec3f, p: vec3f, dt: f32) -> vec3f {
  var u = u0;
  // Stürme: Windfeld im Sturmgebiet zum Drehprofil ziehen.
  let sf = stormFlow(p);
  let sw = stormMask(p, 1.1).w;
  u += (sf - u) * clamp(sw * 2.0 * dt, 0.0, 1.0);
  return u;
}
`;

export const STURMANTRIEB_AUS = /* wgsl */`
fn hook_sturmantrieb(u0: vec3f, p: vec3f, dt: f32) -> vec3f { return u0; }
`;
