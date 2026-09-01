/**
 * contreAudit.test.ts — les correctifs du contre-audit du 2026-09-01, verrouillés.
 *
 * L'audit avait 71 constats ; la contre-vérification adverse en a validé 56,
 * nuancé 15, et trouvé 6 de plus. Ce fichier ne couvre que ce qui a été
 * CORRIGÉ le jour même — chaque bloc porte l'identifiant du rapport :
 *
 *   M1  transcript par défaut partagé par référence entre deux parties
 *   T1  soin vocal sur soi effacé au coup ennemi suivant
 *   C5  sorts d'attaque des lanceurs ennemis jugés en mêlée
 *   T7  build_encounter(startNow) doublait le roster
 *   C1  Rage implacable rejouable (réconciliation de fin de tour)
 *   C7  Châtiment divin non consommé à la voix
 *   C8  nom accentué → ennemi homebrew
 *   T13 remove_condition hors combat retirait l'état du HÉROS
 *   T3  formule de dés illisible → 0 silencieux avec success:true
 *   T6  add_effect PNJ : bonus non borné, stat libre
 *   N5  multi-cibles : tout refusé, succès rapporté
 *   K1  style « Duel » actif pour les classes non martiales
 *   K5  Rage +2 à tout niveau
 *   N1  Chevalier occulte / Escroc arcanique en CHA au lieu d'INT
 *
 * (M4 est verrouillé dans canonFacts.test.ts ; M3 et M15 sont des constantes.)
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
import { preloadCodexBestiary } from '../engine/codexService';
import { getCreature } from '../data/bestiary';
import { addEnemyToEncounter, startEncounter, resolveCombatantReference, resolveAttackAction, enemyXPValue, withdrawCombatant, victoryXP } from '../engine/rulesEngine';
import { rageEffect, CLASS_CASTER_ABILITY } from '../engine/combat/rolls';
import { castSpell } from '../engine/rulesEngine';
import { buildCampaignDirectorContext } from '../services/dm/campaignDirector';
import { LiveDungeonMaster } from '../services/dm/live/core';
import { activeFightingStyle, getPlayerDamageBonus, getBaseACFromArmor } from '../engine/character';
import { isDiceFormula } from '../engine/utils';
import { normalizeCombatantStat } from '../services/dm/tools/combat/status';
import { normalizeEffectStat } from '../engine/combat/effects';
import { getEffectiveAC } from '../types';
import { runNPCTurn } from '../services/session/npcTurn';
import { GAME_SESSION_TEXTS } from '../components/session/texts';
import type { SessionContext } from '../services/session/context';
import type { CharacterSheet } from '../types';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

/** Les deux portes d'écriture de la fiche ÉCRIVENT dans le store : un mock
 *  muet cachait précisément les effets que ces tests doivent voir. */
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
const ligneJoueur = () => S().combatState.combatants.find((c: any) => c.isPlayer)! as any;
const poisoned = (id = 'poison-1') => ({ id, name: 'Poisoned', source: 'condition', duration: 'rounds', roundsRemaining: 3, modifiers: [] });

/** Un combat réel (startEncounter + addEnemyToEncounter), l'ennemi à la bande voulue. */
function combatAvec(character: CharacterSheet, enemyName: string, band: 'melee' | 'near' | 'far' = 'melee') {
    let state: any = startEncounter(character, EMPTY);
    const added = addEnemyToEncounter(state, { name: enemyName, partyLevel: character.level });
    state = {
        ...added.state,
        combatants: added.state.combatants.map((c: any) => c.id === added.combatant.id ? { ...c, range: band } : c),
    };
    return { state, enemyId: added.combatant.id };
}

/** Tour du joueur : économie pleine, c'est à lui de jouer. */
function tourDuJoueur(state: any) {
    return {
        ...state,
        currentTurn: 'player',
        turnIndex: state.combatants.findIndex((c: any) => c.isPlayer),
        actionEconomy: { ...(state.actionEconomy || {}), player: { attacksMax: 2, attacksUsed: 0, bonusMax: 1, bonusUsed: 0 } },
    };
}

/** Le contexte de session minimal de runNPCTurn (copié de tests/session/npcTurn.test.ts). */
function sessionCtx(journal: { rolls: any[]; transcript: string[] }): SessionContext {
    return {
        character: S().character!,
        language: 'fr',
        onCharacterUpdate: () => {},
        combatState: S().combatState,
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
        logCombatRoll: () => {},
        showActionToast: () => {},
        spendResource: (c: CharacterSheet) => c,
    } as unknown as SessionContext;
}

beforeAll(async () => {
    await preloadCodexBestiary();
    const t0 = Date.now();
    while (!getCreature('Lich') && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 10));
    expect(getCreature('Lich')).toBeTruthy();
});

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.7); }); // d20 = 15, d6 = 5, d8 = 6
afterEach(() => { vi.restoreAllMocks(); });

