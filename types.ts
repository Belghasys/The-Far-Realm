export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export interface CharacterStats {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'misc' | 'ammo' | 'container';
// 'ranged' : emplacement d'arme À DISTANCE séparé de la main directrice — arc
// et épée restent équipés ENSEMBLE, plus besoin de permuter à chaque combat.
export type ItemSlot = 'head' | 'chest' | 'legs' | 'feet' | 'hands' | 'mainHand' | 'offHand' | 'ranged' | 'ring' | 'neck' | 'back' | 'waist' | 'none';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;
  weight: number;
  quantity: number;
  equipped: boolean;
  description?: string;
  effect?: string; // e.g. "+1 AC" or "1d8 damage"
  hidden?: boolean; // Items known to DM but not shown in player inventory
  // Weapon properties
  properties?: string[]; // e.g. ['finesse', 'light', 'two-handed']
  // Armor properties
  armorType?: 'light' | 'medium' | 'heavy' | 'shield';
  baseAC?: number;
  maxDexBonus?: number;
  // Structured fields used by the SRD Codex/rules engine. The legacy
  // `effect` string remains for old saves and UI display.
  damageDice?: string;
  damageType?: CodexDamageType;
  range?: string;
  acBonus?: number;
  stealthDisadvantage?: boolean;
  value?: string;
}

export type InventoryItem = Item;

export interface Feature {
  name: string;
  description: string;
}

export interface Weapon {
  name: string;
  damage: string; // e.g., "1d8", "2d6"
  damageType: string; // e.g., "slashing", "piercing", "bludgeoning"
  abilityMod: 'STR' | 'DEX'; // Which ability modifier to add
  attackBonus: number; // Proficiency + magic bonus
  properties?: string[]; // e.g. ['finesse', 'light', 'two-handed']
  reach?: number; // 5 = melee, 10 = reach weapon, 30+ = ranged
  range?: string;
  magicBonus?: number;
}

// Active Effects (spells, potions, conditions)
export type EffectDuration = 'concentration' | 'long_rest' | 'short_rest' | 'rounds' | 'permanent' | '1_hour' | '8_hours';

export interface StatModifier {
  stat: 'AC' | 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA' | 'attackBonus' | 'damageBonus' | 'speed' | 'checkBonus' | 'saveBonus';
  bonus: number;
  setTo?: number; // For effects like Mage Armor that SET AC to a value
  formula?: 'mage_armor'; // Dynamic AC formulas that depend on current stats
}

export interface ActiveEffect {
  id: string;
  name: string;  // "Mage Armor", "Bull's Strength", "Blessed"
  source: 'spell' | 'potion' | 'item' | 'condition' | 'class_feature';
  duration: EffectDuration;
  roundsRemaining?: number;
  /** For 1_hour / 8_hours effects: absolute world hour ((day-1)*24 + hour-of-day)
   *  past which the effect drops. Swept when the in-game clock advances. */
  expiresAtWorldHour?: number;
  concentration?: boolean;
  description?: string;
  modifiers: StatModifier[];
  /** Damage rider added to the player's weapon hits while the effect is active
   *  (Hunter's Mark, Hex, Divine Favor, Battle Master maneuver…). Omitted
   *  damageType = the weapon's own damage type. */
  onWeaponHit?: { dice: string; damageType?: string };
}

export interface DeathSaves {
  successes: number; // 0-3
  failures: number;  // 0-3
  isStable: boolean;
  isDead: boolean;
}

export type ResourceRecovery = 'short_rest' | 'long_rest' | 'dawn' | 'manual';

export interface CharacterResource {
  current: number;
  max: number;
  recoverOn: ResourceRecovery;
  label?: string;
}

export interface SpellSlotPool {
  current: number;
  max: number;
}

export interface HitDicePool {
  die: number;
  total: number;
  remaining: number;
}

export type StoryModifierSource = 'dm_inspiration' | 'blessing' | 'complication' | 'tactic' | 'consequence';
export type StoryModifierScope = 'any' | 'check' | 'save' | 'attack' | 'death_save';

export interface StoryRollModifier {
  id: string;
  name: string;
  source: StoryModifierSource;
  mode: 'normal' | 'advantage' | 'disadvantage';
  bonus: number;
  remainingUses: number;
  scope: StoryModifierScope;
  reason: string;
  createdAt: number;
}

export interface CharacterStoryProfile {
  appearance?: string;
  personality?: string;
  desire?: string;
  fear?: string;
  wound?: string;
  bond?: string;
  ideal?: string;
  flaw?: string;
  secret?: string;
  cinematicStyle?: string;
  dmHooks?: string[];
}

/**
 * A recruited party companion (rescued NPC, hireling, summoned ally) with a
 * mini stat block. Unlike add_ally_init (one combat), companions PERSIST: they
 * auto-join every encounter as side 'ally', their HP carries between fights
 * (synced at combat end), and rests heal them like the Beast Master wolf.
 */
export interface CompanionSheet {
  id: string;
  name: string;
  description?: string;
  hp: { current: number; max: number };
  ac: number;
  attack: { name: string; attackBonus: number; damage: string; damageType: string };
  recruitedAt: number;
  /** Niveau du héros auquel le compagnon a été mis à jour pour la dernière
   *  fois — la montée de niveau du héros fait grandir ses compagnons
   *  (+4 PV max/niveau, +1 attaque aux niveaux 5/9/13/17). */
  level?: number;
}

/** Monture (cheval, poney de guerre, griffon…). Hors combat : vitesse de
 *  voyage narrée par le MJ. En combat : la CHARGE MONTÉE ferme la distance
 *  loin → contact en une seule action d'attaque. */
