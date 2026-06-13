// XP System for D&D 5e
// Auto-calculates XP based on enemy type

// Enemy XP by type (based on typical CR)
export const ENEMY_XP: Record<string, number> = {
    // CR 0 (10 XP)
    'Commoner': 10,
    'Rat': 10,

    // CR 1/8 (25 XP)
    'Bandit': 25,
    'Guard': 25,
    'Kobold': 25,
    'Giant Rat': 25,

    // CR 1/4 (50 XP)
    'Goblin': 50,
    'Skeleton': 50,
    'Zombie': 50,
    'Wolf': 50,
    'Acolyte': 50,

    // CR 1/2 (100 XP)
    'Orc': 100,
    'Hobgoblin': 100,
    'Thug': 100,
    'Scout': 100,
    'Shadow': 100,
    'Worg': 100,

    // CR 1 (200 XP)
    'Bugbear': 200,
    'Ghoul': 200,
    'Giant Spider': 200,
    'Specter': 200,
    'Spy': 200,

    // CR 2 (450 XP)
    'Ogre': 450,
    'Ghast': 450,
    'Werewolf': 450,
    'Gargoyle': 450,
    'Priest': 450,

    // CR 3 (700 XP)
    'Knight': 700,
    'Veteran': 700,
    'Mummy': 700,
    'Wererat': 700,
    'Owlbear': 700,

    // CR 4 (1100 XP)
    'Bandit Captain': 1100,
    'Ghost': 1100,
    'Flameskull': 1100,

    // CR 5 (1800 XP)
    'Troll': 1800,
    'Wraith': 1800,
    'Vampire Spawn': 1800,

    // CR 6+ (2300+ XP)
    'Cyclops': 2300,
    'Wyvern': 2300,
    'Young Dragon': 2900,
    'Mind Flayer': 2900,

    // Bosses (5000+ XP)
    'Vampire': 5000,
    'Adult Dragon': 10000,
    'Ancient Dragon': 25000,

    // Default for unknown enemies
    'default': 50
};

// Get XP for an enemy by name (fuzzy match)
export function getEnemyXP(enemyName: string): number {
    // Try exact match first
    if (ENEMY_XP[enemyName]) {
        return ENEMY_XP[enemyName];
    }

    // Try partial match
    const lowerName = enemyName.toLowerCase();
    for (const [key, xp] of Object.entries(ENEMY_XP)) {
        if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
            return xp;
        }
    }

    // Default XP if no match
    return ENEMY_XP['default'];
}

// Calculate total XP for multiple enemies
export function calculateCombatXP(enemies: string[]): number {
    return enemies.reduce((total, enemy) => total + getEnemyXP(enemy), 0);
}
