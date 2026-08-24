import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { LoadGameMenu } from '../components/LoadGameMenu';
import { auth } from '../services/firebase';
import { MenuMusicToggle } from '../components/MenuMusicToggle';
import { T, DISP, BODY, onTint } from '../theme/tokens';
import { NeonCard } from '../components/neon/NeonButton';
import { AlterEgoFrame } from '../components/neon/AlterEgoFrame';
import { CollageWall } from '../components/neon/CollageWall';
import { CLASS_ART, ALTER_ART, ALTER_CAPTION } from '../theme/art';
import { dispClass } from '../data/labels';
import { CLASS_DATA } from '../data';

/**
 * Les rangées de la Parade dérivent en sens opposés. Les keyframes sont
 * injectées ici plutôt que dans index.css : elles ne servent qu'à cet écran,
 * et une feuille globale qui grossit à chaque écran finit par n'appartenir à
 * personne.
 */
const PARADE_CSS = `
@keyframes ms-drift-l { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes ms-drift-r { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.ms-lane { display: flex; gap: 20px; width: max-content; }
.ms-lane-a { animation: ms-drift-l 52s linear infinite; }
.ms-lane-b { animation: ms-drift-r 64s linear infinite; }
.ms-rail:hover .ms-lane { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .ms-lane { animation: none; } }
`;

