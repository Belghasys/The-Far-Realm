/**
 * Le contexte d'un outil du MJ : ce que chaque outil « voit ».
 *
 * Jusqu'au 2026-08-25, ces helpers etaient des fermetures declarees au debut
 * de processToolCall (hooks/useToolProcessor), et les 62 outils vivaient dans
 * un seul `switch` de 3 500 lignes. Les outils sont maintenant des fonctions
 * nommees (services/dm/tools/<domaine>.ts) qui recoivent ce contexte, construit
 * une fois par appel. Les helpers sont recopies tels quels.
 *
 * Regle : un outil qui voudrait REASSIGNER une valeur du contexte ne compile
 * pas (destructuration en const) — ce que la fermeture permettait en silence.
 */
import type { MutableRefObject, RefObject } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { playerFacingToolFailure } from './toolFailureNotice';
import { describeFightEnd } from '../chronicle';
import { generateGeminiImage, buildCombatImagePrompt, type ScenePromptOptions } from '../../../services/media/geminiImageService';
import { collectSceneReferences, ensureStyleAnchor, heroDescriptor, styleTagsForCampaign } from '../../../services/media/imageReferences';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { waitDice } from '../../../services/media/diceTiming';
import { encounterOutcome, resolveConcentrationAfterDamage, resolveMoraleCheck, MORALE_DC, findDeparted, concentrationBreakOnDeparture } from '../../../engine/rulesEngine';
import { preloadCodexBestiary } from '../../../engine/codexService';
import { cooldownRemainingMs, MEDIA_GENERATION_COOLDOWN_MS } from '../../../services/media/mediaThrottle';
import { galleryService } from '../../../services/media/galleryService';
import { getAppSettings } from '../../../store/settingsStore';
import { releaseNpcConcentrationEffect, releasePlayerConcentrationConditions } from '../../../engine/rulesEngine';
import { queueEnginePrompt } from './shared';
import { TOOLS } from './index';
import { SYSTEM_LINES } from '../../i18n/systemLines';

export interface ToolDeps {
    diceTrayRef: RefObject<any>;
    grantXP: (amount: number, reason: string) => void;
    syncCharacterUpdate: (char: any) => void;
    syncCharacterCritical: (char: any, reason: any) => void;
    syncJournalUpdate: (journal: any) => void;
    syncJournalImmediate: (journal: any) => Promise<boolean>;
    musicDirector?: {
        handleMusicTag: (mood: string) => void;
        handleRestMusic: (isLongRest: boolean) => void;
    };
}

