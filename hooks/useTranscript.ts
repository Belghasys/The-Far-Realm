import { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export interface ChatMessage {
    speaker: 'user' | 'dm';
    text: string;
}

export function useTranscript(initialHistory: ChatMessage[] = []) {
    const transcript = useGameStore(s => s.transcript);
    const setTranscript = useGameStore(s => s.setTranscript);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize if store is empty but we received initial history
    useEffect(() => {
        if (initialHistory.length > 0 && transcript.length === 0) {
            setTranscript(initialHistory);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript]);

    const addMessage = (speaker: 'user' | 'dm', text: string) => {
        setTranscript(prev => [...prev, { speaker, text }]);
    };

    const appendToLastMessage = (speaker: 'user' | 'dm', text: string) => {
        setTranscript(prev => {
            if (prev.length > 0 && prev[prev.length - 1].speaker === speaker) {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { 
                    ...newHistory[newHistory.length - 1], 
                    text: newHistory[newHistory.length - 1].text + " " + text 
                };
                return newHistory;
            }
            return [...prev, { speaker, text }];
        });
    };

    return {
        transcript,
        setTranscript,
        scrollRef,
        addMessage,
        appendToLastMessage
    };
}
