// Baustein Jets: nur das Breitenkreis-Mittel des Ostwinds wird zum gemessenen Profil gezogen (Wirbel bleiben frei). Breitenkreis-Mittel per Festkomma-Atomics.
// Einhängepunkt: hook_jets. Aus (jetRelax = 0): keine Rückstellung, die Mittelungs-Durchgänge (zonalClear, zonalSum) entfallen.
export const JETS = /* wgsl */`
// ---------- Breitenkreis-Mittel des Ostwinds ----------

@compute @workgroup_size(64, 1, 1)
fn zonalClear(@builtin(global_invocation_id) id: vec3u) {
  if (id.x < ZBINS * 2u) { atomicStore(&zonal[id.x], 0); }
}

fn zbin(p: vec3f) -> u32 { return min(u32((latitude(p) / PI + 0.5) * f32(ZBINS)), ZBINS - 1u); }

var<workgroup> wsum: array<atomic<i32>, 256>;

// Erst je Arbeitsgruppe im schnellen Gruppenspeicher summieren, dann nur die belegten
// Bänder in den globalen Puffer: ~64× weniger konkurrierende globale Atomics.
@compute @workgroup_size(8, 8, 1)
fn zonalSum(@builtin(global_invocation_id) id: vec3u, @builtin(local_invocation_index) li: u32) {
  for (var k = li; k < ZBINS * 2u; k += 64u) { atomicStore(&wsum[k], 0); }
  workgroupBarrier();
  if (!outside(id)) {
    let c = cell(id);
    let u = A(c.p).xyz;
    // Gewicht = Zellfläche, damit kleine Zellen an Würfelkanten nicht überzählen.
    let w = c.size * c.size * S.velN * S.velN;
    let b = zbin(c.p);
    atomicAdd(&wsum[2u * b], i32(dot(u, east(c.p)) * w * ZSCALE));
    atomicAdd(&wsum[2u * b + 1u], i32(w * 1000.0));
  }
  workgroupBarrier();
  for (var k = li; k < ZBINS * 2u; k += 64u) {
    let v = atomicLoad(&wsum[k]);
    if (v != 0) { atomicAdd(&zonal[k], v); }
  }
}

fn zonalMean(p: vec3f) -> f32 {
  // Linear zwischen den Nachbarbändern interpolieren, sonst entstehen Stufen.
  let x = (latitude(p) / PI + 0.5) * f32(ZBINS) - 0.5;
  let i0 = u32(clamp(floor(x), 0.0, f32(ZBINS - 1u)));
  let i1 = min(i0 + 1u, ZBINS - 1u);
  let m0 = f32(atomicLoad(&zonal[2u * i0])) / ZSCALE / max(f32(atomicLoad(&zonal[2u * i0 + 1u])) / 1000.0, 1e-6);
  let m1 = f32(atomicLoad(&zonal[2u * i1])) / ZSCALE / max(f32(atomicLoad(&zonal[2u * i1 + 1u])) / 1000.0, 1e-6);
  return mix(m0, m1, clamp(x - floor(x), 0.0, 1.0));
}
fn hook_jets(u0: vec3f, p: vec3f, dt: f32) -> vec3f {
  var u = u0;
  // Jets: nur das Breitenkreis-Mittel wird zum gemessenen Profil gezogen.
  // Wirbel (Abweichungen vom Mittel) bleiben unberührt und können wachsen.
  let e = east(p);
  u += e * (jetAt(latitude(p)) - zonalMean(p)) * min(S.jetRelax * dt, 1.0);
  return u;
}
`;

export const JETS_AUS = /* wgsl */`
fn hook_jets(u0: vec3f, p: vec3f, dt: f32) -> vec3f { return u0; }
`;
