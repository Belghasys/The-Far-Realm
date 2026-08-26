/**
 * Le joueur utilise une capacite de classe (hotbar BG3) : rage, second
 * souffle, imposition des mains, attaque sournoise, renvoi des morts-vivants…
 * en combat comme hors combat.
 *
 * Extrait de components/session/GameSession.tsx le 2026-08-25 (R4 du
 * rangement), corps inchange ; ce qu'il capturait vient de SessionContext.
 */
import { useGameStore } from '../../store/gameStore';
import { getEffectiveStat, getPlayerAttackModifier, getPlayerDamageBonus, getPlayerAttackCount } from '../../types';
import { combatantSide } from '../../engine/combatants';
import { resolveRollPrompt, resolveAttackAction, normalizeRollPrompt, applyDamageToEncounter, applyConditionToEncounter, normalizeStoryModifier, rageEffect, monkMartialArtsDie, spendSpellSlot } from '../../engine/rulesEngine';
import type { ClassAbilityId } from '../../components/combat/CombatActionsPanel';
import { getCreature } from '../../data/bestiary';
import { lookupMonster } from '../../engine/codexService';
import { rollDice } from '../../engine/utils';
import { waitDice } from '../media/diceTiming';
import type { SessionContext } from './context';

export async function handleUseClassAbility(ctx: SessionContext, abilityId: ClassAbilityId, targetId?: string) {
    const { actionLockRef, dm, guardPlayerAction, isConnected, language, logCombatRoll, maybeEndCombat, patchPlayerEconomy, setCombatState, setIsResolvingAction, setPlayerRoll, setTranscript, spendPlayerBonus, spendPlayerMainAction, spendResource, syncCharacterCritical, tr } = ctx;
    if (actionLockRef.current) return;
    if (guardPlayerAction()) return;
    // Hotbar BG3 : utilisable AUSSI hors combat (Imposition des mains,
    // Second souffle, Inspiration bardique, familier…). Les capacités qui
    // exigent l'économie de tour restent verrouillées en combat.
    const inCombat = useGameStore.getState().combatState.isActive;
    if (!inCombat && ['actionSurge', 'kiFlurry', 'kiPatientDefense', 'cunningDash', 'superiorityStrike'].includes(abilityId)) return;
    const patchCombat = (value: any) => { if (inCombat) setCombatState(value); };
    const char = useGameStore.getState().character;
    if (!char) return;
    const res: any = char.resources || {};
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      if (abilityId === 'rage' && (res.rage?.current ?? 0) > 0) {
        const effect = rageEffect();
        const updated = spendResource({ ...char, activeEffects: [...(char.activeEffects || []), effect] }, 'rage');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 RAGE — +2 dégâts, résistance aux dégâts physiques (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] The player enters a RAGE (bonus action): +2 damage, resistance to physical damage. Narrate the fury briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'secondWind' && (res.secondWind?.current ?? 0) > 0) {
        const heal = rollDice(`1d10+${char.level || 1}`).total;
        const nextHP = Math.min(char.hp.max, char.hp.current + heal);
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'secondWind');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilitySecondWindLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilitySecondWindLabel, total: heal, formula: `1d10+${char.level}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Second Wind (bonus action) and regained ${heal} HP (now ${nextHP}/${char.hp.max}). Narrate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'actionSurge' && (res.actionSurge?.current ?? 0) > 0) {
        const extra = getPlayerAttackCount(char);
        syncCharacterCritical(spendResource(char, 'actionSurge'), 'hp');
        patchCombat((prev: any) => {
          const econ = prev.actionEconomy?.['player'] || {};
          return patchPlayerEconomy(prev, { attacksMax: (econ.attacksMax ?? extra) + extra });
        });
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ Sursaut d'action — +${extra} attaque(s) ce tour]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used ACTION SURGE: ${extra} extra attack(s) this turn. Narrate the burst of speed. Do NOT advance the turn.`);
      } else if (abilityId === 'layOnHands' && (res.layOnHands?.current ?? 0) > 0) {
        const missing = char.hp.max - char.hp.current;
        const heal = Math.min(res.layOnHands.current, missing);
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'layOnHands', heal);
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilityLayOnHandsLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilityLayOnHandsLabel, total: heal, formula: `${language === 'fr' ? 'réserve' : 'pool'} -${heal}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Lay on Hands (action) and healed ${heal} HP (now ${nextHP}/${char.hp.max}; pool left ${updated.resources?.layOnHands?.current ?? 0}). Narrate the divine touch. Do NOT advance the turn.`);
      } else if (abilityId === 'bardicInspiration' && (res.bardicInspiration?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const die = lvl >= 15 ? 'd12' : lvl >= 10 ? 'd10' : lvl >= 5 ? 'd8' : 'd6';
        const bonus = Math.min(5, lvl >= 15 ? 6 : lvl >= 10 ? 5 : lvl >= 5 ? 4 : 3);
        const modifier = normalizeStoryModifier({
          source: 'dm_inspiration',
          name: `${tr.abilityBardicLabel} (${die})`,
          mode: 'normal',
          bonus,
          uses: 1,
          scope: 'any',
          reason: language === 'fr' ? 'Inspiration bardique auto-accordée' : 'Self-granted Bardic Inspiration',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'bardicInspiration');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎵 ${tr.abilityBardicLabel} (${die}) — +${bonus} sur un prochain jet]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player banked a Bardic Inspiration (${die}) on themselves (bonus action). Narrate the flourish. Do NOT advance the turn.`);
      } else if (abilityId === 'kiFlurry' && (res.ki?.current ?? 0) > 0) {
        let state = useGameStore.getState().combatState;
        let target = state.combatants.find((c: any) => c.id === targetId);
        if (!target || target.hp.current <= 0) {
          target = state.combatants.find((c: any) => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
        }
        if (!target) return;
        const unarmed = {
          name: language === 'fr' ? 'Frappe à mains nues' : 'Unarmed Strike',
          damage: monkMartialArtsDie(char.level || 1),
          damageType: 'bludgeoning',
          abilityMod: 'DEX' as const,
          attackBonus: 0,
          properties: ['finesse'],
        };
        const atkBonus = getPlayerAttackModifier({ ...char, weapon: unarmed as any });
        const dmgBonus = getPlayerDamageBonus({ ...char, weapon: unarmed as any });
        syncCharacterCritical(spendResource(char, 'ki'), 'hp');
        const hits: string[] = [];
        for (let strike = 1; strike <= 2; strike++) {
          const result = resolveAttackAction(state, {
            attacker: 'player',
            target: target.id,
            attackBonus: atkBonus,
            damageFormula: `${unarmed.damage}${dmgBonus >= 0 ? '+' : ''}${dmgBonus}`,
            damageType: 'bludgeoning',
            attackName: `${tr.abilityFlurryLabel} ${strike}/2`,
            consumeAction: false,
          } as any, char);
          if (result.success && (result as any).advanced) { state = result.state; break; }
          if (!result.success || !result.resolution) break;
          const resAtk = result.resolution;
          state = result.state;
          setPlayerRoll({ result: resAtk.attackRoll.total, reason: `${tr.abilityFlurryLabel} ${strike}/2 ${tr.vs} ${resAtk.target} (${resAtk.hit ? tr.hit : tr.miss})`, success: resAtk.hit });
          await waitDice();
          logCombatRoll({ type: 'attack', name: `${tr.abilityFlurryLabel} ${strike}/2`, total: resAtk.attackRoll.total, formula: `${resAtk.attackRoll.die} + ${resAtk.attackRoll.modifier} = ${resAtk.attackRoll.total} ${tr.vs} ${tr.ac} ${resAtk.attackRoll.prompt.dc}`, isDM: false, success: resAtk.hit });
          if (resAtk.hit && resAtk.damage > 0) {
            logCombatRoll({ type: 'damage', name: `${tr.abilityFlurryLabel} (${tr.damage})`, total: resAtk.damage, formula: resAtk.damageFormula, isDM: false });
          }
          hits.push(resAtk.hit ? `${resAtk.damage} dmg` : 'miss');
          if (resAtk.targetHP.current <= 0) break;
        }
        state = spendPlayerBonus(state);
        patchCombat(state);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on Flurry of Blows (bonus action): two unarmed strikes on ${target.name} → ${hits.join(', ')}. Narrate the flurry. Do NOT advance the turn.`);
        maybeEndCombat(useGameStore.getState().combatState);
      } else if (abilityId === 'kiPatientDefense' && (res.ki?.current ?? 0) > 0) {
        const dodgeEffect = {
          id: `dodge-${Date.now()}`,
          name: 'Dodge',
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: tr.dodgeDesc,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== 'Dodge'), dodgeEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🛡️ ${tr.abilityPatientLabel} (1 ki) — Esquive jusqu'à ton prochain tour]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on Patient Defense (bonus action): Dodge until their next turn. Narrate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'familiarHelp' && char.familiar && (res.familiarHelp?.current ?? 0) > 0) {
        const fam = char.familiar;
        const modifier = normalizeStoryModifier({
          source: 'tactic',
          name: language === 'fr' ? `Aide du familier (${fam.name})` : `Familiar's Help (${fam.name})`,
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Le familier harcèle la cible' : 'The familiar harries the target',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'familiarHelp');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${fam.name} (${fam.kind}) harcèle l'ennemi — avantage sur ta prochaine attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] The player's familiar ${fam.name} (${fam.kind}) used the HELP action (bonus action): advantage on their next attack. Narrate the little creature darting at the foe. Do NOT advance the turn.`);
      } else if (abilityId === 'lucky' && (res.luckyPoints?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: language === 'fr' ? 'Chanceux' : 'Lucky',
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'any',
          reason: language === 'fr' ? 'Point de chance dépensé' : 'Luck point spent',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'luckyPoints');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🍀 Chanceux — avantage sur ton prochain jet (${updated.resources?.luckyPoints?.current ?? 0} restant(s))]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent a Lucky point: advantage on their next roll. Narrate the twist of fate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'cunningHide') {
        const modifier = normalizeStoryModifier({
          source: 'tactic',
          name: language === 'fr' ? 'Caché (Ruse)' : 'Hidden (Cunning)',
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Attaque depuis l\'ombre' : 'Striking from hiding',
        });
        const updated = { ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🫥 Ruse — caché : avantage sur ta prochaine attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Cunning Action to HIDE (bonus action): advantage on their next attack. Narrate them melting into cover. Do NOT advance the turn.`);
      } else if (abilityId === 'cunningDash') {
        const moveEffect = {
          id: `cunning-${Date.now()}`,
          name: language === 'fr' ? 'Désengagé' : 'Disengaged',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? 'Repli/Sprint — pas d\'attaques d\'opportunité ce round.' : 'Dash/Disengage — no opportunity attacks this round.',
          modifiers: [],
        };
        const updated = { ...char, activeEffects: [...(char.activeEffects || []).filter(e => e.name !== moveEffect.name), moveEffect] };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🏃 Ruse — Repli/Sprint : tu te repositionnes sans provoquer d'attaques]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Cunning Action to Dash/Disengage (bonus action): they reposition safely. Narrate the movement. Do NOT advance the turn.`);
      } else if (abilityId === 'channelPreserveLife' && (res.channelDivinity?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const halfMax = Math.floor(char.hp.max / 2);
        const heal = Math.min(5 * lvl, Math.max(0, halfMax - char.hp.current));
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${language === 'fr' ? 'Préserver la vie' : 'Preserve Life'} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: language === 'fr' ? 'Canalisation : Préserver la vie' : 'Channel Divinity: Preserve Life', total: heal, formula: `5 × ${lvl}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — Preserve Life (action): healed ${heal} HP (now ${nextHP}/${char.hp.max}). Narrate the holy light. Do NOT advance the turn.`);
      } else if (abilityId === 'channelGuidedStrike' && (res.channelDivinity?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: language === 'fr' ? 'Frappe guidée' : 'Guided Strike',
          mode: 'normal',
          bonus: 10,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Canalisation divine' : 'Channel Divinity',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ Frappe guidée — +10 sur ton prochain jet d'attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — Guided Strike: +10 on their next attack roll. Narrate the divine guidance briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'sorceryCreateSlot' && (res.sorceryPoints?.current ?? 0) >= 2) {
        const slots = { ...(char.spellSlots || {}) };
        const key = '1';
        slots[key] = { current: (slots[key]?.current ?? 0) + 1, max: Math.max(slots[key]?.max ?? 0, 1) };
        const updated = spendResource({ ...char, spellSlots: slots }, 'sorceryPoints', 2);
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ✨ Source de magie — emplacement de niveau 1 créé (2 pts de sorcellerie)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player converted 2 sorcery points into a level-1 spell slot (bonus action). Narrate the raw magic gathering. Do NOT advance the turn.`);
      } else if (abilityId === 'superiorityStrike' && (res.superiorityDice?.current ?? 0) > 0) {
        const die = (char.level || 1) >= 10 ? '1d10' : '1d8';
        const maneuverEffect = {
          id: `maneuver-${Date.now()}`,
          name: language === 'fr' ? 'Manœuvre' : 'Maneuver',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? `Dé de supériorité : +${die} de dégâts sur ta prochaine attaque d'arme.` : `Superiority die: +${die} damage on your next weapon hit.`,
          modifiers: [],
          onWeaponHit: { dice: die },
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== maneuverEffect.name), maneuverEffect],
        }, 'superiorityDice');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎲 Manœuvre — +${die} de dégâts sur tes attaques d'arme ce round]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed a Battle Master maneuver: +${die} damage on their weapon hits this round. Narrate the tactical setup briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'wildShape' && (res.wildShape?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const tempHP = 2 * lvl;
        const shapeEffect = {
          id: `wildshape-${Date.now()}`,
          name: language === 'fr' ? 'Forme sauvage' : 'Wild Shape',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr' ? `Forme animale — ${tempHP} PV temporaires absorbent les coups.` : `Beast form — ${tempHP} temporary HP soak damage.`,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          tempHP: Math.max((char as any).tempHP || 0, tempHP),
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== shapeEffect.name), shapeEffect],
        } as any, 'wildShape');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐻 Forme sauvage — ${tempHP} PV temporaires (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Wild Shape (action): beast form, ${tempHP} temporary HP. Ask what beast they become and narrate the transformation. Do NOT advance the turn.`);
      } else if (abilityId === 'divineSmite') {
        // ── CHÂTIMENT DIVIN : brûle l'emplacement de sort le PLUS BAS et pose un
        //    rider onWeaponHit (+2d8 radiants, +1d8 par niveau au-dessus du 1er).
        //    Le moteur ajoute déjà tout effet portant onWeaponHit à chaque coup.
        const lowest = Object.entries(char.spellSlots || {})
          .map(([key, pool]: [string, any]) => ({ key, level: Number(String(key).replace(/\D/g, '')) || 1, current: pool?.current ?? 0 }))
          .filter(s => s.current > 0)
          .sort((a, b) => a.level - b.level)[0];
        if (!lowest) return;
        const spent = spendSpellSlot(char, lowest.level, lowest.level);
        if (spent.error) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${tr.abilitySmiteLabel} — ${spent.error}]*` }]);
          return;
        }
        const dice = Math.min(5, 1 + lowest.level); // 2d8 au niveau 1, +1d8 par niveau, max 5d8
        const smiteEffect = {
          id: `smite-${Date.now()}`,
          name: tr.abilitySmiteLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? `Ta prochaine attaque d'arme réussie inflige +${dice}d8 dégâts radiants.`
            : `Your next weapon hit deals +${dice}d8 radiant damage.`,
          modifiers: [],
          // consumeOnHit : l'emplacement paie UN coup, pas tout le round.
          onWeaponHit: { dice: `${dice}d8`, damageType: 'radiant' as const, consumeOnHit: true },
        };
        const updated = {
          ...spent.character,
          activeEffects: [...(spent.character.activeEffects || []).filter(e => e.name !== smiteEffect.name), smiteEffect],
        };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚜️ ${tr.abilitySmiteLabel} — emplacement niv.${lowest.level} brûlé : +${dice}d8 radiants sur ta prochaine attaque réussie]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player charged a DIVINE SMITE by burning a level-${lowest.level} spell slot: their next weapon hit deals an extra ${dice}d8 radiant damage. Narrate the blade drinking holy light. Do NOT advance the turn.`);
      } else if (abilityId === 'recklessAttack') {
        // ── ATTAQUE TÉMÉRAIRE : avantage sur TOUTES ses attaques ce tour (pas
        //    seulement la première, d'où l'effet plutôt qu'un story modifier),
        //    et avantage aux ennemis contre lui jusqu'à son prochain tour.
        const recklessEffect = {
          id: `reckless-${Date.now()}`,
          name: tr.abilityRecklessLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? 'Avantage sur tes attaques ; les attaques contre toi ont l\'avantage jusqu\'à ton prochain tour.'
            : 'Advantage on your attacks; attacks against you have advantage until your next turn.',
          modifiers: [],
          grantsAttackAdvantage: true,
          grantsAttackersAdvantage: true,
        };
        const updated = {
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== recklessEffect.name), recklessEffect],
        };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🪓 ${tr.abilityRecklessLabel} — avantage sur tes attaques ce tour, mais tu t'exposes]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used RECKLESS ATTACK: advantage on their melee attacks this turn, and attacks against them have advantage until their next turn. Narrate the abandon. Do NOT advance the turn.`);
      } else if (abilityId === 'stunningStrike' && (res.ki?.current ?? 0) > 0) {
        // ── FRAPPE ÉTOURDISSANTE : la prochaine attaque réussie impose une
        //    sauvegarde de CON ; le MJ applique l'état via apply_condition.
        const dc = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.floor((getEffectiveStat(char, 'WIS') - 10) / 2);
        const stunEffect = {
          id: `stunning-${Date.now()}`,
          name: tr.abilityStunningLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? `Ta prochaine attaque réussie impose une sauvegarde de CON DD ${dc} ou la cible est étourdie.`
            : `Your next hit forces a CON save DC ${dc} or the target is stunned.`,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== stunEffect.name), stunEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 💥 ${tr.abilityStunningLabel} (1 ki) — prochaine attaque réussie : sauvegarde de CON DD ${dc} ou étourdi]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on STUNNING STRIKE: their NEXT successful weapon hit forces the target to make a CON save vs DC ${dc}. When you see the next player hit report, call request_roll for that CON save and, on a failure, apply_condition("stunned", <target>). Narrate the pressure-point strike. Do NOT advance the turn.`);
      } else if (abilityId === 'stepOfTheWind' && (res.ki?.current ?? 0) > 0) {
        const moveEffect = {
          id: `stepwind-${Date.now()}`,
          name: tr.abilityStepWindLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? 'Sprint + Désengagement : tu te déplaces sans provoquer d\'attaques, distance de saut doublée.'
            : 'Dash + Disengage: move without provoking, jump distance doubled.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== moveEffect.name), moveEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🍃 ${tr.abilityStepWindLabel} (1 ki) — Sprint + Désengagement]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on STEP OF THE WIND (bonus action): Dash and Disengage, jump distance doubled. Narrate the impossible agility. Do NOT advance the turn.`);
      } else if (abilityId === 'turnUndead' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── RENVOI DES MORTS-VIVANTS : sauvegarde de SAG par mort-vivant présent ;
        //    ceux qui échouent sont « effrayés » (le moteur applique l'état).
        const dc = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.floor((getEffectiveStat(char, 'WIS') - 10) / 2);
        let state = useGameStore.getState().combatState;
        const undead = state.combatants.filter((c: any) =>
          combatantSide(c) === 'enemy' && c.hp.current > 0
          && /undead|zombie|skelet|squelette|ghoul|goule|wight|spectre|specter|wraith|vampire|liche|lich|mort-vivant|revenant|ombre|shadow/i.test(c.name)
        );
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        const turned: string[] = [];
        const destroyed: string[] = [];
        // Destruction des morts-vivants (Clerc 5+) : un mort-vivant de FP ≤ seuil
        // qui RATE sa sauvegarde est réduit en poussière, pas seulement effrayé.
        const lvl = char.level || 1;
        const destroyCR = lvl >= 17 ? 4 : lvl >= 14 ? 3 : lvl >= 11 ? 2 : lvl >= 8 ? 1 : lvl >= 5 ? 0.5 : -1;
        for (const target of undead) {
          const save = resolveRollPrompt(normalizeRollPrompt({
            type: 'SAVE',
            name: `${target.name} — WIS save vs ${tr.abilityTurnUndeadLabel}`,
            formula: '1d20+0',
            dc,
          } as any));
          logCombatRoll({ type: 'save', name: `${target.name} — ${tr.abilityTurnUndeadLabel}`, total: save.total, formula: `vs DD ${dc}`, isDM: true, success: save.success });
          if (!save.success) {
            const creatureInfo = getCreature(target.name);
            if (creatureInfo && destroyCR >= 0 && creatureInfo.cr <= destroyCR) {
              const smited = applyDamageToEncounter(state, target.id, target.hp.current, 'radiant');
              if (smited.found) { state = smited.state; destroyed.push(target.name); continue; }
            }
            const applied = applyConditionToEncounter(state, target.id, 'frightened');
            if (applied.found) { state = applied.state; turned.push(target.name); }
          }
        }
        patchCombat(spendPlayerMainAction(state));
        const outcomeText = [
          destroyed.length ? `${destroyed.join(', ')} DÉTRUIT(S)` : '',
          turned.length ? `${turned.join(', ')} fuient` : '',
        ].filter(Boolean).join(' ; ') || (undead.length ? 'aucun mort-vivant renvoyé' : 'aucun mort-vivant présent');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ✝️ ${tr.abilityTurnUndeadLabel} (DD ${dc}) — ${outcomeText}]*` }]);
        maybeEndCombat(useGameStore.getState().combatState);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — TURN UNDEAD (action, DC ${dc}). ${destroyed.length ? `DESTROYED outright (CR ≤ ${destroyCR}): ${destroyed.join(', ')}. ` : ''}${turned.length ? `Frightened and fleeing: ${turned.join(', ')}. ` : ''}${!destroyed.length && !turned.length ? (undead.length ? 'Every undead resisted.' : 'No undead present — the holy symbol blazes for nothing.') : ''} Already resolved — narrate it, do NOT re-roll. Do NOT advance the turn.`);
      } else if (abilityId === 'eldritchMind' && (res.pactFocus?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: tr.abilityPactFocusLabel,
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Le patron guide la main de son élu' : 'The patron steadies its chosen',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'pactFocus');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 👁️ ${tr.abilityPactFocusLabel} — avantage sur ta prochaine attaque de sort]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player called on their patron (Pact Focus, bonus action): advantage on their next spell attack. Narrate the patron's cold attention. Do NOT advance the turn.`);
      } else if (abilityId === 'naturalRecovery' && (res.naturalRecovery?.current ?? 0) > 0) {
        // ── RÉCUPÉRATION NATURELLE : rend des emplacements dont la somme des
        //    niveaux vaut ⌈niveau/2⌉ (du plus haut au plus bas, jamais niv. 6+).
        let budget = Math.ceil((char.level || 1) / 2);
        const slots = { ...(char.spellSlots || {}) };
        let recovered = 0;
        for (let lvl = 5; lvl >= 1; lvl--) {
          const key = String(lvl);
          while (slots[key] && slots[key].current < slots[key].max && budget >= lvl) {
            slots[key] = { ...slots[key], current: slots[key].current + 1 };
            budget -= lvl;
            recovered += 1;
          }
        }
        if (!recovered) return;
        const updated = spendResource({ ...char, spellSlots: slots }, 'naturalRecovery');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌿 ${tr.abilityNaturalRecoveryLabel} — ${tr.slotsRecovered(recovered)}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Natural Recovery and regained ${recovered} spell slot(s) by drawing on the land. Narrate the communion with nature. Do NOT advance the turn.`);
      } else if (abilityId === 'divineSense' && (res.divineSense?.current ?? 0) > 0) {
        // ── PERCEPTION DIVINE (Paladin) : le MJ doit répondre HONNÊTEMENT —
        //    capacité de campagne autant que de combat.
        const updated = spendResource(char, 'divineSense');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 👁️ ${tr.abilityDivineSenseLabel} — célestes, fiélons et morts-vivants à 18 m révélés]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used DIVINE SENSE (action). You MUST answer honestly: reveal the presence, direction and type of every celestial, fiend or undead within 60 ft (even disguised, hidden or possessing someone), or state clearly that there are none. Consecrated/desecrated places also register. Do NOT advance the turn.`);
      } else if (abilityId === 'sacredWeapon' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── ARME SACRÉE (Serment de Dévotion) : +CHA aux jets d'attaque, 10 rounds.
        const chaBonus = Math.max(1, Math.floor((getEffectiveStat(char, 'CHA') - 10) / 2));
        const weaponEffect = {
          id: `sacred-${Date.now()}`,
          name: tr.abilitySacredWeaponLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr'
            ? `Ton arme rayonne d'une lumière sacrée : +${chaBonus} aux jets d'attaque.`
            : `Your weapon blazes with holy light: +${chaBonus} to attack rolls.`,
          modifiers: [{ stat: 'attackBonus' as const, bonus: chaBonus }],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== weaponEffect.name), weaponEffect],
        }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚜️ ${tr.abilitySacredWeaponLabel} — +${chaBonus} aux jets d'attaque (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — SACRED WEAPON: +${chaBonus} to weapon attack rolls for 1 minute; the weapon sheds bright holy light. Narrate the radiance. Do NOT advance the turn.`);
      } else if (abilityId === 'vowOfEnmity' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── VŒU D'INIMITIÉ (Serment de Vengeance) : avantage sur les attaques.
        const state0 = useGameStore.getState().combatState;
        const foe = state0.combatants.find((c: any) => c.id === targetId) || state0.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        const vowEffect = {
          id: `vow-${Date.now()}`,
          name: tr.abilityVowLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr'
            ? `Serment juré contre ${foe?.name || 'ton ennemi'} : avantage sur tes attaques (10 rounds).`
            : `Sworn against ${foe?.name || 'your foe'}: advantage on your attacks (10 rounds).`,
          modifiers: [],
          grantsAttackAdvantage: true,
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== vowEffect.name), vowEffect],
        }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚔️ ${tr.abilityVowLabel} contre ${foe?.name || '?'} — avantage sur tes attaques (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player swore a VOW OF ENMITY against ${foe?.name || 'a foe'} (bonus action, Channel Divinity): advantage on their attack rolls against that creature for 1 minute. Narrate the oath's cold fire. Do NOT advance the turn.`);
      } else if (abilityId === 'naturesWrath' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── COURROUX DE LA NATURE (Serment des Anciens) : FOR save ou entravé.
        let state = useGameStore.getState().combatState;
        const foe = state.combatants.find((c: any) => c.id === targetId) || state.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!foe) return;
        const dcWrath = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.max(0, Math.floor((getEffectiveStat(char, 'CHA') - 10) / 2));
        const creatureData: any = getCreature(foe.name) || lookupMonster(foe.name);
        const strBonus = creatureData?.stats?.STR !== undefined ? Math.floor((creatureData.stats.STR - 10) / 2) : 0;
        const save = resolveRollPrompt(normalizeRollPrompt({
          type: 'SAVE',
          name: `${foe.name} — STR save vs ${tr.abilityWrathLabel}`,
          formula: `1d20${strBonus >= 0 ? '+' : ''}${strBonus}`,
          dc: dcWrath,
        } as any));
        logCombatRoll({ type: 'save', name: `${foe.name} — ${tr.abilityWrathLabel}`, total: save.total, formula: `vs DD ${dcWrath}`, isDM: true, success: save.success });
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        if (!save.success) {
          const applied = applyConditionToEncounter(state, foe.id, 'restrained');
          if (applied.found) state = applied.state;
        }
        patchCombat(spendPlayerMainAction(state));
        setPlayerRoll({ result: save.total, reason: `${tr.abilityWrathLabel} ${tr.vs} ${foe.name} (${save.success ? tr.miss : tr.hit})`, success: !save.success });
        await waitDice();
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌿 ${tr.abilityWrathLabel} — ${foe.name} ${save.success ? 'se libère des lianes' : 'est ENTRAVÉ par les lianes spectrales'}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — NATURE'S WRATH on ${foe.name} (STR save ${save.total} vs DC ${dcWrath}): ${save.success ? 'the foe broke free' : 'the foe is RESTRAINED by spectral vines (attacks against it have advantage, its attacks have disadvantage)'}. Already resolved — narrate it, do NOT re-roll. Do NOT advance the turn.`);
      } else if (abilityId === 'cavalierChallenge' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── DÉFI DU CAVALIER : l'ennemi défié concentre ses assauts sur TOI
        //    (intention fixée dans le moteur — protège réellement les alliés).
        const state0 = useGameStore.getState().combatState;
        const foe = state0.combatants.find((c: any) => c.id === targetId) || state0.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!foe) return;
        const playerId = state0.combatants.find((c: any) => c.isPlayer)?.id || 'player';
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          enemyIntents: { ...(s.enemyIntents || {}), [foe.id]: playerId },
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🛡️ ${tr.abilityChallengeLabel} — ${foe.name} ne voit plus que toi]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player (Cavalier paladin) CHALLENGED ${foe.name} (bonus action, Channel Divinity): that enemy now focuses its attacks on the paladin — the engine has locked its target. Narrate the ringing challenge. Do NOT advance the turn.`);
      } else if (abilityId === 'divineIntervention' && (res.divineIntervention?.current ?? 0) > 0) {
        // ── INTERVENTION DIVINE (Clerc 10+) : d100 ≤ niveau → miracle.
        const roll = rollDice('1d100').total;
        const lvl = char.level || 1;
        const success = roll <= lvl;
        let updated = spendResource(char, 'divineIntervention');
        if (success) {
          const heal = Math.min(char.hp.max, char.hp.current + 5 * lvl);
          updated = { ...updated, hp: { ...updated.hp, current: heal } };
          patchCombat((s: any) => spendPlayerMainAction({
            ...s,
            combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: heal } } : c),
          }));
        } else {
          patchCombat((s: any) => spendPlayerMainAction(s));
        }
        syncCharacterCritical(updated, 'hp');
        setPlayerRoll({ result: roll, reason: `${tr.abilityInterventionLabel} — d100 ${tr.vs} ${lvl} (${success ? tr.hit : tr.miss})`, success });
        await waitDice();
        logCombatRoll({ type: 'check', name: tr.abilityInterventionLabel, total: roll, formula: `d100 ≤ ${lvl}`, isDM: false, success });
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${success ? '🌟 INTERVENTION DIVINE — ta divinité RÉPOND !' : `⚪ ${tr.abilityInterventionLabel} — le ciel reste silencieux (${roll} > ${lvl})`}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(success
          ? `[SYSTEM] DIVINE INTERVENTION SUCCEEDED (d100: ${roll} ≤ level ${lvl}). The player's deity personally intervenes — manifest a MIRACLE fitting the situation (the engine already restored ${5 * lvl} HP): turn the tide, banish a threat, reveal a truth. Make it AWE-INSPIRING and narrate it now.`
          : `[SYSTEM] Player attempted Divine Intervention and FAILED (d100: ${roll} > level ${lvl}). The heavens stay silent — narrate the unanswered prayer in one somber beat. Do NOT advance the turn.`);
      } else if (abilityId === 'primevalAwareness') {
        // ── CONSCIENCE PRIMITIVE (Rôdeur) : brûle un emplacement niv. 1 — le MJ
        //    répond honnêtement sur les créatures à 1,5 km.
        const spent = spendSpellSlot(char, 1, 1);
        if (spent.error) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${tr.abilityPrimevalLabel} — ${spent.error}]*` }]);
          return;
        }
        syncCharacterCritical(spent.character, 'hp');
        patchCombat((s: any) => spendPlayerMainAction(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${tr.abilityPrimevalLabel} — présence des créatures surnaturelles à 1,5 km révélée]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used PRIMEVAL AWARENESS (action, one level-1 slot). You MUST answer honestly: for each of these types — aberrations, celestials, dragons, elementals, fey, fiends, undead — state whether at least one is present within 1 mile (without revealing number or exact location). Do NOT advance the turn.`);
      } else if (abilityId === 'metaQuickened' && (res.sorceryPoints?.current ?? 0) >= 2) {
        // ── MÉTAMAGIE : SORT ACCÉLÉRÉ — marqueur consommé par le prochain cast.
        const marker = {
          id: `quickened-${Date.now()}`,
          name: 'Quickened Spell',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? 'Ton prochain sort ce tour coûte une action bonus.' : 'Your next spell this turn costs a bonus action.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== marker.name), marker],
        }, 'sorceryPoints', 2);
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ ${tr.abilityQuickenedLabel} (2 pts) — ton prochain sort coûte l'action bonus]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed QUICKENED SPELL (2 sorcery points): their next spell this turn costs a bonus action instead of an action. Narrate the gathering speed briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'metaHeightened' && (res.sorceryPoints?.current ?? 0) >= 3) {
        // ── MÉTAMAGIE : SORT INTENSIFIÉ — la cible sauvegarde avec désavantage.
        const marker = {
          id: `heightened-${Date.now()}`,
          name: 'Heightened Spell',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 2,
          description: language === 'fr' ? 'La cible de ton prochain sort à sauvegarde jette avec désavantage.' : 'The target of your next save-spell rolls with disadvantage.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== marker.name), marker],
        }, 'sorceryPoints', 3);
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌀 ${tr.abilityHeightenedLabel} (3 pts) — la prochaine sauvegarde ennemie se fera avec DÉSAVANTAGE]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed HEIGHTENED SPELL (3 sorcery points): the target of their next save-spell rolls its save with DISADVANTAGE. Narrate the tightening magic briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'wholenessOfBody' && (res.wholenessOfBody?.current ?? 0) > 0) {
        // ── PLÉNITUDE DU CORPS (Voie de la Paume) : soigne 3 × niveau.
        const heal = Math.min(3 * (char.level || 1), char.hp.max - char.hp.current);
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'wholenessOfBody');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilityWholenessLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilityWholenessLabel, total: heal, formula: `3 × ${char.level}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used WHOLENESS OF BODY (action) and healed ${heal} HP through inner ki (now ${nextHP}/${char.hp.max}). Narrate the meditative surge. Do NOT advance the turn.`);
      }
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
}
