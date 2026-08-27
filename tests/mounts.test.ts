/**
 * mounts.test.ts — le système de montures, de bout en bout.
 *
 * Écrit le 2026-08-27 après un audit qui a trouvé sept défauts que la suite
 * existante ne pouvait pas voir : elle testait chaque brique une fois, jamais
 * la SÉQUENCE (combat → synchro → combat), et jamais la mort de la monture,
 * qui vivait dans un composant React plutôt que dans le moteur.
 *
 * Chaque bloc ci-dessous a échoué AVANT son correctif.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    addEnemyToEncounter,
    applyLongRest,
    applyShortRest,
    ensureProgressionState,
    resolveAttackAction,
    resolveCombatantReference,
    resolveMountAfterCombat,
    startEncounter,
    syncCompanionsFromState,
} from '../engine/rulesEngine';
import { effectivePartySize } from '../engine/partyWeight';
import { DEFAULT_CHAR } from '../data/character';
import { MOUNT_TYPES, BEAST_COMPANIONS, getMountType } from '../data/companionOptions';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

const hero = (o: any = {}) => ensureProgressionState({ ...DEFAULT_CHAR, name: 'Test', ...o } as any);
const withMount = (mount: any, o: any = {}) => hero({ ...o, mount: { speed: 60, acquiredAt: 1, ...mount } });
const mountRow = (state: any) => state.combatants.find((c: any) => c.id === 'mount');

afterEach(() => vi.restoreAllMocks());

// ═══════════════ 1. PV DE LA MONTURE ENTRE LES COMBATS ═══════════════

describe('PV de la monture : stables d\'un combat à l\'autre', () => {
    /** Enchaîne `rounds` rencontres en resynchronisant la fiche à chaque fin. */
    const maxOverEncounters = (character: any, rounds: number) => {
        let sheet = character;
        const maxs: number[] = [];
        for (let i = 0; i < rounds; i++) {
            const state = startEncounter(sheet, EMPTY);
            maxs.push(mountRow(state).hp.max);
            sheet = syncCompanionsFromState(sheet, state.combatants);
        }
        return maxs;
    };

    it('le bonus du Cavalier ne se cumule PAS de combat en combat', () => {
        // Le bonus « Monture liée » (+niveau en PV max) est RECALCULÉ à chaque
        // rencontre. Avant, startEncounter l'ajoutait à un maximum qui le
        // contenait déjà, et la synchro réécrivait le total gonflé : 24 → 29 →
        // 34 → 39, sans plafond.
        const cav = withMount({ name: 'Tempête', kind: 'destrier' }, { class: 'Paladin', level: 5, subclass: 'Cavalier' });
        const maxs = maxOverEncounters(cav, 4);
        expect(new Set(maxs).size).toBe(1);
        expect(maxs[0]).toBe(getMountType('destrier')!.hp + 5);
    });

    it('une monture sans archétype reste elle aussi stable', () => {
        const pal = withMount({ name: 'Tempête', kind: 'destrier' }, { class: 'Paladin', level: 5 });
        expect(new Set(maxOverEncounters(pal, 3)).size).toBe(1);
    });

    it('les blessures, elles, sont bien reportées sur la fiche', () => {
        const rider = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 19, max: 19 } });
        const blessee = syncCompanionsFromState(rider, [
            { id: 'mount', name: 'Tempête', hp: { current: 5, max: 19 }, ac: 11, initiative: 8, side: 'ally' } as any,
        ]);
        expect(blessee.mount!.hp).toEqual({ current: 5, max: 19 });
    });
});

// ═══════════════ 2. LA CHARGE MONTÉE EXIGE UNE MONTURE VIVANTE ═══════════════

