// Menü-Abschnitt „Planet“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { fail } from '../dom';
import { presets, bandsFromImage } from '../../presets';
import { t } from '../../i18n';

export function abschnittPlanet(p: Panel, k: MenueKontext): Panel {
  const { app, presetName } = k;
  return p
    .section('Planet')
    .select('preset', t('Vorlage', 'Preset'), [...presets.map((p) => [p.name, presetName(p.name)] as [string, string]), ['Zufall', t('Zufallsplanet', 'Random planet')]],
      t('Lädt Windprofil, Farbbänder, Stürme, Abplattung und Ringe eines Planeten. Alles sind Zahlen, keine Bilder.',
        'Loads a planet’s wind profile, colour bands, storms, oblateness and rings. All numbers, no images.'))
    .file('image', t('Farben aus Bild', 'Colours from image'),
      t('Lade ein Planetenfoto oder eine flache Karte. Für jeden Breitengrad wird die mittlere Farbe gemessen und als Bandfarbe übernommen. Das Bild wird nicht als Textur benutzt, die Wolken entstehen weiter aus der Simulation.',
        'Load a planet photo or a flat map. The average colour of each latitude becomes that band’s colour. The image is not used as a texture; the clouds still come from the simulation.'),
      (f) => bandsFromImage(f).then((bands) => {
        app.preset = { ...app.preset, name: `${app.preset.name} (${t('Farben aus Bild', 'colours from image')})`, bands };
        app.writeTables();
        app.needsDye = true;
        app.remember();
        app.updateInfo();
      }).catch(() => fail(t('<b>Das Bild ließ sich nicht lesen.</b> Nimm ein JPG, PNG oder WebP.', '<b>Could not read the image.</b> Use a JPG, PNG or WebP.'))))
    .buttons([
      ['btn-defaults', t('Regler zurücksetzen', 'Reset controls'), () => app.resetSettings()],
    ], {
      'btn-defaults': t('Alle Regler auf die Standardwerte, Planet und Gerät bleiben.', 'All controls back to defaults; planet and device stay.'),
    });
}
