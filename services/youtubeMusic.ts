/**
 * Chargement de l'API YouTube IFrame, une seule fois pour toute la page.
 *
 * Pourquoi un module plutôt qu'un `<script>` dans index.html :
 *
 *   1. L'API n'est utile que sur les écrans de menu. La charger au démarrage
 *      ferait payer une requête tierce à un joueur qui entre directement en
 *      partie.
 *   2. Le rappel `onYouTubeIframeAPIReady` est GLOBAL et n'est appelé qu'UNE
 *      fois. Deux composants qui l'écrasent chacun de leur côté, et le second
 *      n'est jamais prévenu. La promesse mémorisée ici règle le problème une
 *      bonne fois.
 *
 * L'échec est un cas NORMAL, pas une exception : bloqueur de publicité, réseau
 * d'entreprise, mode hors ligne de l'installeur. D'où le délai d'attente — un
 * appelant qui ne saurait jamais que ça a échoué laisserait le joueur devant
 * un cadre vide et silencieux.
 */
import { log } from './infra/logger';

/** Au-delà, on considère que l'API ne viendra pas. */
const DELAI_MS = 4000;

const SRC = 'https://www.youtube.com/iframe_api';

type YTPlayer = {
    playVideo(): void;
    pauseVideo(): void;
    setVolume(v: number): void;
    mute(): void;
    unMute(): void;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoData?: () => { title?: string };
    destroy(): void;
};

type YTApi = {
    Player: new (el: HTMLElement | string, options: Record<string, unknown>) => YTPlayer;
    PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};

declare global {
    interface Window {
        YT?: YTApi;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let promesse: Promise<YTApi | null> | null = null;

export function chargerApiYouTube(): Promise<YTApi | null> {
    if (promesse) return promesse;

    promesse = new Promise<YTApi | null>((resolve) => {
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            resolve(null);
            return;
        }
        // Déjà présente (navigation arrière, seconde visite d'un écran de menu).
        if (window.YT?.Player) {
            resolve(window.YT);
            return;
        }

        let fini = false;
        const terminer = (api: YTApi | null) => {
            if (fini) return;
            fini = true;
            clearTimeout(minuteur);
            resolve(api);
        };

        const minuteur = setTimeout(() => {
            log.warn('🎵 API YouTube injoignable — repli sur la piste locale.');
            terminer(null);
        }, DELAI_MS);

        // On CHAÎNE le rappel global au lieu de l'écraser : une autre partie de
        // la page pourrait déjà l'attendre.
        const precedent = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            precedent?.();
            terminer(window.YT ?? null);
        };

        const balise = document.createElement('script');
        balise.src = SRC;
        balise.async = true;
        balise.onerror = () => terminer(null);
        document.head.appendChild(balise);
    });

    return promesse;
}

export type { YTPlayer, YTApi };
