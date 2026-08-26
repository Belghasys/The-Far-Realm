/** Constantes, diagnostics et nom de modele de la session Live. */
import { Session } from '@google/genai';
import { requireViteEnv } from '../../infra/modelConfig';

export const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Check the REAL WebSocket readyState by reaching into the SDK internals.
 * Session → conn (BrowserWebSocket) → ws (native WebSocket).
 * Returns true ONLY if the raw WebSocket is OPEN (readyState === 1).
 */
export function isWebSocketOpen(session: Session | null): boolean {
    if (!session) return false;
    try {
        const conn = (session as any).conn;
        if (!conn) return false;
        const ws: WebSocket | undefined = conn.ws;
        if (!ws) return false;
        return ws.readyState === WebSocket.OPEN;
    } catch {
        return false;
    }
}
function normalizeLiveModelName(model: string): string {
    return String(model)
        .trim()
        .replace(/^models\//, '');
}
// ── DIAGNOSTIC TEMPORAIRE « coupures » ───────────────────────────────────────
// Corrèle chaque interruption serveur avec ce qui l'a précédée : injection de
// texte pendant que le MJ parle ? écho capté par le micro ? Visible dans la
// console (filtre DIAG-COUPURE) et l'AuditConsole. À RETIRER une fois le
// coupable identifié.
export function diagStamp(): string {
    const d = new Date();
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}
/** Profondeur max de la file du gate de silence (les plus anciens sont jetés). */
export const MAX_DEFERRED = 8;
/** TR10 — plancher entre deux ré-ancrages du contexte directeur déclenchés
 *  par une compression de fenêtre. Mesuré le 2026-08-23 : sans plancher,
 *  29 renvois de 12 Ko en 34 min, dont 91 % identiques au précédent. */
export const REANCHOR_MIN_INTERVAL_MS = 90_000;
export const AUDIO_MODEL = normalizeLiveModelName(requireViteEnv('VITE_AUDIO_MODEL', import.meta.env.VITE_AUDIO_MODEL));
export function liveConnectionConfigSummary() {
    return {
        model: AUDIO_MODEL,
        hasApiKey: Boolean(GEMINI_KEY),
        origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
    };
}
export type QueuedTextMessage = {
    text: string;
    createdAt: number;
};
