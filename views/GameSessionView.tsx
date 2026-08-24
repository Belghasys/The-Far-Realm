import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GameSession } from '../components/GameSession';
import { IntroCinematic } from '../components/IntroCinematic';
import { useGameStore } from '../store/gameStore';
import { ensureProgressionState } from '../services/rulesEngine';

export function GameSessionView() {
    const navigate = useNavigate();
    const {
        character,
        selectedAdventure,
        adventureManifest,
        adventureManifestData,
        campaignRuntime,
        language,
        transcript,
        journal,
        activeSaveId
    } = useGameStore();

    const introKey = useMemo(
        () => `intro_seen_${activeSaveId || selectedAdventure || 'adventure'}_${character?.name || 'hero'}`,
        [activeSaveId, selectedAdventure, character?.name]
    );
    const [introSeen, setIntroSeen] = useState(() => {
        try {
            return localStorage.getItem(introKey) === '1';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            setIntroSeen(localStorage.getItem(introKey) === '1');
        } catch {
            setIntroSeen(false);
        }
    }, [introKey]);

    const shouldShowIntro = Boolean(
        adventureManifestData
        && transcript.length === 0
        && !introSeen
        && (adventureManifestData.introduction || adventureManifestData.cinematicBrief || adventureManifestData.firstScene)
    );

    const completeIntro = () => {
        try {
            localStorage.setItem(introKey, '1');
        } catch {
            // Local persistence is best-effort only.
        }
        setIntroSeen(true);
    };

    // Security redirect if accessed directly without a character — in an
    // effect, not during render (React warns on render-phase navigation).
    useEffect(() => {
        if (!character) navigate('/mode');
    }, [character, navigate]);

    // Migration des anciennes fiches à l'entrée en session : matérialise les
    // ressources de classe ajoutées depuis (Focalisation du pacte de
    // l'Occultiste, Récupération naturelle du Druide…). Sans ça, un
    // personnage sauvegardé n'aurait JAMAIS vu les nouvelles capacités.
    useEffect(() => {
        if (!character) return;
        const ensured = ensureProgressionState(character);
        const before = Object.keys(character.resources || {}).sort().join(',');
        const after = Object.keys(ensured.resources || {}).sort().join(',');
        if (before !== after) useGameStore.getState().setCharacter(ensured);
    }, [character]);

    if (!character) return null;

    return (
        <ErrorBoundary fallbackTitle="The D&D Session encountered a magical anomaly (Crash)">
            {shouldShowIntro ? (
                <IntroCinematic
                    character={character}
                    manifest={adventureManifestData!}
                    language={language}
                    onComplete={completeIntro}
                />
            ) : (
                <GameSession
                    character={character}
                    adventure={selectedAdventure}
                    adventureManifest={adventureManifest}
                    adventureManifestData={adventureManifestData}
                    campaignRuntime={campaignRuntime}
                    onLeave={() => navigate('/mode')}
                    onCharacterUpdate={(c) => useGameStore.getState().setCharacter(c)}
                    language={language}
                    initialHistory={transcript}
                    initialJournal={journal}
                    saveId={activeSaveId || undefined}
                />
            )}
        </ErrorBoundary>
    );
}
