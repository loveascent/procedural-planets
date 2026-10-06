// Ein Bild Weltzeit: feste Teilschritte (1/120), danach Kollisionen und Trümmeraufnahme nach jedem Teilschritt.
// Jeder Schalter ist ein eigener Baustein; aus = die Funktion wird nicht aufgerufen.
import { gravitationsSchritt, type GravOptionen } from './gravitation.ts';
import { kollisionen, truemmerAufnehmen } from './kollision.ts';
import type { Welt } from './koerper.ts';

export const TEILSCHRITT = 1 / 120;
export const MAX_TEILSCHRITTE = 48;

export interface Schalter extends GravOptionen {
  kollision: boolean;
  truemmer: boolean;
}

let rest = 0;
/** Gibt die Zahl der gerechneten Teilschritte zurück. */
export function weltSchritt(w: Welt, dtRealZeit: number, tempo: number, s: Schalter): number {
  rest += dtRealZeit * tempo;
  let n = 0;
  while (rest >= TEILSCHRITT && n < MAX_TEILSCHRITTE) {
    gravitationsSchritt(w, TEILSCHRITT, s);
    if (s.kollision) { kollisionen(w, s); truemmerAufnehmen(w); }
    rest -= TEILSCHRITT; n++;
  }
  if (n === MAX_TEILSCHRITTE) rest = 0;
  return n;
}
export const zeitRestZuruecksetzen = () => { rest = 0; };
