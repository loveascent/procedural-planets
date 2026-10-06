// Baustein Ansichten: Farbe einer Stelle je nach angezeigtem Feld (Wolken, Wind, Wirbelstärke, Druck). Aus: nur die Wolkenfarbe. Funktion: surface.
export const ANSICHTEN = /* wgsl */`
fn diverging(v: f32) -> vec3f {
  let t = clamp(v, -1.0, 1.0);
  let neg = vec3f(0.15, 0.45, 0.95);
  let pos = vec3f(0.95, 0.35, 0.15);
  return mix(vec3f(0.06), select(neg, pos, t > 0.0), abs(t));
}

// Farbe einer Stelle auf der Kugel je nach Ansicht.
fn surface(q: vec3f, mode: i32) -> vec3f {
  let fs = U.p3.x;
  if (mode == 1) {
    let v = textureSampleLevel(velTex, samp, q, 0.0).xyz;
    let tb = mat2x3f(east(q), cross(q, east(q)));
    let e = dot(v, tb[0]) * fs;
    let n = dot(v, tb[1]) * fs;
    return vec3f(0.5 + 0.5 * clamp(e, -1.0, 1.0), 0.5 + 0.5 * clamp(n, -1.0, 1.0), 0.6) * min(1.0, length(vec2f(e, n)) * 1.5 + 0.15);
  }
  if (mode == 2) { return diverging(textureSampleLevel(auxTex, samp, q, 0.0).x * fs * 0.015); }
  // Gespeichert ist die Druckkorrektur pro Schritt (Δt·P); P ≈ f·U·L, daher Skala 60·fs²/4.
  if (mode == 3) { return diverging(textureSampleLevel(prsTex, samp, q, 0.0).x * 60.0 * fs * fs * 0.25); }
  return textureSampleLevel(dyeTex, samp, q, 0.0).rgb;
}
`;

export const ANSICHTEN_AUS = /* wgsl */`
fn surface(q: vec3f, mode: i32) -> vec3f { return textureSampleLevel(dyeTex, samp, q, 0.0).rgb; }
`;
