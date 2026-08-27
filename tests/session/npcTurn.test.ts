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

        // UPDATE 2026-08-27 : la liche tient aussi Fireball (zone, ≥ 2 cibles —
        // pas ici) et Blight (×3), qui passe AVANT le rayon à volonté.
        await turn();
        expect(journal.logs.some(l => l.type === 'save' && /vs Blight/.test(l.name))).toBe(true);
        expect(npc().spellUses).toEqual({ Disintegrate: 1, 'Finger of Death': 1, Blight: 1 });

        await turn(); // Blight ×2 (le kit en porte deux)
        await turn();
        expect(journal.rolls.some(r => /Lich : Ray of Frost/.test(r.name))).toBe(true);
        expect(npc().spellUses).toEqual({ Disintegrate: 1, 'Finger of Death': 1, Blight: 2 }); // à volonté : pas décompté
        expect(journal.logs.filter(l => l.type === 'save')).toHaveLength(4);
    });
});

const heroHasEffect = (re: RegExp) => (useGameStore.getState().character!.activeEffects || []).some((e: any) => re.test(e.name));

describe('les capacités SRD (data/monsterData2) jouées par le moteur', () => {
    it('dragon rouge adulte : présence terrifiante puis souffle (18d6 feu, DEX 21), recharge sur 5-6, puis morsure et griffes', async () => {
        const { journal, npc, turn } = setup('Adult Red Dragon');

        await turn(); // tour 1 : présence (WIS 19 : 14 → raté → effrayé) puis souffle chargé
        expect(journal.logs.some(l => l.type === 'save' && /Frightful Presence/.test(l.name))).toBe(true);
        expect(heroHasEffect(/frightened|effray/i)).toBe(true);
        expect(journal.logs.some(l => l.type === 'save' && /vs Fire Breath/.test(l.name))).toBe(true);
        expect(journal.logs.some(l => /Fire Breath → Hero/.test(l.name) && l.total === 90)).toBe(true); // 18 × 5, sauvegarde ratée
        expect(heroHp()).toBe(910);
        expect(npc().abilityUses).toMatchObject({ 'Frightful Presence': 1, 'Fire Breath': 1 });
        expect(journal.rolls.filter(r => /Adult Red Dragon : (Bite|Claw)/.test(r.name))).toHaveLength(0); // le souffle remplace les attaques

        await turn(); // tour 2 : recharge 1d6 = 5 ≥ 5 → le souffle repart
        expect(journal.logs.filter(l => /Fire Breath → Hero/.test(l.name))).toHaveLength(2);
        expect(heroHp()).toBe(820);

        vi.spyOn(Math, 'random').mockReturnValue(0.1); // d6 = 1 : pas de recharge
        await turn(); // tour 3 : la présence ne se rejoue pas, le dragon mord et griffe (multiattaque SRD : 1 + 2)
        expect(journal.logs.filter(l => /Frightful Presence/.test(l.name))).toHaveLength(1);
        expect(journal.logs.filter(l => /Fire Breath → Hero/.test(l.name))).toHaveLength(2);
        const melee = journal.rolls.filter(r => r.isDM && /^Adult Red Dragon : (Bite|Claw)$/.test(r.name));
        expect(melee).toHaveLength(3);
        expect(melee.filter(r => /Claw/.test(r.name))).toHaveLength(2);
        expect(heroHp()).toBeLessThan(820);
    });

    it('tarrasque : la queue qui touche renverse le héros (STR 20 raté → à terre)', async () => {
        const { journal, turn } = setup('Tarrasque');
        await turn();
        expect(journal.rolls.some(r => /Tarrasque : Tail/.test(r.name))).toBe(true);
        expect(journal.logs.some(l => l.type === 'save' && /vs Tail/.test(l.name))).toBe(true);
        expect(heroHasEffect(/prone|terre/i)).toBe(true);
    });
});

