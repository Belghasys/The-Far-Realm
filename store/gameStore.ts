import { create } from 'zustand';
import type { User } from 'firebase/auth';
import {
    AdventureManifest,
    CampaignLogEntry,
    CampaignRuntimeState,
    CampaignSubBranchPlan,
    CharacterSheet,
    DEFAULT_CAMPAIGN_RUNTIME,
    DEFAULT_JOURNAL,
    Language,
    AppState,
    JournalState
} from '../types';
import { repairCharacterWeapons } from '../data/equipment';
import { viteEnv } from '../services/infra/modelConfig';
import { isSlimManifestPayload } from '../services/persistence/manifestTokens';
import type { ChatMessage } from '../hooks/useTranscript';
import type { Combatant } from '../engine/combatants';
import type { DepartedCombatant } from '../engine/rulesEngine';

// Seed the UI language from a previous choice, else the browser, defaulting to English.
function getInitialLanguage(): Language {
    try {
        const stored = localStorage.getItem('dungeonai-lang');
        if (stored === 'fr' || stored === 'en') return stored;
        if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) return 'fr';
    } catch { /* SSR / restricted storage */ }
    return 'en';
}

// UI2 (contre-audit 2026-08-13) — réparation des sauvegardes existantes : les
// lanceurs « prepared » créés avant le correctif ont knownSpells vide alors que
// preparedSpells est rempli → grimoire vide + verrou maxPrepared (les sorts de
// création saturent le quota sans pouvoir être dépréparés). Les sorts préparés
// sont par définition connus : on les fusionne dans knownSpells.
function repairKnownSpells<T extends { knownSpells?: string[]; preparedSpells?: string[] }>(character: T): T {
    const prepared = character.preparedSpells || [];
    if (prepared.length === 0) return character;
    const known = character.knownSpells || [];
    const missing = prepared.filter(s => !known.includes(s));
    if (missing.length === 0) return character;
    return { ...character, knownSpells: [...known, ...missing] };
}

export interface SceneVisualRequest {
    id: string;
    key: string;
    prompt: string;
    kind: 'scene_image' | 'combat_image' | 'moment_image';
    phase: string;
    summary: string;
    requestedAt: number;
    status: 'pending' | 'applied' | 'failed';
    imageUrl?: string;
    error?: string;
}

/**
 * A custom combat action AUTHORED BY THE DM on the fly (never hard-coded). The
 * DM fills in the spec (label, cost, how it resolves, numbers it adjudicates);
 * it surfaces to the player as a clickable card, and the engine resolves the
 * real dice when the player confirms. This is the "deterministic engine +
 * creative DM injection" bridge — see ProposedActionPrompt / handlePlayerProposedAction.
 */
export interface ProposedPlayerAction {
    id: string;
    label: string;
    description?: string;
    cost: 'action' | 'bonus_action' | 'free' | 'reaction';
    resolution: 'attack' | 'save' | 'check' | 'auto' | 'effect';
    /** Combatant id/name, or 'all_enemies', or a comma-separated list. */
    target?: string;
    attackBonus?: number;
    dc?: number;
    advantage?: 'normal' | 'advantage' | 'disadvantage';
    saveAbility?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    checkAbility?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    damageFormula?: string;
    damageType?: string;
    condition?: string;
    selfModifier?: { mode?: string; bonus?: number; scope?: string; uses?: number };
    /** Malus/bonus CHIFFRÉ appliqué à la CIBLE au succès de la carte
     *  (« sable dans les yeux : attackBonus -2, 2 rounds »). */
    targetEffect?: { stat: string; bonus: number; rounds: number };
    createdAt: number;
}

export interface CombatRollEntry {
    id: number;
    name: string;
    total: number;
    formula?: string;
    isDM: boolean;
    success?: boolean;
}

interface GameState {
    // App State (Legacy fallback for some views if needed, to be replaced by Router mostly)
    appState: AppState;
    setAppState: (state: AppState) => void;

    // User & Settings
    user: User | null;
    /** false until the first onAuthStateChanged callback resolves — prevents redirecting
     *  a logged-in user to login on a page refresh while Firebase rehydrates the session. */
    authReady: boolean;
    setUser: (user: User | null) => void;
    language: Language;
    setLanguage: (lang: Language) => void;

