// ═══════════════════════════════════════════════════════════════════════════
// Campagne de correction — audit du 2026-08-12 (vérifié adversarialement).
// Chaque bloc verrouille un correctif : régresser = casser un test nommé.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import {
    applyDamageToCharacter,
    applyDamageToEncounter,
    applyDownedDamagePenalty,
    stabilizeCharacter,
    releaseNpcConcentrationEffect,
    startEncounter,
    addEnemyToEncounter,
    deriveRollContext,
    normalizeRollPrompt,
    castSpell,
    MORALE_DC,
    CLASS_CASTER_ABILITY,
} from '../engine/rulesEngine';
import { lookupMonster, lookupCondition } from '../engine/codexService';
import { SRD51_CONDITIONS } from '../data/srd51/rules';
import { isProficientWithWeapon, findWeaponTemplate } from '../data/weapons';
import { foldText, armorStealthPenalty } from '../engine/skillSystem';
import { ATTUNEMENT_LIMIT, getPlayerAttackModifier, getRollBonus } from '../types';
import { DEFAULT_CHAR } from '../data/character';
import { CSV_MONSTERS } from '../data/monsterData';

const EMPTY_ENCOUNTER: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0 };

const hero = (over: any = {}) => ({ ...DEFAULT_CHAR, ...over });

// ─── E1 — bestiaire enrichi (SRD) ────────────────────────────────────────────
describe('bestiary enrichment (audit E1)', () => {
    it('the Lich carries real saves, resistances, immunities and condition immunities', () => {
        const lich = CSV_MONSTERS['lich'];
        expect(lich.saves?.WIS).toBe(9);
        expect(lich.saves?.INT).toBe(12);
        expect(lich.immunities).toContain('poison');
        expect(lich.resistances).toContain('cold');
        expect(lich.conditionImmunities).toContain('frightened');
        expect(lich.legendaryActions).toBeGreaterThan(0);
    });

    it('the skeleton is vulnerable to bludgeoning and immune to poison', () => {
        const skeleton = CSV_MONSTERS['skeleton'];
        expect(skeleton.vulnerabilities).toContain('bludgeoning');
        expect(skeleton.immunities).toContain('poison');
    });

    it('lookupMonster refs now carry stats AND saves (the +0 flat-save bug)', () => {
        const ref: any = lookupMonster('Lich');
        expect(ref?.stats?.WIS).toBeGreaterThan(0);
        expect(ref?.saves?.WIS).toBe(9);
    });

    it('bestiary mitigations actually fire in combat (skeleton takes double bludgeoning)', () => {
        let state = startEncounter(hero(), EMPTY_ENCOUNTER);
        state = addEnemyToEncounter(state, { name: 'Skeleton' }).state;
        const target = state.combatants.find(c => !c.isPlayer)!;
        const applied = applyDamageToEncounter(state, target.id, 10, 'bludgeoning');
        expect(applied.mitigation).toBe('vulnerable');
        expect(applied.amountApplied).toBe(20);
        const poison = applyDamageToEncounter(state, target.id, 10, 'poison');
        expect(poison.mitigation).toBe('immune');
        expect(poison.amountApplied).toBe(0);
    });
});

// ─── D — le héros peut être immunisé / vulnérable ────────────────────────────
describe('player immunity & vulnerability (audit D)', () => {
    it('character-level immunity zeroes the damage', () => {
        const char = hero({ immunities: ['fire'], hp: { current: 20, max: 20 } });
        const out = applyDamageToCharacter(char, 12, 'fire');
        expect(out.mitigation).toBe('immune');
        expect(out.character.hp.current).toBe(20);
    });

    it('character-level vulnerability doubles the damage', () => {
        const char = hero({ vulnerabilities: ['cold'], hp: { current: 20, max: 20 }, tempHP: 0 });
        const out = applyDamageToCharacter(char, 5, 'cold');
        expect(out.mitigation).toBe('vulnerable');
        expect(out.character.hp.current).toBe(10);
    });
});

