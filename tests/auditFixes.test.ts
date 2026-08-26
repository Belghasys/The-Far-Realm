/**
 * auditFixes.test.ts
 * Régressions de la campagne de correction issue de l'audit global (2026-08).
 * Chaque bloc porte l'ID du constat (C*, CB*, OU*, DA*, cb-m*, ou-m*, da-m*…)
 * documenté dans l'artifact « Audit global — DungeonAI Realms ».
 */
import { describe, it, expect } from 'vitest';
import {
    applyConditionToCharacter,
    applyLongRest,
    castSpell,
    deriveRollContext,
    ensureProgressionState,
    getActionCapability,
    resolveAttackAction,
    resolveRollPrompt,
    tickRoundEffects,
} from '../engine/rulesEngine';
import { foldText } from '../engine/skillSystem';
import { DEFAULT_CHAR } from '../data/character';

function hero(overrides: any = {}) {
    return ensureProgressionState({ ...DEFAULT_CHAR, name: 'Test', ...overrides } as any);
}

// ═══════════════ C1 — conditions incapacitantes ═══════════════
describe('C1 — getActionCapability', () => {
    it('blocks actions for paralyzed / stunned / unconscious / incapacitated (FR aliases included)', () => {
        for (const name of ['paralysé', 'Stunned', 'inconscient', 'Incapacitated']) {
            const applied = applyConditionToCharacter(hero(), name);
            expect(applied.found).toBe(true);
            const capability = getActionCapability(applied.character.activeEffects);
            expect(capability.canAct).toBe(false);
            expect(capability.canReact).toBe(false);
            expect(capability.blockedBy).toBeTruthy();
        }
    });

    it('does NOT block actions for poisoned, charmed, restrained or prone', () => {
        for (const name of ['empoisonné', 'Charmed', 'entravé', 'Prone']) {
            const applied = applyConditionToCharacter(hero(), name);
            expect(applied.found).toBe(true);
            expect(getActionCapability(applied.character.activeEffects).canAct).toBe(true);
        }
    });

    it('is permissive on empty or non-condition effects', () => {
        expect(getActionCapability([]).canAct).toBe(true);
        expect(getActionCapability(undefined).canAct).toBe(true);
        expect(getActionCapability([
            { id: 'x', name: 'Rage', source: 'class_feature', duration: 'rounds', roundsRemaining: 10, modifiers: [] } as any,
        ]).canAct).toBe(true);
    });
});

// ═══════════════ CB1 — soin cible-aware ═══════════════
describe('CB1 — target-aware healing', () => {
    function cleric() {
        const c = hero({
            class: 'Cleric',
            level: 3,
            stats: { STR: 10, DEX: 10, CON: 12, INT: 10, WIS: 16, CHA: 10 },
            spellcastingAbility: 'WIS',
            knownSpells: ['Cure Wounds'],
            preparedSpells: ['Cure Wounds'],
        });
        c.hp = { current: 5, max: 20 };
        return c;
    }

    it('healing an ALLY does not raise the caster HP (healingTargetsSelf=false)', () => {
        const result = castSpell(cleric(), { spellName: 'Cure Wounds', slotLevel: 1, target: 'Loup fidèle', targetId: 'ally-wolf' });
        expect(result.success).toBe(true);
        expect(result.healing || 0).toBeGreaterThan(0);
        expect(result.healingTargetsSelf).toBe(false);
        expect(result.character.hp.current).toBe(5);
    });

    it('healing with no target heals the caster (self-cast)', () => {
        const result = castSpell(cleric(), { spellName: 'Cure Wounds', slotLevel: 1 });
        expect(result.success).toBe(true);
        expect(result.healingTargetsSelf).toBe(true);
        expect(result.character.hp.current).toBeGreaterThan(5);
    });

    it('targetId "player" heals the caster', () => {
        const result = castSpell(cleric(), { spellName: 'Cure Wounds', slotLevel: 1, target: 'Testeur', targetId: 'player' });
        expect(result.success).toBe(true);
        expect(result.healingTargetsSelf).toBe(true);
        expect(result.character.hp.current).toBeGreaterThan(5);
    });
});

