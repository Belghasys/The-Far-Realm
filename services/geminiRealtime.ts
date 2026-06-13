import { CharacterSheet } from "../types";
import { GoogleGenAI, Modality, Session, LiveServerMessage } from '@google/genai';
// @ts-ignore
import pcmProcessorUrl from './pcm-processor.js?url';
import { memoryManager } from './memoryManager';
import { getCreature, getCreatureAttacks } from '../data/bestiary';
import { preloadCodexBestiary } from './codexService';
import { getWeapon, weaponSummary } from '../data/weapons';
import { log } from './logger';
import { buildSystemPrompt } from './systemPrompt';
import { campaignEventLog } from './campaignEventLog';
import { requireViteEnv } from './modelConfig';
import { auditBus } from './auditBus';

// --- Audio Utilities ---

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    return float32;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

/**
 * Check the REAL WebSocket readyState by reaching into the SDK internals.
 * Session → conn (BrowserWebSocket) → ws (native WebSocket).
 * Returns true ONLY if the raw WebSocket is OPEN (readyState === 1).
 */
function isWebSocketOpen(session: Session | null): boolean {
    if (!session) return false;
    try {
        const conn = (session as any).conn;
        if (!conn) return false;
        const ws: WebSocket | undefined = conn.ws;
        if (!ws) return false;
        return ws.readyState === WebSocket.OPEN;
    } catch {
        return false;
    }
}

// --- Live Client ---

let activeInstance: LiveDungeonMaster | null = null;

const GEMINI_KEY = requireViteEnv('VITE_GEMINI_API_KEY', import.meta.env.VITE_GEMINI_API_KEY);

