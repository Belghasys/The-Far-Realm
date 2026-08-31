/** Les coups portes : le jet demande au joueur (avec le modificateur lu sur
 *  sa fiche, pas invente), l'attaque resolue par le moteur, et les degats
 *  appliques (resistances, concentration, jets de mort). */
/** Les outils du combat : jets demandes au joueur, rencontre, attaques, degats, etats, sorts a la voix, actions proposees.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../../store/gameStore';
import { getEffectiveStat, getRollBonus, getGearSkillBonus } from '../../../../types';
import { getCheckModifier, canonicalSkillName, SKILL_TRANSLATIONS, gearAdvantageFor, armorStealthPenalty, foldText } from '../../../../engine/skillSystem';
import { campaignEventLog } from '../../../../services/persistence/campaignEventLog';
import { waitDice } from '../../../../services/media/diceTiming';
import { auditBus } from '../../../../services/infra/auditBus';
import { combatantSide, applyDamageToCharacter, applyDamageToEncounter, applyStoryModifiersToPrompt, normalizeRollPrompt, resolveCombatantReference, resolveAttackAction } from '../../../../engine/rulesEngine';
import { lookupSpell, structureInventoryItem } from '../../../../engine/codexService';
import { classSavePassives, classCheckPassives, deriveRollContext, applyDownedDamagePenalty, releaseNpcConcentrationEffect, formatDamageParts, getProficientSaves } from '../../../../engine/rulesEngine';
import { hideDC, isStealthCheck } from '../../../../engine/combat/stealth';
import { holdForRollResolution } from '../shared';
import type { ToolContext } from '../context';

export async function request_roll(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
    // One roll at a time: the same on-screen slot also carries
    // engine-initiated prompts (death saves, concentration).
    if (useGameStore.getState().activePrompt) {
        return { success: false, error: 'A roll is already pending on screen. Wait for its result before requesting another.' };
    }
    // AVANTAGE BINAIRE (audit du 2026-08-31) — le champ `advantage` est devenu
    // OBLIGATOIRE et ne vaut plus que 'ADV' ou 'NONE' : il sert à juger l'IDÉE
    // du joueur, jamais à le punir. Un 'DIS' envoyé par habitude est écarté
    // ICI, avant tout le reste. Le désavantage n'est pas perdu pour autant :
    // il continue d'arriver plus bas, calculé par le moteur à partir des
    // conditions (empoisonné, effrayé, épuisement), de l'armure bruyante et de
    // l'équipement — des règles, pas de l'humeur du MJ. Une pénalité VOULUE et
    // nommée reste possible via apply_complication.
    // Test sur place plutôt qu'exporter le normalisateur du moteur : ici on ne
    // veut PAS sa tolérance (il comprend 'dis', 'désavantage'…), on veut
    // exactement l'inverse — ne laisser passer que l'avantage.
    const mjVeutAvantage = /adv/i.test(String(args?.advantage ?? ''));
    const basePrompt = normalizeRollPrompt({ ...args, advantage: mjVeutAvantage ? 'ADV' : 'NONE' });
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
    // CACHÉ (2026-08-31) — en combat, se cacher n'est pas un DD d'humeur : c'est
    // la perception passive du plus attentif des ennemis VIVANTS. La même action
    // est facile face à des gobelins (9) et presque vaine face à une liche (19).
    // Hors combat, le DD reste au MJ : il seul sait de QUI le héros se cache.
    if (store.combatState.isActive && isStealthCheck(prompt)) {
        const watch = hideDC(store.combatState.combatants as any);
        prompt.dc = watch.dc;
        prompt.contextReasons = [
            ...(prompt.contextReasons || []),
            watch.watcher
                ? `Hiding: DC ${watch.dc} — passive Perception of ${watch.watcher}`
                : `Hiding: DC ${watch.dc}`,
        ];
    }
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
        store.pushCombatRoll({ name: `${resolvedName} : ${sysLine('dégâts', 'damage')}`, total: amount, formula: String(args.damageType || ''), isDM: true });
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
