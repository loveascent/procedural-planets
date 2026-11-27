// Kachelgröße des Gelände-Netzes (Quadtree, Strugar, CDLOD 2009; siehe netz/netz.js).
// Kacheln pro Seite des Kachelgitters (Zellen); Shader und JS müssen denselben Wert nutzen
export const PATCH_G = 32;
// Kacheln je Zeichenaufruf: zwischen zwei Aufrufen kann die Grafikkarte unterbrechen, der Desktop bleibt bedienbar
export const HAPPEN = 128;
