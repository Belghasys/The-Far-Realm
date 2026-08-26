import React from 'react';
import { useGameStore } from '../../store/gameStore';

const TRANS = {
    en: {
        action: 'Action',
        actions: 'Actions',
        bonus: 'Bonus',
        endTurn: 'End the turn ▸',
    },
    fr: {
        action: 'Action',
        actions: 'Actions',
        bonus: 'Bonus',
        endTurn: 'Terminer le tour ▸',
    },
} as const;

interface Props {
    attacksMax: number;
    attacksUsed: number;
    bonusMax: number;
    bonusUsed: number;
}

// A row of filled/empty dots. Filled = still available this turn, empty/gray = spent.
function Pips({ max, used, color }: { max: number; used: number; color: 'green' | 'amber' }) {
    const remaining = Math.max(0, max - used);
    const filled = color === 'green'
        ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
        : 'bg-amber-400 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.7)]';
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: Math.max(0, max) }).map((_, i) => (
                <span
                    key={i}
                    className={`h-3.5 w-3.5 rounded-full border transition-colors ${i < remaining ? filled : 'bg-zinc-800 border-zinc-600'}`}
                />
            ))}
        </div>
    );
}

/**
 * Player action "pips" for the HUD: green = main-action attacks remaining
 * (Extra Attack gives several), amber = bonus actions. Each consumed action
 * empties a dot; when nothing is left it prompts ending the turn. Mounted by
 * GameSession only during the player's own turn in combat.
 */
export function ActionPips({ attacksMax, attacksUsed, bonusMax, bonusUsed }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    if (attacksMax <= 0 && bonusMax <= 0) return null;
    const noneLeft = (attacksMax - attacksUsed) <= 0 && (bonusMax - bonusUsed) <= 0;

    return (
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-zinc-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-xl">
            {attacksMax > 0 && (
                <div className="flex items-center gap-1.5">
                    <span className="text-emerald-300/80">{attacksMax > 1 ? tr.actions : tr.action}</span>
                    <Pips max={attacksMax} used={attacksUsed} color="green" />
                </div>
            )}
            {bonusMax > 0 && (
                <div className="flex items-center gap-1.5">
                    <span className="text-amber-300/80">{tr.bonus}</span>
                    <Pips max={bonusMax} used={bonusUsed} color="amber" />
                </div>
            )}
            {noneLeft && <span className="animate-pulse text-amber-200">{tr.endTurn}</span>}
        </div>
    );
}
