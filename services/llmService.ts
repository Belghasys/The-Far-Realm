import { CharacterSheet, AdventureManifest } from "../types";
import { GoogleGenAI } from '@google/genai';
import { log } from './logger';
import { requireViteEnv } from './modelConfig';

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);
const PRO_MODEL = requireViteEnv('VITE_LLM_MODEL', import.meta.env.VITE_LLM_MODEL);
const SUMMARY_MODEL = requireViteEnv('VITE_SUMMARY_MODEL', import.meta.env.VITE_SUMMARY_MODEL);

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return ai;
}

/**
 * Summarizes conversation history with the fast text model.
 */
export async function summarizeHistory(
    history: { speaker: 'user' | 'dm', text: string }[],
    characterName: string,
    language: string = 'fr'
): Promise<string> {
    const client = getClient();

    const historyText = history.map(h => `${h.speaker.toUpperCase()}: ${h.text}`).join('\n');
    const langInstruction = language === 'fr' ? "Réponds en FRANÇAIS uniquement." : "Respond in ENGLISH only.";

    const prompt = `
    Tu es un assistant qui résume des sessions de jeu de rôle D&D.
    ${langInstruction}
    
    ## HISTORIQUE DE CONVERSATION
    ${historyText}
    
    ## INSTRUCTIONS
    Crée un résumé NARRATIF en 3-5 phrases maximum qui capture :
    1. Les événements clés (combats, découvertes, dialogues importants)
    2. L'état actuel du personnage ${characterName}
    3. Les objectifs ou quêtes en cours
    4. Les PNJs ou lieux importants mentionnés
    
    ## FORMAT
    - Style narratif, pas de bullet points
    - Maximum 100 mots
    - Commence directement par le résumé, pas de préambule
    
    RÉSUMÉ :
    `;

    try {
        const result = await client.models.generateContent({
            model: SUMMARY_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' }
            } as any
        });
        return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (e) {
        log.error("Summary Generation Error (Gemini):", e);
        return "";
    }
}

/**
 * Generates the adventure manifest with the main writer model.
 */
