// steckbrief
import type { App } from '../app';
import { ANSICHT } from '../zustand';
import { lang, t } from '../../i18n';

export function updateInfo(app: App) {
  const info = document.getElementById('planet-info');
  if (!info) return;
  const p = app.preset;
  const f = p.facts;
  const nf = (v: number, d = 0) => v.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: d });
  const rows: [string, string][] = [];
  if (f) {
    const earthD = f.diameterKm / 12742;
    rows.push([t('Durchmesser', 'Diameter'), `${nf(f.diameterKm)} km (${nf(earthD, 1)}× ${t('Erde', 'Earth')})`]);
    rows.push([t('Abstand zum Stern', 'Distance to star'), `${nf(f.distanceAU, f.distanceAU < 1 ? 3 : 2)} AE`.replace('AE', t('AE', 'AU'))]);
    rows.push([t('Jahr', 'Year'), f.yearDays < 400 ? `${nf(f.yearDays, 1)} ${t('Tage', 'days')}` : `${nf(f.yearDays / 365.25, 1)} ${t('Erdjahre', 'Earth years')}`]);
    rows.push([t('Tag', 'Day'), f.locked ? t(`gebunden (= Jahr)`, 'tidally locked (= year)') : `${nf(p.rotationHours, 1)} h`]);
    rows.push([t('Temperatur', 'Temperature'), `${nf(f.tempC)} °C ${t('(Wolkenobergrenze)', '(cloud tops)')}`]);
    rows.push([t('Schwerkraft', 'Gravity'), `${nf(f.gravity, 1)} m/s² (${nf(f.gravity / 9.81, 2)} g)`]);
    rows.push([t('Stärkste Winde', 'Fastest winds'), `${nf(f.windMs)} m/s (${nf(f.windMs * 3.6)} km/h)`]);
    rows.push([t('Wolken aus', 'Clouds of'), t(f.clouds[0], f.clouds[1])]);
    rows.push([t('Monde', 'Moons'), nf(f.moons)]);
  } else {
    rows.push([t('Tag', 'Day'), `${nf(p.rotationHours, 1)} h`]);
  }
  rows.push([t('Achsneigung', 'Axial tilt'), `${nf(p.tilt, 1)}°`]);
  rows.push([t('Abplattung', 'Oblateness'), nf(p.oblateness, 3)]);
  rows.push([t('Stürme', 'Storms'), String(p.storms.length)]);
  const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
  // Kurzfassung (Durchmesser, Tag) immer sichtbar, alles weitere erst aufgeklappt, damit der Planet frei bleibt
  const short = rows.filter(([k]) => k === t('Durchmesser', 'Diameter') || k === t('Tag', 'Day'));
  const shown = ANSICHT.factsOpen ? rows : short;
  info.innerHTML = `<div class="facts-name">${esc(p.name)}${f?.note && ANSICHT.factsOpen ? ` <span>· ${esc(t(f.note[0], f.note[1]))}</span>` : ''}`
    + ` <button type="button" class="facts-more" aria-expanded="${ANSICHT.factsOpen}">${ANSICHT.factsOpen ? t('weniger ▴', 'less ▴') : t('mehr ▾', 'more ▾')}</button></div>`
    + `<dl class="facts${ANSICHT.factsOpen ? '' : ' short'}">${shown.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  info.querySelector('.facts-more')?.addEventListener('click', () => { ANSICHT.factsOpen = !ANSICHT.factsOpen; app.updateInfo(); });
}
