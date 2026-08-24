import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, MessageCircle, Send, Mail, ArrowRight, Book, PenLine, Layers, Clock, Gauge } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/gameStore';
import { MenuMusicToggle } from '../components/MenuMusicToggle';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { ADVENTURES as ADVENTURE_OPTIONS, localizeAdventure, type AdventureDifficulty, type LocalizedAdventure } from '../data/adventures';

const TRANS = {
    en: {
        back: "Back",
        selectAdventure: "Select Your Adventure",
        shareCode: "Share Session Code",
        inviteFriends: "Invite your friends to join your adventure!",
        selected: "Selected",
        continueExisting: "Continue Existing Adventure",
        createCharacter: "Create Character",
        saveCorrupted: "Save data is corrupted. Please create a new character.",
        noSaves: "No saved games found. Create a new hero!",
        loadFailed: "Failed to load: ",
        authored: "Hand-written campaign",
        generated: "Improvised by the DM",
        levels: "Levels",
        chapters: "chapters",
        acts: "acts",
        sessions: "sessions",
        difficulty: "Demand",
        gentle: "Forgiving",
        standard: "Standard",
        harsh: "Punishing",
        sectionAuthored: "Original campaigns",
        sectionAuthoredSub: "Written chapter by chapter for this game. The DM follows a real plot — named characters who remember you, planted secrets, an ending that was decided in advance. It does not make it up as it goes.",
        sectionClassics: "The great classics",
        sectionClassicsSub: "The archetypes of the genre: the haunted mine, the city of intrigue, the endless dungeon. Here the DM receives a premise and builds the story around your choices — no two runs are alike.",
    },
    fr: {
        back: "Retour",
        selectAdventure: "Choisissez Votre Aventure",
        shareCode: "Partager le Code de Session",
        inviteFriends: "Invitez vos amis à rejoindre votre aventure !",
        selected: "Sélectionné",
        continueExisting: "Continuer une Aventure Existante",
        createCharacter: "Créer un Personnage",
        saveCorrupted: "Les données de sauvegarde sont corrompues. Veuillez créer un nouveau personnage.",
        noSaves: "Aucune partie sauvegardée trouvée. Créez un nouveau héros !",
        loadFailed: "Échec du chargement : ",
        authored: "Campagne d'auteur",
        generated: "Improvisée par le MJ",
        levels: "Niveaux",
        chapters: "chapitres",
        acts: "actes",
        sessions: "séances",
        difficulty: "Exigence",
        gentle: "Indulgente",
        standard: "Standard",
        harsh: "Impitoyable",
        sectionAuthored: "Campagnes d'auteur",
        sectionAuthoredSub: "Écrites chapitre par chapitre pour ce jeu. Le MJ suit une vraie trame — des personnages nommés qui se souviennent de vous, des secrets posés à l'avance, une fin déjà décidée. Il n'invente pas au fil de la partie.",
        sectionClassics: "Les grands classiques",
        sectionClassicsSub: "Les archétypes du genre : la mine hantée, la cité en intrigue, le donjon sans fin. Ici le MJ reçoit une prémisse et bâtit l'histoire autour de vos choix — deux parties ne se ressemblent jamais.",
    },
} as const;

/** Un seul accent de couleur par niveau d'exigence — lisible en un coup d'œil. */
const DIFFICULTY_TONE: Record<AdventureDifficulty, string> = {
    gentle: 'text-emerald-400',
    standard: 'text-gray-300',
    harsh: 'text-red-400',
};

type Labels = typeof TRANS['fr'] | typeof TRANS['en'];

/** Ligne « icône · libellé · valeur » du pied de carte. */
function Fact({ icon, label, value, tone = 'text-gray-300' }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: string;
}) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-600 shrink-0">{icon}</span>
            {label && <span className="text-gray-500 shrink-0">{label}</span>}
            <span className={`font-semibold truncate ${tone}`}>{value}</span>
        </div>
    );
}

