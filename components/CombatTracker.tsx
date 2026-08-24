import React from 'react';
import { Activity, ExternalLink, Heart, Shield, SkipForward, Skull, Swords, User, XCircle } from 'lucide-react';
import { getCreature, getCreatureAttacks, formatCR } from '../data/bestiary';
import type { ActiveEffect } from '../types';
import { CombatActionsPanel } from './CombatActionsPanel';
import { useGameStore } from '../store/gameStore';

const TRANS = {
    en: {
        mainActionTitle: 'Main Action (Green = Available, Gray = Used)',
        bonusActionTitle: 'Bonus Action (Yellow = Available, Gray = Used)',
        reactionTitle: 'Reaction (Purple = Available, Gray = Used)',
        extraAttackTitle: 'Extra Attack (Blue = Available, Gray = Used)',
        rangeNear: '↔ near',
        rangeFar: '🏹 far',
        rangeNearTitle: 'A few strides away — a melee attack closes in for free.',
        rangeFarTitle: 'Far away — closing in takes your attack, or use a ranged/thrown weapon.',
        target: '🎯 TARGET',
        init: 'Init',
        usesRemaining: (n: number) => `${n} uses remaining`,
        currentTurn: 'Current turn',
        reference: 'Reference',
        combat: 'Combat',
        initiative: 'Initiative',
        round: 'Round',
        enemies: 'Enemies',
        endMyTurn: 'End my turn',
        waiting: 'Waiting',
        endTurnTitle: 'End your turn — the enemies play next',
        otherCombatantsTurn: "Other combatants' turn",
        endCombat: 'End the combat',
        end: 'End',
        combatRolls: 'Combat rolls',
        playerLegend: '● player',
        enemyLegend: '● enemy/DM',
        rollsEmpty: 'Attack and damage rolls will appear here.',
    },
    fr: {
        mainActionTitle: 'Action Principale (Vert = Disponible, Gris = Utilisé)',
        bonusActionTitle: 'Action Bonus (Jaune = Disponible, Gris = Utilisé)',
        reactionTitle: 'Réaction (Violet = Disponible, Gris = Utilisé)',
        extraAttackTitle: 'Attaque Supplémentaire (Bleu = Disponible, Gris = Utilisé)',
        rangeNear: '↔ proche',
        rangeFar: '🏹 loin',
        rangeNearTitle: 'À quelques pas — une attaque de mêlée engage gratuitement.',
        rangeFarTitle: 'Loin — se rapprocher coûte ton attaque, ou utilise une arme à distance/de jet.',
        target: '🎯 CIBLE',
        init: 'Init',
        usesRemaining: (n: number) => `${n} utilisations restantes`,
        currentTurn: 'Tour actuel',
        reference: 'Référence',
        combat: 'Combat',
        initiative: 'Initiative',
        round: 'Round',
        enemies: 'Ennemis',
        endMyTurn: 'Terminer mon tour',
        waiting: 'En attente',
        endTurnTitle: 'Terminer ton tour — les ennemis jouent ensuite',
        otherCombatantsTurn: 'Tour des autres combattants',
        endCombat: 'Terminer le combat',
        end: 'Fin',
        combatRolls: 'Jets de combat',
        playerLegend: '● joueur',
        enemyLegend: '● ennemi/MJ',
        rollsEmpty: "Les jets d'attaque et de dégâts s'afficheront ici.",
    },
} as const;

type Tr = (typeof TRANS)[keyof typeof TRANS];

