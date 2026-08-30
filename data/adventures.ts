/**
 * Catalogue des campagnes proposées au joueur (écran de sélection).
 *
 * BILINGUE. Convention maison (cf. data/equipment.ts, data/weapons.ts) :
 * l'anglais est la base, le français porte le suffixe `Fr`. Avant le
 * 2026-08-23, les huit classiques étaient en anglais et les trois campagnes
 * d'auteur en français — l'écran mélangeait donc les deux langues quoi que
 * choisisse le joueur.
 *
 * Les champs sont volontairement plus riches qu'un simple titre + résumé :
 * l'écran de sélection est le seul endroit où le joueur décide, et il
 * décidait jusqu'ici sur une ligne de texte.
 *
 *   desc    — l'accroche, une ligne
 *   lore    — l'ambiance, un paragraphe
 *   premise — ce qu'on FAIT réellement (distinct de l'ambiance)
 *   tags    — trois marqueurs de ton, pour comparer d'un coup d'œil
 *   chapters / acts — mesurés dans data/campaigns/ pour les campagnes d'auteur
 */

/** Exigence du terrain, indépendante du niveau des personnages. */
export type AdventureDifficulty = 'gentle' | 'standard' | 'harsh';

export interface AdventureOption {
    id: string;
    /** Titre anglais (base). */
    title: string;
    titleFr: string;
    /** Accroche d'une ligne. */
    desc: string;
    descFr: string;
    /** Paragraphe d'ambiance. */
    lore: string;
    loreFr: string;
    /** Ce que le joueur fait concrètement — la promesse de jeu. */
    premise: string;
    premiseFr: string;
    minLevel: number;
    maxLevel: number;
    /** Trois marqueurs de ton, ordre significatif. */
    tags: string[];
    tagsFr: string[];
    difficulty: AdventureDifficulty;
    /** Durée estimée en séances de 2 à 3 heures. */
    sessions: string;
    /** Campagne écrite à la main (manifeste dans data/campaigns/). */
    authored?: boolean;
    /** Renseignés uniquement pour les campagnes d'auteur. */
    chapters?: number;
    acts?: number;
}

