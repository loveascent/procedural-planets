import { TABLE } from '../presets';

export const isPhone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;

export const S = {
  preset: 'Jupiter',
  seed: 1,
  quality: isPhone ? 'phone' : 'high',
  // Rechenmodell und Darstellung, frei kombinierbar:
  flow: 'fluid',          // 'fluid' = Stable Fluids (mofu), 'curl' = Curl-Noise (jasper-r / Gaseous Giganticus)
  look: 'dye',            // 'dye' = Farbstoff, 'particles' = Partikel mit Bandfarben, 'pure' = reine Partikel (jasper-r)
  timeScale: 1,           // Tempo: Simulationszeit pro Sekunde Echtzeit (ändert nur die Geschwindigkeit, nicht die Form)
  retro: false,           // Drehrichtung rückläufig: spiegelt Rotation, Jets und Sturm-Drehsinn
  seamless: false,        // nahtlos exakte Abtastung an Würfelkanten (für GPUs ohne nahtlose Cubemaps)
  paused: false,
  autoQuality: true,       // hält ≥ 60 fps: misst beim Laden, passt Auflösung an
  pixelDensity: isPhone ? 1 : 1.25,  // Render-Pixel pro CSS-Pixel (über 1 = Supersampling)
  // Fluid
  velRes: 128,
  iterations: 24,
  bfecc: true,
  jetStrength: 0.06,
  jetRelax: 0.25,
  omega: 0.4,
  turbulence: 0.6,
  turbScale: 4,
  confinement: 6,          // Look von v0.1 (vom Urheber auf Hardware bestätigt)
  drag: 0.02,
  // Curl-Noise
  curlStrength: 0.5,
  curlFreq: 4,
  curlSpeed: 0.04,
  curlOctaves: 4,
  curlRes: isPhone ? 256 : 384,
  vortexCount: 32,
  vortexStrength: 1,
  // Partikel
  particles: isPhone ? 262144 : 1048576,
  lifetime: 6,
  opacity: 0.35,
  blur: 0.12,
  fade: 0.05,             // Partikel-Schiene: Verblassen zur Mittelfarbe (1/s)
  viewFocus: 0,           // Anteil der Partikel, die im Sichtfeld geboren werden
  // Zufallsplanet
  rndFamily: '',
  rndBands: 0,
  rndStorms: 'auto',
  rndRings: 'auto',
  // Farbe und Stürme
  dyeRes: isPhone ? 384 : 768,
  bandRelax: 0.06,
  fineStripes: 0,
  bandWobble: 1,
  contrast: 1,
  convection: 0.8,
  storms: true,
  remember: false,        // Modul „Zustand merken“: eingeschwungenen Zustand im Browser speichern, beim nächsten Laden sofort da
  focusStorm: true,       // beim Start den Hauptsturm (z. B. Großer Roter Fleck) auf die Tagseite vor die Kamera drehen
  stormStrength: 1,
  stormSize: 1,
  eddyStrength: 1.5,      // Flüssigkeit 1,5 (Vorgabe des Urhebers), Partikel 1 – siehe EDDY_BY_LOOK
        // Strudel-Stärke: Antrieb von Turbulenz, Stürmen und Wirbeln, getrennt von der Jet-Geschwindigkeit           // Größe der Stürme (Radius-Faktor), unabhängig vom Drehtempo
  stormTint: 0.6,
  stormHold: 1,
  stormSpawn: 2,          // Vorgabe des Urhebers (war 0,3)
  kickLife: 30,           // Vorgabe des Urhebers (war 2,5)
          // Sekunden, die ein neuer Sturm angetrieben wird, danach lebt er frei
  // Licht und Ansicht
  sunAngle: 35,
  // Relief-Module (alle aus = wie v0.4)
  reliefMulti: false,     // mehrstufiges Relief
  reliefCoarse: 1,        // Anteil der groben Stufen (große Wirbel, Bänder)
  reliefFine: 0.3,        // Anteil der feinen Stufe (Krümel, Partikel)
  reliefSize: 1,          // Größe der groben Stufen
  reliefAdapt: true,      // Schrittweite an die Pixelgröße anpassen (gegen Krabbeln/Flimmern)
  depthOn: false,         // Tiefe aus der Physik
  depthStrength: 1,
  depthSource: 'pressure',// 'pressure' (nur Stable Fluids) | 'vorticity' (beide Modelle)
  twilight: 'off',       // Vorgabe des Urhebers (v0.4-Streifen sah wie eine Kraterlinie aus)
        // Dämmerung: 'v04' | 'off' | 'soft'
  rimGlow: 'v04',         // Randschimmer: 'v04' | 'soft' | 'off'
  pomOn: false,           // Parallaxe mit Eigenschatten
  pomHeight: 1,
  pomShadow: 1,
  relief: 1,              // Flüssigkeit 1,0 (Vorgabe des Urhebers), Partikel 0,35 – siehe RELIEF_BY_LOOK
  limb: 1.15,
  atmosphere: 1,
  exposure: 0.95,
  nebula: 1,              // Milchstraße (gemeinsamer Himmel aller Planeten-Seiten)
  stars: 1,
  spinSpeed: 0.5,
  view: 0,
  map: false,
};
// „Zustand merken“ bleibt über das Neuladen hinweg an (sonst wäre es nach jedem Laden wieder aus)
try { S.remember = localStorage.getItem('fgp-remember') === '1'; } catch { /* Speicher gesperrt */ }
export type Key = keyof typeof S;
export const RELIEF_BY_LOOK: Record<string, number> = { dye: 1, particles: 0.35, pure: 0.35 };  // Flüssigkeit 1,0 (Vorgabe des Urhebers)
export const EDDY_BY_LOOK: Record<string, number> = { dye: 1.5, particles: 1, pure: 1 };
export const DEFAULTS = { ...S };