export interface Combatant {
    id: string;
    name: string;
    initiative: number;
    hp: { current: number; max: number };
    ac: number;
    isPlayer?: boolean;
    /** Faction. Optional for back-compat: when absent, derive player from isPlayer, else enemy. */
    side?: 'player' | 'ally' | 'enemy';
    portrait?: string;
    activeEffects?: ActiveEffect[];
    moraleChecked?: boolean;
    tempHP?: number;
    dexMod?: number;
    /** Damage types this combatant resists (halved). The player carries racial resistances. */
    resistances?: string[];
    /** Damage types this combatant is IMMUNE to (0 damage) — audit 2026-08-12 :
     *  le joueur ne pouvait jamais être immunisé ni vulnérable. */
    immunities?: string[];
    /** Damage types this combatant is VULNERABLE to (double damage). */
    vulnerabilities?: string[];
    /** Concentration d'un PNJ/monstre lanceur (audit 2026-08-12 : la
     *  concentration n'existait que pour le héros — le Hold Person d'un ennemi
     *  ne se brisait jamais). Posé par apply_condition {concentrationBy},
     *  testé par applyDamageToEncounter (CON save DD max(10, dégâts/2)),
     *  purgé quand le lanceur tombe à 0 PV. */
    concentratingOn?: { effectName: string; targetId?: string };
    /** Usages de sorts LIMITÉS déjà dépensés par ce lanceur ennemi
     *  (data/casterKits.ts) — nom du sort → nombre d'utilisations. */
    spellUses?: Record<string, number>;
    /** Explicit XP award (DM-provided via add_enemy_init). Falls back to bestiary → HP estimate. */
    xpValue?: number;
    /** Distance band relative to the player: melee = au contact, near = quelques mètres, far = loin. */
    range?: 'melee' | 'near' | 'far';
    /** Profil d'attaque d'un ALLIÉ (compagnon, PNJ secouru, invocation) : le
     *  moteur joue son tour lui-même avec ces chiffres. Sans profil, le tour de
     *  l'allié dépendait entièrement du MJ et « passait » la plupart du temps. */
    attack?: { name: string; attackBonus: number; damage: string; damageType: string };
}

/** Faction of a combatant, back-compatible with the old isPlayer-only model. */
export function combatantSide(c: Combatant): 'player' | 'ally' | 'enemy' {
    return c.side || (c.isPlayer ? 'player' : 'enemy');
}

/** Heroes = player + allies (one "team"); used for targeting and defeat checks. */
export function isHero(c: Combatant): boolean {
    return combatantSide(c) !== 'enemy';
}

