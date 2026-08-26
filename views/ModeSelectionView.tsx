/**
 * LE MENU PRINCIPAL.
 *
 * C'est ici — pas sur l'écran de connexion — que le jeu se présente : la
 * promesse en grand, les trois voies, le maître du jeu et ses alter ego, la
 * taverne, le mur. Un joueur connecté arrive sur cette page et doit pouvoir en
 * repartir vers une partie sans jamais remonter.
 *
 * L'ordre n'est pas décoratif : on agit d'abord (les voies), on découvre
 * ensuite (le MJ), on traîne à la fin (taverne et mur). La taverne est
 * volontairement collée au mur — c'est le coin salon de la page.
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/persistence/saveService';
import { memoryManager } from '../services/persistence/memoryManager';
import { campaignEventLog } from '../services/persistence/campaignEventLog';
import { LoadGameMenu } from '../components/hall/LoadGameMenu';
import { auth } from '../services/persistence/firebase';
import { MenuMusicToggle } from '../components/shared/MenuMusicToggle';
import { T, DISP, BODY, onTint, hardShadow } from '../theme/tokens';
import { NeonCard } from '../components/neon/NeonButton';
import { AlterEgoFrame } from '../components/neon/AlterEgoFrame';
import { CollageWall } from '../components/neon/CollageWall';
import { TavernPlayer, TavernLink } from '../components/neon/TavernPlayer';
import { CLASS_ART, ALTER_ART, ALTER_CAPTION, BANNER } from '../theme/art';
import { dispClass } from '../data/labels';
import { CLASS_DATA } from '../data';

/** La piste du hall. Une seule constante à changer pour changer d'ambiance. */
const TAVERN_VIDEO_ID = 'VPqWVgsvj1Q';

/**
 * Position du soleil DANS l'illustration de la compagnie, mesurée au pixel
 * (tools/build_art.py sert la même image, donc les proportions ne bougent pas).
 * Le soleil dessiné en CSS s'y superpose au lieu d'en ajouter un second.
 */
const SOLEIL = { cx: 49.4, cy: 29.4, diametre: 28.2 };