export interface MountSheet {
  name: string;
  /** Type du catalogue (data/companionOptions MOUNT_TYPES) : 'destrier',
   *  'griffon', 'destrier_celeste' (paladin 5+)… Libre si monture custom. */
  kind?: string;
  /** Vitesse en pieds (cheval 60, poney 40, griffon volant 80). */
  speed: number;
  /** Monture volante (griffon, pégase) — le MJ narre le vol. */
  flying?: boolean;
  /** PV persistants ENTRE combats — la monture rejoint chaque rencontre comme
   *  alliée et attaque d'elle-même. À 0 : morte (retirée), sauf le Destrier
   *  céleste qui revient au prochain repos long. */
  hp?: { current: number; max: number };
  description?: string;
  acquiredAt: number;
}

/** Familier d'un lanceur de sorts (Find Familiar / pacte / esprit animal du
 *  druide). Narratif + « Aide du familier » : 1×/repos court, avantage sur la
 *  prochaine attaque. */
export interface FamiliarSheet {
  name: string;
  /** Type du catalogue (chat, hibou, corbeau… 'renard' pour les druides). */
  kind: string;
  description?: string;
  acquiredAt: number;
}

export interface CharacterSheet {
  name: string;
  race: string;
  class: string;
  /** Archetype/subclass (Hunter, Champion, Life Domain…) — chosen at the class's
   *  subclass level via the level-up modal or the character sheet. */
  subclass?: string;
  /** Draconic ancestry for Dragonborn (dragon color id, e.g. 'Red', 'White'). Drives
   *  the breath weapon type and the racial damage resistance. Undefined for legacy
   *  Dragonborn saves → falls back to fire (see getDraconicDamageType / startEncounter). */
  draconicAncestry?: string;
  /** Unspent Ability Score Improvement points (2 per ASI level crossed). Banked
   *  when the player dismisses the level-up modal; spendable from the sheet. */
  pendingASIPoints?: number;
  /** Feat ids taken at ASI levels (see data/feats.ts). Resolved via getFeatById. */
  feats?: string[];
  /** Mode histoire (choisi à la création, modifiable dans les réglages) :
   *  potions et sorts de soin rendent toujours leur MAXIMUM. */
  storyMode?: boolean;
  /** Monture du héros — vitesse de voyage + charge montée en combat. */
  mount?: MountSheet;
  /** Familier lié (mage/sorcier/occultiste/druide) — aide 1×/repos court. */
  familiar?: FamiliarSheet;
  /** Bête liée du Rôdeur Beast Master (id de BEAST_COMPANIONS : loup, ours,
   *  panthere, faucon). Absent = loup (rétro-compatible). */
  beastKind?: string;
  /** Beast Master companion HP, persisted BETWEEN encounters (max = 4×level, min 11). */
  companionHP?: { current: number; max: number };
  /** Recruited party companions (max 2) — they auto-join every encounter. */
  companions?: CompanionSheet[];
  level: number;
  xp: number;
  background: string;
  fightingStyle: string;
  stats: CharacterStats;
  hp: { current: number; max: number };
  tempHP: number; // Temporary hit points
  ac: number; // Base AC
  gold: number; // Gold pieces
  inventory: Item[];
  backstory: string;
  proficiencies: string[];
  /** Skills with Expertise (double proficiency), e.g. Rogue/Bard picks. */
  expertise?: string[];
  features: Feature[];
  weapon: Weapon; // Equipped weapon
  activeEffects: ActiveEffect[]; // Active buffs/debuffs
  resources?: Record<string, CharacterResource>;
  spellSlots?: Record<string, SpellSlotPool>;
  cantrips?: string[];
  knownSpells?: string[];
  preparedSpells?: string[];
  spellcastingAbility?: Ability;
  spellcastingFocus?: string;
  hitDice?: HitDicePool;
  storyModifiers?: StoryRollModifier[];
  deity?: string;           // Patron deity (Selune, Bahamut, etc.)
  customBackground?: string; // Player's custom backstory for RP
  storyProfile?: CharacterStoryProfile; // Structured hooks for campaign writing, DM context, and intro cinematics
  deathSaves?: DeathSaves;
  portrait?: string; // Player avatar URL
}

// SINGLE SOURCE OF TRUTH for racial ability score increases (the creation UI and
// getEffectiveStat both read this; data/races.ts no longer duplicates it).
const RACIAL_BONUSES: Record<string, Partial<Record<Ability, number>>> = {
  Human: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
  Elf: { DEX: 2 },
  'Half-Elf': { CHA: 2 },
  'Half-Orc': { STR: 2, CON: 1 },
  Dwarf: { CON: 2 },
  Gnome: { INT: 2 },
  Halfling: { DEX: 2 },
  Tiefling: { CHA: 2, INT: 1 },
  Dragonborn: { STR: 2, CHA: 1 },
  // Subraces (each replaces the base race at creation):
  'Nain des collines': { CON: 2, WIS: 1 },
  'Nain des montagnes': { CON: 2, STR: 2 },
  'Haut-elfe': { DEX: 2, INT: 1 },
  'Elfe sylvestre': { DEX: 2, WIS: 1 },
  'Gnome des roches': { INT: 2, CON: 1 },
  'Gnome des forêts': { INT: 2, DEX: 1 },
  'Halfelin pied-léger': { DEX: 2, CHA: 1 },
  'Halfelin robuste': { DEX: 2, CON: 1 },
};

export function getRacialBonus(race: string, stat: Ability): number {
  return RACIAL_BONUSES[race]?.[stat] || 0;
}

