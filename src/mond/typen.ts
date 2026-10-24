// Typen der Mond-Bausteine. Jeder Baustein ist eine Datei in bausteine/: Regler, Erklärtexte und WGSL zusammen.
// Schaltet man einen Baustein aus, wird sein Shader-Code nicht einmal mitübersetzt.

export type Text = [string, string];

export interface Par {
  k: string;               // Schlüssel; im WGSL als $<baustein>_<k> benutzbar
  de: string; en: string;  // Beschriftung
  min: number; max: number; step: number; def: number;
  hint: Text;              // Erklärung: was ändert sich physikalisch
  fmt?: (v: number) => string;
}

/** Reihenfolge der Höhen-Stufen; ein Baustein hängt sich mit h[stufe] = Funktionsname ein. */
export const STUFEN = ['form', 'gelaende', 'aequator', 'becken', 'krater_alt', 'maria', 'krater_jung', 'rillen', 'eis', 'chaos', 'furchen', 'melone', 'konvektion', 'vulkane', 'duenen', 'seen', 'fein'] as const;
export type Stufe = typeof STUFEN[number];

export type Gruppe = 'form' | 'relief' | 'eis' | 'hitze' | 'farbe' | 'luft' | 'licht';

export interface Block {
  id: string;
  de: string; en: string;
  note: Text;
  gruppe: Gruppe;
  an: boolean;                         // Standard: an oder aus
  par: Par[];
  wgsl: string;                        // Funktionen des Bausteins (Bake- und Zeichen-Shader), $schluessel wird ersetzt
  h?: Partial<Record<Stufe, string>>;  // Höhenstufe: fn(s: ptr<function, Surf>, d: vec3f, pass: i32)
  c?: string;                          // Farbstufe: fn(s: ptr<function, Surf>, d: vec3f, g: vec3f)
  corder?: number;                     // Reihenfolge der Farbstufen (klein = früh); Standard 50, Grundfarbe 0
  r?: Record<string, string>;          // Hooks im Zeichen-Shader (siehe zeichnen.ts)
  nurZeichnen?: boolean;               // Baustein wirkt nur im Zeichen-Shader (Luft, Fontänen), nicht in der Karte
}

export type Wert = number | boolean | string;
export type Settings = Record<string, Wert>;

export const P = (k: string, de: string, en: string, min: number, max: number, step: number, def: number, hde: string, hen: string, fmt?: (v: number) => string): Par =>
  ({ k, de, en, min, max, step, def, hint: [hde, hen], fmt });
