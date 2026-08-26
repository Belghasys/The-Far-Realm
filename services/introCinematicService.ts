import { GoogleGenAI } from '@google/genai';
import { AdventureManifest, CharacterSheet } from '../types';
import { generateGeminiImage, stripNegations } from './geminiImageService';
import { requireViteEnv, viteEnv } from './infra/modelConfig';
import { log } from './infra/logger';

const API_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);
// GM2 — lus via viteEnv (runtime launcher > build Vite > défaut), comme tous
// les autres services : la lecture directe d'import.meta.env figeait le modèle
// au build et rendait runtime.env inopérant dans le jeu installé.
const TTS_MODEL = viteEnv('VITE_TTS_MODEL', import.meta.env.VITE_TTS_MODEL, 'gemini-3.1-flash-tts-preview');
const TTS_VOICE = viteEnv('VITE_TTS_VOICE', import.meta.env.VITE_TTS_VOICE, 'Charon');

let ai: GoogleGenAI | null = null;

export interface IntroCinematicAssets {
    script: string;
    imageUrl?: string;
    audioUrl?: string;
    visualPrompt: string;
    musicPrompt: string;
    firstSceneText: string;
}

function getClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai;
}

function compact(value: string | undefined | null, max = 900): string {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    const clipped = text.slice(0, max);
    const sentenceEnd = Math.max(clipped.lastIndexOf('.'), clipped.lastIndexOf('!'), clipped.lastIndexOf('?'));
    return `${clipped.slice(0, sentenceEnd > 280 ? sentenceEnd + 1 : max).trim()}...`;
}

function firstSceneText(manifest: AdventureManifest): string {
    const firstScene = manifest.firstScene;
    const fallbackScene = manifest.chapters?.[0]?.scenes?.[0];
    const title = firstScene?.title || fallbackScene?.title || 'The first scene';
    const location = firstScene?.location || fallbackScene?.location || 'the opening location';
    const objective = firstScene?.objective || manifest.chapters?.[0]?.objective || manifest.cinematicBrief?.firstSceneHook || '';
    return `${title} @ ${location}${objective ? ` - ${objective}` : ''}`;
}

export function buildIntroNarration(character: CharacterSheet, manifest: AdventureManifest, language: string): string {
    const profile = character.storyProfile || {};
    const baseIntro = compact(manifest.introduction, 850);
    const scene = firstSceneText(manifest);
    const desire = compact(profile.desire, 180);

    if (language.toLowerCase().startsWith('fr')) {
        return compact([
            baseIntro || `${character.name} entre dans une histoire qui porte déjà la marque de ses choix.`,
            desire ? `Tout ramène à son désir : ${desire}.` : '',
            `Puis l'image se fixe sur la première scène : ${scene}.`,
        ].filter(Boolean).join(' '), 1100);
    }

    return compact([
        baseIntro || `${character.name} steps into a story already shaped by their choices.`,
        desire ? `Everything pulls toward one desire: ${desire}.` : '',
        `The image settles on the first playable scene: ${scene}.`,
    ].filter(Boolean).join(' '), 1100);
}

export function buildIntroVisualPrompt(character: CharacterSheet, manifest: AdventureManifest): string {
    const profile = character.storyProfile || {};
    const firstScene = manifest.firstScene;
    // Contrat Klein (même que buildSceneImagePrompt) : la DESCRIPTION d'abord
    // (l'attention du text-encoder pique au début), UNE phrase de style à la
    // fin, AUCUNE négation — en langage naturel, nommer « watermark » peut en
    // invoquer un. Cap 1100 : le proxy Firebase refuse au-delà de 1200 (l'ancien
    // cap 1600 faisait échouer l'image d'intro en mode proxy).
    return compact([
        stripNegations(manifest.cinematicBrief?.visualPrompt),
        `${character.name || 'The hero'}, a ${character.race} ${character.class}${profile.appearance ? ` — ${profile.appearance}` : ''}, stands before ${firstScene?.location || 'a vast shadowed realm'}.`,
        firstScene?.objective ? `Their quest: ${firstScene.objective}.` : '',
        `Mood: ${firstScene?.mood || 'dramatic'}.`,
        manifest.villain?.name ? `Far in the background, a faint ominous emblem of ${manifest.villain.name}.` : '',
        `Epic wide 16:9 key art, painted dark-fantasy concept art, dramatic cinematic lighting.`,
    ].filter(Boolean).join(' '), 1100);
}

