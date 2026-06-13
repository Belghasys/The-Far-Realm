// ========== SHARED UTILITIES ==========
// Single source of truth for dice rolls and grid coordinate helpers.
// Every service/component should import from here to avoid duplication.

// ========== DICE ==========

/** Roll a dice formula like "2d6+3" or "1d8" and return total, individual rolls, and modifier. */
export function rollDice(formula: string): { total: number; rolls: number[]; modifier: number } {
    const match = String(formula ?? '').match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) {
        // Flat value with no dice (e.g. "5", "+3") — return it directly instead of 0,
        // so flat magic damage and flat healing (e.g. Aid's "5") aren't silently dropped.
        const flat = parseInt(String(formula ?? '').replace(/[^\d+-]/g, ''), 10);
        return Number.isFinite(flat) ? { total: flat, rolls: [], modifier: flat } : { total: 0, rolls: [], modifier: 0 };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier;
    return { total, rolls, modifier };
}

/** Roll a single d20. */
export function rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
}

/** Standard D&D modifier from an ability score. */
export function getModifier(stat: number): number {
    return Math.floor((stat - 10) / 2);
}

// ========== STRUCTURED LOGGING ==========

export const LOG = {
    combat: (msg: string, data?: any) => console.log(`⚔️ [COMBAT] ${msg}`, data ?? ''),
    xp: (msg: string, data?: any) => console.log(`⭐ [XP] ${msg}`, data ?? ''),
    engine: (msg: string, data?: any) => console.log(`🔧 [ENGINE] ${msg}`, data ?? ''),
    sync: (msg: string, data?: any) => console.log(`🔄 [SYNC] ${msg}`, data ?? ''),
    tag: (msg: string, data?: any) => console.log(`🏷️ [TAG] ${msg}`, data ?? ''),
    save: (msg: string, data?: any) => console.log(`💾 [SAVE] ${msg}`, data ?? ''),
    dm: (msg: string, data?: any) => console.log(`🎭 [DM] ${msg}`, data ?? ''),
};
