// Vorlage Neptun: Windprofil, Farbbänder, Stürme, Ringe und Steckbrief als Zahlen (keine Bilder).
import type { Preset } from './typen';

export const NEPTUN: Preset = {
  name: 'Neptun',
  wind: [
    [-90, 0], [-70, 250], [-50, 150], [-30, -100], [-15, -300], [0, -400], [15, -300],
    [30, -100], [50, 150], [70, 250], [90, 0],
  ],
  bands: [
    [-90, '#2b4f9e'], [-65, '#3c68c4'], [-45, '#3563be'], [-25, '#4a7bd6'], [-10, '#3a6bc8'],
    [0, '#4677d2'], [15, '#3e6fcc'], [35, '#4a7ad4'], [55, '#3563c0'], [75, '#2f58ad'], [90, '#284c98'],
  ],
  storms: [
    { name: 'Großer Dunkler Fleck', lat: -20, lon: 0, radius: 7, kind: 'anticyclone', color: '#1a2f70', strength: 0.7 },
    { name: 'Begleitwolke', lat: -26, lon: 8, radius: 2.5, kind: 'anticyclone', color: '#e6eefc', strength: 0.3 },
    { name: 'Scooter', lat: -42, lon: 120, radius: 2.5, kind: 'anticyclone', color: '#d9e4f8', strength: 0.4 },
    { name: 'Dunkler Fleck 2', lat: -55, lon: 220, radius: 3.5, kind: 'anticyclone', color: '#213a80', strength: 0.5 },
  ],
  oblateness: 0.0171,
  tilt: 28.3,
  rotationHours: 16.11,
  cloud: '#f2f6ff',
  atmosphere: '#7fb0ff',
  atmosphereStrength: 0.5,
  rings: null,
  facts: { diameterKm: 49528, distanceAU: 30.07, yearDays: 60190, tempC: -201, gravity: 11.2, moons: 16, windMs: 580, clouds: ['Methan-Eis', 'methane ice'] },
  tune: { turbulence: 0.5, convection: 1.6, bandWobble: 0.7, stormTint: 0.8, relief: 0.6 },
};
