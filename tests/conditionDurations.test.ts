/**
 * conditionDurations.test.ts — les états durent enfin ce qu'ils doivent durer
 * (2026-08-31).
 *
 * Avant : `conditionToEffect` écrivait `roundsRemaining: 10` en dur pour
 * N'IMPORTE quel état. Étourdi, À terre, Empoisonné, Inconscient : dix rounds
 * pour tout le monde. Un Étourdi qui dure dix tours décide un combat à lui seul,
 * et un Inconscient qui se réveille tout seul casse les jets de mort.
 *
 * Deux choses sont verrouillées ici :
 *
 *   1. La TABLE : chaque état porte son nombre de tours, et quatre états n'ont
 *      volontairement PAS de compteur (ils finissent sur un événement).
 *
 *   2. L'ARITHMÉTIQUE DU DÉCOMPTE, qui est le vrai piège. Le tick se fait au
 *      DÉBUT du tour du porteur. Un état stocké à 1 serait donc décompté à
 *      l'ouverture du tour qu'il devait justement bloquer — il n'aurait jamais
 *      mordu. Couvrir N tours COMPLETS demande N+1 bornes de décompte.
 */
import { describe, it, expect } from 'vitest';
import {
    CONDITION_TURNS,
    EVENTLESS_FALLBACK_TURNS,
    applyConditionToCharacter,
    applyConditionToEncounter,
    tickRoundEffects,
    getActionCapability,
} from '../engine/rulesEngine';
import { resolveAttackAction } from '../engine/combat/attack';
import { SRD51_CONDITIONS } from '../data/srd51';
import { DEFAULT_CHAR } from '../data/character';
import type { ActiveEffect } from '../types';

/** Les états qui finissent sur un ÉVÉNEMENT, jamais sur un compteur. */
const SANS_COMPTEUR = ['grappled', 'unconscious', 'petrified', 'exhaustion'];

// ═══════════ La table couvre le SRD, sans trou ni invention ═══════════
describe('CONDITION_TURNS — la table couvre exactement les états SRD', () => {
    it('chaque état de la table SRD a une entrée', () => {
        const manquants = SRD51_CONDITIONS
            .map((c: any) => c.id)
            .filter((id: string) => !(id in CONDITION_TURNS));
        expect(manquants, `états SRD sans durée déclarée : ${manquants.join(', ')}`).toEqual([]);
    });

    it('la table n’invente aucun état qui n’existe pas', () => {
        const connus = new Set(SRD51_CONDITIONS.map((c: any) => c.id));
        const inventes = Object.keys(CONDITION_TURNS).filter(id => !connus.has(id));
        expect(inventes, `états déclarés mais absents du SRD : ${inventes.join(', ')}`).toEqual([]);
    });

    it('les quatre états à événement n’ont pas de compteur', () => {
        for (const id of SANS_COMPTEUR) {
            expect(CONDITION_TURNS[id], `${id} ne doit pas avoir de compteur`).toBeNull();
        }
    });

    it('tous les autres ont un compteur strictement positif et jouable', () => {
        for (const [id, tours] of Object.entries(CONDITION_TURNS)) {
            if (tours === null) continue;
            expect(tours, `${id}`).toBeGreaterThan(0);
            // Dix tours, c'était le bug d'origine : au-delà, un état décide le
            // combat à lui seul. Seul Invisible (vrai sort d'une minute) y a droit.
            expect(tours, `${id} dure trop longtemps pour se jouer`).toBeLessThanOrEqual(10);
        }
    });

    it('les durées décidées avec Salim le 2026-08-31', () => {
        expect(CONDITION_TURNS.stunned).toBe(1);
        expect(CONDITION_TURNS.prone).toBe(1);
        expect(CONDITION_TURNS.incapacitated).toBe(1);
        expect(CONDITION_TURNS.paralyzed).toBe(2);
        expect(CONDITION_TURNS.frightened).toBe(2);
        expect(CONDITION_TURNS.restrained).toBe(2);
        expect(CONDITION_TURNS.blinded).toBe(3);
        expect(CONDITION_TURNS.charmed).toBe(3);
        expect(CONDITION_TURNS.deafened).toBe(3);
        expect(CONDITION_TURNS.poisoned).toBe(5);
        expect(CONDITION_TURNS.invisible).toBe(10);
    });
});

