import React, { useMemo, useState } from 'react';
import { Clock3, EyeOff, GitBranch, Map as MapIcon, Milestone, Route, ScrollText, ShieldAlert } from 'lucide-react';
import { AdventureManifest, CampaignRuntimeState } from '../types';
import { CampaignEvent } from '../services/persistence/campaignEventLog';
import { GameWindow, WindowTabs } from './GameWindow';
import { useGameStore } from '../store/gameStore';

type CampaignTab = 'spine' | 'branch' | 'state' | 'timeline';

const TRANS = {
    en: {
        tabSpine: 'Spine',
        tabBranch: 'Branch',
        tabState: 'State',
        tabTimeline: 'Timeline',
        windowTitle: 'Campaign Board',
        defaultSubtitle: 'Director state, branch plan, and campaign timeline',
        mainArc: 'Main Arc',
        villain: 'Villain',
        motivation: 'Motivation',
        currentChapter: 'Current Chapter',
        legacySave: 'Legacy save: parsed manifest metadata is not available.',
        noManifest: 'No adventure manifest loaded yet.',
        chapters: 'Chapters',
        active: 'active',
        noChapters: 'No structured chapters available.',
        activeBranch: 'Active Branch',
        min: 'min',
        noActiveBranch: 'No active side branch. The DM can call request_branch_plan when the player makes a major detour.',
        reconnectHooks: 'Reconnect Hooks',
        noReconnectHooks: 'No reconnect hooks planned.',
        branchHistory: 'Branch History',
        noBranchHistory: 'No branch history yet.',
        directorState: 'Director State',
        chapter: 'Chapter',
        scene: 'Scene',
        objective: 'Objective',
        auto: 'auto',
        none: 'none',
        protectedSecrets: 'Protected secrets',
        secretsHint: 'Hidden from this player-facing board, still available to the director context.',
        canonFacts: 'Canon Facts',
        noCanonFacts: 'No canon facts recorded yet.',
        worldClocks: 'World Clocks',
        noWorldClocks: 'No active world clocks.',
        recentEvents: 'Recent Campaign Events',
        noEvents: 'No campaign events recorded yet.',
    },
    fr: {
        tabSpine: 'Trame',
        tabBranch: 'Embranchement',
        tabState: 'État',
        tabTimeline: 'Chronologie',
        windowTitle: 'Tableau de campagne',
        defaultSubtitle: 'État du metteur en scène, plan d’embranchement et chronologie de la campagne',
        mainArc: 'Arc principal',
        villain: 'Antagoniste',
        motivation: 'Motivation',
        currentChapter: 'Chapitre en cours',
        legacySave: 'Sauvegarde héritée : les métadonnées du manifeste analysé ne sont pas disponibles.',
        noManifest: 'Aucun manifeste d’aventure chargé pour l’instant.',
        chapters: 'Chapitres',
        active: 'actif',
        noChapters: 'Aucun chapitre structuré disponible.',
        activeBranch: 'Embranchement actif',
        min: 'min',
        noActiveBranch: 'Aucun embranchement secondaire actif. Le MJ peut appeler request_branch_plan quand le joueur fait un détour majeur.',
        reconnectHooks: 'Accroches de reconnexion',
        noReconnectHooks: 'Aucune accroche de reconnexion prévue.',
        branchHistory: 'Historique des embranchements',
        noBranchHistory: 'Aucun historique d’embranchement pour l’instant.',
        directorState: 'État du metteur en scène',
        chapter: 'Chapitre',
        scene: 'Scène',
        objective: 'Objectif',
        auto: 'auto',
        none: 'aucun',
        protectedSecrets: 'Secrets protégés',
        secretsHint: 'Cachés de ce tableau visible par le joueur, mais toujours disponibles pour le contexte du metteur en scène.',
        canonFacts: 'Faits canoniques',
        noCanonFacts: 'Aucun fait canonique enregistré pour l’instant.',
        worldClocks: 'Horloges du monde',
        noWorldClocks: 'Aucune horloge du monde active.',
        recentEvents: 'Événements récents de la campagne',
        noEvents: 'Aucun événement de campagne enregistré pour l’instant.',
    },
} as const;

type Tr = typeof TRANS['en'] | typeof TRANS['fr'];

interface Props {
    manifest: AdventureManifest | null;
    manifestoText: string;
    runtime: CampaignRuntimeState;
    events: CampaignEvent[];
    onClose: () => void;
}

function trim(value: string | undefined | null, max = 180): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function currentChapter(manifest: AdventureManifest | null, runtime: CampaignRuntimeState) {
    if (!manifest?.chapters?.length) return null;
    return manifest.chapters.find(chapter => chapter.id === runtime.currentChapterId)
        || manifest.chapters.find(chapter => chapter.status === 'active')
        || manifest.chapters.find(chapter => chapter.status !== 'completed')
        || manifest.chapters[0];
}

