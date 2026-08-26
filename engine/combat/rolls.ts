/** Les jets : avantage, modificateurs d'histoire, passifs de classe et de dons, resistances, contextes de jet, degats. */
import { Combatant } from '../combatants';
import { getFeatById } from '../../data/feats';
import { CLASS_DATA } from '../../data/classes';
import { RACE_DATA } from '../../data/races';
import { ActiveEffect, Ability, CharacterSheet, ConditionEntry, StoryRollModifier, getEffectiveAC, getEffectiveStat, getDraconicDamageType } from '../../types';
import { lookupCondition, lookupMonster, normalizeDamageType } from '../codexService';
import { rollDice } from '../utils';
import { makeId } from './encounter';
import { castSpell } from './spells';
import { ActionCapability, AdvantageMode, RollContextInput, RollContextResult, RollKind, RollOutcome, RollPromptState, StoryModifierApplication } from './types';

const TYPE_KEYWORDS: Array<[RollKind, string[]]> = [
    ['DEATH_SAVE', ['death save', 'death saving', 'jet de mort', 'sauvegarde contre la mort']],
    ['ATTACK', ['attack', 'attaque', 'strike', 'hit roll', 'to hit']],
    ['SAVE', ['save', 'saving throw', 'sauvegarde', 'jet de sauvegarde']],
    ['DAMAGE', ['damage', 'degat', 'degats', 'dommage']],
];
export function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2);
}
function normalizeAdvantage(value: unknown): AdvantageMode {
    // ou-m8 — normalisation NFD : « désavantage » accentué devenait 'normal'.
    const text = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (text === 'dis' || text.includes('disadvantage') || text.includes('desavantage')) return 'disadvantage';
    if (text === 'adv' || text.includes('advantage')) return 'advantage';
    return 'normal';
}
export function proficiencyBonus(level: number): number {
    return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}
export function normalizeAbility(value?: string): Ability {
    const upper = String(value || '').toUpperCase();
    if (upper === 'STR' || upper === 'DEX' || upper === 'CON' || upper === 'INT' || upper === 'WIS' || upper === 'CHA') return upper;
    return 'CHA';
}
export function damageAdjustment(target: Combatant, amount: number, damageType?: string): { amountApplied: number; mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' } {
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
export function mergeAdvantage(current: AdvantageMode, next?: AdvantageMode): AdvantageMode {
    if (!next || next === 'normal') return current;
    if (current === 'normal') return next;
    return current === next ? current : 'normal';
}
export function conditionFromEffect(effect: ActiveEffect): ConditionEntry | null {
    if (effect.source !== 'condition') return null;
    return lookupCondition(effect.name);
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
/** Caractéristique d'incantation par classe — UNE source de vérité, partagée
 *  entre le moteur (castSpell) et l'UI (SpellbookPanel affichait un DD basé INT
 *  par défaut alors que le moteur lançait en SAG pour un Clerc sans champ
 *  spellcastingAbility — audit 2026-08-12). */
export const CLASS_CASTER_ABILITY: Record<string, Ability> = {
    Mage: 'INT', Wizard: 'INT', Cleric: 'WIS', Druid: 'WIS', Ranger: 'WIS', Monk: 'WIS',
    Bard: 'CHA', Sorcerer: 'CHA', Warlock: 'CHA', Paladin: 'CHA',
};
export function rollDamageAmount(formula: string, critical = false): { total: number; raw: number } {
    const rolled = rollDice(formula);
    // cb-m12 — critique RAW : dés RELANCÉS, pas doublés en valeur.
    const raw = critical
        ? rolled.total + rollDice(formula).rolls.reduce((sum, roll) => sum + roll, 0)
        : rolled.total;
    return { total: Math.max(0, raw), raw: Math.max(0, raw) };
}
export function rollDamageFormula(formula: string): ReturnType<typeof rollDice> {
    return rollDice(formula);
}
