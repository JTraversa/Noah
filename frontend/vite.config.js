import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Stub out optional dependencies that aren't needed
      'porto/internal': path.resolve(__dirname, 'src/stubs/porto.js'),
      'porto': path.resolve(__dirname, 'src/stubs/porto.js'),
    }
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
});
