/**
 * npcTurn.test.ts — caractérisation du tour d'un PNJ joué par le moteur
 * (services/session/npcTurn.ts, sorti de GameSession le 2026-08-25, R4).
 *
 * Contexte factice, store zustand réel, dés figés (Math.random = 0,7 :
 * d20 = 15, d6 = 5, d8 = 6). Trois scénarios observés en partie réelle et
 * verrouillés ici :
 *   - gobelin : cimeterre 1d6+2, touche pour 7 ;
 *   - tarrasque : cinq attaques dans le tour (multiattaque lue dans la fiche) ;
 *   - liche : Désintégration, puis Doigt de mort, puis Rayon de givre
 *     (kit data/casterKits.ts, usages limités décomptés sur le combattant).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('../../services/media/diceTiming', () => ({ waitDice: async () => {} }));
vi.mock('../../services/media/combatSfx', () => ({
    playDamageImpact: () => {},
    playPlayerHurt: () => {},
    playWeaponSwing: () => {},
    playSpellSfx: () => {},
    playDiceRoll: () => {},
    playEndTurn: () => {},
}));

import { addEnemyToEncounter, startEncounter } from '../../engine/rulesEngine';
import { preloadCodexBestiary } from '../../engine/codexService';
import { getCreature } from '../../data/bestiary';
import { getCreatureAttacks, getMultiattackCount } from '../../engine/monsterAttacks';
import { DEFAULT_CHAR } from '../../data/character';
import { useGameStore } from '../../store/gameStore';
import { GAME_SESSION_TEXTS } from '../../components/session/texts';
import { runNPCTurn } from '../../services/session/npcTurn';
import type { SessionContext } from '../../services/session/context';
import type { CharacterSheet } from '../../types';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

beforeAll(async () => {
    await preloadCodexBestiary();
    // le bestiaire CSV se charge en tâche de fond à l'import de data/bestiary
    const t0 = Date.now();
    while (!getCreature('Lich') && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 10));
    expect(getCreature('Lich')).toBeTruthy();
});

/** Un héros solide (1 000 PV) pour que la tarrasque et la liche ne l'abattent pas en un tour. */
function hero(): CharacterSheet {
    return { ...DEFAULT_CHAR, name: 'Hero', hp: { current: 1000, max: 1000 } } as CharacterSheet;
}

type Journal = { rolls: any[]; logs: any[]; transcript: string[] };

/** Le combat : héros + un ennemi au contact, c'est le tour de l'ennemi. */
function setup(enemyName: string) {
    const character = hero();
    let state: any = startEncounter(character, EMPTY);
    const added = addEnemyToEncounter(state, { name: enemyName });
    // l'ennemi est deja AU CONTACT : un ennemi qui vient d'entrer passe son
    // premier tour a se rapprocher (bandes de distance), ce n'est pas l'objet ici
    state = {
        ...added.state,
        currentTurn: added.combatant.id,
        turnIndex: added.state.combatants.findIndex((c: any) => c.id === added.combatant.id),
        combatants: added.state.combatants.map((c: any) => c.id === added.combatant.id ? { ...c, range: 'melee' } : c),
    };
    useGameStore.setState({ character, combatState: state } as any);
    const journal: Journal = { rolls: [], logs: [], transcript: [] };
    const npc = () => useGameStore.getState().combatState.combatants.find((c: any) => c.id === added.combatant.id)!;
    const ctx = (): SessionContext => ({
        character: useGameStore.getState().character!,
        language: 'fr',
        onCharacterUpdate: () => {},
        combatState: useGameStore.getState().combatState,
        setCombatState: (u: any) => useGameStore.setState(s => ({ combatState: typeof u === 'function' ? u(s.combatState) : u })),
        setIsNPCTurn: () => {},
        dm: null,
        isConnected: false,
        pushCombatRoll: (r: any) => { journal.rolls.push(r); },
        setActivePrompt: () => {},
        setCurrentRoll: () => {},
        setTranscript: (u: any) => { const next = typeof u === 'function' ? u([]) : u; journal.transcript.push(...next.map((m: any) => m.text)); },
        syncCharacterCritical: (c: CharacterSheet) => { useGameStore.setState({ character: c } as any); },
        actionLockRef: { current: false },
        diceTrayRef: { current: null },
        setIsResolvingAction: () => {},
        setPlayerRoll: () => {},
        setReactionRequest: () => {},
        dayCount: 1,
        timeOfDay: 'day',
        tr: GAME_SESSION_TEXTS.fr,
        guardPlayerAction: () => false,
        hasPlayerMainSlice: () => true,
        hasPlayerBonusFree: () => true,
        spendPlayerMainAction: (s: any) => s,
        spendPlayerBonus: (s: any) => s,
        patchPlayerEconomy: (s: any) => s,
        rejectActionSpent: () => {},
        maybeEndCombat: () => false,
        logCombatRoll: (e: any) => { journal.logs.push(e); },
        showActionToast: () => {},
        spendResource: (c: CharacterSheet) => c,
    } as unknown as SessionContext);
    return { journal, npc, turn: () => runNPCTurn(ctx(), npc()) };
}

