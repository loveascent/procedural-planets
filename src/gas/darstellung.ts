// Darstellung: Render-Uniforms, ein Bild zeichnen, Zielbild, Prüf-Auslesung.
import type { App } from './app';
import { grafikNoetig, zeichneGrafik, grafikAus } from './grafik/pfad';
import { takt, verteilt, verteilenAus, abschliessen, gezeigt } from './grafik/sim';
import { hexToLinear } from '../presets';
import { renderVarianten } from './shader/render_zusammen';
import type { CubeField } from './zustand';
import { Vec3, perspective, lookAt, invert, multiply, planetRotation, normalize } from '../math';

/** Blick eines Bildes: inverse Projektion × Ansicht, Augpunkt und die Zeilen der Drehung Welt -> Körper. */
export interface Pose { inv: Float32Array; auge: Vec3; zeilen: Vec3[] }

export function kameraPose(app: App, spin: number): Pose {
  const w = app.W, h = app.H;
  const cy = Math.cos(app.cam.pitch), sy = Math.sin(app.cam.pitch);
  const ov = app.ansicht;   // eingebettet: Kamera, Sonne und Drehung kommen von außen
  const eye: Vec3 = ov ? ov.auge : [Math.sin(app.cam.yaw) * cy * app.cam.dist, sy * app.cam.dist, Math.cos(app.cam.yaw) * cy * app.cam.dist];
  const proj = perspective((32 * Math.PI) / 180, w / h, 0.05, 100);
  const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
  const inv = ov ? ov.invVP : invert(multiply(proj, view));
  // Welt -> Körper = Transponierte von (Neigung · Drehung)
  const m = planetRotation((app.preset.tilt * Math.PI) / 180, ov ? ov.drehung : spin);
  return { inv: inv as Float32Array, auge: eye, zeilen: [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]] };
}

/** Sichtbare Drehung je Sekunde Simulationszeit. */
export const drehrate = (app: App) => 0.08 * app.S.spinSpeed * (9.93 / app.preset.rotationHours) * app.dir();

export function writeRender(app: App) {
  const w = app.W, h = app.H;
  const ov = app.ansicht;
  const lauf = app.lauf;    // Zusätze der Grafik-Optionen für dieses Bild; null = wie bisher
  const pose = kameraPose(app, app.spin + (lauf ? lauf.dSpin : 0));
  const eye = pose.auge, inv = pose.inv, z = pose.zeilen;
  const a = (app.S.sunAngle * Math.PI) / 180;
  const sun = ov ? normalize(ov.sonne) : normalize([Math.sin(a), 0.18, Math.cos(a)]);
  const atmo = hexToLinear(app.preset.atmosphere);
  const ring = app.preset.rings;
  const rc = ring ? hexToLinear(ring.color) : [0, 0, 0];
  const d = app.renderData;
  d.set(inv, 0);
  if (lauf) {
    lauf.pose = pose;
    if (lauf.jitter) {   // Unterpixel-Versatz: den Sichtstrahl um (jx, jy) Zielpixel verschieben
      const t = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, (2 * lauf.jitter[0]) / lauf.ziel[0], (-2 * lauf.jitter[1]) / lauf.ziel[1], 0, 1]);
      d.set(multiply(inv, t), 0);
    }
  }
  d.set([
    ...eye, 1,
    ...z[0], 0,
    ...z[1], 0,
    ...z[2], 0,
    ...sun, 1.7 * (ov ? ov.helligkeit : 1),
    atmo[0], atmo[1], atmo[2], app.preset.atmosphereStrength * app.S.atmosphere,
    app.preset.oblateness, app.S.relief, app.S.limb, app.S.view,
    app.S.map ? 1 : 0, ring ? ring.inner : 0, ring ? ring.outer : 0, ring ? ring.opacity : 0,
    w / h, app.time, app.S.exposure, app.S.dyeRes,
    rc[0], rc[1], rc[2], 0.6,
    1 / Math.max(app.S.jetStrength, 1e-4), (2 * (ov ? ov.tanHalbFov : Math.tan((16 * Math.PI) / 180))) / (lauf ? lauf.pixH : h), app.sky.ready ? app.sky.n : 0, app.S.nebula,
    app.S.stars, app.S.reliefMulti ? app.S.reliefCoarse : 0, app.S.reliefFine, app.S.reliefAdapt ? 1 : 0,
    app.S.depthOn ? 1 : 0, app.S.depthStrength, app.S.depthSource === 'pressure' && app.flowMode() === 'fluid' ? 0 : 1, app.S.velRes,
    app.S.pomOn ? 1 : 0, app.S.pomHeight, app.S.pomShadow, app.S.reliefSize,
    ({ v04: 0, off: 1, soft: 2 } as Record<string, number>)[app.S.twilight] ?? 0, lauf ? lauf.bildNr : ({ v04: 0, soft: 1, off: 2 } as Record<string, number>)[app.S.rimGlow] ?? 0, lauf ? lauf.tau : 0, lauf ? lauf.muster : 0,
    app.S.arghOn ? 1 : 0, app.S.arghMix, app.S.arghDensity, app.S.arghAniso,
  ], 16);
  app.device.queue.writeBuffer(app.renderBuf, 0, d);
}

