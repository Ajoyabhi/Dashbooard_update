import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    server: {
      // Enable detailed logging
      hmr: {
        overlay: true
      },
      // Log all requests
      proxy: {
        '/api': {
          target: 'http://localhost:3005',
          changeOrigin: true,
          secure: false
        }
      },
      port: 3005
    },
    build: {
      // Never ship source maps to production — they expose the full frontend
      // source in the browser devtools. Keep them in dev builds for debugging.
      sourcemap: !isProd,
      chunkSizeWarningLimit: 2000
    },
    // Strip ALL console.* calls and debugger statements from the production
    // bundle so nothing leaks into the merchant's browser console. Left intact
    // in dev so local debugging still works.
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : []
    },
    // Enable detailed logging
    logLevel: 'info'
  };
});
