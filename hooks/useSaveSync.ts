import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AdventureManifest, CampaignRuntimeState, CharacterSheet } from '../types';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { ChatMessage } from './useTranscript';

// Firestore hard-caps a document at 1 MiB. A long campaign's transcript + event
// log can blow past that, which makes the ENTIRE setDoc throw — losing the whole
// save, not just the overflow. We trim the OLDEST entries to a safe byte budget
// before writing; long-term continuity is preserved by the AI summary, archived
// conversations and the director context, not this inline transcript.
const roughBytes = (v: any): number => { try { return JSON.stringify(v).length; } catch { return 0; } };
function capByByteBudget<T>(items: T[], budget: number): T[] {
    if (!Array.isArray(items) || items.length === 0) return items;
    const out: T[] = [];
    let used = 0;
    // Walk newest → oldest, keeping the tail (most recent) that fits the budget.
    for (let i = items.length - 1; i >= 0; i--) {
        const sz = roughBytes(items[i]) + 2; // +2 ≈ array comma/bracket overhead
        if (used + sz > budget && out.length > 0) break;
        out.unshift(items[i]);
        used += sz;
    }
    return out;
}

interface UseSaveSyncProps {
    saveId?: string;
    character: CharacterSheet;
    adventure: string;
    adventureManifest: string;
    adventureManifestData: AdventureManifest | null;
    campaignRuntime: CampaignRuntimeState;
    transcript: ChatMessage[];
    combatState: any;       // Uses 'any' here to avoid circular/complex dependencies for now
    journal: any;
    language: string;
    setTranscript: Dispatch<SetStateAction<ChatMessage[]>>;
    setJournal: Dispatch<SetStateAction<any>>;
    onCharacterUpdate: (char: CharacterSheet) => void;
}

