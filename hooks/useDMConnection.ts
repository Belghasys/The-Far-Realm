import { useState, useEffect } from 'react';
import { LiveDungeonMaster, LiveConnectionManager, liveConnectionConfigSummary } from '../services/geminiRealtime';
import { CharacterSheet } from '../types';

interface UseDMConnectionProps {
    character: CharacterSheet;
    adventure: string;
    adventureManifest: string;
    language: string;
    initialHistory: { speaker: 'user' | 'dm', text: string }[];
    directorContext?: string;
    onMessage: (speaker: 'user' | 'dm', text: string) => void;
    onReconnectSuccessUpdate: () => void;
    onReconnectFailedSave: () => Promise<boolean>;
    onToolCall?: (toolCall: any) => Promise<any>;
}

export function useDMConnection({
    character,
    adventure,
    adventureManifest,
    language,
    initialHistory,
    directorContext,
    onMessage,
    onReconnectSuccessUpdate,
    onReconnectFailedSave,
    onToolCall
}: UseDMConnectionProps) {
    const [dm, setDm] = useState<LiveDungeonMaster | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [reconnectFailed, setReconnectFailed] = useState(false);
    const [queuedMessageCount, setQueuedMessageCount] = useState(0);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const formatConnectionError = (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error || 'Unknown connection error');
        const config = liveConnectionConfigSummary();
        const hints: string[] = [];

        if (!config.hasApiKey) {
            hints.push('Missing VITE_GEMINI_API_KEY in the deployed build.');
        }
        if (/api key|permission|forbidden|unauthorized|referer|referrer|origin|403/i.test(message)) {
            hints.push(`Check Google Cloud API key restrictions and allow this website origin: ${config.origin}`);
        }
        if (/model|not found|invalid/i.test(message)) {
            hints.push(`Live model in use: ${config.model}`);
        }
        if (!hints.length) {
            hints.push(`Origin: ${config.origin}`);
            hints.push(`Live model: ${config.model}`);
        }

        return `${message}\n${hints.join('\n')}`;
    };

    useEffect(() => {
        const manager = LiveConnectionManager.getInstance();
        const sessionKey = `${character.name || 'hero'}_${adventure || 'adventure'}`.toLowerCase();
        let isCurrentEffectRun = true;

        const connectToDM = async () => {
            try {
                const dungeonMaster = await manager.connect(
                    sessionKey,
                    character,
                    adventure,
                    adventureManifest,
                    language,
                    initialHistory,
                    directorContext || ''
                );

                if (!isCurrentEffectRun) {
                    return;
                }

                setDm(dungeonMaster);
                setIsMicOn(!dungeonMaster.isMutedState());
                setConnectionError(null);
            } catch (error) {
                if (isCurrentEffectRun) {
                    console.error("FATAL ERROR connecting to DM:", error);
                    setConnectionError(formatConnectionError(error));
                    setReconnectFailed(true);
                }
            }
        };

        const unsubscribe = manager.subscribe({
            onTranscript: onMessage,
            onVolume: (vol) => setAudioLevel(vol),
            onConnectionChange: (connected) => setIsConnected(connected),
            onReconnecting: (attempt, maxAttempts) => {
                setIsReconnecting(true);
                setReconnectAttempt(attempt);
                console.log(`Reconnecting... ${attempt}/${maxAttempts}`);
            },
            onReconnectFailed: async () => {
                setIsReconnecting(false);
                setReconnectFailed(true);
                console.log('Reconnection failed - saving game...');
                await onReconnectFailedSave();
            },
            onReconnectSuccess: () => {
                setIsReconnecting(false);
                setReconnectFailed(false);
                console.log('✅ Reconnection successful - resuming game');
                onReconnectSuccessUpdate();
            },
            onQueueChange: (queued) => setQueuedMessageCount(queued),
            onToolCall: onToolCall
        });

        connectToDM();

        return () => {
            isCurrentEffectRun = false;
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [character.name, adventure, adventureManifest, language]);

    // Push updated character state to the DM
    useEffect(() => {
        if (dm) {
            dm.updateCharacter(character);
        }
    }, [character, dm]);

    useEffect(() => {
        if (dm && directorContext) {
            dm.updateDirectorContext(directorContext);
        }
    }, [directorContext, dm]);

    const toggleMute = () => {
        if (dm) {
            const nextMuteState = !dm.isMutedState();
            dm.setMicEnabled(!nextMuteState);
            setIsMicOn(!nextMuteState);
        }
    };

    return {
        dm,
        isConnected,
        audioLevel,
        isMicOn,
        isReconnecting,
        reconnectAttempt,
        reconnectFailed,
        connectionError,
        queuedMessageCount,
        setReconnectFailed,
        setConnectionError,
        toggleMic: toggleMute
    };
}
