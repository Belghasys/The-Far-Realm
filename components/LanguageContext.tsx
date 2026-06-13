import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, getBrowserLanguage } from '../services/translations';

interface LanguageContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    t: (key: string) => string;
    isMobile: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    // Detect browser language on first load
    const [lang, setLang] = useState<Language>(() => {
        const stored = localStorage.getItem('dungeonai-lang');
        if (stored === 'fr' || stored === 'en') return stored;
        return getBrowserLanguage();
    });

    // Detect mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check for mobile on mount and resize
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        localStorage.setItem('dungeonai-lang', lang);
    }, [lang]);

    // Translation function
    const t = (key: string): string => {
        const keys = key.split('.');
        let result: any = translations;

        for (const k of keys) {
            if (result && result[k]) {
                result = result[k];
            } else {
                return key;
            }
        }

        if (result && result[lang]) {
            return result[lang];
        }

        return key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, isMobile }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}

// Language Selector Component
export function LanguageSelector({ className = '' }: { className?: string }) {
    const { lang, setLang } = useLanguage();

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded text-sm font-bold transition-all ${lang === 'en'
                        ? 'bg-gold text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
            >
                EN
            </button>
            <button
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded text-sm font-bold transition-all ${lang === 'fr'
                        ? 'bg-gold text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
            >
                FR
            </button>
        </div>
    );
}
