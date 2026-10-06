import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Welt-Schicht (welt.html) als eigene Einzeldatei; die Planeten-Seiten bleiben unberührt (vite.config.ts).
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022', outDir: 'dist-welt', emptyOutDir: true, rollupOptions: { input: 'welt.html' } },
});
