import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getPlayerAttackModifier } from '../types';
import { combatantSide } from './CombatTracker';
import { Sword, Sparkles, ShieldAlert, HeartPulse, Shield } from 'lucide-react';

const TRANS = {
    en: {
        offhand: (name: string) => `Off-hand: ${name}`,
        frenzy: (name: string) => `Frenzy: ${name}`,
        warPriest: (name: string, uses: number) => `War Priest: ${name} (${uses})`,
        waitingTurnOf: (name: string) => `Waiting — ${name}'s turn…`,
        waitingUpdate: 'Waiting for the combat update…',
        combatActionsHeader: '⚔️ Combat Actions (Your Turn)',
        actionAvailable: 'Action Available',
        attack: 'Attack',
        spells: 'Spells',
        items: 'Items',
        dodge: 'Dodge',
        equippedWeapon: 'Equipped Weapon',
        noWeaponEquipped: 'No weapon equipped! Open the inventory to equip one.',
        damage: 'damage',
        target: 'Target',
        noEnemyTarget: 'No enemy target in combat.',
        hpLabel: 'HP',
        acLabel: 'AC',
        resolving: 'Resolving…',
        attackBtn: 'Attack ⚔️',
        bonusNeedsMain: "Attack first with your main weapon (Attack action), then the bonus attack unlocks.",
        bonusAlreadyUsed: 'Bonus action already used this turn.',
        bonusAction: (label: string) => `Bonus action: ${label}`,
        bonusBtnOffhand: 'Bonus 🗡️ Off-hand',
        bonusBtnFrenzy: 'Bonus 🗡️ Frenzy',
        bonusBtnWar: 'Bonus 🗡️ War',
        afterMainAttack: 'After your main attack',
        bonusUsed: 'Bonus used',
        spell: 'Spell',
        noSpellKnown: 'No spell known!',
        cantripsGroup: 'Cantrips (Unlimited)',
        leveledSpellsGroup: 'Leveled Spells',
        resourceSlot: 'Resource / Slot',
        freeCantrip: 'Free (Cantrip)',
        noSlots: 'No slots',
        levelPrefix: 'Level ',
        player: 'Player',
        enemyHp: (cur: number, max: number) => `Enemy, HP: ${cur}/${max}`,
        castSpell: 'Cast the Spell ✨',
        itemToUse: 'Item to Use',
        noConsumable: 'No consumable item available in your inventory!',
        noEffectDesc: 'No effect description',
        useItem: "Use the Item 🧪",
        dodgeDescription: 'Taking the Dodge action lets you focus on defense. Until the start of your next turn, any attack roll against you has Disadvantage, and you gain a defensive bonus.',
        activateDodge: 'Activate Dodge 🛡️',
    },
    fr: {
        offhand: (name: string) => `Off-hand : ${name}`,
        frenzy: (name: string) => `Frénésie : ${name}`,
        warPriest: (name: string, uses: number) => `Prêtre de guerre : ${name} (${uses})`,
        waitingTurnOf: (name: string) => `En attente — tour de ${name}…`,
        waitingUpdate: 'En attente de la mise à jour du combat…',
        combatActionsHeader: '⚔️ Actions de Combat (Ton Tour)',
        actionAvailable: 'Action Disponible',
        attack: 'Attaquer',
        spells: 'Sorts',
        items: 'Objets',
        dodge: 'Esquiver',
        equippedWeapon: 'Arme Équipée',
        noWeaponEquipped: "Aucune arme équipée ! Ouvrez l'inventaire pour vous équiper.",
        damage: 'dégâts',
        target: 'Cible',
        noEnemyTarget: 'Aucune cible ennemie en combat.',
        hpLabel: 'PV',
        acLabel: 'CA',
        resolving: 'Résolution…',
        attackBtn: 'Attaque ⚔️',
        bonusNeedsMain: "Attaque d'abord avec ton arme principale (action Attaque), puis l'attaque bonus se débloque.",
        bonusAlreadyUsed: 'Action bonus déjà utilisée ce tour.',
        bonusAction: (label: string) => `Action bonus : ${label}`,
        bonusBtnOffhand: 'Bonus 🗡️ Off-hand',
        bonusBtnFrenzy: 'Bonus 🗡️ Frénésie',
        bonusBtnWar: 'Bonus 🗡️ Guerre',
        afterMainAttack: 'Après ton attaque principale',
        bonusUsed: 'Bonus utilisé',
        spell: 'Sortilège',
        noSpellKnown: 'Aucun sort connu !',
        cantripsGroup: 'Tours de magie (Cantrips - Illimités)',
        leveledSpellsGroup: 'Sorts de Niveau',
        resourceSlot: 'Ressource / Slot',
        freeCantrip: 'Gratuit (Cantrip)',
        noSlots: "Pas d'emplacements",
        levelPrefix: 'Niveau ',
        player: 'Joueur',
        enemyHp: (cur: number, max: number) => `Ennemi, PV: ${cur}/${max}`,
        castSpell: 'Lancer le Sort ✨',
        itemToUse: 'Objet à Utiliser',
        noConsumable: 'Aucun objet consommable disponible dans votre inventaire !',
        noEffectDesc: 'Aucune description d\'effet',
        useItem: "Utiliser l'Objet 🧪",
        dodgeDescription: "Prendre l'action d'esquive (Dodge) vous permet de vous concentrer sur la défense. Jusqu'au début de votre prochain tour, tout jet d'attaque contre vous aura un Désavantage, et vous gagnez un bonus défensif.",
        activateDodge: "Activer l'Esquive 🛡️",
    },
} as const;

