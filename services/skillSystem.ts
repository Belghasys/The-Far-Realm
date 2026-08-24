// D&D 5e Skill System
// Maps skills to their governing ability scores
import type { Ability } from '../types';

export const SKILL_ABILITIES: Record<string, 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'> = {
    // Strength
    'Athletics': 'STR',

    // Dexterity
    'Acrobatics': 'DEX',
    'Sleight of Hand': 'DEX',
    'Stealth': 'DEX',

    // Intelligence
    'Arcana': 'INT',
    'History': 'INT',
    'Investigation': 'INT',
    'Nature': 'INT',
    'Religion': 'INT',

    // Wisdom
    'Animal Handling': 'WIS',
    'Insight': 'WIS',
    'Medicine': 'WIS',
    'Perception': 'WIS',
    'Survival': 'WIS',

    // Charisma
    'Deception': 'CHA',
    'Intimidation': 'CHA',
    'Performance': 'CHA',
    'Persuasion': 'CHA',
};

// French translations for skill names
export const SKILL_TRANSLATIONS: Record<string, string> = {
    'Athlétisme': 'Athletics',
    'Acrobatie': 'Acrobatics',
    'Escamotage': 'Sleight of Hand',
    'Discrétion': 'Stealth',
    'Arcanes': 'Arcana',
    'Histoire': 'History',
    'Investigation': 'Investigation',
    'Nature': 'Nature',
    'Religion': 'Religion',
    'Dressage': 'Animal Handling',
    'Perspicacité': 'Insight',
    'Médecine': 'Medicine',
    'Perception': 'Perception',
    'Survie': 'Survival',
    'Tromperie': 'Deception',
    'Intimidation': 'Intimidation',
    'Représentation': 'Performance',
    'Persuasion': 'Persuasion',
};

/**
 * Resolve any skill spelling (EN canonical, FR translation, loose case, light
 * fuzzy) to the canonical ENGLISH key used by stored proficiency lists.
 * request_roll may pass either language — comparing raw strings silently
 * dropped proficiency/expertise whenever the DM spoke French ("Discrétion"
 * never matched the stored "Stealth").
 */
export function canonicalSkillName(name: string): string {
    const raw = String(name || '').trim();
    if (!raw) return raw;
    if (SKILL_ABILITIES[raw]) return raw;
    if (SKILL_TRANSLATIONS[raw]) return SKILL_TRANSLATIONS[raw];
    const lower = raw.toLowerCase();
    for (const key of Object.keys(SKILL_ABILITIES)) {
        if (key.toLowerCase() === lower) return key;
    }
    for (const [fr, en] of Object.entries(SKILL_TRANSLATIONS)) {
        if (fr.toLowerCase() === lower) return en;
    }
    for (const key of Object.keys(SKILL_ABILITIES)) {
        const k = key.toLowerCase();
        if (k.includes(lower) || lower.includes(k)) return key;
    }
    for (const [fr, en] of Object.entries(SKILL_TRANSLATIONS)) {
        const f = fr.toLowerCase();
        if (f.includes(lower) || lower.includes(f)) return en;
    }
    return raw;
}

// Get the ability modifier for a skill
export function getSkillAbility(skillName: string): 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' {
    // Try direct match
    if (SKILL_ABILITIES[skillName]) {
        return SKILL_ABILITIES[skillName];
    }

    // Try French translation
    const englishName = SKILL_TRANSLATIONS[skillName];
    if (englishName && SKILL_ABILITIES[englishName]) {
        return SKILL_ABILITIES[englishName];
    }

    // Fuzzy match
    const lower = skillName.toLowerCase();
    for (const [skill, ability] of Object.entries(SKILL_ABILITIES)) {
        if (skill.toLowerCase().includes(lower) || lower.includes(skill.toLowerCase())) {
            return ability;
        }
    }

    // Default fallback by common keywords
    if (lower.includes('strength') || lower.includes('force')) return 'STR';
    if (lower.includes('dex') || lower.includes('reflex')) return 'DEX';
    if (lower.includes('con') || lower.includes('fortitude')) return 'CON';
    if (lower.includes('int') || lower.includes('knowledge')) return 'INT';
    if (lower.includes('wis') || lower.includes('will') || lower.includes('sagesse')) return 'WIS';
    if (lower.includes('cha') || lower.includes('social')) return 'CHA';

    // Ultimate fallback
    return 'WIS';
}

