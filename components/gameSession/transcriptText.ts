/**
 * Recollage des fragments de narration du MJ.
 *
 * Le MJ en direct parle par morceaux, et un morceau peut répéter la fin du
 * précédent (reprise après coupure) ou n'en être que la suite. Cette fonction
 * décide s'il faut coller, remplacer ou simplement enchaîner — sans jamais
 * dupliquer une phrase à l'écran ni dans la sauvegarde.
 *
 * Extrait de GameSession.tsx le 2026-08-25 : pur, sans état, testable seul.
 */
export function mergeTranscriptText(previous: string, incoming: string): string {
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
