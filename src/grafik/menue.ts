// Gemeinsame Regler der Bildkette (Gasriese, Gesteinsplanet/Mond, Sonnensystem) mit den vorhandenen Panel-Bausteinen,
// dazu Standardwerte (alles aus), Sichtbarkeit und der Bildraten-Deckel.
import type { Panel } from '../ui';
import { t } from '../i18n';

/** Alles aus. fxScale und fxSharp wirken erst, wenn ihr Verfahren an ist. */
export const KETTE_STANDARD = { fxUp: 'off', fxScale: 0.67, fxAA: 'off', fxSharpOn: false, fxSharp: 0.5, fxDither: false, fxCap: '0' };
export type KettenStand = typeof KETTE_STANDARD;

export const ketteAn = (S: KettenStand) => S.fxUp !== 'off' || S.fxAA !== 'off' || S.fxSharpOn || S.fxDither;

/** Bildraten-Deckel: true = dieses Bild auslassen (0,8 ms Spielraum für den Takt des Bildschirms). */
export const zuFrueh = (cap: string | number, jetzt: number, letzte: number) => Number(cap) > 0 && jetzt - letzte < 1000 / Number(cap) - 0.8;

export function deckelRegler(p: Panel): Panel {
  return p.select('fxCap', t('Bildrate: Deckel', 'Frame rate: cap'), [['0', t('Aus', 'Off')], ['30', '30 fps'], ['60', '60 fps'], ['120', '120 fps']],
    t('Zeichnet höchstens so viele Bilder je Sekunde. Spart Strom und Wärme; macht nichts schneller.', 'Draws at most this many frames per second. Saves power and heat; makes nothing faster.'));
}

/** extra: weitere Wahlmöglichkeiten der Seite (z. B. zeitliche Verfahren des Gasriesen); dither: die Seite hat noch keins;
 *  deckel: false, wenn die Seite den Bildraten-Deckel selbst bei Auflösung und Bildrate einordnet. */
export function ketteRegler(p: Panel, extra: { up?: [string, string][]; aa?: [string, string][]; dither?: boolean; deckel?: boolean } = {}): Panel {
  p.select('fxUp', t('Hochskalieren', 'Upscaling'), [['off', t('Aus', 'Off')], ['linear', 'Bilinear'], ['cubic', t('Bikubisch (Catmull-Rom)', 'Bicubic (Catmull-Rom)')], ['lanczos', 'Lanczos-2'], ['edge', t('Kantenadaptiv (wie FSR 1, eigene Fassung)', 'Edge-adaptive (like FSR 1, own version)')], ...(extra.up ?? [])],
    t('Zeichnet mit der internen Renderskala und rechnet das Bild auf die Fensterauflösung um. Spart Pixel-Arbeit, kostet Schärfe. Kantenadaptiv folgt der Beschreibung von AMDs FSR 1, ist aber eine eigene Umsetzung und nicht identisch. Gut mit Schärfen und Kantenglättung.',
      'Renders at the internal scale and resamples to window resolution. Saves pixel work, costs sharpness. Edge-adaptive follows the description of AMD FSR 1 but is our own, non-identical implementation. Works well with sharpening and anti-aliasing.'))
    .range('fxScale', t('Hochskalieren: Renderskala', 'Upscaling: render scale'), 0.33, 2, 0.01,
      t('Anteil der Pixel je Kante, der wirklich gerechnet wird. 0,67 ≈ 44 % der Pixel. Über 1 = Supersampling (SSAA) mit Herunterfiltern.', 'Share of pixels per edge that is really shaded. 0.67 ≈ 44 % of the pixels. Above 1 = supersampling (SSAA) with downfiltering.'), (v) => `${Math.round(v * 100)} %`)
    .select('fxAA', t('Kanten: Glättung', 'Edges: anti-aliasing'), [['off', t('Aus', 'Off')], ['fxaa', t('FXAA-Verfahren', 'FXAA method')], ['mlaa', t('Morphologisch (MLAA, wie SMAA ohne Diagonalen)', 'Morphological (MLAA, like SMAA without diagonals)')], ...(extra.aa ?? [])],
      t('FXAA: ein Durchgang, glättet auch Schattierungs-Kanten, weicht feine Struktur leicht auf. Morphologisch: findet Treppenstufen und rechnet ihre Pixel-Deckung aus, schont Flächen. Beide eigene Umsetzungen der veröffentlichten Verfahren.',
        'FXAA: one pass, also smooths shading edges, slightly softens fine detail. Morphological: finds stair steps and computes their pixel coverage, keeps flat areas. Both are own implementations of the published methods.'))
    .toggle('fxSharpOn', t('Kanten: Schärfen', 'Edges: sharpen'), t('Kontrastadaptives Schärfen nach der CAS-Beschreibung von AMD (eigene Umsetzung). Holt Schärfe nach dem Hochskalieren oder der zeitlichen Glättung zurück.', 'Contrast-adaptive sharpening after AMD’s CAS description (own implementation). Restores crispness after upscaling or temporal AA.'))
    .range('fxSharp', t('Kanten: Schärfe-Stärke', 'Edges: sharpen amount'), 0, 1, 0.05, t('0 = mild, 1 = am stärksten.', '0 = mild, 1 = strongest.'), (v) => v.toFixed(2));
  if (extra.dither) p.toggle('fxDither', t('Dithering (gegen Farbstreifen)', 'Dithering (against banding)'), t('Rechnet das Bild feiner und mischt vor der Rundung auf 8 Bit ein halbes Stufen-Rauschen dazu. Nimmt Streifen aus dunklen Verläufen. Kein Gewinn an Bildrate.', 'Renders in higher precision and adds half a step of noise before rounding to 8 bit. Removes banding in dark gradients. No frame-rate gain.'));
  return extra.deckel === false ? p : deckelRegler(p);
}

export function ketteSichtbar(p: Panel, S: KettenStand) {
  p.visible('fxScale', S.fxUp !== 'off');
  p.visible('fxSharp', S.fxSharpOn);
}
