/**
 * diceTiming.ts
 * Cinematic-but-skippable pacing for combat dice overlays.
 *
 * Before: every roll did `await new Promise(r => setTimeout(r, 4000))`, a hard
 * 4s wait that kept running even after the player clicked the dice away — so a
 * "skip" only hid the overlay, the game still froze for the full duration.
 *
 * Now: `waitDice()` resolves after DICE_ANIM_MS *or* immediately when
 * `skipDice()` is called (wired to a click on the dice overlay). Only one wait
 * is ever in flight at a time (rolls are awaited sequentially), so a single
 * pending resolver is enough. Each click skips exactly one roll.
 */
export const DICE_ANIM_MS = 3000;

// Player-adjustable duration (Réglages → vitesse des dés). Defaults to the
// historical 3s; settingsStore pushes the persisted choice at startup.
let diceAnimMs = DICE_ANIM_MS;

/** Override the default dice-overlay duration (from the Settings panel). */
export function setDiceAnimMs(ms: number): void {
    diceAnimMs = Math.max(100, Math.min(10000, Math.trunc(ms) || DICE_ANIM_MS));
}

let skipResolver: (() => void) | null = null;

/**
 * Wait for the cinematic dice duration, but resolve early if skipDice() fires.
 * Always resolves exactly once.
 */
export function waitDice(ms: number = diceAnimMs): Promise<void> {
    return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            if (skipResolver === finish) skipResolver = null;
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(finish, ms);
        skipResolver = finish;
    });
}

/** Skip the currently-running dice wait, if any (e.g. player clicked the dice). */
export function skipDice(): void {
    if (skipResolver) skipResolver();
}
