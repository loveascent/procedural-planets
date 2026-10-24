import { P, type Block } from '../typen';

// Baustein Form: Ellipsoid und grobe Beulen. Große Monde sind Kugeln (Schwerkraft rundet sie), kleine nicht (Phobos, Hyperion).
// r(d) = 1 / |(dx/a, dy/b, dz/c)| ist der Radius des Ellipsoids in Richtung d; die Halbachsen werden auf mittleren Radius 1 normiert.
export const FORM: Block = {
  id: 'form', de: 'Form (Ellipsoid, Beulen)', en: 'Shape (ellipsoid, lumps)', gruppe: 'form', an: true,
  note: ['Kugel, Ellipsoid oder Kartoffel. Aus der Form folgt die Silhouette; Krater und Gelände sitzen darauf.', 'Sphere, ellipsoid or potato. The silhouette follows from the shape; craters and terrain sit on it.'],
  par: [
    P('b', 'Achse Pol (y)', 'Polar axis (y)', 0.5, 1.2, 0.01, 1, 'Halbachse entlang der Drehachse relativ zur Äquatorachse. 1 = rund; unter 1 = abgeplattet (schnelle Drehung); große Gezeitenmonde sind zur Achse zum Planeten gestreckt.', 'Semi-axis along the spin axis relative to the equatorial axis. 1 = round; below 1 = oblate (fast spin); tidal moons are stretched towards their planet.'),
    P('c', 'Achse z', 'Axis z', 0.5, 1.2, 0.01, 1, 'Dritte Halbachse. Zusammen mit den anderen beiden ergibt sich ein Dreiachsen-Ellipsoid wie bei Phobos (1,0 : 0,82 : 0,72).', 'Third semi-axis. Together with the other two this gives a triaxial ellipsoid like Phobos (1.0 : 0.82 : 0.72).'),
    P('beulen', 'Beulen', 'Lumps', 0, 0.35, 0.005, 0, 'Amplitude der groben Verformung (Rauschen mit wenigen Wellenlängen auf dem Umfang), in Radien. Kleine Körper sind unregelmäßig, weil ihre Schwerkraft die Form nicht ausgleicht.', 'Amplitude of the coarse deformation (noise with few wavelengths around the circumference), in radii. Small bodies are irregular because their gravity cannot relax the shape.'),
    P('wellen', 'Beulen-Frequenz', 'Lump frequency', 0.4, 3, 0.05, 1.1, 'Wie viele Beulen auf den Umfang passen. Niedrig = ein, zwei große Wülste; hoch = knubbelig.', 'How many lumps fit around the circumference. Low = one or two big bulges; high = knobbly.'),
    P('kanten', 'Kantigkeit', 'Angularity', 0, 1, 0.01, 0, 'Mischt Grat-Rauschen in die Beulen: flache Facetten und Kanten statt weicher Hügel (wie ein zerbrochener Trümmerkörper).', 'Mixes ridged noise into the lumps: flat facets and edges instead of soft hills (like a shattered rubble body).'),
  ],
  wgsl: /* wgsl */`
fn h_form(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let ax = vec3f(1.0, $form_b, $form_c);
  let gm = pow(ax.x * ax.y * ax.z, 1.0 / 3.0);
  var r = 1.0 / length(d / ax) / gm;
  if ($form_beulen > 0.0) {
    let p = d * $form_wellen + vec3f(gseed() * 0.113, 1.7, 4.2);
    let n = fbmG(p, 3, 0.5).x;
    let rg = ridgeN(p * 0.8 + 3.0, 3) - 0.5;
    r += $form_beulen * mix(n, rg * 1.6, $form_kanten);
  }
  (*s).h += r - 1.0;
  (*s).form += r - 1.0;
}
`,
  h: { form: 'h_form' },
};