function statusClass(status: string, active: boolean): string {
    if (active) return 'border-amber-400/40 bg-amber-400/10 text-amber-100';
    if (status === 'completed' || status === 'resolved') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200';
    if (status === 'abandoned') return 'border-red-400/20 bg-red-500/10 text-red-200';
    return 'border-white/10 bg-white/[0.03] text-white/70';
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-md border border-white/10 bg-black/25">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white/75">
                <span className="text-amber-300">{icon}</span>
                {title}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="rounded-md border border-dashed border-white/10 p-4 text-sm text-white/45">{text}</div>;
}

export function CampaignBoardPanel({ manifest, manifestoText, runtime, events, onClose }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const TABS: { id: CampaignTab; label: string }[] = [
        { id: 'spine', label: tr.tabSpine },
        { id: 'branch', label: tr.tabBranch },
        { id: 'state', label: tr.tabState },
        { id: 'timeline', label: tr.tabTimeline },
    ];
    const [tab, setTab] = useState<CampaignTab>('spine');
    const chapter = currentChapter(manifest, runtime);
    const filteredEvents = useMemo(
        () => events
            .filter(event => [
                'BRANCH_PLANNED',
                'CAMPAIGN_RUNTIME_UPDATED',
                'JOURNAL_UPDATED',
                'SCENE_CHANGED',
                'ENCOUNTER_STARTED',
                'ENCOUNTER_ENDED',
            ].includes(event.type))
            .slice(-30)
            .reverse(),
        [events]
    );

    return (
        <GameWindow
            title={tr.windowTitle}
            subtitle={runtime.currentObjective || chapter?.objective || tr.defaultSubtitle}
            icon={<Route className="h-5 w-5" />}
            onClose={onClose}
            size="xl"
            zIndex="z-[70]"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
        >
            <WindowTabs tabs={TABS} active={tab} onChange={setTab} />

            <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-zinc-950 to-black p-4 custom-scrollbar">
                {tab === 'spine' && (
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                        <Section title={tr.mainArc} icon={<Milestone className="h-4 w-4" />}>
                            {manifest ? (
                                <div className="space-y-4 text-sm text-white/70">
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-white/40">{tr.villain}</div>
                                        <div className="mt-1 text-lg font-bold text-white">{manifest.villain.name}</div>
                                        <p className="mt-1">{trim(manifest.villain.description, 320)}</p>
                                        {manifest.villain.motivation && <p className="mt-2 text-amber-100/70">{tr.motivation}: {trim(manifest.villain.motivation, 220)}</p>}
                                    </div>
                                    {chapter && (
                                        <div className="rounded-md border border-amber-400/20 bg-amber-400/10 p-3">
                                            <div className="text-xs uppercase tracking-wide text-amber-300/80">{tr.currentChapter}</div>
                                            <div className="mt-1 font-bold text-white">{chapter.title}</div>
                                            <p className="mt-1 text-white/65">{trim(runtime.currentObjective || chapter.objective, 260)}</p>
                                        </div>
                                    )}
                                </div>
                            ) : manifestoText ? (
                                <div className="space-y-2 text-sm text-white/65">
                                    <p>{trim(manifestoText, 900)}</p>
                                    <p className="text-xs text-white/35">{tr.legacySave}</p>
                                </div>
                            ) : (
                                <Empty text={tr.noManifest} />
                            )}
                        </Section>

                        <Section title={tr.chapters} icon={<MapIcon className="h-4 w-4" />}>
                            {manifest?.chapters?.length ? (
                                <div className="space-y-2">
                                    {manifest.chapters.map(item => {
                                        const active = item.id === chapter?.id;
                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-md border p-3 ${statusClass(item.status, active)}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 font-bold">{item.title}</div>
                                                    <div className="shrink-0 text-[10px] uppercase tracking-wide opacity-70">{active ? tr.active : item.status}</div>
                                                </div>
                                                <p className="mt-1 text-xs opacity-75">{trim(item.objective, 240)}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Empty text={tr.noChapters} />
                            )}
                        </Section>
                    </div>
                )}

                {tab === 'branch' && (
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <Section title={tr.activeBranch} icon={<GitBranch className="h-4 w-4" />}>
                            {runtime.activeBranch ? (
                                <div className="space-y-4 text-sm text-white/70">
                                    <div>
                                        <div className="text-xl font-bold text-white">{runtime.activeBranch.branchTitle}</div>
                                        <p className="mt-1">{runtime.activeBranch.purpose}</p>
                                        <div className="mt-2 text-xs uppercase tracking-wide text-amber-300/75">
                                            {runtime.activeBranch.status} - {runtime.activeBranch.estimatedPlayTimeMinutes} {tr.min}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {runtime.activeBranch.scenes.map(scene => (
                                            <div key={scene.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-bold text-white">{scene.location}</div>
                                                    <div className="text-[10px] uppercase tracking-wide text-white/40">{scene.type}</div>
                                                </div>
                                                <p className="mt-1 text-white/70">{scene.goal}</p>
                                                <p className="mt-2 text-xs text-white/45">{trim(scene.setup, 260)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Empty text={tr.noActiveBranch} />
                            )}
                        </Section>

                        <div className="space-y-4">
                            <Section title={tr.reconnectHooks} icon={<Route className="h-4 w-4" />}>
                                {runtime.activeBranch?.reconnectHooks?.length ? (
                                    <div className="space-y-2 text-sm">
                                        {runtime.activeBranch.reconnectHooks.map((hook, index) => (
                                            <div key={`${hook.type}-${index}`} className="rounded-md border border-white/10 bg-black/25 p-3">
                                                <div className="text-[10px] uppercase tracking-wide text-amber-300/75">{hook.type}</div>
                                                <div className="mt-1 text-white/70">{hook.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty text={tr.noReconnectHooks} />
                                )}
                            </Section>

                            <Section title={tr.branchHistory} icon={<ScrollText className="h-4 w-4" />}>
                                {runtime.branchHistory.length ? (
                                    <div className="space-y-2 text-sm">
                                        {runtime.branchHistory.slice(-8).reverse().map(branch => (
                                            <div key={branch.id || branch.branchTitle} className={`rounded-md border p-3 ${statusClass(branch.status, branch.id === runtime.activeBranch?.id)}`}>
                                                <div className="font-bold">{branch.branchTitle}</div>
                                                <div className="mt-1 text-xs opacity-70">{branch.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty text={tr.noBranchHistory} />
                                )}
                            </Section>
                        </div>
                    </div>
                )}

                {tab === 'state' && (
                    <div className="grid gap-4 lg:grid-cols-3">
                        <Section title={tr.directorState} icon={<ShieldAlert className="h-4 w-4" />}>
                            <div className="space-y-3 text-sm text-white/70">
                                <Info label={tr.chapter} value={runtime.currentChapterId || chapter?.id || tr.auto} />
                                <Info label={tr.scene} value={runtime.currentSceneId || tr.auto} />
                                <Info label={tr.objective} value={runtime.currentObjective || chapter?.objective || tr.none} />
                                <div className="rounded-md border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-white/45">
                                        <EyeOff className="h-4 w-4" />
                                        {tr.protectedSecrets}
                                    </div>
                                    <div className="mt-1 font-mono text-lg text-amber-200">{runtime.protectedSecrets.length}</div>
                                    <p className="mt-1 text-xs text-white/35">{tr.secretsHint}</p>
                                </div>
                            </div>
                        </Section>

                        <Section title={tr.canonFacts} icon={<ScrollText className="h-4 w-4" />}>
                            {runtime.canonFacts.length ? (
                                <ul className="space-y-2 text-sm text-white/70">
                                    {runtime.canonFacts.slice(-12).map((fact, index) => (
                                        <li key={`${fact}-${index}`} className="rounded-md border border-white/10 bg-white/[0.03] p-3">{fact}</li>
                                    ))}
                                </ul>
                            ) : (
                                <Empty text={tr.noCanonFacts} />
                            )}
                        </Section>

                        <Section title={tr.worldClocks} icon={<Clock3 className="h-4 w-4" />}>
                            {runtime.worldClocks.length ? (
                                <div className="space-y-3">
                                    {runtime.worldClocks.map(clock => {
                                        const percent = Math.max(0, Math.min(100, (clock.stage / Math.max(1, clock.maxStage)) * 100));
                                        return (
                                            <div key={clock.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                                                <div className="flex items-center justify-between gap-2 text-sm">
                                                    <div className="font-bold text-white">{clock.name}</div>
                                                    <div className="font-mono text-xs text-white/50">{clock.stage}/{clock.maxStage}</div>
                                                </div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                                    <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                                                </div>
                                                <p className="mt-2 text-xs text-white/55">{clock.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Empty text={tr.noWorldClocks} />
                            )}
                        </Section>
                    </div>
                )}

                {tab === 'timeline' && (
                    <Section title={tr.recentEvents} icon={<ScrollText className="h-4 w-4" />}>
                        {filteredEvents.length ? (
                            <div className="space-y-2">
                                {filteredEvents.map(event => (
                                    <div key={event.id} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-xs font-bold uppercase tracking-wide text-amber-300/75">{event.type}</div>
                                            <div className="text-xs text-white/35">{new Date(event.timestamp).toLocaleString()}</div>
                                        </div>
                                        <div className="mt-1 text-sm text-white/70">{event.summary}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty text={tr.noEvents} />
                        )}
                    </Section>
                )}
            </div>
        </GameWindow>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
            <div className="mt-1 text-sm text-white/75">{value}</div>
        </div>
    );
}
