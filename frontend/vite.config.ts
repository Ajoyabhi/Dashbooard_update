import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Enable detailed logging
    hmr: {
      overlay: true
    },
    // Log all requests
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    },
    port: 3002
  },
  // Enable source maps for better debugging
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000
  },
  // Enable detailed logging
  logLevel: 'info'
});
