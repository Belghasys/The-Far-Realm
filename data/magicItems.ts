// SRD 5.1 Magic Item catalogue + weighted loot tables.
// Effect strings are written in the exact shapes the rules engine already parses:
//   - "+N to attack and damage rolls"  -> parseMagicModifier (types.ts) reads the first +N
//   - "extra NdN <type> damage"        -> parseItemAdditionalDamage (rulesEngine.ts) on equipped items
//   - "+N AC"                          -> getBaseACFromArmor, always paired with an explicit acBonus
//   - "sets STR to 19" / "+2 CON"      -> parseItemStatModifier
//   - "+10 speed"                      -> parseItemSpeedModifier
// Limited-use dice (once/day breath weapons, wand charges...) are kept in the
// description ONLY, so equipped items never auto-apply them to every hit.

import { CodexDamageType, Item, ItemSlot } from '../types/index';

export type MagicItemRarity = 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';

export type MagicItemType =
    | 'weapon' | 'armor' | 'shield'
    | 'ring' | 'amulet' | 'cloak' | 'boots' | 'gloves' | 'belt' | 'bracers'
    | 'wand' | 'potion' | 'scroll' | 'wondrous';

export interface MagicItemDef {
    id: string;
    name: string;
    nameFr: string;
    rarity: MagicItemRarity;
    type: MagicItemType;
    description: string;
    descriptionFr: string;
    /** Engine-parseable effect strings (joined into Item.effect on conversion). */
    effects: string[];
    properties?: string[];
    damageDice?: string;
    damageType?: CodexDamageType;
    /** Armor: magic bonus over baseAC. Shield: TOTAL shield bonus (2 + magic). Other slots: flat AC add. */
    acBonus?: number;
    baseAC?: number;
    maxDexBonus?: number;
    armorType?: 'light' | 'medium' | 'heavy' | 'shield';
    stealthDisadvantage?: boolean;
    range?: string;
    attunement?: boolean;
    /** Indicative price in gold pieces. */
    value: number;
    /** Character level from which this drop feels appropriate. */
    minLevel: number;
    /** Equip slot override (defaults are derived from `type`). */
    slot?: ItemSlot;
}

