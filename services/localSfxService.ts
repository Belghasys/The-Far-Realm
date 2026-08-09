import { log } from './logger';
import { withImageSfxGpu } from './gpuLock';
import { auditBus } from './auditBus';
import { getAppSettings } from '../store/settingsStore';

const DB_NAME = 'dungeonai_sfx_cache';
const DB_VERSION = 1;
const SFX_STORE = 'sfx_effects';

export interface LogEntry {
    type: 'damage' | 'check' | 'save' | 'attack' | 'initiative';
    name: string;
    total: number;
    formula: string;
    isDM?: boolean;
    success?: boolean;
}

interface CachedSfx {
    cacheKey: string;
    dataUrl: string;
    prompt: string;
    createdAt: number;
}

function hashText(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

async function openSfxDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(SFX_STORE)) {
                db.createObjectStore(SFX_STORE, { keyPath: 'cacheKey' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function getCachedSfx(cacheKey: string): Promise<CachedSfx | null> {
    const db = await openSfxDb();
    if (!db) return null;

    return new Promise((resolve) => {
        const tx = db.transaction(SFX_STORE, 'readonly');
        const request = tx.objectStore(SFX_STORE).get(cacheKey);
        request.onsuccess = () => {
            const result = request.result as CachedSfx | undefined;
            resolve(result || null);
            db.close();
        };
        request.onerror = () => {
            resolve(null);
            db.close();
        };
    });
}

async function putCachedSfx(sfx: CachedSfx): Promise<void> {
    const db = await openSfxDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
        const tx = db.transaction(SFX_STORE, 'readwrite');
        tx.objectStore(SFX_STORE).put(sfx);
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

class LocalSfxService {
    private localServerUrl = import.meta.env.VITE_LOCAL_AUDIO_SERVER_URL || 'http://127.0.0.1:8001';
    private activeAudioElements: HTMLAudioElement[] = [];
    // NO throttling: the local GPU is ours and the DM has full creative freedom
    // over sound. gpuLock already serializes what must not overlap (music).

    /**
     * Play a DIEGETIC sound effect requested by the DM during narration
     * (a creaking door, distant thunder, a wolf howl, a tavern crowd...).
     * Unlike playSfxForLog (driven by dice rolls), this is free-form: the DM
     * passes a short description and the local AudioLDM server renders it.
     * Unlimited — every request generates (or replays from cache). Returns true
     * if a sound was played or generation started, false if skipped (empty).
     */
    async playSfxFromPrompt(description: string): Promise<boolean> {
        if (typeof Audio === 'undefined') return false;
        if (!getAppSettings().localSfx) return false; // désactivé dans les Réglages
        // Stable Audio 3 reads SHORT caption-style prompts. Collapse whitespace
        // and hard-cap the length so an over-verbose DM description can't turn
        // into mush; the wrapper adds two positive tags only — the old
        // negations ("no music, no speech, no narration") could summon exactly
        // what they named, since there is no negative prompt.
        const desc = (description || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        if (!desc) return false;

        const prompt = `${desc}, close-up sound effect, foley`;
        auditBus.publish('sfx', `narrative: ${desc.slice(0, 80)}`, prompt);
        const cacheKey = `sfx_${hashText(prompt)}`;

        // Cached sound -> instant replay, no GPU.
        const cached = await getCachedSfx(cacheKey);
        if (cached) {
            log.info(`🔊 Narrative SFX from cache: "${desc.substring(0, 50)}"`);
            this.playAudio(cached.dataUrl);
            return true;
        }

        try {
            log.info(`🔊 Generating narrative SFX via AudioLDM: "${desc}"`);
            const cleanUrl = this.localServerUrl.replace(/\/$/, '');
            // GPU coordination: sfx runs as a shared reader (may overlap image,
            // never music).
            const data = await withImageSfxGpu('sfx:narrative', async (signal) => {
                const response = await fetch(`${cleanUrl}/generate-sfx`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, duration: 5 }),
                    signal,
                });
                if (!response.ok) {
                    throw new Error(`SFX server returned HTTP ${response.status}`);
                }
                return response.json();
            });
            if (data.audio) {
                await putCachedSfx({ cacheKey, dataUrl: data.audio, prompt, createdAt: Date.now() });
                this.playAudio(data.audio);
                return true;
            }
            return false;
        } catch (error) {
            log.warn(`⚠️ Narrative SFX failed for "${desc}":`, error);
            // Re-throw the genuine server/generation error so callers can surface a
            // "audio server down" notice. (Cache hits and throttle skips return
            // false above WITHOUT throwing, so they won't trigger that notice.)
            throw error;
        }
    }

    /**
     * Map a game log entry to a descriptive sound effect prompt for AudioLDM.
     */
    private getPromptForEntry(entry: LogEntry): string {
        const name = (entry.name || '').toLowerCase();
        
        switch (entry.type) {
            case 'check':
                return 'rolling plastic polyhedral dice on a heavy wooden table, d20 roll sound, close up';
            
            case 'save':
                if (name.includes('death')) {
                    return 'ominous tolling clock chime, spooky ambient whisper, fantasy death save';
                }
                return 'magical protection barrier shield chime, divine spell resist shimmer sound effect';
            
            case 'attack':
                if (entry.isDM) {
                    // Monster attack
                    if (name.includes('bite') || name.includes('mord')) {
                        return 'monster growl and snap bite teeth crunch sound effect';
                    }
                    if (name.includes('claw') || name.includes('griffe') || name.includes('swipe')) {
                        return 'beast claw swipe slash, flesh tearing scratch sound';
                    }
                    return 'monster growl and attack roar, fast swoosh swipe sound effect';
                } else {
                    // Player attack
                    if (name.includes('bow') || name.includes('arc') || name.includes('arrow') || name.includes('flèche')) {
                        return 'bow string release snap, arrow flying whoosh swoosh sound effect';
                    }
                    if (name.includes('spell') || name.includes('sort') || name.includes('ray')) {
                        return 'energy magical projectile shoot whoosh, fantasy spell launch sound';
                    }
                    return 'metallic sword slash swing, quick blade whoosh swoosh sound effect';
                }

            case 'damage':
                // Magic damage types
                if (name.includes('fire') || name.includes('feu') || name.includes('brûlure')) {
                    return 'magical fire explosion blast, burning spell flame sound effect';
                }
                if (name.includes('heal') || name.includes('soin') || name.includes('cure')) {
                    return 'divine magical healing shimmer chime, glowing spell sparkle sound effect';
                }
                if (name.includes('cold') || name.includes('froid') || name.includes('ice') || name.includes('glace')) {
                    return 'ice crackling freezing frost chime magic spell sound effect';
                }
                if (name.includes('thunder') || name.includes('tonnerre') || name.includes('lightning') || name.includes('foudre')) {
                    return 'heavy thunder strike lightning zap explosion spell sound effect';
                }
                if (name.includes('acid') || name.includes('acide') || name.includes('poison')) {
                    return 'acid sizzling bubbling splash, chemical poison hiss sound effect';
                }
                if (name.includes('necro') || name.includes('nécro')) {
                    return 'dark shadow death magic aura whoosh, creepy phantom moan sound effect';
                }
                
                // Physical or generic damage
                if (entry.isDM) {
                    return 'flesh impact punch, heavy monster swipe crunch hit sound';
                }
                return 'heavy sword metallic hit strike, blood splatter impact crunch sound effect';

            default:
                return 'quick metallic click or interface button feedback tap';
        }
    }

    /**
     * Trigger and play the sound effect matching the roll log event.
     */
    async playSfxForLog(entry: LogEntry): Promise<void> {
        if (typeof Audio === 'undefined') return;
        if (!getAppSettings().localSfx) return; // désactivé dans les Réglages

        // Dice clatter for pure rolls only. ATTACKS now fall through to the rich
        // AudioLDM prompts (sword clash, bowstring, claw, spell whoosh) below —
        // previously 'attack' short-circuited here, making those prompts dead code.
        if (entry.type === 'initiative' || entry.type === 'check' || entry.type === 'save') {
            log.info(`🔊 Playing local dice roll SFX: Dice sound.mp3 for type ${entry.type}`);
            const diceSoundUrl = new URL('../Dice sound.mp3', import.meta.url).href;
            this.playAudio(diceSoundUrl);
            return;
        }

        const prompt = this.getPromptForEntry(entry);
        auditBus.publish('sfx', `${entry.type}: ${entry.name.slice(0, 70)}`, prompt);
        const cacheKey = `sfx_${hashText(prompt)}`;

        try {
            // 1. Check cache first
            const cached = await getCachedSfx(cacheKey);
            if (cached) {
                log.info(`🔊 Playing SFX from cache for prompt: "${prompt.substring(0, 50)}..."`);
                this.playAudio(cached.dataUrl);
                return;
            }

            // 2. Generate if not cached
            log.info(`🔊 Generating SFX locally via AudioLDM: "${prompt}"`);
            const cleanUrl = this.localServerUrl.replace(/\/$/, '');
            // GPU coordination: sfx runs as a shared reader (may overlap image,
            // never music).
            const data = await withImageSfxGpu('sfx:combat', async (signal) => {
                const response = await fetch(`${cleanUrl}/generate-sfx`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt,
                        duration: 3, // SFX are short
                    }),
                    signal,
                });
                if (!response.ok) {
                    throw new Error(`SFX server returned HTTP ${response.status}`);
                }
                return response.json();
            });
            if (data.audio) {
                // 3. Cache and play
                const sfxTrack: CachedSfx = {
                    cacheKey,
                    dataUrl: data.audio,
                    prompt,
                    createdAt: Date.now(),
                };
                await putCachedSfx(sfxTrack);
                log.info(`🔊 SFX cached and playing: "${prompt.substring(0, 50)}..."`);
                this.playAudio(data.audio);
            }
        } catch (error) {
            log.warn(`⚠️ Local SFX failed for prompt "${prompt}":`, error);
        }
    }

    /**
     * Play the audio data URL with superposition safety.
     */
    private playAudio(dataUrl: string): void {
        try {
            const audio = new Audio(dataUrl);
            audio.volume = getAppSettings().sfxVolume; // Réglages (défaut 0.75)
            audio.preload = 'auto';

            // Clean up reference on end
            audio.addEventListener('ended', () => {
                this.activeAudioElements = this.activeAudioElements.filter(a => a !== audio);
            });

            this.activeAudioElements.push(audio);
            audio.play().catch(err => log.warn('SFX audio play blocked by browser policy:', err));
        } catch (e) {
            log.warn('Failed to create/play SFX HTMLAudioElement:', e);
        }
    }

    /**
     * Stop all active SFX playbacks.
     */
    stopAllSfx(): void {
        this.activeAudioElements.forEach(audio => {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        });
        this.activeAudioElements = [];
    }
}

export const localSfxService = new LocalSfxService();