// ═══════════ M1 ═══════════
describe('M1 — une nouvelle partie ne démarre plus avec l’historique de la précédente', () => {
    it('resetSessionState rend des tableaux NEUFS : ce que la session Live pousse dans l’un ne réapparaît pas', () => {
        S().resetSessionState();
        const transcript1: any[] = S().transcript;
        const journal1 = S().journal;
        // Ce que faisait LiveDungeonMaster.recordHistory sur la référence reçue.
        transcript1.push({ speaker: 'dm', text: 'Le prologue de la PARTIE 1.' });

        S().resetSessionState();
        expect(S().transcript).toHaveLength(0);
        expect(S().transcript).not.toBe(transcript1);
        expect(S().journal).not.toBe(journal1);
        expect(S().journal.quests).not.toBe(journal1.quests);
    });
});

// ═══════════ T1 ═══════════
describe('T1 — un soin vocal sur soi atteint AUSSI la ligne de combat', () => {
    it('Cure Wounds sur soi en combat : la ligne du joueur suit la fiche (avant : fiche 14, ligne 5, puis 0 au coup suivant)', async () => {
        const clerc = {
            ...DEFAULT_CHAR, name: 'Bran', class: 'Cleric', level: 3, hp: { current: 5, max: 30 },
            spellcastingAbility: 'WIS', cantrips: [], knownSpells: ['Cure Wounds'], preparedSpells: ['Cure Wounds'],
            spellSlots: { 1: { current: 2, max: 2 } }, activeEffects: [],
        } as any;
        const { state } = combatAvec(clerc, 'Goblin');
        useGameStore.setState({ character: clerc, transcript: [], combatState: tourDuJoueur(state) } as any);
        expect(ligneJoueur().hp.current).toBe(5);

        const r: any = await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Cure Wounds', target: 'self' } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        const fiche = S().character!.hp.current;
        // Dés figés : le soin est déterministe, on l'assert exactement.
        expect(fiche).toBe(5 + (r.healing as number));
        expect(fiche).toBeGreaterThan(5);
        expect(ligneJoueur().hp.current, 'la ligne de combat doit suivre la fiche').toBe(fiche);
    });

    it('un soin qui DÉBORDE le maximum ne fait pas diverger la ligne de la fiche', async () => {
        const clerc = {
            ...DEFAULT_CHAR, name: 'Bran', class: 'Cleric', level: 3, hp: { current: 29, max: 30 },
            spellcastingAbility: 'WIS', cantrips: [], knownSpells: ['Cure Wounds'], preparedSpells: ['Cure Wounds'],
            spellSlots: { 1: { current: 2, max: 2 } }, activeEffects: [],
        } as any;
        const { state } = combatAvec(clerc, 'Goblin');
        useGameStore.setState({ character: clerc, transcript: [], combatState: tourDuJoueur(state) } as any);

        await runTool(refs(), { name: 'cast_spell', args: { spellName: 'Cure Wounds', target: 'self' } });
        expect(S().character!.hp.current).toBe(30);
        expect(ligneJoueur().hp.current).toBe(30);
    });
});

// ═══════════ C5 ═══════════
describe('C5 — un lanceur ennemi à distance LANCE son sort d’attaque au lieu d’avancer', () => {
    /** Le tour du lanceur, et ce que le journal en retient. */
    const joueLeTour = async (enemyId: string) => {
        useGameStore.setState(s => ({
            combatState: {
                ...s.combatState,
                currentTurn: enemyId,
                turnIndex: s.combatState.combatants.findIndex((c: any) => c.id === enemyId),
            },
        } as any));
        const journal = { rolls: [] as any[], transcript: [] as string[] };
        await runNPCTurn(sessionCtx(journal), S().combatState.combatants.find((c: any) => c.id === enemyId)! as any);
        return journal;
    };

    it('le Prêtre à la bande « near » jette une ATTAQUE de Guiding Bolt, et ne se rapproche pas', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Hero', hp: { current: 1000, max: 1000 } } as CharacterSheet;
        const { state, enemyId } = combatAvec(hero, 'Priest', 'near');
        useGameStore.setState({ character: hero, combatState: state } as any);

        const journal = await joueLeTour(enemyId);

        expect(journal.transcript.some(l => /se rapproche/.test(l))).toBe(false);
        // Le JET d'attaque précis, pas seulement « une ligne qui mentionne le
        // sort » : la ligne de dégâts porte aussi ce nom.
        const jet = journal.rolls.find(r => /Guiding Bolt/i.test(String(r.name)) && /vs\b|CA|AC/i.test(String(r.formula || '')));
        expect(jet, `jets: ${JSON.stringify(journal.rolls)}`).toBeTruthy();
        expect(S().combatState.combatants.find((c: any) => c.id === enemyId)!.range).toBe('near');
    });

    it('🔴 par le VRAI chemin : add_enemy_init(« Prêtre ») lance aussi — le kit se lit sur la fiche', async () => {
        // Ce cas est celui que la relecture indépendante a exigé : le test
        // ci-dessus fabriquait son prêtre en anglais et court-circuitait
        // add_enemy_init, donc il masquait `getCasterKit('Prêtre') === null`.
        const hero = { ...DEFAULT_CHAR, name: 'Hero', hp: { current: 1000, max: 1000 } } as any;
        useGameStore.setState({ character: hero, transcript: [], combatState: startEncounter(hero, EMPTY) } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Prêtre', range: 'near', force: true } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        const pretre: any = S().combatState.combatants.find((c: any) => !c.isPlayer);
        expect(pretre.name).toBe('Prêtre');

        const journal = await joueLeTour(pretre.id);

        expect(journal.transcript.some(l => /se rapproche/.test(l)), 'le prêtre a avancé au lieu de lancer').toBe(false);
        expect(journal.rolls.some(r => /Guiding Bolt/i.test(String(r.name))), `jets: ${JSON.stringify(journal.rolls)}`).toBe(true);
    });
});

