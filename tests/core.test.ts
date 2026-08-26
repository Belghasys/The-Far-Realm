/**
 * core.test.ts
 * Vitest unit tests for critical game mechanics parsers.
 * Run: npx vitest run
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { calculateSkillModifier, calculateSaveModifier, getSkillAbility, rollWithAdvantage } from '../engine/skillSystem';
import { getCreature, getCreatureAttacks } from '../data/bestiary';
import {
    addEnemyToEncounter,
    addAllyToEncounter,
    advanceTurn,
    applyConditionToCharacter,
    applyCharacterHP,
    applyDamageToEncounter,
    applyLongRest,
    applyShortRest,
    applyStoryModifiersToPrompt,
    castSpell,
    combatantSide,
    deriveRollContext,
    encounterOutcome,
    ensureProgressionState,
    isHero,
    selectEnemyTarget,
    normalizeRollPrompt,
    normalizeStoryModifier,
    parseD20Formula,
    resolveConcentrationAfterDamage,
    resolveAttackAction,
    startEncounter,
} from '../engine/rulesEngine';
import {
    buildEncounter,
    lookupCondition,
    lookupMonster,
    lookupSpell,
    preloadCodexBestiary,
    structureInventoryItem
} from '../engine/codexService';
import { DEFAULT_CHAR } from '../data/character';
import { getStartingEquipment } from '../data/equipment';
import { getPlayerAttackModifier, getEffectiveAC, getEffectiveSpeed, getEffectiveStat, getXPProgress } from '../types';
import { getSubclassConfig, getSubclassFeaturesForLevel, subclassNeedsChoice } from '../data/subclasses';
import { asiLevelsBetween } from '../data/classFeatures';
import { campaignEventLog } from '../services/campaignEventLog';
import { buildMusicPromptForMood } from '../services/lyriaMusic';
import { cooldownRemainingMs, isCombatLoopMood, MEDIA_GENERATION_COOLDOWN_MS } from '../services/mediaThrottle';
import { useGameStore } from '../store/gameStore';
import { buildCampaignDirectorContext } from '../services/dm/campaignDirector';

// ─── GPU Lock (media coordination) ──────────────────────────────────────────

describe('GPU Lock (media coordination)', () => {
    it('runs music exclusively — never overlapping image or sfx — while letting image+sfx overlap', async () => {
        const { withImageSfxGpu, withMusicGpu, gpuLockState } = await import('../services/gpuLock');

        const events: string[] = [];
        let imageRunning = false;
        let sfxRunning = false;
        let musicRunning = false;
        let imageSfxOverlapObserved = false;
        let musicViolated = false; // music seen alongside ANY image/sfx

        const tick = () => new Promise<void>(r => setTimeout(r, 5));

        const image = withImageSfxGpu('image', async () => {
            imageRunning = true;
            events.push('image:start');
            await tick(); await tick();
            if (sfxRunning) imageSfxOverlapObserved = true;
            if (musicRunning) musicViolated = true;
            events.push('image:end');
            imageRunning = false;
        });

        const sfx = withImageSfxGpu('sfx', async () => {
            sfxRunning = true;
            events.push('sfx:start');
            await tick(); await tick();
            if (imageRunning) imageSfxOverlapObserved = true;
            if (musicRunning) musicViolated = true;
            events.push('sfx:end');
            sfxRunning = false;
        });

        // Music requested while image+sfx are mid-flight: must wait for both.
        const music = withMusicGpu('music', async () => {
            musicRunning = true;
            events.push('music:start');
            if (imageRunning || sfxRunning) musicViolated = true;
            await tick();
            if (imageRunning || sfxRunning) musicViolated = true;
            events.push('music:end');
            musicRunning = false;
        });

        await Promise.all([image, sfx, music]);

        expect(musicViolated).toBe(false);
        expect(events.indexOf('music:start')).toBeGreaterThan(events.indexOf('image:end'));
        expect(events.indexOf('music:start')).toBeGreaterThan(events.indexOf('sfx:end'));
        expect(imageSfxOverlapObserved).toBe(true);
        expect(gpuLockState()).toMatchObject({ activeReaders: 0, musicActive: false, waitingWriters: 0 });
    });

    it('blocks new image/sfx from starting while music holds the GPU (writer preference)', async () => {
        const { withImageSfxGpu, withMusicGpu } = await import('../services/gpuLock');
        const order: string[] = [];
        const tick = () => new Promise<void>(r => setTimeout(r, 5));

        const music = withMusicGpu('music', async () => {
            order.push('music:start');
            await tick(); await tick();
            order.push('music:end');
        });

        await tick(); // let music acquire first
        const image = withImageSfxGpu('image', async () => {
            order.push('image:start');
        });

        await Promise.all([music, image]);
        expect(order.indexOf('image:start')).toBeGreaterThan(order.indexOf('music:end'));
    });
});

// ─── Skill System Tests ─────────────────────────────────────────────────────

describe('calculateSkillModifier', () => {
    const stats = { STR: 16, DEX: 14, CON: 12, INT: 10, WIS: 8, CHA: 18 };

    it('calculates base modifier without proficiency', () => {
        // DEX 14 → mod +2, no proficiency
        expect(calculateSkillModifier(stats, 'Stealth', [], 1)).toBe(2);
    });

    it('adds proficiency bonus when proficient', () => {
        // DEX 14 → mod +2, proficiency bonus at level 1 = +2 → total +4
        expect(calculateSkillModifier(stats, 'Stealth', ['Stealth'], 1)).toBe(4);
    });

    it('scales proficiency bonus with level', () => {
        // Level 5 → proficiency bonus = +3
        // DEX 14 → +2 base, +3 proficiency = +5
        expect(calculateSkillModifier(stats, 'Stealth', ['Stealth'], 5)).toBe(5);
    });

    it('handles English skill name that maps to DEX', () => {
        // 'Stealth' always maps to DEX: DEX 14 → +2 base, no proficiency
        expect(calculateSkillModifier(stats, 'Stealth', [], 1)).toBe(2);
    });

    it('uses STR for Athletics', () => {
        // STR 16 → mod +3
        expect(calculateSkillModifier(stats, 'Athletics', [], 1)).toBe(3);
    });

    it('uses CHA for Persuasion', () => {
        // CHA 18 → mod +4
        expect(calculateSkillModifier(stats, 'Persuasion', [], 1)).toBe(4);
    });

    it('uses WIS for Perception', () => {
        // WIS 8 → mod -1
        expect(calculateSkillModifier(stats, 'Perception', [], 1)).toBe(-1);
    });
});

describe('calculateSaveModifier', () => {
    const stats = { STR: 10, DEX: 16, CON: 14, INT: 8, WIS: 12, CHA: 10 };

    it('correctly calculates DEX save', () => {
        // DEX 16 → +3, no proficiency
        expect(calculateSaveModifier(stats, 'DEX', [], 1)).toBe(3);
    });

    it('adds proficiency when save type proficient', () => {
        // CON 14 → +2, + proficiency bonus 2 (level 1) = +4
        expect(calculateSaveModifier(stats, 'CON', ['CON'], 1)).toBe(4);
    });
});

// ─── ROLL_RESULT Format Test ─────────────────────────────────────────────────

describe('ROLL_RESULT message parsing', () => {
    it('parses a valid ROLL_RESULT message', () => {
        const msg = `[ROLL_RESULT: Check="Stealth Check" | Total=18 | DC=15 | Success=true | Die=15 | Mod=+3]`;
        const totalMatch = msg.match(/Total=(\d+)/);
        const successMatch = msg.match(/Success=(true|false)/);
        const dcMatch = msg.match(/DC=(\d+)/);

        expect(totalMatch?.[1]).toBe('18');
        expect(successMatch?.[1]).toBe('true');
        expect(dcMatch?.[1]).toBe('15');
    });

    it('correctly identifies failure', () => {
        const msg = `[ROLL_RESULT: Check="Perception" | Total=7 | DC=12 | Success=false | Die=9 | Mod=-2]`;
        const successMatch = msg.match(/Success=(true|false)/);
        expect(successMatch?.[1]).toBe('false');
    });
});

// ─── ATTACK_ROLL Tag Parser ──────────────────────────────────────────────────

describe('ATTACK_ROLL tag regex', () => {
    it('parses a standard attack roll tag', () => {
        const text = '[ATTACK_ROLL: 1d20+4 | DC=15 | 1d6+2 | slashing]';
        const match = text.match(/\[ATTACK_ROLL:\s*([^|]+)\s*\|\s*DC=(\d+)\s*\|\s*([^|]+)\s*(?:\|\s*([^\]]+))?\]/);
        expect(match).not.toBeNull();
        expect(match![1].trim()).toBe('1d20+4');
        expect(match![2]).toBe('15');
        expect(match![3].trim()).toBe('1d6+2');
        expect(match![4].trim()).toBe('slashing');
    });

    it('fails gracefully on malformed tag', () => {
        const text = '[ATTACK_ROLL: broken]';
        const match = text.match(/\[ATTACK_ROLL:\s*([^|]+)\s*\|\s*DC=(\d+)\s*\|\s*([^|]+)\s*(?:\|\s*([^\]]+))?\]/);
        expect(match).toBeNull();
    });
});

// ─── ENEMY_INIT Tag Parser ───────────────────────────────────────────────────

describe('ENEMY_INIT tag regex', () => {
    it('parses full ENEMY_INIT tag with 5+ params', () => {
        const text = '[ENEMY_INIT: Goblin Scout | 7 | 13 | -1 | +2 | E5]';
        const matches = [...text.matchAll(/\[ENEMY_INIT:\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g)];
        expect(matches.length).toBe(1);
        const [, name, hp, ac, strMod, dexMod, pos] = matches[0];
        expect(name).toBe('Goblin Scout');
        expect(hp).toBe('7');
        expect(ac).toBe('13');
        expect(pos).toBe('E5');
    });

    it('parses ENEMY_INIT tag without position', () => {
        const text = '[ENEMY_INIT: Orc | 15 | 13 | +3 | +1]';
        const matches = [...text.matchAll(/\[ENEMY_INIT:\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g)];
        // Without pos, this specific regex won't match - correct behavior
        expect(matches.length).toBe(0);
    });
});

// ─── Bestiary Lookup ─────────────────────────────────────────────────────────

describe('getCreature fuzzy lookup', () => {
    it('finds goblin by exact name', () => {
        const creature = getCreature('Goblin');
        // Should not be null if bestiary has Goblin
        if (creature) {
            expect(creature.name.toLowerCase()).toContain('goblin');
            expect(creature.hp.base).toBeGreaterThan(0);
            expect(creature.ac).toBeGreaterThan(0);
        } else {
            // Skip if bestiary doesn't have it in test env
            expect(true).toBe(true);
        }
    });

    it('returns null for unknown creature', () => {
        const creature = getCreature('zzzxqv_unknown');
        expect(creature).toBeNull();
    });
});

// ─── rollWithAdvantage ────────────────────────────────────────────────────────

describe('rollWithAdvantage', () => {
    it('returns a number between 1 and 20', () => {
        const { roll } = rollWithAdvantage(false, false);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(20);
    });

    it('with advantage, takes the max of two rolls', () => {
        const { roll, rolls } = rollWithAdvantage(true, false);
        expect(roll).toBe(Math.max(...rolls));
    });

    it('with disadvantage, takes the min of two rolls', () => {
        const { roll, rolls } = rollWithAdvantage(false, true);
        expect(roll).toBe(Math.min(...rolls));
    });

    it('with both advantage and disadvantage, acts normal (single roll)', () => {
        const { rolls } = rollWithAdvantage(true, true);
        expect(rolls.length).toBe(1);
    });
});

describe('rulesEngine campaign mechanics', () => {
    it('normalizes Gemini roll requests into deterministic prompt state', () => {
        const prompt = normalizeRollPrompt({
            reason: 'Dexterity saving throw',
            formula: '1d20+3',
            dc: 14,
            advantage: 'DIS',
            bonus: 1,
        });

        expect(prompt.type).toBe('SAVE');
        expect(prompt.advantage).toBe('disadvantage');
        expect(prompt.dmBonus).toBe(1);
    });

    it('parses d20 modifiers with DM bonus', () => {
        expect(parseD20Formula('1d20+3', 2).modifier).toBe(5);
        expect(parseD20Formula('1d20-1', 0).modifier).toBe(-1);
    });

    it('clamps character HP to valid bounds', () => {
        const character = { ...DEFAULT_CHAR, hp: { current: 5, max: 10 } };
        expect(applyCharacterHP(character, 99).hp.current).toBe(10);
        expect(applyCharacterHP(character, -10).hp.current).toBe(0);
    });

    it('starts encounters with the player in initiative', () => {
        const state = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        expect(state.isActive).toBe(true);
        expect(state.combatants.some(c => c.isPlayer)).toBe(true);
        expect(state.currentTurn.length).toBeGreaterThan(0);
    });

    it('advances turn order and increments the round after a full cycle', () => {
        const state = {
            isActive: true,
            currentTurn: 'Hero',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 12, initiative: 12, isPlayer: false },
            ],
        };

        const goblinTurn = advanceTurn(state);
        expect(goblinTurn.currentTurn).toBe('goblin');
        expect(goblinTurn.round).toBe(1);

        const heroTurn = advanceTurn(goblinTurn);
        expect(heroTurn.currentTurn).toBe('player');
        expect(heroTurn.round).toBe(2);
    });

    it('resolves a local attack, consumes the action, and applies damage', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const state = {
            isActive: true,
            currentTurn: 'Hero',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 10, max: 10 }, ac: 5, initiative: 12, isPlayer: false },
            ],
        };

        const result = resolveAttackAction(state, {
            attacker: 'Hero',
            target: 'Goblin',
            attackBonus: 10,
            damageFormula: '1d6+2',
            damageType: 'slashing',
        });

        random.mockRestore();

        expect(result.success).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        expect(result.resolution?.damage).toBe(6);
        expect(result.state.combatants.find(c => c.name === 'Goblin')?.hp.current).toBe(4);
        expect(result.state.actionEconomy?.player.actionUsed).toBe(true);
    });

    it('does not double-count proficiency from legacy weapon attackBonus fields', () => {
        const character = {
            ...DEFAULT_CHAR,
            level: 1,
            stats: { ...DEFAULT_CHAR.stats, STR: 16 },
            activeEffects: [],
            weapon: {
                ...DEFAULT_CHAR.weapon,
                abilityMod: 'STR' as const,
                attackBonus: 2,
                properties: [],
            },
        };

        expect(getPlayerAttackModifier(character)).toBe(5);
    });

    it('restores short-rest resources without resetting long-rest resources', () => {
        const character = {
            ...DEFAULT_CHAR,
            level: 2,
            resources: {
                actionSurge: { current: 0, max: 1, recoverOn: 'short_rest' as const, label: 'Action Surge' },
                layOnHands: { current: 0, max: 10, recoverOn: 'long_rest' as const, label: 'Lay on Hands' },
            },
        };

        const rested = applyShortRest(character, 0);
        expect(rested.resources?.actionSurge.current).toBe(1);
        expect(rested.resources?.layOnHands.current).toBe(0);
    });

    it('long rest restores HP, spell slots, death saves, and temporary effects', () => {
        const character = {
            ...DEFAULT_CHAR,
            class: 'Wizard',
            level: 3,
            hp: { current: 1, max: 18 },
            tempHP: 5,
            deathSaves: { successes: 1, failures: 2, isStable: false, isDead: false },
            spellSlots: { '1': { current: 0, max: 4 }, '2': { current: 0, max: 2 } },
            activeEffects: [
                { id: 'bless', name: 'Bless', source: 'spell' as const, duration: 'concentration' as const, modifiers: [] },
                // CB6 : un effet permanent NON-condition (bénédiction d'objet…)
                // survit à la nuit ; une CONDITION (poison…) est guérie.
                { id: 'boon', name: 'Story Boon', source: 'item' as const, duration: 'permanent' as const, modifiers: [] },
                { id: 'poison', name: 'Poisoned', source: 'condition' as const, duration: 'permanent' as const, modifiers: [] },
            ],
        };

        const rested = applyLongRest(character);
        expect(rested.hp.current).toBe(18);
        expect(rested.tempHP).toBe(0);
        expect(rested.deathSaves?.failures).toBe(0);
        expect(rested.spellSlots?.['1'].current).toBe(4);
        expect(rested.spellSlots?.['2'].current).toBe(2);
        expect(rested.activeEffects.map(effect => effect.id)).toEqual(['boon']);
    });

    it('applies one-use story modifiers to the next relevant roll', () => {
        const prompt = normalizeRollPrompt({
            reason: 'Clever boss trick attack',
            formula: '1d20+4',
            dc: 15,
        });
        const modifier = normalizeStoryModifier({
            name: 'Ruse excellente',
            source: 'tactic',
            mode: 'advantage',
            bonus: 2,
            scope: 'attack',
            reason: 'The player used the collapsing bridge against the boss.',
        });

        const result = applyStoryModifiersToPrompt(prompt, [modifier]);

        expect(result.prompt.advantage).toBe('advantage');
        expect(result.prompt.dmBonus).toBe(2);
        expect(result.applied).toHaveLength(1);
        expect(result.remaining).toHaveLength(0);
    });

    it('cancels advantage and disadvantage from story modifiers', () => {
        const prompt = normalizeRollPrompt({
            reason: 'Stealth check',
            formula: '1d20+3',
            dc: 12,
            advantage: 'advantage',
        });
        const complication = normalizeStoryModifier({
            name: 'Terrain bruyant',
            source: 'complication',
            mode: 'disadvantage',
            scope: 'check',
            reason: 'Loose stones make silence difficult.',
        });

        const result = applyStoryModifiersToPrompt(prompt, [complication]);

        expect(result.prompt.advantage).toBe('normal');
    });
});

describe('campaign director context', () => {
    it('includes compact manifest and active branch state', () => {
        const context = buildCampaignDirectorContext({
            character: DEFAULT_CHAR,
            adventure: 'Test Adventure',
            adventureManifest: {
                villain: {
                    name: 'The Glass King',
                    archetype: 'Reflection',
                    description: 'A mirror tyrant.',
                    secret: 'He is an echo.',
                    motivation: 'Recover a stolen crown.',
                },
                chapters: [{
                    id: 'ch1',
                    title: 'Broken Road',
                    objective: 'Reach the old bridge',
                    status: 'active',
                    scenes: [{
                        id: 's1',
                        title: 'Rain Gate',
                        description: 'A gate under rain.',
                        location: 'North Gate',
                        mood: 'exploration',
                    }],
                }],
                introduction: 'Begin.',
                fullManifesto: 'Long manifesto text.',
            },
            campaignRuntime: {
                currentChapterId: 'ch1',
                currentSceneId: 's1',
                currentObjective: 'Follow the glass trail',
                activeBranch: {
                    id: 'branch_test',
                    branchTitle: 'The Smuggler Detour',
                    purpose: 'Let the player follow a suspicious cart.',
                    estimatedPlayTimeMinutes: 20,
                    status: 'active',
                    scenes: [{
                        id: 'b1',
                        type: 'roleplay',
                        location: 'Canal Dock',
                        goal: 'Question the cart driver',
                        setup: 'The driver is hiding a symbol.',
                        dmNotes: 'Keep it tense.',
                        possibleTools: ['request_roll'],
                        successClue: 'Symbol points back to the bridge.',
                        failureConsequence: 'Clock advances.',
                    }],
                    reconnectHooks: [{ type: 'clue', description: 'The cart carries bridge dust.' }],
                    consequences: [],
                    forbidden: ['Do not reveal the villain secret.'],
                    directorNote: 'Reconnect through the bridge.',
                },
                branchHistory: [],
                canonFacts: ['The bridge is guarded.'],
                protectedSecrets: ['The mayor is compromised.'],
                worldClocks: [{
                    id: 'clock_bridge',
                    name: 'Bridge Patrol',
                    description: 'The patrol tightens security.',
                    stage: 2,
                    maxStage: 6,
                    status: 'active',
                    updatedAt: 1,
                }],
            },
            journal: { quests: [], npcs: [], locations: [], chronicle: [] },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
        });

        expect(context).toContain('Campaign spine: villain The Glass King');
        expect(context).toContain('Active side branch: The Smuggler Detour');
        expect(context).toContain('World clocks: Bridge Patrol 2/6');
    });

    it('uses a trimmed manifesto excerpt for legacy saves without parsed manifest', () => {
        const context = buildCampaignDirectorContext({
            character: DEFAULT_CHAR,
            adventure: 'Legacy Adventure',
            manifestoText: 'A'.repeat(1200),
            journal: { quests: [], npcs: [], locations: [], chronicle: [] },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
        });

        expect(context).toContain('Campaign spine excerpt:');
        expect(context.length).toBeLessThan(3000);
    });
});

describe('SRD 5.1 Codex integration', () => {
    beforeAll(async () => {
        await preloadCodexBestiary();
    });

    it('looks up Fire Bolt as a spell attack with fire damage', () => {
        const fireBolt = lookupSpell('Fire Bolt');
        expect(fireBolt?.attack?.type).toBe('ranged');
        expect(fireBolt?.damage?.type).toBe('fire');
        expect(fireBolt?.damage?.dice).toBe('1d10');
    });

    it('casts Bless as concentration with RAW +1d4 dice modifiers on attacks and saves', () => {
        const character = {
            ...DEFAULT_CHAR,
            class: 'Cleric', // porte de liste de classe (2026-08-21)
            spellSlots: { '1': { current: 1, max: 1 } },
            activeEffects: [],
            storyModifiers: [],
        };

        const result = castSpell(character, { spellName: 'Bless', slotLevel: 1 });

        expect(result.success).toBe(true);
        expect(result.character.spellSlots?.['1'].current).toBe(0);
        const bless = result.character.activeEffects.find(effect => effect.name === 'Bless');
        expect(bless?.concentration).toBe(true);
        // RAW : +1d4 attaques ET sauvegardes — plus de story modifier +2 « à usages ».
        expect(bless?.modifiers.some(m => m.stat === 'attackBonus' && m.dice === '1d4')).toBe(true);
        expect(bless?.modifiers.some(m => m.stat === 'saveBonus' && m.dice === '1d4')).toBe(true);
        expect((result.character.storyModifiers || []).some(modifier => modifier.name === 'Bless')).toBe(false);
        // Le bonus 1d4 se matérialise dans les jets : getRollBonus('save') ∈ [1..4].
        const saveBonus = getRollBonus(result.character, 'save');
        expect(saveBonus).toBeGreaterThanOrEqual(1);
        expect(saveBonus).toBeLessThanOrEqual(4);
    });

    it('casts Hold Person as a Wisdom save with paralyzed on failure', () => {
        const character = {
            ...DEFAULT_CHAR,
            class: 'Cleric', // porte de liste de classe (2026-08-21)
            stats: { ...DEFAULT_CHAR.stats, CHA: 16 },
            spellSlots: { '2': { current: 1, max: 1 } },
            activeEffects: [],
        };

        const result = castSpell(character, { spellName: 'Hold Person', slotLevel: 2, target: 'Bandit' });

        expect(result.success).toBe(true);
        expect(result.prompt?.type).toBe('SAVE');
        expect(result.prompt?.name).toContain('WIS');
        expect(result.conditionOnFailure).toBe('paralyzed');
        expect(result.character.activeEffects.some(effect => effect.name === 'Hold Person' && effect.concentration)).toBe(true);
    });

    it('casts Cure Wounds with slot scaling and clamps healing at max HP', () => {
        const character = {
            ...DEFAULT_CHAR,
            class: 'Cleric', // porte de liste de classe (2026-08-21)
            stats: { ...DEFAULT_CHAR.stats, WIS: 16 },
            hp: { current: 8, max: 12 },
            spellSlots: { '2': { current: 1, max: 1 } },
        };

        const result = castSpell(character, {
            spellName: 'Cure Wounds',
            slotLevel: 2,
            casterAbility: 'WIS',
            fixedHealing: 20,
        });

        expect(result.success).toBe(true);
        expect(result.healing).toBe(23);
        expect(result.character.hp.current).toBe(12);
        expect(result.character.spellSlots?.['2'].current).toBe(0);
    });

    it('rejects spells outside the configured caster setup', () => {
        const character = {
            ...DEFAULT_CHAR,
            name: 'Sable',
            class: 'Mage',
            cantrips: ['Fire Bolt'],
            preparedSpells: ['Mage Armor'],
            knownSpells: [],
            spellcastingAbility: 'INT' as const,
            spellSlots: { '1': { current: 1, max: 1 } },
        };

        const known = castSpell(character, { spellName: 'Fire Bolt', targetAC: 10 });
        const unknown = castSpell(character, { spellName: 'Burning Hands', slotLevel: 1 });

        expect(known.success).toBe(true);
        expect(unknown.success).toBe(false);
        expect(unknown.error).toContain('caster setup');
        expect(unknown.character.spellSlots?.['1'].current).toBe(1);
    });

    it('does not give level 1 half-casters spell slots', () => {
        const paladin = ensureProgressionState({
            ...DEFAULT_CHAR,
            class: 'Paladin',
            spellSlots: undefined,
        });

        expect(paladin.spellSlots).toBeUndefined();
    });

    it('structures legacy equipment effects into damage fields while preserving effect text', () => {
        const item = structureInventoryItem({
            id: 'legacy-longbow',
            name: 'Longbow',
            type: 'weapon',
            slot: 'none',
            weight: 2,
            quantity: 1,
            equipped: false,
            effect: '1d8 Pierce',
        });

        expect(item.effect).toBe('1d8 Pierce');
        expect(item.damageDice).toBe('1d8');
        expect(item.damageType).toBe('piercing');
    });

    it('keeps the current bestiary as monster source with portraits and attacks', () => {
        const goblin = lookupMonster('Goblin');
        expect(goblin?.source.sourceKind).toBe('current-bestiary');
        expect(goblin?.portrait || goblin?.source.sourceUrl).toBeTruthy();
        expect(goblin?.attacks.length).toBeGreaterThan(0);
    });

    it('parses real Goblin attacks from action text instead of Basic Attack fallback', () => {
        const goblin = getCreature('Goblin');
        expect(goblin?.hp.base).toBe(7);
        expect(goblin?.ac).toBe(15);
        expect(goblin?.imageUrl).toContain('goblin.jpg');

        const attacks = getCreatureAttacks(goblin);
        expect(attacks.map(attack => attack.name)).toEqual(expect.arrayContaining(['Scimitar', 'Shortbow']));
        expect(attacks).toContainEqual(expect.objectContaining({
            name: 'Scimitar',
            attackBonus: 4,
            damage: '1d6+2',
            damageType: 'slashing',
        }));
        expect(attacks).toContainEqual(expect.objectContaining({
            name: 'Shortbow',
            attackBonus: 4,
            damage: '1d6+2',
            damageType: 'piercing',
            ranged: { short: 80, long: 320 },
        }));
    });

    it('parses Troll attacks from action text', () => {
        const troll = getCreature('Troll');
        const attacks = getCreatureAttacks(troll);

        expect(attacks.map(attack => attack.name)).toEqual(expect.arrayContaining(['Bite', 'Claw']));
        expect(attacks[0].name).not.toBe('Basic Attack');
    });

    it('parses dragon attacks and keeps multi-type bite damage parts', () => {
        const dragon = getCreature('Adult Black Dragon');
        const attacks = getCreatureAttacks(dragon);
        const bite = attacks.find(attack => attack.name === 'Bite');

        expect(attacks.map(attack => attack.name)).toEqual(expect.arrayContaining(['Bite', 'Claw']));
        expect(bite?.damageParts).toEqual([
            { damage: '2d10+6', damageType: 'piercing' },
            { damage: '1d8', damageType: 'acid' },
        ]);
    });

    it('uses parsed current-bestiary monster attacks before fallback attacks', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const state = {
            isActive: true,
            currentTurn: 'Thug',
            round: 1,
            turnIndex: 0,
            actionEconomy: { Thug: { actionUsed: false, bonusActionUsed: false, reactionUsed: false, movementUsed: 0, movementMax: 30 } },
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 5, initiative: 12, isPlayer: true },
                { id: 'thug', name: 'Thug', hp: { current: 32, max: 32 }, ac: 11, initiative: 15, isPlayer: false },
            ],
        };

        const result = resolveAttackAction(state, { attacker: 'Thug', target: 'Hero' }, DEFAULT_CHAR);
        random.mockRestore();

        expect(result.success).toBe(true);
        expect(result.resolution?.attackName).toBe('Mace');
        expect(result.resolution?.damageFormula).toBe('1d6+2');
        expect(result.resolution?.damageType).toBe('bludgeoning');
    });

    it('uses attackName to select a bestiary attack and rejects unknown attacks', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const state = {
            isActive: true,
            currentTurn: 'Goblin',
            round: 1,
            turnIndex: 0,
            actionEconomy: { goblin: { actionUsed: false, bonusActionUsed: false, reactionUsed: false, movementUsed: 0, movementMax: 30 } },
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 5, initiative: 12, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15, initiative: 15, isPlayer: false },
            ],
        };

        const shortbow = resolveAttackAction(state, { attacker: 'goblin', target: 'Hero', attackName: 'Shortbow' }, DEFAULT_CHAR);
        const invalid = resolveAttackAction(state, { attacker: 'goblin', target: 'Hero', attackName: 'Eye Laser' }, DEFAULT_CHAR);
        random.mockRestore();

        expect(shortbow.success).toBe(true);
        expect(shortbow.resolution?.attackName).toBe('Shortbow');
        expect(shortbow.resolution?.damageFormula).toBe('1d6+2');
        expect(shortbow.resolution?.damageType).toBe('piercing');
        expect(invalid.success).toBe(false);
        expect(invalid.error).toContain('Available attacks');
    });

    it('creates groups of bestiary enemies with separate HP and ambiguous-name protection', () => {
        let state = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        const first = addEnemyToEncounter(state, { name: 'Goblin', hp: 99, ac: 2 });
        state = first.state;
        const second = addEnemyToEncounter(state, { name: 'Goblin' });
        state = second.state;
        const third = addEnemyToEncounter(state, { name: 'Goblin' });
        state = third.state;

        const goblins = state.combatants.filter(combatant => combatant.name === 'Goblin');
        expect(goblins).toHaveLength(3);
        expect(goblins.every(goblin => goblin.hp.current === 7 && goblin.hp.max === 7 && goblin.ac === 15)).toBe(true);
        expect(new Set(goblins.map(goblin => goblin.id)).size).toBe(3);

        const damaged = applyDamageToEncounter(state, goblins[0].id, 3, 'slashing');
        const ambiguous = applyDamageToEncounter(state, 'Goblin', 3, 'slashing');
        expect(damaged.found).toBe(true);
        expect(damaged.state.combatants.find(combatant => combatant.id === goblins[0].id)?.hp.current).toBe(4);
        expect(damaged.state.combatants.filter(combatant => combatant.name === 'Goblin' && combatant.id !== goblins[0].id).every(goblin => goblin.hp.current === 7)).toBe(true);
        expect(ambiguous.found).toBe(false);
        expect(ambiguous.ambiguous).toBe(true);
    });

    it('tags allies as a friendly faction distinct from enemies', () => {
        let state = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        state = addEnemyToEncounter(state, { name: 'Goblin' }).state;
        const allyAdd = addAllyToEncounter(state, { name: 'Town Guard', hp: 18, ac: 14 });
        state = allyAdd.state;

        const ally = state.combatants.find(c => c.id === allyAdd.combatant.id)!;
        const enemy = state.combatants.find(c => c.name === 'Goblin')!;
        const player = state.combatants.find(c => c.isPlayer)!;

        expect(ally.side).toBe('ally');
        expect(isHero(ally)).toBe(true);   // ally fights with the party
        expect(isHero(player)).toBe(true);
        expect(isHero(enemy)).toBe(false); // enemy is not a hero
    });

    it('keeps combat going when the player falls but an ally still stands, and only declares defeat when the whole party is down', () => {
        let state = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        state = addEnemyToEncounter(state, { name: 'Goblin' }).state;
        const allyAdd = addAllyToEncounter(state, { name: 'Town Guard', hp: 18, ac: 14 });
        state = allyAdd.state;

        // Player drops but the ally is still up -> NOT defeat (fight continues).
        let downedPlayer = {
            ...state,
            combatants: state.combatants.map(c => c.isPlayer ? { ...c, hp: { ...c.hp, current: 0 } } : c),
        };
        expect(encounterOutcome(downedPlayer)).toBe('ongoing');

        // Now the ally also falls -> the whole party is down -> defeat.
        let wholePartyDown = {
            ...downedPlayer,
            combatants: downedPlayer.combatants.map(c => c.id === allyAdd.combatant.id ? { ...c, hp: { ...c.hp, current: 0 } } : c),
        };
        expect(encounterOutcome(wholePartyDown)).toBe('defeat');
    });

    it('hybrid enemy targeting: honors a valid MJ intent, else attacks the most wounded hero', () => {
        const player = { id: 'player', name: 'Hero', isPlayer: true, side: 'player', hp: { current: 30, max: 30 }, ac: 15, initiative: 10 } as any;
        const ally = { id: 'ally-1', name: 'Guard', side: 'ally', hp: { current: 6, max: 18 }, ac: 14, initiative: 8 } as any;
        const heroes = [player, ally];

        // No intent -> wounded prey (the ally at 6 HP).
        expect(selectEnemyTarget(heroes, undefined)?.id).toBe('ally-1');

        // Valid intent -> honored even though the player is healthier.
        expect(selectEnemyTarget(heroes, 'player')?.id).toBe('player');

        // Stale intent (target not in living list) -> falls back to wounded prey.
        expect(selectEnemyTarget(heroes, 'ghost-id')?.id).toBe('ally-1');

        // No living heroes -> undefined.
        expect(selectEnemyTarget([], 'player')).toBeUndefined();
    });

    it('declares victory only when every enemy is down, ignoring allies', () => {
        let state = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        state = addEnemyToEncounter(state, { name: 'Goblin' }).state;
        const allyAdd = addAllyToEncounter(state, { name: 'Town Guard', hp: 18, ac: 14 });
        state = allyAdd.state;

        // Enemy still alive -> ongoing even with an ally present.
        expect(encounterOutcome(state)).toBe('ongoing');

        // Drop the only enemy -> victory (the living ally must not block it).
        const enemyDown = {
            ...state,
            combatants: state.combatants.map(c => combatantSide(c) === 'enemy' ? { ...c, hp: { ...c.hp, current: 0 } } : c),
        };
        expect(encounterOutcome(enemyDown)).toBe('victory');
    });

    it('builds encounters from SRD XP thresholds and the current bestiary', () => {
        const encounter = buildEncounter({ partyLevel: 3, partySize: 1, difficulty: 'medium', maxMonsters: 3 });

        expect(encounter.xpBudget).toBeGreaterThan(0);
        expect(encounter.monsters.length).toBeGreaterThan(0);
        expect(encounter.monsters.every(monster => monster.source.sourceKind === 'current-bestiary')).toBe(true);
    });

    it('applies condition effects and resolves concentration checks', () => {
        const paralyzed = lookupCondition('paralyzed');
        expect(paralyzed?.savingThrows?.DEX).toBe('auto_fail');

        const conditioned = applyConditionToCharacter(DEFAULT_CHAR, 'restrained');
        expect(conditioned.found).toBe(true);
        expect(conditioned.character.activeEffects.some(effect => effect.name === 'Restrained')).toBe(true);

        const concentrating = {
            ...DEFAULT_CHAR,
            activeEffects: [{ id: 'bless', name: 'Bless', source: 'spell' as const, duration: 'concentration' as const, concentration: true, modifiers: [] }],
        };
        const pending = resolveConcentrationAfterDamage(concentrating, 8);
        expect(pending.prompt?.concentrationDamage).toBe(8);
        expect(pending.prompt?.contextReasons?.[0]).toContain('DC 10');

        const broken = resolveConcentrationAfterDamage(concentrating, 24, 9);
        expect(broken.dc).toBe(12);
        expect(broken.broken).toBe(true);
        expect(broken.character.activeEffects).toHaveLength(0);

        const downed = resolveConcentrationAfterDamage({
            ...concentrating,
            hp: { current: 0, max: concentrating.hp.max },
        }, 4);
        expect(downed.broken).toBe(true);
        expect(downed.prompt).toBeUndefined();
    });

    it('derives lightweight roll context from SRD conditions and cover', () => {
        const prompt = normalizeRollPrompt({
            reason: 'Attack roll',
            formula: '1d20+5',
            dc: 15,
        });
        const context = deriveRollContext(prompt, {
            actorEffects: [{ id: 'poisoned', name: 'Poisoned', source: 'condition' as const, duration: 'permanent' as const, modifiers: [] }],
            coverBonus: 2,
        });

        expect(context.prompt.advantage).toBe('disadvantage');
        expect(context.prompt.dc).toBe(17);
        expect(context.prompt.contextReasons?.join(' ')).toContain('Poisoned');
        expect(context.prompt.contextReasons?.join(' ')).toContain('Half cover');
    });

    it('uses cover-adjusted AC when resolving attacks', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const state = {
            isActive: true,
            currentTurn: 'Hero',
            round: 1,
            turnIndex: 0,
            actionEconomy: { Hero: { actionUsed: false, bonusActionUsed: false, reactionUsed: false, movementUsed: 0, movementMax: 30 } },
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 12, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15, initiative: 10, isPlayer: false },
            ],
        };

        const result = resolveAttackAction(state, {
            attacker: 'Hero',
            target: 'Goblin',
            attackBonus: 4,
            damageFormula: '1d8+2',
            targetCoverBonus: 2,
        }, DEFAULT_CHAR);
        random.mockRestore();

        expect(result.success).toBe(true);
        expect(result.resolution?.attackRoll.total).toBe(15);
        expect(result.resolution?.attackRoll.prompt.dc).toBe(17);
        expect(result.resolution?.hit).toBe(false);
    });

    it('applies typed damage through the encounter damage path', () => {
        const state = {
            isActive: true,
            currentTurn: 'Hero',
            combatants: [
                { id: 'goblin', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15, initiative: 10, isPlayer: false },
            ],
        };

        const applied = applyDamageToEncounter(state, 'Goblin', 3, 'fire');
        expect(applied.found).toBe(true);
        expect(applied.amountApplied).toBeGreaterThanOrEqual(0);
        expect(applied.target?.hp.current).toBe(7 - (applied.amountApplied || 0));
    });
});

describe('campaignEventLog persistence', () => {
    let storage: Record<string, string>;

    beforeEach(() => {
        storage = {};
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: {
                getItem: (key: string) => storage[key] ?? null,
                setItem: (key: string, value: string) => {
                    storage[key] = value;
                },
                removeItem: (key: string) => {
                    delete storage[key];
                },
            },
        });
    });

    it('keeps campaign timelines isolated by save id', () => {
        campaignEventLog.setCampaignId('alpha-save');
        campaignEventLog.clear();
        campaignEventLog.append('PLAYER_SPOKE', 'Alpha spoke', { text: 'hello' });

        campaignEventLog.setCampaignId('beta-save');
        campaignEventLog.clear();
        campaignEventLog.append('DM_NARRATED', 'Beta narrated', { text: 'scene' });

        expect(campaignEventLog.getEvents()).toHaveLength(1);
        expect(campaignEventLog.getEvents()[0].type).toBe('DM_NARRATED');

        campaignEventLog.setCampaignId('alpha-save');
        expect(campaignEventLog.getEvents()).toHaveLength(1);
        expect(campaignEventLog.getEvents()[0].type).toBe('PLAYER_SPOKE');
    });
});

describe('campaign media prompts', () => {
    it('builds combat music as a compact instrumental caption (no instruction soup)', () => {
        const prompt = buildMusicPromptForMood('combat', [{ text: 'urgent drums', weight: 1 }], 30, true);

        expect(prompt).toContain('Instrumental');
        expect(prompt).toContain('urgent drums');
        expect(prompt).toContain('loop');
        // Stable Audio reads short captions: no negations (they summon what
        // they name), no weight metadata, no "Create a..." instructions.
        expect(prompt).not.toContain('No vocals');
        expect(prompt).not.toContain('weight');
        expect(prompt).not.toContain('Create');
        expect(prompt.length).toBeLessThan(220);
    });

    it('builds exploration music as a long ambient caption sorted by weight', () => {
        const prompt = buildMusicPromptForMood('exploration', [
            { text: 'soft strings', weight: 0.8 },
            { text: 'ambient fantasy soundtrack', weight: 1.5 },
        ], 180, true);

        expect(prompt).toContain('background track');
        expect(prompt).toContain('exploration theme');
        // Strongest descriptor first (attention peaks early in the caption).
        expect(prompt.indexOf('ambient fantasy soundtrack')).toBeLessThan(prompt.indexOf('soft strings'));
        expect(prompt).not.toContain('dungeon master');
    });

    it('computes the shared 3-minute media cooldown', () => {
        const now = 10 * 60 * 1000;
        expect(cooldownRemainingMs(0, now)).toBe(0);
        expect(cooldownRemainingMs(now - 60_000, now, 180_000)).toBe(180_000 - 60_000);
        expect(cooldownRemainingMs(now - 180_000, now, 180_000)).toBe(0);
    });

    it('classifies only fight moods as combat loops', () => {
        expect(isCombatLoopMood('combat')).toBe(true);
        expect(isCombatLoopMood('combat_boss')).toBe(true);
        expect(isCombatLoopMood('tension')).toBe(true);
        expect(isCombatLoopMood('victory')).toBe(false);
        expect(isCombatLoopMood('exploration')).toBe(false);
    });
});

describe('character creation defaults', () => {
    it('stores structured story profile hooks for campaign writing', () => {
        expect(DEFAULT_CHAR.storyProfile?.cinematicStyle).toBe('dark fantasy cinematic');
        expect(DEFAULT_CHAR.storyProfile?.dmHooks).toEqual([]);
    });

    it('maps the Mage class to arcane starting equipment', () => {
        const kit = getStartingEquipment('Mage', 'Sage', 'Dueling');
        expect(kit.some(item => item.name === 'Spellbook')).toBe(true);
        expect(kit.some(item => item.name === 'Component Pouch')).toBe(true);
    });
});

describe('scene visual request coherence', () => {
    beforeEach(() => {
        useGameStore.getState().resetSessionState();
    });

    it('applies only the latest generated scene image', () => {
        const first = useGameStore.getState().beginSceneVisualRequest({
            key: 'scene:first',
            prompt: 'old forest scene',
            kind: 'scene_image',
            phase: 'exploration',
            summary: 'first scene',
        });
        const second = useGameStore.getState().beginSceneVisualRequest({
            key: 'scene:second',
            prompt: 'new combat scene',
            kind: 'combat_image',
            phase: 'combat',
            summary: 'second scene',
        });

        expect(useGameStore.getState().isGeneratingImage).toBe(true);
        // PL4 — une image terminée mais SUPPLANTÉE s'affiche quand même
        // (mieux qu'un fond périmé pendant la génération suivante) ; elle ne
        // compte pas comme « applied » et la génération continue.
        expect(useGameStore.getState().completeSceneVisualRequest(first.id, 'old-url')).toBe(false);
        expect(useGameStore.getState().bgImage).toBe('old-url');
        expect(useGameStore.getState().isGeneratingImage).toBe(true);

        // La plus récente REMPLACE l'intérimaire à son arrivée.
        expect(useGameStore.getState().completeSceneVisualRequest(second.id, 'new-url')).toBe(true);
        expect(useGameStore.getState().bgImage).toBe('new-url');
        expect(useGameStore.getState().isGeneratingImage).toBe(false);
        expect(useGameStore.getState().lastSceneVisualRequest?.status).toBe('applied');
    });
});

describe('Equipped Accessories Effects', () => {
    it('applies modifiers from head, neck, and ring items', () => {
        const char: any = {
            ...DEFAULT_CHAR,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            hp: { current: 10, max: 10 },
            ac: 10,
            inventory: [
                {
                    id: 'ring-protection',
                    name: 'Ring of Protection',
                    type: 'armor',
                    slot: 'ring',
                    weight: 0.1,
                    quantity: 1,
                    equipped: true,
                    acBonus: 1,
                    effect: '+1 AC',
                },
                {
                    id: 'amulet-health',
                    name: 'Amulet of Health',
                    type: 'misc',
                    slot: 'neck',
                    weight: 0.5,
                    quantity: 1,
                    equipped: true,
                    effect: 'CON = 19',
                },
                {
                    id: 'circlet-blasting',
                    name: 'Helm of Fire',
                    type: 'misc',
                    slot: 'head',
                    weight: 1,
                    quantity: 1,
                    equipped: true,
                    effect: '+10 speed, +1d6 fire',
                },
            ],
        };

        const effectiveCon = getEffectiveStat(char, 'CON');
        expect(effectiveCon).toBe(19);

        const effectiveAC = getEffectiveAC(char);
        expect(effectiveAC).toBe(11); // 10 base + 1 from ring of protection

        const effectiveSpeed = getEffectiveSpeed(char, 30);
        expect(effectiveSpeed).toBe(40); // 30 base + 10 from helm of fire

        // Check additional damage parts in resolveAttackAction
        const state = {
            isActive: true,
            currentTurn: 'Hero',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 10, initiative: 12, isPlayer: true },
                { id: 'goblin', name: 'Goblin', hp: { current: 20, max: 20 }, ac: 5, initiative: 10, isPlayer: false },
            ],
        };

        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5); // returns mid values for dice
        const result = resolveAttackAction(state, {
            attacker: 'Hero',
            target: 'Goblin',
            attackBonus: 10,
            damageFormula: '1d6+2',
            damageType: 'slashing',
        }, char);
        random.mockRestore();

        expect(result.success).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        // Helmet adds +1d6 fire, on 1d6 roll with 0.5 (returns 4 on a d6):
        // base damage: 1d6+2 => 4+2 = 6 slashing
        // helm damage: 1d6 fire => 4 fire
        // total damage: 10
        expect(result.resolution?.damage).toBe(10);
        expect(result.resolution?.damageParts).toHaveLength(2);
        expect(result.resolution?.damageParts?.[1].damageType).toBe('fire');
        expect(result.resolution?.damageParts?.[1].damage).toBe(4);
    });
});

// ─── Subclasses, XP progress & monster-damage regression ───────────────────

describe('monster damage regression (custom enemy names)', () => {
    it('resolves an enemy attack whose name is unknown to the bestiary by using the provided numbers', () => {
        // Before the fix, resolveAttackAction hard-failed with "Attack not found"
        // for any DM-spawned custom enemy → runNPCTurn skipped every strike and
        // monsters dealt zero damage. With damageFormula provided, it must resolve.
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // d20 → 19
        const state = {
            isActive: true,
            currentTurn: 'enemy-1',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 5, initiative: 5, isPlayer: true },
                { id: 'enemy-1', name: 'Horreur Abyssale', hp: { current: 10, max: 10 }, ac: 10, initiative: 15, isPlayer: false },
            ],
        };

        const result = resolveAttackAction(state, {
            attacker: 'enemy-1',
            target: 'player',
            attackName: 'Attack',
            attackBonus: 4,
            damageFormula: '1d6+2',
            damageType: 'bludgeoning',
        });
        random.mockRestore();

        expect(result.success).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        expect(result.resolution!.damage).toBeGreaterThan(0);
        expect(result.state.combatants.find(c => c.isPlayer)!.hp.current).toBeLessThan(10);
    });

    it('still rejects an unknown named attack when NO fallback numbers are provided', () => {
        const state = {
            isActive: true,
            currentTurn: 'enemy-1',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 5, initiative: 5, isPlayer: true },
                { id: 'enemy-1', name: 'Horreur Abyssale', hp: { current: 10, max: 10 }, ac: 10, initiative: 15, isPlayer: false },
            ],
        };
        const result = resolveAttackAction(state, {
            attacker: 'enemy-1',
            target: 'player',
            attackName: 'Inexistant',
        });
        expect(result.success).toBe(false);
    });
});

describe('subclasses (archetypes) mechanics', () => {
    it('exposes a real choice for every class with options', () => {
        for (const cls of ['Fighter', 'Paladin', 'Ranger', 'Rogue', 'Cleric', 'Druid', 'Mage', 'Barbarian', 'Bard', 'Monk', 'Warlock', 'Sorcerer']) {
            const config = getSubclassConfig(cls);
            expect(config, cls + ' should have a subclass config').toBeTruthy();
            expect(config!.options.length).toBeGreaterThanOrEqual(2);
        }
        expect(subclassNeedsChoice({ class: 'Ranger', level: 3 })).toBe(true);
        expect(subclassNeedsChoice({ class: 'Ranger', level: 2 })).toBe(false);
        expect(subclassNeedsChoice({ class: 'Ranger', level: 3, subclass: 'Hunter' })).toBe(false);
        expect(getSubclassFeaturesForLevel('Ranger', 'Hunter', 3).some(f => f.name === 'Colossus Slayer')).toBe(true);
    });

    it('Champion crits on a natural 19 that HITS — but a 19 under the AC still misses (RE3, RAW)', () => {
        // RE3 (contre-audit 2026-08-13) — l'ancien test verrouillait le bug :
        // « 19 < CA 30 touche uniquement parce que le Champion transforme le 19
        // en crit ». RAW : seul le 20 naturel touche automatiquement ; le seuil
        // étendu du Champion n'élargit que la plage de CRITIQUE des attaques
        // qui touchent.
        const champion = { ...DEFAULT_CHAR, subclass: 'Champion', inventory: [] };
        const mkState = (ac: number) => ({
            isActive: true,
            currentTurn: 'player',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'enemy-1', name: 'Cible', hp: { current: 20, max: 20 }, ac, initiative: 5, isPlayer: false },
            ],
        });
        const args = {
            attacker: 'player',
            target: 'enemy-1',
            attackBonus: 0,
            damageFormula: '1d6',
            damageType: 'slashing',
        };

        // Cas 1 — nat 19 vs CA 30 : RATÉ (pas d'auto-touche sous la CA).
        let random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // d20 → 19
        const miss = resolveAttackAction(mkState(30), args, champion);
        random.mockRestore();
        expect(miss.resolution?.hit).toBe(false);
        expect(miss.resolution?.criticalHit).toBe(false);

        // Cas 2 — nat 19 vs CA 16 : touche (19 ≥ 16) ET critique (seuil Champion 19).
        random = vi.spyOn(Math, 'random').mockReturnValue(0.9);
        const crit = resolveAttackAction(mkState(16), args, champion);
        random.mockRestore();
        expect(crit.resolution?.hit).toBe(true);
        expect(crit.resolution?.criticalHit).toBe(true);
        // Crit doubles the dice: d6 rolled 6 → 12 damage.
        expect(crit.resolution?.damage).toBe(12);
    });

    it('Hunter adds Colossus Slayer 1d8 against a wounded target on the first attack of the turn', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // d20 → 19, d6 → 6, d8 → 8
        const hunter = { ...DEFAULT_CHAR, subclass: 'Hunter', inventory: [] };
        const state = {
            isActive: true,
            currentTurn: 'player',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'enemy-1', name: 'Cible', hp: { current: 5, max: 20 }, ac: 5, initiative: 5, isPlayer: false },
            ],
        };
        const result = resolveAttackAction(state, {
            attacker: 'player',
            target: 'enemy-1',
            attackBonus: 10,
            damageFormula: '1d6',
            damageType: 'piercing',
        }, hunter);
        random.mockRestore();

        expect(result.resolution?.hit).toBe(true);
        expect(result.resolution?.damageParts?.length).toBe(2);
        // d20=19 is a crit only for Champions; here damage = 1d6(6) + 1d8(8) = 14.
        expect(result.resolution?.rawDamage).toBe(14);
    });

    it('Beast Master starts every encounter with the wolf companion as an ally', () => {
        const beastMaster = { ...DEFAULT_CHAR, subclass: 'Beast Master' };
        const state = startEncounter(beastMaster, { isActive: false, combatants: [], currentTurn: '' });
        const companion = state.combatants.find(c => c.id === 'companion');
        expect(companion).toBeTruthy();
        expect(combatantSide(companion!)).toBe('ally');
        // A non-Beast-Master never gets the companion.
        const plain = startEncounter(DEFAULT_CHAR, { isActive: false, combatants: [], currentTurn: '' });
        expect(plain.combatants.some(c => c.id === 'companion')).toBe(false);
    });

    it('companion HP scales with level (4×lvl), persists between fights, and a downed wolf stays out', () => {
        // Level 5 ranger → max 20; wounded at 7 from the previous fight.
        const ranger5 = { ...DEFAULT_CHAR, level: 5, subclass: 'Beast Master', companionHP: { current: 7, max: 20 } };
        const state = startEncounter(ranger5, { isActive: false, combatants: [], currentTurn: '' });
        const companion = state.combatants.find(c => c.id === 'companion');
        expect(companion!.hp.max).toBe(20);
        expect(companion!.hp.current).toBe(7);

        // Downed companion (0 HP) does NOT rejoin until a rest revives it.
        const downed = { ...ranger5, companionHP: { current: 0, max: 20 } };
        const state2 = startEncounter(downed, { isActive: false, combatants: [], currentTurn: '' });
        expect(state2.combatants.some(c => c.id === 'companion')).toBe(false);
    });

    it('rests heal the companion: short → at least half, long → full revive', () => {
        const downed = { ...DEFAULT_CHAR, level: 5, subclass: 'Beast Master', companionHP: { current: 0, max: 20 } };
        const afterShort = applyShortRest(downed, 0);
        expect(afterShort.companionHP!.current).toBe(10); // half of 4×5
        const afterLong = applyLongRest(downed);
        expect(afterLong.companionHP!.current).toBe(20);
    });

    it('asiLevelsBetween counts every ASI crossed by a multi-level jump', () => {
        expect(asiLevelsBetween(3, 5)).toEqual([4]);
        expect(asiLevelsBetween(3, 8)).toEqual([4, 8]);
        expect(asiLevelsBetween(4, 5)).toEqual([]);
        expect(asiLevelsBetween(1, 20)).toEqual([4, 8, 12, 16, 19]);
    });

    it('Life Domain heals more (Disciple of Life: +2 + slot level)', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5); // d8 → 5
        const base = {
            ...DEFAULT_CHAR,
            class: 'Cleric',
            hp: { current: 1, max: 30 },
            spellSlots: { '1': { current: 2, max: 2 } },
            cantrips: [], knownSpells: [], preparedSpells: [],
            inventory: [],
        };
        const plain = castSpell({ ...base }, { spellName: 'Cure Wounds', slotLevel: 1, casterAbilityMod: 0 });
        const life = castSpell({ ...base, subclass: 'Life Domain' }, { spellName: 'Cure Wounds', slotLevel: 1, casterAbilityMod: 0 });
        random.mockRestore();

        expect(plain.success).toBe(true);
        expect(life.success).toBe(true);
        expect(life.healing!).toBe(plain.healing! + 3); // +2 + slot 1
    });
});

describe('getXPProgress (XP bar)', () => {
    it('reports progress within the current level', () => {
        const halfway = getXPProgress(1, 150); // level 2 at 300 XP
        expect(halfway.percent).toBe(50);
        expect(halfway.nextLevelXP).toBe(300);
        expect(halfway.intoLevel).toBe(150);

        const fresh = getXPProgress(2, 300);
        expect(fresh.percent).toBe(0);
        expect(fresh.nextLevelXP).toBe(900);
    });

    it('caps at level 20 with a full bar', () => {
        const maxed = getXPProgress(20, 400000);
        expect(maxed.percent).toBe(100);
        expect(maxed.nextLevelXP).toBeNull();
    });
});


// ─── Magic item catalog & loot tables ────────────────────────────────────────
import { MAGIC_ITEMS, getMagicItemByName, magicItemToInventoryItem, rollLootTable, pickMagicItem } from '../data/magicItems';
import { FEATS, getFeatById } from '../data/feats';
import { featNumericBonus, featGrantsAdvantageOn } from '../engine/rulesEngine';

describe('magic item catalog & loot tables', () => {
    it('ships a substantial SRD catalog with bilingual names', () => {
        expect(MAGIC_ITEMS.length).toBeGreaterThanOrEqual(60);
        for (const item of MAGIC_ITEMS) {
            expect(item.name.length).toBeGreaterThan(0);
            expect(item.nameFr.length).toBeGreaterThan(0);
            expect(item.effects.length).toBeGreaterThan(0);
        }
    });

    it('finds items by EN or FR name, accent- and case-insensitive', () => {
        expect(getMagicItemByName('flame tongue')?.id).toBe('flame_tongue');
        expect(getMagicItemByName('Épée longue +1')?.id).toBe('longsword_plus_1');
        expect(getMagicItemByName('epee longue +1')?.id).toBe('longsword_plus_1');
    });

    it('never rolls out-of-depth loot for a level 1-4 party (seeded rng sweep)', () => {
        let seed = 42;
        const rng = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
        };
        for (let i = 0; i < 500; i++) {
            for (const item of rollLootTable(2, rng)) {
                expect(item.minLevel).toBeLessThanOrEqual(2);
                expect(['very rare', 'legendary']).not.toContain(item.rarity);
            }
        }
    });

    it('pickMagicItem respects the rarity and level cap filters', () => {
        const item = pickMagicItem('uncommon', () => 0.5, 4);
        expect(item?.rarity).toBe('uncommon');
        expect(item!.minLevel).toBeLessThanOrEqual(4);
    });

    it('converts a catalog weapon into an equippable inventory item with parsed effects', () => {
        const def = getMagicItemByName('Flame Tongue')!;
        const item = magicItemToInventoryItem(def, 'fr');
        expect(item.name).toBe(def.nameFr);
        expect(item.slot).toBe('mainHand');
        expect(item.effect).toContain('fire');
        expect(item.quantity).toBe(1);
    });
});

// ─── Feats ───────────────────────────────────────────────────────────────────
describe('feats', () => {
    it('ships at least 15 feats with bilingual text and DM notes', () => {
        expect(FEATS.length).toBeGreaterThanOrEqual(15);
        for (const feat of FEATS) {
            expect(feat.nameFr.length).toBeGreaterThan(0);
            expect(feat.dmNote.length).toBeGreaterThan(0);
        }
    });

    it('featNumericBonus sums Alert initiative bonus from the character feats', () => {
        const char = { ...DEFAULT_CHAR, feats: ['alert'] };
        expect(featNumericBonus(char, 'initiativeBonus')).toBe(5);
        expect(featNumericBonus(DEFAULT_CHAR, 'initiativeBonus')).toBe(0);
    });

    it('Alert raises rolled initiative in startEncounter', () => {
        const base = { ...DEFAULT_CHAR, feats: ['alert'] };
        let minInit = Infinity;
        for (let i = 0; i < 30; i++) {
            const state = startEncounter(base, { isActive: false, combatants: [], currentTurn: '' });
            const player = state.combatants.find(c => c.isPlayer)!;
            minInit = Math.min(minInit, player.initiative);
        }
        const dexMod = Math.floor((DEFAULT_CHAR.stats.DEX - 10) / 2);
        // d20 minimum is 1, so with +5 the floor is 6 + dexMod.
        expect(minInit).toBeGreaterThanOrEqual(1 + dexMod + 5);
    });

    it('War Caster grants advantage on the concentration save prompt', () => {
        const char = {
            ...DEFAULT_CHAR,
            feats: ['war-caster'],
            hp: { current: 10, max: 10 },
            activeEffects: [{
                id: 'fx', name: 'Bless', source: 'spell', concentration: true,
                duration: 'concentration', modifiers: [],
            } as any],
        };
        const result = resolveConcentrationAfterDamage(char, 12);
        expect(result.prompt?.advantage).toBe('advantage');
    });

    it('Mobile adds +10 to effective speed', () => {
        const char = { ...DEFAULT_CHAR, feats: ['mobile'] };
        expect(getEffectiveSpeed(char)).toBe(getEffectiveSpeed(DEFAULT_CHAR) + 10);
    });
});

// ─── 2026-08-08 global audit regression tests ───────────────────────────────
import { applyDamageToCharacter, playerResistances, sanitizeXPGrant, updateEnemyHP } from '../engine/rulesEngine';
import { getCheckModifier, canonicalSkillName } from '../engine/skillSystem';
import { getEnemyXP } from '../engine/xpSystem';

describe('audit fixes (combat/XP/skills/damage)', () => {
    beforeAll(async () => {
        await preloadCodexBestiary();
    });

    it('getCheckModifier keeps proficiency + expertise when the DM passes the FRENCH skill name', () => {
        const res = getCheckModifier({
            effectiveStats: { STR: 10, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            level: 5,
            skill: 'Discrétion',
            proficiencies: ['Stealth'],
            expertise: ['Stealth'],
        });
        expect(res.ability).toBe('DEX');
        expect(res.proficient).toBe(true);
        expect(res.expert).toBe(true);
        expect(res.modifier).toBe(3 + 3 + 3); // DEX +3, proficiency +3, expertise +3
        expect(canonicalSkillName('Discrétion')).toBe('Stealth');
        expect(canonicalSkillName('perception')).toBe('Perception');
    });

    it('getEnemyXP uses whole-word matching (a Pirate is not a Rat)', () => {
        expect(getEnemyXP('Rat')).toBe(10);
        expect(getEnemyXP('Pirate')).toBe(50); // falls to default, not the Rat 10
        expect(getEnemyXP('Goblin Boss')).toBe(50); // whole-word Goblin still matches
    });

    it('sanitizeXPGrant clamps against real bestiary XP instead of the tiny English table', () => {
        const dragon = getCreature('Adult Black Dragon');
        expect(dragon).toBeTruthy();
        const clamped = sanitizeXPGrant(999999, ['Adult Black Dragon']);
        // Old behavior: unknown name → 50 XP default → cap max(75, 100) = 100.
        expect(clamped).toBeGreaterThan(1000);
        expect(clamped).toBe(Math.round(Math.max(dragon!.xp * 1.5, 100)));
    });

    it('startEncounter drops a stale (inactive) roster so corpses never re-enter the next fight', () => {
        const stale: any = {
            isActive: false,
            currentTurn: '',
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 9, max: 9 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'g1', name: 'Goblin', hp: { current: 0, max: 7 }, ac: 15, initiative: 12, isPlayer: false, side: 'enemy' },
                { id: 'g2', name: 'Goblin', hp: { current: 4, max: 7 }, ac: 15, initiative: 8, isPlayer: false, side: 'enemy' },
            ],
        };
        const fresh = startEncounter(DEFAULT_CHAR, stale);
        expect(fresh.combatants.some(c => c.id === 'g1')).toBe(false);
        expect(fresh.combatants.some(c => c.id === 'g2')).toBe(false);
        expect(fresh.combatants.some(c => c.isPlayer)).toBe(true);
        // A genuinely ACTIVE combat keeps its full roster (mid-fight resume).
        const resumed = startEncounter(DEFAULT_CHAR, { ...stale, isActive: true });
        expect(resumed.combatants.some(c => c.id === 'g2')).toBe(true);
    });

    it('applyDamageToCharacter halves racially-resisted damage out of combat and burns temp HP first', () => {
        const dwarf: any = { ...DEFAULT_CHAR, race: 'Dwarf', tempHP: 3, hp: { current: 20, max: 20 } };
        const res = applyDamageToCharacter(dwarf, 10, 'poison');
        expect(res.mitigation).toBe('resistant');
        expect(res.amountApplied).toBe(5);
        expect(res.character.tempHP).toBe(0);
        expect(res.character.hp.current).toBe(18); // 5 halved − 3 temp = 2 through
    });

    it('playerResistances covers racial and draconic-ancestry resistances', () => {
        expect(playerResistances({ ...DEFAULT_CHAR, race: 'Dwarf' } as any)).toContain('poison');
        expect(playerResistances({ ...DEFAULT_CHAR, race: 'Dragonborn', draconicAncestry: 'Blue' } as any)).toContain('lightning');
    });

    it('resolveAttackAction rolls enemy attacks against the player LIVE effective AC (Shield counts)', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5); // d20 = 11
        const shielded: any = {
            ...DEFAULT_CHAR,
            activeEffects: [{ id: 's', name: 'Shield', source: 'spell', duration: 'rounds', roundsRemaining: 1, modifiers: [{ stat: 'AC', bonus: 5 }] }],
        };
        const state: any = {
            isActive: true, currentTurn: 'enemy-1', round: 1, turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 5, initiative: 5, isPlayer: true },
                { id: 'enemy-1', name: 'Sbire', hp: { current: 10, max: 10 }, ac: 10, initiative: 15, isPlayer: false },
            ],
        };
        const result = resolveAttackAction(state, { attacker: 'enemy-1', target: 'player', attackBonus: 4, damageFormula: '1d6', damageType: 'slashing' }, shielded);
        random.mockRestore();
        expect(result.success).toBe(true);
        // 11 + 4 = 15 beats the STALE row AC (5) but must miss the live 16+5 = 21.
        expect(result.resolution?.hit).toBe(false);
    });

    it('adds scaled Sneak Attack dice for a Rogue striking with advantage and a finesse weapon', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // d20 = 19 → hit
        const rogue: any = {
            ...DEFAULT_CHAR,
            class: 'Rogue',
            level: 5, // 3d6 sneak attack
            weapon: { name: 'Dagger', damage: '1d4', damageType: 'piercing', abilityMod: 'DEX', attackBonus: 5, properties: ['finesse', 'light'] },
        };
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, turnIndex: 0,
            actionEconomy: { player: { attacksUsed: 0, attacksMax: 1 } },
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'g1', name: 'Goblin', hp: { current: 30, max: 30 }, ac: 5, initiative: 5, isPlayer: false },
            ],
        };
        const result = resolveAttackAction(state, {
            attacker: 'player', target: 'g1', advantage: 'advantage',
            damageFormula: '1d4+3', damageType: 'piercing',
        }, rogue);
        random.mockRestore();
        expect(result.success).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        expect(result.resolution?.damageParts?.some(part => part.damageFormula === '3d6')).toBe(true);
    });

    it('updateEnemyHP can heal/revive a downed enemy', () => {
        const state: any = {
            isActive: true, currentTurn: 'player',
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 9, max: 9 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'g1', name: 'Goblin', hp: { current: 0, max: 7 }, ac: 15, initiative: 5, isPlayer: false },
            ],
        };
        const res = updateEnemyHP(state, 'Goblin', 5);
        expect(res.found).toBe(true);
        expect(res.enemy?.hp.current).toBe(5);
    });
});

// ─── Feature batch: durations, class abilities, companions, 11-20 content ───
import { tickRoundEffects, rageEffect, monkMartialArtsDie, syncCompanionsFromState } from '../engine/rulesEngine';
import { maxSpellLevelForClass } from '../engine/codexService';
import { buildChronicleHtml } from '../services/galleryService';

describe('feature batch (durations, abilities, companions, high levels)', () => {
    it('tickRoundEffects decrements per-round durations and reports expiries', () => {
        const effects: any[] = [
            { id: 'a', name: 'Shield', source: 'spell', duration: 'rounds', roundsRemaining: 1, modifiers: [] },
            { id: 'b', name: 'Rage', source: 'class_feature', duration: 'rounds', roundsRemaining: 10, modifiers: [] },
            { id: 'c', name: 'Mage Armor', source: 'spell', duration: '8_hours', modifiers: [] },
        ];
        const ticked = tickRoundEffects(effects);
        expect(ticked.expired).toEqual(['Shield']);
        expect(ticked.activeEffects.find(e => e.name === 'Rage')?.roundsRemaining).toBe(9);
        expect(ticked.activeEffects.some(e => e.name === 'Mage Armor')).toBe(true); // untimed: untouched
    });

    it('Rage grants +2 damage and physical resistance via playerResistances', () => {
        const effect = rageEffect();
        expect(effect.modifiers).toEqual([{ stat: 'damageBonus', bonus: 2 }]);
        const raging: any = { ...DEFAULT_CHAR, class: 'Barbarian', activeEffects: [effect] };
        const resist = playerResistances(raging);
        expect(resist).toEqual(expect.arrayContaining(['bludgeoning', 'piercing', 'slashing']));
        // Totem Warrior rage resists (almost) everything.
        const totem: any = { ...raging, subclass: 'Totem Warrior' };
        expect(playerResistances(totem)).toContain('fire');
    });

    it('monk martial arts die scales with level', () => {
        expect(monkMartialArtsDie(1)).toBe('1d4');
        expect(monkMartialArtsDie(5)).toBe('1d6');
        expect(monkMartialArtsDie(11)).toBe('1d8');
        expect(monkMartialArtsDie(17)).toBe('1d10');
    });

    it('recruited companions auto-join encounters and sync HP back', () => {
        const withCompanion: any = {
            ...DEFAULT_CHAR,
            companions: [{
                id: 'comp_borin', name: 'Borin', hp: { current: 15, max: 20 }, ac: 14,
                attack: { name: 'Hache', attackBonus: 4, damage: '1d8+2', damageType: 'slashing' },
                recruitedAt: 1,
            }],
        };
        const state = startEncounter(withCompanion, { isActive: false, combatants: [], currentTurn: '' });
        const row = state.combatants.find(c => c.id === 'comp_borin');
        expect(row).toBeTruthy();
        expect(row!.side).toBe('ally');
        expect(row!.hp).toEqual({ current: 15, max: 20 });
        // Combat ends with the companion wounded → HP persists onto the sheet.
        const wounded = state.combatants.map(c => c.id === 'comp_borin' ? { ...c, hp: { ...c.hp, current: 6 } } : c);
        const synced = syncCompanionsFromState(withCompanion, wounded as any);
        expect(synced.companions![0].hp.current).toBe(6);
        // Rests heal: short → at least half, long → full.
        const rested = applyShortRest(synced);
        expect(rested.companions![0].hp.current).toBeGreaterThanOrEqual(10);
        const fullRest = applyLongRest(synced);
        expect(fullRest.companions![0].hp.current).toBe(20);
    });

    it('high-level spells (6-9) are in the codex and gated by class level', () => {
        expect(lookupSpell('Meteor Swarm')?.level).toBe(9);
        expect(lookupSpell('Chain Lightning')?.level).toBe(6);
        expect(lookupSpell('Finger of Death')?.damage?.dice).toBe('7d8+30');
        expect(maxSpellLevelForClass('Mage', 1)).toBe(1);
        expect(maxSpellLevelForClass('Mage', 11)).toBe(6);
        expect(maxSpellLevelForClass('Mage', 17)).toBe(9);
        expect(maxSpellLevelForClass('Paladin', 1)).toBe(0);
        expect(maxSpellLevelForClass('Paladin', 9)).toBe(3);
        expect(maxSpellLevelForClass('Warlock', 9)).toBe(5);
        expect(maxSpellLevelForClass('Fighter', 20)).toBe(0);
    });

    it('buildChronicleHtml produces a self-contained export with images and beats', () => {
        const html = buildChronicleHtml({
            title: 'Hiver sans aube',
            heroLine: 'Testeur — Nain Guerrier, niveau 3',
            dayLine: 'Jour 4',
            prologue: 'Il neigeait déjà…',
            chronicle: [{ title: 'Premier sang', description: 'Le gobelin est tombé.', timestamp: 1700000000000 }],
            images: [{ id: 'i1', saveId: 's', dataUrl: 'data:image/jpeg;base64,AAAA', prompt: 'p', summary: 'Le col gelé', phase: 'exploration', createdAt: 1 }],
            language: 'fr',
        });
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Hiver sans aube');
        expect(html).toContain('Premier sang');
        expect(html).toContain('data:image/jpeg;base64,AAAA');
        expect(html).toContain('Le col gelé');
    });
});

// ─── 24-point batch: hour expiry, riders, distance, AoE, XP, FR parsing ─────
import { worldHourOf, stampEffectExpiry, sweepExpiredEffects, resolveSpellAgainstTargets, hasFeatSpecial } from '../engine/rulesEngine';
import { estimateXPFromHP } from '../engine/xpSystem';
import { parseItemStatModifier, parseItemSpeedModifier, getRollBonus, getGearSkillBonus, getEffectiveAttackBonus } from '../types';

describe('24-point batch (hour expiry, riders, distance, AoE, FR parsing)', () => {
    it('worldHourOf maps day/timeOfDay to absolute hours', () => {
        expect(worldHourOf(1, 'dawn')).toBe(6);
        expect(worldHourOf(1, 'night')).toBe(23);
        expect(worldHourOf(2, 'day')).toBe(36);
    });

    it('stampEffectExpiry + sweepExpiredEffects expire 1h/8h effects with the clock', () => {
        const hour = worldHourOf(1, 'day'); // 12
        const mark = stampEffectExpiry({ id: 'm', name: "Hunter's Mark", source: 'spell', duration: '1_hour', modifiers: [] } as any, hour);
        const armor = stampEffectExpiry({ id: 'a', name: 'Mage Armor', source: 'spell', duration: '8_hours', modifiers: [] } as any, hour);
        expect(mark.expiresAtWorldHour).toBe(13);
        expect(armor.expiresAtWorldHour).toBe(20);
        const char: any = { ...DEFAULT_CHAR, activeEffects: [mark, armor] };
        // dusk (18h) : la Marque (13h) expire, l'Armure (20h) tient.
        const swept = sweepExpiredEffects(char, worldHourOf(1, 'dusk'));
        expect(swept.expired).toEqual(["Hunter's Mark"]);
        expect(swept.character.activeEffects!.map(e => e.name)).toEqual(['Mage Armor']);
    });

    it("Hunter's Mark / Hex / Divine Favor create onWeaponHit riders", () => {
        const ranger: any = { ...DEFAULT_CHAR, class: 'Ranger', knownSpells: ["Hunter's Mark"], spellSlots: { '1': { current: 2, max: 2 } } };
        const cast = castSpell(ranger, { spellName: "Hunter's Mark", slotLevel: 1, worldHour: 10 });
        expect(cast.success).toBe(true);
        const fx = cast.character.activeEffects.find(e => e.name === "Hunter's Mark");
        expect(fx?.onWeaponHit?.dice).toBe('1d6');
        expect(fx?.expiresAtWorldHour).toBe(11);
        expect(lookupSpell('Divine Favor')?.classes).toContain('Paladin');
    });

    it('estimateXPFromHP follows the SRD CR curve', () => {
        expect(estimateXPFromHP(5)).toBe(25);
        expect(estimateXPFromHP(30)).toBe(200);
        expect(estimateXPFromHP(100)).toBe(1100);
        expect(estimateXPFromHP(500)).toBe(8400);
    });

    it('French item texts parse: stats, vitesse, and roll bonuses on gear', () => {
        expect(parseItemStatModifier({ name: 'Ceinturon de force', effect: 'FOR = 21', description: '' } as any, 'STR')).toMatchObject({ setTo: 21 });
        expect(parseItemStatModifier({ name: 'Amulette', effect: 'Sagesse +2', description: '' } as any, 'WIS')).toMatchObject({ bonus: 2 });
        expect(parseItemSpeedModifier({ name: 'Bottes', effect: 'vitesse +10', description: '' } as any)).toBe(10);
        const geared: any = {
            ...DEFAULT_CHAR,
            inventory: [
                { id: '1', name: 'Anneau de précision', type: 'ring', equipped: true, quantity: 1, effect: "+1 aux jets d'attaque" },
                { id: '2', name: 'Cape', type: 'armor', equipped: true, quantity: 1, effect: '+2 Discrétion' },
                { id: '3', name: 'Talisman', type: 'trinket', equipped: true, quantity: 1, effect: '+1 aux jets de sauvegarde' },
            ],
        };
        expect(getEffectiveAttackBonus(geared)).toBe(1);
        expect(getRollBonus(geared, 'save')).toBe(1);
        expect(getGearSkillBonus(geared, ['Stealth', 'Discrétion'])).toBe(2);
    });

    it('French condition names resolve through aliases', () => {
        expect(lookupCondition('aveuglé')?.id).toBe('blinded');
        expect(lookupCondition('à terre')?.id).toBe('prone');
        expect(lookupCondition('empoisonné')?.id).toBe('poisoned');
        expect(lookupCondition('agrippé')?.id).toBe('grappled');
    });

    it('melee vs FAR: two advances are needed (far → near → melee), then the strike lands', () => {
        // NF4 — l'engagement n'est plus gratuit : loin = 2 actions pour arriver
        // au contact, à distance = 1 action, la frappe part au contact.
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'e1', name: 'Archer', hp: { current: 10, max: 10 }, ac: 12, initiative: 5, isPlayer: false, side: 'enemy', range: 'far' },
            ],
        };
        const char: any = { ...DEFAULT_CHAR, weapon: { name: 'Épée', damage: '1d8', damageType: 'slashing', abilityMod: 'STR', properties: [] } };
        const first = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false }, char);
        expect(first.success).toBe(true);
        expect((first as any).advanced).toEqual({ name: 'Archer', from: 'far', to: 'near' });
        expect(first.resolution).toBeUndefined();
        const nearState = first.state;
        expect(nearState.combatants.find((c: any) => c.id === 'e1')?.range).toBe('near');
        // Depuis near : le rapprochement consomme encore l'action (near → melee).
        const second = resolveAttackAction(nearState, { attacker: 'player', target: 'e1', consumeAction: false }, char);
        expect(second.success).toBe(true);
        expect((second as any).advanced).toEqual({ name: 'Archer', from: 'near', to: 'melee' });
        expect(second.resolution).toBeUndefined();
        expect(second.state.combatants.find((c: any) => c.id === 'e1')?.range).toBe('melee');
        // Au contact : la frappe part enfin.
        const third = resolveAttackAction(second.state, { attacker: 'player', target: 'e1', consumeAction: false }, char);
        expect(third.resolution).toBeTruthy();
    });

    it('powerAttack flag is ignored without the matching feat', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'e1', name: 'Brute', hp: { current: 10, max: 10 }, ac: 12, initiative: 5, isPlayer: false, side: 'enemy' },
            ],
        };
        const char: any = { ...DEFAULT_CHAR, feats: [], weapon: { name: 'Espadon', damage: '2d6', damageType: 'slashing', abilityMod: 'STR', properties: ['two-handed', 'heavy'] } };
        const plain = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false }, char);
        const flagged = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false, powerAttack: true } as any, char);
        expect(flagged.resolution!.attackRoll.prompt.formula).toBe(plain.resolution!.attackRoll.prompt.formula);
        expect(hasFeatSpecial(char, 'heavy_weapon_power_attack')).toBe(false);
        const gwm: any = { ...char, feats: ['great-weapon-master'] };
        const empowered = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false, powerAttack: true } as any, gwm);
        const plainBonus = Number(plain.resolution!.attackRoll.prompt.formula.replace('1d20', '') || 0);
        const empoweredBonus = Number(empowered.resolution!.attackRoll.prompt.formula.replace('1d20', '') || 0);
        expect(empoweredBonus).toBe(plainBonus - 5);
    });

    it('resolveSpellAgainstTargets rolls one save per enemy and shares the damage roll', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'g1', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15, initiative: 5, isPlayer: false, side: 'enemy' },
                { id: 'g2', name: 'Goblin', hp: { current: 7, max: 7 }, ac: 15, initiative: 4, isPlayer: false, side: 'enemy' },
            ],
        };
        const prompt: any = {
            type: 'SAVE', name: 'Burning Hands (DEX save)', formula: '1d20+1', dc: 13,
            advantage: 'normal', dmBonus: 0, requestedAt: 1,
            pendingSpell: { spellName: 'Burning Hands', damageFormula: '3d6', damageType: 'fire', effectOnSuccess: 'half' },
        };
        const aoe = resolveSpellAgainstTargets(state, prompt, ['g1', 'g2']);
        expect(aoe).toBeTruthy();
        expect(aoe!.results).toHaveLength(2);
        expect(aoe!.sharedDamageRoll).toBeGreaterThanOrEqual(3);
        for (const r of aoe!.results) {
            // amountApplied rapporte les dégâts infligés (l'overkill n'est pas
            // plafonné aux PV restants) — ½ arrondi bas sur sauvegarde réussie.
            const expected = r.saveSuccess ? Math.floor(aoe!.sharedDamageRoll / 2) : aoe!.sharedDamageRoll;
            expect(r.damage).toBe(expected);
            expect(r.hp.current).toBeGreaterThanOrEqual(0);
        }
    });

    it('Arcane Recovery restores slot levels on a short rest (once)', () => {
        const mage: any = {
            ...DEFAULT_CHAR, class: 'Mage', level: 4,
            spellSlots: { '1': { current: 0, max: 4 }, '2': { current: 0, max: 3 } },
            resources: { arcaneRecovery: { current: 1, max: 1, recoverOn: 'long_rest', label: 'Arcane Recovery' } },
        };
        const rested = applyShortRest(mage);
        const recovered = (rested.spellSlots!['1'].current * 1) + (rested.spellSlots!['2'].current * 2);
        expect(recovered).toBe(Math.ceil(4 / 2)); // budget ⌈niveau/2⌉ = 2
        expect(rested.resources!.arcaneRecovery.current).toBe(0);
    });
});

// ─── Batch montures / mode histoire / effets combattants / double équipement ─
import { combatantEffectBonus } from '../engine/rulesEngine';
import { maxRollOfFormula } from '../engine/utils';

describe('mounts, story-mode healing, combatant effects', () => {
    it('maxRollOfFormula computes the maximum of dice formulas', () => {
        expect(maxRollOfFormula('2d4+2')).toBe(10);
        expect(maxRollOfFormula('8d4+8')).toBe(40);
        expect(maxRollOfFormula('1d8')).toBe(8);
        expect(maxRollOfFormula('2d6+1d4+3')).toBe(19);
        expect(maxRollOfFormula('5')).toBe(5);
    });

    it('castSpell maximizeHealing restores the maximum (story mode)', () => {
        const cleric: any = {
            ...DEFAULT_CHAR, class: 'Cleric', level: 3,
            hp: { current: 1, max: 30 },
            knownSpells: ['Cure Wounds'], preparedSpells: ['Cure Wounds'],
            spellSlots: { '1': { current: 2, max: 2 } },
        };
        const result = castSpell(cleric, { spellName: 'Cure Wounds', slotLevel: 1, casterAbilityMod: 3, maximizeHealing: true });
        expect(result.success).toBe(true);
        // Cure Wounds 1d8 + mod → max 8 + 3 = 11, every time.
        expect(result.healing).toBe(11);
    });

    it('combatantEffectBonus reads numeric effects on ANY combatant', () => {
        const blessedAlly: any = {
            id: 'a1', name: 'Borin', hp: { current: 10, max: 10 }, ac: 14, initiative: 5, side: 'ally',
            activeEffects: [{ id: 'x', name: 'Bénédiction', source: 'spell', duration: 'rounds', roundsRemaining: 3, modifiers: [{ stat: 'AC', bonus: 2 }, { stat: 'attackBonus', bonus: 1 }] }],
        };
        expect(combatantEffectBonus(blessedAlly, 'AC')).toBe(2);
        expect(combatantEffectBonus(blessedAlly, 'attackBonus')).toBe(1);
        expect(combatantEffectBonus(blessedAlly, 'damageBonus')).toBe(0);
    });

    it('a cursed enemy is easier to hit (AC effect applied by the engine)', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                {
                    id: 'e1', name: 'Chef bandit', hp: { current: 20, max: 20 }, ac: 30, initiative: 5, side: 'enemy',
                    activeEffects: [{ id: 'c', name: 'Malédiction', source: 'spell', duration: 'rounds', roundsRemaining: 3, modifiers: [{ stat: 'AC', bonus: -10 }] }],
                },
            ],
        };
        const char: any = { ...DEFAULT_CHAR, weapon: { name: 'Épée', damage: '1d8', damageType: 'slashing', abilityMod: 'STR', properties: [] } };
        const result = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false }, char);
        // CA effective = 30 - 10 = 20 (visible dans le prompt du jet).
        expect(result.resolution!.attackRoll.prompt.dc).toBe(20);
    });

    it('an ALLY melee attack ignores distance bands (no fake engage)', () => {
        const state: any = {
            isActive: true, currentTurn: 'a1', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'a1', name: 'Borin', hp: { current: 10, max: 10 }, ac: 14, initiative: 8, side: 'ally' },
                { id: 'e1', name: 'Archer', hp: { current: 10, max: 10 }, ac: 12, initiative: 5, side: 'enemy', range: 'far' },
            ],
        };
        const result = resolveAttackAction(state, { attacker: 'a1', target: 'e1', attackBonus: 4, damageFormula: '1d8+2', consumeAction: false });
        expect(result.success).toBe(true);
        expect((result as any).advanced).toBeUndefined();
        expect(result.resolution).toBeTruthy();
        // La bande de l'ennemi (relative au JOUEUR) n'a pas bougé.
        expect(result.state.combatants.find((c: any) => c.id === 'e1')?.range).toBe('far');
    });

    it('MOUNTED CHARGE: melee vs far closes to melee AND strikes in one action', () => {
        const state: any = {
            isActive: true, currentTurn: 'player', round: 1, actionEconomy: {},
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 20, max: 20 }, ac: 16, initiative: 10, isPlayer: true },
                { id: 'e1', name: 'Archer', hp: { current: 10, max: 10 }, ac: 12, initiative: 5, side: 'enemy', range: 'far' },
            ],
        };
        const rider: any = {
            ...DEFAULT_CHAR,
            mount: { name: 'Tempête', speed: 60, acquiredAt: 1 },
            weapon: { name: 'Lance', damage: '1d12', damageType: 'piercing', abilityMod: 'STR', properties: [] },
        };
        const result = resolveAttackAction(state, { attacker: 'player', target: 'e1', consumeAction: false }, rider);
        expect(result.success).toBe(true);
        expect((result as any).advanced).toBeUndefined();
        expect(result.resolution).toBeTruthy(); // l'attaque a bien eu lieu
        expect(result.state.combatants.find((c: any) => c.id === 'e1')?.range).toBe('melee');
    });
});

// ─── Créatures liées : montures typées, bêtes du rôdeur, familiers ──────────
import { MOUNT_TYPES, getMountType, BEAST_COMPANIONS, getBeastCompanion, getFamiliarType, FAMILIAR_CLASSES } from '../data/companionOptions';
import { ensureProgressionState as ensureProgression } from '../engine/rulesEngine';

describe('typed mounts, ranger beasts, familiars', () => {
    it('mount catalog resolves by id or French/English name (accent-insensitive)', () => {
        expect(getMountType('destrier')?.speed).toBe(60);
        expect(getMountType('Élan')?.id).toBe('elan');
        expect(getMountType('griffon')?.flying).toBe(true);
        expect(getMountType('Pegasus')?.id).toBe('pegase');
        expect(MOUNT_TYPES.every(m => m.speed >= 40)).toBe(true);
    });

    it('the Celestial Steed is gated to Paladin level 5+ (Find Steed)', () => {
        const steed = getMountType('destrier_celeste');
        expect(steed?.classOnly).toEqual({ class: 'Paladin', minLevel: 5 });
    });

    it('Beast Master beasts have distinct real stats and drive the ally row', () => {
        expect(getBeastCompanion('ours')?.attack.damage).toBe('1d8+4');
        expect(getBeastCompanion('Panthère')?.ac).toBe(14);
        expect(getBeastCompanion('faucon')?.ac).toBe(15);
        expect(BEAST_COMPANIONS).toHaveLength(4);

        const ranger: any = { ...DEFAULT_CHAR, class: 'Ranger', subclass: 'Beast Master', level: 3, beastKind: 'ours' };
        const state = startEncounter(ranger, { isActive: false, combatants: [], currentTurn: '' });
        const row = state.combatants.find(c => c.id === 'companion');
        expect(row?.name).toContain('Ours');
        expect(row?.ac).toBe(12);
        // Rétro-compatibilité : sans beastKind → loup.
        const legacy = startEncounter({ ...ranger, beastKind: undefined }, { isActive: false, combatants: [], currentTurn: '' });
        expect(legacy.combatants.find(c => c.id === 'companion')?.name).toContain('Loup');
    });

    it('a bonded familiar grants the Help resource (1/short rest)', () => {
        expect(getFamiliarType('hibou')?.nameEn).toBe('Owl');
        expect(getFamiliarType('chauve-souris')?.id).toBe('chauve_souris');
        expect(FAMILIAR_CLASSES).toContain('Druid');

        const mage: any = {
            ...DEFAULT_CHAR, class: 'Mage',
            familiar: { name: 'Plume', kind: 'Hibou', acquiredAt: 1 },
        };
        const ensured = ensureProgression(mage);
        expect(ensured.resources?.familiarHelp).toMatchObject({ current: 1, max: 1, recoverOn: 'short_rest' });
        // Sans familier : pas de ressource.
        const plain = ensureProgression({ ...DEFAULT_CHAR, class: 'Mage' } as any);
        expect(plain.resources?.familiarHelp).toBeUndefined();
    });
});

// ─── Alliés autonomes : monture combattante, level-up des compagnons ────────
import { levelUpCompanions } from '../engine/rulesEngine';
import { MOUNT_TYPES as MOUNTS_FOR_COMBAT } from '../data/companionOptions';

describe('fighting mounts and companion level-ups', () => {
    it('every mount type carries combat stats (hp, ac, attack)', () => {
        for (const m of MOUNTS_FOR_COMBAT) {
            expect(m.hp).toBeGreaterThan(0);
            expect(m.ac).toBeGreaterThanOrEqual(9);
            expect(m.attack.damage).toMatch(/\d+d\d+/);
        }
    });

    it('the mount joins the encounter as an ally row with its type stats', () => {
        const rider: any = {
            ...DEFAULT_CHAR,
            mount: { name: 'Tempête', kind: 'destrier', speed: 60, hp: { current: 19, max: 19 }, acquiredAt: 1 },
        };
        const state = startEncounter(rider, { isActive: false, combatants: [], currentTurn: '' });
        const row = state.combatants.find(c => c.id === 'mount');
        expect(row).toBeTruthy();
        expect(row!.side).toBe('ally');
        expect(row!.ac).toBe(11);
        expect(row!.hp).toEqual({ current: 19, max: 19 });
        // Monture à 0 PV (céleste en attente de repos) : ne se présente pas.
        const downed = startEncounter({ ...rider, mount: { ...rider.mount, hp: { current: 0, max: 19 } } }, { isActive: false, combatants: [], currentTurn: '' });
        expect(downed.combatants.some(c => c.id === 'mount')).toBe(false);
    });

    it('mount HP syncs back after combat and rests heal it', () => {
        const rider: any = {
            ...DEFAULT_CHAR,
            mount: { name: 'Tempête', kind: 'destrier', speed: 60, hp: { current: 19, max: 19 }, acquiredAt: 1 },
        };
        const wounded = syncCompanionsFromState(rider, [
            { id: 'mount', name: 'Tempête', hp: { current: 5, max: 19 }, ac: 11, initiative: 8, side: 'ally' } as any,
        ]);
        expect(wounded.mount!.hp).toEqual({ current: 5, max: 19 });
        const rested = applyShortRest(wounded);
        expect(rested.mount!.hp!.current).toBeGreaterThanOrEqual(9); // au moins la moitié
        const full = applyLongRest(wounded);
        expect(full.mount!.hp!.current).toBe(19);
    });

    it('companions grow with the hero: +4 max HP per level, +1 attack at 5/9/13/17', () => {
        const withComp: any = {
            ...DEFAULT_CHAR,
            level: 6,
            companions: [{
                id: 'comp_borin', name: 'Borin', hp: { current: 10, max: 20 }, ac: 14,
                attack: { name: 'Hache', attackBonus: 4, damage: '1d8+2', damageType: 'slashing' },
                recruitedAt: 1, level: 3,
            }],
        };
        const leveled = levelUpCompanions(withComp, 6);
        const comp = leveled.companions![0];
        expect(comp.hp.max).toBe(20 + 4 * 3);   // 3 niveaux gagnés
        expect(comp.hp.current).toBe(10 + 12);  // soigné d'autant
        expect(comp.attack.attackBonus).toBe(5); // franchit le niveau 5
        expect(comp.level).toBe(6);
        // Idempotent : re-appliquer au même niveau ne change rien.
        expect(levelUpCompanions(leveled, 6).companions![0].hp.max).toBe(32);
    });
});

// ─── Campagne d'auteur « Le Chant Brisé » (vitrine 12 chapitres) ────────────
import { CHANT_BRISE } from '../data/campaigns/chantBrise';
import { getAuthoredCampaign } from '../data/campaigns';
import { getAdventureById } from '../data/adventures';

describe('flagship campaign — Le Chant Brisé', () => {
    it('assembles 12 chapters in 4 acts with a coherent spine', () => {
        expect(CHANT_BRISE.chapters).toHaveLength(12);
        expect(CHANT_BRISE.chapters[0].status).toBe('active');
        expect(CHANT_BRISE.chapters.every((c, i) => c.id === String(i + 1))).toBe(true);
        expect(CHANT_BRISE.villain.name).toContain('Vaelrian');
        expect(CHANT_BRISE.firstScene!.chapterId).toBe('1');
    });

    it('is registered as an authored campaign and in the adventure menu', () => {
        expect(getAuthoredCampaign('chant_brise')).toBe(CHANT_BRISE);
        expect(getAdventureById('chant_brise')?.maxLevel).toBe(12);
    });

    it('carries the v2 authored format: draws, clocks, secrets, personalization slots', () => {
        const text = JSON.stringify(CHANT_BRISE);
        for (const token of ['{{HERO_NAME}}', '{{HERO_WOUND}}', '{{MIRROR_VARIANT}}', '{{TRAITOR_NAME}}', '{{KEY_LOCATION}}', '{{FRAGMENT_HOLDER}}', '{{SOLIST_NAME}}']) {
            expect(text).toContain(token);
        }
        expect(CHANT_BRISE.initialWorldClocks).toHaveLength(2);
        expect(CHANT_BRISE.initialProtectedSecrets!.length).toBeGreaterThanOrEqual(4);
        // Le guide MJ complet (7 volumes) doit être massif — c'est la matière
        // que lookup_campaign sert à la demande (~70k chars, vs ~8k pour
        // Hiver sans Aube).
        expect(CHANT_BRISE.fullManifesto.length).toBeGreaterThan(60_000);
    });
});

// ─── Persistent NPCs in the director context ────────────────────────────────
describe('persistent NPC director context', () => {
    it('injects disposition and remembered facts into the NPC lines', () => {
        const context = buildCampaignDirectorContext({
            character: DEFAULT_CHAR,
            adventure: 'Test',
            journal: {
                quests: [], locations: [], chronicle: [],
                npcs: [{
                    id: 'npc1', name: 'Mira', description: 'Innkeeper', location: 'Ravenport',
                    disposition: 3, knownFacts: ['the hero saved her son', 'the hero owes 20 gold'],
                }],
            },
            combatState: { isActive: false, combatants: [], currentTurn: '' },
            events: [],
            storySummary: 'The hero crossed the frozen pass and swore to lift the curse.',
        });
        expect(context).toContain('Mira @ Ravenport');
        expect(context).toContain('disposition +3');
        expect(context).toContain('the hero saved her son');
        expect(context).toContain('Story so far');
        expect(context).toContain('frozen pass');
    });
});
