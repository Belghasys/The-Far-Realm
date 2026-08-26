import React from 'react';
import { Dices, Target, Swords, Sparkles, Shield, ArrowUp, ArrowDown } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { ACTION_PROMPT_TEXTS as TRANS } from './texts';

interface Props {
    checkType: 'CHECK' | 'SAVE' | 'ATTACK' | 'DAMAGE' | 'DEATH_SAVE' | null;
    checkName: string | null;
    formula: string;
    dc?: number;
    advantage?: 'normal' | 'advantage' | 'disadvantage';
    dmBonus?: number;
    contextReasons?: string[];
    /** False for MANDATORY rolls (death saves, concentration): cancelling a
     *  death save left the hero stuck at 0 HP forever (the prompt key is
     *  memoized and never re-fires). Default true. */
    canDismiss?: boolean;
    onRoll: () => void;
    onDismiss: () => void;
}

// Parse formula to extract dice and modifier
const parseFormula = (formula: string) => {
    const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return { dice: '1d20', modifier: 0 };
    const [_, count, sides, mod] = match;
    return {
        dice: `${count}d${sides}`,
        modifier: mod ? parseInt(mod) : 0
    };
};

export function ActionPrompt({ checkType, checkName, formula, dc, advantage = 'normal', dmBonus = 0, contextReasons = [], canDismiss = true, onRoll, onDismiss }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    if (!checkType) return null;

    const { dice, modifier } = parseFormula(formula);
    const totalModifier = modifier + dmBonus;
    const isAttack = checkType === 'ATTACK' || checkName?.toLowerCase().includes('attack');
    const isDamage = checkType === 'DAMAGE' || checkName?.toLowerCase().includes('damage');
    const isSave = checkType === 'SAVE' || checkType === 'DEATH_SAVE' || checkName?.toLowerCase().includes('save');

    // Choose icon based on type
    const Icon = isDamage ? Swords : isSave ? Shield : isAttack ? Target : Dices;

    // Use static Tailwind classes instead of dynamic (Tailwind can't compile dynamic)
    const borderClass = isDamage ? 'border-red-500/50' : isAttack ? 'border-orange-500/50' : 'border-gold/50';
    const buttonGradient = isDamage
        ? 'from-red-900 to-red-700 hover:from-red-700 hover:to-red-500 border-red-500'
        : 'from-gold/80 to-yellow-600 hover:from-gold hover:to-yellow-400 border-yellow-500';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`
                bg-gradient-to-b from-gray-900 to-black 
                border-2 ${borderClass}
                rounded-2xl shadow-[0_0_60px_rgba(255,215,0,0.3)] 
                p-8 flex flex-col items-center gap-6 min-w-[350px]
                animate-scale-in
            `}>
                {/* Header */}
                <div className="flex items-center gap-3 text-gold">
                    <Icon className="w-8 h-8 animate-pulse" />
                    <h3 className="text-2xl font-fantasy uppercase tracking-widest">
                        {isDamage ? tr.damageRoll : isSave ? tr.savingThrow : isAttack ? tr.attackRoll : tr.skillCheck}
                    </h3>
                </div>

                {/* Advantage/Disadvantage Badge */}
                {advantage !== 'normal' && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm uppercase ${advantage === 'advantage'
                            ? 'bg-green-900/50 text-green-400 border border-green-500'
                            : 'bg-red-900/50 text-red-400 border border-red-500'
                        }`}>
                        {advantage === 'advantage' ? (
                            <><ArrowUp className="w-4 h-4" /> {tr.advantageBadge}</>
                        ) : (
                            <><ArrowDown className="w-4 h-4" /> {tr.disadvantageBadge}</>
                        )}
                    </div>
                )}

                {/* Check Name */}
                <div className="text-center">
                    <div className="text-white text-3xl font-bold mb-2">{checkName}</div>

                    {/* Formula Breakdown */}
                    <div className="flex items-center justify-center gap-2 text-xl flex-wrap">
                        <span className={`px-4 py-2 rounded-lg border font-mono ${advantage === 'advantage' ? 'bg-green-800 border-green-600 text-green-300' :
                                advantage === 'disadvantage' ? 'bg-red-800 border-red-600 text-red-300' :
                                    'bg-gray-800 border-gray-600 text-gold'
                            }`}>
                            {advantage !== 'normal' ? '2d20' : dice}
                        </span>
                        {totalModifier !== 0 && (
                            <>
                                <span className="text-gray-400">+</span>
                                <span className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-600 font-mono text-blue-400">
                                    {totalModifier >= 0 ? `+${totalModifier}` : totalModifier}
                                </span>
                            </>
                        )}
                        {dmBonus !== 0 && (
                            <span className="text-xs text-purple-400">{tr.inclDmBonus(dmBonus)}</span>
                        )}
                        {dc && dc > 0 && (
                            <>
                                <span className="text-gray-400 mx-2">vs</span>
                                <span className="bg-red-900/50 px-4 py-2 rounded-lg border border-red-500/50 font-mono text-red-400">
                                    DC {dc}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {contextReasons.length > 0 && (
                    <div className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-left">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gold/70">{tr.rulesContext}</div>
                        <ul className="space-y-1 text-xs text-gray-300">
                            {contextReasons.slice(0, 4).map((reason, index) => (
                                <li key={`${reason}-${index}`}>{reason}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Roll Button */}
                <button
                    onClick={onRoll}
                    className={`
                        w-full py-4 rounded-xl font-bold text-xl uppercase tracking-wider
                        bg-gradient-to-r ${buttonGradient}
                        text-white shadow-lg
                        flex items-center justify-center gap-3
                        transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]
                        border
                    `}
                >
                    <Sparkles className="w-6 h-6 animate-spin-slow" />
                    {advantage === 'advantage' ? tr.rollAdvantage :
                        advantage === 'disadvantage' ? tr.rollDisadvantage :
                            tr.clickToRoll}
                    <Sparkles className="w-6 h-6 animate-spin-slow" />
                </button>

                {/* Dismiss — hidden for mandatory rolls (death save, concentration). */}
                {canDismiss && (
                    <button onClick={onDismiss} className="text-xs text-gray-500 hover:text-white underline opacity-50">
                        {tr.cancel}
                    </button>
                )}
            </div>
        </div>
    );
}
