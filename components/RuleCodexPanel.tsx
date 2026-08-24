import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, Shield, Swords, Wand2 } from 'lucide-react';
import { preloadCodexBestiary, searchCodex } from '../services/codexService';
import { formatCR } from '../data/bestiary';
import { CodexEntry, CodexEntryKind } from '../types';
import { GameWindow, WindowTabs } from './GameWindow';
import { useGameStore } from '../store/gameStore';

type CodexTab = 'spell' | 'rule' | 'item' | 'condition' | 'monster';

const TRANS = {
    en: {
        tabSpell: 'Spells',
        tabRule: 'Rules',
        tabItem: 'Items',
        tabCondition: 'Conditions',
        tabMonster: 'Monsters',
        windowTitle: 'SRD Codex',
        windowSubtitle: 'Rules, spells, items, conditions and bestiary references',
        searchPlaceholder: 'Search Codex',
        noEntry: 'No Codex entry found.',
        selectEntry: 'Select an entry.',
        cantrip: 'Cantrip',
        level: 'Level',
        condition: 'Condition',
        casting: 'Casting',
        range: 'Range',
        duration: 'Duration',
        components: 'Components',
        spellAttack: 'Spell attack',
        save: 'Save',
        success: 'success',
        damage: 'Damage',
        healing: 'Healing',
        castingAbility: 'casting ability',
        conditionOnFailure: 'Condition on failure',
        concentration: 'Concentration',
        movement: 'Movement',
        normal: 'normal',
        actions: 'Actions',
        type: 'Type',
        weight: 'Weight',
        ac: 'AC',
        properties: 'Properties',
        none: 'none',
        na: 'n/a',
        legacyEffect: 'Legacy effect',
        hp: 'HP',
        xp: 'XP',
        role: 'Role',
        size: 'Size',
        mechanics: 'Mechanics',
        viewReference: 'View reference',
    },
    fr: {
        tabSpell: 'Sorts',
        tabRule: 'Règles',
        tabItem: 'Objets',
        tabCondition: 'États',
        tabMonster: 'Monstres',
        windowTitle: 'Codex SRD',
        windowSubtitle: 'Règles, sorts, objets, états et références du bestiaire',
        searchPlaceholder: 'Rechercher dans le Codex',
        noEntry: 'Aucune entrée de Codex trouvée.',
        selectEntry: 'Sélectionne une entrée.',
        cantrip: 'Tour de magie',
        level: 'Niveau',
        condition: 'État',
        casting: 'Incantation',
        range: 'Portée',
        duration: 'Durée',
        components: 'Composantes',
        spellAttack: 'Attaque de sort',
        save: 'Sauvegarde',
        success: 'réussite',
        damage: 'Dégâts',
        healing: 'Soins',
        castingAbility: 'caractéristique d’incantation',
        conditionOnFailure: 'État en cas d’échec',
        concentration: 'Concentration',
        movement: 'Déplacement',
        normal: 'normal',
        actions: 'Actions',
        type: 'Type',
        weight: 'Poids',
        ac: 'CA',
        properties: 'Propriétés',
        none: 'aucune',
        na: 'n/a',
        legacyEffect: 'Effet hérité',
        hp: 'PV',
        xp: 'XP',
        role: 'Rôle',
        size: 'Taille',
        mechanics: 'Mécaniques',
        viewReference: 'Voir la référence',
    },
} as const;

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
            title={tr.windowTitle}
            subtitle={tr.windowSubtitle}
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
                                placeholder={tr.searchPlaceholder}
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
                                    <div className="truncate text-xs text-white/40">{entrySubtitle(entry, tr)}</div>
                                </div>
                            </button>
                        ))}
                        {!entries.length && (
                            <div className="rounded-md border border-white/10 p-4 text-sm text-white/45">{tr.noEntry}</div>
                        )}
                    </div>
                </aside>

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
                {entry.kind === 'monster' && entry.portrait && (
                    <img
                        src={entry.portrait}
                        alt={entry.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-20 w-20 rounded-md border border-white/15 object-cover"
                    />
                )}
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
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <Info label={tr.hp} value={`${entry.hp}${entry.hpDice ? ` (${entry.hpDice})` : ''}`} />
                            <Info label={tr.ac} value={String(entry.ac)} />
                            <Info label={tr.xp} value={String(entry.xp)} />
                            <Info label={tr.role} value={entry.role} />
                            <Info label={tr.size} value={entry.size} />
                            <Info label={tr.type} value={entry.type} />
                        </div>
                        <Mechanics tr={tr} items={entry.attacks.map(attack => `${attack.name}: +${attack.attackBonus}, ${attack.damage} ${attack.damageType}`)} />
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
