import React, { useState, useEffect } from 'react';
import { CharacterSheet, Ability, CharacterStoryProfile, SpellEntry, getBaseACFromArmor, getEffectiveStat, getRacialBonus } from '../types';
import { Shield, Heart, Swords, Backpack, Plus, Minus, RefreshCw, UserRound, ScrollText, Sparkles, ChevronLeft, ChevronRight, Eye, Target, CheckCircle2, WandSparkles, Coins, ShoppingCart, Trash2 } from 'lucide-react';

interface Props {
  initialChar?: CharacterSheet;
  onSave: (char: CharacterSheet) => void;
  readOnly?: boolean;
}

import { MARTIAL_CLASSES, RACE_DATA, RACES, BACKGROUNDS, FIGHTING_STYLES, DEITIES, CLASS_DATA, BASE_STAT, MAX_POINTS, getWeaponFromInventory, DEFAULT_CHAR } from '../data';
import { CLASS_SKILLS, CLASS_EXPERTISE, ALL_SKILLS } from '../data/classes';
import { SUBCLASS_DATA, getSubclassFeaturesForLevel } from '../data/subclasses';
import { SKILL_ABILITIES, getCheckModifier, passivePerception } from '../services/skillSystem';
import { SRD51_SPELLS } from '../data/srd51/spells';
import { WEAPON_TABLE, WeaponTemplate } from '../data/weapons';
import { ARMOR_CATALOG, ArmorTemplate, parsePriceToGp, startingGoldFor, getDefaultLoadout, weaponTemplateToItem, armorTemplateToItem } from '../data/equipment';