export async function generateAdventureManifest(
    character: CharacterSheet,
    adventureTitle: string,
    monsterList: string, // Full list of available monsters: "id: Name (CR: X)"
    language: string = 'en'
): Promise<string> {
    const client = getClient();

    const langInstruction = language === 'fr' ? "OUTPUT MUST BE IN FRENCH." : "OUTPUT MUST BE IN ENGLISH.";
    const profile = character.storyProfile || {};
    const dmHooks = (profile.dmHooks || []).filter(Boolean).join('; ') || 'Not specified';

    const prompt = `
    ACT AS THE "ARCHITECT OF DESTINY", A LEGENDARY D&D 5E DUNGEON MASTER AND MASTER STORYTELLER.
    You are creating an EPIC, DEEPLY STRUCTURED "CAMPAIGN MANIFESTO" — a full adventure script
    that will serve as the backbone for an immersive AI-narrated D&D campaign.
    ${langInstruction}

    ### 👤 THE HERO
    - **Name:** ${character.name}
    - **Class/Race:** ${character.race} ${character.class}
    - **Current Level:** ${character.level}
    - **Background:** ${character.background}
    - **Patron Deity:** ${character.deity || 'None'}
    - **Personal Story:** ${character.customBackground || 'Not specified'}
    - **Appearance:** ${profile.appearance || 'Not specified'}
    - **Personality:** ${profile.personality || 'Not specified'}
    - **Core Desire:** ${profile.desire || 'Not specified'}
    - **Fear / Weakness:** ${profile.fear || 'Not specified'}
    - **Bond:** ${profile.bond || 'Not specified'}
    - **Wound / Regret:** ${profile.wound || 'Not specified'}
    - **Ideal:** ${profile.ideal || 'Not specified'}
    - **Flaw:** ${profile.flaw || 'Not specified'}
    - **DM Hooks:** ${dmHooks}
    - **Preferred Cinematic Tone:** ${profile.cinematicStyle || 'dark fantasy cinematic'}
    - **Adventure Theme:** ${adventureTitle}

    ### 🎯 DESIGN PRINCIPLES
    1. **Dynamic Scaling:** All challenges must be mathematically appropriate for Level ${character.level}.
    2. **The 5 Mirrors Rule:** The villain should mirror one aspect of the hero:
       - The Shadow (what the hero could become), The Corruption (twisted version of hero's values),
       - The Superior (does what hero does, but better), The Opposite (philosophical antithesis),
       - The Reflection (same origin, different path).
    3. **Pacing:** Alternate combat → roleplay → exploration → puzzle per chapter.
    4. **Emotional Arc:** Build tension across chapters: Introduction → Rising Action → Midpoint Twist → Escalation → Climax.
    5. **Player Agency:** Every chapter must offer meaningful branching choices that alter the story.
    6. **Musical Atmosphere:** Suggest moods for key scenes (exploration, dungeon, tavern, combat, dramatic, stealth, tension).
    7. **Hero Personalization:** The first chapter, villain mirror, supporting cast, and introduction must directly use the hero's appearance, desire, wound, bond, and DM hooks. Do not write a generic opening.

    ### 📐 OUTPUT FORMAT (JSON — STRICT SCHEMA)
    {
      "villain": {
        "name": "...",
        "archetype": "Shadow|Corruption|Superior|Opposite|Reflection",
        "description": "2-3 sentences: appearance, mannerisms, power",
        "secret": "Hidden truth about the villain",
        "motivation": "What drives the villain — their 'why'",
        "escalationArc": "How the villain escalates: Ch1=rumor, Ch3=first encounter, Ch5=betrayal, Ch7=final",
        "weaknesses": ["weakness1", "weakness2"]
      },
      "chapters": [
        {
          "id": "1", "title": "...", "objective": "...", "status": "active",
          "scenes": [
            { "id": "1a", "title": "Scene title", "description": "3-4 sentences describing the scene", "location": "Location name", "mood": "exploration|dungeon|tavern|combat|dramatic|stealth|tension" }
          ],
          "encounters": [
            { "type": "combat|puzzle|roleplay|trap|exploration", "description": "What happens", "difficulty": "easy|medium|hard|deadly", "monsters": ["monster_id"], "reward": "Description of reward" }
          ],
          "branchingChoices": [
            { "decision": "What the player must decide", "optionA": "Choice A and its path", "optionB": "Choice B and its path", "consequence": "How this shapes the story" }
          ],
          "cliffhanger": "End-of-chapter hook that creates urgency for the next chapter"
        }
      ],
      "introduction": "500-word PROLOGUE that orients the player so they are never 'catapulted' without context. It MUST establish, in narrative prose: (a) WHO the hero is (identity, appearance, reputation), (b) WHERE and WHEN the story opens (the world/region, the era, the immediate place), (c) the STAKES and the looming threat as the hero would currently perceive it — spoiler-free (do NOT reveal the villain's secret/twist), (d) WHY the hero is drawn in (tie to their desire/wound/bond), and (e) the immediate GOAL, ending on the first urgent hook.",
      "cinematicBrief": {
        "logline": "1 sentence cinematic premise for the campaign opening",
        "visualPrompt": "16:9 key art prompt showing the hero, opening location, threat symbol, and mood; no text, no UI",
        "narrationTone": "voice and pacing direction for TTS",
        "musicMood": "orchestration prompt for the intro music",
        "firstSceneHook": "the exact situation after the intro ends"
      },
      "firstScene": {
        "chapterId": "1",
        "sceneId": "1a",
        "title": "Exact playable scene title after the cinematic",
        "location": "Exact starting location",
        "objective": "Concrete first objective the player can act on",
        "mood": "exploration|dungeon|tavern|combat|dramatic|stealth|tension",
        "setup": "Private DM setup for the first playable moment. Must match chapter 1 scene 1 and must not skip ahead.",
        "openingQuestion": "The first grounded choice or question the DM asks the player after the intro"
      },
      "supportingCast": [
        { "name": "...", "role": "ally|merchant|betrayer|quest_giver|rival|mentor", "description": "Appearance and personality", "location": "Where found", "personality": "How they speak" }
      ],
      "rewardTable": [
        { "trigger": "When/how earned", "item": "Item name", "type": "weapon|armor|consumable|misc|gold", "description": "What it does" }
      ],
      "selectedMonsterIds": ["id1", "id2", "..."],
      "fullManifesto": "2000+ word markdown document containing the COMPLETE adventure guide with all narrative details, NPC dialogues, puzzle solutions, secret passages, DM notes, and chapter-by-chapter breakdown"
    }

    ### 📏 REQUIREMENTS
    - Generate **5 to 8 chapters** — each with 2-3 scenes, 1-2 encounters, and at least 1 branching choice
    - The **introduction** must be 500+ words, immersive, answer the five orientation points above (who/where-when/stakes/why/goal), stay spoiler-free, and end with a hook
    - The **firstScene** is locked: it must be the exact first playable scene, aligned to chapter 1 scene 1, with no alternate opening
    - The **fullManifesto** must be 2000+ words — this is the DM's complete reference guide
    - Include **4-6 supporting cast** members with distinct personalities
    - Include **6-10 rewards** tied to specific encounters or story beats
    - Select **25-35 monsters** from the bestiary below, arranged by chapter progression
    - Each chapter's **cliffhanger** must create genuine urgency

    ### 👹 AVAILABLE MONSTERS (CHOOSE 25-35)
    ${monsterList}
    `;

    try {
        const result = await client.models.generateContent({
            model: PRO_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { includeThoughts: false }
            }
        });
        // With responseMimeType: 'application/json', the output is guaranteed to be valid JSON
        const parts = result.candidates?.[0]?.content?.parts || [];
        // Filter out any thinking parts, get only text
        const textPart = parts.find(p => p.text && !p.thought);
        const text = textPart?.text || "";
        return text;
    } catch (e) {
        log.error("Manifest Generation Error (Gemini):", e);
        throw e;
    }
}