// Helligkeit des Farbstoffs als eigener Würfel (r16float) für das mehrstufige Relief: es tastet je Pixel 36-mal ab.
// Messung 26.11. (iGPU, 1175×1000): Relief = ~60 % des Bild-Shaders; vier Byte weniger je Abtastung und kein Skalarprodukt je Probe.
// Gleiches Bild: Helligkeit ist linear in rgb, also luminance(bilinear(rgb)) = bilinear(luminance(rgb)); Gewichte wie luminance() in render_basis.ts.
// r16float ist im WebGPU-Kern renderbar und filterbar (WebGPU-Spezifikation, Tabelle „Plain color formats“), als Speicher-Textur aber nicht: daher Render-Durchgang,
// alle sechs Seiten auf einmal als sechs Farbziele (Kern-Grenzen: maxColorAttachments 8, maxColorAttachmentBytesPerSample 32 ≥ 6 × 2 Byte).
const HELL_WGSL = /* wgsl */`
@group(0) @binding(0) var src: texture_2d_array<f32>;
struct A { @location(0) a: vec4f, @location(1) b: vec4f, @location(2) c: vec4f, @location(3) d: vec4f, @location(4) e: vec4f, @location(5) f: vec4f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f { return vec4f(vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0, 0.0, 1.0); }
fn l(p: vec2i, f: i32) -> vec4f { return vec4f(dot(textureLoad(src, p, f, 0).rgb, vec3f(0.3, 0.59, 0.11)), 0.0, 0.0, 1.0); }
@fragment fn fs(@builtin(position) pos: vec4f) -> A {
  let p = vec2i(pos.xy);
  return A(l(p, 0), l(p, 1), l(p, 2), l(p, 3), l(p, 4), l(p, 5));
}`;
interface Hell { n: number; tex: GPUTexture; cube: GPUTextureView; seiten: GPUTextureView[]; pipe: GPURenderPipeline; leer: GPUTextureView; quelle: Map<GPUTexture, GPUBindGroup> }
const hellJe = new WeakMap<App, Hell>();

/** Helligkeits-Würfel des gezeigten Farbstoffs, neu gerechnet je Aufruf; nur wenn das mehrstufige Relief an ist, sonst ein leerer Würfel. */
export function helligkeit(app: App, enc: GPUCommandEncoder, dye: CubeField): GPUTextureView {
  let h = hellJe.get(app);
  if (!h) {
    const m = app.device.createShaderModule({ label: 'helligkeit', code: HELL_WGSL });
    const pipe = app.device.createRenderPipeline({ layout: 'auto', vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fs', targets: Array(6).fill({ format: 'r16float' }) }, primitive: { topology: 'triangle-list' } });
    const leer = app.device.createTexture({ size: [1, 1, 6], format: 'r16float', usage: GPUTextureUsage.TEXTURE_BINDING }).createView({ dimension: 'cube' });
    h = { n: 0, tex: null as unknown as GPUTexture, cube: leer, seiten: [], pipe, leer, quelle: new Map() };
    hellJe.set(app, h);
  }
  if (renderVarianten(app.preset, app.S).relief !== 'mehrstufig' || app.S.view !== 0) return h.leer;
  if (h.n !== dye.n) {
    h.tex?.destroy(); h.quelle.clear();
    h.n = dye.n;
    h.tex = app.device.createTexture({ size: [dye.n, dye.n, 6], format: 'r16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    h.cube = h.tex.createView({ dimension: 'cube' });
    h.seiten = [0, 1, 2, 3, 4, 5].map((f) => h!.tex.createView({ dimension: '2d', baseArrayLayer: f, arrayLayerCount: 1 }));
  }
  let bg = h.quelle.get(dye.tex);
  if (!bg) {
    if (h.quelle.size > 8) h.quelle.clear();
    bg = app.device.createBindGroup({ layout: h.pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: dye.store }] });
    h.quelle.set(dye.tex, bg);
  }
  const p = enc.beginRenderPass({ colorAttachments: h.seiten.map((view) => ({ view, loadOp: 'clear' as const, storeOp: 'store' as const })) });
  p.setPipeline(h.pipe); p.setBindGroup(0, bg); p.draw(3); p.end();
  return h.cube;
}

/** Bindungen der Darstellung für die gezeigten Felder; himmel nur mit zwischengespeichertem Himmel (Bindung 7). */
export function bildBindung(app: App, bild: { dye: CubeField; flow: CubeField; prs: CubeField }, hell: GPUTextureView, himmel: GPUTextureView | null = null): GPUBindGroup {
  return app.device.createBindGroup({
    layout: app.renderPipe.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: app.renderBuf } },
      { binding: 1, resource: app.sampler },
      { binding: 2, resource: bild.dye.cube },
      { binding: 3, resource: bild.flow.cube },
      { binding: 4, resource: app.aux.cube },
      { binding: 5, resource: bild.prs.cube },
      { binding: 6, resource: app.sky.view },
      ...(himmel ? [{ binding: 7, resource: himmel }] : []),
      { binding: 8, resource: hell },
    ],
  });
}

