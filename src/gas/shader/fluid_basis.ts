// Stable-Fluids-Grundlagen: Bindungen, Abtastung (A, B), Zelle mit Nachbarn und Gradient, Schutz gegen NaN. Stam 1999, Harris 2004 (GPU Gems 38).
export const FLUID_BASIS = /* wgsl */`
// Stable Fluids (Stam 1999) auf der Kugel.
// Ablauf pro Schritt: advect -> curl -> zonalClear/zonalSum -> forces -> divergence -> jacobi×K -> project.
//
// Ableitungen: Nachbarn sind die echten Nachbarzellen des Würfelgitters. Ihre Richtungen
// kommen aus der Flächenparametrisierung (auch über die Flächenkante hinaus, dann landet
// die Abtastung nahtlos auf der Nachbarfläche). Weil die Zellen des Würfelgitters nicht
// gleich groß und nicht rechtwinklig sind, wird der Gradient aus einem 2×2-System mit den
// tatsächlichen Abstandsvektoren gelöst. Der Laplace-Operator für den Druck ist kompakt
// (direkte Nachbarn, wie in GPU Gems 38) und dämpft dadurch Zickzack-Moden in Gittergröße.

@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var srcA: texture_cube<f32>;
@group(0) @binding(3) var srcB: texture_cube<f32>;
@group(0) @binding(4) var dst: texture_storage_2d_array<rgba16float, write>;
// Breitenkreis-Mittel des Ostwinds: [2·i] = Summe, [2·i+1] = Gewicht, Festkomma.
@group(0) @binding(5) var<storage, read_write> zonal: array<atomic<i32>>;

const ZBINS = 128u;
const ZSCALE = 10000.0;

// Gleiche Felder als 2D-Array, für die nahtlos exakte Abtastung.
@group(0) @binding(6) var arrA: texture_2d_array<f32>;
@group(0) @binding(7) var arrB: texture_2d_array<f32>;
// SEAMLESS = true: an Würfelkanten die vier Nachbartexel einzeln holen (sampleCube in common.wgsl).
// Nötig nur auf Grafikkarten, deren Cubemap-Abtastung nicht nahtlos filtert; der Selbsttest
// im Abschnitt „Diagnose“ misst das. Sonst schnelle Hardware-Abtastung.
override SEAMLESS: bool = false;
fn A(d: vec3f) -> vec4f {
  if (SEAMLESS) { return sampleCube(arrA, samp, d); }
  return textureSampleLevel(srcA, samp, d, 0.0);
}
fn B(d: vec3f) -> vec4f {
  if (SEAMLESS) { return sampleCube(arrB, samp, d); }
  return textureSampleLevel(srcB, samp, d, 0.0);
}

fn outside(id: vec3u) -> bool { return f32(id.x) >= S.velN || f32(id.y) >= S.velN; }

fn put(id: vec3u, v: vec4f) { textureStore(dst, id.xy, id.z, v); }

fn safe(v: vec3f) -> vec3f {
  // NaN/Inf-Schutz und Obergrenze für die Geschwindigkeit (rad/s).
  if (any(v != v) || any(abs(v) > vec3f(1e4))) { return vec3f(0.0); }
  let l = length(v);
  return select(v, v * (1.5 / l), l > 1.5);
}

// Zelle mit ihren vier Gitternachbarn und einer lokalen Orthonormalbasis.
struct Cell {
  p: vec3f,
  pE: vec3f, pW: vec3f, pN: vec3f, pS: vec3f,
  e1: vec3f, e2: vec3f,
  inv: mat2x2f,     // bildet (fE−fW, fN−fS) auf den Gradienten (in e1/e2) ab
  ax: f32, ay: f32, // 1/Abstand² für den Laplace-Operator
  size: f32,        // mittlere Zellgröße (rad)
};

fn cell(id: vec3u) -> Cell {
  let n = S.velN;
  let st = (vec2f(id.xy) + 0.5) / n;
  let d = 1.0 / n;
  var c: Cell;
  c.p = faceDir(id.z, st);
  c.pE = faceDir(id.z, st + vec2f(d, 0.0));
  c.pW = faceDir(id.z, st - vec2f(d, 0.0));
  c.pN = faceDir(id.z, st + vec2f(0.0, d));
  c.pS = faceDir(id.z, st - vec2f(0.0, d));
  let dA = c.pE - c.pW;
  let dB = c.pN - c.pS;
  c.e1 = normalize(tangent(c.p, dA));
  c.e2 = cross(c.p, c.e1);
  // Zeilen: dA und dB in der lokalen Basis. Gradient g erfüllt M·g = (fE−fW, fN−fS).
  let a = dot(dA, c.e1); let b = dot(dA, c.e2);
  let cc = dot(dB, c.e1); let dd = dot(dB, c.e2);
  let det = a * dd - b * cc;
  // Inverse von [[a, b], [cc, dd]] (WGSL-Matrizen sind spaltenweise).
  c.inv = mat2x2f(vec2f(dd, -cc), vec2f(-b, a)) * (1.0 / det);
  let hx = length(dA) * 0.5;
  let hy = length(dB) * 0.5;
  c.ax = 1.0 / (hx * hx);
  c.ay = 1.0 / (hy * hy);
  c.size = 0.5 * (hx + hy);
  return c;
}

fn grad2(c: Cell, dfA: f32, dfB: f32) -> vec2f { return c.inv * vec2f(dfA, dfB); }
`;
