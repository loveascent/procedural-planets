// Gemeinsame Daten aller Compute-Shader: Konstanten und das Uniform-Layout `Sim` (muss zu OFF_* in gas/zustand.ts passen).
export const STRUKTUR = /* wgsl */`
// Gemeinsame Bausteine für alle Compute-Shader.
// Alle Felder liegen als Cubemap (6 Ebenen) auf der Einheitskugel.
// Vektoren (Wind) werden als 3D-Tangentialvektoren in Körperkoordinaten gespeichert,
// dadurch gibt es keine Pol-Singularität und keine Sonderfälle an Würfelkanten.

const PI = 3.14159265359;
const MAX_STORMS = 16u;

struct Sim {
  dt: f32, time: f32, frame: f32, velN: f32,
  dyeN: f32, flowN: f32, vortexStrength: f32, omega: f32,
  jetStrength: f32, jetRelax: f32, turbulence: f32, turbScale: f32,
  confinement: f32, drag: f32, fineStripes: f32, bfecc: f32,
  bandRelax: f32, convection: f32, stormStrength: f32, stormCount: f32,
  curlStrength: f32, curlFreq: f32, curlSpeed: f32, curlOctaves: f32,
  particleCount: f32, lifetime: f32, opacity: f32, blur: f32,
  seed: f32, bandWobble: f32, stormTint: f32, vortexCount: f32,
  cloud: vec4f,                 // Farbe aufsteigender Konvektionswolken (linear RGB)
  centre: vec4f,                // Partikel-Schiene: rgb Mittelfarbe, zu der die Textur verblasst; w Verblass-Rate (1/s)
  view: vec4f,                  // xyz Kamerarichtung in Körperkoordinaten, w Anteil der Partikel im Sichtfeld
  mode: vec4f,                  // x 1 = reine Partikel (jasper-r), y Strudel-Antrieb (Geschwindigkeit), zw frei
  jets: array<vec4f, 16>,       // 64 Stützstellen, Breite −90°..+90°, Einheit rad/s bei jetStrength 1
  bands: array<vec4f, 64>,      // Bandfarbe (linear RGB) je Breite
  storms: array<vec4f, 16>,     // xyz Zentrum (Körperkoordinaten), w Radius in rad
  stormInfo: array<vec4f, 16>,  // x Drehsinn·Stärke, yzw Farbe
  stormWeight: array<vec4f, 4>, // wie stark jeder Sturm gerade angetrieben wird (0 = frei)
};

@group(0) @binding(0) var<uniform> S: Sim;
`;