    // Multiplayer
    gameMode: 'solo' | 'multiplayer';
    setGameMode: (mode: 'solo' | 'multiplayer') => void;
    sessionId: string;
    setSessionId: (id: string) => void;
    isHost: boolean;
    setIsHost: (isHost: boolean) => void;

    // Game/Adventure Info
    character: CharacterSheet | null;
    setCharacter: (char: CharacterSheet | null) => void;
    selectedAdventure: string;
    setSelectedAdventure: (id: string) => void;
    activeSaveId: string | null;
    setActiveSaveId: (id: string | null) => void;
    adventureManifest: string;
    adventureManifestData: AdventureManifest | null;
    setAdventureManifest: (manifest: string, data?: AdventureManifest | null) => void;
    /** Valeurs de jetons de la passe de personnalisation (campagnes d'auteur) —
     *  persistées à la place du manifeste entier (sauvegarde « mince »). */
    manifestTokens: Record<string, string> | null;
    setManifestTokens: (tokens: Record<string, string> | null) => void;
    campaignRuntime: CampaignRuntimeState;
    setCampaignRuntime: (updater: CampaignRuntimeState | ((prev: CampaignRuntimeState) => CampaignRuntimeState)) => void;
    activateBranch: (branch: CampaignSubBranchPlan) => CampaignSubBranchPlan;

    // In-Game Session State
    transcript: ChatMessage[];
    setTranscript: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    journal: JournalState;
    setJournal: (updater: JournalState | ((prev: JournalState) => JournalState)) => void;

    bgImage: string;
    setBgImage: (url: string) => void;
    activeSceneVisualRequest: SceneVisualRequest | null;
    lastSceneVisualRequest: SceneVisualRequest | null;
    beginSceneVisualRequest: (request: Omit<SceneVisualRequest, 'id' | 'requestedAt' | 'status'>) => SceneVisualRequest;
    completeSceneVisualRequest: (id: string, imageUrl: string) => boolean;
    failSceneVisualRequest: (id: string, error?: string) => boolean;

    combatState: {
        isActive: boolean;
        combatants: Combatant[];
        currentTurn: string;
        round?: number;
        turnIndex?: number;
        actionEconomy?: Record<string, any>;
        logs?: any[];
        // Hybrid enemy targeting: MJ-set standing intents, mapping an enemy
        // combatant id -> the hero id it prefers to attack. Consulted (and
        // validated) each enemy turn; falls back to "wounded prey" if absent
        // or stale. Adds no latency to the turn loop.
        enemyIntents?: Record<string, string>;
        // Sortis VIVANTS du combat (moral raté, reddition) — voir
        // withdrawCombatant. Absent sur les anciennes sauvegardes.
        departed?: DepartedCombatant[];
    };
    setCombatState: (updater: any | ((prev: any) => any)) => void;
    isNPCTurn: boolean;
    setIsNPCTurn: (isNpc: boolean) => void;
    activeEngine: string | null;
    setActiveEngine: (engine: string | null) => void;
    actionMode: string | null;
    setActionMode: (mode: string | null) => void;

    currentRoll: any;
    setCurrentRoll: (roll: any) => void;
    activePrompt: any;
    setActivePrompt: (prompt: any) => void;

    // DM-authored improvised action cards awaiting the player's confirmation.
    proposedActions: ProposedPlayerAction[];
    addProposedAction: (action: ProposedPlayerAction) => void;
    removeProposedAction: (id: string) => void;
    clearProposedActions: () => void;

    // NF3 — boutique de marchand ouverte par l'outil open_shop du MJ.
    activeShop: {
        merchantName: string;
        merchantType: string;
        priceModifier: number;
        greeting?: string;
        stock: { item: any; price: number }[];
    } | null;
    setActiveShop: (shop: GameState['activeShop']) => void;

