/**
 * Local generated background music for campaign phases.
 * (Decommissioned Gemini Lyria)
 */

import { campaignEventLog } from './campaignEventLog';
import { log } from './logger';
import { cooldownRemainingMs, isCombatLoopMood, MEDIA_GENERATION_COOLDOWN_MS } from './mediaThrottle';
import { withMusicGpu } from './gpuLock';
import { getAppSettings } from '../store/settingsStore';

const DB_NAME = 'dungeonai_media_cache';
const DB_VERSION = 1;
const TRACK_STORE = 'music_tracks';

export interface WeightedPrompt {
    text: string;
    weight: number;
}

export interface MusicConfig {
    bpm?: number;
    density?: number;
    brightness?: number;
    guidance?: number;
    scale?: string;
    temperature?: number;
    mute_drums?: boolean;
    mute_bass?: boolean;
}

export type MusicMood =
    | 'exploration'
    | 'quest'
    | 'combat'
    | 'combat_boss'
    | 'victory'
    | 'tension'
    | 'rest'
    | 'tavern'
    | 'dungeon'
    | 'town'
    | 'dramatic'
    | 'stealth'
    | 'custom';

interface MusicPreset {
    prompts: WeightedPrompt[];
    config: MusicConfig;
    durationSeconds: 30 | 180;
    model: 'clip' | 'pro';
    loop: boolean;
    label: string;
}

interface MusicPlan extends MusicPreset {
    mood: MusicMood;
    prompt: string;
    sourceModel: string;
    cacheKey: string;
}

interface GeneratedTrack {
    cacheKey: string;
    dataUrl: string;
    mimeType: string;
    prompt: string;
    mood: MusicMood;
    sourceModel: string;
    durationSeconds: number;
    structureText?: string;
    createdAt: number;
}

