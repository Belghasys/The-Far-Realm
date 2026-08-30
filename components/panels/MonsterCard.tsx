/**
 * La carte de monstre — recto illustré 9:16, verso qui se retourne, fiche complète.
 *
 * Elle REMPLACE le cadre vers aidedd.org (2026-08-29). Tout ce qu'elle affiche
 * nous appartient : l'illustration (public/art/monsters, fabriquée par
 * tools/build_monster_cards.py), le lore (data/monsterLore, écrit à la main) et
 * les chiffres (SRD 5.1, CC-BY 4.0). Plus aucun appel vers l'extérieur, et la
 * carte s'affiche hors ligne.
 *
 * Le retournement est réservé au CODEX — on y flâne. En plein combat il masque
 * l'information au moment où on la cherche : le panneau de combat ouvre la
 * carte déjà tournée sur les chiffres (`initialFace="back"`).
 *
 * Le lore pèse 413 Ko et n'intéresse que celui qui ouvre une carte : il est
 * chargé À LA DEMANDE, jamais avec le bestiaire de combat.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getCreature, getMonsterAbilities, playableActions, formatCR, CreatureStats } from '../../data/bestiary';
import { getCreatureAttacks } from '../../engine/monsterAttacks';
import type { MonsterLore } from '../../data/monsterLore';
import { useGameStore } from '../../store/gameStore';

const T = {
    fr: {
        flip: 'Cliquer pour retourner', ac: 'CA', hp: 'PV', speed: 'Vitesse', xp: 'XP', cr: 'FP',
        traits: 'Capacités', actions: 'Actions', legendary: 'Actions légendaires', reactions: 'Réactions',
        unknown: 'Créature inconnue du bestiaire.', ft: 'm',
    },
    en: {
        flip: 'Click to flip', ac: 'AC', hp: 'HP', speed: 'Speed', xp: 'XP', cr: 'CR',
        traits: 'Traits', actions: 'Actions', legendary: 'Legendary actions', reactions: 'Reactions',
        unknown: 'Creature not found in the bestiary.', ft: 'ft',
    },
};

/** Pieds SRD → mètres, comme partout ailleurs dans le jeu (1 case = 1,50 m). */
const dist = (feet: number | undefined, fr: boolean) => feet == null ? '—' : fr ? `${Math.round(feet * 0.3 * 2) / 2} m` : `${feet} ft`;

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</div>
            <div className="text-sm font-semibold text-white/85">{value}</div>
        </div>
    );
}

function Block({ title, items }: { title: string; items: { name: string; desc: string }[] }) {
    if (!items.length) return null;
    return (
        <section className="space-y-2">
            <h4 className="text-xs uppercase tracking-[0.22em] text-amber-400/70">{title}</h4>
            {items.map((it, i) => (
                <p key={`${it.name}-${i}`} className="text-sm leading-relaxed text-white/70">
                    <span className="font-semibold text-white/90">{it.name}.</span> {it.desc}
                </p>
            ))}
        </section>
    );
}

