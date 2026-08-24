// AUTO-GENERATED from dnd_monsters.csv
import { CreatureStats } from './bestiary';

export const CSV_MONSTERS: Record<string, CreatureStats> =  {
    "aboleth": {
        "id": "aboleth",
        "name": "Aboleth",
        "type": "aberration",
        "size": "large",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 135,
            "dice": "18d10+36"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 9,
            "CON": 15,
            "INT": 18,
            "WIS": 15,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The aboleth makes three tentacle attacks.Tentacle. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 12 (2d6 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 14 Constitution saving throw or become diseased. The disease has no effect for 1 minute and can be removed by any magic that cures disease. After 1 minute, the diseased creature's skin be",
        "speedStr": "10 ft., swim 40 ft.",
        "skill": "History +12, Perception +10",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=aboleth",
        "imageUrl": "https://www.aidedd.org/dnd/images/aboleth.jpg",
        "saves": {
            "CON": 6,
            "INT": 8,
            "WIS": 6
        },
        "senses": [
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "thug": {
        "id": "thug",
        "name": "Thug",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 11,
            "CON": 14,
            "INT": 10,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The thug makes two melee attacks.Mace. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) bludgeoning damage.Heavy Crossbow. Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.Thugs are ruthless enforcers skilled at intimidation and violence. They work for money and have few scruples.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Intimidation +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=thug",
        "imageUrl": "https://www.aidedd.org/dnd/images/thug.jpg"
    },
    "adult_black_dragon": {
        "id": "adult_black_dragon",
        "name": "Adult Black Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 14,
        "xp": 11500,
        "hp": {
            "base": 195,
            "dice": "17d12+85"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 14,
            "CON": 21,
            "INT": 14,
            "WIS": 13,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 4 (1d8) acid damage.Claw. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Tail. Melee Weapon Attack: +11 to hit, reach 15 ft.",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +11, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-black-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-black-dragon.jpg",
        "saves": {
            "DEX": 7,
            "CON": 10,
            "WIS": 6,
            "CHA": 8
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_blue_dragon": {
        "id": "adult_blue_dragon",
        "name": "Adult Blue Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 16,
        "xp": 15000,
        "hp": {
            "base": 225,
            "dice": "18d12+108"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 25,
            "DEX": 10,
            "CON": 23,
            "INT": 16,
            "WIS": 15,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 11,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage plus 5 (1d10) lightning damage.Claw. Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.Tail. Melee Weapon Attack: +12 to hit, reach",
        "speedStr": "40 ft., burrow 30 ft., fly 80 ft.",
        "skill": "Perception +12, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-blue-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-blue-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 11,
            "WIS": 7,
            "CHA": 9
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_brass_dragon": {
        "id": "adult_brass_dragon",
        "name": "Adult Brass Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 172,
            "dice": "15d12+75"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 10,
            "CON": 21,
            "INT": 14,
            "WIS": 13,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.Claw. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Tail. Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d",
        "speedStr": "40 ft., burrow 30 ft., fly 80 ft.",
        "skill": "History +7, Perception +11, Persuasion +8, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-brass-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-brass-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 10,
            "WIS": 6,
            "CHA": 8
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_bronze_dragon": {
        "id": "adult_bronze_dragon",
        "name": "Adult Bronze Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 15,
        "xp": 13000,
        "hp": {
            "base": 212,
            "dice": "17d12+102"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 25,
            "DEX": 10,
            "CON": 23,
            "INT": 16,
            "WIS": 15,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 10,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage.Claw. Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.Tail. Melee Weapon Attack: +12 to hit, reach 15 ft., one target. Hit: 16 (2d",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +7, Perception +12, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-bronze-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-bronze-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 11,
            "WIS": 7,
            "CHA": 9
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_copper_dragon": {
        "id": "adult_copper_dragon",
        "name": "Adult Copper Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 14,
        "xp": 11500,
        "hp": {
            "base": 184,
            "dice": "16d12+80"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 12,
            "CON": 21,
            "INT": 18,
            "WIS": 15,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.Claw. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Tail. Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Deception +8, Perception +12, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-copper-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-copper-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 10,
            "WIS": 7,
            "CHA": 8
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_gold_dragon": {
        "id": "adult_gold_dragon",
        "name": "Adult Gold Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 17,
        "xp": 18000,
        "hp": {
            "base": 256,
            "dice": "19d12+133"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 14,
            "CON": 25,
            "INT": 16,
            "WIS": 15,
            "CHA": 24
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage.Claw. Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 17 (2d",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +8, Perception +14, Persuasion +13, Stealth +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-gold-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-gold-dragon.jpg",
        "saves": {
            "DEX": 8,
            "CON": 13,
            "WIS": 8,
            "CHA": 13
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_green_dragon": {
        "id": "adult_green_dragon",
        "name": "Adult Green Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 15,
        "xp": 13000,
        "hp": {
            "base": 207,
            "dice": "18d12+90"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 12,
            "CON": 21,
            "INT": 18,
            "WIS": 15,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 7 (2d6) poison damage.Claw. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Tail. Melee Weapon Attack: +11 to hit, reach 15 f",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Deception +8, Insight +7, Perception +12, Persuasion +8, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-green-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-green-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 10,
            "WIS": 7,
            "CHA": 8
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_red_dragon": {
        "id": "adult_red_dragon",
        "name": "Adult Red Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 17,
        "xp": 18000,
        "hp": {
            "base": 256,
            "dice": "19d12+133"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 10,
            "CON": 25,
            "INT": 16,
            "WIS": 13,
            "CHA": 21
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.Claw. Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +14 to hit, reach 15 ft.",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Perception +13, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-red-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-red-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 13,
            "WIS": 7,
            "CHA": 11
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_silver_dragon": {
        "id": "adult_silver_dragon",
        "name": "Adult Silver Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 16,
        "xp": 15000,
        "hp": {
            "base": 243,
            "dice": "18d12+126"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 10,
            "CON": 25,
            "INT": 16,
            "WIS": 13,
            "CHA": 21
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage.Claw. Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 17 (2d",
        "speedStr": "40 ft., fly 80 ft.",
        "skill": "Arcana +8, History +8, Perception +11, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-silver-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-silver-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 12,
            "WIS": 6,
            "CHA": 10
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "adult_white_dragon": {
        "id": "adult_white_dragon",
        "name": "Adult White Dragon",
        "type": "dragon",
        "size": "huge",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 200,
            "dice": "16d12+96"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 10,
            "CON": 22,
            "INT": 8,
            "WIS": 12,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 4 (1d8) cold damage.Claw. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Tail. Melee Weapon Attack: +11 to hit, reach 15 ft.",
        "speedStr": "40 ft., burrow 30 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +11, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=adult-white-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/adult-white-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 11,
            "WIS": 6,
            "CHA": 6
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "air_elemental": {
        "id": "air_elemental",
        "name": "Air Elemental",
        "type": "elemental",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 90,
            "dice": "12d10+24"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 20,
            "CON": 14,
            "INT": 6,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The elemental makes two slam attacks.Slam. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.Whirlwind (Recharge 4-6). Each creature in the elemental's space must make a DC 13 Strength saving throw. On a failure, a target takes 15 (3d8 + 2) bludgeoning damage and is flung up 20 feet away from the elemental in a random direction and knocked p",
        "speedStr": "0 ft., fly 90 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=air-elemental",
        "imageUrl": "https://www.aidedd.org/dnd/images/air-elemental.jpg",
        "resistances": [
            "lightning",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "satyr": {
        "id": "satyr",
        "name": "Satyr",
        "type": "fey",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 31,
            "dice": "7d8"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 16,
            "CON": 11,
            "INT": 12,
            "WIS": 10,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Ram",
                "attackBonus": 3,
                "damage": "2d4+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "40 ft.",
        "skill": "Perception +2, Performance +6, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=satyr",
        "imageUrl": "https://www.aidedd.org/dnd/images/satyr.jpg"
    },
    "allosaurus": {
        "id": "allosaurus",
        "name": "Allosaurus",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 51,
            "dice": "6d10+18"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 13,
            "CON": 17,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 15 (2d10 + 4) piercing damage.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage.The allosaurus is a predatory dinosaur of great size, strength, and speed. It can run down almost any prey over open ground, pouncing to pull creatures down with its wicked claws.Monster Manual (BR)",
        "speedStr": "60 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=allosaurus",
        "imageUrl": "https://www.aidedd.org/dnd/images/allosaurus.jpg"
    },
    "ancient_black_dragon": {
        "id": "ancient_black_dragon",
        "name": "Ancient Black Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 367,
            "dice": "21d20+147"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 14,
            "CON": 25,
            "INT": 16,
            "WIS": 15,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 9 (2d8) acid damage.Claw. Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +15 to hit, reach 20 ft",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +16, Stealth +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-black-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-black-dragon.jpg",
        "saves": {
            "DEX": 9,
            "CON": 14,
            "WIS": 9,
            "CHA": 11
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_blue_dragon": {
        "id": "ancient_blue_dragon",
        "name": "Ancient Blue Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 23,
        "xp": 50000,
        "hp": {
            "base": 481,
            "dice": "26d20+208"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 29,
            "DEX": 10,
            "CON": 27,
            "INT": 18,
            "WIS": 17,
            "CHA": 21
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 14,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +16 to hit, reach 15 ft., one target. Hit: 20 (2d10 + 9) piercing damage plus 11 (2d10) lightning damage.Claw. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 16 (2d6 + 9) slashing damage.Tail. Melee Weapon Attack: +16 to hit, reac",
        "speedStr": "40 ft., burrow 40 ft., fly 80 ft.",
        "skill": "Perception +17, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-blue-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-blue-dragon.jpg",
        "saves": {
            "DEX": 7,
            "CON": 15,
            "WIS": 10,
            "CHA": 12
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_brass_dragon": {
        "id": "ancient_brass_dragon",
        "name": "Ancient Brass Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 20,
        "xp": 25000,
        "hp": {
            "base": 297,
            "dice": "17d20+119"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 10,
            "CON": 25,
            "INT": 16,
            "WIS": 15,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage.Claw. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +14 to hit, reach 20 ft., one target. Hit: 17 (2",
        "speedStr": "40 ft., burrow 40 ft., fly 80 ft.",
        "skill": "History +9, Perception +14, Persuasion +10, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-brass-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-brass-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 13,
            "WIS": 8,
            "CHA": 10
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_bronze_dragon": {
        "id": "ancient_bronze_dragon",
        "name": "Ancient Bronze Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 22,
        "xp": 41000,
        "hp": {
            "base": 444,
            "dice": "24d20+192"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 29,
            "DEX": 10,
            "CON": 27,
            "INT": 18,
            "WIS": 17,
            "CHA": 21
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 14,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +16 to hit, reach 15 ft., one target. Hit: 20 (2d10 + 9) piercing damage.Claw. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 16 (2d6 + 9) slashing damage.Tail. Melee Weapon Attack: +16 to hit, reach 20 ft., one target. Hit: 18 (2",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +10, Perception +17, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-bronze-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-bronze-dragon.jpg",
        "saves": {
            "DEX": 7,
            "CON": 15,
            "WIS": 10,
            "CHA": 12
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_copper_dragon": {
        "id": "ancient_copper_dragon",
        "name": "Ancient Copper Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 350,
            "dice": "20d20+140"
        },
        "ac": 21,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 12,
            "CON": 25,
            "INT": 20,
            "WIS": 17,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage.Claw. Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +15 to hit, reach 20 ft., one target. Hit: 17 (2",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Deception +11, Perception +17, Stealth +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-copper-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-copper-dragon.jpg",
        "saves": {
            "DEX": 8,
            "CON": 14,
            "WIS": 10,
            "CHA": 11
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_gold_dragon": {
        "id": "ancient_gold_dragon",
        "name": "Ancient Gold Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 24,
        "xp": 62000,
        "hp": {
            "base": 546,
            "dice": "28d20+252"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 30,
            "DEX": 14,
            "CON": 29,
            "INT": 18,
            "WIS": 17,
            "CHA": 28
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 16,
                "damage": "1d8+10",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage.Claw. Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.Tail. Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +10, Perception +17, Persuasion +16, Stealth +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-gold-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-gold-dragon.jpg",
        "saves": {
            "DEX": 9,
            "CON": 16,
            "WIS": 10,
            "CHA": 16
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_green_dragon": {
        "id": "ancient_green_dragon",
        "name": "Ancient Green Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 22,
        "xp": 41000,
        "hp": {
            "base": 385,
            "dice": "22d20+154"
        },
        "ac": 21,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 12,
            "CON": 25,
            "INT": 20,
            "WIS": 17,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 10 (3d6) poison damage.Claw. Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 22 (4d6 + 8) slashing damage.Tail. Melee Weapon Attack: +15 to hit, reach 20",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Deception +11, Insight +10, Perception +17, Persuasion +11, Stealth +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-green-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-green-dragon.jpg",
        "saves": {
            "DEX": 8,
            "CON": 14,
            "WIS": 10,
            "CHA": 11
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_red_dragon": {
        "id": "ancient_red_dragon",
        "name": "Ancient Red Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 24,
        "xp": 62000,
        "hp": {
            "base": 546,
            "dice": "28d20+252"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 30,
            "DEX": 10,
            "CON": 29,
            "INT": 18,
            "WIS": 15,
            "CHA": 23
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 16,
                "damage": "1d8+10",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weopon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage plus 14 (4d6) fire damage.Claw. Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.Tail. Melee Weapon Attack: +17 to hit, reach 20",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Perception +16, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-red-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-red-dragon.jpg",
        "saves": {
            "DEX": 7,
            "CON": 16,
            "WIS": 9,
            "CHA": 13
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_shadow": {
        "id": "ancient_shadow",
        "name": "Ancient Shadow",
        "type": "undead",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 16,
            "CON": 14,
            "INT": 6,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Strength Drain. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 10 (2d6 + 3) necrotic damage, and the target's Strength score is reduced by 1d4. The target dies if this reduces its Strength to 0. Otherwise, the reduction lasts until the target finishes a short or long rest. If a non-evil humanoid dies from this attack, a new shadow (CR 1/2) rises from the corpse 1d2 hours later.Ext",
        "speedStr": "40 ft.",
        "skill": "Stealth +5 (+7 in dim light or darkness)",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-shadow",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-shadow.jpg"
    },
    "ancient_silver_dragon": {
        "id": "ancient_silver_dragon",
        "name": "Ancient Silver Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 23,
        "xp": 50000,
        "hp": {
            "base": 487,
            "dice": "25d20+225"
        },
        "ac": 22,
        "speed": 30,
        "stats": {
            "STR": 30,
            "DEX": 10,
            "CON": 29,
            "INT": 18,
            "WIS": 15,
            "CHA": 23
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 15,
                "damage": "1d8+10",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage.Claw. Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.Tail. Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19",
        "speedStr": "40 ft., fly 80 ft.",
        "skill": "Arcana +11, History +11, Perception +16, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-silver-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-silver-dragon.jpg",
        "saves": {
            "DEX": 7,
            "CON": 16,
            "WIS": 9,
            "CHA": 13
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "ancient_white_dragon": {
        "id": "ancient_white_dragon",
        "name": "Ancient White Dragon",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 20,
        "xp": 25000,
        "hp": {
            "base": 333,
            "dice": "18d20+144"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 10,
            "CON": 26,
            "INT": 10,
            "WIS": 13,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 9 (2d8) cold damage.Claw. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.Tail. Melee Weapon Attack: +14 to hit, reach 20 ft",
        "speedStr": "40 ft., burrow 40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +13, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ancient-white-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/ancient-white-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 14,
            "WIS": 7,
            "CHA": 8
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "androsphinx": {
        "id": "androsphinx",
        "name": "Androsphinx",
        "type": "monstrosity",
        "size": "large",
        "cr": 17,
        "xp": 18000,
        "hp": {
            "base": 199,
            "dice": "19d10+95"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 10,
            "CON": 20,
            "INT": 16,
            "WIS": 18,
            "CHA": 23
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 10,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The sphinx makes two claw attacks.Claw. Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 17 (2d10 + 6) slashing damage.Roar (3/Day). The sphinx emits a magical roar. Each time it roars before finishing a long rest, the roar is louder and the effect is different, as detailed below. Each creature within 500 feet of the sphinx and able to hear the roar must make a saving th",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "Arcana +9, Perception +10, Religion +15",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=androsphinx",
        "imageUrl": "https://www.aidedd.org/dnd/images/androsphinx.jpg",
        "saves": {
            "DEX": 6,
            "CON": 11,
            "INT": 9,
            "WIS": 10
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "psychic"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened"
        ],
        "senses": [
            "truesight 120 ft."
        ],
        "legendaryActions": 3
    },
    "animated_armor": {
        "id": "animated_armor",
        "name": "Animated Armor",
        "type": "construct",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 33,
            "dice": "6d8+6"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 11,
            "CON": 13,
            "INT": 1,
            "WIS": 3,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The armor makes two melee attacks.Slam. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage.This suit of magically animated plate armor clamors as it moves, banging and grinding like the vengeful spirit of a fallen knight.Monster Manual (SRD)",
        "speedStr": "25 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=animated-armor",
        "imageUrl": "https://www.aidedd.org/dnd/images/animated-armor.jpg",
        "immunities": [
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "deafened",
            "exhaustion",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "ankheg": {
        "id": "ankheg",
        "name": "Ankheg",
        "type": "monstrosity",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 39,
            "dice": "6d10+6"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 11,
            "CON": 13,
            "INT": 1,
            "WIS": 13,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage plus 3 (1d6) acid damage. If the target is a Large or smaller creature, it is grappled (escape DC 13). Until this grapple ends, the ankheg can bite only the grappled creature and has advantage on attack rolls to do so.Acid Spray (Recharge 6). The ankheg spits acid in a line that is 30 feet long and 5 f",
        "speedStr": "30 ft., burrow 10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ankheg",
        "imageUrl": "https://www.aidedd.org/dnd/images/ankheg.jpg",
        "senses": [
            "darkvision 60 ft.",
            "tremorsense 60 ft."
        ]
    },
    "ankylosaurus": {
        "id": "ankylosaurus",
        "name": "Ankylosaurus",
        "type": "beast",
        "size": "huge",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 68,
            "dice": "8d12+16"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 11,
            "CON": 15,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ankylosaurus",
        "imageUrl": "https://www.aidedd.org/dnd/images/ankylosaurus.jpg"
    },
    "annis_hag": {
        "id": "annis_hag",
        "name": "Annis Hag",
        "type": "fey",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 75,
            "dice": "10d10+20"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 12,
            "CON": 14,
            "INT": 13,
            "WIS": 14,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The annis makes one Bite attack and two Claw attacks.Bite. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 15 (3d6 + 5) piercing damage.Claw. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 15 (3d6 + 5) slashing damage.Crushing Hug. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 36 (9d6 + 5) bludgeoning damage, and the target is grappled (esc",
        "speedStr": "40 ft.",
        "skill": "Deception +5, Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=annis-hag",
        "imageUrl": "https://www.aidedd.org/dnd/images/annis-hag.jpg"
    },
    "cockatrice": {
        "id": "cockatrice",
        "name": "Cockatrice",
        "type": "monstrosity",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 27,
            "dice": "6d6+6"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 12,
            "CON": 12,
            "INT": 2,
            "WIS": 13,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 3 (1d4 + 1) piercing damage, and the target must succeed on a DC 11 Constitution saving throw against being magically petrified. On a failed save, the creature begins to turn to stone and is restrained. It must repeat the saving throw at the end of its next turn. On a success, the effect ends. On a failure, the creature is petri",
        "speedStr": "20 ft., fly 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cockatrice",
        "imageUrl": "https://www.aidedd.org/dnd/images/cockatrice.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "mud_mephit": {
        "id": "mud_mephit",
        "name": "Mud Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 27,
            "dice": "6d6+6"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 12,
            "CON": 12,
            "INT": 9,
            "WIS": 11,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Fists. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) bludgeoning damage.Mud Breath (Recharge 6). The mephit belches viscid mud onto one creature within 5 feet of it. If the target is Medium or smaller, it must succeed on a DC 11 Dexterity saving throw or be restrained for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effe",
        "speedStr": "20 ft., fly 20 ft., swim 20 ft.",
        "skill": "Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mud-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/mud-mephit.jpg"
    },
    "archmage": {
        "id": "archmage",
        "name": "Archmage",
        "type": "humanoid",
        "size": "medium",
        "cr": 12,
        "xp": 8400,
        "hp": {
            "base": 99,
            "dice": "18d8+18"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 12,
            "INT": 20,
            "WIS": 15,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Dagger. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Archmages are powerful (and usually quite old) spellcasters dedicated to the study of the arcane arts. Benevolent ones counsel kings and queens, while evil ones rule as tyrants and pursue lichdom. Those who are neither good nor evil sequester themselves in remote towers to",
        "speedStr": "30 ft.",
        "skill": "Arcana +13, History +13",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=archmage",
        "imageUrl": "https://www.aidedd.org/dnd/images/archmage.jpg",
        "saves": {
            "INT": 9,
            "WIS": 6
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ]
    },
    "assassin": {
        "id": "assassin",
        "name": "Assassin",
        "type": "humanoid",
        "size": "medium",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 78,
            "dice": "12d8+24"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 16,
            "CON": 14,
            "INT": 13,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The assassin makes two shortsword attacks.Shortsword. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much damage on a successful one.Light Crossbow. Ranged Weapon Attack: +6 to hit, range 80/320 ft., one target. Hit: 7 (1d8",
        "speedStr": "30 ft.",
        "skill": "Acrobatics +6, Deception +3, Perception +3, Stealth +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=assassin",
        "imageUrl": "https://www.aidedd.org/dnd/images/assassin.jpg",
        "saves": {
            "DEX": 6,
            "INT": 4
        },
        "resistances": [
            "poison"
        ]
    },
    "astral_dreadnought": {
        "id": "astral_dreadnought",
        "name": "Astral Dreadnought",
        "type": "monstrosity",
        "size": "gargantuan",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 297,
            "dice": "17d20+119"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 28,
            "DEX": 7,
            "CON": 25,
            "INT": 5,
            "WIS": 14,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 14,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dreadnought makes one Bite attack and two Claw attacks.Bite. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 36 (5d10 + 9) force damage. If the target is a Huge or smaller creature and this damage reduces it to 0 hit points or it is incapacitated, the dreadnought swallows it. The swallowed target, along with everything it is wearing and carrying, appears in an unoc",
        "speedStr": "15 ft., fly 80 ft. (hover)",
        "skill": "Perception +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=astral-dreadnought",
        "imageUrl": "https://www.aidedd.org/dnd/images/astral-dreadnought.jpg"
    },
    "aurochs": {
        "id": "aurochs",
        "name": "Aurochs",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 38,
            "dice": "4d10+16"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 10,
            "CON": 19,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore.Monsters of the Multiverse",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=aurochs",
        "imageUrl": "https://www.aidedd.org/dnd/images/aurochs.jpg"
    },
    "awakened_shrub": {
        "id": "awakened_shrub",
        "name": "Awakened Shrub",
        "type": "plant",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 10,
            "dice": "3d6"
        },
        "ac": 9,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 8,
            "CON": 11,
            "INT": 10,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=awakened-shrub",
        "imageUrl": "https://www.aidedd.org/dnd/images/awakened-shrub.jpg",
        "resistances": [
            "piercing"
        ],
        "vulnerabilities": [
            "fire"
        ]
    },
    "awakened_tree": {
        "id": "awakened_tree",
        "name": "Awakened Tree",
        "type": "plant",
        "size": "huge",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 59,
            "dice": "7d12+14"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 6,
            "CON": 15,
            "INT": 10,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Slam. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 14 (3d6 + 4) bludgeoning damage.An awakened tree is an ordinary tree given sentience and mobility by magic.Monster Manual (SRD)",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=awakened-tree",
        "imageUrl": "https://www.aidedd.org/dnd/images/awakened-tree.jpg",
        "resistances": [
            "bludgeoning",
            "piercing"
        ],
        "vulnerabilities": [
            "fire"
        ]
    },
    "rust_monster": {
        "id": "rust_monster",
        "name": "Rust Monster",
        "type": "monstrosity",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 12,
            "CON": 13,
            "INT": 2,
            "WIS": 13,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) piercing damage.Antennae. The rust monster corrodes a nonmagical ferrous metal object it can see within 5 feet of it. If the object isn't being worn or carried, the touch destroys a 1-foot cube of it. If the object is being worn or carried by a creature, the creature can make a DC 11 Dexterity saving throw to avoid the",
        "speedStr": "40 ft",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=rust-monster",
        "imageUrl": "https://www.aidedd.org/dnd/images/rust-monster.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "azer": {
        "id": "azer",
        "name": "Azer",
        "type": "elemental",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 39,
            "dice": "6d8+12"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 12,
            "CON": 15,
            "INT": 12,
            "WIS": 13,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Warhammer. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage, or 8 (1d10 + 3) bludgeoning damage if used with two hands to make a melee attack, plus 3 (1d6) fire damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=azer",
        "imageUrl": "https://www.aidedd.org/dnd/images/azer.jpg",
        "saves": {
            "CON": 4
        },
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ]
    },
    "baboon": {
        "id": "baboon",
        "name": "Baboon",
        "type": "beast",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 3,
            "dice": "1d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 14,
            "CON": 11,
            "INT": 4,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 1 (1d4 - 1) piercing damage.Monster Manual (SRD)",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=baboon",
        "imageUrl": "https://www.aidedd.org/dnd/images/baboon.jpg"
    },
    "badger": {
        "id": "badger",
        "name": "Badger",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 3,
            "dice": "1d4+1"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 4,
            "DEX": 11,
            "CON": 12,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "20 ft., burrow 5 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=badger",
        "imageUrl": "https://www.aidedd.org/dnd/images/badger.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "balor": {
        "id": "balor",
        "name": "Balor",
        "type": "fiend",
        "size": "huge",
        "cr": 19,
        "xp": 22000,
        "hp": {
            "base": 262,
            "dice": "21d12+126"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 15,
            "CON": 22,
            "INT": 20,
            "WIS": 16,
            "CHA": 22
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The balor makes two attacks: one with its longsword and one with its whip.Longsword. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 21 (3d8 + 8) slashing damage plus 13 (3d8) lightning damage. If the balor scores a critical hit, it rolls damage dice three times, instead of twice.Whip. Melee Weapon Attack: +14 to hit, reach 30 ft., one target. Hit: 15 (2d6 + 8) slashin",
        "speedStr": "40 ft., fly 80 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=balor",
        "imageUrl": "https://www.aidedd.org/dnd/images/balor.jpg",
        "saves": {
            "STR": 14,
            "CON": 12,
            "WIS": 9,
            "CHA": 12
        },
        "resistances": [
            "cold",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "bandit_captain": {
        "id": "bandit_captain",
        "name": "Bandit Captain",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 65,
            "dice": "10d8+20"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 16,
            "CON": 14,
            "INT": 14,
            "WIS": 11,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The captain makes three melee attacks: two with its scimitar and one with its dagger. Or the captain makes two ranged attacks with its daggers.Scimitar. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Dagger. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d4 + 3) piercing damage.Parry. The captai",
        "speedStr": "30 ft.",
        "skill": "Athletics +4, Deception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bandit-captain",
        "imageUrl": "https://www.aidedd.org/dnd/images/bandit-captain.jpg",
        "saves": {
            "STR": 4,
            "DEX": 5,
            "WIS": 2
        }
    },
    "banshee": {
        "id": "banshee",
        "name": "Banshee",
        "type": "undead",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 58,
            "dice": "13d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 14,
            "CON": 10,
            "INT": 12,
            "WIS": 11,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Corrupting Touch. Melee Spell Attack: +4 to hit, reach 5 ft., one target. Hit: 12 (3d6 + 2) necrotic damage.Horrifying Visage. Each non-undead creature within 60 feet of the banshee that can see her must succeed on a DC 13 Wisdom saving throw or be frightened for 1 minute. A frightened target can repeat the saving throw at the end of each of its turns, with disadvantage if the banshee is within li",
        "speedStr": "0 ft., fly 40 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=banshee",
        "imageUrl": "https://www.aidedd.org/dnd/images/banshee.jpg"
    },
    "barbed_devil": {
        "id": "barbed_devil",
        "name": "Barbed Devil",
        "type": "fiend",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 110,
            "dice": "13d8+52"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 17,
            "CON": 18,
            "INT": 12,
            "WIS": 14,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes three melee attacks: one with its tail and two with its claws. Alternatively, it can use Hurl Flame twice.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Tail. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.Hurl Flame. Ranged Spell Attack: +5 to hit, range 150 ft., one target. H",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Insight +5, Perception +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=barbed-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/barbed-devil.jpg",
        "saves": {
            "STR": 6,
            "CON": 7,
            "WIS": 5,
            "CHA": 5
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "barghest": {
        "id": "barghest",
        "name": "Barghest",
        "type": "fiend",
        "size": "large",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 90,
            "dice": "12d10+24"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 15,
            "CON": 14,
            "INT": 13,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The barghest makes one Bite attack and one Claw attack.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage.Spellcasting. The barghest casts one of the following spells, requiring no material components and using Charisma as the spellcasting abili",
        "speedStr": "60 ft. (30 ft. in goblin form)",
        "skill": "Deception +4, Intimidation +4, Perception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=barghest",
        "imageUrl": "https://www.aidedd.org/dnd/images/barghest.jpg"
    },
    "barlgura": {
        "id": "barlgura",
        "name": "Barlgura",
        "type": "fiend",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 68,
            "dice": "8d10+24"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 7,
            "WIS": 14,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The barlgura makes three attacks: one with its bite and two with its fists.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage.Fist. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) bludgeoning damage.Monster Manual (BR+)",
        "speedStr": "40 ft., climb 40 ft.",
        "skill": "Perception +5, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=barlgura",
        "imageUrl": "https://www.aidedd.org/dnd/images/barlgura.jpg"
    },
    "basilisk": {
        "id": "basilisk",
        "name": "Basilisk",
        "type": "monstrosity",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "8d8+16"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 8,
            "CON": 15,
            "INT": 2,
            "WIS": 8,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage plus 7 (2d6) poison damage.A basilisk is a multilegged, reptilian horror whose deadly gaze transforms victims into porous stone. With it strong jaws, the creature consumes this stone, which returns to organic form in its gullet.Monster Manual (SRD)",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=basilisk",
        "imageUrl": "https://www.aidedd.org/dnd/images/basilisk.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "bat": {
        "id": "bat",
        "name": "Bat",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 15,
            "CON": 8,
            "INT": 2,
            "WIS": 12,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +0 to hit, reach 5 ft., one creature. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "5 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bat",
        "imageUrl": "https://www.aidedd.org/dnd/images/bat.jpg",
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "bearded_devil": {
        "id": "bearded_devil",
        "name": "Bearded Devil",
        "type": "fiend",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "8d8+16"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 15,
            "CON": 15,
            "INT": 9,
            "WIS": 11,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes two attacks: one with its beard and one with its glaive.Beard. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) piercing damage, and the target must succeed on a DC 12 Constitution saving throw or be poisoned for 1 minute. While poisoned in this way, the target can't regain hit points. The target can repeat the saving throw at the end of each",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bearded-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/bearded-devil.jpg",
        "saves": {
            "STR": 5,
            "CON": 4,
            "WIS": 2
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "behir": {
        "id": "behir",
        "name": "Behir",
        "type": "monstrosity",
        "size": "huge",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 168,
            "dice": "16d12+64"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 16,
            "CON": 18,
            "INT": 7,
            "WIS": 14,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The behir makes two attacks: one with its bite and one to constrict.Bite. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 22 (3d10 + 6) piercing damage.Constrict. Melee Weapon Attack: +10 to hit, reach 5 ft., one Large or smaller creature. Hit: 17 (2d10 + 6) bludgeoning damage plus 17 (2d10 + 6) slashing damage. The target is grappled (escape DC 16) if the behir isn't",
        "speedStr": "50 ft., climb 40 ft.",
        "skill": "Perception +6, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=behir",
        "imageUrl": "https://www.aidedd.org/dnd/images/behir.jpg",
        "immunities": [
            "lightning"
        ],
        "senses": [
            "darkvision 90 ft."
        ]
    },
    "belaphoss": {
        "id": "belaphoss",
        "name": "Belaphoss",
        "type": "fiend",
        "size": "huge",
        "cr": 20,
        "xp": 25000,
        "hp": {
            "base": 262,
            "dice": "21d12+126"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 15,
            "CON": 22,
            "INT": 20,
            "WIS": 16,
            "CHA": 22
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. Belaphoss makes two attacks: one with his greataxe and one with his whip.Greataxe. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 24 (3d10 + 8) slashing damage plus 13 (3d8) fire damage. If Belaphoss scores a critical hit, he rolls damage dice three times, instead of twice.Whip. Melee Weapon Attack: +14 to hit, reach 30 ft., one target. Hit: 15 (2d6 + 8) slashing dama",
        "speedStr": "40 ft., fly 80 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=belaphoss",
        "imageUrl": "https://www.aidedd.org/dnd/images/belaphoss.jpg"
    },
    "berserker": {
        "id": "berserker",
        "name": "Berserker",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 67,
            "dice": "9d8+27"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 17,
            "INT": 9,
            "WIS": 11,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Greataxe. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.Hailing from uncivilized lands, unpredictable berserkers come together in war parties and seek conflict wherever they can find it.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=berserker",
        "imageUrl": "https://www.aidedd.org/dnd/images/berserker.jpg"
    },
    "worg": {
        "id": "worg",
        "name": "Worg",
        "type": "monstrosity",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 26,
            "dice": "4d10+4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 13,
            "CON": 13,
            "INT": 7,
            "WIS": 11,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.A worg is a monstrous wolf-like predator that delights in hunting and devouring creatures weaker than itself.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=worg",
        "imageUrl": "https://www.aidedd.org/dnd/images/worg.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "black_dragon_wyrmling": {
        "id": "black_dragon_wyrmling",
        "name": "Black Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 33,
            "dice": "6d8+6"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 13,
            "INT": 10,
            "WIS": 11,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 2 (1d4) acid damage.Acid Breath (Recharge 5–6). The dragon exhales acid in a 15-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 22 (5d8) acid damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 60 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=black-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/black-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 4,
            "CON": 3,
            "WIS": 2,
            "CHA": 3
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "black_pudding": {
        "id": "black_pudding",
        "name": "Black Pudding",
        "type": "ooze",
        "size": "large",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 85,
            "dice": "10d10+30"
        },
        "ac": 7,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 5,
            "CON": 16,
            "INT": 1,
            "WIS": 6,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Pseudopod. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage plus 18 (4d8) acid damage. In addition, nonmagical armor worn by the target is partly dissolved and takes a permanent and cumulative -1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10.ReactionsSplit. When a pudding that is Medium or larger is subjected to",
        "speedStr": "20 ft., climb 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=black-pudding",
        "imageUrl": "https://www.aidedd.org/dnd/images/black-pudding.jpg",
        "immunities": [
            "acid",
            "cold",
            "lightning",
            "slashing"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "exhaustion",
            "frightened",
            "prone"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "swarm_of_rats": {
        "id": "swarm_of_rats",
        "name": "Swarm Of Rats",
        "type": "swarm",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 24,
            "dice": "7d8-7"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 9,
            "DEX": 11,
            "CON": 9,
            "INT": 2,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites. Melee Weapon Attack: +2 to hit, reach 0 ft., one target in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-rats",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-rats.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ],
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "swarm_of_ravens": {
        "id": "swarm_of_ravens",
        "name": "Swarm Of Ravens",
        "type": "swarm",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 24,
            "dice": "7d8-7"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 14,
            "CON": 8,
            "INT": 3,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Beaks. Melee Weapon Attack: +4 to hit, reach 5 ft., one target in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 50 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-ravens",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-ravens.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ]
    },
    "blue_dragon_wyrmling": {
        "id": "blue_dragon_wyrmling",
        "name": "Blue Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "8d8+16"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 15,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage plus 3 (1d6) lightning damage.Lightning Breath (Recharge 5-6). The dragon exhales lightning in a 30-foot line that is 5 feet wide. Each creature in that line must make a DC 12 Dexterity saving throw, taking 22 (4d10) lightning damage on a failed save, or half as much damage on a successful one.Monster",
        "speedStr": "30 ft., burrow 15 ft., fly 60 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=blue-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/blue-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 4,
            "WIS": 2,
            "CHA": 4
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "blink_dog": {
        "id": "blink_dog",
        "name": "Blink Dog",
        "type": "fey",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 22,
            "dice": "4d8+4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 17,
            "CON": 12,
            "INT": 10,
            "WIS": 13,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.Teleport (Recharge 4-6). The dog magically teleports, along with any equipment it is wearing or carrying, up to 40 feet to an unoccupied space it can see. Before or after teleporting, the dog can make one bite attack.A blink dog takes its name from its ability to blink in and out of existence, a talent",
        "speedStr": "40 ft.",
        "skill": "Perception +3, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=blink-dog",
        "imageUrl": "https://www.aidedd.org/dnd/images/blink-dog.jpg"
    },
    "bone_devil": {
        "id": "bone_devil",
        "name": "Bone Devil",
        "type": "fiend",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 142,
            "dice": "15d10+60"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 16,
            "CON": 18,
            "INT": 13,
            "WIS": 14,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes three attacks: two with its claws and one with its sting.Claw. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 8 (1d8 + 4) slashing damage.Sting. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 13 (2d8 + 4) piercing damage plus 17 (5d6) poison damage, and the target must succeed on a DC 14 Constitution saving throw or become poisoned for 1",
        "speedStr": "40 ft., fly 40 ft.",
        "skill": "Deception +7, Insight +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bone-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/bone-devil.jpg",
        "saves": {
            "INT": 5,
            "WIS": 6,
            "CHA": 7
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "brass_dragon_wyrmling": {
        "id": "brass_dragon_wyrmling",
        "name": "Brass Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 16,
            "dice": "3d8+3"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 13,
            "INT": 10,
            "WIS": 11,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Fire Breath. The dragon exhales fire in an 20-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 14 (4d6) fire damage on a failed save, or half as much damage on a",
        "speedStr": "30 ft., burrow 15 ft., fly 60 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=brass-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/brass-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 3,
            "WIS": 2,
            "CHA": 3
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "bronze_dragon_wyrmling": {
        "id": "bronze_dragon_wyrmling",
        "name": "Bronze Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 15,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Lightning Breath. The dragon exhales lightning in a 40-foot line that is 5 feet wide. Each creature in that line must make a DC 12 Dexterity saving throw, taking 16 (3d10) lightning damage on a failed save, or half as mu",
        "speedStr": "30 ft., fly 60 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bronze-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/bronze-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 4,
            "WIS": 2,
            "CHA": 4
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "brown_bear": {
        "id": "brown_bear",
        "name": "Brown Bear",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 34,
            "dice": "4d10+12"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 16,
            "INT": 2,
            "WIS": 13,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The bear makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.Claws. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft., climb 30 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=brown-bear",
        "imageUrl": "https://www.aidedd.org/dnd/images/brown-bear.jpg"
    },
    "bugbear": {
        "id": "bugbear",
        "name": "Bugbear",
        "type": "humanoid",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 13,
            "INT": 8,
            "WIS": 11,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Morningstar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 11 (2d8 + 2) piercing damage.Javelin. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 9 (2d6 + 2) piercing damage in melee or 5 (1d6 + 2) piercing damage at range.Bugbears are hairy goblinoids born for battle and mayhem. They survive by raiding and hunting, but are fond of setting",
        "speedStr": "30 ft.",
        "skill": "Stealth +6, Survival +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bugbear",
        "imageUrl": "https://www.aidedd.org/dnd/images/bugbear.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "bulette": {
        "id": "bulette",
        "name": "Bulette",
        "type": "monstrosity",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 94,
            "dice": "9d10+45"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 11,
            "CON": 21,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 30 (4d12 + 4) piercing damage.Deadly Leap. If the bulette jumps at least 15 feet as part of its movement, it can then use this action to land on its feet in a space that contains one or more other creatures. Each of those creatures must succeed on a DC 16 Strength or Dexterity saving throw (target's choice) or be knocked prone and",
        "speedStr": "40 ft., burrow 40 ft.",
        "skill": "Perception +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bulette",
        "imageUrl": "https://www.aidedd.org/dnd/images/bulette.jpg",
        "senses": [
            "darkvision 60 ft.",
            "tremorsense 60 ft."
        ]
    },
    "darkmantle": {
        "id": "darkmantle",
        "name": "Darkmantle",
        "type": "monstrosity",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "5d6+5"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Crush. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 6 (1d6 + 3) bludgeoning damage, and the darkmantle attaches to the target. If the target is Medium or smaller and the darkmantle has advantage on the attack roll, it attaches by engulfing the target's head, and the target is also blinded and unable to breathe while the darkmantle is attached in this way. While attached to the t",
        "speedStr": "10 ft., fly 30 ft.",
        "skill": "Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=darkmantle",
        "imageUrl": "https://www.aidedd.org/dnd/images/darkmantle.jpg",
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "cat": {
        "id": "cat",
        "name": "Cat",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 15,
            "CON": 10,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft., climb 30 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cat",
        "imageUrl": "https://www.aidedd.org/dnd/images/cat.jpg"
    },
    "centaur": {
        "id": "centaur",
        "name": "Centaur",
        "type": "monstrosity",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 14,
            "INT": 9,
            "WIS": 13,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The centaur makes two attacks: one with its pike and one with its hooves or two with its longbow.Pike. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 9 (1d10 + 4) piercing damage.Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.Longbow. Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2)",
        "speedStr": "50 ft.",
        "skill": "Athletics +6, Perception +3, Survival +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=centaur",
        "imageUrl": "https://www.aidedd.org/dnd/images/centaur.jpg"
    },
    "chain_devil": {
        "id": "chain_devil",
        "name": "Chain Devil",
        "type": "fiend",
        "size": "medium",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 85,
            "dice": "10d8+40"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 18,
            "INT": 11,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes two attacks with its chains.Chain. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) slashing damage. The target is grappled (escape DC 14) if the devil isn't already grappling a creature. Until this grapple ends, the target is restrained and takes 7 (2d6) piercing damage at the start of each of its turns.Animate Chains (Recharges after a Shor",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=chain-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/chain-devil.jpg",
        "saves": {
            "CON": 7,
            "WIS": 4,
            "CHA": 5
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "chimera": {
        "id": "chimera",
        "name": "Chimera",
        "type": "monstrosity",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 114,
            "dice": "12d10+48"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 11,
            "CON": 19,
            "INT": 3,
            "WIS": 14,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The chimera makes three attacks: one with its bite, one with its horns, and one with its claws. When its fire breath is available, it can use the breath in place of its bite or horns.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage.Horns. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) bludgeoning damage.Claws",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "Perception +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=chimera",
        "imageUrl": "https://www.aidedd.org/dnd/images/chimera.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "chuul": {
        "id": "chuul",
        "name": "Chuul",
        "type": "aberration",
        "size": "large",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 93,
            "dice": "11d10+33"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 16,
            "INT": 5,
            "WIS": 11,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The chuul makes two pincer attacks. If the chuul is grappling a creature, the chuul can also use its tentacles once.Pincer. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage. The target is grappled (escape DC 14) if it is a Large or smaller creature and the chuul doesn't have two other creatures grappled.Tentacles. One creature grappled by",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=chuul",
        "imageUrl": "https://www.aidedd.org/dnd/images/chuul.jpg",
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "clay_golem": {
        "id": "clay_golem",
        "name": "Clay Golem",
        "type": "construct",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 133,
            "dice": "14d10+56"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 9,
            "CON": 18,
            "INT": 3,
            "WIS": 8,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The golem makes two slam attacks.Slam. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 15 Constitution saving throw or have its hit point maximum reduced by an amount equal to the damage taken. The target dies if this attack reduces its hit point maximum to 0. The reduction lasts until",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=clay-golem",
        "imageUrl": "https://www.aidedd.org/dnd/images/clay-golem.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "acid",
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "cloaker": {
        "id": "cloaker",
        "name": "Cloaker",
        "type": "aberration",
        "size": "large",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 78,
            "dice": "12d10+12"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 12,
            "INT": 13,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The cloaker makes two attacks: one with its bite and one with its tail.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 10 (2d6 + 3) piercing damage, and if the target is Large or smaller, the cloaker attaches to it. If the cloaker has advantage against the target, the cloaker attaches to the target's head, and the target is blinded and unable to breathe while the",
        "speedStr": "10 ft., fly 40 ft.",
        "skill": "Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cloaker",
        "imageUrl": "https://www.aidedd.org/dnd/images/cloaker.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "cloud_giant": {
        "id": "cloud_giant",
        "name": "Cloud Giant",
        "type": "giant",
        "size": "huge",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 200,
            "dice": "16d12+96"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 10,
            "CON": 22,
            "INT": 12,
            "WIS": 16,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 10,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two morningstar attacks.Morningstar. Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 21 (3d8 + 8) piercing damage.Rock. Ranged Weapon Attack: +12 to hit, range 60/240 ft., one target. Hit: 30 (4d10 + 8) bludgeoning damage.A cloud giant earns its place in the ordning by the treasure it accumulates, the wealth it wears, and the gifts it bestows on other c",
        "speedStr": "40 ft.",
        "skill": "Insight +7, Perception +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cloud-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/cloud-giant.jpg",
        "saves": {
            "CON": 10,
            "WIS": 7,
            "CHA": 7
        }
    },
    "giant_bat": {
        "id": "giant_bat",
        "name": "Giant Bat",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 22,
            "dice": "4d10"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 16,
            "CON": 11,
            "INT": 2,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-bat",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-bat.jpg",
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "commoner": {
        "id": "commoner",
        "name": "Commoner",
        "type": "humanoid",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 4,
            "dice": "1d8"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 10,
            "CON": 10,
            "INT": 10,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Club. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.Commoners include peasants, serfs, slaves, servants, pilgrims, merchants, artisans, and hermits.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=commoner",
        "imageUrl": "https://www.aidedd.org/dnd/images/commoner.jpg"
    },
    "gnoll": {
        "id": "gnoll",
        "name": "Gnoll",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 12,
            "CON": 11,
            "INT": 6,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage.Spear. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 6 (1d8 + 2) piercing damage if used with two hands to make a melee attack.Longbow. Ranged Weapon Attack: +3 to hit, range 150/600 ft., one target. Hit: 5 (1d8 + 1) piercing",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gnoll",
        "imageUrl": "https://www.aidedd.org/dnd/images/gnoll.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "copper_dragon_wyrmling": {
        "id": "copper_dragon_wyrmling",
        "name": "Copper Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "4d8+4"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 12,
            "CON": 13,
            "INT": 14,
            "WIS": 11,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Acid Breath. The dragon exhales acid in an 20-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 18 (4d8) acid damage on a failed save, or half as much damage on a",
        "speedStr": "30 ft., climb 30 ft., fly 60 ft.",
        "skill": "Perception +4, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=copper-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/copper-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 3,
            "CON": 3,
            "WIS": 2,
            "CHA": 3
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "couatl": {
        "id": "couatl",
        "name": "Couatl",
        "type": "celestial",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 97,
            "dice": "13d8+39"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 20,
            "CON": 17,
            "INT": 18,
            "WIS": 20,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +8 to hit, reach 5 ft., one creature. Hit: 8 (1d6 + 5) piercing damage, and the target must succeed on a DC 13 Constitution saving throw or be poisoned for 24 hours. Until this poison ends, the target is unconscious. Another creature can use an action to shake the target awake.Constrict. Melee Weapon Attack: +6 to hit, reach 10 ft., one Medium or smaller creature. Hit: 1",
        "speedStr": "30 ft., fly 90 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=couatl",
        "imageUrl": "https://www.aidedd.org/dnd/images/couatl.jpg",
        "saves": {
            "CON": 5,
            "WIS": 7,
            "CHA": 6
        },
        "resistances": [
            "radiant",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "psychic"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "crab": {
        "id": "crab",
        "name": "Crab",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 11,
            "CON": 10,
            "INT": 1,
            "WIS": 8,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claw. Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "20 ft., swim 20 ft.",
        "skill": "Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=crab",
        "imageUrl": "https://www.aidedd.org/dnd/images/crab.jpg",
        "senses": [
            "blindsight 30 ft."
        ]
    },
    "crawling_claw": {
        "id": "crawling_claw",
        "name": "Crawling Claw",
        "type": "undead",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 14,
            "CON": 11,
            "INT": 5,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claw. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning or slashing damage (claw's choice).Monster Manual (BR+)",
        "speedStr": "20 ft., climb 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=crawling-claw",
        "imageUrl": "https://www.aidedd.org/dnd/images/crawling-claw.jpg"
    },
    "gray_ooze": {
        "id": "gray_ooze",
        "name": "Gray Ooze",
        "type": "ooze",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "3d8+9"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 6,
            "CON": 16,
            "INT": 1,
            "WIS": 6,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Pseudopod. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage plus 7 (2d6) acid damage, and if the target is wearing nonmagical metal armor, its armor is partly corroded and takes a permanent and cumulative -1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10.Monster Manual (SRD)",
        "speedStr": "10 ft., climb 10 ft.",
        "skill": "Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gray-ooze",
        "imageUrl": "https://www.aidedd.org/dnd/images/gray-ooze.jpg",
        "resistances": [
            "acid",
            "cold",
            "fire"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "deafened",
            "exhaustion",
            "frightened",
            "prone"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "cult_fanatic": {
        "id": "cult_fanatic",
        "name": "Cult Fanatic",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 33,
            "dice": "6d8+6"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 14,
            "CON": 12,
            "INT": 10,
            "WIS": 13,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The fanatic makes two melee attacks.Dagger. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one creature. Hit: 4 (1d4 + 2) piercing damage.Fanatics are often part of a cult's leadership, using their charisma and dogma to influence and prey on those of weak will. Most are interested in personal power above all else.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Deception +4, Persuasion +4, Religion +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cult-fanatic",
        "imageUrl": "https://www.aidedd.org/dnd/images/cult-fanatic.jpg"
    },
    "lizardfolk": {
        "id": "lizardfolk",
        "name": "Lizardfolk",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "4d8+4"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 13,
            "INT": 7,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The lizardfolk makes two melee attacks, each one with a different weapon.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Heavy Club. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage.Javelin. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 5 (1d6 + 2)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +3, Stealth +4, Survival +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lizardfolk",
        "imageUrl": "https://www.aidedd.org/dnd/images/lizardfolk.jpg"
    },
    "cyclops": {
        "id": "cyclops",
        "name": "Cyclops",
        "type": "giant",
        "size": "huge",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 138,
            "dice": "12d12+60"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 11,
            "CON": 20,
            "INT": 8,
            "WIS": 6,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The cyclops makes two greatclub attacks.Greatclub. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 19 (3d8 + 6) bludgeoning damage.Rock. Ranged Weapon Attack: +9 to hit, range 30/120 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.Cyclopes are one-eyed giants that eke out a meager existence in wild lands. They are a terrifying threat in combat due to their size a",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cyclops",
        "imageUrl": "https://www.aidedd.org/dnd/images/cyclops.jpg"
    },
    "dao": {
        "id": "dao",
        "name": "Dao",
        "type": "elemental",
        "size": "large",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 187,
            "dice": "15d10+105"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 12,
            "CON": 24,
            "INT": 12,
            "WIS": 13,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dao makes two fist attacks or two maul attacks.Fist. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.Maul. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 20 (4d6 + 6) bludgeoning damage. If the target is a Huge or smaller creature, it must succeed on a DC 18 Strength check or be knocked prone.Monster Manual (BR+)",
        "speedStr": "30 ft., burrow 30 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dao",
        "imageUrl": "https://www.aidedd.org/dnd/images/dao.jpg"
    },
    "magma_mephit": {
        "id": "magma_mephit",
        "name": "Magma Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "5d6+5"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 12,
            "CON": 12,
            "INT": 7,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 3 (1d4 + 1) slashing damage plus 2 (1d4) fire damage.Fire Breath (Recharge 6). The mephit exhales a 15-foot cone of fire. Each creature in that area must make a DC 11 Dexterity saving throw, taking 7 (2d6) fire damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=magma-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/magma-mephit.jpg",
        "immunities": [
            "fire",
            "poison"
        ],
        "vulnerabilities": [
            "cold"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "death_dog": {
        "id": "death_dog",
        "name": "Death Dog",
        "type": "monstrosity",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 39,
            "dice": "6d8+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 14,
            "INT": 3,
            "WIS": 13,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dog makes two bite attacks.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage. If the target is a creature, it must succeed on a DC 12 Constitution saving throw against disease or become poisoned until the disease is cured. Every 24 hours that elapse, the creature must repeat the saving throw, reducing its hit point maximum by 5 (1d10)",
        "speedStr": "40 ft.",
        "skill": "Perception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=death-dog",
        "imageUrl": "https://www.aidedd.org/dnd/images/death-dog.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "piercer": {
        "id": "piercer",
        "name": "Piercer",
        "type": "monstrosity",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "3d8+9"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 13,
            "CON": 16,
            "INT": 1,
            "WIS": 7,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Drop. Melee Weapon Attack: +3 to hit, one creature directly underneath the piercer. Hit: 3 (1d6) piercing damage per 10 feet fallen, up to 21 (6d6). Miss: The piercer takes half the normal falling damage for the distance fallen.Monster Manual (BR+)",
        "speedStr": "5 ft., climb 5 ft.",
        "skill": "Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=piercer",
        "imageUrl": "https://www.aidedd.org/dnd/images/piercer.jpg"
    },
    "deer": {
        "id": "deer",
        "name": "Deer",
        "type": "beast",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 4,
            "dice": "1d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 16,
            "CON": 11,
            "INT": 2,
            "WIS": 14,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) piercing damage.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=deer",
        "imageUrl": "https://www.aidedd.org/dnd/images/deer.jpg"
    },
    "reef_shark": {
        "id": "reef_shark",
        "name": "Reef Shark",
        "type": "beast",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "4d8+4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 13,
            "CON": 13,
            "INT": 1,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.Reef sharks measure 6 to 10 feet long, and inhabit shallow waters and coral reefs.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=reef-shark",
        "imageUrl": "https://www.aidedd.org/dnd/images/reef-shark.jpg",
        "senses": [
            "blindsight 30 ft."
        ]
    },
    "deva": {
        "id": "deva",
        "name": "Deva",
        "type": "celestial",
        "size": "medium",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 136,
            "dice": "16d8+64"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 18,
            "CON": 18,
            "INT": 17,
            "WIS": 20,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The deva makes two melee attacks.Mace. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage plus 18 (4d8) radiant damage.Healing Touch (3/Day). The deva touches another creature. The target magically regains 20 (4d8 + 2) hit points and is freed from any curse, disease, poison, blindness, or deafness.Change Shape. The deva magically polymorphs in",
        "speedStr": "30 ft., fly 90 ft.",
        "skill": "Insight +9, Perception +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=deva",
        "imageUrl": "https://www.aidedd.org/dnd/images/deva.jpg",
        "saves": {
            "WIS": 9,
            "CHA": 9
        },
        "resistances": [
            "radiant",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "devilroot": {
        "id": "devilroot",
        "name": "Devilroot",
        "type": "plant",
        "size": "medium",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 105,
            "dice": "14d8+42"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 11,
            "CON": 17,
            "INT": 12,
            "WIS": 14,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devilroot makes two melee attacks.Fiendish Vine. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage. If the target is a creature, it must then succeed on a DC 16 Constitution saving throw or become poisoned and infected with a disease. Creatures immune to the poisoned condition are immune to this disease. While infected in this way, a ta",
        "speedStr": "30 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=devilroot",
        "imageUrl": "https://www.aidedd.org/dnd/images/devilroot.jpg"
    },
    "sahuagin": {
        "id": "sahuagin",
        "name": "Sahuagin",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "4d8+4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 11,
            "CON": 12,
            "INT": 12,
            "WIS": 13,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The sahuagin makes two melee attacks: one with its bite and one with its claws or spear.Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) slashing damage.Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 +",
        "speedStr": "30 ft., swim 40 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=sahuagin",
        "imageUrl": "https://www.aidedd.org/dnd/images/sahuagin.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "dire_wolf": {
        "id": "dire_wolf",
        "name": "Dire Wolf",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 37,
            "dice": "5d10+10"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 15,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dire-wolf",
        "imageUrl": "https://www.aidedd.org/dnd/images/dire-wolf.jpg"
    },
    "djinni": {
        "id": "djinni",
        "name": "Djinni",
        "type": "elemental",
        "size": "large",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 161,
            "dice": "14d10+84"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 15,
            "CON": 22,
            "INT": 15,
            "WIS": 16,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The djinni makes three scimitar attacks.Scimitar. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage plus 3 (1d6) lightning or thunder damage (djinni's choice).Create Whirlwind. A 5-foot-radius, 30-foot-tall cylinder of swirling air magically forms on a point the djinni can see within 120 feet of it. The whirlwind lasts as long as the djinni mai",
        "speedStr": "30 ft., fly 90 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=djinni",
        "imageUrl": "https://www.aidedd.org/dnd/images/djinni.jpg",
        "saves": {
            "DEX": 6,
            "WIS": 7,
            "CHA": 9
        },
        "immunities": [
            "lightning",
            "thunder"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "smoke_mephit": {
        "id": "smoke_mephit",
        "name": "Smoke Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 22,
            "dice": "5d6+5"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 14,
            "CON": 12,
            "INT": 10,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) slashing damage.Cinder Breath (Recharge 6). The mephit exhales a 15-foot cone of smoldering ash. Each creature in that area must succeed on a DC 10 Dexterity saving throw or be blinded until the end of the mephit's next turn.Monster Manual (BR+)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=smoke-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/smoke-mephit.jpg"
    },
    "doppelganger": {
        "id": "doppelganger",
        "name": "Doppelganger",
        "type": "monstrosity",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "8d8+16"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 18,
            "CON": 14,
            "INT": 11,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The doppelganger makes two melee attacks.Slam. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage.Read Thoughts. The doppelganger magically reads the surface thoughts of one creature within 60 feet of it. The effect can penetrate barriers, but 3 feet of wood or dirt, 2 feet of stone, 2 inches of metal, or a thin sheet of lead blocks it. While",
        "speedStr": "30 ft.",
        "skill": "Deception +6, Insight +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=doppelganger",
        "imageUrl": "https://www.aidedd.org/dnd/images/doppelganger.jpg",
        "conditionImmunities": [
            "charmed"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "swarm_of_bats": {
        "id": "swarm_of_bats",
        "name": "Swarm Of Bats",
        "type": "swarm",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 15,
            "CON": 10,
            "INT": 2,
            "WIS": 12,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites. Melee Weapon Attack: +4 to hit, reach 0 ft., one creature in the swarm's space. Hit: 5 (2d4) piercing damage, or 2 (1d4) piercing damage if the swarm has half of its hit points or fewer.Monster Manual (SRD)",
        "speedStr": "0 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-bats",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-bats.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ],
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "dragon_turtle": {
        "id": "dragon_turtle",
        "name": "Dragon Turtle",
        "type": "dragon",
        "size": "gargantuan",
        "cr": 17,
        "xp": 18000,
        "hp": {
            "base": 341,
            "dice": "22d20+110"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 25,
            "DEX": 10,
            "CON": 20,
            "INT": 10,
            "WIS": 12,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 11,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon turtle makes three attacks: one with its bite and two with its claws. It can make one tail attack in place of its two claw attacks.Bite. Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 26 (3d12 + 7) piercing damage.Claw. Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 16 (2d8 + 7) slashing damage.Tail. Melee Weapon Attack: +13 to hit, reach 1",
        "speedStr": "20 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dragon-turtle",
        "imageUrl": "https://www.aidedd.org/dnd/images/dragon-turtle.jpg",
        "saves": {
            "DEX": 6,
            "CON": 11,
            "WIS": 7
        },
        "resistances": [
            "fire"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "swarm_of_insects": {
        "id": "swarm_of_insects",
        "name": "Swarm Of Insects",
        "type": "swarm",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 13,
            "CON": 10,
            "INT": 1,
            "WIS": 7,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites. Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.Monster Manual (SRD)",
        "speedStr": "20 ft., climb 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-insects",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-insects.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ],
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "drider": {
        "id": "drider",
        "name": "Drider",
        "type": "monstrosity",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 123,
            "dice": "13d10+52"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 16,
            "CON": 18,
            "INT": 13,
            "WIS": 14,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The drider makes three attacks, either with its longsword or its longbow. It can replace one of those attacks with a bite attack.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 2 (1d4) piercing damage plus 9 (2d8) poison damage.Longsword. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Perception +5, Stealth +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=drider",
        "imageUrl": "https://www.aidedd.org/dnd/images/drider.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "swarm_of_rot_grubs": {
        "id": "swarm_of_rot_grubs",
        "name": "Swarm Of Rot Grubs",
        "type": "swarm",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 7,
            "CON": 10,
            "INT": 1,
            "WIS": 2,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites.Monsters of the Multiverse",
        "speedStr": "5 ft., climb 5 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-rot-grubs",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-rot-grubs.jpg"
    },
    "drow_house_captain": {
        "id": "drow_house_captain",
        "name": "Drow House Captain",
        "type": "humanoid",
        "size": "medium",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 162,
            "dice": "25d8+50"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 19,
            "CON": 15,
            "INT": 12,
            "WIS": 14,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The drow makes two Scimitar attacks and one Whip or Hand Crossbow attack.Scimitar. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) slashing damage plus 14 (4d6) poison damage.Whip. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 6 (1d4 + 4) slashing damage.Hand Crossbow. Ranged Weapon Attack: +8 to hit, range 30/120 ft., one target. Hit: 7 (1d6",
        "speedStr": "30 ft.",
        "skill": "Perception +6, Stealth +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=drow-house-captain",
        "imageUrl": "https://www.aidedd.org/dnd/images/drow-house-captain.jpg"
    },
    "drow_inquisitor": {
        "id": "drow_inquisitor",
        "name": "Drow Inquisitor",
        "type": "humanoid",
        "size": "medium",
        "cr": 14,
        "xp": 11500,
        "hp": {
            "base": 143,
            "dice": "22d8+44"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 15,
            "CON": 14,
            "INT": 16,
            "WIS": 21,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The drow makes three Death Lance attacks.Death Lance. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 8 (1d6 + 5) piercing damage plus 18 (4d8) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken. This reduction lasts until the target finishes a long rest. The target dies if its hit point maximum is reduced to 0.Spe",
        "speedStr": "30 ft.",
        "skill": "Insight +10, Perception +10, Religion +8, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=drow-inquisitor",
        "imageUrl": "https://www.aidedd.org/dnd/images/drow-inquisitor.jpg"
    },
    "drow_mage": {
        "id": "drow_mage",
        "name": "Drow Mage",
        "type": "humanoid",
        "size": "medium",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 45,
            "dice": "10d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 9,
            "DEX": 14,
            "CON": 10,
            "INT": 17,
            "WIS": 13,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Staff. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d6 - 1) bludgeoning damage, or 3 (1d8 - 1) bludgeoning damage if used with two hands, plus 3 (1d 6) poison damage.Summon Demon (1/Day). The drow magically summons a quasit, or attempts to summon a shadow demon with a 50 percent chance of success. The summoned demon appears in an unoccupied space within 60 feet of its summoner",
        "speedStr": "30 ft.",
        "skill": "Arcana +6, Deception +5, Perception +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=drow-mage",
        "imageUrl": "https://www.aidedd.org/dnd/images/drow-mage.jpg"
    },
    "druid": {
        "id": "druid",
        "name": "Druid",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 12,
            "CON": 13,
            "INT": 12,
            "WIS": 15,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Quarterstaff. Melee Weapon Attack: +2 to hit (+4 to hit with shillelagh), reach 5 ft., one target. Hit: 3 (1d6) bludgeoning damage, 4 (1d8) bludgeoning damage if wielded with two hands, or 6 (1d8 + 2) bludgeoning damage with shillelagh.Druids dwell in forests and other secluded wilderness locations, where they protect the natural world from monsters and the encroachment of civilization. Some are t",
        "speedStr": "30 ft.",
        "skill": "Medicine +4, Nature +3, Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=druid",
        "imageUrl": "https://www.aidedd.org/dnd/images/druid.jpg"
    },
    "dryad": {
        "id": "dryad",
        "name": "Dryad",
        "type": "fey",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 12,
            "CON": 11,
            "INT": 14,
            "WIS": 15,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Club. Melee Weapon Attack: +2 to hit (+6 to hit with shillelagh), reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage, or 8 (1d8 + 4) bludgeoning damage with shillelagh.Fey Charm. The dryad targets one humanoid or beast that she can see within 30 feet of her. If the target can see the dryad, it must succeed on a DC 14 Wisdom saving throw or be magically charmed. The charmed creature regards t",
        "speedStr": "30 ft.",
        "skill": "Perception +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dryad",
        "imageUrl": "https://www.aidedd.org/dnd/images/dryad.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "duergar": {
        "id": "duergar",
        "name": "Duergar",
        "type": "humanoid",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 26,
            "dice": "4d8+8"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 11,
            "CON": 14,
            "INT": 11,
            "WIS": 10,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "War Pick",
                "attackBonus": 4,
                "damage": "1d8+2",
                "damageType": "piercing",
                "reach": 5
            },
            {
                "name": "Javelin",
                "attackBonus": 4,
                "damage": "1d6+2",
                "damageType": "piercing",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Enlarge (Recharges after a Short or Long Rest). For 1 minute, the duergar magically increases in size, along with anything it is wearing or carrying. While enlarged, the duergar is Large, doubles its damage dice on Strength-based weapon attacks (included in the attacks), and makes Strength checks and Strength saving throws with advantage. If the duergar lacks the room to become Large, it attains t",
        "speedStr": "25 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=duergar",
        "imageUrl": "https://www.aidedd.org/dnd/images/duergar.jpg",
        "resistances": [
            "poison"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "eagle": {
        "id": "eagle",
        "name": "Eagle",
        "type": "beast",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 3,
            "dice": "1d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 15,
            "CON": 10,
            "INT": 2,
            "WIS": 14,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Talons",
                "attackBonus": 4,
                "damage": "1d4+2",
                "damageType": "slashing",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=eagle",
        "imageUrl": "https://www.aidedd.org/dnd/images/eagle.jpg"
    },
    "earth_elemental": {
        "id": "earth_elemental",
        "name": "Earth Elemental",
        "type": "elemental",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 126,
            "dice": "12d10+60"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 8,
            "CON": 20,
            "INT": 5,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The elemental makes two slam attacks.Slam. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.An earth elemental plods forward like a walking hill, club-like arms of jagged stone swinging at its sides. Its head and body consist of dirt and stone, occasionally set with chunks of metal, gems, and bright minerals.Monster Manual (SRD)",
        "speedStr": "30 ft., burrow 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=earth-elemental",
        "imageUrl": "https://www.aidedd.org/dnd/images/earth-elemental.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "vulnerabilities": [
            "thunder"
        ],
        "conditionImmunities": [
            "exhaustion",
            "paralyzed",
            "petrified",
            "poisoned",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft.",
            "tremorsense 60 ft."
        ]
    },
    "efreeti": {
        "id": "efreeti",
        "name": "Efreeti",
        "type": "elemental",
        "size": "large",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 200,
            "dice": "16d10+112"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 12,
            "CON": 24,
            "INT": 16,
            "WIS": 15,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The efreeti makes two scimitar attacks or uses its Hurl Flame twice.Scimitar. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage plus 7 (2d6) fire damage.Hurl Flame. Ranged Spell Attack: +7 to hit, range 120 ft., one target. Hit: 17 (5d6) fire damage.Monster Manual (SRD)",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=efreeti",
        "imageUrl": "https://www.aidedd.org/dnd/images/efreeti.jpg",
        "saves": {
            "INT": 7,
            "WIS": 6,
            "CHA": 7
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "elephant": {
        "id": "elephant",
        "name": "Elephant",
        "type": "beast",
        "size": "huge",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 76,
            "dice": "8d12+24"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 9,
            "CON": 17,
            "INT": 3,
            "WIS": 11,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 19 (3d8 + 6) piercing damage.Stomp. Melee Weapon Attack: +8 to hit, reach 5 ft., one prone creature. Hit: 22 (3d10 + 6) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=elephant",
        "imageUrl": "https://www.aidedd.org/dnd/images/elephant.jpg"
    },
    "warhorse_skeleton": {
        "id": "warhorse_skeleton",
        "name": "Warhorse Skeleton",
        "type": "undead",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 22,
            "dice": "3d10+6"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 12,
            "CON": 15,
            "INT": 2,
            "WIS": 8,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=warhorse-skeleton",
        "imageUrl": "https://www.aidedd.org/dnd/images/warhorse-skeleton.jpg",
        "immunities": [
            "poison"
        ],
        "vulnerabilities": [
            "bludgeoning"
        ],
        "conditionImmunities": [
            "exhaustion",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "erinyes": {
        "id": "erinyes",
        "name": "Erinyes",
        "type": "fiend",
        "size": "medium",
        "cr": 12,
        "xp": 8400,
        "hp": {
            "base": 153,
            "dice": "18d8+72"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 16,
            "CON": 18,
            "INT": 14,
            "WIS": 14,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The erinyes makes three attacks.Longsword. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage, or 9 (1d10 + 4) slashing damage if used with two hands, plus 13 (3d8) poison damage.Longbow. Ranged Weapon Attack: +7 to hit, range 150/600 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 13 (3d8) poison damage, and the target must succeed on a D",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=erinyes",
        "imageUrl": "https://www.aidedd.org/dnd/images/erinyes.jpg",
        "saves": {
            "DEX": 7,
            "CON": 8,
            "WIS": 6,
            "CHA": 8
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "ettercap": {
        "id": "ettercap",
        "name": "Ettercap",
        "type": "monstrosity",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 44,
            "dice": "8d8+8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 15,
            "CON": 13,
            "INT": 7,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The ettercap makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) piercing damage plus 4 (1d8) poison damage. The target must succeed on a DC 11 Constitution saving throw or be poisoned for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on its",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Perception +3, Stealth +4, Survival +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ettercap",
        "imageUrl": "https://www.aidedd.org/dnd/images/ettercap.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ettin": {
        "id": "ettin",
        "name": "Ettin",
        "type": "giant",
        "size": "large",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 85,
            "dice": "10d10+30"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 8,
            "CON": 17,
            "INT": 6,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The ettin makes two attacks: one with its battleaxe and one with its morningstar.Battleaxe. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.Morningstar. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) piercing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ettin",
        "imageUrl": "https://www.aidedd.org/dnd/images/ettin.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "fire_elemental": {
        "id": "fire_elemental",
        "name": "Fire Elemental",
        "type": "elemental",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 102,
            "dice": "12d10+36"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 17,
            "CON": 16,
            "INT": 6,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The elemental makes two touch attacks.Touch. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) fire damage. If the target is a creature or a flammable object, it ignites. Until a creature takes an action to douse the fire, the target takes 5 (1d10) fire damage at the start of each of its turns.A faint humanoid shape shows in a fire elemental's capricious devas",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=fire-elemental",
        "imageUrl": "https://www.aidedd.org/dnd/images/fire-elemental.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "fire_giant": {
        "id": "fire_giant",
        "name": "Fire Giant",
        "type": "giant",
        "size": "huge",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 162,
            "dice": "13d12+78"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 25,
            "DEX": 9,
            "CON": 23,
            "INT": 10,
            "WIS": 14,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two greatsword attacks.Greatsword. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 28 (6d6 + 7) slashing damage.Rock. Ranged Weapon Attack: +11 to hit, range 60/240 ft., one target. Hit: 29 (4d10 + 7) bludgeoning damage.With dark skin and flaming red hair, fire giants have a fearsome reputation as soldiers and conquerors. They dwell among volcanoes, lav",
        "speedStr": "30 ft.",
        "skill": "Athletics +11, Perception +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=fire-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/fire-giant.jpg",
        "saves": {
            "DEX": 3,
            "CON": 10,
            "CHA": 5
        },
        "immunities": [
            "fire"
        ]
    },
    "fire_snake": {
        "id": "fire_snake",
        "name": "Fire Snake",
        "type": "elemental",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 14,
            "CON": 11,
            "INT": 7,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The snake makes two attacks: one with its bite and one with its tail.Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage plus 3 (1d6) fire damage.Tail. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning damage plus 3 (1d6) fire damage.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=fire-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/fire-snake.jpg"
    },
    "zombie": {
        "id": "zombie",
        "name": "Zombie",
        "type": "undead",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 22,
            "dice": "3d8+9"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 6,
            "CON": 16,
            "INT": 3,
            "WIS": 6,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Slam. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.Undead zombies move with a jerky, uneven gait. They are clad in the moldering apparel they wore when put to rest, and carry the stench of decay.Monster Manual (SRD)",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=zombie",
        "imageUrl": "https://www.aidedd.org/dnd/images/zombie.jpg",
        "saves": {
            "WIS": 0
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ice_mephit": {
        "id": "ice_mephit",
        "name": "Ice Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 21,
            "dice": "6d6"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 13,
            "CON": 10,
            "INT": 9,
            "WIS": 11,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 3 (1d4 + 1) slashing damage plus 2 (1d4) cold damage.Frost Breath (Recharge 6). The mephit exhales a 15-foot cone of cold air. Each creature in that area must succeed on a DC 10 Dexterity saving throw, taking 5 (2d4) cold damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Perception +2, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ice-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/ice-mephit.jpg",
        "immunities": [
            "cold",
            "poison"
        ],
        "vulnerabilities": [
            "bludgeoning",
            "fire"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "flameskull": {
        "id": "flameskull",
        "name": "Flameskull",
        "type": "undead",
        "size": "tiny",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 40,
            "dice": "9d4+18"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 17,
            "CON": 14,
            "INT": 16,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The flameskull uses Fire Ray twice.Fire Ray. Ranged Spell Attack: +5 to hit, range 30 ft., one target. Hit: 10 (3d6) fire damage.Blazing green flames and mad, echoing laughter surround an undead flameskull. This disembodied skull blasts foes with fiery rays from its eyes and dreadful spells called up from the dark recesses of its memory.Monster Manual (BR)",
        "speedStr": "0 ft., fly 40 ft. (hover)",
        "skill": "Arcana +5, Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=flameskull",
        "imageUrl": "https://www.aidedd.org/dnd/images/flameskull.jpg"
    },
    "flesh_golem": {
        "id": "flesh_golem",
        "name": "Flesh Golem",
        "type": "construct",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 93,
            "dice": "11d8+44"
        },
        "ac": 9,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 9,
            "CON": 18,
            "INT": 6,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The golem makes two slam attacks.Slam. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.A flesh golem is a grisly assortment of humanoid body parts stitched and bolted together into a muscled brute imbued with formidable strength. Powerful enchantments protect it, deflecting spells and all but the most potent weapons.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=flesh-golem",
        "imageUrl": "https://www.aidedd.org/dnd/images/flesh-golem.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "lightning",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "flind": {
        "id": "flind",
        "name": "Flind",
        "type": "humanoid",
        "size": "medium",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 127,
            "dice": "15d8+60"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 10,
            "CON": 19,
            "INT": 11,
            "WIS": 13,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The flind makes one Flail of Chaos attack, one Flail of Pain attack, and one Flail of Paralysis attack, or it makes three Longbow attacks.Flail of Chaos. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 10 (1d10 + 5) bludgeoning damage, and the target must make a DC 16 Wisdom saving throw. On a failed save, the target must use its reaction, if available, to make one mele",
        "speedStr": "30 ft.",
        "skill": "Intimidation +5, Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=flind",
        "imageUrl": "https://www.aidedd.org/dnd/images/flind.jpg"
    },
    "steam_mephit": {
        "id": "steam_mephit",
        "name": "Steam Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 21,
            "dice": "6d6"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 11,
            "CON": 10,
            "INT": 11,
            "WIS": 10,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 2 (1d4) slashing damage plus 2 (1d4) fire damage.Steam Breath (Recharge 6). The mephit exhales a 15-foot cone of scalding steam. Each creature in that area must succeed on a DC 10 Dexterity saving throw, taking 4 (1d8) fire damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=steam-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/steam-mephit.jpg",
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ape": {
        "id": "ape",
        "name": "Ape",
        "type": "beast",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d8+6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 14,
            "INT": 6,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The ape makes two fist attacks.Fist. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage.Rock. Ranged Weapon Attack: +5 to hit, range 25/50 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Athletics +5, Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ape",
        "imageUrl": "https://www.aidedd.org/dnd/images/ape.jpg"
    },
    "axe_beak": {
        "id": "axe_beak",
        "name": "Axe Beak",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 12,
            "CON": 12,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) slashing damage.An axe beak is a tall flightless bird with strong legs, a wedge-shaped beak, and a nasty disposition.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=axe-beak",
        "imageUrl": "https://www.aidedd.org/dnd/images/axe-beak.jpg"
    },
    "frog": {
        "id": "frog",
        "name": "Frog",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 0,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 13,
            "CON": 8,
            "INT": 1,
            "WIS": 8,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "20 ft., swim 20 ft.",
        "skill": "Perception +1, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=frog",
        "imageUrl": "https://www.aidedd.org/dnd/images/frog.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "froghemoth": {
        "id": "froghemoth",
        "name": "Froghemoth",
        "type": "monstrosity",
        "size": "huge",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 184,
            "dice": "16d12+80"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 13,
            "CON": 20,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The froghemoth makes one Bite attack and two Tentacle attacks, and it can use Tongue.Bite. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 22 (3d10 + 6) piercing damage, and the target is swallowed if it is a Medium or smaller creature. A swallowed creature is blinded and restrained, has total cover against attacks and other effects outside the froghemoth, and takes 10",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +9, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=froghemoth",
        "imageUrl": "https://www.aidedd.org/dnd/images/froghemoth.jpg"
    },
    "frost_giant": {
        "id": "frost_giant",
        "name": "Frost Giant",
        "type": "giant",
        "size": "huge",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 138,
            "dice": "12d12+60"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 9,
            "CON": 21,
            "INT": 9,
            "WIS": 10,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two greataxe attacks.Greataxe. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 25 (3d12 + 6) slashing damage.Rock. Ranged Weapon Attack: +9 to hit, range 60/240 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.Frost giants are creatures of ice and snow, with hair and beards of pale white or light blue, and flesh as blue as glacial ice. They respect",
        "speedStr": "40 ft.",
        "skill": "Athletics +9, Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=frost-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/frost-giant.jpg",
        "saves": {
            "CON": 8,
            "WIS": 3,
            "CHA": 4
        },
        "immunities": [
            "cold"
        ]
    },
    "galeb_duhr": {
        "id": "galeb_duhr",
        "name": "Galeb Duhr",
        "type": "elemental",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 85,
            "dice": "9d8+45"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 14,
            "CON": 20,
            "INT": 11,
            "WIS": 12,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Slam. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) bludgeoning damage.Animate Boulders (1/Day). The galeb duhr magically animates up to two boulders it can see within 60 feet of it. A boulder has statistics like those of a galeb duhr, except it has Intelligence 1 and Charisma 1, it can't be charmed or frightened, and it lacks this action option. A boulder remains anim",
        "speedStr": "15 ft. (30 ft. when rolling, 60 ft. rolling downhill)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=galeb-duhr",
        "imageUrl": "https://www.aidedd.org/dnd/images/galeb-duhr.jpg"
    },
    "gargoyle": {
        "id": "gargoyle",
        "name": "Gargoyle",
        "type": "elemental",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 52,
            "dice": "7d8+21"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 11,
            "CON": 16,
            "INT": 6,
            "WIS": 11,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The gargoyle makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.These malevolent creatures of elemental earth resemble grotesque, fiendish statues. A gargoyle lurks among masonry and ru",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gargoyle",
        "imageUrl": "https://www.aidedd.org/dnd/images/gargoyle.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "black_bear": {
        "id": "black_bear",
        "name": "Black Bear",
        "type": "beast",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d8+6"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 14,
            "INT": 2,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The bear makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft., climb 30 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=black-bear",
        "imageUrl": "https://www.aidedd.org/dnd/images/black-bear.jpg"
    },
    "gauth": {
        "id": "gauth",
        "name": "Gauth",
        "type": "aberration",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 67,
            "dice": "9d8+27"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 16,
            "INT": 15,
            "WIS": 15,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 9 (2d8) piercing damage.Eye Rays. The gauth shoots three of the following magical eye rays at random (roll three d6s, and reroll duplicates), targeting one to three creatures it can see within 120 feet of it: 1- Devour Magic Ray. The target must succeed on a DC 14 Dexterity saving throw or have one of its magic items lose all magi",
        "speedStr": "0 ft., fly 20 ft. (hover)",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gauth",
        "imageUrl": "https://www.aidedd.org/dnd/images/gauth.jpg"
    },
    "crocodile": {
        "id": "crocodile",
        "name": "Crocodile",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target is grappled (escape DC 12). Until this grapple ends, the target is restrained, and the crocodile can't bite another target.Monster Manual (SRD)",
        "speedStr": "20 ft., swim 30 ft.",
        "skill": "Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=crocodile",
        "imageUrl": "https://www.aidedd.org/dnd/images/crocodile.jpg"
    },
    "gelatinous_cube": {
        "id": "gelatinous_cube",
        "name": "Gelatinous Cube",
        "type": "ooze",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 84,
            "dice": "8d10+40"
        },
        "ac": 6,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 3,
            "CON": 20,
            "INT": 1,
            "WIS": 6,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Pseudopod. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 10 (3d6) acid damage.Engulf. The cube moves up to its speed. While doing so, it can enter Large or smaller creatures' spaces. Whenever the cube enters a creature's space, the creature must make a DC 12 Dexterity saving throw. On a successful save, the creature can choose to be pushed 5 feet back or to the side of the cube.",
        "speedStr": "15 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gelatinous-cube",
        "imageUrl": "https://www.aidedd.org/dnd/images/gelatinous-cube.jpg",
        "conditionImmunities": [
            "blinded",
            "charmed",
            "deafened",
            "exhaustion",
            "frightened",
            "prone"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "ghast": {
        "id": "ghast",
        "name": "Ghast",
        "type": "undead",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 36,
            "dice": "8d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 17,
            "CON": 10,
            "INT": 11,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 12 (2d8 + 3) piercing damage.Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. If the target is a creature other than an undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turn",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ghast",
        "imageUrl": "https://www.aidedd.org/dnd/images/ghast.jpg",
        "resistances": [
            "necrotic"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned",
            "charmed",
            "exhaustion"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ghost": {
        "id": "ghost",
        "name": "Ghost",
        "type": "undead",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 45,
            "dice": "10d8"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 13,
            "CON": 10,
            "INT": 10,
            "WIS": 12,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Withering Touch. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 17 (4d6 + 3) necrotic damage.Etherealness. The ghost enters the Ethereal Plane from the Material Plane, or vice versa. It is visible on the Material Plane while it is in the Border Ethereal, and vice versa, yet it can't affect or be affected by anything on the other plane.Horrifying Visage. Each non-undead creature with",
        "speedStr": "0 ft., fly 40 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ghost",
        "imageUrl": "https://www.aidedd.org/dnd/images/ghost.jpg",
        "resistances": [
            "acid",
            "fire",
            "lightning",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "cold",
            "necrotic",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ghoul": {
        "id": "ghoul",
        "name": "Ghoul",
        "type": "undead",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 15,
            "CON": 10,
            "INT": 7,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) piercing damage.Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage. If the target is a creature other than an elf or undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ghoul",
        "imageUrl": "https://www.aidedd.org/dnd/images/ghoul.jpg",
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned",
            "charmed",
            "exhaustion"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "giant_ape": {
        "id": "giant_ape",
        "name": "Giant Ape",
        "type": "beast",
        "size": "huge",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 157,
            "dice": "15d12+60"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 14,
            "CON": 18,
            "INT": 7,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The ape makes two fist attacks.Fist. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 22 (3d10 + 6) bludgeoning damage.Rock. Ranged Weapon Attack: +9 to hit, range 50/100 ft., one target. Hit: 30 (7d6 + 6) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft., climb 40 ft.",
        "skill": "Athletics +9, Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-ape",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-ape.jpg"
    },
    "draft_horse": {
        "id": "draft_horse",
        "name": "Draft Horse",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 12,
            "INT": 2,
            "WIS": 11,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (2d4 + 4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=draft-horse",
        "imageUrl": "https://www.aidedd.org/dnd/images/draft-horse.jpg"
    },
    "giant_boar": {
        "id": "giant_boar",
        "name": "Giant Boar",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 42,
            "dice": "5d10+15"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 16,
            "INT": 2,
            "WIS": 7,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Tusk",
                "attackBonus": 5,
                "damage": "2d6+3",
                "damageType": "slashing",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-boar",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-boar.jpg"
    },
    "giant_goat": {
        "id": "giant_goat",
        "name": "Giant Goat",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 11,
            "CON": 12,
            "INT": 3,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-goat",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-goat.jpg"
    },
    "giant_constrictor_snake": {
        "id": "giant_constrictor_snake",
        "name": "Giant Constrictor Snake",
        "type": "beast",
        "size": "huge",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 60,
            "dice": "8d12+8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 14,
            "CON": 12,
            "INT": 1,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage.Constrict. Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 13 (2d8 + 4) bludgeoning damage, and the target is grappled (escape DC 16). Until this grapple ends, the creature is restrained, and the snake can't constrict another target.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-constrictor-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-constrictor-snake.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "giant_lizard": {
        "id": "giant_lizard",
        "name": "Giant Lizard",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 12,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.Giant lizards are fearsome predators often used as mounts or draft animals by reptilian humanoids and residents of the Underdark.Monster Manual (SRD)",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-lizard",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-lizard.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "giant_crocodile": {
        "id": "giant_crocodile",
        "name": "Giant Crocodile",
        "type": "beast",
        "size": "huge",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 85,
            "dice": "9d12+27"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 9,
            "CON": 17,
            "INT": 2,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The crocodile makes two attacks: one with its bite and one with its tail.Bite. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 21 (3d10 + 5) piercing damage, and the target is grappled (escape DC 16). Until this grapple ends, the target is restrained, and the crocodile can't bite another target.Tail. Melee Weapon Attack: +8 to hit, reach 10 ft., one target not grappled b",
        "speedStr": "30 ft., swim 50 ft.",
        "skill": "Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-crocodile",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-crocodile.jpg"
    },
    "giant_eagle": {
        "id": "giant_eagle",
        "name": "Giant Eagle",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 26,
            "dice": "4d10+4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 17,
            "CON": 13,
            "INT": 8,
            "WIS": 14,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The eagle makes two attacks: one with its beak and one with its talons.Beak. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Talons. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.A giant eagle is a noble creature that speaks its own language and understands some speech.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 80 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-eagle",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-eagle.jpg"
    },
    "giant_elk": {
        "id": "giant_elk",
        "name": "Giant Elk",
        "type": "beast",
        "size": "huge",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 42,
            "dice": "5d12+10"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 16,
            "CON": 14,
            "INT": 7,
            "WIS": 14,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "60 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-elk",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-elk.jpg"
    },
    "giant_fire_beetle": {
        "id": "giant_fire_beetle",
        "name": "Giant Fire Beetle",
        "type": "beast",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 4,
            "dice": "1d6+1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 10,
            "CON": 12,
            "INT": 1,
            "WIS": 7,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 2 (1d6 - 1) slashing damage.A giant fire beetle is a nocturnal creature that features a pair of glowing glands that give off light for 1d6 days after the beetle dies.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-fire-beetle",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-fire-beetle.jpg",
        "senses": [
            "blindsight 30 ft."
        ]
    },
    "giant_owl": {
        "id": "giant_owl",
        "name": "Giant Owl",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 15,
            "CON": 12,
            "INT": 8,
            "WIS": 13,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "5 ft., fly 60 ft.",
        "skill": "Perception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-owl",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-owl.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "giant_two_headed_goat": {
        "id": "giant_two_headed_goat",
        "name": "Giant Two Headed Goat",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 11,
            "CON": 12,
            "INT": 3,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The two-headed goat makes two ram attacks. These attacks must be against different targets.Ram. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) bludgeoning damage.Extra (Adventurers League)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-two-headed-goat",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-two-headed-goat.jpg"
    },
    "giant_hyena": {
        "id": "giant_hyena",
        "name": "Giant Hyena",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 14,
            "INT": 2,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-hyena",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-hyena.jpg"
    },
    "mummified_warrior": {
        "id": "mummified_warrior",
        "name": "Mummified Warrior",
        "type": "undead",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 19,
            "dice": "3d8+6"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 6,
            "CON": 14,
            "INT": 8,
            "WIS": 6,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.The mummified warriors are the result of an experiment carried out by the necromancer Arach.Extra (AideDD)",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mummified-warrior",
        "imageUrl": "https://www.aidedd.org/dnd/images/mummified-warrior.jpg"
    },
    "giant_octopus": {
        "id": "giant_octopus",
        "name": "Giant Octopus",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 52,
            "dice": "8d10+8"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 13,
            "CON": 13,
            "INT": 4,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "10 ft., swim 60 ft.",
        "skill": "Perception +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-octopus",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-octopus.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "warhorse": {
        "id": "warhorse",
        "name": "Warhorse",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 12,
            "CON": 13,
            "INT": 2,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=warhorse",
        "imageUrl": "https://www.aidedd.org/dnd/images/warhorse.jpg"
    },
    "giant_scorpion": {
        "id": "giant_scorpion",
        "name": "Giant Scorpion",
        "type": "beast",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "7d10+14"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 13,
            "CON": 15,
            "INT": 1,
            "WIS": 9,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The scorpion makes three attacks: two with its claws and one with its sting.Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) bludgeoning damage, and the target is grappled (escape DC 12). The scorpion has two claws, each of which can grapple only one target.Sting. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damag",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-scorpion",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-scorpion.jpg",
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "dretch": {
        "id": "dretch",
        "name": "Dretch",
        "type": "fiend",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 18,
            "dice": "4d6+4"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 11,
            "CON": 12,
            "INT": 5,
            "WIS": 8,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dretch makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) piercing damage.Claws. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 5 (2d4) slashing damage.Fetid Cloud (1/Day). A 10-foot radius of disgusting green gas extends out from the dretch. The gas spreads around corners, and its",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dretch",
        "imageUrl": "https://www.aidedd.org/dnd/images/dretch.jpg",
        "resistances": [
            "cold",
            "fire",
            "lightning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "giant_shark": {
        "id": "giant_shark",
        "name": "Giant Shark",
        "type": "beast",
        "size": "huge",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 126,
            "dice": "11d12+55"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 11,
            "CON": 21,
            "INT": 1,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 22 (3d10 + 6) piercing damage.A giant shark is 30 feet long and normally found in deep oceans.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-shark",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-shark.jpg",
        "senses": [
            "blindsight 60 ft."
        ]
    },
    "giant_spider": {
        "id": "giant_spider",
        "name": "Giant Spider",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 26,
            "dice": "4d10+4"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 16,
            "CON": 12,
            "INT": 2,
            "WIS": 11,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyz",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-spider",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-spider.jpg",
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "giant_toad": {
        "id": "giant_toad",
        "name": "Giant Toad",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 39,
            "dice": "6d10+6"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 13,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 5 (1d10) poison damage, and the target is grappled (escape DC 13). Until this grapple ends, the target is restrained, and the toad can't bite another target.Swallow. The toad makes one bite attack against a Medium or smaller target it is grappling. If the attack hits, the target is swallowed, and",
        "speedStr": "20 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-toad",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-toad.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "giant_frog": {
        "id": "giant_frog",
        "name": "Giant Frog",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 18,
            "dice": "4d8"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 13,
            "CON": 11,
            "INT": 2,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage, and the target is grappled (escape DC 11). Until this grapple ends, the target is restrained, and the frog can't bite another target.Swallow. The frog makes one bite attack against a Small or smaller target it is grappling. If the attack hits, the target is swallowed, and the grapple ends. The swallowe",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +2, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-frog",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-frog.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "giant_vulture": {
        "id": "giant_vulture",
        "name": "Giant Vulture",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "3d10+6"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 15,
            "INT": 6,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The vulture makes two attacks: one with its beak and one with its talons.Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage.Talons. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage.A giant vulture has advanced intelligence and a malevolent bent.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-vulture",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-vulture.jpg"
    },
    "jackalwere": {
        "id": "jackalwere",
        "name": "Jackalwere",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 18,
            "dice": "4d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 15,
            "CON": 11,
            "INT": 13,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite (Jackal or Hybrid Form Only). Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Scimitar (Human or Hybrid Form Only). Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.Sleep Gaze. The jackalwere gazes at one creature it can see within 30 feet of it. The target must make a DC 10 Wisdom saving throw. On a failed sav",
        "speedStr": "40 ft.",
        "skill": "Deception +4, Perception +2, Stealth +4Immunities bludgeoning, piercing, and slashing",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=jackalwere",
        "imageUrl": "https://www.aidedd.org/dnd/images/jackalwere.jpg"
    },
    "kuo_toa": {
        "id": "kuo_toa",
        "name": "Kuo Toa",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 18,
            "dice": "4d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 10,
            "CON": 11,
            "INT": 11,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.Net. Ranged Weapon Attack: +3 to hit, range 5/15 ft., one Large or smaller creature. Hit: The target",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kuo-toa",
        "imageUrl": "https://www.aidedd.org/dnd/images/kuo-toa.jpg"
    },
    "gibbering_mouther": {
        "id": "gibbering_mouther",
        "name": "Gibbering Mouther",
        "type": "aberration",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 67,
            "dice": "9d8+27"
        },
        "ac": 9,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 8,
            "CON": 16,
            "INT": 3,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Bites",
                "attackBonus": 2,
                "damage": "5d6",
                "damageType": "piercing",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "until the start of its next turn and rolls a d8 to determine what it does during its turn. On a 1 to 4, the creature does nothing. On a 5 or 6, the creature takes no action or bonus action and uses all its movement to move in a randomly determined direction. On a 7 or 8, the creature makes a melee attack against a randomly determined creature within its reach or does nothing if it can't make such",
        "speedStr": "10 ft., swim 10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gibbering-mouther",
        "imageUrl": "https://www.aidedd.org/dnd/images/gibbering-mouther.jpg",
        "conditionImmunities": [
            "prone"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "glabrezu": {
        "id": "glabrezu",
        "name": "Glabrezu",
        "type": "fiend",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 157,
            "dice": "15d10+75"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 15,
            "CON": 21,
            "INT": 19,
            "WIS": 17,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The glabrezu makes four attacks: two with its pincers and two with its fists. Alternatively, it makes two attacks with its pincers and casts one spell.Pincer. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage. If the target is a Medium or smaller creature, it is grappled (escape DC 15). The glabrezu has two pincers, each of which can grapp",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=glabrezu",
        "imageUrl": "https://www.aidedd.org/dnd/images/glabrezu.jpg",
        "saves": {
            "STR": 9,
            "CON": 9,
            "WIS": 7,
            "CHA": 7
        },
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "gladiator": {
        "id": "gladiator",
        "name": "Gladiator",
        "type": "humanoid",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 112,
            "dice": "15d8+45"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 10,
            "WIS": 12,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The gladiator makes three melee attacks or two ranged attacks.Spear. Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. and range 20/60 ft., one target. Hit: 11 (2d6 + 4) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack.Shield Bash. Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 9 (2d4 + 4) bludgeoning damage. If the ta",
        "speedStr": "30 ft.",
        "skill": "Athletics +10, Intimidation +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gladiator",
        "imageUrl": "https://www.aidedd.org/dnd/images/gladiator.jpg",
        "saves": {
            "STR": 7,
            "DEX": 5,
            "CON": 6
        }
    },
    "violet_fungus": {
        "id": "violet_fungus",
        "name": "Violet Fungus",
        "type": "plant",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 18,
            "dice": "4d8"
        },
        "ac": 5,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 1,
            "CON": 10,
            "INT": 1,
            "WIS": 3,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The fungus makes 1d4 Rotting Touch attacks.Rotting Touch. Melee Weapon Attack: +2 to hit, reach 10 ft., one creature. Hit: 4 (1d8) necrotic damage.Monster Manual (SRD)",
        "speedStr": "5 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=violet-fungus",
        "imageUrl": "https://www.aidedd.org/dnd/images/violet-fungus.jpg",
        "conditionImmunities": [
            "blinded",
            "blinded",
            "frightened"
        ],
        "senses": [
            "blindsight 30 ft. (blind beyond this radius)"
        ]
    },
    "gnoll_pack_lord": {
        "id": "gnoll_pack_lord",
        "name": "Gnoll Pack Lord",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 49,
            "dice": "9d8+9"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 13,
            "INT": 8,
            "WIS": 11,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The gnoll makes two attacks, either with its glaive or its longbow, and uses its Incite Rampage if it can.Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 5 (1d4 + 3) piercing damage.Glaive. Melee Weapon Attack: +5 to hit, reach 10 ft., one target. Hit: 8 (1d10 + 3) slashing damage.Longbow. Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gnoll-pack-lord",
        "imageUrl": "https://www.aidedd.org/dnd/images/gnoll-pack-lord.jpg"
    },
    "dust_mephit": {
        "id": "dust_mephit",
        "name": "Dust Mephit",
        "type": "elemental",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 17,
            "dice": "5d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 14,
            "CON": 10,
            "INT": 9,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) slashing damage.Blinding Breath (Recharge 6). The mephit exhales a 15-foot cone of blinding dust. Each creature in that area must succeed on a DC 10 Dexterity saving throw or be blinded for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.Mons",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dust-mephit",
        "imageUrl": "https://www.aidedd.org/dnd/images/dust-mephit.jpg",
        "immunities": [
            "poison"
        ],
        "vulnerabilities": [
            "fire"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "goat": {
        "id": "goat",
        "name": "Goat",
        "type": "beast",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 4,
            "dice": "1d8"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 10,
            "CON": 11,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=goat",
        "imageUrl": "https://www.aidedd.org/dnd/images/goat.jpg"
    },
    "flying_sword": {
        "id": "flying_sword",
        "name": "Flying Sword",
        "type": "construct",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 17,
            "dice": "5d6"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 15,
            "CON": 11,
            "INT": 1,
            "WIS": 5,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., fly 50 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=flying-sword",
        "imageUrl": "https://www.aidedd.org/dnd/images/flying-sword.jpg",
        "saves": {
            "DEX": 4
        },
        "immunities": [
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "blinded",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "gold_dragon_wyrmling": {
        "id": "gold_dragon_wyrmling",
        "name": "Gold Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 60,
            "dice": "8d8+24"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 14,
            "CON": 17,
            "INT": 14,
            "WIS": 11,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Fire Breath. The dragon exhales fire in a 15-foot cone. Each creature in that area must make a DC 13 Dexterity saving throw, taking 22 (4d10) fire damage on a failed save, or half as much damage on a successful one.Weake",
        "speedStr": "30 ft., fly 60 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gold-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/gold-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 4,
            "CON": 5,
            "WIS": 2,
            "CHA": 5
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "gorgon": {
        "id": "gorgon",
        "name": "Gorgon",
        "type": "monstrosity",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 114,
            "dice": "12d10+48"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 11,
            "CON": 18,
            "INT": 2,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 18 (2d12 + 5) piercing damage.Hooves. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage.Petrifying Breath (Recharge 5-6). The gorgon exhales petrifying gas in a 30-foot cone. Each creature in that area must succeed on a DC 13 Constitution saving throw. On a failed save, a target begins",
        "speedStr": "40 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gorgon",
        "imageUrl": "https://www.aidedd.org/dnd/images/gorgon.jpg",
        "conditionImmunities": [
            "petrified"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "green_dragon_wyrmling": {
        "id": "green_dragon_wyrmling",
        "name": "Green Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 38,
            "dice": "7d8+7"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 12,
            "CON": 13,
            "INT": 14,
            "WIS": 11,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 3 (1d6) poison damage.Poison Breath (Recharge 5-6). The dragon exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 11 Constitution saving throw, taking 21 (6d6) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 60 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=green-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/green-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 3,
            "CON": 3,
            "WIS": 2,
            "CHA": 3
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "green_hag": {
        "id": "green_hag",
        "name": "Green Hag",
        "type": "fey",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 82,
            "dice": "11d8+33"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 12,
            "CON": 16,
            "INT": 13,
            "WIS": 14,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.Illusory Appearance. The hag covers herself and anything she is wearing or carrying with a magical illusion that makes her look like another creature of her general size and humanoid shape. The illusion ends if the hag takes a bonus action to end it or if she dies. The changes wrought by this effect f",
        "speedStr": "30 ft.",
        "skill": "Arcana +3, Deception +4, Perception +4, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=green-hag",
        "imageUrl": "https://www.aidedd.org/dnd/images/green-hag.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "grell": {
        "id": "grell",
        "name": "Grell",
        "type": "aberration",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 55,
            "dice": "10d8+10"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 13,
            "INT": 12,
            "WIS": 11,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The grell makes two attacks: one with its tentacles and one with its beak.Tentacles. Melee Weapon Attack: +4 to hit, reach 10 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or be poisoned for 1 minute. The poisoned target is paralyzed, and it can repeat the saving throw at the end of each of its turns, ending the",
        "speedStr": "10 ft., fly 30 ft. (hover)",
        "skill": "Perception +4, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=grell",
        "imageUrl": "https://www.aidedd.org/dnd/images/grell.jpg"
    },
    "grick": {
        "id": "grick",
        "name": "Grick",
        "type": "monstrosity",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 27,
            "dice": "6d8"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 14,
            "CON": 11,
            "INT": 3,
            "WIS": 14,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The grick makes one attack with its tentacles. If that attack hits, the grick can make one beak attack against the same target.Tentacles. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage.Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.This wormlike monstrosity blends in with the rock of the cavern",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=grick",
        "imageUrl": "https://www.aidedd.org/dnd/images/grick.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "griffon": {
        "id": "griffon",
        "name": "Griffon",
        "type": "monstrosity",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 59,
            "dice": "7d10+21"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 2,
            "WIS": 13,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The griffon makes two attacks: one with its beak and one with its claws.Beak. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.Claws. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.A griffon is a ferocious avian carnivore with the muscular body of a lion and the head, forelegs, and wings of an eagle.M",
        "speedStr": "30 ft., fly 80 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=griffon",
        "imageUrl": "https://www.aidedd.org/dnd/images/griffon.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "deep_gnome_svirfneblin": {
        "id": "deep_gnome_svirfneblin",
        "name": "Deep Gnome Svirfneblin",
        "type": "humanoid",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 16,
            "dice": "3d6+6"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 14,
            "INT": 12,
            "WIS": 10,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "War Pick. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.Poisoned Dart. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 12 Constitution saving throw or be poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on",
        "speedStr": "20 ft.",
        "skill": "Investigation +3, Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=deep-gnome-svirfneblin",
        "imageUrl": "https://www.aidedd.org/dnd/images/deep-gnome-svirfneblin.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "giant_sea_horse": {
        "id": "giant_sea_horse",
        "name": "Giant Sea Horse",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 16,
            "dice": "3d10"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 15,
            "CON": 11,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-sea-horse",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-sea-horse.jpg"
    },
    "guardian_naga": {
        "id": "guardian_naga",
        "name": "Guardian Naga",
        "type": "monstrosity",
        "size": "large",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 127,
            "dice": "15d10+45"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 18,
            "CON": 16,
            "INT": 16,
            "WIS": 19,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +8 to hit, reach 10 ft., one creature. Hit: 8 (1d8 + 4) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 45 (10d8) poison damage on a failed save, or half as much damage on a successful one.Spit Poison. Ranged Weapon Attack: +8 to hit, range 15/30 ft., one creature. Hit: The target must make a DC 15 Constitution saving throw, taking 45",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=guardian-naga",
        "imageUrl": "https://www.aidedd.org/dnd/images/guardian-naga.jpg",
        "saves": {
            "DEX": 8,
            "CON": 7,
            "INT": 7,
            "WIS": 8,
            "CHA": 8
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "gynosphinx": {
        "id": "gynosphinx",
        "name": "Gynosphinx",
        "type": "monstrosity",
        "size": "large",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 136,
            "dice": "16d10+48"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 18,
            "WIS": 18,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The sphinx makes two claw attacks.Claw. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.Legendary actionsThe sphinx can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The sphinx regains spent legendary actions at the start of its",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "Arcana +12, History +12, Perception +8, Religion +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=gynosphinx",
        "imageUrl": "https://www.aidedd.org/dnd/images/gynosphinx.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "psychic"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened"
        ],
        "senses": [
            "truesight 120 ft."
        ],
        "legendaryActions": 3
    },
    "half_ogre": {
        "id": "half_ogre",
        "name": "Half Ogre",
        "type": "giant",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 30,
            "dice": "4d10+8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 14,
            "INT": 7,
            "WIS": 9,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Battleaxe. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 12 (2d8 + 3) slashing damage, or 14 (2d10 + 3) slashing damage if used with two hands.Javelin. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 10 (2d6 + 3) piercing damage.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=half-ogre",
        "imageUrl": "https://www.aidedd.org/dnd/images/half-ogre.jpg"
    },
    "half_red_dragon_veteran": {
        "id": "half_red_dragon_veteran",
        "name": "Half Red Dragon Veteran",
        "type": "humanoid",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 65,
            "dice": "10d8+20"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 13,
            "CON": 14,
            "INT": 10,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The veteran makes two longsword attacks. If it has a shortsword drawn, it can also make a shortsword attack.Longsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if used with two hands.Shortsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Heavy Crossbow. Rang",
        "speedStr": "30 ft.",
        "skill": "Athletics +5, Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=half-red-dragon-veteran",
        "imageUrl": "https://www.aidedd.org/dnd/images/half-red-dragon-veteran.jpg",
        "resistances": [
            "fire"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "harpy": {
        "id": "harpy",
        "name": "Harpy",
        "type": "monstrosity",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 38,
            "dice": "7d8+7"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 13,
            "CON": 12,
            "INT": 7,
            "WIS": 10,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The harpy makes two attacks: one with its claws and one with its club.Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) slashing damage.Club. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning damage.Luring Song. The harpy sings a magical melody. Every humanoid and giant within 300 feet of the harpy that can hear the so",
        "speedStr": "20 ft., fly 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=harpy",
        "imageUrl": "https://www.aidedd.org/dnd/images/harpy.jpg"
    },
    "hawk": {
        "id": "hawk",
        "name": "Hawk",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 16,
            "CON": 8,
            "INT": 2,
            "WIS": 14,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hawk",
        "imageUrl": "https://www.aidedd.org/dnd/images/hawk.jpg"
    },
    "hell_hound": {
        "id": "hell_hound",
        "name": "Hell Hound",
        "type": "fiend",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 45,
            "dice": "7d8+14"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 12,
            "CON": 14,
            "INT": 6,
            "WIS": 13,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 7 (2d6) fire damage.Fire Breath (Recharge 5-6). The hound exhales fire in a 15-foot cone. Each creature in that area must make a DC 12 Dexterity saving throw, taking 21 (6d6) fire damage on a failed save, or half as much damage on a successful one.Fire-breathing fiends that take the form of powerfu",
        "speedStr": "50 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hell-hound",
        "imageUrl": "https://www.aidedd.org/dnd/images/hell-hound.jpg",
        "immunities": [
            "fire"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "helmed_horror": {
        "id": "helmed_horror",
        "name": "Helmed Horror",
        "type": "construct",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 60,
            "dice": "8d8+24"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 16,
            "INT": 10,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The helmed horror makes two longsword attacks.Longsword. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage, or 9 (1d10 + 4) slashing damage if used with two hands.Monster Manual (BR+)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=helmed-horror",
        "imageUrl": "https://www.aidedd.org/dnd/images/helmed-horror.jpg"
    },
    "hezrou": {
        "id": "hezrou",
        "name": "Hezrou",
        "type": "fiend",
        "size": "large",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 136,
            "dice": "13d10+65"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 17,
            "CON": 20,
            "INT": 5,
            "WIS": 12,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hezrou makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 15 (2d10 + 4) piercing damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hezrou",
        "imageUrl": "https://www.aidedd.org/dnd/images/hezrou.jpg",
        "saves": {
            "STR": 7,
            "CON": 8,
            "WIS": 4
        },
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "hill_giant": {
        "id": "hill_giant",
        "name": "Hill Giant",
        "type": "giant",
        "size": "huge",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 105,
            "dice": "10d12+40"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 8,
            "CON": 19,
            "INT": 5,
            "WIS": 9,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two greatclub attacks.Greatclub. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 18 (3d8 + 5) bludgeoning damage.Rock. Ranged Weapon Attack: +8 to hit, range 60/240 ft., one target. Hit: 21 (3d10 + 5) bludgeoning damage.Hill giants are selfish, dimwitted brutes that hunt and raid in constant search of food. Their skins are tan from lives spent beneath th",
        "speedStr": "40 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hill-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/hill-giant.jpg"
    },
    "hippogriff": {
        "id": "hippogriff",
        "name": "Hippogriff",
        "type": "monstrosity",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 19,
            "dice": "3d10+3"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 13,
            "CON": 13,
            "INT": 2,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hippogriff makes two attacks: one with its beak and one with its claws.Beak. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.A hippogriff is a magical creature possessing the wings and forelimbs of an eagle, the hindquarters of a horse, and a",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hippogriff",
        "imageUrl": "https://www.aidedd.org/dnd/images/hippogriff.jpg"
    },
    "reef_manta_ray": {
        "id": "reef_manta_ray",
        "name": "Reef Manta Ray",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 16,
            "dice": "2d10+2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 12,
            "CON": 12,
            "INT": 1,
            "WIS": 12,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=reef-manta-ray",
        "imageUrl": "https://www.aidedd.org/dnd/images/reef-manta-ray.jpg"
    },
    "hobgoblin_captain": {
        "id": "hobgoblin_captain",
        "name": "Hobgoblin Captain",
        "type": "humanoid",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 39,
            "dice": "6d8+12"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 14,
            "INT": 12,
            "WIS": 10,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hobgoblin makes two greatsword attacks.Greatsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) piercing damage.Javelin. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Leadership (Recharges after a Short or Long Rest). For 1 minute, the hobgoblin can utter a special command or war",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hobgoblin-captain",
        "imageUrl": "https://www.aidedd.org/dnd/images/hobgoblin-captain.jpg"
    },
    "hobgoblin_iron_shadow": {
        "id": "hobgoblin_iron_shadow",
        "name": "Hobgoblin Iron Shadow",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 16,
            "CON": 15,
            "INT": 14,
            "WIS": 15,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hobgoblin makes four attacks, each of which can be an Unarmed Strike or a Dart attack. It can also use Shadow Jaunt once, either before or after one of the attacks.Unarmed Strike. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) bludgeoning damage.Dart. Ranged Weapon Attack: +5 to hit, range 20/60 ft., one target. Hit: 5 (1d4 + 3) piercing damage.Shadow Ja",
        "speedStr": "40 ft.",
        "skill": "Acrobatics +5, Athletics +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hobgoblin-iron-shadow",
        "imageUrl": "https://www.aidedd.org/dnd/images/hobgoblin-iron-shadow.jpg"
    },
    "homunculus": {
        "id": "homunculus",
        "name": "Homunculus",
        "type": "construct",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 5,
            "dice": "2d4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 4,
            "DEX": 15,
            "CON": 11,
            "INT": 10,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must succeed on a DC 10 Constitution saving throw or be poisoned for 1 minute. If the saving throw fails by 5 or more, the target is instead poisoned for 5 (1d10) minutes and unconscious while poisoned in this way.Monster Manual (SRD)",
        "speedStr": "20 ft., fly 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=homunculus",
        "imageUrl": "https://www.aidedd.org/dnd/images/homunculus.jpg",
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "hook_horror": {
        "id": "hook_horror",
        "name": "Hook Horror",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 75,
            "dice": "10d10+20"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 15,
            "INT": 6,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hook horror makes two hook attacks.Hook. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) piercing damage.Monster Manual (BR+)",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hook-horror",
        "imageUrl": "https://www.aidedd.org/dnd/images/hook-horror.jpg"
    },
    "horned_devil": {
        "id": "horned_devil",
        "name": "Horned Devil",
        "type": "fiend",
        "size": "large",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 178,
            "dice": "17d10+85"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 17,
            "CON": 21,
            "INT": 12,
            "WIS": 16,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes three melee attacks: two with its fork and one with its tail. It can use Hurl Flame in place of any melee attack.Fork. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 15 (2d8 + 6) piercing damage.Tail. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 10 (1d8 + 6) piercing damage. If the target is a creature other than an undead or a const",
        "speedStr": "20 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=horned-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/horned-devil.jpg",
        "saves": {
            "STR": 10,
            "DEX": 7,
            "WIS": 7,
            "CHA": 7
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "hunter_shark": {
        "id": "hunter_shark",
        "name": "Hunter Shark",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 15,
            "INT": 1,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.A hunter shark is 15 to 20 feet long, and usually hunts alone in deep waters.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hunter-shark",
        "imageUrl": "https://www.aidedd.org/dnd/images/hunter-shark.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "hydra": {
        "id": "hydra",
        "name": "Hydra",
        "type": "monstrosity",
        "size": "huge",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 172,
            "dice": "15d12+75"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 12,
            "CON": 20,
            "INT": 2,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The hydra makes as many bite attacks as it has heads.Bite. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 10 (1d10 + 5) piercing damage.The hydra is a reptilian horror with a crocodilian body and multiple heads on long, serpentine necks. Although its heads can be severed, the hydra magically regrows them in short order.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hydra",
        "imageUrl": "https://www.aidedd.org/dnd/images/hydra.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "hyena": {
        "id": "hyena",
        "name": "Hyena",
        "type": "beast",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 5,
            "dice": "1d8+1"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 13,
            "CON": 12,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) piercing damage.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hyena",
        "imageUrl": "https://www.aidedd.org/dnd/images/hyena.jpg"
    },
    "ice_devil": {
        "id": "ice_devil",
        "name": "Ice Devil",
        "type": "fiend",
        "size": "large",
        "cr": 14,
        "xp": 11500,
        "hp": {
            "base": 180,
            "dice": "19d10+76"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 14,
            "CON": 18,
            "INT": 18,
            "WIS": 15,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The devil makes three attacks: one with its bite, one with its claws, and one with its tail.Bite. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) piercing damage plus 10 (3d6) cold damage.Claws. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 10 (2d4 + 5) slashing damage plus 10 (3d6) cold damage.Tail. Melee Weapon Attack: +10 to hit, reach 1",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ice-devil",
        "imageUrl": "https://www.aidedd.org/dnd/images/ice-devil.jpg",
        "saves": {
            "DEX": 7,
            "CON": 9,
            "WIS": 7,
            "CHA": 9
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft.",
            "darkvision 120 ft."
        ]
    },
    "scout": {
        "id": "scout",
        "name": "Scout",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 16,
            "dice": "3d8+3"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 14,
            "CON": 12,
            "INT": 11,
            "WIS": 13,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The scout makes two melee attacks or two ranged attacks.Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Longbow. Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.Scouts are skilled hunters and trackers who offer their services for a fee. Most hunt wild game, but a few work as bounty h",
        "speedStr": "30 ft.",
        "skill": "Nature +4, Perception +5, Stealth +6, Survival +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=scout",
        "imageUrl": "https://www.aidedd.org/dnd/images/scout.jpg"
    },
    "imp": {
        "id": "imp",
        "name": "Imp",
        "type": "fiend",
        "size": "tiny",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 10,
            "dice": "3d4+3"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 17,
            "CON": 13,
            "INT": 11,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Sting (Bite in Beast Form). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must make on a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one.Invisibility. The imp magically turns invisible until it attacks or until its concentration ends (as if concentrating on a spel",
        "speedStr": "20 ft., fly 40 ft.",
        "skill": "Deception +4, Insight +3, Persuasion +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=imp",
        "imageUrl": "https://www.aidedd.org/dnd/images/imp.jpg",
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "invisible_stalker": {
        "id": "invisible_stalker",
        "name": "Invisible Stalker",
        "type": "elemental",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 104,
            "dice": "16d8+32"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 19,
            "CON": 14,
            "INT": 10,
            "WIS": 15,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The stalker makes two slam attacks.Slam. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "50 ft., fly 50 ft. (hover)",
        "skill": "Perception +8, Stealth +10",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=invisible-stalker",
        "imageUrl": "https://www.aidedd.org/dnd/images/invisible-stalker.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "iron_golem": {
        "id": "iron_golem",
        "name": "Iron Golem",
        "type": "construct",
        "size": "large",
        "cr": 16,
        "xp": 15000,
        "hp": {
            "base": 210,
            "dice": "20d10+100"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 24,
            "DEX": 9,
            "CON": 20,
            "INT": 3,
            "WIS": 11,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 11,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The golem makes two melee attacks.Slam. Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 20 (3d8 + 7) bludgeoning damage.Sword. Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 23 (3d10 + 7) slashing damage.Poison Breath (Recharge 6). The golem exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 19 Constitution saving throw,",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=iron-golem",
        "imageUrl": "https://www.aidedd.org/dnd/images/iron-golem.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "jackal": {
        "id": "jackal",
        "name": "Jackal",
        "type": "beast",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 3,
            "dice": "1d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 15,
            "CON": 11,
            "INT": 3,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 1 (1d4 - 1) piercing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=jackal",
        "imageUrl": "https://www.aidedd.org/dnd/images/jackal.jpg"
    },
    "shadow": {
        "id": "shadow",
        "name": "Shadow",
        "type": "undead",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 16,
            "dice": "3d8+3"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 14,
            "CON": 13,
            "INT": 6,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Strength Drain. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) necrotic damage, and the target's Strength score is reduced by 1d4. The target dies if this reduces its Strength to 0. Otherwise, the reduction lasts until the target finishes a short or long rest. If a non-evil humanoid dies from this attack, a new shadow rises from the corpse 1d4 hours later.Monster Manua",
        "speedStr": "40 ft.",
        "skill": "Stealth +4 (+6 in dim light or darkness)",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=shadow",
        "imageUrl": "https://www.aidedd.org/dnd/images/shadow.jpg",
        "resistances": [
            "acid",
            "cold",
            "fire",
            "lightning",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "vulnerabilities": [
            "radiant"
        ],
        "conditionImmunities": [
            "exhaustion",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "camel": {
        "id": "camel",
        "name": "Camel",
        "type": "beast",
        "size": "large",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 15,
            "dice": "2d10+4"
        },
        "ac": 9,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 8,
            "CON": 14,
            "INT": 2,
            "WIS": 8,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=camel",
        "imageUrl": "https://www.aidedd.org/dnd/images/camel.jpg"
    },
    "killer_whale": {
        "id": "killer_whale",
        "name": "Killer Whale",
        "type": "beast",
        "size": "huge",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 90,
            "dice": "12d12+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 13,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 21 (5d6 + 4) piercing damage.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 60 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=killer-whale",
        "imageUrl": "https://www.aidedd.org/dnd/images/killer-whale.jpg",
        "senses": [
            "blindsight 120 ft."
        ]
    },
    "knight": {
        "id": "knight",
        "name": "Knight",
        "type": "humanoid",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 52,
            "dice": "8d8+16"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 11,
            "CON": 14,
            "INT": 11,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The knight makes two melee attacks.Greatsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.Heavy Crossbow. Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.Leadership (Recharges after a Short or Long Rest). For 1 minute, the knight can utter a special command or warning whenever a nonhostile cr",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=knight",
        "imageUrl": "https://www.aidedd.org/dnd/images/knight.jpg",
        "saves": {
            "CON": 4,
            "WIS": 2
        }
    },
    "cow": {
        "id": "cow",
        "name": "Cow",
        "type": "beast",
        "size": "large",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 15,
            "dice": "2d10+4"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 14,
            "INT": 2,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cow",
        "imageUrl": "https://www.aidedd.org/dnd/images/cow.jpg"
    },
    "orc": {
        "id": "orc",
        "name": "Orc",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 15,
            "dice": "2d8+6"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 16,
            "INT": 7,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Greataxe. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.Javelin. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Orcs are savage humanoids with stooped postures, piggish faces, and prominent teeth that resemble tusks. They gather in tribes that satisfy their bloodlust by slaying any",
        "speedStr": "30 ft.",
        "skill": "Intimidation +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=orc",
        "imageUrl": "https://www.aidedd.org/dnd/images/orc.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "kraken": {
        "id": "kraken",
        "name": "Kraken",
        "type": "monstrosity",
        "size": "gargantuan",
        "cr": 23,
        "xp": 50000,
        "hp": {
            "base": 472,
            "dice": "27d20+189"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 30,
            "DEX": 11,
            "CON": 25,
            "INT": 22,
            "WIS": 18,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 15,
                "damage": "1d8+10",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The kraken makes three tentacle attacks, each of which it can replace with one use of Fling.Bite. Melee Weapon Attack: +17 to hit, reach 5 ft., one target. Hit: 23 (3d8 + 10) piercing damage. If the target is a Large or smaller creature grappled by the kraken, that creature is swallowed, and the grapple ends. While swallowed, the creature is blinded and restrained, it has total cover",
        "speedStr": "20 ft., swim 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kraken",
        "imageUrl": "https://www.aidedd.org/dnd/images/kraken.jpg",
        "saves": {
            "STR": 17,
            "DEX": 7,
            "CON": 14,
            "INT": 13,
            "WIS": 11
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "lightning"
        ],
        "conditionImmunities": [
            "frightened",
            "paralyzed"
        ],
        "senses": [
            "truesight 120 ft."
        ],
        "legendaryActions": 3
    },
    "aarakocra": {
        "id": "aarakocra",
        "name": "Aarakocra",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 10,
            "INT": 11,
            "WIS": 12,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "20 ft., fly 50 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=aarakocra",
        "imageUrl": "https://www.aidedd.org/dnd/images/aarakocra.jpg"
    },
    "kuo_toa_archpriest": {
        "id": "kuo_toa_archpriest",
        "name": "Kuo Toa Archpriest",
        "type": "humanoid",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 97,
            "dice": "13d8+39"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 16,
            "INT": 13,
            "WIS": 16,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The kuo-toa makes two melee attacks.Scepter. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage plus 14 (4d6) lightning damage.Unarmed Strike. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) bludgeoning damage.Monster Manual (BR+)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +9, Religion +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kuo-toa-archpriest",
        "imageUrl": "https://www.aidedd.org/dnd/images/kuo-toa-archpriest.jpg"
    },
    "kuo_toa_whip": {
        "id": "kuo_toa_whip",
        "name": "Kuo Toa Whip",
        "type": "humanoid",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 65,
            "dice": "10d8+20"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 10,
            "CON": 14,
            "INT": 12,
            "WIS": 14,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The kuo-toa makes two attacks: one with its bite and one with its pincer staff.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Pincer Staff. Melee Weapon Attack: +4 to hit, reach 10 ft., one target. Hit: 5 (1d6 + 2) piercing damage. If the target is a Medium or smaller creature, it is grappled (escape DC 14). Until this grapple ends, the",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +6, Religion +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kuo-toa-whip",
        "imageUrl": "https://www.aidedd.org/dnd/images/kuo-toa-whip.jpg"
    },
    "laeral_silverhand": {
        "id": "laeral_silverhand",
        "name": "Laeral Silverhand",
        "type": "humanoid",
        "size": "medium",
        "cr": 17,
        "xp": 18000,
        "hp": {
            "base": 228,
            "dice": "24d8+120"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 17,
            "CON": 20,
            "INT": 20,
            "WIS": 20,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. Laeral makes three attacks with her silver hair and flame tongue, in any combination. She can cast one of her cantrips or 1st-level spells before or after making these attacks.Silver Hair. Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 7 (2d6) force damage, and the target must succeed on a DC 19 Constitution saving throw or be paralyzed for 1 minute. The target can rep",
        "speedStr": "30 ft.",
        "skill": "Arcana +17, History +17, Insight +11, Perception +11, Persuasion +10",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=laeral-silverhand",
        "imageUrl": "https://www.aidedd.org/dnd/images/laeral-silverhand.jpg"
    },
    "lamia": {
        "id": "lamia",
        "name": "Lamia",
        "type": "monstrosity",
        "size": "large",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 97,
            "dice": "13d10+26"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 13,
            "CON": 15,
            "INT": 14,
            "WIS": 15,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The lamia makes two attacks: one with its claws and one with its dagger or Intoxicating Touch.Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 14 (2d10 + 3) slashing damage.Dagger. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage.Intoxicating Touch. Melee Spell Attack: +5 to hit, reach 5 ft., one creature. Hit: The target is",
        "speedStr": "30 ft.",
        "skill": "Deception +7, Insight +4, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lamia",
        "imageUrl": "https://www.aidedd.org/dnd/images/lamia.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "lemure": {
        "id": "lemure",
        "name": "Lemure",
        "type": "fiend",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 7,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 5,
            "CON": 11,
            "INT": 1,
            "WIS": 11,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Fist. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "15 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lemure",
        "imageUrl": "https://www.aidedd.org/dnd/images/lemure.jpg",
        "resistances": [
            "cold"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "lich": {
        "id": "lich",
        "name": "Lich",
        "type": "undead",
        "size": "medium",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 135,
            "dice": "18d8+54"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 16,
            "CON": 16,
            "INT": 20,
            "WIS": 14,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Paralyzing Touch. Melee Spell Attack: +12 to hit, reach 5 ft., one creature. Hit: 10 (3d6) cold damage. The target must succeed on a DC 18 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.Legendary actionsThe lich can take 3 legendary actions, choosing from the options below. Onl",
        "speedStr": "30 ft.",
        "skill": "Arcana +19, History +12, Insight +9, Perception +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lich",
        "imageUrl": "https://www.aidedd.org/dnd/images/lich.jpg",
        "saves": {
            "CON": 10,
            "INT": 12,
            "WIS": 9
        },
        "resistances": [
            "cold",
            "lightning",
            "necrotic",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ],
        "legendaryActions": 4
    },
    "lion": {
        "id": "lion",
        "name": "Lion",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 26,
            "dice": "4d10+4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 13,
            "INT": 3,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.Claw. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Monster Manual (SRD)",
        "speedStr": "50 ft.",
        "skill": "Perception +3, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lion",
        "imageUrl": "https://www.aidedd.org/dnd/images/lion.jpg"
    },
    "lizard": {
        "id": "lizard",
        "name": "Lizard",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 11,
            "CON": 10,
            "INT": 1,
            "WIS": 8,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "20 ft., climb 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lizard",
        "imageUrl": "https://www.aidedd.org/dnd/images/lizard.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "lizard_king_queen": {
        "id": "lizard_king_queen",
        "name": "Lizard King Queen",
        "type": "humanoid",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 78,
            "dice": "12d8+24"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 12,
            "CON": 15,
            "INT": 11,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The lizardfolk makes two attacks: one with its bite and one with its claws or trident or two melee attacks with its trident.Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) slashing damage.Trident. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or rang",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +5, Survival +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lizard-king-queen",
        "imageUrl": "https://www.aidedd.org/dnd/images/lizard-king-queen.jpg"
    },
    "constrictor_snake": {
        "id": "constrictor_snake",
        "name": "Constrictor Snake",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d10+2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 12,
            "INT": 1,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage.Constrict. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) bludgeoning damage, and the target is grappled (escape DC 14). Until this grapple ends, the creature is restrained, and the snake can't constrict another target.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=constrictor-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/constrictor-snake.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "lizardfolk_shaman": {
        "id": "lizardfolk_shaman",
        "name": "Lizardfolk Shaman",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 13,
            "INT": 10,
            "WIS": 15,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Lizardfolk Form Only). The lizardfolk makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 7 (1d10 + 2) piercing damage in crocodile form. If the lizardfolk is in crocodile form and the target is a Large or smaller creature, the target is grappled (escape DC 12). Until this grapp",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +4, Survival +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=lizardfolk-shaman",
        "imageUrl": "https://www.aidedd.org/dnd/images/lizardfolk-shaman.jpg"
    },
    "mage": {
        "id": "mage",
        "name": "Mage",
        "type": "humanoid",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 40,
            "dice": "9d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 9,
            "DEX": 14,
            "CON": 11,
            "INT": 17,
            "WIS": 12,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Dagger. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Mages spend their lives in the study and practice of magic. Good-aligned mages offer counsel to nobles and others in power, while evil mages dwell in isolated sites to perform unspeakable experiments without interference.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Arcana +6, History +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mage",
        "imageUrl": "https://www.aidedd.org/dnd/images/mage.jpg",
        "saves": {
            "INT": 6,
            "WIS": 4
        }
    },
    "drow": {
        "id": "drow",
        "name": "Drow",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 10,
            "INT": 11,
            "WIS": 11,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Hand Crossbow. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage, and the target must succeed on a DC 13 Constitution saving throw or be poisoned for 1 hour. If the saving throw fails by 5 or more, the target is also unconscious while poisoned in this",
        "speedStr": "30 ft.",
        "skill": "Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=drow",
        "imageUrl": "https://www.aidedd.org/dnd/images/drow.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "mammoth": {
        "id": "mammoth",
        "name": "Mammoth",
        "type": "beast",
        "size": "huge",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 126,
            "dice": "11d12+55"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 24,
            "DEX": 9,
            "CON": 21,
            "INT": 3,
            "WIS": 11,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 25 (4d8 + 7) piercing damage.Stomp. Melee Weapon Attack: +10 to hit, reach 5 ft., one prone creature. Hit: 29 (4d10 + 7) bludgeoning damage.A mammoth is an elephantine creature with thick fur and long tusks.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mammoth",
        "imageUrl": "https://www.aidedd.org/dnd/images/mammoth.jpg"
    },
    "elk": {
        "id": "elk",
        "name": "Elk",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d10+2"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 10,
            "CON": 12,
            "INT": 2,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=elk",
        "imageUrl": "https://www.aidedd.org/dnd/images/elk.jpg"
    },
    "manticore": {
        "id": "manticore",
        "name": "Manticore",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 68,
            "dice": "8d10+24"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 16,
            "CON": 17,
            "INT": 7,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The manticore makes three attacks: one with its bite and two with its claws or three with its tail spikes.Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.Claw. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Tail Spike. Ranged Weapon Attack: +5 to hit, range 100/200 ft., one target. Hit: 7 (1d8 +",
        "speedStr": "30 ft., fly 50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=manticore",
        "imageUrl": "https://www.aidedd.org/dnd/images/manticore.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "marilith": {
        "id": "marilith",
        "name": "Marilith",
        "type": "fiend",
        "size": "large",
        "cr": 16,
        "xp": 15000,
        "hp": {
            "base": 189,
            "dice": "18d10+90"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 20,
            "CON": 20,
            "INT": 18,
            "WIS": 16,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The marilith makes seven attacks: six with its longswords and one with its tail.Longsword. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.Tail. Melee Weapon Attack: +9 to hit, reach 10 ft., one creature. Hit: 15 (2d10 + 4) bludgeoning damage. If the target is Medium or smaller, it is grappled (escape DC 19). Until this grapple ends, the targ",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=marilith",
        "imageUrl": "https://www.aidedd.org/dnd/images/marilith.jpg",
        "saves": {
            "STR": 9,
            "CON": 10,
            "WIS": 8,
            "CHA": 10
        },
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "medusa": {
        "id": "medusa",
        "name": "Medusa",
        "type": "monstrosity",
        "size": "medium",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 127,
            "dice": "17d8+51"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 15,
            "CON": 16,
            "INT": 12,
            "WIS": 13,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The medusa makes either three melee attacks -one with its snake hair and two with its shortsword- or two ranged attacks with its longbow.Snake Hair. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage plus 14 (4d6) poison damage.Shortsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Longbow. Ranged",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Insight +4, Perception +4, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=medusa",
        "imageUrl": "https://www.aidedd.org/dnd/images/medusa.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "giant_badger": {
        "id": "giant_badger",
        "name": "Giant Badger",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d8+4"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 10,
            "CON": 15,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The badger makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) slashing damage.Monster Manual (SRD)",
        "speedStr": "30 ft., burrow 10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-badger",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-badger.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "merrow": {
        "id": "merrow",
        "name": "Merrow",
        "type": "monstrosity",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 15,
            "INT": 8,
            "WIS": 10,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The merrow makes two attacks: one with its bite and one with its claws or harpoon.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.Claws. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (2d4 + 4) slashing damage.Harpoon. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 11 (2d6 + 4)",
        "speedStr": "10 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=merrow",
        "imageUrl": "https://www.aidedd.org/dnd/images/merrow.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "mezzoloth": {
        "id": "mezzoloth",
        "name": "Mezzoloth",
        "type": "fiend",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 75,
            "dice": "10d8+30"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 11,
            "CON": 16,
            "INT": 7,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The mezzoloth makes two attacks: one with its claws and one with its trident.Claws. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (2d4 + 4) slashing damage.Trident. Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 7 (1d6 + 4) piercing damage, or 8 (1d8 + 4) piercing damage when held with two claws and used to make a melee att",
        "speedStr": "40 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mezzoloth",
        "imageUrl": "https://www.aidedd.org/dnd/images/mezzoloth.jpg"
    },
    "mimic": {
        "id": "mimic",
        "name": "Mimic",
        "type": "monstrosity",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 58,
            "dice": "9d8+18"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 12,
            "CON": 15,
            "INT": 5,
            "WIS": 13,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Pseudopod. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage. If the mimic is in object form, the target is subjected to its Adhesive trait.Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 4 (1d8) acid damage.Monster Manual (SRD)",
        "speedStr": "15 ft.",
        "skill": "Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mimic",
        "imageUrl": "https://www.aidedd.org/dnd/images/mimic.jpg",
        "immunities": [
            "acid"
        ],
        "conditionImmunities": [
            "prone"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "mindwitness": {
        "id": "mindwitness",
        "name": "Mindwitness",
        "type": "aberration",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 75,
            "dice": "10d10+20"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 14,
            "INT": 15,
            "WIS": 15,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack.Bite.Tentacles.Eye Ray.Monsters of the Multiverse",
        "speedStr": "0 ft., fly 20 ft. (hover)",
        "skill": "Perception +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mindwitness",
        "imageUrl": "https://www.aidedd.org/dnd/images/mindwitness.jpg"
    },
    "minotaur": {
        "id": "minotaur",
        "name": "Minotaur",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 76,
            "dice": "9d10+27"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 11,
            "CON": 16,
            "INT": 6,
            "WIS": 16,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Greataxe. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.Gore. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.Their fur stained with the blood of fallen foes, minotaurs are massive, bull-headed humanoids whose roar is a savage battle cry that all civilized creatures fear.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=minotaur",
        "imageUrl": "https://www.aidedd.org/dnd/images/minotaur.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "minotaur_skeleton": {
        "id": "minotaur_skeleton",
        "name": "Minotaur Skeleton",
        "type": "undead",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 67,
            "dice": "9d10+18"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 11,
            "CON": 15,
            "INT": 6,
            "WIS": 8,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Greataxe. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.Gore. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=minotaur-skeleton",
        "imageUrl": "https://www.aidedd.org/dnd/images/minotaur-skeleton.jpg",
        "immunities": [
            "poison"
        ],
        "vulnerabilities": [
            "bludgeoning"
        ],
        "conditionImmunities": [
            "exhaustion",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "moloch": {
        "id": "moloch",
        "name": "Moloch",
        "type": "fiend",
        "size": "large",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 253,
            "dice": "22d10+132"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 19,
            "CON": 22,
            "INT": 21,
            "WIS": 18,
            "CHA": 23
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack.Bite.Claw.Many-Tailed Whip.Breath of Despair (Recharge 5–6).Spellcasting.Teleport.Legendary actionsAttack.Teleport.Cast a Spell (Costs 2 Actions).Long ago, Moloch earned his place among the other archdevils through the glory he won driving demons out of the Nine Hells. Asmodeus rewarded him by elevating Moloch to the rulership of Malbolge. Now exiled from the Nine Hells, Moloch would d",
        "speedStr": "30 ft.",
        "skill": "Deception +13, Intimidation +13, Perception +11",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=moloch",
        "imageUrl": "https://www.aidedd.org/dnd/images/moloch.jpg"
    },
    "giant_crab": {
        "id": "giant_crab",
        "name": "Giant Crab",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 15,
            "CON": 11,
            "INT": 1,
            "WIS": 9,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claw. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage, and the target is grappled (escape DC 11). The crab has two claws, each of which can grapple only one target.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-crab",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-crab.jpg",
        "senses": [
            "blindsight 30 ft."
        ]
    },
    "giant_wasp": {
        "id": "giant_wasp",
        "name": "Giant Wasp",
        "type": "beast",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 10,
            "INT": 1,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Sting. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paral",
        "speedStr": "10 ft., fly 50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-wasp",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-wasp.jpg"
    },
    "kenku": {
        "id": "kenku",
        "name": "Kenku",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 16,
            "CON": 10,
            "INT": 11,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Shortsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Shortbow. Ranged Weapon Attack: +5 to hit, range 80/320 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "Deception +4, Perception +2, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kenku",
        "imageUrl": "https://www.aidedd.org/dnd/images/kenku.jpg"
    },
    "kobold_inventor": {
        "id": "kobold_inventor",
        "name": "Kobold Inventor",
        "type": "humanoid",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d6+3"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 15,
            "CON": 12,
            "INT": 8,
            "WIS": 7,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Dagger. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Sling. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.Weapon Invention. The kobold uses one of the following options (choose one or roll a d8); the kobold can use each one no more than once per day: 1- Acid. The kobold hu",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kobold-inventor",
        "imageUrl": "https://www.aidedd.org/dnd/images/kobold-inventor.jpg"
    },
    "mummy": {
        "id": "mummy",
        "name": "Mummy",
        "type": "undead",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 58,
            "dice": "9d8+18"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 8,
            "CON": 15,
            "INT": 6,
            "WIS": 10,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The mummy can use its Dreadful Glare and makes one attack with its rotting fist.Rotting Fist. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage plus 10 (3d6) necrotic damage. If the target is a creature, it must succeed on a DC 12 Constitution saving throw or be cursed with mummy rot. The cursed target can't regain hit points, and its hit po",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mummy",
        "imageUrl": "https://www.aidedd.org/dnd/images/mummy.jpg",
        "saves": {
            "WIS": 2
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "vulnerabilities": [
            "fire"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "mummy_lord": {
        "id": "mummy_lord",
        "name": "Mummy Lord",
        "type": "undead",
        "size": "medium",
        "cr": 15,
        "xp": 13000,
        "hp": {
            "base": 97,
            "dice": "13d8+39"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 17,
            "INT": 11,
            "WIS": 18,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The mummy can use its Dreadful Glare and makes one attack with its rotting fist.Rotting Fist. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 14 (3d6 + 4) bludgeoning damage plus 21 (6d6) necrotic damage. If the target is a creature, it must succeed on a DC 16 Constitution saving throw or be cursed with mummy rot. The cursed target can't regain hit points, and its hit po",
        "speedStr": "20 ft.",
        "skill": "History +5, Religion +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mummy-lord",
        "imageUrl": "https://www.aidedd.org/dnd/images/mummy-lord.jpg",
        "saves": {
            "CON": 8,
            "INT": 5,
            "WIS": 9,
            "CHA": 8
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "vulnerabilities": [
            "fire"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ],
        "legendaryActions": 5
    },
    "nalfeshnee": {
        "id": "nalfeshnee",
        "name": "Nalfeshnee",
        "type": "fiend",
        "size": "large",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 184,
            "dice": "16d10+96"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 10,
            "CON": 22,
            "INT": 19,
            "WIS": 12,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The nalfeshnee uses Horror Nimbus if it can. It then makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 32 (5d10 + 5) piercing damage.Claw. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 15 (3d6 + 5) slashing damage.Horror Nimbus (Recharge 5-6). The nalfeshnee magically emits scintillating",
        "speedStr": "20 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=nalfeshnee",
        "imageUrl": "https://www.aidedd.org/dnd/images/nalfeshnee.jpg",
        "saves": {
            "CON": 11,
            "INT": 9,
            "WIS": 6,
            "CHA": 7
        },
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "narzugon": {
        "id": "narzugon",
        "name": "Narzugon",
        "type": "fiend",
        "size": "medium",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 112,
            "dice": "15d8+45"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 10,
            "CON": 17,
            "INT": 16,
            "WIS": 14,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The narzugon makes three Hellfire Lance attacks. It also uses Infernal Command or Terrifying Command.Hellfire Lance. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 11 (1d12 + 5) piercing damage plus 16 (3d10) fire damage. If this damage kills a creature with a soul, the soul rises from the River Styx as a lemure in Avernus in 1d4 hours. If the creature isn't revived b",
        "speedStr": "30 ft.",
        "skill": "Perception +12",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=narzugon",
        "imageUrl": "https://www.aidedd.org/dnd/images/narzugon.jpg"
    },
    "panther": {
        "id": "panther",
        "name": "Panther",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 15,
            "CON": 10,
            "INT": 3,
            "WIS": 14,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) slashing damage.Monster Manual (SRD)",
        "speedStr": "50 ft., climb 40 ft.",
        "skill": "Perception +4, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=panther",
        "imageUrl": "https://www.aidedd.org/dnd/images/panther.jpg"
    },
    "pteranodon": {
        "id": "pteranodon",
        "name": "Pteranodon",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 15,
            "CON": 10,
            "INT": 2,
            "WIS": 9,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) piercing damage.These flying reptilian cousins to the dinosaurs have no teeth, instead using their sharp beaks to stab prey too large to swallow with one gulp.Monster Manual (BR)",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "Perception +1",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=pteranodon",
        "imageUrl": "https://www.aidedd.org/dnd/images/pteranodon.jpg"
    },
    "riding_horse": {
        "id": "riding_horse",
        "name": "Riding Horse",
        "type": "beast",
        "size": "large",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d10+2"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 10,
            "CON": 12,
            "INT": 2,
            "WIS": 11,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=riding-horse",
        "imageUrl": "https://www.aidedd.org/dnd/images/riding-horse.jpg"
    },
    "night_hag": {
        "id": "night_hag",
        "name": "Night Hag",
        "type": "fiend",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 112,
            "dice": "15d8+45"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 16,
            "WIS": 14,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws (Hag Form Only). Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.Change Shape. The hag magically polymorphs into a Small or Medium female humanoid, or back into her true form. Her statistics are the same in each form. Any equipment she is wearing or carrying isn't transformed. She reverts to her true form if she dies.Etherealness. The hag magically",
        "speedStr": "30 ft.",
        "skill": "Deception +7, Insight +6, Perception +6, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=night-hag",
        "imageUrl": "https://www.aidedd.org/dnd/images/night-hag.jpg",
        "resistances": [
            "cold",
            "fire",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "conditionImmunities": [
            "charmed"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "nightmare": {
        "id": "nightmare",
        "name": "Nightmare",
        "type": "fiend",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 68,
            "dice": "8d10+24"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 10,
            "WIS": 13,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage plus 7 (2d6) fire damage.Ethereal Stride. The nightmare and up to three willing creatures within 5 feet of it magically enter the Ethereal Plane from the Material Plane, or vice versa.Monster Manual (SRD)",
        "speedStr": "60 ft., fly 90 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=nightmare",
        "imageUrl": "https://www.aidedd.org/dnd/images/nightmare.jpg",
        "immunities": [
            "fire"
        ]
    },
    "nilbog": {
        "id": "nilbog",
        "name": "Nilbog",
        "type": "humanoid",
        "size": "small",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 7,
            "dice": "2d6"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 14,
            "CON": 10,
            "INT": 10,
            "WIS": 8,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Fool's Scepter. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage.Mocking Word. The nilbog targets one creature it can see within 60 feet of it. The target must succeed on a DC 12 Wisdom saving throw or take 5 (2d4) psychic damage and have disadvantage on its next attack roll before the end of its next turn.Spellcasting. The nilbog casts one of the follow",
        "speedStr": "30 ft.",
        "skill": "Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=nilbog",
        "imageUrl": "https://www.aidedd.org/dnd/images/nilbog.jpg"
    },
    "skeleton": {
        "id": "skeleton",
        "name": "Skeleton",
        "type": "undead",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d8+4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 14,
            "CON": 15,
            "INT": 6,
            "WIS": 8,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=skeleton",
        "imageUrl": "https://www.aidedd.org/dnd/images/skeleton.jpg",
        "immunities": [
            "poison"
        ],
        "vulnerabilities": [
            "bludgeoning"
        ],
        "conditionImmunities": [
            "poisoned",
            "exhaustion"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "nothic": {
        "id": "nothic",
        "name": "Nothic",
        "type": "aberration",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d8+18"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 16,
            "CON": 16,
            "INT": 13,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The nothic makes two claw attacks.Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Rotting Gaze. The nothic targets one creature it can see within 30 feet of it. The target must succeed on a DC 12 Constitution saving throw against this magic or take 10 (3d6) necrotic damage.Weird Insight. The nothic targets one creature it can see within",
        "speedStr": "30 ft.",
        "skill": "Arcana +3, Insight +4, Perception +2, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=nothic",
        "imageUrl": "https://www.aidedd.org/dnd/images/nothic.jpg"
    },
    "troglodyte": {
        "id": "troglodyte",
        "name": "Troglodyte",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 13,
            "dice": "2d8+4"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 10,
            "CON": 14,
            "INT": 6,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The troglodyte makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Claw. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) slashing damage.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=troglodyte",
        "imageUrl": "https://www.aidedd.org/dnd/images/troglodyte.jpg"
    },
    "nycaloth": {
        "id": "nycaloth",
        "name": "Nycaloth",
        "type": "fiend",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 123,
            "dice": "13d10+52"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 11,
            "CON": 19,
            "INT": 12,
            "WIS": 10,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The nycaloth makes two melee attacks, or it makes one melee attack and teleports before or after the attack.Claw. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage. If the target is a creature, it must succeed on a DC 16 Constitution saving throw or take 5 (2d4) slashing damage at the start of each of its turns due to a fiendish wound. Each tim",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "Intimidation +6, Perception +4, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=nycaloth",
        "imageUrl": "https://www.aidedd.org/dnd/images/nycaloth.jpg"
    },
    "bandit": {
        "id": "bandit",
        "name": "Bandit",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 12,
            "CON": 12,
            "INT": 10,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Scimitar. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.Light Crossbow. Ranged Weapon Attack: +3 to hit, range 80 ft./320 ft., one target. Hit: 5 (1d8 + 1) piercing damage.Bandits rove in gangs and are sometimes led by thugs, veterans, or spellcasters. Not all bandits are evil. Oppression, drought, disease, or famine can often drive otherwise honest folk",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bandit",
        "imageUrl": "https://www.aidedd.org/dnd/images/bandit.jpg"
    },
    "ochre_jelly": {
        "id": "ochre_jelly",
        "name": "Ochre Jelly",
        "type": "ooze",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 6,
            "CON": 14,
            "INT": 2,
            "WIS": 6,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Pseudopod. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) bludgeoning damage plus 3 (1d6) acid damage.ReactionsSplit. When a jelly that is Medium or larger is subjected to lightning or slashing damage, it splits into two new jellies if it has at least 10 hit points. Each new jelly has hit points equal to half the original jelly's, rounded down. New jellies are one size s",
        "speedStr": "10 ft., climb 10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ochre-jelly",
        "imageUrl": "https://www.aidedd.org/dnd/images/ochre-jelly.jpg",
        "resistances": [
            "acid"
        ],
        "immunities": [
            "lightning",
            "slashing"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "blinded",
            "exhaustion",
            "frightened",
            "prone"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "octopus": {
        "id": "octopus",
        "name": "Octopus",
        "type": "beast",
        "size": "small",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 3,
            "dice": "1d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 4,
            "DEX": 15,
            "CON": 11,
            "INT": 3,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "5 ft., swim 30 ft.",
        "skill": "Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=octopus",
        "imageUrl": "https://www.aidedd.org/dnd/images/octopus.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "ogre": {
        "id": "ogre",
        "name": "Ogre",
        "type": "giant",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 59,
            "dice": "7d10+21"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 8,
            "CON": 16,
            "INT": 5,
            "WIS": 7,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Greatclub. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.Javelin. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 11 (2d6 + 4) piercing damage.Ogres are hulking giants notorious for their quick tempers. When its rage is incited, an ogre lashes out in a frustrated tantrum until it runs out of objects or crea",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ogre",
        "imageUrl": "https://www.aidedd.org/dnd/images/ogre.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "ogre_zombie": {
        "id": "ogre_zombie",
        "name": "Ogre Zombie",
        "type": "undead",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 85,
            "dice": "9d10+36"
        },
        "ac": 8,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 6,
            "CON": 18,
            "INT": 3,
            "WIS": 6,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Morningstar. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=ogre-zombie",
        "imageUrl": "https://www.aidedd.org/dnd/images/ogre-zombie.jpg",
        "saves": {
            "WIS": 0
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "oni": {
        "id": "oni",
        "name": "Oni",
        "type": "giant",
        "size": "large",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 110,
            "dice": "13d10+39"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 11,
            "CON": 16,
            "INT": 14,
            "WIS": 12,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The oni makes two attacks, either with its claws or its glaive.Claw (Oni Form Only). Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage.Glaive. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) slashing damage, or 9 (1d10 + 4) slashing damage in Small or Medium form.Change Shape. The oni magically polymorphs into a Smal",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Arcana +5, Deception +8, Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=oni",
        "imageUrl": "https://www.aidedd.org/dnd/images/oni.jpg",
        "saves": {
            "DEX": 3,
            "CON": 6,
            "WIS": 4,
            "CHA": 5
        },
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "boar": {
        "id": "boar",
        "name": "Boar",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 11,
            "CON": 12,
            "INT": 2,
            "WIS": 9,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=boar",
        "imageUrl": "https://www.aidedd.org/dnd/images/boar.jpg"
    },
    "orc_eye_of_gruumsh": {
        "id": "orc_eye_of_gruumsh",
        "name": "Orc Eye Of Gruumsh",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d8+18"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 16,
            "INT": 9,
            "WIS": 13,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spear. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 11 (1d6 + 3 plus 1d8) piercing damage, or 12 (2d8 + 3) piercing damage if used with two hands to make a melee attack.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "Intimidation +3, Religion +1",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=orc-eye-of-gruumsh",
        "imageUrl": "https://www.aidedd.org/dnd/images/orc-eye-of-gruumsh.jpg"
    },
    "orcus": {
        "id": "orcus",
        "name": "Orcus",
        "type": "fiend",
        "size": "huge",
        "cr": 26,
        "xp": 90000,
        "hp": {
            "base": 405,
            "dice": "30d12+210"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 14,
            "CON": 25,
            "INT": 20,
            "WIS": 20,
            "CHA": 25
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 14,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. Orcus makes three Wand of Orcus, Tail, or Necrotic Bolt attacks.Wand of Orcus. Melee Weapon Attack: +19 to hit, reach 10 ft., one target. Hit: 24 (3d8 + 11) bludgeoning damage plus 13 (2d12) necrotic damage.Tail. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 21 (3d8 + 8) force damage plus 9 (2d8) poison damage.Necrotic Bolt. Ranged Spell Attack: +15 to hit, range 120",
        "speedStr": "40 ft., fly 40 ft.",
        "skill": "Arcana +12, Perception +12",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=orcus",
        "imageUrl": "https://www.aidedd.org/dnd/images/orcus.jpg"
    },
    "orog": {
        "id": "orog",
        "name": "Orog",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 42,
            "dice": "5d8+20"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 12,
            "CON": 18,
            "INT": 12,
            "WIS": 11,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The orog makes two greataxe attacks.Greataxe. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) slashing damage.Javelin. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 7 (1d6 + 4) piercing damage.Monster Manual (BR+)",
        "speedStr": "30 ft.",
        "skill": "Intimidation +5, Survival +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=orog",
        "imageUrl": "https://www.aidedd.org/dnd/images/orog.jpg"
    },
    "otyugh": {
        "id": "otyugh",
        "name": "Otyugh",
        "type": "aberration",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 114,
            "dice": "12d10+48"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 11,
            "CON": 19,
            "INT": 6,
            "WIS": 13,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The otyugh makes three attacks: one with its bite and two with its tentacles.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 12 (2d8 + 3) piercing damage. If the target is a creature, it must succeed on a DC 15 Constitution saving throw against disease or become poisoned until the disease is cured. Every 24 hours that elapse, the target must repeat the saving throw",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=otyugh",
        "imageUrl": "https://www.aidedd.org/dnd/images/otyugh.jpg",
        "saves": {
            "CON": 7
        },
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "owl": {
        "id": "owl",
        "name": "Owl",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 13,
            "CON": 8,
            "INT": 2,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "5 ft., fly 60 ft.",
        "skill": "Perception +3, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=owl",
        "imageUrl": "https://www.aidedd.org/dnd/images/owl.jpg",
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "owlbear": {
        "id": "owlbear",
        "name": "Owlbear",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 59,
            "dice": "7d10+21"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 12,
            "CON": 17,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The owlbear makes two attacks: one with its beak and one with its claws.Beak. Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 10 (1d10 + 5) piercing damage.Claws. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.A monstrous cross between giant owl and bear, an owlbear's reputation for ferocity and aggression makes it one of the",
        "speedStr": "40 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=owlbear",
        "imageUrl": "https://www.aidedd.org/dnd/images/owlbear.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "bullywug": {
        "id": "bullywug",
        "name": "Bullywug",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 12,
            "CON": 13,
            "INT": 7,
            "WIS": 10,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The bullywug makes two melee attacks: one with its bite and one with its spear.Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning damage.Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.Monst",
        "speedStr": "20 ft., swim 40 ft.",
        "skill": "Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=bullywug",
        "imageUrl": "https://www.aidedd.org/dnd/images/bullywug.jpg"
    },
    "pegasus": {
        "id": "pegasus",
        "name": "Pegasus",
        "type": "celestial",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 59,
            "dice": "7d10+21"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 10,
            "WIS": 15,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.The white winged horses known as pegasi soar through the skies, a vision of grace and majesty.Monster Manual (SRD)",
        "speedStr": "60 ft., fly 90 ft.",
        "skill": "Perception +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=pegasus",
        "imageUrl": "https://www.aidedd.org/dnd/images/pegasus.jpg",
        "saves": {
            "DEX": 4,
            "WIS": 4,
            "CHA": 3
        }
    },
    "peryton": {
        "id": "peryton",
        "name": "Peryton",
        "type": "monstrosity",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 33,
            "dice": "6d8+6"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 13,
            "INT": 9,
            "WIS": 12,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The peryton makes one gore attack and one talon attack.Gore. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.Talons. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) piercing damage.Monster Manual (BR+)",
        "speedStr": "20 ft., fly 60 ft.",
        "skill": "Perception +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=peryton",
        "imageUrl": "https://www.aidedd.org/dnd/images/peryton.jpg"
    },
    "phase_spider": {
        "id": "phase_spider",
        "name": "Phase Spider",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 32,
            "dice": "5d10+5"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 15,
            "CON": 12,
            "INT": 6,
            "WIS": 10,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 18 (4d8) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paral",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=phase-spider",
        "imageUrl": "https://www.aidedd.org/dnd/images/phase-spider.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "dolphin": {
        "id": "dolphin",
        "name": "Dolphin",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 13,
            "CON": 13,
            "INT": 6,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Slam. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage. If the dolphin moved at least 30 feet straight toward the target immediately before the hit, the target takes an extra 3 (1d6) bludgeoning damage.Monsters of the Multiverse",
        "speedStr": "0 ft., swim 60 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=dolphin",
        "imageUrl": "https://www.aidedd.org/dnd/images/dolphin.jpg"
    },
    "pit_fiend": {
        "id": "pit_fiend",
        "name": "Pit Fiend",
        "type": "fiend",
        "size": "large",
        "cr": 20,
        "xp": 25000,
        "hp": {
            "base": 300,
            "dice": "24d10+168"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 14,
            "CON": 24,
            "INT": 22,
            "WIS": 18,
            "CHA": 24
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The pit fiend makes four attacks: one with its bite, one with its claw, one with its mace, and one with its tail.Bite. Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 22 (4d6 + 8) piercing damage. The target must succeed on a DC 21 Constitution saving throw or become poisoned. While poisoned in this way, the target can't regain hit points, and it takes 21 (6d6) poison d",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=pit-fiend",
        "imageUrl": "https://www.aidedd.org/dnd/images/pit-fiend.jpg",
        "saves": {
            "DEX": 8,
            "CON": 13,
            "WIS": 10
        },
        "resistances": [
            "cold",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "planetar": {
        "id": "planetar",
        "name": "Planetar",
        "type": "celestial",
        "size": "large",
        "cr": 16,
        "xp": 15000,
        "hp": {
            "base": 200,
            "dice": "16d10+112"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 24,
            "DEX": 20,
            "CON": 24,
            "INT": 19,
            "WIS": 22,
            "CHA": 25
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 11,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The planetar makes two melee attacks.Greatsword. Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 21 (4d6 + 7) slashing damage plus 22 (5d8) radiant damage.Healing Touch (4/Day). The planetar touches another creature. The target magically regains 30 (6d8 + 3) hit points and is freed from any curse, disease, poison, blindness, or deafness.Monster Manual (SRD)",
        "speedStr": "40 ft., fly 120 ft.",
        "skill": "Perception +11",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=planetar",
        "imageUrl": "https://www.aidedd.org/dnd/images/planetar.jpg",
        "saves": {
            "CON": 12,
            "WIS": 11,
            "CHA": 12
        },
        "resistances": [
            "radiant",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened"
        ],
        "senses": [
            "truesight 120 ft."
        ]
    },
    "plesiosaurus": {
        "id": "plesiosaurus",
        "name": "Plesiosaurus",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 68,
            "dice": "8d10+24"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 15,
            "CON": 16,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 14 (3d6 + 4) piercing damage.This predatory marine reptile and cousin to the dinosaurs attacks any creature it encounters. Its long, flexible neck lets it twist in any direction to deliver a powerful bite.Monster Manual (SRD)",
        "speedStr": "20 ft., swim 40 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=plesiosaurus",
        "imageUrl": "https://www.aidedd.org/dnd/images/plesiosaurus.jpg"
    },
    "giant_poisonous_snake": {
        "id": "giant_poisonous_snake",
        "name": "Giant Poisonous Snake",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 18,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 6 (1d4 + 4) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-poisonous-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-poisonous-snake.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "polar_bear": {
        "id": "polar_bear",
        "name": "Polar Bear",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 42,
            "dice": "5d10+15"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 10,
            "CON": 16,
            "INT": 2,
            "WIS": 13,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The bear makes two attacks: one with its bite and one with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (1d8 + 5) piercing damage.Claws. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft., swim 30 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=polar-bear",
        "imageUrl": "https://www.aidedd.org/dnd/images/polar-bear.jpg"
    },
    "giant_wolf_spider": {
        "id": "giant_wolf_spider",
        "name": "Giant Wolf Spider",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 16,
            "CON": 13,
            "INT": 3,
            "WIS": 12,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 7 (2d6) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyz",
        "speedStr": "40 ft., climb 40 ft.",
        "skill": "Perception +3, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-wolf-spider",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-wolf-spider.jpg",
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "priest": {
        "id": "priest",
        "name": "Priest",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 10,
            "CON": 12,
            "INT": 13,
            "WIS": 16,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Mace. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) bludgeoning damage.Priests bring the teachings of their gods to the common folk. They are the spiritual leaders of temples and shrines and often hold positions of influence in their communities. Evil priests might work openly under a tyrant, or they might be the leaders of religious sects hidden in the shadows of good soci",
        "speedStr": "30 ft.",
        "skill": "Medicine +7, Persuasion +3, Religion +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=priest",
        "imageUrl": "https://www.aidedd.org/dnd/images/priest.jpg"
    },
    "grimlock": {
        "id": "grimlock",
        "name": "Grimlock",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 12,
            "CON": 12,
            "INT": 9,
            "WIS": 8,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spiked Bone Club. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) bludgeoning damage plus 2 (1d4) piercing damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Athletics +5, Perception +3, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=grimlock",
        "imageUrl": "https://www.aidedd.org/dnd/images/grimlock.jpg",
        "conditionImmunities": [
            "blinded"
        ],
        "senses": [
            "blindsight 30 ft. or 10 ft. while deafened (blind beyond this radius)"
        ]
    },
    "purple_worm": {
        "id": "purple_worm",
        "name": "Purple Worm",
        "type": "monstrosity",
        "size": "gargantuan",
        "cr": 15,
        "xp": 13000,
        "hp": {
            "base": 247,
            "dice": "15d20+90"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 28,
            "DEX": 7,
            "CON": 22,
            "INT": 1,
            "WIS": 8,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The worm makes two attacks: one with its bite and one with its stinger.Bite. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 22 (3d8 + 9) piercing damage. If the target is a Large or smaller creature, it must succeed on a DC 19 Dexterity saving throw or be swallowed by the worm. A swallowed creature is blinded and restrained, it has total cover against attacks and othe",
        "speedStr": "50 ft., burrow 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=purple-worm",
        "imageUrl": "https://www.aidedd.org/dnd/images/purple-worm.jpg",
        "saves": {
            "CON": 11,
            "WIS": 4
        },
        "senses": [
            "blindsight 30 ft.",
            "tremorsense 60 ft."
        ]
    },
    "quasit": {
        "id": "quasit",
        "name": "Quasit",
        "type": "fiend",
        "size": "tiny",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 7,
            "dice": "3d4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 17,
            "CON": 10,
            "INT": 7,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws (Bite in Beast Form). Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must succeed on a DC 10 Constitution saving throw or take 5 (2d4) poison damage and become poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.Scare (1/Day). One creature of the quas",
        "speedStr": "40 ft.",
        "skill": "Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=quasit",
        "imageUrl": "https://www.aidedd.org/dnd/images/quasit.jpg",
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "quetzalcoatlus": {
        "id": "quetzalcoatlus",
        "name": "Quetzalcoatlus",
        "type": "beast",
        "size": "huge",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 30,
            "dice": "4d12+4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 13,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 10 ft., one creature. Hit: 12 (3d6 + 2) piercing damage. If the quetzalcoatlus flew least 30 feet toward the target immediately before the hit, the target takes an extra 10 (3d6) piercing damage.Monsters of the Multiverse",
        "speedStr": "10 ft., fly 80 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=quetzalcoatlus",
        "imageUrl": "https://www.aidedd.org/dnd/images/quetzalcoatlus.jpg"
    },
    "quipper": {
        "id": "quipper",
        "name": "Quipper",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 16,
            "CON": 9,
            "INT": 1,
            "WIS": 7,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage.A quipper is a carnivorous fish with sharp teeth.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=quipper",
        "imageUrl": "https://www.aidedd.org/dnd/images/quipper.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "rakshasa": {
        "id": "rakshasa",
        "name": "Rakshasa",
        "type": "fiend",
        "size": "medium",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 110,
            "dice": "13d8+52"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 17,
            "CON": 18,
            "INT": 13,
            "WIS": 16,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The rakshasa makes two claw attacks.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage, and the target is cursed if it is a creature. The magical curse takes effect whenever the target takes a short or long rest, filling the target's thoughts with horrible images and dreams. The cursed target gains no benefit from finishing a short or long",
        "speedStr": "40 ft.",
        "skill": "Deception +10, Insight +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=rakshasa",
        "imageUrl": "https://www.aidedd.org/dnd/images/rakshasa.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "vulnerabilities": [
            "piercing"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "rat": {
        "id": "rat",
        "name": "Rat",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 11,
            "CON": 9,
            "INT": 2,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=rat",
        "imageUrl": "https://www.aidedd.org/dnd/images/rat.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "raven": {
        "id": "raven",
        "name": "Raven",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 14,
            "CON": 8,
            "INT": 2,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=raven",
        "imageUrl": "https://www.aidedd.org/dnd/images/raven.jpg"
    },
    "red_dragon_wyrmling": {
        "id": "red_dragon_wyrmling",
        "name": "Red Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 75,
            "dice": "10d8+30"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 17,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage plus 3 (1d6) fire damage.Fire Breath (Recharge 5-6). The dragon exhales fire in a 15-foot cone. Each creature in that area must make a DC 13 Dexterity saving throw, taking 24 (7d6) fire damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., climb 30 ft., fly 60 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=red-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/red-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 5,
            "WIS": 2,
            "CHA": 4
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "guard": {
        "id": "guard",
        "name": "Guard",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 12,
            "CON": 12,
            "INT": 10,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.Guards include members of a city watch, sentries in a citadel or fortified town, and the bodyguards of merchants and nobles.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=guard",
        "imageUrl": "https://www.aidedd.org/dnd/images/guard.jpg"
    },
    "remorhaz": {
        "id": "remorhaz",
        "name": "Remorhaz",
        "type": "monstrosity",
        "size": "huge",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 195,
            "dice": "17d12+85"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 24,
            "DEX": 13,
            "CON": 21,
            "INT": 4,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 40 (6d10 + 7) piercing damage plus 10 (3d6) fire damage. If the target is a creature, it is grappled (escape DC 17). Until this grapple ends, the target is restrained, and the remorhaz can't bite another target.Swallow. The remorhaz makes one bite attack against a Medium or smaller creature it is grappling. If the attack hits, t",
        "speedStr": "30 ft., burrow 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=remorhaz",
        "imageUrl": "https://www.aidedd.org/dnd/images/remorhaz.jpg",
        "immunities": [
            "cold",
            "fire"
        ],
        "senses": [
            "darkvision 60 ft.",
            "tremorsense 60 ft."
        ]
    },
    "revenant": {
        "id": "revenant",
        "name": "Revenant",
        "type": "undead",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 136,
            "dice": "16d8+64"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 18,
            "INT": 13,
            "WIS": 16,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The revenant makes two fist attacks.Fist. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage. If the target is a creature against which the revenant has sworn vengeance, the target takes an extra 14 (4d6) bludgeoning damage. Instead of dealing damage, the revenant can grapple the target (escape DC 14) provided the target is Large or smaller.V",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=revenant",
        "imageUrl": "https://www.aidedd.org/dnd/images/revenant.jpg"
    },
    "rhinoceros": {
        "id": "rhinoceros",
        "name": "Rhinoceros",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d10+12"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 8,
            "CON": 15,
            "INT": 2,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=rhinoceros",
        "imageUrl": "https://www.aidedd.org/dnd/images/rhinoceros.jpg"
    },
    "hobgoblin": {
        "id": "hobgoblin",
        "name": "Hobgoblin",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 12,
            "CON": 12,
            "INT": 10,
            "WIS": 10,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=hobgoblin",
        "imageUrl": "https://www.aidedd.org/dnd/images/hobgoblin.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "roc": {
        "id": "roc",
        "name": "Roc",
        "type": "monstrosity",
        "size": "gargantuan",
        "cr": 11,
        "xp": 7200,
        "hp": {
            "base": 248,
            "dice": "16d20+80"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 28,
            "DEX": 10,
            "CON": 20,
            "INT": 3,
            "WIS": 10,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 11,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The roc makes two attacks: one with its beak and one with its talons.Beak. Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 27 (4d8 + 9) piercing damage.Talons. Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 23 (4d6 + 9) slashing damage, and the target is grappled (escape DC 19). Until this grapple ends, the target is restrained, and the roc can't use it",
        "speedStr": "20 ft., fly 120 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=roc",
        "imageUrl": "https://www.aidedd.org/dnd/images/roc.jpg",
        "saves": {
            "DEX": 4,
            "CON": 9,
            "WIS": 4,
            "CHA": 3
        }
    },
    "roper": {
        "id": "roper",
        "name": "Roper",
        "type": "monstrosity",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 93,
            "dice": "11d10+33"
        },
        "ac": 20,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 8,
            "CON": 17,
            "INT": 7,
            "WIS": 16,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The roper makes four attacks with its tendrils, uses Reel, and makes one attack with its bite.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 22 (4d8 + 4) piercing damage.Tendril. Melee Weapon Attack: +7 to hit, reach 50 ft., one creature. Hit: The target is grappled (escape DC 15). Until the grapple ends, the target is restrained and has disadvantage on Strength c",
        "speedStr": "10 ft., climb 10 ft.",
        "skill": "Perception +6, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=roper",
        "imageUrl": "https://www.aidedd.org/dnd/images/roper.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "rug_of_smothering": {
        "id": "rug_of_smothering",
        "name": "Rug Of Smothering",
        "type": "construct",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 33,
            "dice": "6d10"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 14,
            "CON": 10,
            "INT": 1,
            "WIS": 3,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Smother. Melee Weapon Attack: +5 to hit, reach 5 ft., one Medium or smaller creature. Hit: The creature is grappled (escape DC 13). Until this grapple ends, the target is restrained, blinded, and at risk of suffocating, and the rug can't smother another target. In addition, at the start of each of the target's turns, the target takes 10 (2d6 + 3) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=rug-of-smothering",
        "imageUrl": "https://www.aidedd.org/dnd/images/rug-of-smothering.jpg",
        "immunities": [
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "blinded",
            "charmed",
            "blinded",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "merfolk": {
        "id": "merfolk",
        "name": "Merfolk",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 13,
            "CON": 12,
            "INT": 11,
            "WIS": 11,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spear. Melee or Ranged Weapon Attack: +2 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 3 (1d6) piercing damage, or 4 (1d8) piercing damage if used with two hands to make a melee attack.Merfolk are aquatic humanoids with the lower body of a fish. They live in small tribes beneath the waves.Monster Manual (SRD)",
        "speedStr": "10 ft., swim 40 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=merfolk",
        "imageUrl": "https://www.aidedd.org/dnd/images/merfolk.jpg"
    },
    "saber_toothed_tiger": {
        "id": "saber_toothed_tiger",
        "name": "Saber Toothed Tiger",
        "type": "beast",
        "size": "large",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 52,
            "dice": "7d10+14"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 15,
            "INT": 3,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (1d10 + 5) piercing damage.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=saber-toothed-tiger",
        "imageUrl": "https://www.aidedd.org/dnd/images/saber-toothed-tiger.jpg"
    },
    "mule": {
        "id": "mule",
        "name": "Mule",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 10,
            "CON": 13,
            "INT": 2,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mule",
        "imageUrl": "https://www.aidedd.org/dnd/images/mule.jpg"
    },
    "salamander": {
        "id": "salamander",
        "name": "Salamander",
        "type": "elemental",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 90,
            "dice": "12d10+24"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 15,
            "INT": 11,
            "WIS": 10,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The salamander makes two attacks: one with its spear and one with its tail.Spear. Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. or range 20 ft./60 ft., one target. Hit: 11 (2d6 + 4) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack, plus 3 (1d6) fire damage.Tail. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 11 (2d6",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=salamander",
        "imageUrl": "https://www.aidedd.org/dnd/images/salamander.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire"
        ],
        "vulnerabilities": [
            "cold"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "scorpion": {
        "id": "scorpion",
        "name": "Scorpion",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 11,
            "CON": 8,
            "INT": 1,
            "WIS": 8,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Sting. Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must make a DC 9 Constitution saving throw, taking 4 (1d8) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "10 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=scorpion",
        "imageUrl": "https://www.aidedd.org/dnd/images/scorpion.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "sea_hag": {
        "id": "sea_hag",
        "name": "Sea Hag",
        "type": "fey",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 52,
            "dice": "7d8+21"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 13,
            "CON": 16,
            "INT": 12,
            "WIS": 12,
            "CHA": 13
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.Death Glare. The hag targets one frightened creature she can see within 30 feet of her. If the target can see the hag, it must succeed on a DC 11 Wisdom saving throw against this magic or drop to 0 hit points.Illusory Appearance. The hag covers herself and anything she is wearing or carrying with a ma",
        "speedStr": "30 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=sea-hag",
        "imageUrl": "https://www.aidedd.org/dnd/images/sea-hag.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "sea_horse": {
        "id": "sea_horse",
        "name": "Sea Horse",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 0,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 12,
            "CON": 8,
            "INT": 1,
            "WIS": 10,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., swim 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=sea-horse",
        "imageUrl": "https://www.aidedd.org/dnd/images/sea-horse.jpg"
    },
    "shadow_demon": {
        "id": "shadow_demon",
        "name": "Shadow Demon",
        "type": "fiend",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 66,
            "dice": "12d8+12"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 17,
            "CON": 12,
            "INT": 14,
            "WIS": 13,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 10 (2d6 + 3) psychic damage or, if the demon had advantage on the attack roll, 17 (4d6 + 3) psychic damage.Monster Manual (BR+)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=shadow-demon",
        "imageUrl": "https://www.aidedd.org/dnd/images/shadow-demon.jpg"
    },
    "shambling_mound": {
        "id": "shambling_mound",
        "name": "Shambling Mound",
        "type": "plant",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 136,
            "dice": "16d10+48"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 8,
            "CON": 16,
            "INT": 5,
            "WIS": 10,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The shambling mound makes two slam attacks. If both attacks hit a Medium or smaller target, the target is grappled (escape DC 14), and the shambling mound uses its Engulf on it.Slam. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.Engulf. The shambling mound engulfs a Medium or smaller creature grappled by it. The engulfed target is blinde",
        "speedStr": "20 ft., swim 20 ft.",
        "skill": "Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=shambling-mound",
        "imageUrl": "https://www.aidedd.org/dnd/images/shambling-mound.jpg",
        "resistances": [
            "cold",
            "fire"
        ],
        "immunities": [
            "lightning"
        ],
        "conditionImmunities": [
            "blinded",
            "blinded",
            "exhaustion"
        ],
        "senses": [
            "blindsight 60 ft. (blind beyond this radius)"
        ]
    },
    "shield_guardian": {
        "id": "shield_guardian",
        "name": "Shield Guardian",
        "type": "construct",
        "size": "large",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 142,
            "dice": "15d10+60"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 8,
            "CON": 18,
            "INT": 7,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The guardian makes two fist attacks.Fist. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.ReactionsShield. When a creature makes an attack against the wearer of the guardian's amulet, the guardian grants a +2 bonus to the wearer's AC if the guardian is within 5 feet of the wearer.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=shield-guardian",
        "imageUrl": "https://www.aidedd.org/dnd/images/shield-guardian.jpg",
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "shrieker": {
        "id": "shrieker",
        "name": "Shrieker",
        "type": "plant",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 13,
            "dice": "3d8"
        },
        "ac": 5,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 1,
            "CON": 10,
            "INT": 1,
            "WIS": 3,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Shriek. When bright light or a creature is within 30 feet of the shrieker, it emits a shriek audible within 300 feet of it. The shrieker continues to shriek until the disturbance moves out of range and for 1d4 of the shrieker's turns afterward.Monster Manual (SRD)",
        "speedStr": "0 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=shrieker",
        "imageUrl": "https://www.aidedd.org/dnd/images/shrieker.jpg",
        "conditionImmunities": [
            "blinded",
            "blinded",
            "frightened"
        ],
        "senses": [
            "blindsight 30 ft. (blind beyond this radius)"
        ]
    },
    "sibriex": {
        "id": "sibriex",
        "name": "Sibriex",
        "type": "fiend",
        "size": "huge",
        "cr": 18,
        "xp": 20000,
        "hp": {
            "base": 150,
            "dice": "12d12+72"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 3,
            "CON": 23,
            "INT": 25,
            "WIS": 24,
            "CHA": 25
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The sibriex makes three Chain attacks, and it uses Squirt Bile.Chain. Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 20 (2d12 + 7) force damage.Spellcasting. The sibriex casts one of the following spells, requiring no material components and using Charisma as the spellcasting ability (spell save DC 21):At will: command, dispel magic, hold monster1/day: feeblemindSquir",
        "speedStr": "0 ft., fly 20 ft. (hover)",
        "skill": "Arcana +13, History +13, Perception +13",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=sibriex",
        "imageUrl": "https://www.aidedd.org/dnd/images/sibriex.jpg"
    },
    "silver_dragon_wyrmling": {
        "id": "silver_dragon_wyrmling",
        "name": "Silver Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 45,
            "dice": "6d8+18"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 17,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Cold Breath. The dragon exhales an icy blast in a 15-foot cone. Each creature in that area must make a DC 13 Constitution saving throw, taking 18 (4d8) cold damage on a failed save, or half as much damage on a successful",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=silver-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/silver-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 5,
            "WIS": 2,
            "CHA": 4
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "pony": {
        "id": "pony",
        "name": "Pony",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 10,
            "CON": 13,
            "INT": 2,
            "WIS": 11,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Hooves. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) bludgeoning damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=pony",
        "imageUrl": "https://www.aidedd.org/dnd/images/pony.jpg"
    },
    "tribal_warrior": {
        "id": "tribal_warrior",
        "name": "Tribal Warrior",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 11,
            "CON": 12,
            "INT": 8,
            "WIS": 11,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Spear. Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.Tribal warriors live beyond civilization, most often subsisting on fishing and hunting. Each tribe acts in accordance with the wishes of its chief, who is the greatest or oldest warrior of the tri",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=tribal-warrior",
        "imageUrl": "https://www.aidedd.org/dnd/images/tribal-warrior.jpg"
    },
    "slithering_tracker": {
        "id": "slithering_tracker",
        "name": "Slithering Tracker",
        "type": "ooze",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 19,
            "CON": 15,
            "INT": 10,
            "WIS": 14,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Slam.Life Leech.Bonus actionsWatery Stealth.Monsters of the Multiverse",
        "speedStr": "30 ft., climb 30 ft., swim 30 ft.",
        "skill": "Stealth +8, Survival +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=slithering-tracker",
        "imageUrl": "https://www.aidedd.org/dnd/images/slithering-tracker.jpg"
    },
    "wolf": {
        "id": "wolf",
        "name": "Wolf",
        "type": "beast",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 11,
            "dice": "2d8+2"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 12,
            "DEX": 15,
            "CON": 12,
            "INT": 3,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wolf",
        "imageUrl": "https://www.aidedd.org/dnd/images/wolf.jpg"
    },
    "solar": {
        "id": "solar",
        "name": "Solar",
        "type": "celestial",
        "size": "large",
        "cr": 21,
        "xp": 33000,
        "hp": {
            "base": 243,
            "dice": "18d10+144"
        },
        "ac": 21,
        "speed": 30,
        "stats": {
            "STR": 26,
            "DEX": 22,
            "CON": 26,
            "INT": 25,
            "WIS": 25,
            "CHA": 30
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 13,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The solar makes two greatsword attacks.Greatsword. Melee Weapon Attack: +15 to hit, reach 5 ft., one target. Hit: 22 (4d6 + 8) slashing damage plus 27 (6d8) radiant damage.Slaying Longbow. Ranged Weapon Attack: +13 to hit, range 150/600 ft., one target. Hit: 15 (2d8 + 6) piercing damage plus 27 (6d8) radiant damage. If the target is a creature that has 100 hit points or fewer, it must",
        "speedStr": "50 ft., fly 150 ft.",
        "skill": "Perception +14",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=solar",
        "imageUrl": "https://www.aidedd.org/dnd/images/solar.jpg",
        "saves": {
            "INT": 14,
            "WIS": 14,
            "CHA": 17
        },
        "resistances": [
            "radiant",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "poisoned"
        ],
        "senses": [
            "truesight 120 ft."
        ],
        "legendaryActions": 3
    },
    "spectator": {
        "id": "spectator",
        "name": "Spectator",
        "type": "aberration",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 39,
            "dice": "6d8+12"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 14,
            "CON": 14,
            "INT": 13,
            "WIS": 14,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 2 (1d6 - 1) piercing damage.Eye Rays. The spectator shoots up to two of the following magical eye rays at one or two creatures it can see within 90 feet of it. It can use each ray only once on a turn. 1- Confusion Ray. The target must succeed on a DC 13 Wisdom saving throw, or it can't take reactions until the end of its next turn",
        "speedStr": "0 ft., fly 30 ft. (hover)",
        "skill": "Perception +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=spectator",
        "imageUrl": "https://www.aidedd.org/dnd/images/spectator.jpg"
    },
    "specter": {
        "id": "specter",
        "name": "Specter",
        "type": "undead",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 22,
            "dice": "5d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 14,
            "CON": 11,
            "INT": 10,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., fly 50 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=specter",
        "imageUrl": "https://www.aidedd.org/dnd/images/specter.jpg",
        "resistances": [
            "acid",
            "cold",
            "fire",
            "lightning",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "spider": {
        "id": "spider",
        "name": "Spider",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 14,
            "CON": 8,
            "INT": 1,
            "WIS": 10,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must succeed on a DC 9 Constitution saving throw or take 2 (1d4) poison damage.Monster Manual (SRD)",
        "speedStr": "20 ft., climb 20 ft.",
        "skill": "Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=spider",
        "imageUrl": "https://www.aidedd.org/dnd/images/spider.jpg",
        "senses": [
            "darkvision 30 ft."
        ]
    },
    "spirit_naga": {
        "id": "spirit_naga",
        "name": "Spirit Naga",
        "type": "monstrosity",
        "size": "large",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 75,
            "dice": "10d10+20"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 17,
            "CON": 14,
            "INT": 16,
            "WIS": 15,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 7 (1d6 + 4) piercing damage, and the target must make a DC 13 Constitution saving throw, taking 31 (7d8) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=spirit-naga",
        "imageUrl": "https://www.aidedd.org/dnd/images/spirit-naga.jpg",
        "saves": {
            "DEX": 6,
            "CON": 5,
            "WIS": 5,
            "CHA": 6
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "spy": {
        "id": "spy",
        "name": "Spy",
        "type": "humanoid",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 27,
            "dice": "6d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 15,
            "CON": 10,
            "INT": 12,
            "WIS": 14,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The spy makes two melee attacks.Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Hand Crossbow. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Rulers, nobles, merchants, guildmasters, and other wealthy individuals use spies to gain the upper hand in a world of cutthroat politics. A sp",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Insight +4, Investigation +5, Perception +6, Persuasion +5, Sleight of Hand +4, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=spy",
        "imageUrl": "https://www.aidedd.org/dnd/images/spy.jpg"
    },
    "acolyte": {
        "id": "acolyte",
        "name": "Acolyte",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 9,
            "dice": "2d8"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 10,
            "CON": 10,
            "INT": 10,
            "WIS": 14,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Club. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.Acolytes are junior members of a clergy, usually answerable to a priest. They perform a variety of functions in a temple and are granted minor spellcasting power by their deities.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Medicine +4, Religion +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=acolyte",
        "imageUrl": "https://www.aidedd.org/dnd/images/acolyte.jpg"
    },
    "stone_giant": {
        "id": "stone_giant",
        "name": "Stone Giant",
        "type": "giant",
        "size": "huge",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 126,
            "dice": "11d12+55"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 15,
            "CON": 20,
            "INT": 10,
            "WIS": 12,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two greatclub attacks.Greatclub. Melee Weapon Attack: +9 to hit, reach 15 ft., one target. Hit: 19 (3d8 + 6) bludgeoning damage.Rock. Ranged Weapon Attack: +9 to hit, range 60/240 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage. If the target is a creature, it must succeed on a DC 17 Strength saving throw or be knocked prone.ReactionsRock Catching. If a rock or",
        "speedStr": "40 ft.",
        "skill": "Athletics +12, Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=stone-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/stone-giant.jpg",
        "saves": {
            "DEX": 5,
            "CON": 8,
            "WIS": 4
        },
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "stone_giant_dreamwalker": {
        "id": "stone_giant_dreamwalker",
        "name": "Stone Giant Dreamwalker",
        "type": "giant",
        "size": "huge",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 161,
            "dice": "14d12+70"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 14,
            "CON": 21,
            "INT": 10,
            "WIS": 8,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack.Greatclub.Rock.Petrifying Touch.Monsters of the Multiverse",
        "speedStr": "40 ft.",
        "skill": "Athletics +14, Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=stone-giant-dreamwalker",
        "imageUrl": "https://www.aidedd.org/dnd/images/stone-giant-dreamwalker.jpg"
    },
    "stone_golem": {
        "id": "stone_golem",
        "name": "Stone Golem",
        "type": "construct",
        "size": "large",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 178,
            "dice": "17d10+85"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 9,
            "CON": 20,
            "INT": 3,
            "WIS": 11,
            "CHA": 1
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The golem makes two slam attacks.Slam. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 19 (3d8 + 6) bludgeoning damage.Slow (Recharge 5-6). The golem targets one or more creatures it can see within 10 feet of it. Each target must make a DC 17 Wisdom saving throw against this magic. On a failed save, a target can't use reactions, its speed is halved, and it can't make mo",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=stone-golem",
        "imageUrl": "https://www.aidedd.org/dnd/images/stone-golem.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison",
            "psychic"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "frightened",
            "paralyzed",
            "petrified",
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "storm_giant": {
        "id": "storm_giant",
        "name": "Storm Giant",
        "type": "giant",
        "size": "huge",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 230,
            "dice": "20d12+100"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 29,
            "DEX": 14,
            "CON": 20,
            "INT": 16,
            "WIS": 18,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 12,
                "damage": "1d8+9",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The giant makes two greatsword attacks.Greatsword. Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 30 (6d6 + 9) slashing damage.Rock. Ranged Weapon Attack: +14 to hit, range 60/240 ft., one target. Hit: 35 (4d12 + 9) bludgeoning damage.Lightning Strike (Recharge 5-6). The giant hurls a magical lightning bolt at a point it can see within 500 feet of it. Each creature wi",
        "speedStr": "50 ft., swim 50 ft.",
        "skill": "Arcana +8, Athletics +14, History +8, Perception +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=storm-giant",
        "imageUrl": "https://www.aidedd.org/dnd/images/storm-giant.jpg",
        "saves": {
            "STR": 14,
            "CON": 10,
            "WIS": 9,
            "CHA": 9
        },
        "resistances": [
            "cold"
        ],
        "immunities": [
            "lightning",
            "thunder"
        ]
    },
    "succubus": {
        "id": "succubus",
        "name": "Succubus",
        "type": "fiend",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 66,
            "dice": "12d8+12"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 17,
            "CON": 13,
            "INT": 15,
            "WIS": 12,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claw (Fiend Form Only). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Charm. One humanoid the fiend can see within 30 feet of it must succeed on a DC 15 Wisdom saving throw or be magically charmed for 1 day. The charmed target obeys the fiend's verbal or telepathic commands. If the target suffers any harm or receives a suicidal command, it can repeat the",
        "speedStr": "30 ft., fly 60 ft.",
        "skill": "Deception +9, Insight +5, Perception +5, Persuasion +9, Stealth +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=succubus",
        "imageUrl": "https://www.aidedd.org/dnd/images/succubus.jpg",
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "poison",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "cultist": {
        "id": "cultist",
        "name": "Cultist",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 9,
            "dice": "2d8"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 12,
            "CON": 10,
            "INT": 10,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Scimitar. Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) slashing damage.Cultists swear allegiance to dark powers such as elemental princes, demon lords, or archdevils. Most conceal their loyalties to avoid being ostracized, imprisoned, or executed for their beliefs. Unlike evil acolytes, cultists often show signs of insanity in their beliefs and practices.Monster Manu",
        "speedStr": "30 ft.",
        "skill": "Deception +2, Religion +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=cultist",
        "imageUrl": "https://www.aidedd.org/dnd/images/cultist.jpg"
    },
    "swarm_of_poisonous_snakes": {
        "id": "swarm_of_poisonous_snakes",
        "name": "Swarm Of Poisonous Snakes",
        "type": "swarm",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 36,
            "dice": "8d8"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 18,
            "CON": 11,
            "INT": 1,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites. Melee Weapon Attack: +6 to hit, reach 0 ft., one creature in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer. The target must make a DC 10 Constitution saving throw, taking 14 (4d6) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-poisonous-snakes",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-poisonous-snakes.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ],
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "swarm_of_quippers": {
        "id": "swarm_of_quippers",
        "name": "Swarm Of Quippers",
        "type": "swarm",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 28,
            "dice": "8d8-8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 16,
            "CON": 9,
            "INT": 1,
            "WIS": 7,
            "CHA": 2
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bites. Melee Weapon Attack: +5 to hit, reach 0 ft., one creature in the swarm's space. Hit: 14 (4d6) piercing damage, or 7 (2d6) piercing damage if the swarm has half of its hit points or fewer.Monster Manual (SRD)",
        "speedStr": "0 ft., swim 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=swarm-of-quippers",
        "imageUrl": "https://www.aidedd.org/dnd/images/swarm-of-quippers.jpg",
        "resistances": [
            "bludgeoning",
            "piercing",
            "slashing"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "grappled",
            "paralyzed",
            "petrified",
            "prone",
            "restrained",
            "stunned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "giant_weasel": {
        "id": "giant_weasel",
        "name": "Giant Weasel",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 9,
            "dice": "2d8"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 16,
            "CON": 10,
            "INT": 4,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-weasel",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-weasel.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "magmin": {
        "id": "magmin",
        "name": "Magmin",
        "type": "elemental",
        "size": "small",
        "cr": 0.5,
        "xp": 100,
        "hp": {
            "base": 9,
            "dice": "2d6+2"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 15,
            "CON": 12,
            "INT": 8,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=magmin",
        "imageUrl": "https://www.aidedd.org/dnd/images/magmin.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "noble": {
        "id": "noble",
        "name": "Noble",
        "type": "humanoid",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 9,
            "dice": "2d8"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 12,
            "CON": 11,
            "INT": 12,
            "WIS": 14,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Parry. The noble adds 2 to its AC against one melee attack that would hit it. To do so, the noble must see the attacker and be wielding a melee weapon.Nobles wield great authority and influence as members of the upper class, possessing wealth and connections that can make them as powerful as monarchs and generals. A noble often travels in the company of guards, as well as servants who are commoner",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Insight +4, Persuasion +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=noble",
        "imageUrl": "https://www.aidedd.org/dnd/images/noble.jpg"
    },
    "tanarukk": {
        "id": "tanarukk",
        "name": "Tanarukk",
        "type": "fiend",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 95,
            "dice": "10d8+50"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 20,
            "INT": 9,
            "WIS": 9,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The tanarukk makes one Bite attack and one Greatsword attack.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.Greatsword. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Bonus actionsAggressive. The tanarukk moves up to its speed toward an enemy that it can see.ReactionsUnbridled Fury. In respons",
        "speedStr": "30 ft.",
        "skill": "Intimidation +2, Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=tanarukk",
        "imageUrl": "https://www.aidedd.org/dnd/images/tanarukk.jpg"
    },
    "tarrasque": {
        "id": "tarrasque",
        "name": "Tarrasque",
        "type": "monstrosity",
        "size": "gargantuan",
        "cr": 30,
        "xp": 155000,
        "hp": {
            "base": 676,
            "dice": "33d20+330"
        },
        "ac": 25,
        "speed": 30,
        "stats": {
            "STR": 30,
            "DEX": 11,
            "CON": 30,
            "INT": 3,
            "WIS": 11,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 17,
                "damage": "1d8+10",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The tarrasque can use its Frightful Presence. It then makes five attacks: one with its bite, two with its claws, one with its horns, and one with its tail. It can use its Swallow instead of its bite.Bite. Melee Weapon Attack: +19 to hit, reach 10 ft., one target. Hit: 36 (4d12 + 10) piercing damage. If the target is a creature, it is grappled (escape DC 20). Until this grapple ends, t",
        "speedStr": "40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=tarrasque",
        "imageUrl": "https://www.aidedd.org/dnd/images/tarrasque.jpg",
        "saves": {
            "INT": 5,
            "WIS": 9,
            "CHA": 9
        },
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "fire",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "frightened",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "blindsight 120 ft."
        ],
        "legendaryActions": 3
    },
    "tiger": {
        "id": "tiger",
        "name": "Tiger",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 37,
            "dice": "5d10+10"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 14,
            "INT": 3,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.Claw. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=tiger",
        "imageUrl": "https://www.aidedd.org/dnd/images/tiger.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "blood_hawk": {
        "id": "blood_hawk",
        "name": "Blood Hawk",
        "type": "beast",
        "size": "small",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 7,
            "dice": "2d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 14,
            "CON": 10,
            "INT": 3,
            "WIS": 14,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Taking its name from its crimson feathers and aggressive nature, the blood hawk fearlessly attacks with its daggerlike beak.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 60 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=blood-hawk",
        "imageUrl": "https://www.aidedd.org/dnd/images/blood-hawk.jpg"
    },
    "treant": {
        "id": "treant",
        "name": "Treant",
        "type": "plant",
        "size": "huge",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 138,
            "dice": "12d12+60"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 8,
            "CON": 21,
            "INT": 12,
            "WIS": 16,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The treant makes two slam attacks.Slam. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 16 (3d6 + 6) bludgeoning damage.Rock. Ranged Weapon Attack: +10 to hit, range 60/180 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.Animate Trees (1/Day). The treant magically animates one or two trees it can see within 60 feet of it. These trees have the same statistics as a",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=treant",
        "imageUrl": "https://www.aidedd.org/dnd/images/treant.jpg",
        "resistances": [
            "bludgeoning",
            "piercing"
        ],
        "vulnerabilities": [
            "fire"
        ]
    },
    "giant_rat": {
        "id": "giant_rat",
        "name": "Giant Rat",
        "type": "beast",
        "size": "small",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 7,
            "dice": "2d6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 15,
            "CON": 11,
            "INT": 2,
            "WIS": 10,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-rat",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-rat.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "triceratops": {
        "id": "triceratops",
        "name": "Triceratops",
        "type": "beast",
        "size": "huge",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 95,
            "dice": "10d12+30"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 22,
            "DEX": 9,
            "CON": 17,
            "INT": 2,
            "WIS": 11,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Gore. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 24 (4d8 + 6) piercing damage.Stomp. Melee Weapon Attack: +9 to hit, reach 5 ft., one prone creature. Hit: 22 (3d10 + 6) bludgeoning damageOne of the most aggressive of the herbivorous dinosaurs, a triceratops possesses great horns and formidable speed, which it uses to gore and trample would-be predators to death.Monster Manual (S",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=triceratops",
        "imageUrl": "https://www.aidedd.org/dnd/images/triceratops.jpg"
    },
    "goblin": {
        "id": "goblin",
        "name": "Goblin",
        "type": "humanoid",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 7,
            "dice": "2d6"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 8,
            "DEX": 14,
            "CON": 10,
            "INT": 10,
            "WIS": 8,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.Goblins are small, black-hearted humanoids that lair in despoiled dungeons and other dismal settings. Individually weak, they gather in large numbers to torment other creatures.Monster Manual (S",
        "speedStr": "30 ft.",
        "skill": "Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=goblin",
        "imageUrl": "https://www.aidedd.org/dnd/images/goblin.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "troll": {
        "id": "troll",
        "name": "Troll",
        "type": "giant",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 84,
            "dice": "8d10+40"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 20,
            "INT": 7,
            "WIS": 9,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The troll makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) piercing damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Fearsome green-skinned giants, trolls eat anything they can catch and devour. Only acid and fire can arrest the regenerati",
        "speedStr": "30 ft.",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=troll",
        "imageUrl": "https://www.aidedd.org/dnd/images/troll.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "pseudodragon": {
        "id": "pseudodragon",
        "name": "Pseudodragon",
        "type": "dragon",
        "size": "tiny",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 7,
            "dice": "2d4+2"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 15,
            "CON": 13,
            "INT": 10,
            "WIS": 12,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Sting. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or become poisoned for 1 hour. If the saving throw fails by 5 or more, the target falls unconscious for the same duration, or until it take",
        "speedStr": "15 ft., fly 60 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=pseudodragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/pseudodragon.jpg",
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "tyrannosaurus_rex": {
        "id": "tyrannosaurus_rex",
        "name": "Tyrannosaurus Rex",
        "type": "beast",
        "size": "huge",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 136,
            "dice": "13d12+52"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 25,
            "DEX": 10,
            "CON": 19,
            "INT": 2,
            "WIS": 12,
            "CHA": 9
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 9,
                "damage": "1d8+7",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The tyrannosaurus makes two attacks: one with its bite and one with its tail. It can't make both attacks against the same target.Bite. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 33 (4d12 + 7) piercing damage. If the target is a Medium or smaller creature, it is grappled (escape DC 17). Until this grapple ends, the target is restrained, and the tyrannosaurus can't",
        "speedStr": "50 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=tyrannosaurus-rex",
        "imageUrl": "https://www.aidedd.org/dnd/images/tyrannosaurus-rex.jpg"
    },
    "umber_hulk": {
        "id": "umber_hulk",
        "name": "Umber Hulk",
        "type": "monstrosity",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 93,
            "dice": "11d10+33"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 20,
            "DEX": 13,
            "CON": 16,
            "INT": 9,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "until the start of its next turn and rolls a d8 to determine what it does during that turn. On a 1 to 4, the creature does nothing. On a 5 or 6, the creature takes no action but uses all its movement to move in a random direction. On a 7 or 8, the creature makes one melee attack against a random creature, or it does nothing if no creature is within reach. Unless surprised, a creature can avert its",
        "speedStr": "30 ft., burrow 20 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=umber-hulk",
        "imageUrl": "https://www.aidedd.org/dnd/images/umber-hulk.jpg"
    },
    "unicorn": {
        "id": "unicorn",
        "name": "Unicorn",
        "type": "celestial",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 67,
            "dice": "9d10+18"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 15,
            "INT": 11,
            "WIS": 17,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The unicorn makes two attacks: one with its hooves and one with its horn.Hooves. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.Horn. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.Healing Touch (3/Day). The unicorn touches another creature with its horn. The target magically regains 11 (2d8 + 2)",
        "speedStr": "50 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=unicorn",
        "imageUrl": "https://www.aidedd.org/dnd/images/unicorn.jpg",
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "paralyzed",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ],
        "legendaryActions": 3
    },
    "vampire": {
        "id": "vampire",
        "name": "Vampire",
        "type": "undead",
        "size": "medium",
        "cr": 13,
        "xp": 10000,
        "hp": {
            "base": 144,
            "dice": "17d8+68"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 18,
            "CON": 18,
            "INT": 17,
            "WIS": 15,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": ", speak, or manipulate objects. It is weightless, has a flying speed of 20 feet, can hover, and can enter a hostile creature's space and stop there. In addition, if air can pass through a space, the mist can do so without squeezing, and it can't pass through water. It has advantage on Strength, Dexterity, and Constitution saving throws, and it is immune to all nonmagical damage, except the damage",
        "speedStr": "30 ft.",
        "skill": "Perception +7, Stealth +9",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=vampire",
        "imageUrl": "https://www.aidedd.org/dnd/images/vampire.jpg",
        "saves": {
            "DEX": 9,
            "WIS": 7,
            "CHA": 9
        },
        "resistances": [
            "necrotic",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "senses": [
            "darkvision 120 ft."
        ],
        "legendaryActions": 3
    },
    "vampire_spawn": {
        "id": "vampire_spawn",
        "name": "Vampire Spawn",
        "type": "undead",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 82,
            "dice": "11d8+33"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 16,
            "CON": 16,
            "INT": 11,
            "WIS": 10,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The vampire makes two attacks, only one of which can be a bite attack.Claws. Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 8 (2d4 + 3) slashing damage. Instead of dealing damage, the vampire can grapple the target (escape DC 13).Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one willing creature, or a creature that is grappled by the vampire, incapacitated, or re",
        "speedStr": "30 ft.",
        "skill": "Perception +3, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=vampire-spawn",
        "imageUrl": "https://www.aidedd.org/dnd/images/vampire-spawn.jpg",
        "saves": {
            "DEX": 6,
            "WIS": 3
        },
        "resistances": [
            "necrotic",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "winged_kobold": {
        "id": "winged_kobold",
        "name": "Winged Kobold",
        "type": "humanoid",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 7,
            "dice": "3d6-3"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 16,
            "CON": 9,
            "INT": 8,
            "WIS": 7,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Dagger. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage.Dropped Rock. Ranged Weapon Attack: +5 to hit, one target directly below the kobold. Hit: 6 (1d6 + 3) bludgeoning damage.Monster Manual (BR+)",
        "speedStr": "30 ft., fly 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=winged-kobold",
        "imageUrl": "https://www.aidedd.org/dnd/images/winged-kobold.jpg"
    },
    "venerable_shadow": {
        "id": "venerable_shadow",
        "name": "Venerable Shadow",
        "type": "undead",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 27,
            "dice": "5d8+5"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 16,
            "CON": 13,
            "INT": 6,
            "WIS": 12,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Strength Drain. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 12 (2d8 + 3) necrotic damage, and the target's Strength score is reduced by 1d4. The target dies if this reduces its Strength to 0. Otherwise, the reduction lasts until the target finishes a short or long rest. If a non-evil humanoid dies from this attack, a new shadow (CR 1/2) rises from the corpse 1d2 hours later.Ext",
        "speedStr": "40 ft.",
        "skill": "Stealth +5 (+7 in dim light or darkness)",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=venerable-shadow",
        "imageUrl": "https://www.aidedd.org/dnd/images/venerable-shadow.jpg"
    },
    "veteran": {
        "id": "veteran",
        "name": "Veteran",
        "type": "humanoid",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 58,
            "dice": "9d8+18"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 13,
            "CON": 14,
            "INT": 10,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The veteran makes two longsword attacks. If it has a shortsword drawn, it can also make a shortsword attack.Longsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if used with two hands.Shortsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.Heavy Crossbow. Rang",
        "speedStr": "30 ft.",
        "skill": "Athletics +5, Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=veteran",
        "imageUrl": "https://www.aidedd.org/dnd/images/veteran.jpg"
    },
    "flying_snake": {
        "id": "flying_snake",
        "name": "Flying Snake",
        "type": "beast",
        "size": "tiny",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 5,
            "dice": "2d4"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 4,
            "DEX": 18,
            "CON": 11,
            "INT": 2,
            "WIS": 12,
            "CHA": 5
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 1 piercing damage plus 7 (3d4) poison damage.A flying snake is a brightly colored, winged serpent found in remote jungles.Monster Manual (SRD)",
        "speedStr": "30 ft., fly 60 ft., swim 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=flying-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/flying-snake.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "kobold": {
        "id": "kobold",
        "name": "Kobold",
        "type": "humanoid",
        "size": "small",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 5,
            "dice": "2d6-2"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 15,
            "CON": 9,
            "INT": 8,
            "WIS": 7,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Dagger. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.Sling. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.Kobolds are craven reptilian humanoids that commonly infest dungeons. They make up for their physical ineptitude with a cleverness for trap making.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=kobold",
        "imageUrl": "https://www.aidedd.org/dnd/images/kobold.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "vrock": {
        "id": "vrock",
        "name": "Vrock",
        "type": "fiend",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 104,
            "dice": "11d10+44"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 18,
            "INT": 8,
            "WIS": 13,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The vrock makes two attacks: one with its beak and one with its talons.Beak. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.Talons. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 14 (2d10 + 3) slashing damage.Spores (Recharge 6). A 15-foot-radius cloud of toxic spores extends out from the vrock. The spores spread around corner",
        "speedStr": "40 ft., fly 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=vrock",
        "imageUrl": "https://www.aidedd.org/dnd/images/vrock.jpg",
        "saves": {
            "DEX": 5,
            "WIS": 4,
            "CHA": 2
        },
        "resistances": [
            "cold",
            "fire",
            "lightning",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "vulture": {
        "id": "vulture",
        "name": "Vulture",
        "type": "beast",
        "size": "medium",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 5,
            "dice": "1d8+1"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 7,
            "DEX": 10,
            "CON": 13,
            "INT": 2,
            "WIS": 12,
            "CHA": 4
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Beak. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) piercing damage.Monster Manual (SRD)",
        "speedStr": "10 ft., fly 50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=vulture",
        "imageUrl": "https://www.aidedd.org/dnd/images/vulture.jpg"
    },
    "mastiff": {
        "id": "mastiff",
        "name": "Mastiff",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 5,
            "dice": "1d8+1"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 14,
            "CON": 12,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.Mastiffs are impressive hounds prized by humanoids for their loyalty and keen senses.Monster Manual (SRD)",
        "speedStr": "40 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=mastiff",
        "imageUrl": "https://www.aidedd.org/dnd/images/mastiff.jpg"
    },
    "water_elemental": {
        "id": "water_elemental",
        "name": "Water Elemental",
        "type": "elemental",
        "size": "large",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 114,
            "dice": "12d10+48"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 14,
            "CON": 18,
            "INT": 5,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The elemental makes two slam attacks.Slam. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.Whelm (Recharge 4-6). Each creature in the elemental's space must make a DC 15 Strength saving throw. On a failure, a target takes 13 (2d8 + 4) bludgeoning damage. If it is Large or smaller, it is also grappled (escape DC 14). Until this grapple ends",
        "speedStr": "30 ft., swim 90 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=water-elemental",
        "imageUrl": "https://www.aidedd.org/dnd/images/water-elemental.jpg",
        "resistances": [
            "acid",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "water_weird": {
        "id": "water_weird",
        "name": "Water Weird",
        "type": "elemental",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 58,
            "dice": "9d10+9"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 16,
            "CON": 13,
            "INT": 11,
            "WIS": 10,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Constrict. Melee Weapon Attack: +5 to hit, reach 10 ft., one creature. Hit: 13 (3d6 + 3) bludgeoning damage. If the target is Medium or smaller, it is grappled (escape DC 13) and pulled 5 feet toward the water weird. Until this grapple ends, the target is restrained, the water weird tries to drown it, and the water weird can't constrict another target.Monster Manual (BR+)",
        "speedStr": "0 ft., swim 60 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=water-weird",
        "imageUrl": "https://www.aidedd.org/dnd/images/water-weird.jpg"
    },
    "weasel": {
        "id": "weasel",
        "name": "Weasel",
        "type": "beast",
        "size": "tiny",
        "cr": 0,
        "xp": 10,
        "hp": {
            "base": 1,
            "dice": "1d4-1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 16,
            "CON": 8,
            "INT": 2,
            "WIS": 12,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage.Monster Manual (SRD)",
        "speedStr": "30 ft.",
        "skill": "Perception +3, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=weasel",
        "imageUrl": "https://www.aidedd.org/dnd/images/weasel.jpg"
    },
    "werebear": {
        "id": "werebear",
        "name": "Werebear",
        "type": "humanoid",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 135,
            "dice": "18d8+54"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 17,
            "INT": 11,
            "WIS": 12,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. In bear form, the werebear makes two claw attacks. In humanoid form, it makes two greataxe attacks. In hybrid form, it can attack like a bear or a humanoid.Bite (Bear or Hybrid Form Only). Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 15 (2d10 + 4) piercing damage. If the target is a humanoid, it must succeed on a DC 14 Constitution saving throw or be cursed with wereb",
        "speedStr": "30 ft. (40 ft., climb 30 ft. in bear or hybrid form)",
        "skill": "Perception +7",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=werebear",
        "imageUrl": "https://www.aidedd.org/dnd/images/werebear.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ]
    },
    "wereboar": {
        "id": "wereboar",
        "name": "Wereboar",
        "type": "humanoid",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 78,
            "dice": "12d8+24"
        },
        "ac": 10,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 15,
            "INT": 10,
            "WIS": 11,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Humanoid or Hybrid Form Only). The wereboar makes two attacks, only one of which can be with its tusks.Maul (Humanoid or Hybrid Form Only). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.Tusks (Boar or Hybrid Form Only). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. If the target is a humanoid",
        "speedStr": "30 ft. (40 ft. in boar form)",
        "skill": "Perception +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wereboar",
        "imageUrl": "https://www.aidedd.org/dnd/images/wereboar.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ]
    },
    "wererat": {
        "id": "wererat",
        "name": "Wererat",
        "type": "humanoid",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 33,
            "dice": "6d8+6"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 10,
            "DEX": 15,
            "CON": 12,
            "INT": 11,
            "WIS": 10,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Humanoid or Hybrid Form Only). The wererat makes two attacks, only one of which can be a bite.Bite (Rat or Hybrid Form Only). Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage. If the target is a humanoid, it must succeed on a DC 11 Constitution saving throw or be cursed with wererat lycanthropy.Shortsword (Humanoid or Hybrid Form Only). Melee W",
        "speedStr": "30 ft.",
        "skill": "Perception +2, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wererat",
        "imageUrl": "https://www.aidedd.org/dnd/images/wererat.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ]
    },
    "weretiger": {
        "id": "weretiger",
        "name": "Weretiger",
        "type": "humanoid",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 120,
            "dice": "16d8+48"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 16,
            "INT": 10,
            "WIS": 13,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Humanoid or Hybrid Form Only). In humanoid form, the weretiger makes two scimitar attacks or two longbow attacks. In hybrid form, it can attack like a humanoid or make two claw attacks.Bite (Tiger or Hybrid Form Only). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage. If the target is a humanoid, it must succeed on a DC 13 Constitution saving",
        "speedStr": "30 ft. (40 ft. in tiger form)",
        "skill": "Perception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=weretiger",
        "imageUrl": "https://www.aidedd.org/dnd/images/weretiger.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "werewolf": {
        "id": "werewolf",
        "name": "Werewolf",
        "type": "humanoid",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 58,
            "dice": "9d8+18"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 13,
            "CON": 14,
            "INT": 10,
            "WIS": 11,
            "CHA": 10
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Humanoid or Hybrid Form Only). The werewolf makes two attacks: two with its spear (humanoid form) or one with its bite and one with its claws (hybrid form).Bite (Wolf or Hybrid Form Only). Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage. If the target is a humanoid, it must succeed on a DC 12 Constitution saving throw or be cursed with werewol",
        "speedStr": "30 ft. (40 ft. in wolf form)",
        "skill": "Perception +4, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=werewolf",
        "imageUrl": "https://www.aidedd.org/dnd/images/werewolf.jpg",
        "resistances": [
            "slashing",
            "piercing",
            "bludgeoning"
        ]
    },
    "white_dragon_wyrmling": {
        "id": "white_dragon_wyrmling",
        "name": "White Dragon Wyrmling",
        "type": "dragon",
        "size": "medium",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 32,
            "dice": "5d8+10"
        },
        "ac": 16,
        "speed": 30,
        "stats": {
            "STR": 14,
            "DEX": 10,
            "CON": 14,
            "INT": 5,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 2 (1d4) cold damage.Cold Breath (Recharge 5-6). The dragon exhales an icy blast of hail in a 15-foot cone. Each creature in that area must make a DC 12 Constitution saving throw, taking 22 (5d8) cold damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., burrow 15 ft., fly 60 ft., swim 30 ft.",
        "skill": "Perception +4, Stealth +2",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=white-dragon-wyrmling",
        "imageUrl": "https://www.aidedd.org/dnd/images/white-dragon-wyrmling.jpg",
        "saves": {
            "DEX": 2,
            "CON": 4,
            "WIS": 2,
            "CHA": 2
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 10 ft.",
            "darkvision 60 ft."
        ]
    },
    "wight": {
        "id": "wight",
        "name": "Wight",
        "type": "undead",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 45,
            "dice": "6d8+18"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 15,
            "DEX": 14,
            "CON": 16,
            "INT": 10,
            "WIS": 13,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 2,
                "damage": "1d8+2",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The wight makes two longsword attacks or two longbow attacks. It can use its Life Drain in place of one longsword attack.Life Drain. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) necrotic damage. The target must succeed on a DC 13 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts unt",
        "speedStr": "30 ft.",
        "skill": "Perception +3, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wight",
        "imageUrl": "https://www.aidedd.org/dnd/images/wight.jpg",
        "resistances": [
            "necrotic",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "poisoned"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "wild_dog": {
        "id": "wild_dog",
        "name": "Wild Dog",
        "type": "beast",
        "size": "medium",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 5,
            "dice": "1d8+1"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 13,
            "DEX": 14,
            "CON": 12,
            "INT": 3,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 1,
                "damage": "1d8+1",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.Extra (Adventurers League)",
        "speedStr": "40 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wild-dog",
        "imageUrl": "https://www.aidedd.org/dnd/images/wild-dog.jpg"
    },
    "wild_dog_alpha": {
        "id": "wild_dog_alpha",
        "name": "Wild Dog Alpha",
        "type": "beast",
        "size": "large",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 26,
            "dice": "4d10+4"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 15,
            "CON": 13,
            "INT": 3,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.Extra (Adventurers League)",
        "speedStr": "50 ft.",
        "skill": "Perception +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wild-dog-alpha",
        "imageUrl": "https://www.aidedd.org/dnd/images/wild-dog-alpha.jpg"
    },
    "will_o_wisp": {
        "id": "will_o_wisp",
        "name": "Will O  Wisp",
        "type": "undead",
        "size": "tiny",
        "cr": 2,
        "xp": 450,
        "hp": {
            "base": 22,
            "dice": "9d4"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 1,
            "DEX": 28,
            "CON": 10,
            "INT": 13,
            "WIS": 14,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Shock. Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d8) lightning damage.Invisibility. The will-o'-wisp and its light magically become invisible until it attacks or uses its Consume Life, or until its concentration ends (as if concentrating on a spell).Monster Manual (SRD)",
        "speedStr": "0 ft., fly 50 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=will-o--wisp",
        "imageUrl": "https://www.aidedd.org/dnd/images/will-o--wisp.jpg",
        "resistances": [
            "acid",
            "cold",
            "fire",
            "necrotic",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "lightning",
            "poison"
        ],
        "conditionImmunities": [
            "exhaustion",
            "grappled",
            "paralyzed",
            "poisoned",
            "prone",
            "restrained",
            "unconscious"
        ],
        "senses": [
            "darkvision 120 ft."
        ]
    },
    "giant_centipede": {
        "id": "giant_centipede",
        "name": "Giant Centipede",
        "type": "beast",
        "size": "small",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 4,
            "dice": "1d6+1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 5,
            "DEX": 14,
            "CON": 12,
            "INT": 1,
            "WIS": 7,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or take 10 (3d6) poison damage. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.Monster Manual (SRD)",
        "speedStr": "30 ft., climb 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=giant-centipede",
        "imageUrl": "https://www.aidedd.org/dnd/images/giant-centipede.jpg",
        "senses": [
            "blindsight 30 ft."
        ]
    },
    "winter_wolf": {
        "id": "winter_wolf",
        "name": "Winter Wolf",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 75,
            "dice": "10d10+20"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 14,
            "INT": 7,
            "WIS": 12,
            "CHA": 8
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be knocked prone.Cold Breath (Recharge 5-6). The wolf exhales a blast of freezing wind in a 15-foot cone. Each creature in that area must make a DC 12 Dexterity saving throw, taking 18 (4d8) cold damage on a failed save,",
        "speedStr": "50 ft.",
        "skill": "Perception +5, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=winter-wolf",
        "imageUrl": "https://www.aidedd.org/dnd/images/winter-wolf.jpg",
        "immunities": [
            "cold"
        ]
    },
    "twig_blight": {
        "id": "twig_blight",
        "name": "Twig Blight",
        "type": "plant",
        "size": "small",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 4,
            "dice": "1d6+1"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 13,
            "CON": 12,
            "INT": 4,
            "WIS": 8,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.A twig blight is an awakened plant that resembles a woody shrub that can pull its roots free of the ground. Its branches twist together to form a humanoid-looking body with a head and limbs.Monster Manual (BR)",
        "speedStr": "20 ft.",
        "skill": "Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=twig-blight",
        "imageUrl": "https://www.aidedd.org/dnd/images/twig-blight.jpg"
    },
    "poisonous_snake": {
        "id": "poisonous_snake",
        "name": "Poisonous Snake",
        "type": "beast",
        "size": "tiny",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 2,
            "DEX": 16,
            "CON": 11,
            "INT": 1,
            "WIS": 10,
            "CHA": 3
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage, and the target must make a DC 10 Constitution saving throw, taking 5 (2d4) poison damage on a failed save, or half as much damage on a successful one.Monster Manual (SRD)",
        "speedStr": "30 ft., swim 30 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=poisonous-snake",
        "imageUrl": "https://www.aidedd.org/dnd/images/poisonous-snake.jpg",
        "senses": [
            "blindsight 10 ft."
        ]
    },
    "wraith": {
        "id": "wraith",
        "name": "Wraith",
        "type": "undead",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 67,
            "dice": "9d8+27"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 6,
            "DEX": 16,
            "CON": 16,
            "INT": 12,
            "WIS": 14,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "0 ft., fly 60 ft. (hover)",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wraith",
        "imageUrl": "https://www.aidedd.org/dnd/images/wraith.jpg",
        "resistances": [
            "acid",
            "cold",
            "fire",
            "lightning",
            "thunder",
            "slashing",
            "piercing",
            "bludgeoning"
        ],
        "immunities": [
            "necrotic",
            "poison"
        ],
        "conditionImmunities": [
            "charmed",
            "exhaustion",
            "grappled",
            "paralyzed",
            "petrified",
            "poisoned",
            "prone",
            "restrained"
        ],
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "wyvern": {
        "id": "wyvern",
        "name": "Wyvern",
        "type": "dragon",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 110,
            "dice": "13d10+39"
        },
        "ac": 13,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 16,
            "INT": 5,
            "WIS": 12,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The wyvern makes two attacks: one with its bite and one with its stinger. While flying, it can use its claws in place of one other attack.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage.Claws. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.Stinger. Melee Weapon Attack: +7 to hit, reach 10 f",
        "speedStr": "20 ft., fly 80 ft.",
        "skill": "Perception +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=wyvern",
        "imageUrl": "https://www.aidedd.org/dnd/images/wyvern.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "xorn": {
        "id": "xorn",
        "name": "Xorn",
        "type": "elemental",
        "size": "medium",
        "cr": 5,
        "xp": 1800,
        "hp": {
            "base": 73,
            "dice": "7d8+42"
        },
        "ac": 19,
        "speed": 30,
        "stats": {
            "STR": 17,
            "DEX": 10,
            "CON": 22,
            "INT": 11,
            "WIS": 10,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The xorn makes three claw attacks and one bite attack.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Bite. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (3d6 + 3) piercing damage.Monster Manual (SRD)",
        "speedStr": "20 ft., burrow 20 ft.",
        "skill": "Perception +6, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=xorn",
        "imageUrl": "https://www.aidedd.org/dnd/images/xorn.jpg",
        "resistances": [
            "slashing",
            "piercing"
        ],
        "senses": [
            "darkvision 60 ft.",
            "tremorsense 60 ft."
        ]
    },
    "sprite": {
        "id": "sprite",
        "name": "Sprite",
        "type": "fey",
        "size": "tiny",
        "cr": 0.25,
        "xp": 50,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 3,
            "DEX": 18,
            "CON": 10,
            "INT": 14,
            "WIS": 13,
            "CHA": 11
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "",
        "speedStr": "10 ft., fly 40 ft.",
        "skill": "Perception +3, Stealth +8",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=sprite",
        "imageUrl": "https://www.aidedd.org/dnd/images/sprite.jpg"
    },
    "stirge": {
        "id": "stirge",
        "name": "Stirge",
        "type": "beast",
        "size": "tiny",
        "cr": 0.125,
        "xp": 25,
        "hp": {
            "base": 2,
            "dice": "1d4"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 4,
            "DEX": 16,
            "CON": 11,
            "INT": 2,
            "WIS": 8,
            "CHA": 6
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Blood Drain. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 5 (1d4 + 3) piercing damage, and the stirge attaches to the target. While attached, the stirge doesn't attack. Instead, at the start of each of the stirge's turns, the target loses 5 (1d4 + 3) hit points due to blood loss. The stirge can detach itself by spending 5 feet of its movement. It does so after it drains 10 hit p",
        "speedStr": "10 ft., fly 40 ft.",
        "skill": "",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=stirge",
        "imageUrl": "https://www.aidedd.org/dnd/images/stirge.jpg",
        "senses": [
            "darkvision 60 ft."
        ]
    },
    "yeti": {
        "id": "yeti",
        "name": "Yeti",
        "type": "monstrosity",
        "size": "large",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 51,
            "dice": "6d10+18"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 13,
            "CON": 16,
            "INT": 8,
            "WIS": 12,
            "CHA": 7
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The yeti can use its Chilling Gaze and makes two claw attacks.Claw. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) slashing damage plus 3 (1d6) cold damage.Chilling Gaze. The yeti targets one creature it can see within 30 feet of it. If the target can see the yeti, the target must succeed on a DC 13 Constitution saving throw against this magic or take 10 (3d",
        "speedStr": "40 ft., climb 40 ft.",
        "skill": "Perception +3, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=yeti",
        "imageUrl": "https://www.aidedd.org/dnd/images/yeti.jpg"
    },
    "young_black_dragon": {
        "id": "young_black_dragon",
        "name": "Young Black Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 127,
            "dice": "15d10+45"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 14,
            "CON": 17,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 4 (1d8) acid damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Acid Breath (Recharge 5-6). The dragon exhales acid in a 30-foot line that is 5 feet wide. Ea",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +6, Stealth +5",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-black-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-black-dragon.jpg",
        "saves": {
            "DEX": 5,
            "CON": 6,
            "WIS": 3,
            "CHA": 5
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_blue_dragon": {
        "id": "young_blue_dragon",
        "name": "Young Blue Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 152,
            "dice": "16d10+64"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 10,
            "CON": 19,
            "INT": 14,
            "WIS": 13,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) piercing damage plus 5 (1d10) lightning damage.Claw. Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.Lightning Breath (Recharge 5-6). The dragon exhales lightning in an 60-foot line that i",
        "speedStr": "40 ft., burrow 20 ft., fly 80 ft.",
        "skill": "Perception +9, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-blue-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-blue-dragon.jpg",
        "saves": {
            "DEX": 4,
            "CON": 8,
            "WIS": 5,
            "CHA": 7
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_brass_dragon": {
        "id": "young_brass_dragon",
        "name": "Young Brass Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 110,
            "dice": "13d10+39"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 10,
            "CON": 17,
            "INT": 12,
            "WIS": 11,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Fire Breath. The dragon exhales fir",
        "speedStr": "40 ft., burrow 20 ft., fly 80 ft.",
        "skill": "Perception +6, Persuasion +5, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-brass-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-brass-dragon.jpg",
        "saves": {
            "DEX": 3,
            "CON": 6,
            "WIS": 3,
            "CHA": 5
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_bronze_dragon": {
        "id": "young_bronze_dragon",
        "name": "Young Bronze Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 142,
            "dice": "15d10+60"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 21,
            "DEX": 10,
            "CON": 19,
            "INT": 14,
            "WIS": 13,
            "CHA": 17
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 7,
                "damage": "1d8+5",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) piercing damage.Claw. Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Lightning Breath. The dragon exhale",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +4, Perception +7, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-bronze-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-bronze-dragon.jpg",
        "saves": {
            "DEX": 3,
            "CON": 7,
            "WIS": 4,
            "CHA": 6
        },
        "immunities": [
            "lightning"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_copper_dragon": {
        "id": "young_copper_dragon",
        "name": "Young Copper Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 119,
            "dice": "14d10+42"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 12,
            "CON": 17,
            "INT": 16,
            "WIS": 13,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Acid Breath. The dragon exhales aci",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Deception +5, Perception +7, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-copper-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-copper-dragon.jpg",
        "saves": {
            "DEX": 4,
            "CON": 6,
            "WIS": 4,
            "CHA": 5
        },
        "immunities": [
            "acid"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_gold_dragon": {
        "id": "young_gold_dragon",
        "name": "Young Gold Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 178,
            "dice": "17d10+85"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 14,
            "CON": 21,
            "INT": 16,
            "WIS": 13,
            "CHA": 20
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.Claw. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Fire Breath. The dragon exhales f",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Insight +5, Perception +9, Persuasion +9, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-gold-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-gold-dragon.jpg",
        "saves": {
            "DEX": 6,
            "CON": 9,
            "WIS": 5,
            "CHA": 9
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_green_dragon": {
        "id": "young_green_dragon",
        "name": "Young Green Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 8,
        "xp": 3900,
        "hp": {
            "base": 136,
            "dice": "16d10+48"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 12,
            "CON": 17,
            "INT": 16,
            "WIS": 13,
            "CHA": 15
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 6,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 7 (2d6) poison damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Poison Breath (Recharge 5-6). The dragon exhales poisonous gas in a 30-foot cone. Each crea",
        "speedStr": "40 ft., fly 80 ft., swim 40 ft.",
        "skill": "Deception +5, Perception +7, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-green-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-green-dragon.jpg",
        "saves": {
            "DEX": 4,
            "CON": 6,
            "WIS": 4,
            "CHA": 5
        },
        "immunities": [
            "poison"
        ],
        "conditionImmunities": [
            "poisoned"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_red_dragon": {
        "id": "young_red_dragon",
        "name": "Young Red Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 10,
        "xp": 5900,
        "hp": {
            "base": 178,
            "dice": "17d10+85"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 10,
            "CON": 21,
            "INT": 14,
            "WIS": 11,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage.Claw. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Fire Breath (Recharge 5-6). The dragon exhales fire in a 30-foot cone. Each creature in tha",
        "speedStr": "40 ft., climb 40 ft., fly 80 ft.",
        "skill": "Perception +8, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-red-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-red-dragon.jpg",
        "saves": {
            "DEX": 4,
            "CON": 9,
            "WIS": 4,
            "CHA": 8
        },
        "immunities": [
            "fire"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_silver_dragon": {
        "id": "young_silver_dragon",
        "name": "Young Silver Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 9,
        "xp": 5000,
        "hp": {
            "base": 168,
            "dice": "16d10+80"
        },
        "ac": 18,
        "speed": 30,
        "stats": {
            "STR": 23,
            "DEX": 10,
            "CON": 21,
            "INT": 14,
            "WIS": 11,
            "CHA": 19
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 8,
                "damage": "1d8+6",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.Claw. Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.Breath Weapons (Recharge 5-6). The dragon uses one of the following breath weapons.Cold Breath. The dragon exhales a",
        "speedStr": "40 ft., fly 80 ft.",
        "skill": "Arcana +6, History +6, Perception +8, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-silver-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-silver-dragon.jpg",
        "saves": {
            "DEX": 4,
            "CON": 9,
            "WIS": 4,
            "CHA": 8
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "young_white_dragon": {
        "id": "young_white_dragon",
        "name": "Young White Dragon",
        "type": "dragon",
        "size": "large",
        "cr": 6,
        "xp": 2300,
        "hp": {
            "base": 133,
            "dice": "14d10+56"
        },
        "ac": 17,
        "speed": 30,
        "stats": {
            "STR": 18,
            "DEX": 10,
            "CON": 18,
            "INT": 6,
            "WIS": 11,
            "CHA": 12
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The dragon makes three attacks: one with its bite and two with its claws.Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 4 (1d8) cold damage.Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.Cold Breath (Recharge 5-6). The dragon exhales an icy blast in a 30-foot cone. Each creature",
        "speedStr": "40 ft., burrow 20 ft., fly 80 ft., swim 40 ft.",
        "skill": "Perception +6, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=young-white-dragon",
        "imageUrl": "https://www.aidedd.org/dnd/images/young-white-dragon.jpg",
        "saves": {
            "DEX": 3,
            "CON": 7,
            "WIS": 3,
            "CHA": 4
        },
        "immunities": [
            "cold"
        ],
        "senses": [
            "blindsight 30 ft.",
            "darkvision 120 ft."
        ]
    },
    "yuan_ti_abomination": {
        "id": "yuan_ti_abomination",
        "name": "Yuan Ti Abomination",
        "type": "monstrosity",
        "size": "large",
        "cr": 7,
        "xp": 2900,
        "hp": {
            "base": 127,
            "dice": "15d10+45"
        },
        "ac": 15,
        "speed": 30,
        "stats": {
            "STR": 19,
            "DEX": 16,
            "CON": 17,
            "INT": 17,
            "WIS": 15,
            "CHA": 18
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 5,
                "damage": "1d8+4",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack (Abomination Form Only). The yuan-ti makes two ranged attacks or three melee attacks, but can use its bite and constrict attacks only once each.Bite. Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 7 (1d6 + 4) piercing damage plus 10 (3d6) poison damage.Constrict. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage, and the tar",
        "speedStr": "40 ft.",
        "skill": "Perception +5, Stealth +6",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=yuan-ti-abomination",
        "imageUrl": "https://www.aidedd.org/dnd/images/yuan-ti-abomination.jpg"
    },
    "yuan_ti_malison": {
        "id": "yuan_ti_malison",
        "name": "Yuan Ti Malison",
        "type": "monstrosity",
        "size": "medium",
        "cr": 3,
        "xp": 700,
        "hp": {
            "base": 66,
            "dice": "12d8+12"
        },
        "ac": 12,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 13,
            "INT": 14,
            "WIS": 12,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 3,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "For Type 1Multiattack (Yuan-ti Form Only). The yuan-ti makes two ranged attacks or two melee attacks, but can use its bite only once.Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 5 (1d4 + 3) piercing damage plus 7 (2d6) poison damage.Scimitar (Yuan-ti Form Only). Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.Longbow (Yuan-ti Form",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=yuan-ti-malison",
        "imageUrl": "https://www.aidedd.org/dnd/images/yuan-ti-malison.jpg"
    },
    "yuan_ti_nightmare_speaker": {
        "id": "yuan_ti_nightmare_speaker",
        "name": "Yuan Ti Nightmare Speaker",
        "type": "monstrosity",
        "size": "medium",
        "cr": 4,
        "xp": 1100,
        "hp": {
            "base": 71,
            "dice": "13d8+13"
        },
        "ac": 14,
        "speed": 30,
        "stats": {
            "STR": 16,
            "DEX": 14,
            "CON": 13,
            "INT": 14,
            "WIS": 12,
            "CHA": 16
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 4,
                "damage": "1d8+3",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack.Constrict.Scimitar (Yuan-ti Form Only).Spectral Fangs.Invoke Nightmare (Recharges after a Short or Long Rest).Spellcasting (Yuan-ti Form Only).Bonus actionsChange Shape.Monsters of the Multiverse",
        "speedStr": "30 ft.",
        "skill": "Deception +5, Stealth +4",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=yuan-ti-nightmare-speaker",
        "imageUrl": "https://www.aidedd.org/dnd/images/yuan-ti-nightmare-speaker.jpg"
    },
    "yuan_ti_pureblood": {
        "id": "yuan_ti_pureblood",
        "name": "Yuan Ti Pureblood",
        "type": "humanoid",
        "size": "medium",
        "cr": 1,
        "xp": 200,
        "hp": {
            "base": 40,
            "dice": "9d8"
        },
        "ac": 11,
        "speed": 30,
        "stats": {
            "STR": 11,
            "DEX": 12,
            "CON": 11,
            "INT": 13,
            "WIS": 12,
            "CHA": 14
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 0,
                "damage": "1d8+0",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. The yuan-ti makes two melee attacks.Scimitar. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.Shortbow. Ranged Weapon Attack: +3 to hit, range 80/320 ft., one target. Hit: 4 (1d6 + 1) piercing damage plus 7 (2d6) poison damage.Appear mostly human, with minor reptilian features, such as slitted eyes, a forked tongue, or patches of scales on the",
        "speedStr": "30 ft.",
        "skill": "Deception +6, Perception +3, Stealth +3",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=yuan-ti-pureblood",
        "imageUrl": "https://www.aidedd.org/dnd/images/yuan-ti-pureblood.jpg"
    },
    "zariel": {
        "id": "zariel",
        "name": "Zariel",
        "type": "fiend",
        "size": "large",
        "cr": 26,
        "xp": 90000,
        "hp": {
            "base": 580,
            "dice": "40d10+360"
        },
        "ac": 21,
        "speed": 30,
        "stats": {
            "STR": 27,
            "DEX": 24,
            "CON": 28,
            "INT": 26,
            "WIS": 27,
            "CHA": 30
        },
        "attacks": [
            {
                "name": "Basic Attack",
                "attackBonus": 14,
                "damage": "1d8+8",
                "damageType": "bludgeoning",
                "reach": 5
            }
        ],
        "emoji": "👾",
        "action": "Multiattack. Zariel makes three Flail or Longsword attacks. She can replace one attack with a use of Horrid Touch, if available.Flail. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 17 (2d8 + 8) force damage plus 36 (8d8) fire damage.Longsword. Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 17 (2d8 + 8) radiant damage, or 19 (2d10 + 8) radiant damage when used wit",
        "speedStr": "50 ft., fly 150 ft.",
        "skill": "Intimidation +18, Perception +16",
        "url": "https://www.aidedd.org/dnd/monstres.php?vo=zariel",
        "imageUrl": "https://www.aidedd.org/dnd/images/zariel.jpg"
    }
};
