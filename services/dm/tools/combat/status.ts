/** Points de vie et etats : PV du heros et des creatures, conditions posees
 *  et retirees, effets temporaires dates sur l'horloge du monde. */
/** Les outils du combat : jets demandes au joueur, rencontre, attaques, degats, etats, sorts a la voix, actions proposees.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../../store/gameStore';
import { foldText } from '../../../../engine/skillSystem';
import { campaignEventLog } from '../../../../services/persistence/campaignEventLog';
import { applyConditionToCharacter, applyConditionToEncounter, applyCharacterHP, applyEffectArgs, resolveCombatantReference, updateEnemyHP } from '../../../../engine/rulesEngine';
import { lookupCondition, lookupSpell } from '../../../../engine/codexService';
import { stringArg } from '../shared';
import type { ToolContext } from '../context';

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
export async function add_effect(args: any, ctx: ToolContext) {
    const { d, store , sysText } = ctx;
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
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysEffectAddedOn(lookup.combatant!.name, args.name, args.stat)}]*` }]);
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysEffectAdded(args.name, args.stat)}]*` }]);
    return { success: true };
}
