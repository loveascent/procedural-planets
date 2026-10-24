// Einstieg des Mond-Generators in der gemeinsamen Seite (index.html?body=moon).
import { t, lang } from '../i18n';
import { initShell } from '../shell';
import { Motor } from './motor';
import { standard } from './zustand';
import { baueMenue } from './oberflaeche';
import { BAUSTEINE } from './bausteine/index';
import { vorlage, VORLAGEN } from './typen_vorlagen';
import type { Settings, Wert } from './typen';

declare const __VERSION__: string;

/** URL-Parameter: ?seed=…&typ=…&set=schluessel:wert,… (für Tests und Links). */
function ausUrl(S: Settings) {
  const q = new URLSearchParams(location.search);
  if (q.has('seed')) S.seed = q.get('seed')!;
  if (q.has('res')) S.res = Number(q.get('res'));
  if (q.has('typ')) wendeVorlage(S, q.get('typ')!);
  for (const kv of (q.get('set') ?? '').split(',').filter(Boolean)) {
    const [k, v] = kv.split(':');
    if (k in S) S[k] = typeof S[k] === 'boolean' ? v === '1' || v === 'true' : typeof S[k] === 'number' ? Number(v) : v;
  }
}

export function wendeVorlage(S: Settings, id: string) {
  const std = standard();
  const keep = { seed: S.seed, res: S.res };
  for (const k of Object.keys(std)) S[k] = std[k];
  Object.assign(S, keep);
  const v = vorlage(id);
  for (const [k, w] of Object.entries(v.w)) if (k in S) S[k] = w as Wert;
  S.typ = v.id;
}

