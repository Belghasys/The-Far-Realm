// ═══════════════════════════════════════════════════════════════════════════
// KITS DE LANCEURS ENNEMIS (2026-08-13) — demande joueur : « les mages ennemis
// et clercs doivent utiliser la magie ». Avant, un Mage ennemi tapait au bâton :
// le tour PNJ ne connaissait que les attaques d'arme parsées.
//
// Chaque kit donne au moteur 1-3 sorts SIGNATURES structurés (chiffres SRD 5.1),
// choisis par runNPCTurn : zone si ≥2 cibles côté héros, sinon le sort limité
// le plus fort, sinon le tour de magie à volonté — sinon l'arme, comme avant.
// Les sorts à sauvegarde roulent la sauvegarde du HÉROS avec ses VRAIS bonus
// (maîtrises + dons + passifs de classe, Évasion comprise) et affichent tout
// dans le journal des jets ; les dégâts passent par les canaux qui appliquent
// les RÉSISTANCES des deux côtés.
// ═══════════════════════════════════════════════════════════════════════════
import type { DamageType } from './bestiary';
import { getCreature } from './bestiary';

export interface MonsterSpell {
    name: string;
    /** attack = jet d'attaque de sort (réutilise le chemin d'attaque complet,
     *  réaction Bouclier incluse) ; save = sauvegarde mono-cible ;
     *  aoe_save = sauvegarde pour TOUT le camp du héros (joueur + alliés). */
    kind: 'attack' | 'save' | 'aoe_save';
    /** Dés de dégâts ('8d6', '7d8+30'). Vide si conditionOnly. */
    formula?: string;
    damageType?: DamageType;
    /** Bonus d'attaque de sort (kind 'attack') — défaut : kit.attackBonus. */
    attackBonus?: number;
    saveAbility?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    /** DD spécifique — défaut : kit.dc. */
    dc?: number;
    /** Réussite = moitié des dégâts (défaut true pour les sorts à dégâts). */
    halfOnSave?: boolean;
    /** Condition SRD appliquée sur un ÉCHEC de sauvegarde. */
    condition?: string;
    /** Le sort n'inflige pas de dégâts — seulement la condition (Hold Person). */
    conditionOnly?: boolean;
    /** Nombre d'utilisations par combat. Absent = à volonté. */
    uses?: number;
    /** Concentration : lié au lanceur (concentratingOn) — le blesser peut
     *  briser le sort (CON save DD max(10, dégâts/2), moteur existant). */
    concentration?: boolean;
}

export interface CasterKit {
    /** DD de sauvegarde des sorts du monstre (SRD). */
    dc: number;
    /** Bonus d'attaque de sort (SRD). */
    attackBonus: number;
    spells: MonsterSpell[];
}

