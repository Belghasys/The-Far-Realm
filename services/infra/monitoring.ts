/**
 * Supervision : erreurs (Sentry) et usages (Firebase Analytics).
 *
 * Deux règles :
 *  - jamais de donnée personnelle : Sentry reçoit l'uid, pas l'e-mail, et
 *    `sendDefaultPii` reste faux ; Analytics ne reçoit que des noms
 *    d'événements et des nombres.
 *  - jamais bloquant : sans DSN, sans support Analytics (navigateur privé,
 *    bloqueur), tout devient un no-op silencieux. Le jeu ne dépend de rien ici.
 *
 * Le DSN Sentry est PUBLIC par conception (il ne permet que d'envoyer des
 * événements) — il peut donc vivre dans VITE_SENTRY_DSN.
 */
import * as Sentry from '@sentry/react';
import type { FirebaseApp } from 'firebase/app';

declare const __APP_VERSION__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';

let sentryOn = false;

export function initMonitoring(): void {
    const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
    if (!dsn || typeof window === 'undefined') return;
    try {
        Sentry.init({
            dsn,
            release: `the-last-basement@${APP_VERSION}`,
            environment: import.meta.env.MODE,
            sendDefaultPii: false,
            // 10 % des navigations tracées : assez pour voir les écrans lents,
            // pas assez pour brûler le quota gratuit.
            tracesSampleRate: 0.1,
            integrations: [Sentry.browserTracingIntegration()],
            beforeSend(event) {
                // Ceinture et bretelles : aucune adresse e-mail ne part.
                if (event.user) delete event.user.email;
                return event;
            },
        });
        sentryOn = true;
    } catch (err) {
        console.warn('[monitoring] Sentry non démarré :', err);
    }
}

export function setMonitoringUser(uid: string | null): void {
    if (!sentryOn) return;
    Sentry.setUser(uid ? { id: uid } : null);
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
    if (!sentryOn) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
}

// ── Analytics ───────────────────────────────────────────────────────────────

type LogEvent = (name: string, params?: Record<string, string | number | boolean>) => void;
let logEventImpl: LogEvent | null = null;

/** Chargement paresseux : firebase/analytics ne pèse rien sur l'écran de
 *  connexion tant qu'il n'est pas résolu, et `isSupported` écarte les
 *  environnements sans cookies ni IndexedDB. */
export async function initAnalytics(app: FirebaseApp): Promise<void> {
    try {
        const mod = await import('firebase/analytics');
        if (!(await mod.isSupported())) return;
        const analytics = mod.getAnalytics(app);
        logEventImpl = (name, params) => mod.logEvent(analytics, name, params);
    } catch {
        logEventImpl = null;
    }
}

/** Événements produit — noms stables, sans texte libre ni identifiant. */
export type ProductEvent =
    | 'login'
    | 'character_created'
    | 'game_start'
    | 'dm_connected'
    | 'dm_reconnect'
    | 'combat_start'
    | 'level_up'
    | 'checkout_open'
    | 'account_deleted';

export function trackEvent(name: ProductEvent, params?: Record<string, string | number | boolean>): void {
    try { logEventImpl?.(name, params); } catch { /* jamais bloquant */ }
}
