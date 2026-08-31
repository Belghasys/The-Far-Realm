/**
 * Les actions du joueur en combat, hors sorts et capacites de classe :
 * attaque (arme principale, attaque de puissance), attaque bonus (main
 * secondaire), esquive, potion, et la carte d'action improvisee proposee par
 * le MJ (propose_player_action) — cout declare, primitive moteur, rapport.
 *
 * Extraites de components/session/GameSession.tsx le 2026-08-26 (contre-audit,
 * lot C) : avec playerSpell et classAbility, TOUTES les actions du joueur
 * vivent desormais dans services/session. Corps inchanges ; ce qu'elles
 * capturaient vient de SessionContext.
 */
import { getPlayerEconomy } from '../../engine/turnEconomy';
import { useGameStore } from '../../store/gameStore';
import { auditBus } from '../../services/infra/auditBus';
import { getEffectiveStat, getPlayerAttackModifier, getPlayerDamageBonus, parseItemStatModifier, getPlayerAttackCount, isRangedWeapon } from '../../types';
import { toWeaponOverride } from '../../engine/weaponOverride';
import { combatantSide } from '../../engine/combatants';
import { resolveRollPrompt, resolveAttackAction, consumeCombatAction, normalizeRollPrompt, applyStoryModifiersToPrompt, applyDamageToEncounter, applyConditionToEncounter, normalizeStoryModifier, worldHourOf, stampEffectExpiry, releaseNpcConcentrationEffect, formatDamageParts } from '../../engine/rulesEngine';
import type { ProposedPlayerAction } from '../../store/gameStore';
import { getCreature } from '../../data/bestiary';
import { lookupMonster } from '../../engine/codexService';
import { rollDice, maxRollOfFormula } from '../../engine/utils';
import { combatChronicle } from '../../services/dm/chronicle';
import { playWeaponSwing, playDamageImpact } from '../../services/media/combatSfx';
import { waitDice } from '../../services/media/diceTiming';
import { dropHidden } from '../../engine/combat/stealth';
import type { SessionContext } from './context';

/**
 * CACHÉ — on est révélé EN attaquant, pas avant. L'attaque a DÉJÀ pris son
 * avantage (et, pour un Roublard, ses dés sournois) parce que
 * `deriveRollContext` a lu l'effet au moment du jet : on ne retire l'état
 * qu'APRÈS la résolution. Appeler ceci avant l'attaque annulerait tout
 * l'intérêt de s'être caché.
 */
