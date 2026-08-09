import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranscript } from '../hooks/useTranscript';
import { useSaveSync } from '../hooks/useSaveSync';
import { useCombatState } from '../hooks/useCombatState';
import { useDMConnection } from '../hooks/useDMConnection';
import { useToolProcessor } from '../hooks/useToolProcessor';
import { useMusicDirector } from '../hooks/useMusicDirector';
import { useGameStore } from '../store/gameStore';
import { LiveConnectionManager } from '../services/geminiRealtime';
import { auditBus } from '../services/auditBus';
import { auditNarration } from '../services/narrationAuditor';
import { runJournalKeeper } from '../services/journalKeeper';

import { AdventureManifest, CampaignRuntimeState, CharacterSheet, TimeOfDay, calculateLevelFromXP, getCombatAC, getEffectiveAC, getEffectiveStat, getPlayerAttackModifier, getPlayerDamageBonus, getXPProgress, parseItemStatModifier, getPlayerAttackCount } from '../types';
import { Mic, MicOff, Volume2, User, Backpack, Scroll, Swords, MessageSquare, LogOut, Book, Save, Music, Sparkles, Map as MapIcon, BookOpen, Settings as SettingsIcon, CalendarDays, Dices } from 'lucide-react';
import { DiceTray, DiceTrayRef } from './DiceTray';
import { RollingDice } from './RollingDice';
import { InventoryPanel, CharacterSheetPanel, toWeaponOverride } from './InGameMenus';
import SpellbookPanel from './SpellbookPanel';
import { CombatTracker, combatantSide, isHero } from './CombatTracker';
import { AuditWindow } from './AuditConsole';
import { ActionPrompt } from './ActionPrompt';
import { JournalPanel, Quest, NPC, ChronicleEntry } from './JournalPanel';
import { CampaignBoardPanel } from './CampaignBoardPanel';
import { saveService } from '../services/saveService';
import { memoryManager } from '../services/memoryManager';
import { t, Language } from '../services/translations';
import { StatusBar, StatusEffect } from './StatusBar';
import { ActionPips } from './ActionPips';
import { LevelUpModal } from './LevelUpModal';
import { campaignEventLog } from '../services/campaignEventLog';
import { buildCampaignDirectorContext } from '../services/campaignDirector';
import { advanceTurn, applyDeathSaveOutcome, applyLongRest, applyShortRest, resolveConcentrationAfterDamage, resolvePendingSpellRoll, resolveRollPrompt, resolveAttackAction, castSpell, consumeCombatAction, resolveMoraleCheck, normalizeRollPrompt, applyStoryModifiersToPrompt, selectEnemyTarget, encounterOutcome, applyDamageToEncounter, applyConditionToEncounter, normalizeStoryModifier, tickRoundEffects, rageEffect, monkMartialArtsDie, playerResistances, syncCompanionsFromState, worldHourOf, sweepExpiredEffects, stampEffectExpiry, resolveSpellAgainstTargets, levelUpCompanions } from '../services/rulesEngine';
import type { ProposedPlayerAction } from '../store/gameStore';
import { ProposedActionPrompt } from './ProposedActionPrompt';
import { DeathScreen } from './DeathScreen';
import { ReactionPrompt, ReactionRequest } from './ReactionPrompt';
import { SettingsPanel } from './SettingsPanel';
import type { ClassAbilityId } from './CombatActionsPanel';
import { AbilityHotbar } from './AbilityHotbar';
import { usePortrait, heroPortraitKey, portraitPrompt } from '../services/portraitService';
import { useSettingsStore } from '../store/settingsStore';
import { lyriaMusicService } from '../services/lyriaMusic';
import { getCreature, getCreatureAttacks, getMultiattackCount } from '../data/bestiary';
import { estimateXPFromHP } from '../services/xpSystem';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType } from '../data/companionOptions';
import { lookupMonster, lookupSpell } from '../services/codexService';
import { rollDice, maxRollOfFormula } from '../services/utils';
import { waitDice } from '../services/diceTiming';

// ========== STRUCTURED LOGGING ==========
const LOG = {
  combat: (msg: string, data?: any) => console.log(`⚔️ [COMBAT] ${msg}`, data ?? ''),
  xp: (msg: string, data?: any) => console.log(`⭐ [XP] ${msg}`, data ?? ''),
  engine: (msg: string, data?: any) => console.log(`🔧 [ENGINE] ${msg}`, data ?? ''),
  sync: (msg: string, data?: any) => console.log(`🔄 [SYNC] ${msg}`, data ?? ''),
  tag: (msg: string, data?: any) => console.log(`🏷️ [TAG] ${msg}`, data ?? ''),
  save: (msg: string, data?: any) => console.log(`💾 [SAVE] ${msg}`, data ?? ''),
  dm: (msg: string, data?: any) => console.log(`🎭 [DM] ${msg}`, data ?? ''),
};

const RuleCodexPanel = React.lazy(() =>
  import('./RuleCodexPanel').then(module => ({ default: module.RuleCodexPanel }))
);

const TRANS = {
  en: {
    devModeOn: '🛠️ *[DEVELOPER MODE ON — the DM now obeys your direct orders. Type IDDAD again to disable.]*',
    devModeOff: '🛠️ *[Developer mode disabled — the DM resumes its normal arbitration.]*',
    connectionRestored: '🔗 Connection restored. You may continue.',
    connectionLostRetry: '⚠️ Connection lost. Reconnecting…',
    connectionLostNotSent: '⚠️ Connection lost. Message not sent. Reconnecting…',
    sendError: '❌ Send error. Please try again.',
    nothingToSave: 'Nothing to save!',
    gameSaved: '💾 Game saved!',
    saveErrorConcurrency: 'Save error (concurrency or empty data).',
    saveError: 'Save error!',
    sagaBegins: 'The saga begins…',
    hero: 'Hero',
    dm: 'DM',
    talkToDM: 'Talk to the DM…',
    reconnecting: 'Reconnecting…',
    send: 'Send',
    micActive: 'Mic active',
    enableMic: 'Enable mic',
    pendingReconnect: 'message(s) awaiting reconnection',
    generatingScene: 'Generating the scene…',
    npcTurnInProgress: '🎲 NPC turn in progress…',
    campaign: 'Campaign',
    codex: 'Codex',
    spellbook: 'Spellbook',
    connectionLostSimple: 'Unable to reconnect to the server.',
    reference: 'Reference',
    connected: 'Connected',
    disconnected: 'Disconnected',
    waiting: 'waiting',
    saving: 'Saving…',
    save: 'Save',
    saveFailed: '☁️ Not synced',
    saveFailedTooltip: 'Cloud save is failing — recent progress may not be persisted. Check your connection, then click Save.',
    music: 'Music',
    shortRest: 'Short rest',
    longRest: 'Long rest',
    devBanner: '🛠️ Developer mode — the DM obeys',
    auditTitle: "Audit console (separate window) — system prompts, Gemini, image, SFX, music, combat",
    audit: '🔍 Audit',
    devTooltip: 'Developer mode (the DM obeys your direct orders). Same as typing IDDAD in the chat.',
    dev: '🛠 Dev',
    on: 'ON',
    off: 'OFF',
    loadingCodex: 'Loading the Codex…',
    hp: 'HP',
    levelWord: 'Level',
    combatEndedManually: '⚔️ Combat ended manually.',
    appliedToAttack: 'applied to your attack',
    damage: 'Damage',
    hit: 'HIT!',
    miss: 'MISS',
    critHit: 'CRITICAL HIT',
    touched: 'hit',
    missed: 'missed',
    attackLabel: 'Attack',
    attackN: (n: number, max: number) => max > 1 ? `Attack ${n}/${max}` : 'Attack',
    frenzy: 'Frenzy',
    warPriest: 'War Priest',
    offhandAttack: 'Off-hand attack',
    vs: 'vs',
    dodgeDesc: 'Active defense. Attacks against you have disadvantage.',
    test: 'check',
    saveWord: 'save',
    saveSuccess: 'succeeded',
    saveFail: 'failed',
    checkSuccess: 'success',
    checkFail: 'failure',
    target: 'target',
    takes: 'takes',
    enemyTargets: (npc: string, t: string) => `🎯 ${npc} targets ${t} (DM's choice)`,
    ac: 'AC',
    potion: 'Potion',
    healing: 'healing',
    abilitySecondWindLabel: 'Second Wind',
    abilityLayOnHandsLabel: 'Lay on Hands',
    abilityBardicLabel: 'Bardic Inspiration',
    abilityFlurryLabel: 'Flurry of Blows',
    abilityPatientLabel: 'Patient Defense',
    shieldReactionTitle: 'Incoming hit!',
    shieldReactionDetail: (attacker: string, total: number, ac: number) => `${attacker} hits you (${total} vs AC ${ac}) — Shield would turn it into a miss (AC ${ac + 5}).`,
    shieldCastLine: (attacker: string) => `🛡️ SHIELD! ${attacker}'s attack shatters against the arcane barrier (+5 AC until your next turn).`,
    dayWord: 'Day',
  },
  fr: {
    devModeOn: '🛠️ *[MODE DÉVELOPPEUR ACTIVÉ — le MJ obéit désormais à tes ordres directs. Retape IDDAD pour désactiver.]*',
    devModeOff: '🛠️ *[Mode développeur désactivé — le MJ reprend son arbitrage normal.]*',
    connectionRestored: '🔗 Connexion rétablie. Vous pouvez continuer.',
    connectionLostRetry: '⚠️ Connexion perdue. Tentative de reconnexion...',
    connectionLostNotSent: '⚠️ Connexion perdue. Message non envoyé. Tentative de reconnexion...',
    sendError: '❌ Erreur d\'envoi. Veuillez réessayer.',
    nothingToSave: 'Rien à sauvegarder !',
    gameSaved: '💾 Partie sauvegardée !',
    saveErrorConcurrency: 'Erreur de sauvegarde (concurrence ou données vides).',
    saveError: 'Erreur de sauvegarde !',
    sagaBegins: 'La saga commence…',
    hero: 'Héros',
    dm: 'MJ',
    talkToDM: 'Parler avec le DM...',
    reconnecting: 'Reconnexion en cours...',
    send: 'Envoyer',
    micActive: 'Micro actif',
    enableMic: 'Activer le micro',
    pendingReconnect: 'message(s) en attente de reconnexion',
    generatingScene: 'Génération de la scène…',
    npcTurnInProgress: '🎲 Tour des PNJ en cours…',
    campaign: 'Campagne',
    codex: 'Codex',
    spellbook: 'Grimoire',
    connectionLostSimple: 'Impossible de se reconnecter au serveur.',
    reference: 'Référence',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    waiting: 'en attente',
    saving: 'Sauvegarde…',
    save: 'Sauver',
    saveFailed: '☁️ Non synchronisé',
    saveFailedTooltip: 'La sauvegarde cloud échoue — la progression récente risque de ne pas être conservée. Vérifiez votre connexion, puis cliquez sur Sauver.',
    music: 'Musique',
    shortRest: 'Repos court',
    longRest: 'Repos long',
    devBanner: '🛠️ Mode développeur — le MJ obéit',
    auditTitle: "Console d'audit (fenêtre séparée) — system prompts, Gemini, image, SFX, musique, combat",
    audit: '🔍 Audit',
    devTooltip: 'Mode développeur (le MJ obéit à tes ordres directs). Équivaut à taper IDDAD dans le chat.',
    dev: '🛠 Dév',
    on: 'ON',
    off: 'OFF',
    loadingCodex: 'Chargement du Codex…',
    hp: 'PV',
    levelWord: 'Niveau',
    combatEndedManually: '⚔️ Combat terminé manuellement.',
    appliedToAttack: 'appliqué à votre attaque',
    damage: 'Dégâts',
    hit: 'TOUCHÉ !',
    miss: 'MANQUÉ',
    critHit: 'COUP CRITIQUE',
    touched: 'touché',
    missed: 'manqué',
    attackLabel: 'Attaque',
    attackN: (n: number, max: number) => max > 1 ? `Attaque ${n}/${max}` : 'Attaque',
    frenzy: 'Frénésie',
    warPriest: 'Prêtre de guerre',
    offhandAttack: 'Attaque off-hand',
    vs: 'vs',
    dodgeDesc: 'Défense active. Les attaques contre vous ont un désavantage.',
    test: 'test',
    saveWord: 'sauvegarde',
    saveSuccess: 'réussie',
    saveFail: 'ratée',
    checkSuccess: 'réussi',
    checkFail: 'raté',
    target: 'cible',
    takes: 'subit',
    enemyTargets: (npc: string, t: string) => `🎯 ${npc} cible ${t} (choix du MJ)`,
    ac: 'CA',
    potion: 'Potion',
    healing: 'soin',
    abilitySecondWindLabel: 'Second souffle',
    abilityLayOnHandsLabel: 'Imposition des mains',
    abilityBardicLabel: 'Inspiration bardique',
    abilityFlurryLabel: 'Déluge de coups',
    abilityPatientLabel: 'Défense patiente',
    shieldReactionTitle: 'Coup imminent !',
    shieldReactionDetail: (attacker: string, total: number, ac: number) => `${attacker} te touche (${total} vs CA ${ac}) — Bouclier transformerait le coup en échec (CA ${ac + 5}).`,
    shieldCastLine: (attacker: string) => `🛡️ BOUCLIER ! L'attaque de ${attacker} se brise sur la barrière arcanique (+5 CA jusqu'à ton prochain tour).`,
    dayWord: 'Jour',
  },
} as const;

