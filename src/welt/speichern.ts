// Speichern und Laden der ganzen Welt: Seed des Systems, Zustand aller Körper (Ort, Geschwindigkeit, Masse, Radius, Seed, Vorlage),
// alle Einstellungen der Welt (Schalter, Qualität, Tempo, Bausteine je Typ), die Einstellungen aus den Menüs der einzelnen echten Planeten
// und die Kamera. Wer die Datei oder den Code lädt, sieht dasselbe System. Trümmer sind flüchtig und werden nicht gespeichert.
import type { Koerper } from './physik/koerper.ts';

export interface WeltStand {
  format: 'sonnensystem';
  version: 1;
  name?: string;
  /** Seed des Systems (Neu erzeugen: gleiche Planeten) */
  seed: number;
  zeit: number;
  naechsteId: number;
  koerper: Koerper[];
  /** Einstellungen der Welt (Schalter, Zahlen, Typ-Bausteine) */
  einstellungen: Record<string, number | string | boolean>;
  /** Menü-Einstellungen der echten Planeten, je Körper */
  gas: Record<number, string>;
  fels: Record<number, Record<string, number | string | boolean>>;
  gasTyp: Record<string, boolean>;
  felsTyp: Record<string, boolean>;
  kamera: { gier: number; neigung: number; abstand: number; fokus: number | null };
}

const SCHLUESSEL = 'sonnensystem-staende';

export function pruefeStand(x: unknown): WeltStand {
  const s = x as Partial<WeltStand> | null;
  if (!s || s.format !== 'sonnensystem' || s.version !== 1 || !Array.isArray(s.koerper)) throw new Error('Das ist kein gespeichertes Sonnensystem.');
  return s as WeltStand;
}

// ---- Dateien ----
export function alsDatei(stand: WeltStand, name: string) {
  const blob = new Blob([JSON.stringify(stand)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name || 'sonnensystem'}-${stand.seed}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function ausDatei(f: File): Promise<WeltStand> { return pruefeStand(JSON.parse(await f.text())); }

// ---- Code zum Weitergeben (gzip + base64) ----
async function strom(daten: Uint8Array, ctor: 'CompressionStream' | 'DecompressionStream'): Promise<Uint8Array> {
  const s = new (globalThis as never as Record<string, new (f: string) => GenericTransformStream>)[ctor]('gzip');
  const w = s.writable.getWriter(); void w.write(daten as BufferSource); void w.close();
  return new Uint8Array(await new Response(s.readable).arrayBuffer());
}
export async function alsCode(stand: WeltStand): Promise<string> {
  const z = await strom(new TextEncoder().encode(JSON.stringify(stand)), 'CompressionStream');
  let b = ''; for (let i = 0; i < z.length; i += 0x8000) b += String.fromCharCode(...z.subarray(i, i + 0x8000));
  return 'SONNENSYSTEM1:' + btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function ausCode(code: string): Promise<WeltStand> {
  const t = code.trim();
  if (!t.startsWith('SONNENSYSTEM1:')) throw new Error('Der Code beginnt nicht mit SONNENSYSTEM1:');
  const b = atob(t.slice(14).replace(/-/g, '+').replace(/_/g, '/'));
  const roh = Uint8Array.from(b, (c) => c.charCodeAt(0));
  return pruefeStand(JSON.parse(new TextDecoder().decode(await strom(roh, 'DecompressionStream'))));
}

// ---- Speicherplätze im Browser ----
export interface Platz { name: string; stand: WeltStand; zeit: number }
export function plaetze(): Platz[] { try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || '[]'); } catch { return []; } }
export function legeAb(liste: Platz[]) { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(liste)); } catch { /* Speicher gesperrt oder voll */ } }
