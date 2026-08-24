/**
 * gameplayFixes.test.ts
 * Régressions des quatre bugs de jeu signalés en session :
 *   1. l'arc long n'était pas reconnu comme arme à distance ;
 *   2. les sorts n'infligeaient pas de dégâts ;
 *   3. les alliés ne faisaient rien de leur tour ;
 *   4. des capacités de classe entières n'existaient pas.
 */
import { describe, it, expect, vi } from 'vitest';
import {
    addAllyToEncounter,
    addEnemyToEncounter,
    allyAttackProfile,
    applyAutoDamageSpell,
    castSpell,
    ensureProgressionState,
    resolveAttackAction,
    resolvePendingSpellRoll,
    resolveRollPrompt,
    startEncounter,
} from '../services/rulesEngine';
import { enrichWeaponItem, getWeaponFromInventory, repairCharacterWeapons } from '../data/equipment';
import { DEFAULT_CHAR } from '../data/character';
import { isRangedWeapon, getPlayerAttackModifier } from '../types';
import { rollDice } from '../services/utils';

const EMPTY_ENCOUNTER: any = {
    isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
};

function hero(overrides: any = {}) {
    return ensureProgressionState({ ...DEFAULT_CHAR, name: 'Test', ...overrides } as any);
}

function mage() {
    return hero({
        class: 'Mage',
        level: 5,
        stats: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 10, CHA: 10 },
        spellcastingAbility: 'INT',
        cantrips: ['Fire Bolt'],
        knownSpells: ['Magic Missile'],
        preparedSpells: ['Magic Missile'],
    });
}

// ═══════════════════════════════ 1. ARMES À DISTANCE ════════════════════════
describe('ranged weapon recognition', () => {
    it('enriches a bare French "Arc long" with range + ammunition', () => {
        const item = enrichWeaponItem({
            id: 'x', name: 'Arc long', type: 'weapon', slot: 'none', weight: 0, quantity: 1, equipped: false,
        } as any);
        expect(isRangedWeapon(item)).toBe(true);
        expect(item.range).toBe('45/180');
        expect(item.properties).toContain('ammunition');
        expect(item.damageDice).toBe('1d8');
    });

    it('recognises bows and crossbows in both languages', () => {
        for (const name of ['Longbow', 'Arc court', 'Arbalète lourde', 'Heavy Crossbow', 'Fronde', 'Sling']) {
            expect(isRangedWeapon({ name })).toBe(true);
        }
    });

    it('keeps melee weapons melee, including thrown ones', () => {
        expect(isRangedWeapon({ name: 'Épée longue', properties: ['versatile'] })).toBe(false);
        expect(isRangedWeapon({ name: "Hache d'armes", properties: ['versatile'] })).toBe(false);
        expect(isRangedWeapon({ name: 'Bâton arcanique', properties: ['two-handed'] })).toBe(false);
        // Une dague a une portée de jet mais reste une arme de mêlée.
        expect(isRangedWeapon({ name: 'Dagger', properties: ['finesse', 'thrown'], range: '20/60' })).toBe(false);
    });

    it('repairs a legacy save where the bow was stored as a bare main-hand item', () => {
        const legacy: any = {
            inventory: [{ id: 'a', name: 'Longbow', type: 'weapon', slot: 'mainHand', equipped: true, weight: 2, quantity: 1, effect: '1d8 Pierce' }],
            weapon: { name: 'Longbow', damage: '1d8', damageType: 'piercing', abilityMod: 'STR', attackBonus: 2 },
        };
        const fixed = repairCharacterWeapons(legacy);
        expect(isRangedWeapon(fixed.weapon)).toBe(true);
        expect(fixed.weapon?.abilityMod).toBe('DEX');       // DEX, plus FOR
        expect(fixed.inventory?.[0].slot).toBe('ranged');   // migre vers l'emplacement dédié
    });

    it('gives a pure archer a real sheet weapon from the ranged slot', () => {
        const inventory: any = [{
            id: 'a', name: 'Longbow', type: 'weapon', slot: 'ranged', equipped: true, weight: 2, quantity: 1,
            properties: ['two-handed', 'ammunition'], range: '150/600', damageDice: '1d8',
        }];
        const weapon = getWeaponFromInventory(inventory);
        expect(weapon.name).toBe('Longbow');
        expect(isRangedWeapon(weapon)).toBe(true);
    });

    it('applies the Archery fighting style to a bow', () => {
        const archer = hero({ class: 'Ranger', fightingStyle: 'Archery', stats: { STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 12, CHA: 10 } });
        const bow: any = { name: 'Arc long', damage: '1d8', damageType: 'piercing', abilityMod: 'DEX', attackBonus: 0, properties: ['ammunition'], range: '45/180' };
        const club: any = { name: 'Gourdin', damage: '1d4', damageType: 'bludgeoning', abilityMod: 'STR', attackBonus: 0, properties: [] };
        // +2 d'Archerie sur l'arc, rien sur le gourdin.
        expect(getPlayerAttackModifier(archer, bow) - getPlayerAttackModifier(archer, club)).toBe(2 + 3);
    });

    it('resolves a bow attack as RANGED (no melee engagement against a far enemy)', () => {
        const archer = hero({
            class: 'Ranger', level: 3, stats: { STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 12, CHA: 10 },
            weapon: { name: 'Arc long', damage: '1d8', damageType: 'piercing', abilityMod: 'DEX', attackBonus: 0, properties: ['ammunition'], range: '45/180' },
        });
        let state = startEncounter(archer, EMPTY_ENCOUNTER);
        state = addEnemyToEncounter(state, { name: 'Orc', hp: 20, ac: 5, range: 'far' }).state;
        const orc = state.combatants.find(c => !c.isPlayer)!;
        // Un 1 naturel rate même à +20 (RAW) : re-lancer pour dé-flaker le test
        // (échouait ~5 % du temps — même famille que le correctif Fire Bolt).
        let result = resolveAttackAction(state, {
            attacker: 'player', target: orc.id, attackBonus: 20, damageFormula: '1d8+3', damageType: 'piercing', consumeAction: false,
        } as any, archer);
        for (let i = 0; i < 20 && result.resolution?.attackRoll.die === 1; i++) {
            result = resolveAttackAction(state, {
                attacker: 'player', target: orc.id, attackBonus: 20, damageFormula: '1d8+3', damageType: 'piercing', consumeAction: false,
            } as any, archer);
        }
        // Une arme de mêlée aurait « fondu » sur la cible (advanced) au lieu de tirer.
        expect((result as any).advanced).toBeUndefined();
        expect(result.resolution?.hit).toBe(true);
    });
});