// ═══════════ L'arithmétique du décompte ═══════════
const tickN = (effects: ActiveEffect[], n: number) => {
    let out = effects;
    for (let i = 0; i < n; i++) out = tickRoundEffects(out).activeEffects;
    return out;
};
const porte = (effects: ActiveEffect[], nom: string) =>
    effects.some(e => e.name.toLowerCase() === nom.toLowerCase());

describe('décompte — un état couvre N tours COMPLETS de son porteur', () => {
    it('Étourdi (1 tour) prive bien la cible de son prochain tour', () => {
        // C'est LE test qui compte. Avec un stockage à 1, le tick d'ouverture du
        // tour effaçait l'état avant qu'il ait pu bloquer quoi que ce soit.
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, 'Stunned');
        let fx = character.activeEffects || [];

        // Ouverture du tour que l'état doit bloquer.
        fx = tickN(fx, 1);
        expect(porte(fx, 'Stunned'), 'l’état doit tenir pendant le tour qu’il bloque').toBe(true);
        expect(getActionCapability(fx).canAct, 'la cible ne doit pas pouvoir agir').toBe(false);

        // Ouverture du tour suivant : l'état est passé.
        fx = tickN(fx, 1);
        expect(porte(fx, 'Stunned')).toBe(false);
        expect(getActionCapability(fx).canAct).toBe(true);
    });

    it('Empoisonné (5 tours) tient cinq tours, pas quatre ni six', () => {
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, 'Poisoned');
        let fx = character.activeEffects || [];
        fx = tickN(fx, 5);
        expect(porte(fx, 'Poisoned'), 'encore là au 5e tour couvert').toBe(true);
        fx = tickN(fx, 1);
        expect(porte(fx, 'Poisoned'), 'parti au 6e').toBe(false);
    });

    it('À terre (1 tour) se relève au tour suivant', () => {
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, 'Prone');
        const fx = character.activeEffects || [];
        expect(porte(tickN(fx, 1), 'Prone')).toBe(true);
        expect(porte(tickN(fx, 2), 'Prone')).toBe(false);
    });
});

// ═══════════ Les états à événement ne s'évaporent jamais ═══════════
describe('états à événement — aucun compteur ne les efface', () => {
    it.each(['Unconscious', 'Petrified', 'Grappled'])('%s survit à vingt tours', (nom) => {
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, nom);
        const fx = tickN(character.activeEffects || [], 20);
        expect(porte(fx, nom), `${nom} ne doit finir que sur un événement`).toBe(true);
    });

    it('un héros inconscient ne se réveille pas tout seul en plein combat', () => {
        // Le compteur à 10 rendait ses actions au héros à terre sans un seul
        // soin — et les jets de mort continuaient en parallèle.
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, 'Unconscious');
        const fx = tickN(character.activeEffects || [], 12);
        expect(getActionCapability(fx).canAct).toBe(false);
    });
});

// ═══════════ Les buffs de sorts ne sont pas concernés ═══════════
describe('buffs de sorts — la table des états ne les touche pas', () => {
    it('Bouclier garde son round unique, sans offset', () => {
        // Sa règle n'est pas « pendant N tours » mais « jusqu'au DÉBUT de ton
        // prochain tour » : une borne, pas N+1. Un offset ici doublerait sa durée.
        const shield: ActiveEffect = {
            id: 's1', name: 'Shield', source: 'spell', duration: 'rounds',
            roundsRemaining: 1, modifiers: [{ stat: 'AC', bonus: 5 }],
        };
        expect(porte(tickN([shield], 1), 'Shield')).toBe(false);
    });

    it('Bénédiction garde ses dix rounds de concentration', () => {
        const bless: ActiveEffect = {
            id: 'b1', name: 'Bless', source: 'spell', duration: 'concentration',
            concentration: true, roundsRemaining: 10,
            modifiers: [{ stat: 'attackBonus', bonus: 0, dice: '1d4' }],
        };
        expect(porte(tickN([bless], 9), 'Bless')).toBe(true);
        expect(porte(tickN([bless], 10), 'Bless')).toBe(false);
    });
});

