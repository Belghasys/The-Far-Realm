import React, { useMemo, useState } from 'react';
import {
    Ability,
    CharacterSheet,
    InventoryItem,
    Weapon,
    ItemSlot,
    getBaseACFromArmor,
    getEffectiveAC,
    getEffectiveSpeed,
    getEffectiveStat,
    getPlayerAttackModifier,
    getPlayerDamageBonus,
    getXPProgress,
    isStatModified,
    parseMagicModifier,
} from '../types';
import { Backpack, Coins, Gem, HeartPulse, Package, Scale, Shield, Sparkles, Star, Sword, User, Zap } from 'lucide-react';
import { getSubclassConfig, subclassNeedsChoice, getSubclassFeaturesForLevel } from '../data/subclasses';
import { structureInventoryItem } from '../services/codexService';
import { ensureProgressionState } from '../services/rulesEngine';
import { GameWindow, WindowTabs } from './GameWindow';

interface Props {
    character: CharacterSheet;
    onClose: () => void;
    onUpdateCharacter?: (char: CharacterSheet) => void;
    /** Notified when a consumable is used from the inventory (out of combat),
     *  so GameSession can show the dice roll, log it, and inform the DM —
     *  consistent with the in-combat potion flow. */
    onItemUsed?: (info: { name: string; healing: number; formula: string }) => void;
}

type InventoryTab = 'equipment' | 'backpack' | 'consumables';

const EQUIPMENT_SLOTS = [
    { id: 'head', label: 'Tête' },
    { id: 'neck', label: 'Cou' },
    { id: 'back', label: 'Dos' },
    { id: 'chest', label: 'Torse' },
    { id: 'waist', label: 'Taille' },
    { id: 'hands', label: 'Mains' },
    { id: 'mainHand', label: 'Main directrice' },
    { id: 'offHand', label: 'Main gauche' },
    { id: 'ring', label: 'Anneau' },
    { id: 'legs', label: 'Jambes' },
    { id: 'feet', label: 'Pieds' },
] as const;

const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

function abilityModifier(value: number): number {
    return Math.floor((value - 10) / 2);
}

