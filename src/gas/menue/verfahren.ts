// Menü-Abschnitt „Verfahren“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittVerfahren(p: Panel, _k: MenueKontext): Panel {
  return p
    .section(t('Verfahren', 'Method'), t('Rechenmodell und Darstellung sind frei kombinierbar.', 'Maths model and look can be combined freely.'), true)
    .select('flow', t('Rechenmodell', 'Maths model'), [['fluid', t('Stable Fluids – Strömungsphysik (mofu)', 'Stable Fluids – flow physics (mofu)')], ['curl', t('Curl-Noise – Rezept (jasper-r / Gaseous Giganticus)', 'Curl noise – recipe (jasper-r / Gaseous Giganticus)')]],
      t('Woher der Wind kommt. Stable Fluids löst die Strömungsgleichung mit Druck, Coriolis und Wirbeln. Curl-Noise ist ein verwirbeltes Rauschfeld plus Jets und Wirbel, schnell und ohne Physik.',
        'Where the wind comes from. Stable Fluids solves the flow equation with pressure, Coriolis and vortices. Curl noise is a swirling noise field plus jets and vortices, fast and without physics.'))
    .select('look', t('Darstellung', 'Look'), [['dye', t('Flüssigkeit (Farbstoff)', 'Liquid (dye)')], ['particles', t('Partikel', 'Particles')], ['pure', t('Partikel rein (wie jasper-r)', 'Pure particles (as jasper-r)')]],
      t('Wie die Wolken dem Wind folgen. Flüssigkeit: die Farbe wird mitgeführt und kehrt zur Bandfarbe zurück. Partikel: Millionen Punkte fliegen mit dem Wind und malen die Farbe, die ebenfalls zur Bandfarbe zurückkehrt. Partikel rein: wie jasper-r, die Textur verblasst zu einer Mittelfarbe, alle Struktur kommt von den Partikeln. Jede Darstellung geht mit jedem Rechenmodell.',
        'How clouds follow the wind. Liquid: colour is carried and returns to the band colour. Particles: millions of points ride the wind and paint colour, which also returns to the band colour. Pure particles: as in jasper-r, the texture fades to one mean colour and all structure comes from the particles. Every look works with every maths model.'));
}
