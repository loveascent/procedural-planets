// Menü des Mond-Generators: gemeinsames Regler-Panel (src/ui.ts), je Baustein ein Abschnitt mit Schalter und eigenen Reglern.
import { Panel } from '../ui';
import { t } from '../i18n';
import { BAUSTEINE } from './bausteine/index';
import { GLOBAL_ANSICHT, GLOBAL_LICHT, type Global } from './zustand';
import { VORLAGEN } from './typen_vorlagen';
import type { Gruppe, Settings } from './typen';

const GRUPPEN: [Gruppe, string, string][] = [
  ['form', 'Form', 'Shape'], ['relief', 'Relief', 'Relief'], ['eis', 'Eis und Risse', 'Ice and fractures'], ['hitze', 'Vulkane und Hitze', 'Volcanoes and heat'],
  ['farbe', 'Farbe und Material', 'Colour and material'], ['luft', 'Luft und Dunst', 'Air and haze'],
];

export interface MenueAktionen {
  aenderung: (key: string) => void;
  vorlage: (id: string) => void;
  zufall: () => void;
  exotisch: () => void;
  seed: (s: string) => void;
}

export function baueMenue(root: HTMLElement, S: Settings, defaults: Settings, akt: MenueAktionen): Panel {
  root.innerHTML = '';
  const p = new Panel(root, S, (k) => akt.aenderung(k), defaults);
  const offen = new Set(['mond']);

  // ---- Mond: Typ, Seed, Auflösung
  p.section(t('Mond', 'Moon'), t('Wähle einen Mondtyp, dann ändere jeden Baustein einzeln.', 'Pick a moon type, then tune each block on its own.'), offen.has('mond'));
  p.select('typ', t('Mondtyp', 'Moon type'), VORLAGEN.map((v) => [v.id, t(v.de, v.en)] as [string, string]), t('Setzt alle Bausteine und Regler auf eine Vorlage, die an einem echten Mond oder einer exotischen Welt orientiert ist. Danach lässt sich alles weiter verstellen.', 'Sets all blocks and controls to a template based on a real moon or an exotic world. Everything can be tuned afterwards.'));
  const seedRow = document.createElement('div');
  seedRow.className = 'row row-seed';
  seedRow.innerHTML = `<label for="ctl-seed">${t('Seed', 'Seed')}</label><input type="text" id="ctl-seed" value="${String(S.seed)}" autocomplete="off" spellcheck="false">`;
  const inp = seedRow.querySelector('input') as HTMLInputElement;
  inp.addEventListener('change', () => akt.seed(inp.value));
  p.custom(seedRow);
  p.buttons([
    ['mond-zufall', t('Neuer Zufall', 'New random'), akt.zufall],
    ['mond-exotisch', t('Exotisch würfeln', 'Roll an exotic one'), akt.exotisch],
  ], { 'mond-zufall': t('Neuer Seed: gleiche Bausteine, andere Krater, Becken und Gelände.', 'New seed: same blocks, different craters, basins and terrain.'), 'mond-exotisch': t('Würfelt einen Mondtyp und mischt die Regler zufällig um. Der Seed bestimmt die Einzelheiten.', 'Rolls a moon type and shuffles the controls randomly. The seed decides the details.') });
  p.select('res', t('Kartenauflösung', 'Map resolution'), [['512', '512² · schnell'], ['1024', '1024²'], ['2048', '2048² · scharf']], t('Texel je Würfelseite. Alles darunter (kleinere Krater, Körnung) rechnet das Bild live pro Pixel; höhere Auflösung bringt Silhouetten und Schatten feiner, kostet aber Speicher (2048² ≈ 0,5 GB).', 'Texels per cube face. Everything below (smaller craters, grain) is computed live per pixel; higher resolution refines silhouettes and shadows but costs memory (2048² ≈ 0.5 GB).'));

  const glob = (titel: string, noteDe: string, noteEn: string, list: Global[], open: boolean) => {
    p.section(titel, t(noteDe, noteEn), open);
    for (const g of list) p.range(g.k, t(g.de, g.en), g.min, g.max, g.step, t(...g.hint), g.fmt);
  };
  glob(t('Licht und Bild', 'Light and image'), 'Sonne, Belichtung, Schatten, Detail.', 'Sun, exposure, shadows, detail.', GLOBAL_LICHT, true);
  glob(t('Ansicht', 'View'), 'Drehung und Kamera.', 'Spin and camera.', GLOBAL_ANSICHT, false);

  // ---- Bausteine nach Gruppe
  for (const [gr, de, en] of GRUPPEN) {
    const liste = BAUSTEINE.filter((b) => b.gruppe === gr);
    if (!liste.length) continue;
    for (const b of liste) {
      p.section(`${t(de, en)} · ${t(b.de, b.en)}`, t(...b.note), false);
      (root.lastElementChild as HTMLElement).dataset.block = b.id;
      p.toggle(`${b.id}_an`, t('Baustein an', 'Block on'), t('Schaltet diesen Baustein ein oder aus. Ausgeschaltet wird sein Shader-Code nicht einmal übersetzt, das Bild zeigt dann genau, was er beiträgt.', 'Switches this block on or off. When off, its shader code is not even compiled, so the image shows exactly what it contributes.'));
      for (const q of b.par) p.range(`${b.id}_${q.k}`, t(q.de, q.en), q.min, q.max, q.step, t(...q.hint), q.fmt);
    }
  }
  const sync = () => { for (const b of BAUSTEINE) for (const q of b.par) p.disable(`${b.id}_${q.k}`, !S[`${b.id}_an`]); };
  sync();
  const orig = p.onChange;
  p.onChange = (k) => { orig(k); if (k.endsWith('_an')) sync(); };
  return p;
}
