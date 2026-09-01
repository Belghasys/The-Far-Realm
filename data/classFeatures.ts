// Class Features by Level for D&D 5e (Simplified 7 Classes)
// Features are automatically added when a character levels up

import { Feature } from '../types/index';

export interface ClassFeatureData {
    hitDie: number;
    profs: string[];
    features: Record<number, Feature[]>;
    spellcaster: boolean;
    spellcastingAbility?: 'INT' | 'WIS' | 'CHA';
}

export const CLASS_FEATURES: Record<string, ClassFeatureData> = {
    Fighter: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        spellcaster: false,
        features: {
            1: [
                { nameFr: "Style de combat", descriptionEn: "Choose a combat specialization that grants you unique benefits.", name: 'Fighting Style', description: "Choisis une spécialisation de combat qui t'accorde des bonus uniques." },
                { nameFr: "Second souffle", descriptionEn: "Bonus action: regain 1d10+level HP. Recharges after a short rest.", name: 'Second Wind', description: 'Action bonus : tu regagnes 1d10+niveau PV. Se recharge après un repos court.' }
            ],
            2: [
                { nameFr: "Sursaut d'activité", descriptionEn: "You take one extra action. Recharges after a short rest.", name: 'Action Surge', description: 'Tu effectues une action supplémentaire. Se recharge après un repos court.' }
            ],
            3: [
                { nameFr: "Archétype martial", descriptionEn: "Choose Champion, Battle Master or Eldritch Knight.", name: 'Martial Archetype', description: 'Choisis Champion, Battle Master ou Eldritch Knight.' }
            ],
            5: [
                { nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            9: [
                { nameFr: "Indomptable", descriptionEn: "Reroll a failed saving throw. 1/long rest.", name: 'Indomitable', description: 'Relance un jet de sauvegarde raté. 1/repos long.' }
            ],
            11: [
                { nameFr: "Attaque supplémentaire (2)", descriptionEn: "You attack three times when you take the Attack action.", name: 'Extra Attack (2)', description: "Tu attaques trois fois quand tu effectues l'action Attaquer." }
            ],
            13: [
                { nameFr: "Indomptable (2)", descriptionEn: "Two rerolls of a failed saving throw per long rest.", name: 'Indomitable (2)', description: 'Deux relances de sauvegarde ratée par repos long.' }
            ],
            17: [
                { nameFr: "Sursaut d'activité (2)", descriptionEn: "Two uses of Action Surge per short rest (only one per turn).", name: 'Action Surge (2)', description: 'Deux utilisations d\'Action Surge par repos court (une seule par tour).' },
                { nameFr: "Indomptable (3)", descriptionEn: "Three rerolls of a failed saving throw per long rest.", name: 'Indomitable (3)', description: 'Trois relances de sauvegarde ratée par repos long.' }
            ],
            20: [
                { nameFr: "Attaque supplémentaire (3)", descriptionEn: "You attack four times when you take the Attack action.", name: 'Extra Attack (3)', description: "Tu attaques quatre fois quand tu effectues l'action Attaquer." }
            ]
        }
    },

    Paladin: {
        hitDie: 10,
        profs: ["All Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        spellcaster: true,
        spellcastingAbility: 'CHA',
        features: {
            1: [
                { nameFr: "Sens divin", descriptionEn: "Detect celestials, fiends and undead within 60 feet.", name: 'Divine Sense', description: 'Détecte les célestes, les fiélons et les morts-vivants à 18 m ou moins.' },
                { nameFr: "Imposition des mains", descriptionEn: "A healing pool of 5×level HP. Touch a creature to heal it or cure a disease.", name: 'Lay on Hands', description: 'Réserve de soins de 5×niveau PV. Touche une créature pour la soigner ou guérir une maladie.' }
            ],
            2: [
                { nameFr: "Style de combat", descriptionEn: "Choose a combat specialization.", name: 'Fighting Style', description: 'Choisis une spécialisation de combat.' },
                { nameFr: "Incantation", descriptionEn: "Cast divine spells using Charisma.", name: 'Spellcasting', description: 'Lance des sorts divins grâce au Charisme.' },
                { nameFr: "Châtiment divin", descriptionEn: "Spend a spell slot to deal 2d8+ radiant damage when you hit.", name: 'Divine Smite', description: 'Dépense un emplacement de sort pour infliger 2d8+ dégâts radiants quand tu touches.' }
            ],
            3: [
                { nameFr: "Serment sacré", descriptionEn: "Choose your oath: Devotion, Ancients or Vengeance.", name: 'Sacred Oath', description: 'Choisis ton serment : Devotion, Ancients ou Vengeance.' },
                { nameFr: "Canalisation d'énergie divine", descriptionEn: "Use the divine powers of your oath. 1/short rest.", name: 'Channel Divinity', description: 'Utilise les pouvoirs divins propres à ton serment. 1/repos court.' }
            ],
            5: [
                { nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            6: [
                { nameFr: "Aura de protection", descriptionEn: "+your CHA modifier to the saving throws of allies within 10 feet.", name: 'Aura of Protection', description: '+mod. CHA aux jets de sauvegarde des alliés à 3 m ou moins.' }
            ],
            10: [
                { nameFr: "Aura de courage", descriptionEn: "You and allies within 10 feet cannot be frightened while you are conscious.", name: 'Aura of Courage', description: 'Toi et tes alliés à 3 m ou moins ne pouvez pas être effrayés tant que tu es conscient.' }
            ],
            11: [
                { nameFr: "Châtiment divin amélioré", descriptionEn: "All your melee attacks deal +1d8 radiant damage.", name: 'Improved Divine Smite', description: 'Toutes tes attaques de mêlée infligent +1d8 dégâts radiants.' }
            ],
            14: [
                { nameFr: "Toucher purificateur", descriptionEn: "End one spell on yourself or an ally. CHA modifier uses/long rest.", name: 'Cleansing Touch', description: 'Mets fin à un sort sur toi ou un allié. Mod. CHA/repos long.' }
            ],
            18: [
                { nameFr: "Auras améliorées", descriptionEn: "Your auras of protection and courage extend to a 30-foot radius.", name: 'Aura Improvements', description: 'Tes auras de protection et de courage passent à 9 m de rayon.' }
            ]
        }
    },

    Mage: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        spellcaster: true,
        spellcastingAbility: 'INT',
        features: {
            1: [
                { nameFr: "Incantation", descriptionEn: "Cast arcane spells using Intelligence. Prepare your spells from your spellbook.", name: 'Spellcasting', description: "Lance des sorts profanes grâce à l'Intelligence. Prépare tes sorts depuis ton grimoire." },
                { nameFr: "Incantation rituelle", descriptionEn: "Cast a ritual-tagged spell without spending a slot: 10 extra minutes, out of combat only.", name: 'Ritual Casting', description: "Lance un sort marqué rituel sans dépenser d'emplacement : 10 minutes de plus, hors combat seulement." },
                { nameFr: "Récupération arcanique", descriptionEn: "Recover spell slots during a short rest. Total = half your wizard level.", name: 'Arcane Recovery', description: 'Récupère des emplacements de sort pendant un repos court. Total = moitié du niveau de magicien.' }
            ],
            2: [
                { nameFr: "Tradition arcanique", descriptionEn: "Choose your school: Evocation, Abjuration, Illusion, and so on.", name: 'Arcane Tradition', description: 'Choisis ton école : Evocation, Abjuration, Illusion, etc.' }
            ],
            18: [
                { nameFr: "Maîtrise des sorts", descriptionEn: "Cast one level-1 and one level-2 spell at will.", name: 'Spell Mastery', description: 'Lance à volonté un sort de niveau 1 et un sort de niveau 2.' }
            ],
            20: [
                { nameFr: "Sorts signatures", descriptionEn: "Two level-3 spells always prepared, cast for free 1/short rest.", name: 'Signature Spells', description: 'Deux sorts de niveau 3 toujours préparés, lancés gratuitement 1/repos court.' }
            ]
        }
    },

    Cleric: {
        hitDie: 8,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons"],
        spellcaster: true,
        spellcastingAbility: 'WIS',
        features: {
            1: [
                { nameFr: "Incantation", descriptionEn: "Cast divine spells using Wisdom.", name: 'Spellcasting', description: 'Lance des sorts divins grâce à la Sagesse.' },
                { nameFr: "Incantation rituelle", descriptionEn: "Cast a ritual-tagged spell without spending a slot: 10 extra minutes, out of combat only.", name: 'Ritual Casting', description: "Lance un sort marqué rituel sans dépenser d'emplacement : 10 minutes de plus, hors combat seulement." },
                { nameFr: "Domaine divin", descriptionEn: "Choose your domain: Life, Light, War, Tempest, and so on.", name: 'Divine Domain', description: 'Choisis ton domaine : Life, Light, War, Tempest, etc.' }
            ],
            2: [
                { nameFr: "Canalisation d'énergie divine", descriptionEn: "Turn Undead + a domain power. 1/short rest.", name: 'Channel Divinity', description: 'Renvoi des morts-vivants + pouvoir de domaine. 1/repos court.' }
            ],
            5: [
                { nameFr: "Destruction des morts-vivants", descriptionEn: "Undead of CR 1/2 or lower are destroyed outright by your Turn Undead.", name: 'Destroy Undead', description: 'Les morts-vivants de FP 1/2 ou moins sont détruits par ton Renvoi des morts-vivants.' }
            ],
            8: [
                { nameFr: "Frappe divine / Tours de magie puissants", descriptionEn: "Once per turn, +1d8 damage (of your domain's type) when you hit with a weapon — or your cantrips gain +your WIS modifier, depending on the domain.", name: 'Divine Strike / Potent Cantrips', description: 'Une fois par tour, +1d8 dégâts (du type de ton domaine) quand tu touches avec une arme — ou tes tours de magie gagnent +mod. SAG selon le domaine.' }
            ],
            10: [
                { nameFr: "Intervention divine", descriptionEn: "Call on your deity for help. 10% + your level chance of success.", name: 'Divine Intervention', description: "Appelle ta divinité à l'aide. 10 % + niveau de chances de réussite." }
            ],
            17: [
                { nameFr: "Intervention divine améliorée", descriptionEn: "Your Divine Intervention succeeds automatically.", name: 'Divine Intervention Improved', description: 'Ton Intervention divine réussit automatiquement.' }
            ]
        }
    },

    Druid: {
        hitDie: 8,
        profs: ["Light Armor (non-metal)", "Medium Armor (non-metal)", "Shields", "Simple Weapons"],
        spellcaster: true,
        spellcastingAbility: 'WIS',
        features: {
            1: [
                { nameFr: "Incantation", descriptionEn: "Cast nature spells using Wisdom.", name: 'Spellcasting', description: 'Lance des sorts de la nature grâce à la Sagesse.' },
                { nameFr: "Incantation rituelle", descriptionEn: "Cast a ritual-tagged spell without spending a slot: 10 extra minutes, out of combat only.", name: 'Ritual Casting', description: "Lance un sort marqué rituel sans dépenser d'emplacement : 10 minutes de plus, hors combat seulement." },
                { nameFr: "Druidique", descriptionEn: "The secret language of druids.", name: 'Druidic', description: 'La langue secrète des druides.' }
            ],
            2: [
                { nameFr: "Forme sauvage", descriptionEn: "Turn into a beast. 2/short rest. Max CR = level/8.", name: 'Wild Shape', description: 'Transforme-toi en bête. 2/repos court. FP max = niveau/8.' },
                { nameFr: "Cercle druidique", descriptionEn: "Choose Circle of the Land or Circle of the Moon.", name: 'Druid Circle', description: 'Choisis Circle of the Land ou Circle of the Moon.' }
            ],
            4: [
                { nameFr: "Forme sauvage améliorée", descriptionEn: "Forms up to CR 1/2, swimming allowed.", name: 'Wild Shape Improvement', description: 'Formes de FP 1/2 max, nage autorisée.' }
            ],
            8: [
                { nameFr: "Forme sauvage améliorée (2)", descriptionEn: "Forms up to CR 1, flying allowed.", name: 'Wild Shape Improvement (2)', description: 'Formes de FP 1 max, vol autorisé.' }
            ],
            18: [
                { nameFr: "Corps intemporel", descriptionEn: "You age 10 times more slowly and cannot be aged magically.", name: 'Timeless Body', description: 'Tu vieillis 10 fois plus lentement et ne peux pas être vieilli par magie.' }
            ],
            20: [
                { nameFr: "Archidruide", descriptionEn: "Unlimited uses of Wild Shape.", name: 'Archdruid', description: 'Utilisations illimitées de Wild Shape.' }
            ]
        }
    },

    Ranger: {
        hitDie: 10,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        spellcaster: true,
        spellcastingAbility: 'WIS',
        features: {
            1: [
                { nameFr: "Ennemi juré", descriptionEn: "Advantage on Survival checks to track. You learn one language.", name: 'Favored Enemy', description: 'Avantage aux tests de Survie pour pister. Tu apprends une langue.' },
                { nameFr: "Explorateur né", descriptionEn: "Expertise in one terrain type. Benefits while travelling.", name: 'Natural Explorer', description: 'Expertise dans un type de terrain. Avantages lors des voyages.' }
            ],
            2: [
                { nameFr: "Style de combat", descriptionEn: "Choose a combat specialization.", name: 'Fighting Style', description: 'Choisis une spécialisation de combat.' },
                { nameFr: "Incantation", descriptionEn: "Cast ranger spells using Wisdom.", name: 'Spellcasting', description: 'Lance des sorts de rôdeur grâce à la Sagesse.' }
            ],
            3: [
                { nameFr: "Archétype de rôdeur", descriptionEn: "Choose Hunter or Beast Master.", name: 'Ranger Archetype', description: 'Choisis Hunter ou Beast Master.' },
                { nameFr: "Conscience primitive", descriptionEn: "Detect aberrations, dragons, undead and the like within 1 mile.", name: 'Primeval Awareness', description: 'Détecte les aberrations, dragons, morts-vivants, etc. à 1,5 km à la ronde.' }
            ],
            5: [
                { nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            10: [
                { nameFr: "Se cacher à la vue de tous", descriptionEn: "Camouflage yourself for 1 minute against a solid surface: +10 to Stealth checks as long as you stay still.", name: 'Hide in Plain Sight', description: "Camoufle-toi 1 minute contre une surface solide : +10 aux tests de Discrétion tant que tu restes immobile." }
            ],
            14: [
                { nameFr: "Disparition", descriptionEn: "Bonus action: Hide. You can no longer be tracked by non-magical means.", name: 'Vanish', description: 'Action bonus : Se cacher. Tu ne peux plus être pisté par des moyens non magiques.' }
            ],
            20: [
                { nameFr: "Pourfendeur", descriptionEn: "Add your WIS modifier to the attack or damage roll against your favored enemy.", name: 'Foe Slayer', description: "Ajoute ton mod. SAG à l'attaque ou aux dégâts contre ton ennemi juré." }
            ]
        }
    },

    Rogue: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        spellcaster: false,
        features: {
            1: [
                { nameFr: "Expertise", descriptionEn: "Double your proficiency bonus for two skills.", name: 'Expertise', description: 'Bonus de maîtrise doublé pour deux compétences.' },
                { nameFr: "Attaque sournoise", descriptionEn: "1d6 extra damage with a finesse or ranged weapon when you have advantage.", name: 'Sneak Attack', description: "1d6 dégâts supplémentaires avec une arme de finesse ou à distance quand tu as l'avantage." },
                { nameFr: "Argot des voleurs", descriptionEn: "The secret language of rogues.", name: "Thieves' Cant", description: 'La langue secrète des roublards.' }
            ],
            2: [
                { nameFr: "Ruse", descriptionEn: "Bonus action: Dash, Disengage or Hide.", name: 'Cunning Action', description: 'Action bonus : Foncer, Se désengager ou Se cacher.' }
            ],
            3: [
                { nameFr: "Archétype de roublard", descriptionEn: "Choose Thief, Assassin or Arcane Trickster.", name: 'Roguish Archetype', description: 'Choisis Thief, Assassin ou Arcane Trickster.' }
            ],
            5: [
                { nameFr: "Esquive troublante", descriptionEn: "Reaction: halve the damage of an attack you can see.", name: 'Uncanny Dodge', description: "Réaction : divise par deux les dégâts d'une attaque que tu peux voir." }
            ],
            7: [
                { nameFr: "Esquive instinctive", descriptionEn: "DEX saves: no damage on a success, half on a failure.", name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." }
            ],
            11: [
                { nameFr: "Talent fiable", descriptionEn: "Minimum 10 on ability checks you are proficient in.", name: 'Reliable Talent', description: 'Minimum 10 aux tests de caractéristique que tu maîtrises.' }
            ],
            14: [
                { nameFr: "Perception aveugle", descriptionEn: "You sense any hidden or invisible creature within 10 feet of you.", name: 'Blindsense', description: 'Tu perçois toute créature cachée ou invisible à 3 m ou moins de toi.' }
            ],
            15: [
                { nameFr: "Esprit insaisissable", descriptionEn: "You gain proficiency in Wisdom saving throws.", name: 'Slippery Mind', description: 'Tu gagnes la maîtrise des jets de sauvegarde de Sagesse.' }
            ],
            18: [
                { nameFr: "Insaisissable", descriptionEn: "No attack roll has advantage against you while you are not incapacitated.", name: 'Elusive', description: "Aucun jet d'attaque n'a l'avantage contre toi tant que tu n'es pas incapable d'agir." }
            ],
            20: [
                { nameFr: "Coup de chance", descriptionEn: "Turn a missed attack into a hit OR treat a d20 as a 20. 1/short rest.", name: 'Stroke of Luck', description: 'Transforme une attaque ratée en coup au but OU considère un d20 comme un 20. 1/repos court.' }
            ]
        }
    },

    Barbarian: {
        hitDie: 12,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        spellcaster: false,
        features: {
            1: [
                { nameFr: "Rage", descriptionEn: "Bonus action: advantage on STR checks and saves, +rage damage in melee, resistance to bludgeoning/piercing/slashing damage.", name: 'Rage', description: 'Action bonus : avantage aux tests et sauvegardes de FOR, +dégâts de rage en mêlée, résistance aux dégâts contondants/perforants/tranchants.' },
                { nameFr: "Défense sans armure", descriptionEn: "While unarmored, AC = 10 + DEX modifier + CON modifier.", name: 'Unarmored Defense', description: 'Sans armure, CA = 10 + mod. DEX + mod. CON.' }
            ],
            2: [
                { nameFr: "Attaque téméraire", descriptionEn: "Advantage on your STR-based melee attacks this turn; attacks against you have advantage until your next turn.", name: 'Reckless Attack', description: "Avantage à tes attaques de mêlée basées sur la FOR ce tour-ci ; les attaques contre toi ont l'avantage jusqu'à ton prochain tour." },
                { nameFr: "Sens du danger", descriptionEn: "Advantage on DEX saves against effects you can see (traps, spells).", name: 'Danger Sense', description: 'Avantage aux sauvegardes de DEX contre les effets que tu peux voir (pièges, sorts).' }
            ],
            3: [
                { nameFr: "Voie primitive", descriptionEn: "Choose your path: Berserker or Totem Warrior.", name: 'Primal Path', description: 'Choisis ta voie : Berserker ou Totem Warrior.' }
            ],
            5: [
                { nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." },
                { nameFr: "Déplacement accéléré", descriptionEn: "+10 feet of speed while you are not wearing heavy armor.", name: 'Fast Movement', description: "+3 m de vitesse tant que tu ne portes pas d'armure lourde." }
            ],
            7: [
                { nameFr: "Instinct bestial", descriptionEn: "Advantage on initiative; if you enter a rage, you act normally even when surprised.", name: 'Feral Instinct', description: "Avantage à l'initiative ; si tu entres en rage, tu agis normalement même en cas de surprise." }
            ],
            9: [
                { nameFr: "Critique brutal", descriptionEn: "Roll one extra weapon damage die on a critical hit.", name: 'Brutal Critical', description: "Lance un dé de dégâts d'arme supplémentaire sur un coup critique." }
            ],
            11: [
                { nameFr: "Rage implacable", descriptionEn: "If you drop to 0 HP while raging, succeed on a DC 10 CON save to stay at 1 HP instead.", name: 'Relentless Rage', description: 'Si tu tombes à 0 PV en rage, réussis une sauvegarde de CON DD 10 pour rester à 1 PV à la place.' }
            ],
            13: [
                { nameFr: "Critique brutal (2)", descriptionEn: "Two extra weapon damage dice on a critical hit.", name: 'Brutal Critical (2)', description: 'Deux dés de dégâts d\'arme supplémentaires sur un coup critique.' }
            ],
            15: [
                { nameFr: "Rage persistante", descriptionEn: "Your rage ends only if you fall unconscious or choose to end it.", name: 'Persistent Rage', description: 'Ta rage ne prend fin que si tu tombes inconscient ou si tu le décides.' }
            ],
            17: [
                { nameFr: "Critique brutal (3)", descriptionEn: "Three extra weapon damage dice on a critical hit.", name: 'Brutal Critical (3)', description: 'Trois dés de dégâts d\'arme supplémentaires sur un coup critique.' }
            ],
            18: [
                { nameFr: "Puissance indomptable", descriptionEn: "A STR check lower than your STR score uses your STR score instead.", name: 'Indomitable Might', description: 'Un test de FOR inférieur à ta valeur de FOR utilise ta valeur de FOR à la place.' }
            ],
            20: [
                { nameFr: "Champion primitif", descriptionEn: "STR and CON increase by 4 (max 24).", name: 'Primal Champion', description: 'FOR et CON augmentent de 4 (max 24).' }
            ]
        }
    },

    Monk: {
        hitDie: 8,
        profs: ["Simple Weapons", "Shortswords"],
        spellcaster: false,
        features: {
            1: [
                { nameFr: "Défense sans armure", descriptionEn: "While unarmored, AC = 10 + DEX modifier + WIS modifier.", name: 'Unarmored Defense', description: 'Sans armure, CA = 10 + mod. DEX + mod. SAG.' },
                { nameFr: "Arts martiaux", descriptionEn: "Use DEX for your unarmed strikes and monk weapons; your unarmed damage die grows with level; unarmed strike as a bonus action.", name: 'Martial Arts', description: 'Utilise la DEX pour tes attaques à mains nues et tes armes de moine ; le dé de dégâts à mains nues augmente avec le niveau ; attaque à mains nues en action bonus.' }
            ],
            2: [
                { nameFr: "Ki", descriptionEn: "Spend ki points for Flurry of Blows, Patient Defense or Step of the Wind. They recharge after a short rest.", name: 'Ki', description: 'Dépense des points de ki pour Flurry of Blows (déluge de coups), Patient Defense (défense patiente) ou Step of the Wind (pas du vent). Ils se rechargent après un repos court.' },
                { nameFr: "Déplacement sans armure", descriptionEn: "+10 feet of speed while unarmored (increases with level).", name: 'Unarmored Movement', description: '+3 m de vitesse sans armure (augmente avec le niveau).' }
            ],
            3: [
                { nameFr: "Tradition monastique", descriptionEn: "Choose your tradition: Open Hand, Shadow or Four Elements.", name: 'Monastic Tradition', description: 'Choisis ta tradition : Open Hand, Shadow ou Four Elements.' },
                { nameFr: "Déviation de projectiles", descriptionEn: "Reaction: reduce the damage of a ranged weapon attack; you can even catch the missile and throw it back.", name: 'Deflect Missiles', description: "Réaction : réduis les dégâts d'une attaque d'arme à distance ; tu peux même attraper le projectile et le renvoyer." }
            ],
            4: [
                { nameFr: "Chute ralentie", descriptionEn: "Reaction: reduce falling damage by 5×your monk level.", name: 'Slow Fall', description: 'Réaction : réduis les dégâts de chute de 5×niveau de moine.' }
            ],
            5: [
                { nameFr: "Attaque supplémentaire", descriptionEn: "You attack twice when you take the Attack action.", name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." },
                { nameFr: "Frappe étourdissante", descriptionEn: "Spend 1 ki when you hit; the target must succeed on a CON save or be stunned until your next turn.", name: 'Stunning Strike', description: "Dépense 1 ki quand tu touches ; la cible réussit une sauvegarde de CON ou est étourdie jusqu'à ton prochain tour." }
            ],
            6: [
                { nameFr: "Frappes imprégnées de ki", descriptionEn: "Your unarmed strikes count as magical for overcoming resistances.", name: 'Ki-Empowered Strikes', description: 'Tes attaques à mains nues comptent comme magiques pour vaincre les résistances.' }
            ],
            7: [
                { nameFr: "Esquive instinctive", descriptionEn: "DEX saves: no damage on a success, half on a failure.", name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." },
                { nameFr: "Quiétude de l'esprit", descriptionEn: "Action: end one effect that has you charmed or frightened.", name: 'Stillness of Mind', description: 'Action : mets fin à un effet qui te rend charmé ou effrayé.' }
            ],
            10: [
                { nameFr: "Pureté du corps", descriptionEn: "Immune to disease and poison.", name: 'Purity of Body', description: 'Immunisé contre les maladies et le poison.' }
            ],
            13: [
                { nameFr: "Langue du soleil et de la lune", descriptionEn: "You understand all spoken languages, and every creature understands you.", name: 'Tongue of the Sun and Moon', description: 'Tu comprends toutes les langues parlées, et toute créature te comprend.' }
            ],
            14: [
                { nameFr: "Âme de diamant", descriptionEn: "Proficiency in ALL saving throws; spend 1 ki to reroll a failed save.", name: 'Diamond Soul', description: 'Maîtrise de TOUS les jets de sauvegarde ; dépense 1 ki pour relancer une sauvegarde ratée.' }
            ],
            18: [
                { nameFr: "Corps vide", descriptionEn: "Spend 4 ki: invisible for 1 minute with resistance to all damage except force.", name: 'Empty Body', description: 'Dépense 4 ki : invisible 1 minute avec résistance à tous les dégâts sauf force.' }
            ],
            20: [
                { nameFr: "Être parfait", descriptionEn: "Regain 4 ki points when you roll initiative with none left.", name: 'Perfect Self', description: "Regagne 4 points de ki quand tu lances l'initiative sans qu'il t'en reste." }
            ]
        }
    },

    Warlock: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons"],
        spellcaster: true,
        spellcastingAbility: 'CHA',
        features: {
            1: [
                { nameFr: "Protecteur d'un autre monde", descriptionEn: "Choose your patron: The Fiend, The Great Old One or The Archfey.", name: 'Otherworldly Patron', description: 'Choisis ton patron : The Fiend, The Great Old One ou The Archfey.' },
                { nameFr: "Magie de pacte", descriptionEn: "Cast spells using Charisma from a small pool of slots that recharge after a short rest.", name: 'Pact Magic', description: "Lance des sorts grâce au Charisme via une petite réserve d'emplacements qui se rechargent après un repos court." }
            ],
            2: [
                { nameFr: "Invocations occultes", descriptionEn: "Learn magical abilities (e.g. Agonizing Blast, Devil's Sight); you can swap them as you level.", name: 'Eldritch Invocations', description: "Apprends des aptitudes magiques (ex. Agonizing Blast, Devil's Sight) ; tu peux en échanger en montant de niveau." }
            ],
            3: [
                { nameFr: "Don du pacte", descriptionEn: "Choose the Pact of the Chain, of the Blade or of the Tome.", name: 'Pact Boon', description: 'Choisis le Pacte de la chaîne, de la lame ou du grimoire.' }
            ],
            11: [
                { nameFr: "Arcanum mystique (niv. 6)", descriptionEn: "Cast one level-6 spell once per long rest, without a slot.", name: 'Mystic Arcanum (6th)', description: 'Lance un sort de niveau 6 une fois par repos long, sans emplacement.' }
            ],
            13: [
                { nameFr: "Arcanum mystique (niv. 7)", descriptionEn: "One level-7 spell, 1/long rest, without a slot.", name: 'Mystic Arcanum (7th)', description: 'Un sort de niveau 7, 1/repos long, sans emplacement.' }
            ],
            15: [
                { nameFr: "Arcanum mystique (niv. 8)", descriptionEn: "One level-8 spell, 1/long rest, without a slot.", name: 'Mystic Arcanum (8th)', description: 'Un sort de niveau 8, 1/repos long, sans emplacement.' }
            ],
            17: [
                { nameFr: "Arcanum mystique (niv. 9)", descriptionEn: "One level-9 spell, 1/long rest, without a slot.", name: 'Mystic Arcanum (9th)', description: 'Un sort de niveau 9, 1/repos long, sans emplacement.' }
            ],
            20: [
                { nameFr: "Maître occulte", descriptionEn: "Spend 1 minute entreating your patron to recover all your Pact Magic slots. 1/long rest.", name: 'Eldritch Master', description: 'Passe 1 minute à implorer ton patron pour récupérer tous tes emplacements de Pact Magic. 1/repos long.' }
            ]
        }
    },

    Bard: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        spellcaster: true,
        spellcastingAbility: 'CHA',
        features: {
            1: [
                { nameFr: "Incantation", descriptionEn: "Cast bard spells using Charisma.", name: 'Spellcasting', description: 'Lance des sorts de barde grâce au Charisme.' },
                { nameFr: "Incantation rituelle", descriptionEn: "Cast a ritual-tagged spell without spending a slot: 10 extra minutes, out of combat only.", name: 'Ritual Casting', description: "Lance un sort marqué rituel sans dépenser d'emplacement : 10 minutes de plus, hors combat seulement." },
                { nameFr: "Inspiration bardique (d6)", descriptionEn: "Bonus action: give an ally a d6 to add to an attack, a check or a save. CHA modifier uses/long rest.", name: 'Bardic Inspiration (d6)', description: 'Action bonus : donne à un allié un d6 à ajouter à une attaque, un test ou une sauvegarde. Mod. CHA/repos long.' }
            ],
            2: [
                { nameFr: "Touche-à-tout", descriptionEn: "Add half your proficiency bonus to ability checks you are not proficient in.", name: 'Jack of All Trades', description: 'Ajoute la moitié de ton bonus de maîtrise aux tests de caractéristique que tu ne maîtrises pas.' },
                { nameFr: "Chant reposant (d6)", descriptionEn: "Your allies regain an extra 1d6 HP on a short rest.", name: 'Song of Rest (d6)', description: "Tes alliés regagnent 1d6 PV supplémentaires lors d'un repos court." }
            ],
            3: [
                { nameFr: "Collège bardique", descriptionEn: "Choose your college: Lore or Valor.", name: 'Bard College', description: 'Choisis ton collège : Lore ou Valor.' },
                { nameFr: "Expertise", descriptionEn: "Double your proficiency bonus for two skills.", name: 'Expertise', description: 'Bonus de maîtrise doublé pour deux compétences.' }
            ],
            5: [
                { nameFr: "Inspiration bardique (d8)", descriptionEn: "Your inspiration die becomes a d8.", name: 'Bardic Inspiration (d8)', description: "Ton dé d'inspiration passe au d8." },
                { nameFr: "Source d'inspiration", descriptionEn: "Recover your Bardic Inspiration uses on a short rest as well.", name: 'Font of Inspiration', description: 'Récupère tes utilisations de Bardic Inspiration aussi après un repos court.' }
            ],
            6: [
                { nameFr: "Contre-charme", descriptionEn: "Action: allies within 30 feet gain advantage against being charmed and frightened.", name: 'Countercharm', description: "Action : les alliés à 9 m ou moins gagnent l'avantage contre les états charmé et effrayé." }
            ],
            9: [
                { nameFr: "Chant reposant (d8)", descriptionEn: "Your Song of Rest die becomes a d8 (d10 at level 13, d12 at 17).", name: 'Song of Rest (d8)', description: 'Ton dé de Chant reposant passe au d8 (d10 au niveau 13, d12 au 17).' }
            ],
            10: [
                { nameFr: "Secrets magiques", descriptionEn: "Learn two spells from any class.", name: 'Magical Secrets', description: "Apprends deux sorts de n'importe quelle classe." },
                { nameFr: "Inspiration bardique (d10)", descriptionEn: "Your inspiration die becomes a d10.", name: 'Bardic Inspiration (d10)', description: "Ton dé d'inspiration passe au d10." }
            ],
            14: [
                { nameFr: "Secrets magiques (2)", descriptionEn: "Two more spells from any class.", name: 'Magical Secrets (2)', description: "Deux sorts supplémentaires de n'importe quelle classe." }
            ],
            15: [
                { nameFr: "Inspiration bardique (d12)", descriptionEn: "Your inspiration die becomes a d12.", name: 'Bardic Inspiration (d12)', description: "Ton dé d'inspiration passe au d12." }
            ],
            18: [
                { nameFr: "Secrets magiques (3)", descriptionEn: "Two more spells again, from any class.", name: 'Magical Secrets (3)', description: "Encore deux sorts de n'importe quelle classe." }
            ],
            20: [
                { nameFr: "Inspiration supérieure", descriptionEn: "Regain one Bardic Inspiration when you roll initiative with none left.", name: 'Superior Inspiration', description: "Regagne une Bardic Inspiration quand tu lances l'initiative et qu'il ne t'en reste plus." }
            ]
        }
    },

    Sorcerer: {
        hitDie: 6,
        profs: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light Crossbows"],
        spellcaster: true,
        spellcastingAbility: 'CHA',
        features: {
            1: [
                { nameFr: "Incantation", descriptionEn: "Cast sorcerer spells using Charisma.", name: 'Spellcasting', description: "Lance des sorts d'ensorceleur grâce au Charisme." },
                { nameFr: "Origine magique", descriptionEn: "Choose your origin: Draconic Bloodline or Wild Magic.", name: 'Sorcerous Origin', description: 'Choisis ton origine : Draconic Bloodline ou Wild Magic.' }
            ],
            2: [
                { nameFr: "Source de magie", descriptionEn: "Gain sorcery points; convert them into spell slots and back.", name: 'Font of Magic', description: 'Gagne des points de sorcellerie ; convertis-les en emplacements de sort et inversement.' }
            ],
            3: [
                { nameFr: "Métamagie", descriptionEn: "Reshape your spells with options such as Twinned Spell, Quickened Spell or Subtle Spell.", name: 'Metamagic', description: 'Modifie tes sorts avec des options comme Twinned Spell, Quickened Spell ou Subtle Spell.' }
            ],
            10: [
                { nameFr: "Métamagie (3e option)", descriptionEn: "Learn one more Metamagic option.", name: 'Metamagic (3e option)', description: 'Apprends une option de Métamagie supplémentaire.' }
            ],
            17: [
                { nameFr: "Métamagie (4e option)", descriptionEn: "Learn a final Metamagic option.", name: 'Metamagic (4e option)', description: 'Apprends une dernière option de Métamagie.' }
            ],
            20: [
                { nameFr: "Restauration magique", descriptionEn: "Regain 4 sorcery points after a short rest.", name: 'Sorcerous Restoration', description: 'Regagne 4 points de sorcellerie après un repos court.' }
            ]
        }
    }
};

// Get all features for a class up to a certain level
export function getFeaturesForLevel(className: string, level: number): Feature[] {
    const classData = CLASS_FEATURES[className];
    if (!classData) return [];

    const features: Feature[] = [];
    for (let lvl = 1; lvl <= level; lvl++) {
        if (classData.features[lvl]) {
            features.push(...classData.features[lvl]);
        }
    }
    return features;
}

// Get new features gained at a specific level
export function getNewFeaturesAtLevel(className: string, level: number): Feature[] {
    const classData = CLASS_FEATURES[className];
    if (!classData) return [];
    return classData.features[level] || [];
}

// Check if level grants ASI
const ASI_LEVELS = [4, 8, 12, 16, 19];
// da-m3 — ASI bonus par classe (SRD) : le Guerrier en gagne aux niveaux 6 et
// 14, le Roublard au niveau 10.
const CLASS_EXTRA_ASI: Record<string, number[]> = {
    Fighter: [6, 14],
    Rogue: [10],
};
export function asiLevelsFor(className?: string): number[] {
    return [...ASI_LEVELS, ...(CLASS_EXTRA_ASI[String(className || '')] || [])].sort((a, b) => a - b);
}

/** ASI levels crossed by a level-up from `from` (exclusive) to `to` (inclusive).
 *  A big XP grant can jump several levels at once — each crossed ASI level counts. */
export function asiLevelsBetween(from: number, to: number, className?: string): number[] {
    return asiLevelsFor(className).filter(l => l > from && l <= to);
}

// Get sneak attack dice for rogue
export function getSneakAttackDice(level: number): string {
    const dice = Math.ceil(level / 2);
    return `${dice}d6`;
}
