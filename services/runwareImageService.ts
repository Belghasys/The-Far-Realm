/**
 * Adaptateur images CLOUD — Runware / FLUX.2 [klein] 4B.
 *
 * Phase 1 du mode hybride (2026-08-15) : le jeu reste en LOCAL par défaut ;
 * ce chemin ne s'active que si VITE_IMAGE_BACKEND=cloud. Contrat identique au
 * serveur local (une data URL base64 en sortie) pour que TOUT l'aval —
 * galerie IndexedDB, export de chronique, CSS background — reste inchangé.
 *
 * Modèles : voir CLOUD_MODELS plus bas — `fast` (klein 4B, Apache 2.0) et
 * `high` (klein 9B, licence NON commerciale, autorisé ici parce que cette
 * build n'est pas distribuée — lire l'avertissement complet sur CLOUD_MODELS
 * AVANT tout build public). Le choix vient du réglage joueur `imageQuality`.
 *
 * Clé API — ordre de résolution, et pourquoi il n'y a PAS de variable VITE_ :
 *   1. localStorage 'dnd_runware_key'  (BYOK — la clé du joueur, sur SA machine)
 *   2. runtime.env RUNWARE_API_KEY     (installé — injecté par le launcher,
 *                                       jamais présent dans le bundle)
 * Une variable VITE_ serait inlinée en clair dans le JS distribué (audit LM18) ;
 * quiconque builderait l'installeur avec sa clé en .env la livrerait à tous
 * les joueurs. En dev : localStorage.setItem('dnd_runware_key', '...') dans la
 * console, une fois.
 */

import { log } from './logger';
import { viteEnv } from './modelConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase';

/** Transport par défaut : la Cloud Function `generateImage` (clé dans Secret
 *  Manager, quota 60 img/jour/joueur, kill-switch config/media). Région fixée
 *  dans functions/index.js — garder les deux synchrones. */
async function generateViaFirebaseProxy(prompt: string, aspectRatio: string, options: RunwareOptions): Promise<string> {
    const { width, height } = dimensionsFor(aspectRatio);
    const referenceImages = sanitizeReferences(options.referenceImages);
    const quality = options.quality === 'high' ? 'high' : 'fast';
    const fn = httpsCallable<
        { prompt: string; width: number; height: number; quality: ImageQuality; referenceImages?: string[] },
        { imageUrl: string; cost: number | null; remainingToday: number }
    >(
        getFunctions(firebaseApp, 'europe-west1'),
        'generateImage',
    );
    let result;
    try {
        result = await fn({ prompt, width, height, quality, ...(referenceImages.length ? { referenceImages } : {}) });
    } catch (err: any) {
        // HttpsError → message serveur actionnable (quota atteint, connexion
        // requise, service désactivé…) : on le fait remonter tel quel au
        // transcript via l'avis d'échec d'image.
        throw new Error(err?.message || 'Proxy image Firebase injoignable.', { cause: err });
    }
    const imageUrl = result.data?.imageUrl;
    if (!imageUrl) throw new Error('Proxy image : réponse sans imageUrl.');
    log.info(`🎨 Cloud image via Firebase proxy (${quality}, ${width}x${height}, ${referenceImages.length} réf., reste aujourd'hui: ${result.data.remainingToday})`);
    return await toDataUrl(imageUrl, AbortSignal.timeout(30_000));
}

export interface RunwareOptions {
    /** Data URLs (ou URLs) servant d'ancre visuelle — style, héros, PNJ. Max 4. */
    referenceImages?: string[];
    /** Modèle à employer — réglage joueur « Rapide / Qualité ». */
    quality?: ImageQuality;
}

/**
 * Ne garde que des références exploitables et plafonne à 4 (limite du modèle).
 * Les entrées vides/non-chaînes sont écartées silencieusement : une référence
 * manquante ne doit JAMAIS faire échouer une image — elle la rend seulement
 * moins cohérente.
 */
function sanitizeReferences(references: string[] | undefined): string[] {
    if (!Array.isArray(references)) return [];
    return references
        .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
        .slice(0, MAX_REFERENCE_IMAGES);
}

const RUNWARE_ENDPOINT = 'https://api.runware.ai/v1';

/**
 * Table des modèles — pilotée par le réglage joueur `imageQuality`.
 *
 *   fast  runware:400@4  FLUX.2 [klein] 4B distillé — Apache 2.0, ~$0.0006
 *   high  runware:400@2  FLUX.2 [klein] 9B distillé — ~$0.00078
 *
 * ⚠️ LICENCE — `runware:400@2` (9B) est sous **FLUX Non-Commercial License v2.1**.
 * Sa clause (b) exclut du périmètre non-commercial tout usage « in direct
 * interactions with or that has impact on end users » : un jeu distribué à des
 * joueurs en sort, même gratuit. Décision explicite du 2026-08-22 : cette build
 * n'est PAS distribuée, donc le 9B est autorisé ici. AVANT toute distribution
 * publique, repasser `high` sur `runware:400@5` (klein 4B Base, Apache 2.0,
 * ~$0.0019, non distillé — 28 steps et CFG réels). Les OUTPUTS déjà générés
 * restent libres dans les deux cas (la licence ne revendique aucun droit dessus).
 *
 * Les deux modèles acceptent `referenceImages` (1 à 4) et `negativePrompt`.
 */