function normalizeLiveModelName(model: string): string {
    return String(model)
        .trim()
        .replace(/^models\//, '');
}

function appendTranscriptChunk(previous: string, incoming: string): string {
    const prev = previous.trimEnd();
    const next = String(incoming || '').trim();
    if (!next) return previous;
    if (!prev) return next;
    if (prev.endsWith(next)) return prev;
    if (next.startsWith(prev)) return next;

    const maxOverlap = Math.min(prev.length, next.length, 240);
    for (let size = maxOverlap; size >= 12; size--) {
        if (prev.slice(-size).toLowerCase() === next.slice(0, size).toLowerCase()) {
            return `${prev}${next.slice(size)}`;
        }
    }

    return `${prev} ${next}`;
}

const AUDIO_MODEL = normalizeLiveModelName(requireViteEnv('VITE_AUDIO_MODEL', import.meta.env.VITE_AUDIO_MODEL));

export function liveConnectionConfigSummary() {
    return {
        model: AUDIO_MODEL,
        hasApiKey: Boolean(GEMINI_KEY),
        origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
    };
}

type QueuedTextMessage = {
    text: string;
    createdAt: number;
};

const GAME_TOOL_DECLARATIONS = [
    {
        name: "lookup_creature",
        description: "Look up a creature from the bestiary by name.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Name of the creature" } }, required: ["name"] }
    },
    {
        name: "lookup_weapon",
        description: "Look up a weapon from the D&D 5e weapon table.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Name of the weapon" } }, required: ["name"] }
    },
    {
        name: "lookup_campaign",
        description: "Pull authored detail from THIS campaign's manifest on demand (scenes, NPCs, locations, lore, rewards, chapter notes). Use whenever you need specifics the live context didn't include — a named NPC's personality/voice, a place's description, a chapter's secret or DM notes, an item. Returns the matching authored chunks.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                query: { type: "STRING" as any, description: "What to look up: a name, place, keyword, or theme (e.g. 'Ysolde', 'Cairn de Givre', 'Gel Profond')." },
                kind: { type: "STRING" as any, description: "Optional filter: npc | scene | location | lore | reward | chapter." }
            },
            required: ["query"]
        }
    },
    {
        name: "search_codex",
        description: "Search the SRD 5.1 codex (spells, monsters, items, rules, conditions) by free text. Use to discover the exact name before a precise lookup_* call.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "all, spell, monster, item, rule, condition" },
                query: { type: "STRING" as any, description: "Free-text search query." },
                limit: { type: "INTEGER" as any, description: "Max results (default 10)." }
            },
            required: ["query"]
        }
    },
    {
        name: "lookup_spell",
        description: "Look up a structured SRD 5.1 spell. Use before narrating spell mechanics.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Spell name" } }, required: ["name"] }
    },
    {
        name: "cast_spell",
        description: "Ask the local SRD rules engine to cast a spell, consume slots, apply concentration, healing, and roll prompts.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                spellName: { type: "STRING" as any },
                slotLevel: { type: "INTEGER" as any },
                target: { type: "STRING" as any },
                casterAbility: { type: "STRING" as any, description: "STR, DEX, CON, INT, WIS, or CHA" },
                casterAbilityMod: { type: "INTEGER" as any },
                spellAttackBonus: { type: "INTEGER" as any },
                spellSaveDC: { type: "INTEGER" as any },
                targetAC: { type: "INTEGER" as any },
                targetSaveBonus: { type: "INTEGER" as any }
            },
            required: ["spellName"]
        }
    },
    {
        name: "lookup_rule",
        description: "Look up a structured SRD 5.1 rule instead of inventing a rules answer.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Rule name or topic" } }, required: ["name"] }
    },
    {
        name: "lookup_item",
        description: "Look up a structured SRD item or structure an inventory item for mechanics.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Item name" } }, required: ["name"] }
    },
    {
        name: "lookup_condition",
        description: "Look up a structured SRD condition and its mechanical effects.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Condition name" } }, required: ["name"] }
    },
    {
        name: "lookup_monster",
        description: "Look up a monster from the current bestiary with portrait, AideDD external link, CR, XP, and attacks.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Monster name" } }, required: ["name"] }
    },
    {
        name: "build_encounter",
        description: "Build an encounter from SRD XP thresholds using the current bestiary as the monster source.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                partyLevel: { type: "INTEGER" as any },
                partySize: { type: "INTEGER" as any },
                difficulty: { type: "STRING" as any, description: "easy, medium, hard, deadly" },
                biome: { type: "STRING" as any },
                role: { type: "STRING" as any, description: "brute, skirmisher, artillery, controller, minion, solo" },
                theme: { type: "STRING" as any },
                maxMonsters: { type: "INTEGER" as any },
                startNow: { type: "BOOLEAN" as any, description: "If true, push selected monsters into initiative." }
            },
            required: ["difficulty"]
        }
    },
    {
        name: "request_branch_plan",
        description: "Ask the text-only Gemini Flash branch writer for a compact side-branch plan when the player makes a major detour. Use only for meaningful narrative deviation, not every scene.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any, description: "Why the current campaign path no longer fits the player's action." },
                playerIntent: { type: "STRING" as any, description: "What the player seems to want to do." },
                severity: { type: "STRING" as any, description: "minor_detour, major_detour, or campaign_rupture" },
                currentChapter: { type: "STRING" as any, description: "Optional current chapter or arc if known." },
                currentObjective: { type: "STRING" as any, description: "Optional current chapter objective if known." },
                targetReconnect: { type: "STRING" as any, description: "Optional main plot thread, clue, NPC, or chapter to reconnect toward." }
            },
            required: ["reason", "playerIntent"]
        }
    },
    {
        name: "update_campaign_runtime",
        description: "Update compact campaign director state after a meaningful chapter, scene, objective, canon fact, secret, world clock, or branch status change. Do not call every turn.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                currentChapterId: { type: "STRING" as any, description: "Current main chapter id from the adventure manifest, if known." },
                currentSceneId: { type: "STRING" as any, description: "Current main scene id from the adventure manifest, if known." },
                currentObjective: { type: "STRING" as any, description: "Short current objective for the player-facing campaign board." },
                canonFact: { type: "STRING" as any, description: "Stable fact that is now true in the campaign." },
                protectedSecret: { type: "STRING" as any, description: "Private director-only secret that should not be shown to the player." },
                branchStatus: { type: "STRING" as any, description: "active, resolved, abandoned, or merged_into_main for the active branch." },
                worldClockName: { type: "STRING" as any, description: "Name of a world clock to create or update." },
                worldClockDescription: { type: "STRING" as any, description: "Short description of the pressure or countdown." },
                worldClockStage: { type: "INTEGER" as any, description: "Current clock stage." },
                worldClockMaxStage: { type: "INTEGER" as any, description: "Maximum clock stage." },
                worldClockStatus: { type: "STRING" as any, description: "active, paused, or resolved." }
            }
        }
    },
    {
        name: "request_roll",
        description: "Request the player to roll a d20 for an ability check, skill check, or saving throw. IMPORTANT: for skill/ability/save checks, pass `skill` OR `ability` and do NOT invent the bonus — the engine adds the character's real ability modifier + proficiency + expertise automatically from their sheet. Only put a number in `formula`/`bonus` for a non-character roll the sheet can't compute.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any, description: "Reason for the roll (e.g., 'Stealth check', 'Wisdom saving throw')" },
                formula: { type: "STRING" as any, description: "Dice formula, usually just '1d20' — the engine fills the modifier when skill/ability is given." },
                dc: { type: "INTEGER" as any, description: "Difficulty Class (DC) to beat. 0 if none." },
                skill: { type: "STRING" as any, description: "Skill name for a skill check (English or French): Stealth/Discrétion, Perception, Athletics/Athlétisme, Persuasion, Investigation, etc. The engine derives the ability + proficiency." },
                ability: { type: "STRING" as any, description: "Ability for a raw ability check or a saving throw: STR/DEX/CON/INT/WIS/CHA. Use with isSave=true for a saving throw." },
                isSave: { type: "BOOLEAN" as any, description: "True if this is a saving throw (the engine adds the class's save proficiency)." },
                advantage: { type: "STRING" as any, description: "Optional: 'ADV' or 'DIS'" },
                bonus: { type: "INTEGER" as any, description: "Optional static bonus — leave empty for skill/ability/save checks (the sheet provides it)." }
            },
            required: ["reason", "dc"]
        }
    },
    {
        name: "add_inventory_item",
        description: "Add an item to the player's inventory. You can create custom magic weapons or armor by specifying 'effect', 'properties', 'damageDice', etc.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "Name of the item (e.g. 'Flame Tongue Longsword', 'Armor of Invulnerability')" },
                quantity: { type: "INTEGER" as any },
                type: { type: "STRING" as any, description: "'weapon', 'armor', 'consumable', 'misc', 'ammo', or 'container'" },
                effect: { type: "STRING" as any, description: "Custom magic effect text (e.g. '+2 CON', '+1d6 fire', '+10 speed', '+1 AC')" },
                properties: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Weapon properties (e.g., ['finesse', 'light', 'two-handed'])" },
                damageDice: { type: "STRING" as any, description: "Base damage dice for weapons (e.g., '1d8', '2d6')" },
                damageType: { type: "STRING" as any, description: "Damage type (e.g., 'slashing', 'piercing', 'fire', 'radiant')" },
                acBonus: { type: "INTEGER" as any, description: "Armor Class magic bonus (e.g. 1, 2)" },
                baseAC: { type: "INTEGER" as any, description: "Base AC of the armor" },
                armorType: { type: "STRING" as any, description: "Armor type ('light', 'medium', 'heavy', 'shield')" },
                description: { type: "STRING" as any, description: "Flavor/general description" }
            },
            required: ["name", "quantity", "type"]
        }
    },
    {
        name: "remove_inventory_item",
        description: "Remove an item from the player's inventory.",
        parameters: {
            type: "OBJECT" as any,
            properties: { name: { type: "STRING" as any }, quantity: { type: "INTEGER" as any } },
            required: ["name", "quantity"]
        }
    },
    {
        name: "add_gold",
        description: "Credit (or debit) the player's gold purse. Call this WHENEVER the player loots coins, is paid/rewarded, finds treasure, sells an item, or pays for something — the engine updates the purse and the equipment shop immediately. Use a negative amount to deduct gold. Amount is in gold pieces (po/gp).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                amount: { type: "NUMBER" as any, description: "Gold pieces to add (negative to deduct). 1 silver = 0.1, 1 copper = 0.01." },
                reason: { type: "STRING" as any, description: "Short reason, e.g. 'looted from the goblin chief', 'reward from the mayor', 'bought a healing potion'." }
            },
            required: ["amount"]
        }
    },
    {
        name: "start_combat",
        description: "Trigger the combat interface.",
        parameters: { type: "OBJECT" as any, properties: {} }
    },
    {
        name: "end_combat",
        description: "End the combat interface and award XP. The local rules engine validates the final amount.",
        parameters: { type: "OBJECT" as any, properties: { xpAwarded: { type: "INTEGER" as any } }, required: ["xpAwarded"] }
    },
    {
        name: "add_enemy_init",
        description: "Add an enemy to the combat initiative tracker. If the monster exists in the bestiary, local HP, AC, DEX, portrait, and attacks are used; hp/ac are fallback only for homebrew.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                hp: { type: "INTEGER" as any, description: "Fallback HP for homebrew enemies only." },
                ac: { type: "INTEGER" as any, description: "Fallback AC for homebrew enemies only." },
                strMod: { type: "INTEGER" as any, description: "Fallback STR modifier for homebrew enemies only." },
                dexMod: { type: "INTEGER" as any, description: "Fallback DEX modifier for homebrew enemies only." }
            },
            required: ["name"]
        }
    },
    {
        name: "add_ally_init",
        description: "Add an ALLY (companion, rescued NPC, summoned creature) to the initiative tracker. The ally fights ON THE PLAYER'S SIDE: enemies may target it, it attacks enemies, and it counts toward the party for defeat. You (the DM) decide and narrate the ally's action on its turn. Use this instead of add_enemy_init for any friendly combatant. Bestiary stats are used if the name matches.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                hp: { type: "INTEGER" as any, description: "Fallback HP for homebrew allies only." },
                ac: { type: "INTEGER" as any, description: "Fallback AC for homebrew allies only." },
                dexMod: { type: "INTEGER" as any, description: "Fallback DEX modifier for the initiative roll." }
            },
            required: ["name"]
        }
    },
    {
        name: "update_character_hp",
        description: "Update the player character's current HP after taking damage or healing.",
        parameters: { type: "OBJECT" as any, properties: { hp: { type: "INTEGER" as any } }, required: ["hp"] }
    },
    {
        name: "apply_condition",
        description: "Apply an SRD 5.1 condition (prone, poisoned, frightened, grappled, restrained, blinded, stunned, paralyzed, charmed, etc.) to a combatant. Omit target (or use 'player') for the player; otherwise pass an enemy/ally name or combatant id. The condition then affects that creature's rolls (e.g. prone gives melee attackers advantage). Use this when the fiction or a spell/effect imposes a condition.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                condition: { type: "STRING" as any, description: "SRD condition name, e.g. 'prone', 'poisoned', 'frightened', 'restrained'." },
                target: { type: "STRING" as any, description: "Combatant name or id. Omit or 'player' for the player character." }
            },
            required: ["condition"]
        }
    },
    {
        name: "update_enemy_hp",
        description: "Update an enemy's HP. If HP is 0 or less, they are dead.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, hp: { type: "INTEGER" as any } }, required: ["name", "hp"] }
    },
    {
        name: "set_enemy_target",
        description: "Set which hero (the player or a named ally) a specific enemy will focus on its turns, for narrative reasons (e.g. a mage focuses the healer, a beast attacks whoever wounded it). This is a standing preference consulted each time that enemy acts; if the chosen hero falls, the enemy auto-falls back to the most wounded hero. Use the combatant id when enemies share a name. Call this whenever the fiction implies an enemy would change targets; otherwise enemies attack the most wounded hero by default.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                enemy: { type: "STRING" as any, description: "Enemy name or combatant id whose target you are setting." },
                target: { type: "STRING" as any, description: "The hero to focus: the player's name/id, or an ally's name/id." }
            },
            required: ["enemy", "target"]
        }
    },
    {
        name: "resolve_attack",
        description: "Ask the local D&D rules engine to resolve an attack roll and damage against a combatant. For bestiary monsters, use attackName from lookup_monster/lookup_creature instead of inventing attack stats.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                attacker: { type: "STRING" as any },
                target: { type: "STRING" as any },
                attackName: { type: "STRING" as any, description: "Optional bestiary attack name, e.g. Scimitar, Shortbow, Bite, Claw, Tail." },
                attackBonus: { type: "INTEGER" as any },
                damageFormula: { type: "STRING" as any },
                damageType: { type: "STRING" as any },
                advantage: { type: "STRING" as any, description: "'normal', 'advantage', or 'disadvantage'" },
                targetCoverBonus: { type: "INTEGER" as any, description: "Manual cover bonus to target AC: 0, 2, or 5. Use only when the fiction clearly gives cover." },
                isMeleeAttack: { type: "BOOLEAN" as any, description: "Whether this is a melee attack, used for simple condition context like prone." }
            },
            required: ["attacker", "target"]
        }
    },
    {
        name: "advance_turn",
        description: "Advance local combat initiative to the next living combatant. RARE manual recovery only — normally the player ends their own turn with the on-screen button and the engine auto-runs the enemies.",
        parameters: { type: "OBJECT" as any, properties: {} }
    },
    {
        name: "propose_player_action",
        description: "When the player improvises a creative/off-script action on THEIR turn ('I shoot the chandelier so it falls on the goblins', 'I give a glorious rallying speech', 'I draw my sword'), do NOT resolve it yourself and do NOT advance the turn. Instead AUTHOR a custom action card with this tool: it pops up to the player showing its cost, the player clicks it, and the engine rolls the real dice. You decide the numbers you adjudicate (cost, attack bonus, DC, advantage, damage). Choose 'resolution': 'attack' (d20 to hit a target then damage), 'save' (the target(s) roll a saving throw, take damage on fail), 'check' (the player rolls an ability check vs a DC), 'auto' (it just happens — rule of cool, no roll), or 'effect' (a pure buff/condition, e.g. the speech grants +2 to the next attack via modifierBonus). Call once per improvised action.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                label: { type: "STRING" as any, description: "Short action name shown on the card, e.g. 'Tirer sur le chandelier'." },
                cost: { type: "STRING" as any, description: "Economy cost: 'action' (main action — most improvised strikes), 'bonus_action' (a quick shout/flourish), 'free' (draw/stow a weapon, a few words), or 'reaction'." },
                resolution: { type: "STRING" as any, description: "'attack' | 'save' | 'check' | 'auto' | 'effect'." },
                target: { type: "STRING" as any, description: "Target combatant id or name; or 'all_enemies'; or a comma-separated list. Omit for self/effect." },
                attackBonus: { type: "INTEGER" as any, description: "For resolution='attack': the to-hit bonus you adjudicate (e.g. the player's DEX/proficiency)." },
                dc: { type: "INTEGER" as any, description: "For resolution='save' (target's save DC) or 'check' (the player's check DC)." },
                advantage: { type: "STRING" as any, description: "'normal' | 'advantage' | 'disadvantage' — reward smart play with advantage." },
                saveAbility: { type: "STRING" as any, description: "For resolution='save': which save the target rolls (STR/DEX/CON/INT/WIS/CHA)." },
                checkAbility: { type: "STRING" as any, description: "For resolution='check': which ability the player tests (STR/DEX/CON/INT/WIS/CHA)." },
                damageFormula: { type: "STRING" as any, description: "Damage dice if it deals damage, e.g. '2d6', '3d6', '1d8+2'." },
                damageType: { type: "STRING" as any, description: "Damage type, e.g. 'bludgeoning', 'fire'." },
                condition: { type: "STRING" as any, description: "Optional SRD condition to apply to the target on success (prone, restrained, blinded...)." },
                modifierMode: { type: "STRING" as any, description: "For resolution='effect': 'advantage' | 'disadvantage' | 'normal'." },
                modifierBonus: { type: "INTEGER" as any, description: "For resolution='effect': flat bonus granted to the player, e.g. 2 for a +2." },
                modifierScope: { type: "STRING" as any, description: "For resolution='effect': what the bonus applies to — 'attack' | 'check' | 'save' | 'all'." },
                modifierUses: { type: "INTEGER" as any, description: "For resolution='effect': how many of the player's next rolls it applies to (usually 1)." },
                description: { type: "STRING" as any, description: "Optional one-line flavor shown under the card title." }
            },
            required: ["label", "cost", "resolution"]
        }
    },
    {
        name: "grant_player_action",
        description: "Grant the player an EXTRA action for THIS turn (Action Surge, Haste, or a heroic surge you reward for great play). kind='action' adds a green main-action attack pip; kind='bonus' adds an amber bonus-action pip. count defaults to 1. The pip appears in the player's HUD and is consumable this turn only (it resets next turn). Use sparingly.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "'action' (extra main action / attack) or 'bonus' (extra bonus action)" },
                count: { type: "INTEGER" as any, description: "How many extra pips to grant (default 1)." },
                reason: { type: "STRING" as any, description: "Short reason, e.g. 'Action Surge', 'Hâte'." }
            },
            required: ["kind"]
        }
    },
    {
        name: "apply_damage",
        description: "Apply deterministic damage to a combatant by name (a FIXED amount you already know). For environmental hazards with dice, prefer environmental_damage which rolls locally and can demand a save.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                target: { type: "STRING" as any },
                amount: { type: "INTEGER" as any },
                damageType: { type: "STRING" as any }
            },
            required: ["target", "amount"]
        }
    },
    {
        name: "environmental_damage",
        description: "The WORLD hurts a creature outside any attack: jumping into fire, swimming in icy water, poison, a fall, lava, acid, a lightning storm, suffocation, a collapsing ceiling. Works in AND out of combat. The engine rolls the dice locally, optionally rolls a SAVING THROW first (half damage on success by default), applies the real HP loss, and can impose an SRD condition on a failed save. ALWAYS call this when the fiction says the environment hurts someone — never just narrate the pain. Guideline dice: minor 1d4-1d6 (embers, a short icy plunge), serious 2d6-3d6 (open flames, a long frozen swim, a ~3m fall, strong poison), severe 6d6+ (lava's edge, a 10m fall, a lightning strike).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "Short label of the hazard shown to the player, e.g. 'flammes du brasier', 'eau glacée', 'poison de la vipère'." },
                damageFormula: { type: "STRING" as any, description: "Damage dice, e.g. '2d6', '1d4', '6d6'." },
                damageType: { type: "STRING" as any, description: "fire, cold, poison, acid, lightning, bludgeoning (falls), necrotic..." },
                target: { type: "STRING" as any, description: "Combatant id/name, or 'player' (default)." },
                saveAbility: { type: "STRING" as any, description: "Optional saving throw first: STR/DEX/CON/INT/WIS/CHA (CON for poison/cold, DEX for flames/falling debris)." },
                saveDC: { type: "INTEGER" as any, description: "DC of the saving throw (10 easy, 12-13 standard, 15+ harsh)." },
                halfOnSave: { type: "BOOLEAN" as any, description: "true (default): success halves the damage. false: success negates it." },
                condition: { type: "STRING" as any, description: "Optional SRD condition imposed when the save FAILS (or no save given): poisoned, prone, restrained, blinded..." }
            },
            required: ["description", "damageFormula", "damageType"]
        }
    },
    {
        name: "short_rest",
        description: "Apply a short rest. Optionally spend hit dice for healing.",
        parameters: {
            type: "OBJECT" as any,
            properties: { spendHitDice: { type: "INTEGER" as any } }
        }
    },
    {
        name: "long_rest",
        description: "Apply a long rest: full HP, reset death saves, recover long-rest resources and spell slots.",
        parameters: { type: "OBJECT" as any, properties: {} }
    },
    {
        name: "add_quest",
        description: "Add a quest to the player's journal.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["title", "description"] }
    },
    {
        name: "complete_quest",
        description: "Mark a quest as completed.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any } }, required: ["title"] }
    },
    {
        name: "add_npc",
        description: "Log a newly met NPC in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any }, location: { type: "STRING" as any } }, required: ["name", "description", "location"] }
    },
    {
        name: "add_location",
        description: "Log a newly discovered location in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["name", "description"] }
    },
    {
        name: "add_story_moment",
        description: "Record a memorable narrative event in the chronicle.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["title", "description"] }
    },
    {
        name: "grant_xp",
        description: "Grant Experience Points outside of combat.",
        parameters: { type: "OBJECT" as any, properties: { amount: { type: "INTEGER" as any }, reason: { type: "STRING" as any } }, required: ["amount", "reason"] }
    },
    {
        name: "grant_story_modifier",
        description: "Grant a temporary story boon or penalty that modifies the next relevant local roll. Use to reward clever tactics, divine blessings, risky detours, or world consequences.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                source: { type: "STRING" as any, description: "dm_inspiration, blessing, complication, tactic, consequence" },
                mode: { type: "STRING" as any, description: "normal, advantage, disadvantage" },
                bonus: { type: "INTEGER" as any, description: "Small flat modifier from -5 to +5, usually -2 to +2" },
                uses: { type: "INTEGER" as any, description: "1 to 3 uses" },
                scope: { type: "STRING" as any, description: "any, check, save, attack, death_save" },
                reason: { type: "STRING" as any }
            },
            required: ["name", "source", "mode", "reason"]
        }
    },
    {
        name: "grant_inspiration",
        description: "Grant one-use DM inspiration, usually advantage on the next relevant roll, for roleplay, creativity, compassion, or a clever boss solution.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any },
                scope: { type: "STRING" as any, description: "any, check, save, attack, death_save" },
                bonus: { type: "INTEGER" as any }
            },
            required: ["reason"]
        }
    },
    {
        name: "apply_complication",
        description: "Apply a one-use narrative complication, usually disadvantage or a small penalty, when the world pushes back against a reckless or risky choice. Do not use to railroad.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                reason: { type: "STRING" as any },
                scope: { type: "STRING" as any, description: "any, check, save, attack, death_save" },
                mode: { type: "STRING" as any, description: "normal, disadvantage" },
                bonus: { type: "INTEGER" as any }
            },
            required: ["name", "reason"]
        }
    },
    {
        name: "trigger_scene_image",
        description: "Generate a 16:9 story illustration for a new landscape, dungeon room, town, quest area, or major scene. You control the pacing — call it whenever a new place or strong visual beat appears. One image renders at a time and the latest request wins, so favor one vivid, specific image per scene rather than many at once.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any },
                phase: { type: "STRING" as any, description: "exploration, quest, dungeon, town, tavern, dramatic, stealth, rest" }
            },
            required: ["description"]
        }
    },
    {
        name: "trigger_combat_image",
        description: "Generate a 16:9 combat illustration when a fight starts or a major foe enters. One image renders at a time, latest request wins.",
        parameters: { type: "OBJECT" as any, properties: { enemy: { type: "STRING" as any }, location: { type: "STRING" as any } }, required: ["enemy", "location"] }
    },
    {
        name: "trigger_visual",
        description: "Generate a 16:9 illustration for a key story beat, discovery, vista, or combat moment. One image renders at a time, latest request wins.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any },
                phase: { type: "STRING" as any }
            },
            required: ["description"]
        }
    },
    {
        name: "set_music_mood",
        description: "Set generated background music. Use combat/combat_boss for fights; exploration/quest/dungeon/town/tavern/rest for campaign ambience. Call it when the ATMOSPHERE changes (new area, fight starts/ends, rest), not every line. Tracks are cached and crossfade automatically.",
        parameters: { type: "OBJECT" as any, properties: { mood: { type: "STRING" as any, description: "exploration, quest, combat, combat_boss, victory, tension, rest, tavern, dungeon, town, dramatic, stealth" } }, required: ["mood"] }
    },
    {
        name: "trigger_sfx",
        description: "Play a short DIEGETIC sound effect to punctuate your narration — a sound the characters would actually hear in the world. Examples: a heavy door creaking open, distant thunder, a wolf howl, a sword being unsheathed, a crowd murmuring in a tavern, chains rattling, a body hitting the floor, a bowstring twang, a spell crackling. Generation is LOCAL and UNLIMITED — call it as often as the fiction deserves; previously heard sounds replay instantly from cache. The description should name ONE concrete sound; keep it vivid and specific.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "One concrete diegetic sound to render, e.g. 'a massive iron portcullis grinding open', 'distant rolling thunder', 'a goblin's dying shriek'." }
            },
            required: ["description"]
        }
    },
    {
        name: "add_effect",
        description: "Add a temporary buff or debuff effect to the character.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                source: { type: "STRING" as any },
                duration: { type: "STRING" as any },
                stat: { type: "STRING" as any, description: "Stat affected, e.g., 'AC=+1'" }
            },
            required: ["name", "source", "duration", "stat"]
        }
    }
];

