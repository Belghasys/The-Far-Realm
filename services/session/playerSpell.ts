/**
 * Le joueur lance un sort en combat : cout d'action, cible, jet, resolution
 * contre les cibles, economie de tour, synchronisation de la fiche.
 *
 * Extrait de components/session/GameSession.tsx le 2026-08-25 (R4 du
 * rangement), corps inchange ; ce qu'il capturait vient de SessionContext.
 */
import { useGameStore } from '../../store/gameStore';
import { combatantSide } from '../../engine/combatants';
import { resolvePendingSpellRoll, resolveRollPrompt, castSpell, applyStoryModifiersToPrompt, worldHourOf, resolveSpellAgainstTargets, applyAutoDamageSpell } from '../../engine/rulesEngine';
import { getCreature } from '../../data/bestiary';
import { lookupMonster, lookupSpell, spellLabel } from '../../engine/codexService';
import { playSpellSfx } from '../media/combatSfx';
import { waitDice } from '../media/diceTiming';
import { dropHidden } from '../../engine/combat/stealth';
import type { SessionContext } from './context';

export async function handlePlayerCastSpell(ctx: SessionContext, spellName: string, slotLevel: string | null, targetId: string) {
    const { actionLockRef, character, combatState, dayCount, dm, guardPlayerAction, hasPlayerBonusFree, hasPlayerMainSlice, isConnected, language, logCombatRoll, maybeEndCombat, onCharacterUpdate, rejectActionSpent, setCombatState, setIsResolvingAction, setPlayerRoll, setTranscript, showActionToast, spendPlayerBonus, spendPlayerMainAction, syncCharacterCritical, timeOfDay, tr } = ctx;
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    // CB5 — un sort coûte l'action (ou l'action bonus si Sort accéléré armé).
    const quickenedArmed = (character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
    if (quickenedArmed ? !hasPlayerBonusFree(combatState) : !hasPlayerMainSlice(combatState)) {
      rejectActionSpent(quickenedArmed);
      return;
    }
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    // Sort de ZONE : cible 'all_enemies' → chaque ennemi vivant fera SA
    // sauvegarde (résolution moteur ci-dessous). Le cast lui-même est plombé
    // sur le premier ennemi pour construire DC/dés.
    // 'all_combatants' = TIR AMI (audit 2026-08-12) : les alliés (compagnon,
    // monture, familier) sont dans la zone et sauvegardent aussi.
    // Sélection PERSONNALISÉE « a,b,c » (cases cochées dans le panneau) : mêmes
    // règles que les sentinelles — chaque cible fait SA sauvegarde.
    const customAoeIds = targetId.includes(',')
      ? targetId.split(',').map(s => s.trim()).filter(Boolean)
      : null;
    const isAoECast = targetId === 'all_enemies' || targetId === 'all_combatants' || !!customAoeIds;
    const friendlyFire = targetId === 'all_combatants';
    const aoeTargets = customAoeIds
      ? combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0 && customAoeIds.includes(c.id))
      : isAoECast
        ? combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0
            && (friendlyFire || combatantSide(c) === 'enemy'))
        : [];
    const effectiveTargetId = isAoECast ? (aoeTargets[0]?.id ?? targetId) : targetId;
    const target = combatState.combatants.find(c => c.id === effectiveTargetId);
    const targetName = customAoeIds
      ? aoeTargets.map(t => t.name).join(', ')
      : isAoECast
        ? (friendlyFire
            ? (language === 'fr' ? 'toute la zone (alliés compris)' : 'the whole area (allies included)')
            : (language === 'fr' ? 'tous les ennemis' : 'all enemies'))
        : (target ? target.name : 'Target');

    // NF4 — sort de CONTACT : la cible doit être au corps à corps.
    // Le nom CANONIQUE (anglais) reste la donnee — il part au MJ et au
    // moteur. Ce que le joueur LIT passe par spellLabel : sinon la partie
    // francaise affichait « Fire Bolt » dans son propre journal.
    const spellShown = spellLabel(spellName, language === 'fr' ? 'fr' : 'en');
    const touchSpellDef = lookupSpell(spellName);
    if (touchSpellDef && /^touch$/i.test(String(touchSpellDef.range || ''))
        && target && !target.isPlayer
        && (((target as any).range || 'melee') !== 'melee')) {
      showActionToast(`✋ ${spellShown} — ${language === 'fr' ? 'sort de contact : la cible doit être au corps à corps' : 'touch spell: the target must be in melee reach'}`);
      return;
    }

    const spellLevelNum = slotLevel ? Number(slotLevel.replace('level', '')) : undefined;

    // Derived target save bonus if save-based spell
    const creatureData: any = target ? (lookupMonster(target.name) || getCreature(target.name)) : null;
    const saveAbility = lookupSpell(spellName)?.save?.ability || 'DEX';
    // Narrow the CreatureStats | CodexMonsterRef union (same logic as rulesEngine
    // castSpell): `saves` is already a modifier; `stats` is an ability score that
    // converts via (score-10)/2. Only fall back to +0 when neither exists —
    // previously `.stats?.[...] || 10` silently gave every codex-ref monster +0.
    let targetSaveBonusMod = 0;
    if (creatureData && 'saves' in creatureData && creatureData.saves?.[saveAbility] !== undefined) {
        targetSaveBonusMod = creatureData.saves[saveAbility];
    } else if (creatureData && 'stats' in creatureData && creatureData.stats?.[saveAbility] !== undefined) {
        targetSaveBonusMod = Math.floor((creatureData.stats[saveAbility] - 10) / 2);
    }

    const spellResult = castSpell(character, {
      spellName,
      slotLevel: spellLevelNum,
      target: targetName,
      // L'ID EXACT : sans lui, trois « Gobelin » rendaient la cible ambiguë et
      // le sort n'infligeait aucun dégât, sans le moindre message.
      targetId: isAoECast ? undefined : target?.id,
      targetAC: target?.ac,
      targetSaveBonus: targetSaveBonusMod,
      worldHour: worldHourOf(dayCount, timeOfDay),
      maximizeHealing: !!character.storyMode,
    });

    if (!spellResult.success) {
      // Échec SILENCIEUX auparavant (console.error seulement) : le joueur
      // cliquait « Lancer le sort » et il ne se passait rien. On dit pourquoi.
      console.error('Spell cast failed:', spellResult.error);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${spellShown} — ${spellResult.error || (language === 'fr' ? 'lancement impossible' : 'cast failed')}]*` }]);
      return;
    }

    // CACHÉ — lancer un sort trahit autant que frapper : gestes, incantation,
    // lumière. Comme pour l'attaque, le sort a DÉJÀ pris son avantage ci-dessus
    // (castSpell a lu l'effet), on ne retire l'état qu'après (audit 2026-08-31).
    {
      const liveChar = useGameStore.getState().character || character;
      const unhidden = dropHidden(liveChar.activeEffects);
      if (unhidden.dropped) {
        onCharacterUpdate({ ...liveChar, activeEffects: unhidden.effects } as any);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsNoLongerHidden}]*` }]);
      }
    }

    // SFX déterministe : son élémentaire du sort (feu, glace, foudre, soin…).
    playSpellSfx(lookupSpell(spellName) as any, spellName);

    // Update character sheet
    onCharacterUpdate(spellResult.character);
    syncCharacterCritical(spellResult.character, 'hp');

    if (spellResult.healing && spellResult.healing > 0) {
      // 1. Roll healing animation
      setPlayerRoll({
        result: spellResult.healing,
        reason: tr.castHealedLabel(spellShown, spellResult.healing)
      });
      await waitDice();

      // 2. Add log
      logCombatRoll({
        type: 'damage',
        name: `${tr.healing}: ${spellShown}`,
        total: spellResult.healing,
        formula: spellResult.spell?.healing?.dice || '1d8',
        isDM: false
      });

      // 3. Update target combatant HP.
      // CB1 — le moteur ne soigne plus le lanceur quand la cible est un allié
      // (healingTargetsSelf=false) : la SEULE application est ici, sur la ligne
      // de la cible. Updater fonctionnel : l'état capturé avant waitDice() est
      // périmé de plusieurs secondes (ui-m4).
      if (targetId === 'player' || target?.isPlayer) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) =>
            c.isPlayer ? { ...c, hp: { ...c.hp, current: spellResult.character.hp.current } } : c),
        }));
      } else if (target) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) =>
            c.id === target.id ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + (spellResult.healing || 0)) } } : c),
        }));
      }

      // 4. Send to DM
      if (dm && isConnected) {
        const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Healing: ${spellResult.healing} HP. Please narrate this action in character.`;
        await dm.sendUserMessage(msg);
      }
    } else if (spellResult.autoDamage) {
      // ── Sort à TOUCHE AUTOMATIQUE (Projectile magique) : ni jet d'attaque ni
      //    sauvegarde. Il ne faisait strictement RIEN avant (aucune branche ne
      //    le gérait) — on applique les dégâts pour de vrai.
      const auto = spellResult.autoDamage;
      const victims = isAoECast ? aoeTargets : (target ? [target] : []);
      let state = combatState;
      const reports: string[] = [];
      for (const victim of victims) {
        const applied = applyAutoDamageSpell(state, { ...auto, targetId: victim.id, target: victim.name });
        if (!applied) continue;
        state = applied.state;
        setPlayerRoll({ result: applied.damage, reason: `${spellShown} → ${victim.name} (${applied.damage} ${auto.damageType || tr.damage})` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: `${spellShown} → ${victim.name}`, total: applied.damage, formula: auto.damageFormula, isDM: false });
        reports.push(`${victim.name}: ${applied.damage}${applied.mitigation !== 'normal' ? ` (${applied.mitigation})` : ''}`);
      }
      setCombatState(state);
      if (reports.length) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellShown} — ${reports.join(', ')}]*` }]);
      }
      if (dm && isConnected) {
        await dm.sendUserMessage(reports.length
          ? `[SYSTEM] Player cast ${spellName} on ${targetName}. It ALWAYS hits (no attack roll, no save): ${reports.join(', ')} ${auto.damageType || ''} damage. Already applied — narrate the unerring bolts, do NOT re-roll.`
          : `[SYSTEM] Player cast ${spellName} on ${targetName} outside combat. Narrate the effect.`);
      }
      maybeEndCombat(state);
    } else if (isAoECast && spellResult.prompt?.type === 'SAVE' && spellResult.prompt.pendingSpell && aoeTargets.length) {
      // ── ZONE : sauvegarde individuelle par ennemi, dégâts lancés UNE fois ──
      const prompt = spellResult.prompt;
      // État frais + commit immédiat (avant les animations) — même famille de
      // correctifs anti-écrasement que les actions improvisées.
      const aoe = resolveSpellAgainstTargets(useGameStore.getState().combatState, prompt, aoeTargets.map(t => t.id));
      if (aoe) {
        setCombatState(aoe.state);
        if (aoe.sharedDamageRoll > 0) {
          setPlayerRoll({ result: aoe.sharedDamageRoll, reason: `${spellShown} — ${tr.aoeDamageRoll}` });
          await waitDice();
        }
        for (const r of aoe.results) {
          logCombatRoll({
            type: 'save',
            name: `${r.name} — ${spellShown}`,
            total: r.saveTotal,
            formula: `vs DC ${prompt.dc}`,
            isDM: true,
            success: r.saveSuccess,
          });
          if (r.damage > 0) {
            logCombatRoll({ type: 'damage', name: `${spellShown} → ${r.name}`, total: r.damage, formula: prompt.pendingSpell?.damageFormula || '', isDM: false });
          }
        }
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellShown} (${language === 'fr' ? 'zone' : 'area'}) — ${aoe.summary}]*` }]);
        if (dm && isConnected) {
          await dm.sendUserMessage(`[SYSTEM] Player cast ${spellName} on ALL enemies (area). Per-target results: ${aoe.summary}. All HP changes are applied — narrate the blast in ONE beat, do not re-roll anything.`);
        }
      }
    } else if (spellResult.prompt) {
      // Spell requires attack roll or saving throw
      let prompt = spellResult.prompt;
      // AUDIT FIX : les inspirations/avantages du MJ ne s'appliquaient JAMAIS
      // aux attaques de sort du panneau (seules les attaques d'arme les
      // consommaient) — un « avantage sur ta prochaine attaque » était perdu
      // si le joueur lançait Rayon de feu.
      if (prompt.type === 'ATTACK') {
        // GS2 (contre-audit) — partir de la fiche FRAÎCHE du store, pas de la
        // prop de rendu : le cast vient d'être committé (slot dépensé,
        // métamagie consommée) et `{ ...character }` pré-cast REMBOURSAIT le
        // tout en réécrivant la fiche d'avant.
        const liveChar = useGameStore.getState().character || character;
        const mod = applyStoryModifiersToPrompt(prompt, (liveChar as any).storyModifiers || []);
        if (mod.applied.length) {
          onCharacterUpdate({ ...liveChar, storyModifiers: mod.remaining } as any);
          const labels = mod.applied.map((m: any) => m.name).join(', ');
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎲 ${labels} — ${tr.appliedToAttack}]*` }]);
          prompt = mod.prompt;
        }
      }
      const outcome = resolveRollPrompt(prompt);

      // 1. Show d20 animation
      setPlayerRoll({
        result: outcome.total,
        reason: `${spellName} — ${prompt.type === 'ATTACK' ? tr.attackWord : tr.saveNoun} ${tr.vs} ${targetName} (${outcome.success ? tr.successWord : tr.failureWord})`,
        success: outcome.success
      });
      await waitDice();

      // Resolve pending spell roll — sur l'état FRAIS du store, pas la valeur
      // de rendu capturée AVANT les 4 s d'animation : un appel d'outil MJ
      // concurrent était écrasé par ce commit (le sort « ne se matérialisait
      // pas » dans la fenêtre de combat — audit 2026-08-13).
      const spellRes = resolvePendingSpellRoll(useGameStore.getState().combatState, outcome);
      if (spellRes.resolved) {
        setCombatState(spellRes.state);

        // If target took damage, show damage animation
        if (spellRes.damage && spellRes.damage > 0) {
          setPlayerRoll({
            result: spellRes.damage,
            reason: `${spellName} Damage`
          });
          await waitDice();
        }

        // Add log
        logCombatRoll({
          type: prompt.type === 'ATTACK' ? 'attack' : 'save',
          name: `${spellName} (${prompt.type})`,
          total: outcome.total,
          formula: outcome.formulaLabel,
          isDM: false,
          success: outcome.success
        });

        if (spellRes.damage && spellRes.damage > 0) {
          logCombatRoll({
            type: 'damage',
            name: `${spellName} Damage`,
            total: spellRes.damage,
            formula: prompt.pendingSpell?.damageFormula || '1d6',
            isDM: false
          });
        }

        // Update player HP if target was player
        // GS13 (contre-audit) — fiche FRAÎCHE (deux animations nous séparent du
        // rendu) + sync CRITIQUE : sans lui, les PV perdus disparaissaient au
        // rechargement (le chemin jumeau finalizeRollOutcome le fait déjà).
        if (spellRes.target?.isPlayer) {
          const freshChar = useGameStore.getState().character || character;
          const updated = {
            ...freshChar,
            hp: spellRes.target.hp,
            activeEffects: spellRes.target.activeEffects || freshChar.activeEffects
          };
          onCharacterUpdate(updated);
          syncCharacterCritical(updated, 'hp');
        }

        // Send to DM
        if (dm && isConnected) {
          const outcomeStr = outcome.success ? 'Success' : 'Failure';
          const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Roll: ${outcome.total} (${outcome.formulaLabel}) vs DC/AC ${prompt.dc} (${outcomeStr}). Damage/Effect: ${spellRes.summary}. Please narrate this action in character.`;
          await dm.sendUserMessage(msg);
        }
      }
    } else {
      // Spell has direct utility/effect (no rolls)
      logCombatRoll({
        type: 'check',
        name: `Cast Spell: ${spellName}`,
        total: 0,
        formula: 'Slot consumed',
        isDM: false
      });

      if (dm && isConnected) {
        const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Effect: ${spellResult.summary}. Please narrate this action in character.`;
        await dm.sendUserMessage(msg);
      }
    }

    // Casting a spell spends the whole main action (all remaining attack pips)
    // — SAUF sous Sort accéléré (métamagie) : il ne coûte que l'action bonus.
    if (combatState.isActive) {
      setCombatState((s: any) => spellResult.quickened ? spendPlayerBonus(s) : spendPlayerMainAction(s));
      if (spellResult.quickened) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ ${tr.abilityQuickenedLabel} — le sort n'a coûté que l'action bonus]*` }]);
      }
    }
    // The player ends their turn explicitly — don't auto-advance. Resolve victory
    // if this spell dropped the last foe.
    maybeEndCombat(useGameStore.getState().combatState);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}
