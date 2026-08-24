/**
 * useMusicDirector.ts
 * React hook that listens to game state and steers the Lyria RealTime music.
 * Automatically transitions between moods based on combat, HP, scene, and rests.
 * Also handles [MUSIC: ...] tags from the DM via the tag processor.
 */

import { useEffect, useRef, useCallback } from 'react';
import { lyriaMusicService, MusicMood } from '../services/lyriaMusic';
import { useGameStore } from '../store/gameStore';
import { log } from '../services/logger';
import { isCombatLoopMood } from '../services/mediaThrottle';
import { auditBus } from '../services/auditBus';

interface MusicDirectorOptions {
    enabled: boolean;
    isConnected: boolean;  // Gemini Live connection status
}

export function useMusicDirector({ enabled, isConnected }: MusicDirectorOptions) {
    const prevCombatActive = useRef(false);
    const prevMood = useRef<MusicMood | null>(null);
    const isDMSpeaking = useRef(false);
    const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const victoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitialized = useRef(false);
    const combatSessionRef = useRef<string | null>(null);

    // Connect to Lyria when game starts
    useEffect(() => {
        if (!enabled || !isConnected || isInitialized.current) return;

        const init = async () => {
            try {
                await lyriaMusicService.connect();
                await lyriaMusicService.setMood('exploration');
                isInitialized.current = true;
                log.info('🎵 Music Director initialized');
            } catch (e) {
                log.warn('🎵 Music Director failed to initialize (non-critical):', e);
            }
        };

        init();

        return () => {
            if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
            if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
            lyriaMusicService.disconnect();
            combatSessionRef.current = null;
            isInitialized.current = false;
        };
    }, [enabled, isConnected]);

    // Auto-transition based on combat state
    useEffect(() => {
        // Subscribe UNCONDITIONALLY so the listener exists from mount; the guard lives
        // INSIDE the callback so it activates as soon as Lyria's async init finishes.
        // (Before: the effect returned early because isInitialized.current was still
        // false at mount and deps [enabled] never change → the subscription was never
        // created → ALL reactive music — combat/victory/tension — was dead.)
        const unsub = useGameStore.subscribe((state) => {
            if (!enabled || !isInitialized.current) return;
            const combatActive = state.combatState?.isActive || false;
            const combatants = state.combatState?.combatants || [];
            const character = state.character;

            // Combat started
            if (combatActive && !prevCombatActive.current) {
                // Check if it's a boss fight (enemy with CR > 5 or high HP)
                const enemies = combatants.filter((c: any) => !c.isPlayer);
                const isBoss = enemies.some((e: any) => (e.hp?.max || 0) > 100);
                combatSessionRef.current = `combat_${Date.now()}`;
                lyriaMusicService.startCombatSession(combatSessionRef.current);
                lyriaMusicService.setMood(isBoss ? 'combat_boss' : 'combat');
                prevMood.current = isBoss ? 'combat_boss' : 'combat';
            }

            // Combat ended
            if (!combatActive && prevCombatActive.current) {
                lyriaMusicService.endCombatSession();
                combatSessionRef.current = null;
                lyriaMusicService.setMood('victory');
                prevMood.current = 'victory';
                // After 15 seconds, fade back to exploration
                if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
                victoryTimeoutRef.current = setTimeout(() => {
                    if (isInitialized.current && prevMood.current === 'victory') {
                        lyriaMusicService.setMood('exploration');
                        prevMood.current = 'exploration';
                    }
                }, 15000);
            }

            prevCombatActive.current = combatActive;

            // Tension music when player is low HP (during combat)
            if (combatActive && character) {
                const hpPercent = character.hp.current / character.hp.max;
                if (hpPercent <= 0.25 && prevMood.current !== 'tension') {
                    lyriaMusicService.setMood('tension');
                    prevMood.current = 'tension';
                }
            }
        });

        return unsub;
    }, [enabled]);

    /**
     * Handle a [MUSIC: ...] tag from the DM.
     * Called by the tag processor when it encounters a MUSIC tag.
     */
    const handleMusicTag = useCallback((moodOrPrompt: string) => {
        if (!enabled || !isInitialized.current) return;

        const cleaned = moodOrPrompt.trim().toLowerCase();

        // Check if it matches a preset name
        const presetNames: MusicMood[] = [
                'exploration', 'quest', 'combat', 'combat_boss', 'victory', 'tension',
                'rest', 'tavern', 'dungeon', 'town', 'dramatic', 'stealth',
                // Ajouts 2026-08-22 — sans cette liste, ces moods n'étaient pas
                // reconnus comme presets et partaient en prompt « custom ».
                'defeat', 'level_up', 'shop', 'travel', 'wilderness', 'horror',
                'mystery', 'sacred', 'chase', 'ritual', 'sorrow', 'festival',
        ];

        const aliases: Record<string, MusicMood> = {
            creepy: 'dungeon',
            boss: 'combat_boss',
            battle: 'combat',
            fight: 'combat',
            social: 'tavern',
            village: 'town',
            city: 'town',
            mission: 'quest',
            exploration: 'exploration',
            // 'travel' est devenu un preset à part entière (il renvoyait à
            // 'quest') — les synonymes proches y mènent désormais.
            journey: 'travel',
            road: 'travel',
            forest: 'wilderness',
            nature: 'wilderness',
            market: 'shop',
            merchant: 'shop',
            shopping: 'shop',
            undead: 'horror',
            terror: 'horror',
            investigation: 'mystery',
            puzzle: 'mystery',
            temple: 'sacred',
            church: 'sacred',
            divine: 'sacred',
            pursuit: 'chase',
            escape: 'chase',
            flee: 'chase',
            summoning: 'ritual',
            incantation: 'ritual',
            funeral: 'sorrow',
            grief: 'sorrow',
            mourning: 'sorrow',
            celebration: 'festival',
            feast: 'festival',
            death: 'defeat',
            defeated: 'defeat',
            levelup: 'level_up',
        };

        // ML11 (contre-audit) — matcher les noms les plus LONGS d'abord :
        // « combat_boss » contenait « combat » et jouait la musique de combat
        // normale — la musique de boss était inatteignable par tag [MUSIC:].
        const byLengthDesc = (a: string, b: string) => b.length - a.length;
        const matchedPreset = [...presetNames].sort(byLengthDesc).find(p => cleaned.includes(p))
            || Object.entries(aliases).sort(([a], [b]) => byLengthDesc(a, b)).find(([key]) => cleaned.includes(key))?.[1];
        if (matchedPreset) {
            if (isCombatLoopMood(matchedPreset) && useGameStore.getState().combatState?.isActive) {
                if (!combatSessionRef.current) {
                    combatSessionRef.current = `combat_${Date.now()}`;
                    lyriaMusicService.startCombatSession(combatSessionRef.current);
                }
            }
            auditBus.publish('music', `preset: ${matchedPreset}`, `tag "${moodOrPrompt}" → preset ${matchedPreset}`);
            lyriaMusicService.setMood(matchedPreset);
            prevMood.current = matchedPreset;
        } else {
            // Treat as a custom prompt
            const weights = [
                { text: moodOrPrompt.trim(), weight: 2.0 },
                { text: 'fantasy soundtrack, atmospheric', weight: 0.5 },
            ];
            auditBus.publish('music', `custom: ${moodOrPrompt.trim().slice(0, 60)}`, weights);
            lyriaMusicService.setMood('custom', weights);
            prevMood.current = 'custom';
        }
    }, [enabled]);

    /**
     * Handle rest tags (called by the tag processor).
     */
    const handleRestMusic = useCallback((isLongRest: boolean) => {
        if (!enabled || !isInitialized.current) return;
        lyriaMusicService.setMood('rest');
        prevMood.current = 'rest';

        // After rest, return to exploration
        const duration = isLongRest ? 20000 : 10000;
        if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
        restTimeoutRef.current = setTimeout(() => {
            if (isInitialized.current && prevMood.current === 'rest') {
                lyriaMusicService.setMood('exploration');
                prevMood.current = 'exploration';
            }
        }, duration);
    }, [enabled]);

    /**
     * Duck/unduck music during DM speech.
     */
    const onDMSpeechActivity = useCallback((isSpeaking: boolean) => {
        if (!enabled || !isInitialized.current) return;

        if (isSpeaking && !isDMSpeaking.current) {
            isDMSpeaking.current = true;
            lyriaMusicService.duckForSpeech();
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        }

        if (isSpeaking) {
            // Reset the timeout every time we get speech
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = setTimeout(() => {
                isDMSpeaking.current = false;
                lyriaMusicService.unduckAfterSpeech();
            }, 1500); // 1.5s of silence before restoring volume
        }
    }, [enabled]);

    /**
     * Set the music volume (0.0 - 1.0).
     */
    const setMusicVolume = useCallback((volume: number) => {
        lyriaMusicService.setVolume(volume);
    }, []);

    /**
     * Toggle music on/off.
     */
    const toggleMusic = useCallback(async () => {
        if (lyriaMusicService.isPlaying) {
            lyriaMusicService.disconnect();
            isInitialized.current = false;
        } else {
            try {
                await lyriaMusicService.connect();
                if (useGameStore.getState().combatState?.isActive && !combatSessionRef.current) {
                    combatSessionRef.current = `combat_${Date.now()}`;
                    lyriaMusicService.startCombatSession(combatSessionRef.current);
                }
                await lyriaMusicService.setMood(prevMood.current || 'exploration');
                isInitialized.current = true;
            } catch (e) {
                log.warn('🎵 Failed to reconnect music:', e);
            }
        }
    }, []);

    return {
        handleMusicTag,
        handleRestMusic,
        onDMSpeechActivity,
        setMusicVolume,
        toggleMusic,
        isActive: isInitialized.current,
    };
}
