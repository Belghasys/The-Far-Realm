export const CLASS_DATA: Record<string, {
    hitDie: number;
    profs: string[];
    desc: string;
    primaryAbility: string;
    savingThrows: string[];
    features: { level: number; name: string; desc: string }[];
}> = {
    Fighter: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Maîtres du combat, les guerriers excellent avec toutes les armes et armures.",
        primaryAbility: "STR ou DEX",
        savingThrows: ["STR", "CON"],
        features: [
            { level: 1, name: "Second Wind", desc: "Récupérer 1d10+niveau PV (1/repos court)" },
            { level: 1, name: "Fighting Style", desc: "Choisir un style de combat" },
            { level: 2, name: "Action Surge", desc: "Une action supplémentaire (1/repos court)" },
            { level: 3, name: "Archétype", desc: "Champion, Maître de guerre, ou Chevalier occulte" },
            { level: 5, name: "Attaque supplémentaire", desc: "2 attaques par action d'attaque" }
        ]
    },
    Paladin: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Chevaliers sacrés liés par un serment divin.",
        primaryAbility: "STR et CHA",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Divine Sense", desc: "Détecter célestes, fiélons, morts-vivants" },
            { level: 1, name: "Imposition des mains", desc: "Soigner 5×niveau PV par jour" },
            { level: 2, name: "Fighting Style", desc: "Choisir un style de combat" },
            { level: 2, name: "Divine Smite", desc: "+2d8 dégâts radiants sur touche" },
            { level: 3, name: "Serment sacré", desc: "Dévotion, Vengeance, ou Anciens" }
        ]
    },
    Ranger: {
        hitDie: 10,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Chasseurs et éclaireurs maîtrisant la nature.",
        primaryAbility: "DEX et WIS",
        savingThrows: ["STR", "DEX"],
        features: [
            { level: 1, name: "Ennemi juré", desc: "Avantage contre un type de créature" },
            { level: 1, name: "Explorateur né", desc: "Avantages en terrain favori" },
            { level: 2, name: "Fighting Style", desc: "Choisir un style de combat" },
            { level: 2, name: "Sorts", desc: "Accès aux sorts de rôdeur" },
            { level: 3, name: "Archétype", desc: "Chasseur ou Maître des bêtes" }
        ]
    },
    Rogue: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        desc: "Maîtres de la furtivité et des attaques sournoises.",
        primaryAbility: "DEX",
        savingThrows: ["DEX", "INT"],
        features: [
            { level: 1, name: "Expertise", desc: "Double maîtrise sur 2 compétences" },
            { level: 1, name: "Sneak Attack", desc: "+1d6 dégâts avec avantage" },
            { level: 1, name: "Argot des voleurs", desc: "Langage secret" },
            { level: 2, name: "Ruse", desc: "Désengager ou se cacher en action bonus" },
            { level: 3, name: "Archétype", desc: "Assassin, Voleur, ou Escroc arcanique" }
        ]
    },
    Cleric: {
        hitDie: 8,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons"],
        desc: "Serviteurs divins canalisant la puissance de leur dieu.",
        primaryAbility: "WIS",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Sorts", desc: "Lanceur de sorts divin" },
            { level: 1, name: "Domaine divin", desc: "Vie, Lumière, Guerre, etc." },
            { level: 2, name: "Conduit divin", desc: "Renvoi des morts-vivants + pouvoir de domaine" },
            { level: 5, name: "Destruction des morts-vivants", desc: "Détruire les morts-vivants faibles" }
        ]
    },
    Druid: {
        hitDie: 8,
        profs: ["Light Armor (non-metal)", "Medium Armor (non-metal)", "Shields", "Simple Weapons"],
        desc: "Gardiens de la nature capables de se transformer en bêtes.",
        primaryAbility: "WIS",
        savingThrows: ["INT", "WIS"],
        features: [
            { level: 1, name: "Sorts", desc: "Lanceur de sorts naturel" },
            { level: 1, name: "Druidique", desc: "Langage secret des druides" },
            { level: 2, name: "Forme sauvage", desc: "Se transformer en animal" },
            { level: 2, name: "Cercle druidique", desc: "Terre ou Lune" }
        ]
    },
    Mage: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        desc: "Érudits maîtrisant les arcanes par l'étude.",
        primaryAbility: "INT",
        savingThrows: ["INT", "WIS"],
        features: [
            { level: 1, name: "Sorts", desc: "Grimoire de sorts, préparer depuis la liste" },
            { level: 1, name: "Récupération arcanique", desc: "Récupérer emplacements (1/jour)" },
            { level: 2, name: "Tradition arcanique", desc: "Évocation, Abjuration, etc." }
        ]
    },
    Barbarian: {
        hitDie: 12,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Guerriers primitifs puisant dans leur rage.",
        primaryAbility: "STR",
        savingThrows: ["STR", "CON"],
        features: [
            { level: 1, name: "Rage", desc: "+2 dégâts, résistance aux dégâts physiques" },
            { level: 1, name: "Défense sans armure", desc: "CA = 10 + DEX + CON" },
            { level: 2, name: "Attaque téméraire", desc: "Avantage aux attaques, désavantage en défense" },
            { level: 3, name: "Voie primitive", desc: "Berserker ou Guerrier totem" }
        ]
    },
    Bard: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        desc: "Artistes et conteurs maîtrisant la magie par la musique.",
        primaryAbility: "CHA",
        savingThrows: ["DEX", "CHA"],
        features: [
            { level: 1, name: "Sorts", desc: "Lanceur de sorts charismatique" },
            { level: 1, name: "Inspiration bardique", desc: "Donner d6 à un allié" },
            { level: 2, name: "Chant reposant", desc: "Soins supplémentaires au repos" },
            { level: 3, name: "Collège bardique", desc: "Vaillance ou Savoir" }
        ]
    },
    Monk: {
        hitDie: 8,
        profs: ["Simple Weapons", "Shortswords"],
        desc: "Artistes martiaux canalisant le ki.",
        primaryAbility: "DEX et WIS",
        savingThrows: ["STR", "DEX"],
        features: [
            { level: 1, name: "Défense sans armure", desc: "CA = 10 + DEX + WIS" },
            { level: 1, name: "Arts martiaux", desc: "Attaques bonus, dégâts DEX" },
            { level: 2, name: "Ki", desc: "Points de ki pour pouvoirs spéciaux" },
            { level: 3, name: "Tradition monastique", desc: "Main ouverte, Ombre, ou 4 éléments" }
        ]
    },
    Warlock: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons"],
        desc: "Lanceurs de sorts liés à une entité supérieure.",
        primaryAbility: "CHA",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Pacte", desc: "Fiélon, Fée, ou Grand Ancien" },
            { level: 1, name: "Magie de pacte", desc: "Emplacements de sorts récupérés au repos court" },
            { level: 2, name: "Invocations occultes", desc: "Pouvoirs spéciaux passifs" },
            { level: 3, name: "Don du pacte", desc: "Lame, Tome, ou Chaîne" }
        ]
    },
    Sorcerer: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        desc: "Lanceurs de sorts nés avec la magie dans le sang.",
        primaryAbility: "CHA",
        savingThrows: ["CON", "CHA"],
        features: [
            { level: 1, name: "Origine", desc: "Draconique ou Magie sauvage" },
            { level: 1, name: "Sorts innés", desc: "Pas de grimoire nécessaire" },
            { level: 2, name: "Points de sorcellerie", desc: "Modifier les sorts" },
            { level: 3, name: "Métamagie", desc: "Amplifier ou modifier les sorts" }
        ]
    }
};

// Per-class skill proficiencies (SRD 5.1): how many the player chooses and the
// list to choose from. Skill names match SKILL_ABILITIES in engine/skillSystem.ts.
export const CLASS_SKILLS: Record<string, { choices: number; list: string[] }> = {
    Fighter: { choices: 2, list: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'] },
    Paladin: { choices: 2, list: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'] },
    Ranger: { choices: 3, list: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'] },
    Rogue: { choices: 4, list: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'] },
    Cleric: { choices: 2, list: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
    Druid: { choices: 2, list: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'] },
    Mage: { choices: 2, list: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'] },
    Barbarian: { choices: 2, list: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'] },
    Bard: { choices: 3, list: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'] },
    Monk: { choices: 2, list: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'] },
    Warlock: { choices: 2, list: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'] },
    Sorcerer: { choices: 2, list: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'] },
};

// Classes that gain Expertise (double proficiency) at level 1, and how many picks.
export const CLASS_EXPERTISE: Record<string, number> = { Rogue: 2 };

export const ALL_SKILLS: string[] = [
    'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation',
    'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

export const MARTIAL_CLASSES = ['Fighter', 'Paladin', 'Ranger'];
