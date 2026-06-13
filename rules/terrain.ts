import { rollDice, rollD20, getModifier } from '../services/utils';

export interface TerrainEffectResult {
    appliedEffect: boolean;
    damage?: number;
    damageType?: string;
    saveRequired?: boolean;
    saveType?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    saveDC?: number;
    saveSuccess?: boolean;
    condition?: string;
    description: string;
}

/**
 * Apply terrain effect when a combatant enters or starts turn on terrain
 * @param terrainType - The terrain type (LAVA, ICE, etc.)
 * @param dexScore - Combatant's DEX score for saves
 * @param conScore - Combatant's CON score for saves
 * @param strScore - Combatant's STR score for saves
 */
export function applyTerrainEffect(
    terrainType: string,
    dexScore: number = 10,
    conScore: number = 10,
    strScore: number = dexScore
): TerrainEffectResult {
    const result: TerrainEffectResult = {
        appliedEffect: false,
        description: ''
    };

    switch (terrainType.toUpperCase()) {
        case 'LAVA':
            // 2d6 fire damage, no save
            const lavaDmg = rollDice('2d6');
            result.appliedEffect = true;
            result.damage = lavaDmg.total;
            result.damageType = 'fire';
            result.description = `🔥 Burns in lava for ${lavaDmg.total} fire damage!`;
            break;

        case 'ICE':
            // DEX save DC 12 or fall prone
            const dexMod = getModifier(dexScore);
            const iceRoll = rollD20();
            const iceTotal = iceRoll + dexMod;
            result.appliedEffect = true;
            result.saveRequired = true;
            result.saveType = 'DEX';
            result.saveDC = 12;
            result.saveSuccess = iceTotal >= 12;
            if (!result.saveSuccess) {
                result.condition = 'prone';
                result.description = `❄️ Slips on ice (DEX ${iceTotal} vs DC 12) and falls prone!`;
            } else {
                result.description = `❄️ Keeps balance on ice (DEX ${iceTotal} vs DC 12)`;
            }
            break;

        case 'PIT':
            // 1d6 bludgeoning, DEX save DC 10 to avoid
            const pitDexMod = getModifier(dexScore);
            const pitRoll = rollD20();
            const pitTotal = pitRoll + pitDexMod;
            result.appliedEffect = true;
            result.saveRequired = true;
            result.saveType = 'DEX';
            result.saveDC = 10;
            result.saveSuccess = pitTotal >= 10;
            if (!result.saveSuccess) {
                const pitDmg = rollDice('1d6');
                result.damage = pitDmg.total;
                result.damageType = 'bludgeoning';
                result.description = `🕳️ Falls into pit (DEX ${pitTotal} vs DC 10) for ${pitDmg.total} damage!`;
            } else {
                result.description = `🕳️ Catches edge of pit (DEX ${pitTotal} vs DC 10)`;
            }
            break;

        case 'POISON_CLOUD':
        case 'GAS':
            // 2d6 poison, CON save DC 14 for half
            const conMod = getModifier(conScore);
            const poisonRoll = rollD20();
            const poisonTotal = poisonRoll + conMod;
            const poisonDmg = rollDice('2d6');
            result.appliedEffect = true;
            result.saveRequired = true;
            result.saveType = 'CON';
            result.saveDC = 14;
            result.saveSuccess = poisonTotal >= 14;
            result.damage = result.saveSuccess ? Math.floor(poisonDmg.total / 2) : poisonDmg.total;
            result.damageType = 'poison';
            result.description = result.saveSuccess
                ? `☠️ Breathes poison (CON ${poisonTotal} vs DC 14) - ${result.damage} damage (half)`
                : `☠️ Chokes on poison (CON ${poisonTotal} vs DC 14) - ${result.damage} damage!`;
            break;

        case 'FIRE':
            // 1d6 fire damage
            const fireDmg = rollDice('1d6');
            result.appliedEffect = true;
            result.damage = fireDmg.total;
            result.damageType = 'fire';
            result.description = `🔥 Burned by fire for ${fireDmg.total} fire damage!`;
            break;

        case 'WEB':
            // STR save DC 12 or restrained
            const strMod = getModifier(strScore);
            const webRoll = rollD20();
            const webTotal = webRoll + strMod;
            result.appliedEffect = true;
            result.saveRequired = true;
            result.saveType = 'STR';
            result.saveDC = 12;
            result.saveSuccess = webTotal >= 12;
            if (!result.saveSuccess) {
                result.condition = 'restrained';
                result.description = `🕸️ Caught in web (STR ${webTotal} vs DC 12) - restrained!`;
            } else {
                result.description = `🕸️ Breaks free from web (STR ${webTotal} vs DC 12)`;
            }
            break;

        default:
            // No effect for normal/difficult/water terrain
            result.description = '';
            break;
    }

    return result;
}
