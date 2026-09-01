/** Les schemas des outils que le MJ peut appeler — ce que Gemini Live recoit a la connexion. Donnees pures. */
export const GAME_TOOL_DECLARATIONS = [
    {
        name: "lookup_creature",
        description: "A creature's full sheet: stats, the attacks the engine plays (with on-hit saves), breath weapons and recharge, presence, legendary actions, spellcasting, traits, resistances.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_weapon",
        description: "An SRD weapon as the engine equips it: dice, type, properties, range.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_campaign",
        description: "Search the authored campaign manifest and the campaign's whole memory (scenes, NPCs, locations, lore, rewards, encounters, merchants, the villain, every canon fact and secret ever recorded) — the live context only shows a window of it.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                query: { type: "STRING" as any, description: "A name, place, keyword or theme, e.g. 'Ysolde', 'Cairn de Givre'." },
                kind: { type: "STRING" as any, description: "npc | scene | location | lore | reward | chapter | encounter | merchant | choice | memory (facts, secrets, NPC memories) | villain (its secret only with this kind)" }
            },
            required: ["query"]
        }
    },
    {
        name: "search_codex",
        description: "Free-text search of the SRD codex to find an exact name before a lookup.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "all | spell | monster | item | rule | condition" },
                query: { type: "STRING" as any },
                limit: { type: "INTEGER" as any, description: "default 10" }
            },
            required: ["query"]
        }
    },
    {
        name: "lookup_spell",
        description: "A structured SRD spell.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "cast_spell",
        description: "Cast a real spell through the engine: slots, concentration, healing, saves and attack rolls.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                spellName: { type: "STRING" as any },
                slotLevel: { type: "INTEGER" as any },
                target: { type: "STRING" as any, description: "Combatant id/name; 'all_enemies' for an area spell (each rolls its own save); 'all_combatants' when the blast also covers allies." },
                casterAbility: { type: "STRING" as any },
                targetAC: { type: "INTEGER" as any },
                targetSaveBonus: { type: "INTEGER" as any },
                ritual: { type: "BOOLEAN" as any, description: "Ritual (Bard/Cleric/Druid/Wizard): out of combat, 10 min, no slot spent." }
            },
            required: ["spellName"]
        }
    },
    {
        name: "lookup_rule",
        description: "A structured SRD rule.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Rule name or topic" } }, required: ["name"] }
    },
    {
        name: "lookup_item",
        description: "A structured SRD item (or an inventory item's mechanics).",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_condition",
        description: "A structured SRD condition and its effects.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_monster",
        description: "Same full sheet as lookup_creature, plus the codex view (portrait, link).",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "build_encounter",
        description: "Build a correctly budgeted fight from the bestiary (SRD XP thresholds; party size is computed by the engine).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                partyLevel: { type: "INTEGER" as any },
                difficulty: { type: "STRING" as any, description: "easy | medium | hard | deadly" },
                biome: { type: "STRING" as any },
                role: { type: "STRING" as any, description: "brute | skirmisher | artillery | controller | minion | solo" },
                theme: { type: "STRING" as any },
                maxMonsters: { type: "INTEGER" as any },
                startNow: { type: "BOOLEAN" as any, description: "Push the monsters into initiative now." }
            },
            required: ["difficulty"]
        }
    },
    {
        name: "request_branch_plan",
        description: "Ask the text-only branch writer for a side-branch plan after a major detour.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any, description: "Why the campaign path no longer fits." },
                playerIntent: { type: "STRING" as any },
                severity: { type: "STRING" as any, description: "minor_detour | major_detour | campaign_rupture" },
                currentChapter: { type: "STRING" as any },
                currentObjective: { type: "STRING" as any },
                targetReconnect: { type: "STRING" as any, description: "Thread, clue, NPC or chapter to reconnect toward." }
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
        description: "Move the campaign to a chapter/scene; earlier chapters are marked completed. Ids are fuzzy-matched, an unknown id returns the valid list.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                chapterId: { type: "STRING" as any, description: "Id, exact title or number." },
                sceneId: { type: "STRING" as any },
                region: { type: "STRING" as any, description: "World/plane, when it changes." }
            },
            required: ["chapterId"]
        }
    },
    {
        name: "update_campaign_runtime",
        description: "Record a durable campaign fact: objective, canon fact, protected secret, branch status, world clock.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                currentObjective: { type: "STRING" as any, description: "Short objective for the campaign board." },
                canonFact: { type: "STRING" as any, description: "A fact now true in the campaign." },
                canonFacts: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Several facts at once." },
                protectedSecret: { type: "STRING" as any, description: "Director-only secret, hidden from the player." },
                protectedSecrets: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Several secrets at once." },
                branchStatus: { type: "STRING" as any, description: "active | resolved | abandoned | merged_into_main" },
                worldClockName: { type: "STRING" as any, description: "Clock to create or update." },
                worldClockDescription: { type: "STRING" as any, description: "The pressure or countdown." },
                worldClockStage: { type: "INTEGER" as any },
                worldClockMaxStage: { type: "INTEGER" as any },
                worldClockStatus: { type: "STRING" as any, description: "active | paused | resolved" }
            }
        }
    },
    {
        name: "request_roll",
        description: "Ask the player for a d20 check, skill check or saving throw. Pass skill OR ability (+isSave) and the DC — never a bonus: the engine adds the sheet's modifier, proficiency and expertise. The response is held until the player rolls and carries the real outcome.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any, description: "e.g. 'Stealth check', 'Wisdom saving throw'" },
                formula: { type: "STRING" as any, description: "Usually '1d20'; the engine fills the modifier." },
                dc: { type: "INTEGER" as any, description: "DC to beat, 0 if none." },
                skill: { type: "STRING" as any, description: "Skill (English or French): Stealth/Discrétion, Perception, Athletics…" },
                ability: { type: "STRING" as any, description: "STR/DEX/CON/INT/WIS/CHA for a raw check or a save." },
                isSave: { type: "BOOLEAN" as any, description: "true for a saving throw." },
                advantage: { type: "STRING" as any, description: "REQUIRED. Judge the idea, not the sheet: 'ADV' if clever, well roleplayed or using the scene, else 'NONE'." },
                bonus: { type: "INTEGER" as any, description: "Only for a roll the sheet cannot compute." },
                force: { type: "BOOLEAN" as any, description: "true only when a NEW risky player action follows a branch plan (rolls right after a plan are otherwise rejected)." }
            },
            required: ["reason", "dc", "advantage"]
        }
    },
    {
        name: "add_inventory_item",
        description: "Add an item to the inventory: an exact catalog name auto-fills real stats; a custom item (quest object, crafted piece, unique weapon or armor) takes effect, properties, dice…",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                quantity: { type: "INTEGER" as any },
                type: { type: "STRING" as any, description: "weapon | armor | consumable | misc | ammo | container" },
                effect: { type: "STRING" as any, description: "e.g. '+2 CON', '+1d6 fire', '+10 speed', '+1 AC'" },
                properties: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "e.g. finesse, light, two-handed; a bow/crossbow/sling MUST include 'ammunition'." },
                range: { type: "STRING" as any, description: "Feet for ranged/thrown, e.g. '150/600' (required for a bow)." },
                damageDice: { type: "STRING" as any, description: "e.g. '1d8'" },
                damageType: { type: "STRING" as any, description: "e.g. slashing, fire" },
                acBonus: { type: "INTEGER" as any, description: "Magic AC bonus." },
                baseAC: { type: "INTEGER" as any },
                armorType: { type: "STRING" as any, description: "light | medium | heavy | shield" },
                description: { type: "STRING" as any }
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
        description: "Credit (or debit, negative) the hero's gold purse.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                amount: { type: "NUMBER" as any, description: "Gold pieces; 1 silver = 0.1, 1 copper = 0.01." },
                reason: { type: "STRING" as any }
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
        description: "Put a bestiary creature into the initiative. An unknown name or an over-budget spawn is refused with the closest matches or the headroom; the answer names the creature chosen (chosen, reason, threat).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "A bestiary creature (English or French, epithet allowed) or a family/kind the engine sizes to the party: 'un dragon rouge', 'un mort-vivant', 'un thug'." },
                difficulty: { type: "STRING" as any, description: "easy | medium | hard | deadly (default hard) — used when the engine picks a specimen." },
                range: { type: "STRING" as any, description: "Starting band: melee | near (default) | far" },
                force: { type: "BOOLEAN" as any, description: "Only after an over-budget refusal AND when the campaign scripts this fight as a deadly set-piece." }
            },
            required: ["name"]
        }
    },
    {
        name: "add_ally_init",
        description: "Put an ally (rescued NPC, summon) into the initiative for this fight; the engine plays its turns. Stats come from a bestiary template; an unknown template is refused with the closest names.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "The ally's own name, e.g. 'Garde Tomas'." },
                template: { type: "STRING" as any, description: "Bestiary creature for the stats: commoner, guard, acolyte, veteran, knight, mage, wolf…" }
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
        description: "Impose an SRD condition on a combatant; it really changes their rolls (prone: melee attackers have advantage) and incapacitating ones skip their turns.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                condition: { type: "STRING" as any, description: "An SRD condition: prone, poisoned, frightened, grappled, restrained, blinded, stunned, paralyzed…" },
                target: { type: "STRING" as any, description: "Combatant name or id; omit or 'player' for the hero." },
                concentrationBy: { type: "STRING" as any, description: "The enemy caster concentrating on it (e.g. its Hold Person): damaging them forces a CON save that can end the effect." }
            },
            required: ["condition"]
        }
    },
    {
        name: "open_shop",
        description: "Open a real buy/sell panel stocked by merchant type and level at SRD prices (blacksmith: weapons/armor, +1 gear from level 10; apothecary; general; enchanter). The engine handles every sale.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                merchantName: { type: "STRING" as any, description: "e.g. 'Borin Marteau-de-Fer'" },
                merchantType: { type: "STRING" as any, description: "blacksmith | apothecary | general | enchanter (or forgeron, apothicaire, bazar, enchanteur)" },
                priceModifier: { type: "NUMBER" as any, description: "1 normal, 1.5 greedy, 0.8 friendly" },
                greeting: { type: "STRING" as any, description: "One line of merchant flavor." },
                extraItems: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "Signature stock: exact catalog names, e.g. 'Longsword +1'." }
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
        description: "Lift a condition or named effect when the fiction cures it, in or out of combat.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                condition: { type: "STRING" as any, description: "e.g. 'poisoned', 'Hold Person'" },
                target: { type: "STRING" as any, description: "Combatant name or id; omit or 'player' for the hero." }
            },
            required: ["condition"]
        }
    },
    {
        name: "update_enemy_hp",
        description: "Set an enemy's HP directly (a scripted wound or healing). 0 means down or dead — a fleeing or surrendering enemy is enemy_leaves_combat instead.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, hp: { type: "INTEGER" as any } }, required: ["name", "hp"] }
    },
    {
        name: "enemy_leaves_combat",
        description: "A living enemy leaves the fight without dying (surrenders, retreats, is called off): it keeps its HP, may return later, and still counts for victory and XP. Never update_enemy_hp(0) for this.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                target: { type: "STRING" as any, description: "Enemy name or combatant id." },
                reason: { type: "STRING" as any, description: "surrendered | fled" }
            },
            required: ["target", "reason"]
        }
    },
    {
        name: "set_enemy_target",
        description: "Make an enemy focus a chosen hero on its turns (the mage targets the healer); a standing preference — if that hero falls, the enemy goes back to the most wounded. By default enemies attack the most wounded hero.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                enemy: { type: "STRING" as any, description: "Enemy name or combatant id." },
                target: { type: "STRING" as any, description: "The player's or an ally's name/id." }
            },
            required: ["enemy", "target"]
        }
    },
    {
        name: "resolve_attack",
        description: "Resolve one attack roll and its damage for something the WORLD does (a trap, an ambush out of turn) — never a player spell, never an enemy during a tracked combat. A result may carry moraleCheck (a wounded enemy fled, alive) or encounterOutcome 'victory' (the engine ended the fight and awarded XP).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                attacker: { type: "STRING" as any },
                target: { type: "STRING" as any },
                attackName: { type: "STRING" as any, description: "Bestiary attack name from lookup_creature (Scimitar, Bite…)." },
                attackBonus: { type: "INTEGER" as any },
                damageFormula: { type: "STRING" as any },
                damageType: { type: "STRING" as any },
                advantage: { type: "STRING" as any, description: "normal | advantage | disadvantage" },
                targetCoverBonus: { type: "INTEGER" as any, description: "0, 2 or 5 when the fiction clearly gives cover." },
                isMeleeAttack: { type: "BOOLEAN" as any }
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
        description: "Author an action CARD for an improvised player stunt: it pops up with its cost, the player clicks, the engine rolls, you narrate the report. Modes — attack: d20 to hit ONE target then damage (chandelier: label 'Tirer sur le chandelier', cost action, attackBonus 5, damageFormula 2d6, damageType bludgeoning, target 'Goblin A'); save: the target(s) roll saveAbility vs dc, damage and/or condition on a fail, target 'all_enemies' for an area (oil set alight); check: the PLAYER rolls checkAbility vs dc, then damage/condition (toppling a statue); auto: no roll, rule of cool (drawing a sword: cost free); effect: a buff with no damage (rallying speech: cost bonus_action, modifierBonus 2, modifierScope attack, modifierUses 1) — or a debuff ON the target (sand in the eyes: save DEX dc 12, targetEffectStat attackBonus, targetEffectBonus -2, targetEffectRounds 2). Never for a real spellbook spell (cast_spell). One call per stunt.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                label: { type: "STRING" as any, description: "Short card name, e.g. 'Tirer sur le chandelier'." },
                cost: { type: "STRING" as any, description: "action | bonus_action | free | reaction" },
                resolution: { type: "STRING" as any, description: "attack | save | check | auto | effect" },
                target: { type: "STRING" as any, description: "Combatant id/name, 'all_enemies', or a comma-separated list. Omit for self." },
                attackBonus: { type: "INTEGER" as any, description: "attack: to-hit bonus you adjudicate." },
                dc: { type: "INTEGER" as any, description: "save: the target's DC · check: the player's DC." },
                advantage: { type: "STRING" as any, description: "normal | advantage | disadvantage" },
                saveAbility: { type: "STRING" as any, description: "save: STR/DEX/CON/INT/WIS/CHA" },
                checkAbility: { type: "STRING" as any, description: "check: STR/DEX/CON/INT/WIS/CHA" },
                damageFormula: { type: "STRING" as any, description: "e.g. '2d6', '1d8+2'" },
                damageType: { type: "STRING" as any, description: "e.g. 'bludgeoning', 'fire'" },
                condition: { type: "STRING" as any, description: "SRD condition applied to the target on success." },
                modifierMode: { type: "STRING" as any, description: "effect: advantage | disadvantage | normal" },
                modifierBonus: { type: "INTEGER" as any, description: "effect: flat bonus to the player, e.g. 2" },
                modifierScope: { type: "STRING" as any, description: "effect: attack | check | save | all" },
                modifierUses: { type: "INTEGER" as any, description: "effect: how many next rolls (usually 1)" },
                targetEffectStat: { type: "STRING" as any, description: "Debuff/buff ON the target on success: attackBonus | AC | damageBonus | speed" },
                targetEffectBonus: { type: "INTEGER" as any, description: "Amount, e.g. -2" },
                targetEffectRounds: { type: "INTEGER" as any, description: "Rounds (default 2)" },
                description: { type: "STRING" as any, description: "One-line flavor under the title." }
            },
            required: ["label", "cost", "resolution"]
        }
    },
    {
        name: "grant_player_action",
        description: "Grant extra action pips for THIS turn only (Action Surge, Haste, a heroic surge). Sparingly.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "action (main attack pip) | bonus (bonus-action pip)" },
                count: { type: "INTEGER" as any, description: "default 1" },
                reason: { type: "STRING" as any, description: "e.g. 'Action Surge'" }
            },
            required: ["kind"]
        }
    },
    {
        name: "apply_damage",
        description: "Apply a FIXED amount of damage you already know to a combatant (prefer environmental_damage when there are dice or a save). Never for damage the engine already resolved. A result may carry moraleCheck (fled, alive) or encounterOutcome 'victory'.",
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
        description: "The WORLD hurts a creature outside any attack (fire, icy water, poison, a fall, lava, lightning, a cave-in), in or out of combat: dice, an optional save first, the HP loss, a condition on a failed save.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "Hazard label shown to the player, e.g. 'eau glacée'." },
                damageFormula: { type: "STRING" as any, description: "e.g. '2d6'" },
                damageType: { type: "STRING" as any, description: "fire, cold, poison, acid, lightning, bludgeoning (falls), necrotic…" },
                target: { type: "STRING" as any, description: "Combatant id/name, or 'player' (default)." },
                targets: { type: "STRING" as any, description: "'all_enemies', 'all_combatants' (allies too) or a list; each rolls its own save." },
                attackBonus: { type: "INTEGER" as any, description: "Attack mode instead of a save (dart trap): 1d20+bonus vs AC." },
                saveAbility: { type: "STRING" as any, description: "STR/DEX/CON/INT/WIS/CHA — DEX vs flames and debris, CON vs poison and cold." },
                saveDC: { type: "INTEGER" as any, description: "10 easy, 12-13 standard, 15+ harsh" },
                halfOnSave: { type: "BOOLEAN" as any, description: "true (default) halves on success; false negates." },
                condition: { type: "STRING" as any, description: "SRD condition on a failed save: poisoned, prone, restrained, blinded…" }
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
        description: "Add a quest to the journal, with an optional checklist of steps. A title already completed is rejected (that story is settled) unless recurring:true marks a genuinely new instance of a recurring contract.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any }, description: { type: "STRING" as any }, steps: { type: "ARRAY" as any, items: { type: "STRING" as any }, description: "2-4 short sub-objectives." }, recurring: { type: "BOOLEAN" as any, description: "New instance of a completed recurring contract (another caravan to escort)." } }, required: ["title", "description"] }
    },
    {
        name: "update_quest_step",
        description: "Check off (or add) a step of an active quest.",
        parameters: { type: "OBJECT" as any, properties: { questTitle: { type: "STRING" as any, description: "Fuzzy-matched." }, step: { type: "STRING" as any, description: "Fuzzy-matched; added if new." }, done: { type: "BOOLEAN" as any } }, required: ["questTitle", "step"] }
    },
    {
        name: "complete_quest",
        description: "Mark a quest completed. Exact journal title; an ambiguous title is rejected and the active titles are listed.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any } }, required: ["title"] }
    },
    {
        name: "recruit_companion",
        description: "An NPC durably joins the party (max 2): auto-joins every fight, HP persists, rests heal. Stats come from a bestiary template; an unknown template is refused with the closest names.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "The NPC's own name, e.g. 'Maëlle'." },
                template: { type: "STRING" as any, description: "Bestiary creature for the stats: commoner, guard, acolyte, veteran, knight, mage, wolf…" },
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
        description: "The hero acquires a mount, and is mounted up. It fights as an ally; in the saddle a melee attack on a far foe becomes a charge, and a flying one blunts ground melee.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any, description: "Given name, e.g. 'Tempête'." },
                kind: { type: "STRING" as any, description: "poney | cheval_selle | destrier | chameau | elan | loup_geant | sanglier_geant | griffon | pegase (both flying) | destrier_celeste (paladin 5+; returns after a long rest if slain). Sets speed and flight." },
                replace: { type: "BOOLEAN" as any, description: "Required to swap an EXISTING mount; without it the call is refused." },
                speed: { type: "INTEGER" as any, description: "Override in feet (usually omit)." },
                hp: { type: "INTEGER" as any, description: "Override for a custom mount (usually omit)." },
                description: { type: "STRING" as any, description: "Short flavor." }
            }
        }
    },
    {
        name: "set_mounted",
        description: "The hero mounts up (true) or dismounts (false) — buildings, stealth, taverns, boats mean on foot.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                mounted: { type: "BOOLEAN" as any }
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
        description: "Beast Master ranger only: bond or change the animal companion; it joins every fight with real stats.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "loup (balanced) | ours (hits hard) | panthere (fast) | faucon (skirmisher)" }
            },
            required: ["kind"]
        }
    },
    {
        name: "set_familiar",
        description: "Bond a familiar to a caster (Find Familiar, Pact of the Chain, a druid's spirit): a scout, plus a 'Familiar: Help' button (advantage on the next attack, 1/short rest).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                kind: { type: "STRING" as any, description: "chat | hibou | corbeau | rat | araignee | belette | serpent | crapaud | chauve_souris | renard" },
                name: { type: "STRING" as any },
                description: { type: "STRING" as any }
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
        description: "Move the world clock when the fiction moves time outside rests.",
        parameters: { type: "OBJECT" as any, properties: { timeOfDay: { type: "STRING" as any, description: "dawn | day | dusk | night" }, advanceDays: { type: "INTEGER" as any, description: "Full days that pass." } }, required: ["timeOfDay"] }
    },
    {
        name: "add_npc",
        description: "Log a newly met NPC in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any }, location: { type: "STRING" as any } }, required: ["name", "description", "location"] }
    },
    {
        name: "update_npc",
        description: "Update a known NPC's memory of the hero: dispositionDelta -2..+2, memory = one sentence they will carry, location if they moved.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, dispositionDelta: { type: "NUMBER" as any }, memory: { type: "STRING" as any }, location: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["name"] }
    },
    {
        name: "lookup_npc",
        description: "Recall a known NPC's journal record (disposition, memories, last location) and authored entry before voicing them.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any, description: "Partial spelling tolerated." } }, required: ["name"] }
    },
    {
        name: "roll_loot",
        description: "Roll 1-3 level-appropriate SRD magic items into the inventory (a hoard, a notable kill); rarityHint forces one item of that rarity for a milestone.",
        parameters: { type: "OBJECT" as any, properties: { context: { type: "STRING" as any }, rarityHint: { type: "STRING" as any, description: "common | uncommon | rare | very rare | legendary" } }, required: [] }
    },
    {
        name: "add_location",
        description: "Log a newly discovered location in the journal.",
        parameters: { type: "OBJECT" as any, properties: { name: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["name", "description"] }
    },
    {
        name: "add_story_moment",
        description: "Chronicle a major turning point (revelation, betrayal, pact, landmark, boss, death) — not routine fights or loot. Duplicates are dropped; use a distinctive title.",
        parameters: { type: "OBJECT" as any, properties: { title: { type: "STRING" as any }, description: { type: "STRING" as any } }, required: ["title", "description"] }
    },
    {
        name: "grant_xp",
        description: "Grant Experience Points outside of combat.",
        parameters: { type: "OBJECT" as any, properties: { amount: { type: "INTEGER" as any }, reason: { type: "STRING" as any } }, required: ["amount", "reason"] }
    },
    {
        name: "grant_story_modifier",
        description: "A temporary boon or penalty on the next roll(s): a blessing, a consequence.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                source: { type: "STRING" as any, description: "dm_inspiration | blessing | complication | tactic | consequence" },
                mode: { type: "STRING" as any, description: "normal | advantage | disadvantage" },
                bonus: { type: "INTEGER" as any, description: "-5..+5" },
                uses: { type: "INTEGER" as any, description: "1-3" },
                scope: { type: "STRING" as any, description: "any | check | save | attack | death_save" },
                reason: { type: "STRING" as any }
            },
            required: ["name", "source", "mode", "reason"]
        }
    },
    {
        name: "grant_inspiration",
        description: "Bank ONE Inspiration the player spends to auto-succeed a roll. ONLY on a quest resolution or dialogue beat, for the acting: never tied to a roll.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                reason: { type: "STRING" as any, description: "What you reward." }
            },
            required: ["reason"]
        }
    },
    {
        name: "apply_complication",
        description: "A one-use complication (disadvantage or a small penalty) when the world pushes back on a risky choice. Never to railroad.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                reason: { type: "STRING" as any },
                scope: { type: "STRING" as any, description: "any | check | save | attack | death_save" },
                mode: { type: "STRING" as any, description: "normal | disadvantage" },
                bonus: { type: "INTEGER" as any }
            },
            required: ["name", "reason"]
        }
    },
    {
        name: "trigger_scene_image",
        description: "A 16:9 illustration of a new place or setting. One renders at a time, the latest request wins.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "2-3 concrete sentences IN ENGLISH: subject, environment, light, atmosphere, colors, mood. No negations." },
                phase: { type: "STRING" as any, description: "exploration | quest | dungeon | town | tavern | dramatic | stealth | rest" }
            },
            required: ["description"]
        }
    },
    {
        name: "trigger_combat_image",
        description: "A 16:9 illustration when a fight starts or a major foe enters.",
        parameters: { type: "OBJECT" as any, properties: { enemy: { type: "STRING" as any, description: "IN ENGLISH" }, location: { type: "STRING" as any, description: "IN ENGLISH" } }, required: ["enemy", "location"] }
    },
    {
        name: "trigger_visual",
        description: "A 16:9 illustration of a key beat, discovery, vista or close-up.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                description: { type: "STRING" as any, description: "2-3 concrete sentences IN ENGLISH. No negations." },
                phase: { type: "STRING" as any }
            },
            required: ["description"]
        }
    },
    {
        name: "set_music_mood",
        description: "Set the background music from the pre-recorded score (tracks crossfade; a mood is a preset, never free text). Fights: combat, combat_boss, chase · outcomes: victory, defeat, level_up · places: town, tavern, shop, dungeon, wilderness, sacred, festival · journey: travel, exploration, quest · feelings: tension, horror, mystery, dramatic, sorrow, rest, stealth, ritual.",
        parameters: { type: "OBJECT" as any, properties: { mood: { type: "STRING" as any, description: "One of the 24 presets above." } }, required: ["mood"] }
    },
    {
        name: "trigger_sfx",
        description: "Play a short diegetic sound from the 600-sound bank (no free-form generation; a fuzzy resolver maps near-misses). Families: combat/* (sword_swing, bow_shoot, shield_block, axe_chop) · magic/* (fire, ice, lightning, heal_divine, dark_necro, fire_impact, ice_impact, lightning_impact, force_impact, thunder_wave, psychic_pulse) · monsters/<creature> — one voice per creature (orc, troll, gnoll, kobold, zombie, ghoul, banshee, lich, vampire, mummy, minotaur, werewolf, bear, wolf_howl, dragon_roar, dragon_breath, elemental_fire/earth/air/water; beast_growl as fallback) · items/* (potion, coins, chest_open) · dungeon/* (door, chains, mechanism_trap, water_drip, torch_light) · impacts/* (punch, metal, crit_hit) · footsteps/* (stone, wood, snow, run_stone) · environment/* (tavern_quiet, tavern_rowdy, market_crowd, storm, rain, forest, night_crickets, cave, crypt, city_night, temple_hall, fire_crackle).",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                key: { type: "STRING" as any, description: "'family/key' — the closest match." }
            },
            required: ["key"]
        }
    },
    {
        name: "add_effect",
        description: "A temporary numeric buff or debuff on the player or any combatant; the engine applies it to their rolls and round-based effects tick down.",
        parameters: {
            type: "OBJECT" as any,
            properties: {
                name: { type: "STRING" as any },
                source: { type: "STRING" as any, description: "What grants it (a blessing, a potion, a stunt)." },
                duration: { type: "STRING" as any, description: "e.g. '1 hour', 'until next rest'" },
                stat: { type: "STRING" as any, description: "'AC=+1', 'attackBonus=-2', 'damageBonus=+2', 'STR=+2', 'speed=+10'" },
                target: { type: "STRING" as any, description: "Combatant id/name; omit for the player." },
                rounds: { type: "INTEGER" as any, description: "Rounds for a combatant effect (default 10)." }
            },
            required: ["name", "source", "duration", "stat"]
        }
    }
];
