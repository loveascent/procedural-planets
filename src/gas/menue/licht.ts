// Menü-Abschnitt „Licht und Ansicht“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittLicht(p: Panel, k: MenueKontext): Panel {
  const { f2, fx } = k;
  return p
    .section(t('Licht und Ansicht', 'Light and view'), undefined, true)
    .range('sunAngle', t('Sonnenstand', 'Sun angle'), -180, 180, 1,
      t('Richtung der Sonne. 0° = Sonne hinter der Kamera (voller Planet), 90° = Halbphase.', 'Sun direction. 0° = sun behind the camera (full disc), 90° = half phase.'), (v) => `${v}°`)
    .select('twilight', t('Dämmerung', 'Twilight'), [['v04', t('wie v0.4 (Streifen)', 'as v0.4 (stripe)')], ['soft', t('weich, nach Atmosphäre', 'soft, by atmosphere')], ['off', t('aus', 'off')]],
      t('Aufhellung hinter der Tag-Nacht-Grenze. v0.4: fester Buckel, sieht wie eine Kraterlinie aus. Weich: fällt nur ab, ohne Stufe, so stark wie die Atmosphäre. Aus: nur Sonnenlicht.',
        'Brightening past the day–night line. v0.4: fixed bump that looks like a crater line. Soft: only falls off, no step, as strong as the atmosphere. Off: sunlight only.'))
    .select('rimGlow', t('Randschimmer', 'Rim glow'), [['v04', t('wie v0.4', 'as v0.4')], ['soft', t('weich', 'soft')], ['off', t('aus', 'off')]],
      t('Atmosphären-Schimmer am Planetenrand auf der Sonnenseite.', 'Atmosphere glow at the planet edge on the sun side.'))
    .range('limb', t('Randverdunkelung', 'Limb darkening'), 0.8, 2, 0.01,
      t('Minnaert-Exponent k. 1 = matte Kugel; höher = dunkler Rand wie bei echten Gasplaneten.', 'Minnaert exponent k. 1 = matte sphere; higher = darker limb, as on real gas giants.') + fx('I = (n·l)<sup>k</sup> · (n·v)<sup>k−1</sup>'), f2)
    .range('atmosphere', t('Dunstsaum', 'Haze rim'), 0, 6, 0.05, t('Helligkeit des Atmosphärensaums am Planetenrand.', 'Brightness of the atmospheric rim at the planet’s edge.') + fx(t('Saum = e<sup>−h/0,025</sup>', 'rim = e<sup>−h/0.025</sup>')), f2)
    .range('exposure', t('Belichtung', 'Exposure'), 0.1, 5, 0.05, t('Gesamthelligkeit vor der ACES-Tonwertkurve.', 'Overall brightness before the ACES tone curve.'), f2)
    .range('nebula', t('Milchstraße', 'Milky Way'), 0, 3, 0.01,
      t('Derselbe Himmel wie beim Gesteinsplaneten: helles Band mit Kern, Staubbahnen, rote Gaswolken. Steht fest, nur der Planet dreht sich.',
        'The same sky as on the rocky planet: bright band with a core, dust lanes, red gas clouds. It stays fixed, only the planet turns.'), f2)
    .range('stars', t('Sterne', 'Stars'), 0, 3, 0.01, t('Helligkeit der Sterne; im Milchstraßenband stehen mehr.', 'Brightness of the stars; more of them sit in the Milky Way band.'), f2)
    .toggle('map', t('Kartenansicht', 'Map view'),
      t('Zeigt die ganze Kugel als flache Weltkarte (Längen- und Breitengrade).', 'Shows the whole sphere as a flat map (longitude/latitude).'))
    .select('view', t('Feld anzeigen', 'Show field'), [['0', t('Wolken', 'Clouds')], ['1', t('Wind (Richtung)', 'Wind (direction)')], ['2', t('Wirbelstärke', 'Vorticity')], ['3', t('Druck', 'Pressure')]],
      t('Debug-Ansichten. Wind: Rot = Ost, Grün = Nord. Wirbelstärke: Rot = gegen den Uhrzeigersinn, Blau = im Uhrzeigersinn. Druck nur bei Stable Fluids.',
        'Debug views. Wind: red = east, green = north. Vorticity: red = counter-clockwise, blue = clockwise. Pressure only with Stable Fluids.'));
}
