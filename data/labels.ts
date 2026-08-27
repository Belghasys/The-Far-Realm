import { SUBCLASS_DATA } from './subclasses';

/**
 * Noms français des classes, races et styles de combat.
 *
 * Une seule source, volontairement. Ces tables vivaient en copie privée dans
 * CharacterSheet ; le menu refondu en avait besoin à son tour, et la première
 * copie a immédiatement divergé — la clé `Mage` s'y était retrouvée affichée
 * « Magicien », qui est le nom de la clé `Wizard` (absente de CLASS_DATA).
 * Un joueur aurait vu deux noms différents pour la même classe selon l'écran.
 *
 * Les CLÉS restent en anglais : ce sont celles de CLASS_DATA et RACE_DATA, et
 * elles voyagent dans les sauvegardes. Seul l'affichage est traduit.
 */

export const CLASS_FR: Record<string, string> = {
    Fighter: 'Guerrier', Paladin: 'Paladin', Ranger: 'Rôdeur', Rogue: 'Roublard', Cleric: 'Clerc',
    Druid: 'Druide', Mage: 'Mage', Wizard: 'Magicien', Barbarian: 'Barbare', Bard: 'Barde',
    Monk: 'Moine', Warlock: 'Occultiste', Sorcerer: 'Ensorceleur',
};

export const RACE_FR: Record<string, string> = {
    Human: 'Humain', Elf: 'Elfe', 'Half-Elf': 'Demi-elfe', 'Half-Orc': 'Demi-orc', Dwarf: 'Nain',
    Gnome: 'Gnome', Halfling: 'Halfelin', Tiefling: 'Tieffelin', Dragonborn: 'Drakéide',
};

/**
 * Les SOUS-RACES ont une clé française (RACE_DATA les stocke ainsi, et cette
 * clé voyage dans les sauvegardes). En anglais, la fiche affichait donc
 * « Haut-elfe » au milieu d'un écran anglais : cette table est la traduction
 * d'affichage dans l'autre sens. Les races de base sont déjà des clés
 * anglaises, dispRace les laisse passer.
 */
export const RACE_EN: Record<string, string> = {
    'Haut-elfe': 'High Elf', 'Elfe sylvestre': 'Wood Elf',
    'Nain des collines': 'Hill Dwarf', 'Nain des montagnes': 'Mountain Dwarf',
    'Gnome des roches': 'Rock Gnome', 'Gnome des forêts': 'Forest Gnome',
    'Halfelin pied-léger': 'Lightfoot Halfling', 'Halfelin robuste': 'Stout Halfling',
};

export const STYLE_FR: Record<string, string> = {
    Archery: 'Tir', Defense: 'Défense', Dueling: 'Duel', 'Great Weapon Fighting': 'Arme lourde',
    Protection: 'Protection', 'Two-Weapon Fighting': 'Combat à deux armes',
};

/**
 * Historiques. Les clés restent anglaises (elles voyagent dans les sauvegardes
 * et partent au MJ), seul l'affichage est traduit — la carte disait « Urchin »
 * au-dessus d'une description française, ce qui se voyait d'autant plus depuis
 * que chaque historique a sa planche illustrée.
 */
export const BACKGROUND_FR: Record<string, string> = {
    Acolyte: 'Acolyte', Criminal: 'Criminel', 'Folk Hero': 'Héros du peuple',
    Noble: 'Noble', Sage: 'Sage', Soldier: 'Soldat', Urchin: 'Gamin des rues',
    Charlatan: 'Charlatan', Hermit: 'Ermite', Outlander: 'Voyageur',
};

/**
 * Règles des styles de combat, en français.
 *
 * `FIGHTING_STYLES[].desc` reste en anglais : cette chaîne-là est recopiée
 * telle quelle dans les capacités du personnage sauvegardé, et la traduire
 * changerait des données déjà écrites. On traduit donc à l'AFFICHAGE, ici.
 */
