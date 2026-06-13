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
        const event: CampaignEvent<TPayload> = {
            id: makeId(),
            type,
            timestamp: Date.now(),
            summary,
            payload,
        };

        this.events = [...this.events, event as CampaignEvent].slice(-MAX_EVENTS);
        this.persist();
        return event;
    }

    getEvents(): CampaignEvent[] {
        return [...this.events];
    }

    import(events?: CampaignEvent[]) {
        this.events = Array.isArray(events) ? events.slice(-MAX_EVENTS) : [];
        this.persist();
    }

    clear() {
        this.events = [];
        try {
            localStorage.removeItem(this.storageKey());
        } catch {
            // Ignore unavailable storage.
        }
    }
}

export const campaignEventLog = new CampaignEventLog();
