/** Les regles de quetes : titres pliés, recherche tolerante, garde contre la recreation d'une quete close.
 *  Extraites de hooks/useToolProcessor le 2026-08-25 (R3), inchangees. */
import { foldText } from '../engine/skillSystem';

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
