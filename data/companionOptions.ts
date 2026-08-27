/**
 * Catalogues typés des créatures liées au héros :
 *  - MOUNT_TYPES      : montures (vitesse, vol, réservations de classe — le
 *                       Destrier céleste est l'Appel de destrier du paladin).
 *  - BEAST_COMPANIONS : bêtes du Rôdeur Beast Master (stats de la ligne alliée).
 *  - FAMILIAR_TYPES   : familiers des lanceurs de sorts (Find Familiar SRD +
 *                       l'esprit animal du druide).
 * Les résolveurs sont insensibles aux accents et tolèrent id ou nom FR/EN.
 */

const STRIP_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(STRIP_MARKS, '').trim();

// ── Montures ────────────────────────────────────────────────────────────────

export interface MountType {
    id: string;
    /** Nom d'affichage FR (le jeu parle français d'abord). */
    name: string;
    nameEn: string;
    /** Miroir d'affichage EN de `description` / du nom d'attaque (2026-08-27) :
     *  une monture invoquée s'annonçait en français dans une partie anglaise. */
    descriptionEn?: string;
    attackNameEn?: string;
    /** Facteur de puissance SRD de la bête. Sert au BUDGET de rencontre
     *  (engine/partyWeight) : une monture est un combattant complet, elle doit
     *  peser. Le nom donné par le joueur (« Tempête ») ne résolvant jamais au
     *  bestiaire, ce FP explicite est la seule source. */
    cr: number;
    /** Vitesse en pieds. */
    speed: number;
    flying?: boolean;
    /** Stats de COMBAT : la monture rejoint chaque rencontre comme alliée et
     *  attaque avec ses propres jets (auto-résolus par le moteur). */
    hp: number;
    ac: number;
    dexMod: number;
    attack: { name: string; attackBonus: number; damage: string; damageType: string };
    description: string;
    /** Monture de classe (ex. Destrier céleste = paladin niv 5+, Appel de destrier). */
    classOnly?: { class: string; minLevel: number };
}

export const MOUNT_TYPES: MountType[] = [
    { id: 'poney', cr: 0.125, attackNameEn: "Hooves", descriptionEn: "Small, hardy, perfect for halflings and gnomes.", name: 'Poney', nameEn: 'Pony', speed: 40, hp: 11, ac: 10, dexMod: 0, attack: { name: 'Sabots', attackBonus: 3, damage: '1d4+2', damageType: 'bludgeoning' }, description: 'Petit, endurant, parfait pour les halfelins et les gnomes.' },
    { id: 'cheval_selle', cr: 0.25, attackNameEn: "Hooves", descriptionEn: "The classic travelling mount of the kingdom roads.", name: 'Cheval de selle', nameEn: 'Riding Horse', speed: 60, hp: 13, ac: 10, dexMod: 1, attack: { name: 'Sabots', attackBonus: 5, damage: '2d4+3', damageType: 'bludgeoning' }, description: 'La monture de voyage classique des routes du royaume.' },
    { id: 'destrier', cr: 0.5, attackNameEn: "Hooves", descriptionEn: "A warhorse trained for the din of battle — it does not flinch at screams.", name: 'Destrier', nameEn: 'Warhorse', speed: 60, hp: 19, ac: 11, dexMod: 1, attack: { name: 'Sabots', attackBonus: 6, damage: '2d6+4', damageType: 'bludgeoning' }, description: 'Cheval de guerre dressé au fracas des batailles — ne bronche pas sous les cris.' },
    { id: 'chameau', cr: 0.125, attackNameEn: "Bite", descriptionEn: "Enduring in the deserts, foul-tempered.", name: 'Chameau', nameEn: 'Camel', speed: 50, hp: 15, ac: 9, dexMod: -1, attack: { name: 'Morsure', attackBonus: 5, damage: '1d4+3', damageType: 'bludgeoning' }, description: 'Endurant dans les déserts, caractère exécrable.' },
    { id: 'elan', cr: 0.25, attackNameEn: "Antlers", descriptionEn: "A great deer of the cold forests, prized by the northern peoples.", name: 'Élan', nameEn: 'Elk', speed: 50, hp: 13, ac: 10, dexMod: 0, attack: { name: 'Ramure', attackBonus: 5, damage: '2d4+3', damageType: 'bludgeoning' }, description: 'Grand cervidé des forêts froides, prisé des peuples du nord.' },
    { id: 'loup_geant', cr: 0.25, attackNameEn: "Bite", descriptionEn: "Mount of goblins and wild rangers — fast and silent.", name: 'Loup géant', nameEn: 'Giant Wolf', speed: 50, hp: 26, ac: 13, dexMod: 2, attack: { name: 'Morsure', attackBonus: 5, damage: '2d6+3', damageType: 'piercing' }, description: 'Monture des gobelins et des rôdeurs sauvages — rapide et silencieuse.' },
    { id: 'sanglier_geant', cr: 1, attackNameEn: "Tusks", descriptionEn: "Charges head down, ideal for reckless dwarves.", name: 'Sanglier géant', nameEn: 'Giant Boar', speed: 40, hp: 25, ac: 12, dexMod: 0, attack: { name: 'Défenses', attackBonus: 5, damage: '2d6+3', damageType: 'slashing' }, description: 'Charge tête baissée, idéal pour les nains téméraires.' },
    { id: 'griffon', cr: 2, attackNameEn: "Talons", descriptionEn: "Half eagle, half lion — a proud FLYING mount, dangerous to tame.", name: 'Griffon', nameEn: 'Griffon', speed: 80, flying: true, hp: 40, ac: 12, dexMod: 2, attack: { name: 'Serres', attackBonus: 6, damage: '2d6+4', damageType: 'slashing' }, description: 'Mi-aigle mi-lion — une monture VOLANTE fière et dangereuse à apprivoiser.' },
    { id: 'pegase', cr: 2, attackNameEn: "Hooves", descriptionEn: "A celestial winged horse; it serves only a heart it judges pure.", name: 'Pégase', nameEn: 'Pegasus', speed: 90, flying: true, hp: 40, ac: 12, dexMod: 2, attack: { name: 'Sabots', attackBonus: 6, damage: '2d6+4', damageType: 'bludgeoning' }, description: 'Cheval ailé céleste, ne sert qu\'un cœur qu\'il juge pur.' },
    {
        id: 'destrier_celeste', cr: 1, attackNameEn: "Celestial Hooves", descriptionEn: "A celestial spirit in the shape of a steed, summoned by the paladin (Find Steed). If it falls, the paladin can call it back after a long rest — the bond never dies.", name: 'Destrier céleste', nameEn: 'Celestial Steed', speed: 60, hp: 22, ac: 12, dexMod: 1,
        attack: { name: 'Sabots célestes', attackBonus: 6, damage: '2d6+4', damageType: 'radiant' },
        description: "Esprit céleste sous forme de destrier, invoqué par le paladin (Appel de destrier). S'il tombe, le paladin peut le rappeler après un repos long — le lien ne meurt jamais.",
        classOnly: { class: 'Paladin', minLevel: 5 },
    },
];