export type ImageQuality = 'fast' | 'high';

export const CLOUD_MODELS: Record<ImageQuality, { air: string; steps: number }> = {
    fast: { air: 'runware:400@4', steps: 4 },
    high: { air: 'runware:400@2', steps: 4 },
};

/** Nombre maximum d'images de référence accepté par FLUX.2 klein (4B et 9B). */
export const MAX_REFERENCE_IMAGES = 4;

/**
 * Négatif court et concret. Le schéma Runware l'accepte sur les deux modèles ;
 * sur un distillé qui tourne en guidance basse il peut être partiellement
 * ignoré — d'où le format « liste de noms » plutôt qu'une phrase, et surtout
 * AUCUNE négation dans le prompt positif (nommer « watermark » là-bas peut en
 * invoquer un).
 */
const NEGATIVE_PROMPT = 'text, watermark, signature, logo, blurry, deformed hands, extra limbs, distorted anatomy';

const STORAGE_KEY = 'dnd_runware_key';

export function getRunwareKey(): string {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored.trim()) return stored.trim();
    } catch { /* stockage restreint */ }
    // runtime.env du launcher (jeu installé, clé posée par le joueur).
    return viteEnv('RUNWARE_API_KEY', undefined);
}

export function isRunwareConfigured(): boolean {
    return Boolean(getRunwareKey());
}

// Dimensions par ratio — multiples de 64 (le `clampDim` du proxy arrondit au
// multiple de 64 le plus proche : choisir autre chose ferait diverger le
// direct et le proxy), surface ≤ 1024² (au-delà, Runware facture plus cher).
//
// 16:9 est passé de 1024×576 (0,59 MP) à 1216×704 (0,86 MP) : le modèle est
// entraîné en 1024², à 0,59 MP les détails partaient en bouillie. 1216×704 est
// le plus grand couple multiple de 64 sous le plafond de surface — ratio 1,73
// au lieu de 1,78, invisible derrière un `background-size: cover`.
function dimensionsFor(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
        case '1:1': return { width: 1024, height: 1024 };
        case '9:16': return { width: 576, height: 1024 };
        case '3:4': return { width: 768, height: 1024 };
        case '4:3': return { width: 1024, height: 768 };
        case '16:9':
        default: return { width: 1216, height: 704 };
    }
}

/** Télécharge l'URL CDN Runware et la convertit en data URL base64 — même
 *  contrat que le serveur local, pour une parité totale côté galerie/export. */
async function toDataUrl(imageUrl: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(imageUrl, { signal });
    if (!response.ok) throw new Error(`Image CDN fetch failed: HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('FileReader failed on CDN image'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Génère une image de scène et retourne une data URL base64.
 *
 * Deux transports (2026-08-19, décision « met la clé dans Firebase ») :
 *  1. DÉFAUT — le proxy Cloud Function `generateImage` : la clé Runware vit
 *     dans Secret Manager, jamais côté client ; auth Firebase obligatoire,
 *     quotas par joueur et kill-switch côté serveur (functions/index.js).
 *  2. OPTION BYOK — si le joueur a posé SA clé (localStorage 'dnd_runware_key'
 *     ou runtime.env), appel direct Runware : illimité, ne passe pas par toi.
 * Pas de gpuLock ici : aucune contention VRAM sur un appel cloud.
 */
export async function generateRunwareImage(prompt: string, aspectRatio: string = '16:9', options: RunwareOptions = {}): Promise<string> {
    const apiKey = getRunwareKey();
    if (!apiKey) {
        return await generateViaFirebaseProxy(prompt, aspectRatio, options);
    }

    const { width, height } = dimensionsFor(aspectRatio);
    const model = CLOUD_MODELS[options.quality === 'high' ? 'high' : 'fast'];
    const referenceImages = sanitizeReferences(options.referenceImages);
    const timeout = AbortSignal.timeout(60_000);

    const response = await fetch(RUNWARE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify([{
            taskType: 'imageInference',
            taskUUID: crypto.randomUUID(),
            model: model.air,
            positivePrompt: prompt,
            negativePrompt: NEGATIVE_PROMPT,
            width,
            height,
            steps: model.steps,
            numberResults: 1,
            outputType: 'URL',
            outputFormat: 'WEBP',
            includeCost: true,
            // Cohérence visuelle : ancre de style + héros + PNJ présents.
            // Omis quand la liste est vide — envoyer un tableau vide fait
            // basculer certains modèles en mode édition.
            ...(referenceImages.length ? { referenceImages } : {}),
        }]),
        signal: timeout,
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || json?.errors?.length) {
        const message = json?.errors?.[0]?.message || `HTTP ${response.status}`;
        throw new Error(`Runware imageInference failed: ${message}`);
    }
    const imageUrl: string | undefined = json?.data?.[0]?.imageURL;
    if (!imageUrl) {
        throw new Error('Runware response had no imageURL.');
    }

    log.info(`🎨 Cloud image generated (${model.air}, ${width}x${height}, ${referenceImages.length} réf., cost=${json?.data?.[0]?.cost ?? 'n/a'})`);
    return await toDataUrl(imageUrl, timeout);
}
