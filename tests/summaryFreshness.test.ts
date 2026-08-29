/**
 * Le résumé cumulatif — le plus récent gagne, et le MJ l'apprend.
 *
 * C2 (contre-audit 2026-08-29) : `cachedSummary` n'avait pas d'horodatage et
 * useSaveSync ne réhydratait depuis Firestore que si le cache local était
 * VIDE. Après une session sur téléphone, le PC gardait son résumé périmé, le
 * repliait à sa purge suivante et l'envoyait comme dernière archive : deux
 * chaînes « story so far » divergentes, pour toujours. Désormais le cache
 * porte `updatedAt`, l'archive Firestore porte `archivedAt`, et le plus
 * récent des deux l'emporte — un cache hérité sans date perd toujours.
 *
 * M3 : le bloc directeur lisait le résumé dans un useMemo sans dépendance ;
 * un résumé arrivé après la connexion n'atteignait le MJ qu'au battement de
 * 8 min. `subscribe` prévient GameSession, qui le renvoie aussitôt.
 */
import { describe, it, expect, vi } from 'vitest';
import { memoryManager } from '../services/persistence/memoryManager';

const mm = memoryManager as any;

describe('adoptSummaryIfNewer', () => {
    it('un cache hérité sans date perd face à n’importe quelle archive', () => {
        mm.cachedSummary = { text: 'ancien', messageCount: 0 };
        expect(memoryManager.adoptSummaryIfNewer('archive', 5)).toBe(true);
        expect(memoryManager.getCachedSummary()?.text).toBe('archive');
        expect(memoryManager.getCachedSummary()?.updatedAt).toBe(5);
    });

    it('une archive plus vieille que le cache est ignorée', () => {
        mm.cachedSummary = { text: 'local', messageCount: 0, updatedAt: 500 };
        expect(memoryManager.adoptSummaryIfNewer('vieille archive', 100)).toBe(false);
        expect(memoryManager.getCachedSummary()?.text).toBe('local');
    });

    it('une archive plus récente remplace le cache', () => {
        mm.cachedSummary = { text: 'local', messageCount: 0, updatedAt: 500 };
        expect(memoryManager.adoptSummaryIfNewer('archive du téléphone', 900)).toBe(true);
        expect(memoryManager.getCachedSummary()?.text).toBe('archive du téléphone');
    });

    it('un texte vide n’est jamais adopté', () => {
        mm.cachedSummary = { text: 'local', messageCount: 0, updatedAt: 500 };
        expect(memoryManager.adoptSummaryIfNewer('   ', 900)).toBe(false);
    });

    it('setCachedSummary horodate le cache à maintenant', () => {
        const before = Date.now();
        memoryManager.setCachedSummary('neuf');
        expect(memoryManager.getCachedSummary()?.updatedAt).toBeGreaterThanOrEqual(before);
    });
});

describe('subscribe — GameSession apprend qu’un résumé est arrivé', () => {
    it('prévient à chaque résumé posé ou adopté, et plus après désabonnement', () => {
        const fn = vi.fn();
        const off = memoryManager.subscribe(fn);
        memoryManager.setCachedSummary('a');
        mm.cachedSummary = { text: 'a', messageCount: 0, updatedAt: 1 };
        memoryManager.adoptSummaryIfNewer('b', 2);
        memoryManager.adoptSummaryIfNewer('c', 1); // refusé : pas de notification
        expect(fn).toHaveBeenCalledTimes(2);
        off();
        memoryManager.setCachedSummary('d');
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