export const ADVENTURES: AdventureOption[] = [
    // ── Aventures générées : le MJ improvise à partir d'une prémisse ────────
    {
        id: 'lost_mines',
        title: 'The Lost Deepvein',
        titleFr: 'La Veine Profonde',
        desc: 'The classic frontier start.',
        descFr: 'Le grand classique du départ.',
        lore: 'A forgotten dwarven mine, goblin ambushes on the road, frontier intrigue, and a hidden mastermind pulling the strings.',
        loreFr: 'Une mine naine oubliée, des embuscades de gobelins sur la route, des intrigues de frontière, et quelqu’un dans l’ombre qui tire les ficelles.',
        premise: 'The gentlest way in. Short travel, readable fights, a village that needs you, and a mystery that resolves cleanly. If it is your first campaign, start here.',
        premiseFr: 'La porte d’entrée la plus douce. Trajets courts, combats lisibles, un village qui a besoin de vous, et un mystère qui se referme proprement. Première campagne : commencez ici.',
        minLevel: 1, maxLevel: 5,
        tags: ['Frontier', 'Mystery', 'Beginners'],
        tagsFr: ['Frontière', 'Enquête', 'Débutants'],
        difficulty: 'gentle',
        sessions: '6 to 10',
    },
    {
        id: 'dragon_heist',
        title: 'The Grand Coin Heist',
        titleFr: 'Le Grand Casse',
        desc: 'Urban intrigue, four factions, one fortune.',
        descFr: 'Intrigue urbaine, quatre factions, une fortune.',
        lore: 'A frantic treasure race through a sprawling harbor city, with rival guilds, corrupt nobles, and buried secrets.',
        loreFr: 'Une course au trésor effrénée dans une cité portuaire tentaculaire : guildes rivales, nobles corrompus et secrets enterrés.',
        premise: 'Almost no dungeon. You talk, you follow, you break in, you pick a side — and every faction remembers what you chose. Made for players who prefer negotiating to fighting.',
        premiseFr: 'Presque pas de donjon. On parle, on file, on s’introduit, on choisit un camp — et chaque faction retient ce que vous avez choisi. Pour qui préfère négocier que cogner.',
        minLevel: 1, maxLevel: 5,
        tags: ['City', 'Factions', 'Few fights'],
        tagsFr: ['Ville', 'Factions', 'Peu de combats'],
        difficulty: 'gentle',
        sessions: '8 to 12',
    },
    {
        id: 'strahd',
        title: 'The Mist-Cursed Vale',
        titleFr: 'La Vallée des Brumes',
        desc: 'Gothic horror in a valley with no way out.',
        descFr: 'Horreur gothique dans une vallée sans issue.',
        lore: 'A cursed vampire lord rules a valley sealed by unnatural mists. Escape the fog — or become part of his domain forever.',
        loreFr: 'Un seigneur vampire maudit règne sur une vallée close par des brumes contre nature. Sortir du brouillard, ou appartenir pour toujours à son domaine.',
        premise: 'The valley is small and everything in it is hostile. Rest is scarce, the villain watches you from the first hour, and he is amused rather than threatened. Play it for the dread, not the loot.',
        premiseFr: 'La vallée est petite et tout y est hostile. Le repos est rare, le vilain vous observe dès la première heure, et il s’amuse plus qu’il ne s’inquiète. On y va pour l’angoisse, pas pour le butin.',
        minLevel: 1, maxLevel: 10,
        tags: ['Gothic', 'Closed world', 'Dread'],
        tagsFr: ['Gothique', 'Huis clos', 'Angoisse'],
        difficulty: 'harsh',
        sessions: '15 to 25',
    },
    {
        id: 'tomb_annihilation',
        title: 'The Devouring Tomb',
        titleFr: 'Le Tombeau Dévorant',
        desc: 'Jungle survival, then a lethal dungeon.',
        descFr: 'Survie en jungle, puis un donjon létal.',
        lore: 'A steaming jungle of dinosaurs and lethal ruins, where a death curse slowly consumes the souls of all who have ever died.',
        loreFr: 'Une jungle moite de dinosaures et de ruines mortelles, où une malédiction ronge lentement l’âme de tous ceux qui sont un jour morts.',
        premise: 'Two campaigns in one: an open expedition where rations and disease matter, then a tomb built to kill you. Resurrection does not work. Characters die here.',
        premiseFr: 'Deux campagnes en une : une expédition ouverte où les rations et la maladie comptent, puis un tombeau conçu pour vous tuer. La résurrection ne fonctionne pas. On y meurt.',
        minLevel: 1, maxLevel: 11,
        tags: ['Exploration', 'Survival', 'Deadly'],
        tagsFr: ['Exploration', 'Survie', 'Mortel'],
        difficulty: 'harsh',
        sessions: '20 to 30',
    },
    {
        id: 'storm_kings',
        title: "The Giants' Reckoning",
        titleFr: 'Le Réveil des Géants',
        desc: 'A broken pact, and giants coming down from the peaks.',
        descFr: 'Un pacte brisé, et les géants qui descendent des cimes.',
        lore: 'The ancient pact that bound the giants has shattered. Now they march down from the peaks, and the small folk of the coast stand in their path.',
        loreFr: 'Le pacte ancestral qui liait les géants s’est rompu. Ils descendent des cimes, et les petites gens de la côte se trouvent sur leur chemin.',
        premise: 'The widest map of the eight. You travel constantly, you negotiate with things far larger than you, and you can end most confrontations without drawing a weapon — if you understand who wants what.',
        premiseFr: 'La carte la plus vaste des huit. On voyage sans arrêt, on négocie avec bien plus grand que soi, et la plupart des confrontations se dénouent sans dégainer — à condition de comprendre qui veut quoi.',
        minLevel: 5, maxLevel: 11,
        tags: ['Travel', 'Diplomacy', 'Epic scale'],
        tagsFr: ['Voyage', 'Diplomatie', 'Grande échelle'],
        difficulty: 'standard',
        sessions: '20 to 30',
    },
    {
        id: 'avernus',
        title: 'Descent into the Inferno',
        titleFr: 'La Descente aux Enfers',
        desc: 'A whole city dragged into a war between devils.',
        descFr: 'Une ville entière précipitée dans une guerre de diables.',
        lore: 'A great city is dragged toward the front lines of a war in the lower planes — infernal politics, war machines, and soul contracts signed in blood.',
        loreFr: 'Une grande cité est tirée vers le front d’une guerre des plans inférieurs : politique infernale, machines de guerre et contrats d’âme signés dans le sang.',
        premise: 'The clock never stops. Fuel runs out, allies are all liars, and every shortcut is a contract. The one campaign where the smartest move is often to sign something you will regret.',
        premiseFr: 'L’horloge ne s’arrête jamais. Le carburant s’épuise, les alliés mentent tous, et chaque raccourci est un contrat. La seule campagne où le bon calcul est souvent de signer ce qu’on regrettera.',
        minLevel: 1, maxLevel: 13,
        tags: ['Hell', 'Deals', 'Race against time'],
        tagsFr: ['Enfers', 'Pactes', 'Course contre la montre'],
        difficulty: 'harsh',
        sessions: '18 to 26',
    },
    {
        id: 'out_abyss',
        title: 'Escape from the Sunless Deep',
        titleFr: 'La Fuite des Profondeurs',
        desc: 'You start as a prisoner, with nothing.',
        descFr: 'Vous commencez prisonnier, sans rien.',
        lore: 'Imprisoned in the lightless caverns far below the world by cruel dark elves, mere survival is the first victory — and demons stir in the black.',
        loreFr: 'Prisonnier des cavernes sans lumière, très loin sous le monde, entre les mains d’elfes noirs. Survivre est déjà une victoire — et des démons remuent dans le noir.',
        premise: 'No gear, no map, no light. The first third is pure survival with a band of fellow prisoners you will grow attached to. Then the surface, and the realisation that something followed you up.',
        premiseFr: 'Ni équipement, ni carte, ni lumière. Le premier tiers est de la survie pure avec des compagnons de cellule auxquels on s’attache. Puis la surface — et la découverte que quelque chose est remonté avec vous.',
        minLevel: 1, maxLevel: 15,
        tags: ['Underdark', 'Madness', 'Escape'],
        tagsFr: ['Souterrain', 'Folie', 'Évasion'],
        difficulty: 'harsh',
        sessions: '22 to 32',
    },
    {
        id: 'mad_mage',
        title: "The Mad Archmage's Labyrinth",
        titleFr: 'Le Labyrinthe de l’Archimage',
        desc: 'Twenty-three levels straight down.',
        descFr: 'Vingt-trois niveaux droit vers le bas.',
        lore: 'Endless levels spiral down beneath the city, the deranged work of an immortal archmage who waits, watching, at the very bottom.',
        loreFr: 'Des niveaux sans fin s’enfoncent sous la cité, œuvre dérangée d’un archimage immortel qui attend, tout en bas, et regarde.',
        premise: 'The purest dungeon crawl here, and the longest run of all: level 5 to level 20 in one descent. Little plot, enormous variety, and a city above where you spend what you dragged up.',
        premiseFr: 'Le donjon le plus pur du lot, et la plus longue traversée : du niveau 5 au niveau 20 en une descente. Peu d’intrigue, une variété énorme, et une ville au-dessus où dépenser ce qu’on a remonté.',
        minLevel: 5, maxLevel: 20,
        tags: ['Mega-dungeon', 'Long run', 'Loot'],
        tagsFr: ['Méga-donjon', 'Longue haleine', 'Butin'],
        difficulty: 'standard',
        sessions: '40 and up',
    },

    // ── Campagnes d'auteur : manifeste écrit à la main dans data/campaigns/ ──
    //    Le MJ suit une trame réelle chapitre par chapitre au lieu d'improviser.
    {
        id: 'hiver_sans_aube',
        title: 'The Dawnless Winter',
        titleFr: 'L’Hiver sans Aube',
        desc: 'The sun no longer rises in the north.',
        descFr: 'Au nord, le soleil ne se lève plus.',
        lore: 'In the north, the sun no longer rises. Beneath the glacier a grief has frozen the world — ending it means letting die what you refuse to lose.',
        loreFr: 'Au nord, le soleil ne se lève plus. Sous le glacier, un deuil a figé le monde — y mettre fin exige de laisser mourir ce qu’on refuse de perdre.',
        premise: 'A short, tight campaign about cold and loss. Firewood, warmth and hours of daylight are real resources. The ending asks you to give something up, and it means it.',
        premiseFr: 'Une campagne courte et resserrée sur le froid et le deuil. Le bois, la chaleur et les heures de jour sont de vraies ressources. La fin vous demande de renoncer à quelque chose, et elle ne bluffe pas.',
        minLevel: 1, maxLevel: 8,
        tags: ['Survival horror', 'Grief', 'Short'],
        tagsFr: ['Horreur de survie', 'Deuil', 'Courte'],
        difficulty: 'harsh',
        sessions: '10 to 14',
        authored: true,
        chapters: 7,
        acts: 3,
    },
    {
        id: 'chant_brise',
        title: 'The Broken Song',
        titleFr: 'Le Chant Brisé',
        desc: 'Mythic elven ruins that hum at night.',
        descFr: 'Des ruines elfiques mythiques qui fredonnent la nuit.',
        lore: 'The City of Song fell in a single night, six centuries ago. Its seals are finally giving way and the Rush has begun — but in ruins that hum, something is recruiting living voices for one last concert.',
        loreFr: 'La Cité du Chant est tombée en une nuit, voilà six siècles. Ses sceaux tombent enfin, la Ruée commence — mais dans les ruines qui fredonnent, quelque chose recrute des voix vivantes pour un dernier concert.',
        premise: 'A ruined city you explore in competition with other treasure hunters, where music is a mechanic rather than a theme: covering a death knell, finishing a bar, answering an echo are real actions. Four acts, a re-skinned bestiary, and named NPCs who remember you.',
        premiseFr: 'Une cité en ruine qu’on explore en concurrence avec d’autres pilleurs, où la musique est une mécanique et non un décor : couvrir un tocsin, achever une mesure, répondre à un écho sont de vraies actions. Quatre actes, un bestiaire re-skinné, et des PNJ nommés qui se souviennent de vous.',
        minLevel: 1, maxLevel: 12,
        tags: ['Dead city', 'Music', 'Ancient pacts'],
        tagsFr: ['Cité morte', 'Musique', 'Pactes anciens'],
        difficulty: 'standard',
        sessions: '18 to 24',
        authored: true,
        chapters: 13,
        acts: 4,
    },
    {
        id: 'portes_exil',
        title: 'The Gates of Exile',
        titleFr: 'Les Portes de l’Exil',
        desc: 'You died this morning. Almost.',
        descFr: 'Tu es mort ce matin. Presque.',
        lore: 'You died this morning — almost. Woken in the customs-city built inside the carcass of the god of farewells, you are the only thing that still crosses the gates between worlds. And someone, somewhere, is sewing the worlds together so that nothing may ever leave again.',
        loreFr: 'Tu es mort ce matin — presque. Réveillé dans la cité-douane bâtie dans la carcasse du dieu des adieux, tu es la seule chose qui franchisse encore les portes des mondes. Et quelqu’un, quelque part, coud les mondes entre eux pour que plus rien, jamais, ne puisse partir.',
        premise: 'The longest and strangest of the three. Six acts, each in a world with its own rules, linked by a hub city you return to and watch change. Levels 1 to 16 — the only campaign here that takes a character to the edge of legend.',
        premiseFr: 'La plus longue et la plus étrange des trois. Six actes, chacun dans un monde avec ses propres lois, reliés par une cité-carrefour où l’on revient et qu’on voit changer. Du niveau 1 au niveau 16 — la seule campagne qui mène un personnage au seuil de la légende.',
        minLevel: 1, maxLevel: 16,
        tags: ['Worlds apart', 'Six acts', 'Farewells'],
        tagsFr: ['Entre les mondes', 'Six actes', 'Adieux'],
        difficulty: 'standard',
        sessions: '28 to 40',
        authored: true,
        chapters: 19,
        acts: 6,
    },
];

