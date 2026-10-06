// Gemeinsame Hilfen für die Menü-Abschnitte des Gasriesen (Formatierer, Formel-Anzeige, Grenzen der Regler).
import type { App } from '../app';

export interface MenueKontext {
  app: App;
  pct: (v: number) => string;
  f2: (v: number) => string;
  f3: (v: number) => string;
  n: (v: number) => string;          // große Zahlen kurz (k, Mio.)
  fx: (f: string) => string;         // Formel unter dem Erklärtext
  presetName: (name: string) => string;
  lim: { velRes: number; dyeRes: number; curlRes: number; particles: number };
}
