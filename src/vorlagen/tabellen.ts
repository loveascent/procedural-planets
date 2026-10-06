// Umrechnung in Shader-Tabellen: Windprofil (Jets) und Bandfarben je Breite, auf TABLE Stützstellen.
import type { Preset } from './typen';
import { hexToLinear } from './farben';

function sampleCurve<T>(stops: [number, T][], lat: number, lerp: (a: T, b: T, t: number) => T): T {
  if (lat <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (lat <= stops[i][0]) {
      const [la, a] = stops[i - 1];
      const [lb, b] = stops[i];
      const t = (lat - la) / (lb - la);
      // Glatte Übergänge (smoothstep), damit Jets und Bänder keine Knicke haben.
      return lerp(a, b, t * t * (3 - 2 * t));
    }
  }
  return stops[stops.length - 1][1];
}

export const TABLE = 64;

/** Normiertes Windprofil (Spitzenwert = 1) an 64 Breiten von −90° bis +90°. */
export function windTable(p: Preset): Float32Array {
  const peak = Math.max(...p.wind.map(([, v]) => Math.abs(v)));
  const out = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) {
    const lat = -90 + (180 * i) / (TABLE - 1);
    out[i] = sampleCurve(p.wind, lat, (a, b, t) => a + (b - a) * t) / peak;
  }
  return out;
}

/** Bandfarben (linear RGB) an 64 Breiten. contrast verstärkt/dämpft den Unterschied zum Mittel. */
export function bandTable(p: Preset, contrast: number): Float32Array {
  const stops = p.bands.map(([lat, hex]) => [lat, hexToLinear(hex)] as [number, [number, number, number]]);
  const rows: [number, number, number][] = [];
  const mean = [0, 0, 0];
  for (let i = 0; i < TABLE; i++) {
    const lat = -90 + (180 * i) / (TABLE - 1);
    const c = sampleCurve(stops, lat, (a, b, t): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    rows.push(c);
    for (let k = 0; k < 3; k++) mean[k] += c[k] / TABLE;
  }
  const out = new Float32Array(TABLE * 4);
  rows.forEach((c, i) => {
    for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.max(0, mean[k] + (c[k] - mean[k]) * contrast);
    out[i * 4 + 3] = 1;
  });
  return out;
}
