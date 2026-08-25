/**
 * Les trois contrôles du HUD de partie : la porte de la barre du bas, le
 * bouton d'action de l'en-tête, la jauge.
 *
 * Extraits de GameSession.tsx le 2026-08-25 — ils vivaient en pied d'un
 * fichier de 5 500 lignes, après le composant qui les emploie. Purs et sans
 * état : les couleurs viennent du thème (tailwind.config.js), pas d'ici.
 */
import React from 'react';

export function NavButton({ icon, label, onClick, active, danger }: {
    icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`group flex h-14 w-[4.35rem] flex-col items-center justify-center gap-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition
           ${active ? 'border-amber-400/40 bg-amber-400/15 text-gold' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/10 hover:text-white'}
           ${danger ? 'hover:border-red-400/40 hover:text-red-300' : ''}
        `}
        >
            <div className="flex h-6 items-center justify-center">
                {icon}
            </div>
            <span className="max-w-full truncate px-1 opacity-80 group-hover:opacity-100">{label}</span>
        </button>
    );
}

export function HeaderActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-zinc-950/75 px-3 text-xs font-bold uppercase tracking-wide text-white/60 shadow-lg backdrop-blur-xl transition hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-100"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

export function HudMeter({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: 'red' | 'gold' }) {
    const fill = tone === 'red' ? 'bg-red-600' : 'bg-amber-400';
    const text = tone === 'red' ? 'text-red-300' : 'text-amber-200';

    return (
        <div className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-2">
            <div className={`mb-1 flex justify-between gap-2 text-[10px] font-bold uppercase tracking-wide ${text}`}>
                <span className="truncate">{label}</span>
                <span className="shrink-0 font-mono">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                <div className={`h-full transition-all ${fill}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
            </div>
        </div>
    );
}
