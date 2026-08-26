/**
 * Le contexte des actions de session : ce que les actions du joueur
 * (playerSpell, classAbility) et le tour des PNJ (npcTurn) capturaient dans
 * la fermeture de GameSession — l'état de combat et ses setters, le MJ Live,
 * le transcript, les aides d'économie de tour, les textes.
 *
 * GameSession le construit a chaque appel (`sessionContext()`), les actions
 * le destructurent en tete de corps : leurs corps n'ont pas change. Les
 * types sont derives des hooks par `ReturnType`, donc exactement ceux
 * d'aujourd'hui ; les imports vers hooks/ et components/ sont de type
 * seulement (aucun code de vue n'est charge par services/).
 *
 * Extrait de components/session/GameSession.tsx le 2026-08-25 (R4 du
 * rangement).
 */
import type { Dispatch, SetStateAction } from 'react';
import type { CharacterSheet, TimeOfDay } from '../../types';
import type { Language } from '../i18n/translations';
import type { useGameStore } from '../../store/gameStore';
import type { useCombatState } from '../../hooks/useCombatState';
import type { useDMConnection } from '../../hooks/useDMConnection';
import type { useTranscript } from '../../hooks/useTranscript';
import type { useSaveSync } from '../../hooks/useSaveSync';
import type { DiceTrayRef } from '../../components/session/DiceTray';
import type { ReactionRequest } from '../../components/session/ReactionPrompt';
import type { GAME_SESSION_TRANS } from '../../components/session/translations';

type Store = ReturnType<typeof useGameStore.getState>;
type Combat = ReturnType<typeof useCombatState>;
type Connection = ReturnType<typeof useDMConnection>;
type SaveSync = ReturnType<typeof useSaveSync>;

export interface CombatRollLog {
    type: string;
    name: string;
    total: number;
    formula: string;
    isDM?: boolean;
    success?: boolean;
}

export interface SessionContext {
    // ── props de GameSession ──
    character: CharacterSheet;
    language: Language;
    onCharacterUpdate: (char: CharacterSheet) => void;

    // ── etat de combat (useCombatState) ──
    combatState: Combat['combatState'];
    setCombatState: Combat['setCombatState'];
    setIsNPCTurn: Combat['setIsNPCTurn'];

    // ── MJ Live (useDMConnection) ──
    dm: Connection['dm'];
    isConnected: Connection['isConnected'];

    // ── store ──
    pushCombatRoll: Store['pushCombatRoll'];
    setActivePrompt: Store['setActivePrompt'];
    setCurrentRoll: Store['setCurrentRoll'];
    setTranscript: ReturnType<typeof useTranscript>['setTranscript'];
    syncCharacterCritical: SaveSync['syncCharacterCritical'];

    // ── etat local de GameSession ──
    actionLockRef: { current: boolean };
    diceTrayRef: { current: DiceTrayRef | null };
    setIsResolvingAction: Dispatch<SetStateAction<boolean>>;
    setPlayerRoll: Dispatch<SetStateAction<{ result: number; reason: string; success?: boolean } | null>>;
    setReactionRequest: Dispatch<SetStateAction<ReactionRequest | null>>;
    dayCount: number;
    timeOfDay: TimeOfDay;
    tr: (typeof GAME_SESSION_TRANS)['fr'] | (typeof GAME_SESSION_TRANS)['en'];

    // ── aides de GameSession (economie de tour, fin de combat, journal des jets) ──
    guardPlayerAction: () => boolean;
    hasPlayerMainSlice: (state: any) => boolean;
    hasPlayerBonusFree: (state: any) => boolean;
    spendPlayerMainAction: (state: any) => any;
    spendPlayerBonus: (state: any) => any;
    patchPlayerEconomy: (state: any, patch: any) => any;
    rejectActionSpent: (needsBonus: boolean) => void;
    maybeEndCombat: (state: any) => boolean;
    logCombatRoll: (entry: CombatRollLog) => void;
    showActionToast: (text: string) => void;
    spendResource: (char: CharacterSheet, key: string, amount?: number) => CharacterSheet;
}
