// Race data. Ability score increases live in types.ts RACIAL_BONUSES (single
// source of truth — read via getRacialBonus); this file holds the descriptive
// traits, proficiencies, languages, and the mechanical bits the engine uses
// (darkvision, damage resistances). `speed` is kept for the creation tooltip
// only — movement is not tracked mechanically (no battle grid).

export const RACE_DATA: Record<string, {
    desc: string;
    features: string[];
    profs: string[];
    languages: string[];
    speed: number;
    darkvision?: number;          // feet
    size?: 'Small' | 'Medium';
    resistances?: string[];       // CodexDamageType strings — halved for the player in combat
    subraceOf?: string;           // base race this is a subrace of (UI grouping)
}> = {
    "Human": {
        desc: "Les plus adaptables et ambitieux. Ils excellent dans tous les domaines.",
        features: ["Versatile : +1 à toutes les caractéristiques", "Une compétence et une langue supplémentaires (selon la table)"],
        profs: [],
        languages: ["Commun", "Une langue au choix"],
        speed: 30,
        size: 'Medium',
    },
    "Elf": {
        desc: "Gracieux et magiques, les elfes vivent des siècles. Choisis une sous-race (Haut-elfe / Elfe sylvestre).",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique (avantage contre l'état charmé, immunité au sommeil magique)", "Transe (4 h de méditation = un repos long)", "Sens aiguisés (Perception)"],
        profs: ["Perception"],
        languages: ["Commun", "Elfique"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Haut-elfe": {
        subraceOf: "Elf",
        desc: "Élégants érudits de la magie, les hauts-elfes manient l'épée et un tour de magie arcanique.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique", "Transe", "Sens aiguisés (Perception)", "Maîtrise des armes elfiques (épées longues/courtes, arcs)", "Tour de magie de magicien (au choix)", "Une langue supplémentaire au choix"],
        profs: ["Perception", "Longsword", "Shortsword", "Longbow", "Shortbow"],
        languages: ["Commun", "Elfique", "Une langue au choix"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Elfe sylvestre": {
        subraceOf: "Elf",
        desc: "Pisteurs vifs et discrets, les elfes sylvestres se fondent dans la nature.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique", "Transe", "Sens aiguisés (Perception)", "Maîtrise des armes elfiques", "Pieds légers (déplacement 10,5 m)", "Masque de la nature (se cacher même légèrement obscurci)"],
        profs: ["Perception", "Longsword", "Shortsword", "Longbow", "Shortbow"],
        languages: ["Commun", "Elfique"],
        speed: 35, darkvision: 60, size: 'Medium',
    },
    "Half-Elf": {
        desc: "Combinant le meilleur des deux mondes, les demi-elfes sont charismatiques et adaptables.",
        features: ["Vision dans le noir (18 m)", "Ascendance féerique (avantage contre le charme, immunité au sommeil magique)", "Polyvalence : deux compétences au choix"],
        profs: [],
        languages: ["Commun", "Elfique", "Une langue au choix"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Half-Orc": {
        desc: "Féroces guerriers combinant la force orque et l'adaptabilité humaine.",
        features: ["Vision dans le noir (18 m)", "Endurance implacable (1/repos long : tomber à 1 PV au lieu de 0)", "Attaques sauvages (+1 dé de dégâts sur un coup critique au corps à corps)", "Menace (maîtrise d'Intimidation)"],
        profs: ["Intimidation"],
        languages: ["Commun", "Orque"],
        speed: 30, darkvision: 60, size: 'Medium',
    },
    "Dwarf": {
        desc: "Robustes et tenaces, les nains sont des artisans et guerriers légendaires. Choisis une sous-race.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (avantage aux sauvegardes contre le poison, résistance aux dégâts de poison)", "Connaissance de la pierre", "Maîtrise d'armes naines"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools"],
        languages: ["Commun", "Nain"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Nain des collines": {
        subraceOf: "Dwarf",
        desc: "Sages et résistants, les nains des collines ont une vitalité hors norme.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (poison)", "Connaissance de la pierre", "Robustesse naine (+1 PV par niveau)"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools"],
        languages: ["Commun", "Nain"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Nain des montagnes": {
        subraceOf: "Dwarf",
        desc: "Forts et endurcis, les nains des montagnes sont des combattants nés.",
        features: ["Vision dans le noir (18 m)", "Résistance naine (poison)", "Connaissance de la pierre", "Entraînement aux armures naines (légère et intermédiaire)"],
        profs: ["Battleaxe", "Handaxe", "Light Hammer", "Warhammer", "Smith's Tools", "Light Armor", "Medium Armor"],
        languages: ["Commun", "Nain"],
        speed: 25, darkvision: 60, size: 'Medium', resistances: ['poison'],
    },
    "Gnome": {
        desc: "Petits et malicieux, les gnomes excellent en magie et en ingénierie. Choisis une sous-race.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome (avantage aux sauvegardes d'INT, SAG et CHA contre la magie)"],
        profs: [],
        languages: ["Commun", "Gnome"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Gnome des roches": {
        subraceOf: "Gnome",
        desc: "Inventeurs-nés, les gnomes des roches bricolent gadgets et automates.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome", "Savoir d'artificier (bonus de maîtrise doublé pour identifier objets magiques/alchimiques)", "Bricoleur (fabriquer de petits appareils)"],
        profs: ["Tinker's Tools"],
        languages: ["Commun", "Gnome"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Gnome des forêts": {
        subraceOf: "Gnome",
        desc: "Discrets et farceurs, les gnomes des forêts parlent aux petites bêtes.",
        features: ["Vision dans le noir (18 m)", "Ruse gnome", "Illusionniste-né (tour de magie Illusion mineure)", "Parler aux petites bêtes"],
        profs: [],
        languages: ["Commun", "Gnome"],
        speed: 25, darkvision: 60, size: 'Small',
    },
    "Halfling": {
        desc: "Petits mais chanceux, les halfelins sont agiles et courageux. Choisis une sous-race.",
        features: ["Chanceux (relance un 1 naturel sur attaque/test/sauvegarde)", "Brave (avantage aux sauvegardes contre la peur)", "Agilité halfeline (traverser l'espace de créatures plus grandes)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        speed: 25, size: 'Small',
    },
    "Halfelin pied-léger": {
        subraceOf: "Halfling",
        desc: "Affables et furtifs, les pieds-légers passent inaperçus.",
        features: ["Chanceux", "Brave", "Agilité halfeline", "Discrétion naturelle (se cacher derrière une créature plus grande)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        speed: 25, size: 'Small',
    },
    "Halfelin robuste": {
        subraceOf: "Halfling",
        desc: "Trapus et endurants, les halfelins robustes encaissent les poisons.",
        features: ["Chanceux", "Brave", "Agilité halfeline", "Résilience robuste (avantage et résistance contre le poison)"],
        profs: [],
        languages: ["Commun", "Halfelin"],
        speed: 25, size: 'Small', resistances: ['poison'],
    },
    "Tiefling": {
        desc: "Descendants de fiélons, les tieffelins possèdent des pouvoirs infernaux.",
        features: ["Vision dans le noir (18 m)", "Résistance infernale (résistance aux dégâts de feu)", "Héritage infernal (tour de magie Thaumaturgie ; Réprimande infernale au niveau 3, Ténèbres au niveau 5)"],
        profs: [],
        languages: ["Commun", "Infernal"],
        speed: 30, darkvision: 60, size: 'Medium', resistances: ['fire'],
    },
    "Dragonborn": {
        desc: "Fiers descendants des dragons, ils possèdent un souffle dévastateur lié à leur ascendance.",
        features: ["Souffle de dragon (2d6, type et sauvegarde selon l'ascendance draconique)", "Résistance au type de dégâts de ton ascendance draconique (choisie à la création)"],
        profs: [],
        languages: ["Commun", "Draconique"],
        // Legacy fallback only — the real resistance follows character.draconicAncestry
        // (see getDraconicDamageType / startEncounter). Kept 'fire' for old saves.
        speed: 30, size: 'Medium', resistances: ['fire'],
    },
};

export const RACES = Object.keys(RACE_DATA);
