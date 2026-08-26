/** Les outils du combat : jets demandes au joueur, rencontre, attaques, degats, etats, sorts a la voix, actions proposees.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { appendCampaignLog, combatChronicle, describeCombatFoes, describeDeparted, formatCombatChronicleLine } from '../chronicle';
import { buildSceneImagePrompt } from '../../../services/media/geminiImageService';
import { getEffectiveStat, getRollBonus, getGearSkillBonus, getEffectiveAC, getPlayerAttackCount } from '../../../types';
import { getCheckModifier, canonicalSkillName, SKILL_TRANSLATIONS, gearAdvantageFor, armorStealthPenalty, foldText } from '../../../engine/skillSystem';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { waitDice } from '../../../services/media/diceTiming';
import { auditBus } from '../../../services/infra/auditBus';
import { addEnemyToEncounter, addAllyToEncounter, advanceTurn, applyAutoDamageSpell, castSpell, combatantSide, applyConditionToCharacter, applyConditionToEncounter, applyDamageToCharacter, applyDamageToEncounter, applyCharacterHP, applyEffectArgs, encounterAlreadyRunning, applyStoryModifiersToPrompt, normalizeRollPrompt, resolveCombatantReference, resolveAttackAction, resolveRollPrompt, resolveSpellAgainstTargets, sanitizeXPGrant, startEncounter, updateEnemyHP, withdrawCombatant, concentrationBreakOnDeparture, type DepartedReason } from '../../../engine/rulesEngine';
import { assessEncounterPressure, buildEncounter, lookupCondition, lookupMonster, lookupSpell, structureInventoryItem } from '../../../engine/codexService';
import { getCreature } from '../../../data/bestiary';
import { rollDice } from '../../../engine/utils';
import { syncCompanionsFromState, worldHourOf, classSavePassives, classCheckPassives, hasEvasion, deriveRollContext, applyDownedDamagePenalty, releaseNpcConcentrationEffect, formatDamageParts, getProficientSaves, featGrantsAdvantageOn } from '../../../engine/rulesEngine';
import { stringArg, holdForRollResolution } from './shared';
import type { ToolContext } from './context';

export async function request_roll(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    // One roll at a time: the same on-screen slot also carries
    // engine-initiated prompts (death saves, concentration).
    if (useGameStore.getState().activePrompt) {
        return { success: false, error: 'A roll is already pending on screen. Wait for its result before requesting another.' };
    }
    const basePrompt = normalizeRollPrompt(args);
    // Use the SHEET, not an LLM-typed number: when the DM names a skill or
    // ability, compute the modifier from the character (ability mod +
    // proficiency + expertise; class save proficiency for saves) and override
    // the formula. Story modifiers still layer on via dmBonus afterwards.
    const rollChar = store.character;
    const skillArg = args.skill ? String(args.skill) : '';
    const abilityArg = args.ability ? String(args.ability) : '';
    let saveAbilityHint: any;
    if (rollChar && (skillArg || abilityArg)) {
        const isSave = Boolean(args.isSave)
            || basePrompt.type === 'SAVE'
            || /sauvegarde|saving\s*throw|\bsave\b/i.test(String(args.reason || ''));
        const effectiveStats: Record<string, number> = {
            STR: getEffectiveStat(rollChar, 'STR'), DEX: getEffectiveStat(rollChar, 'DEX'), CON: getEffectiveStat(rollChar, 'CON'),
            INT: getEffectiveStat(rollChar, 'INT'), WIS: getEffectiveStat(rollChar, 'WIS'), CHA: getEffectiveStat(rollChar, 'CHA'),
        };
        // Classe + dons (Résilient CON) — audit 2026-08-13.
        const classSaves = getProficientSaves(rollChar);
        const check = getCheckModifier({
            effectiveStats,
            level: rollChar.level || 1,
            skill: skillArg || undefined,
            ability: abilityArg || undefined,
            isSave,
            proficiencies: rollChar.proficiencies || [],
            expertise: rollChar.expertise || [],
            proficientSaves: classSaves,
        });
        // Passifs de classe (SRD) : Aura de protection (Paladin 6+),
        // Sens du danger (Barbare, saves DEX), Touche-à-tout (Barde),
        // Athlète remarquable (Champion 7+). Le MJ n'a rien à faire.
        let passiveBonus: number;
        if (isSave) {
            const passives = classSavePassives(rollChar, check.ability);
            passiveBonus = passives.bonus;
            if (passives.advantage && basePrompt.advantage !== 'disadvantage') basePrompt.advantage = 'advantage';
            if (passives.reasons.length) basePrompt.contextReasons = [...(basePrompt.contextReasons || []), ...passives.reasons];
        } else {
            const passives = classCheckPassives(rollChar, check.ability, check.proficient);
            passiveBonus = passives.bonus;
            if (passives.reasons.length) basePrompt.contextReasons = [...(basePrompt.contextReasons || []), ...passives.reasons];
        }
        basePrompt.formula = `1d20${check.modifier + passiveBonus >= 0 ? '+' : ''}${check.modifier + passiveBonus}`;
        // Bonus plats d'effets (checkBonus/saveBonus) et
        // d'équipement (« +1 aux sauvegardes », « +2 Discrétion »)
        // — avant, seuls les story modifiers touchaient dmBonus.
        const canonical = skillArg ? canonicalSkillName(skillArg) : '';
        // SKILL_TRANSLATIONS est FR→EN ; on cherche le nom FR par valeur.
        const frName = canonical ? (Object.entries(SKILL_TRANSLATIONS).find(([, en]) => en === canonical)?.[0] || '') : '';
        basePrompt.dmBonus = getRollBonus(rollChar, isSave ? 'save' : 'check')
            + (skillArg && !isSave ? getGearSkillBonus(rollChar, [skillArg, canonical, frName]) : 0);
        basePrompt.name = `${basePrompt.name}${check.proficient ? (check.expert ? ' (expertise)' : ' (maîtrisé)') : ''}`;
        saveAbilityHint = check.ability;
        // NF2 — avantage d'ÉQUIPEMENT (bottes elfiques → avantage
        // Discrétion), reflété automatiquement dans le jet.
        if (!isSave && skillArg) {
            const gearAdv = gearAdvantageFor(rollChar, canonical || skillArg);
            if (gearAdv && basePrompt.advantage !== 'disadvantage') {
                basePrompt.advantage = 'advantage';
                basePrompt.contextReasons = [...(basePrompt.contextReasons || []), `${gearAdv.source}: advantage`];
            }
            // SRD — armure bruyante (stealthDisadvantage) : désavantage
            // aux tests de Discrétion. Le drapeau était affiché sur la
            // fiche mais jamais appliqué aux jets (audit 2026-08-12).
            if (canonical === 'Stealth') {
                const noisy = armorStealthPenalty(rollChar);
                if (noisy) {
                    // avantage + désavantage s'annulent (RAW) → 'normal'.
                    basePrompt.advantage = basePrompt.advantage === 'advantage' ? 'normal' : 'disadvantage';
                    basePrompt.contextReasons = [...(basePrompt.contextReasons || []), `${noisy.source}: disadvantage on Stealth`];
                }
            }
        }
    }
    const modifierApplication = applyStoryModifiersToPrompt(basePrompt, store.character?.storyModifiers || []);
    // CB7 — les conditions du joueur pèsent enfin sur les jets
    // demandés par le MJ : entravé → désavantage DEX, paralysé →
    // échec auto FOR/DEX, empoisonné → désavantage aux tests.
    // (deriveRollContext n'était appelé que par resolve_attack.)
    const conditionContext = deriveRollContext(modifierApplication.prompt, {
        actorEffects: [
            ...((store.character?.activeEffects || []) as any[]),
            ...((store.combatState.isActive
                ? (store.combatState.combatants.find(c => c.isPlayer)?.activeEffects || [])
                : []) as any[]),
        ],
        saveAbility: saveAbilityHint,
    });
    const prompt = conditionContext.prompt;
    const recentEvents = campaignEventLog.getEvents();
    const lastBranch = [...recentEvents].reverse().find(event => event.type === 'BRANCH_PLANNED');
    const lastPlayer = [...recentEvents].reverse().find(event => event.type === 'PLAYER_SPOKE');
    const branchJustPlanned = lastBranch && (!lastPlayer || lastPlayer.timestamp <= lastBranch.timestamp);
    const forceRoll = args.force === true || String(args.force || '').toLowerCase() === 'true';
    const protectedRoll = store.combatState.isActive
        || prompt.type === 'DEATH_SAVE'
        || Boolean(prompt.concentrationDamage)
        || /concentration|spell attack|save vs/i.test(prompt.name);
    if (branchJustPlanned && !forceRoll && !protectedRoll) {
        const rejection = {
            reason: prompt.name,
            formula: prompt.formula,
            dc: prompt.dc,
            lastBranch: lastBranch.summary,
        };
        campaignEventLog.append('ROLL_REJECTED', `Suppressed roll after branch plan: ${prompt.name}`, rejection);
        return {
            success: false,
            suppressed: true,
            // ou-m3 — l'override force existait dans le code mais
            // n'était ni déclaré ni documenté : inatteignable.
            error: 'Roll suppressed: branch plans cannot trigger checks by themselves. Wait for a new concrete player action with risk and consequence — or pass force=true if this roll genuinely stems from one.',
        };
    }
    if (store.character && modifierApplication.applied.length) {
        d.syncCharacterCritical({
            ...store.character,
            storyModifiers: modifierApplication.remaining,
        }, 'hp');
        campaignEventLog.append('ROLL_REQUESTED', `Story modifier applied to ${basePrompt.name}`, {
            applied: modifierApplication.applied,
            remaining: modifierApplication.remaining,
        });
    }
    // BLOCKING two-step roll: the tool response is HELD until the
    // player actually rolls, so the Live DM physically cannot
    // narrate an outcome it does not have (it used to get an
    // immediate "wait for the result" response and then invent
    // the result anyway). GameSession's ActionPrompt delivers
    // the real outcome through prompt.resolveToolCall.
    // No await_roll here: the resolved payload states the outcome
    // (rolled/cancelled) and the timeout payload sets its own flag.
    const responseBase = {
        success: true,
        prompt: { ...prompt },
        appliedStoryModifiers: modifierApplication.applied,
    };
    // ou-m11 — porté par le prompt : si le joueur ANNULE le jet,
    // GameSession rembourse ces modificateurs (ils étaient
    // consommés dès la création du prompt, avant tout lancer).
    (prompt as any).appliedStoryModifiers = modifierApplication.applied;
    const held = holdForRollResolution(prompt, responseBase);
    store.setActivePrompt(prompt);
    campaignEventLog.append('ROLL_REQUESTED', `Roll requested: ${prompt.name}`, { ...prompt, resolveToolCall: undefined });
    return await held;
}

export async function start_combat(_args: any, ctx: ToolContext) {
    const { d, store, logNewPlayerInitiative, scheduleCombatImageOnce } = ctx;
    const character = store.character;
    if (!character) return { success: false, error: 'No character loaded' };
    // GARDE PAR ÉTAT (audit 2026-08-24, B4). Trace du 23/08 à
    // 20:09:32-35 : deux start_combat à une seconde d'intervalle,
    // puis six add_enemy_init répétés — le roster est passé à
    // douze gobelins et deux Trenn, chaque tour ennemi a été joué
    // deux fois, et la victoire a payé 600 XP au lieu de 300.
    // startEncounter conserve le roster quand le combat est actif
    // (chemin du rechargement de sauvegarde, voulu et testé) : ce
    // n'est donc pas au moteur de refuser, c'est ici.
    if (encounterAlreadyRunning(store.combatState)) {
        return {
            success: false,
            alreadyRunning: true,
            error: 'A combat is ALREADY running — do NOT call start_combat again (it would duplicate the roster and the XP). To bring in more foes, call add_enemy_init on the current fight; to close it, call end_combat.',
        };
    }
    const state = startEncounter(character, store.combatState);
    store.setCombatState(state);
    store.clearCombatRolls();
    campaignEventLog.append('ENCOUNTER_STARTED', 'Combat started', state);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Started]*` }]);
     logNewPlayerInitiative(false, character, state);
     if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
    scheduleCombatImageOnce('hostile forces', store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
    return { success: true };
}

export async function end_combat(args: any, ctx: ToolContext) {
    const { d, store, sysLine, scenePromptOptions, scheduleSceneImage } = ctx;
    // Idempotency guard: maybeEndCombat (GameSession) may have already
    // auto-resolved victory + granted XP. If combat is no longer active,
    // narrate but do NOT grant XP again (was a double-grant / level-up dupe).
    if (!store.combatState.isActive) {
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine('Combat déjà terminé', 'Combat already over')}]*` }]);
        return { success: true, xpAwarded: 0 };
    }
    // ENEMIES only — allies (companion, rescued NPCs) are !isPlayer
    // too and must not inflate the XP clamp base. Les sortis vivants
    // (fuite/reddition) COMPTENT : XP complète, et sans eux un combat
    // où tout le monde a fui n'aurait plus aucun plafond.
    const rosterAtEnd = store.combatState.combatants;
    const departedAtEnd = (store.combatState.departed || []).filter(dpt => !dpt.returned);
    const enemyNames = [
        ...rosterAtEnd.filter(c => combatantSide(c) === 'enemy').map(c => c.name),
        ...departedAtEnd.filter(dpt => dpt.side === 'enemy').map(dpt => dpt.name),
    ];
    const xpAwarded = sanitizeXPGrant(Number(args.xpAwarded || args.xpAmount || 0), enemyNames);
    store.setCombatState((prev: any) => ({ ...prev, isActive: false, combatants: [], currentTurn: '', enemyIntents: {}, departed: [] }));
    if (xpAwarded) {
        d.grantXP(xpAwarded, "Combat victory");
    }
    // Persist ALL persistent allies' HP (Beast Master wolf + recruited
    // companions) — after the XP grant so we build on the freshest char.
    {
        const freshChar = useGameStore.getState().character;
        if (freshChar) {
            const synced = syncCompanionsFromState(freshChar, rosterAtEnd);
            if (synced !== freshChar) d.syncCharacterUpdate(synced);
        }
    }
    campaignEventLog.append('ENCOUNTER_ENDED', `Combat ended. Awarded ${xpAwarded} XP`, { xpAwarded, enemyNames });
    // Chronique de trame — cette porte de sortie (fin narrée par le
    // MJ : fuite du joueur, reddition, négociation) doit AUSSI écrire
    // la ligne combat et vider le chroniqueur, sinon le combat
    // suivant hérite de PV de départ faux.
    try {
        const chron = combatChronicle.take();
        const hero = useGameStore.getState().character;
        appendCampaignLog('combat', formatCombatChronicleLine({
            heroName: hero?.name || 'Hero',
            hpCurrent: hero?.hp.current ?? 0,
            hpMax: hero?.hp.max ?? 0,
            hpStart: chron.active ? chron.hpStart : null,
            foes: describeCombatFoes(rosterAtEnd as any),
            xp: xpAwarded,
            custom: chron.custom,
            outcome: 'narrative',
            departed: describeDeparted(departedAtEnd) || undefined,
        }));
    } catch { /* la chronique ne casse jamais la fin de combat */ }
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Ended. Awarded ${xpAwarded} XP]*` }]);
    if (d.musicDirector) d.musicDirector.handleMusicTag('exploration');
    // Aftermath image: illustrate the resolution of the battle —
    // « fallen foes » seulement s'il en reste ; des fuyards, ça se
    // dessine en silhouettes qui détalent, pas en cadavres.
    {
        const where = store.journal.locations?.slice(-1)?.[0]?.name || 'the battlefield';
        const scene = departedAtEnd.length
            ? `the aftermath of a battle at ${where}: routed foes scattering into the distance, dust settling, the victor catching their breath, dramatic low light`
            : `the aftermath of a battle at ${where}: fallen foes, drifting smoke and dust, the victor catching their breath, dramatic low light`;
        scheduleSceneImage(
            buildSceneImagePrompt(scene, scenePromptOptions()),
            { kind: 'moment_image', phase: 'aftermath', summary: 'Combat aftermath image' }
        );
    }
    return { success: true, xpAwarded };
}

export async function add_enemy_init(args: any, ctx: ToolContext) {
    const { store, name, logInitiativeRoll, logNewPlayerInitiative, scheduleCombatImageOnce } = ctx;
    // État FRAIS : un handler précédent encore en vol (dés 4 s, jet
    // retenu 90 s) peut avoir modifié le combat depuis le snapshot.
    const live = useGameStore.getState();
    const character = live.character;
    const baseState = character ? startEncounter(character, live.combatState) : { ...live.combatState, isActive: true };
    const hadPlayerBefore = live.combatState.combatants.some((c: any) => c.isPlayer);
     // GARDE-FOU DE DIFFICULTÉ (audit 2026-08-21) : budget XP SRD
    // cumulé sur les ennemis VIVANTS + le nouveau venu. Sans lui,
    // rien ne bornait les spawns — un mage niv 1 recevait 4 loups
    // (400 XP ajustés contre un seuil « mortel » de 100). Au-delà
    // de mortel +25 %, l'outil REFUSE avec la marge restante ;
    // force=true réservé aux set-pieces scriptés par la campagne.
    const xpOfEnemy = (name: string, hp?: number): number => {
        const c = getCreature(name);
        if (c?.xp && c.xp > 0) return c.xp;
        // Homebrew hors bestiaire : ~6 XP par PV (loup 11 PV ≈ 66
        // pour 50 réels), plancher 25.
        return Math.max(25, Math.round((hp && hp > 0 ? hp : 15) * 6));
    };
    const livingEnemyXPs = baseState.combatants
        .filter((c: any) => !c.isPlayer && c.hp.current > 0 && (c.side ? c.side === 'enemy' : true))
        .map((c: any) => xpOfEnemy(c.name, c.hp?.max));
    const partySize = 1 + baseState.combatants.filter((c: any) => !c.isPlayer && c.hp.current > 0 && c.side === 'ally').length;
    const newcomerXP = xpOfEnemy(String(args.name || ''), Number(args.hp) || undefined);
    const currentPressure = assessEncounterPressure(livingEnemyXPs, character?.level || 1, partySize);
    const projectedPressure = assessEncounterPressure([...livingEnemyXPs, newcomerXP], character?.level || 1, partySize);
    if (projectedPressure.overCap && args.force !== true) {
        const headroom = Math.max(0, Math.floor(projectedPressure.cap / projectedPressure.multiplier) - currentPressure.baseXP);
        return {
            success: false,
            error: `ENCOUNTER OVER BUDGET — do NOT add "${args.name}". The fight is at ${currentPressure.adjustedXP} adjusted XP and this creature (~${newcomerXP} XP) would push it to ${projectedPressure.adjustedXP}, past the ${projectedPressure.cap} XP cap (SRD deadly threshold ${projectedPressure.deadlyBudget} +25%) for a level ${character?.level || 1} party of ${partySize}. Options: fewer/weaker creatures (headroom ≈ ${headroom} base XP), send reinforcements only AFTER enemies fall, or keep the extras as narrative pressure (they circle, they wait). Only if the CAMPAIGN explicitly scripts this fight as an intended set-piece, retry with force=true.`,
        };
    }
     // OU3 — le niveau du groupe alimente le défaut de PV des
    // ennemis homebrew (hp omis ≠ 1 PV).
    const { state: added, combatant } = addEnemyToEncounter(baseState, { ...args, partyLevel: character?.level });
    // Un fuyard qui REVIENT (même nom) : marquer son entrée `departed`
    // pour ne pas le compter deux fois (XP, bilan de victoire, tracker).
    const returning = (added.departed || []).find(dpt => !dpt.returned && dpt.name.toLowerCase() === combatant.name.toLowerCase());
    const state = returning
        ? { ...added, departed: (added.departed || []).map(dpt => dpt === returning ? { ...dpt, returned: true } : dpt) }
        : added;
    store.setCombatState(state);
    campaignEventLog.append('COMBATANT_ADDED', `Added ${combatant.name} to initiative${returning ? ' (back after having ' + returning.reason + ')' : ''}`, combatant);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Added ${combatant.name} to Initiative (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);
     logNewPlayerInitiative(hadPlayerBefore, character, state);
     // Log enemy initiative to DiceTray
    const creature = getCreature(combatant.name);
    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
    logInitiativeRoll(combatant.name, combatant.initiative, dexMod, true);
     scheduleCombatImageOnce(combatant.name, live.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
    // Jauge remontée au MJ dès que la rencontre passe « mortel » —
    // il calibre la suite (pas de renfort, issue de repli...).
    const pressureWarning = projectedPressure.adjustedXP > projectedPressure.deadlyBudget
        ? `CAUTION: the encounter is now DEADLY-tier (${projectedPressure.adjustedXP}/${projectedPressure.deadlyBudget} adjusted XP for this party). No more reinforcements; keep escape and clever play viable.`
        : undefined;
    return {
        success: true,
        initiative: combatant.initiative,
        combatant,
        ...(pressureWarning ? { warning: pressureWarning } : {}),
        ...(returning ? { note: `${combatant.name} had ${returning.reason} earlier in this fight and is now BACK in the initiative.` } : {}),
    };
}

export async function add_ally_init(args: any, ctx: ToolContext) {
    const { store, logInitiativeRoll, logNewPlayerInitiative } = ctx;
    const live = useGameStore.getState();
    const character = live.character;
    const baseState = character ? startEncounter(character, live.combatState) : { ...live.combatState, isActive: true };
    const hadPlayerBefore = live.combatState.combatants.some((c: any) => c.isPlayer);
     const { state, combatant } = addAllyToEncounter(baseState, args, character?.level || 1);
    store.setCombatState(state);
    campaignEventLog.append('COMBATANT_ADDED', `Added ally ${combatant.name} to initiative`, combatant);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${combatant.name} joined as an ALLY (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);
     logNewPlayerInitiative(hadPlayerBefore, character, state);
     const creature = getCreature(combatant.name);
    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
    logInitiativeRoll(`${combatant.name} (ally)`, combatant.initiative, dexMod, true);
     return { success: true, initiative: combatant.initiative, combatant };
}

export async function update_character_hp(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const nextHp = Number(args.hp);
    if (!Number.isFinite(nextHp)) return { success: false, error: 'Invalid hp value' };
    const char = applyCharacterHP(store.character, nextHp);
    const diff = char.hp.current - store.character.hp.current;
    if (store.combatState.isActive) {
        store.setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) =>
                c.isPlayer ? { ...c, hp: { current: char.hp.current, max: char.hp.max } } : c
            )
        }));
    }
    d.syncCharacterUpdate(char);
    if (diff < 0) {
        d.syncCharacterCritical(char, `Took ${Math.abs(diff)} damage`);
    }
    campaignEventLog.append('HP_CHANGED', `${char.name} HP is now ${char.hp.current}/${char.hp.max}`, {
        target: char.name,
        hp: char.hp,
        delta: diff,
    });
    return { success: true, current_hp: char.hp.current };
}

export async function update_enemy_hp(args: any, ctx: ToolContext) {
    const { store, departedHint } = ctx;
    const enemyHp = Number(args.hp);
    if (!Number.isFinite(enemyHp)) return { success: false, error: 'Invalid hp value' };
    const { state, found, enemy, ambiguous } = updateEnemyHP(store.combatState, String(args.id || args.name), enemyHp);
    if (found && enemy) {
        store.setCombatState(state);
        campaignEventLog.append('HP_CHANGED', `${enemy.name} HP is now ${enemy.hp.current}/${enemy.hp.max}`, {
            target: enemy.name,
            targetId: enemy.id,
            hp: enemy.hp,
        });
        // 0 PV = À TERRE (mort ou mourant) — jamais « en fuite » :
        // la fuite ne passe plus par les PV (enemy_leaves_combat).
        const isDown = enemy.hp.current <= 0;
        return {
            success: true,
            current_hp: enemy.hp.current,
            is_down: isDown,
            targetId: enemy.id,
            ...(isDown ? { note: `${enemy.name} is DOWN (dead or dying). If you meant that it flees or surrenders, it is ALIVE: undo with update_enemy_hp and call enemy_leaves_combat instead.` } : {}),
        };
    }
    if (ambiguous) return { success: false, error: "Ambiguous enemy name. Use the combatant id from the combat tracker/tool result." };
    return { success: false, error: departedHint(String(args.id || args.name)) || "Enemy not found or already dead" };
}

export async function enemy_leaves_combat(args: any, ctx: ToolContext) {
    const { d, store, sysLine, outcomeReport } = ctx;
    // Un ennemi VIVANT quitte le combat sans mourir (reddition,
    // retraite, rappel). Il sort du roster avec ses PV — vivant pour
    // le moteur, le tracker, l'XP, la chronique ET le MJ.
    if (!store.combatState.isActive) return { success: false, error: 'No active combat' };
    const ref = String(args.target || args.enemy || args.name || '').trim();
    if (!ref) return { success: false, error: 'enemy_leaves_combat requires a target' };
    const reason: DepartedReason = String(args.reason || 'fled').toLowerCase().startsWith('surr') ? 'surrendered' : 'fled';
    const live = useGameStore.getState().combatState;
    const result = withdrawCombatant(live, ref, reason);
    if (result.alreadyDeparted && result.departed) {
        return { success: true, alreadyLeft: true, name: result.departed.name, reason: result.departed.reason, alive: true, note: `${result.departed.displayName || result.departed.name} had already left the fight (${result.departed.reason}) — alive.` };
    }
    if (!result.found || !result.combatant) {
        return {
            success: false,
            error: result.ambiguous
                ? 'Ambiguous enemy. Use the combatant id.'
                : (result.error || 'Enemy not found. Only a LIVING enemy can leave the fight — a downed one (0 HP) is dead or dying, and the player/allies never go through this tool.'),
        };
    }
    let committed: any = result.state;
    const broken = concentrationBreakOnDeparture(result.combatant);
    if (broken) {
        const released = releaseNpcConcentrationEffect(committed, useGameStore.getState().character, broken);
        committed = released.state;
        if (released.removedFromPlayer && released.character) d.syncCharacterCritical(released.character, 'hp');
    }
    store.setCombatState(committed);
    const who = result.departed?.displayName || result.combatant.name;
    campaignEventLog.append('COMBATANT_LEFT', `${who} ${reason === 'surrendered' ? 'surrendered' : 'fled the battle'} (DM) — alive`, { ...(result.departed || {}), reason } as any);
    store.setTranscript(prev => [...prev, {
        speaker: 'dm',
        text: `*[SYSTEM: ${reason === 'surrendered'
            ? sysLine(`${who} se rend — hors combat, vivant.`, `${who} surrenders — out of the fight, alive.`)
            : sysLine(`${who} quitte le combat — hors combat, vivant.`, `${who} leaves the fight — out of reach, alive.`)}]*`,
    }]);
    return {
        success: true,
        name: result.combatant.name,
        targetId: result.combatant.id,
        reason,
        alive: true,
        hp: result.combatant.hp,
        note: reason === 'surrendered'
            ? `${who} has SURRENDERED: alive, disarmed, at the hero's mercy — play the scene (prisoner, bargain, mercy or execution as a deliberate CHOICE of the player, never as a combat kill).`
            : `${who} has LEFT the fight ALIVE with ${result.combatant.hp.current}/${result.combatant.hp.max} HP. It may return later.`,
        ...outcomeReport(committed),
    };
}

