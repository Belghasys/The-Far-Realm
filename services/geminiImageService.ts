/**
 * Local Image Generation Service (Decommissioned Gemini Image)
 * Uses local FLUX server for scene/environment images only.
 * Monster portraits come directly from the bestiary imageUrl — never from this service.
 */

import { log } from './logger';
import { withImageSfxGpu } from './gpuLock';
import { auditBus } from './auditBus';

export interface GeminiImageOptions {
    aspectRatio?: string;
    imageSize?: '512' | '1K' | '2K' | '4K';
    useGrounding?: boolean;
}

/**
 * Generate a SCENE/ENVIRONMENT background image using local FLUX.
 * ⚠️ Never use this for monster portraits — use creature.imageUrl directly.
 * Returns a base64 data URL ready to use as CSS background.
 * Throws on failure.
 */
export async function generateGeminiImage(prompt: string, options: GeminiImageOptions = {}): Promise<string> {
    log.info(`🎨 Generating scene image: ${prompt.substring(0, 80)}...`);
    auditBus.publish('image', prompt.slice(0, 90), { prompt, ...options });

    const aspectRatio = options.aspectRatio || '16:9';

    // Check if local image server is configured
    const localServerUrl = import.meta.env.VITE_LOCAL_IMAGE_SERVER_URL;
    if (localServerUrl) {
        log.info(`🎨 Redirecting generation to local server: ${localServerUrl}`);
        try {
            // GPU coordination: image runs as a shared reader — it may overlap
            // sfx, but never the music generation (which needs the GPU alone).
            return await withImageSfxGpu('image', async (signal) => {
                const localResponse = await fetch(localServerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        aspect_ratio: aspectRatio,
                    }),
                    signal,
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

/**
 * Get a monster portrait URL directly from the bestiary.
 * This NEVER calls Gemini — it uses the pre-existing imageUrl.
 */
export function getMonsterPortrait(imageUrl: string | undefined): string | undefined {
    return imageUrl; // Pass-through — just a semantic alias for clarity
}

// ─── Prompt Builders ─────────────────────────────────────────────────────────

/**
 * Build a combat SCENE background prompt.
 * enemyDesc is used for atmosphere only, NOT for the portrait.
 *
 * FLUX.2-klein reads NATURAL LANGUAGE (LLM text encoder) and runs with
 * guidance_scale=0 → there is NO negative prompt. The old wrapper buried the
 * DM's description under 9 quality clichés + 5 pseudo-negations ("no text,
 * no watermark") whose nouns could literally summon text/watermarks. New
 * contract: the DM's description FIRST (attention peaks early), then ONE short
 * style sentence. Nothing else.
 */
const STYLE_TAGS = 'painted dark-fantasy concept art, dramatic cinematic lighting';

export function buildCombatImagePrompt(enemyDesc: string, locationDesc: string, characterInfo?: string): string {
    const charPart = characterInfo ? ` A ${characterInfo} adventurer stands ready in the foreground.` : '';
    return `Battle scene: ${enemyDesc}, at ${locationDesc}.${charPart} Wide cinematic shot, ${STYLE_TAGS}.`;
}

export function buildSceneImagePrompt(description: string, characterInfo?: string): string {
    const charPart = characterInfo ? ` Seen from the perspective of a ${characterInfo} adventurer.` : '';
    return `${description}${charPart} Wide establishing shot, ${STYLE_TAGS}.`;
}

export function buildPortraitPrompt(creatureName: string, creatureType: string): string {
    return `D&D monster portrait of a ${creatureName}, ${creatureType} creature, dark fantasy art, dramatic lighting, detailed face, bust shot, no background text, professional illustration`;
}
