// Quellen (CREDITS.md): Henyey & Greenstein (1941) für die Vorwärtsstreuung der Wolken; Perlin & Neyret 2001 / Neyret 2003 für die Zwei-Phasen-Überblendung des Wolkenflusses.

// ---------------------------------------------------------------- Wolkendichte (Schale + Schatten)
export const CLOUDF = /* wgsl */`
// Zonalwind als Winkelgeschwindigkeit: Passat (Ost), Westwinde, polare Ostwinde
fn windOmega(lat: f32) -> f32 {
  let a = abs(lat);
  let u = -0.9 * sin(6.0 * a) + 0.35 * exp(-sq((a - 0.75) / 0.18));
  return u / max(cos(lat), 0.3);
}
// Klimabänder: feuchte ITCZ, trockene Rossbreiten, Sturmbahnen um 55–60°
fn climate(lat: f32) -> f32 {
  let a = abs(lat) * 57.2958;
  return 0.5 * exp(-sq(a / 9.0)) - 0.45 * exp(-sq((a - 24.0) / 9.0)) + 0.35 * exp(-sq((a - 58.0) / 12.0)) - 0.2 * smoothstep(75.0, 90.0, a);
}
fn cloudDensity(d: vec3f, lod: f32) -> f32 {
  let Cl = U.Cl;
  let Cl2 = U.Cl2;
  let Nc = U.T.y;
  if (Cl.x <= 0.0) { return 0.0; }
  if (Cl2.w < 0.5) { return hook_wolken_orig_dichte(d, lod); }
  let lat = asin(clamp(d.y, -1.0, 1.0));
  // Wirbel: Tiefdruckgebiete drehen die Wolkenbänder zu Spiralen (innen stärker als außen)
  var q = d;
  var boost = 0.0;
  for (var i = 0; i < 6; i++) {
    let cy = U.cyc[i];
    if (cy.w == 0.0) { continue; }
    let ca = dot(q, cy.xyz);
    if (ca < 0.8) { continue; }
    let ang = acos(min(ca, 1.0));
    let r = U.cycB[i].x;
    let fall = exp(-(ang * ang) / (r * r));
    let a = cy.w * fall;
    q = q * cos(a) + cross(cy.xyz, q) * sin(a) + cy.xyz * dot(cy.xyz, q) * (1.0 - cos(a));
    let env = sin(3.14159 * U.cycB[i].y);
    boost += env * (0.16 * exp(-(ang * ang) / (2.2 * r * r)) - U.cycB[i].z * 0.9 * exp(-(ang * ang) / (0.012 * r * r)));
  }
  let w = windOmega(lat) * Cl.z;
  let ph = fract(Cl.y);
  let ph2 = fract(Cl.y + 0.5);
  let A = texDirLod(tCloud, rotY(q, -w * ph), Nc, lod);
  let B = texDirLod(tCloud, rotY(q, -w * ph2), Nc, lod);
  let wa = 1.0 - abs(2.0 * ph - 1.0);
  let wb = 1.0 - wa;
  // zwei Phasen überblenden, Varianz erhalten: Wolken entstehen und vergehen, statt zu pulsieren
  var c = ((A.r - 0.5) * wa + (B.g - 0.5) * wb) * inverseSqrt(wa * wa + wb * wb) + 0.5;
  var det = A.a * wa + B.a * wb;
  // feine Quellwolken-Struktur beim Heranzoomen (live, damit Wolken nicht verschmieren)
  let pixC = exp2(lod) * 1.5708 / Nc;
  var fq = 90.0;
  for (var i = 0; i < 3; i++) {
    let fade = smoothstep(2.5, 6.0, 1.0 / (fq * pixC));
    if (fade <= 0.0) { break; }
    det += snoise(q * fq + f32(i) * 3.3) * 0.22 * fade * (0.6 - 0.15 * f32(i));
    fq *= 2.3;
  }
  // Gebirge fangen Wolken (Stau), trockene Landflächen haben weniger
  let sea = U.T.z;
  let Tt = texDirLod(tHm, d, U.T.x, lod + log2(U.T.x / Nc) + 1.5);
  let land = smoothstep(sea - 0.01, sea + 0.03, Tt.x);
  c += smoothstep(sea + 0.06, sea + 0.35, Tt.x) * 0.2 + land * (Tt.y - 0.5) * 0.18;
  c += climate(lat) * 0.3 + (det - 0.5) * 0.3 + boost;
  let lo = 1.0 - Cl.x;
  let dn = smoothstep(lo, lo + 0.36, c);
  // dünne Schleier (Zirren) zwischen den dichten Feldern
  let veil = smoothstep(0.6, 0.95, det) * smoothstep(lo - 0.2, lo + 0.1, c) * 0.035;
  return max(dn * sqrt(dn), veil);
}
`;
