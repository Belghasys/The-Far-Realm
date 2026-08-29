/**
 * Narration auditor — the "light verifier agent".
 *
 * An asynchronous, throttled Flash pass that compares the DM's latest narration
 * against the REAL engine state (HP, gold, inventory, combat) and returns a
 * short corrective note when they clearly contradict each other. The caller
 * forwards that note to the live DM as a private system message so it can
 * self-correct in the next beat — the player never sees the machinery.
 *
 * Deliberately conservative: it only flags UNAMBIGUOUS numeric/state
 * contradictions. A false positive (nagging the DM wrongly) costs more
 * immersion than a missed minor slip.
 */
import { log } from '../infra/logger';
import { requireViteEnv, viteEnv } from '../infra/modelConfig';
import { getGeminiClient } from '../infra/geminiClient';

// Passe fréquente et mécanique → modèle léger dédié (VITE_AUDIT_MODEL, ex.
// gemini-3.5-flash-lite) pour épargner le quota du Flash principal. Retombe
// sur VITE_SUMMARY_MODEL si non configuré (comportement historique).
const AUDIT_MODEL = viteEnv(
    'VITE_AUDIT_MODEL',
    import.meta.env.VITE_AUDIT_MODEL,
    requireViteEnv('VITE_SUMMARY_MODEL', import.meta.env.VITE_SUMMARY_MODEL)
);

export interface NarrationAuditInput {
    /** The DM's most recent narration block (already merged/complete). */
    narration: string;
    /** Compact, factual engine-state lines ("Player HP: 14/27", "Gold: 35"...). */
    stateFacts: string[];
    /** C1 — secrets d'auteur dont le chapitre de révélation n'est PAS atteint.
     *  Fournis par campaignDirector.buildLockedSecretFacts (verrou calculé
     *  depuis la position réelle, pas depuis la prose du secret). */
    lockedSecrets?: string[];
    language: string;
}

export interface NarrationAuditResult {
    consistent: boolean;
    /** One short corrective instruction for the DM when inconsistent. */
    note?: string;
    /** Vrai quand la narration a ÉNONCÉ un secret encore verrouillé — le défaut
     *  n'est pas le même qu'une incohérence de chiffres, et la note envoyée au
     *  MJ doit le dire autrement (on ne demande pas de « rétablir la vraie
     *  valeur » : le mal est fait, on demande de re-couvrir). */
    leak?: boolean;
}

export async function auditNarration(input: NarrationAuditInput): Promise<NarrationAuditResult | null> {
    const narration = String(input.narration || '').trim().slice(0, 2400);
    if (!narration || !input.stateFacts.length) return null;

    // Section des secrets verrouillés, construite à part : elle n'est présente
    // que s'il y a quelque chose à surveiller, et son absence vaut consigne
    // (« s'il n'y a pas de section, leak est toujours faux »).
    const lockedBlock = input.lockedSecrets?.length
        ? ['## LOCKED AUTHORED SECRETS (their reveal chapter is NOT reached yet)',
            ...input.lockedSecrets.map(f => `- ${f}`), ''].join('\n')
        : '';

    const prompt = `
You audit a D&D game narration for CLEAR contradictions with the authoritative engine state.

## ENGINE STATE (authoritative — the single source of truth)
${input.stateFacts.map(f => `- ${f}`).join('\n')}

${lockedBlock}
## DM NARRATION (most recent)
${narration}

## TASK
Flag ONLY unambiguous, material contradictions:
- narrated HP/damage/healing numbers that contradict the state (e.g. "you are at full health" while HP is 5/27)
- narrated gold amounts contradicting the purse
- the narration says an item was given/used but it is absent/present in the inventory list
- a narrated death/defeat of a combatant whose HP is > 0 (or vice versa)
- STORY DRIFT: the narration has abandoned the stated campaign objective/active quests for an unrelated storyline with NO transition (a side scene or player detour is fine; a silent replacement of the plot is not)
- narrated time of day flatly contradicting the in-world clock (e.g. "midday sun" during Night) — only when stated explicitly
- SECRET LEAK (set leak=true as well): the narration, or a character speaking in it, states one of the LOCKED secrets above as an established fact — naming the hidden identity, the hidden motive or the hidden past outright. Hinting, suspecting, being mistaken or lying about it is FINE and must not be flagged; only a plain confirmation counts. If there is no locked-secret section above, leak is always false.
Everything stylistic, atmospheric, or merely unstated is CONSISTENT. When in doubt, consistent=true.
If inconsistent, write ONE short corrective instruction for the DM (max 160 chars, in ${input.language === 'fr' ? 'French' : 'English'}) that states the true value to honor going forward — never ask the DM to retcon aloud.
`;

    try {
        const result = await getGeminiClient().models.generateContent({
            purpose: 'memory',
            model: AUDIT_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        consistent: { type: 'BOOLEAN' },
                        note: { type: 'STRING' },
                        leak: { type: 'BOOLEAN' },
                    },
                    required: ['consistent'],
                },
            } as any,
        });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (!text) return null;
        const parsed = JSON.parse(text);
        return {
            consistent: parsed.consistent !== false,
            note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : undefined,
            leak: parsed.leak === true,
        };
    } catch (e) {
        log.debug('Narration audit failed (non-fatal):', e);
        return null;
    }
}

/**
 * Cadence de l'auditeur (2026-08-29). C'est un VÉRIFICATEUR, pas une mémoire :
 * à 90 s il était le premier poste de dépense du quota (jusqu'à 40 appels/h)
 * sans qu'une contradiction relevée 4 min plus tard coûte quoi que ce soit.
 * Et pas de passe si l'état vérifié n'a pas bougé depuis la dernière — sauf en
 * combat, où les chiffres changent à chaque tour.
 */
export const NARRATION_AUDIT_INTERVAL_MS = 240_000;
/** Plancher quand la narration cite un secret VERROUILLÉ : le contrôle part vite. */
export const NARRATION_AUDIT_SECRET_FLOOR_MS = 90_000;
/** Plafond : jamais plus de 12 min sans passe, état ou pas — la porte « état
 *  inchangé » seule éteignait l'auditeur pendant tout un dialogue calme
 *  (0 passe en 30 min), là où les secrets fuient. Audit du 2026-08-29. */
export const NARRATION_AUDIT_CEILING_MS = 720_000;

export function auditCadenceDue(input: {
    now: number; lastAt: number; lastStateHash: string; stateHash: string; combatActive: boolean;
    /** La dernière narration cite une entité d'un secret encore verrouillé (engine/entities). */
    secretMentioned?: boolean;
}): boolean {
    const since = input.now - input.lastAt;
    if (input.secretMentioned && since >= NARRATION_AUDIT_SECRET_FLOOR_MS) return true;
    if (since < NARRATION_AUDIT_INTERVAL_MS) return false;
    if (input.combatActive || input.stateHash !== input.lastStateHash) return true;
    return since >= NARRATION_AUDIT_CEILING_MS;
}
