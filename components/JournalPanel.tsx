import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, MapPin, Scroll, Users, ScrollText, Target, Skull, Compass, Images, Download, CheckCircle2, Circle } from 'lucide-react';
import { GameWindow, WindowTabs } from './GameWindow';
import { useGameStore } from '../store/gameStore';
import { usePortrait, npcPortraitKey, portraitPrompt } from '../services/media/portraitService';
import { galleryService, buildChronicleHtml, GalleryImage } from '../services/media/galleryService';

const TRANS = {
    en: {
        windowTitle: 'Adventure Journal',
        subtitle: (active: number, chronicle: number) => `${active} active quests / ${chronicle} chronicle entries`,
        tabPrologue: 'Prologue',
        tabQuests: 'Quests',
        tabPeople: 'NPCs',
        tabPlaces: 'Places',
        tabChronicle: 'Chronicle',
        noPrologue: 'No prologue recorded for this campaign.',
        objective: 'Objective',
        startingPoint: 'Starting point',
        theThreat: 'The threat',
        prologue: 'Prologue',
        adventureBeginning: 'Your adventure is only beginning.',
        statusActive: 'Active',
        statusCompleted: 'Completed',
        statusFailed: 'Failed',
        noNotableCharacter: 'No notable character recorded yet.',
        unknown: 'Unknown',
        noLocation: 'No discovered location yet.',
        chronicleEmpty: 'The chronicle will fill as the campaign unfolds.',
        new: 'New',
        tabGallery: 'Gallery',
        galleryEmpty: 'Generated scene images will collect here.',
        exportChronicle: 'Export the illustrated chronicle (HTML)',
        dayWord: 'Day',
    },
    fr: {
        windowTitle: 'Journal d’aventure',
        subtitle: (active: number, chronicle: number) => `${active} quêtes actives / ${chronicle} entrées de chronique`,
        tabPrologue: 'Prologue',
        tabQuests: 'Quêtes',
        tabPeople: 'PNJ',
        tabPlaces: 'Lieux',
        tabChronicle: 'Chronique',
        noPrologue: 'Aucun prologue enregistré pour cette campagne.',
        objective: 'Objectif',
        startingPoint: 'Point de départ',
        theThreat: 'La menace',
        prologue: 'Prologue',
        adventureBeginning: 'Ton aventure ne fait que commencer.',
        statusActive: 'Active',
        statusCompleted: 'Terminée',
        statusFailed: 'Échouée',
        noNotableCharacter: 'Aucun personnage notable enregistré pour l’instant.',
        unknown: 'Inconnu',
        noLocation: 'Aucun lieu découvert pour l’instant.',
        chronicleEmpty: 'La chronique se remplira au fil de la campagne.',
        new: 'Nouveau',
        tabGallery: 'Galerie',
        galleryEmpty: 'Les images de scène générées se rassembleront ici.',
        exportChronicle: 'Exporter la chronique illustrée (HTML)',
        dayWord: 'Jour',
    },
} as const;

type Tr = typeof TRANS['en'] | typeof TRANS['fr'];

export interface CampaignBriefing {
    prologue: string;
    objective?: string;
    threat?: string;
    location?: string;
}

export interface QuestStep {
    id: string;
    text: string;
    done: boolean;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'completed' | 'failed';
    steps?: QuestStep[];
}

export interface NPC {
    id: string;
    name: string;
    description: string;
    location: string;
    /**
     * Époque ms de la mise en scène par le MJ (add_npc / update_npc / open_shop).
     * Absent = fiche semée à la création, jamais encore rencontrée : le panneau
     * ne l'affiche pas.
     */
    lastSeenAt?: number;
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

type JournalTab = 'briefing' | 'quests' | 'people' | 'places' | 'chronicle' | 'gallery';

export function JournalPanel({ briefing, quests, npcs, locations = [], chronicle = [], onClose }: Props) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const hasBriefing = Boolean(briefing?.prologue);
    // The prologue is the "tenants et aboutissants" — open on it by default so the
    // player lands on the context instead of feeling catapulted into the story.
    const [activeTab, setActiveTab] = useState<JournalTab>(hasBriefing ? 'briefing' : 'quests');
    const activeQuests = quests.filter(quest => quest.status === 'active');

    // Le journal ne liste que les gens RENCONTRÉS. Quatre alliés de la campagne
    // et jusqu'à trois marchands sont semés dans le journal dès la création du
    // personnage (CharacterCreationView, règle NF3) : le MJ a besoin de les
    // connaître dans son contexte directeur, mais le joueur, lui, les
    // découvrait tous au tour un — accroches de quête comprises.
    // `lastSeenAt` n'est posé que par add_npc, update_npc et open_shop, c'est-à-dire
    // exactement quand le MJ met la personne en scène : il fait donc office de
    // « déjà croisé ». Les fiches semées gardent tout leur texte et
    // apparaissent intactes le jour de la rencontre.
    const metNpcs = npcs.filter(npc => Boolean(npc.lastSeenAt));

