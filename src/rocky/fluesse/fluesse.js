import { clamp } from '../logik/zufall.js';
import { half, toHalf, toFaceJS, faceUvJS, faceDirJS, QP } from '../logik/wuerfel.js';

// Flüsse und Seen des Gesteinsplaneten: v23-Linien (Priority-Flood + Abflussakkumulation, Maske mit Mipmaps) und Hydrologie-Karte (v24).
// Alles Fremde kommt über `ext` herein: lebende GPU-Objekte und Zustände (device, P, moistQ, genToken, seaH) als Getter,
// feste Dinge (S, RS, Hilfsfunktionen) als Werte. Dieser Baustein kennt Menü, Kamera und Wolken nicht.
// ext: { S, RS, coarse, mipLevels, tagged, makeCtx, dispatch, genParams, genBG, tileParams, device, P, moistQ, genToken, seaH }
// ------------------------------------------------------------------ Flüsse und Seen
// Hydrologie in vier Schritten, alles aus der Höhenkarte selbst (nichts gemalt):
//  1. Senken füllen (Priority-Flood, Barnes et al. 2014): jede Zelle hat einen Weg bergab zum Meer;
//     was in einer Senke steht (Krater, Becken), wird zum See mit ebenem Spiegel.
//  2. Abfluss sammeln (O'Callaghan & Mark 1984): Regen aus Feuchte, kein Abfluss aus Eis (Pole, Gipfel).
//  3. Hydraulische Geometrie (Leopold & Maddock 1953): Breite ~ Q^0,5, Tiefe ~ Q^0,4.
//  4. Tal eingraben: Eintiefung (r) und Wasserspiegel (g) als Karte. Die Höhenkarte zieht r ab, das Bild
//     zeigt Wasser, wo die echte Höhe unter dem Spiegel liegt – das Ufer entsteht pixelgenau aus dem Gelände.
export function createFluesse(ext) {
  const { S, RS, coarse, mipLevels, tagged, makeCtx, dispatch, genParams, genBG, tileParams } = ext;
  let riverToken = 0;
  // Flüsse wie in v23 (unverändert übernommen): Linien aus Priority-Flood + Abflussakkumulation, weiche Maske mit Mipmaps
  
  async function buildRiverLines() {
  
    if (!ext.device || !RS.river || S.style === 'orig') return;
  
    const token = ++riverToken;
  
    if (S.rivers !== 1 && S.rivers !== 3) { RS.nRiver = 0; return; }
  
    const n = coarse ? 256 : 512, NR = coarse ? 1024 : 2048;
  
    const mode = 1, ero = S.erosion;
  
    // 1) Höhen auf der GPU erzeugen und zurücklesen
  
    const tx = ext.device.createTexture({ size: [n, n, 6], format: 'rgba16float', usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC });
  
    const bg = genBG(tx.createView({ dimension: '2d-array' }));
  
    const enc = ext.device.createCommandEncoder();
  
    const ctx = makeCtx(enc);
  
    for (let f = 0; f < 6; f++) dispatch(ctx, ext.P.gen, bg, tileParams(genParams(mode, n, ero), f, 0, 0, n, n, n), n / 8, n / 8);
  
    const rb = ext.device.createBuffer({ size: n * 8 * n * 6, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  
    enc.copyTextureToBuffer({ texture: tx }, { buffer: rb, bytesPerRow: n * 8, rowsPerImage: n }, [n, n, 6]);
  
    ext.device.queue.submit([enc.finish()]);
  
    await rb.mapAsync(GPUMapMode.READ);
  
    const hb = new Uint16Array(rb.getMappedRange().slice(0));
  
    rb.unmap(); rb.destroy(); tx.destroy();
  
    if (token !== riverToken) return;
  
    const C = 6 * n * n, sea = ext.seaH;
  
    const H = new Float32Array(C), rain = new Float32Array(C);
  
    for (let i = 0; i < C; i++) { H[i] = half(hb[i * 4]); rain[i] = 0.4 + clamp((half(hb[i * 4 + 1]) - ext.moistQ[0]) / (ext.moistQ[1] - ext.moistQ[0] + 1e-6), 0, 1.2); }
  
    const n1 = n - 1;
  
    const idx = (f, i, j) => (f * n + j) * n + i;
  
    // Nachbar über Seitenkanten hinweg: Richtung bilden, zur passenden Seite zurückrechnen
  
    const nb = (f, i, j, di, dj) => {
  
      const a = i + di, b = j + dj;
  
      if (a >= 0 && a <= n1 && b >= 0 && b <= n1) return idx(f, a, b);
  
      const [g, u, v] = toFaceJS(faceDirJS(f, a / n1, b / n1));
  
      return idx(g, clamp(Math.round(u * n1), 0, n1), clamp(Math.round(v * n1), 0, n1));
  
    };
  
    // 2) Priority-Flood mit Binärheap; jede Zelle fließt zu der Zelle, von der aus sie erreicht wurde
  
    const hk = new Float32Array(C + 8), hv = new Int32Array(C + 8);
  
    let hn = 0;
  
    const push = (k, v) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  
    const pop = () => { const v = hv[0], k = hk[--hn], x = hv[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = k; hv[i] = x; return v; };
  
    const down = new Int32Array(C).fill(-2), fill = new Float32Array(C), order = new Int32Array(C);
  
    let seeds = 0;
  
    for (let c = 0; c < C; c++) if (H[c] < sea) { down[c] = -1; fill[c] = H[c]; push(H[c], c); seeds++; }
  
    if (!seeds) { let m = 0; for (let c = 1; c < C; c++) if (H[c] < H[m]) m = c; down[m] = -1; fill[m] = H[m]; push(H[m], m); }
  
    let on = 0;
  
    const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
  
    while (hn) {
  
      const c = pop();
  
      order[on++] = c;
  
      const f = (c / (n * n)) | 0, r = c - f * n * n, j = (r / n) | 0, i = r - j * n;
  
      for (let k = 0; k < 8; k++) {
  
        const q = nb(f, i, j, DI[k], DJ[k]);
  
        if (down[q] !== -2) continue;
  
        down[q] = c;
  
        fill[q] = Math.max(H[q], fill[c] + 1e-7);
  
        push(fill[q], q);
  
      }
  
    }
  
    // 3) Abfluss sammeln (von oben nach unten), Hauptzufluss merken
  
    const acc = new Float32Array(C), up = new Int32Array(C).fill(-1);
  
    for (let c = 0; c < C; c++) if (H[c] >= sea) acc[c] = rain[c];
  
    for (let k = on - 1; k >= 0; k--) {
  
      const c = order[k], d = down[c];
  
      if (d < 0 || H[c] < sea) continue;
  
      acc[d] += acc[c];
  
      if (up[d] < 0 || acc[c] > acc[up[d]]) up[d] = c;
  
    }
  
    if (token !== riverToken) return;
  
    // 4) Maske zeichnen: quadratische Bézier-Kurven durch die Kantenmitten, Breite ~ √Abfluss
  
    const T = C * 0.00015 / Math.max(S.riverAmount, 0.05), sc = (NR - 1) / n1;
  
    const mask = new Uint8Array(6 * NR * NR);
  
    const jit = (c) => { const x = Math.sin(c * 12.9898) * 43758.5453, y = Math.sin(c * 78.233) * 12345.6789; return [(x - Math.floor(x) - 0.5) * 0.7, (y - Math.floor(y) - 0.5) * 0.7]; };
  
    const posOn = (f, c) => {
  
      const g = (c / (n * n)) | 0, r = c - g * n * n, j = (r / n) | 0, i = r - j * n;
  
      const J = jit(c);
  
      if (g === f) return [(i + J[0]) * sc, (j + J[1]) * sc];
  
      const [u, v] = faceUvJS(f, faceDirJS(g, i / n1, j / n1));
  
      return [u * n1 * sc, v * n1 * sc];
  
    };
  
    const stamp = (f, x, y, w) => {
  
      const R = Math.ceil(w + 1.5), base = f * NR * NR;
  
      const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(NR - 1, Math.ceil(x + R));
  
      const y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(NR - 1, Math.ceil(y + R));
  
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
  
        const v = clamp(w + 0.5 - Math.hypot(px - x, py - y), 0, 1) * 255;
  
        const o = base + py * NR + px;
  
        if (v > mask[o]) mask[o] = v;
  
      }
  
    };
  
    const wK = NR / 2048;
  
    for (let c = 0; c < C; c++) {
  
      if (H[c] < sea || acc[c] < T || down[c] < 0) continue;
  
      const f = (c / (n * n)) | 0;
  
      const Pc = posOn(f, c), Pd = posOn(f, down[c]);
  
      const u = up[c];
  
      const Pa = u >= 0 && acc[u] >= T ? posOn(f, u) : Pc;
  
      const A = [(Pa[0] + Pc[0]) / 2, (Pa[1] + Pc[1]) / 2], B = [(Pc[0] + Pd[0]) / 2, (Pc[1] + Pd[1]) / 2];
  
      const w0 = clamp(0.55 * Math.sqrt(acc[c] / T), 0.7, 5) * wK;
  
      const w1 = clamp(0.55 * Math.sqrt(acc[down[c]] / T), 0.7, 5) * wK;
  
      const len = Math.hypot(A[0] - Pc[0], A[1] - Pc[1]) + Math.hypot(B[0] - Pc[0], B[1] - Pc[1]);
  
      const steps = Math.max(2, Math.ceil(len / 0.7));
  
      for (let s = 0; s <= steps; s++) {
  
        const t = s / steps, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), e = t * t;
  
        stamp(f, a * A[0] + b * Pc[0] + e * B[0], a * A[1] + b * Pc[1] + e * B[1], w0 + (w1 - w0) * t * 0.5);
  
      }
  
    }
  
    if (token !== riverToken) return;
  
    // 5) Hochladen mit Mipmaps (2×2-Mittel auf der CPU)
  
    const levels = mipLevels(NR);
  
    const tex = tagged(ext.device.createTexture({ size: [NR, NR, 6], format: 'r8unorm', mipLevelCount: levels, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }));
  
    let cur = mask, m = NR;
  
    for (let l = 0; l < levels; l++) {
  
      const bpr = Math.max(256, m);
  
      for (let f = 0; f < 6; f++) {
  
        let data = cur.subarray(f * m * m, (f + 1) * m * m);
  
        if (bpr !== m) { const pad = new Uint8Array(bpr * m); for (let y = 0; y < m; y++) pad.set(data.subarray(y * m, y * m + m), y * bpr); data = pad; }
  
        ext.device.queue.writeTexture({ texture: tex, mipLevel: l, origin: [0, 0, f] }, data, { bytesPerRow: bpr, rowsPerImage: m }, [m, m, 1]);
  
      }
  
      if (m === 1) break;
  
      const h2 = m >> 1, nx = new Uint8Array(6 * h2 * h2);
  
      for (let f = 0; f < 6; f++) for (let y = 0; y < h2; y++) for (let x = 0; x < h2; x++) {
  
        const o = f * m * m + 2 * y * m + 2 * x;
  
        nx[f * h2 * h2 + y * h2 + x] = (cur[o] + cur[o + 1] + cur[o + m] + cur[o + m + 1] + 2) >> 2;
  
      }
  
      cur = nx; m = h2;
  
    }
  
    const old = RS.river;
  
    RS.river = tex; RS.nRiver = NR;
  
    if (old) setTimeout(() => old.destroy(), 500);
  
  }
  
  
  
  async function buildHydro(token) {
  
    RS.nHydro = 0; RS.hydro = RS.hydroNone;
  
    if (S.style === 'orig') return;
  
    const n = coarse ? 256 : 512, NH = coarse ? 512 : 1024;
  
    // 1) Höhen (mit Vulkanen und Erosion, ohne Täler) auf der GPU erzeugen und zurücklesen
  
    const tx = ext.device.createTexture({ size: [n, n, 6], format: 'rgba16float', usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC });
  
    const bg = genBG(tx.createView({ dimension: '2d-array' }));
  
    const enc = ext.device.createCommandEncoder();
  
    const ctx = makeCtx(enc);
  
    for (let f = 0; f < 6; f++) dispatch(ctx, ext.P.gen, bg, tileParams(genParams(1, n, S.erosion), f, 0, 0, n, n, n), n / 8, n / 8);
  
    const rb = ext.device.createBuffer({ size: n * 8 * n * 6, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  
    enc.copyTextureToBuffer({ texture: tx }, { buffer: rb, bytesPerRow: n * 8, rowsPerImage: n }, [n, n, 6]);
  
    ext.device.queue.submit([enc.finish()]);
  
    await rb.mapAsync(GPUMapMode.READ);
  
    const hb = new Uint16Array(rb.getMappedRange().slice(0));
  
    rb.unmap(); rb.destroy(); tx.destroy();
  
    if (token !== ext.genToken) return;
  
    // Meeresspiegel aus dieser genaueren Karte (mit Erosion und Vulkanen): Küsten wandern nicht mehr mit der Kartenauflösung
  
    if (S.rivers !== 2) return;
  
    const C = 6 * n * n, sea = ext.seaH, n1 = n - 1, nn = n * n;
  
    const H = new Float32Array(C), rain = new Float32Array(C), dirs = new Float32Array(C * 3);
  
    for (let f = 0; f < 6; f++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
  
      const c = f * nn + j * n + i, d = faceDirJS(f, i / n1, j / n1);
  
      dirs.set(d, c * 3);
  
      const h = half(hb[c * 4]);
  
      H[c] = h;
  
      // Regen: aus der Feuchte; gefroren (wie im Biom: kalt durch Breite und Höhe) fließt nichts ab
  
      const moist = clamp((half(hb[c * 4 + 1]) - ext.moistQ[0]) / (ext.moistQ[1] - ext.moistQ[0] + 1e-6), 0, 1);
  
      const lat = Math.abs(d[1]);
  
      const temp = 1 - 1.25 * Math.pow(lat, 1.35) - Math.max(h - sea, 0) * 1.6;
  
      rain[c] = (0.15 + moist) * clamp((temp + 0.02) / 0.15, 0, 1);
  
    }
  
    const nb = (f, i, j, di, dj) => {
  
      const a = i + di, b = j + dj;
  
      if (a >= 0 && a <= n1 && b >= 0 && b <= n1) return f * nn + b * n + a;
  
      const [g, u, v] = toFaceJS(faceDirJS(f, a / n1, b / n1));
  
      return g * nn + clamp(Math.round(v * n1), 0, n1) * n + clamp(Math.round(u * n1), 0, n1);
  
    };
  
    // 2) Priority-Flood: fill = ebener Seespiegel (für Seen), fillE = mit winzigem Gefälle (für Fließrichtungen)
  
    const hk = new Float32Array(C + 8), hv = new Int32Array(C + 8);
  
    let hn = 0;
  
    const push = (k, v) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  
    const pop = () => { const v = hv[0], k = hk[--hn], x = hv[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = k; hv[i] = x; return v; };
  
    const down = new Int32Array(C).fill(-2), fill = new Float32Array(C), fillE = new Float32Array(C), order = new Int32Array(C);
  
    let seeds = 0;
  
    for (let c = 0; c < C; c++) if (H[c] < sea) { down[c] = -1; fill[c] = fillE[c] = sea; push(H[c], c); seeds++; }
  
    if (!seeds) { let m = 0; for (let c = 1; c < C; c++) if (H[c] < H[m]) m = c; down[m] = -1; fill[m] = fillE[m] = H[m]; push(H[m], m); }
  
    let on = 0;
  
    const DI = [1, -1, 0, 0, 1, 1, -1, -1], DJ = [0, 0, 1, -1, 1, -1, 1, -1];
  
    while (hn) {
  
      const c = pop();
  
      order[on++] = c;
  
      const f = (c / nn) | 0, r = c - f * nn, j = (r / n) | 0, i = r - j * n;
  
      for (let k = 0; k < 8; k++) {
  
        const q = nb(f, i, j, DI[k], DJ[k]);
  
        if (down[q] !== -2) continue;
  
        down[q] = c;
  
        fill[q] = Math.max(H[q], fill[c]);
  
        fillE[q] = Math.max(H[q], fillE[c] + 2e-6);
  
        push(fillE[q], q);
  
      }
  
    }
  
    // 3) Abfluss sammeln, von der Quelle zur Mündung
  
    const acc = new Float32Array(C);
  
    for (let c = 0; c < C; c++) if (H[c] >= sea) acc[c] = rain[c];
  
    for (let k = on - 1; k >= 0; k--) { const c = order[k], d = down[c]; if (d >= 0 && H[c] >= sea) acc[d] += acc[c]; }
  
    if (token !== ext.genToken) return;
  
    // 4) Karte zeichnen: Täler als Bézier-Kurven durch die Zellen, Querschnitt glatt; Seen als Fläche
  
    const T = C * 0.00004 / Math.max(S.riverAmount, 0.05);
  
    const cellA = QP * 2 / n1;                 // Zellweite in Bogenmaß
  
    const sc = (NH - 1) / n1;
  
    const D = new Float32Array(6 * NH * NH), W = new Float32Array(6 * NH * NH), CH = new Float32Array(6 * NH * NH), best = new Float32Array(6 * NH * NH).fill(1e9);
  
    const NN = NH * NH;
  
    const jit = (c) => { const x = Math.sin(c * 12.9898) * 43758.5453, y = Math.sin(c * 78.233) * 12345.6789; return [(x - Math.floor(x) - 0.5) * 0.6, (y - Math.floor(y) - 0.5) * 0.6]; };
  
    const posOn = (f, c) => {
  
      const g = (c / nn) | 0, r = c - g * nn, j = (r / n) | 0, i = r - j * n;
  
      if (g === f) { const J = jit(c); return [(i + J[0]) * sc, (j + J[1]) * sc]; }
  
      const [u, v] = faceUvJS(f, dirs.subarray(c * 3, c * 3 + 3));
  
      return [u * n1 * sc, v * n1 * sc];
  
    };
  
    // Querschnitt: Talbreite wb (px), Eintiefung dep, Wasserspiegel lvl; näher liegende Strecke gewinnt beim Spiegel
  
    const stamp = (f, x, y, wb, dep, lvl) => {
  
      const Rr = Math.ceil(wb + 1), base = f * NN;
  
      const x0 = Math.max(0, Math.floor(x - Rr)), x1 = Math.min(NH - 1, Math.ceil(x + Rr));
  
      const y0 = Math.max(0, Math.floor(y - Rr)), y1 = Math.min(NH - 1, Math.ceil(y + Rr));
  
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
  
        const q = Math.hypot(px - x, py - y) / wb;
  
        if (q >= 1) continue;
  
        const o = base + py * NH + px;
  
        const prof = (1 - q * q) * (1 - q * q);          // glatter Talquerschnitt
  
        if (dep * prof > D[o]) D[o] = dep * prof;
  
        if (q < best[o]) { best[o] = q; W[o] = lvl; }
  
        const ch = 1 - Math.min(Math.max((q - 0.3) / 0.25, 0), 1);   // Flussbett (innerer Teil des Tals)
  
        if (ch > CH[o]) CH[o] = ch;
  
      }
  
    };
  
    const geo = (a) => {
  
      const q = a / T;
  
      return { wb: clamp(2.6 * Math.pow(q, 0.5), 2.2, 16) * (NH / 1024) * (512 / n), dep: clamp(0.012 * Math.pow(q, 0.4), 0.01, 0.05), wd: clamp(0.004 * Math.pow(q, 0.4), 0.003, 0.02) };
  
    };
  
    // Seen: nur echte Becken mit Zufluss (Krater zählen mit), keine Pfützen aus Erosionsmulden
  
    const lakeMin = T * 0.05;
  
    const isLake = new Uint8Array(C);
  
    for (let c = 0; c < C; c++) if (H[c] >= sea && fill[c] > H[c] + 0.0015 && acc[c] >= lakeMin) isLake[c] = 1;
  
    for (let c = 0; c < C; c++) {
  
      if (H[c] < sea || acc[c] < T || down[c] < 0) continue;
  
      if (isLake[c]) continue;                                   // im See: dort zeichnet der See
  
      const f = (c / nn) | 0, dn = down[c];
  
      const Pc = posOn(f, c), Pd = posOn(f, dn);
  
      // Hauptzufluss als Vorgänger, damit die Kurve durch die Kantenmitten weich weiterläuft
  
      let up = -1, ua = 0;
  
      const fr = c - f * nn, jj = (fr / n) | 0, ii = fr - jj * n;
  
      for (let k = 0; k < 8; k++) { const q = nb(f, ii, jj, DI[k], DJ[k]); if (down[q] === c && acc[q] > ua) { ua = acc[q]; up = q; } }
  
      const Pa = up >= 0 && ua >= T ? posOn(f, up) : Pc;
  
      const A = [(Pa[0] + Pc[0]) / 2, (Pa[1] + Pc[1]) / 2], B = [(Pc[0] + Pd[0]) / 2, (Pc[1] + Pd[1]) / 2];
  
      const g0 = geo(acc[c]), g1 = geo(Math.max(acc[dn], acc[c]));
  
      // Wasserspiegel: gefüllte Höhe minus Eintiefung plus Wassertiefe; fällt zur Mündung hin nie an
  
      const l0 = fillE[c] - g0.dep + g0.wd, l1 = (dn >= 0 && H[dn] < sea) ? sea : fillE[dn] - g1.dep + g1.wd;
  
      const len = Math.hypot(A[0] - Pc[0], A[1] - Pc[1]) + Math.hypot(B[0] - Pc[0], B[1] - Pc[1]);
  
      const steps = Math.max(2, Math.ceil(len / 0.8));
  
      for (let s = 0; s <= steps; s++) {
  
        const t = s / steps, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), e = t * t, m = t * 0.5;
  
        stamp(f, a * A[0] + b * Pc[0] + e * B[0], a * A[1] + b * Pc[1] + e * B[1],
  
          g0.wb + (g1.wb - g0.wb) * m, g0.dep + (g1.dep - g0.dep) * m, Math.min(l0, l0 + (l1 - l0) * m));
  
      }
  
    }
  
    // Seen: ebener Spiegel über der gefüllten Senke, wenn genug Wasser zufließt (in Wüsten trocknen sie aus)
  
    for (let c = 0; c < C; c++) {
  
      if (!isLake[c]) continue;
  
      const f = (c / nn) | 0, r = c - f * nn, j = (r / n) | 0, i = r - j * n;
  
      const cx = i * sc, cy = j * sc, rr = sc * 1.2;
  
      for (let py = Math.max(0, Math.floor(cy - rr)); py <= Math.min(NH - 1, Math.ceil(cy + rr)); py++)
  
        for (let px = Math.max(0, Math.floor(cx - rr)); px <= Math.min(NH - 1, Math.ceil(cx + rr)); px++) {
  
          const o = f * NN + py * NH + px;
  
          if (fill[c] > W[o]) { W[o] = fill[c]; best[o] = 0; CH[o] = 0; }
  
        }
  
    }
  
    if (token !== ext.genToken) return;
  
    // Hochladen (rgba16float: r = Eintiefung, g = Wasserspiegel)
  
    const data = new Uint16Array(6 * NN * 4);
  
    for (let o = 0; o < 6 * NN; o++) { data[o * 4] = toHalf(D[o]); data[o * 4 + 1] = toHalf(W[o]); data[o * 4 + 2] = toHalf(CH[o]); }
  
    const tex = tagged(ext.device.createTexture({ size: [NH, NH, 6], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }));
  
    for (let f = 0; f < 6; f++) ext.device.queue.writeTexture({ texture: tex, origin: [0, 0, f] }, data.subarray(f * NN * 4, (f + 1) * NN * 4), { bytesPerRow: NH * 8, rowsPerImage: NH }, [NH, NH, 1]);
  
    RS.hydro = tex; RS.nHydro = NH;
  
  }
  
  return { buildRiverLines, buildHydro };
}