// Saving throw abilities
export const SAVING_THROWS: Record<string, 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'> = {
    'Strength': 'STR',
    'Force': 'STR',
    'STR': 'STR',
    'Dexterity': 'DEX',
    'Dextérité': 'DEX',
    'DEX': 'DEX',
    'Reflex': 'DEX',
    'Constitution': 'CON',
    'CON': 'CON',
    'Fortitude': 'CON',
    'Intelligence': 'INT',
    'INT': 'INT',
    'Wisdom': 'WIS',
    'Sagesse': 'WIS',
    'WIS': 'WIS',
    'Will': 'WIS',
    'Charisma': 'CHA',
    'Charisme': 'CHA',
    'CHA': 'CHA',
};

export function getSaveAbility(saveName: string): 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' {
    // Direct match
    if (SAVING_THROWS[saveName]) {
        return SAVING_THROWS[saveName];
    }

    // Fuzzy match
    const lower = saveName.toLowerCase();
    for (const [save, ability] of Object.entries(SAVING_THROWS)) {
        if (save.toLowerCase().includes(lower) || lower.includes(save.toLowerCase())) {
            return ability;
        }
    }

    return 'CON'; // Default
}

// Calculate skill modifier
export function calculateSkillModifier(
    stats: Record<string, number>,
    skillName: string,
    proficiencies: string[] = [],
    level: number = 1
): number {
    const ability = getSkillAbility(skillName);
    const abilityMod = Math.floor((stats[ability] - 10) / 2);

    // Proficiency bonus by level
    const profBonus = Math.floor((level - 1) / 4) + 2;

    // Check if proficient — canonicalized so FR/EN spellings co-match, but still
    // an exact-key comparison (no Perception ↔ Deception false positives).
    const canonSkill = canonicalSkillName(skillName).toLowerCase();
    const isProficient = proficiencies.some(p => {
        const lowerP = p.toLowerCase();
        return canonicalSkillName(p).toLowerCase() === canonSkill || lowerP === ability.toLowerCase();
    });

    return abilityMod + (isProficient ? profBonus : 0);
}

// Calculate save modifier
export function calculateSaveModifier(
    stats: Record<string, number>,
    saveName: string,
    proficiencies: string[] = [],
    level: number = 1
): number {
    const ability = getSaveAbility(saveName);
    const abilityMod = Math.floor((stats[ability] - 10) / 2);

    // Proficiency bonus by level
    const profBonus = Math.floor((level - 1) / 4) + 2;

    // Check if proficient in this save (exact ability match, not loose 'save' keyword)
    const isProficient = proficiencies.some(p => {
        const lowerP = p.toLowerCase();
        return lowerP === ability.toLowerCase() ||
               lowerP === saveName.toLowerCase() ||
               lowerP.includes(ability.toLowerCase() + ' save');
    });

    return abilityMod + (isProficient ? profBonus : 0);
}

export const proficiencyBonus = (level: number) => Math.floor((Math.max(1, level) - 1) / 4) + 2;

/**
 * The single source of truth for "what modifier does the SHEET give for this
 * check?" — used by request_roll so a skill/save/ability check uses the
 * character's real ability modifier + proficiency + expertise instead of a
 * number the LLM invented. `effectiveStats` must already include racial bonuses
 * (pass getEffectiveStat results). For a save, pass isSave + proficientSaves
 * (the class's two save proficiencies, e.g. ['DEX','INT']).
 */