// ═══════════ C5 · les régressions que le marquage « à distance » a failli créer ═══════════
describe('C5 (garde-fous) — « à distance » n’est pas « attaque d’arme »', () => {
    const moine = () => ({ ...DEFAULT_CHAR, name: 'Moine', class: 'Monk', level: 5, hp: { current: 60, max: 60 }, activeEffects: [] }) as any;
    const frappe = (extra: any) => {
        const m = moine();
        let st: any = startEncounter(m, EMPTY);
        const a = addEnemyToEncounter(st, { name: 'Priest' });
        st = { ...a.state, combatants: a.state.combatants.map((c: any) => c.id === a.combatant.id ? { ...c, range: 'melee' } : c) };
        return resolveAttackAction(st, {
            attacker: a.combatant.id, target: 'player', attackName: 'Guiding Bolt',
            attackBonus: 7, damageFormula: '4d6', damageType: 'radiant', consumeAction: false, ...extra,
        } as any, m) as any;
    };

    it('un RAYON de sort n’est pas déviable — Déviation de projectiles vise les armes (SRD)', () => {
        // Régression introduite par le correctif C5 lui-même : marquer le sort
        // « à distance » suffisait à déclencher la réaction du moine, qui était
        // en plus consommée. Trouvée par la relecture indépendante.
        const r = frappe({ isMeleeAttack: false, isWeaponAttack: false });
        expect(r.resolution.reaction ?? null).toBeNull();
        expect(r.resolution.damage).toBe(20);
    });

    it('…mais une FLÈCHE l’est toujours : le garde-fou n’a rien cassé', () => {
        const r = frappe({ isMeleeAttack: false });
        expect(r.resolution.reaction).toBe('deflect_missiles');
        expect(r.resolution.damage).toBeLessThan(20);
    });
});

describe('C8 (cohérence) — le budget d’entrée et la récompense de sortie parlent de la même créature', () => {
    it('un « Prêtre » vaut son XP de fiche à la victoire, pas une estimation par PV', () => {
        const fiche = getCreature('Priest')!;
        expect(enemyXPValue({ name: 'Prêtre', sheetName: 'Priest', hp: { max: fiche.hp.base } } as any)).toBe(fiche.xp);
        // Sans la fiche portée : l'estimation par PV, qui divergeait du budget.
        expect(enemyXPValue({ name: 'Prêtre', hp: { max: fiche.hp.base } } as any)).not.toBe(fiche.xp);
    });

    it('un « Prêtre » qui FUIT emporte sa fiche : la victoire le paie à son vrai prix', () => {
        // Trouvé en relisant : withdrawCombatant recopiait id/nom/PV/xpValue
        // vers `departed`, mais pas sheetName — le fuyard revalait une
        // estimation par PV.
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 5 } as any;
        let st: any = startEncounter(hero, EMPTY);
        const added = addEnemyToEncounter(st, { name: 'Prêtre', statsFrom: 'Priest', partyLevel: 5 });
        st = added.state;
        expect(added.combatant.sheetName).toBe('Priest');
        const out = withdrawCombatant(st, added.combatant.id, 'fled');
        const fuyard = out.state.departed?.find((d: any) => d.id === added.combatant.id)!;
        expect(fuyard.sheetName).toBe('Priest');
        expect(victoryXP(out.state.combatants, out.state.departed)).toBe(getCreature('Priest')!.xp);
    });
});

// ═══════════ T7 ═══════════
describe('T7 — build_encounter(startNow) refuse quand un combat est déjà ouvert', () => {
    it('le roster ne double plus ; le plan est renvoyé pour add_enemy_init', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 3 } as any;
        const { state } = combatAvec(hero, 'Goblin');
        useGameStore.setState({ character: hero, transcript: [], combatState: state } as any);
        const avant = S().combatState.combatants.map((c: any) => c.name);

        const r: any = await runTool(refs(), { name: 'build_encounter', args: { startNow: true, difficulty: 'medium', partyLevel: 3 } });
        expect(r.encounter?.monsters?.length ?? 0, 'précondition : le plan doit proposer des monstres').toBeGreaterThan(0);
        expect(r.success).toBe(false);
        expect(r.alreadyRunning).toBe(true);
        expect(r.error).toMatch(/add_enemy_init/);
        expect(S().combatState.combatants.map((c: any) => c.name)).toEqual(avant);
    });
});

