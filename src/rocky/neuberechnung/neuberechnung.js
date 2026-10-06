import { half } from '../logik/wuerfel.js';
import { clamp } from '../logik/zufall.js';


// Neuberechnung des Planeten: Karten, Meeresspiegel, Biom-Bild, Flüsse, Wolken, Himmel in der richtigen Reihenfolge (abbrechbar per Token).
// ext: { S, RS, makeCtx, dispatch, tileParams, genParams, genMips, quantile, seaFromFraction, drawBiome, buildRiverLines, buildHydro, makeFullMap, genBG, lvl0, queueTiles, initCyclones, cloudRes, queueSky, genToken*, jobs*, jobTotal*, jobDone*, regenBusy*, device*, P*, L*, cdf*, moistQ*, PP*, seaH* }  (* = lebender Zustand, per Getter/Setter)
export function createNeuberechnung(ext) {
  const { S, RS, makeCtx, dispatch, tileParams, genParams, genMips, quantile, seaFromFraction, drawBiome, buildRiverLines, buildHydro, makeFullMap, genBG, lvl0, queueTiles, initCyclones, cloudRes, queueSky } = ext;
  async function regenerate(full) {
    const token = ++ext.genToken;
    ext.jobs = []; ext.jobTotal = 0; ext.jobDone = 0;
    ext.regenBusy++;
    try {
      // Bausteine, die beim Ausschalten nicht mitkompiliert werden: Variante nachziehen, bevor Karten entstehen
      await ext.variantenNachziehen();
      if (token !== ext.genToken) return;
      const mode = S.style === 'orig' ? 0 : 1;
      const ero = mode === 1 ? S.erosion : 0;
      // 1) Vorschau 128² sofort, daraus die Höhenverteilung für den Meeresspiegel
      const n = RS.nPrev;
      const enc = ext.device.createCommandEncoder();
      const ctx = makeCtx(enc);
      for (let f = 0; f < 6; f++) dispatch(ctx, ext.P.gen, RS.bgGenPrev, tileParams(genParams(mode, n, 0), f, 0, 0, n, n, n), n / 8, n / 8);
      genMips(enc, RS.hmPrev, n, ext.L.mip16, ext.P.mip16);
      const rb = ext.device.createBuffer({ size: n * 8 * n * 6, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      enc.copyTextureToBuffer({ texture: RS.hmPrev }, { buffer: rb, bytesPerRow: n * 8, rowsPerImage: n }, [n, n, 6]);
      ext.device.queue.submit([enc.finish()]);
      RS.shown = RS.hmPrev; RS.nShown = n; RS.fullReady = false;
      await rb.mapAsync(GPUMapMode.READ);
      const hb = new Uint16Array(rb.getMappedRange().slice(0));
      rb.unmap(); rb.destroy();
      if (token !== ext.genToken) return;
      const hs = [], ms = [];
      for (let i = 0; i < 6 * n * n; i += 3) { hs.push(half(hb[i * 4])); ms.push(half(hb[i * 4 + 1])); }
      hs.sort((a, b) => a - b); ms.sort((a, b) => a - b);
      ext.cdf = Float32Array.from(hs);
      ext.moistQ = [quantile(ms, 0.04), quantile(ms, 0.96)];
      if (S.sea < 0) S.sea = ext.PP.water;
      ext.seaH = seaFromFraction(S.sea);
      drawBiome(S.seed, clamp(ext.seaH, 0, 1));
      buildRiverLines();
      // 2) Flüsse und Seen aus der Höhenkarte, danach die volle Karte mit eingegrabenen Tälern
      if (full !== false) { const old = RS.hydro; await buildHydro(token); if (token !== ext.genToken) return; if (old !== RS.hydro && old !== RS.hydroNone) setTimeout(() => old.destroy(), 2000); }
      // 2) volle Auflösung
      if (full !== false) {
        let N = S.res;
        if (!RS.hmFull || RS.nFull !== N) {
          if (RS.hmFull) RS.hmFull.destroy();
          RS.hmFull = await makeFullMap(N);
          // zu wenig Grafikspeicher: halbe Auflösung
          while (!RS.hmFull && N > 512) { N = S.res = N >> 1; RS.hmFull = await makeFullMap(N); }
          RS.nFull = N;
          
          if (token !== ext.genToken) return;
        }
        if (RS.hmFull) {
          const full = RS.hmFull;
          const bgFull = genBG(lvl0(full), RS.hydro);
          const nCarve = S.rivers === 2 ? RS.nHydro : 0;
          queueTiles(N, 256, () => genParams(mode, N, ero, nCarve), () => ext.P.gen, () => bgFull, (c) => {
            genMips(c.enc, full, N, ext.L.mip16, ext.P.mip16);
            RS.shown = full; RS.nShown = N; RS.fullReady = true;
          });
        }
      }
      // 3) Wolken und Nebel gehören zum Seed (nur wenn die Bausteine an sind)
      wolkenErzeugen();
      himmelErzeugen();
    } finally { ext.regenBusy--; }
  }
  // Wolkenkarte (Baustein Wolken): nur erzeugen, wenn Wolken an sind; beim späteren Einschalten nachholen
  function wolkenErzeugen() {
    if (!S.modClouds) return;
    if (RS.cloudSeed !== S.seed) initCyclones(S.seed);
    if (RS.cloudSeed !== S.seed || !RS.cloudReady) {
      RS.cloudSeed = S.seed; RS.cloudReady = false;
      queueTiles(cloudRes, 256, () => new Float32Array([ext.PP.cloudSeed, 0, 0, 0, ...new Array(28).fill(0)]), () => ext.P.cloudGen, () => RS.bgCloudGen, (c) => {
        genMips(c.enc, RS.cloud, cloudRes, ext.L.mip8, ext.P.mip8);
        RS.cloudReady = true;
      });
    }
  }
  // Himmelskarte (Baustein Himmel): nur erzeugen, wenn Milchstraße oder Sterne an sind
  function himmelErzeugen() {
    if (!(S.nebula > 0 || S.stars > 0)) return;
    if (RS.nebSeed !== S.seed || !RS.nebReady) queueSky();
  }
  return { regenerate, wolkenErzeugen, himmelErzeugen };
}
