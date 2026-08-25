/**
 * Choix de la campagne.
 *
 * Deux familles de produits, pas deux étiquettes sur la même grille : une
 * campagne écrite chapitre par chapitre et une prémisse improvisée par le MJ ne
 * se choisissent pas de la même façon. Chaque famille porte donc sa propre
 * couverture d'en-tête — la plume pour l'écrit, les dés jetés dans la nébuleuse
 * pour l'improvisé — et chaque campagne la sienne.
 *
 * La logique est celle d'avant, au caractère près : sélection, reprise de la
 * dernière partie avec son recâblage complet, et le verrou qui interdit de
 * créer un personnage sans avoir choisi d'aventure.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, MessageCircle, Send, Mail, Layers, Clock, Gauge, Book } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useGameStore } from '../store/gameStore';
import { MenuMusicToggle } from '../components/MenuMusicToggle';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { ADVENTURES as ADVENTURE_OPTIONS, localizeAdventure, type AdventureDifficulty, type LocalizedAdventure } from '../data/adventures';
import { T, DISP, BODY, onTint, hardShadow } from '../theme/tokens';
import { coverArt, COVER_CUSTOM, COVER_IMPROVISED } from '../theme/art';

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
        pickFirst: "Pick an adventure first",
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
        pickFirst: "Choisissez d'abord une aventure",
        sectionAuthored: "Campagnes d'auteur",
        sectionAuthoredSub: "Écrites chapitre par chapitre pour ce jeu. Le MJ suit une vraie trame — des personnages nommés qui se souviennent de vous, des secrets posés à l'avance, une fin déjà décidée. Il n'invente pas au fil de la partie.",
        sectionClassics: "Les grands classiques",
        sectionClassicsSub: "Les archétypes du genre : la mine hantée, la cité en intrigue, le donjon sans fin. Ici le MJ reçoit une prémisse et bâtit l'histoire autour de vos choix — deux parties ne se ressemblent jamais.",
    },
} as const;

/** Un seul accent de couleur par niveau d'exigence — lisible en un coup d'œil. */
const DIFFICULTY_TONE: Record<AdventureDifficulty, string> = {
    gentle: T.emerald,
    standard: 'rgba(237,230,216,.85)',
    harsh: T.pink,
};

type Labels = typeof TRANS['fr'] | typeof TRANS['en'];

/** Ligne « icône · libellé · valeur » du pied de carte. */
function Fact({ icon, label, value, tone = 'rgba(237,230,216,.85)' }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone?: string;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, fontSize: 12 }}>
            <span style={{ color: 'rgba(237,230,216,.35)', flexShrink: 0, display: 'flex' }}>{icon}</span>
            {label && <span style={{ color: 'rgba(237,230,216,.45)', flexShrink: 0 }}>{label}</span>}
            <span style={{ fontWeight: 700, color: tone, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
        </div>
    );
}

/** En-tête d'une famille de campagnes + sa grille. */
function AdventureSection({ cover, title, subtitle, accent, children }: {
    cover: string;
    title: string;
    subtitle: string;
    accent: string;
    children: React.ReactNode;
}) {
    return (
        <section style={{ marginBottom: 56 }}>
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 26, alignItems: 'center', paddingBottom: 30,
            }}>
                <img
                    src={`/art/${cover}.webp`}
                    srcSet={`/art/${cover}.webp 1x, /art/${cover}@2x.webp 2x`}
                    alt=""
                    style={{
                        display: 'block', width: '100%', maxWidth: 420,
                        border: `4px solid ${accent}`, boxShadow: hardShadow(T.ink, 12),
                    }}
                />
                <div>
                    <h2 style={{ fontFamily: DISP, margin: '0 0 12px', fontSize: 'clamp(20px, 2.6vw, 27px)', color: accent }}>{title}</h2>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'rgba(237,230,216,.6)' }}>{subtitle}</p>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 24 }}>
                {children}
            </div>
        </section>
    );
}

