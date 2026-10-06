// Menü-Abschnitt „Zufallsplanet“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { newSeed } from '../../presets';
import { t } from '../../i18n';

export function abschnittZufall(p: Panel, k: MenueKontext): Panel {
  const { app, fx } = k;
  return p
    .section(t('Zufallsplanet', 'Random planet'), t('Würfelt einen neuen Planeten. Mit den Vorgaben lenkst du den Zufall; „egal“ lässt ihn frei. Gleicher Seed und gleiche Vorgaben ergeben immer denselben Planeten.',
      'Rolls a new planet. The options steer the dice; “any” leaves them free. Same seed and same options always give the same planet.'), app.S.preset === 'Zufall')
    .select('rndFamily', t('Familie', 'Family'), [['', t('egal', 'any')], ['jovian', t('jupiterartig', 'Jupiter-like')], ['saturnian', t('saturnartig', 'Saturn-like')], ['ice', t('Eisriese', 'ice giant')], ['hot', t('heißer Jupiter', 'hot Jupiter')], ['exotic', t('exotisch', 'exotic')]],
      t('Bestimmt Farbraum, Bandzahl, Stärke des Äquatorjets und Stimmung.', 'Sets colour range, band count, equatorial jet strength and mood.'))
    .range('rndBands', t('Bänder', 'Bands'), 0, 30, 1,
      t('Anzahl der Farbbänder und Jets. 0 = würfeln. Physikalisch hängt sie von Rotation, Größe und Windstärke ab (Rhines-Skala).',
        'Number of colour bands and jets. 0 = roll. Physically it depends on rotation, size and wind speed (Rhines scale).') + fx('L<sub>β</sub> = π·√(2U/β),  β = 2Ω·cos φ / R'), (v) => (v === 0 ? t('Zufall', 'roll') : String(v)))
    .select('rndStorms', t('Stürme', 'Storms'), [['auto', t('egal', 'any')], ['none', t('keine', 'none')], ['few', t('wenige', 'few')], ['many', t('viele', 'many')]],
      t('Wie viele Stürme die Vorlage mitbringt. Neue entstehen zusätzlich über „Neue Stürme“.', 'How many storms the preset brings. More can form via “New storms”.'))
    .select('rndRings', t('Ringe', 'Rings'), [['auto', t('egal', 'any')], ['yes', t('ja', 'yes')], ['no', t('nein', 'no')]], t('Ringe erzwingen oder verbieten.', 'Force or forbid rings.'))
    .buttons([
      ['btn-seed', t('🎲 Neuer Zufallsplanet', '🎲 New random planet'), () => { app.S.preset = 'Zufall'; app.S.seed = newSeed(); app.applyPreset(); app.panel.refresh(); app.remember(); }],
    ]);
}
