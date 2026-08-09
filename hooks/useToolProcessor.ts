import React, { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateGeminiImage, buildCombatImagePrompt, buildSceneImagePrompt } from '../services/geminiImageService';
import { Item, getEffectiveStat, getRollBonus, getGearSkillBonus, getEffectiveAC } from '../types';
import { getCheckModifier, canonicalSkillName, SKILL_TRANSLATIONS } from '../services/skillSystem';
import { CLASS_DATA } from '../data/classes';
import { campaignEventLog } from '../services/campaignEventLog';
import { buildBranchWriterRequest, buildSubBranchDigest, generateSubBranchPlan } from '../services/branchWriterService';
import { saveService } from '../services/saveService';
import { waitDice } from '../services/diceTiming';
import { localSfxService } from '../services/localSfxService';
import { auditBus } from '../services/auditBus';
import {
    addEnemyToEncounter,
    addAllyToEncounter,
    advanceTurn,
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
    encounterOutcome,
    applyStoryModifiersToPrompt,
    normalizeRollPrompt,
    normalizeStoryModifier,
    resolveCombatantReference,
    resolveAttackAction,
    resolveConcentrationAfterDamage,
    resolveMoraleCheck,
    resolveRollPrompt,
    resolveSpellAgainstTargets,
    sanitizeXPGrant,
    startEncounter,
    updateEnemyHP
} from '../services/rulesEngine';
import {
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
import { rollDice } from '../services/utils';
import { galleryService } from '../services/galleryService';
import { portraitService, npcPortraitKey, portraitPrompt } from '../services/portraitService';
import { getAppSettings } from '../store/settingsStore';
import { syncCompanionsFromState, worldHourOf, ensureProgressionState } from '../services/rulesEngine';
import { getMountType, MOUNT_TYPES, getBeastCompanion, BEAST_COMPANIONS, getFamiliarType, FAMILIAR_TYPES, FAMILIAR_CLASSES } from '../data/companionOptions';
import type { CompanionSheet, TimeOfDay } from '../types';

// Show the "local audio server unreachable" SFX warning at most once per session.
// Without this, a down :8001 server spammed the transcript on every narrative SFX.
let sfxServerErrorNotified = false;

function stringArg(value: unknown, max = 500): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function stringListArg(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(item => stringArg(item)).filter(Boolean);
    const text = stringArg(value);
    return text ? [text] : [];
}

function uniqueAppend(existing: string[], incoming: string[], limit = 80): string[] {
    const seen = new Set(existing.map(item => item.toLowerCase()));
    const next = [...existing];
    for (const item of incoming) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            next.push(item);
        }
    }
    return next.slice(-limit);
}

