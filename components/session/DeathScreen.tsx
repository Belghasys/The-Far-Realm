import React from 'react';
import { Skull, Sparkles, LogOut } from 'lucide-react';
import { CharacterSheet } from '../../types';
import { useGameStore } from '../../store/gameStore';

const TRANS = {
    en: {
        fallen: 'YOU HAVE FALLEN',
        line: (name: string) => `${name} has succumbed to their wounds. Three death saves failed — the darkness closes in.`,
        resurrect: 'A miracle... at a price',
        resurrectDesc: (gold: number) => `Fate is not done with you. You come back to life with 1 HP — but half your gold (${gold} gp) is claimed by the debt, and you carry a Scar of Destiny forever.`,
        resurrectBtn: 'Accept the pact (revive at 1 HP)',
        end: 'Let the story end',
        endDesc: 'Accept death. Leave this campaign — your saga ends here.',
        endBtn: 'Accept death (back to menu)',
    },
    fr: {
        fallen: 'TU ES TOMBÉ',
        line: (name: string) => `${name} a succombé à ses blessures. Trois jets de mort ratés — les ténèbres se referment.`,
        resurrect: 'Un miracle… à un prix',
        resurrectDesc: (gold: number) => `Le destin n'en a pas fini avec toi. Tu reviens à la vie avec 1 PV — mais la moitié de ton or (${gold} po) est réclamée par la dette, et tu porteras à jamais une Cicatrice du destin.`,
        resurrectBtn: 'Accepter le pacte (revenir à 1 PV)',
        end: "Laisser l'histoire se terminer",
        endDesc: 'Accepter la mort. Quitter cette campagne — ta saga se termine ici.',
        endBtn: 'Accepter la mort (retour au menu)',
    },
} as const;

interface Props {
    character: CharacterSheet;
    onResurrect: () => void;
    onEndCampaign: () => void;
}

/**
 * Full-screen death sequence shown when 3 death saves have failed
 * (deathSaves.isDead). Before this, death set a flag and… nothing happened.
 */
export function DeathScreen({ character, onResurrect, onEndCampaign }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const goldCost = Math.floor((character.gold || 0) / 2);

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 p-4 animate-fade-in">
            <div className="w-full max-w-lg text-center">
                <Skull className="mx-auto mb-4 h-20 w-20 text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.6)]" />
                <h1 className="font-fantasy text-4xl font-black tracking-widest text-red-500">{tr.fallen}</h1>
                <p className="mx-auto mt-3 max-w-md font-serif text-sm leading-relaxed text-white/60">
                    {tr.line(character.name)}
                </p>

                <div className="mt-8 space-y-4">
                    <div className="rounded-md border border-amber-500/40 bg-amber-950/30 p-4 text-left">
                        <div className="mb-1 flex items-center gap-2 font-bold text-amber-300">
                            <Sparkles className="h-4 w-4" /> {tr.resurrect}
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-white/55">{tr.resurrectDesc(goldCost)}</p>
                        <button
                            type="button"
                            onClick={onResurrect}
                            className="w-full rounded-md bg-amber-500 py-2.5 text-sm font-black uppercase tracking-wide text-black transition hover:bg-amber-400"
                        >
                            {tr.resurrectBtn}
                        </button>
                    </div>

                    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-left">
                        <div className="mb-1 flex items-center gap-2 font-bold text-white/70">
                            <LogOut className="h-4 w-4" /> {tr.end}
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-white/45">{tr.endDesc}</p>
                        <button
                            type="button"
                            onClick={onEndCampaign}
                            className="w-full rounded-md border border-white/15 bg-black/40 py-2.5 text-sm font-bold uppercase tracking-wide text-white/70 transition hover:bg-white/10"
                        >
                            {tr.endBtn}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
