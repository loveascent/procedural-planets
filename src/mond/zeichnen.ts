// Zeichen-Shader des Mondes: ein Vollbilddreieck, jeder Pixel verfolgt seinen Strahl über die Höhenkarte (Sphere Tracing),
// beleuchtet mit Sonne, Geländeschatten, Hohlraumdunkelung und sub-texel Live-Detail, davor/dahinter Sterne, Luft und Fontänen.
import { GRUND } from './shader/grund';
import { MP_VEC4, ersetze } from './kode';
import { SKY_DRAW_WGSL } from '../sky/sky';
import type { Block } from './typen';

export const RU_FLOATS = 36;

const DBG = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('szene') || 99) : 99;
export function sceneShader(act: Block[]): string {
  const luft = act.find((b) => b.r?.luft)?.r!.luft;
  const fontaene = act.find((b) => b.r?.fontaene)?.r!.fontaene;
  const detail = act.filter((b) => b.r?.detail).map((b) => `  det = detSum(det, ${b.r!.detail}(d, foot));\n`).join('');
  const lib = ersetze(act.map((b) => b.wgsl).join('\n'));
  // Block-Bibliotheken enthalten h_…/c_…-Funktionen, die nur im Karten-Shader aufgerufen werden; unbenutzte Funktionen stören WGSL nicht.
  return GRUND + SKY_DRAW_WGSL + /* wgsl */`
struct RU {
  camW: vec4f, fwdW: vec4f, rightW: vec4f, upW: vec4f, sunW: vec4f,
  a: vec4f, b: vec4f, c: vec4f, d: vec4f,
}
@group(0) @binding(0) var<uniform> RUF: RU;
@group(0) @binding(1) var<uniform> MP: array<vec4f, ${MP_VEC4}>;
@group(0) @binding(2) var tA: texture_2d_array<f32>;
@group(0) @binding(3) var tB: texture_2d_array<f32>;
@group(0) @binding(4) var tC: texture_2d_array<f32>;
@group(0) @binding(5) var smp: sampler;
@group(0) @binding(6) var tSky: texture_2d_array<f32>;
const DBG: i32 = ${DBG};
fn gseed() -> f32 { return RUF.a.x; }
fn gtexn() -> f32 { return RUF.upW.w; }
` + lib + /* wgsl */`
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: VO;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = vec2f(p.x, 1.0 - p.y);
  return o;
}
fn toBody(v: vec3f) -> vec3f { return rotY(v, -RUF.a.y); }
fn fromBody(v: vec3f) -> vec3f { return rotY(v, RUF.a.y); }
fn texAt(tx: texture_2d_array<f32>, d: vec3f, lod: f32) -> vec4f {
  let f = majorFace(d);
  let B = faceBasis(f);
  let m = dot(d, B.em);
  let st = vec2f(dot(d, B.ex), dot(d, B.ey)) / m;
  let n = gtexn();
  let uv = (atan(st) / QPI * 0.5 + 0.5) * ((n - 1.0) / n) + 0.5 / n;
  return textureSampleLevel(tx, smp, uv, f, lod);
}
fn lodFor(foot: f32) -> f32 { return max(log2(max(foot / (1.5708 / gtexn()), 1.0)), 0.0); }
fn heightAt(d: vec3f, lod: f32) -> f32 { return texAt(tA, d, lod).x; }

// Schattenstrahl zur Sonne über die Höhenkarte (weicher Rand nach Quilez: min(k·Abstand/Weg))
fn shadowRay(p0: vec3f, L: vec3f, hmax: f32, lod0: f32, soft: f32) -> f32 {
  var res = 1.0;
  var t = 0.0006;
  for (var i = 0; i < 40; i++) {
    let p = p0 + L * t;
    let r = length(p);
    if (r > 1.0 + hmax && dot(p, L) > 0.0) { break; }
    let lod = lod0 + log2(1.0 + t * gtexn() * 0.06);
    let clr = r - (1.0 + heightAt(p / r, lod));
    res = min(res, soft * clr / t);
    if (res < 0.001) { return 0.0; }
    t += clamp(clr * 0.9, 0.0004 + t * 0.03, 0.06);
    if (t > 1.5) { break; }
  }
  return clamp(res, 0.0, 1.0);
}
// Hohlraumdunkelung aus der Höhenkarte: Horizontsuche in 8 Richtungen, 2 Radien
fn occlusion(d: vec3f, hc: f32, g: vec3f, foot: f32, lod: f32) -> f32 {
  let tg = tangents(d);
  var occ = 0.0;
  for (var k = 0; k < 8; k++) {
    let a = (f32(k) + 0.5) * 0.785398;
    let u = tg[0] * cos(a) + tg[1] * sin(a);
    for (var j = 0; j < 2; j++) {
      let rho = select(0.035, 0.008, j == 0) + foot * 2.0;
      let ds = normalize(d + u * rho);
      let rel = heightAt(ds, lod + select(2.5, 1.0, j == 0)) - hc - dot(g, u) * rho;
      occ += clamp(rel / rho * 1.6, 0.0, 1.0);
    }
  }
  return 1.0 - occ / 16.0;
}
fn ggx(nh: f32, a: f32) -> f32 { let a2 = a * a; let d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159265 * d * d); }
fn aces(x: vec3f) -> vec3f { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0)); }

@fragment fn fsScene(vin: VO) -> @location(0) vec4f {
  if (DBG == 1) { return vec4f(0.5, 0.2, 0.1, 1.0); }
  let vp = RUF.c.xy;
  let ndc = vec2f(vin.pos.x / vp.x * 2.0 - 1.0, 1.0 - vin.pos.y / vp.y * 2.0);
  let rdW = normalize(RUF.fwdW.xyz + ndc.x * RUF.rightW.xyz + ndc.y * RUF.upW.xyz);
  let roW = RUF.camW.xyz;
  let ro = toBody(roW);
  let rd = toBody(rdW);
  let pix = RUF.camW.w;
  let hmax = RUF.fwdW.w;
  let sunB = normalize(toBody(RUF.sunW.xyz));
  let sunI = RUF.sunW.w;
  let Rb = 1.0 + hmax;
  var col = vec3f(0.0);
  var covered = false;
  var tHit = 0.0;
  let bq = dot(ro, rd);
  let disc = bq * bq - (dot(ro, ro) - Rb * Rb);
  var hit = false;
  var t = 0.0;
  if (disc > 0.0) {
    let sq = sqrt(disc);
    let t0 = max(-bq - sq, 0.0);
    let t1 = -bq + sq;
    t = t0;
    var tp = t0;
    for (var i = 0; i < select(160, 2, DBG == 2); i++) {
      let p = ro + rd * t;
      let r = length(p);
      let foot = pix * t;
      let gap = r - (1.0 + heightAt(p / r, lodFor(foot) * 0.6));
      if (gap < foot * 0.15) { hit = true; break; }
      tp = t;
      t += max(gap * 0.5, foot * 0.05);
      if (t > t1) { break; }
    }
    if (hit) {
      // Verfeinern zwischen letztem Schritt außerhalb und Treffer
      var lo = tp; var hi = t;
      for (var j = 0; j < 5; j++) {
        let mid = 0.5 * (lo + hi);
        let p = ro + rd * mid;
        let r = length(p);
        let gap = r - (1.0 + heightAt(p / r, lodFor(pix * mid) * 0.6));
        if (gap < 0.0) { hi = mid; } else { lo = mid; }
      }
      t = 0.5 * (lo + hi);
    }
  }
  if (hit) {
    covered = true;
    tHit = t;
    let p = ro + rd * t;
    let d = normalize(p);
    let foot0 = pix * t;
    let cosv = max(dot(d, -rd), 0.05);
    let foot = foot0 / max(cosv, 0.3);
    let lod = lodFor(foot);
    let A = texAt(tA, d, lod);
    let Bt = texAt(tB, d, lod);
    let Ct = texAt(tC, d, lod);
    var albedo = Bt.rgb * Bt.rgb;
    let gloss = Bt.a;
    let heat = Ct.r * Ct.r * 16.0;
    // Sprünge der Kraterzellen liefern im Differenzenquotienten riesige Steigungen: begrenzen, sonst schwarze Punkte
    var g = A.yzw * RUF.b.z;
    var det = Det(vec3f(0.0), 1.0);
${detail}
    g += det.g * RUF.b.z * RUF.b.w;
    let gl = length(g);
    if (gl > 1.0) { g *= 1.0 / gl; }
    albedo *= mix(1.0, det.br, RUF.b.w);
    let n = normalize(d - g / (1.0 + A.x));
    let mu0 = dot(n, sunB);
    let mu = max(dot(n, -rd), 0.02);
    var sh = 1.0;
    if (DBG == 4) { return vec4f(albedo * max(mu0, 0.0) * sunI, 1.0); }
    if (RUF.b.x > 0.0 && dot(d, sunB) > -0.35) {
      sh = mix(1.0, shadowRay(p + d * 0.0004, sunB, hmax, lod, 14.0), RUF.b.x);
    } else if (dot(d, sunB) <= -0.35) { sh = 0.0; }
    var ao = 1.0;
    if (DBG == 5) { return vec4f(albedo * max(mu0, 0.0) * sunI * sh, 1.0); }
    if (RUF.b.y > 0.0) { ao = mix(1.0, occlusion(d, A.x, A.yzw, foot, lod), RUF.b.y); }
    // Streuung: staubiger Regolith nach Lommel–Seeliger (flache Scheibe, kein Randabfall), Eis nach Lambert; Oppositionseffekt nahe Vollmond
    let cosg = dot(sunB, -rd);
    let gAng = acos(clamp(cosg, -1.0, 1.0));
    let ls = 2.0 * max(mu0, 0.0) / (max(mu0, 0.0) + mu);
    let lam = max(mu0, 0.0);
    let reg = mix(ls, lam, 0.25 + 0.6 * gloss);
    let opp = 1.0 + 0.8 * (1.0 - gloss) / (1.0 + tan(0.5 * gAng) / 0.05);
    let ph = mix(1.0 + 0.35 * cosg, 1.0, gloss);
    var rad = albedo * reg * opp * ph * sunI * sh;
    // Fülllicht (Planetenschein, Streulicht) auf Tag- und Nachtseite, gedämpft durch Hohlräume
    rad += albedo * RUF.a.z * ao * (0.55 + 0.45 * dot(n, vec3f(0.0, 1.0, 0.0))) * sunI * 0.5;
    rad *= mix(1.0, ao, 0.8);
    // Glanz (GGX) auf Eis und Flüssigkeit
    if (gloss > 0.01 && mu0 > 0.0) {
      let hv = normalize(sunB - rd);
      let alpha = mix(0.55, 0.04, gloss * gloss);
      let F = 0.04 + 0.96 * pow(1.0 - max(dot(hv, -rd), 0.0), 5.0);
      rad += vec3f(1.0) * ggx(max(dot(n, hv), 0.0), alpha) * F * mu0 * sunI * sh * gloss * RUF.a.w * 0.25;
    }
    rad += vec3f(heat) * mix(vec3f(1.0, 0.35, 0.08), vec3f(1.0, 0.8, 0.45), clamp(heat * 0.05, 0.0, 1.0));
    col = rad;
  } else {
    let skyN = RUF.c.w;
    col = skyColor(tSky, smp, rdW, pix, skyN, 0.9, RUF.c.z * 0.9);
  }
${fontaene ? '  col = ' + fontaene + '(ro, rd, select(1.0e9, tHit, covered), col, sunB, sunI);' : ''}
${luft ? '  col = ' + luft + '(ro, rd, tHit, covered, col, sunB, sunI);' : ''}
  return vec4f(col, 1.0);
}
`;
}

