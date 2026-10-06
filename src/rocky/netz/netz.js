import { BASIS, faceDirJS } from '../logik/wuerfel.js';


// Gelände-Netz: Würfelkugel-Gitter, Kachelgitter mit Schürze, Quadtree-Auswahl der Kacheln je Kameraabstand.
// ext: { coarse, device* }  (* = lebender Zustand, per Getter/Setter)
export function createNetz(ext) {
  const { coarse } = ext;
  function cubeSphere(G) {
    const nv = (G + 1) * (G + 1);
    const pos = new Float32Array(6 * nv * 3);
    const idx = new Uint32Array(6 * G * G * 6);
    let vi = 0, ii = 0;
    for (let f = 0; f < 6; f++) {
      const [ex, ey, em] = BASIS[f];
      const base = f * nv;
      for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
        const s = Math.tan((i / G * 2 - 1) * Math.PI / 4), tt = Math.tan((j / G * 2 - 1) * Math.PI / 4);
        const x = em[0] + s * ex[0] + tt * ey[0], y = em[1] + s * ex[1] + tt * ey[1], z = em[2] + s * ex[2] + tt * ey[2];
        const l = Math.hypot(x, y, z);
        pos[vi++] = x / l; pos[vi++] = y / l; pos[vi++] = z / l;
      }
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const a = base + j * (G + 1) + i, b = a + 1, c = a + G + 1, d = c + 1;
        idx[ii++] = a; idx[ii++] = b; idx[ii++] = d;
        idx[ii++] = a; idx[ii++] = d; idx[ii++] = c;
      }
    }
    const vb = ext.device.createBuffer({ size: pos.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    ext.device.queue.writeBuffer(vb, 0, pos);
    const ib = ext.device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    ext.device.queue.writeBuffer(ib, 0, idx);
    return { vb, ib, count: idx.length, G };
  }
  // Ein Kachel-Gitter (PATCH_G² Zellen) mit Schürze rundherum; z = 1 markiert Schürzen-Punkte
  function patchGrid(G) {
    const W = G + 3, pos = new Float32Array(W * W * 3), idx = new Uint32Array((W - 1) * (W - 1) * 6);
    let vi = 0, ii = 0;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const ci = Math.min(Math.max(i - 1, 0), G), cj = Math.min(Math.max(j - 1, 0), G);
      pos[vi++] = ci / G; pos[vi++] = cj / G; pos[vi++] = (i === 0 || j === 0 || i === W - 1 || j === W - 1) ? 1 : 0;
    }
    for (let j = 0; j < W - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx[ii++] = a; idx[ii++] = b; idx[ii++] = d; idx[ii++] = a; idx[ii++] = d; idx[ii++] = c;
    }
    const vb = ext.device.createBuffer({ size: pos.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    ext.device.queue.writeBuffer(vb, 0, pos);
    const ib = ext.device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    ext.device.queue.writeBuffer(ib, 0, idx);
    const MAXI = 6144;
    const inst = ext.device.createBuffer({ size: MAXI * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    return { vb, ib, count: idx.length, G, inst, MAXI, data: new Float32Array(MAXI * 4), n: 0 };
  }
  // Quadtree je Würfelseite: teilen, solange die Kachel nah ist; hinter dem Horizont weglassen.
  // eo = Kamera im Planetenraum, pxK = Bildpunkte pro Bogenmaß im Abstand 1
  const SPLIT = coarse ? 3.5 : 6;
  function buildPatches(M, eo, maxDepth) {
    const el = Math.hypot(eo[0], eo[1], eo[2]);
    const horizon = 1 / el;
    M.n = 0;
    const visit = (f, u0, v0, sz, depth) => {
      const c = faceDirJS(f, u0 + sz / 2, v0 + sz / 2);
      const arc = sz * 1.1;   // halbe Diagonale grob in Bogenmaß
      const cosV = (c[0] * eo[0] + c[1] * eo[1] + c[2] * eo[2]) / el;
      if (cosV < horizon - arc - 0.03) return;
      const dx = eo[0] - c[0], dy = eo[1] - c[1], dz = eo[2] - c[2];
      const dist = Math.hypot(dx, dy, dz);
      if (depth < maxDepth && dist < arc * SPLIT && M.n < M.MAXI - 4) {
        const h = sz / 2;
        visit(f, u0, v0, h, depth + 1); visit(f, u0 + h, v0, h, depth + 1);
        visit(f, u0, v0 + h, h, depth + 1); visit(f, u0 + h, v0 + h, h, depth + 1);
        return;
      }
      if (M.n >= M.MAXI) return;
      M.data.set([f, u0, v0, sz], M.n * 4); M.n++;
    };
    for (let f = 0; f < 6; f++) visit(f, 0, 0, 1, 0);
    ext.device.queue.writeBuffer(M.inst, 0, M.data, 0, M.n * 4);
  }
  return { cubeSphere, patchGrid, SPLIT, buildPatches };
}