export function MonsterCard({
    nameOrId,
    initialFace = 'front',
    className = '',
}: {
    /** Nom affiché OU clé SRD — getCreature accepte les deux, accents et numéros compris. */
    nameOrId: string;
    initialFace?: 'front' | 'back';
    className?: string;
}) {
    const language = useGameStore(s => s.language);
    const fr = language === 'fr';
    const t = fr ? T.fr : T.en;
    const creature: CreatureStats | null = useMemo(() => getCreature(nameOrId), [nameOrId]);
    const [flipped, setFlipped] = useState(initialFace === 'back');
    const [lore, setLore] = useState<MonsterLore | null>(null);

    // Chargement différé : le lore n'entre pas dans le paquet du combat.
    useEffect(() => {
        let alive = true;
        if (!creature) return;
        void import('../../data/monsterLore').then(m => { if (alive) setLore(m.MONSTER_LORE[creature.id] || null); });
        return () => { alive = false; };
    }, [creature]);

    if (!creature) return <div className="p-4 text-sm text-white/45">{t.unknown}</div>;

    const bloc = getMonsterAbilities(creature);
    const short = (fr ? lore?.shortFr : lore?.short) || '';
    const longLore = (fr ? lore?.loreFr : lore?.lore) || '';
    const attacks = getCreatureAttacks(creature);
    const src = creature.imageUrl || '';

    return (
        <div className={`flex flex-col gap-5 lg:flex-row ${className}`}>
            {/* ── La carte 9:16 ─────────────────────────────────────────────── */}
            <div className="mx-auto w-full max-w-[280px] shrink-0 lg:mx-0">
                <div
                    className="relative aspect-[9/16] cursor-pointer select-none [perspective:1200px]"
                    onClick={() => setFlipped(f => !f)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f); } }}
                    aria-label={creature.name}
                >
                    <div className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
                        {/* RECTO — l'illustration respire, le texte tient dans le dégradé */}
                        <div className="absolute inset-0 overflow-hidden rounded-lg border border-white/15 bg-zinc-900 shadow-2xl [backface-visibility:hidden]">
                            {src && (
                                <img
                                    src={src}
                                    srcSet={`${src} 1x, ${src.replace(/\.webp$/, '@2x.webp')} 2x`}
                                    alt={creature.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                                />
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-8">
                                <div className="font-fantasy text-lg font-bold leading-tight text-white">{creature.name}</div>
                                <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
                                    <span className="truncate text-white/55">{creature.size} {creature.type}</span>
                                    <span className="shrink-0 font-semibold text-amber-300">{t.cr} {formatCR(creature.cr)}</span>
                                </div>
                            </div>
                        </div>

                        {/* VERSO — la description courte et les trois chiffres du coup d'œil */}
                        <div className="absolute inset-0 flex flex-col rounded-lg border border-amber-400/25 bg-zinc-950 p-4 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                            <div className="border-b border-white/10 pb-2">
                                <div className="font-fantasy text-base font-bold leading-tight text-white">{creature.name}</div>
                                <div className="text-[11px] text-white/45">{creature.size} {creature.type} · {t.cr} {formatCR(creature.cr)}</div>
                            </div>
                            <p className="mt-3 flex-1 overflow-y-auto text-[13px] italic leading-relaxed text-white/75 custom-scrollbar">
                                {short || longLore.split('\n\n')[0]}
                            </p>
                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                <Stat label={t.ac} value={String(creature.ac)} />
                                <Stat label={t.hp} value={String(creature.hp.base)} />
                                <Stat label={t.speed} value={dist(creature.speed, fr)} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-center text-[11px] text-white/30">{t.flip}</div>
            </div>

            {/* ── La fiche complète ─────────────────────────────────────────── */}
            <div className="min-w-0 flex-1 space-y-5">
                {longLore && (
                    <p className="whitespace-pre-line text-[15px] italic leading-relaxed text-white/70">{longLore}</p>
                )}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label={t.ac} value={String(creature.ac)} />
                    <Stat label={t.hp} value={`${creature.hp.base}${creature.hp.dice ? ` (${creature.hp.dice})` : ''}`} />
                    <Stat label={t.speed} value={dist(creature.speed, fr)} />
                    <Stat label={t.xp} value={String(creature.xp)} />
                </div>

                <Block title={t.traits} items={(bloc?.traits || []).map(x => ({ name: x.name, desc: x.desc }))} />
                <Block
                    title={t.actions}
                    items={playableActions(bloc).map(a => ({ name: a.name, desc: a.desc }))
                        .concat(bloc ? [] : attacks.map((a: { name: string; attackBonus: number; damage: string; damageType?: string }) => ({ name: a.name, desc: `+${a.attackBonus}, ${a.damage} ${a.damageType || ''}`.trim() })))}
                />
                <Block title={t.reactions} items={(bloc?.reactions || []).map(x => ({ name: x.name, desc: x.desc }))} />

                <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/35">
                    {fr
                        ? 'Règles : SRD 5.1 (© Wizards of the Coast, CC-BY 4.0). Illustration et texte de description : The Last Basement.'
                        : 'Rules: SRD 5.1 (© Wizards of the Coast, CC-BY 4.0). Illustration and description: The Last Basement.'}
                </p>
            </div>
        </div>
    );
}
