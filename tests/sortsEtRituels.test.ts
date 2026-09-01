/**
 * sortsEtRituels.test.ts — le lot « sorts » du 2026-09-01, verrouillé.
 *
 *   T5   le MJ ne peut plus dicter le DD du joueur (paramètres retirés)
 *   T11  touche automatique sans cible résolue : refus AVANT toute dépense
 *   T12  concentration GÉNÉRALE : marqueur pour les 36 sorts du codex
 *   T18  la concentration du joueur tombe → ses conditions tombent des lignes
 *   K7   Chevalier occulte / Escroc arcanique : emplacements de tiers-lanceur
 *   RIT  Incantation rituelle — capacité de classe (barde, clerc, druide, mage)
 *   PRÊ  overhaul de la liste du prêtre (37 sorts, alias FR, mécaniques)
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('../services/media/diceTiming', async (importOriginal) => {
    const actual: any = await importOriginal();
    return { ...actual, waitDice: async () => {} };
});
vi.mock('../services/media/combatSfx', async (importOriginal) => {
    const mod: any = await importOriginal();
    return Object.fromEntries(Object.keys(mod).map(k => [k, typeof mod[k] === 'function' ? () => {} : mod[k]]));
});

import { runTool, type ToolRefs } from '../services/dm/tools/context';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_CHAR } from '../data/character';
import { preloadCodexBestiary, maxSpellLevelForClass, spellsForClass, lookupSpell } from '../engine/codexService';
import { getCreature } from '../data/bestiary';
import {
    startEncounter, addEnemyToEncounter, castSpell, canCastAsRitual,
    applyConditionToEncounter, tagPlayerConcentrationCondition, releasePlayerConcentrationConditions,
    resolveRollPrompt, resolvePendingSpellRoll,
} from '../engine/rulesEngine';
import { ensureProgressionState } from '../engine/character/progression';
import { GAME_TOOL_DECLARATIONS } from '../services/dm/live/toolDeclarations';
import { SRD51_SPELLS } from '../data/srd51';
import type { CharacterSheet } from '../types';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

const refs = (): ToolRefs => ({
    depsRef: { current: {
        diceTrayRef: { current: null },
        grantXP: vi.fn(),
        syncCharacterUpdate: (c: any) => useGameStore.setState({ character: c } as any),
        syncCharacterCritical: (c: any) => useGameStore.setState({ character: c } as any),
        syncJournalUpdate: vi.fn(), syncJournalImmediate: vi.fn(async () => true),
    } },
    lastImageStartedAtRef: { current: 0 },
    imageInFlightRef: { current: false },
    lastScenePromptRef: { current: { key: '', at: 0 } },
    pendingImageRef: { current: null },
    imageTimerRef: { current: null },
} as any);

const S = () => useGameStore.getState();

/** Clerc niveau 3, SAG 16 → DD 8 + 2 + 3 = 13. */
const clerc = (extra: Partial<CharacterSheet> = {}) => ({
    ...DEFAULT_CHAR, name: 'Bran', class: 'Cleric', level: 3,
    stats: { ...DEFAULT_CHAR.stats, WIS: 16 },
    spellcastingAbility: 'WIS', cantrips: [], preparedSpells: [],
    knownSpells: ['Cure Wounds', 'Hold Person', 'Detect Magic', 'Protection from Energy', 'Bless', 'Prayer of Healing'],
    spellSlots: { 1: { current: 2, max: 2 }, 2: { current: 2, max: 2 }, 3: { current: 2, max: 2 } },
    activeEffects: [],
    ...extra,
}) as any;

