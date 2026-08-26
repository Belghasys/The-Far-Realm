import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const TRANS = {
    en: { close: 'Close' },
    fr: { close: 'Fermer' },
} as const;

type WindowSize = 'sm' | 'md' | 'lg' | 'xl';
type WindowTone = 'dark' | 'paper';

const SIZE_CLASS: Record<WindowSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
};

const TONE_CLASS: Record<WindowTone, string> = {
    dark: 'border-white/12 bg-zinc-950 text-white',
    // « Papier » : l'échelle stone est INVERSÉE dans le thème (voir
    // tailwind.config.js) — stone-100 est le panneau violet, stone-950 le
    // parchemin. Le ton garde son nom parce que les fenêtres qui l'emploient
    // gardent leur rôle : une feuille qu'on lit, pas un écran qu'on pilote.
    paper: 'border-stone-400 bg-stone-100 text-stone-950',
};

interface GameWindowProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    onClose: () => void;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    size?: WindowSize;
    tone?: WindowTone;
    zIndex?: string;
    bodyClassName?: string;
    className?: string;
}

export function GameWindow({
    title,
    subtitle,
    icon,
    children,
    onClose,
    actions,
    footer,
    size = 'lg',
    tone = 'dark',
    zIndex = 'z-[60]',
    bodyClassName = 'min-h-0 flex-1 overflow-hidden',
    className = '',
}: GameWindowProps) {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className={`fixed inset-0 ${zIndex} flex items-stretch justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4`}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`flex h-full w-full ${SIZE_CLASS[size]} flex-col overflow-hidden border shadow-2xl sm:h-[86vh] sm:rounded-md ${TONE_CLASS[tone]} ${className}`}
            >
                <header className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${tone === 'paper' ? 'border-stone-900/25 bg-stone-950/5' : 'border-white/10 bg-black/35'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                        {icon && (
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${tone === 'paper' ? 'border-stone-900/20 bg-white/35 text-stone-900' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>
                                {icon}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="truncate font-fantasy text-xl font-bold tracking-wide">{title}</h2>
                            {subtitle && <p className={`truncate text-xs ${tone === 'paper' ? 'text-stone-700' : 'text-white/45'}`}>{subtitle}</p>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {actions}
                        <button
                            type="button"
                            onClick={onClose}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${tone === 'paper' ? 'border-stone-900/20 text-stone-700 hover:bg-stone-900 hover:text-stone-50' : 'border-white/10 text-white/55 hover:bg-white/10 hover:text-white'}`}
                            title={tr.close}
                            aria-label={tr.close}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <div className={bodyClassName}>{children}</div>

                {footer && (
                    <footer className={`shrink-0 border-t px-4 py-3 ${tone === 'paper' ? 'border-stone-900/20 bg-stone-950/5' : 'border-white/10 bg-black/35'}`}>
                        {footer}
                    </footer>
                )}
            </section>
        </div>
    );
}

interface TabItem<T extends string> {
    id: T;
    label: string;
    count?: number;
}

interface WindowTabsProps<T extends string> {
    tabs: TabItem<T>[];
    active: T;
    onChange: (tab: T) => void;
    tone?: WindowTone;
}

export function WindowTabs<T extends string>({ tabs, active, onChange, tone = 'dark' }: WindowTabsProps<T>) {
    return (
        <div className={`flex gap-1 overflow-x-auto border-b p-2 ${tone === 'paper' ? 'border-stone-900/20 bg-stone-950/5' : 'border-white/10 bg-black/25'}`}>
            {tabs.map(tab => {
                const isActive = active === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                            tone === 'paper'
                                ? isActive
                                    ? 'bg-stone-900 text-stone-50'
                                    : 'text-stone-600 hover:bg-stone-900/10 hover:text-stone-950'
                                : isActive
                                    ? 'bg-amber-400 text-black'
                                    : 'text-white/55 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        {tab.label}{tab.count !== undefined ? ` ${tab.count}` : ''}
                    </button>
                );
            })}
        </div>
    );
}
