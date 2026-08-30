import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranscript } from '../../hooks/useTranscript';
import { useSaveSync } from '../../hooks/useSaveSync';
import { useCombatState } from '../../hooks/useCombatState';
import { useDMConnection } from '../../hooks/useDMConnection';
import { useToolProcessor } from '../../hooks/useToolProcessor';
import { useMusicDirector } from '../../hooks/useMusicDirector';
import { useReconnectCountdown } from '../../hooks/useReconnectCountdown';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useMemoryRecall } from '../../hooks/useMemoryRecall';
import { useRailWidth } from '../../hooks/useRailWidth';
import type { SessionContext } from '../../services/session/context';
import { handlePlayerCastSpell as handlePlayerCastSpellAction } from '../../services/session/playerSpell';
import { handleUseClassAbility as handleUseClassAbilityAction } from '../../services/session/classAbility';
import { patchPlayerEconomy, spendPlayerBonus, hasPlayerBonusFree, spendResource, spendPlayerMainAction as spendPlayerMainActionRule, hasPlayerMainSlice as hasPlayerMainSliceRule } from '../../engine/turnEconomy';
import { runNPCTurn as runNPCTurnAction } from '../../services/session/npcTurn';
import { handlePlayerAttack as handlePlayerAttackAction } from '../../services/session/playerActions';
import { handlePlayerBonusAttack as handlePlayerBonusAttackAction } from '../../services/session/playerActions';
import { handlePlayerDodge as handlePlayerDodgeAction } from '../../services/session/playerActions';
import { handlePlayerUsePotion as handlePlayerUsePotionAction } from '../../services/session/playerActions';
import { handlePlayerProposedAction as handlePlayerProposedActionAction } from '../../services/session/playerActions';
import { GAME_SESSION_TEXTS as TRANS } from './texts';
import { mergeTranscriptText } from './transcriptText';
import { NavButton, HeaderActionButton, HudMeter } from './HudControls';

/** Fenêtre annoncée au joueur pendant une reconnexion (backoff réel : 2+4+8 s
 *  sur trois tentatives, plus l'ouverture de chaque session). */
const RECONNECT_WINDOW_S = 20;
import { useGameStore } from '../../store/gameStore';
import { LiveConnectionManager } from '../../services/dm/geminiRealtime';
import { auditBus } from '../../services/infra/auditBus';
import { auditNarration, auditCadenceDue, narrationUnseen } from '../../services/dm/narrationAuditor';
import { runJournalKeeper } from '../../services/dm/journalKeeper';
import { sessionTrace } from '../../services/infra/sessionTrace';

import { AdventureManifest, CampaignRuntimeState, CharacterSheet, TimeOfDay, calculateLevelFromXP, getCombatAC, getEffectiveStat, getXPProgress, getPlayerAttackCount, racialHPBonusPerLevel } from '../../types';
import { Mic, MicOff, Volume2, User, Backpack, Scroll, Swords, MessageSquare, LogOut, Book, Save, Music, Sparkles, Map as MapIcon, BookOpen, Settings as SettingsIcon, CalendarDays, Dices } from 'lucide-react';
import { DiceTray, DiceTrayRef } from './DiceTray';
import { RollingDice } from './RollingDice';
import { InventoryPanel, CharacterSheetPanel } from '../panels/InGameMenus';

import SpellbookPanel from '../panels/SpellbookPanel';
import { ShopPanel } from '../panels/ShopPanel';
import { CombatTracker } from '../combat/CombatTracker';
import { combatantSide } from '../../engine/combatants';
import { AuditWindow } from './AuditConsole';
import { ActionPrompt } from './ActionPrompt';
import { JournalPanel } from '../panels/JournalPanel';
import { CampaignBoardPanel } from '../panels/CampaignBoardPanel';
import { MonsterCard } from '../panels/MonsterCard';
import { saveService } from '../../services/persistence/saveService';
import { memoryManager } from '../../services/persistence/memoryManager';
import { t, Language } from '../../services/i18n/translations';
import { StatusBar, StatusEffect } from './StatusBar';
import { ActionPips } from './ActionPips';
import { LevelUpModal } from '../panels/LevelUpModal';
import { campaignEventLog } from '../../services/persistence/campaignEventLog';
import { buildCampaignDirectorContext, buildLockedSecretFacts, resolvePositionTarget, positionAdvanceAllowed } from '../../services/dm/campaignDirector';
import { advanceClocksForNight, advanceTurn, applyDeathSaveOutcome, applyLongRest, applyShortRest, resolveConcentrationAfterDamage, resolveMountAfterCombat, resolvePendingSpellRoll, resolveRollPrompt, encounterOutcome, tickRoundEffects, playerResistances, syncCompanionsFromState, worldHourOf, sweepExpiredEffects, levelUpCompanions, getActionCapability, victoryXP } from '../../engine/rulesEngine';
import type { ProposedPlayerAction } from '../../store/gameStore';
import { ProposedActionPrompt } from './ProposedActionPrompt';
import { DeathScreen } from './DeathScreen';
import { ReactionPrompt, ReactionRequest } from './ReactionPrompt';
import { SettingsPanel } from './SettingsPanel';
import type { ClassAbilityId } from '../combat/CombatActionsPanel';
import { AbilityHotbar } from './AbilityHotbar';
import { usePortrait, heroPortraitKey, heroPortraitPrompt } from '../../services/media/portraitService';
import { useSettingsStore, RAIL_WIDTH } from '../../store/settingsStore';
import { lyriaMusicService } from '../../services/media/lyriaMusic';

import { isSystemLine } from '../../engine/utils';
import { buildEntityLexicon, entitiesMentioned, textsCiting } from '../../engine/entities';
import { installQuotaWatch } from '../../services/dm/quotaWatch';
import { dispRace, dispClass } from '../../data/labels';
import { appendCampaignLog, combatChronicle, describeCombatFoes, describeDeparted, describeFightEnd, formatCombatChronicleLine } from '../../services/dm/chronicle';
import { summarizeCurrentChapter } from '../../services/dm/llmService';
import { reconcileMissingDigests, maybeFreezeChapterVolume } from '../../services/dm/chapterChronicle';
import { playDiceRoll, playEndTurn } from '../../services/media/combatSfx';

const RuleCodexPanel = React.lazy(() =>
  import('../panels/RuleCodexPanel').then(module => ({ default: module.RuleCodexPanel }))
);

interface Props {
  character: CharacterSheet;
  adventure: string; // Title + Desc preferably
  adventureManifest?: string; // Generated adventure content
  adventureManifestData?: AdventureManifest | null;
  campaignRuntime: CampaignRuntimeState;
  onLeave: () => void;
  onCharacterUpdate: (char: CharacterSheet) => void;
  language?: Language;
  initialHistory?: { speaker: 'user' | 'dm', text: string }[];
  initialJournal?: {
    briefing?: { prologue: string; objective?: string; threat?: string; location?: string };
    quests: { id: string; title: string; description: string; status: 'active' | 'completed' | 'failed' }[];
    npcs: { id: string; name: string; description: string; location: string }[];
    locations?: { id: string; name: string; description: string }[];
    chronicle?: { id: string; title: string; description: string; timestamp: number }[];
  };
  saveId?: string; // Active save ID for real-time sync
}

