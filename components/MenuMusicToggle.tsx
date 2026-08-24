import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { menuTheme } from '../services/menuTheme';
import { t, type Language } from '../services/translations';

/**
 * Thème des écrans hors jeu + son interrupteur.
 *
 * Le composant fait DEUX choses volontairement réunies : il monte/démonte la
 * piste avec la vue qui l'affiche, et il rend le bouton. Les séparer obligerait
 * chaque vue à penser à deux imports, et une vue oubliée laisserait la musique
 * tourner par-dessus la partie.
 *
 * Poser <MenuMusicToggle /> dans une vue = « cet écran a de la musique ».
 */
export function MenuMusicToggle({ className = '' }: { className?: string }) {
    const menuMusic = useSettingsStore(s => s.menuMusic);
    const setSettings = useSettingsStore(s => s.setSettings);
    const language = useGameStore(s => s.language) as Language;

    useEffect(() => {
        menuTheme.enter();
        return () => menuTheme.leave();
    }, []);

    if (!menuTheme.isConfigured()) return null;

    const label = menuMusic ? t('settings.muteMusic', language) : t('settings.unmuteMusic', language);

    return (
        <button
            type="button"
            onClick={() => setSettings({ menuMusic: !menuMusic })}
            title={label}
            aria-label={label}
            aria-pressed={!menuMusic}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${menuMusic
                ? 'border-gold/40 bg-gold/10 text-gold hover:bg-gold/20'
                : 'border-gray-700 bg-gray-900/70 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                } ${className}`}
        >
            {menuMusic ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
    );
}
