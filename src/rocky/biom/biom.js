import { rng, clamp } from '../logik/zufall.js';
import { hsl } from '../logik/wuerfel.js';


// Biom-Bild (Original-Algorithmus von colordodge, 2D-Canvas): x = Feuchte, y = Höhe.
// ext: { lutCanvas, RS, device* }  (* = lebender Zustand, per Getter/Setter)
export function createBiom(ext) {
  const { lutCanvas, RS } = ext;
  function drawBiome(seed, wl) {
    const R = rng(seed + '|biome');
    const rr = (a, b) => a + (b - a) * R();
    const ctx = lutCanvas.getContext('2d');
    const W = 512, H = 512;
    const base = { h: R() * 360, s: rr(0.08, 0.45), l: rr(0.3, 0.58) };
    const colorAngle = rr(0.2, 0.4), satRange = rr(0.15, 0.35), lightRange = rr(0.3, 0.5), circleSize = rr(30, 250);
    const rc = () => hsl(base.h + rr(-1, 1) * colorAngle * 180, clamp(base.s + rr(-satRange, satRange), 0, 1), clamp(base.l + rr(-lightRange, lightRange), 0.05, 0.92));
    const css = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = css(hsl(base.h, base.s, base.l), 1);
    ctx.fillRect(0, 0, W, H);
    const strip = (x, y, w, h) => {
      const g = ctx.createLinearGradient(rr(0, W), rr(0, H), rr(0, W), rr(0, H));
      const c = rc();
      g.addColorStop(rr(0, 0.5), css(c, 0));
      g.addColorStop(0.5, css(c, 0.8));
      g.addColorStop(rr(0.5, 1), css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    };
    for (let i = 0; i < 5; i++) strip(0, 0, W, H);                       // drawBase
    for (let i = 0; i < 100; i++) {                                       // randomGradientCircle ×100
      const x = rr(0, W), y = rr(0, H) - H * wl, size = rr(10, circleSize);
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      const c = rc();
      g.addColorStop(0, css(c, 0.5));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    const landDetail = Math.round(rr(0, 5));                              // drawDetail
    for (let i = 0; i < 5; i++) {
      const x1 = rr(0, W), y1 = rr(0, H), x2 = rr(0, W), y2 = rr(0, H);
      if (i < landDetail) strip(x1, y1, x2 - x1, y2 - y1); else { rc(); R(); R(); R(); R(); R(); R(); }
    }
    const band = (y1, h, c, a0, a1) => {                                  // drawInland / drawBeach
      const g = ctx.createLinearGradient(0, y1, 0, y1 + h);
      g.addColorStop(0, css(c, a0));
      g.addColorStop(1, css(c, a1));
      ctx.fillStyle = g;
      ctx.fillRect(0, y1, W, h);
    };
    const yw = H - H * wl;
    band(yw - 100, 100, rc(), 0, 0.5);
    band(yw - 7, 7, rc(), 0, 0.3);
    const wc = rc();                                                      // drawWater
    const g = ctx.createLinearGradient(0, yw, 0, H);
    const sc = (k) => [Math.min(255, Math.round(wc[0] * k)), Math.min(255, Math.round(wc[1] * k)), Math.min(255, Math.round(wc[2] * k))];
    g.addColorStop(0, css(sc(1.3), 0.9));
    g.addColorStop(0.2, css(sc(1.0), 0.9));
    g.addColorStop(0.8, css(sc(0.7), 0.9));
    ctx.fillStyle = g;
    ctx.fillRect(0, yw, W, H - yw);
    // unten im Bild = Wasser = v 0, wie beim Hochladen mit UNPACK_FLIP_Y in WebGL
    ext.device.queue.copyExternalImageToTexture({ source: lutCanvas, flipY: true }, { texture: RS.biome }, [512, 512]);
  }
  return { drawBiome };
}
