// Würfelkugel-Geometrie (gleiche Seitenbasis wie im Shader), Halbfloat-Umrechnung, HSL. Reine Funktionen.

// Würfel-Kugel-Gitter (gleiche Seitenbasis wie im Shader, Kanten treffen sich exakt)
export const BASIS = [
  [[0, 0, -1], [0, 1, 0], [1, 0, 0]], [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
];
export const faceDirJS = (f, u, v) => {
  const [ex, ey, em] = BASIS[f];
  const s = Math.tan((u * 2 - 1) * Math.PI / 4), t = Math.tan((v * 2 - 1) * Math.PI / 4);
  const x = em[0] + s * ex[0] + t * ey[0], y = em[1] + s * ex[1] + t * ey[1], z = em[2] + s * ex[2] + t * ey[2];
  const l = Math.hypot(x, y, z); return [x / l, y / l, z / l];
};
export const QP = Math.PI / 4;
export function toFaceJS(d) {
  let best = 0, bv = -2;
  for (let f = 0; f < 6; f++) { const em = BASIS[f][2]; const v = em[0] * d[0] + em[1] * d[1] + em[2] * d[2]; if (v > bv) { bv = v; best = f; } }
  return [best, ...faceUvJS(best, d)];
}
export function faceUvJS(f, d) {
  const [ex, ey, em] = BASIS[f];
  const z = em[0] * d[0] + em[1] * d[1] + em[2] * d[2];
  const x = ex[0] * d[0] + ex[1] * d[1] + ex[2] * d[2], y = ey[0] * d[0] + ey[1] * d[1] + ey[2] * d[2];
  return [(Math.atan2(x, z) / QP + 1) / 2, (Math.atan2(y, z) / QP + 1) / 2];
}
const f32h = new Float32Array(1), u32h = new Uint32Array(f32h.buffer);
export function toHalf(v) {
  f32h[0] = v; const x = u32h[0], sgn = (x >>> 16) & 0x8000;
  let e = ((x >>> 23) & 0xff) - 112, m = x & 0x7fffff;
  if (e <= 0) return sgn;
  if (e >= 31) return sgn | 0x7bff;
  return sgn | (e << 10) | (m >>> 13);
}
export const half = (x) => { const e = (x >> 10) & 31, m = x & 1023, sg = x & 32768 ? -1 : 1; return e === 0 ? sg * m * 5.960464477539063e-8 : e === 31 ? sg * 65504 : sg * (1 + m / 1024) * Math.pow(2, e - 15); };
// ------------------------------------------------------------------ Biom-Bild (Original-Algorithmus, 2D-Canvas)
export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (tt) => { tt = (tt + 1) % 1; return tt < 1 / 6 ? p + (q - p) * 6 * tt : tt < 0.5 ? q : tt < 2 / 3 ? p + (q - p) * (2 / 3 - tt) * 6 : p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
