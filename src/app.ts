import { currentBody } from './shell';

// Eine Seite für alle Planetentypen. Welcher Körper läuft, steht in der Adresse (?body=rocky),
// jeder Typ ist ein eigenes Modul; Hülle, Menü und Himmel sind gemeinsam.
const body = currentBody();
for (const el of document.querySelectorAll<HTMLElement>('[data-body]')) if (!(el.dataset.body ?? '').split(',').includes(body)) el.remove();
if (body === 'rocky') { document.title = 'Procedural Planets'; import('./rocky/main.js' as string).then((m) => m.run()); }
else if (body === 'moon') { document.title = 'Mond'; import('./mond/main.ts' as string).then((m) => m.run()); }
else if (body === 'welt') { document.title = 'Sonnensystem'; import('./welt/main.ts' as string).then((m) => m.run()); }
else import('./main').then((m) => m.run());
