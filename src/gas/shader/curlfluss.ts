// Curl-Noise-Modus: Wirbel nach dem Rezept von Gaseous Giganticus (Cameron; nur Rezept, kein Code) und das Flussfeld aus Jets, Curl-Rauschen, Wirbeln und Stürmen.
export const CURLFLUSS = /* wgsl */`
// Wirbel nach dem Rezept von Gaseous Giganticus: zufällig verteilt, aber nur dort, wo die
// Jets schwach sind (sonst zerreißt die Scherung sie sofort). Drehsinn wie die lokale Scherung,
// Drehprofil ω(d) = ω₀·sin(π·d/r) innerhalb des Radius.
fn curlVortices(p: vec3f) -> vec3f {
  var v = vec3f(0.0);
  let n = u32(S.vortexCount);
  let peak = max(abs(S.jetStrength), 1e-5);
  for (var i = 0u; i < n; i++) {
    let r4 = rand4(i + 17u, u32(S.seed * 1000.0) + 991u);
    let z = r4.x * 1.7 - 0.85;                     // nicht direkt an den Polen
    let phi = r4.y * 2.0 * PI;
    let s = sqrt(1.0 - z * z);
    let c = vec3f(s * cos(phi), z, s * sin(phi));
    let lat = asin(z);
    if (abs(jetAt(lat)) > 0.35 * peak) { continue; }
    let rad = 0.025 + r4.z * 0.05;
    let d = acos(clamp(dot(c, p), -1.0, 1.0));
    if (d >= rad) { continue; }
    // Hintergrund-Wirbelstärke ζ ≈ −∂U/∂φ: Wirbel mit gleichem Vorzeichen überleben in der Scherung.
    let shear = jetAt(lat + 0.01) - jetAt(lat - 0.01);
    let sgn = select(1.0, -1.0, shear > 0.0);
    // Drehtempo aus der Strudel-Stärke (S.mode.y), nicht aus der Jet-Geschwindigkeit
    let omega = sin(PI * d / rad) * S.vortexStrength * S.mode.y / rad * (0.6 + 0.8 * r4.w);
    v += cross(c, p) / max(sin(d), 1e-4) * omega * d * sgn;
  }
  return v;
}

// Flussfeld für den Curl-Noise-Modus: Jets + Curl-Noise + Wirbel + Stürme.
@compute @workgroup_size(8, 8, 1)
fn flowField(@builtin(global_invocation_id) id: vec3u) {
  if (f32(id.x) >= S.flowN || f32(id.y) >= S.flowN) { return; }
  let p = texDir(id, S.flowN);
  var v = east(p) * jetAt(latitude(p));
  v += curlOnSphere(p, S.curlFreq, S.time * S.curlSpeed + S.seed, i32(S.curlOctaves)) * S.curlStrength;
  v += curlVortices(p);
  v += stormFlow(p);
  textureStore(dst, id.xy, id.z, vec4f(tangent(p, v), 0.0));
}
`;