// ─── D — règles de mort RAW ──────────────────────────────────────────────────
describe('RAW death rules (audit D)', () => {
    it('damage taken at 0 HP adds an automatic death-save failure (2 on a crit)', () => {
        const down = hero({ hp: { current: 0, max: 20 }, tempHP: 0, deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false } });
        const hit = applyDamageToCharacter(down, 4, 'slashing');
        expect(hit.character.deathSaves?.failures).toBe(1);
        const crit = applyDownedDamagePenalty(hit.character, true);
        expect(crit.deathSaves?.failures).toBe(3);
        expect(crit.deathSaves?.isDead).toBe(true);
    });

    it('massive damage (remaining ≥ HP max) kills outright', () => {
        const char = hero({ hp: { current: 5, max: 20 }, tempHP: 0 });
        const out = applyDamageToCharacter(char, 30, 'fire'); // 30-5 = 25 ≥ 20
        expect(out.character.hp.current).toBe(0);
        expect(out.character.deathSaves?.isDead).toBe(true);
    });

    it('stabilizeCharacter (Medicine DC 10) makes a dying hero stable at 0 HP', () => {
        const dying = hero({ hp: { current: 0, max: 20 }, deathSaves: { successes: 1, failures: 2, isStable: false, isDead: false } });
        const stable = stabilizeCharacter(dying);
        expect(stable.deathSaves).toEqual({ successes: 0, failures: 0, isStable: true, isDead: false });
        expect(stabilizeCharacter(hero({ hp: { current: 5, max: 20 } })).deathSaves).toBeUndefined();
    });
});

// ─── D — conditions 15/15 + effets sur les TESTS ─────────────────────────────
describe('SRD conditions completeness (audit D)', () => {
    it('ships all 15 SRD conditions including deafened, petrified, exhaustion', () => {
        expect(SRD51_CONDITIONS.length).toBe(15);
        expect(lookupCondition('petrified')?.name).toBe('Petrified');
        expect(lookupCondition('assourdi')?.name).toBe('Deafened');
        expect(lookupCondition('épuisement')?.name).toBe('Exhaustion');
    });

    it('Frightened and Exhaustion impose disadvantage on ability CHECKS', () => {
        for (const name of ['Frightened', 'Exhaustion']) {
            const prompt = normalizeRollPrompt({ reason: 'Perception check', formula: '1d20', dc: 10 });
            prompt.type = 'CHECK';
            const ctx = deriveRollContext(prompt, { actorEffects: [{ id: 'e', name, source: 'condition', duration: 'rounds', modifiers: [] }] } as any);
            expect(ctx.prompt.advantage).toBe('disadvantage');
        }
    });
});

// ─── D — concentration des PNJ ───────────────────────────────────────────────
describe('NPC concentration (audit D)', () => {
    it('an enemy caster who goes down loses concentration; the linked effect lifts', () => {
        let state = startEncounter(hero(), EMPTY_ENCOUNTER);
        state = addEnemyToEncounter(state, { name: 'Cult Fanatic', hp: 8 }).state;
        const caster = state.combatants.find(c => !c.isPlayer)!;
        state = {
            ...state,
            combatants: state.combatants.map(c => c.id === caster.id
                ? { ...c, concentratingOn: { effectName: 'Hold Person', targetId: state.combatants.find(x => x.isPlayer)!.id } }
                : c),
        };
        const applied = applyDamageToEncounter(state, caster.id, 50, 'fire');
        expect(applied.npcConcentrationBroken?.downed).toBe(true);
        expect(applied.npcConcentrationBroken?.effectName).toBe('Hold Person');

        const char = hero({ activeEffects: [{ id: 'x', name: 'Hold Person', source: 'spell', duration: 'concentration', modifiers: [] }] });
        const released = releaseNpcConcentrationEffect(applied.state, char, applied.npcConcentrationBroken!);
        expect(released.removedFromPlayer).toBe(true);
        expect(released.character?.activeEffects?.length).toBe(0);
    });
});

