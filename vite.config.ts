import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import baseManifest from './manifest.json';

export default defineConfig(({ mode }) => {
  // Load all env vars from .env files for the current mode
  // The third arg '' loads everything (not just VITE_*)
  const env = loadEnv(mode, process.cwd(), '');

  // Example: inject env into the manifest (e.g., version, CSP, permissions)
  const manifest = {
    ...baseManifest,
    // Use an env var if provided, fallback to the JSON’s value
    version: env.VITE_EXT_VERSION ?? baseManifest.version,
    // Example for CSP override (optional)
    // content_security_policy: {
    //   extension_pages: env.VITE_CSP ?? "script-src 'self'; object-src 'self'"
    // }
  };

  return {
    plugins: [
      react(),
      crx({ manifest: manifest as any }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    define: {
      // Expose any non-VITE var as a compile-time constant
      // (access in code as __API_BASE__)
      VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      // Some libs still look at NODE_ENV
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      rollupOptions: {
        input: {
          popup: 'popup.html',
          sidepanel: 'sidepanel.html',
          settings: 'settings.html',
          onboarding: 'onboarding.html',
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: { port: 5173 },
    },
  };
});
