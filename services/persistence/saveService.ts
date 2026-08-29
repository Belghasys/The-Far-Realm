import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';
import { AdventureManifest, CampaignRuntimeState, CharacterSheet } from '../../types';
import type { SlimManifestPayload } from './manifestTokens';
import type { CampaignEvent } from './campaignEventLog';
import type { DepartedCombatant } from '../../engine/rulesEngine';

// Minimal Combatant interface for GameSave, as requested
interface Combatant {
    id: string;
    name: string;
    initiative: number;
    isPlayer: boolean;
    hp?: { current: number; max: number };
    ac?: number;
}

/** Version du schéma de sauvegarde. INCRÉMENTER à chaque changement de forme,
 *  et ajouter l'étape correspondante dans SAVE_MIGRATIONS. */
export const SAVE_SCHEMA_VERSION = 2;

export interface GameSave {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    /** Schéma de la sauvegarde (absent = v1, avant 2026-08-12). */
    saveVersion?: number;
    adventure: string;
    adventureTitle: string;

    // Character state
    character: CharacterSheet;

    // Transcript history
    transcript: { speaker: 'user' | 'dm', text: string }[];

    // Durable campaign timeline used for recovery, summaries, and debugging
    events?: CampaignEvent[];

    // Combat state (if in combat)
    combat?: {
        isActive: boolean;
        combatants: Combatant[];
        currentTurn: string;
        positions?: Record<string, string>;
        logs?: any[];
        // Persisted so a mid-combat reload keeps continuity (round counter,
        // whose turn index, per-combatant action economy, and MJ enemy targeting).
        round?: number;
        turnIndex?: number;
        actionEconomy?: Record<string, any>;
        enemyIntents?: Record<string, string>;
        /** Sortis vivants du combat (fuite / reddition). Optionnel : les
         *  sauvegardes antérieures au 2026-08-25 ne l'ont pas. */
        departed?: DepartedCombatant[];
    };
    // Parsed Adventure Manifest
    /** Manifeste complet (aventures générées / anciennes sauvegardes) ou forme
     *  MINCE {authoredRef, tokenValues, chapterStatuses} pour les campagnes
     *  d'auteur — réhydratée au chargement (hydrateManifestPayload). */
    manifest?: AdventureManifest | SlimManifestPayload;

    // Durable campaign director state: chapter, scene, branches, clocks, canon
    campaignRuntime?: CampaignRuntimeState;

    // Full journal (briefing/prologue, quests, NPCs, locations, chronicle)
    journal?: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        // OU1 — steps : la checklist vivante d'update_quest_step doit survivre
        // au rechargement (elle était jetée par les mappings de sauvegarde).
        // createdAt/completedAt sont des ISO strings depuis add_quest ; le type
        // annonçait `number` alors que rien n'en écrivait jamais un.
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed'; steps?: { id: string; text: string; done: boolean }[]; createdAt?: string | number | null; completedAt?: string | number | null }[];
        npcs: { id: string; name: string; description: string; location: string; disposition?: number; knownFacts?: string[]; lastSeenAt?: number; createdAt?: number | null }[];
        locations: { id: string; name: string; description: string }[];
        chronicle?: { id: string; title: string; description: string; timestamp: number }[];
    };

    // Legacy quest format (for backward compatibility)
    quests?: {
        active: string[];
        completed: string[];
    };

    // Play time in seconds
    playTime: number;
}

export interface SavePreview {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    adventure: string;
    adventureTitle: string;
    characterName: string;
    characterLevel: number;
    characterXP: number;
    playTime: number;
    lastMessage: string;
}

class WriteQueue {
    private promise: Promise<any> = Promise.resolve();

    enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const nextPromise = this.promise.then(operation);
        this.promise = nextPromise.catch(() => {});
        return nextPromise;
    }
}

class SaveService {
    private userId: string | null = null;
    private writeQueue = new WriteQueue();

    // Sync health notifications: the UI subscribes so a failed Firestore write
    // shows a "not synced" badge instead of dying silently in console.error.
    private syncListener: ((ok: boolean) => void) | null = null;

    setSyncListener(listener: ((ok: boolean) => void) | null) {
        this.syncListener = listener;
    }

