// Feats (Dons) — solo-game adaptation of classic 5e feats.
// All text is paraphrased for this MIT fan game (no verbatim WotC text).
//
// Design contract (see LevelUpModal + rulesEngine integration):
// - `mechanical` holds ONLY what the engine can apply automatically:
//     statBonus       → add to character.stats at pick time (respect the 20 cap)
//     hpPerLevel      → retroactive: +N × level now, +N on every later level
//     initiativeBonus → wired: added to the player's initiative at encounter start
//     speedBonus      → wired: added by getEffectiveSpeed (inline map in types.ts)
//     acBonus / attackBonus → RESERVED, not yet consumed by the engine — do not
//                       rely on them for a new feat until a hook exists
//     advantageOn     → machine-readable contexts where the roll prompt should
//                       receive advantage (lowercase tags, matched by the engine)
//     resistances     → wired: damage types merged into playerResistances
//                       (combat rows at encounter start + out-of-combat damage)
//     special         → machine tag for feats that need a bespoke engine hook
//                       (crit range, power attacks, bonus attacks…)
// - `dmNote` is injected into the AI DM system prompt so the narrative /
//   situational half of the feat is honored even without an engine hook.
// - Feats that normally offer a stat CHOICE (Resilient, Observant, Athlete…)
//   are pinned to one deterministic stat here to stay auto-applicable.

import { Ability } from '../types/index';

export interface FeatMechanical {
    /** Flat ability score increases applied when the feat is taken (cap 20). */
    statBonus?: Partial<Record<Ability, number>>;
    /** Extra max HP per character level, retroactive (Tough-style). */
    hpPerLevel?: number;
    /** Permanent passive AC bonus. */
    acBonus?: number;
    /** Permanent initiative bonus (Alert-style). */
    initiativeBonus?: number;
    /** Permanent walking-speed bonus in feet. */
    speedBonus?: number;
    /** Permanent attack-roll bonus (rare; kept for completeness). */
    attackBonus?: number;
    /** Contexts that should grant advantage, as lowercase machine tags,
     *  e.g. 'concentration_save', 'save_vs_trap', 'perception_hidden'. */
    advantageOn?: string[];
    /** Damage types to append to the player's resistances in combat. */
    resistances?: string[];
    /** Machine tag for feats requiring a dedicated engine hook. */
    special?: string;
}

export interface FeatDef {
    /** kebab-case unique id, e.g. 'great-weapon-master'. */
    id: string;
    /** da-m4 — prérequis SRD vérifiés à la sélection (LevelUpModal). */
    prerequisites?: {
        /** Le personnage doit savoir lancer au moins un sort. */
        spellcaster?: boolean;
        /** Affichage lisible du prérequis. */
        label?: string;
        labelFr?: string;
    };
    name: string;
    nameFr: string;
    /** Short English summary (1 sentence, shown in pickers). */
    description: string;
    descriptionFr: string;
    /** Player-readable bullet effects (English). */
    benefits: string[];
    /** Player-readable bullet effects (French). */
    benefitsFr: string[];
    mechanical: FeatMechanical;
    /** 1-2 sentences for the AI DM system prompt: how to honor the
     *  narrative / situational part of the feat at the table. */
    dmNote: string;
}