    // Chronique illustrée : images de scène archivées localement.
    const activeSaveId = useGameStore(s => s.activeSaveId);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    useEffect(() => {
        if (activeTab !== 'gallery') return;
        let active = true;
        void galleryService.listImages(activeSaveId || 'dev').then(images => { if (active) setGalleryImages(images); });
        return () => { active = false; };
    }, [activeTab, activeSaveId]);

    const tabs = [
        ...(hasBriefing ? [{ id: 'briefing' as const, label: tr.tabPrologue, count: 0 }] : []),
        { id: 'quests' as const, label: tr.tabQuests, count: activeQuests.length },
        { id: 'people' as const, label: tr.tabPeople, count: metNpcs.length },
        { id: 'places' as const, label: tr.tabPlaces, count: locations.length },
        { id: 'chronicle' as const, label: tr.tabChronicle, count: chronicle.length },
        { id: 'gallery' as const, label: tr.tabGallery, count: undefined as unknown as number },
    ];

    const handleExportChronicle = () => {
        const store = useGameStore.getState();
        const heroLine = store.character
            ? `${store.character.name} — ${store.character.race} ${store.character.class}, ${language === 'fr' ? 'niveau' : 'level'} ${store.character.level}`
            : '';
        const html = buildChronicleHtml({
            title: store.selectedAdventure || 'The Far Realm',
            heroLine,
            dayLine: `${tr.dayWord} ${store.campaignRuntime.dayCount || 1}`,
            prologue: briefing?.prologue,
            chronicle,
            images: galleryImages,
            language,
        });
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chronique-${(store.character?.name || 'hero').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    return (
        <GameWindow
            title={tr.windowTitle}
            subtitle={tr.subtitle(activeQuests.length, chronicle.length)}
            icon={<Scroll className="h-5 w-5" />}
            onClose={onClose}
            size="md"
            bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden"
        >
            <WindowTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'briefing' && <BriefingView briefing={briefing} tr={tr} />}
                {activeTab === 'quests' && <QuestList quests={quests} tr={tr} />}
                {activeTab === 'people' && <PeopleList npcs={metNpcs} tr={tr} />}
                {activeTab === 'places' && <PlaceList locations={locations} tr={tr} />}
                {activeTab === 'chronicle' && <ChronicleList entries={chronicle} tr={tr} />}
                {activeTab === 'gallery' && (
                    <GalleryView images={galleryImages} tr={tr} onExport={handleExportChronicle} />
                )}
            </div>
        </GameWindow>
    );
}

function BriefingView({ briefing, tr }: { briefing?: CampaignBriefing; tr: Tr }) {
    if (!briefing?.prologue) {
        return <EmptyState icon={<ScrollText className="h-8 w-8" />} text={tr.noPrologue} />;
    }
    return (
        <div className="space-y-3">
            {/* Headline cards: the stakes at a glance */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {briefing.objective && (
                    <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200"><Target className="h-3.5 w-3.5" /> {tr.objective}</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.objective}</p>
                    </div>
                )}
                {briefing.location && (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200"><Compass className="h-3.5 w-3.5" /> {tr.startingPoint}</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.location}</p>
                    </div>
                )}
                {briefing.threat && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 sm:col-span-2">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-200"><Skull className="h-3.5 w-3.5" /> {tr.theThreat}</div>
                        <p className="text-sm leading-relaxed text-white/75">{briefing.threat}</p>
                    </div>
                )}
            </div>

            {/* The prologue narrative */}
            <div className="rounded-md border border-purple-400/25 bg-purple-500/10 p-4">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-200"><ScrollText className="h-3.5 w-3.5" /> {tr.prologue}</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{briefing.prologue}</p>
            </div>
        </div>
    );
}

function QuestList({ quests, tr }: { quests: Quest[]; tr: Tr }) {
    const sorted = [
        ...quests.filter(quest => quest.status === 'active'),
        ...quests.filter(quest => quest.status === 'completed'),
        ...quests.filter(quest => quest.status === 'failed'),
    ];

    if (!sorted.length) {
        return <EmptyState icon={<Scroll className="h-8 w-8" />} text={tr.adventureBeginning} />;
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
                        <QuestBadge status={quest.status} tr={tr} />
                    </div>
                    <p className="text-sm leading-relaxed text-white/60">{quest.description}</p>
                    {/* Étapes cochables (update_quest_step) */}
                    {Boolean(quest.steps?.length) && (
                        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
                            {quest.steps!.map(step => (
                                <li key={step.id} className={`flex items-start gap-2 text-xs ${step.done ? 'text-emerald-300/80' : 'text-white/60'}`}>
                                    {step.done
                                        ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" />}
                                    <span className={step.done ? 'line-through' : ''}>{step.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}

function QuestBadge({ status, tr }: { status: Quest['status']; tr: Tr }) {
    const className = status === 'active'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : status === 'completed'
            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            : 'border-red-400/30 bg-red-400/10 text-red-200';

    return (
        <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${className}`}>
            {status === 'active' ? tr.statusActive : status === 'completed' ? tr.statusCompleted : tr.statusFailed}
        </span>
    );
}

function PeopleList({ npcs, tr }: { npcs: NPC[]; tr: Tr }) {
    if (!npcs.length) {
        return <EmptyState icon={<Users className="h-8 w-8" />} text={tr.noNotableCharacter} />;
    }

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {npcs.map(npc => <NpcCard key={npc.id} npc={npc} tr={tr} />)}
        </div>
    );
}

// Carte PNJ avec portrait généré (FLUX local, cache IndexedDB) — l'icône reste
// le fallback tant que le portrait n'existe pas / si les images sont coupées.
// Typé React.FC pour que JSX accepte l'attribut `key` (cf. CombatantRow).
const NpcCard: React.FC<{ npc: NPC; tr: Tr }> = ({ npc, tr }) => {
    const portraitUrl = usePortrait(npcPortraitKey(npc.name), portraitPrompt(npc.name, npc.description));
    return (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-start gap-3">
                {portraitUrl ? (
                    <img
                        src={portraitUrl}
                        alt={npc.name}
                        className="h-14 w-14 shrink-0 rounded-md border border-blue-400/25 object-cover shadow-lg"
                    />
                ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-500/10 text-blue-300">
                        <Users className="h-6 w-6" />
                    </div>
                )}
                <div className="min-w-0">
                    <h4 className="truncate font-bold text-blue-200">{npc.name}</h4>
                    <p className="mt-0.5 flex items-center gap-1 text-xs uppercase tracking-wide text-white/35">
                        <MapPin className="h-3 w-3" />
                        {npc.location || tr.unknown}
                    </p>
                </div>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{npc.description}</p>
        </div>
    );
};

// Galerie de la chronique illustrée + export HTML autonome.
function GalleryView({ images, tr, onExport }: { images: GalleryImage[]; tr: Tr; onExport: () => void }) {
    const [zoomed, setZoomed] = useState<GalleryImage | null>(null);
    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-200 hover:bg-amber-400/20"
            >
                <Download className="h-4 w-4" /> {tr.exportChronicle}
            </button>
            {!images.length ? (
                <EmptyState icon={<Images className="h-8 w-8" />} text={tr.galleryEmpty} />
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {images.map(image => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setZoomed(image)}
                            className="group overflow-hidden rounded-md border border-white/10 bg-black/30 text-left transition hover:border-amber-400/40"
                        >
                            <img src={image.dataUrl} alt={image.summary} loading="lazy" className="aspect-video w-full object-cover transition group-hover:scale-105" />
                            <div className="truncate px-2 py-1.5 text-[10px] text-white/45">{image.summary || image.phase}</div>
                        </button>
                    ))}
                </div>
            )}
            {zoomed && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoomed(null)}>
                    <div className="max-h-full max-w-4xl">
                        <img src={zoomed.dataUrl} alt={zoomed.summary} className="max-h-[80vh] w-auto rounded-md shadow-2xl" />
                        <p className="mt-2 text-center text-xs text-white/55">{zoomed.summary}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlaceList({ locations, tr }: { locations: Location[]; tr: Tr }) {
    if (!locations.length) {
        return <EmptyState icon={<MapPin className="h-8 w-8" />} text={tr.noLocation} />;
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

function ChronicleList({ entries, tr }: { entries: ChronicleEntry[]; tr: Tr }) {
    if (!entries.length) {
        return <EmptyState icon={<BookOpen className="h-8 w-8" />} text={tr.chronicleEmpty} />;
    }

    return (
        <div className="space-y-3">
            {[...entries].reverse().map((entry, index) => (
                <div key={entry.id} className="relative rounded-md border border-purple-400/20 bg-purple-500/10 p-4">
                    {index === 0 && (
                        <div className="absolute right-3 top-3 rounded bg-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                            {tr.new}
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
