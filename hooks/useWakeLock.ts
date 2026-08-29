/**
 * Verrou d'écran pendant la partie (lot D mobile, 2026-08-29).
 *
 * Sur téléphone, l'écran s'éteint pendant que le MJ parle ; le WebSocket Live
 * meurt avec lui, et chaque reconnexion tire un jeton — donc un crédit voix.
 * Tant que `active` est vrai on tient un wake-lock ; le navigateur le relâche
 * de lui-même quand l'onglet passe en arrière-plan, on le redemande au retour.
 * Là où l'API n'existe pas (Firefox, vieux Safari), le hook ne fait rien.
 */
import { useEffect } from 'react';

type Sentinel = { release?: () => Promise<void>; addEventListener?: (type: string, fn: () => void) => void };

export function useWakeLock(active: boolean): void {
    useEffect(() => {
        const api = (typeof navigator !== 'undefined' ? (navigator as any).wakeLock : null) as { request?: (type: 'screen') => Promise<Sentinel> } | null;
        if (!active || !api?.request) return;
        let sentinel: Sentinel | null = null;
        let disposed = false;
        const acquire = async () => {
            try {
                const s = await api.request!('screen');
                if (disposed) { await s.release?.(); return; }
                sentinel = s;
                // Relâché par le navigateur (onglet caché, batterie) : on
                // oublie le sentinel pour pouvoir en redemander un.
                s.addEventListener?.('release', () => { if (sentinel === s) sentinel = null; });
            } catch {
                // Refus (batterie faible, permission) : la partie continue sans.
            }
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible' && !sentinel && !disposed) void acquire();
        };
        void acquire();
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            disposed = true;
            document.removeEventListener('visibilitychange', onVisible);
            const s = sentinel;
            sentinel = null;
            if (s) void s.release?.();
        };
    }, [active]);
}
