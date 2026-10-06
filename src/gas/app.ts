import { presets, TABLE, type Preset, type RandomOptions } from '../presets';
import { type Vec3 } from '../math';
import { Panel } from '../ui';
import { Sky } from '../sky/sky';
import { S, isPhone, WARM_STEPS, SIM_FLOATS, RENDER_FLOATS, type Key, type CubeField, type FilmOptions, type Filmstrip, type Storm } from './zustand';
import { canvas } from './dom';
import { onChange } from './reaktion';
import { buildUI } from './menue';
import { updateInfo } from './menue/steckbrief';
import { buildToolbar, resetSettings } from './menue/knopfleiste';
import { updateVisibility } from './menue/sichtbarkeit';
import { applyStaticText, toggleLang } from './menue/sprache';
import { formulaNote, diagNote } from './menue/anmerkungen';
import { bindInput, zoom } from './eingabe';
import { stateKey, db, fieldsToKeep, readField, saveState, loadState } from './merken';
import { starteSchleife, initIfNeeded, warmBatch, skip } from './schleife';
import { frameCount, selftest, runSelftest } from './pruefung';
import { grabFrame, filmstrip, recordFilmstrip } from './film';
import { writeRender, frameOnce, targetView, readRow, capture } from './darstellung';
import { writeSim, bind, run2D, initFields, step, dtStep, simStep, submitStep } from './sim';
import { activeStorms, faceMainStorm, updateStorms } from './stuerme';
import { randomOptions, applyPreset, usePreset, writeTables, camBody, jetAt } from './planet';
import { flowMode, lookMode, dir } from './modi';
import { applyQuality, calibrate, adaptScale, resize } from './qualitaet';
import { cubeField, allocVel, memoryNote, allocDye, allocParticles } from './felder';
import { buildPipes, buildRenderPipe, module } from './pipelines';
import { snapshot, remember, undo, redo, updateUndoButtons, restore, encode, decode, loadSaves, storeSaves, buildSaveSection } from './verlauf';

// ---------------------------------------------------------------------------
// Einstellungen (alles, was ein Regler verändern kann)
// ---------------------------------------------------------------------------

declare const __VERSION__: string;

export class App {
  // Testmodus #offscreen: rendert in eine Textur statt auf den Canvas (für Headless-Browser).
  offscreen = location.hash.startsWith('#offscreen');
  // Testmodus: #offscreen&warm=300 verkürzt das Vorrechnen (Software-Renderer sind langsam).
  warmSteps = Number(new URLSearchParams(location.hash.slice(1)).get('warm')) || WARM_STEPS;
  format: GPUTextureFormat = this.offscreen ? 'rgba8unorm' : navigator.gpu.getPreferredCanvasFormat();
  target: GPUTexture | null = null;
  ctx = canvas.getContext('webgpu') as GPUCanvasContext;
  sampler: GPUSampler;
  simBuf: GPUBuffer;
  renderBuf: GPUBuffer;
  simData = new Float32Array(SIM_FLOATS);
  renderData = new Float32Array(RENDER_FLOATS);

  computeLayout: GPUBindGroupLayout;
  fluidModule!: GPUShaderModule;
  tracerModule!: GPUShaderModule;
  pipes: Record<string, GPUComputePipeline> = {};
  pipesBuilt: string | null = null;
  renderPipe!: GPURenderPipeline;
  renderPipeLayout: GPUPipelineLayout;
  renderKey: string | null = null;
  sky!: Sky;

  vel: CubeField[] = [];
  prs: CubeField[] = [];
  aux!: CubeField;
  div!: CubeField;
  dye: CubeField[] = [];
  flow!: CubeField;
  dummy: CubeField;
  parts!: GPUBuffer;
  zonal: GPUBuffer;
  partCapacity = 0;
  vc = 0; pc = 0; dc = 0;