export async function set_enemy_target(args: any, ctx: ToolContext) {
    const { store, departedHint } = ctx;
    // Hybrid targeting: record an MJ standing intent (enemy id -> hero id).
    // Validate both ends so a bad reference can't poison the turn loop;
    // runNPCTurn re-validates each turn and falls back to wounded-prey.
    const enemyRef = resolveCombatantReference(store.combatState, String(args.enemy), { enemyOnly: true, livingOnly: true });
    if (!enemyRef.combatant || enemyRef.ambiguous) {
        return { success: false, error: enemyRef.ambiguous ? 'Ambiguous enemy. Use combatant id.' : (departedHint(String(args.enemy)) || 'Enemy not found') };
    }
    const targetRef = resolveCombatantReference(store.combatState, String(args.target), { livingOnly: true });
    const targetIsHero = targetRef.combatant && (targetRef.combatant.side ? targetRef.combatant.side !== 'enemy' : targetRef.combatant.isPlayer);
    if (!targetRef.combatant || targetRef.ambiguous || !targetIsHero) {
        return { success: false, error: targetRef.ambiguous ? 'Ambiguous target. Use combatant id.' : 'Target must be the player or an ally.' };
    }
    store.setCombatState((prev: any) => ({
        ...prev,
        enemyIntents: { ...(prev.enemyIntents || {}), [enemyRef.combatant!.id]: targetRef.combatant!.id },
    }));
    campaignEventLog.append('COMBAT_TURN_ADVANCED', `${enemyRef.combatant.name} now focuses ${targetRef.combatant.name}`, {
        enemy: enemyRef.combatant.id,
        target: targetRef.combatant.id,
    });
    return { success: true, enemy: enemyRef.combatant.name, target: targetRef.combatant.name };
}

