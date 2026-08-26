import { BESTIARY, type CreatureStats } from '../data/bestiary';
import { getCreatureAttacks } from './monsterAttacks';
import { SRD51_ACTIONS, SRD51_CONDITIONS, SRD51_ITEMS, SRD51_RULES, SRD51_SPELLS } from '../data/srd51';
import {
    CodexDamageType,
    CodexEntry,
    CodexEntryKind,
    CodexMonsterRef,
    CodexSource,
    ConditionEntry,
    EncounterBuildRequest,
    EncounterBuildResult,
    EncounterDifficulty,
    Item,
    ItemEntry,
    RuleEntry,
    SpellEntry,
} from '../types';

const SRD_SOURCE: CodexSource = {
    sourceKind: 'srd5.1',
    license: 'CC-BY-4.0',
    attribution: 'System Reference Document 5.1. Content summarized into structured game data.',
    sourceUrl: 'https://www.dndbeyond.com/srd',
};

const BESTIARY_SOURCE: CodexSource = {
    sourceKind: 'current-bestiary',
    license: 'reference-only',
    attribution: 'Current project bestiary. Monster media and AideDD links remain external references only.',
    externalOnly: true,
};

const DAMAGE_TYPE_ALIASES: Record<string, CodexDamageType> = {
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

const XP_THRESHOLDS_BY_LEVEL: Record<EncounterDifficulty, number[]> = {
    easy: [25, 50, 75, 125, 250, 300, 350, 450, 550, 600, 800, 1000, 1100, 1250, 1400, 1600, 2000, 2100, 2400, 2800],
    medium: [50, 100, 150, 250, 500, 600, 750, 900, 1100, 1200, 1600, 2000, 2200, 2500, 2800, 3200, 3900, 4200, 4900, 5700],
    hard: [75, 150, 225, 375, 750, 900, 1100, 1400, 1600, 1900, 2400, 3000, 3400, 3800, 4300, 4800, 5900, 6300, 7300, 8500],
    deadly: [100, 200, 400, 500, 1100, 1400, 1700, 2100, 2400, 2800, 3600, 4500, 5100, 5700, 6400, 7200, 8800, 9500, 10900, 12700],
};

function slug(value: string): string {
    return String(value || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function textIncludes(entry: { name: string; aliases?: string[] }, query: string): boolean {
    const needle = slug(query);
    if (!needle) return true;
    return slug(entry.name).includes(needle) || Boolean(entry.aliases?.some(alias => slug(alias).includes(needle)));
}

export function normalizeDamageType(value?: string | null): CodexDamageType | undefined {
    if (!value) return undefined;
    const key = slug(value).replace(/_/g, '');
    return DAMAGE_TYPE_ALIASES[key] || DAMAGE_TYPE_ALIASES[String(value).toLowerCase().trim()];
}

function encounterMultiplier(count: number): number {
    if (count <= 1) return 1;
    if (count === 2) return 1.5;
    if (count <= 6) return 2;
    if (count <= 10) return 2.5;
    if (count <= 14) return 3;
    return 4;
}

let monsterCache: Record<string, CreatureStats> | null = Object.keys(BESTIARY).length ? BESTIARY : null;
let monsterLoadPromise: Promise<Record<string, CreatureStats>> | null = null;

export async function preloadCodexBestiary(): Promise<Record<string, CreatureStats>> {
    if (monsterCache && Object.keys(monsterCache).length > 0) return monsterCache;
    if (!monsterLoadPromise) {
        monsterLoadPromise = import('../data/monsterData').then(({ CSV_MONSTERS }) => {
            monsterCache = CSV_MONSTERS;
            Object.assign(BESTIARY, CSV_MONSTERS);
            return CSV_MONSTERS;
        });
    }
    return monsterLoadPromise;
}

function bestiarySnapshot(): Record<string, CreatureStats> {
    if (monsterCache && Object.keys(monsterCache).length > 0) return monsterCache;
    if (Object.keys(BESTIARY).length > 0) {
        monsterCache = BESTIARY;
        return monsterCache;
    }
    void preloadCodexBestiary();
    return {};
}

function inferMonsterRole(creature: CreatureStats): CodexMonsterRef['role'] {
    const action = String(creature.action || '').toLowerCase();
    const attacks = getCreatureAttacks(creature);
    const hasRanged = attacks.some(attack => attack.ranged || attack.reach > 30);
    const hasControl = /save|saving throw|restrain|paraly|poison|frighten|charm|prone|grapple/.test(action);
    if (creature.cr >= 5 && creature.hp.base >= 90) return 'solo';
    if (hasControl) return 'controller';
    if (hasRanged) return 'artillery';
    if ((creature.speed || 0) > 30 || creature.flySpeed || creature.climbSpeed || creature.swimSpeed || creature.stats.DEX >= 16) return 'skirmisher';
    if (creature.cr <= 0.25 || creature.hp.base <= 10) return 'minion';
    return 'brute';
}

function toMonsterRef(creature: CreatureStats): CodexMonsterRef {
    const attacks = getCreatureAttacks(creature);
    return {
        kind: 'monster',
        id: creature.id,
        name: creature.name,
        cr: creature.cr,
        xp: creature.xp,
        hp: creature.hp.base,
        hpDice: creature.hp.dice,
        ac: creature.ac,
        type: creature.type,
        size: creature.size,
        role: inferMonsterRole(creature),
        attacks: attacks.map(attack => ({
            name: attack.name,
            attackBonus: attack.attackBonus,
            damage: attack.damage,
            damageType: normalizeDamageType(attack.damageType) || 'bludgeoning',
            reach: attack.reach,
            range: attack.ranged ? `${attack.ranged.short}/${attack.ranged.long}` : undefined,
            damageParts: attack.damageParts?.map(part => ({
                damage: part.damage,
                damageType: normalizeDamageType(part.damageType) || 'bludgeoning',
            })),
        })),
        resistances: creature.resistances?.map(normalizeDamageType).filter(Boolean) as CodexDamageType[] | undefined,
        immunities: creature.immunities?.map(normalizeDamageType).filter(Boolean) as CodexDamageType[] | undefined,
        vulnerabilities: creature.vulnerabilities?.map(normalizeDamageType).filter(Boolean) as CodexDamageType[] | undefined,
        conditionImmunities: creature.conditionImmunities,
        // Audit 2026-08-12 — le ref ne portait NI stats NI saves : tout monstre
        // résolu via lookupMonster sauvegardait à +0 plat (un Liche à +0 SAG).
        // Les moteurs testent `'saves' in x` puis `'stats' in x` — les deux
        // doivent voyager avec le ref.
        stats: creature.stats,
        saves: creature.saves,
        portrait: creature.imageUrl,
        source: {
            ...BESTIARY_SOURCE,
            sourceUrl: creature.url,
        },
    };
}

function allMonsterRefs(): CodexMonsterRef[] {
    return Object.values(bestiarySnapshot()).map(toMonsterRef);
}

// TP1 (contre-audit 2026-08-13) — résolution EXACTE d'abord, sous-chaîne ensuite.
// Le premier match par inclusion masquait des entrées existantes : « Heal » →
// Healing Word, « Harm » → Charm Person, alias FR « Éclair » → Guiding Bolt.
// Même patron que lookupItem (exact → alias exact → inclusion).
function exactThenFuzzy<T extends { id: string; name: string; aliases?: string[] }>(
    entries: readonly T[],
    name: string,
    fuzzy: (entry: T, needle: string) => boolean,
): T | null {
    if (!name) return null;
    const needle = slug(name);
    const exact = entries.find(e =>
        e.id === needle
        || slug(e.name) === needle
        || (e.aliases || []).some(a => slug(a) === needle));
    if (exact) return exact;
    return entries.find(e => fuzzy(e, name)) || null;
}

export function lookupSpell(name: string): SpellEntry | null {
    return exactThenFuzzy(SRD51_SPELLS, name, (spell, n) => textIncludes(spell, n));
}

/** Sort de ZONE ? Détecté sur les champs structurés (target/mechanics) : cône,
 *  rayon, cube, ligne, sphère, « each creature », marqueur 'Area spell.'. Sert
 *  au panneau de combat pour ne proposer « tous les ennemis » que sur les
 *  vrais sorts de zone (Boule de feu oui, Soins non). */
export function isAreaSpell(spell: Pick<SpellEntry, 'target' | 'mechanics'> | null | undefined): boolean {
    if (!spell) return false;
    const hay = `${spell.target || ''} | ${(spell.mechanics || []).join(' ')}`;
    return /\b(cone|c[ôo]ne|radius|rayon|sphere|sph[eè]re|cube|line|ligne|square|carr[ée]|area spell|zone|each creature|chaque cr[ée]ature)\b/i.test(hay);
}

export function lookupRule(name: string): RuleEntry | null {
    return exactThenFuzzy(SRD51_RULES, name, (rule, n) => textIncludes(rule, n));
}

export function lookupCondition(name: string): ConditionEntry | null {
    return exactThenFuzzy(SRD51_CONDITIONS, name, (condition, n) => textIncludes(condition, n));
}

export function lookupItem(name: string): ItemEntry | null {
    if (!name) return null;
    const cleanName = slug(name);
    
    // 1. Exact or direct slug match
    const exact = SRD51_ITEMS.find(item => slug(item.name) === cleanName || item.id === cleanName);
    if (exact) return exact;

    // 2. Standard textIncludes match
    const std = SRD51_ITEMS.find(item => textIncludes(item, name) || item.id === cleanName);
    if (std) return std;

    // 3. Fuzzy match: check if the custom item name contains the SRD item name as a word/substring.
    // Sort SRD items by name length descending so that "shortsword" matches before "sword".
    const sortedItems = [...SRD51_ITEMS].sort((a, b) => b.name.length - a.name.length);
    const fuzzy = sortedItems.find(item => {
        const itemSlug = slug(item.name);
        return cleanName.includes(itemSlug) || Boolean(item.aliases?.some(alias => cleanName.includes(slug(alias))));
    });
    return fuzzy || null;
}

export function lookupMonster(name: string): CodexMonsterRef | null {
    if (!name) return null;
    const clean = slug(name.replace(/\s+\d+$/, ''));
    const monsters = bestiarySnapshot();
    if (monsters[clean]) return toMonsterRef(monsters[clean]);

    const exact = Object.values(monsters).find(creature => slug(creature.name) === clean);
    if (exact) return toMonsterRef(exact);

    // Correspondance en MOTS ENTIERS de slug : l'inclusion brute détournait les
    // noms custom — « Croc de Fer » (croc_de_fer) contient « roc » et héritait
    // des stats/attaques du Roc du bestiaire.
    const containsWholeWord = (haystack: string, needle: string): boolean => {
        if (!needle) return false;
        const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
    };
    const fuzzy = Object.values(monsters).find(creature => {
        const creatureKey = slug(creature.name);
        return containsWholeWord(clean, creatureKey) || containsWholeWord(creatureKey, clean);
    });

    return fuzzy ? toMonsterRef(fuzzy) : null;
}

export function parseLegacyItemEffect(effect?: string): Partial<ItemEntry> {
    const text = String(effect || '').trim();
    if (!text) return {};

    const damageMatch = text.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*([a-zA-Z]+)/);
    const acMatch = text.match(/(?:^|\s)([+-]?\d+)\s*AC/i);
    const rangeMatch = text.match(/(?:thrown|range)?\s*(\d+)\s*\/\s*(\d+)/i);
    const damageType = normalizeDamageType(damageMatch?.[2]);

    const result: Partial<ItemEntry> = { effect: text };
    if (damageMatch) result.damageDice = damageMatch[1].replace(/\s+/g, '');
    if (damageType) result.damageType = damageType;
    if (rangeMatch) result.range = `${rangeMatch[1]}/${rangeMatch[2]}`;
    if (acMatch) {
        const ac = Number(acMatch[1]);
        if (Number.isFinite(ac)) {
            if (text.trim().startsWith('+') || text.trim().startsWith('-')) result.acBonus = ac;
            else result.ac = ac;
        }
    }
    const properties: string[] = [];
    if (/thrown/i.test(text)) properties.push('thrown');
    if (/two.?hand/i.test(text)) properties.push('two-handed');
    if (properties.length) result.properties = properties;

    return result;
}

export function structureInventoryItem(item: Item): ItemEntry {
    const srd = lookupItem(item.name);
    const parsed = parseLegacyItemEffect(item.effect);

    return {
        kind: 'item',
        id: item.id || slug(item.name),
        name: item.name,
        itemType: item.type,
        effect: item.effect,
        damageDice: item.damageDice || srd?.damageDice || parsed.damageDice,
        damageType: item.damageType || srd?.damageType || parsed.damageType,
        properties: item.properties || srd?.properties || parsed.properties,
        range: item.range || srd?.range || parsed.range,
        weight: item.weight || srd?.weight,
        ac: item.baseAC || srd?.ac || parsed.ac,
        acBonus: item.acBonus || srd?.acBonus || parsed.acBonus,
        armorType: item.armorType || srd?.armorType,
        maxDexBonus: item.maxDexBonus ?? srd?.maxDexBonus,
        stealthDisadvantage: item.stealthDisadvantage ?? srd?.stealthDisadvantage,
        value: item.value || srd?.value,
        source: srd?.source || {
            sourceKind: 'homebrew',
            license: 'homebrew',
            attribution: 'Structured from the current campaign inventory.',
        },
    };
}

function addDiceFormula(base: string, extra: string, count: number): string {
    if (count <= 0) return base;
    const baseMatch = base.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    const extraMatch = extra.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (baseMatch && extraMatch && baseMatch[2] === extraMatch[2] && !extraMatch[3]) {
        const dice = Number(baseMatch[1]) + Number(extraMatch[1]) * count;
        return `${dice}d${baseMatch[2]}${baseMatch[3] || ''}`;
    }
    return `${base}+${Array.from({ length: count }, () => extra).join('+')}`;
}

export function getScaledSpellDice(spell: SpellEntry, slotLevel?: number, characterLevel = 1): { damageDice?: string; healingDice?: string } {
    const damage = spell.damage;
    const healing = spell.healing;

    if (damage?.scaling?.mode === 'characterLevel' && damage.scaling.tiers) {
        const tier = Object.keys(damage.scaling.tiers)
            .map(Number)
            .sort((a, b) => a - b)
            .filter(level => characterLevel >= level)
            .pop();
        return { damageDice: tier ? damage.scaling.tiers[tier] : damage.dice };
    }

    if (damage?.scaling?.mode === 'slot' && slotLevel) {
        const fromLevel = damage.scaling.fromLevel || spell.level + 1;
        return { damageDice: addDiceFormula(damage.dice, damage.scaling.addPerLevel || '1d6', Math.max(0, slotLevel - fromLevel + 1)) };
    }

    if (healing?.scaling?.mode === 'slot' && slotLevel) {
        const fromLevel = healing.scaling.fromLevel || spell.level + 1;
        return { healingDice: addDiceFormula(healing.dice, healing.scaling.addPerLevel || '1d8', Math.max(0, slotLevel - fromLevel + 1)) };
    }

    return { damageDice: damage?.dice, healingDice: healing?.dice };
}

export function searchCodex(kind: CodexEntryKind | 'all', query = '', limit = 40): CodexEntry[] {
    const q = query.trim();
    const entries: CodexEntry[] = [
        ...SRD51_SPELLS,
        ...SRD51_RULES,
        ...SRD51_ACTIONS,
        ...SRD51_CONDITIONS,
        ...SRD51_ITEMS,
        ...(kind === 'monster' || kind === 'all' ? allMonsterRefs() : []),
    ];

    return entries
        .filter(entry => kind === 'all' || entry.kind === kind)
        .filter(entry => !q || slug(entry.name).includes(slug(q)))
        .slice(0, limit);
}

// Map a playable class name to the spell-list class tag used in the spell data
// (the playable arcane class is "Mage" but spells are tagged "Wizard").
const SPELL_CLASS_BY_PLAYABLE: Record<string, string> = {
    Bard: 'Bard', Cleric: 'Cleric', Druid: 'Druid', Mage: 'Wizard', Wizard: 'Wizard',
    Sorcerer: 'Sorcerer', Warlock: 'Warlock', Paladin: 'Paladin', Ranger: 'Ranger',
};

export function spellClassFor(playableClass: string): string {
    return SPELL_CLASS_BY_PLAYABLE[playableClass] || playableClass;
}

/**
 * Highest spell level a class can CAST at a given character level (SRD slot
 * progression). 0 = non-caster (or a half-caster below level 2). Used by the
 * level-up spell picker to gate what can be learned.
 */
export function maxSpellLevelForClass(playableClass: string, level: number): number {
    const lvl = Math.max(1, Math.min(20, Math.trunc(level || 1)));
    if (playableClass === 'Warlock') {
        return lvl >= 9 ? 5 : lvl >= 7 ? 4 : lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
    }
    const fullCasters = ['Bard', 'Cleric', 'Druid', 'Mage', 'Wizard', 'Sorcerer'];
    if (fullCasters.includes(playableClass)) {
        return Math.min(9, Math.ceil(lvl / 2));
    }
    if (playableClass === 'Paladin' || playableClass === 'Ranger') {
        if (lvl < 2) return 0;
        return Math.min(5, Math.ceil(lvl / 4));
    }
    return 0;
}

/**
 * Spells available to a class, optionally capped at maxLevel (use for the
 * "Add spells" browser so a caster only sees their own list up to slots they
 * can use). Cantrips (level 0) are always included. Sorted by level then name.
 */
export function spellsForClass(playableClass: string, maxLevel?: number): SpellEntry[] {
    const cls = spellClassFor(playableClass);
    return SRD51_SPELLS
        .filter(spell => spell.classes.includes(cls))
        .filter(spell => maxLevel === undefined || spell.level === 0 || spell.level <= maxLevel)
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function calculateEncounterBudget(level: number, partySize: number, difficulty: EncounterDifficulty): number {
    const safeLevel = Math.max(1, Math.min(20, Math.trunc(level || 1)));
    const safePartySize = Math.max(1, Math.min(8, Math.trunc(partySize || 1)));
    return XP_THRESHOLDS_BY_LEVEL[difficulty][safeLevel - 1] * safePartySize;
}

/** Pression SRD de la rencontre EN COURS : somme des XP de base des ennemis
 *  vivants × multiplicateur de nombre, face au plafond « deadly » du groupe.
 *  Garde-fou d'add_enemy_init (un mage niv 1 recevait 4 loups = 4× le seuil
 *  mortel) et jauge du contexte directeur. Le plafond tolère +25 % au-delà de
 *  « deadly » : les campagnes scriptent des combats mortels, pas des exécutions. */
export function assessEncounterPressure(enemyXPs: number[], partyLevel: number, partySize: number): {
    count: number; baseXP: number; multiplier: number; adjustedXP: number;
    deadlyBudget: number; cap: number; overCap: boolean;
} {
    const xs = enemyXPs.filter(x => Number.isFinite(x) && x > 0);
    const baseXP = xs.reduce((sum, x) => sum + x, 0);
    const multiplier = encounterMultiplier(xs.length);
    const adjustedXP = Math.round(baseXP * multiplier);
    const deadlyBudget = calculateEncounterBudget(partyLevel, partySize, 'deadly');
    const cap = Math.round(deadlyBudget * 1.25);
    return { count: xs.length, baseXP, multiplier, adjustedXP, deadlyBudget, cap, overCap: adjustedXP > cap };
}

function monsterMatchesTheme(monster: CodexMonsterRef, request: EncounterBuildRequest): boolean {
    const haystack = `${monster.name} ${monster.type} ${monster.role}`.toLowerCase();
    const theme = String(request.theme || request.biome || '').toLowerCase();
    if (!theme) return true;
    return theme.split(/\s+/).some(token => token.length > 2 && haystack.includes(token));
}

export function buildEncounter(request: EncounterBuildRequest): EncounterBuildResult {
    // Validate difficulty against the known thresholds. An unknown value (e.g. the DM
    // inventing "trivial"/"impossible") made XP_THRESHOLDS_BY_LEVEL[difficulty] undefined
    // and crashed calculateEncounterBudget — clamp to a valid tier instead.
    const difficulty: EncounterDifficulty = (request.difficulty && request.difficulty in XP_THRESHOLDS_BY_LEVEL)
        ? request.difficulty
        : 'medium';
    const partyLevel = Math.max(1, Math.min(20, Math.trunc(request.partyLevel || 1)));
    const partySize = Math.max(1, Math.min(8, Math.trunc(request.partySize || 1)));
    const maxMonsters = Math.max(1, Math.min(10, Math.trunc(request.maxMonsters || 4)));
    const xpBudget = calculateEncounterBudget(partyLevel, partySize, difficulty);
    const maxCR = Math.max(0.125, partyLevel + (difficulty === 'deadly' ? 2 : difficulty === 'hard' ? 1 : 0));

    let candidates = allMonsterRefs()
        .filter(monster => monster.cr <= maxCR && monster.xp <= xpBudget * 1.25)
        .filter(monster => !request.role || monster.role === request.role)
        .filter(monster => monsterMatchesTheme(monster, request))
        .sort((a, b) => Math.abs(a.xp - xpBudget / 2) - Math.abs(b.xp - xpBudget / 2));

    if (!candidates.length) {
        candidates = allMonsterRefs()
            .filter(monster => monster.cr <= maxCR && monster.xp <= xpBudget * 1.25)
            .sort((a, b) => b.xp - a.xp);
    }

    const selected: CodexMonsterRef[] = [];
    let baseXP = 0;
    for (const monster of candidates) {
        if (selected.length >= maxMonsters) break;
        const projectedBase = baseXP + monster.xp;
        const projectedAdjusted = projectedBase * encounterMultiplier(selected.length + 1);
        if (projectedAdjusted <= xpBudget * 1.25 || selected.length === 0) {
            selected.push(monster);
            baseXP = projectedBase;
        }
        if (baseXP * encounterMultiplier(selected.length) >= xpBudget * 0.75) break;
    }

    const multiplier = encounterMultiplier(selected.length);
    const adjustedXP = Math.round(baseXP * multiplier);
    return {
        request: { ...request, partyLevel, partySize, difficulty, maxMonsters },
        xpBudget,
        baseXP,
        adjustedXP,
        multiplier,
        difficulty,
        monsters: selected,
        notes: [
            'Built from the current bestiary, not from scraped live content.',
            `Difficulty budget ${xpBudget} XP; adjusted encounter XP ${adjustedXP}.`,
            selected.length ? 'Use startNow=true from the Gemini tool to push this encounter into initiative.' : 'No matching monster found for the requested filters.',
        ],
        source: {
            ...SRD_SOURCE,
            attribution: 'SRD 5.1 encounter XP thresholds with monsters selected from the current project bestiary.',
        },
    };
}
