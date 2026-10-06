// Einheitskugel (Längen-/Breitengrad-Netz) als Vertex-/Indexpuffer.
export interface Netz { punkte: GPUBuffer; indizes: GPUBuffer; anzahl: number }

export function baueKugel(dev: GPUDevice, seg = 64, ring = 32): Netz {
  const v: number[] = [];
  for (let j = 0; j <= ring; j++) {
    const th = (j / ring) * Math.PI;
    for (let i = 0; i <= seg; i++) {
      const ph = (i / seg) * Math.PI * 2;
      v.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const punkte = dev.createBuffer({ size: v.length * 4, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
  new Float32Array(punkte.getMappedRange()).set(v); punkte.unmap();
  const indizes = dev.createBuffer({ size: idx.length * 4, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
  new Uint32Array(indizes.getMappedRange()).set(idx); indizes.unmap();
  return { punkte, indizes, anzahl: idx.length };
}