export class LiveDungeonMaster {
    private session: Session | null = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private outputAnalyser: AnalyserNode | null = null;
    private animationFrameId: number | null = null;
    private inputWorklet: AudioWorkletNode | null = null;
    private _sendGate = false; // TRUE only when we are fully connected and ready to send
    private stream: MediaStream | null = null;
    private isConnected: boolean = false;
    private nextStartTime = 0;
    private onTranscriptUpdate: (speaker: 'user' | 'dm', text: string) => void;
    private onVolumeUpdate: (vol: number) => void;
    private onConnectionChange: (connected: boolean) => void;
    private onReconnecting?: (attempt: number, maxAttempts: number) => void;
    private onReconnectFailed?: () => void;
    private onReconnectSuccess?: () => void;
    private onQueueChange?: (queued: number) => void;
    private onToolCall?: (toolCall: any) => Promise<any>;
    private character: CharacterSheet;
    private adventure: string;
    private adventureManifest: string;
    private initialHistory: { speaker: 'user' | 'dm', text: string }[] = [];

    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 3;
    private isReconnecting: boolean = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _lastConnectTime: number = 0; // Track when onopen fires to detect instant-close loops
    private isMuted: boolean = false;
    private playingNodes: AudioBufferSourceNode[] = [];
    private isDisconnected: boolean = false;
    private outboundTextQueue: QueuedTextMessage[] = [];
    private pendingToolResponses: any[] = [];
    private sessionResumptionHandle: string | null = null;
    private readonly sessionResumptionStorageKey: string;
    private restoredThisConnection: boolean = false;
    private directorContext: string = '';
    private lastDirectorContextSent: string = '';
    private lastDirectorContextSentAt: number = 0;
    private pendingPrivateContext: string = '';

