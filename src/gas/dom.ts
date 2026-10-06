// DOM-Elemente der Gasriesen-Seite und Fehleranzeige (gemeinsam für alle Gasriesen-Bausteine).
export const canvas = document.getElementById('view') as HTMLCanvasElement;
export const statusEl = document.getElementById('status') as HTMLElement;
export const fpsEl = document.getElementById('fps') as HTMLElement;
export const loadEl = document.getElementById('loading') as HTMLElement;
export const loadBar = document.getElementById('load-bar') as HTMLElement;
export const loadNote = document.getElementById('load-note') as HTMLElement;
export function showLoading(on: boolean) { loadEl.classList.toggle('done', !on); if (on) loadBar.style.width = '0%'; }

export function fail(msg: string) {
  statusEl.hidden = false;
  statusEl.innerHTML = msg;
}
