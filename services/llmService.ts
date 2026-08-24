import { CharacterSheet, AdventureManifest } from "../types";
import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import { log } from './logger';
import { requireViteEnv, viteEnv } from './modelConfig';
import { collectTokens, substituteTokens } from './manifestTokens';

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);
const PRO_MODEL = requireViteEnv('VITE_LLM_MODEL', import.meta.env.VITE_LLM_MODEL);
const SUMMARY_MODEL = requireViteEnv('VITE_SUMMARY_MODEL', import.meta.env.VITE_SUMMARY_MODEL);
// Extraction de faits = tâche mécanique (schema JSON) → modèle léger dédié
// (VITE_AUDIT_MODEL, partagé avec l'auditeur/greffier).
const FACTS_MODEL = viteEnv('VITE_AUDIT_MODEL', import.meta.env.VITE_AUDIT_MODEL, SUMMARY_MODEL);

// Chaîne de secours Flash (demande utilisateur 2026-08-20) : 3.7-flash par
// défaut, puis 3.6 et 3.5 en repli si le modèle est indisponible/surchargé.
// Le modèle du .env passe en tête s'il diffère — la chaîne suit derrière.
const FLASH_BACKUPS = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
function flashChain(primary: string): string[] {
    const clean = String(primary || '').trim().replace(/^models\//, '');
    return [...new Set([clean, ...FLASH_BACKUPS].filter(Boolean))];
}
const STORY_CHAIN = flashChain(PRO_MODEL);      // histoire principale (manifeste)
// RÉSUMEUR (décision utilisateur 2026-08-22) : gemini-3.5-flash-lite fait
// office de greffier ET de résumeur — les gros Flash (3.5/3.6/3.7) sont
// SORTIS de ce chemin, y compris comme repli : le seul secours du lite est
// flash-lite-latest. Un résumé raté n'est pas une perte (la purge n'efface
// qu'après un résumé réussi) ; le prochain passage retentera.
const SUMMARY_CHAIN = [...new Set([
    String(SUMMARY_MODEL || '').trim().replace(/^models\//, ''),
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
].filter(Boolean))];

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return ai;
}

/** generateContent avec bascule : chaque modèle de la chaîne est tenté dans
 *  l'ordre ; on ne relance PAS sur le même modèle (le repli suffit, et un
 *  prompt réellement invalide échouera de toute façon sur les trois). */
async function generateWithFallback(chain: string[], request: Record<string, unknown>): Promise<GenerateContentResponse> {
    let lastError: unknown;
    for (let i = 0; i < chain.length; i++) {
        try {
            return await getClient().models.generateContent({ ...request, model: chain[i] } as any);
        } catch (e) {
            lastError = e;
            const next = chain[i + 1];
            log.warn(`LLM ${chain[i]} a échoué${next ? ` → bascule sur ${next}` : ' (plus de repli)'}:`, e instanceof Error ? e.message : e);
        }
    }
    throw lastError;
}

/**
 * Summarizes conversation history with the fast text model.
 *
 * CUMULATIVE: pass the previous summary (if any) so the new one folds it in —
 * the output is the FULL "story so far", not just the latest archived segment.
 * This summary is re-injected into the DM system prompt and the director
 * context, so it must stand alone across reloads and multiple purges.
 */
export async function summarizeHistory(
    history: { speaker: 'user' | 'dm', text: string }[],
    characterName: string,
    language: string = 'fr',
    previousSummary: string = ''
): Promise<string> {

    const historyText = history.map(h => `${h.speaker.toUpperCase()}: ${h.text}`).join('\n');
    const langInstruction = language === 'fr' ? "Réponds en FRANÇAIS uniquement." : "Respond in ENGLISH only.";

    const prompt = `
    Tu es un assistant qui résume des campagnes de jeu de rôle D&D au long cours.
    ${langInstruction}
    ${previousSummary ? `
    ## RÉSUMÉ EXISTANT DE LA CAMPAGNE (les événements plus anciens)
    ${previousSummary}
    ` : ''}
    ## NOUVEAU SEGMENT DE CONVERSATION À INTÉGRER
    ${historyText}

    ## INSTRUCTIONS
    Produis LE résumé complet de la campagne : fusionne le résumé existant (s'il y en a un)
    avec le nouveau segment. Le résultat remplace tout — il doit se suffire à lui-même.
    Capture, par ordre d'importance :
    1. L'arc principal : la quête, le vilain/la menace, où en est le héros ${characterName}
    2. Les événements marquants (combats décisifs, morts, révélations, trahisons)
    3. Les promesses, dettes, serments et menaces en suspens (qui doit quoi à qui)
    4. Les PNJ importants : nom, rôle, attitude envers le héros
    5. Les lieux clés et les objets importants acquis ou perdus
    Ne perds JAMAIS un élément du résumé existant qui n'a pas été résolu depuis.

    ## CHRONOLOGIE (CRITIQUE)
    Respecte STRICTEMENT l'ordre des événements : le résumé existant décrit le
    passé, le nouveau segment vient APRÈS. Des marqueurs [J1], [J2]… indiquent
    le jour en jeu — sers-t'en pour ordonner et n'inverse jamais deux journées.
    Distingue clairement ce qui est ACCOMPLI (au passé, réglé) de ce qui est EN
    COURS — une quête bouclée ne doit jamais redevenir active dans le résumé.

    ## FORMAT
    - Style narratif compact, présent de narration, pas de bullet points
    - Entre 250 et 450 mots
    - Commence directement par le résumé, pas de préambule

    RÉSUMÉ :
    `;

    try {
        const result = await generateWithFallback(SUMMARY_CHAIN, {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' }
            } as any
        });
        // LM7 (contre-audit) — parts[0] peut être une part « thought » avec
        // thinkingConfig : le résumé revenait vide, la purge était retentée à
        // l'infini et la mémoire gonflait sans borne. Patron de la ligne ~325.
        const parts = result.candidates?.[0]?.content?.parts || [];
        return parts.find(p => p.text && !(p as any).thought)?.text?.trim() || "";
    } catch (e) {
        log.error("Summary Generation Error (Gemini):", e);
        return "";
    }
}

