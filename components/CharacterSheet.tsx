import React, { useState, useEffect } from 'react';
import { CharacterSheet, Ability, CharacterStoryProfile, SpellEntry, getBaseACFromArmor, getEffectiveStat,
    getEffectiveMaxHP, getRacialBonus, racialHPBonusPerLevel, DRACONIC_ANCESTRIES } from '../types';
import { Shield, Swords, Backpack, Plus, Minus, RefreshCw, UserRound, ScrollText, ChevronLeft, ChevronRight, CheckCircle2, WandSparkles, Trash2 } from 'lucide-react';

interface Props {
  initialChar?: CharacterSheet;
  onSave: (char: CharacterSheet) => void;
  readOnly?: boolean;
}

import { MARTIAL_CLASSES, RACE_DATA, RACES, BACKGROUNDS, FIGHTING_STYLES, DEITIES, CLASS_DATA, BASE_STAT, MAX_POINTS, getWeaponFromInventory, DEFAULT_CHAR } from '../data';
import { CLASS_SKILLS, CLASS_EXPERTISE, ALL_SKILLS } from '../data/classes';
import { dispClass, dispRace, dispStyle, dispBackground, dispProf, styleDesc } from '../data/labels';
import { CLASS_ART, RACE_ART, BACKGROUND_ART, STYLE_ART } from '../theme/art';
import { T, DISP, BODY, onTint, hardShadow } from '../theme/tokens';
import {
    SHEET_CSS, Panneau, Titre, CartePortrait, CartePaysage, CarteTexte,
    Pastille, Etiquette, Etiqueter, Champ, Ligne, Liste, Compteur, Cartouche, Grille,
} from './neon/SheetKit';
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
    steps: 'Creation steps', vitals: 'Vitals',
    fullClassSheet: 'Full class sheet', closeSheet: 'Close',
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
    steps: 'Étapes de création', vitals: 'Constantes',
    fullClassSheet: 'Fiche complète', closeSheet: 'Fermer',
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
// `primaryAbility` arrive déjà à moitié traduit dans les données (« STR ou DEX ») :
// seules les abréviations restent anglaises, on les remplace sur place.
const dispAbilityExpr = (expr: string, lang: 'en' | 'fr') =>
  expr.replace(/\b(STR|DEX|CON|INT|WIS|CHA)\b/g, m => dispAbbr(m, lang));

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

// Display-only French labels: moved to data/labels.ts so the refreshed menu
// screens read the SAME table. Keys stay English (they travel in saves).
// Subrace keys are already French, hence dispRace's passthrough.

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

