// DM Tag Parser
// Parses structured tags from DM responses to modify game state

import { getCreature, spawnCreature, CreatureStats } from '../data/bestiary';

import { Combatant } from '../components/CombatTracker';

// Local type definition (was previously imported from combatEngine.ts)
interface CombatantStats {
    id: string;
    name: string;
    type: 'player' | 'enemy' | 'ally';
    hp: { current: number; max: number };
    ac: number;
    initiative: number;
    speed: number;
    stats: { STR: number; DEX: number };
    weapon: { name: string; attackBonus: number; damage: string; damageType: string; reach: number };
    position: string;
    isPlayer?: boolean;
}

// ========== TAG TYPES ==========

export type DMTagType =
    | 'SPAWN_ENEMY' | 'SPAWN_ALLY' | 'SPAWN_MOUNT' | 'DESTROY'
    | 'BUFF' | 'DEBUFF' | 'HEAL' | 'DAMAGE'
    | 'MOVE' | 'ATTACK' | 'ENEMY_ATTACK'
    | 'XP_GRANT' | 'COMBAT_END'
    | 'ITEM_ADD' | 'ITEM_REMOVE'
    | 'NPC_ADD' | 'LOCATION_ADD' | 'STORY_MOMENT'
    | 'UPDATE_CHAR' | 'QUEST_ADD' | 'QUEST_COMPLETE';

export interface ParsedTag {
    type: DMTagType;
    params: Record<string, string>;
    raw: string;
}

export interface SpawnResult {
    creature: CombatantStats;
    position: string;
}


export interface BuffDebuffResult {
    targetId: string;
    stat: string;
    modifier: number;
    duration: number;
    name?: string;
}

export interface HealDamageResult {
    targetId: string;
    amount: number;
    damageType?: string;
}

// ========== PARSER ==========

// Parse all tags from DM text
export function parseAllTags(text: string): ParsedTag[] {
    const tags: ParsedTag[] = [];

    // Match [TAG_TYPE: params] pattern
    const tagRegex = /\[([A-Z_]+):\s*([^\]]+)\]/g;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
        const type = match[1] as DMTagType;
        const paramsStr = match[2];
        const params = parseParams(paramsStr);

        tags.push({ type, params, raw: match[0] });
    }

    return tags;
}

// Parse pipe-separated params: "Orc | POS=E5 | COUNT=2"
function parseParams(str: string): Record<string, string> {
    const params: Record<string, string> = {};
    const parts = str.split('|').map(p => p.trim());

    // First part is usually the main value (creature name, terrain type, etc.)
    if (parts.length > 0 && !parts[0].includes('=')) {
        params['_main'] = parts[0];
    }

    // Parse key=value pairs
    for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx > 0) {
            const key = part.substring(0, eqIdx).trim().toUpperCase();
            const value = part.substring(eqIdx + 1).trim();
            params[key] = value;
        }
    }

    return params;
}

// ========== SPAWN HANDLERS ==========

let spawnCounter = 0;

export function handleSpawnEnemy(tag: ParsedTag): SpawnResult | null {
    const creatureName = tag.params['_main'];
    const position = tag.params['POS'] || 'E5';
    const count = parseInt(tag.params['COUNT'] || '1');

    if (!creatureName) return null;

    const template = getCreature(creatureName);
    if (!template) {
        console.warn(`Unknown creature: ${creatureName}`);
        return null;
    }

    spawnCounter++;
    const id = `${template.id}_${spawnCounter}`;

    const creature: CombatantStats = {
        id,
        name: template.name,
        type: 'enemy',
        hp: { current: template.hp.base, max: template.hp.base },
        ac: template.ac,
        initiative: Math.floor(Math.random() * 20) + 1 + Math.floor((template.stats.DEX - 10) / 2),
        speed: Math.floor(template.speed / 5), // Convert feet to squares
        stats: { STR: template.stats.STR, DEX: template.stats.DEX },
        weapon: template.attacks[0] ? {
            name: template.attacks[0].name,
            attackBonus: template.attacks[0].attackBonus,
            damage: template.attacks[0].damage,
            damageType: template.attacks[0].damageType,
            reach: template.attacks[0].reach
        } : {
            name: 'Unarmed',
            attackBonus: 2,
            damage: '1d4',
            damageType: 'bludgeoning',
            reach: 5
        },
        position,
        isPlayer: false
    };

    return { creature, position };
}

