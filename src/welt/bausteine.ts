// Schalter der Welt-Schicht: jeder Baustein einzeln an/aus. `wirkt` sagt, was beim Umschalten passiert:
//   'sofort'   – der Code der Schleife ruft den Baustein nicht mehr auf (kein Neuaufbau),
//   'pipeline' – die Grafik-Pipeline wird ohne den Shader-Teil neu übersetzt (aus = nicht mitkompiliert),
//   'neustart' – das System wird neu erzeugt (Monde sind Teil der Erzeugung).
export type Wirkt = 'sofort' | 'pipeline' | 'neustart';

export interface BausteinInfo { schluessel: string; name: string; text: string; wirkt: Wirkt; an: boolean }

export const BAUSTEINE: BausteinInfo[] = [
  { schluessel: 'monde', name: 'Monde', text: 'Gasriesen und Gesteinsplaneten bekommen Monde auf Kreisbahnen.', wirkt: 'neustart', an: true },
  { schluessel: 'planetenZiehen', name: 'Planeten ziehen einander (Chaos)', text: 'Aus: Planeten spüren nur die Sonne und ihre Monde. An: voller n-Körper, Bahnen werden mit der Zeit instabil.', wirkt: 'sofort', an: false },
  { schluessel: 'kollision', name: 'Kollisionen', text: 'Berührung zweier Körper wird erkannt und aufgelöst.', wirkt: 'sofort', an: true },
  { schluessel: 'truemmer', name: 'Zerschlagung & Trümmer', text: 'Schnelle Einschläge zerbrechen den leichteren Körper in Trümmer. Aus: es wird immer verschmolzen.', wirkt: 'sofort', an: true },
  { schluessel: 'blitze', name: 'Einschlagsblitze', text: 'Leuchtblitz und Druckwelle bei jeder Kollision.', wirkt: 'sofort', an: true },
  { schluessel: 'spuren', name: 'Bahnspuren', text: 'Leuchtspur hinter Planeten und Einschlagskörpern.', wirkt: 'sofort', an: true },
  { schluessel: 'sonnenglanz', name: 'Sonnenglanz', text: 'Weicher Schein um die Sonne.', wirkt: 'sofort', an: true },
  { schluessel: 'himmel', name: 'Sternenhimmel', text: 'Sterne und Milchstraße im Hintergrund.', wirkt: 'sofort', an: true },
  { schluessel: 'atmosphaere', name: 'Atmosphärensaum', text: 'Heller Rand an der Tagseite.', wirkt: 'pipeline', an: true },
  { schluessel: 'finsternis', name: 'Schatten & Finsternisse', text: 'Planeten und Monde werfen Schatten aufeinander.', wirkt: 'pipeline', an: true },
  { schluessel: 'lebendig', name: 'Lebendige Oberfläche (nahe Körper)', text: 'Nahe Körper bekommen bewegte Bänder bzw. Sonnengranulation.', wirkt: 'pipeline', an: true },
  { schluessel: 'lod', name: 'Detailstufen (LOD)', text: 'Nur die nächsten Körper werden „voll“ gezeichnet, ferne sind gebackene Kugeln, winzige Punkte.', wirkt: 'sofort', an: true },
];

export type Schalter = Record<string, boolean>;
export const standardSchalter = (): Schalter => Object.fromEntries(BAUSTEINE.map((b) => [b.schluessel, b.an]));
