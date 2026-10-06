// Baustein Einschlagsblitze: aus den Kollisions-Ereignissen der Physik werden Leuchtblitz und Druckwelle (nur Anzeige, keine Physik).
import type { Ereignis, V3, Welt } from '../physik/koerper.ts';

interface Blitz { ort: V3; groesse: number; start: number; dauer: number; farbe: [number, number, number] }

export class Blitze {
  private liste: Blitz[] = [];
  private gelesen = 0;

  /** Neue Ereignisse der Welt übernehmen (Zeit der Anzeige: `jetzt`, Sekunden). */
  uebernimm(w: Welt, jetzt: number) {
    for (; this.gelesen < w.ereignisse.length; this.gelesen++) {
      const e: Ereignis = w.ereignisse[this.gelesen];
      const g = 3 + 70 * Math.pow(e.staerke, 1.3);
      const farbe: [number, number, number] = e.art === 'sonne' ? [1, 0.7, 0.3] : e.art === 'zerschlagen' ? [1, 0.82, 0.55] : [0.7, 0.85, 1];
      this.liste.push({ ort: e.ort, groesse: g, start: jetzt, dauer: 1.5 + 3 * e.staerke, farbe });
    }
  }
  zuruecksetzen() { this.liste = []; this.gelesen = 0; }

  /** Schreibt Leuchtinstanzen (12 Floats: pos+Größe | Farbe+Helligkeit | Art, Alter) und gibt die Anzahl zurück. */
  fuelle(auge: V3, jetzt: number, aus: Float32Array, ab: number): number {
    let n = ab;
    this.liste = this.liste.filter((b) => jetzt - b.start < b.dauer);
    for (const b of this.liste) {
      const alter = (jetzt - b.start) / b.dauer;
      const rel: V3 = [b.ort[0] - auge[0], b.ort[1] - auge[1], b.ort[2] - auge[2]];
      const kern = (1 - alter) * (1 - alter);
      // Kernblitz
      let o = n * 12; if (o + 24 > aus.length) break;
      aus.set([rel[0], rel[1], rel[2], b.groesse * (0.4 + 0.9 * Math.sqrt(alter)), b.farbe[0], b.farbe[1], b.farbe[2], 2.2 * kern, 0, alter, 0, 0], o); n++;
      // Druckwelle
      o = n * 12;
      aus.set([rel[0], rel[1], rel[2], b.groesse * (0.5 + 3.2 * alter), b.farbe[0], b.farbe[1], b.farbe[2], 0.9, 1, alter, 0, 0], o); n++;
    }
    return n;
  }
}
