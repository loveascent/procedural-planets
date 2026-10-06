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
  { schluessel: 'ls12', name: 'Kollisionsmodell Leinhardt & Stewart 2012', text: 'Ausgang (Verschmelzen, Abprall, Erosion, superkatastrophal) und Trümmermasse nach dem veröffentlichten Modell. Aus: früherer Eigenbau mit fester Schwelle 1,5 × Fluchtgeschwindigkeit.', wirkt: 'sofort', an: true },
  { schluessel: 'blitze', name: 'Einschlagsblitze', text: 'Leuchtblitz und Druckwelle bei jeder Kollision.', wirkt: 'sofort', an: true },
  { schluessel: 'spuren', name: 'Bahnlinien', text: 'Bahn jedes Körpers als Ellipse bzw. Hyperbel, aus Ort und Geschwindigkeit berechnet (läuft immer durch den Körper, heller hinter ihm).', wirkt: 'sofort', an: true },
  { schluessel: 'mondbahnen', name: 'Bahnlinien der Monde', text: 'Bahn jedes Mondes um seinen Planeten.', wirkt: 'sofort', an: true },
  { schluessel: 'sonnenglanz', name: 'Sonnenglanz', text: 'Weicher Schein um die Sonne.', wirkt: 'sofort', an: true },
  { schluessel: 'himmel', name: 'Sternenhimmel', text: 'Sterne und Milchstraße im Hintergrund.', wirkt: 'sofort', an: true },
  { schluessel: 'atmosphaere', name: 'Atmosphärensaum (gebackene Kugeln)', text: 'Heller Rand an der Tagseite der gebackenen, fernen Kugeln. Die echten Planeten haben ihre eigenen Atmosphären-Regler in ihrem Menü.', wirkt: 'pipeline', an: true },
  { schluessel: 'finsternis', name: 'Schatten & Finsternisse', text: 'Planeten und Monde werfen Schatten aufeinander.', wirkt: 'pipeline', an: true },
  { schluessel: 'lebendig', name: 'Lebendige Oberfläche (nahe Körper)', text: 'Nahe Körper bekommen bewegte Bänder bzw. Sonnengranulation.', wirkt: 'pipeline', an: true },
  { schluessel: 'gasLive', name: 'Echter Gasriese (Simulation) für den nächsten großen Gasriesen', text: 'Der nächste große Gasriese läuft mit den echten Gasriesen-Bausteinen (Strömung, Farbstoff, Relief, Ringe) in einer eigenen Instanz, nur solange er nah ist. Aus: gebackene Kugel.', wirkt: 'sofort', an: true },
  { schluessel: 'felsLive', name: 'Echter Gesteinsplanet (Simulation) für den nächsten großen Gesteinsplaneten', text: 'Der nächste große Gesteinsplanet läuft mit den echten Bausteinen des Gesteinsplaneten (Gelände, Flüsse, Wasser, Luft, Wolken), nur solange er nah ist. Aus: gebackene Kugel und der Code wird nicht geladen.', wirkt: 'sofort', an: true },
  { schluessel: 'lod', name: 'Detailstufen (LOD)', text: 'Nur die nächsten Körper werden „voll“ gezeichnet, ferne sind gebackene Kugeln, winzige Punkte.', wirkt: 'sofort', an: true },
];

export type Schalter = Record<string, boolean>;
export const standardSchalter = (): Schalter => Object.fromEntries(BAUSTEINE.map((b) => [b.schluessel, b.an]));
