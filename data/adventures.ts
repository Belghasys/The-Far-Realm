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
        title: 'Lost Mine of Phandelver',
        desc: 'Level 1-5. A classic start.',
        lore: 'A lost dwarven mine, goblin ambushes, frontier intrigue, and a hidden mastermind.',
        minLevel: 1,
        maxLevel: 5,
    },
    {
        id: 'dragon_heist',
        title: 'Waterdeep: Dragon Heist',
        desc: 'Level 1-5. Urban intrigue.',
        lore: 'A treasure race through Waterdeep, with rival guilds, corrupt nobles, and buried secrets.',
        minLevel: 1,
        maxLevel: 5,
    },
    {
        id: 'strahd',
        title: 'Curse of Strahd',
        desc: 'Level 1-10. Gothic horror.',
        lore: 'A cursed vampire rules Barovia. Escape the mists or become part of the domain.',
        minLevel: 1,
        maxLevel: 10,
    },
    {
        id: 'tomb_annihilation',
        title: 'Tomb of Annihilation',
        desc: 'Level 1-11. Jungle survival.',
        lore: 'Chult, dinosaurs, lethal ruins, and a death curse eating the souls of the dead.',
        minLevel: 1,
        maxLevel: 11,
    },
    {
        id: 'storm_kings',
        title: "Storm King's Thunder",
        desc: 'Level 1-11. Giants uprising.',
        lore: 'The giants have broken rank and now threaten the Sword Coast.',
        minLevel: 5,
        maxLevel: 11,
    },
    {
        id: 'avernus',
        title: "Baldur's Gate: Descent",
        desc: 'Level 1-13. Hellish war.',
        lore: 'Baldur\'s Gate is pulled toward infernal politics, war machines, and soul contracts.',
        minLevel: 1,
        maxLevel: 13,
    },
    {
        id: 'out_abyss',
        title: 'Out of the Abyss',
        desc: 'Level 1-15. Underdark escape.',
        lore: 'Imprisoned by drow in the Underdark, survival becomes the first victory.',
        minLevel: 1,
        maxLevel: 15,
    },
    {
        id: 'mad_mage',
        title: 'Dungeon of the Mad Mage',
        desc: 'Level 5-20. Mega dungeon.',
        lore: 'Twenty-three levels below Waterdeep, Halaster waits in the world\'s largest dungeon.',
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
];

export function getAdventureById(id?: string | null): AdventureOption | undefined {
    return ADVENTURES.find(adventure => adventure.id === id);
}