function revealAfterStrike(ctx: SessionContext) {
    const liveChar = useGameStore.getState().character || ctx.character;
    const unhidden = dropHidden(liveChar.activeEffects);
    if (!unhidden.dropped) return;
    ctx.onCharacterUpdate({ ...liveChar, activeEffects: unhidden.effects } as any);
    ctx.setTranscript((prev: any) => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${ctx.tr.gsNoLongerHidden}]*` }]);
}

export async function handlePlayerAttack(ctx: SessionContext, weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) {
    const { actionLockRef, character, combatState, dm, guardPlayerAction, isConnected, language, logCombatRoll, maybeEndCombat, onCharacterUpdate, patchPlayerEconomy, setCombatState, setIsResolvingAction, setPlayerRoll, setTranscript, showActionToast, syncCharacterUpdate, tr } = ctx;
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    // CB3 — retarget to a living ENEMY if the selected one is down… or is an
    // ally (a stale selectedTargetId could point at the player's companion).
    if (!target || target.hp.current <= 0 || combatantSide(target) !== 'enemy') {
      target = combatState.combatants.find(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
    }
    if (!target) return;

    // ONE attack per click — read the player's remaining attack pips.
    const econ0 = getPlayerEconomy(combatState);
    const attacksMax = econ0.attacksMax ?? getPlayerAttackCount(character);
    const attacksUsed = econ0.attacksUsed ?? 0;
    if (attacksUsed >= attacksMax) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paNoAttackLeft}]*` }]);
      return;
    }
    const isFirstAttack = attacksUsed === 0;

    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      // L'arme SÉLECTIONNÉE (épée en main OU arc du slot distance) devient
      // l'arme du personnage pour cette résolution : le moteur (bandes de
      // distance, sneak, jet, GWM) juge la bonne arme, pas character.weapon.
      const weaponShape = toWeaponOverride(weaponItem);
      const attackChar = { ...character, weapon: weaponShape };
      const damageBonus = getPlayerDamageBonus(attackChar);
      const baseAttackBonus = getPlayerAttackModifier(attackChar);
      const damageDice = weaponItem.damageDice || weaponItem.damage || '1d4';
      const damageFormula = `${damageDice}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;

      // Story modifiers (advantage / graded bonus / inspiration) are consumed on
      // the FIRST attack of the turn only.
      let dmBonus = 0;
      let advantage: any = undefined;
      if (isFirstAttack) {
        const attackPrompt = normalizeRollPrompt({
          reason: `${character.name} attacks ${target.name}`,
          formula: `1d20${baseAttackBonus >= 0 ? '+' : ''}${baseAttackBonus}`,
          dc: target.ac,
        });
        const mod = applyStoryModifiersToPrompt(attackPrompt, (character as any).storyModifiers || []);
        if (mod.applied.length) {
          // Fiche FRAÎCHE du store : le spread de la prop de rendu pouvait
          // restituer un slot/une ressource dépensés entre-temps (audit).
          const liveChar = useGameStore.getState().character || character;
          onCharacterUpdate({ ...liveChar, storyModifiers: mod.remaining } as any);
          const labels = mod.applied.map((m: any) => {
            const b = m.bonus ? ` ${m.bonus > 0 ? '+' : ''}${m.bonus}` : '';
            const adv = m.mode && m.mode !== 'normal' ? ` (${m.mode})` : '';
            return `${m.name}${b}${adv}`;
          }).join(', ');
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎲 ${labels} — ${tr.appliedToAttack}]*` }]);
        }
        dmBonus = mod.prompt.dmBonus || 0;
        advantage = mod.prompt.advantage;
      }

      const attackNum = attacksUsed + 1;
      const label = `${tr.attackN(attackNum, attacksMax)} : ${weaponItem.name}`;

      const result = resolveAttackAction(combatState, {
        attacker: 'player',
        target: target.id,
        attackBonus: baseAttackBonus + dmBonus,
        damageFormula,
        damageType: weaponItem.damageType || 'slashing',
        attackName: weaponItem.name,
        advantage,
        consumeAction: false, // pips are managed below, not via the boolean economy
        powerAttack: opts?.powerAttack, // -5/+10, revalidé côté moteur (feat + arme)
      } as any, attackChar);

      if (result.success && (result as any).advanced) {
        // NF4 — l'attaque est devenue un RAPPROCHEMENT d'une bande (loin → à
        // distance, ou à distance → contact) et a consommé l'action.
        const adv = (result as any).advanced as { from: string; to: string };
        const bandFr = (b: string) => b === 'far' ? tr.bandFar : b === 'near' ? tr.bandNear : tr.bandMelee;
        let state = patchPlayerEconomy(result.state, { attacksUsed: attacksUsed + 1 });
        setCombatState(state);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paAdvance(character.name, target.name, bandFr(adv.from), bandFr(adv.to), adv.to === 'melee')}]*` }]);
        showActionToast(`🏃 ${language === 'fr' ? `Rapprochement : ${bandFr(adv.from)} → ${bandFr(adv.to)}` : `Advance: ${adv.from} → ${adv.to}`}`);
        if (dm && isConnected) {
          await dm.sendUserMessage(`[SYSTEM] The player CLOSED THE DISTANCE toward ${target.name} (${adv.from} → ${adv.to}) instead of striking — that consumed the action. Narrate the advance and ALWAYS state the new distance. Do NOT advance the turn.`);
        }
        return;
      }
      if (!result.success || !result.resolution) {
        // CB8 — plus d'échec muet : le refus du moteur (« Attacker is down »,
        // cible invalide…) est montré au joueur au lieu d'un console.error.
        console.error('Attack resolution failed:', result.error);
        showActionToast(`⚠️ ${language === 'fr' ? 'Attaque impossible' : 'Attack failed'} — ${result.error || 'unknown'}`);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${language === 'fr' ? 'Attaque impossible' : 'Attack failed'} — ${result.error || 'unknown'}]*` }]);
        auditBus.publish('combat', `Attaque joueur refusée par le moteur : ${result.error || '?'}`);
        return;
      }
      revealAfterStrike(ctx);
      const res = result.resolution;
      let state = result.state;

      // SFX déterministe : geste de l'arme (couvre aussi le raté), puis impact
      // typé si le coup touche.
      playWeaponSwing(weaponItem);
      // Ce qui a pesé sur le jet, dit au joueur. Le moteur le calculait déjà et
      // ne le montrait que dans ActionPrompt — donc jamais ici, sur le jet le
      // plus fréquent du jeu. Un désavantage d'empoisonnement se voyait
      // seulement dans un total plus faible, sans explication (audit 2026-08-31).
      const raisons = res.reasons?.length ? ` · ${res.reasons.slice(0, 2).join(' · ')}` : '';
      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})${raisons}`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        playDamageImpact(res.damageType, Boolean((res as any).criticalHit), weaponItem?.slot === 'ranged' || Boolean(weaponItem?.range));
        setPlayerRoll({ result: res.damage, reason: `${tr.damage} : ${res.damage} (${res.damageType})` });
        await waitDice();
      }

      logCombatRoll({
        type: 'attack', name: label,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`,
        isDM: false, success: res.hit,
      });
      if (res.hit && res.damage > 0) {
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: formatDamageParts(res), isDM: false });
      }

      // Consume ONE attack pip (the pip turns green → gray in the HUD).
      state = patchPlayerEconomy(state, { attacksUsed: attacksUsed + 1 });
      setCombatState(state);

      // Riders à usage unique dépensés par ce coup (Châtiment divin) : on les
      // retire de la fiche, sinon un seul emplacement de sort aurait alimenté
      // toutes les attaques du round.
      if (res.consumedEffectIds?.length) {
        const live = useGameStore.getState().character!;
        const consumed = new Set(res.consumedEffectIds);
        syncCharacterUpdate({ ...live, activeEffects: (live.activeEffects || []).filter(e => !consumed.has(e.id)) } as any);
      }

      // Occultiste (Le Fiélon) — Bénédiction du Ténébreux : abattre un ennemi
      // rend CHA + niveau PV temporaires.
      if (res.hit && res.targetHP.current <= 0 && character.subclass === 'The Fiend') {
        const live = useGameStore.getState().character!;
        const gain = Math.max(1, Math.floor((getEffectiveStat(live, 'CHA') - 10) / 2)) + (live.level || 1);
        if (gain > (live.tempHP || 0)) {
          syncCharacterUpdate({ ...live, tempHP: gain } as any);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paDarkBlessing(gain)}]*` }]);
        }
      }

      if (dm && isConnected) {
        const hitOrMiss = res.hit ? (res.criticalHit ? 'COUP CRITIQUE' : 'touché') : 'manqué';
        await dm.sendUserMessage(`[SYSTEM] Player attack ${attackNum}/${attacksMax} with ${weaponItem.name} on ${res.target}: ${hitOrMiss}${res.hit ? ` ${res.damage} ${res.damageType}` : ''}. Narrate it briefly. Do NOT advance the turn.`);
      }

      maybeEndCombat(state);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}

export async function handlePlayerBonusAttack(ctx: SessionContext, weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield' = 'offhand') {
    const { actionLockRef, character, combatState, dm, guardPlayerAction, isConnected, language, logCombatRoll, maybeEndCombat, setCombatState, setIsResolvingAction, setPlayerRoll, setTranscript, showActionToast, spendPlayerBonus, syncCharacterUpdate, tr } = ctx;
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    // CB3 — jamais d'attaque bonus sur un allié sélectionné par erreur.
    if (!target || target.hp.current <= 0 || combatantSide(target) !== 'enemy') {
      target = combatState.combatants.find(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
    }
    if (!target) return;
    // PL10 — l'attaque bonus de MÊLÉE exige le contact (elle ne sait pas
    // charger). Une arme À DISTANCE ou de JET en main secondaire (arbalète de
    // poing, dague de lancer…) passe : le moteur juge la portée et convertit en
    // rapprochement si besoin — le blocage aveugle refusait ces armes à tort.
    const bonusWeaponRanged = isRangedWeapon(weaponItem)
      || ((weaponItem?.properties || []) as any[]).some((p: any) => /thrown|jet|lanc/i.test(String(p)));
    if (!bonusWeaponRanged && ((target as any).range || 'melee') !== 'melee') {
      showActionToast(`⚔️ ${language === 'fr' ? 'Attaque bonus impossible : la cible n\'est pas au contact' : 'Bonus attack impossible: target not in melee reach'}`);
      return;
    }

    const econ0 = getPlayerEconomy(combatState);
    const bonusMax = econ0.bonusMax ?? 1;
    const bonusUsed = econ0.bonusUsed ?? 0;
    if (bonusUsed >= bonusMax) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paBonusUsed}]*` }]);
      return;
    }
    // SRD: l'attaque off-hand et War Priest exigent d'avoir PRIS l'action
    // Attaque d'abord (au moins une attaque principale ce tour). La Frénésie
    // du Berserker n'a pas ce prérequis (elle exige la Rage, vérifiée côté UI).
    const attacksUsed = econ0.attacksUsed ?? 0;
    if (mode !== 'frenzy' && attacksUsed === 0) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paMainFirst}]*` }]);
      return;
    }

    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      const isOffhand = mode === 'offhand';
      // cb-m4 — le calcul UI utilise la MÊME forme d'arme que le moteur
      // (toWeaponOverride) : l'item brut n'a ni abilityMod ni magicBonus — un
      // arc en main secondaire attaquait avec FOR et perdait son bonus magique.
      const weaponForMath = toWeaponOverride(weaponItem);
      const attackBonus = getPlayerAttackModifier(character, weaponForMath);
      const damageBonus = getPlayerDamageBonus(character, weaponForMath, isOffhand);
      const damageDice = weaponItem.damageDice || weaponItem.damage || '1d4';
      const damageFormula = `${damageDice}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;
      const label = mode === 'frenzy'
        ? `${tr.frenzy} : ${weaponItem.name}`
        : mode === 'warpriest'
          ? `${tr.warPriest} : ${weaponItem.name}`
          : mode === 'martial'
            ? `${tr.martialArts} : ${weaponItem.name}`
            : mode === 'shield'
              ? `${tr.shieldBash}`
              : `${tr.offhandAttack} : ${weaponItem.name}`;

      const result = resolveAttackAction(combatState, {
        attacker: 'player',
        target: target.id,
        attackBonus,
        damageFormula,
        damageType: weaponItem.damageType || 'slashing',
        attackName: weaponItem.name,
        consumeAction: false,
      } as any, { ...character, weapon: weaponForMath });

      if (result.success && (result as any).advanced) {
        // Cible hors de portée : le bonus se convertit en rapprochement.
        setCombatState(spendPlayerBonus(result.state));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${character.name} se rapproche de ${target.name} (loin → proche).]*` }]);
        return;
      }
      if (!result.success || !result.resolution) {
        console.error('Bonus attack resolution failed:', result.error);
        return;
      }
      revealAfterStrike(ctx);
      const res = result.resolution;
      let state = result.state;

      // SFX déterministe (attaque bonus / frénésie / prêtre de guerre).
      playWeaponSwing(weaponItem);
      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        playDamageImpact(res.damageType, Boolean((res as any).criticalHit), weaponItem?.slot === 'ranged' || Boolean(weaponItem?.range));
        setPlayerRoll({ result: res.damage, reason: `${tr.damage} : ${res.damage} (${res.damageType})` });
        await waitDice();
      }

      logCombatRoll({
        type: 'attack', name: label,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`,
        isDM: false, success: res.hit,
      });
      if (res.hit && res.damage > 0) {
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: formatDamageParts(res), isDM: false });
      }

      // Consume the amber bonus pip.
      state = spendPlayerBonus(state);
      setCombatState(state);

      // Idem que l'attaque principale : un rider « une fois par coup » (Châtiment
      // divin) est dépensé ici aussi.
      if (res.consumedEffectIds?.length) {
        const live = useGameStore.getState().character!;
        const consumed = new Set(res.consumedEffectIds);
        syncCharacterUpdate({ ...live, activeEffects: (live.activeEffects || []).filter(e => !consumed.has(e.id)) } as any);
      }

      // War Priest spends one use of its long-rest resource.
      if (mode === 'warpriest') {
        const res0 = (character as any).resources?.warPriest;
        if (res0) {
          syncCharacterUpdate({
            ...character,
            resources: { ...(character as any).resources, warPriest: { ...res0, current: Math.max(0, res0.current - 1) } },
          } as any);
        }
      }

      if (dm && isConnected) {
        const hitOrMiss = res.hit ? (res.criticalHit ? 'COUP CRITIQUE' : 'touché') : 'manqué';
        await dm.sendUserMessage(`[SYSTEM] Player BONUS-ACTION attack (${mode}) with ${weaponItem.name} on ${res.target}: ${hitOrMiss}${res.hit ? ` ${res.damage} ${res.damageType}` : ''}. Narrate it briefly. Do NOT advance the turn.`);
      }

      maybeEndCombat(state);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}

