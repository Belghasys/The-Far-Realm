/**
 * Generated portraits (hero + notable NPCs) via the local FLUX server.
 *
 * - Cached in IndexedDB per key (`hero_<save>_<name>` / `npc_<slug>`) — data
 *   URLs stay LOCAL and never enter Firestore (1 MiB doc cap).
 * - Serial queue: at most one portrait generates at a time, and scene images
 *   keep priority through gpuLock (portraits are just another image job).
 * - Fail-quiet: if the FLUX server is down or images are disabled in the
 *   Réglages, requests are dropped silently (the UI keeps its icon fallback).
 */
import { useEffect, useState } from 'react';
import { generateGeminiImage } from './geminiImageService';
import { getAppSettings } from '../store/settingsStore';
import { auditBus } from './auditBus';
import { log } from './logger';

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

export function npcPortraitKey(name: string): string {
    const slug = String(name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
    return `npc_${slug || 'unknown'}`;
}

export function heroPortraitKey(saveId: string | null | undefined, name: string): string {
    return `hero_${(saveId || 'dev').slice(0, 40)}_${npcPortraitKey(name)}`;
}

/** English caption for a portrait (proper nouns can stay French). */
export function portraitPrompt(subject: string, detail?: string): string {
    const detailPart = detail ? `, ${detail}` : '';
    return `Fantasy character portrait of ${subject}${detailPart}. Bust shot, face clearly visible, painted dark-fantasy art, dramatic lighting.`;
}

type Listener = (dataUrl: string) => void;

class PortraitService {
    private listeners = new Map<string, Set<Listener>>();
    private pending = new Set<string>();
    private failed = new Set<string>();
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

    /** Ensure a portrait exists for this key (generate once if missing). */
    request(key: string, prompt: string): void {
        const settings = getAppSettings();
        if (!settings.portraits || !settings.localImages) return;
        if (this.pending.has(key) || this.failed.has(key)) return;
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
                // One failure marks the key (no retry storm); one console warn total.
                this.failed.add(key);
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
    useEffect(() => {
        if (!key) { setUrl(null); return; }
        let active = true;
        setUrl(null);
        void portraitService.getCached(key).then(cached => {
            if (active && cached) setUrl(cached);
            else if (active && prompt) portraitService.request(key, prompt);
        });
        const unsubscribe = portraitService.subscribe(key, dataUrl => { if (active) setUrl(dataUrl); });
        return () => { active = false; unsubscribe(); };
    }, [key, prompt]);
    return url;
}
