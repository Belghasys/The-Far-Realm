/**
 * Generated portraits (hero + notable NPCs + campaign style anchor).
 *
 * - Cached in IndexedDB per key (`hero_<portraitId|slug>` / `npc_<slug>`) —
 *   data URLs stay LOCAL and never enter Firestore (1 MiB doc cap).
 * - Serial queue: at most one portrait generates at a time, and scene images
 *   keep priority through gpuLock (portraits are just another image job).
 * - Fail-quiet: if the image backend is down or images are disabled in the
 *   Réglages, requests are dropped silently (the UI keeps its icon fallback);
 *   a failed key becomes retryable after FAILURE_RETRY_MS.
 */
import { useEffect, useRef, useState } from 'react';
import { generateGeminiImage } from './geminiImageService';
import { getAppSettings } from '../store/settingsStore';
import { auditBus } from './auditBus';
import { log } from './logger';
import type { CharacterSheet } from '../types';

const DB_NAME = 'dungeonai_portraits';
const DB_VERSION = 1;
const STORE = 'portraits';

interface PortraitRecord {
    key: string;
    dataUrl: string;
    createdAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

function slugify(name: string): string {
    return String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60) || 'unknown';
}

export function npcPortraitKey(name: string): string {
    return `npc_${slugify(name)}`;
}

/**
 * Clé du portrait du héros.
 *
 * Priorité à `storyProfile.portraitId`, un identifiant unique posé par la forge
 * à la création : deux héros homonymes de deux campagnes différentes ne se
 * volent plus le visage (contre-audit 2026-08-22, constat #4). Repli sur le nom
 * pour les personnages d'avant la forge — même comportement qu'avant, collision
 * homonyme incluse, mais uniquement pour ces sauvegardes héritées.
 *
 * Volontairement INDÉPENDANTE de la sauvegarde : le portrait est forgé quand
 * `activeSaveId` vaut encore null — l'ancienne clé `hero_<save>_<nom>` manquait
 * le cache dès la partie lancée et régénérait un autre visage.
 */
export function heroPortraitKey(character: Pick<CharacterSheet, 'name' | 'storyProfile'>): string {
    const id = character.storyProfile?.portraitId;
    return `hero_${slugify(id || character.name)}`;
}

/** Clé héritée (par nom) — sert à migrer un portrait forgé avant l'ère portraitId. */
export function heroLegacyPortraitKey(name: string): string {
    return `hero_${slugify(name)}`;
}

/** English caption for a portrait (proper nouns can stay French). */
export function portraitPrompt(subject: string, detail?: string): string {
    const detailPart = detail ? `, ${detail}` : '';
    return `Fantasy character portrait of ${subject}${detailPart}. Bust shot, face clearly visible, painted dark-fantasy art, dramatic lighting.`;
}

/** Nombre d'essais offerts au joueur dans la forge de portrait. */
export const MAX_HERO_PORTRAIT_ATTEMPTS = 3;

/**
 * Prompt du portrait du héros, bâti sur la TOTALITÉ de ce que le joueur a écrit —
 * identité, apparence, équipement, tempérament — et non sur « race classe ».
 *
 * Ce portrait n'est pas décoratif : une fois retenu, il devient la référence
 * (`referenceImages`) injectée dans toutes les images de scène. C'est lui qui
 * fixe le visage du héros pour toute la campagne, d'où l'effort sur le détail.
 */
export function heroPortraitPrompt(character: CharacterSheet): string {
    const profile = character.storyProfile || {};
    const identity = [character.race, character.subclass, character.class].filter(Boolean).join(' ').trim();
    const parts = [
        `Fantasy character portrait of ${character.name?.trim() || 'a nameless hero'}, a ${identity || 'adventurer'}.`,
        profile.appearance?.trim() ? `${profile.appearance.trim()}.` : '',
        character.weapon?.name ? `Armed with ${character.weapon.name}.` : '',
        profile.personality?.trim() ? `Bearing and temperament: ${profile.personality.trim()}.` : '',
        'Bust shot, face clearly visible, plain dark background, painted dark-fantasy art, dramatic lighting.',
    ];
    // Cap 900 : le proxy Firebase refuse au-delà de 1200 caractères, et un joueur
    // bavard sur quatre champs y arrive vite.
    const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return text.length > 900 ? `${text.slice(0, 900).trimEnd()}…` : text;
}

type Listener = (dataUrl: string) => void;

/** Un échec ne condamne plus la clé pour la session : retentative après ce
 *  délai. Sans ça, une ancre de style ratée une fois (quota, réseau) laissait
 *  toute la campagne sans ancre jusqu'au F5. */
const FAILURE_RETRY_MS = 10 * 60_000;

class PortraitService {
    private listeners = new Map<string, Set<Listener>>();
    private pending = new Set<string>();
    /** clé → epoch ms du dernier échec (retryable après FAILURE_RETRY_MS). */
    private failed = new Map<string, number>();
    private queue: Promise<void> = Promise.resolve();
    private serverWarned = false;