// SRD 5.1 Draconic Ancestry: dragon color → breath-weapon / resistance damage type.
// The choice is purely the damage element (ability bonuses are the same for all
// Dragonborn, STR+2/CHA+1), so it lives as a lightweight field, not a subrace.
export const DRACONIC_ANCESTRIES: { id: string; en: string; fr: string; type: CodexDamageType }[] = [
  { id: 'Red', en: 'Red', fr: 'Rouge', type: 'fire' },
  { id: 'Gold', en: 'Gold', fr: 'Or', type: 'fire' },
  { id: 'Brass', en: 'Brass', fr: 'Airain', type: 'fire' },
  { id: 'Blue', en: 'Blue', fr: 'Bleu', type: 'lightning' },
  { id: 'Bronze', en: 'Bronze', fr: 'Bronze', type: 'lightning' },
  { id: 'White', en: 'White', fr: 'Blanc', type: 'cold' },
  { id: 'Silver', en: 'Silver', fr: 'Argent', type: 'cold' },
  { id: 'Black', en: 'Black', fr: 'Noir', type: 'acid' },
  { id: 'Copper', en: 'Copper', fr: 'Cuivre', type: 'acid' },
  { id: 'Green', en: 'Green', fr: 'Vert', type: 'poison' },
];

/** The damage type a Dragonborn's ancestry grants (breath + resistance), or undefined. */
export function getDraconicDamageType(ancestry?: string): CodexDamageType | undefined {
  return DRACONIC_ANCESTRIES.find(a => a.id === ancestry)?.type;
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function parseMagicModifier(name: string, effect?: string): number {
  const combined = `${name} ${effect || ''}`.toLowerCase();
  const match = combined.match(/\+(\s*)(\d+)/);
  if (match) {
    return Number(match[2]);
  }
  const matchWord = combined.match(/plus\s*([a-z1-5]+)/i);
  if (matchWord) {
    const wordMap: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
    };
    return wordMap[matchWord[1].toLowerCase()] || 0;
  }
  return 0;
}

function parseLegacyArmor(item?: Item | null): Partial<Pick<Item, 'armorType' | 'baseAC' | 'maxDexBonus' | 'acBonus'>> {
  if (!item) return {};
  const name = item.name.toLowerCase();
  const effect = item.effect || '';
  const baseMatch = effect.match(/(\d+)\s*AC/i);
  const bonusMatch = effect.match(/\+(\d+)\s*AC/i);
  const baseAC = item.baseAC ?? (baseMatch ? Number(baseMatch[1]) : undefined);
  const acBonus = item.acBonus ?? (bonusMatch ? Number(bonusMatch[1]) : undefined);

  if (name.includes('shield')) return { armorType: 'shield', acBonus: acBonus ?? 2 };
  if (!baseAC) return {};
  if (name.includes('chain mail') || name.includes('splint') || name.includes('plate') || baseAC >= 16) {
    return { armorType: 'heavy', baseAC };
  }
  if (name.includes('hide') || name.includes('scale') || name.includes('breastplate') || name.includes('half plate') || (baseAC >= 12 && baseAC <= 15)) {
    return { armorType: 'medium', baseAC, maxDexBonus: item.maxDexBonus ?? 2 };
  }
  return { armorType: 'light', baseAC };
}

function isRangedWeapon(weapon: Partial<Weapon>): boolean {
  const haystack = `${weapon.name || ''} ${weapon.range || ''} ${(weapon.properties || []).join(' ')}`.toLowerCase();
  return Boolean(weapon.range) || haystack.includes('bow') || haystack.includes('crossbow') || haystack.includes('ranged') || haystack.includes('thrown');
}

function hasWeaponProperty(weapon: Partial<Weapon>, property: string): boolean {
  return Boolean(weapon.properties?.map(p => p.toLowerCase()).includes(property));
}

export function parseItemStatModifier(item: Item, stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'): { bonus: number; setTo?: number } {
  const effectText = (item.effect || '').toLowerCase();
  const nameText = item.name.toLowerCase();
  const combined = `${nameText} ${effectText}`;

  // Alias EN + FR : les objets du jeu sont souvent décrits en français
  // (« FOR = 21 », « SAG +2 ») — sans ces alias, les potions/objets de stats
  // français étaient silencieusement inertes.
  const aliases = stat === 'STR' ? ['str', 'strength', 'for', 'force'] :
                  stat === 'DEX' ? ['dex', 'dexterity', 'dexterite', 'dextérité'] :
                  stat === 'CON' ? ['con', 'constitution'] :
                  stat === 'INT' ? ['int', 'intelligence'] :
                  stat === 'WIS' ? ['wis', 'wisdom', 'sag', 'sagesse'] :
                  ['cha', 'charisma', 'charisme'];

  for (const alias of aliases) {
    const a = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape (safety)

    // --- BONUS first ("+2 STR", "STR +2", "grants +1 strength", "increased by 2") ---
    // Bonus must win over set-to when a sign is present, so check it before absolutes.
    const bonusPatterns = [
      new RegExp(`([+-]\\s*\\d+)\\s*(?:to\\s+)?\\b${a}\\b`, 'i'),     // +2 STR / +1 to strength
      new RegExp(`\\b${a}\\b\\s*([+-]\\s*\\d+)`, 'i'),                // STR +2
      new RegExp(`\\b${a}\\b[^.;\\n]*?increased by\\s*(\\d+)`, 'i'),  // strength increased by 2
      new RegExp(`increases?\\s+(?:your\\s+)?\\b${a}\\b[^.;\\n]*?by\\s*(\\d+)`, 'i'),
    ];
    for (const re of bonusPatterns) {
      const m = combined.match(re);
      if (m) {
        const n = Number(m[1].replace(/\s+/g, ''));
        if (Number.isFinite(n) && n !== 0) return { bonus: n };
      }
    }

    // --- ABSOLUTE set-to ("STR = 21", "Strength score is 19", "sets Strength to 21",
    //     "strength 19", "Strength becomes 21") → a 1-2 digit score (10-30 realistic) ---
    const setPatterns = [
      new RegExp(`\\b${a}\\b\\s*(?:score)?\\s*(?:=|:|set\\s+to|becomes?|is|to)\\s*(\\d{1,2})`, 'i'),
      new RegExp(`sets?\\s+(?:your\\s+)?\\b${a}\\b\\s*(?:score)?\\s*(?:to|=|:)?\\s*(\\d{1,2})`, 'i'),
      new RegExp(`\\b${a}\\b\\s+(\\d{2})\\b`, 'i'),  // "strength 19"
    ];
    for (const re of setPatterns) {
      const m = combined.match(re);
      if (m) {
        const score = Number(m[1]);
        if (Number.isFinite(score) && score >= 3 && score <= 30) return { bonus: 0, setTo: score };
      }
    }
  }

  return { bonus: 0 };
}

