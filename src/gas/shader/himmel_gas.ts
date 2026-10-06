// Baustein Himmel hinter dem Gasriesen: gemeinsamer Himmel aus src/sky (Milchstraße, Sterne). Einhängepunkt: hook_himmel. Aus: schwarzer Hintergrund (SKY_DRAW_WGSL wird dann nicht mitkompiliert).
export const HIMMEL_GAS = /* wgsl */`
fn hook_himmel(dir: vec3f) -> vec3f { return skyColor(skyTex, samp, dir, U.p3.y, U.p3.z, U.p3.w, U.p4.x); }
`;

export const HIMMEL_GAS_AUS = /* wgsl */`
fn hook_himmel(dir: vec3f) -> vec3f { return vec3f(0.0); }
`;
