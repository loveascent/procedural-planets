// Quellen (CREDITS.md): Walter et al. 2007 (GGX), Cox & Munk 1954 (Glitzern), Pope & Fry 1997 (Wasser), Bruneton/Hillaire (Luft), Henyey–Greenstein (Wolken), Priority-Flood/Abfluss siehe fluesse/fluesse.js.
// Die Szene ist die Summe ihrer Teile (Eckpunkt-Stufen, Hilfen, Planetenoberfläche, Hintergrund); alle Zusätze hängen an hook_*.
import { SCENE_VERTEX } from './scene_vertex.js';
import { SCENE_HILFEN } from './scene_hilfen.js';
import { SCENE_PLANET } from './scene_planet.js';
import { SCENE_HINTERGRUND } from './scene_hintergrund.js';

export const SCENE = SCENE_VERTEX + SCENE_HILFEN + SCENE_PLANET + SCENE_HINTERGRUND;
