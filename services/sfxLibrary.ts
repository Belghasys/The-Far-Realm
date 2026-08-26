/**
 * Banque de SFX pré-enregistrés — 601 sons / 165 clés sémantiques (2026-08-20,
 * recette « small-sfx + prompts foley » validée à l'oreille).
 *
 * Architecture anti-hallucination (conçue par l'utilisateur) : le MJ ne
 * fournit qu'une CLÉ d'événement (`combat/sword_swing`, `magic/fire`…) ; le
 * client charge `sfx_registry.json` et tire lui-même une variante au hasard.
 * Coût prompt ≈ 80 tokens (la liste des clés) au lieu de ~4 500 (480 noms de
 * fichiers), zéro fichier inventé, variété acoustique automatique.
 *
 * Ce module est la SEULE source de SFX (2026-08-15) : la génération Stable
 * Audio est débranchée (localSfxService reste sur disque, sans appelant).
 * Clé résolue → lecture instantanée ; rien ne matche → silence.
 *
 * Servi par audio_server (:8001/sfx → D:\Sound Library\SFX via DND_SFX_DIR).
 * URL surchargable via VITE_SFX_LIBRARY_URL (runtime.env > build > défaut).
 */

import { log } from './infra/logger';
import { auditBus } from './infra/auditBus';
import { viteEnv } from './infra/modelConfig';
import { getAppSettings } from '../store/settingsStore';

type SfxRegistry = Record<string, string[]>;

const MAX_CONCURRENT = 6; // au-delà, on refuse — pas de bouillie sonore

function libraryBaseUrl(): string {
    return viteEnv('VITE_SFX_LIBRARY_URL', import.meta.env.VITE_SFX_LIBRARY_URL, 'http://127.0.0.1:8001/sfx')
        .replace(/\/$/, '');
}

class SfxLibrary {
    private registry: SfxRegistry | null = null;
    private loadPromise: Promise<SfxRegistry | null> | null = null;
    // Anti-répétition : dernier index joué par clé (un pool > 1 ne rejoue
    // jamais deux fois de suite la même variante).
    private lastVariant = new Map<string, number>();
    private activeAudio: HTMLAudioElement[] = [];

    /** Charge le registre une fois. Un échec NE reste PAS en cache (leçon
     *  TP2 : une promesse rejetée mise en cache condamnait toute la session) —
     *  le prochain appel retente. */
    private async loadRegistry(): Promise<SfxRegistry | null> {
        if (this.registry) return this.registry;
        if (this.loadPromise) return this.loadPromise;
        this.loadPromise = (async () => {
            try {
                const response = await fetch(`${libraryBaseUrl()}/sfx_registry.json`, {
                    signal: AbortSignal.timeout(5_000),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json() as SfxRegistry;
                if (!data || typeof data !== 'object' || !Object.keys(data).length) {
                    throw new Error('Registre SFX vide ou malformé');
                }
                this.registry = data;
                log.info(`🔊 SFX bank loaded: ${Object.keys(data).length} keys`);
                return data;
            } catch (e) {
                log.debug('SFX bank unavailable (will retry on next call):', e);
                this.loadPromise = null; // retry possible
                return null;
            }
        })();
        return this.loadPromise;
    }

    /** Résout une entrée MJ vers une clé du registre.
     *  exact → normalisé → fuzzy par mots (le fallback qui absorbe les
     *  approximations du modèle : « sword swing », « magic fire bolt »…). */
    private resolveKey(registry: SfxRegistry, input: string): string | null {
        const norm = input.toLowerCase().trim()
            .replace(/^\[?sfx:?\s*/i, '').replace(/\]$/, '') // tolère « [SFX: … ] »
            .replace(/\\/g, '/').replace(/\s*\/\s*/g, '/');
        if (!norm) return null;
        if (registry[norm]) return norm;

        const compact = norm.replace(/[\s-]+/g, '_');
        if (registry[compact]) return compact;

        // Fuzzy : score = mots de l'entrée retrouvés dans la clé (catégorie ou action).
        const words = norm.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        if (!words.length) return null;
        let best: string | null = null;
        let bestScore = 0;
        for (const key of Object.keys(registry)) {
            let score = 0;
            for (const w of words) {
                if (key.includes(w)) score++;
            }
            if (score > bestScore) { bestScore = score; best = key; }
        }
        return bestScore > 0 ? best : null;
    }

    private pickVariant(key: string, pool: string[]): string {
        if (pool.length === 1) return pool[0];
        const last = this.lastVariant.get(key);
        let index = Math.floor(Math.random() * pool.length);
        if (index === last) index = (index + 1) % pool.length;
        this.lastVariant.set(key, index);
        return pool[index];
    }

    /**
     * Joue une clé de la banque. Retourne la clé résolue si un son part,
     * null si la banque est indisponible ou si rien ne matche (l'appelant
     * décide alors du fallback génération).
     */
    async playKey(input: string): Promise<string | null> {
        if (typeof Audio === 'undefined') return null;
        if (!getAppSettings().localSfx) return 'muted'; // coupé dans les Réglages : ne PAS générer non plus
        const registry = await this.loadRegistry();
        if (!registry) return null;

        const key = this.resolveKey(registry, input);
        if (!key) return null;
        const file = this.pickVariant(key, registry[key]);

        if (this.activeAudio.length >= MAX_CONCURRENT) {
            log.debug(`🔊 SFX skipped (${MAX_CONCURRENT} already playing): ${key}`);
            return key; // résolu mais volontairement non joué — pas de fallback GPU
        }

        try {
            const audio = new Audio(`${libraryBaseUrl()}/${file}`);
            audio.volume = getAppSettings().sfxVolume;
            audio.preload = 'auto';
            const cleanup = () => { this.activeAudio = this.activeAudio.filter(a => a !== audio); };
            // ML21 — retirer aussi sur 'error' et sur rejet de play(), pas
            // seulement sur 'ended', sinon les éléments fuient.
            audio.addEventListener('ended', cleanup);
            audio.addEventListener('error', cleanup);
            this.activeAudio.push(audio);
            audio.play().catch(err => { cleanup(); log.warn('SFX bank play blocked:', err); });
            auditBus.publish('sfx', `bank: ${key}`, file);
            return key;
        } catch (e) {
            log.warn('SFX bank playback failed:', e);
            return null;
        }
    }
}

export const sfxLibrary = new SfxLibrary();
