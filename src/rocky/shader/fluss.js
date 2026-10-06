import { HYDRO_WARP } from './hydro.js';

// Quellen (CREDITS.md): Barnes, Lehman, Mulla (2014) Priority-Flood; O'Callaghan & Mark (1984) Abflussakkumulation; Leopold & Maddock (1953) hydraulische Geometrie;
// McDonald (2020), Procedural Hydrology (Idee); Quilez, Domain Warping (Mäander). Die Berechnung selbst steht in fluesse/fluesse.js (JS).
// Baustein Flüsse und Seen: Täler in der Höhenkarte (gen) und Wasser/Farbe im Bild (scene). Einhängepunkte: hook_fluss_tal, hook_fluss_karte, hook_fluss_wasser, hook_fluss_graben, hook_fluss_farbe.

// Teil für die Höhenerzeugung (gen): Flusskarte lesen und Täler eingraben.
export const FLUSS_GEN = HYDRO_WARP + /* wgsl */`
@group(0) @binding(2) var tHy: texture_2d_array<f32>;
@group(0) @binding(3) var sHy: sampler;
fn hydroAt(d: vec3f, n: f32) -> vec4f {
  let F = toFace(d, vec3f(0.0), vec3f(0.0));
  return textureSampleLevel(tHy, sHy, faceUv(F, n), F.f, 0.0);
}
struct FlussOut { h: f32, g: vec3f }
fn hook_fluss_tal(d: vec3f, h0: f32, gh0: vec3f, nHydro: f32, mode: f32) -> FlussOut {
  var h = h0;
  var gh = gh0;
  // Flusstäler: Eintiefung aus der Abflussberechnung (Karte tHy, Kanal r), an verbogener Stelle gelesen (Mäander)
  if (mode > 0.5 && nHydro > 0.0) {
    let NH = nHydro;
    let dw = hydroWarp(d);
    let e = 0.6 / NH;
    let t1 = normalize(cross(d, select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(d.y) > 0.9)));
    let t2 = cross(d, t1);
    let c0 = hydroAt(dw, NH).x;
    let gx = (hydroAt(normalize(dw + t1 * e), NH).x - hydroAt(normalize(dw - t1 * e), NH).x) / (2.0 * e);
    let gy = (hydroAt(normalize(dw + t2 * e), NH).x - hydroAt(normalize(dw - t2 * e), NH).x) / (2.0 * e);
    h -= c0;
    gh -= t1 * gx + t2 * gy;
    // Flussbett: ebener Boden knapp unter dem Wasserspiegel, damit feinere Oktaven den Fluss nicht unterbrechen
    let hc = hydroAt(dw, NH);
    if (hc.z > 0.0 && hc.y > 0.0) {
      let bed = hc.y - 0.004;
      h = mix(h, min(h, bed), hc.z);
      gh *= 1.0 - 0.8 * hc.z;
    }
  }
  return FlussOut(h, gh);
}
`;

// Flüsse AUS (Höhenerzeugung): keine Flusskarte, keine Täler.
export const FLUSS_GEN_AUS = /* wgsl */`
struct FlussOut { h: f32, g: vec3f }
fn hook_fluss_tal(d: vec3f, h0: f32, gh0: vec3f, nHydro: f32, mode: f32) -> FlussOut { return FlussOut(h0, gh0); }
`;

// Teil für das Bild (scene).
export const FLUSS_SZENE = HYDRO_WARP + /* wgsl */`
struct GrabenOut { depth: f32, inland: bool }
fn hook_fluss_karte(d: vec3f, nHydro: f32) -> vec4f {
  var hy = vec4f(0.0);
  if (nHydro > 0.0) { hy = texDirLod(tRiver, hydroWarp(d), nHydro, 0.0); }
  return hy;
}
fn hook_fluss_wasser(d: vec3f, pix: f32, nRiver: f32, mode: f32, depth: f32) -> f32 {
  var riverW = 0.0;
  if (nRiver > 0.0 && mode > 2.5 && depth <= 0.0) {
    let NRl = nRiver;
    riverW = smoothstep(0.3, 0.7, texDirLod(tRiverL, d, NRl, log2(max(pix * NRl / 1.5708, 1.0))).x);
  }
  return riverW;
}
fn hook_fluss_graben(hy: vec4f, h: f32, depth0: f32, nHydro: f32, mode: f32, crater: f32) -> GrabenOut {
  var o = GrabenOut(depth0, false);
  if (nHydro > 0.0 && mode > 1.5 && depth0 <= 0.0 && hy.y > h && crater < 0.5) { o.depth = hy.y - h; o.inland = true; }
  return o;
}
fn hook_fluss_farbe(d: vec3f, pix: f32, alb0: vec3f, rough0: f32, nRiver: f32, mode: f32) -> vec4f {
  var alb = alb0;
  var rough = rough0;
    if (nRiver > 0.0 && mode < 1.5) {
      let NR = nRiver;
      let rv = smoothstep(0.3, 0.7, texDirLod(tRiverL, d, NR, log2(max(pix * NR / 1.5708, 1.0))).x);
      alb = mix(alb, vec3f(0.012, 0.03, 0.04), rv);
      rough = mix(rough, 0.07, rv);
    }
  return vec4f(alb, rough);
}
`;

// Flüsse AUS (Bild): kein Flusswasser, keine Flussfarbe, keine Flusskarte.
export const FLUSS_SZENE_AUS = /* wgsl */`
struct GrabenOut { depth: f32, inland: bool }
fn hook_fluss_karte(d: vec3f, nHydro: f32) -> vec4f { return vec4f(0.0); }
fn hook_fluss_wasser(d: vec3f, pix: f32, nRiver: f32, mode: f32, depth: f32) -> f32 { return 0.0; }
fn hook_fluss_graben(hy: vec4f, h: f32, depth0: f32, nHydro: f32, mode: f32, crater: f32) -> GrabenOut { return GrabenOut(depth0, false); }
fn hook_fluss_farbe(d: vec3f, pix: f32, alb0: vec3f, rough0: f32, nRiver: f32, mode: f32) -> vec4f { return vec4f(alb0, rough0); }
`;
