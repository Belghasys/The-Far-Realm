// NF3 — Marchands : archétypes de vendeurs avec stock par PALIER de niveau.
// Le MJ ouvre la boutique via l'outil open_shop(merchantType, …) ; le stock est
// construit ici à partir des catalogues existants (armes SRD, armures, objets
// magiques avec `value`/`minLevel`). Paliers : T1 = niv 1-4, T2 = 5-9, T3 = 10+.
import { Item } from '../types/index';
import { WEAPON_TABLE, WeaponTemplate } from './weapons';
import { ARMOR_CATALOG, weaponTemplateToItem, armorTemplateToItem, parsePriceToGp } from './equipment';
import { MAGIC_ITEMS, MagicItemDef, magicItemToInventoryItem } from './magicItems';

export type MerchantType = 'blacksmith' | 'apothecary' | 'general' | 'enchanter';

export interface ShopStockItem {
    item: Item;
    /** Prix de VENTE au joueur, en po (avant le priceModifier du MJ). */
    price: number;
}

export const MERCHANT_TYPE_LABELS: Record<MerchantType, { en: string; fr: string }> = {
    blacksmith: { en: 'Blacksmith', fr: 'Forgeron' },
    apothecary: { en: 'Apothecary', fr: 'Apothicaire' },
    general: { en: 'General store', fr: 'Bazar général' },
    enchanter: { en: 'Enchanter', fr: 'Enchanteur' },
};

/** Le MJ parle librement (« forgeron », « herboriste », « magasin »…). */
export function normalizeMerchantType(raw: string): MerchantType {
    const text = String(raw || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/forgeron|blacksmith|smith|forge|armurier|armorer|weaponsmith/.test(text)) return 'blacksmith';
    if (/apothicaire|apothecary|alchimiste|alchemist|herboriste|herbalist|potion/.test(text)) return 'apothecary';
    if (/enchanteur|enchanter|arcaniste|arcanist|mage|magic|magique|curiosit/.test(text)) return 'enchanter';
    return 'general';
}

export function merchantTier(partyLevel: number): 1 | 2 | 3 {
    return partyLevel >= 10 ? 3 : partyLevel >= 5 ? 2 : 1;
}

