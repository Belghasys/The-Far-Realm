/** Les sorts lances a la voix et les degats d'environnement : jets de
 *  sauvegarde, zones, conditions posees, degats partages. */
/** Les outils du combat : jets demandes au joueur, rencontre, attaques, degats, etats, sorts a la voix, actions proposees.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../../store/gameStore';
import { getEffectiveStat, getEffectiveAC, getPlayerAttackCount } from '../../../../types';
import { getCheckModifier } from '../../../../engine/skillSystem';
import { campaignEventLog } from '../../../../services/persistence/campaignEventLog';
import { waitDice } from '../../../../services/media/diceTiming';
import { auditBus } from '../../../../services/infra/auditBus';
import { applyAutoDamageSpell, castSpell, combatantSide, applyConditionToCharacter, applyConditionToEncounter, applyDamageToCharacter, applyDamageToEncounter, normalizeRollPrompt, resolveCombatantReference, resolveRollPrompt, resolveSpellAgainstTargets } from '../../../../engine/rulesEngine';
import { lookupMonster, lookupSpell, spellLabel } from '../../../../engine/codexService';
import { getCreature } from '../../../../data/bestiary';
import { rollDice } from '../../../../engine/utils';
import { worldHourOf, classSavePassives, hasEvasion, applyDownedDamagePenalty, releaseNpcConcentrationEffect, getProficientSaves, featGrantsAdvantageOn } from '../../../../engine/rulesEngine';
import { stringArg, holdForRollResolution } from '../shared';
import type { ToolContext } from '../context';

export async function environmental_damage(args: any, ctx: ToolContext) {
    const { d, deps, store, processToolCall, sysLine, handleConcentrationAfterDamage, optionalBoolean } = ctx;
    // The WORLD hurts a creature outside any attack (fire, icy water,
    // poison, falls, lava…). Rolls the dice locally — optional saving
    // throw first — applies real HP loss + an optional SRD condition.
    // Works in AND out of combat, on the player or any combatant.
    if (!store.character) return { success: false, error: 'No character loaded' };
    const hazard = stringArg(args.description || args.source || 'Danger environnemental', 120) || 'Danger environnemental';
    const damageFormula = String(args.damageFormula || args.formula || '').trim();
    if (!damageFormula) return { success: false, error: 'environmental_damage requires damageFormula (e.g. "2d6")' };
    const damageType = args.damageType ? String(args.damageType) : undefined;
     // ── Multi-cibles (éboulis, incendie de taverne…) : targets =
    // 'all_enemies' ou liste. Chaque cible repasse par CE MÊME outil
    // (jets de sauvegarde et dégâts indépendants, état relu frais).
    if (args.targets !== undefined) {
        const raw = args.targets;
        const rawMode = Array.isArray(raw) ? '' : String(raw).trim().toLowerCase();
        const list: string[] = Array.isArray(raw)
            ? raw.map((t: any) => String(t).trim()).filter(Boolean)
            : rawMode === 'all_enemies' || rawMode === 'all_combatants'
                ? (store.combatState.isActive
                    // 'all_combatants' = tout le monde y compris le
                    // joueur et les alliés (éboulement, incendie…).
                    ? store.combatState.combatants.filter(c => c.hp.current > 0
                        && (rawMode === 'all_combatants' || combatantSide(c) === 'enemy')).map(c => c.isPlayer ? 'player' : c.id)
                    : [])
                : String(raw).split(',').map(s => s.trim()).filter(Boolean);
        if (!list.length) return { success: false, error: "environmental_damage targets resolved to nobody (no active combat for 'all_enemies'?)" };
        if (list.length > 1) {
            const perTarget: any[] = [];
            for (const t of list) {
                const sub = await processToolCall({ name: 'environmental_damage', args: { ...args, targets: undefined, target: t } });
                perTarget.push({ target: t, ...(sub || {}) });
            }
            return {
                success: true,
                targets: perTarget,
                instruction: 'Narrate the hazard sweeping over all of them in ONE beat. HP changes are already applied — do not re-apply.',
            };
        }
        args.target = list[0];
    }
    const targetRef = stringArg(args.target || 'player', 120) || 'player';
    const isPlayerTarget = targetRef.toLowerCase() === 'player'
        || targetRef.toLowerCase() === store.character.name.toLowerCase();
     // ── 1. Optional saving throw (auto-rolled, fully visible) ──
    let multiplier = 1;
    let saveSummary = '';
    const saveAbility = String(args.saveAbility || '').toUpperCase();
    const saveDC = Number(args.saveDC ?? args.dc);
    const validSave = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(saveAbility) && Number.isFinite(saveDC) && saveDC > 0;
    let saveSucceeded: boolean | undefined;
    if (validSave) {
        let saveBonus = 0;
        let envSaveAdvantage = false;
        if (isPlayerTarget) {
            const c = store.character;
            const effectiveStats: Record<string, number> = {
                STR: getEffectiveStat(c, 'STR'), DEX: getEffectiveStat(c, 'DEX'), CON: getEffectiveStat(c, 'CON'),
                INT: getEffectiveStat(c, 'INT'), WIS: getEffectiveStat(c, 'WIS'), CHA: getEffectiveStat(c, 'CHA'),
            };
            const check = getCheckModifier({
                effectiveStats,
                level: c.level || 1,
                ability: saveAbility,
                isSave: true,
                proficiencies: c.proficiencies || [],
                expertise: c.expertise || [],
                proficientSaves: getProficientSaves(c),
            });
            // Aura de protection / Sens du danger s'appliquent aussi
            // aux sauvegardes de danger environnemental.
            const passives = classSavePassives(c, saveAbility as any);
            saveBonus = check.modifier + passives.bonus;
            // Don Expert des donjons (2026-08-13) : avantage aux
            // sauvegardes contre les PIÈGES.
            if (featGrantsAdvantageOn(c, 'save_vs_trap') && /pi[eè]ge|trap/i.test(hazard)) {
                envSaveAdvantage = true;
            }
        } else {
            const creatureData: any = lookupMonster(targetRef) || getCreature(targetRef);
            if (creatureData && 'saves' in creatureData && creatureData.saves?.[saveAbility] !== undefined) {
                saveBonus = creatureData.saves[saveAbility];
            } else if (creatureData && 'stats' in creatureData && creatureData.stats?.[saveAbility] !== undefined) {
                saveBonus = Math.floor((creatureData.stats[saveAbility] - 10) / 2);
            }
        }
        const outcome = resolveRollPrompt(normalizeRollPrompt({
            reason: `Sauvegarde ${saveAbility} — ${hazard}`,
            formula: `1d20${saveBonus >= 0 ? '+' : ''}${saveBonus}`,
            dc: saveDC,
            advantage: envSaveAdvantage ? 'advantage' : undefined,
        }));
        saveSucceeded = outcome.success;
        const halfOnSave = optionalBoolean(args.halfOnSave) ?? true;
        multiplier = outcome.success ? (halfOnSave ? 0.5 : 0) : 1;
        // ÉVASION (Roublard/Moine 7+, Hunter 15+) : sur une
        // sauvegarde de DEX « moitié dégâts », la réussite annule
        // TOUT et l'échec n'inflige que la moitié.
        // ou-m1 — le résumé est construit AVANT d'ajouter le tag
        // (l'ancien ordre écrasait « (Evasion) » aussitôt écrit).
        saveSummary = ` Save ${saveAbility} ${outcome.total} vs DC ${saveDC}: ${outcome.success ? 'SUCCESS' : 'FAILURE'}.`;
        if (isPlayerTarget && saveAbility === 'DEX' && halfOnSave && hasEvasion(store.character)) {
            multiplier = outcome.success ? 0 : 0.5;
            saveSummary += ' (Evasion)';
        }
        store.setCurrentRoll({
            result: outcome.total,
            reason: `${isPlayerTarget ? store.character.name : targetRef} — sauvegarde ${saveAbility} vs ${hazard} (${outcome.success ? 'réussie' : 'ratée'})`,
            isDM: !isPlayerTarget,
            success: outcome.success,
        });
        deps.diceTrayRef.current?.addLog({
            type: 'save',
            name: `Sauvegarde ${saveAbility} — ${hazard}`,
            total: outcome.total,
            formula: `${outcome.formulaLabel} vs DC ${saveDC}`,
            isDM: !isPlayerTarget,
            success: outcome.success,
        });
        await waitDice();
    }
     // ── 1bis. Mode JET D'ATTAQUE scripté (piège à fléchettes,
    // archer d'ambuscade pré-combat…) : attackBonus fourni et pas
    // de sauvegarde → 1d20+bonus contre la CA EFFECTIVE. Un raté
    // n'inflige rien — avant, ces attaques narratives touchaient
    // toujours ou passaient par des dégâts secs sans jet.
    let attackSummary = '';
    const envAttackBonus = Number(args.attackBonus);
    if (!validSave && Number.isFinite(envAttackBonus)) {
        const rosterHit = store.combatState.isActive
            ? resolveCombatantReference(store.combatState, isPlayerTarget ? 'player' : targetRef, { autoResolve: true })
            : null;
        const targetACValue = isPlayerTarget
            ? getEffectiveAC(store.character)
            : (rosterHit?.combatant?.ac ?? (lookupMonster(targetRef) as any)?.ac ?? (getCreature(targetRef) as any)?.ac ?? 12);
        const atkOutcome = resolveRollPrompt(normalizeRollPrompt({
            reason: `${hazard} — jet d'attaque`,
            formula: `1d20${envAttackBonus >= 0 ? '+' : ''}${envAttackBonus}`,
            dc: targetACValue,
        }));
        attackSummary = ` Attack ${atkOutcome.total} vs AC ${targetACValue}: ${atkOutcome.success ? 'HIT' : 'MISS'}.`;
        store.setCurrentRoll({
            result: atkOutcome.total,
            reason: `${hazard} — ${atkOutcome.success ? 'touche' : 'manque'} ${isPlayerTarget ? store.character.name : targetRef}`,
            isDM: true,
            success: atkOutcome.success,
        });
        deps.diceTrayRef.current?.addLog({
            type: 'attack',
            name: hazard,
            total: atkOutcome.total,
            formula: `${atkOutcome.formulaLabel} vs CA ${targetACValue}`,
            isDM: true,
            success: atkOutcome.success,
        });
        await waitDice();
        if (!atkOutcome.success) {
            const missText = useGameStore.getState().language !== 'en'
                ? `${hazard}: ${isPlayerTarget ? store.character.name : targetRef} évite l'attaque (${atkOutcome.total} vs CA ${targetACValue}).`
                : `${hazard}: ${isPlayerTarget ? store.character.name : targetRef} avoids the attack (${atkOutcome.total} vs AC ${targetACValue}).`;
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${missText}]*` }]);
            return {
                success: true,
                target: isPlayerTarget ? store.character.name : targetRef,
                amountApplied: 0,
                attackSummary,
                instruction: 'The scripted attack MISSED — narrate the near-miss. NO damage was dealt.',
            };
        }
    }
     // ── 2. Roll the damage ──
    const rolled = rollDice(damageFormula);
    const amount = Math.max(0, Math.floor(rolled.total * multiplier));
    if (amount > 0) {
        store.setCurrentRoll({ result: amount, reason: sysLine(`${hazard} — ${amount} dégâts ${damageType || ''}`, `${hazard} — ${amount} ${damageType || ''} damage`), isDM: true });
        deps.diceTrayRef.current?.addLog({
            type: 'damage',
            name: `${hazard}${isPlayerTarget ? '' : ` → ${targetRef}`}`,
            total: amount,
            formula: `${damageFormula}${multiplier !== 1 ? (multiplier === 0.5 ? ' (sauvegarde : ½ dégâts)' : ' (sauvegarde : annulé)') : ''}`,
            isDM: true,
        });
        await waitDice();
    }
     // ── 3. Apply the damage ──
    // État/fiche FRAIS : jusqu'à 3 waitDice() (12 s) ont pu s'écouler
    // depuis le snapshot du début de handler.
    const liveAfterDice = useGameStore.getState();
    let resultHP: { current: number; max: number } | undefined;
    let resolvedName = isPlayerTarget ? (liveAfterDice.character?.name || store.character.name) : targetRef;
    if (amount > 0) {
        const inEncounter = liveAfterDice.combatState.isActive
            ? applyDamageToEncounter(liveAfterDice.combatState, isPlayerTarget ? 'player' : targetRef, amount, damageType)
            : { found: false } as any;
        if (inEncounter.found && inEncounter.target) {
            store.setCombatState(inEncounter.state);
            resolvedName = inEncounter.target.name;
            resultHP = inEncounter.target.hp;
            if (inEncounter.npcConcentrationBroken) {
                const broken = inEncounter.npcConcentrationBroken;
                const released = releaseNpcConcentrationEffect(inEncounter.state, useGameStore.getState().character, broken);
                store.setCombatState(released.state);
                if (released.removedFromPlayer && released.character) d.syncCharacterCritical(released.character, 'hp');
                store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine(`${broken.casterName} perd sa concentration : ${broken.effectName} prend fin.`, `${broken.casterName} loses concentration: ${broken.effectName} ends.`)}]*` }]);
            }
            if (inEncounter.target.isPlayer && liveAfterDice.character) {
                let char = {
                    ...liveAfterDice.character,
                    tempHP: inEncounter.target.tempHP || 0,
                    hp: { ...liveAfterDice.character.hp, current: inEncounter.target.hp.current },
                };
                // RAW — dégâts subis à 0 PV = échec de jet de mort automatique.
                if (liveAfterDice.character.hp.current <= 0 && (inEncounter.amountApplied || 0) > 0) {
                    char = applyDownedDamagePenalty(char);
                }
                d.syncCharacterCritical(char, 'hp');
                handleConcentrationAfterDamage(char, inEncounter.amountApplied || 0);
            }
        } else if (isPlayerTarget && liveAfterDice.character) {
            // Out of combat (or player not in the encounter roster) —
            // racial/draconic/feat resistances + temp HP via the
            // shared helper (they were skipped outside encounters).
            const outOfCombat = applyDamageToCharacter(liveAfterDice.character, amount, damageType);
            const updatedChar = outOfCombat.character;
            d.syncCharacterCritical(updatedChar, 'hp');
            resultHP = updatedChar.hp;
            handleConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied);
        } else {
            return { success: false, error: `Target "${targetRef}" not found (no active combat).` };
        }
        store.pushCombatRoll({ name: `${hazard} → ${resolvedName}`, total: amount, formula: damageType || '', isDM: true });
        auditBus.publish('combat', `environmental_damage → ${resolvedName}: ${amount} ${damageType || ''} (${hazard})`, { hazard, amount, damageType, saveSummary });
    }
     // ── 4. Optional SRD condition on a failed save (or no save) ──
    let conditionApplied: string | undefined;
    const conditionName = args.condition ? String(args.condition) : '';
    if (conditionName && saveSucceeded !== true) {
        if (store.combatState.isActive && !isPlayerTarget) {
            const conditioned = applyConditionToEncounter(useGameStore.getState().combatState, targetRef, conditionName);
            if (conditioned.found) {
                store.setCombatState(conditioned.state);
                conditionApplied = conditioned.condition?.name;
            }
        } else {
            const currentChar = useGameStore.getState().character;
            if (currentChar) {
                const conditioned = applyConditionToCharacter(currentChar, conditionName);
                if (conditioned.found) {
                    d.syncCharacterCritical(conditioned.character, 'hp');
                    conditionApplied = conditioned.condition?.name;
                }
            }
        }
    }
     const envFr = useGameStore.getState().language !== 'en';
    const summaryText = envFr
        ? `${hazard}: ${resolvedName} ${amount > 0 ? `subit ${amount} dégâts${damageType ? ` (${damageType})` : ''}` : 'ne subit aucun dégât'}${conditionApplied ? ` et est ${conditionApplied}` : ''}.`
        : `${hazard}: ${resolvedName} ${amount > 0 ? `takes ${amount} damage${damageType ? ` (${damageType})` : ''}` : 'takes no damage'}${conditionApplied ? ` and is ${conditionApplied}` : ''}.`;
    campaignEventLog.append('HP_CHANGED', summaryText, { hazard, target: resolvedName, amount, damageType, saveSummary, attackSummary, conditionApplied });
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${summaryText}${saveSummary}${attackSummary}]*` }]);
    return {
        success: true,
        target: resolvedName,
        amountApplied: amount,
        damageType,
        saveSucceeded,
        conditionApplied,
        hp: resultHP,
        instruction: 'Narrate the hazard and its toll vividly. The HP change is already applied — do not re-apply it.',
    };
}
export async function cast_spell(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    // OU5 — même contrat que request_roll : un seul jet à l'écran.
    // Un cast pendant un jet en attente écrasait le prompt retenu
    // et gelait le MJ jusqu'au timeout de 90 s.
    if (useGameStore.getState().activePrompt) {
        return { success: false, error: 'A roll is already pending on screen. Wait for its result before casting a spell that needs a roll.' };
    }
    const spellName = String(args.spellName || args.name || '').trim();
    // Le nom canonique (anglais) reste la donnee ; ce que le joueur LIT dans
    // son journal suit sa langue (les 114 sorts SRD ont un alias francais).
    const spellShown = spellLabel(spellName, sysLine('fr', 'en') as 'fr' | 'en');
    if (!spellName) return { success: false, error: 'cast_spell requires spellName' };
    // ÉCONOMIE D'ACTION À LA VOIX (audit 2026-08-21) : un sort coûte
    // l'ACTION entière (ou l'action BONUS si Sort accéléré armé),
    // exactement comme depuis le panneau. Sans ce gate, la voix
    // permettait des sorts illimités dans un même tour de combat.
    const quickenedVoiceCast = (store.character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
    if (store.combatState.isActive) {
        const econ: any = store.combatState.actionEconomy?.['player'] || {};
        const baseSlices = getPlayerAttackCount(store.character);
        const mainFree = ((econ.attacksMax ?? baseSlices) - (econ.attacksUsed ?? 0)) >= baseSlices;
        const bonusFree = ((econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0)) >= 1;
        if (quickenedVoiceCast ? !bonusFree : !mainFree) {
            return {
                success: false,
                error: quickenedVoiceCast
                    ? 'Bonus action already spent this turn — Quickened Spell needs a free bonus action. The player can end their turn with the on-screen button.'
                    : 'No ACTION left this turn: casting a spell costs the full action and the player already spent it (attack, spell, or other action). One leveled spell or cantrip per turn — they can end their turn with the on-screen button.',
            };
        }
    }
    // Sort de ZONE à la voix : target='all_enemies' → sauvegarde
    // par ennemi via le résolveur moteur (pas de prompt bloquant).
    // 'all_combatants' = TIR AMI (audit 2026-08-12 : les alliés
    // étaient inconditionnellement exclus — une Boule de feu ne
    // pouvait jamais toucher le compagnon).
    const aoeMode = String(args.target || args.targets || '').trim().toLowerCase();
    const aoeRequested = aoeMode === 'all_enemies' || aoeMode === 'all_combatants';
    const aoeEnemyIds = aoeRequested && store.combatState.isActive
        ? store.combatState.combatants.filter(c => c.hp.current > 0 && !c.isPlayer
            && (aoeMode === 'all_combatants' || combatantSide(c) === 'enemy')).map(c => c.id)
        : [];
    const targetRef = aoeRequested
        ? (aoeEnemyIds[0] || '')
        : String(args.target || '');
    // autoResolve : plusieurs ennemis du même nom ne doivent plus
    // faire échouer le sort — on tranche comme pour une attaque.
    const targetLookup = targetRef && store.combatState.isActive
        ? resolveCombatantReference(store.combatState, targetRef, { autoResolve: true })
        : null;
    if (targetLookup?.ambiguous) {
        return { success: false, error: 'Ambiguous spell target. Use combatant id.' };
    }
    // NF4 — un sort de CONTACT (« Touch ») exige le corps à corps.
    const touchSpellDef = lookupSpell(spellName);
    if (touchSpellDef && /^touch$/i.test(String(touchSpellDef.range || ''))
        && store.combatState.isActive
        && targetLookup?.combatant && !targetLookup.combatant.isPlayer
        && (((targetLookup.combatant as any).range || 'melee') !== 'melee')) {
        return {
            success: false,
            error: `${touchSpellDef.name} is a TOUCH spell: the target must be within melee reach (currently ${(targetLookup.combatant as any).range}). Close the distance first, or pick a ranged spell.`,
        };
    }
    const result = castSpell(store.character, {
        spellName,
        slotLevel: Number(args.slotLevel || args.slot || 0) || undefined,
        target: args.target,
        targetId: targetLookup?.combatant?.id,
        casterAbility: args.casterAbility,
        casterAbilityMod: Number.isFinite(Number(args.casterAbilityMod)) ? Number(args.casterAbilityMod) : undefined,
        spellAttackBonus: Number.isFinite(Number(args.spellAttackBonus)) ? Number(args.spellAttackBonus) : undefined,
        spellSaveDC: Number.isFinite(Number(args.spellSaveDC || args.saveDC)) ? Number(args.spellSaveDC || args.saveDC) : undefined,
        targetAC: Number.isFinite(Number(args.targetAC)) ? Number(args.targetAC) : targetLookup?.combatant?.ac,
        targetSaveBonus: Number.isFinite(Number(args.targetSaveBonus)) ? Number(args.targetSaveBonus) : undefined,
        worldHour: worldHourOf(store.campaignRuntime.dayCount || 1, store.campaignRuntime.timeOfDay),
        maximizeHealing: !!store.character.storyMode,
    });
     if (!result.success) return { success: false, error: result.error, spell: result.spell?.name };
     // Dépense de l'action (ou de l'action bonus, Sort accéléré) —
    // AVANT les branches de résolution : chaque chemin de retour
    // repart d'un état frais, la dépense est donc visible partout.
    if (store.combatState.isActive) {
        const liveCombat = useGameStore.getState().combatState;
        const econ: any = liveCombat.actionEconomy?.['player'] || {};
        const spent = quickenedVoiceCast
            ? { ...econ, bonusUsed: (econ.bonusUsed ?? 0) + 1, bonusActionUsed: ((econ.bonusUsed ?? 0) + 1) >= (econ.bonusMax ?? 1) }
            : { ...econ, attacksUsed: Math.max(econ.attacksUsed ?? 0, econ.attacksMax ?? getPlayerAttackCount(store.character)), actionUsed: true };
        store.setCombatState({ ...liveCombat, actionEconomy: { ...(liveCombat.actionEconomy || {}), player: spent } });
    }
     d.syncCharacterCritical(result.character, 'hp');
     // Réponse d'outil AMINCIE : SpellCastResult.character est la fiche
    // COMPLÈTE (inventaire, sorts, effets) — la sérialiser vers Gemini
    // à chaque cast coûtait des tokens à chaque sort et gonflait le
    // contexte. Le MJ n'a besoin que du résumé mécanique.
    const { character: _castSheet, ...slimResult } = result as any;
     // CB1 — soin sur une cible NON-joueur : le moteur n'a pas
    // touché la fiche du lanceur, on applique le soin à la
    // cible réelle. Avant, « Cure Wounds sur le compagnon »
    // soignait le joueur et laissait le compagnon à terre.
    if (result.healing && result.healing > 0 && result.healingTargetsSelf === false) {
        const victim = targetLookup?.combatant;
        if (victim && useGameStore.getState().combatState.isActive) {
            store.setCombatState((prev: any) => ({
                ...prev,
                combatants: prev.combatants.map((c: any) => c.id === victim.id
                    ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + (result.healing || 0)) } }
                    : c),
            }));
            store.pushCombatRoll({ name: `${spellShown} → ${victim.name}`, total: result.healing, formula: result.spell?.healing?.dice || 'heal', isDM: true });
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellShown} — ${victim.name} +${result.healing} HP]*` }]);
            campaignEventLog.append('EFFECT_ADDED', `Heal applied to ${victim.name}: +${result.healing}`, { spell: spellName });
            return {
                success: true,
                spell: result.spell,
                consumedSlot: result.consumedSlot,
                healing: result.healing,
                target: victim.name,
                summary: `${spellName} heals ${victim.name} for ${result.healing} HP.`,
                instruction: 'Healing is ALREADY applied to the target. Narrate it once — do not re-apply.',
            };
        }
        // Hors combat : compagnon/monture/familier persistant nommé.
        const compRef = String(args.target || '').trim().toLowerCase();
        const liveChar = useGameStore.getState().character;
        const comp = (liveChar?.companions || []).find(c =>
            c.id.toLowerCase() === compRef || c.name.trim().toLowerCase() === compRef);
        if (comp && liveChar) {
            const healedComp = { ...comp, hp: { ...comp.hp, current: Math.min(comp.hp.max, comp.hp.current + (result.healing || 0)) } };
            d.syncCharacterCritical({
                ...liveChar,
                companions: (liveChar.companions || []).map(c => c.id === comp.id ? healedComp : c),
            }, 'hp');
            return {
                success: true,
                healing: result.healing,
                target: comp.name,
                consumedSlot: result.consumedSlot,
                summary: `${spellName} heals ${comp.name} for ${result.healing} HP (${healedComp.hp.current}/${comp.hp.max}).`,
                instruction: 'Healing is ALREADY applied to the companion. Narrate it once.',
            };
        }
        // Cible non suivie par le moteur (PNJ narratif) : le soin
        // reste narratif — le dire clairement au MJ.
        return {
            success: true,
            healing: result.healing,
            target: args.target,
            consumedSlot: result.consumedSlot,
            summary: `${spellName}: ${result.healing} HP of healing for ${args.target} (narrative NPC — no tracked HP; do NOT apply it to the player).`,
        };
    }
     if (aoeRequested && aoeEnemyIds.length && result.prompt?.type === 'SAVE' && result.prompt.pendingSpell) {
        const aoe = resolveSpellAgainstTargets(useGameStore.getState().combatState, result.prompt, aoeEnemyIds);
        if (aoe) {
            store.setCombatState(aoe.state);
            if (aoe.sharedDamageRoll > 0) {
                store.setCurrentRoll({ result: aoe.sharedDamageRoll, reason: `${spellShown} — ${sysLine('dégâts de zone', 'area damage')}`, isDM: false });
                await waitDice();
            }
            for (const r of aoe.results) {
                store.pushCombatRoll({ name: `${spellShown} → ${r.name}`, total: r.damage, formula: `save ${r.saveTotal} vs DC ${result.prompt.dc}${r.saveSuccess ? sysLine(' (réussie)', ' (success)') : ''}`, isDM: true });
            }
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellShown} (${sysLine('zone', 'area')}) — ${aoe.summary}]*` }]);
            campaignEventLog.append('EFFECT_ADDED', `AoE spell resolved: ${spellName}`, { results: aoe.results });
            return {
                success: true,
                spell: result.spell,
                consumedSlot: (result as any).consumedSlot,
                areaResults: aoe.results,
                summary: aoe.summary,
                instruction: 'All saves and damage are RESOLVED (listed above). Narrate the blast in ONE beat — never re-roll or re-apply.',
            };
        }
    }
     // Sort à TOUCHE AUTOMATIQUE (Projectile magique) : aucun jet,
    // les dégâts s'appliquent directement. Avant, ce sort ne
    // faisait rien du tout, ni côté joueur ni côté MJ.
    if (result.autoDamage && useGameStore.getState().combatState.isActive) {
        const victims = aoeRequested && aoeEnemyIds.length
            ? aoeEnemyIds
            : [targetLookup?.combatant?.id || targetRef].filter(Boolean) as string[];
        const reports: string[] = [];
        for (const victimId of victims) {
            // État FRAIS à chaque itération + commit SYNC avant
            // l'animation : l'ancien commit unique post-boucle
            // écrasait tout changement concurrent survenu pendant
            // les waitDice() (audit 2026-08-12, ex-:2446).
            const liveState = useGameStore.getState().combatState;
            const applied = applyAutoDamageSpell(liveState, { ...result.autoDamage, targetId: victimId });
            if (!applied) continue;
            store.setCombatState(applied.state);
            store.setCurrentRoll({ result: applied.damage, reason: `${spellShown} → ${applied.target.name}`, isDM: false });
            await waitDice();
            store.pushCombatRoll({ name: `${spellShown} → ${applied.target.name}`, total: applied.damage, formula: result.autoDamage.damageFormula, isDM: false });
            reports.push(`${applied.target.name}: ${applied.damage}`);
        }
        if (reports.length) {
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellShown} — ${reports.join(', ')}]*` }]);
            campaignEventLog.append('EFFECT_ADDED', `Auto-hit spell resolved: ${spellName}`, { reports });
            return {
                success: true,
                spell: result.spell,
                consumedSlot: (result as any).consumedSlot,
                summary: `${spellName} auto-hit: ${reports.join(', ')}`,
                instruction: 'This spell ALWAYS hits — damage is already applied. Narrate it once; never roll to hit or re-apply damage.',
            };
        }
    }
     if (result.prompt) {
        if (targetLookup?.combatant && result.prompt.pendingSpell) {
            result.prompt.pendingSpell.targetId = targetLookup.combatant.id;
            result.prompt.pendingSpell.target = targetLookup.combatant.name;
            if (result.prompt.type === 'ATTACK') result.prompt.dc = targetLookup.combatant.ac;
        }
        store.setActivePrompt(result.prompt);
        campaignEventLog.append('ROLL_REQUESTED', `Spell roll requested: ${result.prompt.name}`, { ...result.prompt, resolveToolCall: undefined });
    }
    campaignEventLog.append('EFFECT_ADDED', `Spell cast through SRD Codex: ${result.spell?.name}`, result);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${result.summary}]*` }]);
    if (result.prompt) {
        // Same blocking contract as request_roll: hold the tool
        // response until the spell's attack/save roll lands so the
        // DM cannot pre-narrate the hit or the save.
        return await holdForRollResolution(result.prompt, { ...slimResult, prompt: { ...result.prompt } });
    }
    return slimResult;
}
