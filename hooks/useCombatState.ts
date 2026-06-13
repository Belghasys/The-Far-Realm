import { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

// Slim combat-state accessor. The battle-grid era left a whole positioning
// layer here (playerPosition, enemyStartLocations, getCombatPositions,
// updateCombatPosition, syncFromEngine) that nothing rendered anymore — purged.
export function useCombatState() {
    const isNPCTurn = useGameStore(s => s.isNPCTurn);
    const setIsNPCTurn = useGameStore(s => s.setIsNPCTurn);

    const combatState = useGameStore(s => s.combatState);
    const setCombatState = useGameStore(s => s.setCombatState);

    const combatStateRef = useRef(combatState);
    useEffect(() => { combatStateRef.current = combatState; }, [combatState]);

    const resetCombat = () => {
        setCombatState({ isActive: false, combatants: [], currentTurn: '', logs: [] });
        setIsNPCTurn(false);
    };

    return {
        combatState, setCombatState, combatStateRef,
        isNPCTurn, setIsNPCTurn,
        resetCombat,
    };
}
