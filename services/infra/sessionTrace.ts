/**
 * sessionTrace — JOURNAL DE SESSION SUR DISQUE (analyse post-partie).
 *
 * Demande utilisateur 2026-08-22 : « un audit log géré par code où on suit
 * exactement toute une session, pour que Fable 5 puisse l'analyser ». Le
 * navigateur ne peut pas écrire sur le disque : les événements sont POSTés
 * par lots au serveur local audio_server (:8001, déjà lancé par START_CLOUD),
 * qui les APPEND en JSONL dans <repo>/logs/sessions/<sessionId>.jsonl —
 * lisibles ensuite directement depuis Claude Code.
 *
 * Sources capturées :
 *   1. auditBus — TOUT ce qui y est publié (transcript MJ, messages sortants,
 *      tool calls, prompts système, images/musique/SFX, combat, moteur,
 *      lignes DIAG-COUPURE…). Un seul point de branchement.
 *   2. campaignEventLog — les événements de trame (jets, PV, journal…).
 *   3. trace() — appels directs pour les marqueurs qu'aucun bus ne porte.
 *
 * Robustesse : file bornée, envoi par lots (4 s / 120 lignes), sendBeacon au
 * déchargement, et DÉSACTIVATION silencieuse après 5 échecs consécutifs
 * (serveur absent = zéro bruit, zéro fuite mémoire).
 */
import { auditBus } from './auditBus';
import { campaignEventLog } from '../persistence/campaignEventLog';
import { log } from './logger';
import { viteEnv } from './modelConfig';

const BASE_URL = viteEnv(
    'VITE_SESSION_TRACE_URL',
    import.meta.env.VITE_SESSION_TRACE_URL,
    'http://127.0.0.1:8001'
).replace(/\/$/, '');

const FLUSH_INTERVAL_MS = 4000;
const MAX_BATCH = 120;
const MAX_QUEUE = 2000;      // borne dure : au-delà, on jette le plus ancien
const MAX_DETAIL = 12000;    // le contexte directeur complet doit tenir
const MAX_FAILURES = 5;

interface TraceLine {
    t: string;               // ISO timestamp
    src: 'audit' | 'campaign' | 'trace';
    ch: string;              // canal auditBus / type d'événement / kind
    title: string;
    detail?: string;
}

const clip = (v: unknown, max = MAX_DETAIL): string | undefined => {
    if (v == null) return undefined;
    const s = typeof v === 'string' ? v : (() => { try { return JSON.stringify(v); } catch { return String(v); } })();
    return s.length > max ? `${s.slice(0, max)}…[tronqué ${s.length} chars]` : s;
};

class SessionTrace {
    private sessionId: string | null = null;
    private queue: TraceLine[] = [];
    private timer: ReturnType<typeof setInterval> | null = null;
    private failures = 0;
    private disabled = false;
    private inFlight = false;
    private lastCampaignEventId: string | null = null;
    private unsubscribers: Array<() => void> = [];

    /** Démarre la capture. Idempotent — le premier appel gagne. */
    begin(meta: Record<string, unknown>): void {
        if (this.sessionId || typeof window === 'undefined') return;
        const d = new Date();
        const p = (n: number) => String(n).padStart(2, '0');
        const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
        const save = String(meta.saveId || 'nosave').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12) || 'nosave';
        this.sessionId = `${stamp}_${save}_${Math.random().toString(36).slice(2, 6)}`;

        this.push({ t: new Date().toISOString(), src: 'trace', ch: 'session', title: 'SESSION_START', detail: clip(meta) });

        // 1. auditBus : tout passe déjà par là (transcript, outils, DIAG…).
        this.unsubscribers.push(auditBus.subscribe(entry => {
            this.push({
                t: new Date(entry.ts).toISOString(),
                src: 'audit',
                ch: entry.channel,
                title: entry.title,
                detail: clip(entry.detail),
            });
        }));

        // 2. campaignEventLog : le listener ne porte pas l'événement — on diffe
        //    la liste depuis le dernier id vu (robuste au cap de 1000 entrées).
        const drainCampaignEvents = () => {
            const events = campaignEventLog.getEvents();
            let startIdx = 0;
            if (this.lastCampaignEventId) {
                const at = events.findIndex(e => e.id === this.lastCampaignEventId);
                startIdx = at >= 0 ? at + 1 : 0;
            }
            for (const ev of events.slice(startIdx)) {
                this.push({
                    t: new Date(ev.timestamp).toISOString(),
                    src: 'campaign',
                    ch: ev.type,
                    title: ev.summary,
                    detail: clip(ev.payload, 2000),
                });
            }
            if (events.length) this.lastCampaignEventId = events[events.length - 1].id;
        };
        drainCampaignEvents(); // état initial (événements restaurés du save)
        this.unsubscribers.push(campaignEventLog.subscribe(drainCampaignEvents));

        this.timer = setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
        window.addEventListener('beforeunload', this.onUnload);
        log.info(`📝 Session trace active → logs/sessions/${this.sessionId}.jsonl`);
    }

    /** Marqueur direct (connexions, purges, tailles de flush…). */
    trace(kind: string, title: string, detail?: unknown): void {
        this.push({ t: new Date().toISOString(), src: 'trace', ch: kind, title, detail: clip(detail) });
    }

    private push(line: TraceLine): void {
        if (this.disabled || !this.sessionId) return;
        this.queue.push(line);
        if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }

    private async flush(): Promise<void> {
        if (this.disabled || this.inFlight || !this.sessionId || this.queue.length === 0) return;
        const batch = this.queue.splice(0, MAX_BATCH);
        this.inFlight = true;
        try {
            const res = await fetch(`${BASE_URL}/session-log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: this.sessionId, lines: batch }),
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this.failures = 0;
        } catch (e) {
            // Rendre le lot (en tête) et compter l'échec : serveur absent
            // = on coupe proprement au lieu de spammer la console à vie.
            this.queue.unshift(...batch);
            this.failures += 1;
            if (this.failures >= MAX_FAILURES) {
                this.disabled = true;
                this.queue.length = 0;
                log.warn('📝 Session trace désactivée (serveur local injoignable) :', e instanceof Error ? e.message : e);
            }
        } finally {
            this.inFlight = false;
        }
    }

    private onUnload = (): void => {
        if (this.disabled || !this.sessionId || this.queue.length === 0) return;
        // fetch est tué au déchargement — sendBeacon survit à la fermeture.
        this.push({ t: new Date().toISOString(), src: 'trace', ch: 'session', title: 'SESSION_END (unload)' });
        try {
            const body = new Blob(
                [JSON.stringify({ sessionId: this.sessionId, lines: this.queue.splice(0, MAX_BATCH * 3) })],
                { type: 'application/json' },
            );
            navigator.sendBeacon(`${BASE_URL}/session-log`, body);
        } catch { /* best-effort */ }
    };
}

export const sessionTrace = new SessionTrace();
