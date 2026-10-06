
// Schichtvulkane (für Karte und Bild gemeinsam). Profil wie Fuji/Mayon: nach innen gewölbte Flanken
// v = (e^(−k·t) − e^(−k)) / (1 − e^(−k)), im Krater eine Schüssel unter dem Rand. Höchstens ein Vulkan je Zelle
// eines 3D-Gitters (Worley-artig), Größe und Höhe zufällig. Liegt einer im Meer, wird er zur Vulkaninsel.
export const VOLC = /* wgsl */`
fn volcCell(c: vec3f, seed: f32) -> vec4f {
  let hp = hash33(c + vec3f(seed * 0.0131, 7.1, 3.3));
  return vec4f(normalize(c + 0.15 + 0.7 * hp), hp.x);
}
fn volcanoes(d: vec3f, dens: f32, seed: f32, sup: f32) -> vec4f {
  let ip = floor(d * mix(11.0, 5.0, sup));
  var o = vec4f(0.0);
  let k = 3.0;
  let ek = exp(-k);
  for (var z = -1; z <= 1; z++) { for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let c = ip + vec3f(f32(x), f32(y), f32(z));
    let hq = hash33(c * 1.31 + vec3f(1.7, seed * 0.0071, 9.2));
    if (hq.x > dens * 0.3) { continue; }
    let cc = volcCell(c, seed).xyz;
    let R = (0.012 + 0.014 * hq.y) * mix(1.0, 3.5, sup);
    let H = (0.18 + 0.17 * hq.z) * mix(1.0, 0.8, sup);                 // Höhe ≈ Radius/5 wie bei echten Schichtvulkanen (bei Relief ×0,018)
    let dv = d - cc;
    let r = length(dv);
    if (r >= R) { continue; }
    let t = r / R;
    let tc = (0.2 + 0.08 * hq.y) * mix(1.0, 1.9, sup);   // Supervulkan: breite Caldera
    var v: f32;
    var dvdt: f32;
    if (t >= tc) {
      v = (exp(-k * t) - ek) / (1.0 - ek);
      dvdt = -k * exp(-k * t) / (1.0 - ek);
    } else {
      let vr = (exp(-k * tc) - ek) / (1.0 - ek);
      let s = t / tc;
      v = vr - 0.28 * (1.0 - s * s);
      dvdt = 0.56 * s / tc;
    }
    o += vec4f(H * v, (H * dvdt / R) * dv / max(r, 1e-5));
  } } }
  return o;
}
// 1 im Krater eines Vulkans, sonst 0
fn volcCrater(d: vec3f, dens: f32, seed: f32, sup: f32) -> f32 {
  let ip = floor(d * mix(11.0, 5.0, sup));
  var m = 0.0;
  for (var z = -1; z <= 1; z++) { for (var y = -1; y <= 1; y++) { for (var x = -1; x <= 1; x++) {
    let c = ip + vec3f(f32(x), f32(y), f32(z));
    let hq = hash33(c * 1.31 + vec3f(1.7, seed * 0.0071, 9.2));
    if (hq.x > dens * 0.3) { continue; }
    let R = (0.012 + 0.014 * hq.y) * mix(1.0, 3.5, sup);
    let tc = (0.2 + 0.08 * hq.y) * mix(1.0, 1.9, sup);
    let r = length(d - volcCell(c, seed).xyz);
    m = max(m, 1.0 - smoothstep(tc * R * 0.9, tc * R * 1.25, r));
  } } }
  return m;
}

// Einhängepunkte: Höhenerzeugung (gen) und Bild (scene) kennen nur diese beiden Namen, nie die Vulkan-Funktionen selbst.
fn hook_vulkan_hoehe(d: vec3f, dens: f32, seed: f32, sup: f32) -> vec4f { return volcanoes(d, dens, seed, sup); }
fn hook_vulkan_krater(d: vec3f, dens: f32, seed: f32, sup: f32) -> f32 { return volcCrater(d, dens, seed, sup); }
`;

// Vulkane AUS: gleiche Einhängepunkte, kein Vulkan-Code (kein Rauschen, keine Schleifen). Wird statt VOLC mitkompiliert.
export const VOLC_AUS = /* wgsl */`
fn hook_vulkan_hoehe(d: vec3f, dens: f32, seed: f32, sup: f32) -> vec4f { return vec4f(0.0); }
fn hook_vulkan_krater(d: vec3f, dens: f32, seed: f32, sup: f32) -> f32 { return 0.0; }
`;
