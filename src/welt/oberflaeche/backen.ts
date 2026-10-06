// Gebackene Oberflächen (Equirect-Bild je Körper, sRGB-Bytes, mit Mip-Stufen). Gasriesen nutzen die vorhandenen Vorlagen
// (Bandfarben aus `randomPreset`), Gesteinskörper und Monde ein 3D-Rauschen mit einer von fünf Paletten. Zeitscheibe per Generator.
import { randomPreset } from '../../vorlagen/zufall.ts';
import { presets } from '../../presets.ts';
import { bandTable, TABLE } from '../../vorlagen/tabellen.ts';
import { hexToLinear } from '../../vorlagen/farben.ts';
import type { Art } from '../physik/koerper.ts';
import { fbm3, rausch3, zellen3 } from './rauschen.ts';

export const TEX_B = 512;
export const TEX_H = 256;
export const MIPS = 9;

type C3 = [number, number, number];
const mix = (a: C3, b: C3, t: number): C3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const klemme = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const stufe = (a: number, b: number, x: number) => { const t = klemme((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lin = (r: number, g: number, b: number): C3 => [Math.pow(r / 255, 2.2), Math.pow(g / 255, 2.2), Math.pow(b / 255, 2.2)];

export type Gestein = 'erde' | 'wueste' | 'eis' | 'lava' | 'grau';
const GESTEINE: Gestein[] = ['erde', 'wueste', 'eis', 'lava', 'grau'];

/** Welche Palette ein Körper bekommt: aus Seed, Monde vorwiegend grau/eisig. */
export function gesteinFuer(art: Art, seed: number): Gestein {
  const h = ((seed >>> 0) % 1000) / 1000;
  if (art !== 'mond') return 'erde';   // Planeten wie der echte Gesteinsplanet (erdähnlich), damit das Überblenden zur Simulation nicht die Art wechselt
  if (art === 'mond') return h < 0.6 ? 'grau' : h < 0.85 ? 'eis' : 'wueste';
  return GESTEINE[Math.min(GESTEINE.length - 1, Math.floor(h * GESTEINE.length))];
}

export interface Bild { daten: Uint8Array[]; breite: number; hoehe: number }

function kodiere(c: C3, aus: Uint8Array, o: number) {
  aus[o] = Math.round(255 * Math.pow(klemme(c[0]), 1 / 2.2));
  aus[o + 1] = Math.round(255 * Math.pow(klemme(c[1]), 1 / 2.2));
  aus[o + 2] = Math.round(255 * Math.pow(klemme(c[2]), 1 / 2.2));
  aus[o + 3] = 255;
}

function mipKette(basis: Uint8Array): Uint8Array[] {
  const stufen = [basis];
  let w = TEX_B, h = TEX_H, src = basis;
  for (let l = 1; l < MIPS; l++) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1);
    const dst = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let k = 0; k < 4; k++) {
      const x0 = Math.min(w - 1, 2 * x), x1 = Math.min(w - 1, 2 * x + 1), y0 = Math.min(h - 1, 2 * y), y1 = Math.min(h - 1, 2 * y + 1);
      dst[(y * nw + x) * 4 + k] = (src[(y0 * w + x0) * 4 + k] + src[(y0 * w + x1) * 4 + k] + src[(y1 * w + x0) * 4 + k] + src[(y1 * w + x1) * 4 + k] + 2) >> 2;
    }
    stufen.push(dst); src = dst; w = nw; h = nh;
  }
  return stufen;
}

function* zeilen(farbe: (nx: number, ny: number, nz: number, lat: number, lon: number) => C3, ziel: Uint8Array) {
  for (let y = 0; y < TEX_H; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) / TEX_H) * Math.PI;
    const cy = Math.cos(lat), sy = Math.sin(lat);
    for (let x = 0; x < TEX_B; x++) {
      const lon = ((x + 0.5) / TEX_B - 0.5) * Math.PI * 2;
      kodiere(farbe(cy * Math.cos(lon), sy, cy * Math.sin(lon), lat, lon), ziel, (y * TEX_B + x) * 4);
    }
    if (y % 8 === 7) yield;
  }
}

function gasFarbe(seed: number, vorlage?: string): (nx: number, ny: number, nz: number, lat: number, lon: number) => C3 {
  const p = (vorlage && presets.find((x) => x.name === vorlage)) || randomPreset((seed >>> 0) || 1);
  const tab = bandTable(p, 1.1);
  const stuerme = p.storms.map((s) => ({ lat: (s.lat * Math.PI) / 180, lon: (s.lon * Math.PI) / 180, r: (s.radius * Math.PI) / 180, c: hexToLinear(s.color), st: s.strength }));
  const s0 = seed & 0xffff;
  return (nx, ny, nz, lat, lon) => {
    const verzug = (fbm3(nx * 2.2, ny * 6, nz * 2.2, s0, 4) - 0.5) * 0.16;
    const f = klemme((((lat + verzug) * 180) / Math.PI + 90) / 180) * (TABLE - 1);
    const i = Math.min(TABLE - 2, Math.floor(f)), t = f - i;
    const c: C3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) c[k] = tab[i * 4 + k] * (1 - t) + tab[(i + 1) * 4 + k] * t;
    const streifen = 0.88 + 0.24 * fbm3(nx * 9, ny * 46, nz * 9, s0 + 5, 4);
    let out: C3 = [c[0] * streifen, c[1] * streifen, c[2] * streifen];
    for (const s of stuerme) {
      const dl = Math.atan2(Math.sin(lon - s.lon), Math.cos(lon - s.lon)) * Math.cos(lat);
      const d = Math.hypot(dl, lat - s.lat) / Math.max(s.r, 1e-3);
      if (d < 1.6) {
        const w = stufe(1.6, 0.6, d) * klemme(s.st * 0.8 + 0.3);
        const wirbel = 0.8 + 0.4 * rausch3(nx * 14 + d * 3, ny * 14, nz * 14, s0 + 9);
        out = mix(out, [s.c[0] * wirbel, s.c[1] * wirbel, s.c[2] * wirbel], w * 0.85);
      }
    }
    return out;
  };
}

