import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GameSession } from '../components/GameSession';
import { IntroCinematic } from '../components/IntroCinematic';
import { useGameStore } from '../store/gameStore';

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

    if (!character) {
        // Security redirect if accessed directly without char
        navigate('/mode');
        return null;
    }

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
