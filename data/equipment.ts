import { Item, Weapon, isRangedWeapon } from '../types';
import { getWeapon as getWeaponTemplate } from './weapons';

export const FIGHTING_STYLES = [
    { name: "Archery", desc: "+2 bonus to attack rolls you make with ranged weapons." },
    { name: "Defense", desc: "While you are wearing armor, you gain a +1 bonus to AC." },
    { name: "Dueling", desc: "When wielding a melee weapon in one hand and no other weapon, you gain a +2 bonus to damage rolls with that weapon." },
    { name: "Great Weapon Fighting", desc: "Reroll 1 or 2 on damage dice for attacks with two-handed melee weapons." },
    { name: "Protection", desc: "When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll (shield required)." },
    { name: "Two-Weapon Fighting", desc: "When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack." }
];

// Finesse weapons - use higher of STR or DEX
// da-m6 — Dart est finesse en SRD (l'heuristique legacy l'oubliait).
export const FINESSE_WEAPONS = ['Shortsword', 'Dagger', 'Rapier', 'Scimitar', 'Whip', 'Dart'];

const ARMOR_STATS: Record<string, Pick<Item, 'armorType' | 'baseAC' | 'maxDexBonus' | 'acBonus' | 'stealthDisadvantage'>> = {
    'robes': { armorType: 'light', baseAC: 10 },
    'simple clothes': { armorType: 'light', baseAC: 10 },
    'leather armor': { armorType: 'light', baseAC: 11 },
    'hide armor': { armorType: 'medium', baseAC: 12, maxDexBonus: 2 },
    'scale mail': { armorType: 'medium', baseAC: 14, maxDexBonus: 2, stealthDisadvantage: true },
    'chain mail': { armorType: 'heavy', baseAC: 16, stealthDisadvantage: true },
    'shield': { armorType: 'shield', acBonus: 2 },
};

function normalizeWeaponName(name: string): string {
    const cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim();
    const singulars: Record<string, string> = {
        Daggers: 'Dagger',
        Javelins: 'Javelin',
        Handaxes: 'Handaxe',
        Darts: 'Dart',
    };
    return singulars[cleaned] || cleaned;
}

// Armes à distance en EN **et en FR** : le MJ et la boutique nomment les objets
// en français ("Arc long", "Arbalète lourde"), et sans ces alias l'arme était
// classée en mêlée (pas de DEX, pas de portée, pas de style Archerie).
const RANGED_WEAPON_WORDS = ['bow', 'crossbow', 'sling', 'arc ', 'arc long', 'arc court', 'arbalete', 'arbalète', 'fronde'];
// da-m6 — glaive, hallebarde, pique et maul sont à deux mains en SRD.
const TWO_HANDED_WORDS = ['longbow', 'shortbow', 'light crossbow', 'heavy crossbow', 'greatsword', 'greataxe', 'arc long', 'arc court', 'arbalete legere', 'arbalète légère', 'arbalete lourde', 'arbalète lourde', 'epee a deux mains', 'épée à deux mains', 'hache a deux mains', 'hache à deux mains', 'glaive', 'halberd', 'hallebarde', 'pike', 'pique', 'maul', 'maillet d\'armes'];

function looksRanged(lower: string): boolean {
    // `arc` seul est trop court (arcane, marc…) : on borne le mot.
    return RANGED_WEAPON_WORDS.some(value => lower.includes(value)) || /\barcs?\b/.test(lower);
}

function inferWeaponProperties(name: string, effect = ''): string[] {
    const baseName = normalizeWeaponName(name);
    const lower = `${baseName} ${effect}`.toLowerCase();
    const properties = new Set<string>();
    if (FINESSE_WEAPONS.includes(baseName)) properties.add('finesse');
    if (['dagger', 'handaxe', 'shortsword', 'scimitar', 'dart', 'dague', 'hachette', 'epee courte', 'épée courte'].some(value => lower.includes(value))) properties.add('light');
    if (TWO_HANDED_WORDS.some(value => lower.includes(value))) properties.add('two-handed');
    if (lower.includes('thrown') || ['javelin', 'dagger', 'handaxe', 'dart', 'javeline', 'dague', 'hachette'].some(value => lower.includes(value))) properties.add('thrown');
    if (looksRanged(lower)) {
        properties.add('ranged');
        // Propriété SRD canonique : c'est elle que lit le moteur (Tireur d'élite,
        // bandes de distance, tir à bout portant).
        properties.add('ammunition');
    }
    return Array.from(properties);
}