describe('charge montée : conditions réelles', () => {
    /** Attaque de mêlée sur un ennemi LOIN : charge (frappe) ou simple rapprochement ? */
    const chargeAtFar = (character: any) => {
        let state = startEncounter(character, EMPTY);
        state = addEnemyToEncounter(state, { name: 'Croc de Fer', hp: 60, ac: 5, range: 'far' }).state;
        const foe = state.combatants.find((c: any) => c.name === 'Croc de Fer')!;
        const r: any = resolveAttackAction(state, {
            attacker: 'player', target: foe.id, attackBonus: 100,
            damageFormula: '1d8+3', damageType: 'slashing', consumeAction: false,
        } as any, character);
        return { charge: !r.advanced && !!r.resolution, result: r };
    };

    it('en selle sur une monture vivante : la charge part', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        expect(chargeAtFar(withMount({ name: 'T', kind: 'destrier', mounted: true, hp: { current: 19, max: 19 } })).charge).toBe(true);
    });

    it('à pied : pas de charge, seulement un rapprochement', () => {
        expect(chargeAtFar(withMount({ name: 'T', kind: 'destrier', mounted: false, hp: { current: 19, max: 19 } })).charge).toBe(false);
    });

    it('monture À TERRE (0 PV) : pas de charge, même marquée « en selle »', () => {
        // Une monture à 0 PV ne rejoint PAS la rencontre — l'ancien garde ne
        // regardait que la ligne de combat, donc il ne se déclenchait jamais et
        // le héros chargeait à dos de cadavre.
        expect(chargeAtFar(withMount({ name: 'T', kind: 'destrier', mounted: true, hp: { current: 0, max: 19 } })).charge).toBe(false);
    });

    it('sans monture du tout : pas de charge', () => {
        expect(chargeAtFar(hero()).charge).toBe(false);
    });
});

// ═══════════════ 3. CAVALIER : CHARGE FERVENTE PUIS INARRÊTABLE ═══════════════

describe('Cavalier : les dés de charge suivent le niveau', () => {
    const chargeDamage = (level: number, subclass?: string, klass = 'Paladin') => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const character = withMount({ name: 'T', kind: 'destrier', mounted: true, hp: { current: 19, max: 19 } },
            { class: klass, level, subclass });
        let state = startEncounter(character, EMPTY);
        state = addEnemyToEncounter(state, { name: 'Croc de Fer', hp: 200, ac: 5, range: 'far' }).state;
        const foe = state.combatants.find((c: any) => c.name === 'Croc de Fer')!;
        const r: any = resolveAttackAction(state, {
            attacker: 'player', target: foe.id, attackBonus: 100,
            damageFormula: '1d8+3', damageType: 'slashing', consumeAction: false,
        } as any, character);
        return (r.resolution?.damageParts || []).map((p: any) => p.damageFormula);
    };

    it('niveau 3 : la Charge fervente ajoute 1d8', () => {
        expect(chargeDamage(5, 'Cavalier')).toContain('1d8');
    });

    it('niveau 15 : la Charge INARRÊTABLE monte à 2d8', () => {
        // La fiche promet +2d8 depuis toujours ; le moteur poussait 1d8 en dur,
        // sans jamais lire le niveau. Le temoin est un paladin de MEME niveau
        // sans l'archetype : au niveau 15 il ajoute deja un 1d8 radiant
        // (Chatiment divin ameliore), donc seul le 2d8 distingue le Cavalier.
        expect(chargeDamage(15, 'Cavalier')).toContain('2d8');
        expect(chargeDamage(15)).not.toContain('2d8');
    });

    it('sans l\'archétype Cavalier, la charge n\'ajoute aucun dé', () => {
        // Guerrier plutot que paladin : au niveau 15 un paladin ajoute deja un
        // de radiant (Chatiment divin ameliore), qui masquerait le resultat.
        expect(chargeDamage(15, undefined, 'Fighter').length).toBe(1);
    });
});

// ═══════════════ 4. MORT DE LA MONTURE ═══════════════

describe('mort de la monture : une seule règle, partagée', () => {
    it('une monture ordinaire tombée est RETIRÉE de la fiche', () => {
        const rider = withMount({ name: 'Bourrin', kind: 'cheval_selle', hp: { current: 0, max: 13 } });
        const out = resolveMountAfterCombat(rider);
        expect(out.character.mount).toBeUndefined();
        expect(out.fallen).toEqual({ name: 'Bourrin', celestial: false });
    });

    it('le Destrier céleste RESTE, à 0 PV, en attente du repos long', () => {
        const pal = withMount({ name: 'Lumen', kind: 'destrier_celeste', hp: { current: 0, max: 22 } },
            { class: 'Paladin', level: 5 });
        const out = resolveMountAfterCombat(pal);
        expect(out.character.mount?.name).toBe('Lumen');
        expect(out.fallen).toEqual({ name: 'Lumen', celestial: true });
    });

    it('une monture debout n\'est pas touchée', () => {
        const rider = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 4, max: 19 } });
        const out = resolveMountAfterCombat(rider);
        expect(out.character).toBe(rider);
        expect(out.fallen).toBeUndefined();
    });

    it('une monture tombée DÉSARÇONNE le héros', () => {
        // Sinon la fiche affichait « 🐎 En selle » au-dessus d'une barre 0/22,
        // bouton actif — et la charge repartait au combat suivant.
        const pal = withMount({ name: 'Lumen', kind: 'destrier_celeste', mounted: true, hp: { current: 0, max: 22 } },
            { class: 'Paladin', level: 5 });
        expect(resolveMountAfterCombat(pal).character.mount?.mounted).toBe(false);
    });
});

