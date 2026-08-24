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
    // Deux suites, volontairement séparées.
    //
    // `node` est la suite historique : mêmes fichiers, même environnement,
    // mêmes réglages qu'avant l'ajout des tests d'interface. Toucher à la
    // configuration commune aurait fait porter le doute sur 392 tests qui
    // gardent les règles du jeu.
    //
    // `ui` monte de vraies vues React dans jsdom. Elle sert d'abord de filet
    // anti-régression pour la refonte du menu : les tests sont écrits contre
    // le comportement EXISTANT, donc ils passent avant le reskin et doivent
    // passer après. Un test qui ne verrouille rien d'observable — un libellé
    // décoratif, une couleur — n'a rien à faire ici.
    //
    // Les motifs ne se recouvrent pas (`.test.ts` d'un côté, `.test.tsx` de
    // l'autre) : aucun fichier ne peut tourner deux fois.
    test: {
      projects: [
        {
          test: {
            name: 'node',
            globals: true,
            environment: 'node',
            include: ['tests/**/*.test.ts'],
          },
        },
        {
          plugins: [react()],
          test: {
            name: 'ui',
            globals: true,
            environment: 'jsdom',
            include: ['tests/ui/**/*.test.tsx'],
            setupFiles: ['./tests/ui/setup.ts'],
          },
        },
      ],
    }

  };
});
