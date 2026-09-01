/**
 * defenseSansArmure.test.ts — la CA du Barbare et du Moine (2026-08-31).
 *
 * Trouvé en passant les 114 traits de classe au crible : la Défense sans armure
 * n'existait nulle part. `getBaseACFromArmor` gérait la Résilience draconique du
 * Sorcier (13 + DEX) mais pas les deux traits de NIVEAU 1 qui font toute
 * l'identité défensive du Barbare et du Moine.
 *
 * Conséquence mesurée : trois points de CA en moins, en permanence, sur chaque
 * attaque de chaque combat. Ce n'est pas un trait de niche qu'on oublie — c'est
 * la raison pour laquelle ces deux classes se battent sans armure.
 */
import { describe, it, expect } from 'vitest';
import { getBaseACFromArmor } from '../engine/character';
import { DEFAULT_CHAR } from '../data/character';

const mod = (v: number) => Math.floor((v - 10) / 2);
const nu = (cls: string, stats: Record<string, number>, extra: any = {}) =>
    ({ ...DEFAULT_CHAR, class: cls, level: 5, inventory: [], ac: 0, stats, ...extra }) as any;

const STATS_BARBARE = { STR: 16, DEX: 14, CON: 16, INT: 8, WIS: 10, CHA: 10 };
const STATS_MOINE = { STR: 12, DEX: 16, CON: 14, INT: 10, WIS: 16, CHA: 8 };

describe('Défense sans armure — le trait de niveau 1 qui manquait', () => {
    it('Barbare : 10 + DEX + CON', () => {
        expect(getBaseACFromArmor(nu('Barbarian', STATS_BARBARE)))
            .toBe(10 + mod(STATS_BARBARE.DEX) + mod(STATS_BARBARE.CON));
    });

    it('Moine : 10 + DEX + SAG', () => {
        expect(getBaseACFromArmor(nu('Monk', STATS_MOINE)))
            .toBe(10 + mod(STATS_MOINE.DEX) + mod(STATS_MOINE.WIS));
    });

    it('les autres classes gardent 10 + DEX — le trait leur est propre', () => {
        for (const cls of ['Mage', 'Rogue', 'Cleric', 'Fighter', 'Bard']) {
            expect(getBaseACFromArmor(nu(cls, STATS_MOINE)), cls).toBe(10 + mod(STATS_MOINE.DEX));
        }
    });

    it('une caractéristique FAIBLE réduit la CA — le trait n’est pas un plancher', () => {
        // Un barbare à CON 8 doit descendre à 9, pas rester à 10 + DEX : sinon
        // le trait deviendrait un bonus gratuit au lieu d'un pari sur la CON.
        const fragile = { STR: 16, DEX: 10, CON: 8, INT: 10, WIS: 10, CHA: 10 };
        expect(getBaseACFromArmor(nu('Barbarian', fragile))).toBe(9);
    });
});

describe('Défense sans armure — ce qui l’annule ou s’y ajoute', () => {
    const ARMURE = {
        name: 'Chain Mail', type: 'armor', equipped: true, slot: 'chest',
        baseAC: 16, armorType: 'heavy',
    };
    const BOUCLIER = {
        name: 'Shield', type: 'armor', equipped: true, slot: 'offHand',
        armorType: 'shield', acBonus: 2,
    };

    it('porter une ARMURE annule le trait — RAW, il exige d’être sans armure', () => {
        const blinde = nu('Barbarian', STATS_BARBARE, { inventory: [ARMURE] });
        expect(getBaseACFromArmor(blinde)).toBe(16);
    });

    it('mais un BOUCLIER reste compatible pour le Barbare', () => {
        // RAW : « tant que tu ne portes pas d'armure » — le bouclier est permis
        // et s'ajoute. C'est la construction classique du barbare.
        const avecBouclier = nu('Barbarian', STATS_BARBARE, { inventory: [BOUCLIER] });
        expect(getBaseACFromArmor(avecBouclier))
            .toBe(10 + mod(STATS_BARBARE.DEX) + mod(STATS_BARBARE.CON) + 2);
    });

    it('le Moine perd son trait avec un bouclier — RAW, lui l’interdit', () => {
        const moineBouclier = nu('Monk', STATS_MOINE, { inventory: [BOUCLIER] });
        expect(getBaseACFromArmor(moineBouclier)).toBe(10 + mod(STATS_MOINE.DEX) + 2);
    });

    it('n’écrase pas une CA naturelle déjà supérieure', () => {
        // Le repli existant (`character.ac > baseAC`) sert aux fiches héritées.
        const naturel = nu('Barbarian', STATS_BARBARE, { ac: 18 });
        expect(getBaseACFromArmor(naturel)).toBe(18);
    });

    it('ne casse pas la Résilience draconique du Sorcier', () => {
        const sorcier = nu('Sorcerer', STATS_MOINE, { subclass: 'Draconic Bloodline' });
        expect(getBaseACFromArmor(sorcier)).toBe(13 + mod(STATS_MOINE.DEX));
    });
});
