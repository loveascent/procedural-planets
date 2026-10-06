// Einstieg der Welt in der gemeinsamen Seite (index.html?body=welt).
import { startWelt } from './welt.ts';
import { initShell } from '../shell.ts';
import { t } from '../i18n.ts';

export function run() {
  document.getElementById('t-title')!.textContent = t('Sonnensystem', 'Solar system');
  document.getElementById('panel-title')!.textContent = t('Regler', 'Controls');
  initShell('welt');
  startWelt().catch((e: Error) => {
    const f = document.getElementById('status') as HTMLElement;
    f.hidden = false;
    f.textContent = 'Die Welt konnte nicht starten: ' + e.message;
    console.error(e);
  });
}