    // Buffer for accumulating DM transcript across multiple server messages
    private dmTranscriptBuffer: string = '';

    constructor(
        character: CharacterSheet,
        adventure: string,
        onTranscript: (s: 'user' | 'dm', t: string) => void,
        onVolume: (v: number) => void,
        onConnectionChange: (connected: boolean) => void,
        private language: string = 'French',
        initialHistory: { speaker: 'user' | 'dm', text: string }[] = [],
        adventureManifest: string = '',
        directorContext: string = '',
        onReconnecting?: (attempt: number, maxAttempts: number) => void,
        onReconnectFailed?: () => void,
        onReconnectSuccess?: () => void,
        onQueueChange?: (queued: number) => void,
        onToolCall?: (toolCall: any) => Promise<any>
    ) {
        this.onToolCall = onToolCall;
        this.character = character;
        this.adventure = adventure;
        this.adventureManifest = adventureManifest;
        this.directorContext = directorContext;
        this.initialHistory = initialHistory;
        this.onTranscriptUpdate = onTranscript;
        this.onVolumeUpdate = onVolume;
        this.onConnectionChange = onConnectionChange;
        this.onReconnecting = onReconnecting;
        this.onReconnectFailed = onReconnectFailed;
        this.onReconnectSuccess = onReconnectSuccess;
        this.onQueueChange = onQueueChange;
        this.sessionResumptionStorageKey = this.makeResumptionStorageKey(character.name, adventure);
        this.sessionResumptionHandle = this.loadResumptionHandle();

        if (activeInstance && activeInstance !== this) {
            activeInstance.disconnect();
        }
        activeInstance = this;
    }

