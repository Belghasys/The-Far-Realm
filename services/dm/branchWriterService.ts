import { GoogleGenAI } from '@google/genai';
import type { CampaignSubBranchPlan, CampaignSubBranchScene, CharacterSheet, JournalState } from '../../types';
import type { CampaignEvent } from '../persistence/campaignEventLog';
import { requireViteEnv } from '../infra/modelConfig';

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);
const BRANCH_MODEL = requireViteEnv('VITE_BRANCH_MODEL', import.meta.env.VITE_BRANCH_MODEL);

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!ai) ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return ai;
}

export type BranchSeverity = 'minor_detour' | 'major_detour' | 'campaign_rupture';

export interface BranchWriterRequest {
    campaignTitle: string;
    language: string;
    character: Pick<CharacterSheet, 'name' | 'race' | 'class' | 'level'> & {
        hp: { current: number; max: number };
        storyProfile?: CharacterSheet['storyProfile'];
        customBackground?: string;
    };
    manifestoExcerpt?: string;
    currentChapter?: string;
    currentObjective?: string;
    activeQuests: Array<{ title: string; description: string; status: string }>;
    knownNpcs: Array<{ name: string; description: string; location: string }>;
    knownLocations: Array<{ name: string; description: string }>;
    recentEvents: Array<{ type: string; summary: string }>;
    combatActive: boolean;
    playerDeviation: {
        reason: string;
        intent: string;
        severity: BranchSeverity;
        targetReconnect?: string;
    };
}

export type SubBranchScene = CampaignSubBranchScene;
export type SubBranchPlan = CampaignSubBranchPlan;

const BRANCH_WRITER_SYSTEM_PROMPT = `
You are the Branch Writer for a D&D campaign app.

You are NOT the live Dungeon Master.
You do NOT narrate directly to the player.
You do NOT resolve rules, rolls, HP, XP, or combat.
You write compact side-branch plans that the live DM can use.

Your job:
- Take the current campaign chapter, active quests, known NPCs, locations, recent events, and player deviation.
- Use the hero's storyProfile/customBackground when creating personal consequences, clues, NPC pressure, or reconnect hooks.
- Create a short custom sub-branch that respects player agency.
- Preserve the main campaign spine without forcing the player.
- Reconnect the side branch to the main chapter through clues, consequences, factions, NPCs, or world pressure.
- Keep the branch playable in 10-30 minutes.

Hard rules:
- Never contradict canon facts in the provided context.
- Never reveal protected secrets unless explicitly allowed.
- Never create a new main villain.
- Never solve the current chapter off-screen.
- Never force the player to go somewhere.
- Never write prose narration addressed to the player.
- Do not propose request_roll, cast_spell, resolve_attack, apply_damage, or any state-changing rules tool.
- Suggest scenes, clues, NPC pressure, images, or music only. The live DM decides rolls later from the player's actual declared action.
- Keep the output small and operational.
- Output only valid JSON matching the requested schema.

Return this JSON shape:
{
  "branchTitle": "short title",
  "purpose": "why this branch exists",
  "estimatedPlayTimeMinutes": 10,
  "status": "planned",
  "scenes": [
    {
      "id": "branch-1",
      "type": "exploration|roleplay|combat|puzzle|trap|social|discovery",
      "location": "place",
      "goal": "scene goal",
      "setup": "usable DM setup, not player-facing narration",
      "dmNotes": "constraints and tone",
      "possibleTools": ["trigger_scene_image", "set_music_mood", "add_location"],
      "successClue": "what success reveals",
      "failureConsequence": "what changes if the player fails or ignores it"
    }
  ],
  "reconnectHooks": [
    { "type": "clue|npc|faction|consequence|location", "description": "natural connection back to the main plot" }
  ],
  "consequences": ["short consequence"],
  "forbidden": ["thing not to reveal or contradict"],
  "directorNote": "one compact instruction for the live DM"
}
`.trim();