export const POST_WGSL = /* wgsl */`
struct PU { a: vec4f }   // x = Belichtung, y = genutzter Anteil der Textur (u), z = (v), w = Überabtastung
@group(0) @binding(0) var<uniform> PUF: PU;
@group(0) @binding(1) var tHdr: texture_2d<f32>;
@group(0) @binding(2) var smp: sampler;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: VO;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = vec2f(p.x, 1.0 - p.y);
  return o;
}
fn aces(x: vec3f) -> vec3f { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0)); }
fn hash12(p: vec2f) -> f32 { var p3 = fract(vec3f(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
@fragment fn fsPost(vin: VO) -> @location(0) vec4f {
  let uv = vin.uv * vec2f(PUF.a.y, PUF.a.z);
  let dim = vec2f(textureDimensions(tHdr));
  // Herunterrechnen der Überabtastung: 4 Taps in einem Rotationsraster, anschließend lineare Filterung
  let px = vec2f(0.5 * (PUF.a.w - 1.0)) / dim;
  var c = textureSampleLevel(tHdr, smp, uv + vec2f(-px.x, -px.y), 0.0).rgb
        + textureSampleLevel(tHdr, smp, uv + vec2f(px.x, -px.y), 0.0).rgb
        + textureSampleLevel(tHdr, smp, uv + vec2f(-px.x, px.y), 0.0).rgb
        + textureSampleLevel(tHdr, smp, uv + vec2f(px.x, px.y), 0.0).rgb;
  c *= 0.25;
  c *= PUF.a.x;
  c = pow(aces(c), vec3f(1.0 / 2.2));
  c += (hash12(vin.pos.xy) - 0.5) / 255.0;
  return vec4f(c, 1.0);
}
`;
