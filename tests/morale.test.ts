/**
 * morale.test.ts — Moral, fuite et reddition (audit 2026-08-25).
 *
 * Avant : un ennemi qui ratait son test de moral passait à 0 PV avec un effet
 * « Fled » que personne ne lisait — indiscernable d'un cadavre pour le moteur,
 * le tracker, l'XP, la chronique ET le MJ (qui narrait une mort).
 *
 * Après : il SORT du roster, PV intacts, consigné dans `departed`. Ces tests
 * verrouillent le contrat moteur ; ils échouaient tous avant le correctif.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
    addAllyToEncounter,
    addEnemyToEncounter,
    concentrationBreakOnDeparture,
    encounterOutcome,
    findDeparted,
    resolveMoraleCheck,
    startEncounter,
    victoryXP,
    withdrawCombatant,
} from '../services/rulesEngine';
import { preloadCodexBestiary } from '../services/codexService';
import { describeDeparted, describeFightEnd, formatCombatChronicleLine } from '../store/gameStore';
import { buildDisplayNames, combatantMapKey } from '../components/CombatTracker';
import { DEFAULT_CHAR } from '../data/character';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

beforeAll(async () => { await preloadCodexBestiary(); });
afterEach(() => vi.restoreAllMocks());

/** Roster déterministe : joueur (init 20) puis ennemis (init 15, 10, 5…).
 *  Construit SANS mock de Math.random — l'id des ennemis en dépend. */
function fight(enemies: Array<string | { name: string; hp?: number }>) {
    let state: any = startEncounter(DEFAULT_CHAR, EMPTY);
    const ids: string[] = [];
    enemies.forEach((e, i) => {
        const args = typeof e === 'string' ? { name: e } : e;
        const r = addEnemyToEncounter(state, args);
        state = r.state;
        ids.push(r.combatant.id);
        state = { ...state, combatants: state.combatants.map((c: any) => c.id === r.combatant.id ? { ...c, initiative: 15 - 5 * i } : c) };
    });
    state = { ...state, combatants: state.combatants.map((c: any) => c.isPlayer ? { ...c, initiative: 20 } : c) };
    state.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
    state = { ...state, currentTurn: 'player', turnIndex: 0, round: 1 };
    return { state, ids };
}
const wound = (state: any, id: string, current: number) => ({
    ...state,
    combatants: state.combatants.map((c: any) => c.id === id ? { ...c, hp: { ...c.hp, current } } : c),
});
const ids = (state: any) => state.combatants.map((c: any) => c.id);

