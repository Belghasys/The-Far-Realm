import { create } from 'zustand';
import { setDiceAnimMs } from '../services/diceTiming';

/**
 * Player-facing app settings (Réglages panel). Persisted to localStorage and
 * applied as side effects where relevant (dice speed is pushed into
 * diceTiming; volumes/media gates are READ live by the media services).
 */
export type DiceSpeed = 'normal' | 'fast' | 'instant';

export interface AppSettings {
    /** Background music volume 0..1 (default 0.315 — the historical constant). */
    musicVolume: number;
    /** SFX volume 0..1 (default 0.75). */
    sfxVolume: number;
    /** Dice overlay pacing: normal 3s / fast 1.5s / instant 0.3s (still skippable). */
    diceSpeed: DiceSpeed;
    /** Gemini Live prebuilt voice for the DM (applied at the next connection). */
    dmVoice: string;
    /** Local media toggles — the "no-GPU mode" switches. */
    localImages: boolean;
    localSfx: boolean;
    localMusic: boolean;
    /** Generated portraits (hero + NPCs) — requires localImages. */
    portraits: boolean;
}

export const DM_VOICES = ['Charon', 'Puck', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'] as const;

export const DICE_SPEED_MS: Record<DiceSpeed, number> = { normal: 3000, fast: 1500, instant: 300 };

const STORAGE_KEY = 'dungeonai-settings';

const DEFAULT_SETTINGS: AppSettings = {
    musicVolume: 0.315,
    sfxVolume: 0.75,
    diceSpeed: 'normal',
    dmVoice: 'Charon',
    localImages: true,
    localSfx: true,
    localMusic: true,
    portraits: true,
};

function loadSettings(): AppSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

interface SettingsState extends AppSettings {
    setSettings: (patch: Partial<AppSettings>) => void;
    resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    ...loadSettings(),
    setSettings: (patch) => {
        set(patch);
        const { setSettings: _s, resetSettings: _r, ...values } = get();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch { /* best effort */ }
        if (patch.diceSpeed) setDiceAnimMs(DICE_SPEED_MS[patch.diceSpeed]);
    },
    resetSettings: () => {
        set(DEFAULT_SETTINGS);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS)); } catch { /* ignore */ }
        setDiceAnimMs(DICE_SPEED_MS[DEFAULT_SETTINGS.diceSpeed]);
    },
}));

/** Non-React accessor for services (media gates, voices, volumes). */
export function getAppSettings(): AppSettings {
    const { setSettings: _s, resetSettings: _r, ...values } = useSettingsStore.getState();
    return values;
}

// Apply the persisted dice speed once at module load.
setDiceAnimMs(DICE_SPEED_MS[loadSettings().diceSpeed]);
