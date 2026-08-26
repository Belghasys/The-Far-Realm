/** La progression : des de vie, ressources et emplacements par niveau, repos court et long. */
import { CharacterSheet, getEffectiveStat, getEffectiveMaxHP } from '../../types';
import { clampHP } from '../gameValidator';
import { abilityMod, hasFeatSpecial, songOfRestDie } from '../combat/rolls';

function hitDieForClass(cls: string): number {
    const table: Record<string, number> = {
        Barbarian: 12,
        Fighter: 10,
        Paladin: 10,
        Ranger: 10,
        Cleric: 8,
        Druid: 8,
        Rogue: 8,
        Bard: 8,
        Monk: 8,
        Warlock: 8,
        Mage: 6,
        Wizard: 6,
        Sorcerer: 6,
    };
    return table[cls] || 8;
}
function defaultResources(character: CharacterSheet): CharacterSheet['resources'] {
    const cls = character.class;
    const level = character.level;
    const chaMod = Math.max(1, abilityMod(getEffectiveStat(character, 'CHA')));
    const resources: CharacterSheet['resources'] = {};

    if (cls === 'Fighter') {
        resources.secondWind = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Second Wind' };
        // da-m2 — Action Surge ×2 au niveau 17 (SRD).
        if (level >= 2) {
            const surges = level >= 17 ? 2 : 1;
            resources.actionSurge = { current: surges, max: surges, recoverOn: 'short_rest', label: 'Action Surge' };
        }
        // Indomitable (SRD) : relance une sauvegarde ratée — 1/repos long,
        // 2 au niveau 13, 3 au 17. Branché sur la fenêtre de relance BG3.
        if (level >= 9) {
            const uses = level >= 17 ? 3 : level >= 13 ? 2 : 1;
            resources.indomitable = { current: uses, max: uses, recoverOn: 'long_rest', label: 'Indomitable' };
        }
        if (character.subclass === 'Battle Master' && level >= 3) {
            const dice = level >= 15 ? 6 : level >= 7 ? 5 : 4;
            // da-m2 — d12 au niveau 18 (promis par subclasses.ts, jamais servi).
            const die = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8';
            resources.superiorityDice = { current: dice, max: dice, recoverOn: 'short_rest', label: `Superiority Dice (${die})` };
        }
    }
    if (cls === 'Paladin') {
        resources.layOnHands = { current: level * 5, max: level * 5, recoverOn: 'long_rest', label: 'Lay on Hands' };
        // Divine Sense (SRD) : 1 + mod. CHA par repos long.
        resources.divineSense = { current: 1 + chaMod, max: 1 + chaMod, recoverOn: 'long_rest', label: 'Divine Sense' };
        // Canalisation divine du serment (Arme sacrée, Vœu d'inimitié, Courroux
        // de la nature, Défi du cavalier…) — 1/repos court à partir du niveau 3.
        if (level >= 3) {
            resources.channelDivinity = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Channel Divinity' };
        }
    }
    if (cls === 'Cleric' && level >= 10) {
        // Intervention divine (SRD) : d100 ≤ niveau → miracle. 1 tentative/repos long.
        resources.divineIntervention = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Divine Intervention' };
    }
    if (cls === 'Monk' && character.subclass === 'Way of the Open Hand' && level >= 6) {
        resources.wholenessOfBody = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Wholeness of Body' };
    }
    if (cls === 'Barbarian') {
        // da-m2 — Rage ILLIMITÉE au niveau 20 (SRD) : 99 ≈ sans limite,
        // affichable sans casser le format current/max des ressources.
        const rageMax = level >= 20 ? 99 : level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2;
        resources.rage = { current: rageMax, max: rageMax, recoverOn: 'long_rest', label: level >= 20 ? 'Rage (∞)' : 'Rage' };
    }
    if (cls === 'Bard') {
        resources.bardicInspiration = {
            current: chaMod,
            max: chaMod,
            recoverOn: level >= 5 ? 'short_rest' : 'long_rest',
            label: 'Bardic Inspiration',
        };
    }
    if (cls === 'Cleric' && level >= 2) {
        // da-m2 — Channel Divinity ×3 au niveau 18 (SRD).
        const cdUses = level >= 18 ? 3 : level >= 6 ? 2 : 1;
        resources.channelDivinity = { current: cdUses, max: cdUses, recoverOn: 'short_rest', label: 'Channel Divinity' };
    }
    if (cls === 'Cleric' && character.subclass === 'War Domain') {
        // War Priest: bonus-action weapon attack, WIS-mod uses per long rest.
        const wisMod = Math.max(1, abilityMod(getEffectiveStat(character, 'WIS')));
        resources.warPriest = { current: wisMod, max: wisMod, recoverOn: 'long_rest', label: 'War Priest' };
    }
    if (cls === 'Druid' && level >= 2) {
        resources.wildShape = { current: 2, max: 2, recoverOn: 'short_rest', label: 'Wild Shape' };
        // Récupération naturelle (Cercle de la Terre) : rend des emplacements
        // dont la somme des niveaux vaut la moitié du niveau de druide.
        resources.naturalRecovery = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Natural Recovery' };
    }
    if (cls === 'Warlock') {
        // L'Occultiste n'avait AUCUNE capacité activable. Focalisation du pacte :
        // le patron guide sa main — avantage sur la prochaine attaque de sort.
        resources.pactFocus = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Pact Focus' };
    }
    if (cls === 'Monk' && level >= 2) {
        resources.ki = { current: level, max: level, recoverOn: 'short_rest', label: 'Ki' };
    }
    if (cls === 'Sorcerer' && level >= 2) {
        resources.sorceryPoints = { current: level, max: level, recoverOn: 'long_rest', label: 'Sorcery Points' };
    }
    if (cls === 'Mage' || cls === 'Wizard') {
        resources.arcaneRecovery = { current: 1, max: 1, recoverOn: 'long_rest', label: 'Arcane Recovery' };
    }
    // Feat Chanceux : 3 points de chance par repos long (avantage à la demande).
    if (hasFeatSpecial(character, 'lucky_points')) {
        resources.luckyPoints = { current: 3, max: 3, recoverOn: 'long_rest', label: 'Points de chance' };
    }
    // Familier lié : « Aide du familier » — 1×/repos court, avantage sur la
    // prochaine attaque (le familier distrait/harcèle la cible).
    if (character.familiar) {
        resources.familiarHelp = { current: 1, max: 1, recoverOn: 'short_rest', label: 'Aide du familier' };
    }

    return resources;
}
function defaultSpellSlots(character: CharacterSheet): CharacterSheet['spellSlots'] {
    const fullCasters = ['Bard', 'Cleric', 'Druid', 'Mage', 'Wizard', 'Sorcerer'];
    const halfCasters = ['Paladin', 'Ranger'];
    const warlock = character.class === 'Warlock';
    const level = character.level;

    if (!fullCasters.includes(character.class) && !halfCasters.includes(character.class) && !warlock) return undefined;

    if (warlock) {
        // da-m1 — 4e emplacement de pacte au niveau 17 (SRD).
        const max = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
        const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
        return { [`pact${slotLevel}`]: { current: max, max } };
    }

    if (halfCasters.includes(character.class) && level < 2) return undefined;

    const casterLevel = fullCasters.includes(character.class) ? level : Math.max(1, Math.ceil(level / 2));
    const casterSlotProgression: Record<number, Record<string, number>> = {
        1: { '1': 2 },
        2: { '1': 3 },
        3: { '1': 4, '2': 2 },
        4: { '1': 4, '2': 3 },
        5: { '1': 4, '2': 3, '3': 2 },
        6: { '1': 4, '2': 3, '3': 3 },
        7: { '1': 4, '2': 3, '3': 3, '4': 1 },
        8: { '1': 4, '2': 3, '3': 3, '4': 2 },
        9: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 1 },
        10: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2 },
        11: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
        12: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 },
        13: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
        14: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1 },
        15: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
        16: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1 },
        17: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1, '7': 1, '8': 1, '9': 1 },
        18: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 1, '7': 1, '8': 1, '9': 1 },
        19: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 1, '8': 1, '9': 1 },
        20: { '1': 4, '2': 3, '3': 3, '4': 3, '5': 3, '6': 2, '7': 2, '8': 1, '9': 1 },
    };

    const prog = casterSlotProgression[Math.max(1, Math.min(20, casterLevel))] || { '1': 2 };
    const slots: CharacterSheet['spellSlots'] = {};
    for (const [lvl, max] of Object.entries(prog)) {
        slots[lvl] = { current: max, max };
    }
    return slots;
}
export function ensureProgressionState(character: CharacterSheet): CharacterSheet {
    const defaultRes = defaultResources(character) || {};
    const charRes = character.resources || {};
    const resources: CharacterSheet['resources'] = {};
    
    for (const key of Object.keys({ ...defaultRes, ...charRes })) {
        const def = defaultRes[key];
        const char = charRes[key];
        if (def && char) {
            resources[key] = {
                ...char,
                max: def.max,
                label: def.label,
                recoverOn: def.recoverOn,
                current: Math.min(char.current, def.max),
            };
        } else if (def) {
            resources[key] = def;
        } else if (char) {
            resources[key] = char;
        }
    }

    return {
        ...character,
        resources,
        spellSlots: character.spellSlots || defaultSpellSlots(character),
        hitDice: character.hitDice || {
            die: hitDieForClass(character.class),
            total: character.level,
            remaining: character.level,
        },
    };
}
export function applyShortRest(character: CharacterSheet, spendHitDice = 0): CharacterSheet {
    const ensured = ensureProgressionState(character);
    const resources = Object.fromEntries(Object.entries(ensured.resources || {}).map(([key, resource]) => [
        key,
        resource.recoverOn === 'short_rest' ? { ...resource, current: resource.max } : resource,
    ]));

    let spellSlots = ensured.spellSlots
        ? Object.fromEntries(
            Object.entries(ensured.spellSlots).map(([key, slot]) => [
                key,
                key.toLowerCase().startsWith('pact')
                    ? { ...slot, current: slot.max }
                    : slot
            ])
        )
        : undefined;

    // Restauration arcanique (Mage/Wizard) : lors d'un repos court, récupère
    // automatiquement des emplacements (somme des niveaux ≤ ⌈niveau/2⌉, jamais
    // de niveau 6+), une fois par repos long. Greedy du plus haut au plus bas.
    if ((ensured.class === 'Mage' || ensured.class === 'Wizard')
        && (resources.arcaneRecovery?.current ?? 0) > 0 && spellSlots) {
        let budget = Math.ceil((ensured.level || 1) / 2);
        let recovered = false;
        for (let lvl = 5; lvl >= 1; lvl--) {
            const key = String(lvl);
            while (spellSlots[key] && spellSlots[key].current < spellSlots[key].max && budget >= lvl) {
                spellSlots = { ...spellSlots, [key]: { ...spellSlots[key], current: spellSlots[key].current + 1 } };
                budget -= lvl;
                recovered = true;
            }
        }
        if (recovered) {
            resources.arcaneRecovery = { ...resources.arcaneRecovery, current: resources.arcaneRecovery.current - 1 };
        }
    }

    let hp = ensured.hp.current;
    let hitDice = ensured.hitDice!;
    const diceToSpend = Math.max(0, Math.min(spendHitDice, hitDice.remaining));
    if (diceToSpend > 0) {
        const conMod = abilityMod(getEffectiveStat(ensured, 'CON'));
        const effMax = getEffectiveMaxHP(ensured);
        // Don Robuste/Durable (2026-08-13) : chaque dé de vie dépensé rend au
        // minimum 2 × mod de CON PV (le `special` était du texte mort).
        const perDieFloor = hasFeatSpecial(ensured, 'durable_hit_die_minimum') ? Math.max(1, conMod * 2) : 1;
        for (let i = 0; i < diceToSpend; i++) {
            hp = clampHP(hp + Math.max(perDieFloor, Math.floor(Math.random() * hitDice.die) + 1 + conMod), effMax);
        }
        hitDice = { ...hitDice, remaining: hitDice.remaining - diceToSpend };
        // Barde 2+ — Chant reposant : +1dX de soins quand on dépense des dés de
        // vie pendant un repos court (d6 → d12 avec le niveau).
        if (ensured.class === 'Bard' && (ensured.level || 1) >= 2) {
            const die = songOfRestDie(ensured.level || 1);
            hp = clampHP(hp + Math.floor(Math.random() * die) + 1, effMax);
        }
    }

    // Beast Master companion patches itself up too: a short rest brings it back
    // to at least half its max (and revives it if downed).
    const companionMax = Math.max(11, 4 * (ensured.level || 1));
    const companionHP = ensured.subclass === 'Beast Master'
        ? {
            max: companionMax,
            current: Math.max(Math.floor(companionMax / 2), Math.min(companionMax, ensured.companionHP?.current ?? companionMax)),
        }
        : ensured.companionHP;

    // Recruited companions also patch up to at least half (revives the downed).
    const companions = ensured.companions?.map(comp => ({
        ...comp,
        hp: { ...comp.hp, current: Math.max(Math.floor(comp.hp.max / 2), Math.min(comp.hp.max, comp.hp.current)) },
    }));

    // La monture VIVANTE se remet à au moins la moitié. Une monture à 0 PV
    // reste hors jeu au repos court (le Destrier céleste revient au repos long).
    const mount = ensured.mount?.hp && ensured.mount.hp.current > 0
        ? {
            ...ensured.mount,
            hp: { ...ensured.mount.hp, current: Math.max(Math.floor(ensured.mount.hp.max / 2), Math.min(ensured.mount.hp.max, ensured.mount.hp.current)) },
        }
        : ensured.mount;

    return {
        ...ensured,
        hp: { ...ensured.hp, current: hp },
        resources,
        spellSlots,
        hitDice,
        companionHP,
        companions,
        mount,
    };
}
export function applyLongRest(character: CharacterSheet): CharacterSheet {
    const ensured = ensureProgressionState(character);
    const resources = Object.fromEntries(Object.entries(ensured.resources || {}).map(([key, resource]) => [
        key,
        resource.recoverOn === 'short_rest' || resource.recoverOn === 'long_rest'
            ? { ...resource, current: resource.max }
            : resource,
    ]));
    const spellSlots = ensured.spellSlots
        ? Object.fromEntries(Object.entries(ensured.spellSlots).map(([key, slot]) => [key, { ...slot, current: slot.max }]))
        : undefined;
    const regainedHitDice = Math.max(1, Math.floor(ensured.level / 2));
    const hitDice = ensured.hitDice || { die: hitDieForClass(ensured.class), total: ensured.level, remaining: ensured.level };

    // Long rest: the Beast Master companion fully recovers (and revives).
    const companionMax = Math.max(11, 4 * (ensured.level || 1));
    const companionHP = ensured.subclass === 'Beast Master'
        ? { current: companionMax, max: companionMax }
        : ensured.companionHP;

    // Recruited companions fully recover too.
    const companions = ensured.companions?.map(comp => ({
        ...comp,
        hp: { ...comp.hp, current: comp.hp.max },
    }));

    // La monture récupère tout — y compris le Destrier céleste tombé, qui est
    // RE-INVOQUÉ au repos long (Appel de destrier).
    const mount = ensured.mount?.hp
        ? { ...ensured.mount, hp: { ...ensured.mount.hp, current: ensured.mount.hp.max } }
        : ensured.mount;

    return {
        ...ensured,
        companions,
        mount,
        hp: { ...ensured.hp, current: getEffectiveMaxHP(ensured) },
        tempHP: 0,
        deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
        // CB6 — le repos long guérit les CONDITIONS (poison, paralysie,
        // entrave…) quelle que soit leur durée ; seuls les effets permanents
        // NON-conditions (traits, objets) survivent à la nuit.
        activeEffects: (ensured.activeEffects || []).filter(effect => effect.duration === 'permanent' && effect.source !== 'condition'),
        resources,
        spellSlots,
        hitDice: {
            ...hitDice,
            total: ensured.level,
            remaining: Math.min(ensured.level, hitDice.remaining + regainedHitDice),
        },
        companionHP,
    };
}