export function getAdventureById(id?: string | null): AdventureOption | undefined {
    return ADVENTURES.find(adventure => adventure.id === id);
}

/**
 * Variante stricte, pour les manifestes de campagne qui exposent leur propre
 * carte de sélection. Ils la RECOPIAIENT jusqu'au 2026-08-23 — deux
 * exemplaires de la même fiche, déjà en train de diverger. Ils la dérivent
 * désormais d'ici, et un id inconnu casse au chargement plutôt qu'en silence.
 */
export function requireAdventure(id: string): AdventureOption {
    const found = getAdventureById(id);
    if (!found) throw new Error(`Campagne inconnue dans ADVENTURES : "${id}"`);
    return found;
}

/** Vue localisée d'une campagne — tout ce que l'écran de sélection affiche. */
export interface LocalizedAdventure {
    id: string;
    title: string;
    desc: string;
    lore: string;
    premise: string;
    tags: string[];
    minLevel: number;
    maxLevel: number;
    difficulty: AdventureDifficulty;
    sessions: string;
    authored: boolean;
    chapters?: number;
    acts?: number;
}

export function localizeAdventure(a: AdventureOption, lang: 'fr' | 'en'): LocalizedAdventure {
    const fr = lang === 'fr';
    return {
        id: a.id,
        title: fr ? a.titleFr : a.title,
        desc: fr ? a.descFr : a.desc,
        lore: fr ? a.loreFr : a.lore,
        premise: fr ? a.premiseFr : a.premise,
        tags: fr ? a.tagsFr : a.tags,
        minLevel: a.minLevel,
        maxLevel: a.maxLevel,
        difficulty: a.difficulty,
        sessions: a.sessions,
        authored: Boolean(a.authored),
        chapters: a.chapters,
        acts: a.acts,
    };
}