interface Props {
    combatants: Combatant[];
    currentTurn: string;
    onEndCombat?: () => void;
    onAdvanceTurn?: () => void;
    isActive?: boolean;
    round?: number;
    onOpenReference?: (name: string, url: string) => void;
    actionEconomy?: Record<string, any>;
    onToggleAction?: (combatantId: string, kind: 'action' | 'bonusAction' | 'extraAttack' | 'reaction') => void;
    playerStoryModifiers?: any[];
    selectedTargetId?: string;
    onSelectTarget?: (id: string) => void;
    onAttack?: (weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) => void;
    /** Bonus-action attack: off-hand weapon, Berserker Frenzy, or War Priest. */
    onBonusAttack?: (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield') => void;
    onCastSpell?: (spellName: string, slotLevel: string | null, targetId: string) => void;
    onDodge?: () => void;
    onUsePotion?: (potionItem: any) => void;
    /** Class-resource abilities (Rage, Second Wind, Action Surge, Ki…). */
    onUseAbility?: (abilityId: any, targetId?: string) => void;
    /** True while a player action is mid-resolution — disables the action panel. */
    isResolvingAction?: boolean;
}

function hpPercent(combatant: Combatant): number {
    if (!combatant.hp.max) return 0;
    return Math.max(0, Math.min(100, (combatant.hp.current / combatant.hp.max) * 100));
}

function hpTone(percent: number): string {
    if (percent <= 0) return 'bg-zinc-700';
    if (percent < 25) return 'bg-red-500';
    if (percent < 50) return 'bg-orange-400';
    return 'bg-emerald-400';
}

function normalizeTurn(value: string): string {
    return value.toLowerCase().trim();
}

function duplicateSuffix(index: number): string {
    let value = index;
    let suffix = '';
    do {
        suffix = String.fromCharCode(65 + (value % 26)) + suffix;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return suffix;
}

export function combatantMapKey(combatant: Combatant, index: number): string {
    return combatant.id || `${combatant.name}-${index}`;
}

export function buildDisplayNames(combatants: Combatant[]): Map<string, string> {
    const enemyCounts = new Map<string, number>();
    for (const combatant of combatants) {
        if (combatant.isPlayer) continue;
        const key = normalizeTurn(combatant.name);
        enemyCounts.set(key, (enemyCounts.get(key) || 0) + 1);
    }

    const seen = new Map<string, number>();
    const names = new Map<string, string>();
    combatants.forEach((combatant, index) => {
        const key = normalizeTurn(combatant.name);
        if (combatant.isPlayer || (enemyCounts.get(key) || 0) <= 1) {
            names.set(combatantMapKey(combatant, index), combatant.name);
            return;
        }

        const duplicateIndex = seen.get(key) || 0;
        seen.set(key, duplicateIndex + 1);
        names.set(combatantMapKey(combatant, index), `${combatant.name} ${duplicateSuffix(duplicateIndex)}`);
    });
    return names;
}

function CombatantPortrait({ 
    combatant, 
    isTurn, 
    onClick 
}: { 
    combatant: Combatant; 
    isTurn: boolean; 
    onClick?: (e: React.MouseEvent) => void; 
}) {
    const clickableClass = onClick ? 'cursor-pointer hover:border-sky-400 active:scale-95 transition-all duration-200' : '';

    if (combatant.portrait) {
        return (
            <img
                src={combatant.portrait}
                alt={combatant.name}
                title={combatant.name}
                onClick={onClick}
                // AideDD bloque le hotlinking sur le Referer : sans no-referrer,
                // tous les portraits SRD (aidedd.org/dnd/images/*.jpg) tombaient
                // en 403 et l'onError les cachait — d'où « pas de portraits ».
                referrerPolicy="no-referrer"
                loading="lazy"
                className={`h-12 w-12 rounded-md border object-cover shadow-lg ${isTurn ? 'border-amber-300' : 'border-white/15'} ${clickableClass}`}
                onError={(event) => { (event.target as HTMLImageElement).style.display = 'none'; }}
            />
        );
    }

    return (
        <div 
            onClick={onClick}
            className={`grid h-12 w-12 place-items-center rounded-md border ${isTurn ? 'border-amber-300 bg-amber-500/10' : 'border-white/15 bg-white/5'} ${clickableClass}`}
        >
            {combatantSide(combatant) === 'player' ? <User className="h-6 w-6 text-sky-300" />
                : combatantSide(combatant) === 'ally' ? <Shield className="h-6 w-6 text-emerald-300" />
                : <Skull className="h-6 w-6 text-zinc-300" />}
        </div>
    );
}

// Typed as React.FC so JSX recognizes the React-managed `key` attribute at the
// call site (a plain function-component signature tripped TS2322 "Property 'key'
// does not exist" under this project's React type setup).
const CombatantRow: React.FC<{
    combatant: Combatant;
    index: number;
    displayName: string;
    isTurn: boolean;
    onOpenReference?: (name: string, url: string) => void;
    actionEconomy?: any;
    onToggleAction?: (combatantId: string, kind: 'action' | 'bonusAction' | 'extraAttack' | 'reaction') => void;
    playerStoryModifiers?: any[];
    isSelectedTarget?: boolean;
    onClick?: () => void;
    tr: Tr;
}> = ({
    combatant,
    index,
    displayName,
    isTurn,
    onOpenReference,
    actionEconomy,
    onToggleAction,
    playerStoryModifiers,
    isSelectedTarget,
    onClick,
    tr,
}) => {
    const percent = hpPercent(combatant);
    const isDown = combatant.hp.current <= 0;
    const side = combatantSide(combatant);
    const creature = !combatant.isPlayer ? getCreature(combatant.name) : null;
    const primaryAttack = creature ? getCreatureAttacks(creature)[0] : null;

    const hasExtraAttack = combatant.isPlayer && (playerStoryModifiers || []).some(mod =>
        /extra\s*attack|attaque\s*suppl|haste|hâte|action\s*surge/i.test(mod.name)
    );

    return (
        <div
            onClick={onClick}
            className={[
                'relative overflow-hidden rounded-md border p-2 transition-all duration-200',
                isTurn ? 'border-amber-400/70 bg-amber-500/12 shadow-[0_0_24px_rgba(245,158,11,0.18)]' : side === 'ally' ? 'border-emerald-500/45 bg-emerald-950/25 shadow-[0_0_16px_rgba(16,185,129,0.12)]' : side === 'player' ? 'border-sky-500/45 bg-sky-950/20' : 'border-white/10 bg-black/35',
                isSelectedTarget ? 'border-red-500 bg-red-950/20 shadow-[0_0_16px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50' : '',
                !isDown && onClick ? 'cursor-pointer hover:border-white/30' : '',
                isDown ? 'opacity-55 grayscale cursor-not-allowed' : '',
            ].join(' ')}
        >
            <div className="flex items-center gap-3">
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-black ${isTurn ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-white/5 text-white/55'}`}>
                    {index + 1}
                </div>

                <CombatantPortrait 
                    combatant={combatant} 
                    isTurn={isTurn} 
                    onClick={creature?.url ? (e) => {
                        e.stopPropagation();
                        if (onOpenReference) {
                            onOpenReference(combatant.name, creature.url || '');
                        } else {
                            window.open(creature.url, '_blank');
                        }
                    } : undefined}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="flex items-center gap-1 shrink-0 mr-1.5">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleAction?.(combatant.id, 'action'); }}
                                        title={tr.mainActionTitle}
                                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                    >
                                        <Swords className={`h-4 w-4 transition-colors ${actionEconomy?.actionUsed ? 'text-zinc-600 opacity-40' : 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]'}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleAction?.(combatant.id, 'bonusAction'); }}
                                        title={tr.bonusActionTitle}
                                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                    >
                                        <Swords className={`h-4 w-4 transition-colors ${actionEconomy?.bonusActionUsed ? 'text-zinc-600 opacity-40' : 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]'}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onToggleAction?.(combatant.id, 'reaction'); }}
                                        title={tr.reactionTitle}
                                        className="focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                    >
                                        <Shield className={`h-3.5 w-3.5 transition-colors ${actionEconomy?.reactionUsed ? 'text-zinc-600 opacity-40' : 'text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]'}`} />
                                    </button>
                                    {hasExtraAttack && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onToggleAction?.(combatant.id, 'extraAttack'); }}
                                            title={tr.extraAttackTitle}
                                            className="focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                        >
                                            <Swords className={`h-3.5 w-3.5 transition-colors ${actionEconomy?.extraAttackUsed ? 'text-zinc-600 opacity-40' : 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]'}`} />
                                        </button>
                                    )}
                                </div>
                                {/* Noms longs : 2 lignes max au lieu d'une coupe sèche,
                                    + le nom complet en infobulle au survol. */}
                                <span title={displayName} className={`line-clamp-2 break-words text-sm font-black uppercase leading-4 ${isTurn ? 'text-amber-200' : 'text-white/85'}`}>
                                    {displayName}
                                </span>
                                {isSelectedTarget && (
                                    <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-400 animate-pulse">
                                        {tr.target}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                                <span>{tr.init} {combatant.initiative}</span>
                                {creature && <span>CR {formatCR(creature.cr)}</span>}
                                {primaryAttack && <span className="truncate">{primaryAttack.damage} {primaryAttack.damageType}</span>}
                                {combatantSide(combatant) === 'enemy' && combatant.range && combatant.range !== 'melee' && (
                                    <span
                                        title={combatant.range === 'far' ? tr.rangeFarTitle : tr.rangeNearTitle}
                                        className={`inline-flex items-center rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${
                                            combatant.range === 'far'
                                                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                        }`}
                                    >
                                        {combatant.range === 'far' ? tr.rangeFar : tr.rangeNear}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/35 px-1.5 py-1 text-[11px] font-bold text-white/80">
                                <Shield className="h-3 w-3 text-zinc-400" />
                                {combatant.ac}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/35 px-1.5 py-1 text-[11px] font-bold text-white/80">
                                <Heart className={`h-3 w-3 ${percent < 30 ? 'text-red-400' : 'text-emerald-400'}`} />
                                {combatant.hp.current}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
                        <div className="h-2 overflow-hidden rounded bg-white/10">
                            <div className={`h-full ${hpTone(percent)} transition-all duration-500`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-14 text-right font-mono text-[10px] text-white/45">
                            {combatant.hp.current}/{combatant.hp.max}
                        </span>
                    </div>

                    {/* Display of Active Effects (Bonuses/Maluses) */}
                    {((combatant.activeEffects && combatant.activeEffects.length > 0) || (combatant.isPlayer && playerStoryModifiers && playerStoryModifiers.length > 0)) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {combatant.activeEffects?.map((effect) => {
                                const combined = `${effect.name} ${effect.description || ''}`.toLowerCase();
                                const isNegative = /poison|blind|deaf|prn|stun|bleed|exhaust|charm|fright|fled|paraly|restrain|incapac|malus/i.test(combined);
                                return (
                                    <span
                                        key={effect.id}
                                        title={effect.description || effect.name}
                                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                            isNegative
                                                ? 'border-red-900/45 bg-red-950/45 text-red-300'
                                                : 'border-emerald-900/45 bg-emerald-950/45 text-emerald-300'
                                        }`}
                                    >
                                        {effect.name}
                                    </span>
                                );
                            })}
                            
                            {combatant.isPlayer && playerStoryModifiers?.map((mod) => {
                                const isNegative = mod.mode === 'disadvantage' || mod.bonus < 0;
                                return (
                                    <span
                                        key={mod.id}
                                        title={`${mod.reason} (${tr.usesRemaining(mod.remainingUses)})`}
                                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                            isNegative
                                                ? 'border-red-900/45 bg-red-950/45 text-red-300'
                                                : 'border-amber-900/45 bg-amber-950/45 text-amber-200'
                                        }`}
                                    >
                                        {mod.name} {mod.bonus !== 0 ? `${mod.bonus > 0 ? '+' : ''}${mod.bonus}` : ''}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isTurn && (
                <div className="mt-2 flex items-center justify-between border-t border-amber-400/20 pt-2 text-[11px] text-amber-100/75">
                    <span className="inline-flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {tr.currentTurn}
                    </span>
                    {creature?.url && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenReference) {
                                    onOpenReference(combatant.name, creature.url || '');
                                } else {
                                    window.open(creature.url, '_blank');
                                }
                            }}
                            className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200 text-xs"
                        >
                            <ExternalLink className="h-3 w-3" />
                            {tr.reference}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export function CombatTracker({ 
    combatants, 
    currentTurn, 
    onEndCombat, 
    onAdvanceTurn, 
    isActive, 
    round = 1, 
    onOpenReference,
    actionEconomy,
    onToggleAction,
    playerStoryModifiers,
    selectedTargetId,
    onSelectTarget,
    onAttack,
    onBonusAttack,
    onCastSpell,
    onDodge,
    onUsePotion,
    onUseAbility,
    isResolvingAction,
}: Props) {
    // Rules of Hooks: every hook must run before any early return. (This
    // useGameStore was previously below the guard → "rendered more/fewer hooks"
    // crash when isActive toggled.)
    const combatRolls = useGameStore(s => s.combatRolls);
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];

    if (!isActive || !combatants.length) return null;

    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    const displayNames = buildDisplayNames(sorted);
    const living = sorted.filter(combatant => combatant.hp.current > 0);
    // Faction-aware: allies must NOT count as enemies in the header tally.
    const enemiesAlive = living.filter(combatant => combatantSide(combatant) === 'enemy').length;
    const currentIndex = sorted.findIndex(combatant => normalizeTurn(combatant.name) === normalizeTurn(currentTurn) || combatant.id === currentTurn);
    const current = currentIndex >= 0 ? sorted[currentIndex] : undefined;

    const isPlayerTurn = currentTurn === 'player' ||
        combatants.find(c => c.id === currentTurn || c.name === currentTurn)?.isPlayer;
    // Pulse the "Terminer mon tour" button once the player has spent their Action,
    // to make explicit turn-ending discoverable (combat no longer auto-advances).
    const playerCombatant = combatants.find(c => c.isPlayer);
    const playerActionUsed = Boolean(isPlayerTurn && actionEconomy?.[playerCombatant?.id || 'player']?.actionUsed);
    const recentRolls = combatRolls.slice(-8);

    return (
        <aside className="fixed bottom-28 left-3 right-3 z-50 max-h-[48vh] overflow-hidden rounded-md border border-white/12 bg-zinc-950/92 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-[488px] md:max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="border-b border-white/10 bg-black/45 p-3 flex-none">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-red-300/75">
                            <Swords className="h-4 w-4 text-red-400" />
                            {tr.combat}
                        </div>
                        <h2
                            title={current ? displayNames.get(combatantMapKey(current, currentIndex)) || current.name : undefined}
                            className="truncate text-lg font-black leading-6 text-white"
                        >
                            {current ? displayNames.get(combatantMapKey(current, currentIndex)) || current.name : tr.initiative}
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
                        <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                            <div className="text-white/40">{tr.round}</div>
                            <div className="font-mono text-sm font-bold text-amber-200">{round}</div>
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                            <div className="text-white/40">{tr.enemies}</div>
                            <div className="font-mono text-sm font-bold text-red-200">{enemiesAlive}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        onClick={onAdvanceTurn}
                        className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            isPlayerTurn
                                ? `border-amber-400/60 bg-amber-500/25 text-amber-50 hover:bg-amber-500/40 ${playerActionUsed ? 'animate-pulse ring-2 ring-amber-400/60' : ''}`
                                : 'border-white/10 bg-white/5 text-white/40'
                        }`}
                        disabled={!onAdvanceTurn || !isPlayerTurn}
                        title={isPlayerTurn ? tr.endTurnTitle : tr.otherCombatantsTurn}
                    >
                        <SkipForward className="h-4 w-4" />
                        {isPlayerTurn ? tr.endMyTurn : tr.waiting}
                    </button>
                    <button
                        onClick={onEndCombat}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/35 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!onEndCombat}
                        title={tr.endCombat}
                    >
                        <XCircle className="h-4 w-4" />
                        {tr.end}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[120px] overflow-y-auto p-2 custom-scrollbar">
                <div className="space-y-2">
                    {sorted.map((combatant, index) => (
                        <CombatantRow
                            key={combatant.id || `${combatant.name}-${index}`}
                            combatant={combatant}
                            index={index}
                            displayName={displayNames.get(combatantMapKey(combatant, index)) || combatant.name}
                            isTurn={normalizeTurn(combatant.name) === normalizeTurn(currentTurn) || combatant.id === currentTurn}
                            onOpenReference={onOpenReference}
                            actionEconomy={actionEconomy?.[combatant.id || combatant.name] || actionEconomy?.[combatant.name]}
                            onToggleAction={onToggleAction}
                            playerStoryModifiers={playerStoryModifiers}
                            isSelectedTarget={selectedTargetId === combatant.id}
                            onClick={() => {
                                if (combatant.hp.current > 0 && onSelectTarget) {
                                    onSelectTarget(combatant.id);
                                }
                            }}
                            tr={tr}
                        />
                    ))}
                </div>
            </div>

            {/* Combat roll journal — enemy + player attack/damage/save rolls, persistent in the combat area. */}
            <div className="border-t-2 border-amber-400/30 bg-black/55 px-2 py-2 flex-none">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/70">
                    <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> {tr.combatRolls}</span>
                    <span className="text-[9px] font-normal normal-case text-white/40">
                        <span className="text-sky-300/80">{tr.playerLegend}</span> · <span className="text-red-300/80">{tr.enemyLegend}</span>
                    </span>
                </div>
                {recentRolls.length === 0 ? (
                    <div className="px-1 py-2 text-center text-[11px] italic text-white/30">{tr.rollsEmpty}</div>
                ) : (
                    <div className="max-h-[150px] space-y-1 overflow-y-auto custom-scrollbar">
                        {recentRolls.map(r => (
                            <div key={r.id} className={`flex items-baseline justify-between gap-2 rounded px-2 py-1 text-xs ${r.isDM ? 'bg-red-950/40 ring-1 ring-red-500/20' : 'bg-sky-950/30'}`}>
                                <span title={`${r.name}${r.formula ? ` · ${r.formula}` : ''}`} className={`truncate ${r.isDM ? 'text-red-100' : 'text-sky-100'}`}>{r.name}{r.formula ? <span className="text-white/35"> · {r.formula}</span> : null}</span>
                                <span className={`shrink-0 font-mono text-sm font-black ${r.success === true ? 'text-green-400' : r.success === false ? 'text-red-400' : 'text-amber-200'}`}>
                                    {r.total}{r.success === true ? ' ✓' : r.success === false ? ' ✗' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isPlayerTurn && onAttack && onCastSpell && onDodge && onUsePotion && (
                <div className="border-t border-white/10 p-2 bg-black/50 flex-none max-h-[40vh] overflow-y-auto custom-scrollbar">
                    <CombatActionsPanel
                        selectedTargetId={selectedTargetId || ''}
                        onSelectTarget={onSelectTarget || (() => {})}
                        onAttack={onAttack}
                        onBonusAttack={onBonusAttack}
                        onCastSpell={onCastSpell}
                        onDodge={onDodge}
                        onUsePotion={onUsePotion}
                        onUseAbility={onUseAbility}
                        disabled={isResolvingAction}
                    />
                </div>
            )}
        </aside>
    );
}
