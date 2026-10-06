// Darstellung: Render-Uniforms, ein Bild zeichnen, Zielbild, Prüf-Auslesung.
import type { App } from './app';
import { hexToLinear } from '../presets';
import { S } from './zustand';
import { Vec3, perspective, lookAt, invert, multiply, planetRotation, normalize } from '../math';
import { canvas } from './dom';

export function writeRender(app: App) {
  const w = canvas.width, h = canvas.height;
  const cy = Math.cos(app.cam.pitch), sy = Math.sin(app.cam.pitch);
  const eye: Vec3 = [Math.sin(app.cam.yaw) * cy * app.cam.dist, sy * app.cam.dist, Math.cos(app.cam.yaw) * cy * app.cam.dist];
  const proj = perspective((32 * Math.PI) / 180, w / h, 0.05, 100);
  const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
  const inv = invert(multiply(proj, view));
  // Welt -> Körper = Transponierte von (Neigung · Drehung)
  const m = planetRotation((app.preset.tilt * Math.PI) / 180, app.spin);
  const a = (S.sunAngle * Math.PI) / 180;
  const sun = normalize([Math.sin(a), 0.18, Math.cos(a)]);
  const atmo = hexToLinear(app.preset.atmosphere);
  const ring = app.preset.rings;
  const rc = ring ? hexToLinear(ring.color) : [0, 0, 0];
  const d = app.renderData;
  d.set(inv, 0);
  d.set([
    ...eye, 1,
    m[0][0], m[1][0], m[2][0], 0,
    m[0][1], m[1][1], m[2][1], 0,
    m[0][2], m[1][2], m[2][2], 0,
    ...sun, 1.7,
    atmo[0], atmo[1], atmo[2], app.preset.atmosphereStrength * S.atmosphere,
    app.preset.oblateness, S.relief, S.limb, S.view,
    S.map ? 1 : 0, ring ? ring.inner : 0, ring ? ring.outer : 0, ring ? ring.opacity : 0,
    w / h, app.time, S.exposure, S.dyeRes,
    rc[0], rc[1], rc[2], 0.6,
    1 / Math.max(S.jetStrength, 1e-4), (2 * Math.tan((16 * Math.PI) / 180)) / h, app.sky.ready ? app.sky.n : 0, S.nebula,
    S.stars, S.reliefMulti ? S.reliefCoarse : 0, S.reliefFine, S.reliefAdapt ? 1 : 0,
    S.depthOn ? 1 : 0, S.depthStrength, S.depthSource === 'pressure' && app.flowMode() === 'fluid' ? 0 : 1, S.velRes,
    S.pomOn ? 1 : 0, S.pomHeight, S.pomShadow, S.reliefSize,
    ({ v04: 0, off: 1, soft: 2 } as Record<string, number>)[S.twilight] ?? 0, ({ v04: 0, soft: 1, off: 2 } as Record<string, number>)[S.rimGlow] ?? 0, 0, 0,
  ], 16);
  app.device.queue.writeBuffer(app.renderBuf, 0, d);
}

