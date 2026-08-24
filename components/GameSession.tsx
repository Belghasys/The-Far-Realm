import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useTranscript } from '../hooks/useTranscript';
import { useSaveSync } from '../hooks/useSaveSync';
import { useCombatState } from '../hooks/useCombatState';
import { useDMConnection } from '../hooks/useDMConnection';
import { useToolProcessor } from '../hooks/useToolProcessor';
import { useMusicDirector } from '../hooks/useMusicDirector';
import { useReconnectCountdown } from '../hooks/useReconnectCountdown';

/** Fenêtre annoncée au joueur pendant une reconnexion (backoff réel : 2+4+8 s
 *  sur trois tentatives, plus l'ouverture de chaque session). */
const RECONNECT_WINDOW_S = 20;
import { useGameStore } from '../store/gameStore';
import { LiveConnectionManager } from '../services/geminiRealtime';
import { auditBus } from '../services/auditBus';
import { auditNarration } from '../services/narrationAuditor';
import { runJournalKeeper } from '../services/journalKeeper';
import { sessionTrace } from '../services/sessionTrace';

import { Ability, AdventureManifest, CampaignRuntimeState, CharacterSheet, TimeOfDay, calculateLevelFromXP, getCombatAC, getEffectiveAC, getEffectiveStat, getPlayerAttackModifier, getPlayerDamageBonus, getXPProgress, parseItemStatModifier, getPlayerAttackCount, racialHPBonusPerLevel, isRangedWeapon } from '../types';
import { Mic, MicOff, Volume2, User, Backpack, Scroll, Swords, MessageSquare, LogOut, Book, Save, Music, Sparkles, Map as MapIcon, BookOpen, Settings as SettingsIcon, CalendarDays, Dices } from 'lucide-react';
import { DiceTray, DiceTrayRef } from './DiceTray';
import { RollingDice } from './RollingDice';
import { InventoryPanel, CharacterSheetPanel, toWeaponOverride } from './InGameMenus';
import SpellbookPanel from './SpellbookPanel';
import { ShopPanel } from './ShopPanel';
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
import { advanceClocksForNight, advanceTurn, applyDeathSaveOutcome, applyLongRest, applyShortRest, resolveConcentrationAfterDamage, resolvePendingSpellRoll, resolveRollPrompt, resolveAttackAction, castSpell, consumeCombatAction, resolveMoraleCheck, normalizeRollPrompt, applyStoryModifiersToPrompt, selectEnemyTarget, encounterOutcome, applyDamageToEncounter, applyConditionToEncounter, normalizeStoryModifier, tickRoundEffects, rageEffect, monkMartialArtsDie, playerResistances, syncCompanionsFromState, worldHourOf, sweepExpiredEffects, stampEffectExpiry, resolveSpellAgainstTargets, releaseNpcConcentrationEffect, formatDamageParts, levelUpCompanions, applyAutoDamageSpell, spendSpellSlot, allyAttackProfile, getActionCapability, applyDamageToCharacter, applyConditionToCharacter, classSavePassives, hasEvasion, featGrantsAdvantageOn, getProficientSaves } from '../services/rulesEngine';
import type { ProposedPlayerAction } from '../store/gameStore';
import { ProposedActionPrompt } from './ProposedActionPrompt';
import { DeathScreen } from './DeathScreen';
import { ReactionPrompt, ReactionRequest } from './ReactionPrompt';
import { SettingsPanel } from './SettingsPanel';
import type { ClassAbilityId } from './CombatActionsPanel';
import { AbilityHotbar } from './AbilityHotbar';
import { usePortrait, heroPortraitKey, heroPortraitPrompt } from '../services/portraitService';
import { useSettingsStore } from '../store/settingsStore';
import { lyriaMusicService } from '../services/lyriaMusic';
import { getCreature, getCreatureAttacks, getMultiattackCount } from '../data/bestiary';
import { estimateXPFromHP } from '../services/xpSystem';
import { getBeastCompanion, DEFAULT_BEAST_ID, getMountType } from '../data/companionOptions';
import { lookupMonster, lookupSpell, lookupCondition } from '../services/codexService';
import { rollDice, maxRollOfFormula, isSystemLine } from '../services/utils';
import { foldText } from '../services/skillSystem';
import { appendCampaignLog, combatChronicle, describeCombatFoes, formatCombatChronicleLine } from '../store/gameStore';
import { summarizeCurrentChapter } from '../services/llmService';
import { reconcileMissingDigests, maybeFreezeChapterVolume } from '../services/chapterChronicle';
import { playWeaponSwing, playDamageImpact, playSpellSfx, playPlayerHurt, playDiceRoll, playEndTurn } from '../services/combatSfx';
import { getCheckModifier } from '../services/skillSystem';
import { getCasterKit, type MonsterSpell, type CasterKit } from '../data/casterKits';
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
    reconnectTitle: 'Connection lost',
    reconnectReassure: 'The Dungeon Master is coming back. Nothing is lost — your game is saved and your last words are queued.',
    reconnectIn: 'Back in',
    reconnectSeconds: 's',
    reconnectLastTry: 'Last attempt in progress…',
    reconnectAttemptOf: 'Attempt {n} of 3',
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
    shieldBash: 'Shield bash',
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
    abilitySmiteLabel: 'Divine Smite',
    abilityRecklessLabel: 'Reckless Attack',
    abilityStunningLabel: 'Stunning Strike',
    abilityStepWindLabel: 'Step of the Wind',
    abilityTurnUndeadLabel: 'Turn Undead',
    abilityPactFocusLabel: 'Pact Focus',
    abilityNaturalRecoveryLabel: 'Natural Recovery',
    slotsRecovered: (n: number) => `${n} spell slot(s) recovered`,
    martialArts: 'Martial Arts',
    abilityDivineSenseLabel: 'Divine Sense',
    abilitySacredWeaponLabel: 'Sacred Weapon',
    abilityVowLabel: 'Vow of Enmity',
    abilityWrathLabel: "Nature's Wrath",
    abilityChallengeLabel: 'Cavalier Challenge',
    abilityInterventionLabel: 'Divine Intervention',
    abilityPrimevalLabel: 'Primeval Awareness',
    abilityQuickenedLabel: 'Quickened Spell',
    abilityHeightenedLabel: 'Heightened Spell',
    abilityWholenessLabel: 'Wholeness of Body',
    rerollIndomitable: 'Reroll with Indomitable',
    reactionUncanny: 'Uncanny Dodge — damage halved',
    reactionDeflect: (n: number) => `Deflect Missiles — ${n} damage deflected`,
    relentlessLine: 'RELENTLESS RAGE — refuses to fall (1 HP)!',
    shieldReactionTitle: 'Incoming hit!',
    shieldReactionDetail: (attacker: string, total: number, ac: number) => `${attacker} hits you (${total} vs AC ${ac}) — Shield would turn it into a miss (AC ${ac + 5}).`,
    shieldCastLine: (attacker: string) => `🛡️ SHIELD! ${attacker}'s attack shatters against the arcane barrier (+5 AC until your next turn).`,
    dayWord: 'Day',
    // UI5 — textes de progression / overlays qui restaient en dur.
    levelUpLine: (lvl: number, hp: number) => `🎊 LEVEL UP! Level ${lvl}! Max HP: ${hp}!`,
    xpChronicleDesc: (amount: number, total: number) => `Gained ${amount} XP. Total now: ${total}.`,
    reasonCombatVictory: 'Combat victory',
    castHealedLabel: (spell: string, n: number) => `Cast: ${spell} (Healed: ${n} HP)`,
    consumesPotionLabel: (name: string, n: number) => `Potion: ${name} (+${n} HP)`,
    moraleCheckLabel: (name: string) => `${name} — morale check (Wisdom Save vs DC 11)`,
    attacksWith: 'attacks with',
    attackWord: 'Attack',
    saveNoun: 'Save',
    successWord: 'Success',
    failureWord: 'Failure',
    deathSaveRequired: 'Death save required. Roll a d20.',
    chronicleHeader: 'Chronicle',
    lvlAbbrev: 'Lvl',
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
    reconnectTitle: 'Connexion perdue',
    reconnectReassure: "Le Maître du Jeu revient. Rien n'est perdu — la partie est sauvegardée et vos dernières paroles sont en attente.",
    reconnectIn: 'Retour dans',
    reconnectSeconds: 's',
    reconnectLastTry: 'Dernière tentative en cours…',
    reconnectAttemptOf: 'Tentative {n} sur 3',
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
    shieldBash: 'Coup de bouclier',
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
    abilitySmiteLabel: 'Châtiment divin',
    abilityRecklessLabel: 'Attaque téméraire',
    abilityStunningLabel: 'Frappe étourdissante',
    abilityStepWindLabel: 'Pas du vent',
    abilityTurnUndeadLabel: 'Renvoi des morts-vivants',
    abilityPactFocusLabel: 'Focalisation du pacte',
    abilityNaturalRecoveryLabel: 'Récupération naturelle',
    slotsRecovered: (n: number) => `${n} emplacement(s) de sort récupéré(s)`,
    martialArts: 'Arts martiaux',
    abilityDivineSenseLabel: 'Perception divine',
    abilitySacredWeaponLabel: 'Arme sacrée',
    abilityVowLabel: "Vœu d'inimitié",
    abilityWrathLabel: 'Courroux de la nature',
    abilityChallengeLabel: 'Défi du cavalier',
    abilityInterventionLabel: 'Intervention divine',
    abilityPrimevalLabel: 'Conscience primitive',
    abilityQuickenedLabel: 'Sort accéléré',
    abilityHeightenedLabel: 'Sort intensifié',
    abilityWholenessLabel: 'Plénitude du corps',
    rerollIndomitable: 'Relancer avec Inflexible',
    reactionUncanny: 'Esquive instinctive — dégâts divisés par deux',
    reactionDeflect: (n: number) => `Déviation de projectiles — ${n} dégâts déviés`,
    relentlessLine: 'RAGE IMPLACABLE — refuse de tomber (1 PV) !',
    shieldReactionTitle: 'Coup imminent !',
    shieldReactionDetail: (attacker: string, total: number, ac: number) => `${attacker} te touche (${total} vs CA ${ac}) — Bouclier transformerait le coup en échec (CA ${ac + 5}).`,
    shieldCastLine: (attacker: string) => `🛡️ BOUCLIER ! L'attaque de ${attacker} se brise sur la barrière arcanique (+5 CA jusqu'à ton prochain tour).`,
    dayWord: 'Jour',
    // UI5 — textes de progression / overlays qui restaient en dur.
    levelUpLine: (lvl: number, hp: number) => `🎊 NIVEAU SUPÉRIEUR ! Niveau ${lvl} ! PV max : ${hp} !`,
    xpChronicleDesc: (amount: number, total: number) => `${amount} XP gagnés. Total : ${total}.`,
    reasonCombatVictory: 'Victoire au combat',
    castHealedLabel: (spell: string, n: number) => `Sort : ${spell} (+${n} PV)`,
    consumesPotionLabel: (name: string, n: number) => `Potion : ${name} (+${n} PV)`,
    moraleCheckLabel: (name: string) => `${name} — test de moral (sauvegarde de Sagesse vs DD 11)`,
    attacksWith: 'attaque avec',
    attackWord: 'Attaque',
    saveNoun: 'Sauvegarde',
    successWord: 'Réussite',
    failureWord: 'Échec',
    deathSaveRequired: 'Jet de mort requis. Lance un d20.',
    chronicleHeader: 'Chronique',
    lvlAbbrev: 'Niv',
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
  const [activeReferenceUrl, setActiveReferenceUrl] = useState<string | null>(null);

  const handleOpenReference = (name: string, url: string) => {
    setCodexInitialTab('monster');
    setCodexInitialQuery(name);
    setActivePanel('codex');
    setActiveReferenceUrl(url);
  };

  // ui-m5 — Échap ferme l'overlay de référence AU-DESSUS du Codex, pas le
  // Codex en dessous : écouteur en phase capture + stopImmediatePropagation
  // pour passer avant le listener Échap de GameWindow.
  useEffect(() => {
    if (!activeReferenceUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      event.preventDefault();
      setActiveReferenceUrl(null);
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [activeReferenceUrl]);

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
  // le MJ vocal a oublié : NOUVELLES QUÊTES, quêtes ACCOMPLIES, étapes
  // franchies, moments de chronique, faits sur les PNJ. Applique via les MÊMES
  // outils que le MJ — aucune plomberie parallèle.
  // Curseur à -1 = pas encore amorcé (voir plus bas : le transcript restauré
  // n'arrive qu'après le premier rendu).
  const journalKeeperRef = React.useRef({ at: 0, transcriptLen: -1, running: false, startedAt: 0, pass: 0 });
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

  // ── TR1 (audit trame) — rappel PNJ automatique ────────────────────────────
  // Le contexte directeur ne porte que les ~8 derniers PNJ : quand un PNJ plus
  // ancien est nommé dans l'échange, souffler discrètement sa fiche au MJ
  // (faits connus, disposition) pour qu'il le joue avec sa mémoire.
  const npcRecallRef = React.useRef<Record<string, number>>({});
  useEffect(() => {
    if (!dm || !isConnected || transcript.length === 0) return;
    const last = transcript[transcript.length - 1];
    if (!last?.text || last.text.trimStart().startsWith('*[')) return;
    const hay = foldText(last.text);
    const npcs = (useGameStore.getState().journal.npcs || []) as any[];
    const recentIds = new Set(npcs.slice(-8).map(n => n.id || n.name));
    for (const npc of npcs) {
      const key = npc.id || npc.name;
      if (recentIds.has(key)) continue; // déjà dans le top-8 du contexte
      const folded = foldText(String(npc.name || ''));
      if (folded.length < 4 || !hay.includes(folded)) continue;
      if (Date.now() - (npcRecallRef.current[key] || 0) < 10 * 60_000) continue;
      npcRecallRef.current[key] = Date.now();
      const facts = (npc.knownFacts || []).slice(-3).join(' | ');
      dm.sendSystemMessage(`[NPC MEMORY] ${npc.name}${npc.location ? ` (last seen: ${npc.location})` : ''}${typeof npc.disposition === 'number' && npc.disposition !== 0 ? `, disposition ${npc.disposition > 0 ? '+' : ''}${npc.disposition}` : ''}${facts ? ` — known facts: ${facts}` : ''}. Play this NPC consistently with what they know and feel.`);
      break; // un seul rappel par message
    }
  }, [dm, isConnected, transcript]);

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
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Turn advanced to ${next.currentTurn}]*` }]);
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
      if (xp > 0) grantXP(xp, tr.reasonCombatVictory);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Victoire ! +${xp} XP]*` }]);
      if (dm && isConnected) dm.sendSystemMessage(`[SYSTEM] All enemies are defeated or fled. Combat is over (victory). Narrate the aftermath.`);
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
        }));
      } catch { /* jamais bloquant */ }
    }
    combatChronicle.take(); // filet : remis à zéro quel que soit le dénouement
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

  // CB5 — vérifications AVANT de dépenser : sort, esquive et potion exigent une
  // tranche d'action libre (spendPlayerMainAction clampait sans jamais échouer
  // — sorts, potions et esquive étaient illimités dans un même tour).
  const hasPlayerMainSlice = (state: any) => {
    const econ = getPlayerEconomy(state);
    const base = getPlayerAttackCount(character);
    return ((econ.attacksMax ?? base) - (econ.attacksUsed ?? 0)) >= base;
  };
  const hasPlayerBonusFree = (state: any) => {
    const econ = getPlayerEconomy(state);
    return ((econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0)) >= 1;
  };
  const rejectActionSpent = (needsBonus: boolean) => {
    const msg = language === 'fr'
      ? (needsBonus ? 'Action bonus déjà utilisée ce tour.' : "Plus d'action disponible ce tour.")
      : (needsBonus ? 'Bonus action already used this turn.' : 'No action left this turn.');
    showActionToast(`⏳ ${msg}`);
    setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⏳ ${msg}]*` }]);
    auditBus.publish('combat', `Action refusée (économie de tour) : ${msg}`);
  };

  const handlePlayerAttack = async (weaponItem: any, targetId: string, opts?: { powerAttack?: boolean }) => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    // CB3 — retarget to a living ENEMY if the selected one is down… or is an
    // ally (a stale selectedTargetId could point at the player's companion).
    if (!target || target.hp.current <= 0 || combatantSide(target) !== 'enemy') {
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
          // Fiche FRAÎCHE du store : le spread de la prop de rendu pouvait
          // restituer un slot/une ressource dépensés entre-temps (audit).
          const liveChar = useGameStore.getState().character || character;
          onCharacterUpdate({ ...liveChar, storyModifiers: mod.remaining } as any);
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
        // NF4 — l'attaque est devenue un RAPPROCHEMENT d'une bande (loin → à
        // distance, ou à distance → contact) et a consommé l'action.
        const adv = (result as any).advanced as { from: string; to: string };
        const bandFr = (b: string) => b === 'far' ? 'loin' : b === 'near' ? 'à distance' : 'au contact';
        let state = patchPlayerEconomy(result.state, { attacksUsed: attacksUsed + 1 });
        setCombatState(state);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${character.name} se rapproche de ${target.name} (${bandFr(adv.from)} → ${bandFr(adv.to)})${adv.to === 'melee' ? ' — au contact, frappe possible' : ''}.]*` }]);
        showActionToast(`🏃 ${language === 'fr' ? `Rapprochement : ${bandFr(adv.from)} → ${bandFr(adv.to)}` : `Advance: ${adv.from} → ${adv.to}`}`);
        if (dm && isConnected) {
          await dm.sendUserMessage(`[SYSTEM] The player CLOSED THE DISTANCE toward ${target.name} (${adv.from} → ${adv.to}) instead of striking — that consumed the action. Narrate the advance and ALWAYS state the new distance. Do NOT advance the turn.`);
        }
        return;
      }
      if (!result.success || !result.resolution) {
        // CB8 — plus d'échec muet : le refus du moteur (« Attacker is down »,
        // cible invalide…) est montré au joueur au lieu d'un console.error.
        console.error('Attack resolution failed:', result.error);
        showActionToast(`⚠️ ${language === 'fr' ? 'Attaque impossible' : 'Attack failed'} — ${result.error || 'unknown'}`);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${language === 'fr' ? 'Attaque impossible' : 'Attack failed'} — ${result.error || 'unknown'}]*` }]);
        auditBus.publish('combat', `Attaque joueur refusée par le moteur : ${result.error || '?'}`);
        return;
      }
      const res = result.resolution;
      let state = result.state;

      // SFX déterministe : geste de l'arme (couvre aussi le raté), puis impact
      // typé si le coup touche.
      playWeaponSwing(weaponItem);
      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        playDamageImpact(res.damageType, Boolean((res as any).criticalHit), weaponItem?.slot === 'ranged' || Boolean(weaponItem?.range));
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
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: formatDamageParts(res), isDM: false });
      }

      // Consume ONE attack pip (the pip turns green → gray in the HUD).
      state = patchPlayerEconomy(state, { attacksUsed: attacksUsed + 1 });
      setCombatState(state);

      // Riders à usage unique dépensés par ce coup (Châtiment divin) : on les
      // retire de la fiche, sinon un seul emplacement de sort aurait alimenté
      // toutes les attaques du round.
      if (res.consumedEffectIds?.length) {
        const live = useGameStore.getState().character!;
        const consumed = new Set(res.consumedEffectIds);
        syncCharacterUpdate({ ...live, activeEffects: (live.activeEffects || []).filter(e => !consumed.has(e.id)) } as any);
      }

      // Occultiste (Le Fiélon) — Bénédiction du Ténébreux : abattre un ennemi
      // rend CHA + niveau PV temporaires.
      if (res.hit && res.targetHP.current <= 0 && character.subclass === 'The Fiend') {
        const live = useGameStore.getState().character!;
        const gain = Math.max(1, Math.floor((getEffectiveStat(live, 'CHA') - 10) / 2)) + (live.level || 1);
        if (gain > (live.tempHP || 0)) {
          syncCharacterUpdate({ ...live, tempHP: gain } as any);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 Bénédiction du Ténébreux — ${gain} PV temporaires]*` }]);
        }
      }

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
  const handlePlayerBonusAttack = async (weaponItem: any, targetId: string, mode: 'offhand' | 'frenzy' | 'warpriest' | 'martial' | 'shield' = 'offhand') => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    let target = combatState.combatants.find(c => c.id === targetId);
    // CB3 — jamais d'attaque bonus sur un allié sélectionné par erreur.
    if (!target || target.hp.current <= 0 || combatantSide(target) !== 'enemy') {
      target = combatState.combatants.find(c => (c.side ? c.side === 'enemy' : !c.isPlayer) && c.hp.current > 0);
    }
    if (!target) return;
    // PL10 — l'attaque bonus de MÊLÉE exige le contact (elle ne sait pas
    // charger). Une arme À DISTANCE ou de JET en main secondaire (arbalète de
    // poing, dague de lancer…) passe : le moteur juge la portée et convertit en
    // rapprochement si besoin — le blocage aveugle refusait ces armes à tort.
    const bonusWeaponRanged = isRangedWeapon(weaponItem)
      || ((weaponItem?.properties || []) as any[]).some((p: any) => /thrown|jet|lanc/i.test(String(p)));
    if (!bonusWeaponRanged && ((target as any).range || 'melee') !== 'melee') {
      showActionToast(`⚔️ ${language === 'fr' ? 'Attaque bonus impossible : la cible n\'est pas au contact' : 'Bonus attack impossible: target not in melee reach'}`);
      return;
    }

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
      // cb-m4 — le calcul UI utilise la MÊME forme d'arme que le moteur
      // (toWeaponOverride) : l'item brut n'a ni abilityMod ni magicBonus — un
      // arc en main secondaire attaquait avec FOR et perdait son bonus magique.
      const weaponForMath = toWeaponOverride(weaponItem);
      const attackBonus = getPlayerAttackModifier(character, weaponForMath);
      const damageBonus = getPlayerDamageBonus(character, weaponForMath, isOffhand);
      const damageDice = weaponItem.damageDice || weaponItem.damage || '1d4';
      const damageFormula = `${damageDice}${damageBonus >= 0 ? '+' : ''}${damageBonus}`;
      const label = mode === 'frenzy'
        ? `${tr.frenzy} : ${weaponItem.name}`
        : mode === 'warpriest'
          ? `${tr.warPriest} : ${weaponItem.name}`
          : mode === 'martial'
            ? `${tr.martialArts} : ${weaponItem.name}`
            : mode === 'shield'
              ? `${tr.shieldBash}`
              : `${tr.offhandAttack} : ${weaponItem.name}`;

      const result = resolveAttackAction(combatState, {
        attacker: 'player',
        target: target.id,
        attackBonus,
        damageFormula,
        damageType: weaponItem.damageType || 'slashing',
        attackName: weaponItem.name,
        consumeAction: false,
      } as any, { ...character, weapon: weaponForMath });

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

      // SFX déterministe (attaque bonus / frénésie / prêtre de guerre).
      playWeaponSwing(weaponItem);
      setPlayerRoll({ result: res.attackRoll.total, reason: `${label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
      await waitDice();
      if (res.hit && res.damage > 0) {
        playDamageImpact(res.damageType, Boolean((res as any).criticalHit), weaponItem?.slot === 'ranged' || Boolean(weaponItem?.range));
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
        logCombatRoll({ type: 'damage', name: `${tr.damage} : ${weaponItem.name}`, total: res.damage, formula: formatDamageParts(res), isDM: false });
      }

      // Consume the amber bonus pip.
      state = spendPlayerBonus(state);
      setCombatState(state);

      // Idem que l'attaque principale : un rider « une fois par coup » (Châtiment
      // divin) est dépensé ici aussi.
      if (res.consumedEffectIds?.length) {
        const live = useGameStore.getState().character!;
        const consumed = new Set(res.consumedEffectIds);
        syncCharacterUpdate({ ...live, activeEffects: (live.activeEffects || []).filter(e => !consumed.has(e.id)) } as any);
      }

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
    if (guardPlayerAction()) return;
    // CB5 — un sort coûte l'action (ou l'action bonus si Sort accéléré armé).
    const quickenedArmed = (character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
    if (quickenedArmed ? !hasPlayerBonusFree(combatState) : !hasPlayerMainSlice(combatState)) {
      rejectActionSpent(quickenedArmed);
      return;
    }
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    // Sort de ZONE : cible 'all_enemies' → chaque ennemi vivant fera SA
    // sauvegarde (résolution moteur ci-dessous). Le cast lui-même est plombé
    // sur le premier ennemi pour construire DC/dés.
    // 'all_combatants' = TIR AMI (audit 2026-08-12) : les alliés (compagnon,
    // monture, familier) sont dans la zone et sauvegardent aussi.
    // Sélection PERSONNALISÉE « a,b,c » (cases cochées dans le panneau) : mêmes
    // règles que les sentinelles — chaque cible fait SA sauvegarde.
    const customAoeIds = targetId.includes(',')
      ? targetId.split(',').map(s => s.trim()).filter(Boolean)
      : null;
    const isAoECast = targetId === 'all_enemies' || targetId === 'all_combatants' || !!customAoeIds;
    const friendlyFire = targetId === 'all_combatants';
    const aoeTargets = customAoeIds
      ? combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0 && customAoeIds.includes(c.id))
      : isAoECast
        ? combatState.combatants.filter(c => !c.isPlayer && c.hp.current > 0
            && (friendlyFire || combatantSide(c) === 'enemy'))
        : [];
    const effectiveTargetId = isAoECast ? (aoeTargets[0]?.id ?? targetId) : targetId;
    const target = combatState.combatants.find(c => c.id === effectiveTargetId);
    const targetName = customAoeIds
      ? aoeTargets.map(t => t.name).join(', ')
      : isAoECast
        ? (friendlyFire
            ? (language === 'fr' ? 'toute la zone (alliés compris)' : 'the whole area (allies included)')
            : (language === 'fr' ? 'tous les ennemis' : 'all enemies'))
        : (target ? target.name : 'Target');

    // NF4 — sort de CONTACT : la cible doit être au corps à corps.
    const touchSpellDef = lookupSpell(spellName);
    if (touchSpellDef && /^touch$/i.test(String(touchSpellDef.range || ''))
        && target && !target.isPlayer
        && (((target as any).range || 'melee') !== 'melee')) {
      showActionToast(`✋ ${spellName} — ${language === 'fr' ? 'sort de contact : la cible doit être au corps à corps' : 'touch spell: the target must be in melee reach'}`);
      return;
    }

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
      // L'ID EXACT : sans lui, trois « Gobelin » rendaient la cible ambiguë et
      // le sort n'infligeait aucun dégât, sans le moindre message.
      targetId: isAoECast ? undefined : target?.id,
      targetAC: target?.ac,
      targetSaveBonus: targetSaveBonusMod,
      worldHour: worldHourOf(dayCount, timeOfDay),
      maximizeHealing: !!character.storyMode,
    });

    if (!spellResult.success) {
      // Échec SILENCIEUX auparavant (console.error seulement) : le joueur
      // cliquait « Lancer le sort » et il ne se passait rien. On dit pourquoi.
      console.error('Spell cast failed:', spellResult.error);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${spellName} — ${spellResult.error || (language === 'fr' ? 'lancement impossible' : 'cast failed')}]*` }]);
      return;
    }

    // SFX déterministe : son élémentaire du sort (feu, glace, foudre, soin…).
    playSpellSfx(lookupSpell(spellName) as any, spellName);

    // Update character sheet
    onCharacterUpdate(spellResult.character);
    syncCharacterCritical(spellResult.character, 'hp');

    if (spellResult.healing && spellResult.healing > 0) {
      // 1. Roll healing animation
      setPlayerRoll({
        result: spellResult.healing,
        reason: tr.castHealedLabel(spellName, spellResult.healing)
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

      // 3. Update target combatant HP.
      // CB1 — le moteur ne soigne plus le lanceur quand la cible est un allié
      // (healingTargetsSelf=false) : la SEULE application est ici, sur la ligne
      // de la cible. Updater fonctionnel : l'état capturé avant waitDice() est
      // périmé de plusieurs secondes (ui-m4).
      if (targetId === 'player' || target?.isPlayer) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) =>
            c.isPlayer ? { ...c, hp: { ...c.hp, current: spellResult.character.hp.current } } : c),
        }));
      } else if (target) {
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) =>
            c.id === target.id ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + (spellResult.healing || 0)) } } : c),
        }));
      }

      // 4. Send to DM
      if (dm && isConnected) {
        const msg = `[SYSTEM] Player cast ${spellName} on ${targetName}. Healing: ${spellResult.healing} HP. Please narrate this action in character.`;
        await dm.sendUserMessage(msg);
      }
    } else if (spellResult.autoDamage) {
      // ── Sort à TOUCHE AUTOMATIQUE (Projectile magique) : ni jet d'attaque ni
      //    sauvegarde. Il ne faisait strictement RIEN avant (aucune branche ne
      //    le gérait) — on applique les dégâts pour de vrai.
      const auto = spellResult.autoDamage;
      const victims = isAoECast ? aoeTargets : (target ? [target] : []);
      let state = combatState;
      const reports: string[] = [];
      for (const victim of victims) {
        const applied = applyAutoDamageSpell(state, { ...auto, targetId: victim.id, target: victim.name });
        if (!applied) continue;
        state = applied.state;
        setPlayerRoll({ result: applied.damage, reason: `${spellName} → ${victim.name} (${applied.damage} ${auto.damageType || tr.damage})` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: `${spellName} → ${victim.name}`, total: applied.damage, formula: auto.damageFormula, isDM: false });
        reports.push(`${victim.name}: ${applied.damage}${applied.mitigation !== 'normal' ? ` (${applied.mitigation})` : ''}`);
      }
      setCombatState(state);
      if (reports.length) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} — ${reports.join(', ')}]*` }]);
      }
      if (dm && isConnected) {
        await dm.sendUserMessage(reports.length
          ? `[SYSTEM] Player cast ${spellName} on ${targetName}. It ALWAYS hits (no attack roll, no save): ${reports.join(', ')} ${auto.damageType || ''} damage. Already applied — narrate the unerring bolts, do NOT re-roll.`
          : `[SYSTEM] Player cast ${spellName} on ${targetName} outside combat. Narrate the effect.`);
      }
      maybeEndCombat(state);
    } else if (isAoECast && spellResult.prompt?.type === 'SAVE' && spellResult.prompt.pendingSpell && aoeTargets.length) {
      // ── ZONE : sauvegarde individuelle par ennemi, dégâts lancés UNE fois ──
      const prompt = spellResult.prompt;
      // État frais + commit immédiat (avant les animations) — même famille de
      // correctifs anti-écrasement que les actions improvisées.
      const aoe = resolveSpellAgainstTargets(useGameStore.getState().combatState, prompt, aoeTargets.map(t => t.id));
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
      let prompt = spellResult.prompt;
      // AUDIT FIX : les inspirations/avantages du MJ ne s'appliquaient JAMAIS
      // aux attaques de sort du panneau (seules les attaques d'arme les
      // consommaient) — un « avantage sur ta prochaine attaque » était perdu
      // si le joueur lançait Rayon de feu.
      if (prompt.type === 'ATTACK') {
        // GS2 (contre-audit) — partir de la fiche FRAÎCHE du store, pas de la
        // prop de rendu : le cast vient d'être committé (slot dépensé,
        // métamagie consommée) et `{ ...character }` pré-cast REMBOURSAIT le
        // tout en réécrivant la fiche d'avant.
        const liveChar = useGameStore.getState().character || character;
        const mod = applyStoryModifiersToPrompt(prompt, (liveChar as any).storyModifiers || []);
        if (mod.applied.length) {
          onCharacterUpdate({ ...liveChar, storyModifiers: mod.remaining } as any);
          const labels = mod.applied.map((m: any) => m.name).join(', ');
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎲 ${labels} — ${tr.appliedToAttack}]*` }]);
          prompt = mod.prompt;
        }
      }
      const outcome = resolveRollPrompt(prompt);

      // 1. Show d20 animation
      setPlayerRoll({
        result: outcome.total,
        reason: `${spellName} — ${prompt.type === 'ATTACK' ? tr.attackWord : tr.saveNoun} ${tr.vs} ${targetName} (${outcome.success ? tr.successWord : tr.failureWord})`,
        success: outcome.success
      });
      await waitDice();

      // Resolve pending spell roll — sur l'état FRAIS du store, pas la valeur
      // de rendu capturée AVANT les 4 s d'animation : un appel d'outil MJ
      // concurrent était écrasé par ce commit (le sort « ne se matérialisait
      // pas » dans la fenêtre de combat — audit 2026-08-13).
      const spellRes = resolvePendingSpellRoll(useGameStore.getState().combatState, outcome);
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
        // GS13 (contre-audit) — fiche FRAÎCHE (deux animations nous séparent du
        // rendu) + sync CRITIQUE : sans lui, les PV perdus disparaissaient au
        // rechargement (le chemin jumeau finalizeRollOutcome le fait déjà).
        if (spellRes.target?.isPlayer) {
          const freshChar = useGameStore.getState().character || character;
          const updated = {
            ...freshChar,
            hp: spellRes.target.hp,
            activeEffects: spellRes.target.activeEffects || freshChar.activeEffects
          };
          onCharacterUpdate(updated);
          syncCharacterCritical(updated, 'hp');
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

    // Casting a spell spends the whole main action (all remaining attack pips)
    // — SAUF sous Sort accéléré (métamagie) : il ne coûte que l'action bonus.
    if (combatState.isActive) {
      setCombatState((s: any) => spellResult.quickened ? spendPlayerBonus(s) : spendPlayerMainAction(s));
      if (spellResult.quickened) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ ${tr.abilityQuickenedLabel} — le sort n'a coûté que l'action bonus]*` }]);
      }
    }
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
    if (guardPlayerAction()) return;
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
      } else if (abilityId === 'divineSmite') {
        // ── CHÂTIMENT DIVIN : brûle l'emplacement de sort le PLUS BAS et pose un
        //    rider onWeaponHit (+2d8 radiants, +1d8 par niveau au-dessus du 1er).
        //    Le moteur ajoute déjà tout effet portant onWeaponHit à chaque coup.
        const lowest = Object.entries(char.spellSlots || {})
          .map(([key, pool]: [string, any]) => ({ key, level: Number(String(key).replace(/\D/g, '')) || 1, current: pool?.current ?? 0 }))
          .filter(s => s.current > 0)
          .sort((a, b) => a.level - b.level)[0];
        if (!lowest) return;
        const spent = spendSpellSlot(char, lowest.level, lowest.level);
        if (spent.error) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${tr.abilitySmiteLabel} — ${spent.error}]*` }]);
          return;
        }
        const dice = Math.min(5, 1 + lowest.level); // 2d8 au niveau 1, +1d8 par niveau, max 5d8
        const smiteEffect = {
          id: `smite-${Date.now()}`,
          name: tr.abilitySmiteLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? `Ta prochaine attaque d'arme réussie inflige +${dice}d8 dégâts radiants.`
            : `Your next weapon hit deals +${dice}d8 radiant damage.`,
          modifiers: [],
          // consumeOnHit : l'emplacement paie UN coup, pas tout le round.
          onWeaponHit: { dice: `${dice}d8`, damageType: 'radiant' as const, consumeOnHit: true },
        };
        const updated = {
          ...spent.character,
          activeEffects: [...(spent.character.activeEffects || []).filter(e => e.name !== smiteEffect.name), smiteEffect],
        };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚜️ ${tr.abilitySmiteLabel} — emplacement niv.${lowest.level} brûlé : +${dice}d8 radiants sur ta prochaine attaque réussie]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player charged a DIVINE SMITE by burning a level-${lowest.level} spell slot: their next weapon hit deals an extra ${dice}d8 radiant damage. Narrate the blade drinking holy light. Do NOT advance the turn.`);
      } else if (abilityId === 'recklessAttack') {
        // ── ATTAQUE TÉMÉRAIRE : avantage sur TOUTES ses attaques ce tour (pas
        //    seulement la première, d'où l'effet plutôt qu'un story modifier),
        //    et avantage aux ennemis contre lui jusqu'à son prochain tour.
        const recklessEffect = {
          id: `reckless-${Date.now()}`,
          name: tr.abilityRecklessLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? 'Avantage sur tes attaques ; les attaques contre toi ont l\'avantage jusqu\'à ton prochain tour.'
            : 'Advantage on your attacks; attacks against you have advantage until your next turn.',
          modifiers: [],
          grantsAttackAdvantage: true,
          grantsAttackersAdvantage: true,
        };
        const updated = {
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== recklessEffect.name), recklessEffect],
        };
        syncCharacterCritical(updated as any, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🪓 ${tr.abilityRecklessLabel} — avantage sur tes attaques ce tour, mais tu t'exposes]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used RECKLESS ATTACK: advantage on their melee attacks this turn, and attacks against them have advantage until their next turn. Narrate the abandon. Do NOT advance the turn.`);
      } else if (abilityId === 'stunningStrike' && (res.ki?.current ?? 0) > 0) {
        // ── FRAPPE ÉTOURDISSANTE : la prochaine attaque réussie impose une
        //    sauvegarde de CON ; le MJ applique l'état via apply_condition.
        const dc = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.floor((getEffectiveStat(char, 'WIS') - 10) / 2);
        const stunEffect = {
          id: `stunning-${Date.now()}`,
          name: tr.abilityStunningLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? `Ta prochaine attaque réussie impose une sauvegarde de CON DD ${dc} ou la cible est étourdie.`
            : `Your next hit forces a CON save DC ${dc} or the target is stunned.`,
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== stunEffect.name), stunEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => ({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 💥 ${tr.abilityStunningLabel} (1 ki) — prochaine attaque réussie : sauvegarde de CON DD ${dc} ou étourdi]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on STUNNING STRIKE: their NEXT successful weapon hit forces the target to make a CON save vs DC ${dc}. When you see the next player hit report, call request_roll for that CON save and, on a failure, apply_condition("stunned", <target>). Narrate the pressure-point strike. Do NOT advance the turn.`);
      } else if (abilityId === 'stepOfTheWind' && (res.ki?.current ?? 0) > 0) {
        const moveEffect = {
          id: `stepwind-${Date.now()}`,
          name: tr.abilityStepWindLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr'
            ? 'Sprint + Désengagement : tu te déplaces sans provoquer d\'attaques, distance de saut doublée.'
            : 'Dash + Disengage: move without provoking, jump distance doubled.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== moveEffect.name), moveEffect],
        }, 'ki');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🍃 ${tr.abilityStepWindLabel} (1 ki) — Sprint + Désengagement]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player spent 1 ki on STEP OF THE WIND (bonus action): Dash and Disengage, jump distance doubled. Narrate the impossible agility. Do NOT advance the turn.`);
      } else if (abilityId === 'turnUndead' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── RENVOI DES MORTS-VIVANTS : sauvegarde de SAG par mort-vivant présent ;
        //    ceux qui échouent sont « effrayés » (le moteur applique l'état).
        const dc = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.floor((getEffectiveStat(char, 'WIS') - 10) / 2);
        let state = useGameStore.getState().combatState;
        const undead = state.combatants.filter((c: any) =>
          combatantSide(c) === 'enemy' && c.hp.current > 0
          && /undead|zombie|skelet|squelette|ghoul|goule|wight|spectre|specter|wraith|vampire|liche|lich|mort-vivant|revenant|ombre|shadow/i.test(c.name)
        );
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        const turned: string[] = [];
        const destroyed: string[] = [];
        // Destruction des morts-vivants (Clerc 5+) : un mort-vivant de FP ≤ seuil
        // qui RATE sa sauvegarde est réduit en poussière, pas seulement effrayé.
        const lvl = char.level || 1;
        const destroyCR = lvl >= 17 ? 4 : lvl >= 14 ? 3 : lvl >= 11 ? 2 : lvl >= 8 ? 1 : lvl >= 5 ? 0.5 : -1;
        for (const target of undead) {
          const save = resolveRollPrompt(normalizeRollPrompt({
            type: 'SAVE',
            name: `${target.name} — WIS save vs ${tr.abilityTurnUndeadLabel}`,
            formula: '1d20+0',
            dc,
          } as any));
          logCombatRoll({ type: 'save', name: `${target.name} — ${tr.abilityTurnUndeadLabel}`, total: save.total, formula: `vs DD ${dc}`, isDM: true, success: save.success });
          if (!save.success) {
            const creatureInfo = getCreature(target.name);
            if (creatureInfo && destroyCR >= 0 && creatureInfo.cr <= destroyCR) {
              const smited = applyDamageToEncounter(state, target.id, target.hp.current, 'radiant');
              if (smited.found) { state = smited.state; destroyed.push(target.name); continue; }
            }
            const applied = applyConditionToEncounter(state, target.id, 'frightened');
            if (applied.found) { state = applied.state; turned.push(target.name); }
          }
        }
        patchCombat(spendPlayerMainAction(state));
        const outcomeText = [
          destroyed.length ? `${destroyed.join(', ')} DÉTRUIT(S)` : '',
          turned.length ? `${turned.join(', ')} fuient` : '',
        ].filter(Boolean).join(' ; ') || (undead.length ? 'aucun mort-vivant renvoyé' : 'aucun mort-vivant présent');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ✝️ ${tr.abilityTurnUndeadLabel} (DD ${dc}) — ${outcomeText}]*` }]);
        maybeEndCombat(useGameStore.getState().combatState);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — TURN UNDEAD (action, DC ${dc}). ${destroyed.length ? `DESTROYED outright (CR ≤ ${destroyCR}): ${destroyed.join(', ')}. ` : ''}${turned.length ? `Frightened and fleeing: ${turned.join(', ')}. ` : ''}${!destroyed.length && !turned.length ? (undead.length ? 'Every undead resisted.' : 'No undead present — the holy symbol blazes for nothing.') : ''} Already resolved — narrate it, do NOT re-roll. Do NOT advance the turn.`);
      } else if (abilityId === 'eldritchMind' && (res.pactFocus?.current ?? 0) > 0) {
        const modifier = normalizeStoryModifier({
          source: 'blessing',
          name: tr.abilityPactFocusLabel,
          mode: 'advantage',
          bonus: 0,
          uses: 1,
          scope: 'attack',
          reason: language === 'fr' ? 'Le patron guide la main de son élu' : 'The patron steadies its chosen',
        });
        const updated = spendResource({ ...char, storyModifiers: [...(char.storyModifiers || []), modifier].slice(-8) }, 'pactFocus');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 👁️ ${tr.abilityPactFocusLabel} — avantage sur ta prochaine attaque de sort]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player called on their patron (Pact Focus, bonus action): advantage on their next spell attack. Narrate the patron's cold attention. Do NOT advance the turn.`);
      } else if (abilityId === 'naturalRecovery' && (res.naturalRecovery?.current ?? 0) > 0) {
        // ── RÉCUPÉRATION NATURELLE : rend des emplacements dont la somme des
        //    niveaux vaut ⌈niveau/2⌉ (du plus haut au plus bas, jamais niv. 6+).
        let budget = Math.ceil((char.level || 1) / 2);
        const slots = { ...(char.spellSlots || {}) };
        let recovered = 0;
        for (let lvl = 5; lvl >= 1; lvl--) {
          const key = String(lvl);
          while (slots[key] && slots[key].current < slots[key].max && budget >= lvl) {
            slots[key] = { ...slots[key], current: slots[key].current + 1 };
            budget -= lvl;
            recovered += 1;
          }
        }
        if (!recovered) return;
        const updated = spendResource({ ...char, spellSlots: slots }, 'naturalRecovery');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌿 ${tr.abilityNaturalRecoveryLabel} — ${tr.slotsRecovered(recovered)}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Natural Recovery and regained ${recovered} spell slot(s) by drawing on the land. Narrate the communion with nature. Do NOT advance the turn.`);
      } else if (abilityId === 'divineSense' && (res.divineSense?.current ?? 0) > 0) {
        // ── PERCEPTION DIVINE (Paladin) : le MJ doit répondre HONNÊTEMENT —
        //    capacité de campagne autant que de combat.
        const updated = spendResource(char, 'divineSense');
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 👁️ ${tr.abilityDivineSenseLabel} — célestes, fiélons et morts-vivants à 18 m révélés]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used DIVINE SENSE (action). You MUST answer honestly: reveal the presence, direction and type of every celestial, fiend or undead within 60 ft (even disguised, hidden or possessing someone), or state clearly that there are none. Consecrated/desecrated places also register. Do NOT advance the turn.`);
      } else if (abilityId === 'sacredWeapon' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── ARME SACRÉE (Serment de Dévotion) : +CHA aux jets d'attaque, 10 rounds.
        const chaBonus = Math.max(1, Math.floor((getEffectiveStat(char, 'CHA') - 10) / 2));
        const weaponEffect = {
          id: `sacred-${Date.now()}`,
          name: tr.abilitySacredWeaponLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr'
            ? `Ton arme rayonne d'une lumière sacrée : +${chaBonus} aux jets d'attaque.`
            : `Your weapon blazes with holy light: +${chaBonus} to attack rolls.`,
          modifiers: [{ stat: 'attackBonus' as const, bonus: chaBonus }],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== weaponEffect.name), weaponEffect],
        }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚜️ ${tr.abilitySacredWeaponLabel} — +${chaBonus} aux jets d'attaque (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — SACRED WEAPON: +${chaBonus} to weapon attack rolls for 1 minute; the weapon sheds bright holy light. Narrate the radiance. Do NOT advance the turn.`);
      } else if (abilityId === 'vowOfEnmity' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── VŒU D'INIMITIÉ (Serment de Vengeance) : avantage sur les attaques.
        const state0 = useGameStore.getState().combatState;
        const foe = state0.combatants.find((c: any) => c.id === targetId) || state0.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        const vowEffect = {
          id: `vow-${Date.now()}`,
          name: tr.abilityVowLabel,
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 10,
          description: language === 'fr'
            ? `Serment juré contre ${foe?.name || 'ton ennemi'} : avantage sur tes attaques (10 rounds).`
            : `Sworn against ${foe?.name || 'your foe'}: advantage on your attacks (10 rounds).`,
          modifiers: [],
          grantsAttackAdvantage: true,
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== vowEffect.name), vowEffect],
        }, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, activeEffects: updated.activeEffects } : c),
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚔️ ${tr.abilityVowLabel} contre ${foe?.name || '?'} — avantage sur tes attaques (10 rounds)]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player swore a VOW OF ENMITY against ${foe?.name || 'a foe'} (bonus action, Channel Divinity): advantage on their attack rolls against that creature for 1 minute. Narrate the oath's cold fire. Do NOT advance the turn.`);
      } else if (abilityId === 'naturesWrath' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── COURROUX DE LA NATURE (Serment des Anciens) : FOR save ou entravé.
        let state = useGameStore.getState().combatState;
        const foe = state.combatants.find((c: any) => c.id === targetId) || state.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!foe) return;
        const dcWrath = 8 + Math.floor(((char.level || 1) - 1) / 4) + 2 + Math.max(0, Math.floor((getEffectiveStat(char, 'CHA') - 10) / 2));
        const creatureData: any = getCreature(foe.name) || lookupMonster(foe.name);
        const strBonus = creatureData?.stats?.STR !== undefined ? Math.floor((creatureData.stats.STR - 10) / 2) : 0;
        const save = resolveRollPrompt(normalizeRollPrompt({
          type: 'SAVE',
          name: `${foe.name} — STR save vs ${tr.abilityWrathLabel}`,
          formula: `1d20${strBonus >= 0 ? '+' : ''}${strBonus}`,
          dc: dcWrath,
        } as any));
        logCombatRoll({ type: 'save', name: `${foe.name} — ${tr.abilityWrathLabel}`, total: save.total, formula: `vs DD ${dcWrath}`, isDM: true, success: save.success });
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        if (!save.success) {
          const applied = applyConditionToEncounter(state, foe.id, 'restrained');
          if (applied.found) state = applied.state;
        }
        patchCombat(spendPlayerMainAction(state));
        setPlayerRoll({ result: save.total, reason: `${tr.abilityWrathLabel} ${tr.vs} ${foe.name} (${save.success ? tr.miss : tr.hit})`, success: !save.success });
        await waitDice();
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌿 ${tr.abilityWrathLabel} — ${foe.name} ${save.success ? 'se libère des lianes' : 'est ENTRAVÉ par les lianes spectrales'}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used Channel Divinity — NATURE'S WRATH on ${foe.name} (STR save ${save.total} vs DC ${dcWrath}): ${save.success ? 'the foe broke free' : 'the foe is RESTRAINED by spectral vines (attacks against it have advantage, its attacks have disadvantage)'}. Already resolved — narrate it, do NOT re-roll. Do NOT advance the turn.`);
      } else if (abilityId === 'cavalierChallenge' && (res.channelDivinity?.current ?? 0) > 0) {
        // ── DÉFI DU CAVALIER : l'ennemi défié concentre ses assauts sur TOI
        //    (intention fixée dans le moteur — protège réellement les alliés).
        const state0 = useGameStore.getState().combatState;
        const foe = state0.combatants.find((c: any) => c.id === targetId) || state0.combatants.find((c: any) => combatantSide(c) === 'enemy' && c.hp.current > 0);
        if (!foe) return;
        const playerId = state0.combatants.find((c: any) => c.isPlayer)?.id || 'player';
        const updated = spendResource(char, 'channelDivinity');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerBonus({
          ...s,
          enemyIntents: { ...(s.enemyIntents || {}), [foe.id]: playerId },
        }));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🛡️ ${tr.abilityChallengeLabel} — ${foe.name} ne voit plus que toi]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player (Cavalier paladin) CHALLENGED ${foe.name} (bonus action, Channel Divinity): that enemy now focuses its attacks on the paladin — the engine has locked its target. Narrate the ringing challenge. Do NOT advance the turn.`);
      } else if (abilityId === 'divineIntervention' && (res.divineIntervention?.current ?? 0) > 0) {
        // ── INTERVENTION DIVINE (Clerc 10+) : d100 ≤ niveau → miracle.
        const roll = rollDice('1d100').total;
        const lvl = char.level || 1;
        const success = roll <= lvl;
        let updated = spendResource(char, 'divineIntervention');
        if (success) {
          const heal = Math.min(char.hp.max, char.hp.current + 5 * lvl);
          updated = { ...updated, hp: { ...updated.hp, current: heal } };
          patchCombat((s: any) => spendPlayerMainAction({
            ...s,
            combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: heal } } : c),
          }));
        } else {
          patchCombat((s: any) => spendPlayerMainAction(s));
        }
        syncCharacterCritical(updated, 'hp');
        setPlayerRoll({ result: roll, reason: `${tr.abilityInterventionLabel} — d100 ${tr.vs} ${lvl} (${success ? tr.hit : tr.miss})`, success });
        await waitDice();
        logCombatRoll({ type: 'check', name: tr.abilityInterventionLabel, total: roll, formula: `d100 ≤ ${lvl}`, isDM: false, success });
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${success ? '🌟 INTERVENTION DIVINE — ta divinité RÉPOND !' : `⚪ ${tr.abilityInterventionLabel} — le ciel reste silencieux (${roll} > ${lvl})`}]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(success
          ? `[SYSTEM] DIVINE INTERVENTION SUCCEEDED (d100: ${roll} ≤ level ${lvl}). The player's deity personally intervenes — manifest a MIRACLE fitting the situation (the engine already restored ${5 * lvl} HP): turn the tide, banish a threat, reveal a truth. Make it AWE-INSPIRING and narrate it now.`
          : `[SYSTEM] Player attempted Divine Intervention and FAILED (d100: ${roll} > level ${lvl}). The heavens stay silent — narrate the unanswered prayer in one somber beat. Do NOT advance the turn.`);
      } else if (abilityId === 'primevalAwareness') {
        // ── CONSCIENCE PRIMITIVE (Rôdeur) : brûle un emplacement niv. 1 — le MJ
        //    répond honnêtement sur les créatures à 1,5 km.
        const spent = spendSpellSlot(char, 1, 1);
        if (spent.error) {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚠️ ${tr.abilityPrimevalLabel} — ${spent.error}]*` }]);
          return;
        }
        syncCharacterCritical(spent.character, 'hp');
        patchCombat((s: any) => spendPlayerMainAction(s));
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${tr.abilityPrimevalLabel} — présence des créatures surnaturelles à 1,5 km révélée]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used PRIMEVAL AWARENESS (action, one level-1 slot). You MUST answer honestly: for each of these types — aberrations, celestials, dragons, elementals, fey, fiends, undead — state whether at least one is present within 1 mile (without revealing number or exact location). Do NOT advance the turn.`);
      } else if (abilityId === 'metaQuickened' && (res.sorceryPoints?.current ?? 0) >= 2) {
        // ── MÉTAMAGIE : SORT ACCÉLÉRÉ — marqueur consommé par le prochain cast.
        const marker = {
          id: `quickened-${Date.now()}`,
          name: 'Quickened Spell',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 1,
          description: language === 'fr' ? 'Ton prochain sort ce tour coûte une action bonus.' : 'Your next spell this turn costs a bonus action.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== marker.name), marker],
        }, 'sorceryPoints', 2);
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ ${tr.abilityQuickenedLabel} (2 pts) — ton prochain sort coûte l'action bonus]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed QUICKENED SPELL (2 sorcery points): their next spell this turn costs a bonus action instead of an action. Narrate the gathering speed briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'metaHeightened' && (res.sorceryPoints?.current ?? 0) >= 3) {
        // ── MÉTAMAGIE : SORT INTENSIFIÉ — la cible sauvegarde avec désavantage.
        const marker = {
          id: `heightened-${Date.now()}`,
          name: 'Heightened Spell',
          source: 'class_feature' as const,
          duration: 'rounds' as const,
          roundsRemaining: 2,
          description: language === 'fr' ? 'La cible de ton prochain sort à sauvegarde jette avec désavantage.' : 'The target of your next save-spell rolls with disadvantage.',
          modifiers: [],
        };
        const updated = spendResource({
          ...char,
          activeEffects: [...(char.activeEffects || []).filter(e => e.name !== marker.name), marker],
        }, 'sorceryPoints', 3);
        syncCharacterCritical(updated, 'hp');
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌀 ${tr.abilityHeightenedLabel} (3 pts) — la prochaine sauvegarde ennemie se fera avec DÉSAVANTAGE]*` }]);
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player primed HEIGHTENED SPELL (3 sorcery points): the target of their next save-spell rolls its save with DISADVANTAGE. Narrate the tightening magic briefly. Do NOT advance the turn.`);
      } else if (abilityId === 'wholenessOfBody' && (res.wholenessOfBody?.current ?? 0) > 0) {
        // ── PLÉNITUDE DU CORPS (Voie de la Paume) : soigne 3 × niveau.
        const heal = Math.min(3 * (char.level || 1), char.hp.max - char.hp.current);
        if (heal <= 0) return;
        const nextHP = char.hp.current + heal;
        const updated = spendResource({ ...char, hp: { ...char.hp, current: nextHP } }, 'wholenessOfBody');
        syncCharacterCritical(updated, 'hp');
        patchCombat((s: any) => spendPlayerMainAction({
          ...s,
          combatants: s.combatants.map((c: any) => c.isPlayer ? { ...c, hp: { ...c.hp, current: nextHP } } : c),
        }));
        setPlayerRoll({ result: heal, reason: `${tr.abilityWholenessLabel} : +${heal} ${tr.hp}` });
        await waitDice();
        logCombatRoll({ type: 'damage', name: tr.abilityWholenessLabel, total: heal, formula: `3 × ${char.level}`, isDM: false });
        if (dm && isConnected) await dm.sendUserMessage(`[SYSTEM] Player used WHOLENESS OF BODY (action) and healed ${heal} HP through inner ki (now ${nextHP}/${char.hp.max}). Narrate the meditative surge. Do NOT advance the turn.`);
      }
    } finally {
      actionLockRef.current = false;
      setIsResolvingAction(false);
    }
  };

  const handlePlayerDodge = async () => {
    if (actionLockRef.current) return;
    if (!combatState.isActive) return;
    if (guardPlayerAction()) return;
    // CB5 — l'esquive est une action : refus si la tranche est déjà dépensée.
    if (!hasPlayerMainSlice(combatState)) {
      rejectActionSpent(false);
      return;
    }
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
    // ui-m4 — updater FONCTIONNEL : le snapshot combatState de la clôture peut
    // être périmé et aurait écrasé des mutations concurrentes du MJ.
    setCombatState((prev: any) => spendPlayerMainAction({
      ...prev,
      combatants: prev.combatants.map((c: any) => {
        const patched = updatedCombatants.find(u => u.id === c.id);
        return (patched && c.isPlayer) ? { ...c, activeEffects: patched.activeEffects } : c;
      }),
    }));

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
    if (guardPlayerAction()) return;
    actionLockRef.current = true;
    setIsResolvingAction(true);
    try {
    const effectText = (potionItem.effect || potionItem.description || '').toLowerCase();
    const name = (potionItem.name || 'Potion');
    // PL1 — boire une potion est TOUJOURS une action bonus (règle BG3 voulue) :
    // on attaque ET on boit dans le même tour, mais une seule potion par tour.
    const isBonusPotion = true;

    // CB5/PL1 — la potion consomme l'action bonus : refus clair si déjà utilisée.
    if (combatState.isActive && !hasPlayerBonusFree(combatState)) {
      rejectActionSpent(true);
      return;
    }

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

    // PL1 — les potions rendent TOUJOURS leur maximum (2d4+2 → 10) : une
    // ressource dépensée ne doit pas décevoir sur un mauvais jet.
    const healAmount = maxRollOfFormula(formula);
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

    setPlayerRoll({ result: healAmount, reason: tr.consumesPotionLabel(name, healAmount) });
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
      // État FRAIS du store, pas la valeur de rendu (elle peut retarder d'un tick).
      let state = useGameStore.getState().combatState;

      // 1. Consume the declared cost ('free' costs nothing).
      const e0 = getPlayerEconomy(state);
      if (p.cost === 'action') {
        if ((e0.attacksUsed ?? 0) >= (e0.attacksMax ?? 1)) {
          showActionToast(`⏳ ${language === 'fr' ? 'Plus d\'action ce tour' : 'No action left this turn'} — « ${p.label} »`);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Action principale déjà utilisée ce tour — « ${p.label} » impossible.]*` }]);
          removeProposedAction(p.id);
          return;
        }
        // PL7 — une carte improvisée coûte UN pip d'attaque (comme un coup),
        // pas la tranche d'action complète : spendPlayerMainAction vidait TOUS
        // les pips d'un guerrier à Extra Attack.
        state = patchPlayerEconomy(state, { attacksUsed: (e0.attacksUsed ?? 0) + 1 });
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

      // Trame : mémoriser l'attaque custom pour la ligne-résumé du combat.
      combatChronicle.addCustom(p.label);

      const summaries: string[] = [];

      // ── Anti-écrasement (audit 2026-08-12, même famille que le pipeline
      // d'outils) : l'ancienne version chaînait un `state` LOCAL à travers
      // jusqu'à N animations de 4 s puis committait TOUT À LA FIN — un appel
      // d'outil MJ concurrent pendant les dés était écrasé (ou écrasait la
      // décapitation). Désormais : relecture FRAÎCHE avant chaque mutation,
      // commit SYNCHRONE avant chaque animation, plus aucun commit après await.
      const liveState = () => useGameStore.getState().combatState;
      const commitDamage = (targetId: string, dmg: number, damageType?: string) => {
        const applied = applyDamageToEncounter(liveState(), targetId, dmg, damageType);
        if (applied.found) {
          setCombatState(applied.state);
          if (applied.npcConcentrationBroken) {
            const broken = applied.npcConcentrationBroken;
            const released = releaseNpcConcentrationEffect(applied.state, useGameStore.getState().character, broken);
            setCombatState(released.state);
            if (released.removedFromPlayer && released.character) syncCharacterCritical(released.character, 'hp');
            setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${language === 'fr' ? `${broken.casterName} perd sa concentration : ${broken.effectName} prend fin.` : `${broken.casterName} loses concentration: ${broken.effectName} ends.`}]*` }]);
          }
        }
        return applied;
      };
      const commitCondition = (targetId: string, condition: string) => {
        const cond = applyConditionToEncounter(liveState(), targetId, condition);
        if (cond.found) setCombatState(cond.state);
        return cond;
      };
      // Malus/bonus CHIFFRÉ sur la CIBLE (targetEffect de la carte) — lu par le
      // moteur via combatantEffectBonus, tick par rounds comme add_effect.
      const commitTargetEffect = (targetId: string) => {
        if (!p.targetEffect) return;
        const fx = {
          id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: p.label,
          source: 'condition' as const,
          duration: 'rounds' as const,
          roundsRemaining: p.targetEffect.rounds,
          description: `${p.targetEffect.stat} ${p.targetEffect.bonus > 0 ? '+' : ''}${p.targetEffect.bonus} (${p.targetEffect.rounds} rounds)`,
          modifiers: [{ stat: p.targetEffect.stat as any, bonus: p.targetEffect.bonus }],
        };
        setCombatState((prev: any) => ({
          ...prev,
          combatants: prev.combatants.map((c: any) => c.id === targetId
            ? { ...c, activeEffects: [...(c.activeEffects || []).filter((e: any) => e.name !== fx.name), fx] }
            : c),
        }));
        summaries.push(`${p.targetEffect.stat} ${p.targetEffect.bonus > 0 ? '+' : ''}${p.targetEffect.bonus} (${p.targetEffect.rounds}r)`);
      };

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
            setCombatState(result.state);
            summaries.push(language === 'fr' ? 'se rapproche (loin → proche)' : 'closes in (far → near)');
          } else if (result.success && result.resolution) {
            const res = result.resolution;
            // Commit AVANT les animations : la fenêtre de combat reflète le
            // coup immédiatement et rien ne peut plus l'écraser pendant les dés.
            setCombatState(result.state);
            setPlayerRoll({ result: res.attackRoll.total, reason: `${p.label} ${tr.vs} ${res.target} (${res.hit ? tr.hit : tr.miss})`, success: res.hit });
            await waitDice();
            logCombatRoll({ type: 'attack', name: p.label, total: res.attackRoll.total, formula: `${res.attackRoll.die} + ${res.attackRoll.modifier} = ${res.attackRoll.total} ${tr.vs} ${tr.ac} ${res.attackRoll.prompt.dc}`, isDM: false, success: res.hit });
            if (res.hit && res.damage > 0) {
              setPlayerRoll({ result: res.damage, reason: `${p.label} — ${tr.damage} : ${res.damage} ${res.damageType}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} (${tr.damage})`, total: res.damage, formula: res.damageFormula, isDM: false });
            }
            if (res.hit) {
              if (p.condition) commitCondition(targetId, p.condition);
              commitTargetEffect(targetId);
            }
            summaries.push(`${res.target} : ${res.hit ? `${res.damage} ${res.damageType}` : 'manqué'}`);
          }
        }
      } else if (p.resolution === 'save') {
        const dc = p.dc ?? 13;
        const ability = (p.saveAbility || 'DEX') as any;
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = liveState().combatants.find((c: any) => c.id === id);
          if (!target || target.hp.current <= 0) continue;
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
              commitDamage(id, dmg, p.damageType);
              setPlayerRoll({ result: dmg, reason: `${target.name} ${tr.takes} ${dmg} ${p.damageType || ''}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} → ${target.name}`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) commitCondition(id, p.condition);
            commitTargetEffect(id);
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
            const dmgTarget = liveState().combatants.find((c: any) => c.id === id);
            if (p.damageFormula) {
              const dmg = rollDice(p.damageFormula).total;
              commitDamage(id, dmg, p.damageType);
              // PL9 — les dégâts d'une improvisation réussie s'AFFICHENT
              // (overlay de dés) et remontent au HUD, comme une attaque.
              setPlayerRoll({ result: dmg, reason: `${p.label} → ${dmgTarget?.name || tr.target} : ${dmg} ${p.damageType || tr.damage}` });
              await waitDice();
              logCombatRoll({ type: 'damage', name: `${p.label} → ${dmgTarget?.name || tr.target}`, total: dmg, formula: p.damageFormula, isDM: false });
            }
            if (p.condition) commitCondition(id, p.condition);
            commitTargetEffect(id);
          }
        }
        summaries.push(outcome.success ? 'réussi' : 'raté');
      } else if (p.resolution === 'auto') {
        for (const id of resolveProposedTargets(state, p.target)) {
          const target = liveState().combatants.find((c: any) => c.id === id);
          if (p.damageFormula) {
            const dmg = rollDice(p.damageFormula).total;
            commitDamage(id, dmg, p.damageType);
            setPlayerRoll({ result: dmg, reason: `${p.label} → ${target?.name} : ${dmg} ${p.damageType || ''}` });
            await waitDice();
            logCombatRoll({ type: 'damage', name: `${p.label} → ${target?.name || tr.target}`, total: dmg, formula: p.damageFormula, isDM: false });
          }
          if (p.condition) commitCondition(id, p.condition);
          commitTargetEffect(id);
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
          {
            // Fiche FRAÎCHE (même famille de correctifs que GS2/GS13).
            const liveChar = useGameStore.getState().character || character;
            syncCharacterCritical({ ...liveChar, storyModifiers: [...(liveChar.storyModifiers || []), modifier].slice(-8) }, 'hp');
          }
          summaries.push(`${modifier.name} : ${modifier.mode}${modifier.bonus ? ` ${modifier.bonus > 0 ? '+' : ''}${modifier.bonus}` : ''} (${modifier.remainingUses}×)`);
        } else summaries.push('effet appliqué');
      }

      // Chaque mutation a déjà été commitée en synchrone AVANT son animation —
      // plus de commit tardif à écraser. On synchronise juste la fiche du
      // joueur sur l'ÉTAT FRAIS si ses PV ont bougé.
      const finalState = liveState();
      const playerCombatant = finalState.combatants.find((c: any) => c.isPlayer);
      const liveChar = useGameStore.getState().character;
      if (playerCombatant && liveChar && playerCombatant.hp.current !== liveChar.hp.current) {
        syncCharacterCritical({ ...liveChar, hp: { ...liveChar.hp, current: playerCombatant.hp.current } }, 'hp');
      }

      removeProposedAction(p.id);
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[🎬 ${p.label}]*` }]);
      if (dm && isConnected) {
        await dm.sendUserMessage(`[SYSTEM] Player triggered improvised action "${p.label}" (${p.resolution}, cost ${p.cost}): ${summaries.join(' | ') || 'resolved'}. Narrate it vividly. Do NOT advance the turn — the player ends their own turn.`);
      }
      maybeEndCombat(liveState());
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
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effet(s) dissipé(s) : ${ticked.expired.join(', ')}]*` }]);
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
          text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(effect => effect.name).join(', ')}]*`
        }]);
      } else {
        setTranscript(prev => [...prev, { speaker: 'dm', text: '*[SYSTEM: Concentration maintained]*' }]);
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
  const runEnemySaveSpell = async (npc: any, primaryTarget: any, spell: MonsterSpell, kit: CasterKit, heroesUp: any[]) => {
    const dc = spell.dc ?? kit.dc;
    const victims = spell.kind === 'aoe_save' ? heroesUp : [primaryTarget];
    for (const victim of victims) {
      const live = useGameStore.getState().combatState;
      const row = live.combatants.find((c: any) => c.id === victim.id);
      if (!row || row.hp.current <= 0) continue;
      const ability = (spell.saveAbility || 'DEX') as Ability;
      const liveChar = useGameStore.getState().character;
      let bonus = 0;
      let advantage: 'advantage' | undefined;
      if (row.isPlayer && liveChar) {
        const effectiveStats: Record<string, number> = {
          STR: getEffectiveStat(liveChar, 'STR'), DEX: getEffectiveStat(liveChar, 'DEX'), CON: getEffectiveStat(liveChar, 'CON'),
          INT: getEffectiveStat(liveChar, 'INT'), WIS: getEffectiveStat(liveChar, 'WIS'), CHA: getEffectiveStat(liveChar, 'CHA'),
        };
        const check = getCheckModifier({
          effectiveStats, level: liveChar.level || 1, ability, isSave: true,
          proficiencies: liveChar.proficiencies || [], expertise: liveChar.expertise || [],
          proficientSaves: getProficientSaves(liveChar),
        });
        const passives = classSavePassives(liveChar, ability);
        bonus = check.modifier + passives.bonus;
        if (passives.advantage) advantage = 'advantage';
        // Don Tueur de mages : avantage contre un sort lancé AU CONTACT.
        if (featGrantsAdvantageOn(liveChar, 'save_vs_adjacent_spell') && ((npc.range || 'melee') === 'melee')) advantage = 'advantage';
      } else {
        const creatureData: any = lookupMonster(row.name) || getCreature(row.name);
        if (creatureData && 'saves' in creatureData && creatureData.saves?.[ability] !== undefined) bonus = creatureData.saves[ability];
        else if (creatureData && 'stats' in creatureData && creatureData.stats?.[ability] !== undefined) bonus = Math.floor((creatureData.stats[ability] - 10) / 2);
      }

      const outcome = resolveRollPrompt(normalizeRollPrompt({
        reason: `${row.name} — ${tr.saveWord} ${ability} vs ${spell.name}`,
        formula: `1d20${bonus >= 0 ? '+' : ''}${bonus}`,
        dc,
        advantage,
      }));
      setCurrentRoll({ result: outcome.total, reason: `${row.name} — ${tr.saveWord} ${ability} vs ${spell.name} (${outcome.success ? tr.saveSuccess : tr.saveFail})`, isDM: !row.isPlayer, success: outcome.success });
      await waitDice();
      logCombatRoll({ type: 'save', name: `${row.name} : ${tr.saveWord} ${ability} vs ${spell.name}`, total: outcome.total, formula: `${outcome.formulaLabel} vs DC ${dc}${advantage ? ' (advantage)' : ''}`, isDM: !row.isPlayer, success: outcome.success });

      // Dégâts : moitié sur réussite (défaut), Évasion du héros respectée.
      if (spell.formula && !spell.conditionOnly) {
        const rolled = rollDice(spell.formula).total;
        const halfOnSave = spell.halfOnSave !== false;
        let mult = outcome.success ? (halfOnSave ? 0.5 : 0) : 1;
        if (row.isPlayer && liveChar && ability === 'DEX' && halfOnSave && hasEvasion(liveChar)) {
          mult = outcome.success ? 0 : 0.5;
        }
        const dmg = Math.floor(rolled * mult);
        if (dmg > 0) {
          if (row.isPlayer && liveChar) {
            // applyDamageToCharacter applique résistances/immunités/vulnérabilités
            // du héros ET l'échec de jet de mort automatique s'il était à terre.
            const applied = applyDamageToCharacter(liveChar, dmg, spell.damageType);
            const struck = applied.character;
            syncCharacterCritical(struck, 'hp');
            setCombatState((prev: any) => ({
              ...prev,
              combatants: prev.combatants.map((c: any) => c.isPlayer
                ? { ...c, hp: { ...c.hp, current: struck.hp.current }, tempHP: struck.tempHP }
                : c),
            }));
            logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: applied.amountApplied, formula: `${spell.formula}${applied.mitigation !== 'normal' ? ` (${applied.mitigation})` : ''}`, isDM: true });
            const conc = resolveConcentrationAfterDamage(struck, applied.amountApplied);
            if (conc.broken) {
              syncCharacterCritical(conc.character, 'hp');
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Concentration broken: ${conc.removedEffects.map(e => e.name).join(', ')}]*` }]);
            } else if (struck.hp.current > 0 && conc.prompt) {
              setActivePrompt(conc.prompt);
              campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', conc.prompt);
            }
          } else {
            const appliedAlly = applyDamageToEncounter(useGameStore.getState().combatState, row.id, dmg, spell.damageType);
            if (appliedAlly.found) setCombatState(appliedAlly.state);
            logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: appliedAlly.amountApplied ?? dmg, formula: `${spell.formula}${appliedAlly.mitigation && appliedAlly.mitigation !== 'normal' ? ` (${appliedAlly.mitigation})` : ''}`, isDM: true });
          }
        } else {
          logCombatRoll({ type: 'damage', name: `${spell.name} → ${row.name}`, total: 0, formula: row.isPlayer && liveChar && hasEvasion(liveChar) && ability === 'DEX' && outcome.success ? 'Évasion — 0' : `${spell.formula} — 0`, isDM: true });
        }
      }

      // Condition sur ÉCHEC + lien de concentration du lanceur (brisable).
      if (!outcome.success && spell.condition) {
        if (row.isPlayer) {
          const cChar = useGameStore.getState().character;
          if (cChar) {
            const conditioned = applyConditionToCharacter(cChar, spell.condition);
            if (conditioned.found) {
              syncCharacterCritical(conditioned.character, 'hp');
              setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${row.name} — ${conditioned.condition?.name} (${spell.name})]*` }]);
            }
          }
        } else {
          const conditioned = applyConditionToEncounter(useGameStore.getState().combatState, row.id, spell.condition);
          if (conditioned.found) setCombatState(conditioned.state);
        }
        if (spell.concentration) {
          const effectName = lookupCondition(spell.condition)?.name || spell.condition;
          setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.id === npc.id
              ? { ...c, concentratingOn: { effectName, targetId: row.id } }
              : c),
          }));
        }
      }
    }
    // Sort de zone à concentration (Spirit Guardians, Cloudkill) : lien posé
    // sur le lanceur même sans condition — le blesser peut dissiper le sort.
    if (spell.concentration && !spell.condition) {
      setCombatState((prev: any) => ({
        ...prev,
        combatants: prev.combatants.map((c: any) => c.id === npc.id
          ? { ...c, concentratingOn: { effectName: spell.name, targetId: undefined } }
          : c),
      }));
    }
  };

  const runNPCTurn = async (npc: any) => {
    // C1 — États incapacitants (Paralyzed/Stunned/Unconscious/Incapacitated) :
    // le tour est SAUTÉ. Sans ce garde, un ennemi sous Hold Person attaquait
    // normalement et le sort de contrôle ne faisait rien.
    const npcCapability = getActionCapability(npc.activeEffects);
    if (!npcCapability.canAct) {
      setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⛓️ ${npc.name} — ${npcCapability.blockedBy} : ${language === 'fr' ? 'aucune action possible, son tour est sauté' : 'no actions possible, turn skipped'}]*` }]);
      if (dm && isConnected) {
        dm.sendSystemMessage(`[SYSTEM] ${npc.name} is ${npcCapability.blockedBy} and CANNOT act (no actions or reactions). Its turn was skipped by the engine — narrate the helplessness in one short beat. Do NOT roll or resolve anything for it.`);
      }
      const live = useGameStore.getState().combatState;
      if (maybeEndCombat(live)) return;
      setCombatState(advanceTurn(live));
      return;
    }

    // ALLIÉS À PROFIL CONNU (compagnons recrutés, bête du Beast Master,
    // monture) : le MOTEUR joue leur tour lui-même — vrai jet d'attaque, vrais
    // dégâts, le MJ ne fait que narrer le rapport. Fini le tour d'allié qui
    // « passe » parce que le MJ n'a pas appelé resolve_attack à temps.
    if (combatantSide(npc) === 'ally') {
      const allyProfile = (() => {
        // Profil porté par le combattant lui-même (posé à l'ajout) — c'est le
        // cas de TOUS les alliés désormais, y compris les PNJ improvisés.
        if (npc.attack?.damage) return { ...npc.attack };
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
        // Dernier recours : profil générique proportionné au niveau du héros.
        // Un allié SANS profil restait planté à attendre le MJ pendant 8 s,
        // puis son tour passait — « les alliés ne servent à rien ».
        return allyAttackProfile(null, getCreature(npc.name), character.level || 1);
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
        reason: tr.moraleCheckLabel(moraleResult.combatant!.name),
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

    // ── LANCEUR DE SORTS ENNEMI (2026-08-13) : un mage/prêtre/liche du
    // bestiaire choisit un VRAI sort (kit SRD) avant de se rabattre sur l'arme.
    // Zone si ≥2 cibles côté héros, sinon le sort limité le plus fort, sinon le
    // tour de magie à volonté. Les usages limités sont décomptés par combat.
    let spellWeaponOverride: any = null;
    const casterKit = getCasterKit(npc.name);
    if (casterKit && combatantSide(npc) === 'enemy') {
      const liveRow = useGameStore.getState().combatState.combatants.find((c: any) => c.id === npc.id);
      const usedSpells: Record<string, number> = liveRow?.spellUses || {};
      const usesLeft = (s: MonsterSpell) => s.uses === undefined ? Infinity : Math.max(0, s.uses - (usedSpells[s.name] || 0));
      const heroesUp = useGameStore.getState().combatState.combatants.filter((c: any) => isHero(c) && c.hp.current > 0);
      const chosen = casterKit.spells.find(s => s.kind === 'aoe_save' && usesLeft(s) > 0 && heroesUp.length >= 2)
        || casterKit.spells.find(s => s.uses !== undefined && usesLeft(s) > 0 && s.kind !== 'aoe_save')
        || casterKit.spells.find(s => s.uses === undefined);
      if (chosen) {
        if (chosen.uses !== undefined) {
          setCombatState((prev: any) => ({
            ...prev,
            combatants: prev.combatants.map((c: any) => c.id === npc.id
              ? { ...c, spellUses: { ...(c.spellUses || {}), [chosen.name]: (c.spellUses?.[chosen.name] || 0) + 1 } }
              : c),
          }));
        }
        auditBus.publish('combat', `🪄 ${npc.name} lance ${chosen.name} (${chosen.kind}, DD ${chosen.dc ?? casterKit.dc})`, chosen);
        if (chosen.kind === 'attack') {
          // Jet d'ATTAQUE de sort → réutilise tel quel le chemin d'attaque
          // complet ci-dessous (réaction Bouclier, résistances, journal).
          spellWeaponOverride = {
            name: chosen.name,
            attackBonus: chosen.attackBonus ?? casterKit.attackBonus,
            damage: chosen.formula || '1d8',
            damageType: chosen.damageType || 'force',
          };
        } else {
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🪄 ${npc.name} ${language === 'fr' ? 'lance' : 'casts'} ${chosen.name} !]*` }]);
          await runEnemySaveSpell(npc, target, chosen, casterKit, heroesUp);
          setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Turn completed for ${npc.name}]*` }]);
          const freshEnd = useGameStore.getState().combatState;
          if (maybeEndCombat(freshEnd)) return;
          setCombatState(advanceTurn(freshEnd));
          if (dm && isConnected) {
            dm.sendSystemMessage(`[SYSTEM] ${npc.name} CAST ${chosen.name}${chosen.kind === 'aoe_save' ? ' over the whole party' : ` on ${target.name}`} — saves, damage and conditions are ALREADY resolved (see the [SYSTEM] lines and roll journal). Narrate the spell vividly; never re-roll or re-apply it.`);
          }
          return;
        }
      }
    }

    const availableAttacks = resolvedAttacks.filter((a: any) => !a.name.toLowerCase().includes('multiattack'));
    // Real multiattack count parsed from the creature's action text (was hard-capped at 2).
    const attackCount = creature ? getMultiattackCount(creature as any) : 1;

    const attacksToRun: any[] = [];
    if (spellWeaponOverride) {
      // Un sort d'attaque = UN cast ce tour (pas de multiattaque au bâton derrière).
      attacksToRun.push(spellWeaponOverride);
    } else if (availableAttacks.length > 0) {
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
      // GS6 (contre-audit) — fiche FRAÎCHE à chaque frappe : le moteur lit la CA
      // du joueur sur ce paramètre (getEffectiveAC). Avec la prop de rendu, le
      // +5 CA du sort Bouclier accepté en réaction (ou Armure du mage, ou tout
      // buff MJ posé pendant le tour) était invisible pour les frappes SUIVANTES
      // de la même multiattaque.
      const liveCharForStrike = useGameStore.getState().character || character;
      const result = resolveAttackAction(currentState, {
        attacker: npc.id,
        target: target.id,
        attackName: attack.name,
        attackBonus,
        damageFormula,
        damageType,
        advantage: targetDodging ? 'disadvantage' : undefined,
        consumeAction: false
      }, liveCharForStrike);

      if (result.success && (result as any).advanced) {
        // NF4 — ennemi hors de portée : son attaque devient un RAPPROCHEMENT
        // d'UNE bande (loin → à distance, ou à distance → contact). Depuis
        // « loin », il lui faut donc 2 tours pour arriver au contact.
        const advNpc = (result as any).advanced as { from: string; to: string };
        const bandFrNpc = (b: string) => b === 'far' ? 'loin' : b === 'near' ? 'à distance' : 'au contact';
        currentState = result.state;
        setCombatState(currentState);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${npc.name} se rapproche (${bandFrNpc(advNpc.from)} → ${bandFrNpc(advNpc.to)}).]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] ${npc.name} CLOSED THE DISTANCE (${advNpc.from} → ${advNpc.to}) instead of striking — that consumed its turn. Narrate the advance in one short beat and ALWAYS state the new distance.`);
        }
        break; // le rapprochement consomme le tour de cet ennemi
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
        reason: `${npc.name} ${tr.attacksWith} ${attack.name}: ${res.hit ? tr.hit : tr.miss}`,
        isDM: true,
        success: res.hit
      });

      await waitDice();

      // Réaction défensive auto-résolue par le moteur (Esquive instinctive du
      // Roublard, Déviation de projectiles du Moine) : rendue VISIBLE, sinon le
      // joueur voit juste des dégâts mystérieusement réduits.
      if (res.hit && res.reaction) {
        const line = res.reaction === 'uncanny_dodge'
          ? tr.reactionUncanny
          : tr.reactionDeflect(res.reactionAmount || 0);
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🌀 ${line}${res.reaction === 'deflect_missiles' && res.damage === 0 ? ' — projectile ATTRAPÉ !' : ''}]*` }]);
        pushCombatRoll({ name: line, total: res.damage, formula: res.reaction, isDM: false });
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] The player's ${res.reaction === 'uncanny_dodge' ? 'UNCANNY DODGE halved the blow' : `DEFLECT MISSILES turned aside ${res.reactionAmount} damage${res.damage === 0 ? ' — they CAUGHT the projectile' : ''}`} (reaction, already resolved). Weave it into the narration.`);
        }
      }

      if (res.hit && res.damage > 0) {
        // SFX déterministe : grognement du héros s'il encaisse, impact sinon.
        if (target.isPlayer) playPlayerHurt(character as any);
        else playDamageImpact(res.damageType, Boolean((res as any).criticalHit), false);
        // 2. Roll Damage dice animation
        setCurrentRoll({
          result: res.damage,
          reason: `${npc.name}: ${attack.name} damage (${res.damageType})`,
          isDM: true
        });

        await waitDice();
      }

      // Rage implacable : le moteur a maintenu le barbare à 1 PV.
      if (res.relentless) {
        setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🔥 ${tr.relentlessLine}]*` }]);
        if (dm && isConnected) {
          dm.sendSystemMessage(`[SYSTEM] The raging barbarian should have dropped — RELENTLESS RAGE kept them at 1 HP (CON save passed, already resolved). Narrate them refusing to fall.`);
        }
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
    // CB4 — la réaction consommée par le moteur pendant CE tour (Esquive
    // instinctive, Déviation de projectiles) doit survivre à la réconciliation.
    // Avant, l'actionEconomy du moteur était jetée : reactionUsed repartait à
    // false et la réaction se re-déclenchait sur CHAQUE tour ennemi du round.
    const enginePlayerEcon: any = (currentState.actionEconomy as any)?.['player'];
    const freshEconomy: any = fresh.actionEconomy || {};
    const reconciled = {
      ...fresh,
      actionEconomy: enginePlayerEcon?.reactionUsed
        ? { ...freshEconomy, player: { ...(freshEconomy['player'] || {}), reactionUsed: true } }
        : freshEconomy,
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
    setTranscript(prev => [...prev, { speaker: 'dm', text: '*[SYSTEM: Long rest completed]*' }]);

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

  return (
    <div className="relative flex h-screen bg-black text-parchment overflow-hidden font-sans">

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
                <p className="truncate text-xs text-white/45">{tr.lvlAbbrev} {character.level} {character.race} {character.class}</p>
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
          className="fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 rounded-md border border-amber-400/40 bg-black/85 px-4 py-2 text-sm font-semibold text-amber-200 shadow-xl"
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
          <div className="flex min-w-[340px] max-w-md flex-col items-center gap-5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-gray-900 to-black p-8 shadow-[0_0_60px_rgba(255,180,0,0.25)]">
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
                setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🎲 ${offer.currency === 'indomitable' ? 'Inflexible' : 'Inspiration brûlée'} — relance : ${second.total} vs DC ${second.prompt.dc || 10} (${second.success ? 'réussite' : 'échec'})]*` }]);
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