export interface ToolRefs {
    depsRef: MutableRefObject<ToolDeps>;
    lastImageStartedAtRef: MutableRefObject<number>;
    imageInFlightRef: MutableRefObject<boolean>;
    lastScenePromptRef: MutableRefObject<{ key: string; at: number }>;
    pendingImageRef: MutableRefObject<{
    key: string;
    prompt: string;
    meta: { kind: 'scene_image' | 'combat_image' | 'moment_image'; phase: string; summary: string };
    request: any;
} | null>;
    imageTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

/** Les outils qui ont besoin du bestiaire charge avant de tourner. */
export const TOOLS_NEEDING_BESTIARY = ['lookup_monster', 'lookup_creature', 'build_encounter', 'add_enemy_init', 'add_ally_init', 'recruit_companion', 'resolve_attack', 'apply_damage'];

export function makeToolContext(refs: ToolRefs, call: { name: string; args: any }) {
    const { depsRef, lastImageStartedAtRef, imageInFlightRef, lastScenePromptRef, pendingImageRef, imageTimerRef } = refs;
    const d = depsRef.current;
    // `deps` : quelques outils lisaient directement le parametre du hook, c'est-
    // a-dire la valeur du PREMIER rendu, figee par la fermeture (useCallback
    // sans dependances). Ici, c'est la valeur fraiche — le seul ecart de
    // comportement de cette extraction, et il va dans le bon sens.
    const deps = d;
    const store = useGameStore.getState();
    const { name, args } = call;
    /** Un outil peut en appeler un autre (ex. une complication qui inflige des degats). */
    const processToolCall = (autre: { name: string; args: any }) => runTool(refs, autre);

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
    // Table de textes de session, lue A CHAQUE APPEL (la langue peut changer
    // en cours de partie). Meme role que `sysLine`, mais pour les lignes qui
    // ont une entree nommee — celles-la etaient figees en ANGLAIS et un joueur
    // francais lisait « Long rest completed » dans son journal.
    const sysText = () => SYSTEM_LINES[useGameStore.getState().language === 'en' ? 'en' : 'fr'];
     // Test de moral partagé (resolve_attack + apply_damage — 2 anciens blocs
    // copiés-collés). Lit l'état FRAIS, committe AVANT toute animation (aucune
    // écriture d'état après un await → plus de fenêtre d'écrasement), puis
    // affiche les jets. Lignes de transcript bilingues (les anciennes étaient
    // en français dur même en session anglaise).
    const runMoraleCheck = async (targetRef: string): Promise<{ rolled: boolean; fled?: boolean; state: any; name?: string; total?: number }> => {
        const liveState = useGameStore.getState().combatState;
        const moraleResult = resolveMoraleCheck(liveState, targetRef);
        if (!moraleResult.rolled) return { rolled: false, state: liveState };
        let committed: any = moraleResult.state;
        if (moraleResult.fled && moraleResult.combatant) {
            // Le fuyard est SORTI du roster, vivant (audit 2026-08-25 : avant,
            // hp = 0 + effet « Fled » illisible = un cadavre pour tout le monde).
            // Un lanceur emporte sa concentration : lever l'effet qu'il tenait.
            const broken = concentrationBreakOnDeparture(moraleResult.combatant);
            if (broken) {
                const released = releaseNpcConcentrationEffect(committed, useGameStore.getState().character, broken);
                committed = released.state;
                if (released.removedFromPlayer && released.character) d.syncCharacterCritical(released.character, 'hp');
            }
            campaignEventLog.append('COMBATANT_LEFT', `${moraleResult.combatant.name} fled the battle (failed morale) — alive`, { ...(moraleResult.departed || {}), reason: 'fled' } as any);
        }
        store.setCombatState(committed);
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
        return { rolled: true, fled: moraleResult.fled, state: committed, name: who, total: moraleResult.total };
    };
     // Ce que le MJ apprend du test de moral. Un handler d'outil n'a AUCUN
    // autre canal vers le modèle que sa valeur de retour (pas de
    // dm.sendSystemMessage ici) : avant, il n'apprenait jamais la fuite et
    // narrait une mort (audit 2026-08-25).
    const moraleReport = (m: { rolled: boolean; fled?: boolean; name?: string; total?: number }) => !m.rolled ? {} : {
        moraleCheck: {
            name: m.name,
            result: m.fled ? 'fled' : 'held',
            total: m.total,
            dc: MORALE_DC,
            note: m.fled
                ? `${m.name} FAILED its morale check and FLED the battle. It is ALIVE — it ran away with its remaining HP and may return later. Narrate a rout (it breaks and runs), NEVER a death.`
                : `${m.name} held its nerve and keeps fighting.`,
        },
    };
    // Issue du combat vue depuis un outil : la clôture (XP, chronique) est
    // automatique côté moteur — le MJ narre, il n'appelle pas end_combat.
    const outcomeReport = (state: any) => {
        const outcome = encounterOutcome(state);
        if (outcome !== 'victory') return { encounterOutcome: outcome };
        return {
            encounterOutcome: outcome,
            victoryNote: `The fight is over — ${describeFightEnd(state.combatants || [], state.departed || [])}. Enemies listed as FLED or SURRENDERED are ALIVE (they ran or yielded). The engine ends the combat and awards XP automatically: do NOT call end_combat, just narrate the aftermath.`,
        };
    };
    // Un ennemi désigné par le MJ mais déjà SORTI du combat : une erreur qui
    // explique, plutôt qu'un « not found » qui pousse le modèle à inventer.
    const departedHint = (ref: string): string | null => {
        const gone = findDeparted(useGameStore.getState().combatState, ref);
        if (!gone) return null;
        return `${gone.displayName || gone.name} already LEFT the fight in round ${gone.round} (${gone.reason}) — it is ALIVE and out of reach, not a target. If it comes back, add_enemy_init it again by the same name.`;
    };
     // Concentration après dégâts (5 anciens blocs copiés-collés unifiés).
    // `char` doit être la fiche FRAÎCHE déjà patchée aux PV courants.
    const handleConcentrationAfterDamage = (char: any, damage: number, label = 'concentration save') => {
        const concentration = resolveConcentrationAfterDamage(char, damage);
        if (concentration.broken) {
            d.syncCharacterCritical(concentration.character, 'hp');
            // T18 — les conditions que ces sorts avaient posées sur les lignes
            // de combat tombent avec eux (Immobilisation → l'ennemi n'est plus
            // paralysé). Updater fonctionnel : état frais.
            if (store.combatState.isActive) {
                store.setCombatState((prev: any) => releasePlayerConcentrationConditions(prev, concentration.removedEffects.map((e: any) => e.name)).state);
            }
            store.setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: ${sysText().sysConcentrationBroken(concentration.removedEffects.map((effect: any) => effect.name).join(', '))}]*`
            }]);
        } else if (char.hp.current > 0 && concentration.prompt) {
            queueEnginePrompt(concentration.prompt, label); // OU5 — jamais d'écrasement d'un jet en attente
            campaignEventLog.append('ROLL_REQUESTED', 'Concentration save requested after damage', concentration.prompt);
            store.setTranscript(prev => [...prev, {
                speaker: 'dm',
                text: `*[SYSTEM: ${sysText().sysConcentrationSave(concentration.dc, damage)}]*`
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

    return { d, deps, store, name, args, call, processToolCall, syncJournal, logInitiativeRoll, logNewPlayerInitiative, sysLine, sysText, runMoraleCheck, moraleReport, outcomeReport, departedHint, handleConcentrationAfterDamage, armImageTimer, startSceneImageGeneration, flushPendingImage, timeOfDayHint, scenePromptOptions, scheduleSceneImage, scheduleCombatImageOnce, optionalBoolean, depsRef, lastImageStartedAtRef, imageInFlightRef, lastScenePromptRef, pendingImageRef, imageTimerRef };
}

export type ToolContext = ReturnType<typeof makeToolContext>;
export type ToolFn = (args: any, ctx: ToolContext) => Promise<any> | any;

/**
 * Le distributeur : construit le contexte, precharge le bestiaire si l'outil
 * en a besoin, appelle la fonction de l'outil. Meme enveloppe try/catch que
 * l'ancien processToolCall.
 */
export async function runTool(refs: ToolRefs, call: { name: string; args: any }): Promise<any> {
    const ctx = makeToolContext(refs, call);
    const { name, args } = call;
    if (TOOLS_NEEDING_BESTIARY.includes(name)) {
        await preloadCodexBestiary();
    }
    // Fin du silence (2026-09-01, cas du lustre) : quand un outil qui touche
    // des PV échoue, le joueur doit le voir — sinon le MJ narre par-dessus et
    // rien à l'écran ne distingue « raté » de « il ne s'est rien passé ».
    // Décision pure et testée dans toolFailureNotice ; appliquée ICI parce que
    // runTool est le point de passage de TOUS les outils, y compris leurs
    // exceptions — aucun chemin ne peut l'oublier.
    const surfaceFailure = (result: unknown) => {
        const lang = useGameStore.getState().language === 'en' ? 'en' as const : 'fr' as const;
        const notice = playerFacingToolFailure(name, result, lang);
        if (notice) useGameStore.getState().setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${notice}]*` }]);
    };
    try {
        const outil = TOOLS[name];
        if (!outil) {
            console.warn("Unknown tool call:", name);
            return { success: false, error: "Unknown tool" };
        }
        const result = await outil(args, ctx);
        surfaceFailure(result);
        return result;
    } catch (e: any) {
        console.error("Error processing tool:", call, e);
        const failure = { success: false, error: e.message || String(e) };
        surfaceFailure(failure);
        return failure;
    }
}
