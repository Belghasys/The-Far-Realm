/**
 * Une panne de quota se VOIT (item 3b) — version 2 (audit du 2026-08-29).
 *
 * v1 faisait appeler `reportQuotaOnce` par chaque passe de fond (greffier,
 * auditeur, résumés) : quatre sites, et deux modules purs attachés à
 * localStorage pour un signalement. v2 remonte à la SOURCE : le relais
 * (geminiClient, infra) nomme le refus et prévient ses abonnés ; quotaWatch
 * (services/dm) s'abonne une fois par session et consigne le premier refus
 * de la journée par purpose — le compteur renaît à minuit UTC avec le quota.
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

import { getGeminiClient, isQuotaExhausted, onQuotaExhausted } from '../services/infra/geminiClient';
import { reportQuotaOnce, installQuotaWatch } from '../services/dm/quotaWatch';
import { campaignEventLog } from '../services/persistence/campaignEventLog';

const DAY = 24 * 3600_000;
// Chaque test vit dans sa propre journée UTC : le drapeau « déjà signalé »
// est clé par jour, donc aucun reset de test n'a besoin d'exister en prod.
let day = 0;
// Deux jours d'écart entre deux appels : un cas peut signaler « aujourd'hui »
// ET « demain » sans mordre sur le jour du cas suivant.
const today = () => Date.UTC(2030, 0, 1) + (day++) * 2 * DAY;

beforeEach(() => { campaignEventLog.clear(); });

describe('le relais nomme le refus et prévient ses abonnés', () => {
    it('resource-exhausted → QuotaExhaustedError, message serveur conservé, abonné prévenu avec le purpose', async () => {
        const seen: any[] = [];
        const off = onQuotaExhausted(info => seen.push(info));
        const call = getGeminiClient().models.generateContent({ model: 'x', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], purpose: 'memory' });
        await expect(call).rejects.toMatchObject({ name: 'QuotaExhaustedError', message: expect.stringContaining('Quota du jour atteint') });
        await call.catch(e => expect(isQuotaExhausted(e)).toBe(true));
        expect(seen).toEqual([{ purpose: 'memory', message: expect.stringContaining('Quota du jour atteint') }]);
        off();
    });
});

describe('reportQuotaOnce — une fois par purpose et par jour UTC', () => {
    it('consigne un CONNECTION_EVENT au premier refus du jour, puis se tait', () => {
        const now = today();
        expect(reportQuotaOnce('memory', 'Quota du jour atteint (600 passes de mémoire).', now)).toBe(true);
        expect(reportQuotaOnce('memory', 'Quota du jour atteint (600 passes de mémoire).', now + 3600_000)).toBe(false);
        const events = campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT');
        expect(events).toHaveLength(1);
        expect(events[0].summary).toMatch(/quota mémoire/i);
        expect(events[0].payload).toMatchObject({ purpose: 'memory' });
    });

    it('le lendemain, le quota renaît — le signalement aussi', () => {
        const now = today();
        expect(reportQuotaOnce('memory', 'x', now)).toBe(true);
        expect(reportQuotaOnce('memory', 'x', now + DAY)).toBe(true);
    });

    it('un purpose différent est signalé à son tour', () => {
        const now = today();
        reportQuotaOnce('memory', 'x', now);
        expect(reportQuotaOnce('text', 'x', now)).toBe(true);
        expect(campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT')).toHaveLength(2);
    });

    it('distingue le plafond GLOBAL du service du quota du joueur', () => {
        const now = today();
        reportQuotaOnce('memory', 'Le service a atteint son plafond du jour — réessaie demain.', now);
        expect(campaignEventLog.getEvents()[0].summary).toMatch(/plafond global/i);
    });
});

describe('installQuotaWatch — le câblage de session', () => {
    it('un refus vu par le relais finit dans le journal de campagne, et le désabonnement coupe le fil', async () => {
        const off = installQuotaWatch(() => today());
        await getGeminiClient().models.generateContent({ model: 'x', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], purpose: 'memory' }).catch(() => {});
        expect(campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT')).toHaveLength(1);
        off();
        await getGeminiClient().models.generateContent({ model: 'x', contents: [{ role: 'user', parts: [{ text: 'hi' }] }], purpose: 'text' }).catch(() => {});
        expect(campaignEventLog.getEvents().filter(e => e.type === 'CONNECTION_EVENT')).toHaveLength(1);
    });
});
