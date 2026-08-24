import { Combatant, combatantSide, isHero } from '../components/CombatTracker';
export { combatantSide, isHero } from '../components/CombatTracker';
import { getCreature, getCreatureAttacks } from '../data/bestiary';
import { getFeatById } from '../data/feats';
import { CLASS_DATA } from '../data/classes';
import { gearAdvantageFor, foldText } from './skillSystem';
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
    getEffectiveMaxHP,
    getPlayerAttackModifier,
    getPlayerDamageBonus,
    getPlayerAttackCount,
    getDraconicDamageType,
    isRangedWeapon,
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
    /** CB7 — caractéristique de la sauvegarde quand l'appelant la connaît déjà
     *  (request_roll) : l'inférence textuelle rate les noms français
     *  (« Sauvegarde de Force » ne contient pas « STR »). */
    saveAbility?: Ability;
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
    /** cb-m6 — drapeau partagé des riders « 1×/tour » (Sneak Attack, Frappe
     *  divine, Furie divine, Colossus Slayer, Attaquant sauvage) : l'attaque
     *  BONUS de Frénésie ne touche pas attacksUsed, le rider s'appliquait donc
     *  sur la bonus PUIS à nouveau sur la première attaque principale. */
    onceRiderUsed?: boolean;
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
    /** Ids des effets à USAGE UNIQUE dépensés par ce coup (Châtiment divin :
     *  l'emplacement de sort est brûlé pour UN coup, pas pour le round entier).
     *  L'appelant les retire de la fiche — le moteur ne possède pas le
     *  personnage et ne peut pas les consommer lui-même. */
    consumedEffectIds?: string[];
    /** Réaction défensive auto-déclenchée par le moteur sur ce coup (SRD) :
     *  Esquive instinctive (Roublard 5+) ou Déviation de projectiles (Moine 3+). */
    reaction?: 'uncanny_dodge' | 'deflect_missiles';
    /** Réduction totale lancée pour la Déviation (1d10+DEX+niveau). */
    reactionAmount?: number;
    /** Rage implacable (Barbare 11+) : le joueur est resté à 1 PV au lieu de 0. */
    relentless?: boolean;
    /** Le moteur a jugé ce coup en mêlée (false = tir/jet à distance). */
    isMeleeAttack?: boolean;
}

export interface SpellCastResult {
    success: boolean;
    error?: string;
    spell?: SpellEntry;
    character: CharacterSheet;
    consumedSlot?: number;
    prompt?: RollPromptState;
    healing?: number;
    /** CB1 — false quand le soin vise une AUTRE cible que le lanceur : la
     *  fiche du lanceur n'a PAS été soignée, l'appelant applique `healing`
     *  à la cible réelle (ligne de combat, compagnon…). */
    healingTargetsSelf?: boolean;
    damageFormula?: string;
    damageType?: CodexDamageType;
    conditionOnFailure?: string;
    activeEffect?: ActiveEffect;
    storyModifier?: StoryRollModifier;
    concentrationReplaced?: string[];
    /**
     * Sort à TOUCHE AUTOMATIQUE (Projectile magique…) : il inflige des dégâts
     * sans jet d'attaque ni sauvegarde. L'appelant applique directement ces
     * dégâts via applyAutoDamageSpell — sans ça le sort ne faisait rien du tout.
     */
    autoDamage?: {
        damageFormula: string;
        damageType?: CodexDamageType;
        target?: string;
        targetId?: string;
    };
    /** Métamagie Sort accéléré consommée par CE lancement : l'appelant dépense
     *  l'ACTION BONUS au lieu de l'action principale. */
    quickened?: boolean;
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
    // ou-m8 — normalisation NFD : « désavantage » accentué devenait 'normal'.
    const text = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

