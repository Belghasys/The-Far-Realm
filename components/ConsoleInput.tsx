import React, { useState } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

interface Props {
    onSend: (text: string) => void;
    isLoading?: boolean;
}

export function ConsoleInput({ onSend, isLoading }: Props) {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto mt-6 pointer-events-auto transform transition-all duration-300 hover:scale-[1.02]">
            {/* Glow Effect Background */}
            <div className={`absolute -inset-1 bg-gradient-to-r from-red-600 via-gold to-red-600 rounded-full blur opacity-20 transition-opacity duration-500 ${isFocused ? 'opacity-60' : ''}`}></div>

            <div className={`
                relative flex items-center 
                bg-black/40 backdrop-blur-xl 
                border border-white/10 
                rounded-full 
                shadow-[0_0_30px_rgba(0,0,0,0.5)] 
                transition-all duration-300
                ${isFocused ? 'bg-black/60 border-gold/50 shadow-[0_0_30px_rgba(255,215,0,0.1)]' : ''}
            `}>
                <div className={`pl-5 transition-colors duration-300 ${isFocused ? 'text-gold' : 'text-gray-500'}`}>
                    {isFocused ? <Sparkles className="w-5 h-5 animate-pulse" /> : <MessageSquare className="w-5 h-5" />}
                </div>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={isLoading ? "Connecting to Dungeon Master..." : "Whisper to the Dungeon Master..."}
                    className={`flex-1 bg-transparent border-none text-white/90 px-4 py-4 focus:ring-0 placeholder-gray-500 font-sans tracking-wide text-lg ${isLoading ? 'opacity-50' : ''}`}
                    disabled={isLoading}
                />

                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={`
                        p-3 mr-2 rounded-full transition-all duration-300
                        ${input.trim()
                            ? 'bg-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.5)] hover:scale-110 hover:bg-white'
                            : 'bg-white/5 text-gray-600 cursor-not-allowed'}
                    `}
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
    );
}
