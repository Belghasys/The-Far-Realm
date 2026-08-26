/**
 * gameValidator.ts
 * Lightweight sanity-check layer that clamps impossible values from the DM.
 * This does NOT enforce game rules — Live (the DM) still decides outcomes.
 * It only catches extreme hallucinations by clamping HP, XP, stat modifiers, and AC.
 */

import { getEnemyXP } from './xpSystem';

// ─── Clamp Functions ────────────────────────────────────────────────────────

/**
 * Clamp HP to valid bounds: 0 ≤ HP ≤ maxHP
 */
export function clampHP(newHP: number, maxHP: number): number {
    return Math.max(0, Math.min(newHP, maxHP));
}

/**
 * Clamp XP to a reasonable maximum based on the enemies defeated.
 * Allows 50% headroom above the calculated XP for DM bonus awards.
 */
export function clampXP(xp: number, enemyNames?: string[]): number {
    if (xp <= 0) return 0;

    if (enemyNames && enemyNames.length > 0) {
        const baseXP = enemyNames.reduce((sum, name) => sum + getEnemyXP(name), 0);
        const maxXP = Math.max(baseXP * 1.5, 100); // at least 100 XP allowed
        return Math.min(xp, maxXP);
    }

    // No enemy context: cap single grants at 5000
    // (Ancient Dragon = 25000, but that's via calculateCombatXP, not raw grants)
    return Math.min(xp, 5000);
}

/**
 * Clamp a stat modifier (buff/debuff) to D&D 5e bounds.
 */
export function clampStatModifier(modifier: number): number {
    return Math.max(-10, Math.min(10, modifier));
}

/**
 * Clamp AC to reasonable D&D 5e bounds (5-30).
 */
export function clampAC(ac: number): number {
    return Math.max(5, Math.min(30, ac));
}
