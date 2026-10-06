import { CLOUDF } from './cloudf.js';

// Baustein Wolken (Szene): Wolkenschale (fsCloud), Wolkenschatten auf dem Boden. Einhängepunkt für scene.js: hook_wolken_schatten.
// Quellen (CREDITS.md): Henyey & Greenstein (1941) für die Vorwärtsstreuung, siehe cloudf.js.
export const WOLKEN = CLOUDF + /* wgsl */`
fn hook_wolken_schatten(d: vec3f, Lo: vec3f, muS: f32, lod: f32) -> f32 {
  var cs = 1.0;
  if (U.Cl.w > 0.0 && U.Cl.x > 0.0) {
    let tS = Lo - d * muS;
    let pc = normalize(d + tS * (U.Cl2.x / max(muS, 0.12)));
    let cd = cloudDensity(pc, max(lod - 1.0, 0.0));
    cs = mix(1.0, exp(-cd * 3.0 * U.Cl2.z), U.Cl.w);
  }
  return cs;
}

// ---- Wolkenschale
@fragment fn fsCloud(vin: PV) -> @location(0) vec4f {
  let d = normalize(vin.obj);
  let pix = max(max(length(dpdx(d)), length(dpdy(d))), 1e-6);
  let Nc = U.T.y;
  let lod = log2(max(pix * Nc / 1.5708, 1.0));
  var dens = cloudDensity(d, lod);
  // Berge, die über die Wolkenschicht ragen: Wolke dort weich ausblenden (statt harter Dreieckskanten im Tiefentest)
  if (D.w > 0.0) {
    let top = D.w * max(texDirLod(tHm, d, U.T.x, lod + log2(U.T.x / Nc)).x - U.T.z, 0.0);
    dens *= 1.0 - smoothstep(0.6 * U.Cl2.x, U.Cl2.x, top);
  }
  if (dens <= 0.003) { discard; }
  let Mi = transpose(modelM());
  let sun = U.sun.xyz;
  let Lo = Mi * sun;
  let Vw = normalize(U.cam.xyz - vin.world);
  let muS = dot(d, Lo);
  if (U.Cl2.w < 0.5) { return hook_wolken_orig_bild(muS, dens); }
  // Pseudo-Normale aus dem Dichtegradienten: quellende Oberseiten fangen Licht
  let t1 = normalize(cross(d, select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(d.y) < 0.9)));
  let t2 = cross(d, t1);
  let e = max(pix * 1.5, 1.0 / Nc);
  let dx = cloudDensity(normalize(d + t1 * e), lod) - dens;
  let dy = cloudDensity(normalize(d + t2 * e), lod) - dens;
  let nC = normalize(d - (t1 * dx + t2 * dy) * (0.0025 / e));
  let E = hook_luft_sonne(U.At.x + U.Cl2.x, muS) * U.sun.w;
  let tau = dens * 7.0 * U.Cl2.z;
  let muV = max(dot(d, Mi * Vw), 0.03);
  let alpha = 1.0 - exp(-tau / muV);
  let NL = dot(nC, Lo);
  let diffuse = clamp(NL * 0.65 + 0.35, 0.0, 1.0) * smoothstep(-0.2, 0.08, muS);
  let cosT = dot(-Vw, sun);
  let g = 0.65;
  let hg = (1.0 - g * g) / pow(max(1.0 + g * g - 2.0 * g * cosT, 1e-4), 1.5) / (4.0 * PI);
  let thin = exp(-tau * 0.6);
  var col = E * (0.78 * diffuse / PI + hg * thin * 1.2);
  col += vec3f(0.25, 0.35, 0.5) * 0.03 * U.sun.w * smoothstep(-0.2, 0.3, muS);
  return vec4f(col * alpha, alpha);
}

`;

// Wolken AUS: gleicher Einhängepunkt, weder Dichte-Funktion noch Wolkenschale. Wird statt WOLKEN mitkompiliert.
export const WOLKEN_AUS = /* wgsl */`
fn hook_wolken_schatten(d: vec3f, Lo: vec3f, muS: f32, lod: f32) -> f32 { return 1.0; }
`;