// ═══════════════ CB6 — conditions avec durée réelle ═══════════════
describe('CB6 — condition durations and removal', () => {
    it('conditions are no longer permanent: rounds-based and tickable', () => {
        const applied = applyConditionToCharacter(hero(), 'poisoned');
        const effect = (applied.character.activeEffects || []).find(e => e.name === 'Poisoned')!;
        expect(effect.duration).toBe('rounds');
        expect(effect.roundsRemaining).toBeGreaterThan(0);
        // Un tick par round : la condition finit par expirer d'elle-même.
        let effects = applied.character.activeEffects || [];
        for (let i = 0; i < 12; i++) effects = tickRoundEffects(effects).activeEffects;
        expect(effects.some(e => e.name === 'Poisoned')).toBe(false);
    });

    it('a long rest cures conditions (even legacy permanent ones)', () => {
        const c = applyConditionToCharacter(hero(), 'paralysé').character;
        // Condition legacy « permanent » (posée avant le correctif) : purgée aussi.
        c.activeEffects = [
            ...(c.activeEffects || []),
            { id: 'legacy', name: 'Poisoned', source: 'condition', duration: 'permanent', modifiers: [] } as any,
        ];
        const rested = applyLongRest(c);
        expect((rested.activeEffects || []).some(e => e.source === 'condition')).toBe(false);
    });
});

// ═══════════════ CB7 — conditions sur les jets demandés par le MJ ═══════════════
describe('CB7 — deriveRollContext on request_roll paths', () => {
    it('restrained gives disadvantage on DEX saves (explicit saveAbility hint)', () => {
        const c = applyConditionToCharacter(hero(), 'entravé').character;
        const context = deriveRollContext(
            { type: 'SAVE', name: 'Sauvegarde de Dextérité', formula: '1d20+2', dc: 14, advantage: 'normal', dmBonus: 0, requestedAt: 0 } as any,
            { actorEffects: c.activeEffects, saveAbility: 'DEX' },
        );
        expect(context.prompt.advantage).toBe('disadvantage');
    });

    it('paralyzed auto-fails STR/DEX saves and resolveRollPrompt honors it', () => {
        const c = applyConditionToCharacter(hero(), 'paralysé').character;
        const context = deriveRollContext(
            { type: 'SAVE', name: 'Sauvegarde de Force', formula: '1d20+5', dc: 5, advantage: 'normal', dmBonus: 0, requestedAt: 0 } as any,
            { actorEffects: c.activeEffects, saveAbility: 'STR' },
        );
        expect(context.prompt.autoFail).toBe(true);
        const outcome = resolveRollPrompt(context.prompt);
        expect(outcome.success).toBe(false);
    });

    it('poisoned gives disadvantage on ability checks', () => {
        const c = applyConditionToCharacter(hero(), 'empoisonné').character;
        const context = deriveRollContext(
            { type: 'CHECK', name: 'Perception', formula: '1d20+3', dc: 12, advantage: 'normal', dmBonus: 0, requestedAt: 0 } as any,
            { actorEffects: c.activeEffects },
        );
        expect(context.prompt.advantage).toBe('disadvantage');
    });
});

// ═══════════════ DA1/DA2/DA3 — bestiaire ═══════════════
describe('DA1-DA3 — bestiary data integrity', () => {
    it('DA1: fractional CRs are consistent with the official XP table', async () => {
        const { CSV_MONSTERS } = await import('../data/monsterData');
        const XP_TO_CR: Record<number, number> = {
            0: 0, 10: 0, 25: 0.125, 50: 0.25, 100: 0.5, 200: 1, 450: 2, 700: 3,
            1100: 4, 1800: 5, 2300: 6, 2900: 7, 3900: 8, 5000: 9, 5900: 10,
            7200: 11, 8400: 12, 10000: 13, 11500: 14, 13000: 15, 15000: 16,
            18000: 17, 20000: 18, 22000: 19, 25000: 20, 33000: 21, 41000: 22,
            50000: 23, 62000: 24, 75000: 25, 90000: 26, 105000: 27, 120000: 28,
            135000: 29, 155000: 30,
        };
        const mismatches = Object.values(CSV_MONSTERS)
            .filter((m: any) => XP_TO_CR[m.xp] !== undefined && m.cr !== XP_TO_CR[m.xp])
            .map((m: any) => `${m.id} cr=${m.cr} xp=${m.xp}`);
        expect(mismatches).toEqual([]);
        // Les cas cités par l'audit :
        expect((CSV_MONSTERS as any).goblin.cr).toBe(0.25);
        expect((CSV_MONSTERS as any).bandit.cr).toBe(0.125);
        expect((CSV_MONSTERS as any).thug.cr).toBe(0.5);
        expect((CSV_MONSTERS as any).wolf.cr).toBe(0.25);
    });

    it('DA2: hit dice formulas reproduce the listed average HP', async () => {
        const { CSV_MONSTERS } = await import('../data/monsterData');
        let exact = 0, total = 0;
        for (const m of Object.values(CSV_MONSTERS) as any[]) {
            total++;
            const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(m.hp.dice || '');
            if (!match) continue;
            const [, n, die, mod] = match;
            const mean = Math.floor(Number(n) * (Number(die) + 1) / 2 + (Number(mod) || 0));
            if (mean === m.hp.base) exact++;
        }
        // 400/401 exacts (reef_manta_ray est homebrew, moyenne la plus proche).
        expect(exact).toBeGreaterThanOrEqual(total - 1);
        expect((CSV_MONSTERS as any).wolf.hp.dice).toBe('2d8+2');
        expect((CSV_MONSTERS as any).aboleth.hp.dice).toBe('18d10+36');
        expect((CSV_MONSTERS as any).adult_red_dragon.hp.dice).toBe('19d12+133');
    });

    it('DA3: French dictionary entries all resolve (ours, cheval…)', async () => {
        const { getCreature } = await import('../data/bestiary');
        for (const frName of ['Ours', 'Cheval', 'Loup', 'Gobelin', 'Destrier']) {
            expect(getCreature(frName), `getCreature(${frName})`).not.toBeNull();
        }
    });
});

