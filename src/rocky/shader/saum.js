// Quelle: Verfahren aus src/shaders/render.wgsl (Gasriese dieses Projekts), siehe Kommentar im Shader.
// Baustein Saum wie Gasriese (Randschimmer und Saum außerhalb). Einhängepunkt für post.js: hook_saum.
export const SAUM = /* wgsl */`
fn hook_saum(col0: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f) -> vec3f {
  var col = col0;
  // Modul „Saum wie Gasriese“ (aus src/shaders/render.wgsl übernommen): Saum außerhalb, Schimmer am Rand
  if (U.Gr.w > 0.0) {
    let dg0 = b * b - (c2 - 1.0);
    if (dg0 <= 0.0 || -b - sqrt(max(dg0, 0.0)) < 0.0) {
      let tc = max(-b, 0.0);
      let cp = cam + dir * tc;
      let hh = length(cp) - 1.0;
      let lit = smoothstep(-0.3, 0.4, dot(normalize(cp), sun));
      col += U.Gr.rgb * exp(-max(hh, 0.0) / 0.025) * U.Gr.w * lit * 1.7;
    } else {
      let nn = normalize(cam + dir * (-b - sqrt(dg0)));
      let ndv = max(dot(nn, -dir), 1e-3);
      let rim = pow(1.0 - ndv, 3.0) * U.Gr.w * smoothstep(-0.2, 0.3, dot(nn, sun));
      col += U.Gr.rgb * rim * 1.7;
    }
  }
  return col;
}
`;

// Saum AUS: Bild bleibt. Wird statt SAUM mitkompiliert (Standard: aus).
export const SAUM_AUS = /* wgsl */`
fn hook_saum(col0: vec3f, cam: vec3f, dir: vec3f, b: f32, c2: f32, sun: vec3f) -> vec3f { return col0; }
`;
