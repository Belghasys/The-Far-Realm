import React from 'react';
import { Sparkles, Swords, X } from 'lucide-react';
import type { ProposedPlayerAction } from '../store/gameStore';

interface Props {
    proposals: ProposedPlayerAction[];
    disabled?: boolean;
    onConfirm: (p: ProposedPlayerAction) => void;
    onDecline: (p: ProposedPlayerAction) => void;
}

// Cost badge: a colored dot + label. Green = main action, amber = bonus,
// gray = free, blue = reaction. This is the "🟢 consomme action principale"
// indicator the player sees before triggering a DM-authored action.
const COST_BADGE: Record<ProposedPlayerAction['cost'], { label: string; dot: string; ring: string; text: string }> = {
    action: { label: 'Action principale', dot: 'bg-emerald-400', ring: 'border-emerald-500/50', text: 'text-emerald-300' },
    bonus_action: { label: 'Action bonus', dot: 'bg-amber-400', ring: 'border-amber-500/50', text: 'text-amber-300' },
    free: { label: 'Gratuit', dot: 'bg-zinc-300', ring: 'border-zinc-400/40', text: 'text-zinc-300' },
    reaction: { label: 'Réaction', dot: 'bg-sky-400', ring: 'border-sky-500/50', text: 'text-sky-300' },
};

// Human-readable summary of what the card will roll, built from the DM's spec.
function describeProposal(p: ProposedPlayerAction): string {
    const dmg = p.damageFormula ? `${p.damageFormula}${p.damageType ? ` ${p.damageType}` : ''}` : '';
    const adv = p.advantage && p.advantage !== 'normal' ? `(${p.advantage === 'advantage' ? 'avantage' : 'désavantage'})` : '';
    switch (p.resolution) {
        case 'attack':
            return [`Jet d'attaque${p.attackBonus != null ? ` ${p.attackBonus >= 0 ? '+' : ''}${p.attackBonus}` : ''}`, p.target ? `→ ${p.target}` : '', dmg ? `· ${dmg}` : '', adv].filter(Boolean).join(' ');
        case 'save':
            return [`Sauvegarde ${p.saveAbility || 'DEX'} DC ${p.dc ?? 13}`, p.target ? `→ ${p.target}` : '', dmg ? `· ${dmg} si échec` : '', p.condition ? `· ${p.condition}` : ''].filter(Boolean).join(' ');
        case 'check':
            return [`Test ${p.checkAbility || 'FOR'} DC ${p.dc ?? 13}`, dmg ? `· ${dmg}` : '', p.condition ? `· ${p.condition}` : '', adv].filter(Boolean).join(' ');
        case 'auto':
            return ['Succès automatique', p.target ? `→ ${p.target}` : '', dmg ? `· ${dmg}` : '', p.condition ? `· ${p.condition}` : ''].filter(Boolean).join(' ');
        case 'effect':
            return p.selfModifier
                ? `Effet : ${p.selfModifier.bonus ? `${p.selfModifier.bonus > 0 ? '+' : ''}${p.selfModifier.bonus} ` : ''}${p.selfModifier.mode && p.selfModifier.mode !== 'normal' ? `${p.selfModifier.mode} ` : ''}(${p.selfModifier.scope || 'attaque'}, ${p.selfModifier.uses ?? 1}×)`
                : 'Effet appliqué';
        default:
            return '';
    }
}

export function ProposedActionPrompt({ proposals, disabled = false, onConfirm, onDecline }: Props) {
    if (!proposals.length) return null;

    return (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-md flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 text-amber-300">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <h3 className="text-lg font-fantasy uppercase tracking-widest">Action improvisée</h3>
                </div>

                {proposals.map((p) => {
                    const badge = COST_BADGE[p.cost] || COST_BADGE.action;
                    return (
                        <div
                            key={p.id}
                            className={`rounded-2xl border-2 ${badge.ring} bg-gradient-to-b from-gray-900 to-black p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-scale-in`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-white text-lg font-bold leading-tight">{p.label}</div>
                                    {p.description && <div className="mt-0.5 text-xs text-white/60">{p.description}</div>}
                                </div>
                                <div className={`flex shrink-0 items-center gap-1.5 rounded-full border ${badge.ring} bg-black/40 px-2.5 py-1 text-[11px] font-bold ${badge.text}`}>
                                    <span className={`h-2.5 w-2.5 rounded-full ${badge.dot}`} />
                                    {badge.label}
                                </div>
                            </div>

                            <div className="mt-2 font-mono text-xs text-gray-400">{describeProposal(p)}</div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onConfirm(p)}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 py-2.5 text-sm font-bold uppercase text-black transition hover:from-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Swords className="h-4 w-4" /> {disabled ? 'Résolution…' : 'Confirmer'}
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onDecline(p)}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/40 py-2.5 text-sm font-bold uppercase text-white/70 transition hover:bg-white/5 disabled:opacity-50"
                                >
                                    <X className="h-4 w-4" /> Annuler
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
