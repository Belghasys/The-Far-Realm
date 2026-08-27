/** Inventaire, or, boutique et butin.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { appendCampaignLog } from '../chronicle';
import { Item } from '../../../types';
import { foldText } from '../../../engine/skillSystem';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { getMagicItemByName, magicItemToInventoryItem, MagicItemRarity } from '../../../data/magicItems';
import { pickMagicItem, rollLootTable } from '../../../engine/loot';
import { buildMerchantStock, normalizeMerchantType } from '../../../data/merchants';
import { enrichWeaponItem } from '../../../data/equipment';
import { stringArg, stringListArg } from './shared';
import type { ToolContext } from './context';

export async function add_inventory_item(args: any, ctx: ToolContext) {
    const { d, store , sysText } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const itemName = String(args.name || '').trim();
    if (!itemName) return { success: false, error: 'Item name required' };
    // Coerce quantity: Gemini may send "3"/"a few" for an INTEGER param.
    // Without this, `number += "3"` concatenated → "13" stored in a number field.
    const qty = Math.trunc(Number(args.quantity));
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };
     const char = { ...store.character };
    const nextInventory = (char.inventory || []).map(i => ({ ...i }));
     // A plain `description` must NOT mark an item magic — that wrongly blocked
    // stacking of mundane described items (e.g. "a coil of rope").
    const isMagic = Boolean(args.effect || args.properties || args.damageDice || args.acBonus || args.baseAC || args.armorType);
    const existingIndex = !isMagic
        ? nextInventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase() && !i.effect)
        : -1;
     let totalQty = qty;
    if (existingIndex >= 0) {
        nextInventory[existingIndex].quantity += qty;
        totalQty = nextInventory[existingIndex].quantity;
    } else {
        // SRD catalog enrichment: when the DM grants a known magic item by
        // bare name ("Flame Tongue", "Épée longue +1") without structured
        // fields, pull the authoritative stats from data/magicItems so the
        // engine parses its bonuses correctly instead of storing dead text.
        const catalogDef = !isMagic ? getMagicItemByName(itemName) : undefined;
        const newItem: Item = catalogDef
            ? {
                ...magicItemToInventoryItem(catalogDef, useGameStore.getState().language === 'fr' ? 'fr' : 'en'),
                id: crypto.randomUUID(),
                quantity: qty,
            }
            : {
                id: crypto.randomUUID(),
                name: itemName,
                quantity: qty,
                type: args.type as any,
                weight: 0,
                description: args.description || '',
                slot: 'none',
                equipped: false,
                effect: args.effect,
                properties: args.properties,
                damageDice: args.damageDice,
                damageType: args.damageType,
                acBonus: args.acBonus,
                baseAC: args.baseAC,
                armorType: args.armorType,
                range: args.range,
            };
        // Une arme reçue en butin repart toujours de la table SRD
        // (portée + propriétés) : sans ça, un « Arc long » du MJ
        // arrivait sans portée et passait pour une arme de mêlée.
        nextInventory.push(enrichWeaponItem(newItem));
    }
    char.inventory = nextInventory;
    d.syncCharacterUpdate(char);
    campaignEventLog.append('ITEM_ADDED', `Added ${qty}x ${itemName}`, { name: itemName, quantity: qty, type: args.type });
    // Log de campagne : seul le loot NOTABLE (magique/structuré) —
    // pas les rations et torches, qui noieraient la trame.
    if (isMagic || getMagicItemByName(itemName)) {
        appendCampaignLog('loot', `Loot: ${qty > 1 ? `${qty}x ` : ''}${itemName}`);
    }
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysItemAdded(qty, itemName)}]*` }]);
    return { success: true, item: itemName, total: totalQty };
}

export async function remove_inventory_item(args: any, ctx: ToolContext) {
    const { d, store , sysText } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const itemName = String(args.name || '').trim();
    if (!itemName) return { success: false, error: 'Item name required' };
    const qty = Math.trunc(Number(args.quantity));
    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };
     const char = { ...store.character };
    let nextInventory = (char.inventory || []).map(i => ({ ...i }));
    const existingIndex = nextInventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());
    let removed = false;
    let remaining = 0;
    if (existingIndex >= 0) {
        const originalQty = nextInventory[existingIndex].quantity;
        nextInventory[existingIndex].quantity -= qty;
        remaining = Math.max(0, nextInventory[existingIndex].quantity);
        if (nextInventory[existingIndex].quantity <= 0) {
            nextInventory = nextInventory.filter((_, idx) => idx !== existingIndex);
        }
        char.inventory = nextInventory;
        removed = true;
        d.syncCharacterUpdate(char);
        campaignEventLog.append('ITEM_REMOVED', `Removed ${qty}x ${itemName}`, { name: itemName, quantity: qty });
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysItemRemoved(Math.min(originalQty, qty), itemName)}]*` }]);
    }
    // ou-m6 — échec EXPLIQUÉ : sans champ error, le MJ ne savait
    // pas si l'objet était introuvable ou mal orthographié.
    if (!removed) {
        const inventoryNames = (store.character.inventory || []).map(i => i.name).slice(0, 25);
        return {
            success: false,
            remaining: 0,
            error: `Item "${itemName}" not found in inventory. Check the exact name.`,
            inventory: inventoryNames,
        };
    }
    return { success: true, remaining };
}

export async function add_gold(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    // TP10 (contre-audit) — borner la magnitude comme l'XP (sanitizeXPGrant) :
    // un MJ hallucinant `amount: 1e9` créditait un milliard de po en un appel.
    const rawDelta = Number(args.amount);
    if (!isFinite(rawDelta) || rawDelta === 0) return { success: false, error: 'Invalid amount' };
    const delta = Math.max(-10_000, Math.min(10_000, rawDelta));
    if (delta !== rawDelta) {
        return { success: false, error: `Amount ${rawDelta} gp is out of the plausible range (±10000 gp per call). Split legitimate huge payments into justified smaller ones.` };
    }
    const char = { ...store.character };
    const before = char.gold || 0;
    // ou-m7 — une DÉPENSE supérieure à la bourse est un refus
    // clair (le joueur « payait » 100 po avec 20 po, clampé à 0
    // en success:true sans que le MJ le sache).
    if (delta < 0 && before + delta < 0) {
        return {
            success: false,
            gold: before,
            shortfall: Math.round((Math.abs(delta) - before) * 100) / 100,
            error: `Not enough gold: the purse holds ${before} gp but ${Math.abs(delta)} gp are needed. Nothing was deducted — let the player negotiate, drop the price, or refuse the sale.`,
        };
    }
    // Clamp so a debit can't drive the purse negative.
    const after = Math.max(0, Math.round((before + delta) * 100) / 100);
    char.gold = after;
    d.syncCharacterUpdate(char);
    const reason = typeof args.reason === 'string' && args.reason.trim() ? ` (${args.reason.trim()})` : '';
    campaignEventLog.append('JOURNAL_UPDATED', `Gold ${delta > 0 ? '+' : ''}${delta} → ${after} po${reason}`, { before, delta, after });
    // Trame : seuls les mouvements d'or significatifs (≥ 25 po).
    if (Math.abs(delta) >= 25) {
        appendCampaignLog('gold', `Gold ${delta > 0 ? '+' : ''}${delta} gp${reason} (purse: ${after})`);
    }
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine(`${delta > 0 ? '+' : ''}${delta} po${reason} — bourse : ${after} po`, `${delta > 0 ? '+' : ''}${delta} gp${reason} — purse: ${after} gp`)}]*` }]);
    return { success: true, gold: after, delta };
}

export async function open_shop(args: any, ctx: ToolContext) {
    const { store, syncJournal } = ctx;
    // NF3 — ouvre le panneau de commerce côté joueur, stock
    // construit par type de marchand + niveau du groupe.
    if (!store.character) return { success: false, error: 'No character loaded' };
    const merchantName = stringArg(args.merchantName || args.name, 80) || 'Marchand';
    const merchantType = normalizeMerchantType(String(args.merchantType || args.type || merchantName));
    const shopLang = useGameStore.getState().language === 'fr' ? 'fr' : 'en';
    const stock = buildMerchantStock(merchantType, store.character.level || 1, shopLang);
    // Articles SIGNATURE demandés par le MJ (noms exacts du catalogue).
    for (const rawName of stringListArg(args.extraItems).slice(0, 6)) {
        const def = getMagicItemByName(rawName);
        if (def) {
            stock.unshift({
                item: { ...magicItemToInventoryItem(def, shopLang), id: crypto.randomUUID() },
                price: Math.max(25, def.value),
            });
        }
    }
    // UI4 (contre-audit) — plancher à 0.5 : la revente étant fixe à 50 % de la
    // valeur catalogue, tout modificateur < 0.5 ouvrait une boucle d'or infinie
    // (acheter ×0.25, revendre ×0.5, stock de consommables inépuisable).
    const priceModifier = Math.min(3, Math.max(0.5, Number(args.priceModifier) || 1));
    store.setActiveShop({
        merchantName,
        merchantType,
        priceModifier,
        greeting: stringArg(args.greeting, 200) || undefined,
        stock,
    });
    // Le journal ne montre que les PNJ RENCONTRÉS (fiche datée
    // par lastSeenAt). Les marchands de campagne y sont semés à
    // la création : commercer avec l'un d'eux est une rencontre,
    // il doit apparaître — sinon il resterait invisible pour
    // toujours, `open_shop` ne touchant pas le journal.
    await syncJournal((prev: any) => {
        const known = (prev.npcs || []).find((n: any) => foldText(n.name) === foldText(merchantName));
        return {
            ...prev,
            npcs: known
                ? (prev.npcs || []).map((n: any) => n.id === known.id ? { ...n, lastSeenAt: Date.now() } : n)
                : [...(prev.npcs || []), {
                    id: crypto.randomUUID(),
                    name: merchantName,
                    description: merchantType,
                    location: '',
                    disposition: 0,
                    knownFacts: [],
                    lastSeenAt: Date.now(),
                    createdAt: new Date().toISOString(),
                }],
        };
    });
    campaignEventLog.append('JOURNAL_UPDATED', `Shop opened: ${merchantName} (${merchantType})`, { merchantType, priceModifier, stockSize: stock.length });
    return {
        success: true,
        merchantName,
        merchantType,
        priceModifier,
        stockSize: stock.length,
        instruction: 'The trading panel is now OPEN on the player screen. Narrate the merchant in one short beat; each purchase/sale will reach you as a [SYSTEM] report — never re-apply gold or items yourself. Call close_shop when the player leaves.',
    };
}

export async function close_shop(_args: any, _ctx: ToolContext) {
    useGameStore.getState().setActiveShop(null);
    return { success: true, instruction: 'Trading panel closed.' };
}

export async function roll_loot(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const rarityHint = stringArg(args.rarityHint, 30).toLowerCase() as MagicItemRarity;
    const validRarities: MagicItemRarity[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
    // A rarityHint pins a single milestone reward of that rarity; otherwise
    // roll 1-3 items on the level-appropriate treasure table.
    let defs = validRarities.includes(rarityHint)
        ? [pickMagicItem(rarityHint, undefined, store.character.level + 2)].filter(Boolean) as NonNullable<ReturnType<typeof pickMagicItem>>[]
        : rollLootTable(store.character.level);
    if (!defs.length) defs = rollLootTable(store.character.level);
    if (!defs.length) return { success: false, error: 'No loot table entry available' };
     const lang = useGameStore.getState().language === 'fr' ? 'fr' : 'en';
    const char = { ...store.character };
    const nextInventory = (char.inventory || []).map(i => ({ ...i }));
    const awarded = defs.map(def => {
        const item = { ...magicItemToInventoryItem(def, lang), id: crypto.randomUUID() };
        nextInventory.push(item);
        return {
            name: item.name,
            rarity: def.rarity,
            description: lang === 'fr' ? def.descriptionFr : def.description,
            effects: def.effects,
            attunement: def.attunement || false,
        };
    });
    char.inventory = nextInventory;
    d.syncCharacterUpdate(char);
    campaignEventLog.append('ITEM_ADDED', `Loot rolled: ${awarded.map(a => a.name).join(', ')}`, { context: stringArg(args.context, 160), awarded });
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine('Butin', 'Loot')} — ${awarded.map(a => `${a.name} (${a.rarity})`).join(', ')} ${sysLine("ajouté à l'inventaire", 'added to inventory')}]*` }]);
    return {
        success: true,
        loot: awarded,
        instruction: 'These EXACT items are now in the player inventory. Narrate their discovery vividly (appearance, aura, where they lie) using the descriptions provided. Do not rename them and do not add extra items.',
    };
}
