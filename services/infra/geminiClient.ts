/**
 * Le client Gemini TEXTE (API REST, pas la session Live).
 *
 * Depuis le 2026-08-27 il n'y a plus de clé dans le navigateur : chaque
 * appel passe par la Cloud Function `geminiText` (functions/gemini.js), qui
 * porte la clé, vérifie l'auth et les quotas, et renvoie la réponse Gemini
 * telle quelle (candidates, usageMetadata, text). Les cinq appelants
 * (llmService, journalKeeper, narrationAuditor, branchWriterService,
 * introCinematicService) gardent la même forme d'appel :
 *     getGeminiClient().models.generateContent({ model, contents, config })
 */
import type { Candidate, GenerateContentConfig, ContentListUnion, GenerateContentResponseUsageMetadata } from '@google/genai';
import { getFunctions, httpsCallable } from 'firebase/functions';

/** Région des Functions — garder synchrone avec REGION dans functions/. */
export const FUNCTIONS_REGION = 'europe-west1';

export interface GeminiTextRequest {
    model: string;
    contents: ContentListUnion;
    config?: GenerateContentConfig;
    /** `memory` = passe de fond (greffier, résumés, auditeur, faits) : son
     *  propre quota côté serveur, jamais facturée au joueur. Défaut : text. */
    purpose?: 'memory' | 'text';
}

/** Ce que le relais renvoie : le sous-ensemble sérialisable de GenerateContentResponse. */
export interface GeminiTextResponse {
    candidates?: Candidate[] | null;
    usageMetadata?: GenerateContentResponseUsageMetadata | null;
    promptFeedback?: unknown;
    text?: string | null;
}

export interface GeminiTextClient {
    models: { generateContent(request: GeminiTextRequest): Promise<GeminiTextResponse> };
}

let client: GeminiTextClient | null = null;

async function generateContent(request: GeminiTextRequest): Promise<GeminiTextResponse> {
    const fn = httpsCallable<GeminiTextRequest, GeminiTextResponse>(
        // App Firebase par défaut (initialisée par persistence/firebase.ts
        // dès l'écran de connexion) : infra ne doit pas importer persistence.
        getFunctions(undefined, FUNCTIONS_REGION),
        'geminiText',
    );
    try {
        const { data } = await fn({ model: request.model, contents: request.contents, ...(request.config ? { config: request.config } : {}), ...(request.purpose ? { purpose: request.purpose } : {}) });
        return data ?? {};
    } catch (err: any) {
        // HttpsError → message serveur (quota, connexion requise, erreur
        // Gemini relayée) : les appelants ont leurs propres replis.
        const error = new Error(err?.message || 'Relais Gemini injoignable.', { cause: err });
        // Un refus de QUOTA est nommé : services/dm/quotaWatch le rend visible
        // (une fois par session) au lieu d'un warn dans une console vide.
        if (err?.code === 'functions/resource-exhausted') error.name = 'QuotaExhaustedError';
        throw error;
    }
}

export function getGeminiClient(): GeminiTextClient {
    if (!client) client = { models: { generateContent } };
    return client;
}