export async function handlePlayerDodge(ctx: SessionContext, ) {
    const { actionLockRef, character, combatState, dm, guardPlayerAction, hasPlayerMainSlice, isConnected, logCombatRoll, onCharacterUpdate, rejectActionSpent, setCombatState, setIsResolvingAction, spendPlayerMainAction, syncCharacterCritical, tr } = ctx;
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    // CB5 — l'esquive est une action : refus si la tranche est déjà dépensée.
    if (!hasPlayerMainSlice(combatState)) {
      rejectActionSpent(false);
      return;
    }
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    // Apply dodge effect
    const updatedCombatants = combatState.combatants.map(c => {
      if (c.isPlayer) {
        const activeEffects = [
          ...(c.activeEffects || []).filter(e => e.name !== 'Dodge'),
          {
            id: `dodge-${Date.now()}`,
            name: 'Dodge',
            source: 'condition' as const,
            duration: 'rounds' as const,
            roundsRemaining: 1,
            description: tr.dodgeDesc,
            modifiers: []
          }
        ];
        return { ...c, activeEffects };
      }
      return c;
    });

    const updatedChar = {
      ...character,
      activeEffects: [
        ...(character.activeEffects || []).filter(e => e.name !== 'Dodge'),
        {
          id: `dodge-${Date.now()}`,
          name: 'Dodge',
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: tr.dodgeDesc,
          modifiers: []
        }
      ]
    };

    onCharacterUpdate(updatedChar);
    syncCharacterCritical(updatedChar, 'hp');

    // Apply the Dodge effect AND spend the whole main action.
    // ui-m4 — updater FONCTIONNEL : le snapshot combatState de la clôture peut
    // être périmé et aurait écrasé des mutations concurrentes du MJ.
    setCombatState((prev: any) => spendPlayerMainAction({
      ...prev,
      combatants: prev.combatants.map((c: any) => {
        const patched = updatedCombatants.find(u => u.id === c.id);
        return (patched && c.isPlayer) ? { ...c, activeEffects: patched.activeEffects } : c;
      }),
    }));

    logCombatRoll({
      type: 'check',
      name: 'Dodge Action',
      total: 0,
      formula: 'Dodge active',
      isDM: false
    });

    if (dm && isConnected) {
      dm.sendSystemMessage(`[SYSTEM] Player took the Dodge action. Until their next turn, all attacks against them have Disadvantage. Please narrate this.`);
    }

    // Dodge consumes the Action; the player ends the turn explicitly. Enemies
    // will then attack at disadvantage (the Dodge effect clears when the player's
    // turn comes back around).
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}