interface CombatActionsPanelProps {
    selectedTargetId: string;
    onSelectTarget: (id: string) => void;
    onAttack: (weaponItem: any, targetId: string) => void;
    /** Bonus-action attack: off-hand weapon, Berserker Frenzy, or War Priest. */
    onBonusAttack?: (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest') => void;
    onCastSpell: (spellName: string, slotLevel: string | null, targetId: string) => void;
    onDodge: () => void;
    onUsePotion: (potionItem: any) => void;
    /** True while a player action is mid-resolution (dice animating). Disables
     *  the action buttons so a second click can't start a parallel resolution. */
    disabled?: boolean;
}

export function CombatActionsPanel({
    selectedTargetId,
    onSelectTarget,
    onAttack,
    onBonusAttack,
    onCastSpell,
    onDodge,
    onUsePotion,
    disabled = false
}: CombatActionsPanelProps) {
    const character = useGameStore(s => s.character);
    const combatState = useGameStore(s => s.combatState);
    const isNPCTurn = useGameStore(s => s.isNPCTurn);
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];

    const [selectedTab, setSelectedTab] = useState<'attack' | 'spell' | 'dodge' | 'potion'>('attack');
    const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
    const [selectedSpellName, setSelectedSpellName] = useState<string>('');
    const [selectedSpellSlot, setSelectedSpellSlot] = useState<string>('cantrip');
    const [selectedPotionId, setSelectedPotionId] = useState<string>('');

    // ── All hooks run unconditionally (Rules of Hooks). The early returns are
    //    moved BELOW, after every hook; useMemo/useEffect are null-safe on `character`. ──

