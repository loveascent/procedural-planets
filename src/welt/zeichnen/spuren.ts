// Baustein Bahnspuren: Ringpuffer der letzten Positionen je Planet/Einschlagskörper; füllt Linienpunkte (kamerarelativ).
import type { Koerper, V3, Welt } from '../physik/koerper.ts';

const LAENGE = 220;
const ABSTAND = 0.12; // Weltsekunden zwischen Stützpunkten

interface Spur { pos: Float64Array; kopf: number; n: number; naechste: number }

export class Spuren {
  private spuren = new Map<number, Spur>();

  aktualisiere(w: Welt) {
    const leben = new Set<number>();
    for (const k of w.koerper) {
      if (k.art === 'sonne' || k.art === 'mond') continue;
      leben.add(k.id);
      let s = this.spuren.get(k.id);
      if (!s) { s = { pos: new Float64Array(3 * LAENGE), kopf: 0, n: 0, naechste: w.zeit }; this.spuren.set(k.id, s); }
      if (w.zeit >= s.naechste) {
        s.pos.set(k.p, 3 * s.kopf); s.kopf = (s.kopf + 1) % LAENGE; s.n = Math.min(LAENGE, s.n + 1); s.naechste = w.zeit + ABSTAND;
      }
    }
    for (const id of [...this.spuren.keys()]) if (!leben.has(id)) this.spuren.delete(id);
  }

  leeren() { this.spuren.clear(); }

  /** Schreibt Linienpunkte (7 Floats) und gibt deren Anzahl zurück. */
  fuelle(w: Welt, auge: V3, aus: Float32Array, ab = 0): number {
    let n = ab;
    for (const [id, s] of this.spuren) {
      const k: Koerper | undefined = w.koerper.find((x) => x.id === id);
      if (!k || s.n < 2) continue;
      const gas = k.art === 'gas', frei = k.frei;
      const fr: [number, number, number] = frei ? [1, 0.55, 0.25] : gas ? [0.5, 0.65, 1] : [0.85, 0.75, 0.55];
      for (let j = 0; j < s.n - 1; j++) {
        if ((n + 2) * 7 > aus.length) return n;
        const i0 = (s.kopf - 1 - j + 2 * LAENGE) % LAENGE, i1 = (s.kopf - 2 - j + 2 * LAENGE) % LAENGE;
        const a0 = 1 - j / s.n, a1 = 1 - (j + 1) / s.n;
        // Stützpunkte im Inneren des Körpers weglassen (sonst zieht die Spur eine Linie über seine Scheibe)
        const nahe = (i: number) => (s.pos[3 * i] - k.p[0]) ** 2 + (s.pos[3 * i + 1] - k.p[1]) ** 2 + (s.pos[3 * i + 2] - k.p[2]) ** 2 < (k.r * 1.2) ** 2;
        if (nahe(i0) || nahe(i1)) continue;
        const put = (i: number, a: number) => {
          const o = n * 7;
          aus[o] = s.pos[3 * i] - auge[0]; aus[o + 1] = s.pos[3 * i + 1] - auge[1]; aus[o + 2] = s.pos[3 * i + 2] - auge[2];
          aus[o + 3] = fr[0]; aus[o + 4] = fr[1]; aus[o + 5] = fr[2]; aus[o + 6] = a * a * 0.55;
          n++;
        };
        put(i0, a0); put(i1, a1);
      }
    }
    return n;
  }
}
