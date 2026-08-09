import { Combatant, combatantSide, isHero } from '../components/CombatTracker';
export { combatantSide, isHero } from '../components/CombatTracker';
import { getCreature, getCreatureAttacks } from '../data/bestiary';
import { getFeatById } from '../data/feats';
import { getSneakAttackDice } from '../data/classFeatures';
import { RACE_DATA } from '../data/races';
import {
    ActiveEffect,
    Ability,
    CharacterSheet,
    CodexDamageType,
    ConditionEntry,
    SpellEntry,
    StoryRollModifier,
    calculateLevelFromXP,
    getCombatAC,
    getEffectiveAC,
    getEffectiveStat,
    getPlayerAttackModifier,
    getPlayerDamageBonus,
    getPlayerAttackCount,
    getDraconicDamageType,
    Item
} from '../types';
import { getEnemyXP } from './xpSystem';
import {
    getScaledSpellDice,
    lookupCondition,
    lookupMonster,
    lookupSpell,
    normalizeDamageType
} from './codexService';
import { clampAC, clampHP, clampStatModifier, clampXP } from './gameValidator';
import { rollDice, maxRollOfFormula } from './utils';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType } from '../data/companionOptions';

export type RollKind = 'CHECK' | 'SAVE' | 'ATTACK' | 'DAMAGE' | 'DEATH_SAVE';
export type AdvantageMode = 'normal' | 'advantage' | 'disadvantage';

export interface RollPromptState {
    type: RollKind;
    name: string;
    dc: number;
    formula: string;
    advantage: AdvantageMode;
    dmBonus: number;
    requestedAt?: number;
    contextReasons?: string[];
    coverBonus?: number;
    concentrationDamage?: number;
    autoFail?: boolean;
    pendingSpell?: {
        spellName: string;
        target?: string;
        targetId?: string;
        damageFormula?: string;
        damageType?: CodexDamageType;
        conditionOnFailure?: string;
        effectOnSuccess?: 'none' | 'half' | 'negates';
        slotLevel?: number;
    };
    /**
     * BLOCKING two-step roll: when this prompt came from a request_roll /
     * cast_spell tool call, the tool RESPONSE is held until the player rolls
     * and this resolver delivers the real outcome through it. Returns true if
     * the outcome was delivered via the held tool response; false when the
     * hold already settled (dismiss/timeout) and the caller must fall back to
     * a [ROLL_RESULT] user message. Never serialized (functions are dropped).
     */
    resolveToolCall?: (payload: Record<string, unknown>) => boolean;
}

export interface RollOutcome {
    prompt: RollPromptState;
    total: number;
    die: number;
    rolls: number[];
    modifier: number;
    success: boolean;
    critical: 'none' | 'success' | 'failure';
    formulaLabel: string;
}

export interface StoryModifierApplication {
    prompt: RollPromptState;
    applied: StoryRollModifier[];
    remaining: StoryRollModifier[];
}

export interface RollContextInput {
    actorEffects?: ActiveEffect[];
    targetEffects?: ActiveEffect[];
    coverBonus?: number;
    isMeleeAttack?: boolean;
}

export interface RollContextResult {
    prompt: RollPromptState;
    reasons: string[];
    coverBonus: number;
}

export interface EncounterState {
    isActive: boolean;
    combatants: Combatant[];
    currentTurn: string;
    round?: number;
    turnIndex?: number;
    actionEconomy?: Record<string, TurnEconomy>;
    logs?: CombatLogEntry[];
    /** Hybrid enemy targeting: MJ-set standing intents, enemy combatant id -> hero id. */
    enemyIntents?: Record<string, string>;
}

export interface TurnEconomy {
    actionUsed: boolean;
    bonusActionUsed: boolean;
    reactionUsed: boolean;
    movementUsed: number;
    movementMax: number;
    extraAttackUsed?: boolean;
    // Count-based "action pips" (mainly for the player HUD). The main action can
    // yield several attacks (Extra Attack) consumed one click at a time, and the
    // DM can grant extra actions/bonus actions. attacksMax/bonusMax are reset each
    // turn; the player's attacksMax is overridden to getPlayerAttackCount on their
    // turn start. actionUsed/bonusActionUsed stay in sync (used >= max) so all the
    // existing boolean checks keep working.
    attacksMax?: number;
    attacksUsed?: number;
    bonusMax?: number;
    bonusUsed?: number;
}

export interface CombatLogEntry {
    id: string;
    timestamp: number;
    text: string;
    type: 'turn' | 'attack' | 'damage' | 'condition' | 'system';
}

export interface AttackResolution {
    attacker: string;
    target: string;
    attackRoll: RollOutcome;
    hit: boolean;
    criticalHit: boolean;
    damage: number;
    rawDamage?: number;
    damageFormula: string;
    damageType: string;
    attackName?: string;
    damageParts?: {
        damageFormula: string;
        damageType: string;
        rawDamage: number;
        damage: number;
        mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable';
    }[];
    mitigation?: 'normal' | 'resistant' | 'immune' | 'vulnerable';
    targetHP: { current: number; max: number };
    state: EncounterState;
    log: CombatLogEntry;
}

export interface SpellCastResult {
    success: boolean;
    error?: string;
    spell?: SpellEntry;
    character: CharacterSheet;
    consumedSlot?: number;
    prompt?: RollPromptState;
    healing?: number;
    damageFormula?: string;
    damageType?: CodexDamageType;
    conditionOnFailure?: string;
    activeEffect?: ActiveEffect;
    storyModifier?: StoryRollModifier;
    concentrationReplaced?: string[];
    summary: string;
}

export interface CombatantLookupResult {
    combatant?: Combatant;
    index: number;
    ambiguous: boolean;
    matches: Combatant[];
}

export interface PendingSpellResolution {
    resolved: boolean;
    state: EncounterState;
    summary: string;
    target?: Combatant;
    damage?: number;
    rawDamage?: number;
    damageType?: CodexDamageType;
    conditionApplied?: string;
    mitigation?: 'normal' | 'resistant' | 'immune' | 'vulnerable';
    ambiguous?: boolean;
}

export interface ConcentrationCheckResult {
    character: CharacterSheet;
    dc: number;
    broken: boolean;
    removedEffects: ActiveEffect[];
    prompt?: RollPromptState;
}

const TYPE_KEYWORDS: Array<[RollKind, string[]]> = [
    ['DEATH_SAVE', ['death save', 'death saving', 'jet de mort', 'sauvegarde contre la mort']],
    ['ATTACK', ['attack', 'attaque', 'strike', 'hit roll', 'to hit']],
    ['SAVE', ['save', 'saving throw', 'sauvegarde', 'jet de sauvegarde']],
    ['DAMAGE', ['damage', 'degat', 'degats', 'dommage']],
];

function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2);
}

