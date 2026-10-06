// Menü-Abschnitt „Wolkenfarbe“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittWolkenfarbe(p: Panel, k: MenueKontext): Panel {
  const { app, f2, f3, fx } = k;
  return p
    .section(t('Wolkenfarbe', 'Cloud colour'), t('Darstellung Flüssigkeit und Partikel. Die Farbe folgt dem Wind und kehrt langsam zur Bandfarbe zurück:', 'Looks liquid and particles. Colour follows the wind and slowly returns to the band colour:'), true)
    .custom(app.formulaNote(t('c(p) ← mix(c(p − u·Δt), c<sub>Band</sub>(φ + Mäander), 1 − e<sup>−k·Δt</sup>)', 'c(p) ← mix(c(p − u·Δt), c<sub>band</sub>(φ + meander), 1 − e<sup>−k·Δt</sup>)')))
    .range('bandRelax', t('Band-Rückstellung', 'Band restoring'), 0, 2, 0.005,
      t('k: wie schnell die Farbe zum Band ihrer Breite zurückkehrt. 0 = alles vermischt sich zu Brei, hoch = starre Streifen. Zeitkonstante 1/k: bei 0,06 etwa 17 s, so lange dauert es auch, bis eine Änderung eingeschwungen ist.',
        'k: how fast colour returns to its latitude’s band. 0 = everything mixes into mush, high = rigid stripes. Time constant 1/k: about 17 s at 0.06, which is also how long a change takes to settle.'), f3)
    .range('fineStripes', t('Feinstreifen', 'Fine stripes'), 0, 5, 0.05,
      t('Feine Farbstreifen innerhalb der Bänder. Erst sie machen sichtbar, wie die Strömung Farbe zu Filamenten zieht.',
        'Fine colour stripes inside the bands. They make it visible how the flow pulls colour into filaments.'), f2)
    .range('bandWobble', t('Band-Mäander', 'Band meander'), 0, 6, 0.05, t('Verbiegt die Bandgrenzen mit Rauschen.', 'Bends band edges with noise.') + fx(t('φ′ = φ + Rauschen(4p) · m · 0,04', 'φ′ = φ + noise(4p) · m · 0.04')), f2)
    .range('contrast', t('Band-Kontrast', 'Band contrast'), 0, 4, 0.05, t('Farbunterschied zwischen hellen Zonen und dunklen Gürteln.', 'Colour difference between bright zones and dark belts.') + fx(t('c = c̄ + (c − c̄) · Kontrast', 'c = c̄ + (c − c̄) · contrast')), f2)
    .range('convection', t('Konvektion', 'Convection'), 0, 10, 0.05, t('Helle Wolkentürme, die aus der Tiefe aufsteigen (Ammoniak-Eis).', 'Bright cloud towers rising from below (ammonia ice).'), f2);
}
