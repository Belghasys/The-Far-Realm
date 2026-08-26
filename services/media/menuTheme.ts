/**
 * Thème musical des écrans HORS JEU — connexion, choix du mode, sélection de
 * campagne, création de personnage.
 *
 * Volontairement séparé de `lyriaMusic` : celui-ci pilote l'ambiance pendant la
 * partie (moods, transitions, ducking quand le MJ parle). Ici il n'y a qu'une
 * seule piste, en boucle, coupable d'un clic.
 *
 * Deux contraintes de navigateur dictent la forme du code :
 *
 *   1. AUTOPLAY. Aucun navigateur ne laisse une page démarrer du son avant que
 *      l'utilisateur ait interagi avec elle. `play()` rejette silencieusement.
 *      On l'accepte : si la lecture est refusée, on arme des écouteurs
 *      one-shot (pointer/clavier) et la musique démarre au premier geste.
 *   2. UN SEUL ÉLÉMENT. Les vues sont montées/démontées par le routeur ; un
 *      élément par vue superposerait les pistes. D'où le singleton de module.
 *
 * Le fondu d'entrée évite le démarrage brutal quand la piste s'accroche à un
 * clic (le joueur vient de cliquer : un son plein volume dans la foulée
 * surprend).
 */
import { getAppSettings, useSettingsStore } from '../../store/settingsStore';
import { viteEnv } from '../infra/modelConfig';
import { log } from '../infra/logger';

/** Vide = pas de thème de menu du tout (le réglage reste sans effet). */
const THEME_URL = viteEnv(
    'VITE_MENU_THEME_URL',
    import.meta.env.VITE_MENU_THEME_URL,
    '/media/music/Last%20Basement%20Roll.mp3'
);

const FADE_IN_MS = 1200;
const FADE_STEP_MS = 60;
/** Délai de grâce entre le démontage d'un écran et le montage du suivant. */
const HANDOVER_MS = 250;

let audio: HTMLAudioElement | null = null;
let wanted = false;               // une vue hors jeu est-elle montée ?
/**
 * La Taverne (lecteur YouTube) a-t-elle pris la main ?
 *
 * Deux sources de musique en même temps, c'est le pire des deux mondes. Quand
 * le joueur lance une piste dans la Taverne, elle SUSPEND ce thème ; quand il
 * la met en pause ou quitte l'écran, elle le rend.
 *
 * C'est un état de session, pas un réglage : rien n'est écrit sur le disque,
 * donc la connexion garde sa musique au prochain lancement même si la dernière
 * chose faite était d'écouter YouTube.
 */
let suspended = false;
let gestureArmed = false;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function targetVolume(): number {
    if (suspended) return 0;
    const s = getAppSettings();
    return s.menuMusic ? s.musicVolume : 0;
}

function clearFade(): void {
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
}

/** Monte progressivement jusqu'au volume voulu. Idempotent. */
function fadeIn(): void {
    if (!audio) return;
    clearFade();
    const to = targetVolume();
    if (to <= 0) { audio.volume = 0; return; }
    const steps = Math.max(1, Math.round(FADE_IN_MS / FADE_STEP_MS));
    const from = audio.volume;
    let i = 0;
    fadeTimer = setInterval(() => {
        i++;
        if (!audio) { clearFade(); return; }
        audio.volume = Math.min(1, from + (to - from) * (i / steps));
        if (i >= steps) clearFade();
    }, FADE_STEP_MS);
}

function ensureAudio(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined' || !THEME_URL) return null;
    if (audio) return audio;
    audio = new Audio(THEME_URL);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.addEventListener('error', () => {
        log.warn(`🎵 Thème de menu introuvable : ${THEME_URL} — dépose le fichier dans public/media/music, ou vide VITE_MENU_THEME_URL.`);
    });
    return audio;
}

/**
 * Le navigateur a refusé la lecture : on attend le premier geste. Les
 * écouteurs sont `once` et couvrent souris, tactile et clavier.
 */
function armGesture(): void {
    if (gestureArmed || typeof window === 'undefined') return;
    gestureArmed = true;
    const go = () => {
        gestureArmed = false;
        window.removeEventListener('pointerdown', go);
        window.removeEventListener('keydown', go);
        if (wanted) void start();
    };
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
}

async function start(): Promise<void> {
    const el = ensureAudio();
    if (!el || !wanted) return;
    if (targetVolume() <= 0) { el.volume = 0; return; }
    try {
        await el.play();
        fadeIn();
    } catch {
        // Politique d'autoplay : normal au premier chargement, pas une erreur.
        armGesture();
    }
}

/** Applique en direct un changement de volume ou de coupure. */
function sync(): void {
    const el = audio;
    if (!el) return;
    const to = targetVolume();
    if (to <= 0) {
        clearFade();
        el.volume = 0;
        if (!el.paused) el.pause();
        return;
    }
    if (el.paused && wanted) { void start(); return; }
    clearFade();
    el.volume = to;
}

export const menuTheme = {
    /** Une vue hors jeu est montée : jouer (ou attendre le premier geste). */
    enter(): void {
        // Une navigation entre deux écrans de menu démonte l'un avant de monter
        // l'autre. Sans ce garde, la piste repartirait de zéro à chaque clic.
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
        if (wanted) return;
        wanted = true;
        if (!unsubscribe) {
            unsubscribe = useSettingsStore.subscribe(sync);
        }
        void start();
    },

    /**
     * La vue est démontée. L'arrêt est DIFFÉRÉ : si un autre écran de menu se
     * monte dans la foulée (navigation), il annule l'arrêt et la piste
     * continue sans coupure. Seul un vrai départ — entrée en partie,
     * déconnexion — laisse le minuteur aller au bout.
     */
    leave(): void {
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
            stopTimer = null;
            wanted = false;
            clearFade();
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 0;
            }
        }, HANDOVER_MS);
    },

    /**
     * La Taverne prend la main : ce thème se tait sans oublier qu'il est voulu.
     * `sync()` fait le travail — il met le volume à zéro et met en pause.
     */
    suspend(): void {
        if (suspended) return;
        suspended = true;
        sync();
    },

    /** La Taverne rend la main. Le thème repart s'il est toujours attendu. */
    resume(): void {
        if (!suspended) return;
        suspended = false;
        sync();
    },

    /** true quand une piste est réellement en cours (utile pour l'icône). */
    isPlaying(): boolean {
        return Boolean(audio && !audio.paused && audio.volume > 0);
    },

    /** Y a-t-il un thème configuré ? Sinon, ne pas afficher le bouton. */
    isConfigured(): boolean {
        return Boolean(THEME_URL);
    },
};
