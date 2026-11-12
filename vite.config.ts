import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // ── UI build (default — what `vite build` and `vite serve` use) ──────────
  // Builds the React plugin panel, inlines all JS/CSS into ui.html.
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@generator': path.resolve(__dirname, 'src/generator'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@main': path.resolve(__dirname, 'src/main'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'ui.html'),
      output: {
        entryFileNames: 'ui.js',
        assetFileNames: 'ui.[ext]',
        chunkFileNames: 'ui-chunk.[hash].js',
      },
    },
    target: 'es2017',
    minify: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // inline everything (for viteSingleFile)
  },
});
