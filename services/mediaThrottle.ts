// 15 s entre deux générations : le MJ narre plus vite que FLUX ne rend — sans
// fenêtre, les demandes partaient en rafale et le pipeline « latest wins »
// jetait des rendus à peine finis. Les demandes arrivées pendant le cooldown
// s'accumulent et seule la DERNIÈRE part (coalescence déjà en place).
export const MEDIA_GENERATION_COOLDOWN_MS = 15_000;

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
