import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CharacterSheetUI } from '../components/hall/CharacterSheet';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/persistence/saveService';
import { adventureService } from '../services/dm/adventureService';
import { memoryManager } from '../services/persistence/memoryManager';
import { campaignEventLog } from '../services/persistence/campaignEventLog';
import { AdventureManifest, CharacterSheet, DEFAULT_CAMPAIGN_RUNTIME } from '../types';
import { ensureProgressionState } from '../engine/rulesEngine';
import { getAdventureById } from '../data/adventures';
import { MenuMusicToggle } from '../components/shared/MenuMusicToggle';
import { LoadingVideo, preloadLoadingVideo, prefersReducedMotion } from '../components/shared/LoadingVideo';
import { T, DISP, BODY } from '../theme/tokens';
import { Panneau, Titre } from '../components/neon/SheetKit';
import { NeonButton } from '../components/neon/NeonButton';
import { getAuthoredCampaign } from '../data/campaigns';
import { buildSlimManifestPayload } from '../services/persistence/manifestHydration';
import { personalizeAuthoredManifest } from '../services/dm/llmService';
import { buildInitialRuntime, ensureLockedFirstScene, buildInitialJournal } from '../services/dm/adventureStart';
import { CHARACTER_CREATION_VIEW_TEXTS as TRANS } from './texts';

/**
 * Les trois animations de l'ecran de forge.
 *
 * Injectees ici et non dans index.css : elles ne servent qu'a cet ecran, et une
 * feuille globale qui grossit a chaque ecran finit par n'appartenir a personne.
 * Le respect de « animations reduites » est porte par la feuille et non par le
 * composant — le style en ligne ne sait pas lire une media query.
 */
const FORGE_CSS = `
@keyframes cc-spin { to { transform: rotate(360deg); } }
@keyframes cc-pulse { 50% { opacity: .55; } }
@keyframes cc-scroll { from { transform: translateY(0); } to { transform: translateY(-60%); } }
.cc-spin { animation: cc-spin 5.5s linear infinite; transform-origin: 50% 50%; }
.cc-pulse { animation: cc-pulse 2.2s ease-in-out infinite; }
.cc-scroll { animation: cc-scroll 20s linear infinite; }
@media (prefers-reduced-motion: reduce) {
    .cc-spin, .cc-pulse, .cc-scroll { animation: none; }
}
`;

