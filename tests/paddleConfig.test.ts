/**
 * La configuration Paddle est vérifiée, pas seulement présente.
 *
 * Le 2026-08-27 le paiement sandbox ne s'ouvrait pas et ne disait rien :
 * VITE_PADDLE_PRICE_ID portait un identifiant de PRODUIT (pro_…), pas de PRIX
 * (pri_…), et Paddle.js signale ça par un événement que personne n'écoutait.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { paddleConfigProblem, paddleConfigured } from '../services/infra/paddle';

const set = (env: string, token: string, price: string) => {
    vi.stubEnv('VITE_PADDLE_ENV', env);
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', token);
    vi.stubEnv('VITE_PADDLE_PRICE_ID', price);
};
beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe('paddleConfigProblem', () => {
    it('sandbox + jeton test_ + prix pri_ : utilisable', () => {
        set('sandbox', 'test_abc', 'pri_01abc');
        expect(paddleConfigProblem()).toBeNull();
        expect(paddleConfigured()).toBe(true);
    });

    it('un identifiant de PRODUIT (pro_) est refusé avec la marche à suivre', () => {
        set('sandbox', 'test_abc', 'pro_01abc');
        expect(paddleConfigProblem()).toMatch(/pri_/);
        expect(paddleConfigProblem()).toMatch(/Catalog/);
        expect(paddleConfigured()).toBe(false);
    });

    it('jeton live_ en sandbox, ou test_ en production : refusé', () => {
        set('sandbox', 'live_abc', 'pri_01abc');
        expect(paddleConfigProblem()).toMatch(/test_/);
        set('production', 'test_abc', 'pri_01abc');
        expect(paddleConfigProblem()).toMatch(/sandbox/);
    });

    it('valeur manquante : refusé', () => {
        set('sandbox', '', 'pri_01abc');
        expect(paddleConfigured()).toBe(false);
    });
});