// ═══════════ C1 ═══════════
describe('C1 — la Rage implacable ne se rejoue plus à chaque tour', () => {
    it('1er tour : le barbare 11+ tombe à 0 et se relève à 1 (drapeau posé) ; 2e tour : il reste à 0', async () => {
        const barbare = {
            ...DEFAULT_CHAR, name: 'Krog', class: 'Barbarian', level: 11,
            stats: { ...DEFAULT_CHAR.stats, STR: 16, DEX: 12, CON: 14 },
            hp: { current: 3, max: 30 }, activeEffects: [rageEffect(11)],
        } as any;
        const { state, enemyId } = combatAvec(barbare, 'Ogre');
        const tourDeLOgre = (s: any) => ({ ...s, currentTurn: enemyId, turnIndex: s.combatants.findIndex((c: any) => c.id === enemyId) });
        useGameStore.setState({ character: barbare, combatState: tourDeLOgre(state) } as any);
        const journal = { rolls: [] as any[], transcript: [] as string[] };
        const ogre = () => S().combatState.combatants.find((c: any) => c.id === enemyId)! as any;

        await runNPCTurn(sessionCtx(journal), ogre());
        expect(ligneJoueur().hp.current, 'Rage implacable : 0 → 1').toBe(1);
        expect(ligneJoueur().relentlessUsed, 'le drapeau doit SURVIVRE à la réconciliation').toBe(true);

        useGameStore.setState(s => ({ combatState: tourDeLOgre(s.combatState) }));
        await runNPCTurn(sessionCtx(journal), ogre());
        expect(ligneJoueur().hp.current, 'une fois par combat : plus de relance').toBe(0);
    });
});