/** Ein Bild: Simulationsschritt(e) und Darstellung. */
export function frameOnce(app: App, real: number) {
  app.buildRenderPipe();   // Darstellungs-Bausteine an/aus: Pipeline nur neu bauen, wenn sich ein Schalter geändert hat
  app.initIfNeeded();
  let flowSrc = app.flowMode() === 'fluid' ? app.vel[app.vc] : app.flow;
  let n = 0;
  if (!S.paused) {
    // Die Simulation läuft in Echtzeit: 60 Schritte pro Sekunde mal Zeitraffer, unabhängig von
    // der Bildrate (bis v0.2.3 war es ein Schritt pro Bild, bei 240 fps lief alles viermal so
    // schnell). Jeder Schritt ist gleich groß, der Zeitraffer ändert also nicht die Physik,
    // sondern nur, wie viel Simulationszeit pro Sekunde vergeht. Im Testmodus: fester Takt.
    app.stepAcc += app.offscreen ? Math.max(1, S.timeScale) : real * 60 * Math.max(1, S.timeScale);
    // Obergrenze aus der gemessenen Schrittzeit, damit das Bild flüssig bleibt.
    const cap = Math.max(1, Math.min(64, Math.floor(12 / Math.max(app.stepMs, 0.1))));
    n = Math.min(Math.floor(app.stepAcc), cap);
    app.stepAcc = Math.min(app.stepAcc - n, 2);
    for (let k = 0; k < n; k++) flowSrc = app.submitStep();
  }
  app.achieved = app.achieved * 0.97 + (real > 0 ? (n * app.dtStep() / real) : 0) * 0.03;
  // Sichtbare Drehung in Simulationszeit: Zeitraffer beschleunigt Wolken und Drehung gleich.
  app.spin += n * app.dtStep() * 0.08 * S.spinSpeed * (9.93 / app.preset.rotationHours) * app.dir();
  const enc = app.device.createCommandEncoder();
  app.sky.tick(enc);
  app.writeRender();

  const rbg = app.device.createBindGroup({
    layout: app.renderPipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: app.renderBuf } },
      { binding: 1, resource: app.sampler },
      { binding: 2, resource: app.dye[app.dc].cube },
      { binding: 3, resource: flowSrc.cube },
      { binding: 4, resource: app.aux.cube },
      { binding: 5, resource: app.prs[app.pc].cube },
      { binding: 6, resource: app.sky.view },
    ],
  });
  const rp = enc.beginRenderPass({
    colorAttachments: [{ view: app.targetView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 1] }],
  });
  rp.setPipeline(app.renderPipe);
  rp.setBindGroup(0, rbg);
  rp.draw(3);
  rp.end();
  app.device.queue.submit([enc.finish()]);
}

export function targetView(app: App): GPUTextureView {
  if (!app.offscreen) return app.ctx.getCurrentTexture().createView();
  if (!app.target || app.target.width !== canvas.width || app.target.height !== canvas.height) {
    app.target?.destroy();
    app.target = app.device.createTexture({
      size: [canvas.width, canvas.height], format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
  }
  return app.target.createView();
}

/** Nur für Tests: eine Texelzeile eines Felds auslesen (rgba als Zahlen). */
export async function readRow(app: App, which: 'dye' | 'flow' | 'vel', face: number, y: number): Promise<number[][]> {
  const f = which === 'dye' ? app.dye[app.dc] : which === 'flow' ? app.flow : app.vel[app.vc];
  const bpr = Math.ceil((f.n * 8) / 256) * 256;
  const buf = app.device.createBuffer({ size: bpr, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = app.device.createCommandEncoder();
  enc.copyTextureToBuffer({ texture: f.tex, origin: [0, y, face] }, { buffer: buf, bytesPerRow: bpr }, [f.n, 1, 1]);
  app.device.queue.submit([enc.finish()]);
  await buf.mapAsync(GPUMapMode.READ);
  const h = new Uint16Array(buf.getMappedRange().slice(0));
  buf.destroy();
  const f16 = (b: number) => { const s = b >> 15 ? -1 : 1, e = (b >> 10) & 31, m = b & 1023; return e === 0 ? s * m * 2 ** -24 : e === 31 ? NaN : s * (1 + m / 1024) * 2 ** (e - 15); };
  const out: number[][] = [];
  for (let x = 0; x < f.n; x++) out.push([0, 1, 2, 3].map((k) => f16(h[x * 4 + k])));
  return out;
}

/** Nur im Testmodus: letztes Bild als PNG-Data-URL. */
export async function capture(app: App): Promise<string> {
  if (!app.target) return '';
  const w = app.target.width, h = app.target.height;
  const bpr = Math.ceil((w * 4) / 256) * 256;
  const buf = app.device.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = app.device.createCommandEncoder();
  enc.copyTextureToBuffer({ texture: app.target }, { buffer: buf, bytesPerRow: bpr }, [w, h]);
  app.device.queue.submit([enc.finish()]);
  await buf.mapAsync(GPUMapMode.READ);
  const src = new Uint8Array(buf.getMappedRange());
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4);
  buf.unmap(); buf.destroy();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
