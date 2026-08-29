/**
 * « Combat: Caelen vs unknown foes — … — fled: Elephant » (sauvegarde réelle,
 * 2026-08-29). Quand TOUS les ennemis quittent le combat vivants, ils passent
 * dans `departed` et sortent de `combatants` : la chronique perdait le nom de
 * l'adversaire alors qu'elle l'avait sous la main dans le segment `departed`.
 */
import { describe, it, expect } from 'vitest';
import { formatCombatChronicleLine } from '../services/dm/chronicle';

const base = { heroName: 'Caelen', hpCurrent: 96, hpMax: 120, hpStart: 120, outcome: 'victory' as const, xp: 1100 };

describe('formatCombatChronicleLine — les adversaires partis vivants', () => {
    it('reprend les noms de `departed` quand le roster est vide', () => {
        const line = formatCombatChronicleLine({ ...base, foes: 'unknown foes', departed: 'fled: Elephant' });
        expect(line).toContain('vs Elephant');
        expect(line).not.toContain('unknown foes');
    });

    it('gère plusieurs raisons et plusieurs noms', () => {
        const line = formatCombatChronicleLine({ ...base, foes: 'unknown foes', departed: 'fled: 2x Goblin; surrendered: Bandit' });
        expect(line).toContain('vs 2x Goblin, Bandit');
    });

    it('ne touche pas à une ligne qui a déjà ses adversaires', () => {
        const line = formatCombatChronicleLine({ ...base, foes: '3x ogre', departed: 'fled: Wolf' });
        expect(line).toContain('vs 3x ogre');
        expect(line).toContain('fled: Wolf');
    });

    it('reste « unknown foes » quand rien ne permet de mieux', () => {
        expect(formatCombatChronicleLine({ ...base, foes: 'unknown foes' })).toContain('vs unknown foes');
    });
});
