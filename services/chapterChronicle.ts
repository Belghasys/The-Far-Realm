/**
 * Chapter chronicle — le gel GARANTI des digests de chapitre.
 *
 * Exigence utilisateur : « un résumé quand on dépasse un chapitre, quoi qu'il
 * en soit ». Le gel ne doit dépendre ni de l'outil que le MJ a choisi, ni de
 * la réussite du premier appel LLM. Deux entrées :
 *  - freezeChapterDigest : plie le log d'UN chapitre en digest figé (idempotent,
 *    absorbe aussi les entrées orphelines sans chapterId des vieilles
 *    sauvegardes — sinon elles n'étaient jamais résumées ni purgées).
 *  - reconcileMissingDigests : filet de rattrapage — balaie les chapitres
 *    marqués `completed` qui ont encore des lignes de log mais pas de digest
 *    (échec réseau passé, crash, ancien chemin d'outil) et les gèle.
 */
import { useGameStore } from '../store/gameStore';
import { summarizeChapterDigest, summarizeActDigest } from './llmService';
import { saveService } from './saveService';
import { log } from './logger';

/** Gèle le digest d'un chapitre clos. Idempotent : true si déjà figé ou rien à
 *  figer ; false seulement si l'appel LLM a échoué (le log reste intact et le
 *  prochain reconcile retentera). */
export async function freezeChapterDigest(chapterId: string, chapterTitle: string): Promise<boolean> {
    const rt = useGameStore.getState().campaignRuntime;
    if ((rt.chapterDigests || []).some(d => d.chapterId === chapterId)) return true;

    // Le digest ABSORBE les entrées orphelines (sans chapterId) : elles seraient
    // sinon perdues pour toujours. Mais la SUPPRESSION, elle, ne doit viser que
    // le chapitre nommé — cf. plus bas.
    const belongs = (entryChapterId: string | undefined) => entryChapterId === chapterId || !entryChapterId;
    const entries = (rt.campaignLog || []).filter(l => belongs(l.chapterId));
    if (!entries.length) return true;

    const days = (() => {
        const ds = entries.map(l => l.day);
        const min = Math.min(...ds), max = Math.max(...ds);
        return min === max ? `D${min}` : `D${min}-D${max}`;
    })();
    const heroName = useGameStore.getState().character?.name || 'the hero';
    const text = await summarizeChapterDigest(chapterTitle, entries.map(l => `[D${l.day}] ${l.text}`), heroName);
    if (!text) {
        log.warn(`Chapter digest failed for ${chapterId} — log kept, will retry at next reconcile.`);
        return false;
    }

    useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        chapterDigests: [
            ...(prev.chapterDigests || []).filter(d => d.chapterId !== chapterId),
            { chapterId, title: chapterTitle, days, text, createdAt: Date.now() },
        ],
        // BUG (contre-audit 2026-08-22) : purger avec `belongs` supprimait AUSSI
        // toutes les lignes SANS chapitre. Sur un manifeste sans chapitres
        // (campagne libre ou générée sans structure), TOUTES les lignes sont
        // orphelines : le premier gel effaçait le journal ENTIER de la campagne.
        // On ne supprime donc que ce qui porte explicitement ce chapitre — les
        // orphelines sont résumées dans le digest, puis conservées.
        campaignLog: (prev.campaignLog || []).filter(l => l.chapterId !== chapterId),
        updatedAt: Date.now(),
    }));
    await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
    log.info(`📖 Chapter digest frozen: ${chapterId} (${days})`);
    return true;
}

/** Plie les digests de chapitre d'un acte ENTIÈREMENT clos en un digest
 *  d'acte unique (les digests de chapitre pliés sont retirés). Idempotent :
 *  ne fait rien si l'acte a encore un chapitre non clos, s'il n'a aucun digest,
 *  ou s'il est déjà plié. Appelé au changement d'acte et par le reconcile. */
export async function freezeActDigest(actId: string): Promise<boolean> {
    if (!actId) return true;
    const st = useGameStore.getState();
    const chapters = st.adventureManifestData?.chapters || [];
    const actChapters = chapters.filter(c => c.act === actId);
    if (!actChapters.length) return true;
    const rt = st.campaignRuntime;
    if ((rt.actDigests || []).some(a => a.actId === actId)) return true;
    // Tous les chapitres de l'acte doivent être clos ET digérés — SAUF ceux
    // qui n'ont jamais eu de lignes de log (chapitre sauté par le MJ) : sans
    // cette exception, un seul chapitre vide bloquait le pliage de l'acte à
    // jamais, silencieusement (audit d'intégration 2026-08-20).
    const digestByChapter = new Map((rt.chapterDigests || []).map(d => [d.chapterId, d]));
    const hasLogLines = (id: string) => (rt.campaignLog || []).some(l => l.chapterId === id);
    if (!actChapters.every(c => c.status === 'completed' && (digestByChapter.has(c.id) || !hasLogLines(c.id)))) return true;
    const folded = actChapters.flatMap(c => (digestByChapter.has(c.id) ? [digestByChapter.get(c.id)!] : []));
    if (!folded.length) return true;

    const days = (() => {
        const nums = folded.flatMap(d => String(d.days).match(/\d+/g) || []).map(Number);
        if (!nums.length) return folded[0].days;
        const min = Math.min(...nums), max = Math.max(...nums);
        return min === max ? `D${min}` : `D${min}-D${max}`;
    })();
    const heroName = st.character?.name || 'the hero';
    const text = await summarizeActDigest(actId, folded.map(d => ({ title: d.title, text: d.text })), heroName);
    if (!text) {
        log.warn(`Act digest failed for ${actId} — chapter digests kept, will retry.`);
        return false;
    }
    const foldedIds = new Set(folded.map(d => d.chapterId));
    useGameStore.getState().setCampaignRuntime(prev => ({
        ...prev,
        actDigests: [
            ...(prev.actDigests || []).filter(a => a.actId !== actId),
            { actId, title: actId, days, text, createdAt: Date.now() },
        ],
        chapterDigests: (prev.chapterDigests || []).filter(d => !foldedIds.has(d.chapterId)),
        updatedAt: Date.now(),
    }));
    await saveService.updateCampaignRuntime(useGameStore.getState().campaignRuntime);
    log.info(`📚 Act digest folded: ${actId} (${folded.length} chapitres → 1 digest)`);
    return true;
}

/** Rattrape les digests manquants des chapitres déjà terminés. À appeler au
 *  démarrage de session et à chaque avance de chapitre. Séquentiel et
 *  best-effort : un échec n'empêche pas les suivants. */
export async function reconcileMissingDigests(): Promise<void> {
    const st = useGameStore.getState();
    const chapters = st.adventureManifestData?.chapters || [];
    if (!chapters.length) return;
    const rt = st.campaignRuntime;
    const frozen = new Set((rt.chapterDigests || []).map(d => d.chapterId));
    for (const ch of chapters) {
        if (ch.status !== 'completed' || frozen.has(ch.id)) continue;
        if (!(rt.campaignLog || []).some(l => l.chapterId === ch.id)) continue;
        try {
            await freezeChapterDigest(ch.id, ch.title);
        } catch (e) {
            log.warn(`Digest reconcile failed for ${ch.id} (will retry next session):`, e);
        }
    }
    // Pliage des actes entièrement clos (campagnes longues) — best-effort.
    const acts = [...new Set(chapters.map(c => c.act).filter(Boolean))] as string[];
    for (const act of acts) {
        try {
            await freezeActDigest(act);
        } catch (e) {
            log.warn(`Act fold failed for ${act} (will retry next session):`, e);
        }
    }
}