function combatAvec(character: CharacterSheet, enemyName: string) {
    let state: any = startEncounter(character, EMPTY);
    const added = addEnemyToEncounter(state, { name: enemyName, partyLevel: character.level });
    state = {
        ...added.state,
        currentTurn: 'player',
        turnIndex: added.state.combatants.findIndex((c: any) => c.isPlayer),
        actionEconomy: { player: { attacksMax: 1, attacksUsed: 0, bonusMax: 1, bonusUsed: 0 } },
        combatants: added.state.combatants.map((c: any) => c.id === added.combatant.id ? { ...c, range: 'melee' } : c),
    };
    return { state, enemyId: added.combatant.id };
}

beforeAll(async () => {
    await preloadCodexBestiary();
    const t0 = Date.now();
    while (!getCreature('Lich') && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 10));
});
beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.setState({ activePrompt: null, combatRolls: [], transcript: [] } as any);
});
afterEach(() => { vi.restoreAllMocks(); });

// ═══════════ T5 ═══════════
describe('T5 — le MJ ne dicte plus le DD du joueur', () => {
    it('cast_spell ne déclare plus spellSaveDC / spellAttackBonus / casterAbilityMod', () => {
        const decl: any = GAME_TOOL_DECLARATIONS.find(t => t.name === 'cast_spell')!;
        const params = Object.keys(decl.parameters.properties);
        for (const interdit of ['spellSaveDC', 'spellAttackBonus', 'casterAbilityMod']) {
            expect(params, interdit).not.toContain(interdit);
        }
        expect(params).toContain('ritual');
    });

    it('spellSaveDC: 30 envoyé quand même → le moteur juge à SON DD (13), pas à 30', async () => {
        const hero = clerc();
        let state: any = startEncounter(hero, EMPTY);
        for (const n of ['Goblin', 'Goblin']) state = addEnemyToEncounter(state, { name: n, partyLevel: 3 }).state;
        useGameStore.setState({ character: hero, combatState: { ...state, currentTurn: 'player', actionEconomy: { player: { attacksMax: 1, attacksUsed: 0, bonusMax: 1, bonusUsed: 0 } } } } as any);

        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Hold Person', target: 'all_enemies', spellSaveDC: 30 } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        expect(r.areaResults?.length).toBe(2);
        const formules = S().combatRolls.map((x: any) => String(x.formula));
        expect(formules.some(f => /DC 13\b/.test(f)), formules.join(' | ')).toBe(true);
        expect(formules.some(f => /DC 30\b/.test(f))).toBe(false);
    });
});

// ═══════════ T11 ═══════════
describe('T11 — touche automatique sans cible : rien n’est dépensé', () => {
    const mage = () => ({
        ...DEFAULT_CHAR, name: 'Bran', class: 'Mage', level: 3,
        stats: { ...DEFAULT_CHAR.stats, INT: 16 }, spellcastingAbility: 'INT',
        cantrips: [], preparedSpells: [], knownSpells: ['Magic Missile'],
        spellSlots: { 1: { current: 2, max: 2 } }, activeEffects: [],
    }) as any;

    it('cible fantôme → refus instructif, emplacement ET action intacts', async () => {
        const { state } = combatAvec(mage(), 'Goblin');
        useGameStore.setState({ character: mage(), combatState: state } as any);
        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Magic Missile', target: 'Fantôme du Lustre' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/not a combatant/);
        expect(r.error).toMatch(/Nothing was spent/);
        expect(S().character!.spellSlots!['1'].current, 'emplacement rendu').toBe(2);
        expect((S().combatState.actionEconomy as any)?.player?.attacksUsed ?? 0, 'action rendue').toBe(0);
    });

    it('cible réelle → le sort part, l’emplacement est dépensé, le gobelin encaisse', async () => {
        const { state, enemyId } = combatAvec(mage(), 'Goblin');
        useGameStore.setState({ character: mage(), combatState: state } as any);
        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Magic Missile', target: 'Goblin' } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        expect(S().character!.spellSlots!['1'].current).toBe(1);
        const goblin: any = S().combatState.combatants.find((c: any) => c.id === enemyId);
        expect(goblin.hp.current).toBeLessThan(goblin.hp.max);
    });
});

