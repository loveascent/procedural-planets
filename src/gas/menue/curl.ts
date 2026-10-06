// Menü-Abschnitt „Curl noise“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittCurl(p: Panel, k: MenueKontext): Panel {
  const { app, f2, f3, fx } = k;
  return p
    .section(t('Curl noise', 'Curl noise'), t('Rechenmodell Curl-Noise: Wind = Jets + Curl-Noise + Wirbel.', 'Maths model curl noise: wind = jets + curl noise + vortices.'), true)
    .custom(app.formulaNote(t('v = ê<sub>Ost</sub>·U(φ) + p × ∇ψ + Σ Wirbel,   ψ = Σ<sub>k</sub> ½<sup>k</sup> · Rauschen(2<sup>k</sup> f · p, t)', 'v = ê<sub>E</sub>·U(φ) + p × ∇ψ + Σ vortices,   ψ = Σ<sub>k</sub> ½<sup>k</sup> · noise(2<sup>k</sup> f · p, t)')))
    .range('curlStrength', t('Stärke', 'Strength'), 0, 10, 0.01, t('Wie stark das Rauschfeld gegenüber den Jets ist.', 'Strength of the noise field relative to the jets.'), f2)
    .range('curlFreq', t('Frequenz', 'Frequency'), 0.2, 32, 0.1, t('Grundfrequenz f des Rauschens: hoch = viele kleine Wirbel.', 'Base frequency f of the noise: high = many small swirls.'), (v) => v.toFixed(1))
    .range('curlSpeed', t('Veränderung', 'Evolution'), 0, 0.5, 0.005, t('Wie schnell sich das Rauschfeld mit der Zeit umbaut.', 'How fast the noise field changes over time.'), f3)
    .range('curlOctaves', t('Oktaven', 'Octaves'), 1, 6, 1, t('Anzahl überlagerter Rausch-Ebenen k. Mehr = feinere Details.', 'Number of stacked noise layers k. More = finer detail.'))
    .range('vortexCount', t('Wirbel', 'Vortices'), 0, 256, 1,
      t('Eingestreute Wirbel (Gaseous Giganticus). Nur wo die Jets schwach sind, und nur mit dem Drehsinn der lokalen Scherung, sonst würden sie zerrissen.',
        'Seeded vortices (Gaseous Giganticus). Only where jets are weak, and only with the spin of the local shear, otherwise they would be torn apart.') + fx(t('ω(d) = ω₀·sin(π·d/r),  Drehsinn = sign(−∂U/∂φ)', 'ω(d) = ω₀·sin(π·d/r),  spin = sign(−∂U/∂φ)')))
    .range('vortexStrength', t('Wirbel-Stärke', 'Vortex strength'), 0, 10, 0.05, t('Drehgeschwindigkeit ω₀ der eingestreuten Wirbel relativ zur Jet-Stärke.', 'Spin ω₀ of the seeded vortices relative to jet strength.'), f2);
}
