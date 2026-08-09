export interface AdventureOption {
    id: string;
    title: string;
    desc: string;
    lore: string;
    minLevel: number;
    maxLevel: number;
}

export const ADVENTURES: AdventureOption[] = [
    {
        id: 'lost_mines',
        title: 'The Lost Deepvein',
        desc: 'Level 1-5. A classic frontier start.',
        lore: 'A forgotten dwarven mine, goblin ambushes on the road, frontier intrigue, and a hidden mastermind pulling the strings.',
        minLevel: 1,
        maxLevel: 5,
    },
    {
        id: 'dragon_heist',
        title: 'The Grand Coin Heist',
        desc: 'Level 1-5. Urban intrigue.',
        lore: 'A frantic treasure race through a sprawling harbor city, with rival guilds, corrupt nobles, and buried secrets.',
        minLevel: 1,
        maxLevel: 5,
    },
    {
        id: 'strahd',
        title: 'The Mist-Cursed Vale',
        desc: 'Level 1-10. Gothic horror.',
        lore: 'A cursed vampire lord rules a valley sealed by unnatural mists. Escape the fog — or become part of his domain forever.',
        minLevel: 1,
        maxLevel: 10,
    },
    {
        id: 'tomb_annihilation',
        title: 'The Devouring Tomb',
        desc: 'Level 1-11. Jungle survival.',
        lore: 'A steaming jungle of dinosaurs and lethal ruins, where a death curse slowly consumes the souls of all who have ever died.',
        minLevel: 1,
        maxLevel: 11,
    },
    {
        id: 'storm_kings',
        title: "The Giants' Reckoning",
        desc: 'Level 1-11. A giant uprising.',
        lore: 'The ancient pact that bound the giants has shattered. Now they march down from the peaks, and the small folk of the coast stand in their path.',
        minLevel: 5,
        maxLevel: 11,
    },
    {
        id: 'avernus',
        title: 'Descent into the Inferno',
        desc: 'Level 1-13. A hellish war.',
        lore: 'A great city is dragged toward the front lines of a war in the lower planes — infernal politics, war machines, and soul contracts signed in blood.',
        minLevel: 1,
        maxLevel: 13,
    },
    {
        id: 'out_abyss',
        title: 'Escape from the Sunless Deep',
        desc: 'Level 1-15. An underground escape.',
        lore: 'Imprisoned in the lightless caverns far below the world by cruel dark elves, mere survival is the first victory — and demons stir in the black.',
        minLevel: 1,
        maxLevel: 15,
    },
    {
        id: 'mad_mage',
        title: "The Mad Archmage's Labyrinth",
        desc: 'Level 5-20. A mega-dungeon.',
        lore: 'Endless levels spiral down beneath the city, the deranged work of an immortal archmage who waits, watching, at the very bottom.',
        minLevel: 5,
        maxLevel: 20,
    },
    // ── AUTHORED flagship campaign (original, hand-written manifest in
    //    data/campaigns/hiverSansAube.ts). Uses the Flash fill-only pass, not generation. ──
    {
        id: 'hiver_sans_aube',
        title: 'L’Hiver sans Aube',
        desc: 'Niveaux 1-8. Horreur de survie glaciale.',
        lore: 'Au nord, le soleil ne se lève plus. Sous le glacier, un deuil a figé le monde — y mettre fin exige de laisser mourir ce qu’on refuse de perdre.',
        minLevel: 1,
        maxLevel: 8,
    },
    {
        id: 'chant_brise',
        title: 'Le Chant Brisé',
        desc: "Niveaux 1-12. Ruines elfiques mythiques — campagne d'auteur.",
        lore: 'La Cité du Chant est tombée en une nuit, voilà six siècles. Ses sceaux tombent enfin, la Ruée commence — mais dans les ruines qui fredonnent, quelque chose recrute des voix vivantes pour un dernier concert.',
        minLevel: 1,
        maxLevel: 12,
    },
];

export function getAdventureById(id?: string | null): AdventureOption | undefined {
    return ADVENTURES.find(adventure => adventure.id === id);
}
