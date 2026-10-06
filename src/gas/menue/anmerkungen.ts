// anmerkungen
import type { App } from '../app';

export function formulaNote(_app: App, f: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'note formula';
  p.innerHTML = `<code class="fx">${f}</code>`;
  return p;
}

export function diagNote(_app: App): HTMLElement {
  const p = document.createElement('p');
  p.className = 'note';
  p.id = 'diag-msg';
  p.setAttribute('aria-live', 'polite');
  return p;
}
