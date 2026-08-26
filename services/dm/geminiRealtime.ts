import { CharacterSheet } from "../../types";
import { GoogleGenAI, Modality, Session, LiveServerMessage } from '@google/genai';
// @ts-ignore
import pcmProcessorUrl from './pcm-processor.js?url';
import { memoryManager } from '../persistence/memoryManager';
import { getCreature, getCreatureAttacks } from '../../data/bestiary';
import { preloadCodexBestiary } from '../../engine/codexService';
import { getWeapon, weaponSummary } from '../../data/weapons';
import { log } from '../infra/logger';
import { buildSystemPrompt } from './systemPrompt';
import { campaignEventLog } from '../persistence/campaignEventLog';
import { requireViteEnv } from '../infra/modelConfig';
import { auditBus } from '../infra/auditBus';
import { getAppSettings } from '../../store/settingsStore';
// IJ7 — lecture de l'activeSaveId pour lier le handle de reprise à la sauvegarde.
import { useGameStore } from '../../store/gameStore';
import { sessionTrace } from '../infra/sessionTrace';

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

// ── DIAGNOSTIC TEMPORAIRE « coupures » ───────────────────────────────────────
// Corrèle chaque interruption serveur avec ce qui l'a précédée : injection de
// texte pendant que le MJ parle ? écho capté par le micro ? Visible dans la
// console (filtre DIAG-COUPURE) et l'AuditConsole. À RETIRER une fois le
// coupable identifié.
function diagStamp(): string {
    const d = new Date();
    const p = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

/** Profondeur max de la file du gate de silence (les plus anciens sont jetés). */
const MAX_DEFERRED = 8;

/** TR10 — plancher entre deux ré-ancrages du contexte directeur déclenchés
 *  par une compression de fenêtre. Mesuré le 2026-08-23 : sans plancher,
 *  29 renvois de 12 Ko en 34 min, dont 91 % identiques au précédent. */
const REANCHOR_MIN_INTERVAL_MS = 90_000;
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
        description: "Pull authored detail from THIS campaign's manifest AND the campaign's living memory on demand (scenes, NPCs, locations, lore, rewards, chapter notes, encounters, the villain, and every canon fact/secret ever recorded). Use whenever you need specifics the live context didn't include — a named NPC's personality/voice, a place's description, a chapter's secret, an item, an old promise, or what you established about someone twenty scenes ago. The live context only ever shows a WINDOW of the campaign's facts: when the context says a memory index exists, this tool is how you reach the rest. Returns the matching chunks.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                query: { type: "STRING" as any, description: "What to look up: a name, place, keyword, or theme (e.g. 'Ysolde', 'Cairn de Givre', 'Gel Profond')." },
                kind: { type: "STRING" as any, description: "Optional filter: npc | scene | location | lore | reward | chapter | encounter | choice (the authored branching decisions of a chapter and what each option commits to) | memory (canon facts, secrets and NPC memories beyond the visible window) | villain (the antagonist's arc, weaknesses — and, only with this explicit kind, their secret)." }
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
                target: { type: "STRING" as any, description: "Combatant id/name — or 'all_enemies' for an AREA spell (Fireball, Burning Hands): every enemy then rolls its OWN save and shares one damage roll. Use 'all_combatants' when the blast zone ALSO covers allies (companion, mount): friendly fire is real — they save and take damage too." },
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
        // DC1 (audit trame) — SEUL mécanisme d'avancement de la position :
        // validation fuzzy côté client, erreur EXPLICITE listant les ids
        // valides (l'ancien chemin échouait en silence et le contexte
        // ramenait le MJ au chapitre 1 pour toute la campagne).
        name: "set_campaign_position",
        description: "REQUIRED whenever the story moves to a new chapter or scene of the campaign manifest. Marks earlier chapters as completed. The client validates the ids and returns an explicit error with the list of valid ids if no match — never guess silently. Also call it right after you decide a chapter is finished.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                chapterId: { type: "STRING" as any, description: "Chapter id, exact title, or chapter number (e.g. '3'). Fuzzy-matched against the manifest." },
                sceneId: { type: "STRING" as any, description: "Scene id or title within that chapter (optional)." },
                region: { type: "STRING" as any, description: "World/plane the story is now in (optional — set it whenever the party changes world, e.g. 'Le Val Clos')." }
            },
            required: ["chapterId"]
        }
    },
    {
        name: "update_campaign_runtime",
        description: "Update compact campaign director state after a meaningful objective, canon fact, secret, world clock, or branch status change. Do not call every turn. CHAPTER/SCENE changes go through set_campaign_position (mandatory), never through this tool.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                currentObjective: { type: "STRING" as any, description: "Short current objective for the player-facing campaign board." },
                canonFact: { type: "STRING" as any, description: "Stable fact that is now true in the campaign." },
                canonFacts: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Several stable facts at once (alternative to canonFact)." },
                protectedSecret: { type: "STRING" as any, description: "Private director-only secret that should not be shown to the player." },
                protectedSecrets: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Several director-only secrets at once (alternative to protectedSecret)." },
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
                bonus: { type: "INTEGER" as any, description: "Optional static bonus — leave empty for skill/ability/save checks (the sheet provides it)." },
                force: { type: "BOOLEAN" as any, description: "Set true ONLY to override the branch-plan suppression when the roll really stems from a NEW concrete player action with risk (the engine otherwise rejects rolls right after a branch plan)." }
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
                properties: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Weapon properties (e.g., ['finesse', 'light', 'two-handed']). For a RANGED weapon (bow, crossbow, sling) you MUST include 'ammunition' so the engine treats it as ranged." },
                range: { type: "STRING" as any, description: "Range bands in feet for a ranged/thrown weapon, e.g. '150/600' for a longbow, '20/60' for a thrown dagger. Required for any bow/crossbow/sling." },
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
        description: "Add an enemy to the combat initiative tracker. If the monster exists in the bestiary, local HP, AC, DEX, portrait, and attacks are used; hp/ac are fallback only for homebrew. For HOMEBREW enemies (not in the bestiary), ALWAYS pass hp and ac — omitted hp falls back to a level-scaled default, not the stats you had in mind. SIZE THE FIGHT TO THE HERO'S LEVEL: the engine enforces an SRD XP budget and REJECTS spawns past the deadly threshold (+25%) — the error tells you the remaining headroom. At level 1-2, one or two weak creatures IS a real fight.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                hp: { type: "INTEGER" as any, description: "HP for homebrew enemies — STRONGLY recommended for any creature not in the bestiary (omitted = level-scaled default)." },
                ac: { type: "INTEGER" as any, description: "Fallback AC for homebrew enemies only." },
                strMod: { type: "INTEGER" as any, description: "Fallback STR modifier for homebrew enemies only." },
                dexMod: { type: "INTEGER" as any, description: "Fallback DEX modifier for homebrew enemies only." },
                xp: { type: "INTEGER" as any, description: "XP award for defeating this HOMEBREW enemy (SRD CR table). Omit for bestiary monsters." },
                range: { type: "STRING" as any, description: "Starting distance from the player: 'melee' (adjacent), 'near' (a few strides), 'far' (needs a full move or ranged attack). Default: near." },
                force: { type: "BOOLEAN" as any, description: "Set true ONLY after the engine rejected the spawn as over-budget AND the campaign manifest explicitly scripts this fight as a deadly set-piece. Never use it to pad ordinary encounters." }
            },
            required: ["name"]
        }
    },
    {
        name: "add_ally_init",
        description: "Add an ALLY (companion, rescued NPC, summoned creature) to the initiative tracker. The ally fights ON THE PLAYER'S SIDE: enemies may target it, it counts toward the party for defeat, and THE ENGINE PLAYS ITS TURN AUTOMATICALLY (real attack roll + real damage) — you only narrate the reported result, never re-roll it. Use this instead of add_enemy_init for any friendly combatant. Bestiary stats are used if the name matches; otherwise pass hp/ac and the attack numbers so the ally hits for a fair amount.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                hp: { type: "INTEGER" as any, description: "HP for homebrew allies (defaults to a level-appropriate value if omitted)." },
                ac: { type: "INTEGER" as any, description: "AC for homebrew allies (defaults to 13)." },
                dexMod: { type: "INTEGER" as any, description: "Fallback DEX modifier for the initiative roll." },
                attackName: { type: "STRING" as any, description: "Name of the ally's attack, e.g. 'Épée courte', 'Arc court'." },
                attackBonus: { type: "INTEGER" as any, description: "Attack roll bonus, e.g. 4." },
                damageFormula: { type: "STRING" as any, description: "Damage dice, e.g. '1d8+2'." },
                damageType: { type: "STRING" as any, description: "e.g. 'slashing', 'piercing', 'radiant'." }
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
                condition: { type: "STRING" as any, description: "SRD condition name, e.g. 'prone', 'poisoned', 'frightened', 'restrained', 'petrified', 'deafened', 'exhaustion'." },
                target: { type: "STRING" as any, description: "Combatant name or id. Omit or 'player' for the player character." },
                concentrationBy: { type: "STRING" as any, description: "If an ENEMY caster maintains this effect through CONCENTRATION (e.g. its Hold Person), the caster's combatant name/id. Damaging that caster then forces a real CON save — on a failure the effect ends automatically." }
            },
            required: ["condition"]
        }
    },
    {
        name: "open_shop",
        description: "Open the TRADING interface with a merchant: a real buy/sell panel appears on the player's screen, stocked by merchant type and party level, SRD gold prices. Call it whenever the player enters a shop or starts trading. Types: blacksmith (weapons/armor; masterwork +1 damage from level 5, magic +1 gear from level 10), apothecary (potions/remedies), general (adventuring gear), enchanter (magic items). Purchases and sales are handled BY THE ENGINE — never also call add_gold/add_inventory_item for them; you'll receive [SYSTEM] reports to narrate.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                merchantName: { type: "STRING" as any, description: "The merchant's name, e.g. 'Borin Marteau-de-Fer'." },
                merchantType: { type: "STRING" as any, description: "blacksmith | apothecary | general | enchanter (French synonyms work: forgeron, apothicaire, bazar, enchanteur)." },
                priceModifier: { type: "NUMBER" as any, description: "Price multiplier: 1 = normal, 1.5 = greedy, 0.8 = friendly. Default 1." },
                greeting: { type: "STRING" as any, description: "One short line of merchant flavor shown in the shop header." },
                extraItems: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Optional SIGNATURE stock: exact magic item names from the catalog (e.g. 'Longsword +1', 'Cloak of Protection') — for key merchants and quest rewards for sale." }
            },
            required: ["merchantName"]
        }
    },
    {
        name: "close_shop",
        description: "Close the trading interface (the player leaves the stall or the haggling ends).",
        parameters: { type: "OBJECT" as any, properties: {} }
    },
    {
        name: "remove_condition",
        description: "Remove a condition or named effect from a combatant (cured poison, broken paralysis, dispelled magic, the grappler lets go…). Omit target (or use 'player') for the player. Works in and out of combat. Use whenever the fiction lifts a condition (antidote, Lesser Restoration, the spellcaster's concentration ends…).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                condition: { type: "STRING" as any, description: "Condition or effect name to remove, e.g. 'poisoned', 'restrained', 'Hold Person'." },
                target: { type: "STRING" as any, description: "Combatant name or id. Omit or 'player' for the player character." }
            },
            required: ["condition"]
        }
    },
    {
        name: "update_enemy_hp",
        description: "Set an enemy's HP directly (a scripted wound, healing, a dramatic second wind). At 0 HP or less the enemy is DOWN — dead or dying — and must be narrated as such. NEVER set HP to 0 to represent an enemy that flees, surrenders, retreats or is called off: use enemy_leaves_combat for that (it leaves the fight ALIVE).",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, hp: { type: "INTEGER" as any } }, required: ["name", "hp"] }
    },
    {
        name: "enemy_leaves_combat",
        description: "Remove a LIVING enemy from the fight WITHOUT killing it: it surrenders, yields, retreats, is called off, or breaks and runs for narrative reasons. It leaves the initiative alive with its current HP (it may return later — add_enemy_init it again by the same name) and still counts toward victory and XP. Use this instead of update_enemy_hp(0) whenever an enemy stops fighting but is not dead. Note: the engine already makes wounded enemies (below 40% HP) roll a morale check on their own (WIS save vs DC 11) — a failure appears as a `moraleCheck: { result: 'fled' }` field in a tool result or a '[SYSTEM] X … FLED' report: narrate those as a rout, never as a death.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                target: { type: "STRING" as any, description: "Enemy name or combatant id (use the id when enemies share a name)." },
                reason: { type: "STRING" as any, description: "'surrendered' (yields, drops its weapon, begs for mercy) or 'fled' (runs away, retreats, is recalled by its master)." }
            },
            required: ["target", "reason"]
        }
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
        description: "Ask the local D&D rules engine to resolve an attack roll and damage against a combatant. For bestiary monsters, use attackName from lookup_monster/lookup_creature instead of inventing attack stats. The result may carry `moraleCheck`: a wounded enemy (below 40% HP) rolls WIS vs DC 11 and on failure FLEES — ALIVE, out of the fight — narrate a rout, never a death. `encounterOutcome: 'victory'` means the engine ends the fight and awards XP itself: do not call end_combat.",
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
        description: "When the player improvises a creative/off-script action on THEIR turn ('I shoot the chandelier so it falls on the goblins', 'I give a glorious rallying speech', 'I draw my sword'), do NOT resolve it yourself and do NOT advance the turn. NEVER use this for a real spell from the player's spellbook — that is cast_spell (slots, concentration, real DC); the engine rejects spellbook spells here. Instead AUTHOR a custom action card with this tool: it pops up to the player showing its cost, the player clicks it, and the engine rolls the real dice. You decide the numbers you adjudicate (cost, attack bonus, DC, advantage, damage). Choose 'resolution': 'attack' (d20 to hit a target then damage), 'save' (the target(s) roll a saving throw, take damage on fail), 'check' (the player rolls an ability check vs a DC), 'auto' (it just happens — rule of cool, no roll), or 'effect' (a pure buff/condition, e.g. the speech grants +2 to the next attack via modifierBonus). Call once per improvised action.",
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
                targetEffectStat: { type: "STRING" as any, description: "Optional numeric debuff/buff applied ON THE TARGET when the card succeeds: which stat — 'attackBonus' | 'AC' | 'damageBonus' | 'speed'." },
                targetEffectBonus: { type: "INTEGER" as any, description: "Amount for targetEffectStat (e.g. -2 for 'sand in the eyes: -2 to its attacks')." },
                targetEffectRounds: { type: "INTEGER" as any, description: "Duration in combat rounds for the target effect (default 2)." },
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
        description: "Apply deterministic damage to a combatant by name (a FIXED amount you already know). For environmental hazards with dice, prefer environmental_damage which rolls locally and can demand a save. The result may carry `moraleCheck`: a damaged enemy below 40% HP rolls WIS vs DC 11 and on failure FLEES — ALIVE, out of the fight — narrate a rout, never a death. `encounterOutcome: 'victory'` means the engine ends the fight and awards XP itself: do not call end_combat.",
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
                targets: { type: "STRING" as any, description: "MULTI-target hazard: 'all_enemies' (rockslide over the whole pack), 'all_combatants' (EVERYONE including the player and allies — cave-in, spreading fire), or a comma-separated list of ids/names. Each target rolls its own save/damage. Overrides 'target'." },
                attackBonus: { type: "INTEGER" as any, description: "Scripted ATTACK mode (ambush arrow, dart trap): 1d20+bonus is rolled vs the target's AC — a miss deals NOTHING. Use INSTEAD of saveAbility/saveDC." },
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
        description: "Add a quest to the player's journal. Call it THE MOMENT the hero is given or accepts a job — an NPC asks for help, a contract is taken, a goal is named ('find my son', 'clear the mine', 'carry the relic to the abbey') — in the same beat, not at the end of the scene. A goal the player is pursuing that is NOT in the journal does not exist for them. Optionally seed 2-4 checkable steps (sub-objectives) so the player sees their progress. A title that matches an already COMPLETED quest is REJECTED (that story is settled — reference it as a memory); pass recurring:true only for a genuinely new contract that reuses the same name.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any }, description: { type: "STRING" as any }, steps: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Optional 2-4 short sub-objectives shown as a checklist." }, recurring: { type: "BOOLEAN" as any, description: "True ONLY when this is a new instance of a recurring contract whose title was already completed before (e.g. escorting another caravan). Never use it to re-open a finished story." } }, required: ["title", "description"] }
    },
    {
        name: "update_quest_step",
        description: "Check off (or add) a sub-objective of an ACTIVE quest. Call whenever the player completes a meaningful stage of a quest — the checklist is what makes the journal feel alive. done defaults to true for an existing step; a new step is added unchecked unless done=true.",
        parameters: { type: "OBJECT" as any, properties: { questTitle: { type: "STRING" as any, description: "Title of the active quest (fuzzy matched)." }, step: { type: "STRING" as any, description: "The sub-objective text (fuzzy matched; added if new)." }, done: { type: "BOOLEAN" as any } }, required: ["questTitle", "step"] }
    },
    {
        name: "complete_quest",
        description: "Mark a quest as completed — call it IN THE SAME BEAT as the resolution (the relic is handed over, the missing son is home, the reward is paid), never 'later'. Pass the EXACT title as it appears in the journal; an ambiguous title is rejected rather than closing the wrong quest, and the error lists the active titles. Announce the reward in the same breath.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any, description: "Exact quest title from the journal / director context." } }, required: ["title"] }
    },
    {
        name: "recruit_companion",
        description: "An NPC durably JOINS the hero's party (max 2). Unlike add_ally_init (one fight), a companion PERSISTS: auto-joins every combat as an ally, HP carries between fights, rests heal them. Bestiary stats are used when the name matches; otherwise pass hp/ac/attack numbers. Use when the fiction makes an NPC a real traveling companion.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                description: { type: "STRING" as any, description: "One line: who they are." },
                hp: { type: "INTEGER" as any }, ac: { type: "INTEGER" as any },
                attackName: { type: "STRING" as any }, attackBonus: { type: "INTEGER" as any },
                damageFormula: { type: "STRING" as any, description: "e.g. '1d8+2'" }, damageType: { type: "STRING" as any }
            },
            required: ["name"]
        }
    },
    {
        name: "dismiss_companion",
        description: "A companion leaves the party (death, betrayal, farewell). Removes them from future combats.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "set_mount",
        description: "The hero acquires a MOUNT: bought, gifted, tamed — or SUMMONED (Paladin level 5+ gets their Celestial Steed for free via Find Steed, kind='destrier_celeste'). Overland travel speeds up, and in combat a melee attack on a FAR enemy becomes a mounted CHARGE (close + strike in one action) — but ONLY while the hero is IN THE SADDLE (acquiring mounts up; see set_mounted). One mount at a time — calling again replaces it. Provide at least one of name/kind (the call is rejected with neither).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "The mount's given name (e.g. 'Tempête'). Optional if kind is set." },
                kind: { type: "STRING" as any, description: "Typed mount from the catalog: poney, cheval_selle, destrier, chameau, elan, loup_geant, sanglier_geant, griffon (flying), pegase (flying), destrier_celeste (PALADIN 5+ ONLY — free summon, returns after a long rest if slain). Sets speed/flying automatically." },
                speed: { type: "INTEGER" as any, description: "Override speed in feet. Usually omit — the kind sets it." },
                hp: { type: "INTEGER" as any, description: "Override max HP for a CUSTOM mount. Usually omit — the kind's catalog stats apply." },
                description: { type: "STRING" as any, description: "Short flavor: color, temperament, name origin." }
            }
        }
    },
    {
        name: "set_mounted",
        description: "The hero climbs INTO the saddle (mounted=true) or DISMOUNTS (mounted=false). Call it whenever the fiction changes riding state — entering a building, sneaking, a tavern, boarding a boat = dismount; setting off on the road or charging into battle on horseback = mount up. Mounted charges (melee strike on a FAR enemy in one action) only work while mounted.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                mounted: { type: "BOOLEAN" as any, description: "true = in the saddle, false = on foot." }
            },
            required: ["mounted"]
        }
    },
    {
        name: "dismiss_mount",
        description: "The hero loses their mount (sold, dead, fled, left at the stable for a dungeon).",
        parameters: { type: "OBJECT" as any, properties: {}, }
    },
    {
        name: "set_beast_companion",
        description: "BEAST MASTER ranger only: bond (or change) the animal companion type. It auto-joins every fight as an ally with REAL stats. Ask the ranger which beast when they take the archetype.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "loup (wolf, balanced), ours (bear, hits hard), panthere (panther, fast AC 14), faucon (giant hawk, AC 15 skirmisher)." }
            },
            required: ["kind"]
        }
    },
    {
        name: "set_familiar",
        description: "Bond a FAMILIAR to a caster (Mage/Wizard/Sorcerer via Find Familiar, Warlock via Pact of the Chain, Druid via animal spirit). Narrative scout + the player gains a 'Familiar: Help' combat button (advantage on next attack, 1/short rest). Offer it when the caster learns Find Familiar, meets a mystical creature, or at character introduction.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "chat, hibou, corbeau, rat, araignee, belette, serpent, crapaud, chauve_souris, renard (druidic)." },
                name: { type: "STRING" as any, description: "The familiar's given name (e.g. 'Plume')." },
                description: { type: "STRING" as any, description: "Short flavor (coat, quirk, origin)." }
            },
            required: ["kind"]
        }
    },
    {
        name: "dismiss_familiar",
        description: "The familiar is dismissed or destroyed (it can be re-bonded later with set_familiar).",
        parameters: { type: "OBJECT" as any, properties: {}, }
    },
    {
        name: "set_time_of_day",
        description: "Advance the in-world clock when the fiction moves time OUTSIDE rests (evening falls, you travel until nightfall, dawn breaks). Rests already move time automatically (short rest = next moment, long rest = next day at dawn). The current day/moment shows in the player HUD and tints scene images.",
        parameters: { type: "OBJECT" as any, properties: { timeOfDay: { type: "STRING" as any, description: "dawn | day | dusk | night" }, advanceDays: { type: "INTEGER" as any, description: "Optional: full days that pass (journeys, imprisonment)." } }, required: ["timeOfDay"] }
    },
    {
        name: "add_npc",
        description: "Log a newly met NPC in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any }, location: { type: "STRING" as any } }, required: ["name", "description", "location"] }
    },
    {
        name: "update_npc",
        description: "Update a known NPC's persistent memory of the hero. Call whenever an interaction meaningfully changes the relationship: dispositionDelta -2..+2 (angered..won over), memory = one short sentence the NPC will remember ('the hero saved my son'), location if they moved. The engine injects this back into your context so the NPC stays coherent across sessions.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, dispositionDelta: { type: "NUMBER" as any }, memory: { type: "STRING" as any }, location: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_npc",
        description: "Recall a KNOWN NPC before playing them again: their journal record (disposition, persistent memories of the hero, last known location) plus any authored-cast entry. The live context only shows the 8 most recent NPCs — use this for anyone met earlier so their attitude stays coherent.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "NPC name (accents/partial spelling tolerated)." } }, required: ["name"] }
    },
    {
        name: "roll_loot",
        description: "Roll on the level-appropriate SRD treasure table. Use it when the player finds a hoard/chest or defeats a notable foe: the engine picks 1-3 magic items suited to the hero's level, adds them to the inventory, and returns them for you to narrate. Pass rarityHint ('common'|'uncommon'|'rare'|'very rare'|'legendary') to force ONE item of that rarity for a milestone reward (boss, quest completion).",
        parameters: { type: "OBJECT" as any, properties: { context: { type: "STRING" as any }, rarityHint: { type: "STRING" as any } }, required: [] }
    },
    {
        name: "add_location",
        description: "Log a newly discovered location in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["name", "description"] }
    },
    {
        name: "add_story_moment",
        description: "Record a MAJOR narrative beat in the chronicle — a revelation, a betrayal, a pact sealed, arriving at a landmark, a boss falling, a character death. One line the player would want to re-read months later. NOT for routine combat, loot, gold or XP (the engine logs those). Re-logging the same beat is detected and ignored, so prefer a distinctive title.",
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
                description: { type: "STRING" as any, description: "2-3 concrete sentences IN ENGLISH (subject, environment, lighting, atmosphere, colors, mood). No negations. Proper nouns may stay French." },
                phase: { type: "STRING" as any, description: "exploration, quest, dungeon, town, tavern, dramatic, stealth, rest" }
            },
            required: ["description"]
        }
    },
    {
        name: "trigger_combat_image",
        description: "Generate a 16:9 combat illustration when a fight starts or a major foe enters. One image renders at a time, latest request wins.",
        parameters: { type: "OBJECT" as any, properties: { enemy: { type: "STRING" as any, description: "Enemy/forces described IN ENGLISH." }, location: { type: "STRING" as any, description: "Battlefield described IN ENGLISH." } }, required: ["enemy", "location"] }
    },
    {
        name: "trigger_visual",
        description: "Generate a 16:9 illustration for a key story beat, discovery, vista, or combat moment. One image renders at a time, latest request wins.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "2-3 concrete sentences IN ENGLISH (subject, environment, lighting, atmosphere, colors, mood). No negations." },
                phase: { type: "STRING" as any }
            },
            required: ["description"]
        }
    },
    {
        name: "set_music_mood",
        description: "Set background music from the pre-recorded score. Call it when the ATMOSPHERE changes (new area, fight starts/ends, a rest, a revelation), not every line. Tracks crossfade automatically. Pass ONLY a preset name — there is no free-form generation; if none fits perfectly, pick the closest. Guide: fights = combat / combat_boss / chase ; outcomes = victory / defeat / level_up ; places = town / tavern / shop / dungeon / wilderness / sacred / festival ; travel = travel (on the road) or exploration (looking around a place) ; feelings = tension / horror / mystery / dramatic / sorrow / rest ; casting a long ritual = ritual.",
        parameters: { type: "OBJECT" as any, properties: { mood: { type: "STRING" as any, description: "One of: exploration, quest, combat, combat_boss, victory, tension, rest, tavern, dungeon, town, dramatic, stealth, defeat, level_up, shop, travel, wilderness, horror, mystery, sacred, chase, ritual, sorrow, festival." } }, required: ["mood"] }
    },
    {
        name: "trigger_sfx",
        description: "Play a short DIEGETIC sound effect from the curated 600-sound bank (instant — the client picks the variant, no repeats). Pass a bank `key`. Families: combat/* (sword_swing, blade_slice, bow_shoot, shield_block, parry_metal, axe_chop…) · magic/* (fire, ice, lightning, heal_divine, dark_necro + per-element impacts: fire_impact, ice_impact, lightning_impact, force_impact, thunder_wave, psychic_pulse, necrotic_impact, earth_spike, wind_slash, water_blast) · monsters/<creature> — one voice PER creature: orc, troll, gnoll, kobold, goblin_chatter, zombie, ghoul, wight, banshee, lich, vampire, mummy, minotaur, harpy, werewolf, bear, wolf_howl, giant_rat, bat_swarm, basilisk, drake, mimic, demon_snarl, dragon_roar, dragon_breath, dragon_wing, elemental_fire/earth/air/water, beast_growl (generic fallback) · items/* (potion, coins, chest_open…) · dungeon/* (door, chains, mechanism_trap…) · impacts/* (punch, metal, crit_hit…) · footsteps/* (stone, wood, snow… + run_stone, run_dirt) · environment/* ambiences (tavern_quiet, tavern_rowdy, tavern_crowd, market_crowd, storm, blizzard, wind, rain, forest, night_crickets, cave, swamp, crypt, city_night, temple_hall, ship_deck, river, fire_crackle, battlefield_distant, thunder_distant) · dungeon/* also has stone_slab, chains, water_drip, torch_light. ALWAYS use the creature-specific monster key when one exists. If unsure, pick the CLOSEST key — a fuzzy resolver maps near-misses; there is no free-form generation.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                key: { type: "STRING" as any, description: "Bank key 'category/action' from the list above. Pick the closest match." }
            },
            required: ["key"]
        }
    },
    {
        name: "add_effect",
        description: "Add a temporary NUMERIC buff or debuff (AC / attackBonus / damageBonus / a stat) to the player — or, with `target`, to ANY combatant (ally or enemy). The engine actually applies it to their rolls; round-based effects tick down each turn.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                source: { type: "STRING" as any },
                duration: { type: "STRING" as any },
                stat: { type: "STRING" as any, description: "Stat affected, e.g., 'AC=+1', 'attackBonus=-2', 'damageBonus=+2'" },
                target: { type: "STRING" as any, description: "Optional combatant id/name (ally or enemy). Omit = the player." },
                rounds: { type: "INTEGER" as any, description: "Duration in rounds for combatant-targeted effects (default 10)." }
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
    private directorContext: string = '';
    private lastDirectorContextSent: string = '';
    private lastDirectorContextSentAt: number = 0;
    /** File du GATE DE SILENCE : textes en attente de la fin de la tirade du MJ. */
    private deferredQueue: Array<{ text: string; at: number; onSent?: () => void }> = [];
    /** Mesure de fenêtre (usageMetadata) : plancher, dernier relevé, échantillon. */
    private firstPromptTokenCount = 0;
    private lastPromptTokenCount = 0;
    private lastTracedTokenCount = 0;

    // Buffer for accumulating DM transcript across multiple server messages
    private dmTranscriptBuffer: string = '';
    // IJ1 (audit trame) — la transcription JOUEUR arrive en fragments de 1-6
    // mots ; les committer un par un remplissait la fenêtre de restauration
    // (14 places) avec les miettes d'UNE seule phrase. Bufferisé comme le MJ.
    private userTranscriptBuffer: string = '';

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

    // IJ7 (audit trame) — le handle de reprise est LIÉ à la sauvegarde et daté :
    // sans cela, charger un AUTRE slot du même héros reprenait la conversation
    // Live de la partie précédente (le MJ « se souvenait » d'événements que la
    // sauvegarde chargée n'a pas). Périmé après 30 min → session fraîche.
    private loadResumptionHandle(): string | null {
        try {
            const raw = localStorage.getItem(this.sessionResumptionStorageKey);
            if (!raw) return null;
            let parsed: { h?: string; s?: string | null; t?: number };
            try { parsed = JSON.parse(raw); } catch { return null; } // format hérité → fraîche
            const activeSaveId = useGameStore.getState().activeSaveId || null;
            const fresh = typeof parsed.t === 'number' && Date.now() - parsed.t < 30 * 60_000;
            const sameSave = (parsed.s || null) === activeSaveId;
            if (parsed.h && fresh && sameSave) return parsed.h;
            localStorage.removeItem(this.sessionResumptionStorageKey);
            return null;
        } catch {
            return null;
        }
    }

    private storeResumptionHandle(handle: string | null) {
        this.sessionResumptionHandle = handle;
        try {
            if (handle) {
                localStorage.setItem(this.sessionResumptionStorageKey, JSON.stringify({
                    h: handle,
                    s: useGameStore.getState().activeSaveId || null,
                    t: Date.now(),
                }));
            } else {
                localStorage.removeItem(this.sessionResumptionStorageKey);
            }
        } catch {
            // Resumption is an optimization. The app can still reconnect with restored history.
        }
    }

    async connect(): Promise<void> {
        log.info('🔌 Connecting to Gemini Live API...');

        if (!GEMINI_KEY) {
            throw new Error('Missing VITE_GEMINI_API_KEY. Add it to .env.local and rebuild before deploying.');
        }

        // Close gate BEFORE connecting so stale worklets from previous connections can't send
        this._sendGate = false;
        // IJ5 — jamais de résidu de transcription d'une session précédente qui
        // fuirait dans le premier turnComplete de la nouvelle.
        this.dmTranscriptBuffer = '';
        this.userTranscriptBuffer = '';

        // A FRESH session (no resumption handle) has no memory of the previous
        // connection's tool-call ids — replaying queued tool responses into it
        // errors the brand-new connection and could loop the reconnect. Only a
        // RESUMED session may flush held responses.
        if (!this.sessionResumptionHandle) this.pendingToolResponses = [];

        const systemPrompt = buildSystemPrompt({
            character: this.character,
            adventure: this.adventure,
            adventureManifest: this.adventureManifest,
            historyToRestore: this.initialHistory,
            language: this.language,
            characterName: this.character.name,
            directorContext: this.directorContext,
        });
        // Le contexte directeur vient d'être EMBARQUÉ dans le prompt : le marquer
        // « déjà envoyé » pour que le flush post-(re)connexion ne renvoie pas le
        // même bloc en double 4 s plus tard (dédup naturelle, sauf s'il change).
        if (this.directorContext.trim()) {
            this.lastDirectorContextSent = this.directorContext.trim();
            this.lastDirectorContextSentAt = Date.now();
        }

        auditBus.publish('gemini-system', `Live system prompt (${systemPrompt.length} chars, model ${AUDIO_MODEL})`, systemPrompt);
        auditBus.publish('engine', `Live connect — ${this.sessionResumptionHandle ? 'reprise par handle' : 'session FRAÎCHE'}, prompt ${systemPrompt.length} chars, ${this.initialHistory.length} répliques en mémoire`);

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
                                // Voix choisie dans les Réglages (défaut Charon) —
                                // appliquée à chaque (re)connexion.
                                voiceName: getAppSettings().dmVoice || 'Charon'
                            }
                        }
                    },
                    tools: [{ functionDeclarations: GAME_TOOL_DECLARATIONS as any }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    sessionResumption: {
                        handle: this.sessionResumptionHandle || undefined,
                    },
                    // COMPRESSION (revu le 2026-08-22). L'ancien réglage
                    // 60K→30K amputait la MOITIÉ du contexte à chaque passage,
                    // et 30K est de l'ordre du plancher fixe de la session
                    // (déclarations d'outils ~15K tokens + prompt système ~13K) :
                    // il ne restait presque rien de la conversation. La fenêtre
                    // du modèle est de 128K — on déclenche donc plus tard et on
                    // garde beaucoup plus. Coût : plus de tokens d'entrée par
                    // tour. usageMetadata (ci-dessous) mesure désormais l'effet
                    // réel dans le journal de session : à ajuster sur données,
                    // plus sur hypothèse.
                    contextWindowCompression: {
                        triggerTokens: '100000',
                        slidingWindow: { targetTokens: '70000' }
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
                        auditBus.publish('engine', `Live close — code=${e.code}${e.reason ? ` raison="${String(e.reason).slice(0, 120)}"` : ''}`);
                        // IJ5 — la dernière tirade avant une coupure ne doit pas
                        // disparaître de la trame : flush des buffers d'abord.
                        this.commitUserBuffer();
                        this.commitDmBuffer(true);
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
                // LM2 (contre-audit) — les flushes appelés dans onopen sont des
                // no-ops garantis (le SDK invoque onopen AVANT de résoudre
                // connect(), donc this.session est encore null). Après une
                // reconnexion avec handle de reprise, les réponses d'outils en
                // attente n'étaient JAMAIS renvoyées : le modèle restait
                // suspendu sur son function call et le MJ se taisait.
                this.flushToolResponseQueue();
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
    }

    /**
     * Push the pending director context to the DM as a private system note.
     * In pure-voice play the player never types, so consumePrivateContext (which
     * only piggybacks on TEXT messages) never fires and the DM's view of HP,
     * clocks, and canon facts silently drifts. GameSession calls this on
     * significant state changes; a min-interval guard keeps the cost bounded.
     */
    /**
     * DC2/DC3 — `force` bypasse le DÉDUP : renvoyer un contexte identique est
     * un RAPPEL (battement périodique, reprise après reconnexion), pas une
     * mise à jour.
     *
     * TR10 — il ne bypasse PLUS le throttle. Les appelants qui veulent un envoi
     * immédiat passent déjà `minIntervalMs = 0` (battement, post-reconnexion) ;
     * le ré-ancrage post-compression, lui, se donne un plancher, parce qu'il
     * partait jusqu'à quatre fois par minute et nourrissait la compression
     * qu'il était censé réparer.
     */
    public flushDirectorContext(minIntervalMs: number = 30000, force = false): boolean {
        const context = this.directorContext.trim();
        if (!context || !this.canSendRealtime()) return false;
        const now = Date.now();
        if (!force && context === this.lastDirectorContextSent) return false;
        if (now - this.lastDirectorContextSentAt < minIntervalMs) return false;

        // GATE DE SILENCE : jamais pendant une tirade. Le bloc part au silence.
        // Le marquage « envoyé » se fait à l'envoi RÉEL (callback), sinon un
        // contexte différé puis jeté serait compté comme délivré.
        const sent = this.sendOrDefer([
            '[PRIVATE_DM_CONTEXT - do not narrate, do not answer this block, do not roll from this block alone]',
            context,
            '[/PRIVATE_DM_CONTEXT]',
        ].join('\n'), () => {
            this.lastDirectorContextSent = context;
            this.lastDirectorContextSentAt = Date.now();
            // Journal de session : chaque envoi du bloc directeur est un
            // événement de pression sur la fenêtre — taille + mode consignés,
            // bloc COMPLET dans la trace disque (pas dans l'auditBus mémoire).
            auditBus.publish('engine', `Director context envoyé (${context.length} chars${force ? ', FORCÉ' : ''})`);
            sessionTrace.trace('director', `flush ${context.length} chars${force ? ' (forcé)' : ''}`, context);
        });
        return sent;
    }

    private consumePrivateContext(userText: string): string {
        const context = this.directorContext.trim();
        if (!context) return userText;
        const now = Date.now();
        const shouldAttach = context !== this.lastDirectorContextSent || now - this.lastDirectorContextSentAt > 30000;
        if (!shouldAttach) return userText;

        this.lastDirectorContextSent = context;
        this.lastDirectorContextSentAt = now;
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
        // GATE DE SILENCE : les notes système (auditeur de cohérence, rappels
        // PNJ, rapports moteur) attendent la fin de la tirade du MJ.
        return this.sendOrDefer(`[SYSTEM]: ${note}`);
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
            // IJ1 — l'UI est rafraîchie par fragment (temps réel), mais la
            // MÉMOIRE ne reçoit que la phrase complète, au flush du tour.
            if (content.inputTranscription?.text) {
                // [DIAG-COUPURE] Le serveur « entend » le joueur PENDANT que le MJ
                // parle : soit vraie interruption voulue, soit écho/bruit — le
                // texte transcrit ci-dessous tranche (mots du MJ = écho).
                if (this.playingNodes.length > 0) {
                    const diag = `[DIAG-COUPURE] ${diagStamp()} MICRO entendu pendant que le MJ parle (écho ?) : « ${content.inputTranscription.text.slice(0, 50)} »`;
                    log.info(diag);
                    auditBus.publish('gemini-in', diag);
                }
                this.onTranscriptUpdate('user', content.inputTranscription.text);
                this.userTranscriptBuffer = appendTranscriptChunk(this.userTranscriptBuffer, content.inputTranscription.text);
            }

            // --- Output transcription (DM speech) ---
            if (content.outputTranscription?.text) {
                this.dmTranscriptBuffer = appendTranscriptChunk(this.dmTranscriptBuffer, content.outputTranscription.text);
            }

            // --- Interruption handling ---
            if (content.interrupted) {
                const diag = `[DIAG-COUPURE] ${diagStamp()} INTERRUPTION serveur — ${this.playingNodes.length} segment(s) audio stoppé(s) — narration coupée : « …${this.dmTranscriptBuffer.slice(-60)} »`;
                log.info(diag);
                auditBus.publish('gemini-in', diag);
                this.handleInterruption();
            }

            // --- Turn complete: flush user THEN DM buffers (ordre chronologique) ---
            if (content.turnComplete) {
                log.info(`[DIAG-COUPURE] ${diagStamp()} fin de tour NORMALE (turnComplete)`);
                this.commitUserBuffer();
                this.commitDmBuffer();
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

        // ── MESURE DE LA FENÊTRE (2026-08-22) ────────────────────────────────
        // usageMetadata est fourni par le SDK à chaque réponse et n'était JAMAIS
        // lu. Il donne : le plancher réel de la session (outils + prompt système,
        // ~15K + ~13K tokens estimés mais jamais vérifiés), le vrai débit audio,
        // et surtout la DÉTECTION DE COMPRESSION — une chute franche du
        // promptTokenCount signifie que le serveur vient d'élaguer l'historique.
        // Sans ça, le client narre à l'aveugle sur une mémoire qu'il croit
        // intacte. Tout part au journal de session pour analyse après-coup.
        const usage: any = (msg as any).usageMetadata;
        if (usage && typeof usage.promptTokenCount === 'number') {
            const prompt = usage.promptTokenCount;
            const prev = this.lastPromptTokenCount;
            this.lastPromptTokenCount = prompt;
            if (this.firstPromptTokenCount === 0) {
                this.firstPromptTokenCount = prompt;
                sessionTrace.trace('tokens', `Plancher de session : ${prompt} tokens au 1er tour`, usage);
            }
            // ⚠️ GRANDEUR NON QUALIFIÉE (audit 2026-08-24, lot 5 — « mesurer,
            // pas régler »). Ce seuil s'appuyait sur l'idée que promptTokenCount
            // reflète l'occupation de la fenêtre. Les traces du 23/08 l'excluent :
            //
            //  · valeurs jusqu'à 512 465 sur une fenêtre annoncée de 128 000 —
            //    soit 4× ; ce ne peut pas être l'occupation courante ;
            //  · série non monotone dans les DEUX sens, avec un bond de +414 000
            //    en une minute, alors que l'audio ne produit que ~1 500 tok/min ;
            //  · l'hypothèse « accumulation sur les allers-retours d'outils » a
            //    été TESTÉE et réfutée : les deux plus gros pics surviennent sans
            //    aucun appel d'outil dans les 25 s précédentes ;
            //  · la somme des modalités vaut ~90-93 % du total, donc le détail
            //    lui-même est incomplet.
            //
            // Conséquence : cette chute de 25 % n'est PAS une compression prouvée,
            // et le réglage 100K/70K plus haut a été choisi sur cette lecture. On
            // ne touche à rien tant que la grandeur n'est pas établie — ce qui
            // demande la documentation du SDK ou une séance contrôlée d'un puis
            // deux tours. Le ré-ancrage déclenché ici reste inoffensif (même bloc
            // que le battement, plancher de 90 s), d'où le choix de le laisser.
            if (prev > 0 && prompt < prev * 0.75) {
                const line = `Chute du promptTokenCount : ${prev} → ${prompt} (−${prev - prompt}) — grandeur non qualifiée, voir lot 5`;
                log.warn(`📉 ${line}`);
                auditBus.publish('engine', line, usage);
                sessionTrace.trace('tokens', line, usage);
                campaignEventLog.append('CONNECTION_EVENT', line, { before: prev, after: prompt });
                // La mémoire vivante vient d'être amputée : re-poser l'état
                // complet dès que le MJ se taira (le gate s'en charge).
                //
                // TR10 (audit de séance du 2026-08-23) — mais PAS à chaque fois.
                // Séance mesurée : 78 compressions en 34 min (une toutes les
                // 26 s) et 29 ré-ancrages forcés, soit 349 Ko réinjectés — dont
                // 91 % identiques au bloc précédent. C'était une boucle : la
                // compression déclenchait un renvoi de 12 Ko, qui regonflait la
                // fenêtre, qui déclenchait la compression suivante. Le plancher
                // ci-dessous casse la boucle sans rien retirer au contenu :
                // l'état complet est toujours re-posé, simplement pas quatre
                // fois par minute.
                this.flushDirectorContext(REANCHOR_MIN_INTERVAL_MS, true);
            } else if (prompt - this.lastTracedTokenCount >= 5000) {
                // Échantillonnage : une ligne tous les +5K tokens, pas par tour.
                this.lastTracedTokenCount = prompt;
                sessionTrace.trace('tokens', `Contexte : ${prompt} tokens`, usage);
            }
        }

        if (msg.goAway) {
            const delay = this.delayBeforeGoAwayReconnect(msg.goAway.timeLeft);
            campaignEventLog.append('CONNECTION_EVENT', 'Gemini Live sent goAway; scheduling reconnect', {
                timeLeft: msg.goAway.timeLeft,
                delay,
            });
            log.warn(`Gemini Live goAway received. Reconnecting in ${delay}ms.`);
            sessionTrace.trace('connexion', `goAway reçu — reconnexion planifiée dans ${delay}ms`, { timeLeft: msg.goAway.timeLeft });
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
        // Un goAway est une passation PLANIFIÉE par Google, pas une panne : les
        // compteurs de fenêtre repartent de zéro sur la nouvelle session, sinon
        // la première mesure serait lue comme une compression géante.
        this.firstPromptTokenCount = 0;
        this.lastPromptTokenCount = 0;
        this.lastTracedTokenCount = 0;
        this.onConnectionChange(false);
        this.attemptReconnect();
    }

    /** Committe la phrase du joueur bufferisée (IJ1) — une seule entrée propre. */
    private commitUserBuffer() {
        const spoken = this.userTranscriptBuffer.trim();
        this.userTranscriptBuffer = '';
        if (!spoken) return;
        // Journal de session : les répliques VOCALES du joueur n'apparaissaient
        // nulle part dans l'audit (seules les tirades MJ y passaient).
        auditBus.publish('gemini-out', `PLAYER (voix) : ${spoken.slice(0, 90)}`, spoken);
        memoryManager.addMessage({ speaker: 'user', text: spoken });
        this.recordHistory('user', spoken);
    }

    /** Committe la narration MJ bufferisée. `interrupted` = coupée par le
     *  joueur : on l'enregistre QUAND MÊME (IJ5/MM2 — elle a été entendue ;
     *  la jeter créait des trous dans le transcript, la mémoire ET la
     *  sauvegarde), suffixée pour que le MJ sache qu'il a été coupé. */
    private commitDmBuffer(interrupted = false) {
        const spokenDm = this.dmTranscriptBuffer.trim();
        this.dmTranscriptBuffer = '';
        if (!spokenDm) return;
        const text = interrupted ? `${spokenDm} …` : spokenDm;
        auditBus.publish('gemini-in', `DM${interrupted ? ' (interrompu)' : ''}: ${text.slice(0, 90)}`, text);
        this.onTranscriptUpdate('dm', text);
        memoryManager.addMessage({ speaker: 'dm', text });
        this.recordHistory('dm', text);
    }

    private handleInterruption() {
        // Stop all currently playing audio nodes
        this.playingNodes.forEach(node => {
            try { node.stop(); } catch (e) { /* ignore */ }
        });
        this.playingNodes = [];
        this.nextStartTime = 0;
        // IJ5/MM2 — enregistrer la narration partielle AVANT de vider : le
        // joueur l'a entendue, elle fait partie de la trame.
        this.commitUserBuffer();
        this.commitDmBuffer(true);
        // Le MJ s'est tu (coupé par le joueur) : la file différée peut partir.
        this.flushDeferred();
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
                // Gate de silence : le dernier segment vient de finir → on peut
                // enfin livrer ce qui attendait sans risquer de couper le MJ.
                if (this.playingNodes.length === 0) this.flushDeferred();
            };
        } catch (e) {
            log.error("Failed to play audio delta:", e);
        }
    }

    private async handleToolCalls(calls: any[]) {
        // request_roll (and cast_spell with a roll) BLOCKS until the player
        // actually rolls — its tool response carries the real outcome, which is
        // what mechanically stops the Live model from narrating a result it
        // does not have. Process roll calls LAST and send every response as
        // soon as it is ready, so music/image/journal responses are never held
        // hostage by the dice.
        const ordered = [...calls].sort((a, b) =>
            Number(a?.name === 'request_roll' || a?.name === 'cast_spell')
            - Number(b?.name === 'request_roll' || b?.name === 'cast_spell'));

        for (const call of ordered) {
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

            // Send each response the moment it is ready (a held roll response
            // must not delay the other tools' responses in the same batch).
            this.queueToolResponses([{ id, name, response: result }]);
        }
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

    /** Le MJ a-t-il de l'audio EN COURS DE LECTURE ?
     *  ⚠️ `turnComplete` ne veut PAS dire silence : playAudio programme les
     *  segments dans le futur via nextStartTime, donc la génération est finie
     *  bien avant que le joueur ait fini d'entendre. Seul playingNodes fait foi. */
    private isSpeaking(): boolean {
        return this.playingNodes.length > 0;
    }

    /**
     * GATE DE SILENCE (2026-08-22) — envoie le texte MAINTENANT si le MJ se
     * tait, sinon le DIFFÈRE jusqu'à la fin de sa tirade.
     *
     * Pourquoi : toute injection de texte pendant que le MJ parle peut être
     * interprétée par Gemini Live comme une prise de parole du joueur → barge-in
     * → narration coupée net. Le battement de contexte (toutes les 4 min), la
     * note de l'auditeur de cohérence et les rappels PNJ tiraient à l'aveugle.
     * C'est la cause n°1 suspectée des coupures signalées par le joueur.
     *
     * File DÉDIÉE : outboundTextQueue ne convient pas (elle périme à 60 s et
     * jette tout bloc [PRIVATE_DM_CONTEXT — IJ4), elle sert aux reconnexions.
     */
    private sendOrDefer(text: string, onSent?: () => void): boolean {
        if (!this.canSendRealtime()) return false;
        if (!this.isSpeaking()) {
            const ok = this.sendRealtimeTextNow(text);
            if (ok) onSent?.();
            return ok;
        }
        this.deferredQueue.push({ text, at: Date.now(), onSent });
        // Borne dure : en cas de tirade interminable, on garde les plus RÉCENTS
        // (un contexte périmé n'a aucune valeur).
        if (this.deferredQueue.length > MAX_DEFERRED) this.deferredQueue.shift();
        auditBus.publish('engine', `Envoi différé (MJ parle) : ${text.slice(0, 60)}`);
        return true; // accepté — partira au silence
    }

    /** Vide la file différée dès que le MJ se tait. */
    private flushDeferred(): void {
        if (!this.deferredQueue.length || this.isSpeaking() || !this.canSendRealtime()) return;
        const pending = this.deferredQueue.splice(0, this.deferredQueue.length);
        for (const item of pending) {
            if (this.sendRealtimeTextNow(item.text)) item.onSent?.();
        }
    }

    private sendRealtimeTextNow(text: string): boolean {
        if (!this.session || !this.canSendRealtime()) return false;
        // [DIAG-COUPURE] Toute injection de texte passe ici — noter si elle part
        // pendant que le MJ a de l'audio en cours (candidate à le couper).
        const diagSpeaking = this.playingNodes.length > 0;
        const diag = `[DIAG-COUPURE] ${diagStamp()} ENVOI texte — MJ ${diagSpeaking ? `PARLE (${this.playingNodes.length} segment(s)) ⚠️` : 'silencieux'} — ${text.slice(0, 70)}`;
        log.info(diag);
        auditBus.publish('gemini-out', diag, text);
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

        // IJ4/LM17 — péremption : après une longue coupure, rejouer de vieux
        // [SYSTEM]/contextes faisait « reculer » le MJ (le prompt reconstruit
        // décrit déjà l'état À JOUR). On jette ce qui a plus de 60 s et tout
        // bloc [PRIVATE_DM_CONTEXT (le contexte frais repart par son canal).
        const now = Date.now();
        const queued = [...this.outboundTextQueue].filter(item =>
            now - (item.createdAt || 0) <= 60_000
            && !item.text.startsWith('[PRIVATE_DM_CONTEXT'));
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
        // TYPED player messages must reach long-term memory too. Voice input is
        // recorded via inputTranscription, but typed text never came back
        // through that channel — so the 60K summaries and the reconnect history
        // were DM-narration-only for keyboard players (their promises and
        // decisions vanished from "the story so far"). Engine/control payloads
        // (lines starting with '[' — [SYSTEM], [ROLL_RESULT:, [PRIVATE_DM_CONTEXT)
        // stay out of memory: they are mechanics, not story.
        const spoken = String(text || '').trim();
        if (spoken && !spoken.startsWith('[')) {
            this.recordHistory('user', spoken);
            memoryManager.addMessage({ speaker: 'user', text: spoken });
        }
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
            // LM1 (contre-audit) — consommer le timestamp APRÈS la décision :
            // _lastConnectTime n'est réécrit qu'à onopen, donc chaque échec
            // suivant re-mesurait la MÊME vieille session « stable » et remettait
            // le compteur à 0 — boucle infinie à 2 s, onReconnectFailed (et la
            // sauvegarde d'urgence qui y est câblée) ne partait jamais.
            this._lastConnectTime = 0;
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
        // LM5 (contre-audit) — annuler un backoff en vol AVANT tout : le timer
        // d'attemptReconnect (fenêtre 2-10 s, précisément quand le joueur clique
        // « Reconnecter ») rappelait connect() en plus de celui-ci → DEUX
        // sessions Live concurrentes, deux voix. disconnect() le faisait déjà.
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
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