/** Le Destrier céleste (Appel de destrier, paladin 5+) : un ESPRIT, pas une
 *  bête. Tombé, il regagne les plans et revient au prochain repos long — la
 *  seule monture qui survit à sa propre mort. */
export const CELESTIAL_STEED_KIND = 'destrier_celeste';

export function getMountType(idOrName: string): MountType | undefined {
    const wanted = norm(idOrName);
    if (!wanted) return undefined;
    return MOUNT_TYPES.find(m => m.id === wanted)
        || MOUNT_TYPES.find(m => norm(m.name) === wanted || norm(m.nameEn) === wanted)
        || MOUNT_TYPES.find(m => norm(m.name).includes(wanted) || wanted.includes(norm(m.name)) || norm(m.nameEn).includes(wanted));
}

// ── Bêtes du Beast Master (Rôdeur) ──────────────────────────────────────────

export interface BeastCompanionType {
    id: string;
    name: string;       // FR
    nameEn: string;
    ac: number;
    dexMod: number;
    attack: { name: string; attackBonus: number; damage: string; damageType: string };
    attackNameEn?: string;
    description: string;
    descriptionEn?: string;
    /** Même rôle que pour les montures : la bête entre dans le budget. */
    cr: number;
}

/** Les PV restent la règle maison commune : max(11, 4 × niveau de rôdeur). */
export const BEAST_COMPANIONS: BeastCompanionType[] = [
    {
        id: 'loup', cr: 0.25, attackNameEn: "Bite", descriptionEn: "The classic: pack instinct, keen nose, a bite that knocks down.", name: 'Loup', nameEn: 'Wolf', ac: 13, dexMod: 2,
        attack: { name: 'Morsure', attackBonus: 4, damage: '2d4+2', damageType: 'piercing' },
        description: 'Le classique : meute, flair, morsure qui renverse.',
    },
    {
        id: 'ours', cr: 1, attackNameEn: "Claws", descriptionEn: "The tank: less agile, hits like a falling tree.", name: 'Ours brun', nameEn: 'Brown Bear', ac: 12, dexMod: 0,
        attack: { name: 'Griffes', attackBonus: 5, damage: '1d8+4', damageType: 'slashing' },
        description: 'Le tank : moins agile, frappe comme un tronc d\'arbre.',
    },
    {
        id: 'panthere', cr: 0.25, attackNameEn: "Bite", descriptionEn: "The stealthy one: fast, ambushing, strikes first.", name: 'Panthère', nameEn: 'Panther', ac: 14, dexMod: 3,
        attack: { name: 'Morsure', attackBonus: 5, damage: '1d6+3', damageType: 'piercing' },
        description: 'La furtive : rapide, embusquée, frappe la première.',
    },
    {
        id: 'faucon', cr: 1, attackNameEn: "Talons", descriptionEn: "The winged scout: hard to hit, harries from the sky.", name: 'Faucon géant', nameEn: 'Giant Hawk', ac: 15, dexMod: 4,
        attack: { name: 'Serres', attackBonus: 5, damage: '1d4+3', damageType: 'slashing' },
        description: 'L\'éclaireur ailé : dur à toucher, harcèle depuis le ciel.',
    },
];