// ════════════════════════════════════════════════════════════════════════════
//  AUTHORED-TEMPLATE PERSONALIZATION (Flash, FILL-ONLY)
//  An authored campaign manifest carries {{HERO_*}} tokens. Instead of letting
//  the model rewrite the (carefully authored, balanced) manifest, we ask it ONLY
//  for token→value substitutions, then substitute mechanically. This keeps every
//  fixed field (spine, villain secret, beats, clocks) byte-for-byte intact.
// ════════════════════════════════════════════════════════════════════════════

const TOKEN_RE = /\{\{\s*([A-Z_]+)\s*\}\}/g;

function collectTokens(node: unknown, into: Set<string> = new Set()): Set<string> {
    if (typeof node === 'string') {
        let m: RegExpExecArray | null;
        const re = new RegExp(TOKEN_RE);
        while ((m = re.exec(node)) !== null) into.add(m[1]);
    } else if (Array.isArray(node)) {
        node.forEach(v => collectTokens(v, into));
    } else if (node && typeof node === 'object') {
        Object.values(node as Record<string, unknown>).forEach(v => collectTokens(v, into));
    }
    return into;
}

function substituteTokens<T>(node: T, values: Record<string, string>): T {
    const sub = (s: string) => s.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_m, k: string) => (values[k] ?? `{{${k}}}`));
    if (typeof node === 'string') return sub(node) as unknown as T;
    if (Array.isArray(node)) return node.map(v => substituteTokens(v, values)) as unknown as T;
    if (node && typeof node === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = substituteTokens(v, values);
        return out as unknown as T;
    }
    return node;
}

/**
 * Fill an authored manifest's {{HERO_*}} tokens for THIS character using the fast
 * model (thinking on), then substitute mechanically. Never throws — falls back to
 * deterministic per-token values so no raw token can survive.
 */
export async function personalizeAuthoredManifest(
    manifest: AdventureManifest,
    character: CharacterSheet,
    language: string = 'fr'
): Promise<AdventureManifest> {
    const tokens = Array.from(collectTokens(manifest));
    if (!tokens.length) return manifest;

    const profile = character.storyProfile || {};
    const langInstruction = language === 'fr' ? 'Réponds en FRANÇAIS.' : 'Respond in ENGLISH.';

    // Deterministic fallbacks — used for any token the model omits/leaves blank.
    const fallbacks: Record<string, string> = {
        HERO_NAME: character.name || 'le héros',
        HERO_RACE_CLASS: `${character.race || ''} ${character.class || ''}`.trim() || 'aventurier',
        HERO_DESIRE: profile.desire || 'ce qu’il cherche au plus profond',
        HERO_WOUND: profile.wound || 'une vieille blessure jamais refermée',
        HERO_BOND: profile.bond || 'ce qui lui est le plus cher',
        HERO_HOOK: 'le destin l’a mené dans le Nord',
        PERSONAL_LOSS: `un compagnon de route mort de froid dans le Nord, que ${character.name || 'le héros'} n’a pas su sauver`,
    };

    const prompt = `
${langInstruction}
Tu personnalises un scénario PRÉ-ÉCRIT pour CE héros. Tu NE réécris RIEN : tu fournis seulement la valeur de chaque jeton.

HÉROS :
- Nom : ${character.name || 'Inconnu'}
- Race/Classe : ${character.race} ${character.class}
- Désir : ${profile.desire || 'non précisé'}
- Blessure/Regret : ${profile.wound || 'non précisé'}
- Lien : ${profile.bond || 'non précisé'}
- Peur : ${profile.fear || 'non précisé'}
- Historique : ${character.customBackground || profile.appearance || 'non précisé'}

JETONS À REMPLIR : ${tokens.join(', ')}

CONTRAINTES :
- {{HERO_RACE_CLASS}} : en toutes lettres et en ${language === 'fr' ? 'français' : 'anglais'} (ex. « nain guerrier »).
- {{PERSONAL_LOSS}} : OBLIGATOIREMENT une personne / un être cher NOMMÉ et concret (jamais un concept abstrait) — c'est ce que le froid montrera au héros, debout dans la neige. Dérive-le du lien/blessure si possible.
- {{HERO_HOOK}} : une raison concrète et brève qui a mené CE héros dans le Nord glacé.
- Court, évocateur, cohérent avec le ton dark-fantasy. Aucune valeur vide.

Réponds en JSON STRICT : {"values": { ${tokens.map(t => `"${t}": "..."`).join(', ')} }}`.trim();

    let values: Record<string, string> = {};
    try {
        const client = getClient();
        const result = await client.models.generateContent({
            model: PRO_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json', thinkingConfig: { includeThoughts: false } },
        });
        const parts = result.candidates?.[0]?.content?.parts || [];
        const text = parts.find(p => p.text && !p.thought)?.text || '{}';
        const parsed = JSON.parse(text);
        values = (parsed && typeof parsed === 'object' && parsed.values) ? parsed.values : (parsed || {});
    } catch (e) {
        log.error('Authored-manifest personalization failed; using deterministic fallbacks.', e);
    }

    // Guarantee every token has a non-empty value.
    for (const t of tokens) {
        if (!values[t] || !String(values[t]).trim()) values[t] = fallbacks[t] || 'cette histoire';
    }

    return substituteTokens(manifest, values);
}
