import React, { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const TRANS = {
    en: { reaction: 'REACTION', accept: 'Cast Shield (+5 AC)', decline: 'Take the hit' },
    fr: { reaction: 'RÉACTION', accept: 'Lancer Bouclier (+5 CA)', decline: 'Encaisser le coup' },
} as const;

export interface ReactionRequest {
    title: string;
    detail: string;
    /** Seconds before auto-decline. */
    timeoutSeconds: number;
    onAnswer: (accepted: boolean) => void;
}

/**
 * Mid-enemy-turn reaction card (Shield). The enemy attack pauses for a few
 * seconds while the player decides; silence declines so combat never stalls.
 */
export function ReactionPrompt({ request }: { request: ReactionRequest }) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const [remaining, setRemaining] = useState(request.timeoutSeconds);

    useEffect(() => {
        setRemaining(request.timeoutSeconds);
        const interval = setInterval(() => setRemaining(prev => Math.max(0, prev - 0.1)), 100);
        return () => clearInterval(interval);
    }, [request]);

    const percent = Math.max(0, Math.min(100, (remaining / request.timeoutSeconds) * 100));

    return (
        <div className="fixed inset-x-0 bottom-32 z-[70] flex justify-center px-4 animate-fade-in pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-sky-400/60 bg-gradient-to-b from-slate-900 to-black p-4 shadow-xl">
                <div className="flex items-center gap-2 text-sky-300">
                    <Shield className="h-5 w-5 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.25em]">{tr.reaction}</span>
                </div>
                <div className="mt-1 font-bold text-white">{request.title}</div>
                <div className="mt-0.5 text-xs text-white/60">{request.detail}</div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-sky-400 transition-[width] duration-100" style={{ width: `${percent}%` }} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => request.onAnswer(true)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-black uppercase text-black transition hover:bg-sky-400"
                    >
                        <Shield className="h-4 w-4" /> {tr.accept}
                    </button>
                    <button
                        type="button"
                        onClick={() => request.onAnswer(false)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/40 py-2.5 text-sm font-bold uppercase text-white/70 transition hover:bg-white/10"
                    >
                        <X className="h-4 w-4" /> {tr.decline}
                    </button>
                </div>
            </div>
        </div>
    );
}
