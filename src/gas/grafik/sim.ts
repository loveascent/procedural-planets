// FPS-Verfahren der Simulation: Rechentakt, seltenere Farbpflege, Rechenschritt auf Bilder verteilen, Bindungsgruppen merken.
// Alles aus: Faktor 1, nichts wird angelegt, die Rechnung läuft wie bisher.
import type { App } from '../app';
import type { CubeField } from '../zustand';

/** Wie viele 1/60-s-Schritte ein gerechneter Schritt ersetzt. Stable Fluids und Semi-Lagrange bleiben auch bei großem Δt stabil (Stam 1999). */
export const takt = (S: App['S']) => (S.fxSimRate === '30' ? 2 : S.fxSimRate === '20' ? 3 : 1);

/** Anteil „pro Schritt“ (Partikel-Deckkraft, Weichzeichnen) auf k zusammengefasste Schritte umrechnen: 1 − (1 − a)^k. */
export function jeSchritt(a: App, wert: number): number {
  const k = a.warm > 0 ? 1 : takt(a.S);
  return k === 1 ? wert : 1 - Math.pow(1 - wert, k);
}

/** Seltenere Farbpflege: Bandrückstellung, Sturmfarbe und Konvektion nur jeden n-ten Schritt, dann mit n·Δt.
 *  Für die Rückstellung c ← mix(c, Ziel, 1 − e^(−r·Δt)) ist das bei ruhendem Ziel exakt dasselbe, weil sich die Faktoren e^(−r·Δt) multiplizieren.
 *  Jeder Schritt pflegt eine andere 1/n der 8×8-Kacheln (Phase), damit keine Lastspitze entsteht. [n, Phase]; aus = [0, 0]. */
export function pflegeFaktor(a: App): [number, number] {
  const n = Number(a.S.fxCare);
  return n > 1 ? [n, a.frame % n] : [0, 0];
}

// ---------- Bindungsgruppen merken ----------
const nummern = new WeakMap<object, number>();
let naechste = 0;
export const nummer = (o: object) => { let n = nummern.get(o); if (n === undefined) { n = ++naechste; nummern.set(o, n); } return n; };

export function gemerkteBindung(a: App, teile: object[], bauen: () => GPUBindGroup): GPUBindGroup {
  const key = teile.map(nummer).join(' ');
  const m = (a.bindungen ??= new Map());
  let g = m.get(key);
  if (!g) { g = bauen(); m.set(key, g); }
  return g;
}

// ---------- Rechenschritt auf Bilder verteilen ----------
// Der Schritt wird einmal „aufgenommen“ (gleiche Funktion step(), nur schreibt sie in eine Liste) und dann in Portionen ausgeführt.
// Gewichte: auf der RTX 5080 gemessene Zeit je Arbeitsgruppe in ns (Messung 2026-11-26, Stufe „high“ und „ultra“ Partikel).
const GEWICHT: Record<string, number> = { forces: 54, moveParticles: 55, advectDye: 4, blurRelax: 4.6, blurFade: 4.6, zonalSum: 3, advect: 1.3, jacobi: 0.8 };

type Teil = { w: number; kopie?: (e: GPUCommandEncoder) => void; rechne?: (p: GPUComputePassEncoder) => void };
export interface Geteilt { offen: Teil[]; budget: number; dye?: CubeField; flow?: CubeField; prs?: CubeField; zeigFlow?: CubeField; zeigPrs?: CubeField; seit: number; jeSchritt: number }

export const laeuft = (a: App) => !!a.geteilt && a.geteilt.offen.length > 0;

function ausfuehren(a: App, alles: boolean) {
  const g = a.geteilt;
  if (!g || !g.offen.length) return;
  const enc = a.device.createCommandEncoder();
  let pass: GPUComputePassEncoder | null = null, summe = 0;
  while (g.offen.length && (alles || summe < g.budget)) {
    const t = g.offen.shift()!;
    summe += t.w;
    if (t.kopie) { pass?.end(); pass = null; t.kopie(enc); }
    else { pass ??= enc.beginComputePass(); t.rechne!(pass); }
  }
  pass?.end();
  a.device.queue.submit([enc.finish()]);
}

