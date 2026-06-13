import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, Shield, Swords, Wand2 } from 'lucide-react';
import { preloadCodexBestiary, searchCodex } from '../services/codexService';
import { CodexEntry, CodexEntryKind } from '../types';
import { GameWindow, WindowTabs } from './GameWindow';

type CodexTab = 'spell' | 'rule' | 'item' | 'condition' | 'monster';

const TABS: { id: CodexTab; label: string }[] = [
    { id: 'spell', label: 'Spells' },
    { id: 'rule', label: 'Rules' },
    { id: 'item', label: 'Items' },
    { id: 'condition', label: 'Conditions' },
    { id: 'monster', label: 'Monsters' },
];

function entrySubtitle(entry: CodexEntry): string {
    if (entry.kind === 'spell') return `${entry.level === 0 ? 'Cantrip' : `Level ${entry.level}`} - ${entry.school}`;
    if (entry.kind === 'rule') return entry.category;
    if (entry.kind === 'action') return entry.actionType.replace('_', ' ');
    if (entry.kind === 'item') return entry.itemType;
    if (entry.kind === 'condition') return 'Condition';
    return `CR ${entry.cr} - ${entry.type}`;
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

    const entries = useMemo(() => {
        if (tab === 'rule') {
            return [
                ...searchCodex('rule', query, 40),
                ...searchCodex('action' as CodexEntryKind, query, 20),
            ];
        }
        return searchCodex(tab, query, tab === 'monster' ? 80 : 60);
    }, [bestiaryReady, query, tab]);

    const selected = entries.find(entry => entry.id === selectedId) || entries[0];

    useEffect(() => {
        setSelectedId(entries[0]?.id || '');
    }, [tab, query, entries[0]?.id]);

    return (
        <GameWindow
            title="Codex SRD"
            subtitle="Rules, spells, items, conditions and bestiary references"
            icon={<BookOpen className="h-5 w-5" />}
            onClose={onClose}
            size="xl"
            zIndex="z-[70]"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
        >
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <aside className="flex max-h-[44vh] min-h-0 shrink-0 flex-col border-b border-white/10 bg-black/25 lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
                    <WindowTabs tabs={TABS} active={tab} onChange={setTab} />

                    <div className="border-b border-white/10 p-3">
                        <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white/60">
                            <Search className="h-4 w-4" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search Codex"
                                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                            />
                        </label>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {entries.map(entry => (
                            <button
                                key={`${entry.kind}-${entry.id}`}
                                type="button"
                                onClick={() => setSelectedId(entry.id)}
                                className={`mb-1 flex w-full items-center gap-3 rounded-md border p-2 text-left transition ${
                                    selected?.id === entry.id
                                        ? 'border-amber-400/40 bg-amber-500/15'
                                        : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]'
                                }`}
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-black/30 text-white/55">
                                    {entry.kind === 'spell' ? <Wand2 className="h-4 w-4" /> : entry.kind === 'monster' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-white/85">{entry.name}</div>
                                    <div className="truncate text-xs text-white/40">{entrySubtitle(entry)}</div>
                                </div>
                            </button>
                        ))}
                        {!entries.length && (
                            <div className="rounded-md border border-white/10 p-4 text-sm text-white/45">No Codex entry found.</div>
                        )}
                    </div>
                </aside>

                <div className="min-h-0 flex-1 bg-gradient-to-b from-zinc-950 to-black">
                    {selected ? <Detail entry={selected} onOpenExternalReference={onOpenExternalReference} /> : <div className="p-6 text-white/50">Select an entry.</div>}
                </div>
            </div>
        </GameWindow>
    );
}

function Detail({ entry, onOpenExternalReference }: { entry: CodexEntry; onOpenExternalReference?: (url: string) => void }) {
    return (
        <div className="h-full overflow-y-auto p-5 custom-scrollbar">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.24em] text-amber-400/70">{entry.kind}</div>
                    <h3 className="mt-1 text-2xl font-fantasy font-bold text-white">{entry.name}</h3>
                    <p className="text-sm text-white/50">{entrySubtitle(entry)}</p>
                </div>
                {entry.kind === 'monster' && entry.portrait && (
                    <img
                        src={entry.portrait}
                        alt={entry.name}
                        className="h-20 w-20 rounded-md border border-white/15 object-cover"
                    />
                )}
            </div>

            <div className="mt-4 space-y-4 text-sm text-white/75">
                {entry.kind === 'spell' && (
                    <>
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label="Casting" value={entry.castingTime} />
                            <Info label="Range" value={entry.range} />
                            <Info label="Duration" value={entry.duration} />
                            <Info label="Components" value={entry.components.join(', ')} />
                        </div>
                        <p>{entry.effectSummary}</p>
                        <Mechanics items={[
                            ...(entry.attack ? [`Spell attack: ${entry.attack.type}`] : []),
                            ...(entry.save ? [`Save: ${entry.save.ability}, success ${entry.save.effectOnSuccess}`] : []),
                            ...(entry.damage ? [`Damage: ${entry.damage.dice} ${entry.damage.type}`] : []),
                            ...(entry.healing ? [`Healing: ${entry.healing.dice}${entry.healing.abilityModifier ? ' + casting ability' : ''}`] : []),
                            ...(entry.condition ? [`Condition on failure: ${entry.condition}`] : []),
                            ...(entry.concentration ? ['Concentration'] : []),
                            ...(entry.mechanics || []),
                        ]} />
                    </>
                )}

                {(entry.kind === 'rule' || entry.kind === 'action') && (
                    <>
                        <p>{entry.kind === 'rule' ? entry.summary : entry.effectSummary}</p>
                        <Mechanics items={entry.mechanics} />
                    </>
                )}

                {entry.kind === 'condition' && (
                    <>
                        <p>{entry.summary}</p>
                        <Mechanics items={entry.effects} />
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label="Movement" value={entry.movement || 'normal'} />
                            <Info label="Actions" value={entry.actionRestrictions?.join(', ') || 'normal'} />
                        </div>
                    </>
                )}

                {entry.kind === 'item' && (
                    <>
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <Info label="Type" value={entry.itemType} />
                            <Info label="Weight" value={entry.weight !== undefined ? `${entry.weight} lb` : 'n/a'} />
                            <Info label="Damage" value={entry.damageDice ? `${entry.damageDice} ${entry.damageType}` : 'n/a'} />
                            <Info label="AC" value={entry.ac ? String(entry.ac) : entry.acBonus ? `+${entry.acBonus}` : 'n/a'} />
                            <Info label="Range" value={entry.range || 'n/a'} />
                            <Info label="Properties" value={entry.properties?.join(', ') || 'none'} />
                        </div>
                        {entry.effect && <p className="text-white/60">Legacy effect: {entry.effect}</p>}
                    </>
                )}

                {entry.kind === 'monster' && (
                    <>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <Info label="HP" value={`${entry.hp}${entry.hpDice ? ` (${entry.hpDice})` : ''}`} />
                            <Info label="AC" value={String(entry.ac)} />
                            <Info label="XP" value={String(entry.xp)} />
                            <Info label="Role" value={entry.role} />
                            <Info label="Size" value={entry.size} />
                            <Info label="Type" value={entry.type} />
                        </div>
                        <Mechanics items={entry.attacks.map(attack => `${attack.name}: +${attack.attackBonus}, ${attack.damage} ${attack.damageType}`)} />
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
                        Voir reference
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

function Mechanics({ items }: { items: string[] }) {
    if (!items.length) return null;
    return (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">
                <Swords className="h-3.5 w-3.5" />
                Mechanics
            </div>
            <ul className="space-y-1.5">
                {items.map((item, index) => (
                    <li key={`${item}-${index}`} className="leading-snug text-white/70">{item}</li>
                ))}
            </ul>
        </div>
    );
}
