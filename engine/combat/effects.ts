/** Effets et etats : tic de round, expiration, horloges de nuit, conditions posees sur le heros ou un combattant. */
import { Combatant } from '../combatants';
import { ActiveEffect, CharacterSheet, ConditionEntry } from '../../types';
import { lookupCondition } from '../codexService';
import { clampStatModifier } from '../gameValidator';
import { makeId, makeLog, resolveCombatantReference, syncCurrentTurn } from './encounter';
import { EffectTickResult, EncounterState, NightClockTick } from './types';

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
 * Fait passer une nuit sur les horloges du monde — implémentation UNIQUE,
 * partagée par l'outil `long_rest` du MJ et le bouton de repos du joueur (elle
 * était copiée aux deux endroits, avec le risque classique de n'en corriger
 * qu'un).
 *
 * Deux corrections d'audit (2026-08-24, A4) :
 *
 * 1. `tickOnLongRest: false` épargne une horloge. Les barèmes écrits disent
 *    autre chose que « +1 par nuit » — « La Couture : +1 par clôture d'ACTE,
 *    +1 par sortie à fil » ; « Voix Moissonnées : NE monte JAMAIS pour des
 *    pilleurs anonymes ». Le tic universel poussait ces horloges à leur palier
 *    final toute seule, quels que soient les choix du joueur. Absence de
 *    drapeau = tic (comportement d'origine, conservé pour les horloges créées
 *    par le MJ sur une campagne générée, où c'est le seul moteur).
 * 2. Seules les horloges qui BOUGENT sont rapportées. Une horloge déjà au
 *    maximum réclamait « FINAL STAGE REACHED — trigger its consequence now » à
 *    chaque nuit : deux d'entre elles l'ont fait toute la séance du 23/08.
 */
export function advanceClocksForNight<T extends {
    name: string; stage: number; maxStage: number; status: string;
    tickOnLongRest?: boolean; updatedAt?: number;
}>(clocks: T[] | undefined | null, now: number = Date.now()): { clocks: T[]; ticked: NightClockTick[] } {
    const ticked: NightClockTick[] = [];
    const next = (clocks || []).map(clock => {
        if (clock.status !== 'active' || clock.tickOnLongRest === false) return clock;
        const stage = Math.min(clock.maxStage, clock.stage + 1);
        if (stage === clock.stage) return clock; // déjà au palier final : silence
        ticked.push({ name: clock.name, stage, maxStage: clock.maxStage, reachedMax: stage >= clock.maxStage });
        return { ...clock, stage, updatedAt: now };
    });
    return { clocks: next, ticked };
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
