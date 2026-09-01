// ========== SHARED UTILITIES ==========
// Single source of truth for dice rolls and grid coordinate helpers.
// Every service/component should import from here to avoid duplication.

// ========== TRANSCRIPT ==========

/** UI3 — détection UNIFIÉE des lignes système du transcript, symétrique FR/EN :
 *  « [SYSTEM: …] », « [SYSTÈME : …] », « [SYSTEME] »… L'ancien regex EN-only du
 *  Chronicle laissait les lignes françaises (SpellbookPanel) polluer le fil,
 *  tandis que les mêmes événements étaient invisibles en anglais. */
export function isSystemLine(text: string): boolean {
    return /\[\s*SYST[EÈ]ME?\s*(?::|\])/i.test(String(text || ''));
}

// ========== DICE ==========

/** Roll a dice formula like "2d6+3" or "1d8" and return total, individual rolls, and modifier. */
export function rollDice(formula: string): { total: number; rolls: number[]; modifier: number } {
    const text = String(formula ?? '');
    // TOUS les groupes de dés, pas seulement le premier : les formules
    // composées ("3d4+3+1d4+1" pour un Projectile magique monté en niveau,
    // "1d8+3+1d6" pour une arme à rider élémentaire) perdaient silencieusement
    // tout ce qui suivait le premier groupe.
    const groups = [...text.matchAll(/(\d+)\s*d\s*(\d+)/gi)];
    if (!groups.length) {
        // Flat value with no dice (e.g. "5", "+3") — return it directly instead of 0,
        // so flat magic damage and flat healing (e.g. Aid's "5") aren't silently dropped.
        const flat = parseInt(text.replace(/[^\d+-]/g, ''), 10);
        return Number.isFinite(flat) ? { total: flat, rolls: [], modifier: flat } : { total: 0, rolls: [], modifier: 0 };
    }

    const rolls: number[] = [];
    for (const group of groups) {
        const count = Math.min(100, Math.max(0, parseInt(group[1], 10) || 0));
        const sides = Math.max(1, parseInt(group[2], 10) || 1);
        for (let i = 0; i < count; i++) {
            rolls.push(Math.floor(Math.random() * sides) + 1);
        }
    }

    // Les modificateurs plats sont ce qui reste une fois les groupes de dés
    // retirés ("+3", "-1"…), additionnés.
    const flatText = text.replace(/(\d+)\s*d\s*(\d+)/gi, ' ');
    let modifier = 0;
    for (const m of flatText.matchAll(/([+-]\s*\d+)/g)) {
        modifier += Number(m[1].replace(/\s+/g, ''));
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier;
    return { total, rolls, modifier };
}

/**
 * T3 (contre-audit du 2026-09-01) — une formule illisible venant du MJ
 * (« beaucoup », « énorme ») donnait silencieusement 0 AVEC success:true et un
 * transcript qui annonçait l'effet. Vrai si la chaîne porte au moins un groupe
 * NdM, ou n'est qu'un entier plat (signé ou non). Les outils refusent le reste.
 */
export function isDiceFormula(formula: unknown): boolean {
    const text = String(formula ?? '').trim();
    if (!text) return false;
    if (/(\d+)\s*d\s*(\d+)/i.test(text)) return true;
    return /^[+-]?\d+$/.test(text);
}

/**
 * Valeur MAXIMALE d'une formule de dés (« 2d4+2 » → 10, « 8d4+8 » → 40).
 * Mode histoire : les soins (potions, sorts) rendent ce maximum au lieu d'un
 * jet. Gère plusieurs groupes de dés et les modificateurs plats signés.
 */
export function maxRollOfFormula(formula: string): number {
    const text = String(formula ?? '');
    let total = 0;
    let hasDice = false;
    for (const m of text.matchAll(/(\d+)\s*d\s*(\d+)/gi)) {
        hasDice = true;
        total += Number(m[1]) * Number(m[2]);
    }
    const flatText = text.replace(/(\d+)\s*d\s*(\d+)/gi, '');
    for (const m of flatText.matchAll(/([+-]\s*\d+)/g)) {
        total += Number(m[1].replace(/\s+/g, ''));
    }
    if (!hasDice && total === 0) {
        const flat = parseInt(flatText.replace(/[^\d+-]/g, ''), 10);
        if (Number.isFinite(flat)) total = flat;
    }
    return Math.max(0, total);
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
