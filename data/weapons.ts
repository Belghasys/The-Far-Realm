// D&D 5e 2024 Weapon Table
// Source: Système de Référence de Jeu (SRD) 5.2 / Player's Handbook 2024
// Used as a reference index for the Gemini DM tool: lookup_weapon()

export interface WeaponTemplate {
    name: string;
    nameFr: string;
    damage: string;
    damageType: 'slashing' | 'piercing' | 'bludgeoning';
    properties: string[];
    masteryMove: string;
    weightKg: number;
    price: string;
    category: 'simple_melee' | 'simple_ranged' | 'martial_melee' | 'martial_ranged';
    range?: string; // "6/18" for thrown, "24/96" for ranged
    versatile?: string; // Damage when wielded two-handed, e.g. "1d8"
}

export const WEAPON_TABLE: Record<string, WeaponTemplate> = {
    // ========== ARMES COURANTES DE CORPS À CORPS ==========
    'baton_de_combat': {
        name: 'Quarterstaff', nameFr: 'Bâton de combat',
        damage: '1d6', damageType: 'bludgeoning',
        properties: ['Versatile'], masteryMove: 'Topple',
        weightKg: 2, price: '2 pa', category: 'simple_melee',
        versatile: '1d8'
    },
    'dague': {
        name: 'Dagger', nameFr: 'Dague',
        damage: '1d4', damageType: 'piercing',
        properties: ['Finesse', 'Light', 'Thrown'], masteryMove: 'Nick',
        weightKg: 0.5, price: '2 po', category: 'simple_melee',
        range: '6/18'
    },
    'gourdin': {
        name: 'Club', nameFr: 'Gourdin',
        damage: '1d4', damageType: 'bludgeoning',
        properties: ['Light'], masteryMove: 'Slow',
        weightKg: 1, price: '1 pa', category: 'simple_melee'
    },
    'hachette': {
        name: 'Handaxe', nameFr: 'Hachette',
        damage: '1d6', damageType: 'slashing',
        properties: ['Light', 'Thrown'], masteryMove: 'Vex',
        weightKg: 1, price: '5 po', category: 'simple_melee',
        range: '6/18'
    },
    'javeline': {
        name: 'Javelin', nameFr: 'Javeline',
        damage: '1d6', damageType: 'piercing',
        properties: ['Thrown'], masteryMove: 'Slow',
        weightKg: 1, price: '5 pa', category: 'simple_melee',
        range: '9/36'
    },
    'lance': {
        name: 'Spear', nameFr: 'Lance',
        damage: '1d6', damageType: 'piercing',
        properties: ['Thrown', 'Versatile'], masteryMove: 'Sap',
        weightKg: 1.5, price: '1 po', category: 'simple_melee',
        range: '6/18', versatile: '1d8'
    },
    'marteau_leger': {
        name: 'Light Hammer', nameFr: 'Marteau léger',
        damage: '1d4', damageType: 'bludgeoning',
        properties: ['Light', 'Thrown'], masteryMove: 'Nick',
        weightKg: 1, price: '2 po', category: 'simple_melee',
        range: '6/18'
    },
    'masse_darmes': {
        name: 'Mace', nameFr: "Masse d'armes",
        damage: '1d6', damageType: 'bludgeoning',
        properties: [], masteryMove: 'Sap',
        weightKg: 2, price: '5 po', category: 'simple_melee'
    },
    'massue': {
        name: 'Greatclub', nameFr: 'Massue',
        damage: '1d8', damageType: 'bludgeoning',
        properties: ['Two-Handed'], masteryMove: 'Push',
        weightKg: 5, price: '2 pa', category: 'simple_melee'
    },
    'serpe': {
        name: 'Sickle', nameFr: 'Serpe',
        damage: '1d4', damageType: 'slashing',
        properties: ['Light'], masteryMove: 'Nick',
        weightKg: 1, price: '1 po', category: 'simple_melee'
    },

    // ========== ARMES COURANTES À DISTANCE ==========
    'arbalete_legere': {
        name: 'Light Crossbow', nameFr: 'Arbalète légère',
        damage: '1d8', damageType: 'piercing',
        properties: ['Loading', 'Two-Handed', 'Ammunition'], masteryMove: 'Slow',
        weightKg: 2.5, price: '25 po', category: 'simple_ranged',
        range: '24/96'
    },
    'arc_court': {
        name: 'Shortbow', nameFr: 'Arc court',
        damage: '1d6', damageType: 'piercing',
        properties: ['Two-Handed', 'Ammunition'], masteryMove: 'Vex',
        weightKg: 1, price: '25 po', category: 'simple_ranged',
        range: '24/96'
    },
    'flechette': {
        name: 'Dart', nameFr: 'Fléchette',
        damage: '1d4', damageType: 'piercing',
        properties: ['Finesse', 'Thrown'], masteryMove: 'Vex',
        weightKg: 0.125, price: '5 pc', category: 'simple_ranged',
        range: '6/18'
    },
    'fronde': {
        name: 'Sling', nameFr: 'Fronde',
        damage: '1d4', damageType: 'bludgeoning',
        properties: ['Ammunition'], masteryMove: 'Slow',
        weightKg: 0, price: '1 pa', category: 'simple_ranged',
        range: '9/36'
    },

    // ========== ARMES DE GUERRE DE CORPS À CORPS ==========
    'cimeterre': {
        name: 'Scimitar', nameFr: 'Cimeterre',
        damage: '1d6', damageType: 'slashing',
        properties: ['Finesse', 'Light'], masteryMove: 'Nick',
        weightKg: 1.5, price: '25 po', category: 'martial_melee'
    },
    'coutille': {
        name: 'Glaive', nameFr: 'Coutille',
        damage: '1d10', damageType: 'slashing',
        properties: ['Reach', 'Two-Handed', 'Heavy'], masteryMove: 'Graze',
        weightKg: 3, price: '20 po', category: 'martial_melee'
    },
    'epee_a_deux_mains': {
        name: 'Greatsword', nameFr: 'Épée à deux mains',
        damage: '2d6', damageType: 'slashing',
        properties: ['Two-Handed', 'Heavy'], masteryMove: 'Graze',
        weightKg: 3, price: '50 po', category: 'martial_melee'
    },
    'epee_courte': {
        name: 'Shortsword', nameFr: 'Épée courte',
        damage: '1d6', damageType: 'piercing',
        properties: ['Finesse', 'Light'], masteryMove: 'Vex',
        weightKg: 1, price: '10 po', category: 'martial_melee'
    },
    'epee_longue': {
        name: 'Longsword', nameFr: 'Épée longue',
        damage: '1d8', damageType: 'slashing',
        properties: ['Versatile'], masteryMove: 'Sap',
        weightKg: 1.5, price: '15 po', category: 'martial_melee',
        versatile: '1d10'
    },
    'fleau_darmes': {
        name: 'Flail', nameFr: "Fléau d'armes",
        damage: '1d8', damageType: 'bludgeoning',
        properties: [], masteryMove: 'Sap',
        weightKg: 1, price: '10 po', category: 'martial_melee'
    },
    'fouet': {
        name: 'Whip', nameFr: 'Fouet',
        damage: '1d4', damageType: 'slashing',
        properties: ['Reach', 'Finesse'], masteryMove: 'Slow',
        weightKg: 1.5, price: '2 po', category: 'martial_melee'
    },
    'hache_a_deux_mains': {
        name: 'Greataxe', nameFr: 'Hache à deux mains',
        damage: '1d12', damageType: 'slashing',
        properties: ['Two-Handed', 'Heavy'], masteryMove: 'Cleave',
        weightKg: 3.5, price: '30 po', category: 'martial_melee'
    },
    'hache_darmes': {
        name: 'Battleaxe', nameFr: "Hache d'armes",
        damage: '1d8', damageType: 'slashing',
        properties: ['Versatile'], masteryMove: 'Topple',
        weightKg: 2, price: '10 po', category: 'martial_melee',
        versatile: '1d10'
    },
    'hallebarde': {
        name: 'Halberd', nameFr: 'Hallebarde',
        damage: '1d10', damageType: 'slashing',
        properties: ['Reach', 'Two-Handed', 'Heavy'], masteryMove: 'Cleave',
        weightKg: 3, price: '20 po', category: 'martial_melee'
    },
    'lance_darcon': {
        name: "Lance", nameFr: "Lance d'arçon",
        damage: '1d10', damageType: 'piercing',
        properties: ['Reach', 'Two-Handed', 'Heavy'], masteryMove: 'Topple',
        weightKg: 3, price: '10 po', category: 'martial_melee'
    },
    'maillet_darmes': {
        name: 'Maul', nameFr: "Maillet d'armes",
        damage: '2d6', damageType: 'bludgeoning',
        properties: ['Two-Handed', 'Heavy'], masteryMove: 'Topple',
        weightKg: 5, price: '10 po', category: 'martial_melee'
    },
    'marteau_de_guerre': {
        name: 'Warhammer', nameFr: 'Marteau de guerre',
        damage: '1d8', damageType: 'bludgeoning',
        properties: ['Versatile'], masteryMove: 'Push',
        weightKg: 2.5, price: '15 po', category: 'martial_melee',
        versatile: '1d10'
    },
    'morgenstern': {
        name: 'Morningstar', nameFr: 'Morgenstern',
        damage: '1d8', damageType: 'piercing',
        properties: [], masteryMove: 'Sap',
        weightKg: 2, price: '15 po', category: 'martial_melee'
    },
    'pic_de_guerre': {
        name: 'War Pick', nameFr: 'Pic de guerre',
        damage: '1d8', damageType: 'piercing',
        properties: ['Versatile'], masteryMove: 'Sap',
        weightKg: 1, price: '5 po', category: 'martial_melee',
        versatile: '1d10'
    },
    'pique': {
        name: 'Pike', nameFr: 'Pique',
        damage: '1d10', damageType: 'piercing',
        properties: ['Reach', 'Two-Handed', 'Heavy'], masteryMove: 'Push',
        weightKg: 9, price: '5 po', category: 'martial_melee'
    },
    'rapiere': {
        name: 'Rapier', nameFr: 'Rapière',
        damage: '1d8', damageType: 'piercing',
        properties: ['Finesse'], masteryMove: 'Vex',
        weightKg: 1, price: '25 po', category: 'martial_melee'
    },
    'trident': {
        name: 'Trident', nameFr: 'Trident',
        damage: '1d8', damageType: 'piercing',
        properties: ['Thrown', 'Versatile'], masteryMove: 'Topple',
        weightKg: 2, price: '5 po', category: 'martial_melee',
        range: '6/18', versatile: '1d10'
    },

    // ========== ARMES DE GUERRE À DISTANCE ==========
    'arbalete_de_poing': {
        name: 'Hand Crossbow', nameFr: 'Arbalète de poing',
        damage: '1d6', damageType: 'piercing',
        properties: ['Light', 'Loading', 'Ammunition'], masteryMove: 'Vex',
        weightKg: 1.5, price: '75 po', category: 'martial_ranged',
        range: '9/36'
    },
    'arbalete_lourde': {
        name: 'Heavy Crossbow', nameFr: 'Arbalète lourde',
        damage: '1d10', damageType: 'piercing',
        properties: ['Heavy', 'Loading', 'Two-Handed', 'Ammunition'], masteryMove: 'Push',
        weightKg: 9, price: '50 po', category: 'martial_ranged',
        range: '30/120'
    },
    'arc_long': {
        name: 'Longbow', nameFr: 'Arc long',
        damage: '1d8', damageType: 'piercing',
        properties: ['Heavy', 'Two-Handed', 'Ammunition'], masteryMove: 'Slow',
        weightKg: 1, price: '50 po', category: 'martial_ranged',
        range: '45/180'
    },
};