function mergeTranscriptText(previous: string, incoming: string): string {
  const prev = previous.trimEnd();
  const next = incoming.trim();
  if (!next) return previous;
  if (!prev) return next;
  if (prev.endsWith(next)) return prev;
  if (next.startsWith(prev)) return next;

  const maxOverlap = Math.min(prev.length, next.length, 240);
  for (let size = maxOverlap; size >= 12; size--) {
    if (prev.slice(-size).toLowerCase() === next.slice(0, size).toLowerCase()) {
      return `${prev}${next.slice(size)}`;
    }
  }

  return `${prev} ${next}`;
}

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
  const [activePanel, setActivePanel] = useState<'none' | 'inventory' | 'character' | 'journal' | 'codex' | 'campaign' | 'spells' | 'settings'>('none');
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [playerRoll, setPlayerRoll] = useState<{ result: number, reason: string, success?: boolean } | null>(null);
  // {from, to}: the modal needs the PRE-grant level to count crossed ASI levels
  // (grantXP writes the new level on the sheet before the modal opens).
  const [pendingLevelUp, setPendingLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [floatingXP, setFloatingXP] = useState<{ id: string; amount: number; position: string }[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const dmLanguage = language === 'fr' ? 'French' : 'English';
  const [codexInitialTab, setCodexInitialTab] = useState<'spell' | 'rule' | 'item' | 'condition' | 'monster'>('spell');
  const [codexInitialQuery, setCodexInitialQuery] = useState('');
  const [activeReferenceUrl, setActiveReferenceUrl] = useState<string | null>(null);

  const handleOpenReference = (name: string, url: string) => {
    setCodexInitialTab('monster');
    setCodexInitialQuery(name);
    setActivePanel('codex');
    setActiveReferenceUrl(url);
  };

  // ─── Zustand store — single source of truth for shared session state ──────
  const bgImage = useGameStore(s => s.bgImage);
  const isGeneratingImage = useGameStore(s => s.isGeneratingImage);
  const journal = useGameStore(s => s.journal);
  const setJournal = useGameStore(s => s.setJournal);
  const currentRoll = useGameStore(s => s.currentRoll);
  const setCurrentRoll = useGameStore(s => s.setCurrentRoll);
  const activePrompt = useGameStore(s => s.activePrompt);
  const setActivePrompt = useGameStore(s => s.setActivePrompt);
  const setTranscriptStore = useGameStore(s => s.setTranscript);
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
  const [rerollOffer, setRerollOffer] = useState<{ outcome: any } | null>(null);
  // ── Portrait du héros (généré localement, cache IndexedDB) ─────────────
  const heroPortraitUrl = usePortrait(
    heroPortraitKey(saveId, character.name),
    portraitPrompt(
      `${character.name || 'a hero'}, ${character.race} ${character.class}`,
      character.storyProfile?.appearance || undefined
    )
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
    if (entry.type === 'attack' || entry.type === 'damage' || entry.type === 'save') {
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

  // Auto-select target on combat change
  useEffect(() => {
    if (combatState.isActive) {
      combatEndedRef.current = false; // a fresh/active combat can end again
      const livingEnemies = combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0);
      if (livingEnemies.length > 0) {
        if (!selectedTargetId || !livingEnemies.some(e => e.id === selectedTargetId)) {
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
        + ((currentChar.feats || []).includes('tough') ? 2 : 0);
      const hpGain = levelsGained * perLevelGain;
      const newMaxHP = currentChar.hp.max + hpGain;

      syncCharacterCritical({
        ...currentChar, xp: newXP, level: newLevel,
        hp: { current: newMaxHP, max: newMaxHP }
      }, 'level');

      setPendingLevelUp({ from: currentChar.level, to: newLevel });
      setTranscript(prev => [...prev,
      { speaker: 'dm', text: `🎊 LEVEL UP! Level ${newLevel}! Max HP: ${newMaxHP}!` },
      { speaker: 'user', text: `[SYSTEM: ${currentChar.name} (${currentChar.class}) reached level ${newLevel}! HP: ${newMaxHP}/${newMaxHP}. Adjust challenges accordingly.]` }
      ]);
    } else {
      syncCharacterCritical({ ...currentChar, xp: newXP }, 'xp');
    }

    setTranscript(prev => [...prev, {
      speaker: 'dm', text: `⭐ +${amount} XP (${reason}) — Total: ${newXP}`
    }]);

    // ── NEW: Log to Chronicle ──────────────────────────────────────────
    const chronicleEntry = {
      id: `xp_${Date.now()}`,
      title: reason,
      description: `Gained ${amount} XP. Total now: ${newXP}.`,
      timestamp: Date.now()
    };

    setJournal(prev => {
      const updated = { ...prev, chronicle: [...(prev.chronicle || []), chronicleEntry] };
      syncJournalImmediate(updated);
      return updated;
    });
  };

  // We need isConnected for musicDirector, but useDMConnection comes after.
  // We can use a ref or just rely on react reactivity, but since useTagProcessor uses refs for deps,
  // we can declare processMessage first, pass a placeholder musicDirector or one that uses a ref to isConnected.
  // Actually, we'll just put things in standard order.
  
  // Forward-declare the state so we can use it in musicDirector before it's "officially" created? 
  // Custom hooks don't strictly care about order if they just return functions. But useDMConnection takes processMessage.
  // Let's just define a local ref for isConnected.
  const isConnectedRef = useRef(false);
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
      if (newHistory.length > 0 && newHistory[newHistory.length - 1].speaker === speaker) {
          newHistory[newHistory.length - 1].text = mergeTranscriptText(newHistory[newHistory.length - 1].text, text);
          return newHistory;
      }
      return [...newHistory, { speaker, text }];
    });
  }, [setTranscript]);

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
    campaignEventLog.getEvents().length,
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
    isConnectedRef.current = isConnected;
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
      (journal.quests || []).filter((q: any) => q.status === 'active').length,
      (journal.npcs || []).length,
    ].join('|');
    if (directorPushKeyRef.current === significanceKey) return;
    const isFirstRun = directorPushKeyRef.current === '';
    directorPushKeyRef.current = significanceKey;
    // The initial context already ships inside the system prompt at connection.
    if (!isFirstRun) dm.flushDirectorContext();
  }, [dm, isConnected, directorContext]);

  // ── Narration consistency auditor (light verifier agent) ─────────────────
  // Throttled async Flash pass comparing the DM's latest narration to the REAL
  // engine state (HP, gold, inventory, combat). On a clear contradiction it
  // sends a private corrective note so the DM realigns in the next beat —
  // invisible to the player, at most one check per 90s.
  const lastNarrationAuditRef = React.useRef({ at: 0, transcriptLen: 0 });
  useEffect(() => {
    if (!dm || !isConnected || transcript.length === 0) return;
    const last = transcript[transcript.length - 1];
    if (last.speaker !== 'dm') return;
    if (/^\s*\*?\[/.test(last.text.trim())) return; // skip [SYSTEM]/marker lines
    if (last.text.trim().length < 120) return;      // too short to contradict anything material
    const now = Date.now();
    if (now - lastNarrationAuditRef.current.at < 90000) return;
    if (transcript.length === lastNarrationAuditRef.current.transcriptLen) return;
    lastNarrationAuditRef.current = { at: now, transcriptLen: transcript.length };

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
    void auditNarration({ narration: last.text, stateFacts, language }).then(result => {
      if (!result || result.consistent || !result.note) return;
      auditBus.publish('gemini-system', `Consistency check flagged: ${result.note.slice(0, 80)}`, { note: result.note, narration: last.text });
      dm.sendSystemMessage(`[SYSTEM] Consistency check — the engine state disagrees with your last narration: ${result.note} Honor the engine values from now on; do not announce a correction, just weave the true state into the fiction.`);
    });
  }, [dm, isConnected, transcript, character, combatState, language]);

  // ── Greffier de journal (background scribe) ──────────────────────────────
  // Toutes les ~2 min hors combat, relit le dialogue récent et consigne ce que
  // le MJ vocal a oublié : étapes de quête franchies, moments de chronique,
  // faits appris sur les PNJ. Applique via les MÊMES outils que le MJ.
  const journalKeeperRef = React.useRef({ at: 0, transcriptLen: 0, running: false });
  useEffect(() => {
    if (!isConnected || combatState.isActive) return;
    const now = Date.now();
    const ref = journalKeeperRef.current;
    if (ref.running || now - ref.at < 120_000) return;
    const fresh = transcript.slice(ref.transcriptLen).filter(m => !/^\s*\*?\[/.test(m.text.trim()));
    if (fresh.length < 8) return;
    ref.at = now;
    ref.transcriptLen = transcript.length;
    ref.running = true;

    const journalNow = useGameStore.getState().journal;
    const activeQuests = (journalNow.quests || [])
      .filter((q: any) => q.status === 'active')
      .map((q: any) => `${q.title} — steps: ${(q.steps || []).map((s: any) => `${s.done ? '[x]' : '[ ]'} ${s.text}`).join('; ') || 'none'}`);
    const input = {
      transcriptLines: transcript.slice(-30)
        .filter(m => !/^\s*\*?\[/.test(m.text.trim()))
        .map(m => `${m.speaker === 'dm' ? 'DM' : 'PLAYER'}: ${m.text.slice(0, 300)}`),
      activeQuests,
      npcNames: (journalNow.npcs || []).map((n: any) => n.name),
      recentMoments: (journalNow.chronicle || []).slice(-8).map((c: any) => c.title),
      language,
    };
    void runJournalKeeper(input).then(async result => {
      if (!result) return;
      const applied: string[] = [];
      for (const step of result.questStepUpdates) {
        const r: any = await processToolCall({ name: 'update_quest_step', args: { questTitle: step.questTitle, step: step.stepText, done: step.done } });
        if (r?.success) applied.push(`étape « ${step.stepText.slice(0, 50)} »`);
      }
      for (const moment of result.moments) {
        const r: any = await processToolCall({ name: 'add_story_moment', args: { title: moment.title, description: moment.description } });
        if (r?.success) applied.push(`moment « ${moment.title.slice(0, 50)} »`);
      }
      for (const fact of result.npcFacts) {
        const r: any = await processToolCall({ name: 'update_npc', args: { name: fact.name, memory: fact.fact } });
        if (r?.success) applied.push(`PNJ ${fact.name}`);
      }
      if (applied.length) {
        auditBus.publish('gemini-system', `Journal keeper logged: ${applied.join(', ')}`, result);
        campaignEventLog.append('JOURNAL_UPDATED', `Journal keeper (background) logged: ${applied.join(', ')}`, result as any);
      }
    }).finally(() => { journalKeeperRef.current.running = false; });
  }, [isConnected, transcript, combatState.isActive, language, processToolCall]);

  // ── Fix #3: DEATH SAVES — auto-trigger at HP=0 ──────────────────────────────
  const lastDeathSavePromptKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    const deathSaves = character.deathSaves || { successes: 0, failures: 0, isStable: false, isDead: false };
    const needsDeathSave = character.hp.current <= 0 && !deathSaves.isStable && !deathSaves.isDead;
    if (!needsDeathSave) {
      lastDeathSavePromptKeyRef.current = null;
      return;
    }
    if (!dm || !isConnected || activePrompt?.type === 'DEATH_SAVE') return;

    const promptKey = `${deathSaves.successes}:${deathSaves.failures}:${combatState.currentTurn || 'free'}`;
    if (lastDeathSavePromptKeyRef.current === promptKey) return;
    lastDeathSavePromptKeyRef.current = promptKey;

    setActivePrompt({
      type: 'DEATH_SAVE',
      name: 'Death Saving Throw',
      formula: '1d20',
      dc: 10,
      advantage: 'normal',
      dmBonus: 0,
      requestedAt: Date.now()
    });
    dm.sendSystemMessage(`[SYSTEM: ${character.name} has dropped to 0 HP. The local rules engine is requesting and resolving the death saving throw. Narrate only after the ROLL_RESULT.]`);
    setTranscript(prev => [...prev, { speaker: 'dm', text: 'Death save required. Roll a d20.' }]);
  }, [
    activePrompt?.type,
    character.hp.current,
    character.deathSaves?.successes,
    character.deathSaves?.failures,
    character.deathSaves?.isStable,
    character.deathSaves?.isDead,
    character.name,
    combatState.currentTurn,
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
      alert(tr.nothingToSave);
      return;
    }

    try {
      const success = await triggerManualSave();
      if (success) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: tr.gameSaved }]);
      } else {
        alert(tr.saveErrorConcurrency);
      }
    } catch (err) {
      console.error('❌ Save failed:', err);
      alert(tr.saveError);
    }
  };

  // Manual end combat function (emergency button)
  const handleManualEndCombat = () => {
    persistCompanionHP(useGameStore.getState().combatState);
    setCombatState({ isActive: false, combatants: [], currentTurn: '' });
    setIsNPCTurn(false);
    setTranscript(prev => [...prev, { speaker: 'dm', text: tr.combatEndedManually }]);
  };

  const handleAdvanceTurn = () => {
    const next = advanceTurn(combatState);
    setCombatState(next);
    campaignEventLog.append('COMBAT_TURN_ADVANCED', `Manual turn advance to ${next.currentTurn}`, {
      currentTurn: next.currentTurn,
      round: next.round,
    });
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Turn advanced to ${next.currentTurn}]*` }]);
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
    // Monture tombée à 0 : morte (retirée de la fiche) — SAUF le Destrier
    // céleste, esprit qui regagne les plans et revient au prochain repos long.
    if (synced.mount?.hp && synced.mount.hp.current <= 0) {
      if (synced.mount.kind === 'destrier_celeste') {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ✨ ${synced.mount!.name} se dissout en lumière — le destrier céleste reviendra au prochain repos long.]*` }]);
        if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] The celestial steed ${synced.mount.name} was slain and returned to the higher planes. It will answer the paladin's call again after a LONG REST. Narrate its luminous departure.`);
      } else {
        const fallenName = synced.mount.name;
        synced = { ...synced, mount: undefined };
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${fallenName} est tombé au combat.]*` }]);
        if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] The hero's mount ${fallenName} was KILLED in this fight. It is gone — narrate the loss with weight; a new mount must be found or bought.`);
      }
    }
    if (synced !== freshChar) syncCharacterUpdate(synced);
  };

  const maybeEndCombat = (state: any): boolean => {
    const outcome = encounterOutcome(state);
    if (outcome === 'ongoing') return false;
    if (combatEndedRef.current) return true;
    combatEndedRef.current = true;
    setIsNPCTurn(false);
    if (outcome === 'victory') {
      const enemies = (state.combatants || []).filter((c: any) => (c.side ? c.side === 'enemy' : !c.isPlayer));
      // Ordre de préférence : xp explicite du MJ (add_enemy_init) → bestiaire →
      // estimation par PV max (les ennemis custom valaient un forfait de 25 XP).
      const xp = enemies.reduce((sum: number, e: any) => sum + (
        (Number(e.xpValue) > 0 ? Number(e.xpValue) : 0)
        || getCreature(e.name)?.xp
        || lookupMonster(e.name)?.xp
        || estimateXPFromHP(e.hp?.max ?? 1)
      ), 0);
      if (xp > 0) grantXP(xp, 'Combat victory');
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Victoire ! +${xp} XP]*` }]);
      if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] All enemies are defeated or fled. Combat is over (victory). Narrate the aftermath.`);
      musicDirector.handleMusicTag('victory');
    }
    persistCompanionHP(state);
    // Clear the roster too: leftover corpses re-entered the NEXT fight via
    // startEncounter's roster reuse and their XP was awarded a second time.
    setCombatState({ ...state, isActive: false, combatants: [], currentTurn: '', enemyIntents: {} });
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

  // ── Action pips (player economy) ─────────────────────────────────────────
  // Green pips = main-action attacks remaining (Extra Attack gives several),
  // amber pips = bonus actions. The legacy actionUsed/bonusActionUsed booleans
  // stay in sync (used >= max) so every existing check keeps working.
  const getPlayerEconomy = (state: any) => (state.actionEconomy?.['player']) || {};
  const patchPlayerEconomy = (state: any, patch: any) => {
    const cur = getPlayerEconomy(state);
    const next: any = { ...cur, ...patch };
    next.actionUsed = (next.attacksUsed ?? 0) >= (next.attacksMax ?? 1);
    next.bonusActionUsed = (next.bonusUsed ?? 0) >= (next.bonusMax ?? 1);
    return { ...state, actionEconomy: { ...(state.actionEconomy || {}), player: next } };
  };
  // A spell / dodge / potion / improv card spends ONE main action — c.-à-d. une
  // « tranche » de pips égale à l'Extra Attack de base. Avant, ça vidait TOUS
  // les pips : un tour avec Sursaut d'action (pips doublés) perdait aussi
  // l'action bonus du Sursaut en lançant un sort.
  const spendPlayerMainAction = (state: any) => {
    const econ = getPlayerEconomy(state);
    const base = getPlayerAttackCount(character);
    const max = econ.attacksMax ?? base;
    return patchPlayerEconomy(state, { attacksUsed: Math.min(max, (econ.attacksUsed ?? 0) + base) });
  };
  const spendPlayerBonus = (state: any) => {
    const econ = getPlayerEconomy(state);
    return patchPlayerEconomy(state, { bonusUsed: (econ.bonusUsed ?? 0) + 1 });
  };

  const handlePlayerAttack = async (weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    // Retarget to a living enemy if the selected one is already down.
    if (!target || target.hp.current <= 0) {
      target = combatState.combatants.find(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
    }
    if (!target) return;

    // ONE attack per click — read the player's remaining attack pips.
    const econ0 = getPlayerEconomy(combatState);
    const attacksMax = econ0.attacksMax ?? getPlayerAttackCount(character);
    const attacksUsed = econ0.attacksUsed ?? 0;
    if (attacksUsed >= attacksMax) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Plus d'attaque ce tour — terminez votre tour ou utilisez une action bonus.]*` }]);
      return;
    }
    const isFirstAttack = attacksUsed === 0;

    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      // L'arme SÉLECTIONNÉE (épée en main OU arc du slot distance) devient
      // l'arme du personnage pour cette résolution : le moteur (bandes de
      // distance, sneak, jet, GWM) juge la bonne arme, pas character.weapon.
      const weaponShape = toWeaponOverride(weaponItem);
      const attackChar = { ...character, weapon: weaponShape };
      const damageBonus = getPlayerDamageBonus(attackChar);
      const baseAttackBonus = getPlayerAttackModifier(attackChar);
      const damageDice = weaponItem.damageDice || weaponItem.damage || '1d4';
      const damageFormula = `${damageDice}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;

      // Story modifiers (advantage / graded bonus / inspiration) are consumed on
      // the FIRST attack of the turn only.
      let dmBonus = 0;
      let advantage: any = undefined;
      if (isFirstAttack) {
        const attackPrompt = normalizeRollPrompt({
          reason: `${character.name} attacks ${target.name}`,
          formula: `1d20${baseAttackBonus >= 0 ? '+' : ''}${baseAttackBonus}`,
          dc: target.ac,
        });
        const mod = applyStoryModifiersToPrompt(attackPrompt, (character as any).storyModifiers || []);
        if (mod.applied.length) {
          onCharacterUpdate({ ...character, storyModifiers: mod.remaining } as any);
          const labels = mod.applied.map((m: any) => {
            const b = m.bonus ? ` ${m.bonus > 0 ? '+' : ''}${m.bonus}` : '';
            const adv = m.mode && m.mode !== 'normal' ? ` (${m.mode})` : '';
            return `${m.name}${b}${adv}`;
          }).join(', ');
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎲 ${labels} — ${tr.appliedToAttack}]*` }]);
        }
        dmBonus = mod.prompt.dmBonus || 0;
        advantage = mod.prompt.advantage;
      }

      const attackNum = attacksUsed + 1;
      const label = `${tr.attackN(attackNum, attacksMax)} : ${weaponItem.name}`;

      const result = resolveAttackAction(combatState, {
        attacker: 'player',
        target: target.id,
        attackBonus: baseAttackBonus + dmBonus,
        damageFormula,
        damageType: weaponItem.damageType || 'slashing',
        attackName: weaponItem.name,
        advantage,
        consumeAction: false, // pips are managed below, not via the boolean economy
        powerAttack: opts?.powerAttack, // -5/+10, revalidé côté moteur (feat + arme)
      } as any, attackChar);

      if (result.success && (result as any).advanced) {
        // Cible trop loin : l'attaque est devenue un ENGAGEMENT (far → near).
        let state = patchPlayerEconomy(result.state, { attacksUsed: attacksUsed + 1 });
        setCombatState(state);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${character.name} se rapproche de ${target.name} (loin → proche) — attaque au prochain pas.]*` }]);
        if (dm && isConnected) {
          await dm.sendUserMessage(`[SYSTEM] The player CLOSED THE DISTANCE toward ${target.name} (far → near) instead of striking — the target was too far for melee. Narrate the charge. Do NOT advance the turn.`);
        }
        return;
      }
      if (!result.success || !result.resolution) {
        console.error('Attack resolution failed:', result.error);
        return;
      }
      const res = result.resolution;
      let state = result.state;

      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        setPlayerRoll({ result: res.damage, reason: `${tr.damage} : ${res.damage} (${res.damageType})` });
        await waitDice();
      }

      logCombatRoll({
        type: 'attack', name: label,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`,
        isDM: false, success: res.hit,
      });
      if (res.hit && res.damage > 0) {
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: res.damageFormula, isDM: false });
      }

      // Consume ONE attack pip (the pip turns green → gray in the HUD).
      state = patchPlayerEconomy(state, { attacksUsed: attacksUsed + 1 });
      setCombatState(state);

      if (dm && isConnected) {
        const hitOrMiss = res.hit ? (res.criticalHit ? 'COUP CRITIQUE' : 'touché') : 'manqué';
        await dm.sendUserMessage(`[SYSTEM] Player attack ${attackNum}/${attacksMax} with ${weaponItem.name} on ${res.target}: ${hitOrMiss}${res.hit ? ` ${res.damage} ${res.damageType}` : ''}. Narrate it briefly. Do NOT advance the turn.`);
      }

      maybeEndCombat(state);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  // Bonus-action attack: off-hand weapon (two-weapon fighting), Berserker
  // Frenzy (main weapon while raging), or War Domain's War Priest. All three
  // consume the single amber bonus pip; the engine resolves the real dice.
  const handlePlayerBonusAttack = async (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' = 'offhand') => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    if (!target || target.hp.current <= 0) {
      target = combatState.combatants.find(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
    }
    if (!target) return;

    const econ0 = getPlayerEconomy(combatState);
    const bonusMax = econ0.bonusMax ?? 1;
    const bonusUsed = econ0.bonusUsed ?? 0;
    if (bonusUsed >= bonusMax) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Action bonus déjà utilisée ce tour.]*` }]);
      return;
    }
    // SRD: l'attaque off-hand et War Priest exigent d'avoir PRIS l'action
    // Attaque d'abord (au moins une attaque principale ce tour). La Frénésie
    // du Berserker n'a pas ce prérequis (elle exige la Rage, vérifiée côté UI).
    const attacksUsed = econ0.attacksUsed ?? 0;
    if (mode !== 'frenzy' && attacksUsed === 0) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Attaque d'abord avec ton arme principale — l'attaque bonus vient APRÈS l'action Attaque.]*` }]);
      return;
    }

    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      const isOffhand = mode === 'offhand';
      const attackBonus = getPlayerAttackModifier(character, weaponItem);
      const damageBonus = getPlayerDamageBonus(character, weaponItem, isOffhand);
      const damageDice = weaponItem.damageDice || weaponItem.damage || '1d4';
      const damageFormula = `${damageDice}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;
      const label = mode === 'frenzy'
        ? `${tr.frenzy} : ${weaponItem.name}`
        : mode === 'warpriest'
          ? `${tr.warPriest} : ${weaponItem.name}`
          : `${tr.offhandAttack} : ${weaponItem.name}`;

      const result = resolveAttackAction(combatState, {
        attacker: 'player',
        target: target.id,
        attackBonus,
        damageFormula,
        damageType: weaponItem.damageType || 'slashing',
        attackName: weaponItem.name,
        consumeAction: false,
      } as any, { ...character, weapon: toWeaponOverride(weaponItem) });

      if (result.success && (result as any).advanced) {
        // Cible hors de portée : le bonus se convertit en rapprochement.
        setCombatState(spendPlayerBonus(result.state));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${character.name} se rapproche de ${target.name} (loin → proche).]*` }]);
        return;
      }
      if (!result.success || !result.resolution) {
        console.error('Bonus attack resolution failed:', result.error);
        return;
      }
      const res = result.resolution;
      let state = result.state;

      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        setPlayerRoll({ result: res.damage, reason: `${tr.damage} : ${res.damage} (${res.damageType})` });
        await waitDice();
      }

      logCombatRoll({
        type: 'attack', name: label,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`,
        isDM: false, success: res.hit,
      });
      if (res.hit && res.damage > 0) {
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: res.damageFormula, isDM: false });
      }

      // Consume the amber bonus pip.
      state = spendPlayerBonus(state);
      setCombatState(state);

      // War Priest spends one use of its long-rest resource.
      if (mode === 'warpriest') {
        const res0 = (character as any).resources?.warPriest;
        if (res0) {
          syncCharacterUpdate({
            ...character,
            resources: { ...(character as any).resources, warPriest: { ...res0, current: Math.max(0, res0.current - 1) } },
          } as any);
        }
      }

      if (dm && isConnected) {
        const hitOrMiss = res.hit ? (res.criticalHit ? 'COUP CRITIQUE' : 'touché') : 'manqué';
        await dm.sendUserMessage(`[SYSTEM] Player BONUS-ACTION attack (${mode}) with ${weaponItem.name} on ${res.target}: ${hitOrMiss}${res.hit ? ` ${res.damage} ${res.damageType}` : ''}. Narrate it briefly. Do NOT advance the turn.`);
      }

      maybeEndCombat(state);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  const handlePlayerCastSpell = async (spellName: string, slotLevel: string | null, targetId: string) => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    // Sort de ZONE : cible 'all_enemies' → chaque ennemi vivant fera SA
    // sauvegarde (résolution moteur ci-dessous). Le cast lui-même est plombé
    // sur le premier ennemi pour construire DC/dés.
    const isAoECast = targetId === 'all_enemies';
    const aoeTargets = isAoECast
      ? combatState.combatants.filter(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0)
      : [];
    const effectiveTargetId = isAoECast ? (aoeTargets[0]?.id ?? targetId) : targetId;
    const target = combatState.combatants.find(c => c.id === effectiveTargetId);
    const targetName = isAoECast
      ? (language === 'fr' ? 'tous les ennemis' : 'all enemies')
      : (target ? target.name : 'Target');

    const spellLevelNum = slotLevel ? Number(slotLevel.replace('level', '')) : undefined;

    // Derived target save bonus if save-based spell
    const creatureData: any = target ? (lookupMonster(target.name) || getCreature(target.name)) : null;
    const saveAbility = lookupSpell(spellName)?.save?.ability || 'DEX';
    // Narrow the CreatureStats | CodexMonsterRef union (same logic as rulesEngine
    // castSpell): `saves` is already a modifier; `stats` is an ability score that
    // converts via (score-10)/2. Only fall back to +0 when neither exists —
    // previously `.stats?.[...] || 10` silently gave every codex-ref monster +0.
    let targetSaveBonusMod = 0;
    if (creatureData && 'saves' in creatureData && creatureData.saves?.[saveAbility] !== undefined) {
        targetSaveBonusMod = creatureData.saves[saveAbility];
    } else if (creatureData && 'stats' in creatureData && creatureData.stats?.[saveAbility] !== undefined) {
        targetSaveBonusMod = Math.floor((creatureData.stats[saveAbility] - 10) / 2);
    }

    const spellResult = castSpell(character, {
      spellName,
      slotLevel: spellLevelNum,
      target: targetName,
      targetAC: target?.ac,
      targetSaveBonus: targetSaveBonusMod,
      worldHour: worldHourOf(dayCount, timeOfDay),
      maximizeHealing: !!character.storyMode,
    });

    if (!spellResult.success) {
      console.error('Spell cast failed:', spellResult.error);
      return;
    }

    // Update character sheet
    onCharacterUpdate(spellResult.character);
    syncCharacterCritical(spellResult.character, 'hp');

    if (spellResult.healing && spellResult.healing > 0) {
      // 1. Roll healing animation
      setPlayerRoll({
        result: spellResult.healing,
        reason: `Cast: ${spellName} (Healed: ${spellResult.healing} HP)`
      });
      await waitDice();

      // 2. Add log
      logCombatRoll({
        type: 'damage',
        name: `Healed: ${spellName}`,
        total: spellResult.healing,
        formula: spellResult.spell?.healing?.dice || '1d8',
        isDM: false
      });

      // 3. Update target combatant HP
      if (targetId === 'player' || target?.isPlayer) {
        const updatedCombatants = combatState.combatants.map(c => 
          c.isPlayer ? { ...c, hp: { ...c.hp, current: spellResult.character.hp.current } } : c
        );
        setCombatState({ ...combatState, combatants: updatedCombatants });
      } else if (target) {
        const updatedHP = Math.min(target.hp.max, target.hp.current + spellResult.healing);
        const updatedCombatants = combatState.combatants.map(c => 
          c.id === target.id ? { ...c, hp: { ...c.hp, current: updatedHP } } : c
        );
        setCombatState({ ...combatState, combatants: updatedCombatants });
      }

      // 4. Send to DM
      if (dm && isConnected) {
        const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Healing: ${spellResult.healing} HP. Please narrate this action in character.`;
        await dm.sendUserMessage(msg);
      }
    } else if (isAoECast && spellResult.prompt?.type === 'SAVE' && spellResult.prompt.pendingSpell && aoeTargets.length) {
      // ── ZONE : sauvegarde individuelle par ennemi, dégâts lancés UNE fois ──
      const prompt = spellResult.prompt;
      const aoe = resolveSpellAgainstTargets(combatState, prompt, aoeTargets.map(t => t.id));
      if (aoe) {
        setCombatState(aoe.state);
        if (aoe.sharedDamageRoll > 0) {
          setPlayerRoll({ result: aoe.sharedDamageRoll, reason: `${spellName} — ${language === 'fr' ? 'dégâts de zone' : 'area damage'}` });
          await waitDice();
        }
        for (const r of aoe.results) {
          logCombatRoll({
            type: 'save',
            name: `${r.name} — ${spellName}`,
            total: r.saveTotal,
            formula: `vs DC ${prompt.dc}`,
            isDM: true,
            success: r.saveSuccess,
          });
          if (r.damage > 0) {
            logCombatRoll({ type: 'damage', name: `${spellName} → ${r.name}`, total: r.damage, formula: prompt.pendingSpell?.damageFormula || '', isDM: false });
          }
        }
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} (zone) — ${aoe.summary}]*` }]);
        if (dm && isConnected) {
          await dm.sendUserMessage(`[SYSTEM] Player cast ${spellName} on ALL enemies (area). Per-target results: ${aoe.summary}. All HP changes are applied — narrate the blast in ONE beat, do not re-roll anything.`);
        }
      }
    } else if (spellResult.prompt) {
      // Spell requires attack roll or saving throw
      const prompt = spellResult.prompt;
      const outcome = resolveRollPrompt(prompt);

      // 1. Show d20 animation
      setPlayerRoll({
        result: outcome.total,
        reason: `${spellName} ${prompt.type === 'ATTACK' ? 'Attack' : 'Save'} vs ${targetName} (${outcome.success ? 'Success' : 'Failure'})`,
        success: outcome.success
      });
      await waitDice();

      // Resolve pending spell roll on combat state
      const spellRes = resolvePendingSpellRoll(combatState, outcome);
      if (spellRes.resolved) {
        setCombatState(spellRes.state);

        // If target took damage, show damage animation
        if (spellRes.damage && spellRes.damage > 0) {
          setPlayerRoll({
            result: spellRes.damage,
            reason: `${spellName} Damage`
          });
          await waitDice();
        }

        // Add log
        logCombatRoll({
          type: prompt.type === 'ATTACK' ? 'attack' : 'save',
          name: `${spellName} (${prompt.type})`,
          total: outcome.total,
          formula: outcome.formulaLabel,
          isDM: false,
          success: outcome.success
        });

        if (spellRes.damage && spellRes.damage > 0) {
          logCombatRoll({
            type: 'damage',
            name: `${spellName} Damage`,
            total: spellRes.damage,
            formula: prompt.pendingSpell?.damageFormula || '1d6',
            isDM: false
          });
        }

        // Update player HP if target was player
        if (spellRes.target?.isPlayer) {
          onCharacterUpdate({
            ...character,
            hp: spellRes.target.hp,
            activeEffects: spellRes.target.activeEffects || character.activeEffects
          });
        }

        // Send to DM
        if (dm && isConnected) {
          const outcomeStr = outcome.success ? 'Success' : 'Failure';
          const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Roll: ${outcome.total} (${outcome.formulaLabel}) vs DC/AC ${prompt.dc} (${outcomeStr}). Damage/Effect: ${spellRes.summary}. Please narrate this action in character.`;
          await dm.sendUserMessage(msg);
        }
      }
    } else {
      // Spell has direct utility/effect (no rolls)
      logCombatRoll({
        type: 'check',
        name: `Cast Spell: ${spellName}`,
        total: 0,
        formula: 'Slot consumed',
        isDM: false
      });

      if (dm && isConnected) {
        const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Effect: ${spellResult.summary}. Please narrate this action in character.`;
        await dm.sendUserMessage(msg);
      }
    }

    // Casting a spell spends the whole main action (all remaining attack pips).
    if (combatState.isActive) setCombatState((s: any) => spendPlayerMainAction(s));
    // The player ends their turn explicitly — don't auto-advance. Resolve victory
    // if this spell dropped the last foe.
    maybeEndCombat(useGameStore.getState().combatState);
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  // ── Capacités de classe (Rage, Second souffle, Sursaut, Imposition, Ki,
  //    Inspiration bardique) — les ressources existaient sur la fiche mais
  //    AUCUN bouton ne les consommait. Chaque branche : garde-fous, dépense de
  //    la ressource + du pip, effet moteur réel, dés visibles, rapport au MJ.
  const spendResource = (char: CharacterSheet, key: string, amount = 1): CharacterSheet => ({
    ...char,
    resources: {
      ...(char.resources || {}),
      [key]: { ...(char.resources as any)[key], current: Math.max(0, ((char.resources as any)[key]?.current ?? 0) - amount) },
    },
  });

  const handleUseClassAbility = async (abilityId: ClassAbilityId, targetId?: string) => {
    if (actionLockRef.current) return;
    // Hotbar BG3 : utilisable AUSSI hors combat (Imposition des mains,
    // Second souffle, Inspiration bardique, familier…). Les capacités qui
    // exigent l'économie de tour restent verrouillées en combat.
    const inCombat = useGameStore.getState().combatState.isActive;
    if (!inCombat && ['actionSurge', 'kiFlurry', 'kiPatientDefense', 'cunningDash', 'superiorityStrike'].includes(abilityId)) return;
    const patchCombat = (value: any) => { if (inCombat) setCombatState(value); };
    const char = useGameStore.getState().character;
    if (!char) return;
    const res: any = char.resources || {};
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      if (abilityId === 'rage' && (res.rage?.current ?? 0) > 0) {
        const effect = rageEffect();
        const updated = spendResource({ ...char, activeEffects: [...(char.activeEffects || []), effect] }, 'rage');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 RAGE — +2 dégâts, résistance aux dégâts physiques (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] The player enters a RAGE (bonus action): +2 damage, resistance to physical damage. Narrate the fury briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'secondWind' && (res.secondWind?.current ?? 0) > 0) {
        const heal = rollDice(`1d10+${char.level || 1}`).total;
        const nextHP = Math.min(char.hp.max, char.hp.current + heal);
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'secondWind');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilitySecondWindLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilitySecondWindLabel, total: heal, formula: `1d10+${char.level}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Second Wind (bonus action) and regained ${heal} HP (now ${nextHP}/${char.hp.max}). Narrate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'actionSurge' && (res.actionSurge?.current ?? 0) > 0) {
        const extra = getPlayerAttackCount(char);
        syncCharacterCritical(spendResource(char, 'actionSurge'), 'hp');
        patchCombat((prev: any) => {
          const econ = prev.actionEconomy?.['player'] || {};
          return patchPlayerEconomy(prev, { attacksMax: (econ.attacksMax ?? extra) + extra });
        });
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ Sursaut d'action — +${extra} attaque(s) ce tour]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used ACTION SURGE: ${extra} extra attack(s) this turn. Narrate the burst of speed. Do NOT advance the turn.`);
      } else if (abilityId === 'layOnHands' && (res.layOnHands?.current ?? 0) > 0) {
        const missing = char.hp.max - char.hp.current;
        const heal = Math.min(res.layOnHands.current, missing);
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'layOnHands', heal);
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilityLayOnHandsLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilityLayOnHandsLabel, total: heal, formula: `${language === 'fr' ? 'réserve' : 'pool'} -${heal}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Lay on Hands (action) and healed ${heal} HP (now ${nextHP}/${char.hp.max}; pool left ${updated.resources?.layOnHands?.current ?? 0}). Narrate the divine touch. Do NOT advance the turn.`);
      } else if (abilityId === 'bardicInspiration' && (res.bardicInspiration?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const die = lvl >= 15 ? 'd12' : lvl >= 10 ? 'd10' : lvl >= 5 ? 'd8' : 'd6';
        const bonus = Math.min(5, lvl >= 15 ? 6 : lvl >= 10 ? 5 : lvl >= 5 ? 4 : 3);
        const modifier = normalizeStoryModifier({
          source: 'dm_inspiration',
          name: `${tr.abilityBardicLabel} (${die})`,
          mode: 'normal',
          bonus,
          uses: 1,
          scope: 'any',
          reason: language === 'fr' ? 'Inspiration bardique auto-accordée' : 'Self-granted Bardic Inspiration',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'bardicInspiration');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎵 ${tr.abilityBardicLabel} (${die}) — +${bonus} sur un prochain jet]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player banked a Bardic Inspiration (${die}) on themselves (bonus action). Narrate the flourish. Do NOT advance the turn.`);
      } else if (abilityId === 'kiFlurry' && (res.ki?.current ?? 0) > 0) {
        let state = useGameStore.getState().combatState;
        let target = state.combatants.find((c: any) => c.id === targetId);
        if (!target || target.hp.current <= 0) {
          target = state.combatants.find((c: any) => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
        }
        if (!target) return;
        const unarmed = {
          name: language === 'fr' ? 'Frappe à mains nues' : 'Unarmed Strike',
          damage: monkMartialArtsDie(char.level || 1),
          damageType: 'bludgeoning',
          abilityMod: 'DEX' as const,
          attackBonus: 0,
          properties: ['finesse'],
        };
        const atkBonus = getPlayerAttackModifier({ ...char, weapon: unarmed as any });
        const dmgBonus = getPlayerDamageBonus({ ...char, weapon: unarmed as any });
        syncCharacterCritical(spendResource(char, 'ki'), 'hp');
        const hits: string[] = [];
        for (let strike = 1; strike <= 2; strike++) {
          const result = resolveAttackAction(state, {
            attacker: 'player',
            target: target.id,
            attackBonus: atkBonus,
            damageFormula: `${unarmed.damage}${dmgBonus >= 0 ? '+' : ''}${dmgBonus}`,
            damageType: 'bludgeoning',
            attackName: `${tr.abilityFlurryLabel} ${strike}/2`,
            consumeAction: false,
          } as any, char);
          if (result.success && (result as any).advanced) { state = result.state; break; }
          if (!result.success || !result.resolution) break;
          const resAtk = result.resolution;
          state = result.state;
          setPlayerRoll({ result: resAtk.attackRoll.total, reason: `${tr.abilityFlurryLabel} ${strike}/2 ${tr.vs} ${resAtk.target} (${resAtk.hit ? tr.hit : tr.miss})`, success: resAtk.hit });
          await waitDice();
          logCombatRoll({ type: 'attack', name: `${tr.abilityFlurryLabel} ${strike}/2`, total: resAtk.attackRoll.total, formula: `${resAtk.attackRoll.die} + ${resAtk.attackRoll.modifier} = ${resAtk.attackRoll.total} ${tr.vs} ${tr.ac} ${resAtk.attackRoll.prompt.dc}`, isDM: false, success: resAtk.hit });
          if (resAtk.hit && resAtk.damage > 0) {
            logCombatRoll({ type: 'damage', name: `${tr.abilityFlurryLabel} (${tr.damage})`, total: resAtk.damage, formula: resAtk.damageFormula, isDM: false });
          }
          hits.push(resAtk.hit ? `${resAtk.damage} dmg` : 'miss');
          if (resAtk.targetHP.current <= 0) break;
        }
        state = spendPlayerBonus(state);
        patchCombat(state);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on Flurry of Blows (bonus action): two unarmed strikes on ${target.name} → ${hits.join(', ')}. Narrate the flurry. Do NOT advance the turn.`);
        maybeEndCombat(useGameStore.getState().combatState);
      } else if (abilityId === 'kiPatientDefense' && (res.ki?.current ?? 0) > 0) {
        const dodgeEffect = {
          id: `dodge-${Date.now()}`,
          name: 'Dodge',
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: tr.dodgeDesc,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== 'Dodge'), dodgeEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🛡️ ${tr.abilityPatientLabel} (1 ki) — Esquive jusqu'à ton prochain tour]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on Patient Defense (bonus action): Dodge until their next turn. Narrate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'familiarHelp' && char.familiar && (res.familiarHelp?.current ?? 0) > 0) {
        const fam = char.familiar;
        const modifier = normalizeStoryModifier({
          source: 'tactic',
          name: language === 'fr' ? `Aide du familier (${fam.name})` : `Familiar's Help (${fam.name})`,
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Le familier harcèle la cible' : 'The familiar harries the target',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'familiarHelp');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${fam.name} (${fam.kind}) harcèle l'ennemi — avantage sur ta prochaine attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] The player's familiar ${fam.name} (${fam.kind}) used the HELP action (bonus action): advantage on their next attack. Narrate the little creature darting at the foe. Do NOT advance the turn.`);
      } else if (abilityId === 'lucky' && (res.luckyPoints?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: language === 'fr' ? 'Chanceux' : 'Lucky',
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'any',
          reason: language === 'fr' ? 'Point de chance dépensé' : 'Luck point spent',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'luckyPoints');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🍀 Chanceux — avantage sur ton prochain jet (${updated.resources?.luckyPoints?.current ?? 0} restant(s))]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent a Lucky point: advantage on their next roll. Narrate the twist of fate briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'cunningHide') {
        const modifier = normalizeStoryModifier({
          source: 'tactic',
          name: language === 'fr' ? 'Caché (Ruse)' : 'Hidden (Cunning)',
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Attaque depuis l\'ombre' : 'Striking from hiding',
        });
        const updated = { ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🫥 Ruse — caché : avantage sur ta prochaine attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Cunning Action to HIDE (bonus action): advantage on their next attack. Narrate them melting into cover. Do NOT advance the turn.`);
      } else if (abilityId === 'cunningDash') {
        const moveEffect = {
          id: `cunning-${Date.now()}`,
          name: language === 'fr' ? 'Désengagé' : 'Disengaged',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? 'Repli/Sprint — pas d\'attaques d\'opportunité ce round.' : 'Dash/Disengage — no opportunity attacks this round.',
          modifiers: [],
        };
        const updated = { ...char, activeEffects: [...(char.activeEffects || []).filter(e => e.name !== moveEffect.name), moveEffect] };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🏃 Ruse — Repli/Sprint : tu te repositionnes sans provoquer d'attaques]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Cunning Action to Dash/Disengage (bonus action): they reposition safely. Narrate the movement. Do NOT advance the turn.`);
      } else if (abilityId === 'channelPreserveLife' && (res.channelDivinity?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const halfMax = Math.floor(char.hp.max / 2);
        const heal = Math.min(5 * lvl, Math.max(0, halfMax - char.hp.current));
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${language === 'fr' ? 'Préserver la vie' : 'Preserve Life'} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: language === 'fr' ? 'Canalisation : Préserver la vie' : 'Channel Divinity: Preserve Life', total: heal, formula: `5 × ${lvl}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — Preserve Life (action): healed ${heal} HP (now ${nextHP}/${char.hp.max}). Narrate the holy light. Do NOT advance the turn.`);
      } else if (abilityId === 'channelGuidedStrike' && (res.channelDivinity?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: language === 'fr' ? 'Frappe guidée' : 'Guided Strike',
          mode: 'normal',
          bonus: 10,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Canalisation divine' : 'Channel Divinity',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ Frappe guidée — +10 sur ton prochain jet d'attaque]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — Guided Strike: +10 on their next attack roll. Narrate the divine guidance briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'sorceryCreateSlot' && (res.sorceryPoints?.current ?? 0) >= 2) {
        const slots = { ...(char.spellSlots || {}) };
        const key = '1';
        slots[key] = { current: (slots[key]?.current ?? 0) + 1, max: Math.max(slots[key]?.max ?? 0, 1) };
        const updated = spendResource({ ...char, spellSlots: slots }, 'sorceryPoints', 2);
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ✨ Source de magie — emplacement de niveau 1 créé (2 pts de sorcellerie)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player converted 2 sorcery points into a level-1 spell slot (bonus action). Narrate the raw magic gathering. Do NOT advance the turn.`);
      } else if (abilityId === 'superiorityStrike' && (res.superiorityDice?.current ?? 0) > 0) {
        const die = (char.level || 1) >= 10 ? '1d10' : '1d8';
        const maneuverEffect = {
          id: `maneuver-${Date.now()}`,
          name: language === 'fr' ? 'Manœuvre' : 'Maneuver',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? `Dé de supériorité : +${die} de dégâts sur ta prochaine attaque d'arme.` : `Superiority die: +${die} damage on your next weapon hit.`,
          modifiers: [],
          onWeaponHit: { dice: die },
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== maneuverEffect.name), maneuverEffect],
        }, 'superiorityDice');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎲 Manœuvre — +${die} de dégâts sur tes attaques d'arme ce round]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed a Battle Master maneuver: +${die} damage on their weapon hits this round. Narrate the tactical setup briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'wildShape' && (res.wildShape?.current ?? 0) > 0) {
        const lvl = char.level || 1;
        const tempHP = 2 * lvl;
        const shapeEffect = {
          id: `wildshape-${Date.now()}`,
          name: language === 'fr' ? 'Forme sauvage' : 'Wild Shape',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr' ? `Forme animale — ${tempHP} PV temporaires absorbent les coups.` : `Beast form — ${tempHP} temporary HP soak damage.`,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          tempHP: Math.max((char as any).tempHP || 0, tempHP),
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== shapeEffect.name), shapeEffect],
        } as any, 'wildShape');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐻 Forme sauvage — ${tempHP} PV temporaires (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Wild Shape (action): beast form, ${tempHP} temporary HP. Ask what beast they become and narrate the transformation. Do NOT advance the turn.`);
      }
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  const handlePlayerDodge = async () => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    // Apply dodge effect
    const updatedCombatants = combatState.combatants.map(c => {
      if (c.isPlayer) {
        const activeEffects = [
          ...(c.activeEffects || []).filter(e => e.name !== 'Dodge'),
          {
            id: `dodge-${Date.now()}`,
            name: 'Dodge',
            source: 'condition' as const,
            duration: 'rounds' as const,
            roundsRemaining: 1,
            description: tr.dodgeDesc,
            modifiers: []
          }
        ];
        return { ...c, activeEffects };
      }
      return c;
    });

    const updatedChar = {
      ...character,
      activeEffects: [
        ...(character.activeEffects || []).filter(e => e.name !== 'Dodge'),
        {
          id: `dodge-${Date.now()}`,
          name: 'Dodge',
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: tr.dodgeDesc,
          modifiers: []
        }
      ]
    };

    onCharacterUpdate(updatedChar);
    syncCharacterCritical(updatedChar, 'hp');

    // Apply the Dodge effect AND spend the whole main action.
    setCombatState(spendPlayerMainAction({ ...combatState, combatants: updatedCombatants }));

    logCombatRoll({
      type: 'check',
      name: 'Dodge Action',
      total: 0,
      formula: 'Dodge active',
      isDM: false
    });

    if (dm && isConnected) {
      dm.sendSystemMessage(`[SYSTEM] Player took the Dodge action. Until their next turn, all attacks against them have Disadvantage. Please narrate this.`);
    }

    // Dodge consumes the Action; the player ends the turn explicitly. Enemies
    // will then attack at disadvantage (the Dodge effect clears when the player's
    // turn comes back around).
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  const handlePlayerUsePotion = async (potionItem: any) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    const effectText = (potionItem.effect || potionItem.description || '').toLowerCase();
    const name = (potionItem.name || 'Potion');
    // A potion is the main Action by default; if its text says "bonus" it's a
    // bonus action (the player's "potion bonus" case).
    const isBonusPotion = /\bbonus\b/i.test(effectText) || /\bbonus\b/i.test(name);

    // Consume one charge (shared by both heal and buff branches).
    const consumeFromInventory = (inv: any[]) => inv
      .map(item => item.id === potionItem.id ? { ...item, quantity: item.quantity - 1 } : item)
      .filter(item => item.quantity > 0);

    // --- Detect a STAT-BUFF potion (Potion of Strength, Giant Strength, etc.) ---
    // A heal is only intended when the text mentions healing/HP or has explicit heal dice.
    const STATS = ['STR','DEX','CON','INT','WIS','CHA'] as const;
    const statBuffs = STATS
      .map(s => ({ stat: s, mod: parseItemStatModifier({ name, effect: effectText } as any, s) }))
      .filter(x => x.mod.bonus !== 0 || x.mod.setTo !== undefined);
    const looksLikeHeal = /heal|hp|hit\s*point|soin|vie|cure|gu[ée]ri/i.test(effectText) || /\d+d\d+/.test(effectText);

    if (statBuffs.length > 0 && !looksLikeHeal) {
      // BUFF potion → temporary activeEffect (1 hour) read by getEffectiveStat.
      const modifiers = statBuffs.map(b => b.mod.setTo !== undefined
        ? { stat: b.stat, bonus: 0, setTo: b.mod.setTo }
        : { stat: b.stat, bonus: b.mod.bonus });
      const label = statBuffs.map(b => b.mod.setTo !== undefined ? `${b.stat}=${b.mod.setTo}` : `${b.stat} ${b.mod.bonus>0?'+':''}${b.mod.bonus}`).join(', ');
      const updatedChar: any = {
        ...character,
        inventory: consumeFromInventory(character.inventory || []),
        activeEffects: [
          ...(character.activeEffects || []).filter((e: any) => e.name !== name),
          stampEffectExpiry({ id: `potion-${Date.now()}`, name, source: 'potion' as const, duration: '1_hour' as const, description: `${name}: ${label} (1h)`, modifiers }, worldHourOf(dayCount, timeOfDay)),
        ],
      };
      onCharacterUpdate(updatedChar);
      syncCharacterCritical(updatedChar, 'hp');
      logCombatRoll({ type: 'check', name: `Potion: ${name}`, total: 0, formula: label, isDM: false });
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${name} — ${label} pendant 1h]*` }]);
      if (dm && isConnected) {
        await dm.sendUserMessage(`[SYSTEM] Player drank ${name}, gaining ${label} for 1 hour. Narrate the surge of power.`);
      }
      if (combatState.isActive) setCombatState((s: any) => isBonusPotion ? spendPlayerBonus(s) : spendPlayerMainAction(s));
      return;
    }

    // --- HEAL potion (default) ---
    let formula = '2d4+2';
    const match = effectText.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/);
    if (match) formula = match[1].replace(/\s+/g, '');
    else if (effectText.includes('greater') || effectText.includes('supérieur')) formula = '4d4+4';
    else if (effectText.includes('superior') || effectText.includes('majeur')) formula = '8d4+8';
    else if (effectText.includes('supreme') || effectText.includes('suprême')) formula = '10d4+20';

    // Mode histoire : la potion rend toujours son MAXIMUM (2d4+2 → 10).
    const healAmount = character.storyMode ? maxRollOfFormula(formula) : rollDice(formula).total;
    const updatedInventory = consumeFromInventory(character.inventory || []);
    const updatedHP = Math.min(character.hp.max, character.hp.current + healAmount);
    const updatedChar = { ...character, hp: { ...character.hp, current: updatedHP }, inventory: updatedInventory };

    onCharacterUpdate(updatedChar);
    syncCharacterCritical(updatedChar, 'hp');

    // Only mutate combat state if a fight is active: apply HP + spend the action.
    if (combatState.isActive) {
      const updatedCombatants = combatState.combatants.map(c => c.isPlayer ? { ...c, hp: { ...c.hp, current: updatedHP } } : c);
      setCombatState(isBonusPotion
        ? spendPlayerBonus({ ...combatState, combatants: updatedCombatants })
        : spendPlayerMainAction({ ...combatState, combatants: updatedCombatants }));
    }

    setPlayerRoll({ result: healAmount, reason: `Consumes Potion: ${name} (+${healAmount} HP)` });
    await waitDice();
    logCombatRoll({ type: 'damage', name: `Used Potion: ${name}`, total: healAmount, formula, isDM: false });
    if (dm && isConnected) {
      await dm.sendUserMessage(`[SYSTEM] Player consumed potion ${name}. HP restored: ${healAmount}. Players HP is now ${updatedHP}/${character.hp.max}. Please narrate this action in character.`);
    }

    // Drinking a potion consumes the Action; the player ends the turn explicitly.
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  // Resolve a target spec ('all_enemies', a name/id, or a comma-separated list)
  // to a list of living combatant ids.
  const resolveProposedTargets = (state: any, spec?: string): string[] => {
    if (!spec) return [];
    const lower = String(spec).trim().toLowerCase();
    if (lower === 'all_enemies' || lower === 'all enemies' || lower === 'tous' || lower === 'tous les ennemis') {
      return state.combatants.filter((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0).map((c: any) => c.id);
    }
    const ids: string[] = [];
    for (const part of String(spec).split(',').map(s => s.trim()).filter(Boolean)) {
      const c = state.combatants.find((x: any) => x.id === part)
        || state.combatants.find((x: any) => x.name.toLowerCase() === part.toLowerCase() && x.hp.current > 0)
        || state.combatants.find((x: any) => x.name.toLowerCase() === part.toLowerCase());
      if (c && !ids.includes(c.id)) ids.push(c.id);
    }
    return ids;
  };

  // GENERIC resolver for a DM-authored improvised action card. Nothing here is
  // hard-coded to a specific stunt: the card's spec (cost, resolution, numbers)
  // comes entirely from the DM via propose_player_action. We only consume the
  // declared cost and run the matching engine primitive. Does NOT end the turn —
  // the player ends it explicitly.
  const handlePlayerProposedAction = async (p: ProposedPlayerAction) => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) { removeProposedAction(p.id); return; }
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
      let state = combatState;

      // 1. Consume the declared cost ('free' costs nothing).
      const e0 = getPlayerEconomy(state);
      if (p.cost === 'action') {
        if ((e0.attacksUsed ?? 0) >= (e0.attacksMax ?? 1)) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Action principale déjà utilisée ce tour — « ${p.label} » impossible.]*` }]);
          removeProposedAction(p.id);
          return;
        }
        state = spendPlayerMainAction(state);
        setCombatState(state);
      } else if (p.cost === 'bonus_action') {
        if ((e0.bonusUsed ?? 0) >= (e0.bonusMax ?? 1)) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Action bonus déjà utilisée ce tour — « ${p.label} » impossible.]*` }]);
          removeProposedAction(p.id);
          return;
        }
        state = spendPlayerBonus(state);
        setCombatState(state);
      } else if (p.cost === 'reaction') {
        const consumed = consumeCombatAction(state, 'player', 'reaction');
        if (!consumed.success) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Réaction déjà utilisée ce tour — « ${p.label} » impossible.]*` }]);
          removeProposedAction(p.id);
          return;
        }
        state = consumed.state;
        setCombatState(state);
      }
      // p.cost === 'free' → nothing consumed

      const summaries: string[] = [];

      if (p.resolution === 'attack') {
        const targetId = resolveProposedTargets(state, p.target)[0];
        if (!targetId) { summaries.push('aucune cible'); }
        else {
          const result = resolveAttackAction(state, {
            attacker: 'player', target: targetId,
            attackBonus: p.attackBonus, damageFormula: p.damageFormula, damageType: p.damageType,
            advantage: p.advantage, attackName: p.label, consumeAction: false,
          }, character);
          if (result.success && (result as any).advanced) {
            state = result.state;
            summaries.push(language === 'fr' ? 'se rapproche (loin → proche)' : 'closes in (far → near)');
          } else if (result.success && result.resolution) {
            const res = result.resolution;
            state = result.state;
            setPlayerRoll({ result: res.attackRoll.total, reason: `${p.label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
            await waitDice();
            logCombatRoll({ type: 'attack', name: p.label, total: res.attackRoll.total, formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`, isDM: false, success: res.hit });
            if (res.hit && res.damage > 0) {
              setPlayerRoll({ result: res.damage, reason: `${p.label} — ${tr.damage} : ${res.damage} ${res.damageType}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: false });
            }
            summaries.push(`${res.target} : ${res.hit ? `${res.damage} ${res.damageType}` : 'manqué'}`);
          }
        }
      } else if (p.resolution === 'save') {
        const dc = p.dc ?? 13;
        const ability = (p.saveAbility || 'DEX') as any;
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = state.combatants.find((c: any) => c.id === id);
          if (!target) continue;
          const creatureData: any = lookupMonster(target.name) || getCreature(target.name);
          let saveBonus = 0;
          if (creatureData && 'saves' in creatureData && creatureData.saves?.[ability] !== undefined) saveBonus = creatureData.saves[ability];
          else if (creatureData && 'stats' in creatureData && creatureData.stats?.[ability] !== undefined) saveBonus = Math.floor((creatureData.stats[ability] - 10) / 2);
          const outcome = resolveRollPrompt(normalizeRollPrompt({ reason: `${target.name} : sauvegarde ${ability} vs ${p.label}`, formula: `1d20${saveBonus >= 0 ? '+' : ''}${saveBonus}`, dc }));
          // The ENEMY rolls this save → show it on the DM (red) overlay. setPlayerRoll
          // renders blue and silently drops isDM (its state has no isDM field), so the
          // enemy's save looked like a player roll.
          setCurrentRoll({ result: outcome.total, reason: `${target.name} — ${tr.saveWord} ${ability} (${outcome.success ? tr.saveSuccess : tr.saveFail})`, isDM: true, success: outcome.success });
          await waitDice();
          logCombatRoll({ type: 'save', name: `${target.name} : ${tr.saveWord} ${ability} ${tr.vs} ${p.label}`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}`, isDM: true, success: outcome.success });
          if (!outcome.success) {
            if (p.damageFormula) {
              const dmg = rollDice(p.damageFormula).total;
              const applied = applyDamageToEncounter(state, id, dmg, p.damageType);
              if (applied.found) state = applied.state;
              setPlayerRoll({ result: dmg, reason: `${target.name} ${tr.takes} ${dmg} ${p.damageType || ''}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} → ${target.name}`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) { const cond = applyConditionToEncounter(state, id, p.condition); if (cond.found) state = cond.state; }
            summaries.push(`${target.name} : échec`);
          } else summaries.push(`${target.name} : réussite`);
        }
      } else if (p.resolution === 'check') {
        const ability = (p.checkAbility || 'STR') as any;
        const mod = Math.floor((getEffectiveStat(character, ability) - 10) / 2);
        const dc = p.dc ?? 13;
        const outcome = resolveRollPrompt(normalizeRollPrompt({ reason: `${p.label} (${tr.test} ${ability})`, formula: `1d20${mod >= 0 ? '+' : ''}${mod}`, dc, advantage: p.advantage }));
        setPlayerRoll({ result: outcome.total, reason: `${p.label} — ${tr.test} ${ability} (${outcome.success ? tr.checkSuccess : tr.checkFail})`, success: outcome.success });
        await waitDice();
        logCombatRoll({ type: 'check', name: `${p.label} (${ability})`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}`, isDM: false, success: outcome.success });
        if (outcome.success) {
          for (const id of resolveProposedTargets(state, p.target)) {
            if (p.damageFormula) {
              const dmg = rollDice(p.damageFormula).total;
              const applied = applyDamageToEncounter(state, id, dmg, p.damageType);
              if (applied.found) state = applied.state;
              logCombatRoll({ type: 'damage', name: `${p.label} (${tr.damage})`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) { const cond = applyConditionToEncounter(state, id, p.condition); if (cond.found) state = cond.state; }
          }
        }
        summaries.push(outcome.success ? 'réussi' : 'raté');
      } else if (p.resolution === 'auto') {
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = state.combatants.find((c: any) => c.id === id);
          if (p.damageFormula) {
            const dmg = rollDice(p.damageFormula).total;
            const applied = applyDamageToEncounter(state, id, dmg, p.damageType);
            if (applied.found) state = applied.state;
            setPlayerRoll({ result: dmg, reason: `${p.label} → ${target?.name} : ${dmg} ${p.damageType || ''}` });
            await waitDice();
            logCombatRoll({ type: 'damage', name: `${p.label} → ${target?.name || tr.target}`, total: dmg, formula: p.damageFormula, isDM: false });
          }
          if (p.condition) { const cond = applyConditionToEncounter(state, id, p.condition); if (cond.found) state = cond.state; }
          summaries.push(`${target?.name || 'cible'} : touché`);
        }
      } else if (p.resolution === 'effect') {
        if (p.selfModifier) {
          const modifier = normalizeStoryModifier({
            source: 'dm_inspiration', name: p.label,
            mode: p.selfModifier.mode || 'normal',
            bonus: p.selfModifier.bonus ?? 0,
            scope: p.selfModifier.scope || 'attack',
            uses: p.selfModifier.uses ?? 1,
          });
          syncCharacterCritical({ ...character, storyModifiers: [...(character.storyModifiers || []), modifier].slice(-8) }, 'hp');
          summaries.push(`${modifier.name} : ${modifier.mode}${modifier.bonus ? ` ${modifier.bonus > 0 ? '+' : ''}${modifier.bonus}` : ''} (${modifier.remainingUses}×)`);
        } else summaries.push('effet appliqué');
      }

      // Commit state + keep the player sheet HP in sync if it changed.
      setCombatState(state);
      const playerCombatant = state.combatants.find((c: any) => c.isPlayer);
      if (playerCombatant && character && playerCombatant.hp.current !== character.hp.current) {
        syncCharacterCritical({ ...character, hp: { ...character.hp, current: playerCombatant.hp.current } }, 'hp');
      }

      removeProposedAction(p.id);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎬 ${p.label}]*` }]);
      if (dm && isConnected) {
        await dm.sendUserMessage(`[SYSTEM] Player triggered improvised action "${p.label}" (${p.resolution}, cost ${p.cost}): ${summaries.join(' | ') || 'resolved'}. Narrate it vividly. Do NOT advance the turn — the player ends their own turn.`);
      }
      maybeEndCombat(state);
      // Intentionally NOT ending the turn here (explicit "Terminer mon tour").
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

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
      setCombatState((prev: any) => patchPlayerEconomy(prev, {
        attacksMax: getPlayerAttackCount(character),
        attacksUsed: 0,
        bonusMax: 1,
        bonusUsed: 0,
      }));

      // Décompte des durées d'effets du JOUEUR au début de son tour (Shield = 1
      // round, Rage/Bless = 10). Les effets expirés quittent la fiche ET sa
      // ligne de combat — avant ça, aucun buff « en rounds » n'expirait jamais.
      const ticked = tickRoundEffects(character.activeEffects || []);
      if (ticked.changed) {
        const tickedChar = { ...character, activeEffects: ticked.activeEffects };
        if (ticked.expired.length) {
          syncCharacterCritical(tickedChar, 'hp');
          setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: ticked.activeEffects } : c),
          }));
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effet(s) dissipé(s) : ${ticked.expired.join(', ')}]*` }]);
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] Effect(s) expired on the player: ${ticked.expired.join(', ')}. Weave it into the narration if relevant.`);
          }
        } else {
          syncCharacterUpdate(tickedChar);
        }
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
    setCombatState((prev: any) => {
      const player = (prev.combatants || []).find((c: any) => c.isPlayer);
      if (!player) return prev;
      const sameAC = player.ac === liveAC;
      const sameResist = JSON.stringify(player.resistances || []) === JSON.stringify(liveResistances);
      const samePortrait = !heroPortraitUrl || player.portrait === heroPortraitUrl;
      if (sameAC && sameResist && samePortrait) return prev;
      return {
        ...prev,
        combatants: prev.combatants.map((c: any) => c.isPlayer
          ? { ...c, ac: liveAC, resistances: liveResistances, portrait: heroPortraitUrl || c.portrait }
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
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat repris — c'est à toi de jouer.]*` }]);
  }, [combatState.isActive, combatState.combatants, combatState.currentTurn, character, setCombatState, setIsNPCTurn, setTranscript]);

  // ── Réaction « Bouclier » ────────────────────────────────────────────────
  // Le mage qui connaît Shield, a un emplacement et sa réaction, se voit
  // proposer d'annuler un coup ennemi quand +5 CA suffirait (fenêtre ~10 s,
  // silence = refus, le combat ne bloque jamais).
  const canOfferShieldReaction = (state: any): boolean => {
    const c = useGameStore.getState().character;
    if (!c || c.hp.current <= 0) return false;
    const knowsShield = [...(c.knownSpells || []), ...(c.preparedSpells || [])]
      .some(name => String(name).toLowerCase() === 'shield');
    if (!knowsShield) return false;
    const hasSlot = Object.values(c.spellSlots || {}).some((pool: any) => (pool?.current ?? 0) > 0);
    if (!hasSlot) return false;
    if ((c.activeEffects || []).some(e => e.name === 'Shield')) return false;
    const econ = state.actionEconomy?.['player'];
    return !(econ?.reactionUsed);
  };

  const askShieldReaction = (attackerName: string, total: number, currentAC: number): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (accepted: boolean) => {
        if (settled) return;
        settled = true;
        setReactionRequest(null);
        resolve(accepted);
      };
      const timeout = setTimeout(() => finish(false), 10000);
      setReactionRequest({
        title: tr.shieldReactionTitle,
        detail: tr.shieldReactionDetail(attackerName, total, currentAC),
        timeoutSeconds: 10,
        onAnswer: (accepted) => { clearTimeout(timeout); finish(accepted); },
      });
    });

  // ── Flux de jet en deux temps (relance BG3) ──────────────────────────────
  // showRollFeedback : dés + journal, TOUJOURS (l'échec puis la relance sont
  // tous deux visibles). finalizeRollOutcome : effets d'état (jet de mort,
  // concentration, sort en attente) + LIVRAISON au MJ + fermeture du prompt.
  const showRollFeedback = (outcome: any, suffix = '') => {
    const isAttack = outcome.prompt.type === 'ATTACK' || outcome.prompt.name.toLowerCase().includes('attack');
    const dc = outcome.prompt.dc || 10;
    setPlayerRoll({ result: outcome.total, reason: `${outcome.prompt.name}${suffix}`, success: outcome.success });
    logCombatRoll({
      type: isAttack ? 'attack' : outcome.prompt.type === 'SAVE' || outcome.prompt.type === 'DEATH_SAVE' ? 'save' : 'check',
      name: `${outcome.prompt.name}${suffix}`,
      total: outcome.total,
      formula: `${outcome.die} ${outcome.modifier >= 0 ? '+' : ''}${outcome.modifier} = ${outcome.total} vs ${isAttack ? 'AC' : 'DC'} ${dc}`,
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
    }

    if (outcome.prompt.type === 'SAVE' && outcome.prompt.concentrationDamage) {
      const concentration = resolveConcentrationAfterDamage(character, outcome.prompt.concentrationDamage, total);
      syncCharacterCritical(concentration.character, 'hp');
      if (concentration.broken) {
        setTranscript(prev => [...prev, {
          speaker: 'dm',
          text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(effect => effect.name).join(', ')}]*`
        }]);
      } else {
        setTranscript(prev => [...prev, { speaker: 'dm', text: '*[SYSTEM: Concentration maintained]*' }]);
      }
    }

    let spellSummary = '';
    if (outcome.prompt.pendingSpell) {
      const spellResolution = resolvePendingSpellRoll(combatState, outcome);
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

  const runNPCTurn = async (npc: any) => {
    // ALLIÉS À PROFIL CONNU (compagnons recrutés, bête du Beast Master,
    // monture) : le MOTEUR joue leur tour lui-même — vrai jet d'attaque, vrais
    // dégâts, le MJ ne fait que narrer le rapport. Fini le tour d'allié qui
    // « passe » parce que le MJ n'a pas appelé resolve_attack à temps.
    if (combatantSide(npc) === 'ally') {
      const allyProfile = (() => {
        const comp = (character.companions || []).find(c => c.id === npc.id);
        if (comp) return { ...comp.attack };
        if (npc.id === 'companion') {
          const beast = getBeastCompanion(character.beastKind || DEFAULT_BEAST_ID);
          if (beast) return { ...beast.attack };
        }
        if (npc.id === 'mount' && character.mount) {
          const mt = getMountType(character.mount.kind || character.mount.name);
          if (mt) return { ...mt.attack };
        }
        const creature = getCreature(npc.name);
        const atk: any = creature ? getCreatureAttacks(creature)[0] : null;
        if (atk) return { name: atk.name, attackBonus: Number(atk.attackBonus) || 4, damage: String(atk.damage || '1d6+2'), damageType: String(atk.damageType || 'bludgeoning') };
        return null;
      })();

      if (allyProfile) {
        const livingEnemies = combatState.combatants.filter((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!livingEnemies.length) { if (!maybeEndCombat(combatState)) setCombatState(advanceTurn(combatState)); return; }
        // Proie blessée : l'allié achève la cible la plus entamée.
        const target = [...livingEnemies].sort((a: any, b: any) => a.hp.current - b.hp.current)[0];
        const result = resolveAttackAction(combatState, {
          attacker: npc.id,
          target: target.id,
          attackBonus: allyProfile.attackBonus,
          damageFormula: allyProfile.damage,
          damageType: allyProfile.damageType,
          attackName: allyProfile.name,
          consumeAction: false,
        }, character);
        if (result.success && result.resolution) {
          const res = result.resolution;
          setCurrentRoll({ result: res.attackRoll.total, reason: `${npc.name} — ${allyProfile.name} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, isDM: false, success: res.hit });
          await waitDice();
          pushCombatRoll({ name: `${npc.name} : ${allyProfile.name}`, total: res.attackRoll.total, formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`, isDM: false, success: res.hit });
          if (res.hit && res.damage > 0) {
            setCurrentRoll({ result: res.damage, reason: `${npc.name} — ${res.damage} ${res.damageType}`, isDM: false });
            await waitDice();
            pushCombatRoll({ name: `${npc.name} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: false });
          }
          let after = result.state;
          setCombatState(after);
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] Ally ${npc.name} attacked ${res.target} with ${allyProfile.name}: ${res.hit ? `HIT for ${res.damage} ${res.damageType}${res.targetHP.current <= 0 ? ' — TARGET DOWN' : ''}` : 'MISS'}. Already resolved — narrate it in one short beat, do NOT re-roll.`);
          }
          if (maybeEndCombat(after)) return;
          setCombatState(advanceTurn(useGameStore.getState().combatState));
          return;
        }
        // Résolution impossible (cible disparue…) : on passe simplement.
        if (maybeEndCombat(useGameStore.getState().combatState)) return;
        setCombatState(advanceTurn(useGameStore.getState().combatState));
        return;
      }

      // Allié SANS profil connu (PNJ improvisé par le MJ) : fenêtre MJ classique.
      if (dm && isConnected) {
        const enemyList = combatState.combatants
          .filter(c => combatantSide(c) === 'enemy' && c.hp.current > 0)
          .map(c => `${c.name} (${c.hp.current}/${c.hp.max} HP)`).join(', ') || 'no enemies';
        // Compagnon recruté : fournis sa mini-fiche d'attaque pour que le MJ
        // résolve avec les BONS chiffres (son nom custom n'est pas au bestiaire).
        const companionSheet = (character.companions || []).find(comp => comp.id === npc.id);
        const attackHint = companionSheet
          ? ` Its attack: ${companionSheet.attack.name} — use resolve_attack(attacker="${npc.id}", target=<enemy id>, attackBonus: ${companionSheet.attack.attackBonus}, damageFormula: "${companionSheet.attack.damage}", damageType: "${companionSheet.attack.damageType}").`
          : '';
        dm.sendSystemMessage(`[SYSTEM] It is your ally ${npc.name}'s turn (enemies: ${enemyList}). You control this ally — IMMEDIATELY resolve its action with your tools (resolve_attack attacker="${npc.id}" / apply_condition) and narrate it.${attackHint} You have a short window (~8s); the engine will then advance to the next combatant automatically — do NOT call advance_turn.`);
      }
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Allied ${npc.name}'s turn — the DM directs them]*` }]);
      // Give the DM a real window to PLAY the ally before moving on — but
      // advance EARLY the moment its action is spent or the turn moved. The old
      // flat 8s sleep taxed every Beast Master round even when the DM resolved
      // the wolf in two seconds.
      const ALLY_WINDOW_MS = 8000;
      const allyWaitStart = Date.now();
      while (Date.now() - allyWaitStart < ALLY_WINDOW_MS) {
        await new Promise(r => setTimeout(r, 700));
        const live = useGameStore.getState().combatState;
        if (!live.isActive) return;
        if (live.currentTurn !== npc.id && live.currentTurn !== npc.name) return; // someone already moved the turn
        const allyEcon = live.actionEconomy?.[npc.id] || live.actionEconomy?.[npc.name];
        if (allyEcon?.actionUsed) break;            // the DM resolved the ally's action
        if (encounterOutcome(live) !== 'ongoing') break; // the ally just ended the fight
      }
      const freshAfterAlly = useGameStore.getState().combatState;
      if (!freshAfterAlly.isActive) return;
      const stillAllyTurn = freshAfterAlly.currentTurn === npc.id || freshAfterAlly.currentTurn === npc.name;
      if (!stillAllyTurn) return; // someone (DM recovery / manual) already moved the turn
      if (maybeEndCombat(freshAfterAlly)) return; // the ally may have dropped the last foe
      setCombatState(advanceTurn(freshAfterAlly));
      return;
    }

    // ENEMY turn: target a LIVING HERO (player or ally).
    // HYBRID targeting: if the MJ set a standing intent for this enemy
    // (set_enemy_target), honor it when the chosen hero is still alive; this is
    // the narrative "the mage focuses the healer" path. Otherwise fall back to
    // the deterministic "wounded prey" default (lowest-HP living hero), so
    // allies draw fire and the fight continues even if the player is down.
    const livingHeroes = combatState.combatants.filter(c => isHero(c) && c.hp.current > 0);
    if (!livingHeroes.length) {
      // Whole party (player + allies) is down. Do NOT keep cycling enemy turns
      // forever — surface defeat and stop the loop.
      setIsNPCTurn(false);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Défaite — toute la partie est à terre.]*` }]);
      if (dm && isConnected) {
        dm.sendSystemMessage('[SYSTEM] The whole party (player and allies) has fallen. Narrate the defeat / capture / aftermath.');
      }
      return;
    }
    const intentTargetId = combatState.enemyIntents?.[npc.id];
    const target = selectEnemyTarget(livingHeroes, intentTargetId)!;
    const usedIntent = !!intentTargetId && target.id === intentTargetId;
    if (usedIntent) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[${tr.enemyTargets(npc.name, target.name)}]*` }]);
    }

    // Resolve the SAME attack list the rules engine will use. The old code read
    // the raw `creature.attacks` (often empty or a generic "Basic Attack"),
    // while resolveAttackAction matches names against the PARSED list
    // (getCreatureAttacks) — the mismatch made every enemy strike fail with
    // "attack not found" and the loop continued silently: monsters dealt zero
    // damage all fight. Bestiary creatures now go through getCreatureAttacks;
    // codex monsters already store a resolved list.
    const bestiaryCreature = getCreature(npc.name);
    const codexMonster = bestiaryCreature ? null : lookupMonster(npc.name);
    const creature: any = bestiaryCreature || codexMonster;
    const resolvedAttacks: any[] = bestiaryCreature
        ? getCreatureAttacks(bestiaryCreature)
        : (codexMonster?.attacks || []);

    // --- MORALE CHECK MECHANIC ---
    const moraleResult = resolveMoraleCheck(combatState, npc.id);
    // Seed the turn from the post-morale state when a check rolled, so the
    // moraleChecked flag persists and the enemy doesn't re-roll morale every
    // turn (the final setCombatState below would otherwise overwrite it with
    // the stale pre-morale combatState).
    let moraleState = combatState;
    if (moraleResult.rolled) {
      moraleState = moraleResult.state;
      setCombatState(moraleResult.state);

      // Show the visual roll for the morale check
      setCurrentRoll({
        result: moraleResult.total!,
        reason: `${moraleResult.combatant!.name} morale check (Wisdom Save vs DC 11)`,
        isDM: true,
        success: moraleResult.success
      });

      // Wait 4 seconds for the animation
      await waitDice();

      if (moraleResult.fled) {
        setTranscript(prev => [...prev, {
          speaker: 'dm',
          text: `*[SYSTEM: ${moraleResult.combatant!.name} a raté son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) et s'enfuit du combat !]*`
        }]);
        // If that was the last enemy, the fight is over (victory).
        maybeEndCombat(moraleResult.state);
        return; // Stop NPC turn execution since they fled!
      } else {
        setTranscript(prev => [...prev, {
          speaker: 'dm',
          text: `*[SYSTEM: ${moraleResult.combatant!.name} a réussi son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) et continue le combat]*`
        }]);
      }
    }

    const availableAttacks = resolvedAttacks.filter((a: any) => !a.name.toLowerCase().includes('multiattack'));
    // Real multiattack count parsed from the creature's action text (was hard-capped at 2).
    const attackCount = creature ? getMultiattackCount(creature as any) : 1;

    const attacksToRun: any[] = [];
    if (availableAttacks.length > 0) {
      // Distribute the N attacks across the creature's named attacks (cycle through them).
      for (let i = 0; i < attackCount; i++) {
        attacksToRun.push(availableAttacks[i % availableAttacks.length]);
      }
    } else {
      const fallback = { name: 'Attack', attackBonus: 4, damage: '1d6+2', damageType: 'bludgeoning' };
      for (let i = 0; i < attackCount; i++) attacksToRun.push(fallback);
    }

    let currentState = moraleState;

    for (const attack of attacksToRun) {
      const attackBonus = (attack as any).attackBonus;
      const damageFormula = (attack as any).damage;
      const damageType = (attack as any).damageType || 'bludgeoning';

      // Dodge: if the target took the Dodge action, attackers roll against them
      // with disadvantage until their next turn (cleared in the turn-sync
      // effect). This makes the Dodge button mechanically real, not cosmetic.
      const targetDodging = (target.activeEffects || []).some((e: any) => e.name === 'Dodge');
      const result = resolveAttackAction(currentState, {
        attacker: npc.id,
        target: target.id,
        attackName: attack.name,
        attackBonus,
        damageFormula,
        damageType,
        advantage: targetDodging ? 'disadvantage' : undefined,
        consumeAction: false
      }, character);

      if (result.success && (result as any).advanced) {
        // Ennemi trop loin pour la mêlée : son attaque devient une CHARGE
        // (far → near). Il frappera au prochain tour.
        currentState = result.state;
        setCombatState(currentState);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${npc.name} se rapproche (loin → proche).]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] ${npc.name} was too far to strike and CLOSED THE DISTANCE instead (far → near). Narrate the advance in one short beat.`);
        }
        break; // la charge consomme le tour de cet ennemi
      }
      if (!result.success || !result.resolution) {
        // NEVER skip silently: a skipped strike looked exactly like "the monster
        // does no damage". Surface the reason in the audit console so any future
        // regression is visible immediately.
        auditBus.publish('combat', `⚠️ ${npc.name} attack "${attack.name}" failed to resolve: ${result.error || 'unknown'}`, result.error);
        console.warn(`⚔️ Enemy attack skipped (${npc.name} / ${attack.name}):`, result.error);
        continue;
      }

      const res = result.resolution;

      // RÉACTION BOUCLIER : le coup touche le joueur, mais +5 CA l'annulerait.
      // On propose la réaction AVANT d'adopter l'état frappé — si le joueur
      // accepte, on jette result.state (les dégâts n'ont jamais eu lieu).
      if (res.hit && target.isPlayer && !res.criticalHit && canOfferShieldReaction(currentState)) {
        const liveChar = useGameStore.getState().character!;
        const currentAC = getEffectiveAC(liveChar);
        if (res.attackRoll.total < currentAC + 5) {
          const accepted = await askShieldReaction(npc.name, res.attackRoll.total, currentAC);
          if (accepted) {
            const castResult = castSpell(liveChar, { spellName: 'Shield' });
            if (castResult.success) {
              syncCharacterCritical(castResult.character, 'hp');
              const consumed = consumeCombatAction(currentState, 'player', 'reaction');
              currentState = consumed.success ? consumed.state : currentState;
              setCombatState((prev: any) => {
                const reacted = consumeCombatAction(prev, 'player', 'reaction');
                return reacted.success ? reacted.state : prev;
              });
              setCurrentRoll({ result: res.attackRoll.total, reason: `${npc.name} ${tr.vs} ${tr.ac} ${currentAC + 5} — ${tr.miss}`, isDM: true, success: false });
              await waitDice();
              pushCombatRoll({ name: `${npc.name} : ${attack.name}`, total: res.attackRoll.total, formula: `${tr.vs} ${tr.ac} ${currentAC + 5} (Shield)`, isDM: true, success: false });
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${tr.shieldCastLine(npc.name)}]*` }]);
              auditBus.publish('combat', `Shield reaction: ${npc.name} attack ${res.attackRoll.total} negated (AC ${currentAC}→${currentAC + 5})`, res);
              if (dm && isConnected) {
                dm.sendSystemMessage(`[SYSTEM] The player cast SHIELD as a reaction: ${npc.name}'s attack (${res.attackRoll.total}) now MISSES against AC ${currentAC + 5}. +5 AC until their next turn. Narrate the arcane barrier.`);
              }
              continue; // le coup n'a jamais porté — on garde currentState intact
            }
          }
        }
      }

      // 1. Roll Attack dice animation
      setCurrentRoll({
        result: res.attackRoll.total,
        reason: `${npc.name} attacks with ${attack.name}: ${res.hit ? 'HIT!' : 'MISS'}`,
        isDM: true,
        success: res.hit
      });

      await waitDice();

      if (res.hit && res.damage > 0) {
        // 2. Roll Damage dice animation
        setCurrentRoll({
          result: res.damage,
          reason: `${npc.name}: ${attack.name} damage (${res.damageType})`,
          isDM: true
        });

        await waitDice();
      }

      // 3. Log to combat log (DiceTray.addLog mirrors into the store's combat
      // journal). Also push to the store DIRECTLY so the enemy roll appears in the
      // "Jets" HUD even if the DiceTray panel is unmounted (e.g. narrow layout),
      // and mirror to the audit console so we can always verify enemy turns fire.
      pushCombatRoll({ name: `${npc.name} : ${attack.name}`, total: res.attackRoll.total, formula: `${tr.vs} ${tr.ac} ${target.ac}`, isDM: true, success: res.hit });
      auditBus.publish('combat', `${npc.name} ${attack.name}: ${res.attackRoll.total} vs CA ${target.ac} → ${res.hit ? 'TOUCHE' : 'raté'}`, `attack roll ${res.attackRoll.total} (hit=${res.hit})`);
      diceTrayRef.current?.addLogNoMirror?.({
        type: 'attack',
        name: `${npc.name}: ${attack.name}`,
        total: res.attackRoll.total,
        formula: `${res.attackRoll.die} + ${res.attackRoll.prompt.formula.split('+')[1] || 0} = ${res.attackRoll.total} vs AC ${target.ac}`,
        isDM: true,
        success: res.hit
      });

      if (res.hit && res.damage > 0) {
        pushCombatRoll({ name: `${npc.name} : ${attack.name} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: true });
        auditBus.publish('combat', `${npc.name} dégâts: ${res.damage} ${res.damageType}`, res.damageFormula);
        diceTrayRef.current?.addLogNoMirror?.({
          type: 'damage',
          name: `${npc.name}: ${attack.name} damage`,
          total: res.damage,
          formula: res.damageFormula,
          isDM: true
        });
      }

      currentState = result.state;

      // Keep the player's character sheet HP in sync only when the player was
      // the one struck (an ally being hit must not overwrite the player's HP).
      if (target.isPlayer) {
        const updatedPlayer = currentState.combatants.find(c => c.isPlayer);
        if (updatedPlayer && character) {
          // syncCharacterCritical (not bare onCharacterUpdate) so the HP loss is
          // PERSISTED to the save and the tempHP/death-save path runs — otherwise
          // enemy damage vanished on reload and HP-0 didn't trigger death saves.
          const struck = {
            ...character,
            tempHP: updatedPlayer.tempHP ?? character.tempHP ?? 0,
            hp: { ...character.hp, current: updatedPlayer.hp.current },
          };
          syncCharacterCritical(struck, 'hp');
          // Concentration was only checked on the DM-tool damage paths — the
          // automated enemy turns (where MOST damage comes from) never asked
          // for the save, so Bless/Hold Person effectively could not break.
          if (res.hit && res.damage > 0) {
            const concentration = resolveConcentrationAfterDamage(struck, res.damage);
            if (concentration.broken) {
              syncCharacterCritical(concentration.character, 'hp');
              setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(e => e.name).join(', ')}]*`
              }]);
            } else if (struck.hp.current > 0 && concentration.prompt) {
              setActivePrompt(concentration.prompt);
              campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
              setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: Concentration save required, DC ${concentration.dc} after ${res.damage} damage]*`
              }]);
            }
          }
        }
      }
    }

    setTranscript(prev => [...prev, {
      speaker: 'dm',
      text: `*[SYSTEM: Turn completed for ${npc.name}]*`
    }]);

    // Reconcile the enemy-turn outcome onto the FRESHEST combat state, not the
    // snapshot we captured before the multi-second dice animations. During those
    // awaits the DM may have mutated combat via its tools (enemy HP, conditions,
    // new foes, intents); committing `currentState` wholesale would clobber them.
    // We re-apply only what THIS turn changed — the target's HP/tempHP/effects —
    // leaving every other combatant row as the live state has it.
    const fresh = useGameStore.getState().combatState;
    const after = currentState.combatants.find((c: any) => c.id === target.id);
    const reconciled = {
      ...fresh,
      combatants: fresh.combatants.map((c: any) =>
        (after && c.id === target.id)
          ? { ...c, hp: after.hp, tempHP: after.tempHP, activeEffects: after.activeEffects }
          : c
      ),
    };

    // End the fight if this turn dropped the whole party (defeat). Otherwise
    // advance to the next combatant. Single setCombatState (was double before).
    if (maybeEndCombat(reconciled)) return;
    const next = advanceTurn(reconciled);
    setCombatState(next);

    if (dm && isConnected) {
      const targetAfter = currentState.combatants.find(c => c.id === target.id);
      dm.sendSystemMessage(`[SYSTEM] ${npc.name} completed its turn: attacked ${target.name} with ${attacksToRun.map(a => a.name).join(' and ')}. ${target.name} HP is now ${targetAfter?.hp.current ?? 0}/${target.hp.max}. Please narrate the enemy's action and its choice of target.`);
    }
  };

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
    const dmText = fresh.filter(m => m.speaker === 'dm' && !/\[\s*SYSTEM/i.test(m.text)).map(m => m.text).join(' ').toLowerCase();
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
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effet(s) dissipé(s) avec le temps : ${swept.expired.join(', ')}]*` }]);
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
    setTranscript(prev => [...prev, { speaker: 'dm', text: '*[SYSTEM: Short rest completed]*' }]);
    // Le bouton doit PARLER au MJ — sinon la narration ignore le repos.
    if (dm && isConnected) {
      dm.sendUserMessage(`[SYSTEM] The player takes a SHORT REST (~1 hour). HP now ${updated.hp.current}/${updated.hp.max}; short-rest resources recovered. Narrate the breather in the current scene (where they sit, what they see/hear, a small character beat), then resume.`);
    }
  };

  const handleLongRest = () => {
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
    setTranscript(prev => [...prev, { speaker: 'dm', text: '*[SYSTEM: Long rest completed]*' }]);

    // Une nuit passe : tick des horloges du monde (le bouton manuel ne le
    // faisait pas — seul l'outil long_rest du MJ tiquait) + narration.
    const clocksAdvanced: string[] = [];
    const activeClocks = (useGameStore.getState().campaignRuntime.worldClocks || []).filter(clock => clock.status === 'active');
    if (activeClocks.length) {
      useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        worldClocks: (prev.worldClocks || []).map(clock => {
          if (clock.status !== 'active') return clock;
          const stage = Math.min(clock.maxStage, clock.stage + 1);
          clocksAdvanced.push(`"${clock.name}" ${stage}/${clock.maxStage}${stage >= clock.maxStage ? ' (FINAL STAGE)' : ''}`);
          return { ...clock, stage, updatedAt: Date.now() };
        }),
        updatedAt: Date.now(),
      }));
      void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
    }
    if (dm && isConnected) {
      const runtimeNow = useGameStore.getState().campaignRuntime;
      dm.sendUserMessage(`[SYSTEM] The player takes a LONG REST — a night passes (now Day ${runtimeNow.dayCount}, dawn). Full HP, spell slots and resources recovered.${clocksAdvanced.length ? ` World clocks advanced: ${clocksAdvanced.join('; ')} — weave visible signs of this into the morning.` : ''} Narrate the camp, the night (a dream, a sound, a watch moment), and the dawn, then resume.`);
    }
  };

  return (
    <div className="relative flex h-screen bg-black text-parchment overflow-hidden font-sans">

      {/* Reconnection Overlay */}
      {(isReconnecting || reconnectFailed) && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-amber-600 rounded-lg p-8 max-w-md text-center">
            {isReconnecting ? (
              <>
                <div className="text-4xl mb-4 animate-pulse">🔄</div>
                <h2 className="text-xl font-bold text-amber-400 mb-2">{t('dm.reconnecting', language as Language)}</h2>
                <p className="text-gray-400 mb-4">{t('dm.attempt', language as Language).replace('{attempt}', reconnectAttempt.toString())}</p>
                {queuedMessageCount > 0 && (
                  <p className="text-xs text-amber-300 mb-4">{queuedMessageCount} {tr.pendingReconnect}</p>
                )}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(reconnectAttempt / 3) * 100}%` }}
                  />
                </div>
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

      {activeReferenceUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-md border border-white/10 bg-zinc-950 text-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 bg-black/45 px-4 py-3">
              <h3 className="font-fantasy text-lg font-bold tracking-wide text-amber-300">{tr.reference}</h3>
              <button
                type="button"
                onClick={() => setActiveReferenceUrl(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 hover:bg-white/10 hover:text-white font-bold"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={activeReferenceUrl}
                className="h-full w-full bg-white border-none"
                title="Reference Viewer"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: Logs & Dice (Fixed width) */}
      <div className="w-80 flex flex-col border-r border-gray-800 bg-gray-950/90 z-20 hidden md:flex shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Chronicle Log */}
          <div className="h-3/5 border-b border-gray-800 flex flex-col">
            <div className="p-3 bg-gray-900 border-b border-gray-800 text-xs font-bold uppercase text-gold/70 flex items-center justify-between">
              <span className="flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Chronicle</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]" ref={chatScrollRef}>
              {transcript.length === 0 && <div className="text-gray-600 italic text-xs text-center mt-10">{tr.sagaBegins}</div>}
              {transcript.filter(msg => !/\[\s*SYSTEM(?::|\])/i.test(msg.text)).map((msg, i) => (
                <div key={i} className={`text-sm leading-relaxed ${msg.speaker === 'dm' ? 'text-parchment/90' : 'text-blue-200/90 text-right'}`}>
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



          <div className="h-2/5 flex flex-col bg-gray-900/30">
            <DiceTray ref={diceTrayRef} onRoll={handleManualRoll} />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT Area */}
      <div className="flex-1 relative bg-black flex flex-col items-center justify-center">
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
            {/* Audio Visualizer Orb - shows DM voice activity */}
            <div
              className="w-48 h-48 rounded-full bg-gradient-to-tr from-red-950 to-black border-4 border-red-900/50 shadow-[0_0_80px_rgba(220,20,60,0.3)] flex items-center justify-center transition-all duration-75 relative group"
              style={{ transform: `scale(${1 + audioLevel * 0.4})` }}
            >
              <div className="absolute inset-0 rounded-full animate-pulse opacity-20 bg-red-600 blur-2xl group-hover:opacity-40 transition-opacity"></div>
              <Volume2 className={`w-16 h-16 transition-colors duration-100 ${audioLevel > 0.05 ? 'text-red-400' : 'text-red-900/50'}`} />
            </div>

            {/* Hint text for using sidebar controls */}
            <p className="text-gray-500 text-xs italic">{t('game.useLeftPanelHint', language as Language)}</p>
          </div>
        )}


        {/* Bottom Command HUD */}
        <div className={`absolute inset-x-3 bottom-4 z-30 flex justify-center pointer-events-none ${combatState.isActive ? 'md:right-[430px]' : ''}`}>
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

              <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
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
                  onClick={() => setCombatState(prev => ({ ...prev, isActive: !prev.isActive }))}
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
      <div className={`absolute left-0 right-0 top-0 z-40 p-3 pointer-events-none md:left-80 ${combatState.isActive ? 'md:pr-[430px]' : ''}`}>
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
                <p className="truncate text-xs text-white/45">Lvl {character.level} {character.race} {character.class}</p>
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
          onItemUsed={({ name, healing, formula }) => {
            // Out-of-combat consumable: same visible feedback as in combat
            // (dice overlay + roll log + DM kept in the loop).
            if (healing > 0) {
              setPlayerRoll({ result: healing, reason: `${name} : +${healing} ${tr.hp}` });
              logCombatRoll({ type: 'damage', name: `${tr.potion} : ${name}`, total: healing, formula: formula || tr.healing, isDM: false });
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${name} consommé — +${healing} PV]*` }]);
              if (dm && isConnected) {
                dm.sendSystemMessage(`[SYSTEM] Player consumed ${name} outside combat and healed ${healing} HP. Briefly acknowledge it in the fiction if relevant.`);
              }
            } else {
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${name} utilisé]*` }]);
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
            onOpenExternalReference={setActiveReferenceUrl}
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
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Mode histoire ${value ? 'activé — potions et sorts de soin rendent leur maximum' : 'désactivé — les soins redeviennent des jets'}]*` }]);
          }}
        />
      )}

      {/* Tabletop Overlays */}
      <CombatTracker
        isActive={combatState.isActive}
        combatants={combatState.combatants}
        currentTurn={combatState.currentTurn}
        round={combatState.round}
        onAdvanceTurn={endPlayerTurnIfActive}
        onEndCombat={handleManualEndCombat}
        onOpenReference={handleOpenReference}
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
      <div className="fixed bottom-3 left-3 z-[60] flex gap-2">
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
            setActivePrompt(null);
          }}
          onRoll={() => {
            const outcome = resolveRollPrompt(activePrompt);
            showRollFeedback(outcome);
            // RELANCE BG3 : sur un ÉCHEC de test/sauvegarde (pas jet de mort,
            // pas sort en attente), si une Inspiration du MJ est en réserve,
            // on retient la livraison et on propose de la brûler pour relancer.
            const inspirationsLeft = (useGameStore.getState().character?.storyModifiers || [])
              .filter((m: any) => m.source === 'dm_inspiration' && (m.remainingUses ?? 0) > 0).length;
            const rerollable = !outcome.success
              && (outcome.prompt.type === 'CHECK' || outcome.prompt.type === 'SAVE')
              && !outcome.prompt.pendingSpell
              && inspirationsLeft > 0;
            if (rerollable) {
              setRerollOffer({ outcome });
              return;
            }
            finalizeRollOutcome(outcome);
          }}
        />
      )}

      {/* Relance BG3 — l'échec est affiché, l'Inspiration peut le rejouer */}
      {activePrompt && rerollOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex min-w-[340px] max-w-md flex-col items-center gap-5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-gray-900 to-black p-8 shadow-[0_0_60px_rgba(255,180,0,0.25)]">
            <div className="text-center">
              <div className="text-sm font-bold uppercase tracking-widest text-red-400">{language === 'fr' ? 'Échec' : 'Failure'}</div>
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
                if (!spendInspirationForReroll()) { finalizeRollOutcome(offer.outcome); return; }
                const second = resolveRollPrompt(activePrompt);
                showRollFeedback(second, language === 'fr' ? ' (relance)' : ' (reroll)');
                setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎲 Inspiration brûlée — relance : ${second.total} vs DC ${second.prompt.dc || 10} (${second.success ? 'réussite' : 'échec'})]*` }]);
                finalizeRollOutcome(second, true);
              }}
              className="w-full rounded-xl border border-amber-400 bg-gradient-to-r from-amber-700 to-yellow-600 py-3.5 text-lg font-bold uppercase tracking-wide text-white shadow-lg transition hover:scale-[1.02] hover:from-amber-600 hover:to-yellow-500"
            >
              🎲 {language === 'fr' ? `Relancer avec l'Inspiration` : 'Reroll with Inspiration'}
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