// ═══════════════════════════════ 2. DÉGÂTS DES SORTS ════════════════════════
describe('spell damage', () => {
    it('damages the right foe when several share a name', () => {
        const char = mage();
        let state = startEncounter(char, EMPTY_ENCOUNTER);
        state = addEnemyToEncounter(state, { name: 'Goblin', hp: 20, ac: 10 }).state;
        state = addEnemyToEncounter(state, { name: 'Goblin', hp: 20, ac: 10 }).state;
        const target = state.combatants.find(c => !c.isPlayer)!;

        const cast = castSpell(char, { spellName: 'Fire Bolt', target: target.name, targetId: target.id, targetAC: target.ac });
        // Un 1 naturel rate même à +50 (RAW) : re-lancer pour dé-flaker le test
        // (échouait ~5 % du temps — audit 2026-08-12).
        let outcome = resolveRollPrompt({ ...cast.prompt!, formula: '1d20+50' } as any);
        for (let i = 0; i < 20 && outcome.die === 1; i++) {
            outcome = resolveRollPrompt({ ...cast.prompt!, formula: '1d20+50' } as any);
        }
        const applied = resolvePendingSpellRoll(state, outcome);

        expect(applied.resolved).toBe(true);
        expect(applied.damage).toBeGreaterThan(0);
    });

    it('applies Magic Missile automatically (no attack roll, no save)', () => {
        const char = mage();
        let state = startEncounter(char, EMPTY_ENCOUNTER);
        state = addEnemyToEncounter(state, { name: 'Ogre', hp: 30, ac: 11 }).state;
        const ogre = state.combatants.find(c => !c.isPlayer)!;

        const cast = castSpell(char, { spellName: 'Magic Missile', slotLevel: 1, target: ogre.name, targetId: ogre.id });
        expect(cast.autoDamage?.damageFormula).toBe('3d4+3');

        const applied = applyAutoDamageSpell(state, cast.autoDamage!)!;
        expect(applied.damage).toBeGreaterThanOrEqual(6);   // 3d4+3 → min 6
        expect(applied.target.hp.current).toBeLessThan(ogre.hp.current);
    });

    it('scales Magic Missile with the slot level', () => {
        const char = mage();
        const cast = castSpell(char, { spellName: 'Magic Missile', slotLevel: 3, target: 'Ogre' });
        // 3 fléchettes + 2 → 5d4+5, quel que soit l'assemblage de la formule.
        const rolled = rollDice(cast.autoDamage!.damageFormula);
        expect(rolled.rolls.length).toBe(5);
        expect(rolled.modifier).toBe(5);
    });

    it('rolls every dice group of a compound formula', () => {
        // "3d4+3+1d4+1" perdait tout ce qui suivait le premier groupe.
        const rolled = rollDice('3d4+3+1d4+1');
        expect(rolled.rolls.length).toBe(4);
        expect(rolled.modifier).toBe(4);
    });
});

