/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — сборка открывается и с GitHub Pages (подпуть /plenka/), и с любого статического хостинга
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1500 }, // heic2any (1,3 МБ) грузится лениво, только для HEIC
  test: { environment: 'jsdom', setupFiles: ['tests/setup.ts'] }
});
