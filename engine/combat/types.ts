/** Les types du combat : etat de la rencontre, combattants sortis, economie de tour, resultats de jets, d'attaques et de sorts. */
import { Combatant } from '../combatants';
import { ActiveEffect, Ability, CharacterSheet, CodexDamageType, SpellEntry, StoryRollModifier, getPlayerAttackCount } from '../../types';
import { applyAutoDamageSpell } from './spells';

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
export type DepartedReason = 'fled' | 'surrendered';
/** Un combattant sorti du combat VIVANT (moral raté, reddition, retraite
 *  narrée par le MJ). Il quitte le roster — « hors du combat » = « absent du
 *  roster », ce qui garde justes tous les filtres `hp.current > 0` — et reste
 *  consigné ici pour la victoire, l'XP, la chronique et le contexte du MJ.
 *  Audit 2026-08-25 : avant, la fuite s'écrivait `hp = 0`, indiscernable d'une
 *  mort pour le moteur ET pour le MJ, qui narrait un cadavre. */
export interface DepartedCombatant {
    id: string;
    name: string;
    /** Nom affiché par le tracker au moment du départ (« Goblin B »). */
    displayName?: string;
    side: 'player' | 'ally' | 'enemy';
    reason: DepartedReason;
    /** PV au moment du départ — jamais 0 : il est parti sur ses jambes. */
    hp: { current: number; max: number };
    xpValue?: number;
    round: number;
    /** Revenu au combat via add_enemy_init : ne pas le compter deux fois. */
    returned?: boolean;
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
    /** Sortis vivants du combat (fuite / reddition). Absent sur les anciennes
     *  sauvegardes : TOUJOURS lire via `(state.departed || [])`. */
    departed?: DepartedCombatant[];
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
export type ResolvedMonsterAttack = {
    name: string;
    attackBonus: number;
    damage: string;
    damageType: string;
    reach: number;
    range?: string;
    ranged?: { short: number; long: number };
    damageParts?: { damage: string; damageType: string }[];
};
export interface ActionCapability {
    canAct: boolean;
    canReact: boolean;
    /** Nom de la condition qui prive d'action (Paralyzed, Stunned, Unconscious, Incapacitated). */
    blockedBy?: string;
}
export interface EffectTickResult {
    activeEffects: ActiveEffect[];
    expired: string[];
    changed: boolean;
}
/** Ce qu'une nuit a réellement fait bouger sur une horloge du monde. */
export interface NightClockTick {
    name: string;
    stage: number;
    maxStage: number;
    /** Vrai UNIQUEMENT au tour où l'horloge atteint son palier final. */
    reachedMax: boolean;
}
export interface WithdrawResult {
    state: EncounterState;
    found: boolean;
    ambiguous?: boolean;
    /** Déjà parti : état rendu tel quel. */
    alreadyDeparted?: boolean;
    combatant?: Combatant;
    departed?: DepartedCombatant;
    error?: string;
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
export interface MoraleCheckResult {
    state: EncounterState;
    rolled: boolean;
    success?: boolean;
    total?: number;
    dieRoll?: number;
    wisMod?: number;
    fled: boolean;
    combatant?: Combatant;
    /** Fiche de sortie quand il a fui (PV intacts, round). */
    departed?: DepartedCombatant;
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
