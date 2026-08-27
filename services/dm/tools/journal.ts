/** Le journal : quetes, PNJ, lieux, moments.
 *  Extrait de hooks/useToolProcessor le 2026-08-25 (R3) : corps des outils inchange. */
import { useGameStore } from '../../../store/gameStore';
import { appendCampaignLog } from '../chronicle';
import { foldText } from '../../../engine/skillSystem';
import { campaignEventLog } from '../../../services/persistence/campaignEventLog';
import { portraitService, npcPortraitKey, portraitPrompt } from '../../../services/media/portraitService';
import { stringArg, stringListArg, numericArg } from './shared';
import { findQuestByTitle, foldTitle, questCreationBlockedBy } from '../../../engine/quests';
import type { ToolContext } from './context';

export async function add_quest(args: any, ctx: ToolContext) {
    const { store, syncJournal, optionalBoolean , sysText } = ctx;
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysQuestAdded(questTitle)}]*` }]);
    return { success: true, steps: questSteps.map(s => s.text) };
}

export async function update_quest_step(args: any, ctx: ToolContext) {
    const { syncJournal, optionalBoolean } = ctx;
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

export async function complete_quest(args: any, ctx: ToolContext) {
    const { store, syncJournal , sysText } = ctx;
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
        store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysQuestCompleted(completedTitle)}]*` }]);
        return { success: true, quest: completedTitle };
    }
    const activeTitles = (useGameStore.getState().journal.quests || [])
        .filter((q: any) => q.status === 'active').map((q: any) => q.title);
    return { success: false, error: `No active quest matching "${questTitle}". Active quests: ${activeTitles.join(' | ') || 'none'}.` };
}

export async function add_npc(args: any, ctx: ToolContext) {
    const { store, syncJournal } = ctx;
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

export async function update_npc(args: any, ctx: ToolContext) {
    const { syncJournal } = ctx;
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

export async function add_location(args: any, ctx: ToolContext) {
    const { store, syncJournal , sysText } = ctx;
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
    store.setTranscript(prev => [...prev, { speaker: 'dm', text: `*[SYSTEM: ${sysText().sysLocationFound(locName, Boolean(existingLoc))}]*` }]);
    return { success: true, updated: Boolean(existingLoc) };
}

export async function add_story_moment(args: any, ctx: ToolContext) {
    const { d, syncJournal } = ctx;
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