export function run() {
  const $ = (id: string) => document.getElementById(id)!;
  $('t-title').textContent = t('Mond', 'Moon');
  $('panel-title').textContent = t('Regler', 'Controls');
  $('version').textContent = __VERSION__;
  initShell('moon');
  document.documentElement.lang = lang;
  const status = $('status');
  const meldung = (text: string, fehler = false) => { status.hidden = !text; status.textContent = text; status.style.background = fehler ? '' : '#14202a'; };
  const S = standard();
  ausUrl(S);
  const DEF = standard();
  const canvas = $('mond') as HTMLCanvasElement;
  const motor = new Motor(canvas, S, meldung);
  $('t-hint').textContent = t('ziehen: drehen · Rad: zoomen', 'drag: turn · wheel: zoom');
  $('credits').innerHTML = t(
    'Echtzeit-WebGPU, keine Bilddateien: jeder Krater, jede Rille und jeder Lavastrom kommt aus Gleichungen. Würfelkugel und Rauschen vom Gesteinsplaneten. Idee: loveascent. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Quellcode</a>',
    'Real-time WebGPU, no image files: every crater, groove and lava flow comes from equations. Cube sphere and noise from the rocky planet. Idea: loveascent. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Source code</a>');

  let wartend = false;
  const neu = async (pipes: boolean) => {
    if (wartend) return;
    wartend = true;
    try {
      if (Number(S.res) !== motor.N) motor.allocate(Number(S.res));
      if (pipes) await motor.pipelines();
      motor.neueKarte();
    } catch (e) { console.error(e); } finally { wartend = false; }
  };
  let menue = baueMenue($('panel-body'), S, DEF, {
    aenderung: (k) => {
      if (k === 'typ') { wendeVorlage(S, String(S.typ)); menue.refresh(); void neu(true); return; }
      if (k === 'seed') { void neu(false); return; }
      if (k === 'res') { void neu(false); return; }
      if (k.endsWith('_an')) { void neu(true); return; }
      if (BAUSTEINE.some((b) => k.startsWith(b.id + '_'))) { motor.neueKarte(); }
    },
    vorlage: (id) => { wendeVorlage(S, id); menue.refresh(); void neu(true); },
    seed: (s) => { S.seed = s; void neu(false); },
    zufall: () => { S.seed = String(Math.floor(Math.random() * 9999)); (document.getElementById('ctl-seed') as HTMLInputElement).value = String(S.seed); void neu(false); },
    exotisch: () => {
      // Würfelt Vorlage, Seed und einige Regler: Farbtöne, Dichten, Hitze. Alles bleibt ein normaler Regler, danach beliebig nachstellbar.
      const R = Math.random;
      const v = VORLAGEN[Math.floor(R() * VORLAGEN.length)];
      wendeVorlage(S, v.id);
      S.seed = String(Math.floor(R() * 9999));
      const wackel = (k: string, f: number) => { if (typeof S[k] === 'number') S[k] = Math.max(0, (S[k] as number) * (1 + (R() * 2 - 1) * f)); };
      for (const k of ['krater_dichte', 'gelaende_hoehe', 'krater_alter', 'einschlaege_anz', 'maria_anteil', 'eis_frq', 'chaos_anteil', 'vulkane_dichte', 'lava_see']) wackel(k, 0.5);
      for (const k of ['regolith_farbton', 'eisfarbe_farbton', 'tholin_farbton', 'polkappe_farbton', 'luft_farbton', 'seen_farbton']) if (R() < 0.7) S[k] = Math.floor(R() * 360);
      if (R() < 0.6) { S.regolith_saett = 0.2 + R() * 0.5; S.eisfarbe_saett = 0.1 + R() * 0.5; }
      if (R() < 0.3) { S.lava_an = true; S.lava_hitze = 3 + R() * 6; }
      if (R() < 0.3) { S.fontaenen_an = true; S.fontaenen_schirm = R(); }
      if (R() < 0.25) { S.luft_an = true; S.luft_dichte = 0.3 + R() * 3; S.luft_farbton = Math.floor(R() * 360); S.luft_saett = 0.4 + R() * 0.5; }
      S.typ = v.id; menue.refresh(); (document.getElementById('ctl-seed') as HTMLInputElement).value = String(S.seed); void neu(true);
    },
  });
  let letzte = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = letzte;
  const schritt = (now: number) => {
    const dt = Math.min((now - letzte) / 1000, 0.1); letzte = now;
    if (motor.pScene) motor.bild(dt);
    fpsAcc += dt; fpsN++;
    if (now - fpsT > 500) { $('fps').textContent = `${Math.round(fpsN / Math.max(fpsAcc, 1e-3))} fps · ${(1000 * fpsAcc / Math.max(fpsN, 1)).toFixed(1)} ms`; fpsAcc = 0; fpsN = 0; fpsT = now; }
    requestAnimationFrame(schritt);
  };
  (window as unknown as Record<string, unknown>).mond = {
    S, motor, get bereit() { return motor.bereit && !motor.bake.aktiv && motor.sky.ready; },
    setze: async (k: string, v: Wert) => { S[k] = v; menue.refresh(); await neu(k.endsWith('_an') || k === 'typ'); },
    vorlage: async (id: string) => { wendeVorlage(S, id); menue.refresh(); await neu(true); },
    foto: async (w: number, h: number, skala = 1) => {
      const px = await motor.aufnahme(w, h, skala);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      g.putImageData(new ImageData(new Uint8ClampedArray(px.buffer, px.byteOffset, px.byteLength) as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
      return c.toDataURL('image/png');
    },
    kamera: (yaw: number, pitch: number, dist: number) => { const c = motor.cam.cam; c.yaw = yaw; c.pitch = pitch; c.dist = c.tDist = dist; },
    halt: (spin: number) => { motor.spin = spin; S.drehung = 0; },
  };
  motor.start().then(async () => {
    motor.allocate(Number(S.res));
    motor.neueKarte();
    requestAnimationFrame((n) => { letzte = n; schritt(n); });
  }).catch((e: Error) => { meldung('Der Mond konnte nicht starten: ' + e.message, true); console.error(e); });
  void menue;
}
