// Baustein Ringe: Dichteprofil mit Cassini-Lücke und Feinstruktur (Ringfäden, nach Pixelgröße ausgeblendet), Ringe vor/hinter dem Planeten, Ringschatten auf dem Planeten. Einhängepunkte: hook_ringe, hook_ringschatten.
export const RINGE = /* wgsl */`
fn smoothHash(x: f32, salt: f32) -> f32 {
  let i = floor(x);
  let f = fract(x);
  return mix(hash21(vec2f(i, salt)), hash21(vec2f(i + 1.0, salt)), f * f * (3.0 - 2.0 * f));
}

// footprint: Breite eines Bildschirmpixels auf der Ringebene (in Planetenradien).
// Feinstruktur, die schmaler als ein Pixel ist, wird ausgeblendet statt zu flimmern.
fn ringDensity(r: f32, footprint: f32) -> f32 {
  let inner = U.p1.y; let outer = U.p1.z;
  if (r < inner || r > outer || outer <= inner) { return 0.0; }
  let x = (r - inner) / (outer - inner);
  // Grobe Struktur: dichter Hauptring, Lücke wie die Cassini-Teilung, schwacher Außenring.
  var d = smoothstep(0.0, 0.08, x) * (1.0 - smoothstep(0.93, 1.0, x));
  d *= mix(0.35, 1.0, smoothstep(0.18, 0.35, x));
  d *= 1.0 - 0.9 * (smoothstep(0.60, 0.62, x) - smoothstep(0.66, 0.68, x));
  d *= 1.0 - 0.6 * (smoothstep(0.86, 0.865, x) - smoothstep(0.87, 0.875, x));
  let span = footprint / (outer - inner);
  let fineW = 1.0 - smoothstep(0.5 / 420.0, 2.0 / 420.0, span);
  let coarseW = 1.0 - smoothstep(0.5 / 90.0, 2.0 / 90.0, span);
  let fine = mix(0.5, smoothHash(x * 420.0, 3.0), fineW) * 0.5 + mix(0.5, smoothHash(x * 90.0, 7.0), coarseW) * 0.5;
  d *= mix(1.0, fine * 1.4 + 0.3 * (1.0 - fineW), U.ringColor.w);
  return clamp(d, 0.0, 1.0) * U.p1.w;
}
fn hook_ringschatten(light0: f32, hp: vec3f, sun: vec3f) -> f32 {
  var light = light0;
  if (U.p1.w > 0.0 && abs(sun.y) > 1e-4) {
    let tr = -hp.y / sun.y;
    if (tr > 0.0) {
      let rp = hp + sun * tr;
      light *= 1.0 - 0.85 * ringDensity(length(rp.xz), 0.02);
    }
  }
  return light;
}
fn hook_ringe(col0: vec3f, o: vec3f, d: vec3f, sun: vec3f, tPlanet: f32, mode: i32) -> vec3f {
  var col = col0;
  if (U.p1.w > 0.0 && abs(d.y) > 1e-5 && mode == 0) {
    let tr = -o.y / d.y;
    if (tr > 0.0 && (tPlanet < 0.0 || tr < tPlanet)) {
      let rp = o + d * tr;
      let footprint = tr * U.p3.y / max(abs(d.y), 0.02);
      let dens = ringDensity(length(rp.xz), footprint);
      if (dens > 0.0) {
        var lit = 0.35 + 0.65 * abs(sun.y);
        if (hitPlanet(rp + sun * 1e-3, sun) > 0.0) { lit *= 0.08; }
        let rc = U.ringColor.rgb * lit * U.sun.w;
        col = mix(col, rc, dens);
      }
    }
  }
  return col;
}
`;

export const RINGE_AUS = /* wgsl */`
fn hook_ringschatten(light0: f32, hp: vec3f, sun: vec3f) -> f32 { return light0; }
fn hook_ringe(col0: vec3f, o: vec3f, d: vec3f, sun: vec3f, tPlanet: f32, mode: i32) -> vec3f { return col0; }
`;