export function getCheckModifier(params: {
    effectiveStats: Record<string, number>;
    level: number;
    skill?: string;
    ability?: string;
    isSave?: boolean;
    proficiencies?: string[];
    expertise?: string[];
    proficientSaves?: string[];
}): { modifier: number; ability: Ability; proficient: boolean; expert: boolean; label: string } {
    const { effectiveStats, level, skill, ability, isSave, proficiencies = [], expertise = [], proficientSaves = [] } = params;
    const prof = proficiencyBonus(level);

    const abil: Ability = skill ? getSkillAbility(skill) : ability ? getSaveAbility(ability) : 'STR';
    const abilityMod = Math.floor(((effectiveStats[abil] ?? 10) - 10) / 2);

    let proficient = false;
    let expert = false;
    if (isSave) {
        proficient = proficientSaves.some(s => s.toUpperCase() === abil);
    } else if (skill) {
        // Canonicalize BOTH sides: the DM passes "Discrétion" in FR games while
        // the sheet stores "Stealth" — raw comparison silently lost proficiency
        // and expertise on the single most common roll path.
        const ls = canonicalSkillName(skill).toLowerCase();
        proficient = proficiencies.some(p => canonicalSkillName(p).toLowerCase() === ls);
        expert = expertise.some(e => canonicalSkillName(e).toLowerCase() === ls);
    }

    const modifier = abilityMod + (proficient ? prof : 0) + (expert ? prof : 0);
    const label = skill ? skill : isSave ? `Sauvegarde de ${abil}` : `Test de ${abil}`;
    return { modifier, ability: abil, proficient, expert, label };
}

/** Passive Perception = 10 + WIS mod + proficiency (doubled if expertise). */
export function passivePerception(effectiveStats: Record<string, number>, level: number, proficiencies: string[] = [], expertise: string[] = [], flatBonus = 0): number {
    const wisMod = Math.floor(((effectiveStats['WIS'] ?? 10) - 10) / 2);
    const prof = proficiencyBonus(level);
    const isProf = proficiencies.some(p => p.toLowerCase() === 'perception');
    const isExpert = expertise.some(e => e.toLowerCase() === 'perception');
    // flatBonus : Observant (+5) et équivalents — 2026-08-13.
    return 10 + wisMod + (isProf ? prof : 0) + (isExpert ? prof : 0) + flatBonus;
}

// Roll with advantage/disadvantage
export function rollWithAdvantage(advantage: boolean, disadvantage: boolean): { roll: number, rolls: number[] } {
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    if (advantage && !disadvantage) {
        return { roll: Math.max(roll1, roll2), rolls: [roll1, roll2] };
    }
    if (disadvantage && !advantage) {
        return { roll: Math.min(roll1, roll2), rolls: [roll1, roll2] };
    }
    // Normal or both cancel out
    return { roll: roll1, rolls: [roll1] };
}

// ═══════════════ NF2 — avantages accordés par l'ÉQUIPEMENT ═══════════════

export interface GearAdvantage {
    /** Tag canonique : nom de compétence EN ('Stealth'), 'attack' ou 'initiative'. */
    tag: string;
    /** Objet qui l'accorde (affichage fiche + raison du jet). */
    source: string;
}

const NFD_MARKS = /[\u0300-\u036f]/g;
/** Canonicalisation accent-insensible partag\u00e9e (minuscules + NFD sans diacritiques).
 *  Export\u00e9e : c'est LA copie de r\u00e9f\u00e9rence \u2014 ne pas red\u00e9clarer localement. */
export const foldText = (value: string) => String(value || '').toLowerCase().normalize('NFD').replace(NFD_MARKS, '');

/** NF2 — avantages accordés par l'équipement PORTÉ (bottes elfiques → avantage
 *  Discrétion), reflétés automatiquement dans les jets de compétence et
 *  d'attaque. Deux canaux :
 *  1. le champ structuré `advantageOn: ['stealth']` de l'objet (précis) ;
 *  2. le TEXTE de l'objet (« avantage aux tests de Discrétion », « advantage
 *     on Stealth checks ») pour les objets improvisés par le MJ. */
