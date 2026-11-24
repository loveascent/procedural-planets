// Baustein „Argh-Karte“ (Ansatz A: Argh führt, die Strömung verwirbelt): eine feste, hochaufgelöste Referenzkarte (Foto oder Anfangsfarbe)
// wird über eine Rückabbildung M abgetastet, die der Stable-Fluids-Wind mitführt. Die Karte selbst wird nie verschmiert, nur die Abtastrichtung verschoben.
// Quelle: Neyret, „Advected Textures“, SCA 2003 – nicht die Textur, sondern ihre Parametrisierung wird advektiert; sie wird begrenzt, weil sie sonst
//   unbegrenzt gedehnt wird (dort: periodisches Neu-Erzeugen und Überblenden nach der aufgelaufenen Verformung).
// Abweichung (eigene Wahl, hier gemessen): statt Neu-Erzeugen und Überblenden zieht eine Rückstellung die Abbildung mit Rate r zur Identität,
//   wie `bandRelax` den Farbstoff zur Bandfarbe zieht. Ohne Rückstellung wäre die Karte nach wenigen Minuten zu Strichen gezogen.
// Nur der Wirbelanteil des Winds führt die Abbildung (Jet-Profil abgezogen): die Bänder der Karte stehen schon richtig, die Wirbel verformen sie.
// Einhängepunkte: Rechen-Einträge initWarp und advectWarp im Modul „tracers“; Aus = nicht mitkompiliert.
export const WARP = /* wgsl */`
@compute @workgroup_size(8, 8, 1)
fn initWarp(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  textureStore(dst, id.xy, id.z, vec4f(0.0, 0.0, 0.0, 1.0));   // gespeichert wird die Abweichung d = M(x) − x (Identität = 0): klein, daher in 16 Bit genau genug
}

// M(x, t+dt) = M(x − u·dt, t): die Abbildung (als Abweichung vom Ort gespeichert, sonst quantisiert 16 Bit die Abtastrichtung sichtbar) ist ein mitgeführter Skalar, genau wie der Farbstoff (Stam 1999).
@compute @workgroup_size(8, 8, 1)
fn advectWarp(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.dyeN || f32(id.y) >= S.dyeN) { return; }
  let p = texDir(id, S.dyeN);
  let dt = S.dt;
  var u = B(p).xyz;
  u -= east(p) * jetAt(latitude(p)) * select(0.0, 1.0, S.jetRelax > 0.0);   // nur Wirbel, nicht das Jet-Profil
  let src = stepOn(p, -u * S.mode.w * dt);
  var w = src + A(src).xyz;                                                  // M(src) = src + d(src)
  if (any(w != w) || dot(w, w) < 1e-6) { w = p; }
  w = normalize(w);
  w = normalize(mix(w, p, 1.0 - exp(-S.mode.z * dt)));                      // Rückstellung zur Identität
  textureStore(dst, id.xy, id.z, vec4f(w - p, 1.0));
}
`;

// Äquirektangulär-Foto → Referenz-Würfelkarte (linear RGB). Orientierung: Länge λ = atan2(−z, x) wächst nach Osten (wie east() in wuerfel.ts),
// u = λ/2π + ½ (Osten rechts), v = ½ − Breite/π (Norden oben). Das Foto ist rgba8unorm-srgb, die Abtastung liefert schon lineare Werte.
export const FOTO_NACH_WUERFEL = /* wgsl */`
const PI = 3.14159265359;
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var foto: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d_array<rgba16float, write>;
struct Kopf { n: f32 };
@group(0) @binding(3) var<uniform> K: Kopf;

fn faceDir(face: u32, st: vec2f) -> vec3f {
  let a = st.x * 2.0 - 1.0;
  let b = st.y * 2.0 - 1.0;
  switch face {
    case 0u: { return normalize(vec3f(1.0, -b, -a)); }
    case 1u: { return normalize(vec3f(-1.0, -b, a)); }
    case 2u: { return normalize(vec3f(a, 1.0, b)); }
    case 3u: { return normalize(vec3f(a, -1.0, -b)); }
    case 4u: { return normalize(vec3f(a, -b, 1.0)); }
    default: { return normalize(vec3f(-a, -b, -1.0)); }
  }
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= K.n || f32(id.y) >= K.n) { return; }
  let p = faceDir(id.z, (vec2f(id.xy) + 0.5) / K.n);
  let u = atan2(-p.z, p.x) / (2.0 * PI) + 0.5;
  let v = 0.5 - asin(clamp(p.y, -1.0, 1.0)) / PI;
  let c = textureSampleLevel(foto, samp, vec2f(u, v), 0.0).rgb;
  textureStore(dst, id.xy, id.z, vec4f(c, 1.0));
}
`;
