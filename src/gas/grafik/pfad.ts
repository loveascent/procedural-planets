// Zeichenweg des Gasriesen mit Grafik-Optionen. Ohne eingeschaltete Option wird er nicht betreten (darstellung.ts, wie bisher).
// Er entscheidet, was sich verträgt (wahl), zeichnet die Szene in der nötigen Auflösung, führt die zeitlichen Verfahren aus
// und übergibt das Bild an die gemeinsame Bildkette. Jede Zusatz-Ressource entsteht erst hier und verschwindet beim Ausschalten.
import type { App } from '../app';
import { Kette, type KettenWahl } from '../../grafik/kette';
import { invert, type Mat4 } from '../../math';
import type { CubeField } from '../zustand';
import { writeRender, kameraPose, drehrate, helligkeit, bildBindung, type Pose } from '../darstellung';
import type { Zusatz } from './zusatz';
import { AUFLOESEN, VERSCHIEBEN, M_FLOATS } from './zeitlich';
import { gezeigt, laeuft, nummer } from './sim';

/** Was nach den gegenseitigen Ausschlüssen wirklich läuft. Das Menü blendet dieselben Fälle aus (menue/grafik.ts). */
export function wahl(S: App['S']) {
  const flach = !S.map;
  const zeitlich: 'off' | 'taa' | 'taau' = !flach ? 'off' : S.fxUp === 'taau' ? 'taau' : S.fxAA === 'taa' ? 'taa' : 'off';
  const msaa = S.fxAA === 'msaa' && zeitlich === 'off';
  const muster = (flach && zeitlich === 'off' && !msaa ? S.fxPattern : 'off') as 'off' | 'checker' | 'lines';
  const fovea = S.fxFovea && flach && zeitlich === 'off' && muster === 'off' && !msaa;
  const gen = (flach ? S.fxGen : 'off') as 'off' | 'extra' | 'inter';
  const himmel = S.fxSkyCache && flach && zeitlich === 'off' && muster === 'off' && !fovea && (S.nebula > 0 || S.stars > 0);
  const rausch = S.fxDitherSteps && zeitlich !== 'off' && (S.arghOn || S.pomOn);
  const zwischen = S.fxSimInterp && flach;
  return { zeitlich, msaa, muster, fovea, gen, himmel, rausch, zwischen };
}

/** Braucht das Zeichnen den Grafik-Weg? (Die Simulations-Schalter allein nicht.) */
export function grafikNoetig(S: App['S']): boolean {
  return S.fxUp !== 'off' || S.fxAA !== 'off' || S.fxSharpOn || S.fxDither || S.fxPattern !== 'off' || S.fxGen !== 'off'
    || S.fxFovea || S.fxSkyCache || S.fxSimInterp || S.fxBundle;
}

/** Zusätze für die Render-Pipeline (undefined = Pipeline wie ohne Grafik-Optionen). */
export function zusatz(a: App): Zusatz | undefined {
  if (!grafikNoetig(a.S)) return undefined;
  const w = wahl(a.S);
  const fein = w.zeitlich !== 'off' || w.muster !== 'off' || w.gen !== 'off' || a.S.fxDither;   // Zwischenergebnisse in 16 Bit
  return { zwischen: w.zwischen, muster: w.muster, rausch: w.rausch, himmel: w.himmel, format: fein ? 'rgba16float' : a.format, proben: w.msaa ? 4 : 1 };
}

type Bildpose = Pose & { t: number; contT: number; contSpin: number; breite: number };

/** Zusätze, die writeRender für ein einzelnes Bild braucht. */
export interface Lauf {
  pixH: number;                        // Bildhöhe, aus der der Pixelwinkel folgt
  ziel: [number, number];              // wirklich gezeichnete Größe
  jitter: [number, number] | null;
  bildNr: number; tau: number; muster: number; dSpin: number;
  pose: Pose | null;                   // füllt writeRender aus
}

export interface Gfx {
  kette: Kette;
  ubuf: Map<string, GPUBuffer>;
  pipes: Map<string, GPURenderPipeline>;
  bundles: Map<string, GPURenderBundle>;
  bild: number;          // Zähler echter Bilder
  zyklus: number;        // Zähler angezeigter Bilder (Zwischenbilder)
  echtJe: number;        // echte Bilder je angezeigtem (für die Anzeige)
  verlauf: number; verlaufOk: string;
  vorher: Bildpose | null;
  erzeugt: Bildpose[];   // Posen der letzten zwei echten Bilder für Zwischenbilder
  erzeugtIdx: number;
  himmelKey: string;
}