export function parseItemSpeedModifier(item: Item): number {
  const effectText = (item.effect || '').toLowerCase();
  const nameText = item.name.toLowerCase();
  const combined = `${nameText} ${effectText}`;

  const speedRegex1 = /([+-]\s*\d+)\s*(?:ft\s*)?(?:speed|vitesse)/i;
  const speedRegex2 = /(?:speed|vitesse)\s*([+-]\s*\d+)/i;

  const match1 = combined.match(speedRegex1);
  if (match1) {
    return Number(match1[1].replace(/\s+/g, ''));
  }
  const match2 = combined.match(speedRegex2);
  if (match2) {
    return Number(match2[1].replace(/\s+/g, ''));
  }

  return 0;
}

// Calculate effective stat with race bonuses and active effects.
export function getEffectiveStat(character: CharacterSheet, stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'): number {
  let value = character.stats[stat] + getRacialBonus(character.race, stat);
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === stat) {
        if (mod.setTo !== undefined) {
          value = Math.max(value, mod.setTo);
        } else {
          value += mod.bonus;
        }
      }
    }
  }
  // Apply equipped items effects
  if (character.inventory) {
    for (const item of character.inventory) {
      if (item.equipped) {
        const mod = parseItemStatModifier(item, stat);
        if (mod.setTo !== undefined) {
          value = Math.max(value, mod.setTo);
        } else {
          value += mod.bonus;
        }
      }
    }
  }
  return Math.min(30, Math.max(1, value)); // D&D stat limits
}

// Calculate base AC based on equipped armor
export function getBaseACFromArmor(character: CharacterSheet): number {
  const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));
  let baseAC = 10 + dexMod; // Unarmored base

  const equippedArmor = character.inventory?.find(i => i.equipped && i.type === 'armor' && i.slot === 'chest');
  const equippedShield = character.inventory?.find(i => i.equipped && i.type === 'armor' && (i.slot === 'offHand' || i.armorType === 'shield'));

  if (equippedArmor) {
    const legacy = parseLegacyArmor(equippedArmor);
    const armorBase = equippedArmor.baseAC ?? legacy.baseAC ?? 10;
    const armorType = equippedArmor.armorType ?? legacy.armorType;
    const maxDexBonus = equippedArmor.maxDexBonus ?? legacy.maxDexBonus;
    const magicBonus = equippedArmor.acBonus ?? parseMagicModifier(equippedArmor.name, equippedArmor.effect);

    if (armorType === 'light') {
      baseAC = armorBase + dexMod + magicBonus;
    } else if (armorType === 'medium') {
      const maxDex = maxDexBonus !== undefined ? maxDexBonus : 2;
      baseAC = armorBase + Math.min(dexMod, maxDex) + magicBonus;
    } else if (armorType === 'heavy') {
      baseAC = armorBase + magicBonus; // No DEX bonus for heavy
    } else {
      baseAC = armorBase + dexMod + magicBonus;
    }
    if (character.fightingStyle === 'Defense' && armorBase > 10) {
      baseAC += 1;
    }
  } else {
    // Draconic Bloodline (Sorcerer): Draconic Resilience — unarmored AC is 13 + DEX.
    if (character.subclass === 'Draconic Bloodline') {
      baseAC = Math.max(baseAC, 13 + dexMod);
    }
    if (character.ac > baseAC) {
      // Fallback if they have natural armor or hardcoded AC > 10+DEX
      baseAC = character.ac;
    }
  }

  if (equippedShield) {
    const shield = parseLegacyArmor(equippedShield);
    const magicBonus = parseMagicModifier(equippedShield.name, equippedShield.effect);
    let shieldBonus = equippedShield.acBonus ?? shield.acBonus ?? 2;
    if (shieldBonus < 2) {
      shieldBonus = 2 + shieldBonus;
    } else if (magicBonus > 0 && shieldBonus === 2) {
      shieldBonus = 2 + magicBonus;
    }
    baseAC += shieldBonus;
  }

  // Add magic/AC bonuses from any other equipped items (cloaks, boots, waist, etc.)
  if (character.inventory) {
    for (const item of character.inventory) {
      if (item.equipped && item.id !== equippedArmor?.id && item.id !== equippedShield?.id) {
        let magicAC = item.acBonus;
        if (magicAC === undefined) {
          const combined = `${item.name} ${item.effect || ''}`.toLowerCase();
          const hasACKeyword = combined.includes('ac') || 
                               combined.includes('armor class') || 
                               combined.includes('protection') || 
                               combined.includes('defense') || 
                               combined.includes('defensive');
          if (hasACKeyword) {
            const acMatch = combined.match(/\+(\s*)(\d+)\s*(?:ac|to ac|armor class)/i);
            if (acMatch) {
              magicAC = Number(acMatch[2]);
            } else if (!/(?:speed|str|strength|dex|dexterity|con|constitution|int|intelligence|wis|wisdom|cha|charisma|hp|hit points|damage)/i.test(item.effect || '')) {
              magicAC = parseMagicModifier(item.name, item.effect);
            }
          }
        }
        if (magicAC && magicAC > 0) {
          baseAC += magicAC;
        }
      }
    }
  }

  return baseAC;
}