/** En-tête d'une famille de campagnes + sa grille. */
function AdventureSection({ icon, title, subtitle, accent, rule, children }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    accent: string;
    rule: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-12 last:mb-0">
            <div className={`flex items-center gap-3 pb-3 mb-3 border-b ${rule}`}>
                {icon}
                <h2 className={`text-xl font-fantasy tracking-wide ${accent}`}>{title}</h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-3xl">{subtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
        </section>
    );
}

function AdventureCard({ adv, tr, picked, onPick }: {
    adv: LocalizedAdventure;
    tr: Labels;
    picked: boolean;
    onPick: () => void;
}) {
    // Les campagnes d'auteur gardent un liseré or au repos : la distinction
    // reste lisible même quand on a fait défiler loin de l'en-tête de section.
    const idle = adv.authored
        ? 'border-gold/30 bg-gray-800 hover:border-gold/60'
        : 'border-gray-700 bg-gray-800 hover:border-gray-500';

    return (
        <div
            onClick={onPick}
            className={`cursor-pointer p-6 rounded-lg border-2 transition-all hover:scale-[1.02] flex flex-col ${picked ? 'border-red-600 bg-red-900/20 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : idle}`}
        >
            <div className="flex justify-between items-start mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {adv.authored
                        ? <PenLine className={`w-8 h-8 shrink-0 ${picked ? 'text-red-500' : 'text-gold/70'}`} />
                        : <Book className={`w-8 h-8 shrink-0 ${picked ? 'text-red-500' : 'text-gray-500'}`} />}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${adv.authored ? 'text-gold/80' : 'text-gray-500'}`}>
                        {adv.authored ? tr.authored : tr.generated}
                    </span>
                </div>
                {picked && <div className="bg-red-600 text-xs px-2 py-1 rounded font-bold uppercase shrink-0">{tr.selected}</div>}
            </div>

            <h3 className="text-2xl font-bold font-fantasy mb-1">{adv.title}</h3>
            <p className="text-gray-300 font-serif leading-relaxed text-sm mb-3">{adv.desc}</p>

            <p className="text-gray-500 font-serif italic text-xs leading-relaxed mb-3">{adv.lore}</p>
            <p className="text-gray-400 font-serif text-[13px] leading-relaxed mb-4">{adv.premise}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
                {adv.tags.map(tag => (
                    <span key={tag} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded border border-gray-600 text-gray-400">
                        {tag}
                    </span>
                ))}
            </div>

            {/* Les quatre chiffres qui font vraiment choisir. */}
            <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-gray-700/70 text-xs">
                <Fact icon={<Gauge className="w-3.5 h-3.5" />} label={tr.levels} value={`${adv.minLevel}–${adv.maxLevel}`} />
                <Fact icon={<Clock className="w-3.5 h-3.5" />} label={tr.sessions} value={adv.sessions} />
                <Fact
                    icon={<Layers className="w-3.5 h-3.5" />}
                    label={tr.difficulty}
                    value={tr[adv.difficulty]}
                    tone={DIFFICULTY_TONE[adv.difficulty]}
                />
                {adv.chapters !== undefined && (
                    <Fact
                        icon={<Book className="w-3.5 h-3.5" />}
                        label=""
                        value={adv.acts
                            ? `${adv.chapters} ${tr.chapters} · ${adv.acts} ${tr.acts}`
                            : `${adv.chapters} ${tr.chapters}`}
                    />
                )}
            </div>
        </div>
    );
}

export function LobbyView() {
    const navigate = useNavigate();
    const { user, gameMode, sessionId, isHost, selectedAdventure, setSelectedAdventure, setActiveSaveId, loadSaveState, language } = useGameStore();
    const tr = TRANS[language];

    // Une seule passe de localisation, puis on scinde par famille.
    const localized = ADVENTURE_OPTIONS.map(option => localizeAdventure(option, language));
    const authored = localized.filter(a => a.authored);
    const classics = localized.filter(a => !a.authored);

    const shareUrl = `${window.location.origin}?session=${sessionId}`;

    const handleContinueLatest = async () => {
        if (!user) return;
        try {
            const saves = await saveService.listSaves(1);
            if (saves.length > 0) {
                const mostRecentSave = saves[0];
                const fullSave = await saveService.loadGame(mostRecentSave.id);
                if (fullSave && fullSave.character) {
                    loadSaveState(fullSave);
                    memoryManager.setSaveId(mostRecentSave.id);
                    memoryManager.importFromSave({ transcript: fullSave.transcript || [], combat: fullSave.combat });
                    campaignEventLog.setCampaignId(mostRecentSave.id);
                    campaignEventLog.import(fullSave.events);
                    setActiveSaveId(mostRecentSave.id);
                    saveService.setCurrentSave(mostRecentSave.id);
                    navigate('/session');
                } else {
                    alert(tr.saveCorrupted);
                }
            } else {
                alert(tr.noSaves);
            }
        } catch (e: any) {
            console.error("Load Error:", e);
            alert(tr.loadFailed + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <button
                        onClick={() => navigate('/mode')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        <span>{tr.back}</span>
                    </button>
                    <MenuMusicToggle />
                </div>

                <h1 className="text-4xl font-fantasy text-gold mb-8 border-b border-gray-700 pb-4">{tr.selectAdventure}</h1>

                {isHost && gameMode === 'multiplayer' && (
                    <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-blue-700 text-center">
                        <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center justify-center gap-2">
                            <Share2 className="w-6 h-6" /> {tr.shareCode}
                        </h2>
                        <p className="text-gray-300 mb-4">{tr.inviteFriends}</p>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG value={shareUrl} size={128} fgColor="#000000" />
                            </div>
                            <p className="text-3xl font-mono text-gold tracking-widest bg-gray-900 px-6 py-3 rounded-lg border border-gold">
                                {sessionId}
                            </p>
                            <div className="flex gap-4 mt-4">
                                <a href={`whatsapp://send?text=Join my Dungeon AI game! Use code: ${sessionId} or click: ${shareUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    <MessageCircle className="w-5 h-5" /> WhatsApp
                                </a>
                                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Join my Dungeon AI game! Code: " + sessionId)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                                    <Send className="w-5 h-5" /> Telegram
                                </a>
                                <a href={`mailto:?subject=Join my Dungeon AI game!&body=Hey! I'm hosting a Dungeon AI game. Use code: ${sessionId} or click this link to join: ${shareUrl}`} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                                    <Mail className="w-5 h-5" /> Email
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Deux familles de produits, pas deux étiquettes sur la même
                    grille : une campagne écrite chapitre par chapitre et une
                    prémisse improvisée par le MJ ne se choisissent pas de la
                    même façon. Les campagnes d'auteur passent en premier. */}
                <AdventureSection
                    icon={<PenLine className="w-5 h-5 text-gold" />}
                    title={tr.sectionAuthored}
                    subtitle={tr.sectionAuthoredSub}
                    accent="text-gold"
                    rule="border-gold/30"
                >
                    {authored.map(adv => (
                        <AdventureCard
                            key={adv.id}
                            adv={adv}
                            tr={tr}
                            picked={selectedAdventure === adv.id}
                            onPick={() => setSelectedAdventure(adv.id)}
                        />
                    ))}
                </AdventureSection>

                <AdventureSection
                    icon={<Book className="w-5 h-5 text-gray-400" />}
                    title={tr.sectionClassics}
                    subtitle={tr.sectionClassicsSub}
                    accent="text-gray-300"
                    rule="border-gray-700"
                >
                    {classics.map(adv => (
                        <AdventureCard
                            key={adv.id}
                            adv={adv}
                            tr={tr}
                            picked={selectedAdventure === adv.id}
                            onPick={() => setSelectedAdventure(adv.id)}
                        />
                    ))}
                </AdventureSection>

                <div className="mt-12 flex justify-between items-center">
                    <button onClick={handleContinueLatest} className="text-gray-400 hover:text-white underline">
                        {tr.continueExisting}
                    </button>

                    <button
                        disabled={!selectedAdventure}
                        onClick={() => navigate('/create')}
                        className="bg-gold text-black font-bold text-xl px-12 py-4 rounded hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-fantasy transition-transform hover:translate-x-2"
                    >
                        {tr.createCharacter} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