    private makeResumptionStorageKey(characterName: string, adventure: string): string {
        const stable = `${characterName || 'hero'}_${adventure || 'adventure'}`
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .slice(0, 80);
        return `dungeonai_live_resumption_${stable}`;
    }

    private loadResumptionHandle(): string | null {
        try {
            return localStorage.getItem(this.sessionResumptionStorageKey);
        } catch {
            return null;
        }
    }

    private storeResumptionHandle(handle: string | null) {
        this.sessionResumptionHandle = handle;
        try {
            if (handle) localStorage.setItem(this.sessionResumptionStorageKey, handle);
            else localStorage.removeItem(this.sessionResumptionStorageKey);
        } catch {
            // Resumption is an optimization. The app can still reconnect with restored history.
        }
    }

    async connect() {
        log.info('🔌 Connecting to Gemini Live API...');

        if (!GEMINI_KEY) {
            throw new Error('Missing VITE_GEMINI_API_KEY. Add it to .env.local and rebuild before deploying.');
        }

        // Close gate BEFORE connecting so stale worklets from previous connections can't send
        this._sendGate = false;
        this.restoredThisConnection = false;

        const systemPrompt = buildSystemPrompt({
            character: this.character,
            adventure: this.adventure,
            adventureManifest: this.adventureManifest,
            historyToRestore: this.initialHistory,
            language: this.language,
            characterName: this.character.name,
            directorContext: this.directorContext,
        });

        auditBus.publish('gemini-system', `Live system prompt (${systemPrompt.length} chars, model ${AUDIO_MODEL})`, systemPrompt);

        const ai = new GoogleGenAI({
            apiKey: GEMINI_KEY,
            httpOptions: { apiVersion: 'v1beta' }
        });
        const resumingFromHandle = Boolean(this.sessionResumptionHandle);

        try {
            const currentSession = await ai.live.connect({
                model: AUDIO_MODEL,
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: 'Charon'
                            }
                        }
                    },
                    tools: [{ functionDeclarations: GAME_TOOL_DECLARATIONS }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    sessionResumption: {
                        handle: this.sessionResumptionHandle || undefined,
                    },
                    contextWindowCompression: {
                        triggerTokens: '60000',
                        slidingWindow: { targetTokens: '30000' }
                    },
                },
                callbacks: {
                    onopen: () => {
                        if (this.isDisconnected) return;
                        log.info('✅ Gemini Live Session Connected');
                        this.isConnected = true;
                        this._sendGate = true; // Open gate ONLY when connection is confirmed open
                        this._lastConnectTime = Date.now();
                        // Do NOT reset reconnectAttempts here. It's done intelligently in attemptReconnect.
                        this.onConnectionChange(true);
                        if (!resumingFromHandle) this.restoreHistory();
                        this.flushOutboundTextQueue();
                        this.flushToolResponseQueue();
                    },
                    onmessage: (msg: LiveServerMessage) => {
                        if (this.isDisconnected) return;
                        this.handleGeminiMessage(msg);
                    },
                    onerror: (e: ErrorEvent) => {
                        log.error('Gemini Live Error:', e);
                        this._sendGate = false; // CLOSE gate immediately on error
                    },
                    onclose: (e: CloseEvent) => {
                        log.error('❌ Gemini Live Connection closed', e.code, e.reason);
                        // 1. CLOSE THE GATE FIRST — this is the fastest possible signal
                        this._sendGate = false;
                        // 2. Kill everything SYNCHRONOUSLY
                        this.killAudioPipeline();
                        this.isConnected = false;
                        const s = this.session;
                        this.session = null; // Null so no handler can use it
                        if (s) { try { s.close(); } catch(_) {} }
                        this.onConnectionChange(false);
                        if (!this.isReconnecting) this.attemptReconnect();
                    }
                }
            });

            if (this.isDisconnected) {
                log.info('🔌 Component got disconnected while connecting. Destroying rogue session.');
                try { currentSession.close(); } catch(_) {}
                return;
            }
            this.session = currentSession;
            if (this.isConnected) {
                if (!resumingFromHandle) this.restoreHistory();
                this.flushOutboundTextQueue();
            }

            try {
                await this.setupAudio();
            } catch (audioError) {
                log.error("Audio pipeline setup failed (falling back to text-only):", audioError);
            }
        } catch (e) {
            this._sendGate = false;
            log.error("Failed to connect to Gemini Live:", e);
            if (resumingFromHandle && !this.isDisconnected) {
                log.warn('Session resumption failed. Clearing handle and opening a fresh Live session.');
                this.storeResumptionHandle(null);
                return this.connect();
            }
            throw e;
        }
    }

    private restoreHistory() {
        log.info(`📜 History is restored via system prompt instructions (${this.initialHistory.length} messages).`);
        this.restoredThisConnection = true;
    }

    // Keep the in-memory history current as the session unfolds. A reconnect WITHOUT a
    // resumption handle rebuilds the system prompt from this.initialHistory; if we never
    // append, the DM forgets every beat since it was constructed. Capped well above the
    // prompt's RESTORE_LIMIT so the restore window keeps the most recent beats.
    private recordHistory(speaker: 'user' | 'dm', text: string) {
        if (!text || !text.trim()) return;
        this.initialHistory.push({ speaker, text });
        const MAX_HISTORY = 200;
        if (this.initialHistory.length > MAX_HISTORY) {
            this.initialHistory = this.initialHistory.slice(-MAX_HISTORY);
        }
    }

    private async setupAudio() {
        if (this.inputContext && this.inputContext.state === 'closed') this.inputContext = null;
        if (this.outputContext && this.outputContext.state === 'closed') this.outputContext = null;

        if (!this.inputContext) this.inputContext = new AudioContext({ sampleRate: 16000 });
        if (!this.outputContext) {
            this.outputContext = new AudioContext({ sampleRate: 24000 });
            this.outputAnalyser = this.outputContext.createAnalyser();
            this.outputAnalyser.fftSize = 256;
            this.outputAnalyser.connect(this.outputContext.destination);
        }

        await this.resumeAudioContext();
        this.nextStartTime = 0;

        await this.startMicrophone();
        this.startVolumePolling();
    }

    private startVolumePolling() {
        if (this.animationFrameId) return;

        const bufferLength = this.outputAnalyser ? this.outputAnalyser.frequencyBinCount : 0;
        const dataArray = new Uint8Array(bufferLength);

        const poll = () => {
            if (this.isDisconnected || !this.isConnected || !this.outputAnalyser) {
                this.animationFrameId = null;
                return;
            }

            if (this.playingNodes.length > 0) {
                this.outputAnalyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = (dataArray[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bufferLength);
                this.onVolumeUpdate(rms * 50);
            } else {
                this.onVolumeUpdate(0);
            }

            this.animationFrameId = requestAnimationFrame(poll);
        };

        this.animationFrameId = requestAnimationFrame(poll);
    }

    private async resumeAudioContext() {
        if (this.inputContext && this.inputContext.state === 'suspended') await this.inputContext.resume();
        if (this.outputContext && this.outputContext.state === 'suspended') await this.outputContext.resume();
        log.info("🔊 Audio Context state:", this.outputContext?.state);
    }

    private async startMicrophone() {
        if (!this.inputContext || this.inputContext.state === 'closed') {
            log.error("Cannot start microphone: inputContext is null or closed");
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // RE-CHECK after async getUserMedia — killAudioPipeline may have nulled inputContext
            if (!this.inputContext || (this.inputContext.state as string) === 'closed') {
                log.error("inputContext destroyed during getUserMedia, aborting mic setup");
                if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
                return;
            }

            const source = this.inputContext.createMediaStreamSource(this.stream);

            await this.inputContext.audioWorklet.addModule(pcmProcessorUrl);

            // RE-CHECK again after addModule
            if (!this.inputContext || (this.inputContext.state as string) === 'closed') {
                log.error("inputContext destroyed during addModule, aborting mic setup");
                if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
                return;
            }

            this.inputWorklet = new AudioWorkletNode(this.inputContext, 'pcm-processor');
            this.inputWorklet.port.onmessage = (e) => {
                // TRIPLE GUARD:
                // 1. Send gate (fastest — set synchronously in onclose/onerror)
                if (!this._sendGate) return;
                // 2. Basic flags
                if (!this.isConnected || this.isMuted || !this.session) return;
                // 3. REAL WebSocket readyState check — the SDK's internal WS object
                if (!isWebSocketOpen(this.session)) {
                    // WS is CLOSING or CLOSED but onclose hasn't fired yet
                    this._sendGate = false; // Slam the gate shut for ALL subsequent messages
                    return;
                }

                const float32Data = e.data;
                const pcm16 = floatTo16BitPCM(float32Data);
                const base64Audio = arrayBufferToBase64(pcm16);

                try {
                    this.session.sendRealtimeInput({
                        audio: {
                            data: base64Audio,
                            mimeType: 'audio/pcm;rate=16000'
                        }
                    });
                } catch {
                    // If send fails, close the gate permanently for this connection
                    this._sendGate = false;
                    return;
                }
            };

            source.connect(this.inputWorklet);
        } catch (e) {
            log.error("Microphone setup failed:", e);
        }
    }

    public isConnectedState() {
        return this.isConnected;
    }

    public isDisconnectedState() {
        return this.isDisconnected;
    }

    public isMutedState() {
        return this.isMuted;
    }

    public getLanguage(): string {
        return this.language;
    }

    public updateCharacter(newCharacter: CharacterSheet) {
        this.character = newCharacter;
        log.info('🔄 Live DM character reference updated');
    }

    public updateDirectorContext(context: string) {
        const next = String(context || '').trim();
        if (!next || next === this.directorContext) return;
        this.directorContext = next;
        this.pendingPrivateContext = next;
    }

    private consumePrivateContext(userText: string): string {
        const context = this.directorContext.trim();
        if (!context) return userText;
        const now = Date.now();
        const shouldAttach = context !== this.lastDirectorContextSent || now - this.lastDirectorContextSentAt > 30000;
        if (!shouldAttach) return userText;

        this.lastDirectorContextSent = context;
        this.lastDirectorContextSentAt = now;
        this.pendingPrivateContext = '';
        return [
            '[PRIVATE_DM_CONTEXT - do not narrate, do not answer this block, do not roll from this block alone]',
            context,
            '[/PRIVATE_DM_CONTEXT]',
            '',
            userText,
        ].join('\n');
    }

    private sendPrivateSystemNote(text: string): boolean {
        const note = String(text || '').trim();
        if (!note) return true;
        if (!this.canSendRealtime()) {
            this.queueTextMessage(`[SYSTEM]: ${note}`);
            return false;
        }
        return this.sendRealtimeTextNow(`[SYSTEM]: ${note}`);
    }

    private handleGeminiMessage(msg: LiveServerMessage) {
        this.handleSessionManagementMessage(msg);

        const content = msg.serverContent;

        if (content) {
            // --- Audio output ---
            if (content.modelTurn?.parts) {
                for (const part of content.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        this.playAudio(part.inlineData.data);
                    }
                }
            }

            // --- Input transcription (user speech) ---
            if (content.inputTranscription?.text) {
                this.onTranscriptUpdate('user', content.inputTranscription.text);
                memoryManager.addMessage({ speaker: 'user', text: content.inputTranscription.text });
                this.recordHistory('user', content.inputTranscription.text);
            }

            // --- Output transcription (DM speech) ---
            if (content.outputTranscription?.text) {
                this.dmTranscriptBuffer = appendTranscriptChunk(this.dmTranscriptBuffer, content.outputTranscription.text);
            }

            // --- Interruption handling ---
            if (content.interrupted) {
                log.info("🎤 Interruption detected: clearing audio queue...");
                this.handleInterruption();
            }

            // --- Turn complete: flush DM transcript buffer ---
            if (content.turnComplete) {
                if (this.dmTranscriptBuffer.trim()) {
                    auditBus.publish('gemini-in', `DM: ${this.dmTranscriptBuffer.slice(0, 90)}`, this.dmTranscriptBuffer);
                    this.onTranscriptUpdate('dm', this.dmTranscriptBuffer);
                    memoryManager.addMessage({ speaker: 'dm', text: this.dmTranscriptBuffer });
                    this.recordHistory('dm', this.dmTranscriptBuffer);
                    this.dmTranscriptBuffer = '';
                }
            }
        }

        // --- Tool calls ---
        if (msg.toolCall?.functionCalls) {
            this.handleToolCalls(msg.toolCall.functionCalls);
        }

        // --- Tool call cancellation ---
        if (msg.toolCallCancellation) {
            log.info("🛠️ Tool call cancelled by server");
        }
    }

    private handleSessionManagementMessage(msg: LiveServerMessage) {
        const update = msg.sessionResumptionUpdate;
        if (update?.resumable && update.newHandle) {
            this.storeResumptionHandle(update.newHandle);
        }

        if (msg.goAway) {
            const delay = this.delayBeforeGoAwayReconnect(msg.goAway.timeLeft);
            campaignEventLog.append('CONNECTION_EVENT', 'Gemini Live sent goAway; scheduling reconnect', {
                timeLeft: msg.goAway.timeLeft,
                delay,
            });
            log.warn(`Gemini Live goAway received. Reconnecting in ${delay}ms.`);
            this.scheduleForcedReconnect(delay);
        }
    }

    private delayBeforeGoAwayReconnect(timeLeft?: string): number {
        const match = String(timeLeft || '').match(/([\d.]+)/);
        const millis = match ? Number(match[1]) * 1000 : 2500;
        return Math.max(250, Math.min(millis - 1000, 5000));
    }

    private scheduleForcedReconnect(delay: number) {
        if (this.reconnectTimer || this.isDisconnected) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.forceReconnect();
        }, delay);
    }

    private forceReconnect() {
        if (this.isReconnecting || this.isDisconnected) return;
        this._sendGate = false;
        this.killAudioPipeline();
        this.isConnected = false;
        const s = this.session;
        this.session = null;
        if (s) { try { s.close(); } catch(_) {} }
        this.onConnectionChange(false);
        this.attemptReconnect();
    }

    private handleInterruption() {
        // Stop all currently playing audio nodes
        this.playingNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* ignore */ }
        });
        this.playingNodes = [];
        this.nextStartTime = 0;
        // Clear pending DM transcript on interruption
        this.dmTranscriptBuffer = '';
    }

    private playAudio(base64Audio: string) {
        if (!this.outputContext || this.outputContext.state === 'closed') return;

        try {
            const float32 = base64ToFloat32(base64Audio);

            const buffer = this.outputContext.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);

            const source = this.outputContext.createBufferSource();
            source.buffer = buffer;
            if (this.outputAnalyser) {
                source.connect(this.outputAnalyser);
            } else {
                source.connect(this.outputContext.destination);
            }

            const currentTime = this.outputContext.currentTime;
            if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;

            source.start(this.nextStartTime);
            this.nextStartTime += buffer.duration;

            // Track for interruption
            this.playingNodes.push(source);
            source.onended = () => {
                this.playingNodes = this.playingNodes.filter(n => n !== source);
            };
        } catch (e) {
            log.error("Failed to play audio delta:", e);
        }
    }

    private async handleToolCalls(calls: any[]) {
        const responses: any[] = [];

        for (const call of calls) {
            const { name, args, id } = call;
            log.info(`🛠️ Tool Call: ${name}`, JSON.stringify(args));

            let result: any = { error: "Unknown function" };

            if (name === "lookup_creature") {
                await preloadCodexBestiary();
                const creature = getCreature(args?.name);
                if (creature) {
                    const attacks = getCreatureAttacks(creature);
                    result = {
                        found: true,
                        id: creature.id,
                        name: creature.name,
                        cr: creature.cr,
                        xp: creature.xp,
                        hp: creature.hp.base,
                        hpDice: creature.hp.dice,
                        ac: creature.ac,
                        speed: creature.speed,
                        stats: creature.stats,
                        attacks: attacks.map(a => ({
                            name: a.name,
                            attackBonus: a.attackBonus,
                            damage: a.damage,
                            damageType: a.damageType,
                            reach: a.reach,
                            range: a.ranged ? `${a.ranged.short}/${a.ranged.long}` : undefined,
                            damageParts: a.damageParts,
                        })),
                        type: creature.type,
                        size: creature.size,
                        action: creature.action,
                        speedStr: creature.speedStr
                    };
                } else {
                    result = { found: false, error: "Creature not found" };
                }
            } else if (name === "lookup_weapon") {
                const weapon = getWeapon(args?.name);
                result = weapon ? {
                    found: true,
                    summary: weaponSummary(weapon),
                    name: weapon.name,
                    damage: weapon.damage,
                    damageType: weapon.damageType,
                    properties: weapon.properties
                } : { found: false, error: "Weapon not found" };
            } else if (this.onToolCall) {
                try {
                    result = await this.onToolCall(call);
                } catch (e: any) {
                    log.error(`Error executing tool call ${name}:`, e);
                    result = { error: e.message || "Execution failed" };
                }
            }

            auditBus.publish('gemini-tool', name, { args, result });

            responses.push({
                id: id,
                name: name,
                response: result
            });
        }

        // Send all tool responses at once — with WebSocket state check
        this.queueToolResponses(responses);
    }

    private queueToolResponses(responses: any[]) {
        if (!responses.length) return;
        this.pendingToolResponses = [...this.pendingToolResponses, ...responses].slice(-50);
        this.flushToolResponseQueue();
    }

    private flushToolResponseQueue() {
        if (!this.canSendRealtime() || this.pendingToolResponses.length === 0) return;
        const functionResponses = [...this.pendingToolResponses];
        try {
            this.session!.sendToolResponse({ functionResponses });
            this.pendingToolResponses = [];
        } catch (e) {
            log.error('Failed to send tool response (session closed); keeping it queued:', e);
            this._sendGate = false;
        }
    }

    private canSendRealtime(): boolean {
        return Boolean(this.session && this.isConnected && isWebSocketOpen(this.session));
    }

    private queueTextMessage(text: string) {
        this.outboundTextQueue = [...this.outboundTextQueue, { text, createdAt: Date.now() }].slice(-50);
        this.onQueueChange?.(this.outboundTextQueue.length);
        campaignEventLog.append('CONNECTION_EVENT', 'Queued text for Gemini Live reconnect', {
            queued: this.outboundTextQueue.length,
        });
    }

    private sendRealtimeTextNow(text: string): boolean {
        if (!this.session || !this.canSendRealtime()) return false;
        try {
            this.session.sendRealtimeInput({ text });
            return true;
        } catch (e) {
            log.error('Failed to send realtime text:', e);
            this._sendGate = false;
            return false;
        }
    }

    private sendOrQueueText(text: string): boolean {
        if (this.sendRealtimeTextNow(text)) return true;
        this.queueTextMessage(text);
        if (!this.isReconnecting && !this.isDisconnected) this.attemptReconnect();
        return false;
    }

    private flushOutboundTextQueue() {
        if (!this.canSendRealtime() || this.outboundTextQueue.length === 0) return;

        const queued = [...this.outboundTextQueue];
        this.outboundTextQueue = [];
        this.onQueueChange?.(0);

        for (const item of queued) {
            if (!this.sendRealtimeTextNow(item.text)) {
                this.outboundTextQueue.unshift(item);
                this.onQueueChange?.(this.outboundTextQueue.length);
                break;
            }
        }
    }

    async sendUserMessage(text: string) {
        auditBus.publish('gemini-out', `User → DM: ${text.slice(0, 90)}`, text);
        return this.sendOrQueueText(this.consumePrivateContext(text));
    }

    async sendSystemMessage(text: string) {
        auditBus.publish('gemini-out', `System → DM: ${text.slice(0, 90)}`, text);
        return this.sendPrivateSystemNote(text);
    }

    private attemptReconnect() {
        if (this.isDisconnected) {
            log.info('🔌 Live DM has been explicitly disconnected; aborting reconnect.');
            return;
        }

        // Detect if the previous connection was stable or an "instant close"
        const connectionLivedMs = Date.now() - this._lastConnectTime;
        if (connectionLivedMs > 5000 && this._lastConnectTime > 0) {
            log.info(`⚡ Connection was stable for ${connectionLivedMs}ms before drop, resetting reconnect attempts.`);
            this.reconnectAttempts = 0;
        } else if (this.sessionResumptionHandle && this._lastConnectTime > 0) {
            // Opened then died almost immediately while resuming from a stored
            // handle → the handle is almost certainly stale/expired. Drop it so the
            // next attempt opens a FRESH session instead of looping on the bad
            // handle (the "Gemini won't connect after quitting mid-combat" bug).
            log.warn('⚠️ Live connection died <5s while resuming — clearing stale resumption handle to break the reconnect loop.');
            this.storeResumptionHandle(null);
        }

        if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts && this.onReconnectFailed) {
                log.error('❌ Max reconnect attempts reached. Stopping.');
                this.onReconnectFailed();
            }
            return;
        }

        this.isReconnecting = true;
        this.reconnectAttempts++;

        if (this.onReconnecting) this.onReconnecting(this.reconnectAttempts, this.maxReconnectAttempts);

        const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
        // Store the handle so disconnect() can cancel a pending backoff reconnect.
        // Without this, quitting during the 2–10s window still fired connect() on a
        // torn-down DM (a contributor to the "won't connect after quitting" bug).
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.isDisconnected) {
                log.info('🔌 Reconnect scheduled timer fired, but component was disconnected. Aborting.');
                this.isReconnecting = false;
                return;
            }
            this.connect().then(() => {
                this.isReconnecting = false;
                if (this.onReconnectSuccess) this.onReconnectSuccess();
            }).catch(() => {
                this.isReconnecting = false;
                this.attemptReconnect();
            });
        }, delay);
    }

    async manualReconnect() {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this._lastConnectTime = 0;
        this.isDisconnected = false;
        this._sendGate = false;
        const s = this.session;
        this.session = null;
        if (s) { try { s.close(); } catch (_) {} }
        this.killAudioPipeline();
        await this.resumeAudioContext();
        await this.connect();
    }

    /**
     * Synchronous nuclear kill of the entire audio pipeline.
     * Closes the send gate, stops the audio source, kills the worklet.
     */
    private killAudioPipeline() {
        // 1. SLAM the send gate shut — instant, synchronous, no messages get through after this
        this._sendGate = false;

        // 2. Stop mic tracks SYNCHRONOUSLY — this cuts the audio source at hardware level
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        // 3. Disconnect and null worklet
        if (this.inputWorklet) {
            try { this.inputWorklet.port.onmessage = null; } catch (_) {}
            try { this.inputWorklet.disconnect(); } catch (_) {}
            this.inputWorklet = null;
        }

        // 4. Close input AudioContext entirely (not suspend — close is final)
        if (this.inputContext && this.inputContext.state !== 'closed') {
            this.inputContext.close().catch(() => {});
            this.inputContext = null;
        }

        // 5. Cancel volume polling animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    disconnect() {
        this.isDisconnected = true;
        this._sendGate = false;
        this.isConnected = false;
        // Drop the stored session-resumption handle on explicit teardown (leave /
        // save switch / language change). A handle left over from an abrupt
        // mid-combat exit can be stale server-side and make the NEXT session loop
        // open→close on resume. In-session auto-reconnect uses attemptReconnect
        // (which keeps the handle), not disconnect(), so fast reconnects still work.
        this.storeResumptionHandle(null);
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        const s = this.session;
        this.session = null; // Null FIRST
        if (s) { try { s.close(); } catch (_) {} }

        this.killAudioPipeline();

        // Also stop playback
        this.playingNodes.forEach(n => { try { n.stop(); } catch(_) {} });
        this.playingNodes = [];

        if (this.outputContext && this.outputContext.state !== 'closed') {
            this.outputContext.close().catch(() => {});
            this.outputContext = null;
        }
        this.outputAnalyser = null;
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
        if (this.stream) {
            this.stream.getAudioTracks().forEach(t => t.enabled = !muted);
        }
        if (muted && this.session && this.canSendRealtime()) {
            try {
                this.session.sendRealtimeInput({ audioStreamEnd: true });
            } catch {
                this._sendGate = false;
            }
        }
    }

    setMicEnabled(enabled: boolean) {
        this.setMuted(!enabled);
    }
}