export function grafikAus(a: App) {
  const g = a.gfx;
  if (!g) return;
  g.kette.zerstoeren();
  for (const b of g.ubuf.values()) b.destroy();
  a.gfx = null;
}

const neu = (a: App): Gfx => ({ kette: new Kette(a.device), ubuf: new Map(), pipes: new Map(), bundles: new Map(), bild: 0, zyklus: 0, echtJe: 1, verlauf: 0, verlaufOk: '', vorher: null, erzeugt: [], erzeugtIdx: 0, himmelKey: '' });

// Halton-Folge (2, 3), 8 Werte, Bereich −0,5…0,5 Pixel (Survey 3.1: Standard der Unreal Engine 4)
function halton(i: number, basis: number): number {
  let f = 1, r = 0;
  for (let n = i; n > 0; n = Math.floor(n / basis)) { f /= basis; r += f * (n % basis); }
  return r;
}

/** Einen Bewegungs-Block (struct M) füllen. */
function block(d: Float32Array, o: number, jetzt: Pose, alt: Pose, g: number[], j: number[], ring: number[], s: number[]) {
  d.set(jetzt.inv, o);
  d.set(invert(alt.inv) as Mat4, o + 16);
  d.set([...jetzt.auge, 1, ...alt.auge, 1], o + 32);
  d.set(jetzt.zeilen.flatMap((z) => [...z, 0]), o + 40);
  d.set(alt.zeilen.flatMap((z) => [...z, 0]), o + 52);
  d.set([...g, ...j, ...ring, ...s], o + 64);
}

function zeitDurchgang(a: App, g: Gfx, enc: GPUCommandEncoder, name: 'aufloesen' | 'verschieben', daten: Float32Array, wind: CubeField, t1: GPUTextureView, t2: GPUTextureView, ziel: GPUTextureView) {
  let pipe = g.pipes.get(name);
  if (!pipe) {
    const module = a.module(name, name === 'aufloesen' ? AUFLOESEN : VERSCHIEBEN);
    pipe = a.device.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] } });
    g.pipes.set(name, pipe);
  }
  let u = g.ubuf.get(name);
  if (!u) { u = a.device.createBuffer({ size: M_FLOATS * 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); g.ubuf.set(name, u); }
  a.device.queue.writeBuffer(u, 0, daten as Float32Array<ArrayBuffer>);
  const bg = a.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [
    { binding: 0, resource: { buffer: u } }, { binding: 1, resource: a.sampler }, { binding: 2, resource: wind.cube },
    { binding: 3, resource: t1 }, { binding: 4, resource: t2 }] });
  const p = enc.beginRenderPass({ colorAttachments: [{ view: ziel, loadOp: 'clear', storeOp: 'store' }] });
  p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end();
}

/** Die Szene (Planet, Himmel, Ringe) mit der Render-Pipeline in ein Ziel zeichnen. */
function szene(a: App, g: Gfx, enc: GPUCommandEncoder, z: Zusatz, bild: { dye: CubeField; flow: CubeField; prs: CubeField }, ziel: GPUTextureView, msaa: GPUTextureView | null, himmel: GPUTextureView | null, ausschnitt?: number[]) {
  const hell = helligkeit(a, enc, bild.dye);
  const teile: object[] = [a.renderPipe, hell, bild.dye.tex, bild.flow.tex, bild.prs.tex, a.aux.tex, ...(himmel ? [himmel] : [])];
  const bindung = () => bildBindung(a, bild, hell, himmel);
  const rp = enc.beginRenderPass({
    colorAttachments: [{ view: msaa ?? ziel, ...(msaa ? { resolveTarget: ziel } : {}), loadOp: 'clear', storeOp: msaa ? 'discard' : 'store', clearValue: [0, 0, 0, a.S.transparent ? 0 : 1] }],
  });
  if (ausschnitt) rp.setScissorRect(ausschnitt[0], ausschnitt[1], ausschnitt[2], ausschnitt[3]);
  if (a.S.fxBundle) {   // Render-Bundle: die drei Befehle einmal aufzeichnen, je Kombination der Felder wiederverwenden
    const key = [...teile.map(nummer), z.format, z.proben].join(' ');
    let b = g.bundles.get(key);
    if (!b) {
      const be = a.device.createRenderBundleEncoder({ colorFormats: [z.format], sampleCount: z.proben });
      be.setPipeline(a.renderPipe); be.setBindGroup(0, bindung()); be.draw(3);
      b = be.finish();
      if (g.bundles.size > 32) g.bundles.clear();
      g.bundles.set(key, b);
    }
    rp.executeBundles([b]);
  } else {
    rp.setPipeline(a.renderPipe); rp.setBindGroup(0, bindung()); rp.draw(3);
  }
  rp.end();
}

