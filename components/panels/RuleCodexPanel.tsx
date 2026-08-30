import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, Swords } from 'lucide-react';
import { preloadCodexBestiary, searchCodex } from '../../engine/codexService';
import { formatCR } from '../../data/bestiary';
import { CodexEntry, CodexEntryKind } from '../../types';
import { GameWindow, WindowTabs } from './GameWindow';
import { MonsterCard } from './MonsterCard';
import { useGameStore } from '../../store/gameStore';
import { RULE_CODEX_PANEL_TEXTS as TRANS } from './texts';

type CodexTab = 'spell' | 'rule' | 'item' | 'condition' | 'monster';

/** Le catalogue entier : voir la note sur `entries`. */
const SANS_PLAFOND = Number.POSITIVE_INFINITY;

type Tr = typeof TRANS['en'] | typeof TRANS['fr'];

function entrySubtitle(entry: CodexEntry, tr: Tr): string {
    if (entry.kind === 'spell') return `${entry.level === 0 ? tr.cantrip : `${tr.level} ${entry.level}`} - ${entry.school}`;
    if (entry.kind === 'rule') return entry.category;
    if (entry.kind === 'action') return entry.actionType.replace('_', ' ');
    if (entry.kind === 'item') return entry.itemType;
    if (entry.kind === 'condition') return tr.condition;
    return `CR ${formatCR(entry.cr)} - ${entry.type}`;
}

function sourceLine(entry: CodexEntry): string {
    return `${entry.source.sourceKind} - ${entry.source.license}`;
}

