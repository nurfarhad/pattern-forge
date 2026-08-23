import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const uiRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: uiRoot,
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@generator': fileURLToPath(new URL('../generator', import.meta.url)),
      '@ui': uiRoot,
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../../dist-ui-preview', import.meta.url)),
    emptyOutDir: true,
  },
});