// ═══════════ C7 ═══════════
describe('C7 — le Châtiment divin est consommé par une attaque VOCALE', () => {
    const smite = () => ({
        id: 'smite-1', name: 'Divine Smite', source: 'class_feature', duration: 'rounds', roundsRemaining: 1, modifiers: [],
        onWeaponHit: { dice: '2d8', damageType: 'radiant', consumeOnHit: true },
    });
    // Effet TÉMOIN : il ne porte pas consumeOnHit, il doit survivre. Sans lui,
    // un test qui vide `activeEffects` pour une tout autre raison (fin de
    // combat, resynchronisation de fiche) passerait pour un succès.
    const temoin = () => ({ id: 'bless-1', name: 'Bless', source: 'spell', duration: 'rounds', roundsRemaining: 10, modifiers: [] });
    const paladin = () => ({
        ...DEFAULT_CHAR, name: 'Bran', class: 'Paladin', level: 5,
        stats: { ...DEFAULT_CHAR.stats, STR: 16 }, activeEffects: [smite(), temoin()],
    }) as any;
    const effets = () => (S().character!.activeEffects || []).map(e => e.id);

    it('le coup PORTE sur un ennemi qui survit : le rider part, le témoin reste', async () => {
        // Un Ogre (59 PV) survit au coup : le combat ne se termine pas, donc le
        // retrait ne peut pas être un effet de bord de fin de rencontre.
        const { state } = combatAvec(paladin(), 'Ogre');
        useGameStore.setState({ character: paladin(), transcript: [], combatState: tourDuJoueur(state) } as any);

        const r: any = await runTool(refs(), { name: 'resolve_attack', args: { attacker: 'player', target: 'Ogre' } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        expect(r.hit).toBe(true);
        const ogre: any = S().combatState.combatants.find((c: any) => !c.isPlayer);
        expect(ogre.hp.current, 'précondition : l’ogre doit SURVIVRE').toBeGreaterThan(0);
        expect(effets()).not.toContain('smite-1');
        expect(effets(), 'seul le rider à usage unique doit partir').toContain('bless-1');
    });

    it('contrôle négatif : si l’attaque RATE, le châtiment reste armé', async () => {
        const { state, enemyId } = combatAvec(paladin(), 'Goblin');
        // CA hors d'atteinte du jet figé (15 + bonus) : le coup rate à coup sûr.
        const imprenable = {
            ...tourDuJoueur(state),
            combatants: state.combatants.map((c: any) => c.id === enemyId ? { ...c, ac: 40 } : c),
        };
        useGameStore.setState({ character: paladin(), transcript: [], combatState: imprenable } as any);

        const r: any = await runTool(refs(), { name: 'resolve_attack', args: { attacker: 'player', target: 'Goblin' } });
        expect(r.success).toBe(true);
        expect(r.hit, 'précondition : le coup doit RATER').toBe(false);
        expect(effets(), 'un emplacement de sort ne se dépense pas sur un échec').toContain('smite-1');
    });
});

// ═══════════ C8 ═══════════
//
// Le premier correctif RENOMMAIT le combattant avec la fiche du bestiaire.
// L'auto-audit l'a réfuté : « Prêtre » ne résout PAS vers « Priest » — le MJ
// perdait sa propre créature (« Enemy not found »), soit exactement le drame
// TR10 documenté dans encounter.ts. Le nom reste donc celui du MJ et la fiche
// voyage à côté (`sheetName`). Ces tests verrouillent LES DEUX moitiés : les
// bonnes stats ET le ciblage par le nom que le MJ a employé.
describe('C8 — un nom français prend les stats de sa fiche SANS perdre son nom', () => {
    const ajoute = async (nom: string, level = 5) => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level } as any;
        useGameStore.setState({ character: hero, transcript: [], combatState: startEncounter(hero, EMPTY) } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: nom, force: true } });
        expect(r.success, JSON.stringify(r)).toBe(true);
        return S().combatState.combatants.find((c: any) => !c.isPlayer) as any;
    };

    it('« Vétéran » : 58 PV / CA 17 (pas 30 / 10), nom conservé, et le MJ le retrouve', async () => {
        expect(getCreature('Vétéran'), 'précondition : getCreature ne connaît pas l’accent').toBeNull();
        const vet = await ajoute('Vétéran');
        const fiche = getCreature('Veteran')!;
        expect(vet.name, 'TR10 : le nom du MJ ne doit JAMAIS être écrasé').toBe('Vétéran');
        expect(vet.sheetName).toBe('Veteran');
        // Dérivé de la fiche, pas codé en dur : une évolution légitime du
        // bestiaire ne doit pas produire un échec trompeur.
        expect(vet.hp.max).toBe(fiche.hp.base);
        expect(vet.ac).toBe(fiche.ac);
        expect(vet.hp.max, 'garde-fou : ce n’est plus le défaut homebrew').toBeGreaterThan(30);
        expect(resolveCombatantReference(S().combatState, 'Vétéran', { autoResolve: true }).combatant?.id).toBe(vet.id);
    });

    it('« Prêtre » : le cas que le premier correctif cassait — stats justes ET ciblage intact', async () => {
        expect(getCreature('Prêtre')).toBeNull();
        const pretre = await ajoute('Prêtre');
        expect(pretre.name).toBe('Prêtre');
        expect(pretre.sheetName).toBe('Priest');
        expect(pretre.hp.max).toBe(getCreature('Priest')!.hp.base);
        expect(pretre.ac).toBe(getCreature('Priest')!.ac);
        // La moitié qui compte : renommé en « Priest », ceci rendait null.
        expect(resolveCombatantReference(S().combatState, 'Prêtre', { autoResolve: true }).combatant?.id).toBe(pretre.id);
    });

    it('le tour du PNJ joue les VRAIES attaques de la fiche, pas le repli +4 / 1d6+2', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Hero', hp: { current: 1000, max: 1000 } } as CharacterSheet;
        useGameStore.setState({ character: hero, transcript: [], combatState: startEncounter(hero, EMPTY) } as any);
        await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Vétéran', force: true } });
        const vet: any = S().combatState.combatants.find((c: any) => !c.isPlayer);
        useGameStore.setState(s => ({
            combatState: {
                ...s.combatState,
                currentTurn: vet.id,
                turnIndex: s.combatState.combatants.findIndex((c: any) => c.id === vet.id),
                combatants: s.combatState.combatants.map((c: any) => c.id === vet.id ? { ...c, range: 'melee' } : c),
            },
        } as any));
        const journal = { rolls: [] as any[], transcript: [] as string[] };
        await runNPCTurn(sessionCtx(journal), S().combatState.combatants.find((c: any) => c.id === vet.id)! as any);
        expect(journal.rolls.length).toBeGreaterThan(0);
        expect(journal.rolls.some(r => /Attack\b/.test(String(r.name))), `repli générique joué : ${journal.rolls.map(r => r.name).join(', ')}`).toBe(false);
    });

    it('le budget XP pèse la vraie fiche (700 XP), il ne la brade plus à ~90', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 1 } as any;
        useGameStore.setState({ character: hero, transcript: [], combatState: startEncounter(hero, EMPTY) } as any);
        const r: any = await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Vétéran' } });
        expect(r.success, 'un Veteran (700 XP) doit être REFUSÉ devant un héros niveau 1').toBe(false);
        expect(r.error).toMatch(/OVER BUDGET/);
    });

    it('non-régression : une épithète garde son nom, ses stats, et reste ciblable', async () => {
        const gob = await ajoute('Gobelin borgne', 3);
        expect(gob.name).toBe('Gobelin borgne');
        expect(gob.hp.max).toBe(getCreature('Goblin')!.hp.base);
        // La fiche est portée là aussi : les relectures deviennent EXACTES au
        // lieu de repasser par la correspondance floue à chaque appel.
        expect(gob.sheetName).toBe('Goblin');
        expect(resolveCombatantReference(S().combatState, 'Gobelin borgne', { autoResolve: true }).combatant?.id).toBe(gob.id);
    });

    it('non-régression : deux homonymes restent AMBIGUS (la protection voulue par TR10)', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 5 } as any;
        useGameStore.setState({ character: hero, transcript: [], combatState: startEncounter(hero, EMPTY) } as any);
        await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Gobelin', force: true } });
        await runTool(refs(), { name: 'add_enemy_init', args: { name: 'Gobelin', force: true } });
        const lookup = resolveCombatantReference(S().combatState, 'Gobelin', {});
        expect(lookup.ambiguous, 'le moteur doit toujours forcer le MJ à désigner par id').toBe(true);
    });
});

