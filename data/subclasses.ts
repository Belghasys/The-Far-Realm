// Subclasses / Archetypes for the 12 playable classes (SRD 5.1 + classic options).
// This makes the "Choose Hunter or Beast Master" feature lines REAL: the player
// picks an option (level-up modal or character sheet), the choice is stored in
// character.subclass, its features merge into character.features, and several
// archetypes have direct mechanical hooks in the rules engine:
//   - Champion            → crits on 19-20 (resolveAttackAction)
//   - Hunter              → Colossus Slayer +1d8 vs wounded target (resolveAttackAction)
//   - Beast Master        → wolf companion joins every encounter (startEncounter)
//   - Battle Master       → Superiority Dice resource (defaultResources)
//   - Berserker           → Frenzy bonus-action attack while raging (combat UI)
//   - War Domain          → War Priest bonus-action attack resource (combat UI)
//   - Life Domain         → Disciple of Life +2+slot HP, Supreme Healing L17 (castSpell),
//                           Divine Strike L8 (resolveAttackAction)
//   - Draconic Bloodline  → +1 HP/level (grantXP) and unarmored AC 13+DEX (getBaseACFromArmor)
//   - Zealot              → Divine Fury radiant rider while raging (resolveAttackAction)
//   - Cavalier            → bonded mount +level HP (startEncounter), +1d8 mounted charge
//                           (resolveAttackAction), Défi du cavalier (combat UI → enemy intent)
//   - Oath of Devotion    → Sacred Weapon +CHA attack buff (combat UI)
//   - Oath of Vengeance   → Vow of Enmity advantage (combat UI)
//   - Oath of the Ancients→ Nature's Wrath restrain (combat UI)
//   - School of Evocation → Potent Cantrip L6, Empowered Evocation L10 (castSpell)
//   - Way of the Open Hand→ Wholeness of Body resource (combat UI)
//   - Champion            → Remarkable Athlete L7 half-prof (request_roll)
// Everything else is honored narratively by the DM (the system prompt lists the
// player's subclass features).

import { Feature } from '../types';

export interface SubclassOption {
    id: string;
    /** Canonical name stored in character.subclass — referenced by engine hooks. */
    name: string;
    /** Short pitch shown on the selection card. */
    description: string;
    featuresByLevel: Record<number, Feature[]>;
}

export interface SubclassConfig {
    /** Level at which this class picks its archetype (SRD). */
    level: number;
    /** Display label, e.g. "Ranger Archetype". */
    label: string;
    options: SubclassOption[];
}

