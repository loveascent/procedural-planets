import type { Facts } from './typen';
// Zufallsplanet: Seed, Optionen und der Zufallsgenerator für Wind, Bänder, Stürme und Ringe.
import type { Preset, Storm } from './typen';

/** Neuer Zufallswert aus dem Zufallsgenerator des Browsers (32 Bit). */
export function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] || 1;
}

/**
 * Zufälliger Gasplanet aus einem Seed. Gleicher Seed = gleicher Planet (reproduzierbar, speicherbar).
 * Erst wird eine Familie gewürfelt (jupiter-, saturnartig, Eisriese, heißer Jupiter, exotisch),
 * dann Bänder mit ungleichen Breiten, Jets an den Bandgrenzen, Stürme, Ringe und Stimmung.
 */
export interface RandomOptions {
  family?: string;                  // '' = würfeln, sonst jovian | saturnian | ice | hot | exotic
  bands?: number;                   // 0 = würfeln, sonst Anzahl Bänder
  storms?: 'auto' | 'none' | 'few' | 'many';
  rings?: 'auto' | 'yes' | 'no';
}

export function randomPreset(seed: number, opts: RandomOptions = {}): Preset {
  // mulberry32: kleiner, guter Pseudozufall
  let st = seed >>> 0;
  const rnd = () => {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = st;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (a: number, b: number) => a + (b - a) * rnd();
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const hsl = (h: number, sat: number, l: number) => {
    h = ((h % 360) + 360) % 360;
    const a = sat * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
    return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
  };

  type Family = { name: string; hue: [number, number]; sat: [number, number]; zoneL: [number, number]; beltL: [number, number];
    bands: [number, number]; eq: number; jet: [number, number]; contrast: number; atmoSat: number };
  const families: Family[] = [
    { name: 'jovian', hue: [20, 45], sat: [0.25, 0.55], zoneL: [0.78, 0.9], beltL: [0.35, 0.55], bands: [10, 18], eq: 1, jet: [40, 160], contrast: 1, atmoSat: 0.4 },
    { name: 'saturnian', hue: [35, 55], sat: [0.2, 0.4], zoneL: [0.75, 0.88], beltL: [0.6, 0.72], bands: [8, 14], eq: 3, jet: [30, 120], contrast: 0.5, atmoSat: 0.3 },
    { name: 'ice', hue: [185, 230], sat: [0.35, 0.65], zoneL: [0.55, 0.75], beltL: [0.4, 0.6], bands: [4, 9], eq: -2, jet: [60, 250], contrast: 0.6, atmoSat: 0.6 },
    { name: 'hot', hue: [0, 30], sat: [0.55, 0.85], zoneL: [0.45, 0.65], beltL: [0.15, 0.3], bands: [5, 10], eq: 6, jet: [100, 400], contrast: 1.2, atmoSat: 0.8 },
    { name: 'exotic', hue: [0, 360], sat: [0.3, 0.7], zoneL: [0.6, 0.85], beltL: [0.25, 0.5], bands: [6, 20], eq: 0, jet: [30, 200], contrast: 1, atmoSat: 0.6 },
  ];
  // Erst würfeln, dann Vorgaben anwenden: so bleibt der Zufallsstrom gleich, und derselbe Seed
  // ergibt ohne Vorgaben denselben Planeten wie in v0.2.3.
  const rolled = pick(families);
  const fam = families.find((f) => f.name === opts.family) ?? rolled;
  const hue = range(fam.hue[0], fam.hue[1]);
  const accentHue = hue + pick([30, 60, 150, 180, 210, -40]);

  // Bandgrenzen mit ungleichen Breiten (Summe = 180°)
  const nbRolled = Math.round(range(fam.bands[0], fam.bands[1]));
  const nb = opts.bands && opts.bands >= 2 ? Math.round(opts.bands) : nbRolled;
  const widths = Array.from({ length: nb }, () => range(0.4, 1.6));
  const total = widths.reduce((x, y) => x + y, 0);
  const edges: number[] = [-90];
  for (const w of widths) edges.push(edges[edges.length - 1] + (180 * w) / total);
  edges[edges.length - 1] = 90;

  // Farben: abwechselnd helle Zonen und dunkle Gürtel, gelegentlich Akzentband, Pole kühler
  const bands: [number, string][] = [];
  for (let i = 0; i < nb; i++) {
    const mid = (edges[i] + edges[i + 1]) / 2;
    const polar = Math.pow(Math.abs(mid) / 90, 2);
    const zone = i % 2 === 0;
    let h = hue + range(-12, 12);
    if (rnd() < 0.12) h = accentHue;
    const l = zone ? range(fam.zoneL[0], fam.zoneL[1]) : range(fam.beltL[0], fam.beltL[1]);
    const c = hsl(h + polar * range(-40, 60), range(fam.sat[0], fam.sat[1]) * (1 - 0.5 * polar), l * (1 - 0.25 * polar));
    bands.push([mid, c]);
  }
  bands.unshift([-90, hsl(hue + 180 * range(0, 0.4), 0.2, range(0.3, 0.5))]);
  bands.push([90, hsl(hue + 180 * range(0, 0.4), 0.2, range(0.3, 0.5))]);

  // Jets an den Bandgrenzen mit wechselndem Vorzeichen, Äquatorjet je nach Familie
  const wind: [number, number][] = [[-90, 0]];
  for (let i = 1; i < nb; i++) {
    const lat = edges[i];
    const sign = i % 2 === 0 ? 1 : -1;
    const cos = Math.cos((lat * Math.PI) / 180);
    const eqPart = fam.eq * 60 * Math.exp(-Math.pow(lat / range(12, 30), 2));
    wind.push([lat, sign * range(fam.jet[0], fam.jet[1]) * (0.4 + 0.6 * cos) + eqPart]);
  }
  wind.push([90, 0]);

  // Stürme: ein großer Hauptsturm (manchmal), Ovale, Barken
  const storms: Storm[] = [];
  const stormMode = opts.storms ?? 'auto';
  if (stormMode !== 'none' && (rnd() < 0.6 || stormMode === 'many')) {
    const lat = range(-35, 35);
    storms.push({ name: 'Großer Fleck', lat, lon: range(0, 360), radius: range(5, 11), kind: 'anticyclone',
      color: pick([hsl(accentHue, 0.6, 0.45), hsl(hue - 20, 0.7, 0.4), hsl(hue, 0.15, 0.9), hsl(hue + 200, 0.5, 0.25)]), strength: range(0.6, 1) });
  }
  const smallRolled = Math.floor(range(0, 9));
  const small = stormMode === 'none' ? 0 : stormMode === 'few' ? Math.min(smallRolled, 3) : stormMode === 'many' ? smallRolled + 8 : smallRolled;
  for (let i = 0; i < small; i++) {
    const anti = rnd() < 0.7;
    storms.push({ name: anti ? 'Oval' : 'Barke', lat: range(-70, 70), lon: range(0, 360), radius: range(1.5, 4.5),
      kind: anti ? 'anticyclone' : 'cyclone', color: anti ? hsl(hue, 0.15, range(0.85, 0.95)) : hsl(hue, 0.5, range(0.2, 0.35)), strength: range(0.3, 0.7) });
  }

  const tilt = rnd() < 0.08 ? range(60, 100) : range(0, 35);
  const ringRoll = rnd();
  const wantRings = opts.rings === 'yes' || (opts.rings !== 'no' && ringRoll < 0.4);
  const rings = wantRings
    ? (() => { const inner = range(1.2, 1.7); return { inner, outer: inner + range(0.25, 1.3), color: hsl(hue + range(-30, 30), range(0.05, 0.3), range(0.4, 0.8)), opacity: range(0.15, 0.9) }; })()
    : null;

  const oblateness = range(0.005, 0.12), rotationHours = range(7, 30);
  const cloud = hsl(hue + range(-20, 20), 0.2, range(0.88, 0.97));
  const atmosphere = hsl(fam.name === 'hot' ? range(10, 30) : hue + range(150, 210), fam.atmoSat, 0.7), atmosphereStrength = range(0.2, 0.6);
  const tune = { turbulence: range(0.2, 0.8), convection: range(0, 1.5), bandWobble: range(0.3, 1.2), stormTint: range(0.6, 2), relief: range(0.1, 0.5) };
  // Steckbrief: plausible Werte für einen Stern wie die Sonne (Gleichgewichtstemperatur ~ 255 K/√a).
  const dia: Record<string, [number, number]> = { jovian: [110000, 160000], saturnian: [95000, 130000], ice: [40000, 60000], hot: [120000, 220000], exotic: [30000, 220000] };
  const au = fam.name === 'hot' ? range(0.02, 0.08) : fam.name === 'ice' ? range(12, 45) : range(2, 15);
  const diameterKm = Math.round(range(dia[fam.name][0], dia[fam.name][1]) / 100) * 100;
  const tempC = Math.round(255 / Math.sqrt(au) - 273 + range(-20, 20) + (fam.name === 'hot' ? 300 : 0));
  const clouds: [string, string] = tempC > 700 ? ['Silikate, Eisen', 'silicates, iron'] : tempC > 0 ? ['Wasser, Salze', 'water, salts']
    : tempC > -150 ? ['Ammoniak-Eis', 'ammonia ice'] : ['Methan-Eis', 'methane ice'];
  const facts: Facts = {
    diameterKm, distanceAU: +au.toFixed(au < 1 ? 3 : 2), yearDays: +(365.25 * Math.pow(au, 1.5)).toFixed(1), tempC,
    gravity: +(24.8 * (diameterKm / 142984) * range(0.6, 1.4)).toFixed(1),
    moons: fam.name === 'hot' ? 0 : Math.floor(range(0, 120)), windMs: Math.round(range(fam.jet[0], fam.jet[1]) * 2),
    clouds, locked: fam.name === 'hot',
  };
  return {
    name: `Zufall #${seed.toString(16).padStart(8, '0')}`, wind, bands, storms,
    oblateness, tilt, rotationHours: fam.name === 'hot' ? facts.yearDays * 24 : rotationHours, facts,
    cloud, atmosphere, atmosphereStrength, rings, tune,
  };
}
