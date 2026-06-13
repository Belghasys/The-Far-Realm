import React, { useState } from 'react';
import { BookOpen, Clock, MapPin, Scroll, Users, ScrollText, Target, Skull, Compass } from 'lucide-react';
import { GameWindow, WindowTabs } from './GameWindow';

export interface CampaignBriefing {
    prologue: string;
    objective?: string;
    threat?: string;
    location?: string;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'completed' | 'failed';
}

export interface NPC {
    id: string;
    name: string;
    description: string;
    location: string;
}

export interface Location {
    id: string;
    name: string;
    description: string;
}

export interface ChronicleEntry {
    id: string;
    title: string;
    description: string;
    timestamp: number;
}

interface Props {
    briefing?: CampaignBriefing;
    quests: Quest[];
    npcs: NPC[];
    locations?: Location[];
    chronicle?: ChronicleEntry[];
    onClose: () => void;
}

type JournalTab = 'briefing' | 'quests' | 'people' | 'places' | 'chronicle';

export function JournalPanel({ briefing, quests, npcs, locations = [], chronicle = [], onClose }: Props) {
    const hasBriefing = Boolean(briefing?.prologue);
    // The prologue is the "tenants et aboutissants" — open on it by default so the
    // player lands on the context instead of feeling catapulted into the story.
    const [activeTab, setActiveTab] = useState<JournalTab>(hasBriefing ? 'briefing' : 'quests');
    const activeQuests = quests.filter(quest => quest.status === 'active');

    const tabs = [
        ...(hasBriefing ? [{ id: 'briefing' as const, label: 'Prologue', count: 0 }] : []),
        { id: 'quests' as const, label: 'Quêtes', count: activeQuests.length },
        { id: 'people' as const, label: 'PNJ', count: npcs.length },
        { id: 'places' as const, label: 'Lieux', count: locations.length },
        { id: 'chronicle' as const, label: 'Chronique', count: chronicle.length },
    ];

    return (
        <GameWindow
            title="Adventure Journal"
            subtitle={`${activeQuests.length} active quests / ${chronicle.length} chronicle entries`}
            icon={<Scroll className="h-5 w-5" />}
            onClose={onClose}
            size="md"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
        >
            <WindowTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'briefing' && <BriefingView briefing={briefing} />}
                {activeTab === 'quests' && <QuestList quests={quests} />}
                {activeTab === 'people' && <PeopleList npcs={npcs} />}
                {activeTab === 'places' && <PlaceList locations={locations} />}
                {activeTab === 'chronicle' && <ChronicleList entries={chronicle} />}
            </div>
        </GameWindow>
    );
}

function BriefingView({ briefing }: { briefing?: CampaignBriefing }) {
    if (!briefing?.prologue) {
        return <EmptyState icon={<ScrollText className="h-8 w-8" />} text="Aucun prologue enregistré pour cette campagne." />;
    }
    return (
        <div className="space-y-3">
            {/* Headline cards: the stakes at a glance */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {briefing.objective && (
                    <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"><Target className="h-3.5 w-3.5" /> Objectif</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.objective}</p>
                    </div>
                )}
                {briefing.location && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200"><Compass className="h-3.5 w-3.5" /> Point de départ</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.location}</p>
                    </div>
                )}
                {briefing.threat && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 sm:col-span-2">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-200"><Skull className="h-3.5 w-3.5" /> La menace</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.threat}</p>
                    </div>
                )}
            </div>

            {/* The prologue narrative */}
            <div className="rounded-md border border-purple-400/25 bg-purple-500/10 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-200"><ScrollText className="h-3.5 w-3.5" /> Prologue</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{briefing.prologue}</p>
            </div>
        </div>
    );
}

function QuestList({ quests }: { quests: Quest[] }) {
    const sorted = [
        ...quests.filter(quest => quest.status === 'active'),
        ...quests.filter(quest => quest.status === 'completed'),
        ...quests.filter(quest => quest.status === 'failed'),
    ];

    if (!sorted.length) {
        return <EmptyState icon={<Scroll className="h-8 w-8" />} text="Your adventure is only beginning." />;
    }

    return (
        <div className="space-y-3">
            {sorted.map(quest => (
                <div
                    key={quest.id}
                    className={`rounded-md border p-4 ${
                        quest.status === 'active'
                            ? 'border-amber-500/35 bg-amber-500/10'
                            : quest.status === 'completed'
                                ? 'border-emerald-500/25 bg-emerald-500/8 opacity-80'
                                : 'border-red-500/25 bg-red-500/8 opacity-70'
                    }`}
                >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <h3 className={`font-bold ${quest.status !== 'active' ? 'text-white/55 line-through' : 'text-white'}`}>{quest.title}</h3>
                        <QuestBadge status={quest.status} />
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">{quest.description}</p>
                </div>
            ))}
        </div>
    );
}

function QuestBadge({ status }: { status: Quest['status'] }) {
    const className = status === 'active'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : status === 'completed'
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            : 'border-red-400/30 bg-red-400/10 text-red-200';

    return (
        <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>
            {status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : 'Failed'}
        </span>
    );
}

function PeopleList({ npcs }: { npcs: NPC[] }) {
    if (!npcs.length) {
        return <EmptyState icon={<Users className="h-8 w-8" />} text="No notable character recorded yet." />;
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {npcs.map(npc => (
                <div key={npc.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-500/10 text-blue-300">
                            <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="truncate font-bold text-blue-200">{npc.name}</h4>
                            <p className="mt-0.5 flex items-center gap-1 text-xs uppercase tracking-wide text-white/35">
                                <MapPin className="h-3 w-3" />
                                {npc.location || 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">{npc.description}</p>
                </div>
            ))}
        </div>
    );
}

function PlaceList({ locations }: { locations: Location[] }) {
    if (!locations.length) {
        return <EmptyState icon={<MapPin className="h-8 w-8" />} text="No discovered location yet." />;
    }

    return (
        <div className="space-y-3">
            {locations.map(location => (
                <div key={location.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <h4 className="font-bold text-emerald-200">{location.name}</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">{location.description}</p>
                </div>
            ))}
        </div>
    );
}

function ChronicleList({ entries }: { entries: ChronicleEntry[] }) {
    if (!entries.length) {
        return <EmptyState icon={<BookOpen className="h-8 w-8" />} text="The chronicle will fill as the campaign unfolds." />;
    }

    return (
        <div className="space-y-3">
            {[...entries].reverse().map((entry, index) => (
                <div key={entry.id} className="relative rounded-md border border-purple-400/20 bg-purple-500/10 p-4">
                    {index === 0 && (
                        <div className="absolute right-3 top-3 rounded bg-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            New
                        </div>
                    )}
                    <h4 className="pr-12 font-bold text-purple-200">{entry.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">{entry.description}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-white/35">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.timestamp)}
                    </p>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="grid min-h-64 place-items-center rounded-md border border-white/10 bg-white/[0.03] p-6 text-center text-white/40">
            <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-black/20 text-white/35">
                    {icon}
                </div>
                <p className="text-sm">{text}</p>
            </div>
        </div>
    );
}

function formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