// ═══════════════ DA4 — alias FR des sorts ═══════════════
describe('DA4 — French spell aliases', () => {
    it('every SRD spell has aliases and French lookups resolve', async () => {
        const { SRD51_SPELLS } = await import('../data/srd51/spells');
        const missing = SRD51_SPELLS.filter(s => !s.aliases || !s.aliases.length).map(s => s.name);
        expect(missing).toEqual([]);
    });

    it('lookupSpell finds spells by French name (accents included)', async () => {
        const { lookupSpell } = await import('../engine/codexService');
        expect(lookupSpell('Boule de feu')?.name).toBe('Fireball');
        expect(lookupSpell('boule de feu')?.name).toBe('Fireball');
        expect(lookupSpell('Soins')?.name).toBe('Cure Wounds');
        expect(lookupSpell('Projectile magique')?.name).toBe('Magic Missile');
        expect(lookupSpell('Immobilisation de personne')?.name).toBe('Hold Person');
        expect(lookupSpell('Marque du chasseur')?.name).toBe("Hunter's Mark");
        expect(lookupSpell('Bénédiction')?.name).toBe('Bless');
        expect(lookupSpell('Ténèbres')?.name).toBe('Darkness');
    });

    it('cast_spell path works with a French spell name', () => {
        const c = hero({
            class: 'Mage', level: 5,
            stats: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 10, CHA: 10 },
            spellcastingAbility: 'INT',
            knownSpells: ['Fireball'], preparedSpells: ['Fireball'],
        });
        const result = castSpell(c, { spellName: 'Boule de feu', slotLevel: 3, target: 'Gobelin' });
        expect(result.success).toBe(true);
        expect(result.spell?.name).toBe('Fireball');
    });
});

// ═══════════════ DA5 — Robustesse naine ═══════════════
describe('DA5 — Hill Dwarf Dwarven Toughness', () => {
    it('grants +1 max HP per level for hill dwarves only', async () => {
        const { racialHPBonusPerLevel } = await import('../types');
        expect(racialHPBonusPerLevel({ race: 'Nain des collines' } as any)).toBe(1);
        expect(racialHPBonusPerLevel({ race: 'Hill Dwarf' } as any)).toBe(1);
        expect(racialHPBonusPerLevel({ race: 'Nain des montagnes' } as any)).toBe(0);
        expect(racialHPBonusPerLevel({ race: 'Human' } as any)).toBe(0);
    });
});

