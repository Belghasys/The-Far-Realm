/**
 * turnEconomy.test.ts — l'économie de tour du joueur (engine/turnEconomy.ts).
 *
 * Ces règles vivaient dans GameSession.tsx sans aucun test (contre-audit du
 * 2026-08-26). Elles fixent ce qu'un tour permet : une tranche d'action
 * principale pour un sort/potion/esquive, une action bonus, l'Attaque
 * supplémentaire qui multiplie les pips, le Sursaut d'action qui les double.
 */
import { describe, it, expect } from 'vitest';
import {
    getPlayerEconomy, patchPlayerEconomy, spendPlayerMainAction, spendPlayerBonus,
    hasPlayerMainSlice, hasPlayerBonusFree, spendResource,
} from '../engine/turnEconomy';
import { getPlayerAttackCount } from '../types';
import { DEFAULT_CHAR } from '../data/character';
import type { CharacterSheet } from '../types';

const fighter1: CharacterSheet = { ...DEFAULT_CHAR, name: 'Bran', level: 1 };
const fighter5: CharacterSheet = { ...DEFAULT_CHAR, name: 'Bran', level: 5 };
const vide: any = { isActive: true, combatants: [], currentTurn: 'player', actionEconomy: {} };

describe('la tranche d\'action principale', () => {
    it('un guerrier niveau 1 a une attaque : une tranche, puis plus rien', () => {
        expect(getPlayerAttackCount(fighter1)).toBe(1);
        expect(hasPlayerMainSlice(vide, fighter1)).toBe(true);
        const apres = spendPlayerMainAction(vide, fighter1);
        expect(getPlayerEconomy(apres)).toMatchObject({ attacksUsed: 1, actionUsed: true });
        expect(hasPlayerMainSlice(apres, fighter1)).toBe(false);
    });

    it('niveau 5 (Attaque supplémentaire) : un sort coûte la tranche entière, pas une seule attaque', () => {
        const base = getPlayerAttackCount(fighter5);
        expect(base).toBe(2);
        const apres = spendPlayerMainAction(vide, fighter5);
        expect(getPlayerEconomy(apres).attacksUsed).toBe(2);
        expect(hasPlayerMainSlice(apres, fighter5)).toBe(false);
    });

    it('Sursaut d\'action (pips doublés) : une tranche dépensée en laisse une entière', () => {
        const surge = patchPlayerEconomy(vide, { attacksMax: 4, attacksUsed: 0 });
        const apres = spendPlayerMainAction(surge, fighter5);
        expect(getPlayerEconomy(apres)).toMatchObject({ attacksUsed: 2, actionUsed: false });
        expect(hasPlayerMainSlice(apres, fighter5)).toBe(true);
        const fin = spendPlayerMainAction(apres, fighter5);
        expect(getPlayerEconomy(fin)).toMatchObject({ attacksUsed: 4, actionUsed: true });
        expect(hasPlayerMainSlice(fin, fighter5)).toBe(false);
    });

    it('une attaque déjà portée sur deux laisse moins d\'une tranche : le sort est refusé', () => {
        const uneFaite = patchPlayerEconomy(vide, { attacksMax: 2, attacksUsed: 1 });
        expect(hasPlayerMainSlice(uneFaite, fighter5)).toBe(false);
        // et la dépense ne dépasse jamais le maximum
        expect(getPlayerEconomy(spendPlayerMainAction(uneFaite, fighter5)).attacksUsed).toBe(2);
    });
});

describe('l\'action bonus', () => {
    it('une par tour, puis refusée', () => {
        expect(hasPlayerBonusFree(vide)).toBe(true);
        const apres = spendPlayerBonus(vide);
        expect(getPlayerEconomy(apres)).toMatchObject({ bonusUsed: 1, bonusActionUsed: true });
        expect(hasPlayerBonusFree(apres)).toBe(false);
    });

    it('ne touche pas à l\'action principale, et réciproquement', () => {
        const bonus = spendPlayerBonus(vide);
        expect(hasPlayerMainSlice(bonus, fighter1)).toBe(true);
        const main = spendPlayerMainAction(vide, fighter1);
        expect(hasPlayerBonusFree(main)).toBe(true);
    });
});

describe('patchPlayerEconomy', () => {
    it('garde les booléens historiques en phase avec les compteurs', () => {
        expect(getPlayerEconomy(patchPlayerEconomy(vide, { attacksMax: 3, attacksUsed: 2 })).actionUsed).toBe(false);
        expect(getPlayerEconomy(patchPlayerEconomy(vide, { attacksMax: 3, attacksUsed: 3 })).actionUsed).toBe(true);
        expect(getPlayerEconomy(patchPlayerEconomy(vide, { bonusMax: 2, bonusUsed: 1 })).bonusActionUsed).toBe(false);
    });

    it('ne modifie pas l\'état reçu et préserve l\'économie des autres combattants', () => {
        const avec: any = { ...vide, actionEconomy: { goblin: { actionUsed: true } } };
        const apres = patchPlayerEconomy(avec, { attacksUsed: 1 });
        expect(avec.actionEconomy.player).toBeUndefined();
        expect(apres.actionEconomy.goblin).toEqual({ actionUsed: true });
    });
});

describe('spendResource', () => {
    const barbare: CharacterSheet = { ...DEFAULT_CHAR, resources: { rage: { current: 2, max: 2 } } } as any;

    it('décrémente la ressource sans toucher au reste de la fiche', () => {
        const apres = spendResource(barbare, 'rage');
        expect((apres.resources as any).rage).toEqual({ current: 1, max: 2 });
        expect((barbare.resources as any).rage.current).toBe(2);
        expect(apres.hp).toEqual(barbare.hp);
    });

    it('plancher à zéro, même sur une ressource absente', () => {
        expect((spendResource(barbare, 'rage', 5).resources as any).rage.current).toBe(0);
        expect((spendResource(barbare, 'ki').resources as any).ki.current).toBe(0);
    });
});
