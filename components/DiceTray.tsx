import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Swords, Dices } from 'lucide-react';
import { localSfxService } from '../services/localSfxService';
import { useGameStore } from '../store/gameStore';

const TRANS = {
    en: {
        success: '✓ Success',
        failure: '✗ Failure',
        combatTitle: 'Combat rolls',
        skillTitle: 'Skill rolls',
        combatEmpty: 'Attacks, damage and saving throws will appear here.',
        skillEmpty: 'Skill checks will appear here.',
    },
    fr: {
        success: '✓ Réussite',
        failure: '✗ Échec',
        combatTitle: 'Jets de combat',
        skillTitle: 'Jets de compétence',
        combatEmpty: "Attaques, dégâts et sauvegardes s'afficheront ici.",
        skillEmpty: "Les jets de compétence s'afficheront ici.",
    },
} as const;

type Tr = (typeof TRANS)[keyof typeof TRANS];

export interface LogEntry {
    id: number;
    type: 'damage' | 'check' | 'save' | 'attack' | 'initiative';
    name: string;
    total: number;
    formula: string;
    isDM?: boolean;
    success?: boolean;
}

export interface DiceTrayRef {
    addLog: (entry: Omit<LogEntry, 'id'>) => void;
    // Same visual log + SFX, but WITHOUT mirroring into the store's combat journal.
    // Used when the caller already pushed the roll to the store itself (so it shows
    // in the "Jets" HUD even when this panel is unmounted) — avoids a double entry.
    addLogNoMirror: (entry: Omit<LogEntry, 'id'>) => void;
}

interface DiceTrayProps {
    onRoll?: (result: number, formula: string, reason: string) => void;
}

// Combat window = everything that resolves violence: attacks, damage, SAVES
// (a save is almost always "resist the dragon's breath / the poison"), plus
// initiative. Skill window = pure ability/skill checks.
const COMBAT_TYPES: LogEntry['type'][] = ['attack', 'damage', 'save', 'initiative'];

function RollRow({ entry, tr }: { key?: React.Key; entry: LogEntry; tr: Tr }) {
    return (
        <div
            className={`
                p-2.5 rounded-lg border-l-4 transition-all
                ${entry.isDM
                    ? 'bg-red-900/20 border-red-500'
                    : entry.success === true
                        ? 'bg-green-900/20 border-green-500'
                        : entry.success === false
                            ? 'bg-red-900/20 border-red-400'
                            : 'bg-gray-800/50 border-gold'}
            `}
        >
            <div className="flex justify-between items-center gap-2">
                <span className={`font-bold text-xs truncate ${entry.isDM ? 'text-red-400' : 'text-gold'}`}>
                    {entry.name}
                </span>
                <span className={`
                    text-lg font-bold shrink-0
                    ${entry.success === true ? 'text-green-400' : entry.success === false ? 'text-red-400' : 'text-white'}
                `}>
                    {entry.total}
                </span>
            </div>
            <div className="flex justify-between items-center gap-2">
                <span className="text-gray-500 text-[11px] font-mono truncate">{entry.formula}</span>
                {entry.success !== undefined && (
                    <span className={`text-[10px] font-bold uppercase shrink-0 ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.success ? tr.success : tr.failure}
                    </span>
                )}
            </div>
        </div>
    );
}

function RollWindow({
    title,
    icon,
    accent,
    logs,
    emptyIcon,
    emptyText,
    bottomRef,
    tr,
}: {
    title: string;
    icon: React.ReactNode;
    accent: string;
    logs: LogEntry[];
    emptyIcon: string;
    emptyText: string;
    bottomRef?: React.RefObject<HTMLDivElement>;
    tr: Tr;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-700 bg-black/60">
            <div className={`flex items-center gap-2 border-b border-gray-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest ${accent}`}>
                {icon}
                <span>{title}</span>
                <span className="ml-auto rounded bg-white/10 px-1.5 text-[10px] font-mono text-white/50">{logs.length}</span>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="mt-4 flex flex-col items-center gap-1 text-center text-gray-500">
                        <div className="text-xl opacity-30">{emptyIcon}</div>
                        <p className="text-[11px] italic">{emptyText}</p>
                    </div>
                ) : (
                    logs.map(l => <RollRow key={l.id} entry={l} tr={tr} />)
                )}
                {bottomRef && <div ref={bottomRef} />}
            </div>
        </div>
    );
}

/**
 * Two stacked roll windows, BOTH always visible (no tabs to click):
 *   ⚔️ Jets de combat   — attack rolls, damage, saving throws, initiative
 *   🎲 Jets de compétence — ability/skill checks
 */
export const DiceTray = forwardRef<DiceTrayRef, DiceTrayProps>((_props, ref) => {
    const language = useGameStore(s => s.language);
    const tr = TRANS[language];
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const combatBottomRef = useRef<HTMLDivElement>(null);
    const skillBottomRef = useRef<HTMLDivElement>(null);
    // Monotonic id counter. Date.now() collided when several logs landed in the
    // same millisecond (e.g. attack + damage, or multiple enemy initiatives at
    // combat start), producing duplicate React keys. A counter is unique for the
    // component lifetime regardless of timing.
    const logIdRef = useRef(0);

    const writeLog = (entry: Omit<LogEntry, 'id'>, mirror: boolean) => {
        setLogs(prev => [...prev, { ...entry, id: ++logIdRef.current }]);
        // Mirror combat-relevant rolls into the store so the CombatTracker can
        // show a persistent in-combat feed (enemy + player attack/damage/save).
        if (mirror && (entry.type === 'attack' || entry.type === 'damage' || entry.type === 'save')) {
            useGameStore.getState().pushCombatRoll({
                name: entry.name, total: entry.total, formula: entry.formula, isDM: !!entry.isDM, success: entry.success,
            });
        }
        // Trigger local sound effect
        void localSfxService.playSfxForLog(entry);
    };

    useImperativeHandle(ref, () => ({
        addLog: (entry) => writeLog(entry, true),
        addLogNoMirror: (entry) => writeLog(entry, false),
    }));

    const combatLogs = logs.filter(log => COMBAT_TYPES.includes(log.type));
    const skillLogs = logs.filter(log => log.type === 'check');

    useEffect(() => {
        combatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combatLogs.length]);

    useEffect(() => {
        skillBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [skillLogs.length]);

    return (
        <div className="flex h-full flex-col gap-2 bg-black/80 p-2 font-sans">
            <RollWindow
                title={tr.combatTitle}
                icon={<Swords className="h-3.5 w-3.5" />}
                accent="text-red-300/85"
                logs={combatLogs}
                emptyIcon="⚔️"
                emptyText={tr.combatEmpty}
                bottomRef={combatBottomRef}
                tr={tr}
            />
            <RollWindow
                title={tr.skillTitle}
                icon={<Dices className="h-3.5 w-3.5" />}
                accent="text-sky-300/85"
                logs={skillLogs}
                emptyIcon="🎲"
                emptyText={tr.skillEmpty}
                bottomRef={skillBottomRef}
                tr={tr}
            />
        </div>
    );
});
