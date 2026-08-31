/** L'attaque : resolution complete d'une attaque d'arme ou de monstre, degats sur la rencontre, concentration des PNJ. */
import { Combatant, combatantSide } from '../combatants';
import { getCreature } from '../../data/bestiary';
import { getCreatureAttacks } from '../monsterAttacks';
import { gearAdvantageFor } from '../skillSystem';
import { getSneakAttackDice } from '../../data/classFeatures';
import { ActiveEffect, CharacterSheet, CodexDamageType, getEffectiveAC, getEffectiveStat, getPlayerAttackModifier, getPlayerDamageBonus, isRangedWeapon, Item } from '../../types';
import { lookupMonster, normalizeDamageType } from '../codexService';
import { clampHP } from '../gameValidator';
import { rollDice } from '../utils';
import { combatantKey, consumeCombatAction, makeLog, resolveCombatantReference, startEncounter, syncCurrentTurn } from './encounter';
import { abilityMod, brutalCriticalDice, combatantEffectBonus, conditionFromEffect, damageAdjustment, deriveRollContext, hasFeatSpecial, mergeAdvantage, resolveRollPrompt } from './rolls';
import { AdvantageMode, AttackResolution, EncounterState, NpcConcentrationBreak, ResolvedMonsterAttack } from './types';