export const FEATS: FeatDef[] = [
    {
        id: 'tough',
        name: 'Tough',
        nameFr: 'Robuste',
        description: 'Your endurance is exceptional: you gain extra hit points at every level.',
        descriptionFr: 'Ton endurance est exceptionnelle : tu gagnes des points de vie supplémentaires à chaque niveau.',
        benefits: [
            '+2 max HP per level (retroactive, applies to all your current levels).',
        ],
        benefitsFr: [
            '+2 PV max par niveau (rétroactif, s\'applique à tous tes niveaux actuels).',
        ],
        mechanical: { hpPerLevel: 2 },
        dmNote: 'This character is unusually hardy. Describe them shrugging off punishment that would fell others; the +2 HP/level is already applied mechanically.',
    },
    {
        id: 'alert',
        name: 'Alert',
        nameFr: 'Vigilant',
        description: 'Always on watch, you react before anyone else and cannot be caught off guard.',
        descriptionFr: 'Toujours sur tes gardes, tu réagis avant tout le monde et on ne peut pas te prendre au dépourvu.',
        benefits: [
            '+5 to initiative.',
            'You cannot be surprised while conscious.',
            'Hidden enemies gain no advantage on attacks against you.',
        ],
        benefitsFr: [
            '+5 à l\'initiative.',
            'Tu ne peux pas être surpris tant que tu es conscient.',
            'Les ennemis cachés n\'ont pas l\'avantage à l\'attaque contre toi.',
        ],
        mechanical: { initiativeBonus: 5, special: 'no_surprise' },
        dmNote: 'Never let this character be surprised or ambushed while conscious, and deny unseen attackers advantage against them. Narrate their uncanny watchfulness.',
    },
    {
        id: 'mobile',
        name: 'Mobile',
        nameFr: 'Mobile',
        description: 'You are extraordinarily fast and slippery in a fight.',
        descriptionFr: 'Tu es extraordinairement rapide et insaisissable au combat.',
        benefits: [
            '+10 ft walking speed.',
            'Difficult terrain does not slow you when you Dash.',
            'After a melee attack against a creature, it cannot make opportunity attacks against you this turn.',
        ],
        benefitsFr: [
            '+3 m (10 ft) de vitesse de déplacement.',
            'Le terrain difficile ne te ralentit pas quand tu utilises l\'action Foncer.',
            'Après une attaque de mêlée contre une créature, elle ne peut pas te faire d\'attaque d\'opportunité ce tour.',
        ],
        mechanical: { speedBonus: 10, special: 'mobile_no_opportunity_attacks' },
        dmNote: 'Let this character dart in and out of melee freely: creatures they attacked cannot take opportunity attacks against them that turn, and Dashing ignores difficult terrain.',
    },
    {
        id: 'savage-attacker',
        name: 'Savage Attacker',
        nameFr: 'Attaquant sauvage',
        description: 'Your melee blows land with brutal, inconsistent ferocity — you keep the better hit.',
        descriptionFr: 'Tes coups de mêlée frappent avec une férocité brutale — tu gardes le meilleur impact.',
        benefits: [
            'Once per turn, reroll your melee weapon damage dice and keep the higher result.',
        ],
        benefitsFr: [
            'Une fois par tour, relance les dés de dégâts de ton arme de mêlée et garde le meilleur résultat.',
        ],
        mechanical: { special: 'savage_attacker' },
        dmNote: 'Once per turn, when this character rolls melee weapon damage, roll the dice twice and use the higher total. Describe the extra savagery of the blow.',
    },
    {
        id: 'great-weapon-master',
        name: 'Great Weapon Master',
        nameFr: 'Maître des armes lourdes',
        description: 'You trade precision for devastating power with heavy melee weapons.',
        descriptionFr: 'Tu échanges la précision contre une puissance dévastatrice avec les armes de mêlée lourdes.',
        benefits: [
            'With a heavy melee weapon: you may take -5 to hit for +10 damage.',
            'On a critical hit or when you drop a foe to 0 HP with a melee weapon, make one extra melee attack as a bonus action.',
        ],
        benefitsFr: [
            'Avec une arme de mêlée lourde : tu peux prendre -5 au toucher pour +10 aux dégâts.',
            'Sur un coup critique ou quand tu amènes un ennemi à 0 PV avec une arme de mêlée, effectue une attaque de mêlée supplémentaire en action bonus.',
        ],
        mechanical: { special: 'heavy_weapon_power_attack' },
        dmNote: 'Offer the -5 attack / +10 damage trade whenever they attack with a heavy melee weapon, and grant a bonus-action melee attack when they crit or fell a creature. Play up the cinematic carnage.',
    },
    {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        nameFr: 'Tireur d\'élite',
        description: 'Your ranged shots are surgical at any distance, through any cover.',
        descriptionFr: 'Tes tirs à distance sont chirurgicaux, quelle que soit la distance ou l\'abri.',
        benefits: [
            'With a ranged weapon: you may take -5 to hit for +10 damage.',
            'Long range imposes no disadvantage on your ranged attacks.',
            'Your ranged attacks ignore half and three-quarters cover.',
        ],
        benefitsFr: [
            'Avec une arme à distance : tu peux prendre -5 au toucher pour +10 aux dégâts.',
            'La longue portée n\'impose pas de désavantage à tes attaques à distance.',
            'Tes attaques à distance ignorent les abris partiels (1/2 et 3/4).',
        ],
        mechanical: { special: 'ranged_power_attack' },
        dmNote: 'Offer the -5 attack / +10 damage trade on ranged weapon attacks; never apply long-range disadvantage or half/three-quarters cover penalties to their shots.',
    },
    {
        id: 'polearm-master',
        name: 'Polearm Master',
        nameFr: 'Maître d\'armes d\'hast',
        description: 'With a polearm you control the space around you and never stop striking.',
        descriptionFr: 'Avec une arme d\'hast, tu contrôles l\'espace autour de toi et ne cesses jamais de frapper.',
        benefits: [
            'When you attack with a glaive, halberd, spear or quarterstaff, make a bonus-action butt-end attack (1d4 bludgeoning + ability modifier).',
            'Creatures provoke an opportunity attack from you when they enter your reach.',
        ],
        benefitsFr: [
            'Quand tu attaques avec une coutille, hallebarde, lance ou bâton, effectue une attaque du talon de l\'arme en action bonus (1d4 contondant + modificateur).',
            'Les créatures provoquent une attaque d\'opportunité quand elles ENTRENT dans ton allonge.',
        ],
        mechanical: { special: 'polearm_bonus_attack' },
        dmNote: 'When wielding a polearm (glaive, halberd, spear, quarterstaff), grant a 1d4+mod bonus-action attack after the Attack action, and let them strike enemies that enter their reach.',
    },
    {
        id: 'sentinel',
        name: 'Sentinel',
        nameFr: 'Sentinelle',
        description: 'You are a living wall: no one slips past you or strikes those you protect.',
        descriptionFr: 'Tu es un mur vivant : personne ne te contourne ni ne frappe ceux que tu protèges.',
        benefits: [
            'When you hit with an opportunity attack, the target\'s speed drops to 0 for the turn.',
            'Enemies within your reach provoke opportunity attacks even when they Disengage.',
            'When an enemy within reach attacks someone else, you may strike it as a reaction.',
        ],
        benefitsFr: [
            'Quand tu touches avec une attaque d\'opportunité, la vitesse de la cible tombe à 0 pour le tour.',
            'Les ennemis à ton allonge provoquent des attaques d\'opportunité même s\'ils se désengagent.',
            'Quand un ennemi à ton allonge attaque quelqu\'un d\'autre, tu peux le frapper en réaction.',
        ],
        mechanical: { special: 'sentinel_lockdown' },
        dmNote: 'Enemies cannot safely disengage from or move past this character: opportunity hits stop their movement, and attacking the character\'s allies within reach triggers a reaction strike.',
    },
    {
        id: 'lucky',
        name: 'Lucky',
        nameFr: 'Chanceux',
        description: 'Fate itself bends around you a few times a day.',
        descriptionFr: 'Le destin lui-même se plie devant toi quelques fois par jour.',
        benefits: [
            '3 luck points per long rest.',
            'Spend a point to roll an extra d20 on your attack, check or save and choose which die to use.',
            'Spend a point when attacked to make the attacker use your d20 roll.',
        ],
        benefitsFr: [
            '3 points de chance par repos long.',
            'Dépense un point pour lancer un d20 supplémentaire sur ton attaque, test ou sauvegarde et choisir le dé utilisé.',
            'Dépense un point quand on t\'attaque pour imposer ton d20 à l\'attaquant.',
        ],
        mechanical: { special: 'lucky_points' },
        dmNote: 'Track 3 luck points refreshed on a long rest. Whenever a roll matters, remind the player they may spend one to reroll and keep the die of their choice (or foil an attack roll against them).',
    },
    {
        id: 'resilient-con',
        name: 'Resilient (Constitution)',
        nameFr: 'Résilient (Constitution)',
        description: 'Your body refuses to fail: tougher, and trained to hold spells and life alike.',
        descriptionFr: 'Ton corps refuse de céder : plus dur, et entraîné à tenir bon sous la douleur.',
        benefits: [
            '+1 Constitution (max 20).',
            'You gain proficiency in Constitution saving throws (concentration, poison, exhaustion...).',
        ],
        benefitsFr: [
            '+1 en Constitution (max 20).',
            'Tu gagnes la maîtrise des jets de sauvegarde de Constitution (concentration, poison, épuisement...).',
        ],
        mechanical: { statBonus: { CON: 1 }, special: 'save_proficiency_con' },
        dmNote: 'Add this character\'s proficiency bonus to all Constitution saving throws, including concentration checks when they take damage.',
    },
    {
        id: 'war-caster',
        prerequisites: { spellcaster: true, label: 'Requires: able to cast at least one spell', labelFr: 'Prérequis : capacité à lancer au moins un sort' },
        name: 'War Caster',
        nameFr: 'Mage de guerre',
        description: 'You cast spells in the thick of melee without dropping blade, shield or focus.',
        descriptionFr: 'Tu lances des sorts au cœur de la mêlée sans lâcher lame, bouclier ni concentration.',
        benefits: [
            'Advantage on Constitution saves to maintain concentration.',
            'You can perform somatic components with weapons or a shield in hand.',
            'You may cast a single-target spell instead of a weapon strike as an opportunity attack.',
        ],
        benefitsFr: [
            'Avantage aux sauvegardes de Constitution pour maintenir la concentration.',
            'Tu peux accomplir les composantes gestuelles avec une arme ou un bouclier en main.',
            'Tu peux lancer un sort à cible unique au lieu d\'une attaque d\'arme en attaque d\'opportunité.',
        ],
        mechanical: { advantageOn: ['concentration_save'], special: 'war_caster' },
        dmNote: 'Give advantage on all concentration saves, never penalize casting with full hands, and allow a 1-action single-target spell as their opportunity attack.',
    },
    {
        id: 'elemental-adept-fire',
        prerequisites: { spellcaster: true, label: 'Requires: able to cast at least one spell', labelFr: 'Prérequis : capacité à lancer au moins un sort' },
        name: 'Elemental Adept (Fire)',
        nameFr: 'Adepte élémentaire (Feu)',
        description: 'Your flames burn through wards and never sputter.',
        descriptionFr: 'Tes flammes percent les protections et ne faiblissent jamais.',
        benefits: [
            'Your spells ignore resistance to fire damage.',
            'When rolling fire spell damage, treat any 1 on a die as a 2.',
        ],
        benefitsFr: [
            'Tes sorts ignorent la résistance aux dégâts de feu.',
            'Quand tu lances les dégâts de feu d\'un sort, chaque 1 sur un dé compte comme un 2.',
        ],
        mechanical: { special: 'elemental_adept_fire' },
        dmNote: 'This caster\'s fire spells ignore fire resistance entirely, and their fire damage dice never count 1s (treat each 1 as a 2). Describe their flames as unnaturally intense.',
    },
    {
        id: 'dungeon-delver',
        name: 'Dungeon Delver',
        nameFr: 'Explorateur de donjons',
        description: 'Ruins and crypts hold few secrets — or dangers — for you.',
        descriptionFr: 'Ruines et cryptes n\'ont que peu de secrets — ou de dangers — pour toi.',
        benefits: [
            'Advantage on Perception and Investigation checks to spot secret doors.',
            'Advantage on saving throws against traps, and resistance to trap damage.',
            'Searching for traps at a normal pace does not slow you down.',
        ],
        benefitsFr: [
            'Avantage aux tests de Perception et d\'Investigation pour repérer les portes secrètes.',
            'Avantage aux jets de sauvegarde contre les pièges, et résistance aux dégâts des pièges.',
            'Chercher des pièges en avançant à allure normale ne te ralentit pas.',
        ],
        mechanical: {
            advantageOn: ['perception_secret_doors', 'investigation_secret_doors', 'save_vs_trap'],
            special: 'dungeon_delver',
        },
        dmNote: 'Grant advantage on checks to find secret doors and on saves against traps; halve any trap damage they take. Let them search for traps while traveling at normal pace.',
    },
    {
        id: 'observant',
        name: 'Observant',
        nameFr: 'Observateur',
        description: 'Nothing escapes your eyes — not a whispered word, not a hidden lever.',
        descriptionFr: 'Rien n\'échappe à tes yeux — ni un mot chuchoté, ni un levier dissimulé.',
        benefits: [
            '+1 Wisdom (max 20).',
            '+5 to passive Perception and passive Investigation.',
            'You can read lips of creatures you can see speaking a language you know.',
        ],
        benefitsFr: [
            '+1 en Sagesse (max 20).',
            '+5 à la Perception passive et à l\'Investigation passive.',
            'Tu peux lire sur les lèvres des créatures visibles parlant une langue que tu connais.',
        ],
        mechanical: { statBonus: { WIS: 1 }, special: 'passive_senses_plus_5' },
        dmNote: 'Treat this character\'s passive Perception and Investigation as 5 higher: proactively reveal hidden details, ambushes and clues others would miss, and let them read lips.',
    },
    {
        id: 'mage-slayer',
        name: 'Mage Slayer',
        nameFr: 'Tueur de mages',
        description: 'You have made a craft of cutting spellcasters down mid-incantation.',
        descriptionFr: 'Tu as fait un art d\'abattre les lanceurs de sorts en pleine incantation.',
        benefits: [
            'When a creature within 5 ft casts a spell, you may attack it as a reaction.',
            'Creatures you damage have disadvantage on concentration saves.',
            'Advantage on saves against spells cast within 5 ft of you.',
        ],
        benefitsFr: [
            'Quand une créature à 1,50 m lance un sort, tu peux l\'attaquer en réaction.',
            'Les créatures que tu blesses ont un désavantage à leurs jets de concentration.',
            'Avantage aux sauvegardes contre les sorts lancés à 1,50 m de toi.',
        ],
        mechanical: { advantageOn: ['save_vs_adjacent_spell'], special: 'mage_slayer' },
        dmNote: 'Adjacent enemy spellcasting triggers a reaction attack from this character; casters they damage make concentration saves at disadvantage; they save with advantage against spells cast within 5 ft.',
    },
    {
        id: 'charger',
        name: 'Charger',
        nameFr: 'Chargeur',
        description: 'You turn raw momentum into crushing impact.',
        descriptionFr: 'Tu transformes ton élan en un impact dévastateur.',
        benefits: [
            'After Dashing, you may make one melee attack or shove as a bonus action.',
            'If you moved at least 10 ft in a straight line first: +5 damage on that attack, or push the target 10 ft.',
        ],
        benefitsFr: [
            'Après l\'action Foncer, tu peux faire une attaque de mêlée ou une bousculade en action bonus.',
            'Si tu as d\'abord parcouru au moins 3 m en ligne droite : +5 aux dégâts de cette attaque, ou repousse la cible de 3 m.',
        ],
        mechanical: { special: 'charger_bonus_attack' },
        dmNote: 'When this character Dashes toward an enemy, grant a bonus-action melee attack; if they covered 10+ ft in a straight line, add +5 damage or shove the target 10 ft. Reward cinematic charges.',
    },
    {
        id: 'durable',
        name: 'Durable',
        nameFr: 'Endurant',
        description: 'You recover from wounds with uncanny speed.',
        descriptionFr: 'Tu récupères de tes blessures à une vitesse déconcertante.',
        benefits: [
            '+1 Constitution (max 20).',
            'When you spend Hit Dice to heal, each die restores at least twice your CON modifier.',
        ],
        benefitsFr: [
            '+1 en Constitution (max 20).',
            'Quand tu dépenses des dés de vie pour te soigner, chaque dé rend au minimum deux fois ton modificateur de CON.',
        ],
        mechanical: { statBonus: { CON: 1 }, special: 'durable_hit_die_minimum' },
        dmNote: 'When this character spends Hit Dice during a short rest, each die heals a minimum of twice their Constitution modifier. Describe their remarkable recuperation.',
    },
    {
        id: 'athlete',
        name: 'Athlete',
        nameFr: 'Athlète',
        description: 'Your body answers every physical demand instantly.',
        descriptionFr: 'Ton corps répond instantanément à chaque effort physique.',
        benefits: [
            '+1 Strength (max 20).',
            'Standing up from prone costs only 5 ft of movement.',
            'Climbing does not cost extra movement; running jumps need only 5 ft of run-up.',
        ],
        benefitsFr: [
            '+1 en Force (max 20).',
            'Se relever quand tu es à terre ne coûte que 1,50 m de déplacement.',
            'Grimper ne coûte pas de déplacement supplémentaire ; les sauts avec élan ne demandent que 1,50 m d\'élan.',
        ],
        mechanical: { statBonus: { STR: 1 }, special: 'athlete_movement' },
        dmNote: 'Never slow this character for climbing or standing from prone (5 ft only), and let them make running jumps after just 5 ft of movement. Favor them in feats of athleticism.',
    },
];

/** Fast lookup of a feat by its kebab-case id. Returns undefined if unknown. */
export function getFeatById(id: string): FeatDef | undefined {
    return FEATS.find(f => f.id === id);
}

/** da-m4 — vérifie les prérequis SRD d'un don pour ce personnage (utilisé par
 *  le sélecteur du LevelUpModal : un Barbare ne peut plus prendre War Caster). */
export function meetsFeatPrerequisites(
    feat: FeatDef,
    character: { cantrips?: string[]; knownSpells?: string[]; preparedSpells?: string[]; spellSlots?: Record<string, { max: number }> },
): boolean {
    if (!feat.prerequisites) return true;
    if (feat.prerequisites.spellcaster) {
        const knowsASpell = (character.cantrips || []).length > 0
            || (character.knownSpells || []).length > 0
            || (character.preparedSpells || []).length > 0
            || Object.values(character.spellSlots || {}).some(pool => (pool?.max || 0) > 0);
        if (!knowsASpell) return false;
    }
    return true;
}

/** All feat ids, in display order (handy for validation and pickers). */
export const FEAT_IDS: string[] = FEATS.map(f => f.id);
