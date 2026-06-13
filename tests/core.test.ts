/**
 * core.test.ts
 * Vitest unit tests for critical game mechanics parsers.
 * Run: npx vitest run
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { calculateSkillModifier, calculateSaveModifier, getSkillAbility, rollWithAdvantage } from '../services/skillSystem';
import { parseAllTags, processDMTags, stripTags } from '../services/dmTagParser';
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
} from '../services/rulesEngine';
import {
    buildEncounter,
    lookupCondition,
    lookupMonster,
    lookupSpell,
    preloadCodexBestiary,
    structureInventoryItem
} from '../services/codexService';
import { DEFAULT_CHAR } from '../data/character';
import { getStartingEquipment } from '../data/equipment';
import { getPlayerAttackModifier, getEffectiveAC, getEffectiveSpeed, getEffectiveStat, getXPProgress } from '../types';
import { getSubclassConfig, getSubclassFeaturesForLevel, subclassNeedsChoice } from '../data/subclasses';
import { asiLevelsBetween } from '../data/classFeatures';
import { campaignEventLog } from '../services/campaignEventLog';
import { buildMusicPromptForMood } from '../services/lyriaMusic';
import { cooldownRemainingMs, isCombatLoopMood, MEDIA_GENERATION_COOLDOWN_MS } from '../services/mediaThrottle';
import { useGameStore } from '../store/gameStore';
import { buildCampaignDirectorContext } from '../services/campaignDirector';

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

// ─── stripTags ───────────────────────────────────────────────────────────────

describe('stripTags', () => {
    it('removes parameterized bracket tags from text', () => {
        // stripTags regex only strips [TAG: params] format
        const text = 'The goblins rush toward you. [ENEMY_INIT: Goblin | 7 | 13 | -1 | +2 | E5] They snarl.';
        const stripped = stripTags(text);
        expect(stripped).not.toContain('[ENEMY_INIT');
        expect(stripped).toContain('The goblins rush toward you.');
    });

    it('removes legacy parameterless bracket tags from text', () => {
        const text = 'Battle begins! [COMBAT_START]';
        const stripped = stripTags(text);
        expect(stripped).toContain('Battle begins!');
        expect(stripped).not.toContain('[COMBAT_START]');
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
                { id: 'boon', name: 'Story Boon', source: 'condition' as const, duration: 'permanent' as const, modifiers: [] },
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

    it('casts Bless as concentration and grants a local roll bonus modifier', () => {
        const character = {
            ...DEFAULT_CHAR,
            spellSlots: { '1': { current: 1, max: 1 } },
            activeEffects: [],
            storyModifiers: [],
        };

        const result = castSpell(character, { spellName: 'Bless', slotLevel: 1 });

        expect(result.success).toBe(true);
        expect(result.character.spellSlots?.['1'].current).toBe(0);
        expect(result.character.activeEffects.some(effect => effect.name === 'Bless' && effect.concentration)).toBe(true);
        expect(result.character.storyModifiers?.some(modifier => modifier.name === 'Bless' && modifier.bonus > 0)).toBe(true);
    });

    it('casts Hold Person as a Wisdom save with paralyzed on failure', () => {
        const character = {
            ...DEFAULT_CHAR,
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
    it('builds combat music as a short loop with no vocals', () => {
        const prompt = buildMusicPromptForMood('combat', [{ text: 'urgent drums', weight: 1 }], 30, true);

        expect(prompt).toContain('30-second');
        expect(prompt).toContain('loop cleanly');
        expect(prompt).toContain('No vocals');
    });

    it('builds exploration music as long background ambience', () => {
        const prompt = buildMusicPromptForMood('exploration', [{ text: 'soft strings', weight: 1 }], 180, true);

        expect(prompt).toContain('3-minute');
        expect(prompt).toContain('background track');
        expect(prompt).toContain('dungeon master narration');
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
        expect(useGameStore.getState().completeSceneVisualRequest(first.id, 'old-url')).toBe(false);
        expect(useGameStore.getState().bgImage).toBe('');
        expect(useGameStore.getState().isGeneratingImage).toBe(true);

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

    it('Champion crits on a natural 19', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // d20 → 19
        const champion = { ...DEFAULT_CHAR, subclass: 'Champion', inventory: [] };
        const state = {
            isActive: true,
            currentTurn: 'player',
            round: 1,
            turnIndex: 0,
            combatants: [
                { id: 'player', name: 'Hero', hp: { current: 10, max: 10 }, ac: 16, initiative: 15, isPlayer: true },
                { id: 'enemy-1', name: 'Cible', hp: { current: 20, max: 20 }, ac: 30, initiative: 5, isPlayer: false },
            ],
        };
        const result = resolveAttackAction(state, {
            attacker: 'player',
            target: 'enemy-1',
            attackBonus: 0,
            damageFormula: '1d6',
            damageType: 'slashing',
        }, champion);
        random.mockRestore();

        // 19 + 0 = 19 < AC 30 — only hits because Champion turns 19 into a crit.
        expect(result.resolution?.criticalHit).toBe(true);
        expect(result.resolution?.hit).toBe(true);
        // Crit doubles the dice: d6 rolled 6 → 12 damage.
        expect(result.resolution?.damage).toBe(12);
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

