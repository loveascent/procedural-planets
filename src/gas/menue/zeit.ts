// Menü-Abschnitt „Zeit und Drehung“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittZeit(p: Panel, k: MenueKontext): Panel {
  const { fx } = k;
  return p
    .section(t('Zeit und Drehung', 'Time and spin'), undefined, true)
    .range('timeScale', t('Tempo', 'Tempo'), 0.05, 32, 0.05,
      t('Wie schnell die Zeit läuft. Ändert nur die Geschwindigkeit, nie die Form: Unter 1 werden die Schritte kleiner (flüssig, gleiche Physik), über 1 werden mehr Schritte gerechnet. Tipp: Jet-Stärke hoch (große, richtige Wirbel) und Tempo runter (planetar langsam).',
        'How fast time runs. Changes only speed, never shape: below 1 the steps get smaller (smooth, same physics), above 1 more steps are computed. Tip: raise jet strength (big, correct vortices) and lower tempo (slow like a planet).') + fx(t('Δt = 1/60 s · min(Tempo, 1),  Schritte/s = 60 · max(Tempo, 1)', 'Δt = 1/60 s · min(tempo, 1),  steps/s = 60 · max(tempo, 1)')), (v) => `${v.toFixed(2)}×`)
    .range('spinSpeed', t('Drehgeschwindigkeit', 'Spin speed'), 0, 10, 0.05,
      t('Sichtbare Eigendrehung, läuft in Simulationszeit (Zeitraffer beschleunigt sie mit). 1 = Tempo passend zur Tageslänge der Vorlage. Ändert nur die Ansicht, nicht die Physik.',
        'Visible spin, runs in simulation time (time lapse speeds it up too). 1 = matches the preset’s day length. Affects the view only, not the physics.'), (v) => `${v.toFixed(2)}×`)
    .toggle('retro', t('Rückläufige Drehung', 'Retrograde spin'),
      t('Dreht Planet und Physik andersherum (wie Venus). Dann drehen Zyklone auf der Nordhalbkugel im Uhrzeigersinn, alle Jets und Stürme spiegeln sich. Normal (aus): von Norden gesehen gegen den Uhrzeigersinn, Nord-Zyklone gegen den Uhrzeigersinn, Süd-Zyklone im Uhrzeigersinn. (Bei Toiletten ist Coriolis dagegen viel zu schwach: Ro ≈ 1000.)',
        'Spins planet and physics the other way (like Venus). Then northern cyclones turn clockwise, and all jets and storms are mirrored. Normal (off): counter-clockwise seen from the north, northern cyclones counter-clockwise, southern ones clockwise. (For toilets Coriolis is far too weak: Ro ≈ 1000.)') + fx(t('Ω → −Ω,  U(φ) → −U(φ),  Drehsinn → −Drehsinn', 'Ω → −Ω,  U(φ) → −U(φ),  spin → −spin')));
}
