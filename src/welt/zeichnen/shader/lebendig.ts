// Baustein lebendige Oberfläche: Gasbänder laufen unterschiedlich schnell, die Sonne flackert. Nur für Körper mit gesetztem Bit 2.
export const LEBENDIG = /* wgsl */`
fn hook_bewegung(uv: vec2f, nl: vec3f, gas: bool, emi: bool, flags: f32) -> vec2f {
  if ((u32(flags) & 2u) == 0u || !gas) { return uv; }
  let lat = asin(clamp(nl.y, -1.0, 1.0));
  return vec2f(uv.x + u.vor.w * 0.004 * (0.3 + cos(lat * 3.0)), uv.y);
}
fn sh3(p: vec3f) -> vec3f {
  var q = vec3f(dot(p, vec3f(127.1, 311.7, 74.7)), dot(p, vec3f(269.5, 183.3, 246.1)), dot(p, vec3f(113.5, 271.9, 124.6)));
  return fract(sin(q) * 43758.5453);
}
fn svn(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let s = f * f * (3.0 - 2.0 * f);
  let a = mix(mix(sh3(i).x, sh3(i + vec3f(1, 0, 0)).x, s.x), mix(sh3(i + vec3f(0, 1, 0)).x, sh3(i + vec3f(1, 1, 0)).x, s.x), s.y);
  let b = mix(mix(sh3(i + vec3f(0, 0, 1)).x, sh3(i + vec3f(1, 0, 1)).x, s.x), mix(sh3(i + vec3f(0, 1, 1)).x, sh3(i + vec3f(1, 1, 1)).x, s.x), s.y);
  return mix(a, b, s.z);
}
fn sfbm(p: vec3f) -> f32 { return 0.5 * svn(p) + 0.25 * svn(p * 2.03) + 0.125 * svn(p * 4.1) + 0.0625 * svn(p * 8.3); }
// Curl-artige Verwirbelung: der Raum wird mit sich selbst verschoben, dann fbm; Weißglut mit rot/gelben Schattierungen und wenigen Flecken
fn hook_sonnenglut(alb: vec3f, nl: vec3f) -> vec3f {
  let t = u.vor.w * 0.03;
  var p = nl * 2.4;
  let w = vec3f(svn(p + vec3f(t, 0.0, 0.0)), svn(p + vec3f(0.0, t, 5.2)), svn(p + vec3f(3.1, 1.7, -t)));
  p += (w - 0.5) * 1.6;
  let g = sfbm(p * 1.7 + vec3f(0.0, t * 2.0, 0.0));
  let k = sfbm(p * 6.0 - vec3f(t * 3.0, 0.0, 0.0));
  let m = clamp(0.62 * g + 0.38 * k, 0.0, 1.0);
  let heiss = vec3f(1.0, 0.97, 0.9);
  let warm = vec3f(1.0, 0.62, 0.2);
  let rot = vec3f(0.95, 0.3, 0.06);
  var c = mix(rot, warm, smoothstep(0.2, 0.5, m));
  c = mix(c, heiss, smoothstep(0.42, 0.7, m));
  let fleck = smoothstep(0.30, 0.18, sfbm(p * 3.1 + 9.0));       // wenige dunklere Sonnenflecken
  c = mix(c, c * vec3f(0.55, 0.3, 0.15), fleck * 0.55);
  return c * 4.2;
}
`;
export const LEBENDIG_AUS = /* wgsl */`
fn hook_bewegung(uv: vec2f, nl: vec3f, gas: bool, emi: bool, flags: f32) -> vec2f { return uv; }
fn hook_sonnenglut(alb: vec3f, nl: vec3f) -> vec3f { return alb * 3.0; }
`;
