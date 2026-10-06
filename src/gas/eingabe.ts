// Eingabe: Ziehen, Zoomen, Fingergesten auf dem Planeten.
import type { App } from './app';
import { canvas } from './dom';

export function bindInput(app: App) {
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  const end = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = 0; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) app.zoom(pinch / d);
      pinch = d;
      return;
    }
    if (app.S.map) return;
    app.cam.yaw -= (e.clientX - prev.x) * 0.006;
    app.cam.pitch = Math.max(-1.45, Math.min(1.45, app.cam.pitch + (e.clientY - prev.y) * 0.006));
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); app.zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
}

export function zoom(app: App, f: number) {
app.cam.dist = Math.max(1.25, Math.min(8, app.cam.dist * f));
}
