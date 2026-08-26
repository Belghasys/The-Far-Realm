/** Les sorts : emplacements, lancement, zones, jets differes, concentration apres degats. */
import { Combatant } from '../combatants';
import { getCreature } from '../../data/bestiary';
import { ActiveEffect, Ability, CharacterSheet, getEffectiveStat, getEffectiveMaxHP } from '../../types';
import { getScaledSpellDice, lookupMonster, lookupSpell } from '../codexService';
import { clampHP } from '../gameValidator';
import { rollDice, maxRollOfFormula } from '../utils';
import { applyConcentrationReplacement, applyDamageToEncounter } from './attack';
import { applyConditionToEncounter, stampEffectExpiry, worldHourOf } from './effects';
import { combatantKey, makeId, matchPlayerClassAbility, resolveCombatantReference } from './encounter';
import { CLASS_CASTER_ABILITY, abilityMod, featGrantsAdvantageOn, normalizeAbility, normalizeRollPrompt, proficiencyBonus, resolveRollPrompt, rollDamageAmount } from './rolls';
import { AoESpellTargetResult, ConcentrationCheckResult, EncounterState, PendingSpellResolution, RollOutcome, RollPromptState, SpellCastResult } from './types';

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
