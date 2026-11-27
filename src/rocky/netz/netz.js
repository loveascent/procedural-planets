import { BASIS, faceDirJS } from '../logik/wuerfel.js';
import { kachelTaylor, kugelDraussen, mal3 } from '../logik/genau.js';


// Gelände-Netz: Würfelkugel-Gitter, Kachelgitter mit Schürze, Quadtree-Auswahl der Kacheln je Kameraabstand.
// ext: { coarse, device* }  (* = lebender Zustand, per Getter/Setter)
export const INST_F = 32;   // Zahlen je Kachel-Instanz (8 × vec4)
const abstand = (c, e) => Math.hypot(c[0] - e[0], c[1] - e[1], c[2] - e[2]);
const nahZuerst = (liste, ort, e) => liste.map((k) => [k, abstand(ort(k), e)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
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
    // Je Kachel 8 × vec4 (INST_F Zahlen): Seite/u0/v0/Größe, Zentrum relativ zur Kamera + Feinkennung, Zentrum auf der Kugel,
    // Taylor-Ableitungen Ds, Dt, Dss, Dst, Dtt (genau.js, kachelTaylor). Kachelzahl höher, weil die Bodennähe tiefere Stufen braucht.
    const MAXI = 16384;
    const inst = ext.device.createBuffer({ size: MAXI * INST_F * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    return { vb, ib, count: idx.length, G, inst, MAXI, data: new Float32Array(MAXI * INST_F), n: 0 };
  }
  // Quadtree je Würfelseite: teilen, solange die Kachel nah ist; hinter dem Horizont weglassen.
  // Frustum (CDLOD, Strugar 2009, LODSelect): liegt die Hüllkugel einer Kachel außerhalb einer Seitenebene, wird sie mit allen Kindern
  // übersprungen. Ebenen nach Gribb & Hartmann im Planetenraum (genau.js). Ab Stufe FEIN rechnet der Eckpunkt-Shader relativ zur
  // Kachelmitte (RTC): Mitte relativ zur Kamera in double, im Shader nur kleine Versätze.
  // o: { eo (Kamera im Planetenraum), maxDepth, ebenen (oder null), M64 (Planetendrehung double), auge (Welt, double), huelle (Relief-Rand) }
  const SPLIT = coarse ? 3.5 : 6;
  const FEIN = 9;
  function buildPatches(M, o) {
    const { eo, maxDepth, ebenen, M64, auge, huelle } = o;
    const el = Math.hypot(eo[0], eo[1], eo[2]);
    const horizon = 1 / el;
    M.n = 0;
    M.culled = 0;
    const D = M.data;
    const visit = (f, u0, v0, sz, depth) => {
      const c = faceDirJS(f, u0 + sz / 2, v0 + sz / 2);
      const arc = sz * 1.1;   // halbe Diagonale grob in Bogenmaß
      const cosV = (c[0] * eo[0] + c[1] * eo[1] + c[2] * eo[2]) / el;
      if (cosV < horizon - arc - 0.03) return;
      if (ebenen && kugelDraussen(ebenen, c, arc * 1.25 + huelle)) { M.culled++; return; }
      const dist = abstand(c, eo);
      if (depth < maxDepth && dist < arc * SPLIT && M.n < M.MAXI - 4) {
        const h = sz / 2;
        // nächstes Kind zuerst: die Kacheln liegen dann ungefähr von vorn nach hinten im Puffer (früher Tiefentest spart Pixel)
        const kinder = [[u0, v0], [u0 + h, v0], [u0, v0 + h], [u0 + h, v0 + h]];
        for (const [u, v] of nahZuerst(kinder, (k) => faceDirJS(f, k[0] + h / 2, k[1] + h / 2), eo)) visit(f, u, v, h, depth + 1);
        return;
      }
      if (M.n >= M.MAXI) return;
      const b = M.n * INST_F;
      D[b] = f; D[b + 1] = u0; D[b + 2] = v0; D[b + 3] = sz;
      if (depth >= FEIN && M64) {
        const T = kachelTaylor(f, u0, v0, sz);
        const w = mal3(M64, T.c);
        D[b + 4] = w[0] - auge[0]; D[b + 5] = w[1] - auge[1]; D[b + 6] = w[2] - auge[2]; D[b + 7] = 1;
        D.set([...T.c, 0, ...T.Ds, 0, ...T.Dt, 0, ...T.Dss, 0, ...T.Dst, 0, ...T.Dtt, 0], b + 8);
      } else D.fill(0, b + 4, b + INST_F);
      M.n++;
    };
    for (const f of nahZuerst([0, 1, 2, 3, 4, 5], (s) => faceDirJS(s, 0.5, 0.5), eo)) visit(f, 0, 0, 1, 0);
    ext.device.queue.writeBuffer(M.inst, 0, D, 0, M.n * INST_F);
  }
  return { cubeSphere, patchGrid, SPLIT, FEIN, buildPatches };
}
