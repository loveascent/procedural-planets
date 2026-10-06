// Vorlage Jupiter: Windprofil, Farbbänder, Stürme, Ringe und Steckbrief als Zahlen (keine Bilder).
import type { Preset } from './typen';

export const JUPITER: Preset = {
  name: 'Jupiter',
  wind: [
    [-90, 0], [-72, 15], [-66, -10], [-62, 25], [-57, -15], [-53, 30], [-47, -10], [-43, 35],
    [-39, -25], [-33, 45], [-29, -30], [-26, 55], [-20, -60], [-17, 10], [-7, 140], [0, 90],
    [7, 125], [15, -10], [17, -30], [21, 60], [23.5, 160], [27, 0], [31, 40], [35, -20],
    [39, 30], [43, -10], [48, 25], [52, -15], [56, 30], [60, -10], [66, 20], [72, 5], [90, 0],
  ],
  bands: [
    [-90, '#586572'], [-70, '#6f7784'], [-58, '#8a8176'], [-48, '#a4917b'], [-40, '#c8b69c'],
    [-33, '#9e7b5c'], [-28, '#d9ccb4'], [-22, '#ece2cf'], [-18, '#a87651'], [-12, '#8e5c3d'],
    [-7, '#c9a37f'], [-3, '#efe5d1'], [3, '#e8d9bd'], [8, '#b98c62'], [12, '#8a5535'],
    [17, '#a06a45'], [20, '#eadfc9'], [24, '#b98d68'], [28, '#dccdb1'], [33, '#a8896a'],
    [40, '#c7b89f'], [50, '#998c7c'], [62, '#7c7b80'], [75, '#646d7a'], [90, '#56616e'],
  ],
  storms: [
    { name: 'Großer Roter Fleck', lat: -22.5, lon: 0, radius: 9, kind: 'anticyclone', color: '#b8472a', strength: 0.9 },
    { name: 'Oval BA', lat: -33, lon: 70, radius: 4, kind: 'anticyclone', color: '#d8a58a', strength: 0.6 },
    { name: 'Weißes Oval', lat: -41, lon: 150, radius: 2.5, kind: 'anticyclone', color: '#f2ede2', strength: 0.5 },
    { name: 'Weißes Oval', lat: -41, lon: 200, radius: 2.5, kind: 'anticyclone', color: '#f2ede2', strength: 0.5 },
    { name: 'Braune Barke', lat: 15, lon: 250, radius: 3, kind: 'cyclone', color: '#6e4128', strength: 0.4 },
    { name: 'Nordpol-Zyklon', lat: 84, lon: 0, radius: 5, kind: 'cyclone', color: '#5f6d7d', strength: 0.5 },
    { name: 'Südpol-Zyklon', lat: -85, lon: 0, radius: 5, kind: 'cyclone', color: '#5f6d7d', strength: 0.5 },
  ],
  oblateness: 0.0649,
  tilt: 3.1,
  rotationHours: 9.93,
  cloud: '#efe8da',
  atmosphere: '#8fb2e0',
  atmosphereStrength: 0.35,
  rings: null,
  facts: { diameterKm: 142984, distanceAU: 5.2, yearDays: 4333, tempC: -108, gravity: 24.8, moons: 95, windMs: 150, clouds: ['Ammoniak-Eis, Ammoniumhydrogensulfid, Wasser', 'ammonia ice, ammonium hydrosulfide, water'] },
  tune: { turbulence: 0.4, convection: 0.8, bandWobble: 0.6, stormTint: 1.6, relief: 0.35 },
};
