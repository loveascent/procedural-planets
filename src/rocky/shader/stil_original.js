// Quelle (CREDITS.md): colordodge ProceduralPlanet (three.js, WTFPL): Material mit Textur-, Normal- und Rauigkeitskarte, Standard-Beleuchtung; hier 1:1 nachgebaut.
// Baustein Stil „Original 1:1“: der ganze Bildweg des Originals. Wird nur mitkompiliert, wenn der Stil Original gewählt ist. Einhängepunkt: hook_stil_original.
export const STIL_ORIGINAL = /* wgsl */`
fn hook_stil_original(d: vec3f, F: Face, T: vec4f, h: f32, sea: f32, lod: f32, N: f32, M: mat3x3f, sun: vec3f, Vw: vec3f, view: i32) -> vec4f {
  let alb = biome(vec2f(T.y, h));                        // textureMap = biom(feuchte, höhe)
  // normalMap: Sobel über 8-Bit-Höhe + Bildhelligkeit, Wasser glatt
  let stp = exp2(max(floor(lod), 0.0)) / (N - 1.0);
  var gx = 0.0;
  var gy = 0.0;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      if (i == 0 && j == 0) { continue; }
      var G = F;
      G.uv = clamp(F.uv + vec2f(f32(i), f32(j)) * stp, vec2f(0.0), vec2f(1.0));
      let Tn = texFaceLod(tHm, G, N, floor(lod));
      let hq = floor(Tn.x * 255.0) / 255.0;
      let b = hq + 0.35 * luma(biome(vec2f(Tn.y, Tn.x)));
      gx += f32(i) * select(1.0, 2.0, j == 0) * b;
      gy += f32(j) * select(1.0, 2.0, i == 0) * b;
    }
  }
  let dB = vec2f(gx, gy) / (8.0 * stp);
  let gB = dB.x * F.jx + dB.y * F.jy;
  let water = h < sea;
  let nO = select(normalize(d - U.O.x * 0.05 * gB), d, water);
  let rmap = select(0.85, 0.25, water);                  // roughnessMap (dient auch als metalnessMap)
  let rough = clamp(U.O.y * rmap, 0.04, 1.0);
  let metal = clamp(U.O.z * rmap, 0.0, 1.0);
  let Nn = normalize(M * nO);
  let L = sun;
  let V = Vw;
  let Hh = normalize(L + V);
  let NL = max(dot(Nn, L), 0.0);
  let NV = max(dot(Nn, V), 1e-3);
  let NH = max(dot(Nn, Hh), 0.0);
  let VH = max(dot(V, Hh), 0.0);
  let diffC = alb * (1.0 - metal);
  let specC = mix(vec3f(0.04), alb, metal);
  let a = rough * rough;
  let Fr = specC + (1.0 - specC) * pow(1.0 - VH, 5.0);
  var col = NL * U.Mq.z * (diffC + Fr * smithVis(NL, NV, a) * ggxD(NH, a) * PI);
  col += U.O.w * diffC;
  if (view == 1) { col = vec3f(h); }
  else if (view == 2) { col = vec3f(T.y); }
  else if (view == 3) { col = nO * 0.5 + 0.5; }
  else if (view == 4) { col = vec3f(rough); }
  else if (view == 5) { col = alb; }
  return vec4f(col, 1.0);
}
`;

// Stil Original AUS (Standard: Stil „+20 % besser“): der Original-Bildweg ist nicht mitkompiliert.
export const STIL_ORIGINAL_AUS = /* wgsl */`
fn hook_stil_original(d: vec3f, F: Face, T: vec4f, h: f32, sea: f32, lod: f32, N: f32, M: mat3x3f, sun: vec3f, Vw: vec3f, view: i32) -> vec4f { return vec4f(0.0); }
`;