function makeLog(text: string, type: CombatLogEntry['type'] = 'system'): CombatLogEntry {
    return {
        id: `combat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        text,
        type,
    };
}

function baseTurnEconomy(): TurnEconomy {
    return {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        movementMax: 30,
        extraAttackUsed: false,
        attacksMax: 1,
        attacksUsed: 0,
        bonusMax: 1,
        bonusUsed: 0,
    };
}

// Deterministic initiative ordering: initiative desc, then DEX modifier desc,
// then players before enemies, then a stable id/name tie-break so equal
// initiative never produces a non-deterministic (array-insertion-order) feel.
function byInitiative(a: Combatant, b: Combatant): number {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    const aDex = Number((a as any).dexMod ?? 0);
    const bDex = Number((b as any).dexMod ?? 0);
    if (bDex !== aDex) return bDex - aDex;
    if (Boolean(a.isPlayer) !== Boolean(b.isPlayer)) return a.isPlayer ? -1 : 1;
    return String(a.id || a.name).localeCompare(String(b.id || b.name));
}

function livingCombatants(state: EncounterState): Combatant[] {
    return [...(state.combatants || [])]
        .filter(c => c.hp.current > 0)
        .sort(byInitiative);
}

function combatantKey(combatant: Combatant): string {
    return combatant.id || combatant.name;
}

export function resolveCombatantReference(
    state: EncounterState,
    reference: string,
    options: { enemyOnly?: boolean; livingOnly?: boolean; autoResolve?: boolean } = {}
): CombatantLookupResult {
    const ref = String(reference || '').trim();
    const all = state.combatants || [];
    if (!ref) return { index: -1, ambiguous: false, matches: [] };

    const idIndex = all.findIndex(c => c.id === ref);
    if (idIndex >= 0) {
        const combatant = all[idIndex];
        if (options.enemyOnly && combatant.isPlayer) return { index: -1, ambiguous: false, matches: [] };
        if (options.livingOnly && combatant.hp.current <= 0) return { index: -1, ambiguous: false, matches: [] };
        return { combatant, index: idIndex, ambiguous: false, matches: [combatant] };
    }

    const lower = ref.toLowerCase();
    const matches = all
        .map((combatant, index) => ({ combatant, index }))
        .filter(({ combatant }) => combatant.name.toLowerCase() === lower)
        .filter(({ combatant }) => !options.enemyOnly || !combatant.isPlayer)
        .filter(({ combatant }) => !options.livingOnly || combatant.hp.current > 0);

    if (matches.length === 1) {
        return {
            combatant: matches[0].combatant,
            index: matches[0].index,
            ambiguous: false,
            matches: [matches[0].combatant],
        };
    }

    // When several combatants share a name and the caller opts in to
    // auto-resolution, deterministically pick a single match instead of
    // hard-rejecting (which stalls combat). Prefer the first LIVING match,
    // using lowest current hp as a tiebreak and array order to stay stable.
    if (matches.length > 1 && options.autoResolve) {
        const living = matches.filter(({ combatant }) => combatant.hp.current > 0);
        const pool = living.length ? living : matches;
        const picked = [...pool].sort((a, b) => {
            if (a.combatant.hp.current !== b.combatant.hp.current) return a.combatant.hp.current - b.combatant.hp.current;
            return a.index - b.index;
        })[0];
        return {
            combatant: picked.combatant,
            index: picked.index,
            ambiguous: false,
            matches: matches.map(match => match.combatant),
        };
    }

    return {
        index: -1,
        ambiguous: matches.length > 1,
        matches: matches.map(match => match.combatant),
    };
}

function currentTurnIndex(state: EncounterState, combatants = livingCombatants(state)): number {
    if (!combatants.length) return 0;
    const currentIndex = combatants.findIndex(c => c.id === state.currentTurn || c.name === state.currentTurn);
    if (currentIndex >= 0) return currentIndex;
    return Math.max(0, Math.min(state.turnIndex || 0, combatants.length - 1));
}

function syncCurrentTurn(state: EncounterState): EncounterState {
    const living = livingCombatants(state);
    if (!living.length) return { ...state, currentTurn: '', turnIndex: 0 };
    const turnIndex = currentTurnIndex(state, living);
    const current = living[turnIndex] || living[0];
    const actionEconomy = { ...(state.actionEconomy || {}) };
    for (const combatant of state.combatants || []) {
        const key = combatantKey(combatant);
        if (combatant.name !== key && actionEconomy[combatant.name] && !actionEconomy[key]) {
            actionEconomy[key] = actionEconomy[combatant.name];
        }
    }
    return {
        ...state,
        combatants: [...state.combatants].sort(byInitiative),
        turnIndex,
        currentTurn: combatantKey(current),
        actionEconomy,
    };
}

function normalizeAdvantage(value: unknown): AdvantageMode {
    const text = String(value || '').toLowerCase();
    if (text === 'dis' || text.includes('disadvantage') || text.includes('desavantage')) return 'disadvantage';
    if (text === 'adv' || text.includes('advantage')) return 'advantage';
    return 'normal';
}

function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function proficiencyBonus(level: number): number {
    return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}

function normalizeAbility(value?: string): Ability {
    const upper = String(value || '').toUpperCase();
    if (upper === 'STR' || upper === 'DEX' || upper === 'CON' || upper === 'INT' || upper === 'WIS' || upper === 'CHA') return upper;
    return 'CHA';
}

function applyConcentrationReplacement(character: CharacterSheet, nextEffect: ActiveEffect): { character: CharacterSheet; removed: string[] } {
    if (!nextEffect.concentration) {
        return { character: { ...character, activeEffects: [...(character.activeEffects || []), nextEffect] }, removed: [] };
    }

    const activeEffects = character.activeEffects || [];
    const removed = activeEffects.filter(effect => effect.concentration).map(effect => effect.name);
    return {
        removed,
        character: {
            ...character,
            activeEffects: [
                ...activeEffects.filter(effect => !effect.concentration),
                nextEffect,
            ],
        },
    };
}

type ResolvedMonsterAttack = {
    name: string;
    attackBonus: number;
    damage: string;
    damageType: string;
    reach: number;
    range?: string;
    ranged?: { short: number; long: number };
    damageParts?: { damage: string; damageType: string }[];
};

function normalizeAttackName(value?: string): string {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function monsterAttacks(name: string): ResolvedMonsterAttack[] {
    const creature = getCreature(name);
    if (creature) return getCreatureAttacks(creature);
    return lookupMonster(name)?.attacks || [];
}

function resolveMonsterAttack(name: string, attackName?: string): { attack: ResolvedMonsterAttack | null; error?: string; available: string[] } {
    const attacks = monsterAttacks(name);
    const available = attacks.map(attack => attack.name);
    if (!attacks.length) return { attack: null, available };
    if (!attackName) return { attack: attacks[0], available };

    const wanted = normalizeAttackName(attackName);
    const attack = attacks.find(candidate => normalizeAttackName(candidate.name) === wanted)
        || attacks.find(candidate => {
            const candidateName = normalizeAttackName(candidate.name);
            return candidateName.includes(wanted) || wanted.includes(candidateName);
        });

    if (!attack) {
        return {
            attack: null,
            available,
            error: `Attack "${attackName}" not found for ${name}. Available attacks: ${available.join(', ') || 'none'}.`,
        };
    }

    return { attack, available };
}

function damageAdjustment(target: Combatant, amount: number, damageType?: string): { amountApplied: number; mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' } {
    const type = normalizeDamageType(damageType);
    if (!type) return { amountApplied: Math.max(0, amount), mitigation: 'normal' };

    // Combatant-level resistances first — this is how the PLAYER's racial
    // resistances (Dwarf poison, Tiefling fire, Dragonborn ancestry…) take effect.
    if (target.resistances?.some(r => normalizeDamageType(r) === type)) {
        return { amountApplied: Math.floor(Math.max(0, amount) / 2), mitigation: 'resistant' };
    }
    if (target.isPlayer) return { amountApplied: Math.max(0, amount), mitigation: 'normal' };

    const monster = lookupMonster(target.name);
    if (!monster) return { amountApplied: Math.max(0, amount), mitigation: 'normal' };
    if (monster.immunities?.includes(type)) return { amountApplied: 0, mitigation: 'immune' };
    if (monster.vulnerabilities?.includes(type)) return { amountApplied: Math.max(0, amount * 2), mitigation: 'vulnerable' };
    if (monster.resistances?.includes(type)) return { amountApplied: Math.floor(Math.max(0, amount) / 2), mitigation: 'resistant' };
    return { amountApplied: Math.max(0, amount), mitigation: 'normal' };
}

function normalizeStoryScope(value: unknown): StoryRollModifier['scope'] {
    const text = String(value || '').toLowerCase();
    if (text.includes('attack') || text.includes('attaque')) return 'attack';
    if (text.includes('save') || text.includes('sauvegarde')) return 'save';
    if (text.includes('death') || text.includes('mort')) return 'death_save';
    if (text.includes('check') || text.includes('test') || text.includes('skill')) return 'check';
    return 'any';
}

function scopeMatches(scope: StoryRollModifier['scope'], kind: RollKind): boolean {
    if (scope === 'any') return true;
    if (scope === 'check') return kind === 'CHECK';
    if (scope === 'save') return kind === 'SAVE';
    if (scope === 'attack') return kind === 'ATTACK';
    if (scope === 'death_save') return kind === 'DEATH_SAVE';
    return false;
}

function inferRollKind(reason: string, formula: string): RollKind {
    const haystack = `${reason} ${formula}`.toLowerCase();
    for (const [kind, keywords] of TYPE_KEYWORDS) {
        if (keywords.some(keyword => haystack.includes(keyword))) return kind;
    }
    return 'CHECK';
}

function mergeAdvantage(current: AdvantageMode, next?: AdvantageMode): AdvantageMode {
    if (!next || next === 'normal') return current;
    if (current === 'normal') return next;
    return current === next ? current : 'normal';
}

function conditionFromEffect(effect: ActiveEffect): ConditionEntry | null {
    if (effect.source !== 'condition') return null;
    return lookupCondition(effect.name);
}

function inferSaveAbility(prompt: RollPromptState): Ability | null {
    const haystack = `${prompt.name} ${prompt.formula}`.toUpperCase();
    return (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[]).find(ability => haystack.includes(ability)) || null;
}

export function deriveRollContext(prompt: RollPromptState, input: RollContextInput = {}): RollContextResult {
    let nextPrompt = { ...prompt, contextReasons: [...(prompt.contextReasons || [])] };
    const reasons: string[] = [];
    const actorConditions = (input.actorEffects || []).map(conditionFromEffect).filter(Boolean) as ConditionEntry[];
    const targetConditions = (input.targetEffects || []).map(conditionFromEffect).filter(Boolean) as ConditionEntry[];

    if (prompt.type === 'ATTACK') {
        for (const condition of actorConditions) {
            const mode = condition.attackRolls?.madeByCreature;
            if (mode && mode !== 'normal') {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, mode);
                reasons.push(`${condition.name}: attacker has ${mode} on attacks`);
            }
        }

        for (const condition of targetConditions) {
            let mode = condition.attackRolls?.againstCreature;
            if (condition.id === 'prone' && mode === 'special') {
                mode = input.isMeleeAttack ? 'advantage' : 'disadvantage';
            }
            if (mode && mode !== 'normal' && mode !== 'special') {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, mode);
                reasons.push(`${condition.name}: attacks against target have ${mode}`);
            }
        }

        const coverBonus = Math.max(0, Math.min(5, Number(input.coverBonus || 0)));
        if (coverBonus > 0) {
            nextPrompt.dc += coverBonus;
            nextPrompt.coverBonus = coverBonus;
            reasons.push(`${coverBonus === 2 ? 'Half cover' : 'Three-quarter cover'}: +${coverBonus} AC`);
        }
    }

    if (prompt.type === 'SAVE') {
        const ability = inferSaveAbility(prompt);
        if (ability) {
            for (const condition of actorConditions) {
                const mode = condition.savingThrows?.[ability];
                if (mode === 'advantage' || mode === 'disadvantage') {
                    nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, mode);
                    reasons.push(`${condition.name}: ${ability} save has ${mode}`);
                } else if (mode === 'auto_fail') {
                    nextPrompt.autoFail = true;
                    reasons.push(`${condition.name}: ${ability} save automatically fails`);
                }
            }
        }
    }

    if (prompt.type === 'CHECK') {
        for (const condition of actorConditions) {
            if (condition.id === 'poisoned') {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, 'disadvantage');
                reasons.push('Poisoned: ability checks have disadvantage');
            }
        }
    }

    nextPrompt.contextReasons = [...nextPrompt.contextReasons, ...reasons];
    return {
        prompt: nextPrompt,
        reasons,
        coverBonus: nextPrompt.coverBonus || 0,
    };
}

export function normalizeRollPrompt(args: any): RollPromptState {
    const reason = String(args?.reason || args?.name || 'Ability check');
    const formula = String(args?.formula || '1d20');
    const kind = inferRollKind(reason, formula);

    return {
        type: kind,
        name: reason,
        dc: Number.isFinite(Number(args?.dc)) ? Math.max(0, Number(args.dc)) : 10,
        formula,
        advantage: normalizeAdvantage(args?.advantage),
        dmBonus: Number.isFinite(Number(args?.bonus)) ? Number(args.bonus) : 0,
        requestedAt: Date.now(),
    };
}

export function normalizeStoryModifier(args: any): StoryRollModifier {
    const mode = normalizeAdvantage(args?.mode || args?.advantage);
    const rawBonus = Number(args?.bonus ?? 0);
    const bonus = Number.isFinite(rawBonus) ? Math.max(-5, Math.min(5, Math.trunc(rawBonus))) : 0;
    const sourceText = String(args?.source || '').toLowerCase();
    const source: StoryRollModifier['source'] =
        sourceText.includes('bless') || sourceText.includes('bénéd') || sourceText.includes('bened') ? 'blessing' :
        sourceText.includes('complication') ? 'complication' :
        sourceText.includes('consequence') || sourceText.includes('conséquence') ? 'consequence' :
        sourceText.includes('tactic') || sourceText.includes('ruse') ? 'tactic' :
        'dm_inspiration';

    return {
        id: makeId('story'),
        name: String(args?.name || (source === 'complication' || source === 'consequence' ? 'Complication du MD' : 'Inspiration du MD')),
        source,
        mode,
        bonus,
        remainingUses: Math.max(1, Math.min(3, Number(args?.uses || args?.remainingUses || 1))),
        scope: normalizeStoryScope(args?.scope),
        reason: String(args?.reason || 'Ajustement narratif du MD'),
        createdAt: Date.now(),
    };
}

export function applyStoryModifiersToPrompt(
    prompt: RollPromptState,
    modifiers: StoryRollModifier[] = []
): StoryModifierApplication {
    const applicable = modifiers
        .filter(modifier => modifier.remainingUses > 0 && scopeMatches(modifier.scope, prompt.type))
        .slice(0, 2);

    if (!applicable.length) {
        return { prompt, applied: [], remaining: modifiers };
    }

    const advantageVotes = [
        prompt.advantage,
        ...applicable.map(modifier => modifier.mode),
    ];
    const hasAdvantage = advantageVotes.includes('advantage');
    const hasDisadvantage = advantageVotes.includes('disadvantage');
    const advantage = hasAdvantage && hasDisadvantage
        ? 'normal'
        : hasAdvantage
            ? 'advantage'
            : hasDisadvantage
                ? 'disadvantage'
                : prompt.advantage;
    const bonus = applicable.reduce((sum, modifier) => sum + modifier.bonus, 0);
    const consumedIds = new Set(applicable.map(modifier => modifier.id));
    const remaining = modifiers
        .map(modifier => consumedIds.has(modifier.id)
            ? { ...modifier, remainingUses: modifier.remainingUses - 1 }
            : modifier)
        .filter(modifier => modifier.remainingUses > 0);

    return {
        applied: applicable,
        remaining,
        prompt: {
            ...prompt,
            advantage,
            dmBonus: prompt.dmBonus + bonus,
            name: `${prompt.name}${applicable.length ? ` (${applicable.map(m => m.name).join(', ')})` : ''}`,
        },
    };
}

export function parseD20Formula(formula: string, dmBonus = 0): { modifier: number; label: string } {
    const match = String(formula || '1d20').match(/1d20\s*([+-]\s*\d+)?/i);
    const modifier = match?.[1] ? Number(match[1].replace(/\s+/g, '')) : 0;
    const totalModifier = modifier + dmBonus;
    return {
        modifier: totalModifier,
        label: `1d20${totalModifier >= 0 ? '+' : ''}${totalModifier}`,
    };
}

export function rollD20WithMode(mode: AdvantageMode): { die: number; rolls: number[] } {
    const first = Math.floor(Math.random() * 20) + 1;
    if (mode === 'normal') return { die: first, rolls: [first] };

    const second = Math.floor(Math.random() * 20) + 1;
    return {
        die: mode === 'advantage' ? Math.max(first, second) : Math.min(first, second),
        rolls: [first, second],
    };
}

export function resolveRollPrompt(prompt: RollPromptState): RollOutcome {
    const { modifier, label } = parseD20Formula(prompt.formula, prompt.dmBonus);
    const { die, rolls } = rollD20WithMode(prompt.advantage);
    const total = die + modifier;
    const isDeathSave = prompt.type === 'DEATH_SAVE';

    let success = prompt.autoFail ? false : (prompt.dc > 0 ? total >= prompt.dc : true);
    let critical: RollOutcome['critical'] = 'none';

    if (prompt.autoFail) {
        critical = die === 1 ? 'failure' : 'none';
    } else if (die === 20) {
        critical = 'success';
        success = true;
    } else if (die === 1) {
        critical = 'failure';
        if (isDeathSave) success = false;
    }

    return {
        prompt,
        total,
        die,
        rolls,
        modifier,
        success,
        critical,
        formulaLabel: label,
    };
}

/** Sum a numeric mechanical bonus (initiativeBonus, speedBonus…) across the character's feats. */
export function featNumericBonus(character: CharacterSheet, key: 'initiativeBonus' | 'speedBonus' | 'acBonus' | 'attackBonus'): number {
    return (character.feats || []).reduce((sum, id) => sum + (getFeatById(id)?.mechanical?.[key] || 0), 0);
}

/** True when one of the character's feats grants advantage on the given context tag (e.g. 'concentration_save'). */
export function featGrantsAdvantageOn(character: CharacterSheet, context: string): boolean {
    return (character.feats || []).some(id => (getFeatById(id)?.mechanical?.advantageOn || []).includes(context));
}

/** True when one of the character's feats carries the given machine tag (mechanical.special). */
export function hasFeatSpecial(character: CharacterSheet, special: string): boolean {
    return (character.feats || []).some(id => getFeatById(id)?.mechanical?.special === special);
}

/**
 * Somme des modificateurs numériques (AC / attackBonus / damageBonus) portés
 * par les effets actifs d'un COMBATTANT (allié ou ennemi). Le joueur passe par
 * getEffectiveAC/getEffectiveAttackBonus (sa fiche) ; les autres lignes de
 * combat n'avaient AUCUNE lecture chiffrée de leurs buffs/debuffs.
 */
export function combatantEffectBonus(c: Combatant, stat: 'AC' | 'attackBonus' | 'damageBonus'): number {
    let total = 0;
    for (const effect of c.activeEffects || []) {
        for (const mod of effect.modifiers || []) {
            if (mod.stat === stat) total += mod.bonus || 0;
        }
    }
    return total;
}

/**
 * All damage types the PLAYER halves: racial (Dwarf poison, Tiefling fire…),
 * Dragonborn draconic ancestry, feat-granted resistances, and RAGE (physical
 * damage; Totem Warrior rages resist everything but psychic). Single source
 * for both the in-combat combatant row and out-of-combat damage.
 */
export function playerResistances(character: CharacterSheet): string[] {
    const racial = character.race === 'Dragonborn'
        ? [getDraconicDamageType(character.draconicAncestry) || 'fire']
        : (RACE_DATA[character.race]?.resistances || []);
    const fromFeats = (character.feats || []).flatMap(id => getFeatById(id)?.mechanical?.resistances || []);
    const out = [...racial, ...fromFeats];
    const raging = (character.activeEffects || []).some(effect => effect.name === 'Rage');
    if (raging) {
        if (character.subclass === 'Totem Warrior') {
            out.push('bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning', 'acid', 'poison', 'thunder', 'necrotic', 'radiant', 'force');
        } else {
            out.push('bludgeoning', 'piercing', 'slashing');
        }
    }
    return out;
}

/** The Barbarian Rage effect: +2 melee damage, physical resistance, ~1 minute. */
export function rageEffect(): ActiveEffect {
    return {
        id: makeId('rage'),
        name: 'Rage',
        source: 'class_feature',
        duration: 'rounds',
        roundsRemaining: 10,
        description: 'Rage : +2 dégâts, résistance aux dégâts contondants/perforants/tranchants.',
        modifiers: [{ stat: 'damageBonus', bonus: 2 }],
    };
}

/** Monk Martial Arts die by level (d4 → d6 L5 → d8 L11 → d10 L17). */
export function monkMartialArtsDie(level: number): string {
    return level >= 17 ? '1d10' : level >= 11 ? '1d8' : level >= 5 ? '1d6' : '1d4';
}

export interface EffectTickResult {
    activeEffects: ActiveEffect[];
    expired: string[];
    changed: boolean;
}

/**
 * Decrement per-round durations at the start of that creature's turn (Shield =
 * 1 round, Rage/Bless/Hold Person = 10). Effects whose counter reaches 0 are
 * removed and reported in `expired` — previously nothing ever ticked, so every
 * "rounds" buff silently lasted until the next rest.
 */
export function tickRoundEffects(effects: ActiveEffect[] = []): EffectTickResult {
    const kept: ActiveEffect[] = [];
    const expired: string[] = [];
    let changed = false;
    for (const effect of effects) {
        const timed = (effect.duration === 'rounds' || effect.duration === 'concentration')
            && typeof effect.roundsRemaining === 'number';
        if (!timed) { kept.push(effect); continue; }
        const left = (effect.roundsRemaining as number) - 1;
        changed = true;
        if (left <= 0) expired.push(effect.name);
        else kept.push({ ...effect, roundsRemaining: left });
    }
    return { activeEffects: kept, expired, changed };
}

/**
 * Absolute in-game hour: (day-1)*24 + a representative hour of the time-of-day
 * step. Used to expire 1_hour / 8_hours effects when the world clock advances.
 */
export function worldHourOf(dayCount: number, timeOfDay?: string): number {
    const hours: Record<string, number> = { dawn: 6, day: 12, dusk: 18, night: 23 };
    return (Math.max(1, dayCount || 1) - 1) * 24 + (hours[timeOfDay || 'day'] ?? 12);
}

/** Stamp a 1_hour / 8_hours effect with its absolute expiry hour. */
export function stampEffectExpiry<T extends ActiveEffect>(effect: T, worldHour?: number): T {
    if (worldHour === undefined || !Number.isFinite(worldHour)) return effect;
    if (effect.duration === '1_hour') return { ...effect, expiresAtWorldHour: worldHour + 1 };
    if (effect.duration === '8_hours') return { ...effect, expiresAtWorldHour: worldHour + 8 };
    return effect;
}

/**
 * Drop every effect whose expiresAtWorldHour is past. Avant, « 1 heure » et
 * « 8 heures » ne expiraient qu'au repos long — l'Armure du mage durait des
 * semaines de jeu.
 */
export function sweepExpiredEffects(character: CharacterSheet, worldHour: number): { character: CharacterSheet; expired: string[] } {
    const effects = character.activeEffects || [];
    const isPast = (e: ActiveEffect) => typeof e.expiresAtWorldHour === 'number' && worldHour >= e.expiresAtWorldHour;
    const expired = effects.filter(isPast);
    if (!expired.length) return { character, expired: [] };
    return {
        character: { ...character, activeEffects: effects.filter(e => !isPast(e)) },
        expired: expired.map(e => e.name),
    };
}

/**
 * Sync persistent allies' HP from a (finished) encounter back onto the sheet:
 * the Beast Master wolf (id 'companion') and every recruited companion. Call
 * with the LAST combat state before it is cleared.
 */
export function syncCompanionsFromState(character: CharacterSheet, combatants: Combatant[]): CharacterSheet {
    let next = character;
    const wolf = combatants.find(c => c.id === 'companion');
    if (wolf && character.subclass === 'Beast Master') {
        next = { ...next, companionHP: { current: wolf.hp.current, max: wolf.hp.max } };
    }
    if (next.companions?.length) {
        const companions = next.companions.map(comp => {
            const row = combatants.find(c => c.id === comp.id);
            return row ? { ...comp, hp: { current: clampHP(row.hp.current, comp.hp.max), max: comp.hp.max } } : comp;
        });
        next = { ...next, companions };
    }
    // La monture aussi encaisse : ses PV suivent entre les combats.
    const mountRow = combatants.find(c => c.id === 'mount');
    if (mountRow && next.mount) {
        next = { ...next, mount: { ...next.mount, hp: { current: Math.max(0, mountRow.hp.current), max: mountRow.hp.max } } };
    }
    return next;
}

/**
 * Montée de niveau du HÉROS → ses compagnons grandissent avec lui :
 * +4 PV max par niveau gagné (soignés d'autant), +1 au bonus d'attaque en
 * franchissant les niveaux 5, 9, 13 et 17. `level` mémorise la dernière mise
 * à jour pour ne jamais compter deux fois.
 */
export function levelUpCompanions(character: CharacterSheet, toLevel: number): CharacterSheet {
    if (!character.companions?.length) return character;
    const companions = character.companions.map(comp => {
        const from = Math.max(1, comp.level ?? 1);
        if (toLevel <= from) return comp;
        const levelsGained = toLevel - from;
        const hpGain = 4 * levelsGained;
        const atkGain = [5, 9, 13, 17].filter(threshold => from < threshold && toLevel >= threshold).length;
        return {
            ...comp,
            level: toLevel,
            hp: { current: comp.hp.current + hpGain, max: comp.hp.max + hpGain },
            attack: { ...comp.attack, attackBonus: comp.attack.attackBonus + atkGain },
        };
    });
    return { ...character, companions };
}

export function startEncounter(character: CharacterSheet, current: EncounterState): EncounterState {
    // Starting a FRESH encounter must not resurrect a previous fight's roster:
    // leftover corpses cluttered the tracker and re-entered the next victory's
    // XP sum (double XP). A combat that IS active keeps its full roster (resume).
    const combatants = current.isActive
        ? [...(current.combatants || [])]
        : (current.combatants || []).filter(c => c.hp.current > 0 && c.isPlayer);
    const hasPlayer = combatants.some(c => c.isPlayer);

    if (!hasPlayer) {
        combatants.push({
            id: 'player',
            name: character.name || 'Hero',
            hp: { current: character.hp.current, max: character.hp.max },
            ac: getCombatAC(character),
            // Feat hook: Alert (+5) or any future initiativeBonus feat is real here.
            initiative: Math.floor(Math.random() * 20) + 1 + abilityMod(character.stats.DEX) + featNumericBonus(character, 'initiativeBonus'),
            isPlayer: true,
            side: 'player',
            portrait: character.portrait,
            activeEffects: character.activeEffects || [],
            tempHP: character.tempHP || 0,
            dexMod: abilityMod(character.stats.DEX),
            // Racial/draconic + feat resistances (single source: playerResistances).
            resistances: playerResistances(character),
        } as Combatant);
    }

    // Beast Master (Ranger archetype): the animal companion fights at the
    // player's side in EVERY encounter — auto-joined as an ally so the feature
    // is mechanically real (enemies can target it, the DM plays its turn).
    // SRD scaling: max HP = 4 × ranger level (min the wolf's 11). Its HP
    // PERSISTS between fights via character.companionHP (synced on combat end);
    // a downed companion (0 HP) stays out until a rest revives it.
    if (character.subclass === 'Beast Master' && !combatants.some(c => c.id === 'companion')) {
        const companionMax = Math.max(11, 4 * (character.level || 1));
        const companionCurrent = character.companionHP
            ? clampHP(character.companionHP.current, companionMax)
            : companionMax;
        if (companionCurrent > 0) {
            // Bête TYPÉE (loup/ours/panthère/faucon) — stats du catalogue,
            // loup par défaut pour les anciennes fiches.
            const beast = getBeastCompanion(character.beastKind || DEFAULT_BEAST_ID)
                || getBeastCompanion(DEFAULT_BEAST_ID)!;
            combatants.push({
                id: 'companion',
                name: `Compagnon animal (${beast.name})`,
                hp: { current: companionCurrent, max: companionMax },
                ac: beast.ac,
                initiative: Math.floor(Math.random() * 20) + 1 + beast.dexMod,
                isPlayer: false,
                side: 'ally',
                activeEffects: [],
                dexMod: beast.dexMod,
            } as Combatant);
        }
    }

    // La MONTURE combat aussi : elle rejoint chaque rencontre comme alliée
    // avec les stats de son type (PV persistants sur la fiche). À 0 PV elle ne
    // se présente plus (morte, ou céleste en attente de repos long).
    if (character.mount && !combatants.some(c => c.id === 'mount')) {
        const mountType = getMountType(character.mount.kind || character.mount.name);
        const mountMax = character.mount.hp?.max ?? mountType?.hp ?? 15;
        const mountCurrent = character.mount.hp ? clampHP(character.mount.hp.current, mountMax) : mountMax;
        if (mountCurrent > 0) {
            combatants.push({
                id: 'mount',
                name: character.mount.name,
                hp: { current: mountCurrent, max: mountMax },
                ac: clampAC(mountType?.ac ?? 11),
                initiative: Math.floor(Math.random() * 20) + 1 + (mountType?.dexMod ?? 1),
                isPlayer: false,
                side: 'ally',
                activeEffects: [],
                dexMod: mountType?.dexMod ?? 1,
            } as Combatant);
        }
    }

    // Recruited companions (persistent allies) auto-join every encounter, HP
    // carried between fights (synced back via syncCompanionsFromState). A
    // downed companion (0 HP) sits the fight out until a rest revives it.
    for (const comp of character.companions || []) {
        if (combatants.some(c => c.id === comp.id)) continue;
        if (comp.hp.current <= 0) continue;
        combatants.push({
            id: comp.id,
            name: comp.name,
            hp: { current: clampHP(comp.hp.current, comp.hp.max), max: comp.hp.max },
            ac: clampAC(comp.ac),
            initiative: Math.floor(Math.random() * 20) + 1 + 1,
            isPlayer: false,
            side: 'ally',
            activeEffects: [],
            dexMod: 1,
        } as Combatant);
    }

    combatants.sort(byInitiative);
    const currentTurn = current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '';
    const actionEconomy = { ...(current.actionEconomy || {}) };
    if (currentTurn && !actionEconomy[currentTurn]) actionEconomy[currentTurn] = baseTurnEconomy();

    // Seed the player's attacksMax to their real attack count (Extra Attack at L5+)
    // so multiattack works from round 1. The GameSession turn-sync effect normally
    // patches this on the player's turn, but its (prevTurn !== currentTurn) guard
    // skips a repeat encounter that resumes on the player's turn — leaving the cap
    // at baseTurnEconomy's 1. Seeding here makes round 1 correct unconditionally.
    const playerKey = combatants.find(c => c.isPlayer)?.id || 'player';
    actionEconomy[playerKey] = {
        ...baseTurnEconomy(),
        ...(actionEconomy[playerKey] || {}),
        attacksMax: getPlayerAttackCount(character),
    };

    return syncCurrentTurn({
        isActive: true,
        combatants,
        currentTurn,
        round: current.round || 1,
        turnIndex: current.turnIndex || 0,
        actionEconomy,
        enemyIntents: current.enemyIntents || {},
        logs: current.logs || [makeLog('Encounter started', 'system')],
    });
}

export function addEnemyToEncounter(current: EncounterState, args: any): { state: EncounterState; combatant: Combatant } {
    const creature = getCreature(String(args?.name || 'Enemy'));
    const name = creature?.name || String(args?.name || 'Enemy');
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) ? Number(args.hp) : 1);
    const ac = creature?.ac ?? (Number.isFinite(Number(args?.ac)) ? Number(args.ac) : 10);
    const dexMod = creature
        ? abilityMod(creature.stats.DEX)
        : Number.isFinite(Number(args?.dexMod)) ? Number(args.dexMod) : 0;

    const combatant: Combatant = {
        id: `enemy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        hp: { current: Math.max(1, hp), max: Math.max(1, hp) },
        ac: clampAC(ac),
        initiative: Math.floor(Math.random() * 20) + 1 + dexMod,
        isPlayer: false,
        side: 'enemy',
        portrait: creature?.imageUrl,
        activeEffects: [],
        dexMod,
        // XP explicite du MJ pour les ennemis custom (sinon bestiaire, sinon
        // estimation par PV au moment de la victoire).
        xpValue: Number.isFinite(Number(args?.xp)) && Number(args.xp) > 0 ? Number(args.xp) : undefined,
        // Bande de distance de départ (relative au joueur). Un nouvel arrivant
        // surgit « à quelques pas » par défaut — pas déjà au contact.
        range: ['melee', 'near', 'far'].includes(String(args?.range || '')) ? String(args.range) as any : 'near',
    } as Combatant;

    const combatants = [...(current.combatants || []), combatant].sort(byInitiative);
    return {
        combatant,
        state: syncCurrentTurn({
            isActive: true,
            combatants,
            currentTurn: current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '',
            round: current.round || 1,
            turnIndex: current.turnIndex || 0,
            actionEconomy: current.actionEconomy || {},
            enemyIntents: current.enemyIntents || {},
            logs: [...(current.logs || []), makeLog(`${combatant.name} joined initiative`, 'system')],
        }),
    };
}

