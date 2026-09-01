// Level Up Modal Component
// - ASI as a POINT ALLOCATOR: 2 points per ASI level crossed (4/8/12/16/19),
//   so a multi-level XP jump (3→5, 3→8…) never silently loses an ASI.
// - "Plus tard" no longer loses anything: class/subclass features are merged
//   anyway and unspent ASI points are BANKED on the character
//   (pendingASIPoints), spendable later from the character sheet.
// - Archetype/subclass choice at the class's subclass level (or any later
//   level-up while still unchosen).

import React, { useMemo, useState } from 'react';
import { CharacterSheet, Ability, getRacialBonus } from '../../types';
import { getNewFeaturesAtLevel, asiLevelsBetween, getFeaturesForLevel, CLASS_FEATURES } from '../../data/classFeatures';
import { getSubclassConfig, getSubclassFeaturesForLevel, getNewSubclassFeaturesAtLevel, SUBCLASS_DATA } from '../../data/subclasses';
import { FEATS, getFeatById, meetsFeatPrerequisites } from '../../data/feats';
import { Star, ArrowUp, Sparkles, Check, Gem, Minus, Plus, Award, BookOpen } from 'lucide-react';
import { ensureProgressionState } from '../../engine/rulesEngine';
import { maxSpellLevelForClass, spellsForClass, spellLabel } from '../../engine/codexService';
import { useGameStore } from '../../store/gameStore';
import { LEVEL_UP_MODAL_TEXTS as TRANS } from './texts';
import { featureName, featureDesc, subclassName, pick } from '../../data/labels';

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
    // da-m3 — ASI bonus du Guerrier (6/14) et du Roublard (10) comptés.
    const asiBudget = asiLevelsBetween(previousLevel, newLevel, character.class).length * 2 + (character.pendingASIPoints || 0);
    const [alloc, setAlloc] = useState<Partial<Record<Ability, number>>>({});
    const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null);
    // A feat trades 2 ASI points for a permanent capability (5e's ASI-or-feat choice).
    const FEAT_COST = 2;
    const [selectedFeat, setSelectedFeat] = useState<string | null>(null);
    const takenFeatIds = new Set(character.feats || []);
    // da-m4 — les dons à prérequis (War Caster, Adepte élémentaire…) exigent
    // d'être lanceur de sorts : ils n'apparaissent plus pour un Barbare.
    const availableFeats = FEATS.filter(f => !takenFeatIds.has(f.id) && meetsFeatPrerequisites(f, character));

    // ── Nouveaux sorts au passage de niveau (lanceurs) ──────────────────────
    // Budget généreux : 2 choix par niveau gagné pour les full casters/Warlock,
    // 1 pour les demi-casters. Les sorts déjà connus sont exclus ; le Grimoire
    // (onglet Apprendre) reste disponible pour compléter plus tard.
    const maxSpellLvl = maxSpellLevelForClass(character.class, newLevel, character.subclass);
    const fullCaster = ['Bard', 'Cleric', 'Druid', 'Mage', 'Sorcerer', 'Warlock'].includes(character.class);
    const spellBudget = maxSpellLvl > 0 ? Math.max(1, (fullCaster ? 2 : 1) * Math.max(1, newLevel - previousLevel)) : 0;
    const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
    const knownSpellNames = useMemo(() => new Set([
        ...(character.cantrips || []),
        ...(character.knownSpells || []),
    ].map(name => name.toLowerCase())), [character.cantrips, character.knownSpells]);
    const learnableSpells = useMemo(
        () => spellBudget > 0
            ? spellsForClass(character.class, maxSpellLvl, character.subclass).filter(sp => !knownSpellNames.has(sp.name.toLowerCase()))
            : [],
        [character.class, character.subclass, maxSpellLvl, spellBudget, knownSpellNames]
    );
    const toggleSpell = (name: string) => {
        setSelectedSpells(prev => prev.includes(name)
            ? prev.filter(n => n !== name)
            : (prev.length < spellBudget ? [...prev, name] : prev));
    };

    const spent = ABILITIES.reduce((sum, a) => sum + (alloc[a] || 0), 0) + (selectedFeat ? FEAT_COST : 0);
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

    // UI3 (contre-audit) — le plafond SRD de 20 porte sur le score EFFECTIF :
    // la stat de base n'inclut PAS le bonus racial (ajouté à la lecture par
    // getEffectiveStat), donc un Demi-orc pouvait monter à 22 effectif (+6).
    const effectiveCap = (stat: Ability) => 20 - getRacialBonus(character.race, stat);
    const bumpStat = (stat: Ability, delta: 1 | -1) => {
        const current = alloc[stat] || 0;
        if (delta === 1) {
            if (remaining <= 0) return;
            if (character.stats[stat] + current >= effectiveCap(stat)) return; // hard cap 20 effectif
            setAlloc({ ...alloc, [stat]: current + 1 });
        } else {
            if (current <= 0) return;
            setAlloc({ ...alloc, [stat]: current - 1 });
        }
    };

    // Level-up must not hand out a free long rest: ensureProgressionState
    // rebuilds spellSlots/hitDice from scratch (full), so we re-apply what was
    // already SPENT. New slot levels and max increases arrive available.
    const preserveSpentProgression = (prev: CharacterSheet, next: CharacterSheet): CharacterSheet => {
        const spellSlots = next.spellSlots
            ? Object.fromEntries(Object.entries(next.spellSlots).map(([lvl, slot]) => {
                const before = prev.spellSlots?.[lvl];
                const gained = Math.max(0, slot.max - (before?.max ?? 0));
                const current = before ? Math.min(slot.max, Math.max(0, before.current) + gained) : slot.max;
                return [lvl, { ...slot, current }];
            }))
            : next.spellSlots;
        const hitDice = next.hitDice
            ? {
                ...next.hitDice,
                remaining: Math.min(
                    next.hitDice.total,
                    (prev.hitDice?.remaining ?? next.hitDice.total)
                    + Math.max(0, next.hitDice.total - (prev.hitDice?.total ?? next.hitDice.total))
                ),
            }
            : next.hitDice;
        return { ...next, spellSlots, hitDice };
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
            updatedStats[stat] = Math.min(effectiveCap(stat), updatedStats[stat] + (alloc[stat] || 0));
        }

        const finalSubclass = showSubclassChoice ? (selectedSubclass || undefined) : character.subclass;

        // Feat application: stat bonuses respect the 20 cap; Tough-style hpPerLevel
        // is granted retroactively for all current levels (future levels are
        // handled by grantXP's perLevelGain).
        const featDef = selectedFeat ? getFeatById(selectedFeat) : undefined;
        let hp = character.hp;
        const features = mergeFeatures(finalSubclass);
        if (featDef) {
            for (const [stat, bonus] of Object.entries(featDef.mechanical.statBonus || {})) {
                updatedStats[stat as Ability] = Math.min(effectiveCap(stat as Ability), updatedStats[stat as Ability] + (bonus || 0));
            }
            if (featDef.mechanical.hpPerLevel) {
                const bonusHP = featDef.mechanical.hpPerLevel * newLevel;
                hp = { current: character.hp.current + bonusHP, max: character.hp.max + bonusHP };
            }
            // Surface the feat on the sheet as a feature (survives mergeFeatures:
            // it is neither a class nor a subclass feature name).
            features.push({
                name: `${featDef.name} (Feat)`,
                nameFr: `${featDef.nameFr} (Don)`,
                description: featDef.descriptionFr,
                descriptionEn: featDef.description,
            });
        }

        // RAW (2026-08-13) : si le modificateur de CON augmente (ASI ou don),
        // les PV max augmentent RÉTROACTIVEMENT de +1 par niveau et par point
        // de modificateur — avant, monter la CON ne donnait aucun PV.
        {
            const conModBefore = Math.floor((character.stats.CON - 10) / 2);
            const conModAfter = Math.floor((updatedStats.CON - 10) / 2);
            if (conModAfter > conModBefore) {
                const retroHP = (conModAfter - conModBefore) * newLevel;
                hp = { current: hp.current + retroHP, max: hp.max + retroHP };
            }
        }

        // Nouveaux sorts choisis : tours de magie → cantrips ; sorts → connus
        // (+ préparés pour les lanceurs « spontanés » qui lancent ce qu'ils
        // connaissent, comme dans le Grimoire).
        const KNOWN_CASTERS = new Set(['Bard', 'Sorcerer', 'Warlock']);
        const pickedCantrips = selectedSpells.filter(name => learnableSpells.find(sp => sp.name === name)?.level === 0);
        const pickedSpells = selectedSpells.filter(name => !pickedCantrips.includes(name));
        const nextCantrips = pickedCantrips.length ? [...(character.cantrips || []), ...pickedCantrips] : character.cantrips;
        const nextKnown = pickedSpells.length ? [...(character.knownSpells || []), ...pickedSpells] : character.knownSpells;
        const nextPrepared = pickedSpells.length && KNOWN_CASTERS.has(character.class)
            ? [...(character.preparedSpells || []), ...pickedSpells]
            : character.preparedSpells;

        // HP is ALREADY applied by grantXP when the level-up fires (single source of
        // truth). Do NOT add it again here — that double-bumped max HP (~2× per level).
        const updatedCharacter: CharacterSheet = preserveSpentProgression(character, ensureProgressionState({
            ...character,
            level: newLevel,
            subclass: finalSubclass,
            stats: updatedStats,
            pendingASIPoints: 0,
            feats: featDef ? [...(character.feats || []), featDef.id] : character.feats,
            features,
            hp,
            cantrips: nextCantrips,
            knownSpells: nextKnown,
            preparedSpells: nextPrepared,
            spellSlots: undefined,
            hitDice: undefined,
        }));

        onConfirm(updatedCharacter);
    };

    // "Plus tard" must NOT lose anything: merge the features now and BANK the
    // unspent ASI points (recoverable from the character sheet or the next
    // level-up). Before this, dismissing left the character at level N with the
    // features of N-1 and silently dropped crossed ASIs.
    const handleDismiss = () => {
        const updatedCharacter: CharacterSheet = preserveSpentProgression(character, ensureProgressionState({
            ...character,
            level: newLevel,
            pendingASIPoints: asiBudget,
            features: mergeFeatures(character.subclass),
            hp: character.hp,
            spellSlots: undefined,
            hitDice: undefined,
        }));
        onConfirm(updatedCharacter);
        onClose();
    };

    const canConfirm = (asiBudget === 0 || remaining === 0)
        && (!showSubclassChoice || Boolean(selectedSubclass));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-amber-900 to-gray-900 border-2 border-amber-500 rounded-xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto custom-scrollbar shadow-2xl">

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
                                    <span className="font-bold text-amber-200">{featureName(feature, language)}:</span>{' '}
                                    <span className="text-gray-400 text-sm">{featureDesc(feature, language)}</span>
                                </li>
                            ))}
                            {newSubclassFeatures.map((feature, i) => (
                                <li key={`sub-${i}`} className="text-gray-200">
                                    <span className="font-bold text-purple-300">{featureName(feature, language)}:</span>{' '}
                                    <span className="text-gray-400 text-sm">{featureDesc(feature, language)}</span>
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
                            <Gem className="w-4 h-4" /> {pick(subclassConfig.label, subclassConfig.labelEn, language)} — {tr.chooseYourPath}
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
                                            <span className={`font-bold ${isSelected ? 'text-purple-200' : 'text-gray-200'}`}>{subclassName(option, language)}</span>
                                            {isSelected && <Check className="w-4 h-4 text-purple-300 shrink-0" />}
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1 leading-snug">{pick(option.description, option.descriptionEn, language)}</p>
                                        {isSelected && (
                                            <ul className="mt-2 space-y-1 border-t border-purple-500/30 pt-2">
                                                {(option.featuresByLevel[subclassConfig.level] || []).map((f, i) => (
                                                    <li key={i} className="text-xs text-purple-100/80">
                                                        <span className="font-bold text-purple-200">{featureName(f, language)}</span> — {featureDesc(f, language)}
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

                {/* Feat picker — 5e's "ASI or feat" choice, priced at 2 points so a
                    multi-level jump can take both a feat AND stat points. */}
                {asiBudget >= FEAT_COST && availableFeats.length > 0 && (
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-emerald-700/50">
                        <h3 className="text-emerald-300 font-bold mb-1 flex items-center gap-2">
                            <Award className="w-4 h-4" /> {tr.featTitle} <span className="text-emerald-500/80 text-xs font-normal">{tr.featCost}</span>
                        </h3>
                        <p className="text-gray-400 text-xs mb-3">
                            {selectedFeat ? tr.featSelected : tr.featHint}
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                            {availableFeats.map(feat => {
                                const isSelected = selectedFeat === feat.id;
                                const affordable = isSelected || remaining >= FEAT_COST;
                                const name = language === 'fr' ? feat.nameFr : feat.name;
                                const description = language === 'fr' ? feat.descriptionFr : feat.description;
                                const benefits = language === 'fr' ? feat.benefitsFr : feat.benefits;
                                return (
                                    <button
                                        key={feat.id}
                                        onClick={() => setSelectedFeat(isSelected ? null : feat.id)}
                                        disabled={!affordable}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-emerald-400 bg-emerald-900/50'
                                            : affordable
                                                ? 'border-gray-600 bg-gray-800/50 hover:border-emerald-500/60'
                                                : 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-bold ${isSelected ? 'text-emerald-200' : 'text-gray-200'}`}>{name}</span>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1 leading-snug">{description}</p>
                                        {isSelected && (
                                            <ul className="mt-2 space-y-1 border-t border-emerald-500/30 pt-2">
                                                {benefits.map((b, i) => (
                                                    <li key={i} className="text-xs text-emerald-100/80">• {b}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Nouveaux sorts (lanceurs) — choix guidé, complétable plus tard
                    via l'onglet « Apprendre » du Grimoire. */}
                {spellBudget > 0 && learnableSpells.length > 0 && (
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-sky-700/50">
                        <h3 className="text-sky-300 font-bold mb-1 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> {tr.spellsTitle}
                            <span className="ml-auto text-xs font-normal text-sky-400/80">{tr.spellsPicked(selectedSpells.length, spellBudget)}</span>
                        </h3>
                        <p className="text-gray-400 text-xs mb-3">{tr.spellsHint(spellBudget)}</p>
                        <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => {
                                const group = learnableSpells.filter(sp => sp.level === level);
                                if (!group.length) return null;
                                return (
                                    <div key={level}>
                                        <div className="text-[10px] font-bold uppercase tracking-wide text-sky-400/70 mb-1">
                                            {level === 0 ? tr.cantripsGroup : tr.levelGroup(level)}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {group.map(sp => {
                                                const isPicked = selectedSpells.includes(sp.name);
                                                const full = !isPicked && selectedSpells.length >= spellBudget;
                                                return (
                                                    <button
                                                        key={sp.id}
                                                        type="button"
                                                        onClick={() => toggleSpell(sp.name)}
                                                        disabled={full}
                                                        title={sp.effectSummary}
                                                        className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition ${isPicked
                                                            ? 'border-sky-400 bg-sky-900/50 text-sky-100'
                                                            : full
                                                                ? 'border-gray-700 bg-gray-800/30 text-gray-500 opacity-50 cursor-not-allowed'
                                                                : 'border-gray-600 bg-gray-800/50 text-gray-200 hover:border-sky-500/60'
                                                            }`}
                                                    >
                                                        <span className="truncate">{spellLabel(sp, language)}</span>
                                                        {isPicked && <Check className="w-3.5 h-3.5 shrink-0 text-sky-300" />}
                                                    </button>
                                                );
                                            })}
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
