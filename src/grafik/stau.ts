// Rückstau-Bremse für alle Bildschleifen (Gasriese, Gesteinsplanet, Welt): höchstens 2 Bilder gleichzeitig bei der Grafikkarte,
// bei schweren Bildern nur 1. Ohne Grenze nimmt der Browser jede Abgabe an, die Warteschlange wächst, und teilt sich der Desktop die
// Karte (Monitor an der iGPU), ruckelt der ganze Rechner. Fertig-Meldung: GPUQueue.onSubmittedWorkDone (MDN). Bei einem Bild je
// Abgabe entsteht nach jedem schweren Bild eine Lücke, in der die Karte anderes zeichnen kann.
const SCHWER_MS = 40;   // ab hier (unter 25 Bildern je Sekunde) nur noch ein Bild unterwegs

export function rueckstau() {
  let offen = 0, dauer = 0;
  return {
    voll: () => offen >= (dauer > SCHWER_MS ? 1 : 2),
    abgegeben(queue: GPUQueue) {
      const start = performance.now(), vorher = offen++;
      const fertig = () => { offen--; dauer = (performance.now() - start) / (vorher + 1); };   // Wartezeit auf frühere Bilder herausrechnen
      queue.onSubmittedWorkDone().then(fertig, fertig);
    },
  };
}