/**
 * Add an ALLY (companion / rescued NPC / summon) to the encounter. Mirrors
 * addEnemyToEncounter but tags the combatant as side:'ally' so it fights with
 * the player: enemies target it, it targets enemies, and it counts toward the
 * party for defeat checks.
 */
export function addAllyToEncounter(current: EncounterState, args: any): { state: EncounterState; combatant: Combatant } {
    const creature = getCreature(String(args?.name || 'Ally'));
    const name = creature?.name || String(args?.name || 'Ally');
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) ? Number(args.hp) : 1);
    const ac = creature?.ac ?? (Number.isFinite(Number(args?.ac)) ? Number(args.ac) : 10);
    const dexMod = creature
        ? abilityMod(creature.stats.DEX)
        : Number.isFinite(Number(args?.dexMod)) ? Number(args.dexMod) : 0;

    const combatant: Combatant = {
        id: `ally-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        hp: { current: Math.max(1, hp), max: Math.max(1, hp) },
        ac: clampAC(ac),
        initiative: Math.floor(Math.random() * 20) + 1 + dexMod,
        isPlayer: false,
        side: 'ally',
        portrait: creature?.imageUrl,
        activeEffects: [],
        dexMod,
    } as Combatant;

    const combatants = [...(current.combatants || []), combatant].sort(byInitiative);
    return {
        combatant,
        state: syncCurrentTurn({
            isActive: true,
            combatants,
            currentTurn: current.currentTurn || combatants.find(c => c.hp.current > 0)?.id || '',
            round: current.round || 1,
            turnIndex: current.turnIndex || 0,
            actionEconomy: current.actionEconomy || {},
            enemyIntents: current.enemyIntents || {},
            logs: [...(current.logs || []), makeLog(`${combatant.name} joined the fight as an ally`, 'system')],
        }),
    };
}

export function updateEnemyHP(current: EncounterState, name: string, hp: number): { state: EncounterState; found: boolean; enemy?: Combatant; ambiguous?: boolean } {
    // No livingOnly: the DM must be able to heal/revive a downed enemy (a
    // dramatic second wind, a necromancer raising the fallen). autoResolve
    // avoids the "Ambiguous enemy" stall when several share a bare name.
    const lookup = resolveCombatantReference(current, name, { enemyOnly: true, autoResolve: true });
    if (!lookup.combatant || lookup.ambiguous) return { found: false, state: current, ambiguous: lookup.ambiguous };

    let enemy: Combatant | undefined;
    const combatants = current.combatants.map(c => {
        if (c.id !== lookup.combatant!.id) return c;
        enemy = { ...c, hp: { ...c.hp, current: clampHP(hp, c.hp.max) } };
        return enemy;
    });

    return {
        found: true,
        enemy,
        state: syncCurrentTurn({ ...current, combatants }),
    };
}

export function advanceTurn(current: EncounterState): EncounterState {
    const living = livingCombatants(current);
    if (!living.length) {
        return { ...current, isActive: false, currentTurn: '', turnIndex: 0 };
    }

    // Robust advance: if the current actor is still alive, step to the next
    // living combatant in initiative order. If the current actor died or was
    // removed this turn, resync by their former initiative slot in the full
    // roster and take the next LIVING combatant after it, never landing on a
    // dead/removed combatant and never skipping or repeating turns.
    const livingIndex = living.findIndex(c => c.id === current.currentTurn || c.name === current.currentTurn);
    let nextIndex: number;
    let wrapped: boolean;
    if (livingIndex >= 0) {
        nextIndex = (livingIndex + 1) % living.length;
        wrapped = nextIndex === 0;
    } else {
        const roster = [...(current.combatants || [])].sort(byInitiative);
        const prevRosterIndex = roster.findIndex(c => c.id === current.currentTurn || c.name === current.currentTurn);
        const after = prevRosterIndex >= 0
            ? roster.slice(prevRosterIndex + 1).find(c => c.hp.current > 0)
            : undefined;
        const resolved = after || living[0];
        nextIndex = Math.max(0, living.findIndex(c => c.id === resolved.id || c.name === resolved.name));
        // We wrapped to the top of the order whenever there was no living
        // combatant after the (now gone) actor's slot.
        wrapped = !after;
    }
    const round = (current.round || 1) + (wrapped ? 1 : 0);
    const next = living[nextIndex];

    // Tick per-round effect durations at the start of the NEW combatant's turn
    // (enemies/allies only — the PLAYER's effects live on the character sheet
    // and are ticked by GameSession when their turn comes back around).
    const tickLogs: CombatLogEntry[] = [];
    const nextKey = combatantKey(next);
    const combatants = current.combatants.map(combatant => {
        if (combatantKey(combatant) !== nextKey || combatant.isPlayer) return combatant;
        const ticked = tickRoundEffects(combatant.activeEffects);
        if (!ticked.changed) return combatant;
        if (ticked.expired.length) {
            tickLogs.push(makeLog(`${combatant.name}: effet(s) dissipé(s) — ${ticked.expired.join(', ')}`, 'condition'));
        }
        return { ...combatant, activeEffects: ticked.activeEffects };
    });

    return {
        ...current,
        round,
        combatants,
        turnIndex: nextIndex,
        currentTurn: nextKey,
        actionEconomy: {
            ...(current.actionEconomy || {}),
            [nextKey]: baseTurnEconomy(),
        },
        logs: [...(current.logs || []), makeLog(`Turn: ${next.name} (round ${round})`, 'turn'), ...tickLogs],
    };
}

export function consumeCombatAction(
    current: EncounterState,
    actorName: string,
    kind: 'action' | 'bonusAction' | 'reaction' | 'movement' | 'extraAttack',
    movementFeet = 0
): { state: EncounterState; success: boolean; error?: string } {
    const actor = resolveCombatantReference(current, actorName).combatant;
    const actorKey = actor ? combatantKey(actor) : actorName;
    const economy = current.actionEconomy?.[actorKey] || baseTurnEconomy();
    const nextEconomy = { ...economy };

    if (kind === 'action') {
        if (economy.actionUsed) return { state: current, success: false, error: 'Action already used' };
        nextEconomy.actionUsed = true;
    } else if (kind === 'extraAttack') {
        // Follow-up attacks of an Extra Attack action: they don't consume a fresh
        // action; they're free as long as the main action was the Attack action.
        nextEconomy.extraAttackUsed = true;
    } else if (kind === 'bonusAction') {
        if (economy.bonusActionUsed) return { state: current, success: false, error: 'Bonus action already used' };
        nextEconomy.bonusActionUsed = true;
    } else if (kind === 'reaction') {
        if (economy.reactionUsed) return { state: current, success: false, error: 'Reaction already used' };
        nextEconomy.reactionUsed = true;
    } else {
        if (economy.movementUsed + movementFeet > economy.movementMax) {
            return { state: current, success: false, error: 'Movement exceeded' };
        }
        nextEconomy.movementUsed += Math.max(0, movementFeet);
    }

    return {
        success: true,
        state: {
            ...current,
            actionEconomy: {
                ...(current.actionEconomy || {}),
                [actorKey]: nextEconomy,
            },
        },
    };
}

export function applyDamageToEncounter(
    current: EncounterState,
    targetName: string,
    amount: number,
    damageType?: string
): { state: EncounterState; found: boolean; target?: Combatant; amountApplied?: number; mitigation?: 'normal' | 'resistant' | 'immune' | 'vulnerable'; ambiguous?: boolean } {
    const lookup = resolveCombatantReference(current, targetName);
    if (!lookup.combatant || lookup.ambiguous) {
        return { state: current, found: false, ambiguous: lookup.ambiguous };
    }

    let target: Combatant | undefined;
    let amountApplied = Math.max(0, amount);
    let mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' = 'normal';
    const combatants = current.combatants.map(c => {
        if (c.id === lookup.combatant!.id) {
            const adjusted = damageAdjustment(c, amount, damageType);
            amountApplied = adjusted.amountApplied;
            mitigation = adjusted.mitigation;
            
            let tempHP = c.tempHP || 0;
            let finalDamage = amountApplied;
            if (tempHP > 0) {
                if (finalDamage >= tempHP) {
                    finalDamage -= tempHP;
                    tempHP = 0;
                } else {
                    tempHP -= finalDamage;
                    finalDamage = 0;
                }
            }
            
            target = { 
                ...c, 
                tempHP,
                hp: { ...c.hp, current: clampHP(c.hp.current - finalDamage, c.hp.max) } 
            };
            return target;
        }
        return c;
    });

    const next = syncCurrentTurn({
        ...current,
        combatants,
        logs: target
            ? [...(current.logs || []), makeLog(`${target!.name} took ${amountApplied}${damageType ? ` ${damageType}` : ''} damage${mitigation !== 'normal' ? ` (${mitigation})` : ''}`, 'damage')]
            : current.logs,
    });

    return { state: next, found: true, target, amountApplied, mitigation };
}

export function parseItemAdditionalDamage(item: Item): { damage: string; damageType: CodexDamageType }[] {
    const effectText = (item.effect || '').toLowerCase();
    const nameText = item.name.toLowerCase();
    const combined = `${nameText} ${effectText}`;

    const parts: { damage: string; damageType: CodexDamageType }[] = [];

    // Find dice damage like "+1d6 fire", "+1d4 radiant", "1d6 cold", "+ 1d8 lightning", "plus 1d6 necrotic"
    const diceRegex = /(?:\+|\bplus\b)?\s*(\d+d\d+)\s*([a-zA-Z]+)/g;
    let match;
    while ((match = diceRegex.exec(combined)) !== null) {
        const dice = match[1];
        const rawType = match[2];
        const dmgType = normalizeDamageType(rawType);
        if (dmgType) {
            // Check if this is exactly the base weapon damage to avoid duplicating
            if (item.damageDice === dice && item.damageType === dmgType) {
                continue;
            }
            parts.push({ damage: dice, damageType: dmgType });
        }
    }

    // Find flat bonuses like "+2 fire damage", "+5 lightning", "plus 3 cold"
    const flatRegex = /(?:\+|\bplus\b)\s*(\d+)\s*([a-zA-Z]+)(?:\s+damage)?/g;
    let flatMatch;
    while ((flatMatch = flatRegex.exec(combined)) !== null) {
        const flatVal = flatMatch[1];
        const rawType = flatMatch[2];
        const dmgType = normalizeDamageType(rawType);
        if (dmgType) {
            if (rawType === 'ac' || rawType === 'str' || rawType === 'dex' || rawType === 'con' || rawType === 'int' || rawType === 'wis' || rawType === 'cha') {
                continue;
            }
            parts.push({ damage: flatVal, damageType: dmgType });
        }
    }

    return parts;
}

export function resolveAttackAction(
    current: EncounterState,
    args: {
        attacker: string;
        target: string;
        attackBonus?: number;
        damageFormula?: string;
        damageType?: string;
        attackName?: string;
        advantage?: AdvantageMode;
        consumeAction?: boolean;
        kind?: 'action' | 'extraAttack';
        targetCoverBonus?: number;
        isMeleeAttack?: boolean;
        /** Opt-in -5/+10 (Great Weapon Master / Sharpshooter). Validated here. */
        powerAttack?: boolean;
    },
    character?: CharacterSheet
): { success: boolean; error?: string; resolution?: AttackResolution; state: EncounterState; advanced?: { name: string; from: string; to: string } } {
    // autoResolve: when several combatants share a name (e.g. 3 "Goblin") and the
    // DM references one by bare name, deterministically pick a living match instead
    // of hard-rejecting (which stalled combat). An explicit id always wins first.
    const attackerLookup = resolveCombatantReference(current, args.attacker, { livingOnly: true, autoResolve: true });
    const targetLookup = resolveCombatantReference(current, args.target, { livingOnly: true, autoResolve: true });
    if (attackerLookup.ambiguous) return { success: false, error: `Ambiguous attacker "${args.attacker}". Use combatant id.`, state: current };
    if (targetLookup.ambiguous) return { success: false, error: `Ambiguous target "${args.target}". Use combatant id.`, state: current };
    const attacker = attackerLookup.combatant;
    const target = targetLookup.combatant;
    if (!attacker) return { success: false, error: 'Attacker not found', state: current };
    if (!target) return { success: false, error: 'Target not found', state: current };
    if (attacker.hp.current <= 0) return { success: false, error: 'Attacker is down', state: current };
    if (target.hp.current <= 0) return { success: false, error: 'Target is already down', state: current };

    const monsterAttackResult: { attack: ResolvedMonsterAttack | null; error?: string; available: string[] } =
        !attacker.isPlayer ? resolveMonsterAttack(attacker.name, args.attackName) : { attack: null, available: [] };
    // An unknown attackName only hard-fails when the caller gave us NOTHING to
    // fall back on. DM-spawned custom enemies (names absent from the bestiary)
    // and renamed attacks used to be rejected here, so the enemy turn silently
    // skipped every strike — the "monsters never deal damage" bug. When the
    // caller provides its own damageFormula/attackBonus, trust those numbers.
    if (!attacker.isPlayer && args.attackName && !monsterAttackResult.attack && !args.damageFormula) {
        return { success: false, error: monsterAttackResult.error || `Attack "${args.attackName}" not found for ${attacker.name}.`, state: current };
    }
    const monsterAttack = monsterAttackResult.attack;

    let state = current;
    if (args.consumeAction !== false) {
        // Extra Attack follow-ups consume 'extraAttack' (free), not the action.
        const consumeKind = args.kind === 'extraAttack' ? 'extraAttack' : 'action';
        const consumed = consumeCombatAction(state, combatantKey(attacker), consumeKind);
        if (!consumed.success) return { success: false, error: consumed.error, state };
        state = consumed.state;
    }

    const resolvedDamageType = attacker.isPlayer
        ? args.damageType || character?.weapon?.damageType || 'damage'
        : monsterAttack?.damageType || args.damageType || 'damage';
    // Melee unless the weapon is actually ranged. (Was `!(reach>10)`, which has no
    // bearing on ranged — bows lack `reach` and were therefore wrongly tagged melee.)
    const playerWeapon = character?.weapon;
    const playerIsRanged = !!playerWeapon && (
        (playerWeapon.properties || []).some(p => /ammunition|ranged/i.test(String(p))) ||
        (!!playerWeapon.range && !(playerWeapon.properties || []).some(p => /thrown/i.test(String(p))))
    );
    // -5/+10 opt-in : Maître des armes de guerre (arme de mêlée lourde) ou
    // Tireur d'élite (arme à distance). Validé côté moteur — un flag envoyé
    // sans le feat ou avec la mauvaise arme est ignoré.
    const powerAttackActive = !!(args.powerAttack && attacker.isPlayer && character && (
        (playerIsRanged && hasFeatSpecial(character, 'ranged_power_attack')) ||
        (!playerIsRanged && hasFeatSpecial(character, 'heavy_weapon_power_attack')
            && (playerWeapon?.properties || []).some(p => /heavy|two-handed|lourde/i.test(String(p))))
    ));
    const rawAttackBonus = attacker.isPlayer
        ? Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : character ? getPlayerAttackModifier(character) : 0
        : monsterAttack ? monsterAttack.attackBonus : Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : 0;
    const attackBonus = rawAttackBonus
        + (powerAttackActive ? -5 : 0)
        // Buffs/debuffs chiffrés des alliés/ennemis (Frappe guidée sur un
        // compagnon, malédiction -2 attaque sur un chef…).
        + (attacker.isPlayer ? 0 : combatantEffectBonus(attacker, 'attackBonus'));
    const basePlayerDamageBonus = character ? getPlayerDamageBonus(character) + (powerAttackActive ? 10 : 0) : 0;
    const damageFormula = attacker.isPlayer && character
        ? (args.damageFormula
            ? `${args.damageFormula}${powerAttackActive ? '+10' : ''}`
            : `${character.weapon?.damage ?? '1d4'}${basePlayerDamageBonus >= 0 ? '+' : ''}${basePlayerDamageBonus}`)
        : monsterAttack?.damage || args.damageFormula || '1d6';
    let isMeleeAttack = args.isMeleeAttack ?? (attacker.isPlayer
        ? !playerIsRanged
        : !(monsterAttack?.range || monsterAttack?.ranged));

    // ── Bandes de distance (relatives au joueur) : melee / near / far ────────
    // La bande vit sur la ligne ENNEMIE (attaquant ennemi → sa bande ; joueur/
    // allié qui attaque → la bande de la cible). Absente = melee (anciens saves).
    const bandOf = (c: Combatant): 'melee' | 'near' | 'far' => (c as any).range || 'melee';
    const setBand = (st: EncounterState, cid: string, band: 'melee' | 'near' | 'far'): EncounterState => ({
        ...st,
        combatants: st.combatants.map(c => c.id === cid ? { ...c, range: band } as Combatant : c),
    });
    const stepDownAdvantage = (adv?: AdvantageMode): AdvantageMode =>
        adv === 'advantage' ? 'normal' : 'disadvantage';
    const weaponIsThrown = !!playerWeapon && (playerWeapon.properties || []).some(p => /thrown|jet/i.test(String(p)));
    const bandCarrier = combatantSide(attacker) === 'enemy' ? attacker : target;
    const band = bandOf(bandCarrier);
    let effectiveAdvantage: AdvantageMode | undefined = args.advantage;
    // Les bandes sont relatives au JOUEUR : elles ne contraignent que ses
    // attaques et celles des ennemis. Un allié/compagnon est abstrait (il se
    // trouve là où il doit être) — le laisser « engager » déplaçait la bande de
    // l'ennemi par rapport au joueur, ce qui n'a aucun sens.
    const bandGateApplies = attacker.isPlayer || combatantSide(attacker) === 'enemy';

    if (isMeleeAttack && band !== 'melee' && attacker.isPlayer && weaponIsThrown) {
        // Arme de JET utilisée à distance : l'attaque devient un lancer (à
        // distance), pas un engagement.
        isMeleeAttack = false;
    }
    if (isMeleeAttack && bandGateApplies) {
        if (band === 'far') {
            // CHARGE MONTÉE : à dos de monture, le joueur fond sur une cible
            // lointaine et frappe dans la même action (loin → contact).
            if (attacker.isPlayer && character?.mount) {
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges on ${character.mount.name} (far → melee)`, 'turn')] };
            } else {
                // Trop loin pour frapper : l'attaque devient l'ENGAGEMENT (far → near).
                const moved = setBand(state, bandCarrier.id, 'near');
                const log = makeLog(
                    `${attacker.name} closes the distance (far → near)${attacker.isPlayer ? ` toward ${target.name}` : ''}`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'far', to: 'near' },
                };
            }
        }
        if (band === 'near') {
            // Engagement gratuit : on fond sur la cible et on frappe.
            state = setBand(state, bandCarrier.id, 'melee');
        }
    } else if (!isMeleeAttack && bandGateApplies) {
        // Tir/jet à bout portant : désavantage si un hostile est AU CONTACT
        // (SRD : créature hostile à 1,50 m du tireur).
        const hostileAdjacent = attacker.isPlayer
            ? state.combatants.some(c => combatantSide(c) === 'enemy' && c.hp.current > 0 && bandOf(c) === 'melee')
            : bandOf(attacker) === 'melee';
        if (hostileAdjacent) {
            effectiveAdvantage = stepDownAdvantage(effectiveAdvantage);
        }
    }
    // The PLAYER's AC is live (Shield, Mage Armor, gear swaps mid-fight): the
    // combatant row only holds the snapshot taken at startEncounter, so casting
    // Shield used to change nothing against the automated enemy turns.
    // Non-joueurs : leurs effets actifs à modificateurs numériques (bénédiction
    // de CA sur un allié, malédiction -2 CA sur un boss…) s'appliquent AUSSI —
    // avant, seuls les effets du joueur avaient un impact chiffré.
    const targetAC = target.isPlayer && character
        ? getEffectiveAC(character)
        : target.ac + combatantEffectBonus(target, 'AC');
    const context = deriveRollContext({
        type: 'ATTACK',
        name: `${attacker.name} attacks ${target.name}`,
        formula: `1d20${attackBonus >= 0 ? '+' : ''}${attackBonus}`,
        dc: targetAC,
        advantage: effectiveAdvantage || 'normal',
        dmBonus: 0,
        requestedAt: Date.now(),
    }, {
        actorEffects: attacker.isPlayer ? character?.activeEffects : attacker.activeEffects,
        targetEffects: target.isPlayer ? character?.activeEffects : target.activeEffects,
        coverBonus: args.targetCoverBonus,
        isMeleeAttack,
    });
    const attackRoll = resolveRollPrompt(context.prompt);
    const effectiveAC = attackRoll.prompt.dc;
    // Champion (Fighter archetype): Improved Critical — crits on 19-20, and
    // Superior Critical at level 15 — crits on 18-20.
    const critThreshold = attacker.isPlayer && character?.subclass === 'Champion'
        ? ((character.level || 1) >= 15 ? 18 : 19)
        : 20;
    const criticalHit = attackRoll.die >= critThreshold;
    const hit = criticalHit || (attackRoll.die !== 1 && attackRoll.total >= effectiveAC);

    let damage = 0;
    let rawDamage = 0;
    let mitigation: AttackResolution['mitigation'] = 'normal';
    const resolvedDamageParts: NonNullable<AttackResolution['damageParts']> = [];
    // Great Weapon Fighting: with a two-handed melee weapon, reroll damage dice
    // that show a 1 or 2 (once). Only for the player's main weapon part.
    const gwfActive = !!(attacker.isPlayer && character
        && (character as any).fightingStyle === 'Great Weapon Fighting'
        && (character.weapon?.properties || []).includes('two-handed'));
    // Attaquant sauvage : 1×/tour (première attaque), on lance les dés d'arme
    // deux fois et on garde le meilleur total. Mêlée uniquement.
    const savageActive = !!(attacker.isPlayer && character && isMeleeAttack
        && hasFeatSpecial(character, 'savage_attacker')
        && (() => { const e = current.actionEconomy?.[combatantKey(attacker)]; return !e || !((e.attacksUsed ?? 0) > 0); })());
    if (hit) {
        const damageParts: { damage: string; damageType: CodexDamageType }[] = [];
        if (attacker.isPlayer && character) {
            damageParts.push({ damage: damageFormula, damageType: resolvedDamageType as CodexDamageType });
            if (character.inventory) {
                for (const item of character.inventory) {
                    if (item.equipped) {
                        const extraParts = parseItemAdditionalDamage(item);
                        damageParts.push(...extraParts);
                    }
                }
            }
            // Hunter (Ranger archetype): Colossus Slayer — once per turn, +1d8
            // when hitting a creature below its HP max. Approximated as "on the
            // first attack of the player's turn" via the action economy.
            if (character.subclass === 'Hunter' && target.hp.current < target.hp.max) {
                const econ = current.actionEconomy?.[combatantKey(attacker)];
                const isFirstAttackThisTurn = !econ || !((econ.attacksUsed ?? 0) > 0);
                if (isFirstAttackThisTurn) {
                    damageParts.push({ damage: '1d8', damageType: resolvedDamageType as CodexDamageType });
                }
            }
            // Riders génériques : tout effet actif portant onWeaponHit ajoute
            // ses dés à CHAQUE coup d'arme qui touche (Marque du chasseur, Hex,
            // Faveur divine, manœuvre de Maître de guerre…).
            for (const fx of character.activeEffects || []) {
                if (fx.onWeaponHit?.dice) {
                    damageParts.push({
                        damage: fx.onWeaponHit.dice,
                        damageType: (fx.onWeaponHit.damageType || resolvedDamageType) as CodexDamageType,
                    });
                }
            }
            // Rogue: Sneak Attack — once per turn when the strike lands with
            // advantage using a finesse or ranged weapon (solo-table reading of
            // the SRD trigger; no ally positioning to track). Scales by level.
            const weaponIsFinesse = (character.weapon?.properties || []).some(p => String(p).toLowerCase() === 'finesse');
            if (character.class === 'Rogue'
                && context.prompt.advantage === 'advantage'
                && (weaponIsFinesse || playerIsRanged)) {
                const econ = current.actionEconomy?.[combatantKey(attacker)];
                const isFirstAttackThisTurn = !econ || !((econ.attacksUsed ?? 0) > 0);
                if (isFirstAttackThisTurn) {
                    damageParts.push({ damage: getSneakAttackDice(character.level || 1), damageType: resolvedDamageType as CodexDamageType });
                }
            }
        } else if (!attacker.isPlayer && monsterAttack?.damageParts?.length) {
            // Monster data types damageType as a plain string; the values are valid
            // damage types ("slashing", "fire", …), so narrow to CodexDamageType.
            damageParts.push(...(monsterAttack.damageParts as { damage: string; damageType: CodexDamageType }[]));
        } else {
            damageParts.push({ damage: damageFormula, damageType: resolvedDamageType as CodexDamageType });
        }
        // Bonus de dégâts d'effets pour les non-joueurs (Rage d'un allié,
        // bénédiction +2 dégâts…) : greffé sur la première part.
        if (!attacker.isPlayer && damageParts.length) {
            const fxDamage = combatantEffectBonus(attacker, 'damageBonus');
            if (fxDamage !== 0) {
                damageParts[0] = { ...damageParts[0], damage: `${damageParts[0].damage}${fxDamage > 0 ? '+' : ''}${fxDamage}` };
            }
        }

        for (let partIndex = 0; partIndex < damageParts.length; partIndex++) {
            const part = damageParts[partIndex];
            const damageRoll = rollDice(part.damage);
            // GWF reroll (main weapon part only): any die showing 1 or 2 is rerolled
            // once, using the weapon's actual die size (d6/d8/d10/d12…).
            let rolls = damageRoll.rolls;
            if (gwfActive && partIndex === 0) {
                const sides = Number(part.damage.match(/\d+d(\d+)/i)?.[1]) || 6;
                rolls = damageRoll.rolls.map(r => r <= 2 ? (Math.floor(Math.random() * sides) + 1) : r);
            }
            if (savageActive && partIndex === 0) {
                const second = rollDice(part.damage).rolls;
                const sum = (arr: number[]) => arr.reduce((s, r) => s + r, 0);
                if (sum(second) > sum(rolls)) rolls = second;
            }
            const rollSum = rolls.reduce((s, r) => s + r, 0);
            const partRawDamage = criticalHit
                ? rolls.reduce((sum, roll) => sum + roll * 2, 0) + damageRoll.modifier
                : rollSum + damageRoll.modifier;
            const applied = applyDamageToEncounter(state, combatantKey(target), partRawDamage, part.damageType);
            const partDamage = applied.amountApplied ?? partRawDamage;
            const partMitigation = applied.mitigation || 'normal';
            rawDamage += partRawDamage;
            damage += partDamage;
            if (partMitigation !== 'normal' && mitigation === 'normal') mitigation = partMitigation;
            resolvedDamageParts.push({
                damageFormula: part.damage,
                damageType: part.damageType,
                rawDamage: partRawDamage,
                damage: partDamage,
                mitigation: partMitigation,
            });
            state = applied.state;
        }
    }

    const updatedTarget = state.combatants.find(c => c.id === target.id) || target;
    const damageTypeLabel = resolvedDamageParts.length > 1
        ? resolvedDamageParts.map(part => part.damageType).join(' + ')
        : resolvedDamageType;
    const log = makeLog(
        `${attacker.name} ${hit ? 'hit' : 'missed'} ${target.name}${hit ? ` with ${monsterAttack?.name || args.attackName || 'attack'} for ${damage} ${damageTypeLabel}${mitigation !== 'normal' ? ` (${mitigation})` : ''}` : ''}`,
        hit ? 'attack' : 'turn'
    );
    state = { ...state, logs: [...(state.logs || []), log] };

    return {
        success: true,
        state,
        resolution: {
            attacker: attacker.name,
            target: target.name,
            attackRoll,
            hit,
            criticalHit,
            damage,
            rawDamage,
            damageFormula: resolvedDamageParts.length > 1 ? resolvedDamageParts.map(part => part.damageFormula).join(' + ') : damageFormula,
            damageType: damageTypeLabel,
            attackName: monsterAttack?.name || args.attackName,
            damageParts: resolvedDamageParts.length ? resolvedDamageParts : undefined,
            mitigation,
            targetHP: updatedTarget.hp,
            state,
            log,
        },
    };
}

