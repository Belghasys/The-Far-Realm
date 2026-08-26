/**
 * Le tour d'un PNJ, joue par le moteur : etats incapacitants, allies
 * (profil d'attaque ou controle par le joueur), moral, kit de lanceur
 * (sorts a jet de sauvegarde), multiattaque, reactions du joueur (Bouclier,
 * Esquive instinctive, Deviation de projectiles), degats, fin de tour.
 *
 * Extrait de components/session/GameSession.tsx le 2026-08-25 (R4 du
 * rangement), corps inchange ; ce qu'il capturait vient de SessionContext.
 * Les trois helpers (reaction Bouclier, sort a sauvegarde) sont des
 * fermetures internes, comme ils l'etaient dans le composant.
 */
import { useGameStore } from '../../store/gameStore';
import { auditBus } from '../infra/auditBus';
import { Ability, getEffectiveAC, getEffectiveStat } from '../../types';
import { combatantSide, isHero } from '../../engine/combatants';
import { campaignEventLog } from '../persistence/campaignEventLog';
import { advanceTurn, resolveConcentrationAfterDamage, resolveRollPrompt, resolveAttackAction, castSpell, consumeCombatAction, resolveMoraleCheck, normalizeRollPrompt, selectEnemyTarget, encounterOutcome, applyDamageToEncounter, applyConditionToEncounter, releaseNpcConcentrationEffect, allyAttackProfile, getActionCapability, applyDamageToCharacter, applyConditionToCharacter, classSavePassives, hasEvasion, featGrantsAdvantageOn, getProficientSaves, withdrawCombatant, concentrationBreakOnDeparture, MORALE_DC } from '../../engine/rulesEngine';
import { getCreature, getMonsterAbilities } from '../../data/bestiary';
import { getCreatureAttacks, getMultiattackCount, getMultiattackSequence } from '../../engine/monsterAttacks';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType } from '../../data/companionOptions';
import { lookupMonster, lookupCondition } from '../../engine/codexService';
import { rollDice } from '../../engine/utils';
import { playDamageImpact, playPlayerHurt } from '../media/combatSfx';
import { getCheckModifier } from '../../engine/skillSystem';
import { getCasterKit, type MonsterSpell, type CasterKit } from '../../data/casterKits';
import { waitDice } from '../media/diceTiming';
import type { SessionContext } from './context';

