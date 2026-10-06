// Wirbel-Bausteine ohne Zustand: Windwinkelgeschwindigkeit je Breite, Geburt eines Wirbels.

export function windOmegaJS(lat) {
  const a = Math.abs(lat);
  const u = -0.9 * Math.sin(6 * a) + 0.35 * Math.exp(-(((a - 0.75) / 0.18) ** 2));
  return u / Math.max(Math.cos(lat), 0.3);
}
export function spawnCyclone(R, birth, tropical) {
  const north = R() < 0.5;
  const lat = (north ? 1 : -1) * (tropical ? 0.2 + R() * 0.2 : 0.55 + R() * 0.5);
  return { R, tropical, lat, lon: R() * Math.PI * 2, birth, life: tropical ? 90 + R() * 60 : 55 + R() * 55,
    s: (north ? -1 : 1) * (tropical ? 5.5 + R() * 2 : 2.2 + R() * 2.2), r: tropical ? 0.045 + R() * 0.025 : 0.1 + R() * 0.09 };
}