export async function resolve_attack(args: any, ctx: ToolContext) {
    const { d, deps, store, runMoraleCheck, moraleReport, outcomeReport, handleConcentrationAfterDamage, optionalBoolean } = ctx;
    // Anti double-resolution guard: during a TRACKED combat the
    // engine itself resolves every ENEMY action (runNPCTurn) and
    // only asks the DM to NARRATE. The old guard checked
    // isNPCTurn — but the "narrate the enemy turn" report goes
    // out AFTER the engine advanced to the player's turn, so a
    // disobedient re-resolution slipped through exactly in the
    // common single-enemy case (double damage, and the player's
    // own Bless/inspiration boosting the attack that hit them).
    const atkRef = resolveCombatantReference(store.combatState, String(args.attacker), { autoResolve: true });
    const atkSide = atkRef.combatant ? combatantSide(atkRef.combatant) : 'enemy';
    if (store.combatState.isActive && atkSide === 'enemy') {
        return { success: true, narrateOnly: true, note: 'Enemy actions are resolved by the engine on their own turns — narrate only, never re-resolve. For scripted out-of-turn harm use environmental_damage or apply_damage.' };
    }
    const baseAttackBonus = Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : undefined;
    const attackPrompt = normalizeRollPrompt({
        reason: `${args.attacker} attacks ${args.target}`,
        formula: `1d20${(baseAttackBonus || 0) >= 0 ? '+' : ''}${baseAttackBonus || 0}`,
        dc: 10,
        advantage: args.advantage,
    });
    // Story modifiers are the PLAYER's boons — only their own
    // attacks may consume them (an ally's or scripted attack
    // must not eat the hero's inspiration).
    const modifierApplication = atkRef.combatant?.isPlayer
        ? applyStoryModifiersToPrompt(attackPrompt, store.character?.storyModifiers || [])
        : { prompt: attackPrompt, applied: [] as any[], remaining: store.character?.storyModifiers || [] };
    if (store.character && modifierApplication.applied.length) {
        d.syncCharacterCritical({
            ...store.character,
            storyModifiers: modifierApplication.remaining,
        }, 'hp');
        campaignEventLog.append('ROLL_REQUESTED', `Story modifier applied to attack: ${args.attacker} vs ${args.target}`, {
            applied: modifierApplication.applied,
            remaining: modifierApplication.remaining,
        });
    }
    // Attaque VOCALE du joueur : consommer un PIP vert (comme un clic)
    // au lieu du booléen 'action' — sinon le HUD et l'Extra Attack se
    // désynchronisaient dès que le joueur attaquait à la voix.
    const isPlayerAttacker = Boolean(atkRef.combatant?.isPlayer);
    // GARDE ANTI-CONTOURNEMENT (audit 2026-08-21, même patron que
    // propose_player_action) : un VRAI sort du grimoire « résolu en
    // attaque » court-circuitait emplacements, concentration et DD
    // réel — resolve_attack acceptait n'importe quel damageFormula.
    if (isPlayerAttacker && args.attackName) {
        const liveChar = useGameStore.getState().character;
        const ownSpells = [
            ...(liveChar?.cantrips || []),
            ...(liveChar?.knownSpells || []),
            ...(liveChar?.preparedSpells || []),
        ];
        const wantedAtk = foldText(String(args.attackName));
        const codexSpell = lookupSpell(String(args.attackName));
        const spellMatch = ownSpells.find(s => foldText(s) === wantedAtk)
            || (codexSpell && ownSpells.find(s => foldText(s) === foldText(codexSpell.name)) ? codexSpell.name : undefined);
        if (spellMatch) {
            return {
                success: false,
                error: `"${args.attackName}" is a REAL spell in the player's spellbook. Do NOT resolve it as a weapon attack — call cast_spell (slots, concentration and the real save DC apply).`,
            };
        }
    }
    if (isPlayerAttacker && store.combatState.isActive) {
        const econ: any = store.combatState.actionEconomy?.['player'] || {};
        const attacksMax = econ.attacksMax ?? 1;
        const attacksUsed = econ.attacksUsed ?? 0;
        if (attacksUsed >= attacksMax) {
            return { success: false, error: 'No attack left this turn — the player already spent their action. They can end their turn with the on-screen button.' };
        }
    }
    // Attaque à la VOIX avec une arme NOMMÉE (« je tire à l'arc ») :
    // si le nom matche une arme ÉQUIPÉE (slot distance compris), le
    // moteur juge cette arme-là — sinon l'arc était traité comme
    // l'épée de la main directrice (mêlée, mauvais bonus, engage).
    let attackCharacter = store.character || undefined;
    if (isPlayerAttacker && store.character && args.attackName) {
        const awNorm = foldText;
        const wanted = awNorm(String(args.attackName));
        const match = (store.character.inventory || []).find(i =>
            i.type === 'weapon' && i.equipped
            && (awNorm(i.name).includes(wanted) || wanted.includes(awNorm(i.name))));
        if (match) {
            const structured = structureInventoryItem(match);
            const props = structured.properties || match.properties || [];
            const isRangedW = Boolean(structured.range || match.range)
                || /bow|crossbow|sling|\barc\b|arbal[eè]te|fronde/i.test(match.name);
            attackCharacter = {
                ...store.character,
                weapon: {
                    name: match.name,
                    damage: structured.damageDice || match.damageDice || '1d4',
                    damageType: String(structured.damageType || match.damageType || 'bludgeoning'),
                    abilityMod: isRangedW ? 'DEX' : 'STR',
                    attackBonus: 0,
                    magicBonus: 0,
                    properties: props,
                    range: structured.range || match.range,
                    reach: isRangedW ? 30 : 5,
                } as any,
            };
        }
    }
    const result = resolveAttackAction(store.combatState, {
        attacker: String(args.attacker),
        target: String(args.target),
        attackName: args.attackName ? String(args.attackName) : undefined,
        attackBonus: baseAttackBonus,
        // OU4 — le dmBonus des story modifiers (déjà consommés et
        // persistés ci-dessus) passe par un canal séparé : il
        // s'applique AUSSI quand attackBonus est omis et que le
        // moteur calcule lui-même le bonus (le cas recommandé).
        flatBonusModifier: modifierApplication.prompt.dmBonus || 0,
        damageFormula: args.damageFormula,
        damageType: args.damageType,
        advantage: modifierApplication.prompt.advantage,
        targetCoverBonus: Number.isFinite(Number(args.targetCoverBonus ?? args.coverBonus)) ? Number(args.targetCoverBonus ?? args.coverBonus) : undefined,
        isMeleeAttack: optionalBoolean(args.isMeleeAttack),
        consumeAction: !isPlayerAttacker,
    }, attackCharacter);
     if (result.success && (result as any).advanced) {
        // Trop loin pour la mêlée : l'attaque est devenue un
        // rapprochement (far → near). Pip/action déjà consommé.
        store.setCombatState(result.state);
        if (isPlayerAttacker) {
            const econ: any = result.state.actionEconomy?.['player'] || {};
            const nextUsed = (econ.attacksUsed ?? 0) + 1;
            store.setCombatState({
                ...result.state,
                actionEconomy: {
                    ...(result.state.actionEconomy || {}),
                    player: { ...econ, attacksUsed: nextUsed, actionUsed: nextUsed >= (econ.attacksMax ?? 1) },
                },
            });
        }
        const adv = (result as any).advanced;
        const advLine = useGameStore.getState().language !== 'en'
            ? `${adv.name} se rapproche (loin → proche).`
            : `${adv.name} closes the distance (far → near).`;
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${advLine}]*` }]);
        return {
            success: true,
            advanced: adv,
            instruction: `${adv.name} was too far for melee and CLOSED THE DISTANCE instead (${adv.from} → ${adv.to}). No attack roll happened — narrate the advance; the strike can land next action.`,
        };
    }
    if (!result.success || !result.resolution) {
        return { success: false, error: result.error || 'Attack failed' };
    }
    if (isPlayerAttacker && store.combatState.isActive) {
        // Dépense le pip sur l'état FRAIS résolu (mêmes booléens dérivés
        // que patchPlayerEconomy côté UI).
        const econ: any = result.state.actionEconomy?.['player'] || {};
        const nextUsed = (econ.attacksUsed ?? 0) + 1;
        const nextEcon = {
            ...econ,
            attacksUsed: nextUsed,
            actionUsed: nextUsed >= (econ.attacksMax ?? 1),
            bonusActionUsed: (econ.bonusUsed ?? 0) >= (econ.bonusMax ?? 1),
        };
        result.state = { ...result.state, actionEconomy: { ...(result.state.actionEconomy || {}), player: nextEcon } };
    }
     // Commit AVANT les animations de dés : plus aucune écriture
    // d'état de combat après un await dans ce handler (un tour de
    // PNJ concurrent pendant les ~8-12 s d'animation était écrasé).
    store.setCombatState(result.state);
     const isPlayer = Boolean(result.state.combatants.find(c => c.name === result.resolution?.attacker || c.id === args.attacker)?.isPlayer);
     // Show the visual roll for the attack
    store.setCurrentRoll({
        result: result.resolution.attackRoll.total,
        reason: `${result.resolution.attacker} attack vs ${result.resolution.target}: ${result.resolution.hit ? 'HIT!' : 'MISS'}`,
        isDM: !isPlayer,
        success: result.resolution.hit
    });
     // Log attack to DiceTray
    deps.diceTrayRef.current?.addLog({
        type: 'attack',
        name: `${result.resolution.attacker}: ${args.attackName || 'Attack'}`,
        total: result.resolution.attackRoll.total,
        formula: `d20 (${result.resolution.attackRoll.die}) + ${result.resolution.attackRoll.modifier} = ${result.resolution.attackRoll.total} vs AC ${result.resolution.attackRoll.prompt.dc}`,
        isDM: !isPlayer,
        success: result.resolution.hit
    });
     // Wait 4 seconds for the attack roll animation to finish
    await waitDice();
     if (result.resolution.hit && result.resolution.damage > 0) {
        // Show the visual roll for the damage
        store.setCurrentRoll({
            result: result.resolution.damage,
            reason: `${result.resolution.attacker} damage roll: ${result.resolution.damage} ${result.resolution.damageType}`,
            isDM: !isPlayer
        });
         // Log damage to DiceTray — parts élémentaires séparées
        // (« 8 slashing + 4 fire = 12 »), résistances visibles.
        deps.diceTrayRef.current?.addLog({
            type: 'damage',
            name: `${result.resolution.attacker}: ${args.attackName || 'Attack'} damage`,
            total: result.resolution.damage,
            formula: formatDamageParts(result.resolution),
            isDM: !isPlayer
        });
         // Wait another 4 seconds for the damage roll animation
        await waitDice();
    }
     // --- MORALE CHECK FOR DAMAGED NPC --- (helper partagé, état frais)
    const morale = await runMoraleCheck(String(args.target));
     const playerTarget = morale.state.combatants.find((c: any) => c.isPlayer && (c.name === result.resolution!.target || c.id === result.resolution!.target));
    // ou-m9 — fiche FRAÎCHE : les animations de dés (~8-12 s)
    // rendent le snapshot `store` du début du handler périmé —
    // un tour de PNJ concurrent aurait été écrasé.
    const liveCharAfterDice = useGameStore.getState().character;
    if (playerTarget && liveCharAfterDice) {
        let char = {
            ...liveCharAfterDice,
            tempHP: playerTarget.tempHP || 0,
            hp: { ...liveCharAfterDice.hp, current: playerTarget.hp.current }
        };
        // RAW — être touché À TERRE = échec de jet de mort auto (2 si crit).
        if (liveCharAfterDice.hp.current <= 0 && result.resolution.hit && result.resolution.damage > 0) {
            char = applyDownedDamagePenalty(char, Boolean(result.resolution.criticalHit));
        }
        d.syncCharacterCritical(char, 'hp');
        handleConcentrationAfterDamage(char, result.resolution.damage);
    }
     campaignEventLog.append('HP_CHANGED', result.resolution.log.text, result.resolution);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${result.resolution!.log.text}]*` }]);
     return {
        success: true,
        hit: result.resolution.hit,
        criticalHit: result.resolution.criticalHit,
        attackTotal: result.resolution.attackRoll.total,
        damage: result.resolution.damage,
        targetHP: result.resolution.targetHP,
        ...moraleReport(morale),
        ...outcomeReport(morale.state),
    };
}

