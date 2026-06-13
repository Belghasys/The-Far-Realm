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
const TOKEN_THRESHOLD = 60000; // 60K tokens
const PURGE_KEEP_PERCENT = 0.20; // Keep last 20%
const CHARS_PER_TOKEN = 4; // Approximate
const SUMMARY_REGEN_THRESHOLD = 50; // Regenerate summary after 50 new messages

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
            const stored = localStorage.getItem(this.summaryKey()) || localStorage.getItem(SUMMARY_CACHE_KEY);
            return stored ? JSON.parse(stored) : null;
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

    /** Returns true if we need to regenerate the summary (too many new messages since last one) */
    shouldRegenerateSummary(): boolean {
        if (!this.cachedSummary) return true;
        const newMessages = this.memory.chatHistory.length - this.cachedSummary.messageCount;
        return newMessages >= SUMMARY_REGEN_THRESHOLD;
    }

    // Load from localStorage
    private loadFromStorage(): ShortTermMemory {
        try {
            const stored = localStorage.getItem(this.storageKey()) || localStorage.getItem(STORAGE_KEY);
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

    // Get formatted context string for LLM
    getContextForLLM(): string {
        return this.memory.chatHistory
            .map(m => `${m.speaker.toUpperCase()}: ${m.text}`)
            .join('\n');
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

        const history = this.memory.chatHistory;
        const keepCount = Math.ceil(history.length * PURGE_KEEP_PERCENT);
        const toArchive = history.slice(0, history.length - keepCount);
        const toKeep = history.slice(-keepCount);

        // Generate summary of archived content
        const archiveText = toArchive.map(m => `${m.speaker}: ${m.text}`).join('\n');
        let summary = '';

        try {
            summary = await summarize(archiveText);
            log.info('📝 Summary generated:', summary.substring(0, 100) + '...');
        } catch (e) {
            log.error('Failed to generate summary:', e);
            // Keep a simple fallback summary
            summary = `[Archived ${toArchive.length} messages from conversation]`;
        }

        // Update memory
        this.memory.chatHistory = toKeep;
        this.memory.tokenCount = toKeep.reduce((acc, m) => acc + this.countTokens(m.text), 0);
        this.saveToStorage();

        log.info(`✅ Memory purged: ${toArchive.length} archived, ${toKeep.length} kept, ${this.memory.tokenCount} tokens remaining`);

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
            const revIndex = [...data.transcript].reverse().findIndex(m => m.text && m.text.includes('📚'));
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
