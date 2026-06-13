import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';
import { AdventureManifest, CampaignRuntimeState, CharacterSheet } from '../types';
import type { CampaignEvent } from './campaignEventLog';

// Minimal Combatant interface for GameSave, as requested
interface Combatant {
    id: string;
    name: string;
    initiative: number;
    isPlayer: boolean;
    hp?: { current: number; max: number };
    ac?: number;
}

export interface GameSave {
    id: string;
    createdAt: Date;
    updatedAt: Date;
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
    };
    // Parsed Adventure Manifest
    manifest?: AdventureManifest;

    // Durable campaign director state: chapter, scene, branches, clocks, canon
    campaignRuntime?: CampaignRuntimeState;

    // Full journal (briefing/prologue, quests, NPCs, locations, chronicle)
    journal?: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs: { id: string; name: string; description: string; location: string }[];
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

    // Recursive function to remove undefined values before Firestore sync.
    private sanitize(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map(v => this.sanitize(v));
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
                    .filter(([_, v]) => v !== undefined)
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
            const now = Timestamp.now();
            if (immediate) {
                // Omit createdAt → merge:true keeps whatever is already stored.
                await setDoc(saveRef, this.sanitize({ ...gameState, updatedAt: now }), { merge: true });
                return saveId;
            }
            const saveDoc = await getDoc(saveRef);
            const createdAt = saveDoc.exists() ? (saveDoc.data().createdAt || now) : now;

            const payload = this.sanitize({
                ...gameState,
                createdAt,
                updatedAt: now,
            });

            await setDoc(saveRef, payload, { merge: true });
            console.log(`✅ Game saved (${isAuto ? 'auto' : 'manual'}):`, saveId);
            return saveId;
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

        const data = saveDoc.data();
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
            const lastMessage = transcript.length > 0
                ? transcript[transcript.length - 1].text.substring(0, 50) + '...'
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

        // Merge with pending updates
        this.pendingUpdates = { ...this.pendingUpdates, ...character };

        // Clear existing timer
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }

        // Debounce: wait 500ms before actually writing
        this.updateDebounceTimer = setTimeout(async () => {
            this.writeQueue.enqueue(async () => {
                if (!this.currentSaveId) return;
                try {
                    const userId = this.getCurrentUserId();
                    const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId);

                    await setDoc(saveRef, this.sanitize({
                        character: this.pendingUpdates,
                        updatedAt: Timestamp.now(),
                    }), { merge: true });

                    console.log('✅ Character synced:', {
                        xp: this.pendingUpdates.xp,
                        hp: this.pendingUpdates.hp,
                        gold: this.pendingUpdates.gold,
                    });
                    this.pendingUpdates = {};
                } catch (error) {
                    console.error('❌ Character sync failed:', error);
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

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    character,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('✅ Character sync (immediate)');
            } catch (error) {
                console.error('❌ Immediate sync failed:', error);
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
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    character: this.pendingUpdates,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                    console.log('📤 Character flushed:', {
                    level: this.pendingUpdates.level,
                    xp: this.pendingUpdates.xp,
                    hp: this.pendingUpdates.hp,
                });
                this.pendingUpdates = {};
            } catch (error) {
                console.error('❌ Character flush failed:', error);
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

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

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

                await setDoc(saveRef, this.sanitize({
                    character: characterPatch,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('🔴 CRITICAL sync (immediate):', updates);
            } catch (error) {
                console.error('❌ Critical sync failed:', error);
            }
        });
    }

    // ========== JOURNAL SYNC (DEBOUNCED) ==========

    private journalDebounceTimer: NodeJS.Timeout | null = null;
    private pendingJournal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs: { id: string; name: string; description: string; location: string }[];
        locations: { id: string; name: string; description: string }[];
        chronicle: { id: string; title: string; description: string; timestamp: number }[];
    } | null = null;

    // Update journal with debouncing (2 second delay to batch multiple updates)
    updateJournalDebounced(journal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string }[];
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
                } catch (error) {
                    console.error('❌ Journal sync failed:', error);
                }
            });
        }, 2000); // 2 second debounce
    }

    // Legacy immediate sync (for backward compatibility)
    async updateJournal(journal: {
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string }[];
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
            } catch (error) {
                console.error('❌ Journal flush failed:', error);
            }
        });
    }

    // Update journal immediately without debounce (use for quest additions)
    async updateJournalImmediate(journal: {
        briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
        quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
        npcs?: { id: string; name: string; description: string; location: string }[];
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
            } catch (error) {
                console.error('❌ Immediate journal sync failed:', error);
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
            } catch (error) {
                console.error('Campaign runtime sync failed:', error);
            }
        });
    }

    // Update transcript in real-time
    async updateTranscript(transcript: { speaker: 'user' | 'dm', text: string }[]): Promise<void> {
        if (!this.currentSaveId) return;

        return this.writeQueue.enqueue(async () => {
            try {
                const userId = this.getCurrentUserId();
                const saveRef = doc(db, 'users', userId, 'saves', this.currentSaveId!);

                await setDoc(saveRef, this.sanitize({
                    transcript,
                    updatedAt: Timestamp.now(),
                }), { merge: true });

                console.log('💬 Transcript synced:', transcript.length, 'messages');
            } catch (error) {
                console.error('❌ Transcript sync failed:', error);
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