// ═══════════════ 5. REPOS ═══════════════

describe('repos : qui se relève, qui reste à terre', () => {
    it('le repos long remet une monture VIVANTE au maximum', () => {
        const rider = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 4, max: 19 } });
        expect(applyLongRest(rider).mount!.hp!.current).toBe(19);
    });

    it('le repos long RE-INVOQUE le Destrier céleste tombé', () => {
        const pal = withMount({ name: 'Lumen', kind: 'destrier_celeste', hp: { current: 0, max: 22 } },
            { class: 'Paladin', level: 5 });
        expect(applyLongRest(pal).mount!.hp!.current).toBe(22);
    });

    it('le repos long ne ressuscite PAS une monture ordinaire tombée', () => {
        // Elle n'est censée exister que sur une vieille sauvegarde (la règle de
        // mort la retire en fin de combat) — mais la nuit ne la relevait pas
        // moins : un cheval mort repartait à 13/13 au petit matin.
        const rider = withMount({ name: 'Bourrin', kind: 'cheval_selle', hp: { current: 0, max: 13 } });
        expect(applyLongRest(rider).mount!.hp!.current).toBe(0);
    });

    it('le repos court soigne la monture debout, pas celle à terre', () => {
        const debout = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 2, max: 19 } });
        expect(applyShortRest(debout).mount!.hp!.current).toBeGreaterThanOrEqual(9);
        const terre = withMount({ name: 'Lumen', kind: 'destrier_celeste', hp: { current: 0, max: 22 } });
        expect(applyShortRest(terre).mount!.hp!.current).toBe(0);
    });
});

// ═══════════════ 6. POIDS DANS LE BUDGET DE RENCONTRE ═══════════════

describe('budget de rencontre : la monture est un combattant, elle compte', () => {
    it('chaque monture et chaque bête du catalogue porte un FP', () => {
        for (const m of MOUNT_TYPES) expect(typeof m.cr).toBe('number');
        for (const b of BEAST_COMPANIONS) expect(typeof b.cr).toBe('number');
    });

    it('la ligne de combat de la monture expose son FP', () => {
        const rider = withMount({ name: 'Tempête', kind: 'griffon', flying: true, hp: { current: 40, max: 40 } }, { level: 5 });
        expect(mountRow(startEncounter(rider, EMPTY)).cr).toBe(getMountType('griffon')!.cr);
    });

    it('un griffon pèse dans le budget, un poney non', () => {
        const griffon = withMount({ name: 'Vent', kind: 'griffon', hp: { current: 40, max: 40 } }, { level: 5 });
        const poney = withMount({ name: 'Biscotte', kind: 'poney', hp: { current: 11, max: 11 } }, { level: 5 });
        const weight = (c: any) => {
            const allies = startEncounter(c, EMPTY).combatants.filter((x: any) => x.side === 'ally' && x.hp.current > 0);
            return effectivePartySize(c.level, allies.map((x: any) => x.cr));
        };
        expect(weight(griffon)).toBeGreaterThan(1);
        expect(weight(poney)).toBe(1);
    });

    it('le loup du Beast Master compte aussi', () => {
        const bm = hero({ class: 'Ranger', level: 2, subclass: 'Beast Master' });
        const allies = startEncounter(bm, EMPTY).combatants.filter((c: any) => c.side === 'ally' && c.hp.current > 0);
        expect(allies.find((c: any) => c.id === 'companion')?.cr).toBeGreaterThan(0);
    });
});

// ═══════════════ 7. MONTURE VOLANTE ═══════════════