    private reportSync(ok: boolean) {
        try { this.syncListener?.(ok); } catch { /* listener must never break saves */ }
    }

    // Recursive function to remove undefined values before Firestore sync.
    private sanitize(obj: any): any {
        // PL5 — les FONCTIONS sont éliminées partout : un objet fonction a un
        // prototype non-plain et passait par la branche « untouched » ci-dessous
        // → « Unsupported field value: a function » et TOUTES les sauvegardes
        // échouaient (ex. resolveToolCall attaché à un prompt loggé).
        if (typeof obj === 'function') {
            console.warn('💾 sanitize: fonction éliminée du payload de sauvegarde');
            return null;
        }
        if (Array.isArray(obj)) {
            // SP8 — un `undefined` DANS un tableau ferait rejeter toute l'écriture
            // par Firestore (« Unsupported field value ») : on le convertit en null.
            return obj.map(v => v === undefined ? null : this.sanitize(v));
        } else if (obj !== null && typeof obj === 'object') {
            // Only recurse into PLAIN objects. Non-plain instances (Firestore
            // Timestamp, Date, GeoPoint…) must be passed through untouched —
            // Object.entries() would strip their prototype and corrupt them
            // (e.g. a Timestamp became {seconds,nanoseconds}, breaking updatedAt
            // ordering so "Continuer" loaded the wrong save).
            const proto = Object.getPrototypeOf(obj);
            if (proto !== Object.prototype && proto !== null) {
                return obj;
            }
            return Object.fromEntries(
                Object.entries(obj)
                    .filter(([_, v]) => v !== undefined && typeof v !== 'function')
                    .map(([k, v]) => [k, this.sanitize(v)])
            );
        }
        return obj;
    }

    // Set user ID (call after auth)
    setUser(userId: string) {
        this.userId = userId;
    }

