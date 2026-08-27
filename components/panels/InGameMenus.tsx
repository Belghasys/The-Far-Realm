import React, { useMemo, useState } from 'react';
import { Ability, ATTUNEMENT_LIMIT, CharacterSheet, InventoryItem, ItemSlot, getBaseACFromArmor, getEffectiveAC, getEffectiveSpeed, getEffectiveStat, getEffectiveMaxHP, getPlayerAttackModifier, getPlayerDamageBonus, getXPProgress, isRangedWeapon, isStatModified } from '../../types';
import { Backpack, Coins, Gem, HeartPulse, Package, Scale, Shield, Sparkles, Star, Sword, User, Zap } from 'lucide-react';
import { getSubclassConfig, subclassNeedsChoice, getSubclassFeaturesForLevel } from '../../data/subclasses';
import { featureName, featureDesc, subclassName, dispClass, dispRace, dispBackground, dispSubclass, pick } from '../../data/labels';
import { effectiveMountMaxHP } from '../../engine/rulesEngine';
import { structureInventoryItem } from '../../engine/codexService';
import { ensureProgressionState, featNumericBonus } from '../../engine/rulesEngine';
import { getGearAdvantages, SKILL_TRANSLATIONS } from '../../engine/skillSystem';
import { getFeatById } from '../../data/feats';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType } from '../../data/companionOptions';
import { GameWindow, WindowTabs } from './GameWindow';
import { useGameStore } from '../../store/gameStore';
import { IN_GAME_MENUS_TEXTS as TRANS } from './texts';
import { toWeaponOverride } from '../../engine/weaponOverride';

// NF1 — certaines clés sont des fonctions (dropConfirm) : le type doit
// préserver les signatures au lieu d'aplatir tout en `string`.
type Tr = typeof TRANS['en'] | typeof TRANS['fr'];

/**
 * EN / FR language toggle wired to the zustand store. Highlights the active
 * language and switches the whole UI immediately via setLanguage.
 */