// ─── A/D — maîtrise des armes ────────────────────────────────────────────────
describe('weapon proficiency gating (audit D)', () => {
    it('a Mage is NOT proficient with a greataxe but IS with a dagger', () => {
        expect(isProficientWithWeapon('Mage', 'Greataxe')).toBe(false);
        expect(isProficientWithWeapon('Mage', 'Dague')).toBe(true);
    });

    it('a Fighter is proficient with martial weapons; a Rogue with a rapier', () => {
        expect(isProficientWithWeapon('Fighter', 'Greataxe')).toBe(true);
        expect(isProficientWithWeapon('Rogue', 'Rapier')).toBe(true);
    });

    it('unknown/homebrew weapons never lose proficiency (no punishment for improvisation)', () => {
        expect(isProficientWithWeapon('Mage', 'Lame du Chant Brisé')).toBe(true);
    });

    it('getPlayerAttackModifier drops the proficiency bonus for a non-proficient wielder', () => {
        const stats = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
        const weapon = { name: 'Greataxe', damage: '1d12', damageType: 'slashing', abilityMod: 'STR' as const, attackBonus: 0 };
        const mage = hero({ class: 'Mage', level: 5, stats, weapon, activeEffects: [], inventory: [] });
        const fighter = hero({ class: 'Fighter', level: 5, stats, weapon, activeEffects: [], inventory: [] });
        expect(getPlayerAttackModifier(fighter) - getPlayerAttackModifier(mage)).toBe(3); // prof +3 au niveau 5
    });

    it('findWeaponTemplate matches FR and EN names, magic suffixes included', () => {
        expect(findWeaponTemplate('Arc long')?.name).toBe('Longbow');
        expect(findWeaponTemplate('Longsword +1')?.name).toBe('Longsword');
    });
});

// ─── A — divers verrouillages ────────────────────────────────────────────────
describe('assorted audit locks', () => {
    it('MORALE_DC is the single source of truth (11)', () => {
        expect(MORALE_DC).toBe(11);
    });

    it('ATTUNEMENT_LIMIT is the SRD cap of 3', () => {
        expect(ATTUNEMENT_LIMIT).toBe(3);
    });

    it('foldText is exported and folds accents/case', () => {
        expect(foldText('Discrétion')).toBe('discretion');
    });

    it('armorStealthPenalty fires only for equipped stealthDisadvantage armor', () => {
        const noisy = armorStealthPenalty({ inventory: [{ name: 'Plate', equipped: true, stealthDisadvantage: true }] });
        expect(noisy?.source).toBe('Plate');
        expect(armorStealthPenalty({ inventory: [{ name: 'Plate', equipped: false, stealthDisadvantage: true }] })).toBeNull();
    });

    it('CLASS_CASTER_ABILITY maps Cleric to WIS (SpellbookPanel display parity)', () => {
        expect(CLASS_CASTER_ABILITY['Cleric']).toBe('WIS');
        expect(CLASS_CASTER_ABILITY['Mage']).toBe('INT');
    });

    it('Bless grants a rolled 1d4 on saves via getRollBonus (RAW, not flat +2)', () => {
        // class: la porte de liste de classe (2026-08-21) exige un vrai lanceur.
        const char = hero({ class: 'Cleric', spellSlots: { '1': { current: 1, max: 1 } }, activeEffects: [], storyModifiers: [] });
        const result = castSpell(char, { spellName: 'Bless', slotLevel: 1 });
        expect(result.success).toBe(true);
        const seen = new Set<number>();
        for (let i = 0; i < 60; i++) seen.add(getRollBonus(result.character, 'save'));
        // 1d4 relancé à chaque jet : plusieurs valeurs distinctes dans [1..4].
        expect([...seen].every(v => v >= 1 && v <= 4)).toBe(true);
        expect(seen.size).toBeGreaterThan(1);
    });
});
