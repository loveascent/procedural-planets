// Baustein Spielball (nur in Bodennähe, S.spieler). Pipeline 'spieler': Kugel aus der Eckpunktnummer (32 × 16 Segmente, 6 Ecken je Feld),
// Mitte und Radius relativ zur Kamera (Uniform Sp, in double auf der CPU gerechnet wie die Mitte des Grasfelds), Ausrichtung Sa/Sb/Sc.
// Kugelparametrisierung: Länge φ = 2π·i/32, Breite θ = π·j/16 − π/2, n = (cosθ·cosφ, sinθ, cosθ·sinφ) – Standard.
// Licht: wie fsGras (gleiche Skala: Sonne = Bestrahlung/π · Regler grasLicht, Himmelslicht nach Normalenhöhe), diffus nach Lambert, matt.
// Streifen: dunkle Bänder um die Ballachse und ein dunkler Fleck am Pol, in Ballkoordinaten (nr = Ausrichtung⁻¹ · Normale), damit das Rollen sichtbar ist.
export const SPIELER = /* wgsl */`
struct SV { @builtin(position) pos: vec4f, @location(0) rel: vec3f, @location(1) n: vec3f }
@vertex fn vsSpieler(@builtin(vertex_index) vi: u32) -> SV {
  var o: SV;
  let quad = vi / 6u;
  var ecken = array<vec2u, 6>(vec2u(0u, 0u), vec2u(1u, 0u), vec2u(0u, 1u), vec2u(0u, 1u), vec2u(1u, 0u), vec2u(1u, 1u));
  let corner = ecken[vi % 6u];
  let i = quad % 32u + corner.x;
  let j = quad / 32u + corner.y;
  let phi = 6.2831853 * f32(i) / 32.0;
  let th = 3.1415927 * f32(j) / 16.0 - 1.5707963;
  let n = vec3f(cos(th) * cos(phi), sin(th), cos(th) * sin(phi));
  let R = mat3x3f(U.Sa.xyz, U.Sb.xyz, U.Sc.xyz);   // Ball → Welt
  let rel = U.Sp.xyz + R * n * U.Sp.w;
  o.pos = U.vpRel * vec4f(rel, 1.0);
  o.rel = rel;
  o.n = R * n;
  return o;
}
@fragment fn fsSpieler(i: SV) -> @location(0) vec4f {
  let M = modelM();
  let L = U.sun.xyz;
  let n = normalize(i.n);
  let R = mat3x3f(U.Sa.xyz, U.Sb.xyz, U.Sc.xyz);
  let nr = transpose(R) * n;                        // Normale in Ballkoordinaten
  let dunkel = 1.0 - smoothstep(0.35, 0.5, abs(sin(nr.y * 9.42478)));   // Band um die y-Achse des Balls (3 Perioden von Pol zu Pol)
  let fleck = smoothstep(0.82, 0.9, nr.z);                                // dunkler Fleck am Pol +z
  let streifen = max(dunkel, fleck);
  let alb = mix(vec3f(0.22), vec3f(0.03), streifen * 0.9);
  let up = M * U.Bp.xyz;
  let muS = dot(U.Bp.xyz, transpose(M) * L);
  let licht = bodenLicht(muS);
  let diff = max(dot(n, L), 0.0);
  return vec4f(alb * (licht.rgb * diff + himmelAmb(licht.a, n, up)), 1.0);
}
`;
