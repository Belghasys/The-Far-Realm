/**
 * partyWeight.test.ts — le poids des alliés dans le budget de rencontre.
 *
 * Décision du 2026-08-26 : un allié pèse selon son CR face au niveau du
 * héros (1 / ½ / 0), plus jamais comme un aventurier entier par défaut.
 */
import { describe, it, expect } from 'vitest';
import { allyWeight, effectivePartySize } from '../engine/partyWeight';

describe('allyWeight', () => {
    it('un vétéran (CR 3) compte pour un aventurier auprès d\'un héros niveau 3 à 6', () => {
        expect(allyWeight(3, 3)).toBe(1);
        expect(allyWeight(3, 6)).toBe(1);
        expect(allyWeight(3, 7)).toBe(0.5);
        expect(allyWeight(3, 13)).toBe(0);
    });

    it('un civil (CR 0) ne compte jamais : c\'est quelqu\'un à protéger', () => {
        expect(allyWeight(0, 1)).toBe(0);
        expect(allyWeight(undefined, 1)).toBe(0);
        expect(allyWeight(null, 5)).toBe(0);
    });

    it('un gobelin allié (CR 1/4) : un demi-aventurier au niveau 1, rien au niveau 2', () => {
        expect(allyWeight(0.25, 1)).toBe(0.5);
        expect(allyWeight(0.25, 2)).toBe(0);
    });
});

describe('effectivePartySize', () => {
    it('le héros seul vaut 1', () => {
        expect(effectivePartySize(3, [])).toBe(1);
    });

    it('héros niveau 3 + vétéran + boulanger = 2 aventuriers, pas 3', () => {
        expect(effectivePartySize(3, [3, 0])).toBe(2);
    });

    it('borné à 8 comme les tables du SRD, jamais sous 1', () => {
        expect(effectivePartySize(1, Array(20).fill(5))).toBe(8);
        expect(effectivePartySize(1, [undefined, 0])).toBe(1);
    });
});
