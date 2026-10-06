// Baustein lebendige Oberfläche: Gasbänder laufen unterschiedlich schnell, die Sonne flackert. Nur für Körper mit gesetztem Bit 2.
export const LEBENDIG = /* wgsl */`
fn hook_bewegung(uv: vec2f, nl: vec3f, gas: bool, emi: bool, flags: f32) -> vec2f {
  if ((u32(flags) & 2u) == 0u || !gas) { return uv; }
  let lat = asin(clamp(nl.y, -1.0, 1.0));
  return vec2f(uv.x + u.vor.w * 0.004 * (0.3 + cos(lat * 3.0)), uv.y);
}
fn hook_sonnenglut(alb: vec3f, nl: vec3f) -> vec3f {
  let t = u.vor.w;
  let g = 0.5 + 0.5 * sin(nl.x * 23.0 + t * 0.7) * sin(nl.y * 19.0 - t * 0.5) * sin(nl.z * 21.0 + t * 0.4);
  return alb * (3.0 + 0.6 * g);
}
`;
export const LEBENDIG_AUS = /* wgsl */`
fn hook_bewegung(uv: vec2f, nl: vec3f, gas: bool, emi: bool, flags: f32) -> vec2f { return uv; }
fn hook_sonnenglut(alb: vec3f, nl: vec3f) -> vec3f { return alb * 3.0; }
`;
