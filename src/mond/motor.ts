// Motor des Mond-Generators: WebGPU-Gerät, Karten-Erzeugung (Compute, eine Würfelseite pro Bild), Mipmaps, Zeichnen, Nachbearbeitung.
// Karten (Würfelkugel, 6 Seiten): A = Höhe + Gefälle (rgba16float), B = Albedo + Glanz (rgba8unorm), C = Glühen, Rauheit, Eis (rgba8unorm).
import { Sky } from '../sky/sky';
import { MP_VEC4, aktive, bakeShader, mpDaten, MIP_WGSL } from './kode';
import { sceneShader, POST_WGSL } from './zeichnen';
import { erstelleKamera } from './kamera';
import { seedZahl } from './zustand';
import type { Block, Settings } from './typen';

const MIPS = (n: number) => Math.floor(Math.log2(n)) + 1;

const T0 = performance.now();
const dbg = (...a: unknown[]) => { if (/debug/.test(location.search)) console.info(`[${((performance.now() - T0) / 1000).toFixed(1)}s]`, ...a); };

export interface Meldung { (text: string, fehler?: boolean): void }

export class Motor {
  dev!: GPUDevice;
  ctx!: GPUCanvasContext;
  format!: GPUTextureFormat;
  N = 0;
  tA!: GPUTexture; tB!: GPUTexture; tC!: GPUTexture;
  hdr: GPUTexture | null = null; hdrW = 0; hdrH = 0;
  sky!: Sky;
  smp!: GPUSampler;
  uBake!: GPUBuffer; uMP!: GPUBuffer; uRU!: GPUBuffer; uPost!: GPUBuffer; stats!: GPUBuffer; statsRead!: GPUBuffer;
  lBake!: GPUBindGroupLayout; lScene!: GPUBindGroupLayout; lPost!: GPUBindGroupLayout; lMip!: GPUBindGroupLayout;
  pBake: GPUComputePipeline | null = null;
  pScene: GPURenderPipeline | null = null;
  pPost!: GPURenderPipeline;
  pPostLdr!: GPURenderPipeline;
  pMip: Record<string, GPUComputePipeline> = {};
  bgBake: GPUBindGroup[] = []; bgScene: GPUBindGroup | null = null; bgPost: GPUBindGroup | null = null;
  pipeKey = ''; bauKey = '';
  bake = { face: 6, token: 0, mips: true, aktiv: false };
  hmax = 0.1; hmin = 0.1; statsPending = false;
  bereit = false;          // erste Karte fertig
  S: Settings;
  block: Block[] = [];
  zeit = 0; spin = 0; fps = 0; frameMs = 16;
  letzteBewegung = 0;
  cam!: ReturnType<typeof erstelleKamera>;
  skyN = 512;
  seedSky = '';
  scale = 1;
  schaut = true;
  fehler: string | null = null;
  readonly meldung: Meldung;

  constructor(readonly canvas: HTMLCanvasElement, S: Settings, meldung: Meldung) {
    this.S = S; this.meldung = meldung;
  }

