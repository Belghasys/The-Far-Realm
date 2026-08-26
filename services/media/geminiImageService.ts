/**
 * Local Image Generation Service (Decommissioned Gemini Image)
 * Uses local FLUX server for scene/environment images only.
 * Monster portraits come directly from the bestiary imageUrl — never from this service.
 */

import { log } from '../infra/logger';
import { withImageSfxGpu } from './gpuLock';
import { auditBus } from '../infra/auditBus';
import { viteEnv } from '../infra/modelConfig';
import { generateRunwareImage } from './runwareImageService';
import { getAppSettings } from '../../store/settingsStore';

export interface GeminiImageOptions {
    aspectRatio?: string;
    /**
     * Ancres visuelles (data URLs déjà en cache) — style de campagne, héros,
     * PNJ présents. Ignorées par le serveur local, qui ne sait pas les lire :
     * la cohérence par référence est une fonctionnalité du chemin cloud.
     */
    referenceImages?: string[];
}

/**
 * Generate a SCENE/ENVIRONMENT background image using local FLUX.
 * ⚠️ Never use this for monster portraits — use creature.imageUrl directly.
 * Returns a base64 data URL ready to use as CSS background.
 * Throws on failure.
 */
export async function generateGeminiImage(prompt: string, options: GeminiImageOptions = {}): Promise<string> {
    log.info(`🎨 Generating scene image: ${prompt.substring(0, 80)}...`);
    // JAMAIS les data URLs des références dans l'auditBus : jusqu'à ~4 Mo de
    // base64 par événement, stringifiés et retenus 600 entrées — une longue
    // session gonflait de dizaines de Mo (contre-audit 2026-08-22, constat #1).
    // Le compte suffit pour diagnostiquer.
    auditBus.publish('image', prompt.slice(0, 90), {
        prompt,
        aspectRatio: options.aspectRatio,
        referenceImages: options.referenceImages?.length || 0,
    });

    const aspectRatio = options.aspectRatio || '16:9';

    // ── Couture local/cloud (phase 1 du mode hybride, 2026-08-15) ─────────
    // VITE_IMAGE_BACKEND: 'local' (défaut — serveur FLUX/Z-Image sur :8000)
    //                   | 'cloud' (Runware FLUX.2 Klein 4B, ~$0.0006/img).
    // Le prompt est construit AVANT cette couture (buildSceneImagePrompt…) :
    // une seule source de vérité, les deux modes la consomment — c'est ce qui
    // empêche la divergence des jumeaux (leçon du contre-audit). Pas de
    // bascule automatique entre modes : un échec cloud ne tombe PAS sur le
    // local (diagnostic clair > magie).
    const backend = viteEnv('VITE_IMAGE_BACKEND', import.meta.env.VITE_IMAGE_BACKEND, 'local');
    if (backend === 'cloud') {
        // Le palier de modèle est un réglage joueur (Rapide / Qualité), lu à
        // CHAQUE image : basculer dans les Réglages prend effet sur la scène
        // suivante, sans redémarrage.
        const dataUrl = await generateRunwareImage(prompt, aspectRatio, {
            referenceImages: options.referenceImages,
            quality: getAppSettings().imageQuality,
        });
        log.info('🎨 Successfully generated image via cloud backend (Runware)');
        return dataUrl;
    }

    // Check if local image server is configured. Lu via viteEnv (runtime du
    // launcher > build Vite) — la lecture directe d'import.meta.env figeait
    // l'URL au build et ignorait runtime.env dans le jeu installé (même
    // famille que GM2).
    const localServerUrl = viteEnv('VITE_LOCAL_IMAGE_SERVER_URL', import.meta.env.VITE_LOCAL_IMAGE_SERVER_URL);
    if (localServerUrl) {
        log.info(`🎨 Redirecting generation to local server: ${localServerUrl}`);
        try {
            // GPU coordination: image runs as a shared reader — it may overlap
            // sfx, but never the music generation (which needs the GPU alone).
            return await withImageSfxGpu('image', async (signal) => {
                // Timeout PROPRE (120 s) en plus du watchdog gpuLock (200 s) :
                // un serveur gelé ne bloque plus le slot d'image aussi longtemps
                // (audit 2026-08-12 — le fetch n'avait aucun timeout à lui).
                const timeout = AbortSignal.timeout(120_000);
                const localResponse = await fetch(localServerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        aspect_ratio: aspectRatio,
                    }),
                    signal: typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal,
                });
                if (!localResponse.ok) {
                    throw new Error(`Local image server returned HTTP ${localResponse.status}`);
                }
                const data = await localResponse.json();
                if (data.image) {
                    log.info(`🎨 Successfully generated image using local FLUX server`);
                    return data.image;
                }
                throw new Error('Local image server did not return image data');
            });
        } catch (localError) {
            log.debug(`⚠️ Local image server failed:`, localError);
            throw localError;
        }
    }

    throw new Error('Local FLUX image server is not configured.');
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

/**
 * Contrat de prompt (révisé le 2026-08-22).
 *
 * FLUX.2-klein lit du LANGAGE NATUREL (text-encoder LLM) : la description du MJ
 * vient EN PREMIER (l'attention pique au début), puis une seule phrase de style.
 * Aucune négation dans le prompt positif — nommer « watermark » peut en invoquer
 * un ; les exclusions passent par `negativePrompt` (voir runwareImageService).
 *
 * Ces fonctions sont volontairement PURES (aucun accès au store) : c'est ce qui
 * les rend testables et évite un cycle d'imports. L'appelant fournit le style de
 * la campagne et l'apparence du héros.
 */