export function getBeastCompanion(idOrName: string): BeastCompanionType | undefined {
    const wanted = norm(idOrName);
    if (!wanted) return undefined;
    return BEAST_COMPANIONS.find(b => b.id === wanted)
        || BEAST_COMPANIONS.find(b => norm(b.name) === wanted || norm(b.nameEn) === wanted)
        || BEAST_COMPANIONS.find(b => norm(b.name).includes(wanted) || wanted.includes(norm(b.name)) || norm(b.nameEn).includes(wanted));
}

export const DEFAULT_BEAST_ID = 'loup';

// ── Familiers (lanceurs de sorts) ───────────────────────────────────────────

export interface FamiliarType {
    id: string;
    name: string;       // FR
    nameEn: string;
    description: string;
    descriptionEn?: string;
    /** Petit talent narratif que le MJ doit exploiter. */
    knack: string;
    knackEn?: string;
}

/** Classes qui peuvent lier un familier : Find Familiar (mages), pacte de la
 *  chaîne (occultiste), esprit animal (druide). */
export const FAMILIAR_CLASSES = ['Mage', 'Wizard', 'Sorcerer', 'Warlock', 'Druid'];

export const FAMILIAR_TYPES: FamiliarType[] = [
    { id: 'chat', descriptionEn: "Silent, haughty, gets in anywhere.", knackEn: "Stealth and night vision — spots whatever prowls in the dark.", name: 'Chat', nameEn: 'Cat', description: 'Silencieux, hautain, passe partout.', knack: 'Discrétion et vision nocturne — repère ce qui rôde dans le noir.' },
    { id: 'hibou', descriptionEn: "Silent flight, great golden eyes.", knackEn: "Flies over and spots — an excellent night scout.", name: 'Hibou', nameEn: 'Owl', description: 'Vol silencieux, grands yeux d\'or.', knack: 'Survole et repère — excellent éclaireur nocturne.' },
    { id: 'corbeau', descriptionEn: "Clever, thieving, mimics words.", knackEn: "Can mimic voices and fetch small objects.", name: 'Corbeau', nameEn: 'Raven', description: 'Malin, voleur, imite des mots.', knack: 'Peut imiter des voix et rapporter de petits objets.' },
    { id: 'rat', descriptionEn: "Slips under doors and through walls.", knackEn: "Eavesdrops on conversations from the corners.", name: 'Rat', nameEn: 'Rat', description: 'Passe sous les portes et dans les murs.', knack: 'Espionne les conversations depuis les recoins.' },
    { id: 'araignee', descriptionEn: "Climbs anything, spins, waits.", knackEn: "Walks on ceilings — ideal for watching unseen.", name: 'Araignée', nameEn: 'Spider', description: 'Grimpe partout, tisse, patiente.', knack: 'Marche aux plafonds — idéale pour surveiller sans être vue.' },
    { id: 'belette', descriptionEn: "Quick, nervous, nosy.", knackEn: "Sharp nose and ears — sniffs out ambushes.", name: 'Belette', nameEn: 'Weasel', description: 'Vive, nerveuse, fouineuse.', knack: 'Odorat et ouïe fines — flaire les embuscades.' },
    { id: 'serpent', descriptionEn: "Cold, precise, hypnotic.", knackEn: "Slides into cracks and senses vibrations.", name: 'Serpent', nameEn: 'Snake', description: 'Froid, précis, hypnotique.', knack: 'Se glisse dans les fissures et perçoit les vibrations.' },
    { id: 'crapaud', descriptionEn: "Placid, amphibious, discreet.", knackEn: "Breathes underwater — scout of marshes and sewers.", name: 'Crapaud', nameEn: 'Toad', description: 'Placide, amphibie, discret.', knack: 'Respire sous l\'eau — éclaireur des marais et égouts.' },
    { id: 'chauve_souris', descriptionEn: "Echolocation, erratic flight.", knackEn: "\"Sees\" in absolute darkness by echolocation.", name: 'Chauve-souris', nameEn: 'Bat', description: 'Écholocation, vol erratique.', knack: '« Voit » dans le noir absolu par écholocation.' },
    { id: 'renard', descriptionEn: "A cunning animal spirit, dear to druids.", knackEn: "Wild instinct — senses nature magic and corrupted places.", name: 'Renard', nameEn: 'Fox', description: 'Esprit animal rusé, cher aux druides.', knack: 'Instinct sauvage — sent la magie de la nature et les lieux corrompus.' },
];

export function getFamiliarType(idOrName: string): FamiliarType | undefined {
    const wanted = norm(idOrName);
    if (!wanted) return undefined;
    return FAMILIAR_TYPES.find(f => f.id === wanted)
        || FAMILIAR_TYPES.find(f => norm(f.name) === wanted || norm(f.nameEn) === wanted)
        || FAMILIAR_TYPES.find(f => norm(f.name).includes(wanted) || wanted.includes(norm(f.name)) || norm(f.nameEn).includes(wanted));
}
