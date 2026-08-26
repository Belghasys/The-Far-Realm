/**
 * Les textes (fr / en) des ecrans de ce dossier, une table par composant.
 *
 * Rassembles ici le 2026-08-25 (R8 du rangement) : chaque table vivait en
 * tete de son composant sous le nom TRANS ; le composant l'importe
 * desormais sous ce meme alias, ses usages n'ont pas change. Contenu
 * inchange.
 */

// ── ErrorBoundary ──
export const ERROR_BOUNDARY_TEXTS = {
    en: {
        defaultTitle: 'Something went wrong',
        body: 'An unexpected error occurred. Your game data has been auto-saved.',
        errorDetails: 'Error details',
        retry: '⚡ Retry',
        reload: '🔄 Reload Page',
    },
    fr: {
        defaultTitle: 'Une erreur est survenue',
        body: "Une erreur inattendue s'est produite. Vos données de jeu ont été sauvegardées automatiquement.",
        errorDetails: "Détails de l'erreur",
        retry: '⚡ Réessayer',
        reload: '🔄 Recharger la page',
    },
} as const;
