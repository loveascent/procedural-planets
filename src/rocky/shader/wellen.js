// Quellen (CREDITS.md): Cox & Munk (1954) für die Neigungsverteilung des Glitzerns (was unter ein Pixel fällt, wird Rauigkeit);
// Wellen als animiertes Gradientenrauschen (webgl-noise, Gustavson, siehe noise.js).

// Baustein Wellen: Neigung der Wasseroberfläche aus vier Oktaven animierten Rauschens. Einhängepunkt für scene.js: hook_wellen.
export const WELLEN = /* wgsl */`
struct WellenOut { gw: vec3f, varSub: f32, rau: f32 }
fn hook_wellen(d: vec3f, tm: f32, pix: f32, staerke: f32) -> WellenOut {
    var gw = vec3f(0.0);
    var varSub = 0.0;
    var f = 700.0;
    let sAmp = 0.05 * staerke;
    for (var i = 0; i < select(0, 4, staerke > 0.0); i++) {   // Modul Wellen: aus = Schleife läuft gar nicht
      // Wellen erst ab ~3 Pixeln Größe einzeln zeigen, kleinere gehen in die Rauigkeit (kein Pixel-Flackern)
      let fade = smoothstep(3.0, 8.0, 1.0 / (f * pix));
      if (fade > 0.0) {
        let gi = snoiseG(d * f + vec3f(tm * 0.21, tm * 0.13, -tm * 0.17) * (1.0 + f32(i) * 0.6) + f32(i) * 7.1).yzw;
        gw += (gi - d * dot(gi, d)) * (sAmp * fade * 0.6);
      }
      varSub += sAmp * sAmp * 0.36 * (1.0 - fade);
      f *= 2.13;
    }
    var o: WellenOut;
    o.gw = gw; o.varSub = varSub; o.rau = 0.003 * staerke;
    return o;
}
`;

// Wellen AUS: gleicher Einhängepunkt, kein Wellen-Code (keine Schleife, kein Rauschen). Wird statt WELLEN mitkompiliert.
export const WELLEN_AUS = /* wgsl */`
struct WellenOut { gw: vec3f, varSub: f32, rau: f32 }
fn hook_wellen(d: vec3f, tm: f32, pix: f32, staerke: f32) -> WellenOut { return WellenOut(vec3f(0.0), 0.0, 0.0); }
`;