let stockIdCounter = 0;
function freshId(prefix: string): string {
    stockIdCounter += 1;
    return `shop-${prefix}-${stockIdCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function weaponStock(w: WeaponTemplate, lang: 'en' | 'fr'): ShopStockItem {
    const item = weaponTemplateToItem(w, { equipped: false, slot: 'none' });
    return {
        item: { ...item, id: freshId('w'), name: lang === 'fr' ? w.nameFr : w.name },
        price: parsePriceToGp(w.price),
    };
}

/** T2 forgeron — arme DE MAÎTRE : +1 aux dégâts (non magique). Le rider est
 *  porté par le texte d'effet (« +1 slashing damage ») que le moteur parse
 *  déjà (parseItemAdditionalDamage) — appliqué à chaque coup qui touche. */
function masterworkStock(w: WeaponTemplate, lang: 'en' | 'fr'): ShopStockItem {
    const base = weaponTemplateToItem(w, { equipped: false, slot: 'none' });
    const dmgType = base.damageType || 'slashing';
    return {
        item: {
            ...base,
            id: freshId('mw'),
            name: lang === 'fr' ? `${w.nameFr} de maître` : `Masterwork ${w.name}`,
            effect: `Masterwork craftsmanship: +1 ${dmgType} damage.`,
            description: lang === 'fr'
                ? 'Forge d\'exception : +1 aux dégâts (non magique).'
                : 'Exceptional forging: +1 damage (non-magical).',
        },
        price: Math.max(parsePriceToGp(w.price) * 4, parsePriceToGp(w.price) + 40),
    };
}

function magicStock(def: MagicItemDef, lang: 'en' | 'fr'): ShopStockItem {
    return {
        item: { ...magicItemToInventoryItem(def, lang), id: freshId('m') },
        price: Math.max(25, def.value),
    };
}

function consumable(nameEn: string, nameFr: string, effect: string, price: number, lang: 'en' | 'fr', descriptionFr?: string): ShopStockItem {
    return {
        item: {
            id: freshId('c'),
            name: lang === 'fr' ? nameFr : nameEn,
            type: 'consumable',
            weight: 0.5,
            quantity: 1,
            equipped: false,
            slot: 'none',
            effect,
            description: lang === 'fr' ? (descriptionFr || effect) : effect,
        },
        price,
    };
}

function gear(nameEn: string, nameFr: string, price: number, weight: number, lang: 'en' | 'fr', effect?: string): ShopStockItem {
    return {
        item: {
            id: freshId('g'),
            name: lang === 'fr' ? nameFr : nameEn,
            type: 'misc',
            weight,
            quantity: 1,
            equipped: false,
            slot: 'none',
            ...(effect ? { effect } : {}),
        },
        price,
    };
}

/** Stock complet d'un marchand pour le niveau du groupe. */
export function buildMerchantStock(type: MerchantType, partyLevel: number, lang: 'en' | 'fr' = 'en'): ShopStockItem[] {
    const tier = merchantTier(partyLevel);
    const stock: ShopStockItem[] = [];
    const weapons = Object.values(WEAPON_TABLE);

    if (type === 'blacksmith') {
        // T1 — tout l'arsenal SRD non magique + armures + boucliers.
        for (const w of weapons) stock.push(weaponStock(w, lang));
        for (const a of ARMOR_CATALOG) {
            if (tier === 1 && a.price > 100) continue; // plates & co arrivent au T2
            stock.push({ item: { ...armorTemplateToItem(a, false), id: freshId('a') }, price: a.price });
        }
        // T2 — armes de maître (+1 dégâts, non magique) sur les armes martiales.
        if (tier >= 2) {
            for (const w of weapons.filter(x => /martial/.test(x.category))) stock.push(masterworkStock(w, lang));
        }
        // T3 — armes et armures +1 (magiques, uncommon) du catalogue.
        if (tier >= 3) {
            for (const def of MAGIC_ITEMS.filter(d => d.rarity === 'uncommon'
                && (d.type === 'weapon' || d.type === 'armor' || d.type === 'shield')
                && d.minLevel <= partyLevel + 2)) {
                stock.push(magicStock(def, lang));
            }
        }
    }

    if (type === 'apothecary') {
        stock.push(consumable('Potion of Healing', 'Potion de soins', 'Restores 2d4+2 HP.', 50, lang, 'Rend 2d4+2 PV.'));
        stock.push(consumable('Antitoxin', 'Antitoxine', 'Advantage on saving throws against poison for 1 hour.', 50, lang, 'Avantage aux sauvegardes contre le poison pendant 1 heure.'));
        stock.push(consumable("Healer's Kit", 'Kit de soins', 'Stabilize a dying creature without a roll (10 uses).', 5, lang, 'Stabilise un mourant sans jet (10 utilisations).'));
        if (tier >= 2) {
            stock.push(consumable('Potion of Greater Healing', 'Potion de soins supérieure', 'Restores 4d4+4 HP.', 150, lang, 'Rend 4d4+4 PV.'));
        }
        if (tier >= 3) {
            stock.push(consumable('Potion of Superior Healing', 'Potion de soins majeure', 'Restores 8d4+8 HP.', 450, lang, 'Rend 8d4+8 PV.'));
        }
        // Fioles magiques du catalogue, filtrées par palier.
        const maxRarity: Record<number, string[]> = { 1: ['common'], 2: ['common', 'uncommon'], 3: ['common', 'uncommon', 'rare'] };
        for (const def of MAGIC_ITEMS.filter(d => d.type === 'potion'
            && maxRarity[tier].includes(d.rarity) && d.minLevel <= partyLevel + 2)) {
            stock.push(magicStock(def, lang));
        }
    }

    if (type === 'general') {
        stock.push(gear('Rope (50 ft)', 'Corde (15 m)', 1, 5, lang));
        stock.push(gear('Torch (5)', 'Torches (x5)', 1, 2.5, lang));
        stock.push(gear('Rations (5 days)', 'Rations (5 jours)', 2.5, 5, lang));
        stock.push(gear('Bedroll', 'Sac de couchage', 1, 3, lang));
        stock.push(gear('Lantern (hooded)', 'Lanterne sourde', 5, 1, lang));
        stock.push(gear('Oil flask (3)', "Flasques d'huile (x3)", 0.3, 1.5, lang));
        stock.push(gear('Waterskin', 'Outre', 0.2, 2, lang));
        stock.push(gear('Backpack', 'Sac à dos', 2, 2.5, lang));
        stock.push(gear('Grappling hook', 'Grappin', 2, 2, lang));
        stock.push(gear('Crowbar', 'Pied-de-biche', 2, 2.5, lang, 'Advantage on Strength checks where leverage applies.'));
        stock.push(gear('Thieves’ tools', 'Outils de voleur', 25, 0.5, lang));
        stock.push(consumable('Potion of Healing', 'Potion de soins', 'Restores 2d4+2 HP.', 60, lang, 'Rend 2d4+2 PV.'));
        // Petit rayon d'armes simples.
        for (const w of weapons.filter(x => /simple/.test(x.category)).slice(0, 8)) stock.push(weaponStock(w, lang));
        const leather = ARMOR_CATALOG.find(a => /leather|cuir/i.test(a.name));
        if (leather) stock.push({ item: { ...armorTemplateToItem(leather, false), id: freshId('a') }, price: leather.price });
    }

    if (type === 'enchanter') {
        const rarities: Record<number, string[]> = {
            1: ['common', 'uncommon'],
            2: ['common', 'uncommon', 'rare'],
            3: ['common', 'uncommon', 'rare', 'very rare'],
        };
        for (const def of MAGIC_ITEMS.filter(d => rarities[tier].includes(d.rarity)
            && d.type !== 'weapon' && d.type !== 'armor' && d.type !== 'shield'
            && d.minLevel <= partyLevel + 3)) {
            stock.push(magicStock(def, lang));
        }
    }

    return stock;
}

/** Prix de RACHAT d'un objet du joueur (50 % de sa valeur estimée). */
export function sellPriceFor(item: Item): number {
    const fromValue = item.value ? parsePriceToGp(item.value) : 0;
    if (fromValue > 0) return Math.max(0.1, Math.round(fromValue * 50) / 100);
    const weaponMatch = Object.values(WEAPON_TABLE).find(w => w.name === item.name || w.nameFr === item.name);
    if (weaponMatch) return Math.max(0.1, Math.round(parsePriceToGp(weaponMatch.price) * 50) / 100);
    const armorMatch = ARMOR_CATALOG.find(a => a.name === item.name);
    if (armorMatch) return Math.max(0.1, Math.round(armorMatch.price * 50) / 100);
    const magicMatch = MAGIC_ITEMS.find(d => d.name === item.name || d.nameFr === item.name);
    if (magicMatch) return Math.max(1, Math.round(magicMatch.value * 50) / 100);
    // Objet inconnu : forfait symbolique.
    return 0.5;
}