export function GameSession({ character, adventure, adventureManifest = '', adventureManifestData = null, campaignRuntime, onLeave, onCharacterUpdate, language = 'en', initialHistory = [], initialJournal, saveId }: Props) {
  const tr = TRANS[language === 'fr' ? 'fr' : 'en'];
  const rail = useRailWidth();
  const [activePanel, setActivePanel] = useState<'none' | 'inventory' | 'character' | 'journal' | 'codex' | 'campaign' | 'spells' | 'settings'>('none');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [playerRoll, setPlayerRoll] = useState<{ result: number, reason: string, success?: boolean } | null>(null);
  // {from, to}: the modal needs the PRE-grant level to count crossed ASI levels
  // (grantXP writes the new level on the sheet before the modal opens).
  const [pendingLevelUp, setPendingLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [floatingXP, setFloatingXP] = useState<{ id: string; amount: number; position: string }[]>([]);
  // UI4 — retour VISIBLE pour les actions refusées : les lignes [SYSTEM] sont
  // filtrées du Chronicle, donc un refus (0 PV, incapacité, économie d'action,
  // moteur) ressemblait à un bouton cassé. Petit toast auto-effaçable.
  const [actionToast, setActionToast] = useState<{ id: number; text: string } | null>(null);
  const actionToastTimerRef = React.useRef<number | null>(null);
  const showActionToast = (text: string) => {
    setActionToast({ id: Date.now(), text });
    if (actionToastTimerRef.current) window.clearTimeout(actionToastTimerRef.current);
    actionToastTimerRef.current = window.setTimeout(() => setActionToast(null), 3200);
  };
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  // NF3 — boutique ouverte par l'outil open_shop du MJ.
  const activeShop = useGameStore(s => s.activeShop);
  const setActiveShop = useGameStore(s => s.setActiveShop);
  const dmLanguage = language === 'fr' ? 'French' : 'English';
  const [codexInitialTab, setCodexInitialTab] = useState<'spell' | 'rule' | 'item' | 'condition' | 'monster'>('spell');
  const [codexInitialQuery, setCodexInitialQuery] = useState('');
  // La carte LOCALE du monstre (components/panels/MonsterCard) a remplacé le
  // cadre vers aidedd.org le 2026-08-29 : illustration, lore et fiche viennent
  // désormais de chez nous, s'affichent hors ligne et sont commercialisables.
  const [activeMonsterCard, setActiveMonsterCard] = useState<string | null>(null);

  const handleOpenMonsterCard = (name: string) => {
    setActiveMonsterCard(name);
  };

  // ui-m5 — Échap ferme l'overlay de référence AU-DESSUS du Codex, pas le
  // Codex en dessous : écouteur en phase capture + stopImmediatePropagation
  // pour passer avant le listener Échap de GameWindow.
  useEffect(() => {
    if (!activeMonsterCard) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      event.preventDefault();
      setActiveMonsterCard(null);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [activeMonsterCard]);

  // ─── Zustand store — single source of truth for shared session state ──────
  const bgImage = useGameStore(s => s.bgImage);
  const isGeneratingImage = useGameStore(s => s.isGeneratingImage);
  const journal = useGameStore(s => s.journal);
  const setJournal = useGameStore(s => s.setJournal);
  const currentRoll = useGameStore(s => s.currentRoll);
  const setCurrentRoll = useGameStore(s => s.setCurrentRoll);
  const activePrompt = useGameStore(s => s.activePrompt);
  const setActivePrompt = useGameStore(s => s.setActivePrompt);
  const proposedActions = useGameStore(s => s.proposedActions);
  const removeProposedAction = useGameStore(s => s.removeProposedAction);
  const clearProposedActions = useGameStore(s => s.clearProposedActions);
  const devMode = useGameStore(s => s.devMode);
  const setDevMode = useGameStore(s => s.setDevMode);
  const pushCombatRoll = useGameStore(s => s.pushCombatRoll);
  const saveHealth = useGameStore(s => s.saveHealth);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Réaction (Bouclier) : carte proposée en plein tour ennemi ───────────
  const [reactionRequest, setReactionRequest] = useState<ReactionRequest | null>(null);
  // Échec de test retenu en attente d'une décision « relancer avec
  // l'Inspiration ? » (façon BG3). Le prompt reste actif tant qu'on délibère.
  const [rerollOffer, setRerollOffer] = useState<{ outcome: any; currency?: 'inspiration' | 'indomitable' } | null>(null);
  // ── Portrait du héros (généré localement, cache IndexedDB) ─────────────
  // Même clé et même prompt que la forge de création (HeroPortraitForge) : si le
  // joueur y a retenu un portrait, il est servi depuis le cache et RIEN n'est
  // régénéré — c'est ce portrait-là qui sert aussi de référence aux images de
  // scène. Sans forge (partie reprise, étape sautée), on retombe sur la
  // génération automatique d'avant.
  const heroPortraitUrl = usePortrait(
    heroPortraitKey(character),
    heroPortraitPrompt(character)
  );
  // ── Volume musique piloté par les Réglages ──────────────────────────────
  const musicVolume = useSettingsStore(s => s.musicVolume);
  useEffect(() => { lyriaMusicService.setVolume(musicVolume); }, [musicVolume]);
  // ── Calendrier en jeu (Jour N — moment) ─────────────────────────────────
  const dayCount = campaignRuntime.dayCount || 1;
  const timeOfDay: TimeOfDay = campaignRuntime.timeOfDay || 'day';
  const timeOfDayLabel = language === 'fr'
    ? ({ dawn: 'Aube', day: 'Journée', dusk: 'Crépuscule', night: 'Nuit' } as const)[timeOfDay]
    : ({ dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night' } as const)[timeOfDay];

  // Surface Firestore write failures as a visible badge — a silent sync failure
  // can otherwise lose minutes of progress without the player ever knowing.
  useEffect(() => {
    saveService.setSyncListener(ok => useGameStore.getState().setSaveHealth(ok));
    return () => saveService.setSyncListener(null);
  }, []);

  // Initialize journal from saved data on mount
  useEffect(() => {
    if (initialJournal) {
      useGameStore.getState().setJournal({
        briefing: initialJournal.briefing,
        quests: initialJournal.quests || [],
        npcs: initialJournal.npcs || [],
        locations: initialJournal.locations || [],
        chronicle: initialJournal.chronicle || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diceTrayRef = useRef<DiceTrayRef>(null);
  const prevTurnRef = useRef<string>('');

  // Log a player roll so it ALWAYS reaches the persistent "Jets" combat HUD (the
  // store's combatRolls), even when the DiceTray panel is unmounted on a narrow /
  // mobile layout and its ref is null. Plain addLog mirrors to the store only via
  // the ref, so on mobile the player's own attack/damage/save rolls silently
  // vanished from the HUD while enemy rolls (which push directly) still showed.
  // Mirrors DiceTray.writeLog: only attack/damage/save feed the HUD; the panel
  // receives every entry through addLogNoMirror when it is mounted.
  const logCombatRoll = (entry: { type: string; name: string; total: number; formula: string; isDM?: boolean; success?: boolean }) => {
    // PL8 — les CHECKS (actions improvisées, tests de compétence en combat)
    // alimentent aussi le HUD des jets : ils n'apparaissaient nulle part quand
    // le panneau DiceTray était fermé.
    if (entry.type === 'attack' || entry.type === 'damage' || entry.type === 'save' || entry.type === 'check') {
      pushCombatRoll({ name: entry.name, total: entry.total, formula: entry.formula, isDM: !!entry.isDM, success: entry.success });
    }
    diceTrayRef.current?.addLogNoMirror?.(entry as any);
  };
  // Runs the mid-combat resume normalization exactly once. When a save is loaded
  // while a fight is active, we hand the turn back to the PLAYER instead of
  // auto-running the saved enemy turns on load (which froze the game).
  const hasResumedCombatRef = useRef(false);
  // Guards maybeEndCombat so victory/defeat is resolved & XP awarded only once
  // per fight. Reset to false whenever a combat becomes active (see effect below).
  const combatEndedRef = useRef(false);
  // Concurrency guard: a player action (attack/spell/dodge/potion) runs async for
  // several seconds (dice animations). Without this lock a second click would
  // start a parallel resolution against the same state — double attacks, races
  // with the roll popup. `isResolvingAction` also drives the disabled UI state.
  const actionLockRef = useRef(false);
  const [isResolvingAction, setIsResolvingAction] = useState(false);

  // === CUSTOM HOOKS ===
  const { transcript, setTranscript, scrollRef: chatScrollRef } = useTranscript(initialHistory);

  const {
    combatState, setCombatState,
    isNPCTurn, setIsNPCTurn,
  } = useCombatState();

  const {
    syncCharacterUpdate, syncCharacterCritical,
    syncJournalUpdate, syncJournalImmediate,
    triggerManualSave, isSaving
  } = useSaveSync({
    saveId, character, adventure, adventureManifest, adventureManifestData, campaignRuntime, transcript, combatState,
    journal: journal as any, language, setTranscript, setJournal: setJournal as any, onCharacterUpdate
  });

  // Journal de session sur disque (logs/sessions/*.jsonl via le serveur local) :
  // capture auditBus + campaignEventLog pour analyse post-partie. Idempotent,
  // et silencieux si le serveur audio n'est pas lancé.
  useEffect(() => {
    sessionTrace.begin({
      saveId,
      character: character?.name,
      classe: character?.class,
      level: character?.level,
      adventure,
      language,
    });
    // begin est one-shot : pas de cleanup, la trace suit toute la session.
  }, [saveId, character?.name, character?.class, character?.level, adventure, language]);

  // Auto-select target on combat change
  useEffect(() => {
    if (combatState.isActive) {
      combatEndedRef.current = false; // a fresh/active combat can end again
      // Chronique de combat (module partagé — voir gameStore.combatChronicle) :
      // PV capturés à l'OUVERTURE, pour la ligne-résumé du log de campagne.
      combatChronicle.begin(useGameStore.getState().character?.hp.current ?? 0);
      // CB3 — seuls les VRAIS ennemis sont auto-ciblables : avec !isPlayer, un
      // compagnon à la meilleure initiative devenait la cible sélectionnée et
      // l'attaque du joueur partait sur son propre allié.
      const livingEnemies = combatState.combatants.filter(c => combatantSide(c) === 'enemy' && c.hp.current > 0);
      // Sorts de ZONE — 'all_enemies'/'all_combatants' (et les listes d'ids
      // « a,b,c ») sont des sélections VALIDES, pas des ids : sans cette garde,
      // l'effet écrasait le choix « tous les ennemis » par le 1er ennemi avant
      // même que le joueur puisse lancer le sort.
      const isAoESelection = selectedTargetId === 'all_enemies' || selectedTargetId === 'all_combatants'
        || selectedTargetId.includes(',');
      if (livingEnemies.length > 0) {
        if (!isAoESelection && (!selectedTargetId || !livingEnemies.some(e => e.id === selectedTargetId))) {
          setSelectedTargetId(livingEnemies[0].id);
        }
      } else {
        const otherLiving = combatState.combatants.filter(c => c.hp.current > 0);
        if (otherLiving.length > 0 && (!selectedTargetId || !otherLiving.some(e => e.id === selectedTargetId))) {
          setSelectedTargetId(otherLiving[0].id);
        }
      }
    } else {
      setSelectedTargetId('');
    }
  }, [combatState.isActive, combatState.combatants, selectedTargetId]);

  const statusEffects = useMemo<StatusEffect[]>(() => (character.activeEffects || []).map(effect => ({
    id: effect.id,
    name: effect.name,
    icon: effect.source === 'condition' ? 'zap' : effect.modifiers.some(mod => mod.stat === 'AC') ? 'shield' : 'sparkle',
    type: effect.source === 'condition' ? 'condition' : effect.modifiers.some(mod => mod.bonus < 0) ? 'debuff' : 'buff',
    bonus: effect.modifiers.length
      ? effect.modifiers.map(mod => mod.setTo !== undefined ? `${mod.stat}=${mod.setTo}` : `${mod.stat} ${mod.bonus >= 0 ? '+' : ''}${mod.bonus}`).join(', ')
      : (effect.description || effect.duration),
    duration: effect.roundsRemaining,
    source: effect.source,
  })), [character.activeEffects]);

  const handleRemoveEffect = useCallback((id: string) => {
    syncCharacterCritical({
      ...character,
      activeEffects: (character.activeEffects || []).filter(effect => effect.id !== id),
    }, 'hp');
  }, [character, syncCharacterCritical]);

  const handleInventoryCharacterUpdate = useCallback((updated: CharacterSheet) => {
    const hpChanged = updated.hp.current !== character.hp.current || updated.hp.max !== character.hp.max || updated.tempHP !== character.tempHP;
    if (hpChanged) {
      syncCharacterCritical(updated, 'hp');
    }
    syncCharacterUpdate(updated);
  }, [character, syncCharacterCritical, syncCharacterUpdate]);

  // ========== UNIFIED XP GRANTING ==========
  const grantXP = (amount: number, reason: string) => {
    if (amount <= 0) return;
    // Read the FRESH character from the store (not the render closure) so two grants
    // in quick succession (e.g. maybeEndCombat + end_combat) both accumulate instead
    // of the second overwriting the first on a stale base.
    const currentChar = useGameStore.getState().character;
    if (!currentChar) return;
    const newXP = currentChar.xp + amount;
    const newLevel = calculateLevelFromXP(newXP);

    // Add floating XP notification
    const id = `xp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setFloatingXP(prev => [...prev, { id, amount, position: 'random' }]);
    setTimeout(() => {
      setFloatingXP(prev => prev.filter(x => x.id !== id));
    }, 3000);

    if (newLevel > currentChar.level) {
      // Canonical hit dice for ALL 12 playable classes (was missing Barbarian/Monk/
      // Warlock → Barbarian wrongly got d8; 'Wizard' was a phantom key — the class is 'Mage').
      const classHitDice: Record<string, number> = {
        Fighter: 10, Paladin: 10, Ranger: 10, Barbarian: 12, Cleric: 8, Rogue: 8, Druid: 8,
        Bard: 8, Monk: 8, Warlock: 8, Mage: 6, Sorcerer: 6,
      };
      const hitDie = classHitDice[currentChar.class] || 8;
      const conMod = Math.floor((getEffectiveStat(currentChar, 'CON') - 10) / 2);
      // House rule (généreux, assumé) : chaque niveau donne le MAX du dé de vie
      // + mod CON — jamais la moyenne, jamais de jet. Un gros grant d'XP peut
      // faire sauter plusieurs niveaux d'un coup : on crédite CHAQUE niveau
      // gagné (l'ancien code n'ajoutait qu'un seul gain de PV même pour +2 niveaux).
      const levelsGained = newLevel - currentChar.level;
      const perLevelGain = Math.max(1, hitDie + conMod)
        + ((currentChar as any).subclass === 'Draconic Bloodline' ? 1 : 0)
        + ((currentChar.feats || []).includes('tough') ? 2 : 0)
        // DA5 — Robustesse naine : +1 PV/niveau du Nain des collines.
        + racialHPBonusPerLevel(currentChar);
      const hpGain = levelsGained * perLevelGain;
      const newMaxHP = currentChar.hp.max + hpGain;

      syncCharacterCritical({
        ...currentChar, xp: newXP, level: newLevel,
        hp: { current: newMaxHP, max: newMaxHP }
      }, 'level');

      setPendingLevelUp({ from: currentChar.level, to: newLevel });
      // (Audit : la fausse ligne joueur « [SYSTEM: reached level…] » a été
      // retirée — elle n'atteignait plus personne ; le MJ apprend le niveau via
      // le contexte directeur et le log de campagne 'levelup'.)
      setTranscript(prev => [...prev,
      { speaker: 'dm', text: tr.levelUpLine(newLevel, newMaxHP) }
      ]);
    } else {
      syncCharacterCritical({ ...currentChar, xp: newXP }, 'xp');
    }

    setTranscript(prev => [...prev, {
      speaker: 'dm', text: `⭐ +${amount} XP (${reason}) — Total: ${newXP}`
    }]);

    // La CHRONIQUE est réservée aux vrais moments d'histoire (audit 2026-08-21) :
    // une ligne par gain d'XP la noyait sous « Victoire au combat — +200 XP »,
    // au point que les beats narratifs y étaient introuvables. Les montées de
    // NIVEAU restent, elles : c'est un jalon de récit.
    if (newLevel > currentChar.level) {
      const chronicleEntry = {
        id: `xp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: reason,
        description: tr.xpChronicleDesc(amount, newXP),
        timestamp: Date.now()
      };
      setJournal(prev => {
        const updated = { ...prev, chronicle: [...(prev.chronicle || []), chronicleEntry] };
        syncJournalImmediate(updated);
        return updated;
      });
    }
  };

  // We need isConnected for musicDirector, but useDMConnection comes after.
  // We can use a ref or just rely on react reactivity, but since useTagProcessor uses refs for deps,
  // we can declare processMessage first, pass a placeholder musicDirector or one that uses a ref to isConnected.
  // Actually, we'll just put things in standard order.
  
  const openingKickoffSentRef = useRef(false);

  const musicDirector = useMusicDirector({
    enabled: true,
    isConnected: true // We can always try to connect lyria, independent of DM connection
  });

  const processMessage = useCallback((speaker: 'user' | 'dm', text: string) => {
    setTranscript(prev => {
      if (!text.trim()) return prev;
      campaignEventLog.append(
        speaker === 'user' ? 'PLAYER_SPOKE' : 'DM_NARRATED',
        `${speaker === 'user' ? 'Player' : 'DM'}: ${text.slice(0, 80)}`,
        { text }
      );
      const newHistory = [...prev];
      // IJ3 (audit trame) — ne JAMAIS fusionner de la narration dans une ligne
      // système `*[...]*` : le texte du MJ devenait invisible (filtré comme
      // ligne système) pour le résumé, la restauration et le keeper.
      const last = newHistory[newHistory.length - 1];
      if (last && last.speaker === speaker && !last.text.trimStart().startsWith('*[') && !text.trimStart().startsWith('*[')) {
          last.text = mergeTranscriptText(last.text, text);
          return newHistory;
      }
      return [...newHistory, { speaker, text }];
    });
  }, [setTranscript]);

  // GS16 — version d'événements RÉACTIVE : `getEvents().length` lu dans les
  // deps d'un useMemo est un mutable hors React ; les appends d'événements
  // moteur ne re-rendaient pas, le contexte directeur restait périmé.
  const [eventVersion, setEventVersion] = useState(0);
  useEffect(() => campaignEventLog.subscribe(() => setEventVersion(v => v + 1)), []);
  // M3 (2026-08-29) — le résumé cumulatif était lu dans ce memo SANS dépendance :
  // adopté après la connexion (archive Firestore), il n'atteignait le MJ qu'au
  // battement de 8 min. L'abonnement recalcule le bloc ET force son envoi.
  const [summaryVersion, setSummaryVersion] = useState(0);
  useEffect(() => memoryManager.subscribe(() => setSummaryVersion(v => v + 1)), []);
  // Item 3b : le premier refus de quota du jour finit dans le journal de campagne.
  useEffect(() => installQuotaWatch(), []);
  // Le LEXIQUE d'entités (2026-08-29) — un seul apparieur pour l'auditeur
  // (secrets verrouillés), le rappel de faits canon et le rappel PNJ. Clé sur
  // le NOM du héros, pas l'objet : le personnage ne sert qu'à l'exclure, et
  // l'objet change à chaque point de vie — le lexique se recalculait pour rien
  // et relançait le rappel sur la même réplique (voir hooks/useMemoryRecall).
  const heroName = character?.name;
  const entityLexicon = useMemo(() => buildEntityLexicon({ manifest: adventureManifestData, journal: journal as any, character: heroName ? { name: heroName } as any : null }), [adventureManifestData, journal, heroName]);

  const directorContext = useMemo(() => buildCampaignDirectorContext({
    character,
    adventure,
    adventureManifest: adventureManifestData,
    manifestoText: adventureManifest,
    campaignRuntime,
    journal: journal as any,
    combatState,
    events: campaignEventLog.getEvents(),
    storySummary: memoryManager.getCachedSummary()?.text,
  }), [
    character,
    adventure,
    adventureManifest,
    adventureManifestData,
    campaignRuntime,
    journal,
    combatState,
    transcript.length,
    // Recompute when events change too — media events (ASSET_GENERATED) and other
    // engine events append to the log WITHOUT touching transcript.length, so the
    // director context's event slice would otherwise go stale after them.
    eventVersion,
    summaryVersion,
  ]);

  const { processToolCall } = useToolProcessor({
    diceTrayRef,
    grantXP,
    syncCharacterUpdate,
    syncCharacterCritical,
    syncJournalUpdate,
    syncJournalImmediate,
    musicDirector
  });

  const {
    dm, isConnected, audioLevel, isMicOn, isReconnecting,
    reconnectAttempt, reconnectFailed, connectionError, queuedMessageCount, setReconnectFailed, setConnectionError, toggleMic
  } = useDMConnection({
    character, adventure, adventureManifest, language: dmLanguage, initialHistory, directorContext,
    onMessage: processMessage,
    onReconnectSuccessUpdate: () => {
      setTranscript(prev => [...prev, { speaker: 'dm', text: tr.connectionRestored }]);
    },
    onReconnectFailedSave: triggerManualSave,
    onToolCall: processToolCall
  });

  const reconnectSeconds = useReconnectCountdown(isReconnecting, RECONNECT_WINDOW_S * 1000);
  // Lot D mobile : l'écran ne s'éteint pas pendant la partie — sans ça le
  // WebSocket Live meurt au verrouillage et chaque reconnexion coûte un crédit.
  useWakeLock(isConnected);

  useEffect(() => {
    if (!dm || !isConnected || openingKickoffSentRef.current) return;
    if (initialHistory.length > 0 || transcript.length > 0) return;
    const firstScene = adventureManifestData?.firstScene;
    if (!firstScene) return;

    openingKickoffSentRef.current = true;
    campaignEventLog.append('SCENE_CHANGED', `Opening scene locked: ${firstScene.title}`, {
      firstScene,
      policy: 'locked_first_scene',
    });
    void dm.sendUserMessage([
      '[PRIVATE_DM_CONTEXT - do not narrate this block]',
      `Locked first scene: ${firstScene.title}`,
      `Location: ${firstScene.location}`,
      `Objective: ${firstScene.objective}`,
      `Setup: ${firstScene.setup}`,
      `Opening question: ${firstScene.openingQuestion || 'What do you do?'}`,
      '[/PRIVATE_DM_CONTEXT]',
      '',
      `Begin by narrating a comprehensive prologue to kick off the campaign. Write EVERYTHING exclusively in ${dmLanguage} — do not translate or repeat any part in another language. This prologue must serve as a true introduction based on the character sheet (${character.name}, a ${character.race} ${character.class}) and the chosen adventure. It must answer these five questions:`,
      '1. QUI (Who: define the character, their appearance, class, background, and features).',
      '2. QUOI (What: define their quest, objective, or the looming villain/threat).',
      '3. COMMENT (How: their physical situation, current state, or preparation/equipment).',
      '4. QUAND (When: the season, time of day, or historic timing of the start).',
      '5. POURQUOI (Why: why they are embarking on this quest, their destiny, or their core motivation).',
      '',
      'After this structured prologue narration, transition seamlessly to setting up the first playable scene (setup: ' + firstScene.setup + ', location: ' + firstScene.location + ') and ask the opening question to start the gameplay. Keep the overall description concise (around 3-5 cinematic paragraphs in total). Do not request a roll until the player declares a risky action.',
    ].join('\n'));
  }, [dm, isConnected, initialHistory.length, transcript.length, adventureManifestData, character]);

  useEffect(() => {
    if (audioLevel > 0.1) {
      musicDirector.onDMSpeechActivity(true);
    } else {
      musicDirector.onDMSpeechActivity(false);
    }
  }, [isConnected, audioLevel, musicDirector]);

  // ── Voice-mode director context push ─────────────────────────────────────
  // consumePrivateContext only piggybacks the director context on TYPED messages,
  // so in pure-voice play the DM's view of HP, clocks, scene, and canon facts
  // silently drifted. Push it as a private note when a SIGNIFICANT part of the
  // state changes (not on every narration): flushDirectorContext enforces a
  // 30s min interval and skips identical contexts.
  const directorPushKeyRef = React.useRef('');
  useEffect(() => {
    if (!dm || !isConnected) return;
    dm.updateDirectorContext(directorContext);
    const significanceKey = [
      character.hp.current, character.hp.max, character.level,
      character.deathSaves ? `${character.deathSaves.successes}/${character.deathSaves.failures}` : '-',
      combatState.isActive ? `combat:r${combatState.round || 1}` : 'free',
      campaignRuntime.currentChapterId || '', campaignRuntime.currentSceneId || '',
      (campaignRuntime.worldClocks || []).map(c => `${c.id}:${c.stage}:${c.status}`).join(','),
      (campaignRuntime.canonFacts || []).length,
      campaignRuntime.activeBranch?.id || '',
      // Le NOMBRE de quêtes actives ne suffisait pas : cocher la dernière étape
      // ne changeait pas la clé, donc le rappel « toutes les étapes sont faites,
      // pense à complete_quest » du contexte directeur n'était JAMAIS poussé et
      // les quêtes restaient actives à 3/3. On signe l'avancement des étapes.
      (journal.quests || [])
        .filter((q: any) => q.status === 'active')
        .map((q: any) => `${q.id}:${(q.steps || []).filter((s: any) => s.done).length}/${(q.steps || []).length}`)
        .join(','),
      (journal.npcs || []).length,
      summaryVersion,
    ].join('|');
    if (directorPushKeyRef.current === significanceKey) return;
    const isFirstRun = directorPushKeyRef.current === '';
    // The initial context already ships inside the system prompt at connection.
    if (isFirstRun) { directorPushKeyRef.current = significanceKey; return; }
    // DC2 (audit trame) — flushDirectorContext peut REFUSER (throttle 30 s,
    // file pleine). Avant, la clé était consommée quand même : le changement
    // suivant identique ne re-tentait jamais et la mise à jour était perdue.
    if (dm.flushDirectorContext()) {
      directorPushKeyRef.current = significanceKey;
    } else {
      const retry = window.setTimeout(() => {
        if (dm.flushDirectorContext()) directorPushKeyRef.current = significanceKey;
      }, 31_000);
      return () => window.clearTimeout(retry);
    }
  }, [dm, isConnected, directorContext]);

  // DC3 (audit trame) — battement de trame : en longue session vocale calme,
  // le contexte directeur (chapitre, objectif, promesses) recule hors de
  // l'attention du modèle. Toutes les 4 minutes, le renvoyer de force même
  // inchangé — c'est un RAPPEL, pas une notification de changement.
  // Cadence portée à 8 min (contre-audit 2026-08-22) : le battement n'est plus
  // le seul filet — une COMPRESSION détectée via usageMetadata déclenche
  // désormais un renvoi immédiat (geminiRealtime), ce qui est le vrai moment
  // utile. Et le gate de silence garantit qu'il ne coupe plus le MJ.
  useEffect(() => {
    if (!dm || !isConnected) return;
    const beat = window.setInterval(() => { dm.flushDirectorContext(0, true); }, 480_000);
    return () => window.clearInterval(beat);
  }, [dm, isConnected]);

  // ── Narration consistency auditor (light verifier agent) ─────────────────
  // Throttled async Flash pass comparing the DM's latest narration to the REAL
  // engine state (HP, gold, inventory, combat). On a clear contradiction it
  // sends a private corrective note so the DM realigns in the next beat —
  // invisible to the player, at most one check per 4 min (auditCadenceDue).
  const lastNarrationAuditRef = React.useRef({ at: 0, transcriptLen: 0, text: '', stateHash: '' });
  useEffect(() => {
    if (!dm || !isConnected || transcript.length === 0) return;
    const last = transcript[transcript.length - 1];
    if (last.speaker !== 'dm') return;
    if (/^\s*\*?\[/.test(last.text.trim())) return; // skip [SYSTEM]/marker lines
    if (last.text.trim().length < 120) return;      // too short to contradict anything material
    // Signet numéro ET texte (narrationUnseen) : une tirade qui grandit après un
    // outil ou une coupure gardait son numéro et n'était plus jamais examinée.
    if (!narrationUnseen({ len: lastNarrationAuditRef.current.transcriptLen, text: lastNarrationAuditRef.current.text }, transcript.length, last.text)) return;

    const runtimeNow = useGameStore.getState().campaignRuntime;
    const activeQuestLine = (useGameStore.getState().journal?.quests || [])
      .filter((q: any) => q.status === 'active')
      .slice(0, 2)
      .map((q: any) => q.title)
      .join(' | ');
    const stateFacts = [
      `Player ${character.name} HP: ${character.hp.current}/${character.hp.max}${character.tempHP ? ` (+${character.tempHP} temp)` : ''}`,
      `Level: ${character.level}, XP: ${character.xp}`,
      `Gold purse: ${character.gold ?? 0} gp`,
      `Inventory: ${(character.inventory || []).slice(0, 25).map(i => `${i.name} x${i.quantity}`).join(', ') || 'empty'}`,
      combatState.isActive
        ? `Combat ACTIVE round ${combatState.round || 1}: ${combatState.combatants.map((cb: any) => `${cb.name} HP ${cb.hp.current}/${cb.hp.max}`).join(', ')}`
        : 'No active combat',
      // Dérive narrative : l'objectif courant fait partie de l'état vérifié —
      // une narration partie ailleurs sans transition se fait ré-ancrer.
      ...(runtimeNow.currentObjective ? [`Current campaign objective: ${runtimeNow.currentObjective}`] : []),
      ...(activeQuestLine ? [`Active quests: ${activeQuestLine}`] : []),
      `In-world time: Day ${runtimeNow.dayCount || 1}, ${runtimeNow.timeOfDay || 'day'}`,
    ];
    // C1 — les secrets dont le chapitre de révélation n'est pas atteint, verrou
    // CALCULÉ depuis la position réelle. Calculés AVANT la cadence : si la
    // narration cite le nom de l'un d'eux, le contrôle part sans attendre.
    const lockedSecrets = buildLockedSecretFacts(adventureManifestData, runtimeNow);
    const secretMentioned = lockedSecrets.length > 0 && textsCiting(lockedSecrets, entityLexicon, entitiesMentioned(entityLexicon, last.text), { max: 1 }).length > 0;
    // Cadence (2026-08-29) : 4 min si l'état vérifié a bougé, 12 min sinon —
    // et tout de suite (plancher 90 s) sur un nom de secret verrouillé. La
    // porte « état inchangé » seule avait éteint l'auditeur en dialogue calme.
    const now = Date.now();
    const stateHash = stateFacts.join('|');
    if (!auditCadenceDue({ now, lastAt: lastNarrationAuditRef.current.at, lastStateHash: lastNarrationAuditRef.current.stateHash, stateHash, combatActive: combatState.isActive, secretMentioned })) return;
    lastNarrationAuditRef.current = { at: now, transcriptLen: transcript.length, text: last.text, stateHash };
    void auditNarration({ narration: last.text, stateFacts, lockedSecrets, language }).then(result => {
      if (!result || result.consistent || !result.note) return;
      auditBus.publish('gemini-system', `Consistency check flagged${result.leak ? ' (SECRET LEAK)' : ''}: ${result.note.slice(0, 80)}`, { note: result.note, leak: result.leak, narration: last.text });
      // Une fuite ne se corrige pas comme un chiffre faux : le mal est dit, on
      // ne demande pas de rétablir une valeur mais de RE-COUVRIR — rendre la
      // révélation douteuse plutôt que de la confirmer.
      dm.sendSystemMessage(result.leak
        ? `[SYSTEM] SECRET GATE — your last narration stated a DM-only secret whose reveal chapter is not reached: ${result.note} Do NOT correct this aloud and do not repeat it. From now on, treat it as an unverified claim: let the speaker be uncertain, mistaken or self-serving, and keep the confirmation for its proper chapter.`
        : `[SYSTEM] Consistency check — the engine state disagrees with your last narration: ${result.note} Honor the engine values from now on; do not announce a correction, just weave the true state into the fiction.`);
    });
  }, [dm, isConnected, transcript, character, combatState, language, adventureManifestData, entityLexicon]);

  // ── Greffier de journal (background scribe) ──────────────────────────────
  // Toutes les ~2 min hors combat, relit le dialogue récent et consigne ce que
  // le MJ vocal a oublié : NOUVELLES QUÊTES, quêtes ACCOMPLIES, étapes
  // franchies, moments de chronique, faits sur les PNJ. Applique via les MÊMES
  // outils que le MJ — aucune plomberie parallèle.
  // Curseur à -1 = pas encore amorcé (voir plus bas : le transcript restauré
  // n'arrive qu'après le premier rendu).
  const journalKeeperRef = React.useRef({ at: 0, transcriptLen: -1, running: false, startedAt: 0, pass: 0 });
  // Démarre à « maintenant » : la première avance possible est à 10 min de jeu,
  // pas à la 2e minute (audit du 2026-08-29) — le temps que la scène se pose.
  const positionAdvanceRef = React.useRef(Date.now());
  useEffect(() => {
    if (!isConnected || combatState.isActive) return;
    const now = Date.now();
    const ref = journalKeeperRef.current;
    // Curseur amorcé à la PREMIÈRE exécution réelle, pas au premier rendu : le
    // transcript restauré arrive dans un effet de montage (useTranscript), donc
    // l'ancien `useRef(transcript.length)` valait TOUJOURS 0 à la reprise — le
    // greffier re-dépouillait des heures d'historique déjà consigné.
    if (ref.transcriptLen < 0) {
      ref.transcriptLen = transcript.length;
      return;
    }
    // Passe bloquée > 3 min (requête pendue, sans timeout côté SDK) : on la
    // considère morte, sinon `running` restait vrai pour toute la session.
    if (ref.running && now - ref.startedAt < 180_000) return;
    if (now - ref.at < 120_000) return;
    // Fenêtre OUVERTE jusqu'à la fin du transcript (et non un bloc figé de 40) :
    // avec l'ancien `slice(cursor, cursor + 40)`, une fenêtre saturée de lignes
    // [SYSTEM] — typiquement l'après-combat — restait sous le seuil de 8 lignes
    // utiles, le curseur n'avançait jamais, et le greffier était MORT pour le
    // reste de la partie. Ici, chaque nouvelle réplique entre dans la fenêtre.
    const pending = transcript.slice(ref.transcriptLen);
    const freshAll = pending.filter(m => !/^\s*\*?\[/.test(m.text.trim()));
    if (freshAll.length < 8) return;
    // On n'envoie au modèle que les 40 dernières répliques utiles (une reprise
    // ou un long silence peut en accumuler beaucoup plus).
    const fresh = freshAll.slice(-40);
    const consumedUpTo = transcript.length;
    const previousCursor = ref.transcriptLen;
    ref.at = now;
    ref.transcriptLen = consumedUpTo;
    ref.running = true;
    ref.startedAt = now;
    // Identifiant de passe : une passe zombie qui se réveille après le timeout
    // ne doit pas libérer le verrou de la passe qui l'a remplacée.
    const passId = ++ref.pass;

    const journalNow = useGameStore.getState().journal;
    const activeQuests = (journalNow.quests || [])
      .filter((q: any) => q.status === 'active')
      .map((q: any) => `${q.title} — steps: ${(q.steps || []).map((s: any) => `${s.done ? '[x]' : '[ ]'} ${s.text}`).join('; ') || 'none'}`);
    // A1 — la position courante et la suivante (~300 car.) : le greffier dit
    // si la fiction les a atteintes, le moteur décide de la cible.
    const keeperPosition = (() => {
      const rtNow = useGameStore.getState().campaignRuntime;
      const chapters = adventureManifestData?.chapters || [];
      const ci = chapters.findIndex(c => c.id === rtNow.currentChapterId);
      if (ci < 0) return undefined;
      const scenes = chapters[ci].scenes || [];
      const si = scenes.findIndex(sc => sc.id === rtNow.currentSceneId);
      const label = (x?: { id?: string; title?: string }) => x ? `${x.id} — ${x.title}` : undefined;
      return { chapter: `${chapters[ci].id} — ${chapters[ci].title}: ${String(chapters[ci].objective || '').slice(0, 160)}`,
        scene: label(scenes[si]), nextScene: label(scenes[si + 1]), nextChapter: label(chapters[ci + 1]) };
    })();
    const input = {
      transcriptLines: fresh
        // 300 caractères coupaient les tirades du MJ (souvent 1000-2000) en
        // plein milieu : le greffier lisait les préambules et jamais les
        // dénouements — exactement ce qu'il est censé consigner. On garde le
        // début ET la fin des très longues répliques.
        .map(m => {
          const t = m.text;
          const body = t.length > 1200 ? `${t.slice(0, 700)} […] ${t.slice(-500)}` : t;
          return `${m.speaker === 'dm' ? 'DM' : 'PLAYER'}: ${body}`;
        }),
      activeQuests,
      completedQuests: (journalNow.quests || [])
        .filter((q: any) => q.status === 'completed')
        .slice(-12)
        .map((q: any) => q.title),
      npcNames: (journalNow.npcs || []).map((n: any) => n.name),
      recentMoments: (journalNow.chronicle || []).slice(-14).map((c: any) => String(c.title || '').replace(/^\[J\d+\]\s*/, '')),
      language,
      position: keeperPosition,
    };
    void runJournalKeeper(input).then(async result => {
      if (passId !== journalKeeperRef.current.pass) return; // passe périmée
      if (!result) {
        // Passe ratée (réseau, quota, JSON) : RENDRE la fenêtre, sinon ces
        // répliques ne sont jamais réexaminées — elles étaient consommées
        // avant même l'appel.
        journalKeeperRef.current.transcriptLen = previousCursor;
        return;
      }
      const applied: string[] = [];
      // Les NOUVELLES quêtes d'abord : une étape ou une complétion peut porter
      // sur une quête créée dans la même passe.
      for (const quest of result.newQuests || []) {
        const r: any = await processToolCall({ name: 'add_quest', args: { title: quest.title, description: quest.description, steps: quest.steps } });
        if (r?.success) applied.push(`quête « ${quest.title.slice(0, 50)} »`);
      }
      for (const step of result.questStepUpdates) {
        const r: any = await processToolCall({ name: 'update_quest_step', args: { questTitle: step.questTitle, step: step.stepText, done: step.done } });
        if (r?.success) applied.push(`étape « ${step.stepText.slice(0, 50)} »`);
        // Un refus silencieux était la norme (le greffier ne pouvait pas créer
        // de quête) : on le trace désormais au lieu de le jeter.
        else auditBus.publish('engine', `Greffier : étape refusée (${step.questTitle})`, r);
      }
      for (const done of result.questCompletions || []) {
        const r: any = await processToolCall({ name: 'complete_quest', args: { title: done.questTitle } });
        if (r?.success) applied.push(`quête accomplie « ${done.questTitle.slice(0, 50)} »`);
        else auditBus.publish('engine', `Greffier : complétion refusée (${done.questTitle})`, r);
      }
      for (const moment of result.moments) {
        const r: any = await processToolCall({ name: 'add_story_moment', args: { title: moment.title, description: moment.description } });
        if (r?.success) applied.push(`moment « ${moment.title.slice(0, 50)} »`);
      }
      for (const fact of result.npcFacts) {
        let r: any = await processToolCall({ name: 'update_npc', args: { name: fact.name, memory: fact.fact } });
        if (!r?.success) {
          // TR5 (audit trame) — PNJ absent du journal : le créer puis re-poser
          // le fait, sinon la mémoire des PNJ « croisés en passant » se perdait.
          const created: any = await processToolCall({ name: 'add_npc', args: { name: fact.name, description: fact.fact } });
          if (created?.success) r = await processToolCall({ name: 'update_npc', args: { name: fact.name, memory: fact.fact } });
        }
        if (r?.success) applied.push(`PNJ ${fact.name}`);
      }
      for (const line of result.logLines || []) {
        appendCampaignLog('note', line);
      }
      if (result.logLines?.length) applied.push(`${result.logLines.length} ligne(s) de trame`);
      if (result.positionReached && positionAdvanceAllowed({ evidence: result.positionReached.evidence, lastAt: positionAdvanceRef.current, now: Date.now() })) {
        const st = useGameStore.getState();
        const target = resolvePositionTarget(st.adventureManifestData, st.campaignRuntime, result.positionReached.target);
        if (target) {
          positionAdvanceRef.current = Date.now();
          const r: any = await processToolCall({ name: 'set_campaign_position', args: target });
          if (r?.success) applied.push(`position → ${target.chapterId}${target.sceneId ? `/${target.sceneId}` : ''}`);
          auditBus.publish('engine', `Greffier : avance de position (${result.positionReached.target}) — ${result.positionReached.evidence.slice(0, 120)}`, r);
        }
      }
      if (applied.length) {
        auditBus.publish('gemini-system', `Journal keeper logged: ${applied.join(', ')}`, result);
        campaignEventLog.append('JOURNAL_UPDATED', `Journal keeper (background) logged: ${applied.join(', ')}`, result as any);
      } else {
        // Trace explicite du « rien à signaler » : sans elle, un greffier muet
        // et un greffier en panne étaient rigoureusement indiscernables.
        auditBus.publish('engine', 'Greffier : passe terminée, rien à consigner');
      }
    })
      // Sans ce catch, une exception dans l'un des await tuait tous les items
      // SUIVANTS (dont les lignes de trame, appliquées en dernier).
      .catch(e => { auditBus.publish('engine', 'Greffier : passe interrompue', String(e)); })
      .finally(() => {
        if (passId === journalKeeperRef.current.pass) journalKeeperRef.current.running = false;
      });
  }, [isConnected, transcript, combatState.isActive, language, processToolCall]);

  // ── TR1 (audit trame) — rappel PNJ et faits canon cachés ─────────────────
  // Le bloc directeur ne porte que les ~8 derniers PNJ et une partie des faits :
  // quand une réplique (MJ ou joueur) nomme ce qu'il ne voit plus, on le lui
  // souffle. Mécanique, signet et pièges : hooks/useMemoryRecall.
  useMemoryRecall({
    dm, isConnected, transcript, lexicon: entityLexicon,
    getNpcs: () => (useGameStore.getState().journal.npcs || []) as any[],
    getFacts: () => useGameStore.getState().campaignRuntime?.canonFacts || [],
  });

  // ── Résumé roulant du chapitre courant (log/secrétaire/résumeur) ─────────
  // Toutes les 60 s : si ≥50 messages se sont accumulés depuis le dernier
  // passage, condenser fenêtre récente + log du chapitre en ≤100 mots (EN).
  // Les chapitres CLOS ont leurs digests figés ; seul le courant roule.
  const rollingSummaryRef = React.useRef({ atCount: 0, running: false });
  useEffect(() => {
    const timer = window.setInterval(() => {
      const ref = rollingSummaryRef.current;
      if (ref.running) return;
      const history = memoryManager.getChatHistory();
      // La purge 15K raccourcit brutalement l'historique : sans recalage, le
      // marque-page pointait au-delà de la fin et le résumé roulant se figeait
      // pendant des heures (audit utilisateur).
      if (ref.atCount > history.length) ref.atCount = history.length;
      if (history.length - ref.atCount < 50) return;
      ref.running = true;
      ref.atCount = history.length;
      const rt = useGameStore.getState().campaignRuntime;
      const chapterLog = (rt.campaignLog || [])
        .filter(l => !rt.currentChapterId || !l.chapterId || l.chapterId === rt.currentChapterId)
        .map(l => `[D${l.day}] ${l.text}`);
      // D2 — FILET DE VOLUME : un chapitre qui dure fait geler un digest sans
      // attendre l'avance de position. Même cadence que le résumé roulant, et
      // best-effort : c'est ce qui rend la mémoire longue indépendante de la
      // discipline du MJ (séance du 23/08 : six jours de jeu sur la position
      // 1/1a, donc zéro digest et un journal qui s'évinçait en silence).
      void maybeFreezeChapterVolume();
      void summarizeCurrentChapter(history.slice(-40), chapterLog, useGameStore.getState().character?.name || 'Hero', rt.currentChapterSummary || '')
        .then(text => {
          if (!text) return;
          useGameStore.getState().setCampaignRuntime(prev => ({ ...prev, currentChapterSummary: text, updatedAt: Date.now() }));
        })
        .finally(() => { rollingSummaryRef.current.running = false; });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // IJ8 (audit trame) — après une reconnexion Live, repousser le contexte SI
  // il a changé depuis celui embarqué dans le prompt de la nouvelle connexion
  // (connect() le marque « déjà envoyé » : la dédup évite le doublon constaté
  // à l'audit ; une reprise par handle avec contexte frais passe, elle).
  const wasConnectedOnceRef = React.useRef(false);
  useEffect(() => {
    if (!dm || !isConnected) return;
    if (!wasConnectedOnceRef.current) { wasConnectedOnceRef.current = true; return; }
    const t = window.setTimeout(() => { dm.flushDirectorContext(0); }, 4000);
    return () => window.clearTimeout(t);
  }, [dm, isConnected]);

  // Filet de rattrapage des digests (exigence « un résumé de chapitre quoi
  // qu'il en soit ») : au démarrage, geler les chapitres terminés qui ont des
  // lignes de log mais pas de digest (échec réseau passé, ancien outil).
  useEffect(() => {
    const t = window.setTimeout(() => { void reconcileMissingDigests(); }, 15_000);
    return () => window.clearTimeout(t);
  }, []);

  // ── Fix #3: DEATH SAVES — auto-trigger at HP=0 ──────────────────────────────
  // C2 — UN jet de mort par ROUND, jamais en chaîne. L'ancienne clé
  // successes:failures changeait après chaque jet et re-déclenchait
  // immédiatement le prompt suivant : le héros enchaînait 3-5 jets en quelques
  // secondes et mourait avant que quiconque puisse le secourir. La clé est
  // maintenant le numéro de round (le joueur à 0 PV est retiré de la rotation
  // d'initiative, son « tour » est le wrap de round) ; hors combat — ou si le
  // round est figé (défaite, boucle arrêtée) — une cadence de 12 s fait office
  // de rounds narratifs.
  const lastDeathSavePromptKeyRef = React.useRef<string | null>(null);
  const [deathSaveTick, setDeathSaveTick] = useState(0);
  useEffect(() => {
    const deathSaves = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const needsDeathSave = character.hp.current <= 0 && !deathSaves.isStable && !deathSaves.isDead;
    if (!needsDeathSave) {
      lastDeathSavePromptKeyRef.current = null;
      return;
    }
    if (!dm || !isConnected || activePrompt?.type === 'DEATH_SAVE') return;

    // GS8 (contre-audit) — EN combat, la clé n'inclut plus le tick : un round
    // multi-ennemis dure facilement > 12 s (animations) et le héros enchaînait
    // ~2 jets par round, contre l'intention « UN par round ». Le tick ne cadence
    // que le hors-combat ; en combat, un filet long (40 s) couvre le cas d'un
    // round réellement figé. Timer désormais nettoyé (plus d'accumulation).
    const promptKey = combatState.isActive
      ? `r${combatState.round || 1}:t${deathSaveTick}`
      : `free:t${deathSaveTick}`;
    if (lastDeathSavePromptKeyRef.current === promptKey) return;
    // Trame : noter la chute à 0 PV UNE fois par épisode (clé nulle = le héros
    // vient de tomber), pas à chaque jet de sauvegarde.
    if (lastDeathSavePromptKeyRef.current === null) {
      appendCampaignLog('down', `${character.name} dropped to 0 HP (dying)${combatState.isActive ? ` in combat, round ${combatState.round || 1}` : ''}`);
    }
    lastDeathSavePromptKeyRef.current = promptKey;

    const tickDelay = combatState.isActive ? 40000 : 12000;
    const tickTimer = window.setTimeout(() => setDeathSaveTick(t => t + 1), tickDelay);

    setActivePrompt({
      type: 'DEATH_SAVE',
      name: 'Death Saving Throw',
      formula: '1d20',
      dc: 10,
      advantage: 'normal',
      dmBonus: 0,
      requestedAt: Date.now()
    });
    dm.sendSystemMessage(`[SYSTEM: ${character.name} is at 0 HP and dying. The local rules engine requests ONE death saving throw per round and resolves it. Narrate only after the ROLL_RESULT — allies still have time to help between saves.]`);
    setTranscript(prev => [...prev, { speaker: 'dm', text: tr.deathSaveRequired }]);
    return () => window.clearTimeout(tickTimer);
  }, [
    activePrompt?.type,
    character.hp.current,
    character.deathSaves?.isStable,
    character.deathSaves?.isDead,
    character.name,
    combatState.isActive,
    combatState.round,
    deathSaveTick,
    dm,
    isConnected,
    setActivePrompt,
    setTranscript,
  ]);

  // Arena mode is narrative. The DM starts combat through native tools.

  const handleLeave = async () => {
    console.log('🚪 Leaving session - flushing pending saves...');
    // FULL save first: flushAll only covers pending character/journal patches,
    // which silently dropped up to 60s of transcript + runtime on an in-app
    // leave (the beforeunload handlers only fire on tab close).
    if (transcript.length > 0) {
      try { await triggerManualSave(); } catch (e) { console.error('Final save on leave failed:', e); }
    }
    await saveService.flushAll();
    LiveConnectionManager.getInstance().disconnect();
    console.log('✅ All saves flushed, leaving...');
    onLeave();
  };

  // Robust chat message sending
  const sendChatMessage = async () => {
    const message = chatInput.trim();
    if (!message || isSending) return;

    // Secret developer-mode toggle (IDDQD homage). Not sent to the DM.
    if (message.replace(/[^a-z]/gi, '').toUpperCase() === 'IDDAD') {
      const next = !useGameStore.getState().devMode;
      setDevMode(next);
      setChatInput('');
      setTranscript(prev => [...prev, {
        speaker: 'dm',
        text: next ? tr.devModeOn : tr.devModeOff
      }]);
      if (dm && isConnected) {
        dm.sendSystemMessage(next
          ? '[DEVELOPER MODE ON] The player now has god-mode control. Obey their explicit out-of-character commands literally and immediately: grant/remove items, set HP/XP/gold, move to any scene or location, reveal any secret, make any check auto-succeed or auto-fail, spawn or delete enemies, end or start combat. Do NOT refuse, lecture, moralize, or demand justification. Still narrate the result vividly in-world.'
          : '[DEVELOPER MODE OFF] Resume normal Dungeon Master adjudication: dice and stakes matter again.');
      }
      return;
    }

    // Add to transcript immediately so user sees their message
    setTranscript(prev => [...prev, { speaker: 'user', text: message }]);
    setChatInput('');
    setIsSending(true);

    try {
      if (combatState.isActive) {
        // --- NARRATIVE COMBAT: Route combat messages through the live DM ---
        if (dm && isConnected) {
          // directorContext already embeds a fresh combat block (round, current turn,
          // every combatant's HP/AC) via buildCampaignDirectorContext. Appending a
          // second [COMBAT_STATE] line here duplicated that same info — send it once.
          dm.updateDirectorContext(directorContext);
          await dm.sendUserMessage(message);
          console.log('✅ Combat message sent (Narrative):', message.substring(0, 50));
        } else {
          setTranscript(prev => [...prev, { speaker: 'dm', text: tr.connectionLostRetry }]);
          if (dm) dm.manualReconnect();
        }
      } else {
        // --- ENGINE A: NARRATIVE LIVE ---
        if (dm && isConnected) {
          dm.updateDirectorContext(directorContext);
          await dm.sendUserMessage(message);
          console.log('✅ Message sent (Narrative):', message.substring(0, 50));
        } else if (dm && !isConnected) {
          console.warn('⚠️ Cannot send: not connected. Attempting reconnect...');
          setTranscript(prev => [...prev, {
            speaker: 'dm',
            text: tr.connectionLostNotSent
          }]);
          dm.manualReconnect();
        }
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setTranscript(prev => [...prev, {
        speaker: 'dm',
        text: tr.sendError
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleManualRoll = (result: number, formula: string, reason: string) => {
    playDiceRoll();
    // 1. Show Visual locally first
    setPlayerRoll({ result, reason });
    campaignEventLog.append('ROLL_RESOLVED', `Manual roll: ${reason} = ${result}`, {
      result,
      formula,
      reason,
    });

    // Add to DiceTray log
    logCombatRoll({
      type: 'check',
      name: reason || 'Manual Roll',
      total: result,
      formula: formula,
      isDM: false
    });

    // 2. Then send to DM
    if (dm) {
      dm.sendSystemMessage(`[SYSTEM] Player rolled: ${result} (Formula: ${formula}) for ${reason}.`);
    }
  };

  // Manual save function
  const handleManualSave = async () => {
    if (transcript.length === 0) {
      // ui-m6 — toast au lieu d'alert() bloquant.
      showActionToast(tr.nothingToSave);
      return;
    }

    try {
      const success = await triggerManualSave();
      if (success) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: tr.gameSaved }]);
      } else {
        showActionToast(`⚠️ ${tr.saveErrorConcurrency}`);
      }
    } catch (err) {
      console.error('❌ Save failed:', err);
      showActionToast(`⚠️ ${tr.saveError}`);
    }
  };

  // Manual end combat function (emergency button)
  const handleManualEndCombat = () => {
    const stateAtEnd = useGameStore.getState().combatState;
    persistCompanionHP(stateAtEnd);
    // Chronique de trame — cette porte de sortie aussi doit écrire sa ligne et
    // vider le chroniqueur (sinon PV de départ faux au combat suivant).
    try {
      const chron = combatChronicle.take();
      const hero = useGameStore.getState().character;
      appendCampaignLog('combat', formatCombatChronicleLine({
        heroName: hero?.name || 'Hero',
        hpCurrent: hero?.hp.current ?? 0,
        hpMax: hero?.hp.max ?? 0,
        hpStart: chron.active ? chron.hpStart : null,
        foes: describeCombatFoes(stateAtEnd.combatants || []),
        custom: chron.custom,
        outcome: 'interrupted',
      }));
    } catch { /* jamais bloquant */ }
    setCombatState({ isActive: false, combatants: [], currentTurn: '' });
    setIsNPCTurn(false);
    setTranscript(prev => [...prev, { speaker: 'dm', text: tr.combatEndedManually }]);
  };

  const handleAdvanceTurn = () => {
    playEndTurn();
    const next = advanceTurn(combatState);
    setCombatState(next);
    campaignEventLog.append('COMBAT_TURN_ADVANCED', `Manual turn advance to ${next.currentTurn}`, {
      currentTurn: next.currentTurn,
      round: next.round,
    });
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsTurnAdvanced(next.currentTurn)}]*` }]);
  };

  // C1 — garde central : sous condition incapacitante (Paralyzed, Stunned,
  // Unconscious, Incapacitated), AUCUNE action du joueur ne part — le panneau
  // est déjà fermé, mais la hotbar et les cartes d'action du MJ passent par ici.
  const guardPlayerAction = (): boolean => {
    const live = useGameStore.getState();
    // CB8 — à 0 PV le héros est INCONSCIENT : aucune potion auto-administrée,
    // aucune esquive, aucun sort. Seul le jet de mort reste actif (et un allié
    // ou le MJ peut le secourir).
    if ((live.character?.hp?.current ?? 1) <= 0) {
      const dyingMsg = language === 'fr' ? 'Inconscient (0 PV) — action impossible' : 'Unconscious (0 HP) — cannot act';
      showActionToast(`💀 ${dyingMsg}`);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 💀 ${dyingMsg}]*` }]);
      auditBus.publish('combat', 'Action joueur bloquée (0 PV)');
      return true;
    }
    const row = live.combatState.combatants.find((c: any) => c.isPlayer);
    const capability = getActionCapability([
      ...((live.character?.activeEffects || [])),
      ...((((row?.activeEffects as any) || []) as any[])),
    ]);
    if (capability.canAct) return false;
    const blockedBy = capability.blockedBy || 'Incapacitated';
    showActionToast(`⛓️ ${blockedBy} — ${language === 'fr' ? 'action impossible' : 'cannot act'}`);
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⛓️ ${blockedBy} — ${language === 'fr' ? 'action impossible' : 'cannot act'}]*` }]);
    auditBus.publish('combat', `Action joueur bloquée (${blockedBy})`, blockedBy);
    return true;
  };

  // Auto-end combat when the engine reports a decisive outcome (all enemies
  // dead/fled = victory, or whole party down = defeat). Returns true if it ended,
  // so callers can stop the turn loop. Hands narration to the DM; awards XP on
  // victory. Guarded so it only fires once per combat.
  // Persist ALL persistent allies' HP between fights: the Beast Master wolf +
  // recruited companions (read fresh char so we never clobber a just-synced
  // XP grant).
  const persistCompanionHP = (state: any) => {
    const freshChar = useGameStore.getState().character;
    if (!freshChar) return;
    let synced = syncCompanionsFromState(freshChar, state?.combatants || []);
    // Monture tombée : la règle vit dans le MOTEUR (resolveMountAfterCombat) —
    // elle était ici seule, et l'autre porte de sortie (l'outil end_combat,
    // pour une fin narrée par le MJ) ne l'appliquait donc jamais.
    const mountOutcome = resolveMountAfterCombat(synced);
    synced = mountOutcome.character;
    if (mountOutcome.fallen) {
      const { name, celestial } = mountOutcome.fallen;
      setTranscript(prev => [...prev, { speaker: 'dm', text: celestial
        ? `*[SYSTEM: ✨ ${tr.sysCelestialSteedGone(name)}]*`
        : `*[SYSTEM: 🐴 ${tr.sysMountFallen(name)}]*` }]);
      if (dm && isConnected) dm.sendSystemMessage(celestial
        ? `[SYSTEM] The celestial steed ${name} was slain and returned to the higher planes. It will answer the paladin's call again after a LONG REST. Narrate its luminous departure.`
        : `[SYSTEM] The hero's mount ${name} was KILLED in this fight. It is gone — narrate the loss with weight; a new mount must be found or bought.`);
    }
    if (synced !== freshChar) syncCharacterUpdate(synced);
  };

  const maybeEndCombat = (state: any): boolean => {
    const outcome = encounterOutcome(state);
    if (outcome === 'ongoing') return false;
    if (combatEndedRef.current) return true;
    combatEndedRef.current = true;
    setIsNPCTurn(false);
    // Sortis VIVANTS (moral raté, reddition) : ils ne sont plus au roster mais
    // comptent pour l'XP, le bilan et la chronique — et le MJ doit savoir
    // qu'ils sont partis, pas morts (audit 2026-08-25).
    const departed = ((state.departed || []) as any[]).filter((dpt: any) => !dpt.returned);
    if (outcome === 'victory') {
      const enemies = (state.combatants || []).filter((c: any) => (c.side ? c.side === 'enemy' : !c.isPlayer));
      // XP complète pour les tombés ET les sortis vivants — un seul calcul,
      // testé (victoryXP) : xp explicite du MJ → bestiaire → estimation par PV.
      const xp = victoryXP(state.combatants || [], departed);
      if (xp > 0) grantXP(xp, tr.reasonCombatVictory);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsVictory(xp)}]*` }]);
      if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] Combat is over (victory). ${describeFightEnd(state.combatants || [], departed)}. Enemies listed as FLED or SURRENDERED are ALIVE — they ran or yielded, they did NOT die and they may return later: narrate the aftermath accordingly (no corpse, no loot from them).`);
      musicDirector.handleMusicTag('victory');
      // Log de campagne : UNE ligne-résumé (ennemis, PV perdus, XP, attaques
      // custom), jamais le déroulé du combat.
      try {
        const chron = combatChronicle.take();
        const hero = useGameStore.getState().character;
        appendCampaignLog('combat', formatCombatChronicleLine({
          heroName: hero?.name || 'Hero',
          hpCurrent: hero?.hp.current ?? 0,
          hpMax: hero?.hp.max ?? 0,
          hpStart: chron.active ? chron.hpStart : null,
          foes: describeCombatFoes(enemies),
          xp,
          custom: chron.custom,
          outcome: 'victory',
          departed: describeDeparted(departed) || undefined,
        }));
      } catch { /* le log de trame ne doit jamais casser la fin de combat */ }
    } else if (outcome === 'defeat') {
      // Audit trame — la DÉFAITE aussi laisse une trace : sans elle, le MJ
      // re-présentait les vainqueurs du héros comme des inconnus.
      try {
        const chron = combatChronicle.take();
        const hero = useGameStore.getState().character;
        const foes = describeCombatFoes(state.combatants || []);
        appendCampaignLog('combat', formatCombatChronicleLine({
          heroName: hero?.name || 'Hero',
          hpCurrent: hero?.hp.current ?? 0,
          hpMax: hero?.hp.max ?? 0,
          hpStart: chron.active ? chron.hpStart : null,
          foes,
          custom: chron.custom,
          outcome: 'defeat',
          departed: describeDeparted(departed) || undefined,
        }));
      } catch { /* jamais bloquant */ }
    }
    combatChronicle.take(); // filet : remis à zéro quel que soit le dénouement
    persistCompanionHP(state);
    // Clear the roster too: leftover corpses re-entered the NEXT fight via
    // startEncounter's roster reuse and their XP was awarded a second time.
    // Idem pour les fuyards : un registre non vidé se relirait au combat suivant.
    setCombatState({ ...state, isActive: false, combatants: [], currentTurn: '', enemyIntents: {}, departed: [] });
    return true;
  };

  // Hand the turn to the enemies after the player has acted. Before this, the
  // turn stalled on the player (handlePlayer* consumed the action but never
  // advanced initiative), so enemies never took their turn and never dealt
  // damage — the #1 reported bug. We read the freshest combat state from the
  // store (zustand set is synchronous, so it reflects the setCombatState we just
  // did), end the fight if it's over, otherwise advance so runNPCTurn fires.
  const endPlayerTurnIfActive = () => {
    const latest = useGameStore.getState().combatState;
    if (!latest.isActive) return;
    const current = latest.combatants.find((c: any) => c.id === latest.currentTurn || c.name === latest.currentTurn);
    if (current && !current.isPlayer) return; // not the player's turn — don't double-advance
    if (maybeEndCombat(latest)) return;
    setCombatState(advanceTurn(latest));
  };

  // Économie de tour : les règles sont dans engine/turnEconomy (contre-audit
  // du 2026-08-26, lot B) ; ici seulement la liaison à la fiche du héros.
  const spendPlayerMainAction = (state: any) => spendPlayerMainActionRule(state, character);
  const hasPlayerMainSlice = (state: any) => hasPlayerMainSliceRule(state, character);
  const rejectActionSpent = (needsBonus: boolean) => {
    const msg = language === 'fr'
      ? (needsBonus ? 'Action bonus déjà utilisée ce tour.' : "Plus d'action disponible ce tour.")
      : (needsBonus ? 'Bonus action already used this turn.' : 'No action left this turn.');
    showActionToast(`⏳ ${msg}`);
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⏳ ${msg}]*` }]);
    auditBus.publish('combat', `Action refusée (économie de tour) : ${msg}`);
  };

  const handlePlayerAttack = async (weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) => handlePlayerAttackAction(sessionContext(), weaponItem, targetId, opts);

  // Bonus-action attack: off-hand weapon (two-weapon fighting), Berserker
  // Frenzy (main weapon while raging), or War Domain's War Priest. All three
  // consume the single amber bonus pip; the engine resolves the real dice.
  const handlePlayerBonusAttack = async (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield' = 'offhand') => handlePlayerBonusAttackAction(sessionContext(), weaponItem, targetId, mode);

  // R4 — les actions de session vivent dans services/session/ ; elles
  // recoivent a l'appel ce qu'elles capturaient ici (voir SessionContext).
  const sessionContext = (): SessionContext => ({
    removeProposedAction,
    syncCharacterUpdate,
    actionLockRef,
    character,
    combatState,
    dayCount,
    diceTrayRef,
    dm,
    guardPlayerAction,
    hasPlayerBonusFree,
    hasPlayerMainSlice,
    isConnected,
    language,
    logCombatRoll,
    maybeEndCombat,
    onCharacterUpdate,
    patchPlayerEconomy,
    pushCombatRoll,
    rejectActionSpent,
    setActivePrompt,
    setCombatState,
    setCurrentRoll,
    setIsNPCTurn,
    setIsResolvingAction,
    setPlayerRoll,
    setReactionRequest,
    setTranscript,
    showActionToast,
    spendPlayerBonus,
    spendPlayerMainAction,
    spendResource,
    syncCharacterCritical,
    timeOfDay,
    tr,
  });

  const handlePlayerCastSpell = async (spellName: string, slotLevel: string | null, targetId: string) => handlePlayerCastSpellAction(sessionContext(), spellName, slotLevel, targetId);

  const handleUseClassAbility = async (abilityId: ClassAbilityId, targetId?: string) => handleUseClassAbilityAction(sessionContext(), abilityId, targetId);

  const handlePlayerDodge = async () => handlePlayerDodgeAction(sessionContext(), );

  const handlePlayerUsePotion = async (potionItem: any) => handlePlayerUsePotionAction(sessionContext(), potionItem);

  // Resolve a target spec ('all_enemies', a name/id, or a comma-separated list)
  // to a list of living combatant ids.
  // GENERIC resolver for a DM-authored improvised action card. Nothing here is
  // hard-coded to a specific stunt: the card's spec (cost, resolution, numbers)
  // comes entirely from the DM via propose_player_action. We only consume the
  // declared cost and run the matching engine primitive. Does NOT end the turn —
  // the player ends it explicitly.
  const handlePlayerProposedAction = async (p: ProposedPlayerAction) => handlePlayerProposedActionAction(sessionContext(), p);

  const handleDeclineProposedAction = (p: ProposedPlayerAction) => {
    removeProposedAction(p.id);
    if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] Player declined the improvised action "${p.label}". Offer an alternative or continue.`);
  };

  const handleToggleActionEconomy = useCallback((combatantId: string, kind: 'action' | 'bonusAction' | 'extraAttack' | 'reaction') => {
    setCombatState((prev: any) => {
      const economy = { ...(prev.actionEconomy || {}) };
      const isPlayerEconomy = combatantId === 'player'
        || prev.combatants?.find((c: any) => c.id === combatantId)?.isPlayer;

      // PLAYER: the pips (attacksUsed/bonusUsed) are the source of truth — the
      // action/bonus booleans are derived from them. Toggling the sword icons
      // used to flip ONLY the booleans, desyncing them from the pip HUD and the
      // attack buttons. Route the toggle through the pips instead.
      if (isPlayerEconomy && (kind === 'action' || kind === 'bonusAction')) {
        const cur = economy['player'] || {};
        const next: any = { ...cur };
        if (kind === 'action') {
          const max = cur.attacksMax ?? getPlayerAttackCount(character);
          next.attacksMax = max;
          next.attacksUsed = (cur.attacksUsed ?? 0) >= max ? 0 : max; // toggle: all spent ⇄ all refunded
        } else {
          const max = cur.bonusMax ?? 1;
          next.bonusMax = max;
          next.bonusUsed = (cur.bonusUsed ?? 0) >= max ? 0 : max;
        }
        next.actionUsed = (next.attacksUsed ?? 0) >= (next.attacksMax ?? 1);
        next.bonusActionUsed = (next.bonusUsed ?? 0) >= (next.bonusMax ?? 1);
        return { ...prev, actionEconomy: { ...economy, player: next } };
      }

      const currentEconomy = economy[combatantId] || {
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        movementMax: 30,
        extraAttackUsed: false,
      };

      let updatedEconomy;
      if (kind === 'action') {
        updatedEconomy = { ...currentEconomy, actionUsed: !currentEconomy.actionUsed };
      } else if (kind === 'bonusAction') {
        updatedEconomy = { ...currentEconomy, bonusActionUsed: !currentEconomy.bonusActionUsed };
      } else if (kind === 'extraAttack') {
        updatedEconomy = { ...currentEconomy, extraAttackUsed: !currentEconomy.extraAttackUsed };
      } else if (kind === 'reaction') {
        updatedEconomy = { ...currentEconomy, reactionUsed: !currentEconomy.reactionUsed };
      } else {
        updatedEconomy = currentEconomy;
      }

      return {
        ...prev,
        actionEconomy: {
          ...economy,
          [combatantId]: updatedEconomy,
        },
      };
    });
  }, [setCombatState, character]);

  // Synchroniser isNPCTurn lorsque le tour actif change
  useEffect(() => {
    if (!combatState.isActive) {
      setIsNPCTurn(false);
      if (useGameStore.getState().proposedActions.length) clearProposedActions();
      return;
    }
    const current = combatState.combatants.find(c => c.name === combatState.currentTurn || c.id === combatState.currentTurn);
    if (current) {
      setIsNPCTurn(!current.isPlayer);
    } else {
      setIsNPCTurn(false);
    }

    // DM-authored action cards are only valid on the player's own turn. Clear any
    // stale proposals once the turn moves to an enemy/ally so they can't be
    // triggered out of turn.
    if ((!current || !current.isPlayer) && useGameStore.getState().proposedActions.length) {
      clearProposedActions();
    }

    // Dodge lasts until the start of the player's next turn. When the turn
    // returns to the player, strip the transient Dodge effect so it doesn't
    // linger for the whole fight.
    if (current?.isPlayer && prevTurnRef.current !== combatState.currentTurn) {
      const playerHasDodge = combatState.combatants.some(c => c.isPlayer && (c.activeEffects || []).some((e: any) => e.name === 'Dodge'));
      if (playerHasDodge) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) =>
            c.isPlayer ? { ...c, activeEffects: (c.activeEffects || []).filter((e: any) => e.name !== 'Dodge') } : c
          ),
        }));
      }
      // Fresh action pips for the new player turn: green pips = Extra Attack count,
      // one amber bonus pip. DM grants this turn are wiped (they're per-turn).
      // CB4 — la réaction revient au début de VOTRE tour (RAW) : indispensable
      // maintenant que sa consommation par le moteur est réellement persistée.
      setCombatState((prev: any) => patchPlayerEconomy(prev, {
        attacksMax: getPlayerAttackCount(character),
        attacksUsed: 0,
        bonusMax: 1,
        bonusUsed: 0,
        reactionUsed: false,
        // cb-m6 — les riders « 1×/tour » redeviennent disponibles.
        onceRiderUsed: false,
      }));

      // Décompte des durées d'effets du JOUEUR au début de son tour (Shield = 1
      // round, Rage/Bless = 10). Les effets expirés quittent la fiche ET sa
      // ligne de combat — avant ça, aucun buff « en rounds » n'expirait jamais.
      const liveCharForTick = useGameStore.getState().character || character;
      const ticked = tickRoundEffects(liveCharForTick.activeEffects || []);
      if (ticked.changed) {
        // Fiche FRAÎCHE : l'ancien spread de la prop restituait des valeurs
        // périmées (slot re-crédité, PV d'avant le dernier coup).
        const tickedChar = { ...liveCharForTick, activeEffects: ticked.activeEffects };
        if (ticked.expired.length) {
          syncCharacterCritical(tickedChar, 'hp');
          setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: ticked.activeEffects } : c),
          }));
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsEffectsExpired(ticked.expired.join(', '))}]*` }]);
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] Effect(s) expired on the player: ${ticked.expired.join(', ')}. Weave it into the narration if relevant.`);
          }
        } else {
          syncCharacterUpdate(tickedChar);
        }
      }

      // C1 — Joueur incapacité (Paralyzed/Stunned/Unconscious/Incapacitated) :
      // impossible d'agir, le tour saute tout seul après un court délai. Sans
      // ça, soit le joueur agissait malgré Hold Person, soit le combat restait
      // bloqué sur un panneau entièrement grisé. Capacité évaluée APRÈS le tick
      // des durées, pour qu'un étourdissement d'un round expire avant de sauter.
      const effectsAfterTick = ticked.changed ? ticked.activeEffects : (character.activeEffects || []);
      const playerRow = combatState.combatants.find(c => c.isPlayer);
      const playerCapability = getActionCapability([...effectsAfterTick, ...((playerRow?.activeEffects as any) || [])]);
      if (!playerCapability.canAct && (character.hp?.current ?? 1) > 0) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⛓️ ${playerCapability.blockedBy} — ${language === 'fr' ? 'vous ne pouvez pas agir ce tour' : 'you cannot act this turn'}]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] The player is ${playerCapability.blockedBy} and CANNOT act this turn (no actions or reactions). The engine will skip their turn automatically — narrate the helplessness briefly.`);
        }
        window.setTimeout(() => {
          const live = useGameStore.getState();
          if (!live.combatState.isActive) return;
          const cur = live.combatState.combatants.find(c => c.id === live.combatState.currentTurn || c.name === live.combatState.currentTurn);
          if (!cur?.isPlayer) return; // le tour a déjà bougé (fin de combat, MJ…)
          if ((live.character?.hp?.current ?? 1) <= 0) return; // à 0 PV, la voie des jets de mort gère le tour
          const liveRow = live.combatState.combatants.find(c => c.isPlayer);
          const still = getActionCapability([...(live.character?.activeEffects || []), ...((liveRow?.activeEffects as any) || [])]);
          if (!still.canAct) setCombatState(advanceTurn(live.combatState));
        }, 2600);
      }
    }
    prevTurnRef.current = combatState.currentTurn;
  }, [combatState.currentTurn, combatState.isActive, combatState.combatants, setIsNPCTurn, setCombatState]);

  // Keep the player's combat row LIVE: AC (Shield, Mage Armor, gear swaps),
  // resistances (Rage!, feats) and portrait. The engine reads the SHEET for
  // the authoritative AC on enemy attacks; this keeps the tracker honest too.
  // Returns prev unchanged when equal so the effect cannot loop.
  useEffect(() => {
    if (!combatState.isActive) return;
    const liveAC = getCombatAC(character);
    const liveResistances = playerResistances(character);
    // CB2 — tempHP fait partie du miroir : Wild Shape / Bénédiction du
    // Ténébreux écrivent les PV temporaires sur la FICHE ; sans ce sync, la
    // ligne de combat restait à 0, le moteur n'absorbait rien et le premier
    // coup ennemi écrasait les PV temporaires de la fiche avec ce 0.
    const liveTempHP = character.tempHP ?? 0;
    setCombatState((prev: any) => {
      const player = (prev.combatants || []).find((c: any) => c.isPlayer);
      if (!player) return prev;
      const sameAC = player.ac === liveAC;
      const sameResist = JSON.stringify(player.resistances || []) === JSON.stringify(liveResistances);
      const samePortrait = !heroPortraitUrl || player.portrait === heroPortraitUrl;
      const sameTempHP = (player.tempHP ?? 0) === liveTempHP;
      if (sameAC && sameResist && samePortrait && sameTempHP) return prev;
      return {
        ...prev,
        combatants: prev.combatants.map((c: any) => c.isPlayer
          ? { ...c, ac: liveAC, resistances: liveResistances, tempHP: liveTempHP, portrait: heroPortraitUrl || c.portrait }
          : c),
      };
    });
  }, [character, combatState.isActive, setCombatState, heroPortraitUrl]);

  // Mid-combat RESUME normalization (runs once). If a save was made during a
  // fight on a non-player turn, restoring it used to set isNPCTurn=true and the
  // enemy turns auto-ran on load — the game "played itself" and locked the
  // player out while the DM was still connecting. Instead, hand the turn back to
  // the player so they regain control; the fight continues from their turn.
  useEffect(() => {
    if (hasResumedCombatRef.current) return;
    if (!combatState.isActive) { hasResumedCombatRef.current = true; return; }
    const player = combatState.combatants.find(c => c.isPlayer);
    if (!player) return; // combatants not populated yet — wait for the next render
    hasResumedCombatRef.current = true;
    const current = combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn);
    if (current && current.isPlayer) return; // already the player's turn — nothing to fix
    setIsNPCTurn(false);
    setCombatState((prev: any) => patchPlayerEconomy({ ...prev, currentTurn: player.id }, {
      attacksMax: getPlayerAttackCount(character),
      attacksUsed: 0,
      bonusMax: 1,
      bonusUsed: 0,
    }));
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsCombatResumed}]*` }]);
  }, [combatState.isActive, combatState.combatants, combatState.currentTurn, character, setCombatState, setIsNPCTurn, setTranscript]);

  // ── Réaction « Bouclier » ────────────────────────────────────────────────
  // Le mage qui connaît Shield, a un emplacement et sa réaction, se voit
  // proposer d'annuler un coup ennemi quand +5 CA suffirait (fenêtre ~10 s,
  // silence = refus, le combat ne bloque jamais).
  // ── Flux de jet en deux temps (relance BG3) ──────────────────────────────
  // showRollFeedback : dés + journal, TOUJOURS (l'échec puis la relance sont
  // tous deux visibles). finalizeRollOutcome : effets d'état (jet de mort,
  // concentration, sort en attente) + LIVRAISON au MJ + fermeture du prompt.
  const showRollFeedback = (outcome: any, suffix = '') => {
    const isAttack = outcome.prompt.type === 'ATTACK' || outcome.prompt.name.toLowerCase().includes('attack');
    const dc = outcome.prompt.dc || 10;
    setPlayerRoll({ result: outcome.total, reason: `${outcome.prompt.name}${suffix}`, success: outcome.success });
    // Raisons appliquées VISIBLES dans le journal des jets (2026-08-13) : le
    // moteur poussait déjà « Bless: +1d4 », « Plate: disadvantage on Stealth »,
    // « Aura of Protection: +2 »… dans contextReasons, mais le journal les
    // taisait — le joueur ne voyait jamais que son don/aptitude avait compté.
    const reasons: string[] = outcome.prompt.contextReasons || [];
    const reasonsSuffix = reasons.length ? ` — ${reasons.join(' ; ')}` : '';
    logCombatRoll({
      type: isAttack ? 'attack' : outcome.prompt.type === 'SAVE' || outcome.prompt.type === 'DEATH_SAVE' ? 'save' : 'check',
      name: `${outcome.prompt.name}${suffix}`,
      total: outcome.total,
      formula: `${outcome.die} ${outcome.modifier >= 0 ? '+' : ''}${outcome.modifier} = ${outcome.total} vs ${isAttack ? 'AC' : 'DC'} ${dc}${reasonsSuffix}`,
      success: outcome.success,
    });
    campaignEventLog.append('ROLL_RESOLVED', `Roll resolved: ${outcome.prompt.name}${suffix} = ${outcome.total}`, outcome);
  };

  // Brûle UNE Inspiration du MJ (source dm_inspiration) pour la relance — la
  // relance est « sèche » : le nouveau jet remplace l'ancien, sans bonus.
  const spendInspirationForReroll = (): boolean => {
    const liveChar = useGameStore.getState().character;
    if (!liveChar) return false;
    const mods = [...(liveChar.storyModifiers || [])];
    const idx = mods.findIndex((m: any) => m.source === 'dm_inspiration' && (m.remainingUses ?? 0) > 0);
    if (idx < 0) return false;
    const mod: any = mods[idx];
    if ((mod.remainingUses ?? 1) <= 1) mods.splice(idx, 1);
    else mods[idx] = { ...mod, remainingUses: mod.remainingUses - 1 };
    syncCharacterCritical({ ...liveChar, storyModifiers: mods }, 'hp');
    return true;
  };

  const finalizeRollOutcome = (outcome: any, rerolled = false) => {
    const { total, die: dieResult, modifier, success } = outcome;
    const dc = outcome.prompt.dc || 10;
    const rollList = outcome.rolls.join(',');

    if (outcome.prompt.type === 'DEATH_SAVE') {
      const updatedChar = applyDeathSaveOutcome(character, outcome);
      syncCharacterCritical(updatedChar, 'hp');
      // C2/CB8 — si le héros est tombé pendant SON propre tour, le tour lui
      // reste : on le rend après la résolution du jet (advanceTurn ignore
      // ensuite les combattants à 0 PV, donc pas de tour fantôme). Sur un
      // 20 naturel (1 PV), il se relève et garde son tour — RAW.
      if (updatedChar.hp.current <= 0) {
        window.setTimeout(() => {
          const live = useGameStore.getState().combatState;
          if (!live.isActive) return;
          const cur = live.combatants.find((c: any) => c.id === live.currentTurn || c.name === live.currentTurn);
          if (cur?.isPlayer) setCombatState(advanceTurn(live));
        }, 1200);
      }
    }

    if (outcome.prompt.type === 'SAVE' && outcome.prompt.concentrationDamage) {
      const concentration = resolveConcentrationAfterDamage(character, outcome.prompt.concentrationDamage, total);
      syncCharacterCritical(concentration.character, 'hp');
      if (concentration.broken) {
        setTranscript(prev => [...prev, {
          speaker: 'dm',
          text: `*[SYSTEM: ${tr.sysConcentrationBroken(concentration.removedEffects.map(effect => effect.name).join(', '))}]*`
        }]);
      } else {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsConcentrationHeld}]*` }]);
      }
    }

    let spellSummary = '';
    if (outcome.prompt.pendingSpell) {
      // État FRAIS (même correctif que le panneau de sorts) : la valeur de
      // rendu `combatState` peut précéder des writes MJ concurrents.
      const spellResolution = resolvePendingSpellRoll(useGameStore.getState().combatState, outcome);
      if (spellResolution.resolved) {
        setCombatState(spellResolution.state);
        if (spellResolution.target?.isPlayer) {
          syncCharacterCritical({
            ...character,
            hp: spellResolution.target.hp,
            tempHP: spellResolution.target.tempHP !== undefined ? spellResolution.target.tempHP : character.tempHP,
            activeEffects: spellResolution.target.activeEffects || character.activeEffects,
          }, 'hp');
        }
        campaignEventLog.append('SPELL_RESOLVED', spellResolution.summary, spellResolution);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellResolution.summary}]*` }]);
        spellSummary = spellResolution.summary;
      }
    }

    // Deliver the outcome through the HELD tool response when this roll came
    // from request_roll/cast_spell (blocking two-step roll) — the DM was
    // silenced until now and reacts to the REAL result. The [ROLL_RESULT]
    // user message stays as the channel for engine-initiated prompts (death
    // saves, concentration) and for a roll landing after the hold timed out.
    const outcomePayload = {
      rolled: true,
      outcome: {
        check: outcome.prompt.name,
        type: outcome.prompt.type,
        total,
        dc,
        success,
        die: dieResult,
        rolls: rollList,
        modifier,
        critical: outcome.critical,
        ...(rerolled ? { rerolledWithInspiration: true } : {}),
        ...(spellSummary ? { spellResolution: spellSummary } : {}),
      },
      instruction: `The dice have landed — THIS is the official outcome${rerolled ? ' (the player BURNED an Inspiration to reroll; this new result replaces the failed one — acknowledge the twist of fate)' : ''}. Narrate it now (fail forward on a failure). Do not re-roll or second-guess it.`,
    };
    const deliveredViaTool = activePrompt && typeof (activePrompt as any).resolveToolCall === 'function'
      && (activePrompt as any).resolveToolCall(outcomePayload);
    if (!deliveredViaTool && dm) {
      const successStr = success ? 'true' : 'false';
      const rollMsg = `[ROLL_RESULT: Check="${outcome.prompt.name}" | Type=${outcome.prompt.type} | Total=${total} | DC=${dc} | Success=${successStr} | Die=${dieResult} | Rolls=${rollList} | Mod=${modifier >= 0 ? '+' : ''}${modifier} | Critical=${outcome.critical}${rerolled ? ' | RerolledWithInspiration=true' : ''}${spellSummary ? ` | Effect=${spellSummary}` : ''}]`;
      dm.sendUserMessage(rollMsg);
    }

    setActivePrompt(null);
  };

  // ── SORT À SAUVEGARDE d'un lanceur ENNEMI (2026-08-13) ─────────────────────
  // Sauvegarde AUTO mais AFFICHÉE dans le journal des jets (choix joueur) : le
  // héros roule avec ses VRAIS bonus (maîtrises + dons + passifs de classe,
  // Évasion, Tueur de mages au contact), et les dégâts passent par les canaux
  // qui appliquent les RÉSISTANCES des deux côtés (joueur ET alliés).
  const runNPCTurn = async (npc: any) => runNPCTurnAction(sessionContext(), npc);

  // Automated NPC combat turn resolution
  useEffect(() => {
    // Gate on isConnected: enemy turns must never auto-run before the DM is
    // connected (e.g. right after loading a save), otherwise the fight plays
    // itself while the player is locked out and the DM is silent.
    if (!combatState.isActive || !isNPCTurn || !combatState.currentTurn || !isConnected) return;

    const activeNPC = combatState.combatants.find(
      c => (c.name === combatState.currentTurn || c.id === combatState.currentTurn) && !c.isPlayer && c.hp.current > 0
    );

    if (!activeNPC) {
      const timer = setTimeout(() => {
        handleAdvanceTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }

    let active = true;
    const execute = async () => {
      await new Promise(r => setTimeout(r, 1000));
      if (!active) return;
      try {
        await runNPCTurn(activeNPC);
      } catch (err: any) {
        // A crash mid-enemy-turn used to leave the fight stuck on "NPC Turn in
        // progress..." forever. Surface it and hand the turn onward so combat
        // always keeps flowing.
        console.error('⚔️ runNPCTurn crashed:', err);
        auditBus.publish('combat', `⚠️ Tour de ${activeNPC.name} interrompu par une erreur — tour passé`, err?.message);
        if (!active) return;
        const latest = useGameStore.getState().combatState;
        if (latest.isActive && !maybeEndCombat(latest)) {
          setCombatState(advanceTurn(latest));
        }
      }
    };

    execute();

    return () => {
      active = false;
    };
  }, [combatState.currentTurn, isNPCTurn, combatState.isActive, isConnected]);

  // Clôture automatique de la VICTOIRE : un OUTIL du MJ (enemy_leaves_combat,
  // apply_damage dont le moral fait fuir le dernier ennemi, update_enemy_hp…)
  // ne peut pas appeler maybeEndCombat — il vit ici. Dès que plus aucun ennemi
  // n'est debout (tombés OU partis vivants), on clôt : XP, chronique, message
  // au MJ. La DÉFAITE reste gérée par les chemins existants (jets de mort).
  useEffect(() => {
    if (!combatState.isActive) return;
    if (encounterOutcome(combatState) !== 'victory') return;
    maybeEndCombat(combatState);
  }, [combatState.combatants, combatState.departed, combatState.isActive]);

  // ── Temps auto : la NARRATION pilote l'horloge ──────────────────────────
  // Dépendre du bon vouloir de Flash pour appeler set_time_of_day était naïf :
  // on écoute les tournures temporelles dans la narration du MJ et on avance
  // l'horloge nous-mêmes (l'outil reste pour les sauts explicites).
  const lastTimeScanIndexRef = useRef(-1);
  useEffect(() => {
    // Premier passage (historique restauré d'une sauvegarde) : on se cale à la
    // fin SANS scanner — sinon une vieille tombée de nuit d'il y a 3 jours de
    // jeu écrasait l'heure actuelle au chargement.
    if (lastTimeScanIndexRef.current < 0) {
      lastTimeScanIndexRef.current = transcript.length;
      return;
    }
    if (transcript.length <= lastTimeScanIndexRef.current) return;
    const fresh = transcript.slice(lastTimeScanIndexRef.current);
    lastTimeScanIndexRef.current = transcript.length;
    const dmText = fresh.filter(m => m.speaker === 'dm' && !isSystemLine(m.text)).map(m => m.text).join(' ').toLowerCase();
    if (!dmText) return;
    const detect = (): TimeOfDay | null => {
      if (/(la nuit tombe|nuit tomb[ée]e|en pleine nuit|au c[œoe]ur de la nuit|night falls|nightfall|dead of night|minuit|midnight)/.test(dmText)) return 'night';
      if (/(le soir tombe|le soleil se couche|soleil couchant|cr[ée]puscule|fin de journ[ée]e|dusk|sunset|evening falls|le soleil d[ée]cline)/.test(dmText)) return 'dusk';
      if (/(l'aube|a l'aube|au petit matin|le jour se l[èe]ve|premi[èe]res lueurs|dawn breaks|at dawn|sunrise|au lever du soleil)/.test(dmText)) return 'dawn';
      if (/(en pleine journ[ée]e|le soleil est haut|en milieu de journ[ée]e|midi sonne|à midi|midday|high noon)/.test(dmText)) return 'day';
      return null;
    };
    const detected = detect();
    if (!detected || detected === (useGameStore.getState().campaignRuntime.timeOfDay || 'day')) return;
    useGameStore.getState().setCampaignRuntime(prev => ({ ...prev, timeOfDay: detected, updatedAt: Date.now() }));
    void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
    campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', `World time auto-detected from narration: ${detected}`, { timeOfDay: detected });
  }, [transcript]);

  // ── Expiration horaire des effets (1 heure / 8 heures) ──────────────────
  // Quel que soit CE qui a fait avancer l'horloge (repos, outil, narration
  // auto-détectée), on balaie les effets estampillés expiresAtWorldHour.
  useEffect(() => {
    const hour = worldHourOf(dayCount, timeOfDay);
    const swept = sweepExpiredEffects(character, hour);
    if (!swept.expired.length) return;
    syncCharacterCritical(swept.character, 'hp');
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsEffectsExpiredTime(swept.expired.join(', '))}]*` }]);
    if (dm && isConnected) {
      dm.sendSystemMessage(`[SYSTEM] Time passed — effect(s) expired on the player: ${swept.expired.join(', ')}. Mention it only if relevant.`);
    }
  }, [dayCount, timeOfDay]);

  // ── Mort du héros : 3 échecs de jets de mort → écran de fin de destin ────
  const isDead = Boolean(character.deathSaves?.isDead);
  const deathNotifiedRef = useRef(false);
  useEffect(() => {
    if (!isDead) { deathNotifiedRef.current = false; return; }
    if (deathNotifiedRef.current) return;
    deathNotifiedRef.current = true;
    setActivePrompt(null);
    campaignEventLog.append('HP_CHANGED', `${character.name} est mort (3 échecs de jets de mort)`, { dead: true });
    if (dm && isConnected) {
      dm.sendSystemMessage('[SYSTEM] The hero has DIED (3 failed death saves). Give ONE short, somber narrative beat, then wait: the player is choosing between a costly miraculous resurrection and ending the campaign.');
    }
  }, [isDead, dm, isConnected, character.name, setActivePrompt]);

  const handleResurrect = () => {
    const c = useGameStore.getState().character;
    if (!c) return;
    const goldCost = Math.floor((c.gold || 0) / 2);
    const scarName = language === 'fr' ? 'Cicatrice du destin' : 'Scar of Destiny';
    const hasScar = (c.features || []).some(f => f.name === scarName);
    const updated: CharacterSheet = {
      ...c,
      hp: { ...c.hp, current: 1 },
      tempHP: 0,
      deathSaves: { successes: 0, failures: 0, isStable: false, isDead: false },
      gold: Math.max(0, (c.gold || 0) - goldCost),
      features: hasScar ? c.features : [...(c.features || []), {
        name: scarName,
        description: language === 'fr'
          ? "Revenu(e) d'entre les morts — une marque que le destin n'oublie pas."
          : 'Returned from death — a mark fate never forgets.',
      }],
    };
    syncCharacterCritical(updated, 'hp');
    syncCharacterUpdate(updated);
    setJournal(prev => {
      const next = {
        ...prev,
        chronicle: [...(prev.chronicle || []), {
          id: `death_${Date.now()}`,
          title: language === 'fr' ? "Retour d'entre les morts" : 'Back from the dead',
          description: language === 'fr'
            ? `${c.name} a frôlé la mort et payé ${goldCost} po au destin.`
            : `${c.name} brushed death and paid ${goldCost} gp to fate.`,
          timestamp: Date.now(),
        }],
      };
      syncJournalImmediate(next);
      return next;
    });
    setTranscript(prev => [...prev, {
      speaker: 'dm',
      text: `*[SYSTEM: ✨ ${language === 'fr' ? `Résurrection miraculeuse — 1 PV, -${goldCost} po, ${scarName}` : `Miraculous resurrection — 1 HP, -${goldCost} gp, ${scarName}`}]*`,
    }]);
    if (dm && isConnected) {
      dm.sendSystemMessage(`[SYSTEM] FATE INTERVENES: the hero returns to life at 1 HP. The price: half their gold (${goldCost} gp) claimed by a mysterious debt, and a permanent "${scarName}". Narrate the miraculous survival vividly (who or what pulled them back?), plant the debt as a future story hook, and resume the scene calmly. Do not kill them again immediately.`);
    }
  };

  const handleDeathEnd = () => {
    setTranscript(prev => [...prev, {
      speaker: 'dm',
      text: `*[SYSTEM: 💀 ${language === 'fr' ? `La saga de ${character.name} s'achève ici.` : `${character.name}'s saga ends here.`}]*`,
    }]);
    void handleLeave();
  };

  // ── Calendrier en jeu : les repos font avancer le temps ─────────────────
  const TIME_STEPS: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
  const advanceWorldTime = (opts: { newDay?: boolean; step?: boolean }) => {
    useGameStore.getState().setCampaignRuntime(prev => {
      if (opts.newDay) {
        return { ...prev, dayCount: (prev.dayCount || 1) + 1, timeOfDay: 'dawn', updatedAt: Date.now() };
      }
      const idx = TIME_STEPS.indexOf(prev.timeOfDay || 'day');
      const nextTime = TIME_STEPS[Math.min(TIME_STEPS.length - 1, idx + 1)];
      return { ...prev, timeOfDay: nextTime, updatedAt: Date.now() };
    });
    void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
  };

  const handleShortRest = () => {
    // Spend hit dice when hurt, otherwise the short rest heals nothing (the
    // engine only heals inside `if diceToSpend > 0`). Spend up to half the
    // remaining hit dice, enough to cover the missing HP.
    const hd = (character as any).hitDice;
    const remaining = hd?.remaining ?? Math.max(1, Math.floor((character.level || 1) / 2));
    const missing = character.hp.max - character.hp.current;
    const dieAvg = ((hd?.die ?? 8) / 2) + 1;
    const wanted = missing > 0 ? Math.ceil(missing / dieAvg) : 0;
    const spend = Math.max(0, Math.min(remaining, wanted));
    const updated = applyShortRest(character, spend);
    syncCharacterCritical(updated, 'hp');
    campaignEventLog.append('JOURNAL_UPDATED', 'Manual short rest completed', {
      hp: updated.hp,
      resources: updated.resources,
      hitDice: updated.hitDice,
    });
    musicDirector.handleRestMusic(false);
    advanceWorldTime({ step: true });
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.sysShortRest}]*` }]);
    // Le bouton doit PARLER au MJ — sinon la narration ignore le repos.
    if (dm && isConnected) {
      dm.sendUserMessage(`[SYSTEM] The player takes a SHORT REST (~1 hour). HP now ${updated.hp.current}/${updated.hp.max}; short-rest resources recovered. Narrate the breather in the current scene (where they sit, what they see/hear, a small character beat), then resume.`);
    }
  };

  const handleLongRest = () => {
    // PL13 — garde anti-DOUBLE partagée avec l'outil vocal long_rest : un
    // second repos dans les 5 minutes réelles sautait un jour de plus et
    // regonflait tout gratuitement. Rétrocompatible (champ absent = 0).
    const lastLongRestAt = Number((useGameStore.getState().campaignRuntime as any).lastLongRestAt || 0);
    if (lastLongRestAt && Date.now() - lastLongRestAt < 5 * 60_000) {
      showActionToast(`🌙 ${language === 'fr' ? 'Repos long déjà effectué à l\'instant.' : 'Long rest already just completed.'}`);
      return;
    }
    useGameStore.getState().setCampaignRuntime(prev => ({ ...prev, lastLongRestAt: Date.now(), updatedAt: Date.now() } as any));
    const updated = applyLongRest(character);
    syncCharacterCritical(updated, 'hp');
    campaignEventLog.append('JOURNAL_UPDATED', 'Manual long rest completed', {
      hp: updated.hp,
      resources: updated.resources,
      spellSlots: updated.spellSlots,
      hitDice: updated.hitDice,
    });
    musicDirector.handleRestMusic(true);
    advanceWorldTime({ newDay: true });
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.sysLongRest}]*` }]);

    // Une nuit passe : tick des horloges du monde (le bouton manuel ne le
    // faisait pas — seul l'outil long_rest du MJ tiquait) + narration.
    // A4 — MÊME implémentation que l'outil long_rest du MJ (elle était copiée
    // ici, avec le risque classique de n'en corriger qu'une). Le barème de
    // chaque horloge est respecté, et seules celles qui bougent sont annoncées.
    const ticked = advanceClocksForNight(useGameStore.getState().campaignRuntime.worldClocks).ticked;
    const clocksAdvanced = ticked.map(c => `"${c.name}" ${c.stage}/${c.maxStage}${c.reachedMax ? ' (FINAL STAGE)' : ''}`);
    if (ticked.length) {
      useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        worldClocks: advanceClocksForNight(prev.worldClocks).clocks,
        updatedAt: Date.now(),
      }));
      void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
    }
    if (dm && isConnected) {
      const runtimeNow = useGameStore.getState().campaignRuntime;
      dm.sendUserMessage(`[SYSTEM] The player takes a LONG REST — a night passes (now Day ${runtimeNow.dayCount}, dawn). Full HP, spell slots and resources recovered.${clocksAdvanced.length ? ` World clocks advanced: ${clocksAdvanced.join('; ')} — weave visible signs of this into the morning.` : ''} Narrate the camp, the night (a dream, a sound, a watch moment), and the dawn, then resume.`);
    }
  };

  // Mobile (< md) : pile verticale — la scène en haut, la chronique en bas
  // sur --chron-h (le suivi de combat et les toasts se calent dessus).
  // Bureau : la rangée historique rail | poignée | scène, inchangée.
  return (
    <div className="relative flex flex-col md:flex-row vh-screen [--chron-h:42dvh] bg-black text-parchment overflow-hidden font-sans">

      {/* Reconnection Overlay */}
      {(isReconnecting || reconnectFailed) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-amber-600 rounded-lg p-8 max-w-md text-center">
            {isReconnecting ? (
              <>
                {/* Un seul décompte sur toute la fenêtre de reconnexion : le
                    joueur veut savoir combien de temps patienter, pas suivre
                    le backoff tentative par tentative. */}
                <h2 className="text-xl font-bold text-amber-400 mb-2">{tr.reconnectTitle}</h2>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">{tr.reconnectReassure}</p>

                {reconnectSeconds > 0 ? (
                  <div className="mb-5 flex items-baseline justify-center gap-2">
                    <span className="text-sm uppercase tracking-widest text-gray-500">{tr.reconnectIn}</span>
                    <span className="font-mono text-5xl font-bold tabular-nums text-amber-400">{reconnectSeconds}</span>
                    <span className="text-lg text-amber-400/70">{tr.reconnectSeconds}</span>
                  </div>
                ) : (
                  <p className="mb-5 animate-pulse text-lg text-amber-300">{tr.reconnectLastTry}</p>
                )}

                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300 ease-linear"
                    style={{ width: `${((RECONNECT_WINDOW_S - reconnectSeconds) / RECONNECT_WINDOW_S) * 100}%` }}
                  />
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  {tr.reconnectAttemptOf.replace('{n}', String(Math.max(1, reconnectAttempt)))}
                </p>
                {queuedMessageCount > 0 && (
                  <p className="mt-2 text-xs text-amber-300">{queuedMessageCount} {tr.pendingReconnect}</p>
                )}
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-red-400 mb-2">{t('dm.connectionLostTitle', language as Language)}</h2>
                <p className="text-gray-400 mb-4">{tr.connectionLostSimple}</p>
                {connectionError && (
                  <pre className="mb-6 max-h-36 overflow-auto whitespace-pre-wrap rounded border border-red-900/60 bg-black/40 p-3 text-left text-xs text-red-100">
                    {connectionError}
                  </pre>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setReconnectFailed(false);
                      setConnectionError(null);
                      dm?.manualReconnect();
                    }}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors"
                  >
                    {t('dm.manualRetry', language as Language)}
                  </button>
                  <button
                    onClick={handleLeave}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                  >
                    {t('dm.backToMenu', language as Language)}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-4">{t('dm.autoSaveMsg', language as Language)}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Player Manual Roll Overlay */}
      {playerRoll && (
        <RollingDice
          result={playerRoll.result}
          reason={playerRoll.reason}
          isDM={false}
          success={playerRoll.success}
          onComplete={() => setPlayerRoll(null)}
        />
      )}

      {/* DM Roll Overlay — the RollingDice effect now replays its spin on every
          result/reason change, so each enemy's attack+damage animates distinctly
          (was reused → looked like only one enemy rolled). Gated on !playerRoll:
          the two overlays are independent components and could stack on screen
          (blue + red dice at once); the DM roll now simply waits in the store
          until the player's roll completes, then pops — serialized visuals. */}
      {!playerRoll && currentRoll && (
        <RollingDice
          result={currentRoll.result}
          reason={currentRoll.reason}
          isDM={currentRoll.isDM !== false}
          success={currentRoll.success}
          onComplete={() => setCurrentRoll(null)}
        />
      )}

      {activeMonsterCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4" onClick={() => setActiveMonsterCard(null)}>
          <div className="relative flex max-h-[88dvh] w-full max-w-4xl flex-col rounded-md border border-white/10 bg-zinc-950 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-white/10 bg-black/45 px-4 py-3">
              <h3 className="font-fantasy text-lg font-bold tracking-wide text-amber-300">{tr.reference}</h3>
              <button
                type="button"
                onClick={() => setActiveMonsterCard(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 hover:bg-white/10 hover:text-white font-bold"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {/* En combat la carte s'ouvre DÉJÀ RETOURNÉE : on vient y chercher
                  la CA et les PV, pas admirer l'illustration. */}
              <MonsterCard nameOrId={activeMonsterCard} initialFace="back" />
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: Logs & Dice. Sur bureau, sa largeur (réglable) passe par
          --rail-w : un `width` inline s'imposerait aussi au téléphone, où le
          rail devient la bande du bas, pleine largeur, à hauteur --chron-h.
          Le padding bas suit la zone sûre (barre d'accueil iPhone). */}
      <div
        style={{ '--rail-w': `${rail.width}px` } as React.CSSProperties}
        className="order-2 h-[var(--chron-h)] w-full shrink-0 flex flex-col border-t border-gray-800 bg-gray-950/90 z-20 pb-[env(safe-area-inset-bottom)] md:order-none md:h-auto md:w-[var(--rail-w)] md:border-t-0 md:border-r md:pb-0"
      >
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Chronicle Log — toute la bande sur mobile, 3/5 du rail sur bureau */}
          <div className="flex-1 min-h-0 md:flex-initial md:h-3/5 border-b border-gray-800 flex flex-col">
            <div className="p-3 bg-gray-900 border-b border-gray-800 text-xs font-bold uppercase text-gold/70 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="w-3 h-3" /> {tr.chronicleHeader}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" ref={chatScrollRef}>
              {transcript.length === 0 && <div className="text-gray-600 italic text-xs text-center mt-10">{tr.sagaBegins}</div>}
              {/* UI3 — filtre symétrique FR/EN (SYSTEM et SYSTÈME).
                  ui-m3 — clé = index dans le transcript ORIGINAL (stable même
                  quand un message système s'intercale dans la liste filtrée). */}
              {transcript
                .map((msg, originalIndex) => ({ msg, originalIndex }))
                .filter(({ msg }) => !isSystemLine(msg.text))
                .map(({ msg, originalIndex }) => (
                <div key={originalIndex} className={`text-sm leading-relaxed ${msg.speaker === 'dm' ? 'text-parchment/90' : 'text-blue-200/90 text-right'}`}>
                  <span className="font-bold opacity-40 uppercase text-[9px] block mb-1 tracking-widest">{msg.speaker === 'user' ? tr.hero : tr.dm}</span>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-2 bg-gray-900 border-t border-gray-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isConnected ? tr.talkToDM : tr.reconnecting}
                disabled={!isConnected || isSending}
                className={`flex-1 bg-gray-800 border rounded-lg px-3 py-2 text-sm text-parchment placeholder-gray-500 focus:outline-none transition-colors ${isConnected
                  ? 'border-gray-700 focus:border-amber-600'
                  : 'border-red-700/50 bg-gray-900 opacity-60'
                  }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || !isConnected || isSending}
                className={`p-2 rounded-full transition-all ${chatInput.trim() && isConnected && !isSending
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                title={tr.send}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full transition-all ${isMicOn
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                title={isMicOn ? tr.micActive : tr.enableMic}
              >
                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Plateau de dés : bureau seulement. Caché en CSS, pas démonté — sa
              ref reste vivante et le journal des jets continue de s'y écrire
              (les jets eux-mêmes se résolvent dans le moteur et ActionPrompt). */}
          <div className="hidden md:flex md:h-2/5 flex-col bg-gray-900/30">
            <DiceTray ref={diceTrayRef} onRoll={handleManualRoll} />
          </div>
        </div>
      </div>

      {/* Poignée du rail : la chronique est la lecture principale du jeu, sa
          largeur appartient au joueur. Glisser, ◀ ▶, Début ou double-clic pour
          revenir à l'origine. Cachée sous md, comme le rail qu'elle règle. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={tr.railHandle}
        aria-valuemin={RAIL_WIDTH.min}
        aria-valuemax={RAIL_WIDTH.max}
        aria-valuenow={rail.width}
        tabIndex={0}
        onPointerDown={rail.onPointerDown}
        onKeyDown={rail.onKeyDown}
        onDoubleClick={rail.reset}
        className={`hidden md:block w-1.5 shrink-0 cursor-col-resize z-20 transition-colors focus-visible:outline-none focus-visible:bg-cyan-400 hover:bg-cyan-400 ${rail.dragging ? 'bg-cyan-400' : 'bg-gray-800'}`}
      />

      {/* MAIN CONTENT Area */}
      <div className="flex-1 min-h-0 relative bg-black flex flex-col items-center justify-center">
        {/* Dynamic Background */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-60 ${isGeneratingImage ? 'animate-pulse blur-sm scale-105' : 'scale-100'}`}
          style={{ backgroundImage: `url(${bgImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920'})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

        {/* Image Generation Indicator */}
        {isGeneratingImage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/80 border border-gold/50 px-6 py-2 rounded-full text-gold font-fantasy tracking-widest text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="ml-2">{tr.generatingScene}</span>
          </div>
        )}

        {/* Visualizer (The Eye) OR Battle Grid */}
        {combatState.isActive ? (
          <div className="relative z-10 mb-20 transform scale-[0.7] md:scale-100 transition-transform">
            {/* NPC Turn Indicator */}
            {isNPCTurn && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-2 rounded-full border border-red-500 shadow-lg animate-pulse z-50">
                {tr.npcTurnInProgress}
              </div>
            )}

            {/* REMOVED BATTLE GRID FOR OPTION 2 */}
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-12 mb-20">
            {/* Le gros orbe audio central (192 px) a été RETIRÉ le 2026-08-22 :
                il occupait le milieu de l'écran, pulsait à chaque prise de
                parole et masquait la scène. L'indicateur de voix vit désormais
                en petit, dans le coin haut-droit (voir plus bas). */}
            {/* Hint text for using sidebar controls */}
            <p className="text-gray-500 text-xs italic">{t('game.useLeftPanelHint', language as Language)}</p>
          </div>
        )}

        {/* Indicateur de voix — badge discret en HAUT À DROITE (≈48 px au lieu
            de 192 px). Il ne pulse plus en taille : seule la couleur et une
            lueur signalent l'activité, ce qui supprime le tremblement. */}
        <div
          className={`absolute top-3 z-30 pointer-events-none ${
            combatState.isActive ? 'right-3 md:right-[33rem]' : 'right-3'
          }`}
          title={audioLevel > 0.05 ? tr.micActive : ''}
        >
          <div className={`grid h-12 w-12 place-items-center rounded-full border bg-zinc-950/70 backdrop-blur-sm transition-colors duration-150 ${
            audioLevel > 0.05
              ? 'border-red-500/60 shadow-[0_0_18px_rgba(220,20,60,0.45)]'
              : 'border-white/10'
          }`}>
            <Volume2 className={`h-5 w-5 transition-colors duration-150 ${
              audioLevel > 0.05 ? 'text-red-400' : 'text-white/25'
            }`} />
          </div>
        </div>

        {/* Bottom Command HUD */}
        <div className={`absolute inset-x-3 bottom-4 z-30 flex justify-center pointer-events-none ${combatState.isActive ? 'md:right-[528px]' : ''}`}>
          <div className="flex w-full max-w-4xl flex-col items-center gap-2">
            {/* Status Bar - Shows cover, buffs, debuffs */}
            {combatState.isActive && (
              <div className="pointer-events-auto">
                <StatusBar
                  effects={statusEffects}
                  coverBonus={activePrompt?.coverBonus || 0}
                  onRemoveEffect={handleRemoveEffect}
                />
              </div>
            )}

            {/* Action pips — green = attacks remaining (Extra Attack = several), amber = bonus. */}
            {combatState.isActive && Boolean(
              combatState.currentTurn === 'player'
              || combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.isPlayer
            ) && (
              <div className="pointer-events-auto">
                <ActionPips
                  attacksMax={combatState.actionEconomy?.['player']?.attacksMax ?? getPlayerAttackCount(character)}
                  attacksUsed={combatState.actionEconomy?.['player']?.attacksUsed ?? 0}
                  bonusMax={combatState.actionEconomy?.['player']?.bonusMax ?? 1}
                  bonusUsed={combatState.actionEconomy?.['player']?.bonusUsed ?? 0}
                />
              </div>
            )}

            <div className="pointer-events-auto grid w-full gap-2 rounded-md border border-white/10 bg-zinc-950/85 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid min-w-0 grid-cols-2 gap-2">
                <HudMeter
                  label={tr.hp}
                  value={`${character.hp.current}/${character.hp.max}`}
                  percent={Math.max(0, Math.min(100, (character.hp.current / character.hp.max) * 100))}
                  tone="red"
                />
                <HudMeter
                  label={`${tr.levelWord} ${character.level}`}
                  value={getXPProgress(character.level, character.xp).nextLevelXP !== null
                    ? `${character.xp} / ${getXPProgress(character.level, character.xp).nextLevelXP} XP`
                    : `${character.xp} XP (MAX)`}
                  percent={getXPProgress(character.level, character.xp).percent}
                  tone="gold"
                />
              </div>

              {/* Mobile : une seule rangée qui défile au doigt (8 boutons ne
                  tiennent pas en 390 px sans manger la scène). */}
              <div className="flex flex-nowrap items-center justify-start gap-1 overflow-x-auto md:flex-wrap md:justify-end md:overflow-visible">
                <NavButton
                  icon={<User className="w-5 h-5" />}
                  label={t('game.character', language as Language)}
                  onClick={() => setActivePanel(activePanel === 'character' ? 'none' : 'character')}
                  active={activePanel === 'character'}
                />
                <NavButton
                  icon={<Book className="w-5 h-5" />}
                  label={t('game.journal', language as Language)}
                  onClick={() => setActivePanel(activePanel === 'journal' ? 'none' : 'journal')}
                  active={activePanel === 'journal'}
                />
                <NavButton
                  icon={<MapIcon className="w-5 h-5" />}
                  label={tr.campaign}
                  onClick={() => setActivePanel(activePanel === 'campaign' ? 'none' : 'campaign')}
                  active={activePanel === 'campaign'}
                />
                <NavButton
                  icon={<Scroll className="w-5 h-5" />}
                  label={tr.codex}
                  onClick={() => setActivePanel(activePanel === 'codex' ? 'none' : 'codex')}
                  active={activePanel === 'codex'}
                />
                <NavButton
                  icon={<BookOpen className="w-5 h-5" />}
                  label={tr.spellbook}
                  onClick={() => setActivePanel(activePanel === 'spells' ? 'none' : 'spells')}
                  active={activePanel === 'spells'}
                />
                <NavButton
                  icon={<Swords className="w-5 h-5" />}
                  label={t('game.combat', language as Language)}
                  onClick={() => {
                    // C3 — plus de toggle brut : hors combat le bouton est
                    // inerte (les combats démarrent via le MJ/moteur) ; en
                    // combat il demande confirmation puis passe par la VRAIE
                    // fin de combat (persistance des compagnons + purge du
                    // roster). L'ancien isActive=false sec laissait des
                    // cadavres ré-entrer au combat suivant avec double XP.
                    if (!combatState.isActive) return;
                    if (window.confirm(language === 'fr'
                      ? 'Mettre fin au combat en cours ? (à réserver aux combats bloqués — la fin normale est gérée par le MJ)'
                      : 'End the current combat? (for stuck fights — normal endings are handled by the DM)')) {
                      handleManualEndCombat();
                    }
                  }}
                  active={combatState.isActive}
                />
                <NavButton
                  icon={<Backpack className="w-5 h-5" />}
                  label={t('game.inventory', language as Language)}
                  onClick={() => setActivePanel(activePanel === 'inventory' ? 'none' : 'inventory')}
                  active={activePanel === 'inventory'}
                />
                <NavButton
                  icon={<LogOut className="w-5 h-5" />}
                  label={t('game.leave', language as Language)}
                  onClick={handleLeave}
                  danger
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Developer-mode banner (IDDAD) */}
      {devMode && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-[60] -translate-x-1/2 rounded-full border border-emerald-400/60 bg-emerald-950/85 px-4 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md animate-pulse">
          {tr.devBanner}
        </div>
      )}

      {/* Header HUD */}
      <div className={`absolute left-0 right-0 top-0 z-40 p-3 pointer-events-none md:left-80 ${combatState.isActive ? 'md:pr-[528px]' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto min-w-0 max-w-[min(620px,calc(100vw-1.5rem))] rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 shadow-xl backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dm ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-red-500 animate-pulse'}`} title={dm ? tr.connected : tr.disconnected} />
              {heroPortraitUrl && (
                <img
                  src={heroPortraitUrl}
                  alt={character.name}
                  className="h-10 w-10 shrink-0 rounded-md border border-amber-400/30 object-cover shadow-lg"
                />
              )}
              <div className="min-w-0">
                <h2 className="truncate font-fantasy text-lg font-bold tracking-wide text-white">
                  {character.name}
                </h2>
                <p className="truncate text-xs text-white/45">{tr.lvlAbbrev} {character.level} {dispRace(character.race, language)} {dispClass(character.class, language)}</p>
              </div>
              {queuedMessageCount > 0 && (
                <div className="ml-auto shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-200">
                  {queuedMessageCount} {tr.waiting}
                </div>
              )}
            </div>
            {!!character.storyModifiers?.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {character.storyModifiers.slice(0, 4).map(modifier => {
                  // L'Inspiration du MJ brille : elle sert aussi de RELANCE sur
                  // un échec de test (façon BG3) — le joueur doit la voir.
                  const isInspiration = modifier.source === 'dm_inspiration';
                  return (
                    <span
                      key={modifier.id}
                      className={`inline-flex items-center gap-1 rounded border bg-black/50 px-2 py-0.5 text-[10px] ${
                        isInspiration
                          ? 'border-yellow-400/70 bg-yellow-500/10 text-yellow-200 shadow-[0_0_8px_rgba(250,204,21,0.35)]'
                          : modifier.mode === 'disadvantage' || modifier.bonus < 0
                            ? 'border-red-700/50 text-red-200'
                            : 'border-amber-700/50 text-amber-200'
                      }`}
                      title={isInspiration
                        ? (language === 'fr' ? `${modifier.reason} — utilisable aussi pour RELANCER un test raté` : `${modifier.reason} — can also REROLL a failed check`)
                        : modifier.reason}
                    >
                      {isInspiration ? <Dices className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                      {modifier.name} {modifier.remainingUses}x
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pointer-events-auto hidden min-w-0 flex-col items-end gap-2 sm:flex">
            <div className="flex items-center gap-2">
              {/* Calendrier en jeu — Jour N, moment de la journée */}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-zinc-950/75 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-200/80 shadow-xl backdrop-blur-xl">
                <CalendarDays className="h-3.5 w-3.5" />
                {tr.dayWord} {dayCount} — {timeOfDayLabel}
              </span>
              <div className="max-w-sm rounded-md border border-white/10 bg-zinc-950/75 px-3 py-2 text-right shadow-xl backdrop-blur-xl">
                <h3 className="truncate font-fantasy text-sm uppercase tracking-widest text-gold/70">{adventure}</h3>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {saveHealth === 'failing' && (
                <span
                  className="flex items-center rounded-md border border-red-500/60 bg-red-950/80 px-2 py-1 text-[11px] font-semibold text-red-300 shadow-lg animate-pulse"
                  title={tr.saveFailedTooltip}
                >
                  {tr.saveFailed}
                </span>
              )}
              <HeaderActionButton icon={<Save className="h-3.5 w-3.5" />} label={isSaving ? tr.saving : tr.save} onClick={handleManualSave} />
              <HeaderActionButton icon={<Music className="h-3.5 w-3.5" />} label={tr.music} onClick={musicDirector.toggleMusic} />
              <HeaderActionButton icon={<Sparkles className="h-3.5 w-3.5" />} label={tr.shortRest} onClick={handleShortRest} />
              <HeaderActionButton icon={<Sparkles className="h-3.5 w-3.5" />} label={tr.longRest} onClick={handleLongRest} />
              <HeaderActionButton icon={<SettingsIcon className="h-3.5 w-3.5" />} label={language === 'fr' ? 'Réglages' : 'Settings'} onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activePanel === 'inventory' && (
        <InventoryPanel
          character={character}
          onClose={() => setActivePanel('none')}
          onUpdateCharacter={handleInventoryCharacterUpdate}
          onItemDropped={({ name, quantity }) => {
            // NF1 — l'objet jeté devient un élément narratif : le MJ le sait.
            const qtyLabel = quantity > 1 ? `${quantity}x ` : '';
            showActionToast(`🗑️ ${qtyLabel}${name} — ${language === 'fr' ? 'abandonné' : 'dropped'}`);
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${language === 'fr' ? `Objet abandonné : ${qtyLabel}${name}` : `Item dropped: ${qtyLabel}${name}`}]*` }]);
            if (dm && isConnected) {
              dm.sendSystemMessage(`[SYSTEM] The player deliberately THREW AWAY ${qtyLabel}${name} (removed from inventory). It now lies in the current scene — you may weave it into the fiction (someone picks it up, it is found later…). Acknowledge briefly, do not re-add it.`);
            }
          }}
          onItemUsed={({ name, healing, formula }) => {
            // Out-of-combat consumable: same visible feedback as in combat
            // (dice overlay + roll log + DM kept in the loop).
            if (healing > 0) {
              setPlayerRoll({ result: healing, reason: `${name} : +${healing} ${tr.hp}` });
              logCombatRoll({ type: 'damage', name: `${tr.potion} : ${name}`, total: healing, formula: formula || tr.healing, isDM: false });
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsPotionDrunk(name, healing)}]*` }]);
              if (dm && isConnected) {
                dm.sendSystemMessage(`[SYSTEM] Player consumed ${name} outside combat and healed ${healing} HP. Briefly acknowledge it in the fiction if relevant.`);
              }
            } else {
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsItemUsed(name)}]*` }]);
              if (dm && isConnected) {
                dm.sendSystemMessage(`[SYSTEM] Player used the item "${name}" from their inventory (no mechanical healing parsed). Adjudicate its effect narratively.`);
              }
            }
          }}
        />
      )}

      {activePanel === 'spells' && (
        <SpellbookPanel
          character={character}
          onClose={() => setActivePanel('none')}
          onUpdateCharacter={handleInventoryCharacterUpdate}
          onLogMessage={(msg) => setTranscript(prev => [...prev, { speaker: 'dm', text: msg }])}
        />
      )}

      {activePanel === 'journal' && (
        <JournalPanel
          briefing={journal.briefing}
          quests={journal.quests}
          npcs={journal.npcs}
          locations={journal.locations}
          chronicle={journal.chronicle}
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'character' && (
        <CharacterSheetPanel
          character={character}
          onClose={() => setActivePanel('none')}
          onUpdateCharacter={handleInventoryCharacterUpdate}
        />
      )}

      {activePanel === 'codex' && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 text-white">{tr.loadingCodex}</div>}>
          <RuleCodexPanel
            onClose={() => setActivePanel('none')}
            initialTab={codexInitialTab}
            initialQuery={codexInitialQuery}
          />
        </React.Suspense>
      )}

      {activePanel === 'campaign' && (
        <CampaignBoardPanel
          manifest={adventureManifestData}
          manifestoText={adventureManifest}
          runtime={campaignRuntime}
          events={campaignEventLog.getEvents()}
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'settings' && (
        <SettingsPanel
          onClose={() => setActivePanel('none')}
          storyMode={!!character.storyMode}
          onToggleStoryMode={(value) => {
            const updated = { ...character, storyMode: value };
            onCharacterUpdate(updated);
            syncCharacterCritical(updated, 'hp');
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${value ? tr.gsStoryModeOn : tr.gsStoryModeOff}]*` }]);
          }}
        />
      )}

      {/* Tabletop Overlays */}
      <CombatTracker
        isActive={combatState.isActive}
        combatants={combatState.combatants}
        currentTurn={combatState.currentTurn}
        round={combatState.round}
        departed={combatState.departed}
        onAdvanceTurn={endPlayerTurnIfActive}
        onEndCombat={handleManualEndCombat}
        onOpenMonsterCard={handleOpenMonsterCard}
        actionEconomy={combatState.actionEconomy}
        onToggleAction={handleToggleActionEconomy}
        playerStoryModifiers={character?.storyModifiers || []}
        selectedTargetId={selectedTargetId}
        onSelectTarget={setSelectedTargetId}
        onAttack={handlePlayerAttack}
        onBonusAttack={handlePlayerBonusAttack}
        onCastSpell={handlePlayerCastSpell}
        onDodge={handlePlayerDodge}
        onUsePotion={handlePlayerUsePotion}
        onUseAbility={handleUseClassAbility}
        isResolvingAction={isResolvingAction}
      />

      {/* Barre de capacités permanente (façon BG3) — combat ET exploration */}
      <AbilityHotbar
        onUseAbility={handleUseClassAbility}
        selectedTargetId={selectedTargetId}
        disabled={isResolvingAction}
      />

      {/* Réaction (Bouclier) proposée en plein tour ennemi */}
      {reactionRequest && <ReactionPrompt request={reactionRequest} />}

      {/* Séquence de mort — 3 échecs de jets de mort */}
      {isDead && (
        <DeathScreen
          character={character}
          onResurrect={handleResurrect}
          onEndCampaign={handleDeathEnd}
        />
      )}

      {/* Audit / dev control cluster — always visible (fixed, bottom-left). The
          audit console opens in a SEPARATE OS window; Dév toggles developer mode
          (same as typing IDDAD in the chat). */}
      <div className="fixed bottom-3 left-3 z-[60] hidden gap-2 md:flex">
        <button
          onClick={() => setAuditOpen(o => !o)}
          title={tr.auditTitle}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-bold shadow-lg backdrop-blur transition ${auditOpen ? 'border-amber-400 bg-amber-500/90 text-black' : 'border-white/15 bg-black/70 text-amber-200 hover:bg-black/90'}`}
        >
          {tr.audit}
        </button>
        <button
          onClick={() => setDevMode(!devMode)}
          title={tr.devTooltip}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-bold shadow-lg backdrop-blur transition ${devMode ? 'border-red-400 bg-red-600/90 text-white' : 'border-white/15 bg-black/70 text-white/70 hover:bg-black/90'}`}
        >
          {tr.dev} {devMode ? tr.on : tr.off}
        </button>
      </div>
      <AuditWindow open={auditOpen} onClose={() => setAuditOpen(false)} />

      {/* Floating XP Notifications */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingXP.map(fxp => (
          <div
            key={fxp.id}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 text-3xl font-bold text-amber-400 animate-float-up drop-shadow-[0_2px_10px_rgba(0,0,0,1)]"
            style={{
              animation: 'float-up 3s ease-out forwards',
              marginLeft: `${(Math.random() - 0.5) * 200}px`,
              marginTop: `${(Math.random() - 0.5) * 100}px`
            }}
          >
            ⭐ +{fxp.amount} XP
          </div>
        ))}
      </div>

      {/* DM-authored improvised action cards — only on the player's own turn. */}
      {combatState.isActive && proposedActions.length > 0 && Boolean(
        combatState.currentTurn === 'player'
        || combatState.combatants.find(c => c.id === combatState.currentTurn || c.name === combatState.currentTurn)?.isPlayer
      ) && (
        <ProposedActionPrompt
          proposals={proposedActions}
          disabled={isResolvingAction}
          onConfirm={handlePlayerProposedAction}
          onDecline={handleDeclineProposedAction}
        />
      )}

      {/* NF3 — panneau de commerce (ouvert par l'outil open_shop du MJ) */}
      {activeShop && (
        <ShopPanel
          character={character}
          onUpdateCharacter={handleInventoryCharacterUpdate}
          onClose={() => {
            setActiveShop(null);
            if (dm && isConnected) {
              dm.sendSystemMessage(`[SYSTEM] The player closed the trading panel and leaves ${activeShop.merchantName}'s stall. Resume the scene.`);
            }
          }}
          onTransaction={({ kind, itemName, price }) => {
            const line = kind === 'buy'
              ? (language === 'fr' ? `Achat : ${itemName} (−${price} po)` : `Bought: ${itemName} (−${price} gp)`)
              : (language === 'fr' ? `Vente : ${itemName} (+${price} po)` : `Sold: ${itemName} (+${price} gp)`);
            showActionToast(`${kind === 'buy' ? '🛒' : '💰'} ${line}`);
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${line} — ${activeShop.merchantName}]*` }]);
            if (dm && isConnected) {
              dm.sendSystemMessage(`[SYSTEM] Shop transaction at ${activeShop.merchantName}: the player ${kind === 'buy' ? `BOUGHT ${itemName} for ${price} gp` : `SOLD ${itemName} for ${price} gp`}. Gold and inventory are ALREADY updated by the engine — narrate the exchange in one short beat, do not re-apply anything.`);
            }
          }}
        />
      )}

      {/* UI4 — toast des actions refusées (0 PV, incapacité, économie d'action…) */}
      {actionToast && (
        <div
          key={actionToast.id}
          className="fixed bottom-[calc(var(--chron-h)+1rem)] left-1/2 z-[95] -translate-x-1/2 rounded-md border border-amber-400/40 bg-black/85 px-4 py-2 text-sm font-semibold text-amber-200 shadow-xl md:bottom-24"
        >
          {actionToast.text}
        </div>
      )}

      {activePrompt && !rerollOffer && (
        <ActionPrompt
          checkType={activePrompt.type}
          checkName={activePrompt.name}
          formula={activePrompt.formula}
          dc={activePrompt.dc}
          advantage={activePrompt.advantage}
          dmBonus={activePrompt.dmBonus}
          contextReasons={activePrompt.contextReasons}
          canDismiss={activePrompt.type !== 'DEATH_SAVE' && !activePrompt.concentrationDamage}
          onDismiss={() => {
            // Release a HELD request_roll/cast_spell tool response: without
            // this the DM stays frozen until the 90s timeout when the player
            // declines the roll.
            if (typeof (activePrompt as any).resolveToolCall === 'function') {
              (activePrompt as any).resolveToolCall({
                rolled: false,
                cancelled: true,
                instruction: 'The player dismissed this roll. Do not narrate any outcome; continue the scene and let them choose another approach.',
              });
            }
            // ou-m11 — REMBOURSE les story modifiers consommés à la création du
            // prompt : un jet annulé ne doit pas brûler une récompense du MJ.
            const refund = (activePrompt as any).appliedStoryModifiers;
            if (Array.isArray(refund) && refund.length) {
              const live = useGameStore.getState().character;
              if (live) {
                syncCharacterCritical({ ...live, storyModifiers: [...(live.storyModifiers || []), ...refund] }, 'hp');
              }
            }
            setActivePrompt(null);
          }}
          onRoll={() => {
            playDiceRoll();
            const outcome = resolveRollPrompt(activePrompt);
            showRollFeedback(outcome);
            // RELANCE BG3 : sur un ÉCHEC de test/sauvegarde (pas jet de mort,
            // pas sort en attente), si une Inspiration du MJ est en réserve,
            // on retient la livraison et on propose de la brûler pour relancer.
            const liveNow = useGameStore.getState().character;
            const inspirationsLeft = (liveNow?.storyModifiers || [])
              .filter((m: any) => m.source === 'dm_inspiration' && (m.remainingUses ?? 0) > 0).length;
            // Inflexible (Guerrier 9+) : une SAUVEGARDE ratée peut être relancée
            // en brûlant une utilisation d'Indomitable — la ressource dédiée
            // passe avant l'Inspiration, plus précieuse.
            const indomitableLeft = liveNow?.class === 'Fighter' && (liveNow.level || 1) >= 9
              && outcome.prompt.type === 'SAVE'
              ? ((liveNow.resources as any)?.indomitable?.current ?? 0)
              : 0;
            const rerollable = !outcome.success
              && (outcome.prompt.type === 'CHECK' || outcome.prompt.type === 'SAVE')
              && !outcome.prompt.pendingSpell
              && (inspirationsLeft > 0 || indomitableLeft > 0);
            if (rerollable) {
              setRerollOffer({ outcome, currency: indomitableLeft > 0 ? 'indomitable' : 'inspiration' });
              return;
            }
            finalizeRollOutcome(outcome);
          }}
        />
      )}

      {/* Relance BG3 — l'échec est affiché, l'Inspiration peut le rejouer */}
      {activePrompt && rerollOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex min-w-[340px] max-w-md flex-col items-center gap-5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-gray-900 to-black p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-sm font-bold uppercase tracking-widest text-red-400">{language === 'fr' ? 'Échec' : tr.failureWord}</div>
              <div className="mt-1 text-2xl font-bold text-white">{rerollOffer.outcome.prompt.name}</div>
              <div className="mt-2 font-mono text-lg text-white/70">
                {rerollOffer.outcome.total} <span className="text-white/40">vs DC {rerollOffer.outcome.prompt.dc || 10}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const offer = rerollOffer;
                setRerollOffer(null);
                if (offer.currency === 'indomitable') {
                  // Inflexible : brûle une utilisation de la ressource dédiée.
                  const live = useGameStore.getState().character!;
                  const pool = (live.resources as any)?.indomitable;
                  if (!pool || (pool.current ?? 0) <= 0) { finalizeRollOutcome(offer.outcome); return; }
                  syncCharacterCritical({
                    ...live,
                    resources: { ...(live.resources || {}), indomitable: { ...pool, current: pool.current - 1 } },
                  } as any, 'hp');
                } else if (!spendInspirationForReroll()) { finalizeRollOutcome(offer.outcome); return; }
                const second = resolveRollPrompt(activePrompt);
                showRollFeedback(second, language === 'fr' ? ' (relance)' : ' (reroll)');
                setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.gsReroll(offer.currency === 'indomitable' ? tr.gsRerollLabelIndomitable : tr.gsRerollLabelInspiration, second.total, second.prompt.dc || 10, Boolean(second.success))}]*` }]);
                finalizeRollOutcome(second, true);
              }}
              className="w-full rounded-xl border border-amber-400 bg-gradient-to-r from-amber-700 to-yellow-600 py-3.5 text-lg font-bold uppercase tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:from-amber-600 hover:to-yellow-500"
            >
              🎲 {rerollOffer.currency === 'indomitable'
                ? tr.rerollIndomitable
                : language === 'fr' ? `Relancer avec l'Inspiration` : 'Reroll with Inspiration'}
            </button>
            <button
              type="button"
              onClick={() => {
                const offer = rerollOffer;
                setRerollOffer(null);
                finalizeRollOutcome(offer.outcome);
              }}
              className="text-sm text-white/50 underline hover:text-white"
            >
              {language === 'fr' ? "Accepter l'échec" : 'Accept the failure'}
            </button>
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {pendingLevelUp && (
        <LevelUpModal
          character={character}
          newLevel={pendingLevelUp.to}
          fromLevel={pendingLevelUp.from}
          onConfirm={(updatedChar) => {
            // Les compagnons grandissent AVEC le héros : +4 PV max/niveau,
            // +1 attaque aux niveaux 5/9/13/17 (la bête du Beast Master scale
            // déjà via 4×niveau, la monture garde ses stats de type).
            const withCompanions = levelUpCompanions(updatedChar, pendingLevelUp.to);
            syncCharacterUpdate(withCompanions);
            // SP6 (contre-audit) — la montée de niveau doit AUSSI passer par le
            // canal critique : grantXP vient de poser un criticalOverlay (xp,
            // spellSlots/hitDice/resources d'AVANT le niveau) qui restait
            // prioritaire sur la fiche complète — les nouveaux emplacements de
            // sorts et dés de vie n'étaient pas persistés avant l'autosave 60 s.
            syncCharacterCritical(withCompanions, 'level');
            appendCampaignLog('levelup', `Level up: ${withCompanions.name} reached level ${pendingLevelUp.to} (${withCompanions.class})`);
            if ((withCompanions.companions?.length ?? 0) > 0 && dm && isConnected) {
              dm.sendSystemMessage(`[SYSTEM] The hero reached level ${pendingLevelUp.to} — their companions grew stronger too (+HP, better attacks at milestone levels). Acknowledge it briefly if fitting.`);
            }
            setPendingLevelUp(null);
          }}
          onClose={() => setPendingLevelUp(null)}
        />
      )}

    </div>
  );
}