export function ModeSelectionView() {
    const navigate = useNavigate();
    const { language, setLanguage, setGameMode, setSelectedAdventure, setActiveSaveId, loadSaveState } = useGameStore();
    const [showLoadMenu, setShowLoadMenu] = useState(false);

    const TRANS = {
        en: {
            choosePath: "Choose Your Path",
            pathHint: "You can change your mind. Your character, less so.",
            solo: "Solo Journey",
            soloDesc: "Brave the darkness alone. You are the sole hero of your story.",
            multi: "Gather Your Party",
            multiDesc: "Team up with friends in real time. Coming soon.",
            comingSoon: "Coming Soon",
            logout: "Log Out",
            arenaTitle: "ARENA MODE",
            arenaDesc: "Instant Combat. No Story. Pure Glory.",
            loadSavedGame: "Load a Saved Game",
            loadError: "Error while loading the save",
            enter: "ENTER",
            dmTitle: "GET TO KNOW YOUR DM",
            dmHint: "Click a portrait. The dungeon master will show you what that class looks like on a Tuesday.",
            flipHint: "see the alter ego",
            classCount: (n: number) => `${n} CLASSES`,
            wallTitle: "THE WALL",
            wallHint: "Ten scenes the dungeon master keeps pinned above the table. The rules never left — they just moved upstairs.",
            wallRefresh: "SHUFFLE",
        },
        fr: {
            choosePath: "Choisissez Votre Voie",
            pathHint: "Vous pourrez changer d'avis. Votre personnage, moins.",
            solo: "Aventure Solo",
            soloDesc: "Affrontez les ténèbres seul. Vous êtes le seul héros de votre histoire.",
            multi: "Rassemblez Votre Groupe",
            multiDesc: "Jouez à plusieurs en temps réel. Bientôt disponible.",
            comingSoon: "Bientôt disponible",
            logout: "Déconnexion",
            arenaTitle: "MODE ARÈNE",
            arenaDesc: "Combat instantané. Pas d'histoire. Gloire pure.",
            loadSavedGame: "Charger une Partie Sauvegardée",
            loadError: "Erreur lors du chargement de la sauvegarde",
            enter: "ENTRER",
            dmTitle: "APPRENEZ À CONNAÎTRE VOTRE MJ",
            dmHint: "Cliquez un portrait. Le maître du jeu vous montre à quoi ressemble cette classe un mardi.",
            flipHint: "voir l'alter ego",
            classCount: (n: number) => `${n} CLASSES`,
            wallTitle: "LE MUR",
            wallHint: "Dix scènes que le maître du jeu garde punaisées au-dessus de la table. Les règles ne sont jamais parties — elles ont juste déménagé à l'étage.",
            wallRefresh: "MÉLANGER",
        }
    };
    const t = TRANS[language as keyof typeof TRANS];

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    // Deux rangées, chacune doublée : l'animation s'arrête à -50 %, ce qui rend
    // la boucle invisible.
    const [hautes, basses] = useMemo(() => {
        const cles = Object.keys(CLASS_DATA).filter(k => CLASS_ART[k]);
        const moitie = Math.ceil(cles.length / 2);
        return [cles.slice(0, moitie), cles.slice(moitie)];
    }, []);

    const rangee = (cles: string[], sens: 'a' | 'b') => (
        <div className={`ms-lane ms-lane-${sens}`}>
            {[...cles, ...cles].map((cle, i) => (
                <AlterEgoFrame
                    key={`${cle}-${i}`}
                    faceSlug={CLASS_ART[cle].slug}
                    alterSlug={ALTER_ART[cle].slug}
                    tint={CLASS_ART[cle].tint}
                    shadow={i % 2 ? T.magenta : T.acid}
                    label={dispClass(cle, language as 'en' | 'fr').toUpperCase()}
                    caption={ALTER_CAPTION[cle][language as 'en' | 'fr']}
                    hint={t.flipHint}
                    width={172}
                    height={230}
                />
            ))}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY }}>
            <style>{PARADE_CSS}</style>

            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap', padding: '20px clamp(20px, 5vw, 64px)',
                borderBottom: `2px solid ${T.cyan}59`,
            }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: BODY, fontSize: 14, color: 'rgba(237,230,216,.6)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                    </svg>
                    {t.logout}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MenuMusicToggle />
                    <div style={{ display: 'flex', gap: 2, border: '2px solid rgba(237,230,216,.25)', padding: 3 }}>
                        {(['en', 'fr'] as const).map(code => (
                            <button
                                key={code}
                                onClick={() => setLanguage(code)}
                                style={{
                                    fontFamily: DISP, fontSize: 12, padding: '7px 12px', border: 'none', cursor: 'pointer',
                                    background: language === code ? T.acid : 'transparent',
                                    color: language === code ? onTint(T.acid) : 'rgba(237,230,216,.55)',
                                }}
                            >{code.toUpperCase()}</button>
                        ))}
                    </div>
                </div>
            </header>

            <main style={{ padding: 'clamp(36px, 5vw, 64px) clamp(20px, 5vw, 64px) 0', maxWidth: 1360, margin: '0 auto' }}>
                <div style={{
                    display: 'flex', alignItems: 'end', justifyContent: 'space-between',
                    gap: 16, flexWrap: 'wrap', paddingBottom: 34,
                }}>
                    <h1 style={{ fontFamily: DISP, margin: 0, fontSize: 'clamp(28px, 4vw, 42px)' }}>{t.choosePath}</h1>
                    <span style={{ fontSize: 14, color: 'rgba(237,230,216,.5)' }}>{t.pathHint}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>

                    <NeonCard
                        tint={T.pink}
                        rotate={-1.2}
                        onClick={() => { setGameMode('solo'); setSelectedAdventure('ARENA_MODE'); navigate('/create'); }}
                    >
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="M19 21v-4h-4" /><path d="M21 3h-3L6.5 14.5" /><path d="m5 19 6-6" />
                        </svg>
                        <h2 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.arenaTitle}</h2>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, opacity: .82 }}>{t.arenaDesc}</p>
                        <span style={{ fontFamily: DISP, fontSize: 12, marginTop: 'auto' }}>{t.enter} →</span>
                    </NeonCard>

                    <NeonCard
                        tint={T.azure}
                        rotate={0.8}
                        onClick={() => { setGameMode('solo'); navigate('/lobby'); }}
                    >
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        <h2 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.solo}</h2>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, opacity: .82 }}>{t.soloDesc}</p>
                        <span style={{ fontFamily: DISP, fontSize: 12, marginTop: 'auto' }}>{t.enter} →</span>
                    </NeonCard>

                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute', top: -12, right: 14, zIndex: 2,
                            fontFamily: DISP, fontSize: 11, background: T.acid, color: onTint(T.acid),
                            padding: '6px 12px',
                        }}>{t.comingSoon}</span>
                        <NeonCard tint={T.void} rotate={-0.6} disabled>
                            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <h2 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.multi}</h2>
                            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, opacity: .75 }}>{t.multiDesc}</p>
                            <button
                                disabled
                                style={{
                                    marginTop: 'auto', fontFamily: DISP, fontSize: 12, padding: '14px 20px',
                                    background: 'transparent', color: 'rgba(237,230,216,.4)',
                                    border: '2px dashed rgba(237,230,216,.3)', cursor: 'not-allowed',
                                }}
                            >{t.comingSoon}</button>
                        </NeonCard>
                    </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0 8px' }}>
                    <button
                        onClick={() => setShowLoadMenu(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10, background: 'none', cursor: 'pointer',
                            border: `2px solid ${T.cyan}80`, padding: '14px 24px',
                            fontFamily: BODY, fontSize: 15, fontWeight: 700, color: T.cyan,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
                        </svg>
                        {t.loadSavedGame}
                    </button>
                </div>
            </main>

            {/* Apprendre à connaître le MJ : chaque cadre se retourne sur
                l'alter ego de la classe. C'est le ton du jeu qu'on présente
                ici, pas un catalogue — d'où le retournement plutôt qu'un lien
                vers la création. */}
            <section style={{ paddingTop: 48, paddingBottom: 56, borderTop: `4px solid ${T.cyan}`, marginTop: 40 }}>
                <div style={{
                    display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                    padding: '0 clamp(20px, 5vw, 64px) 28px', maxWidth: 1360, margin: '0 auto',
                }}>
                    <div>
                        <h2 style={{ fontFamily: DISP, margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)' }}>{t.dmTitle}</h2>
                        <p style={{ margin: 0, fontSize: 14, color: 'rgba(237,230,216,.55)', maxWidth: 620 }}>{t.dmHint}</p>
                    </div>
                    <span style={{ fontFamily: DISP, fontSize: 12, color: T.acid }}>{t.classCount(hautes.length + basses.length)}</span>
                </div>

                <div className="ms-rail" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {rangee(hautes, 'a')}
                    {rangee(basses, 'b')}
                </div>
            </section>

            <div style={{
                padding: '0 clamp(20px, 5vw, 64px) 72px', maxWidth: 1360, margin: '0 auto',
            }}>
                <CollageWall
                    title={t.wallTitle}
                    hint={t.wallHint}
                    refreshLabel={t.wallRefresh}
                    lang={language as 'en' | 'fr'}
                />
            </div>

            {showLoadMenu && (
                <LoadGameMenu
                    onLoad={async (saveId) => {
                        try {
                            const save = await saveService.loadGame(saveId);
                            if (save && save.character) {
                                loadSaveState(save);
                                memoryManager.setSaveId(saveId);
                                memoryManager.importFromSave({ transcript: save.transcript || [], combat: save.combat });
                                campaignEventLog.setCampaignId(saveId);
                                campaignEventLog.import(save.events);
                                setActiveSaveId(saveId);
                                saveService.setCurrentSave(saveId);
                                setShowLoadMenu(false);
                                navigate('/session');
                            } else {
                                // MV2 (contre-audit) — sauvegarde corrompue (character absent) :
                                // sans else, le clic « Continuer » ne faisait RIEN en silence.
                                alert(t.loadError);
                            }
                        } catch (err) {
                            console.error('Failed to load save:', err);
                            alert(t.loadError);
                        }
                    }}
                    onClose={() => setShowLoadMenu(false)}
                />
            )}
        </div>
    );
}