function clockId(name: string): string {
    return `clock_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || Date.now()}`;
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
        prompt.resolveToolCall = (payload: Record<string, unknown>): boolean => {
            if (settled) return false;
            settled = true;
            resolve({ ...base, ...payload });
            return true;
        };
        setTimeout(() => {
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
            generateGeminiImage(entry.prompt, { aspectRatio: '16:9', imageSize: '1K' })
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
                    // Surface it: otherwise an image silently never appears and the
                    // player/DM have no idea the local FLUX server (:8000) is down.
                    useGameStore.getState().setTranscript(prev => [...prev, {
                        speaker: 'dm',
                        text: `*[⚠️ Image indisponible — le serveur d'images local (FLUX, port 8000) ne répond pas.]*`
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

        const scheduleSceneImage = (
            prompt: string,
            meta: { kind: 'scene_image' | 'combat_image' | 'moment_image'; phase: string; summary: string }
        ) => {
            // Mode sans GPU : images locales désactivées dans les Réglages.
            if (!getAppSettings().localImages) {
                campaignEventLog.append('ASSET_THROTTLED', 'Scene image skipped (local images disabled in settings)', { prompt: prompt.slice(0, 120) });
                return;
            }
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
            const charInfo = store.character ? `${store.character.race} ${store.character.class}` : '';
            scheduleSceneImage(
                buildCombatImagePrompt(enemy, location, charInfo) + timeOfDayHint(),
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
                    if (rollChar && (skillArg || abilityArg)) {
                        const isSave = Boolean(args.isSave)
                            || basePrompt.type === 'SAVE'
                            || /sauvegarde|saving\s*throw|\bsave\b/i.test(String(args.reason || ''));
                        const effectiveStats: Record<string, number> = {
                            STR: getEffectiveStat(rollChar, 'STR'), DEX: getEffectiveStat(rollChar, 'DEX'), CON: getEffectiveStat(rollChar, 'CON'),
                            INT: getEffectiveStat(rollChar, 'INT'), WIS: getEffectiveStat(rollChar, 'WIS'), CHA: getEffectiveStat(rollChar, 'CHA'),
                        };
                        const classSaves = CLASS_DATA[rollChar.class]?.savingThrows || [];
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
                        basePrompt.formula = `1d20${check.modifier >= 0 ? '+' : ''}${check.modifier}`;
                        // Bonus plats d'effets (checkBonus/saveBonus) et
                        // d'équipement (« +1 aux sauvegardes », « +2 Discrétion »)
                        // — avant, seuls les story modifiers touchaient dmBonus.
                        const canonical = skillArg ? canonicalSkillName(skillArg) : '';
                        // SKILL_TRANSLATIONS est FR→EN ; on cherche le nom FR par valeur.
                        const frName = canonical ? (Object.entries(SKILL_TRANSLATIONS).find(([, en]) => en === canonical)?.[0] || '') : '';
                        basePrompt.dmBonus = getRollBonus(rollChar, isSave ? 'save' : 'check')
                            + (skillArg && !isSave ? getGearSkillBonus(rollChar, [skillArg, canonical, frName]) : 0);
                        basePrompt.name = `${basePrompt.name}${check.proficient ? (check.expert ? ' (expertise)' : ' (maîtrisé)') : ''}`;
                    }
                    const modifierApplication = applyStoryModifiersToPrompt(basePrompt, store.character?.storyModifiers || []);
                    const prompt = modifierApplication.prompt;
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
                            error: 'Roll suppressed: branch plans cannot trigger checks by themselves. Wait for a new concrete player action with risk and consequence.',
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
                                armorType: args.armorType
                            };
                        nextInventory.push(newItem);
                    }
                    char.inventory = nextInventory;
                    d.syncCharacterUpdate(char);
                    campaignEventLog.append('ITEM_ADDED', `Added ${qty}x ${itemName}`, { name: itemName, quantity: qty, type: args.type });
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
                    return { success: removed, remaining };
                }

                case 'add_gold': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const delta = Number(args.amount);
                    if (!isFinite(delta) || delta === 0) return { success: false, error: 'Invalid amount' };
                    const char = { ...store.character };
                    const before = char.gold || 0;
                    // Clamp so a debit can't drive the purse negative.
                    const after = Math.max(0, Math.round((before + delta) * 100) / 100);
                    char.gold = after;
                    d.syncCharacterUpdate(char);
                    const reason = typeof args.reason === 'string' && args.reason.trim() ? ` (${args.reason.trim()})` : '';
                    campaignEventLog.append('JOURNAL_UPDATED', `Gold ${delta > 0 ? '+' : ''}${delta} → ${after} po${reason}`, { before, delta, after });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${delta > 0 ? '+' : ''}${delta} po${reason} — bourse : ${after} po]*` }]);
                    return { success: true, gold: after, delta };
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
                    const MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(MARKS, '');
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
                    }
                    if (!kind || kind === 'reward') {
                        for (const r of (m.rewardTable || [])) {
                            consider('reward', r.item, `${r.trigger} — ${r.description || ''}`,
                                `${r.item} ${r.trigger} ${r.description || ''}`);
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
                    const state = startEncounter(character, store.combatState);
                    store.setCombatState(state);
                    store.clearCombatRolls();
                    campaignEventLog.append('ENCOUNTER_STARTED', 'Combat started', state);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Started]*` }]);

                    // Log player initiative to DiceTray
                    const playerCombatant = state.combatants.find(c => c.isPlayer);
                    if (playerCombatant) {
                        const dexMod = Math.floor((character.stats.DEX - 10) / 2);
                        const dieRoll = playerCombatant.initiative - dexMod;
                        deps.diceTrayRef.current?.addLog({
                            type: 'initiative',
                            name: `${playerCombatant.name}: Initiative`,
                            total: playerCombatant.initiative,
                            formula: `d20 (${dieRoll}) + ${dexMod} = ${playerCombatant.initiative}`,
                            isDM: false
                        });
                    }

                    if (d.musicDirector) d.musicDirector.handleMusicTag('combat');
                    scheduleCombatImageOnce('hostile forces', store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
                    return { success: true };
                }

                case 'end_combat': {
                    // Idempotency guard: maybeEndCombat (GameSession) may have already
                    // auto-resolved victory + granted XP. If combat is no longer active,
                    // narrate but do NOT grant XP again (was a double-grant / level-up dupe).
                    if (!store.combatState.isActive) {
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat déjà terminé]*` }]);
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
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Combat Ended. Awarded ${xpAwarded} XP]*` }]);
                    if (d.musicDirector) d.musicDirector.handleMusicTag('exploration');
                    // Aftermath image: illustrate the resolution of the battle.
                    {
                        const charInfo = store.character ? `${store.character.race} ${store.character.class}` : '';
                        const where = store.journal.locations?.slice(-1)?.[0]?.name || 'the battlefield';
                        scheduleSceneImage(
                            buildSceneImagePrompt(`the aftermath of a battle at ${where}: fallen foes, drifting smoke and dust, the victor catching their breath, dramatic low light`, charInfo),
                            { kind: 'moment_image', phase: 'aftermath', summary: 'Combat aftermath image' }
                        );
                    }
                    return { success: true, xpAwarded };
                }

                case 'add_enemy_init': {
                    const character = store.character;
                    const baseState = character ? startEncounter(character, store.combatState) : { ...store.combatState, isActive: true };
                    const hadPlayerBefore = store.combatState.combatants.some(c => c.isPlayer);

                    const { state, combatant } = addEnemyToEncounter(baseState, args);
                    store.setCombatState(state);
                    campaignEventLog.append('COMBATANT_ADDED', `Added ${combatant.name} to initiative`, combatant);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Added ${combatant.name} to Initiative (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);

                    // Log player initiative if newly added by startEncounter
                    if (!hadPlayerBefore && character) {
                        const playerCombatant = state.combatants.find(c => c.isPlayer);
                        if (playerCombatant) {
                            const dexMod = Math.floor((character.stats.DEX - 10) / 2);
                            const dieRoll = playerCombatant.initiative - dexMod;
                            deps.diceTrayRef.current?.addLog({
                                type: 'initiative',
                                name: `${playerCombatant.name}: Initiative`,
                                total: playerCombatant.initiative,
                                formula: `d20 (${dieRoll}) + ${dexMod} = ${playerCombatant.initiative}`,
                                isDM: false
                            });
                        }
                    }

                    // Log enemy initiative to DiceTray
                    const creature = getCreature(combatant.name);
                    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
                    const dieRoll = combatant.initiative - dexMod;
                    deps.diceTrayRef.current?.addLog({
                        type: 'initiative',
                        name: `${combatant.name}: Initiative`,
                        total: combatant.initiative,
                        formula: `d20 (${dieRoll}) + ${dexMod} = ${combatant.initiative}`,
                        isDM: true
                    });

                    scheduleCombatImageOnce(combatant.name, store.journal.locations?.slice(-1)?.[0]?.name || 'current battlefield');
                    return { success: true, initiative: combatant.initiative, combatant };
                }

                case 'add_ally_init': {
                    const character = store.character;
                    const baseState = character ? startEncounter(character, store.combatState) : { ...store.combatState, isActive: true };
                    const hadPlayerBefore = store.combatState.combatants.some(c => c.isPlayer);

                    const { state, combatant } = addAllyToEncounter(baseState, args);
                    store.setCombatState(state);
                    campaignEventLog.append('COMBATANT_ADDED', `Added ally ${combatant.name} to initiative`, combatant);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${combatant.name} joined as an ALLY (HP: ${combatant.hp.current}, AC: ${combatant.ac})]*` }]);

                    // Log player initiative if newly added by startEncounter
                    if (!hadPlayerBefore && character) {
                        const playerCombatant = state.combatants.find(c => c.isPlayer);
                        if (playerCombatant) {
                            const dexMod = Math.floor((character.stats.DEX - 10) / 2);
                            const dieRoll = playerCombatant.initiative - dexMod;
                            deps.diceTrayRef.current?.addLog({
                                type: 'initiative',
                                name: `${playerCombatant.name}: Initiative`,
                                total: playerCombatant.initiative,
                                formula: `d20 (${dieRoll}) + ${dexMod} = ${playerCombatant.initiative}`,
                                isDM: false
                            });
                        }
                    }

                    const creature = getCreature(combatant.name);
                    const dexMod = creature ? Math.floor((creature.stats.DEX - 10) / 2) : (Number.isFinite(Number(args.dexMod)) ? Number(args.dexMod) : 0);
                    const dieRoll = combatant.initiative - dexMod;
                    deps.diceTrayRef.current?.addLog({
                        type: 'initiative',
                        name: `${combatant.name} (ally): Initiative`,
                        total: combatant.initiative,
                        formula: `d20 (${dieRoll}) + ${dexMod} = ${combatant.initiative}`,
                        isDM: true
                    });

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
                        const AW_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                        const awNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(AW_MARKS, '');
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
                        attackBonus: baseAttackBonus !== undefined ? baseAttackBonus + modifierApplication.prompt.dmBonus : undefined,
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
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${adv.name} se rapproche (loin → proche).]*` }]);
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

                        // Log damage to DiceTray
                        deps.diceTrayRef.current?.addLog({
                            type: 'damage',
                            name: `${result.resolution.attacker}: ${args.attackName || 'Attack'} damage`,
                            total: result.resolution.damage,
                            formula: `${result.resolution.damageFormula} = ${result.resolution.damage} (${result.resolution.damageType})`,
                            isDM: !isPlayer
                        });

                        // Wait another 4 seconds for the damage roll animation
                        await waitDice();
                    }

                    // --- MORALE CHECK FOR DAMAGED NPC ---
                    const moraleResult = resolveMoraleCheck(result.state, String(args.target));
                    if (moraleResult.rolled) {
                        result.state = moraleResult.state;

                        // Show visual roll
                        store.setCurrentRoll({
                            result: moraleResult.total!,
                            reason: `${moraleResult.combatant!.name} morale check (Wisdom Save total ${moraleResult.total} vs DC 11)`,
                            isDM: true,
                            success: moraleResult.success
                        });

                        // Log morale check Wisdom Save to DiceTray
                        deps.diceTrayRef.current?.addLog({
                            type: 'save',
                            name: `${moraleResult.combatant!.name} Morale Check (WIS Save)`,
                            total: moraleResult.total!,
                            formula: `d20 (${moraleResult.dieRoll}) + ${moraleResult.wisMod} = ${moraleResult.total} vs DC 11`,
                            isDM: true,
                            success: moraleResult.success
                        });

                        // Wait 4 seconds for the morale check animation
                        await waitDice();

                        if (moraleResult.fled) {
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: ${moraleResult.combatant!.name} a raté son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) après avoir subi des dégâts et s'enfuit du combat !]*`
                            }]);
                        } else {
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: ${moraleResult.combatant!.name} a réussi son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) après avoir subi des dégâts et continue de se battre.]*`
                            }]);
                        }
                    }

                    store.setCombatState(result.state);
                    const playerTarget = result.state.combatants.find(c => c.isPlayer && (c.name === result.resolution!.target || c.id === result.resolution!.target));
                    if (playerTarget && store.character) {
                        const char = {
                            ...store.character,
                            tempHP: playerTarget.tempHP || 0,
                            hp: { ...store.character.hp, current: playerTarget.hp.current }
                        };
                        d.syncCharacterCritical(char, 'hp');
                        const concentration = resolveConcentrationAfterDamage(char, result.resolution.damage);
                        if (concentration.broken) {
                            d.syncCharacterCritical(concentration.character, 'hp');
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(effect => effect.name).join(', ')}]*`
                            }]);
                        } else if (char.hp.current > 0 && concentration.prompt) {
                            store.setActivePrompt(concentration.prompt);
                            campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: Concentration save required, DC ${concentration.dc} after ${result.resolution!.damage} damage]*`
                            }]);
                        }
                    }

                    campaignEventLog.append('HP_CHANGED', result.resolution.log.text, result.resolution);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${result.resolution!.log.text}]*` }]);

                    const outcome = encounterOutcome(result.state);
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
                        const oocConcentration = resolveConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied);
                        if (oocConcentration.broken) {
                            d.syncCharacterCritical(oocConcentration.character, 'hp');
                            store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Concentration broken: ${oocConcentration.removedEffects.map(effect => effect.name).join(', ')}]*` }]);
                        } else if (updatedChar.hp.current > 0 && oocConcentration.prompt) {
                            store.setActivePrompt(oocConcentration.prompt);
                            campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', oocConcentration.prompt);
                        }
                        return { success: true, target: updatedChar.name, hp: updatedChar.hp, tempHP: updatedChar.tempHP, amountApplied: outOfCombat.amountApplied, mitigation: outOfCombat.mitigation };
                    }

                    const applied = applyDamageToEncounter(store.combatState, target, amount, args.damageType);
                    if (!applied.found || !applied.target) {
                        return { success: false, error: applied.ambiguous ? 'Ambiguous target. Use combatant id.' : 'Target not found' };
                    }
                    logDamage(applied.target.name);

                    // --- MORALE CHECK FOR DAMAGED NPC ---
                    const moraleResult = resolveMoraleCheck(applied.state, String(args.target || args.name));
                    if (moraleResult.rolled) {
                        applied.state = moraleResult.state;

                        // Show visual roll
                        store.setCurrentRoll({
                            result: moraleResult.total!,
                            reason: `${moraleResult.combatant!.name} morale check (Wisdom Save total ${moraleResult.total} vs DC 11)`,
                            isDM: true,
                            success: moraleResult.success
                        });

                        // Log morale check Wisdom Save to DiceTray
                        deps.diceTrayRef.current?.addLog({
                            type: 'save',
                            name: `${moraleResult.combatant!.name} Morale Check (WIS Save)`,
                            total: moraleResult.total!,
                            formula: `d20 (${moraleResult.dieRoll}) + ${moraleResult.wisMod} = ${moraleResult.total} vs DC 11`,
                            isDM: true,
                            success: moraleResult.success
                        });

                        // Wait 4 seconds for the morale check animation
                        await waitDice();

                        if (moraleResult.fled) {
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: ${moraleResult.combatant!.name} a raté son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) après avoir subi des dégâts et s'enfuit du combat !]*`
                            }]);
                        } else {
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: ${moraleResult.combatant!.name} a réussi son test de moral (Wisdom Save total ${moraleResult.total} vs DC 11) après avoir subi des dégâts et continue de se battre.]*`
                            }]);
                        }
                    }

                    store.setCombatState(applied.state);
                    if (applied.target.isPlayer && store.character) {
                        const char = {
                            ...store.character,
                            tempHP: applied.target.tempHP || 0,
                            hp: { ...store.character.hp, current: applied.target.hp.current }
                        };
                        d.syncCharacterCritical(char, 'hp');
                        const concentration = resolveConcentrationAfterDamage(char, applied.amountApplied || 0);
                        if (concentration.broken) {
                            d.syncCharacterCritical(concentration.character, 'hp');
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: Concentration broken: ${concentration.removedEffects.map(effect => effect.name).join(', ')}]*`
                            }]);
                        } else if (char.hp.current > 0 && concentration.prompt) {
                            store.setActivePrompt(concentration.prompt);
                            campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
                            store.setTranscript(prev => [...prev, {
                                speaker: 'dm',
                                text: `*[SYSTEM: Concentration save required, DC ${concentration.dc} after ${applied.amountApplied || 0} damage]*`
                            }]);
                        }
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
                        const list: string[] = Array.isArray(raw)
                            ? raw.map((t: any) => String(t).trim()).filter(Boolean)
                            : String(raw).trim().toLowerCase() === 'all_enemies'
                                ? (store.combatState.isActive
                                    ? store.combatState.combatants.filter(c => combatantSide(c) === 'enemy' && c.hp.current > 0).map(c => c.id)
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
                                proficientSaves: CLASS_DATA[c.class]?.savingThrows || [],
                            });
                            saveBonus = check.modifier;
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
                        }));
                        saveSucceeded = outcome.success;
                        const halfOnSave = optionalBoolean(args.halfOnSave) ?? true;
                        multiplier = outcome.success ? (halfOnSave ? 0.5 : 0) : 1;
                        saveSummary = ` Save ${saveAbility} ${outcome.total} vs DC ${saveDC}: ${outcome.success ? 'SUCCESS' : 'FAILURE'}.`;
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
                            const missText = `${hazard}: ${isPlayerTarget ? store.character.name : targetRef} évite l'attaque (${atkOutcome.total} vs CA ${targetACValue}).`;
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
                    let resultHP: { current: number; max: number } | undefined;
                    let resolvedName = isPlayerTarget ? store.character.name : targetRef;
                    if (amount > 0) {
                        const inEncounter = store.combatState.isActive
                            ? applyDamageToEncounter(store.combatState, isPlayerTarget ? 'player' : targetRef, amount, damageType)
                            : { found: false } as any;
                        if (inEncounter.found && inEncounter.target) {
                            store.setCombatState(inEncounter.state);
                            resolvedName = inEncounter.target.name;
                            resultHP = inEncounter.target.hp;
                            if (inEncounter.target.isPlayer) {
                                const char = {
                                    ...store.character,
                                    tempHP: inEncounter.target.tempHP || 0,
                                    hp: { ...store.character.hp, current: inEncounter.target.hp.current },
                                };
                                d.syncCharacterCritical(char, 'hp');
                                const concentration = resolveConcentrationAfterDamage(char, inEncounter.amountApplied || 0);
                                if (concentration.broken) {
                                    d.syncCharacterCritical(concentration.character, 'hp');
                                } else if (char.hp.current > 0 && concentration.prompt) {
                                    store.setActivePrompt(concentration.prompt);
                                }
                            }
                        } else if (isPlayerTarget) {
                            // Out of combat (or player not in the encounter roster) —
                            // racial/draconic/feat resistances + temp HP via the
                            // shared helper (they were skipped outside encounters).
                            const outOfCombat = applyDamageToCharacter(store.character, amount, damageType);
                            const updatedChar = outOfCombat.character;
                            d.syncCharacterCritical(updatedChar, 'hp');
                            resultHP = updatedChar.hp;
                            const concentration = resolveConcentrationAfterDamage(updatedChar, outOfCombat.amountApplied);
                            if (concentration.broken) {
                                d.syncCharacterCritical(concentration.character, 'hp');
                            } else if (updatedChar.hp.current > 0 && concentration.prompt) {
                                store.setActivePrompt(concentration.prompt);
                            }
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

                    const summaryText = `${hazard}: ${resolvedName} ${amount > 0 ? `subit ${amount} dégâts${damageType ? ` (${damageType})` : ''}` : 'ne subit aucun dégât'}${conditionApplied ? ` et est ${conditionApplied}` : ''}.`;
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
                    const costRaw = String(args.cost || 'action').toLowerCase().replace(/\s+/g, '_');
                    const cost = ['action', 'bonus_action', 'free', 'reaction'].includes(costRaw) ? costRaw : 'action';
                    const upper = (v: unknown) => {
                        const s = String(v || '').toUpperCase();
                        return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(s) ? s : undefined;
                    };
                    const hasModifier = args.modifierBonus !== undefined || args.modifierMode !== undefined;
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
                    // Étapes optionnelles (checklist) fournies dès la création.
                    const questSteps = stringListArg(args.steps).slice(0, 6).map(text => ({
                        id: crypto.randomUUID(), text, done: false,
                    }));
                    await syncJournal((prev: any) => ({
                        ...prev,
                        quests: [...(prev.quests || []), {
                            id: crypto.randomUUID(),
                            title: args.title,
                            description: args.description,
                            status: 'active',
                            ...(questSteps.length ? { steps: questSteps } : {}),
                            createdAt: new Date().toISOString()
                        }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Quest added: ${args.title}`, args);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Quest Added: ${args.title}]*` }]);
                    return { success: true, steps: questSteps.map(s => s.text) };
                }

                case 'update_quest_step': {
                    // Étapes de quête cochables : marque une étape faite (défaut),
                    // ou en AJOUTE une nouvelle si elle n'existe pas encore.
                    const questTitleArg = stringArg(args.questTitle || args.title, 160);
                    const stepText = stringArg(args.step, 200);
                    if (!questTitleArg || !stepText) return { success: false, error: 'update_quest_step requires questTitle and step' };
                    const QS_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const qsNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(QS_MARKS, '');
                    const quest = (useGameStore.getState().journal.quests || [])
                        .find((q: any) => q.status === 'active' && (qsNorm(q.title) === qsNorm(questTitleArg) || qsNorm(q.title).includes(qsNorm(questTitleArg))));
                    if (!quest) return { success: false, error: `Active quest "${questTitleArg}" not found. Use add_quest first.` };
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
                    return { success: true, quest: quest.title, steps: resultingSteps.map((s: any) => `${s.done ? '✓' : '○'} ${s.text}`) };
                }

                case 'complete_quest': {
                    const questTitle = String(args.title || '').trim();
                    if (!questTitle) return { success: false, error: 'complete_quest requires a title' };
                    let found = false;
                    await syncJournal((prev: any) => ({
                        ...prev,
                        quests: (prev.quests || []).map((q: any) => {
                            if (String(q.title || '').toLowerCase() === questTitle.toLowerCase() && q.status === 'active') {
                                found = true;
                                return { ...q, status: 'completed' };
                            }
                            return q;
                        })
                    }), true);
                    if (found) {
                        campaignEventLog.append('JOURNAL_UPDATED', `Quest completed: ${questTitle}`, args);
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Quest Completed: ${questTitle}]*` }]);
                    }
                    return { success: found };
                }

                case 'add_npc': {
                    // Idempotent: re-announcing a known NPC refreshes it instead of
                    // creating a duplicate journal entry. Accent-insensitive like
                    // update_npc — "Séraphine" vs "Seraphine" used to duplicate.
                    const npcName = stringArg(args.name, 120);
                    const NPC_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const npcNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(NPC_MARKS, '');
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
                    const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
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
                    const CN_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const cnNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(CN_MARKS, '');
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
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 ${compName} rejoint le groupe (PV ${compHP}, CA ${companion.ac}, ${companion.attack.name} +${companion.attack.attackBonus}, ${companion.attack.damage})]*` }]);
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
                        acquiredAt: Date.now(),
                    };
                    d.syncCharacterUpdate({ ...store.character, mount });
                    portraitService.request(npcPortraitKey(mountName), portraitPrompt(mountName, mount.description || `${mountName}, loyal riding mount`));
                    campaignEventLog.append('JOURNAL_UPDATED', `Mount acquired: ${mountName}${mountType ? ` [${mountType.id}]` : ''} (speed ${speed} ft${mount.flying ? ', FLYING' : ''})`, mount);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐴 ${mountName}${mountType && mountType.name !== mountName ? ` (${mountType.name})` : ''} devient la monture du héros (vitesse ${speed} ft${mount.flying ? ', volante' : ''})]*` }]);
                    return {
                        success: true,
                        mount,
                        instruction: `${mountName} is now the hero's mount${mount.flying ? ' — a FLYING one: narrate aerial travel and dramatic swoops' : ''}: overland travel is much faster, and in combat a MELEE attack against a FAR enemy becomes a mounted charge (closes to melee AND strikes in one action). Narrate the mount as a living companion.${mountType?.id === 'destrier_celeste' ? ' It is a CELESTIAL spirit: if it dies, the paladin can summon it again after a long rest.' : ''}`,
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
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🐾 Le lien du Maître des bêtes est scellé : ${beast.name} (CA ${beast.ac}, ${beast.attack.name} +${beast.attack.attackBonus}, ${beast.attack.damage})]*` }]);
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
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${famName} (${familiarType.name}) devient le familier du héros — Aide 1×/repos court]*` }]);
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
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: 🦉 ${fam.name} disparaît dans un frisson d'éther]*` }]);
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
                    const DN_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const dnNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(DN_MARKS, '');
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
                    const LN_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');
                    const lnNorm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(LN_MARKS, '');
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
                    await syncJournal((prev: any) => ({
                        ...prev,
                        locations: [...(prev.locations || []), {
                            id: crypto.randomUUID(),
                            name: args.name,
                            description: args.description,
                            createdAt: new Date().toISOString()
                        }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Location discovered: ${args.name}`, args);
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Location Discovered: ${args.name}]*` }]);
                    return { success: true };
                }

                case 'add_story_moment': {
                    // [Jn] : chaque moment est daté du jour-monde — la chronique
                    // (et les résumés qui la relisent) gardent l'ordre des faits.
                    const dayTag = `[J${useGameStore.getState().campaignRuntime.dayCount || 1}]`;
                    await syncJournal((prev: any) => ({
                        ...prev,
                        chronicle: [...(prev.chronicle || []), {
                            id: crypto.randomUUID(),
                            title: String(args.title || '').startsWith('[J') ? args.title : `${dayTag} ${args.title}`,
                            description: args.description,
                            timestamp: Date.now()
                        }]
                    }), true);
                    campaignEventLog.append('JOURNAL_UPDATED', `Story moment: ${args.title}`, args);
                    return { success: true };
                }

                case 'grant_xp': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const xpBefore = store.character.xp;
                    // ENEMIES only — allies (companion, rescued NPCs) are !isPlayer
                    // too and must not inflate the XP clamp base.
                    const enemyNames = store.combatState.combatants.filter(c => combatantSide(c) === 'enemy').map(c => c.name);
                    const amount = sanitizeXPGrant(Number(args.amount), enemyNames);
                    d.grantXP(amount, args.reason);
                    campaignEventLog.append('XP_GRANTED', `Awarded ${amount} XP for ${args.reason}`, { amount, reason: args.reason });
                    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Awarded ${amount} XP for ${args.reason}]*` }]);
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
                    const spellName = String(args.spellName || args.name || '').trim();
                    if (!spellName) return { success: false, error: 'cast_spell requires spellName' };
                    // Sort de ZONE à la voix : target='all_enemies' → sauvegarde
                    // par ennemi via le résolveur moteur (pas de prompt bloquant).
                    const aoeRequested = String(args.target || args.targets || '').trim().toLowerCase() === 'all_enemies';
                    const aoeEnemyIds = aoeRequested && store.combatState.isActive
                        ? store.combatState.combatants.filter(c => combatantSide(c) === 'enemy' && c.hp.current > 0).map(c => c.id)
                        : [];
                    const targetRef = aoeRequested
                        ? (aoeEnemyIds[0] || '')
                        : String(args.target || '');
                    const targetLookup = targetRef && store.combatState.isActive
                        ? resolveCombatantReference(store.combatState, targetRef)
                        : null;
                    if (targetLookup?.ambiguous) {
                        return { success: false, error: 'Ambiguous spell target. Use combatant id.' };
                    }
                    const result = castSpell(store.character, {
                        spellName,
                        slotLevel: Number(args.slotLevel || args.slot || 0) || undefined,
                        target: args.target,
                        casterAbility: args.casterAbility,
                        casterAbilityMod: Number.isFinite(Number(args.casterAbilityMod)) ? Number(args.casterAbilityMod) : undefined,
                        spellAttackBonus: Number.isFinite(Number(args.spellAttackBonus)) ? Number(args.spellAttackBonus) : undefined,
                        spellSaveDC: Number.isFinite(Number(args.spellSaveDC || args.saveDC)) ? Number(args.spellSaveDC || args.saveDC) : undefined,
                        targetAC: Number.isFinite(Number(args.targetAC)) ? Number(args.targetAC) : targetLookup?.combatant?.ac,
                        targetSaveBonus: Number.isFinite(Number(args.targetSaveBonus)) ? Number(args.targetSaveBonus) : undefined,
                        worldHour: worldHourOf(store.campaignRuntime.dayCount || 1, store.campaignRuntime.timeOfDay),
                        maximizeHealing: !!store.character.storyMode,
                    });

                    if (!result.success) return result;

                    d.syncCharacterCritical(result.character, 'hp');

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
                        return await holdForRollResolution(result.prompt, { ...result, prompt: { ...result.prompt } });
                    }
                    return result;
                }

                case 'apply_condition': {
                    if (!store.character) return { success: false, error: 'No character loaded' };
                    const conditionName = String(args.condition || args.name || '');
                    const targetName = stringArg(args.target || args.targetName || '', 120);
                    const targetsPlayer = !targetName
                        || targetName.toLowerCase() === 'player'
                        || targetName.toLowerCase() === store.character.name.toLowerCase();
                    if (store.combatState.isActive && targetName && !targetsPlayer) {
                        const appliedToEncounter = applyConditionToEncounter(store.combatState, targetName, conditionName);
                        if (!appliedToEncounter.found) {
                            return {
                                success: false,
                                error: appliedToEncounter.ambiguous ? 'Condition target is ambiguous. Use combatant id.' : 'Condition or target not found.',
                            };
                        }
                        store.setCombatState(appliedToEncounter.state);
                        campaignEventLog.append('EFFECT_ADDED', `Condition applied to ${appliedToEncounter.target?.name}: ${appliedToEncounter.condition?.name}`, appliedToEncounter.condition);
                        return { success: true, target: appliedToEncounter.target, condition: appliedToEncounter.condition, effect: appliedToEncounter.effect };
                    }

                    const applied = applyConditionToCharacter(store.character, conditionName);
                    if (!applied.found) return { success: false, error: 'Condition not found in SRD Codex' };
                    d.syncCharacterCritical(applied.character, 'hp');
                    campaignEventLog.append('EFFECT_ADDED', `Condition applied: ${applied.condition?.name}`, applied.condition);
                    return { success: true, condition: applied.condition, effect: applied.effect };
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

                    if (args.startNow && character && encounter.monsters.length) {
                        let state = startEncounter(character, store.combatState);
                        for (const monster of encounter.monsters) {
                            const added = addEnemyToEncounter(state, {
                                name: monster.name,
                                hp: monster.hp,
                                ac: monster.ac,
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

                case 'update_campaign_runtime': {
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
                                description: stringArg(args.worldClockDescription || args.clockDescription || existing?.description || '', 260),
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
                            currentChapterId: stringArg(args.currentChapterId || args.chapterId, 120) || prev.currentChapterId,
                            currentSceneId: stringArg(args.currentSceneId || args.sceneId, 120) || prev.currentSceneId,
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
                    const charInfo = store.character ? `${store.character.race} ${store.character.class}` : '';
                    scheduleSceneImage(buildSceneImagePrompt(args.description, charInfo) + timeOfDayHint(), {
                        kind: 'scene_image',
                        phase: args.phase || 'exploration',
                        summary: 'Scene image generated',
                    });
                    campaignEventLog.append('SCENE_CHANGED', 'Scene visual requested', args);
                    return { success: true };
                }

                case 'trigger_combat_image': {
                    // scheduleCombatImageOnce derives charInfo internally — no 3rd arg.
                    scheduleCombatImageOnce(String(args.enemy || 'enemies'), String(args.location || 'current battlefield'));
                    campaignEventLog.append('SCENE_CHANGED', `Combat visual requested: ${args.enemy}`, args);
                    return { success: true };
                }

                case 'trigger_visual': {
                    const charInfo = store.character ? `${store.character.race} ${store.character.class}` : '';
                    scheduleSceneImage(buildSceneImagePrompt(args.description, charInfo) + timeOfDayHint(), {
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
                    const description = String(args.description || args.sound || args.prompt || '').trim();
                    if (!description) return { success: false, error: 'Missing sound description' };
                    // Fire-and-forget (don't block the DM turn), but surface a one-time
                    // notice if the local audio server (:8001) is unreachable — otherwise
                    // SFX failures are completely silent. Only a genuine generation error
                    // throws; an empty description just returns false.
                    localSfxService.playSfxFromPrompt(description).catch(() => {
                        if (sfxServerErrorNotified) return; // warn once per session, don't spam
                        sfxServerErrorNotified = true;
                        useGameStore.getState().setTranscript(prev => [...prev, {
                            speaker: 'dm',
                            text: `*[⚠️ Effet sonore indisponible — le serveur audio local (port 8001) ne répond pas.]*`
                        }]);
                    });
                    campaignEventLog.append('ASSET_GENERATED', `Narrative SFX: ${description.slice(0, 60)}`, { kind: 'narrative_sfx', description });
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
                    const char = applyLongRest(store.character);
                    d.syncCharacterCritical(char, 'hp');
                    // Une nuit passe : jour +1, réveil à l'aube (le calendrier suit).
                    useGameStore.getState().setCampaignRuntime(prev => ({
                        ...prev,
                        dayCount: (prev.dayCount || 1) + 1,
                        timeOfDay: 'dawn',
                        updatedAt: Date.now(),
                    }));
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
                    const clocksAdvanced: { name: string; stage: number; maxStage: number; reachedMax: boolean }[] = [];
                    const activeClocks = (useGameStore.getState().campaignRuntime.worldClocks || [])
                        .filter(clock => clock.status === 'active');
                    if (activeClocks.length) {
                        useGameStore.getState().setCampaignRuntime(prev => ({
                            ...prev,
                            worldClocks: (prev.worldClocks || []).map(clock => {
                                if (clock.status !== 'active') return clock;
                                const stage = Math.min(clock.maxStage, clock.stage + 1);
                                clocksAdvanced.push({ name: clock.name, stage, maxStage: clock.maxStage, reachedMax: stage >= clock.maxStage });
                                return { ...clock, stage, updatedAt: Date.now() };
                            }),
                            updatedAt: Date.now(),
                        }));
                        await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
                        campaignEventLog.append('CAMPAIGN_RUNTIME_UPDATED', `World clocks advanced by long rest: ${clocksAdvanced.map(c => `${c.name} ${c.stage}/${c.maxStage}`).join(', ')}`, { clocksAdvanced });
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
                            store.setCombatState({
                                ...store.combatState,
                                combatants: store.combatState.combatants.map(c => c.id === lookup.combatant!.id
                                    ? { ...c, activeEffects: [...(c.activeEffects || []).filter(e => e.name !== effect.name), effect] }
                                    : c),
                            });
                        }
                        campaignEventLog.append('EFFECT_ADDED', `Effect added on ${lookup.combatant.name}: ${args.name}`, args);
                        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Effect Added on ${lookup.combatant!.name}: ${args.name} (${args.stat})]*` }]);
                        return { success: true, target: lookup.combatant.name };
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
