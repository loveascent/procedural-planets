// Menü-Abschnitt „Verfahren“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittVerfahren(p: Panel, k: MenueKontext): Panel {
  const { f2, fx } = k;
  return p
    .section(t('Verfahren', 'Method'), t('Rechenmodell und Darstellung sind frei kombinierbar.', 'Maths model and look can be combined freely.'), true)
    .select('flow', t('Rechenmodell', 'Maths model'), [['fluid', t('Stable Fluids – Strömungsphysik (mofu)', 'Stable Fluids – flow physics (mofu)')], ['curl', t('Curl-Noise – Rezept (jasper-r / Gaseous Giganticus)', 'Curl noise – recipe (jasper-r / Gaseous Giganticus)')]],
      t('Woher der Wind kommt. Stable Fluids löst die Strömungsgleichung mit Druck, Coriolis und Wirbeln. Curl-Noise ist ein verwirbeltes Rauschfeld plus Jets und Wirbel, schnell und ohne Physik.',
        'Where the wind comes from. Stable Fluids solves the flow equation with pressure, Coriolis and vortices. Curl noise is a swirling noise field plus jets and vortices, fast and without physics.'))
    .select('look', t('Darstellung', 'Look'), [['dye', t('Flüssigkeit (Farbstoff)', 'Liquid (dye)')], ['particles', t('Partikel', 'Particles')], ['pure', t('Partikel rein (wie jasper-r)', 'Pure particles (as jasper-r)')]],
      t('Wie die Wolken dem Wind folgen. Flüssigkeit: die Farbe wird mitgeführt und kehrt zur Bandfarbe zurück. Partikel: Millionen Punkte fliegen mit dem Wind und malen die Farbe, die ebenfalls zur Bandfarbe zurückkehrt. Partikel rein: wie jasper-r, die Textur verblasst zu einer Mittelfarbe, alle Struktur kommt von den Partikeln. Jede Darstellung geht mit jedem Rechenmodell.',
        'How clouds follow the wind. Liquid: colour is carried and returns to the band colour. Particles: millions of points ride the wind and paint colour, which also returns to the band colour. Pure particles: as in jasper-r, the texture fades to one mean colour and all structure comes from the particles. Every look works with every maths model.'))
    .toggle('arghOn', t('Argh-Volumen (Arghanion)', 'Argh volume (Arghanion)'),
      t('Modul. Das Volumen-Verfahren aus Arghanions Blender-Tutorial (eigenes Demo: gasriese-volumen-demo), aber mit dem LIVE simulierten Farbstoff statt eines Fotos: die Farbe verschiebt einen Kugel-Dichtekörper, helle Wolken liegen tiefer, dunkle höher. Echte Silhouette, Schatten zur Sonne, verwirbelt mit der Strömung. Ersetzt die glatte Oberfläche.',
        'Module. The volume method from Arghanion’s Blender tutorial (own demo: gasriese-volumen-demo), but driven by the LIVE simulated dye instead of a photo: colour displaces a spherical density body, bright clouds sit lower, dark ones higher. Real silhouette, shadows toward the sun, swirls with the flow. Replaces the smooth surface.')
      + fx('q = p ⊙ (1 − f + f·C),  Dichte = σ·[1 − |q| ≥ t],  L = C · f_HG · E · e^(−∫σ ds)'))
    .range('arghMix', t('Argh: Verschiebung f', 'Argh: displacement f'), 0, 0.2, 0.002, t('Mix-Faktor f aus dem Video (0,054). Größer = tiefere Täler und höhere Wolkenberge.', 'Mix factor f from the video (0.054). Larger = deeper valleys and taller cloud tops.'), (v: number) => v.toFixed(3))
    .range('arghDensity', t('Argh: Dichte', 'Argh: density'), 5, 200, 1, t('Extinktion je Planetenradius. Klein = weiche, durchscheinende Haut; groß = harte Kante.', 'Extinction per planet radius. Small = soft, translucent skin; large = hard edge.'), (v: number) => v.toFixed(0))
    .range('arghAniso', t('Argh: Anisotropie g', 'Argh: anisotropy g'), -0.9, 0.9, 0.01, t('Henyey-Greenstein: > 0 streut nach vorn (Gegenlicht hell), 0 wie im Video.', 'Henyey-Greenstein: > 0 scatters forward (bright backlight), 0 as in the video.'), f2);
}
