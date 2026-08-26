import React from 'react';
import { useGameStore } from '../../store/gameStore';

// UI1 — l'ancien LanguageContext était un second système i18n parallèle au
// store Zustand : les deux lisaient/écrivaient localStorage['dungeonai-lang']
// sans synchronisation à chaud. Cliquer EN/FR sur l'écran de connexion
// changeait le surlignage du bouton… et aucun texte (tous les composants
// lisent useGameStore.language). Le contexte est supprimé ; le sélecteur
// écrit directement dans le store — l'unique source de vérité.
export function LanguageSelector({ className = '' }: { className?: string }) {
    const lang = useGameStore(s => s.language);
    const setLanguage = useGameStore(s => s.setLanguage);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-sm font-bold transition-all ${lang === 'en'
                        ? 'bg-gold text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
            >
                EN
            </button>
            <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded text-sm font-bold transition-all ${lang === 'fr'
                        ? 'bg-gold text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
            >
                FR
            </button>
        </div>
    );
}
