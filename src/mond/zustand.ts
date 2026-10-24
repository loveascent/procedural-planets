import { BAUSTEINE } from './bausteine/index';
import type { Settings, Wert } from './typen';

// Zustand: ein flaches Objekt. Je Baustein <id>_an (Schalter) und <id>_<regler>; dazu globale Werte für Ansicht und Licht.
export interface Global { k: string; de: string; en: string; min: number; max: number; step: number; def: number; hint: [string, string]; fmt?: (v: number) => string }

export const GLOBAL_LICHT: Global[] = [
  { k: 'sonneAz', de: 'Sonne Richtung', en: 'Sun azimuth', min: -180, max: 180, step: 1, def: 52, hint: ['Richtung der Sonne um die Blickachse (Grad). 0 = Sonne im Rücken (Vollmond), ±90 = Halbmond, ±180 = Neumond (Gegenlicht).', 'Direction of the sun around the view axis (degrees). 0 = sun behind you (full moon), ±90 = half moon, ±180 = new moon (backlit).'], fmt: (v) => `${v.toFixed(0)}°` },
  { k: 'sonneEl', de: 'Sonne Höhe', en: 'Sun elevation', min: -80, max: 80, step: 1, def: 12, hint: ['Neigung der Sonne über der Blickebene. Flaches Licht lässt Reliefs und Kraterschatten hervortreten.', 'Tilt of the sun above the view plane. Low light brings out relief and crater shadows.'], fmt: (v) => `${v.toFixed(0)}°` },
  { k: 'sonne', de: 'Sonnenstärke', en: 'Sun strength', min: 0.2, max: 8, step: 0.05, def: 1.7, hint: ['Bestrahlungsstärke. Weiter außen im Sonnensystem ist sie schwächer (Saturn: 1 %); die Belichtung gleicht das aus.', 'Irradiance. Farther out in the solar system it is weaker (Saturn: 1 %); exposure compensates.'] },
  { k: 'belichtung', de: 'Belichtung', en: 'Exposure', min: 0.2, max: 4, step: 0.02, def: 1.0, hint: ['Helligkeit des Bildes vor der Filmkurve (ACES).', 'Image brightness before the film curve (ACES).'] },
  { k: 'planetenlicht', de: 'Planetenlicht (Nachtseite)', en: 'Planet-shine (night side)', min: 0, max: 1, step: 0.01, def: 0.06, hint: ['Streulicht eines nahen Riesenplaneten (oder der Erde: Erdschein) auf der Nachtseite; fahles, bläuliches Fülllicht.', 'Scattered light from a nearby giant planet (or Earth: earthshine) on the night side; faint bluish fill light.'] },
  { k: 'glanz', de: 'Glanzlicht', en: 'Specular', min: 0, max: 2, step: 0.01, def: 1, hint: ['Stärke der Spiegelung auf Eis und Flüssigkeiten (GGX).', 'Strength of the reflection on ice and liquids (GGX).'] },
  { k: 'schatten', de: 'Geländeschatten', en: 'Terrain shadows', min: 0, max: 1, step: 0.01, def: 1, hint: ['Schattenwurf von Kraterrändern und Bergen: Der Lichtstrahl wird über die Höhenkarte verfolgt (weicher Rand).', 'Shadows cast by crater rims and mountains: the light ray is traced over the height map (soft edge).'] },
  { k: 'ao', de: 'Hohlraumdunkelung', en: 'Occlusion', min: 0, max: 1, step: 0.01, def: 0.7, hint: ['Dunkelt Täler und Kraterböden durch verdeckten Himmel ab (Horizontsuche in der Höhenkarte).', 'Darkens valleys and crater floors by blocked sky (horizon search in the height map).'] },
  { k: 'relief', de: 'Reliefüberhöhung', en: 'Relief exaggeration', min: 0, max: 6, step: 0.05, def: 1, hint: ['Vergrößert die Neigungen im Licht (Normalen), nicht die Silhouette. 1 = wahr.', 'Scales slopes in the lighting (normals), not the silhouette. 1 = true.'] },
  { k: 'detail', de: 'Live-Detail beim Zoomen', en: 'Live detail when zooming', min: 0, max: 1, step: 0.01, def: 1, hint: ['Kleinste Krater und Körnung unterhalb der Kartenauflösung werden pro Pixel berechnet, damit beim Heranzoomen nichts verschwimmt.', 'The smallest craters and grain below map resolution are computed per pixel so nothing blurs when zooming in.'] },
  { k: 'sterne', de: 'Sterne', en: 'Stars', min: 0, max: 2, step: 0.01, def: 1, hint: ['Helligkeit von Sternen und Milchstraße im Hintergrund (gleicher Himmel wie bei den anderen Planeten).', 'Brightness of stars and Milky Way in the background (same sky as the other planets).'] },
];

export const GLOBAL_ANSICHT: Global[] = [
  { k: 'drehung', de: 'Drehung', en: 'Spin speed', min: -2, max: 2, step: 0.01, def: 0.06, hint: ['Eigendrehung des Mondes in Radiant pro Sekunde. Gebundene Rotation = der Mond zeigt dem Planeten immer dieselbe Seite.', 'Spin of the moon in radians per second. Tidal locking = the moon always shows the same face to its planet.'] },
  { k: 'fov', de: 'Blickwinkel', en: 'Field of view', min: 15, max: 80, step: 1, def: 36, hint: ['Vertikaler Öffnungswinkel der Kamera.', 'Vertical field of view of the camera.'], fmt: (v) => `${v}°` },
  { k: 'kante', de: 'Kantenglättung', en: 'Anti-aliasing', min: 1, max: 2, step: 1, def: 2, hint: ['2 = Stillstandsbild mit 2×2 Überabtastung; bei Bewegung wird automatisch grob gerechnet.', '2 = still image with 2×2 supersampling; while moving, it automatically renders coarse.'] },
];

export const GLOBAL_DEF: Settings = {
  seed: '7', res: 1024, typ: 'erdmond',
  ...Object.fromEntries([...GLOBAL_LICHT, ...GLOBAL_ANSICHT].map((g) => [g.k, g.def])),
};

/** Standardwerte aller Bausteine und globalen Regler. */
export function standard(): Settings {
  const s: Settings = { ...GLOBAL_DEF };
  for (const b of BAUSTEINE) {
    s[`${b.id}_an`] = b.an;
    for (const p of b.par) s[`${b.id}_${p.k}`] = p.def;
  }
  return s;
}

/** Zahl aus dem Seed-Text (Text oder Zahl). */
export function seedZahl(seed: string): number {
  const n = Number(seed);
  if (Number.isFinite(n) && seed.trim() !== '') return n;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 1000;
}

export function mitWerten(basis: Settings, ueber: Record<string, Wert>): Settings { return { ...basis, ...ueber }; }
