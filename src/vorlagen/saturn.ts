// Vorlage Saturn: Windprofil, Farbbänder, Stürme, Ringe und Steckbrief als Zahlen (keine Bilder).
import type { Preset } from './typen';

export const SATURN: Preset = {
  name: 'Saturn',
  wind: [
    [-90, 0], [-78, 100], [-70, 0], [-62, 50], [-55, -20], [-45, 80], [-38, 0], [-30, 120],
    [-20, 300], [-10, 420], [0, 450], [10, 420], [20, 300], [30, 120], [38, 0], [45, 80],
    [55, -20], [62, 50], [70, 0], [78, 120], [90, 0],
  ],
  bands: [
    [-90, '#6f7a86'], [-70, '#a59a82'], [-50, '#cdb994'], [-35, '#dcc9a3'], [-20, '#e6d4ad'],
    [-8, '#ecdcb6'], [0, '#f0e2bf'], [8, '#e8d5ac'], [20, '#dcc59c'], [32, '#cfb58c'],
    [45, '#c8b393'], [60, '#b6a88f'], [74, '#8f9296'], [90, '#6c7886'],
  ],
  storms: [
    { name: 'Nordpolar-Wirbel', lat: 88, lon: 0, radius: 4, kind: 'cyclone', color: '#7d8a8f', strength: 0.3 },
    { name: 'Weißer Fleck', lat: 42, lon: 90, radius: 3, kind: 'anticyclone', color: '#f3ead6', strength: 0.3 },
  ],
  oblateness: 0.0980,
  tilt: 26.7,
  rotationHours: 10.66,
  cloud: '#f4ecd8',
  atmosphere: '#d9c8a0',
  atmosphereStrength: 0.25,
  rings: { inner: 1.24, outer: 2.27, color: '#d8c7a4', opacity: 0.9 },
  facts: { diameterKm: 120536, distanceAU: 9.58, yearDays: 10759, tempC: -139, gravity: 10.4, moons: 274, windMs: 500, clouds: ['Ammoniak-Eis', 'ammonia ice'] },
  tune: { turbulence: 0.35, convection: 0.25, bandWobble: 0.6, stormTint: 0.4, relief: 0.1 },
};
