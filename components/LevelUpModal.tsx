// Level Up Modal Component
// - ASI as a POINT ALLOCATOR: 2 points per ASI level crossed (4/8/12/16/19),
//   so a multi-level XP jump (3→5, 3→8…) never silently loses an ASI.
// - "Plus tard" no longer loses anything: class/subclass features are merged
//   anyway and unspent ASI points are BANKED on the character
//   (pendingASIPoints), spendable later from the character sheet.
// - Archetype/subclass choice at the class's subclass level (or any later
//   level-up while still unchosen).

import React, { useState } from 'react';
import { CharacterSheet, Ability } from '../types';
import { getNewFeaturesAtLevel, asiLevelsBetween, getFeaturesForLevel, CLASS_FEATURES } from '../data/classFeatures';
import { getSubclassConfig, getSubclassFeaturesForLevel, getNewSubclassFeaturesAtLevel, SUBCLASS_DATA } from '../data/subclasses';
import { Star, ArrowUp, Sparkles, Check, Gem, Minus, Plus } from 'lucide-react';
import { ensureProgressionState } from '../services/rulesEngine';
import { useGameStore } from '../store/gameStore';

const TRANS = {
    en: {
        levelUp: '🎊 LEVEL UP! 🎊',
        reachesLevel: (name: string, lvl: number) => <>{name} reaches <span className="font-bold text-amber-200">Level {lvl}</span>!</>,
        multiLevel: (n: number) => `(${n} levels gained at once — every improvement is counted)`,
        newAbilities: 'New Abilities',
        chooseYourPath: 'choose your path',
        choiceIsFinal: 'This choice is permanent and unlocks real mechanical abilities.',
        asiTitle: 'Ability Score Improvement',
        distribute: (n: number) => <>Distribute <span className="font-bold text-amber-200">{n} point{n > 1 ? 's' : ''}</span> (max 20 per ability).</>,
        remaining: 'Remaining:',
        later: 'Later',
        laterTitle: 'Your abilities are applied; the ability points stay available on the character sheet.',
        confirm: '✓ Confirm',
    },
    fr: {
        levelUp: '🎊 NIVEAU SUPÉRIEUR ! 🎊',
        reachesLevel: (name: string, lvl: number) => <>{name} atteint le <span className="font-bold text-amber-200">Niveau {lvl}</span>!</>,
        multiLevel: (n: number) => `(${n} niveaux gagnés d'un coup — toutes les améliorations sont comptées)`,
        newAbilities: 'Nouvelles Capacités',
        chooseYourPath: 'choisis ta voie',
        choiceIsFinal: 'Ce choix est définitif et débloque de vraies capacités mécaniques.',
        asiTitle: 'Amélioration de Caractéristiques',
        distribute: (n: number) => <>Répartis <span className="font-bold text-amber-200">{n} point{n > 1 ? 's' : ''}</span> (max 20 par caractéristique).</>,
        remaining: 'Restant :',
        later: 'Plus tard',
        laterTitle: 'Tes capacités sont appliquées ; les points de caractéristique restent disponibles dans la fiche personnage.',
        confirm: '✓ Confirmer',
    },
} as const;

interface Props {
    character: CharacterSheet;
    newLevel: number;
    /** Level BEFORE the XP grant (grantXP already wrote newLevel on the sheet). */
    fromLevel?: number;
    onConfirm: (updatedCharacter: CharacterSheet) => void;
    onClose: () => void;
}

