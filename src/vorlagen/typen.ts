// Typen der Planeten-Vorlagen: Sturm, Vorlage (Preset) und Steckbrief-Werte.
export interface Storm {
  name: string;
  lat: number;        // Grad
  lon: number;        // Grad
  radius: number;     // Grad (Bogenmaß auf der Kugel)
  kind: 'anticyclone' | 'cyclone';
  color: string;
  strength: number;   // relativ zum Jet-Spitzenwert
}

export interface Preset {
  name: string;
  wind: [number, number][];
  bands: [number, string][];     // [Breite, Farbe], wird linear interpoliert
  storms: Storm[];
  oblateness: number;
  tilt: number;                  // Achsneigung in Grad
  rotationHours: number;
  atmosphere: string;
  cloud: string;                 // Farbe aufsteigender Konvektionswolken
  atmosphereStrength: number;
  rings: null | { inner: number; outer: number; color: string; opacity: number };
  // Startwerte für Regler, die je Planet sinnvoll anders sind
  tune: { turbulence: number; convection: number; bandWobble: number; stormTint: number; relief: number };
  facts?: Facts;
}

/** Steckbrief für die Anzeige oben links (echte Werte bei den Vorlagen, plausible beim Zufallsplaneten). */
export interface Facts {
  diameterKm: number;
  distanceAU: number;
  yearDays: number;
  tempC: number;               // an der Wolkenobergrenze
  gravity: number;             // m/s²
  moons: number;
  windMs: number;              // stärkste Winde
  clouds: [string, string];    // [deutsch, englisch]
  locked?: boolean;            // gebundene Rotation (Tag = Jahr)
  note?: [string, string];
}