function gesteinFarbe(typ: Gestein, seed: number): (nx: number, ny: number, nz: number, lat: number, lon: number) => C3 {
  const s = seed & 0xffff;
  const dreh = ((seed >>> 8) % 100) / 10;
  return (nx, ny, nz, lat) => {
    const px = nx + dreh, py = ny, pz = nz;
    const h = fbm3(px * 2.2, py * 2.2, pz * 2.2, s, 6);
    const fein = fbm3(px * 11, py * 11, pz * 11, s + 40, 4);
    const pol = Math.abs(Math.sin(lat));
    switch (typ) {
      case 'erde': {
        const meer = 0.52;
        if (h < meer) return mix(lin(8, 28, 70), lin(30, 92, 140), stufe(0.3, meer, h));
        const feucht = fbm3(px * 3 + 9, py * 3, pz * 3, s + 7, 4);
        const land = mix(mix(lin(180, 160, 100), lin(48, 100, 44), stufe(0.35, 0.65, feucht)), lin(120, 112, 100), stufe(0.62, 0.8, h));
        const kuest = stufe(meer, meer + 0.015, h);
        let c = mix(lin(214, 204, 150), land, kuest);
        c = mix(c, lin(240, 244, 250), Math.max(stufe(0.78, 0.92, pol + (fein - 0.5) * 0.2), stufe(0.8, 0.9, h)));
        return c;
      }
      case 'wueste': {
        const c = mix(lin(120, 58, 34), lin(214, 140, 84), stufe(0.3, 0.7, h));
        return mix(mix(c, lin(70, 40, 30), stufe(0.55, 0.8, fein) * 0.5), lin(235, 225, 215), stufe(0.9, 0.98, pol) * 0.8);
      }
      case 'eis': {
        const riss = zellen3(px * 3.2, py * 3.2, pz * 3.2, s + 3);
        const c = mix(lin(190, 214, 236), lin(245, 250, 255), stufe(0.3, 0.7, h));
        return mix(lin(70, 100, 140), c, stufe(0.02, 0.09, riss) * (0.85 + 0.15 * fein));
      }
      case 'lava': {
        const riss = zellen3(px * 2.6, py * 2.6, pz * 2.6, s + 11);
        const basalt = mix(lin(18, 14, 14), lin(52, 42, 38), h * (0.6 + 0.8 * fein));
        const glut = stufe(0.12, 0.02, riss + (fein - 0.5) * 0.06);
        return mix(basalt, [4.0, 0.9, 0.12], glut);
      }
      default: {
        const kr = zellen3(px * 4.5, py * 4.5, pz * 4.5, s + 21), kr2 = zellen3(px * 11, py * 11, pz * 11, s + 23);
        const grund = mix(lin(70, 66, 62), lin(150, 146, 140), h * (0.6 + 0.8 * fein));
        const rand = stufe(0.2, 0.26, kr) * stufe(0.34, 0.26, kr);
        const boden = stufe(0.22, 0.1, kr);
        let c = mix(grund, lin(40, 38, 36), boden * 0.6);
        c = mix(c, lin(190, 186, 178), rand * 0.5);
        return mix(c, lin(36, 34, 32), stufe(0.2, 0.08, kr2) * 0.35);
      }
    }
  };
}

function sonnenFarbe(seed: number): (nx: number, ny: number, nz: number, lat: number, lon: number) => C3 {
  const s = seed & 0xffff;
  return (nx, ny, nz) => {
    const g = fbm3(nx * 7, ny * 7, nz * 7, s, 5), k = fbm3(nx * 22, ny * 22, nz * 22, s + 4, 3);
    const t = klemme(0.35 + 0.9 * g + 0.4 * (k - 0.5));
    return mix(lin(255, 110, 20), lin(255, 238, 190), t);
  };
}

/** Bäckt eine Oberfläche in Scheiben; Rückgabewert (nach `done`) ist das Bild mit Mip-Kette. */
export function* backe(art: Art, seed: number, vorlage?: string): Generator<void, Bild, void> {
  const basis = new Uint8Array(TEX_B * TEX_H * 4);
  const farbe = art === 'sonne' ? sonnenFarbe(seed) : art === 'gas' ? gasFarbe(seed, vorlage) : gesteinFarbe(gesteinFuer(art, seed), seed);
  yield* zeilen(farbe, basis);
  return { daten: mipKette(basis), breite: TEX_B, hoehe: TEX_H };
}