/**
 * Les rangées d'alter ego dérivent en sens opposés. Les keyframes sont
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
    const taverne = useRef<HTMLDivElement>(null);

    const TRANS = {
        en: {
            kicker: "A DUNGEON MASTER THAT SPEAKS, AND LISTENS",
            line1: "IT SPEAKS.",
            line2: "IT LISTENS.",
            line3: "IT REMEMBERS.",
            tagline: "The last place where we still play like we used to.",
            pitch: "The dungeon master is a live AI. It describes the room out loud, plays every character with its own voice, hears what you answer, and remembers all of it — your choices, your oaths, and the guard you knocked out in chapter 2.",
            basement: "Doors close. Screens win. Down here, the table is still set.",
            start: "START THE ADVENTURE",
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
            tavern: "Tavern",
            tavernTitle: "THE TAVERN",
            tavernHint: "The music of the hall plays here, in plain sight. Nothing is streamed from our own servers — the tavern borrows its records.",
            tavernFallback: "If the player cannot load — an ad blocker, a locked-down network, the offline installer — the local theme takes over on its own.",
            tavernDown: "UNAVAILABLE",
            wallTitle: "THE WALL",
            wallHint: "Ten scenes the dungeon master keeps pinned above the table. The rules never left — they just moved upstairs.",
            wallRefresh: "SHUFFLE",
            wallEnlarge: "Enlarge",
            wallClose: "Close",
        },
        fr: {
            kicker: "UN MAÎTRE DU JEU QUI PARLE, ET QUI ÉCOUTE",
            line1: "IL PARLE.",
            line2: "IL ÉCOUTE.",
            line3: "IL SE SOUVIENT.",
            tagline: "Le dernier endroit où l'on joue encore comme avant.",
            pitch: "Le maître du jeu est une IA en direct. Elle décrit la salle à voix haute, prête sa voix à chaque personnage, entend ce que vous répondez, et se souvient de tout : vos choix, vos serments, et le garde que vous avez assommé au chapitre 2.",
            basement: "Les portes ferment. Les écrans gagnent. En bas, la table est encore mise.",
            start: "LANCER L'AVENTURE",
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
            tavern: "Taverne",
            tavernTitle: "LA TAVERNE",
            tavernHint: "La musique du hall se joue ici, à la vue de tous. Rien n'est diffusé depuis nos propres serveurs — la taverne emprunte ses disques.",
            tavernFallback: "Si le lecteur ne charge pas — bloqueur de publicité, réseau verrouillé, installeur hors ligne — le thème local reprend la main tout seul.",
            tavernDown: "INDISPONIBLE",
            wallTitle: "LE MUR",
            wallHint: "Dix scènes que le maître du jeu garde punaisées au-dessus de la table. Les règles ne sont jamais parties — elles ont juste déménagé à l'étage.",
            wallRefresh: "MÉLANGER",
            wallEnlarge: "Agrandir",
            wallClose: "Fermer",
        }
    };
    const t = TRANS[language as keyof typeof TRANS];
    const lang = language as 'en' | 'fr';

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/');
    };

    const versLaTaverne = () => taverne.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
                    label={dispClass(cle, lang).toUpperCase()}
                    caption={ALTER_CAPTION[cle][lang]}
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

            {/* ── En-tête ─────────────────────────────────────────────────── */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, flexWrap: 'wrap', padding: '18px clamp(20px, 5vw, 64px)',
                borderBottom: `2px solid ${T.cyan}59`,
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(15px, 3vw, 21px)' }}>THE LAST</span>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(15px, 3vw, 21px)', color: T.magenta, textShadow: `3px 3px 0 ${T.cyan}` }}>BASEMENT</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                    <MenuMusicToggle />
                    <TavernLink label={t.tavern} onClick={versLaTaverne} />
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            background: 'transparent', border: '2px solid rgba(237,230,216,.3)',
                            padding: '9px 16px', fontFamily: BODY, fontSize: 13, color: 'rgba(237,230,216,.7)',
                        }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                        </svg>
                        {t.logout}
                    </button>
                </div>
            </header>

            {/* ── Héros ───────────────────────────────────────────────────── */}
            <div style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(40px, 6vw, 74px) clamp(20px, 5vw, 64px) 0' }}>
                <div aria-hidden="true" style={{
                    position: 'absolute', left: '-10%', right: '-10%', bottom: 0, height: 230, opacity: .45,
                    backgroundImage: `repeating-linear-gradient(90deg, ${T.cyan}8C 0 2px, transparent 2px 64px), repeating-linear-gradient(0deg, ${T.pink}8C 0 2px, transparent 2px 44px)`,
                    transform: 'perspective(240px) rotateX(62deg)', transformOrigin: '50% 100%',
                    pointerEvents: 'none',
                }} />

                <div style={{
                    position: 'relative', maxWidth: 1360, margin: '0 auto',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
                    gap: 'clamp(32px, 5vw, 56px)', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={T.acid} aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
                            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.2em', color: T.acid }}>{t.kicker}</span>
                        </div>

                        <h1 style={{ fontFamily: DISP, margin: 0, fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1.04 }}>
                            {t.line1}<br />
                            <span style={{ color: T.magenta, textShadow: `4px 4px 0 ${T.cyan}` }}>{t.line2}</span><br />
                            {t.line3}
                        </h1>

                        <p style={{ margin: 0, fontSize: 'clamp(15px, 2vw, 18px)', fontStyle: 'italic', color: T.acid }}>{t.tagline}</p>
                        <p style={{ margin: 0, maxWidth: 500, fontSize: 16, lineHeight: 1.55, color: 'rgba(237,230,216,.78)' }}>{t.pitch}</p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingTop: 4 }}>
                            <button
                                onClick={() => { setGameMode('solo'); navigate('/lobby'); }}
                                style={{
                                    fontFamily: DISP, fontSize: 'clamp(13px, 1.6vw, 16px)', padding: '20px 32px',
                                    border: 'none', cursor: 'pointer',
                                    background: T.acid, color: onTint(T.acid), boxShadow: hardShadow(T.ink, 11),
                                }}
                            >{t.start}</button>
                            <button
                                onClick={() => setShowLoadMenu(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                    fontFamily: BODY, fontSize: 15, fontWeight: 700, color: T.paper,
                                    background: 'transparent', border: '2px solid rgba(237,230,216,.45)', padding: '17px 24px',
                                }}
                            >
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" />
                                </svg>
                                {t.loadSavedGame}
                            </button>
                        </div>

                        <p style={{
                            margin: '6px 0 0', paddingLeft: 16, borderLeft: `3px solid ${T.magenta}`,
                            fontSize: 14, lineHeight: 1.5, fontStyle: 'italic', color: 'rgba(237,230,216,.6)',
                        }}>{t.basement}</p>
                    </div>

                    {/*
                        Le soleil dessiné et celui de l'illustration sont
                        CONCENTRIQUES. Les valeurs ne sont pas au jugé : le
                        disque de l'image a été mesuré au pixel — centre à
                        49,4 % de la largeur et 29,4 % de la hauteur, diamètre
                        28,2 % de la largeur. Le nôtre reprend ce centre avec un
                        diamètre double, si bien qu'il ne dépasse qu'en halo
                        au-dessus du cadre et prolonge l'astre au lieu d'en
                        poser un second à côté.
                    */}
                    <div style={{ position: 'relative', minWidth: 0 }}>
                        <div aria-hidden="true" style={{
                            position: 'absolute', left: `${SOLEIL.cx}%`, top: `${SOLEIL.cy}%`,
                            width: `${SOLEIL.diametre * 2.1}%`, aspectRatio: '1',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            background: `linear-gradient(${T.acid}, ${T.pink})`,
                            opacity: .8, pointerEvents: 'none', zIndex: 0,
                        }} />
                        <div aria-hidden="true" style={{
                            position: 'absolute', left: `${SOLEIL.cx}%`, top: `${SOLEIL.cy}%`,
                            width: `${SOLEIL.diametre * 2.1}%`, aspectRatio: '1',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '50%',
                            // Rayures proportionnelles : elles suivent l'échelle
                            // du cadre au lieu de se décaler quand il rétrécit.
                            background: `repeating-linear-gradient(180deg, transparent 0 2.4%, ${T.void} 2.4% 3.8%)`,
                            opacity: .9, pointerEvents: 'none', zIndex: 0,
                        }} />
                        <img
                            src={`/art/${BANNER.party}.webp`}
                            srcSet={`/art/${BANNER.party}.webp 1x, /art/${BANNER.party}@2x.webp 2x`}
                            alt=""
                            style={{
                                position: 'relative', zIndex: 1,
                                display: 'block', width: '100%', minWidth: 0,
                                border: `4px solid ${T.cyan}`, boxShadow: `16px 16px 0 ${T.purple}`,
                            }}
                        />
                    </div>
                </div>

                <div style={{ height: 'clamp(48px, 7vw, 92px)' }} />
            </div>

            {/* ── Les voies ───────────────────────────────────────────────── */}
            <main style={{
                background: T.violet, borderTop: `4px solid ${T.magenta}`,
                padding: 'clamp(40px, 5vw, 68px) clamp(20px, 5vw, 64px)',
            }}>
                <div style={{ maxWidth: 1360, margin: '0 auto' }}>
                    <div style={{
                        display: 'flex', alignItems: 'end', justifyContent: 'space-between',
                        gap: 16, flexWrap: 'wrap', paddingBottom: 32,
                    }}>
                        <h2 style={{ fontFamily: DISP, margin: 0, fontSize: 'clamp(26px, 3.5vw, 38px)' }}>{t.choosePath}</h2>
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
                            <h3 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.arenaTitle}</h3>
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
                            <h3 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.solo}</h3>
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
                                <h3 style={{ fontFamily: DISP, margin: 0, fontSize: 24 }}>{t.multi}</h3>
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
                </div>
            </main>

            {/* ── Le maître du jeu et ses alter ego ───────────────────────── */}
            <section style={{ paddingTop: 'clamp(40px, 5vw, 64px)', paddingBottom: 'clamp(40px, 5vw, 60px)', borderTop: `4px solid ${T.cyan}` }}>
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

            {/* ── La taverne, puis le mur : le coin salon de la page ──────── */}
            <div
                ref={taverne}
                style={{
                    borderTop: `4px solid ${T.acid}`, background: T.violet,
                    padding: 'clamp(40px, 5vw, 64px) clamp(20px, 5vw, 64px) clamp(48px, 6vw, 80px)',
                }}
            >
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(44px, 6vw, 72px)' }}>
                    <TavernPlayer
                        videoId={TAVERN_VIDEO_ID}
                        title={t.tavernTitle}
                        hint={t.tavernHint}
                        fallbackNote={t.tavernFallback}
                        unavailable={t.tavernDown}
                        lang={lang}
                    />

                    <CollageWall
                        title={t.wallTitle}
                        hint={t.wallHint}
                        refreshLabel={t.wallRefresh}
                        enlargeLabel={t.wallEnlarge}
                        closeLabel={t.wallClose}
                        lang={lang}
                    />
                </div>
            </div>

            {showLoadMenu && (
                <LoadGameMenu
                    onLoad={async (saveId) => {
                        try {
                            const save = await saveService.loadGame(saveId);
                            if (save && save.character) {
                                // Même règle que LobbyView : les campagnes se
                                // chargent au clic, pas avec le menu.
                                const { hydrateSaveData } = await import('../services/persistence/manifestHydration');
                                loadSaveState(hydrateSaveData(save));
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
