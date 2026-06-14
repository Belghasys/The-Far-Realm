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
import { getAuthoredCampaign } from '../data/campaigns';
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
            ...(manifest.initialCanonFacts || []),
            `Locked first scene: ${title}${location ? ` at ${location}` : ''}${objective ? `; objective: ${objective}` : ''}`,
        ],
        // Seed authored villain secret/weaknesses so the live DM actually knows them
        // (campaignDirector injects protectedSecrets, but never villain.secret).
        protectedSecrets: [
            ...(DEFAULT_CAMPAIGN_RUNTIME.protectedSecrets || []),
            ...(manifest.initialProtectedSecrets || []),
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
    const npcs = (manifest.supportingCast || [])
        .filter(c => c && knownRoles.has(String(c.role)))
        .slice(0, 4)
        .map(c => ({ id: uid(), name: clean(c.name), description: clean(`${c.role}${c.description ? ' — ' + c.description : ''}`), location: clean(c.location || location) }));

    return {
        briefing: { prologue: clean(prologue), objective: clean(objective), threat: clean(threat), location: clean(location) },
        quests: [{ id: uid(), title: clean(fs?.title || ch1?.title || 'Le commencement'), description: clean(objective), status: 'active' }],
        npcs,
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
                ? personalizeAuthoredManifest(getAuthoredCampaign(adventureId)!, readyCharacter, language as 'fr' | 'en').catch((err: Error) => {
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
        const manifest = await manifestPromise;
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
        setCampaignRuntime(initialRuntime);
        useGameStore.getState().setJournal(initialJournal);


        try {
            await saveService.saveGame({
                adventure: adventureId,
                adventureTitle: title,
                character: readyCharacter,
                transcript: [],
                playTime: 0,
                manifest: lockedManifest,
                campaignRuntime: initialRuntime,
                journal: initialJournal,
            });
            setActiveSaveId(newSaveId);

        } catch (e) {
            console.error('Failed to create adventure save:', e);
        }

        setIsGenerating(false);
        navigate('/session');
    };

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] font-serif relative overflow-hidden">
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
        <div className="min-h-screen bg-gray-900 p-4">
            <button
                onClick={() => navigate('/lobby')}
                className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>{tr.backLobby}</span>
            </button>
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
    );
}