describe('monture volante : un vrai avantage, pas seulement une image', () => {
    /** Un gobelin au sol frappe le héros au contact. */
    const groundStrike = (character: any, targetId: string) => {
        let state = startEncounter(character, EMPTY);
        state = addEnemyToEncounter(state, { name: 'Gobelin', hp: 20, ac: 12, range: 'melee' }).state;
        const foe = state.combatants.find((c: any) => c.name === 'Gobelin')!;
        const r: any = resolveAttackAction(state, {
            attacker: foe.id, target: targetId, attackBonus: 4,
            damageFormula: '1d6+2', damageType: 'slashing', isMeleeAttack: true, consumeAction: false,
        } as any, character);
        return r.resolution?.attackRoll?.prompt?.advantage;
    };

    it('en selle sur une monture VOLANTE, l\'assaillant au sol subit le désavantage', () => {
        const flyer = withMount({ name: 'Vent', kind: 'griffon', flying: true, mounted: true, hp: { current: 40, max: 40 } }, { level: 5 });
        expect(groundStrike(flyer, 'player')).toBe('disadvantage');
        expect(groundStrike(flyer, 'mount')).toBe('disadvantage');
    });

    it('une monture terrestre ne change rien', () => {
        const rider = withMount({ name: 'Tempête', kind: 'destrier', mounted: true, hp: { current: 19, max: 19 } }, { level: 5 });
        expect(groundStrike(rider, 'player')).not.toBe('disadvantage');
    });

    it('à pied à côté du griffon, le héros redevient atteignable', () => {
        const onFoot = withMount({ name: 'Vent', kind: 'griffon', flying: true, mounted: false, hp: { current: 40, max: 40 } }, { level: 5 });
        expect(groundStrike(onFoot, 'player')).not.toBe('disadvantage');
    });
});

// ═══════════════ 8. DÉSIGNER UN COMBATTANT PAR SON NOM ═══════════════

describe('références de combattants : le MJ n\'écrit pas toujours les accents', () => {
    const state: any = {
        isActive: true, currentTurn: 'player', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
        combatants: [
            { id: 'player', name: 'Héros', hp: { current: 10, max: 10 }, ac: 10, initiative: 9, isPlayer: true, side: 'player' },
            { id: 'mount', name: 'Tempête', hp: { current: 19, max: 19 }, ac: 11, initiative: 12, isPlayer: false, side: 'ally' },
            { id: 'e1', name: 'Épéiste squelette', hp: { current: 13, max: 13 }, ac: 13, initiative: 8, isPlayer: false, side: 'enemy' },
        ],
    };
    const resolve = (ref: string) => resolveCombatantReference(state, ref).combatant?.id;

    it('l\'identifiant et le nom exact marchent toujours', () => {
        expect(resolve('mount')).toBe('mount');
        expect(resolve('Tempête')).toBe('mount');
        expect(resolve('Épéiste squelette')).toBe('e1');
    });

    it('les accents perdus ne font plus échouer la désignation', () => {
        // Un MJ modèle écrit « Tempete » une fois sur deux : la comparaison
        // était une égalité stricte, donc l'attaque ne résolvait pas du tout.
        expect(resolve('Tempete')).toBe('mount');
        expect(resolve('TEMPETE')).toBe('mount');
        expect(resolve('Epeiste squelette')).toBe('e1');
        expect(resolve('Heros')).toBe('player');
    });

    it('un nom PARTIEL retrouve le combattant quand il est sans ambiguïté', () => {
        expect(resolve('epeiste')).toBe('e1');
        expect(resolve('squelette')).toBe('e1');
    });

    it('un nom partiel AMBIGU reste ambigu, il ne choisit pas au hasard', () => {
        const deux: any = { ...state, combatants: [
            ...state.combatants,
            { id: 'e2', name: 'Épéiste gobelin', hp: { current: 7, max: 7 }, ac: 12, initiative: 6, isPlayer: false, side: 'enemy' },
        ] };
        const r = resolveCombatantReference(deux, 'epeiste');
        expect(r.combatant).toBeUndefined();
        expect(r.ambiguous).toBe(true);
        expect(r.matches.map(m => m.id).sort()).toEqual(['e1', 'e2']);
    });

    it('un nom exact l\'emporte sur une correspondance partielle', () => {
        const piege: any = { ...state, combatants: [
            ...state.combatants,
            { id: 'e2', name: 'Épéiste', hp: { current: 7, max: 7 }, ac: 12, initiative: 6, isPlayer: false, side: 'enemy' },
        ] };
        expect(resolveCombatantReference(piege, 'Épéiste').combatant?.id).toBe('e2');
        expect(resolveCombatantReference(piege, 'epeiste').combatant?.id).toBe('e2');
    });

    it('un nom inconnu ne renvoie rien', () => {
        expect(resolve('Balthazar')).toBeUndefined();
    });
});

