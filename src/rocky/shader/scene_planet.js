// Planetenoberfläche: Fragment-Stufe. Ruft die Bausteine nur über ihre Einhängepunkte (hook_*) auf: Stil Original, Flüsse, Erosion, Feindetail, Terrassen, Schatten, Luft, Wolken, Wellen, Wasserfarbe, Brandung, Meereis, Biome, Kavität, Debug-Ansichten.
// Quellen (CREDITS.md): Walter et al. 2007 (GGX), Cox & Munk 1954 (Glitzern), Pope & Fry 1997 (Wasser), Bruneton/Hillaire (Luft), Henyey–Greenstein (Wolken), Priority-Flood/Abfluss siehe fluesse/fluesse.js.
export const SCENE_PLANET = /* wgsl */`
@fragment fn fsPlanet(vin: PV) -> @location(0) vec4f {
  let d = normalize(vin.obj);
  let ddx = dpdx(d);
  let ddy = dpdy(d);
  let N = U.T.x;
  let sea = U.T.z;
  let F = toFace(d, ddx, ddy);
  let T = texFace(tHm, F, N);
  var h = T.x;
  var g = T.z * F.jx + T.w * F.jy;
  let pix = max(max(length(ddx), length(ddy)), 1e-6);
  let lod = log2(max(pix * N / 1.5708, 1.0));
  let M = modelM();
  let Mi = transpose(M);
  let sun = U.sun.xyz;
  let Lo = Mi * sun;
  let Vw = normalize(U.cam.xyz - vin.world);
  let muS = dot(d, Lo);
  let view = i32(U.Md.z);

  // ============================== Original 1:1 (Baustein Stil Original) ==============================
  if (U.Md.x < 0.5) { return hook_stil_original(d, F, T, h, sea, lod, N, M, sun, Vw, view); }

  // ============================== Verbessert ==============================
  let pal = i32(U.Md.y);
  let mN = clamp((T.y - U.Mq.x) / max(U.Mq.y - U.Mq.x, 1e-3), 0.0, 1.0);
  let texAng = 1.5708 / N;
  // Flusskarte (r Eintiefung, g Wasserspiegel, b Flussbett) an verbogener Stelle, wie beim Eingraben
  let hy = hook_fluss_karte(d, U.Rv.x);
  let calm = 1.0 - hy.z * step(1.5, U.Rv.z);                            // im Flussbett keine Feinrillen und keine Detail-Oktaven
  let fd = hook_feindetail(d, pix, texAng, h, g, calm, U.Fd.x);
  h = fd.h;
  g = fd.g;
  g -= d * dot(g, d);
  let er = hook_erosion_nah(d, h, g, sea, calm, pix, U.EroRt.xy);
  h = er.h;
  g = er.g;
  var depth = sea - h;
  // Flussmodus 3: dieselben Linien wie v23, aber als Wasser mit Wellen und Glitzern wie das Meer
  let riverW = hook_fluss_wasser(d, pix, U.Rv.y, U.Rv.z, depth);
  // Flüsse und Seen: Wasser, wo das Gelände unter dem berechneten Spiegel liegt (Ufer pixelgenau aus der Höhe)
  var inland = false;
  // Kraterfüllung: Kratersee oder leer (Vk.w: 1 = Wasser, 0 = leer)
  var crater = 0.0;
  if (U.Vk.x > 0.0 && U.Vk.w < 0.5 && depth <= 0.0 && h > sea + 0.03) { crater = hook_vulkan_krater(d, U.Vk.x, U.Vk.y, U.Vk.z); }
  // Flussmodus (L2.z): 2 = eingegraben mit Wasserspiegel; 1 = Linien wie v23 (nur Farbe, Gelände unberührt)
  let gr = hook_fluss_graben(hy, h, depth, U.Rv.x, U.Rv.z, crater);
  depth = gr.depth;
  if (gr.inland) { inland = true; }
  if (riverW > 0.5) { depth = 0.02 * riverW; inland = true; }
  let water = depth > 0.0;
  if (!water) {
    let te = hook_terrassen(h, g, T.y, sea, U.Te.x);
    h = te.h;
    g = te.g;
  }
  let kN = U.L.x * 0.06;                           // Überhöhung für Normalen und Schatten
  let nL = normalize(d - kN * g);
  let slope = 1.0 - dot(nL, d);
  let nz = snoise(d * 23.0 + 3.7) * 0.6 + snoise(d * 97.0) * 0.25;

  // Licht an diesem Ort: Sonne durch die Luft, Wolken- und Geländeschatten
  let E = hook_luft_sonne(U.At.x, muS) * U.sun.w;
  let cs = hook_wolken_schatten(d, Lo, muS, lod);
  let ts = hook_gelaendeschatten(d, Lo, h, kN, muS, U.Sh.x);
  let Esh = E * cs * ts;
  let up = M * d;
  let day = smoothstep(-0.12, 0.25, muS);
  let skyAmb = vec3f(0.30, 0.45, 0.75) * U.L2.y * 0.25 * day * U.sun.w * hook_luft_durchlass(U.At.x, max(muS, 0.05));

  var col: vec3f;
  var albOut = vec3f(0.0);
  var roughOut = 0.0;
  var nOut = nL;
  if (water) {
    // Wellen: Neigungen aus animiertem Rauschen; was unter ein Pixel fällt, wird Rauigkeit (Toksvig/Cox–Munk)
    let tm = U.cam.w;
    let wo = hook_wellen(d, tm, pix, U.Wl.x);
    let gw = wo.gw;
    let varSub = wo.varSub;
    let nW = normalize(d - gw);
    nOut = nW;
    let alpha = sqrt(0.0064 + wo.rau + varSub * 2.0);
    let Nn = normalize(M * nW);
    let V = Vw;
    let L = sun;
    let Hh = normalize(V + L);
    let NV = max(dot(Nn, V), 1e-3);
    let NL = max(dot(Nn, L), 0.0);
    let NH = max(dot(Nn, Hh), 0.0);
    let VH = max(dot(V, Hh), 0.0);
    let Fv = 0.02 + 0.98 * pow(1.0 - NV, 5.0);
    let Fs = 0.02 + 0.98 * pow(1.0 - VH, 5.0);
    let spec = Esh * (ggxD(NH, alpha) * smithVis(NL, NV, alpha) * Fs * NL);
    // Himmel spiegeln
    let Rw = reflect(-V, Nn);
    let ru = clamp(dot(Rw, up), 0.0, 1.0);
    let sky = mix(vec3f(0.55, 0.65, 0.8), vec3f(0.12, 0.28, 0.65), sqrt(ru)) * E * 0.05;
    let wkb = hook_wasserkoerper(F, N, sea, depth, inland, nW, Mi * V, muS, T.y, pal, Esh, U.W.y);
    let deep = wkb.deep;
    let body = wkb.body;
    col = (1.0 - Fv) * body + Fv * sky + spec;
    col = hook_brandung(col, d, tm, Esh, muS, skyAmb, depth, inland, U.Br.x);
    col += deep * skyAmb * 0.5;
    albOut = deep;
    roughOut = alpha;
    let ei = hook_meereis(col, albOut, d, depth, pix, M, sun, Esh, skyAmb, pal);
    col = ei.col;
    albOut = ei.alb;
  } else {
    var alb: vec3f;
    var rough: f32;
    if (pal == 0) {
      let bc = hook_biom_cd(T.y, h, slope);
      alb = bc.rgb;
      rough = bc.a;
    } else {
      let be = hook_biom_erde(F, N, lod, d, h, mN, g, nz);
      alb = be.rgb;
      rough = be.a;
    }
    // Flüsse wie in v23: weiche Maske mit Mipmaps, Wasser dunkel und glatt, spiegelt Himmel und Sonne
    let fc = hook_fluss_farbe(d, pix, alb, rough, U.Rv.y, U.Rv.z);
    alb = fc.rgb;
    rough = fc.a;
    let ao = hook_kavitaet(F, N, lod, T.x);
    rough = clamp(rough * (1.0 - 0.55 * U.L.y), 0.08, 1.0);
    let Nn = normalize(M * nL);
    let V = Vw;
    let L = sun;
    let Hh = normalize(V + L);
    let NL = max(dot(Nn, L), 0.0);
    let NV = max(dot(Nn, V), 1e-3);
    let NH = max(dot(Nn, Hh), 0.0);
    let VH = max(dot(V, Hh), 0.0);
    let a = rough * rough;
    let Fs = 0.04 + 0.96 * pow(1.0 - VH, 5.0);
    let diff = alb * (1.0 - Fs) / PI;
    let spec = vec3f(ggxD(NH, a) * smithVis(NL, NV, a) * Fs);
    col = Esh * NL * (diff + spec);
    col += alb * skyAmb * ao * (0.6 + 0.4 * dot(nL, d));
    albOut = alb;
    roughOut = rough;
  }
  col = hook_debug_ansicht(col, view, hy, h, mN, nOut, roughOut, albOut);
  return vec4f(col, 1.0);
}
`;
