// Config ESLint (flat) — ajoutée par l'audit 2026-08-12 : le repo n'avait
// AUCUN linter (pas de garde-fou sur les deps de hooks, les variables mortes,
// les erreurs de portée). Règles calibrées pour un legacy de 69k LOC :
// bloquantes sur la correction (rules-of-hooks), tolérantes sur le style.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
    // functions/** : Cloud Functions Node (CommonJS, globals Node) — unité de
    // déploiement autonome avec son propre package.json, hors du bundle Vite.
    { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'installer/**', 'functions/**', '*.config.js', '*.config.ts'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            // Correction d'abord.
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'no-fallthrough': 'error',
            // Dette de typage héritée (334 `: any` / 420 `as any`) : signaler
            // sans bloquer — à résorber fichier par fichier.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/ban-ts-comment': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'prefer-const': 'warn',
            'no-case-declarations': 'off',
            // Pattern hérité (gestion de reconnexion Live) — stylistique.
            '@typescript-eslint/no-this-alias': 'off',
        },
    },
    // Worklet audio : globals du scope AudioWorklet.
    {
        files: ['services/dm/pcm-processor.js'],
        languageOptions: {
            globals: { AudioWorkletProcessor: 'readonly', registerProcessor: 'readonly', sampleRate: 'readonly', currentTime: 'readonly' },
        },
    },
    // Scripts Node à la racine (test-models.mjs…).
    {
        files: ['*.mjs'],
        languageOptions: {
            globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' },
        },
    },
);
