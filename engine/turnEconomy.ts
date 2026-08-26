/**
 * L'économie de tour du joueur : combien d'attaques et d'actions bonus il lui
 * reste, ce que coûte un sort, une potion, une esquive — et la dépense d'une
 * ressource de classe sur la fiche.
 *
 * Pips verts = attaques de l'action principale restantes (l'Attaque
 * supplémentaire en donne plusieurs), pips ambre = actions bonus. Les booléens
 * historiques actionUsed/bonusActionUsed restent synchronisés (used >= max)
 * pour que toutes les vérifications existantes continuent de marcher.
 *
 * Sorties de components/session/GameSession.tsx le 2026-08-26 (contre-audit,
 * lot B) : des règles pures qui vivaient dans un fichier d'écran, sans test.
 * Corps inchangés ; `character` est passé là où la closure le capturait.
 */
import { CharacterSheet, getPlayerAttackCount } from '../types';

export const getPlayerEconomy = (state: any) => (state.actionEconomy?.['player']) || {};

export const patchPlayerEconomy = (state: any, patch: any) => {
    const cur = getPlayerEconomy(state);
    const next: any = { ...cur, ...patch };
    next.actionUsed = (next.attacksUsed ?? 0) >= (next.attacksMax ?? 1);
    next.bonusActionUsed = (next.bonusUsed ?? 0) >= (next.bonusMax ?? 1);
    return { ...state, actionEconomy: { ...(state.actionEconomy || {}), player: next } };
};

// A spell / dodge / potion / improv card spends ONE main action — c.-à-d. une
// « tranche » de pips égale à l'Extra Attack de base. Avant, ça vidait TOUS
// les pips : un tour avec Sursaut d'action (pips doublés) perdait aussi
// l'action bonus du Sursaut en lançant un sort.
export const spendPlayerMainAction = (state: any, character: CharacterSheet) => {
    const econ = getPlayerEconomy(state);
    const base = getPlayerAttackCount(character);
    const max = econ.attacksMax ?? base;
    return patchPlayerEconomy(state, { attacksUsed: Math.min(max, (econ.attacksUsed ?? 0) + base) });
};

export const spendPlayerBonus = (state: any) => {
    const econ = getPlayerEconomy(state);
    return patchPlayerEconomy(state, { bonusUsed: (econ.bonusUsed ?? 0) + 1 });
};

// CB5 — vérifications AVANT de dépenser : sort, esquive et potion exigent une
// tranche d'action libre (spendPlayerMainAction clampait sans jamais échouer
// — sorts, potions et esquive étaient illimités dans un même tour).
export const hasPlayerMainSlice = (state: any, character: CharacterSheet) => {
    const econ = getPlayerEconomy(state);
    const base = getPlayerAttackCount(character);
    return ((econ.attacksMax ?? base) - (econ.attacksUsed ?? 0)) >= base;
};

export const hasPlayerBonusFree = (state: any) => {
    const econ = getPlayerEconomy(state);
    return ((econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0)) >= 1;
};

/** Dépense `amount` d'une ressource de classe (rage, second souffle, inspiration…), plancher 0. */
export const spendResource = (char: CharacterSheet, key: string, amount = 1): CharacterSheet => ({
    ...char,
    resources: {
        ...(char.resources || {}),
        [key]: { ...(char.resources as any)[key], current: Math.max(0, ((char.resources as any)[key]?.current ?? 0) - amount) },
    },
});
