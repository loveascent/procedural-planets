// Kamera: Ziehen dreht, Rad oder zwei Finger zoomen. Der Abstand ist logarithmisch zur Oberfläche, damit Nahaufnahmen feinfühlig bleiben.
export interface Kamera { yaw: number; pitch: number; dist: number; tDist: number; vYaw: number; vPitch: number; bewegt: number }

export function erstelleKamera(canvas: HTMLCanvasElement, minAbstand: () => number) {
  const cam: Kamera = { yaw: 0.0, pitch: 0.14, dist: 3.6, tDist: 3.6, vYaw: 0, vPitch: 0, bewegt: 0 };
  const ptr = new Map<number, { x: number; y: number }>();
  let pinch0 = 0, dist0 = 0;
  const klemme = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.tDist - 1; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptr.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptr.size === 1) {
      const k = 0.0048 * klemme((cam.dist - 1) / 2.2, 0.03, 1);
      cam.vYaw = -dx * k; cam.vPitch = dy * k;
      cam.yaw += cam.vYaw; cam.pitch = klemme(cam.pitch + cam.vPitch, -1.5, 1.5);
      cam.bewegt = performance.now();
    } else if (ptr.size === 2) {
      const [a, b] = [...ptr.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) { cam.tDist = Math.max(minAbstand(), 1 + dist0 * pinch0 / d); cam.bewegt = performance.now(); }
    }
  });
  const ende = (e: PointerEvent) => { ptr.delete(e.pointerId); pinch0 = 0; };
  canvas.addEventListener('pointerup', ende);
  canvas.addEventListener('pointercancel', ende);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.tDist = klemme(1 + (cam.tDist - 1) * Math.exp(e.deltaY * 0.0013), minAbstand(), 30);
    cam.bewegt = performance.now();
  }, { passive: false });
  /** Pro Bild: Trägheit und weiches Nachziehen des Abstands. */
  const schritt = (dt: number) => {
    if (ptr.size === 0) {
      cam.yaw += cam.vYaw; cam.pitch = klemme(cam.pitch + cam.vPitch, -1.5, 1.5);
      const f = Math.exp(-dt * 4);
      cam.vYaw *= f; cam.vPitch *= f;
      if (Math.abs(cam.vYaw) + Math.abs(cam.vPitch) > 1e-4) cam.bewegt = performance.now();
    }
    const alt = cam.dist;
    cam.dist = 1 + (cam.dist - 1) * Math.pow((cam.tDist - 1) / Math.max(cam.dist - 1, 1e-6), 1 - Math.exp(-dt * 10));
    if (Math.abs(cam.dist - alt) > 1e-5) cam.bewegt = performance.now();
  };
  return { cam, schritt };
}