    // Combatant-level mitigations first — this is how the PLAYER's racial
    // resistances (Dwarf poison, Tiefling fire, Dragonborn ancestry…) take
    // effect, et désormais aussi immunités/vulnérabilités (audit 2026-08-12 :
    // le joueur ne pouvait jamais être immunisé ni vulnérable).
    if (target.immunities?.some(r => normalizeDamageType(r) === type)) {
        return { amountApplied: 0, mitigation: 'immune' };
    }
    if (target.vulnerabilities?.some(r => normalizeDamageType(r) === type)) {
        return { amountApplied: Math.max(0, amount * 2), mitigation: 'vulnerable' };
    }
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

export interface ActionCapability {
    canAct: boolean;
    canReact: boolean;
    /** Nom de la condition qui prive d'action (Paralyzed, Stunned, Unconscious, Incapacitated). */
    blockedBy?: string;
}

/** Les états incapacitants doivent réellement priver d'action : la table SRD
 *  porte `actionRestrictions` mais rien ne la lisait — un ennemi sous Hold
 *  Person attaquait normalement à son tour. Point unique de vérité, consommé
 *  par le tour automatisé des PNJ ET par l'UI d'actions du joueur. */
export function getActionCapability(effects: ActiveEffect[] | undefined | null): ActionCapability {
    for (const effect of effects || []) {
        const condition = conditionFromEffect(effect);
        if (!condition?.actionRestrictions?.length) continue;
        // « No actions or reactions. » — Charmed ne matche pas (sa restriction
        // ne vise que le charmeur) et continue d'agir.
        if (condition.actionRestrictions.some(r => /no action/i.test(r))) {
            return { canAct: false, canReact: false, blockedBy: condition.name };
        }
    }
    return { canAct: true, canReact: true };
}

// ═══════════════ PASSIFS DE CLASSE (SRD) — appliqués par le moteur ═══════════
// Un seul point de vérité, consommé par request_roll, environmental_damage et
// les jets internes : sans ça, l'Aura de protection du paladin, le Touche-à-tout
// du barde ou le Sens du danger du barbare n'étaient que du texte sur la fiche.

/** Bonus/avantage de classe sur une SAUVEGARDE du joueur. */
export function classSavePassives(character: CharacterSheet, ability: Ability): { bonus: number; advantage: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let bonus = 0;
    let advantage = false;
    const lvl = character.level || 1;
    // Paladin 6+ — Aura de protection : +mod. CHA (min +1) à TOUTES ses sauvegardes.
    if (character.class === 'Paladin' && lvl >= 6) {
        const cha = Math.max(1, abilityMod(getEffectiveStat(character, 'CHA')));
        bonus += cha;
        reasons.push(`Aura of Protection +${cha}`);
    }
    // Barbare 2+ — Sens du danger : avantage aux sauvegardes de DEX.
    if (character.class === 'Barbarian' && lvl >= 2 && ability === 'DEX') {
        advantage = true;
        reasons.push('Danger Sense: advantage on DEX saves');
    }
    return { bonus, advantage, reasons };
}

/** Bonus de classe sur un TEST de caractéristique non maîtrisé. */
export function classCheckPassives(character: CharacterSheet, ability: Ability, proficient: boolean): { bonus: number; reasons: string[] } {
    const reasons: string[] = [];
    let bonus = 0;
    if (proficient) return { bonus, reasons };
    const lvl = character.level || 1;
    const halfProfDown = Math.floor(proficiencyBonus(lvl) / 2);
    const halfProfUp = Math.ceil(proficiencyBonus(lvl) / 2);
    // Barde 2+ — Touche-à-tout : +½ maîtrise (arrondi bas) aux tests non maîtrisés.
    if (character.class === 'Bard' && lvl >= 2) {
        bonus += halfProfDown;
        reasons.push(`Jack of All Trades +${halfProfDown}`);
    }
    // Champion 7+ — Athlète remarquable : +½ maîtrise (arrondi haut) aux tests FOR/DEX/CON.
    if (character.subclass === 'Champion' && lvl >= 7 && (ability === 'STR' || ability === 'DEX' || ability === 'CON')) {
        bonus += halfProfUp;
        reasons.push(`Remarkable Athlete +${halfProfUp}`);
    }
    return { bonus, reasons };
}

/** Esquive totale (SRD) : Roublard 7+, Moine 7+, Rôdeur Hunter 15+ — une
 *  sauvegarde de DEX réussie contre un effet « moitié dégâts » annule TOUT
 *  (et l'échec n'inflige que la moitié). */
export function hasEvasion(character: CharacterSheet): boolean {
    const lvl = character.level || 1;
    if (character.class === 'Rogue' && lvl >= 7) return true;
    if (character.class === 'Monk' && lvl >= 7) return true;
    if (character.class === 'Ranger' && character.subclass === 'Hunter' && lvl >= 15) return true;
    return false;
}

/** Dés d'arme SUPPLÉMENTAIRES sur un critique (Barbare — Critique brutal). */
export function brutalCriticalDice(character: CharacterSheet): number {
    if (character.class !== 'Barbarian') return 0;
    const lvl = character.level || 1;
    return lvl >= 17 ? 3 : lvl >= 13 ? 2 : lvl >= 9 ? 1 : 0;
}

/** Dé de Chant reposant du barde (d6 → d12 avec le niveau). */
export function songOfRestDie(level: number): number {
    return level >= 17 ? 12 : level >= 13 ? 10 : level >= 9 ? 8 : 6;
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

        // Effets NON-conditions qui pèsent sur l'avantage (Attaque téméraire) :
        // la table SRD ne couvre que les états, un trait de classe doit le dire
        // explicitement, sinon son avantage — et son revers — restent cosmétiques.
        for (const effect of input.actorEffects || []) {
            if (effect.grantsAttackAdvantage) {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, 'advantage');
                reasons.push(`${effect.name}: advantage on the attack`);
            }
        }
        for (const effect of input.targetEffects || []) {
            if (effect.grantsAttackersAdvantage) {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, 'advantage');
                reasons.push(`${effect.name}: attacks against the target have advantage`);
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
        const ability = input.saveAbility || inferSaveAbility(prompt);
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
            // RAW (audit 2026-08-12) : Effrayé impose aussi le désavantage aux
            // TESTS tant que la source de la peur est en vue ; l'Épuisement
            // (niveau 1+) impose le désavantage aux tests de caractéristique.
            // (Entravé/Aveuglé ne modifient PAS les tests en SRD — ne pas les
            // ajouter ici.)
            if (condition.id === 'frightened') {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, 'disadvantage');
                reasons.push('Frightened: ability checks have disadvantage (source of fear in sight)');
            }
            if (condition.id === 'exhaustion') {
                nextPrompt.advantage = mergeAdvantage(nextPrompt.advantage, 'disadvantage');
                reasons.push('Exhaustion: ability checks have disadvantage');
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
    // cb-m13 — somme TOUS les modificateurs : « 1d20+3+2 » perdait le +2.
    const after = String(formula || '1d20').replace(/^\s*1d20/i, '');
    let modifier = 0;
    const modRegex = /([+-])\s*(\d+)/g;
    let modMatch;
    while ((modMatch = modRegex.exec(after)) !== null) {
        modifier += (modMatch[1] === '-' ? -1 : 1) * Number(modMatch[2]);
    }
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

    // cb-m1 — RAW : le 20/1 naturel n'auto-réussit/rate que les ATTAQUES et les
    // jets de mort. Un test ou une sauvegarde garde son total contre le DD
    // (l'ancien code auto-réussissait tout sur 20, sans l'échec auto du 1).
    const autoCritApplies = prompt.type === 'ATTACK' || isDeathSave;
    if (prompt.autoFail) {
        critical = die === 1 ? 'failure' : 'none';
    } else if (die === 20) {
        critical = 'success';
        if (autoCritApplies) success = true;
    } else if (die === 1) {
        critical = 'failure';
        if (autoCritApplies) success = false;
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
/** Sauvegardes maîtrisées = classe + DONS (2026-08-13 : Résilient (CON)
 *  n'ajoutait jamais la maîtrise — le `special` était du texte mort). */
export function getProficientSaves(character: CharacterSheet): string[] {
    const saves = [...(CLASS_DATA[character.class]?.savingThrows || [])];
    if (hasFeatSpecial(character, 'save_proficiency_con') && !saves.includes('CON')) saves.push('CON');
    return saves;
}

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

/**
 * Un combat est-il DÉJÀ en cours, au point que le redémarrer dupliquerait son
 * roster ?
 *
 * L'invariant que cette fonction porte (audit 2026-08-24, B4) : une action qui
 * change l'état du monde vérifie L'ÉTAT, pas la politesse de son appelant.
 * `startEncounter` conserve délibérément le roster quand le combat est actif —
 * c'est le chemin du RECHARGEMENT de sauvegarde, voulu et testé (core.test.ts,
 * « startEncounter drops a stale (inactive) roster »). Mais `start_combat`
 * empruntait le même chemin quand le MJ l'appelait deux fois de suite : le
 * roster était conservé, le MJ repeuplait par-dessus, et le combat comptait
 * douze ennemis au lieu de six — donc le double d'XP à la victoire.
 *
 * Roster vide = rien à dupliquer : le cas dégénéré n'est pas « en cours ».
 */
export function encounterAlreadyRunning(
    state?: Partial<EncounterState> | null,
): boolean {
    return Boolean(state?.isActive && (state.combatants || []).length > 0);
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
            // PV max EFFECTIFS : un +CON d'objet/effet compte (+1 PV/niveau/point).
            hp: { current: character.hp.current, max: getEffectiveMaxHP(character) },
            ac: getCombatAC(character),
            // Feat hook: Alert (+5) or any future initiativeBonus feat is real here.
            // NF2 — un objet équipé « avantage à l'initiative » fait lancer 2d20.
            initiative: (() => {
                const d1 = Math.floor(Math.random() * 20) + 1;
                const d2 = Math.floor(Math.random() * 20) + 1;
                const die = gearAdvantageFor(character, 'initiative') ? Math.max(d1, d2) : d1;
                // RE4 — stat EFFECTIVE (bonus racial + objets), pas la base brute :
                // un Elfe perdait systématiquement son +1 d'initiative.
                return die + abilityMod(getEffectiveStat(character, 'DEX')) + featNumericBonus(character, 'initiativeBonus');
            })(),
            isPlayer: true,
            side: 'player',
            portrait: character.portrait,
            activeEffects: character.activeEffects || [],
            tempHP: character.tempHP || 0,
            dexMod: abilityMod(getEffectiveStat(character, 'DEX')),
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
                attack: { ...beast.attack },
            } as Combatant);
        }
    }

    // La MONTURE combat aussi : elle rejoint chaque rencontre comme alliée
    // avec les stats de son type (PV persistants sur la fiche). À 0 PV elle ne
    // se présente plus (morte, ou céleste en attente de repos long).
    if (character.mount && !combatants.some(c => c.id === 'mount')) {
        const mountType = getMountType(character.mount.kind || character.mount.name);
        // Cavalier (Paladin) — Monture liée : +niveau du héros en PV max.
        const cavalierBonus = character.subclass === 'Cavalier' ? (character.level || 1) : 0;
        const mountMax = (character.mount.hp?.max ?? mountType?.hp ?? 15) + cavalierBonus;
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
                attack: mountType?.attack ? { ...mountType.attack } : allyAttackProfile(null, null, character.level || 1),
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
            attack: comp.attack
                ? { name: comp.attack.name, attackBonus: comp.attack.attackBonus, damage: comp.attack.damage, damageType: comp.attack.damageType }
                : allyAttackProfile(null, getCreature(comp.name), character.level || 1),
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
        // cb-m14 — en combat DÉJÀ actif (renfort via add_enemy_init), ne pas
        // écraser un attacksMax boosté (Sursaut d'action en cours) : on garde
        // le plus grand des deux.
        attacksMax: Math.max(
            getPlayerAttackCount(character),
            Number((actionEconomy[playerKey] as any)?.attacksMax) || 0,
        ),
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

/**
 * Aptitudes de classe que le JOUEUR déclenche depuis ses propres boutons.
 *
 * Le prompt système les liste déjà (« CLASS ABILITY BUTTONS … never re-apply
 * its effect yourself »), mais rien ne les distinguait d'un sort côté moteur :
 * `cast_spell("Imposition des mains")` tombait sur « Spell not found in SRD
 * Codex », un cul-de-sac qui n'apprenait rien au MJ.
 *
 * Les noms FR sont nécessaires : data/classFeatures.ts porte des noms anglais
 * avec des descriptions françaises, donc le MJ francophone n'a que la
 * traduction sous la main.
 */
const PLAYER_CLASS_ABILITIES: Array<{ label: string; aliases: string[] }> = [
    { label: 'Lay on Hands', aliases: ['lay on hands', 'imposition des mains'] },
    { label: 'Divine Smite', aliases: ['divine smite', 'chatiment divin'] },
    { label: 'Divine Sense', aliases: ['divine sense', 'perception divine', 'sens divin'] },
    { label: 'Rage', aliases: ['rage'] },
    { label: 'Second Wind', aliases: ['second wind', 'second souffle'] },
    { label: 'Action Surge', aliases: ['action surge', 'fougue', 'sursaut d action'] },
    { label: 'Bardic Inspiration', aliases: ['bardic inspiration', 'inspiration bardique'] },
    { label: 'Flurry of Blows', aliases: ['flurry of blows', 'deluge de coups'] },
    { label: 'Patient Defense', aliases: ['patient defense', 'defense patiente'] },
    { label: 'Sneak Attack', aliases: ['sneak attack', 'attaque sournoise'] },
];

/** Le nom demandé désigne-t-il une aptitude de classe plutôt qu'un sort ? */
export function matchPlayerClassAbility(name: string): string | null {
    const fold = foldText(String(name || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!fold) return null;
    for (const ability of PLAYER_CLASS_ABILITIES) {
        if (ability.aliases.some(alias => fold === alias || fold.includes(alias))) return ability.label;
    }
    return null;
}

export function addEnemyToEncounter(current: EncounterState, args: any): { state: EncounterState; combatant: Combatant } {
    const requested = String(args?.name || '').trim();
    const creature = getCreature(requested || 'Enemy');
    // TR10 (audit de séance du 2026-08-23) — le nom du MJ était ÉCRASÉ par celui
    // du bestiaire SRD. Séquence observée : add_enemy_init("Garde des Quais A")
    // et ("… B") créaient deux combattants nommés « Guard » ; ensuite
    // set_enemy_target et resolve_attack sur « Garde des Quais A » renvoyaient
    // « Enemy not found », et les deux homonymes rendaient même le bon nom
    // ambigu. Le MJ a fini par passer l'id brut — deux minutes de combat sans
    // résolution mécanique.
    //
    // La créature ne sert qu'aux STATISTIQUES ; le nom affiché et la poignée
    // restent ceux du MJ. C'est aussi ce qu'exigent les bestiaires re-skinnés
    // des campagnes d'auteur (« le moteur utilise les IDs SRD, le MJ narre
    // TOUJOURS la version re-skinnée »). Les relectures ultérieures via
    // getCreature(combatant.name) reçoivent désormais la MÊME chaîne qu'à la
    // création — donc le même résultat, par construction.
    //
    // On ne DÉDOUBLONNE PAS les homonymes : l'ambiguïté sur deux noms
    // identiques est une protection voulue et testée (« ambiguous-name
    // protection » dans core.test.ts) — elle force le MJ à désigner par id
    // plutôt que de frapper le mauvais gobelin. Le drame de la séance ne venait
    // pas d'homonymes choisis par le MJ, mais d'homonymes FABRIQUÉS par le
    // moteur en écrasant deux noms pourtant distincts.
    const name = requested || creature?.name || 'Enemy';
    // OU3 — un ennemi HOMEBREW sans hp ne naît plus avec 1 PV : défaut
    // proportionné au niveau du groupe (min 8 / 6×niveau), symétrique du
    // défaut des alliés. Le prompt encourage les variantes custom (« Goblin
    // Boss ») — avant, l'oubli du hp le faisait mourir au premier coup.
    const fallbackLevel = Math.max(1, Math.trunc(Number(args?.partyLevel) || 0) || 1);
    const fallbackHP = Math.max(8, 6 * fallbackLevel);
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) && Number(args.hp) > 0 ? Number(args.hp) : fallbackHP);
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
/**
 * Profil d'attaque d'un allié : chiffres explicites du MJ > attaque du
 * bestiaire > profil générique proportionné au niveau du héros. Il y a
 * TOUJOURS un profil, pour que le moteur puisse jouer le tour de l'allié —
 * avant, un allié inconnu du bestiaire n'avait aucune attaque et son tour se
 * contentait d'attendre le MJ pendant 8 s, puis passait.
 */
export function allyAttackProfile(args: any, creature: any, level = 1): { name: string; attackBonus: number; damage: string; damageType: string } {
    const explicitDamage = String(args?.damageFormula || args?.damage || '').trim();
    if (explicitDamage) {
        return {
            name: String(args?.attackName || args?.attack || 'Attack'),
            attackBonus: Number.isFinite(Number(args?.attackBonus)) ? Number(args.attackBonus) : 3 + Math.floor(level / 4),
            damage: explicitDamage,
            damageType: String(args?.damageType || 'slashing'),
        };
    }
    const fromBestiary: any = creature ? getCreatureAttacks(creature)[0] : null;
    if (fromBestiary) {
        return {
            name: String(fromBestiary.name || 'Attack'),
            attackBonus: Number(fromBestiary.attackBonus) || 4,
            damage: String(fromBestiary.damage || '1d6+2'),
            damageType: String(fromBestiary.damageType || 'slashing'),
        };
    }
    // Garde-fou : un PNJ improvisé frappe comme un combattant de la classe du
    // héros — assez pour compter, jamais assez pour voler la vedette.
    const tier = Math.max(1, Math.min(20, level));
    return {
        name: 'Attack',
        attackBonus: 3 + Math.floor(tier / 4),
        damage: `1d8+${1 + Math.floor(tier / 5)}`,
        damageType: 'slashing',
    };
}

export function addAllyToEncounter(current: EncounterState, args: any, characterLevel = 1): { state: EncounterState; combatant: Combatant } {
    const creature = getCreature(String(args?.name || 'Ally'));
    const name = creature?.name || String(args?.name || 'Ally');
    // Un allié sans PV explicites naissait avec **1 PV** et mourait au premier
    // coup. Défaut proportionné au niveau du héros quand le MJ n'a rien donné.
    const fallbackHp = Math.max(8, 6 * Math.max(1, characterLevel));
    const hp = creature?.hp.base ?? (Number.isFinite(Number(args?.hp)) && Number(args.hp) > 0 ? Number(args.hp) : fallbackHp);
    const ac = creature?.ac ?? (Number.isFinite(Number(args?.ac)) ? Number(args.ac) : 13);
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
        // Le profil voyage AVEC le combattant : le moteur joue son tour même si
        // le MJ ne rappelle jamais resolve_attack.
        attack: allyAttackProfile(args, creature, characterLevel),
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

/** Concentration d'un PNJ brisée par des dégâts — détail pour le transcript. */
export interface NpcConcentrationBreak {
    casterName: string;
    effectName: string;
    targetId?: string;
    roll: number;
    dc: number;
    /** true si la concentration tombe parce que le lanceur est à 0 PV. */
    downed: boolean;
}

export function applyDamageToEncounter(
    current: EncounterState,
    targetName: string,
    amount: number,
    damageType?: string
): { state: EncounterState; found: boolean; target?: Combatant; amountApplied?: number; mitigation?: 'normal' | 'resistant' | 'immune' | 'vulnerable'; ambiguous?: boolean; npcConcentrationBroken?: NpcConcentrationBreak } {
    const lookup = resolveCombatantReference(current, targetName);
    if (!lookup.combatant || lookup.ambiguous) {
        return { state: current, found: false, ambiguous: lookup.ambiguous };
    }

    let target: Combatant | undefined;
    let amountApplied = Math.max(0, amount);
    let mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' = 'normal';
    let npcConcentrationBroken: NpcConcentrationBreak | undefined;
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

            // Audit 2026-08-12 — concentration des PNJ : elle n'existait que
            // pour le héros (le Hold Person d'un ennemi ne se brisait jamais).
            // RAW : dégâts → CON save DD max(10, dégâts/2) ; 0 PV → perdue.
            if (target.concentratingOn && amountApplied > 0 && !target.isPlayer) {
                const conc = target.concentratingOn;
                if (target.hp.current <= 0) {
                    npcConcentrationBroken = { casterName: target.name, effectName: conc.effectName, targetId: conc.targetId, roll: 0, dc: 0, downed: true };
                    target = { ...target, concentratingOn: undefined };
                } else {
                    const dc = Math.max(10, Math.floor(amountApplied / 2));
                    const creatureData: any = lookupMonster(target.name) || getCreature(target.name);
                    let conBonus = 0;
                    if (creatureData && 'saves' in creatureData && creatureData.saves?.CON !== undefined) conBonus = creatureData.saves.CON;
                    else if (creatureData && 'stats' in creatureData && creatureData.stats?.CON !== undefined) conBonus = Math.floor((creatureData.stats.CON - 10) / 2);
                    const roll = Math.floor(Math.random() * 20) + 1 + conBonus;
                    if (roll < dc) {
                        npcConcentrationBroken = { casterName: target.name, effectName: conc.effectName, targetId: conc.targetId, roll, dc, downed: false };
                        target = { ...target, concentratingOn: undefined };
                    }
                }
            }
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

    return { state: next, found: true, target, amountApplied, mitigation, npcConcentrationBroken };
}

/** Retire l'effet lié quand la concentration d'un PNJ tombe : sur le héros
 *  (activeEffects de la fiche) et/ou sur les combattants. Retourne les deux
 *  mises à jour ; l'appelant persiste. */
export function releaseNpcConcentrationEffect(
    state: EncounterState,
    character: CharacterSheet | null,
    broken: NpcConcentrationBreak
): { state: EncounterState; character: CharacterSheet | null; removedFromPlayer: boolean } {
    const nameMatches = (e: any) => String(e?.name || '').toLowerCase() === broken.effectName.toLowerCase();
    let removedFromPlayer = false;
    let nextCharacter = character;
    if (character && (!broken.targetId || state.combatants.find(c => c.id === broken.targetId)?.isPlayer)) {
        const effects = character.activeEffects || [];
        if (effects.some(nameMatches)) {
            nextCharacter = { ...character, activeEffects: effects.filter(e => !nameMatches(e)) };
            removedFromPlayer = true;
        }
    }
    const combatants = state.combatants.map(c => {
        const scoped = broken.targetId ? c.id === broken.targetId : true;
        if (!scoped || !(c.activeEffects || []).some(nameMatches)) return c;
        return { ...c, activeEffects: (c.activeEffects || []).filter(e => !nameMatches(e)) };
    });
    return { state: { ...state, combatants }, character: nextCharacter, removedFromPlayer };
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
    const flatRegex = /(?:\+|\bplus\b)\s*(\d+)\s*([a-zA-ZÀ-ſ]+)(\s*(?:damage|d[ée]g[âa]ts))?/g;
    let flatMatch;
    // cb-m8 — mots de CARACTÉRISTIQUES (EN abrégés + FR) : « +2 Force » sur un
    // objet français est un bonus de FOR, pas un rider de dégâts de type force.
    // 'force' n'est accepté comme type de dégâts que suivi de damage/dégâts.
    const abilityWords = new Set(['ac', 'ca', 'str', 'dex', 'con', 'int', 'wis', 'cha',
        'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
        'force', 'dexterite', 'dextérité', 'sagesse', 'charisme']);
    while ((flatMatch = flatRegex.exec(combined)) !== null) {
        const flatVal = flatMatch[1];
        const rawType = flatMatch[2];
        const hasDamageWord = Boolean(flatMatch[3]);
        const dmgType = normalizeDamageType(rawType);
        if (dmgType) {
            if (abilityWords.has(rawType) && !hasDamageWord) {
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
        /** OU4 — bonus plat additionnel (story modifiers du MJ déjà consommés) :
         *  appliqué MÊME quand attackBonus est calculé par le moteur (omis). */
        flatBonusModifier?: number;
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
    // Melee unless the weapon is actually ranged. Une seule règle partagée
    // (isRangedWeapon) : nom EN/FR, propriété Munitions/Distance ou portée.
    const playerWeapon = character?.weapon;
    const playerIsRanged = isRangedWeapon(playerWeapon);
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
        // OU4 — story modifiers plats du MJ (grant_story_modifier) : avant, ils
        // n'étaient injectés que si l'appelant fournissait attackBonus — omis
        // (le cas recommandé), le bonus consommé se perdait sans effet.
        + (Number.isFinite(Number(args.flatBonusModifier)) ? Number(args.flatBonusModifier) : 0)
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
    let mountedCharge = false;
    // Charge montée : POSSÉDER une monture ne suffit pas — il faut être EN
    // SELLE (mount.mounted !== false ; absent = en selle, compat anciens
    // saves) et la monture présente au combat doit tenir debout. Sans ça,
    // chaque attaque de mêlée sur une cible lointaine devenait une charge
    // complète, à pied, tant qu'un cheval attendait à l'écurie.
    const mountCombatant = character?.mount ? state.combatants.find(c => c.id === 'mount') : undefined;
    const riddenMount = !!character?.mount
        && (character.mount as any).mounted !== false
        && !(mountCombatant && mountCombatant.hp.current <= 0);
    if (isMeleeAttack && bandGateApplies) {
        if (band === 'far') {
            // CHARGE MONTÉE : à dos de monture, le joueur fond sur une cible
            // lointaine et frappe dans la même action (loin → contact).
            if (attacker.isPlayer && riddenMount && character?.mount) {
                mountedCharge = true;
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
            // NF4 — l'engagement n'est PLUS gratuit : fondre sur une cible « à
            // distance » consomme l'ACTION (near → melee), la frappe attend le
            // tour suivant. Loin = 2 actions, à distance = 1 action, contact =
            // frappe. Deux exceptions closent ET frappent en une action :
            // la CHARGE MONTÉE, et la CHARGE ENRAGÉE du Barbare (Rage active).
            const ragingCharge = attacker.isPlayer && !!character
                && character.class === 'Barbarian'
                && (character.activeEffects || []).some(e => e.name === 'Rage');
            if (attacker.isPlayer && riddenMount && character?.mount) {
                mountedCharge = true;
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges on ${character.mount.name} (near → melee)`, 'turn')] };
            } else if (ragingCharge) {
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges in a RAGE (near → melee) and strikes`, 'turn')] };
            } else {
                const moved = setBand(state, bandCarrier.id, 'melee');
                const log = makeLog(
                    `${attacker.name} closes the distance (near → melee)${attacker.isPlayer ? ` toward ${target.name}` : ''}`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'near', to: 'melee' },
                };
            }
        }
    } else if (!isMeleeAttack && bandGateApplies) {
        // NF4 — portée réelle des armes à distance : seules les armes à LONGUE
        // portée (arc long, arbalète lourde…) touchent une cible LOINTAINE ;
        // arc court, arbalète légère, fronde et armes de jet portent jusqu'à
        // « à distance ». Hors de portée, l'attaque devient un RAPPROCHEMENT.
        if (band === 'far') {
            const weaponName = attacker.isPlayer
                ? String(playerWeapon?.name || '')
                : String(args.attackName || monsterAttack?.name || '');
            const rangeText = attacker.isPlayer
                ? String(playerWeapon?.range || '')
                : String((monsterAttack as any)?.range || '');
            const normalRange = Number((rangeText.match(/(\d+)/) || [])[1]) || 0;
            const SHORT_RANGE_NAMES = /shortbow|arc court|light crossbow|arbal[eè]te l[ée]g[eè]re|sling|fronde|dagger|dague|javelin|javeline|handaxe|hachette|dart|fl[ée]chette/i;
            const LONG_RANGE_NAMES = /longbow|arc long|heavy crossbow|arbal[eè]te lourde/i;
            const longReach = LONG_RANGE_NAMES.test(weaponName)
                || (!SHORT_RANGE_NAMES.test(weaponName) && (
                    normalRange >= 100                      // notation en pieds (150/600…)
                    || (normalRange >= 30 && normalRange <= 60)  // notation en mètres (45/180…)
                    || normalRange === 0                    // portée inconnue : ne pas bloquer
                ));
            if (!longReach) {
                const moved = setBand(state, bandCarrier.id, 'near');
                const log = makeLog(
                    `${attacker.name} advances (far → near): ${weaponName || 'the weapon'} is short-ranged`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'far', to: 'near' },
                };
            }
        }
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
    // NF2 — avantage d'ÉQUIPEMENT sur les jets d'attaque (objet « advantage on
    // attack rolls »), fusionné comme les conditions.
    if (attacker.isPlayer && character) {
        const gearAttackAdv = gearAdvantageFor(character, 'attack');
        if (gearAttackAdv) {
            context.prompt.advantage = mergeAdvantage(context.prompt.advantage, 'advantage');
            context.prompt.contextReasons = [...(context.prompt.contextReasons || []), `${gearAttackAdv.source}: advantage on attacks`];
        }
    }
    // PL11 — objets DÉFENSIFS du joueur (cape de déplacement…) : quand le
    // joueur est la CIBLE, les attaquants subissent le désavantage.
    if (target.isPlayer && character) {
        const gearDefense = gearAdvantageFor(character, 'defense');
        if (gearDefense) {
            context.prompt.advantage = mergeAdvantage(context.prompt.advantage, 'disadvantage');
            context.prompt.contextReasons = [...(context.prompt.contextReasons || []), `${gearDefense.source}: attackers have disadvantage`];
        }
    }
    const attackRoll = resolveRollPrompt(context.prompt);
    const effectiveAC = attackRoll.prompt.dc;
    // Champion (Fighter archetype): Improved Critical — crits on 19-20, and
    // Superior Critical at level 15 — crits on 18-20.
    const critThreshold = attacker.isPlayer && character?.subclass === 'Champion'
        ? ((character.level || 1) >= 15 ? 18 : 19)
        : 20;
    // cb-m3 — RAW : un coup EN MÊLÉE qui touche une cible paralysée ou
    // inconsciente est automatiquement critique.
    // TP4 (contre-audit) — cible JOUEUR : fusionner fiche + ligne de combat comme
    // le fait déjà le bloc targetEffects ci-dessus (:1896) — apply_condition
    // n'écrit que sur la fiche, la ligne seule ratait la paralysie du héros.
    const helplessTarget = [
        ...(target.isPlayer ? (character?.activeEffects || []) : []),
        ...(target.activeEffects || []),
    ]
        .map(conditionFromEffect)
        .some(cond => cond && (cond.id === 'paralyzed' || cond.id === 'unconscious'));
    // RE3 (contre-audit) — RAW : seul le 20 naturel touche automatiquement.
    // Le seuil de critique étendu du Champion (19, puis 18 au niv. 15) n'élargit
    // que la plage de CRITIQUE des attaques qui touchent — un 19 naturel sous la
    // CA doit rater (avant : il touchait ET critiquait).
    const hit = attackRoll.die === 20 || (attackRoll.die !== 1 && attackRoll.total >= effectiveAC);
    const criticalHit = hit && (attackRoll.die >= critThreshold || (helplessTarget && isMeleeAttack));

    let damage = 0;
    let rawDamage = 0;
    let mitigation: AttackResolution['mitigation'] = 'normal';
    const resolvedDamageParts: NonNullable<AttackResolution['damageParts']> = [];
    // Riders à usage unique dépensés par ce coup (Châtiment divin).
    const consumedEffectIds: string[] = [];
    // Réaction défensive auto-déclenchée par ce coup (exposée à l'appelant).
    let reactionUsed: 'uncanny_dodge' | 'deflect_missiles' | undefined;
    let reactionAmountStart = 0;
    // Great Weapon Fighting: with a two-handed melee weapon, reroll damage dice
    // that show a 1 or 2 (once). Only for the player's main weapon part.
    const gwfActive = !!(attacker.isPlayer && character
        && (character as any).fightingStyle === 'Great Weapon Fighting'
        && (character.weapon?.properties || []).includes('two-handed'));
    // cb-m6 — « première attaque du tour » PARTAGÉE par tous les riders
    // 1×/tour : attacksUsed === 0 ET drapeau onceRiderUsed non consommé
    // (l'attaque bonus de Frénésie ne dépense pas attacksUsed).
    const onceRiderFree = (() => {
        const e: any = current.actionEconomy?.[combatantKey(attacker)];
        return !e || (!((e.attacksUsed ?? 0) > 0) && !e.onceRiderUsed);
    })();
    // Attaquant sauvage : 1×/tour (première attaque), on lance les dés d'arme
    // deux fois et on garde le meilleur total. Mêlée uniquement.
    const savageActive = !!(attacker.isPlayer && character && isMeleeAttack
        && hasFeatSpecial(character, 'savage_attacker')
        && onceRiderFree);
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
                if (onceRiderFree) {
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
                    // Rider à usage unique (Châtiment divin) : signalé à
                    // l'appelant pour qu'il le retire après CE coup.
                    if (fx.onWeaponHit.consumeOnHit) consumedEffectIds.push(fx.id);
                }
            }
            // Rogue: Sneak Attack — once per turn when the strike lands with
            // advantage using a finesse or ranged weapon (solo-table reading of
            // the SRD trigger; no ally positioning to track). Scales by level.
            const weaponIsFinesse = (character.weapon?.properties || []).some(p => String(p).toLowerCase() === 'finesse');
            if (character.class === 'Rogue'
                && context.prompt.advantage === 'advantage'
                && (weaponIsFinesse || playerIsRanged)) {
                if (onceRiderFree) {
                    damageParts.push({ damage: getSneakAttackDice(character.level || 1), damageType: resolvedDamageType as CodexDamageType });
                }
            }
            // ── Riders de classe/sous-classe (SRD) auto-appliqués ──
            const playerLevel = character.level || 1;
            const isFirstAttackOfTurn = onceRiderFree;
            // Paladin 11+ — Châtiment divin amélioré : +1d8 radiant sur CHAQUE
            // coup de mêlée (en plus du Châtiment activable).
            if (character.class === 'Paladin' && playerLevel >= 11 && isMeleeAttack) {
                damageParts.push({ damage: '1d8', damageType: 'radiant' });
            }
            // Clerc 8+ (Guerre/Vie) — Frappe divine : +1d8 (1×/tour), 2d8 au 14.
            if (character.class === 'Cleric' && playerLevel >= 8 && isFirstAttackOfTurn
                && (character.subclass === 'War Domain' || character.subclass === 'Life Domain')) {
                damageParts.push({
                    damage: playerLevel >= 14 ? '2d8' : '1d8',
                    damageType: character.subclass === 'Life Domain' ? 'radiant' : resolvedDamageType as CodexDamageType,
                });
            }
            // Barbare Zélote 3+ — Furie divine : +1d6+⌊niv/2⌋ radiant sur la
            // première attaque de chaque tour pendant la rage.
            if (character.subclass === 'Zealot' && isFirstAttackOfTurn
                && (character.activeEffects || []).some(e => e.name === 'Rage')) {
                damageParts.push({ damage: `1d6+${Math.floor(playerLevel / 2)}`, damageType: 'radiant' });
            }
            // Paladin Cavalier — Charge fervente : +1d8 quand la frappe conclut
            // une charge montée (loin → contact dans la même action).
            if (character.subclass === 'Cavalier' && mountedCharge) {
                damageParts.push({ damage: '1d8', damageType: resolvedDamageType as CodexDamageType });
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

        // ── RÉACTIONS DÉFENSIVES du joueur frappé (SRD, auto-appliquées) ──
        // Moine 3+ — Déviation de projectiles : un tir d'arme qui touche est
        // réduit de 1d10 + DEX + niveau (à 0 → projectile attrapé).
        // Roublard 5+ — Esquive instinctive : les dégâts d'un coup visible sont
        // divisés par deux. Les deux consomment LA réaction (une par round).
        let deflectPool = 0;
        if (combatantSide(attacker) === 'enemy' && target.isPlayer && character) {
            const econ = state.actionEconomy?.[combatantKey(target)];
            const reactionFree = !(econ?.reactionUsed);
            const lvl = character.level || 1;
            if (reactionFree && character.class === 'Monk' && lvl >= 3 && !isMeleeAttack) {
                deflectPool = rollDice(`1d10+${abilityMod(getEffectiveStat(character, 'DEX')) + lvl}`).total;
                reactionUsed = 'deflect_missiles';
            } else if (reactionFree && character.class === 'Rogue' && lvl >= 5) {
                reactionUsed = 'uncanny_dodge';
            }
            if (reactionUsed) {
                const consumed = consumeCombatAction(state, combatantKey(target), 'reaction');
                if (consumed.success) state = consumed.state;
                else reactionUsed = undefined; // réaction indisponible finalement
            }
        }
        reactionAmountStart = deflectPool;

        // Barbare 9+ — Critique brutal : dés d'arme SUPPLÉMENTAIRES sur un
        // critique (non doublés), greffés sur la part d'arme uniquement.
        // RE7 — RAW : attaques de MÊLÉE uniquement (une javeline lancée n'en profite pas).
        const brutalDice = attacker.isPlayer && character && criticalHit && isMeleeAttack ? brutalCriticalDice(character) : 0;

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
            // cb-m12 — critique RAW : on RELANCE les dés (variance réelle) au
            // lieu de doubler la valeur des premiers dés.
            let partRawDamage = criticalHit
                ? rollSum + rollDice(part.damage).rolls.reduce((s, r) => s + r, 0) + damageRoll.modifier
                : rollSum + damageRoll.modifier;
            // Critique brutal : dés d'arme supplémentaires (lancés UNE fois,
            // pas doublés) sur la part d'arme.
            if (brutalDice > 0 && partIndex === 0) {
                const sides = Number(part.damage.match(/\d+d(\d+)/i)?.[1]) || 6;
                partRawDamage += rollDice(`${brutalDice}d${sides}`).total;
            }
            // Déviation de projectiles : la réduction ronge les parts dans l'ordre.
            if (reactionUsed === 'deflect_missiles' && deflectPool > 0) {
                const absorbed = Math.min(deflectPool, partRawDamage);
                partRawDamage -= absorbed;
                deflectPool -= absorbed;
            }
            // Esquive instinctive : chaque part est divisée par deux.
            if (reactionUsed === 'uncanny_dodge') {
                partRawDamage = Math.floor(partRawDamage / 2);
            }
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

    // cb-m6 — consomme le drapeau partagé des riders « 1×/tour » dès qu'un coup
    // du joueur a porté en début de tour (attaque bonus de Frénésie incluse) :
    // la première attaque principale ne re-déclenche plus Sneak/Frappe divine…
    if (hit && attacker.isPlayer && onceRiderFree) {
        const riderKey = combatantKey(attacker);
        state = {
            ...state,
            actionEconomy: {
                ...state.actionEconomy,
                [riderKey]: { ...(state.actionEconomy?.[riderKey] || {}), onceRiderUsed: true } as any,
            },
        };
    }

    let updatedTarget = state.combatants.find(c => c.id === target.id) || target;
    // ── Barbare 11+ — Rage implacable : s'il tombe à 0 PV en rage, une
    //    sauvegarde de CON DD 10 réussie le laisse à 1 PV (1×/combat).
    let relentless = false;
    if (updatedTarget.isPlayer && updatedTarget.hp.current <= 0 && character
        && character.class === 'Barbarian' && (character.level || 1) >= 11
        && (character.activeEffects || []).some(e => e.name === 'Rage')
        && !(updatedTarget as any).relentlessUsed) {
        const conMod = abilityMod(getEffectiveStat(character, 'CON'));
        const save = rollDice(`1d20+${conMod}`);
        if (save.total >= 10) {
            relentless = true;
            state = {
                ...state,
                combatants: state.combatants.map(c => c.id === updatedTarget.id
                    ? { ...c, hp: { ...c.hp, current: 1 }, relentlessUsed: true } as Combatant
                    : c),
                logs: [...(state.logs || []), makeLog(`${updatedTarget.name} refuses to fall (Relentless Rage, CON save ${save.total} vs DC 10)`, 'system')],
            };
            updatedTarget = state.combatants.find(c => c.id === target.id) || updatedTarget;
        }
    }
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
            consumedEffectIds: consumedEffectIds.length ? consumedEffectIds : undefined,
            reaction: reactionUsed,
            reactionAmount: reactionAmountStart || undefined,
            relentless: relentless || undefined,
            isMeleeAttack,
        },
    };
}

