// Vorbild: colordodge ProceduralPlanet (Sonne mit Blendenflecken, siehe Kopf von main.js und CREDITS.md). Die Zahlenwerte der Ringe und Geisterbilder sind eigene Umsetzung; ihre genaue Herkunft ist nicht belegt.
// Baustein Blendenflecke (Lens Flare). Einhängepunkt: hook_blende.
export const FLARE = /* wgsl */`
fn flare(uv: vec2f) -> vec3f {
  let s = U.Fl.xy - 0.5;
  let p = uv - 0.5;
  var acc = vec3f(0.0);
  var ks = array<f32, 6>(-0.28, -0.62, 0.22, 0.48, -1.15, 0.85);
  var rads = array<f32, 6>(0.05, 0.025, 0.018, 0.07, 0.11, 0.035);
  var cols = array<vec3f, 6>(vec3f(0.4, 0.6, 1.0), vec3f(0.8, 0.5, 1.0), vec3f(1.0, 0.8, 0.4), vec3f(0.4, 1.0, 0.7), vec3f(0.5, 0.6, 1.0), vec3f(1.0, 0.5, 0.4));
  for (var i = 0; i < 6; i++) {
    let rad = rads[i];
    let dv = (p - s * ks[i]) * vec2f(U.Fl.w, 1.0);
    let r = length(dv);
    let disc = 1.0 - smoothstep(rad * 0.7, rad, r);
    let ring = (1.0 - smoothstep(rad, rad * 1.12, r)) * smoothstep(rad * 0.85, rad, r);
    acc += cols[i] * (disc * 0.04 + ring * 0.07);
  }
  let dv = (p - s) * vec2f(U.Fl.w, 1.0);
  let rs = length(dv);
  acc += vec3f(1.0, 0.9, 0.8) * (0.25 * exp(-rs * 18.0) + 0.05 * exp(-rs * 4.0));
  return acc * U.Fl.z;
}
fn hook_blende(c: vec3f, uv: vec2f) -> vec3f {
  if (U.Fl.z > 0.0) { return c + flare(uv); }
  return c;
}
`;

// Blendenflecke AUS: Bild bleibt, keine flare()-Funktion. Wird statt FLARE mitkompiliert.
export const FLARE_AUS = /* wgsl */`
fn hook_blende(c: vec3f, uv: vec2f) -> vec3f { return c; }
`;
