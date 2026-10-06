import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The function form is needed because the prerenderer's SSR build must not
// inherit the client chunking rules: in SSR mode react and react-dom are
// external (resolved from node_modules at runtime), and manualChunks cannot
// group a module Rollup never bundles.
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: isSsrBuild
        ? undefined
        : {
            // Keep the framework in its own long-lived chunk so a content-only
            // deploy (pages, copy, images) does not invalidate React's cache.
            manualChunks: {
              react: ['react', 'react-dom', 'react-router-dom'],
              icons: ['lucide-react'],
            },
          },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));
