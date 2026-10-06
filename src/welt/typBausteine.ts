// Bausteine je Körpertyp: gelten für ALLE Gasriesen bzw. ALLE Gesteinsplaneten der Welt (nicht nur für den einen, der gerade live läuft).
// Jeder Schalter setzt denselben Regler wie im Menü des Planeten (Wert 0 / aus = Baustein hat keine Wirkung; bei den Shader-Bausteinen
// der Planeten heißt das: er wird nicht mitkompiliert). Beim Einschalten kommt der zuletzt gemerkte oder der Standardwert zurück.
export interface TypBaustein {
  schluessel: string;
  name: string;
  text: string;
  aus: number | string | boolean;
  /** Wert beim Einschalten, wenn nichts gemerkt ist */
  an: number | string | boolean;
  /** Ist der Baustein im Standard an? */
  standardAn: boolean;
}

export const GAS_BAUSTEINE: TypBaustein[] = [
  { schluessel: 'jetRelax', name: 'Jets (Windbänder halten)', text: 'Hält die Ost-West-Winde der Bänder fest. Aus: Strömung driftet frei.', aus: 0, an: 0.25, standardAn: true },
  { schluessel: 'omega', name: 'Coriolis-Kraft', text: 'Drehung des Planeten lenkt die Strömung ab (Wirbelrichtung). Aus: keine Ablenkung.', aus: 0, an: 0.4, standardAn: true },
  { schluessel: 'turbulence', name: 'Turbulenz', text: 'Kleine Wirbel im Wind. Aus: glatte Strömung.', aus: 0, an: 0.6, standardAn: true },
  { schluessel: 'confinement', name: 'Wirbelverstärkung', text: 'Verhindert, dass kleine Wirbel verschmieren (Vorticity Confinement).', aus: 0, an: 6, standardAn: true },
  { schluessel: 'drag', name: 'Reibung', text: 'Bremst die Strömung leicht.', aus: 0, an: 0.02, standardAn: true },
  { schluessel: 'bfecc', name: 'BFECC-Advektion', text: 'Schärferes Mitführen von Farbe und Wind (genauer, etwas teurer).', aus: false, an: true, standardAn: true },
  { schluessel: 'storms', name: 'Stürme', text: 'Antrieb der Stürme (Großer Roter Fleck usw.).', aus: false, an: true, standardAn: true },
  { schluessel: 'convection', name: 'Konvektionswolken', text: 'Aufsteigende helle Wolken.', aus: 0, an: 0.8, standardAn: true },
  { schluessel: 'stormTint', name: 'Sturmfarbe', text: 'Stürme färben das Gas ein.', aus: 0, an: 0.6, standardAn: true },
  { schluessel: 'bandRelax', name: 'Bandrückstellung', text: 'Farbbänder werden langsam zur Grundfarbe zurückgezogen.', aus: 0, an: 0.06, standardAn: true },
  { schluessel: 'fineStripes', name: 'Feinstreifen', text: 'Feine Streifen in den Bändern.', aus: 0, an: 0.5, standardAn: false },
  { schluessel: 'atmosphere', name: 'Atmosphärensaum', text: 'Heller Rand am Planeten.', aus: 0, an: 1, standardAn: true },
  { schluessel: 'relief', name: 'Relief (Wolkenhöhe)', text: 'Schattierung nach Helligkeit: Wolken wirken plastisch.', aus: 0, an: 1, standardAn: true },
  { schluessel: 'depthOn', name: 'Tiefe aus der Physik', text: 'Druck bzw. Wirbelstärke als Höhenrelief.', aus: false, an: true, standardAn: false },
  { schluessel: 'pomOn', name: 'Parallaxe mit Eigenschatten', text: 'Wolken werfen Schatten und verschieben sich mit dem Blickwinkel.', aus: false, an: true, standardAn: false },
  { schluessel: 'twilight', name: 'Dämmerung', text: 'Weicher Übergang an der Tag-Nacht-Grenze.', aus: 'off', an: 'soft', standardAn: false },
  { schluessel: 'rimGlow', name: 'Randschimmer', text: 'Leuchten am Planetenrand.', aus: 'off', an: 'v04', standardAn: true },
];

export const FELS_BAUSTEINE: TypBaustein[] = [
  { schluessel: 'volcanoOn', name: 'Vulkane', text: 'Vulkane aus dem Gesteinsplaneten. Aus: keine Vulkane (der Baustein wird nicht mitkompiliert, die Karte entsteht neu).', aus: false, an: true, standardAn: true },
  { schluessel: 'modWaves', name: 'Wellen', text: 'Wellen und Wind auf dem Meer.', aus: false, an: true, standardAn: true },
  { schluessel: 'modClouds', name: 'Wolken', text: 'Wolkenschicht samt Zonalwinden. Aus: Wolkenkarte wird nicht erzeugt.', aus: false, an: true, standardAn: true },
  { schluessel: 'modShadows', name: 'Geländeschatten', text: 'Berge werfen Schatten.', aus: false, an: true, standardAn: true },
  { schluessel: 'modAtmo', name: 'Luft (Atmosphäre)', text: 'Rayleigh-, Mie- und Ozon-Streuung.', aus: false, an: true, standardAn: true },
  { schluessel: 'modRim', name: 'Leuchtsaum', text: 'Heller Rand am Planeten.', aus: false, an: true, standardAn: false },
  { schluessel: 'modBloom', name: 'Überstrahlung (Bloom)', text: 'Helle Stellen strahlen aus.', aus: false, an: true, standardAn: true },
  { schluessel: 'modFlare', name: 'Linsenreflexe', text: 'Blendenflecke der Sonne.', aus: false, an: true, standardAn: true },
  { schluessel: 'modWaterBody', name: 'Wasserfarbe', text: 'Tiefenfarbe des Wassers (Beer-Lambert).', aus: false, an: true, standardAn: true },
  { schluessel: 'modIce', name: 'Meereis', text: 'Eis an den Polen.', aus: false, an: true, standardAn: true },
  { schluessel: 'modCavity', name: 'Kavität (Verdunklung in Mulden)', text: 'Dunklere Täler und Senken.', aus: false, an: true, standardAn: true },
  { schluessel: 'modMountains', name: 'Gebirgsgürtel', text: 'Zusätzliche Gebirgszüge.', aus: false, an: true, standardAn: true },
  { schluessel: 'erosion', name: 'Erosion', text: 'Erosionsrinnen im Gelände.', aus: 0, an: 1, standardAn: true },
  { schluessel: 'detail', name: 'Feindetail', text: 'Zusätzliche Detail-Oktaven zur Laufzeit.', aus: 0, an: 1, standardAn: true },
  { schluessel: 'terrace', name: 'Terrassen', text: 'Stufenförmiges Gelände.', aus: 0, an: 0.5, standardAn: false },
  { schluessel: 'foam', name: 'Brandung', text: 'Schaum an den Küsten.', aus: 0, an: 0.7, standardAn: true },
];
