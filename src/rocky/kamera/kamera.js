import { clamp } from '../logik/zufall.js';


// Kamera und Eingabe: Ziehen, Zoomen, Fingergesten, Zoom-Bremse der Drehung; Abstand zum Planeten.
// ext: { S, canvas }  (* = lebender Zustand, per Getter/Setter)
export function createKamera(ext) {
  const { S, canvas } = ext;
  // ------------------------------------------------------------------ Kamera & Eingabe
  const cam = { yaw: 0.25, pitch: 0.12, dist: 3.4, tDist: 3.4, vYaw: 0, vPitch: 0, zoomed: false };
  // Abstand so, dass der Planet etwa 78 % der kleineren Bildhälfte füllt
  function fitDist(aspect) {
    const hv = S.fov * Math.PI / 360, hh = Math.atan(Math.tan(hv) * aspect);
    return 1 / Math.sin(0.78 * Math.min(hv, hh));
  }
  const pointers = new Map();
  let pinch0 = 0, dist0 = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.classList.add('drag');
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.tDist; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      const k = 0.0045 * Math.min(1, (cam.dist - 1) / 1.5);
      cam.vYaw = -dx * k; cam.vPitch = dy * k;
      cam.yaw += cam.vYaw; cam.pitch = clamp(cam.pitch + cam.vPitch, -1.45, 1.45);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) { cam.tDist = clamp(1 + (dist0 - 1) * pinch0 / d, 1.06, 14); cam.zoomed = true; }
    }
  });
  const endPtr = (e) => { pointers.delete(e.pointerId); if (!pointers.size) canvas.classList.remove('drag'); pinch0 = 0; };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.tDist = clamp(1 + (cam.tDist - 1) * Math.exp(e.deltaY * 0.0012), 1.06, 14);
    cam.zoomed = true;
  }, { passive: false });
  return { cam, fitDist, pointers };
}
