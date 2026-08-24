import React, { useCallback, useRef, useEffect } from 'react';
import { useGameStore, appendCampaignLog, combatChronicle, describeCombatFoes, formatCombatChronicleLine } from '../store/gameStore';
import { freezeChapterDigest, reconcileMissingDigests } from '../services/chapterChronicle';
// Résumeur : digest FIGÉ d'un chapitre clos (architecture secrétaire+résumeur).
import { generateGeminiImage, buildCombatImagePrompt, buildSceneImagePrompt, buildMomentImagePrompt, type ScenePromptOptions } from '../services/geminiImageService';
import { collectSceneReferences, ensureStyleAnchor, heroDescriptor, styleTagsForCampaign } from '../services/imageReferences';
import { Item, getEffectiveStat, getRollBonus, getGearSkillBonus, getEffectiveAC, getPlayerAttackCount } from '../types';
import { getCheckModifier, canonicalSkillName, SKILL_TRANSLATIONS, gearAdvantageFor, armorStealthPenalty, foldText } from '../services/skillSystem';
import { resolveSceneIndex, stripOpeningCanonFact, isAtOpening, currentChapterNumber, secretLockLabel } from '../services/campaignDirector';
import { CLASS_DATA } from '../data/classes';
import { campaignEventLog } from '../services/campaignEventLog';
import { buildBranchWriterRequest, buildSubBranchDigest, generateSubBranchPlan } from '../services/branchWriterService';
import { saveService } from '../services/saveService';
import { waitDice } from '../services/diceTiming';
// 2026-08-15 — localSfxService (génération) débranché : banque sfxLibrary seule.
import { sfxLibrary } from '../services/sfxLibrary';
import { auditBus } from '../services/auditBus';
import {
    addEnemyToEncounter,
    addAllyToEncounter,
    advanceTurn,
    applyAutoDamageSpell,
    castSpell,
    combatantSide,
    applyConditionToCharacter,
    applyConditionToEncounter,
    applyDamageToCharacter,
    applyDamageToEncounter,
    applyCharacterHP,
    applyLongRest,
    applyShortRest,
    applyEffectArgs,
    encounterAlreadyRunning,
    advanceClocksForNight,
    encounterOutcome,
    applyStoryModifiersToPrompt,
    normalizeRollPrompt,
    normalizeStoryModifier,
    resolveCombatantReference,
    resolveAttackAction,
    resolveConcentrationAfterDamage,
    resolveMoraleCheck,
    MORALE_DC,
    resolveRollPrompt,
    resolveSpellAgainstTargets,
    sanitizeXPGrant,
    startEncounter,
    updateEnemyHP
} from '../services/rulesEngine';
import {
    assessEncounterPressure,
    buildEncounter,
    lookupCondition,
    lookupItem,
    lookupMonster,
    lookupRule,
    lookupSpell,
    preloadCodexBestiary,
    searchCodex,
    structureInventoryItem
} from '../services/codexService';
import { cooldownRemainingMs, MEDIA_GENERATION_COOLDOWN_MS } from '../services/mediaThrottle';
import { getCreature } from '../data/bestiary';
import { getMagicItemByName, magicItemToInventoryItem, pickMagicItem, rollLootTable, MagicItemRarity } from '../data/magicItems';
import { buildMerchantStock, normalizeMerchantType } from '../data/merchants';
import { enrichWeaponItem } from '../data/equipment';
import { rollDice } from '../services/utils';
import { galleryService } from '../services/galleryService';
import { portraitService, npcPortraitKey, portraitPrompt } from '../services/portraitService';
import { getAppSettings } from '../store/settingsStore';
import { syncCompanionsFromState, worldHourOf, ensureProgressionState, classSavePassives, classCheckPassives, hasEvasion, deriveRollContext, applyDownedDamagePenalty, releaseNpcConcentrationEffect, formatDamageParts, getProficientSaves, featGrantsAdvantageOn } from '../services/rulesEngine';
import { getMountType, MOUNT_TYPES, getBeastCompanion, BEAST_COMPANIONS, getFamiliarType, FAMILIAR_TYPES, FAMILIAR_CLASSES } from '../data/companionOptions';
import type { CompanionSheet, TimeOfDay } from '../types';

// Show the "local audio server unreachable" SFX warning at most once per session.
// Without this, a down :8001 server spammed the transcript on every narrative SFX.

function stringArg(value: unknown, max = 500): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function stringListArg(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(item => stringArg(item)).filter(Boolean);
    const text = stringArg(value);
    return text ? [text] : [];
}

/** Nombre de faits de TÊTE preserves quand le plafond est atteint : ce sont les
 *  faits semes par l'auteur a la creation (regles du monde, DC des horloges,
 *  lois du plan). Le `slice(-limit)` les evinçait EN PREMIER — exactement les
 *  seuls que le MJ ne peut pas redecouvrir (audit 2026-08-24, C2). */
export const PRESERVED_HEAD_FACTS = 6;

export function uniqueAppend(existing: string[], incoming: string[], limit = 80): string[] {
    const seen = new Set(existing.map(item => item.toLowerCase()));
    const next = [...existing];
    for (const item of incoming) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            next.push(item);
        }
    }
    if (next.length <= limit) return next;
    const head = next.slice(0, PRESERVED_HEAD_FACTS);
    const tail = next.slice(-(limit - head.length));
    return [...head, ...tail];
}

function clockId(name: string): string {
    return `clock_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || Date.now()}`;
}

/** Normalisation de TITRE : accents, casse ET ponctuation décorative
 *  (« … », apostrophes typographiques, guillemets) — foldText seul laissait
 *  « La Cloche Brisée » ≠ « "La Cloche Brisée" ». */