export async function runNPCTurn(ctx: SessionContext, npc: any) {
    const { character, combatState, diceTrayRef, dm, isConnected, language, logCombatRoll, maybeEndCombat, pushCombatRoll, setActivePrompt, setCombatState, setCurrentRoll, setIsNPCTurn, setReactionRequest, setTranscript, syncCharacterCritical, tr } = ctx;

    const canOfferShieldReaction = (state: any): boolean => {
      const c = useGameStore.getState().character;
      if (!c || c.hp.current <= 0) return false;
      const knowsShield = [...(c.knownSpells || []), ...(c.preparedSpells || [])]
        .some(name => String(name).toLowerCase() === 'shield');
      if (!knowsShield) return false;
      const hasSlot = Object.values(c.spellSlots || {}).some((pool: any) => (pool?.current ?? 0) > 0);
      if (!hasSlot) return false;
      if ((c.activeEffects || []).some(e => e.name === 'Shield')) return false;
      const econ = state.actionEconomy?.['player'];
      return !(econ?.reactionUsed);
    };
    const askShieldReaction = (attackerName: string, total: number, currentAC: number): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (accepted: boolean) => {
          if (settled) return;
          settled = true;
          setReactionRequest(null);
          resolve(accepted);
        };
        const timeout = setTimeout(() => finish(false), 10000);
        setReactionRequest({
          title: tr.shieldReactionTitle,
          detail: tr.shieldReactionDetail(attackerName, total, currentAC),
          timeoutSeconds: 10,
          onAnswer: (accepted) => { clearTimeout(timeout); finish(accepted); },
        });
      });
    const runEnemySaveSpell = async (npc: any, primaryTarget: any, spell: MonsterSpell, kit: CasterKit, heroesUp: any[]) => {
      const dc = spell.dc ?? kit.dc;
      const victims = spell.kind === 'aoe_save' ? heroesUp : [primaryTarget];
      for (const victim of victims) {
        const live = useGameStore.getState().combatState;
        const row = live.combatants.find((c: any) => c.id === victim.id);
        if (!row || row.hp.current <= 0) continue;
        const ability = (spell.saveAbility || 'DEX') as Ability;
        const liveChar = useGameStore.getState().character;
        let bonus = 0;
        let advantage: 'advantage' | undefined;
        if (row.isPlayer && liveChar) {
          const effectiveStats: Record<string, number> = {
            STR: getEffectiveStat(liveChar, 'STR'), DEX: getEffectiveStat(liveChar, 'DEX'), CON: getEffectiveStat(liveChar, 'CON'),
            INT: getEffectiveStat(liveChar, 'INT'), WIS: getEffectiveStat(liveChar, 'WIS'), CHA: getEffectiveStat(liveChar, 'CHA'),
          };
          const check = getCheckModifier({
            effectiveStats, level: liveChar.level || 1, ability, isSave: true,
            proficiencies: liveChar.proficiencies || [], expertise: liveChar.expertise || [],
            proficientSaves: getProficientSaves(liveChar),
          });
          const passives = classSavePassives(liveChar, ability);
          bonus = check.modifier + passives.bonus;
          if (passives.advantage) advantage = 'advantage';
          // Don Tueur de mages : avantage contre un sort lancé AU CONTACT.
          if (featGrantsAdvantageOn(liveChar, 'save_vs_adjacent_spell') && ((npc.range || 'melee') === 'melee')) advantage = 'advantage';
        } else {
          const creatureData: any = lookupMonster(row.name) || getCreature(row.name);
          if (creatureData && 'saves' in creatureData && creatureData.saves?.[ability] !== undefined) bonus = creatureData.saves[ability];
          else if (creatureData && 'stats' in creatureData && creatureData.stats?.[ability] !== undefined) bonus = Math.floor((creatureData.stats[ability] - 10) / 2);
        }

        const outcome = resolveRollPrompt(normalizeRollPrompt({
          reason: `${row.name} — ${tr.saveWord} ${ability} vs ${spell.name}`,
          formula: `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
          dc,
          advantage,
        }));
        setCurrentRoll({ result: outcome.total, reason: `${row.name} — ${tr.saveWord} ${ability} vs ${spell.name} (${outcome.success ? tr.saveSuccess : tr.saveFail})`, isDM: !row.isPlayer, success: outcome.success });
        await waitDice();
        logCombatRoll({ type: 'save', name: `${row.name} : ${tr.saveWord} ${ability} vs ${spell.name}`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}${advantage ? ' (advantage)' : ''}`, isDM: !row.isPlayer, success: outcome.success });

        // Dégâts : moitié sur réussite (défaut), Évasion du héros respectée.
        if (spell.formula && !spell.conditionOnly) {
          const rolled = rollDice(spell.formula).total;
          const halfOnSave = spell.halfOnSave !== false;
          let mult = outcome.success ? (halfOnSave ? 0.5 : 0) : 1;
          if (row.isPlayer && liveChar && ability === 'DEX' && halfOnSave && hasEvasion(liveChar)) {
            mult = outcome.success ? 0 : 0.5;
          }
          const dmg = Math.floor(rolled * mult);
          if (dmg > 0) {
            if (row.isPlayer && liveChar) {
              // applyDamageToCharacter applique résistances/immunités/vulnérabilités
              // du héros ET l'échec de jet de mort automatique s'il était à terre.
              const applied = applyDamageToCharacter(liveChar, dmg, spell.damageType);
              const struck = applied.character;
              syncCharacterCritical(struck, 'hp');
              setCombatState((prev: any) => ({
                ...prev,
                combatants: prev.combatants.map((c: any) => c.isPlayer
                  ? { ...c, hp: { ...c.hp, current: struck.hp.current }, tempHP: struck.tempHP }
                  : c),
              }));
              logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: applied.amountApplied, formula: `${spell.formula}${applied.mitigation !== 'normal' ? ` (${applied.mitigation})` : ''}`, isDM: true });
              const conc = resolveConcentrationAfterDamage(struck, applied.amountApplied);
              if (conc.broken) {
                syncCharacterCritical(conc.character, 'hp');
                setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Concentration broken: ${conc.removedEffects.map(e => e.name).join(', ')}]*` }]);
              } else if (struck.hp.current > 0 && conc.prompt) {
                setActivePrompt(conc.prompt);
                campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', conc.prompt);
              }
            } else {
              const appliedAlly = applyDamageToEncounter(useGameStore.getState().combatState, row.id, dmg, spell.damageType);
              if (appliedAlly.found) setCombatState(appliedAlly.state);
              logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: appliedAlly.amountApplied ?? dmg, formula: `${spell.formula}${appliedAlly.mitigation && appliedAlly.mitigation !== 'normal' ? ` (${appliedAlly.mitigation})` : ''}`, isDM: true });
            }
          } else {
            logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: 0, formula: row.isPlayer && liveChar && hasEvasion(liveChar) && ability === 'DEX' && outcome.success ? 'Évasion — 0' : `${spell.formula} — 0`, isDM: true });
          }
        }

        // Condition sur ÉCHEC + lien de concentration du lanceur (brisable).
        if (!outcome.success && spell.condition) {
          if (row.isPlayer) {
            const cChar = useGameStore.getState().character;
            if (cChar) {
              const conditioned = applyConditionToCharacter(cChar, spell.condition);
              if (conditioned.found) {
                syncCharacterCritical(conditioned.character, 'hp');
                setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${row.name} — ${conditioned.condition?.name} (${spell.name})]*` }]);
              }
            }
          } else {
            const conditioned = applyConditionToEncounter(useGameStore.getState().combatState, row.id, spell.condition);
            if (conditioned.found) setCombatState(conditioned.state);
          }
          if (spell.concentration) {
            const effectName = lookupCondition(spell.condition)?.name || spell.condition;
            setCombatState((prev: any) => ({
              ...prev,
              combatants: prev.combatants.map((c: any) => c.id === npc.id
                ? { ...c, concentratingOn: { effectName, targetId: row.id } }
                : c),
            }));
          }
        }
      }
      // Sort de zone à concentration (Spirit Guardians, Cloudkill) : lien posé
      // sur le lanceur même sans condition — le blesser peut dissiper le sort.
      if (spell.concentration && !spell.condition) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) => c.id === npc.id
            ? { ...c, concentratingOn: { effectName: spell.name, targetId: undefined } }
            : c),
        }));
      }
    };

    // C1 — États incapacitants (Paralyzed/Stunned/Unconscious/Incapacitated) :
    // le tour est SAUTÉ. Sans ce garde, un ennemi sous Hold Person attaquait
    // normalement et le sort de contrôle ne faisait rien.
    const npcCapability = getActionCapability(npc.activeEffects);
    if (!npcCapability.canAct) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⛓️ ${npc.name} — ${npcCapability.blockedBy} : ${language === 'fr' ? 'aucune action possible, son tour est sauté' : 'no actions possible, turn skipped'}]*` }]);
      if (dm && isConnected) {
        dm.sendSystemMessage(`[SYSTEM] ${npc.name} is ${npcCapability.blockedBy} and CANNOT act (no actions or reactions). Its turn was skipped by the engine — narrate the helplessness in one short beat. Do NOT roll or resolve anything for it.`);
      }
      const live = useGameStore.getState().combatState;
      if (maybeEndCombat(live)) return;
      setCombatState(advanceTurn(live));
      return;
    }

    // ALLIÉS À PROFIL CONNU (compagnons recrutés, bête du Beast Master,
    // monture) : le MOTEUR joue leur tour lui-même — vrai jet d'attaque, vrais
    // dégâts, le MJ ne fait que narrer le rapport. Fini le tour d'allié qui
    // « passe » parce que le MJ n'a pas appelé resolve_attack à temps.
    if (combatantSide(npc) === 'ally') {
      const allyProfile = (() => {
        // Profil porté par le combattant lui-même (posé à l'ajout) — c'est le
        // cas de TOUS les alliés désormais, y compris les PNJ improvisés.
        if (npc.attack?.damage) return { ...npc.attack };
        const comp = (character.companions || []).find(c => c.id === npc.id);
        if (comp) return { ...comp.attack };
        if (npc.id === 'companion') {
          const beast = getBeastCompanion(character.beastKind || DEFAULT_BEAST_ID);
          if (beast) return { ...beast.attack };
        }
        if (npc.id === 'mount' && character.mount) {
          const mt = getMountType(character.mount.kind || character.mount.name);
          if (mt) return { ...mt.attack };
        }
        // Dernier recours : profil générique proportionné au niveau du héros.
        // Un allié SANS profil restait planté à attendre le MJ pendant 8 s,
        // puis son tour passait — « les alliés ne servent à rien ».
        return allyAttackProfile(null, getCreature(npc.name), character.level || 1);
      })();

      if (allyProfile) {
        const livingEnemies = combatState.combatants.filter((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!livingEnemies.length) { if (!maybeEndCombat(combatState)) setCombatState(advanceTurn(combatState)); return; }
        // Proie blessée : l'allié achève la cible la plus entamée.
        const target = [...livingEnemies].sort((a: any, b: any) => a.hp.current - b.hp.current)[0];
        const result = resolveAttackAction(combatState, {
          attacker: npc.id,
          target: target.id,
          attackBonus: allyProfile.attackBonus,
          damageFormula: allyProfile.damage,
          damageType: allyProfile.damageType,
          attackName: allyProfile.name,
          consumeAction: false,
        }, character);
        if (result.success && result.resolution) {
          const res = result.resolution;
          setCurrentRoll({ result: res.attackRoll.total, reason: `${npc.name} — ${allyProfile.name} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, isDM: false, success: res.hit });
          await waitDice();
          pushCombatRoll({ name: `${npc.name} : ${allyProfile.name}`, total: res.attackRoll.total, formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`, isDM: false, success: res.hit });
          if (res.hit && res.damage > 0) {
            setCurrentRoll({ result: res.damage, reason: `${npc.name} — ${res.damage} ${res.damageType}`, isDM: false });
            await waitDice();
            pushCombatRoll({ name: `${npc.name} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: false });
          }
          let after = result.state;
          setCombatState(after);
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] Ally ${npc.name} attacked ${res.target} with ${allyProfile.name}: ${res.hit ? `HIT for ${res.damage} ${res.damageType}${res.targetHP.current <= 0 ? ' — TARGET DOWN' : ''}` : 'MISS'}. Already resolved — narrate it in one short beat, do NOT re-roll.`);
          }
          if (maybeEndCombat(after)) return;
          setCombatState(advanceTurn(useGameStore.getState().combatState));
          return;
        }
        // Résolution impossible (cible disparue…) : on passe simplement.
        if (maybeEndCombat(useGameStore.getState().combatState)) return;
        setCombatState(advanceTurn(useGameStore.getState().combatState));
        return;
      }

      // Allié SANS profil connu (PNJ improvisé par le MJ) : fenêtre MJ classique.
      if (dm && isConnected) {
        const enemyList = combatState.combatants
          .filter(c => combatantSide(c) === 'enemy' && c.hp.current > 0)
          .map(c => `${c.name} (${c.hp.current}/${c.hp.max} HP)`).join(', ') || 'no enemies';
        // Compagnon recruté : fournis sa mini-fiche d'attaque pour que le MJ
        // résolve avec les BONS chiffres (son nom custom n'est pas au bestiaire).
        const companionSheet = (character.companions || []).find(comp => comp.id === npc.id);
        const attackHint = companionSheet
          ? ` Its attack: ${companionSheet.attack.name} — use resolve_attack(attacker="${npc.id}", target=<enemy id>, attackBonus: ${companionSheet.attack.attackBonus}, damageFormula: "${companionSheet.attack.damage}", damageType: "${companionSheet.attack.damageType}").`
          : '';
        dm.sendSystemMessage(`[SYSTEM] It is your ally ${npc.name}'s turn (enemies: ${enemyList}). You control this ally — IMMEDIATELY resolve its action with your tools (resolve_attack attacker="${npc.id}" / apply_condition) and narrate it.${attackHint} You have a short window (~8s); the engine will then advance to the next combatant automatically — do NOT call advance_turn.`);
      }
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Allied ${npc.name}'s turn — the DM directs them]*` }]);
      // Give the DM a real window to PLAY the ally before moving on — but
      // advance EARLY the moment its action is spent or the turn moved. The old
      // flat 8s sleep taxed every Beast Master round even when the DM resolved
      // the wolf in two seconds.
      const ALLY_WINDOW_MS = 8000;
      const allyWaitStart = Date.now();
      while (Date.now() - allyWaitStart < ALLY_WINDOW_MS) {
        await new Promise(r => setTimeout(r, 700));
        const live = useGameStore.getState().combatState;
        if (!live.isActive) return;
        if (live.currentTurn !== npc.id && live.currentTurn !== npc.name) return; // someone already moved the turn
        const allyEcon = live.actionEconomy?.[npc.id] || live.actionEconomy?.[npc.name];
        if (allyEcon?.actionUsed) break;            // the DM resolved the ally's action
        if (encounterOutcome(live) !== 'ongoing') break; // the ally just ended the fight
      }
      const freshAfterAlly = useGameStore.getState().combatState;
      if (!freshAfterAlly.isActive) return;
      const stillAllyTurn = freshAfterAlly.currentTurn === npc.id || freshAfterAlly.currentTurn === npc.name;
      if (!stillAllyTurn) return; // someone (DM recovery / manual) already moved the turn
      if (maybeEndCombat(freshAfterAlly)) return; // the ally may have dropped the last foe
      setCombatState(advanceTurn(freshAfterAlly));
      return;
    }

    // ENEMY turn: target a LIVING HERO (player or ally).
    // HYBRID targeting: if the MJ set a standing intent for this enemy
    // (set_enemy_target), honor it when the chosen hero is still alive; this is
    // the narrative "the mage focuses the healer" path. Otherwise fall back to
    // the deterministic "wounded prey" default (lowest-HP living hero), so
    // allies draw fire and the fight continues even if the player is down.
    const livingHeroes = combatState.combatants.filter(c => isHero(c) && c.hp.current > 0);
    if (!livingHeroes.length) {
      // Whole party (player + allies) is down. Do NOT keep cycling enemy turns
      // forever — surface defeat and stop the loop.
      setIsNPCTurn(false);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Défaite — toute la partie est à terre.]*` }]);
      if (dm && isConnected) {
        dm.sendSystemMessage('[SYSTEM] The whole party (player and allies) has fallen. Narrate the defeat / capture / aftermath.');
      }
      return;
    }
    const intentTargetId = combatState.enemyIntents?.[npc.id];
    const target = selectEnemyTarget(livingHeroes, intentTargetId)!;
    const usedIntent = !!intentTargetId && target.id === intentTargetId;
    if (usedIntent) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[${tr.enemyTargets(npc.name, target.name)}]*` }]);
    }

    // Resolve the SAME attack list the rules engine will use. The old code read
    // the raw `creature.attacks` (often empty or a generic "Basic Attack"),
    // while resolveAttackAction matches names against the PARSED list
    // (getCreatureAttacks) — the mismatch made every enemy strike fail with
    // "attack not found" and the loop continued silently: monsters dealt zero
    // damage all fight. Bestiary creatures now go through getCreatureAttacks;
    // codex monsters already store a resolved list.
    const bestiaryCreature = getCreature(npc.name);
    const codexMonster = bestiaryCreature ? null : lookupMonster(npc.name);
    const creature: any = bestiaryCreature || codexMonster;
    const resolvedAttacks: any[] = bestiaryCreature
        ? getCreatureAttacks(bestiaryCreature)
        : (codexMonster?.attacks || []);

    // --- MORALE CHECK MECHANIC ---
    // État FRAIS, pas la closure de rendu : pendant la seconde d'attente du
    // planificateur, un outil du MJ (apply_damage, enemy_leaves_combat) a pu
    // faire SORTIR ce PNJ du combat — rejouer le moral sur le snapshot l'aurait
    // RESSUSCITÉ au commit. S'il n'est plus là, son tour n'existe plus.
    const liveForMorale = useGameStore.getState().combatState;
    if (!liveForMorale.isActive || !liveForMorale.combatants.some((c: any) => c.id === npc.id)) return;
    const moraleResult = resolveMoraleCheck(liveForMorale, npc.id);
    // Seed the turn from the post-morale state when a check rolled, so the
    // moraleChecked flag persists and the enemy doesn't re-roll morale every
    // turn (the final setCombatState below would otherwise overwrite it with
    // the stale pre-morale combatState).
    let moraleState: typeof combatState = combatState;
    if (moraleResult.rolled) {
      const who = moraleResult.combatant!.name;
      if (moraleResult.fled) {
        // Fuite : on ne commet d'abord QUE le drapeau moraleChecked, on joue le
        // dé, PUIS on retire le fuyard sur l'état le plus frais. Committer le
        // tour déjà avancé avant l'animation lançait le tour du PNJ suivant
        // pendant que le dé de moral tournait encore.
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) => c.id === npc.id ? { ...c, moraleChecked: true } : c),
        }));
      } else {
        moraleState = moraleResult.state;
        setCombatState(moraleResult.state);
      }

      // Show the visual roll for the morale check
      setCurrentRoll({
        result: moraleResult.total!,
        reason: tr.moraleCheckLabel(who),
        isDM: true,
        success: moraleResult.success
      });

      // Wait 4 seconds for the animation
      await waitDice();

      if (moraleResult.fled) {
        // Il FUIT : sortie du roster, PV intacts — vivant pour le moteur, le
        // tracker, l'XP, la chronique ET le MJ (avant : hp = 0, narré mort).
        const gone = withdrawCombatant(useGameStore.getState().combatState, npc.id, 'fled');
        if (gone.found && gone.combatant) {
          setCombatState(gone.state);
          const broken = concentrationBreakOnDeparture(gone.combatant);
          if (broken) {
            const released = releaseNpcConcentrationEffect(useGameStore.getState().combatState, useGameStore.getState().character, broken);
            setCombatState(released.state);
            if (released.removedFromPlayer && released.character) syncCharacterCritical(released.character, 'hp');
          }
          campaignEventLog.append('COMBATANT_LEFT', `${who} fled the battle (failed morale) — alive`, { ...(gone.departed || {}), reason: 'fled' } as any);
        }
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.moraleFledLine(who, moraleResult.total!)}]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] ${who} FAILED its morale check (WIS save ${moraleResult.total} vs DC ${MORALE_DC}) and FLED the battle. It is ALIVE — it ran away with its remaining HP and may return later. Narrate a rout (it breaks and runs), NEVER a death, and do not resolve anything for it.`);
        }
        // If that was the last enemy, the fight is over (victory) — état frais.
        maybeEndCombat(useGameStore.getState().combatState);
        return; // Stop NPC turn execution since they fled!
      }
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.moraleHeldLine(who, moraleResult.total!)}]*` }]);
    }

    // ── LANCEUR DE SORTS ENNEMI (2026-08-13) : un mage/prêtre/liche du
    // bestiaire choisit un VRAI sort (kit SRD) avant de se rabattre sur l'arme.
    // Zone si ≥2 cibles côté héros, sinon le sort limité le plus fort, sinon le
    // tour de magie à volonté. Les usages limités sont décomptés par combat.
    // ── CAPACITÉS SRD (2026-08-26, data/monsterData2) : la PRÉSENCE TERRIFIANTE
    // une fois par combat, puis le SOUFFLE quand il est chargé (recharge sur
    // 1d6 ≥ 5 au début du tour). Même mécanique que les kits de lanceurs :
    // runEnemySaveSpell joue la sauvegarde, les dégâts, la condition. Les
    // usages et la recharge vivent sur le combattant — rien n'est confié à la
    // mémoire du MJ. Un souffle qui sort remplace les attaques du tour.
    const srdBlock = getMonsterAbilities(bestiaryCreature);
    if (srdBlock && combatantSide(npc) === 'enemy') {
      const liveRow = useGameStore.getState().combatState.combatants.find((c: any) => c.id === npc.id);
      const used: Record<string, number> = { ...(liveRow?.abilityUses || {}) };
      const ready: Record<string, boolean> = { ...(liveRow?.abilityReady || {}) };
      const heroesUp = useGameStore.getState().combatState.combatants.filter((c: any) => isHero(c) && c.hp.current > 0);
      const breaths = srdBlock.actions.filter(a => a.kind === 'breath' && a.dc && (a.damage || []).some(d => 'dice' in d));
      for (const b of breaths) {
        if (used[b.name] && !ready[b.name]) {
          const roll = rollDice('1d6').total;
          const seuil = b.usage?.minValue ?? 5;
          if (roll >= seuil) ready[b.name] = true;
          logCombatRoll({ type: 'check', name: `${npc.name} : ${b.name} (recharge)`, total: roll, formula: `1d6 ≥ ${seuil}`, isDM: true, success: roll >= seuil });
        }
      }
      const marquer = (nom: string, pret?: boolean) => {
        used[nom] = (used[nom] || 0) + 1;
        if (pret !== undefined) ready[nom] = pret;
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) => c.id === npc.id ? { ...c, abilityUses: { ...used }, abilityReady: { ...ready } } : c),
        }));
      };
      const kit0 = { dc: 10, attackBonus: 0, spells: [] as MonsterSpell[] };
      const presence = srdBlock.actions.find(a => a.kind === 'presence' && a.dc);
      if (presence && presence.dc && !used[presence.name] && heroesUp.length) {
        marquer(presence.name);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 😱 ${npc.name} — ${presence.name}]*` }]);
        auditBus.publish('combat', `😱 ${npc.name} : ${presence.name} (DD ${presence.dc.value} ${presence.dc.ability})`, presence);
        await runEnemySaveSpell(npc, target, { name: presence.name, kind: 'aoe_save', saveAbility: presence.dc.ability, dc: presence.dc.value, condition: 'frightened', conditionOnly: true }, kit0, heroesUp);
      }
      const breath = breaths.find(b => !used[b.name] || ready[b.name]);
      if (breath && breath.dc) {
        const part = (breath.damage || []).find(d => 'dice' in d) as { dice: string; type: string };
        marquer(breath.name, false);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 ${npc.name} — ${breath.name} !]*` }]);
        auditBus.publish('combat', `🔥 ${npc.name} : ${breath.name} (DD ${breath.dc.value} ${breath.dc.ability}, ${part.dice} ${part.type})`, breath);
        await runEnemySaveSpell(npc, target, {
          name: breath.name, kind: 'aoe_save', saveAbility: breath.dc.ability, dc: breath.dc.value,
          formula: part.dice, damageType: part.type as any, halfOnSave: breath.dc.successType === 'half',
        }, kit0, heroesUp);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Turn completed for ${npc.name}]*` }]);
        const freshEnd = useGameStore.getState().combatState;
        if (maybeEndCombat(freshEnd)) return;
        setCombatState(advanceTurn(freshEnd));
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] ${npc.name} used ${breath.name} over the party (DC ${breath.dc.value} ${breath.dc.ability}, ${part.dice} ${part.type}) — saves and damage are already resolved by the engine; narrate the blast. It recharges on a 5-6 at the start of its turns.`);
        }
        return;
      }
    }

    let spellWeaponOverride: any = null;
    const casterKit = getCasterKit(npc.name);
    if (casterKit && combatantSide(npc) === 'enemy') {
      const liveRow = useGameStore.getState().combatState.combatants.find((c: any) => c.id === npc.id);
      const usedSpells: Record<string, number> = liveRow?.spellUses || {};
      const usesLeft = (s: MonsterSpell) => s.uses === undefined ? Infinity : Math.max(0, s.uses - (usedSpells[s.name] || 0));
      const heroesUp = useGameStore.getState().combatState.combatants.filter((c: any) => isHero(c) && c.hp.current > 0);
      const chosen = casterKit.spells.find(s => s.kind === 'aoe_save' && usesLeft(s) > 0 && heroesUp.length >= 2)
        || casterKit.spells.find(s => s.uses !== undefined && usesLeft(s) > 0 && s.kind !== 'aoe_save')
        || casterKit.spells.find(s => s.uses === undefined);
      if (chosen) {
        if (chosen.uses !== undefined) {
          setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.id === npc.id
              ? { ...c, spellUses: { ...(c.spellUses || {}), [chosen.name]: (c.spellUses?.[chosen.name] || 0) + 1 } }
              : c),
          }));
        }
        auditBus.publish('combat', `🪄 ${npc.name} lance ${chosen.name} (${chosen.kind}, DD ${chosen.dc ?? casterKit.dc})`, chosen);
        if (chosen.kind === 'attack') {
          // Jet d'ATTAQUE de sort → réutilise tel quel le chemin d'attaque
          // complet ci-dessous (réaction Bouclier, résistances, journal).
          spellWeaponOverride = {
            name: chosen.name,
            attackBonus: chosen.attackBonus ?? casterKit.attackBonus,
            damage: chosen.formula || '1d8',
            damageType: chosen.damageType || 'force',
          };
        } else {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🪄 ${npc.name} ${language === 'fr' ? 'lance' : 'casts'} ${chosen.name} !]*` }]);
          await runEnemySaveSpell(npc, target, chosen, casterKit, heroesUp);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Turn completed for ${npc.name}]*` }]);
          const freshEnd = useGameStore.getState().combatState;
          if (maybeEndCombat(freshEnd)) return;
          setCombatState(advanceTurn(freshEnd));
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] ${npc.name} CAST ${chosen.name}${chosen.kind === 'aoe_save' ? ' over the whole party' : ` on ${target.name}`} — saves, damage and conditions are ALREADY resolved (see the [SYSTEM] lines and roll journal). Narrate the spell vividly; never re-roll or re-apply it.`);
          }
          return;
        }
      }
    }

    const availableAttacks = resolvedAttacks.filter((a: any) => !a.name.toLowerCase().includes('multiattack'));
    // Real multiattack count parsed from the creature's action text (was hard-capped at 2).
    const attackCount = creature ? getMultiattackCount(creature as any) : 1;

    const attacksToRun: any[] = [];
    if (spellWeaponOverride) {
      // Un sort d'attaque = UN cast ce tour (pas de multiattaque au bâton derrière).
      attacksToRun.push(spellWeaponOverride);
    } else if (availableAttacks.length > 0) {
      // La séquence SRD quand elle existe (« une morsure, deux griffes »), sinon
      // les N attaques réparties en cycle sur les attaques nommées.
      const sequence = creature ? getMultiattackSequence(creature) : [];
      const parNom = (nom: string) => availableAttacks.find((a: any) => String(a.name).toLowerCase() === nom.toLowerCase());
      if (sequence.length && sequence.every(parNom)) {
        for (const nom of sequence) attacksToRun.push(parNom(nom));
      } else {
        for (let i = 0; i < attackCount; i++) {
          attacksToRun.push(availableAttacks[i % availableAttacks.length]);
        }
      }
    } else {
      const fallback = { name: 'Attack', attackBonus: 4, damage: '1d6+2', damageType: 'bludgeoning' };
      for (let i = 0; i < attackCount; i++) attacksToRun.push(fallback);
    }

    let currentState = moraleState;

    for (const attack of attacksToRun) {
      // Le PNJ a-t-il QUITTÉ le combat pendant les dés (fuite/reddition via un
      // outil du MJ) ? Un absent ne frappe pas.
      if (!useGameStore.getState().combatState.combatants.some((c: any) => c.id === npc.id)) break;
      const attackBonus = (attack as any).attackBonus;
      const damageFormula = (attack as any).damage;
      const damageType = (attack as any).damageType || 'bludgeoning';

      // Dodge: if the target took the Dodge action, attackers roll against them
      // with disadvantage until their next turn (cleared in the turn-sync
      // effect). This makes the Dodge button mechanically real, not cosmetic.
      const targetDodging = (target.activeEffects || []).some((e: any) => e.name === 'Dodge');
      // GS6 (contre-audit) — fiche FRAÎCHE à chaque frappe : le moteur lit la CA
      // du joueur sur ce paramètre (getEffectiveAC). Avec la prop de rendu, le
      // +5 CA du sort Bouclier accepté en réaction (ou Armure du mage, ou tout
      // buff MJ posé pendant le tour) était invisible pour les frappes SUIVANTES
      // de la même multiattaque.
      const liveCharForStrike = useGameStore.getState().character || character;
      const result = resolveAttackAction(currentState, {
        attacker: npc.id,
        target: target.id,
        attackName: attack.name,
        attackBonus,
        damageFormula,
        damageType,
        advantage: targetDodging ? 'disadvantage' : undefined,
        consumeAction: false
      }, liveCharForStrike);

      if (result.success && (result as any).advanced) {
        // NF4 — ennemi hors de portée : son attaque devient un RAPPROCHEMENT
        // d'UNE bande (loin → à distance, ou à distance → contact). Depuis
        // « loin », il lui faut donc 2 tours pour arriver au contact.
        const advNpc = (result as any).advanced as { from: string; to: string };
        const bandFrNpc = (b: string) => b === 'far' ? 'loin' : b === 'near' ? 'à distance' : 'au contact';
        currentState = result.state;
        setCombatState(currentState);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${npc.name} se rapproche (${bandFrNpc(advNpc.from)} → ${bandFrNpc(advNpc.to)}).]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] ${npc.name} CLOSED THE DISTANCE (${advNpc.from} → ${advNpc.to}) instead of striking — that consumed its turn. Narrate the advance in one short beat and ALWAYS state the new distance.`);
        }
        break; // le rapprochement consomme le tour de cet ennemi
      }
      if (!result.success || !result.resolution) {
        // NEVER skip silently: a skipped strike looked exactly like "the monster
        // does no damage". Surface the reason in the audit console so any future
        // regression is visible immediately.
        auditBus.publish('combat', `⚠️ ${npc.name} attack "${attack.name}" failed to resolve: ${result.error || 'unknown'}`, result.error);
        console.warn(`⚔️ Enemy attack skipped (${npc.name} / ${attack.name}):`, result.error);
        continue;
      }

      const res = result.resolution;

      // RÉACTION BOUCLIER : le coup touche le joueur, mais +5 CA l'annulerait.
      // On propose la réaction AVANT d'adopter l'état frappé — si le joueur
      // accepte, on jette result.state (les dégâts n'ont jamais eu lieu).
      if (res.hit && target.isPlayer && !res.criticalHit && canOfferShieldReaction(currentState)) {
        const liveChar = useGameStore.getState().character!;
        const currentAC = getEffectiveAC(liveChar);
        if (res.attackRoll.total < currentAC + 5) {
          const accepted = await askShieldReaction(npc.name, res.attackRoll.total, currentAC);
          if (accepted) {
            const castResult = castSpell(liveChar, { spellName: 'Shield' });
            if (castResult.success) {
              syncCharacterCritical(castResult.character, 'hp');
              const consumed = consumeCombatAction(currentState, 'player', 'reaction');
              currentState = consumed.success ? consumed.state : currentState;
              setCombatState((prev: any) => {
                const reacted = consumeCombatAction(prev, 'player', 'reaction');
                return reacted.success ? reacted.state : prev;
              });
              setCurrentRoll({ result: res.attackRoll.total, reason: `${npc.name} ${tr.vs} ${tr.ac} ${currentAC + 5} — ${tr.miss}`, isDM: true, success: false });
              await waitDice();
              pushCombatRoll({ name: `${npc.name} : ${attack.name}`, total: res.attackRoll.total, formula: `${tr.vs} ${tr.ac} ${currentAC + 5} (Shield)`, isDM: true, success: false });
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.shieldCastLine(npc.name)}]*` }]);
              auditBus.publish('combat', `Shield reaction: ${npc.name} attack ${res.attackRoll.total} negated (AC ${currentAC}→${currentAC + 5})`, res);
              if (dm && isConnected) {
                dm.sendSystemMessage(`[SYSTEM] The player cast SHIELD as a reaction: ${npc.name}'s attack (${res.attackRoll.total}) now MISSES against AC ${currentAC + 5}. +5 AC until their next turn. Narrate the arcane barrier.`);
              }
              continue; // le coup n'a jamais porté — on garde currentState intact
            }
          }
        }
      }

      // 1. Roll Attack dice animation
      setCurrentRoll({
        result: res.attackRoll.total,
        reason: `${npc.name} ${tr.attacksWith} ${attack.name}: ${res.hit ? tr.hit : tr.miss}`,
        isDM: true,
        success: res.hit
      });

      await waitDice();

      // Réaction défensive auto-résolue par le moteur (Esquive instinctive du
      // Roublard, Déviation de projectiles du Moine) : rendue VISIBLE, sinon le
      // joueur voit juste des dégâts mystérieusement réduits.
      if (res.hit && res.reaction) {
        const line = res.reaction === 'uncanny_dodge'
          ? tr.reactionUncanny
          : tr.reactionDeflect(res.reactionAmount || 0);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌀 ${line}${res.reaction === 'deflect_missiles' && res.damage === 0 ? ' — projectile ATTRAPÉ !' : ''}]*` }]);
        pushCombatRoll({ name: line, total: res.damage, formula: res.reaction, isDM: false });
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] The player's ${res.reaction === 'uncanny_dodge' ? 'UNCANNY DODGE halved the blow' : `DEFLECT MISSILES turned aside ${res.reactionAmount} damage${res.damage === 0 ? ' — they CAUGHT the projectile' : ''}`} (reaction, already resolved). Weave it into the narration.`);
        }
      }

      if (res.hit && res.damage > 0) {
        // SFX déterministe : grognement du héros s'il encaisse, impact sinon.
        if (target.isPlayer) playPlayerHurt(character as any);
        else playDamageImpact(res.damageType, Boolean((res as any).criticalHit), false);
        // 2. Roll Damage dice animation
        setCurrentRoll({
          result: res.damage,
          reason: `${npc.name}: ${attack.name} damage (${res.damageType})`,
          isDM: true
        });

        await waitDice();
      }

      // Rage implacable : le moteur a maintenu le barbare à 1 PV.
      if (res.relentless) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 ${tr.relentlessLine}]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] The raging barbarian should have dropped — RELENTLESS RAGE kept them at 1 HP (CON save passed, already resolved). Narrate them refusing to fall.`);
        }
      }

      // 3. Log to combat log (DiceTray.addLog mirrors into the store's combat
      // journal). Also push to the store DIRECTLY so the enemy roll appears in the
      // "Jets" HUD even if the DiceTray panel is unmounted (e.g. narrow layout),
      // and mirror to the audit console so we can always verify enemy turns fire.
      pushCombatRoll({ name: `${npc.name} : ${attack.name}`, total: res.attackRoll.total, formula: `${tr.vs} ${tr.ac} ${target.ac}`, isDM: true, success: res.hit });
      auditBus.publish('combat', `${npc.name} ${attack.name}: ${res.attackRoll.total} vs CA ${target.ac} → ${res.hit ? 'TOUCHE' : 'raté'}`, `attack roll ${res.attackRoll.total} (hit=${res.hit})`);
      diceTrayRef.current?.addLogNoMirror?.({
        type: 'attack',
        name: `${npc.name}: ${attack.name}`,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.prompt.formula.split('+')[1] || 0} = ${res.attackRoll.total} vs AC ${target.ac}`,
        isDM: true,
        success: res.hit
      });

      if (res.hit && res.damage > 0) {
        pushCombatRoll({ name: `${npc.name} : ${attack.name} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: true });
        auditBus.publish('combat', `${npc.name} dégâts: ${res.damage} ${res.damageType}`, res.damageFormula);
        diceTrayRef.current?.addLogNoMirror?.({
          type: 'damage',
          name: `${npc.name}: ${attack.name} damage`,
          total: res.damage,
          formula: res.damageFormula,
          isDM: true
        });
      }

      currentState = result.state;

      // Keep the player's character sheet HP in sync only when the player was
      // the one struck (an ally being hit must not overwrite the player's HP).
      if (target.isPlayer) {
        const updatedPlayer = currentState.combatants.find(c => c.isPlayer);
        // La fiche FRAÎCHE du store, pas la closure de rendu : une condition
        // posée pendant ce tour (présence terrifiante, effet sur touche) était
        // effacée par la synchronisation des PV de l'attaque suivante.
        const freshChar = useGameStore.getState().character || character;
        if (updatedPlayer && freshChar) {
          // syncCharacterCritical (not bare onCharacterUpdate) so the HP loss is
          // PERSISTED to the save and the tempHP/death-save path runs — otherwise
          // enemy damage vanished on reload and HP-0 didn't trigger death saves.
          const struck = {
            ...freshChar,
            tempHP: updatedPlayer.tempHP ?? freshChar.tempHP ?? 0,
            hp: { ...freshChar.hp, current: updatedPlayer.hp.current },
          };
          syncCharacterCritical(struck, 'hp');
          // Concentration was only checked on the DM-tool damage paths — the
          // automated enemy turns (where MOST damage comes from) never asked
          // for the save, so Bless/Hold Person effectively could not break.
          if (res.hit && res.damage > 0) {
            const concentration = resolveConcentrationAfterDamage(struck, res.damage);
            if (concentration.broken) {
              syncCharacterCritical(concentration.character, 'hp');
              setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(e => e.name).join(', ')}]*`
              }]);
            } else if (struck.hp.current > 0 && concentration.prompt) {
              setActivePrompt(concentration.prompt);
              campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
              setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: Concentration save required, DC ${concentration.dc} after ${res.damage} damage]*`
              }]);
            }
          }
        }
      }

      // EFFET SUR TOUCHE (bloc SRD, 2026-08-26) : la queue de la tarrasque
      // renverse (STR 20 → à terre), le toucher de la liche paralyse (CON 18)…
      // Joué APRÈS la synchronisation des PV, sur la fiche fraîche. Sans
      // condition nommée dans le bloc, l'effet reste narratif.
      const onHit = (attack as any).onHitSave as { ability: any; value: number; condition?: string } | undefined;
      if (res.hit && onHit?.condition && target.isPlayer) {
        await runEnemySaveSpell(npc, target, { name: attack.name, kind: 'save', saveAbility: onHit.ability, dc: onHit.value, condition: onHit.condition, conditionOnly: true }, { dc: onHit.value, attackBonus: 0, spells: [] }, []);
      }
    }

    setTranscript(prev => [...prev, {
      speaker: 'dm',
      text: `*[SYSTEM: Turn completed for ${npc.name}]*`
    }]);

    // Reconcile the enemy-turn outcome onto the FRESHEST combat state, not the
    // snapshot we captured before the multi-second dice animations. During those
    // awaits the DM may have mutated combat via its tools (enemy HP, conditions,
    // new foes, intents); committing `currentState` wholesale would clobber them.
    // We re-apply only what THIS turn changed — the target's HP/tempHP/effects —
    // leaving every other combatant row as the live state has it.
    const fresh = useGameStore.getState().combatState;
    if (!fresh.isActive) return; // le combat s'est clos pendant les dés (dernier ennemi parti/tombé)
    const after = currentState.combatants.find((c: any) => c.id === target.id);
    // CB4 — la réaction consommée par le moteur pendant CE tour (Esquive
    // instinctive, Déviation de projectiles) doit survivre à la réconciliation.
    // Avant, l'actionEconomy du moteur était jetée : reactionUsed repartait à
    // false et la réaction se re-déclenchait sur CHAQUE tour ennemi du round.
    const enginePlayerEcon: any = (currentState.actionEconomy as any)?.['player'];
    const freshEconomy: any = fresh.actionEconomy || {};
    const reconciled = {
      ...fresh,
      actionEconomy: enginePlayerEcon?.reactionUsed
        ? { ...freshEconomy, player: { ...(freshEconomy['player'] || {}), reactionUsed: true } }
        : freshEconomy,
      combatants: fresh.combatants.map((c: any) =>
        (after && c.id === target.id)
          ? { ...c, hp: after.hp, tempHP: after.tempHP, activeEffects: after.activeEffects }
          : c
      ),
    };

    // End the fight if this turn dropped the whole party (defeat). Otherwise
    // advance to the next combatant. Single setCombatState (was double before).
    if (maybeEndCombat(reconciled)) return;
    // Un outil du MJ a déjà déplacé le tour pendant les dés (CE PNJ a fui ou
    // s'est rendu via apply_damage / enemy_leaves_combat → withdrawCombatant a
    // avancé pour lui) : ne pas ré-avancer, le suivant perdrait son tour.
    const stillMyTurn = fresh.currentTurn === npc.id || fresh.currentTurn === npc.name;
    setCombatState(stillMyTurn ? advanceTurn(reconciled) : reconciled);

    if (dm && isConnected) {
      const targetAfter = currentState.combatants.find(c => c.id === target.id);
      dm.sendSystemMessage(`[SYSTEM] ${npc.name} completed its turn: attacked ${target.name} with ${attacksToRun.map(a => a.name).join(' and ')}. ${target.name} HP is now ${targetAfter?.hp.current ?? 0}/${target.hp.max}. Please narrate the enemy's action and its choice of target.`);
    }
}
