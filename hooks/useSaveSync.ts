import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AdventureManifest, CampaignRuntimeState, CharacterSheet } from '../types';
import { saveService } from '../services/saveService';
import type { SlimManifestPayload } from '../services/manifestTokens';
import { buildSlimManifestPayload } from '../services/manifestHydration';
import { useGameStore } from '../store/gameStore';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { ChatMessage } from './useTranscript';
import { foldText } from '../engine/skillSystem';

// Firestore hard-caps a document at 1 MiB. A long campaign's transcript + event
// log can blow past that, which makes the ENTIRE setDoc throw — losing the whole
// save, not just the overflow. We trim the OLDEST entries to a safe byte budget
// before writing; long-term continuity is preserved by the AI summary, archived
// conversations and the director context, not this inline transcript.
// Contre-audit 2026-08-13 (SP4) — mesurer en OCTETS UTF-8, pas en unités UTF-16 :
// `.length` sous-estime chaque caractère accenté français (2 octets) et emoji
// (4 octets), donc le « budget » pouvait dépasser la limite Firestore réelle.
const utf8 = new TextEncoder();
const roughBytes = (v: any): number => { try { return utf8.encode(JSON.stringify(v)).length; } catch { return 0; } };
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

    const buildManifestPayload = (data: any): AdventureManifest | SlimManifestPayload | undefined => {
        if (data.adventureManifestData) {
            // Campagne d'AUTEUR : persister la forme MINCE (~2 Ko) au lieu du
            // manifeste entier (~220 Ko pour le Chant Brisé = 93 % du plafond
            // Firestore d'1 MiB — une campagne plus grosse faisait échouer
            // TOUTES les sauvegardes en silence). Le manifeste se reconstruit
            // au chargement depuis le gabarit du code (hydrateManifestPayload).
            const slim = buildSlimManifestPayload(
                data.adventure,
                data.adventureManifestData,
                useGameStore.getState().manifestTokens,
            );
            if (slim) return slim;
            return data.adventureManifestData;
        }
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
            // Budgets abaissés (SP4) : mesure désormais en octets réels, et le manifeste
            // des campagnes d'auteur a grossi (~48 Ko de guide rattaché — CP6). Marge
            // visée : manifest ~220 Ko + transcript 450 Ko + events 150 Ko + fiche/journal
            // ≈ 950 Ko < 1 MiB Firestore.
            transcript: capByByteBudget<any>(data.transcript || [], 450_000),
            events: capByByteBudget<any>(campaignEventLog.getEvents() || [], 150_000),
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
                    // Fuyards / redditions : sans ce champ, un rechargement en
                    // plein combat les faisait disparaître (XP, chronique, MJ).
                    departed: data.combatState.departed || [],
                }
            } : {
                // EXPLICITLY overwrite: every write is merge:true, so omitting the
                // key left a finished fight in the save forever — each reload then
                // resumed a ghost combat with mid-fight HP.
                combat: { isActive: false, combatants: [], currentTurn: '' }
            }),
            journal: {
                briefing: data.journal.briefing,
                // OU1 — steps/createdAt inclus : update_quest_step écrivait la
                // checklist puis la sauvegarde la jetait au premier sync.
                quests: (data.journal.quests || []).map((q: any) => ({
                    id: q.id, title: q.title, description: q.description, status: q.status,
                    steps: q.steps || [], createdAt: q.createdAt ?? null
                })),
                npcs: (data.journal.npcs || []).map((n: any) => ({
                    id: n.id, name: n.name, description: n.description, location: n.location,
                    disposition: n.disposition, knownFacts: n.knownFacts, lastSeenAt: n.lastSeenAt,
                    createdAt: n.createdAt ?? null
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

            // Rehydrate long-term memory from the Firestore archives when this
            // device's localStorage has no cached summary (fresh device / cleared
            // storage). Without this, the "story so far" only survives locally.
            if (!memoryManager.getCachedSummary()) {
                void saveService.loadLatestArchiveSummary(saveId).then(summary => {
                    if (summary && !memoryManager.getCachedSummary()) {
                        memoryManager.setCachedSummary(summary);
                        console.log('🧠 Long-term summary rehydrated from Firestore archives');
                    }
                }).catch(() => { /* non-fatal */ });
            }
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
                        const { summarizeHistory, extractCampaignFacts } = await import('../services/dm/llmService');
                        const parseArchivedMessages = (text: string) => text.split('\n')
                            .filter(l => l.trim())
                            .map(line => {
                                const [speaker, ...rest] = line.split(':');
                                return {
                                    speaker: speaker.toLowerCase().includes('user') ? 'user' as const : 'dm' as const,
                                    text: rest.join(':').trim()
                                };
                            });
                        let archivedMessages: { speaker: 'user' | 'dm'; text: string }[] = [];
                        // Cumulative: fold the previous "story so far" into the new summary
                        // so nothing established is lost across successive purges.
                        const previousSummary = memoryManager.getCachedSummary()?.text || '';
                        const summary = await memoryManager.purgeAndSummarize(async (text) => {
                            archivedMessages = parseArchivedMessages(text);
                            return await summarizeHistory(archivedMessages, data.character.name, data.language, previousSummary);
                        });

                        if (summary) {
                            // THE key link: cache the summary so buildSystemPrompt and the
                            // director context can re-inject it (it was generated then dropped).
                            memoryManager.setCachedSummary(summary);

                            await saveService.archiveConversation(
                                summary,
                                data.transcript.slice(0, -Math.ceil(data.transcript.length * 0.8)),
                                data.character.name
                            );

                            data.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: '📚 [Mémoire archivée par IA - conversation résumée intelligemment]'
                            }]);

                            // Fire-and-forget: extract durable facts from the archived segment
                            // and merge them into the campaign runtime + NPC journal, so
                            // continuity does not depend on the live DM having called
                            // update_campaign_runtime at the right moments.
                            void (async () => {
                                try {
                                    const { useGameStore } = await import('../store/gameStore');
                                    const knownFacts = useGameStore.getState().campaignRuntime?.canonFacts || [];
                                    const facts = await extractCampaignFacts(archivedMessages, knownFacts, data.language);
                                    if (!facts) return;

                                    const newFacts = [
                                        ...facts.canonFacts,
                                        ...facts.promises.map(p => `[Promesse] ${p}`),
                                        ...facts.threats.map(t => `[Menace] ${t}`),
                                    ];
                                    if (newFacts.length) {
                                        useGameStore.getState().setCampaignRuntime(prev => {
                                            const seen = new Set((prev.canonFacts || []).map(f => f.toLowerCase()));
                                            const merged = [...(prev.canonFacts || [])];
                                            for (const fact of newFacts) {
                                                if (!seen.has(fact.toLowerCase())) { seen.add(fact.toLowerCase()); merged.push(fact); }
                                            }
                                            return { ...prev, canonFacts: merged.slice(-80), updatedAt: Date.now() };
                                        });
                                        await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                                    }

                                    if (facts.npcUpdates.length) {
                                        // Functional update: extractCampaignFacts awaited for seconds,
                                        // so a plain get-then-set here would clobber any add_npc /
                                        // update_npc the DM ran meanwhile. Merge against the LATEST
                                        // journal (zustand passes it in) so concurrent edits survive.
                                        let changed = false;
                                        latestData.current.setJournal((prev: any) => {
                                            const npcs = [...(prev.npcs || [])];
                                            for (const update of facts.npcUpdates) {
                                                const idx = npcs.findIndex((n: any) => n.name.toLowerCase() === update.name.toLowerCase());
                                                if (idx < 0) continue; // only enrich NPCs the DM already logged
                                                const npc: any = { ...npcs[idx] };
                                                if (update.dispositionDelta) {
                                                    npc.disposition = Math.max(-5, Math.min(5, (npc.disposition || 0) + update.dispositionDelta));
                                                }
                                                if (update.note) {
                                                    npc.knownFacts = [...(npc.knownFacts || []), update.note].slice(-12);
                                                }
                                                if (update.location) npc.location = update.location;
                                                npcs[idx] = npc;
                                                changed = true;
                                            }
                                            return changed ? { ...prev, npcs } : prev;
                                        });
                                        if (changed) {
                                            // zustand set is synchronous → getState() reflects the merge.
                                            saveService.updateJournalDebounced(useGameStore.getState().journal as any);
                                        }
                                    }
                                    console.log('🧠 Facts extracted & merged:', newFacts.length, 'facts,', facts.npcUpdates.length, 'NPC updates');
                                } catch (e) {
                                    console.error('❌ Fact extraction failed:', e);
                                }
                            })();
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
                                npcSyncSet.current.add(fullTag);
                                const newNpc = {
                                    id: `npc_${npcName.toLowerCase().replace(/\s+/g, '_')}`,
                                    name: npcName.trim(),
                                    description: description.trim(),
                                    location: location.trim(),
                                    lastConversation: new Date().toISOString()
                                };
                                // Dédup par NOM plié (accents/casse) ET par id : l'outil
                                // add_npc crée des ids crypto.randomUUID(), donc le seul
                                // test d'id laissait ce chemin hérité recréer le même
                                // PNJ en double (audit 2026-08-12).
                                const alreadyKnown = currentNpcs.some((n: any) =>
                                    n.id === newNpc.id || foldText(String(n.name || '')) === foldText(newNpc.name));
                                if (!alreadyKnown) {
                                    await saveService.addNPCConversation(newNpc);
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
            quests: updatedJournal.quests.map((q: any) => ({ id: q.id, title: q.title, description: q.description, status: q.status, steps: q.steps || [], createdAt: q.createdAt ?? null })),
            npcs: updatedJournal.npcs.map((n: any) => ({ id: n.id, name: n.name, description: n.description, location: n.location, disposition: n.disposition, knownFacts: n.knownFacts, lastSeenAt: n.lastSeenAt, createdAt: n.createdAt ?? null })),
            locations: (updatedJournal.locations || []).map((l: any) => ({ id: l.id, name: l.name, description: l.description })),
            chronicle: (updatedJournal.chronicle || []).map((c: any) => ({ id: c.id, title: c.title, description: c.description, timestamp: c.timestamp })),
        });
    };

    const syncJournalImmediate = async (updatedJournal: any) => {
        latestData.current.setJournal(updatedJournal);
        await saveService.updateJournalImmediate({
            briefing: updatedJournal.briefing,
            quests: updatedJournal.quests.map((q: any) => ({ id: q.id, title: q.title, description: q.description, status: q.status, steps: q.steps || [], createdAt: q.createdAt ?? null })),
            npcs: updatedJournal.npcs.map((n: any) => ({ id: n.id, name: n.name, description: n.description, location: n.location, disposition: n.disposition, knownFacts: n.knownFacts, lastSeenAt: n.lastSeenAt, createdAt: n.createdAt ?? null })),
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