/** Offene Teile sofort rechnen (vor jedem anderen Schritt, weil sich alle dieselben Uniforms teilen). */
export const abschliessen = (a: App) => ausfuehren(a, true);

function aufnehmen(a: App) {
  const g = a.geteilt!;
  const flowAlt = a.flowMode() === 'fluid' ? a.vel[a.vc] : a.flow;
  const dyeAlt = a.dye[a.dc], prsAlt = a.prs[a.pc];
  // Wind und Druck werden während des Schritts überschrieben: für die Darstellung vorher eine Kopie ziehen
  if (!g.zeigFlow || g.zeigFlow.n !== flowAlt.n) { g.zeigFlow?.tex.destroy(); g.zeigFlow = a.cubeField(flowAlt.n); }
  if (!g.zeigPrs || g.zeigPrs.n !== prsAlt.n) { g.zeigPrs?.tex.destroy(); g.zeigPrs = a.cubeField(prsAlt.n); }
  const zf = g.zeigFlow, zp = g.zeigPrs;
  const liste: Teil[] = [{ w: 0, kopie: (e) => { e.copyTextureToTexture({ texture: flowAlt.tex }, { texture: zf.tex }, [zf.n, zf.n, 6]); e.copyTextureToTexture({ texture: prsAlt.tex }, { texture: zp.tex }, [zp.n, zp.n, 6]); } }];
  let pipe: GPUComputePipeline, bg: GPUBindGroup;
  const pass = {
    setPipeline: (p: GPUComputePipeline) => { pipe = p; },
    setBindGroup: (_i: number, b: GPUBindGroup) => { bg = b; },
    dispatchWorkgroups: (x: number, y = 1, z = 1) => {
      const p = pipe, b = bg, name = Object.keys(a.pipes).find((n) => a.pipes[n] === p) ?? '';
      liste.push({ w: x * y * z * (GEWICHT[name] ?? 1), rechne: (c) => { c.setPipeline(p); c.setBindGroup(0, b); c.dispatchWorkgroups(x, y, z); } });
    },
    end: () => {},
  };
  const enc = {
    beginComputePass: () => pass,
    copyTextureToTexture: (s: GPUTexelCopyTextureInfo, d: GPUTexelCopyTextureInfo, n: GPUExtent3DStrict) => { liste.push({ w: 0, kopie: (e) => e.copyTextureToTexture(s, d, n) }); },
  };
  a.simStep(enc as unknown as GPUCommandEncoder);
  g.offen = liste;
  g.dye = dyeAlt; g.flow = zf; g.prs = zp;
}

/** Statt n Schritte sofort zu rechnen: den letzten über die Bilder bis zum nächsten Schritt verteilen. */
export function verteilt(a: App, n: number) {
  const g = (a.geteilt ??= { offen: [], budget: 0, seit: 0, jeSchritt: 1 });
  g.seit++;
  if (n > 0) {
    abschliessen(a);
    for (let k = 1; k < n; k++) a.submitStep();
    g.jeSchritt = Math.max(1, Math.min(8, g.seit));
    g.seit = 0;
    aufnehmen(a);
    g.budget = g.offen.reduce((s, t) => s + t.w, 0) / g.jeSchritt;
  }
  ausfuehren(a, false);
}

export function verteilenAus(a: App) {
  if (!a.geteilt) return;
  abschliessen(a);
  a.geteilt.zeigFlow?.tex.destroy(); a.geteilt.zeigPrs?.tex.destroy();
  a.geteilt = null;
}

/** Felder wurden neu angelegt: offene Teile verwerfen, gemerkte Bindungen vergessen. */
export function felderNeu(a: App) {
  if (a.geteilt) a.geteilt.offen = [];
  a.bindungen = undefined;
}

/** Zustand, den die Darstellung gerade zeigen darf (während eines verteilten Schritts der vorige). */
export function gezeigt(a: App, flow: CubeField): { dye: CubeField; flow: CubeField; prs: CubeField } {
  const g = a.geteilt;
  if (g && g.offen.length && g.dye) return { dye: g.dye, flow: g.flow!, prs: g.prs! };
  return { dye: a.dye[a.dc], flow, prs: a.prs[a.pc] };
}
