import { rng } from '../logik/zufall.js';
import { spawnCyclone, windOmegaJS } from '../logik/wirbel.js';


// Wirbel (Tiefdruckgebiete, ein tropischer Wirbelsturm) für die Wolkenschicht: Zustand, Geburt, Bewegung.
// ext: { S, simTime* }  (* = lebender Zustand, per Getter/Setter)
export function createWirbel(ext) {
  const { S } = ext;
  // ------------------------------------------------------------------ Wirbel (Tiefdruckgebiete, ein tropischer Wirbelsturm)
  // Sie entstehen, drehen sich auf, ziehen mit dem Wind ihrer Breite und lösen sich wieder auf.
  const CLOUD_PERIOD = 70;
  const cyclones = [];
  function initCyclones(seed) {
    const R = rng(seed + '|cyclones');
    cyclones.length = 0;
    for (let i = 0; i < 6; i++) {
      const c = spawnCyclone(R, 0, i === 0);
      c.birth = ext.simTime - R() * c.life;
      cyclones.push(c);
    }
  }
  const cycA = new Float32Array(24), cycB = new Float32Array(24);
  function updateCyclones() {
    for (let i = 0; i < cyclones.length; i++) {
      let c = cyclones[i];
      let age = ext.simTime - c.birth;
      if (age > c.life || age < 0) { c = cyclones[i] = spawnCyclone(c.R, ext.simTime, c.tropical); age = 0; }
      const lon = c.lon + windOmegaJS(c.lat) * S.wind * 0.35 * age / CLOUD_PERIOD;
      const env = Math.sin(Math.PI * age / c.life);
      cycA.set([Math.cos(c.lat) * Math.sin(lon), Math.sin(c.lat), Math.cos(c.lat) * Math.cos(lon), c.s * env], i * 4);
      cycB.set([c.r, age / c.life, c.tropical ? 1 : 0, 0], i * 4);
    }
  }
  return { CLOUD_PERIOD, initCyclones, cycA, cycB, updateCyclones };
}