describe('les soins des lanceurs (kind heal)', () => {
    /** Prêtre + un ogre allié blessé sous la moitié : c'est le tour du prêtre. */
    function setupPriestWithWoundedAlly(ogreHp: number) {
        const character = hero();
        let state: any = startEncounter(character, EMPTY);
        // Les ids d'ennemi sont `enemy-<Date.now()>-<Math.random()>` : avec le
        // dé figé du test et deux ajouts dans la même milliseconde, ils
        // entrent en collision. On renomme les deux rangs explicitement.
        const priest = addEnemyToEncounter(state, { name: 'Priest' });
        const ogre = addEnemyToEncounter(priest.state, { name: 'Ogre' });
        const combatants = ogre.state.combatants.map((c: any) =>
            c.name === 'Priest' ? { ...c, id: 'priest-row', range: 'melee' }
            : c.name === 'Ogre' ? { ...c, id: 'ogre-row', range: 'melee', hp: { ...c.hp, current: ogreHp } }
            : c);
        state = { ...ogre.state, combatants, currentTurn: 'priest-row', turnIndex: combatants.findIndex((c: any) => c.id === 'priest-row') };
        const ids = { priest: 'priest-row', ogre: 'ogre-row' };
        useGameStore.setState({ character, combatState: state } as any);
        const journal: Journal = { rolls: [], logs: [], transcript: [] };
        const row = (id: string) => useGameStore.getState().combatState.combatants.find((c: any) => c.id === id)!;
        const ctx = (): SessionContext => ({
            character: useGameStore.getState().character!, language: 'fr', onCharacterUpdate: () => {},
            combatState: useGameStore.getState().combatState,
            setCombatState: (u: any) => useGameStore.setState(s => ({ combatState: typeof u === 'function' ? u(s.combatState) : u })),
            setIsNPCTurn: () => {}, dm: null, isConnected: false,
            pushCombatRoll: (r: any) => { journal.rolls.push(r); }, setActivePrompt: () => {}, setCurrentRoll: () => {},
            setTranscript: (u: any) => { const next = typeof u === 'function' ? u([]) : u; journal.transcript.push(...next.map((m: any) => m.text)); },
            syncCharacterCritical: (c: CharacterSheet) => { useGameStore.setState({ character: c } as any); },
            actionLockRef: { current: false }, diceTrayRef: { current: null }, setIsResolvingAction: () => {}, setPlayerRoll: () => {},
            setReactionRequest: () => {}, dayCount: 1, timeOfDay: 'day', tr: GAME_SESSION_TEXTS.fr,
            guardPlayerAction: () => false, hasPlayerMainSlice: () => true, hasPlayerBonusFree: () => true,
            spendPlayerMainAction: (s: any) => s, spendPlayerBonus: (s: any) => s, patchPlayerEconomy: (s: any) => s,
            rejectActionSpent: () => {}, maybeEndCombat: () => false, logCombatRoll: (e: any) => { journal.logs.push(e); },
            showActionToast: () => {}, spendResource: (c: CharacterSheet) => c,
        } as unknown as SessionContext);
        return { journal, priest: () => row(ids.priest), ogre: () => row(ids.ogre), turn: () => runNPCTurn(ctx(), row(ids.priest)) };
    }

    it('un allié sous la moitié : le prêtre le SOIGNE au lieu d\'attaquer, et l\'usage est décompté', async () => {
        const { journal, priest, ogre, turn } = setupPriestWithWoundedAlly(10);
        const before = ogre().hp.current;
        await turn();
        expect(ogre().hp.current).toBeGreaterThan(before);
        expect(ogre().hp.current).toBeLessThanOrEqual(ogre().hp.max);
        expect(priest().spellUses?.['Cure Wounds']).toBe(1);
        expect(journal.logs.some(l => /Cure Wounds/.test(l.name) && l.type === 'heal')).toBe(true);
        // le héros n'a rien pris : le tour est allé au soin
        expect(heroHp()).toBe(1000);
    });

    it('personne de blessé : le prêtre attaque normalement (le soin ne remplace pas le combat)', async () => {
        const { journal, ogre, turn } = setupPriestWithWoundedAlly(59);
        await turn();
        expect(ogre().hp.current).toBe(59);
        expect(journal.logs.some(l => l.type === 'heal')).toBe(false);
        expect(journal.logs.some(l => /Spirit Guardians|Guiding Bolt|Sacred Flame/.test(l.name)) || journal.rolls.some(r => /Priest/.test(r.name))).toBe(true);
    });
});

describe('les kits par monstre jouent vraiment (data/casterKits)', () => {
    it("méphite de magma : son souffle SRD, son Métal brûlant, puis les griffes — il n'a pas de sort à volonté", async () => {
        const { journal, turn } = setup('Magma Mephit');
        await turn();  // souffle de feu (action SRD structurée, recharge 6)
        expect(journal.logs.some(l => l.type === 'save' && /vs Fire Breath/.test(l.name))).toBe(true);
        await turn();  // souffle non rechargé -> son unique sort
        expect(journal.logs.some(l => l.type === 'save' && /vs Heat Metal/.test(l.name))).toBe(true);
        await turn();  // sort épuisé -> il griffe, il ne lance pas dans le vide
        expect(journal.rolls.some(r => /Claws/.test(r.name))).toBe(true);
    });

    it("la guenaude verte n'a AUCUN kit : sa mêlée vaut cinq fois sa Moquerie, elle frappe", async () => {
        const { journal, turn } = setup('Green Hag');
        await turn();
        expect(journal.logs.some(l => l.type === 'save')).toBe(false);
        expect(journal.rolls.length).toBeGreaterThan(0);
    });
});