function trimText(value: string, max = 4000): string {
    const text = String(value || '').trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function buildBranchWriterRequest(input: {
    campaignTitle: string;
    language: string;
    character: CharacterSheet;
    adventureManifest?: string;
    journal: JournalState;
    events: CampaignEvent[];
    combatActive: boolean;
    reason: string;
    intent: string;
    severity?: string;
    currentChapter?: string;
    currentObjective?: string;
    targetReconnect?: string;
}): BranchWriterRequest {
    const severityText = String(input.severity || 'major_detour').toLowerCase();
    const severity: BranchSeverity = severityText.includes('rupture')
        ? 'campaign_rupture'
        : severityText.includes('minor')
            ? 'minor_detour'
            : 'major_detour';

    return {
        campaignTitle: input.campaignTitle || 'unknown adventure',
        language: input.language,
        character: {
            name: input.character.name,
            race: input.character.race,
            class: input.character.class,
            level: input.character.level,
            hp: input.character.hp,
            storyProfile: input.character.storyProfile,
            customBackground: trimText(input.character.customBackground || input.character.backstory || '', 800),
        },
        manifestoExcerpt: trimText(input.adventureManifest || '', 5000),
        currentChapter: trimText(input.currentChapter || '', 500),
        currentObjective: trimText(input.currentObjective || '', 500),
        activeQuests: (input.journal.quests || [])
            .filter(quest => quest.status === 'active')
            .slice(-5)
            .map(quest => ({
                title: trimText(quest.title, 120),
                description: trimText(quest.description, 300),
                status: quest.status,
            })),
        knownNpcs: (input.journal.npcs || []).slice(-8).map(npc => ({
            name: trimText(npc.name, 120),
            description: trimText(npc.description, 260),
            location: trimText(npc.location, 120),
        })),
        knownLocations: (input.journal.locations || []).slice(-8).map(location => ({
            name: trimText(location.name, 120),
            description: trimText(location.description, 260),
        })),
        recentEvents: input.events.slice(-16).map(event => ({
            type: event.type,
            summary: trimText(event.summary, 220),
        })),
        combatActive: input.combatActive,
        playerDeviation: {
            reason: trimText(input.reason, 500),
            intent: trimText(input.intent, 500),
            severity,
            targetReconnect: trimText(input.targetReconnect || '', 500) || undefined,
        },
    };
}

function extractResponseText(response: any): string {
    if (typeof response?.text === 'string') return response.text;
    const parts = response?.candidates?.[0]?.content?.parts || [];
    return parts.map((part: any) => part.text || '').join('\n').trim();
}

function parseJsonObject(raw: string): any {
    const text = raw.trim();
    try {
        return JSON.parse(text);
    } catch {
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenced) return JSON.parse(fenced[1].trim());
        const first = text.indexOf('{');
        const last = text.lastIndexOf('}');
        if (first >= 0 && last > first) return JSON.parse(text.slice(first, last + 1));
        throw new Error('Branch writer returned invalid JSON');
    }
}

function normalizeStringArray(value: unknown, max = 8): string[] {
    return Array.isArray(value)
        ? value.map(item => trimText(String(item), 280)).filter(Boolean).slice(0, max)
        : [];
}

function normalizePlan(parsed: any): SubBranchPlan {
    const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes.slice(0, 4).map((scene: any, index: number) => ({
        id: trimText(scene?.id || `branch-${index + 1}`, 80),
        type: ['exploration', 'roleplay', 'combat', 'puzzle', 'trap', 'social', 'discovery'].includes(scene?.type)
            ? scene.type
            : 'exploration',
        location: trimText(scene?.location || 'current area', 160),
        goal: trimText(scene?.goal || 'Create a meaningful detour beat', 300),
        setup: trimText(scene?.setup || '', 500),
        dmNotes: trimText(scene?.dmNotes || '', 400),
        possibleTools: normalizeStringArray(scene?.possibleTools, 6).filter(tool =>
            !['request_roll', 'cast_spell', 'resolve_attack', 'apply_damage', 'update_character_hp', 'update_enemy_hp'].includes(tool)
        ),
        successClue: trimText(scene?.successClue || '', 300),
        failureConsequence: trimText(scene?.failureConsequence || '', 300),
    })) : [];

    return {
        branchTitle: trimText(parsed?.branchTitle || 'Side Branch', 120),
        purpose: trimText(parsed?.purpose || 'Provide a compact detour that preserves campaign coherence.', 400),
        estimatedPlayTimeMinutes: Math.max(10, Math.min(30, Number(parsed?.estimatedPlayTimeMinutes) || 20)),
        status: 'planned',
        scenes,
        reconnectHooks: Array.isArray(parsed?.reconnectHooks) ? parsed.reconnectHooks.slice(0, 5).map((hook: any) => ({
            type: ['clue', 'npc', 'faction', 'consequence', 'location'].includes(hook?.type) ? hook.type : 'clue',
            description: trimText(hook?.description || '', 300),
        })).filter((hook: any) => hook.description) : [],
        consequences: normalizeStringArray(parsed?.consequences, 6),
        forbidden: normalizeStringArray(parsed?.forbidden, 8),
        directorNote: trimText(parsed?.directorNote || 'Respect the player choice and connect through consequences, not force.', 400),
    };
}

export async function generateSubBranchPlan(request: BranchWriterRequest): Promise<SubBranchPlan> {
    const response = await getClient().models.generateContent({
        model: BRANCH_MODEL,
        contents: [{
            role: 'user',
            parts: [{ text: JSON.stringify(request, null, 2) }],
        }],
        config: {
            systemInstruction: { parts: [{ text: BRANCH_WRITER_SYSTEM_PROMPT }] },
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: 'HIGH' },
        } as any,
    });

    return normalizePlan(parseJsonObject(extractResponseText(response)));
}

export function buildSubBranchDigest(plan: SubBranchPlan): string {
    const nextScene = plan.scenes[0];
    return [
        `[ACTIVE_BRANCH_DIGEST]`,
        `Title: ${plan.branchTitle}`,
        `Purpose: ${plan.purpose}`,
        `Estimated play: ${plan.estimatedPlayTimeMinutes} minutes`,
        nextScene ? `Next scene: ${nextScene.location} - ${nextScene.goal}` : 'Next scene: none',
        nextScene?.setup ? `Setup: ${nextScene.setup}` : '',
        plan.reconnectHooks.length ? `Reconnect: ${plan.reconnectHooks.map(hook => hook.description).join('; ')}` : '',
        plan.forbidden.length ? `Forbidden: ${plan.forbidden.join('; ')}` : '',
        `Director note: ${plan.directorNote}`,
        `[/ACTIVE_BRANCH_DIGEST]`,
    ].filter(Boolean).join('\n');
}