export async function apply_damage(args: any, ctx: ToolContext) {
    const { d, store, sysLine, runMoraleCheck, moraleReport, outcomeReport, departedHint, handleConcentrationAfterDamage } = ctx;
    const target = String(args.target || args.name || '').trim();
    const amount = Math.max(0, Math.trunc(Number(args.amount ?? args.damage ?? 0)));
    if (!target) return { success: false, error: 'apply_damage requires a target' };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'apply_damage requires a positive amount' };
     // Surface DM-driven damage (narrative enemy hits, traps, hazards) in the
    // combat "Jets" journal + audit console. Logged ONLY once the damage
    // actually lands (calls below) — logging up-front showed a phantom roll
    // even when the target didn't exist and nothing was applied.
    const logDamage = (resolvedName: string) => {
        store.pushCombatRoll({ name: `${resolvedName} : dégâts`, total: amount, formula: String(args.damageType || ''), isDM: true });
        auditBus.publish('combat', `apply_damage → ${resolvedName}: ${amount} ${args.damageType || ''}`, { target: resolvedName, amount, damageType: args.damageType });
    };
     const isPlayerTarget = store.character && (
        target.toLowerCase() === 'player' ||
        target.toLowerCase() === store.character.name.toLowerCase()
    );
    
    if (!store.combatState.isActive && isPlayerTarget) {
        // Shared helper: racial/draconic/feat resistances + temp HP
        // now apply OUT of combat too (a Dwarf poisoned at the
        // tavern used to take it full).
        const outOfCombat = applyDamageToCharacter(store.character!, amount, args.damageType ? String(args.damageType) : undefined);
        const updatedChar = outOfCombat.character;
        d.syncCharacterCritical(updatedChar, 'hp');
        logDamage(updatedChar.name);
        campaignEventLog.append('HP_CHANGED', `${updatedChar.name} took ${outOfCombat.amountApplied} damage (out of combat${outOfCombat.mitigation !== 'normal' ? `, ${outOfCombat.mitigation}` : ''})`, {
            target: updatedChar.name,
            amount,
            amountApplied: outOfCombat.amountApplied,
            mitigation: outOfCombat.mitigation,
            hp: updatedChar.hp,
            tempHP: updatedChar.tempHP
        });
        // Concentration is at risk out of combat too.
        handleConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied, 'concentration save (out of combat)');
        return { success: true, target: updatedChar.name, hp: updatedChar.hp, tempHP: updatedChar.tempHP, amountApplied: outOfCombat.amountApplied, mitigation: outOfCombat.mitigation };
    }
     const applied = applyDamageToEncounter(store.combatState, target, amount, args.damageType);
    if (!applied.found || !applied.target) {
        return { success: false, error: applied.ambiguous ? 'Ambiguous target. Use combatant id.' : (departedHint(target) || 'Target not found') };
    }
    logDamage(applied.target.name);
     // Commit sync des dégâts AVANT le test de moral (dont l'animation
    // attend 4 s) : plus d'écriture d'état de combat après un await.
    store.setCombatState(applied.state);
     // Concentration d'un PNJ lanceur brisée par ces dégâts : lever
    // l'effet lié (sur le héros et/ou un combattant) + l'annoncer.
    if (applied.npcConcentrationBroken) {
        const broken = applied.npcConcentrationBroken;
        const released = releaseNpcConcentrationEffect(applied.state, useGameStore.getState().character, broken);
        store.setCombatState(released.state);
        if (released.removedFromPlayer && released.character) {
            d.syncCharacterCritical(released.character, 'hp');
        }
        const concLine = broken.downed
            ? sysLine(`${broken.casterName} tombe — sa concentration sur ${broken.effectName} est perdue.`,
                      `${broken.casterName} goes down — concentration on ${broken.effectName} is lost.`)
            : sysLine(`${broken.casterName} rate sa sauvegarde de concentration (${broken.roll} vs DD ${broken.dc}) : ${broken.effectName} prend fin.`,
                      `${broken.casterName} fails the concentration save (${broken.roll} vs DC ${broken.dc}): ${broken.effectName} ends.`);
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${concLine}]*` }]);
        campaignEventLog.append('EFFECT_ADDED', `NPC concentration broken: ${broken.effectName}`, broken as any);
    }
     // --- MORALE CHECK FOR DAMAGED NPC --- (helper partagé, état frais)
    // Le retour n'est plus jeté : le MJ doit apprendre la fuite, et
    // l'issue du combat (dernier ennemi parti) doit lui parvenir.
    const moraleAfterDamage = await runMoraleCheck(String(args.target || args.name));
     // Fiche FRAÎCHE après l'animation : l'ancien code repartait du
    // snapshot du début de handler et écrasait tout changement
    // concurrent de PV/inventaire survenu pendant l'attente.
    const liveCharAfterMorale = useGameStore.getState().character;
    if (applied.target.isPlayer && liveCharAfterMorale) {
        let char = {
            ...liveCharAfterMorale,
            tempHP: applied.target.tempHP || 0,
            hp: { ...liveCharAfterMorale.hp, current: applied.target.hp.current }
        };
        // RAW — dégâts subis à 0 PV = échec de jet de mort automatique.
        if (liveCharAfterMorale.hp.current <= 0 && (applied.amountApplied || 0) > 0) {
            char = applyDownedDamagePenalty(char);
        }
        d.syncCharacterCritical(char, 'hp');
        handleConcentrationAfterDamage(char, applied.amountApplied || 0);
    }
     campaignEventLog.append('HP_CHANGED', `${applied.target.name} took ${amount} damage`, {
        target: applied.target.name,
        amount,
        amountApplied: applied.amountApplied,
        mitigation: applied.mitigation,
        damageType: args.damageType,
        hp: applied.target.hp,
        tempHP: applied.target.tempHP
    });
    return {
        success: true,
        target: applied.target.name,
        targetId: applied.target.id,
        hp: applied.target.hp,
        tempHP: applied.target.tempHP,
        amountApplied: applied.amountApplied,
        mitigation: applied.mitigation,
        ...moraleReport(moraleAfterDamage),
        ...outcomeReport(moraleAfterDamage.state),
    };
}

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
        store.setCurrentRoll({ result: amount, reason: `${hazard} — ${amount} dégâts ${damageType || ''}`, isDM: true });
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

export async function advance_turn(_args: any, ctx: ToolContext) {
    const { store } = ctx;
    const next = advanceTurn(store.combatState);
    store.setCombatState(next);
    const current = next.combatants.find(c => c.id === next.currentTurn || c.name === next.currentTurn);
    campaignEventLog.append('COMBAT_TURN_ADVANCED', `Combat turn advanced to ${current?.name || next.currentTurn}`, {
        currentTurn: next.currentTurn,
        currentTurnName: current?.name,
        round: next.round,
    });
    return { success: true, currentTurn: next.currentTurn, currentTurnName: current?.name, round: next.round };
}

export async function propose_player_action(args: any, ctx: ToolContext) {
    const { store } = ctx;
    // The DM authors a custom action card; we ONLY store it. The
    // player confirms it on screen and GameSession's generic
    // resolver runs the real dice. We never resolve or advance here.
    if (!store.combatState.isActive) return { success: false, error: 'No active combat to propose an action in.' };
    const label = stringArg(args.label, 80);
    const resolution = String(args.resolution || '').toLowerCase();
    if (!label || !['attack', 'save', 'check', 'auto', 'effect'].includes(resolution)) {
        return { success: false, error: "propose_player_action needs a label and resolution in {attack,save,check,auto,effect}." };
    }
    // GARDE ANTI-CONTOURNEMENT (2026-08-13) : un VRAI sort du
    // grimoire du joueur proposé en carte improvisée court-circuitait
    // les emplacements, la concentration et le DD réel. Refus net.
    {
        const liveChar = useGameStore.getState().character;
        const ownSpells = [
            ...(liveChar?.cantrips || []),
            ...(liveChar?.knownSpells || []),
            ...(liveChar?.preparedSpells || []),
        ];
        const labelFolded = foldText(label);
        const matched = ownSpells.find(s => foldText(s) === labelFolded)
            || (lookupSpell(label) && ownSpells.find(s => foldText(s) === foldText(lookupSpell(label)!.name)) ? lookupSpell(label)!.name : undefined);
        if (matched) {
            return {
                success: false,
                error: `"${label}" is a REAL spell in the player's spellbook. Do NOT route it through an improvised card — call cast_spell (slots, concentration and the real DC apply). Improvised cards are for stunts the rules don't cover.`,
            };
        }
    }
    const costRaw = String(args.cost || 'action').toLowerCase().replace(/\s+/g, '_');
    const cost = ['action', 'bonus_action', 'free', 'reaction'].includes(costRaw) ? costRaw : 'action';
    const upper = (v: unknown) => {
        const s = String(v || '').toUpperCase();
        return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(s) ? s : undefined;
    };
    const hasModifier = args.modifierBonus !== undefined || args.modifierMode !== undefined;
    // Malus CHIFFRÉ sur la CIBLE (« sable dans les yeux : -2 à ses
    // attaques 2 rounds ») — appliqué au succès de la carte.
    const hasTargetEffect = args.targetEffectStat !== undefined && args.targetEffectBonus !== undefined;
    const proposed = {
        id: crypto.randomUUID(),
        label,
        description: args.description ? stringArg(args.description, 200) : undefined,
        cost: cost as any,
        resolution: resolution as any,
        target: args.target ? stringArg(args.target, 160) : undefined,
        attackBonus: Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : undefined,
        dc: Number.isFinite(Number(args.dc)) ? Number(args.dc) : undefined,
        advantage: ['advantage', 'disadvantage', 'normal'].includes(String(args.advantage)) ? String(args.advantage) as any : undefined,
        saveAbility: upper(args.saveAbility) as any,
        checkAbility: upper(args.checkAbility) as any,
        damageFormula: args.damageFormula ? stringArg(args.damageFormula, 30) : undefined,
        damageType: args.damageType ? stringArg(args.damageType, 30) : undefined,
        condition: args.condition ? stringArg(args.condition, 40) : undefined,
        selfModifier: hasModifier ? {
            mode: args.modifierMode ? String(args.modifierMode).toLowerCase() : 'normal',
            bonus: Number.isFinite(Number(args.modifierBonus)) ? Number(args.modifierBonus) : 0,
            scope: args.modifierScope ? String(args.modifierScope).toLowerCase() : 'attack',
            uses: Number.isFinite(Number(args.modifierUses)) ? Math.max(1, Number(args.modifierUses)) : 1,
        } : undefined,
        targetEffect: hasTargetEffect ? {
            stat: String(args.targetEffectStat || 'attackBonus'),
            bonus: Math.max(-10, Math.min(10, Number(args.targetEffectBonus) || 0)),
            rounds: Math.max(1, Math.min(20, Number(args.targetEffectRounds) || 2)),
        } : undefined,
        createdAt: Date.now(),
    };
    useGameStore.getState().addProposedAction(proposed);
    campaignEventLog.append('SCENE_CHANGED', `Improvised action proposed: ${label}`, proposed);
    return { success: true, proposed: label, instruction: 'Action card shown to the player. Briefly narrate the set-up, then wait — the player will trigger it and you will get a [SYSTEM] result to narrate.' };
}

export async function grant_player_action(args: any, ctx: ToolContext) {
    const { store } = ctx;
    // Add an extra action pip to the player's HUD for this turn
    // (Action Surge / Haste / a rewarded heroic surge). Resets next turn.
    if (!store.combatState.isActive) return { success: false, error: 'No active combat' };
    const kind = String(args.kind || 'action').toLowerCase().includes('bonus') ? 'bonus' : 'action';
    const count = Math.max(1, Math.min(4, Number(args.count) || 1));
    store.setCombatState((prev: any) => {
        const econ = prev.actionEconomy?.['player'] || {};
        const next: any = { ...econ };
        if (kind === 'action') {
            next.attacksMax = (econ.attacksMax ?? 1) + count;
            next.actionUsed = (next.attacksUsed ?? 0) >= next.attacksMax;
        } else {
            next.bonusMax = (econ.bonusMax ?? 1) + count;
            next.bonusActionUsed = (next.bonusUsed ?? 0) >= next.bonusMax;
        }
        return { ...prev, actionEconomy: { ...(prev.actionEconomy || {}), player: next } };
    });
    const label = kind === 'action' ? `${count} action${count > 1 ? 's' : ''} principale${count > 1 ? 's' : ''}` : `${count} action${count > 1 ? 's' : ''} bonus`;
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ +${label} accordée${count > 1 ? 's' : ''} ce tour${args.reason ? ` (${stringArg(args.reason, 60)})` : ''}]*` }]);
    campaignEventLog.append('EFFECT_ADDED', `Granted player ${kind} x${count}`, { kind, count, reason: args.reason });
    return { success: true, kind, count };
}

