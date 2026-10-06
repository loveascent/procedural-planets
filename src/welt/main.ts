// Einstieg der Welt-Seite (welt.html).
import { startWelt } from './welt.ts';

document.getElementById('umschalter')?.addEventListener('click', () => document.getElementById('panel')?.classList.toggle('zu'));
startWelt().catch((e: Error) => {
  const f = document.getElementById('fehler') as HTMLElement;
  f.style.display = 'flex';
  f.textContent = 'Die Welt konnte nicht starten: ' + e.message;
  console.error(e);
});