// ═══════════ T13 ═══════════
describe('T13 — remove_condition atteint la bonne créature, partout', () => {
    const heros = () => ({ ...DEFAULT_CHAR, name: 'Bran', level: 3, activeEffects: [poisoned()] });
    const etatsHeros = () => ((S().character as any)?.activeEffects || []).map((e: any) => e.name);

    it('🔴 HORS combat + PNJ : refus instructif, le héros garde son état', async () => {
        useGameStore.setState({ character: heros(), transcript: [], combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'remove_condition', args: { condition: 'poisoned', target: 'Garde' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/start_combat/);
        expect(etatsHeros()).toEqual(['Poisoned']);
    });

    it('✅ HORS combat + HÉROS : la guérison passe', async () => {
        useGameStore.setState({ character: heros(), transcript: [], combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'remove_condition', args: { condition: 'poisoned', target: 'Bran' } });
        expect(r.success).toBe(true);
        expect(etatsHeros()).toEqual([]);
    });

    it('✅ EN combat + PNJ : l’état part du Goblin, le héros reste empoisonné', async () => {
        useGameStore.setState({
            character: heros(), transcript: [],
            combatState: {
                isActive: true, currentTurn: 'Bran', turnIndex: 0,
                combatants: [
                    { id: 'player', name: 'Bran', hp: { current: 20, max: 20 }, ac: 16, initiative: 12, isPlayer: true, activeEffects: [] },
                    { id: 'g', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 13, initiative: 9, activeEffects: [poisoned('gp')] },
                ],
            },
        } as any);
        const r: any = await runTool(refs(), { name: 'remove_condition', args: { condition: 'poisoned', target: 'Goblin' } });
        expect(r.success).toBe(true);
        const goblin: any = S().combatState.combatants.find((c: any) => c.id === 'g');
        expect(goblin.activeEffects).toEqual([]);
        expect(etatsHeros()).toEqual(['Poisoned']);
    });
});

// ═══════════ T3 ═══════════
describe('T3 — une formule de dés illisible est REFUSÉE, plus jamais 0 en silence', () => {
    it('isDiceFormula : dés et entiers plats passent, le reste non', () => {
        for (const ok of ['2d6', '1d8+2', '3d4+3+1d4+1', '5', '+3', '-2', ' 1 d 6 ']) expect(isDiceFormula(ok), ok).toBe(true);
        for (const ko of ['beaucoup', 'énorme', 'un paquet', '', '  ', 'd6', '2d', 'x']) expect(isDiceFormula(ko), ko).toBe(false);
    });

    it('environmental_damage("beaucoup") refuse — avant : "ne subit aucun dégât" avec success:true et la condition posée quand même', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Bran', activeEffects: [] }, transcript: [], combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'environmental_damage', args: { target: 'Bran', damageFormula: 'beaucoup', condition: 'poisoned' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/not a dice formula/);
        expect(((S().character as any).activeEffects || [])).toEqual([]);
    });

    it('propose_player_action et resolve_attack refusent aussi', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 3 } as any;
        const { state } = combatAvec(hero, 'Goblin');
        useGameStore.setState({ character: hero, transcript: [], proposedActions: [], combatState: tourDuJoueur(state) } as any);
        const carte: any = await runTool(refs(), { name: 'propose_player_action', args: { label: 'Lustre', resolution: 'attack', cost: 'action', attackBonus: 5, damageFormula: 'enorme', target: 'Goblin' } });
        expect(carte.success).toBe(false);
        expect(carte.error).toMatch(/not a dice formula/);
        expect(S().proposedActions).toHaveLength(0);

        const atk: any = await runTool(refs(), { name: 'resolve_attack', args: { attacker: 'player', target: 'Goblin', damageFormula: 'un paquet' } });
        expect(atk.success).toBe(false);
        expect(atk.error).toMatch(/not a dice formula/);
    });
});