    // Recent combat rolls (attack/damage/save) shown as a persistent feed inside
    // the combat tracker — so enemy rolls are visible in the combat area, not just
    // the fleeting dice overlay / left-panel DiceTray.
    combatRolls: CombatRollEntry[];
    pushCombatRoll: (entry: Omit<CombatRollEntry, 'id'>) => void;
    clearCombatRolls: () => void;

    // Developer mode (toggled by the secret "IDDAD" code) — the DM obeys direct commands.
    devMode: boolean;
    setDevMode: (on: boolean) => void;

    isGeneratingImage: boolean;
    setIsGeneratingImage: (isGenerating: boolean) => void;

    // Cloud save health — flips to 'failing' when a Firestore write throws so the
    // UI can warn the player instead of silently losing progress.
    saveHealth: 'ok' | 'failing';
    lastSaveErrorAt: number | null;
    setSaveHealth: (ok: boolean) => void;

    // Helpers to sync and update combat-related character states
    updateCharacterHPAndCombatHP: (hp: number) => void;

    // Helpers to bulk update (for loading saves)
    loadSaveState: (saveData: any) => void;
    resetSessionState: () => void;
}

const defaultSessionState = {
    transcript: [],
    journal: DEFAULT_JOURNAL,
    bgImage: '',
    activeSceneVisualRequest: null,
    lastSceneVisualRequest: null,
    combatState: { isActive: false, combatants: [], currentTurn: '' },
    isNPCTurn: false,
    activeEngine: null,
    actionMode: null,
    currentRoll: null,
    activePrompt: null,
    proposedActions: [],
    combatRolls: [],
    devMode: false,
    isGeneratingImage: false,
    // Reset per session so a failed-save badge from a previous game never leaks
    // into a freshly loaded/started one (loadSaveState/resetSessionState spread this).
    saveHealth: 'ok' as const,
    lastSaveErrorAt: null,
};

