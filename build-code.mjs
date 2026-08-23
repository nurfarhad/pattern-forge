// ─── Separate build script for the Figma main thread ────────────────────────
// The plugin main thread (code.ts) must be:
//   - A single self-contained IIFE file (no code splitting)
//   - No DOM APIs
//   - No React/JSX
//
// This is kept separate from the UI vite.config.ts because:
//   - viteSingleFile requires ESM output format
//   - Figma's sandbox requires IIFE format
//   - Mixing them in one Rollup output causes format conflicts
//
// Run: node build-code.mjs

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  configFile: false,
  resolve: {
    alias: {
      '@generator': path.resolve(__dirname, 'src/generator'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // UI build already ran; don't clobber ui.html
    lib: {
      entry: path.resolve(__dirname, 'src/main/code.ts'),
      name: 'code',
      fileName: 'code',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'code.js',
        inlineDynamicImports: true, // must be true for IIFE with no splitting
      },
    },
    target: 'es2017',
    minify: false,
  },
});

console.log('✓ code.js built');
