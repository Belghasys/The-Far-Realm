export type CampaignEventType =
    | 'PLAYER_SPOKE'
    | 'DM_NARRATED'
    | 'ROLL_REQUESTED'
    | 'ROLL_REJECTED'
    | 'ROLL_RESOLVED'
    | 'SPELL_RESOLVED'
    | 'ENCOUNTER_STARTED'
    | 'ENCOUNTER_ENDED'
    | 'COMBATANT_ADDED'
    /** Un ennemi a quitté le combat VIVANT (moral raté, reddition, retraite). */
    | 'COMBATANT_LEFT'
    | 'COMBAT_TURN_ADVANCED'
    | 'HP_CHANGED'
    | 'XP_GRANTED'
    | 'ITEM_ADDED'
    | 'ITEM_REMOVED'
    | 'EFFECT_ADDED'
    | 'JOURNAL_UPDATED'
    | 'BRANCH_PLANNED'
    | 'CAMPAIGN_RUNTIME_UPDATED'
    | 'SCENE_CHANGED'
    | 'ASSET_GENERATED'
    | 'ASSET_THROTTLED'
    | 'MUSIC_CHANGED'
    | 'CONNECTION_EVENT';

export interface CampaignEvent<TPayload = Record<string, unknown>> {
    id: string;
    type: CampaignEventType;
    timestamp: number;
    summary: string;
    payload: TPayload;
}

const DEFAULT_CAMPAIGN_ID = 'default';
const STORAGE_PREFIX = 'dnd_campaign_events';
const MAX_EVENTS = 1000;

function makeId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

class CampaignEventLog {
    private campaignId = DEFAULT_CAMPAIGN_ID;
    private events: CampaignEvent[] = this.load();
    // GS16 (audit trame DC4) — abonnement React : `getEvents().length` en dep
    // d'un useMemo est un mutable hors React, le contexte directeur pouvait
    // rester périmé. Les composants s'abonnent et re-rendent sur append.
    private listeners = new Set<() => void>();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) {
            try { listener(); } catch { /* listener défaillant : ignorer */ }
        }
    }

    private storageKey(campaignId = this.campaignId): string {
        const stable = String(campaignId || DEFAULT_CAMPAIGN_ID)
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .slice(0, 100);
        return `${STORAGE_PREFIX}_${stable}`;
    }

    private load(): CampaignEvent[] {
        try {
            const raw = localStorage.getItem(this.storageKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    private persist() {
        try {
            localStorage.setItem(this.storageKey(), JSON.stringify(this.events.slice(-MAX_EVENTS)));
        } catch {
            // Best-effort local cache. Firestore save still carries the exported log.
        }
    }

    setCampaignId(campaignId: string | null | undefined) {
        const next = campaignId || DEFAULT_CAMPAIGN_ID;
        if (next === this.campaignId) return;
        this.campaignId = next;
        this.events = this.load();
    }

    append<TPayload = Record<string, unknown>>(
        type: CampaignEventType,
        summary: string,
        payload: TPayload
    ): CampaignEvent<TPayload> {
        // PL5 — clone JSON-safe AU MOMENT de l'append : le payload était stocké
        // PAR RÉFÉRENCE, et une mutation ultérieure de l'objet (ex.
        // holdForRollResolution qui attache la fonction resolveToolCall au
        // prompt déjà loggé) contaminait l'événement… qui partait ensuite dans
        // le document Firestore (« Unsupported field value: a function » —
        // toutes les sauvegardes échouaient). JSON.stringify élimine fonctions
        // et undefined, et fige l'instantané.
        let safePayload: TPayload;
        try {
            safePayload = payload === undefined ? (null as TPayload) : JSON.parse(JSON.stringify(payload));
        } catch {
            safePayload = { note: 'unserializable payload dropped' } as TPayload;
        }
        const event: CampaignEvent<TPayload> = {
            id: makeId(),
            type,
            timestamp: Date.now(),
            summary,
            payload: safePayload,
        };

        this.events = [...this.events, event as CampaignEvent].slice(-MAX_EVENTS);
        this.persist();
        this.notify();
        return event;
    }

    getEvents(): CampaignEvent[] {
        return [...this.events];
    }

    import(events?: CampaignEvent[]) {
        this.events = Array.isArray(events) ? events.slice(-MAX_EVENTS) : [];
        this.persist();
        this.notify();
    }

    clear() {
        this.events = [];
        try {
            localStorage.removeItem(this.storageKey());
        } catch {
            // Ignore unavailable storage.
        }
        this.notify();
    }
}

export const campaignEventLog = new CampaignEventLog();
