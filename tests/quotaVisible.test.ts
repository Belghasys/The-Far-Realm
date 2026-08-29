/**
 * Une panne de quota se VOIT (item 3b du plan, 2026-08-29).
 *
 * Quand le serveur refuse une passe de fond pour quota épuisé, le greffier,
 * les résumés et l'auditeur s'arrêtaient en silence : un `log.warn` dans une
 * console que personne ne lit, et un MJ qui devient amnésique sans raison
 * visible. Désormais : le relais lève une erreur NOMMÉE, et le premier refus
 * de la session est consigné dans le journal de campagne et l'audit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/functions', () => ({
    getFunctions: () => ({}),
    httpsCallable: () => async () => {
        const err: any = new Error('Quota du jour atteint (600 passes de mémoire). Il se réinitialise à minuit UTC.');
        err.code = 'functions/resource-exhausted';
        throw err;
    },
}));

import { getGeminiClient } from '../services/infra/geminiClient';
import { reportQuotaOnce, isQuotaExhausted, resetQuotaWatchForTests } from '../services/dm/quotaWatch';
import { campaignEventLog } from '../services/persistence/campaignEventLog';

beforeEach(() => {
    campaignEventLog.clear();
    resetQuotaWatchForTests();
});

describe('le relais nomme le refus de quota', () => {
    it('resource-exhausted devient une QuotaExhaustedError, message serveur conservé', async () => {
        const call = getGeminiClient().models.generateContent({ model: 'x', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], purpose: 'memory' });
        await expect(call).rejects.toMatchObject({ name: 'QuotaExhaustedError', message: expect.stringContaining('Quota du jour atteint') });
        await call.catch(e => expect(isQuotaExhausted(e)).toBe(true));
    });
});

describe('reportQuotaOnce — visible une fois, pas à chaque passe', () => {
    const quotaErr = Object.assign(new Error('Quota du jour atteint (600 passes de mémoire).'), { name: 'QuotaExhaustedError' });

    it('consigne un CONNECTION_EVENT au premier refus, puis se tait pour le même purpose', () => {
        expect(reportQuotaOnce('memory', quotaErr)).toBe(true);
        expect(reportQuotaOnce('memory', quotaErr)).toBe(false);
        const events = campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT');
        expect(events).toHaveLength(1);
        expect(events[0].summary).toMatch(/quota/i);
        expect(events[0].payload).toMatchObject({ purpose: 'memory' });
    });

    it('un purpose différent est signalé à son tour', () => {
        reportQuotaOnce('memory', quotaErr);
        expect(reportQuotaOnce('text', quotaErr)).toBe(true);
        expect(campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT')).toHaveLength(2);
    });

    it('une erreur ordinaire ne déclenche rien', () => {
        expect(reportQuotaOnce('memory', new Error('réseau'))).toBe(false);
        expect(campaignEventLog.getEvents()).toHaveLength(0);
    });
});