export interface MoraleCheckResult {
    state: EncounterState;
    rolled: boolean;
    success?: boolean;
    total?: number;
    dieRoll?: number;
    wisMod?: number;
    fled: boolean;
    combatant?: Combatant;
}

export function resolveMoraleCheck(current: EncounterState, targetIdOrName: string): MoraleCheckResult {
    const lookup = resolveCombatantReference(current, targetIdOrName);
    // Morale only applies to ENEMIES. Exclude the player AND allies (side==='ally')
    // — otherwise a wounded ally could roll morale and flee the party.
    if (!lookup.combatant || lookup.ambiguous || lookup.combatant.isPlayer || lookup.combatant.side === 'ally' || lookup.combatant.hp.current <= 0) {
        return { state: current, rolled: false, fled: false };
    }

    const combatant = lookup.combatant;
    const maxHp = combatant.hp.max || 1;
    const hpRatio = combatant.hp.current / maxHp;
    // Mindless creatures never rout — match FRENCH names too (a "squelette"
    // used to fail morale and flee, which undead must not do).
    const isMindless = /zombie|zombi|skeleton|squelette|undead|mort[- ]?vivant|golem|construct|automate/i.test(combatant.name);
    const isBoss = maxHp >= 80;

    if (hpRatio > 0.4 || isMindless || isBoss || combatant.moraleChecked) {
        return { state: current, rolled: false, fled: false, combatant };
    }

    // Set moraleChecked to true in state
    const updatedCombatant = { ...combatant, moraleChecked: true };
    const nextCombatants = current.combatants.map(c => c.id === combatant.id ? updatedCombatant : c);
    let nextState = { ...current, combatants: nextCombatants };

    // Wisdom save DC 11
    const monsterData = lookupMonster(combatant.name) || getCreature(combatant.name);
    const wis = (monsterData as any)?.stats?.WIS || 10;
    const wisMod = Math.floor((wis - 10) / 2);

    const dieRoll = Math.floor(Math.random() * 20) + 1;
    const total = dieRoll + wisMod;
    const success = total >= 11;

    let fled = false;
    if (!success) {
        fled = true;
        // Mark as fled by setting hp to 0 + a 'Fled' effect, instead of deleting
        // the combatant from the roster. This keeps encounterOutcome's victory
        // predicate working (it counts enemies still PRESENT but checks LIVING),
        // so a fled last enemy correctly ends the fight as a victory.
        const updatedCombatants = nextState.combatants.map(c => {
            if (c.id !== combatant.id) return c;
            return {
                ...c,
                hp: { ...c.hp, current: 0 },
                activeEffects: [
                    ...(c.activeEffects || []),
                    { id: `fled-${c.id}`, name: 'Fled', source: 'condition' as const, duration: 'permanent' as const, description: 'Fled the battle (morale).', modifiers: [] },
                ],
            };
        });
        nextState = { ...nextState, combatants: updatedCombatants };
        // If it was their turn, advance to the next living combatant.
        if (nextState.currentTurn === combatant.id || nextState.currentTurn === combatant.name) {
            nextState = advanceTurn(nextState);
        }
    }

    return {
        state: nextState,
        rolled: true,
        success,
        total,
        dieRoll,
        wisMod,
        fled,
        combatant: updatedCombatant
    };
}

