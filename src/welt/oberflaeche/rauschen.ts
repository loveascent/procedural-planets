// 3D-Wertrauschen und fBm (CPU) für die gebackenen Oberflächen. Dreidimensional, damit die Kugel keine Naht und keine Polverzerrung hat.
function hash(x: number, y: number, z: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const glatt = (t: number) => t * t * (3 - 2 * t);

export function rausch3(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = glatt(x - xi), fy = glatt(y - yi), fz = glatt(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

export function fbm3(x: number, y: number, z: number, s: number, oktaven = 5): number {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oktaven; o++) { sum += a * rausch3(x * f, y * f, z * f, s + o * 31); norm += a; a *= 0.5; f *= 2.03; }
  return sum / norm;
}

/** Zellrauschen: Abstand zum nächsten Punkt (Krater, Risse). */
export function zellen3(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let best = 9;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    const cx = xi + dx, cy = yi + dy, cz = zi + dz;
    const px = cx + hash(cx, cy, cz, s), py = cy + hash(cx, cy, cz, s + 1), pz = cz + hash(cx, cy, cz, s + 2);
    const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
