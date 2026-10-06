// Quelle: eigene Umsetzung (Sonnenscheibe mit Randverdunklung und Korona im Hintergrund). Keine fremde Vorlage.
// Baustein Sonne im Hintergrund. Einhängepunkt: hook_sonne.
export const SONNE = /* wgsl */`
fn hook_sonne(col0: vec3f, dir: vec3f, pix: f32) -> vec3f {
  var col = col0;
  let c = dot(dir, U.sun.xyz);
  let ang = acos(clamp(c, -1.0, 1.0));
  let sunR = U.Mq.w;
  let sunE = U.T.w;
  let disc = 1.0 - smoothstep(sunR - pix, sunR + pix, ang);
  let limb = sqrt(max(0.0, 1.0 - (ang / sunR) * (ang / sunR)));
  let sunCol = vec3f(1.0, 0.96, 0.9);
  col += sunCol * disc * (0.45 + 0.55 * limb) * sunE * 40.0;
  col += sunCol * sunE * (0.012 * exp(-ang / 0.02) + 0.002 * exp(-ang / 0.15));
  return col;
}
`;

// Sonne AUS: keine Scheibe, keine Korona (Licht auf dem Planeten bleibt). Wird statt SONNE mitkompiliert.
export const SONNE_AUS = /* wgsl */`
fn hook_sonne(col0: vec3f, dir: vec3f, pix: f32) -> vec3f { return col0; }
`;
