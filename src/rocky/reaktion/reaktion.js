import { lang } from '../../i18n';
import { planetParams } from '../logik/zufall.js';


// Regler-Reaktionen: was ein Regler auslöst (neu rechnen, Karten, Profil, Stil, Seed).
// ext: { S, RS, menu, regenerate, DEF, queueSky, seaFromFraction, buildRiverLines, buildUI, $, setLang, randomSeed, device*, seaH*, lutDirty*, riverT*, PP* }  (* = lebender Zustand, per Getter/Setter)
export function createReaktion(ext) {
  const { S, RS, menu, regenerate, DEF, queueSky, seaFromFraction, buildRiverLines, buildUI, $, setLang, randomSeed } = ext;
  // ------------------------------------------------------------------ Regler-Reaktionen
  function changed(it) {
    const k = it.k;
    if (!ext.device) return;
    ext.variantenNachziehen();   // Bausteine, die beim Ausschalten nicht mitkompiliert werden (Vulkane, Wellen)
    // Einschalten von Wolken/Himmel: Pipelines nachziehen, dann die Karte erzeugen, die beim Ausschalten übersprungen wurde
    if (k === 'modClouds' || k === 'nebula' || k === 'stars') ext.variantenNachziehen().then(() => { ext.wolkenErzeugen(); ext.himmelErzeugen(); });
    if (k === 'profile' && S.profile === 'minimal') {
      Object.assign(S, { modClouds: false, modAtmo: false, modShadows: false, modBloom: false, modFlare: false, modRim: false, volcanoOn: false, rivers: 0, detail: 0, quality: -1 });
      RS.transKey = ''; menu.panel?.refresh(); regenerate(); return;
    }
    if (k === 'profile') { Object.assign(S, { modClouds: DEF.modClouds, modAtmo: DEF.modAtmo, modShadows: DEF.modShadows, modBloom: DEF.modBloom, modFlare: DEF.modFlare, volcanoOn: DEF.volcanoOn, rivers: DEF.rivers, detail: DEF.detail }); RS.transKey = ''; menu.panel?.refresh(); regenerate(); return; }
    if (k === 'res' || k === 'erosion' || k === 'volcanoes' || k === 'volcanoOn' || k === 'volcanoType' || k === 'rivers' || k === 'riverAmount') { regenerate(); }
    else if (k === 'modAtmo') { RS.transKey = ''; }
    else if (k === 'msaa' && !ext.kopflos) { const u = new URL(location.href); u.searchParams.set('msaa', String(S.msaa)); u.searchParams.set('seed', S.seed); location.href = u.toString(); }
    else if (it.regen === 'sky') { if (S.nebula > 0 || S.stars > 0) queueSky(); }
    else if (k === 'sea') { ext.seaH = seaFromFraction(S.sea); ext.lutDirty = true; clearTimeout(ext.riverT); ext.riverT = setTimeout(() => { if (S.rivers === 2) regenerate(); else buildRiverLines(); }, 400); }
    else if (k === 'lang') buildUI();
  }
  function setStyle(st, already) {
    if (!already && S.style === st) return;
    S.style = st;
    buildUI();
    if (ext.device) regenerate();
  }
  $('lang').addEventListener('click', () => { setLang(lang === 'de' ? 'en' : 'de'); buildUI(); });
  function newSeed(sd) {
    S.seed = String(sd).trim() || randomSeed();
    ext.PP = planetParams(S.seed);
    if (!S.moon) S.sea = ext.PP.water;   // der Mond bleibt trocken (Meer lässt sich per Regler einschalten)
    S.cover = ext.PP.cloudCover;
    if (!ext.kopflos) try { const u = new URL(location.href); u.searchParams.set('seed', S.seed); history.replaceState(null, '', u); } catch {}
    buildUI();
    if (ext.device) regenerate();
  }
  return { changed, setStyle, newSeed };
}
