// Uniform-Layout der Szene (Kamera, Sonne, Regler-Werte); eigene Umsetzung.

// ---------------------------------------------------------------- Bild: gemeinsame Uniforms und Karten
export const UDECL = /* wgsl */`
struct Uf {
  vp: mat4x4f, ivp: mat4x4f,
  m0: vec4f, m1: vec4f, m2: vec4f,       // Planetendrehung (Spalten)
  cam: vec4f,    // Kamera, Zeit
  sun: vec4f,    // Sonnenrichtung, Sonnenstärke
  At: vec4f,     // R, R_oben, H_Rayleigh, H_Mie
  BR: vec4f,     // β_Rayleigh, β_Mie
  BO: vec4f,     // β_Ozon, β_Mie,ext
  Oz: vec4f,     // Ozon-Höhe, -Breite, Mie-g, Schritte
  O: vec4f,      // Original: normalScale, roughness, metalness, ambient
  W: vec4f,      // Wasser: Wellen, Klarheit, Brandung, -
  L: vec4f,      // Land: Relief-Schärfe, Glanz, Feindetail, Terrassen
  L2: vec4f,     // Geländeschatten, Himmelslicht, -, -
  Mq: vec4f,     // Feuchte-Normierung (2), Sonnenlicht (Original), Sonnenradius
  EroRt: vec4f,  // Erosion zur Laufzeit: Stärke, Startfrequenz
  Cl: vec4f,     // Bedeckung, Phase (Zeit/Periode), Wind, Schattenstärke
  Cl2: vec4f,    // Höhe, starre Drehung (Original), Dichte/Deckkraft, Modus
  T: vec4f,      // N Gelände, N Wolken, Meeresspiegel, Sonnenstärke Hintergrund
  Md: vec4f,     // Modus, Palette, Anzeige, Nebel fertig
  Bg: vec4f,     // Nebel, Sterne, N Nebel, -
  Glow: vec4f,
  Fin: vec4f,    // Belichtung, Überstrahlung, Filmkurve, -
  Fl: vec4f,     // Sonne auf dem Bild (uv), Stärke, Seitenverhältnis
  cyc: array<vec4f, 6>,   // Wirbel: Mittelpunkt, Drehwinkel im Zentrum (Vorzeichen = Drehsinn)
  cycB: array<vec4f, 6>,  // Radius, Lebensphase 0..1, Auge (tropischer Wirbelsturm), -
  Gr: vec4f,     // Modul Saum wie Gasriese: Farbe, Stärke (0 = aus)
  Wl: vec4f,     // Baustein Wellen: Stärke (0 = aus), -, -, -
  Sh: vec4f,     // Baustein Geländeschatten: Stärke (0 = aus), -, -, -
  Vk: vec4f,     // Baustein Vulkane: Dichte, Seed, Typ (0 normal, 1 Super), Kraterfüllung (1 Wasser, 0 leer)
  Te: vec4f,     // Baustein Terrassen: Stärke (0 = aus), -, -, -
  Fd: vec4f,     // Baustein Feindetail: Stärke (0 = aus), -, -, -
  Rv: vec4f,     // Baustein Flüsse: Größe Hydro-Karte (0 = aus), Größe Linienkarte (0 = aus), Modus (0 aus, 1 Linien v23, 2 eingegraben, 3 Wasserlinien), -
  Br: vec4f,     // Baustein Brandung: Stärke (0 = aus), -, -, -
}
@group(0) @binding(0) var<uniform> U: Uf;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tHm: texture_2d_array<f32>;
@group(0) @binding(3) var tBiome: texture_2d<f32>;
@group(0) @binding(4) var tCloud: texture_2d_array<f32>;
@group(0) @binding(5) var tNeb: texture_2d_array<f32>;
@group(0) @binding(6) var tTrans: texture_2d<f32>;
@group(0) @binding(7) var tRiver: texture_2d_array<f32>;
@group(0) @binding(8) var tRiverL: texture_2d_array<f32>;   // Flusslinien wie v23
fn modelM() -> mat3x3f { return mat3x3f(U.m0.xyz, U.m1.xyz, U.m2.xyz); }
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f }
// Bildschirmfüllendes Dreieck; uv wie in GL (y nach oben), Texturen werden mit (u, 1 − v) gelesen
@vertex fn vsFull(@builtin(vertex_index) vi: u32) -> VO {
  let p = vec2f(f32((vi << 1u) & 2u), f32(vi & 2u));
  var o: VO;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = p;
  return o;
}
`;