// Calculate effective AC with active effects
export function getEffectiveAC(character: CharacterSheet): number {
  let ac = getBaseACFromArmor(character);
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === 'AC') {
        if (mod.formula === 'mage_armor') {
          const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));
          ac = Math.max(ac, 13 + dexMod);
        } else if (mod.setTo !== undefined) {
          ac = Math.max(ac, mod.setTo);
        } else {
          ac += mod.bonus;
        }
      }
    }
  }
  return ac;
}

// Check if a stat is modified by an effect
export function isStatModified(character: CharacterSheet, stat: string): boolean {
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === stat) return true;
    }
  }
  return false;
}

// ========== COMBAT HELPER FUNCTIONS ==========

// Calculate effective attack bonus with active effects + equipped gear.
// Gear: any equipped non-weapon item whose text carries « +N aux jets
// d'attaque » / "+N to attack rolls" (anneaux, gantelets…) — l'arme elle-même
// passe par magicBonus, on l'exclut pour ne pas compter double.
export function getEffectiveAttackBonus(character: CharacterSheet): number {
  let bonus = 0;
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === 'attackBonus') {
        bonus += mod.bonus;
      }
    }
  }
  if (character.inventory) {
    for (const item of character.inventory) {
      if (!item.equipped || item.type === 'weapon') continue;
      const text = `${item.name || ''} ${item.effect || ''} ${item.description || ''}`.toLowerCase();
      const m = text.match(/([+-]\d+)\s*(?:aux?\s+)?(?:jets? d'attaque|attaques?|attack(?:\s+rolls?)?|to\s+hit)/);
      if (m) bonus += Number(m[1]) || 0;
    }
  }
  return bonus;
}

// Flat bonus applied to ability checks ('check') or saving throws ('save'),
// from active effects (StatModifier checkBonus/saveBonus) AND equipped gear
// text (« +1 aux jets de sauvegarde », "+2 on ability checks"…).
export function getRollBonus(character: CharacterSheet, kind: 'check' | 'save'): number {
  let bonus = 0;
  const stat = kind === 'save' ? 'saveBonus' : 'checkBonus';
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === stat) bonus += mod.bonus;
    }
  }
  const gearRe = kind === 'save'
    ? /([+-]\d+)\s*(?:aux?\s+|to\s+|on\s+)?(?:jets? de sauvegarde|sauvegardes?|saving\s+throws?|saves?)/
    : /([+-]\d+)\s*(?:aux?\s+|to\s+|on\s+)?(?:tests? de caract[ée]ristique|tests?|ability\s+checks?|checks?)/;
  if (character.inventory) {
    for (const item of character.inventory) {
      if (!item.equipped || item.type === 'weapon') continue;
      const text = `${item.name || ''} ${item.effect || ''} ${item.description || ''}`.toLowerCase();
      const m = text.match(gearRe);
      if (m) bonus += Number(m[1]) || 0;
    }
  }
  return bonus;
}

// Skill-specific gear bonus: equipped item text carrying « +N <skill> » where
// <skill> is the FR or EN skill name (« +2 Discrétion », "+2 Stealth bonus").
export function getGearSkillBonus(character: CharacterSheet, skillNames: string[]): number {
  if (!character.inventory || !skillNames.length) return 0;
  const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
  const wanted = skillNames.map(strip).filter(Boolean);
  let bonus = 0;
  for (const item of character.inventory) {
    if (!item.equipped || item.type === 'weapon') continue;
    const text = strip(`${item.name || ''} ${item.effect || ''} ${item.description || ''}`);
    for (const skill of wanted) {
      const m = text.match(new RegExp('([+-]\\d+)\\s*(?:aux?\\s+|en\\s+|to\\s+|on\\s+)?(?:jets? de\\s+)?' + skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      if (m) { bonus += Number(m[1]) || 0; break; }
    }
  }
  return bonus;
}

// Calculate effective damage bonus with active effects
export function getEffectiveDamageBonus(character: CharacterSheet): number {
  let bonus = 0;
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === 'damageBonus') {
        bonus += mod.bonus;
      }
    }
  }
  return bonus;
}

// Calculate effective speed with active effects and equipped items
export function getEffectiveSpeed(character: CharacterSheet, baseSpeed: number = 30): number {
  let speed = baseSpeed;
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === 'speed') {
        if (mod.setTo !== undefined) {
          speed = mod.setTo;
        } else {
          speed += mod.bonus;
        }
      }
    }
  }
  // Apply equipped items effects
  if (character.inventory) {
    for (const item of character.inventory) {
      if (item.equipped) {
        speed += parseItemSpeedModifier(item);
      }
    }
  }
  // Feat speed bonuses. Kept as an inline map: importing data/feats here would
  // create a types ⇄ data import cycle (feats.ts imports Ability from types).
  const FEAT_SPEED_BONUS: Record<string, number> = { mobile: 10 };
  for (const featId of character.feats || []) {
    speed += FEAT_SPEED_BONUS[featId] || 0;
  }
  return Math.max(0, speed);
}

// Calculate combat AC including cover bonus and active effects
export function getCombatAC(character: CharacterSheet, coverBonus: number = 0): number {
  const effectiveAC = getEffectiveAC(character);
  return effectiveAC + coverBonus;
}

