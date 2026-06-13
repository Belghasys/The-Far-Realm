import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Non-VITE name kept for the @google/genai SDK's process.env.API_KEY fallback.
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // NOTE: all VITE_-prefixed vars are auto-exposed by Vite via import.meta.env,
      // which is exactly how the code reads them — so defining process.env.VITE_* was
      // redundant and has been removed.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'lucide-react'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            gemini: ['@google/genai']
          }
        }
      }
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    }

  };
});