export async function handlePlayerUsePotion(ctx: SessionContext, potionItem: any) {
    const { actionLockRef, character, combatState, dayCount, dm, guardPlayerAction, hasPlayerBonusFree, isConnected, logCombatRoll, onCharacterUpdate, rejectActionSpent, setCombatState, setIsResolvingAction, setPlayerRoll, setTranscript, spendPlayerBonus, spendPlayerMainAction, syncCharacterCritical, timeOfDay, tr } = ctx;
    if (actionLockRef.current) return;
    if (guardPlayerAction()) return;
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    const effectText = (potionItem.effect || potionItem.description || '').toLowerCase();
    const name = (potionItem.name || 'Potion');
    // PL1 — boire une potion est TOUJOURS une action bonus (règle BG3 voulue) :
    // on attaque ET on boit dans le même tour, mais une seule potion par tour.
    const isBonusPotion = true;

    // CB5/PL1 — la potion consomme l'action bonus : refus clair si déjà utilisée.
    if (combatState.isActive && !hasPlayerBonusFree(combatState)) {
      rejectActionSpent(true);
      return;
    }

    // Consume one charge (shared by both heal and buff branches).
    const consumeFromInventory = (inv: any[]) => inv
      .map(item => item.id === potionItem.id ? { ...item, quantity: item.quantity - 1 } : item)
      .filter(item => item.quantity > 0);

    // --- Detect a STAT-BUFF potion (Potion of Strength, Giant Strength, etc.) ---
    // A heal is only intended when the text mentions healing/HP or has explicit heal dice.
    const STATS = ['STR','DEX','CON','INT','WIS','CHA'] as const;
    const statBuffs = STATS
      .map(s => ({ stat: s, mod: parseItemStatModifier({ name, effect: effectText } as any, s) }))
      .filter(x => x.mod.bonus !== 0 || x.mod.setTo !== undefined);
    const looksLikeHeal = /heal|hp|hit\s*point|soin|vie|cure|gu[ée]ri/i.test(effectText) || /\d+d\d+/.test(effectText);

    if (statBuffs.length > 0 && !looksLikeHeal) {
      // BUFF potion → temporary activeEffect (1 hour) read by getEffectiveStat.
      const modifiers = statBuffs.map(b => b.mod.setTo !== undefined
        ? { stat: b.stat, bonus: 0, setTo: b.mod.setTo }
        : { stat: b.stat, bonus: b.mod.bonus });
      const label = statBuffs.map(b => b.mod.setTo !== undefined ? `${b.stat}=${b.mod.setTo}` : `${b.stat} ${b.mod.bonus>0?'+':''}${b.mod.bonus}`).join(', ');
      const updatedChar: any = {
        ...character,
        inventory: consumeFromInventory(character.inventory || []),
        activeEffects: [
          ...(character.activeEffects || []).filter((e: any) => e.name !== name),
          stampEffectExpiry({ id: `potion-${Date.now()}`, name, source: 'potion' as const, duration: '1_hour' as const, description: `${name}: ${label} (1h)`, modifiers }, worldHourOf(dayCount, timeOfDay)),
        ],
      };
      onCharacterUpdate(updatedChar);
      syncCharacterCritical(updatedChar, 'hp');
      logCombatRoll({ type: 'check', name: `Potion: ${name}`, total: 0, formula: label, isDM: false });
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paPotionBuff(name, label)}]*` }]);
      if (dm && isConnected) {
        await dm.sendUserMessage(`[SYSTEM] Player drank ${name}, gaining ${label} for 1 hour. Narrate the surge of power.`);
      }
      if (combatState.isActive) setCombatState((s: any) => isBonusPotion ? spendPlayerBonus(s) : spendPlayerMainAction(s));
      return;
    }

    // --- HEAL potion (default) ---
    let formula = '2d4+2';
    const match = effectText.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/);
    if (match) formula = match[1].replace(/\s+/g, '');
    else if (effectText.includes('greater') || effectText.includes('supérieur')) formula = '4d4+4';
    else if (effectText.includes('superior') || effectText.includes('majeur')) formula = '8d4+8';
    else if (effectText.includes('supreme') || effectText.includes('suprême')) formula = '10d4+20';

    // PL1 — les potions rendent TOUJOURS leur maximum (2d4+2 → 10) : une
    // ressource dépensée ne doit pas décevoir sur un mauvais jet.
    const healAmount = maxRollOfFormula(formula);
    const updatedInventory = consumeFromInventory(character.inventory || []);
    const updatedHP = Math.min(character.hp.max, character.hp.current + healAmount);
    const updatedChar = { ...character, hp: { ...character.hp, current: updatedHP }, inventory: updatedInventory };

    onCharacterUpdate(updatedChar);
    syncCharacterCritical(updatedChar, 'hp');

    // Only mutate combat state if a fight is active: apply HP + spend the action.
    if (combatState.isActive) {
      const updatedCombatants = combatState.combatants.map(c => c.isPlayer ? { ...c, hp: { ...c.hp, current: updatedHP } } : c);
      setCombatState(isBonusPotion
        ? spendPlayerBonus({ ...combatState, combatants: updatedCombatants })
        : spendPlayerMainAction({ ...combatState, combatants: updatedCombatants }));
    }

    setPlayerRoll({ result: healAmount, reason: tr.consumesPotionLabel(name, healAmount) });
    await waitDice();
    logCombatRoll({ type: 'damage', name: `Used Potion: ${name}`, total: healAmount, formula, isDM: false });
    if (dm && isConnected) {
      await dm.sendUserMessage(`[SYSTEM] Player consumed potion ${name}. HP restored: ${healAmount}. Players HP is now ${updatedHP}/${character.hp.max}. Please narrate this action in character.`);
    }

    // Drinking a potion consumes the Action; the player ends the turn explicitly.
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}

export async function handlePlayerProposedAction(ctx: SessionContext, p: ProposedPlayerAction) {
    const { actionLockRef, character, combatState, dm, isConnected, language, logCombatRoll, maybeEndCombat, patchPlayerEconomy, removeProposedAction, setCombatState, setCurrentRoll, setIsResolvingAction, setPlayerRoll, setTranscript, showActionToast, spendPlayerBonus, syncCharacterCritical, tr } = ctx;

    const resolveProposedTargets = (state: any, spec?: string): string[] => {
      if (!spec) return [];
      const lower = String(spec).trim().toLowerCase();
      if (lower === 'all_enemies' || lower === 'all enemies' || lower === 'tous' || lower === 'tous les ennemis') {
        return state.combatants.filter((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0).map((c: any) => c.id);
      }
      const ids: string[] = [];
      for (const part of String(spec).split(',').map(s => s.trim()).filter(Boolean)) {
        const c = state.combatants.find((x: any) => x.id === part)
          || state.combatants.find((x: any) => x.name.toLowerCase() === part.toLowerCase() && x.hp.current > 0)
          || state.combatants.find((x: any) => x.name.toLowerCase() === part.toLowerCase());
        if (c && !ids.includes(c.id)) ids.push(c.id);
      }
      return ids;
    };

    if (actionLockRef.current) return;
    if (!combatState.isActive) { removeProposedAction(p.id); return; }
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      // État FRAIS du store, pas la valeur de rendu (elle peut retarder d'un tick).
      let state = useGameStore.getState().combatState;

      // 1. Consume the declared cost ('free' costs nothing).
      const e0 = getPlayerEconomy(state);
      if (p.cost === 'action') {
        if ((e0.attacksUsed ?? 0) >= (e0.attacksMax ?? 1)) {
          showActionToast(`⏳ ${language === 'fr' ? 'Plus d\'action ce tour' : 'No action left this turn'} — « ${p.label} »`);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paMainUsedFor(p.label)}]*` }]);
          removeProposedAction(p.id);
          return;
        }
        // PL7 — une carte improvisée coûte UN pip d'attaque (comme un coup),
        // pas la tranche d'action complète : spendPlayerMainAction vidait TOUS
        // les pips d'un guerrier à Extra Attack.
        state = patchPlayerEconomy(state, { attacksUsed: (e0.attacksUsed ?? 0) + 1 });
        setCombatState(state);
      } else if (p.cost === 'bonus_action') {
        if ((e0.bonusUsed ?? 0) >= (e0.bonusMax ?? 1)) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paBonusUsedFor(p.label)}]*` }]);
          removeProposedAction(p.id);
          return;
        }
        state = spendPlayerBonus(state);
        setCombatState(state);
      } else if (p.cost === 'reaction') {
        const consumed = consumeCombatAction(state, 'player', 'reaction');
        if (!consumed.success) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.paReactionUsedFor(p.label)}]*` }]);
          removeProposedAction(p.id);
          return;
        }
        state = consumed.state;
        setCombatState(state);
      }
      // p.cost === 'free' → nothing consumed

      // Trame : mémoriser l'attaque custom pour la ligne-résumé du combat.
      combatChronicle.addCustom(p.label);

      const summaries: string[] = [];

      // ── Anti-écrasement (audit 2026-08-12, même famille que le pipeline
      // d'outils) : l'ancienne version chaînait un `state` LOCAL à travers
      // jusqu'à N animations de 4 s puis committait TOUT À LA FIN — un appel
      // d'outil MJ concurrent pendant les dés était écrasé (ou écrasait la
      // décapitation). Désormais : relecture FRAÎCHE avant chaque mutation,
      // commit SYNCHRONE avant chaque animation, plus aucun commit après await.
      const liveState = () => useGameStore.getState().combatState;
      const commitDamage = (targetId: string, dmg: number, damageType?: string) => {
        const applied = applyDamageToEncounter(liveState(), targetId, dmg, damageType);
        if (applied.found) {
          setCombatState(applied.state);
          if (applied.npcConcentrationBroken) {
            const broken = applied.npcConcentrationBroken;
            const released = releaseNpcConcentrationEffect(applied.state, useGameStore.getState().character, broken);
            setCombatState(released.state);
            if (released.removedFromPlayer && released.character) syncCharacterCritical(released.character, 'hp');
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${language === 'fr' ? `${broken.casterName} perd sa concentration : ${broken.effectName} prend fin.` : `${broken.casterName} loses concentration: ${broken.effectName} ends.`}]*` }]);
          }
        }
        return applied;
      };
      const commitCondition = (targetId: string, condition: string) => {
        const cond = applyConditionToEncounter(liveState(), targetId, condition);
        if (cond.found) setCombatState(cond.state);
        return cond;
      };
      // Malus/bonus CHIFFRÉ sur la CIBLE (targetEffect de la carte) — lu par le
      // moteur via combatantEffectBonus, tick par rounds comme add_effect.
      const commitTargetEffect = (targetId: string) => {
        if (!p.targetEffect) return;
        const fx = {
          id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: p.label,
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: p.targetEffect.rounds,
          description: `${p.targetEffect.stat} ${p.targetEffect.bonus > 0 ? '+' : ''}${p.targetEffect.bonus} (${p.targetEffect.rounds} rounds)`,
          modifiers: [{ stat: p.targetEffect.stat as any, bonus: p.targetEffect.bonus }],
        };
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) => c.id === targetId
            ? { ...c, activeEffects: [...(c.activeEffects || []).filter((e: any) => e.name !== fx.name), fx] }
            : c),
        }));
        summaries.push(`${p.targetEffect.stat} ${p.targetEffect.bonus > 0 ? '+' : ''}${p.targetEffect.bonus} (${p.targetEffect.rounds}r)`);
      };

      if (p.resolution === 'attack') {
        const targetId = resolveProposedTargets(state, p.target)[0];
        if (!targetId) { summaries.push('aucune cible'); }
        else {
          const result = resolveAttackAction(state, {
            attacker: 'player', target: targetId,
            attackBonus: p.attackBonus, damageFormula: p.damageFormula, damageType: p.damageType,
            advantage: p.advantage, attackName: p.label, consumeAction: false,
          }, character);
          if (result.success && (result as any).advanced) {
            setCombatState(result.state);
            summaries.push(language === 'fr' ? 'se rapproche (loin → proche)' : 'closes in (far → near)');
          } else if (result.success && result.resolution) {
            const res = result.resolution;
            // Commit AVANT les animations : la fenêtre de combat reflète le
            // coup immédiatement et rien ne peut plus l'écraser pendant les dés.
            setCombatState(result.state);
            setPlayerRoll({ result: res.attackRoll.total, reason: `${p.label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
            await waitDice();
            logCombatRoll({ type: 'attack', name: p.label, total: res.attackRoll.total, formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`, isDM: false, success: res.hit });
            if (res.hit && res.damage > 0) {
              setPlayerRoll({ result: res.damage, reason: `${p.label} — ${tr.damage} : ${res.damage} ${res.damageType}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: false });
            }
            if (res.hit) {
              if (p.condition) commitCondition(targetId, p.condition);
              commitTargetEffect(targetId);
            }
            summaries.push(`${res.target} : ${res.hit ? `${res.damage} ${res.damageType}` : 'manqué'}`);
          }
        }
      } else if (p.resolution === 'save') {
        const dc = p.dc ?? 13;
        const ability = (p.saveAbility || 'DEX') as any;
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = liveState().combatants.find((c: any) => c.id === id);
          if (!target || target.hp.current <= 0) continue;
          const creatureData: any = lookupMonster(target.name) || getCreature(target.name);
          let saveBonus = 0;
          if (creatureData && 'saves' in creatureData && creatureData.saves?.[ability] !== undefined) saveBonus = creatureData.saves[ability];
          else if (creatureData && 'stats' in creatureData && creatureData.stats?.[ability] !== undefined) saveBonus = Math.floor((creatureData.stats[ability] - 10) / 2);
          const outcome = resolveRollPrompt(normalizeRollPrompt({ reason: `${target.name} : sauvegarde ${ability} vs ${p.label}`, formula: `1d20${saveBonus >= 0 ? '+' : ''}${saveBonus}`, dc }));
          // The ENEMY rolls this save → show it on the DM (red) overlay. setPlayerRoll
          // renders blue and silently drops isDM (its state has no isDM field), so the
          // enemy's save looked like a player roll.
          setCurrentRoll({ result: outcome.total, reason: `${target.name} — ${tr.saveWord} ${ability} (${outcome.success ? tr.saveSuccess : tr.saveFail})`, isDM: true, success: outcome.success });
          await waitDice();
          logCombatRoll({ type: 'save', name: `${target.name} : ${tr.saveWord} ${ability} ${tr.vs} ${p.label}`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}`, isDM: true, success: outcome.success });
          if (!outcome.success) {
            if (p.damageFormula) {
              const dmg = rollDice(p.damageFormula).total;
              commitDamage(id, dmg, p.damageType);
              setPlayerRoll({ result: dmg, reason: `${target.name} ${tr.takes} ${dmg} ${p.damageType || ''}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} → ${target.name}`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) commitCondition(id, p.condition);
            commitTargetEffect(id);
            summaries.push(`${target.name} : échec`);
          } else summaries.push(`${target.name} : réussite`);
        }
      } else if (p.resolution === 'check') {
        const ability = (p.checkAbility || 'STR') as any;
        const mod = Math.floor((getEffectiveStat(character, ability) - 10) / 2);
        const dc = p.dc ?? 13;
        const outcome = resolveRollPrompt(normalizeRollPrompt({ reason: `${p.label} (${tr.test} ${ability})`, formula: `1d20${mod >= 0 ? '+' : ''}${mod}`, dc, advantage: p.advantage }));
        setPlayerRoll({ result: outcome.total, reason: `${p.label} — ${tr.test} ${ability} (${outcome.success ? tr.checkSuccess : tr.checkFail})`, success: outcome.success });
        await waitDice();
        logCombatRoll({ type: 'check', name: `${p.label} (${ability})`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}`, isDM: false, success: outcome.success });
        if (outcome.success) {
          for (const id of resolveProposedTargets(state, p.target)) {
            const dmgTarget = liveState().combatants.find((c: any) => c.id === id);
            if (p.damageFormula) {
              const dmg = rollDice(p.damageFormula).total;
              commitDamage(id, dmg, p.damageType);
              // PL9 — les dégâts d'une improvisation réussie s'AFFICHENT
              // (overlay de dés) et remontent au HUD, comme une attaque.
              setPlayerRoll({ result: dmg, reason: `${p.label} → ${dmgTarget?.name || tr.target} : ${dmg} ${p.damageType || tr.damage}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} → ${dmgTarget?.name || tr.target}`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) commitCondition(id, p.condition);
            commitTargetEffect(id);
          }
        }
        summaries.push(outcome.success ? 'réussi' : 'raté');
      } else if (p.resolution === 'auto') {
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = liveState().combatants.find((c: any) => c.id === id);
          if (p.damageFormula) {
            const dmg = rollDice(p.damageFormula).total;
            commitDamage(id, dmg, p.damageType);
            setPlayerRoll({ result: dmg, reason: `${p.label} → ${target?.name} : ${dmg} ${p.damageType || ''}` });
            await waitDice();
            logCombatRoll({ type: 'damage', name: `${p.label} → ${target?.name || tr.target}`, total: dmg, formula: p.damageFormula, isDM: false });
          }
          if (p.condition) commitCondition(id, p.condition);
          commitTargetEffect(id);
          summaries.push(`${target?.name || 'cible'} : touché`);
        }
      } else if (p.resolution === 'effect') {
        if (p.selfModifier) {
          const modifier = normalizeStoryModifier({
            source: 'dm_inspiration', name: p.label,
            mode: p.selfModifier.mode || 'normal',
            bonus: p.selfModifier.bonus ?? 0,
            scope: p.selfModifier.scope || 'attack',
            uses: p.selfModifier.uses ?? 1,
          });
          {
            // Fiche FRAÎCHE (même famille de correctifs que GS2/GS13).
            const liveChar = useGameStore.getState().character || character;
            syncCharacterCritical({ ...liveChar, storyModifiers: [...(liveChar.storyModifiers || []), modifier].slice(-8) }, 'hp');
          }
          summaries.push(`${modifier.name} : ${modifier.mode}${modifier.bonus ? ` ${modifier.bonus > 0 ? '+' : ''}${modifier.bonus}` : ''} (${modifier.remainingUses}×)`);
        } else summaries.push('effet appliqué');
      }

      // Chaque mutation a déjà été commitée en synchrone AVANT son animation —
      // plus de commit tardif à écraser. On synchronise juste la fiche du
      // joueur sur l'ÉTAT FRAIS si ses PV ont bougé.
      const finalState = liveState();
      const playerCombatant = finalState.combatants.find((c: any) => c.isPlayer);
      const liveChar = useGameStore.getState().character;
      if (playerCombatant && liveChar && playerCombatant.hp.current !== liveChar.hp.current) {
        syncCharacterCritical({ ...liveChar, hp: { ...liveChar.hp, current: playerCombatant.hp.current } }, 'hp');
      }

      removeProposedAction(p.id);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎬 ${p.label}]*` }]);
      if (dm && isConnected) {
        await dm.sendUserMessage(`[SYSTEM] Player triggered improvised action "${p.label}" (${p.resolution}, cost ${p.cost}): ${summaries.join(' | ') || 'resolved'}. Narrate it vividly. Do NOT advance the turn — the player ends their own turn.`);
      }
      maybeEndCombat(liveState());
      // Intentionally NOT ending the turn here (explicit "Terminer mon tour").
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}
