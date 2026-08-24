/**
 * classKit.test.ts
 * Couverture SRD des capacités de classe : ressources, passifs moteur,
 * réactions automatiques, métamagie et hooks d'archétypes (dont Cavalier).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    addEnemyToEncounter,
    applyShortRest,
    brutalCriticalDice,
    castSpell,
    classCheckPassives,
    classSavePassives,
    ensureProgressionState,
    hasEvasion,
    rageEffect,
    resolveAttackAction,
    startEncounter,
} from '../services/rulesEngine';
import { DEFAULT_CHAR } from '../data/character';
import { SUBCLASS_DATA } from '../data/subclasses';

const EMPTY: any = { isActive: false, combatants: [], currentTurn: '', round: 1, turnIndex: 0, actionEconomy: {}, logs: [] };

function hero(overrides: any = {}) {
    return ensureProgressionState({ ...DEFAULT_CHAR, name: 'Test', ...overrides } as any);
}

afterEach(() => vi.restoreAllMocks());

// ═══════════════════════ RESSOURCES PAR CLASSE ═══════════════════════
describe('class resources (SRD)', () => {
    it('Fighter: Indomitable at 9/13/17', () => {
        expect(hero({ class: 'Fighter', level: 8 }).resources?.indomitable).toBeUndefined();
        expect(hero({ class: 'Fighter', level: 9 }).resources?.indomitable?.max).toBe(1);
        expect(hero({ class: 'Fighter', level: 13 }).resources?.indomitable?.max).toBe(2);
        expect(hero({ class: 'Fighter', level: 17 }).resources?.indomitable?.max).toBe(3);
    });

    it('Paladin: Divine Sense (1+CHA) and Channel Divinity at 3', () => {
        const pal = hero({ class: 'Paladin', level: 3, stats: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 14 } });
        expect(pal.resources?.divineSense?.max).toBe(3); // 1 + CHA mod 2
        expect(pal.resources?.channelDivinity?.max).toBe(1);
    });

    it('Cleric: Divine Intervention at 10', () => {
        expect(hero({ class: 'Cleric', level: 9 }).resources?.divineIntervention).toBeUndefined();
        expect(hero({ class: 'Cleric', level: 10 }).resources?.divineIntervention?.max).toBe(1);
    });

    it('Monk (Open Hand): Wholeness of Body at 6', () => {
        expect(hero({ class: 'Monk', level: 6, subclass: 'Way of the Open Hand' }).resources?.wholenessOfBody?.max).toBe(1);
        expect(hero({ class: 'Monk', level: 6 }).resources?.wholenessOfBody).toBeUndefined();
    });
});

// ═══════════════════════ PASSIFS MOTEUR ═══════════════════════
describe('engine passives', () => {
    it('Aura of Protection: Paladin 6+ adds CHA (min 1) to saves', () => {
        const pal = hero({ class: 'Paladin', level: 6, stats: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 16 } });
        expect(classSavePassives(pal, 'WIS').bonus).toBe(3);
        const dullPal = hero({ class: 'Paladin', level: 6, stats: { STR: 16, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 8 } });
        expect(classSavePassives(dullPal, 'WIS').bonus).toBe(1); // min +1
        expect(classSavePassives(hero({ class: 'Paladin', level: 5 }), 'WIS').bonus).toBe(0);
    });

    it('Danger Sense: Barbarian 2+ has advantage on DEX saves only', () => {
        const barb = hero({ class: 'Barbarian', level: 2 });
        expect(classSavePassives(barb, 'DEX').advantage).toBe(true);
        expect(classSavePassives(barb, 'CON').advantage).toBe(false);
    });

    it('Jack of All Trades and Remarkable Athlete on unproficient checks', () => {
        const bard = hero({ class: 'Bard', level: 4 });
        expect(classCheckPassives(bard, 'STR', false).bonus).toBe(1); // half of prof 2
        expect(classCheckPassives(bard, 'STR', true).bonus).toBe(0);  // proficient → rien
        const champ = hero({ class: 'Fighter', level: 7, subclass: 'Champion' });
        expect(classCheckPassives(champ, 'DEX', false).bonus).toBe(2); // ceil(3/2)
        expect(classCheckPassives(champ, 'INT', false).bonus).toBe(0); // FOR/DEX/CON only
    });

    it('Evasion: Rogue/Monk 7+, Hunter 15+', () => {
        expect(hasEvasion(hero({ class: 'Rogue', level: 7 }))).toBe(true);
        expect(hasEvasion(hero({ class: 'Rogue', level: 6 }))).toBe(false);
        expect(hasEvasion(hero({ class: 'Monk', level: 7 }))).toBe(true);
        expect(hasEvasion(hero({ class: 'Ranger', level: 15, subclass: 'Hunter' }))).toBe(true);
    });

    it('Brutal Critical dice scale 9/13/17', () => {
        expect(brutalCriticalDice(hero({ class: 'Barbarian', level: 8 }))).toBe(0);
        expect(brutalCriticalDice(hero({ class: 'Barbarian', level: 9 }))).toBe(1);
        expect(brutalCriticalDice(hero({ class: 'Barbarian', level: 13 }))).toBe(2);
        expect(brutalCriticalDice(hero({ class: 'Barbarian', level: 17 }))).toBe(3);
    });

    it('Song of Rest: a Bard heals an extra die on short rest', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999999);
        const bard = hero({ class: 'Bard', level: 3, stats: { STR: 8, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 16 }, hp: { current: 1, max: 40 } });
        const rested = applyShortRest(bard, 1);
        // d8 max (8) + CON 0 + Chant reposant d6 max (6) = 15 PV depuis 1.
        expect(rested.hp.current).toBe(1 + 8 + 6);
    });
});

// ═══════════════════════ SORTS : PASSIFS & MÉTAMAGIE ═══════════════════════
describe('spell passives and metamagic', () => {
    it('Agonizing Blast: Eldritch Blast adds +CHA per beam', () => {
        const lock = hero({
            class: 'Warlock', level: 5,
            stats: { STR: 8, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 16 },
            spellcastingAbility: 'CHA', cantrips: ['Eldritch Blast'],
        });
        const res = castSpell(lock, { spellName: 'Eldritch Blast', target: 'Ogre', targetAC: 11 });
        // Niveau 5 → 2d10 (2 rayons) → +3 CHA × 2 = +6.
        expect(res.damageFormula).toBe('2d10+6');
    });

    it('Quickened Spell: flag consumed by the next cast', () => {
        const sorc = hero({
            class: 'Sorcerer', level: 5, spellcastingAbility: 'CHA',
            cantrips: ['Fire Bolt'],
            activeEffects: [{ id: 'q1', name: 'Quickened Spell', source: 'class_feature', duration: 'rounds', roundsRemaining: 1, modifiers: [] }],
        });
        const res = castSpell(sorc, { spellName: 'Fire Bolt', target: 'Ogre', targetAC: 11 });
        expect(res.quickened).toBe(true);
        expect((res.character.activeEffects || []).some(e => e.name === 'Quickened Spell')).toBe(false);
    });

    it('Heightened Spell: the enemy save rolls at disadvantage, marker consumed', () => {
        const sorc = hero({
            class: 'Sorcerer', level: 6, spellcastingAbility: 'CHA',
            knownSpells: ['Fireball'], preparedSpells: ['Fireball'],
            activeEffects: [{ id: 'h1', name: 'Heightened Spell', source: 'class_feature', duration: 'rounds', roundsRemaining: 2, modifiers: [] }],
        });
        const res = castSpell(sorc, { spellName: 'Fireball', slotLevel: 3, target: 'Ogre' });
        expect(res.prompt?.advantage).toBe('disadvantage');
        expect((res.character.activeEffects || []).some(e => e.name === 'Heightened Spell')).toBe(false);
    });

    it('accepts spells configured by ID (not only by display name)', () => {
        const mage = hero({ class: 'Mage', level: 3, spellcastingAbility: 'INT', knownSpells: ['magic_missile'] });
        const res = castSpell(mage, { spellName: 'Magic Missile', slotLevel: 1, target: 'Ogre' });
        expect(res.success).toBe(true);
    });
});

// ═══════════════════════ RÉACTIONS AUTOMATIQUES ═══════════════════════
describe('auto reactions on enemy hits', () => {
    function enemyStrikes(character: any, opts: { isMelee: boolean; damage?: string }) {
        let state = startEncounter(character, EMPTY);
        // NF4 — spawn AU CONTACT : depuis « à distance », une attaque de mêlée
        // devient un rapprochement (near → melee) au lieu d'une frappe.
        state = addEnemyToEncounter(state, { name: 'Croc de Fer', hp: 40, ac: 10, range: 'melee' }).state;
        const bandit = state.combatants.find(c => c.name === 'Croc de Fer')!;
        return resolveAttackAction(state, {
            attacker: bandit.id,
            target: 'player',
            attackBonus: 100,
            damageFormula: opts.damage || '10',
            damageType: 'piercing',
            consumeAction: false,
            isMeleeAttack: opts.isMelee,
        } as any, character);
    }

    it('Uncanny Dodge halves the hit and consumes the reaction', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5); // d20 = 11 → touche sans critique
        const rogue = hero({ class: 'Rogue', level: 5, hp: { current: 30, max: 30 } });
        const result = enemyStrikes(rogue, { isMelee: true });
        expect(result.resolution?.reaction).toBe('uncanny_dodge');
        expect(result.resolution?.damage).toBe(5); // 10 → 5
        expect(result.state.actionEconomy!['player']?.reactionUsed).toBe(true);
    });

    it('Deflect Missiles absorbs a ranged hit (projectile caught at 0)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const monk = hero({ class: 'Monk', level: 5, stats: { STR: 10, DEX: 16, CON: 12, INT: 10, WIS: 14, CHA: 8 }, hp: { current: 30, max: 30 } });
        const result = enemyStrikes(monk, { isMelee: false });
        // Réduction = 1d10(6) + DEX 3 + niveau 5 = 14 ≥ 10 → projectile attrapé.
        expect(result.resolution?.reaction).toBe('deflect_missiles');
        expect(result.resolution?.damage).toBe(0);
        expect(result.resolution?.reactionAmount).toBe(14);
    });

    it('Deflect Missiles does NOT trigger on melee hits', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const monk = hero({ class: 'Monk', level: 5, hp: { current: 30, max: 30 } });
        const result = enemyStrikes(monk, { isMelee: true });
        expect(result.resolution?.reaction).toBeUndefined();
    });

    it('Relentless Rage keeps the raging Barbarian at 1 HP', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5); // CON save 11+mod ≥ 10
        const barb = hero({ class: 'Barbarian', level: 11, activeEffects: [rageEffect()], hp: { current: 20, max: 20 } });
        const result = enemyStrikes(barb, { isMelee: true, damage: '999' });
        expect(result.resolution?.relentless).toBe(true);
        expect(result.resolution?.targetHP.current).toBe(1);
    });
});

// ═══════════════════════ RIDERS D'ARCHÉTYPES ═══════════════════════
describe('subclass damage riders', () => {
    function playerStrikes(character: any, enemyOpts: any = {}) {
        let state = startEncounter(character, EMPTY);
        // NF4 — au contact par défaut (near = rapprochement, pas de frappe).
        state = addEnemyToEncounter(state, { name: 'Croc de Fer', hp: 60, ac: 5, range: 'melee', ...enemyOpts }).state;
        const ogre = state.combatants.find(c => c.name === 'Croc de Fer')!;
        return resolveAttackAction(state, {
            attacker: 'player', target: ogre.id, attackBonus: 100,
            damageFormula: '1d8+3', damageType: 'slashing', consumeAction: false,
        } as any, character);
    }

    it('Improved Divine Smite: Paladin 11+ melee hits add a radiant part', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const pal = hero({ class: 'Paladin', level: 11 });
        const result = playerStrikes(pal);
        expect(result.resolution?.damageParts?.some(p => p.damageType === 'radiant')).toBe(true);
    });

    it('Divine Strike: War Domain Cleric 8+ first hit adds 1d8', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const cle = hero({ class: 'Cleric', level: 8, subclass: 'War Domain' });
        const result = playerStrikes(cle);
        expect((result.resolution?.damageParts?.length || 0)).toBeGreaterThanOrEqual(2);
    });

    it('Zealot Divine Fury: radiant rider while raging', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const zealot = hero({ class: 'Barbarian', level: 6, subclass: 'Zealot', activeEffects: [rageEffect()] });
        const result = playerStrikes(zealot);
        expect(result.resolution?.damageParts?.some(p => p.damageType === 'radiant')).toBe(true);
    });

    it('Cavalier: mounted charge on a FAR foe strikes AND adds +1d8', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const cavalier = hero({ class: 'Paladin', level: 5, subclass: 'Cavalier', mount: { name: 'Tempête', kind: 'destrier' } });
        const result = playerStrikes(cavalier, { range: 'far' });
        expect((result as any).advanced).toBeUndefined(); // il FRAPPE, ne se contente pas d'avancer
        expect((result.resolution?.damageParts?.length || 0)).toBeGreaterThanOrEqual(2);
    });

    it('Cavalier: bonded mount gains +level max HP', () => {
        const base = hero({ class: 'Paladin', level: 5, mount: { name: 'Tempête', kind: 'destrier' } });
        const cav = hero({ class: 'Paladin', level: 5, subclass: 'Cavalier', mount: { name: 'Tempête', kind: 'destrier' } });
        const baseMount = startEncounter(base, EMPTY).combatants.find(c => c.id === 'mount')!;
        const cavMount = startEncounter(cav, EMPTY).combatants.find(c => c.id === 'mount')!;
        expect(cavMount.hp.max - baseMount.hp.max).toBe(5);
    });
});

// ═══════════════════════ ARCHÉTYPES : 3 PAR CLASSE ═══════════════════════
describe('subclass catalog', () => {
    it('every class offers at least 3 archetypes', () => {
        for (const [cls, config] of Object.entries(SUBCLASS_DATA)) {
            expect(config.options.length, `${cls} should have ≥3 archetypes`).toBeGreaterThanOrEqual(3);
        }
    });

    it('Paladin includes the Cavalier', () => {
        expect(SUBCLASS_DATA.Paladin.options.some(o => o.name === 'Cavalier')).toBe(true);
    });
});
