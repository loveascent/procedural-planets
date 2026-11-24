// Argh-Karte (Ansatz A): Referenzkarte und Rückabbildung anlegen, füllen, einen Schritt mitführen. Nur aktiv bei arghOn und arghSource = 'karte'.
import type { App } from './app';
import type { CubeField } from './zustand';
import { FOTO_NACH_WUERFEL, MIPS_WGSL } from './shader/argh_karte';
import { App as AppKlasse } from './app';
import { WARM_STEPS, isPhone } from './zustand';

export const karteAn = (a: App) => a.S.arghOn && a.S.arghSource === 'karte';

/** Referenzfeld mit Mip-Kette (die Höhe des Volumens wird geglättet abgetastet, siehe arghSmooth); Schreibzugriff nur auf Stufe 0. */
function refFeld(a: App, n: number): CubeField {
  const tex = a.device.createTexture({
    size: [n, n, 6], format: 'rgba16float', mipLevelCount: Math.floor(Math.log2(n)) + 1,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
  });
  return { tex, n, cube: tex.createView({ dimension: 'cube' }), store: tex.createView({ dimension: '2d-array', baseMipLevel: 0, mipLevelCount: 1 }) };
}

/** Felder passend zu den Reglern: Rückabbildung in Farbauflösung (zwei Puffer), Referenz in eigener Auflösung. Aus = nichts belegt. */
export function allocKarte(a: App) {
  for (const f of a.warp) f.tex.destroy();
  a.warp = [];
  if (!karteAn(a)) { a.ref?.tex.destroy(); a.ref = null; return; }
  a.device.pushErrorScope('out-of-memory');
  a.warp = [a.cubeField(a.S.dyeRes), a.cubeField(a.S.dyeRes)];
  if (!a.ref || a.ref.n !== a.S.arghRefRes) { a.ref?.tex.destroy(); a.ref = refFeld(a, a.S.arghRefRes); a.refNeu = true; }
  a.device.popErrorScope().then((err) => { if (err && a.S.arghRefRes > 256) { a.S.arghRefRes = a.S.arghRefRes >> 1; allocKarte(a); a.fuelleKarte(); } });
  a.wc = 0;
  a.warpNeu = true;
}

/** Rückabbildung auf Identität; Referenz aus Foto (falls geladen), aus der Detail-Karte (Standard, sofort) oder aus der Anfangsfarbe bzw. einem Partikel-Lauf. */
export function fuelleKarte(a: App) {
  if (!karteAn(a) || !a.ref || !a.warp.length) return;
  a.buildPipes(a.S.seamless);   // die Rechen-Einträge des Bausteins gibt es erst nach dem Neubau der Pipelines
  if (!a.pipes.initWarp) return;
  if (a.warpNeu || a.needsDye) {
    const e = a.device.createCommandEncoder();
    const p = e.beginComputePass();
    a.run2D(p, 'initWarp', null, null, a.warp[0]);
    p.end();
    a.device.queue.submit([e.finish()]);
    a.wc = 0; a.warpNeu = false;
  }
  if (a.refNeu || a.needsDye) {
    a.refMarke++;   // ein noch laufender Partikel-Lauf gilt nicht mehr
    if (a.foto) fotoNachWuerfel(a);
    else {
      farbeNachReferenz(a, a.S.arghRefQuelle === 'detail' ? 'initRef' : 'initDye');
      if (a.S.arghRefQuelle === 'partikel') void referenzAusPartikeln(a);   // optional, braucht einige Sekunden im Hintergrund
    }
    erzeugeMips(a);
    a.refNeu = false;
  }
}

let mipPipe: { device: GPUDevice; pipe: GPUComputePipeline } | null = null;
/** Mip-Kette der Referenz: jede Stufe ist der Mittelwert von 2×2 Texeln der vorigen. */
function erzeugeMips(a: App) {
  const r = a.ref!;
  if (!mipPipe || mipPipe.device !== a.device) {
    const m = a.module('argh-mips', MIPS_WGSL);
    mipPipe = { device: a.device, pipe: a.device.createComputePipeline({ layout: 'auto', compute: { module: m, entryPoint: 'main' } }) };
  }
  const e = a.device.createCommandEncoder();
  const levels = Math.floor(Math.log2(r.n)) + 1;
  for (let l = 1; l < levels; l++) {
    const m = Math.max(1, r.n >> l);
    const p = e.beginComputePass();
    p.setPipeline(mipPipe.pipe);
    p.setBindGroup(0, a.device.createBindGroup({
      layout: mipPipe.pipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: r.tex.createView({ dimension: '2d-array', baseMipLevel: l - 1, mipLevelCount: 1 }) },
        { binding: 1, resource: r.tex.createView({ dimension: '2d-array', baseMipLevel: l, mipLevelCount: 1 }) },
      ],
    }));
    p.dispatchWorkgroups(Math.ceil(m / 8), Math.ceil(m / 8), 6);
    p.end();
  }
  a.device.queue.submit([e.finish()]);
}

