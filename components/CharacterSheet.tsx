import React, { useState, useEffect } from 'react';
import { CharacterSheet, Ability, CharacterStoryProfile, SpellEntry, getBaseACFromArmor, getEffectiveStat,
    getEffectiveMaxHP, getRacialBonus, racialHPBonusPerLevel, DRACONIC_ANCESTRIES } from '../types';
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
import { hasFeatSpecial } from '../services/rulesEngine';
import { SRD51_SPELLS } from '../data/srd51/spells';
import { WEAPON_TABLE, WeaponTemplate } from '../data/weapons';
import { ARMOR_CATALOG, ArmorTemplate, parsePriceToGp, startingGoldFor, getDefaultLoadout, weaponTemplateToItem, armorTemplateToItem } from '../data/equipment';
import { useGameStore } from '../store/gameStore';
import { HeroPortraitForge } from './HeroPortraitForge';

type Lang = 'en' | 'fr';

const TRANS = {
  en: {
    stepIdentity: 'Identity', stepBuild: 'Build', stepGear: 'Equipment', stepSpells: 'Spells', stepStory: 'Story', stepReview: 'Recap',
    builderHint: 'Build the sheet, then give the DM enough identity hooks to write a personal campaign opening.',
    name: 'Name', class: 'Class', race: 'Race', background: 'Background', style: 'Style', deity: 'Deity', none: 'None',
    characterName: 'Character name', namePlaceholder: 'Give your hero a name…',
    classHint: '— hit dice, saving throws, abilities',
    mandatoryLvl1: '— mandatory at level 1',
    startingAbilities: '— starting abilities',
    raceHint: '— ability bonuses and traits',
    subraceOf: (r: string) => `Subrace of ${r}`, mandatory: '— mandatory',
    draconicAncestry: 'Draconic Ancestry', ancestryHint: '— sets your breath weapon & damage resistance',
    dmgType: { fire: 'fire', cold: 'cold', lightning: 'lightning', acid: 'acid', poison: 'poison' } as Record<string, string>,
    traits: '— traits', proficienciesLabel: 'Proficiencies:', resistancesLabel: 'Resistances:', darkvision: 'Darkvision',
    bgHint: '— skills and social trait', skillsAbbr: 'Skills:',
    fightingStyle: 'Fighting Style', deityHint: '— optional',
    lvl: 'lvl.',
    characterBible: 'Character Bible',
    bibleHint: "These fields feed the DM, the campaign opening, and the cinematic. Ideal / Bond / Flaw + a secret = the SRD pillars.",
    quickArchetype: 'Quick archetype', quickArchetypeHint: '— pre-fills the pillars, then edit freely',
    appearance: 'Appearance', desire: 'Desire', personality: 'Personality', fearWeakness: 'Fear / Weakness',
    bondLien: 'Bond', woundRegret: 'Wound / Regret', secret: 'Secret', secretHint: '— private, DM-only',
    appearancePh: 'Armor, scars, colors, posture, symbol, weapon silhouette...',
    desirePh: 'What does the hero want badly enough to risk death?',
    personalityPh: 'How do they speak, decide, threaten, comfort, joke?',
    fearPh: 'What can the villain exploit?',
    bondPh: 'A person, oath, place, mentor, family, rival, or debt.',
    woundPh: 'The old failure, loss, exile, betrayal, or shame.',
    secretPh: 'A secret the DM can reveal or exploit: a hidden betrayal, a true identity, a pact, a shameful debt...',
    backstory: 'Backstory',
    backstoryPh: "Write the short version of the hero's past. The DM will use it as personal campaign fuel.",
    dmHooks: 'DM Hooks',
    dmHooksPh: 'One hook per line:\nA missing sibling\nA cursed rank insignia\nA debt to a temple',
    ideal: 'Ideal', idealPh: 'Justice, freedom...', flaw: 'Flaw', flawPh: 'Pride, mercy, rage...',
    cinematicTone: 'Cinematic Tone',
    abilityScores: 'Ability Scores', pointsRemaining: 'Points Remaining', base: 'base',
    pointMode: 'Difficulty', modeNormal: 'Normal', modeStory: 'Story',
    modeNormalHint: 'Standard 27 points', modeStoryHint: 'Generous 37 points',
    armorClass: 'Armor Class', acTooltip: '10 + DEX Mod', hitPoints: 'Hit Points', hitDie: 'Hit Die',
    startingEquipment: 'Starting Equipment', resetKit: 'Reset Kit',
    item: 'Item', qty: 'Qty', wgt: 'Wgt', noEquipment: 'No equipment selected',
    skills: 'Skills', atChoice: 'at choice', passivePerception: 'Passive Perception',
    expertiseHint: (cur: number, max: number) => `★ Expertise (${cur}/${max}) — click the star of a proficient skill to double the proficiency.`,
    grantedByBgRace: 'Granted by background/race', classSkillChoice: 'Class skill (at choice)', outOfClassList: 'Outside your class list',
    expertiseTitle: 'Expertise (double proficiency)',
    gearTitle: 'Starting equipment', gold: 'gp',
    gearIntro1: 'You receive your class', gearIntroPack: 'pack', gearIntro2: '(focus, explorer pack…)', gearIntroFree: 'for free', gearIntro3: ', plus a',
    gearIntroDefaultKit: 'default kit', gearIntro4: 'already equipped. With your starting gold (your class SRD wealth + background bonus),',
    gearIntroBuy: 'buy', gearIntroSell: 'resell', gearIntroEquip: 'equip', gearIntro5: 'your gear as you see fit.',
    yourEquipment: 'Your equipment', nothingEquippable: 'Nothing equippable yet — buy a weapon or armor below.',
    equipped: 'Equipped', equip: 'Equip', resellTitle: 'Resell (recover gold)',
    packIncluded: 'Pack (included)',
    shop: 'Shop', simpleWeapons: 'Simple weapons', martialWeapons: 'Martial weapons', armors: 'Armors',
    twoHanded: 'two-handed', buy: 'Buy', stealthDisadv: '⚠ Stealth disadv.',
    casterSetup: 'Caster Setup',
    casterIntro: (cantrips: number, spells: number, mode: string) => `Choose ${cantrips} cantrip(s) and ${spells} ${mode} level 1 spell(s).`,
    prepared: 'prepared', known: 'known',
    noCasterSetup: 'This class has no spellcasting setup at level 1.',
    noCasterClass: (cls: string) => `${cls} starts as a martial/non-caster in the current rules setup. Continue to Story.`,
    castingAbility: 'Casting Ability', focus: 'Focus', spellSlots: 'Spell Slots', cantripsOnly: 'Cantrips only',
    cantrips: 'Cantrips', level1Spells: 'Level 1 Spells', concentration: 'concentration',
    heroBrief: 'Hero Brief', identity: 'Identity', unnamedHero: 'Unnamed Hero', deityColon: 'Deity:',
    mechanics: 'Mechanics', weapon: 'Weapon:', unarmed: 'Unarmed', pointBuy: 'Point buy:', complete: 'complete', remaining: 'remaining',
    cinematic: 'Cinematic', readyForIntro: 'Ready for personal intro', appearanceDesireRequired: 'Appearance and desire required',
    magic: 'Magic', chooseCantrips: 'Choose cantrips before starting.', preparedSpells: 'Prepared Spells', knownSpells: 'Known Spells',
    chooseLvl1: 'Choose level 1 spells before starting.',
    appearanceMissing: 'Missing. The intro image will be generic until this is filled.', coreDesire: 'Core Desire',
    desireMissing: 'Missing. The campaign hook needs a personal goal.',
    back: 'Back', continue: 'Continue', nameRequired: 'Name required',
    spendPoints: (n: number) => `Spend your remaining points (${n})`,
    chooseYour: (l: string) => `Choose your ${l}`, archetype: 'archetype',
    addAppearanceDesire: 'Add appearance + desire', chooseStartingSpells: 'Choose your starting spells', toAdventure: "To adventure!",
    hitDiceLabel: 'Hit Die', primaryAbility: 'Primary Ability', savingThrows: 'Saving Throws', proficiencies: 'Proficiencies',
    classFeatures: 'Class Features', xpPerLevel: 'XP per Level', levelAbbr: 'Lvl',
  },
  fr: {
    stepIdentity: 'Identité', stepBuild: 'Build', stepGear: 'Équipement', stepSpells: 'Sorts', stepStory: 'Histoire', stepReview: 'Récap',
    builderHint: "Construis la fiche, puis donne au MJ assez d'accroches d'identité pour écrire une ouverture de campagne personnelle.",
    name: 'Nom', class: 'Classe', race: 'Race', background: 'Historique', style: 'Style', deity: 'Divinité', none: 'Aucune',
    characterName: 'Nom du personnage', namePlaceholder: 'Donne un nom à ton héros…',
    classHint: '— dés de vie, sauvegardes, capacités',
    mandatoryLvl1: '— obligatoire au niveau 1',
    startingAbilities: '— aptitudes de départ',
    raceHint: '— bonus de caractéristiques et traits',
    subraceOf: (r: string) => `Sous-race de ${r}`, mandatory: '— obligatoire',
    draconicAncestry: 'Ascendance draconique', ancestryHint: '— définit ton souffle et ta résistance',
    dmgType: { fire: 'feu', cold: 'froid', lightning: 'foudre', acid: 'acide', poison: 'poison' } as Record<string, string>,
    traits: '— traits', proficienciesLabel: 'Maîtrises :', resistancesLabel: 'Résistances :', darkvision: 'Vision dans le noir',
    bgHint: '— compétences et trait social', skillsAbbr: 'Comp. :',
    fightingStyle: 'Style de combat', deityHint: '— optionnel',
    lvl: 'niv.',
    characterBible: 'Character Bible',
    bibleHint: "Ces champs nourrissent le MJ, l'ouverture de campagne et la cinématique. Idéal / Lien / Défaut + un secret = les piliers SRD.",
    quickArchetype: 'Archétype rapide', quickArchetypeHint: '— pré-remplit les piliers, puis édite librement',
    appearance: 'Apparence', desire: 'Désir', personality: 'Personnalité', fearWeakness: 'Peur / Faiblesse',
    bondLien: 'Lien', woundRegret: 'Blessure / Regret', secret: 'Secret', secretHint: '— privé, connu du seul MJ',
    appearancePh: 'Armure, cicatrices, couleurs, posture, symbole, silhouette d\'arme...',
    desirePh: 'Que veut le héros au point de risquer la mort ?',
    personalityPh: 'Comment parle-t-il, décide-t-il, menace-t-il, réconforte-t-il, plaisante-t-il ?',
    fearPh: 'Que peut exploiter le méchant ?',
    bondPh: 'Une personne, un serment, un lieu, un mentor, une famille, un rival ou une dette.',
    woundPh: "L'ancien échec, la perte, l'exil, la trahison ou la honte.",
    secretPh: "Un secret que le MJ pourra révéler ou exploiter : une trahison cachée, une vraie identité, un pacte, une dette honteuse...",
    backstory: 'Histoire personnelle',
    backstoryPh: "Écris la version courte du passé du héros. Le MJ s'en servira comme carburant personnel de campagne.",
    dmHooks: 'Accroches MJ',
    dmHooksPh: 'Une accroche par ligne :\nUn frère ou une sœur disparu(e)\nUn insigne de rang maudit\nUne dette envers un temple',
    ideal: 'Idéal', idealPh: 'Justice, liberté...', flaw: 'Défaut', flawPh: 'Orgueil, pitié, rage...',
    cinematicTone: 'Ton cinématique',
    abilityScores: 'Caractéristiques', pointsRemaining: 'Points restants', base: 'base',
    pointMode: 'Difficulté', modeNormal: 'Normal', modeStory: 'Histoire',
    modeNormalHint: '27 points standard', modeStoryHint: '37 points généreux',
    armorClass: 'Classe d\'armure', acTooltip: '10 + mod. DEX', hitPoints: 'Points de vie', hitDie: 'Dé de vie',
    startingEquipment: 'Équipement de départ', resetKit: 'Réinit. kit',
    item: 'Objet', qty: 'Qté', wgt: 'Poids', noEquipment: 'Aucun équipement sélectionné',
    skills: 'Compétences', atChoice: 'au choix', passivePerception: 'Perception passive',
    expertiseHint: (cur: number, max: number) => `★ Expertise (${cur}/${max}) — clique l'étoile d'une compétence maîtrisée pour doubler la maîtrise.`,
    grantedByBgRace: 'Accordée par le background/la race', classSkillChoice: 'Compétence de classe au choix', outOfClassList: 'Hors de la liste de ta classe',
    expertiseTitle: 'Expertise (double maîtrise)',
    gearTitle: 'Équipement de départ', gold: 'po',
    gearIntro1: 'Tu reçois ton', gearIntroPack: 'paquetage', gearIntro2: "de classe (focalisateur, sac d'exploration…)", gearIntroFree: 'gratuitement', gearIntro3: ', plus un',
    gearIntroDefaultKit: 'kit par défaut', gearIntro4: "déjà équipé. Avec ton or de départ (richesse SRD de ta classe + bonus de background),",
    gearIntroBuy: 'achète', gearIntroSell: 'revends', gearIntroEquip: 'équipe', gearIntro5: "ton matériel comme tu l'entends.",
    yourEquipment: 'Ton équipement', nothingEquippable: "Rien d'équipable pour l'instant — achète une arme ou une armure ci-dessous.",
    equipped: 'Équipé', equip: 'Équiper', resellTitle: "Revendre (récupère l'or)",
    packIncluded: 'Paquetage (inclus)',
    shop: 'Boutique', simpleWeapons: 'Armes courantes', martialWeapons: 'Armes de guerre', armors: 'Armures',
    twoHanded: 'à 2 mains', buy: 'Acheter', stealthDisadv: '⚠ Discrétion désav.',
    casterSetup: 'Préparation des sorts',
    casterIntro: (cantrips: number, spells: number, mode: string) => `Choisis ${cantrips} sort(s) mineur(s) et ${spells} sort(s) de niveau 1 ${mode}.`,
    prepared: 'préparé(s)', known: 'connu(s)',
    noCasterSetup: 'Cette classe ne lance pas de sorts au niveau 1.',
    noCasterClass: (cls: string) => `${cls} débute comme classe martiale/non-lanceuse de sorts dans les règles actuelles. Continue vers Histoire.`,
    castingAbility: 'Caractéristique d\'incantation', focus: 'Focaliseur', spellSlots: 'Emplacements de sorts', cantripsOnly: 'Sorts mineurs uniquement',
    cantrips: 'Sorts mineurs', level1Spells: 'Sorts de niveau 1', concentration: 'concentration',
    heroBrief: 'Fiche du héros', identity: 'Identité', unnamedHero: 'Héros sans nom', deityColon: 'Divinité :',
    mechanics: 'Mécaniques', weapon: 'Arme :', unarmed: 'Mains nues', pointBuy: 'Achat de points :', complete: 'complet', remaining: 'restants',
    cinematic: 'Cinématique', readyForIntro: 'Prêt pour une intro personnelle', appearanceDesireRequired: 'Apparence et désir requis',
    magic: 'Magie', chooseCantrips: 'Choisis tes sorts mineurs avant de commencer.', preparedSpells: 'Sorts préparés', knownSpells: 'Sorts connus',
    chooseLvl1: 'Choisis tes sorts de niveau 1 avant de commencer.',
    appearanceMissing: "Manquant. L'image d'intro restera générique tant que ce champ est vide.", coreDesire: 'Désir central',
    desireMissing: "Manquant. L'accroche de campagne a besoin d'un objectif personnel.",
    back: 'Retour', continue: 'Continuer', nameRequired: 'Nom requis',
    spendPoints: (n: number) => `Dépense tes points restants (${n})`,
    chooseYour: (l: string) => `Choisis ton ${l}`, archetype: 'archétype',
    addAppearanceDesire: 'Ajoute apparence + désir', chooseStartingSpells: 'Choisis tes sorts de départ', toAdventure: "À l'aventure !",
    hitDiceLabel: 'Dé de Vie', primaryAbility: 'Caractéristique Principale', savingThrows: 'Jets de Sauvegarde', proficiencies: 'Maîtrises',
    classFeatures: 'Capacités de Classe', xpPerLevel: 'XP par Niveau', levelAbbr: 'Niv',
  },
} as const;

