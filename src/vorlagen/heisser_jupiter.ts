// Vorlage Heißer Jupiter: Windprofil, Farbbänder, Stürme, Ringe und Steckbrief als Zahlen (keine Bilder).
import type { Preset } from './typen';

export const HEISSER_JUPITER: Preset = {
  name: 'Heißer Jupiter',
  wind: [
    [-90, 0], [-60, -200], [-30, 300], [-10, 1500], [0, 2000], [10, 1500], [30, 300], [60, -200], [90, 0],
  ],
  bands: [
    [-90, '#2a1410'], [-60, '#4a1d12'], [-35, '#7a2e14'], [-15, '#b0481a'], [0, '#d8732a'],
    [15, '#a8431a'], [35, '#6e2912'], [60, '#43190f'], [90, '#26120e'],
  ],
  storms: [
    { name: 'Heißer Fleck', lat: 0, lon: 30, radius: 14, kind: 'anticyclone', color: '#ffb45a', strength: 0.3 },
  ],
  oblateness: 0.01,
  tilt: 0,
  rotationHours: 72,
  cloud: '#ffcf8a',
  atmosphere: '#ff9a5a',
  atmosphereStrength: 0.4,
  rings: null,
  facts: { diameterKm: 163000, distanceAU: 0.031, yearDays: 2.2, tempC: 1200, gravity: 21, moons: 0, windMs: 2400, clouds: ['Silikate (Glasregen)', 'silicates (glass rain)'], locked: true, note: ['Werte wie HD 189733 b', 'values like HD 189733 b'] },
  tune: { turbulence: 0.8, convection: 0.2, bandWobble: 1.2, stormTint: 0.5, relief: 0.15 },
};
