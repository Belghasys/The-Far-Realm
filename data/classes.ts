// Bilingue (2026-08-27) : `name` et `desc` sont la DONNÉE — `name` est recopié
// dans character.features et voyage dans les sauvegardes, on n'y touche pas.
// `nameFr` / `nameEn` / `descEn` sont un miroir d'AFFICHAGE (voir featName /
// featDesc dans data/labels.ts). `nameFr` existe parce que la donnée mélangeait
// déjà les deux langues ("Second Wind" au milieu d'une fiche française).
export const CLASS_DATA: Record<string, {
    hitDie: number;
    profs: string[];
    desc: string;
    descEn: string;
    primaryAbility: string;
    primaryAbilityEn: string;
    savingThrows: string[];
    features: { level: number; name: string; nameFr: string; nameEn: string; desc: string; descEn: string }[];
}> = {
    Fighter: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Maîtres du combat, les guerriers excellent avec toutes les armes et armures.",
        descEn: "Masters of battle, fighters excel with every weapon and armor.",
        primaryAbility: "STR ou DEX",
        primaryAbilityEn: "STR or DEX",
        savingThrows: ["STR", "CON"],
        features: [
            { level: 1, name: "Second Wind", nameFr: "Second souffle", nameEn: "Second Wind", desc: "Récupérer 1d10+niveau PV (1/repos court)", descEn: "Regain 1d10+level HP (1/short rest)" },
            { level: 1, name: "Fighting Style", nameFr: "Style de combat", nameEn: "Fighting Style", desc: "Choisir un style de combat", descEn: "Choose a fighting style" },
            { level: 2, name: "Action Surge", nameFr: "Sursaut d'activité", nameEn: "Action Surge", desc: "Une action supplémentaire (1/repos court)", descEn: "One extra action (1/short rest)" },
            { level: 3, name: "Archétype", nameFr: "Archétype martial", nameEn: "Martial Archetype", desc: "Champion, Maître de guerre, ou Chevalier occulte", descEn: "Champion, Battle Master, or Eldritch Knight" },
            { level: 5, name: "Attaque supplémentaire", nameFr: "Attaque supplémentaire", nameEn: "Extra Attack", desc: "2 attaques par action d'attaque", descEn: "2 attacks per Attack action" }
        ]
    },
    Paladin: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Chevaliers sacrés liés par un serment divin.",
        descEn: "Holy knights bound by a divine oath.",
        primaryAbility: "STR et CHA",
        primaryAbilityEn: "STR and CHA",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Divine Sense", nameFr: "Sens divin", nameEn: "Divine Sense", desc: "Détecter célestes, fiélons, morts-vivants", descEn: "Detect celestials, fiends, and undead" },
            { level: 1, name: "Imposition des mains", nameFr: "Imposition des mains", nameEn: "Lay on Hands", desc: "Soigner 5×niveau PV par jour", descEn: "Heal 5×level HP per day" },
            { level: 2, name: "Fighting Style", nameFr: "Style de combat", nameEn: "Fighting Style", desc: "Choisir un style de combat", descEn: "Choose a fighting style" },
            { level: 2, name: "Divine Smite", nameFr: "Châtiment divin", nameEn: "Divine Smite", desc: "+2d8 dégâts radiants sur touche", descEn: "+2d8 radiant damage on a hit" },
            { level: 3, name: "Serment sacré", nameFr: "Serment sacré", nameEn: "Sacred Oath", desc: "Dévotion, Vengeance, ou Anciens", descEn: "Devotion, Vengeance, or Ancients" }
        ]
    },
    Ranger: {
        hitDie: 10,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Chasseurs et éclaireurs maîtrisant la nature.",
        descEn: "Hunters and scouts at home in the wild.",
        primaryAbility: "DEX et WIS",
        primaryAbilityEn: "DEX and WIS",
        savingThrows: ["STR", "DEX"],
        features: [
            { level: 1, name: "Ennemi juré", nameFr: "Ennemi juré", nameEn: "Favored Enemy", desc: "Avantage contre un type de créature", descEn: "Advantage against one creature type" },
            { level: 1, name: "Explorateur né", nameFr: "Explorateur né", nameEn: "Natural Explorer", desc: "Avantages en terrain favori", descEn: "Benefits in your favored terrain" },
            { level: 2, name: "Fighting Style", nameFr: "Style de combat", nameEn: "Fighting Style", desc: "Choisir un style de combat", descEn: "Choose a fighting style" },
            { level: 2, name: "Sorts", nameFr: "Sorts", nameEn: "Spellcasting", desc: "Accès aux sorts de rôdeur", descEn: "Access to the ranger spell list" },
            { level: 3, name: "Archétype", nameFr: "Archétype de rôdeur", nameEn: "Ranger Archetype", desc: "Chasseur ou Maître des bêtes", descEn: "Hunter or Beast Master" }
        ]
    },
    Rogue: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        desc: "Maîtres de la furtivité et des attaques sournoises.",
        descEn: "Masters of stealth and the sneak attack.",
        primaryAbility: "DEX",
        primaryAbilityEn: "DEX",
        savingThrows: ["DEX", "INT"],
        features: [
            { level: 1, name: "Expertise", nameFr: "Expertise", nameEn: "Expertise", desc: "Double maîtrise sur 2 compétences", descEn: "Double proficiency on 2 skills" },
            { level: 1, name: "Sneak Attack", nameFr: "Attaque sournoise", nameEn: "Sneak Attack", desc: "+1d6 dégâts avec avantage", descEn: "+1d6 damage with advantage" },
            { level: 1, name: "Argot des voleurs", nameFr: "Argot des voleurs", nameEn: "Thieves' Cant", desc: "Langage secret", descEn: "A secret language" },
            { level: 2, name: "Ruse", nameFr: "Ruse", nameEn: "Cunning Action", desc: "Désengager ou se cacher en action bonus", descEn: "Disengage or Hide as a bonus action" },
            { level: 3, name: "Archétype", nameFr: "Archétype de roublard", nameEn: "Roguish Archetype", desc: "Assassin, Voleur, ou Escroc arcanique", descEn: "Assassin, Thief, or Arcane Trickster" }
        ]
    },
    Cleric: {
        hitDie: 8,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons"],
        desc: "Serviteurs divins canalisant la puissance de leur dieu.",
        descEn: "Divine servants channeling the power of their god.",
        primaryAbility: "WIS",
        primaryAbilityEn: "WIS",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Sorts", nameFr: "Sorts", nameEn: "Spellcasting", desc: "Lanceur de sorts divin", descEn: "Divine spellcaster" },
            { level: 1, name: "Domaine divin", nameFr: "Domaine divin", nameEn: "Divine Domain", desc: "Vie, Lumière, Guerre, etc.", descEn: "Life, Light, War, and so on" },
            { level: 2, name: "Conduit divin", nameFr: "Canalisation d'énergie divine", nameEn: "Channel Divinity", desc: "Renvoi des morts-vivants + pouvoir de domaine", descEn: "Turn Undead + a domain power" },
            { level: 5, name: "Destruction des morts-vivants", nameFr: "Destruction des morts-vivants", nameEn: "Destroy Undead", desc: "Détruire les morts-vivants faibles", descEn: "Destroy weaker undead outright" }
        ]
    },
    Druid: {
        hitDie: 8,
        profs: ["Light Armor (non-metal)", "Medium Armor (non-metal)", "Shields", "Simple Weapons"],
        desc: "Gardiens de la nature capables de se transformer en bêtes.",
        descEn: "Guardians of nature who can take the shape of beasts.",
        primaryAbility: "WIS",
        primaryAbilityEn: "WIS",
        savingThrows: ["INT", "WIS"],
        features: [
            { level: 1, name: "Sorts", nameFr: "Sorts", nameEn: "Spellcasting", desc: "Lanceur de sorts naturel", descEn: "Nature spellcaster" },
            { level: 1, name: "Druidique", nameFr: "Druidique", nameEn: "Druidic", desc: "Langage secret des druides", descEn: "The secret language of druids" },
            { level: 2, name: "Forme sauvage", nameFr: "Forme sauvage", nameEn: "Wild Shape", desc: "Se transformer en animal", descEn: "Turn into an animal" },
            { level: 2, name: "Cercle druidique", nameFr: "Cercle druidique", nameEn: "Druid Circle", desc: "Terre ou Lune", descEn: "Land or Moon" }
        ]
    },
    Mage: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        desc: "Érudits maîtrisant les arcanes par l'étude.",
        descEn: "Scholars who master the arcane through study.",
        primaryAbility: "INT",
        primaryAbilityEn: "INT",
        savingThrows: ["INT", "WIS"],
        features: [
            { level: 1, name: "Sorts", nameFr: "Sorts", nameEn: "Spellcasting", desc: "Grimoire de sorts, préparer depuis la liste", descEn: "Spellbook — prepare from your list" },
            { level: 1, name: "Récupération arcanique", nameFr: "Récupération arcanique", nameEn: "Arcane Recovery", desc: "Récupérer emplacements (1/jour)", descEn: "Regain spell slots (1/day)" },
            { level: 2, name: "Tradition arcanique", nameFr: "Tradition arcanique", nameEn: "Arcane Tradition", desc: "Évocation, Abjuration, etc.", descEn: "Evocation, Abjuration, and so on" }
        ]
    },
    Barbarian: {
        hitDie: 12,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        desc: "Guerriers primitifs puisant dans leur rage.",
        descEn: "Primal warriors who draw on their rage.",
        primaryAbility: "STR",
        primaryAbilityEn: "STR",
        savingThrows: ["STR", "CON"],
        features: [
            { level: 1, name: "Rage", nameFr: "Rage", nameEn: "Rage", desc: "+2 dégâts, résistance aux dégâts physiques", descEn: "+2 damage, resistance to physical damage" },
            { level: 1, name: "Défense sans armure", nameFr: "Défense sans armure", nameEn: "Unarmored Defense", desc: "CA = 10 + DEX + CON", descEn: "AC = 10 + DEX + CON" },
            { level: 2, name: "Attaque téméraire", nameFr: "Attaque téméraire", nameEn: "Reckless Attack", desc: "Avantage aux attaques, désavantage en défense", descEn: "Advantage on attacks, disadvantage on defense" },
            { level: 3, name: "Voie primitive", nameFr: "Voie primitive", nameEn: "Primal Path", desc: "Berserker ou Guerrier totem", descEn: "Berserker or Totem Warrior" }
        ]
    },
    Bard: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        desc: "Artistes et conteurs maîtrisant la magie par la musique.",
        descEn: "Performers and storytellers who work magic through music.",
        primaryAbility: "CHA",
        primaryAbilityEn: "CHA",
        savingThrows: ["DEX", "CHA"],
        features: [
            { level: 1, name: "Sorts", nameFr: "Sorts", nameEn: "Spellcasting", desc: "Lanceur de sorts charismatique", descEn: "Charisma-based spellcaster" },
            { level: 1, name: "Inspiration bardique", nameFr: "Inspiration bardique", nameEn: "Bardic Inspiration", desc: "Donner d6 à un allié", descEn: "Grant a d6 to an ally" },
            { level: 2, name: "Chant reposant", nameFr: "Chant reposant", nameEn: "Song of Rest", desc: "Soins supplémentaires au repos", descEn: "Extra healing on a rest" },
            { level: 3, name: "Collège bardique", nameFr: "Collège bardique", nameEn: "Bard College", desc: "Vaillance ou Savoir", descEn: "Valor or Lore" }
        ]
    },
    Monk: {
        hitDie: 8,
        profs: ["Simple Weapons", "Shortswords"],
        desc: "Artistes martiaux canalisant le ki.",
        descEn: "Martial artists who channel ki.",
        primaryAbility: "DEX et WIS",
        primaryAbilityEn: "DEX and WIS",
        savingThrows: ["STR", "DEX"],
        features: [
            { level: 1, name: "Défense sans armure", nameFr: "Défense sans armure", nameEn: "Unarmored Defense", desc: "CA = 10 + DEX + WIS", descEn: "AC = 10 + DEX + WIS" },
            { level: 1, name: "Arts martiaux", nameFr: "Arts martiaux", nameEn: "Martial Arts", desc: "Attaques bonus, dégâts DEX", descEn: "Bonus-action strikes, DEX damage" },
            { level: 2, name: "Ki", nameFr: "Ki", nameEn: "Ki", desc: "Points de ki pour pouvoirs spéciaux", descEn: "Ki points fuel special powers" },
            { level: 3, name: "Tradition monastique", nameFr: "Tradition monastique", nameEn: "Monastic Tradition", desc: "Main ouverte, Ombre, ou 4 éléments", descEn: "Open Hand, Shadow, or Four Elements" }
        ]
    },
    Warlock: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons"],
        desc: "Lanceurs de sorts liés à une entité supérieure.",
        descEn: "Spellcasters bound to a greater entity.",
        primaryAbility: "CHA",
        primaryAbilityEn: "CHA",
        savingThrows: ["WIS", "CHA"],
        features: [
            { level: 1, name: "Pacte", nameFr: "Protecteur d'un autre monde", nameEn: "Otherworldly Patron", desc: "Fiélon, Fée, ou Grand Ancien", descEn: "Fiend, Archfey, or Great Old One" },
            { level: 1, name: "Magie de pacte", nameFr: "Magie de pacte", nameEn: "Pact Magic", desc: "Emplacements de sorts récupérés au repos court", descEn: "Spell slots regained on a short rest" },
            { level: 2, name: "Invocations occultes", nameFr: "Invocations occultes", nameEn: "Eldritch Invocations", desc: "Pouvoirs spéciaux passifs", descEn: "Passive special powers" },
            { level: 3, name: "Don du pacte", nameFr: "Don du pacte", nameEn: "Pact Boon", desc: "Lame, Tome, ou Chaîne", descEn: "Blade, Tome, or Chain" }
        ]
    },
    Sorcerer: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        desc: "Lanceurs de sorts nés avec la magie dans le sang.",
        descEn: "Spellcasters born with magic in their blood.",
        primaryAbility: "CHA",
        primaryAbilityEn: "CHA",
        savingThrows: ["CON", "CHA"],
        features: [
            { level: 1, name: "Origine", nameFr: "Origine magique", nameEn: "Sorcerous Origin", desc: "Draconique ou Magie sauvage", descEn: "Draconic Bloodline or Wild Magic" },
            { level: 1, name: "Sorts innés", nameFr: "Sorts innés", nameEn: "Innate Spellcasting", desc: "Pas de grimoire nécessaire", descEn: "No spellbook needed" },
            { level: 2, name: "Points de sorcellerie", nameFr: "Points de sorcellerie", nameEn: "Sorcery Points", desc: "Modifier les sorts", descEn: "Reshape your spells" },
            { level: 3, name: "Métamagie", nameFr: "Métamagie", nameEn: "Metamagic", desc: "Amplifier ou modifier les sorts", descEn: "Amplify or alter your spells" }
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