/**
 * Hybrid enemy targeting. Honors an MJ-set standing intent (enemy -> hero id)
 * when that hero is still alive; otherwise falls back to the "wounded prey"
 * default (lowest-HP living hero, array order as a stable tiebreak). Returns
 * undefined only when there are no living heroes. Pure + deterministic so the
 * turn loop stays instant — no LLM round-trip.
 */
export function selectEnemyTarget(livingHeroes: Combatant[], intentTargetId?: string): Combatant | undefined {
    if (!livingHeroes.length) return undefined;
    const intended = intentTargetId ? livingHeroes.find(c => c.id === intentTargetId) : undefined;
    if (intended) return intended;
    return [...livingHeroes].sort((a, b) => a.hp.current - b.hp.current)[0];
}

export function encounterOutcome(current: EncounterState): 'ongoing' | 'victory' | 'defeat' {
    const living = livingCombatants(current);
    const heroesAlive = living.some(c => isHero(c));
    const enemiesAlive = living.some(c => combatantSide(c) === 'enemy');
    // Defeat only when the whole party (player + allies) is down — an ally still
    // standing keeps the fight alive even if the player has fallen.
    if (!heroesAlive) return 'defeat';
    // Victory when every enemy is down (and there were enemies to begin with).
    if (!enemiesAlive && current.combatants.some(c => combatantSide(c) === 'enemy')) return 'victory';
    return 'ongoing';
}