// ═══════════ T6 ═══════════
describe('T6 — add_effect sur un PNJ : stat normalisée, inconnue refusée, bonus borné', () => {
    it('normalizeEffectStat : alias FR/EN, partagés par les DEUX branches', () => {
        expect(normalizeEffectStat('CA')).toBe('AC');
        expect(normalizeEffectStat(' armure ')).toBe('AC');
        expect(normalizeEffectStat('défense')).toBe('AC');
        expect(normalizeEffectStat('attaque')).toBe('attackBonus');
        expect(normalizeEffectStat('dégâts')).toBe('damageBonus');
        expect(normalizeEffectStat('bonus de dégâts')).toBe('damageBonus');
        expect(normalizeEffectStat('Sagesse')).toBe('WIS');
        // Ce qu'une LIGNE de combat sait lire, distinct de ce que la FICHE lit.
        expect(normalizeCombatantStat('CA')).toBe('AC');
        expect(normalizeCombatantStat('Sagesse')).toBeNull();
    });

    it('la branche JOUEUR normalise aussi : « CA=+2 » sur le héros change vraiment sa CA', async () => {
        // C'est la branche par DÉFAUT (target omis) — le premier correctif ne
        // durcissait que la branche PNJ et laissait ce mensonge intact.
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 3, activeEffects: [] } as any;
        useGameStore.setState({ character: hero, transcript: [], combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const avant = getEffectiveAC(S().character!);
        const r: any = await runTool(refs(), { name: 'add_effect', args: { name: 'Bénédiction', source: 'spell', duration: 'rounds', rounds: 3, stat: 'CA=+2' } });
        expect(r.success).toBe(true);
        expect(getEffectiveAC(S().character!)).toBe(avant + 2);
    });

    it('« CA=+2 » devient AC +2 ; « AC=+100 » est clampé à +10 ; « Sagesse=+2 » est POSÉE avec un avertissement', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 3 } as any;
        const { state, enemyId } = combatAvec(hero, 'Goblin');
        useGameStore.setState({ character: hero, transcript: [], combatState: tourDuJoueur(state) } as any);
        const goblin = () => S().combatState.combatants.find((c: any) => c.id === enemyId)! as any;
        const base = { target: 'Goblin', source: 'spell', duration: 'rounds', rounds: 3 };

        const ca: any = await runTool(refs(), { name: 'add_effect', args: { ...base, name: 'Aura', stat: 'CA=+2' } });
        expect(ca.success, JSON.stringify(ca)).toBe(true);
        expect(goblin().activeEffects.find((e: any) => e.name === 'Aura').modifiers).toEqual([{ stat: 'AC', bonus: 2 }]);

        const boss: any = await runTool(refs(), { name: 'add_effect', args: { ...base, name: 'Boss', stat: 'AC=+100' } });
        expect(boss.success).toBe(true);
        expect(goblin().activeEffects.find((e: any) => e.name === 'Boss').modifiers).toEqual([{ stat: 'AC', bonus: 10 }]);

        // La déclaration d'outil demande explicitement « STR=+2 » / « speed=+10 » :
        // refuser revenait à refuser ce qu'on demande, et deux refus d'affilée
        // coupaient l'outil au disjoncteur. On pose, et on PRÉVIENT.
        const hors: any = await runTool(refs(), { name: 'add_effect', args: { ...base, name: 'Sagesse', stat: 'Sagesse=+2' } });
        expect(hors.success).toBe(true);
        expect(hors.note, 'le MJ doit apprendre que ça n’a pas d’effet chiffré ici').toMatch(/AC.*attackBonus.*damageBonus/);
        const pose = goblin().activeEffects.find((e: any) => e.name === 'Sagesse');
        expect(pose.modifiers).toEqual([{ stat: 'WIS', bonus: 2 }]);
    });

    it('un buff DOCUMENTÉ (« STR=+2 ») ne fait plus sauter le disjoncteur : deux appels de suite passent', async () => {
        const hero = { ...DEFAULT_CHAR, name: 'Bran', level: 3 } as any;
        const { state } = combatAvec(hero, 'Goblin');
        useGameStore.setState({ character: hero, transcript: [], combatState: tourDuJoueur(state) } as any);
        const base = { target: 'Goblin', source: 'spell', duration: 'rounds', rounds: 3 };
        for (const n of ['Force 1', 'Force 2']) {
            const r: any = await runTool(refs(), { name: 'add_effect', args: { ...base, name: n, stat: 'STR=+2' } });
            expect(r.success, `${n} : ${JSON.stringify(r)}`).toBe(true);
        }
    });
});

// ═══════════ N5 ═══════════
describe('N5 — multi-cibles : quand TOUT est refusé, l’outil ne rapporte plus un succès', () => {
    it('deux PNJ hors combat → success:false, chaque refus listé', async () => {
        useGameStore.setState({ character: { ...DEFAULT_CHAR, name: 'Bran', activeEffects: [] }, transcript: [], combatState: { isActive: false, combatants: [], currentTurn: '' } } as any);
        const r: any = await runTool(refs(), { name: 'environmental_damage', args: { targets: ['Garde A', 'Garde B'], damageFormula: '1d6' } });
        expect(r.success).toBe(false);
        expect(r.error).toMatch(/EVERY target/);
        expect(r.targets).toHaveLength(2);
        expect(r.targets.every((t: any) => t.success === false)).toBe(true);
    });
});

// ═══════════ K1 ═══════════
describe('K1 — le style de combat n’existe que pour les classes martiales', () => {
    const arme: any = { name: 'Longsword', damage: '1d8', damageType: 'slashing', abilityMod: 'STR', attackBonus: 0, magicBonus: 0, properties: ['versatile'] };
    const base = () => ({ ...DEFAULT_CHAR, stats: { ...DEFAULT_CHAR.stats, STR: 14 }, weapon: arme, inventory: [], activeEffects: [], fightingStyle: 'Dueling' }) as any;

    it('activeFightingStyle : Duel pour un guerrier, rien pour un mage (même champ)', () => {
        expect(activeFightingStyle({ class: 'Fighter', fightingStyle: 'Dueling' })).toBe('Dueling');
        expect(activeFightingStyle({ class: 'Paladin', fightingStyle: 'Defense' })).toBe('Defense');
        for (const cls of ['Mage', 'Rogue', 'Cleric', 'Monk', 'Barbarian', 'Sorcerer', 'Warlock', 'Bard', 'Druid']) {
            expect(activeFightingStyle({ class: cls, fightingStyle: 'Dueling' }), cls).toBeUndefined();
        }
    });

    it('le mage au bâton ne touche plus à +2 : mêmes stats, même arme, deux points d’écart avec le guerrier', () => {
        const guerrier = getPlayerDamageBonus({ ...base(), class: 'Fighter' });
        const mage = getPlayerDamageBonus({ ...base(), class: 'Mage' });
        expect(guerrier - mage).toBe(2);
        expect(mage).toBe(2); // STR 14 → +2, rien d'autre
    });
});