function inferWeaponRange(name: string, effect = ''): string | undefined {
    const rangeMatch = effect.match(/(\d+\s*\/\s*\d+)/);
    if (rangeMatch) return rangeMatch[1].replace(/\s+/g, '');
    const lower = name.toLowerCase();
    if (lower.includes('longbow') || lower.includes('arc long')) return '150/600';
    if (lower.includes('shortbow') || lower.includes('arc court')) return '80/320';
    if (lower.includes('heavy crossbow') || lower.includes('arbalète lourde') || lower.includes('arbalete lourde')) return '100/400';
    if (lower.includes('hand crossbow') || lower.includes('arbalète de poing') || lower.includes('arbalete de poing')) return '30/120';
    if (lower.includes('crossbow') || lower.includes('arbalète') || lower.includes('arbalete')) return '80/320';
    if (lower.includes('javelin') || lower.includes('javeline')) return '30/120';
    if (lower.includes('dagger') || lower.includes('dart') || lower.includes('dague') || lower.includes('fléchette') || lower.includes('flechette')) return '20/60';
    if (lower.includes('handaxe') || lower.includes('hachette')) return '20/60';
    if (lower.includes('sling') || lower.includes('fronde')) return '30/120';
    return undefined;
}

function inferDamageType(effect = ''): Item['damageType'] {
    const lower = effect.toLowerCase();
    if (lower.includes('slash')) return 'slashing';
    if (lower.includes('pierce')) return 'piercing';
    if (lower.includes('bludgeon')) return 'bludgeoning';
    return undefined;
}

/**
 * Complète une arme reçue « nue » (butin/objet créé par le MJ, ancien save) :
 * dés, type de dégâts, propriétés et PORTÉE. On consulte d'abord la table SRD
 * (noms EN **et** FR : « Arc long » → Longbow) avant de retomber sur les
 * heuristiques de nom. Sans ça, un arc offert par le MJ n'avait ni portée ni
 * propriété « ammunition » et le moteur le traitait comme une arme de mêlée.
 */
export function enrichWeaponItem(item: Item): Item {
    if (item.type !== 'weapon') return item;
    const template = getWeaponTemplate(item.name);
    const merged: Item = {
        ...item,
        damageDice: item.damageDice || template?.damage,
        damageType: (item.damageType || template?.damageType) as Item['damageType'],
        properties: item.properties?.length
            ? item.properties
            : template
                ? [...template.properties.map(p => p.toLowerCase()), ...(template.category.includes('ranged') ? ['ranged'] : [])]
                : undefined,
        range: item.range || template?.range,
    };
    return normalizeStartingItem(merged);
}

function normalizeStartingItem(item: Item): Item {
    const effect = item.effect || '';
    if (item.type === 'armor') {
        const exact = ARMOR_STATS[item.name.toLowerCase()];
        if (exact) return { ...item, ...exact };
    }
    if (item.type === 'weapon') {
        const damageDice = item.damageDice || effect.match(/(\d+d\d+)/)?.[1] || '1d4';
        const properties = item.properties || inferWeaponProperties(item.name, effect);
        return {
            ...item,
            damageDice,
            damageType: item.damageType || inferDamageType(effect),
            properties,
            range: item.range || inferWeaponRange(item.name, effect),
        };
    }
    return item;
}