describe('références : la correspondance partielle ne mord pas à faux', () => {
    it('« Rat » ne se reconnaît pas dans « the pirate captain »', () => {
        // Une simple sous-chaîne aurait trouvé « rat » dans « pi-rat-e ».
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
            combatants: [
                { id: 'player', name: 'Héros', hp: { current: 10, max: 10 }, ac: 10, initiative: 9, isPlayer: true, side: 'player' },
                { id: 'r1', name: 'Rat', hp: { current: 4, max: 4 }, ac: 10, initiative: 7, isPlayer: false, side: 'enemy' },
            ],
        };
        expect(resolveCombatantReference(state, 'the pirate captain').combatant).toBeUndefined();
        expect(resolveCombatantReference(state, 'le rat').combatant?.id).toBe('r1');
    });
});

// ═══════════════ 9. CONTRE-AUDIT DES CORRECTIFS ═══════════════

describe('contre-audit : ce que la première passe avait laissé passer', () => {
    it('un ennemi qui VOLE atteint une monture volante sans pénalité', () => {
        // `speed` est un nombre ; le vol n'est lisible que dans `speedStr`. La
        // première version testait le nombre : aucun volant n'était exempté.
        const flyer = withMount({ name: 'Vent', kind: 'griffon', flying: true, mounted: true, hp: { current: 40, max: 40 } }, { level: 5 });
        let state = startEncounter(flyer, EMPTY);
        state = addEnemyToEncounter(state, { name: 'Harpy', hp: 38, ac: 11, range: 'melee' }).state;
        const harpy = state.combatants.find((c: any) => c.name === 'Harpy')!;
        const r: any = resolveAttackAction(state, {
            attacker: harpy.id, target: 'player', attackBonus: 3,
            damageFormula: '1d4+1', damageType: 'bludgeoning', isMeleeAttack: true, consumeAction: false,
        } as any, flyer);
        expect(r.resolution?.attackRoll?.prompt?.advantage).not.toBe('disadvantage');
    });

    it('une sauvegarde au max déjà GONFLÉ est ramenée au catalogue', () => {
        // Sauvegarde écrite avant le correctif : destrier à 39 au lieu de 19.
        const cav = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 39, max: 39 } },
            { class: 'Paladin', level: 5, subclass: 'Cavalier' });
        const state = startEncounter(cav, EMPTY);
        const synced = syncCompanionsFromState(cav, state.combatants);
        expect(synced.mount!.hp!.max).toBe(getMountType('destrier')!.hp);
        expect(synced.mount!.hp!.current).toBeLessThanOrEqual(synced.mount!.hp!.max);
    });

    it('« the goblin archer » désigne Goblin archer, pas Goblin', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
            combatants: [
                { id: 'player', name: 'Héros', hp: { current: 10, max: 10 }, ac: 10, initiative: 9, isPlayer: true, side: 'player' },
                { id: 'g1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 12, initiative: 6, isPlayer: false, side: 'enemy' },
                { id: 'g2', name: 'Goblin archer', hp: { current: 7, max: 7 }, ac: 12, initiative: 6, isPlayer: false, side: 'enemy' },
            ],
        };
        expect(resolveCombatantReference(state, 'the goblin archer').combatant?.id).toBe('g2');
        expect(resolveCombatantReference(state, 'goblin').combatant?.id).toBe('g1');
    });
});

// ═══════════════ 10. RELECTURE DU CONTRE-AUDIT ═══════════════
import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { useGameStore } from '../store/gameStore';
import { effectiveMountMaxHP } from '../engine/rulesEngine';

const toolRefs = (): ToolRefs => ({
    depsRef: { current: {
        diceTrayRef: { current: null },
        grantXP: vi.fn(),
        syncCharacterUpdate: vi.fn((c: any) => useGameStore.setState({ character: c })),
        syncCharacterCritical: vi.fn(), syncJournalUpdate: vi.fn(), syncJournalImmediate: vi.fn(async () => true),
    } },
    lastImageStartedAtRef: { current: 0 }, imageInFlightRef: { current: false },
    lastScenePromptRef: { current: { key: '', at: 0 } }, pendingImageRef: { current: null }, imageTimerRef: { current: null },
});
const seatHero = (mount: any) => useGameStore.setState({
    character: { ...DEFAULT_CHAR, name: 'Hero', level: 5, mount: { speed: 60, acquiredAt: 1, ...mount } },
    combatState: { isActive: false, combatants: [], currentTurn: '' },
} as any);

