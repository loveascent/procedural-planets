// Farbstoff und Partikel: Bindungen, Partikel-Struktur, Abtastung (A = Farbstoff, B = Wind/Fluss), Texeltrichtung.
export const TRACER_BASIS = /* wgsl */`
// Sichtbare Wolkenfelder: Farbstoff-Advektion, Curl-Noise-Flussfeld und Partikel.

@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var srcA: texture_cube<f32>;
@group(0) @binding(3) var srcB: texture_cube<f32>;
@group(0) @binding(4) var dst: texture_storage_2d_array<rgba16float, write>;

struct Particle {
  pos: vec4f,   // xyz Richtung auf der Kugel, w Alter
  info: vec4f,  // x Lebensdauer, yzw Farbe
};
@group(0) @binding(5) var<storage, read_write> parts: array<Particle>;

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

fn texDir(id: vec3u, n: f32) -> vec3f { return faceDir(id.z, (vec2f(id.xy) + 0.5) / n); }

// Pflege-Ziel (farbstoff.ts pflegeZiel, jeden Schritt neu): x = Band-Mäander-Rauschen.
// Glattes Gradientenrauschen (Gitterabstand 1/4 auf der Einheitskugel, bei 768/8 ~15 Ziel-Texel je Zelle), daher auf
// Farbstoff-Auflösung/8 bilinear abtastbar (gemessen 26.11.: Bild gleich, s. Bericht Teilauftrag 2); nicht nahtlos gefiltert, an Würfelkanten höchstens ein halbes Ziel-Texel Versatz.
@group(0) @binding(8) var zielTex: texture_cube<f32>;
fn Z(d: vec3f) -> vec4f { return textureSampleLevel(zielTex, samp, d, 0.0); }
// Bandfarbe (hook_streifen) über der Breite als Tabelle: 4096 Einträge auf [-LUT_L, LUT_L]; Rand LUT_L = π/2 + 0,25
// deckt den größten Mäander-Versatz ab (bandWobble ≤ 6 im Menü · 0,04 = 0,24).
@group(0) @binding(9) var lutTex: texture_2d_array<f32>;
const LUT_N = 4096.0;
const LUT_L = 1.82079632679;
fn bandLutAt(lat: f32) -> vec3f { return textureSampleLevel(lutTex, samp, vec2f((lat + LUT_L) / (2.0 * LUT_L), 0.5), 0, 0.0).rgb; }
`;