  async start() {
    if (!navigator.gpu) throw new Error('WebGPU nicht verfügbar');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('Kein WebGPU-Adapter');
    this.dev = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: Math.min(8192, adapter.limits.maxTextureDimension2D) } });
    this.dev.lost.then((i) => this.meldung('GPU verloren: ' + i.message, true));
    this.dev.addEventListener('uncapturederror', (e) => { const m = (e as GPUUncapturedErrorEvent).error.message; this.fehler = m; console.error('WebGPU:', m); this.meldung('WebGPU: ' + m.slice(0, 400), true); });
    this.ctx = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device: this.dev, format: this.format, alphaMode: 'opaque', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const d = this.dev;
    this.smp = d.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    const buf = (size: number, usage: number) => d.createBuffer({ size, usage });
    this.uBake = buf(256 * 6, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.uMP = buf(MP_VEC4 * 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.uRU = buf(9 * 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.uPost = buf(16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.stats = buf(16, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC);
    this.statsRead = buf(16, GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST);
    const C = GPUShaderStage.COMPUTE, F = GPUShaderStage.FRAGMENT, V = GPUShaderStage.VERTEX;
    const tex2a = { sampleType: 'float' as const, viewDimension: '2d-array' as const };
    const st = (format: GPUTextureFormat) => ({ access: 'write-only' as const, format, viewDimension: '2d-array' as const });
    this.lBake = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: C, buffer: { type: 'uniform' } }, { binding: 1, visibility: C, buffer: { type: 'uniform' } },
      { binding: 2, visibility: C, storageTexture: st('rgba16float') }, { binding: 3, visibility: C, storageTexture: st('rgba8unorm') },
      { binding: 4, visibility: C, storageTexture: st('rgba8unorm') }, { binding: 5, visibility: C, buffer: { type: 'storage' } },
    ] });
    this.lScene = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: V | F, buffer: { type: 'uniform' } }, { binding: 1, visibility: F, buffer: { type: 'uniform' } },
      { binding: 2, visibility: F, texture: tex2a }, { binding: 3, visibility: F, texture: tex2a }, { binding: 4, visibility: F, texture: tex2a },
      { binding: 5, visibility: F, sampler: { type: 'filtering' } }, { binding: 6, visibility: F, texture: tex2a },
    ] });
    this.lPost = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: F, buffer: { type: 'uniform' } }, { binding: 1, visibility: F, texture: { sampleType: 'float' } },
      { binding: 2, visibility: F, sampler: { type: 'filtering' } },
    ] });
    this.lMip = d.createBindGroupLayout({ entries: [
      { binding: 0, visibility: C, texture: tex2a }, { binding: 1, visibility: C, storageTexture: st('rgba16float') },
    ] });
    // Mipmap-Pipelines je Format
    for (const fmt of ['rgba16float', 'rgba8unorm']) {
      const lay = fmt === 'rgba16float' ? this.lMip : d.createBindGroupLayout({ entries: [
        { binding: 0, visibility: C, texture: tex2a }, { binding: 1, visibility: C, storageTexture: st('rgba8unorm') }] });
      this.pMip[fmt] = d.createComputePipeline({ layout: d.createPipelineLayout({ bindGroupLayouts: [lay] }), compute: { module: d.createShaderModule({ code: MIP_WGSL(fmt) }), entryPoint: 'mip' } });
    }
    this.pPost = await d.createRenderPipelineAsync({
      layout: d.createPipelineLayout({ bindGroupLayouts: [this.lPost] }),
      vertex: { module: d.createShaderModule({ code: POST_WGSL }), entryPoint: 'vs' },
      fragment: { module: d.createShaderModule({ code: POST_WGSL }), entryPoint: 'fsPost', targets: [{ format: this.format }] },
    });
    const pm = d.createShaderModule({ code: POST_WGSL });
    this.pPostLdr = d.createRenderPipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [this.lPost] }),
      vertex: { module: pm, entryPoint: 'vs' }, fragment: { module: pm, entryPoint: 'fsPost', targets: [{ format: 'rgba8unorm' }] },
    });
    this.sky = new Sky(d, this.skyN);
    this.cam = erstelleKamera(this.canvas, () => 1 + this.hmax + 0.015);
    this.allocate(Number(this.S.res));
    await this.pipelines();
  }

  // ---------------------------------------------------------------- Karten
  allocate(N: number) {
    if (N === this.N && this.tA) return;
    this.tA?.destroy(); this.tB?.destroy(); this.tC?.destroy();
    const mk = (fmt: GPUTextureFormat) => this.dev.createTexture({ size: [N, N, 6], format: fmt, mipLevelCount: MIPS(N), usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
    this.tA = mk('rgba16float'); this.tB = mk('rgba8unorm'); this.tC = mk('rgba8unorm');
    this.N = N;
    this.bgScene = null;
    this.bgBake = [];
  }

  /** Pipelines für die eingeschalteten Bausteine (neu übersetzen, wenn sich die Menge ändert). */
  async pipelines() {
    const act = aktive(this.S);
    const key = act.map((b) => b.id).join(',');
    if (key === this.pipeKey && this.pBake && this.pScene) return;
    const d = this.dev;
    this.meldung(`Übersetze Shader (${act.length} Bausteine) …`);
    dbg('pipelines start', key);
    const mod = (code: string, name: string) => d.createShaderModule({ code, label: name });
    const bm = mod(bakeShader(act), 'bake');
    const sm = mod(sceneShader(act), 'szene');
    const fehler = async () => {
      const out: string[] = [];
      for (const [n, m] of [['bake', bm], ['szene', sm]] as const) {
        const info = await m.getCompilationInfo();
        for (const x of info.messages) if (x.type === 'error') out.push(`${n}:${x.lineNum}:${x.linePos} ${x.message}`);
      }
      return out;
    };
    try {
      const [pb, ps] = await Promise.all([
        d.createComputePipelineAsync({ layout: d.createPipelineLayout({ bindGroupLayouts: [this.lBake] }), compute: { module: bm, entryPoint: 'bake' } }),
        d.createRenderPipelineAsync({
          layout: d.createPipelineLayout({ bindGroupLayouts: [this.lScene] }),
          vertex: { module: sm, entryPoint: 'vs' },
          fragment: { module: sm, entryPoint: 'fsScene', targets: [{ format: 'rgba16float' }] },
        }),
      ]);
      this.pBake = pb; this.pScene = ps; this.pipeKey = key; this.block = act;
      this.bgBake = []; this.bgScene = null;
      this.meldung('');
      dbg('pipelines fertig');
    } catch (e) {
      const f = await fehler();
      console.error(f.join('\n'));
      this.meldung('Shader: ' + (f.slice(0, 6).join('\n') || String((e as Error).message)), true);
      throw e;
    }
  }

  /** Neue Karte anfordern (Regler, Seed oder Bausteine haben sich geändert). */
  neueKarte() {
    this.bake.token++;
    this.bake.face = 0; this.bake.mips = false; this.bake.aktiv = true;
    const seed = String(this.S.seed);
    if (seed !== this.seedSky) { this.seedSky = seed; this.sky.generate('mond:' + seed); }
  }

  private bgBakeFor(face: number): GPUBindGroup {
    if (!this.bgBake[face]) {
      this.bgBake[face] = this.dev.createBindGroup({ layout: this.lBake, entries: [
        { binding: 0, resource: { buffer: this.uBake, offset: face * 256, size: 16 } }, { binding: 1, resource: { buffer: this.uMP } },
        { binding: 2, resource: this.tA.createView({ dimension: '2d-array', baseMipLevel: 0, mipLevelCount: 1 }) },
        { binding: 3, resource: this.tB.createView({ dimension: '2d-array', baseMipLevel: 0, mipLevelCount: 1 }) },
        { binding: 4, resource: this.tC.createView({ dimension: '2d-array', baseMipLevel: 0, mipLevelCount: 1 }) },
        { binding: 5, resource: { buffer: this.stats } },
      ] });
    }
    return this.bgBake[face];
  }

  /** Eine Würfelseite berechnen (oder die Mipmaps, wenn alle Seiten fertig sind). */
  private bakeSchritt(enc: GPUCommandEncoder) {
    const b = this.bake;
    if (!b.aktiv || !this.pBake) return;
    const d = this.dev, N = this.N;
    if (b.face === 0) {
      d.queue.writeBuffer(this.uMP, 0, mpDaten(this.S));
      d.queue.writeBuffer(this.stats, 0, new Uint32Array(4));
      const u = new Float32Array(64 * 6);
      for (let f = 0; f < 6; f++) u.set([N, f, seedZahl(String(this.S.seed)), 0.3 * (Math.PI / 2) / N], f * 64);
      d.queue.writeBuffer(this.uBake, 0, u);
    }
    if (b.face < 6) {
      const pass = enc.beginComputePass();
      dbg('bake Seite', b.face);
      pass.setPipeline(this.pBake);
      pass.setBindGroup(0, this.bgBakeFor(b.face));
      pass.dispatchWorkgroups(Math.ceil(N / 8), Math.ceil(N / 8));
      pass.end();
      b.face++;
      return;
    }
    // Mipmaps
    dbg('mips');
    const levels = MIPS(N);
    for (const [tx, fmt] of [[this.tA, 'rgba16float'], [this.tB, 'rgba8unorm'], [this.tC, 'rgba8unorm']] as const) {
      const pl = this.pMip[fmt];
      const pass = enc.beginComputePass();
      pass.setPipeline(pl);
      for (let l = 1; l < levels; l++) {
        const sz = Math.max(1, N >> l);
        pass.setBindGroup(0, d.createBindGroup({ layout: pl.getBindGroupLayout(0), entries: [
          { binding: 0, resource: tx.createView({ dimension: '2d-array', baseMipLevel: l - 1, mipLevelCount: 1 }) },
          { binding: 1, resource: tx.createView({ dimension: '2d-array', baseMipLevel: l, mipLevelCount: 1 }) },
        ] }));
        pass.dispatchWorkgroups(Math.ceil(sz / 8), Math.ceil(sz / 8), 6);
      }
      pass.end();
    }
    enc.copyBufferToBuffer(this.stats, 0, this.statsRead, 0, 16);
    b.aktiv = false; b.mips = true;
    this.statsPending = true;
    this.bereit = true;
    dbg('karte fertig');
  }

  private async liesStats() {
    if (!this.statsPending) return;
    this.statsPending = false;
    await this.statsRead.mapAsync(GPUMapMode.READ);
    const u = new Uint32Array(this.statsRead.getMappedRange().slice(0));
    this.statsRead.unmap();
    const f = new Float32Array(u.buffer);
    this.hmax = Math.max(0.002, f[0] * 1.05 + 0.0005);
    this.hmin = Math.max(0.0, f[1]);
  }

  // ---------------------------------------------------------------- Zeichnen
  private hdrSicherstellen(w: number, h: number) {
    if (this.hdr && this.hdrW === w && this.hdrH === h) return;
    this.hdr?.destroy();
    this.hdr = this.dev.createTexture({ size: [w, h], format: 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    this.hdrW = w; this.hdrH = h; this.bgPost = null;
  }

  private ruDaten(w: number, h: number): Float32Array<ArrayBuffer> {
    const S = this.S, cam = this.cam.cam;
    const fov = Number(S.fov) * Math.PI / 180;
    const tanY = Math.tan(fov / 2), tanX = tanY * (w / h);
    const pos: [number, number, number] = [cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
    const nrm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const fwd = nrm([-pos[0], -pos[1], -pos[2]]);
    const right = nrm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    // Sonne: Richtung relativ zur Anfangsblickrichtung (feste Welt), Azimut um die Hochachse, Höhe darüber
    const az = Number(S.sonneAz) * Math.PI / 180, el = Number(S.sonneEl) * Math.PI / 180;
    const sun = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    const pixAng = 2 * tanY / h;
    const a = new Float32Array(36);
    a.set([...pos, pixAng], 0);
    a.set([...fwd, this.hmax], 4);
    a.set([right[0] * tanX, right[1] * tanX, right[2] * tanX, this.hmin], 8);
    a.set([up[0] * tanY, up[1] * tanY, up[2] * tanY, this.N], 12);
    a.set([...sun, Number(S.sonne)], 16);
    a.set([seedZahl(String(S.seed)), this.spin, Number(S.planetenlicht), Number(S.glanz)], 20);
    a.set([Number(S.schatten), Number(S.ao), Number(S.relief), Number(S.detail)], 24);
    a.set([w, h, Number(S.sterne), this.sky.ready ? this.skyN : 0], 28);
    a.set([this.zeit, Number(S.belichtung), 0, 0], 32);
    return a;
  }

  /** Ein Bild zeichnen. `ziel` = Leinwand (Standard) oder eine eigene Textur (für Bildaufnahmen). */
  zeichne(enc: GPUCommandEncoder, ziel: GPUTextureView, w: number, h: number, skala: number) {
    if (!this.pScene) return;
    const d = this.dev;
    const sw = Math.max(2, Math.floor(w * skala)), sh = Math.max(2, Math.floor(h * skala));
    const maxS = Math.max(1, Number(this.S.kante));
    this.hdrSicherstellen(Math.ceil(w * maxS), Math.ceil(h * maxS));
    d.queue.writeBuffer(this.uRU, 0, this.ruDaten(sw, sh));
    d.queue.writeBuffer(this.uMP, 0, mpDaten(this.S));
    d.queue.writeBuffer(this.uPost, 0, new Float32Array([Number(this.S.belichtung), sw / this.hdrW, sh / this.hdrH, skala]));
    if (!this.bgScene) {
      this.bgScene = d.createBindGroup({ layout: this.lScene, entries: [
        { binding: 0, resource: { buffer: this.uRU } }, { binding: 1, resource: { buffer: this.uMP } },
        { binding: 2, resource: this.tA.createView({ dimension: '2d-array' }) }, { binding: 3, resource: this.tB.createView({ dimension: '2d-array' }) },
        { binding: 4, resource: this.tC.createView({ dimension: '2d-array' }) }, { binding: 5, resource: this.smp },
        { binding: 6, resource: this.sky.view },
      ] });
    }
    if (!this.bgPost) this.bgPost = d.createBindGroup({ layout: this.lPost, entries: [
      { binding: 0, resource: { buffer: this.uPost } }, { binding: 1, resource: this.hdr!.createView() }, { binding: 2, resource: this.smp }] });
    {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.hdr!.createView(), loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }] });
      pass.setViewport(0, 0, sw, sh, 0, 1);
      pass.setScissorRect(0, 0, sw, sh);
      pass.setPipeline(this.pScene);
      pass.setBindGroup(0, this.bgScene);
      pass.draw(3);
      pass.end();
    }
    {
      const pass = enc.beginRenderPass({ colorAttachments: [{ view: ziel, loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }] });
      pass.setPipeline(this.pPost);
      pass.setBindGroup(0, this.bgPost);
      pass.draw(3);
      pass.end();
    }
  }

  /** Ein Bild der Schleife: Karten, Himmel, Zeichnen. */
  bild(dt: number) {
    const S = this.S;
    this.zeit += dt;
    this.spin += dt * Number(S.drehung);
    this.cam.schritt(dt);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.floor(this.canvas.clientWidth * dpr)), h = Math.max(2, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const ruhig = performance.now() - Math.max(this.cam.cam.bewegt, this.letzteBewegung) > 250 && Math.abs(Number(S.drehung)) < 0.001;
    const skala = Number(S.kante) > 1 && (ruhig || this.zeit < 0) ? Number(S.kante) : 1;
    const enc = this.dev.createCommandEncoder();
    this.bakeSchritt(enc);
    this.sky.tick(enc);
    this.zeichne(enc, this.ctx.getCurrentTexture().createView(), w, h, skala);
    this.dev.queue.submit([enc.finish()]);
    if (/debug/.test(location.search) && this.bake.aktiv) void this.dev.queue.onSubmittedWorkDone().then(() => dbg('Seite fertig, face=', this.bake.face));
    void this.liesStats();
  }

  /** Bildaufnahme in fester Größe (für Tests und Export): liefert RGBA-Bytes. */
  async aufnahme(w: number, h: number, skala = 1): Promise<Uint8Array> {
    const d = this.dev;
    dbg('aufnahme start', w, h);
    const tex = d.createTexture({ size: [w, h], format: 'rgba8unorm', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const pp = this.pPostLdr;
    const keep = this.pPost; this.pPost = pp;
    const enc = d.createCommandEncoder();
    this.zeichne(enc, tex.createView(), w, h, skala);
    const bpr = Math.ceil(w * 4 / 256) * 256;
    const rb = d.createBuffer({ size: bpr * h, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    enc.copyTextureToBuffer({ texture: tex }, { buffer: rb, bytesPerRow: bpr }, [w, h]);
    d.queue.submit([enc.finish()]);
    this.pPost = keep;
    dbg('aufnahme submit');
    await d.queue.onSubmittedWorkDone();
    dbg('aufnahme gpu fertig');
    await rb.mapAsync(GPUMapMode.READ);
    dbg('aufnahme gelesen');
    const src = new Uint8Array(rb.getMappedRange());
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) out.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4);
    rb.unmap(); rb.destroy(); tex.destroy();
    return out;
  }
}
