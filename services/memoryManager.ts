/**
 * Memory Manager Service
 * Handles short-term (localStorage) and coordinates with long-term (Firebase) memory
 * 
 * Key responsibilities:
 * - Store chat history and combat state in localStorage
 * - Count tokens (approximate: 4 chars ≈ 1 token)
 * - Trigger summarization at 60K tokens
 * - Purge old history keeping last 20%
 */

import { saveService } from './saveService';
import { log } from './logger';
import { auditBus } from './auditBus';

// Types
export interface ChatMessage {
    speaker: 'user' | 'dm';
    text: string;
    timestamp: number;
}

export interface CombatStateSnapshot {
    isActive: boolean;
    combatants: {
        id: string;
        name: string;
        initiative: number;
        isPlayer: boolean;
        side?: 'player' | 'ally' | 'enemy';
        hp?: { current: number; max: number };
        ac?: number;
    }[];
    currentTurn: string;
    positions?: Record<string, string>;
    // Continuity fields so a mid-combat reload restores round/turn/economy/targeting.
    round?: number;
    turnIndex?: number;
    actionEconomy?: Record<string, any>;
    enemyIntents?: Record<string, string>;
    lastTurnSnapshot?: {
        isPlayerTurn: boolean;
        combatantId: string;
        combatantName: string;
        movementRemaining: number;
        movementMax: number;
        actionUsed: boolean;
    } | null;
}

export interface ShortTermMemory {
    chatHistory: ChatMessage[];
    combatState: CombatStateSnapshot | null;
    tokenCount: number;
    lastSaved: number;
    saveId: string | null;
}

// Constants
const STORAGE_KEY = 'dnd_short_term_memory';
const SUMMARY_CACHE_KEY = 'dnd_summary_cache';
// 15K ≈ 1h30-2h30 de jeu vocal : le grand résumé se rafraîchit EN COURS de
// soirée. L'ancien seuil 60K (~8-10 h) ne se déclenchait presque jamais — le
// résumé cumulatif n'existait pas pour la plupart des parties (audit trame).
const TOKEN_THRESHOLD = 15000;
// 30 % conservés mot pour mot (~30-40 min de dialogue au seuil 15K) : le MJ
// garde le fil immédiat, le résumé + digests + campaign log portent le reste.
const PURGE_KEEP_PERCENT = 0.30;
// French runs ~3.3 chars/token (vs ~4 for English); using 4 under-counted and
// fired the purge too late on FR campaigns. 3.5 is a safe bilingual middle.
const CHARS_PER_TOKEN = 3.5;

class MemoryManager {
    private memory: ShortTermMemory;
    private cachedSummary: { text: string; messageCount: number } | null = null;
    private userId = 'anonymous';
    private activeSaveId: string | null = null;

    constructor() {
        this.memory = this.loadFromStorage();
        this.cachedSummary = this.loadSummaryCache();
    }

    private storageKey(): string {
        return `${STORAGE_KEY}:${this.userId}:${this.activeSaveId || 'no-save'}`;
    }

    private summaryKey(): string {
        return `${SUMMARY_CACHE_KEY}:${this.userId}:${this.activeSaveId || 'no-save'}`;
    }

    private loadSummaryCache(): { text: string; messageCount: number } | null {
        try {
            const scoped = localStorage.getItem(this.summaryKey());
            if (scoped) return JSON.parse(scoped);
            // TP6 — clé héritée non scopée : migrer PUIS la supprimer, sinon
            // toute nouvelle campagne hérite du résumé d'une ancienne.
            const legacy = localStorage.getItem(SUMMARY_CACHE_KEY);
            if (legacy) {
                localStorage.removeItem(SUMMARY_CACHE_KEY);
                return JSON.parse(legacy);
            }
            return null;
        } catch { return null; }
    }

    private saveSummaryCache(): void {
        try {
            if (this.cachedSummary) {
                localStorage.setItem(this.summaryKey(), JSON.stringify(this.cachedSummary));
            } else {
                localStorage.removeItem(this.summaryKey());
            }
        } catch { /* ignore */ }
    }

    getCachedSummary(): { text: string; messageCount: number } | null {
        return this.cachedSummary;
    }

    setCachedSummary(text: string): void {
        this.cachedSummary = { text, messageCount: this.memory.chatHistory.length };
        this.saveSummaryCache();
    }

