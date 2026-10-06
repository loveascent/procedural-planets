// Datenlayout der Compute-Aufträge (Parameterplatz je Dispatch); gehört zu gen.js, cloudgen.js, trans.js.

// Parameter für Erzeugungs-Jobs: 10 × vec4 (160 Byte), Kachel in g (Ende) und h (Anfang, Seite, N)
export const JDECL = /* wgsl */`
struct Jb { a: vec4f, b: vec4f, c: vec4f, d: vec4f, e: vec4f, f: vec4f, g: vec4f, h: vec4f,
  v: vec4f,    // v: Baustein Vulkane: Dichte, Seed, Typ, -
  r: vec4f }   // r: Baustein Flüsse: Größe der Hydro-Karte (0 = keine), -, -, -
@group(0) @binding(0) var<uniform> J: Jb;
`;
