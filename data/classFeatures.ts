// Class Features by Level for D&D 5e (Simplified 7 Classes)
// Features are automatically added when a character levels up

import { Feature } from '../types';

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
                { name: 'Fighting Style', description: "Choisis une spécialisation de combat qui t'accorde des bonus uniques." },
                { name: 'Second Wind', description: 'Action bonus : tu regagnes 1d10+niveau PV. Se recharge après un repos court.' }
            ],
            2: [
                { name: 'Action Surge', description: 'Tu effectues une action supplémentaire. Se recharge après un repos court.' }
            ],
            3: [
                { name: 'Martial Archetype', description: 'Choisis Champion, Battle Master ou Eldritch Knight.' }
            ],
            5: [
                { name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            9: [
                { name: 'Indomitable', description: 'Relance un jet de sauvegarde raté. 1/repos long.' }
            ],
            11: [
                { name: 'Extra Attack (2)', description: "Tu attaques trois fois quand tu effectues l'action Attaquer." }
            ],
            20: [
                { name: 'Extra Attack (3)', description: "Tu attaques quatre fois quand tu effectues l'action Attaquer." }
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
                { name: 'Divine Sense', description: 'Détecte les célestes, les fiélons et les morts-vivants à 18 m ou moins.' },
                { name: 'Lay on Hands', description: 'Réserve de soins de 5×niveau PV. Touche une créature pour la soigner ou guérir une maladie.' }
            ],
            2: [
                { name: 'Fighting Style', description: 'Choisis une spécialisation de combat.' },
                { name: 'Spellcasting', description: 'Lance des sorts divins grâce au Charisme.' },
                { name: 'Divine Smite', description: 'Dépense un emplacement de sort pour infliger 2d8+ dégâts radiants quand tu touches.' }
            ],
            3: [
                { name: 'Sacred Oath', description: 'Choisis ton serment : Devotion, Ancients ou Vengeance.' },
                { name: 'Channel Divinity', description: 'Utilise les pouvoirs divins propres à ton serment. 1/repos court.' }
            ],
            5: [
                { name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            6: [
                { name: 'Aura of Protection', description: '+mod. CHA aux jets de sauvegarde des alliés à 3 m ou moins.' }
            ],
            14: [
                { name: 'Cleansing Touch', description: 'Mets fin à un sort sur toi ou un allié. Mod. CHA/repos long.' }
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
                { name: 'Spellcasting', description: "Lance des sorts profanes grâce à l'Intelligence. Prépare tes sorts depuis ton grimoire." },
                { name: 'Arcane Recovery', description: 'Récupère des emplacements de sort pendant un repos court. Total = moitié du niveau de magicien.' }
            ],
            2: [
                { name: 'Arcane Tradition', description: 'Choisis ton école : Evocation, Abjuration, Illusion, etc.' }
            ],
            18: [
                { name: 'Spell Mastery', description: 'Lance à volonté un sort de niveau 1 et un sort de niveau 2.' }
            ],
            20: [
                { name: 'Signature Spells', description: 'Deux sorts de niveau 3 toujours préparés, lancés gratuitement 1/repos court.' }
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
                { name: 'Spellcasting', description: 'Lance des sorts divins grâce à la Sagesse.' },
                { name: 'Divine Domain', description: 'Choisis ton domaine : Life, Light, War, Tempest, etc.' }
            ],
            2: [
                { name: 'Channel Divinity', description: 'Renvoi des morts-vivants + pouvoir de domaine. 1/repos court.' }
            ],
            5: [
                { name: 'Destroy Undead', description: 'Les morts-vivants de FP 1/2 ou moins sont détruits par ton Renvoi des morts-vivants.' }
            ],
            10: [
                { name: 'Divine Intervention', description: "Appelle ta divinité à l'aide. 10 % + niveau de chances de réussite." }
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
                { name: 'Spellcasting', description: 'Lance des sorts de la nature grâce à la Sagesse.' },
                { name: 'Druidic', description: 'La langue secrète des druides.' }
            ],
            2: [
                { name: 'Wild Shape', description: 'Transforme-toi en bête. 2/repos court. FP max = niveau/8.' },
                { name: 'Druid Circle', description: 'Choisis Circle of the Land ou Circle of the Moon.' }
            ],
            18: [
                { name: 'Timeless Body', description: 'Tu vieillis 10 fois plus lentement et ne peux pas être vieilli par magie.' }
            ],
            20: [
                { name: 'Archdruid', description: 'Utilisations illimitées de Wild Shape.' }
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
                { name: 'Favored Enemy', description: 'Avantage aux tests de Survie pour pister. Tu apprends une langue.' },
                { name: 'Natural Explorer', description: 'Expertise dans un type de terrain. Avantages lors des voyages.' }
            ],
            2: [
                { name: 'Fighting Style', description: 'Choisis une spécialisation de combat.' },
                { name: 'Spellcasting', description: 'Lance des sorts de rôdeur grâce à la Sagesse.' }
            ],
            3: [
                { name: 'Ranger Archetype', description: 'Choisis Hunter ou Beast Master.' },
                { name: 'Primeval Awareness', description: 'Détecte les aberrations, dragons, morts-vivants, etc. à 1,5 km à la ronde.' }
            ],
            5: [
                { name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." }
            ],
            20: [
                { name: 'Foe Slayer', description: "Ajoute ton mod. SAG à l'attaque ou aux dégâts contre ton ennemi juré." }
            ]
        }
    },

    Rogue: {
        hitDie: 8,
        profs: ["Light Armor", "Simple Weapons", "Hand Crossbows", "Longswords", "Rapiers", "Shortswords"],
        spellcaster: false,
        features: {
            1: [
                { name: 'Expertise', description: 'Bonus de maîtrise doublé pour deux compétences.' },
                { name: 'Sneak Attack', description: "1d6 dégâts supplémentaires avec une arme de finesse ou à distance quand tu as l'avantage." },
                { name: "Thieves' Cant", description: 'La langue secrète des roublards.' }
            ],
            2: [
                { name: 'Cunning Action', description: 'Action bonus : Foncer, Se désengager ou Se cacher.' }
            ],
            3: [
                { name: 'Roguish Archetype', description: 'Choisis Thief, Assassin ou Arcane Trickster.' }
            ],
            5: [
                { name: 'Uncanny Dodge', description: "Réaction : divise par deux les dégâts d'une attaque que tu peux voir." }
            ],
            7: [
                { name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." }
            ],
            11: [
                { name: 'Reliable Talent', description: 'Minimum 10 aux tests de caractéristique que tu maîtrises.' }
            ],
            20: [
                { name: 'Stroke of Luck', description: 'Transforme une attaque ratée en coup au but OU considère un d20 comme un 20. 1/repos court.' }
            ]
        }
    },

    Barbarian: {
        hitDie: 12,
        profs: ["Light Armor", "Medium Armor", "Shields", "Simple Weapons", "Martial Weapons"],
        spellcaster: false,
        features: {
            1: [
                { name: 'Rage', description: 'Action bonus : avantage aux tests et sauvegardes de FOR, +dégâts de rage en mêlée, résistance aux dégâts contondants/perforants/tranchants.' },
                { name: 'Unarmored Defense', description: 'Sans armure, CA = 10 + mod. DEX + mod. CON.' }
            ],
            2: [
                { name: 'Reckless Attack', description: "Avantage à tes attaques de mêlée basées sur la FOR ce tour-ci ; les attaques contre toi ont l'avantage jusqu'à ton prochain tour." },
                { name: 'Danger Sense', description: 'Avantage aux sauvegardes de DEX contre les effets que tu peux voir (pièges, sorts).' }
            ],
            3: [
                { name: 'Primal Path', description: 'Choisis ta voie : Berserker ou Totem Warrior.' }
            ],
            5: [
                { name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." },
                { name: 'Fast Movement', description: "+3 m de vitesse tant que tu ne portes pas d'armure lourde." }
            ],
            7: [
                { name: 'Feral Instinct', description: "Avantage à l'initiative ; si tu entres en rage, tu agis normalement même en cas de surprise." }
            ],
            9: [
                { name: 'Brutal Critical', description: "Lance un dé de dégâts d'arme supplémentaire sur un coup critique." }
            ],
            11: [
                { name: 'Relentless Rage', description: 'Si tu tombes à 0 PV en rage, réussis une sauvegarde de CON DD 10 pour rester à 1 PV à la place.' }
            ],
            20: [
                { name: 'Primal Champion', description: 'FOR et CON augmentent de 4 (max 24).' }
            ]
        }
    },

    Monk: {
        hitDie: 8,
        profs: ["Simple Weapons", "Shortswords"],
        spellcaster: false,
        features: {
            1: [
                { name: 'Unarmored Defense', description: 'Sans armure, CA = 10 + mod. DEX + mod. SAG.' },
                { name: 'Martial Arts', description: 'Utilise la DEX pour tes attaques à mains nues et tes armes de moine ; le dé de dégâts à mains nues augmente avec le niveau ; attaque à mains nues en action bonus.' }
            ],
            2: [
                { name: 'Ki', description: 'Dépense des points de ki pour Flurry of Blows (déluge de coups), Patient Defense (défense patiente) ou Step of the Wind (pas du vent). Ils se rechargent après un repos court.' },
                { name: 'Unarmored Movement', description: '+3 m de vitesse sans armure (augmente avec le niveau).' }
            ],
            3: [
                { name: 'Monastic Tradition', description: 'Choisis ta tradition : Open Hand, Shadow ou Four Elements.' },
                { name: 'Deflect Missiles', description: "Réaction : réduis les dégâts d'une attaque d'arme à distance ; tu peux même attraper le projectile et le renvoyer." }
            ],
            4: [
                { name: 'Slow Fall', description: 'Réaction : réduis les dégâts de chute de 5×niveau de moine.' }
            ],
            5: [
                { name: 'Extra Attack', description: "Tu attaques deux fois quand tu effectues l'action Attaquer." },
                { name: 'Stunning Strike', description: "Dépense 1 ki quand tu touches ; la cible réussit une sauvegarde de CON ou est étourdie jusqu'à ton prochain tour." }
            ],
            6: [
                { name: 'Ki-Empowered Strikes', description: 'Tes attaques à mains nues comptent comme magiques pour vaincre les résistances.' }
            ],
            7: [
                { name: 'Evasion', description: "Sauvegardes de DEX : aucun dégât en cas de réussite, moitié en cas d'échec." },
                { name: 'Stillness of Mind', description: 'Action : mets fin à un effet qui te rend charmé ou effrayé.' }
            ],
            10: [
                { name: 'Purity of Body', description: 'Immunisé contre les maladies et le poison.' }
            ],
            20: [
                { name: 'Perfect Self', description: "Regagne 4 points de ki quand tu lances l'initiative sans qu'il t'en reste." }
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
                { name: 'Otherworldly Patron', description: 'Choisis ton patron : The Fiend, The Great Old One ou The Archfey.' },
                { name: 'Pact Magic', description: "Lance des sorts grâce au Charisme via une petite réserve d'emplacements qui se rechargent après un repos court." }
            ],
            2: [
                { name: 'Eldritch Invocations', description: "Apprends des aptitudes magiques (ex. Agonizing Blast, Devil's Sight) ; tu peux en échanger en montant de niveau." }
            ],
            3: [
                { name: 'Pact Boon', description: 'Choisis le Pacte de la chaîne, de la lame ou du grimoire.' }
            ],
            11: [
                { name: 'Mystic Arcanum (6th)', description: 'Lance un sort de niveau 6 une fois par repos long, sans emplacement.' }
            ],
            20: [
                { name: 'Eldritch Master', description: 'Passe 1 minute à implorer ton patron pour récupérer tous tes emplacements de Pact Magic. 1/repos long.' }
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
                { name: 'Spellcasting', description: 'Lance des sorts de barde grâce au Charisme.' },
                { name: 'Bardic Inspiration (d6)', description: 'Action bonus : donne à un allié un d6 à ajouter à une attaque, un test ou une sauvegarde. Mod. CHA/repos long.' }
            ],
            2: [
                { name: 'Jack of All Trades', description: 'Ajoute la moitié de ton bonus de maîtrise aux tests de caractéristique que tu ne maîtrises pas.' },
                { name: 'Song of Rest (d6)', description: "Tes alliés regagnent 1d6 PV supplémentaires lors d'un repos court." }
            ],
            3: [
                { name: 'Bard College', description: 'Choisis ton collège : Lore ou Valor.' },
                { name: 'Expertise', description: 'Bonus de maîtrise doublé pour deux compétences.' }
            ],
            5: [
                { name: 'Bardic Inspiration (d8)', description: "Ton dé d'inspiration passe au d8." },
                { name: 'Font of Inspiration', description: 'Récupère tes utilisations de Bardic Inspiration aussi après un repos court.' }
            ],
            6: [
                { name: 'Countercharm', description: "Action : les alliés à 9 m ou moins gagnent l'avantage contre les états charmé et effrayé." }
            ],
            10: [
                { name: 'Magical Secrets', description: "Apprends deux sorts de n'importe quelle classe." }
            ],
            20: [
                { name: 'Superior Inspiration', description: "Regagne une Bardic Inspiration quand tu lances l'initiative et qu'il ne t'en reste plus." }
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
                { name: 'Spellcasting', description: "Lance des sorts d'ensorceleur grâce au Charisme." },
                { name: 'Sorcerous Origin', description: 'Choisis ton origine : Draconic Bloodline ou Wild Magic.' }
            ],
            2: [
                { name: 'Font of Magic', description: 'Gagne des points de sorcellerie ; convertis-les en emplacements de sort et inversement.' }
            ],
            3: [
                { name: 'Metamagic', description: 'Modifie tes sorts avec des options comme Twinned Spell, Quickened Spell ou Subtle Spell.' }
            ],
            20: [
                { name: 'Sorcerous Restoration', description: 'Regagne 4 points de sorcellerie après un repos court.' }
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
export function isASILevel(level: number): boolean {
    return ASI_LEVELS.includes(level);
}

/** ASI levels crossed by a level-up from `from` (exclusive) to `to` (inclusive).
 *  A big XP grant can jump several levels at once — each crossed ASI level counts. */
export function asiLevelsBetween(from: number, to: number): number[] {
    return ASI_LEVELS.filter(l => l > from && l <= to);
}

// Get sneak attack dice for rogue
export function getSneakAttackDice(level: number): string {
    const dice = Math.ceil(level / 2);
    return `${dice}d6`;
}
