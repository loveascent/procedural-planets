// Vorlage Uranus: Windprofil, Farbbänder, Stürme, Ringe und Steckbrief als Zahlen (keine Bilder).
import type { Preset } from './typen';

export const URANUS: Preset = {
  name: 'Uranus',
  wind: [
    [-90, 0], [-60, 200], [-30, 60], [-15, -50], [0, -80], [15, -50], [30, 60], [60, 240], [90, 0],
  ],
  bands: [
    [-90, '#b9e4ea'], [-60, '#a9dbe3'], [-30, '#9fd3dd'], [0, '#9ccfda'], [30, '#a2d5de'],
    [55, '#b3dee6'], [75, '#c8e9ee'], [90, '#d2edf1'],
  ],
  storms: [
    { name: 'Heller Fleck', lat: 30, lon: 60, radius: 3, kind: 'anticyclone', color: '#e4f5f7', strength: 0.3 },
  ],
  oblateness: 0.0229,
  tilt: 97.8,
  rotationHours: 17.24,
  cloud: '#f0fbfc',
  atmosphere: '#bff0ff',
  atmosphereStrength: 0.45,
  rings: { inner: 1.64, outer: 2.0, color: '#6d7478', opacity: 0.25 },
  facts: { diameterKm: 51118, distanceAU: 19.19, yearDays: 30687, tempC: -195, gravity: 8.7, moons: 29, windMs: 250, clouds: ['Methan-Eis', 'methane ice'], note: ['liegt auf der Seite (98° Neigung), dreht rückläufig', 'lies on its side (98° tilt), spins retrograde'] },
  tune: { turbulence: 0.2, convection: 0.6, bandWobble: 0.4, stormTint: 0.4, relief: 0.4 },
};