    subscribe(key: string, listener: Listener): () => void {
        const set = this.listeners.get(key) || new Set<Listener>();
        set.add(listener);
        this.listeners.set(key, set);
        return () => { set.delete(listener); };
    }

    private notify(key: string, dataUrl: string) {
        this.listeners.get(key)?.forEach(listener => {
            try { listener(dataUrl); } catch { /* listener errors never break the queue */ }
        });
    }

    async getCached(key: string): Promise<string | null> {
        const db = await openDb();
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const request = tx.objectStore(STORE).get(key);
            request.onsuccess = () => { resolve((request.result as PortraitRecord | undefined)?.dataUrl || null); db.close(); };
            request.onerror = () => { resolve(null); db.close(); };
        });
    }

    private async putCached(record: PortraitRecord): Promise<void> {
        const db = await openDb();
        if (!db) return;
        await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); resolve(); };
        });
    }

    /**
     * Génère UN candidat de portrait sans rien écrire en cache — la forge en
     * propose plusieurs et seul celui que le joueur retient devient canonique.
     * Passe par la même file sérialisée que `request` pour ne pas entrer en
     * concurrence avec les images de scène sur le GPU / le quota.
     */
    async generateCandidate(prompt: string): Promise<string> {
        // Même gate que `request` : la forge ne doit pas déclencher un appel
        // cloud quand le joueur a coupé les images dans les Réglages
        // (contre-audit 2026-08-22, constat #6). Erreur claire plutôt que
        // silence — la forge affiche la cause.
        const settings = getAppSettings();
        if (!settings.portraits || !settings.localImages) {
            throw new Error('Portraits désactivés dans les Réglages.');
        }
        const run = this.queue.then(async () => {
            auditBus.publish('image', 'portrait candidate', prompt);
            return await generateGeminiImage(prompt, { aspectRatio: '1:1' });
        });
        // La file ne doit jamais rester bloquée sur un échec de candidat.
        this.queue = run.then(() => undefined, () => undefined);
        return await run;
    }

    /**
     * Fige le portrait retenu sous sa clé canonique et prévient les abonnés.
     * À partir de là, `usePortrait` le sert depuis le cache et ne régénère plus,
     * et `collectSceneReferences` l'injecte dans chaque image de scène.
     */
    async adopt(key: string, dataUrl: string): Promise<void> {
        await this.putCached({ key, dataUrl, createdAt: Date.now() });
        // Un portrait adopté annule un éventuel échec antérieur sur cette clé.
        this.failed.delete(key);
        this.notify(key, dataUrl);
    }

    /** Ensure a portrait exists for this key (generate once if missing). */
    request(key: string, prompt: string): void {
        const settings = getAppSettings();
        if (!settings.portraits || !settings.localImages) return;
        if (this.pending.has(key)) return;
        const failedAt = this.failed.get(key);
        if (failedAt !== undefined) {
            if (Date.now() - failedAt < FAILURE_RETRY_MS) return; // échec récent : on attend
            this.failed.delete(key); // fenêtre passée : nouvelle chance
        }
        this.pending.add(key);

        this.queue = this.queue.then(async () => {
            try {
                const cached = await this.getCached(key);
                if (cached) { this.notify(key, cached); return; }
                auditBus.publish('image', `portrait: ${key}`, prompt);
                const dataUrl = await generateGeminiImage(prompt, { aspectRatio: '1:1' });
                await this.putCached({ key, dataUrl, createdAt: Date.now() });
                this.notify(key, dataUrl);
            } catch (error) {
                // One failure parks the key for FAILURE_RETRY_MS (no retry storm);
                // one console warn total.
                this.failed.set(key, Date.now());
                if (!this.serverWarned) {
                    this.serverWarned = true;
                    log.warn('Portrait generation unavailable (FLUX server down or disabled):', error);
                }
            } finally {
                this.pending.delete(key);
            }
        });
    }
}

export const portraitService = new PortraitService();

/**
 * React hook: returns the cached/generated portrait data URL for a key (null
 * until available). Passing a prompt requests generation when missing.
 */
export function usePortrait(key: string | null, prompt?: string | null): string | null {
    const [url, setUrl] = useState<string | null>(null);
    // Le prompt vit dans une ref : il ne sert QU'À générer quand le cache est
    // vide, donc un prompt qui change (arme équipée, mémoire de PNJ ajoutée…)
    // ne doit PAS relancer l'effet — l'ancien deps [key, prompt] faisait
    // clignoter le portrait (setUrl(null) → re-lecture cache) à chaque
    // changement d'équipement (contre-audit 2026-08-22, constat C.4).
    const promptRef = useRef(prompt);
    useEffect(() => { promptRef.current = prompt; }, [prompt]);
    useEffect(() => {
        if (!key) { setUrl(null); return; }
        let active = true;
        setUrl(null);
        void portraitService.getCached(key).then(cached => {
            if (active && cached) setUrl(cached);
            else if (active && promptRef.current) portraitService.request(key, promptRef.current);
        });
        const unsubscribe = portraitService.subscribe(key, dataUrl => { if (active) setUrl(dataUrl); });
        return () => { active = false; unsubscribe(); };
    }, [key]);
    return url;
}
