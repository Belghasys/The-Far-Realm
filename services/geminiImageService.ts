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
 */
const QUALITY_TAGS = 'highly detailed, intricate, volumetric lighting, atmospheric depth, rich color grading, sharp focus, professional concept art, ArtStation trending, dramatic cinematic composition';
const NEGATIVE_TAGS = 'no UI, no text, no watermark, no logo, no signature';

export function buildCombatImagePrompt(enemyDesc: string, locationDesc: string, characterInfo?: string): string {
    const charPart = characterInfo ? `, from the perspective of a ${characterInfo} adventurer` : '';
    return `Epic D&D dark-fantasy battle illustration, cinematic wide shot of the battlefield, enemies suggested in the environment: ${enemyDesc}, location: ${locationDesc}${charPart}, dynamic action composition, dramatic ominous light, readable terrain, painted digital art, ${QUALITY_TAGS}, ${NEGATIVE_TAGS}`;
}

export function buildSceneImagePrompt(description: string, characterInfo?: string): string {
    const charPart = characterInfo ? `, mood fitting a ${characterInfo} explorer` : '';
    return `Cinematic D&D fantasy environment illustration, ${description}${charPart}, wide establishing shot, rich evocative atmosphere, detailed terrain and textures, painted digital art, ${QUALITY_TAGS}, ${NEGATIVE_TAGS}`;
}

export function buildPortraitPrompt(creatureName: string, creatureType: string): string {
    return `D&D monster portrait of a ${creatureName}, ${creatureType} creature, dark fantasy art, dramatic lighting, detailed face, bust shot, no background text, professional illustration`;
}
