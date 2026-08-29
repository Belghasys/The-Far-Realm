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
import { useGameStore } from '../../store/gameStore';
import { summarizeChapterDigest, summarizeActDigest } from './llmService';
import { saveService } from '../persistence/saveService';
import { log } from '../infra/logger';

/**
 * Seuil de VOLUME : au-delà de tant de lignes de log dans le chapitre courant,
 * on gèle un digest sans attendre la clôture du chapitre.
 *
 * D2 (audit 2026-08-24) : le digest n'était écrit qu'à `set_campaign_position`.
 * Une campagne dont la position ne bouge pas — six jours de jeu et neuf niveaux
 * sur la position 1/1a, séance du 23/08 — n'avait donc AUCUNE mémoire longue
 * structurée, et le log plafonné à 200 lignes évinçait les plus anciennes en
 * silence. La marge sous 200 est délibérée : il faut que le résumé arrive AVANT
 * la perte.
 */
export const VOLUME_LINE_THRESHOLD = 60;

/**
 * Le chapitre courant a-t-il accumulé assez de lignes pour mériter un gel de
 * volume ? Pure et testable — c'est la décision, pas l'effet.
 */
export function chapterVolumeDue(
    log: Array<{ chapterId?: string }> | undefined | null,
    chapterId: string | undefined | null,
    threshold: number = VOLUME_LINE_THRESHOLD,
): boolean {
    if (!chapterId) return false;
    return (log || []).filter(l => l.chapterId === chapterId).length >= threshold;
}

/** Gèle le digest d'un chapitre clos, ou APPEND un volume au digest existant.
 *  Idempotent quand il n'y a rien à figer ; false seulement si l'appel LLM a
 *  échoué (le log reste intact et le prochain reconcile retentera). */
export async function freezeChapterDigest(chapterId: string, chapterTitle: string): Promise<boolean> {
    const rt = useGameStore.getState().campaignRuntime;
    // Un digest DÉJÀ figé n'est plus un no-op : le chapitre a pu continuer (gel
    // de volume, ou retour du MJ dans un chapitre déjà clos). On replie alors
    // l'ancien digest AVEC le débordement, au lieu de sortir en silence en
    // laissant les nouvelles lignes sans résumé ni purge.
    const existing = (rt.chapterDigests || []).find(d => d.chapterId === chapterId);
    const pending = (rt.campaignLog || []).filter(l => l.chapterId === chapterId).length;
    if (existing && pending === 0) return true;

    // Le digest ABSORBE les entrées orphelines (sans chapterId) : elles seraient
    // sinon perdues pour toujours. Mais la SUPPRESSION, elle, ne doit viser que
    // le chapitre nommé — cf. plus bas.
    const belongs = (entryChapterId: string | undefined) => entryChapterId === chapterId || !entryChapterId;
    const entries = (rt.campaignLog || []).filter(l => belongs(l.chapterId));
    // C1 (contre-audit 2026-08-29) — le CLICHÉ des ids à purger, pris AVANT
    // l'await : une ligne écrite pendant le résumé n'en fait pas partie et
    // survit (elle sera résumée au gel suivant). Même recette que TP5 dans
    // memoryManager. Les orphelines n'y sont jamais (voir plus bas).
    const snapshotIds = new Set(entries.filter(l => l.chapterId === chapterId).map(l => l.id));
    if (!entries.length) return true;

    const days = (() => {
        // Sur un APPEND, la plage doit englober celle du digest déjà figé —
        // sinon un second volume rétrécirait la chronologie du chapitre.
        const ds = [
            ...entries.map(l => l.day),
            ...(existing ? (String(existing.days).match(/\d+/g) || []).map(Number) : []),
        ];
        if (!ds.length) return 'D?';
        const min = Math.min(...ds), max = Math.max(...ds);
        return min === max ? `D${min}` : `D${min}-D${max}`;
    })();
    const heroName = useGameStore.getState().character?.name || 'the hero';
    // Le digest existant entre dans le résumé comme un « déjà établi » : le
    // passé du chapitre ne s'érode pas, il se condense.
    const lines = existing
        ? [`[established so far] ${existing.text}`, ...entries.map(l => `[D${l.day}] ${l.text}`)]
        : entries.map(l => `[D${l.day}] ${l.text}`);
    const text = await summarizeChapterDigest(chapterTitle, lines, heroName);
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
        // …et seulement celles du CLICHÉ : purger « tout le chapitre » effaçait
        // aussi les lignes arrivées pendant l'appel LLM, jamais résumées.
        campaignLog: (prev.campaignLog || []).filter(l => !(l.chapterId === chapterId && snapshotIds.has(l.id))),
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

/**
 * FILET DE VOLUME (D2) — gèle un digest du chapitre EN COURS quand il a trop
 * duré, sans attendre que le MJ appelle `set_campaign_position`.
 *
 * C'est le correctif qui rend A1 non fatal : même si la position reste bloquée
 * toute une campagne, la mémoire longue existe et le journal ne s'évince plus
 * en silence. À appeler périodiquement (même cadence que le résumé roulant).
 */
export async function maybeFreezeChapterVolume(): Promise<boolean> {
    const st = useGameStore.getState();
    const rt = st.campaignRuntime;
    const chapterId = rt.currentChapterId;
    if (!chapterVolumeDue(rt.campaignLog, chapterId)) return false;
    const chapter = (st.adventureManifestData?.chapters || []).find(c => c.id === chapterId);
    const title = chapter ? `${chapter.id} — ${chapter.title}` : String(chapterId);
    log.info(`📚 Volume de chapitre atteint (${VOLUME_LINE_THRESHOLD} lignes) — gel anticipé de ${title}`);
    try {
        return await freezeChapterDigest(chapterId!, title);
    } catch (e) {
        log.warn('Gel de volume échoué (sera retenté) :', e);
        return false;
    }
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