/** Formate les dégâts d'une attaque PART PAR PART pour le journal des jets :
 *  « 8 slashing + 4 fire (resistant ½) = 11 » au lieu du total agrégé qui
 *  masquait l'enchantement élémentaire (demande joueur, 2026-08-13). */
export function formatDamageParts(resolution: {
    damage: number;
    damageType?: string;
    damageFormula?: string;
    damageParts?: { damage: number; damageType: string; damageFormula?: string; mitigation?: string }[];
}): string {
    const parts = resolution.damageParts;
    if (!parts || parts.length <= 1) {
        return `${resolution.damageFormula || ''} = ${resolution.damage} (${resolution.damageType || 'damage'})`;
    }
    const seg = parts
        .map(p => `${p.damage} ${p.damageType}${p.mitigation && p.mitigation !== 'normal' ? ` (${p.mitigation})` : ''}`)
        .join(' + ');
    return `${seg} = ${resolution.damage}`;
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

/** DD du test de moral (règle maison, documentée au codex) — WIS save quand un
 *  ennemi passe sous 50 % de ses PV. Une seule source de vérité : réutilisé par
 *  l'UI et les lignes de transcript. */
export const MORALE_DC = 11;

/** Caractéristique d'incantation par classe — UNE source de vérité, partagée
 *  entre le moteur (castSpell) et l'UI (SpellbookPanel affichait un DD basé INT
 *  par défaut alors que le moteur lançait en SAG pour un Clerc sans champ
 *  spellcastingAbility — audit 2026-08-12). */
export const CLASS_CASTER_ABILITY: Record<string, Ability> = {
    Mage: 'INT', Wizard: 'INT', Cleric: 'WIS', Druid: 'WIS', Ranger: 'WIS', Monk: 'WIS',
    Bard: 'CHA', Sorcerer: 'CHA', Warlock: 'CHA', Paladin: 'CHA',
};

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

    // Wisdom save vs MORALE_DC
    const monsterData = lookupMonster(combatant.name) || getCreature(combatant.name);
    const wis = (monsterData as any)?.stats?.WIS || 10;
    const wisMod = Math.floor((wis - 10) / 2);

    const dieRoll = Math.floor(Math.random() * 20) + 1;
    const total = dieRoll + wisMod;
    const success = total >= MORALE_DC;

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
    damageType?: string,
    opts?: { isCritical?: boolean }
): { character: CharacterSheet; amountApplied: number; mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' } {
    const type = normalizeDamageType(damageType);
    let amountApplied = Math.max(0, Math.trunc(amount));
    let mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' = 'normal';
    // Audit 2026-08-12 — le héros ne pouvait jamais être immunisé ni vulnérable
    // (le type de retour n'admettait que normal|resistant).
    if (type && (character.immunities || []).some(r => normalizeDamageType(r) === type)) {
        amountApplied = 0;
        mitigation = 'immune';
    } else if (type && (character.vulnerabilities || []).some(r => normalizeDamageType(r) === type)) {
        amountApplied = amountApplied * 2;
        mitigation = 'vulnerable';
    } else if (type && playerResistances(character).some(r => normalizeDamageType(r) === type)) {
        amountApplied = Math.floor(amountApplied / 2);
        mitigation = 'resistant';
    }
    let tempHP = character.tempHP || 0;
    let hpLoss = amountApplied;
    if (tempHP > 0) {
        if (hpLoss >= tempHP) { hpLoss -= tempHP; tempHP = 0; }
        else { tempHP -= hpLoss; hpLoss = 0; }
    }

    // RAW SRD (audit 2026-08-12 — aucun de ces deux mécanismes n'existait) :
    // 1. Dégâts subis À TERRE (0 PV) = 1 échec de jet de mort automatique,
    //    2 sur un coup critique.
    // 2. Mort massive : si les dégâts restants après tomber à 0 atteignent le
    //    max de PV, mort instantanée.
    const before = Math.max(0, character.hp.current);
    const wasDown = before <= 0;
    let deathSaves = character.deathSaves;
    if (wasDown && hpLoss > 0) {
        const prev = deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
        const failures = Math.min(3, prev.failures + (opts?.isCritical ? 2 : 1));
        deathSaves = { ...prev, isStable: false, failures, isDead: failures >= 3 };
    }
    const effectiveMax = getEffectiveMaxHP(character);
    const nextHP = clampHP(before - hpLoss, effectiveMax);
    if (!wasDown && nextHP <= 0 && (hpLoss - before) >= effectiveMax) {
        deathSaves = { successes: 0, failures: 3, isStable: false, isDead: true };
    }

    return {
        amountApplied,
        mitigation,
        character: {
            ...character,
            tempHP,
            deathSaves,
            hp: { ...character.hp, current: nextHP },
        },
    };
}

