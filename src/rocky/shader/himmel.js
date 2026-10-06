// Quelle (CREDITS.md): Himmel aus src/sky/ (Milchstraße, Sterne; gemeinsam mit dem Gasriesen).
import { SKY_DRAW_WGSL } from '../../sky/sky';

// Baustein Himmel (Milchstraße, Sterne, Nebel). Einhängepunkt: hook_himmel.
export const HIMMEL = SKY_DRAW_WGSL + /* wgsl */`
fn hook_himmel(dir: vec3f, pix: f32, n: f32, neb: f32, stars: f32) -> vec3f { return skyColor(tNeb, samp, dir, pix, n, neb, stars); }
`;

// Himmel AUS: schwarzer Hintergrund, kein sky_stars/skyColor. Wird statt HIMMEL mitkompiliert.
export const HIMMEL_AUS = /* wgsl */`
fn hook_himmel(dir: vec3f, pix: f32, n: f32, neb: f32, stars: f32) -> vec3f { return vec3f(0.0); }
`;
