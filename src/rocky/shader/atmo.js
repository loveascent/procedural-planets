// Quellen (CREDITS.md): Bruneton, Precomputed Atmospheric Scattering (2017) für die Transmissions-Tabelle; Hillaire, EGSR 2020 für Rayleigh-, Mie- und Ozon-Koeffizienten.

// Baustein Luft (Streuung): Transmissions-Tabelle lesen, Sonnenlicht durch die Luft, Streulicht im Bild. Einhängepunkte: hook_luft_sonne, hook_luft_durchlass, hook_luft_streuung.
// Zwei Teile, weil die Szene nur die ersten beiden braucht: ATMO (Tabelle + Sonne) und ATMO_POST (Streulicht im Nachbild).
export const ATMO = /* wgsl */`
fn transmittance(r0: f32, mu: f32) -> vec3f {
  let R = U.At.x;
  let Rt = U.At.y;
  let r = clamp(r0, R, Rt);
  let H = sqrt(Rt * Rt - R * R);
  let rho = sqrt(max(r * r - R * R, 0.0));
  let disc = r * r * (mu * mu - 1.0) + Rt * Rt;
  let d = max(-r * mu + sqrt(max(disc, 0.0)), 0.0);
  let dmin = Rt - r;
  let dmax = rho + H;
  var uv = vec2f((d - dmin) / max(dmax - dmin, 1e-6), rho / H);
  uv = vec2f(0.5 / 256.0, 0.5 / 64.0) + uv * vec2f(255.0 / 256.0, 63.0 / 64.0);
  return textureSampleLevel(tTrans, samp, uv, 0.0).rgb;
}
// Sonnenlicht an einem Punkt: Luftweg + Planetenschatten mit weichem Rand (Sonnenscheibe)
fn sunTrans(r: f32, mu: f32) -> vec3f {
  let muH = -sqrt(max(1.0 - (U.At.x * U.At.x) / (r * r), 0.0));
  return transmittance(r, mu) * smoothstep(muH - 0.006, muH + 0.006, mu);
}
fn hook_luft_sonne(r: f32, mu: f32) -> vec3f { return sunTrans(r, mu); }
fn hook_luft_durchlass(r: f32, mu: f32) -> vec3f { return transmittance(r, mu); }
`;

// Luft AUS: Planetenschatten bleibt (gehört zum Licht), aber keine Tabelle, keine Streuung. Wird statt ATMO mitkompiliert.
export const ATMO_AUS = /* wgsl */`
fn hook_luft_sonne(r: f32, mu: f32) -> vec3f {
  let muH = -sqrt(max(1.0 - (U.At.x * U.At.x) / (r * r), 0.0));
  return vec3f(smoothstep(muH - 0.006, muH + 0.006, mu));
}
fn hook_luft_durchlass(r: f32, mu: f32) -> vec3f { return vec3f(1.0); }
`;

// Streulicht im Nachbild (nur das Post-Modul): Strahl durch die Lufthülle, Rayleigh + Mie + Ozon (Hillaire 2020).
export const ATMO_POST = /* wgsl */`
fn hook_luft_streuung(col: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f, fp: vec2f) -> vec4f {
  let R = U.At.x;
  let Rt = U.At.y;
  let disc = b * b - (c2 - Rt * Rt);
  if (disc <= 0.0) { return vec4f(col, 1.0); }
  let sq0 = sqrt(disc);
  let t0 = max(-b - sq0, 0.0);
  var t1 = -b + sq0;
  let dg = b * b - (c2 - R * R);
  if (dg > 0.0) { let tg = -b - sqrt(dg); if (tg > 0.0) { t1 = min(t1, tg); } }
  if (t1 <= t0) { return vec4f(col, 1.0); }
  let NS = i32(U.Oz.w);
  let dt = (t1 - t0) / f32(NS);
  let jit = ign(fp);
  let BR = U.BR.xyz;
  let BO = U.BO.xyz;
  var od = vec3f(0.0);
  var sR = vec3f(0.0);
  var sM = vec3f(0.0);
  for (var i = 0; i < 64; i++) {
    if (i >= NS) { break; }
    let tt = t0 + (f32(i) + jit) * dt;
    let p = cam + dir * tt;
    let r = length(p);
    let hh = max(r - R, 0.0);
    let dR = exp(-hh / U.At.z);
    let dM = exp(-hh / U.At.w);
    let dO = max(0.0, 1.0 - abs(hh - U.Oz.x) / U.Oz.y);
    let ext = BR * dR + vec3f(U.BO.w) * dM + BO * dO;
    let Tv = exp(-(od + ext * dt * 0.5));
    let Ts = sunTrans(r, dot(p, sun) / r);
    sR += Tv * Ts * dR * dt;
    sM += Tv * Ts * dM * dt;
    od += ext * dt;
  }
  let mu = dot(dir, sun);
  let pR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  let g = U.Oz.z;
  let pM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(max(1.0 + g * g - 2.0 * g * mu, 1e-4), 1.5));
  let Ls = U.sun.w * (sR * BR * pR + sM * U.BR.w * pM);
  return vec4f(col * exp(-od) + Ls, 1.0);
}
`;

// Luft AUS: Bild bleibt, wie es ist (mit Luft aus waren alle Koeffizienten 0 → dasselbe Ergebnis, nur ohne die 64-Schritte-Schleife).
export const ATMO_POST_AUS = /* wgsl */`
fn hook_luft_streuung(col: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f, fp: vec2f) -> vec4f { return vec4f(col, 1.0); }
`;
