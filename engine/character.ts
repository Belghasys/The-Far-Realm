/**
 * Les regles du personnage : ce que la fiche VAUT, calcule depuis ce qu'elle
 * PORTE — bonus raciaux, CA effective, PV maximum, bonus d'attaque, vitesse,
 * niveau depuis l'XP.
 *
 * Extrait de types.ts le 2026-08-25 (R6 du rangement) : ces 27 fonctions
 * vivaient dans le fichier de types, importe par tout le depot. Corps des
 * fonctions inchange.
 */
import { isProficientWithWeapon } from '../data/weapons';
import { MARTIAL_CLASSES } from '../data/classes';
import { Ability, Item, Weapon, StatModifier, CharacterSheet, RACIAL_BONUSES, DRACONIC_ANCESTRIES, RANGED_NAME_RE, RANGED_PROP_RE, THROWN_PROP_RE, XP_THRESHOLDS, CodexDamageType } from '../types/index';

/** K1 (contre-audit du 2026-09-01) — un style de combat n'existe que pour les
 *  classes martiales. DEFAULT_CHAR porte « Dueling » et un changement de classe
 *  ne le remettait pas : un mage au bâton, un roublard à la rapière, un clerc à
 *  la masse touchaient à +2 (et +1 CA en Défense) — 9 classes sur 12. Le moteur
 *  ne lit plus le champ qu'à travers cette porte, ce qui couvre aussi les
 *  sauvegardes existantes. */
export function activeFightingStyle(character: Pick<CharacterSheet, 'class' | 'fightingStyle'>): string | undefined {
  return MARTIAL_CLASSES.includes(character.class) ? (character.fightingStyle || undefined) : undefined;
}

export function getRacialBonus(race: string, stat: Ability): number {
  return RACIAL_BONUSES[race]?.[stat] || 0;
}

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

/**
 * Single source of truth for "is this a ranged weapon?" — used by the fighting
 * styles, the -5/+10 feats, Sneak Attack, the distance bands and the DM
 * context. A weapon counts as ranged when it has an Ammunition/Ranged
 * property, a listed range that is not a thrown range, or a bow/crossbow/sling
 * name in either language.
 */
export function isRangedWeapon(weapon: Partial<Weapon> | Partial<Item> | null | undefined): boolean {
  if (!weapon) return false;
  const props = ((weapon as any).properties || []).map((p: unknown) => String(p).toLowerCase());
  if (props.some((p: string) => RANGED_PROP_RE.test(p))) return true;
  if (RANGED_NAME_RE.test(String(weapon.name || ''))) return true;
  // A range band only means "ranged" for a weapon that is not merely throwable
  // (a dagger has 20/60 but is a melee weapon until it is actually thrown).
  if (weapon.range && !props.some((p: string) => THROWN_PROP_RE.test(p))) return true;
  return false;
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
    if (activeFightingStyle(character) === 'Defense' && armorBase > 10) {
      baseAC += 1;
    }
  } else {
    // DÉFENSE SANS ARMURE (audit des traits de classe, 2026-08-31). Trait de
    // NIVEAU 1 du Barbare (10 + DEX + CON) et du Moine (10 + DEX + SAG) : il
    // n'existait nulle part, alors que c'est toute leur identité défensive et
    // la raison pour laquelle ces deux classes se battent sans armure. Mesuré :
    // trois points de CA en moins, en permanence, à chaque attaque subie.
    //
    // Pas de `Math.max` avec 10 + DEX : le trait REMPLACE le calcul de base, il
    // ne l'améliore pas. Un barbare à CON 8 descend à 9 — c'est un pari sur la
    // Constitution, pas un bonus gratuit.
    //
    // Le Barbare garde le droit au bouclier (il s'ajoute plus bas), le Moine
    // non : sa condition RAW est « ni armure NI bouclier ».
    const equippedShieldForMonk = Boolean(equippedShield);
    if (character.class === 'Barbarian') {
      baseAC = 10 + dexMod + abilityModifier(getEffectiveStat(character, 'CON'));
    } else if (character.class === 'Monk' && !equippedShieldForMonk) {
      baseAC = 10 + dexMod + abilityModifier(getEffectiveStat(character, 'WIS'));
    }
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

/** Petit lanceur local pour StatModifier.dice ('1d4', '2d6+1'). Volontairement
 *  ici (types.ts ne peut pas importer services/utils sans cycle). */
function rollModifierDice(dice: string): number {
  const m = String(dice || '').trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return 0;
  const count = Math.min(20, Number(m[1]) || 0);
  const faces = Math.max(1, Number(m[2]) || 1);
  const flat = Number(m[3] || 0);
  let total = flat;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * faces) + 1;
  return total;
}