function makeBranchId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `branch_${crypto.randomUUID()}`;
    }
    return `branch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRuntime(runtime?: Partial<CampaignRuntimeState> | null): CampaignRuntimeState {
    return {
        ...DEFAULT_CAMPAIGN_RUNTIME,
        ...(runtime || {}),
        activeBranch: runtime?.activeBranch || null,
        branchHistory: runtime?.branchHistory || [],
        canonFacts: runtime?.canonFacts || [],
        protectedSecrets: runtime?.protectedSecrets || [],
        worldClocks: runtime?.worldClocks || [],
        campaignLog: runtime?.campaignLog || [],
        chapterDigests: runtime?.chapterDigests || [],
        actDigests: runtime?.actDigests || [],
    };
}

export function makeSceneVisualId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `visual_${crypto.randomUUID()}`;
    }
    return `visual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useGameStore = create<GameState>((set) => ({
    appState: AppState.LOGIN,
    setAppState: (appState) => set({ appState }),

    user: null,
    authReady: false,
    setUser: (user) => set({ user, authReady: true }),
    language: getInitialLanguage(),
    setLanguage: (language) => {
        try { localStorage.setItem('dungeonai-lang', language); } catch { /* ignore */ }
        set({ language });
    },

    gameMode: 'solo',
    setGameMode: (gameMode) => set({ gameMode }),
    sessionId: '',
    setSessionId: (sessionId) => set({ sessionId }),
    isHost: false,
    setIsHost: (isHost) => set({ isHost }),

    character: null,
    setCharacter: (character) => set({ character }),
    selectedAdventure: '',
    setSelectedAdventure: (selectedAdventure) => set({ selectedAdventure }),
    activeSaveId: null,
    setActiveSaveId: (activeSaveId) => set({ activeSaveId }),
    adventureManifest: '',
    adventureManifestData: null,
    setAdventureManifest: (adventureManifest, adventureManifestData = null) => set({ adventureManifest, adventureManifestData }),
    manifestTokens: null,
    setManifestTokens: (manifestTokens) => set({ manifestTokens }),
    campaignRuntime: DEFAULT_CAMPAIGN_RUNTIME,
    setCampaignRuntime: (updater) => set((state) => ({
        campaignRuntime: normalizeRuntime(typeof updater === 'function' ? updater(state.campaignRuntime) : updater)
    })),
    activateBranch: (branch) => {
        let activated: CampaignSubBranchPlan = {
            ...branch,
            id: branch.id || makeBranchId(),
            status: 'active',
            createdAt: branch.createdAt || Date.now(),
            // gm-m3 — provenance lue depuis la config (VITE_BRANCH_MODEL) au
            // lieu d'un ID figé qui deviendrait mensonger en changeant de modèle.
            source: branch.source || viteEnv('VITE_BRANCH_MODEL', import.meta.env.VITE_BRANCH_MODEL, 'branch-writer'),
        };
        set((state) => ({
            campaignRuntime: {
                ...normalizeRuntime(state.campaignRuntime),
                activeBranch: activated,
                branchHistory: [
                    ...normalizeRuntime(state.campaignRuntime).branchHistory.filter(existing => existing.id !== activated.id),
                    activated,
                ].slice(-20),
                updatedAt: Date.now(),
            }
        }));
        return activated;
    },

    ...defaultSessionState,

    setTranscript: (updater) => set((state) => ({
        transcript: typeof updater === 'function' ? updater(state.transcript) : updater
    })),
    setJournal: (updater: JournalState | ((prev: JournalState) => JournalState)) => set((state) => ({
        journal: typeof updater === 'function' ? updater(state.journal) : updater
    })),
    setBgImage: (bgImage) => set({ bgImage }),
    beginSceneVisualRequest: (request) => {
        const next: SceneVisualRequest = {
            ...request,
            id: makeSceneVisualId(),
            requestedAt: Date.now(),
            status: 'pending',
        };
        set({
            activeSceneVisualRequest: next,
            isGeneratingImage: true,
        });
        return next;
    },
    completeSceneVisualRequest: (id, imageUrl) => {
        let applied = false;
        set((state) => {
            // PL4 — requête SUPPLANTÉE par une plus récente encore en cours :
            // on AFFICHE quand même l'image terminée (mieux qu'un fond périmé
            // pendant 10-60 s de plus) — la plus récente la remplacera à son
            // arrivée. Avant, l'image finie était simplement jetée.
            if (state.activeSceneVisualRequest?.id !== id) {
                return imageUrl ? { ...state, bgImage: imageUrl } : state;
            }
            applied = true;
            const completed: SceneVisualRequest = {
                ...state.activeSceneVisualRequest,
                status: 'applied',
                imageUrl,
            };
            return {
                bgImage: imageUrl,
                activeSceneVisualRequest: null,
                lastSceneVisualRequest: completed,
                isGeneratingImage: false,
            };
        });
        return applied;
    },
    failSceneVisualRequest: (id, error) => {
        let applied = false;
        set((state) => {
            if (state.activeSceneVisualRequest?.id !== id) return state;
            applied = true;
            const failed: SceneVisualRequest = {
                ...state.activeSceneVisualRequest,
                status: 'failed',
                error,
            };
            return {
                activeSceneVisualRequest: null,
                lastSceneVisualRequest: failed,
                isGeneratingImage: false,
            };
        });
        return applied;
    },

    setCombatState: (updater) => set((state) => ({
        combatState: typeof updater === 'function' ? updater(state.combatState) : updater
    })),
    setIsNPCTurn: (isNPCTurn) => set({ isNPCTurn }),
    setActiveEngine: (activeEngine) => set({ activeEngine }),
    setActionMode: (actionMode) => set({ actionMode }),

    setCurrentRoll: (currentRoll) => set({ currentRoll }),
    setActivePrompt: (activePrompt) => set({ activePrompt }),

    proposedActions: [],
    addProposedAction: (action) => set((state) => ({ proposedActions: [...state.proposedActions, action].slice(-4) })),
    removeProposedAction: (id) => set((state) => ({ proposedActions: state.proposedActions.filter((a) => a.id !== id) })),
    clearProposedActions: () => set({ proposedActions: [] }),

    activeShop: null,
    setActiveShop: (activeShop) => set({ activeShop }),

    combatRolls: [],
    pushCombatRoll: (entry) => set((state) => ({
        combatRolls: [...state.combatRolls, { ...entry, id: (state.combatRolls[state.combatRolls.length - 1]?.id ?? 0) + 1 }].slice(-12)
    })),
    clearCombatRolls: () => set({ combatRolls: [] }),

    devMode: false,
    setDevMode: (devMode) => set({ devMode }),

    isGeneratingImage: false,
    setIsGeneratingImage: (isGeneratingImage) => set({ isGeneratingImage }),

    saveHealth: 'ok',
    lastSaveErrorAt: null,
    setSaveHealth: (ok) => set(ok
        ? { saveHealth: 'ok' }
        : { saveHealth: 'failing', lastSaveErrorAt: Date.now() }),

    updateCharacterHPAndCombatHP: (hp) => set((state) => {
        if (!state.character) return state;
        const nextChar = {
            ...state.character,
            hp: { ...state.character.hp, current: Math.max(0, Math.min(state.character.hp.max, hp)) }
        };
        const nextCombatState = state.combatState.isActive
            ? {
                ...state.combatState,
                combatants: state.combatState.combatants.map(c =>
                    c.isPlayer
                        ? { ...c, hp: { ...c.hp, current: nextChar.hp.current } }
                        : c
                )
            }
            : state.combatState;
        return {
            character: nextChar,
            combatState: nextCombatState
        };
    }),

    loadSaveState: (saveData) => set({
        // Spread defaultSessionState FIRST so a previous game's transient state
        // (bgImage, currentScene, isNPCTurn, currentRoll, activePrompt…) is
        // fully reset when loading another save in the same tab.
        ...defaultSessionState,
        // Migration à la volée : les anciennes sauvegardes stockaient les arcs
        // sans portée ni propriété « ammunition » — le moteur et le MJ les
        // prenaient pour des armes de mêlée.
        // UI2 (contre-audit) — réparer aussi les lanceurs « prepared » existants :
        // knownSpells vide + preparedSpells rempli = grimoire vide et verrou
        // maxPrepared (aucun sort préparable). Les sorts préparés deviennent connus.
        character: saveData.character ? repairKnownSpells(repairCharacterWeapons(saveData.character)) : null,
        selectedAdventure: saveData.adventure || '',
        // Sauvegarde MINCE (campagnes d'auteur) : le doc Firestore ne porte que
        // {authoredRef, tokenValues, chapterStatuses} (~2 Ko). La réhydratation
        // depuis le gabarit du code n'est PLUS faite ici : elle vit dans
        // services/persistence/manifestHydration (hydrateSaveData), que l'appelant invoque
        // avant — le store ne doit pas connaître les campagnes, sinon elles
        // arrivent sur l'écran de connexion avec lui (550 Ko de source).
        // Une forme mince qui arrive quand même est une erreur de programmation :
        // on le dit, et on charge sans manifeste plutôt que de planter le hall.
        ...(() => {
            if (isSlimManifestPayload(saveData.manifest)) {
                console.error('[gameStore] loadSaveState a reçu un manifeste MINCE non réhydraté — passer par hydrateSaveData() avant.');
                return { adventureManifest: '', adventureManifestData: null, manifestTokens: saveData.manifest.tokenValues };
            }
            const manifest = (saveData.manifest as AdventureManifest | undefined) || null;
            return {
                adventureManifest: manifest?.fullManifesto || '',
                adventureManifestData: manifest,
                manifestTokens: saveData.manifestTokens || null,
            };
        })(),
        campaignRuntime: normalizeRuntime(saveData.campaignRuntime),
        transcript: saveData.transcript || [],
        journal: saveData.journal || DEFAULT_JOURNAL,
        // Only restore a combat that is genuinely ACTIVE — a cleared/legacy
        // combat block must never resurrect a finished fight on load.
        combatState: (saveData.combat && saveData.combat.isActive)
            ? saveData.combat
            : defaultSessionState.combatState,
    }),

    resetSessionState: () => set({ ...defaultSessionState, character: null, selectedAdventure: '', activeSaveId: null, adventureManifest: '', adventureManifestData: null, manifestTokens: null, campaignRuntime: DEFAULT_CAMPAIGN_RUNTIME }),
}));