// English skill name → French label for the creation UI (proficiencies are stored in English).
const SKILL_FR: Record<string, string> = {
    'Acrobatics': 'Acrobaties', 'Animal Handling': 'Dressage', 'Arcana': 'Arcanes', 'Athletics': 'Athlétisme',
    'Deception': 'Tromperie', 'History': 'Histoire', 'Insight': 'Perspicacité', 'Intimidation': 'Intimidation',
    'Investigation': 'Investigation', 'Medicine': 'Médecine', 'Nature': 'Nature', 'Perception': 'Perception',
    'Performance': 'Représentation', 'Persuasion': 'Persuasion', 'Religion': 'Religion', 'Sleight of Hand': 'Escamotage',
    'Stealth': 'Discrétion', 'Survival': 'Survie',
};
const ABILITY_FR_SHEET: Record<string, string> = { STR: 'FOR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'SAG', CHA: 'CHA' };

// ── Equipment-shop French labels ────────────────────────────────────────────
const WEAPON_PROP_FR: Record<string, string> = {
  'Versatile': 'Polyvalente', 'Finesse': 'Finesse', 'Light': 'Légère', 'Thrown': 'De jet',
  'Two-Handed': 'À deux mains', 'Heavy': 'Lourde', 'Reach': 'Allonge', 'Loading': 'Rechargement', 'Ammunition': 'Munitions',
};
const DMG_FR: Record<string, string> = { slashing: 'tranchant', piercing: 'perforant', bludgeoning: 'contondant' };
const ITEM_NAME_FR: Record<string, string> = {
  'Holy Symbol': 'Symbole sacré', 'Druidic Focus': 'Focaliseur druidique', 'Spellbook': 'Grimoire',
  'Arcane Focus': 'Focaliseur arcanique', 'Lute': 'Luth', 'Component Pouch': 'Bourse à composantes',
  "Thieves' Tools": 'Outils de voleur', 'Backpack': 'Sac à dos', 'Bedroll': 'Couchage', 'Tinderbox': 'Briquet',
  'Torches': 'Torches', 'Rations (days)': 'Rations', 'Waterskin': 'Gourde', 'Hempen Rope (50 ft)': 'Corde (15 m)',
};
const dmgFr = (t?: string) => (t ? (DMG_FR[t] || t) : '');
const armorTypeFr = (t: string) => (t === 'light' ? 'Légère' : t === 'medium' ? 'Intermédiaire' : t === 'heavy' ? 'Lourde' : 'Bouclier');
const frItemName = (item: any): string => {
  if (item.type === 'weapon') { const w = Object.values(WEAPON_TABLE).find(x => x.name === item.name); if (w) return w.nameFr; }
  if (item.type === 'armor') { const a = ARMOR_CATALOG.find(x => x.name === item.name); if (a) return a.nameFr; }
  return ITEM_NAME_FR[item.name] || item.name;
};
const acLabel = (item: any): string => {
  if (item.armorType === 'shield') return `+${item.acBonus} CA`;
  if (item.baseAC) return `CA ${item.baseAC}`;
  return item.effect || '';
};

// ── Display-only French labels for the identity cards (keys stay English) ─────
const CLASS_FR: Record<string, string> = {
  Fighter: 'Guerrier', Paladin: 'Paladin', Ranger: 'Rôdeur', Rogue: 'Roublard', Cleric: 'Clerc',
  Druid: 'Druide', Mage: 'Mage', Wizard: 'Magicien', Barbarian: 'Barbare', Bard: 'Barde',
  Monk: 'Moine', Warlock: 'Occultiste', Sorcerer: 'Ensorceleur',
};
const RACE_FR: Record<string, string> = {
  Human: 'Humain', Elf: 'Elfe', 'Half-Elf': 'Demi-elfe', 'Half-Orc': 'Demi-orc', Dwarf: 'Nain',
  Gnome: 'Gnome', Halfling: 'Halfelin', Tiefling: 'Tieffelin', Dragonborn: 'Drakéide',
};
const STYLE_FR: Record<string, string> = {
  Archery: 'Tir', Defense: 'Défense', Dueling: 'Duel', 'Great Weapon Fighting': 'Arme lourde',
  Protection: 'Protection', 'Two-Weapon Fighting': 'Combat à deux armes',
};
const frClass = (c: string) => CLASS_FR[c] || c;
const frRace = (r: string) => RACE_FR[r] || r; // subraces already have French keys
const frStyle = (s: string) => STYLE_FR[s] || s;

// One-click personality presets — fill the four SRD pillars + hooks, then editable.
const ARCHETYPES: { name: string; profile: Partial<CharacterStoryProfile> }[] = [
  { name: 'Vétéran hanté', profile: { personality: 'Taciturne, vigilant, économe de ses mots.', desire: 'Trouver la paix après une guerre qui ne le quitte pas.', fear: 'Revivre le massacre auquel il a survécu.', bond: "Les frères d'armes tombés à ses côtés.", ideal: "Plus jamais d'innocents sacrifiés.", flaw: "La rage l'aveugle face à l'ennemi de jadis.", dmHooks: ['Un ancien camarade réapparaît', 'Un ordre injuste à exécuter'] } },
  { name: 'Érudit obsédé', profile: { personality: 'Curieux, précis, parfois distrait par le savoir.', desire: "Percer un mystère que nul n'a résolu.", fear: "Mourir avant d'avoir compris.", bond: 'Une œuvre inachevée ; un mentor disparu.', ideal: "La vérité, quel qu'en soit le prix.", flaw: 'Ignore le danger quand le savoir l\'appelle.', dmHooks: ['Un grimoire interdit', 'Une ruine à déchiffrer'] } },
  { name: 'Filou au grand cœur', profile: { personality: 'Charmeur, vif, désarmant.', desire: "Un dernier gros coup pour s'affranchir.", fear: 'Que ses proches paient pour ses fautes.', bond: "Les gosses des rues qui l'ont élevé.", ideal: 'On ne trahit jamais les siens.', flaw: 'Ne résiste pas à un trésor mal gardé.', dmHooks: ['Une dette envers un parrain', 'Un coup qui a mal tourné'] } },
  { name: 'Zélote ardent', profile: { personality: 'Intense, inébranlable, inspiré.', desire: 'Accomplir la volonté de sa divinité.', fear: 'Être abandonné par sa foi.', bond: 'Un temple, une relique, un serment.', ideal: 'La foi guide chacun de mes pas.', flaw: 'Juge durement les incroyants.', dmHooks: ['Une relique volée', 'Une prophétie le concernant'] } },
  { name: 'Noble déchu', profile: { personality: 'Fier, raffiné, amer.', desire: 'Reconquérir son nom et ses terres.', fear: "Sombrer dans l'anonymat du commun.", bond: "L'honneur de sa maison.", ideal: 'Le rang impose des devoirs.', flaw: 'Croit que tout lui est dû.', dmHooks: ['Une intrigue de cour', 'Un héritage contesté'] } },
  { name: 'Enfant des rues', profile: { personality: 'Méfiant, débrouillard, loyal aux siens.', desire: 'Ne plus jamais avoir faim ni peur.', fear: 'Retomber dans la misère.', bond: 'Ceux qui ont survécu avec lui.', ideal: 'La liberté avant tout.', flaw: 'Vole et cache par réflexe.', dmHooks: ["Un protecteur d'enfance refait surface", 'Un secret de la ville'] } },
  { name: 'Ermite illuminé', profile: { personality: 'Calme, étrange, perçant.', desire: 'Partager (ou protéger) une vérité entrevue dans la solitude.', fear: 'Que sa découverte tombe en de mauvaises mains.', bond: 'Le secret de sa retraite.', ideal: 'La vérité se trouve en soi.', flaw: 'Ses visions frôlent parfois la folie.', dmHooks: ["La question qui l'a poussé à l'exil", 'Un culte qui veut son secret'] } },
];

type CreationStep = 'identity' | 'build' | 'gear' | 'spells' | 'story' | 'review';

const CREATION_STEPS: { id: CreationStep; label: string; icon: React.ReactNode }[] = [
  { id: 'identity', label: 'Identité', icon: <UserRound className="h-4 w-4" /> },
  { id: 'build', label: 'Build', icon: <Swords className="h-4 w-4" /> },
  { id: 'gear', label: 'Équipement', icon: <Backpack className="h-4 w-4" /> },
  { id: 'spells', label: 'Sorts', icon: <WandSparkles className="h-4 w-4" /> },
  { id: 'story', label: 'Histoire', icon: <ScrollText className="h-4 w-4" /> },
  { id: 'review', label: 'Récap', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const CINEMATIC_STYLES = [
  'dark fantasy cinematic',
  'heroic orchestral fantasy',
  'mystic fairy-tale',
  'grim survival',
  'noble epic',
  'shadowy intrigue',
];

const CASTER_SETUP: Record<string, { spellClass: string; ability: Ability; cantrips: number; spells: number; mode: 'known' | 'prepared'; focus: string }> = {
  Bard: { spellClass: 'Bard', ability: 'CHA', cantrips: 2, spells: 4, mode: 'known', focus: 'Lute' },
  Cleric: { spellClass: 'Cleric', ability: 'WIS', cantrips: 3, spells: 4, mode: 'prepared', focus: 'Holy Symbol' },
  Druid: { spellClass: 'Druid', ability: 'WIS', cantrips: 2, spells: 4, mode: 'prepared', focus: 'Druidic Focus' },
  Mage: { spellClass: 'Wizard', ability: 'INT', cantrips: 3, spells: 4, mode: 'prepared', focus: 'Spellbook' },
  Sorcerer: { spellClass: 'Sorcerer', ability: 'CHA', cantrips: 4, spells: 2, mode: 'known', focus: 'Arcane Focus' },
  Warlock: { spellClass: 'Warlock', ability: 'CHA', cantrips: 2, spells: 2, mode: 'known', focus: 'Arcane Focus' },
};

const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

function pointBuyCost(score: number): number {
  return POINT_BUY_COST[score] ?? Number.POSITIVE_INFINITY;
}

function spellsForClass(cls: string, level: 0 | 1): SpellEntry[] {
  const config = CASTER_SETUP[cls];
  if (!config) return [];
  return SRD51_SPELLS
    .filter(spell => spell.level === level && spell.classes.includes(config.spellClass))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function defaultCasterState(cls: string): Partial<CharacterSheet> {
  const config = CASTER_SETUP[cls];
  if (!config) {
    return {
      cantrips: [],
      knownSpells: [],
      preparedSpells: [],
      spellcastingAbility: undefined,
      spellcastingFocus: '',
    };
  }
  const cantrips = spellsForClass(cls, 0).slice(0, config.cantrips).map(spell => spell.name);
  const spells = spellsForClass(cls, 1).slice(0, config.spells).map(spell => spell.name);
  return {
    cantrips,
    knownSpells: config.mode === 'known' ? spells : [],
    preparedSpells: config.mode === 'prepared' ? spells : [],
    spellcastingAbility: config.ability,
    spellcastingFocus: config.focus,
    spellSlots: { [cls === 'Warlock' ? 'pact1' : '1']: { current: cls === 'Warlock' ? 1 : 2, max: cls === 'Warlock' ? 1 : 2 } },
  };
}

// Background-linked Ideals/Bonds/Flaws suggestion chips: click to fill the field.
const IbfChips: React.FC<{ items?: string[]; onPick: (v: string) => void }> = ({ items, onPick }) => {
  if (!items || !items.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          title={s}
          className="max-w-[220px] truncate rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 hover:border-blood hover:bg-blood/10"
        >
          {s}
        </button>
      ))}
    </div>
  );
};

export const CharacterSheetUI: React.FC<Props> = ({ initialChar, onSave, readOnly = false }) => {
  const [char, setChar] = useState<CharacterSheet>(initialChar || DEFAULT_CHAR);
  const [pointsSpent, setPointsSpent] = useState(0);
  const [activeStep, setActiveStep] = useState<CreationStep>(readOnly ? 'review' : 'identity');

  // Modal and tooltip states
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Class skill proficiencies the player has chosen (separate from background/race
  // grants so we can enforce the per-class count and re-pick on class change).
  const [classSkillPicks, setClassSkillPicks] = useState<string[]>([]);
  // Equipment-shop tab (creation 'gear' step).
  const [shopTab, setShopTab] = useState<'simple' | 'martial' | 'armor'>('simple');

  // --- Calculations ---

  const getMod = (score: number) => Math.floor((score - 10) / 2);

  // Recalculate Points Spent
  useEffect(() => {
    if (readOnly) return;
    let spent = 0;
    Object.values(char.stats).forEach((val: number) => {
      spent += pointBuyCost(val);
    });
    setPointsSpent(spent);
  }, [char.stats, readOnly]);

  // Recalculate Derived Stats (HP, AC, Inventory) when Class/Race/Stats/Inventory change
  useEffect(() => {
    if (readOnly) return;

    const classInfo = CLASS_DATA[char.class] || CLASS_DATA['Fighter'];
    const conMod = getMod(getEffectiveStat(char, 'CON'));

    // HP: Max Hit Die + CON Mod
    const maxHP = Math.max(1, classInfo.hitDie + conMod);
    const ac = getBaseACFromArmor(char);

    setChar(prev => {
      return {
        ...prev,
        hp: { current: maxHP, max: maxHP },
        ac: ac
      };
    });
  }, [char.class, char.race, char.fightingStyle, char.stats.CON, char.stats.DEX, char.inventory, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    const config = CASTER_SETUP[char.class];
    if (!config) return;
    const hasSetup = Boolean((char.cantrips || []).length || (char.knownSpells || []).length || (char.preparedSpells || []).length);
    if (hasSetup) return;
    setChar(prev => ({
      ...prev,
      ...defaultCasterState(prev.class),
    }));
  }, [char.class, char.cantrips, char.knownSpells, char.preparedSpells, readOnly]);



  // --- Handlers ---

  const handleStatChange = (stat: Ability, delta: number) => {
    const currentVal = char.stats[stat];
    const newVal = currentVal + delta;
    if (newVal < BASE_STAT || newVal > 15) return;
    const nextSpent = pointsSpent - pointBuyCost(currentVal) + pointBuyCost(newVal);
    if (nextSpent > MAX_POINTS) return;

    setChar(prev => ({ ...prev, stats: { ...prev.stats, [stat]: newVal } }));
  };

  const updateFeaturesAndProfs = (c: CharacterSheet, newClass?: string, newBg?: string, newStyle?: string, newRace?: string) => {
    const cls = newClass || c.class;
    const bg = newBg || c.background;
    const style = newStyle || c.fightingStyle;
    const race = newRace || c.race;

    const classInfo = CLASS_DATA[cls];
    const bgInfo = BACKGROUNDS[bg as keyof typeof BACKGROUNDS];
    const raceInfo = RACE_DATA[race];
    const styleInfo = FIGHTING_STYLES.find(s => s.name === style);

    const features = [];
    if (classInfo) {
      features.push(...classInfo.features.filter(feature => feature.level <= c.level).map(feature => ({
        name: feature.name,
        description: feature.desc,
      })));
    }
    if (bgInfo) features.push(bgInfo.feature);
    if (raceInfo) {
      features.push(...raceInfo.features.map(feature => ({ name: `${race} Trait`, description: feature })));
    }
    if (styleInfo) features.push({ name: `Fighting Style (${style})`, description: styleInfo.desc });

    const profs = [
      ...(classInfo ? classInfo.profs : []),
      ...(bgInfo ? bgInfo.profs : []),
      ...(bgInfo?.tools || []),
      ...(raceInfo ? raceInfo.profs : [])
    ];

    return { features, profs: Array.from(new Set(profs)) };
  };

  const handleClassChange = (newClass: string) => {
    const classInfo = CLASS_DATA[newClass];
    if (!classInfo) return;

    const { features, profs } = updateFeaturesAndProfs(char, newClass);
    // New model: free base package + default kit (player buys the rest with gold).
    const newInventory = getDefaultLoadout(newClass, char.background);

    // New class = new skill list → clear previous class skill picks & expertise.
    setClassSkillPicks([]);
    setChar(prev => ({
      ...prev,
      class: newClass,
      // The archetype belongs to the previous class — reset it on class change.
      subclass: undefined,
      inventory: newInventory,
      weapon: getWeaponFromInventory(newInventory),
      gold: startingGoldFor(newClass, prev.background),
      proficiencies: profs,
      expertise: [],
      features: features,
      ...defaultCasterState(newClass),
    }));
  };

  // Level-1 archetype pick at creation (Cleric domain, Warlock patron, Sorcerer
  // origin). Replaces any previously-picked archetype's features.
  const handleSubclassPick = (name: string) => {
    setChar(prev => {
      const allSubclassFeatureNames = new Set(
        Object.values(SUBCLASS_DATA).flatMap(cfg => cfg.options.flatMap(o => Object.values(o.featuresByLevel).flat().map(f => f.name)))
      );
      const baseFeatures = (prev.features || []).filter(f => !allSubclassFeatureNames.has(f.name));
      return {
        ...prev,
        subclass: name,
        features: [...baseFeatures, ...getSubclassFeaturesForLevel(prev.class, name, prev.level || 1)],
      };
    });
  };

  const handleBackgroundChange = (newBg: string) => {
    const { features, profs } = updateFeaturesAndProfs(char, undefined, newBg);
    const newInventory = getDefaultLoadout(char.class, newBg);
    const newProfs = Array.from(new Set([...profs, ...classSkillPicks]));
    // Expertise requires proficiency. If the new background dropped a skill the
    // player had expertise in, purge that now-orphaned expertise so it can't
    // grant a double proficiency bonus on a skill they no longer have.
    const profSet = new Set(newProfs.map(p => p.toLowerCase()));

    setChar(prev => ({
      ...prev,
      background: newBg,
      proficiencies: newProfs,
      expertise: (prev.expertise || []).filter(e => profSet.has(e.toLowerCase())),
      features,
      inventory: newInventory,
      weapon: getWeaponFromInventory(newInventory),
      gold: startingGoldFor(char.class, newBg),
    }));
  };

  const handleRaceChange = (newRace: string) => {
    const { features, profs } = updateFeaturesAndProfs(char, undefined, undefined, undefined, newRace);
    const newProfs = Array.from(new Set([...profs, ...classSkillPicks]));
    const profSet = new Set(newProfs.map(p => p.toLowerCase()));
    setChar(prev => ({
      ...prev,
      race: newRace,
      proficiencies: newProfs,
      expertise: (prev.expertise || []).filter(e => profSet.has(e.toLowerCase())),
      features,
    }));
  };

  const handleFightingStyleChange = (newStyle: string) => {
    const { features } = updateFeaturesAndProfs(char, undefined, undefined, newStyle);
    // New model: the style no longer rewrites the bought inventory — the player
    // buys their own gear in the Équipement step.
    setChar(prev => ({
      ...prev,
      fightingStyle: newStyle,
      features,
    }));
  };

  // ── Equipment shop (creation) ────────────────────────────────────────────
  const buyWeapon = (w: WeaponTemplate) => {
    const cost = parsePriceToGp(w.price);
    if ((char.gold || 0) < cost) return;
    setChar(prev => ({ ...prev, gold: Math.round(((prev.gold || 0) - cost) * 100) / 100, inventory: [...prev.inventory, weaponTemplateToItem(w, { equipped: false })] }));
  };
  const buyArmor = (a: ArmorTemplate) => {
    if ((char.gold || 0) < a.price) return;
    setChar(prev => ({ ...prev, gold: Math.round(((prev.gold || 0) - a.price) * 100) / 100, inventory: [...prev.inventory, armorTemplateToItem(a, false)] }));
  };
  const sellItem = (item: any) => {
    let refund = 0;
    if (item.type === 'weapon') { const w = Object.values(WEAPON_TABLE).find(x => x.name === item.name); refund = w ? parsePriceToGp(w.price) : 0; }
    else if (item.type === 'armor') { const a = ARMOR_CATALOG.find(x => x.name === item.name); refund = a ? a.price : 0; }
    setChar(prev => {
      const inv = prev.inventory.filter(i => i.id !== item.id);
      return { ...prev, gold: Math.round(((prev.gold || 0) + refund) * 100) / 100, inventory: inv, weapon: getWeaponFromInventory(inv) };
    });
  };
  const toggleEquip = (item: any) => {
    setChar(prev => {
      const willEquip = !item.equipped;
      const slot = item.type === 'armor' ? (item.armorType === 'shield' ? 'offHand' : 'chest') : 'mainHand';
      const inv = prev.inventory.map(i => {
        if (i.id === item.id) return { ...i, equipped: willEquip, slot: willEquip ? slot : 'none' };
        // Enforce one item per conflicting slot when equipping.
        if (willEquip && i.equipped && i.slot === slot) return { ...i, equipped: false, slot: 'none' };
        return i;
      });
      return { ...prev, inventory: inv, weapon: getWeaponFromInventory(inv) };
    });
  };

  const profile = char.storyProfile || {};
  const storyHookText = (profile.dmHooks || []).join('\n');
  const updateProfile = (patch: Partial<CharacterStoryProfile>) => {
    setChar(prev => ({
      ...prev,
      storyProfile: {
        ...(prev.storyProfile || {}),
        ...patch,
      },
    }));
  };

  const updateHooks = (value: string) => {
    updateProfile({
      dmHooks: value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 6),
    });
  };

  // ── Skill proficiency selection ──────────────────────────────────────────
  const classSkillData = CLASS_SKILLS[char.class];
  const expertiseMax = CLASS_EXPERTISE[char.class] || 0;
  const isProficientIn = (skill: string) => (char.proficiencies || []).some(p => p.toLowerCase() === skill.toLowerCase());
  const hasExpertiseIn = (skill: string) => (char.expertise || []).some(e => e.toLowerCase() === skill.toLowerCase());

  const toggleClassSkill = (skill: string) => {
    if (readOnly || !classSkillData || !classSkillData.list.includes(skill)) return;
    const picked = classSkillPicks.includes(skill);
    const grantedElsewhere = isProficientIn(skill) && !picked; // free from background/race
    if (grantedElsewhere) return;
    if (picked) {
      setClassSkillPicks(prev => prev.filter(s => s !== skill));
      setChar(c => ({
        ...c,
        proficiencies: (c.proficiencies || []).filter(p => p.toLowerCase() !== skill.toLowerCase()),
        expertise: (c.expertise || []).filter(e => e.toLowerCase() !== skill.toLowerCase()),
      }));
    } else {
      if (classSkillPicks.length >= classSkillData.choices) return;
      setClassSkillPicks(prev => [...prev, skill]);
      setChar(c => ({ ...c, proficiencies: Array.from(new Set([...(c.proficiencies || []), skill])) }));
    }
  };

  const toggleExpertise = (skill: string) => {
    if (readOnly || !expertiseMax || !isProficientIn(skill)) return;
    if (hasExpertiseIn(skill)) {
      setChar(c => ({ ...c, expertise: (c.expertise || []).filter(e => e.toLowerCase() !== skill.toLowerCase()) }));
    } else {
      if ((char.expertise || []).length >= expertiseMax) return;
      setChar(c => ({ ...c, expertise: [...(c.expertise || []), skill] }));
    }
  };

  const casterConfig = CASTER_SETUP[char.class];
  const cantripOptions = spellsForClass(char.class, 0);
  const levelOneSpellOptions = spellsForClass(char.class, 1);
  const selectedLevelOneSpells = casterConfig?.mode === 'prepared' ? (char.preparedSpells || []) : (char.knownSpells || []);

  const toggleSpellChoice = (list: 'cantrips' | 'level1', spellName: string) => {
    if (!casterConfig) return;
    const current = list === 'cantrips' ? (char.cantrips || []) : selectedLevelOneSpells;
    const limit = list === 'cantrips' ? casterConfig.cantrips : casterConfig.spells;
    const exists = current.includes(spellName);
    const next = exists
      ? current.filter(name => name !== spellName)
      : current.length < limit ? [...current, spellName] : current;

    if (list === 'cantrips') {
      setChar(prev => ({ ...prev, cantrips: next }));
      return;
    }

    setChar(prev => ({
      ...prev,
      knownSpells: casterConfig.mode === 'known' ? next : [],
      preparedSpells: casterConfig.mode === 'prepared' ? next : [],
    }));
  };

  const pointsRemaining = MAX_POINTS - pointsSpent;
  const currentStepIndex = CREATION_STEPS.findIndex(step => step.id === activeStep);
  const goToStep = (direction: 1 | -1) => {
    const next = CREATION_STEPS[Math.max(0, Math.min(CREATION_STEPS.length - 1, currentStepIndex + direction))];
    if (next) setActiveStep(next.id);
  };
  const requiredNarrativeReady = Boolean(profile.appearance?.trim() && profile.desire?.trim());
  const casterReady = !casterConfig
    || ((char.cantrips || []).length >= Math.min(casterConfig.cantrips, cantripOptions.length)
      && selectedLevelOneSpells.length >= Math.min(casterConfig.spells, levelOneSpellOptions.length));
  // Level-1 archetype classes (Cleric/Warlock/Sorcerer) must pick it at creation.
  const subclassReady = SUBCLASS_DATA[char.class]?.level !== 1 || Boolean(char.subclass);
  const canVenture = Boolean(char.name.trim()) && pointsRemaining === 0 && requiredNarrativeReady && casterReady && subclassReady;

  // Effective ability scores (incl. racial bonuses) for skill modifiers + passive Perception.
  const effStats: Record<string, number> = {
    STR: getEffectiveStat(char, 'STR'), DEX: getEffectiveStat(char, 'DEX'), CON: getEffectiveStat(char, 'CON'),
    INT: getEffectiveStat(char, 'INT'), WIS: getEffectiveStat(char, 'WIS'), CHA: getEffectiveStat(char, 'CHA'),
  };
  const passive = passivePerception(effStats, char.level, char.proficiencies || [], char.expertise || []);

  return (
    <div className="bg-parchment text-black p-6 rounded-lg border-8 border-double border-gray-800 shadow-2xl max-w-5xl mx-auto font-fantasy h-full overflow-y-auto">
      {!readOnly && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-gray-800 bg-gray-900 p-2 text-parchment">
            {CREATION_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`flex min-w-[130px] flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${activeStep === step.id ? 'bg-blood text-white shadow' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${activeStep === step.id ? 'border-white' : 'border-gray-500'}`}>
                  {index + 1}
                </span>
                {step.icon}
                {step.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-sans text-gray-700">
            Build the sheet, then give the DM enough identity hooks to write a personal campaign opening.
          </p>
        </div>
      )}
      {/* ─── Compact static header (review / read-only sheet) ─── */}
      {readOnly && (
        <div className="flex flex-col md:flex-row gap-4 border-b-4 border-gray-800 pb-6 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest">Nom</label>
            <h1 className="text-3xl md:text-5xl font-black text-blood border-b-2 border-gray-400">{char.name}</h1>
          </div>
          <div className="flex gap-6 items-end flex-wrap">
            <div><label className="text-xs font-bold uppercase block mb-1">Classe</label><div className="text-xl font-bold">{frClass(char.class)}</div></div>
            <div><label className="text-xs font-bold uppercase block mb-1">Race</label><div className="text-xl font-bold">{frRace(char.race)}</div></div>
            <div><label className="text-xs font-bold uppercase block mb-1">Historique</label><div className="text-xl font-bold">{char.background}</div></div>
            {MARTIAL_CLASSES.includes(char.class) && <div><label className="text-xs font-bold uppercase block mb-1">Style</label><div className="text-xl font-bold">{frStyle(char.fightingStyle)}</div></div>}
            <div><label className="text-xs font-bold uppercase block mb-1">Divinité</label><div className="text-xl font-bold">{char.deity || 'Aucune'}</div></div>
          </div>
        </div>
      )}

      {/* ─── Identity step: card pickers with inline descriptions (no hovers) ─── */}
      {!readOnly && activeStep === 'identity' && (() => {
        const baseRaces = RACES.filter(r => !RACE_DATA[r].subraceOf);
        const selectedBase = RACE_DATA[char.race]?.subraceOf || char.race;
        const subraces = RACES.filter(r => RACE_DATA[r].subraceOf === selectedBase);
        const pickBaseRace = (base: string) => {
          const subs = RACES.filter(r => RACE_DATA[r].subraceOf === base);
          handleRaceChange(subs.length ? subs[0] : base);
        };
        const raceASI = (r: string) => (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[])
          .map(a => ({ a, v: getRacialBonus(r, a) })).filter(x => x.v).map(x => `+${x.v} ${ABILITY_FR_SHEET[x.a]}`).join(' ');
        const cardCls = (s: boolean) =>
          `text-left rounded-lg border-2 p-3 transition ${s ? 'border-blood bg-blood/5 ring-1 ring-blood/40' : 'border-gray-300 bg-white hover:border-blood/60'}`;
        const selRace = RACE_DATA[char.race];
        const selClass = CLASS_DATA[char.class];
        return (
          <div className="space-y-6 mb-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">Nom du personnage</label>
              <input
                value={char.name}
                onChange={e => setChar({ ...char, name: e.target.value })}
                className="w-full text-2xl font-black bg-transparent border-b-2 border-black focus:outline-none focus:border-blood placeholder-gray-400"
                placeholder="Donne un nom à ton héros…"
              />
            </div>

            {/* Classe */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Swords className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">Classe</h2>
                <span className="text-xs font-normal normal-case text-gray-500">— dés de vie, sauvegardes, capacités</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(CLASS_DATA).map(([c, d]) => (
                  <button key={c} type="button" onClick={() => handleClassChange(c)} className={cardCls(char.class === c)}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{frClass(c)}</span>
                      <span className="text-[10px] font-mono text-gray-500">d{d.hitDie} · {d.savingThrows.map(s => ABILITY_FR_SHEET[s] || s).join('/')}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
              {/* Archétype de niveau 1 (Domaine du Clerc, Patron de l'Occultiste,
                  Origine du Sorcier) — obligatoire à la création, même pattern
                  que la sous-race. Les autres classes choisissent au niveau 2-3
                  via le level-up. */}
              {SUBCLASS_DATA[char.class]?.level === 1 && (
                <div className="mt-3 rounded-lg border-2 border-dashed border-purple-600/40 bg-purple-600/5 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-700">
                    {SUBCLASS_DATA[char.class].label} <span className="font-normal normal-case text-gray-500">— obligatoire au niveau 1</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SUBCLASS_DATA[char.class].options.map(o => (
                      <button key={o.id} type="button" onClick={() => handleSubclassPick(o.name)} className={cardCls(char.subclass === o.name)}>
                        <div className="font-bold">{o.name}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{o.description}</div>
                      </button>
                    ))}
                  </div>
                  {char.subclass && (
                    <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs text-purple-900/80">
                      {getSubclassFeaturesForLevel(char.class, char.subclass, 1).map((f, i) => (
                        <li key={i}><b>{f.name}</b> — {f.description}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selClass && (
                <div className="mt-3 rounded border border-gray-300 bg-gray-50 p-3 text-xs">
                  <div className="mb-1 font-bold">{frClass(char.class)} — aptitudes de départ</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {selClass.features.filter(f => f.level <= 3).map((f, i) => <li key={i}><b>{f.name}</b> <span className="text-gray-400">(niv. {f.level})</span> — {f.desc}</li>)}
                  </ul>
                </div>
              )}
            </section>

            {/* Race + sous-race */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">Race</h2>
                <span className="text-xs font-normal normal-case text-gray-500">— bonus de caractéristiques et traits</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {baseRaces.map(r => {
                  const d = RACE_DATA[r];
                  const hasSubs = RACES.some(x => RACE_DATA[x].subraceOf === r);
                  return (
                    <button key={r} type="button" onClick={() => pickBaseRace(r)} className={cardCls(selectedBase === r)}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold">{frRace(r)}{hasSubs && <ChevronRight className="inline h-3 w-3 text-gray-400" />}</span>
                        <span className="text-[10px] font-mono text-green-700">{raceASI(r) || '—'}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{d.desc}</div>
                    </button>
                  );
                })}
              </div>

              {subraces.length > 0 && (
                <div className="mt-3 rounded-lg border-2 border-dashed border-blood/40 bg-blood/5 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-blood">
                    Sous-race de {frRace(selectedBase)} <span className="font-normal normal-case text-gray-500">— obligatoire</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {subraces.map(s => {
                      const d = RACE_DATA[s];
                      return (
                        <button key={s} type="button" onClick={() => handleRaceChange(s)} className={cardCls(char.race === s)}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-bold">{s}</span>
                            <span className="text-[10px] font-mono text-green-700">{raceASI(s) || '—'}</span>
                          </div>
                          <div className="text-[11px] text-gray-600 mt-0.5">{d.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selRace && (
                <div className="mt-3 rounded border border-gray-300 bg-gray-50 p-3 text-xs">
                  <div className="mb-1 font-bold">{frRace(char.race)} — traits</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {selRace.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600">
                    {selRace.profs.length > 0 && <span><b>Maîtrises :</b> {selRace.profs.join(', ')}</span>}
                    {selRace.resistances?.length ? <span className="text-orange-700"><b>Résistances :</b> {selRace.resistances.join(', ')}</span> : null}
                    {selRace.darkvision ? <span><b>Vision dans le noir</b></span> : null}
                  </div>
                </div>
              )}
            </section>

            {/* Historique */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">Historique</h2>
                <span className="text-xs font-normal normal-case text-gray-500">— compétences et trait social</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(BACKGROUNDS).map(([b, d]) => (
                  <button key={b} type="button" onClick={() => handleBackgroundChange(b)} className={cardCls(char.background === b)}>
                    <div className="font-bold">{b}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{d.desc}</div>
                    <div className="text-[10px] text-blue-800 mt-1"><b>Comp. :</b> {d.profs.map(p => SKILL_FR[p] || p).join(', ')}</div>
                    <div className="text-[10px] text-yellow-800 mt-0.5"><b>{d.feature.name} :</b> {d.feature.description}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Style de combat (martial) + Divinité */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {MARTIAL_CLASSES.includes(char.class) && (
                <section>
                  <div className="mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">Style de combat</h2></div>
                  <div className="grid grid-cols-1 gap-2">
                    {FIGHTING_STYLES.map(s => (
                      <button key={s.name} type="button" onClick={() => handleFightingStyleChange(s.name)} className={cardCls(char.fightingStyle === s.name)}>
                        <div className="font-bold">{frStyle(s.name)}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">Divinité</h2>
                  <span className="text-xs font-normal normal-case text-gray-500">— optionnel</span>
                </div>
                <select
                  value={char.deity || 'Aucune'}
                  onChange={e => setChar({ ...char, deity: e.target.value })}
                  className="block w-full rounded border-2 border-gray-300 bg-white p-2 font-bold focus:border-blood focus:outline-none"
                >
                  {DEITIES.map(d => (
                    <option key={d.name} value={d.name}>{d.name}{d.alignment !== '-' ? ` (${d.alignment})` : ''}</option>
                  ))}
                </select>
                {char.deity && DEITIES.find(d => d.name === char.deity)?.desc && (
                  <div className="mt-2 rounded border border-gray-300 bg-gray-50 p-2 text-[11px] text-gray-600">{DEITIES.find(d => d.name === char.deity)?.desc}</div>
                )}
              </section>
            </div>
          </div>
        );
      })()}

      {/* Narrative Identity */}
      {!readOnly && activeStep === 'story' && (
        <div className="mb-6 space-y-5">
          <div className="rounded-lg border-2 border-gray-800 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 border-b-2 border-gray-800 pb-2">
              <Sparkles className="h-5 w-5 text-blood" />
              <div>
                <h2 className="text-xl font-black uppercase tracking-wide">Character Bible</h2>
                <p className="font-sans text-xs text-gray-600">Ces champs nourrissent le MJ, l'ouverture de campagne et la cinématique. Idéal / Lien / Défaut + un secret = les piliers SRD.</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-700">Archétype rapide <span className="font-normal normal-case text-gray-500">— pré-remplit les piliers, puis édite librement</span></div>
              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPES.map(a => (
                  <button key={a.name} type="button" onClick={() => updateProfile(a.profile)}
                    className="rounded-full border border-blood/40 bg-blood/5 px-3 py-1 text-xs font-bold text-blood hover:bg-blood/15">
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-700"><Eye className="h-3.5 w-3.5" /> Appearance *</span>
                <textarea
                  value={profile.appearance || ''}
                  onChange={e => updateProfile({ appearance: e.target.value })}
                  placeholder="Armor, scars, colors, posture, symbol, weapon silhouette..."
                  className="h-24 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={360}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-700"><Target className="h-3.5 w-3.5" /> Desire *</span>
                <textarea
                  value={profile.desire || ''}
                  onChange={e => updateProfile({ desire: e.target.value })}
                  placeholder="What does the hero want badly enough to risk death?"
                  className="h-24 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={320}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">Personality</span>
                <textarea
                  value={profile.personality || ''}
                  onChange={e => updateProfile({ personality: e.target.value })}
                  placeholder="How do they speak, decide, threaten, comfort, joke?"
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">Fear / Weakness</span>
                <textarea
                  value={profile.fear || ''}
                  onChange={e => updateProfile({ fear: e.target.value })}
                  placeholder="What can the villain exploit?"
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">Bond / Lien</span>
                <textarea
                  value={profile.bond || ''}
                  onChange={e => updateProfile({ bond: e.target.value })}
                  placeholder="A person, oath, place, mentor, family, rival, or debt."
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
                <IbfChips items={BACKGROUNDS[char.background]?.bonds} onPick={v => updateProfile({ bond: v })} />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">Wound / Regret</span>
                <textarea
                  value={profile.wound || ''}
                  onChange={e => updateProfile({ wound: e.target.value })}
                  placeholder="The old failure, loss, exile, betrayal, or shame."
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">Secret <span className="font-normal normal-case text-gray-500">— privé, connu du seul MJ</span></span>
                <textarea
                  value={profile.secret || ''}
                  onChange={e => updateProfile({ secret: e.target.value })}
                  placeholder="Un secret que le MJ pourra révéler ou exploiter : une trahison cachée, une vraie identité, un pacte, une dette honteuse..."
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
                Backstory
              </label>
              <textarea
                value={char.customBackground || ''}
                onChange={e => setChar({ ...char, customBackground: e.target.value, backstory: e.target.value })}
                placeholder="Write the short version of the hero's past. The DM will use it as personal campaign fuel."
                className="w-full h-32 p-3 bg-parchment/60 border-2 border-gray-400 rounded font-serif text-sm focus:outline-none focus:border-blood resize-none"
                maxLength={700}
              />
              <div className="text-right text-xs text-gray-500">{(char.customBackground || '').length}/700</div>
            </div>

            <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
                DM Hooks
              </label>
              <textarea
                value={storyHookText}
                onChange={e => updateHooks(e.target.value)}
                placeholder={"One hook per line:\nA missing sibling\nA cursed rank insignia\nA debt to a temple"}
                className="w-full h-32 p-3 bg-parchment/60 border-2 border-gray-400 rounded font-serif text-sm focus:outline-none focus:border-blood resize-none"
                maxLength={500}
              />
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Idéal</span>
                  <input value={profile.ideal || ''} onChange={e => updateProfile({ ideal: e.target.value })} className="mt-1 w-full rounded border border-gray-400 bg-parchment/60 px-2 py-1 text-sm" placeholder="Justice, liberté..." />
                  <IbfChips items={BACKGROUNDS[char.background]?.ideals} onPick={v => updateProfile({ ideal: v })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-700">Défaut</span>
                  <input value={profile.flaw || ''} onChange={e => updateProfile({ flaw: e.target.value })} className="mt-1 w-full rounded border border-gray-400 bg-parchment/60 px-2 py-1 text-sm" placeholder="Orgueil, pitié, rage..." />
                  <IbfChips items={BACKGROUNDS[char.background]?.flaws} onPick={v => updateProfile({ flaw: v })} />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
              Cinematic Tone
            </label>
            <select
              value={profile.cinematicStyle || 'dark fantasy cinematic'}
              onChange={e => updateProfile({ cinematicStyle: e.target.value })}
              className="w-full rounded border-2 border-gray-400 bg-parchment/60 px-3 py-2 font-bold"
            >
              {CINEMATIC_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
            </select>
          </div>
        </div>
      )}


      {(readOnly || activeStep === 'build') && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="bg-gray-200/50 p-4 rounded border-2 border-gray-400 relative">
          <h2 className="text-center font-bold text-xl border-b-2 border-gray-800 mb-4">Ability Scores</h2>

          {!readOnly && (
            <div className="mb-4 bg-gray-800 text-parchment p-2 rounded text-center">
              <div className="text-xs uppercase tracking-widest text-gray-400">Points Remaining</div>
              <div className={`text-2xl font-bold ${pointsRemaining === 0 ? 'text-green-400' : 'text-gold'}`}>
                {pointsRemaining} / {MAX_POINTS}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {(Object.keys(char.stats) as Ability[]).map(stat => {
              const val = char.stats[stat];
              const racialBonus = getRacialBonus(char.race, stat);
              const effectiveVal = val + racialBonus;
              const mod = getMod(effectiveVal);
              const increaseCost = pointBuyCost(val + 1) - pointBuyCost(val);
              return (
                <div key={stat} className="flex items-center justify-between bg-white p-2 rounded shadow border border-gray-300">
                  <div className="text-center w-10">
                    <div className="font-bold text-lg">{stat}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <button
                        onClick={() => handleStatChange(stat, -1)}
                        disabled={val <= 8}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                    <div className="w-14 text-center">
                      <div className="text-2xl font-black leading-6">{effectiveVal}</div>
                      {racialBonus !== 0 && <div className="text-[10px] font-bold text-green-700">base {val} +{racialBonus}</div>}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleStatChange(stat, 1)}
                        disabled={val >= 15 || pointsRemaining < increaseCost}
                        className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-gray-100 font-bold text-lg">
                    {mod > 0 ? '+' : ''}{mod}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Combat & Inventory */}
        <div className="col-span-2 space-y-6">
          {/* Vitals */}
          <div className="flex gap-4 justify-around bg-gray-800 text-parchment p-4 rounded-lg shadow-inner">
            <div className="flex flex-col items-center group relative">
              <Shield className="w-8 h-8 text-gray-400" />
              <span className="text-3xl font-bold mt-1">{char.ac}</span>
              <span className="text-xs uppercase tracking-widest text-gray-500">Armor Class</span>
              <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 text-xs bg-black p-1 rounded transition-opacity whitespace-nowrap">
                10 + DEX Mod
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Heart className="w-8 h-8 text-blood" />
              <span className="text-3xl font-bold mt-1">{char.hp.current} <span className="text-lg text-gray-500">/ {char.hp.max}</span></span>
              <span className="text-xs uppercase tracking-widest text-gray-500">Hit Points</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-fantasy font-black text-2xl border-2 border-gold rounded-full w-10 h-10 flex items-center justify-center text-gold">
                d{CLASS_DATA[char.class]?.hitDie || 8}
              </div>
              <span className="text-xs uppercase tracking-widest text-gray-500 mt-2">Hit Die</span>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white p-4 rounded border-2 border-gray-400 min-h-[300px]">
            <div className="flex items-center justify-between border-b-2 border-black mb-4 pb-2">
              <div className="flex items-center gap-2">
                <Backpack className="w-6 h-6" />
                <h3 className="font-bold text-xl">Starting Equipment</h3>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleClassChange(char.class)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-black"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Kit
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pl-2">Item</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Wgt</th>
                  </tr>
                </thead>
                <tbody>
                  {(char.inventory || []).map((item, idx) => (
                    // Stable key from item identity, not the array index: the inventory
                    // is mutated (buy/sell/drop) and index keys mis-reconcile on removal.
                    <tr key={(item as any).id || item.name || idx} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                      <td className="py-2 pl-2 font-bold">{item.name}</td>
                      <td className="py-2">x{item.quantity}</td>
                      <td className="py-2">{item.weight} lb</td>
                    </tr>
                  ))}
                  {(char.inventory || []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400 italic">No equipment selected</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>}

      {(readOnly || activeStep === 'build') && (
        <div className="mt-6 bg-gray-200/50 p-4 rounded border-2 border-gray-400">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-800 pb-2">
            <h2 className="text-xl font-bold">Compétences</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {classSkillData && !readOnly && (
                <span className={`font-bold ${classSkillPicks.length === classSkillData.choices ? 'text-green-700' : 'text-blood'}`}>
                  {classSkillPicks.length}/{classSkillData.choices} au choix ({char.class})
                </span>
              )}
              <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-parchment">
                <Eye className="h-4 w-4" /> Perception passive&nbsp;: <b className="text-gold">{passive}</b>
              </span>
            </div>
          </div>
          {expertiseMax > 0 && (
            <p className="mb-2 text-xs text-gray-700">★ Expertise ({(char.expertise || []).length}/{expertiseMax}) — clique l'étoile d'une compétence maîtrisée pour doubler la maîtrise.</p>
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_SKILLS.map(skill => {
              const abil = SKILL_ABILITIES[skill];
              const prof = isProficientIn(skill);
              const expert = hasExpertiseIn(skill);
              const inClassList = !!classSkillData?.list.includes(skill);
              const isPick = classSkillPicks.includes(skill);
              const grantedFree = prof && !isPick; // from background/race — locked
              const canToggle = !readOnly && inClassList && !grantedFree && (isPick || classSkillPicks.length < (classSkillData?.choices || 0));
              const mod = getCheckModifier({ effectiveStats: effStats, level: char.level, skill, proficiencies: char.proficiencies || [], expertise: char.expertise || [] }).modifier;
              return (
                <div key={skill} className={`flex items-center gap-2 rounded border px-2 py-1.5 text-sm ${prof ? 'border-blood/50 bg-blood/5' : 'border-gray-300 bg-white'}`}>
                  <button
                    type="button"
                    disabled={!canToggle}
                    onClick={() => toggleClassSkill(skill)}
                    title={grantedFree ? 'Accordée par le background/la race' : inClassList ? 'Compétence de classe au choix' : 'Hors de la liste de ta classe'}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${prof ? 'border-blood bg-blood text-white' : canToggle ? 'border-gray-500 hover:border-blood' : 'border-gray-300 opacity-40'}`}
                  >
                    {prof && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <span className="flex-1 truncate">
                    {SKILL_FR[skill] || skill} <span className="text-[10px] text-gray-500">({ABILITY_FR_SHEET[abil]})</span>
                  </span>
                  {expertiseMax > 0 && prof && (
                    <button type="button" onClick={() => toggleExpertise(skill)} title="Expertise (double maîtrise)"
                      className={`text-base leading-none ${expert ? 'text-gold' : 'text-gray-300 hover:text-gold'}`}>★</button>
                  )}
                  <span className="w-8 text-right font-mono font-bold">{mod >= 0 ? '+' : ''}{mod}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!readOnly && activeStep === 'gear' && (() => {
        const gold = char.gold || 0;
        const owned = char.inventory.filter(i => !i.hidden);
        const ownedGear = owned.filter(i => i.type === 'weapon' || i.type === 'armor');
        const ownedSac = owned.filter(i => i.type !== 'weapon' && i.type !== 'armor');
        const shopWeapons = Object.values(WEAPON_TABLE).filter(w =>
          shopTab === 'simple' ? w.category.startsWith('simple') : shopTab === 'martial' ? w.category.startsWith('martial') : false);
        return (
          <div className="space-y-5">
            {/* Header + bourse */}
            <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blood" />
                  <h2 className="text-xl font-bold">Équipement de départ</h2>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-gold bg-gold/20 px-3 py-1 font-bold text-yellow-800">
                  <Coins className="h-4 w-4" /> {gold} po
                </span>
              </div>
              <p className="text-sm text-gray-700">
                Tu reçois ton <b>paquetage</b> de classe (focalisateur, sac d'exploration…) <b>gratuitement</b>, plus un <b>kit par défaut</b> déjà équipé.
                Avec ton or de départ (richesse SRD de ta classe + bonus de background), <b>achète</b>, <b>revends</b> et <b>équipe</b> ton matériel comme tu l'entends.
              </p>
            </div>

            {/* Ton équipement */}
            <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Backpack className="h-5 w-5" /> Ton équipement</h3>
              {ownedGear.length === 0 && <p className="text-sm italic text-gray-500">Rien d'équipable pour l'instant — achète une arme ou une armure ci-dessous.</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ownedGear.map(item => (
                  <div key={item.id} className={`flex items-center gap-2 rounded border p-2 ${item.equipped ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                    {item.type === 'weapon' ? <Swords className="h-4 w-4 shrink-0 text-gray-600" /> : <Shield className="h-4 w-4 shrink-0 text-gray-600" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{frItemName(item)}</div>
                      <div className="text-[11px] text-gray-600">{item.type === 'weapon' ? `${item.damageDice || ''} ${dmgFr(item.damageType)}`.trim() : acLabel(item)}</div>
                    </div>
                    <button type="button" onClick={() => toggleEquip(item)}
                      className={`rounded px-2 py-1 text-xs font-bold ${item.equipped ? 'bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-800'}`}>
                      {item.equipped ? 'Équipé' : 'Équiper'}
                    </button>
                    <button type="button" onClick={() => sellItem(item)} title="Revendre (récupère l'or)" className="rounded p-1 text-gray-400 hover:bg-blood/10 hover:text-blood">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {ownedSac.length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-2">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Paquetage (inclus)</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ownedSac.map(item => (
                      <span key={item.id} className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                        {frItemName(item)}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Boutique */}
            <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 border-b-2 border-gray-800 pb-2">
                <Coins className="h-5 w-5 text-blood" />
                <h3 className="text-lg font-bold">Boutique</h3>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {([['simple', 'Armes courantes'], ['martial', 'Armes de guerre'], ['armor', 'Armures']] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setShopTab(id)}
                    className={`rounded border-2 px-3 py-1.5 text-sm font-bold ${shopTab === id ? 'border-blood bg-blood text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-blood'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {shopTab !== 'armor' ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {shopWeapons.map(w => {
                    const cost = parsePriceToGp(w.price);
                    const afford = gold >= cost;
                    return (
                      <div key={w.name} className="flex items-center gap-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <Swords className="h-4 w-4 shrink-0 text-gray-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">{w.nameFr}</div>
                          <div className="text-[11px] text-gray-600">
                            {w.damage} {dmgFr(w.damageType)}{w.versatile ? ` (${w.versatile} à 2 mains)` : ''}{w.range ? ` · ${w.range} m` : ''}
                            {w.properties.length ? ` · ${w.properties.map(p => WEAPON_PROP_FR[p] || p).join(', ')}` : ''}
                          </div>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs text-yellow-800">{cost} po</span>
                        <button type="button" disabled={!afford} onClick={() => buyWeapon(w)}
                          className={`rounded px-2 py-1 text-xs font-bold ${afford ? 'bg-gold text-gray-900 hover:brightness-95' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                          Acheter
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {ARMOR_CATALOG.map(a => {
                    const afford = gold >= a.price;
                    return (
                      <div key={a.key} className="flex items-center gap-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <Shield className="h-4 w-4 shrink-0 text-gray-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">{a.nameFr}</div>
                          <div className="text-[11px] text-gray-600">
                            {a.armorType === 'shield' ? `+${a.acBonus} CA` : `CA ${a.baseAC}${a.maxDexBonus !== undefined ? ` + DEX (max ${a.maxDexBonus})` : a.armorType === 'light' ? ' + DEX' : ''}`}
                            {' · '}{armorTypeFr(a.armorType)}{a.stealthDisadvantage ? ' · ⚠ Discrétion désav.' : ''}
                          </div>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs text-yellow-800">{a.price} po</span>
                        <button type="button" disabled={!afford} onClick={() => buyArmor(a)}
                          className={`rounded px-2 py-1 text-xs font-bold ${afford ? 'bg-gold text-gray-900 hover:brightness-95' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                          Acheter
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!readOnly && activeStep === 'spells' && (
        <div className="space-y-5">
          <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b-2 border-gray-800 pb-2">
              <WandSparkles className="h-5 w-5 text-blood" />
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wide">Caster Setup</h2>
                <p className="font-sans text-xs text-gray-600">
                  {casterConfig
                    ? `Choose ${casterConfig.cantrips} cantrip(s) and ${casterConfig.spells} ${casterConfig.mode === 'prepared' ? 'prepared' : 'known'} level 1 spell(s).`
                    : 'This class has no spellcasting setup at level 1.'}
                </p>
              </div>
            </div>

            {!casterConfig ? (
              <div className="rounded border border-gray-300 bg-parchment/60 p-4 font-serif text-sm text-gray-700">
                {char.class} starts as a martial/non-caster in the current rules setup. Continue to Story.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Casting Ability</div>
                    <div className="mt-1 text-2xl font-black">{casterConfig.ability}</div>
                  </div>
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Focus</div>
                    <input
                      value={char.spellcastingFocus || casterConfig.focus}
                      onChange={e => setChar(prev => ({ ...prev, spellcastingFocus: e.target.value }))}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-bold"
                    />
                  </div>
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Spell Slots</div>
                    <div className="mt-1 text-sm font-bold">{char.spellSlots ? (Object.entries(char.spellSlots) as [string, { current: number; max: number }][]).map(([slot, pool]) => `L${slot}: ${pool.current}/${pool.max}`).join(', ') : 'Cantrips only'}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-wide">Cantrips</h3>
                    <span className={(char.cantrips || []).length >= Math.min(casterConfig.cantrips, cantripOptions.length) ? 'text-sm font-bold text-green-700' : 'text-sm font-bold text-blood'}>
                      {(char.cantrips || []).length}/{Math.min(casterConfig.cantrips, cantripOptions.length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {cantripOptions.map(spell => {
                      const selected = (char.cantrips || []).includes(spell.name);
                      return (
                        <button
                          key={spell.id}
                          type="button"
                          onClick={() => toggleSpellChoice('cantrips', spell.name)}
                          className={`rounded border-2 p-3 text-left transition-colors ${selected ? 'border-blood bg-blood/10' : 'border-gray-300 bg-parchment/60 hover:border-gray-600'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black">{spell.name}</span>
                            {selected && <CheckCircle2 className="h-4 w-4 text-blood" />}
                          </div>
                          <p className="mt-1 font-serif text-xs text-gray-700">{spell.effectSummary}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-wide">Level 1 Spells</h3>
                    <span className={selectedLevelOneSpells.length >= Math.min(casterConfig.spells, levelOneSpellOptions.length) ? 'text-sm font-bold text-green-700' : 'text-sm font-bold text-blood'}>
                      {selectedLevelOneSpells.length}/{Math.min(casterConfig.spells, levelOneSpellOptions.length)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {levelOneSpellOptions.map(spell => {
                      const selected = selectedLevelOneSpells.includes(spell.name);
                      return (
                        <button
                          key={spell.id}
                          type="button"
                          onClick={() => toggleSpellChoice('level1', spell.name)}
                          className={`rounded border-2 p-3 text-left transition-colors ${selected ? 'border-blood bg-blood/10' : 'border-gray-300 bg-parchment/60 hover:border-gray-600'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black">{spell.name}</span>
                            {selected && <CheckCircle2 className="h-4 w-4 text-blood" />}
                          </div>
                          <p className="mt-1 font-serif text-xs text-gray-700">{spell.effectSummary}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{spell.castingTime} / {spell.range}{spell.concentration ? ' / concentration' : ''}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!readOnly && activeStep === 'review' && (
        <div className="space-y-5">
          <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b-2 border-gray-800 pb-2">
              <CheckCircle2 className="h-5 w-5 text-blood" />
              <h2 className="text-2xl font-black uppercase tracking-wide">Hero Brief</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Identity</div>
                <div className="mt-1 text-xl font-black">{char.name || 'Unnamed Hero'}</div>
                <p className="text-sm">{char.race} {char.class} / {char.background}</p>
                <p className="text-sm text-gray-600">Deity: {char.deity || 'None'}</p>
              </div>
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Mechanics</div>
                <p className="mt-1 text-sm">HP {char.hp.current}/{char.hp.max} / AC {char.ac} / d{CLASS_DATA[char.class]?.hitDie || 8}</p>
                <p className="text-sm">Weapon: {char.weapon?.name || 'Unarmed'} ({char.weapon?.damage || '1d4'})</p>
                <p className={pointsRemaining === 0 ? 'text-sm text-green-700' : 'text-sm text-blood'}>Point buy: {pointsRemaining === 0 ? 'complete' : `${pointsRemaining} remaining`}</p>
              </div>
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Cinematic</div>
                <p className="mt-1 text-sm">{profile.cinematicStyle || 'dark fantasy cinematic'}</p>
                <p className={requiredNarrativeReady ? 'text-sm text-green-700' : 'text-sm text-blood'}>
                  {requiredNarrativeReady ? 'Ready for personal intro' : 'Appearance and desire required'}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {casterConfig && (
                <div className="md:col-span-2">
                  <h3 className="mb-1 text-sm font-black uppercase tracking-widest">Magic</h3>
                  <div className="grid grid-cols-1 gap-3 rounded border border-gray-200 bg-parchment/60 p-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Cantrips</div>
                      <p className={(char.cantrips || []).length ? 'font-serif' : 'font-serif text-blood'}>
                        {(char.cantrips || []).join(', ') || 'Choose cantrips before starting.'}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        {casterConfig.mode === 'prepared' ? 'Prepared Spells' : 'Known Spells'}
                      </div>
                      <p className={selectedLevelOneSpells.length ? 'font-serif' : 'font-serif text-blood'}>
                        {selectedLevelOneSpells.join(', ') || 'Choose level 1 spells before starting.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-widest">Appearance</h3>
                <p className="min-h-16 rounded border border-gray-200 bg-parchment/60 p-3 font-serif text-sm">{profile.appearance || 'Missing. The intro image will be generic until this is filled.'}</p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-widest">Core Desire</h3>
                <p className="min-h-16 rounded border border-gray-200 bg-parchment/60 p-3 font-serif text-sm">{profile.desire || 'Missing. The campaign hook needs a personal goal.'}</p>
              </div>
            </div>

            {(profile.dmHooks || []).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-black uppercase tracking-widest">DM Hooks</h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.dmHooks || []).map(hook => (
                    <span key={hook} className="rounded-full border border-blood/30 bg-blood/10 px-3 py-1 text-xs font-bold text-blood">{hook}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => goToStep(-1)}
            disabled={currentStepIndex <= 0}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-700 bg-white px-4 py-3 font-bold text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </button>
          {activeStep !== 'review' ? (
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 font-fantasy text-xl text-white shadow-lg transition-colors hover:bg-gray-800"
            >
              Continue <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => onSave(char)}
              disabled={!canVenture}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blood px-4 py-4 font-fantasy text-2xl text-white shadow-lg transition-colors hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {!char.name ? (
                <>Nom requis</>
              ) : pointsRemaining > 0 ? (
                <>Dépense tes points restants ({pointsRemaining})</>
              ) : !subclassReady ? (
                <>Choisis ton {SUBCLASS_DATA[char.class]?.label || 'archétype'}</>
              ) : !requiredNarrativeReady ? (
                <>Ajoute apparence + désir</>
              ) : !casterReady ? (
                <>Choisis tes sorts de départ</>
              ) : (
                <><Swords className="w-6 h-6" /> À l'aventure !</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Class Details Modal */}
      {showClassDetails && CLASS_DATA[char.class] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-parchment text-black p-6 rounded-lg border-4 border-gray-800 max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b-2 border-gray-800 pb-2">
              <h2 className="text-2xl font-bold">{char.class}</h2>
              <button onClick={() => setShowClassDetails(false)} className="text-2xl hover:text-blood">&times;</button>
            </div>

            <p className="text-gray-600 mb-4">{CLASS_DATA[char.class].desc}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-xs text-gray-500 uppercase">Dé de Vie</div>
                <div className="text-xl font-bold text-blood">d{CLASS_DATA[char.class].hitDie}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-xs text-gray-500 uppercase">Caractéristique Principale</div>
                <div className="text-lg font-bold">{CLASS_DATA[char.class].primaryAbility}</div>
              </div>
            </div>

            <div className="bg-gray-100 p-2 rounded mb-4">
              <div className="text-xs text-gray-500 uppercase">Jets de Sauvegarde</div>
              <div className="font-bold">{CLASS_DATA[char.class].savingThrows.join(', ')}</div>
            </div>

            <div className="bg-gray-100 p-2 rounded mb-4">
              <div className="text-xs text-gray-500 uppercase">Maîtrises</div>
              <div className="text-sm">{CLASS_DATA[char.class].profs.join(', ')}</div>
            </div>

            {/* Features */}
            <h3 className="font-bold text-lg border-b border-gray-400 mb-2">Capacités de Classe</h3>
            <div className="space-y-2 mb-4">
              {CLASS_DATA[char.class].features.map((f, i) => (
                <div key={i} className="bg-white p-2 rounded border border-gray-300">
                  <div className="flex justify-between">
                    <span className="font-bold">{f.name}</span>
                    <span className="text-xs bg-blood text-white px-2 py-0.5 rounded">Niv. {f.level}</span>
                  </div>
                  <div className="text-sm text-gray-600">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* XP Thresholds */}
            <h3 className="font-bold text-lg border-b border-gray-400 mb-2">XP par Niveau</h3>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                <div key={lvl} className="bg-gray-100 p-1 rounded text-center">
                  <span className="font-bold">Niv {lvl}:</span> {[0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000][lvl - 1]} XP
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
