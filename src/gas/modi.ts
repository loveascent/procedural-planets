// Gewählte Rechenart (Strömung), Darstellung und Drehrichtung.
import type { App } from './app';
import { S } from './zustand';

/** Strömung und Darstellung, die die gewählte Schiene tatsächlich benutzt. */
export function flowMode(_a: App): 'fluid' | 'curl' {
return S.flow as 'fluid' | 'curl';
}

export function lookMode(_a: App): 'dye' | 'particles' | 'pure' {
return S.look as 'dye' | 'particles' | 'pure';
}

export function dir(_a: App): number {
return S.retro ? -1 : 1;
}
