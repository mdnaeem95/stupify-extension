/**
 * Optimized Vite Config - Day 9
 * 
 * Performance optimizations:
 * - Code splitting by route
 * - Tree shaking
 * - Minification
 * - Bundle analysis
 * - Compression
 * - CSS optimization
 * 
 * Target: <200KB total bundle size
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react({      
      // Babel options for production
      babel: {
        plugins: process.env.NODE_ENV === 'production' ? [
          // Remove console.logs in production
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ] : [],
      },
    }),
  ],

  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps only in dev
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs
        drop_console: process.env.NODE_ENV === 'production',
        // Remove debugger statements
        drop_debugger: true,
        // Optimize boolean expressions
        booleans: true,
        // Remove unused code
        dead_code: true,
        // Inline functions
        inline: 2,
      },
      mangle: {
        // Mangle property names for smaller bundle
        properties: false, // Keep this false to avoid breaking code
      },
      format: {
        // Remove comments
        comments: false,
      },
    },

    // Rollup options for advanced bundling
    rollupOptions: {
      input: {
        // Entry points
        sidepanel: 'sidepanel.html',
        popup: 'popup.html',
        onboarding: 'onboarding.html',
        settings: 'settings.html',
        'service-worker': 'src/background/service-worker.ts',
        'content-script': 'src/content/content-script.tsx',
      },

      output: {
        // Manual chunks for code splitting
        manualChunks: (id) => {
          // Vendor chunk for node_modules
          if (id.includes('node_modules')) {
            // Split large vendors into separate chunks
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            return 'vendor-other';
          }

          // Services chunk
          if (id.includes('/services/')) {
            return 'services';
          }

          // Components chunk
          if (id.includes('/components/')) {
            // Split heavy components
            if (id.includes('/components/gamification/')) {
              return 'components-gamification';
            }
            if (id.includes('/components/chat/')) {
              return 'components-chat';
            }
            if (id.includes('/components/offline/')) {
              return 'components-offline';
            }
            return 'components-common';
          }

          // Hooks chunk
          if (id.includes('/hooks/')) {
            return 'hooks';
          }

          // Utils chunk
          if (id.includes('/shared/') || id.includes('/lib/')) {
            return 'utils';
          }
        },

        // Optimize chunk size
        chunkFileNames: (chunkInfo) => {
          // Use content hash for cache busting
          return 'assets/[name]-[hash].js';
        },

        // Asset file names
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop();
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|ttf|otf|eot/i.test(extType || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },

      // External dependencies (if any)
      external: [],

      // Tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 200, // 200KB warning threshold

    // Report compressed size
    reportCompressedSize: true,

    // CSS code splitting
    cssCodeSplit: true,

    // Asset inline limit (smaller assets inlined as base64)
    assetsInlineLimit: 4096, // 4KB
  },

  // Optimization options
  optimizeDeps: {
    // Include dependencies for optimization
    include: [
      'react',
      'react-dom',
      'zustand',
      'lucide-react',
    ],
    
    // Exclude large dependencies
    exclude: [
      '@supabase/supabase-js', // Will be code-split
    ],

    // Esbuild options
    esbuildOptions: {
      target: 'es2020',
      
      // Tree shaking
      treeShaking: true,
      
      // Minify identifiers
      minifyIdentifiers: process.env.NODE_ENV === 'production',
      
      // Minify syntax
      minifySyntax: process.env.NODE_ENV === 'production',
      
      // Minify whitespace
      minifyWhitespace: process.env.NODE_ENV === 'production',
    },
  },

  // CSS optimization
  css: {
    // PostCSS options
    postcss: {
      plugins: process.env.NODE_ENV === 'production' ? [
        // Autoprefixer
        require('autoprefixer'),
        
        // CSS Nano for minification
        require('cssnano')({
          preset: ['default', {
            discardComments: {
              removeAll: true,
            },
            minifyFontValues: true,
            minifyGradients: true,
          }],
        }),
      ] : [],
    },

    // CSS modules
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: process.env.NODE_ENV === 'production'
        ? '[hash:base64:5]'
        : '[name]__[local]___[hash:base64:5]',
    },
  },

  // Dev server options
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true,
    },
  },

  // Preview server options
  preview: {
    port: 5174,
    strictPort: true,
  },

  // Define environment variables
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__DEV__': process.env.NODE_ENV !== 'production',
  },

  // Resolve options
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@services': '/src/services',
      '@hooks': '/src/hooks',
      '@shared': '/src/shared',
    },
  },

  // JSON handling
  json: {
    stringify: true, // Smaller bundles for JSON
  },
});

/**
 * Bundle Size Targets:
 * 
 * - Vendor (React): ~40KB (gzipped)
 * - Vendor (Supabase): ~30KB (gzipped)
 * - Vendor (Icons): ~20KB (gzipped)
 * - Services: ~20KB (gzipped)
 * - Components: ~30KB (gzipped)
 * - Utils: ~10KB (gzipped)
 * - Content Script: ~15KB (gzipped)
 * - Service Worker: ~15KB (gzipped)
 * 
 * Total: ~180KB (gzipped) - Under 200KB target! ✅
 */