const heroHp = () => useGameStore.getState().character!.hp.current;

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.7); });
afterEach(() => { vi.restoreAllMocks(); });

describe('runNPCTurn — le tour d\'un PNJ joué par le moteur', () => {
    it('un ennemi qui vient d\'entrer passe son premier tour à se rapprocher, sans attaquer', async () => {
        const { journal, npc, turn } = setup('Goblin');
        useGameStore.setState(s => ({ combatState: { ...s.combatState, combatants: s.combatState.combatants.map((c: any) => c.id === npc().id ? { ...c, range: 'near' } : c) } }));
        await turn();
        expect(journal.rolls).toHaveLength(0);
        expect(journal.transcript.some(l => /se rapproche/.test(l))).toBe(true);
        expect(npc().range).toBe('melee');
        expect(heroHp()).toBe(1000);
    });

    it('gobelin : le cimeterre (1d6+2) lu dans la fiche touche pour 7', async () => {
        const goblin = getCreature('Goblin')!;
        const scimitar = getCreatureAttacks(goblin).find(a => /scimitar/i.test(a.name))!;
        expect(scimitar.damage).toBe('1d6+2');

        const { journal, turn } = setup('Goblin');
        await turn();

        const attack = journal.rolls.find(r => /Goblin : Scimitar/i.test(r.name));
        expect(attack, 'un jet d\'attaque au nom de l\'arme').toBeTruthy();
        expect(attack.isDM).toBe(true);
        const dmg = journal.rolls.find(r => /Scimitar.*dégâts/i.test(r.name));
        expect(dmg?.total).toBe(7); // d6 = 5, +2
        expect(heroHp()).toBe(993);
    });

    it('tarrasque : cinq attaques dans le tour, chacune prise dans la liste lue dans la fiche', async () => {
        const tarrasque = getCreature('Tarrasque')!;
        expect(getMultiattackCount(tarrasque)).toBe(5);
        const names = getCreatureAttacks(tarrasque).map(a => a.name);

        const { journal, turn } = setup('Tarrasque');
        await turn();

        const attacks = journal.rolls.filter(r => r.isDM && /^Tarrasque : /.test(r.name) && !/dégâts/i.test(r.name));
        expect(attacks).toHaveLength(5);
        for (const a of attacks) {
            const weapon = a.name.replace(/^Tarrasque : /, '');
            expect(names).toContain(weapon);
        }
        expect(heroHp()).toBeLessThan(1000);
    });

    it('liche : Désintégration, puis Doigt de mort, puis Rayon de givre — usages limités décomptés', async () => {
        const { journal, npc, turn } = setup('Lich');

        await turn();
        expect(journal.logs.some(l => l.type === 'save' && /vs Disintegrate/.test(l.name))).toBe(true);
        expect(journal.logs.some(l => /Disintegrate → Hero/.test(l.name) && l.total === 90)).toBe(true); // 10d6 (5×10) + 40, sauvegarde ratée
        expect(npc().spellUses).toEqual({ Disintegrate: 1 });

        await turn();
        expect(journal.logs.some(l => l.type === 'save' && /vs Finger of Death/.test(l.name))).toBe(true);
        expect(npc().spellUses).toEqual({ Disintegrate: 1, 'Finger of Death': 1 });

        await turn();
        expect(journal.rolls.some(r => /Lich : Ray of Frost/.test(r.name))).toBe(true);
        expect(npc().spellUses).toEqual({ Disintegrate: 1, 'Finger of Death': 1 }); // à volonté : pas décompté
        expect(journal.logs.filter(l => l.type === 'save')).toHaveLength(2);
    });
});