function formatMod(value: number): string {
    const mod = abilityModifier(value);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function normalizeInventoryItem(item: InventoryItem): InventoryItem {
    const structured = structureInventoryItem(item);
    return {
        ...item,
        damageDice: item.damageDice || structured.damageDice,
        damageType: item.damageType || structured.damageType,
        properties: item.properties || structured.properties,
        range: item.range || structured.range,
        baseAC: item.baseAC ?? structured.ac ?? (structured.armorType === 'shield' ? structured.acBonus : undefined),
        acBonus: item.acBonus ?? structured.acBonus,
        armorType: item.armorType || structured.armorType,
        maxDexBonus: item.maxDexBonus ?? structured.maxDexBonus,
        stealthDisadvantage: item.stealthDisadvantage ?? structured.stealthDisadvantage,
        value: item.value || structured.value,
        effect: item.effect || structured.effect,
    };
}

function itemMechanicLine(item: InventoryItem): string {
    const structured = structureInventoryItem(item);
    if (structured.damageDice) return `${structured.damageDice} ${structured.damageType || 'dégâts'}`;
    if (structured.ac) return `CA ${structured.ac}`;
    if (structured.acBonus) return `+${structured.acBonus} CA`;
    return item.effect || item.description || 'Aucun effet mécanique';
}

function itemTags(item: InventoryItem): string[] {
    const structured = structureInventoryItem(item);
    return [
        item.type,
        ...(structured.properties || []),
        ...(structured.range ? [`range ${structured.range}`] : []),
        ...(structured.stealthDisadvantage ? ['stealth disadvantage'] : []),
    ].filter(Boolean);
}

function toWeaponOverride(item: InventoryItem): Weapon {
    const structured = structureInventoryItem(item);
    const properties = structured.properties || item.properties || [];
    const isRanged = Boolean(structured.range || item.range || /bow|crossbow|sling|dart/i.test(item.name));
    const magicBonus = parseMagicModifier(item.name, item.effect);

    return {
        name: item.name,
        damage: structured.damageDice || item.damageDice || '1d4',
        damageType: String(structured.damageType || item.damageType || 'bludgeoning'),
        abilityMod: isRanged ? 'DEX' : 'STR',
        attackBonus: magicBonus,
        magicBonus,
        properties,
        reach: isRanged ? 30 : 5,
    };
}

function attackStats(character: CharacterSheet, item: InventoryItem) {
    const weapon = toWeaponOverride(item);
    const isOffhand = item.slot === 'offHand';
    const attack = getPlayerAttackModifier(character, weapon);
    const damageBonus = getPlayerDamageBonus(character, weapon, isOffhand);
    const damage = `${weapon.damage}${damageBonus >= 0 ? '+' : ''}${damageBonus} ${weapon.damageType}`;
    return { attack, damage, properties: weapon.properties || [] };
}

function rollHealing(item: InventoryItem): { total: number; formula: string } {
    const text = `${item.effect || ''} ${item.description || ''}`.trim();
    const match = text.match(/(\d+)d(\d+)\s*([+-]\s*\d+)?\s*(?:healing|heal|hp|pv)/i);
    if (!match) return { total: 0, formula: '' };

    const count = Number(match[1]);
    const sides = Number(match[2]);
    const flat = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0;
    if (!Number.isFinite(count) || !Number.isFinite(sides)) return { total: 0, formula: '' };

    let total = flat;
    for (let i = 0; i < count; i += 1) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return {
        total: Math.max(0, total),
        formula: `${count}d${sides}${flat ? `${flat >= 0 ? '+' : ''}${flat}` : ''}`,
    };
}

function useVisibleInventory(character: CharacterSheet) {
    return useMemo(
        () => (character.inventory || []).filter(item => !item.hidden).map(normalizeInventoryItem),
        [character.inventory]
    );
}

// Module-level so BOTH InventoryPanel and ItemRow can use it (ItemRow at ~line
// 511 referenced this when it was trapped inside InventoryPanel → ReferenceError).
// Pure function of the item, so hoisting is safe.
function inferItemSlot(item: InventoryItem): ItemSlot {
    const name = item.name.toLowerCase();
    // Consumables are never equippable.
    if (item.type === 'consumable') return 'none';
    // Weapons first (a "war hammer" must not be mistaken for a "hammer belt").
    if (item.type === 'weapon') return 'mainHand';

    // Slot-by-NAME — works for ANY type (armor, misc, wondrous) so a misc Belt of
    // Giant Strength / boots / gloves equip correctly (was armor-only before → bug).
    if (name.includes('helmet') || name.includes('helm') || name.includes('casque') || name.includes('crown') || name.includes('couronne')) return 'head';
    if (name.includes('ring') || name.includes('anneau') || name.includes('alliance')) return 'ring';
    if (name.includes('amulet') || name.includes('necklace') || name.includes('amulette') || name.includes('collier') || name.includes('pendant') || name.includes('neck')) return 'neck';
    if (name.includes('shield') || name.includes('bouclier') || item.armorType === 'shield') return 'offHand';
    if (name.includes('glove') || name.includes('gauntlet') || name.includes('gant') || name.includes('bracer')) return 'hands';
    if (name.includes('boot') || name.includes('shoe') || name.includes('botte') || name.includes('soulier') || name.includes('greaves') || name.includes('sabaton')) return 'feet';
    if (name.includes('cape') || name.includes('cloak') || name.includes('mantle') || name.includes('cloack')) return 'back';
    if (name.includes('legging') || name.includes('jambière') || name.includes('pantalon') || name.includes('trouser') || name.includes('pants')) return 'legs';
    if (name.includes('belt') || name.includes('ceinture') || name.includes('waist') || name.includes('girdle') || name.includes('sash')) return 'waist';

    // Armor with no specific keyword = body armor.
    if (item.type === 'armor') return 'chest';
    return 'none';
}

export function InventoryPanel({ character, onClose, onUpdateCharacter, onItemUsed }: Props) {
    const [activeTab, setActiveTab] = useState<InventoryTab>('equipment');
    const visibleInventory = useVisibleInventory(character);
    const equippedItems = visibleInventory.filter(item => item.equipped);
    const bagItems = visibleInventory.filter(item => !item.equipped && item.type !== 'consumable');
    const consumables = visibleInventory.filter(item => item.type === 'consumable');
    const totalWeight = visibleInventory.reduce((sum, item) => sum + item.weight * item.quantity, 0);

    const tabs = [
        { id: 'equipment' as const, label: 'Équipement', count: equippedItems.length },
        { id: 'backpack' as const, label: 'Sac à dos', count: bagItems.length },
        { id: 'consumables' as const, label: 'Consommables', count: consumables.length },
    ];

    const recalcBaseAC = (inventory: InventoryItem[]): number => {
        const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));
        return getBaseACFromArmor({ ...character, inventory, ac: 10 + dexMod });
    };

    const handleEquipToggle = (item: InventoryItem, targetSlot?: 'mainHand' | 'offHand') => {
        if (!onUpdateCharacter) return;

        let nextInventory = (character.inventory || []).map(normalizeInventoryItem);
        const targetItemIndex = nextInventory.findIndex(inventoryItem => inventoryItem.id === item.id);
        if (targetItemIndex === -1) return;

        const current = { ...nextInventory[targetItemIndex] };
        let requestedSlot = targetSlot || current.slot;

        if (current.equipped && (!targetSlot || current.slot === targetSlot)) {
            current.equipped = false;
        } else {
            if (!requestedSlot || requestedSlot === 'none') {
                requestedSlot = inferItemSlot(current);
            }
            
            if (requestedSlot === 'none') {
                return;
            }

            current.slot = requestedSlot;

            // Enforce Two-Handed weapon rules
            if (requestedSlot === 'mainHand') {
                const weaponProps = current.properties || [];
                if (weaponProps.includes('two-handed')) {
                    // Unequip off-hand automatically
                    nextInventory = nextInventory.map(invItem =>
                        invItem.slot === 'offHand' && invItem.equipped
                            ? { ...invItem, equipped: false }
                            : invItem
                    );
                }
            }
            if (requestedSlot === 'offHand') {
                const mainWeapon = nextInventory.find(invItem => invItem.equipped && invItem.slot === 'mainHand');
                if (mainWeapon) {
                    const mainProps = mainWeapon.properties || [];
                    if (mainProps.includes('two-handed')) {
                        alert("You cannot equip an off-hand item while holding a two-handed weapon.");
                        return;
                    }
                }
                
                if (current.type === 'weapon') {
                    const offProps = current.properties || [];
                    if (!offProps.includes('light') && !offProps.includes('finesse')) {
                        alert("Off-hand weapons must be light or finesse.");
                        return;
                    }
                }
            }

            nextInventory = nextInventory.map(inventoryItem =>
                inventoryItem.slot === requestedSlot && inventoryItem.equipped && inventoryItem.id !== current.id
                    ? { ...inventoryItem, equipped: false }
                    : inventoryItem
            );
            current.equipped = true;
        }

        nextInventory[targetItemIndex] = current;
        const mainHandWeapon = nextInventory.find(invItem => invItem.equipped && invItem.slot === 'mainHand' && invItem.type === 'weapon');
        onUpdateCharacter({
            ...character,
            inventory: nextInventory,
            ac: recalcBaseAC(nextInventory),
            weapon: mainHandWeapon
                ? toWeaponOverride(mainHandWeapon)
                : {
                    name: 'Unarmed',
                    damage: '1d4',
                    damageType: 'bludgeoning',
                    abilityMod: 'STR',
                    attackBonus: 0,
                    magicBonus: 0,
                    reach: 5
                },
        });
    };

    const handleUse = (item: InventoryItem) => {
        if (!onUpdateCharacter) return;

        const nextInventory = (character.inventory || []).map(normalizeInventoryItem);
        const targetIndex = nextInventory.findIndex(inventoryItem => inventoryItem.id === item.id);
        if (targetIndex === -1) return;

        const healing = rollHealing(nextInventory[targetIndex]);
        const nextHP = healing.total > 0
            ? Math.min(character.hp.max, character.hp.current + healing.total)
            : character.hp.current;

        const target = { ...nextInventory[targetIndex] };
        if (target.quantity > 1) {
            target.quantity -= 1;
            nextInventory[targetIndex] = target;
        } else {
            nextInventory.splice(targetIndex, 1);
        }

        onUpdateCharacter({
            ...character,
            hp: { ...character.hp, current: nextHP },
            inventory: nextInventory,
        });
        // Same feedback as the in-combat potion: visible roll + log + DM info.
        onItemUsed?.({ name: item.name, healing: healing.total, formula: healing.formula });
    };

    return (
        <GameWindow
            title="Inventaire"
            subtitle={`${visibleInventory.length} objets visibles / ${totalWeight.toFixed(1)} lb portées`}
            icon={<Backpack className="h-5 w-5" />}
            onClose={onClose}
            size="lg"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                        <Scale className="h-4 w-4 text-amber-300" />
                        <span>{totalWeight.toFixed(1)} lb</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-amber-300">
                        <Coins className="h-4 w-4" />
                        <span>{character.gold || 0} PO</span>
                    </div>
                </div>
            }
        >
            <WindowTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'equipment' && (
                    <EquipmentView character={character} inventory={visibleInventory} onToggle={handleEquipToggle} />
                )}
                {activeTab === 'backpack' && (
                    <ItemList list={bagItems} character={character} onEquip={handleEquipToggle} onUse={handleUse} empty="Ton sac à dos est vide." />
                )}
                {activeTab === 'consumables' && (
                    <ItemList list={consumables} character={character} onEquip={handleEquipToggle} onUse={handleUse} empty="Aucun consommable disponible." />
                )}
            </div>
        </GameWindow>
    );
}

