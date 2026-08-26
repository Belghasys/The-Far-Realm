/**
 * Journal keeper — le « greffier » de la partie.
 *
 * Passe de fond throttlée (comme narrationAuditor) : relit les derniers
 * échanges et repère ce que le MJ vocal a OUBLIÉ de consigner — étapes de
 * quête franchies, moments marquants, faits appris sur les PNJ. Le résultat
 * est appliqué via les MÊMES outils que le MJ (update_quest_step,
 * add_story_moment, add_npc), donc aucune plomberie parallèle.
 *
 * Conservateur par design : ne consigne que ce qui s'est CLAIREMENT produit
 * dans la fiction et qui manque au journal. Un journal silencieux vaut mieux
 * qu'un journal pollué.
 */
import { log } from '../infra/logger';
import { requireViteEnv, viteEnv } from '../infra/modelConfig';
import { getGeminiClient } from '../infra/geminiClient';

// Même famille que l'auditeur : extraction mécanique fréquente → modèle léger
// (VITE_AUDIT_MODEL), fallback sur le modèle de résumé si absent.
const KEEPER_MODEL = viteEnv(
    'VITE_AUDIT_MODEL',
    import.meta.env.VITE_AUDIT_MODEL,
    requireViteEnv('VITE_SUMMARY_MODEL', import.meta.env.VITE_SUMMARY_MODEL)
);

export interface JournalKeeperInput {
    /** Recent transcript lines (already filtered of [SYSTEM] noise). */
    transcriptLines: string[];
    /** Active quests with their step states, as compact lines. */
    activeQuests: string[];
    /** Titles already completed — never re-open or re-create those. */
    completedQuests: string[];
    /** Known NPC names (to avoid inventing new ones needlessly). */
    npcNames: string[];
    /** Chronicle titles already recorded (avoid duplicates). */
    recentMoments: string[];
    language: string;
}

export interface JournalKeeperResult {
    /** Quests the DM clearly handed out but never registered. */
    newQuests: Array<{ title: string; description: string; steps?: string[] }>;
    questStepUpdates: Array<{ questTitle: string; stepText: string; done: boolean }>;
    /** Quests whose goal was clearly achieved but still marked active. */
    questCompletions: Array<{ questTitle: string; evidence: string }>;
    moments: Array<{ title: string; description: string }>;
    npcFacts: Array<{ name: string; fact: string }>;
    /** Campaign-log lines (EN): decisions, promises, discoveries the ENGINE can't see. */
    logLines: string[];
}