/** Himmel einmal in eine Textur rechnen und nur erneuern, wenn sich Blick, Größe, Helligkeit oder Karte ändern. */
function himmelCache(a: App, g: Gfx, enc: GPUCommandEncoder, w: number, h: number): GPUTextureView | null {
  const pipe = a.himmelPipe;
  if (!pipe) return null;
  const t = g.kette.holen('himmel', w, h);
  const d = a.renderData;
  const key = [w, h, ...d.subarray(0, 20), d[16 + 4 * 11 + 1], d[16 + 4 * 11 + 2], d[16 + 4 * 11 + 3], d[16 + 4 * 12], a.sky.stand, a.renderKey].join(',');
  if (t.neu || key !== g.himmelKey) {
    g.himmelKey = key;
    const bg = a.device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: a.renderBuf } }, { binding: 1, resource: a.sampler }, { binding: 6, resource: a.sky.view }] });
    const p = enc.beginRenderPass({ colorAttachments: [{ view: t.v, loadOp: 'clear', storeOp: 'store' }] });
    p.setPipeline(pipe); p.setBindGroup(0, bg); p.draw(3); p.end();
  }
  return t.v;
}

/** Ein angezeigtes Bild mit Grafik-Optionen (ersetzt das Zeichnen in frameOnce). */
export function zeichneGrafik(a: App, flowSrc: CubeField) {
  const g = (a.gfx ??= neu(a));
  const z = zusatz(a)!, w = wahl(a.S), S = a.S, K = g.kette;
  const W = a.W, H = a.H;
  const rs = S.fxDynIntern && S.autoQuality ? a.renderScale : 1;
  const mass = S.fxUp !== 'off' ? S.fxScale * rs : 1;
  const iw = Math.max(16, Math.round(W * mass)), ih = Math.max(16, Math.round(H * mass));
  const gw = Math.max(16, Math.round(iw * S.fxFoveaScale)), gh = Math.max(16, Math.round(ih * S.fxFoveaScale));   // grobes Fovea-Bild
  const rw = w.muster === 'checker' ? Math.ceil(iw / 2) : iw, rh = w.muster === 'lines' ? Math.ceil(ih / 2) : ih;
  const sw = w.zeitlich === 'taau' ? W : iw, sh = w.zeitlich === 'taau' ? H : ih;
  const o: KettenWahl = { up: S.fxUp, aa: w.zeitlich === 'off' ? S.fxAA : 'off', scharf: S.fxSharpOn, staerke: S.fxSharp, dither: S.fxDither, f16: S.fxF16 };
  const direkt = w.zeitlich === 'off' && w.muster === 'off' && w.gen === 'off' && !w.fovea && !Kette.noetig(o, iw, ih, W, H) && z.format === a.format;

  const n = Math.max(2, Math.min(4, Math.round(S.fxGenN)));
  const lage = w.gen === 'off' ? 0 : g.zyklus % n;
  const echt = lage === 0 || !g.erzeugt.length || g.erzeugt[g.erzeugt.length - 1].breite !== sw;
  g.zyklus++;
  g.echtJe = w.gen === 'off' ? 1 : n;

  // Anzeigezeit: die Simulation steht nur alle paar Bilder auf einem neuen Stand; „frac“ ist der Bruchteil bis zum nächsten Schritt
  const dt = a.dtStep(), rate = drehrate(a);
  const frac = Math.min(1, Math.max(0, a.stepAcc));
  const nach = laeuft(a) ? 1 : 0;                          // verteilter Schritt: gezeigt wird noch der vorige Stand
  const contT = a.time + frac * dt, contSpin = a.spin + frac * dt * rate;
  const tau = w.zwischen ? (frac + nach) * dt : 0;
  const tZeig = w.zwischen ? contT : a.time - nach * dt;
  const dSpin = w.zwischen ? frac * dt * rate : -nach * dt * rate;

  const enc = a.device.createCommandEncoder();
  a.sky.tick(enc);
  const bild = gezeigt(a, flowSrc);
  const ring = a.preset.rings;
  const ringWerte = [ring ? ring.inner : 0, ring ? ring.outer : 0, ring ? ring.opacity : 0, 0];
  const c = 1 - a.preset.oblateness;
  let quelle: { t: GPUTexture; v: GPUTextureView } | null = null;

  if (echt) {
    const phase = g.bild & 1;
    const j = (g.bild % 8) + 1;
    const jitter: [number, number] | null = w.zeitlich !== 'off' ? [halton(j, 2) - 0.5, halton(j, 3) - 0.5] : null;
    const muster = w.muster === 'off' ? 0 : (2 / (w.muster === 'checker' ? iw : ih)) * (phase ? -1 : 1);
    const lauf: Lauf = { pixH: w.zeitlich === 'taau' ? H : ih, ziel: [rw, rh], jitter, bildNr: g.bild, tau, muster, dSpin, pose: null };
    g.bild++;
    a.lauf = lauf;
    if (w.fovea) {
      // grobes Gesamtbild in einem eigenen Auftrag (eigene Pixelgröße für Sterne und Ringe)
      lauf.pixH = gh;
      writeRender(a);
      const e2 = a.device.createCommandEncoder();
      szene(a, g, e2, z, bild, K.holen('fovea-grob', gw, gh, z.format).v, null, null);
      a.device.queue.submit([e2.finish()]);
      lauf.pixH = ih;
    }
    writeRender(a);
    const himmel = w.himmel ? himmelCache(a, g, enc, rw, rh) : null;
    const roh = direkt ? null : K.holen('szene', rw, rh, z.format);
    const msaa = w.msaa ? K.holen('msaa', rw, rh, z.format, 4).v : null;
    if (w.fovea) {
      const r = Math.min(1, S.fxFoveaRadius);
      const R = Math.ceil((r * ih) / 2);
      const x0 = Math.max(0, Math.floor(iw / 2) - R), y0 = Math.max(0, Math.floor(ih / 2) - R);
      const scharf = K.holen('fovea-fein', iw, ih, z.format);
      szene(a, g, enc, z, bild, scharf.v, msaa, himmel, [x0, y0, Math.min(iw - x0, 2 * R + 1), Math.min(ih - y0, 2 * R + 1)]);
      const grob = K.holen('fovea-grob', gw, gh, z.format);
      K.stufe(enc, 'fovea', scharf.v, roh!.v, z.format, [iw, ih, iw, ih], [0, 0.08, r, 0], grob.v);
    } else szene(a, g, enc, z, bild, roh ? roh.v : a.targetView(), msaa, himmel, direkt ? a.ansicht?.ausschnitt : undefined);   // eingebettet: nur die Fläche des Planeten
    quelle = roh;
    const pose: Bildpose = { ...lauf.pose!, t: tZeig, contT, contSpin, breite: sw };
    a.lauf = null;

    if (w.zeitlich !== 'off' || w.muster !== 'off') {
      const art = w.zeitlich === 'taa' ? 0 : w.zeitlich === 'taau' ? 1 : w.muster === 'checker' ? 2 : 3;
      const h0 = K.holen('verlauf0', sw, sh), h1 = K.holen('verlauf1', sw, sh);
      // Verlauf verwerfen bei neuem Planeten, Neustart, anderer Größe oder anderem Verfahren
      const ok = [art, sw, sh, rw, rh, a.preset.name, a.S.seed, a.runSeed].join(' ');
      const gueltig = !h0.neu && !h1.neu && ok === g.verlaufOk && !!g.vorher && pose.t >= g.vorher.t;
      g.verlaufOk = ok;
      const [alt, ziel] = g.verlauf ? [h1, h0] : [h0, h1];
      g.verlauf = 1 - g.verlauf;
      const vorher = gueltig ? g.vorher! : pose;
      const d = new Float32Array(M_FLOATS * 2);
      const still = pose.t === vorher.t && pose.inv.every((x, i) => x === vorher.inv[i]) && pose.zeilen.join() === vorher.zeilen.join();
      block(d, 0, pose, vorher, [c, pose.t - vorher.t, S.fxAlpha, art], [jitter ? jitter[0] : 0, jitter ? jitter[1] : 0, phase, gueltig ? 1 : 0], [ringWerte[0], ringWerte[1], ringWerte[2], still ? 1 : 0], [rw, rh, sw, sh]);
      zeitDurchgang(a, g, enc, 'aufloesen', d, bild.flow, quelle!.v, alt.v, ziel.v);
      quelle = ziel;
    }
    g.vorher = pose;

    if (w.gen !== 'off') {
      if (g.erzeugt.length && g.erzeugt[g.erzeugt.length - 1].breite !== sw) g.erzeugt = [];
      g.erzeugtIdx = 1 - g.erzeugtIdx;
      const kopie = K.holen(`erzeugt${g.erzeugtIdx}`, sw, sh);
      enc.copyTextureToTexture({ texture: quelle!.t }, { texture: kopie.t }, [sw, sh, 1]);
      g.erzeugt.push(pose);
      if (g.erzeugt.length > 2) g.erzeugt.shift();
    }
  }

  if (w.gen !== 'off') {
    // jedes angezeigte Bild ist eine Verschiebung: Extrapolation auf „jetzt“, Interpolation zwischen den letzten zwei echten Bildern
    const neuP = g.erzeugt[g.erzeugt.length - 1], altP = g.erzeugt[0];
    const inter = w.gen === 'inter' && g.erzeugt.length > 1;
    const alpha = inter ? lage / n : 1;
    const zielT = inter ? altP.contT + alpha * (neuP.contT - altP.contT) : contT;
    const zielSpin = inter ? altP.contSpin + alpha * (neuP.contSpin - altP.contSpin) : contSpin;
    const ziel = kameraPose(a, zielSpin);
    const idxNeu = g.erzeugtIdx, idxAlt = g.erzeugt.length > 1 ? 1 - g.erzeugtIdx : g.erzeugtIdx;
    const tNeu = K.holen(`erzeugt${idxNeu}`, sw, sh), tAlt = K.holen(`erzeugt${idxAlt}`, sw, sh);
    const aus = K.holen('verschoben', sw, sh);
    const d = new Float32Array(M_FLOATS * 2);
    block(d, 0, ziel, altP, [c, zielT - altP.t, 0, 0], [0, 0, 0, 1], ringWerte, [sw, sh, sw, sh]);
    block(d, M_FLOATS, ziel, neuP, [c, zielT - neuP.t, alpha, 0], [0, 0, 0, 1], ringWerte, [sw, sh, sw, sh]);
    zeitDurchgang(a, g, enc, 'verschieben', d, bild.flow, tAlt.v, tNeu.v, aus.v);
    quelle = aus;
  }

  if (!direkt) K.zeichne(enc, quelle!.v, sw, sh, a.targetView(), a.format, W, H, o);
  a.device.queue.submit([enc.finish()]);
  // Nur an echten Bildern aufräumen: dazwischen werden die Zwischenergebnisse noch gebraucht
  if (echt) K.aufraeumen();
}

// ---------- Stillstand ----------
let ruheSig = '', ruheZahl = 0;
/** Ändert sich nichts mehr am Bild, braucht es nicht neu gezeichnet zu werden (zeitliche Verfahren erst auslaufen lassen). */
export function ruht(a: App): boolean {
  if (!a.S.paused || a.warm > 0 || !a.sky.fertig || a.grab || a.needsInit || a.needsDye) { ruheZahl = 0; return false; }
  const sig = JSON.stringify([a.S, a.cam, a.spin, a.time, a.frame, a.W, a.H, a.preset, a.storms.length, a.renderKey]);
  if (sig !== ruheSig) { ruheSig = sig; ruheZahl = 0; return false; }
  return ++ruheZahl > (wahl(a.S).zeitlich !== 'off' ? 64 : 8);
}
