// Hinweise: kurze Blase beim Drüberfahren und Erklärfenster in der Ecke (ⓘ).
import type { Panel } from '../ui';
import { t } from '../i18n';

export function labelOf(_app: Panel, row: Element): string {
  return (row.querySelector('label')?.textContent ?? '').trim().toLocaleLowerCase();
}

/** Kurzfassung: erster Satz, ohne Formel. */
export function short(_app: Panel, hint: string): string {
  const plain = hint.replace(/<code[\s\S]*?<\/code>/g, '').replace(/<[^>]+>/g, '');
  const m = plain.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : plain).trim();
}

export function showTip(app: Panel, anchor: HTMLElement, text: string) {
  const r = anchor.getBoundingClientRect();
  app.tip.textContent = text;
  app.tip.hidden = false;
  const w = app.tip.offsetWidth;
  // links neben dem Panel, auf Höhe des Reglers; auf schmalen Bildschirmen darüber
  let x = r.left - w - 10, y = r.top;
  if (x < 8) { x = Math.max(8, r.left); y = r.top - app.tip.offsetHeight - 6; }
  app.tip.style.left = `${x}px`;
  app.tip.style.top = `${Math.max(8, y)}px`;
}

export function hideTip(app: Panel) {
app.tip.hidden = true;
}

export function openDetail(app: Panel, title: string, html: string) {
  app.detail.innerHTML = `<button type="button" class="detail-close" aria-label="${t('Schließen', 'Close')}">✕</button><h3>${title}</h3><div>${html}</div>`;
  app.detail.hidden = false;
  (app.detail.querySelector('.detail-close') as HTMLButtonElement).addEventListener('click', () => { app.detail.hidden = true; });
}
