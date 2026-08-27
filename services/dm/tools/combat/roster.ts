/** Qui est dans le combat, et a qui le tour : ouverture et fin de rencontre,
 *  entree d'un ennemi ou d'un allie, depart (fuite, reddition), cible
 *  designee, passage de tour, cartes d'action proposees au joueur. */
/** Les outils du combat : jets demandes au joueur, rencontre, attaques, degats, etats, sorts a la voix, actions proposees.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../../store/gameStore';
import { appendCampaignLog, combatChronicle, describeCombatFoes, describeDeparted, formatCombatChronicleLine } from '../../chronicle';
import { buildSceneImagePrompt } from '../../../../services/media/geminiImageService';
import { foldText } from '../../../../engine/skillSystem';
import { campaignEventLog } from '../../../../services/persistence/campaignEventLog';
import { addEnemyToEncounter, addAllyToEncounter, advanceTurn, combatantSide, encounterAlreadyRunning, resolveCombatantReference, sanitizeXPGrant, startEncounter, withdrawCombatant, concentrationBreakOnDeparture, DepartedReason } from '../../../../engine/rulesEngine';
import { assessEncounterPressure, buildEncounter, lookupSpell } from '../../../../engine/codexService';
import { BESTIARY, getCreature, suggestCreatures } from '../../../../data/bestiary';
import { effectivePartySize } from '../../../../engine/partyWeight';
import { pickSpecimen } from '../../../../engine/monsterPick';
import { syncCompanionsFromState, resolveMountAfterCombat, releaseNpcConcentrationEffect } from '../../../../engine/rulesEngine';
import { stringArg } from '../shared';
import type { ToolContext } from '../context';

export async function start_combat(_args: any, ctx: ToolContext) {
    const { d, store, logNewPlayerInitiative, scheduleCombatImageOnce , sysText } = ctx;
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysCombatStart}]*` }]);
     logNewPlayerInitiative(false, character, state);
     if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
    scheduleCombatImageOnce('hostile forces', store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
    return { success: true };
}
export async function end_combat(args: any, ctx: ToolContext) {
    const { d, store, sysLine, scenePromptOptions, scheduleSceneImage , sysText } = ctx;
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
            // Monture tombée : MÊME règle que la fin de combat côté écran. Cette
            // porte-ci (fin narrée par le MJ : fuite, reddition, négociation) ne
            // l'appliquait pas — la monture morte restait sur la fiche à 0 PV,
            // sans un mot, et repartait guérie au premier repos long.
            const mountOutcome = resolveMountAfterCombat(syncCompanionsFromState(freshChar, rosterAtEnd));
            const synced = mountOutcome.character;
            if (synced !== freshChar) d.syncCharacterUpdate(synced);
            if (mountOutcome.fallen) {
                const { name, celestial } = mountOutcome.fallen;
                store.setTranscript(prev => [...prev, { speaker: 'dm', text: celestial
                    ? `*[SYSTEM: ✨ ${sysText().sysCelestialSteedGone(name)}]*`
                    : `*[SYSTEM: 🐴 ${sysText().sysMountFallen(name)}]*` }]);
                campaignEventLog.append('JOURNAL_UPDATED', `Mount ${celestial ? 'returned to the planes' : 'killed'}: ${name}`, mountOutcome.fallen);
            }
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysCombatEnd(xpAwarded)}]*` }]);
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
    const { store, name, logInitiativeRoll, logNewPlayerInitiative, scheduleCombatImageOnce , sysText } = ctx;
    // État FRAIS : un handler précédent encore en vol (dés 4 s, jet
    // retenu 90 s) peut avoir modifié le combat depuis le snapshot.
    const live = useGameStore.getState();
    const character = live.character;
    // AUCUN MONSTRE INVENTÉ (2026-08-26) : le MJ ne fait apparaître que des
    // créatures du bestiaire. Un nom qui ne résout pas est REFUSÉ, avec les
    // fiches les plus proches pour qu'il se corrige — jamais de PV, CA ou XP
    // sortis de l'imagination du modèle.
    const requestedName = String(args.name || '').trim();
    const baseState = character ? startEncounter(character, live.combatState) : { ...live.combatState, isActive: true };
    const hadPlayerBefore = live.combatState.combatants.some((c: any) => c.isPlayer);
    // LE MOTEUR CHOISIT LE SPÉCIMEN (2026-08-26, engine/monsterPick) : « un
    // dragon rouge » devant un niveau 2 devient un dragonnet, « un thug » au
    // niveau 8 un vétéran ; un nom exact n'est jamais substitué, seulement jaugé.
    const heroLevel = character?.level || 1;
    const weightedParty = effectivePartySize(heroLevel, baseState.combatants
        .filter((c: any) => !c.isPlayer && c.hp.current > 0 && c.side === 'ally')
        .map((c: any) => c.cr ?? getCreature(c.name)?.cr));
    const manifest = live.adventureManifestData;
    const chapitre = manifest?.chapters?.find((ch: any) => ch.id === live.campaignRuntime?.currentChapterId);
    const pick = pickSpecimen(requestedName, {
        heroLevel,
        partySize: weightedParty,
        difficulty: (['easy', 'medium', 'hard', 'deadly'] as const).find(d => d === String(args.difficulty || '').toLowerCase()) || 'hard',
        plannedIds: (chapitre?.encounters || []).flatMap((e: any) => e.monsters || []),
        campaignIds: manifest?.selectedMonsterIds || [],
    }, BESTIARY);
    if (!pick.creature) {
        const suggestions = suggestCreatures(requestedName);
        return {
            success: false,
            error: `UNKNOWN CREATURE — "${requestedName}" is not in the bestiary and the engine only fields bestiary creatures (never homebrew). `
                + (suggestions.length ? `Closest matches: ${suggestions.join(', ')}. ` : '')
                + `Re-call add_enemy_init with one of them, or use search_codex / build_encounter to pick a fitting creature.`,
            suggestions,
        };
    }
    // Le nom du combattant : la fiche choisie quand le moteur a tranché
    // (famille, type), le nom du MJ (épithète comprise) quand c'est un nom exact.
    if (pick.reason === 'family' || pick.reason === 'type' || pick.reason === 'planned') args = { ...args, name: pick.creature.name };
    const choix = {
        chosen: pick.creature.name, reason: pick.reason, threat: pick.threat,
        ...(pick.candidates.length ? { candidates: pick.candidates } : {}),
        ...(pick.threat === 'beyond' || pick.threat === 'deadly'
            ? { warning: `${pick.creature.name} is ${pick.threat.toUpperCase()} for this party (level ${heroLevel}, weighted size ${weightedParty}). Narrate accordingly: retreat, negotiation, stealth, or a set-piece the campaign scripted.` }
            : {}),
    };
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
    // Les alliés pèsent selon leur CR (engine/partyWeight) : un civil secouru
    // ne double plus le budget, un vétéran compte pour un aventurier.
    const partySize = weightedParty;
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysInitiativeAdded(combatant.name, combatant.hp.current, combatant.ac)}]*` }]);
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
    const warnings = [choix.warning, pressureWarning].filter(Boolean).join(' ');
    return {
        success: true,
        initiative: combatant.initiative,
        combatant,
        ...choix,
        ...(warnings ? { warning: warnings } : {}),
        ...(returning ? { note: `${combatant.name} had ${returning.reason} earlier in this fight and is now BACK in the initiative.` } : {}),
    };
}
export async function add_ally_init(args: any, ctx: ToolContext) {
    const { store, logInitiativeRoll, logNewPlayerInitiative } = ctx;
    const live = useGameStore.getState();
    const character = live.character;
    // Un allié aussi vient du bestiaire : par gabarit (args.template) ou par
    // son nom. Rien d'inventé — le MJ garde le nom, le gabarit donne les stats.
    const templateName = String(args.template || args.name || '').trim();
    if (!getCreature(templateName)) {
        const suggestions = suggestCreatures(templateName);
        return {
            success: false,
            error: `UNKNOWN TEMPLATE — "${templateName}" is not a bestiary creature. Allies take their stats from a bestiary template: re-call add_ally_init with template set to a fitting creature `
                + `(commoner, guard, acolyte, veteran, knight, mage, wolf…)${suggestions.length ? ` — closest names: ${suggestions.join(', ')}` : ''}. Keep the NPC's own name in "name".`,
            suggestions,
        };
    }
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
    const { store, sysLine } = ctx;
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ +${label} ${sysLine(`accordée${count > 1 ? 's' : ''} ce tour`, 'granted this turn')}${args.reason ? ` (${stringArg(args.reason, 60)})` : ''}]*` }]);
    campaignEventLog.append('EFFECT_ADDED', `Granted player ${kind} x${count}`, { kind, count, reason: args.reason });
    return { success: true, kind, count };
}
export async function build_encounter(args: any, ctx: ToolContext) {
    const { d, store, scheduleCombatImageOnce, optionalBoolean , sysText } = ctx;
    const character = store.character;
    // La taille du groupe est CALCULÉE (héros + alliés pondérés par CR), pas
    // déclarée par le MJ : compagnons persistants et alliés déjà en combat.
    const liveAllies = useGameStore.getState().combatState.combatants
        .filter((c: any) => !c.isPlayer && c.hp.current > 0 && c.side === 'ally');
    const allyCRs = liveAllies.length
        ? liveAllies.map((c: any) => c.cr ?? getCreature(c.name)?.cr)
        : (character?.companions || []).filter(c => c.hp.current > 0).map(c => c.cr ?? getCreature(c.templateId || c.name)?.cr);
    const encounter = buildEncounter({
        partyLevel: Number(args.partyLevel || character?.level || 1),
        partySize: effectivePartySize(Number(character?.level || 1), allyCRs),
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
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysEncounterFromCodex(encounter.monsters.map(m => m.name).join(', '))}]*` }]);
    }
     campaignEventLog.append('ENCOUNTER_STARTED', 'Encounter built from SRD Codex and current bestiary', encounter);
    return { success: true, encounter };
}