    clearUser() {
        this.userId = null;
        this.currentSaveId = null;
        this.pendingUpdates = {};
        this.criticalOverlay = {};
        this.pendingJournal = null;
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
            this.updateDebounceTimer = null;
        }
        if (this.journalDebounceTimer) {
            clearTimeout(this.journalDebounceTimer);
            this.journalDebounceTimer = null;
        }
    }

    // Get current user ID from Firebase Auth
    private getCurrentUserId(): string {
        if (this.userId) return this.userId;

        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }
        return user.uid;
    }

    // ========== SCHEMA VERSION & MIGRATIONS (audit 2026-08-12) ==========
    // Avant : AUCUN versionnage — chaque changement de forme était absorbé par
    // des défauts défensifs éparpillés (gameStore.repairCharacterWeapons, garde
    // « ghost combat », normalizeRuntime…) sans aucun moyen de détecter une
    // sauvegarde incompatible. Désormais : chaque écriture estampille
    // `saveVersion`, et le chargement fait passer la donnée par la chaîne de
    // migrations AVANT qu'elle n'atteigne le store.

    /** Migration v1→v2 : formalise les shims historiques (idempotents). */
    private static migrateV1toV2(save: any): any {
        // Les quêtes anciennes n'avaient pas de champ `steps` structuré.
        if (save?.journal?.quests) {
            save.journal.quests = save.journal.quests.map((q: any) =>
                q && q.steps === undefined ? { ...q, steps: [] } : q);
        }
        return save;
    }

    /** Chaîne ordonnée : la clé N migre une sauvegarde v(N) vers v(N+1). */
    private static readonly SAVE_MIGRATIONS: Record<number, (save: any) => any> = {
        1: SaveService.migrateV1toV2,
    };

    /** Applique les migrations manquantes ; jette si la sauvegarde vient d'une
     *  version PLUS RÉCENTE que l'app (au lieu de la corrompre en silence). */
    migrateSaveData(data: any): any {
        const from = Number(data?.saveVersion) || 1;
        if (from > SAVE_SCHEMA_VERSION) {
            throw new Error(`Save schema v${from} is newer than this app (v${SAVE_SCHEMA_VERSION}). Update the game before loading this save.`);
        }
        let migrated = data;
        for (let v = from; v < SAVE_SCHEMA_VERSION; v++) {
            const step = SaveService.SAVE_MIGRATIONS[v];
            if (step) migrated = step(migrated);
        }
        if (from < SAVE_SCHEMA_VERSION) {
            migrated.saveVersion = SAVE_SCHEMA_VERSION;
            console.log(`🔁 Save migrated v${from} → v${SAVE_SCHEMA_VERSION}`);
        }
        return migrated;
    }

    // Save game state (manual save - overwrites previous manual save)
    async saveGame(
        gameState: Omit<GameSave, 'id' | 'createdAt' | 'updatedAt'>,
        isAuto: boolean = false,
        saveIdOverride?: string,
        // Unload path (beforeunload/pagehide/visibilitychange). Browsers do NOT await
        // async work in those handlers, so a normal save (getDoc readback + writeQueue
        // wait + setDoc = two round-trips, possibly queued behind a 60s autosave) rarely
        // lands. In immediate mode we fire a single setDoc directly: no readback (merge:true
        // preserves the existing createdAt when we omit it) and no queue, maximizing the
        // chance the one write reaches the network before the tab dies.
        immediate: boolean = false
    ): Promise<string> {
        const userId = this.getCurrentUserId();
        // Prefer the active campaign id. Legacy fallback keeps older entry points working.
        const saveId = saveIdOverride || this.currentSaveId || (isAuto ? 'save_auto' : 'save_manual');
        this.currentSaveId = saveId;

        const saveRef = doc(db, 'users', userId, 'saves', saveId);

        const write = async () => {
            try {
                const now = Timestamp.now();
                if (immediate) {
                    // Omit createdAt → merge:true keeps whatever is already stored.
                    await setDoc(saveRef, this.sanitize({ ...gameState, saveVersion: SAVE_SCHEMA_VERSION, updatedAt: now }), { merge: true });
                    this.reportSync(true);
                    return saveId;
                }
                const saveDoc = await getDoc(saveRef);
                const createdAt = saveDoc.exists() ? (saveDoc.data().createdAt || now) : now;

                const payload = this.sanitize({
                    ...gameState,
                    saveVersion: SAVE_SCHEMA_VERSION,
                    createdAt,
                    updatedAt: now,
                });

                await setDoc(saveRef, payload, { merge: true });
                console.log(`✅ Game saved (${isAuto ? 'auto' : 'manual'}):`, saveId);
                this.reportSync(true);
                return saveId;
            } catch (error) {
                this.reportSync(false);
                throw error;
            }
        };

        // Bypass the serialized write queue on the unload path so the setDoc fires now
        // instead of waiting behind any in-flight debounced flush.
        return immediate ? write() : this.writeQueue.enqueue(write);
    }

    // Load game state
    async loadGame(saveId: string): Promise<GameSave | null> {
        const userId = this.getCurrentUserId();
        const saveRef = doc(db, 'users', userId, 'saves', saveId);
        const saveDoc = await getDoc(saveRef);

        if (!saveDoc.exists()) {
            return null;
        }

        const data = this.migrateSaveData(saveDoc.data());
        return {
            ...data,
            id: saveDoc.id,
            createdAt: this.toSafeDate(data.createdAt),
            updatedAt: this.toSafeDate(data.updatedAt),
        } as GameSave;
    }

    // List all saves (preview only)
    async listSaves(maxCount: number = 10): Promise<SavePreview[]> {
        const userId = this.getCurrentUserId();
        const savesRef = collection(db, 'users', userId, 'saves');
        const q = query(savesRef, orderBy('updatedAt', 'desc'), limit(maxCount));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const transcript = data.transcript || [];
            // Contre-audit 2026-08-13 (SP1) — un enregistrement au `text` absent/null ne
            // doit pas faire échouer le listing de TOUTES les sauvegardes.
            const lastMessage = transcript.length > 0
                ? String(transcript[transcript.length - 1]?.text ?? '').substring(0, 50) + '...'
                : 'No messages';

            return {
                id: doc.id,
                createdAt: this.toSafeDate(data.createdAt),
                updatedAt: this.toSafeDate(data.updatedAt),
                adventure: data.adventure,
                adventureTitle: data.adventureTitle || data.adventure,
                characterName: data.character?.name || 'Unknown',
                characterLevel: data.character?.level || 1,
                characterXP: data.character?.xp || 0,
                playTime: data.playTime || 0,
                lastMessage,
            };
        });
    }

    /** Safely convert Firestore Timestamp, ISO string, or epoch number to a JS Date */
    private toSafeDate(value: any): Date {
        if (!value) return new Date();
        if (typeof value?.toDate === 'function') return value.toDate();
        if (typeof value === 'string') return new Date(value);
        if (typeof value === 'number') return new Date(value);
        if (value instanceof Date) return value;
        return new Date();
    }

    // Delete a save
    async deleteSave(saveId: string): Promise<void> {
        const userId = this.getCurrentUserId();
        const saveRef = doc(db, 'users', userId, 'saves', saveId);
        return this.writeQueue.enqueue(async () => {
            await deleteDoc(saveRef);
            console.log('Save deleted:', saveId);
        });
    }

    // Format play time for display
    formatPlayTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    // ========== REAL-TIME SYNC METHODS ==========

    private currentSaveId: string | null = null;
    private updateDebounceTimer: NodeJS.Timeout | null = null;
    private pendingUpdates: Partial<CharacterSheet> = {};
    // Audit 2026-08-12 — champs critiques (PV/XP…) écrits en immédiat, ré-appliqués
    // PAR-DESSUS toute fiche complète fusionnée ensuite : une fiche périmée passée à
    // updateCharacter() 500 ms après un updateCharacterCritical() re-poussait
    // l'ancien PV dans Firestore. Vidé à chaque flush réussi.
    private criticalOverlay: Partial<CharacterSheet> = {};

    // Set the current save ID for real-time updates
    setCurrentSave(saveId: string) {
        this.currentSaveId = saveId;
        console.log('📍 Active save set:', saveId);
    }

    getCurrentSaveId(): string | null {
        return this.currentSaveId;
    }

    // Update character in real-time (debounced 500ms)
    async updateCharacter(character: CharacterSheet): Promise<void> {
        if (!this.currentSaveId) {
            console.warn('⚠️ No active save - character update not persisted');
            return;
        }

        // Merge with pending updates — les valeurs critiques récentes GAGNENT
        // sur une fiche complète potentiellement périmée (voir criticalOverlay).
        this.pendingUpdates = { ...this.pendingUpdates, ...character, ...this.criticalOverlay };

        // Clear existing timer
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }

        // Debounce: wait 500ms before actually writing
        this.updateDebounceTimer = setTimeout(async () => {
            this.writeQueue.enqueue(async () => {
                if (!this.currentSaveId) return;
                // Contre-audit 2026-08-13 (SP3 + garde objet vide) — capturer le batch
                // AVANT l'écriture : (a) les updates arrivées pendant le setDoc en vol ne
                // sont plus effacées par le `= {}` post-await ; (b) un batch VIDE n'écrit
                // plus `character: {}` — avec merge:true, Firestore REMPLACERAIT toute la
                // map `character` par une map vide (fiche effacée côté serveur).
                const batch = { ...this.pendingUpdates, ...this.criticalOverlay };
                if (Object.keys(batch).length === 0) return;
                this.pendingUpdates = {};
                try {
                    const userId = this.getCurrentUserId();
                    const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId);

                    await setDoc(saveRef, this.sanitize({
                        character: batch,
                        updatedAt: Timestamp.now(),
                    }), { merge: true });

                    console.log('✅ Character synced:', {
                        xp: batch.xp,
                        hp: batch.hp,
                        gold: batch.gold,
                    });
                    this.criticalOverlay = {};
                    this.reportSync(true);
                } catch (error) {
                    // Ré-injecte le batch (sous les updates plus récentes) pour le prochain flush.
                    this.pendingUpdates = { ...batch, ...this.pendingUpdates };
                    console.error('❌ Character sync failed:', error);
                    this.reportSync(false);
                }
            });
        }, 500);
    }

    // Immediately sync character (bypass debounce)
    async updateCharacterImmediate(character: CharacterSheet): Promise<void> {
        if (!this.currentSaveId) return;

        // Clear pending
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }
        this.pendingUpdates = {};
        this.criticalOverlay = {};

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    character,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('✅ Character sync (immediate)');
                this.reportSync(true);
            } catch (error) {
                console.error('❌ Immediate sync failed:', error);
                this.reportSync(false);
            }
        });
    }

    // Flush pending character updates immediately (use before leaving session)
    async flushCharacter(): Promise<void> {
        if (!this.currentSaveId) return;

        // Only flush if there are pending updates
        if (Object.keys(this.pendingUpdates).length === 0) return;

        // Clear timer
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
            this.updateDebounceTimer = null;
        }

        return this.writeQueue.enqueue(async () => {
            // Même patron que le flush débouncé : capture avant écriture + garde vide
            // (une écriture `character: {}` avec merge:true effacerait la fiche).
            const batch = { ...this.pendingUpdates, ...this.criticalOverlay };
            if (Object.keys(batch).length === 0) return;
            this.pendingUpdates = {};
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    character: batch,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                    console.log('📤 Character flushed:', {
                    level: batch.level,
                    xp: batch.xp,
                    hp: batch.hp,
                });
                this.criticalOverlay = {};
                this.reportSync(true);
            } catch (error) {
                this.pendingUpdates = { ...batch, ...this.pendingUpdates };
                console.error('❌ Character flush failed:', error);
                this.reportSync(false);
            }
        });
    }

    // Flush ALL pending updates (character + journal) - use before leaving session
    async flushAll(): Promise<void> {
        await Promise.all([
            this.flushCharacter(),
            this.flushJournal(),
        ]);
        console.log('📤 All pending updates flushed');
    }

    // ========== CRITICAL SYNC (NO DEBOUNCE - USE FOR HP CHANGES) ==========

    // Update HP immediately without debounce - prevents data loss on browser close
    async updateCharacterCritical(updates: {
        hp?: { current: number; max: number };
        tempHP?: number;
        xp?: number;
        level?: number;
        deathSaves?: CharacterSheet['deathSaves'];
        activeEffects?: CharacterSheet['activeEffects'];
        resources?: CharacterSheet['resources'];
        spellSlots?: CharacterSheet['spellSlots'];
        hitDice?: CharacterSheet['hitDice'];
        storyModifiers?: CharacterSheet['storyModifiers'];
    }): Promise<void> {
        if (!this.currentSaveId) {
            console.warn('⚠️ No active save - critical update not persisted');
            return;
        }

        // Also merge with pending updates to ensure consistency
        this.pendingUpdates = { ...this.pendingUpdates, ...updates };

        const characterPatch: Partial<CharacterSheet> = {};
        if (updates.hp !== undefined) characterPatch.hp = updates.hp;
        if (updates.tempHP !== undefined) characterPatch.tempHP = updates.tempHP;
        if (updates.xp !== undefined) characterPatch.xp = updates.xp;
        if (updates.level !== undefined) characterPatch.level = updates.level;
        if (updates.deathSaves !== undefined) characterPatch.deathSaves = updates.deathSaves;
        if (updates.activeEffects !== undefined) characterPatch.activeEffects = updates.activeEffects;
        if (updates.resources !== undefined) characterPatch.resources = updates.resources;
        if (updates.spellSlots !== undefined) characterPatch.spellSlots = updates.spellSlots;
        if (updates.hitDice !== undefined) characterPatch.hitDice = updates.hitDice;
        if (updates.storyModifiers !== undefined) characterPatch.storyModifiers = updates.storyModifiers;
        // Ces valeurs restent prioritaires sur toute fiche complète fusionnée
        // plus tard (fenêtre de 500 ms du debounce) — audit 2026-08-12.
        this.criticalOverlay = { ...this.criticalOverlay, ...characterPatch };

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    character: characterPatch,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('🔴 CRITICAL sync (immediate):', updates);
                this.reportSync(true);
            } catch (error) {
                console.error('❌ Critical sync failed:', error);
                this.reportSync(false);
            }
        });
    }

    // ========== JOURNAL SYNC (DEBOUNCED) ==========

    private journalDebounceTimer: NodeJS.Timeout | null = null;
    private pendingJournal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        // OU1 — steps : la checklist vivante d'update_quest_step doit survivre
        // au rechargement (elle était jetée par les mappings de sauvegarde).
        // createdAt/completedAt sont des ISO strings depuis add_quest ; le type
        // annonçait `number` alors que rien n'en écrivait jamais un.
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed'; steps?: { id: string; text: string; done: boolean }[]; createdAt?: string | number | null; completedAt?: string | number | null }[];
        npcs: { id: string; name: string; description: string; location: string; disposition?: number; knownFacts?: string[]; lastSeenAt?: number; createdAt?: number | null }[];
        locations: { id: string; name: string; description: string }[];
        chronicle: { id: string; title: string; description: string; timestamp: number }[];
    } | null = null;

    // Update journal with debouncing (2 second delay to batch multiple updates)
    updateJournalDebounced(journal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string; disposition?: number; knownFacts?: string[]; lastSeenAt?: number }[];
        locations?: { id: string; name: string; description: string }[];
        chronicle?: { id: string; title: string; description: string; timestamp: number }[];
    }): void {
        if (!this.currentSaveId) {
            console.warn('⚠️ No active save - journal update not persisted');
            return;
        }

        // Merge with pending journal (accumulate changes). briefing is set once at
        // creation and never edited in play — preserve it so a journal update can't wipe it.
        this.pendingJournal = {
            briefing: journal.briefing ?? this.pendingJournal?.briefing,
            quests: journal.quests,
            npcs: journal.npcs || this.pendingJournal?.npcs || [],
            locations: journal.locations || this.pendingJournal?.locations || [],
            chronicle: journal.chronicle || this.pendingJournal?.chronicle || [],
        };

        // Clear existing timer
        if (this.journalDebounceTimer) {
            clearTimeout(this.journalDebounceTimer);
        }

        // Debounce: wait 2 seconds before writing (batch multiple tag updates)
        this.journalDebounceTimer = setTimeout(async () => {
            if (!this.pendingJournal || !this.currentSaveId) return;

            this.writeQueue.enqueue(async () => {
                if (!this.pendingJournal || !this.currentSaveId) return;
                try {
                    const userId = this.getCurrentUserId();
                    const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId);

                    await setDoc(saveRef, this.sanitize({
                        journal: this.pendingJournal,
                        updatedAt: Timestamp.now(),
                    }), { merge: true });

                    console.log('📜 Journal synced (debounced):',
                        this.pendingJournal.quests.length, 'quests,',
                        this.pendingJournal.npcs.length, 'NPCs,',
                        this.pendingJournal.locations.length, 'locations,',
                        this.pendingJournal.chronicle.length, 'chronicle entries'
                    );
                    this.pendingJournal = null;
                    this.reportSync(true);
                } catch (error) {
                    console.error('❌ Journal sync failed:', error);
                    this.reportSync(false);
                }
            });
        }, 2000); // 2 second debounce
    }

    // Legacy immediate sync (for backward compatibility)
    async updateJournal(journal: {
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string; disposition?: number; knownFacts?: string[]; lastSeenAt?: number }[];
        locations?: { id: string; name: string; description: string }[];
    }): Promise<void> {
        // Use debounced version now
        this.updateJournalDebounced(journal);
    }

    // Force immediate journal sync (bypass debounce - use on disconnect/save)
    async flushJournal(): Promise<void> {
        if (this.journalDebounceTimer) {
            clearTimeout(this.journalDebounceTimer);
            this.journalDebounceTimer = null;
        }

        if (!this.pendingJournal || !this.currentSaveId) return;

        return this.writeQueue.enqueue(async () => {
            if (!this.pendingJournal || !this.currentSaveId) return;
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId);

                await setDoc(saveRef, this.sanitize({
                    journal: this.pendingJournal,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('📜 Journal flushed immediately');
                this.pendingJournal = null;
                this.reportSync(true);
            } catch (error) {
                console.error('❌ Journal flush failed:', error);
                this.reportSync(false);
            }
        });
    }

    // Update journal immediately without debounce (use for quest additions)
    async updateJournalImmediate(journal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string; disposition?: number; knownFacts?: string[]; lastSeenAt?: number }[];
        locations?: { id: string; name: string; description: string }[];
        chronicle?: { id: string; title: string; description: string; timestamp: number }[];
    }): Promise<void> {
        if (!this.currentSaveId) {
            console.warn('⚠️ No active save - journal update not persisted');
            return;
        }

        // Clear any pending debounced update
        if (this.journalDebounceTimer) {
            clearTimeout(this.journalDebounceTimer);
            this.journalDebounceTimer = null;
        }
        this.pendingJournal = null;

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                const fullJournal = {
                    briefing: journal.briefing,
                    quests: journal.quests,
                    npcs: journal.npcs || [],
                    locations: journal.locations || [],
                    chronicle: journal.chronicle || [],
                };

                await setDoc(saveRef, this.sanitize({
                    journal: fullJournal,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('📜 Journal synced immediately:', fullJournal.quests.length, 'quests');
                this.reportSync(true);
            } catch (error) {
                console.error('❌ Immediate journal sync failed:', error);
                this.reportSync(false);
            }
        });
    }

    async updateCampaignRuntime(campaignRuntime: CampaignRuntimeState, events?: unknown[]): Promise<void> {
        if (!this.currentSaveId) {
            console.warn('No active save - campaign runtime update not persisted');
            return;
        }

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    campaignRuntime,
                    ...(events ? { events } : {}),
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('Campaign runtime synced');
                this.reportSync(true);
            } catch (error) {
                console.error('Campaign runtime sync failed:', error);
                this.reportSync(false);
            }
        });
    }

    // ========== SUMMARIZATION & ARCHIVING ==========

    // Archive old conversation with summary when 60K token threshold is reached
    async archiveConversation(
        summary: string,
        archivedMessages: { speaker: 'user' | 'dm', text: string }[],
        characterName: string
    ): Promise<void> {
        if (!this.currentSaveId) return;

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const archiveId = `archive_${Date.now()}`;
                const archiveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!, 'archives', archiveId);

                await setDoc(archiveRef, {
                    id: archiveId,
                    summary,
                    messageCount: archivedMessages.length,
                    archivedAt: Timestamp.now(),
                    characterName,
                    // Store first and last message for context
                    firstMessage: archivedMessages[0]?.text.substring(0, 200) || '',
                    lastMessage: archivedMessages[archivedMessages.length - 1]?.text.substring(0, 200) || '',
                });

                console.log('📚 Conversation archived:', archiveId, `(${archivedMessages.length} messages)`);
            } catch (error) {
                console.error('❌ Archive failed:', error);
            }
        });
    }

    // Fetch the most recent archived summary for a save — used to rehydrate the
    // long-term memory cache after a reload on a fresh device/localStorage.
    /** La dernière archive : son résumé ET sa date (C2 — « le plus récent
     *  gagne » entre le cache local et Firestore, voir memoryManager). */
    async loadLatestArchive(saveId?: string): Promise<{ summary: string; archivedAt: number } | null> {
        const id = saveId || this.currentSaveId;
        if (!id) return null;
        try {
            const userId = this.getCurrentUserId();
            const archivesRef = collection(db, 'users', userId, 'saves', id, 'archives');
            const q = query(archivesRef, orderBy('archivedAt', 'desc'), limit(1));
            const snapshot = await getDocs(q);
            const data = snapshot.docs[0]?.data();
            const summary = data?.summary;
            const archivedAt = typeof data?.archivedAt?.toMillis === 'function' ? data.archivedAt.toMillis() : 0;
            return typeof summary === 'string' && summary.trim() ? { summary, archivedAt } : null;
        } catch (error) {
            console.error('❌ Archive summary load failed:', error);
            return null;
        }
    }

    // Add NPC conversation summary to journal
    async addNPCConversation(npc: {
        id: string;
        name: string;
        description: string;
        location: string;
        lastConversation?: string;
        conversationSummary?: string;
    }): Promise<void> {
        if (!this.currentSaveId) return;

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                // Get current journal
                const saveDoc = await getDoc(saveRef);
                const currentJournal = saveDoc.data()?.journal || { quests: [], npcs: [], locations: [] };

                // Update or add NPC
                const existingIndex = currentJournal.npcs.findIndex((n: any) => n.name.toLowerCase() === npc.name.toLowerCase());
                if (existingIndex >= 0) {
                    currentJournal.npcs[existingIndex] = { ...currentJournal.npcs[existingIndex], ...npc };
                } else {
                    currentJournal.npcs.push(npc);
                }

                await setDoc(saveRef, this.sanitize({
                    journal: currentJournal,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('👤 NPC conversation saved:', npc.name);
            } catch (error) {
                console.error('❌ NPC save failed:', error);
            }
        });
    }
}

export const saveService = new SaveService();
