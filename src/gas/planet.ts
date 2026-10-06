// Planetendaten: Vorlage oder Zufallsplanet übernehmen, Wind- und Bandtabellen, Kamerarichtung im Körper.
import type { App } from './app';
import { Vec3, planetRotation, normalize } from '../math';
import { S, OFF_JETS, OFF_BANDS, OFF_CLOUD } from './zustand';
import { RandomOptions, randomPreset, presets, Preset, hexToLinear, windTable, bandTable, TABLE } from '../presets';

export function randomOptions(_a: App): RandomOptions {
  return { family: S.rndFamily, bands: S.rndBands, storms: S.rndStorms as RandomOptions['storms'], rings: S.rndRings as RandomOptions['rings'] };
}

export function applyPreset(a: App) {
  const p = S.preset === 'Zufall' ? randomPreset(S.seed, a.randomOptions()) : presets.find((x) => x.name === S.preset) ?? presets[0];
  const t = p.tune;
  S.turbulence = t.turbulence; S.convection = t.convection; S.bandWobble = t.bandWobble;
  S.stormTint = t.stormTint; S.relief = t.relief;
  a.usePreset(p);
  a.needsInit = true;
}

/** Planetendaten übernehmen, ohne die Regler zu verändern (für Laden und Rückgängig). */
export function usePreset(a: App, p: Preset) {
  a.preset = p;
  a.storms = a.preset.storms.map((s) => ({
    lat: s.lat, lon: s.lon, radius: s.radius, strength: s.strength, kick: 0, life: 0,
    sign: (s.kind === 'cyclone' ? 1 : -1) * (s.lat >= 0 ? 1 : -1) * a.dir(),
    color: hexToLinear(s.color),
  }));
  // Rückläufige Drehung = Spiegelbild: Jets und Drehsinn der Stürme kehren sich um.
  a.jets = windTable(a.preset).map((v) => v * a.dir());
  a.writeTables();
  a.panel?.refresh();
  a.updateInfo();
}

export function writeTables(a: App) {
  const d = a.simData;
  d.set(a.jets, OFF_JETS);
  const bands = bandTable(a.preset, S.contrast);
  d.set(bands, OFF_BANDS);
  d.set([...hexToLinear(a.preset.cloud), 1], OFF_CLOUD);
  // Mittelfarbe für die Partikel-Schiene, flächengewichtet (cos Breite)
  const c = [0, 0, 0]; let wsum = 0;
  for (let i = 0; i < TABLE; i++) {
    const w = Math.cos((-0.5 + i / (TABLE - 1)) * Math.PI) + 1e-3;
    for (let k = 0; k < 3; k++) c[k] += bands[i * 4 + k] * w;
    wsum += w;
  }
  a.centre = [c[0] / wsum, c[1] / wsum, c[2] / wsum];
}

/** Kamerarichtung in Körperkoordinaten (für Partikel im Sichtfeld). */
export function camBody(a: App): Vec3 {
  const cy = Math.cos(a.cam.pitch);
  const eye: Vec3 = [Math.sin(a.cam.yaw) * cy, Math.sin(a.cam.pitch), Math.cos(a.cam.yaw) * cy];
  const m = planetRotation((a.preset.tilt * Math.PI) / 180, a.spin);
  return normalize([
    m[0][0] * eye[0] + m[1][0] * eye[1] + m[2][0] * eye[2],
    m[0][1] * eye[0] + m[1][1] * eye[1] + m[2][1] * eye[2],
    m[0][2] * eye[0] + m[1][2] * eye[1] + m[2][2] * eye[2],
  ]);
}

export function jetAt(a: App, latRad: number): number {
  const x = Math.min(Math.max((latRad / Math.PI + 0.5) * (TABLE - 1), 0), TABLE - 1);
  const i = Math.floor(x), j = Math.min(i + 1, TABLE - 1);
  return (a.jets[i] + (a.jets[j] - a.jets[i]) * (x - i)) * S.jetStrength;
}
