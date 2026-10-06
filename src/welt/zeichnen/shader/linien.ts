// Bahnspuren: Linienliste, Farbe und Helligkeit je Stützpunkt (Alter blendet aus).
import { UNIFORMEN } from './gemeinsam.ts';

export const LINIEN = UNIFORMEN + /* wgsl */`
struct VIn { @location(0) p: vec3f, @location(1) c: vec4f };
struct VOut { @builtin(position) pos: vec4f, @location(0) c: vec4f };
@vertex fn vs(i: VIn) -> VOut { var o: VOut; o.pos = u.vp * vec4f(i.p, 1.0); o.c = i.c; return o; }
@fragment fn fs(i: VOut) -> @location(0) vec4f { return vec4f(i.c.rgb * i.c.a, 1.0); }
`;
