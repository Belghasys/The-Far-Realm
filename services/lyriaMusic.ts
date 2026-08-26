/**
 * Local generated background music for campaign phases.
 * (Decommissioned Gemini Lyria)
 */

import { campaignEventLog } from './campaignEventLog';
import { log } from './infra/logger';
import { isCombatLoopMood } from './mediaThrottle';
import { getAppSettings } from '../store/settingsStore';
import { viteEnv } from './infra/modelConfig';

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
    // ── 12 ambiances ajoutées le 2026-08-22 ──────────────────────────────
    // Les 12 d'origine laissaient des scènes ENTIÈRES sans musique propre :
    // une défaite jouait encore la musique de combat, une boutique, un rituel
    // ou un enterrement retombaient sur « dramatic ». Chacune correspond à un
    // moment que le MJ produit réellement en session.
    | 'defeat'      // le héros tombe, jets de mort, groupe anéanti
    | 'level_up'    // palier franchi (une piste existait déjà, inutilisée)
    | 'shop'        // marchandage, échoppe (l'outil open_shop existe)
    | 'travel'      // route, montage de voyage (≠ exploration statique)
    | 'wilderness'  // forêt, plaine, nature vivante (≠ donjon)
    | 'horror'      // épouvante franche : morts-vivants, crypte, cauchemar
    | 'mystery'     // enquête, indices, bibliothèque, énigme
    | 'sacred'      // temple, bénédiction, présence divine
    | 'chase'       // poursuite, fuite, on vous traque
    | 'ritual'      // incantation, invocation, cercle arcanique
    | 'sorrow'      // deuil, adieu, mort d'un PNJ
    | 'festival'    // fête, banquet, liesse populaire
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

    // ── Ajouts 2026-08-22 ────────────────────────────────────────────────
    defeat: {
        label: 'Defeat',
        prompts: [
            { text: 'somber orchestral defeat, the fall of a hero', weight: 2.0 },
            { text: 'low strings descending, mournful solo horn, fading drums', weight: 1.2 },
        ],
        config: { bpm: 60, density: 0.3, brightness: 0.2, guidance: 4.0 },
        durationSeconds: 30,
        model: 'clip',
        loop: false, // sting ponctuel, comme victory
    },
    level_up: {
        label: 'Level Up',
        prompts: [
            { text: 'short uplifting fantasy flourish, growing power', weight: 2.0 },
            { text: 'rising strings and bright harp, warm brass resolution', weight: 1.2 },
        ],
        config: { bpm: 100, density: 0.5, brightness: 0.85, guidance: 4.0 },
        durationSeconds: 30,
        model: 'clip',
        loop: false,
    },
    shop: {
        label: 'Shop',
        prompts: [
            { text: 'cheerful medieval merchant shop music', weight: 2.0 },
            { text: 'plucked lute, light hand drum, curious wandering melody', weight: 1.2 },
        ],
        config: { bpm: 100, density: 0.45, brightness: 0.7, guidance: 3.8 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    travel: {
        label: 'Travel',
        prompts: [
            { text: 'sweeping fantasy travelling theme, the open road', weight: 2.0 },
            { text: 'steady walking rhythm, French horn melody, wide strings', weight: 1.3 },
        ],
        config: { bpm: 105, density: 0.55, brightness: 0.65, guidance: 3.8 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    wilderness: {
        label: 'Wilderness',
        prompts: [
            { text: 'living forest ambience, natural fantasy wilderness', weight: 2.0 },
            { text: 'wooden flute, soft strings, gentle harp, open air', weight: 1.2 },
        ],
        config: { bpm: 72, density: 0.3, brightness: 0.55, guidance: 3.5 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    horror: {
        label: 'Horror',
        prompts: [
            { text: 'terrifying undead horror underscore', weight: 2.0 },
            { text: 'dissonant string clusters, breathing choir, dread', weight: 1.5 },
        ],
        config: { bpm: 60, density: 0.25, brightness: 0.1, guidance: 4.2 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    mystery: {
        label: 'Mystery',
        prompts: [
            { text: 'curious investigation music, unravelling a secret', weight: 2.0 },
            { text: 'pizzicato strings, celesta, questioning woodwinds', weight: 1.2 },
        ],
        config: { bpm: 88, density: 0.3, brightness: 0.45, guidance: 3.6 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    sacred: {
        label: 'Sacred',
        prompts: [
            { text: 'sacred temple music, divine presence', weight: 2.0 },
            { text: 'wordless choir, pipe organ, warm sustained strings, hall reverb', weight: 1.4 },
        ],
        config: { bpm: 60, density: 0.35, brightness: 0.75, guidance: 4.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    chase: {
        label: 'Chase',
        prompts: [
            { text: 'breathless fantasy chase music, running for your life', weight: 2.0 },
            { text: 'fast ostinato strings, driving hand drums, urgent brass', weight: 1.5 },
        ],
        config: { bpm: 150, density: 0.75, brightness: 0.6, guidance: 4.2 },
        durationSeconds: 30,
        model: 'clip',
        loop: true,
    },
    ritual: {
        label: 'Ritual',
        prompts: [
            { text: 'arcane ritual music, a summoning circle', weight: 2.0 },
            { text: 'low chanting voices, frame drums, bowed metal resonance', weight: 1.4 },
        ],
        config: { bpm: 70, density: 0.4, brightness: 0.3, guidance: 4.0 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    sorrow: {
        label: 'Sorrow',
        prompts: [
            { text: 'grieving fantasy lament, farewell to the fallen', weight: 2.0 },
            { text: 'solo cello, quiet piano, sparse warm strings', weight: 1.3 },
        ],
        config: { bpm: 58, density: 0.25, brightness: 0.35, guidance: 3.8 },
        durationSeconds: 180,
        model: 'pro',
        loop: true,
    },
    festival: {
        label: 'Festival',
        prompts: [
            { text: 'joyful village festival music, feast and dancing', weight: 2.0 },
            { text: 'fiddle and bagpipe reel, tambourine, clapping crowd energy', weight: 1.5 },
        ],
        config: { bpm: 120, density: 0.7, brightness: 0.8, guidance: 4.0 },
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

// 2026-08-15 — cache de pistes GÉNÉRÉES débranché (les pistes viennent de la
// bibliothèque pré-enregistrée). Conservé sous préfixe _ sans appelant.
async function _getCachedTrack(cacheKey: string): Promise<GeneratedTrack | null> {
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

async function _putCachedTrack(track: GeneratedTrack): Promise<void> {
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
            // 2026-08-15 — pistes PRÉ-ENREGISTRÉES uniquement : plus de cache
            // IndexedDB de pistes générées (elles masqueraient les vraies
            // pistes Lyria), plus de cooldown GPU (un fichier statique n'a pas
            // besoin de throttle).
            if (combatLoopPlan && this.activeCombatSessionId && !this.combatLoopTrackKey) {
                this.combatLoopTrackKey = plan.cacheKey;
            }

            const track = await this.generateTrack(plan);
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

    // Résolution d'URL par mood (mise en cache) + avertissement unique par
    // piste absente — la bibliothèque peut se remplir progressivement.
    private trackUrlCache = new Map<string, string>();
    private missingTrackWarned = new Set<string>();
    /** Manifeste optionnel `music_manifest.json` à la racine du dossier musique :
     *  { "tavern": "Tavern positive vibes.mp3", "dungeon": ["a.mp3", "b.mp3"] }
     *  Sans lui, seul un fichier nommé EXACTEMENT <mood>.mp3 était joué — une
     *  bibliothèque aux noms descriptifs restait donc entièrement muette. */
    private manifest: Record<string, string[]> | null = null;
    private manifestLoaded = false;

    private async loadManifest(base: string): Promise<Record<string, string[]>> {
        if (this.manifestLoaded) return this.manifest || {};
        this.manifestLoaded = true;
        try {
            const res = await fetch(`${base}/music_manifest.json`, { signal: AbortSignal.timeout(4_000) });
            if (res.ok) {
                const raw = await res.json();
                const out: Record<string, string[]> = {};
                for (const [mood, value] of Object.entries(raw || {})) {
                    if (mood.startsWith('_')) continue; // clés de commentaire
                    const list = (Array.isArray(value) ? value : [value])
                        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
                    if (list.length) out[mood] = list;
                }
                this.manifest = out;
                log.info(`🎵 Manifeste musique chargé : ${Object.keys(out).length} ambiance(s) mappée(s)`);
            }
        } catch {
            // Pas de manifeste = comportement historique (fichier <mood>.mp3).
        }
        return this.manifest || {};
    }

    /** 2026-08-15 — GÉNÉRATION DÉBRANCHÉE. La musique vient des 30 pistes
     *  Lyria pré-enregistrées (cf. « Cahier de Thèmes ») servies par
     *  audio_server /music (DND_MUSIC_DIR). Le moteur de génération
     *  (/generate-music + SA3) reste sur disque : plus rien ne l'appelle.
     *  Nom de fichier = clé de mood (exploration.mp3, combat_boss.mp3…) ;
     *  'custom' (caption libre du MJ, plus générable) → piste 'dramatic'. */
    private async generateTrack(plan: MusicPlan): Promise<GeneratedTrack> {
        const key = plan.mood === 'custom' ? 'dramatic' : plan.mood;
        const base = viteEnv('VITE_MUSIC_LIBRARY_URL', import.meta.env.VITE_MUSIC_LIBRARY_URL, 'http://127.0.0.1:8001/music').replace(/\/$/, '');

        let url = this.trackUrlCache.get(key) || null;
        if (!url) {
            // 1) Le manifeste d'abord : il permet de garder les noms d'origine
            //    des pistes ET d'en proposer plusieurs pour une même ambiance
            //    (tirage au sort à chaque résolution → moins de répétition).
            const manifest = await this.loadManifest(base);
            const mapped = manifest[key] || [];
            const candidates = mapped.length
                ? [mapped[Math.floor(Math.random() * mapped.length)], ...mapped]
                : [];
            // 2) Puis la convention historique <mood>.<ext>.
            for (const ext of ['mp3', 'ogg', 'wav']) candidates.push(`${key}.${ext}`);

            for (const name of candidates) {
                const candidate = `${base}/${encodeURIComponent(name)}`;
                try {
                    const head = await fetch(candidate, { method: 'HEAD', signal: AbortSignal.timeout(4_000) });
                    // `head.ok` NE SUFFIT PAS. Servie par un hébergeur SPA
                    // (Firebase Hosting et sa réécriture ** -> /index.html),
                    // une piste absente renvoie la page HTML avec un 200 : le
                    // premier candidat gagnait toujours et le lecteur tentait
                    // de décoder du HTML. On exige un type audio.
                    const type = head.headers.get('content-type') || '';
                    if (head.ok && /^audio\//i.test(type)) { url = candidate; break; }
                } catch { /* candidat suivant */ }
            }
        }
        if (!url) {
            if (!this.missingTrackWarned.has(key)) {
                this.missingTrackWarned.add(key);
                log.warn(`🎵 Piste absente de la bibliothèque : "${key}" — dépose ${key}.mp3 dans le dossier musique (DND_MUSIC_DIR), ou mappe un fichier existant dans music_manifest.json ("${key}": "Mon Titre.mp3").`);
            }
            // Piste manquante = SILENCE voulu — mais l'ancienne piste doit
            // s'arrêter : le throw était avalé en amont et, victory.mp3
            // manquant, la musique de COMBAT continuait après chaque victoire
            // (audit 2026-08-20). On coupe en fondu avant de signaler l'échec.
            void this.stop().catch(() => { /* best-effort */ });
            throw new Error(`Music track not found in library: ${key}`);
        }
        this.trackUrlCache.set(key, url);

        log.info(`🎵 Pre-recorded track resolved: ${key} → ${url}`);
        return {
            cacheKey: plan.cacheKey,
            dataUrl: url, // une URL http se joue à l'identique dans new Audio(...)
            mimeType: 'audio/mpeg',
            prompt: plan.prompt,
            mood: plan.mood,
            sourceModel: 'prerecorded-library',
            durationSeconds: plan.durationSeconds,
            structureText: `Pre-recorded track: ${key}`,
            createdAt: Date.now(),
        };
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
