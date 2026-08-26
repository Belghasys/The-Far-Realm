/** Les schemas des outils que le MJ peut appeler — ce que Gemini Live recoit a la connexion. Donnees pures. */
export const GAME_TOOL_DECLARATIONS = [
    {
        name: "lookup_creature",
        description: "The FULL sheet of a bestiary creature: stats, the attacks the engine will play (with on-hit saves), breath weapons and their recharge, frightful presence, legendary actions, spellcasting, traits, resistances. Call it BEFORE a fight to describe the foe truthfully — the engine plays all of it on the creature's turns.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Creature name (English or French)" } }, required: ["name"] }
    },
    {
        name: "lookup_weapon",
        description: "A weapon from the SRD table as the engine equips it: damage dice and type, properties (finesse, heavy, two-handed, reach, thrown…), range.",
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
        description: "Add a BESTIARY creature to the combat initiative tracker. The engine reads HP, AC, DEX, portrait and attacks from the creature's sheet. The name MUST resolve to one of the 401 bestiary creatures (a flavour epithet is fine: 'Gobelin borgne' resolves to Goblin); an unknown name is REFUSED and the answer lists the closest matches — re-call with one of them, or use search_codex / build_encounter. Never invent a creature, never pass HP/AC/XP. SIZE THE FIGHT TO THE HERO'S LEVEL: the engine enforces an SRD XP budget and REJECTS spawns past the deadly threshold (+25%) — the error tells you the remaining headroom. At level 1-2, one or two weak creatures IS a real fight.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "A bestiary creature (English or French, epithet allowed), OR a family/kind the engine will size to the party: 'un dragon rouge', 'un mort-vivant', 'un thug', 'une guenaude'. The answer tells you which creature was chosen (chosen, reason, threat)." },
                difficulty: { type: "STRING" as any, description: "easy | medium | hard | deadly — how dangerous this foe should be for the party when the engine picks a specimen for a family/kind. Default: hard." },
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
                name: { type: "STRING" as any, description: "The ally's own name (e.g. 'Garde Tomas', 'Maëlle')." },
                template: { type: "STRING" as any, description: "Bestiary creature whose stats they use — REQUIRED unless the name itself is a bestiary creature: commoner, guard, acolyte, veteran, knight, mage, wolf… The engine refuses unknown templates and lists the closest names. Never invent HP/AC/attacks." }
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
                name: { type: "STRING" as any, description: "The NPC's own name (e.g. 'Maëlle')." },
                template: { type: "STRING" as any, description: "Bestiary creature whose stats they use — REQUIRED unless the name itself is a bestiary creature: commoner, guard, acolyte, veteran, knight, mage, scout, priest, wolf… The engine refuses unknown templates and lists the closest names. Never invent HP/AC/attacks." },
                description: { type: "STRING" as any, description: "One line: who they are." }
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