export const MAGIC_ITEMS: MagicItemDef[] = [
    // ═══════════════════════════ WEAPONS +1 / +2 / +3 ═══════════════════════════
    {
        id: 'longsword_plus_1', name: 'Longsword +1', nameFr: 'Épée longue +1', rarity: 'uncommon', type: 'weapon',
        description: 'A finely enchanted blade that never dulls.',
        descriptionFr: 'Une lame finement enchantée qui ne s’émousse jamais.',
        effects: ['+1 to attack and damage rolls'], properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', value: 1000, minLevel: 2,
    },
    {
        id: 'shortsword_plus_1', name: 'Shortsword +1', nameFr: 'Épée courte +1', rarity: 'uncommon', type: 'weapon',
        description: 'A light, perfectly balanced enchanted blade.',
        descriptionFr: 'Une lame courte enchantée, parfaitement équilibrée.',
        effects: ['+1 to attack and damage rolls'], properties: ['finesse', 'light'],
        damageDice: '1d6', damageType: 'piercing', value: 1000, minLevel: 2,
    },
    {
        id: 'dagger_plus_1', name: 'Dagger +1', nameFr: 'Dague +1', rarity: 'uncommon', type: 'weapon',
        description: 'A slim enchanted dagger that flies true when thrown.',
        descriptionFr: 'Une dague enchantée qui vole droit quand on la lance.',
        effects: ['+1 to attack and damage rolls'], properties: ['finesse', 'light', 'thrown'],
        damageDice: '1d4', damageType: 'piercing', range: '20/60', value: 800, minLevel: 1,
    },
    {
        id: 'rapier_plus_1', name: 'Rapier +1', nameFr: 'Rapière +1', rarity: 'uncommon', type: 'weapon',
        description: 'An elegant dueling blade humming with magic.',
        descriptionFr: 'Une élégante lame de duel vibrante de magie.',
        effects: ['+1 to attack and damage rolls'], properties: ['finesse'],
        damageDice: '1d8', damageType: 'piercing', value: 1000, minLevel: 2,
    },
    {
        id: 'battleaxe_plus_1', name: 'Battleaxe +1', nameFr: 'Hache d’armes +1', rarity: 'uncommon', type: 'weapon',
        description: 'A rune-etched axe favored by dwarven champions.',
        descriptionFr: 'Une hache gravée de runes, prisée des champions nains.',
        effects: ['+1 to attack and damage rolls'], properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', value: 1000, minLevel: 2,
    },
    {
        id: 'warhammer_plus_1', name: 'Warhammer +1', nameFr: 'Marteau de guerre +1', rarity: 'uncommon', type: 'weapon',
        description: 'A blessed hammer that strikes with uncanny weight.',
        descriptionFr: 'Un marteau béni qui frappe avec un poids surnaturel.',
        effects: ['+1 to attack and damage rolls'], properties: ['versatile'],
        damageDice: '1d8', damageType: 'bludgeoning', value: 1000, minLevel: 2,
    },
    {
        id: 'greatsword_plus_1', name: 'Greatsword +1', nameFr: 'Épée à deux mains +1', rarity: 'uncommon', type: 'weapon',
        description: 'A massive enchanted blade that cleaves through armor.',
        descriptionFr: 'Une lame massive enchantée qui fend les armures.',
        effects: ['+1 to attack and damage rolls'], properties: ['heavy', 'two-handed'],
        damageDice: '2d6', damageType: 'slashing', value: 1200, minLevel: 3,
    },
    {
        id: 'longbow_plus_1', name: 'Longbow +1', nameFr: 'Arc long +1', rarity: 'uncommon', type: 'weapon',
        description: 'A yew longbow whose arrows seek their mark.',
        descriptionFr: 'Un arc en if dont les flèches cherchent leur cible.',
        effects: ['+1 to attack and damage rolls'], properties: ['heavy', 'two-handed', 'ranged'],
        damageDice: '1d8', damageType: 'piercing', range: '150/600', value: 1000, minLevel: 2,
    },
    {
        id: 'longsword_plus_2', name: 'Longsword +2', nameFr: 'Épée longue +2', rarity: 'rare', type: 'weapon',
        description: 'A masterwork blade wrapped in potent enchantments.',
        descriptionFr: 'Une lame de maître enveloppée de puissants enchantements.',
        effects: ['+2 to attack and damage rolls'], properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', value: 4000, minLevel: 5,
    },
    {
        id: 'greataxe_plus_2', name: 'Greataxe +2', nameFr: 'Grande hache +2', rarity: 'rare', type: 'weapon',
        description: 'A brutal axe that shears through shields.',
        descriptionFr: 'Une hache brutale qui tranche les boucliers.',
        effects: ['+2 to attack and damage rolls'], properties: ['heavy', 'two-handed'],
        damageDice: '1d12', damageType: 'slashing', value: 4500, minLevel: 6,
    },
    {
        id: 'longbow_plus_2', name: 'Longbow +2', nameFr: 'Arc long +2', rarity: 'rare', type: 'weapon',
        description: 'An elven bow of extraordinary precision.',
        descriptionFr: 'Un arc elfique d’une précision extraordinaire.',
        effects: ['+2 to attack and damage rolls'], properties: ['heavy', 'two-handed', 'ranged'],
        damageDice: '1d8', damageType: 'piercing', range: '150/600', value: 4000, minLevel: 5,
    },
    {
        id: 'longsword_plus_3', name: 'Longsword +3', nameFr: 'Épée longue +3', rarity: 'very rare', type: 'weapon',
        description: 'A legendary blade forged for heroes of renown.',
        descriptionFr: 'Une lame légendaire forgée pour les héros illustres.',
        effects: ['+3 to attack and damage rolls'], properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', value: 16000, minLevel: 9,
    },
    {
        id: 'longbow_plus_3', name: 'Longbow +3', nameFr: 'Arc long +3', rarity: 'very rare', type: 'weapon',
        description: 'A bow said to have been strung by an archmage.',
        descriptionFr: 'Un arc dont on dit qu’il fut tendu par un archimage.',
        effects: ['+3 to attack and damage rolls'], properties: ['heavy', 'two-handed', 'ranged'],
        damageDice: '1d8', damageType: 'piercing', range: '150/600', value: 16000, minLevel: 9,
    },

    // ═══════════════════════════ ELEMENTAL / NAMED WEAPONS ═══════════════════════════
    {
        id: 'javelin_of_lightning', name: 'Javelin of Lightning', nameFr: 'Javeline de foudre', rarity: 'uncommon', type: 'weapon',
        description: 'Once per dawn, when hurled with its command word, it becomes a bolt of lightning (4d6 lightning, DEX save for half, line 120 ft).',
        descriptionFr: 'Une fois par aube, lancée avec son mot de commande, elle devient un éclair (4d6 foudre, sauvegarde DEX pour moitié, ligne de 36 m).',
        effects: ['Once per dawn: transforms into a bolt of lightning (see description)'],
        properties: ['thrown'],
        damageDice: '1d6', damageType: 'piercing', range: '30/120', value: 1500, minLevel: 4,
    },
    {
        id: 'flame_tongue', name: 'Flame Tongue', nameFr: 'Langue de feu', rarity: 'rare', type: 'weapon',
        description: 'Speak the command word to wreathe this longsword in flames.',
        descriptionFr: 'Prononcez le mot de commande pour embraser cette épée longue.',
        effects: ['While blazing, deals an extra 2d6 fire damage on a hit'],
        properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', attunement: true, value: 5000, minLevel: 6,
    },
    {
        id: 'frost_brand', name: 'Frost Brand', nameFr: 'Lame givrée', rarity: 'very rare', type: 'weapon',
        description: 'A frost-sheathed blade that extinguishes flames and shields its wielder from fire.',
        descriptionFr: 'Une lame gainée de givre qui éteint les flammes et protège son porteur du feu.',
        effects: ['Deals an extra 1d6 cold damage on a hit', 'Wielder has resistance to fire damage'],
        properties: ['versatile'],
        damageDice: '1d8', damageType: 'slashing', attunement: true, value: 8000, minLevel: 9,
    },
    {
        id: 'dagger_of_venom', name: 'Dagger of Venom', nameFr: 'Dague venimeuse', rarity: 'rare', type: 'weapon',
        description: 'Once per day, coat the blade in poison as an action: the next hit forces a DC 15 CON save or 2d10 poison damage and the poisoned condition.',
        descriptionFr: 'Une fois par jour, enduisez la lame de poison par une action : le prochain coup impose un jet de CON DD 15 ou 2d10 dégâts de poison et l’état empoisonné.',
        effects: ['+1 to attack and damage rolls'],
        properties: ['finesse', 'light', 'thrown'],
        damageDice: '1d4', damageType: 'piercing', range: '20/60', value: 2500, minLevel: 5,
    },
    {
        id: 'sun_blade', name: 'Sun Blade', nameFr: 'Lame solaire', rarity: 'rare', type: 'weapon',
        description: 'A hilt that projects a blade of pure radiance; sheds sunlight in a 15-foot radius. Undead take an extra 1d8 on a hit (DM adjudicated).',
        descriptionFr: 'Une garde qui projette une lame de pure lumière ; diffuse la lumière du soleil sur 4,5 m. Les morts-vivants subissent 1d8 de plus (arbitré par le MJ).',
        effects: ['+2 to attack and damage rolls', 'Emits sunlight'],
        properties: ['finesse', 'versatile'],
        damageDice: '1d8', damageType: 'radiant', attunement: true, value: 6000, minLevel: 7,
    },
    {
        id: 'mace_of_disruption', name: 'Mace of Disruption', nameFr: 'Masse de destruction', rarity: 'rare', type: 'weapon',
        description: 'Fiends and undead struck by this mace take an extra 2d6 radiant damage and may flee in terror (DM adjudicated).',
        descriptionFr: 'Les fiélons et morts-vivants frappés subissent 2d6 dégâts radiants supplémentaires et peuvent fuir de terreur (arbitré par le MJ).',
        effects: ['Devastating against fiends and undead (see description)'],
        damageDice: '1d6', damageType: 'bludgeoning', attunement: true, value: 5000, minLevel: 6,
    },

    // ═══════════════════════════ ARMOR & SHIELDS ═══════════════════════════
    {
        id: 'leather_armor_plus_1', name: 'Leather Armor +1', nameFr: 'Armure de cuir +1', rarity: 'rare', type: 'armor',
        description: 'Supple enchanted leather that turns aside blades.',
        descriptionFr: 'Un cuir souple enchanté qui détourne les lames.',
        effects: ['+1 AC'], armorType: 'light', baseAC: 11, acBonus: 1, value: 1500, minLevel: 4,
    },
    {
        id: 'breastplate_plus_1', name: 'Breastplate +1', nameFr: 'Cuirasse +1', rarity: 'rare', type: 'armor',
        description: 'A polished breastplate warded with protective runes.',
        descriptionFr: 'Une cuirasse polie gardée par des runes protectrices.',
        effects: ['+1 AC'], armorType: 'medium', baseAC: 14, maxDexBonus: 2, acBonus: 1, value: 2500, minLevel: 5,
    },
    {
        id: 'chain_mail_plus_1', name: 'Chain Mail +1', nameFr: 'Cotte de mailles +1', rarity: 'rare', type: 'armor',
        description: 'Interlocking rings reinforced by abjuration magic.',
        descriptionFr: 'Des anneaux entrelacés renforcés par la magie d’abjuration.',
        effects: ['+1 AC'], armorType: 'heavy', baseAC: 16, acBonus: 1, stealthDisadvantage: true, value: 2000, minLevel: 5,
    },
    {
        id: 'plate_armor_plus_1', name: 'Plate Armor +1', nameFr: 'Harnois +1', rarity: 'rare', type: 'armor',
        description: 'Gleaming full plate fit for a champion.',
        descriptionFr: 'Un harnois étincelant digne d’un champion.',
        effects: ['+1 AC'], armorType: 'heavy', baseAC: 18, acBonus: 1, stealthDisadvantage: true, value: 6500, minLevel: 8,
    },
    {
        id: 'plate_armor_plus_2', name: 'Plate Armor +2', nameFr: 'Harnois +2', rarity: 'very rare', type: 'armor',
        description: 'Legendary plate said to be forged in a giant’s furnace.',
        descriptionFr: 'Un harnois légendaire forgé, dit-on, dans la forge d’un géant.',
        effects: ['+2 AC'], armorType: 'heavy', baseAC: 18, acBonus: 2, stealthDisadvantage: true, value: 24000, minLevel: 10,
    },
    {
        id: 'mithral_chain_shirt', name: 'Mithral Chain Shirt', nameFr: 'Chemise de mailles en mithral', rarity: 'uncommon', type: 'armor',
        description: 'Featherlight mithral links; no stealth disadvantage and no strength requirement.',
        descriptionFr: 'Des mailles de mithral légères comme une plume ; aucun désavantage de discrétion.',
        effects: ['Light as cloth, silent as shadow'], armorType: 'medium', baseAC: 13, maxDexBonus: 2, value: 800, minLevel: 3,
    },
    {
        id: 'adamantine_breastplate', name: 'Adamantine Breastplate', nameFr: 'Cuirasse en adamantium', rarity: 'uncommon', type: 'armor',
        description: 'While wearing it, any critical hit against you becomes a normal hit.',
        descriptionFr: 'Tant que vous la portez, tout coup critique contre vous devient un coup normal.',
        effects: ['Critical hits against the wearer become normal hits'],
        armorType: 'medium', baseAC: 14, maxDexBonus: 2, value: 1000, minLevel: 4,
    },
    {
        id: 'elven_chain', name: 'Elven Chain', nameFr: 'Cotte de mailles elfique', rarity: 'rare', type: 'armor',
        description: 'A +1 chain shirt so fine it can be worn under clothes, even without armor proficiency.',
        descriptionFr: 'Une chemise de mailles +1 si fine qu’elle se porte sous les vêtements, même sans maîtrise des armures.',
        effects: ['+1 AC', 'Wearable without armor proficiency'],
        armorType: 'medium', baseAC: 13, maxDexBonus: 2, acBonus: 1, value: 4000, minLevel: 6,
    },
    {
        id: 'dragon_scale_mail', name: 'Dragon Scale Mail', nameFr: 'Armure d’écailles de dragon', rarity: 'very rare', type: 'armor',
        description: 'Armor of true dragon scales: advantage on saves against dragon breath and resistance to the dragon’s damage type.',
        descriptionFr: 'Une armure en écailles de dragon véritables : avantage contre les souffles draconiques et résistance au type de dégâts du dragon.',
        effects: ['+1 AC', 'Resistance to the dragon’s damage type (see description)'],
        armorType: 'medium', baseAC: 14, maxDexBonus: 2, acBonus: 1, attunement: true, value: 12000, minLevel: 9,
    },
    {
        id: 'shield_plus_1', name: 'Shield +1', nameFr: 'Bouclier +1', rarity: 'uncommon', type: 'shield',
        description: 'A sturdy shield reinforced with warding sigils.',
        descriptionFr: 'Un bouclier solide renforcé de sceaux de protection.',
        effects: ['+1 AC'], armorType: 'shield', acBonus: 3, value: 1500, minLevel: 3,
    },
    {
        id: 'shield_plus_2', name: 'Shield +2', nameFr: 'Bouclier +2', rarity: 'rare', type: 'shield',
        description: 'A shield that seems to move on its own to intercept blows.',
        descriptionFr: 'Un bouclier qui semble bouger de lui-même pour intercepter les coups.',
        effects: ['+2 AC'], armorType: 'shield', acBonus: 4, value: 6000, minLevel: 7,
    },

    // ═══════════════════════════ RINGS ═══════════════════════════
    {
        id: 'ring_of_protection', name: 'Ring of Protection', nameFr: 'Anneau de protection', rarity: 'rare', type: 'ring',
        description: 'You gain a +1 bonus to AC and to all saving throws.',
        descriptionFr: 'Vous gagnez un bonus de +1 à la CA et à tous les jets de sauvegarde.',
        effects: ['+1 AC', '+1 to saving throws'], acBonus: 1, attunement: true, value: 3500, minLevel: 5,
    },
    {
        id: 'ring_of_fire_resistance', name: 'Ring of Fire Resistance', nameFr: 'Anneau de résistance au feu', rarity: 'rare', type: 'ring',
        description: 'You have resistance to fire damage while wearing this ruby-set ring.',
        descriptionFr: 'Vous avez la résistance aux dégâts de feu tant que vous portez cet anneau serti d’un rubis.',
        effects: ['Resistance to fire damage'], attunement: true, value: 4000, minLevel: 5,
    },
    {
        id: 'ring_of_warmth', name: 'Ring of Warmth', nameFr: 'Anneau de chaleur', rarity: 'uncommon', type: 'ring',
        description: 'You have resistance to cold damage and stay comfortable in freezing weather.',
        descriptionFr: 'Vous avez la résistance aux dégâts de froid et restez au chaud par temps glacial.',
        effects: ['Resistance to cold damage'], attunement: true, value: 1000, minLevel: 3,
    },
    {
        id: 'ring_of_free_action', name: 'Ring of Free Action', nameFr: 'Anneau d’action libre', rarity: 'rare', type: 'ring',
        description: 'Difficult terrain costs no extra movement; magic can neither paralyze nor restrain you.',
        descriptionFr: 'Le terrain difficile ne vous coûte aucun déplacement supplémentaire ; la magie ne peut ni vous paralyser ni vous entraver.',
        effects: ['Immune to magical paralysis and restraint'], attunement: true, value: 4000, minLevel: 6,
    },
    {
        id: 'ring_of_evasion', name: 'Ring of Evasion', nameFr: 'Anneau d’esquive', rarity: 'rare', type: 'ring',
        description: 'Has 3 charges, regained each dawn: when you fail a DEX save, spend 1 charge to succeed instead.',
        descriptionFr: 'Possède 3 charges, récupérées à l’aube : quand vous ratez un jet de DEX, dépensez 1 charge pour réussir à la place.',
        effects: ['3 charges/day: turn a failed DEX save into a success'], attunement: true, value: 5000, minLevel: 7,
    },
    {
        id: 'ring_of_regeneration', name: 'Ring of Regeneration', nameFr: 'Anneau de régénération', rarity: 'very rare', type: 'ring',
        description: 'You regain 1d6 hit points every 10 minutes and regrow lost body parts over time.',
        descriptionFr: 'Vous récupérez 1d6 points de vie toutes les 10 minutes et les membres perdus repoussent avec le temps.',
        effects: ['Regain 1d6 HP every 10 minutes'], attunement: true, value: 12000, minLevel: 9,
    },

    // ═══════════════════════════ AMULETS ═══════════════════════════
    {
        id: 'amulet_of_health', name: 'Amulet of Health', nameFr: 'Amulette de santé', rarity: 'rare', type: 'amulet',
        description: 'Your Constitution score is 19 while you wear this amulet.',
        descriptionFr: 'Votre valeur de Constitution est de 19 tant que vous portez cette amulette.',
        effects: ['Sets CON to 19'], attunement: true, value: 4000, minLevel: 6,
    },
    {
        id: 'amulet_of_proof_against_detection', name: 'Amulet of Proof against Detection and Location', nameFr: 'Amulette antidétection', rarity: 'uncommon', type: 'amulet',
        description: 'You are hidden from divination magic and scrying sensors.',
        descriptionFr: 'Vous êtes caché de la magie de divination et des capteurs de scrutation.',
        effects: ['Hidden from divination magic'], attunement: true, value: 1500, minLevel: 3,
    },
    {
        id: 'periapt_of_wound_closure', name: 'Periapt of Wound Closure', nameFr: 'Périapte de fermeture des plaies', rarity: 'uncommon', type: 'amulet',
        description: 'You stabilize automatically when dying, and hit dice healing is doubled.',
        descriptionFr: 'Vous vous stabilisez automatiquement quand vous êtes mourant, et les soins par dés de vie sont doublés.',
        effects: ['Stabilize automatically when dying'], attunement: true, value: 1000, minLevel: 2,
    },

    // ═══════════════════════════ CLOAKS ═══════════════════════════
    {
        id: 'cloak_of_protection', name: 'Cloak of Protection', nameFr: 'Cape de protection', rarity: 'uncommon', type: 'cloak',
        description: 'You gain a +1 bonus to AC and to all saving throws.',
        descriptionFr: 'Vous gagnez un bonus de +1 à la CA et à tous les jets de sauvegarde.',
        effects: ['+1 AC', '+1 to saving throws'], acBonus: 1, attunement: true, value: 1500, minLevel: 3,
    },
    {
        id: 'cloak_of_elvenkind', name: 'Cloak of Elvenkind', nameFr: 'Cape elfique', rarity: 'uncommon', type: 'cloak',
        description: 'With the hood up, you have advantage on Stealth checks and observers have disadvantage to spot you.',
        descriptionFr: 'Capuche relevée, vous avez l’avantage aux tests de Discrétion et les observateurs ont un désavantage pour vous repérer.',
        effects: ['Advantage on Stealth checks (hood up)'], attunement: true, value: 1200, minLevel: 3,
    },
    {
        id: 'cloak_of_displacement', name: 'Cloak of Displacement', nameFr: 'Cape de déplacement', rarity: 'rare', type: 'cloak',
        description: 'You appear to stand slightly elsewhere: attack rolls against you have disadvantage until you take damage.',
        descriptionFr: 'Vous semblez vous tenir légèrement ailleurs : les attaques contre vous ont un désavantage jusqu’à ce que vous subissiez des dégâts.',
        effects: ['Attackers have disadvantage until you take damage'], attunement: true, value: 6000, minLevel: 8,
    },

    // ═══════════════════════════ BOOTS ═══════════════════════════
    {
        id: 'boots_of_elvenkind', name: 'Boots of Elvenkind', nameFr: 'Bottes elfiques', rarity: 'uncommon', type: 'boots',
        description: 'Your steps make no sound; advantage on Stealth checks that rely on moving silently.',
        descriptionFr: 'Vos pas ne font aucun bruit ; avantage aux tests de Discrétion liés au silence.',
        effects: ['Advantage on Stealth checks (silent movement)'], value: 1000, minLevel: 2,
    },
    {
        id: 'boots_of_striding_and_springing', name: 'Boots of Striding and Springing', nameFr: 'Bottes de sept lieues (foulée et saut)', rarity: 'uncommon', type: 'boots',
        description: 'Your walking speed increases and your jump distance triples.',
        descriptionFr: 'Votre vitesse de marche augmente et votre distance de saut est triplée.',
        effects: ['+10 speed', 'Jump distance tripled'], attunement: true, value: 1000, minLevel: 3,
    },
    {
        id: 'winged_boots', name: 'Winged Boots', nameFr: 'Bottes ailées', rarity: 'uncommon', type: 'boots',
        description: 'You gain a flying speed equal to your walking speed, up to 4 hours a day.',
        descriptionFr: 'Vous gagnez une vitesse de vol égale à votre vitesse de marche, jusqu’à 4 heures par jour.',
        effects: ['Fly speed equal to walking speed (4 hours/day)'], attunement: true, value: 2000, minLevel: 5,
    },
    {
        id: 'boots_of_speed', name: 'Boots of Speed', nameFr: 'Bottes de célérité', rarity: 'rare', type: 'boots',
        description: 'Click the heels: your speed doubles and opportunity attacks against you have disadvantage (10 minutes/day).',
        descriptionFr: 'Claquez les talons : votre vitesse double et les attaques d’opportunité contre vous ont un désavantage (10 minutes/jour).',
        effects: ['Double walking speed when activated (10 minutes/day)'], attunement: true, value: 4000, minLevel: 7,
    },

    // ═══════════════════════════ GLOVES ═══════════════════════════
    {
        id: 'gauntlets_of_ogre_power', name: 'Gauntlets of Ogre Power', nameFr: 'Gantelets de force d’ogre', rarity: 'uncommon', type: 'gloves',
        description: 'Your Strength score is 19 while you wear these gauntlets.',
        descriptionFr: 'Votre valeur de Force est de 19 tant que vous portez ces gantelets.',
        effects: ['Sets STR to 19'], attunement: true, value: 1500, minLevel: 3,
    },
    {
        id: 'gloves_of_missile_snaring', name: 'Gloves of Missile Snaring', nameFr: 'Gants d’interception de projectiles', rarity: 'uncommon', type: 'gloves',
        description: 'As a reaction, reduce ranged weapon damage against you by 1d10 + DEX; if reduced to 0, catch the missile.',
        descriptionFr: 'En réaction, réduisez les dégâts d’une arme à distance de 1d10 + DEX ; réduits à 0, vous attrapez le projectile.',
        effects: ['Reaction: reduce ranged weapon damage (see description)'], attunement: true, value: 1000, minLevel: 3,
    },
    {
        id: 'gloves_of_thievery', name: 'Gloves of Thievery', nameFr: 'Gants de voleur', rarity: 'uncommon', type: 'gloves',
        description: 'Invisible while worn. +5 to Sleight of Hand checks and to picking locks.',
        descriptionFr: 'Invisibles une fois portés. +5 aux tests d’Escamotage et de crochetage.',
        effects: ['+5 to Sleight of Hand and lockpicking checks'], value: 1200, minLevel: 3,
    },

    // ═══════════════════════════ BELTS OF GIANT STRENGTH ═══════════════════════════
    {
        id: 'belt_of_hill_giant_strength', name: 'Belt of Hill Giant Strength', nameFr: 'Ceinturon de force de géant des collines', rarity: 'rare', type: 'belt',
        description: 'Your Strength score is 21 while you wear this belt.',
        descriptionFr: 'Votre valeur de Force est de 21 tant que vous portez ce ceinturon.',
        effects: ['Sets STR to 21'], attunement: true, value: 5000, minLevel: 7,
    },
    {
        id: 'belt_of_stone_giant_strength', name: 'Belt of Stone Giant Strength', nameFr: 'Ceinturon de force de géant des pierres', rarity: 'very rare', type: 'belt',
        description: 'Your Strength score is 23 while you wear this belt.',
        descriptionFr: 'Votre valeur de Force est de 23 tant que vous portez ce ceinturon.',
        effects: ['Sets STR to 23'], attunement: true, value: 15000, minLevel: 9,
    },
    {
        id: 'belt_of_fire_giant_strength', name: 'Belt of Fire Giant Strength', nameFr: 'Ceinturon de force de géant du feu', rarity: 'very rare', type: 'belt',
        description: 'Your Strength score is 25 while you wear this belt.',
        descriptionFr: 'Votre valeur de Force est de 25 tant que vous portez ce ceinturon.',
        effects: ['Sets STR to 25'], attunement: true, value: 25000, minLevel: 10,
    },
    {
        id: 'belt_of_cloud_giant_strength', name: 'Belt of Cloud Giant Strength', nameFr: 'Ceinturon de force de géant des nuages', rarity: 'legendary', type: 'belt',
        description: 'Your Strength score is 27 while you wear this belt.',
        descriptionFr: 'Votre valeur de Force est de 27 tant que vous portez ce ceinturon.',
        effects: ['Sets STR to 27'], attunement: true, value: 60000, minLevel: 10,
    },
    {
        id: 'belt_of_storm_giant_strength', name: 'Belt of Storm Giant Strength', nameFr: 'Ceinturon de force de géant des tempêtes', rarity: 'legendary', type: 'belt',
        description: 'Your Strength score is 29 while you wear this belt.',
        descriptionFr: 'Votre valeur de Force est de 29 tant que vous portez ce ceinturon.',
        effects: ['Sets STR to 29'], attunement: true, value: 100000, minLevel: 10,
    },

    // ═══════════════════════════ BRACERS ═══════════════════════════
    {
        id: 'bracers_of_archery', name: 'Bracers of Archery', nameFr: 'Brassards d’archer', rarity: 'uncommon', type: 'bracers',
        description: 'You gain proficiency with longbows and shortbows and +2 to damage rolls with such weapons.',
        descriptionFr: 'Vous gagnez la maîtrise des arcs longs et courts et +2 aux jets de dégâts avec ces armes.',
        effects: ['+2 to damage rolls with longbows and shortbows'], attunement: true, value: 1500, minLevel: 3,
    },
    {
        id: 'bracers_of_defense', name: 'Bracers of Defense', nameFr: 'Brassards de défense', rarity: 'rare', type: 'bracers',
        description: 'You gain +2 AC while wearing no armor and using no shield.',
        descriptionFr: 'Vous gagnez +2 à la CA si vous ne portez ni armure ni bouclier.',
        effects: ['+2 AC (no armor, no shield)'], acBonus: 2, attunement: true, value: 6000, minLevel: 7,
    },

    // ═══════════════════════════ WONDROUS ITEMS ═══════════════════════════
    {
        id: 'headband_of_intellect', name: 'Headband of Intellect', nameFr: 'Serre-tête d’intellect', rarity: 'uncommon', type: 'wondrous',
        description: 'Your Intelligence score is 19 while you wear this headband.',
        descriptionFr: 'Votre valeur d’Intelligence est de 19 tant que vous portez ce serre-tête.',
        effects: ['Sets INT to 19'], attunement: true, value: 1500, minLevel: 3, slot: 'head',
    },
    {
        id: 'ioun_stone_protection', name: 'Ioun Stone of Protection', nameFr: 'Pierre de Ioun de protection', rarity: 'rare', type: 'wondrous',
        description: 'This dusty rose prism orbits your head and grants +1 AC.',
        descriptionFr: 'Ce prisme rose orbite autour de votre tête et confère +1 à la CA.',
        effects: ['+1 AC'], acBonus: 1, attunement: true, value: 4000, minLevel: 6, slot: 'head',
    },
    {
        id: 'bag_of_holding', name: 'Bag of Holding', nameFr: 'Sac sans fond', rarity: 'uncommon', type: 'wondrous',
        description: 'This bag holds up to 500 pounds in an extradimensional space and always weighs 15 pounds.',
        descriptionFr: 'Ce sac contient jusqu’à 250 kg dans un espace extradimensionnel et pèse toujours 7 kg.',
        effects: ['Holds 500 lb in an extradimensional space'], value: 500, minLevel: 1, slot: 'back',
    },
    {
        id: 'stone_of_good_luck', name: 'Stone of Good Luck', nameFr: 'Pierre porte-bonheur', rarity: 'uncommon', type: 'wondrous',
        description: 'While this agate is on your person, you gain +1 to ability checks and saving throws.',
        descriptionFr: 'Tant que cette agate est sur vous, vous gagnez +1 aux tests de caractéristique et aux jets de sauvegarde.',
        effects: ['+1 to ability checks and saving throws'], attunement: true, value: 1500, minLevel: 3,
    },
    {
        id: 'pearl_of_power', name: 'Pearl of Power', nameFr: 'Perle de pouvoir', rarity: 'uncommon', type: 'wondrous',
        description: 'Once per dawn, a spellcaster can use it to regain one expended spell slot of 3rd level or lower.',
        descriptionFr: 'Une fois par aube, un lanceur de sorts peut récupérer un emplacement de sort dépensé de niveau 3 ou moins.',
        effects: ['Once per dawn: regain a spell slot (3rd level or lower)'], attunement: true, value: 1500, minLevel: 4,
    },

    // ═══════════════════════════ WANDS ═══════════════════════════
    {
        id: 'wand_of_magic_missiles', name: 'Wand of Magic Missiles', nameFr: 'Baguette de projectiles magiques', rarity: 'uncommon', type: 'wand',
        description: 'Has 7 charges, regains 1d6+1 each dawn. Spend 1-3 charges to cast Magic Missile at matching level.',
        descriptionFr: 'Possède 7 charges, récupère 1d6+1 à l’aube. Dépensez 1 à 3 charges pour lancer Projectile magique au niveau correspondant.',
        effects: ['7 charges: cast Magic Missile'], value: 1500, minLevel: 3,
    },
    {
        id: 'wand_of_magic_detection', name: 'Wand of Magic Detection', nameFr: 'Baguette de détection de la magie', rarity: 'uncommon', type: 'wand',
        description: 'Has 3 charges, regains 1d3 each dawn. Spend 1 charge to cast Detect Magic.',
        descriptionFr: 'Possède 3 charges, récupère 1d3 à l’aube. Dépensez 1 charge pour lancer Détection de la magie.',
        effects: ['3 charges: cast Detect Magic'], value: 800, minLevel: 1,
    },
    {
        id: 'wand_of_fireballs', name: 'Wand of Fireballs', nameFr: 'Baguette de boules de feu', rarity: 'rare', type: 'wand',
        description: 'Has 7 charges. Spend 1+ charges to cast Fireball (DC 15), higher levels for extra charges.',
        descriptionFr: 'Possède 7 charges. Dépensez 1 charge ou plus pour lancer Boule de feu (DD 15).',
        effects: ['7 charges: cast Fireball (DC 15)'], attunement: true, value: 8000, minLevel: 8,
    },
    {
        id: 'wand_of_lightning_bolts', name: 'Wand of Lightning Bolts', nameFr: 'Baguette d’éclairs', rarity: 'rare', type: 'wand',
        description: 'Has 7 charges. Spend 1+ charges to cast Lightning Bolt (DC 15).',
        descriptionFr: 'Possède 7 charges. Dépensez 1 charge ou plus pour lancer Éclair (DD 15).',
        effects: ['7 charges: cast Lightning Bolt (DC 15)'], attunement: true, value: 8000, minLevel: 8,
    },

    // ═══════════════════════════ CONSUMABLES — POTIONS ═══════════════════════════
    {
        id: 'potion_of_healing', name: 'Potion of Healing', nameFr: 'Potion de soins', rarity: 'common', type: 'potion',
        description: 'Drink as an action to regain 2d4+2 hit points.',
        descriptionFr: 'Buvez par une action pour récupérer 2d4+2 points de vie.',
        effects: ['Heals 2d4+2 HP'], value: 50, minLevel: 1,
    },
    {
        id: 'potion_of_greater_healing', name: 'Potion of Greater Healing', nameFr: 'Potion de soins supérieurs', rarity: 'uncommon', type: 'potion',
        description: 'Drink as an action to regain 4d4+4 hit points.',
        descriptionFr: 'Buvez par une action pour récupérer 4d4+4 points de vie.',
        effects: ['Heals 4d4+4 HP'], value: 150, minLevel: 3,
    },
    {
        id: 'potion_of_superior_healing', name: 'Potion of Superior Healing', nameFr: 'Potion de soins excellents', rarity: 'rare', type: 'potion',
        description: 'Drink as an action to regain 8d4+8 hit points.',
        descriptionFr: 'Buvez par une action pour récupérer 8d4+8 points de vie.',
        effects: ['Heals 8d4+8 HP'], value: 450, minLevel: 6,
    },
    {
        id: 'potion_of_supreme_healing', name: 'Potion of Supreme Healing', nameFr: 'Potion de soins suprêmes', rarity: 'very rare', type: 'potion',
        description: 'Drink as an action to regain 10d4+20 hit points.',
        descriptionFr: 'Buvez par une action pour récupérer 10d4+20 points de vie.',
        effects: ['Heals 10d4+20 HP'], value: 1350, minLevel: 9,
    },
    {
        id: 'potion_of_fire_resistance', name: 'Potion of Fire Resistance', nameFr: 'Potion de résistance au feu', rarity: 'uncommon', type: 'potion',
        description: 'You gain resistance to fire damage for 1 hour.',
        descriptionFr: 'Vous gagnez la résistance aux dégâts de feu pendant 1 heure.',
        effects: ['Resistance to fire damage for 1 hour'], value: 300, minLevel: 3,
    },
    {
        id: 'potion_of_cold_resistance', name: 'Potion of Cold Resistance', nameFr: 'Potion de résistance au froid', rarity: 'uncommon', type: 'potion',
        description: 'You gain resistance to cold damage for 1 hour.',
        descriptionFr: 'Vous gagnez la résistance aux dégâts de froid pendant 1 heure.',
        effects: ['Resistance to cold damage for 1 hour'], value: 300, minLevel: 3,
    },
    {
        id: 'potion_of_fire_breath', name: 'Potion of Fire Breath', nameFr: 'Potion de souffle de feu', rarity: 'uncommon', type: 'potion',
        description: 'For 1 hour, you can exhale fire (bonus action, 4d6 fire, DEX save DC 13 for half, 3 uses).',
        descriptionFr: 'Pendant 1 heure, vous pouvez cracher du feu (action bonus, 4d6 feu, sauvegarde DEX DD 13 pour moitié, 3 utilisations).',
        effects: ['Exhale fire 3 times (see description)'], value: 150, minLevel: 2,
    },
    {
        id: 'potion_of_hill_giant_strength', name: 'Potion of Hill Giant Strength', nameFr: 'Potion de force de géant des collines', rarity: 'uncommon', type: 'potion',
        description: 'Your Strength score is 21 for 1 hour.',
        descriptionFr: 'Votre valeur de Force est de 21 pendant 1 heure.',
        effects: ['Sets STR to 21 for 1 hour'], value: 400, minLevel: 4,
    },
    {
        id: 'potion_of_heroism', name: 'Potion of Heroism', nameFr: 'Potion d’héroïsme', rarity: 'rare', type: 'potion',
        description: 'You gain 10 temporary hit points and are blessed (as the Bless spell) for 1 hour.',
        descriptionFr: 'Vous gagnez 10 points de vie temporaires et êtes béni (comme le sort Bénédiction) pendant 1 heure.',
        effects: ['10 temporary HP and Bless for 1 hour'], value: 750, minLevel: 5,
    },
    {
        id: 'potion_of_invisibility', name: 'Potion of Invisibility', nameFr: 'Potion d’invisibilité', rarity: 'very rare', type: 'potion',
        description: 'You become invisible for 1 hour, or until you attack or cast a spell.',
        descriptionFr: 'Vous devenez invisible pendant 1 heure, ou jusqu’à ce que vous attaquiez ou lanciez un sort.',
        effects: ['Invisible for 1 hour (breaks on attack or spell)'], value: 5000, minLevel: 8,
    },
    {
        id: 'potion_of_speed', name: 'Potion of Speed', nameFr: 'Potion de célérité', rarity: 'very rare', type: 'potion',
        description: 'You gain the effect of the Haste spell for 1 minute, without concentration.',
        descriptionFr: 'Vous bénéficiez des effets du sort Hâte pendant 1 minute, sans concentration.',
        effects: ['Haste for 1 minute (no concentration)'], value: 5000, minLevel: 8,
    },
    {
        id: 'potion_of_flying', name: 'Potion of Flying', nameFr: 'Potion de vol', rarity: 'very rare', type: 'potion',
        description: 'You gain a flying speed equal to your walking speed for 1 hour.',
        descriptionFr: 'Vous gagnez une vitesse de vol égale à votre vitesse de marche pendant 1 heure.',
        effects: ['Fly speed equal to walking speed for 1 hour'], value: 5000, minLevel: 8,
    },

    // ═══════════════════════════ CONSUMABLES — OILS & SUNDRIES ═══════════════════════════
    {
        id: 'antitoxin', name: 'Antitoxin', nameFr: 'Antidote', rarity: 'common', type: 'potion',
        description: 'For 1 hour after drinking, you have advantage on saving throws against poison.',
        descriptionFr: 'Pendant 1 heure après ingestion, vous avez l’avantage aux jets de sauvegarde contre le poison.',
        effects: ['Advantage on saves against poison for 1 hour'], value: 50, minLevel: 1,
    },
    {
        id: 'potion_of_climbing', name: 'Potion of Climbing', nameFr: 'Potion d’escalade', rarity: 'common', type: 'potion',
        description: 'For 1 hour you gain a climbing speed equal to your walking speed and advantage on climbing checks.',
        descriptionFr: 'Pendant 1 heure, vous gagnez une vitesse d’escalade égale à votre vitesse de marche et l’avantage aux tests d’escalade.',
        effects: ['Climbing speed equal to walking speed for 1 hour'], value: 75, minLevel: 1,
    },
    {
        id: 'oil_of_slipperiness', name: 'Oil of Slipperiness', nameFr: 'Huile de glissement', rarity: 'uncommon', type: 'potion',
        description: 'Coat yourself to gain Freedom of Movement for 8 hours, or pour it out as a Grease spell.',
        descriptionFr: 'Enduisez-vous pour bénéficier de Liberté de mouvement pendant 8 heures, ou versez-la comme un sort de Graisse.',
        effects: ['Freedom of Movement for 8 hours, or Grease'], value: 400, minLevel: 3,
    },
    {
        id: 'oil_of_sharpness', name: 'Oil of Sharpness', nameFr: 'Huile d’affûtage', rarity: 'very rare', type: 'potion',
        description: 'Coat one weapon or 5 pieces of ammunition: the weapon is magical with a +3 bonus for 1 hour.',
        descriptionFr: 'Enduisez une arme ou 5 munitions : l’arme devient magique avec un bonus de +3 pendant 1 heure.',
        effects: ['Coated weapon gains a +3 bonus for 1 hour'], value: 3200, minLevel: 9,
    },
    {
        id: 'dust_of_disappearance', name: 'Dust of Disappearance', nameFr: 'Poussière de disparition', rarity: 'uncommon', type: 'potion',
        description: 'Thrown in the air, it renders you and nearby creatures invisible for 2d4 minutes.',
        descriptionFr: 'Jetée en l’air, elle rend invisibles vous et les créatures proches pendant 2d4 minutes.',
        effects: ['Invisibility for 2d4 minutes (area)'], value: 300, minLevel: 3,
    },

    // ═══════════════════════════ CONSUMABLES — SCROLLS ═══════════════════════════
    {
        id: 'spell_scroll_cantrip', name: 'Spell Scroll (Cantrip)', nameFr: 'Parchemin de sort (tour de magie)', rarity: 'common', type: 'scroll',
        description: 'A scroll bearing one cantrip; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un tour de magie ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed cantrip once'], value: 30, minLevel: 1,
    },
    {
        id: 'spell_scroll_1st', name: 'Spell Scroll (1st Level)', nameFr: 'Parchemin de sort (niveau 1)', rarity: 'common', type: 'scroll',
        description: 'A scroll bearing one 1st-level spell; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un sort de niveau 1 ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed 1st-level spell once'], value: 60, minLevel: 1,
    },
    {
        id: 'spell_scroll_2nd', name: 'Spell Scroll (2nd Level)', nameFr: 'Parchemin de sort (niveau 2)', rarity: 'uncommon', type: 'scroll',
        description: 'A scroll bearing one 2nd-level spell; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un sort de niveau 2 ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed 2nd-level spell once'], value: 150, minLevel: 3,
    },
    {
        id: 'spell_scroll_3rd', name: 'Spell Scroll (3rd Level)', nameFr: 'Parchemin de sort (niveau 3)', rarity: 'uncommon', type: 'scroll',
        description: 'A scroll bearing one 3rd-level spell; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un sort de niveau 3 ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed 3rd-level spell once'], value: 300, minLevel: 5,
    },
    {
        id: 'spell_scroll_4th', name: 'Spell Scroll (4th Level)', nameFr: 'Parchemin de sort (niveau 4)', rarity: 'rare', type: 'scroll',
        description: 'A scroll bearing one 4th-level spell; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un sort de niveau 4 ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed 4th-level spell once'], value: 500, minLevel: 7,
    },
    {
        id: 'spell_scroll_5th', name: 'Spell Scroll (5th Level)', nameFr: 'Parchemin de sort (niveau 5)', rarity: 'rare', type: 'scroll',
        description: 'A scroll bearing one 5th-level spell; the DM picks or rolls which spell.',
        descriptionFr: 'Un parchemin portant un sort de niveau 5 ; le MJ choisit ou tire le sort.',
        effects: ['Cast the inscribed 5th-level spell once'], value: 1000, minLevel: 9,
    },
];

