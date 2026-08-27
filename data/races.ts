// Race data. Ability score increases live in types.ts RACIAL_BONUSES (single
// source of truth — read via getRacialBonus); this file holds the descriptive
// traits, proficiencies, languages, and the mechanical bits the engine uses
// (darkvision, damage resistances). `speed` is kept for the creation tooltip
// only — movement is not tracked mechanically (no battle grid).
//
// Bilingue (2026-08-27) : le texte de RÉFÉRENCE reste français (`desc`,
// `features`, `languages`) parce qu'il voyage dans les sauvegardes et part au
// MJ ; les champs `*En` sont un miroir d'AFFICHAGE, lus par raceDesc /
// raceFeatures / raceLanguages (data/labels.ts). Avant ça, un joueur en
// anglais lisait la création de personnage entièrement en français.

export const RACE_DATA: Record<string, {
    desc: string;
    descEn: string;
    features: string[];
    featuresEn: string[];
    profs: string[];
    languages: string[];
    languagesEn: string[];
    speed: number;
    darkvision?: number;          // feet
    size?: 'Small' | 'Medium';
    resistances?: string[];       // CodexDamageType strings — halved for the player in combat
    subraceOf?: string;           // base race this is a subrace of (UI grouping)
}> = {
    "Human": {
        desc: "Les plus adaptables et ambitieux. Ils excellent dans tous les domaines.",
        descEn: "The most adaptable and ambitious. They excel in every field.",
        features: ["Versatile : +1 à toutes les caractéristiques", "Une compétence et une langue supplémentaires (selon la table)"],
        featuresEn: ["Versatile: +1 to every ability score", "One extra skill and one extra language (per the table)"],
        profs: [],
        languages: ["Commun", "Une langue au choix"],
        languagesEn: ["Common", "One language of your choice"],
        speed: 30,
        size: 'Medium',
    },
    "Elf": {
        desc: "Gracieux et magiques, les elfes vivent des siècles. Choisis une sous-race (Haut-elfe / Elfe sylvestre).",
        descEn: "Graceful and magical, elves live for centuries. Pick a subrace (High Elf / Wood Elf).",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique (avantage contre l'état charmé, immunité au sommeil magique)", "Transe (4 h de méditation = un repos long)", "Sens aiguisés (Perception)"],
        featuresEn: ["Darkvision (60 ft)", "Fey Ancestry (advantage against being charmed, immune to magical sleep)", "Trance (4 h of meditation = a long rest)", "Keen Senses (Perception)"],
        profs: ["Perception"],
        languages: ["Commun", "Elfique"],
        languagesEn: ["Common", "Elvish"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Haut-elfe": {
        subraceOf: "Elf",
        desc: "Élégants érudits de la magie, les hauts-elfes manient l'épée et un tour de magie arcanique.",
        descEn: "Elegant scholars of magic, high elves wield both the sword and an arcane cantrip.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique", "Transe", "Sens aiguisés (Perception)", "Maîtrise des armes elfiques (épées longues/courtes, arcs)", "Tour de magie de magicien (au choix)", "Une langue supplémentaire au choix"],
        featuresEn: ["Darkvision (60 ft)", "Fey Ancestry", "Trance", "Keen Senses (Perception)", "Elf Weapon Training (longswords/shortswords, bows)", "One wizard cantrip of your choice", "One extra language of your choice"],
        profs: ["Perception", "Longsword", "Shortsword", "Longbow", "Shortbow"],
        languages: ["Commun", "Elfique", "Une langue au choix"],
        languagesEn: ["Common", "Elvish", "One language of your choice"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Elfe sylvestre": {
        subraceOf: "Elf",
        desc: "Pisteurs vifs et discrets, les elfes sylvestres se fondent dans la nature.",
        descEn: "Swift, quiet trackers, wood elves melt into the wild.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique", "Transe", "Sens aiguisés (Perception)", "Maîtrise des armes elfiques", "Pieds légers (déplacement 10,5 m)", "Masque de la nature (se cacher même légèrement obscurci)"],
        featuresEn: ["Darkvision (60 ft)", "Fey Ancestry", "Trance", "Keen Senses (Perception)", "Elf Weapon Training", "Fleet of Foot (35 ft speed)", "Mask of the Wild (hide even when only lightly obscured)"],
        profs: ["Perception", "Longsword", "Shortsword", "Longbow", "Shortbow"],
        languages: ["Commun", "Elfique"],
        languagesEn: ["Common", "Elvish"],
        speed: 35, darkvision: 60, size: 'Medium',
    },
    "Half-Elf": {
        desc: "Combinant le meilleur des deux mondes, les demi-elfes sont charismatiques et adaptables.",
        descEn: "Blending the best of both worlds, half-elves are charismatic and adaptable.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique (avantage contre le charme, immunité au sommeil magique)", "Polyvalence : deux compétences au choix"],
        featuresEn: ["Darkvision (60 ft)", "Fey Ancestry (advantage against charm, immune to magical sleep)", "Skill Versatility: two skills of your choice"],
        profs: [],
        languages: ["Commun", "Elfique", "Une langue au choix"],
        languagesEn: ["Common", "Elvish", "One language of your choice"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Half-Orc": {
        desc: "Féroces guerriers combinant la force orque et l'adaptabilité humaine.",
        descEn: "Fierce warriors who blend orcish strength with human adaptability.",
        features: ["Vision dans le noir (18 m)", "Endurance implacable (1/repos long : tomber à 1 PV au lieu de 0)", "Attaques sauvages (+1 dé de dégâts sur un coup critique au corps à corps)", "Menace (maîtrise d'Intimidation)"],
        featuresEn: ["Darkvision (60 ft)", "Relentless Endurance (1/long rest: drop to 1 HP instead of 0)", "Savage Attacks (+1 damage die on a melee critical hit)", "Menacing (Intimidation proficiency)"],
        profs: ["Intimidation"],
        languages: ["Commun", "Orque"],
        languagesEn: ["Common", "Orc"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Dwarf": {
        desc: "Robustes et tenaces, les nains sont des artisans et guerriers légendaires. Choisis une sous-race.",
        descEn: "Sturdy and stubborn, dwarves are legendary crafters and warriors. Pick a subrace.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (avantage aux sauvegardes contre le poison, résistance aux dégâts de poison)", "Connaissance de la pierre", "Maîtrise d'armes naines"],
        featuresEn: ["Darkvision (60 ft)", "Dwarven Resilience (advantage on saves against poison, resistance to poison damage)", "Stonecunning", "Dwarven Combat Training"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools"],
        languages: ["Commun", "Nain"],
        languagesEn: ["Common", "Dwarvish"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Nain des collines": {
        subraceOf: "Dwarf",
        desc: "Sages et résistants, les nains des collines ont une vitalité hors norme.",
        descEn: "Wise and hardy, hill dwarves have uncommon vitality.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (poison)", "Connaissance de la pierre", "Robustesse naine (+1 PV par niveau)"],
        featuresEn: ["Darkvision (60 ft)", "Dwarven Resilience (poison)", "Stonecunning", "Dwarven Toughness (+1 HP per level)"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools"],
        languages: ["Commun", "Nain"],
        languagesEn: ["Common", "Dwarvish"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Nain des montagnes": {
        subraceOf: "Dwarf",
        desc: "Forts et endurcis, les nains des montagnes sont des combattants nés.",
        descEn: "Strong and weathered, mountain dwarves are born fighters.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (poison)", "Connaissance de la pierre", "Entraînement aux armures naines (légère et intermédiaire)"],
        featuresEn: ["Darkvision (60 ft)", "Dwarven Resilience (poison)", "Stonecunning", "Dwarven Armor Training (light and medium armor)"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools", "Light Armor", "Medium Armor"],
        languages: ["Commun", "Nain"],
        languagesEn: ["Common", "Dwarvish"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Gnome": {
        desc: "Petits et malicieux, les gnomes excellent en magie et en ingénierie. Choisis une sous-race.",
        descEn: "Small and mischievous, gnomes excel at magic and engineering. Pick a subrace.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome (avantage aux sauvegardes d'INT, SAG et CHA contre la magie)"],
        featuresEn: ["Darkvision (60 ft)", "Gnome Cunning (advantage on INT, WIS and CHA saves against magic)"],
        profs: [],
        languages: ["Commun", "Gnome"],
        languagesEn: ["Common", "Gnomish"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Gnome des roches": {
        subraceOf: "Gnome",
        desc: "Inventeurs-nés, les gnomes des roches bricolent gadgets et automates.",
        descEn: "Born inventors, rock gnomes tinker with gadgets and clockwork.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome", "Savoir d'artificier (bonus de maîtrise doublé pour identifier objets magiques/alchimiques)", "Bricoleur (fabriquer de petits appareils)"],
        featuresEn: ["Darkvision (60 ft)", "Gnome Cunning", "Artificer's Lore (double proficiency bonus to identify magical/alchemical items)", "Tinker (build tiny clockwork devices)"],
        profs: ["Tinker's Tools"],
        languages: ["Commun", "Gnome"],
        languagesEn: ["Common", "Gnomish"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Gnome des forêts": {
        subraceOf: "Gnome",
        desc: "Discrets et farceurs, les gnomes des forêts parlent aux petites bêtes.",
        descEn: "Elusive pranksters, forest gnomes speak with small beasts.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome", "Illusionniste-né (tour de magie Illusion mineure)", "Parler aux petites bêtes"],
        featuresEn: ["Darkvision (60 ft)", "Gnome Cunning", "Natural Illusionist (Minor Illusion cantrip)", "Speak with Small Beasts"],
        profs: [],
        languages: ["Commun", "Gnome"],
        languagesEn: ["Common", "Gnomish"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Halfling": {
        desc: "Petits mais chanceux, les halfelins sont agiles et courageux. Choisis une sous-race.",
        descEn: "Small but lucky, halflings are nimble and brave. Pick a subrace.",
        features: ["Chanceux (relance un 1 naturel sur attaque/test/sauvegarde)", "Brave (avantage aux sauvegardes contre la peur)", "Agilité halfeline (traverser l'espace de créatures plus grandes)"],
        featuresEn: ["Lucky (reroll a natural 1 on attack/check/save)", "Brave (advantage on saves against fear)", "Halfling Nimbleness (move through the space of larger creatures)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        languagesEn: ["Common", "Halfling"],
        speed: 25, size: 'Small',
    },
    "Halfelin pied-léger": {
        subraceOf: "Halfling",
        desc: "Affables et furtifs, les pieds-légers passent inaperçus.",
        descEn: "Affable and stealthy, lightfoots go unnoticed.",
        features: ["Chanceux", "Brave", "Agilité halfeline", "Discrétion naturelle (se cacher derrière une créature plus grande)"],
        featuresEn: ["Lucky", "Brave", "Halfling Nimbleness", "Naturally Stealthy (hide behind a larger creature)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        languagesEn: ["Common", "Halfling"],
        speed: 25, size: 'Small',
    },
    "Halfelin robuste": {
        subraceOf: "Halfling",
        desc: "Trapus et endurants, les halfelins robustes encaissent les poisons.",
        descEn: "Stocky and enduring, stout halflings shrug off poison.",
        features: ["Chanceux", "Brave", "Agilité halfeline", "Résilience robuste (avantage et résistance contre le poison)"],
        featuresEn: ["Lucky", "Brave", "Halfling Nimbleness", "Stout Resilience (advantage and resistance against poison)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        languagesEn: ["Common", "Halfling"],
        speed: 25, size: 'Small', resistances: ['poison'],
    },
    "Tiefling": {
        desc: "Descendants de fiélons, les tieffelins possèdent des pouvoirs infernaux.",
        descEn: "Descended from fiends, tieflings carry infernal power.",
        features: ["Vision dans le noir (18 m)", "Résistance infernale (résistance aux dégâts de feu)", "Héritage infernal (tour de magie Thaumaturgie ; Réprimande infernale au niveau 3, Ténèbres au niveau 5)"],
        featuresEn: ["Darkvision (60 ft)", "Hellish Resistance (resistance to fire damage)", "Infernal Legacy (Thaumaturgy cantrip; Hellish Rebuke at level 3, Darkness at level 5)"],
        profs: [],
        languages: ["Commun", "Infernal"],
        languagesEn: ["Common", "Infernal"],
        speed: 30, darkvision: 60, size: 'Medium', resistances: ['fire'],
    },
    "Dragonborn": {
        desc: "Fiers descendants des dragons, ils possèdent un souffle dévastateur lié à leur ascendance.",
        descEn: "Proud dragon-blooded, they carry a devastating breath weapon tied to their ancestry.",
        features: ["Souffle de dragon (2d6, type et sauvegarde selon l'ascendance draconique)", "Résistance au type de dégâts de ton ascendance draconique (choisie à la création)"],
        featuresEn: ["Breath Weapon (2d6, type and save set by your draconic ancestry)", "Resistance to your draconic ancestry's damage type (chosen at creation)"],
        profs: [],
        languages: ["Commun", "Draconique"],
        languagesEn: ["Common", "Draconic"],
        // Legacy fallback only — the real resistance follows character.draconicAncestry
        // (see getDraconicDamageType / startEncounter). Kept 'fire' for old saves.
        speed: 30, size: 'Medium', resistances: ['fire'],
    },
};

export const RACES = Object.keys(RACE_DATA);
