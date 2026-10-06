// Quellen (CREDITS.md): colordodge ProceduralPlanet (Höhe/Feuchte aus gemischten fBm-Feldern, WTFPL); Musgrave, Texturing & Modeling (1994) für Grate; Clay John (2021) und Fewes (2023) für Erosionsrinnen (neu auf der Kugel umgesetzt).
import { JDECL } from './jdecl.js';


// ---------------------------------------------------------------- Karten: Höhe, Feuchte, Gradient (Compute)
// a = Höhe (res1, res2, resMix, mixScale), b = (Typ H, Seed H, Typ F, Seed F), c = Feuchte, d = Erosion,
// e = Gebirge (Höhe, Gürtelfrequenz, Grat-Startfrequenz, fBm-Rest), f = (Modus, Erosions-Oktaven, Meeresspiegel, -)
import { KARTE_FELD } from './karte_feld.js';
import { KARTE_HAUPT } from './karte_haupt.js';

// Karten: Höhe, Feuchte, Gradient (Compute) = Parameter-Layout + Grundfelder + Einstieg.
export const GEN = JDECL + KARTE_FELD + KARTE_HAUPT;
