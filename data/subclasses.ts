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

import { Feature } from '../types/index';

export interface SubclassOption {
    id: string;
    /** Canonical name stored in character.subclass — referenced by engine hooks. */
    name: string;
    /** Miroir d'affichage FR du nom canonique (2026-08-27) : « Battle Master »
     *  s'affichait tel quel au milieu d'un écran français. */
    nameFr?: string;
    /** Short pitch shown on the selection card. */
    description: string;
    /** Miroir d'affichage EN de la description (la donnée est française). */
    descriptionEn?: string;
    featuresByLevel: Record<number, Feature[]>;
}

export interface SubclassConfig {
    /** Level at which this class picks its archetype (SRD). */
    level: number;
    /** Display label, e.g. "Ranger Archetype". Français : c'est la donnée. */
    label: string;
    /** Miroir d'affichage anglais du libellé. */
    labelEn?: string;
    options: SubclassOption[];
}

export const SUBCLASS_DATA: Record<string, SubclassConfig> = {
    Fighter: {
        level: 3,
        label: 'Archétype martial',
        labelEn: "Martial Archetype",
        options: [
            {
                id: 'champion',
                nameFr: "Champion",
                descriptionEn: "Pure physical perfection — your critical hits land on 19 AND 20.",
                name: 'Champion',
                description: "La perfection physique à l'état pur — tes coups critiques tombent sur 19 ET 20.",
                featuresByLevel: {
                    3: [{ nameFr: "Critique amélioré", descriptionEn: "Your weapon attacks score a critical hit on a roll of 19 or 20. (Applied automatically by the engine.)", name: 'Improved Critical', description: "Tes attaques d'arme infligent un coup critique sur un 19 ou un 20. (Appliqué automatiquement par le moteur.)" }],
                    7: [{ nameFr: "Athlète remarquable", descriptionEn: "Add half your proficiency bonus to STR/DEX/CON checks that don't already use it; your running long jump increases by a number of feet equal to your STR modifier.", name: 'Remarkable Athlete', description: "Ajoute la moitié de ton bonus de maîtrise aux tests de FOR/DEX/CON qui n'en profitent pas déjà ; tes sauts avec élan s'allongent de 30 cm par point de mod. FOR." }],
                    10: [{ nameFr: "Style de combat supplémentaire", descriptionEn: "Choose a second Fighting Style.", name: 'Additional Fighting Style', description: 'Choisis un deuxième style de combat.' }],
                    15: [{ nameFr: "Critique supérieur", descriptionEn: "Your weapon attacks score a critical hit on a roll of 18-20.", name: 'Superior Critical', description: "Tes attaques d'arme infligent un coup critique sur 18-20." }],
                    18: [{ nameFr: "Survivant", descriptionEn: "At the start of each of your turns, if you are below half your HP (and above 0), regain 5 + your CON modifier HP.", name: 'Survivor', description: 'Au début de chacun de tes tours, si tu es sous la moitié de tes PV (et > 0), regagne 5 + mod. CON PV.' }],
                },
            },
            {
                id: 'battle_master',
                nameFr: "Maître de guerre",
                descriptionEn: "A tactician whose superiority dice fuel combat maneuvers (trip, riposte, feint…).",
                name: 'Battle Master',
                description: 'Un tacticien dont les dés de supériorité alimentent des manœuvres de combat (croc-en-jambe, riposte, feinte…).',
                featuresByLevel: {
                    3: [{ nameFr: "Supériorité martiale", descriptionEn: "4 superiority dice (d8, short rest). Spend one to fuel a maneuver: Trip (knock prone), Riposte (counterattack), Feinting (advantage), Menacing (frighten), Disarming… Add the die to the attack's damage. Declare the maneuver to the DM.", name: 'Combat Superiority', description: "4 dés de supériorité (d8, repos court). Dépenses-en un pour alimenter une manœuvre : Trip (cible à terre), Riposte (contre-attaque), Feinting (avantage), Menacing (effraie), Disarming (désarme)… Ajoute le dé aux dégâts de l'attaque. Annonce la manœuvre au MJ." }],
                    7: [{ nameFr: "Connaître son ennemi", descriptionEn: "Study a creature for 1 minute to learn whether it is your equal or your superior in two ability scores.", name: 'Know Your Enemy', description: "Étudie une créature pendant 1 minute pour savoir si elle t'est égale ou supérieure dans deux caractéristiques." }],
                    10: [{ nameFr: "Supériorité martiale améliorée", descriptionEn: "Your superiority dice become d10s (5 dice).", name: 'Improved Combat Superiority', description: 'Tes dés de supériorité deviennent des d10 (5 dés).' }],
                    15: [{ nameFr: "Acharnement", descriptionEn: "When you roll initiative with no superiority dice left, you regain 1.", name: 'Relentless', description: 'Quand tu lances l’initiative sans dé de supériorité restant, tu en regagnes 1.' }],
                    18: [{ nameFr: "Supériorité martiale améliorée (d12)", descriptionEn: "Your superiority dice become d12s (6 dice).", name: 'Improved Combat Superiority (d12)', description: 'Tes dés de supériorité deviennent des d12 (6 dés).' }],
                },
            },
            {
                id: 'eldritch_knight',
                nameFr: "Chevalier occulte",
                descriptionEn: "A fighter who weaves abjuration and evocation magic around steel.",
                name: 'Eldritch Knight',
                description: "Un guerrier qui tisse la magie d'abjuration et d'évocation autour de l'acier.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Incantation (Chevalier occulte)", descriptionEn: "Learn 2 wizard cantrips and a few level-1 abjuration/evocation spells (INT-based). Handle them with the DM via cast_spell.", name: 'Spellcasting (Eldritch Knight)', description: "Apprends 2 tours de magie de magicien et quelques sorts d'abjuration/évocation de niveau 1 (basés sur l'INT). Gère-les avec le MJ via cast_spell." },
                        { nameFr: "Lien avec une arme", descriptionEn: "Ritually bond with a weapon: you cannot be disarmed of it, and you can summon it as a bonus action.", name: 'Weapon Bond', description: "Lie une arme par un rituel : impossible de te désarmer, et tu peux l'invoquer en action bonus." },
                    ],
                    7: [{ nameFr: "Magie de guerre", descriptionEn: "When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.", name: 'War Magic', description: "Quand tu utilises ton action pour lancer un tour de magie, effectue une attaque d'arme en action bonus." }],
                    // da-m9 — la progression s'arrêtait au niveau 7 (les autres
                    // archétypes vont jusqu'à 14-18).
                    10: [{ nameFr: "Frappe occulte", descriptionEn: "When you hit a creature with a weapon attack, it has disadvantage on its next saving throw against one of your spells before the end of your next turn.", name: 'Eldritch Strike', description: "Quand tu touches une créature avec une attaque d'arme, elle a un désavantage à sa prochaine sauvegarde contre un de tes sorts avant la fin de ton tour suivant." }],
                    15: [{ nameFr: "Charge arcanique", descriptionEn: "When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see, before or after the extra action.", name: 'Arcane Charge', description: "Quand tu utilises ton Sursaut d'action, tu peux te téléporter jusqu'à 9 m vers un espace libre que tu vois, avant ou après l'action supplémentaire." }],
                    18: [{ nameFr: "Magie de guerre améliorée", descriptionEn: "When you use your action to cast a SPELL (not just a cantrip), you can make one weapon attack as a bonus action.", name: 'Improved War Magic', description: "Quand tu utilises ton action pour lancer un SORT (pas seulement un tour de magie), tu peux effectuer une attaque d'arme en action bonus." }],
                },
            },
        ],
    },

    Paladin: {
        level: 3,
        label: 'Serment sacré',
        labelEn: "Sacred Oath",
        options: [
            {
                id: 'devotion',
                nameFr: "Serment de Dévotion",
                descriptionEn: "Honesty, courage, compassion — the classic shining knight.",
                name: 'Oath of Devotion',
                description: 'Honnêteté, courage, compassion — le classique chevalier resplendissant.',
                featuresByLevel: {
                    3: [
                        { nameFr: "Arme sacrée (Canalisation d'énergie divine)", descriptionEn: "Action: for 1 minute, add your CHA modifier to attack rolls with one weapon (min +1). It shines with holy light.", name: 'Sacred Weapon (Channel Divinity)', description: "Action : pendant 1 minute, ajoute ton modificateur de CHA aux jets d'attaque d'une arme (min +1). Elle rayonne d'une lumière sacrée." },
                        { nameFr: "Renvoi des impies (Canalisation d'énergie divine)", descriptionEn: "Action: fiends and undead within 30 feet must succeed on a WIS save or flee for 1 minute.", name: 'Turn the Unholy (Channel Divinity)', description: 'Action : les fiélons et morts-vivants à 9 m ou moins réussissent une sauvegarde de SAG ou fuient pendant 1 minute.' },
                    ],
                    7: [{ nameFr: "Aura de dévotion", descriptionEn: "You and allies within 10 feet cannot be charmed while you are conscious.", name: 'Aura of Devotion', description: 'Toi et tes alliés à 3 m ou moins ne pouvez pas être charmés tant que tu es conscient.' }],
                },
            },
            {
                id: 'vengeance',
                nameFr: "Serment de Vengeance",
                descriptionEn: "A dark avenger sworn to destroy the guilty, whatever the cost.",
                name: 'Oath of Vengeance',
                description: "Un vengeur sombre qui a juré de détruire les coupables, quel qu'en soit le prix.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Vœu d'inimitié (Canalisation d'énergie divine)", descriptionEn: "Bonus action: mark a creature within 10 feet — you have ADVANTAGE on attack rolls against it for 1 minute.", name: 'Vow of Enmity (Channel Divinity)', description: "Action bonus : marque une créature à 3 m ou moins — tu as l'AVANTAGE à tes jets d'attaque contre elle pendant 1 minute." },
                        { nameFr: "Répudiation de l'ennemi (Canalisation d'énergie divine)", descriptionEn: "Action: a creature within 60 feet must succeed on a WIS save or be frightened and have a speed of 0 for 1 minute.", name: 'Abjure Enemy (Channel Divinity)', description: 'Action : une créature à 18 m ou moins réussit une sauvegarde de SAG ou est effrayée et a une vitesse de 0 pendant 1 minute.' },
                    ],
                    7: [{ nameFr: "Vengeur implacable", descriptionEn: "When your opportunity attack hits, move up to half your speed toward the target for free.", name: 'Relentless Avenger', description: "Quand ton attaque d'opportunité touche, déplace-toi gratuitement jusqu'à la moitié de ta vitesse vers la cible." }],
                },
            },
            {
                id: 'ancients',
                nameFr: "Serment des Anciens",
                descriptionEn: "A green knight defending light and the wild against the dark.",
                name: 'Oath of the Ancients',
                description: 'Un chevalier vert qui défend la lumière et la nature sauvage contre les ténèbres.',
                featuresByLevel: {
                    3: [
                        { nameFr: "Courroux de la nature (Canalisation d'énergie divine)", descriptionEn: "Action: spectral vines — a creature within 10 feet must succeed on a STR/DEX save or be restrained. (Dedicated button in combat.)", name: "Nature's Wrath (Channel Divinity)", description: 'Action : des lianes spectrales — une créature à 3 m ou moins réussit une sauvegarde de FOR/DEX ou est entravée. (Bouton dédié en combat.)' },
                        { nameFr: "Renvoi des infidèles (Canalisation d'énergie divine)", descriptionEn: "Action: fey and fiends within 30 feet must succeed on a WIS save or flee for 1 minute.", name: 'Turn the Faithless (Channel Divinity)', description: 'Action : les fées et fiélons à 9 m ou moins réussissent une sauvegarde de SAG ou fuient pendant 1 minute.' },
                    ],
                    7: [{ nameFr: "Aura de protection", descriptionEn: "You and allies within 10 feet have resistance to damage from spells.", name: 'Aura of Warding', description: 'Toi et tes alliés à 3 m ou moins avez la résistance aux dégâts des sorts.' }],
                },
            },
            {
                id: 'cavalier',
                nameFr: "Cavalier",
                descriptionEn: "The mounted knight par excellence — devastating charges, a bonded mount, and a challenge thrown at the enemy.",
                name: 'Cavalier',
                description: "Le chevalier monté par excellence — charges dévastatrices, monture liée et défi lancé à l'ennemi.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Monture liée", descriptionEn: "Your mount is blessed by your oath: it gains +your level in maximum HP and fights at your side with unshakeable loyalty. (Applied automatically by the engine — use set_mount to bond it.)", name: 'Monture liée', description: "Ta monture est bénie par ton serment : elle gagne +ton niveau en PV maximum et se bat à tes côtés avec une loyauté sans faille. (Appliqué automatiquement par le moteur — utilise set_mount pour la lier.)" },
                        { nameFr: "Charge fervente", descriptionEn: "When you CHARGE while mounted (a melee attack on a FAR enemy), your strike deals +1d8 damage. (Applied automatically by the engine.)", name: 'Charge fervente', description: "Quand tu CHARGES à dos de monture (attaque de mêlée sur un ennemi LOIN), ta frappe inflige +1d8 dégâts. (Appliqué automatiquement par le moteur.)" },
                        { nameFr: "Défi du cavalier (Canalisation d'énergie divine)", descriptionEn: "Bonus action: challenge an enemy — it focuses its assaults on YOU (the engine locks its target onto you). This is how you shield your allies. (Dedicated button in combat.)", name: 'Défi du cavalier (Channel Divinity)', description: "Action bonus : défie un ennemi — il concentre ses assauts sur TOI (le moteur fixe sa cible sur toi). Protège ainsi tes alliés. (Bouton dédié en combat.)" },
                    ],
                    7: [{ nameFr: "Aura du protecteur", descriptionEn: "Your mount and allies within 10 feet add +1 to their AC while you are conscious and in the saddle.", name: 'Aura du protecteur', description: 'Ta monture et tes alliés à 3 m ou moins ajoutent +1 à leur CA tant que tu es conscient et en selle.' }],
                    15: [{ nameFr: "Charge inarrêtable", descriptionEn: "Your Fervent Charge deals +2d8 (instead of +1d8) and the target must succeed on a STR save or be knocked PRONE.", name: 'Charge inarrêtable', description: 'Ta Charge fervente inflige +2d8 (au lieu de +1d8) et la cible réussit une sauvegarde de FOR ou est jetée À TERRE.' }],
                },
            },
        ],
    },

    Ranger: {
        level: 3,
        label: 'Archétype de rôdeur',
        labelEn: "Ranger Archetype",
        options: [
            {
                id: 'hunter',
                nameFr: "Chasseur",
                descriptionEn: "A relentless killer — Colossus Slayer adds +1d8 to one attack per turn against an already wounded enemy.",
                name: 'Hunter',
                description: 'Un tueur implacable — Colossus Slayer ajoute +1d8 à une attaque par tour contre un ennemi déjà blessé.',
                featuresByLevel: {
                    3: [{ nameFr: "Pourfendeur de colosses", descriptionEn: "Once per turn, when you hit a creature below its HP maximum with a weapon attack, deal an extra 1d8 damage. (Applied automatically by the engine.)", name: 'Colossus Slayer', description: "Une fois par tour, quand tu touches avec une attaque d'arme une créature sous son maximum de PV, inflige 1d8 dégâts supplémentaires. (Appliqué automatiquement par le moteur.)" }],
                    7: [{ nameFr: "Volonté d'acier", descriptionEn: "Advantage on saving throws against being frightened.", name: 'Steel Will', description: "Avantage aux jets de sauvegarde contre l'état effrayé." }],
                    11: [{ nameFr: "Attaque tourbillonnante", descriptionEn: "Action: make a melee attack against any number of creatures within 5 feet, with a separate attack roll for each.", name: 'Whirlwind Attack', description: "Action : effectue une attaque de mêlée contre autant de créatures que tu veux à 1,50 m ou moins, avec un jet d'attaque pour chacune." }],
                    15: [{ nameFr: "Esquive instinctive", descriptionEn: "DEX saves: no damage on a success, half on a failure.", name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." }],
                },
            },
            {
                id: 'beast_master',
                nameFr: "Maître des bêtes",
                descriptionEn: "Bond with an animal companion (a wolf) that fights at your side in every battle.",
                name: 'Beast Master',
                description: 'Lie-toi à un compagnon animal (un loup) qui se bat à tes côtés dans chaque bataille.',
                featuresByLevel: {
                    3: [{ nameFr: "Compagnon animal", descriptionEn: "A faithful wolf fights at your side: it automatically joins initiative as an ALLY in every combat. The DM plays its turn (bite +4, 2d4+2 piercing; pack tactics in spirit).", name: "Ranger's Companion", description: "Un loup fidèle se bat à tes côtés : il rejoint automatiquement l'initiative comme ALLIÉ dans chaque combat. Le MJ joue son tour (morsure +4, 2d4+2 perforants ; tactique de meute dans l'esprit)." }],
                    7: [{ nameFr: "Entraînement exceptionnel", descriptionEn: "Your companion can Dash, Disengage or Help with its action when it doesn't attack.", name: 'Exceptional Training', description: "Ton compagnon peut Foncer, Se désengager ou Aider avec son action quand il n'attaque pas." }],
                    11: [{ nameFr: "Furie bestiale", descriptionEn: "Your companion makes two attacks when it attacks.", name: 'Bestial Fury', description: 'Ton compagnon effectue deux attaques quand il attaque.' }],
                    15: [{ nameFr: "Partage des sorts", descriptionEn: "Your spells that target you can also affect your companion within 30 feet.", name: 'Share Spells', description: 'Tes sorts qui te ciblent peuvent aussi affecter ton compagnon à 9 m ou moins.' }],
                },
            },
            {
                id: 'gloom_stalker',
                nameFr: "Traqueur des ténèbres",
                descriptionEn: "The predator of the dark — invisible to night eyes, deadly from the very first round.",
                name: 'Gloom Stalker',
                description: "Le prédateur des ténèbres — invisible aux yeux nocturnes, mortel dès le premier round.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Embuscade terrifiante", descriptionEn: "On the FIRST round of every combat: +your WIS modifier to initiative, +10 feet of speed, and your first attack deals +1d8 damage on a hit. (Announce the ambush to the DM.)", name: 'Dread Ambusher', description: "Au PREMIER round de chaque combat : +ton mod. SAG à l'initiative, +3 m de vitesse, et ta première attaque inflige +1d8 dégâts si elle touche. (Annonce l'embuscade au MJ.)" },
                        { nameFr: "Vue de pénombre", descriptionEn: "Darkvision 60 feet (+30 feet if you already had it). In DARKNESS you are INVISIBLE to creatures relying on darkvision.", name: 'Umbral Sight', description: "Vision dans le noir 18 m (+9 m si tu l'avais déjà). Dans les TÉNÈBRES, tu es INVISIBLE pour les créatures qui comptent sur leur vision nocturne." },
                    ],
                    7: [{ nameFr: "Esprit de fer", descriptionEn: "You gain proficiency in WISDOM saving throws.", name: 'Iron Mind', description: 'Tu gagnes la maîtrise des jets de sauvegarde de SAGESSE.' }],
                    11: [{ nameFr: "Déluge du traqueur", descriptionEn: "Once per turn, when you MISS with a weapon attack, you can make another one immediately.", name: 'Stalker\'s Flurry', description: "Une fois par tour, quand tu RATES une attaque d'arme, tu peux en effectuer une autre immédiatement." }],
                },
            },
        ],
    },

    Rogue: {
        level: 3,
        label: 'Archétype de roublard',
        labelEn: "Roguish Archetype",
        options: [
            {
                id: 'thief',
                nameFr: "Voleur",
                descriptionEn: "Nimble hands and façade climbing — the ultimate cat burglar.",
                name: 'Thief',
                description: "Mains agiles et escalade de façades — le monte-en-l'air ultime.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Mains agiles", descriptionEn: "Use Cunning Action (bonus action) for Sleight of Hand, to use thieves' tools, or to Use an Object.", name: 'Fast Hands', description: "Utilise Cunning Action (action bonus) pour de l'Escamotage, utiliser des outils de voleur ou Utiliser un objet." },
                        { nameFr: "Monte-en-l'air", descriptionEn: "Climb at full speed; your running long jump increases by a number of feet equal to your DEX modifier.", name: 'Second-Story Work', description: "Escalade à pleine vitesse ; tes sauts avec élan s'allongent de 30 cm par point de mod. DEX." },
                    ],
                    9: [{ nameFr: "Discrétion suprême", descriptionEn: "Advantage on Stealth checks if you move no more than half your speed.", name: 'Supreme Sneak', description: 'Avantage aux tests de Discrétion si tu ne te déplaces pas de plus de la moitié de ta vitesse.' }],
                },
            },
            {
                id: 'assassin',
                nameFr: "Assassin",
                descriptionEn: "Death out of the shadows — devastating openers against surprised enemies.",
                name: 'Assassin',
                description: 'La mort surgie des ombres — des ouvertures dévastatrices contre les ennemis surpris.',
                featuresByLevel: {
                    3: [{ nameFr: "Assassinat", descriptionEn: "Advantage on attack rolls against any creature that hasn't taken a turn yet. Any hit against a SURPRISED creature is a critical hit. (Tell the DM when you strike from an ambush.)", name: 'Assassinate', description: "Avantage aux jets d'attaque contre toute créature qui n'a pas encore agi. Tout coup au but contre une créature SURPRISE est un coup critique. (Préviens le MJ quand tu frappes depuis une embuscade.)" }],
                    9: [{ nameFr: "Expert en infiltration", descriptionEn: "Create false identities with time and gold; flawless cover stories.", name: 'Infiltration Expertise', description: "Crée de fausses identités avec du temps et de l'or ; des couvertures sans faille." }],
                },
            },
            {
                id: 'arcane_trickster',
                nameFr: "Escroc arcanique",
                descriptionEn: "A rogue who spices up their thieving with illusion and enchantment magic.",
                name: 'Arcane Trickster',
                description: "Un roublard qui pimente ses larcins de magie d'illusion et d'enchantement.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Incantation (Escroc arcanique)", descriptionEn: "Learn Mage Hand + 2 wizard cantrips and a few level-1 illusion/enchantment spells (INT-based).", name: 'Spellcasting (Arcane Trickster)', description: "Apprends Mage Hand + 2 tours de magie de magicien et quelques sorts d'illusion/enchantement de niveau 1 (basés sur l'INT)." },
                        { nameFr: "Prestidigitation de la main du mage", descriptionEn: "Your invisible Mage Hand can stow/retrieve objects, pick locks and pick pockets at range.", name: 'Mage Hand Legerdemain', description: 'Ta Mage Hand invisible peut ranger/récupérer des objets, crocheter des serrures et faire les poches à distance.' },
                    ],
                    9: [{ nameFr: "Embuscade magique", descriptionEn: "If you are hidden when you cast a spell, the target has disadvantage on its saving throw.", name: 'Magical Ambush', description: 'Si tu es caché quand tu lances un sort, la cible a un désavantage à sa sauvegarde.' }],
                    // da-m9 — la progression s'arrêtait au niveau 9.
                    13: [{ nameFr: "Escroc polyvalent", descriptionEn: "Bonus action: your Mage Hand distracts a creature within 5 feet of it — you have advantage on attacks against that creature this turn.", name: 'Versatile Trickster', description: 'Action bonus : ta Mage Hand distrait une créature à 1,50 m d\'elle — tu as l\'avantage à tes attaques contre cette créature ce tour-ci.' }],
                    17: [{ nameFr: "Voleur de sorts", descriptionEn: "1/long rest, as a reaction: when a creature casts a spell targeting you, steal it — the spell has no effect on you and you can cast it yourself for 8 hours (the caster makes an INT save to resist).", name: 'Spell Thief', description: "1/repos long, en réaction : quand une créature lance un sort qui te vise, vole-le — le sort n'a aucun effet sur toi et tu peux le lancer toi-même pendant 8 heures (sauvegarde d'INT du lanceur pour résister)." }],
                },
            },
        ],
    },

    Cleric: {
        level: 1,
        label: 'Domaine divin',
        labelEn: "Divine Domain",
        options: [
            {
                id: 'life',
                nameFr: "Domaine de la Vie",
                descriptionEn: "The great healer — your healing spells restore extra HP (Disciple of Life).",
                name: 'Life Domain',
                description: 'Le grand guérisseur — tes sorts de soins rendent des PV supplémentaires (Disciple of Life).',
                featuresByLevel: {
                    1: [
                        { nameFr: "Disciple de la vie", descriptionEn: "Your level-1+ healing spells restore extra HP equal to 2 + the spell's level. (Applied automatically by the engine.)", name: 'Disciple of Life', description: 'Tes sorts de soins de niveau 1+ rendent des PV supplémentaires égaux à 2 + le niveau du sort. (Appliqué automatiquement par le moteur.)' },
                        { nameFr: "Maîtrise supplémentaire (armures lourdes)", descriptionEn: "You gain proficiency with heavy armor.", name: 'Bonus Proficiency (Heavy Armor)', description: 'Tu gagnes la maîtrise des armures lourdes.' },
                    ],
                    2: [{ nameFr: "Préservation de la vie (Canalisation d'énergie divine)", descriptionEn: "Action: distribute 5×your cleric level HP of healing among creatures within 30 feet (max: half their HP each).", name: 'Preserve Life (Channel Divinity)', description: 'Action : répartis 5×niveau de clerc PV de soins entre des créatures à 9 m ou moins (max : la moitié de leurs PV).' }],
                    8: [{ nameFr: "Frappe divine", descriptionEn: "Once per turn, +1d8 radiant damage when you hit with a weapon.", name: 'Divine Strike', description: 'Une fois par tour, +1d8 dégâts radiants quand tu touches avec une arme.' }],
                    17: [{ nameFr: "Guérison suprême", descriptionEn: "Your healing dice restore their MAXIMUM instead of being rolled.", name: 'Supreme Healing', description: 'Tes dés de soins rendent leur MAXIMUM au lieu d’être lancés.' }],
                },
            },
            {
                id: 'light',
                nameFr: "Domaine de la Lumière",
                descriptionEn: "A burning light — fire spells and a flare that makes enemy attacks miss.",
                name: 'Light Domain',
                description: 'Une lumière ardente — des sorts de feu et un éclat qui fait rater les attaques ennemies.',
                featuresByLevel: {
                    1: [
                        { nameFr: "Éclat protecteur", descriptionEn: "Reaction (uses = your WIS modifier, per long rest): impose disadvantage on an attacker you can see within 30 feet.", name: 'Warding Flare', description: "Réaction (nombre d'utilisations = mod. SAG, par repos long) : impose le désavantage à un attaquant que tu peux voir à 9 m ou moins." },
                        { nameFr: "Tour de magie supplémentaire (Lumière)", descriptionEn: "You know the Light cantrip.", name: 'Bonus Cantrip (Light)', description: 'Tu connais le tour de magie Light.' },
                    ],
                    2: [{ nameFr: "Éclat de l'aube (Canalisation d'énergie divine)", descriptionEn: "Action: dispel magical darkness; enemies within 30 feet must succeed on a CON save or take 2d10+level radiant damage (half on a success).", name: 'Radiance of the Dawn (Channel Divinity)', description: 'Action : dissipe les ténèbres magiques ; les ennemis à 9 m ou moins réussissent une sauvegarde de CON ou subissent 2d10+niveau dégâts radiants (moitié en cas de réussite).' }],
                },
            },
            {
                id: 'war',
                nameFr: "Domaine de la Guerre",
                descriptionEn: "A battle priest — extra weapon attacks granted by your god.",
                name: 'War Domain',
                description: "Un prêtre de bataille — des attaques d'arme supplémentaires accordées par ton dieu.",
                featuresByLevel: {
                    1: [
                        { nameFr: "Prêtre de guerre", descriptionEn: "When you take the Attack action, you can make one weapon attack as a BONUS ACTION (uses = your WIS modifier, per long rest). (A dedicated button appears in combat.)", name: 'War Priest', description: "Quand tu effectues l'action Attaquer, tu peux faire une attaque d'arme en ACTION BONUS (nombre d'utilisations = mod. SAG, par repos long). (Un bouton dédié apparaît en combat.)" },
                        { nameFr: "Maîtrises supplémentaires (Guerre)", descriptionEn: "Proficiency with martial weapons and heavy armor.", name: 'Bonus Proficiencies (War)', description: 'Maîtrise des armes de guerre et des armures lourdes.' },
                    ],
                    2: [{ nameFr: "Frappe guidée (Canalisation d'énergie divine)", descriptionEn: "+10 to an attack roll you have just made (after seeing the die).", name: 'Guided Strike (Channel Divinity)', description: "+10 à un jet d'attaque que tu viens d'effectuer (après avoir vu le dé)." }],
                    8: [{ nameFr: "Frappe divine", descriptionEn: "Once per turn, +1d8 damage of the weapon's type when you hit with a weapon.", name: 'Divine Strike', description: "Une fois par tour, +1d8 dégâts du type de l'arme quand tu touches avec une arme." }],
                },
            },
        ],
    },

    Druid: {
        level: 2,
        label: 'Cercle druidique',
        labelEn: "Druid Circle",
        options: [
            {
                id: 'land',
                nameFr: "Cercle de la Terre",
                descriptionEn: "A mystic warden of the ley lines — bonus spells and slot recovery.",
                name: 'Circle of the Land',
                description: "Un gardien mystique des lignes telluriques — sorts supplémentaires et récupération d'emplacements.",
                featuresByLevel: {
                    2: [
                        { nameFr: "Récupération naturelle", descriptionEn: "During a short rest, recover spell slots totalling up to half your druid level (once per long rest).", name: 'Natural Recovery', description: "Pendant un repos court, récupère des emplacements de sort totalisant jusqu'à la moitié de ton niveau de druide (une fois par repos long)." },
                        { nameFr: "Sorts de cercle (Terre)", descriptionEn: "Bonus spells tied to the terrain of your choice (forest, mountain, desert…). Pick the terrain with the DM.", name: 'Circle Spells (Land)', description: 'Sorts bonus liés au terrain de ton choix (forêt, montagne, désert…). Choisis le terrain avec le MJ.' },
                    ],
                    6: [{ nameFr: "Foulée sylvestre", descriptionEn: "Non-magical difficult terrain costs you no extra movement; advantage against plants that hinder you.", name: "Land's Stride", description: 'Le terrain difficile non magique ne te coûte aucun déplacement supplémentaire ; avantage contre les plantes qui te gênent.' }],
                },
            },
            {
                id: 'moon',
                nameFr: "Cercle de la Lune",
                descriptionEn: "A savage shapeshifter — use Wild Shape in combat to become mightier beasts.",
                name: 'Circle of the Moon',
                description: 'Un métamorphe sauvage — utilise Wild Shape en combat pour devenir des bêtes plus puissantes.',
                featuresByLevel: {
                    2: [
                        { nameFr: "Forme sauvage de combat", descriptionEn: "Wild Shape as a BONUS ACTION; while in beast form, spend a spell slot as a bonus action to regain 1d8 HP per slot level.", name: 'Combat Wild Shape', description: "Wild Shape en ACTION BONUS ; sous forme de bête, dépense un emplacement de sort en action bonus pour regagner 1d8 PV par niveau d'emplacement." },
                        { nameFr: "Formes du cercle", descriptionEn: "You can now turn into CR 1 beasts (the CR rises with level — tell the DM which beast you become).", name: 'Circle Forms', description: 'Transforme-toi dès maintenant en bêtes de FP 1 (le FP augmente avec le niveau — dis au MJ quelle bête tu deviens).' },
                    ],
                    6: [{ nameFr: "Frappe primitive", descriptionEn: "Your attacks in beast form count as magical.", name: 'Primal Strike', description: 'Tes attaques sous forme de bête comptent comme magiques.' }],
                },
            },
            {
                id: 'spores',
                nameFr: "Cercle des Spores",
                descriptionEn: "A fungal symbiote — death feeds life, and your spores gnaw at whoever comes close.",
                name: 'Circle of Spores',
                description: "Un symbiote fongique — la mort nourrit la vie, et tes spores rongent ceux qui t'approchent.",
                featuresByLevel: {
                    2: [
                        { nameFr: "Halo de spores", descriptionEn: "Reaction: a creature within 10 feet must succeed on a CON save (against your spell save DC) or take 1d4 necrotic damage (1d6 at level 6, 1d8 at 10, 1d10 at 14).", name: 'Halo of Spores', description: "Réaction : une créature à 3 m ou moins réussit une sauvegarde de CON (contre ton DD de sort) ou subit 1d4 dégâts nécrotiques (1d6 au niv. 6, 1d8 au 10, 1d10 au 14)." },
                        { nameFr: "Entité symbiotique", descriptionEn: "Action: spend a Wild Shape use to gain 4×your level in temporary HP; your melee attacks deal +1d6 necrotic and your Halo of Spores doubles its dice (10 min).", name: 'Symbiotic Entity', description: "Action : dépense une utilisation de Wild Shape pour gagner 4×niveau PV temporaires ; tes attaques de mêlée infligent +1d6 nécrotiques et ton Halo de spores double ses dés (10 min)." },
                    ],
                    6: [{ nameFr: "Infestation fongique", descriptionEn: "Reaction when a beast/humanoid of CR 1/4 or lower dies within 10 feet: it rises as a ZOMBIE in your service (1 HP, obeys your orders, 1 h).", name: 'Fungal Infestation', description: "Réaction quand une bête/humanoïde de FP ≤ 1/4 meurt à 3 m ou moins : il se relève comme ZOMBIE à ton service (1 PV, obéit à tes ordres, 1 h)." }],
                    10: [{ nameFr: "Spores envahissantes", descriptionEn: "Bonus action: hurl your Halo of Spores into a 10-foot cube within 30 feet for 1 minute.", name: 'Spreading Spores', description: 'Action bonus : projette ton Halo de spores dans un cube de 3 m à 9 m ou moins pendant 1 minute.' }],
                },
            },
        ],
    },

    Mage: {
        level: 2,
        label: 'Tradition arcanique',
        labelEn: "Arcane Tradition",
        options: [
            {
                id: 'evocation',
                nameFr: "École d'Évocation",
                descriptionEn: "Master of destructive energy — shield your allies from your own blasts.",
                name: 'School of Evocation',
                description: "Maître de l'énergie destructrice — protège tes alliés de tes propres déflagrations.",
                featuresByLevel: {
                    2: [{ nameFr: "Sculpter les sorts", descriptionEn: "Your evocation spells spare up to 1+the spell's level allies in the area (they automatically succeed on their save and take no damage from your spell).", name: 'Sculpt Spells', description: "Tes sorts d'évocation épargnent jusqu'à 1+niveau du sort alliés dans la zone (ils réussissent automatiquement leur sauvegarde et ne subissent aucun dégât de ton sort)." }],
                    6: [{ nameFr: "Tour de magie puissant", descriptionEn: "Targets that succeed on their save against your offensive cantrips still take half damage.", name: 'Potent Cantrip', description: 'Les cibles qui réussissent leur sauvegarde contre tes tours de magie offensifs subissent quand même la moitié des dégâts.' }],
                    10: [{ nameFr: "Évocation renforcée", descriptionEn: "Add your INT modifier to one damage roll of your evocation spells.", name: 'Empowered Evocation', description: "Ajoute ton modificateur d'INT à un jet de dégâts de tes sorts d'évocation." }],
                    14: [{ nameFr: "Surcanalisation", descriptionEn: "A level 1-5 spell deals its MAXIMUM damage (free the first time, then rising necrotic damage to you).", name: 'Overchannel', description: 'Un sort de niveau 1-5 inflige ses dégâts MAXIMUM (gratuit la 1re fois, puis dégâts nécrotiques croissants pour toi).' }],
                },
            },
            {
                id: 'abjuration',
                nameFr: "École d'Abjuration",
                descriptionEn: "A specialist in wards — an arcane shield that soaks the damage in your place.",
                name: 'School of Abjuration',
                description: 'Un spécialiste des protections — un bouclier arcanique qui absorbe les dégâts à ta place.',
                featuresByLevel: {
                    2: [{ nameFr: "Protection arcanique", descriptionEn: "When you cast a level-1+ abjuration spell, create a ward of 2×level+INT HP that soaks damage you would take. It recharges when you cast abjuration spells.", name: 'Arcane Ward', description: "Quand tu lances un sort d'abjuration de niveau 1+, crée une protection de 2×niveau+INT PV qui absorbe les dégâts que tu subirais. Se recharge quand tu lances des sorts d'abjuration." }],
                    6: [{ nameFr: "Protection projetée", descriptionEn: "Reaction: your Arcane Ward soaks the damage in place of a creature within 30 feet.", name: 'Projected Ward', description: "Réaction : ton Arcane Ward absorbe les dégâts à la place d'une créature à 9 m ou moins." }],
                },
            },
            {
                id: 'illusion',
                nameFr: "École d'Illusion",
                descriptionEn: "Reality is only a suggestion — improved trickery and near-living illusions.",
                name: 'School of Illusion',
                description: "La réalité n'est qu'une suggestion — duperies améliorées et illusions presque vivantes.",
                featuresByLevel: {
                    2: [{ nameFr: "Illusion mineure améliorée", descriptionEn: "You know Minor Illusion; it can create a sound AND an image with a single casting.", name: 'Improved Minor Illusion', description: 'Tu connais Minor Illusion ; il peut créer un son ET une image en une seule incantation.' }],
                    6: [{ nameFr: "Illusions malléables", descriptionEn: "Action: reshape any of your ongoing illusions.", name: 'Malleable Illusions', description: "Action : remodèle n'importe laquelle de tes illusions en cours." }],
                },
            },
        ],
    },

    Barbarian: {
        level: 3,
        label: 'Voie primitive',
        labelEn: "Primal Path",
        options: [
            {
                id: 'berserker',
                nameFr: "Berserker",
                descriptionEn: "Unleashed violence — Frenzy grants a bonus-action attack every turn while raging.",
                name: 'Berserker',
                description: 'Violence déchaînée — Frenzy accorde une attaque en action bonus à chaque tour pendant la rage.',
                featuresByLevel: {
                    3: [{ nameFr: "Frénésie", descriptionEn: "When you enter a Rage, you can go into a frenzy: make one melee weapon attack as a BONUS ACTION on each of your turns. (A dedicated button appears in combat while raging.) You suffer one level of exhaustion when the rage ends.", name: 'Frenzy', description: "Quand tu entres en Rage, tu peux entrer en frénésie : effectue une attaque d'arme de mêlée en ACTION BONUS à chacun de tes tours. (Un bouton dédié apparaît en combat pendant la rage.) Tu subis un niveau d'épuisement quand la rage prend fin." }],
                    6: [{ nameFr: "Rage aveugle", descriptionEn: "You cannot be charmed or frightened while raging.", name: 'Mindless Rage', description: 'Tu ne peux être ni charmé ni effrayé pendant ta rage.' }],
                    10: [{ nameFr: "Présence intimidante", descriptionEn: "Action: frighten a creature within 30 feet (WIS save against 8+proficiency+CHA).", name: 'Intimidating Presence', description: 'Action : effraie une créature à 9 m ou moins (sauvegarde de SAG contre 8+maîtrise+CHA).' }],
                    14: [{ nameFr: "Représailles", descriptionEn: "Reaction: when a creature within 5 feet damages you, make a melee attack against it.", name: 'Retaliation', description: 'Réaction : quand une créature à 1,50 m ou moins te blesse, effectue une attaque de mêlée contre elle.' }],
                },
            },
            {
                id: 'totem',
                nameFr: "Guerrier totem",
                descriptionEn: "A rage guided by the spirits — the Bear totem makes you nearly impossible to kill.",
                name: 'Totem Warrior',
                description: "Une rage guidée par les esprits — le totem de l'Ours te rend presque impossible à tuer.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Esprit totem (Ours)", descriptionEn: "While raging, you have resistance to ALL damage except psychic. (Pick a different totem animal with the DM if you prefer: Eagle = opportunity attacks against you have disadvantage; Wolf = your allies have advantage against enemies within 5 feet of you.)", name: 'Totem Spirit (Bear)', description: "Pendant ta rage, tu as la résistance à TOUS les dégâts sauf psychiques. (Choisis un autre animal totem avec le MJ si tu préfères : Aigle = les attaques d'opportunité contre toi ont le désavantage ; Loup = tes alliés ont l'avantage contre les ennemis à 1,50 m ou moins de toi.)" },
                        { nameFr: "Quête spirituelle", descriptionEn: "Cast Beast Sense and Speak with Animals as rituals.", name: 'Spirit Seeker', description: 'Lance Beast Sense et Speak with Animals sous forme de rituels.' },
                    ],
                    6: [{ nameFr: "Aspect de la bête", descriptionEn: "Gain a passive aspect of your totem animal (Bear: carrying capacity doubled, advantage on STR checks).", name: 'Aspect of the Beast', description: 'Gagne un aspect passif de ton animal totem (Ours : capacité de charge doublée, avantage aux tests de FOR).' }],
                    14: [{ nameFr: "Harmonie totémique (Ours)", descriptionEn: "While raging, enemies within 5 feet have disadvantage on attacks against anyone but you.", name: 'Totemic Attunement (Bear)', description: 'En rage, les ennemis à 1,50 m ou moins ont le désavantage aux attaques contre tout autre que toi.' }],
                },
            },
            {
                id: 'zealot',
                nameFr: "Zélote",
                descriptionEn: "A rage blessed by the gods of war — your fury deals radiant damage and death does not want you.",
                name: 'Zealot',
                description: "Une rage bénie par les dieux de la guerre — ta furie inflige des dégâts radiants et la mort ne veut pas de toi.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Furie divine", descriptionEn: "While raging, your FIRST successful attack each turn deals +1d6+½ your level radiant damage. (Applied automatically by the engine.)", name: 'Divine Fury', description: "Pendant ta rage, ta PREMIÈRE attaque réussie de chaque tour inflige +1d6+½ niveau dégâts radiants. (Appliqué automatiquement par le moteur.)" },
                        { nameFr: "Guerrier des dieux", descriptionEn: "Spells that bring you back to life cost NO material component — the gods want you back on your feet.", name: 'Warrior of the Gods', description: "Les sorts qui te ramènent à la vie ne coûtent AUCUNE composante matérielle — les dieux veulent que tu te relèves." },
                    ],
                    6: [{ nameFr: "Concentration fanatique", descriptionEn: "Once per rage, reroll a failed saving throw.", name: 'Fanatical Focus', description: 'Une fois par rage, relance une sauvegarde ratée.' }],
                    14: [{ nameFr: "Rage par-delà la mort", descriptionEn: "While raging, dropping to 0 HP does NOT knock you out — you only die if your death saves fail three times while the rage lasts.", name: 'Rage Beyond Death', description: "En rage, tomber à 0 PV ne te fait PAS perdre conscience — tu ne meurs que si tes jets de mort échouent trois fois pendant que la rage dure." }],
                },
            },
        ],
    },

    Bard: {
        level: 3,
        label: 'Collège bardique',
        labelEn: "Bard College",
        options: [
            {
                id: 'lore',
                nameFr: "Collège du Savoir",
                descriptionEn: "Cutting words and stolen secrets — the ultimate jack-of-all-trades.",
                name: 'College of Lore',
                description: 'Mots cinglants et secrets dérobés — le touche-à-tout ultime.',
                featuresByLevel: {
                    3: [
                        { nameFr: "Mots cinglants", descriptionEn: "Reaction: spend a Bardic Inspiration die to SUBTRACT it from an enemy's attack roll, ability check or damage roll within 60 feet.", name: 'Cutting Words', description: "Réaction : dépense un dé de Bardic Inspiration pour le SOUSTRAIRE au jet d'attaque, au test ou au jet de dégâts d'un ennemi à 18 m ou moins." },
                        { nameFr: "Maîtrises supplémentaires (Savoir)", descriptionEn: "Proficiency in three skills of your choice.", name: 'Bonus Proficiencies (Lore)', description: 'Maîtrise de trois compétences de ton choix.' },
                    ],
                    6: [{ nameFr: "Secrets magiques supplémentaires", descriptionEn: "Learn 2 spells from ANY class.", name: 'Additional Magical Secrets', description: "Apprends 2 sorts de N'IMPORTE quelle classe." }],
                    14: [{ nameFr: "Talent sans égal", descriptionEn: "Spend a Bardic Inspiration die to add it to YOUR own ability check.", name: 'Peerless Skill', description: 'Dépense une inspiration bardique pour l’ajouter à TON propre test de caractéristique.' }],
                },
            },
            {
                id: 'valor',
                nameFr: "Collège de la Vaillance",
                descriptionEn: "A warrior skald — armor, weapons, and an inspiration that strikes back.",
                name: 'College of Valor',
                description: 'Un skalde guerrier — armures, armes et une inspiration qui rend les coups.',
                featuresByLevel: {
                    3: [
                        { nameFr: "Inspiration martiale", descriptionEn: "Your Bardic Inspiration can also be added to a damage roll, or to AC against one attack (reaction).", name: 'Combat Inspiration', description: "Ta Bardic Inspiration peut aussi s'ajouter à un jet de dégâts, ou à la CA contre une attaque (réaction)." },
                        { nameFr: "Maîtrises supplémentaires (Vaillance)", descriptionEn: "Proficiency with medium armor, shields and martial weapons.", name: 'Bonus Proficiencies (Valor)', description: 'Maîtrise des armures intermédiaires, des boucliers et des armes de guerre.' },
                    ],
                    6: [{ nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }],
                    14: [{ nameFr: "Magie de bataille", descriptionEn: "When you cast a bard spell, make one weapon attack as a bonus action.", name: 'Battle Magic', description: 'Quand tu lances un sort de barde, effectue une attaque d’arme en action bonus.' }],
                },
            },
            {
                id: 'whispers',
                nameFr: "Collège des Murmures",
                descriptionEn: "The bard people fear — words that stab the mind and secrets that kill.",
                name: 'College of Whispers',
                description: "Le barde que l'on craint — des mots qui poignardent l'esprit et des secrets qui tuent.",
                featuresByLevel: {
                    3: [
                        { nameFr: "Lames psychiques", descriptionEn: "When you HIT with a weapon attack, spend a Bardic Inspiration die to deal +2d6 psychic damage (3d6 at level 5, 5d6 at 10, 8d6 at 15). Tell the DM on the spot.", name: 'Psychic Blades', description: "Quand tu TOUCHES avec une attaque d'arme, dépense un dé d'Inspiration bardique pour infliger +2d6 dégâts psychiques (3d6 au niv. 5, 5d6 au 10, 8d6 au 15). Annonce-le au MJ sur le coup." },
                        { nameFr: "Mots de terreur", descriptionEn: "After 1 minute of conversation, the target must succeed on a WIS save or be FRIGHTENED of you (or a creature of your choice) for 1 hour.", name: 'Words of Terror', description: "Après 1 minute de conversation, la cible réussit une sauvegarde de SAG ou est EFFRAYÉE de toi (ou d'une créature de ton choix) pendant 1 h." },
                    ],
                    6: [{ nameFr: "Manteau des murmures", descriptionEn: "When a humanoid dies within 30 feet, capture its SHADOW: wear it to take its appearance and reach its surface memories (1 h).", name: 'Mantle of Whispers', description: "Quand un humanoïde meurt à 9 m ou moins, capture son OMBRE : revêts-la pour prendre son apparence et accéder à ses souvenirs de surface (1 h)." }],
                    14: [{ nameFr: "Savoir de l'ombre", descriptionEn: "Whisper a secret: the target must succeed on a WIS save or be CHARMED and obey you for 8 hours, convinced you know its darkest secret.", name: 'Shadow Lore', description: 'Murmure un secret : la cible réussit une sauvegarde de SAG ou est CHARMÉE et t\'obéit pendant 8 h, persuadée que tu connais son secret le plus sombre.' }],
                },
            },
        ],
    },

    Monk: {
        level: 3,
        label: 'Tradition monastique',
        labelEn: "Monastic Tradition",
        options: [
            {
                id: 'open_hand',
                nameFr: "Voie de la Main ouverte",
                descriptionEn: "Perfect martial technique — your Flurry of Blows knocks down and unbalances.",
                name: 'Way of the Open Hand',
                description: 'La technique martiale parfaite — ton Flurry of Blows renverse et déséquilibre.',
                featuresByLevel: {
                    3: [{ nameFr: "Technique de la main ouverte", descriptionEn: "When you hit with Flurry of Blows, impose one effect: the target must succeed on a DEX save or be knocked PRONE; on a STR save or be PUSHED 15 feet; or it cannot take reactions until your next turn.", name: 'Open Hand Technique', description: "Quand tu touches avec Flurry of Blows, impose un effet : la cible réussit une sauvegarde de DEX ou est mise À TERRE ; une sauvegarde de FOR ou est REPOUSSÉE de 4,50 m ; ou elle ne peut plus utiliser de réaction jusqu'à ton prochain tour." }],
                    6: [{ nameFr: "Intégrité du corps", descriptionEn: "Action: regain 3×your monk level in HP (once per long rest).", name: 'Wholeness of Body', description: 'Action : regagne 3×niveau de moine PV (une fois par repos long).' }],
                    11: [{ nameFr: "Tranquillité", descriptionEn: "At the end of a long rest, you are under a sanctuary effect: creatures must succeed on a WIS save to attack you (until your first attack).", name: 'Tranquility', description: 'À la fin d’un repos long, tu es sous « sanctuaire » : on doit réussir une sauvegarde de SAG pour t’attaquer (jusqu’à ta première attaque).' }],
                    17: [{ nameFr: "Paume frémissante", descriptionEn: "Spend 3 ki when you hit with an unarmed strike: lethal vibrations — at your command, the target makes a CON save or drops to 0 HP.", name: 'Quivering Palm', description: 'Dépense 3 ki quand tu touches à mains nues : vibrations létales — à ta demande, la cible fait une sauvegarde de CON ou tombe à 0 PV.' }],
                },
            },
            {
                id: 'shadow',
                nameFr: "Voie de l'Ombre",
                descriptionEn: "A ninja of ki and darkness — teleport from shadow to shadow.",
                name: 'Way of Shadow',
                description: "Un ninja du ki et des ténèbres — téléporte-toi d'ombre en ombre.",
                featuresByLevel: {
                    3: [{ nameFr: "Arts de l'ombre", descriptionEn: "Spend 2 ki to cast Darkness, Darkvision, Pass without Trace or Silence. You know Minor Illusion.", name: 'Shadow Arts', description: 'Dépense 2 ki pour lancer Darkness, Darkvision, Pass without Trace ou Silence. Tu connais Minor Illusion.' }],
                    6: [{ nameFr: "Pas de l'ombre", descriptionEn: "Bonus action in dim light or darkness: teleport up to 60 feet to another shadow; advantage on your next melee attack before the end of the turn.", name: 'Shadow Step', description: "Action bonus dans la lumière faible ou les ténèbres : téléporte-toi jusqu'à 18 m vers une autre ombre ; avantage à ta prochaine attaque de mêlée avant la fin du tour." }],
                    11: [{ nameFr: "Cape d'ombres", descriptionEn: "Action in dim light/darkness: become invisible until you attack or step into the light.", name: 'Cloak of Shadows', description: 'Action dans la lumière faible/ténèbres : deviens invisible jusqu’à ce que tu attaques ou entres dans la lumière.' }],
                },
            },
            {
                id: 'four_elements',
                nameFr: "Voie des Quatre Éléments",
                descriptionEn: "Bend fire, water, air and stone to your will through your ki.",
                name: 'Way of the Four Elements',
                description: "Plie le feu, l'eau, l'air et la pierre à ta volonté grâce à ton ki.",
                featuresByLevel: {
                    3: [{ nameFr: "Disciple des éléments", descriptionEn: "Spend ki to cast elemental disciplines (Fangs of the Fire Snake, Water Whip, Fist of Four Thunders…). Choose your disciplines with the DM.", name: 'Disciple of the Elements', description: 'Dépense du ki pour lancer des disciplines élémentaires (Fangs of the Fire Snake, Water Whip, Fist of Four Thunders…). Choisis tes disciplines avec le MJ.' }],
                },
            },
        ],
    },

    Warlock: {
        level: 1,
        label: "Patron d'outre-monde",
        labelEn: "Otherworldly Patron",
        options: [
            {
                id: 'fiend',
                nameFr: "Le Fiélon",
                descriptionEn: "A pact sealed in the fires of hell — feed on the life of the enemies you cut down.",
                name: 'The Fiend',
                description: "Un pacte scellé dans les feux de l'enfer — nourris-toi de la vie des ennemis que tu abats.",
                featuresByLevel: {
                    1: [{ nameFr: "Bénédiction du Ténébreux", descriptionEn: "When you reduce a hostile creature to 0 HP, gain temporary HP equal to your CHA modifier + your warlock level.", name: "Dark One's Blessing", description: "Quand tu réduis une créature hostile à 0 PV, gagne des PV temporaires égaux à mod. CHA + niveau d'occultiste." }],
                    6: [{ nameFr: "Chance du Ténébreux", descriptionEn: "Add 1d10 to an ability check or a saving throw (once per short rest, after seeing the roll).", name: "Dark One's Own Luck", description: 'Ajoute 1d10 à un test de caractéristique ou une sauvegarde (une fois par repos court, après avoir vu le jet).' }],
                    10: [{ nameFr: "Résilience fiélonne", descriptionEn: "After a rest, choose a damage type: you resist it until your next choice.", name: 'Fiendish Resilience', description: 'Après un repos, choisis un type de dégâts : tu y résistes jusqu’au prochain choix.' }],
                    14: [{ nameFr: "Projection en enfer", descriptionEn: "1/long rest, when you hit: the target vanishes into hell and returns on your next turn with 10d10 psychic damage.", name: 'Hurl Through Hell', description: '1/repos long, quand tu touches : la cible disparaît en enfer et revient à ton prochain tour avec 10d10 dégâts psychiques.' }],
                },
            },
            {
                id: 'archfey',
                nameFr: "L'Archifée",
                descriptionEn: "A bargain struck with the lords of the Feywild — beguile and terrify.",
                name: 'The Archfey',
                description: 'Un marché conclu avec les seigneurs de Féerie — envoûte et terrifie.',
                featuresByLevel: {
                    1: [{ nameFr: "Présence féerique", descriptionEn: "Action: creatures in a 10-foot cube around you must succeed on a WIS save or be charmed/frightened until the end of your next turn (once per short rest).", name: 'Fey Presence', description: "Action : les créatures dans un cube de 3 m autour de toi réussissent une sauvegarde de SAG ou sont charmées/effrayées jusqu'à la fin de ton prochain tour (une fois par repos court)." }],
                    6: [{ nameFr: "Évasion brumeuse", descriptionEn: "Reaction when you take damage: turn invisible and teleport 60 feet (once per short rest).", name: 'Misty Escape', description: 'Réaction quand tu subis des dégâts : deviens invisible et téléporte-toi de 18 m (une fois par repos court).' }],
                },
            },
            {
                id: 'great_old_one',
                nameFr: "Le Grand Ancien",
                descriptionEn: "Whispers from beyond the stars — telepathy and creeping madness.",
                name: 'The Great Old One',
                description: "Des murmures venus d'au-delà des étoiles — télépathie et folie rampante.",
                featuresByLevel: {
                    1: [{ nameFr: "Esprit éveillé", descriptionEn: "Speak telepathically to any creature you can see within 30 feet (no shared language needed).", name: 'Awakened Mind', description: 'Parle par télépathie à toute créature que tu peux voir à 9 m ou moins (aucune langue commune nécessaire).' }],
                    6: [{ nameFr: "Protection entropique", descriptionEn: "Reaction: impose disadvantage on an attack against you; if it misses, you have advantage on your next attack against that creature (once per short rest).", name: 'Entropic Ward', description: "Réaction : impose le désavantage à une attaque contre toi ; si elle rate, tu as l'avantage à ta prochaine attaque contre cette créature (une fois par repos court)." }],
                },
            },
        ],
    },

    Sorcerer: {
        level: 1,
        label: 'Origine de sorcellerie',
        labelEn: "Sorcerous Origin",
        options: [
            {
                id: 'draconic',
                nameFr: "Lignée draconique",
                descriptionEn: "Dragon blood runs in your veins — tougher (+1 HP/level), with scales (AC 13+DEX).",
                name: 'Draconic Bloodline',
                description: 'Du sang de dragon coule dans tes veines — plus robuste (+1 PV/niveau), avec des écailles (CA 13+DEX).',
                featuresByLevel: {
                    1: [
                        { nameFr: "Résilience draconique", descriptionEn: "+1 maximum HP per sorcerer level; while unarmored, your AC is 13 + your DEX modifier. (Applied automatically by the engine.) Pick your draconic ancestor (fire, cold, lightning…) with the DM.", name: 'Draconic Resilience', description: "+1 PV maximum par niveau d'ensorceleur ; sans armure, ta CA est de 13 + modificateur de DEX. (Appliqué automatiquement par le moteur.) Choisis ton ancêtre draconique (feu, froid, foudre…) avec le MJ." },
                        { nameFr: "Ancêtre draconique", descriptionEn: "You speak, read and write Draconic; double your proficiency bonus on CHA checks with dragons.", name: 'Dragon Ancestor', description: 'Tu parles, lis et écris le draconique ; bonus de maîtrise doublé aux tests de CHA face aux dragons.' },
                    ],
                    6: [{ nameFr: "Affinité élémentaire", descriptionEn: "Add your CHA modifier to one damage roll of a spell matching your ancestor's damage type; spend 1 sorcery point to gain resistance to it for 1 hour.", name: 'Elemental Affinity', description: "Ajoute ton mod. CHA à un jet de dégâts d'un sort du même type de dégâts que ton ancêtre ; dépense 1 point de sorcellerie pour y gagner la résistance pendant 1 h." }],
                    14: [{ nameFr: "Ailes de dragon", descriptionEn: "Bonus action: unfurl draconic wings — a flying speed equal to your walking speed.", name: 'Dragon Wings', description: 'Action bonus : déploie des ailes draconiques — vitesse de vol égale à ta vitesse au sol.' }],
                    18: [{ nameFr: "Présence draconique", descriptionEn: "Spend 5 sorcery points: an aura of awe or dread within 60 feet (WIS save).", name: 'Draconic Presence', description: 'Dépense 5 points de sorcellerie : aura de crainte ou de fascination à 18 m (sauvegarde de SAG).' }],
                },
            },
            {
                id: 'wild_magic',
                nameFr: "Magie sauvage",
                descriptionEn: "Raw chaos surges through your spells — wonderfully unpredictable.",
                name: 'Wild Magic',
                description: "Le chaos à l'état brut déferle dans tes sorts — merveilleusement imprévisible.",
                featuresByLevel: {
                    1: [
                        { nameFr: "Vague de magie sauvage", descriptionEn: "After casting a level-1+ sorcerer spell, the DM may have you roll a d20: on a 1, roll on the Wild Magic table — anything can happen.", name: 'Wild Magic Surge', description: "Après avoir lancé un sort d'ensorceleur de niveau 1+, le MJ peut te faire lancer un d20 : sur un 1, lance sur la table de Magie sauvage — tout peut arriver." },
                        { nameFr: "Marées du chaos", descriptionEn: "Gain advantage on one attack, check or save (recharges when a wild magic surge triggers, or after a long rest).", name: 'Tides of Chaos', description: "Gagne l'avantage à une attaque, un test ou une sauvegarde (se recharge quand une vague de magie sauvage se déclenche ou après un repos long)." },
                    ],
                },
            },
            {
                id: 'storm',
                nameFr: "Magie des tempêtes",
                descriptionEn: "The storm lives in you — the wind carries you, lightning and thunder answer your anger.",
                name: 'Storm Sorcery',
                description: "La tempête vit en toi — le vent te porte, la foudre et le tonnerre répondent à ta colère.",
                featuresByLevel: {
                    1: [
                        { nameFr: "Voix des vents", descriptionEn: "You speak Primordial (and its Auran, Aquan, Ignan and Terran dialects).", name: 'Wind Speaker', description: 'Tu parles le primordial (et ses dialectes aérien, aquatique, igné et terreux).' },
                        { nameFr: "Magie tempétueuse", descriptionEn: "Bonus action when you cast a level-1+ spell: gusts lift you — fly 10 feet without provoking opportunity attacks.", name: 'Tempestuous Magic', description: "Action bonus quand tu lances un sort de niveau 1+ : des bourrasques te soulèvent — vole de 3 m sans provoquer d'attaques d'opportunité." },
                    ],
                    6: [
                        { nameFr: "Cœur de la tempête", descriptionEn: "RESISTANCE to lightning and thunder damage; when you cast a level-1+ lightning/thunder spell, creatures of your choice within 10 feet take ½ your sorcerer level in damage of the same type.", name: 'Heart of the Storm', description: 'RÉSISTANCE aux dégâts de foudre et de tonnerre ; quand tu lances un sort de foudre/tonnerre de niveau 1+, les créatures de ton choix à 3 m ou moins subissent ½ niveau d\'ensorceleur dégâts du même type.' },
                        { nameFr: "Guide des tempêtes", descriptionEn: "Still the rain around you or steer the winds (utility, no concentration).", name: 'Storm Guide', description: 'Apaise la pluie autour de toi ou dirige les vents (utilitaire, sans concentration).' },
                    ],
                    14: [{ nameFr: "Furie de la tempête", descriptionEn: "Reaction when a melee attack hits you: the attacker takes your level in lightning damage and must succeed on a STR save or be pushed 20 feet.", name: "Storm's Fury", description: 'Réaction quand une attaque de mêlée te touche : l\'attaquant subit ton niveau en dégâts de foudre et réussit une sauvegarde de FOR ou est repoussé de 6 m.' }],
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

/** K7 (contre-audit du 2026-09-01) — les DEUX archétypes tiers-lanceurs du SRD.
 *  Une seule définition, partagée par les emplacements (progression), le
 *  plafond de niveau de sort et la liste apprenable (codexService) : le moteur
 *  de lancement les mappait déjà sur la liste du magicien, mais rien ne leur
 *  donnait d'emplacement — les données promettaient des sorts, aucun ne
 *  passait hors tours de magie. */
export function isThirdCasterSubclass(subclass?: string | null): boolean {
    return /eldritch knight|chevalier occulte|arcane trickster|filou arcanique|escroc arcanique/i.test(String(subclass || ''));
}