export const MOOD_PRESETS: Record<Exclude<MusicMood, 'custom'>, MusicPreset> = {
    exploration: {
        label: 'Exploration',
        prompts: [
            { text: 'ambient fantasy soundtrack', weight: 1.5 },
            { text: 'mysterious orchestral texture, ethereal ambience', weight: 1.0 },
            { text: 'harp, flute, soft strings, sustained chords', weight: 0.8 },
        ],
        config: { bpm: 75, density: 0.3, brightness: 0.4, guidance: 3.5 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    quest: {
        label: 'Quest',
        prompts: [
            { text: 'adventurous fantasy travel theme', weight: 1.7 },
            { text: 'hopeful strings, warm woodwinds, sense of purpose', weight: 1.2 },
            { text: 'subtle percussion and evolving orchestral arc', weight: 0.8 },
        ],
        config: { bpm: 88, density: 0.45, brightness: 0.55, guidance: 3.8 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    combat: {
        label: 'Combat',
        prompts: [
            { text: 'epic battle music, orchestral score', weight: 2.0 },
            { text: 'intense drums, brass, urgent strings', weight: 1.5 },
            { text: 'short seamless action loop for turn-based combat', weight: 1.2 },
        ],
        config: { bpm: 140, density: 0.8, brightness: 0.7, guidance: 4.0 },
        durationSeconds: 30,
        model: 'clip',
        loop: true,
    },
    combat_boss: {
        label: 'Boss Combat',
        prompts: [
            { text: 'epic boss fight, dark orchestral power', weight: 2.0 },
            { text: 'heavy drums, ominous brass, choir-like synth texture', weight: 1.5 },
            { text: 'short seamless loop with high stakes', weight: 1.2 },
        ],
        config: { bpm: 155, density: 0.9, brightness: 0.6, guidance: 4.5 },
        durationSeconds: 30,
        model: 'clip',
        loop: true,
    },
    victory: {
        label: 'Victory',
        prompts: [
            { text: 'triumphant fantasy fanfare', weight: 2.0 },
            { text: 'bright brass, heroic resolution, celebration', weight: 1.2 },
        ],
        config: { bpm: 110, density: 0.6, brightness: 0.8, guidance: 4.0 },
        durationSeconds: 30,
        model: 'clip',
        loop: false,
    },
    tension: {
        label: 'Tension',
        prompts: [
            { text: 'dark ominous drone, suspense', weight: 2.0 },
            { text: 'low cello pulse, heartbeat rhythm, creeping danger', weight: 1.5 },
        ],
        config: { bpm: 85, density: 0.2, brightness: 0.2, guidance: 3.5 },
        durationSeconds: 30,
        model: 'clip',
        loop: true,
    },
    rest: {
        label: 'Rest',
        prompts: [
            { text: 'peaceful campfire fantasy ambience', weight: 2.0 },
            { text: 'gentle acoustic guitar, lute, soft flute, night air', weight: 1.0 },
        ],
        config: { bpm: 65, density: 0.2, brightness: 0.5, guidance: 3.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    tavern: {
        label: 'Tavern',
        prompts: [
            { text: 'medieval tavern folk music', weight: 2.0 },
            { text: 'fiddle, lute, mandolin, hand percussion, warm room tone', weight: 1.5 },
        ],
        config: { bpm: 95, density: 0.5, brightness: 0.6, guidance: 4.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    dungeon: {
        label: 'Dungeon',
        prompts: [
            { text: 'dark dungeon ambience', weight: 2.0 },
            { text: 'low strings, cave echo, distant chains, ritual undertone', weight: 1.5 },
        ],
        config: { bpm: 70, density: 0.15, brightness: 0.15, guidance: 3.5 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    town: {
        label: 'Town',
        prompts: [
            { text: 'pleasant medieval town ambience', weight: 1.5 },
            { text: 'warm guitar, flute melody, light market bustle energy', weight: 1.0 },
        ],
        config: { bpm: 90, density: 0.4, brightness: 0.6, guidance: 3.5 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    dramatic: {
        label: 'Dramatic Story',
        prompts: [
            { text: 'dramatic cinematic fantasy score', weight: 2.0 },
            { text: 'strings, piano, emotional rise, rich harmony', weight: 1.5 },
        ],
        config: { bpm: 100, density: 0.5, brightness: 0.5, guidance: 4.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    stealth: {
        label: 'Stealth',
        prompts: [
            { text: 'quiet suspenseful stealth music', weight: 2.0 },
            { text: 'muted plucked strings, soft pulses, careful movement', weight: 1.0 },
        ],
        config: { bpm: 80, density: 0.15, brightness: 0.3, guidance: 3.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
};

const memoryTrackCache = new Map<string, GeneratedTrack>();

function hashText(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

export function buildMusicPromptForMood(
    mood: MusicMood,
    prompts: WeightedPrompt[],
    durationSeconds: number,
    loop: boolean
): string {
    // Stable Audio 3 is trained on SHORT caption-style prompts (genre,
    // instruments, mood). The old builder emitted a paragraph of instructions
    // ("Create a 3-minute…", "(weight 1.5)", "Leave space for narration…") that
    // the model cannot follow — and negations ("No vocals") can summon the very
    // thing they name, since there is no negative prompt. New contract: a
    // compact comma list — "Instrumental" as a POSITIVE tag, descriptors sorted
    // by weight (strongest first = most attention), one form tag.
    const descriptors = [...prompts]
        .sort((a, b) => b.weight - a.weight)
        .map(prompt => prompt.text);
    const phase = mood === 'custom' ? 'fantasy' : mood.replace(/_/g, ' ');
    const form = durationSeconds <= 30
        ? (loop ? 'seamless short loop' : 'short cue')
        : 'ambient background track';

    return [
        'Instrumental cinematic fantasy game soundtrack',
        `${phase} theme`,
        ...descriptors,
        form,
    ].join(', ');
}

async function openMediaDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(TRACK_STORE)) {
                db.createObjectStore(TRACK_STORE, { keyPath: 'cacheKey' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function getCachedTrack(cacheKey: string): Promise<GeneratedTrack | null> {
    if (memoryTrackCache.has(cacheKey)) return memoryTrackCache.get(cacheKey)!;

    const db = await openMediaDb();
    if (!db) return null;

    return new Promise((resolve) => {
        const tx = db.transaction(TRACK_STORE, 'readonly');
        const request = tx.objectStore(TRACK_STORE).get(cacheKey);
        request.onsuccess = () => {
            const track = request.result as GeneratedTrack | undefined;
            if (track) memoryTrackCache.set(cacheKey, track);
            resolve(track || null);
            db.close();
        };
        request.onerror = () => {
            resolve(null);
            db.close();
        };
    });
}

async function putCachedTrack(track: GeneratedTrack): Promise<void> {
    memoryTrackCache.set(track.cacheKey, track);

    const db = await openMediaDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
        const tx = db.transaction(TRACK_STORE, 'readwrite');
        tx.objectStore(TRACK_STORE).put(track);
        tx.oncomplete = () => {
            db.close();
            resolve();
        };
        tx.onerror = () => {
            db.close();
            resolve();
        };
    });
}

class LyriaMusicService {
    private currentAudio: HTMLAudioElement | null = null;
    private fadingAudio: HTMLAudioElement | null = null;
    private currentMood: MusicMood | null = null;
    private currentTrackKey: string | null = null;
    private _targetVolume = getAppSettings().musicVolume;
    private _isDucking = false;
    private _isConnected = false;
    private generationToken = 0;
    private lastPhaseGenerationStartedAt = 0;
    private pendingPhaseRequest: {
        mood: MusicMood;
        customPrompts?: WeightedPrompt[];
        customConfig?: MusicConfig;
    } | null = null;
    private phaseTimer: ReturnType<typeof setTimeout> | null = null;
    private activeCombatSessionId: string | null = null;
    private combatLoopTrackKey: string | null = null;

    get isConnected(): boolean {
        return this._isConnected;
    }

    get isPlaying(): boolean {
        return Boolean(this.currentAudio && !this.currentAudio.paused);
    }

    async connect(): Promise<void> {
        this._isConnected = true;
    }

    startCombatSession(sessionId = `combat_${Date.now()}`): void {
        if (this.activeCombatSessionId === sessionId) return;
        this.activeCombatSessionId = sessionId;
        this.combatLoopTrackKey = null;
    }

    endCombatSession(): void {
        this.activeCombatSessionId = null;
        this.combatLoopTrackKey = null;
    }

    async setMood(mood: MusicMood, customPrompts?: WeightedPrompt[], customConfig?: MusicConfig): Promise<void> {
        if (!getAppSettings().localMusic) return; // musique locale désactivée (Réglages)
        await this.connect();
        const plan = this.buildPlan(mood, customPrompts, customConfig);
        const combatLoopPlan = this.isCombatLoopPlan(plan);
        if (combatLoopPlan && this.activeCombatSessionId && this.combatLoopTrackKey && this.combatLoopTrackKey !== plan.cacheKey) {
            campaignEventLog.append('MUSIC_CHANGED', `Combat music kept: ${plan.label} suppressed`, {
                mood,
                lockedTrackKey: this.combatLoopTrackKey,
                requestedTrackKey: plan.cacheKey,
                policy: 'one_combat_loop_per_combat',
            });
            return;
        }

        if (this.currentTrackKey === plan.cacheKey && this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        const token = ++this.generationToken;
        campaignEventLog.append('MUSIC_CHANGED', `Music phase requested: ${plan.label}`, {
            mood,
            durationSeconds: plan.durationSeconds,
            loop: plan.loop,
            sourceModel: plan.sourceModel,
        });

        try {
            const cachedTrack = await getCachedTrack(plan.cacheKey);
            if (cachedTrack && !combatLoopPlan && this.pendingPhaseRequest) {
                if (this.phaseTimer) clearTimeout(this.phaseTimer);
                this.phaseTimer = null;
                this.pendingPhaseRequest = null;
            }
            if (!cachedTrack && !combatLoopPlan) {
                const waitMs = cooldownRemainingMs(this.lastPhaseGenerationStartedAt);
                if (waitMs > 0) {
                    this.queuePhaseRequest(mood, customPrompts, customConfig, waitMs);
                    campaignEventLog.append('ASSET_THROTTLED', `Music generation queued: ${plan.label}`, {
                        kind: 'phase_music',
                        mood,
                        cooldownMs: MEDIA_GENERATION_COOLDOWN_MS,
                        waitMs,
                        policy: 'latest_request_wins',
                    });
                    return;
                }
                this.lastPhaseGenerationStartedAt = Date.now();
            }

            if (combatLoopPlan && this.activeCombatSessionId && !this.combatLoopTrackKey) {
                this.combatLoopTrackKey = plan.cacheKey;
            }

            const track = cachedTrack || await this.generateTrack(plan);
            if (token !== this.generationToken) return;
            await this.playTrack(track, plan.loop);
            this.currentMood = mood;
            this.currentTrackKey = plan.cacheKey;
            campaignEventLog.append('ASSET_GENERATED', `Music ready: ${plan.label}`, {
                kind: plan.model === 'clip' ? 'combat_music_loop' : 'phase_music',
                mood,
                durationSeconds: plan.durationSeconds,
                loop: plan.loop,
                sourceModel: plan.sourceModel,
                prompt: plan.prompt,
                structureText: track.structureText?.slice(0, 500),
            });
        } catch (error) {
            if (combatLoopPlan && this.combatLoopTrackKey === plan.cacheKey && this.currentTrackKey !== plan.cacheKey) {
                this.combatLoopTrackKey = null;
            }
            log.debug('Failed to generate/play local music:', error);
        }
    }

    async play(): Promise<void> {
        if (this.currentAudio) {
            await this.currentAudio.play().catch(error => log.warn('Music play blocked:', error));
        } else {
            await this.setMood(this.currentMood || 'exploration');
        }
    }

    async pause(): Promise<void> {
        this.currentAudio?.pause();
    }

    async stop(): Promise<void> {
        this.stopAudio(this.currentAudio);
        this.stopAudio(this.fadingAudio);
        this.currentAudio = null;
        this.fadingAudio = null;
        this.currentMood = null;
        this.currentTrackKey = null;
    }

    async resetContext(): Promise<void> {
        this.currentTrackKey = null;
        if (this.currentMood) await this.setMood(this.currentMood);
    }

    setVolume(volume: number): void {
        this._targetVolume = Math.max(0, Math.min(1, volume));
        this.rampVolume(this.currentAudio, this.effectiveVolume(), 300);
    }

    duckForSpeech(): void {
        if (this._isDucking) return;
        this._isDucking = true;
        this.rampVolume(this.currentAudio, this.effectiveVolume(), 400);
    }

    unduckAfterSpeech(): void {
        if (!this._isDucking) return;
        this._isDucking = false;
        this.rampVolume(this.currentAudio, this.effectiveVolume(), 800);
    }

    disconnect(): void {
        this.generationToken++;
        if (this.phaseTimer) clearTimeout(this.phaseTimer);
        this.phaseTimer = null;
        this.pendingPhaseRequest = null;
        this.activeCombatSessionId = null;
        this.combatLoopTrackKey = null;
        this.stop();
        this._isConnected = false;
        log.info('Lyria music disconnected');
    }

    private isCombatLoopPlan(plan: MusicPlan): boolean {
        return plan.model === 'clip' && isCombatLoopMood(plan.mood);
    }

    private queuePhaseRequest(
        mood: MusicMood,
        customPrompts: WeightedPrompt[] | undefined,
        customConfig: MusicConfig | undefined,
        waitMs: number
    ): void {
        this.pendingPhaseRequest = { mood, customPrompts, customConfig };
        if (this.phaseTimer) clearTimeout(this.phaseTimer);
        this.phaseTimer = setTimeout(() => {
            const pending = this.pendingPhaseRequest;
            this.pendingPhaseRequest = null;
            this.phaseTimer = null;
            if (pending) void this.setMood(pending.mood, pending.customPrompts, pending.customConfig);
        }, Math.max(250, waitMs));
    }

    private buildPlan(mood: MusicMood, customPrompts?: WeightedPrompt[], customConfig?: MusicConfig): MusicPlan {
        const preset = mood === 'custom'
            ? {
                label: 'Custom',
                prompts: customPrompts || [{ text: 'fantasy soundtrack, atmospheric', weight: 1 }],
                config: customConfig || { bpm: 90, density: 0.4, brightness: 0.5 },
                durationSeconds: 180 as const,
                model: 'pro' as const,
                loop: true,
            }
            : MOOD_PRESETS[mood] || MOOD_PRESETS.exploration;

        const prompts = mood === 'custom' && customPrompts ? customPrompts : preset.prompts;
        const config = { ...preset.config, ...(customConfig || {}) };
        const sourceModel = 'local-musicgen';
        const prompt = buildMusicPromptForMood(mood, prompts, preset.durationSeconds, preset.loop);
        const cacheKey = `${sourceModel}_${hashText(`${prompt}_${JSON.stringify(config)}`)}`;

        return {
            ...preset,
            config,
            prompts,
            mood,
            prompt,
            sourceModel,
            cacheKey,
        };
    }

    private async generateTrack(plan: MusicPlan): Promise<GeneratedTrack> {
        const localAudioUrl = import.meta.env.VITE_LOCAL_AUDIO_SERVER_URL;
        if (localAudioUrl) {
            log.info(`🎵 Redirecting music generation to local server: ${localAudioUrl}`);
            try {
                // GPU coordination: music takes the GPU EXCLUSIVELY — no image or
                // sfx generation runs while a music track is being generated, so
                // the heavy combo can never collide on the 16GB VRAM budget.
                return await withMusicGpu('music', async (signal) => {
                    const localResponse = await fetch(`${localAudioUrl.replace(/\/$/, '')}/generate-music`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: plan.prompt,
                            duration: plan.durationSeconds,
                        }),
                        signal,
                    });
                    if (!localResponse.ok) {
                        throw new Error(`Local audio server returned HTTP ${localResponse.status}`);
                    }
                    const data = await localResponse.json();
                    if (data.audio) {
                        log.info(`🎵 Successfully generated music using local MusicGen server`);
                        const mimeType = data.audio.split(';')[0]?.split(':')[1] || 'audio/wav';

                        const track: GeneratedTrack = {
                            cacheKey: plan.cacheKey,
                            dataUrl: data.audio,
                            mimeType,
                            prompt: plan.prompt,
                            mood: plan.mood,
                            sourceModel: 'local-musicgen',
                            durationSeconds: plan.durationSeconds,
                            structureText: 'Generated locally via MusicGen',
                            createdAt: Date.now(),
                        };
                        await putCachedTrack(track);
                        return track;
                    }
                    throw new Error('Local audio server did not return audio data');
                });
            } catch (localError) {
                log.warn(`⚠️ Local audio server failed:`, localError);
                throw localError;
            }
        }

        throw new Error('Local MusicGen audio server is not configured.');
    }

    private async playTrack(track: GeneratedTrack, loop: boolean): Promise<void> {
        if (typeof Audio === 'undefined') return;

        const next = new Audio(track.dataUrl);
        next.loop = loop;
        next.preload = 'auto';
        next.volume = 0;

        const previous = this.currentAudio;
        this.fadingAudio = previous;
        this.currentAudio = next;

        await next.play().catch(error => {
            this.currentAudio = previous;
            this.fadingAudio = null;
            throw error;
        });

        this.rampVolume(next, this.effectiveVolume(), 1200);
        if (previous) {
            this.rampVolume(previous, 0, 1200, () => this.stopAudio(previous));
        }
    }

    private effectiveVolume(): number {
        return this._isDucking ? this._targetVolume * 0.25 : this._targetVolume;
    }

    private rampVolume(audio: HTMLAudioElement | null, target: number, durationMs: number, onDone?: () => void): void {
        if (!audio) return;
        const start = audio.volume;
        const startedAt = performance.now();
        const step = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / durationMs);
            audio.volume = start + (target - start) * progress;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                onDone?.();
            }
        };
        requestAnimationFrame(step);
    }

    private stopAudio(audio: HTMLAudioElement | null): void {
        if (!audio) return;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
    }
}

export const lyriaMusicService = new LyriaMusicService();
