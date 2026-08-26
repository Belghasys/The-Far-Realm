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

/** Écrit une ligne dans le log de campagne — l'écrivain MOTEUR (gratuit,
 *  fiable, immédiat) de l'architecture secrétaire+résumeur. Horodate avec le
 *  calendrier du monde + chapitre courant, plafonne le log vivant à 200. */
export function appendCampaignLog(kind: CampaignLogEntry['kind'], text: string): void {
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!clean) return;
    useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        campaignLog: [
            ...(prev.campaignLog || []).slice(-199),
            {
                id: makeSceneVisualId().replace('visual_', 'log_'),
                day: prev.dayCount || 1,
                timeOfDay: prev.timeOfDay || 'day',
                chapterId: prev.currentChapterId,
                kind,
                text: clean,
                createdAt: Date.now(),
            },
        ],
    }));
}

/** Chronique de combat partagée (session courante, non persistée) : PV du héros
 *  à l'OUVERTURE du combat + attaques custom jouées. Un module et non un ref
 *  React : la fin de combat a TROIS portes (moteur, outil MJ end_combat, bouton
 *  d'urgence) réparties entre GameSession et useToolProcessor — chacune doit
 *  pouvoir lire ET remettre à zéro, sinon les PV du combat suivant sont faux. */
export const combatChronicle = {
    data: { active: false, hpStart: 0, custom: [] as string[] },
    begin(hpStart: number): void {
        if (!this.data.active) this.data = { active: true, hpStart, custom: [] };
    },
    addCustom(label: string): void {
        const c = this.data.custom;
        if (label && c.length < 8 && !c.includes(label)) c.push(label);
    },
    /** Lit l'état et remet à zéro — à appeler à CHAQUE dénouement. */
    take(): { active: boolean; hpStart: number; custom: string[] } {
        const d = this.data;
        this.data = { active: false, hpStart: 0, custom: [] };
        return d;
    },
};

/** « 3x ogre, wolf » — regroupe les ennemis d'un roster par nom de base. */
export function describeCombatFoes(combatants: Array<{ name?: string; side?: string; isPlayer?: boolean }>): string {
    const groups = new Map<string, number>();
    for (const c of combatants || []) {
        if (c.side ? c.side !== 'enemy' : c.isPlayer) continue;
        // Suffixes du tracker : chiffres, chiffres romains, ET lettres A/B/C.
        // La lettre manquait — un combat de six gobelins nommés « Goblin A »…
        // « Goblin F » produisait « 2x Goblin C, 2x Goblin A, … » dans le log de
        // campagne, puis dans les résumés (audit 2026-08-24, B4). Lettre en
        // MAJUSCULE uniquement : c'est la convention du tracker, et on ne veut
        // pas amputer un nom qui finirait par une minuscule.
        const base = String(c.name || 'enemy')
            .replace(/\s+(\d+|[IVX]+)$/i, '')
            .replace(/\s+[A-Z]$/, '')
            .trim() || 'enemy';
        groups.set(base, (groups.get(base) || 0) + 1);
    }
    return [...groups.entries()].map(([n, count]) => (count > 1 ? `${count}x ${n}` : n)).join(', ') || 'unknown foes';
}

/** « fled: 2x Goblin; surrendered: Bandit » — les sortis vivants, groupés par
 *  raison (même regroupement de noms que describeCombatFoes). Chaîne vide si
 *  personne n'est parti. */
export function describeDeparted(departed: Array<{ name?: string; side?: string; reason?: string; returned?: boolean }>): string {
    const byReason = new Map<string, Array<{ name?: string; side?: string }>>();
    for (const d of departed || []) {
        if (d.returned) continue;
        const reason = d.reason || 'fled';
        if (!byReason.has(reason)) byReason.set(reason, []);
        byReason.get(reason)!.push({ name: d.name, side: d.side || 'enemy' });
    }
    return [...byReason.entries()]
        .map(([reason, rows]) => `${reason}: ${describeCombatFoes(rows)}`)
        .join('; ');
}

/** « Defeated: 2x Goblin | Fled (ALIVE): Wolf | Surrendered (ALIVE): Bandit » —
 *  bilan de fin de combat pour le MJ : les sortis vivants sont NOMMÉS comme
 *  tels, sinon le modèle les narre en cadavres. */
export function describeFightEnd(
    combatants: Array<{ name?: string; side?: string; isPlayer?: boolean; hp?: { current: number } }>,
    departed: Array<{ name?: string; side?: string; reason?: string; returned?: boolean }>,
): string {
    const isEnemy = (c: { side?: string; isPlayer?: boolean }) => (c.side ? c.side === 'enemy' : !c.isPlayer);
    const downed = (combatants || []).filter(c => isEnemy(c) && (c.hp?.current ?? 0) <= 0);
    const gone = (departed || []).filter(d => !d.returned && (d.side || 'enemy') === 'enemy');
    const fled = gone.filter(d => d.reason === 'fled');
    const yielded = gone.filter(d => d.reason === 'surrendered');
    const parts: string[] = [];
    if (downed.length) parts.push(`Defeated: ${describeCombatFoes(downed)}`);
    if (fled.length) parts.push(`Fled (ALIVE): ${describeCombatFoes(fled)}`);
    if (yielded.length) parts.push(`Surrendered (ALIVE): ${describeCombatFoes(yielded)}`);
    return parts.join(' | ') || 'no enemies remain';
}

/** Ligne-résumé de combat pour le log de campagne (format validé utilisateur :
 *  « Combat: Salim vs 3x ogre — mortally wounded (lost 40/50 HP) — +2000 XP »).
 *  `departed` (« fled: Goblin ») se place AVANT les attaques custom : la ligne
 *  est tronquée à 220 caractères et un fuyard qu'on oublie revient en cadavre
 *  dans les résumés. */
export function formatCombatChronicleLine(opts: {
    heroName: string; hpCurrent: number; hpMax: number;
    hpStart: number | null; foes: string; xp?: number; custom?: string[];
    outcome: 'victory' | 'defeat' | 'narrative' | 'interrupted';
    departed?: string;
}): string {
    const lost = Math.max(0, (opts.hpStart ?? opts.hpMax) - opts.hpCurrent);
    const ratio = opts.hpMax > 0 ? lost / opts.hpMax : 0;
    const qual = lost <= 0 ? 'unscathed' : ratio <= 0.25 ? 'lightly wounded' : ratio <= 0.5 ? 'wounded' : ratio <= 0.75 ? 'badly wounded' : 'mortally wounded';
    const hpTxt = lost > 0 ? ` (lost ${lost}/${opts.hpMax} HP)` : '';
    const state = opts.outcome === 'victory' ? `${qual}${hpTxt}`
        : opts.outcome === 'defeat' ? `DEFEATED — hero fell${hpTxt}`
        : opts.outcome === 'narrative' ? `ended by DM narration — ${qual}${hpTxt}`
        : `stopped without resolution — ${qual}${hpTxt}`;
    const xpTxt = opts.xp && opts.xp > 0 ? ` — +${opts.xp} XP` : '';
    const departedTxt = opts.departed ? ` — ${opts.departed}` : '';
    const customTxt = opts.custom?.length ? ` — custom moves: ${opts.custom.slice(0, 5).join(', ')}` : '';
    return `Combat: ${opts.heroName} vs ${opts.foes} — ${state}${xpTxt}${departedTxt}${customTxt}`;
}

function makeSceneVisualId(): string {
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
