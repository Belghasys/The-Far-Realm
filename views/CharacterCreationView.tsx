import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { CharacterSheetUI } from '../components/CharacterSheet';
import { useGameStore } from '../store/gameStore';
import { saveService } from '../services/saveService';
import { adventureService } from '../services/adventureService';
import { memoryManager } from '../services/memoryManager';
import { campaignEventLog } from '../services/campaignEventLog';
import { AdventureManifest, CampaignRuntimeState, CharacterSheet, DEFAULT_CAMPAIGN_RUNTIME, JournalState } from '../types';
import { ensureProgressionState } from '../services/rulesEngine';
import { getAdventureById } from '../data/adventures';
import { MenuMusicToggle } from '../components/MenuMusicToggle';
import { T, BODY } from '../theme/tokens';
import { getAuthoredCampaign } from '../data/campaigns';
import { buildSlimManifestPayload } from '../services/manifestTokens';
import { personalizeAuthoredManifest } from '../services/llmService';

function buildInitialRuntime(manifest: AdventureManifest): CampaignRuntimeState {
    const firstChapter = manifest.chapters?.[0];
    const firstChapterScene = firstChapter?.scenes?.[0];
    const lockedScene = manifest.firstScene;
    const chapterId = lockedScene?.chapterId || firstChapter?.id;
    const sceneId = lockedScene?.sceneId || firstChapterScene?.id;
    const objective = lockedScene?.objective || firstChapter?.objective;
    const location = lockedScene?.location || firstChapterScene?.location;
    const title = lockedScene?.title || firstChapterScene?.title || 'Opening scene';

    // ── MÉCHANT : sauvetage des données mortes (contre-audit 2026-08-22) ──────
    // llmService DEMANDE au générateur `escalationArc` et `weaknesses`, on les
    // stocke… et RIEN ne les lit jamais : campaignDirector n'injecte que
    // name/archetype/motivation, et lookup_campaign ne fouille pas le méchant.
    // Conséquence : une campagne générée par IA n'a AUCUNE condition de victoire
    // atteignable par le MJ. On les verse donc dans les canaux déjà réinjectés.
    // ⚠️ UNIQUEMENT si la campagne n'a pas ses propres tableaux : les campagnes
    // ÉCRITES (Chant Brisé, Hiver sans Aube, Portes de l'Exil) y posent déjà ces
    // faits AVEC leur calendrier de révélation — les dupliquer les écraserait.
    const villain: any = (manifest as any).villain || {};
    const authoredFacts = manifest.initialCanonFacts || [];
    const authoredSecrets = manifest.initialProtectedSecrets || [];
    const villainFacts: string[] = [];
    const villainSecrets: string[] = [];
    if (!authoredFacts.length && villain.name) {
        const weaknesses = Array.isArray(villain.weaknesses) ? villain.weaknesses.filter(Boolean) : [];
        if (weaknesses.length) villainFacts.push(`Faiblesses de ${villain.name} : ${weaknesses.join(' ; ')}`);
        if (villain.escalationArc) villainFacts.push(`Escalade de ${villain.name} : ${String(villain.escalationArc).slice(0, 400)}`);
    }
    if (!authoredSecrets.length && villain.name && villain.secret) {
        // Porte de révélation synthétisée : sans elle, un secret injecté à
        // chaque tour finit par fuiter dès le premier chapitre.
        const gate = Math.max(2, Math.ceil((manifest.chapters?.length || 6) / 2));
        villainSecrets.push(`Secret de ${villain.name} (NE PAS révéler avant le chapitre ${gate}) : ${String(villain.secret).slice(0, 400)}`);
    }

    return {
        ...DEFAULT_CAMPAIGN_RUNTIME,
        currentChapterId: chapterId,
        currentSceneId: sceneId,
        currentObjective: objective,
        // Seed authored escalation clocks (e.g. "Gel Profond") so the live DM
        // actually sees them — campaignDirector re-injects runtime.worldClocks each turn.
        worldClocks: (manifest.initialWorldClocks && manifest.initialWorldClocks.length)
            ? manifest.initialWorldClocks.map(c => ({ ...c, updatedAt: Date.now() }))
            : DEFAULT_CAMPAIGN_RUNTIME.worldClocks,
        canonFacts: [
            ...DEFAULT_CAMPAIGN_RUNTIME.canonFacts,
            ...authoredFacts,
            ...villainFacts,
            `Locked first scene: ${title}${location ? ` at ${location}` : ''}${objective ? `; objective: ${objective}` : ''}`,
        ],
        // Seed authored villain secret/weaknesses so the live DM actually knows them
        // (campaignDirector injects protectedSecrets, but never villain.secret).
        protectedSecrets: [
            ...(DEFAULT_CAMPAIGN_RUNTIME.protectedSecrets || []),
            ...authoredSecrets,
            ...villainSecrets,
        ],
        updatedAt: Date.now(),
    };
}