export interface LiveDMListener {
    onTranscript?: (speaker: 'user' | 'dm', text: string) => void;
    onVolume?: (vol: number) => void;
    onConnectionChange?: (connected: boolean) => void;
    onReconnecting?: (attempt: number, maxAttempts: number) => void;
    onReconnectFailed?: () => void;
    onReconnectSuccess?: () => void;
    onQueueChange?: (queued: number) => void;
    onToolCall?: (toolCall: any) => Promise<any>;
}

export class LiveConnectionManager {
    private static instance: LiveConnectionManager | null = null;
    private activeDM: LiveDungeonMaster | null = null;
    private listeners = new Set<LiveDMListener>();
    private activeSaveId: string | null = null;

    private constructor() {}

    static getInstance(): LiveConnectionManager {
        if (!LiveConnectionManager.instance) {
            LiveConnectionManager.instance = new LiveConnectionManager();
        }
        return LiveConnectionManager.instance;
    }

    async connect(
        saveId: string,
        character: CharacterSheet,
        adventure: string,
        adventureManifest: string,
        language: string,
        initialHistory: { speaker: 'user' | 'dm', text: string }[],
        directorContext: string
    ): Promise<LiveDungeonMaster> {
        if (this.activeDM && this.activeSaveId === saveId && !this.activeDM.isDisconnectedState()) {
            if (this.activeDM.getLanguage() === language) {
                log.info(`🔌 Reusing active Gemini Live session for save ${saveId}`);
                this.activeDM.updateCharacter(character);
                this.activeDM.updateDirectorContext(directorContext);
                return this.activeDM;
            } else {
                log.info(`🔌 Language changed from ${this.activeDM.getLanguage()} to ${language}. Re-creating Live session.`);
                this.activeDM.disconnect();
                this.activeDM = null;
            }
        }

        if (this.activeDM) {
            log.info('🔌 Closing previous active Gemini Live session');
            this.activeDM.disconnect();
            this.activeDM = null;
        }

        log.info(`🔌 Creating new Gemini Live session for save ${saveId}`);
        this.activeSaveId = saveId;

        this.activeDM = new LiveDungeonMaster(
            character,
            adventure,
            (speaker, text) => this.listeners.forEach(l => l.onTranscript?.(speaker, text)),
            (vol) => this.listeners.forEach(l => l.onVolume?.(vol)),
            (connected) => this.listeners.forEach(l => l.onConnectionChange?.(connected)),
            language,
            initialHistory,
            adventureManifest,
            directorContext,
            (attempt, maxAttempts) => this.listeners.forEach(l => l.onReconnecting?.(attempt, maxAttempts)),
            () => this.listeners.forEach(l => l.onReconnectFailed?.()),
            () => this.listeners.forEach(l => l.onReconnectSuccess?.()),
            (queued) => this.listeners.forEach(l => l.onQueueChange?.(queued)),
            async (toolCall) => {
                for (const l of this.listeners) {
                    if (l.onToolCall) {
                        return await l.onToolCall(toolCall);
                    }
                }
                return { error: "No tool call handler registered" };
            }
        );

        await this.activeDM.connect();
        return this.activeDM;
    }

    subscribe(listener: LiveDMListener): () => void {
        this.listeners.add(listener);
        if (this.activeDM) {
            listener.onConnectionChange?.(this.activeDM.isConnectedState());
        }
        return () => {
            this.listeners.delete(listener);
        };
    }

    getActiveDM(): LiveDungeonMaster | null {
        return this.activeDM;
    }

    disconnect() {
        if (this.activeDM) {
            this.activeDM.disconnect();
            this.activeDM = null;
        }
        this.activeSaveId = null;
    }
}