describe('set_mount : deux montures du même type sont deux montures', () => {
    it('un AUTRE destrier sans replace est refusé, pas absorbé en silence', async () => {
        seatHero({ name: 'Tempête', kind: 'destrier', hp: { current: 19, max: 19 } });
        const r: any = await runTool(toolRefs(), { name: 'set_mount', args: { name: 'Fumée', kind: 'destrier' } });
        expect(r.success).toBe(false);
        expect(useGameStore.getState().character!.mount!.name).toBe('Tempête');
    });

    it('avec replace:true, un destrier remplace bien un destrier', async () => {
        seatHero({ name: 'Tempête', kind: 'destrier', hp: { current: 19, max: 19 } });
        const r: any = await runTool(toolRefs(), { name: 'set_mount', args: { name: 'Fumée', kind: 'destrier', replace: true } });
        expect(r.success).toBe(true);
        expect(useGameStore.getState().character!.mount!.name).toBe('Fumée');
    });

    it('le MÊME nom est un rappel : on remonte en selle sans rien perdre', async () => {
        seatHero({ name: 'Tempête', kind: 'destrier', mounted: false, hp: { current: 7, max: 19 } });
        const r: any = await runTool(toolRefs(), { name: 'set_mount', args: { name: 'tempete', kind: 'destrier' } });
        expect(r.success).toBe(true);
        const m = useGameStore.getState().character!.mount!;
        expect(m.name).toBe('Tempête');
        expect(m.hp).toEqual({ current: 7, max: 19 });
        expect(m.mounted).toBe(true);
    });

    it('sans nom du tout, le type sert de repli (rappel du destrier céleste)', async () => {
        seatHero({ name: 'Lumen', kind: 'destrier_celeste', mounted: false, hp: { current: 22, max: 22 } });
        const r: any = await runTool(toolRefs(), { name: 'set_mount', args: { kind: 'destrier_celeste' } });
        expect(r.success).toBe(true);
        expect(useGameStore.getState().character!.mount!.name).toBe('Lumen');
    });
});

describe('PV de la monture : un choix explicite du MJ survit à la synchro', () => {
    it('un hp custom posé par set_mount est marqué et conservé', async () => {
        seatHero(undefined);
        useGameStore.setState({ character: { ...useGameStore.getState().character, mount: undefined } } as any);
        await runTool(toolRefs(), { name: 'set_mount', args: { name: 'Colosse', kind: 'destrier', hp: 45 } });
        const sheet: any = useGameStore.getState().character;
        expect(sheet.mount.customHp).toBe(true);
        const state = startEncounter(sheet, EMPTY);
        expect(syncCompanionsFromState(sheet, state.combatants).mount!.hp!.max).toBe(45);
    });

    it('une sauvegarde gonflée SANS marque revient au catalogue', () => {
        const old = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 39, max: 39 } }, { class: 'Paladin', level: 5, subclass: 'Cavalier' });
        const state = startEncounter(old, EMPTY);
        expect(syncCompanionsFromState(old, state.combatants).mount!.hp!.max).toBe(getMountType('destrier')!.hp);
    });
});

describe('le Cavalier lit UN seul maximum', () => {
    it('effectiveMountMaxHP inclut le bonus de Monture liée', () => {
        const cav = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 19, max: 19 } }, { class: 'Paladin', level: 5, subclass: 'Cavalier' });
        expect(effectiveMountMaxHP(cav)).toBe(24);
        expect(mountRow(startEncounter(cav, EMPTY)).hp.max).toBe(effectiveMountMaxHP(cav));
        const pal = withMount({ name: 'Tempête', kind: 'destrier', hp: { current: 19, max: 19 } }, { class: 'Paladin', level: 5 });
        expect(effectiveMountMaxHP(pal)).toBe(19);
    });
});

describe('références : l\'élision française', () => {
    it('« l\'ombre » désigne Ombre', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
            combatants: [
                { id: 'player', name: 'Héros', hp: { current: 10, max: 10 }, ac: 10, initiative: 9, isPlayer: true, side: 'player' },
                { id: 'o1', name: 'Ombre', hp: { current: 16, max: 16 }, ac: 12, initiative: 6, isPlayer: false, side: 'enemy' },
            ],
        };
        expect(resolveCombatantReference(state, "l'ombre").combatant?.id).toBe('o1');
        expect(resolveCombatantReference(state, 'l’Ombre').combatant?.id).toBe('o1');
    });
});