/** Anfangsfarbe in Referenzauflösung: dasselbe initDye wie beim Farbstoff, nur mit anderer Auflösung im Uniform. */
function farbeNachReferenz(a: App, eintritt: 'initDye' | 'initRef') {
  a.writeSim(0, true);
  a.simData[4] = a.ref!.n;
  a.device.queue.writeBuffer(a.simBuf, 0, a.simData);
  const e = a.device.createCommandEncoder();
  const p = e.beginComputePass();
  a.run2D(p, eintritt, null, null, a.ref!);
  p.end();
  a.device.queue.submit([e.finish()]);
  a.writeSim(0, true);   // Auflösung im Uniform zurück
}

let fotoPipe: { device: GPUDevice; pipe: GPUComputePipeline; samp: GPUSampler } | null = null;

function fotoNachWuerfel(a: App) {
  if (!fotoPipe || fotoPipe.device !== a.device) {
    const m = a.module('argh-foto', FOTO_NACH_WUERFEL);
    fotoPipe = {
      device: a.device,
      pipe: a.device.createComputePipeline({ layout: 'auto', compute: { module: m, entryPoint: 'main' } }),
      samp: a.device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' }),
    };
  }
  const n = a.ref!.n;
  const kopf = a.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  a.device.queue.writeBuffer(kopf, 0, new Float32Array([n, 0, 0, 0]));
  const e = a.device.createCommandEncoder();
  const p = e.beginComputePass();
  p.setPipeline(fotoPipe.pipe);
  p.setBindGroup(0, a.device.createBindGroup({
    layout: fotoPipe.pipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: fotoPipe.samp },
      { binding: 1, resource: a.foto!.createView() },
      { binding: 2, resource: a.ref!.store },
      { binding: 3, resource: { buffer: kopf } },
    ],
  }));
  p.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8), 6);
  p.end();
  a.device.queue.submit([e.finish()]);
}

/** Foto laden (Äquirektangular-Karte): als sRGB-Textur, Referenz wird daraus neu gefüllt. */
export async function ladeFoto(a: App, datei: Blob) {
  const bmp = await createImageBitmap(datei, { colorSpaceConversion: 'none' });
  a.foto?.destroy();
  a.foto = a.device.createTexture({
    size: [bmp.width, bmp.height], format: 'rgba8unorm-srgb',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  a.device.queue.copyExternalImageToTexture({ source: bmp }, { texture: a.foto }, [bmp.width, bmp.height]);
  a.fotoInfo = `${bmp.width}×${bmp.height}`;
  bmp.close();
  a.refNeu = true;
  a.warpNeu = true;
}

/** Ein Schritt: Rückabbildung mit dem Wind mitführen (nach dem Windschritt, liest flowSrc). */
export function schrittKarte(a: App, pass: GPUComputePassEncoder, flowSrc: CubeField) {
  if (!karteAn(a) || !a.warp.length) return;
  a.run2D(pass, 'advectWarp', a.warp[a.wc], flowSrc, a.warp[1 - a.wc]);
  a.wc = 1 - a.wc;
}

/** Referenzkarte mit feinem Wolkendetail für beliebige Planeten ohne Foto: derselbe Planet (Vorlage oder Zufallsseed, gleiche Strömung) läuft in einer
 *  eigenen unsichtbaren Instanz mit der Darstellung „Partikel“ (Millionen Punkte malen die Farbe, Rezept jasper-r / Gaseous Giganticus, schon im Projekt)
 *  die Wolkenzeit der Seite (WARM_STEPS) voraus; ihr Farbstoff wird eingefroren und zur Referenz. Danach wird die Instanz freigegeben. */
async function referenzAusPartikeln(a: App) {
  const marke = ++a.refMarke;
  const t0 = performance.now();
  const n = a.S.arghRefRes;
  const S2 = { ...a.S, remember: false, transparent: true, nebula: 0, stars: 0, autoQuality: false, arghOn: false, look: 'particles', quality: 'welt' };
  const h = new AppKlasse(a.device, S2 as typeof a.S, { breite: 4, hoehe: 4 });
  try {
    S2.dyeRes = n; S2.velRes = a.S.velRes; S2.iterations = a.S.iterations; S2.particles = isPhone ? 262144 : Math.min(4194304, Math.round(4 * n * n / 1024) * 1024);
    h.allocVel(); h.allocDye(); h.allocParticles();
    h.applyPreset();
    h.needsInit = false; h.needsDye = false;
    const e = a.device.createCommandEncoder();
    h.writeSim(0, true);
    h.initFields(e, true);
    a.device.queue.submit([e.finish()]);
    for (let i = 0; i < WARM_STEPS; i++) {
      h.submitStep();
      if (i % 24 === 23) { await a.device.queue.onSubmittedWorkDone(); if (marke !== a.refMarke || !a.ref || a.ref.n !== n) return; }
    }
    await a.device.queue.onSubmittedWorkDone();
    if (marke !== a.refMarke || !a.ref || a.ref.n !== n || a.foto) return;
    const k = a.device.createCommandEncoder();
    k.copyTextureToTexture({ texture: h.dye[h.dc].tex }, { texture: a.ref.tex }, [n, n, 6]);
    a.device.queue.submit([k.finish()]);
    erzeugeMips(a);
    console.info(`Argh-Karte: Referenz aus Partikel-Lauf fertig (${n}², ${S2.particles} Partikel, ${Math.round(performance.now() - t0)} ms)`);
  } finally {
    for (const f of [...h.vel, ...h.prs, ...h.dye, h.aux, h.div, h.flow, h.dummy]) f?.tex.destroy();
    h.parts?.destroy();
  }
}