    // Load from localStorage
    private loadFromStorage(): ShortTermMemory {
        try {
            let stored = localStorage.getItem(this.storageKey());
            if (!stored) {
                // TP6 — même migration que le résumé : consommer la clé héritée
                // une seule fois (contamination inter-campagnes sinon).
                stored = localStorage.getItem(STORAGE_KEY);
                if (stored) localStorage.removeItem(STORAGE_KEY);
            }
            if (stored) {
                const parsed = JSON.parse(stored);
                log.info('📦 Memory loaded from localStorage:', {
                    messages: parsed.chatHistory?.length || 0,
                    tokens: parsed.tokenCount || 0,
                    combatActive: parsed.combatState?.isActive || false
                });
                return parsed;
            }
        } catch (e) {
            log.error('Failed to load memory from localStorage:', e);
        }

        return this.getEmptyMemory();
    }

    private getEmptyMemory(): ShortTermMemory {
        return {
            chatHistory: [],
            combatState: null,
            tokenCount: 0,
            lastSaved: Date.now(),
            saveId: null
        };
    }

    // Save to localStorage
    private saveToStorage(): void {
        try {
            this.memory.lastSaved = Date.now();
            this.memory.saveId = this.activeSaveId;
            localStorage.setItem(this.storageKey(), JSON.stringify(this.memory));
        } catch (e) {
            log.error('Failed to save memory to localStorage:', e);
        }
    }

    // Token counting
    countTokens(text: string): number {
        return Math.ceil(text.length / CHARS_PER_TOKEN);
    }

    getTotalTokenCount(): number {
        return this.memory.tokenCount;
    }

    // Check if we've exceeded threshold
    shouldSummarize(): boolean {
        return this.memory.tokenCount >= TOKEN_THRESHOLD;
    }

    // Add chat message
    addMessage(message: Omit<ChatMessage, 'timestamp'>): void {
        const fullMessage: ChatMessage = {
            ...message,
            timestamp: Date.now()
        };

        this.memory.chatHistory.push(fullMessage);
        this.memory.tokenCount += this.countTokens(message.text);

        this.saveToStorage();

        // Log token status periodically
        if (this.memory.chatHistory.length % 10 === 0) {
            log.info(`📊 Token count: ${this.memory.tokenCount}/${TOKEN_THRESHOLD}`);
        }
    }

    // Get chat history for LLM context
    getChatHistory(): ChatMessage[] {
        return this.memory.chatHistory;
    }

    // Update combat state
    updateCombatState(state: CombatStateSnapshot | null): void {
        this.memory.combatState = state;
        this.saveToStorage();

        if (state?.isActive) {
            log.info('⚔️ Combat state saved to localStorage');
        }
    }

    // Get combat state
    getCombatState(): CombatStateSnapshot | null {
        return this.memory.combatState;
    }

    // Check if there's active combat to resume
    hasActiveCombat(): boolean {
        return this.memory.combatState?.isActive === true;
    }

    // Purge old messages keeping only last X%
    async purgeAndSummarize(summarize: (text: string) => Promise<string>): Promise<string | null> {
        if (!this.shouldSummarize()) {
            return null;
        }

        log.info('🔄 Purging memory - threshold exceeded');

        // TP5 (corrigé pour de vrai) — `history` est une RÉFÉRENCE au tableau
        // vivant : addMessage push dessus pendant l'await du résumé, donc sa
        // .length bouge. L'ancienne version faisait `slice(history.length)` en
        // aval → toujours [] → les répliques arrivées pendant le résumé étaient
        // perdues. On fige la longueur MAINTENANT et on découpe sur ce nombre.
        const history = this.memory.chatHistory;
        const snapshotLen = history.length;
        const keepCount = Math.ceil(snapshotLen * PURGE_KEEP_PERCENT);
        const toArchive = history.slice(0, snapshotLen - keepCount);
        const toKeep = history.slice(snapshotLen - keepCount, snapshotLen);

        // Generate summary of archived content. Summarize FIRST and only purge
        // on success: purging with a stub summary turned one API hiccup
        // (offline, quota) into permanent campaign amnesia.
        const archiveText = toArchive.map(m => `${m.speaker}: ${m.text}`).join('\n');
        let summary: string;

        try {
            summary = await summarize(archiveText);
        } catch (e) {
            log.error('Failed to generate summary — purge skipped, will retry next autosave:', e);
            return null;
        }
        if (!summary || !summary.trim()) {
            log.warn('Empty summary returned — purge skipped, will retry next autosave.');
            return null;
        }
        log.info('📝 Summary generated:', summary.substring(0, 100) + '...');

        // Update memory — tout ce qui a été poussé APRÈS le snapshot survit.
        const arrivedDuringSummary = this.memory.chatHistory.slice(snapshotLen);
        this.memory.chatHistory = [...toKeep, ...arrivedDuringSummary];
        this.memory.tokenCount = this.memory.chatHistory.reduce((acc, m) => acc + this.countTokens(m.text), 0);
        this.saveToStorage();

        log.info(`✅ Memory purged: ${toArchive.length} archived, ${toKeep.length} kept, ${this.memory.tokenCount} tokens remaining`);
        // Traçabilité (journal de session) : chaque purge est un moment où de
        // la mémoire brute disparaît — on consigne quoi et combien.
        auditBus.publish('engine',
            `Purge mémoire : ${toArchive.length} répliques archivées → résumé ${summary.length} chars, ${toKeep.length} gardées`,
            { archived: toArchive.length, kept: toKeep.length, arrivedDuringSummary: arrivedDuringSummary.length, tokensRemaining: this.memory.tokenCount });

        return summary;
    }