/**
 * Apply damage to the CHARACTER SHEET directly (the out-of-encounter path).
 * Honors the player's resistances (racial/draconic/feat) and temp HP —
 * previously only the in-combat path halved resisted damage, so a Dwarf
 * drinking poison outside a fight took it full.
 */
export function applyDamageToCharacter(
    character: CharacterSheet,
    amount: number,
    damageType?: string
): { character: CharacterSheet; amountApplied: number; mitigation: 'normal' | 'resistant' } {
    const type = normalizeDamageType(damageType);
    let amountApplied = Math.max(0, Math.trunc(amount));
    let mitigation: 'normal' | 'resistant' = 'normal';
    if (type && playerResistances(character).some(r => normalizeDamageType(r) === type)) {
        amountApplied = Math.floor(amountApplied / 2);
        mitigation = 'resistant';
    }
    let tempHP = character.tempHP || 0;
    let hpLoss = amountApplied;
    if (tempHP > 0) {
        if (hpLoss >= tempHP) { hpLoss -= tempHP; tempHP = 0; }
        else { tempHP -= hpLoss; hpLoss = 0; }
    }
    return {
        amountApplied,
        mitigation,
        character: {
            ...character,
            tempHP,
            hp: { ...character.hp, current: clampHP(character.hp.current - hpLoss, character.hp.max) },
        },
    };
}

export function applyCharacterHP(character: CharacterSheet, nextHP: number): CharacterSheet {
    const updated: CharacterSheet = {
        ...character,
        hp: {
            ...character.hp,
            current: clampHP(nextHP, character.hp.max),
        },
    };

    if (updated.hp.current > 0 && updated.deathSaves) {
        updated.deathSaves = { successes: 0, failures: 0, isStable: false, isDead: false };
    }

    return updated;
}

export function applyDeathSaveOutcome(character: CharacterSheet, outcome: RollOutcome): CharacterSheet {
    if (outcome.prompt.type !== 'DEATH_SAVE' || character.hp.current > 0) return character;

    if (outcome.die === 20) {
        return {
            ...character,
            hp: { ...character.hp, current: 1 },
            deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
        };
    }

    const previous = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const failureGain = outcome.die === 1 ? 2 : outcome.success ? 0 : 1;
    const successGain = outcome.success ? 1 : 0;
    const successes = Math.min(3, previous.successes + successGain);
    const failures = Math.min(3, previous.failures + failureGain);

    return {
        ...character,
        deathSaves: {
            successes,
            failures,
            isStable: successes >= 3,
            isDead: failures >= 3,
        },
    };
}

export function applyEffectArgs(character: CharacterSheet, args: any): CharacterSheet {
    const [statRaw, bonusRaw] = String(args?.stat || 'AC=0').split('=');
    const stat = (statRaw || 'AC').trim() as any;
    const bonus = clampStatModifier(Number.parseInt((bonusRaw || '0').trim(), 10) || 0);

    return {
        ...character,
        activeEffects: [
            ...(character.activeEffects || []),
            {
                id: makeId('effect'),
                name: String(args?.name || 'Effect'),
                source: String(args?.source || 'condition') as any,
                duration: String(args?.duration || 'rounds') as any,
                modifiers: [{ stat, bonus }],
            },
        ],
    };
}

function spendSpellSlot(character: CharacterSheet, spellLevel: number, requestedSlot?: number): { character: CharacterSheet; consumedSlot?: number; error?: string } {
    if (spellLevel <= 0) return { character };

    const slotLevel = Math.max(spellLevel, Math.trunc(Number(requestedSlot || spellLevel)));
    const key = String(slotLevel);
    let slotKey = key;
    let consumedSlot = slotLevel;
    let pool = character.spellSlots?.[slotKey];
    if (!pool || pool.current <= 0) {
        const pactSlot = Object.entries(character.spellSlots || {})
            .map(([entryKey, entryPool]) => {
                const match = entryKey.match(/^pact(\d+)$/i);
                return match ? { key: entryKey, level: Number(match[1]), pool: entryPool } : null;
            })
            .filter((entry): entry is { key: string; level: number; pool: NonNullable<CharacterSheet['spellSlots']>[string] } => Boolean(entry))
            .sort((a, b) => a.level - b.level)
            .find(entry => entry.level >= spellLevel && entry.pool.current > 0 && (!requestedSlot || entry.level >= slotLevel));
        if (pactSlot) {
            slotKey = pactSlot.key;
            consumedSlot = pactSlot.level;
            pool = pactSlot.pool;
        }
    }
    if (!pool || pool.current <= 0) {
        return { character, error: `No level ${slotLevel} spell slot available` };
    }

    return {
        consumedSlot,
        character: {
            ...character,
            spellSlots: {
                ...(character.spellSlots || {}),
                [slotKey]: { ...pool, current: Math.max(0, pool.current - 1) },
            },
        },
    };
}

function spellEffectFor(spellName: string): ActiveEffect | null {
    const name = spellName.toLowerCase();
    if (name === 'bless') {
        return {
            id: makeId('spell'),
            name: 'Bless',
            source: 'spell',
            duration: 'concentration',
            concentration: true,
            roundsRemaining: 10,
            description: 'SRD Codex: bonus support for attack rolls and saving throws.',
            modifiers: [],
        };
    }
    if (name === 'hold person') {
        return {
            id: makeId('spell'),
            name: 'Hold Person',
            source: 'spell',
            duration: 'concentration',
            concentration: true,
            roundsRemaining: 10,
            description: 'SRD Codex: concentration maintained while a humanoid target resists paralysis.',
            modifiers: [],
        };
    }
    if (name === 'shield') {
        return {
            id: makeId('spell'),
            name: 'Shield',
            source: 'spell',
            duration: 'rounds',
            roundsRemaining: 1,
            description: 'SRD Codex: +5 AC until the start of the next turn.',
            modifiers: [{ stat: 'AC', bonus: 5 }],
        };
    }
    if (name === 'mage armor') {
        return {
            id: makeId('spell'),
            name: 'Mage Armor',
            source: 'spell',
            duration: '8_hours',
            description: 'SRD Codex: base AC floor is 13 plus Dexterity modifier.',
            modifiers: [{ stat: 'AC', bonus: 0, formula: 'mage_armor' }],
        };
    }
    if (name === "hunter's mark" || name === 'hunters mark' || name === 'marque du chasseur') {
        return {
            id: makeId('spell'),
            name: "Hunter's Mark",
            source: 'spell',
            duration: '1_hour',
            concentration: true,
            description: 'SRD Codex: +1d6 damage on every weapon hit against the marked quarry.',
            modifiers: [],
            onWeaponHit: { dice: '1d6' },
        };
    }
    if (name === 'hex' || name === 'maléfice' || name === 'malefice') {
        return {
            id: makeId('spell'),
            name: 'Hex',
            source: 'spell',
            duration: '1_hour',
            concentration: true,
            description: 'SRD Codex: +1d6 necrotic damage on every hit against the hexed target.',
            modifiers: [],
            onWeaponHit: { dice: '1d6', damageType: 'necrotic' },
        };
    }
    if (name === 'divine favor' || name === 'faveur divine') {
        return {
            id: makeId('spell'),
            name: 'Divine Favor',
            source: 'spell',
            duration: 'concentration',
            concentration: true,
            roundsRemaining: 10,
            description: 'SRD Codex: weapon strikes deal +1d4 radiant damage.',
            modifiers: [],
            onWeaponHit: { dice: '1d4', damageType: 'radiant' },
        };
    }
    return null;
}

function blessStoryModifier(): StoryRollModifier {
    return {
        id: makeId('story'),
        name: 'Bless',
        source: 'blessing',
        mode: 'normal',
        bonus: 2,
        remainingUses: 3,
        scope: 'any',
        reason: 'SRD Codex approximation of Bless: attack rolls and saving throws gain a small bonus.',
        createdAt: Date.now(),
    };
}

