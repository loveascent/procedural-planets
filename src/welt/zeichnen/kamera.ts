// Bahnkamera um ein Ziel (Körper oder freier Punkt); Positionen in Float64, an die GPU gehen nur kamerarelative Werte.
import { lookAt, multiply, perspective, type Mat4, type Vec3 } from '../../math.ts';
import type { V3 } from '../physik/koerper.ts';

export class Kamera {
  gier = 0.6;
  neigung = 0.35;
  /** Abstand zum Ziel */
  abstand = 1400;
  ziel: V3 = [0, 0, 0];
  /** Übergangsversatz, klingt nach einem Fokuswechsel ab (weicher Kameraflug) */
  versatz: V3 = [0, 0, 0];
  fov = 0.9;

  auge(): V3 {
    const cp = Math.cos(this.neigung), sp = Math.sin(this.neigung);
    return [
      this.ziel[0] + this.versatz[0] + Math.sin(this.gier) * cp * this.abstand,
      this.ziel[1] + this.versatz[1] + sp * this.abstand,
      this.ziel[2] + this.versatz[2] + Math.cos(this.gier) * cp * this.abstand,
    ];
  }
  /** Zieht das Ziel auf `neu` und klingt den Sprung als Versatz ab (kein Ruck bei Fokuswechsel). */
  setzeZiel(neu: V3, weich: boolean) {
    if (weich) for (let k = 0; k < 3; k++) this.versatz[k] += this.ziel[k] - neu[k];
    this.ziel = [neu[0], neu[1], neu[2]];
  }
  abklingen(dt: number) {
    const f = Math.exp(-dt * 4);
    for (let k = 0; k < 3; k++) this.versatz[k] *= f;
  }
  basis() {
    const a = this.auge();
    const z: Vec3 = [this.ziel[0] + this.versatz[0] - a[0], this.ziel[1] + this.versatz[1] - a[1], this.ziel[2] + this.versatz[2] - a[2]];
    const l = Math.hypot(z[0], z[1], z[2]) || 1;
    const vor: Vec3 = [z[0] / l, z[1] / l, z[2] / l];
    let rechts: Vec3 = [vor[1] * 0 - vor[2] * 1, vor[2] * 0 - vor[0] * 0, vor[0] * 1 - vor[1] * 0]; // vor × (0,1,0)
    const rl = Math.hypot(rechts[0], rechts[1], rechts[2]) || 1; rechts = [rechts[0] / rl, rechts[1] / rl, rechts[2] / rl];
    const oben: Vec3 = [rechts[1] * vor[2] - rechts[2] * vor[1], rechts[2] * vor[0] - rechts[0] * vor[2], rechts[0] * vor[1] - rechts[1] * vor[0]];
    return { auge: a, vor, rechts, oben };
  }
  /** Projektion × Ansicht (Ansicht ohne Verschiebung: Alles ist kamerarelativ). */
  matrix(seitenverhaeltnis: number, naheKoerperAbstand: number): { vp: Mat4; nah: number } {
    const nah = Math.max(0.004, Math.min(2, naheKoerperAbstand * 0.02));
    const { vor } = this.basis();
    const ansicht = lookAt([0, 0, 0], vor, [0, 1, 0]);
    return { vp: multiply(perspective(this.fov, seitenverhaeltnis, nah, 60000), ansicht), nah };
  }
}