export function handleSpawnAlly(tag: ParsedTag): SpawnResult | null {
    const creatureName = tag.params['_main'];
    const position = tag.params['POS'] || 'C3';

    if (!creatureName) return null;

    const template = getCreature(creatureName);
    if (!template) {
        console.warn(`Unknown creature: ${creatureName}`);
        return null;
    }

    spawnCounter++;
    const id = `${template.id}_${spawnCounter}`;

    const creature: CombatantStats = {
        id,
        name: template.name,
        type: 'ally',
        hp: { current: template.hp.base, max: template.hp.base },
        ac: template.ac,
        initiative: Math.floor(Math.random() * 20) + 1 + Math.floor((template.stats.DEX - 10) / 2),
        speed: Math.floor(template.speed / 5),
        stats: { STR: template.stats.STR, DEX: template.stats.DEX },
        weapon: template.attacks[0] ? {
            name: template.attacks[0].name,
            attackBonus: template.attacks[0].attackBonus,
            damage: template.attacks[0].damage,
            damageType: template.attacks[0].damageType,
            reach: template.attacks[0].reach
        } : {
            name: 'Unarmed',
            attackBonus: 2,
            damage: '1d4',
            damageType: 'bludgeoning',
            reach: 5
        },
        position,
        isPlayer: false
    };

    return { creature, position };
}

export function handleSpawnMount(tag: ParsedTag): SpawnResult | null {
    const mountName = tag.params['_main'] || 'Horse';
    const position = tag.params['POS'] || 'C1';
    const riderId = tag.params['RIDER'];

    const template = getCreature(mountName);
    if (!template) {
        console.warn(`Unknown mount: ${mountName}`);
        return null;
    }

    spawnCounter++;
    const id = `mount_${spawnCounter}`;

    const mount: CombatantStats = {
        id,
        name: template.name,
        type: 'ally',
        hp: { current: template.hp.base, max: template.hp.base },
        ac: template.ac,
        initiative: 0, // Mounts act on rider's turn
        speed: Math.floor(template.speed / 5),
        stats: { STR: template.stats.STR, DEX: template.stats.DEX },
        weapon: template.attacks[0] ? {
            name: template.attacks[0].name,
            attackBonus: template.attacks[0].attackBonus,
            damage: template.attacks[0].damage,
            damageType: template.attacks[0].damageType,
            reach: template.attacks[0].reach
        } : {
            name: 'Hooves',
            attackBonus: 4,
            damage: '2d4+3',
            damageType: 'bludgeoning',
            reach: 5
        },
        position,
        isPlayer: false
    };

    return { creature: mount, position };
}



// ========== BUFF/DEBUFF/HEAL/DAMAGE ==========

function parsePositions(posStr: string): string[] {
    return posStr.split(',').map(p => p.trim().toUpperCase());
}

export function handleBuff(tag: ParsedTag): BuffDebuffResult | null {
    const targetId = tag.params['_main']?.toLowerCase();
    if (!targetId) return null;

    // Parse modifier like "+2 AC" or "+1 ATK"
    const parts = Object.keys(tag.params).filter(k => k !== '_main');
    let stat = 'AC';
    let modifier = 0;
    let duration = 3;
    let name = '';

    for (const key of parts) {
        const val = tag.params[key];
        if (key.match(/^[+-]\d+$/)) {
            // It's a modifier like "+2"
            modifier = parseInt(key);
            stat = val;
        } else if (key === 'DURATION') {
            duration = parseInt(val);
        } else if (!key.includes('=')) {
            // Could be description
            name = val;
        }
    }

    return { targetId, stat, modifier, duration, name };
}

export function handleHeal(tag: ParsedTag): HealDamageResult | null {
    const targetId = tag.params['_main']?.toLowerCase();
    const amount = parseInt(tag.params['HP'] || tag.params['AMOUNT'] || '0');

    if (!targetId || amount <= 0) return null;

    return { targetId, amount };
}

export function handleDamage(tag: ParsedTag): HealDamageResult | null {
    const targetId = tag.params['_main']?.toLowerCase();
    const amountStr = tag.params['DMG'] || tag.params['AMOUNT'] || '0';
    const damageType = tag.params['TYPE'] || 'bludgeoning';

    // Parse "5 fire" or just "5"
    const match = amountStr.match(/(\d+)\s*(\w+)?/);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const type = match[2] || damageType;

    if (!targetId || amount <= 0) return null;

    return { targetId, amount, damageType: type };
}

// ========== DESTROY ==========

export function handleDestroy(tag: ParsedTag): string[] {
    const positions = tag.params['_main'] ? parsePositions(tag.params['_main']) : [];
    return positions;
}

// ========== MAIN PROCESSOR ==========

