/** Fusion des fragments de transcription recus du MJ. Pure. */
export function appendTranscriptChunk(previous: string, incoming: string): string {
    const prev = previous.trimEnd();
    const next = String(incoming || '').trim();
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
