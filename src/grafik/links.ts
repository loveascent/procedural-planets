// Grafik-Optionen als Ausklapper oben links: Knopf „Grafik ▾“ im Stil von „mehr ▾“ neben dem Steckbrief,
// darunter ein Kasten im Stil des Steckbriefs (.facts). Die Abschnitte entstehen wie bisher im Panel
// (gleiche Regler, Sichtbarkeit, Speichern); danach werden alle „Grafik: …“-Abschnitte hierher umgehängt.
import type { Panel } from '../ui';
import { t } from '../i18n';

const istGrafik = (d: Element) => /^(Grafik|Graphics)\b/.test(d.querySelector(':scope > summary')?.textContent?.trim() ?? '');
let offen = false;

function knopf(): HTMLButtonElement {
  let k = document.getElementById('grafik-knopf') as HTMLButtonElement | null;
  if (!k) {
    k = document.createElement('button');
    k.type = 'button';
    k.id = 'grafik-knopf';
    k.className = 'facts-more';
    k.setAttribute('aria-controls', 'grafik-links');
    k.addEventListener('click', () => { offen = !offen; zeige(); });
  }
  return k;
}

function zeige() {
  const k = knopf(), leiste = document.getElementById('grafik-links');
  k.textContent = offen ? t('Grafik ▴', 'Graphics ▴') : t('Grafik ▾', 'Graphics ▾');
  k.setAttribute('aria-expanded', String(offen));
  if (leiste) leiste.hidden = !offen;
}

/** Knopf an seinen Platz: neben „mehr“ (Gasriese, nach jedem Neuzeichnen des Steckbriefs), sonst ans Ende der ersten Kopfzeile. */
export function grafikKnopfEinhaengen() {
  const hud = document.querySelector('.hud');
  if (!hud || !document.getElementById('grafik-links-body')?.childElementCount) return;
  // Seiten ohne Steckbrief (Gesteinsplanet, Mond, Sonnensystem): eigene kleine Zeile unter dem Kopf; die Statuszeilen
  // werden laufend per textContent neu geschrieben und würden den Knopf löschen
  let platz = hud.querySelector('.facts-name');
  if (!platz) {
    platz = hud.querySelector('.grafik-zeile');
    if (!platz) { platz = document.createElement('div'); platz.className = 'grafik-zeile'; hud.append(platz); }
  }
  if (platz && knopf().parentElement !== platz) platz.append(knopf());
  zeige();
}

/** Nach dem Aufbau eines Panels aufrufen (nur das Hauptmenü der Seite, nicht eingebettete Planeten). */
export function grafikNachLinks(p: Panel) {
  const leiste = document.getElementById('grafik-links');
  const ziel = document.getElementById('grafik-links-body');
  if (!leiste || !ziel) return;
  if (!leiste.dataset.an) {
    leiste.dataset.an = '1';
    // Oberkante folgt dem Kopf (Titel, Steckbrief, fps), der je nach Planet und „mehr“ wächst
    const kopf = document.querySelector<HTMLElement>('.hud');
    if (kopf) new ResizeObserver(() => {
      const oben = kopf.offsetTop + kopf.offsetHeight + 6;
      leiste.style.top = `${oben}px`;
      leiste.style.maxHeight = `calc(100% - ${oben}px - 64px - env(safe-area-inset-bottom, 0px))`;   // Platz für die Zeitleiste unten
    }).observe(kopf);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && offen) { offen = false; zeige(); } });
  }
  // nach dem alphabetischen Sortieren des Panels (das läuft ebenfalls als Microtask, aber früher eingereiht)
  queueMicrotask(() => {
    ziel.textContent = '';   // Menü wurde neu gebaut (z. B. Stilwechsel): alte Abschnitte weg
    for (const d of [...p.body.querySelectorAll(':scope > details')].filter(istGrafik)) {
      ziel.append(d);
      const s = d.querySelector(':scope > summary');   // „Grafik“ steht schon auf dem Knopf
      if (s?.firstChild?.nodeType === Node.TEXT_NODE) s.firstChild.textContent = s.firstChild.textContent!.replace(/^\s*(Grafik|Graphics):\s*/, '');
    }
    const erster = ziel.querySelector<HTMLDetailsElement>(':scope > details');
    if (erster && !ziel.querySelector(':scope > details[open]')) erster.open = true;
    grafikKnopfEinhaengen();
  });
}