export interface ProcessedTags {
    spawns: SpawnResult[];
    buffs: BuffDebuffResult[];
    heals: HealDamageResult[];
    damages: HealDamageResult[];
    destroys: string[];
    moves: { id: string, from: string, to: string }[];
    attacks: { id: string, target: string, result: 'HIT' | 'MISS', dmg: number }[];
    xp: { amount: number, reason: string }[];
    items: { type: 'ADD' | 'REMOVE', name: string, qty: number, itemType?: string }[];
    journal: { type: 'NPC' | 'LOCATION' | 'STORY', name: string, desc: string, loc?: string }[];
}

export function processDMTags(text: string): ProcessedTags {
    const tags = parseAllTags(text);
    const result: ProcessedTags = {
        spawns: [],
        buffs: [],
        heals: [],
        damages: [],
        destroys: [],
        moves: [],
        attacks: [],
        xp: [],
        items: [],
        journal: []
    };
    for (const tag of tags) {
        switch (tag.type) {
            case 'SPAWN_ENEMY': {
                const spawn = handleSpawnEnemy(tag);
                if (spawn) result.spawns.push(spawn);
                break;
            }
            case 'SPAWN_ALLY': {
                const spawn = handleSpawnAlly(tag);
                if (spawn) result.spawns.push(spawn);
                break;
            }
            case 'SPAWN_MOUNT': {
                const spawn = handleSpawnMount(tag);
                if (spawn) result.spawns.push(spawn);
                break;
            }
            case 'BUFF':
            case 'DEBUFF': {
                const buff = handleBuff(tag);
                if (buff) {
                    if (tag.type === 'DEBUFF') buff.modifier = -Math.abs(buff.modifier);
                    result.buffs.push(buff);
                }
                break;
            }
            case 'HEAL': {
                const heal = handleHeal(tag);
                if (heal) result.heals.push(heal);
                break;
            }
            case 'DAMAGE': {
                const damage = handleDamage(tag);
                if (damage) result.damages.push(damage);
                break;
            }
            case 'DESTROY': {
                result.destroys.push(...handleDestroy(tag));
                break;
            }
            case 'MOVE': {
                const id = tag.params['_main'] || tag.params['ID'];
                const from = tag.params['FROM'];
                const to = tag.params['TO'];
                if (id && to) result.moves.push({ id, from: from || '', to });
                break;
            }
            case 'ENEMY_ATTACK': {
                const id = tag.params['_main'] || tag.params['ID'];
                const target = tag.params['TARGET'];
                const resultStr = tag.params['RESULT']?.toUpperCase();
                const dmg = parseInt(tag.params['DMG'] || '0');
                if (id && target) {
                    result.attacks.push({
                        id,
                        target,
                        result: resultStr === 'HIT' ? 'HIT' : 'MISS',
                        dmg
                    });
                }
                break;
            }
            case 'XP_GRANT': {
                const amount = parseInt(tag.params['_main'] || tag.params['AMOUNT'] || '0');
                const reason = tag.params['REASON'] || 'Action reward';
                if (amount > 0) result.xp.push({ amount, reason });
                break;
            }
            case 'COMBAT_END': {
                const amount = parseInt(tag.params['XP'] || '0');
                if (amount > 0) result.xp.push({ amount, reason: 'Combat Victory' });
                break;
            }
            case 'ITEM_ADD':
            case 'ITEM_REMOVE': {
                const name = tag.params['_main'];
                const qty = parseInt(tag.params['QTY'] || tag.params['COUNT'] || '1');
                const itemType = tag.params['TYPE'];
                if (name) result.items.push({ type: tag.type === 'ITEM_ADD' ? 'ADD' : 'REMOVE', name, qty, itemType });
                break;
            }
            case 'NPC_ADD': {
                const name = tag.params['_main'];
                const desc = tag.params['DESC'] || '';
                const loc = tag.params['LOC'] || '';
                if (name) result.journal.push({ type: 'NPC', name, desc, loc });
                break;
            }
            case 'LOCATION_ADD': {
                const name = tag.params['_main'];
                const desc = tag.params['DESC'] || '';
                if (name) result.journal.push({ type: 'LOCATION', name, desc });
                break;
            }
            case 'STORY_MOMENT': {
                const name = tag.params['_main'];
                const desc = tag.params['DESC'] || '';
                if (name) result.journal.push({ type: 'STORY', name, desc });
                break;
            }
        }
    }

    return result;
}

// ========== TEXT CLEANUP ==========

// Remove all tags from text for display
export function stripTags(text: string): string {
    return text.replace(/\[[A-Z_]+(?::[^\]]*)?\]/g, '').trim();
}