// ═══════════════════════════════ 3. ALLIÉS ══════════════════════════════════
describe('allies', () => {
    it('always builds an attack profile, even for an NPC unknown to the bestiary', () => {
        const profile = allyAttackProfile(null, null, 5);
        expect(profile.damage).toBeTruthy();
        expect(profile.attackBonus).toBeGreaterThan(0);
    });

    it('prefers the DM-provided numbers', () => {
        const profile = allyAttackProfile(
            { attackName: 'Arc court', attackBonus: 6, damageFormula: '1d6+3', damageType: 'piercing' }, null, 3
        );
        expect(profile).toEqual({ name: 'Arc court', attackBonus: 6, damage: '1d6+3', damageType: 'piercing' });
    });

    it('gives a homebrew ally a carried attack profile and survivable HP', () => {
        const char = hero({ level: 5 });
        const state = startEncounter(char, EMPTY_ENCOUNTER);
        const { combatant } = addAllyToEncounter(state, { name: 'Sœur Elandra' }, char.level);
        expect(combatant.side).toBe('ally');
        expect(combatant.attack?.damage).toBeTruthy();
        expect(combatant.hp.max).toBeGreaterThan(1);   // avant : 1 PV, mort au premier coup
    });

    it('lets the engine resolve an ally attack with its own profile', () => {
        // Dé FIXÉ : avec un bonus de +20 contre CA 5 l'allié touche toujours…
        // sauf sur un 1 naturel (échec automatique), soit ~5 % des exécutions —
        // ce test échouait donc au hasard, sans rapport avec ce qu'il vérifie.
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const char = hero({ level: 3 });
        let state = startEncounter(char, EMPTY_ENCOUNTER);
        const added = addAllyToEncounter(state, { name: 'Garde vétéran', attackBonus: 20, damageFormula: '2d6+3', damageType: 'slashing' }, 3);
        state = added.state;
        state = addEnemyToEncounter(state, { name: 'Bandit', hp: 25, ac: 5 }).state;
        const bandit = state.combatants.find(c => c.name === 'Bandit')!;

        const result = resolveAttackAction(state, {
            attacker: added.combatant.id,
            target: bandit.id,
            attackBonus: added.combatant.attack!.attackBonus,
            damageFormula: added.combatant.attack!.damage,
            damageType: added.combatant.attack!.damageType,
            attackName: added.combatant.attack!.name,
            consumeAction: false,
        } as any, char);

        expect(result.success).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        expect(result.resolution?.damage).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════ 4. CAPACITÉS DE CLASSE ═════════════════════
describe('class resources', () => {
    it('gives the Warlock an activatable resource (it had none)', () => {
        const warlock = hero({ class: 'Warlock', level: 3 });
        expect(warlock.resources?.pactFocus?.max).toBeGreaterThan(0);
    });

    it('gives the Druid Natural Recovery', () => {
        const druid = hero({ class: 'Druid', level: 4 });
        expect(druid.resources?.naturalRecovery?.max).toBe(1);
        expect(druid.resources?.wildShape?.max).toBe(2);
    });

    it('materialises new resources on an old sheet without wiping spent ones', () => {
        const legacy = hero({ class: 'Warlock', level: 5, resources: { pactMagicJunk: { current: 0, max: 0, recoverOn: 'long_rest' } } });
        const ensured = ensureProgressionState({ ...legacy, resources: { ...legacy.resources, pactFocus: { current: 0, max: 1, recoverOn: 'short_rest' } } } as any);
        expect(ensured.resources?.pactFocus?.current).toBe(0);  // déjà dépensée : on ne la rend pas
        expect(ensured.resources?.pactFocus?.max).toBe(1);
    });

    it('keeps a Paladin able to smite: spell slots exist from level 2', () => {
        const paladin = hero({ class: 'Paladin', level: 2, stats: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 14 } });
        const slots = Object.values(paladin.spellSlots || {});
        expect(slots.some(s => s.max > 0)).toBe(true);
    });
});