export const SUBCLASS_DATA: Record<string, SubclassConfig> = {
    Fighter: {
        level: 3,
        label: 'Archétype martial',
        options: [
            {
                id: 'champion',
                name: 'Champion',
                description: "La perfection physique à l'état pur — tes coups critiques tombent sur 19 ET 20.",
                featuresByLevel: {
                    3: [{ name: 'Improved Critical', description: "Tes attaques d'arme infligent un coup critique sur un 19 ou un 20. (Appliqué automatiquement par le moteur.)" }],
                    7: [{ name: 'Remarkable Athlete', description: "Ajoute la moitié de ton bonus de maîtrise aux tests de FOR/DEX/CON qui n'en profitent pas déjà ; tes sauts avec élan s'allongent de 30 cm par point de mod. FOR." }],
                    10: [{ name: 'Additional Fighting Style', description: 'Choisis un deuxième style de combat.' }],
                    15: [{ name: 'Superior Critical', description: "Tes attaques d'arme infligent un coup critique sur 18-20." }],
                    18: [{ name: 'Survivor', description: 'Au début de chacun de tes tours, si tu es sous la moitié de tes PV (et > 0), regagne 5 + mod. CON PV.' }],
                },
            },
            {
                id: 'battle_master',
                name: 'Battle Master',
                description: 'Un tacticien dont les dés de supériorité alimentent des manœuvres de combat (croc-en-jambe, riposte, feinte…).',
                featuresByLevel: {
                    3: [{ name: 'Combat Superiority', description: "4 dés de supériorité (d8, repos court). Dépenses-en un pour alimenter une manœuvre : Trip (cible à terre), Riposte (contre-attaque), Feinting (avantage), Menacing (effraie), Disarming (désarme)… Ajoute le dé aux dégâts de l'attaque. Annonce la manœuvre au MJ." }],
                    7: [{ name: 'Know Your Enemy', description: "Étudie une créature pendant 1 minute pour savoir si elle t'est égale ou supérieure dans deux caractéristiques." }],
                    10: [{ name: 'Improved Combat Superiority', description: 'Tes dés de supériorité deviennent des d10 (5 dés).' }],
                    15: [{ name: 'Relentless', description: 'Quand tu lances l’initiative sans dé de supériorité restant, tu en regagnes 1.' }],
                    18: [{ name: 'Improved Combat Superiority (d12)', description: 'Tes dés de supériorité deviennent des d12 (6 dés).' }],
                },
            },
            {
                id: 'eldritch_knight',
                name: 'Eldritch Knight',
                description: "Un guerrier qui tisse la magie d'abjuration et d'évocation autour de l'acier.",
                featuresByLevel: {
                    3: [
                        { name: 'Spellcasting (Eldritch Knight)', description: "Apprends 2 tours de magie de magicien et quelques sorts d'abjuration/évocation de niveau 1 (basés sur l'INT). Gère-les avec le MJ via cast_spell." },
                        { name: 'Weapon Bond', description: "Lie une arme par un rituel : impossible de te désarmer, et tu peux l'invoquer en action bonus." },
                    ],
                    7: [{ name: 'War Magic', description: "Quand tu utilises ton action pour lancer un tour de magie, effectue une attaque d'arme en action bonus." }],
                    // da-m9 — la progression s'arrêtait au niveau 7 (les autres
                    // archétypes vont jusqu'à 14-18).
                    10: [{ name: 'Eldritch Strike', description: "Quand tu touches une créature avec une attaque d'arme, elle a un désavantage à sa prochaine sauvegarde contre un de tes sorts avant la fin de ton tour suivant." }],
                    15: [{ name: 'Arcane Charge', description: "Quand tu utilises ton Sursaut d'action, tu peux te téléporter jusqu'à 9 m vers un espace libre que tu vois, avant ou après l'action supplémentaire." }],
                    18: [{ name: 'Improved War Magic', description: "Quand tu utilises ton action pour lancer un SORT (pas seulement un tour de magie), tu peux effectuer une attaque d'arme en action bonus." }],
                },
            },
        ],
    },

    Paladin: {
        level: 3,
        label: 'Serment sacré',
        options: [
            {
                id: 'devotion',
                name: 'Oath of Devotion',
                description: 'Honnêteté, courage, compassion — le classique chevalier resplendissant.',
                featuresByLevel: {
                    3: [
                        { name: 'Sacred Weapon (Channel Divinity)', description: "Action : pendant 1 minute, ajoute ton modificateur de CHA aux jets d'attaque d'une arme (min +1). Elle rayonne d'une lumière sacrée." },
                        { name: 'Turn the Unholy (Channel Divinity)', description: 'Action : les fiélons et morts-vivants à 9 m ou moins réussissent une sauvegarde de SAG ou fuient pendant 1 minute.' },
                    ],
                    7: [{ name: 'Aura of Devotion', description: 'Toi et tes alliés à 3 m ou moins ne pouvez pas être charmés tant que tu es conscient.' }],
                },
            },
            {
                id: 'vengeance',
                name: 'Oath of Vengeance',
                description: "Un vengeur sombre qui a juré de détruire les coupables, quel qu'en soit le prix.",
                featuresByLevel: {
                    3: [
                        { name: 'Vow of Enmity (Channel Divinity)', description: "Action bonus : marque une créature à 3 m ou moins — tu as l'AVANTAGE à tes jets d'attaque contre elle pendant 1 minute." },
                        { name: 'Abjure Enemy (Channel Divinity)', description: 'Action : une créature à 18 m ou moins réussit une sauvegarde de SAG ou est effrayée et a une vitesse de 0 pendant 1 minute.' },
                    ],
                    7: [{ name: 'Relentless Avenger', description: "Quand ton attaque d'opportunité touche, déplace-toi gratuitement jusqu'à la moitié de ta vitesse vers la cible." }],
                },
            },
            {
                id: 'ancients',
                name: 'Oath of the Ancients',
                description: 'Un chevalier vert qui défend la lumière et la nature sauvage contre les ténèbres.',
                featuresByLevel: {
                    3: [
                        { name: "Nature's Wrath (Channel Divinity)", description: 'Action : des lianes spectrales — une créature à 3 m ou moins réussit une sauvegarde de FOR/DEX ou est entravée. (Bouton dédié en combat.)' },
                        { name: 'Turn the Faithless (Channel Divinity)', description: 'Action : les fées et fiélons à 9 m ou moins réussissent une sauvegarde de SAG ou fuient pendant 1 minute.' },
                    ],
                    7: [{ name: 'Aura of Warding', description: 'Toi et tes alliés à 3 m ou moins avez la résistance aux dégâts des sorts.' }],
                },
            },
            {
                id: 'cavalier',
                name: 'Cavalier',
                description: "Le chevalier monté par excellence — charges dévastatrices, monture liée et défi lancé à l'ennemi.",
                featuresByLevel: {
                    3: [
                        { name: 'Monture liée', description: "Ta monture est bénie par ton serment : elle gagne +ton niveau en PV maximum et se bat à tes côtés avec une loyauté sans faille. (Appliqué automatiquement par le moteur — utilise set_mount pour la lier.)" },
                        { name: 'Charge fervente', description: "Quand tu CHARGES à dos de monture (attaque de mêlée sur un ennemi LOIN), ta frappe inflige +1d8 dégâts. (Appliqué automatiquement par le moteur.)" },
                        { name: 'Défi du cavalier (Channel Divinity)', description: "Action bonus : défie un ennemi — il concentre ses assauts sur TOI (le moteur fixe sa cible sur toi). Protège ainsi tes alliés. (Bouton dédié en combat.)" },
                    ],
                    7: [{ name: 'Aura du protecteur', description: 'Ta monture et tes alliés à 3 m ou moins ajoutent +1 à leur CA tant que tu es conscient et en selle.' }],
                    15: [{ name: 'Charge inarrêtable', description: 'Ta Charge fervente inflige +2d8 (au lieu de +1d8) et la cible réussit une sauvegarde de FOR ou est jetée À TERRE.' }],
                },
            },
        ],
    },

    Ranger: {
        level: 3,
        label: 'Archétype de rôdeur',
        options: [
            {
                id: 'hunter',
                name: 'Hunter',
                description: 'Un tueur implacable — Colossus Slayer ajoute +1d8 à une attaque par tour contre un ennemi déjà blessé.',
                featuresByLevel: {
                    3: [{ name: 'Colossus Slayer', description: "Une fois par tour, quand tu touches avec une attaque d'arme une créature sous son maximum de PV, inflige 1d8 dégâts supplémentaires. (Appliqué automatiquement par le moteur.)" }],
                    7: [{ name: 'Steel Will', description: "Avantage aux jets de sauvegarde contre l'état effrayé." }],
                    11: [{ name: 'Whirlwind Attack', description: "Action : effectue une attaque de mêlée contre autant de créatures que tu veux à 1,50 m ou moins, avec un jet d'attaque pour chacune." }],
                    15: [{ name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." }],
                },
            },
            {
                id: 'beast_master',
                name: 'Beast Master',
                description: 'Lie-toi à un compagnon animal (un loup) qui se bat à tes côtés dans chaque bataille.',
                featuresByLevel: {
                    3: [{ name: "Ranger's Companion", description: "Un loup fidèle se bat à tes côtés : il rejoint automatiquement l'initiative comme ALLIÉ dans chaque combat. Le MJ joue son tour (morsure +4, 2d4+2 perforants ; tactique de meute dans l'esprit)." }],
                    7: [{ name: 'Exceptional Training', description: "Ton compagnon peut Foncer, Se désengager ou Aider avec son action quand il n'attaque pas." }],
                    11: [{ name: 'Bestial Fury', description: 'Ton compagnon effectue deux attaques quand il attaque.' }],
                    15: [{ name: 'Share Spells', description: 'Tes sorts qui te ciblent peuvent aussi affecter ton compagnon à 9 m ou moins.' }],
                },
            },
            {
                id: 'gloom_stalker',
                name: 'Gloom Stalker',
                description: "Le prédateur des ténèbres — invisible aux yeux nocturnes, mortel dès le premier round.",
                featuresByLevel: {
                    3: [
                        { name: 'Dread Ambusher', description: "Au PREMIER round de chaque combat : +ton mod. SAG à l'initiative, +3 m de vitesse, et ta première attaque inflige +1d8 dégâts si elle touche. (Annonce l'embuscade au MJ.)" },
                        { name: 'Umbral Sight', description: "Vision dans le noir 18 m (+9 m si tu l'avais déjà). Dans les TÉNÈBRES, tu es INVISIBLE pour les créatures qui comptent sur leur vision nocturne." },
                    ],
                    7: [{ name: 'Iron Mind', description: 'Tu gagnes la maîtrise des jets de sauvegarde de SAGESSE.' }],
                    11: [{ name: 'Stalker\'s Flurry', description: "Une fois par tour, quand tu RATES une attaque d'arme, tu peux en effectuer une autre immédiatement." }],
                },
            },
        ],
    },

    Rogue: {
        level: 3,
        label: 'Archétype de roublard',
        options: [
            {
                id: 'thief',
                name: 'Thief',
                description: "Mains agiles et escalade de façades — le monte-en-l'air ultime.",
                featuresByLevel: {
                    3: [
                        { name: 'Fast Hands', description: "Utilise Cunning Action (action bonus) pour de l'Escamotage, utiliser des outils de voleur ou Utiliser un objet." },
                        { name: 'Second-Story Work', description: "Escalade à pleine vitesse ; tes sauts avec élan s'allongent de 30 cm par point de mod. DEX." },
                    ],
                    9: [{ name: 'Supreme Sneak', description: 'Avantage aux tests de Discrétion si tu ne te déplaces pas de plus de la moitié de ta vitesse.' }],
                },
            },
            {
                id: 'assassin',
                name: 'Assassin',
                description: 'La mort surgie des ombres — des ouvertures dévastatrices contre les ennemis surpris.',
                featuresByLevel: {
                    3: [{ name: 'Assassinate', description: "Avantage aux jets d'attaque contre toute créature qui n'a pas encore agi. Tout coup au but contre une créature SURPRISE est un coup critique. (Préviens le MJ quand tu frappes depuis une embuscade.)" }],
                    9: [{ name: 'Infiltration Expertise', description: "Crée de fausses identités avec du temps et de l'or ; des couvertures sans faille." }],
                },
            },
            {
                id: 'arcane_trickster',
                name: 'Arcane Trickster',
                description: "Un roublard qui pimente ses larcins de magie d'illusion et d'enchantement.",
                featuresByLevel: {
                    3: [
                        { name: 'Spellcasting (Arcane Trickster)', description: "Apprends Mage Hand + 2 tours de magie de magicien et quelques sorts d'illusion/enchantement de niveau 1 (basés sur l'INT)." },
                        { name: 'Mage Hand Legerdemain', description: 'Ta Mage Hand invisible peut ranger/récupérer des objets, crocheter des serrures et faire les poches à distance.' },
                    ],
                    9: [{ name: 'Magical Ambush', description: 'Si tu es caché quand tu lances un sort, la cible a un désavantage à sa sauvegarde.' }],
                    // da-m9 — la progression s'arrêtait au niveau 9.
                    13: [{ name: 'Versatile Trickster', description: 'Action bonus : ta Mage Hand distrait une créature à 1,50 m d\'elle — tu as l\'avantage à tes attaques contre cette créature ce tour-ci.' }],
                    17: [{ name: 'Spell Thief', description: "1/repos long, en réaction : quand une créature lance un sort qui te vise, vole-le — le sort n'a aucun effet sur toi et tu peux le lancer toi-même pendant 8 heures (sauvegarde d'INT du lanceur pour résister)." }],
                },
            },
        ],
    },

    Cleric: {
        level: 1,
        label: 'Domaine divin',
        options: [
            {
                id: 'life',
                name: 'Life Domain',
                description: 'Le grand guérisseur — tes sorts de soins rendent des PV supplémentaires (Disciple of Life).',
                featuresByLevel: {
                    1: [
                        { name: 'Disciple of Life', description: 'Tes sorts de soins de niveau 1+ rendent des PV supplémentaires égaux à 2 + le niveau du sort. (Appliqué automatiquement par le moteur.)' },
                        { name: 'Bonus Proficiency (Heavy Armor)', description: 'Tu gagnes la maîtrise des armures lourdes.' },
                    ],
                    2: [{ name: 'Preserve Life (Channel Divinity)', description: 'Action : répartis 5×niveau de clerc PV de soins entre des créatures à 9 m ou moins (max : la moitié de leurs PV).' }],
                    8: [{ name: 'Divine Strike', description: 'Une fois par tour, +1d8 dégâts radiants quand tu touches avec une arme.' }],
                    17: [{ name: 'Supreme Healing', description: 'Tes dés de soins rendent leur MAXIMUM au lieu d’être lancés.' }],
                },
            },
            {
                id: 'light',
                name: 'Light Domain',
                description: 'Une lumière ardente — des sorts de feu et un éclat qui fait rater les attaques ennemies.',
                featuresByLevel: {
                    1: [
                        { name: 'Warding Flare', description: "Réaction (nombre d'utilisations = mod. SAG, par repos long) : impose le désavantage à un attaquant que tu peux voir à 9 m ou moins." },
                        { name: 'Bonus Cantrip (Light)', description: 'Tu connais le tour de magie Light.' },
                    ],
                    2: [{ name: 'Radiance of the Dawn (Channel Divinity)', description: 'Action : dissipe les ténèbres magiques ; les ennemis à 9 m ou moins réussissent une sauvegarde de CON ou subissent 2d10+niveau dégâts radiants (moitié en cas de réussite).' }],
                },
            },
            {
                id: 'war',
                name: 'War Domain',
                description: "Un prêtre de bataille — des attaques d'arme supplémentaires accordées par ton dieu.",
                featuresByLevel: {
                    1: [
                        { name: 'War Priest', description: "Quand tu effectues l'action Attaquer, tu peux faire une attaque d'arme en ACTION BONUS (nombre d'utilisations = mod. SAG, par repos long). (Un bouton dédié apparaît en combat.)" },
                        { name: 'Bonus Proficiencies (War)', description: 'Maîtrise des armes de guerre et des armures lourdes.' },
                    ],
                    2: [{ name: 'Guided Strike (Channel Divinity)', description: "+10 à un jet d'attaque que tu viens d'effectuer (après avoir vu le dé)." }],
                    8: [{ name: 'Divine Strike', description: "Une fois par tour, +1d8 dégâts du type de l'arme quand tu touches avec une arme." }],
                },
            },
        ],
    },

    Druid: {
        level: 2,
        label: 'Cercle druidique',
        options: [
            {
                id: 'land',
                name: 'Circle of the Land',
                description: "Un gardien mystique des lignes telluriques — sorts supplémentaires et récupération d'emplacements.",
                featuresByLevel: {
                    2: [
                        { name: 'Natural Recovery', description: "Pendant un repos court, récupère des emplacements de sort totalisant jusqu'à la moitié de ton niveau de druide (une fois par repos long)." },
                        { name: 'Circle Spells (Land)', description: 'Sorts bonus liés au terrain de ton choix (forêt, montagne, désert…). Choisis le terrain avec le MJ.' },
                    ],
                    6: [{ name: "Land's Stride", description: 'Le terrain difficile non magique ne te coûte aucun déplacement supplémentaire ; avantage contre les plantes qui te gênent.' }],
                },
            },
            {
                id: 'moon',
                name: 'Circle of the Moon',
                description: 'Un métamorphe sauvage — utilise Wild Shape en combat pour devenir des bêtes plus puissantes.',
                featuresByLevel: {
                    2: [
                        { name: 'Combat Wild Shape', description: "Wild Shape en ACTION BONUS ; sous forme de bête, dépense un emplacement de sort en action bonus pour regagner 1d8 PV par niveau d'emplacement." },
                        { name: 'Circle Forms', description: 'Transforme-toi dès maintenant en bêtes de FP 1 (le FP augmente avec le niveau — dis au MJ quelle bête tu deviens).' },
                    ],
                    6: [{ name: 'Primal Strike', description: 'Tes attaques sous forme de bête comptent comme magiques.' }],
                },
            },
            {
                id: 'spores',
                name: 'Circle of Spores',
                description: "Un symbiote fongique — la mort nourrit la vie, et tes spores rongent ceux qui t'approchent.",
                featuresByLevel: {
                    2: [
                        { name: 'Halo of Spores', description: "Réaction : une créature à 3 m ou moins réussit une sauvegarde de CON (contre ton DD de sort) ou subit 1d4 dégâts nécrotiques (1d6 au niv. 6, 1d8 au 10, 1d10 au 14)." },
                        { name: 'Symbiotic Entity', description: "Action : dépense une utilisation de Wild Shape pour gagner 4×niveau PV temporaires ; tes attaques de mêlée infligent +1d6 nécrotiques et ton Halo de spores double ses dés (10 min)." },
                    ],
                    6: [{ name: 'Fungal Infestation', description: "Réaction quand une bête/humanoïde de FP ≤ 1/4 meurt à 3 m ou moins : il se relève comme ZOMBIE à ton service (1 PV, obéit à tes ordres, 1 h)." }],
                    10: [{ name: 'Spreading Spores', description: 'Action bonus : projette ton Halo de spores dans un cube de 3 m à 9 m ou moins pendant 1 minute.' }],
                },
            },
        ],
    },

    Mage: {
        level: 2,
        label: 'Tradition arcanique',
        options: [
            {
                id: 'evocation',
                name: 'School of Evocation',
                description: "Maître de l'énergie destructrice — protège tes alliés de tes propres déflagrations.",
                featuresByLevel: {
                    2: [{ name: 'Sculpt Spells', description: "Tes sorts d'évocation épargnent jusqu'à 1+niveau du sort alliés dans la zone (ils réussissent automatiquement leur sauvegarde et ne subissent aucun dégât de ton sort)." }],
                    6: [{ name: 'Potent Cantrip', description: 'Les cibles qui réussissent leur sauvegarde contre tes tours de magie offensifs subissent quand même la moitié des dégâts.' }],
                    10: [{ name: 'Empowered Evocation', description: "Ajoute ton modificateur d'INT à un jet de dégâts de tes sorts d'évocation." }],
                    14: [{ name: 'Overchannel', description: 'Un sort de niveau 1-5 inflige ses dégâts MAXIMUM (gratuit la 1re fois, puis dégâts nécrotiques croissants pour toi).' }],
                },
            },
            {
                id: 'abjuration',
                name: 'School of Abjuration',
                description: 'Un spécialiste des protections — un bouclier arcanique qui absorbe les dégâts à ta place.',
                featuresByLevel: {
                    2: [{ name: 'Arcane Ward', description: "Quand tu lances un sort d'abjuration de niveau 1+, crée une protection de 2×niveau+INT PV qui absorbe les dégâts que tu subirais. Se recharge quand tu lances des sorts d'abjuration." }],
                    6: [{ name: 'Projected Ward', description: "Réaction : ton Arcane Ward absorbe les dégâts à la place d'une créature à 9 m ou moins." }],
                },
            },
            {
                id: 'illusion',
                name: 'School of Illusion',
                description: "La réalité n'est qu'une suggestion — duperies améliorées et illusions presque vivantes.",
                featuresByLevel: {
                    2: [{ name: 'Improved Minor Illusion', description: 'Tu connais Minor Illusion ; il peut créer un son ET une image en une seule incantation.' }],
                    6: [{ name: 'Malleable Illusions', description: "Action : remodèle n'importe laquelle de tes illusions en cours." }],
                },
            },
        ],
    },

    Barbarian: {
        level: 3,
        label: 'Voie primitive',
        options: [
            {
                id: 'berserker',
                name: 'Berserker',
                description: 'Violence déchaînée — Frenzy accorde une attaque en action bonus à chaque tour pendant la rage.',
                featuresByLevel: {
                    3: [{ name: 'Frenzy', description: "Quand tu entres en Rage, tu peux entrer en frénésie : effectue une attaque d'arme de mêlée en ACTION BONUS à chacun de tes tours. (Un bouton dédié apparaît en combat pendant la rage.) Tu subis un niveau d'épuisement quand la rage prend fin." }],
                    6: [{ name: 'Mindless Rage', description: 'Tu ne peux être ni charmé ni effrayé pendant ta rage.' }],
                    10: [{ name: 'Intimidating Presence', description: 'Action : effraie une créature à 9 m ou moins (sauvegarde de SAG contre 8+maîtrise+CHA).' }],
                    14: [{ name: 'Retaliation', description: 'Réaction : quand une créature à 1,50 m ou moins te blesse, effectue une attaque de mêlée contre elle.' }],
                },
            },
            {
                id: 'totem',
                name: 'Totem Warrior',
                description: "Une rage guidée par les esprits — le totem de l'Ours te rend presque impossible à tuer.",
                featuresByLevel: {
                    3: [
                        { name: 'Totem Spirit (Bear)', description: "Pendant ta rage, tu as la résistance à TOUS les dégâts sauf psychiques. (Choisis un autre animal totem avec le MJ si tu préfères : Aigle = les attaques d'opportunité contre toi ont le désavantage ; Loup = tes alliés ont l'avantage contre les ennemis à 1,50 m ou moins de toi.)" },
                        { name: 'Spirit Seeker', description: 'Lance Beast Sense et Speak with Animals sous forme de rituels.' },
                    ],
                    6: [{ name: 'Aspect of the Beast', description: 'Gagne un aspect passif de ton animal totem (Ours : capacité de charge doublée, avantage aux tests de FOR).' }],
                    14: [{ name: 'Totemic Attunement (Bear)', description: 'En rage, les ennemis à 1,50 m ou moins ont le désavantage aux attaques contre tout autre que toi.' }],
                },
            },
            {
                id: 'zealot',
                name: 'Zealot',
                description: "Une rage bénie par les dieux de la guerre — ta furie inflige des dégâts radiants et la mort ne veut pas de toi.",
                featuresByLevel: {
                    3: [
                        { name: 'Divine Fury', description: "Pendant ta rage, ta PREMIÈRE attaque réussie de chaque tour inflige +1d6+½ niveau dégâts radiants. (Appliqué automatiquement par le moteur.)" },
                        { name: 'Warrior of the Gods', description: "Les sorts qui te ramènent à la vie ne coûtent AUCUNE composante matérielle — les dieux veulent que tu te relèves." },
                    ],
                    6: [{ name: 'Fanatical Focus', description: 'Une fois par rage, relance une sauvegarde ratée.' }],
                    14: [{ name: 'Rage Beyond Death', description: "En rage, tomber à 0 PV ne te fait PAS perdre conscience — tu ne meurs que si tes jets de mort échouent trois fois pendant que la rage dure." }],
                },
            },
        ],
    },

    Bard: {
        level: 3,
        label: 'Collège bardique',
        options: [
            {
                id: 'lore',
                name: 'College of Lore',
                description: 'Mots cinglants et secrets dérobés — le touche-à-tout ultime.',
                featuresByLevel: {
                    3: [
                        { name: 'Cutting Words', description: "Réaction : dépense un dé de Bardic Inspiration pour le SOUSTRAIRE au jet d'attaque, au test ou au jet de dégâts d'un ennemi à 18 m ou moins." },
                        { name: 'Bonus Proficiencies (Lore)', description: 'Maîtrise de trois compétences de ton choix.' },
                    ],
                    6: [{ name: 'Additional Magical Secrets', description: "Apprends 2 sorts de N'IMPORTE quelle classe." }],
                    14: [{ name: 'Peerless Skill', description: 'Dépense une inspiration bardique pour l’ajouter à TON propre test de caractéristique.' }],
                },
            },
            {
                id: 'valor',
                name: 'College of Valor',
                description: 'Un skalde guerrier — armures, armes et une inspiration qui rend les coups.',
                featuresByLevel: {
                    3: [
                        { name: 'Combat Inspiration', description: "Ta Bardic Inspiration peut aussi s'ajouter à un jet de dégâts, ou à la CA contre une attaque (réaction)." },
                        { name: 'Bonus Proficiencies (Valor)', description: 'Maîtrise des armures intermédiaires, des boucliers et des armes de guerre.' },
                    ],
                    6: [{ name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }],
                    14: [{ name: 'Battle Magic', description: 'Quand tu lances un sort de barde, effectue une attaque d’arme en action bonus.' }],
                },
            },
            {
                id: 'whispers',
                name: 'College of Whispers',
                description: "Le barde que l'on craint — des mots qui poignardent l'esprit et des secrets qui tuent.",
                featuresByLevel: {
                    3: [
                        { name: 'Psychic Blades', description: "Quand tu TOUCHES avec une attaque d'arme, dépense un dé d'Inspiration bardique pour infliger +2d6 dégâts psychiques (3d6 au niv. 5, 5d6 au 10, 8d6 au 15). Annonce-le au MJ sur le coup." },
                        { name: 'Words of Terror', description: "Après 1 minute de conversation, la cible réussit une sauvegarde de SAG ou est EFFRAYÉE de toi (ou d'une créature de ton choix) pendant 1 h." },
                    ],
                    6: [{ name: 'Mantle of Whispers', description: "Quand un humanoïde meurt à 9 m ou moins, capture son OMBRE : revêts-la pour prendre son apparence et accéder à ses souvenirs de surface (1 h)." }],
                    14: [{ name: 'Shadow Lore', description: 'Murmure un secret : la cible réussit une sauvegarde de SAG ou est CHARMÉE et t\'obéit pendant 8 h, persuadée que tu connais son secret le plus sombre.' }],
                },
            },
        ],
    },

    Monk: {
        level: 3,
        label: 'Tradition monastique',
        options: [
            {
                id: 'open_hand',
                name: 'Way of the Open Hand',
                description: 'La technique martiale parfaite — ton Flurry of Blows renverse et déséquilibre.',
                featuresByLevel: {
                    3: [{ name: 'Open Hand Technique', description: "Quand tu touches avec Flurry of Blows, impose un effet : la cible réussit une sauvegarde de DEX ou est mise À TERRE ; une sauvegarde de FOR ou est REPOUSSÉE de 4,50 m ; ou elle ne peut plus utiliser de réaction jusqu'à ton prochain tour." }],
                    6: [{ name: 'Wholeness of Body', description: 'Action : regagne 3×niveau de moine PV (une fois par repos long).' }],
                    11: [{ name: 'Tranquility', description: 'À la fin d’un repos long, tu es sous « sanctuaire » : on doit réussir une sauvegarde de SAG pour t’attaquer (jusqu’à ta première attaque).' }],
                    17: [{ name: 'Quivering Palm', description: 'Dépense 3 ki quand tu touches à mains nues : vibrations létales — à ta demande, la cible fait une sauvegarde de CON ou tombe à 0 PV.' }],
                },
            },
            {
                id: 'shadow',
                name: 'Way of Shadow',
                description: "Un ninja du ki et des ténèbres — téléporte-toi d'ombre en ombre.",
                featuresByLevel: {
                    3: [{ name: 'Shadow Arts', description: 'Dépense 2 ki pour lancer Darkness, Darkvision, Pass without Trace ou Silence. Tu connais Minor Illusion.' }],
                    6: [{ name: 'Shadow Step', description: "Action bonus dans la lumière faible ou les ténèbres : téléporte-toi jusqu'à 18 m vers une autre ombre ; avantage à ta prochaine attaque de mêlée avant la fin du tour." }],
                    11: [{ name: 'Cloak of Shadows', description: 'Action dans la lumière faible/ténèbres : deviens invisible jusqu’à ce que tu attaques ou entres dans la lumière.' }],
                },
            },
            {
                id: 'four_elements',
                name: 'Way of the Four Elements',
                description: "Plie le feu, l'eau, l'air et la pierre à ta volonté grâce à ton ki.",
                featuresByLevel: {
                    3: [{ name: 'Disciple of the Elements', description: 'Dépense du ki pour lancer des disciplines élémentaires (Fangs of the Fire Snake, Water Whip, Fist of Four Thunders…). Choisis tes disciplines avec le MJ.' }],
                },
            },
        ],
    },

    Warlock: {
        level: 1,
        label: "Patron d'outre-monde",
        options: [
            {
                id: 'fiend',
                name: 'The Fiend',
                description: "Un pacte scellé dans les feux de l'enfer — nourris-toi de la vie des ennemis que tu abats.",
                featuresByLevel: {
                    1: [{ name: "Dark One's Blessing", description: "Quand tu réduis une créature hostile à 0 PV, gagne des PV temporaires égaux à mod. CHA + niveau d'occultiste." }],
                    6: [{ name: "Dark One's Own Luck", description: 'Ajoute 1d10 à un test de caractéristique ou une sauvegarde (une fois par repos court, après avoir vu le jet).' }],
                    10: [{ name: 'Fiendish Resilience', description: 'Après un repos, choisis un type de dégâts : tu y résistes jusqu’au prochain choix.' }],
                    14: [{ name: 'Hurl Through Hell', description: '1/repos long, quand tu touches : la cible disparaît en enfer et revient à ton prochain tour avec 10d10 dégâts psychiques.' }],
                },
            },
            {
                id: 'archfey',
                name: 'The Archfey',
                description: 'Un marché conclu avec les seigneurs de Féerie — envoûte et terrifie.',
                featuresByLevel: {
                    1: [{ name: 'Fey Presence', description: "Action : les créatures dans un cube de 3 m autour de toi réussissent une sauvegarde de SAG ou sont charmées/effrayées jusqu'à la fin de ton prochain tour (une fois par repos court)." }],
                    6: [{ name: 'Misty Escape', description: 'Réaction quand tu subis des dégâts : deviens invisible et téléporte-toi de 18 m (une fois par repos court).' }],
                },
            },
            {
                id: 'great_old_one',
                name: 'The Great Old One',
                description: "Des murmures venus d'au-delà des étoiles — télépathie et folie rampante.",
                featuresByLevel: {
                    1: [{ name: 'Awakened Mind', description: 'Parle par télépathie à toute créature que tu peux voir à 9 m ou moins (aucune langue commune nécessaire).' }],
                    6: [{ name: 'Entropic Ward', description: "Réaction : impose le désavantage à une attaque contre toi ; si elle rate, tu as l'avantage à ta prochaine attaque contre cette créature (une fois par repos court)." }],
                },
            },
        ],
    },

    Sorcerer: {
        level: 1,
        label: 'Origine de sorcellerie',
        options: [
            {
                id: 'draconic',
                name: 'Draconic Bloodline',
                description: 'Du sang de dragon coule dans tes veines — plus robuste (+1 PV/niveau), avec des écailles (CA 13+DEX).',
                featuresByLevel: {
                    1: [
                        { name: 'Draconic Resilience', description: "+1 PV maximum par niveau d'ensorceleur ; sans armure, ta CA est de 13 + modificateur de DEX. (Appliqué automatiquement par le moteur.) Choisis ton ancêtre draconique (feu, froid, foudre…) avec le MJ." },
                        { name: 'Dragon Ancestor', description: 'Tu parles, lis et écris le draconique ; bonus de maîtrise doublé aux tests de CHA face aux dragons.' },
                    ],
                    6: [{ name: 'Elemental Affinity', description: "Ajoute ton mod. CHA à un jet de dégâts d'un sort du même type de dégâts que ton ancêtre ; dépense 1 point de sorcellerie pour y gagner la résistance pendant 1 h." }],
                    14: [{ name: 'Dragon Wings', description: 'Action bonus : déploie des ailes draconiques — vitesse de vol égale à ta vitesse au sol.' }],
                    18: [{ name: 'Draconic Presence', description: 'Dépense 5 points de sorcellerie : aura de crainte ou de fascination à 18 m (sauvegarde de SAG).' }],
                },
            },
            {
                id: 'wild_magic',
                name: 'Wild Magic',
                description: "Le chaos à l'état brut déferle dans tes sorts — merveilleusement imprévisible.",
                featuresByLevel: {
                    1: [
                        { name: 'Wild Magic Surge', description: "Après avoir lancé un sort d'ensorceleur de niveau 1+, le MJ peut te faire lancer un d20 : sur un 1, lance sur la table de Magie sauvage — tout peut arriver." },
                        { name: 'Tides of Chaos', description: "Gagne l'avantage à une attaque, un test ou une sauvegarde (se recharge quand une vague de magie sauvage se déclenche ou après un repos long)." },
                    ],
                },
            },
            {
                id: 'storm',
                name: 'Storm Sorcery',
                description: "La tempête vit en toi — le vent te porte, la foudre et le tonnerre répondent à ta colère.",
                featuresByLevel: {
                    1: [
                        { name: 'Wind Speaker', description: 'Tu parles le primordial (et ses dialectes aérien, aquatique, igné et terreux).' },
                        { name: 'Tempestuous Magic', description: "Action bonus quand tu lances un sort de niveau 1+ : des bourrasques te soulèvent — vole de 3 m sans provoquer d'attaques d'opportunité." },
                    ],
                    6: [
                        { name: 'Heart of the Storm', description: 'RÉSISTANCE aux dégâts de foudre et de tonnerre ; quand tu lances un sort de foudre/tonnerre de niveau 1+, les créatures de ton choix à 3 m ou moins subissent ½ niveau d\'ensorceleur dégâts du même type.' },
                        { name: 'Storm Guide', description: 'Apaise la pluie autour de toi ou dirige les vents (utilitaire, sans concentration).' },
                    ],
                    14: [{ name: "Storm's Fury", description: 'Réaction quand une attaque de mêlée te touche : l\'attaquant subit ton niveau en dégâts de foudre et réussit une sauvegarde de FOR ou est repoussé de 6 m.' }],
                },
            },
        ],
    },
};

export function getSubclassConfig(className: string): SubclassConfig | null {
    return SUBCLASS_DATA[className] || null;
}

/** True when this character has reached its archetype level without picking one. */
export function subclassNeedsChoice(character: { class: string; level: number; subclass?: string }): boolean {
    const config = getSubclassConfig(character.class);
    if (!config) return false;
    return !character.subclass && (character.level || 1) >= config.level;
}

/** All features granted by a subclass up to (and including) `level`. */
export function getSubclassFeaturesForLevel(className: string, subclassName: string, level: number): Feature[] {
    const config = getSubclassConfig(className);
    const option = config?.options.find(o => o.name === subclassName || o.id === subclassName);
    if (!option) return [];
    const features: Feature[] = [];
    for (let lvl = 1; lvl <= level; lvl++) {
        if (option.featuresByLevel[lvl]) features.push(...option.featuresByLevel[lvl]);
    }
    return features;
}

/** Features a subclass grants exactly at `level` (for the level-up modal). */
export function getNewSubclassFeaturesAtLevel(className: string, subclassName: string, level: number): Feature[] {
    const config = getSubclassConfig(className);
    const option = config?.options.find(o => o.name === subclassName || o.id === subclassName);
    return option?.featuresByLevel[level] || [];
}
