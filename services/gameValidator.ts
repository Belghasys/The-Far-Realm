/**
 * gameValidator.ts
 * Lightweight sanity-check layer that clamps impossible values from the DM.
 * This does NOT enforce game rules — Live (the DM) still decides outcomes.
 * It only catches extreme hallucinations (e.g., 200 damage from a goblin).
 */

import { getEnemyXP } from './xpSystem';

// ─── D&D 5e CR → Max Single-Hit Damage (DMG p.274) ─────────────────────────
// Used as fallback when creature isn't in the bestiary (invented by the DM).
const CR_MAX_DAMAGE: Record<number, number> = {
    0: 3,      // 1d4
    0.125: 5,  // 1d6+1
    0.25: 8,   // 1d8+3
    0.5: 12,   // 2d6+2
    1: 18,     // 3d6+3
    2: 24,     // 4d6+4
    3: 30,     // 5d6+5
    4: 36,     // 6d6+6
    5: 42,     // 7d6+7
    6: 48,
    7: 54,
    8: 60,
    9: 66,
    10: 72,
    11: 78,
    12: 84,
    13: 90,
    14: 96,
    15: 102,
    16: 108,
    17: 114,
    20: 140,
    24: 180,
    30: 240,
};

/**
 * Parse a dice string like "2d6+3" and return the maximum possible roll.
 */
export function maxDiceRoll(diceStr: string): number {
    if (!diceStr) return 50; // safe fallback
    const match = diceStr.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
    if (!match) return 50;
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const sign = match[3] === '-' ? -1 : 1;
    const mod = match[4] ? sign * parseInt(match[4]) : 0;
    return count * sides + mod;
}

/**
 * Get the max single-hit damage for a given CR using the DMG table.
 * Returns the nearest CR entry that is ≥ the given CR.
 */
function getMaxDamageForCR(cr: number): number {
    // Find the exact or next higher CR
    const sortedCRs = Object.keys(CR_MAX_DAMAGE).map(Number).sort((a, b) => a - b);
    for (const tableCR of sortedCRs) {
        if (tableCR >= cr) return CR_MAX_DAMAGE[tableCR];
    }
    return CR_MAX_DAMAGE[30] || 240; // absolute ceiling
}

// ─── Clamp Functions ────────────────────────────────────────────────────────

/**
 * Clamp damage to the maximum possible for the attacking creature.
 * Allows crit (×2) as headroom for DM fudging.
 * 
 * @param amount - The damage amount from the DM
 * @param activeEnemies - Current combatants (to find the attacker's stats)
 * @param attackerName - Name of the attacker (optional, for targeted lookup)
 */
export function clampDamage(
    amount: number,
    activeEnemies?: Array<{ name: string; attacks?: Array<{ damage: string }>; cr?: number }>,
    attackerName?: string
): number {
    if (amount <= 0) return 0;

    let maxPossible = 100; // generous fallback

    if (activeEnemies && activeEnemies.length > 0) {
        const attacker = attackerName
            ? activeEnemies.find(e => e.name.toLowerCase().includes(attackerName.toLowerCase()))
            : activeEnemies[0]; // default to first enemy

        if (attacker) {
            if (attacker.attacks && attacker.attacks.length > 0) {
                // Use the highest damage attack
                const maxAttackDamage = Math.max(
                    ...attacker.attacks.map(a => maxDiceRoll(a.damage))
                );
                maxPossible = maxAttackDamage * 2; // allow crit
            } else if (attacker.cr !== undefined) {
                maxPossible = getMaxDamageForCR(attacker.cr) * 2;
            }
        }
    }

    // Absolute floor: minimum 1 damage if the DM said damage happened
    return Math.max(1, Math.min(amount, maxPossible));
}

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
 * Clamp an ability score to D&D 5e bounds (1-30).
 */
export function clampAbilityScore(score: number): number {
    return Math.max(1, Math.min(30, score));
}

/**
 * Clamp AC to reasonable D&D 5e bounds (5-30).
 */
export function clampAC(ac: number): number {
    return Math.max(5, Math.min(30, ac));
}