// ═══════════════════════════════ LOOT TABLES ═══════════════════════════════

export interface LootTableTier {
    /** Inclusive party-level bounds for this tier. */
    minLevel: number;
    maxLevel: number;
    /** Relative rarity weights (they do not need to sum to 100). */
    weights: Record<MagicItemRarity, number>;
}

export const LOOT_TABLES: LootTableTier[] = [
    { minLevel: 1, maxLevel: 4, weights: { common: 70, uncommon: 25, rare: 5, 'very rare': 0, legendary: 0 } },
    { minLevel: 5, maxLevel: 8, weights: { common: 35, uncommon: 40, rare: 20, 'very rare': 5, legendary: 0 } },
    { minLevel: 9, maxLevel: 20, weights: { common: 15, uncommon: 35, rare: 30, 'very rare': 15, legendary: 5 } },
];

export const RARITY_ORDER: MagicItemRarity[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];

// ═══════════════════════════════ HELPERS ═══════════════════════════════

function normalizeName(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .toLowerCase()
        .replace(/[’']/g, "'")
        .trim();
}

/** Case- and accent-insensitive lookup on both `name` and `nameFr`
 *  (exact match first, then containment either way). */
export function getMagicItemByName(name: string): MagicItemDef | undefined {
    const key = normalizeName(name);
    if (!key) return undefined;
    return (
        MAGIC_ITEMS.find(item => normalizeName(item.name) === key || normalizeName(item.nameFr) === key) ||
        MAGIC_ITEMS.find(item => {
            const en = normalizeName(item.name);
            const fr = normalizeName(item.nameFr);
            return en.includes(key) || fr.includes(key) || key.includes(en) || key.includes(fr);
        })
    );
}

const DEFAULT_SLOT_BY_TYPE: Record<MagicItemType, ItemSlot> = {
    weapon: 'mainHand', armor: 'chest', shield: 'offHand',
    ring: 'ring', amulet: 'neck', cloak: 'back', boots: 'feet',
    gloves: 'hands', belt: 'waist', bracers: 'hands',
    wand: 'none', potion: 'none', scroll: 'none', wondrous: 'none',
};

const ITEM_TYPE_BY_MAGIC_TYPE: Record<MagicItemType, Item['type']> = {
    weapon: 'weapon', armor: 'armor', shield: 'armor',
    ring: 'misc', amulet: 'misc', cloak: 'misc', boots: 'misc',
    gloves: 'misc', belt: 'misc', bracers: 'misc', wondrous: 'misc',
    wand: 'misc', potion: 'consumable', scroll: 'consumable',
};

/** Convert a catalogue entry into a runtime inventory Item (unequipped). */
export function magicItemToInventoryItem(def: MagicItemDef, lang: 'en' | 'fr' = 'en'): Item {
    return {
        id: `${def.id}_${Math.random().toString(36).slice(2, 9)}`,
        name: lang === 'fr' ? def.nameFr : def.name,
        type: ITEM_TYPE_BY_MAGIC_TYPE[def.type],
        slot: def.slot ?? DEFAULT_SLOT_BY_TYPE[def.type],
        weight: def.type === 'armor' ? 20 : def.type === 'weapon' ? 3 : 1,
        quantity: 1,
        equipped: false,
        description: lang === 'fr' ? def.descriptionFr : def.description,
        effect: def.effects.join('; '),
        properties: def.properties,
        armorType: def.armorType,
        baseAC: def.baseAC,
        maxDexBonus: def.maxDexBonus,
        stealthDisadvantage: def.stealthDisadvantage,
        damageDice: def.damageDice,
        damageType: def.damageType,
        range: def.range,
        acBonus: def.acBonus,
        value: `${def.value} po`,
    };
}

/** All items of one rarity (useful for shops and DM listings). */
export function getMagicItemsByRarity(rarity: MagicItemRarity): MagicItemDef[] {
    return MAGIC_ITEMS.filter(item => item.rarity === rarity);
}
