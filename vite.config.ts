import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Version affichée dans les réglages et envoyée à Sentry (release).
      __APP_VERSION__: JSON.stringify(version),
      // Aucune clé ici : un `define` inline sa valeur dans le bundle public.
      // (Les anciens define de la clé Gemini ont été retirés le 2026-08-27 —
      // elle vit dans Secret Manager, voir functions/.)
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
            // `react-dom/client` est un point d'entrée DISTINCT de `react-dom` :
            // nommer le second n'embarque pas le premier, et 525 Ko de source
            // retombaient dans le chunk d'entrée — celui qui change à chaque
            // déploiement, donc celui qu'aucun cache ne garde.
            vendor: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-router-dom', 'zustand', 'lucide-react'],
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
