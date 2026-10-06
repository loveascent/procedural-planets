// Setzt die Shader-Bausteine zu den Compute-Modulen zusammen. Ein Baustein, der aus ist, wird NICHT mitkompiliert:
// statt seines Codes kommt die Aus-Variante (leerer Einhängepunkt). Welche Bausteine an sind, bestimmen die Regler (varianten()).
import { S } from '../zustand';
import { STRUKTUR } from './struktur';
import { WUERFEL } from './wuerfel';
import { TABELLEN } from './tabellen';
import { RAUSCHEN } from './rauschen';
import { CURLRAUSCHEN } from './curlrauschen';
import { STUERME } from './stuerme';
import { FLUID_BASIS } from './fluid_basis';
import { ANFANGSWIND } from './anfangswind';
import { ADVEKTION } from './advektion';
import { WIRBELSTAERKE } from './wirbelstaerke';
import { KRAEFTE } from './kraefte';
import { DRUCK } from './druck';
import { JETS, JETS_AUS } from './jets';
import { CORIOLIS, CORIOLIS_AUS } from './coriolis';
import { STURMANTRIEB, STURMANTRIEB_AUS } from './sturmantrieb';
import { TURBULENZ, TURBULENZ_AUS } from './turbulenz';
import { WIRBELVERSTAERKUNG, WIRBELVERSTAERKUNG_AUS } from './wirbelverstaerkung';
import { REIBUNG, REIBUNG_AUS } from './reibung';
import { BFECC, BFECC_AUS } from './bfecc';
import { TRACER_BASIS } from './tracer_basis';
import { FARBSTOFF } from './farbstoff';
import { FEINSTREIFEN, FEINSTREIFEN_AUS } from './feinstreifen';
import { KONVEKTION, KONVEKTION_AUS } from './konvektion';
import { STURMFARBE, STURMFARBE_AUS } from './sturmfarbe';
import { BANDRUECK, BANDRUECK_AUS } from './bandrueck';
import { CURLFLUSS } from './curlfluss';
import { PARTIKEL } from './partikel';
import { PARTIKEL_WEICH } from './partikel_weich';
import { PARTIKEL_VERBLASSEN } from './partikel_verblassen';

export const COMMON = STRUKTUR + WUERFEL + TABELLEN + RAUSCHEN + CURLRAUSCHEN + STUERME;

/** Welche Bausteine der Rechnung gerade an sind (abgeleitet aus den Reglern). */
export interface Varianten {
  fluid: boolean;        // Rechenmodell Stable Fluids (sonst Curl-Noise)
  jets: boolean;         // Jets mit Breitenkreis-Mittel
  coriolis: boolean;
  sturm: boolean;        // Sturm-Antrieb
  turbulenz: boolean;
  wirbelv: boolean;      // Wirbelverstärkung
  reibung: boolean;
  bfecc: boolean;
  streifen: boolean;     // Feinstreifen
  konvektion: boolean;
  sturmfarbe: boolean;
  bandrueck: boolean;
  curl: boolean;         // Curl-Noise-Flussfeld
  partikel: boolean;     // Partikel bewegen
  weich: boolean;        // Darstellung „Partikel“ (zurück zur Bandfarbe)
  verblassen: boolean;   // Darstellung „Partikel rein“ (zur Mittelfarbe)
}

export function varianten(): Varianten {
  const eddy = 0.06 * S.eddyStrength;
  const fluid = S.flow === 'fluid';
  return {
    fluid,
    jets: fluid && S.jetRelax > 0,
    coriolis: fluid && S.omega !== 0,
    sturm: fluid && (S.storms || S.stormSpawn > 0),   // ohne Stürme ist der Antrieb wirkungslos (Gewicht 0)
    turbulenz: fluid && S.turbulence * eddy * 0.05 > 0,
    wirbelv: fluid && S.confinement > 0,
    reibung: fluid && S.drag > 0,
    bfecc: !!S.bfecc,
    streifen: S.fineStripes > 0,
    konvektion: S.convection > 0,
    sturmfarbe: S.stormTint > 0,
    bandrueck: S.bandRelax > 0,
    curl: S.flow === 'curl',
    partikel: S.look !== 'dye',
    weich: S.look === 'particles',
    verblassen: S.look === 'pure',
  };
}

/** Compute-Modul „fluid“: Grundlagen, Anfangswind und – nur bei Stable Fluids – Advektion, Kräfte und Druck. */
export function fluidCode(v: Varianten): string {
  let c = COMMON + FLUID_BASIS + ANFANGSWIND + (v.bfecc ? BFECC : BFECC_AUS);
  if (!v.fluid) return c;
  c += ADVEKTION + WIRBELSTAERKE;
  c += v.jets ? JETS : JETS_AUS;
  c += v.coriolis ? CORIOLIS : CORIOLIS_AUS;
  c += v.sturm ? STURMANTRIEB : STURMANTRIEB_AUS;
  c += v.turbulenz ? TURBULENZ : TURBULENZ_AUS;
  c += v.wirbelv ? WIRBELVERSTAERKUNG : WIRBELVERSTAERKUNG_AUS;
  c += v.reibung ? REIBUNG : REIBUNG_AUS;
  return c + KRAEFTE + DRUCK;
}

/** Compute-Modul „tracers“: Farbstoff (mit seinen Termen), Curl-Flussfeld und Partikel, je nach Rechenmodell und Darstellung. */
export function tracerCode(v: Varianten): string {
  let c = COMMON + TRACER_BASIS + (v.bfecc ? BFECC : BFECC_AUS);
  c += v.streifen ? FEINSTREIFEN : FEINSTREIFEN_AUS;
  c += v.konvektion ? KONVEKTION : KONVEKTION_AUS;
  c += v.sturmfarbe ? STURMFARBE : STURMFARBE_AUS;
  c += v.bandrueck ? BANDRUECK : BANDRUECK_AUS;
  c += FARBSTOFF;
  if (v.curl) c += CURLFLUSS;
  if (v.partikel) c += PARTIKEL;
  if (v.weich) c += PARTIKEL_WEICH;
  if (v.verblassen) c += PARTIKEL_VERBLASSEN;
  return c;
}

/** Rechenschritte (Einstiegspunkte), die es bei diesen Varianten gibt. */
export function eintritte(v: Varianten): { fluid: string[]; tracers: string[] } {
  const fluid = ['initVel', 'clear'];
  if (v.fluid) fluid.push('advect', 'curl', 'forces', 'divergence', 'jacobi', 'project', ...(v.jets ? ['zonalClear', 'zonalSum'] : []));
  const tracers = ['initDye', 'advectDye'];
  if (v.curl) tracers.push('flowField');
  if (v.partikel) tracers.push('moveParticles');
  if (v.weich) tracers.push('blurRelax');
  if (v.verblassen) tracers.push('blurFade');
  return { fluid, tracers };
}