export function CharacterCreationView() {
    const navigate = useNavigate();
    const { character, setCharacter, selectedAdventure, setSelectedAdventure, language, gameMode, setAdventureManifest, setCampaignRuntime, setActiveSaveId, resetSessionState } = useGameStore();
    const tr = TRANS[language];
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);
    // La vidéo d'attente : on ne bascule en session qu'une fois qu'elle est
    // finie (ou passée) ET que le manifeste est prêt — sinon le joueur la
    // verrait coupée net au milieu.
    const [videoDone, setVideoDone] = useState(false);
    const videoDoneRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

    useEffect(() => { preloadLoadingVideo(); }, []);

    const beginVideo = () => {
        let resolve: () => void = () => undefined;
        const promise = new Promise<void>(r => { resolve = r; });
        videoDoneRef.current = { promise, resolve };
        if (prefersReducedMotion()) { resolve(); setVideoDone(true); }
        else setVideoDone(false);
    };
    const finishVideo = () => {
        videoDoneRef.current?.resolve();
        setVideoDone(true);
    };

    const startAdventure = async (char: CharacterSheet) => {
        const readyCharacter = ensureProgressionState({
            ...char,
            backstory: char.customBackground || char.backstory || '',
        });
        const adventureId = selectedAdventure;
        const mode = gameMode;
        if (mode === 'multiplayer') {
            setIsGenerating(true);
            setGenerationError(tr.multiplayerDisabled);
            return;
        }
        memoryManager.clear();
        campaignEventLog.clear();
        resetSessionState();
        setSelectedAdventure(adventureId);
        setCampaignRuntime(DEFAULT_CAMPAIGN_RUNTIME);
        setCharacter(readyCharacter);
        beginVideo();
        setIsGenerating(true);

        const adventureInfo = getAdventureById(adventureId);
        const title = adventureId === 'ARENA_MODE' ? 'Arena Combat' : (adventureInfo?.title || adventureId || "Unknown Adventure");
        const adventurePrompt = adventureInfo
            ? `${adventureInfo.title}\n\n${adventureInfo.desc}\n${adventureInfo.lore}`
            : title;
        const newSaveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        saveService.setCurrentSave(newSaveId);
        memoryManager.setSaveId(newSaveId);
        campaignEventLog.setCampaignId(newSaveId);

        const manifestPromise = adventureId === 'ARENA_MODE'
            ? Promise.resolve({
                villain: { name: 'The Master of the Arena', archetype: 'Gladiator', description: 'The champion.', secret: 'None' },
                chapters: [],
                introduction: `${readyCharacter.name || 'Gladiator'}, the arena gates open. Prepare to fight.`,
                cinematicBrief: {
                    logline: `${readyCharacter.name || 'The gladiator'} steps into the arena as the crowd demands blood.`,
                    visualPrompt: `16:9 cinematic fantasy arena key art, ${readyCharacter.name || 'a lone gladiator'} at the sand gate, roaring crowd, torchlight, no text, no UI`,
                    narrationTone: 'short, tense, heroic',
                    musicMood: 'short heroic arena drums and brass',
                    firstSceneHook: 'The arena gate opens and the first opponent enters.',
                },
                firstScene: {
                    title: 'The Arena Gate',
                    location: 'Grand Arena',
                    objective: 'Survive the opening bout.',
                    mood: 'combat',
                    setup: 'The player starts at the arena gate. Do not skip the first opponent introduction.',
                    openingQuestion: 'How do you enter the sand?',
                },
                fullManifesto: "# THE ARENA\n\n## Introduction\nWelcome, Gladiator. The arena gate opens and the first opponent enters."
            })
            : getAuthoredCampaign(adventureId)
                // AUTHORED template → fill-only personalization pass (no generation).
                ? personalizeAuthoredManifest(getAuthoredCampaign(adventureId)!, readyCharacter, language as 'fr' | 'en', title).catch((err: Error) => {
                    setGenerationError(err.message || tr.personalizationError);
                    return null;
                })
                : adventureService.initializeAdventure(readyCharacter, adventurePrompt, language as 'fr' | 'en').catch((err: Error) => {
                    setGenerationError(err.message || tr.unknownGenError);
                    return null;
                });

        const steps = adventureId === 'ARENA_MODE' ? [tr.enteringArena] : [
            tr.stepScars, tr.stepHooks, tr.stepVillain,
            tr.stepAllies, tr.stepCinematic
        ];

        for (const step of steps) {
            setGenerationStep(step);
            await new Promise(r => setTimeout(r, 1500));
        }

        setGenerationStep(tr.stepInscribing);
        const resolved = await manifestPromise;
        // La passe d'auteur renvoie désormais { manifest, tokenValues } — les
        // valeurs de jetons sont conservées pour la sauvegarde MINCE (le doc
        // Firestore ne porte plus le manifeste entier).
        const isPersonalized = Boolean(resolved && typeof resolved === 'object' && 'tokenValues' in (resolved as object));
        const manifest = isPersonalized ? (resolved as { manifest: AdventureManifest }).manifest : resolved;
        const tokenValues = isPersonalized ? (resolved as { tokenValues: Record<string, string> }).tokenValues : null;
        if (!manifest) {
            // Use the functional updater: the .catch handlers above may have already
            // set a SPECIFIC error, but the `generationError` closure here is the stale
            // render-time value (null). Reading it directly would overwrite the precise
            // message with this generic fallback. prev ?? keeps the specific one.
            setGenerationError(prev => prev ?? tr.manifestError);
            return;
        }
        const lockedManifest = ensureLockedFirstScene(manifest as AdventureManifest);
        const initialRuntime = buildInitialRuntime(lockedManifest);
        const initialJournal = buildInitialJournal(lockedManifest, readyCharacter);
        setAdventureManifest(lockedManifest.fullManifesto, lockedManifest);
        useGameStore.getState().setManifestTokens(tokenValues);
        setCampaignRuntime(initialRuntime);
        useGameStore.getState().setJournal(initialJournal);

        // MV3 (contre-audit) — setActiveSaveId ne dépend PAS du succès de saveGame :
        // le sortir du try évite qu'un échec réseau laisse activeSaveId à null
        // (images rangées dans le bucket 'dev', clé d'intro faussée) alors que
        // l'identité de sauvegarde est déjà posée et que l'autosave recréera tout.
        setActiveSaveId(newSaveId);
        try {
            await saveService.saveGame({
                adventure: adventureId,
                adventureTitle: title,
                character: readyCharacter,
                transcript: [],
                playTime: 0,
                manifest: buildSlimManifestPayload(adventureId, lockedManifest, tokenValues) || lockedManifest,
                campaignRuntime: initialRuntime,
                journal: initialJournal,
            });
        } catch (e) {
            console.error('Failed to create adventure save:', e);
        }

        await videoDoneRef.current?.promise;
        setIsGenerating(false);
        navigate('/session');
    };

    if (isGenerating) {
        /**
         * L'ecran de forge — le dernier avant la partie.
         *
         * Il dure une quinzaine de secondes, et pendant ce temps le joueur n'a
         * rien a faire. On lui donne donc a LIRE ce qui se fabrique plutot
         * qu'un sablier : les etapes defilent en clair, et le manifeste s'ecrit
         * sous ses yeux. C'est aussi la derniere image de la charte avant que
         * le jeu ne bascule sur sa table medievale.
         */
        return (
            <div style={{
                minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY,
                display: 'grid', placeItems: 'center', padding: 'clamp(16px, 4vw, 40px)',
            }}>
                <style>{FORGE_CSS}</style>
                {!generationError && !videoDone && (
                    <LoadingVideo onDone={finishVideo} skipLabel={tr.skipVideo} />
                )}
                <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}><MenuMusicToggle /></div>

                <div style={{ width: '100%', maxWidth: 620 }}>
                    {generationError ? (
                        <Panneau accent={T.pink}>
                            <Titre accent={T.pink}>{tr.genErrorTitle}</Titre>
                            <p style={{
                                margin: '0 0 18px', padding: '13px 15px', background: T.ink,
                                border: `2px solid ${T.pink}`, fontSize: 12.5, lineHeight: 1.55,
                                whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace',
                            }}>{generationError}</p>
                            <NeonButton variante="danger" onClick={() => { setIsGenerating(false); setGenerationError(null); }}>
                                {tr.back}
                            </NeonButton>
                        </Panneau>
                    ) : (
                        <>
                            {/* Le d20 qui tourne. Une seule piece en mouvement sur
                                l'ecran : deux en feraient une salle d'attente. */}
                            <div style={{ display: 'grid', placeItems: 'center', marginBottom: 26 }}>
                                <svg className="cc-spin" width="86" height="86" viewBox="0 0 100 100" aria-hidden="true"
                                    fill="none" stroke={T.acid} strokeWidth="4" strokeLinejoin="round">
                                    <path d="M50 6 92 30v40L50 94 8 70V30z" />
                                    <path d="M50 6 26 50l24 44M50 6l24 44-24 44M8 30l18 20-18 20M92 30 74 50l18 20M26 50h48" strokeWidth="3" />
                                </svg>
                            </div>

                            <h2 className="cc-pulse" style={{
                                fontFamily: DISP, fontSize: 'clamp(17px, 3.2vw, 26px)', textAlign: 'center',
                                margin: '0 0 26px', color: T.acid, lineHeight: 1.35,
                            }}>{generationStep}</h2>

                            <Panneau accent={T.cyan} style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{
                                    fontFamily: DISP, fontSize: 11, textAlign: 'center', padding: '13px 16px',
                                    borderBottom: `3px solid ${T.ink}`, background: T.ink, color: T.cyan,
                                }}>{tr.adventureManifest}</div>
                                <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}>
                                    <div className="cc-scroll" style={{
                                        display: 'grid', gap: 22, padding: '22px 20px 120px',
                                        fontSize: 12.5, lineHeight: 1.6, color: 'rgba(237,230,216,.74)',
                                    }}>
                                        <p style={{ margin: 0 }}>{tr.initSeeds}</p>
                                        <p style={{ margin: 0 }}>{tr.checkingAlignment} {selectedAdventure}...</p>
                                        <p style={{ margin: 0 }}>{tr.preparingSave}</p>
                                        <p style={{ margin: 0 }}>{tr.readyingDice}</p>
                                    </div>
                                    {/* Fondus haut et bas : le texte entre et sort du cadre
                                        au lieu d'y apparaitre d'un coup. */}
                                    <div aria-hidden="true" style={{ position: 'absolute', inset: '0 0 auto', height: 44, background: `linear-gradient(${T.violet}, transparent)` }} />
                                    <div aria-hidden="true" style={{ position: 'absolute', inset: 'auto 0 0', height: 44, background: `linear-gradient(transparent, ${T.violet})` }} />
                                </div>
                            </Panneau>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY }}>
            {/* La charte du hall va maintenant jusqu'au bout : la fiche de
                création est peinte comme le menu, cartes illustrées comprises.
                La bascule vers le parchemin et l'or n'a lieu qu'au premier
                écran de partie — c'est le passage de la vitrine à la table. */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, padding: '18px clamp(16px, 4vw, 40px)', borderBottom: `2px solid ${T.cyan}59`,
            }}>
                <button
                    onClick={() => navigate('/lobby')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 0,
                        fontFamily: BODY, fontSize: 14, color: 'rgba(237,230,216,.65)',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                    </svg>
                    {tr.backLobby}
                </button>
                <MenuMusicToggle />
            </header>
            <div style={{ padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 32px) 40px' }}>
            <CharacterSheetUI
                // Remount when a genuinely different seed character loads — the sheet
                // seeds its editable state from initialChar only once (useState), so
                // without a stable key a newly loaded pre-gen showed the old data.
                // The name is stable during in-sheet editing (that uses local state),
                // so this never remounts mid-edit.
                key={character?.name || 'new-character'}
                initialChar={character || undefined}
                onSave={(char) => startAdventure(char)}
            />
            </div>
        </div>
    );
}