// Geräteklassen: Startwerte und Obergrenzen der Regler. "ultra" schaltet die großen Werte frei.
export type Tier = { velRes: number; dyeRes: number; curlRes: number; particles: number; dpr: number; iterations?: number;
  fluid?: { velRes: number; dpr: number } };  // fluid = abweichende Startwerte, wenn die Darstellung "Flüssigkeit" ist
export const QUALITY: Record<string, Tier> = {
  // Startwerte vom Urheber (2026-09-28, auf Hardware ausgesucht)
  phone: { velRes: 128, dyeRes: 1024, curlRes: 256, particles: 983040, dpr: 1, iterations: 12 },
  standard: { velRes: 128, dyeRes: 768, curlRes: 384, particles: 1048576, dpr: 1.25 },
  high: { velRes: 256, dyeRes: 2048, curlRes: 768, particles: 983040, dpr: 1.75, iterations: 24, fluid: { velRes: 352, dpr: 2 } },
  ultra: { velRes: 256, dyeRes: 2560, curlRes: 1024, particles: 4489216, dpr: 4, iterations: 24 },
  // alte Startwerte (v0.4), weiter wählbar
  phone04: { velRes: 96, dyeRes: 384, curlRes: 256, particles: 262144, dpr: 1 },
  high04: { velRes: 192, dyeRes: 1024, curlRes: 768, particles: 4194304, dpr: 1.75 },
  ultra04: { velRes: 256, dyeRes: 1536, curlRes: 1024, particles: 8388608, dpr: 2 },
};

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cubemap-Felder
// ---------------------------------------------------------------------------

export interface CubeField { tex: GPUTexture; cube: GPUTextureView; store: GPUTextureView; n: number }

export interface FilmOptions { frames?: number; cols?: number; scale?: number; everySeconds?: number; everySteps?: number }
export interface Filmstrip { image: string; stats: { t: number; frame: number; fps: number; detail: number; change: number }[] }

// Aufbau des Sim-Uniforms (in floats), muss zu struct Sim in common.wgsl passen.
export const MAX_STORMS = 16;
export const OFF_CLOUD = 32;
export const OFF_CENTRE = OFF_CLOUD + 4;
export const OFF_VIEW = OFF_CENTRE + 4;
export const OFF_MODE = OFF_VIEW + 4;
export const OFF_JETS = OFF_MODE + 4;
export const OFF_BANDS = OFF_JETS + TABLE;
export const OFF_STORMS = OFF_BANDS + TABLE * 4;
export const OFF_INFO = OFF_STORMS + MAX_STORMS * 4;
export const OFF_WEIGHT = OFF_INFO + MAX_STORMS * 4;
export const SIM_FLOATS = OFF_WEIGHT + MAX_STORMS;
export const RENDER_FLOATS = 16 + 4 * 15;
// Fester Zeitschritt: Zeitraffer und Einschwingen machen mehr Schritte, nicht größere.
export const DT = 1 / 60;
// Vorrechnen beim Start (unsichtbar, hinter dem Ladebild): 20 s Simulationszeit, damit der
// Planet "mitten im Geschehen" erscheint statt sichtbar bei null anzufangen.
export const WARM_STEPS = 1200;
// Stufen für die automatische Qualität: [Windgitter, Farbauflösung]
export const AUTO_TIERS: [number, number][] = [[256, 1536], [192, 1024], [128, 768], [128, 512], [96, 384], [64, 256]];
// Budget für einen Simulationsschritt, damit neben dem Rendern 60 fps bleiben (16,7 ms pro Bild)
export const STEP_BUDGET_MS = 8;
export const MAX_LOAD_MS = 5000;

export interface Storm {
  lat: number; lon: number; radius: number; sign: number; strength: number;
  color: [number, number, number];
  kick: number;   // 0 = Sturm aus der Vorlage, >0 = restliche Antriebszeit eines neu entstehenden Sturms
  life: number;   // gesamte Antriebszeit eines neuen Sturms
}


// Regler, die nur die Ansicht betreffen (nicht die Rechnung): gehören nicht in den Schlüssel des gemerkten Zustands.
export const VIEW_ONLY = new Set(['sunAngle', 'relief', 'limb', 'atmosphere', 'exposure', 'nebula', 'stars', 'spinSpeed', 'view', 'map',
  'paused', 'timeScale', 'pixelDensity', 'autoQuality', 'quality', 'reliefMulti', 'reliefCoarse', 'reliefFine', 'reliefSize', 'reliefAdapt',
  'depthOn', 'depthStrength', 'depthSource', 'pomOn', 'pomHeight', 'pomShadow', 'twilight', 'rimGlow', 'remember', 'focusStorm', 'seamless']);

/** Steckbrief oben links: bekannte Werte des Planeten (bei Zufallsplaneten plausibel geschätzt). */
// Zustand der Oberfläche: Steckbrief ausgeklappt (Mehr/Weniger)
export const ANSICHT = { factsOpen: false };