// Number of weapon attacks the player makes with the Attack action (5e Extra Attack).
// Martials get a 2nd at level 5; Fighter gets a 3rd at 11 and a 4th at 20.
export function getPlayerAttackCount(character: CharacterSheet): number {
  const cls = (character.class || '').toLowerCase();
  const lvl = character.level || 1;
  const martial = /fighter|barbarian|paladin|ranger|monk|guerrier|barbare|paladin|rôdeur|rodeur|moine/.test(cls);
  if (!martial) return 1;
  if (/fighter|guerrier/.test(cls)) {
    if (lvl >= 20) return 4;
    if (lvl >= 11) return 3;
    if (lvl >= 5) return 2;
    return 1;
  }
  return lvl >= 5 ? 2 : 1;
}

// Calculate full attack modifier for player attacks
export function getPlayerAttackModifier(character: CharacterSheet, weaponOverride?: Partial<Weapon>): number {
  const weapon = (weaponOverride as Weapon) || character.weapon;
  const strMod = abilityModifier(getEffectiveStat(character, 'STR'));
  const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));

  let abilityMod = weapon.abilityMod === 'DEX' ? dexMod : strMod;

  // Finesse weapons use the higher of STR or DEX
  if (hasWeaponProperty(weapon, 'finesse')) {
    abilityMod = Math.max(strMod, dexMod);
  }

  const proficiencyBonus = Math.floor((character.level - 1) / 4) + 2;
  const effectBonus = getEffectiveAttackBonus(character);
  const legacyWeaponBonus = weapon.attackBonus || 0;
  // Use magicBonus if explicitly defined, otherwise compute from attackBonus (legacy backup)
  const weaponExtraBonus = weapon.magicBonus !== undefined
    ? weapon.magicBonus
    : Math.max(0, legacyWeaponBonus - proficiencyBonus);

  const styleBonus = character.fightingStyle === 'Archery' && isRangedWeapon(weapon) ? 2 : 0;

  return abilityMod + proficiencyBonus + weaponExtraBonus + effectBonus + styleBonus;
}

// Calculate full damage for player attacks
export function getPlayerDamageBonus(character: CharacterSheet, weaponOverride?: Partial<Weapon>, isOffhand?: boolean): number {
  const weapon = (weaponOverride as Weapon) || character.weapon;
  const strMod = abilityModifier(getEffectiveStat(character, 'STR'));
  const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));

  let abilityMod = weapon.abilityMod === 'DEX' ? dexMod : strMod;

  // Finesse weapons use the higher of STR or DEX
  if (hasWeaponProperty(weapon, 'finesse')) {
    abilityMod = Math.max(strMod, dexMod);
  }

  // Offhand attacks do not add the ability modifier unless the character has
  // the Two-Weapon Fighting style.
  if (isOffhand && character.fightingStyle !== 'Two-Weapon Fighting') {
    abilityMod = Math.min(0, abilityMod);
  }

  const hasOffhandWeapon = Boolean(character.inventory?.some(item => item.equipped && item.type === 'weapon' && item.slot === 'offHand'));
  const duelingBonus = character.fightingStyle === 'Dueling'
    && !isOffhand
    && !isRangedWeapon(weapon)
    && !hasWeaponProperty(weapon, 'two-handed')
    && !hasOffhandWeapon
    ? 2
    : 0;
  const effectBonus = getEffectiveDamageBonus(character);
  const magicBonus = weapon.magicBonus !== undefined
    ? weapon.magicBonus
    : Math.max(0, (weapon.attackBonus || 0) - (Math.floor((character.level - 1) / 4) + 2)); // fallback for legacy

  return abilityMod + effectBonus + duelingBonus + magicBonus;
}

// XP thresholds for leveling up (D&D 5e)
export const XP_THRESHOLDS: number[] = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000  // Level 20
];