export function getGearAdvantages(character: { inventory?: any[] }): GearAdvantage[] {
    const out: GearAdvantage[] = [];
    const seen = new Set<string>();
    const push = (tag: string, source: string) => {
        const key = `${tag}|${source}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ tag, source });
    };

    for (const item of character.inventory || []) {
        // PL14 — un BIJOU/TALISMAN de type 'misc' (pierre de chance…) n'est pas
        // équipable : il agit tant qu'il est PORTÉ (dans l'inventaire). Les
        // armes/armures/objets à emplacement exigent toujours d'être équipés.
        const carriedTrinket = item?.type === 'misc';
        if (!item?.equipped && !carriedTrinket) continue;
        const source = String(item.name || 'Item');

        for (const rawTag of (item.advantageOn || []) as string[]) {
            const canonical = canonicalSkillName(String(rawTag));
            push(SKILL_ABILITIES[canonical] ? canonical : foldText(String(rawTag)), source);
        }

        const text = foldText(`${item.name || ''} ${item.effect || ''} ${item.description || ''}`);
        // PL11 — objets DÉFENSIFS (cape de déplacement…) : « les attaques
        // contre vous/le porteur ont un désavantage » → tag 'defense', lu par
        // le moteur d'attaque quand le joueur est la CIBLE.
        if (/(desavantage|disadvantage)/.test(text)
            && /(contre (vous|le porteur|lui)|against (you|the wearer|the bearer)|pour (vous|me|le) toucher|to hit (you|the wearer))/.test(text)) {
            push('defense', source);
        }
        // RE1 (contre-audit) — purger les propositions NÉGATIVES avant le scan :
        // « aucun désavantage de discrétion » (Mithral) contenait la sous-chaîne
        // « avantage » + « discretion » et accordait l'AVANTAGE en Discrétion ;
        // « attack rolls against you have disadvantage » (cape) donnait au
        // porteur l'avantage sur SES attaques. On retire toute la clause (entre
        // ponctuations) contenant dés/disadvantage — la détection `defense`
        // ci-dessus lit, elle, le texte BRUT et reste intacte.
        const purged = text.replace(/[^.;,()]*(desavantage|disadvantage)[^.;,()]*/g, ' ');
        if (!/avantage|advantage/.test(purged)) continue;
        // SK1 — correspondance en MOTS ENTIERS : « nature » matchait « naturel »,
        // « histoire » n'importe quel lore.
        const hasWord = (needle: string): boolean => {
            const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, 'iu').test(purged);
        };
        for (const [fr, en] of Object.entries(SKILL_TRANSLATIONS)) {
            if (hasWord(foldText(fr)) || hasWord(en.toLowerCase())) push(en, source);
        }
        if (/jets? d'attaque|attack rolls?/.test(purged)) push('attack', source);
        if (hasWord('initiative')) push('initiative', source);
    }
    return out;
}

/** Premier objet équipé accordant l'avantage sur ce tag (ou null). */
export function gearAdvantageFor(character: { inventory?: any[] }, tag: string): GearAdvantage | null {
    const canonical = SKILL_ABILITIES[canonicalSkillName(tag)] ? canonicalSkillName(tag) : foldText(tag);
    return getGearAdvantages(character).find(a => a.tag === canonical || foldText(a.tag) === foldText(tag)) || null;
}

/** SRD : une armure marquée `stealthDisadvantage` (écailles, pagne de mailles,
 *  harnois…) impose le DÉSAVANTAGE aux tests de Discrétion tant qu'elle est
 *  portée. Le drapeau existait sur 8 armures mais n'était lu par AUCUN jet
 *  (affichage seulement) — audit 2026-08-12. Retourne l'armure fautive ou null. */
export function armorStealthPenalty(character: { inventory?: any[] }): { source: string } | null {
    for (const item of character.inventory || []) {
        if (!item?.equipped) continue;
        if (item.stealthDisadvantage === true) return { source: String(item.name || 'Armor') };
    }
    return null;
}
