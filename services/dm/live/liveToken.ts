/**
 * Jeton éphémère pour la session vocale.
 *
 * La Live API se connecte en WebSocket depuis le navigateur : elle ne peut
 * pas passer par un relais. À la place, la Cloud Function `liveToken`
 * (functions/gemini.js) émet un jeton à usage unique, valable 30 min,
 * verrouillé sur le modèle — c'est lui, et jamais la clé, qui sert de
 * `apiKey` au SDK, avec `apiVersion: 'v1alpha'`. Un jeton par (re)connexion.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FUNCTIONS_REGION } from '../../infra/geminiClient';

export interface LiveToken {
    token: string;
    expiresAt: string;
    remainingToday: number;
}

export async function fetchLiveToken(model: string): Promise<LiveToken> {
    const fn = httpsCallable<{ model: string }, LiveToken>(getFunctions(undefined, FUNCTIONS_REGION), 'liveToken');
    let data: LiveToken | undefined;
    try {
        data = (await fn({ model })).data;
    } catch (err: any) {
        throw new Error(err?.message || 'Jeton de session vocale injoignable.', { cause: err });
    }
    if (!data?.token) throw new Error('Jeton de session vocale vide.');
    return data;
}