// ═══════════════════════ withdrawCombatant ═══════════════════════
describe('withdrawCombatant — sortie du roster, PV intacts', () => {
    it('retire l\'ennemi du roster et le consigne dans departed avec ses PV et la raison', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        const wounded = wound(state, gob, 3);
        const r = withdrawCombatant(wounded, gob, 'fled');
        expect(r.found).toBe(true);
        expect(ids(r.state)).not.toContain(gob);
        expect(r.state.departed).toHaveLength(1);
        expect(r.state.departed![0]).toMatchObject({ id: gob, name: 'Goblin', side: 'enemy', reason: 'fled', round: 1 });
        expect(r.state.departed![0].hp.current).toBe(3); // vivant, pas à 0
    });

    it('introuvable → found:false et état inchangé', () => {
        const { state } = fight(['Goblin']);
        const r = withdrawCombatant(state, 'Dragon', 'fled');
        expect(r.found).toBe(false);
        expect(r.state).toBe(state);
    });

    it('refuse le joueur et les alliés', () => {
        const { state } = fight(['Goblin']);
        const withAlly = addAllyToEncounter(state, { name: 'Town Guard', hp: 18, ac: 14 });
        expect(withdrawCombatant(withAlly.state, 'player', 'fled').found).toBe(false);
        expect(withdrawCombatant(withAlly.state, withAlly.combatant.id, 'surrendered').found).toBe(false);
        expect(ids(withAlly.state)).toContain(withAlly.combatant.id);
    });

    it('est idempotent : un ennemi déjà parti ne change plus l\'état', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        const once = withdrawCombatant(state, gob, 'surrendered');
        const twice = withdrawCombatant(once.state, gob, 'surrendered');
        expect(twice.alreadyDeparted).toBe(true);
        expect(twice.state).toBe(once.state);
        expect(twice.state.departed).toHaveLength(1);
    });

    it('avance le tour AVANT de retirer l\'acteur courant — sans sauter personne ni changer de round', () => {
        const { state, ids: [a, b] } = fight(['Goblin', 'Wolf']);
        const onA = { ...state, currentTurn: a };
        const r = withdrawCombatant(onA, a, 'fled');
        expect(r.state.currentTurn).toBe(b);   // le suivant, pas le joueur
        expect(r.state.round).toBe(1);
    });

    it('boucle en tête d\'ordre et incrémente le round si le fuyard était le dernier', () => {
        const { state, ids: [a, b] } = fight(['Goblin', 'Wolf']);
        const onB = { ...state, currentTurn: b };
        const r = withdrawCombatant(onB, b, 'fled');
        expect(r.state.currentTurn).toBe('player');
        expect(r.state.round).toBe(2);
        expect(ids(r.state)).toContain(a);
    });

    it('ne touche pas au tour quand le fuyard n\'est pas l\'acteur courant', () => {
        const { state, ids: [a] } = fight(['Goblin', 'Wolf']);
        const r = withdrawCombatant(state, a, 'fled');
        expect(r.state.currentTurn).toBe('player');
        expect(r.state.round).toBe(1);
    });

    it('consigne le nom AFFICHÉ (« Goblin B ») pour que la chronique et le pied du tracker parlent comme le transcript', () => {
        const { state, ids: [, b] } = fight(['Goblin', 'Goblin']);
        const r = withdrawCombatant(state, b, 'fled');
        expect(r.state.departed![0].displayName).toBe('Goblin B');
    });

    it('un lanceur en concentration qui part libère son sort (fiche de rupture pour releaseNpcConcentrationEffect)', () => {
        const { state, ids: [mage] } = fight([{ name: 'Mage sombre', hp: 20 }]);
        const concentrating = {
            ...state,
            combatants: state.combatants.map((c: any) => c.id === mage ? { ...c, concentratingOn: { effectName: 'Hold Person', targetId: 'player' } } : c),
        };
        const r = withdrawCombatant(concentrating, mage, 'fled');
        expect(concentrationBreakOnDeparture(r.combatant!)).toMatchObject({ casterName: 'Mage sombre', effectName: 'Hold Person', targetId: 'player', downed: false });
        expect(concentrationBreakOnDeparture(state.combatants[0])).toBeUndefined();
    });

    it('purge enemyIntents et actionEconomy du fuyard', () => {
        const { state, ids: [a] } = fight(['Goblin']);
        const seeded = { ...state, enemyIntents: { [a]: 'player' }, actionEconomy: { ...state.actionEconomy, [a]: { actionUsed: true } } };
        const r = withdrawCombatant(seeded, a, 'fled');
        expect(r.state.enemyIntents?.[a]).toBeUndefined();
        expect(r.state.actionEconomy?.[a]).toBeUndefined();
        expect(r.state.actionEconomy?.['player']).toBeDefined();
    });
});

// ═══════════════════════ resolveMoraleCheck ═══════════════════════
describe('resolveMoraleCheck — fuite ≠ mort', () => {
    it('échec (d20=1) : le gobelin quitte le roster VIVANT et le combat est gagné s\'il était seul', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        const wounded = wound(state, gob, 2); // 2/7 < 40 %
        vi.spyOn(Math, 'random').mockReturnValue(0); // d20 = 1 → 1 - 1 (SAG 8) = 0 < 11
        const r = resolveMoraleCheck(wounded, gob);
        expect(r.rolled).toBe(true);
        expect(r.fled).toBe(true);
        expect(ids(r.state)).not.toContain(gob);
        expect(r.state.departed?.[0]).toMatchObject({ id: gob, reason: 'fled' });
        expect(r.state.departed?.[0].hp.current).toBe(2);
        expect(r.state.combatants.some((c: any) => c.hp.current <= 0 && !c.isPlayer)).toBe(false); // aucun « cadavre »
        expect(encounterOutcome(r.state)).toBe('victory');
    });

    it('échec avec un autre ennemi debout : le combat continue', () => {
        const { state, ids: [gob] } = fight(['Goblin', 'Wolf']);
        const wounded = wound(state, gob, 2);
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const r = resolveMoraleCheck(wounded, gob);
        expect(r.fled).toBe(true);
        expect(encounterOutcome(r.state)).toBe('ongoing');
    });

    it('réussite (d20=20) : il reste, marqué moraleChecked, et ne rejoue plus', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        const wounded = wound(state, gob, 2);
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        const r = resolveMoraleCheck(wounded, gob);
        expect(r.rolled).toBe(true);
        expect(r.fled).toBe(false);
        expect(ids(r.state)).toContain(gob);
        expect(r.state.combatants.find((c: any) => c.id === gob)?.moraleChecked).toBe(true);
        expect(resolveMoraleCheck(r.state, gob).rolled).toBe(false);
    });

    it('au-dessus de 40 % des PV : pas de test', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        expect(resolveMoraleCheck(wound(state, gob, 4), gob).rolled).toBe(false); // 4/7 = 57 %
    });

    it('fuite pendant son propre tour : le tour passe au suivant, pas de round sauté', () => {
        const { state, ids: [gob, wolf] } = fight(['Goblin', 'Wolf']);
        const wounded = { ...wound(state, gob, 2), currentTurn: gob };
        vi.spyOn(Math, 'random').mockReturnValue(0);
        const r = resolveMoraleCheck(wounded, gob);
        expect(r.fled).toBe(true);
        expect(r.state.currentTurn).toBe(wolf);
        expect(r.state.round).toBe(1);
    });

    it('morts-vivants / constructs / vases détectés par TYPE de bestiaire — pas seulement par nom', () => {
        // « Shadow » (undead) et « Goule » (FR → ghoul) ne matchent PAS l'ancienne
        // regex de nom : ils pouvaient fuir. Le type du bestiaire les protège.
        for (const name of ['Shadow', 'Goule', 'Ghoul', 'Mummy', 'Ochre Jelly', 'Animated Armor']) {
            const { state, ids: [id] } = fight([name]);
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const r = resolveMoraleCheck(wound(state, id, 1), id);
            expect(r.rolled, name).toBe(false);
            expect(ids(r.state), name).toContain(id);
            vi.restoreAllMocks();
        }
    });

    it('nom homebrew hors bestiaire : la regex de nom reste le filet (« Automate de garde »)', () => {
        const { state, ids: [id] } = fight([{ name: 'Automate de garde', hp: 20 }]);
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(resolveMoraleCheck(wound(state, id, 2), id).rolled).toBe(false);
    });
});

