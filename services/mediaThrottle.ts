export const MEDIA_GENERATION_COOLDOWN_MS = 0;

export function cooldownRemainingMs(
    lastStartedAt: number,
    now = Date.now(),
    cooldownMs = MEDIA_GENERATION_COOLDOWN_MS
): number {
    if (!lastStartedAt) return 0;
    return Math.max(0, cooldownMs - (now - lastStartedAt));
}

export function isCombatLoopMood(mood: string): boolean {
    return ['combat', 'combat_boss', 'tension'].includes(mood);
}
