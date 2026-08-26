/**
 * Le butin : tirage d'objets magiques par rarete et par niveau du groupe.
 *
 * Extrait de data/magicItems.ts le 2026-08-25 (R7 du rangement) : des des
 * dans un fichier de donnees. Les tables restent dans data/, le tirage est
 * ici. Corps inchange.
 */
import { MagicItemRarity, MagicItemDef, MAGIC_ITEMS, LOOT_TABLES, RARITY_ORDER } from '../data/magicItems';

/** Pick a random item of the given rarity. When `maxMinLevel` is set, the pick
 *  is STRICTLY capped to items appropriate for that character level — returning
 *  undefined rather than handing a level-7 item to a level-2 party. */
export function pickMagicItem(
    rarity: MagicItemRarity,
    rng: () => number = Math.random,
    maxMinLevel?: number
): MagicItemDef | undefined {
    let pool = MAGIC_ITEMS.filter(item => item.rarity === rarity);
    if (maxMinLevel !== undefined) {
        pool = pool.filter(item => item.minLevel <= maxMinLevel);
    }
    if (!pool.length) return undefined;
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export function pickRarity(weights: Record<MagicItemRarity, number>, rng: () => number): MagicItemRarity {
    const total = RARITY_ORDER.reduce((sum, rarity) => sum + (weights[rarity] || 0), 0);
    if (total <= 0) return 'common';
    let roll = rng() * total;
    for (const rarity of RARITY_ORDER) {
        roll -= weights[rarity] || 0;
        if (roll < 0) return rarity;
    }
    return 'common';
}

/** Roll 1-3 magic items appropriate for the party level. Pure given a seeded `rng`. */
export function rollLootTable(partyLevel: number, rng: () => number = Math.random): MagicItemDef[] {
    const level = Math.max(1, Math.min(20, Math.floor(Number(partyLevel)) || 1));
    const tier = LOOT_TABLES.find(t => level >= t.minLevel && level <= t.maxLevel) || LOOT_TABLES[LOOT_TABLES.length - 1];

    // 50% one item, 35% two, 15% three.
    const countRoll = rng();
    const count = countRoll < 0.5 ? 1 : countRoll < 0.85 ? 2 : 3;

    const items: MagicItemDef[] = [];
    for (let i = 0; i < count; i++) {
        // A rolled rarity with no level-appropriate item downgrades until one fits
        // (a 5% "rare" roll at level 2 becomes an uncommon/common item, never a
        // level-7 item and never an empty hoard).
        const rolled = pickRarity(tier.weights, rng);
        for (let r = RARITY_ORDER.indexOf(rolled); r >= 0; r--) {
            const item = pickMagicItem(RARITY_ORDER[r], rng, level);
            if (item) { items.push(item); break; }
        }
    }
    return items;
}