function ensureLockedFirstScene(manifest: AdventureManifest): AdventureManifest {
    if (manifest.firstScene) return manifest;

    const firstChapter = manifest.chapters?.[0];
    const firstChapterScene = firstChapter?.scenes?.[0];
    return {
        ...manifest,
        firstScene: {
            chapterId: firstChapter?.id,
            sceneId: firstChapterScene?.id,
            title: firstChapterScene?.title || firstChapter?.title || 'Opening Moment',
            location: firstChapterScene?.location || 'Opening location',
            objective: firstChapter?.objective || manifest.cinematicBrief?.firstSceneHook || 'Choose your first move.',
            mood: firstChapterScene?.mood || 'dramatic',
            setup: firstChapterScene?.description || manifest.cinematicBrief?.firstSceneHook || manifest.introduction?.slice(0, 420) || 'The campaign begins here.',
            openingQuestion: 'What do you do?',
        },
    };
}

// Per-token fallbacks so an unfilled authored template (one not yet run through
// the Flash personalization pass) never shows raw {{TOKENS}} to the player.
const PLACEHOLDER_FALLBACKS: Record<string, string> = {
    HERO_NAME: 'le héros', HERO_RACE_CLASS: 'aventurier', HERO_DESIRE: 'ce qu’il cherche',
    HERO_WOUND: 'sa vieille blessure', HERO_BOND: 'ce qui lui est cher', HERO_HOOK: 'le destin',
    PERSONAL_LOSS: 'un être cher perdu à jamais', HERO_CONTACT: 'une vieille connaissance',
};
function stripUnfilledPlaceholders(text: string): string {
    return String(text || '').replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_m, k) => PLACEHOLDER_FALLBACKS[k] || 'cette histoire');
}

// Seed the journal ONCE at campaign creation from the manifest, so the player
// opens the game with a readable prologue + first objective + starting place +
// known allies — instead of an empty journal and a "catapulted" feeling.
// Spoiler-free: never surfaces the villain's secret or betrayers/rivals.
function buildInitialJournal(manifest: AdventureManifest, character: CharacterSheet): JournalState {
    const fs = manifest.firstScene;
    const ch1 = manifest.chapters?.[0];
    const scene1 = ch1?.scenes?.[0];
    const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

    const objective = fs?.objective || ch1?.objective || 'Découvrir ce qui t’attend.';
    const location = fs?.location || scene1?.location || '';
    const threat = manifest.cinematicBrief?.logline
        || (manifest.villain ? `Une ombre plane (${manifest.villain.archetype}).` : '');
    const prologue = (manifest.introduction && manifest.introduction.trim())
        || manifest.cinematicBrief?.logline
        || `${character.name}, ${character.race} ${character.class} — ton aventure commence.`;

    // Allies the hero would plausibly already know — skip betrayers/rivals (spoilers).
    const clean = stripUnfilledPlaceholders;
    const knownRoles = new Set(['mentor', 'quest_giver', 'ally']);
    // CP1 (contre-audit 2026-08-13) — les descriptions d'AUTEUR sont écrites
    // pour le MJ : elles contiennent les twists (identité du traître, liens au
    // vilain, notes de mise en scène [entre crochets]). Recopiées telles quelles,
    // le journal vendait toute l'enquête au premier tour. On retire les segments
    // [crochets], on coupe à la première phrase, et on écarte toute description
    // citant le vilain par son nom.
    const villainName = String(manifest.villain?.name || '').trim();
    const spoilerSafe = (desc: string): string => {
        const noNotes = desc.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
        const firstSentence = noNotes.split(/(?<=[.!?])\s/)[0] || '';
        if (villainName && firstSentence.toLowerCase().includes(villainName.toLowerCase())) return '';
        return firstSentence.slice(0, 180);
    };
    const npcs = (manifest.supportingCast || [])
        .filter(c => c && knownRoles.has(String(c.role)))
        .slice(0, 4)
        .map(c => {
            const safeDesc = spoilerSafe(String(c.description || ''));
            return { id: uid(), name: clean(c.name), description: clean(`${c.role}${safeDesc ? ' — ' + safeDesc : ''}`), location: clean(c.location || location) };
        });
    // NF3 — les marchands PRINCIPAUX de la campagne entrent au journal dès le
    // départ : boutiquiers récurrents que le MJ incarne (open_shop) et qui
    // portent une quête personnelle à récompense puissante.
    const merchantNpcs = (manifest.keyMerchants || [])
        .slice(0, 3)
        .map(km => ({
            id: uid(),
            name: clean(km.name),
            description: clean(`${km.type}${km.personality ? ' — ' + km.personality : ''}${km.questHook ? ` | Quête : ${km.questHook}` : ''}`),
            location: clean(km.location || location),
        }));

    return {
        briefing: { prologue: clean(prologue), objective: clean(objective), threat: clean(threat), location: clean(location) },
        // Quête d'ouverture : titrée par l'OBJECTIF de campagne, pas par le titre
        // de la première scène — « Porte de la Pluie » n'est pas une quête, elle
        // ne pouvait jamais être close et squattait le journal pour toujours
        // (audit 2026-08-21). L'objectif, lui, est un but que le MJ peut clore.
        quests: [{
            id: uid(),
            title: clean(objective ? objective.slice(0, 70) : (ch1?.title || 'Le commencement')),
            description: clean(objective || fs?.title || ch1?.title || ''),
            status: 'active',
            createdAt: new Date().toISOString(),
        }],
        npcs: [...npcs, ...merchantNpcs],
        locations: location ? [{ id: uid(), name: clean(location), description: clean(scene1?.description || 'Point de départ de ton aventure.') }] : [],
        chronicle: [],
    };
}

