// Baustein Turbulenz: langsam wandernde Curl-Noise-Anregung stößt Instabilitäten an (Bridson 2007). Einhängepunkt: hook_turbulenz. Aus (Turbulenz = 0): keine Anregung.
export const TURBULENZ = /* wgsl */`
fn hook_turbulenz(u0: vec3f, p: vec3f, dt: f32) -> vec3f {
  var u = u0;
  // Langsam wandernde Anregung: stößt Instabilitäten an. Die Reibung begrenzt die Energie.
  u += curlOnSphere(p, S.turbScale, S.time * 0.3 + S.seed, 2) * S.turbulence * dt;
  return u;
}
`;

export const TURBULENZ_AUS = /* wgsl */`
fn hook_turbulenz(u0: vec3f, p: vec3f, dt: f32) -> vec3f { return u0; }
`;
