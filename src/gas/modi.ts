// Gewählte Rechenart (Strömung), Darstellung und Drehrichtung.
import type { App } from './app';

/** Strömung und Darstellung, die die gewählte Schiene tatsächlich benutzt. */
export function flowMode(_a: App): 'fluid' | 'curl' {
return _a.S.flow as 'fluid' | 'curl';
}

export function lookMode(_a: App): 'dye' | 'particles' | 'pure' {
return _a.S.look as 'dye' | 'particles' | 'pure';
}

export function dir(_a: App): number {
return _a.S.retro ? -1 : 1;
}
