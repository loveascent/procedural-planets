// Quelle (CREDITS.md): Quilez, Domain Warping. Hilfe der Flüsse (Mäander); stand früher in volc.js, gehört aber nicht zu den Vulkanen.

export const HYDRO_WARP = /* wgsl */`
// Mäander: Flusskarte an leicht verbogener Stelle lesen (Domain Warping, Quilez); stetig, also keine Brüche
fn hydroWarp(d: vec3f) -> vec3f {
  let w = vec3f(snoise(d * 90.0 + 11.0), snoise(d * 90.0 + 37.0), snoise(d * 90.0 + 71.0)) * 0.0035
        + vec3f(snoise(d * 260.0 + 5.0), snoise(d * 260.0 + 19.0), snoise(d * 260.0 + 43.0)) * 0.0009;
  return normalize(d + w - d * dot(w, d));
}
`;