const TRANS = {
    en: {
        multiplayerDisabled: "Multiplayer is disabled until real-time state sync is implemented.",
        personalizationError: "Error while personalizing the campaign.",
        unknownGenError: "Unknown error while generating the adventure.",
        manifestError: "Unable to generate the adventure manifest.",
        enteringArena: "Entering the Arena...",
        stepScars: "Reading your hero's scars...",
        stepHooks: "Binding personal hooks to the world...",
        stepVillain: "Mirroring the villain to your desire...",
        stepAllies: "Choosing allies, secrets, and threats...",
        stepCinematic: "Preparing the opening cinematic...",
        stepInscribing: "Inscribing the saga...",
        genErrorTitle: "⚠️ Generation Error",
        back: "← Back",
        adventureManifest: "Adventure Manifest",
        initSeeds: "Initializing world seeds...",
        checkingAlignment: "Checking alignment with",
        preparingSave: "Preparing save state...",
        readyingDice: "Readying the Dice of Fate...",
        backLobby: "Back",
    },
    fr: {
        multiplayerDisabled: "Le multijoueur est désactivé jusqu'à l'implémentation de la synchronisation d'état en temps réel.",
        personalizationError: "Erreur lors de la personnalisation de la campagne.",
        unknownGenError: "Erreur inconnue lors de la génération de l'aventure.",
        manifestError: "Impossible de générer le manifeste d'aventure.",
        enteringArena: "Entrée dans l'Arène...",
        stepScars: "Lecture des cicatrices de votre héros...",
        stepHooks: "Liaison de vos enjeux personnels au monde...",
        stepVillain: "Reflet du vilain dans votre désir...",
        stepAllies: "Choix des alliés, des secrets et des menaces...",
        stepCinematic: "Préparation de la cinématique d'ouverture...",
        stepInscribing: "Inscription de la saga...",
        genErrorTitle: "⚠️ Erreur de Génération",
        back: "← Retour",
        adventureManifest: "Manifeste d'Aventure",
        initSeeds: "Initialisation des graines du monde...",
        checkingAlignment: "Vérification de l'alignement avec",
        preparingSave: "Préparation de la sauvegarde...",
        readyingDice: "Préparation des Dés du Destin...",
        backLobby: "Retour",
    },
} as const;

export function CharacterCreationView() {
    const navigate = useNavigate();
    const { character, setCharacter, selectedAdventure, setSelectedAdventure, language, gameMode, setAdventureManifest, setCampaignRuntime, setActiveSaveId, resetSessionState } = useGameStore();
    const tr = TRANS[language];
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState('');
    const [generationError, setGenerationError] = useState<string | null>(null);

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

        setIsGenerating(false);
        navigate('/session');
    };

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] font-serif relative overflow-hidden">
                <div className="absolute top-4 right-4 z-20"><MenuMusicToggle /></div>
                <div className="max-w-2xl w-full text-center space-y-8 z-10">
                    {generationError ? (
                        <div className="bg-red-900/80 border border-red-500 rounded-lg p-6 space-y-4">
                            <h2 className="text-2xl font-fantasy text-red-300">{tr.genErrorTitle}</h2>
                            <p className="text-red-200 text-sm font-mono whitespace-pre-wrap">{generationError}</p>
                            <button
                                onClick={() => { setIsGenerating(false); setGenerationError(null); }}
                                className="px-6 py-2 bg-red-700 hover:bg-red-600 rounded text-white transition-colors"
                            >
                                {tr.back}
                            </button>
                        </div>
                    ) : (
                        <>
                            <Loader2 className="w-24 h-24 text-gold animate-spin mx-auto" />
                            <h2 className="text-4xl font-fantasy text-gold animate-pulse">{generationStep}</h2>
                            <div className="bg-gray-900/80 p-6 rounded border border-gray-700 h-64 overflow-hidden relative shadow-2xl">
                                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-gray-900 to-transparent z-10"></div>
                                <div className="animate-[scroll_20s_linear_infinite] space-y-6 text-gray-300 opacity-90 font-mono text-sm leading-relaxed pb-32">
                                    <p className="text-gold font-bold uppercase tracking-widest text-center border-b border-gray-700 pb-2 mb-4">{tr.adventureManifest}</p>
                                    <p>{tr.initSeeds}</p>
                                    <p>{tr.checkingAlignment} {selectedAdventure}...</p>
                                    <p>{tr.preparingSave}</p>
                                    <p>{tr.readyingDice}</p>
                                </div>
                                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900 to-transparent z-10"></div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: T.void, color: T.paper, fontFamily: BODY }}>
            {/* Le hall garde sa charte jusqu'au dernier écran avant la partie ;
                la fiche elle-même reste sur parchemin, comme en jeu. */}
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