// Calculate level from XP
export function calculateLevelFromXP(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Progress WITHIN the current level: how far the XP bar should be filled
 * between the current level's threshold and the next one. Level 20 is capped
 * (full bar, no next level).
 */
export function getXPProgress(level: number, xp: number): {
  intoLevel: number;     // XP earned past the current level's threshold
  neededForNext: number; // XP span between this level and the next (0 at lvl 20)
  percent: number;       // 0..100 fill for the bar
  nextLevelXP: number | null; // absolute XP of the next level (null at 20)
} {
  const lvl = Math.max(1, Math.min(20, level || 1));
  const base = XP_THRESHOLDS[lvl - 1] ?? 0;
  if (lvl >= 20) {
    return { intoLevel: Math.max(0, xp - base), neededForNext: 0, percent: 100, nextLevelXP: null };
  }
  const next = XP_THRESHOLDS[lvl];
  const span = Math.max(1, next - base);
  const within = Math.max(0, Math.min(span, (xp || 0) - base));
  return { intoLevel: within, neededForNext: span, percent: (within / span) * 100, nextLevelXP: next };
}


export interface Adventure {
  id: string;
  title: string;
  description: string;
  image: string; // url
}

export interface AdventureManifest {
  villain: {
    name: string;
    archetype: string;
    description: string;
    secret: string;
    escalationArc?: string;   // How the villain escalates across chapters
    weaknesses?: string[];    // Exploitable weaknesses for the player
    motivation?: string;      // What drives the villain
  };
  chapters: {
    id: string;
    title: string;
    objective: string;
    status: 'pending' | 'active' | 'completed';
    scenes?: {
      id: string;
      title: string;
      description: string;
      location: string;
      mood?: string;          // Maps to Lyria mood (exploration, dungeon, tavern...)
    }[];
    encounters?: {
      type: 'combat' | 'puzzle' | 'roleplay' | 'trap' | 'exploration';
      description: string;
      difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
      monsters?: string[];    // Monster IDs from bestiary
      reward?: string;
    }[];
    branchingChoices?: {
      decision: string;       // The choice the player faces
      optionA: string;
      optionB: string;
      consequence: string;    // How it affects the story
    }[];
    cliffhanger?: string;     // End-of-chapter hook
  }[];
  introduction: string;
  cinematicBrief?: {
    logline?: string;
    visualPrompt?: string;
    narrationTone?: string;
    musicMood?: string;
    firstSceneHook?: string;
  };
  firstScene?: {
    chapterId?: string;
    sceneId?: string;
    title: string;
    location: string;
    objective: string;
    mood?: string;
    setup: string;
    openingQuestion?: string;
  };
  /** IDs of monsters selected by the AI for this campaign bestiary */
  selectedMonsterIds?: string[];
  fullManifesto: string;
  /** Curated monster pool (≤40) for this campaign. Loaded once during generation. */
  campaignBestiary?: import('./data/bestiary').CreatureStats[];
  /** Supporting cast: allies, merchants, betrayers */
  supportingCast?: {
    name: string;
    role: 'ally' | 'merchant' | 'betrayer' | 'quest_giver' | 'rival' | 'mentor';
    description: string;
    location?: string;
    personality?: string;
  }[];
  /** Reward table: loot tied to encounters */
  rewardTable?: {
    trigger: string;          // When is this reward given
    item: string;
    type: string;
    description?: string;
  }[];
  /**
   * World clocks to seed into the runtime at campaign creation. These are the
   * ONLY way an authored escalation clock (e.g. "Gel Profond") becomes visible
   * to the live DM: campaignDirector re-injects runtime.worldClocks every turn,
   * whereas the fullManifesto is never injected wholesale. Keep descriptions
   * short (~120 chars) — they ride in the just-in-time director context.
   */
  initialWorldClocks?: CampaignWorldClock[];
  /**
   * Canon facts / protected secrets to seed into the runtime at creation. Same
   * rationale as initialWorldClocks: campaignDirector re-injects runtime.canonFacts
   * and runtime.protectedSecrets every turn, but villain.secret/weaknesses are NOT
   * injected — so an authored villain's secret only reaches the DM if seeded here.
   */
  initialCanonFacts?: string[];
  initialProtectedSecrets?: string[];
}

export type CampaignBranchStatus = 'planned' | 'active' | 'resolved' | 'abandoned' | 'merged_into_main';

export interface CampaignSubBranchScene {
  id: string;
  type: 'exploration' | 'roleplay' | 'combat' | 'puzzle' | 'trap' | 'social' | 'discovery';
  location: string;
  goal: string;
  setup: string;
  dmNotes: string;
  possibleTools: string[];
  successClue: string;
  failureConsequence: string;
}

export interface CampaignSubBranchPlan {
  id?: string;
  branchTitle: string;
  purpose: string;
  estimatedPlayTimeMinutes: number;
  status: CampaignBranchStatus;
  scenes: CampaignSubBranchScene[];
  reconnectHooks: Array<{ type: 'clue' | 'npc' | 'faction' | 'consequence' | 'location'; description: string }>;
  consequences: string[];
  forbidden: string[];
  directorNote: string;
  createdAt?: number;
  source?: string;
}

export interface CampaignWorldClock {
  id: string;
  name: string;
  description: string;
  stage: number;
  maxStage: number;
  status: 'active' | 'paused' | 'resolved';
  updatedAt: number;
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface CampaignRuntimeState {
  currentChapterId?: string;
  currentSceneId?: string;
  currentObjective?: string;
  activeBranch: CampaignSubBranchPlan | null;
  branchHistory: CampaignSubBranchPlan[];
  canonFacts: string[];
  protectedSecrets: string[];
  worldClocks: CampaignWorldClock[];
  /** In-world calendar: day counter (starts at 1) + moment of the day. Long
   *  rests advance the day; short rests and the set_time_of_day tool move the
   *  moment. Shown in the HUD and injected into scene-image prompts. */
  dayCount?: number;
  timeOfDay?: TimeOfDay;
  updatedAt?: number;
}

export const DEFAULT_CAMPAIGN_RUNTIME: CampaignRuntimeState = {
  activeBranch: null,
  branchHistory: [],
  canonFacts: [],
  protectedSecrets: [],
  worldClocks: [],
  dayCount: 1,
  timeOfDay: 'day',
};


export enum AppState {
  LOGIN,
  CHARACTER_CREATION,
  MODE_SELECTION,
  LOBBY,
  GAME_SESSION
}

export type Language = 'en' | 'fr';

export interface GameSessionState {
  isConnected: boolean;
  isMicOn: boolean;
  transcript: { speaker: 'user' | 'dm'; text: string }[];
  volume: number; // For visualization
  activeEngine: 'narrative'; // Only narrative mode — battle grid removed in Phase 11
}

// ─── Journal ────────────────────────────────────────────────────────────────

export interface QuestStep {
  id: string;
  text: string;
  done: boolean;
}

export interface QuestEntry {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  /** Optional checkable sub-objectives (update_quest_step tool / DM). */
  steps?: QuestStep[];
}

export interface NPCEntry {
  id: string;
  name: string;
  description: string;
  location: string;
  /** -5 (hostile) .. +5 (devoted). 0/undefined = neutral. Moved by update_npc / fact extraction. */
  disposition?: number;
  /** Short memories this NPC holds about the hero ("the hero saved my son"). Max ~12, newest last. */
  knownFacts?: string[];
  /** Epoch ms of the last update_npc / scene featuring this NPC. */
  lastSeenAt?: number;
}

export interface LocationEntry {
  id: string;
  name: string;
  description: string;
}

export interface ChronicleEntry {
  id: string;
  title: string;
  description: string;
  timestamp: number;
}

// Persistent campaign prologue/briefing — seeded once from the manifest at
// campaign creation so the player always has the "tenants et aboutissants"
// (who they are, where, the stakes, the first objective) instead of being
// catapulted into the story. Spoiler-free: never holds the villain's secret.
export interface CampaignBriefing {
  prologue: string;       // the readable opening narrative (world, hero, stakes, hook)
  objective?: string;     // immediate main objective
  threat?: string;        // one-line premise / public hint about the looming threat
  location?: string;      // starting location name
}

export interface JournalState {
  briefing?: CampaignBriefing;
  quests: QuestEntry[];
  npcs: NPCEntry[];
  locations: LocationEntry[];
  chronicle: ChronicleEntry[];
}

export const DEFAULT_JOURNAL: JournalState = {
  quests: [],
  npcs: [],
  locations: [],
  chronicle: [],
};

// --- SRD 5.1 Codex -------------------------------------------------------

export type CodexEntryKind = 'spell' | 'rule' | 'action' | 'condition' | 'item' | 'monster';
export type CodexSourceKind = 'srd5.1' | 'current-bestiary' | 'homebrew' | 'external-link';
export type CodexLicense = 'CC-BY-4.0' | 'project-data' | 'homebrew' | 'reference-only';

export interface CodexSource {
  sourceKind: CodexSourceKind;
  license: CodexLicense;
  attribution: string;
  sourceUrl?: string;
  externalOnly?: boolean;
}

export type CodexDamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder';

export interface DiceScaling {
  mode: 'slot' | 'characterLevel';
  addPerLevel?: string;
  fromLevel?: number;
  tiers?: Record<number, string>;
}

export interface SpellEntry {
  kind: 'spell';
  id: string;
  name: string;
  aliases?: string[];
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  concentration: boolean;
  ritual?: boolean;
  classes: string[];
  target: string;
  attack?: {
    type: 'melee' | 'ranged';
    ability: Ability;
  };
  save?: {
    ability: Ability;
    effectOnSuccess: 'none' | 'half' | 'negates';
  };
  damage?: {
    dice: string;
    type: CodexDamageType;
    scaling?: DiceScaling;
  };
  healing?: {
    dice: string;
    abilityModifier: boolean;
    scaling?: DiceScaling;
  };
  condition?: string;
  /** Free-text material component (e.g. "a tiny ball of bat guano and sulfur"). */
  materialText?: string;
  /** Prose "At Higher Levels" upcast description, for non-mechanical scaling. */
  higherLevels?: string;
  effectSummary: string;
  mechanics?: string[];
  source: CodexSource;
}

export interface RuleEntry {
  kind: 'rule';
  id: string;
  name: string;
  category: 'combat' | 'rest' | 'death' | 'concentration' | 'skills' | 'equipment' | 'damage' | 'magic';
  summary: string;
  mechanics: string[];
  source: CodexSource;
}

export interface ActionEntry {
  kind: 'action';
  id: string;
  name: string;
  actionType: 'action' | 'bonus_action' | 'reaction' | 'movement' | 'free';
  cost: string;
  restrictions?: string[];
  effectSummary: string;
  mechanics: string[];
  source: CodexSource;
}

export interface ConditionEntry {
  kind: 'condition';
  id: string;
  name: string;
  /** Alternate spellings (FRENCH names!) matched by lookupCondition — the DM
   *  narrates « aveuglé »/« à terre » and the EN-only match silently failed. */
  aliases?: string[];
  summary: string;
  effects: string[];
  movement?: 'normal' | 'halved' | 'zero' | 'special';
  actionRestrictions?: string[];
  attackRolls?: {
    madeByCreature?: 'normal' | 'advantage' | 'disadvantage';
    againstCreature?: 'normal' | 'advantage' | 'disadvantage' | 'special';
  };
  savingThrows?: Partial<Record<Ability, 'advantage' | 'disadvantage' | 'auto_fail'>>;
  source: CodexSource;
}

export interface ItemEntry {
  kind: 'item';
  id: string;
  name: string;
  itemType: ItemType;
  effect?: string;
  damageDice?: string;
  damageType?: CodexDamageType;
  properties?: string[];
  range?: string;
  weight?: number;
  ac?: number;
  acBonus?: number;
  armorType?: Item['armorType'];
  maxDexBonus?: number;
  stealthDisadvantage?: boolean;
  value?: string;
  // Optional alternate names used by the fuzzy item lookup to disambiguate
  // collisions (e.g. "longsword"/"long sword"). Matched as whole-word slugs.
  aliases?: string[];
  source: CodexSource;
}

export interface CodexMonsterRef {
  kind: 'monster';
  id: string;
  name: string;
  cr: number;
  xp: number;
  hp: number;
  hpDice?: string;
  ac: number;
  type: string;
  size: string;
  role: 'brute' | 'skirmisher' | 'artillery' | 'controller' | 'minion' | 'solo';
  attacks: {
    name: string;
    attackBonus: number;
    damage: string;
    damageType: CodexDamageType;
    reach: number;
    range?: string;
    damageParts?: { damage: string; damageType: CodexDamageType }[];
  }[];
  resistances?: CodexDamageType[];
  immunities?: CodexDamageType[];
  vulnerabilities?: CodexDamageType[];
  conditionImmunities?: string[];
  portrait?: string;
  source: CodexSource;
}

export type CodexEntry = SpellEntry | RuleEntry | ActionEntry | ConditionEntry | ItemEntry | CodexMonsterRef;

export type EncounterDifficulty = 'easy' | 'medium' | 'hard' | 'deadly';

export interface EncounterBuildRequest {
  partyLevel: number;
  partySize: number;
  difficulty: EncounterDifficulty;
  biome?: string;
  role?: CodexMonsterRef['role'];
  theme?: string;
  maxMonsters?: number;
}

export interface EncounterBuildResult {
  request: EncounterBuildRequest;
  xpBudget: number;
  baseXP: number;
  adjustedXP: number;
  multiplier: number;
  difficulty: EncounterDifficulty;
  monsters: CodexMonsterRef[];
  notes: string[];
  source: CodexSource;
}
