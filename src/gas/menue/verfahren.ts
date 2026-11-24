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
    .range('arghMix', t('Argh: Verschiebung f (Textur → Verzerrung)', 'Argh: displacement f (texture → distortion)'), 0, 0.4, 0.002, t('Der Mix-Faktor f des Verfahrens: wie stark die Farbe der Karte die Form verschiebt (Video 0,054, Fotos sehen mit 0,2 gut aus). Größer = tiefere Täler, höhere Wolkenberge; zu groß = Klumpen.', 'The method’s mix factor f: how strongly the map colour displaces the shape (video 0.054, photos look good at 0.2). Larger = deeper valleys, taller cloud tops; too large = lumps.'), (v: number) => v.toFixed(3))
    .range('arghDensity', t('Argh: Dichte', 'Argh: density'), 5, 200, 1, t('Extinktion je Planetenradius. Klein = weiche, durchscheinende Haut; groß = harte Kante.', 'Extinction per planet radius. Small = soft, translucent skin; large = hard edge.'), (v: number) => v.toFixed(0))
    .range('arghAniso', t('Argh: Anisotropie g', 'Argh: anisotropy g'), -0.9, 0.9, 0.01, t('Henyey-Greenstein: > 0 streut nach vorn (Gegenlicht hell), 0 wie im Video.', 'Henyey-Greenstein: > 0 scatters forward (bright backlight), 0 as in the video.'), f2)
    .range('arghSoft', t('Argh: Streupunkte (weiche Haut)', 'Argh: scatter points (soft skin)'), 0, 16, 1,
      t('Wie viele Punkte entlang des Sehstrahls Streulicht liefern (Einfachstreuung wie im Blender-Nachbau). 0 = harte Haut mit einem Punkt, ab 4 weich und flauschig; mehr kostet Bildrate.',
        'How many points along the view ray scatter light (single scattering as in the Blender-style demo). 0 = hard skin with one point; from 4 soft and fluffy; more costs frame rate.'), (v: number) => v.toFixed(0))
    .range('arghShadow', t('Argh: Schattenschritte', 'Argh: shadow steps'), 4, 32, 1, t('Schritte des Schattenstrahls zur Sonne je Streupunkt.', 'Steps of the shadow ray toward the sun per scatter point.'), (v: number) => v.toFixed(0))
    .select('arghSource', t('Argh: Farbquelle', 'Argh: colour source'),
      [['dye', t('Farbstoff live (Argh in Flüssigkeit)', 'Live dye (Argh in liquid)')], ['karte', t('Karte über Wind (Flüssigkeit in Argh)', 'Map over wind (liquid in Argh)')]],
      t('Woher die Farbe C des Volumens kommt. Farbstoff live: die Simulation liefert Farbe und Form, sie wird beim Mitführen etwas weich. Karte über Wind: eine feste, scharfe Referenzkarte (Foto oder Anfangsfarbe) wird über eine vom Wind mitgeführte Abbildung abgetastet, die Karte bleibt scharf, der Wind verwirbelt sie (Neyret 2003, Advected Textures).',
        'Where the volume’s colour C comes from. Live dye: the simulation supplies colour and shape, softened a little by advection. Map over wind: a fixed sharp reference map (photo or initial colour) is sampled through a mapping carried by the wind; the map stays sharp, the wind swirls it (Neyret 2003, Advected Textures).'))
    .file('arghFoto', t('Argh: Karte laden (Foto)', 'Argh: load map (photo)'),
      t('Äquirektangular-Karte eines Planeten (2:1). Sie ersetzt die Anfangsfarbe als Referenzkarte; die Strömung verwirbelt sie. Nur mit „Karte über Wind“.',
        'Equirectangular planet map (2:1). It replaces the initial colour as the reference map; the flow swirls it. Only with “Map over wind”.'),
      (f) => k.app.ladeFoto(f).then(() => { k.app.needsDye = true; k.app.panel.refresh(); }))
    .select('arghRefQuelle', t('Argh: Referenz ohne Foto', 'Argh: reference without photo'),
      [['partikel', t('Partikel-Lauf (feines Wolkendetail)', 'Particle run (fine cloud detail)')], ['start', t('nur Anfangsfarbe', 'initial colour only')]],
      t('Woher die scharfe Referenzkarte kommt, wenn kein Foto geladen ist. Partikel-Lauf: derselbe Planet läuft einmal im Hintergrund mit der Darstellung „Partikel“ und gibt sein feines Wolkendetail als Karte ab. Nur Anfangsfarbe: glatte Bänder, wenig Struktur.',
        'Where the sharp reference map comes from when no photo is loaded. Particle run: the same planet runs once in the background with the “Particles” look and hands over its fine cloud detail as the map. Initial colour only: smooth bands, little structure.'))
    .range('arghRefRes', t('Argh: Kartenauflösung', 'Argh: map resolution'), 256, 2048, 256, t('Texel je Würfelfläche der Referenzkarte (1024 ≈ 4096 Pixel um den Äquator).', 'Texels per cube face of the reference map (1024 ≈ 4096 pixels around the equator).'), (v: number) => v.toFixed(0))
    .range('arghRelax', t('Argh: Rückstellung', 'Argh: relaxation'), 0, 0.5, 0.005, t('Wie schnell die Abbildung zur Ausgangskarte zurückkehrt (1/s). 0 = nie, die Karte wird mit der Zeit zu Strichen gezogen.', 'How fast the mapping returns to the original map (1/s). 0 = never; the map is eventually stretched to streaks.'), (v: number) => v.toFixed(3))
    .range('arghFlow', t('Argh: Wirbelstärke auf die Karte', 'Argh: swirl on the map'), 0, 4, 0.05, t('Verstärkt den Wirbelanteil des Winds, der die Karte verformt (1 = wie die Strömung).', 'Scales the eddy part of the wind that deforms the map (1 = as the flow).'), f2);
}
