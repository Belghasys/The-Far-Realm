/**
 * Les parties PURES des Cloud Functions : signature Paddle et table des plans.
 * (Les handlers eux-mêmes dépendent de firebase-admin et se testent en ligne.)
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { verifyPaddleSignature, signForTest } = require('../functions/paddleSignature.js');
const { PLAN_LIMITS, effectivePlan, limitsFor } = require('../functions/plans.js');

describe('signature des webhooks Paddle', () => {
    const secret = 'pdl_ntfset_test_secret';
    const body = JSON.stringify({ event_type: 'transaction.completed', data: { custom_data: { uid: 'abc123' } } });
    const now = 1_760_000_000;

    it('accepte une signature valide et récente', () => {
        const header = signForTest(body, secret, now - 10);
        expect(verifyPaddleSignature(header, body, secret, now)).toBe(true);
    });
    it('refuse un corps modifié, un mauvais secret, une signature vide', () => {
        const header = signForTest(body, secret, now);
        expect(verifyPaddleSignature(header, body + ' ', secret, now)).toBe(false);
        expect(verifyPaddleSignature(header, body, 'autre', now)).toBe(false);
        expect(verifyPaddleSignature('', body, secret, now)).toBe(false);
        expect(verifyPaddleSignature(header, body, '', now)).toBe(false);
    });
    it('refuse une signature trop vieille (rejeu)', () => {
        const header = signForTest(body, secret, now - 600);
        expect(verifyPaddleSignature(header, body, secret, now)).toBe(false);
    });
});

describe('plans et quotas', () => {
    it('sans document → free ; abonnement actif → adventurer', () => {
        expect(effectivePlan(null)).toBe('free');
        expect(effectivePlan({ plan: 'adventurer', status: 'active' })).toBe('adventurer');
        expect(limitsFor({ plan: 'adventurer', status: 'active' })).toEqual(PLAN_LIMITS.adventurer);
    });
    it('résilié, en pause ou plan inconnu → free', () => {
        expect(effectivePlan({ plan: 'adventurer', status: 'canceled' })).toBe('free');
        expect(effectivePlan({ plan: 'adventurer', status: 'paused' })).toBe('free');
        expect(effectivePlan({ plan: 'dragon', status: 'active' })).toBe('free');
    });
    it('période payée dépassée depuis plus de 3 jours → free (webhook manqué)', () => {
        const old = new Date(Date.now() - 10 * 24 * 3600_000).toISOString();
        const recent = new Date(Date.now() - 1 * 24 * 3600_000).toISOString();
        expect(effectivePlan({ plan: 'adventurer', status: 'active', currentPeriodEnd: old })).toBe('free');
        expect(effectivePlan({ plan: 'adventurer', status: 'active', currentPeriodEnd: recent })).toBe('adventurer');
    });
    it('le plan payant donne strictement plus que le gratuit', () => {
        for (const k of ['live', 'text', 'images'] as const) {
            expect(PLAN_LIMITS.adventurer[k]).toBeGreaterThan(PLAN_LIMITS.free[k]);
        }
    });
});
