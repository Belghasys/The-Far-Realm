/** La campagne : position dans la trame, horloges, repos, temps, XP, embranchements.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { appendCampaignLog } from '../chronicle';
import { freezeChapterDigest, reconcileMissingDigests } from '../../../services/dm/chapterChronicle';
import { foldText } from '../../../engine/skillSystem';
import { resolveSceneIndex, stripOpeningCanonFact, isAtOpening, currentChapterNumber, secretLockLabel } from '../../../services/dm/campaignDirector';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { buildBranchWriterRequest, buildSubBranchDigest, generateSubBranchPlan } from '../../../services/dm/branchWriterService';
import { saveService } from '../../../services/persistence/saveService';
import { combatantSide, applyLongRest, applyShortRest, advanceClocksForNight, normalizeStoryModifier, sanitizeXPGrant } from '../../../engine/rulesEngine';
import type { TimeOfDay } from '../../../types';
import { stringArg, stringListArg, clockId, numericArg } from './shared';
import { uniqueAppend } from '../../../engine/quests';
import type { ToolContext } from './context';

export async function lookup_campaign(args: any, ctx: ToolContext) {
    const { store } = ctx;
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

export async function set_time_of_day(args: any, _ctx: ToolContext) {
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

export async function grant_xp(args: any, ctx: ToolContext) {
    const { d, store, sysLine } = ctx;
    if (!store.character) return { success: false, error: 'No character loaded' };
    const xpBefore = store.character.xp;
    // ENEMIES only — allies (companion, rescued NPCs) are !isPlayer
    // too and must not inflate the XP clamp base. Les sortis vivants
    // (fuite/reddition) comptent dans la base du plafond.
    const enemyNames = [
        ...store.combatState.combatants.filter(c => combatantSide(c) === 'enemy').map(c => c.name),
        ...(store.combatState.departed || []).filter(dpt => !dpt.returned && dpt.side === 'enemy').map(dpt => dpt.name),
    ];
    const amount = sanitizeXPGrant(Number(args.amount), enemyNames);
    // « Awarded 50 XP for undefined » : reason non validée (audit 2026-08-12).
    const xpReason = stringArg(args.reason, 120) || sysLine('progression', 'progress');
    d.grantXP(amount, xpReason);
    campaignEventLog.append('XP_GRANTED', `Awarded ${amount} XP for ${xpReason}`, { amount, reason: xpReason });
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: Awarded ${amount} XP for ${xpReason}]*` }]);
    return { success: true, total_xp: xpBefore + amount, amount };
}

export async function request_branch_plan(args: any, ctx: ToolContext) {
    const { store } = ctx;
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

export async function set_campaign_position(args: any, ctx: ToolContext) {
    const { d } = ctx;
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

export async function update_campaign_runtime(args: any, ctx: ToolContext) {
    const { processToolCall } = ctx;
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

export async function apply_complication(args: any, ctx: ToolContext) {
    const { d, store, name } = ctx;
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

export async function short_rest(args: any, ctx: ToolContext) {
    const { d, store } = ctx;
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

export async function long_rest(_args: any, ctx: ToolContext) {
    const { d, store } = ctx;
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
    let clocksAdvanced: ReturnType<typeof advanceClocksForNight>['ticked'];
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