// ── Architecture « secrétaire + résumeur » (2026-08-20) ──────────────────────
// Le résumeur ne relit plus le dialogue brut : il compresse les LIGNES DE LOG
// (notes structurées du moteur + du secrétaire) — entrée plus dense, résumé
// plus précis, moins de tokens.

/** Digest FIGÉ d'un chapitre clos (~80-120 mots, anglais — langue du prompt
 *  MJ). Rédigé UNE fois à la clôture, jamais re-résumé : le passé n'érode plus. */
export async function summarizeChapterDigest(
    chapterTitle: string,
    logLines: string[],
    characterName: string,
): Promise<string> {
    if (!logLines.length) return "";
    const prompt = `
    You write the PERMANENT chapter digest of a solo D&D campaign. It will be
    re-injected verbatim into the DM's context for the rest of the campaign.

    ## CHAPTER: ${chapterTitle}
    ## CAMPAIGN LOG LINES FOR THIS CHAPTER (chronological, [D#] = in-world day)
    ${logLines.map(l => `- ${l}`).join('\n')}

    ## RULES
    - ENGLISH, 80-120 words, narrative compact style, past tense.
    - Keep EVERY: named foe killed, promise/debt made, key item gained or lost,
      NPC relationship shift, revelation. Drop travel filler and minor loot.
    - Hero is ${characterName}. Start directly with the digest, no preamble.
    `;
    try {
        const result = await generateWithFallback(SUMMARY_CHAIN, {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { thinkingConfig: { thinkingLevel: 'LOW' } } as any,
        });
        const parts = result.candidates?.[0]?.content?.parts || [];
        return parts.find(p => p.text && !(p as any).thought)?.text?.trim() || "";
    } catch (e) {
        log.error("Chapter digest generation error:", e);
        return "";
    }
}

/** Digest d'ACTE : plie les digests de chapitre d'un acte clos en un seul bloc
 *  (~100-140 mots, anglais). Sans ce pliage, 19 digests de chapitre occupaient
 *  35 % du contexte directeur en fin de campagne longue. */
