import { App } from './app';
import { S, type FilmOptions, type Filmstrip } from './zustand';
import { fail } from './dom';
import { t } from '../i18n';

// Für automatische Tests und die Konsole
declare global {
  interface Window {
    gasPlanet?: {
      settings: typeof S;
      capture: () => Promise<string>;
      readRow: (w: 'dye' | 'flow' | 'vel', face: number, y: number) => Promise<number[][]>;
      filmstrip: (o?: FilmOptions) => Promise<Filmstrip>;
      selftest: () => Promise<{ edge: number; interior: number; seamless: boolean }>;
      frame: () => number;
    };
  }
}

/** Startet den Gasriesen (von der gemeinsamen Seite aufgerufen). */
export const run = () => start().catch((e) => fail(`${t('<b>Start fehlgeschlagen:</b>', '<b>Start failed:</b>')} ${e instanceof Error ? e.message : String(e)}`));
async function start() {
  if (!('gpu' in navigator)) {
    fail(t('<b>WebGPU fehlt in diesem Browser.</b> Nimm Chrome oder Edge ab Version 113, Safari ab 26 oder Firefox ab 141. Auf Android geht Chrome ab Version 121.', '<b>This browser has no WebGPU.</b> Use Chrome or Edge 113+, Safari 26+ or Firefox 141+. On Android, Chrome 121+.'));
    return;
  }
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    fail(t('<b>Keine WebGPU-Grafikkarte gefunden.</b> Prüfe, ob die Hardwarebeschleunigung im Browser eingeschaltet ist.', '<b>No WebGPU graphics adapter found.</b> Check that hardware acceleration is enabled in the browser.'));
    return;
  }
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
    },
  });
  device.lost.then((info) => fail(`${t('<b>Die Grafikkarte wurde getrennt.</b>', '<b>The GPU was disconnected.</b>')} ${info.message} ${t('Lade die Seite neu.', 'Reload the page.')}`));
  device.addEventListener('uncapturederror', (e) => {
    console.error((e as GPUUncapturedErrorEvent).error.message);
    fail(`<b>GPU-Fehler:</b> ${(e as GPUUncapturedErrorEvent).error.message}`);
  });
  const app = new App(device);
  window.gasPlanet = {
    settings: S, capture: () => app.capture(), readRow: (w, f, y) => app.readRow(w, f, y),
    filmstrip: (o) => app.filmstrip(o), selftest: () => app.selftest(), frame: () => app.frameCount(),
  };
  document.getElementById('lang')?.addEventListener('click', () => app.toggleLang());
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' && (e.target as HTMLInputElement).type === 'text') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); app.undo(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); app.redo(); }
  });
  app.run();
}
