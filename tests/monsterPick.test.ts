/**
 * monsterPick.test.ts — Gemini nomme, le moteur choisit le spécimen.
 *
 * Décision du 2026-08-26 : quatre paliers (prévu > exact > famille > type),
 * le moteur descend vers le budget et ne monte jamais, un nom exact n'est
 * jamais substitué (le MJ est seulement averti).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { pickSpecimen } from '../engine/monsterPick';
import { BESTIARY, getCreature } from '../data/bestiary';

beforeAll(async () => {
    const t0 = Date.now();
    while (!getCreature('Lich') && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 10));
    expect(Object.keys(BESTIARY).length).toBeGreaterThan(300);
});

const solo = (heroLevel: number) => ({ heroLevel, partySize: 1 });

describe('famille : « un dragon rouge »', () => {
    it('devant un héros niveau 2 seul, c\'est un dragonnet — jamais le jeune dragon (CR 10)', () => {
        const p = pickSpecimen('un dragon rouge', solo(2), BESTIARY);
        expect(p.reason).toBe('family');
        expect(p.creature?.name).toBe('Red Dragon Wyrmling');
        expect(p.candidates.length).toBeGreaterThanOrEqual(4);
    });

    it('à haut niveau et en groupe, le budget autorise un dragon adulte', () => {
        const p = pickSpecimen('dragon rouge', { heroLevel: 17, partySize: 3, difficulty: 'deadly' }, BESTIARY);
        expect(p.reason).toBe('family');
        expect(p.creature?.name).toBe('Adult Red Dragon');
    });

    it('la couleur est respectée : « dragon bleu » ne donne jamais un rouge', () => {
        const p = pickSpecimen('un dragon bleu', solo(5), BESTIARY);
        expect(p.creature?.name).toMatch(/Blue Dragon/);
    });
});

describe('exact : jamais substitué, mais jaugé', () => {
    it('« jeune dragon rouge » devant un niveau 2 : tel quel, menace « beyond »', () => {
        const p = pickSpecimen('jeune dragon rouge', solo(2), BESTIARY);
        expect(p.reason).toBe('exact');
        expect(p.creature?.name).toBe('Young Red Dragon');
        expect(p.threat).toBe('beyond');
    });

    it('un ogre est un ogre (une seule fiche) ; un géant des collines aussi', () => {
        expect(pickSpecimen('ogre', solo(1), BESTIARY).creature?.id).toBe('ogre');
        expect(pickSpecimen('un géant des collines', solo(1), BESTIARY).creature?.id).toBe('hill_giant');
    });

    it('un gobelin devant un niveau 1 est un combat « hard », pas « trivial »', () => {
        const p = pickSpecimen('Goblin', solo(1), BESTIARY);
        expect(p.reason).toBe('exact');
        expect(['medium', 'hard']).toContain(p.threat);
    });
});

describe('type : un mot générique', () => {
    it('« un mort-vivant » niveau 3 seul → un mort-vivant de CR 1 (le plus fort qui tient), pas le zombie ni la momie', () => {
        const p = pickSpecimen('un mort-vivant', solo(3), BESTIARY);
        expect(p.reason).toBe('type');
        expect(p.creature?.type).toBe('undead');
        expect(p.creature?.cr).toBe(1);
        expect(p.creature?.xp).toBeLessThanOrEqual(p.budget);
        expect(p.candidates).toEqual(expect.arrayContaining(['Zombie', 'Ghoul', 'Mummy']));
    });

    it('« un thug » monte l\'échelle des PNJ avec le niveau : thug au niveau 2, un CR 3 au niveau 6, le gladiateur au niveau 12', () => {
        expect(pickSpecimen('un thug', solo(2), BESTIARY).creature?.id).toBe('thug');
        expect(pickSpecimen('un thug', solo(6), BESTIARY).creature?.cr).toBe(3);   // chevalier ou vétéran (700 XP ≤ 900)
        const haut = pickSpecimen('un thug', solo(12), BESTIARY);
        expect(haut.creature?.cr).toBeGreaterThanOrEqual(5);           // gladiateur ou mage
        expect(haut.creature?.xp).toBeLessThanOrEqual(haut.budget);
    });

    it('un nom exact avec une épithète reste ce nom : « Gobelin borgne » → Goblin, « Chef cultiste des Trois » → Cultist', () => {
        expect(pickSpecimen('Gobelin borgne', solo(1), BESTIARY)).toMatchObject({ reason: 'exact', creature: { id: 'goblin' } });
        expect(pickSpecimen('Chef cultiste des Trois', solo(1), BESTIARY)).toMatchObject({ reason: 'exact', creature: { id: 'cultist' } });
    });

    it('le vivier de la campagne passe d\'abord quand il a assez de candidats', () => {
        const p = pickSpecimen('un mort-vivant', { ...solo(3), campaignIds: ['skeleton', 'zombie', 'wight'] }, BESTIARY);
        expect(p.candidates).toEqual(expect.arrayContaining(['Skeleton', 'Zombie', 'Wight']));
        expect(p.candidates).toHaveLength(3);
    });
});

describe('prévu : le choix de l\'auteur passe avant tout', () => {
    it('si la rencontre courante prévoit un nécrophage, « un mort-vivant » est le nécrophage même au niveau 1', () => {
        const p = pickSpecimen('un mort-vivant', { ...solo(1), plannedIds: ['wight'] }, BESTIARY);
        expect(p.reason).toBe('planned');
        expect(p.creature?.id).toBe('wight');
    });
});

describe('rien', () => {
    it('un nom sans fiche ni famille ni type → null', () => {
        const p = pickSpecimen('Dragounet mauve des égouts', solo(3), BESTIARY);
        expect(p.creature).toBeNull();
        expect(p.reason).toBe('none');
    });
});
