// Gras-Lauf auf der CPU-Seite: Puffer, Index-Puffer je Detailstufe, Rechen-Vorlauf (csGras) und die indirekten Zeichenaufrufe.
// Quelle: demos/gras/index.html (mkIB, ind-Puffer, drawIndexedIndirect), Shader: shader/gras.js.
import { GRAS_REIHEN, GRAS_GRENZEN } from '../shader/gras.js';
import { UO } from '../shader/udecl.js';

const SATZ = 24;   // Byte je Büschel (struct GZ und GR in gras.js)
// ext: { S, uData*, device*, L* }
export function createGrasLauf(ext) {
  let geraet = null, ib = null, args = null, bau = '', puffer = [], gruppeW = null, gruppeR = null, gen = 0, signatur = '', rechner = null, warUnruhig = false, nB = 0;
  const teile = [];   // je Stufe: { anzahl, erster }
  function indexPuffer() {
    const a = [];
    GRAS_REIHEN.forEach((reihen) => {
      const erster = a.length, je = 2 * reihen + 1;
      for (let halm = 0; halm < 4; halm++) {
        for (let r = 0; r < reihen; r++) {
          const q = halm * je + 2 * r;
          a.push(q, q + 1, q + 2);
          if (r < reihen - 1) a.push(q + 2, q + 1, q + 3);
        }
      }
      teile.push({ anzahl: a.length - erster, erster });
    });
    const b = ext.device.createBuffer({ size: (a.length * 2 + 3) & ~3, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
    new Uint16Array(b.getMappedRange()).set(a);
    b.unmap();
    return b;
  }
  // Je Bild vor fillUniforms: Listengrößen und Stempel in den Uniform-Block. halme = Halme je Feldkante (durch 4 teilbar),
  // stand = alles, wovon die gespeicherten Bodenhöhen abhängen, dazu die Fassung von csGras (neu übersetzt wird erst später als der Schalter
  // wirkt); unruhig, solange die Karten noch erzeugt werden – im ersten ruhigen Bild danach wird noch einmal neu gerechnet.
  function vorbereiten(halme, stand, pipeline, unruhig) {
    if (geraet !== ext.device) { geraet = ext.device; teile.length = 0; ib = indexPuffer(); bau = ''; args = ext.device.createBuffer({ size: 60, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST }); }
    nB = halme / 2;
    // Obergrenze je Stufe: Büschel im Kreis (Radius Grenze + 2 m) mit 25 % Reserve für die Verzerrung des Würfelgitters
    const kreis = (r) => Math.min(nB * nB, Math.ceil(Math.PI * (r + 2) ** 2 / (2 * ext.S.grasAbstand) ** 2 * 1.25) + 64);
    const platz = [kreis(GRAS_GRENZEN[0]), kreis(GRAS_GRENZEN[1]), nB * nB];
    const neu = nB + '|' + platz.join('|');
    if (neu !== bau) {
      bau = neu;
      puffer.forEach((p) => p.destroy());
      const speicher = ext.device.createBuffer({ size: nB * nB * SATZ, usage: GPUBufferUsage.STORAGE });
      const liste = ext.device.createBuffer({ size: 16 + SATZ * (platz[0] + platz[1] + platz[2]), usage: GPUBufferUsage.STORAGE });
      puffer = [speicher, liste];
      gruppeW = ext.device.createBindGroup({ layout: ext.L.grasW, entries: [[1, speicher], [2, liste], [3, args]].map(([binding, buffer]) => ({ binding, resource: { buffer } })) });
      gruppeR = ext.device.createBindGroup({ layout: ext.L.grasR, entries: [{ binding: 4, resource: { buffer: liste } }] });
      signatur = '';
    }
    if (stand !== signatur || pipeline !== rechner || unruhig || warUnruhig) gen = (gen + 1) % 0xffffff || 1;
    signatur = stand; rechner = pipeline; warUnruhig = unruhig;
    new Uint32Array(ext.uData.buffer, UO.Gk * 4, 4).set([...platz, gen]);
  }
  function waehlen(enc, pipeline, g0, gD) {
    ext.device.queue.writeBuffer(args, 0, new Uint32Array(teile.flatMap((t, st) => [t.anzahl, 0, t.erster, st * 65536, 0])));
    const cp = enc.beginComputePass();
    cp.setPipeline(pipeline);
    cp.setBindGroup(0, g0);
    cp.setBindGroup(1, gD);
    cp.setBindGroup(2, gruppeW);
    cp.dispatchWorkgroups(Math.ceil(nB * nB / 64));
    cp.end();
  }
  function zeichnen(sp, pipeline) {
    sp.setPipeline(pipeline);
    sp.setBindGroup(2, gruppeR);
    sp.setIndexBuffer(ib, 'uint16');
    teile.forEach((_, st) => sp.drawIndexedIndirect(args, st * 20));
  }
  return { vorbereiten, waehlen, zeichnen };
}
