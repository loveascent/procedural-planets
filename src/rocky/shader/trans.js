import { JDECL } from './jdecl.js';


// ---------------------------------------------------------------- Milchstraße (Würfelkarte, steht fest im Raum)
// Aufbau wie am echten Nachthimmel: helles Band (Scheibe der Galaxie) mit Kern (Bulge), dunkle Staubbahnen
// genau in der Mitte des Bandes, vereinzelte rote Gaswolken (H-alpha) im Band. Alpha = Sterndichte.
// a = (Seed, Helligkeit, -, -), b = Pol der Galaxie, c = Richtung zum Kern, d = Farbton-Verschiebung

// ---------------------------------------------------------------- Atmosphäre: Durchlässigkeits-Tabelle (Compute)
// a = (R, R_oben, H_Rayleigh, H_Mie), b = (β_R, β_M,ext), c = β_Ozon, d = (Ozon-Höhe, -Breite)
export const TRANS = JDECL + /* wgsl */`
@group(0) @binding(1) var dst: texture_storage_2d<rgba16float, write>;
// Durchlässigkeit bis zum oberen Rand, Tabelle über (Höhe, Richtung) nach Bruneton (2017)
@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  if (gid.x >= 256u || gid.y >= 64u) { return; }
  let x = vec2f(gid.xy) / vec2f(255.0, 63.0);
  let R = J.a.x;
  let Rt = J.a.y;
  let H = sqrt(Rt * Rt - R * R);
  let rho = H * x.y;
  let r = sqrt(rho * rho + R * R);
  let dmin = Rt - r;
  let dmax = rho + H;
  let dd = dmin + x.x * (dmax - dmin);
  var mu = 1.0;
  if (dd > 0.0) { mu = clamp((H * H - rho * rho - dd * dd) / (2.0 * r * dd), -1.0, 1.0); }
  var od = vec3f(0.0);
  let dx = dd / 64.0;
  for (var i = 0; i <= 64; i++) {
    let s = f32(i) * dx;
    let ri = sqrt(s * s + 2.0 * r * mu * s + r * r);
    let hh = max(ri - R, 0.0);
    let w = select(1.0, 0.5, i == 0 || i == 64);
    od += w * dx * (J.b.xyz * exp(-hh / J.a.z) + vec3f(J.b.w) * exp(-hh / J.a.w) + J.c.xyz * max(0.0, 1.0 - abs(hh - J.d.x) / J.d.y));
  }
  textureStore(dst, vec2u(gid.xy), vec4f(exp(-od), 1.0));
}
`;