export const STYLE_DESC_FR: Record<string, string> = {
    Archery: "+2 aux jets d'attaque avec les armes à distance.",
    Defense: '+1 à la CA tant que vous portez une armure.',
    Dueling: "Une arme de corps à corps dans une main et rien dans l'autre : +2 aux dégâts de cette arme.",
    'Great Weapon Fighting': "Relancez les 1 et les 2 sur les dés de dégâts d'une arme de corps à corps à deux mains.",
    Protection: "Quand une créature que vous voyez attaque quelqu'un d'autre à moins de 1,50 m de vous, votre réaction impose un désavantage à ce jet d'attaque (bouclier requis).",
    'Two-Weapon Fighting': 'Ajoutez votre modificateur de caractéristique aux dégâts de la seconde attaque du combat à deux armes.',
};

/**
 * Maîtrises de classe. Mêmes règles que le reste : la clé anglaise est la
 * donnée (elle part au MJ et voyage dans les sauvegardes), le français n'est
 * qu'un affichage. La fiche de classe les montrait en anglais au milieu d'un
 * panneau français.
 */
export const CLASS_PROF_FR: Record<string, string> = {
    'All Armor': 'Toutes armures',
    'Light Armor': 'Armures légères',
    'Light Armor (non-metal)': 'Armures légères (non métalliques)',
    'Medium Armor': 'Armures intermédiaires',
    'Medium Armor (non-metal)': 'Armures intermédiaires (non métalliques)',
    Shields: 'Boucliers',
    'Simple Weapons': 'Armes courantes',
    'Martial Weapons': 'Armes de guerre',
    Daggers: 'Dagues',
    Darts: 'Fléchettes',
    Slings: 'Frondes',
    Quarterstaffs: 'Bâtons de combat',
    Longswords: 'Épées longues',
    Shortswords: 'Épées courtes',
    Rapiers: 'Rapières',
    'Hand Crossbows': 'Arbalètes de poing',
    'Light Crossbows': 'Arbalètes légères',
};

/**
 * Compétences (SKILL_*), langues parlées et outils : les clés sont anglaises
 * (elles voyagent dans character.proficiencies et partent au MJ), le français
 * n'est qu'un affichage. La liste des maîtrises de RACE montrait « Perception,
 * Longsword, Smith's Tools » dans une fiche française.
 */
export const SKILL_FR: Record<string, string> = {
    'Acrobatics': 'Acrobaties', 'Animal Handling': 'Dressage', 'Arcana': 'Arcanes', 'Athletics': 'Athlétisme',
    'Deception': 'Tromperie', 'History': 'Histoire', 'Insight': 'Perspicacité', 'Intimidation': 'Intimidation',
    'Investigation': 'Investigation', 'Medicine': 'Médecine', 'Nature': 'Nature', 'Perception': 'Perception',
    'Performance': 'Représentation', 'Persuasion': 'Persuasion', 'Religion': 'Religion', 'Sleight of Hand': 'Escamotage',
    'Stealth': 'Discrétion', 'Survival': 'Survie',
};

/** Outils et armes citées dans les maîtrises raciales / d'historique. */
export const TOOL_FR: Record<string, string> = {
    "Thieves' Tools": 'Outils de voleur', 'Gaming Set': 'Jeu de société', "Artisan's Tools": "Outils d'artisan",
    'Vehicles (Land)': 'Véhicules terrestres', 'Disguise Kit': 'Kit de déguisement', 'Forgery Kit': 'Kit de faussaire',
    'Herbalism Kit': "Kit d'herboriste", 'Musical Instrument': 'Instrument de musique',
    "Smith's Tools": 'Outils de forgeron', "Tinker's Tools": 'Outils de bricoleur',
    Battleaxe: "Hache d'armes", Handaxe: 'Hachette', 'Light Hammer': 'Marteau léger', Warhammer: 'Marteau de guerre',
    Longsword: 'Épée longue', Shortsword: 'Épée courte', Longbow: 'Arc long', Shortbow: 'Arc court',
};

export type Lang = 'en' | 'fr';

/** Nom affichable d'une classe. */
export const dispClass = (c: string, lang: Lang) => (lang === 'fr' ? (CLASS_FR[c] || c) : c);
/** Nom affichable d'une race. Les races de base ont une clé anglaise, les
 *  sous-races une clé française : chaque sens a sa table. */