function AdventureCard({ adv, tr, picked, onPick }: {
    adv: LocalizedAdventure;
    tr: Labels;
    picked: boolean;
    onPick: () => void;
}) {
    // Les campagnes d'auteur gardent un liseré acide au repos : la distinction
    // reste lisible même quand on a fait défiler loin de l'en-tête de section.
    const liseré = picked ? T.magenta : adv.authored ? `${T.acid}66` : 'rgba(237,230,216,.2)';

    return (
        <div
            onClick={onPick}
            role="button"
            tabIndex={0}
            aria-pressed={picked}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}
            style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                background: picked ? T.violet : T.ink,
                border: `4px solid ${liseré}`,
                boxShadow: picked ? `0 0 0 3px ${T.cyan}, ${hardShadow(T.ink, 12)}` : hardShadow(T.ink, 8),
                transition: 'box-shadow .16s ease-out, border-color .16s ease-out',
            }}
        >
            <div style={{ position: 'relative' }}>
                <img
                    src={`/art/${coverArt(adv.id)}.webp`}
                    srcSet={`/art/${coverArt(adv.id)}.webp 1x, /art/${coverArt(adv.id)}@2x.webp 2x`}
                    alt=""
                    loading="lazy"
                    style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', background: T.void }}
                />
                <span style={{
                    position: 'absolute', top: 10, left: 10, fontFamily: DISP, fontSize: 9,
                    padding: '6px 10px',
                    background: adv.authored ? T.acid : T.paper,
                    color: adv.authored ? onTint(T.acid) : onTint(T.paper),
                }}>{adv.authored ? tr.authored : tr.generated}</span>
                {picked && (
                    <span style={{
                        position: 'absolute', top: 10, right: 10, fontFamily: DISP, fontSize: 9,
                        padding: '6px 10px', background: T.magenta, color: onTint(T.magenta),
                    }}>{tr.selected}</span>
                )}
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
                <h3 style={{ fontFamily: DISP, margin: 0, fontSize: 19, lineHeight: 1.2 }}>{adv.title}</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgba(237,230,216,.85)' }}>{adv.desc}</p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic', color: 'rgba(237,230,216,.45)' }}>{adv.lore}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'rgba(237,230,216,.65)' }}>{adv.premise}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {adv.tags.map(tag => (
                        <span key={tag} style={{
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em',
                            padding: '5px 9px', border: '2px solid rgba(237,230,216,.2)', color: 'rgba(237,230,216,.55)',
                        }}>{tag}</span>
                    ))}
                </div>

                {/* Les quatre chiffres qui font vraiment choisir. */}
                <div style={{
                    marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px 16px', paddingTop: 14, borderTop: '2px solid rgba(237,230,216,.15)',
                }}>
                    <Fact icon={<Gauge size={14} />} label={tr.levels} value={`${adv.minLevel}–${adv.maxLevel}`} />
                    <Fact icon={<Clock size={14} />} label={tr.sessions} value={adv.sessions} />
                    <Fact
                        icon={<Layers size={14} />}
                        label={tr.difficulty}
                        value={tr[adv.difficulty]}
                        tone={DIFFICULTY_TONE[adv.difficulty]}
                    />
                    {adv.chapters !== undefined && (
                        <Fact
                            icon={<Book size={14} />}
                            label=""
                            value={adv.acts
                                ? `${adv.chapters} ${tr.chapters} · ${adv.acts} ${tr.acts}`
                                : `${adv.chapters} ${tr.chapters}`}
                        />
                    )}
                </div>
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
                    // Les gabarits de campagne (550 Ko de source) ne se chargent
                    // qu'ici, au clic — pas avec le hall. Voir manifestHydration.
                    const { hydrateSaveData } = await import('../services/manifestHydration');
                    loadSaveState(hydrateSaveData(fullSave));
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
        <div style={{ minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY }}>
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, padding: '18px clamp(20px, 5vw, 64px)', borderBottom: `2px solid ${T.cyan}59`,
            }}>
                <button
                    onClick={() => navigate('/mode')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: BODY, fontSize: 14, color: 'rgba(237,230,216,.65)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                    </svg>
                    {tr.back}
                </button>
                <MenuMusicToggle />
            </header>

            <div style={{ maxWidth: 1360, margin: '0 auto', padding: 'clamp(28px, 4vw, 52px) clamp(20px, 5vw, 64px) 64px' }}>
                <h1 style={{
                    fontFamily: DISP, margin: '0 0 36px', fontSize: 'clamp(26px, 4vw, 40px)',
                    paddingBottom: 20, borderBottom: `4px solid ${T.magenta}`,
                }}>{tr.selectAdventure}</h1>

                {isHost && gameMode === 'multiplayer' && (
                    <div style={{
                        background: T.violet, border: `4px solid ${T.azure}`, boxShadow: hardShadow(T.ink, 12),
                        padding: 26, marginBottom: 44, textAlign: 'center',
                    }}>
                        <h2 style={{
                            fontFamily: DISP, margin: '0 0 12px', fontSize: 20, color: T.azure,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}>
                            <Share2 size={20} /> {tr.shareCode}
                        </h2>
                        <p style={{ margin: '0 0 18px', color: 'rgba(237,230,216,.7)', fontSize: 14 }}>{tr.inviteFriends}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <div style={{ background: T.paper, padding: 10 }}>
                                <QRCodeSVG value={shareUrl} size={128} fgColor="#05001A" />
                            </div>
                            <p style={{
                                margin: 0, fontFamily: DISP, fontSize: 24, letterSpacing: '.14em',
                                background: T.ink, color: T.acid, padding: '14px 24px', border: `3px solid ${T.acid}`,
                            }}>{sessionId}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                                <a href={`whatsapp://send?text=Join my Dungeon AI game! Use code: ${sessionId} or click: ${shareUrl}`} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.emerald, color: onTint(T.emerald), padding: '10px 16px', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                                    <MessageCircle size={18} /> WhatsApp
                                </a>
                                <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Join my Dungeon AI game! Code: " + sessionId)}`} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.azure, color: onTint(T.azure), padding: '10px 16px', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                                    <Send size={18} /> Telegram
                                </a>
                                <a href={`mailto:?subject=Join my Dungeon AI game!&body=Hey! I'm hosting a Dungeon AI game. Use code: ${sessionId} or click this link to join: ${shareUrl}`}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.pink, color: onTint(T.pink), padding: '10px 16px', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                                    <Mail size={18} /> Email
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <AdventureSection
                    cover={COVER_CUSTOM}
                    title={tr.sectionAuthored}
                    subtitle={tr.sectionAuthoredSub}
                    accent={T.acid}
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
                    cover={COVER_IMPROVISED}
                    title={tr.sectionClassics}
                    subtitle={tr.sectionClassicsSub}
                    accent={T.cyan}
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

                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 20, flexWrap: 'wrap', marginTop: 20, paddingTop: 28,
                    borderTop: '2px solid rgba(237,230,216,.15)',
                }}>
                    <button
                        onClick={handleContinueLatest}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: BODY, fontSize: 14, color: 'rgba(237,230,216,.6)', textDecoration: 'underline',
                        }}
                    >{tr.continueExisting}</button>

                    <button
                        disabled={!selectedAdventure}
                        onClick={() => navigate('/create')}
                        title={!selectedAdventure ? tr.pickFirst : undefined}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            fontFamily: DISP, fontSize: 'clamp(13px, 1.6vw, 16px)', padding: '20px 34px',
                            border: 'none', cursor: selectedAdventure ? 'pointer' : 'not-allowed',
                            opacity: selectedAdventure ? 1 : .4,
                            background: T.acid, color: onTint(T.acid),
                            boxShadow: selectedAdventure ? hardShadow(T.ink, 11) : 'none',
                        }}
                    >
                        {tr.createCharacter}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