export function castSpell(character: CharacterSheet, args: {
    spellName: string;
    slotLevel?: number;
    target?: string;
    casterAbility?: Ability | string;
    casterAbilityMod?: number;
    spellAttackBonus?: number;
    spellSaveDC?: number;
    targetAC?: number;
    targetSaveBonus?: number;
    characterLevel?: number;
    /** Current absolute world hour (worldHourOf) — stamps 1_hour/8_hours effects. */
    worldHour?: number;
    /** Mode histoire : les sorts de SOIN rendent leur maximum au lieu d'un jet. */
    maximizeHealing?: boolean;
    fixedHealing?: number;
}): SpellCastResult {
    const spell = lookupSpell(args.spellName);
    if (!spell) {
        return { success: false, error: 'Spell not found in SRD Codex', character, summary: 'Spell not found.' };
    }

    const configuredSpells = [
        ...(character.cantrips || []),
        ...(character.knownSpells || []),
        ...(character.preparedSpells || []),
    ]
        .map(name => String(name || '').trim().toLowerCase())
        .filter(Boolean);
    if (configuredSpells.length && !configuredSpells.includes(spell.name.toLowerCase())) {
        return {
            success: false,
            error: `${spell.name} is not in this character's caster setup`,
            spell,
            character,
            summary: `${character.name || 'The character'} has not prepared or learned ${spell.name}.`,
        };
    }

    const spent = spendSpellSlot(character, spell.level, args.slotLevel);
    if (spent.error) {
        return { success: false, error: spent.error, spell, character, summary: spent.error };
    }

    let nextCharacter = spent.character;
    const slotLevel = spent.consumedSlot || args.slotLevel || spell.level;
    const casterAbility = normalizeAbility(args.casterAbility || nextCharacter.spellcastingAbility || spell.attack?.ability || 'CHA');
    const casterAbilityMod = Number.isFinite(Number(args.casterAbilityMod))
        ? Number(args.casterAbilityMod)
        : abilityMod(getEffectiveStat(nextCharacter, casterAbility));
    const spellAttackBonus = Number.isFinite(Number(args.spellAttackBonus))
        ? Number(args.spellAttackBonus)
        : casterAbilityMod + proficiencyBonus(nextCharacter.level);
    const spellSaveDC = Number.isFinite(Number(args.spellSaveDC))
        ? Number(args.spellSaveDC)
        : 8 + casterAbilityMod + proficiencyBonus(nextCharacter.level);

    const concentrationReplaced: string[] = [];
    const rawEffect = spellEffectFor(spell.name);
    const activeEffect = rawEffect ? stampEffectExpiry(rawEffect, args.worldHour) : null;
    let storyModifier: StoryRollModifier | undefined;
    if (activeEffect) {
        const applied = applyConcentrationReplacement(nextCharacter, activeEffect);
        nextCharacter = applied.character;
        concentrationReplaced.push(...applied.removed);
        if (spell.name.toLowerCase() === 'bless') {
            storyModifier = blessStoryModifier();
            nextCharacter = {
                ...nextCharacter,
                storyModifiers: [...(nextCharacter.storyModifiers || []), storyModifier],
            };
        }
    }

    if (spell.healing) {
        const { healingDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const healingRoll = Number.isFinite(Number(args.fixedHealing))
            ? { total: Number(args.fixedHealing) }
            : args.maximizeHealing
                ? { total: maxRollOfFormula(healingDice || spell.healing.dice) }
                : rollDice(healingDice || spell.healing.dice);
        // Life Domain (Cleric): Disciple of Life — healing spells of 1st level or
        // higher restore an extra 2 + the slot level used.
        const discipleOfLifeBonus = nextCharacter.subclass === 'Life Domain' && spell.level >= 1
            ? 2 + slotLevel
            : 0;
        const healing = Math.max(0, healingRoll.total + (spell.healing.abilityModifier ? casterAbilityMod : 0) + discipleOfLifeBonus);
        nextCharacter = {
            ...nextCharacter,
            hp: { ...nextCharacter.hp, current: clampHP(nextCharacter.hp.current + healing, nextCharacter.hp.max) },
        };
        return {
            success: true,
            spell,
            character: nextCharacter,
            consumedSlot: spent.consumedSlot,
            healing,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} heals ${healing} HP.`,
        };
    }

    if (spell.attack) {
        const { damageDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const damageFormula = damageDice || spell.damage?.dice;
        const prompt: RollPromptState = {
            type: 'ATTACK',
            name: `${spell.name} spell attack${args.target ? ` vs ${args.target}` : ''}`,
            dc: Number.isFinite(Number(args.targetAC)) ? Number(args.targetAC) : 10,
            formula: `1d20${spellAttackBonus >= 0 ? '+' : ''}${spellAttackBonus}`,
            advantage: 'normal',
            dmBonus: 0,
            requestedAt: Date.now(),
            pendingSpell: {
                spellName: spell.name,
                target: args.target,
                damageFormula,
                damageType: spell.damage?.type,
                slotLevel,
            },
        };
        return {
            success: true,
            spell,
            character: nextCharacter,
            consumedSlot: spent.consumedSlot,
            prompt,
            damageFormula,
            damageType: spell.damage?.type,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} requires a spell attack roll.`,
        };
    }

    if (spell.save) {
        const { damageDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const damageFormula = damageDice || spell.damage?.dice;
        
        let targetSaveBonus = Number.isFinite(Number(args.targetSaveBonus)) ? Number(args.targetSaveBonus) : undefined;
        if (targetSaveBonus === undefined && args.target) {
            const targetCreature: any = lookupMonster(args.target) || getCreature(args.target);
            if (targetCreature) {
                const ability = String(spell.save.ability).toUpperCase() as 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
                if ('saves' in targetCreature && targetCreature.saves?.[ability] !== undefined) {
                    targetSaveBonus = targetCreature.saves[ability];
                } else if ('stats' in targetCreature && targetCreature.stats?.[ability] !== undefined) {
                    targetSaveBonus = Math.floor((targetCreature.stats[ability] - 10) / 2);
                }
            }
        }
        if (targetSaveBonus === undefined) targetSaveBonus = 0;

        const prompt: RollPromptState = {
            type: 'SAVE',
            name: `${args.target || 'Target'} ${spell.save.ability} save vs ${spell.name}`,
            dc: spellSaveDC,
            formula: `1d20${targetSaveBonus >= 0 ? '+' : ''}${targetSaveBonus}`,
            advantage: 'normal',
            dmBonus: 0,
            requestedAt: Date.now(),
            pendingSpell: {
                spellName: spell.name,
                target: args.target,
                damageFormula,
                damageType: spell.damage?.type,
                conditionOnFailure: spell.condition,
                effectOnSuccess: spell.save.effectOnSuccess,
                slotLevel,
            },
        };
        return {
            success: true,
            spell,
            character: nextCharacter,
            consumedSlot: spent.consumedSlot,
            prompt,
            damageFormula,
            damageType: spell.damage?.type,
            conditionOnFailure: spell.condition,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} requires a ${spell.save.ability} save vs DC ${spellSaveDC}.`,
        };
    }

    return {
        success: true,
        spell,
        character: nextCharacter,
        consumedSlot: spent.consumedSlot,
        activeEffect: activeEffect || undefined,
        storyModifier,
        concentrationReplaced,
        summary: `${spell.name} applied.`,
    };
}

function conditionToEffect(condition: ConditionEntry): ActiveEffect {
    const modifiers: ActiveEffect['modifiers'] = [];
    if (condition.movement === 'zero') modifiers.push({ stat: 'speed', bonus: 0, setTo: 0 });

    return {
        id: makeId('condition'),
        name: condition.name,
        source: 'condition',
        duration: 'permanent',
        description: condition.summary,
        modifiers,
    };
}

export function applyConditionToCharacter(character: CharacterSheet, conditionName: string): { character: CharacterSheet; condition?: ConditionEntry; effect?: ActiveEffect; found: boolean } {
    const condition = lookupCondition(conditionName);
    if (!condition) return { character, found: false };
    const effect = conditionToEffect(condition);
    return {
        found: true,
        condition,
        effect,
        character: {
            ...character,
            activeEffects: [...(character.activeEffects || []).filter(existing => existing.name.toLowerCase() !== condition.name.toLowerCase()), effect],
        },
    };
}

export function applyConditionToEncounter(
    current: EncounterState,
    targetName: string,
    conditionName: string
): { state: EncounterState; found: boolean; target?: Combatant; condition?: ConditionEntry; effect?: ActiveEffect; ambiguous?: boolean } {
    const condition = lookupCondition(conditionName);
    if (!condition) return { state: current, found: false };
    const lookup = resolveCombatantReference(current, targetName);
    if (!lookup.combatant || lookup.ambiguous) {
        return { state: current, found: false, condition, ambiguous: lookup.ambiguous };
    }

    const effect = conditionToEffect(condition);
    let target: Combatant | undefined;
    const combatants = current.combatants.map(combatant => {
        if (combatant.id !== lookup.combatant!.id) return combatant;
        const activeEffects = [
            ...(combatant.activeEffects || []).filter(existing => existing.name.toLowerCase() !== condition.name.toLowerCase()),
            effect,
        ];
        target = { ...combatant, activeEffects };
        return target;
    });

    return {
        found: true,
        target,
        condition,
        effect,
        state: syncCurrentTurn({
            ...current,
            combatants,
            logs: [...(current.logs || []), makeLog(`${target!.name} is ${condition.name}`, 'condition')],
        }),
    };
}

function rollDamageAmount(formula: string, critical = false): { total: number; raw: number } {
    const rolled = rollDice(formula);
    const raw = critical
        ? rolled.rolls.reduce((sum, roll) => sum + roll * 2, 0) + rolled.modifier
        : rolled.total;
    return { total: Math.max(0, raw), raw: Math.max(0, raw) };
}

export interface AoESpellTargetResult {
    id: string;
    name: string;
    saveTotal: number;
    saveSuccess: boolean;
    damage: number;
    mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable';
    hp: { current: number; max: number };
    conditionApplied?: string;
}

/**
 * Sort de ZONE (Boule de feu, Mains brûlantes…) : chaque cible fait SA
 * sauvegarde (bonus du bestiaire), les dégâts sont lancés UNE fois (SRD) et
 * appliqués par cible (½ ou annulé selon le sort). Avant, un sort de zone ne
 * touchait qu'une seule cible.
 */
export function resolveSpellAgainstTargets(
    current: EncounterState,
    prompt: RollPromptState,
    targetIds: string[],
): { state: EncounterState; results: AoESpellTargetResult[]; sharedDamageRoll: number; summary: string } | null {
    const pending = prompt.pendingSpell;
    if (!pending || prompt.type !== 'SAVE' || !targetIds.length) return null;

    const spell = lookupSpell(pending.spellName);
    const saveAbility = String(spell?.save?.ability || 'DEX').toUpperCase();
    const effectOnSuccess = pending.effectOnSuccess || spell?.save?.effectOnSuccess || 'half';
    const dmgRoll = pending.damageFormula ? rollDice(pending.damageFormula) : { total: 0 };

    let state = current;
    const results: AoESpellTargetResult[] = [];
    for (const id of targetIds) {
        const lookup = resolveCombatantReference(state, id, { livingOnly: true, autoResolve: true });
        const target = lookup.combatant;
        if (!target || target.isPlayer) continue;

        // Bonus de sauvegarde par cible : `saves` du bestiaire (déjà un mod),
        // sinon (score-10)/2, sinon +0.
        const creature: any = lookupMonster(target.name) || getCreature(target.name);
        let saveBonus = 0;
        if (creature && 'saves' in creature && creature.saves?.[saveAbility] !== undefined) {
            saveBonus = creature.saves[saveAbility];
        } else if (creature && 'stats' in creature && creature.stats?.[saveAbility] !== undefined) {
            saveBonus = Math.floor((creature.stats[saveAbility] - 10) / 2);
        }
        const outcome = resolveRollPrompt(normalizeRollPrompt({
            reason: `${target.name} — save ${saveAbility} vs ${pending.spellName}`,
            formula: `1d20${saveBonus >= 0 ? '+' : ''}${saveBonus}`,
            dc: prompt.dc,
            type: 'SAVE',
        }));
        const raw = outcome.success
            ? (effectOnSuccess === 'half' ? Math.floor(dmgRoll.total / 2) : 0)
            : dmgRoll.total;
        let damage = 0;
        let mitigation: AoESpellTargetResult['mitigation'] = 'normal';
        let after = target;
        if (raw > 0) {
            const applied = applyDamageToEncounter(state, combatantKey(target), raw, pending.damageType);
            if (applied.found && applied.target) {
                state = applied.state;
                after = applied.target;
                damage = applied.amountApplied || 0;
                mitigation = applied.mitigation || 'normal';
            }
        }
        let conditionApplied: string | undefined;
        if (!outcome.success && pending.conditionOnFailure) {
            const conditioned = applyConditionToEncounter(state, combatantKey(after), pending.conditionOnFailure);
            if (conditioned.found && conditioned.target) {
                state = conditioned.state;
                after = conditioned.target;
                conditionApplied = conditioned.condition?.name;
            }
        }
        results.push({
            id: after.id,
            name: after.name,
            saveTotal: outcome.total,
            saveSuccess: outcome.success,
            damage,
            mitigation,
            hp: after.hp,
            conditionApplied,
        });
    }
    if (!results.length) return null;

    const summary = results
        .map(r => `${r.name}: save ${r.saveTotal} vs DC ${prompt.dc} ${r.saveSuccess ? 'OK' : 'FAIL'} → ${r.damage} dmg${r.mitigation !== 'normal' ? ` (${r.mitigation})` : ''}${r.hp.current <= 0 ? ' — DOWN' : ''}${r.conditionApplied ? `, ${r.conditionApplied}` : ''}`)
        .join('; ');
    return { state, results, sharedDamageRoll: dmgRoll.total, summary };
}

export function resolvePendingSpellRoll(current: EncounterState, outcome: RollOutcome): PendingSpellResolution {
    const pending = outcome.prompt.pendingSpell;
    if (!pending) {
        return { resolved: false, state: current, summary: 'No pending spell attached to this roll.' };
    }

    const targetRef = pending.targetId || pending.target || '';
    const targetLookup = resolveCombatantReference(current, targetRef);
    if (!targetLookup.combatant || targetLookup.ambiguous) {
        return {
            resolved: true,
            state: current,
            summary: targetLookup.ambiguous
                ? `Spell target "${pending.target}" is ambiguous; no local damage was applied.`
                : `Spell target "${pending.target}" was not found in combat.`,
            ambiguous: targetLookup.ambiguous,
        };
    }

    const isAttack = outcome.prompt.type === 'ATTACK';
    const attackHit = outcome.die === 20 || (outcome.die !== 1 && outcome.success);
    const saveSucceeded = outcome.prompt.type === 'SAVE' && outcome.success;
    const effectOnSuccess = pending.effectOnSuccess || 'negates';
    const shouldApplyFullDamage = isAttack ? attackHit : !saveSucceeded;
    const shouldApplyHalfDamage = !isAttack && saveSucceeded && effectOnSuccess === 'half';
    const conditionFails = !isAttack && !saveSucceeded && Boolean(pending.conditionOnFailure);

    let state = current;
    let target = targetLookup.combatant;
    let damage = 0;
    let rawDamage = 0;
    let mitigation: PendingSpellResolution['mitigation'] = 'normal';

    if (pending.damageFormula && (shouldApplyFullDamage || shouldApplyHalfDamage)) {
        const rolled = rollDamageAmount(pending.damageFormula, isAttack && outcome.die === 20);
        rawDamage = shouldApplyHalfDamage ? Math.floor(rolled.raw / 2) : rolled.raw;
        const applied = applyDamageToEncounter(state, combatantKey(target), rawDamage, pending.damageType);
        if (applied.found && applied.target) {
            state = applied.state;
            target = applied.target;
            damage = applied.amountApplied || 0;
            mitigation = applied.mitigation || 'normal';
        }
    }

    let conditionApplied: string | undefined;
    if (conditionFails && pending.conditionOnFailure) {
        const conditioned = applyConditionToEncounter(state, combatantKey(target), pending.conditionOnFailure);
        if (conditioned.found && conditioned.target) {
            state = conditioned.state;
            target = conditioned.target;
            conditionApplied = conditioned.condition?.name;
        }
    }

    const resultText = isAttack
        ? `${pending.spellName} ${attackHit ? 'hit' : 'missed'} ${target.name}`
        : `${target.name} ${saveSucceeded ? 'succeeded' : 'failed'} the save vs ${pending.spellName}`;
    const damageText = damage > 0 ? ` for ${damage}${pending.damageType ? ` ${pending.damageType}` : ''} damage` : '';
    const conditionText = conditionApplied ? ` and is ${conditionApplied}` : '';

    return {
        resolved: true,
        state,
        target,
        damage,
        rawDamage,
        damageType: pending.damageType,
        conditionApplied,
        mitigation,
        summary: `${resultText}${damageText}${conditionText}.`,
    };
}

export function resolveConcentrationAfterDamage(character: CharacterSheet, damage: number, rollTotal?: number): ConcentrationCheckResult {
    const concentrationEffects = (character.activeEffects || []).filter(effect => effect.concentration);
    const dc = Math.max(10, Math.floor(Math.max(0, damage) / 2));
    if (!concentrationEffects.length || damage <= 0) {
        return { character, dc, broken: false, removedEffects: [] };
    }

    if (character.hp.current <= 0) {
        const removedNames = new Set(concentrationEffects.map(e => e.name.toLowerCase()));
        const storyModifiers = (character.storyModifiers || []).filter(mod => {
            const modName = mod.name.toLowerCase();
            return !removedNames.has(modName) && mod.source !== 'blessing';
        });
        return {
            character: { 
                ...character, 
                activeEffects: (character.activeEffects || []).filter(effect => !effect.concentration),
                storyModifiers,
            },
            dc,
            broken: true,
            removedEffects: concentrationEffects,
        };
    }

    const conMod = abilityMod(getEffectiveStat(character, 'CON'));
    // Feat hook: War Caster grants advantage on concentration saves.
    const warCaster = featGrantsAdvantageOn(character, 'concentration_save');
    const prompt: RollPromptState = {
        type: 'SAVE',
        name: 'Concentration save',
        dc,
        formula: `1d20${conMod >= 0 ? '+' : ''}${conMod}`,
        advantage: warCaster ? 'advantage' : 'normal',
        dmBonus: 0,
        requestedAt: Date.now(),
        concentrationDamage: damage,
        contextReasons: [
            `Concentration: DC ${dc} after ${damage} damage`,
            ...(warCaster ? ['War Caster: advantage on concentration saves'] : []),
        ],
    };

    if (!Number.isFinite(Number(rollTotal))) {
        return { character, dc, broken: false, removedEffects: [], prompt };
    }

    const broken = Number(rollTotal) < dc;
    let nextCharacter = character;
    if (broken) {
        const removedNames = new Set(concentrationEffects.map(e => e.name.toLowerCase()));
        const storyModifiers = (character.storyModifiers || []).filter(mod => {
            const modName = mod.name.toLowerCase();
            return !removedNames.has(modName) && mod.source !== 'blessing';
        });
        nextCharacter = {
            ...character,
            activeEffects: (character.activeEffects || []).filter(effect => !effect.concentration),
            storyModifiers,
        };
    }

    return {
        character: nextCharacter,
        dc,
        broken,
        removedEffects: broken ? concentrationEffects : [],
        prompt,
    };
}

export function sanitizeXPGrant(amount: number, activeEnemyNames: string[] = []): number {
    const safe = Math.max(0, amount || 0);
    const names = activeEnemyNames.filter(Boolean);
    if (!names.length) return clampXP(safe);
    // Clamp against the REAL bestiary XP (French names included) — the legacy
    // English-only ENEMY_XP table dropped "Gobelin"/"Chef gobelin" to the 50 XP
    // default and quietly starved FR campaigns of combat XP on end_combat.
    const baseXP = names.reduce(
        (sum, name) => sum + (getCreature(name)?.xp ?? lookupMonster(name)?.xp ?? getEnemyXP(name)),
        0
    );
    return Math.min(safe, Math.round(Math.max(baseXP * 1.5, 100)));
}

export function nextLevelFromXP(character: CharacterSheet, xpGain: number): number {
    return calculateLevelFromXP(character.xp + Math.max(0, xpGain));
}

export function rollDamageFormula(formula: string): ReturnType<typeof rollDice> {
    return rollDice(formula);
}

function hitDieForClass(cls: string): number {
    const table: Record<string, number> = {
        Barbarian: 12,
        Fighter: 10,
        Paladin: 10,
        Ranger: 10,
        Cleric: 8,
        Druid: 8,
        Rogue: 8,
        Bard: 8,
        Monk: 8,
        Warlock: 8,
        Mage: 6,
        Wizard: 6,
        Sorcerer: 6,
    };
    return table[cls] || 8;
}

function defaultResources(character: CharacterSheet): CharacterSheet['resources'] {
    const cls = character.class;
    const level = character.level;
    const chaMod = Math.max(1, abilityMod(getEffectiveStat(character, 'CHA')));
    const resources: CharacterSheet['resources'] = {};

    if (cls === 'Fighter') {
        resources.secondWind = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Second Wind' };
        if (level >= 2) resources.actionSurge = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Action Surge' };
        if (character.subclass === 'Battle Master' && level >= 3) {
            const dice = level >= 15 ? 6 : level >= 7 ? 5 : 4;
            const die = level >= 10 ? 'd10' : 'd8';
            resources.superiorityDice = { current: dice, max: dice, recoverOn: 'short_rest', label: `Superiority Dice (${die})` };
        }
    }
    if (cls === 'Paladin') {
        resources.layOnHands = { current: level * 5, max: level * 5, recoverOn: 'long_rest', label: 'Lay on Hands' };
    }
    if (cls === 'Barbarian') {
        const rageMax = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
        resources.rage = { current: rageMax, max: rageMax, recoverOn: 'long_rest', label: 'Rage' };
    }
    if (cls === 'Bard') {
        resources.bardicInspiration = {
            current: chaMod,
            max: chaMod,
            recoverOn: level >= 5 ? 'short_rest' : 'long_rest',
            label: 'Bardic Inspiration',
        };
    }
    if (cls === 'Cleric' && level >= 2) {
        resources.channelDivinity = { current: level >= 6 ? 2 : 1, max: level >= 6 ? 2 : 1, recoverOn: 'short_rest', label: 'Channel Divinity' };
    }
    if (cls === 'Cleric' && character.subclass === 'War Domain') {
        // War Priest: bonus-action weapon attack, WIS-mod uses per long rest.
        const wisMod = Math.max(1, abilityMod(getEffectiveStat(character, 'WIS')));
        resources.warPriest = { current: wisMod, max: wisMod, recoverOn: 'long_rest', label: 'War Priest' };
    }
    if (cls === 'Druid' && level >= 2) {
        resources.wildShape = { current: 2, max: 2, recoverOn: 'short_rest', label: 'Wild Shape' };
    }
    if (cls === 'Monk' && level >= 2) {
        resources.ki = { current: level, max: level, recoverOn: 'short_rest', label: 'Ki' };
    }
    if (cls === 'Sorcerer' && level >= 2) {
        resources.sorceryPoints = { current: level, max: level, recoverOn: 'long_rest', label: 'Sorcery Points' };
    }
    if (cls === 'Mage' || cls === 'Wizard') {
        resources.arcaneRecovery = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Arcane Recovery' };
    }
    // Feat Chanceux : 3 points de chance par repos long (avantage à la demande).
    if (hasFeatSpecial(character, 'lucky_points')) {
        resources.luckyPoints = { current: 3, max: 3, recoverOn: 'long_rest', label: 'Points de chance' };
    }
    // Familier lié : « Aide du familier » — 1×/repos court, avantage sur la
    // prochaine attaque (le familier distrait/harcèle la cible).
    if (character.familiar) {
        resources.familiarHelp = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Aide du familier' };
    }

    return resources;
}

function defaultSpellSlots(character: CharacterSheet): CharacterSheet['spellSlots'] {
    const fullCasters = ['Bard', 'Cleric', 'Druid', 'Mage', 'Wizard', 'Sorcerer'];
    const halfCasters = ['Paladin', 'Ranger'];
    const warlock = character.class === 'Warlock';
    const level = character.level;

    if (!fullCasters.includes(character.class) && !halfCasters.includes(character.class) && !warlock) return undefined;

    if (warlock) {
        const max = level >= 11 ? 3 : level >= 2 ? 2 : 1;
        const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
        return { [`pact${slotLevel}`]: { current: max, max } };
    }

    if (halfCasters.includes(character.class) && level < 2) return undefined;

    const casterLevel = fullCasters.includes(character.class) ? level : Math.max(1, Math.ceil(level / 2));
    const casterSlotProgression: Record<number, Record<string, number>> = {
        1: { '1': 2 },
        2: { '1': 3 },
        3: { '1': 4, '2': 2 },
        4: { '1': 4, '2': 3 },
        5: { '1': 4, '2': 3, '3': 2 },
        6: { '1': 4, '2': 3, '3': 3 },
        7: { '1': 4, '2': 3, '3': 3, '4': 1 },
        8: { '1': 4, '2': 3, '3': 3, '4': 2 },
        9: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
        10: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 },
        11: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
        12: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
        13: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
        14: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
        15: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
        16: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
        17: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1, '9': 1 },
        18: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 1, '7': 1, '8': 1, '9': 1 },
        19: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 1, '8': 1, '9': 1 },
        20: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1 },
    };

    const prog = casterSlotProgression[Math.max(1, Math.min(20, casterLevel))] || { '1': 2 };
    const slots: CharacterSheet['spellSlots'] = {};
    for (const [lvl, max] of Object.entries(prog)) {
        slots[lvl] = { current: max, max };
    }
    return slots;
}

export function ensureProgressionState(character: CharacterSheet): CharacterSheet {
    const defaultRes = defaultResources(character) || {};
    const charRes = character.resources || {};
    const resources: CharacterSheet['resources'] = {};
    
    for (const key of Object.keys({ ...defaultRes, ...charRes })) {
        const def = defaultRes[key];
        const char = charRes[key];
        if (def && char) {
            resources[key] = {
                ...char,
                max: def.max,
                label: def.label,
                recoverOn: def.recoverOn,
                current: Math.min(char.current, def.max),
            };
        } else if (def) {
            resources[key] = def;
        } else if (char) {
            resources[key] = char;
        }
    }

    return {
        ...character,
        resources,
        spellSlots: character.spellSlots || defaultSpellSlots(character),
        hitDice: character.hitDice || {
            die: hitDieForClass(character.class),
            total: character.level,
            remaining: character.level,
        },
    };
}

export function applyShortRest(character: CharacterSheet, spendHitDice = 0): CharacterSheet {
    const ensured = ensureProgressionState(character);
    const resources = Object.fromEntries(Object.entries(ensured.resources || {}).map(([key, resource]) => [
        key,
        resource.recoverOn === 'short_rest' ? { ...resource, current: resource.max } : resource,
    ]));

    let spellSlots = ensured.spellSlots
        ? Object.fromEntries(
            Object.entries(ensured.spellSlots).map(([key, slot]) => [
                key,
                key.toLowerCase().startsWith('pact')
                    ? { ...slot, current: slot.max }
                    : slot
            ])
        )
        : undefined;

    // Restauration arcanique (Mage/Wizard) : lors d'un repos court, récupère
    // automatiquement des emplacements (somme des niveaux ≤ ⌈niveau/2⌉, jamais
    // de niveau 6+), une fois par repos long. Greedy du plus haut au plus bas.
    if ((ensured.class === 'Mage' || ensured.class === 'Wizard')
        && (resources.arcaneRecovery?.current ?? 0) > 0 && spellSlots) {
        let budget = Math.ceil((ensured.level || 1) / 2);
        let recovered = false;
        for (let lvl = 5; lvl >= 1; lvl--) {
            const key = String(lvl);
            while (spellSlots[key] && spellSlots[key].current < spellSlots[key].max && budget >= lvl) {
                spellSlots = { ...spellSlots, [key]: { ...spellSlots[key], current: spellSlots[key].current + 1 } };
                budget -= lvl;
                recovered = true;
            }
        }
        if (recovered) {
            resources.arcaneRecovery = { ...resources.arcaneRecovery, current: resources.arcaneRecovery.current - 1 };
        }
    }

    let hp = ensured.hp.current;
    let hitDice = ensured.hitDice!;
    const diceToSpend = Math.max(0, Math.min(spendHitDice, hitDice.remaining));
    if (diceToSpend > 0) {
        const conMod = abilityMod(getEffectiveStat(ensured, 'CON'));
        for (let i = 0; i < diceToSpend; i++) {
            hp = clampHP(hp + Math.max(1, Math.floor(Math.random() * hitDice.die) + 1 + conMod), ensured.hp.max);
        }
        hitDice = { ...hitDice, remaining: hitDice.remaining - diceToSpend };
    }

    // Beast Master companion patches itself up too: a short rest brings it back
    // to at least half its max (and revives it if downed).
    const companionMax = Math.max(11, 4 * (ensured.level || 1));
    const companionHP = ensured.subclass === 'Beast Master'
        ? {
            max: companionMax,
            current: Math.max(Math.floor(companionMax / 2), Math.min(companionMax, ensured.companionHP?.current ?? companionMax)),
        }
        : ensured.companionHP;

    // Recruited companions also patch up to at least half (revives the downed).
    const companions = ensured.companions?.map(comp => ({
        ...comp,
        hp: { ...comp.hp, current: Math.max(Math.floor(comp.hp.max / 2), Math.min(comp.hp.max, comp.hp.current)) },
    }));

    // La monture VIVANTE se remet à au moins la moitié. Une monture à 0 PV
    // reste hors jeu au repos court (le Destrier céleste revient au repos long).
    const mount = ensured.mount?.hp && ensured.mount.hp.current > 0
        ? {
            ...ensured.mount,
            hp: { ...ensured.mount.hp, current: Math.max(Math.floor(ensured.mount.hp.max / 2), Math.min(ensured.mount.hp.max, ensured.mount.hp.current)) },
        }
        : ensured.mount;

    return {
        ...ensured,
        hp: { ...ensured.hp, current: hp },
        resources,
        spellSlots,
        hitDice,
        companionHP,
        companions,
        mount,
    };
}

export function applyLongRest(character: CharacterSheet): CharacterSheet {
    const ensured = ensureProgressionState(character);
    const resources = Object.fromEntries(Object.entries(ensured.resources || {}).map(([key, resource]) => [
        key,
        resource.recoverOn === 'short_rest' || resource.recoverOn === 'long_rest'
            ? { ...resource, current: resource.max }
            : resource,
    ]));
    const spellSlots = ensured.spellSlots
        ? Object.fromEntries(Object.entries(ensured.spellSlots).map(([key, slot]) => [key, { ...slot, current: slot.max }]))
        : undefined;
    const regainedHitDice = Math.max(1, Math.floor(ensured.level / 2));
    const hitDice = ensured.hitDice || { die: hitDieForClass(ensured.class), total: ensured.level, remaining: ensured.level };

    // Long rest: the Beast Master companion fully recovers (and revives).
    const companionMax = Math.max(11, 4 * (ensured.level || 1));
    const companionHP = ensured.subclass === 'Beast Master'
        ? { current: companionMax, max: companionMax }
        : ensured.companionHP;

    // Recruited companions fully recover too.
    const companions = ensured.companions?.map(comp => ({
        ...comp,
        hp: { ...comp.hp, current: comp.hp.max },
    }));

    // La monture récupère tout — y compris le Destrier céleste tombé, qui est
    // RE-INVOQUÉ au repos long (Appel de destrier).
    const mount = ensured.mount?.hp
        ? { ...ensured.mount, hp: { ...ensured.mount.hp, current: ensured.mount.hp.max } }
        : ensured.mount;

    return {
        ...ensured,
        companions,
        mount,
        hp: { ...ensured.hp, current: ensured.hp.max },
        tempHP: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
        activeEffects: (ensured.activeEffects || []).filter(effect => effect.duration === 'permanent'),
        resources,
        spellSlots,
        hitDice: {
            ...hitDice,
            total: ensured.level,
            remaining: Math.min(ensured.level, hitDice.remaining + regainedHitDice),
        },
        companionHP,
    };
}
