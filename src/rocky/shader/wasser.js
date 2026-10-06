// Quellen (CREDITS.md): Pope & Fry (1997) für die Absorption reinen Wassers; Beer-Lambert-Gesetz. Schelf (flaches, helles Küstenwasser) ist eigene Umsetzung.
// Baustein Wasserkörper (Tiefenfarbe): Absorption nach Tiefe, Meeresboden scheint im Flachen durch. Einhängepunkt: hook_wasserkoerper.
export const WASSER = /* wgsl */`
struct WasserOut { body: vec3f, deep: vec3f }
fn hook_wasserkoerper(F: Face, N: f32, sea: f32, depth: f32, inland: bool, nW: vec3f, Vl: vec3f, muS: f32, mois: f32, pal: i32, Esh: vec3f, klarheit: f32) -> WasserOut {
    let T = vec4f(0.0, mois, 0.0, 0.0);
    // Schelf: in Küstennähe (geglättete Höhe nahe am Meeresspiegel) bleibt das Wasser flach und hell
    let hB = 0.5 * (texFaceLod(tHm, F, N, max(log2(N / 96.0), 0.0)).x + texFaceLod(tHm, F, N, max(log2(N / 256.0), 0.0)).x);
    let dEff = select(min(depth, max(sea - hB, 0.0) * 0.7 + depth * 0.1), depth * 0.6, inland);
    let z = dEff * 2500.0;
    let kap = vec3f(0.45, 0.065, 0.021) / max(klarheit, 0.05);
    let muV = max(dot(nW, Vl), 0.05);
    let muL = max(muS, 0.05);
    let Tz = exp(-kap * z * (1.0 / muV + 1.0 / muL));
    var deep = vec3f(0.004, 0.014, 0.034);
    var bed = vec3f(0.55, 0.49, 0.36);
    if (pal == 0) {
      let tint = toLin(biome(vec2f(T.y, max(sea - 0.02, 0.0))));
      deep = mix(deep, tint * 0.06, 0.45);
      bed = toLin(biome(vec2f(T.y, sea + 0.01))) * 0.9;
    }
    let body = (bed * Tz + deep * (1.0 - Tz)) * Esh * max(muS, 0.0) / PI;
    return WasserOut(body, deep);
}
`;

// Wasserkörper AUS: einfache, dunkle Wasserfarbe ohne Tiefe, ohne Schelf, ohne Palette (Aussehen ändert sich beim Ausschalten).
export const WASSER_AUS = /* wgsl */`
struct WasserOut { body: vec3f, deep: vec3f }
fn hook_wasserkoerper(F: Face, N: f32, sea: f32, depth: f32, inland: bool, nW: vec3f, Vl: vec3f, muS: f32, mois: f32, pal: i32, Esh: vec3f, klarheit: f32) -> WasserOut {
  let deep = vec3f(0.004, 0.014, 0.034);
  return WasserOut(deep * Esh * max(muS, 0.0) / PI, deep);
}
`;
