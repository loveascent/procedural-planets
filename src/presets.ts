// Planeten als Parameter, keine Bilder.
// Windprofile: [Breite in Grad, zonaler Wind in m/s], grob nach Voyager/Cassini/Hubble-Messungen
// (Jupiter: Porco et al. 2003, Tollefson et al. 2017; Saturn: Garcia-Melendo et al. 2011;
//  Uranus/Neptun: Sromovsky et al. 1993/2015). Für die Darstellung wird das Profil auf
// seinen Spitzenwert normiert; der Regler "Jet-Stärke" setzt die sichtbare Geschwindigkeit.

import { JUPITER } from './vorlagen/jupiter';
import { SATURN } from './vorlagen/saturn';
import { NEPTUN } from './vorlagen/neptun';
import { URANUS } from './vorlagen/uranus';
import { HEISSER_JUPITER } from './vorlagen/heisser_jupiter';

export type { Storm, Preset, Facts } from './vorlagen/typen';
export { hexToLinear } from './vorlagen/farben';
export { TABLE, windTable, bandTable } from './vorlagen/tabellen';
export { bandsFromImage } from './vorlagen/bild';
export { newSeed, randomPreset } from './vorlagen/zufall';
export type { RandomOptions } from './vorlagen/zufall';

import type { Preset } from './vorlagen/typen';
export const presets: Preset[] = [JUPITER, SATURN, NEPTUN, URANUS, HEISSER_JUPITER];
