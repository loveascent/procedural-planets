// Shader-Zusammenbau: Aus den eingeschalteten Bausteinen entsteht der WGSL-Text. Ausgeschaltete Bausteine kommen nicht vor.
// Reglerwerte liegen in einem Uniform-Feld MP (vec4-Felder); $baustein_regler wird zu MP[i].c.
import { BAUSTEINE } from './bausteine/index';
import { STUFEN, type Block, type Settings } from './typen';
import { GRUND } from './shader/grund';

export const MP_VEC4 = 128;

/** Platz jedes Reglers im Uniform-Feld (fest, unabhängig davon, welche Bausteine an sind). */
const SLOT = new Map<string, number>();
{
  let i = 0;
  for (const b of BAUSTEINE) for (const p of b.par) SLOT.set(`${b.id}_${p.k}`, i++);
  if (i > MP_VEC4 * 4) throw new Error('zu viele Regler für das Uniform-Feld');
}

const KOMP = ['x', 'y', 'z', 'w'];
export function ersetze(wgsl: string): string {
  return wgsl.replace(/\$([a-z0-9]+_[a-z0-9]+)/g, (_m, key: string) => {
    const i = SLOT.get(key);
    if (i === undefined) throw new Error(`Unbekannter Regler $${key}`);
    return `MP[${i >> 2}].${KOMP[i & 3]}`;
  });
}

/** Reglerwerte → Float32Array für das Uniform-Feld MP. */
export function mpDaten(S: Settings): Float32Array<ArrayBuffer> {
  const a = new Float32Array(MP_VEC4 * 4);
  for (const [key, i] of SLOT) a[i] = Number(S[key]);
  return a;
}

export const aktive = (S: Settings): Block[] => BAUSTEINE.filter((b) => S[`${b.id}_an`]);

/** Höhen- und Farbfunktionen der aktiven Bausteine: surfHeight(d, lv) und surfColor(&s, d, g). */
export function oberflaeche(act: Block[]): string {
  let hCalls = '';
  for (const st of STUFEN) for (const b of act) if (b.h?.[st]) hCalls += `  ${b.h[st]}(&s, d, lv);\n`;
  const farb = act.filter((b) => b.c).sort((a, b) => (a.corder ?? 50) - (b.corder ?? 50));
  const cCalls = farb.map((b) => `  ${b.c}(s, d, g);\n`).join('');
  const lib = act.filter((b) => !b.nurZeichnen).map((b) => b.wgsl).join('\n');
  return ersetze(`${lib}
fn surfHeight(d: vec3f, lv: i32) -> Surf {
  var s = surfInit();
${hCalls}  return s;
}
fn surfColor(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
${cCalls}}
`);
}

// ------------------------------------------------------------------ Karten-Erzeugung (Compute)
export function bakeShader(act: Block[]): string {
  return GRUND + /* wgsl */`
struct BakeU { n: f32, face: f32, seed: f32, eps: f32 }
@group(0) @binding(0) var<uniform> BUF: BakeU;
@group(0) @binding(1) var<uniform> MP: array<vec4f, ${MP_VEC4}>;
@group(0) @binding(2) var tA: texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(3) var tB: texture_storage_2d_array<rgba8unorm, write>;
@group(0) @binding(4) var tC: texture_storage_2d_array<rgba8unorm, write>;
@group(0) @binding(5) var<storage, read_write> stats: array<atomic<u32>, 4>;
fn gseed() -> f32 { return BUF.seed; }
fn gtexn() -> f32 { return BUF.n; }
` + oberflaeche(act) + /* wgsl */`
var<workgroup> wmax: atomic<u32>;
var<workgroup> wmin: atomic<u32>;
@compute @workgroup_size(8, 8)
fn bake(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_index) li: u32) {
  if (li == 0u) { atomicStore(&wmax, 0u); atomicStore(&wmin, 0u); }
  workgroupBarrier();
  let N = BUF.n;
  var h = 0.0;
  if (f32(gid.x) < N && f32(gid.y) < N) {
    let face = i32(BUF.face);
    let uv = vec2f(gid.xy) / (N - 1.0);
    let d = faceDir(face, uv);
    let tg = tangents(d);
    let eps = BUF.eps;
    var s = surfHeight(d, 1);
    let h1 = surfHeight(normalize(d + tg[0] * eps), 0).h;
    let h2 = surfHeight(normalize(d + tg[1] * eps), 0).h;
    let g = ((h1 - s.h) / eps) * tg[0] + ((h2 - s.h) / eps) * tg[1];
    surfColor(&s, d, g);
    let px = vec2u(gid.xy);
    textureStore(tA, px, face, vec4f(s.h, g));
    textureStore(tB, px, face, vec4f(sqrt(clamp(s.col, vec3f(0.0), vec3f(1.0))), clamp(s.gloss, 0.0, 1.0)));
    textureStore(tC, px, face, vec4f(sqrt(clamp(s.heat / 16.0, 0.0, 1.0)), clamp(s.rough, 0.0, 1.0), clamp(s.ice, 0.0, 1.0), clamp(s.cav, 0.0, 1.0)));
    h = s.h;
  }
  atomicMax(&wmax, bitcast<u32>(max(h, 0.0)));
  atomicMax(&wmin, bitcast<u32>(max(-h, 0.0)));
  workgroupBarrier();
  if (li == 0u) { atomicMax(&stats[0], atomicLoad(&wmax)); atomicMax(&stats[1], atomicLoad(&wmin)); }
}
`;
}

export const MIP_WGSL = (fmt: string) => /* wgsl */`
@group(0) @binding(0) var src: texture_2d_array<f32>;
@group(0) @binding(1) var dst: texture_storage_2d_array<${fmt}, write>;
@compute @workgroup_size(8, 8, 1)
fn mip(@builtin(global_invocation_id) g: vec3u) {
  let n = textureDimensions(dst);
  if (g.x >= n.x || g.y >= n.y) { return; }
  let p = vec2i(g.xy) * 2;
  let l = i32(g.z);
  let c = textureLoad(src, p, l, 0) + textureLoad(src, p + vec2i(1, 0), l, 0) + textureLoad(src, p + vec2i(0, 1), l, 0) + textureLoad(src, p + vec2i(1, 1), l, 0);
  textureStore(dst, vec2i(g.xy), l, c * 0.25);
}
`;
