import { describe, it, expect } from 'vitest';
import { addEnemyToEncounter, matchPlayerClassAbility } from '../engine/rulesEngine';

/**
 * TR10 — Régression du nommage en combat.
 *
 * Séance réelle du 2026-08-23. Le MJ enregistre deux gardes, puis les désigne
 * par les noms qu'il vient de leur donner :
 *
 *   add_enemy_init  { name: "Garde des Quais A" }  -> success
 *   set_enemy_target{ enemy: "Garde des Quais A" } -> "Enemy not found"
 *   resolve_attack  { target: "Garde des Quais A" }-> "Target not found"
 *
 * Cause : le moteur écrasait le nom du MJ par celui du bestiaire SRD. Les deux
 * gardes s'appelaient « Guard », donc introuvables sous leur vrai nom ET
 * ambigus entre eux. Deux minutes de combat sans résolution mécanique.
 */

const empty = () => ({ isActive: true, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, enemyIntents: {}, logs: [] }) as any;

describe('combat — le nom du MJ survit à l’enregistrement', () => {
    it('garde le nom donné par le MJ, pas celui du bestiaire', () => {
        const { combatant } = addEnemyToEncounter(empty(), { name: 'Garde des Quais A', range: 'near' });
        expect(combatant.name).toBe('Garde des Quais A');
        expect(combatant.name).not.toBe('Guard');
    });

    it('emprunte quand même les STATISTIQUES du bestiaire', () => {
        const { combatant } = addEnemyToEncounter(empty(), { name: 'Garde des Quais A' });
        // Le garde SRD : 11 PV, CA 16. Sans résolution, on tomberait sur les
        // défauts homebrew (CA 10).
        expect(combatant.hp.max).toBe(11);
        expect(combatant.ac).toBe(16);
    });

    it('laisse les homonymes homonymes — l’ambiguïté est une protection voulue', () => {
        // core.test.ts teste explicitement que trois « Goblin » restent
        // ambigus, pour forcer la désignation par id plutôt que de frapper le
        // mauvais. On ne renumérote donc pas : le drame de la séance venait
        // d'homonymes FABRIQUÉS par le moteur, pas choisis par le MJ.
        let state = empty();
        const a = addEnemyToEncounter(state, { name: 'Garde' });
        state = a.state;
        const b = addEnemyToEncounter(state, { name: 'Garde' });
        expect(a.combatant.name).toBe('Garde');
        expect(b.combatant.name).toBe('Garde');
        expect(a.combatant.id).not.toBe(b.combatant.id);
    });

    it('les deux gardes de la séance sont désormais désignables séparément', () => {
        let state = empty();
        const a = addEnemyToEncounter(state, { name: 'Garde des Quais A' });
        state = a.state;
        const b = addEnemyToEncounter(state, { name: 'Garde des Quais B' });
        const names = b.state.combatants.map((c: any) => c.name);
        expect(names).toContain('Garde des Quais A');
        expect(names).toContain('Garde des Quais B');
        expect(new Set(names).size).toBe(2);
    });

    it('retombe sur le bestiaire quand le MJ ne nomme rien', () => {
        const { combatant } = addEnemyToEncounter(empty(), { name: '' });
        expect(combatant.name).toBeTruthy();
    });
});

describe('combat — aptitudes de classe confondues avec des sorts', () => {
    it('reconnaît « Imposition des mains » comme aptitude, pas comme sort', () => {
        expect(matchPlayerClassAbility('Imposition des mains')).toBe('Lay on Hands');
        expect(matchPlayerClassAbility('Lay on Hands')).toBe('Lay on Hands');
    });

    it('reconnaît les autres boutons du joueur, en français comme en anglais', () => {
        expect(matchPlayerClassAbility('Rage')).toBe('Rage');
        expect(matchPlayerClassAbility('second souffle')).toBe('Second Wind');
        expect(matchPlayerClassAbility('Inspiration bardique')).toBe('Bardic Inspiration');
        expect(matchPlayerClassAbility('Châtiment divin')).toBe('Divine Smite');
    });

    it('laisse passer les vrais sorts', () => {
        expect(matchPlayerClassAbility('Boule de feu')).toBeNull();
        expect(matchPlayerClassAbility('Bless')).toBeNull();
        expect(matchPlayerClassAbility('')).toBeNull();
    });
});