    // Extract equipped weapons from player inventory
    const equippedWeapons = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.filter(item => item.type === 'weapon' && item.equipped);
    }, [character?.inventory]);

    // Bonus-action attack source. Off-hand weapon first (two-weapon fighting);
    // otherwise Berserker Frenzy (main weapon, while raging) or War Domain's
    // War Priest (main weapon, limited uses). All consume the amber bonus pip.
    const offhandWeapon = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.find(item => item.type === 'weapon' && item.equipped && item.slot === 'offHand') || null;
    }, [character?.inventory]);

    const mainHandWeapon = useMemo(() => {
        return equippedWeapons.find(w => w.slot === 'mainHand') || equippedWeapons[0] || null;
    }, [equippedWeapons]);

    const bonusAttack = useMemo((): { mode: 'offhand' | 'frenzy' | 'warpriest'; weapon: any; label: string } | null => {
        if (offhandWeapon) {
            return { mode: 'offhand', weapon: offhandWeapon, label: tr.offhand(offhandWeapon.name) };
        }
        const raging = (character?.activeEffects || []).some(e => /rage|fr[ée]n[ée]sie|frenzy/i.test(e.name));
        if (character?.subclass === 'Berserker' && raging && mainHandWeapon) {
            return { mode: 'frenzy', weapon: mainHandWeapon, label: tr.frenzy(mainHandWeapon.name) };
        }
        const warPriestUses = (character as any)?.resources?.warPriest?.current ?? 0;
        if (character?.subclass === 'War Domain' && warPriestUses > 0 && mainHandWeapon) {
            return { mode: 'warpriest', weapon: mainHandWeapon, label: tr.warPriest(mainHandWeapon.name, warPriestUses) };
        }
        return null;
    }, [offhandWeapon, mainHandWeapon, character, tr]);

    // Extract consumables (specifically healing/potions) from player inventory
    const potions = useMemo(() => {
        const inv = character?.inventory || [];
        return inv.filter(item => item.type === 'consumable' && item.quantity > 0);
    }, [character?.inventory]);

    // Extract all targets
    const targets = useMemo(() => {
        return combatState.combatants.filter(c => c.hp.current > 0);
    }, [combatState.combatants]);

    // Only true enemies are attackable — allies (side==='ally') must NOT appear
    // in the attack target list now that factions exist.
    const enemies = useMemo(() => {
        return targets.filter(c => combatantSide(c) === 'enemy');
    }, [targets]);

    // All player spells list
    const playerSpells = useMemo(() => {
        const cantrips = character?.cantrips || [];
        const known = character?.knownSpells || [];
        const prepared = character?.preparedSpells || [];
        const spells = [...new Set([...cantrips, ...known, ...prepared])];
        return {
            cantrips,
            spells: spells.filter(s => !cantrips.includes(s))
        };
    }, [character]);

    const spellSlotsAvailable = useMemo(() => {
        const slots = character?.spellSlots || {};
        return Object.entries(slots)
            .filter(([_, value]) => value.max > 0)
            .map(([level, value]) => ({
                level,
                current: value.current,
                max: value.max
            }));
    }, [character.spellSlots]);

    // Auto select first target, weapon, or spell if not set
    useEffect(() => {
        if (!selectedTargetId) {
            if (enemies.length) {
                onSelectTarget(enemies[0].id);
            } else if (targets.length) {
                onSelectTarget(targets[0].id);
            }
        }
    }, [selectedTargetId, enemies, targets, onSelectTarget]);

    useEffect(() => {
        if (equippedWeapons.length && !selectedWeaponId) {
            setSelectedWeaponId(equippedWeapons[0].id);
        }
    }, [equippedWeapons, selectedWeaponId]);

    useEffect(() => {
        if (potions.length && !selectedPotionId) {
            setSelectedPotionId(potions[0].id);
        }
    }, [potions, selectedPotionId]);

    useEffect(() => {
        if (!selectedSpellName) {
            if (playerSpells.cantrips.length) {
                setSelectedSpellName(playerSpells.cantrips[0]);
                setSelectedSpellSlot('cantrip');
            } else if (playerSpells.spells.length) {
                setSelectedSpellName(playerSpells.spells[0]);
                setSelectedSpellSlot(spellSlotsAvailable.length ? spellSlotsAvailable[0].level : 'cantrip');
            }
        }
    }, [playerSpells, spellSlotsAvailable, selectedSpellName]);

    // ── Early returns AFTER all hooks (Rules of Hooks) ──
    if (!character || !combatState.isActive) return null;

    const isPlayerTurn = combatState.currentTurn === 'player' ||
        combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.isPlayer;

    if (!isPlayerTurn) {
        return (
            <div className="rounded-md border border-white/5 bg-black/40 p-4 text-center text-xs text-white/40">
                {combatState.currentTurn
                    ? tr.waitingTurnOf(combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.name || combatState.currentTurn)
                    : tr.waitingUpdate}
            </div>
        );
    }

    const handleAttackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const weapon = equippedWeapons.find(w => w.id === selectedWeaponId);
        if (!weapon || !selectedTargetId) return;
        onAttack(weapon, selectedTargetId);
    };

    const handleSpellSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSpellName || !selectedTargetId) return;
        const isCantrip = selectedSpellSlot === 'cantrip';
        onCastSpell(selectedSpellName, isCantrip ? null : selectedSpellSlot, selectedTargetId);
    };

    const handlePotionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const potion = potions.find(p => p.id === selectedPotionId);
        if (!potion) return;
        onUsePotion(potion);
    };

    return (
        <div className="flex flex-col bg-black/85 p-4 rounded-lg border border-gray-700 font-sans text-white max-w-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-700">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">{tr.combatActionsHeader}</span>
                <div className="flex gap-2">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase border border-emerald-500/30 text-emerald-400">{tr.actionAvailable}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-black/50 p-1 rounded border border-gray-800">
                <button
                    type="button"
                    onClick={() => { setSelectedTab('attack'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'attack' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sword className="h-3.5 w-3.5" />
                    {tr.attack}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('spell'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'spell' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    {tr.spells}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('potion'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'potion' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <HeartPulse className="h-3.5 w-3.5" />
                    {tr.items}
                </button>
                <button
                    type="button"
                    onClick={() => { setSelectedTab('dodge'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded uppercase transition ${selectedTab === 'dodge' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    <Shield className="h-3.5 w-3.5" />
                    {tr.dodge}
                </button>
            </div>

            {/* Tab Contents */}
            {selectedTab === 'attack' && (
                <form onSubmit={handleAttackSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.equippedWeapon}</label>
                            {equippedWeapons.length === 0 ? (
                                <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded italic">
                                    {tr.noWeaponEquipped}
                                </div>
                            ) : (
                                <select
                                    value={selectedWeaponId}
                                    onChange={(e) => setSelectedWeaponId(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {equippedWeapons.map(w => {
                                        const dmg = w.damageDice || w.damage || '1d4';
                                        return (
                                            <option key={w.id} value={w.id}>
                                                {w.name} ({dmg} {w.damageType || tr.damage})
                                            </option>
                                        );
                                    })}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.target}</label>
                            {enemies.length === 0 ? (
                                <div className="text-xs text-gray-400 bg-gray-900 border border-gray-800 p-2.5 rounded italic">
                                    {tr.noEnemyTarget}
                                </div>
                            ) : (
                                <select
                                    value={selectedTargetId}
                                    onChange={(e) => onSelectTarget(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {enemies.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.name} ({tr.hpLabel}: {e.hp.current}/{e.hp.max}, {tr.acLabel}: {e.ac})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {(() => {
                        // Player action economy (pips): the bonus attack needs a free
                        // amber pip, and (SRD) the main Attack action taken first —
                        // except Frenzy, which only requires the Rage already active.
                        const econ = (combatState.actionEconomy as any)?.['player'] || {};
                        const attacksUsed = econ.attacksUsed ?? 0;
                        const bonusLeft = (econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0);
                        const needsMainFirst = bonusAttack ? (bonusAttack.mode !== 'frenzy' && attacksUsed === 0) : false;
                        const bonusDisabled = disabled || !bonusAttack || enemies.length === 0 || bonusLeft <= 0 || needsMainFirst;
                        return (
                            <div className={`grid gap-2 ${bonusAttack ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <button
                                    type="submit"
                                    disabled={disabled || equippedWeapons.length === 0 || enemies.length === 0}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                                >
                                    {disabled ? tr.resolving : tr.attackBtn}
                                </button>
                                {bonusAttack && onBonusAttack && (
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => onBonusAttack(bonusAttack.weapon, selectedTargetId, bonusAttack.mode)}
                                            disabled={bonusDisabled}
                                            title={needsMainFirst
                                                ? tr.bonusNeedsMain
                                                : bonusLeft <= 0
                                                    ? tr.bonusAlreadyUsed
                                                    : tr.bonusAction(bonusAttack.label)}
                                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold uppercase rounded text-sm transition-colors shadow-lg"
                                        >
                                            {disabled ? tr.resolving : (bonusAttack.mode === 'offhand' ? tr.bonusBtnOffhand : bonusAttack.mode === 'frenzy' ? tr.bonusBtnFrenzy : tr.bonusBtnWar)}
                                        </button>
                                        <span className="mt-1 text-center text-[9px] uppercase tracking-wide text-white/35">
                                            {needsMainFirst ? tr.afterMainAttack : bonusLeft <= 0 ? tr.bonusUsed : bonusAttack.label}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </form>
            )}

            {selectedTab === 'spell' && (
                <form onSubmit={handleSpellSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.spell}</label>
                            {playerSpells.cantrips.length === 0 && playerSpells.spells.length === 0 ? (
                                <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded italic">
                                    {tr.noSpellKnown}
                                </div>
                            ) : (
                                <select
                                    value={selectedSpellName}
                                    onChange={(e) => {
                                        setSelectedSpellName(e.target.value);
                                        const isCantrip = playerSpells.cantrips.includes(e.target.value);
                                        setSelectedSpellSlot(isCantrip ? 'cantrip' : (spellSlotsAvailable.find(s => s.current > 0)?.level || 'level1'));
                                    }}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {playerSpells.cantrips.length > 0 && (
                                        <optgroup label={tr.cantripsGroup}>
                                            {playerSpells.cantrips.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {playerSpells.spells.length > 0 && (
                                        <optgroup label={tr.leveledSpellsGroup}>
                                            {playerSpells.spells.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.resourceSlot}</label>
                            {playerSpells.cantrips.includes(selectedSpellName) ? (
                                <div className="bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 italic">
                                    {tr.freeCantrip}
                                </div>
                            ) : spellSlotsAvailable.length === 0 ? (
                                <div className="bg-red-950/25 border border-red-500/20 rounded px-2.5 py-1.5 text-xs text-red-400 italic">
                                    {tr.noSlots}
                                </div>
                            ) : (
                                <select
                                    value={selectedSpellSlot}
                                    onChange={(e) => setSelectedSpellSlot(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                                >
                                    {spellSlotsAvailable.map(s => (
                                        <option key={s.level} value={s.level} disabled={s.current <= 0}>
                                            {s.level.replace('level', tr.levelPrefix)} ({s.current}/{s.max})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.target}</label>
                            <select
                                value={selectedTargetId}
                                onChange={(e) => onSelectTarget(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                            >
                                {targets.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.isPlayer ? tr.player : tr.enemyHp(t.hp.current, t.hp.max)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={disabled || !selectedSpellName || !selectedTargetId || (!playerSpells.cantrips.includes(selectedSpellName) && spellSlotsAvailable.every(s => s.current <= 0))}
                                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                            >
                                {disabled ? tr.resolving : tr.castSpell}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {selectedTab === 'potion' && (
                <form onSubmit={handlePotionSubmit} className="space-y-3">
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{tr.itemToUse}</label>
                        {potions.length === 0 ? (
                            <div className="text-xs text-amber-400 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded italic">
                                {tr.noConsumable}
                            </div>
                        ) : (
                            <select
                                value={selectedPotionId}
                                onChange={(e) => setSelectedPotionId(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                            >
                                {potions.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (x{p.quantity}) - {p.effect || p.description || tr.noEffectDesc}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={disabled || potions.length === 0}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg animate-pulse"
                    >
                        {disabled ? tr.resolving : tr.useItem}
                    </button>
                </form>
            )}

            {selectedTab === 'dodge' && (
                <div className="space-y-3 text-center">
                    <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                        {tr.dodgeDescription}
                    </p>
                    <button
                        type="button"
                        onClick={onDodge}
                        disabled={disabled}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold uppercase rounded text-sm transition-colors shadow-lg"
                    >
                        {disabled ? tr.resolving : tr.activateDodge}
                    </button>
                </div>
            )}
        </div>
    );
}
