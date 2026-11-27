// Rechnen in doppelter Genauigkeit (JS-Zahlen) für Kamera, Kacheln und Bodennähe. Reine Funktionen.
// Quellen (CREDITS.md):
//  - Umgekehrte Tiefe: webgpu-samples „reversedZ“ (main.ts, depthRangeRemapMatrix: [10] = −1, [14] = 1, von links an viewProjection),
//    Begründung N. Reed, „Depth Precision Visualized“ (NVIDIA 2015): Gleitkomma-Tiefe + umgekehrtes Z.
//  - Frustum-Ebenen: Gribb & Hartmann, „Fast Extraction of Viewing Frustum Planes from the World-View-Projection Matrix“ (2001),
//    OpenGL-Fassung (Spaltenvektoren M·v): links = Zeile4 + Zeile1, rechts = Zeile4 − Zeile1, unten = Zeile4 + Zeile2, oben = Zeile4 − Zeile2;
//    Normalen zeigen nach innen, nicht normiert.
//  - Relativ zum Zentrum (RTC): D. Ohlarik, „Precisions, Precisions“ (AGI, 2008): großen Versatz in double auf der CPU,
//    in den Shader nur kleine, kamerabezogene Werte.
//  - Ableitungen des Würfelkugel-Punkts je Kachel: zentrale Differenzen (wie SimonDev, ProceduralTerrain_Part10,
//    _ComputeNormal_CentralDifference; Wikipedia „Finite difference“).
import { faceDirJS } from './wuerfel.js';

// Spaltenweise 4×4 als gewöhnliches Array (double). Tiefe 0..1 wie in WebGPU (statt −1..1 in GL)
export function persp64(fovy, aspect, n, f) {
  const tt = 1 / Math.tan(fovy / 2);
  return [tt / aspect, 0, 0, 0, 0, tt, 0, 0, 0, 0, f / (n - f), -1, 0, 0, n * f / (n - f), 0];
}
// Blick von (0,0,0) in Richtung dir: nur Drehung, kein Versatz (Kamera im Ursprung, Welt relativ zur Kamera)
export function blick64(dir, up) {
  const nz = norm([-dir[0], -dir[1], -dir[2]]);
  const x = norm(cross(up, nz)), y = cross(nz, x);
  return [x[0], y[0], nz[0], 0, x[1], y[1], nz[1], 0, x[2], y[2], nz[2], 0, 0, 0, 0, 1];
}
export function mul64(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
// Tiefe umdrehen (webgpu-samples reversedZ): neue Zeile 3 = −Zeile 3 + Zeile 4, d. h. z' = w − z.
export function umgekehrtZ(m) {
  const o = Array.from(m);
  for (let c = 0; c < 4; c++) o[c * 4 + 2] = m[c * 4 + 3] - m[c * 4 + 2];
  return o;
}
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Drehung des Planeten: erst um die eigene Achse (y), dann Achsneigung (z). Spaltenweise 3×3.
export function planetMatrix64(spin, tilt) {
  const c = Math.cos(spin), s = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt);
  const ry = [c, 0, -s, 0, 1, 0, s, 0, c];
  const rz = [ct, st, 0, -st, ct, 0, 0, 0, 1];
  const o = new Array(9);
  for (let col = 0; col < 3; col++) for (let r = 0; r < 3; r++) {
    let v = 0;
    for (let k = 0; k < 3; k++) v += rz[k * 3 + r] * ry[col * 3 + k];
    o[col * 3 + r] = v;
  }
  return o;
}
export const mal3 = (m, v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
export const malT3 = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

// Vier Seitenebenen (links, rechts, unten, oben) aus einer spaltenweisen Matrix C (Gribb & Hartmann, OpenGL-Fassung).
// Zeile i, Spalte j = C[j*4 + i]. Rückgabe: je Ebene [a, b, c, d, |n|].
export function seitenEbenen(C) {
  const z = (i) => [C[i], C[4 + i], C[8 + i], C[12 + i]];
  const r1 = z(0), r2 = z(1), r4 = z(3);
  const e = [
    r4.map((v, i) => v + r1[i]), r4.map((v, i) => v - r1[i]),
    r4.map((v, i) => v + r2[i]), r4.map((v, i) => v - r2[i]),
  ];
  return e.map((p) => [...p, Math.hypot(p[0], p[1], p[2]) || 1]);
}
// Kugel ganz außerhalb einer Ebene? (vorzeichenbehafteter Abstand < −Radius)
export function kugelDraussen(E, c, r) {
  for (const p of E) if ((p[0] * c[0] + p[1] * c[1] + p[2] * c[2] + p[3]) / p[4] < -r) return true;
  return false;
}

// Taylor-Entwicklung 2. Ordnung des Kugelpunkts um die Kachelmitte in Kachelkoordinaten a, b ∈ [−½, ½]
// (zentrale Differenzen mit Schritt ½ über das 3×3-Gitter Ecken/Kanten/Mitte):
//   d(a,b) ≈ pc + Ds·a + Dt·b + ½·Dss·a² + Dst·a·b + ½·Dtt·b²
export function kachelTaylor(f, u0, v0, sz) {
  const P = (i, j) => faceDirJS(f, u0 + i * sz, v0 + j * sz);
  const c = P(0.5, 0.5), xm = P(0, 0.5), xp = P(1, 0.5), ym = P(0.5, 0), yp = P(0.5, 1);
  const mm = P(0, 0), pm = P(1, 0), mp = P(0, 1), pp = P(1, 1);
  const Ds = [0, 1, 2].map((k) => xp[k] - xm[k]);                       // (f(+½) − f(−½)) / (2·½)
  const Dt = [0, 1, 2].map((k) => yp[k] - ym[k]);
  const Dss = [0, 1, 2].map((k) => 4 * (xp[k] - 2 * c[k] + xm[k]));     // (f(+½) − 2f(0) + f(−½)) / ½²
  const Dtt = [0, 1, 2].map((k) => 4 * (yp[k] - 2 * c[k] + ym[k]));
  const Dst = [0, 1, 2].map((k) => pp[k] - pm[k] - mp[k] + mm[k]);      // (f(++) − f(+−) − f(−+) + f(−−)) / (4·½·½)
  return { c, Ds, Dt, Dss, Dst, Dtt };
}