  preset: Preset = presets[0];
  storms: Storm[] = [];
  stepAcc = 0;
  needsDye = false;
  time = 0;
  frame = 0;
  spin = 0;
  runSeed = 0;         // "Neu starten": neuer Lauf, gleicher Planet
  achieved = 1;        // tatsächlich erreichter Zeitraffer
  needsInit = true;
  warm = 0;
  // Vorrechnen: Schritte pro Auftrag, so bemessen, dass ein Auftrag ~40 ms GPU-Zeit braucht.
  warmRate = 4;
  warmTotal = WARM_STEPS;
  stepMs = 0;          // gemessene GPU-Zeit pro Simulationsschritt
  warmStart = 0;
  manualSkip = false;  // Vorspulen per Knopf: volle Länge, keine Begrenzung der Ladezeit
  calibrated = false;
  downgrades = 0;
  renderScale = 1;     // dynamische Render-Auflösung für ≥ 60 fps
  scaleAcc = 0; scaleFrames = 0; goodSeconds = 0;
  cam = { yaw: -0.35, pitch: 0.12, dist: 4.3 };
  dpr = 1.75;
  panel!: Panel;

  constructor(public device: GPUDevice) {
    if (!this.offscreen) this.ctx.configure({ device, format: this.format, alphaMode: 'opaque' });
    // clamp-to-edge: im Flächeninneren wird nie über den Rand hinaus gefiltert (das übernimmt sampleCube).
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    this.simBuf = device.createBuffer({ size: SIM_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.renderBuf = device.createBuffer({ size: RENDER_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const C = GPUShaderStage.COMPUTE;
    this.computeLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: C, buffer: { type: 'uniform' } },
        { binding: 1, visibility: C, sampler: { type: 'filtering' } },
        { binding: 2, visibility: C, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 3, visibility: C, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 4, visibility: C, storageTexture: { access: 'write-only', format: 'rgba16float', viewDimension: '2d-array' } },
        { binding: 5, visibility: C, buffer: { type: 'storage' } },
        { binding: 6, visibility: C, texture: { sampleType: 'float', viewDimension: '2d-array' } },
        { binding: 7, visibility: C, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      ],
    });
    this.buildPipes(false);

    const F = GPUShaderStage.FRAGMENT;
    this.renderPipeLayout = device.createPipelineLayout({ bindGroupLayouts: [device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: F, buffer: { type: 'uniform' } },
        { binding: 1, visibility: F, sampler: { type: 'filtering' } },
        { binding: 2, visibility: F, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 3, visibility: F, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 4, visibility: F, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 5, visibility: F, texture: { sampleType: 'float', viewDimension: 'cube' } },
        { binding: 6, visibility: F, texture: { sampleType: 'float', viewDimension: '2d-array' } },
      ],
    })] });
    this.sky = new Sky(device, isPhone ? 512 : 1024);
    this.sky.generate(String(S.seed) + S.preset);
    this.dummy = this.cubeField(8);
    this.zonal = device.createBuffer({ size: 128 * 2 * 4, usage: GPUBufferUsage.STORAGE });
    this.applyQuality(true);  // Startwerte der Geräteklasse schon beim Laden
    this.applyPreset();
    this.buildUI();
    this.bindInput();
    this.remember();
  }

  buildPipes(seamless: boolean) { return buildPipes(this, seamless); }
  buildRenderPipe() { return buildRenderPipe(this); }

  module(label: string, code: string): GPUShaderModule { return module(this, label, code); }

  cubeField(n: number): CubeField { return cubeField(this, n); }

  // ---------- Ressourcen passend zu den Reglern ----------

  applyQuality(fromUI: boolean) { return applyQuality(this, fromUI); }

  allocVel() { return allocVel(this); }

  memoryNote() { return memoryNote(this); }

  allocDye() { return allocDye(this); }

  allocParticles() { return allocParticles(this); }

  flowMode(): 'fluid' | 'curl' { return flowMode(this); }
  lookMode(): 'dye' | 'particles' | 'pure' { return lookMode(this); }
  dir(): number { return dir(this); }

  randomOptions(): RandomOptions { return randomOptions(this); }

  applyPreset() { return applyPreset(this); }

  usePreset(p: Preset) { return usePreset(this, p); }

  // ---------- Verlauf, Speichern, Planeten-Code ----------

  history: string[] = [];
  hIndex = -1;
  hTimer = 0;

  snapshot(): string { return snapshot(this); }

  remember() { return remember(this); }

  undo() { return undo(this); }
  redo() { return redo(this); }

  updateUndoButtons() { return updateUndoButtons(this); }

  restore(json: string) { return restore(this, json); }

  encode(json: string): string { return encode(this, json); }

  decode(code: string): string { return decode(this, code); }

  loadSaves(): { name: string; code: string }[] { return loadSaves(this); }

  storeSaves(list: { name: string; code: string }[]) { return storeSaves(this, list); }

  buildSaveSection() { return buildSaveSection(this); }

  jets: Float32Array = new Float32Array(TABLE);

  centre: [number, number, number] = [0.5, 0.5, 0.5];

  writeTables() { return writeTables(this); }

  camBody(): Vec3 { return camBody(this); }

  jetAt(latRad: number): number { return jetAt(this, latRad); }

  // ---------- Uniforms ----------

  writeSim(dt: number, init = false) { return writeSim(this, dt, init); }

  activeStorms(): Storm[] { return activeStorms(this); }

  faceMainStorm() { return faceMainStorm(this); }

  updateStorms(dt: number) { return updateStorms(this, dt); }

  writeRender() { return writeRender(this); }

  // ---------- Compute-Helfer ----------

  bind(a: CubeField | null, b: CubeField | null, dst: CubeField, buf: GPUBuffer = this.zonal): GPUBindGroup { return bind(this, a, b, dst, buf); }

  run2D(pass: GPUComputePassEncoder, pipe: string, a: CubeField | null, b: CubeField | null, dst: CubeField) { return run2D(this, pass, pipe, a, b, dst); }

  initFields(enc: GPUCommandEncoder, all: boolean) { return initFields(this, enc, all); }

  step(enc: GPUCommandEncoder) { return step(this, enc); }

  // ---------- Hauptschleife ----------

  last = performance.now();
  grab: (() => Promise<void>) | null = null;
  fpsNow = 0;

  frameCount() { return frameCount(this); }

  grabFrame(): Promise<HTMLCanvasElement> { return grabFrame(this); }

  filmstrip(o: FilmOptions = {}): Promise<Filmstrip> { return filmstrip(this, o); }

  recordFilmstrip() { return recordFilmstrip(this); }

  selftest(): Promise<{ edge: number; interior: number; seamless: boolean }> { return selftest(this); }

  runSelftest() { return runSelftest(this); }
  fpsAcc = 0; fpsFrames = 0;

  run() { return starteSchleife(this); }

  initIfNeeded() { return initIfNeeded(this); }

  // ---------- Modul „Zustand merken“ (IndexedDB, nur in diesem Browser) ----------
  restored = false;
  stateKey(): string { return stateKey(this); }
  db(): Promise<IDBDatabase> { return db(this); }
  fieldsToKeep(): CubeField[] { return fieldsToKeep(this); }
  readField(f: CubeField): Promise<ArrayBuffer> { return readField(this, f); }
  saveState() { return saveState(this); }
  loadState() { return loadState(this); }

  warmBatch() { return warmBatch(this); }

  calibrate() { return calibrate(this); }

  adaptScale(real: number) { return adaptScale(this, real); }

  dtStep(): number { return dtStep(this); }

  simStep(enc: GPUCommandEncoder): CubeField { return simStep(this, enc); }

  submitStep(): CubeField { return submitStep(this); }

  frameOnce(real: number) { return frameOnce(this, real); }

  targetView(): GPUTextureView { return targetView(this); }

  readRow(which: 'dye' | 'flow' | 'vel', face: number, y: number): Promise<number[][]> { return readRow(this, which, face, y); }

  capture(): Promise<string> { return capture(this); }

  resize() { return resize(this); }

  // ---------- Bedienung ----------

  bindInput() { return bindInput(this); }

  zoom(f: number) { return zoom(this, f); }

  buildUI() { return buildUI(this); }

  formulaNote(f: string): HTMLElement { return formulaNote(this, f); }

  diagNote(): HTMLElement { return diagNote(this); }

  applyStaticText() { return applyStaticText(this); }

  updateInfo() { return updateInfo(this); }

  updateVisibility() { return updateVisibility(this); }

  skip(seconds: number) { return skip(this, seconds); }

  buildToolbar() { return buildToolbar(this); }

  resetSettings() { return resetSettings(this); }

  toggleLang() { return toggleLang(this); }

  onChange(key: Key) { return onChange(this, key); }
}
