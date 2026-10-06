// Menü-Abschnitt „Partikel“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittPartikel(p: Panel, k: MenueKontext): Panel {
  const { app, pct, f3, fx } = k;
  return p
    .section(t('Partikel', 'Particles'), t('Darstellung Partikel. Jeder Partikel bewegt sich mit dem Wind und mischt seine Farbe in die Textur:', 'Particle looks. Each particle moves with the wind and blends its colour into the texture:'), true)
    .custom(app.formulaNote(t('p ← normalize(p + v(p + v·Δt/2)·Δt),   c<sub>Texel</sub> ← mix(c<sub>Texel</sub>, c<sub>Partikel</sub>, α·sin(π·Alter/Lebensdauer))', 'p ← normalize(p + v(p + v·Δt/2)·Δt),   c<sub>texel</sub> ← mix(c<sub>texel</sub>, c<sub>particle</sub>, α·sin(π·age/lifetime))')))
    .range('lifetime', t('Lebensdauer', 'Lifetime'), 0.5, 60, 0.5,
      t('Sekunden bis zur Neugeburt. Lang = lange Schlieren. Bei 60 leben Partikel ewig (Gaseous Giganticus).',
        'Seconds until rebirth. Long = long streaks. At 60 particles live forever (Gaseous Giganticus).'), (v) => (v >= 60 ? t('ewig', 'forever') : `${v.toFixed(1)} s`))
    .range('opacity', t('Deckkraft', 'Opacity'), 0.01, 1, 0.01, t('α: wie stark ein Partikel seine Farbe in die Textur schreibt.', 'α: how strongly a particle writes its colour into the texture.'), pct)
    .range('blur', t('Weichzeichnen', 'Blur'), 0, 1, 0.01, t('Verwischt die Textur jedes Bild ein wenig, damit aus Punkten Wolken werden.', 'Blurs the texture slightly every frame so points become clouds.') + fx(t('c ← mix(c, Mittel der 4 Nachbarn, b)', 'c ← mix(c, mean of 4 neighbours, b)')), pct)
    .range('fade', t('Verblassen', 'Fade'), 0, 1, 0.005,
      t('Nur Darstellung „Partikel rein“: wie schnell die Textur zu einer einzigen Mittelfarbe verblasst (jasper-r). Die Bänder entstehen dann allein aus den Partikeln.',
        '“Pure particles” look only: how fast the texture fades to one mean colour (jasper-r). Bands then come from the particles alone.') + fx(t('c ← mix(c, c<sub>Mittel</sub>, 1 − e<sup>−k·Δt</sup>)', 'c ← mix(c, c<sub>mean</sub>, 1 − e<sup>−k·Δt</sup>)')), f3)
    .range('viewFocus', t('Sichtfeld-Anteil', 'View focus'), 0, 0.95, 0.05,
      t('Anteil der Partikel, die auf der sichtbaren Seite geboren werden. Bei 0,8 landen 80 % der Rechenarbeit dort, wo du hinschaust: schärfer beim Heranzoomen, gleiche Kosten. Die Rückseite verblasst dann langsamer als sie bemalt wird; zu hoch gewählt wirkt sie beim Drehen blasser.',
        'Share of particles born on the visible side. At 0.8, 80 % of the work lands where you look: sharper when zooming in, same cost. The far side then gets painted less; set too high it looks paler when it turns into view.'), pct);
}