// ═══════════ RIT ═══════════
describe('Incantation rituelle — capacité de classe', () => {
    it('canCastAsRitual : clerc + Détection de la magie oui ; ensorceleur non ; tour de magie non', () => {
        const detect = lookupSpell('Detect Magic');
        expect(canCastAsRitual({ class: 'Cleric' }, detect).ok).toBe(true);
        expect(canCastAsRitual({ class: 'Mage' }, detect).ok).toBe(true);
        const refusSorcier = canCastAsRitual({ class: 'Sorcerer' }, detect);
        expect(refusSorcier.ok).toBe(false);
        expect(refusSorcier.reason).toMatch(/Ritual Casting/);
        expect(canCastAsRitual({ class: 'Cleric' }, lookupSpell('Sacred Flame')).ok).toBe(false);
    });

    it('hors combat : Détection de la magie en rituel ne dépense AUCUN emplacement', async () => {
        useGameStore.setState({ character: clerc(), combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Detect Magic', ritual: true } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        expect(r.ritual).toBe(true);
        expect(r.note).toMatch(/NO spell slot/);
        expect(S().character!.spellSlots!['1'].current, 'aucun emplacement dépensé').toBe(2);
    });

    it('le même sort lancé NORMALEMENT dépense son emplacement', async () => {
        useGameStore.setState({ character: clerc(), combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Detect Magic' } });
        expect(r.success).toBe(true);
        expect(S().character!.spellSlots!['1'].current).toBe(1);
    });

    it('en combat, la voie rituelle est refusée ; un non-ritualiste aussi', async () => {
        const { state } = combatAvec(clerc(), 'Goblin');
        useGameStore.setState({ character: clerc(), combatState: state } as any);
        const enCombat: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Detect Magic', ritual: true } });
        expect(enCombat.success).toBe(false);
        expect(enCombat.error).toMatch(/in combat/);

        useGameStore.setState({ character: { ...clerc(), class: 'Sorcerer' }, combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const sorcier: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Detect Magic', ritual: true } });
        expect(sorcier.success).toBe(false);
        expect(sorcier.error).toMatch(/Ritual Casting/);
    });

    it('les quatre classes portent le trait dans les DEUX tables (pas de doublon K2 au level-up)', async () => {
        const { CLASS_DATA } = await import('../data/classes');
        const { CLASS_FEATURES } = await import('../data/classFeatures');
        for (const cls of ['Bard', 'Cleric', 'Druid', 'Mage']) {
            expect((CLASS_DATA as any)[cls].features.some((f: any) => f.name === 'Ritual Casting'), `classes.ts ${cls}`).toBe(true);
            expect(((CLASS_FEATURES as any)[cls].features[1] || []).some((f: any) => f.name === 'Ritual Casting'), `classFeatures.ts ${cls}`).toBe(true);
        }
    });
});

// ═══════════ K7 ═══════════
describe('K7 — Chevalier occulte / Escroc arcanique : de vrais tiers-lanceurs', () => {
    const ek = (level: number) => ({ ...DEFAULT_CHAR, class: 'Fighter', subclass: 'Eldritch Knight', level, spellSlots: undefined, hitDice: undefined, resources: undefined }) as any;

    it('emplacements SRD aux paliers 3 / 7 / 13 / 19, rien avant le 3', () => {
        expect(ensureProgressionState(ek(2)).spellSlots).toBeFalsy();
        expect(ensureProgressionState(ek(3)).spellSlots).toEqual({ 1: { current: 2, max: 2 } });
        expect(ensureProgressionState(ek(7)).spellSlots).toEqual({ 1: { current: 4, max: 4 }, 2: { current: 2, max: 2 } });
        expect(ensureProgressionState(ek(13)).spellSlots).toEqual({ 1: { current: 4, max: 4 }, 2: { current: 3, max: 3 }, 3: { current: 2, max: 2 } });
        expect(ensureProgressionState(ek(19)).spellSlots).toEqual({ 1: { current: 4, max: 4 }, 2: { current: 3, max: 3 }, 3: { current: 3, max: 3 }, 4: { current: 1, max: 1 } });
    });

    it('le sélecteur de sorts s’ouvre sur la liste du MAGICIEN, au bon plafond', () => {
        expect(maxSpellLevelForClass('Fighter', 2, 'Eldritch Knight')).toBe(0);
        expect(maxSpellLevelForClass('Fighter', 3, 'Eldritch Knight')).toBe(1);
        expect(maxSpellLevelForClass('Fighter', 7, 'Eldritch Knight')).toBe(2);
        expect(maxSpellLevelForClass('Rogue', 13, 'Arcane Trickster')).toBe(3);
        expect(maxSpellLevelForClass('Fighter', 20, 'Eldritch Knight')).toBe(4);
        expect(maxSpellLevelForClass('Fighter', 20), 'un guerrier SANS archétype reste non-lanceur').toBe(0);

        const liste = spellsForClass('Fighter', 1, 'Eldritch Knight').map(s => s.name);
        expect(liste).toContain('Magic Missile');
        expect(spellsForClass('Fighter', 1)).toHaveLength(0);
    });

    it('bout en bout : un Chevalier occulte niveau 3 LANCE un sort de niveau 1', () => {
        const char = ensureProgressionState({ ...ek(3), stats: { ...DEFAULT_CHAR.stats, INT: 16 }, spellcastingAbility: undefined, cantrips: [], preparedSpells: [], knownSpells: ['Magic Missile'], activeEffects: [] });
        const r: any = castSpell(char, { spellName: 'Magic Missile', target: 'Goblin' });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        expect(r.consumedSlot).toBe(1);
    });
});

// ═══════════ T12 ═══════════
describe('T12 — la concentration existe pour TOUS les sorts du codex', () => {
    it('un sort de concentration sans effet modélisé pose un MARQUEUR sur la fiche', () => {
        const r: any = castSpell(clerc(), { spellName: 'Protection from Energy', target: 'self' });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        const marqueur = (r.character.activeEffects || []).find((e: any) => e.name === 'Protection from Energy');
        expect(marqueur, 'le marqueur doit exister').toBeTruthy();
        expect(marqueur.concentration).toBe(true);
        expect(marqueur.roundsRemaining, '« Up to 1 hour » : pas de compteur de rounds').toBeUndefined();
    });

    it('« Up to 10 minutes » (Gardiens spirituels) → 100 rounds ; un 2e sort de concentration REMPLACE le 1er', () => {
        const base = clerc({ knownSpells: ['Spirit Guardians', 'Bless'] });
        const premier: any = castSpell(base, { spellName: 'Spirit Guardians', target: 'self' });
        expect(premier.success, JSON.stringify(premier.error)).toBe(true);
        const marqueur = (premier.character.activeEffects || []).find((e: any) => e.name === 'Spirit Guardians');
        expect(marqueur?.roundsRemaining).toBe(100);

        const second: any = castSpell(premier.character, { spellName: 'Bless', target: 'self' });
        expect(second.success).toBe(true);
        expect(second.concentrationReplaced).toContain('Spirit Guardians');
        const noms = (second.character.activeEffects || []).map((e: any) => e.name);
        expect(noms).toContain('Bless');
        expect(noms, 'un seul sort de concentration à la fois').not.toContain('Spirit Guardians');
    });
});

// ═══════════ T18 ═══════════
describe('T18 — la concentration du joueur tombe : ses conditions tombent des lignes', () => {
    it('étiquetage + libération : seule la condition liée au sort part, celle du MJ reste', () => {
        const hero = clerc();
        let state: any = startEncounter(hero, EMPTY);
        const added = addEnemyToEncounter(state, { name: 'Goblin', partyLevel: 3 });
        state = added.state;
        const gid = added.combatant.id;

        const paralysie = applyConditionToEncounter(state, gid, 'paralyzed');
        state = tagPlayerConcentrationCondition(paralysie.state, gid, paralysie.effect?.id, 'Hold Person');
        const poison = applyConditionToEncounter(state, gid, 'poisoned');
        state = poison.state;

        const out = releasePlayerConcentrationConditions(state, ['Hold Person']);
        const goblin: any = out.state.combatants.find((c: any) => c.id === gid);
        const noms = (goblin.activeEffects || []).map((e: any) => e.name);
        expect(noms).not.toContain('Paralyzed');
        expect(noms, 'la condition posée par le MJ ne bouge pas').toContain('Poisoned');
        expect(out.released.map(r => r.effectName)).toEqual(['Paralyzed']);
    });

    it('bout en bout par l’outil : le lanceur tombe à 0 PV → l’ennemi n’est plus paralysé', async () => {
        const hero = clerc({ hp: { current: 8, max: 30 } });
        let state: any = startEncounter(hero, EMPTY);
        const added = addEnemyToEncounter(state, { name: 'Goblin', partyLevel: 3 });
        const gid = added.combatant.id;
        const paralysie = applyConditionToEncounter(added.state, gid, 'paralyzed');
        state = tagPlayerConcentrationCondition(paralysie.state, gid, paralysie.effect?.id, 'Hold Person');
        // Le clerc concentre : le marqueur du sort vit sur SA fiche.
        const marque = {
            id: 'conc-1', name: 'Hold Person', source: 'spell', duration: 'concentration',
            concentration: true, roundsRemaining: 10, modifiers: [],
        };
        useGameStore.setState({
            character: { ...hero, activeEffects: [marque] },
            combatState: { ...state, currentTurn: gid },
        } as any);

        const r: any = await runTool(refs(), { name: 'apply_damage', args: { target: 'player', amount: 8 } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        expect(S().character!.hp.current).toBe(0);
        expect((S().character!.activeEffects || []).some(e => e.concentration), 'concentration rompue à 0 PV').toBe(false);
        const goblin: any = S().combatState.combatants.find((c: any) => c.id === gid);
        expect((goblin.activeEffects || []).map((e: any) => e.name), 'la paralysie tombe avec la concentration').not.toContain('Paralyzed');
    });
});

// ═══════════ PRÊTRE ═══════════
describe('Overhaul de la liste du prêtre', () => {
    const cleric = SRD51_SPELLS.filter(s => s.classes.includes('Cleric'));

    it('la liste dépasse 70 sorts et le niveau 4 n’est plus un désert', () => {
        expect(cleric.length).toBeGreaterThanOrEqual(70);
        expect(cleric.filter(s => s.level === 4).length).toBeGreaterThanOrEqual(6);
        expect(cleric.filter(s => s.level === 6).length).toBeGreaterThanOrEqual(7);
        expect(cleric.filter(s => s.level === 7).length).toBeGreaterThanOrEqual(5);
    });

    it('aucun id dupliqué dans tout le codex de sorts', () => {
        const ids = SRD51_SPELLS.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('les alias français résolvent (le MJ parle français)', () => {
        for (const [fr, id] of [
            ['Sanctuaire', 'sanctuary'], ['Prière de guérison', 'prayer_of_healing'],
            ['Protection contre la mort', 'death_ward'], ['Gardien de la foi', 'guardian_of_faith'],
            ['Liberté de mouvement', 'freedom_of_movement'], ['Barrière de lames', 'blade_barrier'],
            ['Résurrection', 'resurrection'], ['Communion', 'commune'],
        ] as const) {
            expect(lookupSpell(fr)?.id, fr).toBe(id);
        }
    });

    it('les mécaniques chiffrées sont posées : Prière de guérison soigne, Barrière de lames sauvegarde', () => {
        const barrier = lookupSpell('Blade Barrier')!;
        expect(barrier.save).toEqual({ ability: 'DEX', effectOnSuccess: 'half' });
        expect(barrier.damage?.dice).toBe('6d10');

        const r: any = castSpell(clerc({ level: 5, spellSlots: { 2: { current: 2, max: 2 } } }), { spellName: 'Prayer of Healing', target: 'self' });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        expect(r.healing).toBeGreaterThan(0);
        expect(r.consumedSlot).toBe(2);
    });

    it('les rituels du prêtre sont marqués : Augure, Communion, Divination, Interdiction', () => {
        for (const nom of ['Augury', 'Commune', 'Divination', 'Forbiddance', 'Purify Food and Drink', 'Water Walk']) {
            expect(lookupSpell(nom)?.ritual, nom).toBe(true);
        }
    });
});

// ═══════════ Contagion — la condition d'un sort d'ATTAQUE mord sur un coup au but ═══════════
//
// Trouvé par l'audit du lot : `conditionFails = !isAttack && …` rendait la
// condition d'un sort d'attaque INATTEIGNABLE, et la branche ATTACK de
// castSpell ne transmettait même pas `conditionOnFailure`. Contagion touchait
// sans jamais empoisonner — donnée morte. Deux causes, deux correctifs, et le
// garde-fou d'effet de bord : Contagion est le SEUL sort attaque+condition du
// codex, les dix autres sorts d'attaque ne doivent rien poser.
describe('Contagion — condition sur coup au but', () => {
    const clerc9 = () => ({
        ...DEFAULT_CHAR, name: 'Bran', class: 'Cleric', level: 9,
        stats: { ...DEFAULT_CHAR.stats, WIS: 16 }, spellcastingAbility: 'WIS',
        cantrips: ['Sacred Flame'], preparedSpells: [], knownSpells: ['Contagion'],
        spellSlots: { 5: { current: 1, max: 1 } }, activeEffects: [],
    }) as any;

    const frappe = (d20: number, caster: any, spell: string) => {
        vi.restoreAllMocks();
        vi.spyOn(Math, 'random').mockReturnValue(d20);
        let st: any = startEncounter(caster, EMPTY);
        const a = addEnemyToEncounter(st, { name: 'Bandit', partyLevel: 9 });
        st = a.state;
        const r: any = castSpell(caster, { spellName: spell, target: 'Bandit', targetId: a.combatant.id });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        const res: any = resolvePendingSpellRoll(st, resolveRollPrompt(r.prompt));
        const cible: any = res.state?.combatants.find((c: any) => c.id === a.combatant.id);
        return { res, etats: (cible?.activeEffects || []).map((e: any) => e.name) };
    };

    it('le SEUL sort attaque+condition du codex reste Contagion (garde-fou du correctif)', () => {
        const both = SRD51_SPELLS.filter(s => s.attack && s.condition).map(s => s.id);
        expect(both).toEqual(['contagion']);
    });

    it('un coup au but empoisonne ; un raté ne pose rien', () => {
        const touche = frappe(0.95, clerc9(), 'Contagion');
        expect(touche.res.conditionApplied).toBe('Poisoned');
        expect(touche.etats).toContain('Poisoned');

        const rate = frappe(0.02, clerc9(), 'Contagion');
        expect(rate.res.conditionApplied ?? null).toBeNull();
        expect(rate.etats).toEqual([]);
    });

    it('effet de bord : un autre sort d’attaque qui touche ne pose AUCUNE condition', () => {
        const mage = { ...clerc9(), class: 'Mage', spellcastingAbility: 'INT', cantrips: ['Fire Bolt'], knownSpells: [] };
        const touche = frappe(0.95, mage, 'Fire Bolt');
        expect(touche.res.conditionApplied ?? null).toBeNull();
        expect(touche.etats).toEqual([]);
        expect(touche.res.damage).toBeGreaterThan(0);
    });
});
