/**
 * Baril de compatibilite du moteur de combat — ne rien ajouter ici.
 *
 * Le 2026-08-25 (R2 du rangement), les 3 990 lignes de ce fichier ont ete
 * reparties par theme dans engine/combat/ (types, encounter, rolls, attack,
 * effects, morale, spells) et engine/character/ (hp, progression), sans
 * changer une ligne de code. Ce baril re-exporte exactement ce qui etait
 * exporte avant ; le code neuf importe directement du module concerne.
 */
export { combatantSide, isHero } from './combatants';
export type { RollKind, AdvantageMode, RollPromptState, RollOutcome, StoryModifierApplication, RollContextInput, RollContextResult, DepartedReason, DepartedCombatant, EncounterState, TurnEconomy, CombatLogEntry, AttackResolution, SpellCastResult, CombatantLookupResult, PendingSpellResolution, ConcentrationCheckResult, ActionCapability, EffectTickResult, NightClockTick, WithdrawResult, NpcConcentrationBreak, MoraleCheckResult, AoESpellTargetResult } from './combat/types';
export { resolveCombatantReference, syncCompanionsFromState, resolveMountAfterCombat, effectiveMountMaxHP, levelUpCompanions, encounterAlreadyRunning, startEncounter, matchPlayerClassAbility, addEnemyToEncounter, allyAttackProfile, addAllyToEncounter, updateEnemyHP, findDeparted, withdrawCombatant, advanceTurn, consumeCombatAction, selectEnemyTarget, encounterOutcome, enemyXPValue, victoryXP, sanitizeXPGrant, nextLevelFromXP } from './combat/encounter';
export { getActionCapability, classSavePassives, classCheckPassives, hasEvasion, brutalCriticalDice, songOfRestDie, deriveRollContext, normalizeRollPrompt, normalizeStoryModifier, applyStoryModifiersToPrompt, parseD20Formula, rollD20WithMode, resolveRollPrompt, featNumericBonus, featGrantsAdvantageOn, getProficientSaves, hasFeatSpecial, combatantEffectBonus, playerResistances, rageEffect, monkMartialArtsDie, formatDamageParts, CLASS_CASTER_ABILITY, rollDamageFormula } from './combat/rolls';
export { applyDamageToEncounter, concentrationBreakOnDeparture, releaseNpcConcentrationEffect, parseItemAdditionalDamage, resolveAttackAction } from './combat/attack';
export { tickRoundEffects, worldHourOf, stampEffectExpiry, sweepExpiredEffects, advanceClocksForNight, applyEffectArgs, applyConditionToCharacter, applyConditionToEncounter, CONDITION_TURNS, EVENTLESS_FALLBACK_TURNS } from './combat/effects';
export { MORALE_DC, MORALE_HP_RATIO, resolveMoraleCheck } from './combat/morale';
export { spendSpellSlot, castSpell, applyAutoDamageSpell, resolveSpellAgainstTargets, resolvePendingSpellRoll, resolveConcentrationAfterDamage } from './combat/spells';
export { applyDamageToCharacter, stabilizeCharacter, applyDownedDamagePenalty, applyCharacterHP, applyDeathSaveOutcome } from './character/hp';
export { ensureProgressionState, applyShortRest, applyLongRest } from './character/progression';
