// Setzt die Darstellungs-Bausteine des Gasriesen zum Render-Shader zusammen. Ein Baustein, der aus ist, wird NICHT mitkompiliert
// (stattdessen seine Aus-Variante mit leerem Einhängepunkt). Welche an sind, bestimmen Regler und Planet (renderVarianten()).
import { SKY_DRAW_WGSL } from '../../sky/sky';
import type { Preset } from '../../presets';
import { S } from '../zustand';
import { RENDER_BASIS } from './render_basis';
import { KARTE, KARTE_AUS } from './karte';
import { ATMOSAUM, ATMOSAUM_AUS } from './atmosaum';
import { RINGE, RINGE_AUS } from './ringe';
import { ANSICHTEN, ANSICHTEN_AUS } from './ansichten';
import { TIEFE_FUNK, TIEFE, TIEFE_AUS } from './tiefe';
import { PARALLAXE, PARALLAXE_AUS } from './parallaxe';
import { RELIEF_MEHRSTUFIG, RELIEF_EINFACH, RELIEF_AUS } from './relief';
import { DAEMMERUNG_V04, DAEMMERUNG_WEICH, DAEMMERUNG_AUS } from './daemmerung';
import { RAND_V04, RAND_WEICH, RAND_AUS } from './randschimmer';
import { HIMMEL_GAS, HIMMEL_GAS_AUS } from './himmel_gas';

export interface RenderVarianten {
  himmel: boolean; karte: boolean; saum: boolean; ringe: boolean; ansichten: boolean; tiefe: boolean; parallaxe: boolean;
  relief: 'aus' | 'einfach' | 'mehrstufig'; daemmerung: 'v04' | 'soft' | 'off'; rand: 'v04' | 'soft' | 'off';
}

export function renderVarianten(p: Preset): RenderVarianten {
  return {
    himmel: S.nebula > 0 || S.stars > 0,
    karte: S.map,
    saum: S.atmosphere > 0 && p.atmosphereStrength > 0,
    ringe: !!p.rings && p.rings.opacity > 0,
    ansichten: S.view !== 0,
    tiefe: S.depthOn,
    parallaxe: S.pomOn,
    relief: S.relief > 0 ? (S.reliefMulti && S.reliefCoarse > 0 ? 'mehrstufig' : 'einfach') : 'aus',
    daemmerung: S.twilight as RenderVarianten['daemmerung'],
    rand: S.rimGlow as RenderVarianten['rand'],
  };
}

export function renderCode(v: RenderVarianten): string {
  let c = '';
  if (v.himmel) c += SKY_DRAW_WGSL;
  c += RENDER_BASIS;
  c += v.himmel ? HIMMEL_GAS : HIMMEL_GAS_AUS;
  c += v.ansichten ? ANSICHTEN : ANSICHTEN_AUS;
  c += v.karte ? KARTE : KARTE_AUS;
  c += v.saum ? ATMOSAUM : ATMOSAUM_AUS;
  c += v.ringe ? RINGE : RINGE_AUS;
  if (v.tiefe || v.parallaxe) c += TIEFE_FUNK;
  c += v.tiefe ? TIEFE : TIEFE_AUS;
  c += v.parallaxe ? PARALLAXE : PARALLAXE_AUS;
  c += v.relief === 'mehrstufig' ? RELIEF_MEHRSTUFIG : v.relief === 'einfach' ? RELIEF_EINFACH : RELIEF_AUS;
  c += v.daemmerung === 'v04' ? DAEMMERUNG_V04 : v.daemmerung === 'soft' ? DAEMMERUNG_WEICH : DAEMMERUNG_AUS;
  c += v.rand === 'v04' ? RAND_V04 : v.rand === 'soft' ? RAND_WEICH : RAND_AUS;
  return c;
}
