import React from 'react';
import { Shield, Sparkles, Flame, Eye, Zap, Heart, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { STATUS_BAR_TEXTS as TRANS } from './texts';

export interface StatusEffect {
    id: string;
    name: string;
    icon: 'shield' | 'sparkle' | 'flame' | 'eye' | 'zap' | 'heart' | 'swords';
    type: 'buff' | 'debuff' | 'cover' | 'condition';
    bonus: string;          // "+2 AC", "+1d4", etc.
    duration?: number;      // Remaining turns (undefined = permanent until removed)
    source?: string;        // "DM", "Spell", "Position"
}

interface StatusBarProps {
    effects: StatusEffect[];
    coverBonus: number;           // 0, 2, or 5
    onRemoveEffect?: (id: string) => void;
}

const ICON_MAP = {
    shield: Shield,
    sparkle: Sparkles,
    flame: Flame,
    eye: Eye,
    zap: Zap,
    heart: Heart,
    swords: Swords
};

const COVER_DISPLAY = {
    0: null,
    2: { labelKey: 'halfCover', icon: '🛡️', color: 'bg-blue-900/60 border-blue-500' },
    5: { labelKey: 'threeQuarterCover', icon: '🏰', color: 'bg-green-900/60 border-green-500' }
} as const;

export function StatusBar({ effects, coverBonus, onRemoveEffect }: StatusBarProps) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const coverEntry = COVER_DISPLAY[coverBonus as keyof typeof COVER_DISPLAY];
    const coverDisplay = coverEntry ? { ...coverEntry, label: tr[coverEntry.labelKey] } : null;

    // No effects and no cover = don't render
    if (effects.length === 0 && !coverDisplay) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900/80 border border-gray-700 rounded-lg mb-2">
            {/* Cover Status */}
            {coverDisplay && (
                <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${coverDisplay.color}`}
                    title={`${coverDisplay.label}: +${coverBonus} ${tr.coverTooltipSuffix}`}
                >
                    <span>{coverDisplay.icon}</span>
                    <span className="text-white">{coverDisplay.label}</span>
                    <span className="text-green-400 font-bold">+{coverBonus} AC</span>
                </div>
            )}

            {/* Active Effects */}
            {effects.map((effect) => {
                const IconComponent = ICON_MAP[effect.icon] || Shield;
                const bgColor = effect.type === 'buff'
                    ? 'bg-emerald-900/60 border-emerald-500'
                    : effect.type === 'debuff'
                        ? 'bg-red-900/60 border-red-500'
                        : 'bg-purple-900/60 border-purple-500';

                return (
                    <div
                        key={effect.id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                        title={`${effect.name}${effect.source ? ` (${effect.source})` : ''}${effect.duration ? ` - ${effect.duration} ${tr.turnsShort}` : ''}`}
                        onClick={() => onRemoveEffect?.(effect.id)}
                    >
                        <IconComponent className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">{effect.name}</span>
                        <span className={effect.type === 'buff' ? 'text-green-400' : 'text-red-400'}>
                            {effect.bonus}
                        </span>
                        {effect.duration && (
                            <span className="text-gray-400 text-[10px]">({effect.duration}{tr.turnAbbrev})</span>
                        )}
                    </div>
                );
            })}

            {/* Empty state hint */}
            {effects.length === 0 && !coverDisplay && (
                <span className="text-gray-500 text-xs italic">{tr.noActiveEffect}</span>
            )}
        </div>
    );
}
