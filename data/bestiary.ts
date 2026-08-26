// D&D 5e Bestiary - Complete Creature Library
// Contains stat blocks for monsters, beasts, NPCs, and allies

// ========== TYPES ==========

import type { SrdMonster } from './srdMonsterTypes';

export type CreatureType =
    | 'beast' | 'humanoid' | 'undead' | 'fiend' | 'dragon'
    | 'monstrosity' | 'construct' | 'elemental' | 'celestial' | 'plant'
    | 'aberration' | 'ooze' | 'fey' | 'giant' | 'swarm';

export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export type DamageType =
    | 'slashing' | 'piercing' | 'bludgeoning'
    | 'fire' | 'cold' | 'lightning' | 'thunder' | 'acid' | 'poison'
    | 'radiant' | 'necrotic' | 'force' | 'psychic';

export interface AttackDamagePart {
    damage: string;
    damageType: DamageType;
}

export interface Attack {
    name: string;
    attackBonus: number;
    damage: string;           // "1d8+3"
    damageType: DamageType;
    reach: number;            // In feet: 5, 10, etc.
    ranged?: { short: number; long: number };  // For ranged attacks
    damageParts?: AttackDamagePart[];
    /** Effet sur touche (bloc SRD) : sauvegarde imposée à la cible, condition sur un échec. */
    onHitSave?: { ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'; value: number; condition?: string };
}

export interface CreatureStats {
    id: string;
    name: string;
    type: CreatureType;
    size: CreatureSize;
    alignment?: string;
    cr: number;               // Challenge Rating
    xp: number;
    hp: {
        base: number;           // Average HP
        dice: string;           // "4d10+8"
    };
    ac: number;
    speed: number;            // In feet
    flySpeed?: number;
    swimSpeed?: number;
    climbSpeed?: number;
    stats: {
        STR: number;
        DEX: number;
        CON: number;
        INT: number;
        WIS: number;
        CHA: number;
    };
    saves?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    skills?: Record<string, number>;
    resistances?: DamageType[];
    immunities?: DamageType[];
    conditionImmunities?: string[];
    vulnerabilities?: DamageType[];
    senses?: string[];
    languages?: string[];
    attacks: Attack[];
    legendaryActions?: number;
    emoji: string;            // For grid display
    action?: string;          // Action text from CSV
    speedStr?: string;        // Full text speed from CSV
    skill?: string;           // Skill text from CSV
    url?: string;             // External reference URL
    imageUrl?: string;        // Image URL derived from reference
}

// ========== HELPER ==========

function mod(stat: number): number {
    return Math.floor((stat - 10) / 2);
}

const DAMAGE_TYPE_ALIASES: Record<string, DamageType> = {
    acid: 'acid',
    bludgeon: 'bludgeoning',
    bludgeoning: 'bludgeoning',
    blunt: 'bludgeoning',
    cold: 'cold',
    fire: 'fire',
    force: 'force',
    lightning: 'lightning',
    necrotic: 'necrotic',
    pierce: 'piercing',
    piercing: 'piercing',
    poison: 'poison',
    psychic: 'psychic',
    radiant: 'radiant',
    slash: 'slashing',
    slashing: 'slashing',
    thunder: 'thunder',
};

export function normalizeDamageType(value?: string): DamageType | null {
    const key = String(value || '').toLowerCase().trim().replace(/[^a-z]/g, '');
    return DAMAGE_TYPE_ALIASES[key] || null;
}

// How many attacks does this creature make per turn? Reads the "Multiattack"
// sentence ("makes two/three attacks", "makes 3 attacks") and returns the count.
// Falls back to 1 when there is no multiattack, capped at 6 for safety.
export const _WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

// ========== LAZY-LOADED BESTIARY ==========
// monsterData.ts is 514KB — lazy-loaded on first use to avoid blocking app startup.

let _lazyBestiary: Record<string, CreatureStats> | null = null;

/** Les capacités structurées (SRD 5.1) par id de fiche, chargées avec le bestiaire. */
export const SRD_ABILITIES: Record<string, SrdMonster> = {};

async function getBestiary(): Promise<Record<string, CreatureStats>> {
    if (!_lazyBestiary) {
        // Depuis le 2026-08-26, la source est data/monsterData2.ts : chaque fiche
        // y embarque sa fiche CSV (`base`, identique à data/monsterData.ts, qui
        // reste intouché) ET ses capacités SRD (souffles, présences, sorts…).
        const { SRD_MONSTERS } = await import('./monsterData2');
        _lazyBestiary = {};
        for (const [id, m] of Object.entries(SRD_MONSTERS)) {
            _lazyBestiary[id] = m.base;
            SRD_ABILITIES[id] = m;
        }
    }
    return _lazyBestiary;
}

/** Le bloc SRD d'une créature (ou null si la fiche est hors SRD sans complément). */
export function getMonsterAbilities(creature?: { id?: string } | null): SrdMonster | null {
    return creature?.id ? (SRD_ABILITIES[creature.id] || null) : null;
}

// Synchronous bestiary for initial render (empty until loaded).
// The BESTIARY object is kept for backwards compatibility and fills lazily.
export const BESTIARY: Record<string, CreatureStats> = {};

// Pre-load in background when app starts (so it's ready before combat)
getBestiary().then(monsters => {
    Object.assign(BESTIARY, monsters);
});

// French to English fallback mapping for common creatures
const FRENCH_BESTIARY_DICT: Record<string, string> = {
    'loup': 'wolf',
    // DA3 — 'bear' et 'horse' n'existent pas dans CSV_MONSTERS : getCreature('Ours')
    // rendait null. On pointe vers les IDs réels.
    'ours': 'brown_bear',
    'ours brun': 'brown_bear',
    'ours noir': 'black_bear',
    'ours polaire': 'polar_bear',
    'araignée': 'giant_spider',
    'araignee': 'giant_spider',
    'rat': 'giant_rat',
    'cheval': 'riding_horse',
    'cheval de selle': 'riding_horse',
    'cheval de guerre': 'warhorse',
    'destrier': 'warhorse',
    'gobelin': 'goblin',
    'orque': 'orc',
    'bandit': 'bandit',
    'garde': 'guard',
    'chevalier': 'knight',
    'cultiste': 'cultist',
    'sectateur': 'cultist',
    'squelette': 'skeleton',
    'zombie': 'zombie',
    'goule': 'ghoul',
    // DM5 (contre-audit) — « Spectre » FR = specter SRD (CR 1, 22 PV), PAS la
    // wraith (CR 5, 67 PV) : un groupe niveau 2 affrontait deux CR 5.
    'spectre': 'specter',
    'âme en peine': 'wraith',
    'ame en peine': 'wraith',
    'ours-hibou': 'owlbear',
    'hibours': 'owlbear',
    'mimique': 'mimic',
    'diablotin': 'imp',
    'chien de l\'enfer': 'hell_hound',
    'dragon': 'young_red_dragon'
};

// DA1 — affichage des CR fractionnaires (0.125/0.25/0.5 → « 1/8 »/« 1/4 »/« 1/2 »).
export function formatCR(cr: number): string {
    if (cr === 0.125) return '1/8';
    if (cr === 0.25) return '1/4';
    if (cr === 0.5) return '1/2';
    return String(cr);
}

// Get creature by name (case insensitive, robust fuzzy matching)
export function getCreature(name: string): CreatureStats | null {
    if (!name) return null;

    // 1. Clean the string (lowercase, trim)
    let cleanName = name.toLowerCase().trim();

    // 2. Remove trailing numbers (e.g., "Goblin 1" -> "goblin", "Cultiste 2" -> "cultiste")
    let baseName = cleanName.replace(/\s+\d+$/, '').trim();

    // 3. Direct match via exact key format
    let key = baseName.replace(/\s+/g, '_');
    if (BESTIARY[key]) return BESTIARY[key];

    // Correspondance en MOTS ENTIERS uniquement : le test par sous-chaîne brute
    // détournait les noms custom du MJ — « Croc de Fer » contient « roc » et
    // devenait silencieusement un Roc du bestiaire (mauvais PV, mauvaise CA,
    // mauvaises attaques). « Chef cultiste des Trois » doit toujours matcher
    // « cultist », mais par frontière de mot, pas par inclusion aveugle.
    const wordMatch = (needle: string): boolean => {
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu').test(baseName);
    };

    // DM16 (contre-audit) — dragons nommés en FRANÇAIS : le fallback générique
    // 'dragon' → young_red_dragon capturait « Dragon blanc ancien » (mauvaise
    // couleur, mauvais âge, mauvais souffle). Résolution couleur + âge d'abord.
    if (wordMatch('dragon')) {
        const DRAGON_COLORS: Record<string, string> = {
            'rouge': 'red', 'blanc': 'white', 'blanche': 'white', 'noir': 'black', 'noire': 'black',
            'bleu': 'blue', 'bleue': 'blue', 'vert': 'green', 'verte': 'green',
            'airain': 'brass', 'bronze': 'bronze', 'cuivre': 'copper', 'or': 'gold', 'argent': 'silver',
            'red': 'red', 'white': 'white', 'black': 'black', 'blue': 'blue', 'green': 'green',
            'brass': 'brass', 'copper': 'copper', 'gold': 'gold', 'silver': 'silver',
        };
        const color = Object.keys(DRAGON_COLORS).find(c => wordMatch(c));
        if (color) {
            const en = DRAGON_COLORS[color];
            let dragonKey: string;
            if (wordMatch('dragonnet') || wordMatch('wyrmling')) dragonKey = `${en}_dragon_wyrmling`;
            else if (wordMatch('ancien') || wordMatch('ancienne') || wordMatch('ancient')) dragonKey = `ancient_${en}_dragon`;
            else if (wordMatch('adulte') || wordMatch('adult')) dragonKey = `adult_${en}_dragon`;
            else dragonKey = `young_${en}_dragon`;
            if (BESTIARY[dragonKey]) return BESTIARY[dragonKey];
        }
    }

    // 4. Try English lookup from French lookup table
    for (const [fr, en] of Object.entries(FRENCH_BESTIARY_DICT)) {
        if (wordMatch(fr) && BESTIARY[en]) return BESTIARY[en];
    }

    // 5. Fuzzy whole-word matching against Bestiary keys
    for (const bestiaryKey of Object.keys(BESTIARY)) {
        // e.g. "huge giant spider of doom" contains the words "giant spider"
        if (wordMatch(bestiaryKey.replace(/_/g, ' '))) {
            return BESTIARY[bestiaryKey];
        }
    }

    return null;
}

/**
 * Les fiches les plus proches d'un nom que getCreature n'a pas résolu — pour
 * que le MJ, refusé, puisse se corriger au lieu d'inventer (2026-08-26 : le
 * MJ ne fait plus apparaître que des créatures du bestiaire). Similarité par
 * bigrammes de lettres (coefficient de Dice), le dictionnaire français
 * appliqué mot à mot d'abord.
 */
export function suggestCreatures(name: string, count = 5): string[] {
    const words = String(name || '').toLowerCase().replace(/\s+\d+$/, '').split(/[^\p{L}]+/u).filter(Boolean)
        .map(w => FRENCH_BESTIARY_DICT[w] ? FRENCH_BESTIARY_DICT[w].replace(/_/g, ' ') : w);
    const needle = words.join(' ');
    if (needle.length < 2) return [];
    const bigrams = (s: string): Map<string, number> => {
        const m = new Map<string, number>();
        const t = ` ${s} `;
        for (let i = 0; i < t.length - 1; i++) {
            const b = t.slice(i, i + 2);
            m.set(b, (m.get(b) || 0) + 1);
        }
        return m;
    };
    const a = bigrams(needle);
    const sizeA = [...a.values()].reduce((s, v) => s + v, 0);
    const scored = Object.values(BESTIARY).map(c => {
        const b = bigrams(c.name.toLowerCase());
        let shared = 0;
        for (const [k, v] of a) shared += Math.min(v, b.get(k) || 0);
        const sizeB = [...b.values()].reduce((s, v) => s + v, 0);
        return { name: c.name, score: (2 * shared) / (sizeA + sizeB) };
    });
    return scored.filter(s => s.score > 0.2).sort((x, y) => y.score - x.score).slice(0, count).map(s => s.name);
}
