// Baustein Bahnlinien: die Bahn jedes Körpers wird aus Ort und Geschwindigkeit relativ zu seinem Elternkörper als Kegelschnitt berechnet
// (Ellipse, bei ungebundenen Körpern Hyperbel). Sie läuft immer exakt durch den Körper, braucht keine gespeicherten Punkte und kann nicht
// hinterherhinken oder zucken. Hinter dem Körper (in Flugrichtung rückwärts) ist die Linie heller, wie ein Schweif.
// Quelle: Zweikörperproblem, Exzentrizitätsvektor e = (v × h)/μ − r/|r|, Bahnparameter p = h²/μ, r(ν) = p / (1 + e·cos ν).
import type { Koerper, V3, Welt } from '../physik/koerper.ts';

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);

export interface Bahnelemente { a: number; e: number; periode: number; p: number; nu0: number; x: V3; y: V3 }

/** Bahnelemente von k relativ zu z (G = 1, μ = M_z + m_k). null, wenn entartet. */
export function bahnelemente(k: Koerper, z: Koerper, roh?: Map<number, { p: V3 }>): Bahnelemente | null {
  const pk = roh?.get(k.id)?.p ?? k.p, pz = roh?.get(z.id)?.p ?? z.p;
  const r: V3 = [pk[0] - pz[0], pk[1] - pz[1], pk[2] - pz[2]];
  const v: V3 = [k.v[0] - z.v[0], k.v[1] - z.v[1], k.v[2] - z.v[2]];
  const mu = z.m + k.m;
  const rl = len(r), h = cross(r, v), hl = len(h);
  if (rl < 1e-9 || hl < 1e-9) return null;
  const vh = cross(v, h);
  const ev: V3 = [vh[0] / mu - r[0] / rl, vh[1] / mu - r[1] / rl, vh[2] / mu - r[2] / rl];
  const e = len(ev);
  const x: V3 = e > 1e-6 ? [ev[0] / e, ev[1] / e, ev[2] / e] : [r[0] / rl, r[1] / rl, r[2] / rl];
  const zh: V3 = [h[0] / hl, h[1] / hl, h[2] / hl];
  const y = cross(zh, x);
  const p = (hl * hl) / mu;
  // Winkel des Körpers aus seinem angezeigten (interpolierten) Ort: die Linie läuft so genau durch das gezeichnete Bild
  const ra: V3 = [k.p[0] - z.p[0], k.p[1] - z.p[1], k.p[2] - z.p[2]];
  const nu0 = Math.atan2(dot(ra, y), dot(ra, x));
  const a = e < 1 ? p / (1 - e * e) : Infinity;
  return { a, e, periode: e < 1 ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity, p, nu0, x, y };
}

export class Spuren {
  // Bahnen brauchen keinen Verlauf: die Aufrufe der Welt bleiben, tun aber nichts
  aktualisiere(_w: Welt) { /* nichts zu sammeln */ }
  leeren() { /* nichts gespeichert */ }
  vorbelegen(_w: Welt) { /* nichts nötig: die Bahn ist von Anfang an vollständig */ }

  /** Schreibt Segmente (12 Floats: Anfang+Helligkeit | Ende+Helligkeit | Farbe+Breite) und gibt deren Anzahl zurück. */
  fuelle(w: Welt, auge: V3, aus: Float32Array, mondbahnen = true, zeigen: (k: Koerper, z: Koerper, a: number) => number = () => 1, roh?: Map<number, { p: V3 }>): number {
    let n = 0;
    const lim = aus.length / 12;
    const sonne = w.koerper.find((x) => x.art === 'sonne');
    for (const k of w.koerper) {
      if (k.art === 'sonne') continue;
      if (k.art === 'mond' && !mondbahnen) continue;
      const z = (k.eltern >= 0 ? w.koerper.find((x) => x.id === k.eltern) : undefined) ?? sonne;
      if (!z) continue;
      // Elemente aus dem zusammengehörigen Physikzustand (Ort und Geschwindigkeit vom selben Zeitpunkt), nicht aus dem
      // interpolierten Anzeigeort: sonst passen Ort und Geschwindigkeit nicht zusammen und die Ellipse zittert von Bild zu Bild.
      const el = bahnelemente(k, z, roh);
      if (!el) continue;
      const sicht = zeigen(k, z, Number.isFinite(el.a) ? el.a : el.p);
      if (sicht < 0.02) continue;
      const mond = k.art === 'mond', gas = k.art === 'gas';
      const fr: [number, number, number] = k.frei ? [1, 0.55, 0.25] : gas ? [0.55, 0.7, 1] : mond ? [0.75, 0.8, 0.9] : [0.9, 0.8, 0.6];
      const breite = mond ? 0.6 : 1;
      const grund = (mond ? 0.14 : 0.2) * sicht, spitze = (mond ? 0.5 : 0.7) * sicht;
      const N = mond ? 72 : 168;
      const gebunden = el.e < 1;
      // Winkelbereich rückwärts ab dem Körper: gebunden = ein voller Umlauf, ungebunden bis zur Asymptote
      const bereich = gebunden ? 2 * Math.PI : Math.min(2 * Math.PI, Math.acos(-1 / el.e) * 0.97 + el.nu0);
      const rand = k.r * 1.05;
      let vorher: V3 | null = null, vorherA = 0;
      for (let j = 0; j <= N && n < lim; j++) {
        const t = j / N;
        const nu = el.nu0 - bereich * t;
        const nenner = 1 + el.e * Math.cos(nu);
        if (nenner <= 0.02) { vorher = null; continue; }
        const rho = el.p / nenner;
        if (rho > 6000) { vorher = null; continue; }
        const c = Math.cos(nu), s = Math.sin(nu);
        const P: V3 = [z.p[0] + rho * (c * el.x[0] + s * el.y[0]) - auge[0], z.p[1] + rho * (c * el.x[1] + s * el.y[1]) - auge[1], z.p[2] + rho * (c * el.x[2] + s * el.y[2]) - auge[2]];
        const A = grund + (spitze - grund) * Math.pow(1 - t, 3);
        const imKoerper = Math.hypot(P[0] - (k.p[0] - auge[0]), P[1] - (k.p[1] - auge[1]), P[2] - (k.p[2] - auge[2])) < rand;
        if (vorher && !imKoerper) {
          aus.set([vorher[0], vorher[1], vorher[2], vorherA, P[0], P[1], P[2], A, fr[0], fr[1], fr[2], breite], n * 12);
          n++;
        }
        vorher = imKoerper ? null : P; vorherA = A;
      }
    }
    return n;
  }
}