// ═══════════════════════ encounterOutcome ═══════════════════════
describe('encounterOutcome — un roster sans ennemi mais avec des fuyards est une victoire', () => {
    it('joueur seul + departed ennemi → victory', () => {
        const state: any = { ...startEncounter(DEFAULT_CHAR, EMPTY), departed: [{ id: 'x', name: 'Goblin', side: 'enemy', reason: 'fled', hp: { current: 2, max: 7 }, round: 1 }] };
        expect(encounterOutcome(state)).toBe('victory');
    });
    it('joueur seul + departed vide ou absent → ongoing, sans lever', () => {
        const base = startEncounter(DEFAULT_CHAR, EMPTY);
        expect(encounterOutcome({ ...base, departed: [] })).toBe('ongoing');
        expect(encounterOutcome({ ...base, departed: undefined })).toBe('ongoing');
    });
});

// ═══════════════════════ persistance de departed ═══════════════════════
describe('departed survit aux reconstructions du roster', () => {
    const departed = [{ id: 'x', name: 'Goblin', side: 'enemy' as const, reason: 'fled' as const, hp: { current: 2, max: 7 }, round: 1 }];

    it('startEncounter sur un combat ACTIF (renfort via add_enemy_init) le conserve', () => {
        const active: any = { ...fight(['Wolf']).state, departed };
        expect(startEncounter(DEFAULT_CHAR, active).departed).toEqual(departed);
    });
    it('addEnemyToEncounter / addAllyToEncounter le conservent', () => {
        const active: any = { ...fight(['Wolf']).state, departed };
        expect(addEnemyToEncounter(active, { name: 'Goblin' }).state.departed).toEqual(departed);
        expect(addAllyToEncounter(active, { name: 'Guard' }).state.departed).toEqual(departed);
    });
    it('un combat FRAIS repart avec departed vide', () => {
        const stale: any = { ...EMPTY, departed };
        expect(startEncounter(DEFAULT_CHAR, stale).departed).toEqual([]);
    });
});

// ═══════════════════════ XP et chronique ═══════════════════════
describe('victoryXP — XP complète pour les fuyards et les redditions', () => {
    it('somme roster vaincu + departed, sans compter deux fois un revenant', () => {
        const { state, ids: [a, b] } = fight(['Goblin', 'Goblin']);
        // a est tombé (0 PV, reste au roster) ; b a fui (sorti du roster, dans departed).
        const roster = state.combatants
            .filter((c: any) => c.id !== b)
            .map((c: any) => c.id === a ? { ...c, hp: { ...c.hp, current: 0 } } : c);
        const gone = [{ id: b, name: 'Goblin', side: 'enemy' as const, reason: 'fled' as const, hp: { current: 2, max: 7 }, round: 1 }];
        expect(victoryXP(roster, gone)).toBe(100); // 50 + 50
        expect(victoryXP(roster, gone.map(d => ({ ...d, returned: true })))).toBe(50);
        expect(victoryXP(roster, [])).toBe(50);
    });
    it('respecte xpValue explicite du MJ sur un fuyard', () => {
        const gone = [{ id: 'z', name: 'Chef mystérieux', side: 'enemy' as const, reason: 'surrendered' as const, hp: { current: 5, max: 30 }, xpValue: 700, round: 2 }];
        expect(victoryXP([], gone)).toBe(700);
    });
});

