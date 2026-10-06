// Zufall und Planet-Parameter aus dem Seed (seedString wie im Original). Reine Funktionen, kein Zustand.

// ------------------------------------------------------------------ Zufall (seedString wie im Original)
export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
export function rng(seed) {
  const s = xmur3(String(seed));
  let a = s(), b = s(), c = s(), d = s();
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let x = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; x = (x + d) | 0; c = (c + x) | 0;
    return (x >>> 0) / 4294967296;
  };
}
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// Planet-Parameter aus dem Seed. Wie im Original zufällig und (bis auf den Meeresspiegel) nicht als Regler sichtbar.
export function planetParams(seed) {
  const R = rng(seed + '|planet');
  const rr = (a, b) => a + (b - a) * R();
  const field = () => ({ res1: rr(0.35, 1.2), res2: rr(0.2, 1.0), resMix: rr(0.3, 1.1), mixScale: rr(0.5, 1.0), type: Math.floor(rr(0, 4)) });
  return {
    noiseSeed: rr(0, 400),
    h: field(),
    m: field(),
    water: rr(0.3, 0.72),        // Wasseranteil (Original: zufälliger waterLevel ohne Regler)
    cloudSeed: rr(0, 400),
    cloudCover: rr(0.16, 0.36),
    nebSeed: rr(0, 400),
    nebHue: R(), nebHue2: R(), nebSat: rr(0.45, 0.9), nebBright: rr(0.5, 1.2),
    moistM: rr(0.8, 1.2),
    mountains: rr(0.18, 0.34),
    beltFreq: rr(1.1, 1.9),
  };
}