// ═══════════ Héros et ennemi : deux réponses opposées ═══════════
//
// Trouvé par l'audit inversé du 2026-08-31. « Pas de compteur » est juste pour
// le HÉROS — ses jets de mort gouvernent son sort. Pour un ENNEMI c'est un trou
// d'équilibre : les événements de fin (dégâts qui réveillent, jet d'évasion,
// Restauration supérieure) ne sont PAS implémentés, donc un simple
// apply_condition('unconscious') le retirait du combat DÉFINITIVEMENT — son tour
// sauté à chaque round, sans jet ni réveil. Le forfait d'avant était grossier
// mais c'était une soupape ; l'avoir retirée sans poser le mécanisme réel a
// ouvert le trou. Le filet le referme, côté ennemi seulement.
describe('états sans événement de fin : filet côté ennemi', () => {
    const roster = (isPlayer: boolean) => ({
        isActive: true, currentTurn: 'X', round: 1, turnIndex: 0,
        combatants: [{ id: 'x', name: 'Ogre', hp: { current: 30, max: 30 }, ac: 11, initiative: 10, isPlayer }],
    }) as any;

    const effetsDe = (state: any) => state.combatants[0].activeEffects || [];

    it('un ennemi Inconscient finit par se relever — il n’est plus supprimé du combat', () => {
        const { state } = applyConditionToEncounter(roster(false), 'Ogre', 'Unconscious');
        let fx = effetsDe(state);
        expect(getActionCapability(fx).canAct, 'il doit rester incapable un moment').toBe(false);
        fx = tickN(fx, EVENTLESS_FALLBACK_TURNS);
        expect(getActionCapability(fx).canAct, 'toujours à terre au dernier tour couvert').toBe(false);
        fx = tickN(fx, 1);
        expect(getActionCapability(fx).canAct, 'et il revient au combat').toBe(true);
    });

    it.each(['Grappled', 'Petrified'])('%s sur un ennemi porte aussi le filet', (nom) => {
        const { state } = applyConditionToEncounter(roster(false), 'Ogre', nom);
        expect(effetsDe(state)[0].roundsRemaining).toBe(EVENTLESS_FALLBACK_TURNS + 1);
    });

    it('le HÉROS garde l’absence de compteur, même comme ligne de combat', () => {
        // Un héros à terre qui se relève tout seul casserait ses jets de mort :
        // c'est le comportement que l'audit précédent avait justement corrigé.
        const { state } = applyConditionToEncounter(roster(true), 'Ogre', 'Unconscious');
        expect(effetsDe(state)[0].roundsRemaining).toBeUndefined();
        expect(getActionCapability(tickN(effetsDe(state), 20)).canAct).toBe(false);
    });

    it('les états qui ONT déjà une durée ne sont pas touchés par le filet', () => {
        const { state } = applyConditionToEncounter(roster(false), 'Ogre', 'Stunned');
        expect(effetsDe(state)[0].roundsRemaining).toBe(CONDITION_TURNS.stunned! + 1);
    });
});

// ═══════════ B : la raison du jet remonte jusqu'au joueur ═══════════
//
// Trouvé par l'audit inversé. Le moteur calculait déjà « Poisoned: attacker has
// disadvantage » dans `contextReasons`… et le jetait. Ces raisons n'atteignaient
// l'écran que par ActionPrompt, qui n'apparaît QUE pour un jet demandé par le MJ.
// L'attaque au bouton — le jet le plus fréquent du jeu — n'en montrait rien.
// D'où « les états n'influent pas vraiment » : ils influaient, en silence.
describe('l’attaque rend les raisons qui ont pesé sur elle', () => {
    const etat = (nom: string) => {
        const { character } = applyConditionToCharacter(DEFAULT_CHAR as any, nom);
        return character.activeEffects || [];
    };
    const frappe = (effects: ActiveEffect[]) => resolveAttackAction(
        {
            isActive: true, currentTurn: 'Bran', round: 1, turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Bran', hp: { current: 20, max: 20 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 50, max: 50 }, ac: 5, initiative: 12 },
            ],
        } as any,
        { attacker: 'Bran', target: 'Goblin', attackBonus: 8, damageFormula: '1d6', damageType: 'slashing', isMeleeAttack: true },
        { ...DEFAULT_CHAR, name: 'Bran', activeEffects: effects } as any,
    );

    it('un héros empoisonné sait POURQUOI son attaque part mal', () => {
        const out = frappe(etat('Poisoned'));
        expect(out.resolution?.reasons?.join(' ')).toMatch(/poison/i);
        expect(out.resolution?.attackRoll.prompt.advantage).toBe('disadvantage');
    });

    it('sans état, aucune raison parasite', () => {
        expect(frappe([]).resolution?.reasons ?? []).toEqual([]);
    });
});
