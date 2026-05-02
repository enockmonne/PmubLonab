import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path: when served by FastAPI, this is mounted at /api/admin-ui/
  // Override with VITE_BASE=/ for standalone deployment (Vercel, Netlify, etc.)
  base: process.env.VITE_BASE ?? '/api/admin-ui/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
