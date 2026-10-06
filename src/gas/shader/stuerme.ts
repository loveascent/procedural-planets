// Stürme als Drehfeld und Farbmaske (Gauß-Profil um das Zentrum).
export const STUERME = /* wgsl */`
fn stormW(i: u32) -> f32 { return S.stormWeight[i / 4u][i % 4u]; }

// Drehfeld der angetriebenen Stürme: Rotation um das Zentrum, Gauß-Profil.
fn stormFlow(p: vec3f) -> vec3f {
  var v = vec3f(0.0);
  let n = u32(S.stormCount);
  for (var i = 0u; i < min(n, MAX_STORMS); i++) {
    let c = S.storms[i].xyz;
    let r = S.storms[i].w;
    let d = acos(clamp(dot(c, p), -1.0, 1.0));
    let x = d / r;
    // Geschwindigkeit ~ x·exp(−x²): null im Kern, Maximum am Rand, dann Abfall.
    let prof = x * exp(-x * x) * 2.33;
    v += cross(c, p) / max(sin(d), 1e-4) * prof * S.stormInfo[i].x * stormW(i);
  }
  return v * S.stormStrength;
}

// scale: Maskenradius relativ zum Sturmradius
fn stormMask(p: vec3f, scale: f32) -> vec4f {
  var tint = vec3f(0.0);
  var w = 0.0;
  let n = u32(S.stormCount);
  for (var i = 0u; i < min(n, MAX_STORMS); i++) {
    let c = S.storms[i].xyz;
    let r = S.storms[i].w;
    let d = acos(clamp(dot(c, p), -1.0, 1.0));
    let m = exp(-pow(d / (r * scale), 2.0)) * stormW(i);
    tint += S.stormInfo[i].yzw * m;
    w += m;
  }
  return vec4f(tint / max(w, 1e-4), min(w, 1.0));
}
`;
