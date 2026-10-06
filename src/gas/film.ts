// Filmstreifen: Bilder in festen Abständen abgreifen und zu einem Streifen zusammensetzen.
import type { App } from './app';
import { t } from '../i18n';
import { FilmOptions, Filmstrip, S } from './zustand';
import { canvas } from './dom';

/** Das nächste gezeichnete Bild als Canvas (Testmodus: aus der Offscreen-Textur). */
export function grabFrame(app: App): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    app.grab = async () => {
      const c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d')!;
      if (app.offscreen) {
        const url = await app.capture();
        const img = new Image();
        img.src = url;
        await img.decode();
        g.drawImage(img, 0, 0);
      } else {
        // Direkt nach dem Zeichnen im selben Task ist der WebGPU-Canvas noch lesbar.
        g.drawImage(canvas, 0, 0);
      }
      resolve(c);
    };
  });
}

/**
 * Filmstreifen: mehrere Bilder im Abstand nebeneinander, dazu einfache Messwerte.
 * detail = mittlere |Laplace| der Helligkeit (Feinstruktur), change = mittlere Änderung zum
 * vorigen Bild (Bewegung). Damit lassen sich Bewegung und Schärfe vergleichen, ohne dass
 * jemand Einzelbilder beschreiben muss.
 */
export async function filmstrip(app: App, o: FilmOptions = {}): Promise<Filmstrip> {
  const frames = o.frames ?? 8, cols = o.cols ?? 4, scale = o.scale ?? 0.5;
  const shots: HTMLCanvasElement[] = [];
  const stats: { t: number; frame: number; fps: number; detail: number; change: number }[] = [];
  let prev: Uint8ClampedArray | null = null;
  let w = 0, h = 0;   // Zellgröße aus dem ersten Bild, auch wenn sich die Render-Auflösung ändert
  for (let k = 0; k < frames; k++) {
    if (k > 0) {
      if (o.everySteps) { const target = app.frame + o.everySteps; while (app.frame < target) await new Promise((r) => setTimeout(r, 30)); }
      else await new Promise((r) => setTimeout(r, (o.everySeconds ?? 2) * 1000));
    }
    const c = await app.grabFrame();
    if (!w) { w = Math.max(1, Math.round(c.width * scale)); h = Math.max(1, Math.round(c.height * scale)); }
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const g = small.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(c, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data;
    const L = (i: number) => 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
    let lap = 0, cnt = 0, diff = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const v = L(i);
      if (v < 8) continue;               // Weltraum nicht mitzählen
      lap += Math.abs(4 * v - L(i - 4) - L(i + 4) - L(i - w * 4) - L(i + w * 4));
      if (prev) diff += Math.abs(v - (0.3 * prev[i] + 0.59 * prev[i + 1] + 0.11 * prev[i + 2]));
      cnt++;
    }
    prev = new Uint8ClampedArray(px);
    stats.push({ t: +app.time.toFixed(2), frame: app.frame, fps: app.fpsNow, detail: +(lap / Math.max(cnt, 1)).toFixed(3), change: +(diff / Math.max(cnt, 1)).toFixed(3) });
    shots.push(small);
  }
  // Kontaktbogen mit Beschriftung
  const rows = Math.ceil(frames / cols), foot = 54;
  const sheet = document.createElement('canvas');
  sheet.width = w * cols; sheet.height = h * rows + foot;
  const g = sheet.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
  g.font = '13px monospace';
  shots.forEach((c, k) => {
    const x = (k % cols) * w, y = Math.floor(k / cols) * h;
    g.drawImage(c, x, y);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x, y, 230, 20);
    g.fillStyle = '#eee';
    g.fillText(`t=${stats[k].t}s  detail ${stats[k].detail}  Δ ${stats[k].change}`, x + 5, y + 14);
  });
  g.fillStyle = '#ccc';
  const line1 = `${app.preset.name} · ${S.flow}+${S.look} · ${S.quality} · ${S.velRes}²/${S.dyeRes}² · ${S.particles} ${t('Partikel', 'particles')} · ${app.fpsNow} fps · ${t('Zeitraffer', 'time lapse')} ${S.timeScale}×`;
  const line2 = `jet ${S.jetStrength} · Ω ${S.omega}${S.retro ? ' retro' : ''} · conf ${S.confinement} · turb ${S.turbulence} · bandRelax ${S.bandRelax} · spawn ${S.stormSpawn}/${S.kickLife}s · relief ${S.relief} · v0.3.0`;
  g.fillText(line1, 8, h * rows + 20);
  g.fillText(line2, 8, h * rows + 42);
  return { image: sheet.toDataURL('image/png'), stats };
}

export async function recordFilmstrip(app: App) {
  const msg = (x: string) => { const el = document.getElementById('diag-msg'); if (el) el.textContent = x; };
  const btn = document.getElementById('btn-film') as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
  msg(t('Nehme 8 Bilder in 14 s auf …', 'Recording 8 frames over 14 s …'));
  try {
    const f = await app.filmstrip({ frames: 8, everySeconds: 2 });
    const a = document.createElement('a');
    a.href = f.image;
    a.download = `procedural-planets-${app.preset.name.replace(/[^\w-]+/g, '-')}-${Date.now()}.png`;
    a.click();
    msg(t('Gespeichert. Das PNG enthält die wichtigsten Einstellungen in der Fußzeile.', 'Saved. The PNG lists the key settings in its footer.'));
  } catch (e) {
    msg(`${t('Aufnahme fehlgeschlagen:', 'Recording failed:')} ${e instanceof Error ? e.message : String(e)}`);
  }
  if (btn) btn.disabled = false;
}
