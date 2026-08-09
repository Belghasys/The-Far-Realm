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
import { GoogleGenAI } from '@google/genai';
import { log } from './logger';
import { requireViteEnv, viteEnv } from './modelConfig';

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);
// Même famille que l'auditeur : extraction mécanique fréquente → modèle léger
// (VITE_AUDIT_MODEL), fallback sur le modèle de résumé si absent.
const KEEPER_MODEL = viteEnv(
    'VITE_AUDIT_MODEL',
    import.meta.env.VITE_AUDIT_MODEL,
    requireViteEnv('VITE_SUMMARY_MODEL', import.meta.env.VITE_SUMMARY_MODEL)
);

let ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return ai;
}

export interface JournalKeeperInput {
    /** Recent transcript lines (already filtered of [SYSTEM] noise). */
    transcriptLines: string[];
    /** Active quests with their step states, as compact lines. */
    activeQuests: string[];
    /** Known NPC names (to avoid inventing new ones needlessly). */
    npcNames: string[];
    /** Chronicle titles already recorded (avoid duplicates). */
    recentMoments: string[];
    language: string;
}

export interface JournalKeeperResult {
    questStepUpdates: Array<{ questTitle: string; stepText: string; done: boolean }>;
    moments: Array<{ title: string; description: string }>;
    npcFacts: Array<{ name: string; fact: string }>;
}

export async function runJournalKeeper(input: JournalKeeperInput): Promise<JournalKeeperResult | null> {
    const dialogue = input.transcriptLines.join('\n').trim().slice(0, 6000);
    if (!dialogue) return null;

    const prompt = `
You are the silent SCRIBE of a solo D&D game. Compare the recent dialogue with the journal and list ONLY what clearly happened in the fiction but is MISSING from the records. Never invent, never speculate, never duplicate.

## ACTIVE QUESTS (with steps already recorded)
${input.activeQuests.map(q => `- ${q}`).join('\n') || '- none'}

## KNOWN NPCS
${input.npcNames.join(', ') || 'none'}

## CHRONICLE MOMENTS ALREADY RECORDED (do not re-log these)
${input.recentMoments.map(m => `- ${m}`).join('\n') || '- none'}

## RECENT DIALOGUE (player + DM)
${dialogue}

## RULES
- questStepUpdates: an EXISTING quest step listed above was clearly accomplished in the dialogue but marked "todo" → report it (questTitle + the step's text, done=true). A clearly new intermediate objective the DM announced for an existing quest may be added as a new step (done=false). Max 3.
- moments: a MAJOR story beat (revelation, victory, betrayal, arrival at a landmark, pact) with no matching chronicle entry. Max 2. Title ≤ 60 chars, description 1-2 sentences, in ${input.language === 'fr' ? 'French' : 'English'}.
- npcFacts: a concrete fact learned about a KNOWN NPC (motive, secret, location, promise). Max 3, each ≤ 140 chars.
- When nothing qualifies, return empty arrays. That is the NORMAL outcome.
`;

    try {
        const result = await getClient().models.generateContent({
            model: KEEPER_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
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
                    },
                    required: ['questStepUpdates', 'moments', 'npcFacts'],
                },
            } as any,
        });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (!text) return null;
        const parsed = JSON.parse(text);
        return {
            questStepUpdates: Array.isArray(parsed.questStepUpdates) ? parsed.questStepUpdates.slice(0, 3) : [],
            moments: Array.isArray(parsed.moments) ? parsed.moments.slice(0, 2) : [],
            npcFacts: Array.isArray(parsed.npcFacts) ? parsed.npcFacts.slice(0, 3) : [],
        };
    } catch (e) {
        log.debug('Journal keeper pass failed (non-fatal):', e);
        return null;
    }
}