function EquipmentView({
    character,
    inventory,
    onToggle,
}: {
    character: CharacterSheet;
    inventory: InventoryItem[];
    onToggle: (item: InventoryItem, slot?: 'mainHand' | 'offHand') => void;
}) {
    const getEquipped = (slot: string) => inventory.find(item => item.equipped && item.slot === slot);
    const weapons = inventory.filter(item => item.equipped && item.type === 'weapon');

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {EQUIPMENT_SLOTS.map(slot => (
                    <SlotCard
                        key={slot.id}
                        label={slot.label}
                        item={getEquipped(slot.id)}
                        onUnequip={onToggle}
                    />
                ))}
            </div>

            <aside className="space-y-3">
                <div className="rounded-md border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                        <Shield className="h-4 w-4" />
                        Prêt au combat
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <Metric label="CA" value={String(getEffectiveAC(character))} />
                        <Metric label="Vitesse" value={`${getEffectiveSpeed(character)} ft`} />
                        <Metric label="PV" value={`${character.hp.current}/${character.hp.max}`} />
                    </div>
                </div>

                <div className="rounded-md border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                        <Sword className="h-4 w-4" />
                        Attaques équipées
                    </div>
                    <div className="space-y-2">
                        {weapons.map(item => {
                            const stats = attackStats(character, item);
                            return (
                                <div key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="truncate font-bold text-white/90">{item.name}</span>
                                        <span className="font-mono text-amber-300">{stats.attack >= 0 ? `+${stats.attack}` : stats.attack}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-white/45">{stats.damage}</div>
                                </div>
                            );
                        })}
                        {!weapons.length && <div className="rounded-md border border-white/10 p-3 text-sm text-white/40">Aucune arme équipée.</div>}
                    </div>
                </div>
            </aside>
        </div>
    );
}