export const getStartingEquipment = (cls: string, bg: string, style: string): Item[] => {
    let items: Item[] = [];
    const id = () => Math.random().toString(36).substr(2, 9);

    // 1. Base Class Gear (Melee + Ranged + Armor per PHB)
    switch (cls) {
        case 'Fighter':
            items.push(
                { id: id(), name: 'Chain Mail', weight: 55, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '16 AC' },
                { id: id(), name: 'Longsword', weight: 3, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d8 Slash' },
                { id: id(), name: 'Longbow', weight: 2, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d8 Pierce' },
                { id: id(), name: 'Arrows', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false }
            );
            break;
        case 'Paladin':
            items.push(
                { id: id(), name: 'Chain Mail', weight: 55, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '16 AC' },
                { id: id(), name: 'Warhammer', weight: 2, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d8 Bludgeon' },
                { id: id(), name: 'Javelins', weight: 2, quantity: 5, type: 'weapon', slot: 'none', equipped: false, effect: '1d6 Pierce (thrown)' },
                { id: id(), name: 'Holy Symbol', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Cleric':
            items.push(
                { id: id(), name: 'Scale Mail', weight: 45, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '14 AC' },
                { id: id(), name: 'Mace', weight: 4, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Bludgeon' },
                { id: id(), name: 'Light Crossbow', weight: 5, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d8 Pierce' },
                { id: id(), name: 'Crossbow Bolts', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false },
                { id: id(), name: 'Shield', weight: 6, quantity: 1, type: 'armor', slot: 'offHand', equipped: true, effect: '+2 AC' },
                { id: id(), name: 'Holy Symbol', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Mage':
        case 'Wizard':
            items.push(
                { id: id(), name: 'Robes', weight: 4, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '10 AC' },
                { id: id(), name: 'Quarterstaff', weight: 4, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Bludgeon' },
                { id: id(), name: 'Daggers', weight: 1, quantity: 2, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce (thrown 20/60)' },
                { id: id(), name: 'Spellbook', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Component Pouch', weight: 2, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Sorcerer':
            items.push(
                { id: id(), name: 'Robes', weight: 4, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '10 AC' },
                { id: id(), name: 'Daggers', weight: 1, quantity: 2, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d4 Pierce' },
                { id: id(), name: 'Light Crossbow', weight: 5, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d8 Pierce' },
                { id: id(), name: 'Crossbow Bolts', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false },
                { id: id(), name: 'Arcane Focus', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Warlock':
            items.push(
                { id: id(), name: 'Leather Armor', weight: 10, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '11 AC' },
                { id: id(), name: 'Quarterstaff', weight: 4, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Bludgeon' },
                { id: id(), name: 'Daggers', weight: 1, quantity: 2, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce (thrown 20/60)' },
                { id: id(), name: 'Arcane Focus', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Rogue':
            items.push(
                { id: id(), name: 'Leather Armor', weight: 10, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '11 AC' },
                { id: id(), name: 'Shortsword', weight: 2, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Pierce' },
                { id: id(), name: 'Shortbow', weight: 2, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d6 Pierce' },
                { id: id(), name: 'Arrows', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false },
                { id: id(), name: 'Daggers', weight: 1, quantity: 2, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce' },
                { id: id(), name: 'Thieves Tools', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Ranger':
            items.push(
                { id: id(), name: 'Leather Armor', weight: 10, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '11 AC' },
                { id: id(), name: 'Shortsword', weight: 2, quantity: 2, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Pierce' },
                { id: id(), name: 'Longbow', weight: 2, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d8 Pierce' },
                { id: id(), name: 'Arrows', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false }
            );
            break;
        case 'Barbarian':
            items.push(
                { id: id(), name: 'Hide Armor', weight: 12, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '12 AC' },
                { id: id(), name: 'Greataxe', weight: 7, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d12 Slash' },
                { id: id(), name: 'Javelins', weight: 2, quantity: 4, type: 'weapon', slot: 'none', equipped: false, effect: '1d6 Pierce (thrown 30/120)' },
                { id: id(), name: 'Handaxes', weight: 2, quantity: 2, type: 'weapon', slot: 'none', equipped: false, effect: '1d6 Slash (thrown)' }
            );
            break;
        case 'Bard':
            items.push(
                { id: id(), name: 'Leather Armor', weight: 10, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '11 AC' },
                { id: id(), name: 'Rapier', weight: 2, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d8 Pierce' },
                { id: id(), name: 'Light Crossbow', weight: 5, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d8 Pierce' },
                { id: id(), name: 'Crossbow Bolts', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false },
                { id: id(), name: 'Lute', weight: 2, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        case 'Monk':
            items.push(
                { id: id(), name: 'Simple Clothes', weight: 3, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '10 AC' },
                { id: id(), name: 'Shortsword', weight: 2, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Pierce' },
                { id: id(), name: 'Darts', weight: 0.25, quantity: 10, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce (thrown 20/60)' }
            );
            break;
        case 'Druid':
            items.push(
                { id: id(), name: 'Leather Armor', weight: 10, quantity: 1, type: 'armor', slot: 'chest', equipped: true, effect: '11 AC' },
                { id: id(), name: 'Scimitar', weight: 3, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d6 Slash' },
                { id: id(), name: 'Sling', weight: 0, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Bludgeon' },
                { id: id(), name: 'Sling Bullets', weight: 1.5, quantity: 20, type: 'ammo', slot: 'none', equipped: false },
                { id: id(), name: 'Druidic Focus', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false }
            );
            break;
        default:
            items.push({ id: id(), name: 'Dagger', weight: 1, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d4 Pierce' });
    }

    // 2. Fighting Style Adjustments
    if (style === 'Archery') {
        items.push(
            { id: id(), name: 'Longbow', weight: 2, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '1d8 Pierce' },
            { id: id(), name: 'Arrows', weight: 1, quantity: 20, type: 'ammo', slot: 'none', equipped: false }
        );
    }
    if (style === 'Protection') {
        items.push({ id: id(), name: 'Shield', weight: 6, quantity: 1, type: 'armor', slot: 'offHand', equipped: true, effect: '+2 AC' });
    }
    if (style === 'Two-Weapon Fighting') {
        items.push({ id: id(), name: 'Shortsword (Off)', weight: 2, quantity: 1, type: 'weapon', slot: 'offHand', equipped: true, effect: '1d6 Pierce' });
    }
    if (style === 'Great Weapon Fighting') {
        items = items.filter(i => i.name !== 'Longsword' && i.name !== 'Warhammer');
        items.push({ id: id(), name: 'Greatsword', weight: 6, quantity: 1, type: 'weapon', slot: 'mainHand', equipped: true, effect: '2d6 Slash' });
    }

    // 3. Background Equipment Packs (PHB-accurate)
    switch (bg) {
        case 'Acolyte':
            items.push(
                { id: id(), name: 'Holy Symbol', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true, description: 'Amulet of your faith' },
                { id: id(), name: 'Prayer Book', weight: 2, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Incense (5 sticks)', weight: 0.5, quantity: 5, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Vestments', weight: 4, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (15gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Criminal':
        case 'Charlatan':
            items.push(
                { id: id(), name: 'Crowbar', weight: 5, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Dark Common Clothes (Hood)', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Thieves\' Tools', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Disguise Kit', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (15gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Folk Hero':
            items.push(
                { id: id(), name: 'Artisan\'s Tools', weight: 5, quantity: 1, type: 'misc', slot: 'none', equipped: false, description: 'Smith, potter, or carpenter tools' },
                { id: id(), name: 'Shovel', weight: 5, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Iron Pot', weight: 10, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Noble':
            items.push(
                { id: id(), name: 'Fine Clothes', weight: 6, quantity: 1, type: 'misc', slot: 'none', equipped: false, description: 'High quality attire' },
                { id: id(), name: 'Signet Ring', weight: 0.1, quantity: 1, type: 'misc', slot: 'ring', equipped: true },
                { id: id(), name: 'Scroll of Pedigree', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (25gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Sage':
            items.push(
                { id: id(), name: 'Bottle of Black Ink', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Quill', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Small Knife', weight: 0.5, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce' },
                { id: id(), name: 'Letter from Mentor', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Soldier':
            items.push(
                { id: id(), name: 'Rank Insignia', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: true },
                { id: id(), name: 'Trophy from Enemy', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Playing Cards', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Urchin':
            items.push(
                { id: id(), name: 'Small Knife', weight: 0.5, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d4 Pierce' },
                { id: id(), name: 'Map of Your City', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Pet Mouse', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Token from Parents', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Hermit':
            items.push(
                { id: id(), name: 'Scroll of Discovery', weight: 0.1, quantity: 1, type: 'misc', slot: 'none', equipped: false, description: 'A secret you discovered' },
                { id: id(), name: 'Herbalism Kit', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Winter Blanket', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (5gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        case 'Outlander':
            items.push(
                { id: id(), name: 'Staff', weight: 4, quantity: 1, type: 'weapon', slot: 'none', equipped: false, effect: '1d6 Bludgeon' },
                { id: id(), name: 'Hunting Trap', weight: 25, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Trophy from Animal', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Traveler\'s Clothes', weight: 4, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
            break;
        default:
            items.push(
                { id: id(), name: 'Common Clothes', weight: 3, quantity: 1, type: 'misc', slot: 'none', equipped: false },
                { id: id(), name: 'Purse (10gp)', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: true }
            );
    }

    // 4. Universal Explorer's Pack items (hidden from UI but known to DM)
    items.push(
        { id: id(), name: 'Backpack', weight: 5, quantity: 1, type: 'container', slot: 'back', equipped: true, hidden: true },
        { id: id(), name: 'Bedroll', weight: 7, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Mess Kit', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Tinderbox', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Torches', weight: 1, quantity: 10, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Rations (days)', weight: 2, quantity: 10, type: 'consumable', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Waterskin', weight: 5, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: id(), name: 'Hempen Rope (50 ft)', weight: 10, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true }
    );

    return items.map(normalizeStartingItem);
};

// Extract weapon from inventory for character.weapon field
export const getWeaponFromInventory = (inventory: Item[]): Weapon => {
    // Main directrice d'abord, sinon l'arme du slot DISTANCE (archer pur).
    const equippedWeapon = inventory.find(i => i.type === 'weapon' && i.equipped && i.slot === 'mainHand')
        || inventory.find(i => i.type === 'weapon' && i.equipped && i.slot === 'ranged');

    if (equippedWeapon) {
        const structured = normalizeStartingItem(equippedWeapon);
        const properties = structured.properties || [];
        const isRanged = isRangedWeapon({ name: structured.name, properties, range: structured.range });
        const damageType = structured.damageType || inferDamageType(structured.effect) || 'bludgeoning';

        return {
            name: equippedWeapon.name,
            damage: structured.damageDice || '1d6',
            damageType,
            abilityMod: isRanged ? 'DEX' : 'STR',
            attackBonus: 2, // Legacy saves expect this field.
            properties,
            range: structured.range,
        };
    }

    // Default weapon
    return { name: 'Unarmed', damage: '1d4', damageType: 'bludgeoning', abilityMod: 'STR', attackBonus: 2 };
};

/**
 * Migration des sauvegardes : ré-hydrate TOUTES les armes de l'inventaire
 * (portée + propriétés depuis la table SRD) et recalcule l'arme de référence de
 * la fiche. Les anciens saves stockaient un arc sans `range` ni `ammunition` :
 * le moteur, la fiche et le MJ le prenaient pour une arme de mêlée.
 */
export function repairCharacterWeapons<T extends { inventory?: Item[]; weapon?: Weapon }>(character: T): T {
    if (!character?.inventory?.length) return character;
    const inventory = character.inventory.map(item => {
        if (item.type !== 'weapon') return item;
        const enriched = enrichWeaponItem(item);
        // Une arme à distance équipée « en main » migre vers l'emplacement dédié
        // pour cohabiter avec l'arme de mêlée (et être vue comme telle).
        const wantsRangedSlot = enriched.equipped && enriched.slot === 'mainHand'
            && isRangedWeapon({ name: enriched.name, properties: enriched.properties, range: enriched.range });
        return wantsRangedSlot ? { ...enriched, slot: 'ranged' as const } : enriched;
    });
    // Si rien n'est équipé, on garde l'arme existante de la fiche (ne pas la
    // remplacer par « Mains nues »).
    const hasEquippedWeapon = inventory.some(i => i.type === 'weapon' && i.equipped && (i.slot === 'mainHand' || i.slot === 'ranged'));
    return { ...character, inventory, weapon: hasEquippedWeapon ? getWeaponFromInventory(inventory) : character.weapon };
}

// ════════════════════════════════════════════════════════════════════════════
//  STARTING-WEALTH SHOP MODEL (buy your own gear with gold)
//  The player gets a free base PACKAGE (focus + pack + background flavour) and a
//  pre-selected default KIT (weapon + armor) they can keep, sell back, or swap.
//  Gold = SRD "starting wealth by class" (averaged) + a background/archetype bonus.
// ════════════════════════════════════════════════════════════════════════════

import { WEAPON_TABLE, type WeaponTemplate } from './weapons';

const _id = () => Math.random().toString(36).substr(2, 9);

/** Parse a "15 po" / "2 pa" / "5 pc" price into gold pieces (po=1, pa=0.1, pc=0.01). */
export function parsePriceToGp(price: string): number {
    const m = String(price || '').match(/([\d.]+)\s*(po|pa|pc|gp|sp|cp)/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === 'po' || unit === 'gp') return n;
    if (unit === 'pa' || unit === 'sp') return n / 10;
    return n / 100; // pc / cp
}

// SRD "Starting Wealth by Class" — averaged to a flat gp amount.
export const STARTING_WEALTH: Record<string, number> = {
    Barbarian: 50, Bard: 125, Cleric: 125, Druid: 50, Fighter: 125, Monk: 13,
    Paladin: 125, Ranger: 125, Rogue: 100, Sorcerer: 75, Mage: 100, Wizard: 100, Warlock: 100,
};

// Archetype/background bonus on top of class wealth ("a Noble is richer").
export const BACKGROUND_GOLD_BONUS: Record<string, number> = {
    Noble: 75, Acolyte: 15, Criminal: 15, Charlatan: 15, Soldier: 10, Sage: 10,
    'Folk Hero': 10, Urchin: 10, Outlander: 10, Hermit: 5,
};

export function startingGoldFor(cls: string, bg: string): number {
    return (STARTING_WEALTH[cls] ?? 75) + (BACKGROUND_GOLD_BONUS[bg] ?? 10);
}

// Shop armor catalog (SRD). price in gp.
export interface ArmorTemplate {
    key: string; name: string; nameFr: string;
    armorType: 'light' | 'medium' | 'heavy' | 'shield';
    baseAC?: number; acBonus?: number; maxDexBonus?: number; stealthDisadvantage?: boolean;
    price: number; weightKg: number;
}
export const ARMOR_CATALOG: ArmorTemplate[] = [
    { key: 'leather', name: 'Leather Armor', nameFr: 'Armure de cuir', armorType: 'light', baseAC: 11, price: 10, weightKg: 5 },
    { key: 'studded', name: 'Studded Leather', nameFr: 'Cuir clouté', armorType: 'light', baseAC: 12, price: 45, weightKg: 6.5 },
    { key: 'hide', name: 'Hide Armor', nameFr: 'Armure de peau', armorType: 'medium', baseAC: 12, maxDexBonus: 2, price: 10, weightKg: 6 },
    { key: 'chainshirt', name: 'Chain Shirt', nameFr: 'Chemise de mailles', armorType: 'medium', baseAC: 13, maxDexBonus: 2, price: 50, weightKg: 10 },
    { key: 'scale', name: 'Scale Mail', nameFr: 'Armure d’écailles', armorType: 'medium', baseAC: 14, maxDexBonus: 2, stealthDisadvantage: true, price: 50, weightKg: 20 },
    { key: 'breastplate', name: 'Breastplate', nameFr: 'Cuirasse', armorType: 'medium', baseAC: 14, maxDexBonus: 2, price: 400, weightKg: 9 },
    { key: 'ringmail', name: 'Ring Mail', nameFr: 'Armure d’anneaux', armorType: 'heavy', baseAC: 14, stealthDisadvantage: true, price: 30, weightKg: 18 },
    { key: 'chainmail', name: 'Chain Mail', nameFr: 'Cotte de mailles', armorType: 'heavy', baseAC: 16, stealthDisadvantage: true, price: 75, weightKg: 25 },
    { key: 'splint', name: 'Splint', nameFr: 'Clibanion', armorType: 'heavy', baseAC: 17, stealthDisadvantage: true, price: 200, weightKg: 30 },
    { key: 'plate', name: 'Plate', nameFr: 'Harnois (plates)', armorType: 'heavy', baseAC: 18, stealthDisadvantage: true, price: 1500, weightKg: 30 },
    { key: 'shield', name: 'Shield', nameFr: 'Bouclier', armorType: 'shield', acBonus: 2, price: 10, weightKg: 3 },
];

export function weaponTemplateToItem(w: WeaponTemplate, opts: { equipped?: boolean; slot?: Item['slot'] } = {}): Item {
    const props = w.properties.map(p => p.toLowerCase());
    // Une arme de la catégorie « ranged » (arc, arbalète, fronde) porte
    // explicitement la propriété `ranged` : plus aucun consommateur n'a besoin
    // de deviner à partir du nom, et l'arme part dans le bon emplacement.
    const isRanged = w.category.includes('ranged');
    if (isRanged && !props.includes('ranged')) props.push('ranged');
    return {
        id: _id(), name: w.name, quantity: 1, type: 'weapon',
        weight: Math.round(w.weightKg * 2.2),
        slot: opts.slot ?? (opts.equipped ? (isRanged ? 'ranged' : 'mainHand') : 'none'),
        equipped: !!opts.equipped,
        effect: `${w.damage} ${w.damageType}`,
        damageDice: w.damage, damageType: w.damageType,
        properties: props,
        range: w.range,
    };
}

export function armorTemplateToItem(a: ArmorTemplate, equipped = false): Item {
    return {
        id: _id(), name: a.name, quantity: 1, type: 'armor',
        weight: Math.round(a.weightKg * 2.2),
        slot: a.armorType === 'shield' ? 'offHand' : 'chest',
        equipped,
        effect: a.acBonus ? `+${a.acBonus} AC` : `${a.baseAC} AC`,
        armorType: a.armorType, baseAC: a.baseAC, acBonus: a.acBonus,
        maxDexBonus: a.maxDexBonus, stealthDisadvantage: a.stealthDisadvantage,
    };
}

// Default pre-selected kit per class (weapon key from WEAPON_TABLE + armor key + shield?).
export const DEFAULT_KIT: Record<string, { weapon: string; armor?: string; shield?: boolean }> = {
    Fighter: { weapon: 'epee_longue', armor: 'chainmail' },
    Paladin: { weapon: 'epee_longue', armor: 'chainmail', shield: true },
    Cleric: { weapon: 'masse_darmes', armor: 'scale', shield: true },
    Ranger: { weapon: 'arc_long', armor: 'studded' },
    Rogue: { weapon: 'epee_courte', armor: 'leather' },
    Barbarian: { weapon: 'hache_a_deux_mains', armor: 'hide' },
    Monk: { weapon: 'epee_courte' },
    Bard: { weapon: 'rapiere', armor: 'leather' },
    Druid: { weapon: 'cimeterre', armor: 'leather' },
    Mage: { weapon: 'baton_de_combat' },
    Wizard: { weapon: 'baton_de_combat' },
    Sorcerer: { weapon: 'dague' },
    Warlock: { weapon: 'baton_de_combat', armor: 'leather' },
};

// The always-free base package: spellcasting/class focus + background flavour +
// explorer's pack. NO weapons/armor here (those are bought from the shop).
export function getBasePackage(cls: string, bg: string): Item[] {
    const items: Item[] = [];
    const focus: Record<string, string> = {
        Cleric: 'Holy Symbol', Paladin: 'Holy Symbol', Druid: 'Druidic Focus',
        Mage: 'Spellbook', Wizard: 'Spellbook', Sorcerer: 'Arcane Focus', Warlock: 'Arcane Focus', Bard: 'Lute',
    };
    if (focus[cls]) items.push({ id: _id(), name: focus[cls], weight: 2, quantity: 1, type: 'misc', slot: 'none', equipped: false });
    if (cls === 'Mage' || cls === 'Wizard' || cls === 'Sorcerer') items.push({ id: _id(), name: 'Component Pouch', weight: 2, quantity: 1, type: 'misc', slot: 'none', equipped: false });
    if (cls === 'Rogue') items.push({ id: _id(), name: "Thieves' Tools", weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false });
    // Explorer's pack (hidden essentials)
    items.push(
        { id: _id(), name: 'Backpack', weight: 5, quantity: 1, type: 'container', slot: 'back', equipped: true, hidden: true },
        { id: _id(), name: 'Bedroll', weight: 7, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: _id(), name: 'Tinderbox', weight: 1, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: _id(), name: 'Torches', weight: 1, quantity: 10, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: _id(), name: 'Rations (days)', weight: 2, quantity: 10, type: 'consumable', slot: 'none', equipped: false, hidden: true },
        { id: _id(), name: 'Waterskin', weight: 5, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
        { id: _id(), name: 'Hempen Rope (50 ft)', weight: 10, quantity: 1, type: 'misc', slot: 'none', equipped: false, hidden: true },
    );
    return items.map(normalizeStartingItem);
}

// The default starting inventory under the shop model: base package + the
// pre-selected default kit (equipped). Used to seed a fresh character.
export function getDefaultLoadout(cls: string, bg: string): Item[] {
    const kit = DEFAULT_KIT[cls] || { weapon: 'dague' };
    const items = getBasePackage(cls, bg);
    const w = WEAPON_TABLE[kit.weapon];
    // Pas de slot forcé : une arme à distance part dans l'emplacement DISTANCE
    // (le Rôdeur commence avec son arc réellement reconnu comme tel).
    if (w) items.push(weaponTemplateToItem(w, { equipped: true }));
    if (kit.armor) { const a = ARMOR_CATALOG.find(x => x.key === kit.armor); if (a) items.push(armorTemplateToItem(a, true)); }
    if (kit.shield) { const s = ARMOR_CATALOG.find(x => x.key === 'shield'); if (s) items.push(armorTemplateToItem(s, true)); }
    return items.map(normalizeStartingItem);
}
