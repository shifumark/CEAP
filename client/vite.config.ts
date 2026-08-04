import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this app from /CEAP/, not the domain root —
  // every asset URL needs this prefix in production.
  base: '/CEAP/',
  plugins: [react()],
  build: {
    // The repo is already public, so this doesn't expose anything the
    // source tree on GitHub doesn't already — it just means a production
    // stack trace (browser console, or an error-monitoring tool if one
    // gets added later) resolves to real file/line instead of minified
    // gibberish, which cost real time to decode by hand debugging the
    // My Application crash earlier in this project's life.
    sourcemap: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});
