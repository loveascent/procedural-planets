import { clamp } from '../logik/zufall.js';


// Karten-Erzeugung in Kacheln (Höhe, Feuchte, Wolken, Himmel): Auftragsliste, Parameter, Meeresspiegel aus Höhenverteilung.
// ext: { S, dispatch, tileParams, makeCtx, J_SLOTS, texArray, mipLevels, tagged, RS, skyParams, nebRes, PP*, seaH*, genToken*, jobs*, jobTotal*, jobDone*, cdf*, device*, P* }  (* = lebender Zustand, per Getter/Setter)
export function createErzeugung(ext) {
  const { S, dispatch, tileParams, makeCtx, J_SLOTS, texArray, mipLevels, tagged, RS, skyParams, nebRes } = ext;
  // Erosions-Oktaven, die die Karte noch auflöst (Zelle ≥ 4 Texel); der Rest läuft live im Pixel
  const eroOct = (N) => clamp(Math.floor(Math.log2(N / 213)) + 1, 1, 6);
  function genParams(mode, N, erosion, nHydro = 0) {
    const f = ext.PP.h, m = ext.PP.m;
    return new Float32Array([
      f.res1, f.res2, f.resMix, f.mixScale,
      f.type, ext.PP.noiseSeed, m.type, ext.PP.noiseSeed + 392.253,
      m.res1 * ext.PP.moistM, m.res2, m.resMix, m.mixScale,
      erosion, 34.0, 0.9, 1.0,
      ext.PP.mountains, ext.PP.beltFreq, 7.0, 0.35,
      mode, eroOct(N), ext.seaH, 0,
      0, 0, 0, 0, 0, 0, 0, N,
      S.volcanoOn ? S.volcanoes : 0, ext.PP.noiseSeed, S.volcanoType, 0,   // v: Baustein Vulkane
      nHydro, 0, 0, 0,                                                     // r: Baustein Flüsse
    ]);
  }
  function queueTiles(N, tile, params, pipe, bg, onDone) {
    const token = ext.genToken;
    for (let f = 0; f < 6; f++) for (let y = 0; y < N; y += tile) for (let x = 0; x < N; x += tile) {
      const w = Math.min(tile, N - x), h = Math.min(tile, N - y);
      ext.jobs.push({ cost: w * h, run: (ctx) => {
        if (token !== ext.genToken) return;
        dispatch(ctx, pipe(), bg(), tileParams(params(), f, x, y, w, h, N), Math.ceil(w / 8), Math.ceil(h / 8));
      } });
      ext.jobTotal += w * h;
    }
    ext.jobs.push({ cost: 0, run: (ctx) => { if (token === ext.genToken) onDone(ctx); } });
  }
  // Aufträge im Zeitbudget abarbeiten (höchstens so viele, wie Parameterplätze frei sind)
  function runJobs(enc, budget) {
    const ctx = makeCtx(enc);
    let spent = 0;
    while (ext.jobs.length && spent < budget && ctx.used < J_SLOTS - 8) { const j = ext.jobs.shift(); j.run(ctx); spent += j.cost; ext.jobDone += j.cost; }
  }
  function quantile(arr, q) { return arr[clamp(Math.round(q * (arr.length - 1)), 0, arr.length - 1)]; }
  function seaFromFraction(fr) {
    if (!ext.cdf) return 0.5;
    if (fr <= 0) return ext.cdf[0] - 0.01;
    if (fr >= 1) return ext.cdf[ext.cdf.length - 1] + 0.01;
    return quantile(ext.cdf, fr);
  }
  
  async function makeFullMap(N) {
    ext.device.pushErrorScope('out-of-memory');
    const tx = texArray(N, 'rgba16float', mipLevels(N));
    const err = await ext.device.popErrorScope();
    if (err) { tx.destroy(); return null; }
    return tagged(tx);
  }
  
  // Milchstraße neu (nur der Hintergrund, der Planet bleibt)
  function queueSky() {
    // altes Bild bleibt stehen, bis das neue fertig ist (nur bei neuem Seed ausblenden)
    if (RS.nebSeed !== S.seed) RS.nebReady = false;
    RS.nebSeed = S.seed;
    // Gemeinsamer Himmel (src/sky): Lage der Galaxie und Aussehen aus dem Seed
    const prm = skyParams(String(S.seed), { width: S.mwWidth, core: S.mwCore, dust: S.mwDust, hii: S.mwHii, bright: ext.PP.nebBright, hue: ext.PP.nebHue });
    RS.galCore = [prm[8], prm[9], prm[10]];
    queueTiles(nebRes, 256, () => prm.slice(), () => ext.P.nebGen, () => RS.bgNebGen, () => { RS.nebReady = true; });
  }
  return { eroOct, genParams, queueTiles, runJobs, quantile, seaFromFraction, makeFullMap, queueSky };
}