// Suggestions d'Ideal / Lien / Defaut liees a l'historique : un clic remplit le
// champ. Elles sont tronquees a l'affichage mais le `title` porte le texte
// entier — sans lui, trois suggestions se ressembleraient toutes.
const IbfChips: React.FC<{ items?: string[]; onPick: (v: string) => void }> = ({ items, onPick }) => {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
      {items.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          title={s}
          className="nk-chip"
          style={{
            maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: 10, fontWeight: 400, padding: '4px 8px',
            background: 'transparent', color: 'rgba(237,230,216,.7)',
            borderColor: 'rgba(237,230,216,.28)',
          }}
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

  useEffect(() => {
    if (!showClassDetails) return;
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowClassDetails(false); };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [showClassDetails]);

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
    <div style={{ maxWidth: 1180, margin: '0 auto', fontFamily: BODY, color: T.paper }}>
      <style>{SHEET_CSS}</style>

      {/* ─── Le fil des six étapes ───────────────────────────────────────────
          Toutes les étapes restent cliquables : la fiche n'est pas un tunnel,
          et un joueur qui veut changer sa classe après avoir acheté son épée
          ne doit pas avoir à tout recommencer. */}
      {!readOnly && (
        <div style={{ marginBottom: 22 }}>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label={tr.steps}>
            {CREATION_STEPS.map((step, index) => {
              const actif = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  className="nk-step"
                  onClick={() => setActiveStep(step.id)}
                  aria-current={actif ? 'step' : undefined}
                  style={{
                    background: actif ? T.acid : T.violet,
                    color: actif ? onTint(T.acid) : 'rgba(237,230,216,.72)',
                    boxShadow: actif ? hardShadow(T.ink, 7) : '3px 3px 0 rgba(5,0,26,.5)',
                  }}
                >
                  <span style={{
                    display: 'inline-flex', width: 20, height: 20, flex: 'none',
                    alignItems: 'center', justifyContent: 'center',
                    background: actif ? T.ink : 'rgba(237,230,216,.14)',
                    color: actif ? T.acid : 'inherit', fontSize: 10,
                  }}>{index + 1}</span>
                  {step.icon}
                  {STEP_LABELS[language][step.id]}
                </button>
              );
            })}
          </nav>
          <p style={{ margin: '10px 2px 0', fontSize: 12.5, lineHeight: 1.5, color: 'rgba(237,230,216,.6)' }}>
            {tr.builderHint}
          </p>
        </div>
      )}

      {/* ─── En-tête compacte (fiche en lecture seule) ─── */}
      {readOnly && (
        <Panneau accent={T.pink} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 240px' }}>
              <Etiqueter>{tr.name}</Etiqueter>
              <h1 style={{ fontFamily: DISP, fontSize: 'clamp(24px, 4vw, 38px)', margin: 0, color: T.acid }}>{char.name}</h1>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              {[
                [tr.class, dispClass(char.class, language)],
                [tr.race, dispRace(char.race, language)],
                [tr.background, dispBackground(char.background, language)],
                ...(MARTIAL_CLASSES.includes(char.class) ? [[tr.style, dispStyle(char.fightingStyle, language)]] : []),
                [tr.deity, char.deity || tr.none],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <Etiqueter>{k}</Etiqueter>
                  <div style={{ fontFamily: DISP, fontSize: 13 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Panneau>
      )}

      {/* ─── Étape IDENTITÉ ──────────────────────────────────────────────────
          L'ordre est celui de la décision, pas celui de la fiche : le nom, puis
          les deux choix qui portent le personnage (classe, race), puis ceux qui
          le situent (historique, style, divinité). */}
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
        const selRace = RACE_DATA[char.race];
        const selClass = CLASS_DATA[char.class];

        return (
          <div style={{ display: 'grid', gap: 22 }}>

            {/* Le nom. Premier champ de l'écran, et le seul qui mérite d'être
                grand : c'est la seule chose ici que le joueur invente. */}
            <Panneau accent={T.magenta}>
              <Etiqueter>{tr.characterName}</Etiqueter>
              <input
                value={char.name}
                onChange={e => setChar({ ...char, name: e.target.value })}
                placeholder={tr.namePlaceholder}
                maxLength={40}
                className="nk-field"
                style={{ fontFamily: DISP, fontSize: 'clamp(19px, 3.4vw, 30px)', padding: '15px 17px' }}
              />
            </Panneau>

            {/* Race + sous-race */}
            <Panneau accent={T.emerald}>
              <Titre accent={T.emerald} note={tr.raceHint.replace(/^—\s*/, '')}>{tr.race}</Titre>
              <Grille min={168}>
                {baseRaces.map(r => {
                  const d = RACE_DATA[r];
                  return (
                    <CartePortrait
                      key={r}
                      slug={RACE_ART[r]?.slug || 'races/human'}
                      tint={RACE_ART[r]?.tint || T.azure}
                      nom={dispRace(r, language)}
                      note={raceASI(r) || '—'}
                      desc={d.desc}
                      choisi={selectedBase === r}
                      onPick={() => pickBaseRace(r)}
                    />
                  );
                })}
              </Grille>

              {subraces.length > 0 && (
                <div style={{ marginTop: 18, borderTop: `3px dashed ${T.emerald}`, paddingTop: 16 }}>
                  <Titre accent={T.emerald} taille={13} note={tr.mandatory.replace(/^—\s*/, '')}>
                    {tr.subraceOf(dispRace(selectedBase, language))}
                  </Titre>
                  <Grille min={220}>
                    {subraces.map(s => (
                      <CarteTexte
                        key={s}
                        nom={s}
                        note={raceASI(s) || '—'}
                        desc={RACE_DATA[s].desc}
                        accent={T.emerald}
                        choisi={char.race === s}
                        onPick={() => handleRaceChange(s)}
                      />
                    ))}
                  </Grille>
                </div>
              )}

              {/* Ascendance draconique — drakéide seul. Fixe le type du souffle
                  et la résistance associée. */}
              {char.race === 'Dragonborn' && (
                <div style={{ marginTop: 18, borderTop: `3px dashed ${T.acid}`, paddingTop: 16 }}>
                  <Titre accent={T.acid} taille={13} note={`${tr.mandatory} ${tr.ancestryHint}`.replace(/—\s*/g, '')}>
                    {tr.draconicAncestry}
                  </Titre>
                  <Grille min={140}>
                    {DRACONIC_ANCESTRIES.map(a => (
                      <CarteTexte
                        key={a.id}
                        nom={language === 'fr' ? a.fr : a.en}
                        note={tr.dmgType[a.type] || a.type}
                        accent={T.acid}
                        choisi={char.draconicAncestry === a.id}
                        onPick={() => handleAncestryPick(a.id)}
                      />
                    ))}
                  </Grille>
                </div>
              )}

              {selRace && (
                <div style={{ marginTop: 18, background: T.ink, border: `3px solid rgba(237,230,216,.16)`, padding: '13px 15px' }}>
                  <Etiqueter note={tr.traits}>{dispRace(char.race, language)}</Etiqueter>
                  <ul style={{ margin: 0, paddingLeft: 19, display: 'grid', gap: 4, fontSize: 12, lineHeight: 1.45, color: 'rgba(237,230,216,.78)' }}>
                    {selRace.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 11 }}>
                    {selRace.profs.length > 0 && <Etiquette couleur={T.cyan}>{tr.proficienciesLabel} {selRace.profs.join(', ')}</Etiquette>}
                    {selRace.resistances?.length ? <Etiquette couleur={T.pink}>{tr.resistancesLabel} {selRace.resistances.join(', ')}</Etiquette> : null}
                    {selRace.darkvision ? <Etiquette couleur={T.purple}>{tr.darkvision}</Etiquette> : null}
                  </div>
                </div>
              )}
            </Panneau>

            {/* Classe */}
            <Panneau accent={T.azure}>
              <Titre note={tr.classHint.replace(/^—\s*/, '')}>{tr.class}</Titre>
              <Grille min={168}>
                {Object.entries(CLASS_DATA).map(([c, d]) => (
                  <CartePortrait
                    key={c}
                    slug={CLASS_ART[c]?.slug || 'classes/fighter'}
                    tint={CLASS_ART[c]?.tint || T.azure}
                    nom={dispClass(c, language)}
                    note={`d${d.hitDie} · ${d.savingThrows.map(s => dispAbbr(s, language)).join('/')}`}
                    desc={d.desc}
                    choisi={char.class === c}
                    onPick={() => handleClassChange(c)}
                  />
                ))}
              </Grille>

              {/* Archétype de niveau 1 (Domaine du Clerc, Patron de l'Occultiste,
                  Origine de l'Ensorceleur) — obligatoire à la création, même
                  motif que la sous-race. Les autres classes choisissent au
                  niveau 2-3 via le level-up. */}
              {SUBCLASS_DATA[char.class]?.level === 1 && (
                <div style={{ marginTop: 18, borderTop: `3px dashed ${T.purple}`, paddingTop: 16 }}>
                  <Titre accent={T.purple} taille={13} note={tr.mandatoryLvl1.replace(/^—\s*/, '')}>
                    {SUBCLASS_DATA[char.class].label}
                  </Titre>
                  <Grille min={220}>
                    {SUBCLASS_DATA[char.class].options.map(o => (
                      <CarteTexte
                        key={o.id}
                        nom={o.name}
                        desc={o.description}
                        accent={T.purple}
                        choisi={char.subclass === o.name}
                        onPick={() => handleSubclassPick(o.name)}
                      />
                    ))}
                  </Grille>
                  {char.subclass && (
                    <ul style={{ margin: '12px 0 0', paddingLeft: 20, display: 'grid', gap: 4, fontSize: 12, color: 'rgba(237,230,216,.78)' }}>
                      {getSubclassFeaturesForLevel(char.class, char.subclass, 1).map((f, i) => (
                        <li key={i}><b style={{ color: T.purple }}>{f.name}</b> — {f.description}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {selClass && (
                <div style={{ marginTop: 18, background: T.ink, border: `3px solid rgba(237,230,216,.16)`, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <Etiqueter note={tr.startingAbilities}>{dispClass(char.class, language)}</Etiqueter>
                    <Pastille couleur={T.acid} onClick={() => setShowClassDetails(true)}>
                      {tr.fullClassSheet} →
                    </Pastille>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 19, display: 'grid', gap: 5, fontSize: 12, lineHeight: 1.45, color: 'rgba(237,230,216,.78)' }}>
                    {selClass.features.filter(f => f.level <= 3).map((f, i) => (
                      <li key={i}>
                        <b style={{ color: T.cyan }}>{f.name}</b>{' '}
                        <span style={{ opacity: .5 }}>({tr.lvl} {f.level})</span> — {f.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panneau>

            {/* Historique — cartes paysage : un décor, pas un personnage. */}
            <Panneau accent={T.acid}>
              <Titre accent={T.acid} note={tr.bgHint.replace(/^—\s*/, '')}>{tr.background}</Titre>
              <Grille min={252}>
                {Object.entries(BACKGROUNDS).map(([b, d]) => (
                  <CartePaysage
                    key={b}
                    slug={BACKGROUND_ART[b]?.slug || 'backgrounds/acolyte'}
                    tint={BACKGROUND_ART[b]?.tint || T.acid}
                    nom={dispBackground(b, language)}
                    desc={d.desc}
                    choisi={char.background === b}
                    onPick={() => handleBackgroundChange(b)}
                    enfants={
                      <span style={{ display: 'block', marginTop: 5, fontSize: 10.5, lineHeight: 1.4, opacity: .72 }}>
                        <b>{tr.skillsAbbr}</b> {d.profs.map(p => language === 'fr' ? (SKILL_FR[p] || p) : p).join(', ')}
                        <br /><b>{d.feature.name} :</b> {d.feature.description}
                      </span>
                    }
                  />
                ))}
              </Grille>
            </Panneau>

            {/* Style de combat — martial seulement. Un geste, pas une identité :
                d'où la paire de mains cadrée serré sur chaque planche. */}
            {MARTIAL_CLASSES.includes(char.class) && (
              <Panneau accent={T.pink}>
                <Titre accent={T.pink} note={tr.mandatoryLvl1.replace(/^—\s*/, '')}>{tr.fightingStyle}</Titre>
                <Grille min={252}>
                  {FIGHTING_STYLES.map(s => (
                    <CartePaysage
                      key={s.name}
                      slug={STYLE_ART[s.name]?.slug || 'styles/dueling'}
                      tint={STYLE_ART[s.name]?.tint || T.pink}
                      nom={dispStyle(s.name, language)}
                      desc={styleDesc(s.name, s.desc, language)}
                      choisi={char.fightingStyle === s.name}
                      onPick={() => handleFightingStyleChange(s.name)}
                    />
                  ))}
                </Grille>
              </Panneau>
            )}

            {/* Divinité */}
            <Panneau accent={T.purple}>
              <Titre accent={T.purple} note={tr.deityHint.replace(/^—\s*/, '')}>{tr.deity}</Titre>
              <Liste value={char.deity || 'Aucune'} onChange={e => setChar({ ...char, deity: e.target.value })}>
                {DEITIES.map(d => (
                  <option key={d.name} value={d.name} style={{ background: T.ink, color: T.paper }}>
                    {d.name}{d.alignment !== '-' ? ` (${d.alignment})` : ''}
                  </option>
                ))}
              </Liste>
              {char.deity && DEITIES.find(d => d.name === char.deity)?.desc && (
                <p style={{ margin: '11px 0 0', fontSize: 12, lineHeight: 1.5, color: 'rgba(237,230,216,.65)' }}>
                  {DEITIES.find(d => d.name === char.deity)?.desc}
                </p>
              )}
            </Panneau>
          </div>
        );
      })()}

      {/* ─── Étape HISTOIRE ─────────────────────────────────────────────────
          Ces champs ne décorent pas la fiche : ils partent tels quels au MJ,
          qui écrit l'ouverture de campagne avec. D'où l'astérisque sur les deux
          seuls qui bloquent le départ. */}
      {!readOnly && activeStep === 'story' && (
        <div style={{ display: 'grid', gap: 22 }}>
          <Panneau accent={T.magenta}>
            <Titre accent={T.magenta} note={tr.bibleHint}>{tr.characterBible}</Titre>

            <div style={{ marginBottom: 18 }}>
              <Etiqueter note={tr.quickArchetypeHint}>{tr.quickArchetype}</Etiqueter>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {ARCHETYPES.map(a => (
                  <Pastille key={a.nameEn} couleur={T.magenta} onClick={() => updateProfile(language === 'fr' ? a.profileFr : a.profileEn)}>
                    {language === 'fr' ? a.nameFr : a.nameEn}
                  </Pastille>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 15, gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
              {([
                { cle: 'appearance', libelle: `${tr.appearance} *`, ph: tr.appearancePh, max: 360, h: 92 },
                { cle: 'desire', libelle: `${tr.desire} *`, ph: tr.desirePh, max: 320, h: 92 },
                { cle: 'personality', libelle: tr.personality, ph: tr.personalityPh, max: 280, h: 78 },
                { cle: 'fear', libelle: tr.fearWeakness, ph: tr.fearPh, max: 280, h: 78 },
                { cle: 'bond', libelle: tr.bondLien, ph: tr.bondPh, max: 280, h: 78, chips: BACKGROUNDS[char.background]?.bonds },
                { cle: 'wound', libelle: tr.woundRegret, ph: tr.woundPh, max: 280, h: 78 },
              ] as const).map(f => (
                <label key={f.cle} style={{ display: 'block' }}>
                  <Etiqueter>{f.libelle}</Etiqueter>
                  <Champ
                    value={(profile as Record<string, string | undefined>)[f.cle] || ''}
                    onChange={e => updateProfile({ [f.cle]: e.target.value })}
                    placeholder={f.ph}
                    maxLength={f.max}
                    style={{ height: f.h }}
                  />
                  {'chips' in f && <IbfChips items={f.chips} onPick={v => updateProfile({ bond: v })} />}
                </label>
              ))}

              <label style={{ display: 'block', gridColumn: '1 / -1' }}>
                <Etiqueter note={tr.secretHint}>{tr.secret}</Etiqueter>
                <Champ
                  value={profile.secret || ''}
                  onChange={e => updateProfile({ secret: e.target.value })}
                  placeholder={tr.secretPh}
                  maxLength={280}
                  style={{ height: 78 }}
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
          </Panneau>

          <div style={{ display: 'grid', gap: 22, alignItems: 'start', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' }}>
            <Panneau accent={T.cyan}>
              <Titre accent={T.cyan} taille={14}>{tr.backstory}</Titre>
              <Champ
                value={char.customBackground || ''}
                onChange={e => setChar({ ...char, customBackground: e.target.value, backstory: e.target.value })}
                placeholder={tr.backstoryPh}
                maxLength={700}
                style={{ height: 128 }}
              />
              <div style={{ textAlign: 'right', marginTop: 5, fontSize: 10.5, color: 'rgba(237,230,216,.45)' }}>
                {(char.customBackground || '').length}/700
              </div>
            </Panneau>

            <Panneau accent={T.acid}>
              <Titre accent={T.acid} taille={14}>{tr.dmHooks}</Titre>
              <Champ
                value={storyHookText}
                onChange={e => updateHooks(e.target.value)}
                placeholder={tr.dmHooksPh}
                maxLength={500}
                style={{ height: 128 }}
              />
              <div style={{ display: 'grid', gap: 13, marginTop: 13, gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
                <label style={{ display: 'block' }}>
                  <Etiqueter>{tr.ideal}</Etiqueter>
                  <Ligne value={profile.ideal || ''} onChange={e => updateProfile({ ideal: e.target.value })} placeholder={tr.idealPh} />
                  <IbfChips items={BACKGROUNDS[char.background]?.ideals} onPick={v => updateProfile({ ideal: v })} />
                </label>
                <label style={{ display: 'block' }}>
                  <Etiqueter>{tr.flaw}</Etiqueter>
                  <Ligne value={profile.flaw || ''} onChange={e => updateProfile({ flaw: e.target.value })} placeholder={tr.flawPh} />
                  <IbfChips items={BACKGROUNDS[char.background]?.flaws} onPick={v => updateProfile({ flaw: v })} />
                </label>
              </div>
            </Panneau>
          </div>

          <Panneau accent={T.purple}>
            <Titre accent={T.purple} taille={14}>{tr.cinematicTone}</Titre>
            <Liste
              value={profile.cinematicStyle || 'dark fantasy cinematic'}
              onChange={e => updateProfile({ cinematicStyle: e.target.value })}
            >
              {CINEMATIC_STYLES.map(style => (
                <option key={style} value={style} style={{ background: T.ink, color: T.paper }}>{style}</option>
              ))}
            </Liste>
          </Panneau>
        </div>
      )}

      {/* ─── Étape BUILD ────────────────────────────────────────────────────── */}
      {(readOnly || activeStep === 'build') && (
        <div style={{ display: 'grid', gap: 22 }}>
          <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>

            {/* Caractéristiques */}
            <Panneau accent={T.acid}>
              <Titre accent={T.acid}>{tr.abilityScores}</Titre>

              {!readOnly && (
                <>
                  {/* Difficulté : Normal (27, standard 5e) ou Histoire (37, généreux). */}
                  <Etiqueter>{tr.pointMode}</Etiqueter>
                  <Grille min={128} gap={9} style={{ marginBottom: 14 }}>
                    {([
                      { id: 'normal' as const, label: tr.modeNormal, hint: tr.modeNormalHint },
                      { id: 'story' as const, label: tr.modeStory, hint: tr.modeStoryHint },
                    ]).map(m => (
                      <CarteTexte
                        key={m.id}
                        nom={m.label}
                        desc={m.hint}
                        accent={T.acid}
                        choisi={pointMode === m.id}
                        onPick={() => setPointMode(m.id)}
                      />
                    ))}
                  </Grille>

                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Compteur
                      valeur={pointsRemaining}
                      libelle={`${tr.pointsRemaining} / ${maxPoints}`}
                      depasse={pointsRemaining < 0}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gap: 9 }}>
                {(Object.keys(char.stats) as Ability[]).map(stat => {
                  const val = char.stats[stat];
                  const racialBonus = getRacialBonus(char.race, stat);
                  const effectiveVal = val + racialBonus;
                  const mod = getMod(effectiveVal);
                  const increaseCost = pointBuyCost(val + 1) - pointBuyCost(val);
                  return (
                    <div key={stat} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9,
                      background: T.ink, border: `3px solid rgba(237,230,216,.16)`, padding: '9px 11px',
                    }}>
                      <span style={{ fontFamily: DISP, fontSize: 13, width: 38, color: T.cyan }}>{dispAbbr(stat, language)}</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!readOnly && (
                          <button
                            type="button" className="nk-tick" onClick={() => handleStatChange(stat, -1)}
                            disabled={val <= 8} aria-label={`${dispAbbr(stat, language)} −1`}
                            style={{ opacity: val <= 8 ? .25 : 1, display: 'grid', placeItems: 'center', width: 26, height: 26, border: `2px solid ${T.paper}` }}
                          ><Minus className="w-3.5 h-3.5" /></button>
                        )}
                        <span style={{ width: 52, textAlign: 'center' }}>
                          <span style={{ fontFamily: DISP, fontSize: 20, display: 'block', lineHeight: 1.1 }}>{effectiveVal}</span>
                          {racialBonus !== 0 && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: T.emerald }}>{tr.base} {val} +{racialBonus}</span>
                          )}
                        </span>
                        {!readOnly && (
                          <button
                            type="button" className="nk-tick" onClick={() => handleStatChange(stat, 1)}
                            disabled={val >= 15 || pointsRemaining < increaseCost} aria-label={`${dispAbbr(stat, language)} +1`}
                            style={{ opacity: (val >= 15 || pointsRemaining < increaseCost) ? .25 : 1, display: 'grid', placeItems: 'center', width: 26, height: 26, border: `2px solid ${T.paper}` }}
                          ><Plus className="w-3.5 h-3.5" /></button>
                        )}
                      </span>

                      <span style={{
                        display: 'grid', placeItems: 'center', width: 38, height: 38, flex: 'none',
                        background: T.acid, color: onTint(T.acid), fontFamily: DISP, fontSize: 13,
                      }}>{mod > 0 ? '+' : ''}{mod}</span>
                    </div>
                  );
                })}
              </div>
            </Panneau>

            {/* Constantes vitales + inventaire */}
            <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
              <Panneau accent={T.pink}>
                <Titre accent={T.pink}>{tr.vitals}</Titre>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11 }}>
                  <Cartouche titre={tr.armorClass} valeur={char.ac} note={tr.acTooltip} accent={T.cyan} />
                  <Cartouche titre={tr.hitPoints} valeur={`${char.hp.current}/${getEffectiveMaxHP(char)}`} accent={T.pink} />
                  <Cartouche titre={tr.hitDie} valeur={`d${CLASS_DATA[char.class]?.hitDie || 8}`} accent={T.acid} />
                </div>
              </Panneau>

              <Panneau accent={T.cyan}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <Titre accent={T.cyan}>{tr.startingEquipment}</Titre>
                  {!readOnly && (
                    <Pastille onClick={() => handleClassChange(char.class)}>
                      <RefreshCw className="inline w-3 h-3" /> {tr.resetKit}
                    </Pastille>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'rgba(237,230,216,.5)' }}>
                        <th style={{ padding: '0 0 7px', fontFamily: DISP, fontSize: 10, fontWeight: 400 }}>{tr.item}</th>
                        <th style={{ padding: '0 0 7px', fontFamily: DISP, fontSize: 10, fontWeight: 400 }}>{tr.qty}</th>
                        <th style={{ padding: '0 0 7px', fontFamily: DISP, fontSize: 10, fontWeight: 400 }}>{tr.wgt}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(char.inventory || []).map((item, idx) => (
                        // Clé tirée de l'identité de l'objet, pas de l'index : l'inventaire
                        // est muté (achat/vente/perte) et un index se réconcilie mal.
                        <tr key={(item as { id?: string }).id || item.name || idx} style={{ borderTop: `1px solid rgba(237,230,216,.14)` }}>
                          <td style={{ padding: '7px 0', fontWeight: 700 }}>{itemName(item, language)}</td>
                          <td style={{ padding: '7px 0', opacity: .7 }}>×{item.quantity}</td>
                          <td style={{ padding: '7px 0', opacity: .7 }}>{item.weight} lb</td>
                        </tr>
                      ))}
                      {(char.inventory || []).length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '18px 0', textAlign: 'center', color: 'rgba(237,230,216,.4)' }}>{tr.noEquipment}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panneau>
            </div>
          </div>

          {/* Compétences */}
          <Panneau accent={T.emerald}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <Titre accent={T.emerald}>{tr.skills}</Titre>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {classSkillData && !readOnly && (
                  <Compteur
                    valeur={classSkillPicks.length}
                    sur={classSkillData.choices}
                    libelle={`${tr.atChoice} (${dispClass(char.class, language)})`}
                  />
                )}
                <Etiquette couleur={T.cyan}>{tr.passivePerception} : {passive}</Etiquette>
              </div>
            </div>
            {expertiseMax > 0 && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(237,230,216,.62)' }}>
                {tr.expertiseHint((char.expertise || []).length, expertiseMax)}
              </p>
            )}
            <Grille min={218} gap={8}>
              {ALL_SKILLS.map(skill => {
                const abil = SKILL_ABILITIES[skill];
                const prof = isProficientIn(skill);
                const expert = hasExpertiseIn(skill);
                const inClassList = !!classSkillData?.list.includes(skill);
                const isPick = classSkillPicks.includes(skill);
                const grantedFree = prof && !isPick; // background/race — verrouillé
                const canToggle = !readOnly && inClassList && !grantedFree && (isPick || classSkillPicks.length < (classSkillData?.choices || 0));
                const mod = getCheckModifier({ effectiveStats: effStats, level: char.level, skill, proficiencies: char.proficiencies || [], expertise: char.expertise || [] }).modifier;
                return (
                  <div key={skill} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    background: prof ? 'rgba(4,183,125,.14)' : T.ink,
                    border: `2px solid ${prof ? T.emerald : 'rgba(237,230,216,.16)'}`,
                  }}>
                    <button
                      type="button" className="nk-tick" disabled={!canToggle} onClick={() => toggleClassSkill(skill)}
                      title={grantedFree ? tr.grantedByBgRace : inClassList ? tr.classSkillChoice : tr.outOfClassList}
                      aria-pressed={prof}
                      style={{
                        display: 'grid', placeItems: 'center', width: 19, height: 19, flex: 'none',
                        background: prof ? T.emerald : 'transparent',
                        color: prof ? onTint(T.emerald) : 'inherit',
                        border: `2px solid ${prof ? T.emerald : canToggle ? 'rgba(237,230,216,.5)' : 'rgba(237,230,216,.2)'}`,
                        opacity: !canToggle && !prof ? .45 : 1,
                      }}
                    >{prof && <CheckCircle2 className="h-3 w-3" />}</button>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {language === 'fr' ? (SKILL_FR[skill] || skill) : skill}{' '}
                      <span style={{ fontSize: 10, opacity: .5 }}>({dispAbbr(abil, language)})</span>
                    </span>
                    {expertiseMax > 0 && prof && (
                      <button
                        type="button" className="nk-tick" onClick={() => toggleExpertise(skill)} title={tr.expertiseTitle}
                        aria-pressed={expert}
                        style={{ fontSize: 15, lineHeight: 1, color: expert ? T.acid : 'rgba(237,230,216,.28)' }}
                      >★</button>
                    )}
                    <span style={{ width: 28, textAlign: 'right', fontFamily: DISP, fontSize: 11 }}>
                      {mod >= 0 ? '+' : ''}{mod}
                    </span>
                  </div>
                );
              })}
            </Grille>
          </Panneau>
        </div>
      )}

      {/* ─── Étape ÉQUIPEMENT ───────────────────────────────────────────────── */}
      {!readOnly && activeStep === 'gear' && (() => {
        const gold = char.gold || 0;
        const owned = char.inventory.filter(i => !i.hidden);
        const ownedGear = owned.filter(i => i.type === 'weapon' || i.type === 'armor');
        const ownedSac = owned.filter(i => i.type !== 'weapon' && i.type !== 'armor');
        const shopWeapons = Object.values(WEAPON_TABLE).filter(w =>
          shopTab === 'simple' ? w.category.startsWith('simple') : shopTab === 'martial' ? w.category.startsWith('martial') : false);

        /** Ligne de boutique — arme ou armure, même gabarit. */
        const LigneAchat = ({ icone, nom, detail, prix, abordable, onAchat }: {
          icone: React.ReactNode; nom: string; detail: string; prix: number; abordable: boolean; onAchat: () => void;
        }) => (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
            background: T.ink, border: `2px solid rgba(237,230,216,.16)`,
          }}>
            <span style={{ flex: 'none', color: 'rgba(237,230,216,.5)' }}>{icone}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: DISP, fontSize: 11 }}>{nom}</span>
              <span style={{ display: 'block', fontSize: 10.5, lineHeight: 1.35, opacity: .62 }}>{detail}</span>
            </span>
            <span style={{ fontFamily: DISP, fontSize: 10, color: T.acid, whiteSpace: 'nowrap' }}>{prix} {tr.gold}</span>
            <button
              type="button" className="nk-chip" disabled={!abordable} onClick={onAchat}
              style={{
                background: abordable ? T.acid : 'transparent',
                color: abordable ? onTint(T.acid) : 'rgba(237,230,216,.35)',
                borderColor: abordable ? T.ink : 'rgba(237,230,216,.2)',
                cursor: abordable ? 'pointer' : 'not-allowed',
              }}
            >{tr.buy}</button>
          </div>
        );

        return (
          <div style={{ display: 'grid', gap: 22 }}>
            <Panneau accent={T.acid}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Titre accent={T.acid}>{tr.gearTitle}</Titre>
                <Compteur valeur={gold} libelle={tr.gold} />
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'rgba(237,230,216,.7)' }}>
                {tr.gearIntro1} <b>{tr.gearIntroPack}</b> {tr.gearIntro2} <b>{tr.gearIntroFree}</b>{tr.gearIntro3} <b>{tr.gearIntroDefaultKit}</b> {tr.gearIntro4} <b>{tr.gearIntroBuy}</b>, <b>{tr.gearIntroSell}</b> {language === 'fr' ? 'et' : 'and'} <b>{tr.gearIntroEquip}</b> {tr.gearIntro5}
              </p>
            </Panneau>

            <Panneau accent={T.emerald}>
              <Titre accent={T.emerald}>{tr.yourEquipment}</Titre>
              {ownedGear.length === 0 && (
                <p style={{ margin: 0, fontSize: 12.5, fontStyle: 'italic', color: 'rgba(237,230,216,.5)' }}>{tr.nothingEquippable}</p>
              )}
              <Grille min={266} gap={9}>
                {ownedGear.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
                    background: T.ink,
                    border: `2px solid ${item.equipped ? T.emerald : 'rgba(237,230,216,.16)'}`,
                  }}>
                    <span style={{ flex: 'none', color: 'rgba(237,230,216,.5)' }}>
                      {item.type === 'weapon' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: DISP, fontSize: 11, lineHeight: 1.3 }}>
                        {itemName(item, language)}
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, opacity: .62 }}>
                        {item.type === 'weapon' ? `${item.damageDice || ''} ${dmgLabel(item.damageType, language)}`.trim() : acLabel(item, language)}
                      </span>
                    </span>
                    <Pastille couleur={T.emerald} actif={item.equipped} onClick={() => toggleEquip(item)}>
                      {item.equipped ? tr.equipped : tr.equip}
                    </Pastille>
                    <button
                      type="button" className="nk-tick" onClick={() => sellItem(item)} title={tr.resellTitle}
                      aria-label={tr.resellTitle}
                      style={{ color: 'rgba(237,230,216,.4)', display: 'grid', placeItems: 'center' }}
                    ><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </Grille>
              {ownedSac.length > 0 && (
                <div style={{ marginTop: 15, borderTop: `2px solid rgba(237,230,216,.14)`, paddingTop: 12 }}>
                  <Etiqueter>{tr.packIncluded}</Etiqueter>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ownedSac.map(item => (
                      <Etiquette key={item.id}>{itemName(item, language)}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</Etiquette>
                    ))}
                  </div>
                </div>
              )}
            </Panneau>

            <Panneau accent={T.magenta}>
              <Titre accent={T.magenta}>{tr.shop}</Titre>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                {([['simple', tr.simpleWeapons], ['martial', tr.martialWeapons], ['armor', tr.armors]] as const).map(([id, label]) => (
                  <Pastille key={id} couleur={T.magenta} actif={shopTab === id} onClick={() => setShopTab(id)}>{label}</Pastille>
                ))}
              </div>

              <Grille min={296} gap={9}>
                {shopTab !== 'armor'
                  ? shopWeapons.map(w => {
                    const cost = parsePriceToGp(w.price);
                    return (
                      <LigneAchat
                        key={w.name}
                        icone={<Swords className="h-4 w-4" />}
                        nom={language === 'fr' ? w.nameFr : w.name}
                        detail={`${w.damage} ${dmgLabel(w.damageType, language)}${w.versatile ? ` (${w.versatile} ${tr.twoHanded})` : ''}${w.range ? ` · ${w.range} m` : ''}${w.properties.length ? ` · ${w.properties.map(p => language === 'fr' ? (WEAPON_PROP_FR[p] || p) : p).join(', ')}` : ''}`}
                        prix={cost}
                        abordable={gold >= cost}
                        onAchat={() => buyWeapon(w)}
                      />
                    );
                  })
                  : ARMOR_CATALOG.map(a => (
                    <LigneAchat
                      key={a.key}
                      icone={<Shield className="h-4 w-4" />}
                      nom={language === 'fr' ? a.nameFr : a.name}
                      detail={`${a.armorType === 'shield' ? `+${a.acBonus} ${language === 'fr' ? 'CA' : 'AC'}` : `${language === 'fr' ? 'CA' : 'AC'} ${a.baseAC}${a.maxDexBonus !== undefined ? ` + DEX (max ${a.maxDexBonus})` : a.armorType === 'light' ? ' + DEX' : ''}`} · ${armorTypeLabel(a.armorType, language)}${a.stealthDisadvantage ? ` · ${tr.stealthDisadv}` : ''}`}
                      prix={a.price}
                      abordable={gold >= a.price}
                      onAchat={() => buyArmor(a)}
                    />
                  ))}
              </Grille>
            </Panneau>
          </div>
        );
      })()}

      {/* ─── Étape SORTS ────────────────────────────────────────────────────── */}
      {!readOnly && activeStep === 'spells' && (
        <div style={{ display: 'grid', gap: 22 }}>
          <Panneau accent={T.purple}>
            <Titre accent={T.purple} note={casterConfig
              ? tr.casterIntro(casterConfig.cantrips, casterConfig.spells, casterConfig.mode === 'prepared' ? tr.prepared : tr.known)
              : tr.noCasterSetup}>
              {tr.casterSetup}
            </Titre>

            {!casterConfig ? (
              <p style={{ margin: 0, padding: '15px 16px', background: T.ink, border: `3px solid rgba(237,230,216,.16)`, fontSize: 13, lineHeight: 1.55 }}>
                {tr.noCasterClass(dispClass(char.class, language))}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11 }}>
                  <Cartouche titre={tr.castingAbility} valeur={dispAbbr(casterConfig.ability, language)} accent={T.purple} />
                  <div style={{ flex: '1 1 180px', background: T.ink, border: `3px solid ${T.cyan}`, padding: '13px 14px' }}>
                    <Etiqueter>{tr.focus}</Etiqueter>
                    <Ligne
                      value={char.spellcastingFocus || casterConfig.focus}
                      onChange={e => setChar(prev => ({ ...prev, spellcastingFocus: e.target.value }))}
                      style={{ padding: '8px 10px', fontSize: 12.5 }}
                    />
                  </div>
                  <Cartouche
                    titre={tr.spellSlots}
                    valeur={char.spellSlots
                      ? (Object.entries(char.spellSlots) as [string, { current: number; max: number }][])
                        .map(([slot, pool]) => `${language === 'fr' ? 'N' : 'L'}${slot}: ${pool.current}/${pool.max}`).join(' · ')
                      : tr.cantripsOnly}
                    accent={T.acid}
                  />
                </div>

                {([
                  { titre: tr.cantrips, liste: 'cantrips' as const, options: cantripOptions, choisis: char.cantrips || [], max: Math.min(casterConfig.cantrips, cantripOptions.length), detail: false },
                  { titre: tr.level1Spells, liste: 'level1' as const, options: levelOneSpellOptions, choisis: selectedLevelOneSpells, max: Math.min(casterConfig.spells, levelOneSpellOptions.length), detail: true },
                ]).map(bloc => (
                  <div key={bloc.liste}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 11, flexWrap: 'wrap' }}>
                      <Titre accent={T.cyan} taille={13}>{bloc.titre}</Titre>
                      <Compteur valeur={bloc.choisis.length} sur={bloc.max} />
                    </div>
                    <Grille min={252} gap={9}>
                      {bloc.options.map(spell => (
                        <CarteTexte
                          key={spell.id}
                          nom={spell.name}
                          desc={spell.effectSummary}
                          accent={T.cyan}
                          choisi={bloc.choisis.includes(spell.name)}
                          onPick={() => toggleSpellChoice(bloc.liste, spell.name)}
                          enfants={bloc.detail ? (
                            <span style={{ display: 'block', marginTop: 5, fontFamily: DISP, fontSize: 9, opacity: .7 }}>
                              {spell.castingTime} / {spell.range}{spell.concentration ? ` / ${tr.concentration}` : ''}
                            </span>
                          ) : undefined}
                        />
                      ))}
                    </Grille>
                  </div>
                ))}
              </div>
            )}
          </Panneau>
        </div>
      )}

      {/* ─── Étape RÉCAP ────────────────────────────────────────────────────── */}
      {!readOnly && activeStep === 'review' && (
        <Panneau accent={T.emerald}>
          <Titre accent={T.emerald} taille={19}>{tr.heroBrief}</Titre>

          <Grille min={244} gap={13}>
            <div style={{ background: T.ink, border: `3px solid ${T.magenta}`, padding: '13px 15px' }}>
              <Etiqueter>{tr.identity}</Etiqueter>
              <div style={{ fontFamily: DISP, fontSize: 16, color: T.magenta }}>{char.name || tr.unnamedHero}</div>
              <p style={{ margin: '5px 0 0', fontSize: 12.5 }}>{dispRace(char.race, language)} {dispClass(char.class, language)} / {dispBackground(char.background, language)}</p>
              <p style={{ margin: 0, fontSize: 12, opacity: .6 }}>{tr.deityColon} {char.deity || tr.none}</p>
            </div>
            <div style={{ background: T.ink, border: `3px solid ${T.cyan}`, padding: '13px 15px' }}>
              <Etiqueter>{tr.mechanics}</Etiqueter>
              <p style={{ margin: '5px 0 0', fontSize: 12.5 }}>{language === 'fr' ? 'PV' : 'HP'} {char.hp.current}/{getEffectiveMaxHP(char)} / {language === 'fr' ? 'CA' : 'AC'} {char.ac} / d{CLASS_DATA[char.class]?.hitDie || 8}</p>
              <p style={{ margin: 0, fontSize: 12.5 }}>{tr.weapon} {char.weapon?.name || tr.unarmed} ({char.weapon?.damage || '1d4'})</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: pointsRemaining === 0 ? T.emerald : T.pink }}>
                {tr.pointBuy} {pointsRemaining === 0 ? tr.complete : `${pointsRemaining} ${tr.remaining}`}
              </p>
            </div>
            <div style={{ background: T.ink, border: `3px solid ${T.purple}`, padding: '13px 15px' }}>
              <Etiqueter>{tr.cinematic}</Etiqueter>
              <p style={{ margin: '5px 0 0', fontSize: 12.5 }}>{profile.cinematicStyle || 'dark fantasy cinematic'}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: requiredNarrativeReady ? T.emerald : T.pink }}>
                {requiredNarrativeReady ? tr.readyForIntro : tr.appearanceDesireRequired}
              </p>
            </div>
          </Grille>

          {casterConfig && (
            <div style={{ marginTop: 18 }}>
              <Titre accent={T.purple} taille={13}>{tr.magic}</Titre>
              <Grille min={244} gap={13}>
                <div style={{ background: T.ink, border: `2px solid rgba(237,230,216,.16)`, padding: '11px 13px' }}>
                  <Etiqueter>{tr.cantrips}</Etiqueter>
                  <p style={{ margin: 0, fontSize: 12.5, color: (char.cantrips || []).length ? T.paper : T.pink }}>
                    {(char.cantrips || []).join(', ') || tr.chooseCantrips}
                  </p>
                </div>
                <div style={{ background: T.ink, border: `2px solid rgba(237,230,216,.16)`, padding: '11px 13px' }}>
                  <Etiqueter>{casterConfig.mode === 'prepared' ? tr.preparedSpells : tr.knownSpells}</Etiqueter>
                  <p style={{ margin: 0, fontSize: 12.5, color: selectedLevelOneSpells.length ? T.paper : T.pink }}>
                    {selectedLevelOneSpells.join(', ') || tr.chooseLvl1}
                  </p>
                </div>
              </Grille>
            </div>
          )}

          <div style={{ marginTop: 18, display: 'grid', gap: 13, gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}>
            <div>
              <Etiqueter>{tr.appearance}</Etiqueter>
              <p style={{ margin: 0, minHeight: 62, padding: '11px 13px', background: T.ink, border: `2px solid rgba(237,230,216,.16)`, fontSize: 12.5, lineHeight: 1.5 }}>
                {profile.appearance || tr.appearanceMissing}
              </p>
            </div>
            <div>
              <Etiqueter>{tr.coreDesire}</Etiqueter>
              <p style={{ margin: 0, minHeight: 62, padding: '11px 13px', background: T.ink, border: `2px solid rgba(237,230,216,.16)`, fontSize: 12.5, lineHeight: 1.5 }}>
                {profile.desire || tr.desireMissing}
              </p>
            </div>
          </div>

          {(profile.dmHooks || []).length > 0 && (
            <div style={{ marginTop: 18 }}>
              <Etiqueter>{tr.dmHooks}</Etiqueter>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {(profile.dmHooks || []).map(hook => <Etiquette key={hook} couleur={T.acid}>{hook}</Etiquette>)}
              </div>
            </div>
          )}
        </Panneau>
      )}

      {/* ─── Le pied : reculer, avancer, partir ──────────────────────────────
          Le bouton de départ DIT ce qui manque au lieu d'être simplement gris.
          Un bouton désactivé muet est la première cause d'abandon à la
          création : le joueur ne sait pas ce qu'on attend de lui. */}
      {!readOnly && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11, marginTop: 26 }}>
          <button
            type="button" className="nk-step" onClick={() => goToStep(-1)} disabled={currentStepIndex <= 0}
            style={{
              flex: '0 1 150px', padding: '16px 20px', background: 'transparent',
              color: T.paper, borderColor: 'rgba(237,230,216,.4)',
              opacity: currentStepIndex <= 0 ? .35 : 1,
              cursor: currentStepIndex <= 0 ? 'not-allowed' : 'pointer',
            }}
          ><ChevronLeft className="h-4 w-4" /> {tr.back}</button>

          {activeStep !== 'review' ? (
            <button
              type="button" className="nk-step" onClick={() => goToStep(1)}
              style={{
                flex: '1 1 240px', padding: '16px 20px', fontSize: 14,
                background: T.cyan, color: onTint(T.cyan), boxShadow: hardShadow(T.ink, 8),
              }}
            >{tr.continue} <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button
              type="button" className="nk-step"
              onClick={() => onSave({ ...char, storyMode: pointMode === 'story' })}
              disabled={!canVenture}
              style={{
                flex: '1 1 240px', padding: '19px 22px', fontSize: 15,
                background: canVenture ? T.acid : T.violet,
                color: canVenture ? onTint(T.acid) : 'rgba(237,230,216,.62)',
                borderColor: canVenture ? T.ink : 'rgba(237,230,216,.3)',
                boxShadow: canVenture ? hardShadow(T.ink, 9) : 'none',
                cursor: canVenture ? 'pointer' : 'not-allowed',
              }}
            >
              {!char.name ? tr.nameRequired
                : pointsRemaining > 0 ? tr.spendPoints(pointsRemaining)
                  : !subclassReady ? tr.chooseYour(SUBCLASS_DATA[char.class]?.label || tr.archetype)
                    : !requiredNarrativeReady ? tr.addAppearanceDesire
                      : !casterReady ? tr.chooseStartingSpells
                        : <><Swords className="h-5 w-5" /> {tr.toAdventure}</>}
            </button>
          )}
        </div>
      )}

      {/* ─── Fiche de classe, en surimpression ──────────────────────────────
          Le portrait à GAUCHE, les chiffres à DROITE.

          Ce panneau existait depuis le premier commit sans que rien ne puisse
          l'ouvrir, en une colonne et sans illustration. Il sert à répondre à
          une question précise — « jusqu'où va cette classe ? » — que la carte
          et l'encart des aptitudes ne traitent pas : eux s'arrêtent au niveau 3.

          Le portrait n'est pas décoratif ici : c'est le même que la carte qu'on
          vient de cliquer, et il dit au joueur de quelle classe on parle sans
          qu'il ait à relire le titre. */}
      {showClassDetails && CLASS_DATA[char.class] && (() => {
        const cls = CLASS_DATA[char.class];
        const art = CLASS_ART[char.class];
        return (
          <div
            role="dialog" aria-modal="true" aria-label={dispClass(char.class, language)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'rgba(5,0,26,.84)', padding: 'clamp(10px, 3vw, 26px)' }}
            onClick={() => setShowClassDetails(false)}
          >
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <Panneau accent={art?.tint || T.acid}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <h2 style={{ fontFamily: DISP, fontSize: 'clamp(18px, 3.4vw, 25px)', margin: 0 }}>
                    {dispClass(char.class, language)}
                  </h2>
                  <button
                    type="button" className="nk-tick" onClick={() => setShowClassDetails(false)}
                    aria-label={tr.closeSheet} title={`${tr.closeSheet} (Échap)`}
                    style={{ fontFamily: DISP, fontSize: 19, lineHeight: 1, padding: '4px 9px', border: `2px solid rgba(237,230,216,.4)` }}
                  >×</button>
                </div>

                {/* Le portrait ne rétrécit pas sous 190 px — en dessous il
                    devient une vignette et ne vaut plus la place qu'il prend.
                    Sur mobile la colonne passe donc entière au-dessus. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
                  {art && (
                    <img
                      src={`/art/${art.slug}.webp`}
                      srcSet={`/art/${art.slug}.webp 1x, /art/${art.slug}@2x.webp 2x`}
                      alt="" loading="lazy"
                      style={{
                        flex: '1 1 190px', maxWidth: 232, aspectRatio: '3 / 4', objectFit: 'cover',
                        display: 'block', background: T.ink, border: `3px solid ${T.ink}`,
                        boxShadow: hardShadow(T.ink, 8),
                      }}
                    />
                  )}

                  <div style={{ flex: '999 1 300px', display: 'grid', gap: 13 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'rgba(237,230,216,.78)' }}>{cls.desc}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <Cartouche titre={tr.hitDiceLabel} valeur={`d${cls.hitDie}`} accent={T.pink} />
                      <Cartouche titre={tr.primaryAbility} valeur={dispAbilityExpr(cls.primaryAbility, language)} accent={T.cyan} />
                    </div>

                    <div>
                      <Etiqueter>{tr.savingThrows}</Etiqueter>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cls.savingThrows.map(j => <Etiquette key={j} couleur={T.emerald}>{dispAbbr(j, language)}</Etiquette>)}
                      </div>
                    </div>

                    <div>
                      <Etiqueter>{tr.proficiencies}</Etiqueter>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cls.profs.map(p => <Etiquette key={p}>{dispProf(p, language)}</Etiquette>)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Les capacités passent en pleine largeur : leur description
                    est du texte courant, illisible en colonne étroite. */}
                <div style={{ marginTop: 22 }}>
                  <Titre accent={art?.tint || T.acid} taille={13}>{tr.classFeatures}</Titre>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {cls.features.map((f, i) => (
                      <div key={i} style={{ background: T.ink, border: `2px solid rgba(237,230,216,.16)`, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                          <span style={{ fontFamily: DISP, fontSize: 11.5 }}>{f.name}</span>
                          <span style={{
                            flex: 'none', fontFamily: DISP, fontSize: 9, padding: '3px 8px',
                            background: T.pink, color: onTint(T.pink),
                          }}>{tr.levelAbbr}. {f.level}</span>
                        </div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.45, opacity: .74, marginTop: 4 }}>{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 22 }}>
                  <Titre accent={art?.tint || T.acid} taille={13}>{tr.xpPerLevel}</Titre>
                  <Grille min={112} gap={6}>
                    {[0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000].map((xp, i) => (
                      <div key={i} style={{ background: T.ink, border: `2px solid rgba(237,230,216,.16)`, padding: '7px 8px', textAlign: 'center', fontSize: 10.5 }}>
                        <b style={{ color: T.cyan }}>{tr.levelAbbr} {i + 1}</b> · {xp} XP
                      </div>
                    ))}
                  </Grille>
                </div>
              </Panneau>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
