/** Les points de vie du heros : degats avec resistances, stabilisation, jets contre la mort. */
import { CharacterSheet, getEffectiveMaxHP } from '../../types';
import { normalizeDamageType } from '../codexService';
import { clampHP } from '../gameValidator';
import { playerResistances } from '../combat/rolls';
import { dropHidden } from '../combat/stealth';
import { RollOutcome } from '../combat/types';

/**
 * Apply damage to the CHARACTER SHEET directly (the out-of-encounter path).
 * Honors the player's resistances (racial/draconic/feat) and temp HP —
 * previously only the in-combat path halved resisted damage, so a Dwarf
 * drinking poison outside a fight took it full.
 */
export function applyDamageToCharacter(
    character: CharacterSheet,
    amount: number,
    damageType?: string,
    opts?: { isCritical?: boolean }
): { character: CharacterSheet; amountApplied: number; mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' } {
    const type = normalizeDamageType(damageType);
    let amountApplied = Math.max(0, Math.trunc(amount));
    let mitigation: 'normal' | 'resistant' | 'immune' | 'vulnerable' = 'normal';
    // Audit 2026-08-12 — le héros ne pouvait jamais être immunisé ni vulnérable
    // (le type de retour n'admettait que normal|resistant).
    if (type && (character.immunities || []).some(r => normalizeDamageType(r) === type)) {
        amountApplied = 0;
        mitigation = 'immune';
    } else if (type && (character.vulnerabilities || []).some(r => normalizeDamageType(r) === type)) {
        amountApplied = amountApplied * 2;
        mitigation = 'vulnerable';
    } else if (type && playerResistances(character).some(r => normalizeDamageType(r) === type)) {
        amountApplied = Math.floor(amountApplied / 2);
        mitigation = 'resistant';
    }
    let tempHP = character.tempHP || 0;
    let hpLoss = amountApplied;
    if (tempHP > 0) {
        if (hpLoss >= tempHP) { hpLoss -= tempHP; tempHP = 0; }
        else { tempHP -= hpLoss; hpLoss = 0; }
    }

    // RAW SRD (audit 2026-08-12 — aucun de ces deux mécanismes n'existait) :
    // 1. Dégâts subis À TERRE (0 PV) = 1 échec de jet de mort automatique,
    //    2 sur un coup critique.
    // 2. Mort massive : si les dégâts restants après tomber à 0 atteignent le
    //    max de PV, mort instantanée.
    const before = Math.max(0, character.hp.current);
    const wasDown = before <= 0;
    let deathSaves = character.deathSaves;
    if (wasDown && hpLoss > 0) {
        const prev = deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
        const failures = Math.min(3, prev.failures + (opts?.isCritical ? 2 : 1));
        deathSaves = { ...prev, isStable: false, failures, isDead: failures >= 3 };
    }
    const effectiveMax = getEffectiveMaxHP(character);
    const nextHP = clampHP(before - hpLoss, effectiveMax);
    if (!wasDown && nextHP <= 0 && (hpLoss - before) >= effectiveMax) {
        deathSaves = { successes: 0, failures: 3, isStable: false, isDead: true };
    }

    // CACHÉ — encaisser, c'est être trouvé. Point de passage unique de TOUS les
    // dégâts subis par le héros (tour PNJ, piège, environnement, sort), donc le
    // seul endroit où la règle ne peut pas être oubliée par un appelant.
    // Zéro dégât réel (immunité, absorbé par les PV temporaires) ne révèle rien.
    const activeEffects = amountApplied > 0
        ? dropHidden(character.activeEffects).effects
        : character.activeEffects;

    return {
        amountApplied,
        mitigation,
        character: {
            ...character,
            tempHP,
            deathSaves,
            activeEffects,
            hp: { ...character.hp, current: nextHP },
        },
    };
}
/** RAW — stabiliser un mourant sans le soigner : test de Médecine DD 10 réussi
 *  (ou effet équivalent). 0 PV, stable, compteurs remis à zéro. */
export function stabilizeCharacter(character: CharacterSheet): CharacterSheet {
    if (character.hp.current > 0) return character;
    return {
        ...character,
        deathSaves: { successes: 0, failures: 0, isStable: true, isDead: false },
    };
}
/** RAW — dégâts subis alors qu'on est DÉJÀ à 0 PV : 1 échec de jet de mort
 *  automatique (2 sur coup critique). Utilisé par les handlers de combat dont
 *  le chemin des dégâts passe par les combattants, pas par
 *  applyDamageToCharacter. */
export function applyDownedDamagePenalty(character: CharacterSheet, isCritical = false): CharacterSheet {
    const prev = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const failures = Math.min(3, prev.failures + (isCritical ? 2 : 1));
    return { ...character, deathSaves: { ...prev, isStable: false, failures, isDead: failures >= 3 } };
}
export function applyCharacterHP(character: CharacterSheet, nextHP: number): CharacterSheet {
    const updated: CharacterSheet = {
        ...character,
        hp: {
            ...character.hp,
            current: clampHP(nextHP, getEffectiveMaxHP(character)),
        },
    };

    if (updated.hp.current > 0 && updated.deathSaves) {
        updated.deathSaves = { successes: 0, failures: 0, isStable: false, isDead: false };
    }

    return updated;
}
export function applyDeathSaveOutcome(character: CharacterSheet, outcome: RollOutcome): CharacterSheet {
    if (outcome.prompt.type !== 'DEATH_SAVE' || character.hp.current > 0) return character;

    if (outcome.die === 20) {
        return {
            ...character,
            hp: { ...character.hp, current: 1 },
            deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
        };
    }

    const previous = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const failureGain = outcome.die === 1 ? 2 : outcome.success ? 0 : 1;
    const successGain = outcome.success ? 1 : 0;
    const successes = Math.min(3, previous.successes + successGain);
    const failures = Math.min(3, previous.failures + failureGain);

    return {
        ...character,
        deathSaves: {
            successes,
            failures,
            isStable: successes >= 3,
            isDead: failures >= 3,
        },
    };
}