function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'paper' }) {
    const language = useGameStore(s => s.language);
    const setLanguage = useGameStore(s => s.setLanguage);
    const inactive = tone === 'paper'
        ? 'text-stone-600 hover:bg-stone-900/10 hover:text-stone-950'
        : 'text-white/55 hover:bg-white/10 hover:text-white';
    return (
        <div className={`flex items-center gap-1 rounded-md border p-0.5 ${tone === 'paper' ? 'border-stone-900/20 bg-stone-50/50' : 'border-white/10 bg-black/30'}`}>
            {(['en', 'fr'] as const).map(lng => (
                <button
                    key={lng}
                    type="button"
                    onClick={() => setLanguage(lng)}
                    aria-pressed={language === lng}
                    className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
                        language === lng ? 'bg-amber-400 text-black' : inactive
                    }`}
                >
                    {lng.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

interface Props {
    character: CharacterSheet;
    onClose: () => void;
    onUpdateCharacter?: (char: CharacterSheet) => void;
    /** Notified when a consumable is used from the inventory (out of combat),
     *  so GameSession can show the dice roll, log it, and inform the DM —
     *  consistent with the in-combat potion flow. */
    onItemUsed?: (info: { name: string; healing: number; formula: string }) => void;
    /** NF1 — notified when the player throws an item away, so GameSession can
     *  tell the DM (the item becomes a narrative element: left on the ground,
     *  lootable by NPCs…). */
    onItemDropped?: (info: { name: string; quantity: number }) => void;
}

type InventoryTab = 'equipment' | 'backpack' | 'consumables';

const EQUIPMENT_SLOTS = [
    { id: 'head', labelKey: 'head' },
    { id: 'neck', labelKey: 'neck' },
    { id: 'back', labelKey: 'back' },
    { id: 'chest', labelKey: 'chest' },
    { id: 'waist', labelKey: 'waist' },
    { id: 'hands', labelKey: 'hands' },
    { id: 'mainHand', labelKey: 'mainHand' },
    { id: 'offHand', labelKey: 'offHand' },
    { id: 'ranged', labelKey: 'ranged' },
    { id: 'ring', labelKey: 'ring' },
    { id: 'ring2', labelKey: 'ring2' },
    { id: 'legs', labelKey: 'legs' },
    { id: 'feet', labelKey: 'feet' },
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

function itemMechanicLine(item: InventoryItem, tr: Tr): string {
    const structured = structureInventoryItem(item);
    if (structured.damageDice) return `${structured.damageDice} ${structured.damageType || tr.damage}`;
    if (structured.ac) return `${tr.ac} ${structured.ac}`;
    if (structured.acBonus) return `+${structured.acBonus} ${tr.ac}`;
    return item.effect || item.description || tr.noMechanicalEffect;
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

function attackStats(character: CharacterSheet, item: InventoryItem) {
    const weapon = toWeaponOverride(item);
    const isOffhand = item.slot === 'offHand';
    const attack = getPlayerAttackModifier(character, weapon);
    const damageBonus = getPlayerDamageBonus(character, weapon, isOffhand);
    const damage = `${weapon.damage}${damageBonus >= 0 ? '+' : ''}${damageBonus} ${weapon.damageType}`;
    return { attack, damage, properties: weapon.properties || [] };
}

function rollHealing(item: InventoryItem, maximize = false): { total: number; formula: string } {
    const text = `${item.name || ''} ${item.effect || ''} ${item.description || ''}`.trim();
    // L'ancien pattern exigeait heal|hp|pv COLLÉ aux dés : « restaure 2d4+2
    // points de vie » ou « soigne 2d4+2 PV » échouaient → potion muette. On
    // accepte maintenant des dés N'IMPORTE OÙ dès que le texte parle de soin
    // (FR ou EN), y compris « points de vie » en toutes lettres.
    const HEAL_WORDS = /(healing|heal|hit\s*point|hp|pv|points?\s+de\s+vie|vie|soins?|soigne|gu[ée]ri|restaure|regagne|cure)/i;
    if (!HEAL_WORDS.test(text)) return { total: 0, formula: '' };
    const match = text.match(/(\d+)d(\d+)\s*([+-]\s*\d+)?/i);
    if (!match) return { total: 0, formula: '' };

    const count = Number(match[1]);
    const sides = Number(match[2]);
    const flat = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0;
    if (!Number.isFinite(count) || !Number.isFinite(sides)) return { total: 0, formula: '' };

    // Mode histoire : toujours le maximum des dés.
    let total = flat + (maximize ? count * sides : 0);
    if (!maximize) {
        for (let i = 0; i < count; i += 1) {
            total += Math.floor(Math.random() * sides) + 1;
        }
    }
    return {
        total: Math.max(0, total),
        formula: `${count}d${sides}${flat ? `${flat >= 0 ? '+' : ''}${flat}` : ''}${maximize ? ' (max)' : ''}`,
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
    // Les armes À DISTANCE ont leur propre emplacement : arc + épée restent
    // équipés ensemble (les armes de jet type dague restent en main directrice).
    if (item.type === 'weapon') {
        const structured = structureInventoryItem(item);
        const props = structured.properties || item.properties || [];
        const range = structured.range || item.range;
        return isRangedWeapon({ name: item.name, properties: props, range }) ? 'ranged' : 'mainHand';
    }

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

export function InventoryPanel({ character, onClose, onUpdateCharacter, onItemUsed, onItemDropped }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const [activeTab, setActiveTab] = useState<InventoryTab>('equipment');
    // ui-m6 — avertissements d'équipement en bannière locale (plus d'alert()).
    const [equipNotice, setEquipNotice] = useState<string | null>(null);
    const equipNoticeTimer = React.useRef<number | null>(null);
    const showEquipNotice = (text: string) => {
        setEquipNotice(text);
        if (equipNoticeTimer.current) window.clearTimeout(equipNoticeTimer.current);
        equipNoticeTimer.current = window.setTimeout(() => setEquipNotice(null), 4000);
    };
    const visibleInventory = useVisibleInventory(character);
    const equippedItems = visibleInventory.filter(item => item.equipped);
    const bagItems = visibleInventory.filter(item => !item.equipped && item.type !== 'consumable');
    const consumables = visibleInventory.filter(item => item.type === 'consumable');
    const totalWeight = visibleInventory.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    // SRD — capacité de charge = FOR × 15 lb (audit 2026-08-12 : le poids était
    // affiché mais aucun seuil n'existait).
    const carryCapacity = getEffectiveStat(character, 'STR') * 15;
    const overloaded = totalWeight > carryCapacity;

    const tabs = [
        { id: 'equipment' as const, label: tr.equipment, count: equippedItems.length },
        { id: 'backpack' as const, label: tr.backpack, count: bagItems.length },
        { id: 'consumables' as const, label: tr.consumables, count: consumables.length },
    ];

    const recalcBaseAC = (inventory: InventoryItem[]): number => {
        const dexMod = abilityModifier(getEffectiveStat(character, 'DEX'));
        return getBaseACFromArmor({ ...character, inventory, ac: 10 + dexMod });
    };

    const handleEquipToggle = (item: InventoryItem, targetSlot?: 'mainHand' | 'offHand' | 'ranged') => {
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

            // SRD — plafond d'HARMONISATION : au plus 3 objets `attunement`
            // équipés en même temps (le drapeau était décoratif — audit
            // 2026-08-12).
            if (current.attunement === true) {
                const attunedCount = nextInventory.filter(i =>
                    i.equipped && i.attunement === true && i.id !== current.id).length;
                if (attunedCount >= ATTUNEMENT_LIMIT) {
                    showEquipNotice(tr.attunementWarn);
                    return;
                }
            }

            // PL6 — deux anneaux : si 'ring' est déjà occupé par un AUTRE
            // anneau et que 'ring2' est libre, le nouveau va en 'ring2'.
            if (requestedSlot === 'ring') {
                const ringTaken = nextInventory.some(i => i.equipped && i.slot === 'ring' && i.id !== current.id);
                const ring2Free = !nextInventory.some(i => i.equipped && i.slot === 'ring2' && i.id !== current.id);
                if (ringTaken && ring2Free) requestedSlot = 'ring2';
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
                        showEquipNotice(tr.twoHandedWarn);
                        return;
                    }
                }

                if (current.type === 'weapon') {
                    // RAW SRD : le combat à deux armes exige une arme de MÊLÉE
                    // LÉGÈRE. L'ancien test admettait finesse (rapière/fouet
                    // illégaux) et ne bloquait pas les armes à distance
                    // (arbalète de poing) — audit 2026-08-12.
                    const offProps = current.properties || [];
                    if (!offProps.includes('light') || offProps.includes('ammunition')) {
                        showEquipNotice(tr.offHandWarn);
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
        // L'arme « de référence » de la fiche = main directrice, SINON l'arme à
        // distance équipée. Un archer pur (arc dans le slot distance, rien en
        // main) restait « Mains nues / mêlée » pour le moteur ET pour le MJ.
        // (suite : recalcul CA + weapon ci-dessous)
        const mainHandWeapon = nextInventory.find(invItem => invItem.equipped && invItem.slot === 'mainHand' && invItem.type === 'weapon')
            || nextInventory.find(invItem => invItem.equipped && invItem.slot === 'ranged' && invItem.type === 'weapon');
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

    // NF1 — jeter un objet du SAC (les objets équipés doivent d'abord être
    // déséquipés : le bouton n'apparaît que sur les objets non équipés).
    const handleDropItem = (item: InventoryItem) => {
        if (!onUpdateCharacter) return;
        if (item.equipped) {
            showEquipNotice(tr.dropEquippedHint);
            return;
        }
        if (!window.confirm(tr.dropConfirm(item.name, item.quantity))) return;
        const nextInventory = (character.inventory || [])
            .map(normalizeInventoryItem)
            .filter(inventoryItem => inventoryItem.id !== item.id);
        onUpdateCharacter({ ...character, inventory: nextInventory });
        onItemDropped?.({ name: item.name, quantity: item.quantity });
    };

    const handleUse = (item: InventoryItem) => {
        if (!onUpdateCharacter) return;

        const nextInventory = (character.inventory || []).map(normalizeInventoryItem);
        const targetIndex = nextInventory.findIndex(inventoryItem => inventoryItem.id === item.id);
        if (targetIndex === -1) return;

        const healing = rollHealing(nextInventory[targetIndex], !!character.storyMode);
        const nextHP = healing.total > 0
            ? Math.min(getEffectiveMaxHP(character), character.hp.current + healing.total)
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
            title={tr.inventory}
            subtitle={`${visibleInventory.length} ${tr.visibleItems} / ${totalWeight.toFixed(1)} ${tr.carried}`}
            icon={<Backpack className="h-5 w-5" />}
            onClose={onClose}
            actions={<LanguageToggle />}
            size="lg"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className={`flex items-center gap-2 ${overloaded ? 'text-red-400' : 'text-white/60'}`}>
                        <Scale className={`h-4 w-4 ${overloaded ? 'text-red-400' : 'text-amber-300'}`} />
                        <span>{totalWeight.toFixed(1)} / {carryCapacity} lb{overloaded ? ` — ${tr.overloaded}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-amber-300">
                        <Coins className="h-4 w-4" />
                        <span>{character.gold || 0} {tr.gp}</span>
                    </div>
                </div>
            }
        >
            <WindowTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            {/* ui-m6 — bannière d'avertissement d'équipement (ex-alert()). */}
            {equipNotice && (
                <div className="mx-4 mt-2 rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-200">
                    ⚠️ {equipNotice}
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'equipment' && (
                    <EquipmentView character={character} inventory={visibleInventory} onToggle={handleEquipToggle} tr={tr} />
                )}
                {activeTab === 'backpack' && (
                    <ItemList list={bagItems} character={character} onEquip={handleEquipToggle} onUse={handleUse} onDrop={handleDropItem} empty={tr.backpackEmpty} tr={tr} />
                )}
                {activeTab === 'consumables' && (
                    <ItemList list={consumables} character={character} onEquip={handleEquipToggle} onUse={handleUse} onDrop={handleDropItem} empty={tr.noConsumables} tr={tr} />
                )}
            </div>
        </GameWindow>
    );
}

function EquipmentView({
    character,
    inventory,
    onToggle,
    tr,
}: {
    character: CharacterSheet;
    inventory: InventoryItem[];
    onToggle: (item: InventoryItem, slot?: 'mainHand' | 'offHand' | 'ranged') => void;
    tr: Tr;
}) {
    const getEquipped = (slot: string) => inventory.find(item => item.equipped && item.slot === slot);
    const weapons = inventory.filter(item => item.equipped && item.type === 'weapon');

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {EQUIPMENT_SLOTS.map(slot => (
                    <SlotCard
                        key={slot.id}
                        label={tr[slot.labelKey]}
                        item={getEquipped(slot.id)}
                        onUnequip={onToggle}
                        tr={tr}
                    />
                ))}
            </div>

            <aside className="space-y-3">
                <div className="rounded-md border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                        <Shield className="h-4 w-4" />
                        {tr.combatReady}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <Metric label={tr.ac} value={String(getEffectiveAC(character))} />
                        <Metric label={tr.speed} value={`${getEffectiveSpeed(character)} ft`} />
                        <Metric label={tr.hp} value={`${character.hp.current}/${getEffectiveMaxHP(character)}`} />
                    </div>
                    {character.mount && (
                        <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-center text-[11px] text-amber-200/90" title={character.mount.description || character.mount.name}>
                            🐴 {character.mount.name} — {character.mount.speed} ft{character.mount.flying ? ' ✈' : ''}
                        </div>
                    )}
                    {character.familiar && (
                        <div className="mt-2 rounded border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5 text-center text-[11px] text-sky-200/90" title={character.familiar.description || character.familiar.kind}>
                            🦉 {character.familiar.name} ({character.familiar.kind})
                        </div>
                    )}
                </div>

                <div className="rounded-md border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                        <Sword className="h-4 w-4" />
                        {tr.equippedAttacks}
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
                        {!weapons.length && <div className="rounded-md border border-white/10 p-3 text-sm text-white/40">{tr.noWeaponEquipped}</div>}
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
    tr,
}: {
    key?: React.Key;
    label: string;
    item?: InventoryItem;
    onUnequip: (item: InventoryItem) => void;
    tr: Tr;
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
            <div className={`mt-2 truncate font-bold ${item ? 'text-amber-200' : 'text-white/30'}`}>{item?.name || tr.empty}</div>
            <div className="mt-1 truncate text-xs text-white/40">{item ? itemMechanicLine(item, tr) : tr.noItemEquipped}</div>
        </button>
    );
}

function ItemList({
    list,
    character,
    onEquip,
    onUse,
    onDrop,
    empty,
    tr,
}: {
    list: InventoryItem[];
    character: CharacterSheet;
    onEquip: (item: InventoryItem, slot?: 'mainHand' | 'offHand' | 'ranged') => void;
    onUse: (item: InventoryItem) => void;
    onDrop?: (item: InventoryItem) => void;
    empty: string;
    tr: Tr;
}) {
    if (!list.length) {
        return <div className="rounded-md border border-white/10 p-8 text-center text-white/40">{empty}</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            {list.map(item => (
                <InventoryRow key={item.id} item={item} character={character} onEquip={onEquip} onUse={onUse} onDrop={onDrop} tr={tr} />
            ))}
        </div>
    );
}

function InventoryRow({
    item,
    character,
    onEquip,
    onUse,
    onDrop,
    tr,
}: {
    key?: React.Key;
    item: InventoryItem;
    character: CharacterSheet;
    onEquip: (item: InventoryItem, slot?: 'mainHand' | 'offHand' | 'ranged') => void;
    onUse: (item: InventoryItem) => void;
    onDrop?: (item: InventoryItem) => void;
    tr: Tr;
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
                    <div className="mt-1 text-xs text-white/50">{itemMechanicLine(item, tr)}</div>
                    {stats && <div className="mt-1 text-xs text-amber-200/80">{tr.attack} {stats.attack >= 0 ? `+${stats.attack}` : stats.attack} / {stats.damage}</div>}
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
                        {tr.use}
                    </button>
                )}
                {item.type === 'weapon' && (
                    <>
                        <button
                            type="button"
                            onClick={() => onEquip(item, 'mainHand')}
                            className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped && item.slot === 'mainHand' ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                        >
                            {tr.mainHandBtn}
                        </button>
                        <button
                            type="button"
                            onClick={() => onEquip(item, 'offHand')}
                            className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped && item.slot === 'offHand' ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                        >
                            {tr.offHandBtn}
                        </button>
                        {/* UI2 — le slot « arme à distance » était inatteignable :
                            aucun bouton ne passait 'ranged', donc un arc déséquipé
                            ne pouvait revenir qu'en main directrice (en éjectant
                            l'épée). L'archer arc + épée devient réalisable. */}
                        {inferItemSlot(item) === 'ranged' && (
                            <button
                                type="button"
                                onClick={() => onEquip(item, 'ranged')}
                                className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped && item.slot === 'ranged' ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                            >
                                {tr.rangedBtn}
                            </button>
                        )}
                    </>
                )}
                {(item.type !== 'weapon' && item.type !== 'consumable' && inferItemSlot(item) !== 'none') && (
                    <button
                        type="button"
                        onClick={() => onEquip(item)}
                        className={`rounded-md border px-3 py-2 text-xs font-bold uppercase tracking-wide ${item.equipped ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 text-white/60 hover:bg-white/10'}`}
                    >
                        {item.equipped ? tr.unequip : tr.equip}
                    </button>
                )}
                {/* NF1 — jeter : seulement pour les objets NON équipés
                    (déséquiper d'abord — le bouton n'existe pas sur l'équipé). */}
                {onDrop && !item.equipped && (
                    <button
                        type="button"
                        onClick={() => onDrop(item)}
                        title={tr.dropTitle}
                        className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-300/80 hover:bg-red-500/20"
                    >
                        {tr.dropBtn}
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
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
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
            subtitle={`${dispRace(character.race, language)} ${dispClass(character.class, language)}${character.subclass ? ` (${dispSubclass(character.subclass, language)})` : ''} / ${tr.level} ${character.level} / ${dispBackground(character.background, language)}`}
            icon={<User className="h-5 w-5" />}
            onClose={onClose}
            actions={<LanguageToggle tone="paper" />}
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
                                className={`rounded-md border-2 p-3 text-center ${modified ? 'border-emerald-500 bg-emerald-500/15' : 'border-stone-400 bg-stone-50/50'}`}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{ability}</div>
                                <div className={`font-fantasy text-3xl font-black ${modified ? 'text-emerald-300' : 'text-stone-950'}`}>{formatMod(effectiveVal)}</div>
                                <div className="mx-auto mt-1 inline-flex min-w-8 justify-center rounded-full border border-stone-400 bg-stone-50 px-2 py-0.5 text-xs font-bold">
                                    {effectiveVal}
                                </div>
                                {modified && baseVal !== effectiveVal && (
                                    <div className="mt-1 text-[10px] font-bold text-emerald-300">base {baseVal}</div>
                                )}
                            </div>
                        );
                    })}
                </section>

                <section className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <PaperMetric icon={<Shield className="h-4 w-4" />} label={tr.armorClass} value={String(getEffectiveAC(character))} hint={`${tr.base} ${character.ac}`} />
                        {/* Initiative = mod DEX + bonus de don (Vigilant +5), comme au startEncounter. */}
                        <PaperMetric
                            icon={<Zap className="h-4 w-4" />}
                            label={tr.initiative}
                            value={(() => {
                                const init = abilityModifier(getEffectiveStat(character, 'DEX')) + featNumericBonus(character, 'initiativeBonus');
                                return `${init >= 0 ? '+' : ''}${init}`;
                            })()}
                        />
                        <PaperMetric icon={<HeartPulse className="h-4 w-4" />} label={tr.speed} value={`${getEffectiveSpeed(character)} ft`} />
                    </div>

                    <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">{tr.hitPoints}</h3>
                            <div className="flex gap-3 text-xs font-bold uppercase text-stone-500">
                                {(character.tempHP || 0) > 0 && <span>{tr.temp} +{character.tempHP}</span>}
                                <span>{tr.max} {getEffectiveMaxHP(character)}</span>
                            </div>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                            <div className="font-fantasy text-5xl font-black">{character.hp.current}</div>
                            <div className="min-w-0 flex-1">
                                <div className="h-4 overflow-hidden rounded-full border border-stone-300 bg-stone-200">
                                    <div
                                        className="h-full bg-red-700 transition-all"
                                        style={{ width: `${Math.max(0, Math.min(100, (character.hp.current / getEffectiveMaxHP(character)) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Expérience — progression vers le prochain niveau */}
                    <div className="rounded-md border-2 border-amber-500 bg-amber-500/10 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                                <Star className="h-4 w-4" />
                                {tr.experience} — {tr.level} {character.level}
                            </h3>
                            <div className="text-xs font-bold uppercase text-amber-300">
                                {xpProgress.nextLevelXP !== null
                                    ? `${character.xp} / ${xpProgress.nextLevelXP} XP`
                                    : `${character.xp} XP — ${tr.maxLevel}`}
                            </div>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full border border-amber-500/40 bg-black/40">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                                style={{ width: `${Math.max(0, Math.min(100, xpProgress.percent))}%` }}
                            />
                        </div>
                        {xpProgress.nextLevelXP !== null && (
                            <div className="mt-1 text-right text-[11px] text-amber-200/70">
                                {xpProgress.neededForNext - xpProgress.intoLevel} {tr.xpBeforeLevel1} {character.level + 1}
                            </div>
                        )}
                    </div>

                    {/* Points de caractéristique en attente (ASI banké via « Plus tard ») */}
                    {(character.pendingASIPoints || 0) > 0 && (
                        <div className="rounded-md border-2 border-green-600 bg-green-500/10 p-4">
                            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-green-300">
                                <Zap className="h-4 w-4" />
                                {tr.pendingASI} : {character.pendingASIPoints}
                            </h3>
                            <p className="mb-3 text-xs text-green-200/80">
                                {tr.clickAbility}
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
                                                const newStats = { ...character.stats, [stat]: Math.min(20, character.stats[stat] + 1) };
                                                // MV1 (contre-audit) — un +1 CON doit donner ses PV rétroactifs
                                                // (+1 PV/niveau par point de modificateur), comme au LevelUpModal.
                                                // Sans cela, le gain était définitivement perdu (le level-up
                                                // suivant compare des mods déjà égaux).
                                                let hp = character.hp;
                                                if (stat === 'CON') {
                                                    const modBefore = Math.floor((character.stats.CON - 10) / 2);
                                                    const modAfter = Math.floor((newStats.CON - 10) / 2);
                                                    const retroHP = (modAfter - modBefore) * Math.max(1, character.level || 1);
                                                    if (retroHP > 0) {
                                                        hp = { current: character.hp.current + retroHP, max: character.hp.max + retroHP };
                                                    }
                                                }
                                                onUpdateCharacter({
                                                    ...character,
                                                    stats: newStats,
                                                    hp,
                                                    pendingASIPoints: Math.max(0, (character.pendingASIPoints || 0) - 1),
                                                });
                                            }}
                                            className="rounded-md border-2 border-green-300 bg-stone-50 p-2 text-center transition hover:border-green-600 hover:bg-green-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <div className="text-xs font-bold text-green-200">{stat}</div>
                                            <div className="text-sm font-black">{character.stats[stat]} <span className="text-green-600">+1</span></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Choix d'archétype en attente (Hunter/Beast Master, Champion, Domaine…) */}
                    {needsSubclass && subclassConfig && (
                        <div className="rounded-md border-2 border-purple-500 bg-purple-500/10 p-4">
                            <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-300">
                                <Gem className="h-4 w-4" />
                                {pick(subclassConfig.label, subclassConfig.labelEn, language)} — {tr.choiceRequired}
                            </h3>
                            <p className="mb-3 text-xs text-purple-200/80">
                                {tr.mustChoose1} {dispClass(character.class, language)} {tr.mustChoose2} {character.level} {tr.mustChoose3}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {subclassConfig.options.map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handlePickSubclass(option.name)}
                                        disabled={!onUpdateCharacter}
                                        className="rounded-md border-2 border-purple-300 bg-stone-50 p-3 text-left transition hover:border-purple-600 hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <div className="font-bold text-purple-200">{subclassName(option, language)}</div>
                                        <p className="mt-1 text-xs leading-snug text-stone-600">{pick(option.description, option.descriptionEn, language)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">{tr.attacksSpells}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[460px] text-sm">
                                <thead className="border-b border-stone-300 text-left text-xs uppercase tracking-wide text-stone-500">
                                    <tr>
                                        <th className="pb-2">{tr.name}</th>
                                        <th className="pb-2">{tr.attackCol}</th>
                                        <th className="pb-2">{tr.damageCol}</th>
                                        <th className="pb-2">{tr.properties}</th>
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
                                                <td className="py-2 text-xs text-stone-500">{stats.properties.join(', ') || tr.none}</td>
                                            </tr>
                                        );
                                    })}
                                    {!equippedWeapons.length && (
                                        <tr><td colSpan={4} className="py-3 text-stone-500">{tr.noWeaponEquipped}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {!!character.activeEffects?.length && (
                        <div className="rounded-md border-2 border-emerald-500 bg-emerald-500/10 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-300">
                                <Sparkles className="h-4 w-4" />
                                {tr.activeEffects}
                            </h3>
                            <div className="space-y-2">
                                {character.activeEffects.map((effect, index) => (
                                    <div key={effect.id || index} className="rounded-md border border-emerald-500/40 bg-stone-50 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-bold text-emerald-200">{effect.name}</span>
                                            <span className="rounded bg-emerald-400 px-2 py-0.5 text-[10px] font-bold uppercase text-black">{formatEffectDuration(effect.duration, tr)}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-emerald-200/70">
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
                    {/* ── NF2 — Avantages actifs (équipement, dons, effets) ── */}
                    {(() => {
                        const frOf = (en: string) => Object.entries(SKILL_TRANSLATIONS).find(([, e]) => e === en)?.[0] || en;
                        const labelFor = (tag: string) => tag === 'attack'
                            ? tr.advTagAttack
                            : tag === 'defense'
                                ? tr.advTagDefense
                                : tag === 'initiative'
                                    ? 'Initiative'
                                    : (language === 'fr' ? frOf(tag) : tag).replace(/_/g, ' ');
                        const gearAdv = getGearAdvantages(character);
                        const featAdv = (character.feats || []).flatMap(id => {
                            const feat = getFeatById(id);
                            return (feat?.mechanical?.advantageOn || []).map(tag => ({
                                tag, source: language === 'fr' ? feat!.nameFr : feat!.name,
                            }));
                        });
                        const fxAdv = (character.activeEffects || [])
                            .filter(e => e.grantsAttackAdvantage)
                            .map(e => ({ tag: 'attack', source: e.name }));
                        const all = [...gearAdv, ...featAdv, ...fxAdv];
                        if (!all.length) return null;
                        return (
                            <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-sky-200">{tr.advantagesHeader}</h3>
                                <ul className="space-y-1.5">
                                    {all.map((adv, i) => (
                                        <li key={`${adv.tag}-${adv.source}-${i}`} className="flex items-center justify-between gap-2 text-xs text-stone-700">
                                            <span className="font-semibold capitalize">⭐ {labelFor(adv.tag)}</span>
                                            <span className="truncate text-stone-500">{adv.source}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })()}

                    {/* ── Compagnons & créatures liées : mini-fiches ── */}
                    {(((character.companions || []).length > 0) || character.subclass === 'Beast Master' || character.mount || character.familiar) && (
                        <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                            {/* UI5 — seul bloc du panneau qui restait en français dur. */}
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-200">
                                {tr.companionsHeader}
                            </h3>
                            <div className="space-y-2.5">
                                {(character.companions || []).map(comp => (
                                    <div key={comp.id} className="rounded border border-stone-300 bg-stone-50 p-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-stone-800">{comp.name}</span>
                                            <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-black">{tr.lvlShort} {comp.level ?? 1}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-600">
                                            <span>{tr.hpShort} {comp.hp.current}/{comp.hp.max}</span>
                                            <span>{tr.acShort} {comp.ac}</span>
                                            <span>{comp.attack.name} +{comp.attack.attackBonus}, {comp.attack.damage}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-stone-200">
                                            <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, (comp.hp.current / comp.hp.max) * 100))}%` }} />
                                        </div>
                                        {comp.description && <p className="mt-1 text-[11px] italic text-stone-500">{comp.description}</p>}
                                    </div>
                                ))}
                                {character.subclass === 'Beast Master' && (() => {
                                    const beast = getBeastCompanion(character.beastKind || DEFAULT_BEAST_ID);
                                    const beastMax = Math.max(11, 4 * (character.level || 1));
                                    const beastCur = Math.min(character.companionHP?.current ?? beastMax, beastMax);
                                    return beast ? (
                                        <div className="rounded border border-stone-300 bg-stone-50 p-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-stone-800">🐺 {beast.name} {tr.boundTag}</span>
                                                <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-black">4×{tr.lvlShort}</span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-600">
                                                <span>{tr.hpShort} {beastCur}/{beastMax}</span>
                                                <span>{tr.acShort} {beast.ac}</span>
                                                <span>{beast.attack.name} +{beast.attack.attackBonus}, {beast.attack.damage}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-stone-200">
                                                <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, (beastCur / beastMax) * 100))}%` }} />
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                                {character.mount && (() => {
                                    const mt = getMountType(character.mount.kind || character.mount.name);
                                    // Même maximum qu'en combat (bonus de Monture liée compris).
                                    const mMax = effectiveMountMaxHP(character);
                                    const mCur = character.mount.hp?.current ?? mMax;
                                    return (
                                        <div className="rounded border border-stone-300 bg-stone-50 p-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-stone-800">🐴 {character.mount.name}</span>
                                                <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">{character.mount.speed} ft{character.mount.flying ? ' ✈' : ''}</span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-600">
                                                <span>{tr.hpShort} {mCur}/{mMax}</span>
                                                {mt && <span>{tr.acShort} {mt.ac}</span>}
                                                {mt && <span>{mt.attack.name} +{mt.attack.attackBonus}, {mt.attack.damage}</span>}
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-stone-200">
                                                <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, (mCur / mMax) * 100))}%` }} />
                                            </div>
                                            {(() => {
                                                // En selle / à pied — la charge montée n'existe qu'en selle.
                                                // Une monture À TERRE ne se monte pas : le bouton restait
                                                // actif au-dessus d'une barre à 0 PV, et le héros repartait
                                                // « en selle » sur un cadavre au combat suivant.
                                                const isDown = mCur <= 0;
                                                const isMounted = !isDown && character.mount!.mounted !== false;
                                                return (
                                                    <div className="mt-2 flex items-center justify-between gap-2" title={isDown ? tr.mountDownHint : isMounted ? tr.mountedHint : tr.dismountedHint}>
                                                        <span className={`text-[11px] font-bold ${isMounted ? 'text-amber-300' : 'text-stone-500'}`}>
                                                            {isDown ? tr.mountedDown : isMounted ? tr.mountedOn : tr.mountedOff}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={isDown}
                                                            title={isDown ? tr.mountDownHint : undefined}
                                                            onClick={() => {
                                                                const live = useGameStore.getState().character;
                                                                if (!live?.mount || (live.mount.hp?.current ?? 1) <= 0) return;
                                                                useGameStore.getState().setCharacter({ ...live, mount: { ...live.mount, mounted: !isMounted } });
                                                            }}
                                                            className="rounded border border-stone-400 bg-stone-50 px-2 py-0.5 text-[11px] font-bold text-stone-700 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {isMounted ? tr.dismount : tr.mountUp}
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                })()}
                                {character.familiar && (
                                    <div className="rounded border border-stone-300 bg-stone-50 p-2.5">
                                        <span className="font-bold text-stone-800">🦉 {character.familiar.name} <span className="font-normal text-stone-500">({character.familiar.kind})</span></span>
                                        {character.familiar.description && <p className="mt-1 text-[11px] italic text-stone-500">{character.familiar.description}</p>}
                                        <p className="mt-0.5 text-[11px] text-stone-600">{tr.familiarHelpHint}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">{tr.resources}</h3>
                        <div className="space-y-2">
                            {spellSlots.map(([slot, pool]) => (
                                <ResourceBar key={slot} label={`${tr.slotLevel} ${slot.replace('level', '').replace('pact', tr.pact)}`} current={pool.current} max={pool.max} />
                            ))}
                            {resources.map(([key, resource]) => (
                                <ResourceBar key={key} label={resource.label || key} current={resource.current} max={resource.max} />
                            ))}
                            {!spellSlots.length && !resources.length && (
                                <p className="text-sm text-stone-500">{tr.noLimitedResources}</p>
                            )}
                        </div>
                    </div>

                    {((character.cantrips || []).length > 0 || (character.knownSpells || []).length > 0 || (character.preparedSpells || []).length > 0) && (
                        <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-300">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                {tr.spellsMagic}
                            </h3>
                            <div className="space-y-3">
                                {(character.cantrips || []).length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">{tr.cantrips}</div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {character.cantrips?.map(spell => (
                                                <span key={spell} className="rounded border border-purple-500/50 bg-purple-500/15 px-2 py-0.5 text-xs text-purple-200 font-serif">
                                                    {spell}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {((character.knownSpells || []).length > 0 || (character.preparedSpells || []).length > 0) && (
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                                            {character.preparedSpells?.length ? tr.preparedSpells : tr.knownSpells}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {(character.preparedSpells?.length ? character.preparedSpells : character.knownSpells)?.map(spell => (
                                                <span key={spell} className="rounded border border-purple-500/50 bg-purple-500/15 px-2 py-0.5 text-xs text-purple-200 font-serif">
                                                    {spell}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {character.spellcastingAbility && (
                                    <div className="text-[10px] border-t border-stone-200 pt-2 text-stone-500 font-mono">
                                        {tr.spellcastingAbility} : <span className="font-bold text-stone-700">{character.spellcastingAbility}</span>
                                        {character.spellcastingFocus && (
                                            <> | {tr.focus} : <span className="font-bold text-stone-700">{character.spellcastingFocus}</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
                            <Gem className="h-4 w-4" />
                            {tr.abilitiesTraits}
                        </h3>
                        <div className="max-h-72 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                            {character.features?.map((feature, index) => (
                                <div key={`${feature.name}-${index}`} className="border-b border-stone-200 pb-2 last:border-0">
                                    <div className="font-bold">{featureName(feature, language)}</div>
                                    <p className="text-sm leading-snug text-stone-600">{featureDesc(feature, language)}</p>
                                </div>
                            ))}
                            {!character.features?.length && <p className="text-sm text-stone-500">{tr.noAbility}</p>}
                        </div>
                    </div>

                    <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-4">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-600">{tr.proficiencies}</h3>
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
        <div className="rounded-md border-2 border-stone-400 bg-stone-50/60 p-3 text-center">
            <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded border border-stone-300 bg-stone-50 text-stone-700">{icon}</div>
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

function formatEffectDuration(duration: string, tr: Tr): string {
    if (duration === 'long_rest') return tr.longRest;
    if (duration === 'short_rest') return tr.shortRest;
    if (duration === 'concentration') return tr.concentration;
    if (duration === '1_hour') return tr.oneHour;
    if (duration === '8_hours') return tr.eightHours;
    if (duration === 'rounds') return tr.rounds;
    if (duration === 'permanent') return tr.permanent;
    return duration;
}
