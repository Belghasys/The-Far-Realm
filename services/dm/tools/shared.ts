/** Helpers communs aux outils du MJ (arguments, attente d'un jet, file des invites moteur).
 *  Extraits de hooks/useToolProcessor le 2026-08-25 (R3), inchanges. */
import { useGameStore } from '../../../store/gameStore';

// Show the "local audio server unreachable" SFX warning at most once per session.
// Without this, a down :8001 server spammed the transcript on every narrative SFX.

export function stringArg(value: unknown, max = 500): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function stringListArg(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(item => stringArg(item)).filter(Boolean);
    const text = stringArg(value);
    return text ? [text] : [];
}

export function clockId(name: string): string {
    return `clock_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || Date.now()}`;
}

export function numericArg(value: unknown, fallback: number): number {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

export const ROLL_RESPONSE_TIMEOUT_MS = 90_000;

/**
 * BLOCKING two-step roll. Attach a resolver to the on-screen roll prompt and
 * HOLD the tool response until the player rolls (or dismisses / times out).
 * A Live model cannot continue past a function call whose response has not
 * arrived — this is what mechanically stops Gemini from narrating an outcome
 * it does not have (it used to receive an immediate "await the result" response
 * and then invent the result anyway).
 *
 * GameSession delivers the outcome through prompt.resolveToolCall, which
 * returns true when the held response was used; false means the hold already
 * settled (timeout) and the caller must fall back to a [ROLL_RESULT] message.
 */
export function holdForRollResolution(prompt: any, base: Record<string, unknown>): Promise<any> {
    return new Promise((resolve) => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        prompt.resolveToolCall = (payload: Record<string, unknown>): boolean => {
            if (settled) return false;
            settled = true;
            if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }
            resolve({ ...base, ...payload });
            return true;
        };
        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (settled) return;
            settled = true;
            resolve({
                ...base,
                await_roll: true,
                timedOut: true,
                instruction: 'The player has not rolled yet. Do NOT assume or narrate any outcome. Stay in the moment (you may add a short beat of tension); the official [ROLL_RESULT] message will arrive when the dice land.',
            });
        }, ROLL_RESPONSE_TIMEOUT_MS);
    });
}

/** OU5 — un prompt initié par le MOTEUR (sauvegarde de concentration…) ne doit
 *  JAMAIS écraser un jet en attente dont la réponse d'outil est retenue :
 *  l'écrasement laissait le resolveToolCall du premier prompt orphelin et le
 *  MJ Live gelé jusqu'au timeout de 90 s. On DIFFÈRE : retente toutes les
 *  600 ms jusqu'à ce que l'emplacement se libère (2 min max). */
// Timers des prompts moteur en attente : annulés au démontage de la session
// pour qu'un prompt différé ne surgisse jamais dans une session déjà quittée.
export const enginePromptTimers = new Set<number>();

export function cancelQueuedEnginePrompts() {
    for (const id of enginePromptTimers) window.clearTimeout(id);
    enginePromptTimers.clear();
}

export function queueEnginePrompt(prompt: any, label: string) {
    const startedAt = Date.now();
    const trySet = () => {
        const live = useGameStore.getState();
        if (!live.activePrompt) {
            live.setActivePrompt(prompt);
            return;
        }
        if (Date.now() - startedAt > 120_000) {
            console.warn(`⏳ Engine prompt dropped after 120s in queue: ${label}`);
            return;
        }
        const id = window.setTimeout(() => { enginePromptTimers.delete(id); trySet(); }, 600);
        enginePromptTimers.add(id);
    };
    trySet();
}