function SlotCard({
    label,
    item,
    onUnequip,
}: {
    key?: React.Key;
    label: string;
    item?: InventoryItem;
    onUnequip: (item: InventoryItem) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => item && onUnequip(item)}
            disabled={!item}
            className={`min-h-[84px] rounded-md border p-3 text-left transition ${
                item
                    ? 'border-amber-400/35 bg-amber-400/10 hover:bg-amber-400/15'
                    : 'cursor-default border-white/10 bg-white/[0.03]'
            }`}
        >
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/35">{label}</div>
            <div className={`mt-2 truncate font-bold ${item ? 'text-amber-200' : 'text-white/30'}`}>{item?.name || 'Vide'}</div>
            <div className="mt-1 truncate text-xs text-white/40">{item ? itemMechanicLine(item) : 'Aucun objet équipé'}</div>
        </button>
    );
}

function ItemList({
    list,
    character,
    onEquip,
    onUse,
    empty,
}: {
    list: InventoryItem[];
    character: CharacterSheet;
    onEquip: (item: InventoryItem, slot?: 'mainHand' | 'offHand') => void;
    onUse: (item: InventoryItem) => void;
    empty: string;
}) {
    if (!list.length) {
        return <div className="rounded-md border border-white/10 p-8 text-center text-white/40">{empty}</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            {list.map(item => (
                <InventoryRow key={item.id} item={item} character={character} onEquip={onEquip} onUse={onUse} />
            ))}
        </div>
    );
}

