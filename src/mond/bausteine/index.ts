import type { Block } from '../typen';
import { FORM } from './form';
import { AEQUATOR } from './aequator';
import { GELAENDE } from './gelaende';
import { EINSCHLAEGE } from './einschlaege';
import { KRATER } from './krater';
import { MARIA } from './maria';
import { RILLEN } from './rillen';
import { DUENEN } from './duenen';
import { SEEN } from './seen';
import { EISRISSE } from './eisrisse';
import { CHAOS } from './chaos';
import { FURCHEN } from './furchen';
import { MELONE } from './melone';
import { KONVEKTION } from './konvektion';
import { VULKANE } from './vulkane';
import { LAVA } from './lava';
import { FONTAENEN } from './fontaenen';
import { REGOLITH } from './regolith';
import { EISFARBE } from './eisfarbe';
import { DICHOTOMIE } from './dichotomie';
import { THOLIN } from './tholin';
import { POLKAPPE } from './polkappe';
import { STREIFEN } from './streifen';
import { LUFT } from './luft';

// Alle Bausteine. Die Reihenfolge der Höhenstufen legt typen.ts (STUFEN) fest, die der Farbstufen das Feld corder; hier zählt sie nur für das Menü.
export const BAUSTEINE: Block[] = [FORM, AEQUATOR, GELAENDE, EINSCHLAEGE, KRATER, MARIA, RILLEN, DUENEN, SEEN, EISRISSE, CHAOS, FURCHEN, MELONE, KONVEKTION,
  VULKANE, LAVA, FONTAENEN, REGOLITH, EISFARBE, DICHOTOMIE, THOLIN, POLKAPPE, STREIFEN, LUFT];