const ABILITIES: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export function LevelUpModal({ character, newLevel, fromLevel, onConfirm, onClose }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const previousLevel = fromLevel ?? Math.max(1, newLevel - 1);
    // 2 points per crossed ASI level + any points banked from earlier dismissals.
    const asiBudget = asiLevelsBetween(previousLevel, newLevel).length * 2 + (character.pendingASIPoints || 0);
    const [alloc, setAlloc] = useState<Partial<Record<Ability, number>>>({});
    const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null);

    const spent = ABILITIES.reduce((sum, a) => sum + (alloc[a] || 0), 0);
    const remaining = asiBudget - spent;

    const newFeatures = getNewFeaturesAtLevel(character.class, newLevel);

    // Archetype choice: surfaces at the class's subclass level, and at ANY later
    // level-up while the choice is still pending (e.g. older saves). This is what
    // makes "Ranger Archetype — Choose Hunter or Beast Master" actually DO something.
    const subclassConfig = getSubclassConfig(character.class);
    const showSubclassChoice = Boolean(subclassConfig && !character.subclass && newLevel >= subclassConfig.level);
    // New subclass features unlocked at this exact level (already-chosen archetype).
    const newSubclassFeatures = character.subclass
        ? getNewSubclassFeaturesAtLevel(character.class, character.subclass, newLevel)
        : [];

    const bumpStat = (stat: Ability, delta: 1 | -1) => {
        const current = alloc[stat] || 0;
        if (delta === 1) {
            if (remaining <= 0) return;
            if (character.stats[stat] + current >= 20) return; // hard cap 20
            setAlloc({ ...alloc, [stat]: current + 1 });
        } else {
            if (current <= 0) return;
            setAlloc({ ...alloc, [stat]: current - 1 });
        }
    };

    // Shared feature merge: racial/background features kept, class + subclass
    // features recomputed up to newLevel (names are stable keys for dedup).
    const mergeFeatures = (subclassName?: string) => {
        const classFeaturesMap = CLASS_FEATURES[character.class]?.features || {};
        const classFeatureNames = new Set(Object.values(classFeaturesMap).flat().map(f => f.name));
        const subclassFeatureNames = new Set(
            Object.values(SUBCLASS_DATA).flatMap(cfg => cfg.options.flatMap(o => Object.values(o.featuresByLevel).flat().map(f => f.name)))
        );
        const nonClassFeatures = (character.features || []).filter(f => !classFeatureNames.has(f.name) && !subclassFeatureNames.has(f.name));
        const classFeatures = getFeaturesForLevel(character.class, newLevel);
        const subclassFeatures = subclassName
            ? getSubclassFeaturesForLevel(character.class, subclassName, newLevel)
            : [];
        return [...nonClassFeatures, ...classFeatures, ...subclassFeatures];
    };

    const handleConfirm = () => {
        const updatedStats = { ...character.stats };
        for (const stat of ABILITIES) {
            updatedStats[stat] = Math.min(20, updatedStats[stat] + (alloc[stat] || 0));
        }

        const finalSubclass = showSubclassChoice ? (selectedSubclass || undefined) : character.subclass;

        // HP is ALREADY applied by grantXP when the level-up fires (single source of
        // truth). Do NOT add it again here — that double-bumped max HP (~2× per level).
        const updatedCharacter: CharacterSheet = ensureProgressionState({
            ...character,
            level: newLevel,
            subclass: finalSubclass,
            stats: updatedStats,
            pendingASIPoints: 0,
            features: mergeFeatures(finalSubclass),
            hp: character.hp,
            spellSlots: undefined,
            hitDice: undefined,
        });

        onConfirm(updatedCharacter);
    };

    // "Plus tard" must NOT lose anything: merge the features now and BANK the
    // unspent ASI points (recoverable from the character sheet or the next
    // level-up). Before this, dismissing left the character at level N with the
    // features of N-1 and silently dropped crossed ASIs.
    const handleDismiss = () => {
        const updatedCharacter: CharacterSheet = ensureProgressionState({
            ...character,
            level: newLevel,
            pendingASIPoints: asiBudget,
            features: mergeFeatures(character.subclass),
            hp: character.hp,
            spellSlots: undefined,
            hitDice: undefined,
        });
        onConfirm(updatedCharacter);
        onClose();
    };

    const canConfirm = (asiBudget === 0 || remaining === 0)
        && (!showSubclassChoice || Boolean(selectedSubclass));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-amber-900 to-gray-900 border-2 border-amber-500 rounded-xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(245,158,11,0.3)]">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <Sparkles className="w-16 h-16 text-amber-400 animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-bold text-amber-200 font-fantasy">
                        {tr.levelUp}
                    </h2>
                    <p className="text-amber-400 text-xl mt-2">
                        {tr.reachesLevel(character.name, newLevel)}
                    </p>
                    {newLevel - previousLevel > 1 && (
                        <p className="text-amber-300/70 text-xs mt-1">
                            {tr.multiLevel(newLevel - previousLevel)}
                        </p>
                    )}
                </div>

                {/* New Features */}
                {(newFeatures.length > 0 || newSubclassFeatures.length > 0) && (
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-amber-700/50">
                        <h3 className="text-amber-300 font-bold mb-2 flex items-center gap-2">
                            <Star className="w-4 h-4" /> {tr.newAbilities}
                        </h3>
                        <ul className="space-y-2">
                            {newFeatures.map((feature, i) => (
                                <li key={i} className="text-gray-200">
                                    <span className="font-bold text-amber-200">{feature.name}:</span>{' '}
                                    <span className="text-gray-400 text-sm">{feature.description}</span>
                                </li>
                            ))}
                            {newSubclassFeatures.map((feature, i) => (
                                <li key={`sub-${i}`} className="text-gray-200">
                                    <span className="font-bold text-purple-300">{feature.name}:</span>{' '}
                                    <span className="text-gray-400 text-sm">{feature.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Archetype / Subclass choice — the choice is REAL: it stores
                    character.subclass, grants its features, and several archetypes
                    have direct engine hooks (Champion crits, Colossus Slayer, companion…). */}
                {showSubclassChoice && subclassConfig && (
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-purple-500/60">
                        <h3 className="text-purple-300 font-bold mb-1 flex items-center gap-2">
                            <Gem className="w-4 h-4" /> {subclassConfig.label} — {tr.chooseYourPath}
                        </h3>
                        <p className="text-gray-400 text-xs mb-3">
                            {tr.choiceIsFinal}
                        </p>
                        <div className="space-y-2">
                            {subclassConfig.options.map(option => {
                                const isSelected = selectedSubclass === option.name;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setSelectedSubclass(option.name)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-purple-400 bg-purple-900/50'
                                            : 'border-gray-600 bg-gray-800/50 hover:border-purple-500/60'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-bold ${isSelected ? 'text-purple-200' : 'text-gray-200'}`}>{option.name}</span>
                                            {isSelected && <Check className="w-4 h-4 text-purple-300 shrink-0" />}
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1 leading-snug">{option.description}</p>
                                        {isSelected && (
                                            <ul className="mt-2 space-y-1 border-t border-purple-500/30 pt-2">
                                                {(option.featuresByLevel[subclassConfig.level] || []).map((f, i) => (
                                                    <li key={i} className="text-xs text-purple-100/80">
                                                        <span className="font-bold text-purple-200">{f.name}</span> — {f.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ASI point allocator (2 points per crossed ASI level + banked points) */}
                {asiBudget > 0 && (
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-amber-700/50">
                        <h3 className="text-amber-300 font-bold mb-1 flex items-center gap-2">
                            <ArrowUp className="w-4 h-4" /> {tr.asiTitle}
                        </h3>
                        <p className="text-gray-400 text-xs mb-3">
                            {tr.distribute(asiBudget)}
                            {' '}{tr.remaining} <span className={`font-bold ${remaining > 0 ? 'text-amber-200' : 'text-green-400'}`}>{remaining}</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {ABILITIES.map(stat => {
                                const base = character.stats[stat];
                                const added = alloc[stat] || 0;
                                const isMaxed = base + added >= 20;
                                return (
                                    <div
                                        key={stat}
                                        className={`p-2 rounded-lg border-2 text-center transition-all ${added > 0
                                            ? 'border-green-400 bg-green-900/40'
                                            : 'border-gray-600 bg-gray-800/50'
                                            }`}
                                    >
                                        <div className="text-sm font-bold text-gray-200">{stat}</div>
                                        <div className="text-sm my-1">
                                            <span className="text-gray-400">{base}</span>
                                            {added > 0 && <span className="text-green-400 font-bold"> → {base + added}</span>}
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => bumpStat(stat, -1)}
                                                disabled={added <= 0}
                                                className="p-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Minus className="w-3 h-3 text-white" />
                                            </button>
                                            <button
                                                onClick={() => bumpStat(stat, 1)}
                                                disabled={remaining <= 0 || isMaxed}
                                                className="p-1 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Confirm / Later */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDismiss}
                        title={asiBudget > 0 ? tr.laterTitle : undefined}
                        className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    >
                        {tr.later}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${canConfirm
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/50'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {tr.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