export function buildIntroMusicPrompt(manifest: AdventureManifest): string {
    return compact([
        manifest.cinematicBrief?.musicMood,
        'cinematic fantasy prologue, orchestral rise, emotional tension, soft opening, sense of destiny, loopable ambience under narration',
    ].filter(Boolean).join('; '), 600);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function parseAudioMimeType(mimeType: string): { bitsPerSample: number; sampleRate: number } {
    let bitsPerSample = 16;
    let sampleRate = 24000;
    for (const part of mimeType.split(';').map(item => item.trim())) {
        const l16 = part.match(/audio\/L(\d+)/i);
        if (l16) bitsPerSample = Number(l16[1]) || bitsPerSample;
        const rate = part.match(/rate=(\d+)/i);
        if (rate) sampleRate = Number(rate[1]) || sampleRate;
    }
    return { bitsPerSample, sampleRate };
}

function pcmBase64ToWavDataUrl(base64: string, mimeType: string): string {
    const pcm = base64ToUint8Array(base64);
    const { bitsPerSample, sampleRate } = parseAudioMimeType(mimeType);
    const channels = 1;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const wav = new Uint8Array(44 + pcm.length);
    const view = new DataView(wav.buffer);
    const write = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };

    write(0, 'RIFF');
    view.setUint32(4, 36 + pcm.length, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    write(36, 'data');
    view.setUint32(40, pcm.length, true);
    wav.set(pcm, 44);

    return `data:audio/wav;base64,${uint8ArrayToBase64(wav)}`;
}

export async function generateIntroNarrationAudio(script: string): Promise<string | undefined> {
    try {
        const fetchPromise = getClient().models.generateContent({
            model: TTS_MODEL,
            contents: [{
                role: 'user',
                parts: [{ text: `## Transcript:\n${script}` }],
            }],
            config: {
                temperature: 1,
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: TTS_VOICE,
                        },
                    },
                },
            } as any,
        });

        // Timeout de 8 secondes pour éviter de bloquer l'interface indéfiniment
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TTS generation timed out')), 8000)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            const inlineData = (part as any).inlineData;
            if (!inlineData?.data) continue;
            const mimeType = inlineData.mimeType || 'audio/wav';
            if (/audio\/L\d+|pcm/i.test(mimeType)) {
                return pcmBase64ToWavDataUrl(inlineData.data, mimeType);
            }
            return `data:${mimeType};base64,${inlineData.data}`;
        }
    } catch (error) {
        log.warn('⚠️ generateIntroNarrationAudio failed or timed out:', error);
    }

    return undefined;
}

export async function generateIntroCinematicAssets(
    character: CharacterSheet,
    manifest: AdventureManifest,
    language: string
): Promise<IntroCinematicAssets> {
    const script = buildIntroNarration(character, manifest, language);
    const visualPrompt = buildIntroVisualPrompt(character, manifest);
    const musicPrompt = buildIntroMusicPrompt(manifest);
    const sceneText = firstSceneText(manifest);

    // PB4 — TIMEOUTS : le voile ne doit jamais rester bloqué sur « Le voile se
    // rassemble » à cause d'une image ou d'un TTS qui traîne — au-delà, on
    // continue en dégradé (texte + musique).
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
            promise,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
        ]);
    const [imageResult, audioResult] = await Promise.allSettled([
        withTimeout(generateGeminiImage(visualPrompt, { aspectRatio: '16:9' }), 45_000, 'intro image'),
        withTimeout(generateIntroNarrationAudio(script), 30_000, 'intro TTS'),
    ]);

    if (imageResult.status === 'rejected') log.warn('Intro image generation failed:', imageResult.reason);
    if (audioResult.status === 'rejected') log.warn('Intro TTS generation failed:', audioResult.reason);

    return {
        script,
        visualPrompt,
        musicPrompt,
        firstSceneText: sceneText,
        imageUrl: imageResult.status === 'fulfilled' ? imageResult.value : undefined,
        audioUrl: audioResult.status === 'fulfilled' ? audioResult.value : undefined,
    };
}
