import { clamp } from '../logik/zufall.js';
import { spielerMaus, spielerRad, tastenAnschliessen } from './spieler.js';


// Kamera und Eingabe: Ziehen, Zoomen, Fingergesten, Zoom-Bremse der Drehung; Abstand zum Planeten.
// Bodennähe (S.boden): Zoom bis auf Augenhöhe über dem echten Gelände (Höhe unter der Kamera kommt aus dem Rechen-Shader csBoden,
// zeichnen.js → BODEN). Gezoomt wird der Abstand über dem Boden, nicht über der Kugel; Ziehen bewegt umso langsamer, je tiefer.
// Rechte Maustaste oder Umschalt + Ziehen: umsehen (Blickrichtung), Ziehen allein: über den Planeten gehen bzw. drehen.
// ext: { S, canvas }  (* = lebender Zustand, per Getter/Setter)
export const BODEN = { h: 0, gueltig: false, grasSichtbar: false, ballH: 0, ballWasser: false, ballGueltig: false };   // Bodenhöhe unter der Kamera (Radien über der Kugel); ball*: dasselbe unter dem Spielball (spieler.js)
export function augenHoehe(S) { return S.augeM / (S.radiusKm * 1000); }
export function createKamera(ext) {
  const { S, canvas } = ext;
  tastenAnschliessen(S, () => ext.nachUmschalten?.());   // Spielball: WASD, Leertaste, B (spieler.js)
  // ------------------------------------------------------------------ Kamera & Eingabe
  const cam = { yaw: 0.25, pitch: 0.12, dist: 3.4, tDist: 3.4, vYaw: 0, vPitch: 0, zoomed: false, blickYaw: 0, blickPitch: 0 };
  // Boden für den Zoom: Kugel (1) ohne Bodennähe, sonst echtes Gelände unter der Kamera
  const grund = () => (S.boden && BODEN.gueltig ? 1 + BODEN.h : 1);
  const minDist = () => (S.boden ? grund() + augenHoehe(S) : 1.03);
  // Abstand so, dass der Planet etwa 78 % der kleineren Bildhälfte füllt
  function fitDist(aspect) {
    const hv = S.fov * Math.PI / 360, hh = Math.atan(Math.tan(hv) * aspect);
    return 1 / Math.sin(0.78 * Math.min(hv, hh));
  }
  const zoomAuf = (faktor, von = cam.tDist) => { const g = grund(); cam.tDist = clamp(g + (von - g) * faktor, minDist(), 14); cam.zoomed = true; };
  const pointers = new Map();
  let pinch0 = 0, dist0 = 0;
  canvas.addEventListener('contextmenu', (e) => { if (S.boden) e.preventDefault(); });
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, umsehen: S.boden && (e.button === 2 || e.shiftKey) });
    canvas.classList.add('drag');
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.tDist; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1 && S.spieler && S.boden) {
      spielerMaus(dx, dy);   // Spielball: Kurs und Kamerahöhe um den Ball
    } else if (pointers.size === 1 && p.umsehen) {
      cam.blickYaw += dx * 0.004;
      cam.blickPitch = clamp(cam.blickPitch - dy * 0.004, -1.4, 1.0);
    } else if (pointers.size === 1) {
      const k = 0.0045 * Math.min(1, (cam.dist - grund()) / 1.5);
      // in Blickrichtung gehen: Ziehen um den Blickwinkel gedreht
      const c = Math.cos(cam.blickYaw), s = Math.sin(cam.blickYaw);
      const fx = dx * c + dy * s, fy = -dx * s + dy * c;
      cam.vYaw = -fx * k; cam.vPitch = fy * k;
      cam.yaw += cam.vYaw; cam.pitch = clamp(cam.pitch + cam.vPitch, -1.45, 1.45);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) zoomAuf(pinch0 / d, dist0);
    }
  });
  const endPtr = (e) => { pointers.delete(e.pointerId); if (!pointers.size) canvas.classList.remove('drag'); pinch0 = 0; };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (S.spieler && S.boden) spielerRad(e.deltaY); else zoomAuf(Math.exp(e.deltaY * 0.0012));
  }, { passive: false });
  return { cam, fitDist, pointers, grund, minDist };
}
