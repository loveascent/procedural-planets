import { clamp } from '../logik/zufall.js';
import { norm, cross, dot, mal3 } from '../logik/genau.js';

// Spielball in Bodennähe (Bedienung: WASD, Leertaste, Umschalt; B schaltet ein/aus; Maus ziehen = Kurs, Rad = Abstand).
// Alles in double auf der CPU, im Planetenraum (der Ball steht auf dem Planeten, die Planetendrehung trägt ihn mit):
//   p = Richtung (Einheitsvektor), fw = Kurs (Einheitsvektor in der Tangentialebene bei p, „vorn“ der Kamera), h = Höhe des Ballbodens über
//   dem Gelände (m), vy = senkrechte Geschwindigkeit (m/s), R = Ausrichtung Ball → Planetenraum (3×3, spaltenweise; daraus der Rollwinkel).
// Bewegung: Drehung von p um die Achse a = p × m (m = Bewegungsrichtung in der Tangentialebene) um den Winkel Strecke / Radius (Meter),
// Rodrigues-Formel; fw wird mit gedreht (Paralleltransport entlang des Großkreises). Rollen: Ball dreht um up × m um Strecke / Ballradius
// (Rollen ohne Rutschen: v = ω × r). Sprung 5 m/s, g = 9,81 m/s². Gelände und Wasser unter dem Ball kommen aus csBoden (BODEN.ball*, ein Bild Verzug).
export const SP = {
  aktiv: false, p: [0, 0, 1], fw: [1, 0, 0], h: 0, vy: 0, R: [1, 0, 0, 0, 1, 0, 0, 0, 1], roll: 0, strecke: 0, imWasser: false, schwimmt: 0,
  abstand: 5, elev: 0.4, radius: 0.5, tasten: {}, boden: true,
};
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
// Rodrigues: v um die Einheitsachse a um den Winkel w drehen
function dreh(v, a, w) {
  const c = Math.cos(w), s = Math.sin(w), ad = dot(a, v), x = cross(a, v);
  return [v[0] * c + x[0] * s + a[0] * ad * (1 - c), v[1] * c + x[1] * s + a[1] * ad * (1 - c), v[2] * c + x[2] * s + a[2] * ad * (1 - c)];
}
const tangent = (v, p) => norm(add(v, p, -dot(v, p)));
function ausrichten(R) {   // Gram-Schmidt, gegen schleichende Rundung
  const a = norm(R.slice(0, 3)), b = norm(add(R.slice(3, 6), a, -dot(R.slice(3, 6), a)));
  const c = cross(a, b);
  return [...a, ...b, ...c];
}
// Ball auf das Gelände unter der Kamera setzen. eHat: Kamerarichtung im Planetenraum, hd: Blickrichtung waagerecht (Planetenraum)
export function spielerStart(S, eHat, hd, BODEN) {
  SP.p = eHat.slice();
  SP.fw = tangent(hd, SP.p);
  SP.h = 0; SP.vy = 0; SP.imWasser = false; SP.aktiv = true; SP.strecke = 0;
  BODEN.ballGueltig = false; BODEN.ballH = BODEN.gueltig ? BODEN.h : 0;
}
export function spielerSchritt(S, dt, BODEN, zeit) {
  if (!(S.spieler && S.boden)) { SP.aktiv = false; return; }
  if (!SP.aktiv) return;   // wird beim Zeichnen gesetzt (braucht die Kamera)
  const Rm = S.radiusKm * 1000, T = SP.tasten;
  const wasser = BODEN.ballGueltig && BODEN.ballWasser;
  SP.imWasser = wasser;
  // Bewegung relativ zum Kurs: vorn = fw, links = p × fw
  const links = cross(SP.p, SP.fw);
  const z = (T.KeyW ? 1 : 0) - (T.KeyS ? 1 : 0), x = (T.KeyA ? 1 : 0) - (T.KeyD ? 1 : 0);
  let ds = 0;
  if (z || x) {
    const m = norm([SP.fw[0] * z + links[0] * x, SP.fw[1] * z + links[1] * x, SP.fw[2] * z + links[2] * x]);
    ds = ((T.ShiftLeft || T.ShiftRight) ? 12 : 6) * (wasser ? 0.5 : 1) * dt;
    const ang = ds / Rm, a = norm(cross(SP.p, m));
    SP.p = norm(dreh(SP.p, a, ang)); SP.fw = tangent(dreh(SP.fw, a, ang), SP.p);
    const w = ds / SP.radius;
    SP.R = ausrichten([0, 3, 6].flatMap((i) => dreh(SP.R.slice(i, i + 3), a, w)));
    SP.roll += w; SP.strecke += ds;
  }
  // senkrecht: Wasser = schwimmen (Mitte auf Meereshöhe, halb eingetaucht, Auf und Ab 0,1 m), sonst Schwerkraft
  if (wasser) {
    const ziel = -SP.radius + Math.sin(zeit * 2.2) * 0.1;
    SP.h += (ziel - SP.h) * Math.min(1, dt * 8); SP.vy = 0;
  } else {
    if (T.Space && SP.h <= 1e-4 && SP.vy <= 0) SP.vy = 5;
    SP.h += SP.vy * dt; SP.vy -= 9.81 * dt;
    if (SP.h <= 0) { SP.h = 0; SP.vy = 0; }
  }
}
// Kamera 3. Person: Auge hinter und über dem Ball, Blick zum Ball. M64 = Planetenraum → Welt. Rückgabe in Weltkoordinaten (Radien).
export function spielerKamera(S, BODEN, M64) {
  const Rm = S.radiusKm * 1000;
  const bodenB = BODEN.ballGueltig ? BODEN.ballH : (BODEN.gueltig ? BODEN.h : 0);
  const C = SP.p.map((v) => v * (1 + bodenB + (SP.h + SP.radius) / Rm));           // Ballmitte (Planetenraum)
  const D = SP.abstand;
  let E = add(add(C, SP.fw, -D / Rm), SP.p, SP.elev * D / Rm);
  // Auge nie unter den Boden: mindestens 0,5 m über der Bodenhöhe am Ball und unter der Kamera
  const minR = 1 + Math.max(bodenB, BODEN.gueltig ? BODEN.h : 0) + 0.5 / Rm;
  const rE = Math.hypot(E[0], E[1], E[2]);
  if (rE < minR) E = E.map((v) => v * minR / rE);
  const eyeW = mal3(M64, E), CW = mal3(M64, C);
  const dir = norm([CW[0] - eyeW[0], CW[1] - eyeW[1], CW[2] - eyeW[2]]);
  const oben = mal3(M64, norm(E));
  return { eye: eyeW, mitte: CW, dir, oben, C };
}
export function spielerMaus(dx, dy) {
  SP.fw = tangent(dreh(SP.fw, SP.p, -dx * 0.005), SP.p);   // nach rechts ziehen = nach rechts drehen (Mausblick)
  SP.elev = clamp(SP.elev + dy * 0.004, 0.03, 2.5);
}
export function spielerRad(deltaY) { SP.abstand = clamp(SP.abstand * Math.exp(deltaY * 0.0012), 2, 20); }
// Tasten: gedrückt halten; B schaltet ein/aus (nur in Bodennähe). nachUmschalten: Menü auffrischen
export function tastenAnschliessen(S, nachUmschalten) {
  const eingabe = (e) => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || '');
  window.addEventListener('keydown', (e) => {
    if (eingabe(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyB' && !e.repeat && S.boden) { S.spieler = !S.spieler; nachUmschalten(); return; }
    if (!S.spieler) return;
    if (/^(KeyW|KeyA|KeyS|KeyD|Space|ShiftLeft|ShiftRight)$/.test(e.code)) { SP.tasten[e.code] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (e.code in SP.tasten) { SP.tasten[e.code] = false; if (S.spieler) e.preventDefault(); } });
  window.addEventListener('blur', () => { SP.tasten = {}; });
}