export async function summarizeActDigest(
    actTitle: string,
    chapterDigests: { title: string; text: string }[],
    characterName: string,
): Promise<string> {
    if (!chapterDigests.length) return "";
    const prompt = `
    You fold the PERMANENT chapter digests of one completed ACT of a solo D&D
    campaign into a single act digest. It replaces them in the DM's context for
    the rest of the campaign.

    ## ACT: ${actTitle}
    ## CHAPTER DIGESTS (chronological)
    ${chapterDigests.map(d => `### ${d.title}\n${d.text}`).join('\n')}

    ## RULES
    - ENGLISH, 100-140 words, narrative compact style, past tense.
    - Keep EVERY: named foe defeated, promise/debt made, key item gained or
      lost, ally gained, revelation, unresolved thread. Drop travel filler.
    - Hero is ${characterName}. Start directly with the digest, no preamble.
    `;
    try {
        const result = await generateWithFallback(SUMMARY_CHAIN, {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { thinkingConfig: { thinkingLevel: 'LOW' } } as any,
        });
        const parts = result.candidates?.[0]?.content?.parts || [];
        return parts.find(p => p.text && !(p as any).thought)?.text?.trim() || "";
    } catch (e) {
        log.error("Act digest generation error:", e);
        return "";
    }
}

/** Résumé ROULANT du chapitre en cours (~100 mots, anglais) : régénéré toutes
 *  les ~50 répliques depuis les dernières lignes de log + le dialogue récent.
 *  C'est le correctif du trou IJ2/MM1 : le MJ a un « présent condensé » dès le
 *  début de partie, sans attendre la purge des 60K tokens. */
export async function summarizeCurrentChapter(
    recentDialogue: { speaker: 'user' | 'dm', text: string }[],
    logLines: string[],
    characterName: string,
    previousRolling: string = '',
): Promise<string> {
    const dialogue = recentDialogue.slice(-40).map(h => `${h.speaker.toUpperCase()}: ${h.text}`).join('\n').slice(0, 9000);
    const prompt = `
    You maintain the ROLLING summary of the CURRENT chapter of a solo D&D game.
    ${previousRolling ? `## PREVIOUS ROLLING SUMMARY\n${previousRolling}\n` : ''}
    ## CAMPAIGN LOG (structured notes, chronological)
    ${logLines.slice(-30).map(l => `- ${l}`).join('\n') || '(none yet)'}
    ## RECENT DIALOGUE
    ${dialogue || '(none)'}

    ## RULES
    - ENGLISH, max 100 words, present tense, no preamble.
    - State: where ${characterName} is, what they are doing, immediate goal,
      open promises/threats of THIS chapter. Fold in the previous summary;
      the result REPLACES it.
    `;
    try {
        // Le résumé roulant fait partie du RÉSUMEUR → même chaîne 3.7→3.6→3.5
        // (il était sur le modèle léger d'extraction, moins fiable en synthèse).
        const result = await generateWithFallback(SUMMARY_CHAIN, {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { thinkingConfig: { thinkingLevel: 'LOW' } } as any,
        });
        const parts = result.candidates?.[0]?.content?.parts || [];
        return parts.find(p => p.text && !(p as any).thought)?.text?.trim() || "";
    } catch (e) {
        log.error("Rolling chapter summary error:", e);
        return "";
    }
}

// ── Automatic fact extraction ─────────────────────────────────────────────
// Ran on each memory purge: pulls durable campaign facts out of the archived
// segment so continuity does not depend on the live DM remembering to call
// update_campaign_runtime. Merged into campaignRuntime + journal by the caller.
export interface ExtractedCampaignFacts {
    canonFacts: string[];
    npcUpdates: { name: string; note?: string; location?: string; dispositionDelta?: number }[];
    promises: string[];
    threats: string[];
}

export async function extractCampaignFacts(
    history: { speaker: 'user' | 'dm', text: string }[],
    knownFacts: string[],
    language: string = 'fr'
): Promise<ExtractedCampaignFacts | null> {
    const client = getClient();
    const historyText = history.map(h => `${h.speaker.toUpperCase()}: ${h.text}`).join('\n');
    const langInstruction = language === 'fr' ? 'Écris les faits en FRANÇAIS.' : 'Write the facts in ENGLISH.';

    const prompt = `
    You extract DURABLE campaign facts from a D&D play session segment. ${langInstruction}

    ## ALREADY KNOWN FACTS (do NOT repeat these)
    ${knownFacts.slice(-40).map(f => `- ${f}`).join('\n') || '(none)'}

    ## SESSION SEGMENT
    ${historyText}

    ## TASK
    Return ONLY new, durable facts that will still matter in future sessions:
    - canonFacts: established world/story truths (deaths, alliances, revealed secrets, acquired key items)
    - npcUpdates: NPCs whose relationship with the hero changed. dispositionDelta: -2 (angered) to +2 (won over). note: one short sentence of what they now know/feel. location if they moved.
    - promises: unresolved oaths, debts, deals ("X owes the hero", "the hero swore to...")
    - threats: looming dangers set in motion and not yet resolved
    Max 6 items per list, each under 140 characters. Empty arrays are fine — do not invent.
    `;

    try {
        const result = await client.models.generateContent({
            model: FACTS_MODEL,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                thinkingConfig: { thinkingLevel: 'LOW' },
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        canonFacts: { type: 'ARRAY', items: { type: 'STRING' } },
                        npcUpdates: {
                            type: 'ARRAY',
                            items: {
                                type: 'OBJECT',
                                properties: {
                                    name: { type: 'STRING' },
                                    note: { type: 'STRING' },
                                    location: { type: 'STRING' },
                                    dispositionDelta: { type: 'NUMBER' },
                                },
                                required: ['name'],
                            },
                        },
                        promises: { type: 'ARRAY', items: { type: 'STRING' } },
                        threats: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                    required: ['canonFacts', 'npcUpdates', 'promises', 'threats'],
                },
            } as any
        });
        // LM7 — même correctif que summarizeHistory : ignorer les parts « thought ».
        const facthParts = result.candidates?.[0]?.content?.parts || [];
        const text = facthParts.find(p => p.text && !(p as any).thought)?.text?.trim() || '';
        if (!text) return null;
        const parsed = JSON.parse(text);
        const strList = (v: unknown): string[] => Array.isArray(v)
            ? v.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6)
            : [];
        return {
            canonFacts: strList(parsed.canonFacts),
            promises: strList(parsed.promises),
            threats: strList(parsed.threats),
            npcUpdates: (Array.isArray(parsed.npcUpdates) ? parsed.npcUpdates : [])
                .map((u: any) => ({
                    name: String(u?.name || '').trim(),
                    note: u?.note ? String(u.note).trim() : undefined,
                    location: u?.location ? String(u.location).trim() : undefined,
                    dispositionDelta: Number.isFinite(Number(u?.dispositionDelta))
                        ? Math.max(-2, Math.min(2, Math.round(Number(u.dispositionDelta))))
                        : undefined,
                }))
                .filter((u: any) => u.name)
                .slice(0, 6),
        };
    } catch (e) {
        log.error('Fact extraction error (Gemini):', e);
        return null;
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
        "visualPrompt": "16:9 key art prompt: the hero, the opening location, a symbol of the threat, the lighting and the mood. Describe ONLY what should appear in the picture — never write negations such as 'no text' or 'no watermark' (the image model reads natural language and naming a thing can summon it; exclusions are handled by the engine's negative prompt)",
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
      "keyMerchants": [
        { "name": "Memorable merchant name", "type": "blacksmith|apothecary|general|enchanter", "location": "Where their shop stands (must match a chapter location)", "personality": "Voice, quirks, how they haggle", "questHook": "A personal job/favor they offer the hero (1-2 sentences)", "questReward": "A POWERFUL item they hand over when the job is done — name a real SRD-style magic item (e.g. 'Flame Tongue', 'Cloak of Protection', 'Ring of Protection')" }
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
    - Include **2-3 keyMerchants** (at least a blacksmith or an apothecary) anchored in chapter locations — each with a personal questHook whose questReward is a POWERFUL item; they are the campaign's recurring shopkeepers
    - Include **6-10 rewards** tied to specific encounters or story beats
    - Select **25-35 monsters** from the bestiary below, arranged by chapter progression
    - Each chapter's **cliffhanger** must create genuine urgency

    ### 👹 AVAILABLE MONSTERS (CHOOSE 25-35)
    ${monsterList}
    `;

    try {
        const result = await generateWithFallback(STORY_CHAIN, {
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

// (collectTokens / substituteTokens vivent dans services/manifestTokens.ts —
// module pur, réutilisé par la réhydratation des sauvegardes minces.)

/**
 * Fill an authored manifest's {{HERO_*}} tokens for THIS character using the fast
 * model (thinking on), then substitute mechanically. Never throws — falls back to
 * deterministic per-token values so no raw token can survive.
 */
export async function personalizeAuthoredManifest(
    manifest: AdventureManifest,
    character: CharacterSheet,
    language: string = 'fr',
    campaignTitleHint?: string
): Promise<{ manifest: AdventureManifest; tokenValues: Record<string, string> }> {
    const tokens = Array.from(collectTokens(manifest));
    if (!tokens.length) return { manifest, tokenValues: {} };

    const profile = character.storyProfile || {};
    const isFr = language === 'fr';
    const langInstruction = isFr ? 'Réponds en FRANÇAIS.' : 'Respond in ENGLISH.';
    const campaignTitle = campaignTitleHint || (isFr ? 'cette campagne' : 'this campaign');

    // Deterministic fallbacks — used for any token the model omits/leaves blank.
    // Audit 2026-08-12 : la table ne couvrait que 7 jetons « héros » et les
    // contraintes étaient câblées sur L'Hiver sans Aube (« le Nord glacé ») —
    // les 6 slots de variation du Chant Brisé (MIRROR_VARIANT, TRAITOR_NAME,
    // KEY_LOCATION, FRAGMENT_HOLDER, SOLIST_NAME, HERO_LEGACY) retombaient sur
    // le littéral « cette histoire » (99 occurrences de canon cassées).
    const heroName = character.name || (isFr ? 'le héros' : 'the hero');
    const fallbacks: Record<string, string> = isFr ? {
        HERO_NAME: heroName,
        HERO_RACE_CLASS: `${character.race || ''} ${character.class || ''}`.trim() || 'aventurier',
        HERO_DESIRE: profile.desire || 'ce qu’il cherche au plus profond',
        HERO_WOUND: profile.wound || 'une vieille blessure jamais refermée',
        HERO_BOND: profile.bond || 'ce qui lui est le plus cher',
        HERO_HOOK: `le destin l’a mené vers ${campaignTitle}`,
        HERO_LEGACY: profile.bond ? `le souvenir de ${profile.bond}` : 'le souvenir de son nom',
        PERSONAL_LOSS: `un être cher que ${heroName} n’a pas su sauver`,
    } : {
        HERO_NAME: heroName,
        HERO_RACE_CLASS: `${character.race || ''} ${character.class || ''}`.trim() || 'adventurer',
        HERO_DESIRE: profile.desire || 'what they seek most deeply',
        HERO_WOUND: profile.wound || 'an old wound that never healed',
        HERO_BOND: profile.bond || 'what they hold most dear',
        HERO_HOOK: `fate drew them toward ${campaignTitle}`,
        HERO_LEGACY: profile.bond ? `the memory of ${profile.bond}` : 'the memory of their name',
        PERSONAL_LOSS: `a loved one whom ${heroName} could not save`,
    };
    // Slots de VARIATION (valeurs CANONIQUES de la campagne, jamais traduites :
    // ils se substituent dans la prose d'auteur). Défauts = premier choix des
    // Notes de personnalisation (SOLIST : « Maëlline par défaut »).
    // Slots INTÉGRÉS (Chant Brisé). Une campagne d'auteur peut déclarer les
    // siens via `manifest.variationSlots` — sans ça, les jetons d'une NOUVELLE
    // campagne n'avaient ni liste d'options ni fallback : le modèle inventait
    // des valeurs hors-canon, et un échec réseau donnait « cette histoire »
    // (audit Portes de l'Exil 2026-08-20). `freeForm: true` = pas de liste
    // fermée, la valeur du modèle est acceptée telle quelle.
    const BUILTIN_VARIATION_SLOTS: Record<string, { options: string; fallback: string; freeForm?: boolean }> = {
        MIRROR_VARIANT: { options: 'Ombre | Corruption | Supérieur', fallback: 'Ombre' },
        TRAITOR_NAME: { options: 'Bram le Sonneur | Mielle', fallback: 'Bram le Sonneur' },
        KEY_LOCATION: { options: 'Amphithéâtre Noyé | Tour Inversée | Crypte de la Première Maison', fallback: 'Amphithéâtre Noyé' },
        FRAGMENT_HOLDER: { options: 'les drows des Racines | les elfes de la Lisière | Ophrel le Veilleur déchu', fallback: 'les drows des Racines' },
        SOLIST_NAME: { options: 'un PNJ VIVANT du camp dont la perte ferait le plus mal à CE héros — JAMAIS Petit-Refrain (Maëlline par défaut)', fallback: 'Maëlline', freeForm: true },
    };
    const VARIATION_SLOTS: Record<string, { options: string; fallback: string; freeForm?: boolean }> = {
        ...BUILTIN_VARIATION_SLOTS,
        ...(manifest.variationSlots || {}),
    };
    for (const [slot, spec] of Object.entries(VARIATION_SLOTS)) fallbacks[slot] = spec.fallback;

    const variationConstraints = tokens
        .filter(t => VARIATION_SLOTS[t])
        .map(t => `- {{${t}}} : choisis EXACTEMENT une valeur parmi : ${VARIATION_SLOTS[t].options}. Recopie la valeur telle quelle (ce sont des noms canoniques de la campagne).`)
        .join('\n');

    const prompt = `
${langInstruction}
Tu personnalises un scénario PRÉ-ÉCRIT (« ${campaignTitle} ») pour CE héros. Tu NE réécris RIEN : tu fournis seulement la valeur de chaque jeton.

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
- {{PERSONAL_LOSS}} : OBLIGATOIREMENT une personne / un être cher NOMMÉ et concret (jamais un concept abstrait). Dérive-le du lien/blessure si possible.
- {{HERO_HOOK}} : une raison concrète et brève qui a mené CE héros vers « ${campaignTitle} » (cohérente avec le prologue de la campagne, pas avec un autre décor).
- {{HERO_LEGACY}} : ce que ce héros laisserait derrière lui s'il disparaissait — court et personnel.
${variationConstraints ? variationConstraints + '\n' : ''}- Court, évocateur, cohérent avec le ton dark-fantasy. Aucune valeur vide.

Réponds en JSON STRICT : {"values": { ${tokens.map(t => `"${t}": "..."`).join(', ')} }}`.trim();

    let values: Record<string, string> = {};
    try {
        const result = await generateWithFallback(STORY_CHAIN, {
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

    // Guarantee every token has a non-empty value. Le garde-fou final est
    // bilingue (l'ancien littéral « cette histoire » fuyait même en anglais) et
    // ne devrait plus servir : tous les jetons connus ont un vrai fallback.
    for (const t of tokens) {
        if (!values[t] || !String(values[t]).trim()) values[t] = fallbacks[t] || (isFr ? 'cette histoire' : 'this tale');
    }
    // Slots de variation : rejette une invention hors-canon du modèle (une
    // KEY_LOCATION inventée contredirait la prose qui énumère les trois lieux).
    // Les slots `freeForm` (ex. SOLIST_NAME) acceptent la valeur du modèle.
    for (const [slot, spec] of Object.entries(VARIATION_SLOTS)) {
        if (!tokens.includes(slot) || spec.freeForm) continue;
        const allowed = spec.options.split('|').map(s => s.trim().toLowerCase());
        if (!allowed.includes(String(values[slot]).trim().toLowerCase())) values[slot] = spec.fallback;
    }

    // DOUBLE passe : une valeur de slot peut elle-même contenir un jeton
    // (ex. une option « {{HERO_BOND}} ») — String.replace ne re-balaie jamais
    // son texte de remplacement, la 2e passe résout un niveau d'imbrication
    // au lieu de laisser fuir le littéral dans la prose du MJ.
    let filled = substituteTokens(manifest, values);
    filled = substituteTokens(filled, values);
    return { manifest: filled, tokenValues: values };
}