// Localized step labels for the creation wizard (icons are reused from CREATION_STEPS).
const STEP_LABELS: Record<Lang, Record<CreationStep, string>> = {
  en: { identity: 'Identity', build: 'Build', gear: 'Equipment', spells: 'Spells', story: 'Story', review: 'Recap' },
  fr: { identity: 'Identité', build: 'Build', gear: 'Équipement', spells: 'Sorts', story: 'Histoire', review: 'Récap' },
};

// English skill name → French label for the creation UI (proficiencies are stored in English).
const SKILL_FR: Record<string, string> = {
    'Acrobatics': 'Acrobaties', 'Animal Handling': 'Dressage', 'Arcana': 'Arcanes', 'Athletics': 'Athlétisme',
    'Deception': 'Tromperie', 'History': 'Histoire', 'Insight': 'Perspicacité', 'Intimidation': 'Intimidation',
    'Investigation': 'Investigation', 'Medicine': 'Médecine', 'Nature': 'Nature', 'Perception': 'Perception',
    'Performance': 'Représentation', 'Persuasion': 'Persuasion', 'Religion': 'Religion', 'Sleight of Hand': 'Escamotage',
    'Stealth': 'Discrétion', 'Survival': 'Survie',
};
const ABILITY_FR_SHEET: Record<string, string> = { STR: 'FOR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'SAG', CHA: 'CHA' };
// Ability abbreviation by language: English keys for 'en', French D&D abbreviations for 'fr'.
const dispAbbr = (a: string, lang: 'en' | 'fr') => (lang === 'fr' ? (ABILITY_FR_SHEET[a] || a) : a);

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
const DMG_EN: Record<string, string> = { slashing: 'slashing', piercing: 'piercing', bludgeoning: 'bludgeoning' };
// Damage type label by language.
const dmgLabel = (t: string | undefined, lang: Lang) => (t ? (lang === 'fr' ? (DMG_FR[t] || t) : (DMG_EN[t] || t)) : '');
// Armor category label by language.
const armorTypeLabel = (t: string, lang: Lang) => lang === 'fr'
  ? (t === 'light' ? 'Légère' : t === 'medium' ? 'Intermédiaire' : t === 'heavy' ? 'Lourde' : 'Bouclier')
  : (t === 'light' ? 'Light' : t === 'medium' ? 'Medium' : t === 'heavy' ? 'Heavy' : 'Shield');
// Item display name by language (English keeps the data's English name).
const itemName = (item: any, lang: Lang): string => {
  if (lang === 'fr') {
    if (item.type === 'weapon') { const w = Object.values(WEAPON_TABLE).find(x => x.name === item.name); if (w) return w.nameFr; }
    if (item.type === 'armor') { const a = ARMOR_CATALOG.find(x => x.name === item.name); if (a) return a.nameFr; }
    return ITEM_NAME_FR[item.name] || item.name;
  }
  return item.name;
};
// AC summary on an equippable item, localized AC abbreviation (CA in French).
const acLabel = (item: any, lang: Lang): string => {
  const ac = lang === 'fr' ? 'CA' : 'AC';
  if (item.armorType === 'shield') return `+${item.acBonus} ${ac}`;
  if (item.baseAC) return `${ac} ${item.baseAC}`;
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
// Class/Race/Style display names: English keys for 'en', French map for 'fr'.
const dispClass = (c: string, lang: Lang) => (lang === 'fr' ? (CLASS_FR[c] || c) : c);
const dispRace = (r: string, lang: Lang) => (lang === 'fr' ? (RACE_FR[r] || r) : r); // subraces already have French keys for fr
const dispStyle = (s: string, lang: Lang) => (lang === 'fr' ? (STYLE_FR[s] || s) : s);

// One-click personality presets — fill the four SRD pillars + hooks, then editable.
type Archetype = { nameEn: string; nameFr: string; profileEn: Partial<CharacterStoryProfile>; profileFr: Partial<CharacterStoryProfile> };
const ARCHETYPES: Archetype[] = [
  { nameEn: 'Haunted Veteran', nameFr: 'Vétéran hanté',
    profileEn: { personality: 'Taciturn, watchful, sparing with words.', desire: "Find peace after a war that won't leave him.", fear: 'Reliving the massacre he survived.', bond: 'The brothers-in-arms who fell at his side.', ideal: 'Never again shall innocents be sacrificed.', flaw: 'Rage blinds him before the enemy of old.', dmHooks: ['A former comrade resurfaces', 'An unjust order to carry out'] },
    profileFr: { personality: 'Taciturne, vigilant, économe de ses mots.', desire: 'Trouver la paix après une guerre qui ne le quitte pas.', fear: 'Revivre le massacre auquel il a survécu.', bond: "Les frères d'armes tombés à ses côtés.", ideal: "Plus jamais d'innocents sacrifiés.", flaw: "La rage l'aveugle face à l'ennemi de jadis.", dmHooks: ['Un ancien camarade réapparaît', 'Un ordre injuste à exécuter'] } },
  { nameEn: 'Obsessed Scholar', nameFr: 'Érudit obsédé',
    profileEn: { personality: 'Curious, precise, sometimes distracted by knowledge.', desire: 'Crack a mystery no one has solved.', fear: 'Dying before understanding.', bond: 'An unfinished work; a vanished mentor.', ideal: 'The truth, whatever the price.', flaw: 'Ignores danger when knowledge calls.', dmHooks: ['A forbidden grimoire', 'A ruin to decipher'] },
    profileFr: { personality: 'Curieux, précis, parfois distrait par le savoir.', desire: "Percer un mystère que nul n'a résolu.", fear: "Mourir avant d'avoir compris.", bond: 'Une œuvre inachevée ; un mentor disparu.', ideal: "La vérité, quel qu'en soit le prix.", flaw: 'Ignore le danger quand le savoir l\'appelle.', dmHooks: ['Un grimoire interdit', 'Une ruine à déchiffrer'] } },
  { nameEn: 'Rogue with a Heart', nameFr: 'Filou au grand cœur',
    profileEn: { personality: 'Charming, quick, disarming.', desire: 'One last big score to break free.', fear: 'That his loved ones pay for his faults.', bond: 'The street kids who raised him.', ideal: 'You never betray your own.', flaw: "Can't resist a poorly guarded treasure.", dmHooks: ['A debt to a crime boss', 'A job that went wrong'] },
    profileFr: { personality: 'Charmeur, vif, désarmant.', desire: "Un dernier gros coup pour s'affranchir.", fear: 'Que ses proches paient pour ses fautes.', bond: "Les gosses des rues qui l'ont élevé.", ideal: 'On ne trahit jamais les siens.', flaw: 'Ne résiste pas à un trésor mal gardé.', dmHooks: ['Une dette envers un parrain', 'Un coup qui a mal tourné'] } },
  { nameEn: 'Ardent Zealot', nameFr: 'Zélote ardent',
    profileEn: { personality: 'Intense, unwavering, inspired.', desire: 'Fulfill the will of his deity.', fear: 'Being abandoned by his faith.', bond: 'A temple, a relic, an oath.', ideal: 'Faith guides my every step.', flaw: 'Judges the unbelievers harshly.', dmHooks: ['A stolen relic', 'A prophecy about him'] },
    profileFr: { personality: 'Intense, inébranlable, inspiré.', desire: 'Accomplir la volonté de sa divinité.', fear: 'Être abandonné par sa foi.', bond: 'Un temple, une relique, un serment.', ideal: 'La foi guide chacun de mes pas.', flaw: 'Juge durement les incroyants.', dmHooks: ['Une relique volée', 'Une prophétie le concernant'] } },
  { nameEn: 'Fallen Noble', nameFr: 'Noble déchu',
    profileEn: { personality: 'Proud, refined, bitter.', desire: 'Reclaim his name and his lands.', fear: 'Sinking into common anonymity.', bond: 'The honor of his house.', ideal: 'Rank imposes duties.', flaw: 'Believes everything is owed to him.', dmHooks: ['A court intrigue', 'A contested inheritance'] },
    profileFr: { personality: 'Fier, raffiné, amer.', desire: 'Reconquérir son nom et ses terres.', fear: "Sombrer dans l'anonymat du commun.", bond: "L'honneur de sa maison.", ideal: 'Le rang impose des devoirs.', flaw: 'Croit que tout lui est dû.', dmHooks: ['Une intrigue de cour', 'Un héritage contesté'] } },
  { nameEn: 'Street Child', nameFr: 'Enfant des rues',
    profileEn: { personality: 'Wary, resourceful, loyal to his own.', desire: 'Never be hungry or afraid again.', fear: 'Falling back into misery.', bond: 'Those who survived alongside him.', ideal: 'Freedom above all.', flaw: 'Steals and hides by reflex.', dmHooks: ['A childhood protector resurfaces', 'A secret of the city'] },
    profileFr: { personality: 'Méfiant, débrouillard, loyal aux siens.', desire: 'Ne plus jamais avoir faim ni peur.', fear: 'Retomber dans la misère.', bond: 'Ceux qui ont survécu avec lui.', ideal: 'La liberté avant tout.', flaw: 'Vole et cache par réflexe.', dmHooks: ["Un protecteur d'enfance refait surface", 'Un secret de la ville'] } },
  { nameEn: 'Enlightened Hermit', nameFr: 'Ermite illuminé',
    profileEn: { personality: 'Calm, strange, piercing.', desire: 'Share (or protect) a truth glimpsed in solitude.', fear: 'That his discovery falls into the wrong hands.', bond: 'The secret of his retreat.', ideal: 'Truth is found within.', flaw: 'His visions sometimes border on madness.', dmHooks: ['The question that drove him into exile', 'A cult that wants his secret'] },
    profileFr: { personality: 'Calme, étrange, perçant.', desire: 'Partager (ou protéger) une vérité entrevue dans la solitude.', fear: 'Que sa découverte tombe en de mauvaises mains.', bond: 'Le secret de sa retraite.', ideal: 'La vérité se trouve en soi.', flaw: 'Ses visions frôlent parfois la folie.', dmHooks: ["La question qui l'a poussé à l'exil", 'Un culte qui veut son secret'] } },
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

// Point-buy budget by creation difficulty. Normal = the standard 5e 27-point
// buy (MAX_POINTS); Story = a more generous 37 for a lower-stakes power fantasy.
// The per-stat ceiling stays 15 either way, so Story just allows more well-
// rounded heroes, never scores above the point-buy table.
// UI1 (contre-audit) — 54 était EXACTEMENT le coût de 15 partout : combiné à
// l'exigence « dépenser tout », le mode Histoire IMPOSAIT 15/15/15/15/15/15
// (somme des mods +12 vs +5 en normal). 37 rend un vrai choix, conforme aux
// libellés affichés (« 37 points généreux »).
const STORY_MAX_POINTS = 54;

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
    // UI2 (contre-audit) — les lanceurs « prepared » (Clerc/Druide/Mage) doivent
    // aussi CONNAÎTRE leurs sorts : l'onglet Grimoire ne lit que knownSpells, et
    // avec knownSpells vide, les 4 sorts de création saturaient maxPrepared (3 au
    // niv. 1) sans pouvoir être dépréparés — plus aucun sort préparable ensuite.
    knownSpells: spells,
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
  const language = useGameStore(s => s.language);
  const tr = TRANS[language];
  const [char, setChar] = useState<CharacterSheet>(initialChar || DEFAULT_CHAR);
  const [pointsSpent, setPointsSpent] = useState(0);
  // Creation difficulty: 'normal' = standard 27-point buy, 'story' = generous 37.
  const [pointMode, setPointMode] = useState<'normal' | 'story'>('normal');
  const maxPoints = pointMode === 'story' ? STORY_MAX_POINTS : MAX_POINTS;
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

    // HP: Max Hit Die + CON Mod (+ Robustesse naine du Nain des collines — DA5)
    const maxHP = Math.max(1, classInfo.hitDie + conMod + racialHPBonusPerLevel(char));
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
    if (nextSpent > maxPoints) return;

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

    const features: { name: string; description: string }[] = [];
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
      // Dragonborn keep/gain an ancestry (default Red→fire); other races drop it.
      draconicAncestry: newRace === 'Dragonborn' ? (prev.draconicAncestry || 'Red') : undefined,
      proficiencies: newProfs,
      expertise: (prev.expertise || []).filter(e => profSet.has(e.toLowerCase())),
      features,
    }));
  };

  const handleAncestryPick = (ancestry: string) => {
    setChar(prev => ({ ...prev, draconicAncestry: ancestry }));
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
      const slot = (item.type === 'armor' ? (item.armorType === 'shield' ? 'offHand' : 'chest') : 'mainHand') as CharacterSheet['inventory'][number]['slot'];
      const inv = prev.inventory.map(i => {
        if (i.id === item.id) return { ...i, equipped: willEquip, slot: willEquip ? slot : ('none' as const) };
        // Enforce one item per conflicting slot when equipping.
        if (willEquip && i.equipped && i.slot === slot) return { ...i, equipped: false, slot: 'none' as const };
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
      // UI2 — connu dans les deux modes ; préparé seulement en mode « prepared ».
      knownSpells: next,
      preparedSpells: casterConfig.mode === 'prepared' ? next : [],
    }));
  };

  const pointsRemaining = maxPoints - pointsSpent;
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
  const passive = passivePerception(effStats, char.level, char.proficiencies || [], char.expertise || [], hasFeatSpecial(char, 'passive_senses_plus_5') ? 5 : 0);

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
                {STEP_LABELS[language][step.id]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-sans text-gray-700">
            {tr.builderHint}
          </p>
        </div>
      )}
      {/* ─── Compact static header (review / read-only sheet) ─── */}
      {readOnly && (
        <div className="flex flex-col md:flex-row gap-4 border-b-4 border-gray-800 pb-6 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest">{tr.name}</label>
            <h1 className="text-3xl md:text-5xl font-black text-blood border-b-2 border-gray-400">{char.name}</h1>
          </div>
          <div className="flex gap-6 items-end flex-wrap">
            <div><label className="text-xs font-bold uppercase block mb-1">{tr.class}</label><div className="text-xl font-bold">{dispClass(char.class, language)}</div></div>
            <div><label className="text-xs font-bold uppercase block mb-1">{tr.race}</label><div className="text-xl font-bold">{dispRace(char.race, language)}</div></div>
            <div><label className="text-xs font-bold uppercase block mb-1">{tr.background}</label><div className="text-xl font-bold">{char.background}</div></div>
            {MARTIAL_CLASSES.includes(char.class) && <div><label className="text-xs font-bold uppercase block mb-1">{tr.style}</label><div className="text-xl font-bold">{dispStyle(char.fightingStyle, language)}</div></div>}
            <div><label className="text-xs font-bold uppercase block mb-1">{tr.deity}</label><div className="text-xl font-bold">{char.deity || tr.none}</div></div>
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
          .map(a => ({ a, v: getRacialBonus(r, a) })).filter(x => x.v).map(x => `+${x.v} ${dispAbbr(x.a, language)}`).join(' ');
        const cardCls = (s: boolean) =>
          `text-left rounded-lg border-2 p-3 transition ${s ? 'border-blood bg-blood/5 ring-1 ring-blood/40' : 'border-gray-300 bg-white hover:border-blood/60'}`;
        const selRace = RACE_DATA[char.race];
        const selClass = CLASS_DATA[char.class];
        return (
          <div className="space-y-6 mb-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">{tr.characterName}</label>
              <input
                value={char.name}
                onChange={e => setChar({ ...char, name: e.target.value })}
                className="w-full text-2xl font-black bg-transparent border-b-2 border-black focus:outline-none focus:border-blood placeholder-gray-400"
                placeholder={tr.namePlaceholder}
              />
            </div>

            {/* Classe */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <Swords className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">{tr.class}</h2>
                <span className="text-xs font-normal normal-case text-gray-500">{tr.classHint}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(CLASS_DATA).map(([c, d]) => (
                  <button key={c} type="button" onClick={() => handleClassChange(c)} className={cardCls(char.class === c)}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{dispClass(c, language)}</span>
                      <span className="text-[10px] font-mono text-gray-500">d{d.hitDie} · {d.savingThrows.map(s => dispAbbr(s, language)).join('/')}</span>
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
                    {SUBCLASS_DATA[char.class].label} <span className="font-normal normal-case text-gray-500">{tr.mandatoryLvl1}</span>
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
                  <div className="mb-1 font-bold">{dispClass(char.class, language)} {tr.startingAbilities}</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {selClass.features.filter(f => f.level <= 3).map((f, i) => <li key={i}><b>{f.name}</b> <span className="text-gray-400">({tr.lvl} {f.level})</span> — {f.desc}</li>)}
                  </ul>
                </div>
              )}
            </section>

            {/* Race + sous-race */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">{tr.race}</h2>
                <span className="text-xs font-normal normal-case text-gray-500">{tr.raceHint}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {baseRaces.map(r => {
                  const d = RACE_DATA[r];
                  const hasSubs = RACES.some(x => RACE_DATA[x].subraceOf === r);
                  return (
                    <button key={r} type="button" onClick={() => pickBaseRace(r)} className={cardCls(selectedBase === r)}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold">{dispRace(r, language)}{hasSubs && <ChevronRight className="inline h-3 w-3 text-gray-400" />}</span>
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
                    {tr.subraceOf(dispRace(selectedBase, language))} <span className="font-normal normal-case text-gray-500">{tr.mandatory}</span>
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

              {/* Draconic ancestry — Dragonborn only. Sets breath-weapon type + resistance. */}
              {char.race === 'Dragonborn' && (
                <div className="mt-3 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/5 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">
                    {tr.draconicAncestry} <span className="font-normal normal-case text-gray-500">{tr.mandatory} {tr.ancestryHint}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {DRACONIC_ANCESTRIES.map(a => (
                      <button key={a.id} type="button" onClick={() => handleAncestryPick(a.id)} className={cardCls(char.draconicAncestry === a.id)}>
                        <div className="font-bold">{language === 'fr' ? a.fr : a.en}</div>
                        <div className="text-[11px] capitalize text-gray-600 mt-0.5">{tr.dmgType[a.type] || a.type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selRace && (
                <div className="mt-3 rounded border border-gray-300 bg-gray-50 p-3 text-xs">
                  <div className="mb-1 font-bold">{dispRace(char.race, language)} {tr.traits}</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {selRace.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600">
                    {selRace.profs.length > 0 && <span><b>{tr.proficienciesLabel}</b> {selRace.profs.join(', ')}</span>}
                    {selRace.resistances?.length ? <span className="text-orange-700"><b>{tr.resistancesLabel}</b> {selRace.resistances.join(', ')}</span> : null}
                    {selRace.darkvision ? <span><b>{tr.darkvision}</b></span> : null}
                  </div>
                </div>
              )}
            </section>

            {/* Historique */}
            <section>
              <div className="mb-2 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">{tr.background}</h2>
                <span className="text-xs font-normal normal-case text-gray-500">{tr.bgHint}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(BACKGROUNDS).map(([b, d]) => (
                  <button key={b} type="button" onClick={() => handleBackgroundChange(b)} className={cardCls(char.background === b)}>
                    <div className="font-bold">{b}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{d.desc}</div>
                    <div className="text-[10px] text-blue-800 mt-1"><b>{tr.skillsAbbr}</b> {d.profs.map(p => language === 'fr' ? (SKILL_FR[p] || p) : p).join(', ')}</div>
                    <div className="text-[10px] text-yellow-800 mt-0.5"><b>{d.feature.name} :</b> {d.feature.description}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Style de combat (martial) + Divinité */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {MARTIAL_CLASSES.includes(char.class) && (
                <section>
                  <div className="mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">{tr.fightingStyle}</h2></div>
                  <div className="grid grid-cols-1 gap-2">
                    {FIGHTING_STYLES.map(s => (
                      <button key={s.name} type="button" onClick={() => handleFightingStyleChange(s.name)} className={cardCls(char.fightingStyle === s.name)}>
                        <div className="font-bold">{dispStyle(s.name, language)}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blood" /><h2 className="text-sm font-black uppercase tracking-widest">{tr.deity}</h2>
                  <span className="text-xs font-normal normal-case text-gray-500">{tr.deityHint}</span>
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
                <h2 className="text-xl font-black uppercase tracking-wide">{tr.characterBible}</h2>
                <p className="font-sans text-xs text-gray-600">{tr.bibleHint}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.quickArchetype} <span className="font-normal normal-case text-gray-500">{tr.quickArchetypeHint}</span></div>
              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPES.map(a => (
                  <button key={a.nameEn} type="button" onClick={() => updateProfile(language === 'fr' ? a.profileFr : a.profileEn)}
                    className="rounded-full border border-blood/40 bg-blood/5 px-3 py-1 text-xs font-bold text-blood hover:bg-blood/15">
                    {language === 'fr' ? a.nameFr : a.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-700"><Eye className="h-3.5 w-3.5" /> {tr.appearance} *</span>
                <textarea
                  value={profile.appearance || ''}
                  onChange={e => updateProfile({ appearance: e.target.value })}
                  placeholder={tr.appearancePh}
                  className="h-24 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={360}
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-700"><Target className="h-3.5 w-3.5" /> {tr.desire} *</span>
                <textarea
                  value={profile.desire || ''}
                  onChange={e => updateProfile({ desire: e.target.value })}
                  placeholder={tr.desirePh}
                  className="h-24 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={320}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.personality}</span>
                <textarea
                  value={profile.personality || ''}
                  onChange={e => updateProfile({ personality: e.target.value })}
                  placeholder={tr.personalityPh}
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.fearWeakness}</span>
                <textarea
                  value={profile.fear || ''}
                  onChange={e => updateProfile({ fear: e.target.value })}
                  placeholder={tr.fearPh}
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.bondLien}</span>
                <textarea
                  value={profile.bond || ''}
                  onChange={e => updateProfile({ bond: e.target.value })}
                  placeholder={tr.bondPh}
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
                <IbfChips items={BACKGROUNDS[char.background]?.bonds} onPick={v => updateProfile({ bond: v })} />
              </label>

              <label className="block">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.woundRegret}</span>
                <textarea
                  value={profile.wound || ''}
                  onChange={e => updateProfile({ wound: e.target.value })}
                  placeholder={tr.woundPh}
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-700">{tr.secret} <span className="font-normal normal-case text-gray-500">{tr.secretHint}</span></span>
                <textarea
                  value={profile.secret || ''}
                  onChange={e => updateProfile({ secret: e.target.value })}
                  placeholder={tr.secretPh}
                  className="h-20 w-full resize-none rounded border-2 border-gray-400 bg-parchment/60 p-3 font-serif text-sm focus:border-blood focus:outline-none"
                  maxLength={280}
                />
              </label>
            </div>

            {/* Le portrait forgé ici devient la référence visuelle du héros dans
                toutes les images de scène (voir services/imageReferences.ts). */}
            <HeroPortraitForge
              character={char}
              language={language}
              onUpdateProfile={updateProfile}
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
                {tr.backstory}
              </label>
              <textarea
                value={char.customBackground || ''}
                onChange={e => setChar({ ...char, customBackground: e.target.value, backstory: e.target.value })}
                placeholder={tr.backstoryPh}
                className="w-full h-32 p-3 bg-parchment/60 border-2 border-gray-400 rounded font-serif text-sm focus:outline-none focus:border-blood resize-none"
                maxLength={700}
              />
              <div className="text-right text-xs text-gray-500">{(char.customBackground || '').length}/700</div>
            </div>

            <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
                {tr.dmHooks}
              </label>
              <textarea
                value={storyHookText}
                onChange={e => updateHooks(e.target.value)}
                placeholder={tr.dmHooksPh}
                className="w-full h-32 p-3 bg-parchment/60 border-2 border-gray-400 rounded font-serif text-sm focus:outline-none focus:border-blood resize-none"
                maxLength={500}
              />
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-700">{tr.ideal}</span>
                  <input value={profile.ideal || ''} onChange={e => updateProfile({ ideal: e.target.value })} className="mt-1 w-full rounded border border-gray-400 bg-parchment/60 px-2 py-1 text-sm" placeholder={tr.idealPh} />
                  <IbfChips items={BACKGROUNDS[char.background]?.ideals} onPick={v => updateProfile({ ideal: v })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-700">{tr.flaw}</span>
                  <input value={profile.flaw || ''} onChange={e => updateProfile({ flaw: e.target.value })} className="mt-1 w-full rounded border border-gray-400 bg-parchment/60 px-2 py-1 text-sm" placeholder={tr.flawPh} />
                  <IbfChips items={BACKGROUNDS[char.background]?.flaws} onPick={v => updateProfile({ flaw: v })} />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-gray-400 bg-white p-4">
            <label className="block text-sm font-bold text-gray-800 uppercase tracking-widest mb-2">
              {tr.cinematicTone}
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
          <h2 className="text-center font-bold text-xl border-b-2 border-gray-800 mb-4">{tr.abilityScores}</h2>

          {!readOnly && (
            <>
              {/* Difficulty toggle: Normal (27, standard 5e) vs Story (37, generous). */}
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 text-center">{tr.pointMode}</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'normal' as const, label: tr.modeNormal, hint: tr.modeNormalHint },
                    { id: 'story' as const, label: tr.modeStory, hint: tr.modeStoryHint },
                  ]).map(m => {
                    const active = pointMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPointMode(m.id)}
                        className={`rounded border-2 p-2 text-center transition-colors ${active
                          ? 'border-blood bg-blood/10'
                          : 'border-gray-300 bg-white hover:border-gray-400'}`}
                        title={m.hint}
                      >
                        <div className={`text-sm font-bold ${active ? 'text-blood' : 'text-gray-700'}`}>{m.label}</div>
                        <div className="text-[10px] text-gray-500">{m.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 bg-gray-800 text-parchment p-2 rounded text-center">
                <div className="text-xs uppercase tracking-widest text-gray-400">{tr.pointsRemaining}</div>
                <div className={`text-2xl font-bold ${pointsRemaining === 0 ? 'text-green-400' : pointsRemaining < 0 ? 'text-red-400' : 'text-gold'}`}>
                  {pointsRemaining} / {maxPoints}
                </div>
              </div>
            </>
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
                      {racialBonus !== 0 && <div className="text-[10px] font-bold text-green-700">{tr.base} {val} +{racialBonus}</div>}
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
              <span className="text-xs uppercase tracking-widest text-gray-500">{tr.armorClass}</span>
              <span className="absolute -bottom-8 opacity-0 group-hover:opacity-100 text-xs bg-black p-1 rounded transition-opacity whitespace-nowrap">
                {tr.acTooltip}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Heart className="w-8 h-8 text-blood" />
              <span className="text-3xl font-bold mt-1">{char.hp.current} <span className="text-lg text-gray-500">/ {getEffectiveMaxHP(char)}</span></span>
              <span className="text-xs uppercase tracking-widest text-gray-500">{tr.hitPoints}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="font-fantasy font-black text-2xl border-2 border-gold rounded-full w-10 h-10 flex items-center justify-center text-gold">
                d{CLASS_DATA[char.class]?.hitDie || 8}
              </div>
              <span className="text-xs uppercase tracking-widest text-gray-500 mt-2">{tr.hitDie}</span>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white p-4 rounded border-2 border-gray-400 min-h-[300px]">
            <div className="flex items-center justify-between border-b-2 border-black mb-4 pb-2">
              <div className="flex items-center gap-2">
                <Backpack className="w-6 h-6" />
                <h3 className="font-bold text-xl">{tr.startingEquipment}</h3>
              </div>
              {!readOnly && (
                <button
                  onClick={() => handleClassChange(char.class)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-black"
                >
                  <RefreshCw className="w-3 h-3" /> {tr.resetKit}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pl-2">{tr.item}</th>
                    <th className="pb-2">{tr.qty}</th>
                    <th className="pb-2">{tr.wgt}</th>
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
                      <td colSpan={3} className="py-4 text-center text-gray-400 italic">{tr.noEquipment}</td>
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
            <h2 className="text-xl font-bold">{tr.skills}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {classSkillData && !readOnly && (
                <span className={`font-bold ${classSkillPicks.length === classSkillData.choices ? 'text-green-700' : 'text-blood'}`}>
                  {classSkillPicks.length}/{classSkillData.choices} {tr.atChoice} ({dispClass(char.class, language)})
                </span>
              )}
              <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-parchment">
                <Eye className="h-4 w-4" /> {tr.passivePerception}&nbsp;: <b className="text-gold">{passive}</b>
              </span>
            </div>
          </div>
          {expertiseMax > 0 && (
            <p className="mb-2 text-xs text-gray-700">{tr.expertiseHint((char.expertise || []).length, expertiseMax)}</p>
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
                    title={grantedFree ? tr.grantedByBgRace : inClassList ? tr.classSkillChoice : tr.outOfClassList}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${prof ? 'border-blood bg-blood text-white' : canToggle ? 'border-gray-500 hover:border-blood' : 'border-gray-300 opacity-40'}`}
                  >
                    {prof && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <span className="flex-1 truncate">
                    {language === 'fr' ? (SKILL_FR[skill] || skill) : skill} <span className="text-[10px] text-gray-500">({dispAbbr(abil, language)})</span>
                  </span>
                  {expertiseMax > 0 && prof && (
                    <button type="button" onClick={() => toggleExpertise(skill)} title={tr.expertiseTitle}
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
                  <h2 className="text-xl font-bold">{tr.gearTitle}</h2>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-gold bg-gold/20 px-3 py-1 font-bold text-yellow-800">
                  <Coins className="h-4 w-4" /> {gold} {tr.gold}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {tr.gearIntro1} <b>{tr.gearIntroPack}</b> {tr.gearIntro2} <b>{tr.gearIntroFree}</b>{tr.gearIntro3} <b>{tr.gearIntroDefaultKit}</b> {tr.gearIntro4} <b>{tr.gearIntroBuy}</b>, <b>{tr.gearIntroSell}</b> {language === 'fr' ? 'et' : 'and'} <b>{tr.gearIntroEquip}</b> {tr.gearIntro5}
              </p>
            </div>

            {/* Ton équipement */}
            <div className="rounded-lg border-2 border-gray-800 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold"><Backpack className="h-5 w-5" /> {tr.yourEquipment}</h3>
              {ownedGear.length === 0 && <p className="text-sm italic text-gray-500">{tr.nothingEquippable}</p>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ownedGear.map(item => (
                  <div key={item.id} className={`flex items-center gap-2 rounded border p-2 ${item.equipped ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                    {item.type === 'weapon' ? <Swords className="h-4 w-4 shrink-0 text-gray-600" /> : <Shield className="h-4 w-4 shrink-0 text-gray-600" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{itemName(item, language)}</div>
                      <div className="text-[11px] text-gray-600">{item.type === 'weapon' ? `${item.damageDice || ''} ${dmgLabel(item.damageType, language)}`.trim() : acLabel(item, language)}</div>
                    </div>
                    <button type="button" onClick={() => toggleEquip(item)}
                      className={`rounded px-2 py-1 text-xs font-bold ${item.equipped ? 'bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-800'}`}>
                      {item.equipped ? tr.equipped : tr.equip}
                    </button>
                    <button type="button" onClick={() => sellItem(item)} title={tr.resellTitle} className="rounded p-1 text-gray-400 hover:bg-blood/10 hover:text-blood">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {ownedSac.length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-2">
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">{tr.packIncluded}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ownedSac.map(item => (
                      <span key={item.id} className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                        {itemName(item, language)}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
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
                <h3 className="text-lg font-bold">{tr.shop}</h3>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {([['simple', tr.simpleWeapons], ['martial', tr.martialWeapons], ['armor', tr.armors]] as const).map(([id, label]) => (
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
                          <div className="truncate text-sm font-bold">{language === 'fr' ? w.nameFr : w.name}</div>
                          <div className="text-[11px] text-gray-600">
                            {w.damage} {dmgLabel(w.damageType, language)}{w.versatile ? ` (${w.versatile} ${tr.twoHanded})` : ''}{w.range ? ` · ${w.range} m` : ''}
                            {w.properties.length ? ` · ${w.properties.map(p => language === 'fr' ? (WEAPON_PROP_FR[p] || p) : p).join(', ')}` : ''}
                          </div>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs text-yellow-800">{cost} {tr.gold}</span>
                        <button type="button" disabled={!afford} onClick={() => buyWeapon(w)}
                          className={`rounded px-2 py-1 text-xs font-bold ${afford ? 'bg-gold text-gray-900 hover:brightness-95' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                          {tr.buy}
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
                          <div className="truncate text-sm font-bold">{language === 'fr' ? a.nameFr : a.name}</div>
                          <div className="text-[11px] text-gray-600">
                            {a.armorType === 'shield' ? `+${a.acBonus} ${language === 'fr' ? 'CA' : 'AC'}` : `${language === 'fr' ? 'CA' : 'AC'} ${a.baseAC}${a.maxDexBonus !== undefined ? ` + DEX (max ${a.maxDexBonus})` : a.armorType === 'light' ? ' + DEX' : ''}`}
                            {' · '}{armorTypeLabel(a.armorType, language)}{a.stealthDisadvantage ? ` · ${tr.stealthDisadv}` : ''}
                          </div>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs text-yellow-800">{a.price} {tr.gold}</span>
                        <button type="button" disabled={!afford} onClick={() => buyArmor(a)}
                          className={`rounded px-2 py-1 text-xs font-bold ${afford ? 'bg-gold text-gray-900 hover:brightness-95' : 'cursor-not-allowed bg-gray-200 text-gray-400'}`}>
                          {tr.buy}
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
                <h2 className="text-2xl font-black uppercase tracking-wide">{tr.casterSetup}</h2>
                <p className="font-sans text-xs text-gray-600">
                  {casterConfig
                    ? tr.casterIntro(casterConfig.cantrips, casterConfig.spells, casterConfig.mode === 'prepared' ? tr.prepared : tr.known)
                    : tr.noCasterSetup}
                </p>
              </div>
            </div>

            {!casterConfig ? (
              <div className="rounded border border-gray-300 bg-parchment/60 p-4 font-serif text-sm text-gray-700">
                {tr.noCasterClass(dispClass(char.class, language))}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.castingAbility}</div>
                    <div className="mt-1 text-2xl font-black">{dispAbbr(casterConfig.ability, language)}</div>
                  </div>
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.focus}</div>
                    <input
                      value={char.spellcastingFocus || casterConfig.focus}
                      onChange={e => setChar(prev => ({ ...prev, spellcastingFocus: e.target.value }))}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-bold"
                    />
                  </div>
                  <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.spellSlots}</div>
                    <div className="mt-1 text-sm font-bold">{char.spellSlots ? (Object.entries(char.spellSlots) as [string, { current: number; max: number }][]).map(([slot, pool]) => `${language === 'fr' ? 'N' : 'L'}${slot}: ${pool.current}/${pool.max}`).join(', ') : tr.cantripsOnly}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-wide">{tr.cantrips}</h3>
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
                    <h3 className="text-lg font-black uppercase tracking-wide">{tr.level1Spells}</h3>
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
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{spell.castingTime} / {spell.range}{spell.concentration ? ` / ${tr.concentration}` : ''}</p>
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
              <h2 className="text-2xl font-black uppercase tracking-wide">{tr.heroBrief}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.identity}</div>
                <div className="mt-1 text-xl font-black">{char.name || tr.unnamedHero}</div>
                <p className="text-sm">{dispRace(char.race, language)} {dispClass(char.class, language)} / {char.background}</p>
                <p className="text-sm text-gray-600">{tr.deityColon} {char.deity || tr.none}</p>
              </div>
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.mechanics}</div>
                <p className="mt-1 text-sm">{language === 'fr' ? 'PV' : 'HP'} {char.hp.current}/{getEffectiveMaxHP(char)} / {language === 'fr' ? 'CA' : 'AC'} {char.ac} / d{CLASS_DATA[char.class]?.hitDie || 8}</p>
                <p className="text-sm">{tr.weapon} {char.weapon?.name || tr.unarmed} ({char.weapon?.damage || '1d4'})</p>
                <p className={pointsRemaining === 0 ? 'text-sm text-green-700' : 'text-sm text-blood'}>{tr.pointBuy} {pointsRemaining === 0 ? tr.complete : `${pointsRemaining} ${tr.remaining}`}</p>
              </div>
              <div className="rounded border border-gray-300 bg-parchment/60 p-3">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.cinematic}</div>
                <p className="mt-1 text-sm">{profile.cinematicStyle || 'dark fantasy cinematic'}</p>
                <p className={requiredNarrativeReady ? 'text-sm text-green-700' : 'text-sm text-blood'}>
                  {requiredNarrativeReady ? tr.readyForIntro : tr.appearanceDesireRequired}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {casterConfig && (
                <div className="md:col-span-2">
                  <h3 className="mb-1 text-sm font-black uppercase tracking-widest">{tr.magic}</h3>
                  <div className="grid grid-cols-1 gap-3 rounded border border-gray-200 bg-parchment/60 p-3 text-sm md:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{tr.cantrips}</div>
                      <p className={(char.cantrips || []).length ? 'font-serif' : 'font-serif text-blood'}>
                        {(char.cantrips || []).join(', ') || tr.chooseCantrips}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        {casterConfig.mode === 'prepared' ? tr.preparedSpells : tr.knownSpells}
                      </div>
                      <p className={selectedLevelOneSpells.length ? 'font-serif' : 'font-serif text-blood'}>
                        {selectedLevelOneSpells.join(', ') || tr.chooseLvl1}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-widest">{tr.appearance}</h3>
                <p className="min-h-16 rounded border border-gray-200 bg-parchment/60 p-3 font-serif text-sm">{profile.appearance || tr.appearanceMissing}</p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-black uppercase tracking-widest">{tr.coreDesire}</h3>
                <p className="min-h-16 rounded border border-gray-200 bg-parchment/60 p-3 font-serif text-sm">{profile.desire || tr.desireMissing}</p>
              </div>
            </div>

            {(profile.dmHooks || []).length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-black uppercase tracking-widest">{tr.dmHooks}</h3>
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
            <ChevronLeft className="h-5 w-5" /> {tr.back}
          </button>
          {activeStep !== 'review' ? (
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 font-fantasy text-xl text-white shadow-lg transition-colors hover:bg-gray-800"
            >
              {tr.continue} <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => onSave({ ...char, storyMode: pointMode === 'story' })}
              disabled={!canVenture}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blood px-4 py-4 font-fantasy text-2xl text-white shadow-lg transition-colors hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {!char.name ? (
                <>{tr.nameRequired}</>
              ) : pointsRemaining > 0 ? (
                <>{tr.spendPoints(pointsRemaining)}</>
              ) : !subclassReady ? (
                <>{tr.chooseYour(SUBCLASS_DATA[char.class]?.label || tr.archetype)}</>
              ) : !requiredNarrativeReady ? (
                <>{tr.addAppearanceDesire}</>
              ) : !casterReady ? (
                <>{tr.chooseStartingSpells}</>
              ) : (
                <><Swords className="w-6 h-6" /> {tr.toAdventure}</>
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
              <h2 className="text-2xl font-bold">{dispClass(char.class, language)}</h2>
              <button onClick={() => setShowClassDetails(false)} className="text-2xl hover:text-blood">&times;</button>
            </div>

            <p className="text-gray-600 mb-4">{CLASS_DATA[char.class].desc}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-xs text-gray-500 uppercase">{tr.hitDiceLabel}</div>
                <div className="text-xl font-bold text-blood">d{CLASS_DATA[char.class].hitDie}</div>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                <div className="text-xs text-gray-500 uppercase">{tr.primaryAbility}</div>
                <div className="text-lg font-bold">{CLASS_DATA[char.class].primaryAbility}</div>
              </div>
            </div>

            <div className="bg-gray-100 p-2 rounded mb-4">
              <div className="text-xs text-gray-500 uppercase">{tr.savingThrows}</div>
              <div className="font-bold">{CLASS_DATA[char.class].savingThrows.join(', ')}</div>
            </div>

            <div className="bg-gray-100 p-2 rounded mb-4">
              <div className="text-xs text-gray-500 uppercase">{tr.proficiencies}</div>
              <div className="text-sm">{CLASS_DATA[char.class].profs.join(', ')}</div>
            </div>

            {/* Features */}
            <h3 className="font-bold text-lg border-b border-gray-400 mb-2">{tr.classFeatures}</h3>
            <div className="space-y-2 mb-4">
              {CLASS_DATA[char.class].features.map((f, i) => (
                <div key={i} className="bg-white p-2 rounded border border-gray-300">
                  <div className="flex justify-between">
                    <span className="font-bold">{f.name}</span>
                    <span className="text-xs bg-blood text-white px-2 py-0.5 rounded">{tr.levelAbbr}. {f.level}</span>
                  </div>
                  <div className="text-sm text-gray-600">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* XP Thresholds */}
            <h3 className="font-bold text-lg border-b border-gray-400 mb-2">{tr.xpPerLevel}</h3>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                <div key={lvl} className="bg-gray-100 p-1 rounded text-center">
                  <span className="font-bold">{tr.levelAbbr} {lvl}:</span> {[0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000][lvl - 1]} XP
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