export async function cast_spell(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    // OU5 — même contrat que request_roll : un seul jet à l'écran.
    // Un cast pendant un jet en attente écrasait le prompt retenu
    // et gelait le MJ jusqu'au timeout de 90 s.
    if (useGameStore.getState().activePrompt) {
        return { success: false, error: 'A roll is already pending on screen. Wait for its result before casting a spell that needs a roll.' };
    }
    const spellName = String(args.spellName || args.name || '').trim();
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
            store.pushCombatRoll({ name: `${spellName} → ${victim.name}`, total: result.healing, formula: result.spell?.healing?.dice || 'heal', isDM: true });
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} — ${victim.name} +${result.healing} HP]*` }]);
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
                store.setCurrentRoll({ result: aoe.sharedDamageRoll, reason: `${spellName} — dégâts de zone`, isDM: false });
                await waitDice();
            }
            for (const r of aoe.results) {
                store.pushCombatRoll({ name: `${spellName} → ${r.name}`, total: r.damage, formula: `save ${r.saveTotal} vs DC ${result.prompt.dc}${r.saveSuccess ? ' (réussie)' : ''}`, isDM: true });
            }
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} (zone) — ${aoe.summary}]*` }]);
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
            store.setCurrentRoll({ result: applied.damage, reason: `${spellName} → ${applied.target.name}`, isDM: false });
            await waitDice();
            store.pushCombatRoll({ name: `${spellName} → ${applied.target.name}`, total: applied.damage, formula: result.autoDamage.damageFormula, isDM: false });
            reports.push(`${applied.target.name}: ${applied.damage}`);
        }
        if (reports.length) {
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} — ${reports.join(', ')}]*` }]);
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

export async function apply_condition(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const conditionName = String(args.condition || args.name || '');
    const targetName = stringArg(args.target || args.targetName || '', 120);
    const targetsPlayer = !targetName
        || targetName.toLowerCase() === 'player'
        || targetName.toLowerCase() === store.character.name.toLowerCase();
    // Concentration d'un PNJ lanceur (audit 2026-08-12) : si le MJ
    // fournit concentrationBy, l'effet est LIÉ au lanceur — des
    // dégâts sur lui déclencheront le CON save et lèveront l'effet.
    const linkNpcConcentration = (effectName: string, targetId?: string) => {
        const casterRef = stringArg(args.concentrationBy, 120);
        if (!casterRef) return;
        const live = useGameStore.getState().combatState;
        if (!live.isActive) return;
        const casterLookup = resolveCombatantReference(live, casterRef, { autoResolve: true });
        if (!casterLookup.combatant || casterLookup.combatant.isPlayer) return;
        store.setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.id === casterLookup.combatant!.id
                ? { ...c, concentratingOn: { effectName, targetId } }
                : c),
        }));
    };
    if (store.combatState.isActive && targetName && !targetsPlayer) {
        const appliedToEncounter = applyConditionToEncounter(store.combatState, targetName, conditionName);
        if (!appliedToEncounter.found) {
            return {
                success: false,
                error: appliedToEncounter.ambiguous ? 'Condition target is ambiguous. Use combatant id.' : 'Condition or target not found.',
            };
        }
        store.setCombatState(appliedToEncounter.state);
        linkNpcConcentration(appliedToEncounter.condition?.name || conditionName, appliedToEncounter.target?.id);
        campaignEventLog.append('EFFECT_ADDED', `Condition applied to ${appliedToEncounter.target?.name}: ${appliedToEncounter.condition?.name}`, appliedToEncounter.condition);
        return { success: true, target: appliedToEncounter.target, condition: appliedToEncounter.condition, effect: appliedToEncounter.effect };
    }
     // OU2 — hors combat, une cible non-joueur n'est pas suivie
    // par le moteur : erreur claire au lieu du fallback qui
    // appliquait la condition au HÉROS (« le garde est
    // empoisonné » empoisonnait le joueur).
    if (targetName && !targetsPlayer) {
        return {
            success: false,
            error: `Target "${targetName}" is not a tracked combatant (no active combat). The condition was NOT applied to anyone — track it narratively, or apply it during combat.`,
        };
    }
     const applied = applyConditionToCharacter(store.character, conditionName);
    if (!applied.found) return { success: false, error: 'Condition not found in SRD Codex' };
    d.syncCharacterCritical(applied.character, 'hp');
    // Effet posé sur le HÉROS par un lanceur ennemi qui se concentre.
    linkNpcConcentration(
        applied.condition?.name || conditionName,
        useGameStore.getState().combatState.combatants.find((c: any) => c.isPlayer)?.id
    );
    campaignEventLog.append('EFFECT_ADDED', `Condition applied: ${applied.condition?.name}`, applied.condition);
    return { success: true, condition: applied.condition, effect: applied.effect };
}

export async function remove_condition(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const effectName = String(args.condition || args.effect || args.name || '').trim();
    if (!effectName) return { success: false, error: 'remove_condition requires a condition/effect name' };
    const canonical = lookupCondition(effectName)?.name || effectName;
    const matchesEffect = (e: any) => {
        const n = String(e?.name || '').toLowerCase();
        return n === canonical.toLowerCase() || n === effectName.toLowerCase();
    };
    const rmTargetName = stringArg(args.target || args.targetName || '', 120);
    const rmTargetsPlayer = !rmTargetName
        || rmTargetName.toLowerCase() === 'player'
        || rmTargetName.toLowerCase() === store.character.name.toLowerCase();
     if (store.combatState.isActive && rmTargetName && !rmTargetsPlayer) {
        const lookup = resolveCombatantReference(store.combatState, rmTargetName, { autoResolve: true });
        if (!lookup.combatant) return { success: false, error: 'Target not found in combat.' };
        const row = lookup.combatant;
        if (!(row.activeEffects || []).some(matchesEffect)) {
            return { success: false, error: `${row.name} has no active effect named "${effectName}".` };
        }
        store.setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.id === row.id
                ? { ...c, activeEffects: (c.activeEffects || []).filter((e: any) => !matchesEffect(e)) }
                : c),
        }));
        campaignEventLog.append('EFFECT_ADDED', `Condition removed from ${row.name}: ${canonical}`, { name: canonical });
        return { success: true, target: row.name, removed: canonical };
    }
     // Joueur : fiche + ligne de combat en miroir.
    const liveChar = useGameStore.getState().character!;
    const sheetHad = (liveChar.activeEffects || []).some(matchesEffect);
    const rowHad = store.combatState.isActive
        && ((store.combatState.combatants.find(c => c.isPlayer)?.activeEffects || []) as any[]).some(matchesEffect);
    if (!sheetHad && !rowHad) {
        return { success: false, error: `No active effect named "${effectName}" on the player.` };
    }
    if (sheetHad) {
        d.syncCharacterCritical({
            ...liveChar,
            activeEffects: (liveChar.activeEffects || []).filter(e => !matchesEffect(e)),
        }, 'hp');
    }
    if (rowHad) {
        store.setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.isPlayer
                ? { ...c, activeEffects: ((c.activeEffects || []) as any[]).filter(e => !matchesEffect(e)) }
                : c),
        }));
    }
    campaignEventLog.append('EFFECT_ADDED', `Condition removed from player: ${canonical}`, { name: canonical });
    return { success: true, target: 'player', removed: canonical };
}

export async function build_encounter(args: any, ctx: ToolContext) {
    const { d, store, scheduleCombatImageOnce, optionalBoolean } = ctx;
    const character = store.character;
    const encounter = buildEncounter({
        partyLevel: Number(args.partyLevel || character?.level || 1),
        partySize: Number(args.partySize || 1),
        difficulty: args.difficulty || 'medium',
        biome: args.biome,
        role: args.role,
        theme: args.theme,
        maxMonsters: Number(args.maxMonsters || 4),
    });
     // TP8 (contre-audit) — Gemini envoie des booléens en chaîne (« "false" »
    // est truthy) : le patron optionalBoolean est déjà utilisé sur 4 des 6
    // paramètres BOOLEAN du projet, celui-ci y échappait.
    if (optionalBoolean(args.startNow) === true && character && encounter.monsters.length) {
        let state = startEncounter(character, store.combatState);
        for (const monster of encounter.monsters) {
            const added = addEnemyToEncounter(state, {
                name: monster.name,
                hp: monster.hp,
                ac: monster.ac,
                // Audit 2026-08-21 : le chemin budgété perdait le niveau —
                // les PV par défaut d'un homebrew retombaient au plancher.
                partyLevel: character.level,
            });
            state = added.state;
        }
        store.setCombatState(state);
        if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
        const mainEnemy = encounter.monsters[0]?.name || 'hostile forces';
        scheduleCombatImageOnce(mainEnemy, store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Encounter started from Codex: ${encounter.monsters.map(m => m.name).join(', ')}]*` }]);
    }
     campaignEventLog.append('ENCOUNTER_STARTED', 'Encounter built from SRD Codex and current bestiary', encounter);
    return { success: true, encounter };
}

