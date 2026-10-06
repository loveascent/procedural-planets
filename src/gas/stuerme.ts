// Stürme: aktive Stürme, Hauptsturm vor die Kamera, Entstehen und Antrieb neuer Stürme.
import type { App } from './app';
import { bandTable, TABLE, hexToLinear } from '../presets';
import { Storm, S, MAX_STORMS } from './zustand';

export function activeStorms(a: App): Storm[] {
  return a.storms.filter((s) => s.kick > 0 || S.storms).slice(0, MAX_STORMS);
}

/** Hauptsturm (größter nicht-polarer Vorlagen-Sturm) auf die Tagseite vor die Kamera drehen, etwas vor der
 *  Bildmitte in Drehrichtung, damit er über die Tagseite wandert. Neigung wird vernachlässigt. */
export function faceMainStorm(a: App) {
  if (!S.focusStorm) return;
  let main: Storm | null = null;
  a.storms.forEach((st, i) => { if (i < a.preset.storms.length && Math.abs(st.lat) < 70 && (!main || st.radius > main.radius)) main = st; });
  if (!main) return;
  const camAz = Math.PI / 2 - a.cam.yaw;
  a.spin = ((main as Storm).lon * Math.PI) / 180 - (camAz + 0.3 * a.dir());
}

/** Stürme bewegen, neue entstehen lassen, abgelaufene entfernen. */
export function updateStorms(a: App, dt: number) {
  for (const s of a.storms) {
    if (s.kick > 0) { s.kick = Math.max(0, s.kick - dt); continue; }
    // Festgehaltene Stürme treiben mit dem Jet ihrer Breite (Länge wächst nach Westen).
    const la = (s.lat * Math.PI) / 180;
    s.lon -= ((a.jetAt(la) * dt) / Math.max(Math.cos(la), 0.2)) * (180 / Math.PI);
  }
  // Vorlagen-Stürme stehen vorne in der Liste; abgelaufene neue Stürme fallen heraus.
  a.storms = a.storms.filter((s, i) => i < a.preset.storms.length || s.kick > 0);
  // Konvektion stößt neue Wirbel an. Der Drehsinn folgt der Scherung der Jets an dieser Breite
  // (Hintergrund-Wirbelstärke ζ ≈ −∂U/∂φ): nur ein Wirbel, der mit der Scherung dreht, überlebt
  // sie. Ob daraus ein Antizyklon (weißes Oval) oder Zyklon (dunkle Barke) wird, ergibt sich
  // also aus Windprofil, Halbkugel und Drehrichtung des Planeten, nicht aus einem Würfelwurf.
  if (a.flowMode() === 'fluid' && Math.random() < S.stormSpawn * dt && a.activeStorms().length < MAX_STORMS) {
    const lat = (Math.random() * 2 - 1) * 65;
    const la = (lat * Math.PI) / 180;
    const zeta = -(a.jetAt(la + 0.01) - a.jetAt(la - 0.01));
    const spin = zeta === 0 ? (Math.random() < 0.5 ? 1 : -1) : Math.sign(zeta);
    // Antizyklon: dreht entgegen der Planetenrotation (Nord: im Uhrzeigersinn).
    const anti = spin * (lat >= 0 ? 1 : -1) * a.dir() < 0;
    const band = bandTable(a.preset, S.contrast);
    const row = Math.round(((lat + 90) / 180) * (TABLE - 1)) * 4;
    const color: [number, number, number] = anti
      ? hexToLinear(a.preset.cloud)
      : [band[row] * 0.55, band[row + 1] * 0.5, band[row + 2] * 0.45];
    a.storms.push({
      lat, lon: Math.random() * 360, radius: 1.2 + Math.random() * 2.8,
      sign: spin, strength: 0.5 + Math.random() * 0.6,
      color, kick: S.kickLife, life: S.kickLife,
    });
  }
}