function NavButton({ icon, label, onClick, active, danger }: any) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`group flex h-14 w-[4.35rem] flex-col items-center justify-center gap-1 rounded-md border text-[10px] font-bold uppercase tracking-wide transition
           ${active ? 'border-amber-400/40 bg-amber-400/15 text-gold' : 'border-white/10 bg-white/[0.03] text-white/45 hover:bg-white/10 hover:text-white'}
           ${danger ? 'hover:border-red-400/40 hover:text-red-300' : ''}
        `}
    >
      <div className="flex h-6 items-center justify-center">
        {icon}
      </div>
      <span className="max-w-full truncate px-1 opacity-80 group-hover:opacity-100">{label}</span>
    </button>
  )
}

function HeaderActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-zinc-950/75 px-3 text-xs font-bold uppercase tracking-wide text-white/60 shadow-lg backdrop-blur-xl transition hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-100"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HudMeter({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: 'red' | 'gold' }) {
  const fill = tone === 'red' ? 'bg-red-600' : 'bg-amber-400';
  const text = tone === 'red' ? 'text-red-300' : 'text-amber-200';

  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/30 px-3 py-2">
      <div className={`mb-1 flex justify-between gap-2 text-[10px] font-bold uppercase tracking-wide ${text}`}>
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
        <div className={`h-full transition-all ${fill}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}