// ═══════════════ NF2 — avantages d'équipement ═══════════════
describe('NF2 — gear-granted advantages', () => {
    it('detects structured advantageOn and French/English item text', async () => {
        const { getGearAdvantages, gearAdvantageFor } = await import('../engine/skillSystem');
        const c: any = {
            inventory: [
                { id: '1', name: 'Bottes elfiques', type: 'armor', equipped: true, quantity: 1, weight: 1, slot: 'feet',
                  effect: "Le porteur a l'avantage aux tests de Discrétion." },
                { id: '2', name: 'Lame du duelliste', type: 'weapon', equipped: true, quantity: 1, weight: 2, slot: 'mainHand',
                  advantageOn: ['attack'] },
                { id: '3', name: 'Cape de perception', type: 'armor', equipped: false, quantity: 1, weight: 1, slot: 'back',
                  effect: 'Advantage on Perception checks.' },
            ],
        };
        const advantages = getGearAdvantages(c);
        expect(advantages.some(a => a.tag === 'Stealth' && a.source === 'Bottes elfiques')).toBe(true);
        expect(advantages.some(a => a.tag === 'attack')).toBe(true);
        // Objet NON équipé → aucun avantage.
        expect(advantages.some(a => a.source === 'Cape de perception')).toBe(false);
        expect(gearAdvantageFor(c, 'Discrétion')?.source).toBe('Bottes elfiques');
        expect(gearAdvantageFor(c, 'stealth')?.source).toBe('Bottes elfiques');
        expect(gearAdvantageFor(c, 'Athletics')).toBeNull();
    });
});

