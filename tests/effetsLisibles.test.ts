/**
 * effetsLisibles.test.ts — ce qu'un effet fait VRAIMENT, en clair (2026-08-31).
 *
 * La fiche affichait la liste brute des modificateurs. Pour Bénédiction, dont le
 * vrai effet est un dé (`dice: '1d4'`) et non un nombre, cela donnait
 * « attackBonus+0, saveBonus+0 » : le sort avait l'air INERTE alors qu'il est
 * l'un des meilleurs du jeu. Le champ `dice` n'était affiché nulle part.
 *
 * Deux sorties : une ligne compacte pour la fiche, et le détail complet pour le
 * survol — modificateurs, avantages, riders de dégâts, concentration, plus le
 * texte SRD de l'état quand c'en est un.
 */
import { describe, it, expect } from 'vitest';
import { explainEffect } from '../engine/combat/effectText';
import { applyConditionToCharacter } from '../engine/rulesEngine';
import { DEFAULT_CHAR } from '../data/character';
import type { ActiveEffect } from '../types';

const bless: ActiveEffect = {
    id: 'b', name: 'Bless', source: 'spell', duration: 'concentration',
    concentration: true, roundsRemaining: 10,
    description: 'SRD: +1d4 to attack rolls and saving throws for 1 minute (concentration).',
    modifiers: [
        { stat: 'attackBonus', bonus: 0, dice: '1d4' },
        { stat: 'saveBonus', bonus: 0, dice: '1d4' },
    ],
};

describe('explainEffect — le dé cesse d’être invisible', () => {
    it('Bénédiction montre son 1d4, pas un « +0 » trompeur', () => {
        const fr = explainEffect(bless, 'fr');
        expect(fr.summary).toContain('1d4');
        expect(fr.summary).not.toContain('+0');
        expect(fr.summary.toLowerCase()).toContain('attaque');
        expect(fr.summary.toLowerCase()).toContain('sauvegarde');
    });

    it('et le dit aussi en anglais', () => {
        const en = explainEffect(bless, 'en');
        expect(en.summary).toContain('1d4');
        expect(en.summary.toLowerCase()).toContain('attack');
    });

    it('signale la concentration : c’est ce qui la fait tomber', () => {
        expect(explainEffect(bless, 'fr').details.join(' ').toLowerCase()).toMatch(/concentration/);
    });

    it('reprend le texte SRD porté par l’effet', () => {
        expect(explainEffect(bless, 'fr').details.join(' ')).toContain('+1d4 to attack rolls');
    });
});

describe('explainEffect — les modificateurs chiffrés', () => {
    const fx = (modifiers: any[]): ActiveEffect =>
        ({ id: 'x', name: 'Test', source: 'spell', duration: 'rounds', roundsRemaining: 3, modifiers });

    it('rend un bonus plat avec son signe', () => {
        expect(explainEffect(fx([{ stat: 'AC', bonus: 5 }]), 'fr').summary).toContain('+5');
        expect(explainEffect(fx([{ stat: 'AC', bonus: -2 }]), 'fr').summary).toContain('-2');
    });

    it('rend une valeur IMPOSÉE comme une égalité, pas comme un bonus', () => {
        // Vitesse 0 d'un état entravant : « Vitesse +0 » se lirait « aucun effet ».
        const out = explainEffect(fx([{ stat: 'speed', bonus: 0, setTo: 0 }]), 'fr').summary;
        expect(out).toContain('= 0');
        expect(out).not.toContain('+0');
    });

    it('combine bonus ET dé quand les deux existent', () => {
        const out = explainEffect(fx([{ stat: 'attackBonus', bonus: 2, dice: '1d4' }]), 'fr').summary;
        expect(out).toContain('+2');
        expect(out).toContain('1d4');
    });

    it('ne rend jamais un « +0 » nu — c’est le bug d’origine', () => {
        expect(explainEffect(fx([{ stat: 'attackBonus', bonus: 0 }]), 'fr').summary).not.toMatch(/\+0/);
    });
});