/** RAW — stabiliser un mourant sans le soigner : test de Médecine DD 10 réussi
 *  (ou effet équivalent). 0 PV, stable, compteurs remis à zéro. */
export function stabilizeCharacter(character: CharacterSheet): CharacterSheet {
    if (character.hp.current > 0) return character;
    return {
        ...character,
        deathSaves: { successes: 0, failures: 0, isStable: true, isDead: false },
    };
}

/** RAW — dégâts subis alors qu'on est DÉJÀ à 0 PV : 1 échec de jet de mort
 *  automatique (2 sur coup critique). Utilisé par les handlers de combat dont
 *  le chemin des dégâts passe par les combattants, pas par
 *  applyDamageToCharacter. */
export function applyDownedDamagePenalty(character: CharacterSheet, isCritical = false): CharacterSheet {
    const prev = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const failures = Math.min(3, prev.failures + (isCritical ? 2 : 1));
    return { ...character, deathSaves: { ...prev, isStable: false, failures, isDead: failures >= 3 } };
}

export function applyCharacterHP(character: CharacterSheet, nextHP: number): CharacterSheet {
    const updated: CharacterSheet = {
        ...character,
        hp: {
            ...character.hp,
            current: clampHP(nextHP, getEffectiveMaxHP(character)),
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

    // RE6 (contre-audit) — sans `roundsRemaining`, tickRoundEffects ignorait
    // l'effet : un « -2 CA, 3 rounds » posé sur le JOUEUR collait jusqu'au repos
    // long, alors que le chemin PNJ jumeau (useToolProcessor add_effect) expire
    // correctement. Aligné : rounds numérotés (défaut 10), `permanent` respecté.
    const duration = String(args?.duration || 'rounds') as any;
    const effect: any = {
        id: makeId('effect'),
        name: String(args?.name || 'Effect'),
        source: String(args?.source || 'condition') as any,
        duration,
        modifiers: [{ stat, bonus }],
    };
    if (duration === 'rounds') {
        effect.roundsRemaining = Math.max(1, Math.trunc(Number(args?.rounds)) || 10);
    }

    return {
        ...character,
        activeEffects: [
            ...(character.activeEffects || []),
            effect,
        ],
    };
}

export function spendSpellSlot(character: CharacterSheet, spellLevel: number, requestedSlot?: number): { character: CharacterSheet; consumedSlot?: number; error?: string } {
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
        // RAW SRD : +1d4 aux jets d'attaque ET de sauvegarde, 1 minute,
        // concentration. (L'ancienne implémentation était un story modifier
        // +2 plat à 3 « usages » de portée 'any' — mauvais dé, mauvaise durée,
        // et il boostait aussi les tests et jets de morts — audit 2026-08-12.)
        return {
            id: makeId('spell'),
            name: 'Bless',
            source: 'spell',
            duration: 'concentration',
            concentration: true,
            roundsRemaining: 10,
            description: 'SRD: +1d4 to attack rolls and saving throws for 1 minute (concentration).',
            modifiers: [
                { stat: 'attackBonus', bonus: 0, dice: '1d4' },
                { stat: 'saveBonus', bonus: 0, dice: '1d4' },
            ],
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

export function castSpell(character: CharacterSheet, args: {
    spellName: string;
    slotLevel?: number;
    target?: string;
    /** Id EXACT du combattant visé. Indispensable quand plusieurs ennemis
     *  partagent un nom (« Gobelin », « Gobelin ») : la résolution par nom seul
     *  était ambiguë et le sort n'infligeait alors aucun dégât. */
    targetId?: string;
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
    // TR10 (audit de séance du 2026-08-23) — deux échecs de cast_spell observés,
    // et aucun n'était une hallucination du MJ :
    //   cast_spell("Imposition des mains") → aptitude de PALADIN, pas un sort ;
    //   cast_spell("Blessure / Bless")     → les deux langues collées.
    // « Spell not found in SRD Codex » ne lui disait ni l'un ni l'autre.
    const spell = lookupSpell(args.spellName)
        // Forme bilingue « FR / EN » : on tente chaque moitié.
        || String(args.spellName).split('/').map(part => lookupSpell(part.trim())).find(Boolean);
    if (!spell) {
        const ability = matchPlayerClassAbility(args.spellName);
        if (ability) {
            return {
                success: false,
                error: `"${ability}" is a CLASS ABILITY, not a spell — the player triggers it from their own button and the engine applies it. Do not cast it: narrate it when you receive the "[SYSTEM] Player used ..." report.`,
                character,
                summary: `${ability} is a class ability, not a spell.`,
            };
        }
        return { success: false, error: 'Spell not found in SRD Codex', character, summary: 'Spell not found.' };
    }

    // Comparaison ROBUSTE : la liste du personnage peut contenir le nom EN, un
    // id (« magic_missile ») ou un nom FR — on résout chaque entrée via le
    // codex et on compare les identités, au lieu d'une égalité de chaîne brute
    // qui rejetait le sort (« not in caster setup ») pour un simple alias.
    const configuredSpells = [
        ...(character.cantrips || []),
        ...(character.knownSpells || []),
        ...(character.preparedSpells || []),
    ]
        .map(name => String(name || '').trim())
        .filter(Boolean);
    const knowsSpell = configuredSpells.some(name =>
        name.toLowerCase() === spell.name.toLowerCase()
        || lookupSpell(name)?.id === spell.id
    );
    if (configuredSpells.length && !knowsSpell) {
        return {
            success: false,
            error: `${spell.name} is not in this character's caster setup`,
            spell,
            character,
            summary: `${character.name || 'The character'} has not prepared or learned ${spell.name}.`,
        };
    }
    // Audit 2026-08-21 — fiche SANS listes de sorts (anciens saves) : la porte
    // était grande ouverte (n'importe quel sort SRD passait). On exige au moins
    // que le sort soit sur la LISTE DE CLASSE du lanceur — un Guerrier ne lance
    // pas Boule de feu parce que sa fiche est vide.
    if (!configuredSpells.length && Array.isArray((spell as any).classes) && (spell as any).classes.length && character.class) {
        // Vocabulaire du jeu → listes SRD : 'Mage' lance la liste 'Wizard' ;
        // les sous-classes tiers-caster empruntent la liste du Magicien.
        const listNames = new Set<string>([character.class]);
        if (character.class === 'Mage') listNames.add('Wizard');
        if (/eldritch knight|chevalier occulte|arcane trickster|filou arcanique|escroc arcanique/i.test(String(character.subclass || ''))) {
            listNames.add('Wizard');
        }
        if (!(spell as any).classes.some((c: string) => listNames.has(c))) {
            return {
                success: false,
                error: `${spell.name} is not on the ${character.class} spell list`,
                spell,
                character,
                summary: `${character.name || 'The character'} (${character.class}) cannot cast ${spell.name}.`,
            };
        }
    }

    const spent = spendSpellSlot(character, spell.level, args.slotLevel);
    if (spent.error) {
        return { success: false, error: spent.error, spell, character, summary: spent.error };
    }

    let nextCharacter = spent.character;
    const slotLevel = spent.consumedSlot || args.slotLevel || spell.level;
    // da-m7 — la caractéristique de sort vient de la CLASSE du lanceur avant le
    // champ codé en dur du sort (Fire Bolt disait 'CHA' même pour un Mage INT).
    const casterAbility = normalizeAbility(args.casterAbility || nextCharacter.spellcastingAbility
        || CLASS_CASTER_ABILITY[nextCharacter.class] || spell.attack?.ability || 'CHA');
    const casterAbilityMod = Number.isFinite(Number(args.casterAbilityMod))
        ? Number(args.casterAbilityMod)
        : abilityMod(getEffectiveStat(nextCharacter, casterAbility));
    const spellAttackBonus = Number.isFinite(Number(args.spellAttackBonus))
        ? Number(args.spellAttackBonus)
        : casterAbilityMod + proficiencyBonus(nextCharacter.level);
    const spellSaveDC = Number.isFinite(Number(args.spellSaveDC))
        ? Number(args.spellSaveDC)
        : 8 + casterAbilityMod + proficiencyBonus(nextCharacter.level);

    // ── MÉTAMAGIE (Ensorceleur) : les marqueurs posés par les boutons sont
    //    consommés par CE lancement. Accéléré → le sort coûte l'action bonus ;
    //    Intensifié → la cible fait sa sauvegarde avec DÉSAVANTAGE.
    const quickenedMarker = (nextCharacter.activeEffects || []).find(e => e.name === 'Quickened Spell');
    const heightenedMarker = (nextCharacter.activeEffects || []).find(e => e.name === 'Heightened Spell');
    const quickened = !!quickenedMarker;
    if (quickenedMarker || (heightenedMarker && spell.save)) {
        nextCharacter = {
            ...nextCharacter,
            activeEffects: (nextCharacter.activeEffects || []).filter(e =>
                e.id !== quickenedMarker?.id && !(heightenedMarker && spell.save && e.id === heightenedMarker.id)),
        };
    }

    // ── Riders passifs de sous-classe sur les DÉGÂTS de sorts ──
    // Agonizing Blast (Occultiste 2+) : +mod. CHA par rayon d'Eldritch Blast.
    // Empowered Evocation (École d'évocation 10+) : +mod. INT aux sorts d'évocation.
    const bonusSpellDamage = (formula: string | undefined): string | undefined => {
        if (!formula) return formula;
        let out = formula;
        if (spell.id === 'eldritch_blast' && character.class === 'Warlock' && (nextCharacter.level || 1) >= 2) {
            const cha = abilityMod(getEffectiveStat(nextCharacter, 'CHA'));
            const beams = Number(formula.match(/^(\d+)d/)?.[1]) || 1;
            if (cha !== 0) out = `${out}${cha * beams >= 0 ? '+' : ''}${cha * beams}`;
        }
        // RE8 — RAW : Empowered Evocation s'applique à TOUT sort d'évocation de
        // magicien, tours de magie inclus (le combo Fire Bolt + INT était perdu).
        if (character.subclass === 'School of Evocation' && (nextCharacter.level || 1) >= 10 && spell.school === 'Evocation') {
            const int = abilityMod(getEffectiveStat(nextCharacter, 'INT'));
            if (int > 0) out = `${out}+${int}`;
        }
        return out;
    };

    const concentrationReplaced: string[] = [];
    const rawEffect = spellEffectFor(spell.name);
    const activeEffect = rawEffect ? stampEffectExpiry(rawEffect, args.worldHour) : null;
    if (activeEffect) {
        // Bénédiction RAW vit désormais entièrement dans l'ActiveEffect
        // (modificateurs dice '1d4' attaque+sauvegarde) — plus de story
        // modifier parallèle à « usages » (audit 2026-08-12).
        const applied = applyConcentrationReplacement(nextCharacter, activeEffect);
        nextCharacter = applied.character;
        concentrationReplaced.push(...applied.removed);
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
        // Supreme Healing (Domaine de la Vie 17+) : les dés de soin rendent leur MAXIMUM.
        const supremeHealing = nextCharacter.subclass === 'Life Domain' && (nextCharacter.level || 1) >= 17;
        const healingTotal = supremeHealing && !Number.isFinite(Number(args.fixedHealing))
            ? maxRollOfFormula(healingDice || spell.healing.dice)
            : healingRoll.total;
        const healing = Math.max(0, healingTotal + (spell.healing.abilityModifier ? casterAbilityMod : 0) + discipleOfLifeBonus);
        // CB1 — cible-aware : le soin ne remonte les PV du LANCEUR que si la
        // cible est le lanceur (ou absente). Sinon `healing` est retourné à
        // l'appelant, qui l'applique à la cible réelle (ligne de combat,
        // compagnon). Avant, « Cure Wounds sur le compagnon » soignait le
        // joueur et laissait le compagnon à terre — et le panneau soignait
        // les DEUX (fiche + ligne d'allié).
        const rawTargetId = String(args.targetId ?? '').trim().toLowerCase();
        const rawTargetName = String(args.target ?? '').trim().toLowerCase();
        const selfNames = new Set(['self', 'me', 'you', 'player', 'moi', 'soi', 'joueur', 'hero', 'heros', 'héros',
            String(nextCharacter.name || '').trim().toLowerCase()]);
        const targetsSelf = rawTargetId
            ? rawTargetId === 'player'
            : (!rawTargetName || selfNames.has(rawTargetName));
        if (targetsSelf) {
            nextCharacter = {
                ...nextCharacter,
                hp: { ...nextCharacter.hp, current: clampHP(nextCharacter.hp.current + healing, getEffectiveMaxHP(nextCharacter)) },
            };
        }
        return {
            success: true,
            spell,
            character: nextCharacter,
            consumedSlot: spent.consumedSlot,
            healing,
            healingTargetsSelf: targetsSelf,
            quickened,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: targetsSelf
                ? `${spell.name} heals ${healing} HP.`
                : `${spell.name} heals ${args.target || 'the target'} for ${healing} HP.`,
        };
    }

    if (spell.attack) {
        const { damageDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const damageFormula = bonusSpellDamage(damageDice || spell.damage?.dice);
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
                targetId: args.targetId,
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
            quickened,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} requires a spell attack roll.`,
        };
    }

    if (spell.save) {
        const { damageDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const damageFormula = bonusSpellDamage(damageDice || spell.damage?.dice);
        
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

        // Potent Cantrip (École d'évocation 6+) : un tour de magie à sauvegarde
        // inflige la MOITIÉ des dégâts même sur une sauvegarde réussie.
        const potentCantrip = character.subclass === 'School of Evocation'
            && (nextCharacter.level || 1) >= 6 && spell.level === 0 && !!damageFormula;
        const prompt: RollPromptState = {
            type: 'SAVE',
            name: `${args.target || 'Target'} ${spell.save.ability} save vs ${spell.name}`,
            dc: spellSaveDC,
            formula: `1d20${targetSaveBonus >= 0 ? '+' : ''}${targetSaveBonus}`,
            // Sort intensifié (métamagie) : la cible sauvegarde avec désavantage.
            advantage: heightenedMarker ? 'disadvantage' : 'normal',
            dmBonus: 0,
            requestedAt: Date.now(),
            pendingSpell: {
                spellName: spell.name,
                target: args.target,
                targetId: args.targetId,
                damageFormula,
                damageType: spell.damage?.type,
                conditionOnFailure: spell.condition,
                effectOnSuccess: potentCantrip ? 'half' : spell.save.effectOnSuccess,
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
            quickened,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} requires a ${spell.save.ability} save vs DC ${spellSaveDC}${heightenedMarker ? ' (Heightened: save at disadvantage)' : ''}.`,
        };
    }

    // Sort de DÉGÂTS sans jet d'attaque ni sauvegarde (Projectile magique) : il
    // touche automatiquement. Sans cette branche il retombait dans le « sort
    // utilitaire » ci-dessous et n'infligeait RIEN.
    if (spell.damage?.dice && !spell.attack && !spell.save && !spell.healing) {
        const { damageDice } = getScaledSpellDice(spell, slotLevel, args.characterLevel || nextCharacter.level);
        const damageFormula = bonusSpellDamage(damageDice || spell.damage.dice)!;
        return {
            success: true,
            spell,
            character: nextCharacter,
            consumedSlot: spent.consumedSlot,
            damageFormula,
            damageType: spell.damage.type,
            autoDamage: {
                damageFormula,
                damageType: spell.damage.type,
                target: args.target,
                targetId: args.targetId,
            },
            quickened,
            activeEffect: activeEffect || undefined,
            concentrationReplaced,
            summary: `${spell.name} automatically hits for ${damageFormula} ${spell.damage.type || 'damage'}.`,
        };
    }

    return {
        success: true,
        spell,
        character: nextCharacter,
        consumedSlot: spent.consumedSlot,
        quickened,
        activeEffect: activeEffect || undefined,
        concentrationReplaced,
        summary: `${spell.name} applied.`,
    };
}

/**
 * Applique les dégâts d'un sort à TOUCHE AUTOMATIQUE sur l'état de combat.
 * Renvoie null si la cible est introuvable (le sort reste « narratif »).
 */
export function applyAutoDamageSpell(
    current: EncounterState,
    auto: NonNullable<SpellCastResult['autoDamage']>,
): { state: EncounterState; target: Combatant; damage: number; rolled: number; mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable'; summary: string } | null {
    const lookup = resolveCombatantReference(current, auto.targetId || auto.target || '', { autoResolve: true });
    if (!lookup.combatant) return null;
    const rolled = rollDamageAmount(auto.damageFormula).raw;
    const applied = applyDamageToEncounter(current, combatantKey(lookup.combatant), rolled, auto.damageType);
    if (!applied.found || !applied.target) return null;
    const damage = applied.amountApplied || 0;
    return {
        state: applied.state,
        target: applied.target,
        damage,
        rolled,
        mitigation: applied.mitigation || 'normal',
        summary: `${applied.target.name} takes ${damage}${auto.damageType ? ` ${auto.damageType}` : ''} damage (auto-hit).`,
    };
}

function conditionToEffect(condition: ConditionEntry): ActiveEffect {
    const modifiers: ActiveEffect['modifiers'] = [];
    if (condition.movement === 'zero') modifiers.push({ stat: 'speed', bonus: 0, setTo: 0 });

    return {
        id: makeId('condition'),
        name: condition.name,
        source: 'condition',
        // CB6 — plus jamais « permanent » : une condition posée en jeu expire
        // d'elle-même (10 rounds ≈ 1 minute, la durée type des sorts de
        // contrôle 5e), peut être retirée par l'outil remove_condition, et
        // saute au repos long. Avant : poison de piège = désavantage à vie.
        duration: 'rounds',
        roundsRemaining: 10,
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
    // cb-m12 — critique RAW : dés RELANCÉS, pas doublés en valeur.
    const raw = critical
        ? rolled.total + rollDice(formula).rolls.reduce((sum, roll) => sum + roll, 0)
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
    // autoResolve : quand plusieurs ennemis portent le MÊME nom (« Gobelin »,
    // « Gobelin »), la recherche par nom était « ambiguë » et le sort
    // n'infligeait AUCUN dégât, silencieusement. On tranche désormais comme
    // pour les attaques d'arme (première cible vivante, la plus entamée).
    const targetLookup = resolveCombatantReference(current, targetRef, { autoResolve: true });
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
            // cb-m7 — on ne purge que les modificateurs liés AU SORT rompu
            // (même nom que l'effet de concentration retiré). L'ancien
            // `source !== 'blessing'` rasait aussi les bénédictions du MJ
            // sans rapport (« Chanceux »…).
            const modName = mod.name.toLowerCase();
            return !removedNames.has(modName);
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
            // cb-m7 — on ne purge que les modificateurs liés AU SORT rompu
            // (même nom que l'effet de concentration retiré). L'ancien
            // `source !== 'blessing'` rasait aussi les bénédictions du MJ
            // sans rapport (« Chanceux »…).
            const modName = mod.name.toLowerCase();
            return !removedNames.has(modName);
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
        // da-m2 — Action Surge ×2 au niveau 17 (SRD).
        if (level >= 2) {
            const surges = level >= 17 ? 2 : 1;
            resources.actionSurge = { current: surges, max: surges, recoverOn: 'short_rest', label: 'Action Surge' };
        }
        // Indomitable (SRD) : relance une sauvegarde ratée — 1/repos long,
        // 2 au niveau 13, 3 au 17. Branché sur la fenêtre de relance BG3.
        if (level >= 9) {
            const uses = level >= 17 ? 3 : level >= 13 ? 2 : 1;
            resources.indomitable = { current: uses, max: uses, recoverOn: 'long_rest', label: 'Indomitable' };
        }
        if (character.subclass === 'Battle Master' && level >= 3) {
            const dice = level >= 15 ? 6 : level >= 7 ? 5 : 4;
            // da-m2 — d12 au niveau 18 (promis par subclasses.ts, jamais servi).
            const die = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8';
            resources.superiorityDice = { current: dice, max: dice, recoverOn: 'short_rest', label: `Superiority Dice (${die})` };
        }
    }
    if (cls === 'Paladin') {
        resources.layOnHands = { current: level * 5, max: level * 5, recoverOn: 'long_rest', label: 'Lay on Hands' };
        // Divine Sense (SRD) : 1 + mod. CHA par repos long.
        resources.divineSense = { current: 1 + chaMod, max: 1 + chaMod, recoverOn: 'long_rest', label: 'Divine Sense' };
        // Canalisation divine du serment (Arme sacrée, Vœu d'inimitié, Courroux
        // de la nature, Défi du cavalier…) — 1/repos court à partir du niveau 3.
        if (level >= 3) {
            resources.channelDivinity = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Channel Divinity' };
        }
    }
    if (cls === 'Cleric' && level >= 10) {
        // Intervention divine (SRD) : d100 ≤ niveau → miracle. 1 tentative/repos long.
        resources.divineIntervention = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Divine Intervention' };
    }
    if (cls === 'Monk' && character.subclass === 'Way of the Open Hand' && level >= 6) {
        resources.wholenessOfBody = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Wholeness of Body' };
    }
    if (cls === 'Barbarian') {
        // da-m2 — Rage ILLIMITÉE au niveau 20 (SRD) : 99 ≈ sans limite,
        // affichable sans casser le format current/max des ressources.
        const rageMax = level >= 20 ? 99 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
        resources.rage = { current: rageMax, max: rageMax, recoverOn: 'long_rest', label: level >= 20 ? 'Rage (∞)' : 'Rage' };
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
        // da-m2 — Channel Divinity ×3 au niveau 18 (SRD).
        const cdUses = level >= 18 ? 3 : level >= 6 ? 2 : 1;
        resources.channelDivinity = { current: cdUses, max: cdUses, recoverOn: 'short_rest', label: 'Channel Divinity' };
    }
    if (cls === 'Cleric' && character.subclass === 'War Domain') {
        // War Priest: bonus-action weapon attack, WIS-mod uses per long rest.
        const wisMod = Math.max(1, abilityMod(getEffectiveStat(character, 'WIS')));
        resources.warPriest = { current: wisMod, max: wisMod, recoverOn: 'long_rest', label: 'War Priest' };
    }
    if (cls === 'Druid' && level >= 2) {
        resources.wildShape = { current: 2, max: 2, recoverOn: 'short_rest', label: 'Wild Shape' };
        // Récupération naturelle (Cercle de la Terre) : rend des emplacements
        // dont la somme des niveaux vaut la moitié du niveau de druide.
        resources.naturalRecovery = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Natural Recovery' };
    }
    if (cls === 'Warlock') {
        // L'Occultiste n'avait AUCUNE capacité activable. Focalisation du pacte :
        // le patron guide sa main — avantage sur la prochaine attaque de sort.
        resources.pactFocus = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Pact Focus' };
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
        // da-m1 — 4e emplacement de pacte au niveau 17 (SRD).
        const max = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
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
        const effMax = getEffectiveMaxHP(ensured);
        // Don Robuste/Durable (2026-08-13) : chaque dé de vie dépensé rend au
        // minimum 2 × mod de CON PV (le `special` était du texte mort).
        const perDieFloor = hasFeatSpecial(ensured, 'durable_hit_die_minimum') ? Math.max(1, conMod * 2) : 1;
        for (let i = 0; i < diceToSpend; i++) {
            hp = clampHP(hp + Math.max(perDieFloor, Math.floor(Math.random() * hitDice.die) + 1 + conMod), effMax);
        }
        hitDice = { ...hitDice, remaining: hitDice.remaining - diceToSpend };
        // Barde 2+ — Chant reposant : +1dX de soins quand on dépense des dés de
        // vie pendant un repos court (d6 → d12 avec le niveau).
        if (ensured.class === 'Bard' && (ensured.level || 1) >= 2) {
            const die = songOfRestDie(ensured.level || 1);
            hp = clampHP(hp + Math.floor(Math.random() * die) + 1, effMax);
        }
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
        hp: { ...ensured.hp, current: getEffectiveMaxHP(ensured) },
        tempHP: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
        // CB6 — le repos long guérit les CONDITIONS (poison, paralysie,
        // entrave…) quelle que soit leur durée ; seuls les effets permanents
        // NON-conditions (traits, objets) survivent à la nuit.
        activeEffects: (ensured.activeEffects || []).filter(effect => effect.duration === 'permanent' && effect.source !== 'condition'),
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