export function foldTitle(value: string): string {
    return foldText(String(value || '')
        // Ligatures : NFD ne décompose PAS œ/æ — « Le Cœur de Pierre » et
        // « Le Coeur de Pierre » restaient deux quêtes distinctes.
        .replace(/[œŒ]/g, 'oe')
        .replace(/[æÆ]/g, 'ae'))
        .replace(/[«»""''`´"'.,;:!?()[\]…-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Retrouve UNE quête par titre, avec un score décroissant : exact > préfixe >
 * inclusion. Le premier-arrivé-gagne de l'ancien code pouvait clore la MAUVAISE
 * quête quand le titre fourni était court ou générique ; ici une inclusion
 * ambiguë (plusieurs candidates au même niveau) est refusée et rend la liste.
 */
export function findQuestByTitle(quests: any[], rawTitle: string, status?: string): { quest?: any; ambiguous?: string[] } {
    const needle = foldTitle(rawTitle);
    if (!needle) return {};
    const pool = quests.filter((q: any) => !status || q.status === status);
    const exact = pool.filter((q: any) => foldTitle(q.title) === needle);
    if (exact.length) return { quest: exact[0] };
    const prefix = pool.filter((q: any) => foldTitle(q.title).startsWith(needle) || needle.startsWith(foldTitle(q.title)));
    if (prefix.length === 1) return { quest: prefix[0] };
    if (prefix.length > 1) return { ambiguous: prefix.map((q: any) => q.title) };
    const loose = pool.filter((q: any) => foldTitle(q.title).includes(needle) || needle.includes(foldTitle(q.title)));
    if (loose.length === 1) return { quest: loose[0] };
    if (loose.length > 1) return { ambiguous: loose.map((q: any) => q.title) };
    return {};
}

/**
 * `add_quest` doit-il REFUSER ce titre parce qu'il désigne une quête déjà
 * accomplie ?
 *
 * La dédup ne visait que les quêtes ACTIVES — restriction posée le 2026-08-21
 * pour qu'une quête récurrente (« Escorter la caravane ») puisse rouvrir. Elle a
 * créé le défaut inverse : rien n'empêchait plus de recréer une quête close, et
 * la séance du 2026-08-23 montre la même quête créée puis refermée SIX fois. La
 * fenêtre « déjà accomplies » du contexte s'en trouvait saturée, donc le MJ ne
 * voyait plus qu'il l'avait bouclée — la boucle se refermait sur elle-même.
 *
 * On garde l'intention de 2026-08-21, mais elle doit être DÉCLARÉE : une vraie
 * quête récurrente passe `recurring: true`.
 *
 * @returns la quête close qui bloque la création, ou null si la voie est libre.
 */
export function questCreationBlockedBy(quests: any[], title: string, recurring?: boolean): any | null {
    if (recurring) return null;
    return findQuestByTitle(quests || [], title, 'completed').quest || null;
}

function numericArg(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

const ROLL_RESPONSE_TIMEOUT_MS = 90_000;

/**
 * BLOCKING two-step roll. Attach a resolver to the on-screen roll prompt and
 * HOLD the tool response until the player rolls (or dismisses / times out).
 * A Live model cannot continue past a function call whose response has not
 * arrived — this is what mechanically stops Gemini from narrating an outcome
 * it does not have (it used to receive an immediate "await the result" response
 * and then invent the result anyway).
 *
 * GameSession delivers the outcome through prompt.resolveToolCall, which
 * returns true when the held response was used; false means the hold already
 * settled (timeout) and the caller must fall back to a [ROLL_RESULT] message.
 */
function holdForRollResolution(prompt: any, base: Record<string, unknown>): Promise<any> {
    return new Promise((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        prompt.resolveToolCall = (payload: Record<string, unknown>): boolean => {
            if (settled) return false;
            settled = true;
            if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }
            resolve({ ...base, ...payload });
            return true;
        };
        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (settled) return;
            settled = true;
            resolve({
                ...base,
                await_roll: true,
                timedOut: true,
                instruction: 'The player has not rolled yet. Do NOT assume or narrate any outcome. Stay in the moment (you may add a short beat of tension); the official [ROLL_RESULT] message will arrive when the dice land.',
            });
        }, ROLL_RESPONSE_TIMEOUT_MS);
    });
}

/** OU5 — un prompt initié par le MOTEUR (sauvegarde de concentration…) ne doit
 *  JAMAIS écraser un jet en attente dont la réponse d'outil est retenue :
 *  l'écrasement laissait le resolveToolCall du premier prompt orphelin et le
 *  MJ Live gelé jusqu'au timeout de 90 s. On DIFFÈRE : retente toutes les
 *  600 ms jusqu'à ce que l'emplacement se libère (2 min max). */
// Timers des prompts moteur en attente : annulés au démontage de la session
// pour qu'un prompt différé ne surgisse jamais dans une session déjà quittée.
const enginePromptTimers = new Set<number>();
function cancelQueuedEnginePrompts() {
    for (const id of enginePromptTimers) window.clearTimeout(id);
    enginePromptTimers.clear();
}

function queueEnginePrompt(prompt: any, label: string) {
    const startedAt = Date.now();
    const trySet = () => {
        const live = useGameStore.getState();
        if (!live.activePrompt) {
            live.setActivePrompt(prompt);
            return;
        }
        if (Date.now() - startedAt > 120_000) {
            console.warn(`⏳ Engine prompt dropped after 120s in queue: ${label}`);
            return;
        }
        const id = window.setTimeout(() => { enginePromptTimers.delete(id); trySet(); }, 600);
        enginePromptTimers.add(id);
    };
    trySet();
}

export function useToolProcessor(deps: {
    diceTrayRef: React.RefObject<any>;
    grantXP: (amount: number, reason: string) => void;
    syncCharacterUpdate: (char: any) => void;
    syncCharacterCritical: (char: any, reason: any) => void;
    syncJournalUpdate: (journal: any) => void;
    syncJournalImmediate: (journal: any) => Promise<boolean>;
    musicDirector?: {
        handleMusicTag: (mood: string) => void;
        handleRestMusic: (isLongRest: boolean) => void;
    };
}) {
    const depsRef = useRef(deps);
    const lastImageStartedAtRef = useRef(0);
    const imageInFlightRef = useRef(false);
    // Dédup de scène : même prompt (première tranche) dans la minute → ignoré.
    const lastScenePromptRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
    const pendingImageRef = useRef<{
        key: string;
        prompt: string;
        meta: { kind: 'scene_image' | 'combat_image' | 'moment_image'; phase: string; summary: string };
        request: any;
    } | null>(null);
    const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => { depsRef.current = deps; }, [deps]);
    useEffect(() => () => {
        if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
        cancelQueuedEnginePrompts();
    }, []);

    const processToolCall = useCallback(async (call: { name: string; args: any }) => {
        const d = depsRef.current;
        const store = useGameStore.getState();
        const { name, args } = call;

        const syncJournal = async (updater: (journal: any) => any, immediate = false) => {
            const currentJournal = useGameStore.getState().journal;
            const updatedJournal = updater(currentJournal);
            if (immediate) {
                await d.syncJournalImmediate(updatedJournal);
            } else {
                d.syncJournalUpdate(updatedJournal);
            }
            return updatedJournal;
        };

        // Journal d'initiative partagé (3 anciens sites copiés-collés unifiés).
        const logInitiativeRoll = (name: string, initiative: number, dexMod: number, isDM: boolean) => {
            const dieRoll = initiative - dexMod;
            deps.diceTrayRef.current?.addLog({
                type: 'initiative',
                name: `${name}: Initiative`,
                total: initiative,
                formula: `d20 (${dieRoll}) + ${dexMod} = ${initiative}`,
                isDM,
            });
        };
        const logNewPlayerInitiative = (hadPlayerBefore: boolean, character: any, state: any) => {
            if (hadPlayerBefore || !character) return;
            const playerCombatant = state.combatants.find((c: any) => c.isPlayer);
            if (!playerCombatant) return;
            const dexMod = Math.floor((character.stats.DEX - 10) / 2);
            logInitiativeRoll(playerCombatant.name, playerCombatant.initiative, dexMod, false);
        };

        // Ligne système bilingue — les lignes moteur étaient en français dur
        // même en session anglaise (audit 2026-08-12).
        const sysLine = (fr: string, en: string) => (useGameStore.getState().language !== 'en' ? fr : en);

        // Test de moral partagé (resolve_attack + apply_damage — 2 anciens blocs
        // copiés-collés). Lit l'état FRAIS, committe AVANT toute animation (aucune
        // écriture d'état après un await → plus de fenêtre d'écrasement), puis
        // affiche les jets. Lignes de transcript bilingues (les anciennes étaient
        // en français dur même en session anglaise).
        const runMoraleCheck = async (targetRef: string): Promise<{ rolled: boolean; fled?: boolean; state: any }> => {
            const liveState = useGameStore.getState().combatState;
            const moraleResult = resolveMoraleCheck(liveState, targetRef);
            if (!moraleResult.rolled) return { rolled: false, state: liveState };
            store.setCombatState(moraleResult.state);

            store.setCurrentRoll({
                result: moraleResult.total!,
                reason: `${moraleResult.combatant!.name} morale check (Wisdom Save total ${moraleResult.total} vs DC ${MORALE_DC})`,
                isDM: true,
                success: moraleResult.success
            });
            deps.diceTrayRef.current?.addLog({
                type: 'save',
                name: `${moraleResult.combatant!.name} Morale Check (WIS Save)`,
                total: moraleResult.total!,
                formula: `d20 (${moraleResult.dieRoll}) + ${moraleResult.wisMod} = ${moraleResult.total} vs DC ${MORALE_DC}`,
                isDM: true,
                success: moraleResult.success
            });
            await waitDice();

            const fr = useGameStore.getState().language !== 'en';
            const who = moraleResult.combatant!.name;
            const line = moraleResult.fled
                ? (fr
                    ? `${who} a raté son test de moral (sauvegarde SAG ${moraleResult.total} vs DD ${MORALE_DC}) après avoir subi des dégâts et s'enfuit du combat !`
                    : `${who} failed their morale check (WIS save ${moraleResult.total} vs DC ${MORALE_DC}) after taking damage and flees the fight!`)
                : (fr
                    ? `${who} a réussi son test de moral (sauvegarde SAG ${moraleResult.total} vs DD ${MORALE_DC}) après avoir subi des dégâts et continue de se battre.`
                    : `${who} passed their morale check (WIS save ${moraleResult.total} vs DC ${MORALE_DC}) after taking damage and keeps fighting.`);
            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${line}]*` }]);
            return { rolled: true, fled: moraleResult.fled, state: moraleResult.state };
        };

        // Concentration après dégâts (5 anciens blocs copiés-collés unifiés).
        // `char` doit être la fiche FRAÎCHE déjà patchée aux PV courants.
        const handleConcentrationAfterDamage = (char: any, damage: number, label = 'concentration save') => {
            const concentration = resolveConcentrationAfterDamage(char, damage);
            if (concentration.broken) {
                d.syncCharacterCritical(concentration.character, 'hp');
                store.setTranscript(prev => [...prev, {
                    speaker: 'dm',
                    text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map((effect: any) => effect.name).join(', ')}]*`
                }]);
            } else if (char.hp.current > 0 && concentration.prompt) {
                queueEnginePrompt(concentration.prompt, label); // OU5 — jamais d'écrasement d'un jet en attente
                campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
                store.setTranscript(prev => [...prev, {
                    speaker: 'dm',
                    text: `*[SYSTEM: Concentration save required, DC ${concentration.dc} after ${damage} damage]*`
                }]);
            }
        };

        // Helper to trigger scene images. Generation is unlimited (the DM paces it);
        // only one image renders at a time and a newer request replaces the pending
        // one, so the most recent story event always wins.
        const armImageTimer = (waitMs: number, flush: () => void) => {
            if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
            imageTimerRef.current = setTimeout(() => {
                imageTimerRef.current = null;
                flush();
            }, Math.max(250, waitMs));
        };

        const startSceneImageGeneration = (entry: NonNullable<typeof pendingImageRef.current>) => {
            imageInFlightRef.current = true;
            lastImageStartedAtRef.current = Date.now();
            // Ancres visuelles (style de campagne + héros + PNJ nommés dans le
            // prompt) : c'est ce qui empêche le héros de changer de visage d'une
            // scène à l'autre. On repère les PNJ dans le prompt lui-même, qui
            // contient la description du MJ telle quelle. Une collecte qui échoue
            // dégrade la cohérence, jamais la génération.
            collectSceneReferences(entry.prompt)
                .catch(() => [] as string[])
                .then(referenceImages => generateGeminiImage(entry.prompt, { aspectRatio: '16:9', referenceImages }))
                .then(url => {
                    const applied = useGameStore.getState().completeSceneVisualRequest(entry.request.id, url);
                    if (!applied) {
                        console.info('Scene image ignored because a newer visual request exists:', entry.request.id);
                        return;
                    }
                    // Chronique illustrée : chaque image générée est archivée
                    // localement (IndexedDB) pour la galerie + l'export HTML.
                    void galleryService.addImage({
                        saveId: useGameStore.getState().activeSaveId || 'dev',
                        dataUrl: url,
                        prompt: entry.prompt,
                        summary: entry.meta.summary,
                        phase: entry.meta.phase,
                    });
                    campaignEventLog.append('ASSET_GENERATED', entry.meta.summary, {
                        kind: entry.meta.kind,
                        phase: entry.meta.phase,
                        prompt: entry.prompt,
                        requestId: entry.request.id,
                        mimeHint: url.slice(5, url.indexOf(';')),
                    });
                })
                .catch((err) => {
                    const failed = useGameStore.getState().failSceneVisualRequest(entry.request.id, err?.message);
                    if (!failed) {
                        console.info('Scene image failure ignored because a newer visual request exists:', entry.request.id);
                        return;
                    }
                    console.warn('Scene image failed:', entry.prompt.slice(0, 60), err?.message);
                    // Surface it: sans cette ligne, une image qui échoue est un
                    // silence total. Le message reflète la CAUSE réelle : en mode
                    // cloud, l'adaptateur Runware émet déjà un texte actionnable
                    // (clé localStorage manquante, erreur API…) — on le montre.
                    const detail = String(err?.message || 'cause inconnue');
                    useGameStore.getState().setTranscript(prev => [...prev, {
                        speaker: 'dm',
                        text: `*[⚠️ Image indisponible — ${detail.slice(0, 220)}]*`
                    }]);
                })
                .finally(() => {
                    imageInFlightRef.current = false;
                    flushPendingImage();
                });
        };

        function flushPendingImage() {
            const entry = pendingImageRef.current;
            if (!entry || imageInFlightRef.current) return;

            const waitMs = cooldownRemainingMs(lastImageStartedAtRef.current);
            if (waitMs > 0) {
                armImageTimer(waitMs, flushPendingImage);
                return;
            }

            pendingImageRef.current = null;
            startSceneImageGeneration(entry);
        }

        // Heure du monde → indice de lumière ajouté aux prompts d'images, pour
        // que l'aube/le crépuscule/la nuit se VOIENT dans les scènes.
        const timeOfDayHint = (): string => {
            const time = useGameStore.getState().campaignRuntime.timeOfDay;
            switch (time) {
                case 'dawn': return ' At dawn, low golden light.';
                case 'dusk': return ' At dusk, warm fading light.';
                case 'night': return ' At night, moonlit darkness.';
                default: return '';
            }
        };

        // Options communes à TOUS les prompts d'image — une seule source de
        // vérité (leçon du contre-audit : les prompts jumeaux divergent dès
        // qu'on les construit à deux endroits). Relues à chaque appel : le
        // joueur peut retoucher son apparence et la campagne peut changer en
        // cours de session.
        const scenePromptOptions = (): ScenePromptOptions => ({
            hero: heroDescriptor(useGameStore.getState().character),
            timeHint: timeOfDayHint(),
            styleTags: styleTagsForCampaign(),
        });

        const scheduleSceneImage = (
            prompt: string,
            meta: { kind: 'scene_image' | 'combat_image' | 'moment_image'; phase: string; summary: string }
        ) => {
            // Mode sans GPU : images locales désactivées dans les Réglages.
            if (!getAppSettings().localImages) {
                campaignEventLog.append('ASSET_THROTTLED', 'Scene image skipped (local images disabled in settings)', { prompt: prompt.slice(0, 120) });
                return;
            }
            // Ancre de style de la campagne : générée une seule fois (la file de
            // portraitService déduplique), réutilisée en référence ensuite. La
            // toute première image part sans — les suivantes l'auront.
            ensureStyleAnchor();
            const key = `${meta.kind}:${prompt.toLowerCase().slice(0, 180)}`;
            // Même scène redemandée dans la minute → on garde l'image en cours.
            const now = Date.now();
            if (lastScenePromptRef.current.key === key && now - lastScenePromptRef.current.at < 60_000) {
                campaignEventLog.append('ASSET_THROTTLED', 'Scene image deduplicated (same prompt within 60s)', { key });
                return;
            }
            lastScenePromptRef.current = { key, at: now };
            const request = useGameStore.getState().beginSceneVisualRequest({
                key,
                prompt,
                kind: meta.kind,
                phase: meta.phase,
                summary: meta.summary,
            });
            const entry = { key, prompt, meta, request };
            const waitMs = cooldownRemainingMs(lastImageStartedAtRef.current);
            if (!imageInFlightRef.current && waitMs === 0 && !pendingImageRef.current) {
                startSceneImageGeneration(entry);
                return;
            }

            pendingImageRef.current = entry;
            campaignEventLog.append('ASSET_THROTTLED', `Scene image queued: ${meta.summary}`, {
                kind: meta.kind,
                phase: meta.phase,
                prompt,
                requestId: request.id,
                cooldownMs: MEDIA_GENERATION_COOLDOWN_MS,
                waitMs: Math.max(waitMs, imageInFlightRef.current ? 1000 : 0),
                policy: 'latest_request_wins',
            });
            flushPendingImage();
            return;
            /*
                    console.warn('🎨 Scene image failed:', prompt.slice(0, 60), err?.message);
                });
            */
        };

        const scheduleCombatImageOnce = (enemy: string, location: string) => {
            // No dedupe window: generation is unlimited and the DM paces itself.
            // The render pipeline is single-flight latest-wins, so rapid repeat
            // calls simply coalesce into the most recent request.
            scheduleSceneImage(
                buildCombatImagePrompt(enemy, location, scenePromptOptions()),
                {
                    kind: 'combat_image',
                    phase: 'combat',
                    summary: `Combat image generated for ${enemy}`,
                }
            );
        };

        const optionalBoolean = (value: unknown): boolean | undefined => {
            if (typeof value === 'boolean') return value;
            if (typeof value !== 'string') return undefined;
            const text = value.trim().toLowerCase();
            if (['true', 'yes', 'oui', 'melee', 'melee attack'].includes(text)) return true;
            if (['false', 'no', 'non', 'ranged', 'range', 'distance'].includes(text)) return false;
            return undefined;
        };

        if (['lookup_monster', 'build_encounter', 'add_enemy_init', 'resolve_attack', 'apply_damage'].includes(name)) {
            await preloadCodexBestiary();
        }

        try {
            switch (name) {
                case 'request_roll': {
                    // One roll at a time: the same on-screen slot also carries
                    // engine-initiated prompts (death saves, concentration).
                    if (useGameStore.getState().activePrompt) {
                        return { success: false, error: 'A roll is already pending on screen. Wait for its result before requesting another.' };
                    }
                    const basePrompt = normalizeRollPrompt(args);
                    // Use the SHEET, not an LLM-typed number: when the DM names a skill or
                    // ability, compute the modifier from the character (ability mod +
                    // proficiency + expertise; class save proficiency for saves) and override
                    // the formula. Story modifiers still layer on via dmBonus afterwards.
                    const rollChar = store.character;
                    const skillArg = args.skill ? String(args.skill) : '';
                    const abilityArg = args.ability ? String(args.ability) : '';
                    let saveAbilityHint: any;
                    if (rollChar && (skillArg || abilityArg)) {
                        const isSave = Boolean(args.isSave)
                            || basePrompt.type === 'SAVE'
                            || /sauvegarde|saving\s*throw|\bsave\b/i.test(String(args.reason || ''));
                        const effectiveStats: Record<string, number> = {
                            STR: getEffectiveStat(rollChar, 'STR'), DEX: getEffectiveStat(rollChar, 'DEX'), CON: getEffectiveStat(rollChar, 'CON'),
                            INT: getEffectiveStat(rollChar, 'INT'), WIS: getEffectiveStat(rollChar, 'WIS'), CHA: getEffectiveStat(rollChar, 'CHA'),
                        };
                        // Classe + dons (Résilient CON) — audit 2026-08-13.
                        const classSaves = getProficientSaves(rollChar);
                        const check = getCheckModifier({
                            effectiveStats,
                            level: rollChar.level || 1,
                            skill: skillArg || undefined,
                            ability: abilityArg || undefined,
                            isSave,
                            proficiencies: rollChar.proficiencies || [],
                            expertise: rollChar.expertise || [],
                            proficientSaves: classSaves,
                        });
                        // Passifs de classe (SRD) : Aura de protection (Paladin 6+),
                        // Sens du danger (Barbare, saves DEX), Touche-à-tout (Barde),
                        // Athlète remarquable (Champion 7+). Le MJ n'a rien à faire.
                        let passiveBonus = 0;
                        if (isSave) {
                            const passives = classSavePassives(rollChar, check.ability);
                            passiveBonus = passives.bonus;
                            if (passives.advantage && basePrompt.advantage !== 'disadvantage') basePrompt.advantage = 'advantage';
                            if (passives.reasons.length) basePrompt.contextReasons = [...(basePrompt.contextReasons || []), ...passives.reasons];
                        } else {
                            const passives = classCheckPassives(rollChar, check.ability, check.proficient);
                            passiveBonus = passives.bonus;
                            if (passives.reasons.length) basePrompt.contextReasons = [...(basePrompt.contextReasons || []), ...passives.reasons];
                        }
                        basePrompt.formula = `1d20${check.modifier + passiveBonus >= 0 ? '+' : ''}${check.modifier + passiveBonus}`;
                        // Bonus plats d'effets (checkBonus/saveBonus) et
                        // d'équipement (« +1 aux sauvegardes », « +2 Discrétion »)
                        // — avant, seuls les story modifiers touchaient dmBonus.
                        const canonical = skillArg ? canonicalSkillName(skillArg) : '';
                        // SKILL_TRANSLATIONS est FR→EN ; on cherche le nom FR par valeur.
                        const frName = canonical ? (Object.entries(SKILL_TRANSLATIONS).find(([, en]) => en === canonical)?.[0] || '') : '';
                        basePrompt.dmBonus = getRollBonus(rollChar, isSave ? 'save' : 'check')
                            + (skillArg && !isSave ? getGearSkillBonus(rollChar, [skillArg, canonical, frName]) : 0);
                        basePrompt.name = `${basePrompt.name}${check.proficient ? (check.expert ? ' (expertise)' : ' (maîtrisé)') : ''}`;
                        saveAbilityHint = check.ability;
                        // NF2 — avantage d'ÉQUIPEMENT (bottes elfiques → avantage
                        // Discrétion), reflété automatiquement dans le jet.
                        if (!isSave && skillArg) {
                            const gearAdv = gearAdvantageFor(rollChar, canonical || skillArg);
                            if (gearAdv && basePrompt.advantage !== 'disadvantage') {
                                basePrompt.advantage = 'advantage';
                                basePrompt.contextReasons = [...(basePrompt.contextReasons || []), `${gearAdv.source}: advantage`];
                            }
                            // SRD — armure bruyante (stealthDisadvantage) : désavantage
                            // aux tests de Discrétion. Le drapeau était affiché sur la
                            // fiche mais jamais appliqué aux jets (audit 2026-08-12).
                            if (canonical === 'Stealth') {
                                const noisy = armorStealthPenalty(rollChar);
                                if (noisy) {
                                    // avantage + désavantage s'annulent (RAW) → 'normal'.
                                    basePrompt.advantage = basePrompt.advantage === 'advantage' ? 'normal' : 'disadvantage';
                                    basePrompt.contextReasons = [...(basePrompt.contextReasons || []), `${noisy.source}: disadvantage on Stealth`];
                                }
                            }
                        }
                    }
                    const modifierApplication = applyStoryModifiersToPrompt(basePrompt, store.character?.storyModifiers || []);
                    // CB7 — les conditions du joueur pèsent enfin sur les jets
                    // demandés par le MJ : entravé → désavantage DEX, paralysé →
                    // échec auto FOR/DEX, empoisonné → désavantage aux tests.
                    // (deriveRollContext n'était appelé que par resolve_attack.)
                    const conditionContext = deriveRollContext(modifierApplication.prompt, {
                        actorEffects: [
                            ...((store.character?.activeEffects || []) as any[]),
                            ...((store.combatState.isActive
                                ? (store.combatState.combatants.find(c => c.isPlayer)?.activeEffects || [])
                                : []) as any[]),
                        ],
                        saveAbility: saveAbilityHint,
                    });
                    const prompt = conditionContext.prompt;
                    const recentEvents = campaignEventLog.getEvents();
                    const lastBranch = [...recentEvents].reverse().find(event => event.type === 'BRANCH_PLANNED');
                    const lastPlayer = [...recentEvents].reverse().find(event => event.type === 'PLAYER_SPOKE');
                    const branchJustPlanned = lastBranch && (!lastPlayer || lastPlayer.timestamp <= lastBranch.timestamp);
                    const forceRoll = args.force === true || String(args.force || '').toLowerCase() === 'true';
                    const protectedRoll = store.combatState.isActive
                        || prompt.type === 'DEATH_SAVE'
                        || Boolean(prompt.concentrationDamage)
                        || /concentration|spell attack|save vs/i.test(prompt.name);
                    if (branchJustPlanned && !forceRoll && !protectedRoll) {
                        const rejection = {
                            reason: prompt.name,
                            formula: prompt.formula,
                            dc: prompt.dc,
                            lastBranch: lastBranch.summary,
                        };
                        campaignEventLog.append('ROLL_REJECTED', `Suppressed roll after branch plan: ${prompt.name}`, rejection);
                        return {
                            success: false,
                            suppressed: true,
                            // ou-m3 — l'override force existait dans le code mais
                            // n'était ni déclaré ni documenté : inatteignable.
                            error: 'Roll suppressed: branch plans cannot trigger checks by themselves. Wait for a new concrete player action with risk and consequence — or pass force=true if this roll genuinely stems from one.',
                        };
                    }
                    if (store.character && modifierApplication.applied.length) {
                        d.syncCharacterCritical({
                            ...store.character,
                            storyModifiers: modifierApplication.remaining,
                        }, 'hp');
                        campaignEventLog.append('ROLL_REQUESTED', `Story modifier applied to ${basePrompt.name}`, {
                            applied: modifierApplication.applied,
                            remaining: modifierApplication.remaining,
                        });
                    }
                    // BLOCKING two-step roll: the tool response is HELD until the
                    // player actually rolls, so the Live DM physically cannot
                    // narrate an outcome it does not have (it used to get an
                    // immediate "wait for the result" response and then invent
                    // the result anyway). GameSession's ActionPrompt delivers
                    // the real outcome through prompt.resolveToolCall.
                    // No await_roll here: the resolved payload states the outcome
                    // (rolled/cancelled) and the timeout payload sets its own flag.
                    const responseBase = {
                        success: true,
                        prompt: { ...prompt },
                        appliedStoryModifiers: modifierApplication.applied,
                    };
                    // ou-m11 — porté par le prompt : si le joueur ANNULE le jet,
                    // GameSession rembourse ces modificateurs (ils étaient
                    // consommés dès la création du prompt, avant tout lancer).
                    (prompt as any).appliedStoryModifiers = modifierApplication.applied;
                    const held = holdForRollResolution(prompt, responseBase);
                    store.setActivePrompt(prompt);
                    campaignEventLog.append('ROLL_REQUESTED', `Roll requested: ${prompt.name}`, { ...prompt, resolveToolCall: undefined });
                    return await held;
                }

                case 'add_inventory_item': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const itemName = String(args.name || '').trim();
                    if (!itemName) return { success: false, error: 'Item name required' };
                    // Coerce quantity: Gemini may send "3"/"a few" for an INTEGER param.
                    // Without this, `number += "3"` concatenated → "13" stored in a number field.
                    const qty = Math.trunc(Number(args.quantity));
                    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };

                    const char = { ...store.character };
                    const nextInventory = (char.inventory || []).map(i => ({ ...i }));

                    // A plain `description` must NOT mark an item magic — that wrongly blocked
                    // stacking of mundane described items (e.g. "a coil of rope").
                    const isMagic = Boolean(args.effect || args.properties || args.damageDice || args.acBonus || args.baseAC || args.armorType);
                    const existingIndex = !isMagic
                        ? nextInventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase() && !i.effect)
                        : -1;

                    let totalQty = qty;
                    if (existingIndex >= 0) {
                        nextInventory[existingIndex].quantity += qty;
                        totalQty = nextInventory[existingIndex].quantity;
                    } else {
                        // SRD catalog enrichment: when the DM grants a known magic item by
                        // bare name ("Flame Tongue", "Épée longue +1") without structured
                        // fields, pull the authoritative stats from data/magicItems so the
                        // engine parses its bonuses correctly instead of storing dead text.
                        const catalogDef = !isMagic ? getMagicItemByName(itemName) : undefined;
                        const newItem: Item = catalogDef
                            ? {
                                ...magicItemToInventoryItem(catalogDef, useGameStore.getState().language === 'fr' ? 'fr' : 'en'),
                                id: crypto.randomUUID(),
                                quantity: qty,
                            }
                            : {
                                id: crypto.randomUUID(),
                                name: itemName,
                                quantity: qty,
                                type: args.type as any,
                                weight: 0,
                                description: args.description || '',
                                slot: 'none',
                                equipped: false,
                                effect: args.effect,
                                properties: args.properties,
                                damageDice: args.damageDice,
                                damageType: args.damageType,
                                acBonus: args.acBonus,
                                baseAC: args.baseAC,
                                armorType: args.armorType,
                                range: args.range,
                            };
                        // Une arme reçue en butin repart toujours de la table SRD
                        // (portée + propriétés) : sans ça, un « Arc long » du MJ
                        // arrivait sans portée et passait pour une arme de mêlée.
                        nextInventory.push(enrichWeaponItem(newItem));
                    }
                    char.inventory = nextInventory;
                    d.syncCharacterUpdate(char);
                    campaignEventLog.append('ITEM_ADDED', `Added ${qty}x ${itemName}`, { name: itemName, quantity: qty, type: args.type });
                    // Log de campagne : seul le loot NOTABLE (magique/structuré) —
                    // pas les rations et torches, qui noieraient la trame.
                    if (isMagic || getMagicItemByName(itemName)) {
                        appendCampaignLog('loot', `Loot: ${qty > 1 ? `${qty}x ` : ''}${itemName}`);
                    }
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Added ${qty}x ${itemName} to inventory]*` }]);
                    return { success: true, item: itemName, total: totalQty };
                }

                case 'remove_inventory_item': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const itemName = String(args.name || '').trim();
                    if (!itemName) return { success: false, error: 'Item name required' };
                    const qty = Math.trunc(Number(args.quantity));
                    if (!Number.isFinite(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };

                    const char = { ...store.character };
                    let nextInventory = (char.inventory || []).map(i => ({ ...i }));
                    const existingIndex = nextInventory.findIndex(i => i.name.toLowerCase() === itemName.toLowerCase());
                    let removed = false;
                    let remaining = 0;
                    if (existingIndex >= 0) {
                        const originalQty = nextInventory[existingIndex].quantity;
                        nextInventory[existingIndex].quantity -= qty;
                        remaining = Math.max(0, nextInventory[existingIndex].quantity);
                        if (nextInventory[existingIndex].quantity <= 0) {
                            nextInventory = nextInventory.filter((_, idx) => idx !== existingIndex);
                        }
                        char.inventory = nextInventory;
                        removed = true;
                        d.syncCharacterUpdate(char);
                        campaignEventLog.append('ITEM_REMOVED', `Removed ${qty}x ${itemName}`, { name: itemName, quantity: qty });
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Removed up to ${Math.min(originalQty, qty)}x ${itemName} from inventory]*` }]);
                    }
                    // ou-m6 — échec EXPLIQUÉ : sans champ error, le MJ ne savait
                    // pas si l'objet était introuvable ou mal orthographié.
                    if (!removed) {
                        const inventoryNames = (store.character.inventory || []).map(i => i.name).slice(0, 25);
                        return {
                            success: false,
                            remaining: 0,
                            error: `Item "${itemName}" not found in inventory. Check the exact name.`,
                            inventory: inventoryNames,
                        };
                    }
                    return { success: true, remaining };
                }

                case 'add_gold': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    // TP10 (contre-audit) — borner la magnitude comme l'XP (sanitizeXPGrant) :
                    // un MJ hallucinant `amount: 1e9` créditait un milliard de po en un appel.
                    const rawDelta = Number(args.amount);
                    if (!isFinite(rawDelta) || rawDelta === 0) return { success: false, error: 'Invalid amount' };
                    const delta = Math.max(-10_000, Math.min(10_000, rawDelta));
                    if (delta !== rawDelta) {
                        return { success: false, error: `Amount ${rawDelta} gp is out of the plausible range (±10000 gp per call). Split legitimate huge payments into justified smaller ones.` };
                    }
                    const char = { ...store.character };
                    const before = char.gold || 0;
                    // ou-m7 — une DÉPENSE supérieure à la bourse est un refus
                    // clair (le joueur « payait » 100 po avec 20 po, clampé à 0
                    // en success:true sans que le MJ le sache).
                    if (delta < 0 && before + delta < 0) {
                        return {
                            success: false,
                            gold: before,
                            shortfall: Math.round((Math.abs(delta) - before) * 100) / 100,
                            error: `Not enough gold: the purse holds ${before} gp but ${Math.abs(delta)} gp are needed. Nothing was deducted — let the player negotiate, drop the price, or refuse the sale.`,
                        };
                    }
                    // Clamp so a debit can't drive the purse negative.
                    const after = Math.max(0, Math.round((before + delta) * 100) / 100);
                    char.gold = after;
                    d.syncCharacterUpdate(char);
                    const reason = typeof args.reason === 'string' && args.reason.trim() ? ` (${args.reason.trim()})` : '';
                    campaignEventLog.append('JOURNAL_UPDATED', `Gold ${delta > 0 ? '+' : ''}${delta} → ${after} po${reason}`, { before, delta, after });
                    // Trame : seuls les mouvements d'or significatifs (≥ 25 po).
                    if (Math.abs(delta) >= 25) {
                        appendCampaignLog('gold', `Gold ${delta > 0 ? '+' : ''}${delta} gp${reason} (purse: ${after})`);
                    }
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${delta > 0 ? '+' : ''}${delta} po${reason} — bourse : ${after} po]*` }]);
                    return { success: true, gold: after, delta };
                }

                case 'open_shop': {
                    // NF3 — ouvre le panneau de commerce côté joueur, stock
                    // construit par type de marchand + niveau du groupe.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const merchantName = stringArg(args.merchantName || args.name, 80) || 'Marchand';
                    const merchantType = normalizeMerchantType(String(args.merchantType || args.type || merchantName));
                    const shopLang = useGameStore.getState().language === 'fr' ? 'fr' : 'en';
                    const stock = buildMerchantStock(merchantType, store.character.level || 1, shopLang);
                    // Articles SIGNATURE demandés par le MJ (noms exacts du catalogue).
                    for (const rawName of stringListArg(args.extraItems).slice(0, 6)) {
                        const def = getMagicItemByName(rawName);
                        if (def) {
                            stock.unshift({
                                item: { ...magicItemToInventoryItem(def, shopLang), id: crypto.randomUUID() },
                                price: Math.max(25, def.value),
                            });
                        }
                    }
                    // UI4 (contre-audit) — plancher à 0.5 : la revente étant fixe à 50 % de la
                    // valeur catalogue, tout modificateur < 0.5 ouvrait une boucle d'or infinie
                    // (acheter ×0.25, revendre ×0.5, stock de consommables inépuisable).
                    const priceModifier = Math.min(3, Math.max(0.5, Number(args.priceModifier) || 1));
                    store.setActiveShop({
                        merchantName,
                        merchantType,
                        priceModifier,
                        greeting: stringArg(args.greeting, 200) || undefined,
                        stock,
                    });
                    // Le journal ne montre que les PNJ RENCONTRÉS (fiche datée
                    // par lastSeenAt). Les marchands de campagne y sont semés à
                    // la création : commercer avec l'un d'eux est une rencontre,
                    // il doit apparaître — sinon il resterait invisible pour
                    // toujours, `open_shop` ne touchant pas le journal.
                    await syncJournal((prev: any) => {
                        const known = (prev.npcs || []).find((n: any) => foldText(n.name) === foldText(merchantName));
                        return {
                            ...prev,
                            npcs: known
                                ? (prev.npcs || []).map((n: any) => n.id === known.id ? { ...n, lastSeenAt: Date.now() } : n)
                                : [...(prev.npcs || []), {
                                    id: crypto.randomUUID(),
                                    name: merchantName,
                                    description: merchantType,
                                    location: '',
                                    disposition: 0,
                                    knownFacts: [],
                                    lastSeenAt: Date.now(),
                                    createdAt: new Date().toISOString(),
                                }],
                        };
                    });
                    campaignEventLog.append('JOURNAL_UPDATED', `Shop opened: ${merchantName} (${merchantType})`, { merchantType, priceModifier, stockSize: stock.length });
                    return {
                        success: true,
                        merchantName,
                        merchantType,
                        priceModifier,
                        stockSize: stock.length,
                        instruction: 'The trading panel is now OPEN on the player screen. Narrate the merchant in one short beat; each purchase/sale will reach you as a [SYSTEM] report — never re-apply gold or items yourself. Call close_shop when the player leaves.',
                    };
                }

                case 'close_shop': {
                    useGameStore.getState().setActiveShop(null);
                    return { success: true, instruction: 'Trading panel closed.' };
                }

                case 'roll_loot': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const rarityHint = stringArg(args.rarityHint, 30).toLowerCase() as MagicItemRarity;
                    const validRarities: MagicItemRarity[] = ['common', 'uncommon', 'rare', 'very rare', 'legendary'];
                    // A rarityHint pins a single milestone reward of that rarity; otherwise
                    // roll 1-3 items on the level-appropriate treasure table.
                    let defs = validRarities.includes(rarityHint)
                        ? [pickMagicItem(rarityHint, undefined, store.character.level + 2)].filter(Boolean) as NonNullable<ReturnType<typeof pickMagicItem>>[]
                        : rollLootTable(store.character.level);
                    if (!defs.length) defs = rollLootTable(store.character.level);
                    if (!defs.length) return { success: false, error: 'No loot table entry available' };

                    const lang = useGameStore.getState().language === 'fr' ? 'fr' : 'en';
                    const char = { ...store.character };
                    const nextInventory = (char.inventory || []).map(i => ({ ...i }));
                    const awarded = defs.map(def => {
                        const item = { ...magicItemToInventoryItem(def, lang), id: crypto.randomUUID() };
                        nextInventory.push(item);
                        return {
                            name: item.name,
                            rarity: def.rarity,
                            description: lang === 'fr' ? def.descriptionFr : def.description,
                            effects: def.effects,
                            attunement: def.attunement || false,
                        };
                    });
                    char.inventory = nextInventory;
                    d.syncCharacterUpdate(char);
                    campaignEventLog.append('ITEM_ADDED', `Loot rolled: ${awarded.map(a => a.name).join(', ')}`, { context: stringArg(args.context, 160), awarded });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Loot — ${awarded.map(a => `${a.name} (${a.rarity})`).join(', ')} added to inventory]*` }]);
                    return {
                        success: true,
                        loot: awarded,
                        instruction: 'These EXACT items are now in the player inventory. Narrate their discovery vividly (appearance, aura, where they lie) using the descriptions provided. Do not rename them and do not add extra items.',
                    };
                }

                case 'lookup_campaign': {
                    const m: any = store.adventureManifestData;
                    if (!m) return { found: false, error: 'Aucune campagne structurée chargée pour cette partie.' };
                    const q = String(args.query || '').trim();
                    if (!q) return { found: false, error: 'query requise' };
                    const kind = String(args.kind || '').toLowerCase().trim();

                    // Accent/inflection-tolerant scoring instead of raw substring: French
                    // queries ("Cairn de Givre" vs "cairn givré", "Séraphine" vs
                    // "Seraphine") kept missing authored content, so the DM invented it.
                    const norm = foldText;
                    const STOPWORDS = new Set(['les', 'des', 'the', 'and', 'une', 'aux', 'qui', 'que', 'est', 'pour', 'dans', 'avec', 'sur']);
                    const qNorm = norm(q);
                    const qTokens = qNorm.split(/[^a-z0-9]+/)
                        .filter(t => t.length >= 3 && !STOPWORDS.has(t))
                        // Light stemming: drop the last char of longer tokens so
                        // "givre"/"givré(e)" and singular/plural forms co-match.
                        .map(t => t.length >= 5 ? t.slice(0, -1) : t);
                    const scoreOf = (text: string): number => {
                        const t = norm(text);
                        if (qNorm.length >= 3 && t.includes(qNorm)) return 1;
                        if (!qTokens.length) return 0;
                        const hits = qTokens.filter(tok => t.includes(tok)).length;
                        return hits / qTokens.length;
                    };
                    const results: { type: string; title: string; text: string; score: number }[] = [];
                    const consider = (type: string, title: string, text: string, haystack: string) => {
                        const score = scoreOf(haystack);
                        if (score >= 0.5) results.push({ type, title, text, score });
                    };

                    if (!kind || kind === 'npc') {
                        for (const c of (m.supportingCast || [])) {
                            consider('npc', c.name,
                                `${c.role} @ ${c.location || '?'} — ${c.description}${c.personality ? ` | Voix : ${c.personality}` : ''}`,
                                `${c.name} ${c.role} ${c.description} ${c.personality || ''} ${c.location || ''}`);
                        }
                    }
                    // NF3 — marchands principaux générés avec l'histoire.
                    if (!kind || kind === 'npc' || kind === 'merchant') {
                        for (const km of ((m.keyMerchants || []) as any[])) {
                            consider('merchant', km.name,
                                `${km.type} @ ${km.location || '?'} — ${km.personality || ''}${km.questHook ? ` | Quête : ${km.questHook}` : ''}${km.questReward ? ` | Récompense : ${km.questReward}` : ''} (use open_shop("${km.name}", "${km.type}") when visited)`,
                                `${km.name} ${km.type} marchand merchant boutique shop ${km.location || ''} ${km.personality || ''} ${km.questHook || ''} ${km.questReward || ''}`);
                        }
                    }
                    for (const ch of (m.chapters || [])) {
                        if (!kind || kind === 'chapter') {
                            consider('chapter', `Ch${ch.id} — ${ch.title}`,
                                `Objectif : ${ch.objective || '?'}${ch.cliffhanger ? ` | Tension : ${ch.cliffhanger}` : ''}`,
                                `${ch.id} ${ch.title} ${ch.objective || ''} ${ch.cliffhanger || ''}`);
                        }
                        if (!kind || kind === 'scene' || kind === 'location') {
                            for (const s of (ch.scenes || [])) {
                                consider('scene', `${s.title} (${s.location || '?'})`, s.description,
                                    `${s.id} ${s.title} ${s.description} ${s.location || ''}`);
                            }
                        }
                        // Audit 2026-08-21 — les rencontres ÉCRITES (difficulté +
                        // monstres prévus) étaient chargées puis jamais lues : le
                        // MJ improvisait ses spawns sans voir le calibrage voulu.
                        // A6 — les choix branchés sont aussi CONSULTABLES : le
                        // bloc n'en sert que ceux du chapitre courant, or le MJ
                        // peut vouloir vérifier ce qu'un choix passé engageait.
                        if (!kind || kind === 'choice') {
                            for (const b of ((ch.branchingChoices || []) as any[])) {
                                consider('choice', `Ch${ch.id} — ${String(b.decision || '').slice(0, 60)}`,
                                    `A: ${b.optionA} | B: ${b.optionB}${b.consequence ? ` — ${b.consequence}` : ''}`,
                                    `${ch.id} ${b.decision || ''} ${b.optionA || ''} ${b.optionB || ''} ${b.consequence || ''} choix choice decision branche`);
                            }
                        }
                        if (!kind || kind === 'encounter' || kind === 'combat') {
                            for (const enc of ((ch.encounters || []) as any[])) {
                                if (enc.type && enc.type !== 'combat' && kind === 'combat') continue;
                                consider('encounter', `Ch${ch.id} — ${enc.type || 'combat'} (${enc.difficulty || 'medium'})`,
                                    `${enc.description}${enc.monsters?.length ? ` | Monstres prévus : ${enc.monsters.join(', ')}` : ''}${enc.reward ? ` | Récompense : ${enc.reward}` : ''} — size it with add_enemy_init at THIS difficulty for the party's level`,
                                    `${enc.type || ''} ${enc.difficulty || ''} ${enc.description || ''} ${(enc.monsters || []).join(' ')} rencontre encounter combat bataille fight`);
                            }
                        }
                    }
                    if (!kind || kind === 'reward') {
                        for (const r of (m.rewardTable || [])) {
                            consider('reward', r.item, `${r.trigger} — ${r.description || ''}`,
                                `${r.item} ${r.trigger} ${r.description || ''}`);
                        }
                    }
                    // MÉMOIRE VIVE (2026-08-22) : faits canon, secrets et PNJ du
                    // runtime — le contexte n'en montre que 14, le reste était
                    // hors d'atteinte. Pas de nouvel outil : un `kind` de plus
                    // sur un réflexe que le MJ a déjà.
                    if (!kind || kind === 'memory') {
                        const rt = useGameStore.getState().campaignRuntime;
                        for (const fact of (rt.canonFacts || [])) {
                            consider('memory', 'Fait établi', fact, fact);
                        }
                        // C1 — le verrou voyage AVEC le secret : le remonter nu
                        // par lookup_campaign contournait l'étiquetage du bloc
                        // directeur, et c'est justement là que le MJ va chercher
                        // ce qu'il ne voit plus dans sa fenêtre.
                        const chapterNow = currentChapterNumber(m, rt);
                        for (const secret of (rt.protectedSecrets || [])) {
                            const lock = secretLockLabel(secret, chapterNow);
                            consider('memory', `Secret (DM-ONLY)${lock}`, `${secret}${lock}`, secret);
                        }
                        for (const npc of (useGameStore.getState().journal.npcs || []) as any[]) {
                            const facts = (npc.knownFacts || []).join(' | ');
                            consider('memory', `PNJ ${npc.name}`,
                                `${npc.description || ''}${npc.location ? ` @ ${npc.location}` : ''}${facts ? ` — ${facts}` : ''}`,
                                `${npc.name} ${npc.description || ''} ${npc.location || ''} ${facts}`);
                        }
                    }
                    // MÉCHANT : jamais fouillé jusqu'ici. Le SECRET n'est rendu
                    // que sur kind:'villain' EXPLICITE — une recherche par nom
                    // en pleine scène ne doit pas le déterrer par accident.
                    if (!kind || kind === 'villain') {
                        const v: any = m.villain || {};
                        if (v.name) {
                            const weaknesses = Array.isArray(v.weaknesses) ? v.weaknesses.join(' ; ') : '';
                            consider('villain', v.name,
                                `${v.archetype || ''}${v.motivation ? ` — ${v.motivation}` : ''}`
                                + `${v.escalationArc ? ` | Escalade : ${v.escalationArc}` : ''}`
                                + `${weaknesses ? ` | Faiblesses : ${weaknesses}` : ''}`
                                + `${kind === 'villain' && v.secret ? ` | SECRET (DM-ONLY) : ${v.secret}` : ''}`,
                                `${v.name} ${v.archetype || ''} ${v.motivation || ''} ${v.escalationArc || ''} ${weaknesses} mechant villain boss antagoniste`);
                        }
                    }
                    if ((!kind || kind === 'lore') && typeof m.fullManifesto === 'string') {
                        for (const sec of m.fullManifesto.split(/\n##\s+/)) {
                            const title = sec.split('\n')[0].replace(/^#+\s*/, '').slice(0, 70);
                            consider('lore', title, sec.slice(0, 700), sec);
                        }
                    }
                    const trimmed = results
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 6)
                        .map(({ score, ...rest }) => rest);
                    return {
                        found: trimmed.length > 0,
                        count: trimmed.length,
                        results: trimmed,
                        ...(trimmed.length === 0 ? { hint: 'No authored content matched. Try fewer/other keywords (a single distinctive name works best). If nothing matches, improvise consistently with the director context and commit durable outcomes via update_campaign_runtime.' } : {}),
                    };
                }

                case 'start_combat': {
                    const character = store.character;
                    if (!character) return { success: false, error: 'No character loaded' };
                    // GARDE PAR ÉTAT (audit 2026-08-24, B4). Trace du 23/08 à
                    // 20:09:32-35 : deux start_combat à une seconde d'intervalle,
                    // puis six add_enemy_init répétés — le roster est passé à
                    // douze gobelins et deux Trenn, chaque tour ennemi a été joué
                    // deux fois, et la victoire a payé 600 XP au lieu de 300.
                    // startEncounter conserve le roster quand le combat est actif
                    // (chemin du rechargement de sauvegarde, voulu et testé) : ce
                    // n'est donc pas au moteur de refuser, c'est ici.
                    if (encounterAlreadyRunning(store.combatState)) {
                        return {
                            success: false,
                            alreadyRunning: true,
                            error: 'A combat is ALREADY running — do NOT call start_combat again (it would duplicate the roster and the XP). To bring in more foes, call add_enemy_init on the current fight; to close it, call end_combat.',
                        };
                    }
                    const state = startEncounter(character, store.combatState);
                    store.setCombatState(state);
                    store.clearCombatRolls();
                    campaignEventLog.append('ENCOUNTER_STARTED', 'Combat started', state);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Started]*` }]);

                    logNewPlayerInitiative(false, character, state);

                    if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
                    scheduleCombatImageOnce('hostile forces', store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
                    return { success: true };
                }

                case 'end_combat': {
                    // Idempotency guard: maybeEndCombat (GameSession) may have already
                    // auto-resolved victory + granted XP. If combat is no longer active,
                    // narrate but do NOT grant XP again (was a double-grant / level-up dupe).
                    if (!store.combatState.isActive) {
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine('Combat déjà terminé', 'Combat already over')}]*` }]);
                        return { success: true, xpAwarded: 0 };
                    }
                    // ENEMIES only — allies (companion, rescued NPCs) are !isPlayer
                    // too and must not inflate the XP clamp base.
                    const enemyNames = store.combatState.combatants.filter(c => combatantSide(c) === 'enemy').map(c => c.name);
                    const xpAwarded = sanitizeXPGrant(Number(args.xpAwarded || args.xpAmount || 0), enemyNames);
                    const rosterAtEnd = store.combatState.combatants;
                    store.setCombatState((prev: any) => ({ ...prev, isActive: false, combatants: [], currentTurn: '', enemyIntents: {} }));
                    if (xpAwarded) {
                        d.grantXP(xpAwarded, "Combat victory");
                    }
                    // Persist ALL persistent allies' HP (Beast Master wolf + recruited
                    // companions) — after the XP grant so we build on the freshest char.
                    {
                        const freshChar = useGameStore.getState().character;
                        if (freshChar) {
                            const synced = syncCompanionsFromState(freshChar, rosterAtEnd);
                            if (synced !== freshChar) d.syncCharacterUpdate(synced);
                        }
                    }
                    campaignEventLog.append('ENCOUNTER_ENDED', `Combat ended. Awarded ${xpAwarded} XP`, { xpAwarded, enemyNames });
                    // Chronique de trame — cette porte de sortie (fin narrée par le
                    // MJ : fuite du joueur, reddition, négociation) doit AUSSI écrire
                    // la ligne combat et vider le chroniqueur, sinon le combat
                    // suivant hérite de PV de départ faux.
                    try {
                        const chron = combatChronicle.take();
                        const hero = useGameStore.getState().character;
                        appendCampaignLog('combat', formatCombatChronicleLine({
                            heroName: hero?.name || 'Hero',
                            hpCurrent: hero?.hp.current ?? 0,
                            hpMax: hero?.hp.max ?? 0,
                            hpStart: chron.active ? chron.hpStart : null,
                            foes: describeCombatFoes(rosterAtEnd as any),
                            xp: xpAwarded,
                            custom: chron.custom,
                            outcome: 'narrative',
                        }));
                    } catch { /* la chronique ne casse jamais la fin de combat */ }
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Ended. Awarded ${xpAwarded} XP]*` }]);
                    if (d.musicDirector) d.musicDirector.handleMusicTag('exploration');
                    // Aftermath image: illustrate the resolution of the battle.
                    {
                        const where = store.journal.locations?.slice(-1)?.[0]?.name || 'the battlefield';
                        scheduleSceneImage(
                            buildSceneImagePrompt(`the aftermath of a battle at ${where}: fallen foes, drifting smoke and dust, the victor catching their breath, dramatic low light`, scenePromptOptions()),
                            { kind: 'moment_image', phase: 'aftermath', summary: 'Combat aftermath image' }
                        );
                    }
                    return { success: true, xpAwarded };
                }

                case 'add_enemy_init': {
                    // État FRAIS : un handler précédent encore en vol (dés 4 s, jet
                    // retenu 90 s) peut avoir modifié le combat depuis le snapshot.
                    const live = useGameStore.getState();
                    const character = live.character;
                    const baseState = character ? startEncounter(character, live.combatState) : { ...live.combatState, isActive: true };
                    const hadPlayerBefore = live.combatState.combatants.some((c: any) => c.isPlayer);

                    // GARDE-FOU DE DIFFICULTÉ (audit 2026-08-21) : budget XP SRD
                    // cumulé sur les ennemis VIVANTS + le nouveau venu. Sans lui,
                    // rien ne bornait les spawns — un mage niv 1 recevait 4 loups
                    // (400 XP ajustés contre un seuil « mortel » de 100). Au-delà
                    // de mortel +25 %, l'outil REFUSE avec la marge restante ;
                    // force=true réservé aux set-pieces scriptés par la campagne.
                    const xpOfEnemy = (name: string, hp?: number): number => {
                        const c = getCreature(name);
                        if (c?.xp && c.xp > 0) return c.xp;
                        // Homebrew hors bestiaire : ~6 XP par PV (loup 11 PV ≈ 66
                        // pour 50 réels), plancher 25.
                        return Math.max(25, Math.round((hp && hp > 0 ? hp : 15) * 6));
                    };
                    const livingEnemyXPs = baseState.combatants
                        .filter((c: any) => !c.isPlayer && c.hp.current > 0 && (c.side ? c.side === 'enemy' : true))
                        .map((c: any) => xpOfEnemy(c.name, c.hp?.max));
                    const partySize = 1 + baseState.combatants.filter((c: any) => !c.isPlayer && c.hp.current > 0 && c.side === 'ally').length;
                    const newcomerXP = xpOfEnemy(String(args.name || ''), Number(args.hp) || undefined);
                    const currentPressure = assessEncounterPressure(livingEnemyXPs, character?.level || 1, partySize);
                    const projectedPressure = assessEncounterPressure([...livingEnemyXPs, newcomerXP], character?.level || 1, partySize);
                    if (projectedPressure.overCap && args.force !== true) {
                        const headroom = Math.max(0, Math.floor(projectedPressure.cap / projectedPressure.multiplier) - currentPressure.baseXP);
                        return {
                            success: false,
                            error: `ENCOUNTER OVER BUDGET — do NOT add "${args.name}". The fight is at ${currentPressure.adjustedXP} adjusted XP and this creature (~${newcomerXP} XP) would push it to ${projectedPressure.adjustedXP}, past the ${projectedPressure.cap} XP cap (SRD deadly threshold ${projectedPressure.deadlyBudget} +25%) for a level ${character?.level || 1} party of ${partySize}. Options: fewer/weaker creatures (headroom ≈ ${headroom} base XP), send reinforcements only AFTER enemies fall, or keep the extras as narrative pressure (they circle, they wait). Only if the CAMPAIGN explicitly scripts this fight as an intended set-piece, retry with force=true.`,
                        };
                    }

                    // OU3 — le niveau du groupe alimente le défaut de PV des
                    // ennemis homebrew (hp omis ≠ 1 PV).
                    const { state, combatant } = addEnemyToEncounter(baseState, { ...args, partyLevel: character?.level });
                    store.setCombatState(state);
                    campaignEventLog.append('COMBATANT_ADDED', `Added ${combatant.name} to initiative`, combatant);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Added ${combatant.name} to Initiative (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);

                    logNewPlayerInitiative(hadPlayerBefore, character, state);

                    // Log enemy initiative to DiceTray
                    const creature = getCreature(combatant.name);
                    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
                    logInitiativeRoll(combatant.name, combatant.initiative, dexMod, true);

                    scheduleCombatImageOnce(combatant.name, live.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
                    // Jauge remontée au MJ dès que la rencontre passe « mortel » —
                    // il calibre la suite (pas de renfort, issue de repli...).
                    const pressureWarning = projectedPressure.adjustedXP > projectedPressure.deadlyBudget
                        ? `CAUTION: the encounter is now DEADLY-tier (${projectedPressure.adjustedXP}/${projectedPressure.deadlyBudget} adjusted XP for this party). No more reinforcements; keep escape and clever play viable.`
                        : undefined;
                    return { success: true, initiative: combatant.initiative, combatant, ...(pressureWarning ? { warning: pressureWarning } : {}) };
                }

                case 'add_ally_init': {
                    const live = useGameStore.getState();
                    const character = live.character;
                    const baseState = character ? startEncounter(character, live.combatState) : { ...live.combatState, isActive: true };
                    const hadPlayerBefore = live.combatState.combatants.some((c: any) => c.isPlayer);

                    const { state, combatant } = addAllyToEncounter(baseState, args, character?.level || 1);
                    store.setCombatState(state);
                    campaignEventLog.append('COMBATANT_ADDED', `Added ally ${combatant.name} to initiative`, combatant);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${combatant.name} joined as an ALLY (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);

                    logNewPlayerInitiative(hadPlayerBefore, character, state);

                    const creature = getCreature(combatant.name);
                    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
                    logInitiativeRoll(`${combatant.name} (ally)`, combatant.initiative, dexMod, true);

                    return { success: true, initiative: combatant.initiative, combatant };
                }

                case 'update_character_hp': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const nextHp = Number(args.hp);
                    if (!Number.isFinite(nextHp)) return { success: false, error: 'Invalid hp value' };
                    const char = applyCharacterHP(store.character, nextHp);
                    const diff = char.hp.current - store.character.hp.current;
                    if (store.combatState.isActive) {
                        store.setCombatState((prev: any) => ({
                            ...prev,
                            combatants: prev.combatants.map((c: any) =>
                                c.isPlayer ? { ...c, hp: { current: char.hp.current, max: char.hp.max } } : c
                            )
                        }));
                    }
                    d.syncCharacterUpdate(char);
                    if (diff < 0) {
                        d.syncCharacterCritical(char, `Took ${Math.abs(diff)} damage`);
                    }
                    campaignEventLog.append('HP_CHANGED', `${char.name} HP is now ${char.hp.current}/${char.hp.max}`, {
                        target: char.name,
                        hp: char.hp,
                        delta: diff,
                    });
                    return { success: true, current_hp: char.hp.current };
                }

                case 'update_enemy_hp': {
                    const enemyHp = Number(args.hp);
                    if (!Number.isFinite(enemyHp)) return { success: false, error: 'Invalid hp value' };
                    const { state, found, enemy, ambiguous } = updateEnemyHP(store.combatState, String(args.id || args.name), enemyHp);
                    if (found && enemy) {
                        store.setCombatState(state);
                        campaignEventLog.append('HP_CHANGED', `${enemy.name} HP is now ${enemy.hp.current}/${enemy.hp.max}`, {
                            target: enemy.name,
                            targetId: enemy.id,
                            hp: enemy.hp,
                        });
                        return { success: true, current_hp: enemy.hp.current, is_dead: enemy.hp.current <= 0, targetId: enemy.id };
                    }
                    if (ambiguous) return { success: false, error: "Ambiguous enemy name. Use the combatant id from the combat tracker/tool result." };
                    return { success: false, error: "Enemy not found or already dead" };
                }

                case 'set_enemy_target': {
                    // Hybrid targeting: record an MJ standing intent (enemy id -> hero id).
                    // Validate both ends so a bad reference can't poison the turn loop;
                    // runNPCTurn re-validates each turn and falls back to wounded-prey.
                    const enemyRef = resolveCombatantReference(store.combatState, String(args.enemy), { enemyOnly: true, livingOnly: true });
                    if (!enemyRef.combatant || enemyRef.ambiguous) {
                        return { success: false, error: enemyRef.ambiguous ? 'Ambiguous enemy. Use combatant id.' : 'Enemy not found' };
                    }
                    const targetRef = resolveCombatantReference(store.combatState, String(args.target), { livingOnly: true });
                    const targetIsHero = targetRef.combatant && (targetRef.combatant.side ? targetRef.combatant.side !== 'enemy' : targetRef.combatant.isPlayer);
                    if (!targetRef.combatant || targetRef.ambiguous || !targetIsHero) {
                        return { success: false, error: targetRef.ambiguous ? 'Ambiguous target. Use combatant id.' : 'Target must be the player or an ally.' };
                    }
                    store.setCombatState((prev: any) => ({
                        ...prev,
                        enemyIntents: { ...(prev.enemyIntents || {}), [enemyRef.combatant!.id]: targetRef.combatant!.id },
                    }));
                    campaignEventLog.append('COMBAT_TURN_ADVANCED', `${enemyRef.combatant.name} now focuses ${targetRef.combatant.name}`, {
                        enemy: enemyRef.combatant.id,
                        target: targetRef.combatant.id,
                    });
                    return { success: true, enemy: enemyRef.combatant.name, target: targetRef.combatant.name };
                }

                case 'resolve_attack': {
                    // Anti double-resolution guard: during a TRACKED combat the
                    // engine itself resolves every ENEMY action (runNPCTurn) and
                    // only asks the DM to NARRATE. The old guard checked
                    // isNPCTurn — but the "narrate the enemy turn" report goes
                    // out AFTER the engine advanced to the player's turn, so a
                    // disobedient re-resolution slipped through exactly in the
                    // common single-enemy case (double damage, and the player's
                    // own Bless/inspiration boosting the attack that hit them).
                    const atkRef = resolveCombatantReference(store.combatState, String(args.attacker), { autoResolve: true });
                    const atkSide = atkRef.combatant ? combatantSide(atkRef.combatant) : 'enemy';
                    if (store.combatState.isActive && atkSide === 'enemy') {
                        return { success: true, narrateOnly: true, note: 'Enemy actions are resolved by the engine on their own turns — narrate only, never re-resolve. For scripted out-of-turn harm use environmental_damage or apply_damage.' };
                    }
                    const baseAttackBonus = Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : undefined;
                    const attackPrompt = normalizeRollPrompt({
                        reason: `${args.attacker} attacks ${args.target}`,
                        formula: `1d20${(baseAttackBonus || 0) >= 0 ? '+' : ''}${baseAttackBonus || 0}`,
                        dc: 10,
                        advantage: args.advantage,
                    });
                    // Story modifiers are the PLAYER's boons — only their own
                    // attacks may consume them (an ally's or scripted attack
                    // must not eat the hero's inspiration).
                    const modifierApplication = atkRef.combatant?.isPlayer
                        ? applyStoryModifiersToPrompt(attackPrompt, store.character?.storyModifiers || [])
                        : { prompt: attackPrompt, applied: [] as any[], remaining: store.character?.storyModifiers || [] };
                    if (store.character && modifierApplication.applied.length) {
                        d.syncCharacterCritical({
                            ...store.character,
                            storyModifiers: modifierApplication.remaining,
                        }, 'hp');
                        campaignEventLog.append('ROLL_REQUESTED', `Story modifier applied to attack: ${args.attacker} vs ${args.target}`, {
                            applied: modifierApplication.applied,
                            remaining: modifierApplication.remaining,
                        });
                    }
                    // Attaque VOCALE du joueur : consommer un PIP vert (comme un clic)
                    // au lieu du booléen 'action' — sinon le HUD et l'Extra Attack se
                    // désynchronisaient dès que le joueur attaquait à la voix.
                    const isPlayerAttacker = Boolean(atkRef.combatant?.isPlayer);
                    // GARDE ANTI-CONTOURNEMENT (audit 2026-08-21, même patron que
                    // propose_player_action) : un VRAI sort du grimoire « résolu en
                    // attaque » court-circuitait emplacements, concentration et DD
                    // réel — resolve_attack acceptait n'importe quel damageFormula.
                    if (isPlayerAttacker && args.attackName) {
                        const liveChar = useGameStore.getState().character;
                        const ownSpells = [
                            ...(liveChar?.cantrips || []),
                            ...(liveChar?.knownSpells || []),
                            ...(liveChar?.preparedSpells || []),
                        ];
                        const wantedAtk = foldText(String(args.attackName));
                        const codexSpell = lookupSpell(String(args.attackName));
                        const spellMatch = ownSpells.find(s => foldText(s) === wantedAtk)
                            || (codexSpell && ownSpells.find(s => foldText(s) === foldText(codexSpell.name)) ? codexSpell.name : undefined);
                        if (spellMatch) {
                            return {
                                success: false,
                                error: `"${args.attackName}" is a REAL spell in the player's spellbook. Do NOT resolve it as a weapon attack — call cast_spell (slots, concentration and the real save DC apply).`,
                            };
                        }
                    }
                    if (isPlayerAttacker && store.combatState.isActive) {
                        const econ: any = store.combatState.actionEconomy?.['player'] || {};
                        const attacksMax = econ.attacksMax ?? 1;
                        const attacksUsed = econ.attacksUsed ?? 0;
                        if (attacksUsed >= attacksMax) {
                            return { success: false, error: 'No attack left this turn — the player already spent their action. They can end their turn with the on-screen button.' };
                        }
                    }
                    // Attaque à la VOIX avec une arme NOMMÉE (« je tire à l'arc ») :
                    // si le nom matche une arme ÉQUIPÉE (slot distance compris), le
                    // moteur juge cette arme-là — sinon l'arc était traité comme
                    // l'épée de la main directrice (mêlée, mauvais bonus, engage).
                    let attackCharacter = store.character || undefined;
                    if (isPlayerAttacker && store.character && args.attackName) {
                        const awNorm = foldText;
                        const wanted = awNorm(String(args.attackName));
                        const match = (store.character.inventory || []).find(i =>
                            i.type === 'weapon' && i.equipped
                            && (awNorm(i.name).includes(wanted) || wanted.includes(awNorm(i.name))));
                        if (match) {
                            const structured = structureInventoryItem(match);
                            const props = structured.properties || match.properties || [];
                            const isRangedW = Boolean(structured.range || match.range)
                                || /bow|crossbow|sling|\barc\b|arbal[eè]te|fronde/i.test(match.name);
                            attackCharacter = {
                                ...store.character,
                                weapon: {
                                    name: match.name,
                                    damage: structured.damageDice || match.damageDice || '1d4',
                                    damageType: String(structured.damageType || match.damageType || 'bludgeoning'),
                                    abilityMod: isRangedW ? 'DEX' : 'STR',
                                    attackBonus: 0,
                                    magicBonus: 0,
                                    properties: props,
                                    range: structured.range || match.range,
                                    reach: isRangedW ? 30 : 5,
                                } as any,
                            };
                        }
                    }
                    const result = resolveAttackAction(store.combatState, {
                        attacker: String(args.attacker),
                        target: String(args.target),
                        attackName: args.attackName ? String(args.attackName) : undefined,
                        attackBonus: baseAttackBonus,
                        // OU4 — le dmBonus des story modifiers (déjà consommés et
                        // persistés ci-dessus) passe par un canal séparé : il
                        // s'applique AUSSI quand attackBonus est omis et que le
                        // moteur calcule lui-même le bonus (le cas recommandé).
                        flatBonusModifier: modifierApplication.prompt.dmBonus || 0,
                        damageFormula: args.damageFormula,
                        damageType: args.damageType,
                        advantage: modifierApplication.prompt.advantage,
                        targetCoverBonus: Number.isFinite(Number(args.targetCoverBonus ?? args.coverBonus)) ? Number(args.targetCoverBonus ?? args.coverBonus) : undefined,
                        isMeleeAttack: optionalBoolean(args.isMeleeAttack),
                        consumeAction: !isPlayerAttacker,
                    }, attackCharacter);

                    if (result.success && (result as any).advanced) {
                        // Trop loin pour la mêlée : l'attaque est devenue un
                        // rapprochement (far → near). Pip/action déjà consommé.
                        store.setCombatState(result.state);
                        if (isPlayerAttacker) {
                            const econ: any = result.state.actionEconomy?.['player'] || {};
                            const nextUsed = (econ.attacksUsed ?? 0) + 1;
                            store.setCombatState({
                                ...result.state,
                                actionEconomy: {
                                    ...(result.state.actionEconomy || {}),
                                    player: { ...econ, attacksUsed: nextUsed, actionUsed: nextUsed >= (econ.attacksMax ?? 1) },
                                },
                            });
                        }
                        const adv = (result as any).advanced;
                        const advLine = useGameStore.getState().language !== 'en'
                            ? `${adv.name} se rapproche (loin → proche).`
                            : `${adv.name} closes the distance (far → near).`;
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${advLine}]*` }]);
                        return {
                            success: true,
                            advanced: adv,
                            instruction: `${adv.name} was too far for melee and CLOSED THE DISTANCE instead (${adv.from} → ${adv.to}). No attack roll happened — narrate the advance; the strike can land next action.`,
                        };
                    }
                    if (!result.success || !result.resolution) {
                        return { success: false, error: result.error || 'Attack failed' };
                    }
                    if (isPlayerAttacker && store.combatState.isActive) {
                        // Dépense le pip sur l'état FRAIS résolu (mêmes booléens dérivés
                        // que patchPlayerEconomy côté UI).
                        const econ: any = result.state.actionEconomy?.['player'] || {};
                        const nextUsed = (econ.attacksUsed ?? 0) + 1;
                        const nextEcon = {
                            ...econ,
                            attacksUsed: nextUsed,
                            actionUsed: nextUsed >= (econ.attacksMax ?? 1),
                            bonusActionUsed: (econ.bonusUsed ?? 0) >= (econ.bonusMax ?? 1),
                        };
                        result.state = { ...result.state, actionEconomy: { ...(result.state.actionEconomy || {}), player: nextEcon } };
                    }

                    // Commit AVANT les animations de dés : plus aucune écriture
                    // d'état de combat après un await dans ce handler (un tour de
                    // PNJ concurrent pendant les ~8-12 s d'animation était écrasé).
                    store.setCombatState(result.state);

                    const isPlayer = Boolean(result.state.combatants.find(c => c.name === result.resolution?.attacker || c.id === args.attacker)?.isPlayer);

                    // Show the visual roll for the attack
                    store.setCurrentRoll({
                        result: result.resolution.attackRoll.total,
                        reason: `${result.resolution.attacker} attack vs ${result.resolution.target}: ${result.resolution.hit ? 'HIT!' : 'MISS'}`,
                        isDM: !isPlayer,
                        success: result.resolution.hit
                    });

                    // Log attack to DiceTray
                    deps.diceTrayRef.current?.addLog({
                        type: 'attack',
                        name: `${result.resolution.attacker}: ${args.attackName || 'Attack'}`,
                        total: result.resolution.attackRoll.total,
                        formula: `d20 (${result.resolution.attackRoll.die}) + ${result.resolution.attackRoll.modifier} = ${result.resolution.attackRoll.total} vs AC ${result.resolution.attackRoll.prompt.dc}`,
                        isDM: !isPlayer,
                        success: result.resolution.hit
                    });

                    // Wait 4 seconds for the attack roll animation to finish
                    await waitDice();

                    if (result.resolution.hit && result.resolution.damage > 0) {
                        // Show the visual roll for the damage
                        store.setCurrentRoll({
                            result: result.resolution.damage,
                            reason: `${result.resolution.attacker} damage roll: ${result.resolution.damage} ${result.resolution.damageType}`,
                            isDM: !isPlayer
                        });

                        // Log damage to DiceTray — parts élémentaires séparées
                        // (« 8 slashing + 4 fire = 12 »), résistances visibles.
                        deps.diceTrayRef.current?.addLog({
                            type: 'damage',
                            name: `${result.resolution.attacker}: ${args.attackName || 'Attack'} damage`,
                            total: result.resolution.damage,
                            formula: formatDamageParts(result.resolution),
                            isDM: !isPlayer
                        });

                        // Wait another 4 seconds for the damage roll animation
                        await waitDice();
                    }

                    // --- MORALE CHECK FOR DAMAGED NPC --- (helper partagé, état frais)
                    const morale = await runMoraleCheck(String(args.target));

                    const playerTarget = morale.state.combatants.find((c: any) => c.isPlayer && (c.name === result.resolution!.target || c.id === result.resolution!.target));
                    // ou-m9 — fiche FRAÎCHE : les animations de dés (~8-12 s)
                    // rendent le snapshot `store` du début du handler périmé —
                    // un tour de PNJ concurrent aurait été écrasé.
                    const liveCharAfterDice = useGameStore.getState().character;
                    if (playerTarget && liveCharAfterDice) {
                        let char = {
                            ...liveCharAfterDice,
                            tempHP: playerTarget.tempHP || 0,
                            hp: { ...liveCharAfterDice.hp, current: playerTarget.hp.current }
                        };
                        // RAW — être touché À TERRE = échec de jet de mort auto (2 si crit).
                        if (liveCharAfterDice.hp.current <= 0 && result.resolution.hit && result.resolution.damage > 0) {
                            char = applyDownedDamagePenalty(char, Boolean(result.resolution.criticalHit));
                        }
                        d.syncCharacterCritical(char, 'hp');
                        handleConcentrationAfterDamage(char, result.resolution.damage);
                    }

                    campaignEventLog.append('HP_CHANGED', result.resolution.log.text, result.resolution);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${result.resolution!.log.text}]*` }]);

                    const outcome = encounterOutcome(morale.state);
                    return {
                        success: true,
                        hit: result.resolution.hit,
                        criticalHit: result.resolution.criticalHit,
                        attackTotal: result.resolution.attackRoll.total,
                        damage: result.resolution.damage,
                        targetHP: result.resolution.targetHP,
                        encounterOutcome: outcome,
                    };
                }

                case 'apply_damage': {
                    const target = String(args.target || args.name || '').trim();
                    const amount = Math.max(0, Math.trunc(Number(args.amount ?? args.damage ?? 0)));
                    if (!target) return { success: false, error: 'apply_damage requires a target' };
                    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'apply_damage requires a positive amount' };

                    // Surface DM-driven damage (narrative enemy hits, traps, hazards) in the
                    // combat "Jets" journal + audit console. Logged ONLY once the damage
                    // actually lands (calls below) — logging up-front showed a phantom roll
                    // even when the target didn't exist and nothing was applied.
                    const logDamage = (resolvedName: string) => {
                        store.pushCombatRoll({ name: `${resolvedName} : dégâts`, total: amount, formula: String(args.damageType || ''), isDM: true });
                        auditBus.publish('combat', `apply_damage → ${resolvedName}: ${amount} ${args.damageType || ''}`, { target: resolvedName, amount, damageType: args.damageType });
                    };

                    const isPlayerTarget = store.character && (
                        target.toLowerCase() === 'player' ||
                        target.toLowerCase() === store.character.name.toLowerCase()
                    );
                    
                    if (!store.combatState.isActive && isPlayerTarget) {
                        // Shared helper: racial/draconic/feat resistances + temp HP
                        // now apply OUT of combat too (a Dwarf poisoned at the
                        // tavern used to take it full).
                        const outOfCombat = applyDamageToCharacter(store.character!, amount, args.damageType ? String(args.damageType) : undefined);
                        const updatedChar = outOfCombat.character;
                        d.syncCharacterCritical(updatedChar, 'hp');
                        logDamage(updatedChar.name);
                        campaignEventLog.append('HP_CHANGED', `${updatedChar.name} took ${outOfCombat.amountApplied} damage (out of combat${outOfCombat.mitigation !== 'normal' ? `, ${outOfCombat.mitigation}` : ''})`, {
                            target: updatedChar.name,
                            amount,
                            amountApplied: outOfCombat.amountApplied,
                            mitigation: outOfCombat.mitigation,
                            hp: updatedChar.hp,
                            tempHP: updatedChar.tempHP
                        });
                        // Concentration is at risk out of combat too.
                        handleConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied, 'concentration save (out of combat)');
                        return { success: true, target: updatedChar.name, hp: updatedChar.hp, tempHP: updatedChar.tempHP, amountApplied: outOfCombat.amountApplied, mitigation: outOfCombat.mitigation };
                    }

                    const applied = applyDamageToEncounter(store.combatState, target, amount, args.damageType);
                    if (!applied.found || !applied.target) {
                        return { success: false, error: applied.ambiguous ? 'Ambiguous target. Use combatant id.' : 'Target not found' };
                    }
                    logDamage(applied.target.name);

                    // Commit sync des dégâts AVANT le test de moral (dont l'animation
                    // attend 4 s) : plus d'écriture d'état de combat après un await.
                    store.setCombatState(applied.state);

                    // Concentration d'un PNJ lanceur brisée par ces dégâts : lever
                    // l'effet lié (sur le héros et/ou un combattant) + l'annoncer.
                    if (applied.npcConcentrationBroken) {
                        const broken = applied.npcConcentrationBroken;
                        const released = releaseNpcConcentrationEffect(applied.state, useGameStore.getState().character, broken);
                        store.setCombatState(released.state);
                        if (released.removedFromPlayer && released.character) {
                            d.syncCharacterCritical(released.character, 'hp');
                        }
                        const concLine = broken.downed
                            ? sysLine(`${broken.casterName} tombe — sa concentration sur ${broken.effectName} est perdue.`,
                                      `${broken.casterName} goes down — concentration on ${broken.effectName} is lost.`)
                            : sysLine(`${broken.casterName} rate sa sauvegarde de concentration (${broken.roll} vs DD ${broken.dc}) : ${broken.effectName} prend fin.`,
                                      `${broken.casterName} fails the concentration save (${broken.roll} vs DC ${broken.dc}): ${broken.effectName} ends.`);
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${concLine}]*` }]);
                        campaignEventLog.append('EFFECT_ADDED', `NPC concentration broken: ${broken.effectName}`, broken as any);
                    }

                    // --- MORALE CHECK FOR DAMAGED NPC --- (helper partagé, état frais)
                    await runMoraleCheck(String(args.target || args.name));

                    // Fiche FRAÎCHE après l'animation : l'ancien code repartait du
                    // snapshot du début de handler et écrasait tout changement
                    // concurrent de PV/inventaire survenu pendant l'attente.
                    const liveCharAfterMorale = useGameStore.getState().character;
                    if (applied.target.isPlayer && liveCharAfterMorale) {
                        let char = {
                            ...liveCharAfterMorale,
                            tempHP: applied.target.tempHP || 0,
                            hp: { ...liveCharAfterMorale.hp, current: applied.target.hp.current }
                        };
                        // RAW — dégâts subis à 0 PV = échec de jet de mort automatique.
                        if (liveCharAfterMorale.hp.current <= 0 && (applied.amountApplied || 0) > 0) {
                            char = applyDownedDamagePenalty(char);
                        }
                        d.syncCharacterCritical(char, 'hp');
                        handleConcentrationAfterDamage(char, applied.amountApplied || 0);
                    }

                    campaignEventLog.append('HP_CHANGED', `${applied.target.name} took ${amount} damage`, {
                        target: applied.target.name,
                        amount,
                        amountApplied: applied.amountApplied,
                        mitigation: applied.mitigation,
                        damageType: args.damageType,
                        hp: applied.target.hp,
                        tempHP: applied.target.tempHP
                    });
                    return { success: true, target: applied.target.name, targetId: applied.target.id, hp: applied.target.hp, tempHP: applied.target.tempHP, amountApplied: applied.amountApplied, mitigation: applied.mitigation };
                }

                case 'environmental_damage': {
                    // The WORLD hurts a creature outside any attack (fire, icy water,
                    // poison, falls, lava…). Rolls the dice locally — optional saving
                    // throw first — applies real HP loss + an optional SRD condition.
                    // Works in AND out of combat, on the player or any combatant.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const hazard = stringArg(args.description || args.source || 'Danger environnemental', 120) || 'Danger environnemental';
                    const damageFormula = String(args.damageFormula || args.formula || '').trim();
                    if (!damageFormula) return { success: false, error: 'environmental_damage requires damageFormula (e.g. "2d6")' };
                    const damageType = args.damageType ? String(args.damageType) : undefined;

                    // ── Multi-cibles (éboulis, incendie de taverne…) : targets =
                    // 'all_enemies' ou liste. Chaque cible repasse par CE MÊME outil
                    // (jets de sauvegarde et dégâts indépendants, état relu frais).
                    if (args.targets !== undefined) {
                        const raw = args.targets;
                        const rawMode = Array.isArray(raw) ? '' : String(raw).trim().toLowerCase();
                        const list: string[] = Array.isArray(raw)
                            ? raw.map((t: any) => String(t).trim()).filter(Boolean)
                            : rawMode === 'all_enemies' || rawMode === 'all_combatants'
                                ? (store.combatState.isActive
                                    // 'all_combatants' = tout le monde y compris le
                                    // joueur et les alliés (éboulement, incendie…).
                                    ? store.combatState.combatants.filter(c => c.hp.current > 0
                                        && (rawMode === 'all_combatants' || combatantSide(c) === 'enemy')).map(c => c.isPlayer ? 'player' : c.id)
                                    : [])
                                : String(raw).split(',').map(s => s.trim()).filter(Boolean);
                        if (!list.length) return { success: false, error: "environmental_damage targets resolved to nobody (no active combat for 'all_enemies'?)" };
                        if (list.length > 1) {
                            const perTarget: any[] = [];
                            for (const t of list) {
                                const sub = await processToolCall({ name: 'environmental_damage', args: { ...args, targets: undefined, target: t } });
                                perTarget.push({ target: t, ...(sub || {}) });
                            }
                            return {
                                success: true,
                                targets: perTarget,
                                instruction: 'Narrate the hazard sweeping over all of them in ONE beat. HP changes are already applied — do not re-apply.',
                            };
                        }
                        args.target = list[0];
                    }
                    const targetRef = stringArg(args.target || 'player', 120) || 'player';
                    const isPlayerTarget = targetRef.toLowerCase() === 'player'
                        || targetRef.toLowerCase() === store.character.name.toLowerCase();

                    // ── 1. Optional saving throw (auto-rolled, fully visible) ──
                    let multiplier = 1;
                    let saveSummary = '';
                    const saveAbility = String(args.saveAbility || '').toUpperCase();
                    const saveDC = Number(args.saveDC ?? args.dc);
                    const validSave = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(saveAbility) && Number.isFinite(saveDC) && saveDC > 0;
                    let saveSucceeded: boolean | undefined;
                    if (validSave) {
                        let saveBonus = 0;
                        let envSaveAdvantage = false;
                        if (isPlayerTarget) {
                            const c = store.character;
                            const effectiveStats: Record<string, number> = {
                                STR: getEffectiveStat(c, 'STR'), DEX: getEffectiveStat(c, 'DEX'), CON: getEffectiveStat(c, 'CON'),
                                INT: getEffectiveStat(c, 'INT'), WIS: getEffectiveStat(c, 'WIS'), CHA: getEffectiveStat(c, 'CHA'),
                            };
                            const check = getCheckModifier({
                                effectiveStats,
                                level: c.level || 1,
                                ability: saveAbility,
                                isSave: true,
                                proficiencies: c.proficiencies || [],
                                expertise: c.expertise || [],
                                proficientSaves: getProficientSaves(c),
                            });
                            // Aura de protection / Sens du danger s'appliquent aussi
                            // aux sauvegardes de danger environnemental.
                            const passives = classSavePassives(c, saveAbility as any);
                            saveBonus = check.modifier + passives.bonus;
                            // Don Expert des donjons (2026-08-13) : avantage aux
                            // sauvegardes contre les PIÈGES.
                            if (featGrantsAdvantageOn(c, 'save_vs_trap') && /pi[eè]ge|trap/i.test(hazard)) {
                                envSaveAdvantage = true;
                            }
                        } else {
                            const creatureData: any = lookupMonster(targetRef) || getCreature(targetRef);
                            if (creatureData && 'saves' in creatureData && creatureData.saves?.[saveAbility] !== undefined) {
                                saveBonus = creatureData.saves[saveAbility];
                            } else if (creatureData && 'stats' in creatureData && creatureData.stats?.[saveAbility] !== undefined) {
                                saveBonus = Math.floor((creatureData.stats[saveAbility] - 10) / 2);
                            }
                        }
                        const outcome = resolveRollPrompt(normalizeRollPrompt({
                            reason: `Sauvegarde ${saveAbility} — ${hazard}`,
                            formula: `1d20${saveBonus >= 0 ? '+' : ''}${saveBonus}`,
                            dc: saveDC,
                            advantage: envSaveAdvantage ? 'advantage' : undefined,
                        }));
                        saveSucceeded = outcome.success;
                        const halfOnSave = optionalBoolean(args.halfOnSave) ?? true;
                        multiplier = outcome.success ? (halfOnSave ? 0.5 : 0) : 1;
                        // ÉVASION (Roublard/Moine 7+, Hunter 15+) : sur une
                        // sauvegarde de DEX « moitié dégâts », la réussite annule
                        // TOUT et l'échec n'inflige que la moitié.
                        // ou-m1 — le résumé est construit AVANT d'ajouter le tag
                        // (l'ancien ordre écrasait « (Evasion) » aussitôt écrit).
                        saveSummary = ` Save ${saveAbility} ${outcome.total} vs DC ${saveDC}: ${outcome.success ? 'SUCCESS' : 'FAILURE'}.`;
                        if (isPlayerTarget && saveAbility === 'DEX' && halfOnSave && hasEvasion(store.character)) {
                            multiplier = outcome.success ? 0 : 0.5;
                            saveSummary += ' (Evasion)';
                        }
                        store.setCurrentRoll({
                            result: outcome.total,
                            reason: `${isPlayerTarget ? store.character.name : targetRef} — sauvegarde ${saveAbility} vs ${hazard} (${outcome.success ? 'réussie' : 'ratée'})`,
                            isDM: !isPlayerTarget,
                            success: outcome.success,
                        });
                        deps.diceTrayRef.current?.addLog({
                            type: 'save',
                            name: `Sauvegarde ${saveAbility} — ${hazard}`,
                            total: outcome.total,
                            formula: `${outcome.formulaLabel} vs DC ${saveDC}`,
                            isDM: !isPlayerTarget,
                            success: outcome.success,
                        });
                        await waitDice();
                    }

                    // ── 1bis. Mode JET D'ATTAQUE scripté (piège à fléchettes,
                    // archer d'ambuscade pré-combat…) : attackBonus fourni et pas
                    // de sauvegarde → 1d20+bonus contre la CA EFFECTIVE. Un raté
                    // n'inflige rien — avant, ces attaques narratives touchaient
                    // toujours ou passaient par des dégâts secs sans jet.
                    let attackSummary = '';
                    const envAttackBonus = Number(args.attackBonus);
                    if (!validSave && Number.isFinite(envAttackBonus)) {
                        const rosterHit = store.combatState.isActive
                            ? resolveCombatantReference(store.combatState, isPlayerTarget ? 'player' : targetRef, { autoResolve: true })
                            : null;
                        const targetACValue = isPlayerTarget
                            ? getEffectiveAC(store.character)
                            : (rosterHit?.combatant?.ac ?? (lookupMonster(targetRef) as any)?.ac ?? (getCreature(targetRef) as any)?.ac ?? 12);
                        const atkOutcome = resolveRollPrompt(normalizeRollPrompt({
                            reason: `${hazard} — jet d'attaque`,
                            formula: `1d20${envAttackBonus >= 0 ? '+' : ''}${envAttackBonus}`,
                            dc: targetACValue,
                        }));
                        attackSummary = ` Attack ${atkOutcome.total} vs AC ${targetACValue}: ${atkOutcome.success ? 'HIT' : 'MISS'}.`;
                        store.setCurrentRoll({
                            result: atkOutcome.total,
                            reason: `${hazard} — ${atkOutcome.success ? 'touche' : 'manque'} ${isPlayerTarget ? store.character.name : targetRef}`,
                            isDM: true,
                            success: atkOutcome.success,
                        });
                        deps.diceTrayRef.current?.addLog({
                            type: 'attack',
                            name: hazard,
                            total: atkOutcome.total,
                            formula: `${atkOutcome.formulaLabel} vs CA ${targetACValue}`,
                            isDM: true,
                            success: atkOutcome.success,
                        });
                        await waitDice();
                        if (!atkOutcome.success) {
                            const missText = useGameStore.getState().language !== 'en'
                                ? `${hazard}: ${isPlayerTarget ? store.character.name : targetRef} évite l'attaque (${atkOutcome.total} vs CA ${targetACValue}).`
                                : `${hazard}: ${isPlayerTarget ? store.character.name : targetRef} avoids the attack (${atkOutcome.total} vs AC ${targetACValue}).`;
                            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${missText}]*` }]);
                            return {
                                success: true,
                                target: isPlayerTarget ? store.character.name : targetRef,
                                amountApplied: 0,
                                attackSummary,
                                instruction: 'The scripted attack MISSED — narrate the near-miss. NO damage was dealt.',
                            };
                        }
                    }

                    // ── 2. Roll the damage ──
                    const rolled = rollDice(damageFormula);
                    const amount = Math.max(0, Math.floor(rolled.total * multiplier));
                    if (amount > 0) {
                        store.setCurrentRoll({ result: amount, reason: `${hazard} — ${amount} dégâts ${damageType || ''}`, isDM: true });
                        deps.diceTrayRef.current?.addLog({
                            type: 'damage',
                            name: `${hazard}${isPlayerTarget ? '' : ` → ${targetRef}`}`,
                            total: amount,
                            formula: `${damageFormula}${multiplier !== 1 ? (multiplier === 0.5 ? ' (sauvegarde : ½ dégâts)' : ' (sauvegarde : annulé)') : ''}`,
                            isDM: true,
                        });
                        await waitDice();
                    }

                    // ── 3. Apply the damage ──
                    // État/fiche FRAIS : jusqu'à 3 waitDice() (12 s) ont pu s'écouler
                    // depuis le snapshot du début de handler.
                    const liveAfterDice = useGameStore.getState();
                    let resultHP: { current: number; max: number } | undefined;
                    let resolvedName = isPlayerTarget ? (liveAfterDice.character?.name || store.character.name) : targetRef;
                    if (amount > 0) {
                        const inEncounter = liveAfterDice.combatState.isActive
                            ? applyDamageToEncounter(liveAfterDice.combatState, isPlayerTarget ? 'player' : targetRef, amount, damageType)
                            : { found: false } as any;
                        if (inEncounter.found && inEncounter.target) {
                            store.setCombatState(inEncounter.state);
                            resolvedName = inEncounter.target.name;
                            resultHP = inEncounter.target.hp;
                            if (inEncounter.npcConcentrationBroken) {
                                const broken = inEncounter.npcConcentrationBroken;
                                const released = releaseNpcConcentrationEffect(inEncounter.state, useGameStore.getState().character, broken);
                                store.setCombatState(released.state);
                                if (released.removedFromPlayer && released.character) d.syncCharacterCritical(released.character, 'hp');
                                store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysLine(`${broken.casterName} perd sa concentration : ${broken.effectName} prend fin.`, `${broken.casterName} loses concentration: ${broken.effectName} ends.`)}]*` }]);
                            }
                            if (inEncounter.target.isPlayer && liveAfterDice.character) {
                                let char = {
                                    ...liveAfterDice.character,
                                    tempHP: inEncounter.target.tempHP || 0,
                                    hp: { ...liveAfterDice.character.hp, current: inEncounter.target.hp.current },
                                };
                                // RAW — dégâts subis à 0 PV = échec de jet de mort automatique.
                                if (liveAfterDice.character.hp.current <= 0 && (inEncounter.amountApplied || 0) > 0) {
                                    char = applyDownedDamagePenalty(char);
                                }
                                d.syncCharacterCritical(char, 'hp');
                                handleConcentrationAfterDamage(char, inEncounter.amountApplied || 0);
                            }
                        } else if (isPlayerTarget && liveAfterDice.character) {
                            // Out of combat (or player not in the encounter roster) —
                            // racial/draconic/feat resistances + temp HP via the
                            // shared helper (they were skipped outside encounters).
                            const outOfCombat = applyDamageToCharacter(liveAfterDice.character, amount, damageType);
                            const updatedChar = outOfCombat.character;
                            d.syncCharacterCritical(updatedChar, 'hp');
                            resultHP = updatedChar.hp;
                            handleConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied);
                        } else {
                            return { success: false, error: `Target "${targetRef}" not found (no active combat).` };
                        }
                        store.pushCombatRoll({ name: `${hazard} → ${resolvedName}`, total: amount, formula: damageType || '', isDM: true });
                        auditBus.publish('combat', `environmental_damage → ${resolvedName}: ${amount} ${damageType || ''} (${hazard})`, { hazard, amount, damageType, saveSummary });
                    }

                    // ── 4. Optional SRD condition on a failed save (or no save) ──
                    let conditionApplied: string | undefined;
                    const conditionName = args.condition ? String(args.condition) : '';
                    if (conditionName && saveSucceeded !== true) {
                        if (store.combatState.isActive && !isPlayerTarget) {
                            const conditioned = applyConditionToEncounter(useGameStore.getState().combatState, targetRef, conditionName);
                            if (conditioned.found) {
                                store.setCombatState(conditioned.state);
                                conditionApplied = conditioned.condition?.name;
                            }
                        } else {
                            const currentChar = useGameStore.getState().character;
                            if (currentChar) {
                                const conditioned = applyConditionToCharacter(currentChar, conditionName);
                                if (conditioned.found) {
                                    d.syncCharacterCritical(conditioned.character, 'hp');
                                    conditionApplied = conditioned.condition?.name;
                                }
                            }
                        }
                    }

                    const envFr = useGameStore.getState().language !== 'en';
                    const summaryText = envFr
                        ? `${hazard}: ${resolvedName} ${amount > 0 ? `subit ${amount} dégâts${damageType ? ` (${damageType})` : ''}` : 'ne subit aucun dégât'}${conditionApplied ? ` et est ${conditionApplied}` : ''}.`
                        : `${hazard}: ${resolvedName} ${amount > 0 ? `takes ${amount} damage${damageType ? ` (${damageType})` : ''}` : 'takes no damage'}${conditionApplied ? ` and is ${conditionApplied}` : ''}.`;
                    campaignEventLog.append('HP_CHANGED', summaryText, { hazard, target: resolvedName, amount, damageType, saveSummary, attackSummary, conditionApplied });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${summaryText}${saveSummary}${attackSummary}]*` }]);
                    return {
                        success: true,
                        target: resolvedName,
                        amountApplied: amount,
                        damageType,
                        saveSucceeded,
                        conditionApplied,
                        hp: resultHP,
                        instruction: 'Narrate the hazard and its toll vividly. The HP change is already applied — do not re-apply it.',
                    };
                }

                case 'advance_turn': {
                    const next = advanceTurn(store.combatState);
                    store.setCombatState(next);
                    const current = next.combatants.find(c => c.id === next.currentTurn || c.name === next.currentTurn);
                    campaignEventLog.append('COMBAT_TURN_ADVANCED', `Combat turn advanced to ${current?.name || next.currentTurn}`, {
                        currentTurn: next.currentTurn,
                        currentTurnName: current?.name,
                        round: next.round,
                    });
                    return { success: true, currentTurn: next.currentTurn, currentTurnName: current?.name, round: next.round };
                }

                case 'propose_player_action': {
                    // The DM authors a custom action card; we ONLY store it. The
                    // player confirms it on screen and GameSession's generic
                    // resolver runs the real dice. We never resolve or advance here.
                    if (!store.combatState.isActive) return { success: false, error: 'No active combat to propose an action in.' };
                    const label = stringArg(args.label, 80);
                    const resolution = String(args.resolution || '').toLowerCase();
                    if (!label || !['attack', 'save', 'check', 'auto', 'effect'].includes(resolution)) {
                        return { success: false, error: "propose_player_action needs a label and resolution in {attack,save,check,auto,effect}." };
                    }
                    // GARDE ANTI-CONTOURNEMENT (2026-08-13) : un VRAI sort du
                    // grimoire du joueur proposé en carte improvisée court-circuitait
                    // les emplacements, la concentration et le DD réel. Refus net.
                    {
                        const liveChar = useGameStore.getState().character;
                        const ownSpells = [
                            ...(liveChar?.cantrips || []),
                            ...(liveChar?.knownSpells || []),
                            ...(liveChar?.preparedSpells || []),
                        ];
                        const labelFolded = foldText(label);
                        const matched = ownSpells.find(s => foldText(s) === labelFolded)
                            || (lookupSpell(label) && ownSpells.find(s => foldText(s) === foldText(lookupSpell(label)!.name)) ? lookupSpell(label)!.name : undefined);
                        if (matched) {
                            return {
                                success: false,
                                error: `"${label}" is a REAL spell in the player's spellbook. Do NOT route it through an improvised card — call cast_spell (slots, concentration and the real DC apply). Improvised cards are for stunts the rules don't cover.`,
                            };
                        }
                    }
                    const costRaw = String(args.cost || 'action').toLowerCase().replace(/\s+/g, '_');
                    const cost = ['action', 'bonus_action', 'free', 'reaction'].includes(costRaw) ? costRaw : 'action';
                    const upper = (v: unknown) => {
                        const s = String(v || '').toUpperCase();
                        return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(s) ? s : undefined;
                    };
                    const hasModifier = args.modifierBonus !== undefined || args.modifierMode !== undefined;
                    // Malus CHIFFRÉ sur la CIBLE (« sable dans les yeux : -2 à ses
                    // attaques 2 rounds ») — appliqué au succès de la carte.
                    const hasTargetEffect = args.targetEffectStat !== undefined && args.targetEffectBonus !== undefined;
                    const proposed = {
                        id: crypto.randomUUID(),
                        label,
                        description: args.description ? stringArg(args.description, 200) : undefined,
                        cost: cost as any,
                        resolution: resolution as any,
                        target: args.target ? stringArg(args.target, 160) : undefined,
                        attackBonus: Number.isFinite(Number(args.attackBonus)) ? Number(args.attackBonus) : undefined,
                        dc: Number.isFinite(Number(args.dc)) ? Number(args.dc) : undefined,
                        advantage: ['advantage', 'disadvantage', 'normal'].includes(String(args.advantage)) ? String(args.advantage) as any : undefined,
                        saveAbility: upper(args.saveAbility) as any,
                        checkAbility: upper(args.checkAbility) as any,
                        damageFormula: args.damageFormula ? stringArg(args.damageFormula, 30) : undefined,
                        damageType: args.damageType ? stringArg(args.damageType, 30) : undefined,
                        condition: args.condition ? stringArg(args.condition, 40) : undefined,
                        selfModifier: hasModifier ? {
                            mode: args.modifierMode ? String(args.modifierMode).toLowerCase() : 'normal',
                            bonus: Number.isFinite(Number(args.modifierBonus)) ? Number(args.modifierBonus) : 0,
                            scope: args.modifierScope ? String(args.modifierScope).toLowerCase() : 'attack',
                            uses: Number.isFinite(Number(args.modifierUses)) ? Math.max(1, Number(args.modifierUses)) : 1,
                        } : undefined,
                        targetEffect: hasTargetEffect ? {
                            stat: String(args.targetEffectStat || 'attackBonus'),
                            bonus: Math.max(-10, Math.min(10, Number(args.targetEffectBonus) || 0)),
                            rounds: Math.max(1, Math.min(20, Number(args.targetEffectRounds) || 2)),
                        } : undefined,
                        createdAt: Date.now(),
                    };
                    useGameStore.getState().addProposedAction(proposed);
                    campaignEventLog.append('SCENE_CHANGED', `Improvised action proposed: ${label}`, proposed);
                    return { success: true, proposed: label, instruction: 'Action card shown to the player. Briefly narrate the set-up, then wait — the player will trigger it and you will get a [SYSTEM] result to narrate.' };
                }

                case 'grant_player_action': {
                    // Add an extra action pip to the player's HUD for this turn
                    // (Action Surge / Haste / a rewarded heroic surge). Resets next turn.
                    if (!store.combatState.isActive) return { success: false, error: 'No active combat' };
                    const kind = String(args.kind || 'action').toLowerCase().includes('bonus') ? 'bonus' : 'action';
                    const count = Math.max(1, Math.min(4, Number(args.count) || 1));
                    store.setCombatState((prev: any) => {
                        const econ = prev.actionEconomy?.['player'] || {};
                        const next: any = { ...econ };
                        if (kind === 'action') {
                            next.attacksMax = (econ.attacksMax ?? 1) + count;
                            next.actionUsed = (next.attacksUsed ?? 0) >= next.attacksMax;
                        } else {
                            next.bonusMax = (econ.bonusMax ?? 1) + count;
                            next.bonusActionUsed = (next.bonusUsed ?? 0) >= next.bonusMax;
                        }
                        return { ...prev, actionEconomy: { ...(prev.actionEconomy || {}), player: next } };
                    });
                    const label = kind === 'action' ? `${count} action${count > 1 ? 's' : ''} principale${count > 1 ? 's' : ''}` : `${count} action${count > 1 ? 's' : ''} bonus`;
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ⚡ +${label} accordée${count > 1 ? 's' : ''} ce tour${args.reason ? ` (${stringArg(args.reason, 60)})` : ''}]*` }]);
                    campaignEventLog.append('EFFECT_ADDED', `Granted player ${kind} x${count}`, { kind, count, reason: args.reason });
                    return { success: true, kind, count };
                }

                case 'add_quest': {
                    // ou-m5 — titre requis : une quête « » polluait le journal.
                    const questTitle = stringArg(args.title, 160);
                    if (!questTitle) return { success: false, error: 'add_quest requires a non-empty title' };
                    // PL2 — DÉDUP insensible aux accents : le MJ ré-annonçait la
                    // même quête et le journal se remplissait de doublons. Une
                    // quête existante (non échouée) est MISE À JOUR, pas dupliquée.
                    // La dédup ne vise QUE les quêtes actives : une quête au même
                    // titre déjà TERMINÉE ne doit plus avaler la nouvelle (audit
                    // 2026-08-21 — la quête récurrente « Escorter la caravane »
                    // renvoyait success:true sans jamais rouvrir quoi que ce soit).
                    // Quête déjà ACCOMPLIE : on refuse, et on dit POURQUOI —
                    // le MJ ne voyait plus la clôture dans sa fenêtre saturée de
                    // doublons et recréait de bonne foi (audit 2026-08-24, B1).
                    // Une vraie quête récurrente doit se déclarer.
                    const closedSame = questCreationBlockedBy(
                        useGameStore.getState().journal.quests || [],
                        questTitle,
                        optionalBoolean(args.recurring),
                    );
                    if (closedSame) {
                        return {
                            success: false,
                            alreadyCompleted: true,
                            completedAt: closedSame.completedAt || null,
                            error: `Quest "${closedSame.title}" was already COMPLETED${closedSame.completedAt ? ` on ${String(closedSame.completedAt).slice(0, 10)}` : ''} — it is settled PAST, do not re-create it. Reference it as a memory instead. If this is genuinely a NEW recurring contract of the same name, call add_quest again with recurring: true.`,
                        };
                    }
                    const existingQuest = (useGameStore.getState().journal.quests || [])
                        .find((q: any) => foldTitle(q.title) === foldTitle(questTitle) && q.status === 'active');
                    // Étapes optionnelles (checklist) fournies dès la création.
                    const questSteps = stringListArg(args.steps).slice(0, 6).map(text => ({
                        id: crypto.randomUUID(), text, done: false,
                    }));
                    if (existingQuest) {
                        await syncJournal((prev: any) => ({
                            ...prev,
                            quests: (prev.quests || []).map((q: any) => q.id === existingQuest.id
                                ? {
                                    ...q,
                                    description: args.description || q.description,
                                    status: 'active',
                                    ...(questSteps.length && !(q.steps || []).length ? { steps: questSteps } : {}),
                                }
                                : q)
                        }), true);
                        campaignEventLog.append('JOURNAL_UPDATED', `Quest refreshed (dedup): ${questTitle}`, args);
                        appendCampaignLog('quest', `Quest refreshed: "${questTitle}"`);
                        return { success: true, updated: true, note: 'Quest already existed — refreshed instead of duplicating.' };
                    }
                    await syncJournal((prev: any) => ({
                        ...prev,
                        quests: [...(prev.quests || []), {
                            id: crypto.randomUUID(),
                            title: questTitle,
                            description: args.description,
                            status: 'active',
                            ...(questSteps.length ? { steps: questSteps } : {}),
                            createdAt: new Date().toISOString()
                        }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Quest added: ${questTitle}`, args);
                    appendCampaignLog('quest', `Quest accepted: "${questTitle}"`);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Quest Added: ${questTitle}]*` }]);
                    return { success: true, steps: questSteps.map(s => s.text) };
                }

                case 'update_quest_step': {
                    // Étapes de quête cochables : marque une étape faite (défaut),
                    // ou en AJOUTE une nouvelle si elle n'existe pas encore.
                    const questTitleArg = stringArg(args.questTitle || args.title, 160);
                    const stepText = stringArg(args.step, 200);
                    if (!questTitleArg || !stepText) return { success: false, error: 'update_quest_step requires questTitle and step' };
                    const qsNorm = foldText;
                    // Même sélecteur que complete_quest (l'asymétrie faisait
                    // échouer un titre décoré ici alors qu'il passait là-bas).
                    const questPick = findQuestByTitle(useGameStore.getState().journal.quests || [], questTitleArg, 'active');
                    if (questPick.ambiguous) {
                        return { success: false, error: `Ambiguous quest title "${questTitleArg}". Candidates: ${questPick.ambiguous.join(' | ')}. Use the exact title.` };
                    }
                    const quest = questPick.quest;
                    if (!quest) {
                        const activeNow = (useGameStore.getState().journal.quests || [])
                            .filter((q: any) => q.status === 'active').map((q: any) => q.title);
                        return { success: false, error: `Active quest "${questTitleArg}" not found. Active quests: ${activeNow.join(' | ') || 'none'}. Use add_quest first if this is a new one.` };
                    }
                    const doneArg = optionalBoolean(args.done);
                    let resultingSteps: any[] = [];
                    await syncJournal((prev: any) => ({
                        ...prev,
                        quests: (prev.quests || []).map((q: any) => {
                            if (q.id !== quest.id) return q;
                            const steps = [...(q.steps || [])];
                            const idx = steps.findIndex((s: any) => qsNorm(s.text) === qsNorm(stepText) || qsNorm(s.text).includes(qsNorm(stepText)) || qsNorm(stepText).includes(qsNorm(s.text)));
                            if (idx >= 0) {
                                steps[idx] = { ...steps[idx], done: doneArg ?? true };
                            } else {
                                steps.push({ id: crypto.randomUUID(), text: stepText, done: doneArg ?? false });
                            }
                            resultingSteps = steps;
                            return { ...q, steps };
                        }),
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Quest step ${doneArg === false ? 'updated' : 'checked'}: ${quest.title} — ${stepText}`, args);
                    if (doneArg !== false) appendCampaignLog('quest', `Quest "${quest.title}": step done — ${stepText}`);
                    return { success: true, quest: quest.title, steps: resultingSteps.map((s: any) => `${s.done ? '✓' : '○'} ${s.text}`) };
                }

                case 'complete_quest': {
                    const questTitle = String(args.title || '').trim();
                    if (!questTitle) return { success: false, error: 'complete_quest requires a title' };
                    // TR8/TP9 (audit trame) — match foldText tolérant (accents,
                    // titres raccourcis), comme update_quest_step : l'égalité
                    // stricte laissait des quêtes fantômes « actives » à 3/3,
                    // et l'échec était muet pour le MJ.
                    const cqPick = findQuestByTitle(useGameStore.getState().journal.quests || [], questTitle, 'active');
                    if (cqPick.ambiguous) {
                        return { success: false, error: `Ambiguous quest title "${questTitle}". Candidates: ${cqPick.ambiguous.join(' | ')}. Use the exact title — never close a quest on a guess.` };
                    }
                    const found = Boolean(cqPick.quest);
                    const completedTitle = cqPick.quest?.title || '';
                    if (found) {
                        await syncJournal((prev: any) => ({
                            ...prev,
                            quests: (prev.quests || []).map((q: any) => q.id === cqPick.quest.id ? { ...q, status: 'completed', completedAt: new Date().toISOString() } : q)
                        }), true);
                    }
                    if (found) {
                        campaignEventLog.append('JOURNAL_UPDATED', `Quest completed: ${completedTitle}`, args);
                        appendCampaignLog('quest', `Quest COMPLETED: "${completedTitle}"`);
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Quest Completed: ${completedTitle}]*` }]);
                        return { success: true, quest: completedTitle };
                    }
                    const activeTitles = (useGameStore.getState().journal.quests || [])
                        .filter((q: any) => q.status === 'active').map((q: any) => q.title);
                    return { success: false, error: `No active quest matching "${questTitle}". Active quests: ${activeTitles.join(' | ') || 'none'}.` };
                }

                case 'add_npc': {
                    // Idempotent: re-announcing a known NPC refreshes it instead of
                    // creating a duplicate journal entry. Accent-insensitive like
                    // update_npc — "Séraphine" vs "Seraphine" used to duplicate.
                    const npcName = stringArg(args.name, 120);
                    // ou-m5 — nom requis : un PNJ « » créait une fiche vide et
                    // une requête de portrait vide.
                    if (!npcName) return { success: false, error: 'add_npc requires a non-empty name' };
                    const npcNorm = foldText;
                    const existing = (useGameStore.getState().journal.npcs || [])
                        .find((n: any) => npcNorm(n.name) === npcNorm(npcName));
                    await syncJournal((prev: any) => ({
                        ...prev,
                        npcs: existing
                            ? (prev.npcs || []).map((n: any) => n.id === existing.id
                                ? { ...n, description: args.description || n.description, location: args.location || n.location, lastSeenAt: Date.now() }
                                : n)
                            : [...(prev.npcs || []), {
                                id: crypto.randomUUID(),
                                name: npcName,
                                description: args.description,
                                location: args.location,
                                disposition: 0,
                                knownFacts: [],
                                lastSeenAt: Date.now(),
                                createdAt: new Date().toISOString()
                            }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `NPC discovered: ${npcName}`, args);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: NPC Discovered: ${npcName}]*` }]);
                    // Portrait généré en tâche de fond (cache IndexedDB, fail-quiet).
                    portraitService.request(
                        npcPortraitKey(npcName),
                        portraitPrompt(npcName, stringArg(args.description, 180) || undefined)
                    );
                    return { success: true };
                }

                case 'update_npc': {
                    const npcName = stringArg(args.name, 120);
                    if (!npcName) return { success: false, error: 'update_npc requires name' };
                    // Strip combining diacritics (U+0300–U+036F) so "Séraphine" matches "Seraphine".
                    const normalize = foldText;
                    const journal = useGameStore.getState().journal;
                    const target = (journal.npcs || []).find((n: any) => normalize(n.name) === normalize(npcName));
                    if (!target) {
                        return {
                            success: false,
                            error: `NPC "${npcName}" not in the journal. Call add_npc(name, description, location) first, then update_npc.`,
                        };
                    }
                    const delta = Math.max(-2, Math.min(2, Math.round(numericArg(args.dispositionDelta, 0))));
                    const memory = stringArg(args.memory, 160);
                    let updatedNpc: any = target;
                    await syncJournal((prev: any) => ({
                        ...prev,
                        npcs: (prev.npcs || []).map((n: any) => {
                            if (n.id !== target.id) return n;
                            updatedNpc = {
                                ...n,
                                disposition: Math.max(-5, Math.min(5, (n.disposition || 0) + delta)),
                                knownFacts: memory ? [...(n.knownFacts || []), memory].slice(-12) : (n.knownFacts || []),
                                location: stringArg(args.location, 120) || n.location,
                                description: stringArg(args.description, 300) || n.description,
                                lastSeenAt: Date.now(),
                            };
                            return updatedNpc;
                        })
                    }));
                    campaignEventLog.append('JOURNAL_UPDATED', `NPC updated: ${target.name}${delta ? ` (disposition ${delta > 0 ? '+' : ''}${delta} → ${updatedNpc.disposition})` : ''}${memory ? ` — remembers: ${memory}` : ''}`, args);
                    return {
                        success: true,
                        npc: { name: updatedNpc.name, disposition: updatedNpc.disposition, knownFacts: updatedNpc.knownFacts, location: updatedNpc.location },
                    };
                }

                case 'recruit_companion': {
                    // Compagnon PERSISTANT : rejoint chaque combat comme allié,
                    // ses PV suivent entre les combats, les repos le soignent.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const compName = stringArg(args.name, 80);
                    if (!compName) return { success: false, error: 'recruit_companion requires name' };
                    const existingComps = store.character.companions || [];
                    if (existingComps.length >= 2) {
                        return { success: false, error: 'Party is full (max 2 companions). dismiss_companion first.' };
                    }
                    const cnNorm = foldText;
                    if (existingComps.some(c => cnNorm(c.name) === cnNorm(compName))) {
                        return { success: false, error: `${compName} is already in the party.` };
                    }
                    const creature = getCreature(compName);
                    const creatureAttack = creature ? (creature.attacks || [])[0] : undefined;
                    const compHP = Math.max(1, Math.trunc(numericArg(args.hp, creature?.hp.base ?? 11)));
                    const companion: CompanionSheet = {
                        id: `comp_${cnNorm(compName).replace(/[^a-z0-9]+/g, '_').slice(0, 40) || Date.now()}`,
                        name: compName,
                        description: stringArg(args.description, 200) || undefined,
                        hp: { current: compHP, max: compHP },
                        ac: Math.max(5, Math.min(22, Math.trunc(numericArg(args.ac, creature?.ac ?? 12)))),
                        attack: {
                            name: stringArg(args.attackName, 40) || creatureAttack?.name || (useGameStore.getState().language === 'fr' ? 'Attaque' : 'Attack'),
                            attackBonus: Math.max(0, Math.min(10, Math.trunc(numericArg(args.attackBonus, creatureAttack?.attackBonus ?? 3)))),
                            damage: stringArg(args.damageFormula, 20) || creatureAttack?.damage || '1d6+1',
                            damageType: stringArg(args.damageType, 20) || creatureAttack?.damageType || 'bludgeoning',
                        },
                        recruitedAt: Date.now(),
                    };
                    d.syncCharacterUpdate({ ...store.character, companions: [...existingComps, companion] });
                    // Le compagnon existe aussi comme PNJ du journal (mémoire, portrait).
                    const journalNow = useGameStore.getState().journal;
                    if (!(journalNow.npcs || []).some((n: any) => cnNorm(n.name) === cnNorm(compName))) {
                        await syncJournal((prev: any) => ({
                            ...prev,
                            npcs: [...(prev.npcs || []), {
                                id: crypto.randomUUID(), name: compName,
                                description: companion.description || (useGameStore.getState().language === 'fr' ? 'Compagnon de route du héros.' : "The hero's traveling companion."),
                                location: 'Avec le héros', disposition: 3, knownFacts: [], lastSeenAt: Date.now(),
                            }],
                        }), true);
                    }
                    portraitService.request(npcPortraitKey(compName), portraitPrompt(compName, companion.description));
                    campaignEventLog.append('JOURNAL_UPDATED', `Companion recruited: ${compName} (HP ${compHP}, AC ${companion.ac})`, companion);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${sysLine(`${compName} rejoint le groupe (PV ${compHP}, CA ${companion.ac}`, `${compName} joins the party (HP ${compHP}, AC ${companion.ac}`)}, ${companion.attack.name} +${companion.attack.attackBonus}, ${companion.attack.damage})]*` }]);
                    return {
                        success: true,
                        companion,
                        instruction: `${compName} is now a PERSISTENT party member: they auto-join every combat as an ally (you play their turn with resolve_attack attacker="${companion.id}", attackBonus ${companion.attack.attackBonus}, damageFormula "${companion.attack.damage}"). Narrate them as a living character with a voice.`,
                    };
                }

                case 'set_mount': {
                    // Monture persistante : vitesse de voyage narrée + CHARGE
                    // MONTÉE en combat (mêlée sur cible lointaine en une action).
                    // `kind` = type du catalogue (destrier, griffon, destrier_celeste…)
                    // → vitesse/vol/description automatiques ; les montures de
                    // classe sont VALIDÉES (destrier céleste = paladin niv 5+).
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const kindArg = stringArg(args.kind, 60);
                    const mountType = kindArg ? getMountType(kindArg) : getMountType(stringArg(args.name, 80));
                    if (kindArg && !mountType) {
                        return { success: false, error: `Unknown mount kind "${kindArg}". Valid kinds: ${MOUNT_TYPES.map(m => m.id).join(', ')}.` };
                    }
                    if (mountType?.classOnly) {
                        const cls = store.character.class;
                        const lvl = store.character.level || 1;
                        if (cls !== mountType.classOnly.class || lvl < mountType.classOnly.minLevel) {
                            return {
                                success: false,
                                error: `${mountType.name} is reserved for ${mountType.classOnly.class} level ${mountType.classOnly.minLevel}+ (Find Steed). The hero is a ${cls} level ${lvl} — offer a mundane mount instead.`,
                            };
                        }
                    }
                    const mountName = stringArg(args.name, 80) || mountType?.name;
                    if (!mountName) return { success: false, error: 'set_mount requires name or kind' };
                    const mountCreature = getCreature(mountName);
                    const speed = Math.max(20, Math.trunc(numericArg(args.speed, mountType?.speed ?? (mountCreature as any)?.speed ?? 60)));
                    const mountMaxHP = Math.max(5, Math.trunc(numericArg(args.hp, mountType?.hp ?? 15)));
                    const mount = {
                        name: mountName,
                        kind: mountType?.id,
                        speed,
                        flying: mountType?.flying || undefined,
                        // La monture COMBAT (ligne alliée auto) : PV persistants.
                        hp: { current: mountMaxHP, max: mountMaxHP },
                        description: stringArg(args.description, 200) || mountType?.description || undefined,
                        // Acquérir = grimper en selle. set_mounted(false) pour descendre —
                        // la charge montée exige d'être en selle, pas juste propriétaire.
                        mounted: true,
                        acquiredAt: Date.now(),
                    };
                    d.syncCharacterUpdate({ ...store.character, mount });
                    portraitService.request(npcPortraitKey(mountName), portraitPrompt(mountName, mount.description || `${mountName}, loyal riding mount`));
                    campaignEventLog.append('JOURNAL_UPDATED', `Mount acquired: ${mountName}${mountType ? ` [${mountType.id}]` : ''} (speed ${speed} ft${mount.flying ? ', FLYING' : ''})`, mount);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${mountName}${mountType && mountType.name !== mountName ? ` (${mountType.name})` : ''} ${sysLine(`devient la monture du héros (vitesse ${speed} ft${mount.flying ? ', volante' : ''})`, `becomes the hero's mount (speed ${speed} ft${mount.flying ? ', flying' : ''})`)}]*` }]);
                    return {
                        success: true,
                        mount,
                        instruction: `${mountName} is now the hero's mount (and the hero is IN THE SADDLE)${mount.flying ? ' — a FLYING one: narrate aerial travel and dramatic swoops' : ''}: overland travel is much faster, and in combat a MELEE attack against a FAR enemy becomes a mounted charge (closes to melee AND strikes in one action) WHILE MOUNTED. When the hero dismounts or climbs back up in the fiction, call set_mounted. Narrate the mount as a living companion.${mountType?.id === 'destrier_celeste' ? ' It is a CELESTIAL spirit: if it dies, the paladin can summon it again after a long rest.' : ''}`,
                    };
                }

                case 'set_mounted': {
                    // En selle / à pied — état qui conditionne la charge montée.
                    // Le MJ l'appelle quand la fiction fait monter ou descendre le
                    // héros ; l'UI compagnons a le même interrupteur.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    if (!store.character.mount) return { success: false, error: 'The hero has no mount. Use set_mount first.' };
                    const wantMounted = args.mounted !== false && String(args.mounted).toLowerCase() !== 'false';
                    d.syncCharacterUpdate({ ...store.character, mount: { ...store.character.mount, mounted: wantMounted } });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${store.character!.mount!.name} — ${wantMounted ? sysLine('le héros se met en selle', 'the hero mounts up') : sysLine('le héros met pied à terre', 'the hero dismounts')}]*` }]);
                    return {
                        success: true,
                        mounted: wantMounted,
                        instruction: wantMounted
                            ? 'The hero is now IN THE SADDLE: mounted charges apply again.'
                            : 'The hero is now ON FOOT: no mounted charge until they mount up again (melee attacks on distant enemies close the distance instead of striking).',
                    };
                }

                case 'set_beast_companion': {
                    // Rôdeur Beast Master : CHOIX de la bête liée (loup, ours,
                    // panthère, faucon) — stats réelles de la ligne alliée.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    if (store.character.subclass !== 'Beast Master') {
                        return { success: false, error: 'Only a Beast Master ranger bonds a beast companion. Use recruit_companion for other allies.' };
                    }
                    const beast = getBeastCompanion(stringArg(args.kind || args.name, 60));
                    if (!beast) {
                        return { success: false, error: `Unknown beast. Valid kinds: ${BEAST_COMPANIONS.map(b => `${b.id} (${b.name})`).join(', ')}.` };
                    }
                    d.syncCharacterUpdate({ ...store.character, beastKind: beast.id });
                    portraitService.request(npcPortraitKey(`Compagnon ${beast.name}`), portraitPrompt(beast.name, beast.description));
                    campaignEventLog.append('JOURNAL_UPDATED', `Beast companion bonded: ${beast.name}`, beast);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${sysLine(`Le lien du Maître des bêtes est scellé : ${beast.name} (CA ${beast.ac}`, `The Beast Master's bond is sealed: ${beast.name} (AC ${beast.ac}`)}, ${beast.attack.name} +${beast.attack.attackBonus}, ${beast.attack.damage})]*` }]);
                    return {
                        success: true,
                        beast,
                        instruction: `${beast.name} is now the ranger's bonded beast: it auto-joins EVERY encounter as an ally (play its turn with resolve_attack attacker="companion", it uses ${beast.attack.name} +${beast.attack.attackBonus}, ${beast.attack.damage} ${beast.attack.damageType}). ${beast.description}`,
                    };
                }

                case 'set_familiar': {
                    // Familier (Find Familiar / pacte de la chaîne / esprit
                    // animal du druide) : narratif + « Aide » 1×/repos court.
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    if (!FAMILIAR_CLASSES.includes(store.character.class)) {
                        return { success: false, error: `Only ${FAMILIAR_CLASSES.join('/')} bond a familiar. A ${store.character.class} could get a pet NPC via recruit_companion instead.` };
                    }
                    const familiarType = getFamiliarType(stringArg(args.kind, 60));
                    if (!familiarType) {
                        return { success: false, error: `Unknown familiar kind. Valid kinds: ${FAMILIAR_TYPES.map(f => `${f.id} (${f.name})`).join(', ')}.` };
                    }
                    const famName = stringArg(args.name, 60) || familiarType.name;
                    const familiar = {
                        name: famName,
                        kind: familiarType.name,
                        description: stringArg(args.description, 200) || familiarType.knack,
                        acquiredAt: Date.now(),
                    };
                    // ensureProgressionState matérialise tout de suite la
                    // ressource « Aide du familier » (bouton visible en combat).
                    d.syncCharacterUpdate(ensureProgressionState({ ...store.character, familiar }));
                    portraitService.request(npcPortraitKey(famName), portraitPrompt(famName, `${familiarType.name} familiar. ${familiar.description}`));
                    campaignEventLog.append('JOURNAL_UPDATED', `Familiar bonded: ${famName} (${familiarType.name})`, familiar);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${famName} (${familiarType.name}) ${sysLine("devient le familier du héros — Aide 1×/repos court", "becomes the hero's familiar — Help 1×/short rest")}]*` }]);
                    return {
                        success: true,
                        familiar,
                        instruction: `${famName} the ${familiarType.name} is now the hero's familiar. Knack: ${familiarType.knack} Play it as a living presence (scouting, comic relief, warnings). In combat the player has a "Familiar: Help" button (advantage on their next attack, once per short rest) — narrate the little creature's harassment when the [SYSTEM] report arrives.`,
                    };
                }

                case 'dismiss_familiar': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const fam = store.character.familiar;
                    if (!fam) return { success: false, error: 'The hero has no familiar.' };
                    d.syncCharacterUpdate({ ...store.character, familiar: undefined });
                    campaignEventLog.append('JOURNAL_UPDATED', `Familiar dismissed: ${fam.name}`, fam);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${sysLine(`${fam.name} disparaît dans un frisson d'éther`, `${fam.name} vanishes in a shiver of ether`)}]*` }]);
                    return { success: true, dismissed: fam.name };
                }

                case 'dismiss_mount': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const currentMount = store.character.mount;
                    if (!currentMount) return { success: false, error: 'The hero has no mount.' };
                    d.syncCharacterUpdate({ ...store.character, mount: undefined });
                    campaignEventLog.append('JOURNAL_UPDATED', `Mount dismissed: ${currentMount.name}`, currentMount);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${currentMount.name} n'accompagne plus le héros]*` }]);
                    return { success: true, dismissed: currentMount.name };
                }

                case 'dismiss_companion': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const compName = stringArg(args.name, 80);
                    const dnNorm = foldText;
                    const comps = store.character.companions || [];
                    const target = comps.find(c => dnNorm(c.name) === dnNorm(compName) || dnNorm(c.name).includes(dnNorm(compName)));
                    if (!target) return { success: false, error: `No companion named "${compName}" in the party.` };
                    d.syncCharacterUpdate({ ...store.character, companions: comps.filter(c => c.id !== target.id) });
                    // Retire-le aussi du combat en cours le cas échéant.
                    if (store.combatState.isActive) {
                        store.setCombatState((prev: any) => ({
                            ...prev,
                            combatants: prev.combatants.filter((c: any) => c.id !== target.id),
                        }));
                    }
                    campaignEventLog.append('JOURNAL_UPDATED', `Companion dismissed: ${target.name}`, { name: target.name });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${target.name} quitte le groupe]*` }]);
                    return { success: true, dismissed: target.name };
                }

                case 'set_time_of_day': {
                    // Le MJ fait avancer l'horloge du monde quand la fiction le dit
                    // (le soir tombe, la nuit passe hors repos…).
                    const rawTime = stringArg(args.timeOfDay || args.time, 20).toLowerCase();
                    const timeMap: Record<string, TimeOfDay> = {
                        dawn: 'dawn', aube: 'dawn', matin: 'dawn', morning: 'dawn',
                        day: 'day', jour: 'day', journee: 'day', 'journée': 'day', midi: 'day', noon: 'day', afternoon: 'day',
                        dusk: 'dusk', crepuscule: 'dusk', 'crépuscule': 'dusk', soir: 'dusk', evening: 'dusk', sunset: 'dusk',
                        night: 'night', nuit: 'night', midnight: 'night', minuit: 'night',
                    };
                    const nextTime = timeMap[rawTime];
                    if (!nextTime) return { success: false, error: `Unknown timeOfDay "${rawTime}". Use dawn|day|dusk|night.` };
                    const addDays = Math.max(0, Math.min(30, Math.trunc(numericArg(args.advanceDays, 0))));
                    useGameStore.getState().setCampaignRuntime(prev => ({
                        ...prev,
                        timeOfDay: nextTime,
                        dayCount: (prev.dayCount || 1) + addDays,
                        updatedAt: Date.now(),
                    }));
                    await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                    const runtimeNow = useGameStore.getState().campaignRuntime;
                    campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', `World time: day ${runtimeNow.dayCount}, ${nextTime}`, { timeOfDay: nextTime, dayCount: runtimeNow.dayCount });
                    return { success: true, dayCount: runtimeNow.dayCount, timeOfDay: nextTime };
                }

                case 'lookup_npc': {
                    // Recall a KNOWN NPC (journal + authored cast). The director
                    // context only carries the 8 most recent journal NPCs, so an
                    // old contact returning after a long arc had no way back into
                    // the DM's head — dispositions and memories went incoherent.
                    const query = stringArg(args.name, 120);
                    if (!query) return { found: false, error: 'lookup_npc requires name' };
                    const lnNorm = foldText;
                    const nq = lnNorm(query);
                    const journalNpcs = (useGameStore.getState().journal.npcs || [])
                        .filter((n: any) => { const nn = lnNorm(n.name); return nn.includes(nq) || nq.includes(nn); })
                        .slice(0, 4)
                        .map((n: any) => ({
                            name: n.name,
                            description: n.description,
                            location: n.location,
                            disposition: n.disposition ?? 0,
                            memories: n.knownFacts || [],
                            lastSeenAt: n.lastSeenAt,
                        }));
                    const authoredCast = ((store.adventureManifestData?.supportingCast || []) as any[])
                        .filter(c => { const cn = lnNorm(c.name); return cn.includes(nq) || nq.includes(cn); })
                        .slice(0, 2)
                        .map(c => ({ name: c.name, role: c.role, description: c.description, location: c.location, personality: c.personality }));
                    if (!journalNpcs.length && !authoredCast.length) {
                        return { found: false, hint: `No NPC matching "${query}" in the journal or authored cast. If they are genuinely new, introduce them with add_npc.` };
                    }
                    return {
                        found: true,
                        npcs: journalNpcs,
                        authoredCast,
                        instruction: 'Play this NPC consistently with their disposition and memories. Commit any relationship change with update_npc.',
                    };
                }

                case 'add_location': {
                    // ou-m5 — nom requis + DÉDUP insensible aux accents (comme
                    // add_npc) : répéter la même taverne créait des doublons.
                    const locName = stringArg(args.name, 160);
                    if (!locName) return { success: false, error: 'add_location requires a non-empty name' };
                    const locNorm = foldText;
                    const existingLoc = (useGameStore.getState().journal.locations || [])
                        .find((l: any) => locNorm(l.name) === locNorm(locName));
                    await syncJournal((prev: any) => ({
                        ...prev,
                        locations: existingLoc
                            ? (prev.locations || []).map((l: any) => l.id === existingLoc.id
                                ? { ...l, description: args.description || l.description }
                                : l)
                            : [...(prev.locations || []), {
                                id: crypto.randomUUID(),
                                name: locName,
                                description: args.description,
                                createdAt: new Date().toISOString()
                            }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Location discovered: ${locName}`, args);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Location ${existingLoc ? 'Updated' : 'Discovered'}: ${locName}]*` }]);
                    return { success: true, updated: Boolean(existingLoc) };
                }

                case 'add_story_moment': {
                    // ou-m5 — titre requis.
                    const momentTitle = stringArg(args.title, 200);
                    if (!momentTitle) return { success: false, error: 'add_story_moment requires a non-empty title' };
                    // DÉDUP (audit 2026-08-21) : c'était le SEUL écrivain du
                    // journal sans garde-fou — le MJ et le greffier re-consignaient
                    // le même moment, et le préfixe [Jn] rendait les doublons
                    // textuellement distincts. On compare sur le titre NU.
                    const bareTitle = (s: string) => foldTitle(String(s || '').replace(/^\[J\d+\]\s*/, ''));
                    const needleMoment = bareTitle(momentTitle);
                    const chronicleNow = useGameStore.getState().journal.chronicle || [];
                    const dupMoment = chronicleNow.slice(-30).find((c: any) => bareTitle(c.title) === needleMoment);
                    if (dupMoment) {
                        return { success: true, duplicate: true, note: 'This moment is already in the chronicle — not logged twice.' };
                    }
                    // [Jn] : chaque moment est daté du jour-monde — la chronique
                    // (et les résumés qui la relisent) gardent l'ordre des faits.
                    const dayTag = `[J${useGameStore.getState().campaignRuntime.dayCount || 1}]`;
                    await syncJournal((prev: any) => ({
                        ...prev,
                        chronicle: [...(prev.chronicle || []), {
                            id: crypto.randomUUID(),
                            title: momentTitle.startsWith('[J') ? momentTitle : `${dayTag} ${momentTitle}`,
                            description: args.description,
                            timestamp: Date.now()
                        }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Story moment: ${momentTitle}`, args);
                    // La chronique du journal n'entre pas dans le contexte
                    // directeur : sans cette ligne, un moment marquant serait
                    // invisible pour la mémoire du MJ. On garde donc le report,
                    // mais réduit au TITRE (audit 2026-08-24, B3) : recopier la
                    // description entière dupliquait, dans une langue différente,
                    // la ligne que le greffier venait d'écrire sur le même beat —
                    // le log plafonné à 200 lignes s'évinçait deux fois plus vite
                    // et le résumeur digérait deux versions du même fait.
                    appendCampaignLog('note', momentTitle);
                    return { success: true };
                }

                case 'grant_xp': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const xpBefore = store.character.xp;
                    // ENEMIES only — allies (companion, rescued NPCs) are !isPlayer
                    // too and must not inflate the XP clamp base.
                    const enemyNames = store.combatState.combatants.filter(c => combatantSide(c) === 'enemy').map(c => c.name);
                    const amount = sanitizeXPGrant(Number(args.amount), enemyNames);
                    // « Awarded 50 XP for undefined » : reason non validée (audit 2026-08-12).
                    const xpReason = stringArg(args.reason, 120) || sysLine('progression', 'progress');
                    d.grantXP(amount, xpReason);
                    campaignEventLog.append('XP_GRANTED', `Awarded ${amount} XP for ${xpReason}`, { amount, reason: xpReason });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Awarded ${amount} XP for ${xpReason}]*` }]);
                    return { success: true, total_xp: xpBefore + amount, amount };
                }

                case 'lookup_spell': {
                    const spell = lookupSpell(String(args.name || args.spellName || ''));
                    return spell ? { success: true, found: true, spell } : { success: false, found: false, error: 'Spell not found in SRD Codex' };
                }

                case 'lookup_rule': {
                    const rule = lookupRule(String(args.name || args.rule || ''));
                    return rule ? { success: true, found: true, rule } : { success: false, found: false, error: 'Rule not found in SRD Codex' };
                }

                case 'lookup_item': {
                    const itemName = String(args.name || args.item || '');
                    const item = lookupItem(itemName);
                    const inventoryItem = store.character?.inventory?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
                    const structured = inventoryItem ? structureInventoryItem(inventoryItem) : item;
                    return structured ? { success: true, found: true, item: structured } : { success: false, found: false, error: 'Item not found in SRD Codex' };
                }

                case 'lookup_condition': {
                    const condition = lookupCondition(String(args.name || args.condition || ''));
                    return condition ? { success: true, found: true, condition } : { success: false, found: false, error: 'Condition not found in SRD Codex' };
                }

                case 'lookup_monster': {
                    const monster = lookupMonster(String(args.name || args.monster || ''));
                    return monster ? { success: true, found: true, monster } : { success: false, found: false, error: 'Monster not found in current bestiary' };
                }

                case 'search_codex': {
                    const entries = searchCodex(args.kind || 'all', String(args.query || ''), Number(args.limit || 10));
                    return { success: true, entries };
                }

                case 'cast_spell': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    // OU5 — même contrat que request_roll : un seul jet à l'écran.
                    // Un cast pendant un jet en attente écrasait le prompt retenu
                    // et gelait le MJ jusqu'au timeout de 90 s.
                    if (useGameStore.getState().activePrompt) {
                        return { success: false, error: 'A roll is already pending on screen. Wait for its result before casting a spell that needs a roll.' };
                    }
                    const spellName = String(args.spellName || args.name || '').trim();
                    if (!spellName) return { success: false, error: 'cast_spell requires spellName' };
                    // ÉCONOMIE D'ACTION À LA VOIX (audit 2026-08-21) : un sort coûte
                    // l'ACTION entière (ou l'action BONUS si Sort accéléré armé),
                    // exactement comme depuis le panneau. Sans ce gate, la voix
                    // permettait des sorts illimités dans un même tour de combat.
                    const quickenedVoiceCast = (store.character.activeEffects || []).some((e: any) => e.name === 'Quickened Spell');
                    if (store.combatState.isActive) {
                        const econ: any = store.combatState.actionEconomy?.['player'] || {};
                        const baseSlices = getPlayerAttackCount(store.character);
                        const mainFree = ((econ.attacksMax ?? baseSlices) - (econ.attacksUsed ?? 0)) >= baseSlices;
                        const bonusFree = ((econ.bonusMax ?? 1) - (econ.bonusUsed ?? 0)) >= 1;
                        if (quickenedVoiceCast ? !bonusFree : !mainFree) {
                            return {
                                success: false,
                                error: quickenedVoiceCast
                                    ? 'Bonus action already spent this turn — Quickened Spell needs a free bonus action. The player can end their turn with the on-screen button.'
                                    : 'No ACTION left this turn: casting a spell costs the full action and the player already spent it (attack, spell, or other action). One leveled spell or cantrip per turn — they can end their turn with the on-screen button.',
                            };
                        }
                    }
                    // Sort de ZONE à la voix : target='all_enemies' → sauvegarde
                    // par ennemi via le résolveur moteur (pas de prompt bloquant).
                    // 'all_combatants' = TIR AMI (audit 2026-08-12 : les alliés
                    // étaient inconditionnellement exclus — une Boule de feu ne
                    // pouvait jamais toucher le compagnon).
                    const aoeMode = String(args.target || args.targets || '').trim().toLowerCase();
                    const aoeRequested = aoeMode === 'all_enemies' || aoeMode === 'all_combatants';
                    const aoeEnemyIds = aoeRequested && store.combatState.isActive
                        ? store.combatState.combatants.filter(c => c.hp.current > 0 && !c.isPlayer
                            && (aoeMode === 'all_combatants' || combatantSide(c) === 'enemy')).map(c => c.id)
                        : [];
                    const targetRef = aoeRequested
                        ? (aoeEnemyIds[0] || '')
                        : String(args.target || '');
                    // autoResolve : plusieurs ennemis du même nom ne doivent plus
                    // faire échouer le sort — on tranche comme pour une attaque.
                    const targetLookup = targetRef && store.combatState.isActive
                        ? resolveCombatantReference(store.combatState, targetRef, { autoResolve: true })
                        : null;
                    if (targetLookup?.ambiguous) {
                        return { success: false, error: 'Ambiguous spell target. Use combatant id.' };
                    }
                    // NF4 — un sort de CONTACT (« Touch ») exige le corps à corps.
                    const touchSpellDef = lookupSpell(spellName);
                    if (touchSpellDef && /^touch$/i.test(String(touchSpellDef.range || ''))
                        && store.combatState.isActive
                        && targetLookup?.combatant && !targetLookup.combatant.isPlayer
                        && (((targetLookup.combatant as any).range || 'melee') !== 'melee')) {
                        return {
                            success: false,
                            error: `${touchSpellDef.name} is a TOUCH spell: the target must be within melee reach (currently ${(targetLookup.combatant as any).range}). Close the distance first, or pick a ranged spell.`,
                        };
                    }
                    const result = castSpell(store.character, {
                        spellName,
                        slotLevel: Number(args.slotLevel || args.slot || 0) || undefined,
                        target: args.target,
                        targetId: targetLookup?.combatant?.id,
                        casterAbility: args.casterAbility,
                        casterAbilityMod: Number.isFinite(Number(args.casterAbilityMod)) ? Number(args.casterAbilityMod) : undefined,
                        spellAttackBonus: Number.isFinite(Number(args.spellAttackBonus)) ? Number(args.spellAttackBonus) : undefined,
                        spellSaveDC: Number.isFinite(Number(args.spellSaveDC || args.saveDC)) ? Number(args.spellSaveDC || args.saveDC) : undefined,
                        targetAC: Number.isFinite(Number(args.targetAC)) ? Number(args.targetAC) : targetLookup?.combatant?.ac,
                        targetSaveBonus: Number.isFinite(Number(args.targetSaveBonus)) ? Number(args.targetSaveBonus) : undefined,
                        worldHour: worldHourOf(store.campaignRuntime.dayCount || 1, store.campaignRuntime.timeOfDay),
                        maximizeHealing: !!store.character.storyMode,
                    });

                    if (!result.success) return { success: false, error: result.error, spell: result.spell?.name };

                    // Dépense de l'action (ou de l'action bonus, Sort accéléré) —
                    // AVANT les branches de résolution : chaque chemin de retour
                    // repart d'un état frais, la dépense est donc visible partout.
                    if (store.combatState.isActive) {
                        const liveCombat = useGameStore.getState().combatState;
                        const econ: any = liveCombat.actionEconomy?.['player'] || {};
                        const spent = quickenedVoiceCast
                            ? { ...econ, bonusUsed: (econ.bonusUsed ?? 0) + 1, bonusActionUsed: ((econ.bonusUsed ?? 0) + 1) >= (econ.bonusMax ?? 1) }
                            : { ...econ, attacksUsed: Math.max(econ.attacksUsed ?? 0, econ.attacksMax ?? getPlayerAttackCount(store.character)), actionUsed: true };
                        store.setCombatState({ ...liveCombat, actionEconomy: { ...(liveCombat.actionEconomy || {}), player: spent } });
                    }

                    d.syncCharacterCritical(result.character, 'hp');

                    // Réponse d'outil AMINCIE : SpellCastResult.character est la fiche
                    // COMPLÈTE (inventaire, sorts, effets) — la sérialiser vers Gemini
                    // à chaque cast coûtait des tokens à chaque sort et gonflait le
                    // contexte. Le MJ n'a besoin que du résumé mécanique.
                    const { character: _castSheet, ...slimResult } = result as any;

                    // CB1 — soin sur une cible NON-joueur : le moteur n'a pas
                    // touché la fiche du lanceur, on applique le soin à la
                    // cible réelle. Avant, « Cure Wounds sur le compagnon »
                    // soignait le joueur et laissait le compagnon à terre.
                    if (result.healing && result.healing > 0 && result.healingTargetsSelf === false) {
                        const victim = targetLookup?.combatant;
                        if (victim && useGameStore.getState().combatState.isActive) {
                            store.setCombatState((prev: any) => ({
                                ...prev,
                                combatants: prev.combatants.map((c: any) => c.id === victim.id
                                    ? { ...c, hp: { ...c.hp, current: Math.min(c.hp.max, c.hp.current + (result.healing || 0)) } }
                                    : c),
                            }));
                            store.pushCombatRoll({ name: `${spellName} → ${victim.name}`, total: result.healing, formula: result.spell?.healing?.dice || 'heal', isDM: true });
                            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} — ${victim.name} +${result.healing} HP]*` }]);
                            campaignEventLog.append('EFFECT_ADDED', `Heal applied to ${victim.name}: +${result.healing}`, { spell: spellName });
                            return {
                                success: true,
                                spell: result.spell,
                                consumedSlot: result.consumedSlot,
                                healing: result.healing,
                                target: victim.name,
                                summary: `${spellName} heals ${victim.name} for ${result.healing} HP.`,
                                instruction: 'Healing is ALREADY applied to the target. Narrate it once — do not re-apply.',
                            };
                        }
                        // Hors combat : compagnon/monture/familier persistant nommé.
                        const compRef = String(args.target || '').trim().toLowerCase();
                        const liveChar = useGameStore.getState().character;
                        const comp = (liveChar?.companions || []).find(c =>
                            c.id.toLowerCase() === compRef || c.name.trim().toLowerCase() === compRef);
                        if (comp && liveChar) {
                            const healedComp = { ...comp, hp: { ...comp.hp, current: Math.min(comp.hp.max, comp.hp.current + (result.healing || 0)) } };
                            d.syncCharacterCritical({
                                ...liveChar,
                                companions: (liveChar.companions || []).map(c => c.id === comp.id ? healedComp : c),
                            }, 'hp');
                            return {
                                success: true,
                                healing: result.healing,
                                target: comp.name,
                                consumedSlot: result.consumedSlot,
                                summary: `${spellName} heals ${comp.name} for ${result.healing} HP (${healedComp.hp.current}/${comp.hp.max}).`,
                                instruction: 'Healing is ALREADY applied to the companion. Narrate it once.',
                            };
                        }
                        // Cible non suivie par le moteur (PNJ narratif) : le soin
                        // reste narratif — le dire clairement au MJ.
                        return {
                            success: true,
                            healing: result.healing,
                            target: args.target,
                            consumedSlot: result.consumedSlot,
                            summary: `${spellName}: ${result.healing} HP of healing for ${args.target} (narrative NPC — no tracked HP; do NOT apply it to the player).`,
                        };
                    }

                    if (aoeRequested && aoeEnemyIds.length && result.prompt?.type === 'SAVE' && result.prompt.pendingSpell) {
                        const aoe = resolveSpellAgainstTargets(useGameStore.getState().combatState, result.prompt, aoeEnemyIds);
                        if (aoe) {
                            store.setCombatState(aoe.state);
                            if (aoe.sharedDamageRoll > 0) {
                                store.setCurrentRoll({ result: aoe.sharedDamageRoll, reason: `${spellName} — dégâts de zone`, isDM: false });
                                await waitDice();
                            }
                            for (const r of aoe.results) {
                                store.pushCombatRoll({ name: `${spellName} → ${r.name}`, total: r.damage, formula: `save ${r.saveTotal} vs DC ${result.prompt.dc}${r.saveSuccess ? ' (réussie)' : ''}`, isDM: true });
                            }
                            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} (zone) — ${aoe.summary}]*` }]);
                            campaignEventLog.append('EFFECT_ADDED', `AoE spell resolved: ${spellName}`, { results: aoe.results });
                            return {
                                success: true,
                                spell: result.spell,
                                consumedSlot: (result as any).consumedSlot,
                                areaResults: aoe.results,
                                summary: aoe.summary,
                                instruction: 'All saves and damage are RESOLVED (listed above). Narrate the blast in ONE beat — never re-roll or re-apply.',
                            };
                        }
                    }

                    // Sort à TOUCHE AUTOMATIQUE (Projectile magique) : aucun jet,
                    // les dégâts s'appliquent directement. Avant, ce sort ne
                    // faisait rien du tout, ni côté joueur ni côté MJ.
                    if (result.autoDamage && useGameStore.getState().combatState.isActive) {
                        const victims = aoeRequested && aoeEnemyIds.length
                            ? aoeEnemyIds
                            : [targetLookup?.combatant?.id || targetRef].filter(Boolean) as string[];
                        const reports: string[] = [];
                        for (const victimId of victims) {
                            // État FRAIS à chaque itération + commit SYNC avant
                            // l'animation : l'ancien commit unique post-boucle
                            // écrasait tout changement concurrent survenu pendant
                            // les waitDice() (audit 2026-08-12, ex-:2446).
                            const liveState = useGameStore.getState().combatState;
                            const applied = applyAutoDamageSpell(liveState, { ...result.autoDamage, targetId: victimId });
                            if (!applied) continue;
                            store.setCombatState(applied.state);
                            store.setCurrentRoll({ result: applied.damage, reason: `${spellName} → ${applied.target.name}`, isDM: false });
                            await waitDice();
                            store.pushCombatRoll({ name: `${spellName} → ${applied.target.name}`, total: applied.damage, formula: result.autoDamage.damageFormula, isDM: false });
                            reports.push(`${applied.target.name}: ${applied.damage}`);
                        }
                        if (reports.length) {
                            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${spellName} — ${reports.join(', ')}]*` }]);
                            campaignEventLog.append('EFFECT_ADDED', `Auto-hit spell resolved: ${spellName}`, { reports });
                            return {
                                success: true,
                                spell: result.spell,
                                consumedSlot: (result as any).consumedSlot,
                                summary: `${spellName} auto-hit: ${reports.join(', ')}`,
                                instruction: 'This spell ALWAYS hits — damage is already applied. Narrate it once; never roll to hit or re-apply damage.',
                            };
                        }
                    }

                    if (result.prompt) {
                        if (targetLookup?.combatant && result.prompt.pendingSpell) {
                            result.prompt.pendingSpell.targetId = targetLookup.combatant.id;
                            result.prompt.pendingSpell.target = targetLookup.combatant.name;
                            if (result.prompt.type === 'ATTACK') result.prompt.dc = targetLookup.combatant.ac;
                        }
                        store.setActivePrompt(result.prompt);
                        campaignEventLog.append('ROLL_REQUESTED', `Spell roll requested: ${result.prompt.name}`, { ...result.prompt, resolveToolCall: undefined });
                    }
                    campaignEventLog.append('EFFECT_ADDED', `Spell cast through SRD Codex: ${result.spell?.name}`, result);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${result.summary}]*` }]);
                    if (result.prompt) {
                        // Same blocking contract as request_roll: hold the tool
                        // response until the spell's attack/save roll lands so the
                        // DM cannot pre-narrate the hit or the save.
                        return await holdForRollResolution(result.prompt, { ...slimResult, prompt: { ...result.prompt } });
                    }
                    return slimResult;
                }

                case 'apply_condition': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const conditionName = String(args.condition || args.name || '');
                    const targetName = stringArg(args.target || args.targetName || '', 120);
                    const targetsPlayer = !targetName
                        || targetName.toLowerCase() === 'player'
                        || targetName.toLowerCase() === store.character.name.toLowerCase();
                    // Concentration d'un PNJ lanceur (audit 2026-08-12) : si le MJ
                    // fournit concentrationBy, l'effet est LIÉ au lanceur — des
                    // dégâts sur lui déclencheront le CON save et lèveront l'effet.
                    const linkNpcConcentration = (effectName: string, targetId?: string) => {
                        const casterRef = stringArg(args.concentrationBy, 120);
                        if (!casterRef) return;
                        const live = useGameStore.getState().combatState;
                        if (!live.isActive) return;
                        const casterLookup = resolveCombatantReference(live, casterRef, { autoResolve: true });
                        if (!casterLookup.combatant || casterLookup.combatant.isPlayer) return;
                        store.setCombatState((prev: any) => ({
                            ...prev,
                            combatants: prev.combatants.map((c: any) => c.id === casterLookup.combatant!.id
                                ? { ...c, concentratingOn: { effectName, targetId } }
                                : c),
                        }));
                    };
                    if (store.combatState.isActive && targetName && !targetsPlayer) {
                        const appliedToEncounter = applyConditionToEncounter(store.combatState, targetName, conditionName);
                        if (!appliedToEncounter.found) {
                            return {
                                success: false,
                                error: appliedToEncounter.ambiguous ? 'Condition target is ambiguous. Use combatant id.' : 'Condition or target not found.',
                            };
                        }
                        store.setCombatState(appliedToEncounter.state);
                        linkNpcConcentration(appliedToEncounter.condition?.name || conditionName, appliedToEncounter.target?.id);
                        campaignEventLog.append('EFFECT_ADDED', `Condition applied to ${appliedToEncounter.target?.name}: ${appliedToEncounter.condition?.name}`, appliedToEncounter.condition);
                        return { success: true, target: appliedToEncounter.target, condition: appliedToEncounter.condition, effect: appliedToEncounter.effect };
                    }

                    // OU2 — hors combat, une cible non-joueur n'est pas suivie
                    // par le moteur : erreur claire au lieu du fallback qui
                    // appliquait la condition au HÉROS (« le garde est
                    // empoisonné » empoisonnait le joueur).
                    if (targetName && !targetsPlayer) {
                        return {
                            success: false,
                            error: `Target "${targetName}" is not a tracked combatant (no active combat). The condition was NOT applied to anyone — track it narratively, or apply it during combat.`,
                        };
                    }

                    const applied = applyConditionToCharacter(store.character, conditionName);
                    if (!applied.found) return { success: false, error: 'Condition not found in SRD Codex' };
                    d.syncCharacterCritical(applied.character, 'hp');
                    // Effet posé sur le HÉROS par un lanceur ennemi qui se concentre.
                    linkNpcConcentration(
                        applied.condition?.name || conditionName,
                        useGameStore.getState().combatState.combatants.find((c: any) => c.isPlayer)?.id
                    );
                    campaignEventLog.append('EFFECT_ADDED', `Condition applied: ${applied.condition?.name}`, applied.condition);
                    return { success: true, condition: applied.condition, effect: applied.effect };
                }

                // CB6 — l'inverse d'apply_condition, qui n'existait pas : aucune
                // manière de guérir un poison ou de briser une paralysie avant
                // le repos long. Alias remove_effect pour les effets nommés.
                // (L'alias non déclaré `remove_effect` a été retiré : jamais
                // atteignable — le modèle ne connaît que les outils déclarés.)
                case 'remove_condition': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const effectName = String(args.condition || args.effect || args.name || '').trim();
                    if (!effectName) return { success: false, error: 'remove_condition requires a condition/effect name' };
                    const canonical = lookupCondition(effectName)?.name || effectName;
                    const matchesEffect = (e: any) => {
                        const n = String(e?.name || '').toLowerCase();
                        return n === canonical.toLowerCase() || n === effectName.toLowerCase();
                    };
                    const rmTargetName = stringArg(args.target || args.targetName || '', 120);
                    const rmTargetsPlayer = !rmTargetName
                        || rmTargetName.toLowerCase() === 'player'
                        || rmTargetName.toLowerCase() === store.character.name.toLowerCase();

                    if (store.combatState.isActive && rmTargetName && !rmTargetsPlayer) {
                        const lookup = resolveCombatantReference(store.combatState, rmTargetName, { autoResolve: true });
                        if (!lookup.combatant) return { success: false, error: 'Target not found in combat.' };
                        const row = lookup.combatant;
                        if (!(row.activeEffects || []).some(matchesEffect)) {
                            return { success: false, error: `${row.name} has no active effect named "${effectName}".` };
                        }
                        store.setCombatState((prev: any) => ({
                            ...prev,
                            combatants: prev.combatants.map((c: any) => c.id === row.id
                                ? { ...c, activeEffects: (c.activeEffects || []).filter((e: any) => !matchesEffect(e)) }
                                : c),
                        }));
                        campaignEventLog.append('EFFECT_ADDED', `Condition removed from ${row.name}: ${canonical}`, { name: canonical });
                        return { success: true, target: row.name, removed: canonical };
                    }

                    // Joueur : fiche + ligne de combat en miroir.
                    const liveChar = useGameStore.getState().character!;
                    const sheetHad = (liveChar.activeEffects || []).some(matchesEffect);
                    const rowHad = store.combatState.isActive
                        && ((store.combatState.combatants.find(c => c.isPlayer)?.activeEffects || []) as any[]).some(matchesEffect);
                    if (!sheetHad && !rowHad) {
                        return { success: false, error: `No active effect named "${effectName}" on the player.` };
                    }
                    if (sheetHad) {
                        d.syncCharacterCritical({
                            ...liveChar,
                            activeEffects: (liveChar.activeEffects || []).filter(e => !matchesEffect(e)),
                        }, 'hp');
                    }
                    if (rowHad) {
                        store.setCombatState((prev: any) => ({
                            ...prev,
                            combatants: prev.combatants.map((c: any) => c.isPlayer
                                ? { ...c, activeEffects: ((c.activeEffects || []) as any[]).filter(e => !matchesEffect(e)) }
                                : c),
                        }));
                    }
                    campaignEventLog.append('EFFECT_ADDED', `Condition removed from player: ${canonical}`, { name: canonical });
                    return { success: true, target: 'player', removed: canonical };
                }

                case 'build_encounter': {
                    const character = store.character;
                    const encounter = buildEncounter({
                        partyLevel: Number(args.partyLevel || character?.level || 1),
                        partySize: Number(args.partySize || 1),
                        difficulty: args.difficulty || 'medium',
                        biome: args.biome,
                        role: args.role,
                        theme: args.theme,
                        maxMonsters: Number(args.maxMonsters || 4),
                    });

                    // TP8 (contre-audit) — Gemini envoie des booléens en chaîne (« "false" »
                    // est truthy) : le patron optionalBoolean est déjà utilisé sur 4 des 6
                    // paramètres BOOLEAN du projet, celui-ci y échappait.
                    if (optionalBoolean(args.startNow) === true && character && encounter.monsters.length) {
                        let state = startEncounter(character, store.combatState);
                        for (const monster of encounter.monsters) {
                            const added = addEnemyToEncounter(state, {
                                name: monster.name,
                                hp: monster.hp,
                                ac: monster.ac,
                                // Audit 2026-08-21 : le chemin budgété perdait le niveau —
                                // les PV par défaut d'un homebrew retombaient au plancher.
                                partyLevel: character.level,
                            });
                            state = added.state;
                        }
                        store.setCombatState(state);
                        if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
                        const mainEnemy = encounter.monsters[0]?.name || 'hostile forces';
                        scheduleCombatImageOnce(mainEnemy, store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Encounter started from Codex: ${encounter.monsters.map(m => m.name).join(', ')}]*` }]);
                    }

                    campaignEventLog.append('ENCOUNTER_STARTED', 'Encounter built from SRD Codex and current bestiary', encounter);
                    return { success: true, encounter };
                }

                case 'request_branch_plan': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const request = buildBranchWriterRequest({
                        campaignTitle: store.selectedAdventure || 'unknown adventure',
                        language: store.language === 'fr' ? 'French' : 'English',
                        character: store.character,
                        adventureManifest: store.adventureManifest,
                        journal: store.journal,
                        events: campaignEventLog.getEvents(),
                        combatActive: Boolean(store.combatState.isActive),
                        reason: String(args.reason || args.deviationReason || 'The player moved away from the current planned path.'),
                        intent: String(args.playerIntent || args.intent || 'Unknown player intent'),
                        severity: args.severity,
                        currentChapter: args.currentChapter || store.campaignRuntime.currentChapterId,
                        currentObjective: args.currentObjective || store.campaignRuntime.currentObjective,
                        targetReconnect: args.targetReconnect,
                    });
                    const branchPlan = await generateSubBranchPlan(request);
                    const activeBranch = useGameStore.getState().activateBranch(branchPlan);
                    const nextRuntime = useGameStore.getState().campaignRuntime;
                    await saveService.updateCampaignRuntime(nextRuntime, campaignEventLog.getEvents());
                    const digest = buildSubBranchDigest(activeBranch);
                    campaignEventLog.append('BRANCH_PLANNED', `Branch planned: ${activeBranch.branchTitle}`, {
                        request,
                        branchPlan: activeBranch,
                        digest,
                    });
                    return {
                        success: true,
                        branchId: activeBranch.id,
                        branchTitle: activeBranch.branchTitle,
                        digest,
                        instruction: 'Private planning only. Do not read aloud. Do not call request_roll from this branch response; wait for a concrete player action with risk and consequence.',
                    };
                }

                case 'set_campaign_position': {
                    // DC1 (audit trame) — avancement de position VALIDÉ. L'ancien
                    // chemin (params optionnels d'update_campaign_runtime, match
                    // strict par id) échouait en silence → le contexte ramenait le
                    // MJ au chapitre 1 à vie. Ici : fuzzy id/titre/numéro, erreur
                    // explicite avec les ids valides, chapitres antérieurs marqués
                    // completed, digest FIGÉ du chapitre clos lancé en fond.
                    const manifest = useGameStore.getState().adventureManifestData;
                    const chapters = manifest?.chapters || [];
                    if (!chapters.length) return { success: false, error: 'No campaign manifest loaded — set_campaign_position only applies to authored campaigns.' };

                    const wanted = foldText(stringArg(args.chapterId, 120));
                    const wantedNum = Number(String(args.chapterId).replace(/[^\d]/g, ''));
                    // Ordre de priorité STRICT (bug prouvé le 2026-08-20 : les ids
                    // de chapitre sont des nombres nus « 1 »…« 12 », et l'ancienne
                    // clause `wanted.includes(c.id)` faisait matcher « 12 » sur le
                    // chapitre « 1 » — findIndex rendait le PREMIER match, donc les
                    // chapitres 10+ étaient inatteignables et la campagne
                    // rembobinait au chapitre 1 en réécrivant tous les statuts).
                    // 1) id exact  2) numéro de chapitre  3) sous-chaîne de titre,
                    // et seulement pour une requête d'au moins 4 caractères — un
                    // chiffre nu ne peut plus matcher par sous-chaîne.
                    const findChapter = (): number => {
                        const exact = chapters.findIndex((c: any) => foldText(c.id) === wanted);
                        if (exact >= 0) return exact;
                        const numericIndex = Number.isFinite(wantedNum) && wantedNum >= 1 && wantedNum <= chapters.length
                            ? wantedNum - 1 : -1;
                        // Requête purement numérique (« 13 ») → c'est un numéro.
                        if (!/[a-z]/.test(wanted)) return numericIndex;
                        if (wanted.length >= 4) {
                            // Titre AVANT le numéro : « Les 7 Portes » ne doit pas
                            // atterrir sur le chapitre 7.
                            const byTitle = chapters.findIndex((c: any) => foldText(c.title || '').includes(wanted));
                            if (byTitle >= 0) return byTitle;
                            const byId = chapters.findIndex((c: any) => foldText(c.id).length >= 4 && wanted.includes(foldText(c.id)));
                            if (byId >= 0) return byId;
                        }
                        return numericIndex; // « chapitre 13 », « ch13 »
                    };
                    const chapterIndex = findChapter();
                    if (chapterIndex < 0) {
                        return {
                            success: false,
                            // Même leçon que pour les scènes : l'erreur ne montre que
                            // les identifiants nus, jamais un format décoratif que le
                            // modèle recopierait tel quel.
                            error: `Unknown chapter "${args.chapterId}". Pass the bare chapter id, one of: ${chapters.map((c: any) => c.id).join(', ')}.`,
                        };
                    }
                    const chapter: any = chapters[chapterIndex];
                    let sceneId: string | undefined;
                    if (args.sceneId) {
                        // TR9 (audit de séance du 2026-08-23) — `chapterId` teste les
                        // DEUX sens (le titre contient la requête, ET la requête
                        // contient l'id) ; `sceneId` n'en testait qu'un. Le MJ envoyait
                        // « 1a - Les Quais d'Os » — ni l'id nu, ni le titre nu — et se
                        // faisait refuser, alors que la réponse était dans la chaîne.
                        // Pire, le message d'erreur listait les scènes au format
                        // `1a ("Titre")` : il a recopié ce format et échoué une seconde
                        // fois. On aligne l'appariement, et l'erreur ne montre plus que
                        // les identifiants nus.
                        const scenes = (chapter.scenes || []) as any[];
                        const sceneIndex = resolveSceneIndex(scenes, stringArg(args.sceneId, 120));
                        const scene = sceneIndex >= 0 ? scenes[sceneIndex] : undefined;
                        if (!scene) {
                            const validIds = scenes.map((s, i) => s.id || `#${i + 1}`).join(', ') || 'none';
                            return {
                                success: false,
                                error: `Unknown scene "${args.sceneId}" in chapter ${chapter.id}. Pass the bare scene id, one of: ${validIds}.`,
                            };
                        }
                        // Scène générée sans id : on retient son rang, pour que la
                        // position reste résoluble au tour suivant.
                        sceneId = scene.id || String(sceneIndex + 1);
                    }

                    const prevRuntime = useGameStore.getState().campaignRuntime;
                    const prevChapterId = prevRuntime.currentChapterId;
                    const isAdvance = prevChapterId && prevChapterId !== chapter.id;

                    // GARDE-FOU (A1) — re-poser la scène d'OUVERTURE alors que la
                    // partie a visiblement avancé est presque toujours une erreur
                    // de recopie du MJ, et elle rembobine tous les statuts de
                    // chapitre. Séance du 23/08 : la position est restée sur 1/1a
                    // pendant six jours-monde et neuf niveaux, vilain déjà mort,
                    // et le seul appel de la séance l'y a REMISE. On refuse, en
                    // disant où l'on croit être — le MJ peut toujours insister en
                    // nommant un autre chapitre.
                    const looksLikeRewind = isAtOpening(manifest, { ...prevRuntime, currentChapterId: chapter.id, currentSceneId: sceneId } as any)
                        && !isAtOpening(manifest, prevRuntime)
                        && (prevRuntime.dayCount || 1) > 1;
                    if (looksLikeRewind) {
                        return {
                            success: false,
                            rewindRefused: true,
                            currentChapterId: prevChapterId || null,
                            error: `Refused: that is the campaign's OPENING scene, and the party is already on day ${prevRuntime.dayCount} at chapter ${prevChapterId || '?'}. Re-posting the opening would rewind every chapter status. If the story genuinely moved BACK to an earlier chapter, pass that chapter's id explicitly; otherwise pass the chapter you are actually in.`,
                        };
                    }

                    // Statuts : les chapitres avant l'index deviennent completed,
                    // celui-ci active — le contexte directeur suit enfin la trame.
                    useGameStore.getState().setAdventureManifest(useGameStore.getState().adventureManifest, {
                        ...manifest!,
                        chapters: chapters.map((c: any, i: number) => ({
                            ...c,
                            status: i < chapterIndex ? 'completed' : i === chapterIndex ? 'active' : (c.status === 'completed' ? 'completed' : 'pending'),
                        })),
                    });
                    const region = stringArg(args.region, 80);
                    useGameStore.getState().setCampaignRuntime(prev => ({
                        ...prev,
                        currentChapterId: chapter.id,
                        currentSceneId: sceneId ?? (prev.currentChapterId === chapter.id ? prev.currentSceneId : undefined),
                        ...(region ? { currentRegion: region } : {}),
                        // A3 — l'objectif improvisé d'un chapitre survivait à TOUS
                        // les suivants : il prime sur l'objectif d'auteur dans le
                        // bloc directeur ET alimente le contrôle de dérive
                        // narrative, qui ré-ancrait donc le MJ sur un but périmé.
                        // Il appartient au chapitre qui l'a posé.
                        ...(isAdvance ? { currentObjective: undefined } : {}),
                        // A2 — le fait canon d'ouverture, semé à la création,
                        // occupait une des quatre premières places affichées
                        // jusqu'au dénouement. Dès qu'on quitte l'ouverture, il a
                        // dit tout ce qu'il avait à dire.
                        canonFacts: isAdvance ? stripOpeningCanonFact(prev.canonFacts) : prev.canonFacts,
                        updatedAt: Date.now(),
                    }));
                    appendCampaignLog('note', `Chapter position: now at ${chapter.id} "${chapter.title}"${sceneId ? `, scene ${sceneId}` : ''}${region ? ` (${region})` : ''}`);

                    // Chapitre quitté → digest figé GARANTI (service idempotent qui
                    // absorbe aussi les entrées orphelines des vieilles sauvegardes),
                    // puis rattrapage d'éventuels digests manqués (échec réseau passé,
                    // ancien chemin d'outil). Le résumé roulant repart à zéro : le
                    // passé du chapitre clos appartient désormais à son digest.
                    if (isAdvance) {
                        useGameStore.getState().setCampaignRuntime(prev => ({ ...prev, currentChapterSummary: '', updatedAt: Date.now() }));
                        const closed: any = chapters.find((c: any) => c.id === prevChapterId);
                        void freezeChapterDigest(prevChapterId!, closed ? `${closed.id} — ${closed.title}` : prevChapterId!)
                            .then(() => reconcileMissingDigests())
                            .catch(() => { /* le reconcile de la prochaine session rattrapera */ });
                    }

                    const nextRuntime = useGameStore.getState().campaignRuntime;
                    await saveService.updateCampaignRuntime(nextRuntime);
                    campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', `Position: ${chapter.id}${sceneId ? `/${sceneId}` : ''}`, { chapterId: chapter.id, sceneId });
                    return { success: true, chapterId: chapter.id, chapterTitle: chapter.title, sceneId: sceneId || null, previousChapter: prevChapterId || null };
                }

                case 'update_campaign_runtime': {
                    // DC1-bis (audit) — porte dérobée FERMÉE : un changement de
                    // chapitre/scène passé par cet outil est redirigé vers la
                    // logique validée (fuzzy, statuts, digest figé). Les params ont
                    // été retirés du schéma exposé au MJ ; ceci absorbe les vieilles
                    // habitudes du modèle sans perdre l'intention.
                    {
                        const chapterArg = stringArg(args.currentChapterId || args.chapterId, 120);
                        const sceneArg = stringArg(args.currentSceneId || args.sceneId, 120);
                        if (chapterArg || sceneArg) {
                            const fallbackChapter = useGameStore.getState().campaignRuntime.currentChapterId;
                            if (chapterArg || fallbackChapter) {
                                await processToolCall({ name: 'set_campaign_position', args: { chapterId: chapterArg || fallbackChapter, sceneId: sceneArg || undefined } });
                            }
                        }
                    }
                    const allowedBranchStatuses = new Set(['active', 'resolved', 'abandoned', 'merged_into_main']);
                    const allowedClockStatuses = new Set(['active', 'paused', 'resolved']);
                    const branchStatus = stringArg(args.branchStatus || args.activeBranchStatus, 80);
                    const now = Date.now();

                    useGameStore.getState().setCampaignRuntime(prev => {
                        let activeBranch = prev.activeBranch;
                        let branchHistory = prev.branchHistory || [];

                        if (branchStatus && activeBranch && allowedBranchStatuses.has(branchStatus)) {
                            const updatedBranch = { ...activeBranch, status: branchStatus as any };
                            branchHistory = [
                                ...branchHistory.filter(branch => branch.id !== updatedBranch.id),
                                updatedBranch,
                            ].slice(-20);
                            activeBranch = ['resolved', 'abandoned', 'merged_into_main'].includes(branchStatus) ? null : updatedBranch;
                        }

                        let worldClocks = prev.worldClocks || [];
                        const worldClockName = stringArg(args.worldClockName || args.clockName, 140);
                        if (worldClockName) {
                            const existing = worldClocks.find(clock => clock.name.toLowerCase() === worldClockName.toLowerCase());
                            const maxStage = Math.max(1, numericArg(args.worldClockMaxStage ?? args.clockMaxStage ?? existing?.maxStage, 6));
                            const stage = Math.max(0, Math.min(maxStage, numericArg(args.worldClockStage ?? args.clockStage ?? existing?.stage, 0)));
                            const status = stringArg(args.worldClockStatus || args.clockStatus || existing?.status || 'active', 80);
                            const updatedClock = {
                                id: existing?.id || clockId(worldClockName),
                                name: worldClockName,
                                // 340 = le budget du contexte directeur (trimText) —
                                // à 260, la description PRÉSERVÉE d'une horloge
                                // d'auteur perdait ses paliers hauts au premier
                                // update (Chant Brisé 289-338, Portes 309-325).
                                description: stringArg(args.worldClockDescription || args.clockDescription || existing?.description || '', 340),
                                stage,
                                maxStage,
                                status: allowedClockStatuses.has(status) ? status as any : 'active',
                                updatedAt: now,
                            };
                            worldClocks = [
                                ...worldClocks.filter(clock => clock.id !== updatedClock.id),
                                updatedClock,
                            ].slice(-12);
                        }

                        return {
                            ...prev,
                            // chapitre/scène : déjà appliqués par la redirection
                            // set_campaign_position ci-dessus — prev les porte.
                            currentObjective: stringArg(args.currentObjective || args.objective, 260) || prev.currentObjective,
                            activeBranch,
                            branchHistory,
                            canonFacts: uniqueAppend(prev.canonFacts || [], [
                                ...stringListArg(args.canonFact),
                                ...stringListArg(args.canonFacts),
                            ].map(fact => fact.startsWith('[J') ? fact : `[J${prev.dayCount || 1}] ${fact}`)),
                            protectedSecrets: uniqueAppend(prev.protectedSecrets || [], [
                                ...stringListArg(args.protectedSecret),
                                ...stringListArg(args.protectedSecrets),
                            ]),
                            worldClocks,
                            updatedAt: now,
                        };
                    });

                    const nextRuntime = useGameStore.getState().campaignRuntime;
                    await saveService.updateCampaignRuntime(nextRuntime);
                    campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', 'Campaign runtime updated', {
                        args,
                        runtime: nextRuntime,
                    });
                    return { success: true, campaignRuntime: nextRuntime };
                }

                case 'grant_story_modifier':
                case 'grant_inspiration':
                case 'apply_complication': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const modifier = normalizeStoryModifier({
                        ...args,
                        ...(name === 'grant_inspiration' ? { source: 'dm_inspiration', mode: args.mode || 'advantage', bonus: args.bonus ?? 0 } : {}),
                        ...(name === 'apply_complication' ? { source: 'complication', mode: args.mode || 'disadvantage', bonus: args.bonus ?? 0 } : {}),
                    });
                    const char = {
                        ...store.character,
                        storyModifiers: [...(store.character.storyModifiers || []), modifier].slice(-8),
                    };
                    d.syncCharacterCritical(char, 'hp');
                    campaignEventLog.append('EFFECT_ADDED', `Story modifier granted: ${modifier.name}`, modifier);
                    store.setTranscript(prev => [...prev, {
                        speaker: 'dm',
                        text: `*[SYSTEM: ${modifier.name} active for ${modifier.remainingUses} roll(s): ${modifier.mode}${modifier.bonus ? ` ${modifier.bonus > 0 ? '+' : ''}${modifier.bonus}` : ''}]*`
                    }]);
                    return { success: true, modifier };
                }

                case 'trigger_scene_image': {
                    // description non validée → prompt « undefined Wide establishing
                    // shot… » envoyé au serveur d'images (audit 2026-08-12).
                    const sceneDesc = stringArg(args.description, 600);
                    if (!sceneDesc) return { success: false, error: 'trigger_scene_image requires a description (2-3 sentences, English).' };
                    scheduleSceneImage(buildSceneImagePrompt(sceneDesc, scenePromptOptions()), {
                        kind: 'scene_image',
                        phase: args.phase || 'exploration',
                        summary: 'Scene image generated',
                    });
                    campaignEventLog.append('SCENE_CHANGED', 'Scene visual requested', args);
                    return { success: true };
                }

                case 'trigger_combat_image': {
                    // scheduleCombatImageOnce derives charInfo internally — no 3rd arg.
                    // Caps 300 : non plafonnés, un MJ verbeux dépassait la limite
                    // de 1200 caractères du proxy Firebase (audit prompts images).
                    scheduleCombatImageOnce(stringArg(args.enemy, 300) || 'enemies', stringArg(args.location, 300) || 'current battlefield');
                    campaignEventLog.append('SCENE_CHANGED', `Combat visual requested: ${args.enemy}`, args);
                    return { success: true };
                }

                case 'trigger_visual': {
                    const visualDesc = stringArg(args.description, 600);
                    if (!visualDesc) return { success: false, error: 'trigger_visual requires a description (2-3 sentences, English).' };
                    // Builder MOMENT, pas SCENE : un trigger_visual peut être un
                    // gros plan — pas de héros parachuté ni de « Wide
                    // establishing shot » qui contredirait le cadrage du MJ.
                    scheduleSceneImage(buildMomentImagePrompt(visualDesc, scenePromptOptions()), {
                        kind: 'moment_image',
                        phase: args.phase || (store.combatState.isActive ? 'combat' : 'story'),
                        summary: 'Story moment image generated',
                    });
                    campaignEventLog.append('SCENE_CHANGED', 'Moment visual requested', args);
                    return { success: true };
                }

                case 'set_music_mood': {
                    if (d.musicDirector) d.musicDirector.handleMusicTag(args.mood);
                    campaignEventLog.append('MUSIC_CHANGED', `Music mood requested: ${args.mood}`, args);
                    return { success: true };
                }

                case 'trigger_sfx': {
                    const bankKey = String(args.key || '').trim();
                    const description = String(args.description || args.sound || args.prompt || '').trim();
                    const requested = bankKey || description;
                    if (!requested) return { success: false, error: 'Missing sound key' };
                    // 2026-08-20 — banque de 601 sons SEULE : la génération
                    // Stable Audio est DÉBRANCHÉE (le serveur reste sur disque,
                    // plus rien ne l'appelle). La résolution fuzzy de la banque
                    // absorbe les descriptions libres vers la clé la plus proche ;
                    // sans correspondance, silence — pas de GPU.
                    void sfxLibrary.playKey(requested).then(resolved => {
                        if (resolved && resolved !== 'muted') {
                            campaignEventLog.append('ASSET_GENERATED', `Bank SFX: ${resolved}`, { kind: 'bank_sfx', requested, resolved });
                        }
                    });
                    return { success: true };
                }

                case 'short_rest': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    // If the DM didn't specify hit dice, auto-spend enough to cover
                    // missing HP — otherwise a short rest would heal nothing.
                    const c0 = store.character;
                    let spend = Number(args.spendHitDice);
                    if (!Number.isFinite(spend) || spend <= 0) {
                        const hd: any = (c0 as any).hitDice;
                        const remaining = hd?.remaining ?? Math.max(1, Math.floor((c0.level || 1) / 2));
                        const missing = c0.hp.max - c0.hp.current;
                        const dieAvg = ((hd?.die ?? 8) / 2) + 1;
                        spend = missing > 0 ? Math.max(0, Math.min(remaining, Math.ceil(missing / dieAvg))) : 0;
                    }
                    const char = applyShortRest(c0, spend);
                    d.syncCharacterCritical(char, 'hp');
                    // Un repos court fait avancer le moment de la journée.
                    useGameStore.getState().setCampaignRuntime(prev => {
                        const steps: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
                        const idx = steps.indexOf(prev.timeOfDay || 'day');
                        return { ...prev, timeOfDay: steps[Math.min(steps.length - 1, idx + 1)], updatedAt: Date.now() };
                    });
                    void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                    campaignEventLog.append('JOURNAL_UPDATED', 'Short rest completed', {
                        hp: char.hp,
                        resources: char.resources,
                        hitDice: char.hitDice,
                    });
                    if (d.musicDirector) d.musicDirector.handleRestMusic(false);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Short rest completed]*` }]);
                    return { success: true, hp: char.hp, resources: char.resources, hitDice: char.hitDice, timeOfDay: useGameStore.getState().campaignRuntime.timeOfDay };
                }

                case 'long_rest': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    // PL13 — garde anti-DOUBLE (partagée avec le bouton) : le MJ
                    // vocal ré-appelait parfois long_rest en re-narrant la nuit.
                    const lastLongRestAt = Number((useGameStore.getState().campaignRuntime as any).lastLongRestAt || 0);
                    if (lastLongRestAt && Date.now() - lastLongRestAt < 5 * 60_000) {
                        return {
                            success: false,
                            alreadyRested: true,
                            error: 'A long rest JUST completed — the party is already fully rested at dawn. Do not rest again; continue the story from the morning.',
                        };
                    }
                    useGameStore.getState().setCampaignRuntime(prev => ({ ...prev, lastLongRestAt: Date.now(), updatedAt: Date.now() } as any));
                    const char = applyLongRest(store.character);
                    d.syncCharacterCritical(char, 'hp');
                    // Une nuit passe : jour +1, réveil à l'aube (le calendrier suit).
                    useGameStore.getState().setCampaignRuntime(prev => ({
                        ...prev,
                        dayCount: (prev.dayCount || 1) + 1,
                        timeOfDay: 'dawn',
                        updatedAt: Date.now(),
                    }));
                    // ou-m2 — persistance IMMÉDIATE du jour+1/aube (comme
                    // short_rest) : sans horloge active, l'autosave 60 s était
                    // le seul filet et une fermeture rapide perdait la nuit.
                    void saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                    campaignEventLog.append('JOURNAL_UPDATED', 'Long rest completed', {
                        hp: char.hp,
                        resources: char.resources,
                        spellSlots: char.spellSlots,
                        hitDice: char.hitDice,
                    });
                    if (d.musicDirector) d.musicDirector.handleRestMusic(true);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Long rest completed]*` }]);

                    // AUTONOMOUS WORLD CLOCKS: a long rest means a night passes — every
                    // active clock ticks +1 mechanically. Without this, a clock the DM
                    // forgets to advance by hand is a dead clock and the world stops
                    // feeling like it moves on its own.
                    // A4 — implémentation UNIQUE partagée avec le bouton de repos
                    // du joueur : le tic respecte le barème déclaré par chaque
                    // horloge, et ne rapporte que celles qui BOUGENT (une horloge
                    // déjà au maximum réclamait sa conséquence chaque nuit).
                    let clocksAdvanced: ReturnType<typeof advanceClocksForNight>['ticked'] = [];
                    {
                        const before = useGameStore.getState().campaignRuntime.worldClocks || [];
                        const result = advanceClocksForNight(before);
                        clocksAdvanced = result.ticked;
                        if (clocksAdvanced.length) {
                            useGameStore.getState().setCampaignRuntime(prev => ({
                                ...prev,
                                worldClocks: advanceClocksForNight(prev.worldClocks).clocks,
                                updatedAt: Date.now(),
                            }));
                            await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                            campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', `World clocks advanced by long rest: ${clocksAdvanced.map(c => `${c.name} ${c.stage}/${c.maxStage}`).join(', ')}`, { clocksAdvanced });
                        }
                    }

                    return {
                        success: true, hp: char.hp, resources: char.resources, spellSlots: char.spellSlots, hitDice: char.hitDice,
                        ...(clocksAdvanced.length ? {
                            worldClocksAdvanced: clocksAdvanced,
                            clockInstruction: `A night has passed: ${clocksAdvanced.map(c => `"${c.name}" is now ${c.stage}/${c.maxStage}${c.reachedMax ? ' (FINAL STAGE REACHED — trigger its consequence now)' : ''}`).join('; ')}. Weave visible signs of this progression into the morning's narration.`,
                        } : {}),
                    };
                }

                case 'add_effect': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    // GARDE ANTI-CONTOURNEMENT (audit 2026-08-21) : un sort À NIVEAU
                    // du grimoire posé en « effet » sur le joueur (Bénédiction,
                    // Bouclier…) esquivait l'emplacement et la concentration. Les
                    // effets d'un sort ENNEMI sur le joueur passent, eux, par
                    // apply_condition/consorts — et un buff ennemi sur lui-même ne
                    // cible pas le joueur, donc pas de faux positif ici.
                    {
                        const fxName = String(args.name || '').trim();
                        const fxTargetRef = String(args.target || '').trim().toLowerCase();
                        const fxTargetsPlayer = !fxTargetRef || fxTargetRef === 'player'
                            || fxTargetRef === store.character.name.toLowerCase();
                        if (fxName && fxTargetsPlayer) {
                            const ownLeveled = [
                                ...(store.character.knownSpells || []),
                                ...(store.character.preparedSpells || []),
                            ];
                            const fxFolded = foldText(fxName);
                            const fxCodex = lookupSpell(fxName);
                            const fxSpellMatch = ownLeveled.find(s => foldText(s) === fxFolded)
                                || (fxCodex && ownLeveled.find(s => foldText(s) === foldText(fxCodex.name)) ? fxCodex.name : undefined);
                            if (fxSpellMatch) {
                                return {
                                    success: false,
                                    error: `"${fxName}" is a REAL leveled spell in the player's spellbook. Do NOT apply it as a free effect — call cast_spell (slot, concentration and duration apply).`,
                                };
                            }
                        }
                    }
                    // Cible optionnelle : un buff/debuff chiffré peut viser un
                    // ALLIÉ ou un ENNEMI du combat (bénédiction +2 CA sur le
                    // compagnon, malédiction -2 attaque sur le chef…). Le moteur
                    // lit ces modificateurs via combatantEffectBonus, et les
                    // durées en rounds tickent au fil des tours.
                    const effectTargetRef = stringArg(args.target, 120);
                    const targetsSelf = !effectTargetRef
                        || effectTargetRef.toLowerCase() === 'player'
                        || effectTargetRef.toLowerCase() === store.character.name.toLowerCase();
                    if (!targetsSelf && store.combatState.isActive) {
                        const lookup = resolveCombatantReference(store.combatState, effectTargetRef, { autoResolve: true });
                        if (!lookup.combatant) return { success: false, error: `Effect target "${effectTargetRef}" not found in combat.` };
                        if (lookup.combatant.isPlayer) {
                            const char = applyEffectArgs(store.character, args);
                            d.syncCharacterUpdate(char);
                        } else {
                            const [statRaw, bonusRaw] = String(args?.stat || 'AC=0').split('=');
                            const rounds = Math.max(1, Math.trunc(Number(args.rounds) || 10));
                            const effect = {
                                id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                                name: String(args.name || 'Effect'),
                                source: 'spell' as const,
                                duration: 'rounds' as const,
                                roundsRemaining: rounds,
                                description: String(args.description || `${statRaw} ${bonusRaw}`),
                                modifiers: [{ stat: (statRaw || 'AC').trim() as any, bonus: Number.parseInt((bonusRaw || '0').trim(), 10) || 0 }],
                            };
                            // Updater FONCTIONNEL — l'ancien spread du snapshot de début
                            // de handler écrasait tout changement concurrent (ex-:2921).
                            store.setCombatState((prev: any) => ({
                                ...prev,
                                combatants: prev.combatants.map((c: any) => c.id === lookup.combatant!.id
                                    ? { ...c, activeEffects: [...(c.activeEffects || []).filter((e: any) => e.name !== effect.name), effect] }
                                    : c),
                            }));
                        }
                        campaignEventLog.append('EFFECT_ADDED', `Effect added on ${lookup.combatant.name}: ${args.name}`, args);
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effect Added on ${lookup.combatant!.name}: ${args.name} (${args.stat})]*` }]);
                        return { success: true, target: lookup.combatant.name };
                    }
                    // OU2 — hors combat, un effet visant une cible non-joueur ne
                    // doit JAMAIS retomber sur le héros (la « malédiction du
                    // chef bandit » debuffait le joueur).
                    if (!targetsSelf) {
                        return {
                            success: false,
                            error: `Effect target "${effectTargetRef}" is not a tracked combatant (no active combat). The effect was NOT applied — track it narratively, or apply it during combat.`,
                        };
                    }
                    const char = applyEffectArgs(store.character, args);
                    d.syncCharacterUpdate(char);
                    campaignEventLog.append('EFFECT_ADDED', `Effect added: ${args.name}`, args);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effect Added: ${args.name} (${args.stat})]*` }]);
                    return { success: true };
                }

                default:
                    console.warn("Unknown tool call:", name);
                    return { success: false, error: "Unknown tool" };
            }
        } catch (e: any) {
            console.error("Error processing tool:", call, e);
            return { success: false, error: e.message || String(e) };
        }
    }, []);

    return { processToolCall };
}
