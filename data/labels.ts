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

export type Lang = 'en' | 'fr';

/** Nom affichable d'une classe. Les sous-races portent déjà un nom français. */
export const dispClass = (c: string, lang: Lang) => (lang === 'fr' ? (CLASS_FR[c] || c) : c);
export const dispRace = (r: string, lang: Lang) => (lang === 'fr' ? (RACE_FR[r] || r) : r);
export const dispStyle = (s: string, lang: Lang) => (lang === 'fr' ? (STYLE_FR[s] || s) : s);
export const dispBackground = (b: string, lang: Lang) => (lang === 'fr' ? (BACKGROUND_FR[b] || b) : b);
export const dispProf = (p: string, lang: Lang) => (lang === 'fr' ? (CLASS_PROF_FR[p] || p) : p);
/** Règle d'un style de combat : traduite en français, anglaise sinon. */
export const styleDesc = (nom: string, secours: string, lang: Lang) =>
    (lang === 'fr' ? (STYLE_DESC_FR[nom] || secours) : secours);
