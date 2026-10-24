import { P, type Block } from '../typen';

// Baustein Furchen: parallele Rillenscharen. Ganymed („Sulci“): helle gerillte Bänder aus Dehnungsstörungen, ~10 km Abstand, in Polygone
// zerlegt. Phobos: Furchenfamilien, die wie parallele Schnitte um den Körper laufen und aus Kraterketten bestehen (Auswurf des Stickney-Einschlags).
// Verfahren: Phase φ = f·(⟨d,A⟩ + κ·Rauschen); Rücken = sin(2πφ). κ = Krümmung: 0 gibt exakt parallele Großkreise.
export const FURCHEN: Block = {
  id: 'furchen', de: 'Furchen (Sulci, Phobos-Rillen)', en: 'Grooves (sulci, Phobos grooves)', gruppe: 'eis', an: false,
  note: ['Scharen paralleler Rillen: gewölbte helle Bänder wie auf Ganymed oder gerade Kraterketten-Furchen wie auf Phobos.', 'Sets of parallel grooves: curved bright bands like on Ganymede or straight crater-chain grooves like on Phobos.'],
  par: [
    P('anteil', 'Anteil', 'Coverage', 0, 1, 0.01, 0.5, 'Welcher Teil der Oberfläche gerillt ist (Ganymed ~ 2/3, Phobos komplett).', 'What part of the surface is grooved (Ganymede ~ 2/3, Phobos all of it).'),
    P('frq', 'Rillenabstand', 'Groove spacing', 4, 140, 1, 38, 'Wellenzahl der Rillen: große Zahl = enge Rillen.', 'Wavenumber of the grooves: large = tight grooves.'),
    P('hoehe', 'Rillentiefe', 'Groove height', 0, 0.004, 0.0001, 0.0007, 'Höhe der Rücken (in Radien).', 'Height of the ridges (in radii).'),
    P('kruemmung', 'Krümmung', 'Curvature', 0, 3, 0.01, 1.1, '0 = exakt parallele Großkreise (Phobos), größer = gewundene Bänder (Ganymed).', '0 = exactly parallel great circles (Phobos), higher = winding bands (Ganymede).'),
    P('bruch', 'Kraterkette', 'Pit chain', 0, 1, 0.01, 0, 'Zerlegt die Rillen in aneinandergereihte Gruben (Phobos).', 'Breaks the grooves into strings of pits (Phobos).'),
    P('hell', 'Helligkeit', 'Brightness', 0, 1, 0.01, 0.4, 'Aufhellung der gerillten Bänder (frisches Eis).', 'Brightening of the grooved bands (fresh ice).'),
  ],
  wgsl: /* wgsl */`
fn h_furchen(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let sd = gseed();
  let A = sphPoint(hash33(vec3f(sd * 0.41 + 2.0, 6.0, 1.0)));
  let zn = fbmG(d * 2.3 + vec3f(sd * 0.13, 5.0, 9.0), 4, 0.5).x;
  let thr = 0.55 - 1.1 * $furchen_anteil;
  let zone = sstep(thr - 0.02, thr + 0.02, zn);
  (*s).aux.w = 0.0;
  if (zone <= 0.0) { return; }
  let kn = fbmG(d * 1.6 + vec3f(1.0, sd * 0.2, 4.0), 3, 0.5).x;
  let phase = $furchen_frq * (dot(d, A) + 0.07 * $furchen_kruemmung * kn);
  var rid = 0.5 + 0.5 * sin(6.2831853 * phase);
  rid = pow(rid, 1.6);
  if ($furchen_bruch > 0.0) {
    let pit = 0.5 + 0.5 * sin(6.2831853 * $furchen_frq * 3.1 * dot(d, normalize(cross(A, vec3f(0.3, 0.9, 0.2)))) + 8.0 * snoise(d * 9.0));
    rid *= mix(1.0, sstep(0.25, 0.75, pit), $furchen_bruch);
  }
  (*s).h += $furchen_hoehe * (rid - 0.4) * zone;
  (*s).aux.w = zone;
}
fn c_furchen(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  (*s).col *= 1.0 + $furchen_hell * (*s).aux.w * 0.8;
}
`,
  h: { furchen: 'h_furchen' },
  c: 'c_furchen', corder: 32,
};
