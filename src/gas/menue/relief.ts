// Menü-Abschnitt „Relief“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittRelief(p: Panel, k: MenueKontext): Panel {
  const { f2, fx } = k;
  return p
    .section('Relief', t('Relief und die Relief-Module. Alle Module sind einzeln schaltbar, aus = wie v0.4.', 'Relief and the relief modules. Each module is a switch; off = as v0.4.'), true)
    .range('relief', 'Relief', 0, 5, 0.01,
      t('Neigt die Flächennormale nach der Helligkeit: helle Wolken wirken höher und werfen weiche Schatten. Das ist eine Beleuchtungs-Täuschung, keine echte Höhe (keine Parallaxe, keine Silhouette).',
        'Tilts the surface normal by brightness: bright clouds look higher and cast soft shading. This is a lighting trick, not real height (no parallax, no silhouette).') + fx(t('n′ = normalize(n − ∇Helligkeit · Relief · 3)', 'n′ = normalize(n − ∇brightness · relief · 3)')), f2)
    .toggle('reliefMulti', t('Mehrstufiges Relief', 'Multi-scale relief'),
      t('Modul, aus = wie bisher. Nimmt die Höhe aus der Helligkeit in drei Größen: große Wirbel und Bänder bekommen viel Tiefe, feine Krümel und Partikel wenig. Die Stärke insgesamt bleibt der Regler „Relief“.',
        'Module, off = as before. Takes height from brightness at three sizes: big vortices and bands get a lot of depth, fine crumbs and particles little. Overall strength stays the “Relief” control.') + fx('∇h = f·∇L(e₀) + g·½(∇L̄(4e₀) + ∇L̄(16e₀))'))
    .range('reliefCoarse', t('Grobe Stufen', 'Coarse levels'), 0, 5, 0.05, t('Tiefe der großen Strukturen (Wirbel, Bänder).', 'Depth of large structures (vortices, bands).'), f2)
    .range('reliefFine', t('Feine Stufe', 'Fine level'), 0, 1, 0.01, t('Anteil der feinsten Stufe. 1 = so stark wie das bisherige Relief, 0 = keine Krümel.', 'Share of the finest level. 1 = as strong as the old relief, 0 = no crumbs.'), f2)
    .range('reliefSize', t('Größe der groben Stufen', 'Coarse level size'), 0.25, 4, 0.05, t('Wie groß die groben Stufen greifen.', 'How wide the coarse levels reach.'), f2)
    .toggle('reliefAdapt', t('An Pixelgröße anpassen', 'Adapt to pixel size'),
      t('Die feinste Stufe ist nie kleiner als ein Bildschirmpixel. Nimmt das Krabbeln und Flimmern aus der Ferne.', 'The finest level is never smaller than a screen pixel. Removes crawling and flicker from afar.'))
    .toggle('depthOn', t('Tiefe aus der Physik', 'Depth from physics'),
      t('Modul, zusätzlich zum Relief. Hochdruck-Wirbel wie der Große Rote Fleck wölben sich, Tiefdruck-Wirbel sind Senken (Juno: der Fleck ist ein flacher Pfannkuchen, 300–500 km tief). Die Partikel gehen nicht ein, darum kein Krabbeln.',
        'Module, on top of the relief. High-pressure vortices like the Great Red Spot bulge, low-pressure ones are dips (Juno: the spot is a flat pancake, 300–500 km deep). Particles do not enter, so no crawling.') + fx('h = p  oder  h = −ζ / f,  f ∝ sin φ'))
    .select('depthSource', t('Quelle der Tiefe', 'Depth source'), [['pressure', t('Druck (nur Stable Fluids, sonst Wirbelstärke)', 'Pressure (Stable Fluids only, else vorticity)')], ['vorticity', t('Wirbelstärke aus dem Wind (beide Modelle)', 'Vorticity from the wind (both models)')]],
      t('Druck gibt es nur im Rechenmodell Stable Fluids. Bei Curl-Noise wird automatisch die Wirbelstärke genommen, die aus dem Wind beider Modelle berechnet wird.', 'Pressure exists only in the Stable Fluids model. With curl noise the vorticity is used automatically; it is computed from the wind of both models.'))
    .range('depthStrength', t('Tiefe', 'Depth'), 0, 10, 0.05, t('Wie stark die Wirbel sich wölben oder einsinken.', 'How strongly vortices bulge or sink.'), f2)
    .toggle('pomOn', t('Parallaxe mit Eigenschatten', 'Parallax with self-shadow'),
      t('Modul, zusätzlich. Verfolgt den Sichtstrahl in die Höhenkarte (Helligkeit plus Tiefe aus der Physik, falls an): hohe Stellen verdecken tiefe, Wirbelränder werfen Schatten in den Trichter. Kostet mehr Rechenleistung.',
        'Module, on top. Traces the view ray into the height map (brightness plus depth from physics, if on): high parts hide low ones, vortex rims cast shadows into the funnel. Costs more GPU.') + fx('Parallax Occlusion Mapping (Tatarchuk 2006)'))
    .range('pomHeight', t('Parallaxe-Höhe', 'Parallax height'), 0, 10, 0.05, t('Wie hoch die Höhenkarte für die Parallaxe ist.', 'How tall the height map is for parallax.'), f2)
    .range('pomShadow', t('Eigenschatten', 'Self-shadow'), 0, 2, 0.05, t('Wie dunkel die Schatten in den Senken werden.', 'How dark shadows in the dips get.'), f2);
}