    // Clear all memory (new adventure)
    clear(): void {
        this.memory = this.getEmptyMemory();
        this.saveToStorage();
        // Also clear the summary cache so new adventure gets a fresh context
        this.cachedSummary = null;
        localStorage.removeItem(this.summaryKey());
        log.info('🗑️ Memory cleared (including summary cache)');
    }

    setUserId(userId: string | null): void {
        this.saveToStorage();
        this.userId = userId || 'anonymous';
        this.activeSaveId = null;
        this.memory = this.loadFromStorage();
        this.cachedSummary = this.loadSummaryCache();
    }

    // Set save ID for Firebase sync
    setSaveId(saveId: string): void {
        const previousMemory = this.memory;
        this.saveToStorage();
        this.activeSaveId = saveId;
        const loadedMemory = this.loadFromStorage();
        const shouldCarryCurrentSession = !previousMemory.saveId
            && previousMemory.chatHistory.length > 0
            && loadedMemory.chatHistory.length === 0;
        this.memory = shouldCarryCurrentSession
            ? { ...previousMemory, saveId }
            : { ...loadedMemory, saveId };
        this.cachedSummary = shouldCarryCurrentSession ? this.cachedSummary : this.loadSummaryCache();
        this.saveToStorage();
    }

    getSaveId(): string | null {
        return this.memory.saveId;
    }

    // Export for Firebase save
    exportForSave(): { chatHistory: ChatMessage[]; combatState: CombatStateSnapshot | null } {
        return {
            chatHistory: this.memory.chatHistory,
            combatState: this.memory.combatState
        };
    }

    // Import from Firebase load
    importFromSave(data: { transcript?: { speaker: 'user' | 'dm'; text: string }[]; combat?: any }): void {
        if (data.transcript) {
            // TP14 — préfixe STRICT du marqueur d'archive : un simple 📚 dans une
            // réplique du MJ (« la bibliothèque 📚… ») tronquait tout l'historique.
            const revIndex = [...data.transcript].reverse().findIndex(m => m.text && m.text.trim().startsWith('📚 ['));
            // Keep the messages AFTER the last 📚 archive marker (everything before
            // it is already summarized). Edge case: if the marker is the LAST message
            // (a save taken right after archiving, with no live tail yet), the slice
            // would be EMPTY → total context loss on reload. Fall back to the recent
            // tail of the full transcript so the DM never reloads with zero history.
            let actualTranscript = revIndex >= 0
                ? data.transcript.slice(data.transcript.length - revIndex)
                : data.transcript;
            if (actualTranscript.length === 0) {
                actualTranscript = data.transcript.slice(-14);
            }

            this.memory.chatHistory = actualTranscript.map((m, i) => ({
                ...m,
                timestamp: Date.now() - (actualTranscript.length - i) * 1000
            }));
            this.memory.tokenCount = this.memory.chatHistory.reduce(
                (acc, m) => acc + this.countTokens(m.text), 0
            );
        }

        if (data.combat?.isActive) {
            this.memory.combatState = data.combat;
        }

        this.saveToStorage();
        log.info('📥 Memory imported from save');
    }
}

// Singleton instance
export const memoryManager = new MemoryManager();