/** Ein Bild: Simulationsschritt(e) und Darstellung. */
export function frameOnce(app: App, real: number) {
  const ov = app.ansicht;
  app.buildRenderPipe();   // Darstellungs-Bausteine an/aus: Pipeline nur neu bauen, wenn sich ein Schalter geändert hat
  app.initIfNeeded();
  if (!app.S.fxSimSplit) verteilenAus(app); else if (app.S.paused) abschliessen(app);
  let flowSrc = app.flowMode() === 'fluid' ? app.vel[app.vc] : app.flow;
  let n = 0;
  if (!app.S.paused) {
    // Die Simulation läuft in Echtzeit: 60 Schritte pro Sekunde mal Zeitraffer, unabhängig von
    // der Bildrate (bis v0.2.3 war es ein Schritt pro Bild, bei 240 fps lief alles viermal so
    // schnell). Jeder Schritt ist gleich groß, der Zeitraffer ändert also nicht die Physik,
    // sondern nur, wie viel Simulationszeit pro Sekunde vergeht. Im Testmodus: fester Takt.
    app.stepAcc += (app.testTakt ? Math.max(1, app.S.timeScale) : real * 60 * Math.max(1, app.S.timeScale)) / takt(app.S);
    // Obergrenze aus der gemessenen Schrittzeit, damit das Bild flüssig bleibt.
    const cap = Math.max(1, Math.min(64, Math.floor(12 / Math.max(app.stepMs, 0.1))));
    n = Math.min(Math.floor(app.stepAcc), cap);
    app.stepAcc = Math.min(app.stepAcc - n, 2);
    if (app.S.fxSimSplit) {
      verteilt(app, n);
      flowSrc = app.flowMode() === 'fluid' ? app.vel[app.vc] : app.flow;
    } else for (let k = 0; k < n; k++) flowSrc = app.submitStep();
  }
  app.achieved = app.achieved * 0.97 + (real > 0 ? (n * app.dtStep() / real) : 0) * 0.03;
  // Sichtbare Drehung in Simulationszeit: Zeitraffer beschleunigt Wolken und Drehung gleich.
  app.spin += n * app.dtStep() * drehrate(app);
  if (grafikNoetig(app.S)) { zeichneGrafik(app, flowSrc); return; }
  grafikAus(app);
  const bild = gezeigt(app, flowSrc);
  const enc = app.device.createCommandEncoder();
  app.sky.tick(enc);
  app.writeRender();

  const rbg = bildBindung(app, bild, helligkeit(app, enc, bild.dye));
  const rp = enc.beginRenderPass({
    colorAttachments: [{ view: app.targetView(), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, app.S.transparent ? 0 : 1] }],
  });
  rp.setPipeline(app.renderPipe);
  rp.setBindGroup(0, rbg);
  if (ov?.ausschnitt) rp.setScissorRect(...ov.ausschnitt);   // eingebettet: nur die Fläche des Planeten rechnen
  rp.draw(3);
  rp.end();
  app.device.queue.submit([enc.finish()]);
}

export function targetView(app: App): GPUTextureView {
  if (!app.offscreen) return app.ctx!.getCurrentTexture().createView();
  if (!app.target || app.target.width !== app.W || app.target.height !== app.H) {
    app.target?.destroy();
    app.target = app.device.createTexture({
      size: [app.W, app.H], format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
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