// ═══════════════ NF4 — bandes de distance ═══════════════
describe('NF4 — combat range bands', () => {
    const SWORD = { name: 'Longsword', damage: '1d8', damageType: 'slashing', abilityMod: 'STR', attackBonus: 0, magicBonus: 0 };
    const SHORTBOW = { name: 'Arc court', damage: '1d6', damageType: 'piercing', abilityMod: 'DEX', attackBonus: 0, magicBonus: 0, range: '24/97', properties: ['ammunition'] };
    const LONGBOW = { name: 'Arc long', damage: '1d8', damageType: 'piercing', abilityMod: 'DEX', attackBonus: 0, magicBonus: 0, range: '45/180', properties: ['ammunition'] };

    function duel(range: 'melee' | 'near' | 'far', charOverrides: any = {}) {
        const character = hero({
            class: 'Fighter', level: 5,
            stats: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
            weapon: SWORD,
            ...charOverrides,
        });
        const state: any = {
            isActive: true,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 30, max: 30 }, ac: 16, initiative: 15, isPlayer: true, side: 'player' },
                { id: 'gob', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 10, initiative: 10, isPlayer: false, side: 'enemy', range },
            ],
            currentTurn: 'player', round: 1, turnIndex: 0, actionEconomy: {}, logs: [],
        };
        return { character, state };
    }

    it('melee vs NEAR: the attack becomes an engage (near → melee), no strike', () => {
        const { character, state } = duel('near');
        const result = resolveAttackAction(state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(result.success).toBe(true);
        expect(result.advanced).toEqual({ name: 'Goblin', from: 'near', to: 'melee' });
        expect(result.resolution).toBeUndefined();
        // Deuxième action : maintenant au contact, la frappe part.
        const strike = resolveAttackAction(result.state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(strike.resolution).toBeDefined();
    });

    it('melee vs FAR: two actions are needed (far → near → melee)', () => {
        const { character, state } = duel('far');
        const step1 = resolveAttackAction(state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(step1.advanced).toEqual({ name: 'Goblin', from: 'far', to: 'near' });
        const step2 = resolveAttackAction(step1.state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(step2.advanced).toEqual({ name: 'Goblin', from: 'near', to: 'melee' });
    });

    it('a RAGING Barbarian charges from NEAR and strikes in one action', () => {
        const { character, state } = duel('near', {
            class: 'Barbarian',
            activeEffects: [{ id: 'r', name: 'Rage', source: 'class_feature', duration: 'rounds', roundsRemaining: 10, modifiers: [] }],
        });
        const result = resolveAttackAction(state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(result.advanced).toBeUndefined();
        expect(result.resolution).toBeDefined();
    });

    it('a MOUNTED hero charges from FAR and strikes in one action', () => {
        const { character, state } = duel('far', { mount: { name: 'Tempête', kind: 'destrier', speed: 60 } });
        const result = resolveAttackAction(state, { attacker: 'player', target: 'gob', consumeAction: false }, character);
        expect(result.advanced).toBeUndefined();
        expect(result.resolution).toBeDefined();
    });

    it('short-range weapons cannot shoot FAR targets (attack becomes an advance); longbow can', () => {
        const shortDuel = duel('far', { weapon: SHORTBOW });
        const short = resolveAttackAction(shortDuel.state, { attacker: 'player', target: 'gob', consumeAction: false }, shortDuel.character);
        expect(short.advanced).toEqual({ name: 'Goblin', from: 'far', to: 'near' });

        const longDuel = duel('far', { weapon: LONGBOW });
        const long = resolveAttackAction(longDuel.state, { attacker: 'player', target: 'gob', consumeAction: false }, longDuel.character);
        expect(long.advanced).toBeUndefined();
        expect(long.resolution).toBeDefined();
    });

    it('an enemy at NEAR spends its turn closing in (no free strike)', () => {
        const { character, state } = duel('near');
        const result = resolveAttackAction(state, { attacker: 'gob', target: 'player', damageFormula: '1d6+2', attackBonus: 4, consumeAction: false }, character);
        expect(result.advanced).toEqual({ name: 'Goblin', from: 'near', to: 'melee' });
    });
});

// ═══════════════ NF3 — marchands ═══════════════
describe('NF3 — merchant stocks', () => {
    it('normalizes merchant types from free French/English words', async () => {
        const { normalizeMerchantType } = await import('../data/merchants');
        expect(normalizeMerchantType('Forgeron')).toBe('blacksmith');
        expect(normalizeMerchantType('weaponsmith')).toBe('blacksmith');
        expect(normalizeMerchantType('Apothicaire du quartier')).toBe('apothecary');
        expect(normalizeMerchantType('herboriste')).toBe('apothecary');
        expect(normalizeMerchantType('Enchanteur')).toBe('enchanter');
        expect(normalizeMerchantType('magasin')).toBe('general');
    });

    it('blacksmith tiers: masterwork (+1 damage rider) from level 5, magic +1 gear from level 10', async () => {
        const { buildMerchantStock } = await import('../data/merchants');
        const t1 = buildMerchantStock('blacksmith', 3, 'fr');
        expect(t1.length).toBeGreaterThan(10);
        expect(t1.some(s => /de maître/i.test(s.item.name))).toBe(false);

        const t2 = buildMerchantStock('blacksmith', 6, 'fr');
        const masterwork = t2.find(s => /de maître/i.test(s.item.name));
        expect(masterwork).toBeDefined();
        // Le rider « +1 <type> damage » est parsable par le moteur.
        expect(masterwork!.item.effect).toMatch(/\+1 (slashing|piercing|bludgeoning) damage/);

        const t3 = buildMerchantStock('blacksmith', 12, 'en');
        expect(t3.some(s => /\+1/.test(s.item.name))).toBe(true);
    });

    it('apothecary scales potions by tier and every stock item has a positive price', async () => {
        const { buildMerchantStock } = await import('../data/merchants');
        const t1 = buildMerchantStock('apothecary', 2, 'fr');
        expect(t1.some(s => /soins/i.test(s.item.name))).toBe(true);
        expect(t1.some(s => /supérieure|majeure/i.test(s.item.name))).toBe(false);
        const t3 = buildMerchantStock('apothecary', 12, 'fr');
        expect(t3.some(s => /majeure/i.test(s.item.name))).toBe(true);
        for (const type of ['blacksmith', 'apothecary', 'general', 'enchanter'] as const) {
            for (const entry of buildMerchantStock(type, 8, 'en')) {
                expect(entry.price).toBeGreaterThan(0);
                expect(entry.item.name.length).toBeGreaterThan(0);
            }
        }
    });

    it('sellPriceFor returns 50% of catalog value and never zero', async () => {
        const { sellPriceFor } = await import('../data/merchants');
        expect(sellPriceFor({ id: 'x', name: 'Longsword', type: 'weapon', weight: 3, quantity: 1, equipped: false, slot: 'none' } as any)).toBeGreaterThan(0);
        expect(sellPriceFor({ id: 'y', name: 'Objet inconnu', type: 'misc', weight: 1, quantity: 1, equipped: false, slot: 'none' } as any)).toBeGreaterThan(0);
    });
});

// ═══════════════ PL11/PL14 — objets défensifs et talismans portés ═══════════════
describe('PL11/PL14 — defensive gear and carried trinkets', () => {
    it('PL11: a cloak granting attackers disadvantage is detected (tag defense)', async () => {
        const { gearAdvantageFor } = await import('../engine/skillSystem');
        const c: any = {
            inventory: [{
                id: 'c1', name: 'Cape de déplacement', type: 'armor', equipped: true, quantity: 1, weight: 1, slot: 'back',
                effect: 'Les attaques contre vous ont un désavantage.',
            }],
        };
        expect(gearAdvantageFor(c, 'defense')?.source).toBe('Cape de déplacement');
    });

    it('PL14: a carried (non-equippable) lucky stone grants its advantage without being equipped', async () => {
        const { gearAdvantageFor } = await import('../engine/skillSystem');
        const c: any = {
            inventory: [{
                id: 's1', name: 'Pierre de chance', type: 'misc', equipped: false, quantity: 1, weight: 0.1, slot: 'none',
                effect: 'Avantage aux tests de Perception tant que vous la portez.',
            }],
        };
        expect(gearAdvantageFor(c, 'Perception')?.source).toBe('Pierre de chance');
        // Une ARME non équipée, elle, ne donne rien.
        const weapon: any = { inventory: [{ id: 'w', name: 'Lame de précision', type: 'weapon', equipped: false, quantity: 1, weight: 2, slot: 'none', advantageOn: ['attack'] }] };
        expect(gearAdvantageFor(weapon, 'attack')).toBeNull();
    });
});

// ── DC1-bis — résolution du chapitre par set_campaign_position ──────────────
// Bug prouvé le 2026-08-20 : les ids de chapitre sont des NOMBRES NUS et la
// clause `wanted.includes(c.id)` faisait matcher « 12 » sur le chapitre « 1 »
// (findIndex rend le PREMIER match). Les chapitres 10+ étaient inatteignables,
// et comme le handler réécrit les statuts et fige un digest, la campagne
// rembobinait au chapitre 1. Ce test verrouille l'ordre de priorité.
describe('DC1-bis — résolution de chapitre (set_campaign_position)', () => {
    // Réplique exacte de la logique du handler (hooks/useToolProcessor.ts).
    const resolveChapter = (chapters: { id: string; title: string }[], arg: string): number => {
        const wanted = foldText(String(arg));
        const wantedNum = Number(String(arg).replace(/[^\d]/g, ''));
        const exact = chapters.findIndex(c => foldText(c.id) === wanted);
        if (exact >= 0) return exact;
        const numericIndex = Number.isFinite(wantedNum) && wantedNum >= 1 && wantedNum <= chapters.length
            ? wantedNum - 1 : -1;
        if (!/[a-z]/.test(wanted)) return numericIndex;
        if (wanted.length >= 4) {
            const byTitle = chapters.findIndex(c => foldText(c.title || '').includes(wanted));
            if (byTitle >= 0) return byTitle;
            const byId = chapters.findIndex(c => foldText(c.id).length >= 4 && wanted.includes(foldText(c.id)));
            if (byId >= 0) return byId;
        }
        return numericIndex;
    };

    const twelve = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), title: `Chapitre ${i + 1}` }));
    const twenty = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1), title: `Chapitre ${i + 1}` }));

    it('atteint TOUS les chapitres par id numérique (12 et 20 chapitres)', () => {
        for (let n = 1; n <= 12; n++) expect(resolveChapter(twelve, String(n))).toBe(n - 1);
        for (let n = 1; n <= 20; n++) expect(resolveChapter(twenty, String(n))).toBe(n - 1);
    });

    it('ne rembobine plus au chapitre 1 pour les chapitres à deux chiffres', () => {
        expect(resolveChapter(twelve, '10')).not.toBe(0);
        expect(resolveChapter(twelve, '11')).not.toBe(0);
        expect(resolveChapter(twelve, '12')).not.toBe(0);
    });

    it('accepte « chapitre 13 » et « ch13 »', () => {
        expect(resolveChapter(twenty, 'chapitre 13')).toBe(12);
        expect(resolveChapter(twenty, 'ch13')).toBe(12);
    });

    it('préfère le TITRE au chiffre qu’il contient', () => {
        const named = [
            { id: '1', title: 'La Mauvaise Porte' },
            { id: '2', title: 'La Ville dans le Corps' },
            { id: '3', title: 'Les 7 Portes' },
        ];
        expect(resolveChapter(named, 'Les 7 Portes')).toBe(2);
        expect(resolveChapter(named, 'la ville dans le corps')).toBe(1);
    });

    it('rejette proprement un chapitre inconnu', () => {
        expect(resolveChapter(twelve, 'le chapitre du fromage')).toBe(-1);
        expect(resolveChapter(twelve, '99')).toBe(-1);
    });
});
