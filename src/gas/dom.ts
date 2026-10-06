// DOM-Elemente der Gasriesen-Seite und Fehleranzeige (gemeinsam für alle Gasriesen-Bausteine).
// Fehlen sie (Gasriese eingebettet in eine andere Seite, z. B. die Welt), gibt es unsichtbare Ersatzelemente statt null.
export const canvas = (document.getElementById('view') ?? document.createElement('canvas')) as HTMLCanvasElement;
export const statusEl = (document.getElementById('status') ?? document.createElement('div')) as HTMLElement;
export const fpsEl = (document.getElementById('fps') ?? document.createElement('div')) as HTMLElement;
export const loadEl = (document.getElementById('loading') ?? document.createElement('div')) as HTMLElement;
export const loadBar = (document.getElementById('load-bar') ?? document.createElement('div')) as HTMLElement;
export const loadNote = (document.getElementById('load-note') ?? document.createElement('div')) as HTMLElement;
export function showLoading(on: boolean) { loadEl.classList.toggle('done', !on); if (on) loadBar.style.width = '0%'; }

export function fail(msg: string) {
  statusEl.hidden = false;
  statusEl.innerHTML = msg;
}
