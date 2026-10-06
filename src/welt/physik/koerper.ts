// Körper der Welt: Sonne, Planeten, Monde (massereich, werden einzeln simuliert) und Trümmer (Testteilchen, SoA).
// Rein CPU, keine Grafik. Einheiten frei: G = 1, Länge in Welteinheiten, Masse so, dass Kreisbahn v = sqrt(G·M/r).

export type V3 = [number, number, number];
export type Art = 'sonne' | 'gas' | 'gestein' | 'mond';

export interface Koerper {
  id: number;
  name: string;
  art: Art;
  m: number;
  r: number;
  p: V3;
  v: V3;
  /** Elternkörper (Mond → Planet, Planet → Sonne); −1 = frei (Einschlagskörper) */
  eltern: number;
  /** frei = zieht und wird gezogen von allem (Einschlagskörper), sonst nur Eltern/Sonne (außer Chaos-Schalter) */
  frei: boolean;
  spin: number;
  spinRate: number;
  tilt: number;
  /** Seed für die gebackene Oberfläche */
  seed: number;
  /** Name einer Gasriesen-Vorlage (Jupiter, Saturn …), falls im Menü des echten Planeten gewählt; sonst Zufallsplanet aus dem Seed */
  vorlage?: string;
  /** Zustand vor dem letzten Teilschritt (nur für die Bildinterpolation) */
  pv: V3;
  spinV: number;
}

/** Trümmer: Testteilchen mit eigener (kleiner) Masse; sie fühlen alle Körper, ziehen aber nicht. */
export interface Truemmer {
  n: number;
  max: number;
  p: Float64Array; // 3·max
  v: Float64Array;
  m: Float64Array;
  /** Herkunft (Art) für die Farbe: 0 Gestein, 1 Gas/Eis, 2 Sonne/Glut */
  /** Position vor dem letzten Teilschritt (Bildinterpolation) */
  pv: Float64Array;
  art: Uint8Array;
  alter: Float64Array;
}

export interface Ereignis {
  zeit: number;
  ort: V3;
  /** 0..1, relativ zum größten denkbaren Einschlag */
  staerke: number;
  text: string;
  art: 'verschmelzen' | 'zerschlagen' | 'sonne' | 'truemmer' | 'abprall';
}

export interface Welt {
  zeit: number;
  koerper: Koerper[];
  truemmer: Truemmer;
  naechsteId: number;
  ereignisse: Ereignis[];
  /** Zufall der Welt (mulberry32), damit Kollisionen reproduzierbar sind */
  zufall: () => number;
  /** Anzahl durch Obergrenze verworfener Trümmer (Masse geht verloren – nur dann ist die Erhaltung gebrochen) */
  verworfen: number;
}

export function neuerZufall(seed: number) {
  let st = seed >>> 0;
  return () => {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function neueTruemmer(max: number): Truemmer {
  return { n: 0, max, p: new Float64Array(3 * max), pv: new Float64Array(3 * max), v: new Float64Array(3 * max), m: new Float64Array(max), art: new Uint8Array(max), alter: new Float64Array(max) };
}

export function neueWelt(seed: number, maxTruemmer = 4000): Welt {
  return { zeit: 0, koerper: [], truemmer: neueTruemmer(maxTruemmer), naechsteId: 1, ereignisse: [], zufall: neuerZufall(seed), verworfen: 0 };
}

export const DICHTE = 30;
/** Masse aus Radius bei fester Dichte (Welteinheiten) */
export const masseVonRadius = (r: number) => DICHTE * r * r * r;

export function fuegeHinzu(w: Welt, k: Omit<Koerper, 'id' | 'pv' | 'spinV'>): Koerper {
  const kk: Koerper = { ...k, id: w.naechsteId++, pv: [k.p[0], k.p[1], k.p[2]], spinV: k.spin };
  w.koerper.push(kk);
  return kk;
}

export function finde(w: Welt, id: number): Koerper | undefined {
  return w.koerper.find((k) => k.id === id);
}

export function fuegeTruemmerHinzu(w: Welt, p: V3, v: V3, m: number, art: number): boolean {
  const t = w.truemmer;
  if (t.n >= t.max) { w.verworfen += m; return false; }
  const i = t.n++;
  t.p.set(p, 3 * i); t.pv.set(p, 3 * i); t.v.set(v, 3 * i); t.m[i] = m; t.art[i] = art; t.alter[i] = 0;
  return true;
}

export function entferneTruemmer(t: Truemmer, i: number) {
  const l = --t.n;
  if (i !== l) {
    t.p.copyWithin(3 * i, 3 * l, 3 * l + 3); t.pv.copyWithin(3 * i, 3 * l, 3 * l + 3); t.v.copyWithin(3 * i, 3 * l, 3 * l + 3);
    t.m[i] = t.m[l]; t.art[i] = t.art[l]; t.alter[i] = t.alter[l];
  }
}

/** Summen für Prüfungen: Masse, Impuls, Drehimpuls (Körper + Trümmer) */
export function summen(w: Welt) {
  let m = 0; const P: V3 = [0, 0, 0]; const L: V3 = [0, 0, 0];
  const add = (mm: number, p: ArrayLike<number>, v: ArrayLike<number>, o = 0) => {
    m += mm;
    for (let k = 0; k < 3; k++) P[k] += mm * v[o + k];
    L[0] += mm * (p[o + 1] * v[o + 2] - p[o + 2] * v[o + 1]);
    L[1] += mm * (p[o + 2] * v[o] - p[o] * v[o + 2]);
    L[2] += mm * (p[o] * v[o + 1] - p[o + 1] * v[o]);
  };
  for (const k of w.koerper) add(k.m, k.p, k.v);
  const t = w.truemmer;
  for (let i = 0; i < t.n; i++) add(t.m[i], t.p, t.v, 3 * i);
  return { m, P, L };
}
