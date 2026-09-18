import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
      cssTarget: ['safari14', 'chrome87', 'firefox78', 'edge88'],
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Keep hashed asset filenames URL-safe (no spaces).
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          manualChunks(id) {
            if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers') || id.includes('rollupPluginBabelHelpers')) {
              return 'vendor';
            }
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfjs') || id.includes('react-pdf')) return 'pdf';
              if (id.includes('xlsx')) return 'excel';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('lucide-react')) return 'icons';
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'https://notify-app-bz8q.onrender.com',
          changeOrigin: true,
          secure: false,
          // Needed for the realtime chat socket at /api/v1/ws
          ws: true,
        },
      },
    },
  };
});
