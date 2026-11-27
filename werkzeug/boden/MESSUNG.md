# Messung Bodennähe: ms pro Bild unter GPU-Last

Stand 26.11.2026, Commit 886574c (Branch boden-zoom) gegen Referenz (alter Stand ohne Bodennähe).
Aufbau: headless Chrome, RTX 5080, Auflösung 2560x1440, Qualität 2 (Supersampling), Planet "rocky", Seed 12345678, Grasstelle (yaw −0,76, pitch −0,12).
Zahl = Median von 6 Ablesungen des Bildzählers je Lauf; in der Tabelle der Median aus 3 Läufen (Streuung der Läufe in Klammern).

| Stufe | Variante | ms (Frustum an) | ms (Frustum aus) | Läufe (an) |
|---|---|---|---|---|
| orbit | neu, Standard | 5,0 | 5,0 | 8,2 / 4,9 / 5,0 |
| nah-1,05 | neu, Standard | 12,2 | 11,1 | 15,1 / 10,9 / 12,2 |
| 10 km | neu, Standard | 12,8 | 10,1 | 17,0 / 12,8 / 10,1 |
| boden (1,7 m) | neu, Standard | 10,5 | 10,6 | 10,6 / 10,5 / 10,5 |
| orbit | neu, ohne Boden (`boden:false`) | 4,9 | 4,9 | 6,5 / 4,9 / 4,8 |
| nah-1,05 | neu, ohne Boden | 9,0 | 9,1 | 12,3 / 9,0 / 9,0 |
| orbit | Referenz (alter Stand) | 4,9 | 4,9 | 4,9 / 7,9 / 4,9 |
| nah-1,05 | Referenz (alter Stand) | 9,1 | 9,0 | 9,0 / 11,1 / 9,1 |
| boden | neu, ohne Nah-Oktaven (`nahOkt:false`) | 7,7 | 7,7 | 7,2 / 10,1 / 7,7 |
| boden | neu, ohne Gras (`gras:false`) | 9,4 | 9,4 | 9,4 / 9,8 / 9,2 |

Lesart (die Referenz kennt weder Boden noch Frustum, dort zählt nur die ms-Spalte):
- Ohne Bodenmodul (`boden:false`) liegt der neue Stand bei der Referenz (orbit 4,9 gegen 4,9; nah-1,05 9,0 gegen 9,1): der Umbau (umgekehrte Tiefe, RTC-Kacheln) kostet nichts messbar.
- Am Boden kosten die Nah-Oktaven rund 2,8 ms (10,5 → 7,7), das Gras rund 1,1 ms (10,5 → 9,4).
- Frustum-Culling zeigt bei dieser Last keinen sicheren Unterschied (Frustum an/aus innerhalb der Streuung, obwohl es 100 bis 400 Kacheln weglässt): die Last liegt bei Pixeln, nicht bei Kacheln.
- Die Ausreißer (erste Läufe, 15 bis 17 ms) kommen von anderer Last auf der Karte (ein zweiter Chrome auf derselben Karte); darum drei Läufe und Median.

## Methode (und warum nicht die einfache)

Der Seitenzähler misst Abstände von requestAnimationFrame. Ohne Gegendruck schickt die Seite Bilder schneller ab, als die Karte sie schafft (Warteschlange etwa 1 s tief); der Zähler hing dann bei 11,4 bis 11,8 ms, bei 1280x720 wie bei 3840x2160, also unabhängig von der Last. Außerdem zeichnet die Seite im Stillstand gar nicht neu. `werkzeug/boden/boden.py` macht deshalb zwei Dinge: (1) höchstens 3 Abgaben gleichzeitig offen (Abgabe zählt, `onSubmittedWorkDone` zählt zurück, sonst wird das nächste Bild verschoben), (2) ein unwirksamer Wert (`S.spin` bei ausgeschalteter Drehung) wechselt je Bild, damit die Stillstand-Erkennung jedes Bild zeichnen lässt. Aufruf:
`STUFEN=orbit,nah-1.05,10km,boden ANSICHT=2560x1440 QUAL=2 python werkzeug/boden/boden.py <URL> <Ordner> 12345678 '{"_yaw": -0.76, "_pitch": -0.12}'`