export const DEFAULT_STYLE_TAGS = 'painted dark-fantasy concept art, dramatic cinematic lighting';

export interface ScenePromptOptions {
    /** Apparence réelle du héros (repli : « race classe »). Vide = pas de héros. */
    hero?: string;
    /** Indice de lumière tiré de l'horloge du monde — appliqué seulement si la
     *  description ne décrit pas déjà la lumière (voir describesLight). */
    timeHint?: string;
    /** Style visuel de la campagne active. Défaut : DEFAULT_STYLE_TAGS. */
    styleTags?: string;
}

/**
 * La description du MJ parle-t-elle DÉJÀ de lumière ?
 *
 * Le système prompt exige du MJ qu'il décrive « the lighting and time of day ».
 * Coller par-dessus « At night, moonlit darkness » produisait des prompts qui se
 * contredisent (« cold blue half-light. At night, moonlit darkness. ») et le
 * modèle tranchait au hasard. On ne complète donc que le silence.
 */
const LIGHT_WORDS = /\b(light|lit|lighting|dark|darkness|dawn|daybreak|dusk|twilight|night|nocturnal|midnight|noon|sun|sunlight|sunset|sunrise|moon|moonlit|moonlight|star|starlight|torch|torchlit|lantern|candle|glow|glowing|gloom|shadow|shadows|blaze|firelight|overcast|golden hour)\b/i;

export function describesLight(description: string): boolean {
    return LIGHT_WORDS.test(description || '');
}

function composeTimeHint(description: string, timeHint?: string): string {
    if (!timeHint) return '';
    return describesLight(description) ? '' : timeHint;
}

/**
 * Scène de combat. `enemyDesc` sert à l'ambiance, JAMAIS au portrait du monstre
 * (celui-ci vient de creature.imageUrl).
 */
export function buildCombatImagePrompt(enemyDesc: string, locationDesc: string, options: ScenePromptOptions = {}): string {
    const { hero, timeHint, styleTags = DEFAULT_STYLE_TAGS } = options;
    const body = `Battle scene: ${enemyDesc}, at ${locationDesc}.`;
    const heroPart = hero ? ` ${hero} stands ready in the foreground, weapon raised.` : '';
    return `${body}${composeTimeHint(`${enemyDesc} ${locationDesc}`, timeHint)}${heroPart} Wide cinematic shot, ${styleTags}.`;
}

/**
 * Scène d'exploration / temps fort narratif.
 *
 * ⚠️ Ne JAMAIS réintroduire « Seen from the perspective of a … » : c'est une
 * consigne de caméra subjective, et le modèle rendait soit une vue à la première
 * personne, soit un personnage aléatoire planté au milieu du décor (cause n°1 des
 * images « hors contexte », audit du 2026-08-22). Le héros est désormais placé en
 * TROISIÈME personne, en marge du cadre, et son identité est verrouillée par son
 * portrait envoyé en `referenceImages`.
 */
export function buildSceneImagePrompt(description: string, options: ScenePromptOptions = {}): string {
    const { hero, timeHint, styleTags = DEFAULT_STYLE_TAGS } = options;
    const heroPart = hero ? ` ${hero} stands at the edge of the frame, seen from behind.` : '';
    return `${description}${composeTimeHint(description, timeHint)}${heroPart} Wide establishing shot, ${styleTags}.`;
}

/**
 * Temps fort / gros plan (`trigger_visual`). Deux différences délibérées avec
 * une scène : PAS de héros injecté (un plan-détail « the cursed amulet » n'a
 * que faire d'un chevalier au bord du cadre) et PAS de « Wide establishing
 * shot » (contredirait le « dramatic close-up » que la description du MJ peut
 * demander — contre-audit 2026-08-22, constat #12). Le cadrage appartient au MJ.
 */
export function buildMomentImagePrompt(description: string, options: ScenePromptOptions = {}): string {
    const { timeHint, styleTags = DEFAULT_STYLE_TAGS } = options;
    return `${description}${composeTimeHint(description, timeHint)} Detailed illustration, ${styleTags}.`;
}

/**
 * Retire les négations d'un prompt d'art rédigé par un LLM (« no text, no
 * UI »…). Sur un modèle en langage naturel, nommer une chose peut l'invoquer —
 * vérifié empiriquement le 2026-08-22 : le negativePrompt n'a PAS suffi à
 * empêcher du texte d'apparaître sur le 4B distillé, donc la seule vraie
 * défense est un prompt positif propre. Les manifestes déjà sauvegardés
 * contiennent encore la formule historique ; ce filet la neutralise à la
 * lecture. Vit ici (module pur, sans dépendance) pour être utilisable par
 * l'intro ET par l'ancre de style sans tirer le service de cinématique.
 */
export function stripNegations(prompt: string | undefined | null): string {
    if (!prompt) return '';
    return String(prompt)
        .replace(/[;,.]?\s*\b(no|without|avoid|exclude|not?)\b[^.;,]*\b(text|watermark|watermarks|ui|interface|logo|signature|caption|letters|words|border|frame)\b[^.;,]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.;,])/g, '$1')
        .replace(/^[;,.\s]+/, '')
        .trim();
}