// Index by English name and French name for fast lookup
const FR_TO_KEY: Record<string, string> = {};
const EN_TO_KEY: Record<string, string> = {};
for (const [key, w] of Object.entries(WEAPON_TABLE)) {
    FR_TO_KEY[w.nameFr.toLowerCase()] = key;
    EN_TO_KEY[w.name.toLowerCase()] = key;
}

/**
 * Look up a weapon by English or French name.
 * Returns null if not found.
 */
export function getWeapon(name: string): WeaponTemplate | null {
    if (!name) return null;
    const clean = name.toLowerCase().trim();
    // Direct key match
    if (WEAPON_TABLE[clean.replace(/\s+/g, '_')]) return WEAPON_TABLE[clean.replace(/\s+/g, '_')];
    // French name match
    if (FR_TO_KEY[clean]) return WEAPON_TABLE[FR_TO_KEY[clean]];
    // English name match
    if (EN_TO_KEY[clean]) return WEAPON_TABLE[EN_TO_KEY[clean]];
    // Fuzzy: contains
    for (const [fr, key] of Object.entries(FR_TO_KEY)) {
        if (clean.includes(fr) || fr.includes(clean)) return WEAPON_TABLE[key];
    }
    for (const [en, key] of Object.entries(EN_TO_KEY)) {
        if (clean.includes(en) || en.includes(clean)) return WEAPON_TABLE[key];
    }
    return null;
}

/**
 * Compact summary string for Gemini tool response
 */
export function weaponSummary(w: WeaponTemplate): string {
    const props = w.properties.join(', ') || 'Aucune';
    const rangeStr = w.range ? `, Portée: ${w.range}m` : '';
    const versStr = w.versatile ? `, Deux-mains: ${w.versatile}` : '';
    return `${w.nameFr} (${w.name}): ${w.damage} ${w.damageType}${versStr} | Propriétés: ${props}${rangeStr} | Maîtrise: ${w.masteryMove} | Prix: ${w.price}`;
}
