// Kamera einer eingebetteten Instanz in Planeteneinheiten (Radius 1, Mittelpunkt im Ursprung), eigene Nah-/Fernebene.
// Die Matrix der Welt-Kamera hat ein Tiefenverhältnis von Millionen; ihre Umkehrung ist nahe am Planeten unbrauchbar (schwarze Bilder, Flackern).
import { invert, lookAt, multiply, perspective, type Mat4, type Vec3 } from '../../math.ts';
import type { V3 } from '../physik/koerper.ts';

export interface InstanzKamera { auge: V3; vp: Mat4; invVP: Mat4 }

export function instanzKamera(c: V3, R: number, vor: V3, oben: V3, fov: number, aspekt: number): InstanzKamera {
  const auge: V3 = [-c[0] / R, -c[1] / R, -c[2] / R];
  const dist = Math.hypot(auge[0], auge[1], auge[2]);
  const nah = Math.max(0.0008, (dist - 1.05) * 0.5), fern = dist + 8;
  const ziel: Vec3 = [auge[0] + vor[0], auge[1] + vor[1], auge[2] + vor[2]];
  const vp = multiply(perspective(fov, aspekt, nah, fern), lookAt(auge, ziel, oben));
  return { auge, vp, invVP: invert(vp) };
}