describe('findDeparted', () => {
    it('retrouve un parti par id ou par nom (insensible à la casse)', () => {
        const { state, ids: [gob] } = fight(['Goblin']);
        const r = withdrawCombatant(state, gob, 'fled');
        expect(findDeparted(r.state, gob)?.reason).toBe('fled');
        expect(findDeparted(r.state, 'goblin')?.id).toBe(gob);
        expect(findDeparted(r.state, 'Wolf')).toBeUndefined();
    });
});

describe('buildDisplayNames — les lettres des partis restent réservées', () => {
    it('« Goblin C » ne devient pas « Goblin B » quand B a fui', () => {
        const rows: any[] = [
            { id: 'a', name: 'Goblin', initiative: 15, hp: { current: 7, max: 7 }, ac: 15 },
            { id: 'c', name: 'Goblin', initiative: 5, hp: { current: 7, max: 7 }, ac: 15 },
        ];
        const names = buildDisplayNames(rows, [{ name: 'Goblin', displayName: 'Goblin B', side: 'enemy', reason: 'fled' } as any]);
        expect(names.get(combatantMapKey(rows[0], 0))).toBe('Goblin A');
        expect(names.get(combatantMapKey(rows[1], 1))).toBe('Goblin C');
    });
    it('un survivant seul garde sa lettre si un homonyme est parti', () => {
        const rows: any[] = [{ id: 'a', name: 'Goblin', initiative: 15, hp: { current: 7, max: 7 }, ac: 15 }];
        const names = buildDisplayNames(rows, [{ name: 'Goblin', displayName: 'Goblin B', side: 'enemy', reason: 'fled' } as any]);
        expect(names.get(combatantMapKey(rows[0], 0))).toBe('Goblin A');
    });
});

describe('chronique de campagne — les fuyards sont nommés, pas comptés parmi les morts', () => {
    it('describeFightEnd distingue tombés / en fuite (VIVANTS) / reddition', () => {
        const rows: any[] = [
            { id: 'p', name: 'Hero', isPlayer: true, side: 'player', hp: { current: 10, max: 20 } },
            { id: 'a', name: 'Goblin A', side: 'enemy', hp: { current: 0, max: 7 } },
        ];
        const gone: any[] = [
            { id: 'b', name: 'Goblin B', side: 'enemy', reason: 'fled', hp: { current: 2, max: 7 }, round: 1 },
            { id: 'c', name: 'Bandit', side: 'enemy', reason: 'surrendered', hp: { current: 4, max: 11 }, round: 2 },
        ];
        const line = describeFightEnd(rows, gone);
        expect(line).toContain('Defeated: Goblin');
        expect(line).toMatch(/Fled \(ALIVE\): Goblin/);
        expect(line).toMatch(/Surrendered \(ALIVE\): Bandit/);
        expect(describeFightEnd(rows, [])).not.toContain('ALIVE');
    });

    it('describeDeparted regroupe par raison', () => {
        expect(describeDeparted([
            { name: 'Goblin A', reason: 'fled', side: 'enemy' },
            { name: 'Goblin B', reason: 'fled', side: 'enemy' },
            { name: 'Bandit', reason: 'surrendered', side: 'enemy' },
        ] as any)).toBe('fled: 2x Goblin; surrendered: Bandit');
        expect(describeDeparted([])).toBe('');
    });
    it('formatCombatChronicleLine place le segment departed AVANT les attaques custom (troncature 220)', () => {
        const line = formatCombatChronicleLine({
            heroName: 'Salim', hpCurrent: 20, hpMax: 30, hpStart: 30, foes: 'Wolf',
            xp: 100, custom: ['Coup tournoyant'], outcome: 'victory', departed: 'fled: Goblin',
        });
        expect(line).toContain('fled: Goblin');
        expect(line.indexOf('fled: Goblin')).toBeLessThan(line.indexOf('custom moves'));
        expect(line.indexOf('+100 XP')).toBeLessThan(line.indexOf('fled: Goblin'));
    });
});