// ═══════════ K5 ═══════════
describe('K5 — la Rage suit le niveau (SRD : +2, +3 au 9, +4 au 16)', () => {
    it('rageEffect(niveau)', () => {
        const bonus = (lvl: number) => rageEffect(lvl).modifiers![0].bonus;
        expect(bonus(1)).toBe(2);
        expect(bonus(8)).toBe(2);
        expect(bonus(9)).toBe(3);
        expect(bonus(15)).toBe(3);
        expect(bonus(16)).toBe(4);
        expect(rageEffect().modifiers![0].bonus, 'sans argument : niveau 1').toBe(2);
    });
});

// ═══════════ N1 ═══════════
describe('N1 — les tiers-lanceurs lancent en INTELLIGENCE', () => {
    /** INT 18 (+4), CHA 8 (-1), niveau 5 (maîtrise +3) → +7 attendu, +2 avant. */
    const tiersLanceur = (cls: string, sub: string) => ({
        ...DEFAULT_CHAR, name: 'Bran', class: cls, subclass: sub, level: 5,
        stats: { ...DEFAULT_CHAR.stats, INT: 18, CHA: 8 },
        spellcastingAbility: undefined, cantrips: ['Fire Bolt'], knownSpells: [], preparedSpells: [],
        activeEffects: [],
    }) as any;

    it('le Chevalier occulte lance Fire Bolt à +7 (INT), pas à +2 (CHA)', () => {
        const r: any = castSpell(tiersLanceur('Fighter', 'Eldritch Knight'), { spellName: 'Fire Bolt', target: 'Goblin' });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        expect(r.prompt?.formula).toBe('1d20+7');
    });

    it('l’Escroc arcanique aussi', () => {
        const r: any = castSpell(tiersLanceur('Rogue', 'Arcane Trickster'), { spellName: 'Fire Bolt', target: 'Goblin' });
        expect(r.success, JSON.stringify(r.error)).toBe(true);
        expect(r.prompt?.formula).toBe('1d20+7');
    });

    it('garde-fou de l’effet de bord : un guerrier SANS archétype de lanceur ne lance toujours pas', () => {
        const brut = { ...tiersLanceur('Fighter', 'Champion'), cantrips: [], knownSpells: [], preparedSpells: [] };
        const r: any = castSpell(brut, { spellName: 'Fire Bolt', target: 'Goblin' });
        expect(r.success).toBe(false);
        expect(String(r.error)).toMatch(/spell list/i);
    });

    it('la table reste la source unique', () => {
        expect(CLASS_CASTER_ABILITY.Fighter).toBe('INT');
        expect(CLASS_CASTER_ABILITY.Rogue).toBe('INT');
    });
});

// ═══════════ Correctifs sans couverture, relevés par la relecture ═══════════
describe('M15 — une quête sans description ne fait plus tomber la session', () => {
    it('buildCampaignDirectorContext survit à une quête dépourvue de description', () => {
        const entree: any = {
            character: DEFAULT_CHAR,
            adventure: 'Test',
            journal: { quests: [{ id: 'q1', title: 'Sauver Trenn', status: 'active', steps: [] }], npcs: [], locations: [], chronicle: [] },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
        };
        expect(() => buildCampaignDirectorContext(entree)).not.toThrow();
        expect(buildCampaignDirectorContext(entree)).toContain('Sauver Trenn');
    });
});

describe('K1 (CA) — le +1 de Défense suit la même porte que le +2 de Duel', () => {
    it('un mage en armure avec fightingStyle « Defense » ne gagne plus +1 CA', () => {
        const armure: any = { name: 'Chain Mail', type: 'armor', equipped: true, slot: 'chest', baseAC: 16, armorType: 'heavy' };
        const base = { ...DEFAULT_CHAR, inventory: [armure], stats: { ...DEFAULT_CHAR.stats, DEX: 10 }, fightingStyle: 'Defense' } as any;
        const guerrier = getBaseACFromArmor({ ...base, class: 'Fighter' });
        const mage = getBaseACFromArmor({ ...base, class: 'Mage' });
        expect(guerrier, 'précondition : la cotte de mailles doit être reconnue').toBe(17);
        expect(mage).toBe(16);
        expect(guerrier - mage).toBe(1);
    });
});

describe('M1 (côté session Live) — le tableau reçu par le MJ n’est plus celui de l’appelant', () => {
    it('LiveDungeonMaster copie initialHistory : pousser dedans ne salit pas la source', () => {
        const source: any[] = [{ speaker: 'dm', text: 'ligne d’origine' }];
        const dm: any = new LiveDungeonMaster(
            DEFAULT_CHAR as any, 'aventure', () => {}, () => {}, () => {}, 'French', source,
        );
        // recordHistory est privé : on vise le tableau interne, comme lui.
        (dm as any).initialHistory.push({ speaker: 'user', text: 'ajout de la session' });
        expect(source, 'le tableau de l’appelant (le store) doit rester intact').toHaveLength(1);
        expect((dm as any).initialHistory).toHaveLength(2);
    });
});