export async function runJournalKeeper(input: JournalKeeperInput): Promise<JournalKeeperResult | null> {
    // slice(-6000) et non slice(0, 6000) : c'est la FIN de la fenêtre qui porte
    // les résolutions (« tu tends la fiole au marchand : il te remercie »), donc
    // exactement ce que le greffier doit consigner. L'ancienne coupe en tête
    // gardait les préambules et jetait les dénouements.
    const dialogue = input.transcriptLines.join('\n').trim().slice(-6000);
    if (!dialogue) return null;

    const prompt = `
You are the silent SCRIBE of a solo D&D game. Compare the recent dialogue with the journal and list ONLY what clearly happened in the fiction but is MISSING from the records. Never invent, never speculate, never duplicate.

## ACTIVE QUESTS (with steps already recorded)
${input.activeQuests.map(q => `- ${q}`).join('\n') || '- none'}

## ALREADY COMPLETED QUESTS (never re-create, never re-complete)
${input.completedQuests.map(q => `- ${q}`).join('\n') || '- none'}

## KNOWN NPCS
${input.npcNames.join(', ') || 'none'}

## CHRONICLE MOMENTS ALREADY RECORDED (do not re-log these)
${input.recentMoments.map(m => `- ${m}`).join('\n') || '- none'}

## RECENT DIALOGUE (player + DM)
${dialogue}

## RULES
- newQuests: the DM clearly gave the hero a JOB or the hero clearly accepted one (an NPC asks for help, a contract is taken, a goal is set: "find my son", "clear the mine", "bring the relic to the abbey") and NO quest above matches it → report it. title ≤ 60 chars, description 1 sentence, both in ${input.language === 'fr' ? 'French' : 'English'}; steps = 2-4 short sub-objectives if the dialogue makes them obvious, else omit. Max 2. Do NOT report vague intentions the hero merely mused about, and never re-report a quest already listed above.
- questCompletions: a quest listed above had its MAIN GOAL clearly achieved in this dialogue (the son is found and returned, the relic is handed over, the beast is slain and the reward paid) but it is still active → report it with the exact questTitle as listed and a short evidence quote. Do NOT complete a quest just because one step advanced. Max 2.
- questStepUpdates: an EXISTING quest step listed above was clearly accomplished in the dialogue but marked "todo" → report it (questTitle + the step's text, done=true). A clearly new intermediate objective the DM announced for an existing quest may be added as a new step (done=false). Max 3.
- moments: a MAJOR story beat (revelation, victory, betrayal, arrival at a landmark, pact) with no matching chronicle entry. Max 2. Title ≤ 60 chars, description 1-2 sentences, in ${input.language === 'fr' ? 'French' : 'English'}.
- npcFacts: a concrete fact learned about a KNOWN NPC (motive, secret, location, promise). Max 3, each ≤ 140 chars.
- logLines: campaign-log entries IN ENGLISH for story beats the game engine cannot detect on its own — a decision the player committed to, a promise made or received, a deadline accepted, a route/destination chosen, a key discovery. One factual sentence each, ≤ 160 chars, past tense (e.g. "Salim promised the innkeeper to find her missing son before the full moon."). Max 3. NEVER log combat results, loot, gold, XP or quest updates — the engine records those itself.
- When nothing qualifies, return empty arrays. That is the NORMAL outcome.
`;

    try {
        const result = await getGeminiClient().models.generateContent({
            model: KEEPER_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        newQuests: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    title: { type: 'STRING' },
                                    description: { type: 'STRING' },
                                    steps: { type: 'ARRAY', items: { type: 'STRING' } },
                                },
                                required: ['title', 'description'],
                            },
                        },
                        questCompletions: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    questTitle: { type: 'STRING' },
                                    evidence: { type: 'STRING' },
                                },
                                required: ['questTitle', 'evidence'],
                            },
                        },
                        questStepUpdates: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    questTitle: { type: 'STRING' },
                                    stepText: { type: 'STRING' },
                                    done: { type: 'BOOLEAN' },
                                },
                                required: ['questTitle', 'stepText', 'done'],
                            },
                        },
                        moments: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    title: { type: 'STRING' },
                                    description: { type: 'STRING' },
                                },
                                required: ['title', 'description'],
                            },
                        },
                        npcFacts: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    name: { type: 'STRING' },
                                    fact: { type: 'STRING' },
                                },
                                required: ['name', 'fact'],
                            },
                        },
                        logLines: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                    required: ['newQuests', 'questCompletions', 'questStepUpdates', 'moments', 'npcFacts', 'logLines'],
                },
            } as any,
        });
        // LM7 — parts[0] peut être une part « thought » (thinkingConfig actif) :
        // le JSON revenait vide et TOUTE la passe partait à la poubelle en
        // silence. Correctif déjà appliqué dans llmService, jamais reporté ici.
        const parts = result.candidates?.[0]?.content?.parts || [];
        const text = parts.find((p: any) => p.text && !p.thought)?.text?.trim() || '';
        if (!text) return null;
        const parsed = JSON.parse(text);
        const cleanText = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
        return {
            newQuests: Array.isArray(parsed.newQuests)
                ? parsed.newQuests
                    .filter((q: any) => q && cleanText(q.title, 80) && cleanText(q.description, 400))
                    .map((q: any) => ({
                        title: cleanText(q.title, 80),
                        description: cleanText(q.description, 400),
                        steps: Array.isArray(q.steps)
                            ? q.steps.filter((s: unknown) => typeof s === 'string' && s.trim()).slice(0, 4).map((s: string) => cleanText(s, 120))
                            : undefined,
                    }))
                    .slice(0, 2)
                : [],
            questCompletions: Array.isArray(parsed.questCompletions)
                ? parsed.questCompletions
                    .filter((q: any) => q && cleanText(q.questTitle, 80))
                    .map((q: any) => ({ questTitle: cleanText(q.questTitle, 80), evidence: cleanText(q.evidence, 200) }))
                    .slice(0, 2)
                : [],
            questStepUpdates: Array.isArray(parsed.questStepUpdates) ? parsed.questStepUpdates.slice(0, 3) : [],
            moments: Array.isArray(parsed.moments) ? parsed.moments.slice(0, 2) : [],
            npcFacts: Array.isArray(parsed.npcFacts) ? parsed.npcFacts.slice(0, 3) : [],
            logLines: Array.isArray(parsed.logLines) ? parsed.logLines.filter((l: unknown) => typeof l === 'string' && l.trim()).slice(0, 3) : [],
        };
    } catch (e) {
        // warn, pas debug : une passe qui échoue en silence est indistinguable
        // d'une passe « rien à signaler » — c'est ce qui a masqué le bug LM7.
        log.warn('Journal keeper pass failed (non-fatal):', e);
        return null;
    }
}