export const dispRace = (r: string, lang: Lang) => (lang === 'fr' ? (RACE_FR[r] || r) : (RACE_EN[r] || r));
export const dispStyle = (s: string, lang: Lang) => (lang === 'fr' ? (STYLE_FR[s] || s) : s);
export const dispBackground = (b: string, lang: Lang) => (lang === 'fr' ? (BACKGROUND_FR[b] || b) : b);
export const dispProf = (p: string, lang: Lang) => (lang === 'fr' ? (CLASS_PROF_FR[p] || p) : p);
/** Compétence / outil / arme cité dans une liste de maîtrises. Une seule
 *  fonction pour les trois : les listes du jeu les mélangent librement. */
export const dispSkill = (s: string, lang: Lang) =>
    (lang === 'fr' ? (SKILL_FR[s] || CLASS_PROF_FR[s] || TOOL_FR[s] || s) : s);
/** Règle d'un style de combat : traduite en français, anglaise sinon. */
export const styleDesc = (nom: string, secours: string, lang: Lang) =>
    (lang === 'fr' ? (STYLE_DESC_FR[nom] || secours) : secours);

/**
 * Choix de langue sur les données de jeu bilingues (races, classes,
 * historiques, divinités, sous-classes). Le champ FRANÇAIS reste la donnée de
 * référence — il voyage dans les sauvegardes et part au MJ ; le champ `*En`
 * n'est qu'un miroir d'affichage, et on retombe sur le français s'il manque.
 */
export const pick = <T>(fr: T, en: T | undefined, lang: Lang): T =>
    (lang === 'en' && en !== undefined ? en : fr);

/**
 * Aptitudes (Feature) : le nom canonique est ANGLAIS (le moteur s'y accroche,
 * il voyage dans character.features), la description est FRANÇAISE. L'écran
 * lisait donc un nom anglais au-dessus d'une description française en FR, et
 * l'inverse en EN. Ces deux fonctions rendent la paire cohérente.
 */
export const featureName = (f: { name: string; nameFr?: string }, lang: Lang) =>
    (lang === 'fr' ? (f.nameFr || f.name) : f.name);
export const featureDesc = (f: { description: string; descriptionEn?: string }, lang: Lang) =>
    (lang === 'en' ? (f.descriptionEn || f.description) : f.description);

/** Sexe affichable. */
export const dispGender = (g: string | undefined, lang: Lang): string =>
    g === 'female' ? (lang === 'fr' ? 'Femme' : 'Female') : (lang === 'fr' ? 'Homme' : 'Male');

/**
 * La ligne VERROUILLÉE en tête de l'Apparence (2026-08-27) : sexe, race,
 * classe. Elle n'est pas stockée dans le texte — elle est recomposée depuis la
 * fiche, donc elle suit un changement de race sans jamais se dédoubler. Le MJ
 * et le portrait la reçoivent en anglais (identityLineEn), l'écran dans la
 * langue du joueur.
 */
export const identityLine = (c: { gender?: string; race: string; class: string }, lang: Lang): string =>
    [dispGender(c.gender, lang), dispRace(c.race, lang), dispClass(c.class, lang)].join(' · ');
export const identityLineEn = (c: { gender?: string; race: string; class: string }): string =>
    `${c.gender === 'female' ? 'female' : 'male'} ${dispRace(c.race, 'en')} ${c.class}`;

/** Nom d'archétype depuis la CLÉ stockée dans character.subclass. */
export const dispSubclass = (name: string | undefined, lang: Lang): string => {
    if (!name) return '';
    for (const cfg of Object.values(SUBCLASS_DATA)) {
        const opt = cfg.options.find(o => o.name === name || o.id === name);
        if (opt) return featureName(opt, lang);
    }
    return name;
};

/** Même règle pour une option de sous-classe (« Battle Master » / « Maître de
 *  guerre ») : nom canonique anglais, miroir français. */
export const subclassName = featureName;
