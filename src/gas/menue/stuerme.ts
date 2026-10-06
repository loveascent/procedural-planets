// Menü-Abschnitt „Stürme“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittStuerme(p: Panel, k: MenueKontext): Panel {
  const { pct, f2, fx } = k;
  return p
    .section(t('Stürme', 'Storms'), undefined, true)
    .toggle('storms', t('Vorlagen-Stürme', 'Preset storms'),
      t('Setzt die bekannten Stürme der Vorlage (z. B. Großer Roter Fleck) beim Start als Wirbel ein.',
        'Seeds the preset’s known storms (e.g. the Great Red Spot) as vortices at start.') + fx(t('v(d) = 2,33 · x·e<sup>−x²</sup>,  x = d / r', 'v(d) = 2.33 · x·e<sup>−x²</sup>,  x = d / r')))
    .toggle('remember', t('Zustand merken', 'Remember state'),
      t('Modul. Speichert den fertig eingeschwungenen Planeten in diesem Browser. Beim nächsten Laden mit denselben Einstellungen ist er sofort da, ohne Einschwingen. Nur der letzte Zustand wird behalten; je nach Farbauflösung braucht er 10 bis 200 MB Speicher im Browser.',
        'Module. Saves the fully spun-up planet in app browser. Next time with the same settings it appears instantly, without spin-up. Only the latest state is kept; depending on colour resolution it needs 10 to 200 MB of browser storage.'))
    .toggle('focusStorm', t('Start mit Hauptsturm im Blick', 'Start with main storm in view'),
      t('Dreht den Planeten nach dem Laden so, dass der größte Sturm der Vorlage (bei Jupiter der Große Rote Fleck) am Anfang der Tagseite vor der Kamera steht.',
        'After loading, turns the planet so the preset’s largest storm (Jupiter: the Great Red Spot) sits at the start of the day side in front of the camera.'))
    .range('stormSize', t('Sturm-Größe', 'Storm size'), 0.2, 5, 0.05,
      t('Radius aller Stürme als Faktor, unabhängig vom Drehtempo. Groß und langsam ist so möglich: große Sturm-Größe, kleines Drehtempo.',
        'Radius of all storms as a factor, independent of spin speed. Big and slow is possible: large storm size, low spin speed.') + fx('r′ = r · Faktor'), (v) => `${v.toFixed(2)}×`)
    .range('stormStrength', t('Sturm-Drehtempo', 'Storm spin speed'), 0, 10, 0.05, t('Wie schnell sich die Stürme drehen, relativ zur Jet-Stärke. Die Größe stellst du getrennt unter „Sturm-Größe“ ein.', 'How fast storms spin, relative to jet strength. Size is set separately under “Storm size”.'), f2)
    .range('stormHold', t('Stürme festhalten', 'Hold storms'), 0, 1, 0.01,
      t('Treibt die Vorlagen-Stürme dauerhaft an. 0 = reine Physik (sie dürfen treiben, verschmelzen, vergehen), 1 = wie ein Beobachtungsdatum festgehalten.',
        'Keeps driving the preset storms. 0 = pure physics (they may drift, merge, fade), 1 = enforced like observation data.') + fx(t('u += (v<sub>Sturm</sub> − u) · 2·w·Maske·Δt', 'u += (v<sub>storm</sub> − u) · 2·w·mask·Δt')), pct)
    .range('stormSpawn', t('Neue Stürme', 'New storms'), 0, 5, 0.01,
      t('Wie oft Konvektion einen neuen Wirbel anstößt (pro Sekunde Simulationszeit). Der Drehsinn folgt der Scherung an der Stelle, denn nur ein mitdrehender Wirbel überlebt sie. In antizyklonalen Zonen entstehen so weiße Ovale, in zyklonalen Gürteln dunkle Barken.',
        'How often convection kicks off a new vortex (per second of simulated time). Its spin follows the local shear, because only a co-rotating vortex survives it. Anticyclonic zones grow white ovals, cyclonic belts dark barges.') + fx(t('Drehsinn = sign(ζ<sub>Hintergrund</sub>),  ζ ≈ −∂U/∂φ', 'spin = sign(ζ<sub>background</sub>),  ζ ≈ −∂U/∂φ')), f2)
    .range('kickLife', t('Anstoß-Dauer', 'Kick duration'), 0.5, 120, 0.5,
      t('Wie lange ein neuer Sturm angetrieben wird, bevor er frei ist. Kurz = kurzes Aufflackern. Lang = er wächst zu einem großen Wirbel heran und lebt dann von der Physik: er treibt mit dem Jet, verschmilzt oder zerfällt.',
        'How long a new storm is driven before it is free. Short = a brief flicker. Long = it grows into a big vortex and then lives on physics: drifts with the jet, merges or decays.') + fx(t('w(t) = sin(π · t / Dauer)', 'w(t) = sin(π · t / duration)')), (v) => `${v.toFixed(1)} s`)
    .range('stormTint', t('Sturm-Farbe', 'Storm colour'), 0, 10, 0.05, t('Wie stark ein angetriebener Sturm seine Farbe in die Wolken gibt.', 'How strongly a driven storm tints the clouds.'), f2);
}
