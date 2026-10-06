// Gemeinsame Uniform-Struktur aller Welt-Shader. Alle Positionen sind relativ zur Kamera (Auge im Ursprung, Float64 → Float32 vorher).
export const U_BYTES = 16 * 4 + 5 * 16 + 64 * 16;
export const MAX_KUGELN = 64;

export const UNIFORMEN = /* wgsl */`
struct U {
  vp: mat4x4f,
  rechts: vec4f,      // xyz, w = tan(fov/2)
  oben: vec4f,        // xyz, w = Seitenverhältnis
  vor: vec4f,         // xyz, w = Zeit (Sekunden)
  sonne: vec4f,       // xyz relativ zur Kamera, w = Sonnenradius
  pix: vec4f,         // x = Pixel pro Radiant (Höhe/fov), y = Anzahl Kugeln für Schatten
  kugeln: array<vec4f, 64>,   // xyz relativ zur Kamera, w = Radius (0 = ausgelassen)
};
@group(0) @binding(0) var<uniform> u: U;
`;