// PV MAX EFFECTIFS (2026-08-13) : un objet/effet qui monte la CON (+2 CON de
// ceinture, effet 'CON') donne +1 PV max par niveau et par point de
// modificateur, tant qu'il est actif — avant, les bonus de CON n'ajoutaient
// AUCUN PV. (Une hausse PERMANENTE — ASI/don — est intégrée à hp.max au
// level-up ; ici on ne compte que le delta temporaire effectif − base.)
export function getEffectiveMaxHP(character: CharacterSheet): number {
  // Contre-audit 2026-08-13 — la base du delta doit INCLURE le bonus racial :
  // hp.max est déjà stocké avec la CON effective (création + level-up), donc
  // comparer à la seule stat brute recomptait le racial (+5 PV fantômes pour un
  // Nain niv. 5). Le delta ne couvre que les effets/objets TEMPORAIRES.
  const baseMod = Math.floor((character.stats.CON + getRacialBonus(character.race, 'CON') - 10) / 2);
  const effMod = Math.floor((getEffectiveStat(character, 'CON') - 10) / 2);
  const delta = (effMod - baseMod) * Math.max(1, character.level || 1);
  return Math.max(1, character.hp.max + delta);
}

// Calculate effective attack bonus with active effects + equipped gear.
// Gear: any equipped non-weapon item whose text carries « +N aux jets
// d'attaque » / "+N to attack rolls" (anneaux, gantelets…) — l'arme elle-même
// passe par magicBonus, on l'exclut pour ne pas compter double.
export function getEffectiveAttackBonus(character: CharacterSheet): number {
  let bonus = 0;
  for (const effect of character.activeEffects || []) {
    for (const mod of effect.modifiers) {
      if (mod.stat === 'attackBonus') {
        bonus += mod.bonus + (mod.dice ? rollModifierDice(mod.dice) : 0);
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
      if (mod.stat === stat) bonus += mod.bonus + (mod.dice ? rollModifierDice(mod.dice) : 0);
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

// DA5 — Robustesse naine (Nain des collines / Hill Dwarf) : +1 PV max par
// niveau. Affiché sur la fiche de race mais jamais branché au moteur avant —
// même mécanique que Draconic Bloodline (+1) et le don Robuste (+2).
export function racialHPBonusPerLevel(character: Pick<CharacterSheet, 'race'>): number {
  return /nain des collines|hill dwarf/i.test(String(character.race || '')) ? 1 : 0;
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

  // SRD (audit 2026-08-12) : le bonus de maîtrise n'est ajouté QUE si la
  // classe maîtrise l'arme — un Mage à la grande hache attaque sans maîtrise.
  const fullProficiency = Math.floor((character.level - 1) / 4) + 2;
  const proficiencyBonus = isProficientWithWeapon(character.class, weapon.name) ? fullProficiency : 0;
  const effectBonus = getEffectiveAttackBonus(character);
  const legacyWeaponBonus = weapon.attackBonus || 0;
  // Use magicBonus if explicitly defined, otherwise compute from attackBonus (legacy backup)
  const weaponExtraBonus = weapon.magicBonus !== undefined
    ? weapon.magicBonus
    : Math.max(0, legacyWeaponBonus - fullProficiency);

  const styleBonus = activeFightingStyle(character) === 'Archery' && isRangedWeapon(weapon) ? 2 : 0;

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
  if (isOffhand && activeFightingStyle(character) !== 'Two-Weapon Fighting') {
    abilityMod = Math.min(0, abilityMod);
  }

  const hasOffhandWeapon = Boolean(character.inventory?.some(item => item.equipped && item.type === 'weapon' && item.slot === 'offHand'));
  const duelingBonus = activeFightingStyle(character) === 'Dueling'
    && !isOffhand
    && !isRangedWeapon(weapon)
    && !hasWeaponProperty(weapon, 'two-handed')
    && !hasOffhandWeapon
    ? 2
    : 0;
  let effectBonus = getEffectiveDamageBonus(character);
  // cb-m5 — le bonus de dégâts de la RAGE ne s'applique qu'aux attaques de
  // MÊLÉE (RAW : attaques de mêlée basées sur la Force) : on le retranche
  // quand l'arme jugée est à distance.
  if (isRangedWeapon(weapon)) {
    for (const fx of character.activeEffects || []) {
      if (fx.name === 'Rage') {
        for (const mod of fx.modifiers || []) {
          if (mod.stat === 'damageBonus') effectBonus -= mod.bonus;
        }
      }
    }
  }
  const magicBonus = weapon.magicBonus !== undefined
    ? weapon.magicBonus
    : Math.max(0, (weapon.attackBonus || 0) - (Math.floor((character.level - 1) / 4) + 2)); // fallback for legacy

  return abilityMod + effectBonus + duelingBonus + magicBonus;
}

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
