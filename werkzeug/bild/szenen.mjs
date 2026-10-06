// Feste Prüfszenen für den Gesteinsplaneten. Jede Szene: Regler-Werte (S), Kamera/Zeit/Drehung für planets.shot().
// Zeit und Drehung sind fest, damit zwei Läufe pixelgleich sein können (Wolken, Wellen hängen an der Zeit).
// Die Werte werden nach jeder Szene zurückgesetzt. Neue Bausteine bekommen hier ihre eigenen Szenen (an / aus / Nahaufnahme).
const T = { time: 4, spin: 0.6, yaw: 0.25, pitch: 0.12, dist: 3.4 };   // dist immer setzen: planets.shot() merkt sich eine einmal gesetzte Nähe

export const SEED_A = '12345678';
export const SEED_B = '4242';

export const szenen = [
  { name: '01-uebersicht', seed: SEED_A, set: {}, shot: { ...T } },
  { name: '02-stil-original', seed: SEED_A, set: { style: 'orig' }, shot: { ...T } },
  { name: '03-profil-minimal', seed: SEED_A, set: { profile: 'minimal' }, shot: { ...T } },
  { name: '04-fluesse-linien-v23', seed: SEED_A, set: { rivers: 1 }, shot: { ...T, dist: 1.5 } },
  { name: '05-fluesse-wasser', seed: SEED_A, set: { rivers: 3 }, shot: { ...T, dist: 1.5 } },
  { name: '06-fluesse-aus', seed: SEED_A, set: { rivers: 0 }, shot: { ...T, dist: 1.5 } },
  { name: '07-fluesse-eingegraben', seed: SEED_A, set: { rivers: 2 }, shot: { ...T, dist: 1.5 } },
  { name: '08-vulkane-an', seed: SEED_A, set: { volcanoOn: true, volcanoes: 1 }, shot: { ...T, dist: 1.4 } },
  { name: '09-vulkane-aus', seed: SEED_A, set: { volcanoOn: false }, shot: { ...T, dist: 1.4 } },
  { name: '10-supervulkane', seed: SEED_A, set: { volcanoOn: true, volcanoType: 1, volcanoes: 1 }, shot: { ...T, dist: 1.4 } },
  { name: '11-wellen-stark', seed: SEED_A, set: { waves: 2.5, modWaves: true }, shot: { ...T, dist: 1.3, yaw: -0.9 } },
  { name: '12-wellen-aus', seed: SEED_A, set: { modWaves: false }, shot: { ...T, dist: 1.3, yaw: -0.9 } },
  { name: '13-wolken-aus', seed: SEED_A, set: { modClouds: false }, shot: { ...T } },
  { name: '14-atmosphaere-aus', seed: SEED_A, set: { modAtmo: false }, shot: { ...T } },
  { name: '15-erosion-stark', seed: SEED_A, set: { erosion: 2.5, detail: 2 }, shot: { ...T, dist: 1.4 } },
  { name: '16-rand-saum', seed: SEED_A, set: { modRim: true }, shot: { ...T } },
  { name: '17-bloom-flare-aus', seed: SEED_A, set: { modBloom: false, modFlare: false }, shot: { ...T } },
  { name: '18-schatten-aus', seed: SEED_A, set: { modShadows: false }, shot: { ...T, dist: 1.4 } },
  { name: '19-seed-b', seed: SEED_B, set: {}, shot: { ...T } },
  { name: '20-seed-b-nah', seed: SEED_B, set: {}, shot: { ...T, dist: 1.5, yaw: 1.2 } },
  // --- Zusatzszenen (Sonne im Bild, Nahaufnahmen, einzelne Bausteine aus)
  { name: '21-flare-sonne-am-rand', seed: SEED_A, set: { flare: 2, bloom: 1.2 }, shot: { ...T, yaw: 1.6 } },
  { name: '22-flare-geisterbilder', seed: SEED_A, set: { flare: 2, bloom: 1.2 }, shot: { ...T, yaw: 2.4 } },
  { name: '23-erosion-aus', seed: SEED_A, set: { erosion: 0 }, shot: { ...T, dist: 1.4 } },
  { name: '24-wolken-nah', seed: SEED_A, set: { cover: 0.8 }, shot: { ...T, dist: 1.25, yaw: -0.8 } },
  { name: '25-glitzer-tief', seed: SEED_A, set: { sunEl: 8, sunAz: -20, waves: 1.5 }, shot: { ...T, dist: 1.3, yaw: -0.3 } },
  { name: '26-saum-stark', seed: SEED_A, set: { modRim: true, rimStr: 1.2 }, shot: { ...T, dist: 2.5 } },
  { name: '27-nah-vulkan-flusstal', seed: SEED_B, set: { volcanoes: 1, rivers: 2 }, shot: { ...T, dist: 1.15, yaw: -0.3 } },
  { name: '28-schatten-terminator', seed: SEED_B, set: { sunEl: 3, sunAz: 40, shadows: 1 }, shot: { ...T, dist: 1.35, yaw: 1.0 } },
  // --- Bausteine Terrassen, Feindetail, Brandung, Meereis, Original (nur Regler, die es auch im Originalcode gibt)
  { name: '29-meereis-pol', seed: SEED_A, set: { cover: 0 }, shot: { ...T, dist: 1.7, pitch: 1.25 } },
  { name: '30-brandung-kueste', seed: SEED_A, set: { foam: 1.6 }, shot: { ...T, dist: 1.1, yaw: -0.2 } },
  { name: '31-terrassen-an', seed: SEED_A, set: { terrace: 0.7 }, shot: { ...T, dist: 1.3 } },
  { name: '32-feindetail-aus', seed: SEED_A, set: { detail: 0 }, shot: { ...T, dist: 1.2 } },
  { name: '33-original-nah', seed: SEED_A, set: { style: 'orig' }, shot: { ...T, dist: 1.4, yaw: -0.4 } },
  // --- Bausteine Biom, Netz, Relief, Himmel
  { name: '34-palette-original-biom', seed: SEED_A, set: { palette: 'cd' }, shot: { ...T } },
  { name: '35-netz-geomorphing', seed: SEED_A, set: { mesh: 1 }, shot: { ...T, dist: 1.25, yaw: -0.3 } },
  { name: '36-relief-null-horizont', seed: SEED_A, set: { relief: 0 }, shot: { ...T, dist: 1.08, pitch: 0.5, yaw: -0.2 } },
  { name: '37-himmel-aus', seed: SEED_A, set: { nebula: 0, stars: 0 }, shot: { ...T } },
  { name: '38-relief-stark-horizont', seed: SEED_A, set: { relief: 0.07 }, shot: { ...T, dist: 1.08, pitch: 0.5, yaw: -0.2 } },
  // --- Debug-Ansichten (Menü „Anzeige“)
  { name: '39-ansicht-hoehe', seed: SEED_A, set: { view: 1 }, shot: { ...T } },
  { name: '40-ansicht-feuchte', seed: SEED_A, set: { view: 2 }, shot: { ...T } },
  { name: '41-ansicht-normalen', seed: SEED_A, set: { view: 3 }, shot: { ...T } },
  { name: '42-ansicht-rauigkeit', seed: SEED_A, set: { view: 4 }, shot: { ...T } },
  { name: '43-ansicht-albedo', seed: SEED_A, set: { view: 5 }, shot: { ...T } },
  { name: '44-ansicht-flusskarte', seed: SEED_A, set: { view: 6, rivers: 2 }, shot: { ...T, dist: 1.5 } },
];