function InventoryRow({
    item,
    character,
    onEquip,
    onUse,
}: {
    key?: React.Key;
    item: InventoryItem;
    character: CharacterSheet;
    onEquip: (item: InventoryItem, slot?: 'mainHand' | 'offHand') => void;
    onUse: (item: InventoryItem) => void;
}) {
    const stats = item.type === 'weapon' ? attackStats(character, item) : null;

    return (
        <div className={`grid gap-3 rounded-md border p-3 transition md:grid-cols-[minmax(0,1fr)_auto] ${item.equipped ? 'border-amber-400/35 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
            <div className="flex min-w-0 gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${item.equipped ? 'border-amber-400/25 text-amber-300' : 'border-white/10 text-white/45'}`}>
                    <ItemIcon item={item} />
                </div>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-white/90">{item.name}</h3>
                        {item.quantity > 1 && <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/55">x{item.quantity}</span>}
                    </div>
                    <div className="mt-1 text-xs text-white/50">{itemMechanicLine(item)}</div>
                    {stats && <div className="mt-1 text-xs text-amber-200/80">Attack {stats.attack >= 0 ? `+${stats.attack}` : stats.attack} / {stats.damage}</div>}
                    <div className="mt-2 flex flex-wrap gap-1">
                        {itemTags(item).slice(0, 5).map(tag => (
                            <span key={tag} className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/35">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                {item.type === 'consumable' && (
                    <button
                        type="button"
                        onClick={() => onUse(item)}
                        className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
                    >
                        Utiliser
                    </button>
                )}
                {item.type === 'weapon' && (
                    <>
                        <button
                            type="button"
                            onClick={() => onEquip(item, 'mainHand')}
                            className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped && item.slot === 'mainHand' ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                        >
                            Principale
                        </button>
                        <button
                            type="button"
                            onClick={() => onEquip(item, 'offHand')}
                            className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped && item.slot === 'offHand' ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                        >
                            Off-hand
                        </button>
                    </>
                )}
                {(item.type !== 'weapon' && item.type !== 'consumable' && inferItemSlot(item) !== 'none') && (
                    <button
                        type="button"
                        onClick={() => onEquip(item)}
                        className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                    >
                        {item.equipped ? 'Retirer' : 'Équiper'}
                    </button>
                )}
            </div>
        </div>
    );
}

function ItemIcon({ item }: { item: InventoryItem }) {
    if (item.type === 'weapon') return <Sword className="h-5 w-5" />;
    if (item.type === 'armor') return <Shield className="h-5 w-5" />;
    if (item.type === 'consumable') return <Sparkles className="h-5 w-5" />;
    if (item.type === 'container') return <Backpack className="h-5 w-5" />;
    return <Package className="h-5 w-5" />;
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/30 p-2">
            <div className="text-[10px] uppercase tracking-wide text-white/35">{label}</div>
            <div className="mt-1 truncate font-fantasy text-xl font-bold text-white">{value}</div>
        </div>
    );
}

export function CharacterSheetPanel({ character, onClose, onUpdateCharacter }: Props) {
    const visibleInventory = useVisibleInventory(character);
    const equippedWeapons = visibleInventory.filter(item => item.type === 'weapon' && item.equipped);
    const resources = Object.entries(character.resources || {});
    const spellSlots = Object.entries(character.spellSlots || {});
    const xpProgress = getXPProgress(character.level, character.xp);
    const subclassConfig = getSubclassConfig(character.class);
    const needsSubclass = subclassNeedsChoice(character);

    const handlePickSubclass = (optionName: string) => {
        if (!onUpdateCharacter || !subclassConfig) return;
        const option = subclassConfig.options.find(o => o.name === optionName);
        if (!option) return;
        const gained = getSubclassFeaturesForLevel(character.class, optionName, character.level);
        const existingNames = new Set((character.features || []).map(f => f.name));
        // ensureProgressionState refreshes subclass-driven resources (Battle
        // Master superiority dice, War Priest uses…) right away.
        onUpdateCharacter(ensureProgressionState({
            ...character,
            subclass: optionName,
            features: [
                ...(character.features || []),
                ...gained.filter(f => !existingNames.has(f.name)),
            ],
        }));
    };

    return (
        <GameWindow
            title={character.name}
            subtitle={`${character.race} ${character.class}${character.subclass ? ` (${character.subclass})` : ''} / Niveau ${character.level} / ${character.background}`}
            icon={<User className="h-5 w-5" />}
            onClose={onClose}
            size="xl"
            tone="paper"
            bodyClassName="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar sm:p-6"
        >
            <div className="grid gap-5 xl:grid-cols-[170px_minmax(0,1fr)_330px]">
                <section className="grid grid-cols-3 gap-3 xl:grid-cols-1">
                    {ABILITIES.map(ability => {
                        const baseVal = character.stats[ability];
                        const effectiveVal = getEffectiveStat(character, ability);
                        const modified = isStatModified(character, ability);

                        return (
                            <div
                                key={ability}
                                className={`rounded-md border-2 p-3 text-center ${modified ? 'border-emerald-500 bg-emerald-50' : 'border-stone-400 bg-white/35'}`}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{ability}</div>
                                <div className={`font-fantasy text-3xl font-black ${modified ? 'text-emerald-700' : 'text-stone-950'}`}>{formatMod(effectiveVal)}</div>
                                <div className="mx-auto mt-1 inline-flex min-w-8 justify-center rounded-full border border-stone-400 bg-white px-2 py-0.5 text-xs font-bold">
                                    {effectiveVal}
                                </div>
                                {modified && baseVal !== effectiveVal && (
                                    <div className="mt-1 text-[10px] font-bold text-emerald-700">base {baseVal}</div>
                                )}
                            </div>
                        );
                    })}
                </section>

                <section className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <PaperMetric icon={<Shield className="h-4 w-4" />} label="Classe d'Armure" value={String(getEffectiveAC(character))} hint={`base ${character.ac}`} />
                        <PaperMetric icon={<Zap className="h-4 w-4" />} label="Initiative" value={formatMod(getEffectiveStat(character, 'DEX'))} />
                        <PaperMetric icon={<HeartPulse className="h-4 w-4" />} label="Vitesse" value={`${getEffectiveSpeed(character)} ft`} />
                    </div>

                    <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">Points de Vie</h3>
                            <div className="flex gap-3 text-xs font-bold uppercase text-stone-500">
                                {(character.tempHP || 0) > 0 && <span>Temp +{character.tempHP}</span>}
                                <span>Max {character.hp.max}</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <div className="font-fantasy text-5xl font-black">{character.hp.current}</div>
                            <div className="min-w-0 flex-1">
                                <div className="h-4 overflow-hidden rounded-full border border-stone-300 bg-stone-200">
                                    <div
                                        className="h-full bg-red-700 transition-all"
                                        style={{ width: `${Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expérience — progression vers le prochain niveau */}
                    <div className="rounded-md border-2 border-amber-500 bg-amber-50 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                                <Star className="h-4 w-4" />
                                Expérience — Niveau {character.level}
                            </h3>
                            <div className="text-xs font-bold uppercase text-amber-700">
                                {xpProgress.nextLevelXP !== null
                                    ? `${character.xp} / ${xpProgress.nextLevelXP} XP`
                                    : `${character.xp} XP — NIVEAU MAX`}
                            </div>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full border border-amber-300 bg-amber-100">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                                style={{ width: `${Math.max(0, Math.min(100, xpProgress.percent))}%` }}
                            />
                        </div>
                        {xpProgress.nextLevelXP !== null && (
                            <div className="mt-1 text-right text-[11px] text-amber-800/70">
                                {xpProgress.neededForNext - xpProgress.intoLevel} XP avant le niveau {character.level + 1}
                            </div>
                        )}
                    </div>

                    {/* Points de caractéristique en attente (ASI banké via « Plus tard ») */}
                    {(character.pendingASIPoints || 0) > 0 && (
                        <div className="rounded-md border-2 border-green-600 bg-green-50 p-4">
                            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-700">
                                <Zap className="h-4 w-4" />
                                Points de caractéristique en attente : {character.pendingASIPoints}
                            </h3>
                            <p className="mb-3 text-xs text-green-800/80">
                                Clique sur une caractéristique pour y ajouter +1 (max 20).
                            </p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                {ABILITIES.map(stat => {
                                    const maxed = character.stats[stat] >= 20;
                                    return (
                                        <button
                                            key={stat}
                                            type="button"
                                            disabled={!onUpdateCharacter || maxed}
                                            onClick={() => {
                                                if (!onUpdateCharacter) return;
                                                onUpdateCharacter({
                                                    ...character,
                                                    stats: { ...character.stats, [stat]: Math.min(20, character.stats[stat] + 1) },
                                                    pendingASIPoints: Math.max(0, (character.pendingASIPoints || 0) - 1),
                                                });
                                            }}
                                            className="rounded-md border-2 border-green-300 bg-white p-2 text-center transition hover:border-green-600 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <div className="text-xs font-bold text-green-900">{stat}</div>
                                            <div className="text-sm font-black">{character.stats[stat]} <span className="text-green-600">+1</span></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Choix d'archétype en attente (Hunter/Beast Master, Champion, Domaine…) */}
                    {needsSubclass && subclassConfig && (
                        <div className="rounded-md border-2 border-purple-500 bg-purple-50 p-4">
                            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-700">
                                <Gem className="h-4 w-4" />
                                {subclassConfig.label} — choix requis !
                            </h3>
                            <p className="mb-3 text-xs text-purple-800/80">
                                Ton {character.class} niveau {character.level} doit choisir sa spécialisation. Ce choix débloque de vraies capacités mécaniques.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {subclassConfig.options.map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handlePickSubclass(option.name)}
                                        disabled={!onUpdateCharacter}
                                        className="rounded-md border-2 border-purple-300 bg-white p-3 text-left transition hover:border-purple-600 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <div className="font-bold text-purple-900">{option.name}</div>
                                        <p className="mt-1 text-xs leading-snug text-stone-600">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">Attaques & Sorts</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[460px] text-sm">
                                <thead className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
                                    <tr>
                                        <th className="pb-2">Nom</th>
                                        <th className="pb-2">Attaque</th>
                                        <th className="pb-2">Dégâts</th>
                                        <th className="pb-2">Propriétés</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equippedWeapons.map(item => {
                                        const stats = attackStats(character, item);
                                        return (
                                            <tr key={item.id} className="border-b border-stone-200">
                                                <td className="py-2 font-bold">{item.name}</td>
                                                <td className="py-2 font-mono">{stats.attack >= 0 ? `+${stats.attack}` : stats.attack}</td>
                                                <td className="py-2">{stats.damage}</td>
                                                <td className="py-2 text-xs text-stone-500">{stats.properties.join(', ') || 'aucune'}</td>
                                            </tr>
                                        );
                                    })}
                                    {!equippedWeapons.length && (
                                        <tr><td colSpan={4} className="py-3 text-stone-500">Aucune arme équipée.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {!!character.activeEffects?.length && (
                        <div className="rounded-md border-2 border-emerald-500 bg-emerald-50 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                                <Sparkles className="h-4 w-4" />
                                Effets actifs
                            </h3>
                            <div className="space-y-2">
                                {character.activeEffects.map((effect, index) => (
                                    <div key={effect.id || index} className="rounded-md border border-emerald-200 bg-white p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-bold text-emerald-900">{effect.name}</span>
                                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">{formatEffectDuration(effect.duration)}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-emerald-800/70">
                                            {effect.modifiers.map(modifier =>
                                                modifier.setTo !== undefined
                                                    ? `${modifier.stat}=${modifier.setTo}`
                                                    : `${modifier.stat}${modifier.bonus >= 0 ? '+' : ''}${modifier.bonus}`
                                            ).join(', ') || effect.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <aside className="space-y-4">
                    <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">Ressources</h3>
                        <div className="space-y-2">
                            {spellSlots.map(([slot, pool]) => (
                                <ResourceBar key={slot} label={`Emplacement niv. ${slot.replace('level', '').replace('pact', 'pacte ')}`} current={pool.current} max={pool.max} />
                            ))}
                            {resources.map(([key, resource]) => (
                                <ResourceBar key={key} label={resource.label || key} current={resource.current} max={resource.max} />
                            ))}
                            {!spellSlots.length && !resources.length && (
                                <p className="text-sm text-stone-500">Aucune ressource limitée pour l'instant.</p>
                            )}
                        </div>
                    </div>

                    {((character.cantrips || []).length > 0 || (character.knownSpells || []).length > 0 || (character.preparedSpells || []).length > 0) && (
                        <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-700">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                Sorts & Magie
                            </h3>
                            <div className="space-y-3">
                                {(character.cantrips || []).length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Tours de magie</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {character.cantrips?.map(spell => (
                                                <span key={spell} className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs text-purple-900 font-serif">
                                                    {spell}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {((character.knownSpells || []).length > 0 || (character.preparedSpells || []).length > 0) && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                                            {character.preparedSpells?.length ? 'Sorts préparés' : 'Sorts connus'}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {(character.preparedSpells?.length ? character.preparedSpells : character.knownSpells)?.map(spell => (
                                                <span key={spell} className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs text-purple-900 font-serif">
                                                    {spell}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {character.spellcastingAbility && (
                                    <div className="text-[10px] border-t border-stone-200 pt-2 text-stone-500 font-mono">
                                        Caractéristique magique : <span className="font-bold text-stone-700">{character.spellcastingAbility}</span>
                                        {character.spellcastingFocus && (
                                            <> | Focaliseur : <span className="font-bold text-stone-700">{character.spellcastingFocus}</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
                            <Gem className="h-4 w-4" />
                            Capacités & Traits
                        </h3>
                        <div className="max-h-72 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                            {character.features?.map((feature, index) => (
                                <div key={`${feature.name}-${index}`} className="border-b border-stone-200 pb-2 last:border-0">
                                    <div className="font-bold">{feature.name}</div>
                                    <p className="text-sm leading-snug text-stone-600">{feature.description}</p>
                                </div>
                            ))}
                            {!character.features?.length && <p className="text-sm text-stone-500">Aucune capacité enregistrée.</p>}
                        </div>
                    </div>

                    <div className="rounded-md border-2 border-stone-400 bg-white/45 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">Maîtrises</h3>
                        <div className="flex flex-wrap gap-1">
                            {character.proficiencies?.map(proficiency => (
                                <span key={proficiency} className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
                                    {proficiency}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </GameWindow>
    );
}

function PaperMetric({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
    return (
        <div className="rounded-md border-2 border-stone-400 bg-white/45 p-3 text-center">
            <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded border border-stone-300 bg-white text-stone-700">{icon}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</div>
            <div className="font-fantasy text-3xl font-black">{value}</div>
            {hint && <div className="text-[10px] text-stone-500">{hint}</div>}
        </div>
    );
}

function ResourceBar({ label, current, max }: { key?: React.Key; label: string; current: number; max: number }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

    return (
        <div>
            <div className="mb-1 flex justify-between text-xs font-bold uppercase text-stone-600">
                <span>{label}</span>
                <span>{current}/{max}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-300">
                <div className="h-full bg-stone-800" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function formatEffectDuration(duration: string): string {
    if (duration === 'long_rest') return 'Repos long';
    if (duration === 'short_rest') return 'Repos court';
    if (duration === 'concentration') return 'Concentration';
    if (duration === '1_hour') return '1 heure';
    if (duration === '8_hours') return '8 heures';
    if (duration === 'rounds') return 'Rounds';
    if (duration === 'permanent') return 'Permanent';
    return duration;
}
