import React, { useEffect, useRef, useState } from 'react';
import { DICE_ANIM_MS, skipDice } from '../../services/media/diceTiming';
import { useGameStore } from '../../store/gameStore';

const TRANS = {
    en: {
        defaultReason: 'Check',
        rolling: 'Rolling...',
        dmRolled: 'DM Rolled',
        youRolled: 'You Rolled',
        success: '✓ SUCCESS',
        failure: '✗ FAILURE',
        dismiss: 'Click anywhere to dismiss',
    },
    fr: {
        defaultReason: 'Test',
        rolling: 'Lancer...',
        dmRolled: 'Le MJ a lancé',
        youRolled: 'Vous avez lancé',
        success: '✓ RÉUSSITE',
        failure: '✗ ÉCHEC',
        dismiss: 'Cliquez n\'importe où pour fermer',
    },
} as const;

interface Props {
    onComplete?: () => void;
    result?: number;
    reason?: string;
    isDM?: boolean;
    success?: boolean;
}

const SPIN_MS = 1000;

export function RollingDice({ onComplete, result = 20, reason, isDM = false, success }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const reasonText = reason ?? tr.defaultReason;
    const [stage, setStage] = useState<'rolling' | 'result'>('rolling');

    // Keep the latest onComplete in a ref so it is NOT an effect dependency.
    // Parents pass an inline arrow (new identity every render); as a dep, any
    // parent re-render mid-animation reset the spin and restarted the auto-dismiss
    // timer — the dice could spin forever or the overlay flicker. The animation
    // now restarts only when the roll itself (result/reason) changes.
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        // Cinematic spin, then reveal the result; auto-dismiss so the total
        // matches the combat wait (DICE_ANIM_MS). A click skips both the
        // overlay and the in-flight game wait (see dismiss()).
        setStage('rolling'); // replay the spin when a new roll reuses this component
        const spin = setTimeout(() => setStage('result'), SPIN_MS);
        const close = setTimeout(() => { onCompleteRef.current?.(); }, DICE_ANIM_MS);
        return () => { clearTimeout(spin); clearTimeout(close); };
    }, [result, reasonText]);

    // Clicking the overlay must advance the GAME (skip the pending dice wait),
    // not merely hide the dice — otherwise the turn still froze for the full
    // duration. skipDice() resolves the in-flight waitDice() immediately.
    const dismiss = () => {
        skipDice();
        onCompleteRef.current?.();
    };

    // Determine result color based on success
    const resultColor = success === true ? 'text-green-400'
        : success === false ? 'text-red-400'
            : result >= 20 ? 'text-gold'
                : result <= 1 ? 'text-red-500'
                    : 'text-white';

    const dieColor = isDM ? 'text-red-600' : 'text-blue-600';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer animate-fade-in"
            onClick={dismiss}
        >
            <div className="flex flex-col items-center gap-6 animate-scale-in">
                {/* Dice */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg
                        viewBox="0 0 100 100"
                        className={`w-full h-full ${dieColor} drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] ${stage === 'rolling' ? 'animate-spin' : 'animate-bounce'}`}
                    >
                        <path d="M50 5 L93 25 L93 75 L50 95 L7 75 L7 25 Z" fill="currentColor" stroke="white" strokeWidth="2" />
                        <path d="M50 5 L50 95 M7 25 L93 75 M93 25 L7 75" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
                    </svg>

                    {/* Result Number */}
                    {stage === 'result' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-7xl font-black ${resultColor} drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]`}>
                                {result}
                            </span>
                        </div>
                    )}
                </div>

                {/* Labels */}
                <div className="text-center">
                    <div className={`text-2xl font-fantasy font-bold uppercase tracking-widest ${isDM ? 'text-red-500' : 'text-blue-400'}`}>
                        {stage === 'rolling' ? tr.rolling : (isDM ? tr.dmRolled : tr.youRolled)}
                    </div>
                    <div className="text-white font-mono bg-black/50 px-4 py-2 rounded-lg mt-3 border border-gray-600 text-lg">
                        {reasonText}
                    </div>
                    {stage === 'result' && success !== undefined && (
                        <div className={`mt-3 text-xl font-bold uppercase tracking-widest ${success ? 'text-green-400' : 'text-red-400'}`}>
                            {success ? tr.success : tr.failure}
                        </div>
                    )}
                </div>

                {/* Click hint */}
                <div className="text-gray-500 text-xs opacity-50">{tr.dismiss}</div>
            </div>
        </div>
    );
}