export function applyConcentrationReplacement(character: CharacterSheet, nextEffect: ActiveEffect): { character: CharacterSheet; removed: string[] } {
    if (!nextEffect.concentration) {
        return { character: { ...character, activeEffects: [...(character.activeEffects || []), nextEffect] }, removed: [] };
    }

    const activeEffects = character.activeEffects || [];
    const removed = activeEffects.filter(effect => effect.concentration).map(effect => effect.name);
    return {
        removed,
        character: {
            ...character,
            activeEffects: [
                ...activeEffects.filter(effect => !effect.concentration),
                nextEffect,
            ],
        },
    };
}
function normalizeAttackName(value?: string): string {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
function monsterAttacks(name: string): ResolvedMonsterAttack[] {
    const creature = getCreature(name);
    if (creature) return getCreatureAttacks(creature);
    return lookupMonster(name)?.attacks || [];
}
function resolveMonsterAttack(name: string, attackName?: string): { attack: ResolvedMonsterAttack | null; error?: string; available: string[] } {
    const attacks = monsterAttacks(name);
    const available = attacks.map(attack => attack.name);
    if (!attacks.length) return { attack: null, available };
    if (!attackName) return { attack: attacks[0], available };

    const wanted = normalizeAttackName(attackName);
    const attack = attacks.find(candidate => normalizeAttackName(candidate.name) === wanted)
        || attacks.find(candidate => {
            const candidateName = normalizeAttackName(candidate.name);
            return candidateName.includes(wanted) || wanted.includes(candidateName);
        });

    if (!attack) {
        return {
            attack: null,
            available,
            error: `Attack "${attackName}" not found for ${name}. Available attacks: ${available.join(', ') || 'none'}.`,
        };
    }

    return { attack, available };
}
export function applyDamageToEncounter(
    current: EncounterState,
    targetName: string,
    amount: number,
    damageType?: string
): { state: EncounterState; found: boolean; target?: Combatant; amountApplied?: number; mitigation?: 'normal' | 'resistant' | 'immune' | 'vulnerable'; ambiguous?: boolean; npcConcentrationBroken?: NpcConcentrationBreak } {
    const lookup = resolveCombatantReference(current, targetName);
    if (!lookup.combatant || lookup.ambiguous) {
        return { state: current, found: false, ambiguous: lookup.ambiguous };
    }

    let target: Combatant | undefined;
    let amountApplied = Math.max(0, amount);
    let mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' = 'normal';
    let npcConcentrationBroken: NpcConcentrationBreak | undefined;
    const combatants = current.combatants.map(c => {
        if (c.id === lookup.combatant!.id) {
            const adjusted = damageAdjustment(c, amount, damageType);
            amountApplied = adjusted.amountApplied;
            mitigation = adjusted.mitigation;

            let tempHP = c.tempHP || 0;
            let finalDamage = amountApplied;
            if (tempHP > 0) {
                if (finalDamage >= tempHP) {
                    finalDamage -= tempHP;
                    tempHP = 0;
                } else {
                    tempHP -= finalDamage;
                    finalDamage = 0;
                }
            }

            target = {
                ...c,
                tempHP,
                hp: { ...c.hp, current: clampHP(c.hp.current - finalDamage, c.hp.max) }
            };

            // Audit 2026-08-12 — concentration des PNJ : elle n'existait que
            // pour le héros (le Hold Person d'un ennemi ne se brisait jamais).
            // RAW : dégâts → CON save DD max(10, dégâts/2) ; 0 PV → perdue.
            if (target.concentratingOn && amountApplied > 0 && !target.isPlayer) {
                const conc = target.concentratingOn;
                if (target.hp.current <= 0) {
                    npcConcentrationBroken = { casterName: target.name, effectName: conc.effectName, targetId: conc.targetId, roll: 0, dc: 0, downed: true };
                    target = { ...target, concentratingOn: undefined };
                } else {
                    const dc = Math.max(10, Math.floor(amountApplied / 2));
                    const creatureData: any = lookupMonster(target.name) || getCreature(target.name);
                    let conBonus = 0;
                    if (creatureData && 'saves' in creatureData && creatureData.saves?.CON !== undefined) conBonus = creatureData.saves.CON;
                    else if (creatureData && 'stats' in creatureData && creatureData.stats?.CON !== undefined) conBonus = Math.floor((creatureData.stats.CON - 10) / 2);
                    const roll = Math.floor(Math.random() * 20) + 1 + conBonus;
                    if (roll < dc) {
                        npcConcentrationBroken = { casterName: target.name, effectName: conc.effectName, targetId: conc.targetId, roll, dc, downed: false };
                        target = { ...target, concentratingOn: undefined };
                    }
                }
            }
            return target;
        }
        return c;
    });

    const next = syncCurrentTurn({
        ...current,
        combatants,
        logs: target
            ? [...(current.logs || []), makeLog(`${target!.name} took ${amountApplied}${damageType ? ` ${damageType}` : ''} damage${mitigation !== 'normal' ? ` (${mitigation})` : ''}`, 'damage')]
            : current.logs,
    });

    return { state: next, found: true, target, amountApplied, mitigation, npcConcentrationBroken };
}
/** Un lanceur qui QUITTE le combat (fuite, reddition) emporte sa concentration :
 *  fiche de rupture à passer à releaseNpcConcentrationEffect, ou undefined s'il
 *  ne tenait aucun sort. Sans ça, un Hold Person restait sur le héros après la
 *  fuite de son auteur (la purge n'existait qu'à 0 PV). */
export function concentrationBreakOnDeparture(combatant: Combatant | undefined): NpcConcentrationBreak | undefined {
    const conc = combatant?.concentratingOn;
    if (!combatant || !conc) return undefined;
    return { casterName: combatant.name, effectName: conc.effectName, targetId: conc.targetId, roll: 0, dc: 0, downed: false };
}
/** Retire l'effet lié quand la concentration d'un PNJ tombe : sur le héros
 *  (activeEffects de la fiche) et/ou sur les combattants. Retourne les deux
 *  mises à jour ; l'appelant persiste. */
export function releaseNpcConcentrationEffect(
    state: EncounterState,
    character: CharacterSheet | null,
    broken: NpcConcentrationBreak
): { state: EncounterState; character: CharacterSheet | null; removedFromPlayer: boolean } {
    const nameMatches = (e: any) => String(e?.name || '').toLowerCase() === broken.effectName.toLowerCase();
    let removedFromPlayer = false;
    let nextCharacter = character;
    if (character && (!broken.targetId || state.combatants.find(c => c.id === broken.targetId)?.isPlayer)) {
        const effects = character.activeEffects || [];
        if (effects.some(nameMatches)) {
            nextCharacter = { ...character, activeEffects: effects.filter(e => !nameMatches(e)) };
            removedFromPlayer = true;
        }
    }
    const combatants = state.combatants.map(c => {
        const scoped = broken.targetId ? c.id === broken.targetId : true;
        if (!scoped || !(c.activeEffects || []).some(nameMatches)) return c;
        return { ...c, activeEffects: (c.activeEffects || []).filter(e => !nameMatches(e)) };
    });
    return { state: { ...state, combatants }, character: nextCharacter, removedFromPlayer };
}
export function parseItemAdditionalDamage(item: Item): { damage: string; damageType: CodexDamageType }[] {
    const effectText = (item.effect || '').toLowerCase();
    const nameText = item.name.toLowerCase();
    const combined = `${nameText} ${effectText}`;

    const parts: { damage: string; damageType: CodexDamageType }[] = [];

    // Find dice damage like "+1d6 fire", "+1d4 radiant", "1d6 cold", "+ 1d8 lightning", "plus 1d6 necrotic"
    const diceRegex = /(?:\+|\bplus\b)?\s*(\d+d\d+)\s*([a-zA-Z]+)/g;
    let match;
    while ((match = diceRegex.exec(combined)) !== null) {
        const dice = match[1];
        const rawType = match[2];
        const dmgType = normalizeDamageType(rawType);
        if (dmgType) {
            // Check if this is exactly the base weapon damage to avoid duplicating
            if (item.damageDice === dice && item.damageType === dmgType) {
                continue;
            }
            parts.push({ damage: dice, damageType: dmgType });
        }
    }

    // Find flat bonuses like "+2 fire damage", "+5 lightning", "plus 3 cold"
    const flatRegex = /(?:\+|\bplus\b)\s*(\d+)\s*([a-zA-ZÀ-ſ]+)(\s*(?:damage|d[ée]g[âa]ts))?/g;
    let flatMatch;
    // cb-m8 — mots de CARACTÉRISTIQUES (EN abrégés + FR) : « +2 Force » sur un
    // objet français est un bonus de FOR, pas un rider de dégâts de type force.
    // 'force' n'est accepté comme type de dégâts que suivi de damage/dégâts.
    const abilityWords = new Set(['ac', 'ca', 'str', 'dex', 'con', 'int', 'wis', 'cha',
        'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
        'force', 'dexterite', 'dextérité', 'sagesse', 'charisme']);
    while ((flatMatch = flatRegex.exec(combined)) !== null) {
        const flatVal = flatMatch[1];
        const rawType = flatMatch[2];
        const hasDamageWord = Boolean(flatMatch[3]);
        const dmgType = normalizeDamageType(rawType);
        if (dmgType) {
            if (abilityWords.has(rawType) && !hasDamageWord) {
                continue;
            }
            parts.push({ damage: flatVal, damageType: dmgType });
        }
    }

    return parts;
}
/**
 * L'assaillant est-il lui aussi en l'air ? Une créature volante (ou dotée
 * d'allonge) atteint une monture volante sans pénalité. Le bestiaire ne
 * structure pas le vol : on lit la fiche du codex quand elle existe, et à
 * défaut le nom de l'attaque (« Serres », « Talons »).
 */
function attackerIsAirborne(attacker: Combatant): boolean {
    const creature: any = getCreature(attacker.name) || lookupMonster(attacker.name);
    // `speed` est un NOMBRE (la marche) ; le vol n'est lisible que dans le
    // texte complet `speedStr` (« 40 ft., fly 80 ft. »).
    const speedText = String(creature?.speedStr ?? creature?.speedText ?? '');
    if (/\bfly\b|\bvol\b/i.test(speedText)) return true;
    if (creature?.flying === true || Number(creature?.flySpeed) > 0) return true;
    return /talon|serre|wing|aile|beak|bec/i.test(attacker.attack?.name || '');
}

export function resolveAttackAction(
    current: EncounterState,
    args: {
        attacker: string;
        target: string;
        attackBonus?: number;
        damageFormula?: string;
        damageType?: string;
        attackName?: string;
        advantage?: AdvantageMode;
        consumeAction?: boolean;
        kind?: 'action' | 'extraAttack';
        targetCoverBonus?: number;
        isMeleeAttack?: boolean;
        /** Opt-in -5/+10 (Great Weapon Master / Sharpshooter). Validated here. */
        powerAttack?: boolean;
        /** OU4 — bonus plat additionnel (story modifiers du MJ déjà consommés) :
         *  appliqué MÊME quand attackBonus est calculé par le moteur (omis). */
        flatBonusModifier?: number;
    },
    character?: CharacterSheet
): { success: boolean; error?: string; resolution?: AttackResolution; state: EncounterState; advanced?: { name: string; from: string; to: string } } {
    // autoResolve: when several combatants share a name (e.g. 3 "Goblin") and the
    // DM references one by bare name, deterministically pick a living match instead
    // of hard-rejecting (which stalled combat). An explicit id always wins first.
    const attackerLookup = resolveCombatantReference(current, args.attacker, { livingOnly: true, autoResolve: true });
    const targetLookup = resolveCombatantReference(current, args.target, { livingOnly: true, autoResolve: true });
    if (attackerLookup.ambiguous) return { success: false, error: `Ambiguous attacker "${args.attacker}". Use combatant id.`, state: current };
    if (targetLookup.ambiguous) return { success: false, error: `Ambiguous target "${args.target}". Use combatant id.`, state: current };
    const attacker = attackerLookup.combatant;
    const target = targetLookup.combatant;
    if (!attacker) return { success: false, error: 'Attacker not found', state: current };
    if (!target) return { success: false, error: 'Target not found', state: current };
    if (attacker.hp.current <= 0) return { success: false, error: 'Attacker is down', state: current };
    if (target.hp.current <= 0) return { success: false, error: 'Target is already down', state: current };

    const monsterAttackResult: { attack: ResolvedMonsterAttack | null; error?: string; available: string[] } =
        !attacker.isPlayer ? resolveMonsterAttack(attacker.name, args.attackName) : { attack: null, available: [] };
    // An unknown attackName only hard-fails when the caller gave us NOTHING to
    // fall back on. DM-spawned custom enemies (names absent from the bestiary)
    // and renamed attacks used to be rejected here, so the enemy turn silently
    // skipped every strike — the "monsters never deal damage" bug. When the
    // caller provides its own damageFormula/attackBonus, trust those numbers.
    if (!attacker.isPlayer && args.attackName && !monsterAttackResult.attack && !args.damageFormula) {
        return { success: false, error: monsterAttackResult.error || `Attack "${args.attackName}" not found for ${attacker.name}.`, state: current };
    }
    const monsterAttack = monsterAttackResult.attack;

    let state = current;
    if (args.consumeAction !== false) {
        // Extra Attack follow-ups consume 'extraAttack' (free), not the action.
        const consumeKind = args.kind === 'extraAttack' ? 'extraAttack' : 'action';
        const consumed = consumeCombatAction(state, combatantKey(attacker), consumeKind);
        if (!consumed.success) return { success: false, error: consumed.error, state };
        state = consumed.state;
    }

    const resolvedDamageType = attacker.isPlayer
        ? args.damageType || character?.weapon?.damageType || 'damage'
        : monsterAttack?.damageType || args.damageType || 'damage';
    // Melee unless the weapon is actually ranged. Une seule règle partagée
    // (isRangedWeapon) : nom EN/FR, propriété Munitions/Distance ou portée.
    const playerWeapon = character?.weapon;
    const playerIsRanged = isRangedWeapon(playerWeapon);
    // -5/+10 opt-in : Maître des armes de guerre (arme de mêlée lourde) ou
    // Tireur d'élite (arme à distance). Validé côté moteur — un flag envoyé
    // sans le feat ou avec la mauvaise arme est ignoré.
    const powerAttackActive = !!(args.powerAttack && attacker.isPlayer && character && (
        (playerIsRanged && hasFeatSpecial(character, 'ranged_power_attack')) ||
        (!playerIsRanged && hasFeatSpecial(character, 'heavy_weapon_power_attack')
            && (playerWeapon?.properties || []).some(p => /heavy|two-handed|lourde/i.test(String(p))))
    ));
    const rawAttackBonus = attacker.isPlayer
        ? Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : character ? getPlayerAttackModifier(character) : 0
        : monsterAttack ? monsterAttack.attackBonus : Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : 0;
    const attackBonus = rawAttackBonus
        + (powerAttackActive ? -5 : 0)
        // OU4 — story modifiers plats du MJ (grant_story_modifier) : avant, ils
        // n'étaient injectés que si l'appelant fournissait attackBonus — omis
        // (le cas recommandé), le bonus consommé se perdait sans effet.
        + (Number.isFinite(Number(args.flatBonusModifier)) ? Number(args.flatBonusModifier) : 0)
        // Buffs/debuffs chiffrés des alliés/ennemis (Frappe guidée sur un
        // compagnon, malédiction -2 attaque sur un chef…).
        + (attacker.isPlayer ? 0 : combatantEffectBonus(attacker, 'attackBonus'));
    const basePlayerDamageBonus = character ? getPlayerDamageBonus(character) + (powerAttackActive ? 10 : 0) : 0;
    const damageFormula = attacker.isPlayer && character
        ? (args.damageFormula
            ? `${args.damageFormula}${powerAttackActive ? '+10' : ''}`
            : `${character.weapon?.damage ?? '1d4'}${basePlayerDamageBonus >= 0 ? '+' : ''}${basePlayerDamageBonus}`)
        : monsterAttack?.damage || args.damageFormula || '1d6';
    let isMeleeAttack = args.isMeleeAttack ?? (attacker.isPlayer
        ? !playerIsRanged
        : !(monsterAttack?.range || monsterAttack?.ranged));

    // ── Bandes de distance (relatives au joueur) : melee / near / far ────────
    // La bande vit sur la ligne ENNEMIE (attaquant ennemi → sa bande ; joueur/
    // allié qui attaque → la bande de la cible). Absente = melee (anciens saves).
    const bandOf = (c: Combatant): 'melee' | 'near' | 'far' => (c as any).range || 'melee';
    const setBand = (st: EncounterState, cid: string, band: 'melee' | 'near' | 'far'): EncounterState => ({
        ...st,
        combatants: st.combatants.map(c => c.id === cid ? { ...c, range: band } as Combatant : c),
    });
    const stepDownAdvantage = (adv?: AdvantageMode): AdvantageMode =>
        adv === 'advantage' ? 'normal' : 'disadvantage';
    const weaponIsThrown = !!playerWeapon && (playerWeapon.properties || []).some(p => /thrown|jet/i.test(String(p)));
    const bandCarrier = combatantSide(attacker) === 'enemy' ? attacker : target;
    const band = bandOf(bandCarrier);
    let effectiveAdvantage: AdvantageMode | undefined = args.advantage;
    // Les bandes sont relatives au JOUEUR : elles ne contraignent que ses
    // attaques et celles des ennemis. Un allié/compagnon est abstrait (il se
    // trouve là où il doit être) — le laisser « engager » déplaçait la bande de
    // l'ennemi par rapport au joueur, ce qui n'a aucun sens.
    const bandGateApplies = attacker.isPlayer || combatantSide(attacker) === 'enemy';

    if (isMeleeAttack && band !== 'melee' && attacker.isPlayer && weaponIsThrown) {
        // Arme de JET utilisée à distance : l'attaque devient un lancer (à
        // distance), pas un engagement.
        isMeleeAttack = false;
    }
    let mountedCharge = false;
    // Charge montée : POSSÉDER une monture ne suffit pas — il faut être EN
    // SELLE (mount.mounted !== false ; absent = en selle, compat anciens
    // saves) et la monture présente au combat doit tenir debout. Sans ça,
    // chaque attaque de mêlée sur une cible lointaine devenait une charge
    // complète, à pied, tant qu'un cheval attendait à l'écurie.
    //
    // Le garde regarde la FICHE d'abord : une monture à 0 PV ne rejoint pas la
    // rencontre, donc `mountCombatant` était `undefined` et l'ancien test
    // (« la ligne existe et elle est à terre ») ne se déclenchait jamais — le
    // héros chargeait à dos de cadavre.
    const mountCombatant = character?.mount ? state.combatants.find(c => c.id === 'mount') : undefined;
    const mountAlive = !!character?.mount
        && (character.mount.hp?.current ?? 1) > 0
        && !(mountCombatant && mountCombatant.hp.current <= 0);
    const riddenMount = mountAlive && (character!.mount as any).mounted !== false;
    if (isMeleeAttack && bandGateApplies) {
        if (band === 'far') {
            // CHARGE MONTÉE : à dos de monture, le joueur fond sur une cible
            // lointaine et frappe dans la même action (loin → contact).
            if (attacker.isPlayer && riddenMount && character?.mount) {
                mountedCharge = true;
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges on ${character.mount.name} (far → melee)`, 'turn')] };
            } else {
                // Trop loin pour frapper : l'attaque devient l'ENGAGEMENT (far → near).
                const moved = setBand(state, bandCarrier.id, 'near');
                const log = makeLog(
                    `${attacker.name} closes the distance (far → near)${attacker.isPlayer ? ` toward ${target.name}` : ''}`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'far', to: 'near' },
                };
            }
        }
        if (band === 'near') {
            // NF4 — l'engagement n'est PLUS gratuit : fondre sur une cible « à
            // distance » consomme l'ACTION (near → melee), la frappe attend le
            // tour suivant. Loin = 2 actions, à distance = 1 action, contact =
            // frappe. Deux exceptions closent ET frappent en une action :
            // la CHARGE MONTÉE, et la CHARGE ENRAGÉE du Barbare (Rage active).
            const ragingCharge = attacker.isPlayer && !!character
                && character.class === 'Barbarian'
                && (character.activeEffects || []).some(e => e.name === 'Rage');
            if (attacker.isPlayer && riddenMount && character?.mount) {
                mountedCharge = true;
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges on ${character.mount.name} (near → melee)`, 'turn')] };
            } else if (ragingCharge) {
                state = setBand(state, bandCarrier.id, 'melee');
                state = { ...state, logs: [...(state.logs || []), makeLog(`${attacker.name} charges in a RAGE (near → melee) and strikes`, 'turn')] };
            } else {
                const moved = setBand(state, bandCarrier.id, 'melee');
                const log = makeLog(
                    `${attacker.name} closes the distance (near → melee)${attacker.isPlayer ? ` toward ${target.name}` : ''}`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'near', to: 'melee' },
                };
            }
        }
    } else if (!isMeleeAttack && bandGateApplies) {
        // NF4 — portée réelle des armes à distance : seules les armes à LONGUE
        // portée (arc long, arbalète lourde…) touchent une cible LOINTAINE ;
        // arc court, arbalète légère, fronde et armes de jet portent jusqu'à
        // « à distance ». Hors de portée, l'attaque devient un RAPPROCHEMENT.
        if (band === 'far') {
            const weaponName = attacker.isPlayer
                ? String(playerWeapon?.name || '')
                : String(args.attackName || monsterAttack?.name || '');
            const rangeText = attacker.isPlayer
                ? String(playerWeapon?.range || '')
                : String((monsterAttack as any)?.range || '');
            const normalRange = Number((rangeText.match(/(\d+)/) || [])[1]) || 0;
            const SHORT_RANGE_NAMES = /shortbow|arc court|light crossbow|arbal[eè]te l[ée]g[eè]re|sling|fronde|dagger|dague|javelin|javeline|handaxe|hachette|dart|fl[ée]chette/i;
            const LONG_RANGE_NAMES = /longbow|arc long|heavy crossbow|arbal[eè]te lourde/i;
            const longReach = LONG_RANGE_NAMES.test(weaponName)
                || (!SHORT_RANGE_NAMES.test(weaponName) && (
                    normalRange >= 100                      // notation en pieds (150/600…)
                    || (normalRange >= 30 && normalRange <= 60)  // notation en mètres (45/180…)
                    || normalRange === 0                    // portée inconnue : ne pas bloquer
                ));
            if (!longReach) {
                const moved = setBand(state, bandCarrier.id, 'near');
                const log = makeLog(
                    `${attacker.name} advances (far → near): ${weaponName || 'the weapon'} is short-ranged`,
                    'turn'
                );
                return {
                    success: true,
                    state: { ...moved, logs: [...(moved.logs || []), log] },
                    advanced: { name: bandCarrier.name, from: 'far', to: 'near' },
                };
            }
        }
        // Tir/jet à bout portant : désavantage si un hostile est AU CONTACT
        // (SRD : créature hostile à 1,50 m du tireur).
        const hostileAdjacent = attacker.isPlayer
            ? state.combatants.some(c => combatantSide(c) === 'enemy' && c.hp.current > 0 && bandOf(c) === 'melee')
            : bandOf(attacker) === 'melee';
        if (hostileAdjacent) {
            effectiveAdvantage = stepDownAdvantage(effectiveAdvantage);
        }
    }
    // The PLAYER's AC is live (Shield, Mage Armor, gear swaps mid-fight): the
    // combatant row only holds the snapshot taken at startEncounter, so casting
    // Shield used to change nothing against the automated enemy turns.
    // Non-joueurs : leurs effets actifs à modificateurs numériques (bénédiction
    // de CA sur un allié, malédiction -2 CA sur un boss…) s'appliquent AUSSI —
    // avant, seuls les effets du joueur avaient un impact chiffré.
    const targetAC = target.isPlayer && character
        ? getEffectiveAC(character)
        : target.ac + combatantEffectBonus(target, 'AC');
    const context = deriveRollContext({
        type: 'ATTACK',
        name: `${attacker.name} attacks ${target.name}`,
        formula: `1d20${attackBonus >= 0 ? '+' : ''}${attackBonus}`,
        dc: targetAC,
        advantage: effectiveAdvantage || 'normal',
        dmBonus: 0,
        requestedAt: Date.now(),
    }, {
        actorEffects: attacker.isPlayer ? character?.activeEffects : attacker.activeEffects,
        targetEffects: target.isPlayer ? character?.activeEffects : target.activeEffects,
        coverBonus: args.targetCoverBonus,
        isMeleeAttack,
    });
    // NF2 — avantage d'ÉQUIPEMENT sur les jets d'attaque (objet « advantage on
    // attack rolls »), fusionné comme les conditions.
    if (attacker.isPlayer && character) {
        const gearAttackAdv = gearAdvantageFor(character, 'attack');
        if (gearAttackAdv) {
            context.prompt.advantage = mergeAdvantage(context.prompt.advantage, 'advantage');
            context.prompt.contextReasons = [...(context.prompt.contextReasons || []), `${gearAttackAdv.source}: advantage on attacks`];
        }
    }
    // PL11 — objets DÉFENSIFS du joueur (cape de déplacement…) : quand le
    // joueur est la CIBLE, les attaquants subissent le désavantage.
    if (target.isPlayer && character) {
        const gearDefense = gearAdvantageFor(character, 'defense');
        if (gearDefense) {
            context.prompt.advantage = mergeAdvantage(context.prompt.advantage, 'disadvantage');
            context.prompt.contextReasons = [...(context.prompt.contextReasons || []), `${gearDefense.source}: attackers have disadvantage`];
        }
    }
    // MONTURE VOLANTE : en selle sur un griffon ou un pégase, le héros et sa
    // monture sont EN L'AIR. Un assaillant au sol frappe vers le haut, sur une
    // cible qui bouge : désavantage. `flying` n'avait jusque-là aucun effet
    // mécanique — une monture volante coûtait cher en fiction pour rien.
    // Un ennemi qui vole lui-même, ou qui tire, garde son jet normal.
    if (isMeleeAttack && !attacker.isPlayer && combatantSide(attacker) === 'enemy'
        && (target.isPlayer || target.id === 'mount')
        && character?.mount?.flying && (character.mount as any).mounted !== false
        && (character.mount.hp?.current ?? 1) > 0
        && !attackerIsAirborne(attacker)) {
        context.prompt.advantage = mergeAdvantage(context.prompt.advantage, 'disadvantage');
        context.prompt.contextReasons = [...(context.prompt.contextReasons || []), 'airborne mount: ground attackers strike upward'];
    }
    const attackRoll = resolveRollPrompt(context.prompt);
    const effectiveAC = attackRoll.prompt.dc;
    // Champion (Fighter archetype): Improved Critical — crits on 19-20, and
    // Superior Critical at level 15 — crits on 18-20.
    const critThreshold = attacker.isPlayer && character?.subclass === 'Champion'
        ? ((character.level || 1) >= 15 ? 18 : 19)
        : 20;
    // cb-m3 — RAW : un coup EN MÊLÉE qui touche une cible paralysée ou
    // inconsciente est automatiquement critique.
    // TP4 (contre-audit) — cible JOUEUR : fusionner fiche + ligne de combat comme
    // le fait déjà le bloc targetEffects ci-dessus (:1896) — apply_condition
    // n'écrit que sur la fiche, la ligne seule ratait la paralysie du héros.
    const helplessTarget = [
        ...(target.isPlayer ? (character?.activeEffects || []) : []),
        ...(target.activeEffects || []),
    ]
        .map(conditionFromEffect)
        .some(cond => cond && (cond.id === 'paralyzed' || cond.id === 'unconscious'));
    // RE3 (contre-audit) — RAW : seul le 20 naturel touche automatiquement.
    // Le seuil de critique étendu du Champion (19, puis 18 au niv. 15) n'élargit
    // que la plage de CRITIQUE des attaques qui touchent — un 19 naturel sous la
    // CA doit rater (avant : il touchait ET critiquait).
    const hit = attackRoll.die === 20 || (attackRoll.die !== 1 && attackRoll.total >= effectiveAC);
    const criticalHit = hit && (attackRoll.die >= critThreshold || (helplessTarget && isMeleeAttack));

    let damage = 0;
    let rawDamage = 0;
    let mitigation: AttackResolution['mitigation'] = 'normal';
    const resolvedDamageParts: NonNullable<AttackResolution['damageParts']> = [];
    // Riders à usage unique dépensés par ce coup (Châtiment divin).
    const consumedEffectIds: string[] = [];
    // Réaction défensive auto-déclenchée par ce coup (exposée à l'appelant).
    let reactionUsed: 'uncanny_dodge' | 'deflect_missiles' | undefined;
    let reactionAmountStart = 0;
    // Great Weapon Fighting: with a two-handed melee weapon, reroll damage dice
    // that show a 1 or 2 (once). Only for the player's main weapon part.
    const gwfActive = !!(attacker.isPlayer && character
        && (character as any).fightingStyle === 'Great Weapon Fighting'
        && (character.weapon?.properties || []).includes('two-handed'));
    // cb-m6 — « première attaque du tour » PARTAGÉE par tous les riders
    // 1×/tour : attacksUsed === 0 ET drapeau onceRiderUsed non consommé
    // (l'attaque bonus de Frénésie ne dépense pas attacksUsed).
    const onceRiderFree = (() => {
        const e: any = current.actionEconomy?.[combatantKey(attacker)];
        return !e || (!((e.attacksUsed ?? 0) > 0) && !e.onceRiderUsed);
    })();
    // Attaquant sauvage : 1×/tour (première attaque), on lance les dés d'arme
    // deux fois et on garde le meilleur total. Mêlée uniquement.
    const savageActive = !!(attacker.isPlayer && character && isMeleeAttack
        && hasFeatSpecial(character, 'savage_attacker')
        && onceRiderFree);
    if (hit) {
        const damageParts: { damage: string; damageType: CodexDamageType }[] = [];
        if (attacker.isPlayer && character) {
            damageParts.push({ damage: damageFormula, damageType: resolvedDamageType as CodexDamageType });
            if (character.inventory) {
                for (const item of character.inventory) {
                    if (item.equipped) {
                        const extraParts = parseItemAdditionalDamage(item);
                        damageParts.push(...extraParts);
                    }
                }
            }
            // Hunter (Ranger archetype): Colossus Slayer — once per turn, +1d8
            // when hitting a creature below its HP max. Approximated as "on the
            // first attack of the player's turn" via the action economy.
            if (character.subclass === 'Hunter' && target.hp.current < target.hp.max) {
                if (onceRiderFree) {
                    damageParts.push({ damage: '1d8', damageType: resolvedDamageType as CodexDamageType });
                }
            }
            // Riders génériques : tout effet actif portant onWeaponHit ajoute
            // ses dés à CHAQUE coup d'arme qui touche (Marque du chasseur, Hex,
            // Faveur divine, manœuvre de Maître de guerre…).
            for (const fx of character.activeEffects || []) {
                if (fx.onWeaponHit?.dice) {
                    damageParts.push({
                        damage: fx.onWeaponHit.dice,
                        damageType: (fx.onWeaponHit.damageType || resolvedDamageType) as CodexDamageType,
                    });
                    // Rider à usage unique (Châtiment divin) : signalé à
                    // l'appelant pour qu'il le retire après CE coup.
                    if (fx.onWeaponHit.consumeOnHit) consumedEffectIds.push(fx.id);
                }
            }
            // Rogue: Sneak Attack — once per turn when the strike lands with
            // advantage using a finesse or ranged weapon (solo-table reading of
            // the SRD trigger; no ally positioning to track). Scales by level.
            const weaponIsFinesse = (character.weapon?.properties || []).some(p => String(p).toLowerCase() === 'finesse');
            if (character.class === 'Rogue'
                && context.prompt.advantage === 'advantage'
                && (weaponIsFinesse || playerIsRanged)) {
                if (onceRiderFree) {
                    damageParts.push({ damage: getSneakAttackDice(character.level || 1), damageType: resolvedDamageType as CodexDamageType });
                }
            }
            // ── Riders de classe/sous-classe (SRD) auto-appliqués ──
            const playerLevel = character.level || 1;
            const isFirstAttackOfTurn = onceRiderFree;
            // Paladin 11+ — Châtiment divin amélioré : +1d8 radiant sur CHAQUE
            // coup de mêlée (en plus du Châtiment activable).
            if (character.class === 'Paladin' && playerLevel >= 11 && isMeleeAttack) {
                damageParts.push({ damage: '1d8', damageType: 'radiant' });
            }
            // Clerc 8+ (Guerre/Vie) — Frappe divine : +1d8 (1×/tour), 2d8 au 14.
            if (character.class === 'Cleric' && playerLevel >= 8 && isFirstAttackOfTurn
                && (character.subclass === 'War Domain' || character.subclass === 'Life Domain')) {
                damageParts.push({
                    damage: playerLevel >= 14 ? '2d8' : '1d8',
                    damageType: character.subclass === 'Life Domain' ? 'radiant' : resolvedDamageType as CodexDamageType,
                });
            }
            // Barbare Zélote 3+ — Furie divine : +1d6+⌊niv/2⌋ radiant sur la
            // première attaque de chaque tour pendant la rage.
            if (character.subclass === 'Zealot' && isFirstAttackOfTurn
                && (character.activeEffects || []).some(e => e.name === 'Rage')) {
                damageParts.push({ damage: `1d6+${Math.floor(playerLevel / 2)}`, damageType: 'radiant' });
            }
            // Paladin Cavalier — Charge fervente : +1d8 quand la frappe conclut
            // une charge montée (loin → contact dans la même action), qui passe
            // à +2d8 au niveau 15 (Charge inarrêtable). Le dé était figé à 1d8
            // sans jamais lire le niveau, alors que la fiche promet 2d8 — et
            // que la capacité de niveau 3 annonce « appliqué par le moteur ».
            if (character.subclass === 'Cavalier' && mountedCharge) {
                const chargeDice = playerLevel >= 15 ? '2d8' : '1d8';
                damageParts.push({ damage: chargeDice, damageType: resolvedDamageType as CodexDamageType });
            }
        } else if (!attacker.isPlayer && monsterAttack?.damageParts?.length) {
            // Monster data types damageType as a plain string; the values are valid
            // damage types ("slashing", "fire", …), so narrow to CodexDamageType.
            damageParts.push(...(monsterAttack.damageParts as { damage: string; damageType: CodexDamageType }[]));
        } else {
            damageParts.push({ damage: damageFormula, damageType: resolvedDamageType as CodexDamageType });
        }
        // Bonus de dégâts d'effets pour les non-joueurs (Rage d'un allié,
        // bénédiction +2 dégâts…) : greffé sur la première part.
        if (!attacker.isPlayer && damageParts.length) {
            const fxDamage = combatantEffectBonus(attacker, 'damageBonus');
            if (fxDamage !== 0) {
                damageParts[0] = { ...damageParts[0], damage: `${damageParts[0].damage}${fxDamage > 0 ? '+' : ''}${fxDamage}` };
            }
        }

        // ── RÉACTIONS DÉFENSIVES du joueur frappé (SRD, auto-appliquées) ──
        // Moine 3+ — Déviation de projectiles : un tir d'arme qui touche est
        // réduit de 1d10 + DEX + niveau (à 0 → projectile attrapé).
        // Roublard 5+ — Esquive instinctive : les dégâts d'un coup visible sont
        // divisés par deux. Les deux consomment LA réaction (une par round).
        let deflectPool = 0;
        if (combatantSide(attacker) === 'enemy' && target.isPlayer && character) {
            const econ = state.actionEconomy?.[combatantKey(target)];
            const reactionFree = !(econ?.reactionUsed);
            const lvl = character.level || 1;
            if (reactionFree && character.class === 'Monk' && lvl >= 3 && !isMeleeAttack) {
                deflectPool = rollDice(`1d10+${abilityMod(getEffectiveStat(character, 'DEX')) + lvl}`).total;
                reactionUsed = 'deflect_missiles';
            } else if (reactionFree && character.class === 'Rogue' && lvl >= 5) {
                reactionUsed = 'uncanny_dodge';
            }
            if (reactionUsed) {
                const consumed = consumeCombatAction(state, combatantKey(target), 'reaction');
                if (consumed.success) state = consumed.state;
                else reactionUsed = undefined; // réaction indisponible finalement
            }
        }
        reactionAmountStart = deflectPool;

        // Barbare 9+ — Critique brutal : dés d'arme SUPPLÉMENTAIRES sur un
        // critique (non doublés), greffés sur la part d'arme uniquement.
        // RE7 — RAW : attaques de MÊLÉE uniquement (une javeline lancée n'en profite pas).
        const brutalDice = attacker.isPlayer && character && criticalHit && isMeleeAttack ? brutalCriticalDice(character) : 0;

        for (let partIndex = 0; partIndex < damageParts.length; partIndex++) {
            const part = damageParts[partIndex];
            const damageRoll = rollDice(part.damage);
            // GWF reroll (main weapon part only): any die showing 1 or 2 is rerolled
            // once, using the weapon's actual die size (d6/d8/d10/d12…).
            let rolls = damageRoll.rolls;
            if (gwfActive && partIndex === 0) {
                const sides = Number(part.damage.match(/\d+d(\d+)/i)?.[1]) || 6;
                rolls = damageRoll.rolls.map(r => r <= 2 ? (Math.floor(Math.random() * sides) + 1) : r);
            }
            if (savageActive && partIndex === 0) {
                const second = rollDice(part.damage).rolls;
                const sum = (arr: number[]) => arr.reduce((s, r) => s + r, 0);
                if (sum(second) > sum(rolls)) rolls = second;
            }
            const rollSum = rolls.reduce((s, r) => s + r, 0);
            // cb-m12 — critique RAW : on RELANCE les dés (variance réelle) au
            // lieu de doubler la valeur des premiers dés.
            let partRawDamage = criticalHit
                ? rollSum + rollDice(part.damage).rolls.reduce((s, r) => s + r, 0) + damageRoll.modifier
                : rollSum + damageRoll.modifier;
            // Critique brutal : dés d'arme supplémentaires (lancés UNE fois,
            // pas doublés) sur la part d'arme.
            if (brutalDice > 0 && partIndex === 0) {
                const sides = Number(part.damage.match(/\d+d(\d+)/i)?.[1]) || 6;
                partRawDamage += rollDice(`${brutalDice}d${sides}`).total;
            }
            // Déviation de projectiles : la réduction ronge les parts dans l'ordre.
            if (reactionUsed === 'deflect_missiles' && deflectPool > 0) {
                const absorbed = Math.min(deflectPool, partRawDamage);
                partRawDamage -= absorbed;
                deflectPool -= absorbed;
            }
            // Esquive instinctive : chaque part est divisée par deux.
            if (reactionUsed === 'uncanny_dodge') {
                partRawDamage = Math.floor(partRawDamage / 2);
            }
            const applied = applyDamageToEncounter(state, combatantKey(target), partRawDamage, part.damageType);
            const partDamage = applied.amountApplied ?? partRawDamage;
            const partMitigation = applied.mitigation || 'normal';
            rawDamage += partRawDamage;
            damage += partDamage;
            if (partMitigation !== 'normal' && mitigation === 'normal') mitigation = partMitigation;
            resolvedDamageParts.push({
                damageFormula: part.damage,
                damageType: part.damageType,
                rawDamage: partRawDamage,
                damage: partDamage,
                mitigation: partMitigation,
            });
            state = applied.state;
        }
    }

    // cb-m6 — consomme le drapeau partagé des riders « 1×/tour » dès qu'un coup
    // du joueur a porté en début de tour (attaque bonus de Frénésie incluse) :
    // la première attaque principale ne re-déclenche plus Sneak/Frappe divine…
    if (hit && attacker.isPlayer && onceRiderFree) {
        const riderKey = combatantKey(attacker);
        state = {
            ...state,
            actionEconomy: {
                ...state.actionEconomy,
                [riderKey]: { ...(state.actionEconomy?.[riderKey] || {}), onceRiderUsed: true } as any,
            },
        };
    }

    let updatedTarget = state.combatants.find(c => c.id === target.id) || target;
    // ── Barbare 11+ — Rage implacable : s'il tombe à 0 PV en rage, une
    //    sauvegarde de CON DD 10 réussie le laisse à 1 PV (1×/combat).
    let relentless = false;
    if (updatedTarget.isPlayer && updatedTarget.hp.current <= 0 && character
        && character.class === 'Barbarian' && (character.level || 1) >= 11
        && (character.activeEffects || []).some(e => e.name === 'Rage')
        && !(updatedTarget as any).relentlessUsed) {
        const conMod = abilityMod(getEffectiveStat(character, 'CON'));
        const save = rollDice(`1d20+${conMod}`);
        if (save.total >= 10) {
            relentless = true;
            state = {
                ...state,
                combatants: state.combatants.map(c => c.id === updatedTarget.id
                    ? { ...c, hp: { ...c.hp, current: 1 }, relentlessUsed: true } as Combatant
                    : c),
                logs: [...(state.logs || []), makeLog(`${updatedTarget.name} refuses to fall (Relentless Rage, CON save ${save.total} vs DC 10)`, 'system')],
            };
            updatedTarget = state.combatants.find(c => c.id === target.id) || updatedTarget;
        }
    }
    const damageTypeLabel = resolvedDamageParts.length > 1
        ? resolvedDamageParts.map(part => part.damageType).join(' + ')
        : resolvedDamageType;
    const log = makeLog(
        `${attacker.name} ${hit ? 'hit' : 'missed'} ${target.name}${hit ? ` with ${monsterAttack?.name || args.attackName || 'attack'} for ${damage} ${damageTypeLabel}${mitigation !== 'normal' ? ` (${mitigation})` : ''}` : ''}`,
        hit ? 'attack' : 'turn'
    );
    state = { ...state, logs: [...(state.logs || []), log] };

    return {
        success: true,
        state,
        resolution: {
            attacker: attacker.name,
            target: target.name,
            attackRoll,
            hit,
            criticalHit,
            damage,
            rawDamage,
            damageFormula: resolvedDamageParts.length > 1 ? resolvedDamageParts.map(part => part.damageFormula).join(' + ') : damageFormula,
            damageType: damageTypeLabel,
            attackName: monsterAttack?.name || args.attackName,
            damageParts: resolvedDamageParts.length ? resolvedDamageParts : undefined,
            mitigation,
            reasons: context.prompt.contextReasons?.length ? [...context.prompt.contextReasons] : undefined,
            targetHP: updatedTarget.hp,
            state,
            log,
            consumedEffectIds: consumedEffectIds.length ? consumedEffectIds : undefined,
            reaction: reactionUsed,
            reactionAmount: reactionAmountStart || undefined,
            relentless: relentless || undefined,
            isMeleeAttack,
        },
    };
}
