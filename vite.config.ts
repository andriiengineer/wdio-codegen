import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'ui-src',
  build: {
    outDir: '../ui',
    emptyOutDir: true,
  },
});
