// Planeten-Shader aus Bausteinen zusammensetzen; ausgeschaltete Bausteine liefern ihre Aus-Variante (Stub).
import { PLANET_KOPF, PLANET_ENDE } from './planet.ts';
import { SAUM, SAUM_AUS } from './saum.ts';
import { SCHATTEN, SCHATTEN_AUS } from './schatten.ts';
import { LEBENDIG, LEBENDIG_AUS } from './lebendig.ts';

export interface PlanetBausteine { atmosphaere: boolean; finsternis: boolean; lebendig: boolean }

export function planetShader(b: PlanetBausteine): string {
  return PLANET_KOPF + (b.atmosphaere ? SAUM : SAUM_AUS) + (b.finsternis ? SCHATTEN : SCHATTEN_AUS) + (b.lebendig ? LEBENDIG : LEBENDIG_AUS) + PLANET_ENDE;
}
