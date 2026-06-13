export type Condition =
    | 'blinded' | 'charmed' | 'deafened' | 'frightened'
    | 'grappled' | 'incapacitated' | 'invisible' | 'paralyzed'
    | 'petrified' | 'poisoned' | 'prone' | 'restrained'
    | 'stunned' | 'unconscious' | 'exhaustion';

export interface ActiveCondition {
    condition: Condition;
    duration: number;  // -1 = permanent, 0+ = turns remaining
    source?: string;
}

export function getConditionEffects(condition: Condition): {
    attackDisadvantage?: boolean;
    defenseAdvantage?: boolean;
    cannotMove?: boolean;
    cannotAct?: boolean;
    autoFailDexSaves?: boolean;
    autoFailStrSaves?: boolean;
} {
    switch (condition) {
        case 'blinded':
            return { attackDisadvantage: true, defenseAdvantage: true };
        case 'frightened':
            return { attackDisadvantage: true };
        case 'grappled':
            return { cannotMove: true };
        case 'incapacitated':
            return { cannotAct: true };
        case 'paralyzed':
            return { cannotMove: true, cannotAct: true, autoFailDexSaves: true, autoFailStrSaves: true, defenseAdvantage: true };
        case 'prone':
            return { attackDisadvantage: true };
        case 'restrained':
            return { cannotMove: true, attackDisadvantage: true, defenseAdvantage: true };
        case 'stunned':
            return { cannotMove: true, cannotAct: true, autoFailDexSaves: true, autoFailStrSaves: true };
        case 'unconscious':
            return { cannotMove: true, cannotAct: true, autoFailDexSaves: true, autoFailStrSaves: true, defenseAdvantage: true };
        default:
            return {};
    }
}