describe('explainEffect — les drapeaux qui n’ont pas de chiffre', () => {
    const flagged = (extra: Partial<ActiveEffect>): ActiveEffect =>
        ({ id: 'f', name: 'X', source: 'class_feature', duration: 'rounds', roundsRemaining: 1, modifiers: [], ...extra });

    it('dit l’avantage à l’attaque', () => {
        expect(explainEffect(flagged({ grantsAttackAdvantage: true }), 'fr').details.join(' ').toLowerCase())
            .toMatch(/avantage/);
    });

    it('dit le REVERS : les attaques contre toi ont l’avantage', () => {
        // Attaque téméraire porte les deux ; n'afficher que le bon côté
        // donnerait au joueur une lecture faussement flatteuse.
        const d = explainEffect(flagged({ grantsAttackersAdvantage: true }), 'fr').details.join(' ').toLowerCase();
        expect(d).toMatch(/contre (toi|vous)/);
    });

    it('dit le rider de dégâts et son type', () => {
        const d = explainEffect(flagged({ onWeaponHit: { dice: '1d6', damageType: 'fire' } }), 'fr').details.join(' ');
        expect(d).toContain('1d6');
        expect(d.toLowerCase()).toContain('fire');
    });

    it('distingue un rider à usage unique d’un rider permanent', () => {
        const once = explainEffect(flagged({ onWeaponHit: { dice: '2d8', consumeOnHit: true } }), 'fr').details.join(' ');
        const each = explainEffect(flagged({ onWeaponHit: { dice: '2d8' } }), 'fr').details.join(' ');
        expect(once).not.toBe(each);
    });
});

describe('explainEffect — les états rapatrient leur règle SRD', () => {
    const etat = (nom: string) => {
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, nom);
        return (character.activeEffects || [])[0];
    };

    it('Empoisonné explique ses DEUX désavantages, pas seulement son nom', () => {
        const d = explainEffect(etat('Poisoned'), 'fr').details.join(' ');
        expect(d).toMatch(/Attack rolls have disadvantage/i);
        expect(d).toMatch(/Ability checks have disadvantage/i);
    });

    it('Entravé annonce la vitesse à 0 et le désavantage aux saves de DEX', () => {
        const d = explainEffect(etat('Restrained'), 'fr').details.join(' ');
        expect(d).toMatch(/Speed becomes 0/i);
        expect(d).toMatch(/Dexterity saves/i);
    });

    it('un effet sans rien à dire ne fabrique pas de ligne vide', () => {
        const nu: ActiveEffect = { id: 'n', name: 'Nu', source: 'item', duration: 'permanent', modifiers: [] };
        const out = explainEffect(nu, 'fr');
        expect(out.details.every(l => l.trim().length > 0)).toBe(true);
        expect(out.summary).toBe('');
    });
});

// ═══════════ Trouvé en auditant ce module (2026-08-31) ═══════════
describe('extras — les puces ne répètent pas la ligne compacte', () => {
    it('Bénédiction : les chiffres ne reviennent PAS en puces', () => {
        // La fiche affiche `summary` puis les puces. En servant `details`, les
        // deux premières puces répétaient mot pour mot la ligne du dessus, et
        // la règle SRD — la seule information neuve — se faisait couper par la
        // troncature à trois lignes.
        const v = explainEffect(bless, 'fr');
        expect(v.summary).toBe('Attaque +1d4 · Sauvegarde +1d4');
        expect(v.extras).not.toContain('Attaque +1d4');
        expect(v.extras).not.toContain('Sauvegarde +1d4');
        // Ce qui reste est exactement ce que la ligne compacte ne dit pas.
        expect(v.extras.join(' ')).toMatch(/concentration/i);
        expect(v.extras.join(' ')).toContain('+1d4 to attack rolls');
    });

    it('le survol, lui, garde TOUT — c’est sa raison d’être', () => {
        const v = explainEffect(bless, 'fr');
        expect(v.details).toContain('Attaque +1d4');
        expect(v.details.length).toBeGreaterThan(v.extras.length);
    });

    it('un effet sans chiffre a extras === details', () => {
        const nu: ActiveEffect = {
            id: 'n', name: 'X', source: 'class_feature', duration: 'rounds',
            roundsRemaining: 1, modifiers: [], grantsAttackAdvantage: true,
        };
        const v = explainEffect(nu, 'fr');
        expect(v.extras).toEqual(v.details);
    });
});
