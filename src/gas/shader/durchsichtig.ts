// Baustein „durchsichtiger Hintergrund“: Ausgabe mit Alpha (Planet 1, Himmel 0, Saum und Ringe nach Helligkeit), Farbe vormultipliziert.
// Für den eingebetteten Gasriesen in der Welt-Schicht; die Seite des Gasriesen nutzt die Aus-Variante (Alpha = 1, wie immer).
export const DURCHSICHTIG = /* wgsl */`
fn hook_ausgabe(c: vec3f, treffer: bool) -> vec4f {
  let a = select(clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0), 1.0, treffer);
  return vec4f(c, a);
}
`;
export const DURCHSICHTIG_AUS = /* wgsl */`
fn hook_ausgabe(c: vec3f, treffer: bool) -> vec4f { return vec4f(c, 1.0); }
`;
