// Partikel nach jasper-r (Gas giant particle sim, 2022): Geburt, Bewegung, Mischen in die Farbtextur, Weichzeichnen, Verblassen.
export const PARTIKEL = /* wgsl */`
// Geburtsort: gleichverteilt auf der Kugel, oder (Anteil S.view.w) in der Kappe um die
// Blickrichtung. So landet die Rechenarbeit dort, wo die Kamera hinschaut.
fn spawnPos(r: vec4f) -> vec3f {
  let inView = fract(r.w * 57.3) < S.view.w;
  let cmin = select(-1.0, 0.1, inView);           // Kappe bis ~84° um die Blickrichtung
  let z = 1.0 - r.x * (1.0 - cmin);
  let phi = r.y * 2.0 * PI;
  let s = sqrt(max(0.0, 1.0 - z * z));
  if (!inView) { return vec3f(s * cos(phi), z, s * sin(phi)); }
  let ax = normalize(S.view.xyz);
  let tb = tangentBasis(ax);
  return normalize(ax * z + (tb[0] * cos(phi) + tb[1] * sin(phi)) * s);
}

fn spawn(i: u32, stagger: bool) -> Particle {
  let r = rand4(i, u32(S.frame) * 747796405u + u32(S.seed * 1000.0));
  let p = spawnPos(r);
  var col: vec3f;
  if (S.mode.x > 0.5) {
    // Partikel-Schiene (jasper-r): Farbe nur aus dem Breitenverlauf, keine Sturm- oder Konvektionsfarbe.
    let w = noised(p * 4.0 + vec3f(S.seed, 0.0, 0.0)).x;
    col = bandAt(latitude(p) + w * S.bandWobble * 0.04) * (0.9 + 0.2 * fract(r.w * 13.1));
  } else {
    col = bandTarget(p) * (0.9 + 0.2 * r.w);
    let sm = stormMask(p, 0.55);
    col = mix(col, sm.rgb, sm.w * clamp(S.stormTint * 0.5, 0.0, 1.0));
    if (fract(r.w * 97.0) < S.convection * 0.003) { col = S.cloud.rgb; }
  }
  let life = S.lifetime * (0.5 + r.z);
  var age = 0.0;
  if (stagger) { age = fract(r.z * 31.7) * life; }
  return Particle(vec4f(p, age), vec4f(life, col));
}

// Partikel bewegen und in die Farbtextur mischen (Verfahren nach jasper-r).
// A = Farbstoff vorher, B = Flussfeld, dst = Farbstoff nachher (vorher per Kopie befüllt).
@compute @workgroup_size(64, 1, 1)
fn moveParticles(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x + gid.y * 65535u * 64u;
  if (f32(i) >= S.particleCount) { return; }
  var pt = parts[i];
  if (pt.info.x <= 0.0) {
    pt = spawn(i, true);
  } else if (pt.pos.w >= pt.info.x && S.lifetime < 60.0) {
    pt = spawn(i, false);
  } else {
    let dt = S.dt;
    var p = pt.pos.xyz;
    let v1 = B(p).xyz;
    let mid = stepOn(p, v1 * dt * 0.5);
    let v2 = B(mid).xyz;
    p = stepOn(p, v2 * dt);
    pt.pos = vec4f(p, pt.pos.w + dt);
  }
  parts[i] = pt;

  let life = max(pt.info.x, 1e-3);
  // Ab Lebensdauer 60 leben Partikel ewig (wie bei Gaseous Giganticus): nur einblenden, nie ausblenden.
  var fade = sin(PI * clamp(pt.pos.w / life, 0.0, 1.0));
  if (S.lifetime >= 60.0) { fade = min(pt.pos.w / 2.0, 1.0); }
  let a = S.opacity * fade;
  let t = dirToTexel(pt.pos.xyz, u32(S.dyeN));
  let old = A(pt.pos.xyz).rgb;
  textureStore(dst, t.xy, t.z, vec4f(mix(old, pt.info.yzw, a), 1.0));
}
`;
