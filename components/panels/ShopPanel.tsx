// NF3 — Panneau de COMMERCE ouvert par l'outil open_shop du MJ.
// Achat aux prix catalogue × modificateur du marchand ; revente à 50 % de la
// valeur estimée. Tout passe par la vraie bourse (refus de découvert) et
// chaque transaction est rapportée au MJ par le parent (onTransaction).
import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CharacterSheet, Item } from '../../types';
import { sellPriceFor, MERCHANT_TYPE_LABELS, MerchantType } from '../../data/merchants';
import { GameWindow, WindowTabs } from './GameWindow';
import { Coins, ShoppingCart, HandCoins } from 'lucide-react';

const TRANS = {
    en: {
        buyTab: 'Buy',
        sellTab: 'Sell',
        buyBtn: 'Buy',
        sellBtn: 'Sell',
        gold: 'gp',
        purse: 'Purse',
        emptyStock: 'Nothing left on the stall.',
        emptyBag: 'Nothing to sell (equipped items must be unequipped first).',
        notEnoughGold: 'Not enough gold.',
        priceLabel: 'Price',
        sellFor: 'Sells for',
        leave: 'Leave the shop',
    },
    fr: {
        buyTab: 'Acheter',
        sellTab: 'Vendre',
        buyBtn: 'Acheter',
        sellBtn: 'Vendre',
        gold: 'po',
        purse: 'Bourse',
        emptyStock: "Plus rien sur l'étal.",
        emptyBag: "Rien à vendre (déséquipez d'abord les objets portés).",
        notEnoughGold: "Pas assez d'or.",
        priceLabel: 'Prix',
        sellFor: 'Rachat',
        leave: 'Quitter la boutique',
    },
} as const;

interface ShopPanelProps {
    character: CharacterSheet;
    onClose: () => void;
    onUpdateCharacter: (char: CharacterSheet) => void;
    /** Rapport de transaction relayé au MJ + Chronicle par GameSession. */
    onTransaction: (summary: { kind: 'buy' | 'sell'; itemName: string; price: number }) => void;
}

const roundGp = (value: number) => Math.round(value * 100) / 100;

