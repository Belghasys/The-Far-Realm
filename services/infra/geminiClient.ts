/**
 * Le client Gemini (API REST, pas la session Live) : une seule instance,
 * une seule cle. Avant le rangement du 2026-08-25, cinq services
 * (llmService, journalKeeper, narrationAuditor, branchWriterService,
 * introCinematicService) portaient chacun le meme `getClient()`.
 */
import { GoogleGenAI } from '@google/genai';
import { requireViteEnv } from './modelConfig';

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);

let ai: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return ai;
}
