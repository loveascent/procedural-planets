import { t, setLang } from '../i18n';
import { COMMON } from './shader/common.js';
import { TEXH } from './shader/texh.js';
import { NOISE } from './shader/noise.js';
import { VOLC, VOLC_AUS } from './shader/volc.js';
import { HYDRO_WARP } from './shader/hydro.js';
import { WELLEN, WELLEN_AUS } from './shader/wellen.js';
import { WOLKEN, WOLKEN_AUS } from './shader/wolken.js';
import { BLOOM, BLOOM_AUS } from './shader/bloom.js';
import { FLARE, FLARE_AUS } from './shader/flare.js';
import { SCHATTEN, SCHATTEN_AUS } from './shader/schatten.js';
import { SAUM, SAUM_AUS } from './shader/saum.js';
import { EROSION, EROSION_AUS } from './shader/erosion.js';
import { FLUSS_GEN, FLUSS_GEN_AUS, FLUSS_SZENE, FLUSS_SZENE_AUS } from './shader/fluss.js';
import { STIL_ORIGINAL, STIL_ORIGINAL_AUS } from './shader/stil_original.js';
import { TERRASSEN, TERRASSEN_AUS } from './shader/terrassen.js';
import { FEINDETAIL, FEINDETAIL_AUS } from './shader/feindetail.js';
import { WASSER, WASSER_AUS } from './shader/wasser.js';
import { BRANDUNG, BRANDUNG_AUS } from './shader/brandung.js';
import { MEEREIS, MEEREIS_AUS } from './shader/meereis.js';
import { KAVITAET, KAVITAET_AUS } from './shader/kavitaet.js';
import { GEOMORPH, GEOMORPH_AUS } from './shader/geomorph.js';
import { RELIEF, RELIEF_AUS } from './shader/relief.js';
import { HIMMEL, HIMMEL_AUS } from './shader/himmel.js';
import { SONNE, SONNE_AUS } from './shader/sonne.js';
import { BIOM_CD, BIOM_CD_AUS, BIOM_ERDE, BIOM_ERDE_AUS } from './shader/biom.js';
import { GEBIRGE, GEBIRGE_AUS } from './shader/gebirge.js';
import { ANSICHTEN_DEBUG, ANSICHTEN_DEBUG_AUS } from './shader/ansichten_debug.js';
import { STIL_ORIGINAL_WOLKEN, STIL_ORIGINAL_WOLKEN_AUS, STIL_ORIGINAL_LEUCHTSAUM, STIL_ORIGINAL_LEUCHTSAUM_AUS } from './shader/stil_original_nachbild.js';
import { GEN } from './shader/gen.js';
import { CLOUDGEN } from './shader/cloudgen.js';
import { TRANS } from './shader/trans.js';
import { MIP } from './shader/mip.js';
import { UDECL } from './shader/udecl.js';
import { ATMO, ATMO_AUS, ATMO_POST, ATMO_POST_AUS } from './shader/atmo.js';
import { SCENE } from './shader/scene.js';
import { POST } from './shader/post.js';
import { PATCH_G } from './shader/patch.js';
import { createMenu } from './menue/aufbau.js';
import { createZustand } from './zustand/zustand.js';
import { createFluesse } from './fluesse/fluesse.js';
import { createRessourcen } from './ressourcen/ressourcen.js';
import { createGpuStart } from './gpustart/gpustart.js';
import { createNetz } from './netz/netz.js';
import { createRechnen } from './rechnen/rechnen.js';
import { createBiom } from './biom/biom.js';
import { createNeuberechnung } from './neuberechnung/neuberechnung.js';
import { createReaktion } from './reaktion/reaktion.js';
import { createSchleife } from './schleife/schleife.js';
import { createZeichnen } from './zeichnen/zeichnen.js';
import { createErzeugung } from './erzeugung/erzeugung.js';
import { createKamera } from './kamera/kamera.js';
import { createZiele } from './ziele/ziele.js';
import { createAtmosphaere } from './atmosphaere/atmosphaere.js';
import { createWirbel } from './wirbel/wirbel.js';
import { planetParams } from './logik/zufall.js';
import { SKY_GEN_WGSL, SKY_DRAW_WGSL, skyParams } from '../sky/sky';
// Startet erst, wenn die gemeinsame Seite diesen Körper zeigt (sonst liefe er im selben Bündel mit).
// opts.kopflos = { device, breite, hoehe, seed }: eingebettet in die Welt-Schicht (gemeinsames Gerät, kein Menü, keine Seite, kein eigener Bildtakt);
// dann liefert run() ein Versprechen auf die Instanz (Schnittstelle `api` unten).
export function run(opts = {}) {
const kopflos = opts.kopflos || null;
// ============================================================================================
// Prozedurale Planeten, nachgebaut nach colordodge "ProceduralPlanet" (three.js, WTFPL) und erweitert.
//
// Verfahren des Originals (so übernommen):
//   Würfel-Kugel: sechs Würfelseiten, jede bekommt eigene Karten. Höhe und Feuchte sind je eine
//   Mischung aus zwei fBm-Feldern (Simplex, 16 Oktaven, wahlweise "ridged") mit einem dritten Feld
//   als Mischmaske. Ein zufällig gemaltes Biom-Bild (x = Feuchte, y = Höhe; Farbverläufe, Kreise,
//   Wasser-, Strand- und Binnenland-Band) färbt. Normalen: Sobel über Höhe + Bildhelligkeit,
//   Wasser glatt. Rauigkeit und Metall aus der Wasserlinie. Dazu Wolken, Leuchtsaum, Nebel,
//   Sterne, Sonne mit Blendenflecken, dat.GUI-Ordner Lighting/Camera/Material/Debug/Environment.
//
// "+20 %" (Verbessert):
//   Meeresspiegel als Regler (fehlte), live. Wasser mit Beer-Lambert-Tiefenfarbe, GGX-Sonnenglitzern,
//   Fresnel, Wellen und Brandung. Erosionsrinnen (Gavoronoise nach Clay John / Fewes, auf die Kugel
//   übertragen), Detail-Oktaven zur Laufzeit, Geländeschatten, Terrassen. Atmosphäre mit Rayleigh-,
//   Mie- und Ozon-Streuung (Transmissions-Tabelle nach Bruneton). Wolken mit Zonalwinden
//   (Passat/Westwind/polare Ostwinde), Klimabändern, Wolkenschatten und Vorwärtsstreuung.
//   Nebel und Sterne bleiben stehen, nur der Planet dreht sich, ruhig.
//
// Technik: WebGPU. Karten (Höhe, Feuchte, Wolken, Nebel, Luft-Tabelle) entstehen in Compute-Shadern,
// in Kacheln verteilt auf viele Bilder, damit die Seite flüssig bleibt. Bild in HDR, dann Luft, Überstrahlung, Filmkurve.
//
// Fremder Code in dieser Datei (beide MIT-Lizenz):
//   snoise(): 3D-Simplexrauschen aus webgl-noise (hier nach WGSL übertragen), Copyright (C) 2011 Ashima Arts (Ian McEwan),
//             Copyright (C) 2011-2022 Stefan Gustavson; Gradientenversion nach Gustavson.
//   hash33(), hash13(): "Hash without Sine", Copyright (c) 2014 David Hoskins.
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction, including
//   without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//   copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
//   following conditions: The above copyright notice and this permission notice shall be included in all
//   copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
//   ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
//   FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
//   LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
//   ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// ============================================================================================

const Q = kopflos
  ? new URLSearchParams({ offscreen: '1', seed: String(kopflos.seed), nebula: '0', stars: '0', flare: '0', res: String(kopflos.aufloesung || 1024), cres: '1024', nres: '64' })
  : new URLSearchParams(location.search);
const coarse = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

// ------------------------------------------------------------------ Zustand & Voreinstellungen
const { S, DEF, randomSeed, cloudRes, nebRes } = createZustand(Q, coarse);
if (kopflos) { S.modSun = false; S.rotate = false; }   // Sonne und Drehung kommen von der Welt


let PP = planetParams(S.seed);

// ------------------------------------------------------------------ Oberfläche (Texte, Regler)
const ersatz = new Map();
// Ohne die Seite des Planeten (eingebettet) gibt es unsichtbare Ersatzelemente statt null
const $ = (id) => (kopflos && id === 'panel-body' && kopflos.menuWurzel) || document.getElementById(kopflos ? '' : id) || (kopflos ? (ersatz.get(id) ?? (ersatz.set(id, document.createElement('div')), ersatz.get(id))) : null);



// Biom-Bild (wie im Original als 2D-Canvas gemalt), auch im Debug-Ordner sichtbar
const lutCanvas = document.createElement('canvas');
lutCanvas.id = 'lut';
lutCanvas.width = 512; lutCanvas.height = 512;
lutCanvas.setAttribute('aria-label', 'Biome image');

const menu = createMenu({ kopflos, S, DEF, getPP: () => PP, newSeed: (...a) => newSeed(...a), setStyle: (...a) => setStyle(...a), changed: (...a) => changed(...a), randomSeed, lutCanvas, coarse, $ });
const buildUI = kopflos ? () => { if (kopflos.menuWurzel) menu.buildUI(); } : menu.buildUI;

// ------------------------------------------------------------------ WebGPU
const canvas = kopflos ? Object.assign(document.createElement('canvas'), { width: kopflos.breite, height: kopflos.hoehe }) : $('view');
function fail(msg) { const el = $('status'); el.hidden = false; el.textContent = msg; throw new Error(msg); }

// ---------------------------------------------------------------- WGSL: Grundlagen
// ---------------------------------------------------------------- WGSL: liegt in ./shader/ (ein Baustein je Datei)

// ------------------------------------------------------------------ GPU-Objekte
let device, adapter, context, format, P, L;
const OFFSCREEN = Q.has('offscreen');
let ansicht = null;   // eingebettet: Kamera, Sonne und Drehung von der Welt (siehe zeichnen.js)
// Kantenglättung der Szene (MSAA): glättet Planetenrand, Bergsilhouetten und Wolkenränder; Nachbearbeitung läuft auf dem aufgelösten Bild
const MSAA = Number(Q.get('msaa')) === 4 ? 4 : 1;   // Standard aus (wie vor v24); ?msaa=4 bzw. Regler schaltet ein
const GPU_RS = {};
const VF = 3;          // GPUShaderStage.VERTEX | FRAGMENT
const mipLevels = (n) => Math.floor(Math.log2(n)) + 1;
const J_SLOTS = 1024, J_STRIDE = 256;
let jBuf, jSlot = 0;
let uBuf, uData = new Float32Array(204), dPlanet, dCloud, ppDummy, samp;

const { initGPU, makeLayouts, startPipelines, neueVarianten } = createGpuStart({ fail, OFFSCREEN, kopflos, canvas, S, VF, COMMON, NOISE, GEN, CLOUDGEN, SKY_GEN_WGSL, TRANS, MIP, UDECL, TEXH, VOLC, VOLC_AUS, HYDRO_WARP, WELLEN, WELLEN_AUS, ATMO, ATMO_AUS, ATMO_POST, ATMO_POST_AUS, BLOOM, BLOOM_AUS, FLARE, FLARE_AUS, SCHATTEN, SCHATTEN_AUS, SAUM, SAUM_AUS, EROSION, EROSION_AUS, FLUSS_GEN, FLUSS_GEN_AUS, FLUSS_SZENE, FLUSS_SZENE_AUS, STIL_ORIGINAL, STIL_ORIGINAL_AUS, TERRASSEN, TERRASSEN_AUS, FEINDETAIL, FEINDETAIL_AUS, WASSER, WASSER_AUS, BRANDUNG, BRANDUNG_AUS, MEEREIS, MEEREIS_AUS, KAVITAET, KAVITAET_AUS, GEOMORPH, GEOMORPH_AUS, RELIEF, RELIEF_AUS, HIMMEL, HIMMEL_AUS, SONNE, SONNE_AUS, BIOM_CD, BIOM_CD_AUS, BIOM_ERDE, BIOM_ERDE_AUS, GEBIRGE, GEBIRGE_AUS, STIL_ORIGINAL_WOLKEN, STIL_ORIGINAL_WOLKEN_AUS, STIL_ORIGINAL_LEUCHTSAUM, STIL_ORIGINAL_LEUCHTSAUM_AUS, ANSICHTEN_DEBUG, ANSICHTEN_DEBUG_AUS, WOLKEN, WOLKEN_AUS, SCENE, SKY_DRAW_WGSL, POST, MSAA, get adapter() { return adapter; }, set adapter(v) { adapter = v; }, get device() { return device; }, set device(v) { device = v; }, get format() { return format; }, set format(v) { format = v; }, get context() { return context; }, set context(v) { context = v; }, get L() { return L; }, set L(v) { L = v; } });

function texArray(N, fmt, levels, extra = 0) {
  return device.createTexture({ size: [N, N, 6], format: fmt, mipLevelCount: levels,
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | extra });
}
const arrView = (tx) => tx.createView({ dimension: '2d-array' });
// Schreibziel für Compute: nur die oberste Mip-Ebene
const lvl0 = (tx) => tx.createView({ dimension: '2d-array', baseMipLevel: 0, mipLevelCount: 1 });
// Bindungen der Höhenkarten-Erzeugung: Ziel + Flusskarte (Eintiefung, Wasserspiegel)
const genBG = (target, hydro) => device.createBindGroup({ layout: L.genH, entries: [
  { binding: 0, resource: { buffer: jBuf, size: 160 } }, { binding: 1, resource: target },
  { binding: 2, resource: arrView(hydro || RS.hydroNone) }, { binding: 3, resource: samp },
] });
const ubuf = (size) => device.createBuffer({ size, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
let texIds = 0;
const tagged = (tx) => { tx.fgpId = ++texIds; return tx; };

let meshPlanet, meshCloud;
const { cubeSphere, patchGrid, SPLIT, buildPatches } = createNetz({ coarse, get device() { return device; }, set device(v) { device = v; } });

// ------------------------------------------------------------------ Ressourcen
const RS = { nPrev: 128, nFull: 0, fullReady: false, cloudReady: false, nebReady: false, transKey: '', w: 0, h: 0 };
const { initResources, mainGroup } = createRessourcen({ J_SLOTS, J_STRIDE, ubuf, RS, tagged, texArray, mipLevels, cloudRes, nebRes, genBG, lvl0, arrView, patchGrid, PATCH_G, cubeSphere, coarse, get samp() { return samp; }, set samp(v) { samp = v; }, get device() { return device; }, set device(v) { device = v; }, get jBuf() { return jBuf; }, set jBuf(v) { jBuf = v; }, get uBuf() { return uBuf; }, set uBuf(v) { uBuf = v; }, get uData() { return uData; }, set uData(v) { uData = v; }, get dPlanet() { return dPlanet; }, set dPlanet(v) { dPlanet = v; }, get dCloud() { return dCloud; }, set dCloud(v) { dCloud = v; }, get ppDummy() { return ppDummy; }, set ppDummy(v) { ppDummy = v; }, get L() { return L; }, set L(v) { L = v; }, get meshPlanet() { return meshPlanet; }, set meshPlanet(v) { meshPlanet = v; }, get meshCloud() { return meshCloud; }, set meshCloud(v) { meshCloud = v; } });

const { makeCtx, dispatch, genMips, tileParams } = createRechnen({ J_STRIDE, J_SLOTS, get jSlot() { return jSlot; }, set jSlot(v) { jSlot = v; }, get device() { return device; }, set device(v) { device = v; }, get jBuf() { return jBuf; }, set jBuf(v) { jBuf = v; } });

const { drawBiome } = createBiom({ lutCanvas, RS, get device() { return device; }, set device(v) { device = v; } });

// ------------------------------------------------------------------ Erzeugung (in Kacheln, damit die Seite flüssig bleibt)
let jobs = [], jobTotal = 0, jobDone = 0, genToken = 0, regenBusy = 0;
let cdf = null, moistQ = [0, 1];
let seaH = 0.5;
let lutDirty = false;

const { eroOct, genParams, queueTiles, runJobs, quantile, seaFromFraction, makeFullMap, queueSky } = createErzeugung({ S, dispatch, tileParams, makeCtx, J_SLOTS, texArray, mipLevels, tagged, RS, skyParams, nebRes, get PP() { return PP; }, set PP(v) { PP = v; }, get seaH() { return seaH; }, set seaH(v) { seaH = v; }, get genToken() { return genToken; }, set genToken(v) { genToken = v; }, get jobs() { return jobs; }, set jobs(v) { jobs = v; }, get jobTotal() { return jobTotal; }, set jobTotal(v) { jobTotal = v; }, get jobDone() { return jobDone; }, set jobDone(v) { jobDone = v; }, get cdf() { return cdf; }, set cdf(v) { cdf = v; }, get device() { return device; }, set device(v) { device = v; }, get P() { return P; }, set P(v) { P = v; } });

// ------------------------------------------------------------------ Flüsse und Seen (Baustein in ./fluesse/)
let riverT = 0;
const { buildRiverLines, buildHydro } = createFluesse({ S, RS, coarse, mipLevels, tagged, makeCtx, dispatch, genParams, genBG, tileParams,
  get device() { return device; }, get P() { return P; }, get moistQ() { return moistQ; }, get genToken() { return genToken; }, get seaH() { return seaH; } });

const { CLOUD_PERIOD, initCyclones, cycA, cycB, updateCyclones } = createWirbel({ S, get simTime() { return simTime; }, set simTime(v) { simTime = v; } });
// Ändert sich ein Baustein-Schalter, werden nur die betroffenen Pipelines neu übersetzt und in P ersetzt
async function variantenNachziehen() { const neu = await neueVarianten(); if (neu) Object.assign(P, neu); }
const { regenerate, wolkenErzeugen, himmelErzeugen } = createNeuberechnung({ S, RS, makeCtx, dispatch, tileParams, genParams, genMips, quantile, seaFromFraction, drawBiome, buildRiverLines, buildHydro, makeFullMap, genBG, lvl0, queueTiles, initCyclones, cloudRes, queueSky, variantenNachziehen, get genToken() { return genToken; }, set genToken(v) { genToken = v; }, get jobs() { return jobs; }, set jobs(v) { jobs = v; }, get jobTotal() { return jobTotal; }, set jobTotal(v) { jobTotal = v; }, get jobDone() { return jobDone; }, set jobDone(v) { jobDone = v; }, get regenBusy() { return regenBusy; }, set regenBusy(v) { regenBusy = v; }, get device() { return device; }, set device(v) { device = v; }, get P() { return P; }, set P(v) { P = v; }, get L() { return L; }, set L(v) { L = v; }, get cdf() { return cdf; }, set cdf(v) { cdf = v; }, get moistQ() { return moistQ; }, set moistQ(v) { moistQ = v; }, get PP() { return PP; }, set PP(v) { PP = v; }, get seaH() { return seaH; }, set seaH(v) { seaH = v; } });

const { atmoParams, updateTrans } = createAtmosphaere({ S, RS, dispatch, makeCtx, get P() { return P; }, set P(v) { P = v; } });

const { ensureTargets } = createZiele({ RS, MSAA, OFFSCREEN, ubuf, get device() { return device; }, set device(v) { device = v; }, get L() { return L; }, set L(v) { L = v; }, get format() { return format; }, get ppDummy() { return ppDummy; }, set ppDummy(v) { ppDummy = v; } });


const { cam, fitDist, pointers } = createKamera({ S, canvas });

const { changed, setStyle, newSeed } = createReaktion({ kopflos, variantenNachziehen, wolkenErzeugen, himmelErzeugen, S, RS, menu, regenerate, DEF, queueSky, seaFromFraction, buildRiverLines, buildUI, $, setLang, randomSeed, get device() { return device; }, set device(v) { device = v; }, get seaH() { return seaH; }, set seaH(v) { seaH = v; }, get lutDirty() { return lutDirty; }, set lutDirty(v) { lutDirty = v; }, get riverT() { return riverT; }, set riverT(v) { riverT = v; }, get PP() { return PP; }, set PP(v) { PP = v; } });


// ------------------------------------------------------------------ Zeichnen
let spin = 0.6, simTime = 0;
const { render } = createZeichnen({ get ansicht() { return ansicht; }, S, coarse, RS, eroOct, cloudRes, nebRes, cycA, cycB, canvas, ensureTargets, updateTrans, drawBiome, atmoParams, cam, fitDist, updateCyclones, CLOUD_PERIOD, SPLIT, mainGroup, buildPatches, PATCH_G, OFFSCREEN, get uData() { return uData; }, set uData(v) { uData = v; }, get simTime() { return simTime; }, set simTime(v) { simTime = v; }, get moistQ() { return moistQ; }, set moistQ(v) { moistQ = v; }, get PP() { return PP; }, set PP(v) { PP = v; }, get seaH() { return seaH; }, set seaH(v) { seaH = v; }, get device() { return device; }, set device(v) { device = v; }, get uBuf() { return uBuf; }, set uBuf(v) { uBuf = v; }, get lutDirty() { return lutDirty; }, set lutDirty(v) { lutDirty = v; }, get spin() { return spin; }, set spin(v) { spin = v; }, get dPlanet() { return dPlanet; }, set dPlanet(v) { dPlanet = v; }, get dCloud() { return dCloud; }, set dCloud(v) { dCloud = v; }, get P() { return P; }, set P(v) { P = v; }, get meshPlanet() { return meshPlanet; }, set meshPlanet(v) { meshPlanet = v; }, get meshCloud() { return meshCloud; }, set meshCloud(v) { meshCloud = v; }, get context() { return context; }, set context(v) { context = v; } });

// ------------------------------------------------------------------ Schleife
let last = performance.now(), budget = 256 * 256 * 2, fpsAcc = 0, fpsN = 0, fpsT = 0;
// Bildauflösung: fest oder automatisch (hält etwa 40–60 Bilder pro Sekunde)
const urlScale = Number(Q.get('scale')) || 0;
let dynScale = 1, perfT = 0, perfAcc = 0, perfN = 0;
const { step, planetsApi } = createSchleife({ get P() { return P; }, get seaH() { return seaH; }, variantenNachziehen, S, canvas, urlScale, coarse, pointers, cam, runJobs, $, OFFSCREEN, render, RS, buildUI, regenerate, newSeed, changed, fitDist, Q, get dynScale() { return dynScale; }, set dynScale(v) { dynScale = v; }, get jobs() { return jobs; }, set jobs(v) { jobs = v; }, get perfAcc() { return perfAcc; }, set perfAcc(v) { perfAcc = v; }, get perfN() { return perfN; }, set perfN(v) { perfN = v; }, get perfT() { return perfT; }, set perfT(v) { perfT = v; }, get last() { return last; }, set last(v) { last = v; }, get spin() { return spin; }, set spin(v) { spin = v; }, get simTime() { return simTime; }, set simTime(v) { simTime = v; }, get device() { return device; }, set device(v) { device = v; }, get budget() { return budget; }, set budget(v) { budget = v; }, get jobDone() { return jobDone; }, set jobDone(v) { jobDone = v; }, get jobTotal() { return jobTotal; }, set jobTotal(v) { jobTotal = v; }, get fpsAcc() { return fpsAcc; }, set fpsAcc(v) { fpsAcc = v; }, get fpsN() { return fpsN; }, set fpsN(v) { fpsN = v; }, get fpsT() { return fpsT; }, set fpsT(v) { fpsT = v; }, get regenBusy() { return regenBusy; }, set regenBusy(v) { regenBusy = v; }, get PP() { return PP; }, set PP(v) { PP = v; } });
async function boot() {
  await initGPU();
  makeLayouts();
  const { list, mods } = startPipelines();
  const names = Object.keys(list);
  let done = 0;
  const show = () => {
    $('genbar').hidden = false;
    $('gen-text').textContent = `${t('Übersetze Shader', 'Compiling shaders')} ${done}/${names.length}`;
    $('gen-fill').style.width = `${100 * done / names.length}%`;
  };
  show();
  try {
    const res = await Promise.all(names.map((k) => list[k].then((p) => { done++; show(); return p; })));
    P = Object.fromEntries(names.map((k, i) => [k, res[i]]));
  } catch (e) {
    const msgs = [];
    for (const [k, m] of Object.entries(mods)) {
      const info = await m.getCompilationInfo();
      for (const x of info.messages) if (x.type === 'error') msgs.push(`${k}:${x.lineNum}:${x.linePos} ${x.message}`);
    }
    console.error(msgs.join('\n'));
    fail('Shader: ' + (msgs.slice(0, 6).join('\n') || String(e.message || e)));
  }
  initResources();
  regenerate();
  if (!kopflos) { window.planets = planetsApi; requestAnimationFrame(step); }
}
if (!kopflos) { boot().catch((e) => { if (!$('status').textContent) fail(String(e.message || e)); }); return; }

// ------------------------------------------------------------------ Schnittstelle der eingebetteten Instanz
const api = {
  S,
  /** Pipelines übersetzt, Karten erzeugt (keine offenen Aufgaben) */
  get bereit() { return !!P && jobs.length === 0 && regenBusy === 0; },
  setzeGroesse(w, h) { canvas.width = w; canvas.height = h; },
  /** Steckbrief des echt berechneten Planeten als Zeilen. */
  fakten() {
    return [['Seed', String(S.seed)], ['Wasseranteil', `${Math.round(100 * PP.water)} %`], ['Wolkenbedeckung', `${Math.round(100 * S.cover)} %`], ['Gebirgsanteil', `${Math.round(100 * PP.mountains)} %`],
      ['Kartenauflösung', `${S.res}²`], ['Stil', S.style === 'orig' ? 'Original 1:1' : '+20 % besser'], ['Vulkane', S.volcanoOn ? `an (${Math.round(S.volcanoes * 100)} %)` : 'aus']];
  },
  /** Einen Regler von außen setzen (wie im Menü), z. B. die Kartenauflösung `res`. */
  setze(k, v) { S[k] = v; changed({ k }); },
  /** Das Menü des Gesteinsplaneten (alle Regler und Bausteine-Schalter) in `wurzel` aufbauen; null = entfernen. */
  menue(wurzel) { kopflos.menuWurzel = wurzel; if (wurzel) menu.buildUI(); },
  /** Neuer Planet aus dem Seed der Welt; die Karten entstehen in den nächsten Bildern (`arbeite`). */
  setzeSeed(seed) { newSeed(String(seed)); },
  /** Erzeugungsaufgaben im Zeitbudget (Pixel pro Aufruf) abarbeiten. */
  arbeite(pixel = 3e6) {
    if (!P || !jobs.length) return;
    const enc = device.createCommandEncoder();
    runJobs(enc, pixel);
    device.queue.submit([enc.finish()]);
  },
  /** Zeichnet aus der Kamera der Welt; Rückgabe: Textur (RGBA8, Hintergrund schwarz). */
  zeichne(a, dt) {
    ansicht = a; spin = a.drehung; simTime += dt;
    const enc = device.createCommandEncoder();
    render(enc);
    device.queue.submit([enc.finish()]);
    return RS.out;
  },
};
return boot().then(() => api);
}