export function ShopPanel({ character, onClose, onUpdateCharacter, onTransaction }: ShopPanelProps) {
    const shop = useGameStore(s => s.activeShop);
    const language = useGameStore(s => s.language);
    const tr = TRANS[language === 'fr' ? 'fr' : 'en'];
    const [tab, setTab] = useState<'buy' | 'sell'>('buy');
    const [soldOutIds, setSoldOutIds] = useState<Set<string>>(new Set());
    const [notice, setNotice] = useState<string | null>(null);

    const sellables = useMemo(
        () => (character.inventory || []).filter(item => !item.equipped),
        [character.inventory],
    );

    if (!shop) return null;
    const typeLabel = (MERCHANT_TYPE_LABELS as any)[shop.merchantType as MerchantType]?.[language === 'fr' ? 'fr' : 'en'] || shop.merchantType;
    const priceOf = (base: number) => roundGp(Math.max(0.1, base * (shop.priceModifier || 1)));

    const handleBuy = (stockEntry: { item: Item; price: number }) => {
        const price = priceOf(stockEntry.price);
        const gold = character.gold || 0;
        if (gold < price) {
            setNotice(`💰 ${tr.notEnoughGold} (${price} ${tr.gold})`);
            window.setTimeout(() => setNotice(null), 3000);
            return;
        }
        const inventory = [...(character.inventory || [])];
        // Consommables et matériel identiques : on empile la quantité.
        const stackIndex = inventory.findIndex(i => i.name === stockEntry.item.name && i.type === stockEntry.item.type && (i.type === 'consumable' || i.type === 'misc'));
        if (stackIndex >= 0) {
            inventory[stackIndex] = { ...inventory[stackIndex], quantity: inventory[stackIndex].quantity + 1 };
        } else {
            inventory.push({ ...stockEntry.item, id: crypto.randomUUID(), equipped: false, slot: stockEntry.item.slot || 'none' });
        }
        onUpdateCharacter({ ...character, gold: roundGp(gold - price), inventory });
        // Les articles UNIQUES (armes, armures, objets magiques) quittent l'étal.
        if (stockEntry.item.type !== 'consumable' && stockEntry.item.type !== 'misc') {
            setSoldOutIds(prev => new Set(prev).add(stockEntry.item.id));
        }
        onTransaction({ kind: 'buy', itemName: stockEntry.item.name, price });
    };

    const handleSell = (item: Item) => {
        const price = roundGp(sellPriceFor(item));
        let inventory = (character.inventory || []).map(i => ({ ...i }));
        const index = inventory.findIndex(i => i.id === item.id);
        if (index < 0) return;
        if (inventory[index].quantity > 1) {
            inventory[index].quantity -= 1;
        } else {
            inventory = inventory.filter(i => i.id !== item.id);
        }
        onUpdateCharacter({ ...character, gold: roundGp((character.gold || 0) + price), inventory });
        onTransaction({ kind: 'sell', itemName: item.name, price });
    };

    const visibleStock = shop.stock.filter(entry => !soldOutIds.has(entry.item.id));

    return (
        <GameWindow
            title={shop.merchantName}
            subtitle={`${typeLabel}${shop.priceModifier && shop.priceModifier !== 1 ? ` — ×${shop.priceModifier}` : ''}`}
            icon={<ShoppingCart className="h-5 w-5" />}
            // PB5 — le body par défaut n'est pas flex-col : la liste d'articles
            // ne recevait aucune hauteur et ne scrollait pas.
            bodyClassName="min-h-0 flex-1 overflow-hidden flex flex-col"
            onClose={onClose}
            actions={
                <div className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm font-bold text-amber-200">
                    <Coins className="h-4 w-4" />
                    <span>{roundGp(character.gold || 0)} {tr.gold}</span>
                </div>
            }
        >
            <WindowTabs
                tabs={[
                    { id: 'buy', label: tr.buyTab, count: visibleStock.length },
                    { id: 'sell', label: tr.sellTab, count: sellables.length },
                ] as any}
                active={tab}
                onChange={(id: any) => setTab(id)}
            />
            {shop.greeting && (
                <p className="mx-4 mt-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs italic text-white/60">« {shop.greeting} »</p>
            )}
            {notice && (
                <div className="mx-4 mt-2 rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-200">{notice}</div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {tab === 'buy' && (
                    visibleStock.length === 0
                        ? <div className="rounded-md border border-white/10 p-8 text-center text-white/40">{tr.emptyStock}</div>
                        : (
                            <div className="grid grid-cols-1 gap-2">
                                {visibleStock.map(entry => (
                                    <div key={entry.item.id} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                        <div className="min-w-0">
                                            <div className="font-bold text-white/90">{entry.item.name}</div>
                                            <div className="mt-0.5 line-clamp-2 text-xs text-white/50">
                                                {entry.item.description || entry.item.effect || (entry.item.damageDice ? `${entry.item.damageDice} ${entry.item.damageType || ''}` : '')}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-3">
                                            <span className="text-sm font-bold text-amber-200">{priceOf(entry.price)} {tr.gold}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleBuy(entry)}
                                                disabled={(character.gold || 0) < priceOf(entry.price)}
                                                className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {tr.buyBtn}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                )}
                {tab === 'sell' && (
                    sellables.length === 0
                        ? <div className="rounded-md border border-white/10 p-8 text-center text-white/40">{tr.emptyBag}</div>
                        : (
                            <div className="grid grid-cols-1 gap-2">
                                {sellables.map(item => (
                                    <div key={item.id} className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                        <div className="min-w-0">
                                            <div className="font-bold text-white/90">
                                                {item.name}
                                                {item.quantity > 1 && <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/55">x{item.quantity}</span>}
                                            </div>
                                            <div className="mt-0.5 line-clamp-2 text-xs text-white/50">{item.description || item.effect || ''}</div>
                                        </div>
                                        <div className="flex items-center justify-end gap-3">
                                            <span className="text-sm font-bold text-sky-200">
                                                <HandCoins className="mr-1 inline h-4 w-4" />
                                                {tr.sellFor} {roundGp(sellPriceFor(item))} {tr.gold}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleSell(item)}
                                                className="rounded-md border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-sky-200 hover:bg-sky-500/20"
                                            >
                                                {tr.sellBtn}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                )}
            </div>
            <div className="border-t border-white/10 p-3 text-right">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/60 hover:bg-white/10"
                >
                    {tr.leave}
                </button>
            </div>
        </GameWindow>
    );
}

export default ShopPanel;
