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
// ═══════════ DURÉE DES ÉTATS — table décidée le 2026-08-31 ═══════════
//
// Avant, TOUT durait dix rounds : Étourdi comme Empoisonné comme Inconscient
// (CB6 avait remplacé « permanent » par un forfait, ce qui réglait le poison de
// piège à vie mais rendait l'Étourdi décisif à lui seul). La table donne à
// chaque état son propre nombre de tours.
//
// `null` = pas de compteur : l'état finit sur un ÉVÉNEMENT, jamais sur le temps.
// Un Inconscient qui se réveille tout seul rendrait ses actions à un héros à
// terre pendant que ses jets de mort continuent ; un Agrippé se libère quand
// l'agrippeur lâche ou meurt ; Pétrifié demande une restauration ; l'Épuisement
// est un NIVEAU que seul un repos long fait redescendre. Ces quatre-là sortent
// par `remove_condition`, par les soins ou par le repos.
export const CONDITION_TURNS: Record<string, number | null> = {
    // RAW « jusqu'à la fin de ton prochain tour » — collage exact.
    stunned: 1,
    // On se relève avec la moitié de son mouvement, donc à son tour suivant.
    prone: 1,
    // Presque jamais seul : il accompagne un autre état qui porte la durée.
    incapacitated: 1,
    // Hold Person : sauvegarde en fin de chaque tour, ~2 tours en moyenne.
    paralyzed: 2,
    // Tant que la source de la peur reste en vue.
    frightened: 2,
    // Jusqu'au jet d'évasion.
    restrained: 2,
    // RAW une minute, mais dix tours plombent un combat : trois se jouent.
    blinded: 3,
    charmed: 3,
    deafened: 3,
    // RAW dix (une minute) ; cinq se joue mieux sans dénaturer la règle.
    poisoned: 5,
    // Vrai sort d'une minute : ici le dix d'origine était juste.
    invisible: 10,
    grappled: null,
    unconscious: null,
    petrified: null,
    exhaustion: null,
};

/**
 * FILET (audit inversé du 2026-08-31). « Pas de compteur » est la bonne règle
 * pour le HÉROS : ses jets de mort gouvernent son sort, et le réveiller au
 * chrono les casserait. Pour un ENNEMI c'est un trou d'équilibre, parce que les
 * événements de fin de ces états ne sont PAS implémentés — rien ne réveille un
 * inconscient aux dégâts, il n'y a pas de jet d'évasion pour l'agrippé, pas de
 * Restauration supérieure pour le pétrifié.
 *
 * Résultat mesuré : un simple apply_condition('unconscious') retirait l'ennemi
 * du combat DÉFINITIVEMENT (npcTurn saute son tour à chaque round). Le forfait
 * qui existait avant était grossier, mais c'était une soupape ; l'avoir retiré
 * sans poser le mécanisme réel a ouvert le trou.
 *
 * Ce filet le referme côté ennemi seulement. Ce n'est PAS une règle — c'est un
 * garde-fou en attendant les vrais événements de fin.
 */
export const EVENTLESS_FALLBACK_TURNS = 10;

/**
 * Le champ de durée d'un état, prêt à étaler dans l'effet.
 *
 * ⚠️ L'OFFSET. Le décompte se fait au DÉBUT du tour du porteur
 * (`tickRoundEffects`, appelé par `advanceTurn` et par GameSession). Un état
 * stocké à N serait donc décompté à l'ouverture du tour qu'il devait
 * justement bloquer : un « Étourdi 1 » posé sur un gobelin s'effaçait à
 * l'ouverture du tour du gobelin, qui jouait normalement — l'état n'avait
 * jamais mordu. Couvrir N tours COMPLETS demande N+1 bornes de décompte.
 *
 * Les buffs de sorts n'ont PAS cet offset et ne passent pas par ici : leur
 * règle est « jusqu'au DÉBUT de ton prochain tour » (Bouclier), soit une borne
 * et non N+1. Ajouter l'offset là-bas doublerait leur durée.
 */
function conditionDuration(conditionId: string, eventlessFallback = false): Pick<ActiveEffect, 'duration' | 'roundsRemaining'> {
    const turns = CONDITION_TURNS[conditionId];
    if (turns === null || turns === undefined) {
        // Inconnu ou sans compteur : il ne tombe que sur un événement.
        // `tickRoundEffects` ignore tout ce qui n'est pas 'rounds'/'concentration'.
        if (!eventlessFallback) return { duration: 'permanent' };
        return { duration: 'rounds', roundsRemaining: EVENTLESS_FALLBACK_TURNS + 1 };
    }
    return { duration: 'rounds', roundsRemaining: turns + 1 };
}

function conditionToEffect(condition: ConditionEntry, eventlessFallback = false): ActiveEffect {
    const modifiers: ActiveEffect['modifiers'] = [];
    if (condition.movement === 'zero') modifiers.push({ stat: 'speed', bonus: 0, setTo: 0 });

    return {
        id: makeId('condition'),
        name: condition.name,
        source: 'condition',
        ...conditionDuration(condition.id, eventlessFallback),
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

    // Le filet ne vaut QUE pour les autres que le héros — voir EVENTLESS_FALLBACK_TURNS.
    const effect = conditionToEffect(condition, !lookup.combatant.isPlayer);
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