export async function add_effect(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    // GARDE ANTI-CONTOURNEMENT (audit 2026-08-21) : un sort À NIVEAU
    // du grimoire posé en « effet » sur le joueur (Bénédiction,
    // Bouclier…) esquivait l'emplacement et la concentration. Les
    // effets d'un sort ENNEMI sur le joueur passent, eux, par
    // apply_condition/consorts — et un buff ennemi sur lui-même ne
    // cible pas le joueur, donc pas de faux positif ici.
    {
        const fxName = String(args.name || '').trim();
        const fxTargetRef = String(args.target || '').trim().toLowerCase();
        const fxTargetsPlayer = !fxTargetRef || fxTargetRef === 'player'
            || fxTargetRef === store.character.name.toLowerCase();
        if (fxName && fxTargetsPlayer) {
            const ownLeveled = [
                ...(store.character.knownSpells || []),
                ...(store.character.preparedSpells || []),
            ];
            const fxFolded = foldText(fxName);
            const fxCodex = lookupSpell(fxName);
            const fxSpellMatch = ownLeveled.find(s => foldText(s) === fxFolded)
                || (fxCodex && ownLeveled.find(s => foldText(s) === foldText(fxCodex.name)) ? fxCodex.name : undefined);
            if (fxSpellMatch) {
                return {
                    success: false,
                    error: `"${fxName}" is a REAL leveled spell in the player's spellbook. Do NOT apply it as a free effect — call cast_spell (slot, concentration and duration apply).`,
                };
            }
        }
    }
    // Cible optionnelle : un buff/debuff chiffré peut viser un
    // ALLIÉ ou un ENNEMI du combat (bénédiction +2 CA sur le
    // compagnon, malédiction -2 attaque sur le chef…). Le moteur
    // lit ces modificateurs via combatantEffectBonus, et les
    // durées en rounds tickent au fil des tours.
    const effectTargetRef = stringArg(args.target, 120);
    const targetsSelf = !effectTargetRef
        || effectTargetRef.toLowerCase() === 'player'
        || effectTargetRef.toLowerCase() === store.character.name.toLowerCase();
    if (!targetsSelf && store.combatState.isActive) {
        const lookup = resolveCombatantReference(store.combatState, effectTargetRef, { autoResolve: true });
        if (!lookup.combatant) return { success: false, error: `Effect target "${effectTargetRef}" not found in combat.` };
        if (lookup.combatant.isPlayer) {
            const char = applyEffectArgs(store.character, args);
            d.syncCharacterUpdate(char);
        } else {
            const [statRaw, bonusRaw] = String(args?.stat || 'AC=0').split('=');
            const rounds = Math.max(1, Math.trunc(Number(args.rounds) || 10));
            const effect = {
                id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: String(args.name || 'Effect'),
                source: 'spell' as const,
                duration: 'rounds' as const,
                roundsRemaining: rounds,
                description: String(args.description || `${statRaw} ${bonusRaw}`),
                modifiers: [{ stat: (statRaw || 'AC').trim() as any, bonus: Number.parseInt((bonusRaw || '0').trim(), 10) || 0 }],
            };
            // Updater FONCTIONNEL — l'ancien spread du snapshot de début
            // de handler écrasait tout changement concurrent (ex-:2921).
            store.setCombatState((prev: any) => ({
                ...prev,
                combatants: prev.combatants.map((c: any) => c.id === lookup.combatant!.id
                    ? { ...c, activeEffects: [...(c.activeEffects || []).filter((e: any) => e.name !== effect.name), effect] }
                    : c),
            }));
        }
        campaignEventLog.append('EFFECT_ADDED', `Effect added on ${lookup.combatant.name}: ${args.name}`, args);
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effect Added on ${lookup.combatant!.name}: ${args.name} (${args.stat})]*` }]);
        return { success: true, target: lookup.combatant.name };
    }
    // OU2 — hors combat, un effet visant une cible non-joueur ne
    // doit JAMAIS retomber sur le héros (la « malédiction du
    // chef bandit » debuffait le joueur).
    if (!targetsSelf) {
        return {
            success: false,
            error: `Effect target "${effectTargetRef}" is not a tracked combatant (no active combat). The effect was NOT applied — track it narratively, or apply it during combat.`,
        };
    }
    const char = applyEffectArgs(store.character, args);
    d.syncCharacterUpdate(char);
    campaignEventLog.append('EFFECT_ADDED', `Effect added: ${args.name}`, args);
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effect Added: ${args.name} (${args.stat})]*` }]);
    return { success: true };
}
