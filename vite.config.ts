import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as any }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
        sidepanel: 'sidepanel.html',
        onboarding: 'onboarding.html',
      },
      output: {
        // Manual chunks for better caching and code splitting
        manualChunks: (id) => {
          // React vendor chunk (rarely changes, good for caching)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Supabase (API client)
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // Zustand (state management)
          if (id.includes('zustand')) {
            return 'store';
          }
          
          // Lucide icons (UI library)
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Offline services (loaded only when offline mode is used)
          if (
            id.includes('offlineStorage') ||
            id.includes('backgroundSync') ||
            id.includes('serviceWorkerCache')
          ) {
            return 'offline';
          }
          
          // Analytics (can be loaded lazily)
          if (id.includes('analytics')) {
            return 'analytics';
          }
          
          // Default: everything else goes into the main chunk
          return undefined;
        },
      },
    },
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
      mangle: true,
      format: {
        comments: false, // Remove comments
      },
    },
    sourcemap: false, // Disable source maps in production
    // Set chunk size warnings
    chunkSizeWarningLimit: 200, // 200KB warning threshold
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'zustand'],
  },
});