/** Kits par id de créature du bestiaire (chiffres des stat blocks SRD 5.1). */
export const CASTER_KITS: Record<string, CasterKit> = {
    acolyte: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '1d8', damageType: 'radiant', halfOnSave: false },
        ],
    },
    priest: {
        dc: 13, attackBonus: 5,
        spells: [
            { name: 'Spirit Guardians', kind: 'aoe_save', saveAbility: 'WIS', formula: '3d8', damageType: 'radiant', uses: 1, concentration: true },
            { name: 'Guiding Bolt', kind: 'attack', formula: '4d6', damageType: 'radiant', uses: 2 },
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '2d8', damageType: 'radiant', halfOnSave: false },
        ],
    },
    cult_fanatic: {
        // DM9 — SRD : WIS +1 + prof +2 = +3 (seul kit qui violait DD = 8 + bonus).
        dc: 11, attackBonus: 3,
        spells: [
            { name: 'Hold Person', kind: 'save', saveAbility: 'WIS', condition: 'paralyzed', conditionOnly: true, uses: 2, concentration: true },
            { name: 'Inflict Wounds', kind: 'attack', formula: '3d10', damageType: 'necrotic', uses: 2 },
            { name: 'Sacred Flame', kind: 'save', saveAbility: 'DEX', formula: '1d8', damageType: 'radiant', halfOnSave: false },
        ],
    },
    mage: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Fireball', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'fire', uses: 2 },
            { name: 'Cone of Cold', kind: 'aoe_save', saveAbility: 'CON', formula: '8d8', damageType: 'cold', uses: 1 },
            { name: 'Fire Bolt', kind: 'attack', formula: '2d10', damageType: 'fire' },
        ],
    },
    archmage: {
        dc: 17, attackBonus: 9,
        spells: [
            { name: 'Cone of Cold', kind: 'aoe_save', saveAbility: 'CON', formula: '8d8', damageType: 'cold', uses: 2 },
            { name: 'Lightning Bolt', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'lightning', uses: 3 },
            { name: 'Fire Bolt', kind: 'attack', formula: '4d10', damageType: 'fire' },
        ],
    },
    lich: {
        dc: 20, attackBonus: 12,
        spells: [
            { name: 'Disintegrate', kind: 'save', saveAbility: 'DEX', formula: '10d6+40', damageType: 'force', halfOnSave: false, uses: 1 },
            { name: 'Finger of Death', kind: 'save', saveAbility: 'CON', formula: '7d8+30', damageType: 'necrotic', uses: 1 },
            { name: 'Cloudkill', kind: 'aoe_save', saveAbility: 'CON', formula: '5d8', damageType: 'poison', uses: 1, concentration: true },
            { name: 'Ray of Frost', kind: 'attack', formula: '4d8', damageType: 'cold' },
        ],
    },
    druid: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Thunderwave', kind: 'aoe_save', saveAbility: 'CON', formula: '2d8', damageType: 'thunder', uses: 2 },
            { name: 'Entangle', kind: 'save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 1, concentration: true },
            { name: 'Produce Flame', kind: 'attack', formula: '1d8', damageType: 'fire' },
        ],
    },
    vampire: {
        dc: 17, attackBonus: 9,
        spells: [
            { name: 'Charm', kind: 'save', saveAbility: 'WIS', condition: 'charmed', conditionOnly: true },
        ],
    },
    drow_mage: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Lightning Bolt', kind: 'aoe_save', saveAbility: 'DEX', formula: '8d6', damageType: 'lightning', uses: 2 },
            { name: 'Ray of Frost', kind: 'attack', formula: '2d8', damageType: 'cold' },
        ],
    },
    lizardfolk_shaman: {
        dc: 12, attackBonus: 4,
        spells: [
            { name: 'Entangle', kind: 'save', saveAbility: 'STR', condition: 'restrained', conditionOnly: true, uses: 2, concentration: true },
            { name: 'Thorn Whip', kind: 'attack', formula: '2d6', damageType: 'piercing' },
        ],
    },
    kuo_toa_archpriest: {
        dc: 14, attackBonus: 6,
        spells: [
            { name: 'Spirit Guardians', kind: 'aoe_save', saveAbility: 'WIS', formula: '3d8', damageType: 'lightning', uses: 1, concentration: true },
            { name: 'Shocking Grasp', kind: 'attack', formula: '2d8', damageType: 'lightning' },
        ],
    },
    mummy_lord: {
        dc: 17, attackBonus: 9,
        spells: [
            { name: 'Harm', kind: 'save', saveAbility: 'CON', formula: '14d6', damageType: 'necrotic', uses: 1 },
            { name: 'Insect Plague', kind: 'aoe_save', saveAbility: 'CON', formula: '4d10', damageType: 'piercing', uses: 1, concentration: true },
        ],
    },
    orc_eye_of_gruumsh: {
        dc: 11, attackBonus: 3,
        spells: [
            { name: 'Spiritual Weapon', kind: 'attack', attackBonus: 5, formula: '1d8+3', damageType: 'force' },
        ],
    },
};

const foldKitName = (s: string) =>
    String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Kit du monstre par NOM de combattant (via le bestiaire — « Mage A »,
 *  « Grand Prêtre kuo-toa »…). Null si la créature n'est pas un lanceur. */
export function getCasterKit(combatantName: string): CasterKit | null {
    const creature = getCreature(combatantName);
    if (creature && CASTER_KITS[creature.id]) return CASTER_KITS[creature.id];
    // Dernier recours : correspondance directe sur l'id plié.
    const folded = foldKitName(combatantName).replace(/[^a-z0-9]+/g, '_');
    return CASTER_KITS[folded] || null;
}
