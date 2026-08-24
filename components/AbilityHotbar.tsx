import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { buildClassAbilityEntries, ClassAbilityId } from './CombatActionsPanel';

/**
 * Barre de capacités permanente façon BG3 : les capacités de classe (Rage,
 * Second souffle, Imposition des mains, Ruse, Familier…) sont TOUJOURS sous
 * la main — plus besoin d'attendre son tour de combat pour les voir. Hors
 * combat, seules les capacités « combat uniquement » sont grisées ; pendant
 * le tour d'un ennemi, tout est verrouillé.
 */
interface Props {
    onUseAbility: (abilityId: ClassAbilityId, targetId?: string) => void;
    selectedTargetId?: string;
    disabled?: boolean;
}

export function AbilityHotbar({ onUseAbility, selectedTargetId, disabled = false }: Props) {
    const character = useGameStore(s => s.character);
    const combatState = useGameStore(s => s.combatState);
    const language = useGameStore(s => s.language);
    const tr = language === 'fr'
        ? { title: 'Capacités', notYourTurn: "Pas ton tour", inCombatPanel: 'Aussi dans le panneau de combat' }
        : { title: 'Abilities', notYourTurn: 'Not your turn', inCombatPanel: 'Also in the combat panel' };

    const isPlayerTurn = !combatState.isActive
        || combatState.currentTurn === 'player'
        || combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.isPlayer;

    const entries = useMemo(
        () => buildClassAbilityEntries(
            character,
            combatState.isActive ? ((combatState.actionEconomy as any)?.['player'] || {}) : null,
            language
        ),
        [character, combatState.isActive, combatState.actionEconomy, language]
    );

    if (!character || !entries.length) return null;

    return (
        // PL3 — barre LATÉRALE verticale, au lieu de la barre horizontale
        // centrée qui chevauchait la zone de combat.
        // 2026-08-22 : passée à DROITE (demande joueur). En combat, la fenêtre
        // d'initiative occupe déjà ce bord sur ~390 px : on se décale alors vers
        // la gauche pour ne pas passer dessous.
        <div className={`pointer-events-auto fixed bottom-[5.75rem] z-40 hidden md:block ${
            combatState.isActive ? 'right-[33rem]' : 'right-3'
        }`}>
            <div className="flex max-h-[62vh] flex-col items-center gap-1.5 overflow-y-auto rounded-lg border border-white/12 bg-zinc-950/85 px-1.5 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl custom-scrollbar">
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/60">{tr.title}</span>
                {entries.map(entry => {
                    const locked = disabled || entry.disabled || !isPlayerTurn;
                    return (
                        <button
                            key={entry.id}
                            type="button"
                            disabled={locked}
                            title={!isPlayerTurn && combatState.isActive
                                ? tr.notYourTurn
                                : entry.disabled && entry.disabledReason
                                    ? entry.disabledReason
                                    : `${entry.label} — ${entry.hint}`}
                            onClick={() => onUseAbility(entry.id, entry.needsTarget ? selectedTargetId : undefined)}
                            className={`group relative flex h-11 w-11 flex-col items-center justify-center rounded-md border transition ${
                                locked
                                    ? 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed opacity-70'
                                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/25 hover:scale-105'
                            }`}
                        >
                            {entry.icon}
                            <span className="mt-0.5 max-w-full truncate px-0.5 font-mono text-[8px] text-white/50">{entry.uses}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