export function useSaveSync({
    saveId,
    character,
    adventure,
    adventureManifest,
    adventureManifestData,
    campaignRuntime,
    transcript,
    combatState,
    journal,
    language,
    setTranscript,
    setJournal,
    onCharacterUpdate
}: UseSaveSyncProps) {
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const npcSyncSet = useRef(new Set<string>());

    const buildManifestPayload = (data: any): AdventureManifest | undefined => {
        if (data.adventureManifestData) return data.adventureManifestData;
        if (!data.adventureManifest) return undefined;
        return {
            villain: {
                name: 'Unknown',
                archetype: 'Unknown',
                description: 'Legacy manifesto loaded without parsed metadata.',
                secret: 'Unknown',
            },
            chapters: [],
            introduction: '',
            fullManifesto: data.adventureManifest,
        };
    };

    // ── FIX N2: Consolidate save payload logic ───────────────────────────
    const buildSavePayload = (data: any) => {
        return {
            adventure: data.adventure,
            adventureTitle: data.adventure === 'ARENA_MODE' ? 'Arena Combat' : data.adventure,
            character: data.character,
            // Bound transcript + events so a long campaign never exceeds Firestore's
            // 1 MiB document cap (which would fail the whole save). Newest entries win.
            transcript: capByByteBudget<any>(data.transcript || [], 550_000),
            events: capByByteBudget<any>(campaignEventLog.getEvents() || [], 200_000),
            manifest: buildManifestPayload(data),
            campaignRuntime: data.campaignRuntime,
            ...(data.combatState?.isActive ? {
                combat: {
                    isActive: true,
                    combatants: data.combatState.combatants,
                    currentTurn: data.combatState.currentTurn,
                    logs: data.combatState.logs || [],
                    round: data.combatState.round,
                    turnIndex: data.combatState.turnIndex,
                    actionEconomy: data.combatState.actionEconomy,
                    enemyIntents: data.combatState.enemyIntents,
                }
            } : {}),
            journal: {
                briefing: data.journal.briefing,
                quests: (data.journal.quests || []).map((q: any) => ({
                    id: q.id, title: q.title, description: q.description, status: q.status
                })),
                npcs: (data.journal.npcs || []).map((n: any) => ({
                    id: n.id, name: n.name, description: n.description, location: n.location
                })),
                locations: data.journal.locations || [],
                chronicle: data.journal.chronicle || []
            },
            language: data.language,
            playTime: 0 // Could be tracked if needed
        };
    };

    // Use refs to avoid re-triggering the interval
    const latestData = useRef({
        character, adventure, adventureManifest, adventureManifestData, campaignRuntime, transcript, combatState, journal, language, setTranscript, setJournal
    });

    // Keep refs updated
    useEffect(() => {
        latestData.current = {
            character, adventure, adventureManifest, adventureManifestData, campaignRuntime, transcript, combatState, journal, language, setTranscript, setJournal
        };
    }, [character, adventure, adventureManifest, adventureManifestData, campaignRuntime, transcript, combatState, journal, language, setTranscript, setJournal]);

    useEffect(() => {
        if (saveId) {
            saveService.setCurrentSave(saveId);
            memoryManager.setSaveId(saveId);
            campaignEventLog.setCampaignId(saveId);
            console.log('📍 Active save set for real-time sync:', saveId);
        }

        // Flush pending saves before browser unload/visibility loss.
        // Browsers do not await async work here, so we start both the debounced
        // critical flush and a full save payload while the page is still alive.
        const flushLatestState = () => {
            void saveService.flushAll();
            const data = latestData.current;
            if (data?.character) {
                // immediate=true: single direct setDoc (no readback, no queue) so the
                // write has a chance to land before the tab is torn down.
                void saveService.saveGame(buildSavePayload(data), false, undefined, true);
            }
        };
        const handleBeforeUnload = () => {
            flushLatestState();
        };
        const handlePageHide = () => {
            flushLatestState();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flushLatestState();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [saveId]);

    // AUTOSAVE every 60 seconds
    useEffect(() => {
        const AUTOSAVE_INTERVAL = 60000;

        const autosaveInterval = setInterval(async () => {
            const data = latestData.current;

            if (data.transcript.length === 0) return;
            if (isSavingRef.current) return;

            isSavingRef.current = true;
            setIsSaving(true);
            console.log('💾 Autosaving game (every 60s)...');

            try {
                // Sync to localStorage
                if (data.combatState.isActive) {
                    memoryManager.updateCombatState({
                        isActive: data.combatState.isActive,
                        combatants: data.combatState.combatants,
                        currentTurn: data.combatState.currentTurn,
                        round: data.combatState.round,
                        turnIndex: data.combatState.turnIndex,
                        actionEconomy: data.combatState.actionEconomy,
                        enemyIntents: data.combatState.enemyIntents,
                    });
                } else {
                    memoryManager.updateCombatState(null);
                }

                // CHECK 60K TOKEN THRESHOLD - Trigger AI summarization if needed
                if (memoryManager.shouldSummarize()) {
                    console.log('⚠️ Token threshold reached! Triggering AI summarization...');
                    try {
                        const { summarizeHistory } = await import('../services/llmService');
                        const summary = await memoryManager.purgeAndSummarize(async (text) => {
                            const messages = text.split('\n')
                                .filter(l => l.trim())
                                .map(line => {
                                    const [speaker, ...rest] = line.split(':');
                                    return {
                                        speaker: speaker.toLowerCase().includes('user') ? 'user' as const : 'dm' as const,
                                        text: rest.join(':').trim()
                                    };
                                });
                            return await summarizeHistory(messages, data.character.name, data.language);
                        });

                        if (summary) {
                            await saveService.archiveConversation(
                                summary,
                                data.transcript.slice(0, -Math.ceil(data.transcript.length * 0.8)),
                                data.character.name
                            );

                            data.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: '📚 [Mémoire archivée par IA - conversation résumée intelligemment]'
                            }]);
                        }
                    } catch (e) {
                        console.error('❌ AI Summarization failed:', e);
                    }
                }

                // ── FIX N3: De-duplicate NPC detections ──────────────────────
                const recentMessages = data.transcript.slice(-10);
                const npcPattern = /\[NPC_ADD:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)]/g;
                let journalChanged = false;
                let currentNpcs = [...(data.journal?.npcs || [])];

                for (const msg of recentMessages) {
                    if (msg.speaker === 'dm') {
                        let match;
                        while ((match = npcPattern.exec(msg.text)) !== null) {
                            const [fullTag, npcName, description, location] = match;
                            // Only sync if this specific tag occurrence hasn't been synced yet
                            if (!npcSyncSet.current.has(fullTag)) {
                                const newNpc = {
                                    id: `npc_${npcName.toLowerCase().replace(/\s+/g, '_')}`,
                                    name: npcName.trim(),
                                    description: description.trim(),
                                    location: location.trim(),
                                    lastConversation: new Date().toISOString()
                                };
                                await saveService.addNPCConversation(newNpc);
                                npcSyncSet.current.add(fullTag);

                                // Append to local copy to prevent overwrite by buildSavePayload(data)
                                if (!currentNpcs.some((n: any) => n.id === newNpc.id)) {
                                    currentNpcs.push({
                                        id: newNpc.id,
                                        name: newNpc.name,
                                        description: newNpc.description,
                                        location: newNpc.location
                                    });
                                    journalChanged = true;
                                }
                            }
                        }
                    }
                }

                if (journalChanged) {
                    const updatedJournal = {
                        ...(data.journal || {}),
                        npcs: currentNpcs
                    };
                    data.journal = updatedJournal;
                    data.setJournal(updatedJournal);
                }

                // Save to Firestore using common payload builder (N2)
                const payload = buildSavePayload(data);
                await saveService.saveGame(payload, true);

            } catch (err) {
                console.error('Failed to autosave game:', err);
            } finally {
                setIsSaving(false);
                isSavingRef.current = false;
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(autosaveInterval);
    }, []); // Empty deps so it only sets up the interval once!

    const syncCharacterUpdate = (updatedChar: CharacterSheet) => {
        onCharacterUpdate(updatedChar);
        saveService.updateCharacter(updatedChar);
    };

    const syncCharacterCritical = (updatedChar: CharacterSheet, reason: 'hp' | 'xp' | 'level' = 'hp') => {
        onCharacterUpdate(updatedChar);
        saveService.updateCharacterCritical({
            hp: updatedChar.hp,
            xp: updatedChar.xp,
            level: updatedChar.level,
            tempHP: updatedChar.tempHP,
            deathSaves: updatedChar.deathSaves,
            activeEffects: updatedChar.activeEffects,
            resources: updatedChar.resources,
            spellSlots: updatedChar.spellSlots,
            hitDice: updatedChar.hitDice,
            storyModifiers: updatedChar.storyModifiers,
        });
        console.log(`🔄 [SYNC] Critical sync (${reason})`, {
            hp: `${updatedChar.hp.current}/${updatedChar.hp.max}`,
            xp: updatedChar.xp,
            level: updatedChar.level
        });
    };

    const syncJournalUpdate = (updatedJournal: any) => {
        latestData.current.setJournal(updatedJournal);
        saveService.updateJournalDebounced({
            briefing: updatedJournal.briefing,
            quests: updatedJournal.quests.map((q: any) => ({ id: q.id, title: q.title, description: q.description, status: q.status })),
            npcs: updatedJournal.npcs.map((n: any) => ({ id: n.id, name: n.name, description: n.description, location: n.location })),
            locations: (updatedJournal.locations || []).map((l: any) => ({ id: l.id, name: l.name, description: l.description })),
            chronicle: (updatedJournal.chronicle || []).map((c: any) => ({ id: c.id, title: c.title, description: c.description, timestamp: c.timestamp })),
        });
    };

    const syncJournalImmediate = async (updatedJournal: any) => {
        latestData.current.setJournal(updatedJournal);
        await saveService.updateJournalImmediate({
            briefing: updatedJournal.briefing,
            quests: updatedJournal.quests.map((q: any) => ({ id: q.id, title: q.title, description: q.description, status: q.status })),
            npcs: updatedJournal.npcs.map((n: any) => ({ id: n.id, name: n.name, description: n.description, location: n.location })),
            locations: (updatedJournal.locations || []).map((l: any) => ({ id: l.id, name: l.name, description: l.description })),
            chronicle: (updatedJournal.chronicle || []).map((c: any) => ({ id: c.id, title: c.title, description: c.description, timestamp: c.timestamp })),
        });
        return true;
    };

    // Full manual save
    const triggerManualSave = async () => {
        if (isSavingRef.current) return false;
        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const data = latestData.current;
            const payload = buildSavePayload(data);
            await saveService.saveGame(payload, false);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        } finally {
            setIsSaving(false);
            isSavingRef.current = false;
        }
    };

    return {
        syncCharacterUpdate,
        syncCharacterCritical,
        syncJournalUpdate,
        syncJournalImmediate,
        triggerManualSave,
        isSaving
    };
}
