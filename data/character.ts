import { CharacterSheet } from '../types';
import { BACKGROUNDS } from './backgrounds';
import { CLASS_DATA } from './classes';
import { FIGHTING_STYLES, getWeaponFromInventory, getDefaultLoadout, startingGoldFor } from './equipment';
import { RACE_DATA } from './races';

export const BASE_STAT = 8;
export const MAX_POINTS = 27;

// New shop model: a fresh hero starts with the free base package + default kit
// (no fixed full loadout) and SRD starting wealth, then buys gear in the
// 'Équipement' creation step.
const DEFAULT_LOADOUT = getDefaultLoadout('Fighter', 'Soldier');

export const DEFAULT_CHAR: CharacterSheet = {
    name: '',
    race: 'Human',
    class: 'Fighter',
    level: 1,
    xp: 0,
    background: 'Soldier',
    fightingStyle: 'Dueling',
    stats: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 },
    hp: { current: 9, max: 9 },
    tempHP: 0,
    ac: 16,
    gold: startingGoldFor('Fighter', 'Soldier'),
    inventory: DEFAULT_LOADOUT,
    backstory: '',
    proficiencies: [...CLASS_DATA['Fighter'].profs, ...BACKGROUNDS['Soldier'].profs, ...RACE_DATA['Human'].profs],
    expertise: [],
    features: [
        ...CLASS_DATA['Fighter'].features.filter(feature => feature.level <= 1).map(feature => ({ name: feature.name, description: feature.desc })),
        { name: 'Fighting Style (Dueling)', description: FIGHTING_STYLES[2].desc },
        BACKGROUNDS['Soldier'].feature,
        ...RACE_DATA['Human'].features.map(feature => ({ name: 'Human Trait', description: feature }))
    ],
    weapon: getWeaponFromInventory(DEFAULT_LOADOUT),
    activeEffects: [],
    cantrips: [],
    knownSpells: [],
    preparedSpells: [],
    spellcastingFocus: '',
    deity: 'Aucune',
    customBackground: '',
    storyProfile: {
        appearance: '',
        personality: '',
        desire: '',
        fear: '',
        wound: '',
        bond: '',
        ideal: '',
        flaw: '',
        secret: '',
        cinematicStyle: 'dark fantasy cinematic',
        dmHooks: []
    }
};