export function RuleCodexPanel({
    onClose,
    initialTab,
    initialQuery,
    onOpenExternalReference,
}: {
    onClose: () => void;
    initialTab?: CodexTab;
    initialQuery?: string;
    onOpenExternalReference?: (url: string) => void;
}) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const TABS: { id: CodexTab; label: string }[] = [
        { id: 'spell', label: tr.tabSpell },
        { id: 'rule', label: tr.tabRule },
        { id: 'item', label: tr.tabItem },
        { id: 'condition', label: tr.tabCondition },
        { id: 'monster', label: tr.tabMonster },
    ];
    const [tab, setTab] = useState<CodexTab>(initialTab || 'spell');
    const [query, setQuery] = useState(initialQuery || '');
    const [bestiaryReady, setBestiaryReady] = useState(false);
    const [selectedId, setSelectedId] = useState<string>('');

    useEffect(() => {
        if (initialTab) setTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (initialQuery !== undefined) setQuery(initialQuery);
    }, [initialQuery]);

    useEffect(() => {
        let alive = true;
        preloadCodexBestiary().then(() => {
            if (alive) setBestiaryReady(true);
        });
        return () => { alive = false; };
    }, []);

    // Le codex ne PLAFONNE pas : on vient y chercher une entrée précise, et un
    // catalogue amputé est pire qu'un catalogue lent. Les anciennes bornes (60,
    // 80) coupaient dans l'ordre du fichier : les 60 premiers sorts ne dépassent
    // pas le niveau 3, donc 54 sorts — TOUS les niveaux 4 à 9 — étaient
    // injoignables (vu à l'écran le 2026-08-30). Le plafond précédait la liste
    // déroulante ; celle-ci en a fait le seul moyen de parcourir, donc un trou.
    // `searchCodex` garde son paramètre pour l'outil du MJ, qui lui a besoin
    // d'une réponse courte.
    const entries = useMemo(() => {
        if (tab === 'rule') {
            return [
                ...searchCodex('rule', query, SANS_PLAFOND),
                ...searchCodex('action' as CodexEntryKind, query, SANS_PLAFOND),
            ];
        }
        return searchCodex(tab, query, SANS_PLAFOND);
    }, [bestiaryReady, query, tab]);

    const selected = entries.find(entry => entry.id === selectedId) || entries[0];

    useEffect(() => {
        setSelectedId(entries[0]?.id || '');
    }, [tab, query, entries[0]?.id]);

    return (
        <GameWindow
            title={tr.windowTitle}
            subtitle={tr.windowSubtitle}
            icon={<BookOpen className="h-5 w-5" />}
            onClose={onClose}
            size="xl"
            zIndex="z-[70]"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
        >
            {/* Une BARRE, plus une colonne. La liste défilante prenait 44 % de la
                hauteur sur téléphone : on cherchait une créature dans une lucarne,
                et la fiche — ce qu'on est venu lire — tenait dans le reste. La
                liste déroulante rend l'écran entier au contenu, et sur mobile
                elle ouvre le sélecteur natif du système, bien plus rapide à
                parcourir que 80 boutons empilés. */}
            <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-white/10 bg-black/25">
                    <WindowTabs tabs={TABS} active={tab} onChange={setTab} />

                    <div className="flex flex-col gap-2 p-3 sm:flex-row">
                        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white/60">
                            <Search className="h-4 w-4 shrink-0" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={tr.searchPlaceholder}
                                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                            />
                        </label>

                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {entries.length > 0 ? (
                                <select
                                    value={selected?.id || ''}
                                    onChange={(event) => setSelectedId(event.target.value)}
                                    aria-label={tr.selectEntry}
                                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/40"
                                >
                                    {entries.map(entry => (
                                        <option key={`${entry.kind}-${entry.id}`} value={entry.id}>
                                            {entry.name} — {entrySubtitle(entry, tr)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="flex-1 rounded-md border border-white/10 px-3 py-2 text-sm text-white/45">{tr.noEntry}</div>
                            )}
                            <span className="shrink-0 text-xs tabular-nums text-white/35">{entries.length}</span>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 bg-gradient-to-b from-zinc-950 to-black">
                    {selected ? <Detail entry={selected} onOpenExternalReference={onOpenExternalReference} tr={tr} /> : <div className="p-6 text-white/50">{tr.selectEntry}</div>}
                </div>
            </div>
        </GameWindow>
    );
}

function Detail({ entry, onOpenExternalReference, tr }: { entry: CodexEntry; onOpenExternalReference?: (url: string) => void; tr: Tr }) {
    return (
        <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.24em] text-amber-400/70">{entry.kind}</div>
                    <h3 className="mt-1 text-2xl font-fantasy font-bold text-white">{entry.name}</h3>
                    <p className="text-sm text-white/50">{entrySubtitle(entry, tr)}</p>
                </div>
            </div>

            <div className="mt-4 space-y-4 text-sm text-white/75">
                {entry.kind === 'spell' && (
                    <>
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label={tr.casting} value={entry.castingTime} />
                            <Info label={tr.range} value={entry.range} />
                            <Info label={tr.duration} value={entry.duration} />
                            <Info label={tr.components} value={entry.components.join(', ')} />
                        </div>
                        <p>{entry.effectSummary}</p>
                        <Mechanics tr={tr} items={[
                            ...(entry.attack ? [`${tr.spellAttack}: ${entry.attack.type}`] : []),
                            ...(entry.save ? [`${tr.save}: ${entry.save.ability}, ${tr.success} ${entry.save.effectOnSuccess}`] : []),
                            ...(entry.damage ? [`${tr.damage}: ${entry.damage.dice} ${entry.damage.type}`] : []),
                            ...(entry.healing ? [`${tr.healing}: ${entry.healing.dice}${entry.healing.abilityModifier ? ` + ${tr.castingAbility}` : ''}`] : []),
                            ...(entry.condition ? [`${tr.conditionOnFailure}: ${entry.condition}`] : []),
                            ...(entry.concentration ? [tr.concentration] : []),
                            ...(entry.mechanics || []),
                        ]} />
                    </>
                )}

                {(entry.kind === 'rule' || entry.kind === 'action') && (
                    <>
                        <p>{entry.kind === 'rule' ? entry.summary : entry.effectSummary}</p>
                        <Mechanics tr={tr} items={entry.mechanics} />
                    </>
                )}

                {entry.kind === 'condition' && (
                    <>
                        <p>{entry.summary}</p>
                        <Mechanics tr={tr} items={entry.effects} />
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label={tr.movement} value={entry.movement || tr.normal} />
                            <Info label={tr.actions} value={entry.actionRestrictions?.join(', ') || tr.normal} />
                        </div>
                    </>
                )}

                {entry.kind === 'item' && (
                    <>
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label={tr.type} value={entry.itemType} />
                            <Info label={tr.weight} value={entry.weight !== undefined ? `${entry.weight} lb` : tr.na} />
                            <Info label={tr.damage} value={entry.damageDice ? `${entry.damageDice} ${entry.damageType}` : tr.na} />
                            <Info label={tr.ac} value={entry.ac ? String(entry.ac) : entry.acBonus ? `+${entry.acBonus}` : tr.na} />
                            <Info label={tr.range} value={entry.range || tr.na} />
                            <Info label={tr.properties} value={entry.properties?.join(', ') || tr.none} />
                        </div>
                        {entry.effect && <p className="text-white/60">{tr.legacyEffect}: {entry.effect}</p>}
                    </>
                )}

                {entry.kind === 'monster' && (
                    <>
                        {/* La carte remplace la grille de chiffres : elle porte
                            l'illustration, le lore et la fiche complete. Le
                            ROLE tactique n'est pas dans le SRD — il reste ici. */}
                        <MonsterCard nameOrId={entry.id} />
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <Info label={tr.role} value={entry.role} />
                            <Info label={tr.size} value={entry.size} />
                            <Info label={tr.type} value={entry.type} />
                        </div>
                    </>
                )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/45">
                <div>{sourceLine(entry)}</div>
                <div className="mt-1">{entry.source.attribution}</div>
                {entry.source.sourceUrl && (
                    <button
                        type="button"
                        onClick={() => onOpenExternalReference ? onOpenExternalReference(entry.source.sourceUrl || '') : window.open(entry.source.sourceUrl, '_blank')}
                        className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-400/20 bg-blue-500/10 px-3 py-2 font-bold uppercase tracking-wide text-blue-300 hover:bg-blue-500/20 text-xs"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {tr.viewReference}
                    </button>
                )}
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/25 p-2">
            <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
            <div className="mt-0.5 font-mono text-white/80">{value}</div>
        </div>
    );
}

function Mechanics({ items, tr }: { items: string[]; tr: Tr }) {
    if (!items.length) return null;
    return (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">
                <Swords className="h-3.5 w-3.5" />
                {tr.mechanics}
            </div>
            <ul className="space-y-1.5">
                {items.map((item, index) => (
                    <li key={`${item}-${index}`} className="leading-snug text-white/70">{item}</li>
                ))}
            </ul>
        </div>
    );
}
